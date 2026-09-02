const db = require('../config/database');

let lastSyncTime = 0;
const SYNC_COOLDOWN_MS = 60000; // 60 segundos de cache para máxima performance

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://sisfrete-leo-r-b.aws-us-east-2.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc4NjMxMDcsImlkIjoiMDFhMDQ0ZjEtYzUwMS03OTFjLTgyMTYtNTYyYjA3OTNhNmNhIiwia2lkIjoid2pGSVBxSDJRcVZmX3E5Q2RUYlpiSWdDb3E5WWFUQUJYVm4xTXJwd1Z1USIsInJpZCI6IjY0NmEzYmYyLTJiNDYtNDk1My05MjZmLTMzMTJjYjNiNGE3NSJ9.xvZkVFq-61olLVmeqcaeVZA0t6V___B4nsCQPu45TmctOSpqGQGtUFO6VeUU-2KwTbOqrnK22H2ltKwNUZAVAA';

  try {
    const { createClient } = require('@libsql/client');
    return createClient({ url, authToken });
  } catch (err) {
    console.warn('Aviso: erro ao instanciar cliente Turso:', err.message);
    return null;
  }
}

async function syncFromCloud(force = false) {
  const now = Date.now();
  if (!force && (now - lastSyncTime < SYNC_COOLDOWN_MS)) {
    return;
  }
  lastSyncTime = now;

  const turso = getTursoClient();
  if (!turso) return;

  try {
    // Consulta tabelas em paralelo para evitar múltiplos roundtrips
    const [cloudEmpresas, cloudUsers, cloudFiscal] = await Promise.all([
      turso.execute('SELECT * FROM empresas').catch(() => ({ rows: [] })),
      turso.execute('SELECT * FROM users').catch(() => ({ rows: [] })),
      turso.execute('SELECT * FROM empresa_fiscal_config').catch(() => ({ rows: [] }))
    ]);

    // 1. Sincronizar Empresas
    if (cloudEmpresas?.rows) {
      for (const e of cloudEmpresas.rows) {
        const exist = db.prepare('SELECT id FROM empresas WHERE id = ?').get(e.id);
        if (exist) {
          db.prepare(`
            UPDATE empresas SET
              codigo_licenca = ?, limite_logins = ?, valor_mensalidade = ?, dia_vencimento = ?,
              tipo_licenca = ?, data_expiracao_teste = ?,
              modo_operacao = ?, percentual_comissao_padrao = ?,
              razao_social = ?, nome_fantasia = ?, cnpj = ?, telefone = ?, email = ?,
              chave_pix = ?, banco = ?, agencia = ?, conta = ?, cidade = ?, uf = ?, ativo = ?
            WHERE id = ?
          `).run(
            e.codigo_licenca, e.limite_logins, e.valor_mensalidade, e.dia_vencimento,
            e.tipo_licenca || 'paga', e.data_expiracao_teste || null,
            e.modo_operacao || 'padrao', e.percentual_comissao_padrao !== undefined ? Number(e.percentual_comissao_padrao) : 5.0,
            e.razao_social, e.nome_fantasia, e.cnpj, e.telefone, e.email,
            e.chave_pix, e.banco, e.agencia, e.conta, e.cidade, e.uf, e.ativo, e.id
          );
        } else {
          db.prepare(`
            INSERT INTO empresas (
              id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
              tipo_licenca, data_expiracao_teste,
              modo_operacao, percentual_comissao_padrao,
              razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, banco, agencia, conta, cidade, uf, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            e.id, e.codigo_licenca, e.limite_logins, e.valor_mensalidade, e.dia_vencimento, e.data_adesao,
            e.tipo_licenca || 'paga', e.data_expiracao_teste || null,
            e.modo_operacao || 'padrao', e.percentual_comissao_padrao !== undefined ? Number(e.percentual_comissao_padrao) : 5.0,
            e.razao_social, e.nome_fantasia, e.cnpj, e.telefone, e.email, e.chave_pix, e.banco, e.agencia, e.conta, e.cidade, e.uf, e.ativo
          );
        }
      }
    }

    // 2. Sincronizar Usuários (Users & Senhas)
    if (cloudUsers?.rows) {
      const cloudIds = new Set();
      for (const u of cloudUsers.rows) {
        cloudIds.add(u.id);
        const exist = db.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
        if (exist) {
          db.prepare(`
            UPDATE users SET
              empresa_id = ?, name = ?, email = ?, password_hash = ?, role = ?
            WHERE id = ?
          `).run(u.empresa_id, u.name, u.email, u.password_hash, u.role, u.id);
        } else {
          db.prepare(`
            INSERT INTO users (id, empresa_id, name, email, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(u.id, u.empresa_id, u.name, u.email, u.password_hash, u.role);
        }
      }

      // Remover usuários locais que foram excluídos da nuvem
      const localUsers = db.prepare('SELECT id FROM users').all();
      for (const lu of localUsers) {
        if (!cloudIds.has(lu.id)) {
          db.prepare('DELETE FROM users WHERE id = ?').run(lu.id);
        }
      }
    }

    // 3. Sincronizar Configuração Fiscal e Certificado A1
    try {
      if (cloudFiscal?.rows) {
        for (const f of cloudFiscal.rows) {
          const exist = db.prepare('SELECT id FROM empresa_fiscal_config WHERE empresa_id = ?').get(f.empresa_id);
          if (exist) {
            db.prepare(`
              UPDATE empresa_fiscal_config SET
                ambiente = ?, serie_cte = ?, ultimo_numero_cte = ?, rntrc_padrao = ?,
                aliquota_icms_padrao = ?, cst_icms_padrao = ?, cfop_padrao_estadual = ?, cfop_padrao_interestadual = ?,
                natureza_operacao = ?, certificado_a1_base64 = ?, certificado_senha = ?,
                certificado_validade = ?, certificado_titular = ?, certificado_cnpj = ?
              WHERE empresa_id = ?
            `).run(
              f.ambiente, f.serie_cte, f.ultimo_numero_cte, f.rntrc_padrao,
              f.aliquota_icms_padrao, f.cst_icms_padrao, f.cfop_padrao_estadual, f.cfop_padrao_interestadual,
              f.natureza_operacao, f.certificado_a1_base64, f.certificado_senha,
              f.certificado_validade, f.certificado_titular, f.certificado_cnpj,
              f.empresa_id
            );
          } else {
            db.prepare(`
              INSERT INTO empresa_fiscal_config (
                empresa_id, ambiente, serie_cte, ultimo_numero_cte, rntrc_padrao,
                aliquota_icms_padrao, cst_icms_padrao, cfop_padrao_estadual, cfop_padrao_interestadual,
                natureza_operacao, certificado_a1_base64, certificado_senha,
                certificado_validade, certificado_titular, certificado_cnpj
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              f.empresa_id, f.ambiente, f.serie_cte, f.ultimo_numero_cte, f.rntrc_padrao,
              f.aliquota_icms_padrao, f.cst_icms_padrao, f.cfop_padrao_estadual, f.cfop_padrao_interestadual,
              f.natureza_operacao, f.certificado_a1_base64, f.certificado_senha,
              f.certificado_validade, f.certificado_titular, f.certificado_cnpj
            );
          }
        }
      }
    } catch (fErr) {}

    lastSyncTime = Date.now();
  } catch (error) {
    console.warn('Aviso: falha na sincronização Turso -> SQLite:', error.message);
  }
}

module.exports = {
  syncFromCloud,
  getTursoClient,
};
