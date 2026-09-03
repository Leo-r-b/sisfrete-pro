const db = require('../config/database');

// 1. Relatório Consolidado de Motoristas / Freteiros
const getRelatorioMotoristas = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { search, data_inicio, data_fim, status_pagamento } = req.query;

    let query = `
      SELECT 
        f.motorista_nome,
        MAX(f.motorista_id) as motorista_id,
        MAX(m.telefone) as motorista_telefone,
        MAX(m.pix_chave) as pix_chave,
        MAX(m.pix_tipo) as pix_tipo,
        MAX(f.placa_veiculo) as placa_veiculo,
        MAX(f.placa_carreta) as placa_carreta,
        COUNT(f.id) as total_viagens,
        COALESCE(SUM(f.peso_kg), 0) / 1000.0 as total_peso_ton,
        COALESCE(SUM(CASE WHEN f.valor_frete_real > 0 THEN f.valor_frete_real ELSE COALESCE(f.valor_frete_compra, 0) END), 0) as total_frete_contratado,
        COALESCE(SUM(f.valor_adiantamento), 0) as total_adiantamentos_previstos,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id)
        ), 0) as total_efetivamente_pago
      FROM fretes f
      LEFT JOIN motoristas m ON f.motorista_id = m.id
      WHERE f.status_frete != 'cancelado' AND f.empresa_id = ?
    `;

    const params = [empresaId];

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (f.motorista_nome LIKE ? OR f.placa_veiculo LIKE ? OR m.pix_chave LIKE ?)`;
      params.push(term, term, term);
    }

    if (data_inicio) {
      query += ` AND f.data_emissao >= ?`;
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ` AND f.data_emissao <= ?`;
      params.push(data_fim);
    }

    query += ` GROUP BY f.motorista_nome`;

    const motoristasRaw = db.prepare(query).all(...params);

    // Calcular o saldo devedor real e os status dinamicamente
    let motoristas = motoristasRaw.map((m) => {
      const contratado = Number((m.total_frete_contratado || 0).toFixed(2));
      const pago = Number((m.total_efetivamente_pago || 0).toFixed(2));
      const saldo = Math.max(0, Number((contratado - pago).toFixed(2)));

      return {
        ...m,
        total_frete_contratado: contratado,
        total_efetivamente_pago: pago,
        total_saldo_devedor: saldo,
        viagens_quitadas: saldo <= 0.01 ? m.total_viagens : 0,
        viagens_em_aberto: saldo > 0.01 ? m.total_viagens : 0,
      };
    });

    if (status_pagamento === 'pendente') {
      motoristas = motoristas.filter((m) => m.total_saldo_devedor > 0.01);
    } else if (status_pagamento === 'quitado') {
      motoristas = motoristas.filter((m) => m.total_saldo_devedor <= 0.01);
    }

    motoristas.sort((a, b) => b.total_saldo_devedor - a.total_saldo_devedor || b.total_viagens - a.total_viagens);

    // Totais do Relatório
    const totais = motoristas.reduce(
      (acc, m) => {
        acc.total_viagens += Number(m.total_viagens || 0);
        acc.total_peso_ton += Number(m.total_peso_ton || 0);
        acc.total_frete_contratado += Number(m.total_frete_contratado || 0);
        acc.total_efetivamente_pago += Number(m.total_efetivamente_pago || 0);
        acc.total_saldo_devedor += Number(m.total_saldo_devedor || 0);
        acc.viagens_quitadas += Number(m.viagens_quitadas || 0);
        acc.viagens_em_aberto += Number(m.viagens_em_aberto || 0);
        return acc;
      },
      {
        total_motoristas: motoristas.length,
        total_viagens: 0,
        total_peso_ton: 0,
        total_frete_contratado: 0,
        total_efetivamente_pago: 0,
        total_saldo_devedor: 0,
        viagens_quitadas: 0,
        viagens_em_aberto: 0,
      }
    );

    return res.json({
      totais: {
        ...totais,
        total_peso_ton: Number(totais.total_peso_ton.toFixed(2)),
        total_frete_contratado: Number(totais.total_frete_contratado.toFixed(2)),
        total_efetivamente_pago: Number(totais.total_efetivamente_pago.toFixed(2)),
        total_saldo_devedor: Number(totais.total_saldo_devedor.toFixed(2)),
      },
      motoristas,
    });
  } catch (error) {
    console.error('Erro no relatório de motoristas:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de motoristas: ' + error.message });
  }
};

// 2. Extrato Analítico de um Motorista Específico (com Histórico e Detalhes)
const getExtratoMotorista = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { motorista_nome } = req.query;

    if (!motorista_nome) {
      return res.status(400).json({ error: 'Nome do motorista é obrigatório.' });
    }

    const fretesRaw = db.prepare(`
      SELECT 
        f.*,
        (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_ja_pago
      FROM fretes f
      WHERE f.motorista_nome = ? AND f.status_frete != 'cancelado' AND f.empresa_id = ?
      ORDER BY f.data_emissao DESC, f.id DESC
    `).all(motorista_nome.trim(), empresaId);

    if (fretesRaw.length === 0) {
      return res.status(404).json({ error: 'Nenhum frete encontrado para este motorista.' });
    }

    const motoristaInfo = db.prepare(`
      SELECT * FROM motoristas WHERE nome = ? COLLATE NOCASE AND empresa_id = ? LIMIT 1
    `).get(motorista_nome.trim(), empresaId) || {
      nome: motorista_nome,
      telefone: fretesRaw[0].motorista_telefone || null,
      pix_chave: fretesRaw[0].pix_chave || null,
      placa_cavalo: fretesRaw[0].placa_veiculo || null,
      placa_carreta: fretesRaw[0].placa_carreta || null,
    };

    // Buscar histórico de todos os pagamentos deste motorista
    const freteIds = fretesRaw.map((f) => f.id);
    let pagamentos = [];
    if (freteIds.length > 0) {
      const placeholders = freteIds.map(() => '?').join(',');
      pagamentos = db.prepare(`
        SELECT h.*, f.numero_cte, f.origem_cidade, f.destino_cidade
        FROM adiantamentos_historico h
        JOIN fretes f ON h.frete_id = f.id
        WHERE h.frete_id IN (${placeholders})
        ORDER BY h.data_pagamento DESC, h.id DESC
      `).all(...freteIds);
    }

    // Recalcular rigorosamente cada frete individual
    const fretes = fretesRaw.map((f) => {
      const contratado = Number((f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0)).toFixed(2));
      const pago = Number((f.total_ja_pago || 0).toFixed(2));
      const saldo = Math.max(0, Number((contratado - pago).toFixed(2)));
      let status = 'pendente';
      if (saldo <= 0.01) {
        status = 'quitado';
      } else if (pago > 0) {
        status = (Math.abs(pago - (f.valor_adiantamento || 0)) < 1) ? 'adiantamento_pago' : 'parcial';
      }

      return {
        ...f,
        valor_frete_compra: contratado,
        total_ja_pago: pago,
        valor_saldo_motorista: saldo,
        status_pagamento_motorista: status,
      };
    });

    // Totais consolidados rigorosamente calculados
    const totalContratado = fretes.reduce((acc, f) => acc + f.valor_frete_compra, 0);
    const totalPago = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
    const totalSaldoDevedor = Math.max(0, Number((totalContratado - totalPago).toFixed(2)));
    const totalToneladas = fretes.reduce((acc, f) => acc + ((f.peso_kg || 0) / 1000), 0);

    return res.json({
      motorista: motoristaInfo,
      resumo: {
        total_viagens: fretes.length,
        total_toneladas: Number(totalToneladas.toFixed(2)),
        total_contratado: Number(totalContratado.toFixed(2)),
        total_pago: Number(totalPago.toFixed(2)),
        saldo_devedor: Number(totalSaldoDevedor.toFixed(2)),
        status_geral: totalSaldoDevedor <= 0.01 ? 'Quitado' : (totalPago > 0 ? 'Parcialmente Pago' : 'Pendente'),
      },
      fretes,
      pagamentos,
    });
  } catch (error) {
    console.error('Erro no extrato do motorista:', error);
    return res.status(500).json({ error: 'Erro ao gerar extrato do motorista: ' + error.message });
  }
};

// 3. Relatório Consolidado de Clientes / Tomadores / Fornecedores
const getRelatorioClientes = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { search, data_inicio, data_fim } = req.query;

    let query = `
      SELECT 
        f.id, f.tipo_operacao, f.numero_cte, f.numero_cte_2, f.data_emissao,
        f.cliente_id, f.cliente_nome, f.cliente_id_2, f.cliente_nome_2,
        f.motorista_nome, f.placa_veiculo, f.placa_carreta,
        f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
        f.tipo_carga, f.tipo_carga_2, f.peso_kg, f.peso_kg_2,
        f.nfe_referencia, f.nfe_referencia_2,
        f.valor_frete_venda, f.valor_frete_venda_2, f.valor_frete_compra, f.valor_comissao,
        f.status_recebimento_cliente, f.status_recebimento_cliente_2,
        f.data_vencimento_cliente, f.data_vencimento_cliente_2,
        f.status_frete
      FROM fretes f
      WHERE f.status_frete != 'cancelado' AND f.empresa_id = ?
    `;

    const params = [empresaId];
    if (data_inicio) {
      query += ` AND f.data_emissao >= ?`;
      params.push(data_inicio);
    }
    if (data_fim) {
      query += ` AND f.data_emissao <= ?`;
      params.push(data_fim);
    }

    query += ` ORDER BY f.data_emissao DESC`;

    const fretes = db.prepare(query).all(...params);

    // Agrupar por Cliente / Tomador
    const mapaClientes = {};

    for (const f of fretes) {
      const isTriangular = f.tipo_operacao === 'triangular' || !!f.numero_cte_2;
      const nome1 = (f.cliente_nome || 'Não Informado').trim();
      const nome2 = f.cliente_nome_2 ? f.cliente_nome_2.trim() : null;

      const nomesEnvolvidos = [nome1];
      if (isTriangular && nome2 && nome2 !== nome1) {
        nomesEnvolvidos.push(nome2);
      }

      for (const clienteNome of nomesEnvolvidos) {
        if (!mapaClientes[clienteNome]) {
          mapaClientes[clienteNome] = {
            cliente_nome: clienteNome,
            total_ctes: 0,
            total_triangulares: 0,
            total_peso_ton: 0,
            total_faturamento: 0,
            total_recebido: 0,
            total_a_receber: 0,
            total_comissao_estimada: 0,
            rotas: new Set(),
            destinos_finais: new Set(),
            cargas: [],
          };
        }

        const isTomador1 = (clienteNome === nome1);
        const valorFaturadoCliente = isTriangular 
          ? (isTomador1 ? Number(f.valor_frete_venda || 0) : Number(f.valor_frete_venda_2 || 0))
          : Number(f.valor_frete_venda || 0);

        const statusRecebimento = isTriangular
          ? (isTomador1 ? f.status_recebimento_cliente : f.status_recebimento_cliente_2)
          : f.status_recebimento_cliente;

        const pesoFisicoTon = isTriangular
          ? (isTomador1 ? Number(((f.peso_kg || 0) / 1000).toFixed(2)) : Number(((f.peso_kg_2 || f.peso_kg || 0) / 1000).toFixed(2)))
          : Number(((f.peso_kg || 0) / 1000).toFixed(2));

        mapaClientes[clienteNome].total_ctes += 1;
        if (isTriangular) mapaClientes[clienteNome].total_triangulares += 1;
        mapaClientes[clienteNome].total_peso_ton += pesoFisicoTon;
        mapaClientes[clienteNome].total_faturamento += valorFaturadoCliente;

        if (statusRecebimento === 'recebido') {
          mapaClientes[clienteNome].total_recebido += valorFaturadoCliente;
        } else {
          mapaClientes[clienteNome].total_a_receber += valorFaturadoCliente;
        }

        mapaClientes[clienteNome].total_comissao_estimada += isTriangular ? (f.valor_comissao || 0) / 2 : (f.valor_comissao || 0);
        mapaClientes[clienteNome].rotas.add(`${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf}`);
        if (nome2 && nome2 !== clienteNome) mapaClientes[clienteNome].destinos_finais.add(nome2);
        if (nome1 && nome1 !== clienteNome) mapaClientes[clienteNome].destinos_finais.add(nome1);

        // Estrutura unificada de Carga / Operação
        mapaClientes[clienteNome].cargas.push({
          frete_id: f.id,
          data_emissao: f.data_emissao,
          motorista_nome: f.motorista_nome,
          placa_veiculo: f.placa_veiculo || 'N/I',
          placa_carreta: f.placa_carreta || null,
          is_triangular: isTriangular,
          papel_cliente: isTriangular ? (isTomador1 ? 'Tomador 1 (Remessa)' : 'Tomador 2 (Venda)') : 'Tomador Único',
          etapa1: {
            numero_cte: f.numero_cte,
            nfe_ref: f.nfe_referencia,
            tomador: nome1,
            trajeto: `${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf}`,
            peso_ton: Number(((f.peso_kg || 0) / 1000).toFixed(2)),
            valor_venda: Number(f.valor_frete_venda || 0),
            status: f.status_recebimento_cliente || 'pendente',
            data_vencimento: f.data_vencimento_cliente || null,
          },
          etapa2: isTriangular ? {
            numero_cte: f.numero_cte_2 || f.numero_cte,
            nfe_ref: f.nfe_referencia_2 || f.nfe_referencia,
            tomador: nome2 || nome1,
            trajeto: `${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf}`,
            peso_ton: Number(((f.peso_kg_2 || f.peso_kg || 0) / 1000).toFixed(2)),
            valor_venda: Number(f.valor_frete_venda_2 || 0),
            status: f.status_recebimento_cliente_2 || f.status_recebimento_cliente || 'pendente',
            data_vencimento: f.data_vencimento_cliente_2 || null,
          } : null,
          subtotal_carga: isTriangular 
            ? Number(((f.valor_frete_venda || 0) + (f.valor_frete_venda_2 || 0)).toFixed(2))
            : Number((f.valor_frete_venda || 0).toFixed(2)),
          valor_faturado_deste_cliente: valorFaturadoCliente,
        });
      }
    }

    let lista = Object.values(mapaClientes).map((c) => {
      const fat = Number(c.total_faturamento.toFixed(2));
      const rec = Number(c.total_recebido.toFixed(2));
      const aRec = Math.max(0, Number((fat - rec).toFixed(2)));

      return {
        cliente_nome: c.cliente_nome,
        total_ctes: c.total_ctes,
        total_triangulares: c.total_triangulares,
        total_peso_ton: Number(c.total_peso_ton.toFixed(2)),
        total_faturamento: fat,
        total_recebido: rec,
        total_a_receber: aRec,
        total_comissao_estimada: Number(c.total_comissao_estimada.toFixed(2)),
        margem_percentual: fat > 0 ? Number(((c.total_comissao_estimada / fat) * 100).toFixed(1)) : 0,
        rotas_principais: Array.from(c.rotas).slice(0, 3),
        parceiros_vinculados: Array.from(c.destinos_finais),
        cargas: c.cargas,
        operacoes: c.cargas,
      };
    });

    if (search) {
      const term = search.trim().toLowerCase();
      lista = lista.filter((c) => c.cliente_nome.toLowerCase().includes(term));
    }

    lista.sort((a, b) => b.total_faturamento - a.total_faturamento);

    const totais = lista.reduce(
      (acc, c) => {
        acc.total_ctes += c.total_ctes;
        acc.total_triangulares += c.total_triangulares;
        acc.total_peso_ton += c.total_peso_ton;
        acc.total_faturamento += c.total_faturamento;
        acc.total_recebido += c.total_recebido;
        acc.total_a_receber += c.total_a_receber;
        acc.total_comissao += c.total_comissao_estimada;
        return acc;
      },
      {
        total_clientes: lista.length,
        total_ctes: 0,
        total_triangulares: 0,
        total_peso_ton: 0,
        total_faturamento: 0,
        total_recebido: 0,
        total_a_receber: 0,
        total_comissao: 0,
      }
    );

    return res.json({
      totais: {
        ...totais,
        total_peso_ton: Number(totais.total_peso_ton.toFixed(2)),
        total_faturamento: Number(totais.total_faturamento.toFixed(2)),
        total_recebido: Number(totais.total_recebido.toFixed(2)),
        total_a_receber: Number(totais.total_a_receber.toFixed(2)),
        total_comissao: Number(totais.total_comissao.toFixed(2)),
      },
      clientes: lista,
    });
  } catch (error) {
    console.error('Erro no relatório de clientes:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de clientes: ' + error.message });
  }
};

// 4. Relatório Geral Financeiro & Lucratividade Analítica
const getRelatorioFinanceiro = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { tipo = 'geral', data_inicio, data_fim, status_pagamento, status_recebimento } = req.query;

    let query = `
      SELECT 
        f.*,
        (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_ja_pago,
        m.pix_chave, m.telefone as motorista_telefone
      FROM fretes f
      LEFT JOIN motoristas m ON f.motorista_id = m.id
      WHERE f.status_frete != 'cancelado' AND f.empresa_id = ?
    `;

    const params = [empresaId];

    if (data_inicio) {
      query += ` AND f.data_emissao >= ?`;
      params.push(data_inicio);
    }
    if (data_fim) {
      query += ` AND f.data_emissao <= ?`;
      params.push(data_fim);
    }
    if (status_pagamento) {
      query += ` AND f.status_pagamento_motorista = ?`;
      params.push(status_pagamento);
    }
    if (status_recebimento) {
      query += ` AND f.status_recebimento_cliente = ?`;
      params.push(status_recebimento);
    }

    query += ` ORDER BY f.data_emissao DESC, f.id DESC`;

    const fretesRaw = db.prepare(query).all(...params);

    const fretes = fretesRaw.map((f) => {
      const contratado = Number((f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0)).toFixed(2));
      const pago = Number((f.total_ja_pago || 0).toFixed(2));
      const saldo = Math.max(0, Number((contratado - pago).toFixed(2)));
      let status = 'pendente';
      if (saldo <= 0.01) {
        status = 'quitado';
      } else if (pago > 0) {
        status = (Math.abs(pago - (f.valor_adiantamento || 0)) < 1) ? 'adiantamento_pago' : 'parcial';
      }

      return {
        ...f,
        valor_frete_compra: contratado,
        total_ja_pago: pago,
        valor_saldo_motorista: saldo,
        status_pagamento_motorista: status,
      };
    });

    const totais = fretes.reduce(
      (acc, f) => {
        const vendaTotal = Number(f.valor_frete_venda || 0) + (f.tipo_operacao === 'triangular' ? Number(f.valor_frete_venda_2 || 0) : 0);
        const compra = Number(f.valor_frete_compra || 0);
        const lucro = Number(f.valor_comissao || 0);
        const saldoDevido = Number(f.valor_saldo_motorista || 0);
        const pago = Number(f.total_ja_pago || 0);

        acc.total_venda += vendaTotal;
        acc.total_compra += compra;
        acc.total_lucro += lucro;
        acc.total_pago_motoristas += pago;
        acc.total_saldo_pendente_motoristas += saldoDevido;

        if (f.status_recebimento_cliente === 'recebido') {
          acc.total_recebido += Number(f.valor_frete_venda || 0);
        } else {
          acc.total_a_receber += Number(f.valor_frete_venda || 0);
        }

        if (f.tipo_operacao === 'triangular') {
          if (f.status_recebimento_cliente_2 === 'recebido') {
            acc.total_recebido += Number(f.valor_frete_venda_2 || 0);
          } else {
            acc.total_a_receber += Number(f.valor_frete_venda_2 || 0);
          }
        }

        return acc;
      },
      {
        total_fretes: fretes.length,
        total_venda: 0,
        total_compra: 0,
        total_lucro: 0,
        total_pago_motoristas: 0,
        total_saldo_pendente_motoristas: 0,
        total_recebido: 0,
        total_a_receber: 0,
      }
    );

    const margemGeral = totais.total_venda > 0 ? ((totais.total_lucro / totais.total_venda) * 100).toFixed(1) : 0;

    return res.json({
      resumo: {
        ...totais,
        total_venda: Number(totais.total_venda.toFixed(2)),
        total_compra: Number(totais.total_compra.toFixed(2)),
        total_lucro: Number(totais.total_lucro.toFixed(2)),
        total_pago_motoristas: Number(totais.total_pago_motoristas.toFixed(2)),
        total_saldo_pendente_motoristas: Number(totais.total_saldo_pendente_motoristas.toFixed(2)),
        total_recebido: Number(totais.total_recebido.toFixed(2)),
        total_a_receber: Number(totais.total_a_receber.toFixed(2)),
        margem_media_percentual: Number(margemGeral),
      },
      fretes,
    });
  } catch (error) {
    console.error('Erro no relatório financeiro:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório financeiro: ' + error.message });
  }
};

// 5. Relatório Detalhado de Comissões de Agenciamento & Repasses a Freteiros
const getRelatorioRepassesComissoes = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { search, data_inicio, data_fim, status_repasse } = req.query;

    let query = `
      SELECT 
        f.*,
        (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_adiantamento_pago,
        m.pix_chave, m.pix_tipo, m.telefone as motorista_telefone, m.cpf_cnpj as motorista_cpf
      FROM fretes f
      LEFT JOIN motoristas m ON f.motorista_id = m.id
      WHERE f.status_frete != 'cancelado' AND f.empresa_id = ?
    `;

    const params = [empresaId];

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (f.motorista_nome LIKE ? OR f.placa_veiculo LIKE ? OR f.cliente_nome LIKE ? OR f.numero_cte LIKE ?)`;
      params.push(term, term, term, term);
    }
    if (data_inicio) {
      query += ` AND f.data_emissao >= ?`;
      params.push(data_inicio);
    }
    if (data_fim) {
      query += ` AND f.data_emissao <= ?`;
      params.push(data_fim);
    }
    if (status_repasse) {
      query += ` AND f.status_repasse = ?`;
      params.push(status_repasse);
    }

    query += ` ORDER BY f.data_emissao DESC, f.id DESC`;

    const fretesRaw = db.prepare(query).all(...params);

    const fretes = fretesRaw.map((f) => {
      const isTriangular = Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0 || f.tipo_operacao === 'triangular');
      const v1 = Number(f.valor_frete_venda || 0);
      const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
      const totalCtes = Number((v1 + v2).toFixed(2));
      const valorBruto = totalCtes > 0 ? totalCtes : Number((f.valor_frete_real || f.valor_frete_compra || 0).toFixed(2));
      
      const isGestao = f.tipo_operacao === 'gestao_pagamentos';
      const pctComissao = isGestao ? 0 : Number(f.percentual_comissao !== undefined && f.percentual_comissao !== '' ? f.percentual_comissao : 0);

      let valorComissao = 0;
      if (isGestao) {
        valorComissao = Number(f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '' ? f.valor_comissao : 0);
      } else if (f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '') {
        valorComissao = Number(f.valor_comissao);
      } else if (f.tipo_operacao === 'agenciamento_repasse' || Number(f.valor_repasse || 0) > 0) {
        const freteReal = Number(f.valor_frete_real || f.valor_frete_compra || 0);
        valorComissao = Number((freteReal * (pctComissao / 100)).toFixed(2));
      } else {
        valorComissao = 0;
      }

      const freteReal = Number(f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0));
      let valorRepasseBruto = 0;
      if (Number(f.valor_repasse || 0) > 0) {
        valorRepasseBruto = Number(f.valor_repasse);
      } else if (isGestao) {
        valorRepasseBruto = freteReal;
      } else if (f.tipo_operacao === 'agenciamento_repasse') {
        valorRepasseBruto = Math.max(0, Number((totalCtes - freteReal - valorComissao).toFixed(2)));
      } else {
        valorRepasseBruto = freteReal;
      }

      const adiantamentoPago = Number((f.total_adiantamento_pago || 0).toFixed(2));
      const saldoRepasse = Math.max(0, Number((valorRepasseBruto - adiantamentoPago).toFixed(2)));
      const isQuitadoRepasse = f.status_repasse === 'pago' || (valorRepasseBruto > 0 && saldoRepasse <= 0.01);
      const statusFinal = isQuitadoRepasse ? 'pago' : (adiantamentoPago > 0 ? 'adiantado' : 'pendente');

      return {
        ...f,
        is_triangular: isTriangular,
        valor_cte_1: v1,
        valor_cte_2: v2,
        valor_frete_bruto: valorBruto,
        percentual_comissao: pctComissao,
        valor_comissao: valorComissao,
        valor_frete_real_calc: freteReal,
        valor_repasse_total: valorRepasseBruto,
        valor_adiantamento_pago: adiantamentoPago,
        saldo_remanescente_repasse: saldoRepasse,
        status_repasse_calculado: statusFinal,
      };
    });

    const totais = fretes.reduce(
      (acc, f) => {
        acc.total_fretes += 1;
        acc.total_faturamento_bruto += f.valor_frete_bruto;
        acc.total_comissao_agencia += f.valor_comissao;
        acc.total_repasse_devido += f.valor_repasse_total;
        acc.total_adiantamento_pago += f.valor_adiantamento_pago;
        acc.total_saldo_pendente_repasse += f.saldo_remanescente_repasse;
        if (f.status_repasse_calculado === 'pago') {
          acc.total_repasses_quitados += 1;
        } else {
          acc.total_repasses_pendentes += 1;
        }
        return acc;
      },
      {
        total_fretes: 0,
        total_faturamento_bruto: 0,
        total_comissao_agencia: 0,
        total_repasse_devido: 0,
        total_adiantamento_pago: 0,
        total_saldo_pendente_repasse: 0,
        total_repasses_quitados: 0,
        total_repasses_pendentes: 0,
      }
    );

    return res.json({
      totais: {
        ...totais,
        total_faturamento_bruto: Number(totais.total_faturamento_bruto.toFixed(2)),
        total_comissao_agencia: Number(totais.total_comissao_agencia.toFixed(2)),
        total_repasse_devido: Number(totais.total_repasse_devido.toFixed(2)),
        total_adiantamento_pago: Number(totais.total_adiantamento_pago.toFixed(2)),
        total_saldo_pendente_repasse: Number(totais.total_saldo_pendente_repasse.toFixed(2)),
        margem_agenciamento_pct: totais.total_faturamento_bruto > 0 
          ? Number(((totais.total_comissao_agencia / totais.total_faturamento_bruto) * 100).toFixed(2)) 
          : 0,
      },
      fretes,
    });
  } catch (error) {
    console.error('Erro no relatório de repasses e comissões:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de repasses: ' + error.message });
  }
};

