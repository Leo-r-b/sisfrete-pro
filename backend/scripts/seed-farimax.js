const db = require('../src/config/database.js');

async function seedFarimaxCtes() {
  console.log('--- Verificando / Criando Cliente Farimax ---');
  let farimax = db.prepare(`SELECT * FROM clientes WHERE razao_social LIKE '%FARIMAX%' LIMIT 1`).get();
  if (!farimax) {
    const res = db.prepare(`
      INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA',
      'Farimax Alimentos',
      '22.333.444/0001-55',
      '(45) 3254-8800',
      'faturamento@farimax.com.br',
      'Toledo',
      'PR'
    );
    farimax = db.prepare('SELECT * FROM clientes WHERE id = ?').get(res.lastInsertRowid);
  }
  console.log('Cliente Farimax ID:', farimax.id, farimax.razao_social);

  let agrosul = db.prepare(`SELECT * FROM clientes WHERE razao_social LIKE '%AGROSUL%' LIMIT 1`).get();
  if (!agrosul) {
    const res = db.prepare(`
      INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'AGROSUL INDUSTRIA AGRICOLA LTDA EM RECUPERACAO JUD',
      'Agrosul Grãos',
      '11.222.333/0001-44',
      '(45) 3321-9900',
      'logistica@agrosul.com.br',
      'Cascavel',
      'PR'
    );
    agrosul = db.prepare('SELECT * FROM clientes WHERE id = ?').get(res.lastInsertRowid);
  }

  let biomax = db.prepare(`SELECT * FROM clientes WHERE razao_social LIKE '%BIOMAX%' LIMIT 1`).get();
  if (!biomax) {
    const res = db.prepare(`
      INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'BIOMAX NUTRICAO ANIMAL LTDA',
      'Biomax Rações',
      '33.444.555/0001-66',
      '(47) 3451-2200',
      'compras@biomax.com.br',
      'Joinville',
      'SC'
    );
    biomax = db.prepare('SELECT * FROM clientes WHERE id = ?').get(res.lastInsertRowid);
  }

  // Motoristas
  const motoristas = db.prepare('SELECT * FROM motoristas LIMIT 5').all();
  console.log('Total motoristas disponíveis:', motoristas.length);

  const m1 = motoristas[0] || { id: null, nome: 'Marcos Antônio Santos', placa_cavalo: 'MGH3F45', placa_carreta: 'BHZ4K88' };
  const m2 = motoristas[1] || { id: null, nome: 'Roberto Ferreira de Souza', placa_cavalo: 'BRA2E19', placa_carreta: 'CUR8A44' };
  const m3 = motoristas[2] || { id: null, nome: 'Valdir Pereira Lima', placa_cavalo: 'GOI5T67', placa_carreta: 'ANP9L12' };
  const m4 = motoristas[3] || { id: null, nome: 'Carlos Eduardo Silva', placa_cavalo: 'PRX4B88', placa_carreta: 'ABC1D23' };

  // Inserir 5 CT-es realistas para a Farimax em aberto:
  const insertFrete = db.prepare(`
    INSERT INTO fretes (
      tipo_operacao, numero_cte, serie_cte, chave_cte, data_emissao,
      cliente_id, cliente_nome, motorista_id, motorista_nome,
      origem_cidade, origem_uf, destino_cidade, destino_uf,
      placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
      numero_cte_2, serie_cte_2, chave_cte_2, cliente_id_2, cliente_nome_2, cliente_cnpj_2,
      valor_frete_venda_2, tipo_carga_2, peso_kg_2, status_recebimento_cliente_2, data_vencimento_cliente_2,
      tarifa_tipo_venda, tarifa_valor_venda, tarifa_tipo_compra, tarifa_valor_compra,
      nfe_referencia, nfe_chave,
      valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
      percentual_adiantamento, valor_adiantamento, valor_saldo_motorista,
      status_frete, status_pagamento_motorista, status_recebimento_cliente,
      data_previsao_entrega, data_vencimento_cliente, observacoes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )
  `);

  const insertAdiantamento = db.prepare(`
    INSERT INTO adiantamentos_historico (
      frete_id, tipo, valor, data_pagamento, forma_pagamento, comprovante_ref, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  console.log('⏳ Inserindo os 5 CT-es para a Farimax...');

  // CT-e 1: Operação Padrão - Farinha de Trigo Especial 00
  // Rota: Toledo/PR -> Curitiba/PR | 34.50 ton | Venda: R$ 7.935,00 (R$ 230/ton) | Compra: R$ 6.210,00 (R$ 180/ton) | Comissão: R$ 1.725,00 (21.7%)
  const f1 = insertFrete.run(
    'padrao', '008910', '1', '41260822333444000155570010000089101001234567', '2026-08-25',
    farimax.id, farimax.razao_social, m1.id, m1.nome,
    'Toledo', 'PR', 'Curitiba', 'PR',
    m1.placa_cavalo || 'MGH3F45', m1.placa_carreta || 'BHZ4K88', 'Farinha de Trigo Especial Tipo 1 (Sacos 25kg)', 34500, 115000.00,
    null, null, null, null, null, null,
    0, null, 0, 'pendente', null,
    'ton', 230.00, 'ton', 180.00,
    'NF 45890', '41260822333444000155550010000458901001234567',
    7935.00, 6210.00, 1725.00, 21.74,
    70.0, 4347.00, 1863.00,
    'em_transito', 'adiantamento_pago', 'pendente',
    '2026-08-28', '2026-09-10', 'Carga paletizada de farinha. Vencimento fatura 15 dias após entrega.'
  );
  insertAdiantamento.run(Number(f1.lastInsertRowid), 'adiantamento', 4347.00, '2026-08-25', 'PIX', 'PIX-7744112233', 'Adiantamento 70% na saída');

  // CT-e 2: Operação Triangular - Farimax (Tomador 1 / Remessa) -> Biomax Nutrição Animal (Tomador 2 / Venda)
  // Rota: Toledo/PR -> Joinville/SC | 35.20 ton | Farelo de Trigo a Granel
  // CT-e 1 (Farimax): R$ 6.336,00 (R$ 180/t) | CT-e 2 (Biomax): R$ 8.448,00 (R$ 240/t) | Total Venda: R$ 14.784,00 | Compra: R$ 11.264,00 | Lucro: R$ 3.520,00
  const f2 = insertFrete.run(
    'triangular', '008915', '1', '41260822333444000155570010000089151009876543', '2026-08-26',
    farimax.id, farimax.razao_social, m2.id, m2.nome,
    'Toledo', 'PR', 'Joinville', 'SC',
    m2.placa_cavalo || 'BRA2E19', m2.placa_carreta || 'CUR8A44', 'Farelo de Trigo Industrial a Granel', 35200, 88000.00,
    '008916', '1', '41260833444555000166570010000089161008765432', biomax.id, biomax.razao_social, biomax.cnpj_cpf,
    8448.00, 'Farelo de Trigo a Granel', 35200, 'pendente', '2026-09-15',
    'ton', 180.00, 'ton', 320.00,
    'NF 45910', '41260822333444000155550010000459101009876543',
    6336.00, 11264.00, 3520.00, 23.81,
    70.0, 7884.80, 3379.20,
    'em_transito', 'adiantamento_pago', 'pendente',
    '2026-08-29', '2026-09-12', 'Operação Triangular: Remessa Farimax Toledo / Venda Biomax Joinville.'
  );
  insertAdiantamento.run(Number(f2.lastInsertRowid), 'adiantamento', 7884.80, '2026-08-26', 'PIX', 'PIX-9988114422', 'Adiantamento 70% viagem interestadual');

  // CT-e 3: Operação Padrão - Farinha Industrial Pré-Mistura
  // Rota: Toledo/PR -> Santos/SP (Porto / Exportação) | 32.00 ton | Venda: R$ 10.240,00 (R$ 320/t) | Compra: R$ 8.000,00 (R$ 250/t) | Lucro: R$ 2.240,00
  const f3 = insertFrete.run(
    'padrao', '008922', '1', '41260822333444000155570010000089221004567891', '2026-08-26',
    farimax.id, farimax.razao_social, m3.id, m3.nome,
    'Toledo', 'PR', 'Santos', 'SP',
    m3.placa_cavalo || 'GOI5T67', m3.placa_carreta || 'ANP9L12', 'Farinha de Trigo Ensacada 50kg p/ Exportação', 32000, 142000.00,
    null, null, null, null, null, null,
    0, null, 0, 'pendente', null,
    'ton', 320.00, 'ton', 250.00,
    'NF 45988', '41260822333444000155550010000459881004567891',
    10240.00, 8000.00, 2240.00, 21.88,
    70.0, 5600.00, 2400.00,
    'em_transito', 'adiantamento_pago', 'pendente',
    '2026-08-30', '2026-09-18', 'Agendamento Porto de Santos - Terminal Exportador.'
  );
  insertAdiantamento.run(Number(f3.lastInsertRowid), 'adiantamento', 5600.00, '2026-08-26', 'PIX', 'PIX-1122998877', 'Adiantamento 70% frete Porto de Santos');

  // CT-e 4: Operação Triangular - Agrosul (Tomador 1 / Grãos) -> Farimax Toledo (Tomador 2 / Destino Final de Moagem)
  // Rota: Cascavel/PR -> Toledo/PR | 38.00 ton | Trigo em Grãos a Granel
  // CT-e 1 (Agrosul): R$ 3.800,00 | CT-e 2 (Farimax): R$ 4.560,00 (R$ 120/t) | Compra: R$ 6.460,00 | Lucro: R$ 1.900,00
  const f4 = insertFrete.run(
    'triangular', '008930', '1', '41260811222333000144570010000089301003456789', '2026-08-27',
    agrosul.id, agrosul.razao_social, m4.id, m4.nome,
    'Cascavel', 'PR', 'Toledo', 'PR',
    m4.placa_cavalo || 'PRX4B88', m4.placa_carreta || 'ABC1D23', 'Trigo em Grãos Limpo e Seco', 38000, 95000.00,
    '008931', '1', '41260822333444000155570010000089311005678901', farimax.id, farimax.razao_social, farimax.cnpj_cpf,
    4560.00, 'Trigo em Grãos p/ Moagem', 38000, 'pendente', '2026-09-10',
    'ton', 100.00, 'ton', 170.00,
    'NF 12890', '41260811222333000144550010000128901003456789',
    3800.00, 6460.00, 1900.00, 22.73,
    70.0, 4522.00, 1938.00,
    'em_transito', 'adiantamento_pago', 'pendente',
    '2026-08-28', '2026-09-08', 'Recebimento de trigo em grãos para moagem na planta Farimax Toledo.'
  );
  insertAdiantamento.run(Number(f4.lastInsertRowid), 'adiantamento', 4522.00, '2026-08-27', 'PIX', 'PIX-3344556677', 'Adiantamento 70% transferência de grãos');

  // CT-e 5: Operação Padrão - Farinha de Trigo Integral e Sêmola
  // Rota: Toledo/PR -> Londrina/PR | 29.80 ton | Venda: R$ 6.854,00 (R$ 230/t) | Compra: R$ 5.364,00 (R$ 180/t) | Lucro: R$ 1.490,00
  const f5 = insertFrete.run(
    'padrao', '008940', '1', '41260822333444000155570010000089401006789012', '2026-08-28',
    farimax.id, farimax.razao_social, m1.id, m1.nome,
    'Toledo', 'PR', 'Londrina', 'PR',
    m1.placa_cavalo || 'MGH3F45', m1.placa_carreta || 'BHZ4K88', 'Farinha de Trigo Integral e Sêmola Especial', 29800, 98000.00,
    null, null, null, null, null, null,
    0, null, 0, 'pendente', null,
    'ton', 230.00, 'ton', 180.00,
    'NF 46015', '41260822333444000155550010000460151006789012',
    6854.00, 5364.00, 1490.00, 21.74,
    0.0, 0.00, 5364.00,
    'em_transito', 'pendente', 'pendente',
    '2026-08-30', '2026-09-14', 'Carga isenta de adiantamento. Pagamento 100% contra comprovante.'
  );

  console.log('✅ 5 CT-es inseridos com sucesso para a Farimax!');
}

seedFarimaxCtes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
