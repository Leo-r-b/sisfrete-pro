const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function seedTursoFarimax() {
  console.log('🚀 Semeando 5 CT-es da Farimax no Turso Cloud DB...');

  // 1. Garantir clientes no Turso
  let farimaxRes = await client.execute("SELECT id, razao_social FROM clientes WHERE razao_social LIKE '%FARIMAX%' LIMIT 1");
  let farimaxId = farimaxRes.rows[0]?.id;
  if (!farimaxId) {
    const fInsert = await client.execute({
      sql: `INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA', 'Farimax Alimentos', '22.333.444/0001-55', '(45) 3254-8800', 'faturamento@farimax.com.br', 'Toledo', 'PR']
    });
    farimaxId = Number(fInsert.lastInsertRowid);
  }

  let biomaxRes = await client.execute("SELECT id, razao_social, cnpj_cpf FROM clientes WHERE razao_social LIKE '%BIOMAX%' LIMIT 1");
  let biomaxId = biomaxRes.rows[0]?.id;
  if (!biomaxId) {
    const bInsert = await client.execute({
      sql: `INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['BIOMAX NUTRICAO ANIMAL LTDA', 'Biomax Rações', '33.444.555/0001-66', '(47) 3451-2200', 'compras@biomax.com.br', 'Joinville', 'SC']
    });
    biomaxId = Number(bInsert.lastInsertRowid);
  }

  let agrosulRes = await client.execute("SELECT id, razao_social FROM clientes WHERE razao_social LIKE '%AGROSUL%' LIMIT 1");
  let agrosulId = agrosulRes.rows[0]?.id;
  if (!agrosulId) {
    const aInsert = await client.execute({
      sql: `INSERT INTO clientes (razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['AGROSUL INDUSTRIA AGRICOLA LTDA EM RECUPERACAO JUD', 'Agrosul Grãos', '11.222.333/0001-44', '(45) 3321-9900', 'logistica@agrosul.com.br', 'Cascavel', 'PR']
    });
    agrosulId = Number(aInsert.lastInsertRowid);
  }

  // Motoristas
  const motRes = await client.execute('SELECT id, nome, placa_cavalo, placa_carreta FROM motoristas LIMIT 5');
  const m1 = motRes.rows[0] || { id: null, nome: 'Marcos Antônio Santos', placa_cavalo: 'MGH3F45', placa_carreta: 'BHZ4K88' };
  const m2 = motRes.rows[1] || { id: null, nome: 'Roberto Ferreira de Souza', placa_cavalo: 'BRA2E19', placa_carreta: 'CUR8A44' };
  const m3 = motRes.rows[2] || { id: null, nome: 'Valdir Pereira Lima', placa_cavalo: 'GOI5T67', placa_carreta: 'ANP9L12' };
  const m4 = motRes.rows[3] || { id: null, nome: 'Carlos Eduardo Silva', placa_cavalo: 'PRX4B88', placa_carreta: 'ABC1D23' };

  // Inserir os 5 CT-es
  const ctes = [
    {
      sql: `INSERT INTO fretes (
        tipo_operacao, numero_cte, serie_cte, chave_cte, data_emissao,
        cliente_id, cliente_nome, motorista_id, motorista_nome,
        origem_cidade, origem_uf, destino_cidade, destino_uf,
        placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
        tarifa_tipo_venda, tarifa_valor_venda, tarifa_tipo_compra, tarifa_valor_compra,
        nfe_referencia, nfe_chave,
        valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
        percentual_adiantamento, valor_adiantamento, valor_saldo_motorista,
        status_frete, status_pagamento_motorista, status_recebimento_cliente,
        data_previsao_entrega, data_vencimento_cliente, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'padrao', '008910', '1', '41260822333444000155570010000089101001234567', '2026-08-25',
        farimaxId, 'FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA', m1.id, m1.nome,
        'Toledo', 'PR', 'Curitiba', 'PR',
        m1.placa_cavalo || 'MGH3F45', m1.placa_carreta || 'BHZ4K88', 'Farinha de Trigo Especial Tipo 1 (Sacos 25kg)', 34500, 115000.00,
        'ton', 230.00, 'ton', 180.00,
        'NF 45890', '41260822333444000155550010000458901001234567',
        7935.00, 6210.00, 1725.00, 21.74,
        70.0, 4347.00, 1863.00,
        'em_transito', 'adiantamento_pago', 'pendente',
        '2026-08-28', '2026-09-10', 'Carga paletizada de farinha. Vencimento fatura 15 dias após entrega.'
      ]
    },
    {
      sql: `INSERT INTO fretes (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'triangular', '008915', '1', '41260822333444000155570010000089151009876543', '2026-08-26',
        farimaxId, 'FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA', m2.id, m2.nome,
        'Toledo', 'PR', 'Joinville', 'SC',
        m2.placa_cavalo || 'BRA2E19', m2.placa_carreta || 'CUR8A44', 'Farelo de Trigo Industrial a Granel', 35200, 88000.00,
        '008916', '1', '41260833444555000166570010000089161008765432', biomaxId, 'BIOMAX NUTRICAO ANIMAL LTDA', '33.444.555/0001-66',
        8448.00, 'Farelo de Trigo a Granel', 35200, 'pendente', '2026-09-15',
        'ton', 180.00, 'ton', 320.00,
        'NF 45910', '41260822333444000155550010000459101009876543',
        6336.00, 11264.00, 3520.00, 23.81,
        70.0, 7884.80, 3379.20,
        'em_transito', 'adiantamento_pago', 'pendente',
        '2026-08-29', '2026-09-12', 'Operação Triangular: Remessa Farimax Toledo / Venda Biomax Joinville.'
      ]
    },
    {
      sql: `INSERT INTO fretes (
        tipo_operacao, numero_cte, serie_cte, chave_cte, data_emissao,
        cliente_id, cliente_nome, motorista_id, motorista_nome,
        origem_cidade, origem_uf, destino_cidade, destino_uf,
        placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
        tarifa_tipo_venda, tarifa_valor_venda, tarifa_tipo_compra, tarifa_valor_compra,
        nfe_referencia, nfe_chave,
        valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
        percentual_adiantamento, valor_adiantamento, valor_saldo_motorista,
        status_frete, status_pagamento_motorista, status_recebimento_cliente,
        data_previsao_entrega, data_vencimento_cliente, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'padrao', '008922', '1', '41260822333444000155570010000089221004567891', '2026-08-26',
        farimaxId, 'FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA', m3.id, m3.nome,
        'Toledo', 'PR', 'Santos', 'SP',
        m3.placa_cavalo || 'GOI5T67', m3.placa_carreta || 'ANP9L12', 'Farinha de Trigo Ensacada 50kg p/ Exportação', 32000, 142000.00,
        'ton', 320.00, 'ton', 250.00,
        'NF 45988', '41260822333444000155550010000459881004567891',
        10240.00, 8000.00, 2240.00, 21.88,
        70.0, 5600.00, 2400.00,
        'em_transito', 'adiantamento_pago', 'pendente',
        '2026-08-30', '2026-09-18', 'Agendamento Porto de Santos - Terminal Exportador.'
      ]
    },
    {
      sql: `INSERT INTO fretes (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'triangular', '008930', '1', '41260811222333000144570010000089301003456789', '2026-08-27',
        agrosulId, 'AGROSUL INDUSTRIA AGRICOLA LTDA EM RECUPERACAO JUD', m4.id, m4.nome,
        'Cascavel', 'PR', 'Toledo', 'PR',
        m4.placa_cavalo || 'PRX4B88', m4.placa_carreta || 'ABC1D23', 'Trigo em Grãos Limpo e Seco', 38000, 95000.00,
        '008931', '1', '41260822333444000155570010000089311005678901', farimaxId, 'FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA', '22.333.444/0001-55',
        4560.00, 'Trigo em Grãos p/ Moagem', 38000, 'pendente', '2026-09-10',
        'ton', 100.00, 'ton', 170.00,
        'NF 12890', '41260811222333000144550010000128901003456789',
        3800.00, 6460.00, 1900.00, 22.73,
        70.0, 4522.00, 1938.00,
        'em_transito', 'adiantamento_pago', 'pendente',
        '2026-08-28', '2026-09-08', 'Recebimento de trigo em grãos para moagem na planta Farimax Toledo.'
      ]
    },
    {
      sql: `INSERT INTO fretes (
        tipo_operacao, numero_cte, serie_cte, chave_cte, data_emissao,
        cliente_id, cliente_nome, motorista_id, motorista_nome,
        origem_cidade, origem_uf, destino_cidade, destino_uf,
        placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
        tarifa_tipo_venda, tarifa_valor_venda, tarifa_tipo_compra, tarifa_valor_compra,
        nfe_referencia, nfe_chave,
        valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
        percentual_adiantamento, valor_adiantamento, valor_saldo_motorista,
        status_frete, status_pagamento_motorista, status_recebimento_cliente,
        data_previsao_entrega, data_vencimento_cliente, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'padrao', '008940', '1', '41260822333444000155570010000089401006789012', '2026-08-28',
        farimaxId, 'FARIMAX INDUSTRIA E COMERCIO DE FARINHA - LTDA', m1.id, m1.nome,
        'Toledo', 'PR', 'Londrina', 'PR',
        m1.placa_cavalo || 'MGH3F45', m1.placa_carreta || 'BHZ4K88', 'Farinha de Trigo Integral e Sêmola Especial', 29800, 98000.00,
        'ton', 230.00, 'ton', 180.00,
        'NF 46015', '41260822333444000155550010000460151006789012',
        6854.00, 5364.00, 1490.00, 21.74,
        0.0, 0.00, 5364.00,
        'em_transito', 'pendente', 'pendente',
        '2026-08-30', '2026-09-14', 'Carga isenta de adiantamento. Pagamento 100% contra comprovante.'
      ]
    }
  ];

  for (const cte of ctes) {
    const res = await client.execute(cte);
    const freteId = Number(res.lastInsertRowid);
    if (cte.args[30] === 'adiantamento_pago') {
      await client.execute({
        sql: `INSERT INTO adiantamentos_historico (frete_id, tipo, valor, data_pagamento, forma_pagamento, comprovante_ref, observacoes)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [freteId, 'adiantamento', cte.args[27], cte.args[4], 'PIX', 'PIX-TURSO-AUTO', 'Adiantamento registrado']
      });
    }
  }

  console.log('🎉 5 CT-es da Farimax cadastrados no Turso com sucesso!');
}

seedTursoFarimax().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