// 6. Relatório DRE Operacional por Viagem / CT-e (Margens e Lucro Líquido Real)
const getRelatorioDreOperacional = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { data_inicio, data_fim, search } = req.query;

    let query = `
      SELECT f.*
      FROM fretes f
      WHERE f.status_frete != 'cancelado' AND f.empresa_id = ?
    `;

    const params = [empresaId];

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (f.numero_cte LIKE ? OR f.numero_cte_2 LIKE ? OR f.cliente_nome LIKE ? OR f.cliente_nome_2 LIKE ? OR f.motorista_nome LIKE ? OR f.placa_veiculo LIKE ?)`;
      params.push(term, term, term, term, term, term);
    }
    if (data_inicio) {
      query += ` AND (f.data_emissao >= ? OR (f.data_emissao IS NULL AND substr(f.created_at, 1, 10) >= ?))`;
      params.push(data_inicio, data_inicio);
    }
    if (data_fim) {
      query += ` AND (f.data_emissao <= ? OR (f.data_emissao IS NULL AND substr(f.created_at, 1, 10) <= ?))`;
      params.push(data_fim, data_fim);
    }

    query += ` ORDER BY COALESCE(f.data_emissao, substr(f.created_at, 1, 10)) DESC, f.id DESC`;

    const fretesRaw = db.prepare(query).all(...params);

    const viagens = fretesRaw.map((f) => {
      const isTriangular = f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
      const venda1 = Number(f.valor_frete_venda || 0);
      const venda2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
      const receitaBruta = Number((venda1 + venda2).toFixed(2));
      
      const impostos = Number((f.valor_icms || (receitaBruta * 0.04)).toFixed(2));
      const custoRepasse = Number((f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || (f.valor_repasse || (receitaBruta * 0.95)))).toFixed(2));
      const pedagio = Number((f.valor_pedagio || 0).toFixed(2));
      const combustivel = Number((f.valor_combustivel || 0).toFixed(2));
      const outrosCustos = Number((f.outros_descontos || 0).toFixed(2));
      
      const custoOperacionalTotal = Number((custoRepasse + pedagio + combustivel + outrosCustos).toFixed(2));
      const lucroBruto = Number((receitaBruta - custoOperacionalTotal).toFixed(2));
      const margemLucroPct = receitaBruta > 0 ? Number(((lucroBruto / receitaBruta) * 100).toFixed(1)) : 0;

      return {
        ...f,
        is_triangular: isTriangular,
        data_emissao: f.data_emissao || (f.created_at ? f.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        receita_bruta: receitaBruta,
        impostos,
        custo_repasse: custoRepasse,
        pedagio,
        combustivel,
        custo_operacional_total: custoOperacionalTotal,
        lucro_bruto: lucroBruto,
        margem_lucro_pct: margemLucroPct,
      };
    });

    const totais = viagens.reduce(
      (acc, v) => {
        acc.total_viagens += 1;
        acc.receita_bruta_total += v.receita_bruta;
        acc.impostos_total += v.impostos;
        acc.custo_repasse_total += v.custo_repasse;
        acc.pedagio_total += v.pedagio;
        acc.custo_total += v.custo_operacional_total;
        acc.lucro_liquido_total += v.lucro_bruto;
        return acc;
      },
      {
        total_viagens: 0,
        receita_bruta_total: 0,
        impostos_total: 0,
        custo_repasse_total: 0,
        pedagio_total: 0,
        custo_total: 0,
        lucro_liquido_total: 0,
      }
    );

    return res.json({
      totais: {
        ...totais,
        receita_bruta_total: Number(totais.receita_bruta_total.toFixed(2)),
        impostos_total: Number(totais.impostos_total.toFixed(2)),
        custo_repasse_total: Number(totais.custo_repasse_total.toFixed(2)),
        pedagio_total: Number(totais.pedagio_total.toFixed(2)),
        custo_total: Number(totais.custo_total.toFixed(2)),
        lucro_liquido_total: Number(totais.lucro_liquido_total.toFixed(2)),
        margem_liquida_media_pct: totais.receita_bruta_total > 0 
          ? Number(((totais.lucro_liquido_total / totais.receita_bruta_total) * 100).toFixed(1)) 
          : 0,
      },
      viagens,
    });
  } catch (error) {
    console.error('Erro no relatório DRE operacional:', error);
    return res.status(500).json({ error: 'Erro ao gerar DRE operacional: ' + error.message });
  }
};

// 7. Relatório de Canhotos Digitais & Comprovação de Entrega (POD)
const getRelatorioCanhotosPod = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { status, search } = req.query;
    let query = `SELECT * FROM fretes WHERE status_frete != 'cancelado' AND empresa_id = ?`;
    const params = [empresaId];

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (numero_cte LIKE ? OR cliente_nome LIKE ? OR motorista_nome LIKE ?)`;
      params.push(term, term, term);
    }
    if (status) {
      query += ` AND canhoto_status = ?`;
      params.push(status);
    }

    const fretes = db.prepare(query).all(...params);

    const totais = {
      total_geral: fretes.length,
      aprovados: fretes.filter(f => f.canhoto_status === 'aprovado').length,
      pendentes: fretes.filter(f => !f.canhoto_status || f.canhoto_status === 'pendente').length,
      recusados: fretes.filter(f => f.canhoto_status === 'recusado').length,
    };

    return res.json({ totais, fretes });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório de canhotos.' });
  }
};

