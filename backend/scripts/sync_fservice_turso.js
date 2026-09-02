require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ TURSO_DATABASE_URL não configurada.');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function syncFserviceTurso() {
  console.log('🔄 Sincronizando dados e certificado A1 da FSERVICE no Turso DB...');

  const certPath = 'C:\\Users\\ACER\\Downloads\\CERTIFICADO FSERV  LTDA E_33590616000119-2026.pfx';
  const certBase64 = fs.readFileSync(certPath).toString('base64');
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 1. Garantir Empresa FSERVICE
  const empRes = await client.execute({
    sql: 'SELECT id FROM empresas WHERE cnpj = ? OR codigo_licenca = ?',
    args: ['33590616000119', '3']
  });

  let empresaId;
  if (empRes.rows.length > 0) {
    empresaId = empRes.rows[0].id;
    await client.execute({
      sql: `UPDATE empresas SET
        razao_social = 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA',
        nome_fantasia = 'FSERV SERVICOS',
        cnpj = '33590616000119',
        telefone = '(44) 3255-1000',
        email = 'fserv@fserv.com',
        cidade = 'Sabáudia',
        uf = 'PR',
        codigo_licenca = '3'
      WHERE id = ?`,
      args: [empresaId]
    });
    console.log(`✅ Empresa FSERVICE atualizada no Turso (ID: ${empresaId})`);
  } else {
    const ins = await client.execute({
      sql: `INSERT INTO empresas (
        codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento,
        razao_social, nome_fantasia, cnpj, telefone, email, cidade, uf, ativo
      ) VALUES ('3', 10, 350.00, 10, 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA', 'FSERV SERVICOS', '33590616000119', '(44) 3255-1000', 'fserv@fserv.com', 'Sabáudia', 'PR', 1)`,
      args: []
    });
    empresaId = Number(ins.lastInsertRowid);
    console.log(`✅ Empresa FSERVICE criada no Turso (ID: ${empresaId})`);
  }

  // 2. Usuário fserv@fserv.com
  const userRes = await client.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: ['fserv@fserv.com']
  });

  if (userRes.rows.length > 0) {
    await client.execute({
      sql: 'UPDATE users SET name = ?, password_hash = ?, role = ?, empresa_id = ? WHERE email = ?',
      args: ['Fservice Admin', passwordHash, 'admin', empresaId, 'fserv@fserv.com']
    });
    console.log('✅ Usuário fserv@fserv.com atualizado no Turso');
  } else {
    await client.execute({
      sql: 'INSERT INTO users (empresa_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      args: [empresaId, 'Fservice Admin', 'fserv@fserv.com', passwordHash, 'admin']
    });
    console.log('✅ Usuário fserv@fserv.com criado no Turso');
  }

  // 3. Configuração Fiscal e Certificado A1
  const fiscalRes = await client.execute({
    sql: 'SELECT id FROM empresa_fiscal_config WHERE empresa_id = ?',
    args: [empresaId]
  });

  if (fiscalRes.rows.length > 0) {
    await client.execute({
      sql: `UPDATE empresa_fiscal_config SET
        ambiente = 'homologacao',
        serie_cte = 1,
        ultimo_numero_cte = 2,
        rntrc_padrao = '53148055',
        aliquota_icms_padrao = 12.0,
        cst_icms_padrao = '00',
        cfop_padrao_estadual = '5353',
        cfop_padrao_interestadual = '6353',
        natureza_operacao = 'PRESTACAO DE SERVICO DE TRANSPORTE',
        certificado_a1_base64 = ?,
        certificado_senha = '09012611',
        certificado_validade = '2027-01-09T16:56:04.000Z',
        certificado_titular = 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA E:33590616000119',
        certificado_cnpj = '33590616000119',
        updated_at = CURRENT_TIMESTAMP
      WHERE empresa_id = ?`,
      args: [certBase64, empresaId]
    });
    console.log('✅ Configuração Fiscal e Certificado A1 atualizados no Turso');
  } else {
    await client.execute({
      sql: `INSERT INTO empresa_fiscal_config (
        empresa_id, ambiente, serie_cte, ultimo_numero_cte, rntrc_padrao,
        aliquota_icms_padrao, cst_icms_padrao, cfop_padrao_estadual, cfop_padrao_interestadual,
        natureza_operacao, certificado_a1_base64, certificado_senha,
        certificado_validade, certificado_titular, certificado_cnpj
      ) VALUES (?, 'homologacao', 1, 2, '53148055', 12.0, '00', '5353', '6353', 'PRESTACAO DE SERVICO DE TRANSPORTE', ?, '09012611', '2027-01-09T16:56:04.000Z', 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA E:33590616000119', '33590616000119')`,
      args: [empresaId, certBase64]
    });
    console.log('✅ Configuração Fiscal e Certificado A1 inseridos no Turso');
  }

  console.log('🎉 Sincronização da FSERVICE com o Turso concluída com sucesso!');
}

syncFserviceTurso().catch(console.error);
