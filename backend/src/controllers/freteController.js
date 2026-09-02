const db = require('../config/database');

// Helper para calcular valores de subcontratação baseado em Peso (ton/kg) e Tarifas
function calcularValoresFrete(body) {
  const pesoKg1 = parseFloat(body.peso_kg || 0);
  const pesoTon1 = pesoKg1 / 1000;
  const tarifaTipo1 = body.tarifa_tipo_venda || 'ton';
  const tarifaValor1 = parseFloat(body.tarifa_valor_venda || 0);

  let venda1 = parseFloat(body.valor_frete_venda || 0);
  if (tarifaValor1 > 0) {
    if (tarifaTipo1 === 'ton') {
      venda1 = pesoTon1 * tarifaValor1;
    } else if (tarifaTipo1 === 'kg') {
      venda1 = pesoKg1 * tarifaValor1;
    } else {
      venda1 = tarifaValor1;
    }
  }

  // CT-e 2 (se for operação triangular / 2 CT-es)
  let venda2 = 0;
  const pesoKg2 = parseFloat(body.peso_kg_2 || 0);
  const pesoTon2 = pesoKg2 / 1000;
  const tarifaTipo2 = body.tarifa_tipo_venda_2 || 'ton';
  const tarifaValor2 = parseFloat(body.tarifa_valor_venda_2 || 0);

  if (body.tipo_operacao === 'triangular' || body.formato_operacao === 'triangular' || body.numero_cte_2 || parseFloat(body.valor_frete_venda_2 || 0) > 0) {
    if (tarifaValor2 > 0) {
      if (tarifaTipo2 === 'ton') {
        venda2 = pesoTon2 * tarifaValor2;
      } else if (tarifaTipo2 === 'kg') {
        venda2 = pesoKg2 * tarifaValor2;
      } else {
        venda2 = tarifaValor2;
      }
    } else {
      venda2 = parseFloat(body.valor_frete_venda_2 || 0);
    }
  }

  const vendaTotal = venda1 + venda2;

  // Frete Compra Motorista (Único para a viagem física - NÃO dobra na operação triangular)
  const pesoFisicoTon = pesoTon1;
  const pesoFisicoKg = pesoKg1;
  const tarifaTipoCompra = body.tarifa_tipo_compra || 'fixo';
  const tarifaValorCompra = parseFloat(body.tarifa_valor_compra || 0);

  let compra = parseFloat(body.valor_frete_compra || 0);
  if (tarifaValorCompra > 0) {
    if (tarifaTipoCompra === 'ton') {
      compra = pesoFisicoTon * tarifaValorCompra;
    } else if (tarifaTipoCompra === 'kg') {
      compra = pesoFisicoKg * tarifaValorCompra;
    } else {
      compra = tarifaValorCompra;
    }
  }

  // Adiantamento: Respeitar explicitamente se for isento (0% ou 0 reais)
  let percentualAdiantamento = 0;
  if (body.percentual_adiantamento !== undefined && body.percentual_adiantamento !== '' && body.percentual_adiantamento !== null) {
    percentualAdiantamento = parseFloat(body.percentual_adiantamento);
    if (isNaN(percentualAdiantamento)) percentualAdiantamento = 0;
  }

  let adiantamento = 0;
  if (body.valor_adiantamento !== undefined && body.valor_adiantamento !== '' && body.valor_adiantamento !== null) {
    adiantamento = parseFloat(body.valor_adiantamento);
    if (isNaN(adiantamento)) adiantamento = 0;
  } else if (percentualAdiantamento > 0 && compra > 0) {
    adiantamento = (compra * percentualAdiantamento) / 100;
  }

  const pedagio = parseFloat(body.valor_pedagio || 0);
  const combustivel = parseFloat(body.valor_combustivel || 0);
  const outrosDesc = parseFloat(body.outros_descontos || 0);
  const acrescimos = parseFloat(body.valor_acrescimos || 0);

  // Comissão Consolidada e Repasse
  const valorFreteReal = parseFloat(body.valor_frete_real || 0);
  const isGestaoPagamentos = body.tipo_operacao === 'gestao_pagamentos';
  const isAgenciamento = body.tipo_operacao === 'agenciamento_repasse' || (!isGestaoPagamentos && valorFreteReal > 0);
  const percentualComissao = isGestaoPagamentos ? 0 : parseFloat(body.percentual_comissao !== undefined && body.percentual_comissao !== '' ? body.percentual_comissao : 5.0);

  let valorComissao = 0;
  let valorRepasse = 0;

  if (isGestaoPagamentos) {
    compra = valorFreteReal;
    if (body.valor_comissao !== undefined && body.valor_comissao !== '' && body.valor_comissao !== null) {
      valorComissao = Number(parseFloat(body.valor_comissao).toFixed(2));
    } else {
      valorComissao = 0;
    }
    if (body.valor_repasse !== undefined && body.valor_repasse !== '' && body.valor_repasse !== null) {
      valorRepasse = Number(parseFloat(body.valor_repasse).toFixed(2));
    } else {
      valorRepasse = Number(Math.max(0, vendaTotal - valorFreteReal - valorComissao).toFixed(2));
    }
  } else if (isAgenciamento) {
    compra = valorFreteReal;
    valorComissao = Number((valorFreteReal * (percentualComissao / 100)).toFixed(2));
    valorRepasse = Number(Math.max(0, vendaTotal - valorFreteReal - valorComissao).toFixed(2));
  } else {
    valorComissao = Number((vendaTotal - compra).toFixed(2));
    valorRepasse = 0;
  }

  const margem = vendaTotal > 0 ? (valorComissao / vendaTotal) * 100 : 0;

  // Saldo do Motorista = Compra - Adiantamento - Descontos + Acréscimos
  const saldo = Math.max(0, compra - adiantamento - pedagio - combustivel - outrosDesc + acrescimos);

  return {
    venda1: Number(venda1.toFixed(2)),
    venda2: Number(venda2.toFixed(2)),
    vendaTotal: Number(vendaTotal.toFixed(2)),
    compra: Number(compra.toFixed(2)),
    valorFreteReal: Number(valorFreteReal.toFixed(2)),
    percentualComissao,
    valorComissao: Number(valorComissao.toFixed(2)),
    valorRepasse: Number(valorRepasse.toFixed(2)),
    comissao: Number(valorComissao.toFixed(2)),
    margem: Number(margem.toFixed(2)),
    percentualAdiantamento,
    adiantamento: Number(adiantamento.toFixed(2)),
    pedagio,
    combustivel,
    outrosDesc,
    acrescimos,
    saldo: Number(saldo.toFixed(2)),
    tarifaTipo1,
    tarifaValor1,
    tarifaTipo2,
    tarifaValor2,
    tarifaTipoCompra,
    tarifaValorCompra,
  };
}