// 8. Relatório de Manutenção da Frota
const getRelatorioManutencaoFrota = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { placa, tipo, data_inicio, data_fim } = req.query;

    let query = `SELECT * FROM veiculos_manutencoes WHERE empresa_id = ?`;
    const params = [empresaId];

    if (placa) {
      query += ` AND placa = ?`;
      params.push(placa.toUpperCase());
    }
    if (tipo) {
      query += ` AND tipo = ?`;
      params.push(tipo);
    }
    if (data_inicio) {
      query += ` AND data_manutencao >= ?`;
      params.push(data_inicio);
    }
    if (data_fim) {
      query += ` AND data_manutencao <= ?`;
      params.push(data_fim);
    }

    query += ` ORDER BY data_manutencao DESC, id DESC`;

    const manutencoes = db.prepare(query).all(...params);

    const totais = manutencoes.reduce(
      (acc, m) => {
        acc.total_gasto += Number(m.valor || 0);
        acc.total_manutencoes += 1;
        if (m.tipo === 'preventiva' || m.tipo === 'revisao_geral') acc.total_preventivas += 1;
        else if (m.tipo === 'pneus_freios') acc.total_pneus_freios += 1;
        else acc.total_corretivas += 1;
        return acc;
      },
      {
        total_gasto: 0,
        total_manutencoes: 0,
        total_preventivas: 0,
        total_corretivas: 0,
        total_pneus_freios: 0,
        total_veiculos_atendidos: new Set(manutencoes.map(m => m.placa)).size,
        total_agendadas: 0,
        custo_medio_veiculo: 0,
      }
    );

    totais.custo_medio_veiculo = totais.total_veiculos_atendidos > 0 
      ? Number((totais.total_gasto / totais.total_veiculos_atendidos).toFixed(2)) 
      : 0;

    return res.json({ totais, manutencoes });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório de manutenção: ' + error.message });
  }
};

