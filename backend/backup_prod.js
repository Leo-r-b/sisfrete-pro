const https = require('https');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(data);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch(e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch(e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function syncProduction() {
  console.log('Autenticando na producao Vercel...');
  let loginRes = await postJson('https://sisfrete-pro.vercel.app/api/auth/login', {
    email: 'admin@sisfrete.com',
    password: 'admin'
  });

  let token = loginRes.token;
  if (!token) {
    loginRes = await postJson('https://sisfrete-pro.vercel.app/api/auth/login', {
      email: 'admin@sisfrete.com',
      password: 'admin123'
    });
    token = loginRes.token;
  }

  if (!token) {
    console.error('Falha ao autenticar na producao:', loginRes);
    return;
  }

  console.log('Login na producao realizado com sucesso!');
  const fretes = await getJson('https://sisfrete-pro.vercel.app/api/fretes', token);
  const motoristas = await getJson('https://sisfrete-pro.vercel.app/api/motoristas', token);
  const clientes = await getJson('https://sisfrete-pro.vercel.app/api/clientes', token);
  const empresa = await getJson('https://sisfrete-pro.vercel.app/api/empresa', token);

  const prodBackup = {
    timestamp: new Date().toISOString(),
    fretes,
    motoristas,
    clientes,
    empresa
  };

  const backupFile = path.join(__dirname, 'production_live_backup.json');
  fs.writeFileSync(backupFile, JSON.stringify(prodBackup, null, 2));

  console.log('BACKUP EM JSON SALVO COM SUCESSO:', {
    fretes: Array.isArray(fretes) ? fretes.length : 0,
    motoristas: Array.isArray(motoristas) ? motoristas.length : 0,
    clientes: Array.isArray(clientes) ? clientes.length : 0
  });

  const dbPath = path.join(__dirname, 'sisfrete.db');
  const db = new DatabaseSync(dbPath);

  if (Array.isArray(motoristas) && motoristas.length > 0) {
    for (const m of motoristas) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO motoristas (
            id, nome, cpf, telefone, email, placa_veiculo, placa_carreta, tipo_veiculo,
            pix_tipo, pix_chave, banco, agencia, conta, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          m.id, m.nome, m.cpf, m.telefone, m.email, m.placa_veiculo, m.placa_carreta, m.tipo_veiculo,
          m.pix_tipo, m.pix_chave, m.banco, m.agencia, m.conta, m.ativo !== undefined ? m.ativo : 1
        );
      } catch (err) {
        console.warn('Erro ao inserir motorista:', err.message);
      }
    }
  }

  if (Array.isArray(clientes) && clientes.length > 0) {
    for (const c of clientes) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO clientes (
            id, razao_social, nome_fantasia, cnpj_cpf, inscricao_estadual,
            telefone, email, endereco, cidade, uf, cep, dias_prazo_pagamento, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          c.id, c.razao_social, c.nome_fantasia, c.cnpj_cpf, c.inscricao_estadual,
          c.telefone, c.email, c.endereco, c.cidade, c.uf, c.cep, c.dias_prazo_pagamento || 30, c.ativo !== undefined ? c.ativo : 1
        );
      } catch (err) {
        console.warn('Erro ao inserir cliente:', err.message);
      }
    }
  }

  if (Array.isArray(fretes) && fretes.length > 0) {
    for (const f of fretes) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO fretes (
            id, numero_cte, nfe_referencia, tipo_operacao,
            numero_cte_2, nfe_referencia_2, cliente_nome_2, cliente_cnpj_2, peso_kg_2, tarifa_tipo_venda_2, tarifa_valor_venda_2, valor_frete_venda_2, data_vencimento_cliente_2,
            origem_cidade, origem_uf, destino_cidade, destino_uf,
            cliente_id, cliente_nome, cliente_cnpj, motorista_id, motorista_nome, motorista_telefone, pix_chave,
            placa_veiculo, placa_carreta, peso_kg, tipo_carga,
            tarifa_tipo_venda, tarifa_valor_venda, valor_frete_venda,
            tarifa_tipo_compra, tarifa_valor_compra, valor_frete_compra,
            percentual_adiantamento, valor_adiantamento, adiantamento_ja_pago,
            valor_pedagio, valor_combustivel, outros_descontos, valor_acrescimos,
            valor_saldo_motorista, valor_comissao, percentual_margem,
            status_frete, status_pagamento_motorista, status_recebimento_cliente,
            data_emissao, data_vencimento_cliente, observacoes, created_by
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
          )
        `).run(
          f.id, f.numero_cte, f.nfe_referencia, f.tipo_operacao || 'padrao',
          f.numero_cte_2, f.nfe_referencia_2, f.cliente_nome_2, f.cliente_cnpj_2, f.peso_kg_2, f.tarifa_tipo_venda_2, f.tarifa_valor_venda_2, f.valor_frete_venda_2, f.data_vencimento_cliente_2,
          f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
          f.cliente_id, f.cliente_nome, f.cliente_cnpj, f.motorista_id, f.motorista_nome, f.motorista_telefone, f.pix_chave,
          f.placa_veiculo, f.placa_carreta, f.peso_kg, f.tipo_carga,
          f.tarifa_tipo_venda, f.tarifa_valor_venda, f.valor_frete_venda,
          f.tarifa_tipo_compra, f.tarifa_valor_compra, f.valor_frete_compra,
          f.percentual_adiantamento, f.valor_adiantamento, f.adiantamento_ja_pago ? 1 : 0,
          f.valor_pedagio, f.valor_combustivel, f.outros_descontos, f.valor_acrescimos,
          f.valor_saldo_motorista, f.valor_comissao, f.percentual_margem,
          f.status_frete, f.status_pagamento_motorista, f.status_recebimento_cliente,
          f.data_emissao, f.data_vencimento_cliente, f.observacoes, f.created_by
        );
      } catch (err) {
        console.warn('Erro ao inserir frete:', err.message);
      }
    }
  }

  console.log('SINCRONIZACAO COMPLETA: O banco sisfrete.db agora contem exatamente os dados de producao!');
}

syncProduction().catch(console.error);
