require('dotenv').config();
const { createClient } = require('@libsql/client');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ ERRO: TURSO_DATABASE_URL não configurada!');
  process.exit(1);
}

const turso = createClient({ url, authToken });
const localDb = new DatabaseSync(path.join(__dirname, '..', 'sisfrete.db'));

async function syncAllToTurso() {
  console.log('🚀 Iniciando Sincronização Completa de Dados Local ➔ Turso Cloud...');

  // 1. Sincronizar Empresas
  console.log('⏳ Sincronizando Empresas...');
  const empresas = localDb.prepare('SELECT * FROM empresas').all();
  for (const emp of empresas) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO empresas (
          id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
          modo_operacao, percentual_comissao_padrao, razao_social, nome_fantasia, cnpj,
          telefone, email, chave_pix, banco, agencia, conta, cidade, uf, percentual_adiantamento_padrao, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          emp.id, emp.codigo_licenca, emp.limite_logins || 5, emp.valor_mensalidade || 350, emp.dia_vencimento || 10, emp.data_adesao,
          emp.modo_operacao || 'padrao', emp.percentual_comissao_padrao || 5.0, emp.razao_social, emp.nome_fantasia, emp.cnpj,
          emp.telefone, emp.email, emp.chave_pix, emp.banco, emp.agencia, emp.conta, emp.cidade, emp.uf || 'PR', emp.percentual_adiantamento_padrao || 70, emp.ativo ?? 1
        ]
      });
    } catch (e) {
      console.warn(`Aviso empresa ${emp.id}:`, e.message);
    }
  }
  console.log(`✅ ${empresas.length} Empresas sincronizadas no Turso!`);

  // 2. Sincronizar Usuários
  console.log('⏳ Sincronizando Usuários...');
  const users = localDb.prepare('SELECT * FROM users').all();
  for (const u of users) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO users (
          id, empresa_id, name, email, password_hash, role
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [u.id, u.empresa_id, u.name, u.email, u.password_hash, u.role]
      });
    } catch (e) {
      console.warn(`Aviso usuário ${u.email}:`, e.message);
    }
  }
  console.log(`✅ ${users.length} Usuários sincronizados no Turso!`);

  // 3. Sincronizar Configurações Fiscais & Certificados A1
  console.log('⏳ Sincronizando Configurações Fiscais (Certificado A1)...');
  const fiscalConfigs = localDb.prepare('SELECT * FROM empresa_fiscal_config').all();
  for (const fc of fiscalConfigs) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO empresa_fiscal_config (
          id, empresa_id, ambiente, certificado_a1_base64, certificado_senha,
          certificado_validade, certificado_titular, certificado_cnpj, serie_cte,
          ultimo_numero_cte, rntrc_padrao, aliquota_icms_padrao, cst_icms_padrao,
          cfop_padrao_estadual, cfop_padrao_interestadual, natureza_operacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          fc.id, fc.empresa_id, fc.ambiente || 'homologacao', fc.certificado_a1_base64, fc.certificado_senha,
          fc.certificado_validade, fc.certificado_titular, fc.certificado_cnpj, fc.serie_cte || 1,
          fc.ultimo_numero_cte || 0, fc.rntrc_padrao || '53148055', fc.aliquota_icms_padrao || 12.0, fc.cst_icms_padrao || '00',
          fc.cfop_padrao_estadual || '5353', fc.cfop_padrao_interestadual || '6353', fc.natureza_operacao || 'PRESTACAO DE SERVICO DE TRANSPORTE'
        ]
      });
    } catch (e) {
      console.warn(`Aviso config fiscal empresa ${fc.empresa_id}:`, e.message);
    }
  }
  console.log(`✅ ${fiscalConfigs.length} Configurações Fiscais sincronizadas no Turso!`);

  // 4. Sincronizar Motoristas e Clientes
  console.log('⏳ Sincronizando Motoristas e Clientes...');
  const motoristas = localDb.prepare('SELECT * FROM motoristas').all();
  for (const m of motoristas) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO motoristas (
          id, empresa_id, nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes, numero_eixos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          m.id, m.empresa_id || 1, m.nome, m.cpf_cnpj, m.telefone, m.pix_chave, m.pix_tipo || 'CPF',
          m.placa_cavalo, m.placa_carreta, m.tipo_veiculo || 'Truck', m.cidade, m.uf, m.observacoes, m.numero_eixos || 6
        ]
      });
    } catch (e) {
      console.warn(`Aviso motorista ${m.id}:`, e.message);
    }
  }

  const clientes = localDb.prepare('SELECT * FROM clientes').all();
  for (const c of clientes) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO clientes (
          id, empresa_id, razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          c.id, c.empresa_id || 1, c.razao_social, c.nome_fantasia, c.cnpj_cpf, c.telefone, c.email, c.cidade, c.uf
        ]
      });
    } catch (e) {
      console.warn(`Aviso cliente ${c.id}:`, e.message);
    }
  }
  console.log(`✅ ${motoristas.length} Motoristas e ${clientes.length} Clientes sincronizados!`);

  // 5. Sincronizar Fretes / CT-es
  console.log('⏳ Sincronizando Fretes e CT-es...');
  const fretes = localDb.prepare('SELECT * FROM fretes').all();
  for (const f of fretes) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO fretes (
          id, empresa_id, tipo_operacao, numero_cte, serie_cte, chave_cte, data_emissao,
          cliente_id, cliente_nome, motorista_id, motorista_nome,
          origem_cidade, origem_uf, destino_cidade, destino_uf,
          placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
          valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
          percentual_adiantamento, valor_adiantamento, valor_pedagio, valor_combustivel,
          outros_descontos, valor_acrescimos, valor_saldo_motorista,
          status_frete, status_pagamento_motorista, status_recebimento_cliente,
          status_sefaz, chave_cte_44, protocolo_sefaz, data_emissao_sefaz, xml_protocolado, ambiente_emissao
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )`,
        args: [
          f.id, f.empresa_id || 1, f.tipo_operacao || 'padrao', f.numero_cte, f.serie_cte, f.chave_cte, f.data_emissao,
          f.cliente_id, f.cliente_nome, f.motorista_id, f.motorista_nome,
          f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
          f.placa_veiculo, f.placa_carreta, f.tipo_carga, f.peso_kg, f.valor_mercadoria,
          f.valor_frete_venda, f.valor_frete_compra, f.valor_comissao, f.percentual_margem,
          f.percentual_adiantamento, f.valor_adiantamento, f.valor_pedagio, f.valor_combustivel,
          f.outros_descontos, f.valor_acrescimos, f.valor_saldo_motorista,
          f.status_frete, f.status_pagamento_motorista, f.status_recebimento_cliente,
          f.status_sefaz, f.chave_cte_44, f.protocolo_sefaz, f.data_emissao_sefaz, f.xml_protocolado, f.ambiente_emissao
        ]
      });
    } catch (e) {
      console.warn(`Aviso frete ${f.id}:`, e.message);
    }
  }
  console.log(`✅ ${fretes.length} Fretes/CT-es sincronizados no Turso!`);

  // 6. Sincronizar Manifestos (MDF-e 3.00)
  console.log('⏳ Sincronizando MDF-es...');
  const mdfes = localDb.prepare('SELECT * FROM mdfes').all();
  for (const m of mdfes) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO mdfes (
          id, empresa_id, serie, numero_mdfe, chave_mdfe, protocolo_autorizacao,
          data_autorizacao, uf_origem, uf_destino, ufs_percurso, motorista_nome,
          motorista_cpf, placa_veiculo, placa_carreta, rntrc, seguradora_nome,
          seguradora_cnpj, numero_apolice, numero_averbacao, valor_total_carga,
          peso_total_kg, quantidade_ctes, status_mdfe, data_emissao, data_encerramento,
          municipio_encerramento, uf_encerramento, xml_mdfe
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
        )`,
        args: [
          m.id, m.empresa_id || 1, m.serie || 1, m.numero_mdfe, m.chave_mdfe, m.protocolo_autorizacao,
          m.data_autorizacao, m.uf_origem, m.uf_destino, m.ufs_percurso, m.motorista_nome,
          m.motorista_cpf, m.placa_veiculo, m.placa_carreta, m.rntrc, m.seguradora_nome,
          m.seguradora_cnpj, m.numero_apolice, m.numero_averbacao, m.valor_total_carga,
          m.peso_total_kg, m.quantidade_ctes, m.status_mdfe, m.data_emissao, m.data_encerramento,
          m.municipio_encerramento, m.uf_encerramento, m.xml_mdfe
        ]
      });
    } catch (e) {
      console.warn(`Aviso MDF-e ${m.id}:`, e.message);
    }
  }

  const mdfesVinculados = localDb.prepare('SELECT * FROM mdfe_ctes_vinculados').all();
  for (const v of mdfesVinculados) {
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO mdfe_ctes_vinculados (
          id, mdfe_id, frete_id, chave_cte, numero_cte, valor_frete, peso_kg, municipio_descarregamento, uf_descarregamento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          v.id, v.mdfe_id, v.frete_id, v.chave_cte, v.numero_cte, v.valor_frete, v.peso_kg, v.municipio_descarregamento, v.uf_descarregamento
        ]
      });
    } catch (e) {
      console.warn(`Aviso vínculo MDF-e ${v.id}:`, e.message);
    }
  }
  console.log(`✅ ${mdfes.length} Manifestos MDF-e sincronizados no Turso!`);

  console.log('\n🎉 SINCRONIZAÇÃO COMPLETA NO TURSO REALIZADA COM SUCESSO!');
}

syncAllToTurso().catch(console.error);