// 9. Relatório Financeiro Consolidado & Fluxo de Caixa Real
const getRelatorioFinanceiroFluxo = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const { search, data_inicio, data_fim, metodologia = 'todos' } = req.query;

    const empresaObj = db.prepare('SELECT modo_operacao FROM empresas WHERE id = ? OR id = ?').get(empIdNum, empIdStr);
    const isGestaoEmpresa = empresaObj?.modo_operacao === 'gestao_pagamentos';

    let queryFretes = `
      SELECT f.*,
        (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_ja_pago
      FROM fretes f
      WHERE f.status_frete != 'cancelado' AND (f.empresa_id = ? OR f.empresa_id = ?)
    `;
    const paramsFretes = [empIdNum, empIdStr];

    if (data_inicio) {
      queryFretes += ` AND f.data_emissao >= ?`;
      paramsFretes.push(data_inicio);
    }
    if (data_fim) {
      queryFretes += ` AND f.data_emissao <= ?`;
      paramsFretes.push(data_fim);
    }
    if (search) {
      const term = `%${search.trim()}%`;
      queryFretes += ` AND (f.numero_cte LIKE ? OR f.numero_cte_2 LIKE ? OR f.cliente_nome LIKE ? OR f.motorista_nome LIKE ?)`;
      paramsFretes.push(term, term, term, term);
    }

    const fretes = db.prepare(queryFretes).all(...paramsFretes);

    let queryTitulos = `SELECT * FROM financeiro_titulos WHERE (empresa_id = ? OR empresa_id = ?) AND status != 'cancelado'`;
    const paramsTitulos = [empIdNum, empIdStr];
    const titulos = db.prepare(queryTitulos).all(...paramsTitulos);

    let queryManut = `SELECT * FROM veiculos_manutencoes WHERE (empresa_id = ? OR empresa_id = ?) AND status = 'realizada'`;
    const paramsManut = [empIdNum, empIdStr];
    const manutencoes = db.prepare(queryManut).all(...paramsManut);

    const titulosConsolidados = [];

    let faturamentoBrutoFretes = 0;
    let comissaoAgenciamentoTotal = 0;
    let freteRecebidoTotal = 0;
    let freteAReceberTotal = 0;

    let repasseFreteirosDevido = 0;
    let repasseFreteirosPago = 0;
    let repasseFreteirosPendente = 0;

    for (const f of fretes) {
      const isTriangular = f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
      const v1 = Number(f.valor_frete_venda || 0);
      const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
      const vVendaTotal = v1 + v2;
      const dataEmissao = f.data_emissao || (f.created_at ? f.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));

      const isGestao = f.tipo_operacao === 'gestao_pagamentos' || isGestaoEmpresa;
      if (!isGestao) {
        faturamentoBrutoFretes += vVendaTotal;
      }

      let vComissao = 0;
      if (isGestao) {
        vComissao = Number(f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '' ? f.valor_comissao : 0);
      } else if (f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '') {
        vComissao = Number(f.valor_comissao);
      } else {
        vComissao = Number((vVendaTotal * ((f.percentual_comissao || 0) / 100)).toFixed(2));
      }
      comissaoAgenciamentoTotal += vComissao;

      // Em Gestão de Pagamentos, a empresa é TOMADORA/PAGADORA (não gera contas a receber de CT-e de terceiros)
      if (!isGestao) {
        if (v1 > 0) {
          const isRec1 = f.status_recebimento_cliente === 'recebido';
          if (isRec1) freteRecebidoTotal += v1;
          else freteAReceberTotal += v1;

          titulosConsolidados.push({
            id: `frete_rec_${f.id}`,
            tipo: 'receber',
            categoria: 'faturamento_frete',
            descricao: isTriangular ? `CT-e 1 Nº ${f.numero_cte || 'S/N'}` : `CT-e Nº ${f.numero_cte || 'S/N'}`,
            pessoa_nome: f.cliente_nome,
            valor: v1,
            valor_pago: isRec1 ? v1 : 0,
            data_vencimento: dataEmissao,
            status: isRec1 ? 'recebido' : 'pendente'
          });
        }

        if (isTriangular && v2 > 0) {
          const isRec2 = f.status_recebimento_cliente_2 === 'recebido';
          if (isRec2) freteRecebidoTotal += v2;
          else freteAReceberTotal += v2;

          titulosConsolidados.push({
            id: `frete_rec2_${f.id}`,
            tipo: 'receber',
            categoria: 'faturamento_frete',
            descricao: `CT-e 2 Nº ${f.numero_cte_2 || 'S/N'}`,
            pessoa_nome: f.cliente_nome_2 || f.cliente_nome,
            valor: v2,
            valor_pago: isRec2 ? v2 : 0,
            data_vencimento: dataEmissao,
            status: isRec2 ? 'recebido' : 'pendente'
          });
        }
      }

      const freteiroTotal = Number(f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0));
      if (freteiroTotal > 0) {
        const vPago = Number(f.total_ja_pago || 0);
        repasseFreteirosDevido += freteiroTotal;
        repasseFreteirosPago += vPago;
        repasseFreteirosPendente += Math.max(0, freteiroTotal - vPago);

        titulosConsolidados.push({
          id: `frete_pag_${f.id}`,
          tipo: 'pagar',
          categoria: 'frete_motorista',
          descricao: isTriangular && f.numero_cte_2 
            ? `Freteiro CT-e 1 Nº ${f.numero_cte || 'S/N'} + CT-e 2 Nº ${f.numero_cte_2}` 
            : `Freteiro CT-e Nº ${f.numero_cte || 'S/N'}`,
          pessoa_nome: f.favorecido_freteiro_nome || f.motorista_nome || 'Motorista / Freteiro',
          valor: freteiroTotal,
          valor_pago: vPago,
          data_vencimento: dataEmissao,
          status: (f.status_pagamento_motorista === 'quitado' || vPago >= freteiroTotal) ? 'pago' : 'pendente'
        });
      }

      // Repasse Financeiro ao Embarcador / Parceiro
      const repasseVal = Number(f.valor_repasse || 0);
      if (repasseVal > 0) {
        const isRepPago = f.status_repasse === 'pago';
        const vRepPago = isRepPago ? repasseVal : 0;
        repasseFreteirosDevido += repasseVal;
        repasseFreteirosPago += vRepPago;
        repasseFreteirosPendente += isRepPago ? 0 : repasseVal;

        titulosConsolidados.push({
          id: `frete_repasse_${f.id}`,
          tipo: 'pagar',
          categoria: 'repasse_agenciamento',
          descricao: `Repasse Financeiro CT-e Nº ${f.numero_cte || 'S/N'}${f.numero_cte_2 ? ' + Nº ' + f.numero_cte_2 : ''}`,
          pessoa_nome: f.destinatario_repasse_nome || f.cliente_nome || 'Parceiro / Conta de Destino',
          valor: repasseVal,
          valor_pago: vRepPago,
          data_vencimento: dataEmissao,
          status: isRepPago ? 'pago' : 'pendente'
        });
      }

      // Comissão a Pagar (se houver em Gestão de Pagamentos)
      if (vComissao > 0 && (isGestao || f.destinatario_comissao_nome)) {
        const isComPaga = f.status_comissao === 'pago';
        const vComPaga = isComPaga ? vComissao : 0;
        repasseFreteirosDevido += vComissao;
        repasseFreteirosPago += vComPaga;
        repasseFreteirosPendente += isComPaga ? 0 : vComissao;

        titulosConsolidados.push({
          id: `frete_comissao_${f.id}`,
          tipo: 'pagar',
          categoria: 'comissao_agenciamento',
          descricao: `Comissão a Pagar CT-e Nº ${f.numero_cte || 'S/N'}${f.numero_cte_2 ? ' + Nº ' + f.numero_cte_2 : ''}`,
          pessoa_nome: f.destinatario_comissao_nome || 'Agenciador / Fornecedor',
          valor: vComissao,
          valor_pago: vComPaga,
          data_vencimento: dataEmissao,
          status: isComPaga ? 'pago' : 'pendente'
        });
      }
    }

    const categoriasMap = {};
    for (const t of titulos) {
      const vTot = Number(t.valor || 0);
      const vPg = Number(t.valor_pago || 0);
      
      if (t.tipo === 'pagar') {
        const cat = t.categoria_nome || 'Despesas Gerais';
        if (!categoriasMap[cat]) categoriasMap[cat] = { categoria: cat, total: 0, pago: 0 };
        categoriasMap[cat].total += vTot;
        categoriasMap[cat].pago += vPg;
      }
      
      titulosConsolidados.push({ ...t, valor: vTot, valor_pago: vPg });
    }

    let totalGastoManutencao = 0;
    for (const m of manutencoes) totalGastoManutencao += Number(m.valor || 0);

    const isModoAgenciamento = metodologia === 'agenciamento';
    const receitaBase = isGestaoEmpresa ? 0 : (isModoAgenciamento ? comissaoAgenciamentoTotal : faturamentoBrutoFretes);
    const despesasTitulosTotal = Object.values(categoriasMap).reduce((acc, c) => acc + c.total, 0);
    const despesasTitulosPagas = Object.values(categoriasMap).reduce((acc, c) => acc + c.pago, 0);
    const despesasTitulosPendentes = Math.max(0, despesasTitulosTotal - despesasTitulosPagas);

    const custosDiretos = isModoAgenciamento ? 0 : repasseFreteirosDevido;
    const despesaConsolidada = custosDiretos + despesasTitulosTotal + totalGastoManutencao;
    const lucroLiquidoReal = isGestaoEmpresa ? 0 : (receitaBase - despesaConsolidada);
    const margemLiquidaPct = receitaBase > 0 ? Number(((lucroLiquidoReal / receitaBase) * 100).toFixed(2)) : 0;
    
    return res.json({
      metodologia_aplicada: metodologia,
      totais: {
        receita_bruta_total: Number(receitaBase.toFixed(2)),
        faturamento_bruto_fretes: Number(faturamentoBrutoFretes.toFixed(2)),
        comissao_agenciamento_total: Number(comissaoAgenciamentoTotal.toFixed(2)),
        total_recebido_clientes: Number(freteRecebidoTotal.toFixed(2)),
        saldo_a_receber_clientes: Number(freteAReceberTotal.toFixed(2)),
        
        repasse_freteiros_total: Number(repasseFreteirosDevido.toFixed(2)),
        repasse_freteiros_pago: Number(repasseFreteirosPago.toFixed(2)),
        repasse_freteiros_pendente: Number(repasseFreteirosPendente.toFixed(2)),

        despesas_operacionais_fixas_total: Number((despesasTitulosTotal + totalGastoManutencao).toFixed(2)),
        despesas_operacionais_pagas: Number((despesasTitulosPagas + totalGastoManutencao).toFixed(2)),
        despesas_operacionais_pendentes: Number(despesasTitulosPendentes.toFixed(2)),
        
        despesa_total_consolidada: Number(despesaConsolidada.toFixed(2)),
        lucro_liquido_real: Number(lucroLiquidoReal.toFixed(2)),
        margem_liquida_pct: margemLiquidaPct,
      },
      titulos: titulosConsolidados,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório financeiro: ' + error.message });
  }
};

