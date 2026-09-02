const db = require('../src/config/database');

try {
  const count = db.prepare('SELECT COUNT(*) as total FROM financeiro_titulos').get().total;
  console.log(`Títulos existentes: ${count}`);

  if (count === 0) {
    console.log('Inserindo títulos operacionais de demonstração...');

    const titulos = [
      {
        empresa_id: 1,
        tipo: 'pagar',
        origem: 'avulso',
        categoria: 'energia',
        categoria_nome: 'Conta de Energia Elétrica / Luz',
        descricao: 'Conta de Luz Copel - Matriz / Pátio',
        pessoa_nome: 'Copel Distribuição S.A.',
        pessoa_documento: '04.368.898/0001-06',
        valor: 850.40,
        valor_pago: 0,
        data_emissao: '2026-08-01',
        data_vencimento: '2026-09-10',
        status: 'pendente',
        forma_pagamento: 'Boleto',
        observacoes: 'Código de barras: 83630000008 50400138000 00000000000'
      },
      {
        empresa_id: 1,
        tipo: 'pagar',
        origem: 'avulso',
        categoria: 'internet_telefonia',
        categoria_nome: 'Internet, Telefonia & Celular',
        descricao: 'Internet Fibra Óptica 500MB + Linhas Móveis',
        pessoa_nome: 'Claro Telecomunicações',
        pessoa_documento: '40.432.544/0001-47',
        valor: 289.90,
        valor_pago: 0,
        data_emissao: '2026-08-05',
        data_vencimento: '2026-09-15',
        status: 'pendente',
        forma_pagamento: 'Débito Automático',
        observacoes: 'Contrato corporativo'
      },
      {
        empresa_id: 1,
        tipo: 'pagar',
        origem: 'avulso',
        categoria: 'aluguel',
        categoria_nome: 'Aluguel de Galpão / Escritório / Pátio',
        descricao: 'Aluguel Pátio de Triagem e Estacionamento de Carretas',
        pessoa_nome: 'Imobiliária Paraná Imóveis',
        pessoa_documento: '12.987.654/0001-33',
        valor: 3500.00,
        valor_pago: 0,
        data_emissao: '2026-08-01',
        data_vencimento: '2026-09-05',
        status: 'pendente',
        forma_pagamento: 'Transferência',
        observacoes: 'Vencimento todo dia 05'
      },
      {
        empresa_id: 1,
        tipo: 'pagar',
        origem: 'avulso',
        categoria: 'combustivel',
        categoria_nome: 'Combustível & Postos',
        descricao: 'Abastecimento Faturado - Convênio Posto RodoRede',
        pessoa_nome: 'Auto Posto RodoRede Ltda',
        pessoa_documento: '78.123.456/0001-99',
        valor: 4820.00,
        valor_pago: 4820.00,
        data_emissao: '2026-08-10',
        data_vencimento: '2026-08-25',
        data_pagamento: '2026-08-24',
        status: 'pago',
        forma_pagamento: 'Boleto',
        comprovante_ref: 'AUT-982371623'
      },
      {
        empresa_id: 1,
        tipo: 'pagar',
        origem: 'avulso',
        categoria: 'seguro_rastreador',
        categoria_nome: 'Seguro de Carga (RCTR-C) & Rastreadores',
        descricao: 'Mensalidade Sascar / Autotrac e Apólice Porto Seguro',
        pessoa_nome: 'Porto Seguro Cargas',
        pessoa_documento: '61.198.164/0001-60',
        valor: 1450.00,
        valor_pago: 0,
        data_emissao: '2026-08-01',
        data_vencimento: '2026-09-20',
        status: 'pendente',
        forma_pagamento: 'Boleto'
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO financeiro_titulos (
        empresa_id, tipo, origem, categoria, categoria_nome, descricao,
        pessoa_nome, pessoa_documento, valor, valor_pago, data_emissao,
        data_vencimento, data_pagamento, status, forma_pagamento, comprovante_ref, observacoes
      ) VALUES (
        @empresa_id, @tipo, @origem, @categoria, @categoria_nome, @descricao,
        @pessoa_nome, @pessoa_documento, @valor, @valor_pago, @data_emissao,
        @data_vencimento, @data_pagamento, @status, @forma_pagamento, @comprovante_ref, @observacoes
      )
    `);

    for (const t of titulos) {
      stmt.run(t);
    }
    console.log('✅ 5 títulos operacionais inseridos com sucesso!');
  }
} catch (err) {
  console.error('Erro:', err);
}