const listFretes = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const { 
      search, 
      status_frete, 
      status_pagamento, 
      status_recebimento, 
      motorista_id, 
      cliente_id, 
      data_inicio, 
      data_fim, 
      tipo_operacao,
      origem_registro 
    } = req.query;

    let query = `
      SELECT f.*, 
        (SELECT COUNT(*) FROM adiantamentos_historico a WHERE a.frete_id = f.id) as total_lancamentos,
        e.razao_social as empresa_razao_social,
        e.nome_fantasia as empresa_nome_fantasia,
        e.cnpj as empresa_cnpj,
        e.telefone as empresa_telefone,
        e.cidade as empresa_cidade,
        e.uf as empresa_uf,
        e.chave_pix as empresa_chave_pix,
        e.modo_operacao as empresa_modo_operacao
      FROM fretes f
      LEFT JOIN empresas e ON (f.empresa_id = e.id OR f.empresa_id = cast(e.id as text))
      WHERE (f.empresa_id = ? OR f.empresa_id = ?)
    `;
    const params = [empIdNum, empIdStr];

    if (origem_registro) {
      if (origem_registro === 'importacao_terceiros') {
        query += ` AND f.origem_registro = 'importacao_terceiros'`;
      } else if (origem_registro === 'emissao_propria') {
        query += ` AND (f.origem_registro = 'emissao_propria' OR f.origem_registro IS NULL OR f.origem_registro = '')`;
      } else {
        query += ` AND f.origem_registro = ?`;
        params.push(origem_registro);
      }
    }

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (
        f.numero_cte LIKE ? OR 
        f.numero_cte_2 LIKE ? OR 
        f.nfe_referencia LIKE ? OR 
        f.nfe_referencia_2 LIKE ? OR 
        f.chave_cte LIKE ? OR 
        f.motorista_nome LIKE ? OR 
        f.cliente_nome LIKE ? OR 
        f.cliente_nome_2 LIKE ? OR 
        f.placa_veiculo LIKE ? OR 
        f.origem_cidade LIKE ? OR 
        f.destino_cidade LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term, term, term, term, term);
    }

    if (tipo_operacao) {
      query += ` AND f.tipo_operacao = ?`;
      params.push(tipo_operacao);
    }

    if (status_frete) {
      query += ` AND f.status_frete = ?`;
      params.push(status_frete);
    }

    if (status_pagamento) {
      query += ` AND f.status_pagamento_motorista = ?`;
      params.push(status_pagamento);
    }

    if (status_recebimento) {
      query += ` AND (f.status_recebimento_cliente = ? OR f.status_recebimento_cliente_2 = ?)`;
      params.push(status_recebimento, status_recebimento);
    }

    if (motorista_id) {
      query += ` AND f.motorista_id = ?`;
      params.push(motorista_id);
    }

    if (cliente_id) {
      query += ` AND (f.cliente_id = ? OR f.cliente_id_2 = ?)`;
      params.push(cliente_id, cliente_id);
    }

    if (data_inicio) {
      query += ` AND f.data_emissao >= ?`;
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ` AND f.data_emissao <= ?`;
      params.push(data_fim);
    }

    query += ` ORDER BY f.data_emissao DESC, f.id DESC`;

    const fretes = db.prepare(query).all(...params);

    return res.json(fretes);
  } catch (error) {
    console.error('Erro ao listar fretes:', error);
    return res.status(500).json({ error: 'Erro ao listar fretes.' });
  }
};