/**
 * 10. Relatório Analítico de Contas Pagas e Baixas Realizadas
 */
const getRelatorioContasPagas = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const { search, data_inicio, data_fim, forma_pagamento, tipo = 'todos' } = req.query;

    let query = `
      SELECT 
        b.id,
        b.data_pagamento,
        b.valor,
        b.forma_pagamento,
        b.comprovante_ref,
        b.observacoes,
        b.tipo_titulo,
        b.tipo_parcela,
        b.created_at,
        t.descricao as titulo_descricao,
        t.pessoa_nome as titulo_pessoa,
        t.categoria_nome as titulo_categoria,
        f.numero_cte,
        f.cliente_nome,
        f.motorista_nome,
        f.favorecido_freteiro_nome,
        f.placa_veiculo,
        f.peso_kg
      FROM financeiro_baixas_historico b
      LEFT JOIN financeiro_titulos t ON b.titulo_id = t.id
      LEFT JOIN fretes f ON b.frete_id = f.id
      WHERE (b.empresa_id = ? OR b.empresa_id = ?)
    `;

    const params = [empIdNum, empIdStr];

    if (tipo !== 'todos') {
      query += ` AND b.tipo_titulo = ?`;
      params.push(tipo);
    }

    if (forma_pagamento && forma_pagamento !== 'todos') {
      query += ` AND b.forma_pagamento = ?`;
      params.push(forma_pagamento);
    }

    if (data_inicio) {
      query += ` AND b.data_pagamento >= ?`;
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ` AND b.data_pagamento <= ?`;
      params.push(data_fim);
    }

    query += ` ORDER BY b.data_pagamento DESC, b.id DESC`;

    const rows = db.prepare(query).all(...params);

    let baixas = rows.map(r => {
      const favorecido = r.titulo_pessoa || r.favorecido_freteiro_nome || r.motorista_nome || r.cliente_nome || '-';
      let descricao = r.titulo_descricao;
      if (!descricao) {
        if (r.tipo_parcela === 'por_fora') {
          descricao = `Frete Por Fora - CT-e Nº ${r.numero_cte || 'S/N'}`;
        } else if (r.tipo_parcela === 'fiscal') {
          descricao = `Frete Fiscal CT-e Nº ${r.numero_cte || 'S/N'}`;
        } else if (r.tipo_parcela === 'repasse') {
          descricao = `Repasse Agenciamento CT-e Nº ${r.numero_cte || 'S/N'}`;
        } else if (r.tipo_parcela === 'comissao') {
          descricao = `Comissão Agenciamento CT-e Nº ${r.numero_cte || 'S/N'}`;
        } else if (r.numero_cte) {
          descricao = `Frete CT-e Nº ${r.numero_cte}`;
        } else {
          descricao = 'Lançamento Operacional';
        }
      }

      return {
        id: r.id,
        data_pagamento: r.data_pagamento,
        valor: Number(r.valor || 0),
        forma_pagamento: r.forma_pagamento || 'PIX',
        comprovante_ref: r.comprovante_ref || '',
        observacoes: r.observacoes || '',
        tipo_titulo: r.tipo_titulo,
        tipo_parcela: r.tipo_parcela,
        descricao,
        favorecido,
        numero_cte: r.numero_cte || '',
        placa_veiculo: r.placa_veiculo || '',
        peso_ton: r.peso_kg ? Number((r.peso_kg / 1000).toFixed(2)) : null
      };
    });

    if (search) {
      const q = search.toLowerCase().trim();
      baixas = baixas.filter(b => 
        b.descricao.toLowerCase().includes(q) ||
        b.favorecido.toLowerCase().includes(q) ||
        b.forma_pagamento.toLowerCase().includes(q) ||
        b.comprovante_ref.toLowerCase().includes(q) ||
        (b.numero_cte && b.numero_cte.toLowerCase().includes(q))
      );
    }

    const totalPago = baixas.filter(b => b.tipo_titulo === 'pagar').reduce((sum, b) => sum + b.valor, 0);
    const totalRecebido = baixas.filter(b => b.tipo_titulo === 'receber').reduce((sum, b) => sum + b.valor, 0);

    return res.json({
      totais: {
        total_pago: Number(totalPago.toFixed(2)),
        total_recebido: Number(totalRecebido.toFixed(2)),
        total_lancamentos: baixas.length,
      },
      baixas
    });
  } catch (error) {
    console.error('Erro getRelatorioContasPagas:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de contas pagas: ' + error.message });
  }
};

