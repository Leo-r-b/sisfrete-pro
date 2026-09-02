const fs = require('fs');
const db = require('./src/config/database');

const pfxPath = 'C:\\Users\\ACER\\Downloads\\CERTIFICADO FSERV  LTDA E_33590616000119-2026.pfx';
const pfxBuffer = fs.readFileSync(pfxPath);
const pfxBase64 = pfxBuffer.toString('base64');
const password = '09012611';

// 1. Localizar ou Criar Licença 3 (FSERVICE)
let empresa = db.prepare("SELECT * FROM empresas WHERE codigo_licenca = '3' OR id = 3").get();
if (!empresa) {
  empresa = db.prepare("SELECT * FROM empresas WHERE codigo_licenca = '3' OR id = 11").get();
}

if (!empresa) {
  const info = db.prepare(`
    INSERT INTO empresas (codigo_licenca, razao_social, nome_fantasia, cnpj, cidade, uf, modo_operacao, percentual_comissao_padrao, ativo)
    VALUES ('3', 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA', 'FSERVICE TRANSPORTES', '33.590.616/0001-19', 'Sabáudia', 'PR', 'padrao', 5.0, 1)
  `).run();
  empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(Number(info.lastInsertRowid));
} else {
  db.prepare(`
    UPDATE empresas SET
      codigo_licenca = '3',
      razao_social = 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA',
      nome_fantasia = 'FSERVICE TRANSPORTES',
      cnpj = '33.590.616/0001-19',
      cidade = 'Sabáudia',
      uf = 'PR',
      modo_operacao = 'padrao',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(empresa.id);
  empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresa.id);
}

console.log('✅ Licença 3 Atualizada:', {
  id: empresa.id,
  codigo_licenca: empresa.codigo_licenca,
  razao_social: empresa.razao_social,
  nome_fantasia: empresa.nome_fantasia,
  cnpj: empresa.cnpj,
  cidade: empresa.cidade,
  uf: empresa.uf
});

// 2. Configurar Dados Fiscais e Importar Certificado A1 na Licença 3
const fiscalCurrent = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresa.id);

if (fiscalCurrent) {
  db.prepare(`
    UPDATE empresa_fiscal_config SET
      ambiente = 'homologacao',
      serie_cte = 1,
      rntrc_padrao = '12345678',
      aliquota_icms_padrao = 12.0,
      cst_icms_padrao = '00',
      cfop_padrao_estadual = '5353',
      cfop_padrao_interestadual = '6353',
      natureza_operacao = 'PRESTACAO DE SERVICO DE TRANSPORTE',
      certificado_a1_base64 = ?,
      certificado_senha = ?,
      certificado_validade = '2027-01-09T16:56:04.000Z',
      certificado_titular = 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA E:33590616000119',
      certificado_cnpj = '33590616000119',
      updated_at = CURRENT_TIMESTAMP
    WHERE empresa_id = ?
  `).run(pfxBase64, password, empresa.id);
} else {
  db.prepare(`
    INSERT INTO empresa_fiscal_config (
      empresa_id, ambiente, serie_cte, ultimo_numero_cte, rntrc_padrao,
      aliquota_icms_padrao, cst_icms_padrao, cfop_padrao_estadual, cfop_padrao_interestadual,
      natureza_operacao, certificado_a1_base64, certificado_senha,
      certificado_validade, certificado_titular, certificado_cnpj
    ) VALUES (?, 'homologacao', 1, 0, '12345678', 12.0, '00', '5353', '6353', 'PRESTACAO DE SERVICO DE TRANSPORTE', ?, ?, '2027-01-09T16:56:04.000Z', 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA E:33590616000119', '33590616000119')
  `).run(empresa.id, pfxBase64, password);
}

const configAtualizada = db.prepare('SELECT id, empresa_id, ambiente, serie_cte, ultimo_numero_cte, certificado_titular, certificado_validade, certificado_cnpj FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresa.id);
console.log('✅ Configuração Fiscal & Certificado A1 Vinculado:', configAtualizada);

// 3. Criar Frete de Teste em Homologação para a Licença 3 se não houver
const freteExistente = db.prepare('SELECT COUNT(*) as count FROM fretes WHERE empresa_id = ?').get(empresa.id);
if (freteExistente.count === 0) {
  // Criar cliente e motorista de teste
  const cli = db.prepare(`
    INSERT INTO clientes (empresa_id, razao_social, nome_fantasia, cnpj_cpf, cidade, uf)
    VALUES (?, 'COOPERATIVA AGROINDUSTRIAL TESTE SEFAZ', 'COOP TESTE', '79.123.456/0001-00', 'Maringá', 'PR')
  `).run(empresa.id);

  const mot = db.prepare(`
    INSERT INTO motoristas (empresa_id, nome, cpf_cnpj, telefone, pix_chave, placa_cavalo, tipo_veiculo, cidade, uf)
    VALUES (?, 'Carlos Alberto de Oliveira', '123.456.789-00', '(44) 99888-7766', '12345678900', 'FSR1A23', 'Carreta', 'Sabáudia', 'PR')
  `).run(empresa.id);

  db.prepare(`
    INSERT INTO fretes (
      empresa_id, tipo_operacao, data_emissao,
      cliente_id, cliente_nome, motorista_id, motorista_nome,
      origem_cidade, origem_uf, destino_cidade, destino_uf,
      placa_veiculo, tipo_carga, peso_kg, valor_mercadoria,
      valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
      valor_adiantamento, valor_saldo_motorista,
      status_frete, status_pagamento_motorista, status_recebimento_cliente,
      status_sefaz, observacoes
    ) VALUES (
      ?, 'padrao', DATE('now'),
      ?, 'COOPERATIVA AGROINDUSTRIAL TESTE SEFAZ', ?, 'Carlos Alberto de Oliveira',
      'Sabáudia', 'PR', 'Paranaguá', 'PR',
      'FSR1A23', 'Soja em Grãos', 38000, 125000.00,
      8500.00, 7200.00, 1300.00, 15.29,
      4000.00, 3200.00,
      'em_transito', 'adiantamento_pago', 'pendente',
      'pendente', 'Frete para Teste de Homologação CT-e 4.00 SEFAZ'
    )
  `).run(empresa.id, Number(cli.lastInsertRowid), Number(mot.lastInsertRowid));
  console.log('✅ Frete de Homologação Criado com Sucesso!');
}