const getFreteById = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(id, empIdNum, empIdStr);

    if (!frete) {
      return res.status(404).json({ error: 'Frete não encontrado.' });
    }

    const historico = db.prepare('SELECT * FROM adiantamentos_historico WHERE frete_id = ? ORDER BY data_pagamento ASC, id ASC').all(id);

    let motorista = null;
    if (frete.motorista_id) {
      motorista = db.prepare('SELECT * FROM motoristas WHERE id = ?').get(frete.motorista_id);
    }

    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ? OR id = ?').get(empIdNum, empIdStr);

    return res.json({
      ...frete,
      historico_pagamentos: historico,
      motorista_detalhes: motorista,
      empresa_detalhes: empresa,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao obter detalhes do frete.' });
  }
};

const createFrete = (req, res) => {
  try {
    const data = req.body;
    const empresaId = req.empresaId || 1;

    if (!data.motorista_nome || !data.origem_cidade || !data.destino_cidade) {
      return res.status(400).json({ error: 'Motorista, Cidade de Origem e Cidade de Destino são obrigatórios.' });
    }

    // Validação rigorosa contra duplicidade de XML / CT-e / NF-e
    if (data.chave_cte && String(data.chave_cte).trim().length === 44) {
      const chaveCteLimpa = String(data.chave_cte).trim();
      const existingCte = db.prepare('SELECT id, numero_cte, data_emissao, cliente_nome FROM fretes WHERE (chave_cte = ? OR chave_cte_2 = ?) AND empresa_id = ? AND status_frete != \'cancelado\'').get(chaveCteLimpa, chaveCteLimpa, empresaId);
      if (existingCte) {
        return res.status(400).json({ 
          error: `⚠️ Este CT-e já está cadastrado no sistema (Registro #${existingCte.id}, CT-e Nº ${existingCte.numero_cte || 'S/N'}, Cliente: ${existingCte.cliente_nome || '-'}). A criação/importação duplicada foi bloqueada.` 
        });
      }
    }

    if (data.chave_cte_2 && String(data.chave_cte_2).trim().length === 44) {
      const chaveCte2Limpa = String(data.chave_cte_2).trim();
      const existingCte2 = db.prepare('SELECT id, numero_cte, data_emissao, cliente_nome FROM fretes WHERE (chave_cte = ? OR chave_cte_2 = ?) AND empresa_id = ? AND status_frete != \'cancelado\'').get(chaveCte2Limpa, chaveCte2Limpa, empresaId);
      if (existingCte2) {
        return res.status(400).json({ 
          error: `⚠️ O segundo CT-e desta operação já está cadastrado no sistema (Registro #${existingCte2.id}, CT-e Nº ${existingCte2.numero_cte || 'S/N'}). A criação duplicada foi bloqueada.` 
        });
      }
    }

    if (data.chave_nfe && String(data.chave_nfe).trim().length === 44 && !data.chave_cte) {
      const chaveNfeLimpa = String(data.chave_nfe).trim();
      const existingNfe = db.prepare('SELECT id, numero_cte, data_emissao, cliente_nome FROM fretes WHERE chave_nfe = ? AND empresa_id = ? AND status_frete != \'cancelado\'').get(chaveNfeLimpa, empresaId);
      if (existingNfe) {
        return res.status(400).json({ 
          error: `⚠️ Este XML de NF-e já foi importado anteriormente no sistema (Registro #${existingNfe.id}, Chave final: ${chaveNfeLimpa.substring(25, 34)}). A importação duplicada foi bloqueada.` 
        });
      }
    }

    // Validação de duplicidade por Número do CT-e
    const numCte1 = String(data.numero_cte || '').trim().replace(/^0+/, '');
    if (numCte1 && numCte1 !== 'S/N' && numCte1 !== '0') {
      const existingNum = db.prepare(`
        SELECT id, numero_cte, numero_cte_2, cliente_nome, data_emissao 
        FROM fretes 
        WHERE empresa_id = ? AND status_frete != 'cancelado' 
          AND (
            LTRIM(numero_cte, '0') = ? OR 
            (numero_cte_2 IS NOT NULL AND LTRIM(numero_cte_2, '0') = ?)
          )
      `).get(empresaId, numCte1, numCte1);

      if (existingNum) {
        return res.status(400).json({
          error: `⚠️ Já existe um frete/CT-e cadastrado com o Nº ${data.numero_cte} (Registro #${existingNum.id} - ${existingNum.cliente_nome || '-'}). Para alterar valores, edite o registro existente ou exclua-o.`
        });
      }
    }

    const calc = calcularValoresFrete(data);

    // Auto-vincular ou criar motorista na empresa se não existir
    let motoristaId = data.motorista_id || null;
    if (!motoristaId && data.motorista_nome) {
      const existingMot = db.prepare('SELECT id FROM motoristas WHERE nome = ? COLLATE NOCASE AND empresa_id = ?').get(data.motorista_nome.trim(), empresaId);
      if (existingMot) {
        motoristaId = existingMot.id;
      } else {
        const newMot = db.prepare(`
          INSERT INTO motoristas (empresa_id, nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, cidade, uf)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          empresaId,
          data.motorista_nome.trim(),
          data.motorista_cpf || null,
          data.motorista_telefone || null,
          data.pix_chave || data.motorista_cpf || null,
          data.pix_tipo || 'CPF',
          data.placa_veiculo ? data.placa_veiculo.toUpperCase() : null,
          data.placa_carreta ? data.placa_carreta.toUpperCase() : null,
          data.origem_cidade || null,
          data.origem_uf || null
        );
        motoristaId = Number(newMot.lastInsertRowid);
      }
    }

    // Auto-vincular ou criar cliente 1 na empresa
    let clienteId = data.cliente_id || null;
    const clienteNome = data.cliente_nome ? data.cliente_nome.trim() : 'Cliente Geral';
    if (!clienteId && clienteNome) {
      const existingCli = db.prepare('SELECT id FROM clientes WHERE (razao_social = ? COLLATE NOCASE OR nome_fantasia = ? COLLATE NOCASE) AND empresa_id = ?').get(clienteNome, clienteNome, empresaId);
      if (existingCli) {
        clienteId = existingCli.id;
      } else {
        const newCli = db.prepare(`
          INSERT INTO clientes (empresa_id, razao_social, nome_fantasia, cnpj_cpf, cidade, uf)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          empresaId,
          clienteNome,
          clienteNome,
          data.cliente_cnpj || null,
          data.destino_cidade || null,
          data.destino_uf || null
        );
        clienteId = Number(newCli.lastInsertRowid);
      }
    }

    // Auto-vincular ou criar cliente 2 se triangular na empresa
    let clienteId2 = data.cliente_id_2 || null;
    const clienteNome2 = data.cliente_nome_2 ? data.cliente_nome_2.trim() : null;
    if (!clienteId2 && clienteNome2) {
      const existingCli2 = db.prepare('SELECT id FROM clientes WHERE (razao_social = ? COLLATE NOCASE OR nome_fantasia = ? COLLATE NOCASE) AND empresa_id = ?').get(clienteNome2, clienteNome2, empresaId);
      if (existingCli2) {
        clienteId2 = existingCli2.id;
      } else {
        const newCli2 = db.prepare(`
          INSERT INTO clientes (empresa_id, razao_social, nome_fantasia, cnpj_cpf, cidade, uf)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          empresaId,
          clienteNome2,
          clienteNome2,
          data.cliente_cnpj_2 || null,
          data.destino_cidade || null,
          data.destino_uf || null
        );
        clienteId2 = Number(newCli2.lastInsertRowid);
      }
    }

    const origemRegistro = data.origem_registro || 'emissao_propria';

    const insertStmt = db.prepare(`
      INSERT INTO fretes (
        empresa_id,
        origem_registro,
        tipo_operacao,
        numero_cte, serie_cte, chave_cte, data_emissao,
        cliente_id, cliente_nome, motorista_id, motorista_nome,
        origem_cidade, origem_uf, destino_cidade, destino_uf,
        placa_veiculo, placa_carreta, tipo_carga, peso_kg, valor_mercadoria,
        nfe_referencia, nfe_chave,
        tarifa_tipo_venda, tarifa_valor_venda,
        numero_cte_2, serie_cte_2, chave_cte_2, cliente_id_2, cliente_nome_2, cliente_cnpj_2,
        tipo_carga_2, peso_kg_2, nfe_referencia_2, nfe_chave_2,
        tarifa_tipo_venda_2, tarifa_valor_venda_2,
        valor_frete_venda_2, status_recebimento_cliente_2, data_vencimento_cliente_2,
        tarifa_tipo_compra, tarifa_valor_compra,
        valor_frete_real, percentual_comissao, valor_repasse, status_repasse, data_repasse, comprovante_repasse,
        favorecido_freteiro_nome, destinatario_comissao_nome, destinatario_comissao_doc, status_comissao, data_comissao_paga, comprovante_comissao, destinatario_repasse_nome, destinatario_repasse_doc,
        valor_frete_venda, valor_frete_compra, valor_comissao, percentual_margem,
        percentual_adiantamento, valor_adiantamento, valor_pedagio, valor_combustivel, outros_descontos, valor_acrescimos, valor_saldo_motorista,
        status_frete, status_pagamento_motorista, status_recebimento_cliente,
        data_previsao_entrega, data_vencimento_cliente, observacoes, xml_bruto
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const result = insertStmt.run(
      empresaId,
      origemRegistro,
      data.tipo_operacao || 'padrao',
      data.numero_cte ? String(data.numero_cte) : null,
      data.serie_cte ? String(data.serie_cte) : '1',
      data.chave_cte ? String(data.chave_cte).trim() : null,
      data.data_emissao || new Date().toISOString().substring(0, 10),
      clienteId,
      clienteNome,
      motoristaId,
      data.motorista_nome ? data.motorista_nome.trim() : (data.freteiro_nome ? data.freteiro_nome.trim() : 'Freteiro Terceirizado'),
      data.origem_cidade ? data.origem_cidade.trim() : 'Origem',
      data.origem_uf ? data.origem_uf.trim().toUpperCase() : 'PR',
      data.destino_cidade ? data.destino_cidade.trim() : 'Destino',
      data.destino_uf ? data.destino_uf.trim().toUpperCase() : 'PR',
      data.placa_veiculo ? data.placa_veiculo.trim().toUpperCase() : '',
      data.placa_carreta ? data.placa_carreta.trim().toUpperCase() : '',
      data.tipo_carga || 'Carga Geral',
      parseFloat(data.peso_kg || 0),
      parseFloat(data.valor_mercadoria || 0),
      data.nfe_referencia || '',
      data.nfe_chave || '',
      calc.tarifaTipo1,
      calc.tarifaValor1,

      // CT-e 2
      data.numero_cte_2 ? String(data.numero_cte_2) : null,
      data.serie_cte_2 ? String(data.serie_cte_2) : '1',
      data.chave_cte_2 ? String(data.chave_cte_2).trim() : null,
      clienteId2,
      clienteNome2,
      data.cliente_cnpj_2 || null,
      data.tipo_carga_2 || null,
      parseFloat(data.peso_kg_2 || 0),
      data.nfe_referencia_2 || '',
      data.nfe_chave_2 || '',
      calc.tarifaTipo2,
      calc.tarifaValor2,
      calc.venda2,
      data.status_recebimento_cliente_2 || 'pendente',
      data.data_vencimento_cliente_2 || null,

      calc.tarifaTipoCompra,
      calc.tarifaValorCompra,

      calc.valorFreteReal,
      calc.percentualComissao,
      calc.valorRepasse,
      data.status_repasse || 'pendente',
      data.data_repasse || null,
      data.comprovante_repasse || null,

      // Destinação de Pagamentos (Rateio Freteiro, Comissão e Repasse)
      data.favorecido_freteiro_nome ? data.favorecido_freteiro_nome.trim() : (data.motorista_nome ? data.motorista_nome.trim() : null),
      data.destinatario_comissao_nome ? data.destinatario_comissao_nome.trim() : null,
      data.destinatario_comissao_doc || null,
      data.status_comissao || 'pendente',
      data.data_comissao_paga || null,
      data.comprovante_comissao || null,
      data.destinatario_repasse_nome ? data.destinatario_repasse_nome.trim() : null,
      data.destinatario_repasse_doc || null,

      calc.venda1,
      calc.compra,
      calc.comissao,
      calc.margem,
      calc.percentualAdiantamento,
      calc.adiantamento,
      calc.pedagio,
      calc.combustivel,
      calc.outrosDesc,
      calc.acrescimos,
      calc.saldo,
      data.status_frete || 'em_transito',
      data.status_pagamento_motorista || (calc.adiantamento > 0 && data.adiantamento_ja_pago ? 'adiantamento_pago' : 'pendente'),
      data.status_recebimento_cliente || 'pendente',
      data.data_previsao_entrega || null,
      data.data_vencimento_cliente || null,
      data.observacoes || '',
      data.xml_bruto || ''
    );

    const freteId = Number(result.lastInsertRowid);

    // Registrar adiantamento se já pago na saída
    if (calc.adiantamento > 0 && data.adiantamento_ja_pago) {
      db.prepare(`
        INSERT INTO adiantamentos_historico (empresa_id, frete_id, tipo, valor, data_pagamento, forma_pagamento, comprovante_ref, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        empresaId,
        freteId,
        'adiantamento',
        calc.adiantamento,
        data.data_emissao || new Date().toISOString().substring(0, 10),
        data.forma_pagamento_adiantamento || 'PIX',
        data.comprovante_adiantamento || 'Lançamento Inicial',
        'Adiantamento de saída'
      );
    }

    const createdFrete = db.prepare('SELECT * FROM fretes WHERE id = ?').get(freteId);

    return res.status(201).json({
      message: 'Frete lançado com sucesso!',
      frete: createdFrete,
    });
  } catch (error) {
    console.error('Erro ao criar frete:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar frete: ' + error.message });
  }
};

const updateFrete = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const data = req.body;

    const existing = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(id, empIdNum, empIdStr);
    if (!existing) {
      return res.status(404).json({ error: 'Frete não encontrado.' });
    }

    const calc = calcularValoresFrete(data);

    // Auto-vincular ou atualizar motorista se nome mudou
    let motoristaId = data.motorista_id !== undefined ? data.motorista_id : existing.motorista_id;
    if (data.motorista_nome && data.motorista_nome.trim()) {
      const motNome = data.motorista_nome.trim();
      const existingMot = db.prepare('SELECT id FROM motoristas WHERE nome = ? COLLATE NOCASE AND empresa_id = ?').get(motNome, empresaId);
      if (existingMot) {
        motoristaId = existingMot.id;
      }
    }

    // Auto-vincular cliente 1
    let clienteId = data.cliente_id !== undefined ? data.cliente_id : existing.cliente_id;
    if (data.cliente_nome && data.cliente_nome.trim()) {
      const cliNome = data.cliente_nome.trim();
      const existingCli = db.prepare('SELECT id FROM clientes WHERE (razao_social = ? COLLATE NOCASE OR nome_fantasia = ? COLLATE NOCASE) AND empresa_id = ?').get(cliNome, cliNome, empresaId);
      if (existingCli) {
        clienteId = existingCli.id;
      }
    }

    // Auto-vincular cliente 2 se triangular
    let clienteId2 = data.cliente_id_2 !== undefined ? data.cliente_id_2 : existing.cliente_id_2;
    if (data.cliente_nome_2 && data.cliente_nome_2.trim()) {
      const cliNome2 = data.cliente_nome_2.trim();
      const existingCli2 = db.prepare('SELECT id FROM clientes WHERE (razao_social = ? COLLATE NOCASE OR nome_fantasia = ? COLLATE NOCASE) AND empresa_id = ?').get(cliNome2, cliNome2, empresaId);
      if (existingCli2) {
        clienteId2 = existingCli2.id;
      }
    }

    db.prepare(`
      UPDATE fretes SET
        tipo_operacao = ?,
        numero_cte = ?,
        serie_cte = ?,
        chave_cte = ?,
        data_emissao = ?,
        cliente_id = ?,
        cliente_nome = ?,
        motorista_id = ?,
        motorista_nome = ?,
        origem_cidade = ?,
        origem_uf = ?,
        destino_cidade = ?,
        destino_uf = ?,
        placa_veiculo = ?,
        placa_carreta = ?,
        tipo_carga = ?,
        peso_kg = ?,
        valor_mercadoria = ?,
        nfe_referencia = ?,
        nfe_chave = ?,
        tarifa_tipo_venda = ?,
        tarifa_valor_venda = ?,
        numero_cte_2 = ?,
        serie_cte_2 = ?,
        chave_cte_2 = ?,
        cliente_id_2 = ?,
        cliente_nome_2 = ?,
        cliente_cnpj_2 = ?,
        tipo_carga_2 = ?,
        peso_kg_2 = ?,
        nfe_referencia_2 = ?,
        nfe_chave_2 = ?,
        tarifa_tipo_venda_2 = ?,
        tarifa_valor_venda_2 = ?,
        valor_frete_venda_2 = ?,
        status_recebimento_cliente_2 = ?,
        data_vencimento_cliente_2 = ?,
        tarifa_tipo_compra = ?,
        tarifa_valor_compra = ?,
        valor_frete_real = ?,
        percentual_comissao = ?,
        valor_repasse = ?,
        status_repasse = COALESCE(?, status_repasse, 'pendente'),
        data_repasse = ?,
        comprovante_repasse = ?,
        favorecido_freteiro_nome = ?,
        destinatario_comissao_nome = ?,
        destinatario_comissao_doc = ?,
        status_comissao = COALESCE(?, status_comissao, 'pendente'),
        data_comissao_paga = ?,
        comprovante_comissao = ?,
        destinatario_repasse_nome = ?,
        destinatario_repasse_doc = ?,
        valor_frete_venda = ?,
        valor_frete_compra = ?,
        valor_comissao = ?,
        percentual_margem = ?,
        percentual_adiantamento = ?,
        valor_adiantamento = ?,
        valor_pedagio = ?,
        valor_combustivel = ?,
        outros_descontos = ?,
        valor_acrescimos = ?,
        valor_saldo_motorista = ?,
        status_frete = ?,
        status_pagamento_motorista = ?,
        status_recebimento_cliente = ?,
        data_previsao_entrega = ?,
        data_entrega = ?,
        data_vencimento_cliente = ?,
        observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)
    `).run(
      data.tipo_operacao || existing.tipo_operacao || 'padrao',
      data.numero_cte ? String(data.numero_cte) : (data.numero_cte === '' ? null : existing.numero_cte),
      data.serie_cte ? String(data.serie_cte) : (data.serie_cte === '' ? '1' : existing.serie_cte),
      data.chave_cte ? String(data.chave_cte).trim() : (data.chave_cte === '' ? null : existing.chave_cte),
      data.data_emissao || existing.data_emissao,
      clienteId,
      data.cliente_nome ? String(data.cliente_nome).trim() : existing.cliente_nome,
      motoristaId,
      data.motorista_nome ? String(data.motorista_nome).trim() : existing.motorista_nome,
      data.origem_cidade ? String(data.origem_cidade).trim() : existing.origem_cidade,
      data.origem_uf ? String(data.origem_uf).trim().toUpperCase() : existing.origem_uf,
      data.destino_cidade ? String(data.destino_cidade).trim() : existing.destino_cidade,
      data.destino_uf ? String(data.destino_uf).trim().toUpperCase() : existing.destino_uf,
      data.placa_veiculo !== undefined ? data.placa_veiculo.trim().toUpperCase() : existing.placa_veiculo,
      data.placa_carreta !== undefined ? data.placa_carreta.trim().toUpperCase() : existing.placa_carreta,
      data.tipo_carga !== undefined ? data.tipo_carga : existing.tipo_carga,
      data.peso_kg !== undefined ? parseFloat(data.peso_kg || 0) : existing.peso_kg,
      data.valor_mercadoria !== undefined ? parseFloat(data.valor_mercadoria || 0) : existing.valor_mercadoria,
      data.nfe_referencia !== undefined ? data.nfe_referencia : existing.nfe_referencia,
      data.nfe_chave !== undefined ? data.nfe_chave : existing.nfe_chave,
      calc.tarifaTipo1,
      calc.tarifaValor1,

      // CT-e 2
      data.numero_cte_2 !== undefined ? (data.numero_cte_2 ? String(data.numero_cte_2) : null) : existing.numero_cte_2,
      data.serie_cte_2 !== undefined ? (data.serie_cte_2 ? String(data.serie_cte_2) : '1') : existing.serie_cte_2,
      data.chave_cte_2 !== undefined ? (data.chave_cte_2 ? String(data.chave_cte_2).trim() : null) : existing.chave_cte_2,
      clienteId2,
      data.cliente_nome_2 !== undefined ? data.cliente_nome_2 : existing.cliente_nome_2,
      data.cliente_cnpj_2 !== undefined ? data.cliente_cnpj_2 : existing.cliente_cnpj_2,
      data.tipo_carga_2 !== undefined ? data.tipo_carga_2 : existing.tipo_carga_2,
      data.peso_kg_2 !== undefined ? parseFloat(data.peso_kg_2 || 0) : existing.peso_kg_2,
      data.nfe_referencia_2 !== undefined ? data.nfe_referencia_2 : existing.nfe_referencia_2,
      data.nfe_chave_2 !== undefined ? data.nfe_chave_2 : existing.nfe_chave_2,
      calc.tarifaTipo2,
      calc.tarifaValor2,
      calc.venda2,
      data.status_recebimento_cliente_2 || existing.status_recebimento_cliente_2 || 'pendente',
      data.data_vencimento_cliente_2 !== undefined ? data.data_vencimento_cliente_2 : existing.data_vencimento_cliente_2,

      calc.tarifaTipoCompra,
      calc.tarifaValorCompra,

      calc.valorFreteReal,
      calc.percentualComissao,
      calc.valorRepasse,
      data.status_repasse || existing.status_repasse || 'pendente',
      data.data_repasse !== undefined ? data.data_repasse : existing.data_repasse,
      data.comprovante_repasse !== undefined ? data.comprovante_repasse : existing.comprovante_repasse,

      // Destinação de Pagamentos (Rateio Freteiro, Comissão e Repasse)
      data.favorecido_freteiro_nome !== undefined ? (data.favorecido_freteiro_nome ? data.favorecido_freteiro_nome.trim() : null) : existing.favorecido_freteiro_nome,
      data.destinatario_comissao_nome !== undefined ? (data.destinatario_comissao_nome ? data.destinatario_comissao_nome.trim() : null) : existing.destinatario_comissao_nome,
      data.destinatario_comissao_doc !== undefined ? data.destinatario_comissao_doc : existing.destinatario_comissao_doc,
      data.status_comissao || existing.status_comissao || 'pendente',
      data.data_comissao_paga !== undefined ? data.data_comissao_paga : existing.data_comissao_paga,
      data.comprovante_comissao !== undefined ? data.comprovante_comissao : existing.comprovante_comissao,
      data.destinatario_repasse_nome !== undefined ? (data.destinatario_repasse_nome ? data.destinatario_repasse_nome.trim() : null) : existing.destinatario_repasse_nome,
      data.destinatario_repasse_doc !== undefined ? data.destinatario_repasse_doc : existing.destinatario_repasse_doc,

      calc.venda1,
      calc.compra,
      calc.comissao,
      calc.margem,
      calc.percentualAdiantamento,
      calc.adiantamento,
      calc.pedagio,
      calc.combustivel,
      calc.outrosDesc,
      calc.acrescimos,
      calc.saldo,
      data.status_frete || existing.status_frete,
      data.status_pagamento_motorista || existing.status_pagamento_motorista,
      data.status_recebimento_cliente || existing.status_recebimento_cliente,
      data.data_previsao_entrega !== undefined ? data.data_previsao_entrega : existing.data_previsao_entrega,
      data.data_entrega !== undefined ? data.data_entrega : existing.data_entrega,
      data.data_vencimento_cliente !== undefined ? data.data_vencimento_cliente : existing.data_vencimento_cliente,
      data.observacoes !== undefined ? data.observacoes : existing.observacoes,
      id,
      empIdNum,
      empIdStr
    );

    const updated = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(id, empIdNum, empIdStr);

    return res.json({
      message: 'Frete atualizado com sucesso!',
      frete: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar frete:', error);
    return res.status(500).json({ error: 'Erro ao atualizar frete: ' + error.message });
  }
};

const deleteFrete = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    db.prepare('DELETE FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').run(id, empIdNum, empIdStr);
    return res.json({ message: 'Frete excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir frete.' });
  }
};

module.exports = {
  listFretes,
  getFreteById,
  createFrete,
  updateFrete,
  deleteFrete,
};