/**
 * 11. Relatório Resumo Simplificado de CT-e em Aberto (Por Fornecedor / Transportador)
 * Formato limpo e objetivo para acerto e envio WhatsApp:
 * "CT-e 3898 - Valor CT-e: R$ 1.000,00 | Por fora: R$ 2.320,00 | Valor total: R$ 3.320,00"
 */
const getRelatorioResumoSimplificado = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const { search, fornecedor, status_pagamento = 'aberto', data_inicio, data_fim } = req.query;

    let query = `
      SELECT 
        f.*,
        (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_adiantamento_pago,
        (SELECT COALESCE(SUM(valor), 0) FROM financeiro_baixas_historico WHERE frete_id = f.id AND tipo_titulo = 'pagar') as total_baixas_pagas,
        m.telefone as motorista_telefone,
        m.pix_chave as motorista_pix
      FROM fretes f
      LEFT JOIN motoristas m ON f.motorista_id = m.id
      WHERE (f.empresa_id = ? OR f.empresa_id = ?) AND f.status_frete != 'cancelado'
    `;
    const params = [empIdNum, empIdStr];

    if (data_inicio) {
      query += ` AND f.data_emissao >= ?`;
      params.push(data_inicio);
    }
    if (data_fim) {
      query += ` AND f.data_emissao <= ?`;
      params.push(data_fim);
    }

    query += ` ORDER BY f.data_emissao DESC, f.id DESC`;

    const fretesRaw = db.prepare(query).all(...params);

    const helperFormatMoney = (val) => {
      return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const itens = [];
    const fornecedoresSet = new Set();

    for (const f of fretesRaw) {
      // 1. Identificação Inteligente do Fornecedor / Transportador
      // Se motorista contiver " - ", o fornecedor é a parte após o último " - " (ex: "RENATO SCHENA DE OLIVEIRA - BOBY" -> "BOBY")
      let nomeFornecedor = '';
      if (f.favorecido_freteiro_nome && f.favorecido_freteiro_nome.trim() !== '') {
        nomeFornecedor = f.favorecido_freteiro_nome.trim();
      } else if (f.motorista_nome && f.motorista_nome.includes(' - ')) {
        const partes = f.motorista_nome.split(' - ');
        nomeFornecedor = partes[partes.length - 1].trim();
      } else if (f.motorista_nome) {
        nomeFornecedor = f.motorista_nome.trim();
      } else {
        nomeFornecedor = 'Outros Fornecedores';
      }

      fornecedoresSet.add(nomeFornecedor);

      const isTriangular = Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0 || f.tipo_operacao === 'triangular');
      const v1 = Number(f.valor_frete_venda || 0);
      const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
      const vCteTotal = Number((v1 + v2).toFixed(2));

      const vTotalContratado = Number((f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0)).toFixed(2));
      const vTotalCarga = vTotalContratado > 0 ? vTotalContratado : vCteTotal;
      const vPorFora = Math.max(0, Number((vTotalCarga - vCteTotal).toFixed(2)));

      const vPago = Math.max(Number(f.total_adiantamento_pago || 0), Number(f.total_baixas_pagas || 0));
      const saldoPendente = Math.max(0, Number((vTotalCarga - vPago).toFixed(2)));

      const isQuitado = f.status_pagamento_motorista === 'quitado' || (saldoPendente <= 0.01 && vTotalCarga > 0);
      const isParcial = !isQuitado && vPago > 0;
      const statusFinal = isQuitado ? 'quitado' : (isParcial ? 'parcial' : 'aberto');

      const numCteStr = isTriangular && f.numero_cte_2 
        ? `${f.numero_cte || 'S/N'} + ${f.numero_cte_2}` 
        : (f.numero_cte || 'S/N');

      const textoFormatadoLinha = `*CT-e ${numCteStr}* | Valor Fiscal: ${helperFormatMoney(vCteTotal)} | Por Fora: ${helperFormatMoney(vPorFora)} | *Total: ${helperFormatMoney(vTotalCarga)}*`;
      const textoFormatadoBloco = `*CT-e ${numCteStr}*\nValor Fiscal: ${helperFormatMoney(vCteTotal)}\nPor Fora: ${helperFormatMoney(vPorFora)}\n*Total: ${helperFormatMoney(vTotalCarga)}*`;

      itens.push({
        id: f.id,
        numero_cte: f.numero_cte,
        numero_cte_2: f.numero_cte_2,
        is_triangular: isTriangular,
        data_emissao: f.data_emissao,
        fornecedor: nomeFornecedor,
        motorista_nome: f.motorista_nome,
        placa_veiculo: f.placa_veiculo,
        cliente_nome: f.cliente_nome,
        valor_cte: vCteTotal,
        valor_por_fora: vPorFora,
        valor_total: vTotalCarga,
        valor_pago: vPago,
        saldo_pendente: saldoPendente,
        status: statusFinal,
        texto_formatado: textoFormatadoLinha,
        texto_formatado_bloco: textoFormatadoBloco
      });
    }

    // Filtros em memória
    let filtrados = itens;

    if (fornecedor && fornecedor.trim() !== '' && fornecedor !== 'todos') {
      const termFornec = fornecedor.trim().toLowerCase();
      filtrados = filtrados.filter(i => i.fornecedor.toLowerCase() === termFornec || i.fornecedor.toLowerCase().includes(termFornec));
    }

    if (status_pagamento === 'aberto') {
      filtrados = filtrados.filter(i => i.status !== 'quitado');
    } else if (status_pagamento === 'quitado') {
      filtrados = filtrados.filter(i => i.status === 'quitado');
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtrados = filtrados.filter(i => 
        (i.numero_cte && i.numero_cte.toLowerCase().includes(q)) ||
        (i.fornecedor && i.fornecedor.toLowerCase().includes(q)) ||
        (i.motorista_nome && i.motorista_nome.toLowerCase().includes(q)) ||
        (i.placa_veiculo && i.placa_veiculo.toLowerCase().includes(q))
      );
    }

    // Totais Consolidados
    const totalValorCte = Number(filtrados.reduce((acc, i) => acc + i.valor_cte, 0).toFixed(2));
    const totalPorFora = Number(filtrados.reduce((acc, i) => acc + i.valor_por_fora, 0).toFixed(2));
    const totalGeral = Number(filtrados.reduce((acc, i) => acc + i.valor_total, 0).toFixed(2));
    const totalPago = Number(filtrados.reduce((acc, i) => acc + i.valor_pago, 0).toFixed(2));
    const totalSaldoPendente = Number(filtrados.reduce((acc, i) => acc + i.saldo_pendente, 0).toFixed(2));

    // Montagem do texto WhatsApp consolidado (limpo, organizado, sem emojis e com *negrito*)
    const blocosWhatsApp = filtrados.map(i => i.texto_formatado_bloco).join('\n\n');
    const nomeFornecHeader = fornecedor && fornecedor !== 'todos' ? fornecedor : 'Todos';

    const textoWhatsAppCompleto = 
      `*RESUMO DE CT-ES EM ABERTO*\n` +
      `*Fornecedor:* ${nomeFornecHeader}\n` +
      `----------------------------------------\n\n` +
      `${blocosWhatsApp}\n\n` +
      `----------------------------------------\n` +
      `*TOTALIZADORES (${filtrados.length} CT-es)*\n` +
      `Total Fiscal: ${helperFormatMoney(totalValorCte)}\n` +
      `Total Por Fora: ${helperFormatMoney(totalPorFora)}\n` +
      `*VALOR TOTAL A PAGAR: ${helperFormatMoney(totalGeral)}*\n` +
      `----------------------------------------`;

    return res.json({
      fornecedores: Array.from(fornecedoresSet).sort(),
      totais: {
        total_ctes: filtrados.length,
        total_valor_cte: totalValorCte,
        total_por_fora: totalPorFora,
        total_geral: totalGeral,
        total_pago: totalPago,
        total_saldo_pendente: totalSaldoPendente,
      },
      texto_whatsapp: textoWhatsAppCompleto,
      itens: filtrados
    });
  } catch (error) {
    console.error('Erro getRelatorioResumoSimplificado:', error);
    return res.status(500).json({ error: 'Erro ao gerar resumo simplificado de CT-e: ' + error.message });
  }
};

module.exports = {
  getRelatorioMotoristas,
  getExtratoMotorista,
  getRelatorioClientes,
  getRelatorioFinanceiro,
  getRelatorioRepassesComissoes,
  getRelatorioDreOperacional,
  getRelatorioCanhotosPod,
  getRelatorioManutencaoFrota,
  getRelatorioFinanceiroFluxo,
  getRelatorioContasPagas,
  getRelatorioResumoSimplificado,
};

