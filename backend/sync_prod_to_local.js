const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const backupFile = path.join(__dirname, 'production_live_backup.json');
const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

const dbPath = path.join(__dirname, 'sisfrete.db');
const db = new DatabaseSync(dbPath);

console.log('Inserindo clientes...');
for (const c of data.clientes) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO clientes (
        id, razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      c.id, c.razao_social, c.nome_fantasia, c.cnpj_cpf, c.telefone, c.email, c.cidade, c.uf, c.created_at || new Date().toISOString()
    );
  } catch (err) {
    console.error('Erro cliente:', err.message);
  }
}

console.log('Inserindo motoristas...');
for (const m of data.motoristas) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO motoristas (
        id, nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      m.id, m.nome, m.cpf_cnpj, m.telefone, m.pix_chave, m.pix_tipo, m.placa_cavalo, m.placa_carreta, m.tipo_veiculo, m.cidade, m.uf, m.observacoes, m.created_at || new Date().toISOString()
    );
  } catch (err) {
    console.error('Erro motorista:', err.message);
  }
}

console.log('Inserindo fretes...');
for (const f of data.fretes) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO fretes (
        id, tipo_operacao, numero_cte, serie_cte, chave_cte, data_emissao,
        cliente_id, cliente_nome, motorista_id, motorista_nome,
        origem_cidade, origem_uf, destino_cidade, destino_uf,
        placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
        numero_cte_2, serie_cte_2, chave_cte_2, cliente_id_2, cliente_nome_2, cliente_cnpj_2,
        valor_frete_venda_2, tipo_carga_2, peso_kg_2, status_recebimento_cliente_2, data_vencimento_cliente_2,
        valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
        percentual_adiantamento, valor_adiantamento, valor_pedagio, valor_combustivel,
        outros_descontos, valor_acrescimos, valor_saldo_motorista,
        status_frete, status_pagamento_motorista, status_recebimento_cliente,
        data_previsao_entrega, data_entrega, data_vencimento_cliente,
        observacoes, xml_bruto, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      f.id, f.tipo_operacao || 'padrao', f.numero_cte, f.serie_cte, f.chave_cte, f.data_emissao,
      f.cliente_id, f.cliente_nome, f.motorista_id, f.motorista_nome,
      f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
      f.placa_veiculo, f.placa_carreta, f.tipo_carga, f.peso_kg, f.valor_mercadoria || 0,
      f.numero_cte_2, f.serie_cte_2, f.chave_cte_2, f.cliente_id_2, f.cliente_nome_2, f.cliente_cnpj_2,
      f.valor_frete_venda_2 || 0, f.tipo_carga_2, f.peso_kg_2, f.status_recebimento_cliente_2 || 'pendente', f.data_vencimento_cliente_2,
      f.valor_frete_venda || 0, f.valor_frete_compra || 0, f.valor_comissao || 0, f.percentual_margem || 0,
      f.percentual_adiantamento || 0, f.valor_adiantamento || 0, f.valor_pedagio || 0, f.valor_combustivel || 0,
      f.outros_descontos || 0, f.valor_acrescimos || 0, f.valor_saldo_motorista || 0,
      f.status_frete || 'em_transito', f.status_pagamento_motorista || 'pendente', f.status_recebimento_cliente || 'pendente',
      f.data_previsao_entrega, f.data_entrega, f.data_vencimento_cliente,
      f.observacoes || '', f.xml_bruto || '', f.created_at, f.updated_at
    );
  } catch (err) {
    console.error('Erro frete:', err.message);
  }
}

// Atualizar system_state
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  db.prepare(`INSERT OR REPLACE INTO system_state (key, value) VALUES ('allow_empty', 'false')`).run();
} catch (e) {}

const checkFretes = db.prepare('SELECT count(*) as total FROM fretes').get();
const checkMotoristas = db.prepare('SELECT count(*) as total FROM motoristas').get();
const checkClientes = db.prepare('SELECT count(*) as total FROM clientes').get();

console.log('SUCESSO TOTAL! Banco sisfrete.db atualizado com:', {
  fretes: checkFretes.total,
  motoristas: checkMotoristas.total,
  clientes: checkClientes.total
});
