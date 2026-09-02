const db = require('../config/database');

const PLANO_CONTAS = {
  despesas: [
    { id: 'frete_motorista', nome: 'Frete de Terceiro / Motorista', grupo: 'Transporte & Operação' },
    { id: 'repasse_agenciamento', nome: 'Repasse ao Embarcador / Parceiro', grupo: 'Transporte & Operação' },
    { id: 'comissao_agenciamento', nome: 'Comissão de Agenciamento a Pagar', grupo: 'Transporte & Operação' },
    { id: 'combustivel', nome: 'Combustível & Postos', grupo: 'Transporte & Operação' },
    { id: 'pedagio', nome: 'Pedágio & Vale-Pedágio', grupo: 'Transporte & Operação' },
    { id: 'manutencao_oficina', nome: 'Manutenção, Peças & Pneus', grupo: 'Transporte & Operação' },
    { id: 'seguro_rastreador', nome: 'Seguro de Carga (RCTR-C) & Rastreadores', grupo: 'Transporte & Operação' },
    { id: 'energia', nome: 'Conta de Energia Elétrica / Luz', grupo: 'Infraestrutura & Administrativo' },
    { id: 'agua', nome: 'Conta de Água & Saneamento', grupo: 'Infraestrutura & Administrativo' },
    { id: 'internet_telefonia', nome: 'Internet, Telefonia & Celular', grupo: 'Infraestrutura & Administrativo' },
    { id: 'aluguel', nome: 'Aluguel de Galpão / Escritório / Pátio', grupo: 'Infraestrutura & Administrativo' },
    { id: 'contador_honorarios', nome: 'Honorários Contábeis & Assessorias', grupo: 'Serviços & Terceirizados' },
    { id: 'salarios_prolabore', nome: 'Salários, Diárias & Pró-labore', grupo: 'Pessoal & Terceiros' },
    { id: 'impostos_taxas', nome: 'Impostos (DAS, ICMS, ANTT, GPS)', grupo: 'Tributos & Taxas' },
    { id: 'despesa_administrativa', nome: 'Despesas Administrativas & Softwares', grupo: 'Infraestrutura & Administrativo' },
    { id: 'outros_pagar', nome: 'Outras Despesas a Pagar', grupo: 'Geral' }
  ],
  receitas: [
    { id: 'faturamento_frete', nome: 'Faturamento de Frete / CT-e', grupo: 'Operacional' },
    { id: 'comissao_agenciamento', nome: 'Comissão de Agenciamento de Fretes', grupo: 'Agenciamento' },
    { id: 'locacao_veiculos', nome: 'Locação de Veículos / Implementos', grupo: 'Serviços' },
    { id: 'outras_receitas', nome: 'Outras Receitas a Receber', grupo: 'Geral' }
  ]
};

const getPlanoContas = (req, res) => {
  return res.json(PLANO_CONTAS);
};

/**
 * Dashboard KPIs Financeiros Integrados (Fretes + Contas Operacionais / Fixas)
 * Agregação matemática exata de CT-e 1, CT-e 2 (Triangular), Freteiros, Repasses e Títulos Avulsos.
 */
const getDashboardKPIs = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);

    // 1. Receitas de Fretes (CT-e 1 e CT-e 2)
    const fretesReceitas = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status_recebimento_cliente = 'recebido' THEN valor_frete_venda ELSE 0 END), 0) as recebidos_1,
        COALESCE(SUM(CASE WHEN status_recebimento_cliente != 'recebido' THEN valor_frete_venda ELSE 0 END), 0) as pendentes_1,
        COALESCE(SUM(CASE WHEN (numero_cte_2 IS NOT NULL OR valor_frete_venda_2 > 0 OR tipo_operacao = 'triangular') AND status_recebimento_cliente_2 = 'recebido' THEN valor_frete_venda_2 ELSE 0 END), 0) as recebidos_2,
        COALESCE(SUM(CASE WHEN (numero_cte_2 IS NOT NULL OR valor_frete_venda_2 > 0 OR tipo_operacao = 'triangular') AND status_recebimento_cliente_2 != 'recebido' THEN valor_frete_venda_2 ELSE 0 END), 0) as pendentes_2
      FROM fretes
      WHERE status_frete != 'cancelado' AND (empresa_id = ? OR empresa_id = ?)
    `).get(empIdNum, empIdStr);

    // 2. Histórico de Pagamentos Realizados para Freteiros
    const pagamentosHistorico = db.prepare(`
      SELECT COALESCE(SUM(a.valor), 0) as total_pago_freteiros
      FROM adiantamentos_historico a
      INNER JOIN fretes f ON a.frete_id = f.id
      WHERE (f.empresa_id = ? OR f.empresa_id = ?) AND f.status_frete != 'cancelado'
    `).get(empIdNum, empIdStr);

    // 3. Despesas de Fretes (Freteiros e Repasses)
    const fretesTotais = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status_pagamento_motorista = 'quitado' THEN (CASE WHEN valor_frete_real > 0 THEN valor_frete_real ELSE COALESCE(valor_frete_compra, 0) END) ELSE 0 END), 0) as freteiro_quitado,
        COALESCE(SUM(CASE 
          WHEN status_pagamento_motorista = 'quitado' THEN 0
          WHEN status_pagamento_motorista = 'adiantamento_pago' THEN (
            CASE 
              WHEN valor_saldo_motorista > 0 THEN valor_saldo_motorista
              ELSE MAX(0, ((CASE WHEN valor_frete_real > 0 THEN valor_frete_real ELSE COALESCE(valor_frete_compra, 0) END) - COALESCE(valor_adiantamento, 0)))
            END
          )
          ELSE (CASE WHEN valor_frete_real > 0 THEN valor_frete_real ELSE COALESCE(valor_frete_compra, 0) END)
        END), 0) as freteiro_pendente,
        COALESCE(SUM(CASE WHEN valor_repasse > 0 AND status_repasse = 'pago' THEN valor_repasse ELSE 0 END), 0) as repasse_pago,
        COALESCE(SUM(CASE WHEN valor_repasse > 0 AND status_repasse != 'pago' THEN valor_repasse ELSE 0 END), 0) as repasse_pendente,
        COALESCE(SUM(CASE WHEN (tipo_operacao = 'gestao_pagamentos' OR destinatario_comissao_nome IS NOT NULL) AND valor_comissao > 0 AND status_comissao = 'pago' THEN valor_comissao ELSE 0 END), 0) as comissao_paga,
        COALESCE(SUM(CASE WHEN (tipo_operacao = 'gestao_pagamentos' OR destinatario_comissao_nome IS NOT NULL) AND valor_comissao > 0 AND status_comissao != 'pago' THEN valor_comissao ELSE 0 END), 0) as comissao_pendente,
        COALESCE(SUM(valor_frete_venda + CASE WHEN (numero_cte_2 IS NOT NULL OR valor_frete_venda_2 > 0 OR tipo_operacao = 'triangular') THEN valor_frete_venda_2 ELSE 0 END), 0) as total_venda,
        COALESCE(SUM(CASE WHEN valor_frete_real > 0 THEN valor_frete_real ELSE COALESCE(valor_frete_compra, 0) END), 0) as total_compra,
        COALESCE(SUM(valor_comissao), 0) as total_comissao,
        COUNT(*) as total_fretes
      FROM fretes
      WHERE status_frete != 'cancelado' AND (empresa_id = ? OR empresa_id = ?)
    `).get(empIdNum, empIdStr);

    // 4. Títulos Avulsos / Operacionais (apenas onde frete_id IS NULL OR frete_id = 0 para evitar duplicações)
    const titulosStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receber' AND (status = 'pago' OR status = 'recebido') THEN COALESCE(valor_pago, valor) ELSE 0 END), 0) as avulso_recebido,
        COALESCE(SUM(CASE WHEN tipo = 'receber' AND status != 'pago' AND status != 'recebido' THEN MAX(0, valor - COALESCE(valor_pago, 0)) ELSE 0 END), 0) as avulso_a_receber,
        COALESCE(SUM(CASE WHEN tipo = 'pagar' AND (status = 'pago' OR status = 'quitado') THEN COALESCE(valor_pago, valor) ELSE 0 END), 0) as avulso_pago,
        COALESCE(SUM(CASE WHEN tipo = 'pagar' AND status != 'pago' AND status != 'quitado' THEN MAX(0, valor - COALESCE(valor_pago, 0)) ELSE 0 END), 0) as avulso_a_pagar
      FROM financeiro_titulos
      WHERE (empresa_id = ? OR empresa_id = ?) AND status != 'cancelado' AND (frete_id IS NULL OR frete_id = 0)
    `).get(empIdNum, empIdStr);

    const empresaObj = db.prepare('SELECT modo_operacao FROM empresas WHERE id = ? OR id = ?').get(empIdNum, empIdStr);
    const isGestaoEmpresa = empresaObj?.modo_operacao === 'gestao_pagamentos';

    const totalVendaVal = Number((fretesTotais.total_venda || 0).toFixed(2));
    const totalCompraVal = Number((fretesTotais.total_compra || 0).toFixed(2));
    const totalComissaoVal = Number((fretesTotais.total_comissao || 0).toFixed(2));
    const margemMediaPct = totalVendaVal > 0 ? Number(((totalComissaoVal / totalVendaVal) * 100).toFixed(1)) : 0;

    // Se for modo Gestão de Pagamentos, a empresa NÃO é emissora do CT-e (não possui faturamento a receber do frete)
    const totalRecebidoGeral = isGestaoEmpresa
      ? (titulosStats.avulso_recebido || 0)
      : (fretesReceitas.recebidos_1 || 0) + (fretesReceitas.recebidos_2 || 0) + (titulosStats.avulso_recebido || 0);

    const totalAReceberGeral = isGestaoEmpresa
      ? (titulosStats.avulso_a_receber || 0)
      : (fretesReceitas.pendentes_1 || 0) + (fretesReceitas.pendentes_2 || 0) + (titulosStats.avulso_a_receber || 0);

    const totalPagoFreteiros = Math.max(pagamentosHistorico.total_pago_freteiros || 0, fretesTotais.freteiro_quitado || 0);
    const totalPagoGeral = totalPagoFreteiros + (fretesTotais.repasse_pago || 0) + (fretesTotais.comissao_paga || 0) + (titulosStats.avulso_pago || 0);
    const totalAPagarGeral = (fretesTotais.freteiro_pendente || 0) + (fretesTotais.repasse_pendente || 0) + (fretesTotais.comissao_pendente || 0) + (titulosStats.avulso_a_pagar || 0);

    const saldoProjetado = (totalRecebidoGeral + totalAReceberGeral) - (totalPagoGeral + totalAPagarGeral);
    const saldoRealizado = totalRecebidoGeral - totalPagoGeral;

    // 5. Contagens de Status Operacionais
    const statusCountsRaw = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status_frete = 'em_transito' THEN 1 END) as em_transito,
        COUNT(CASE WHEN status_frete = 'entregue' THEN 1 END) as entregue,
        COUNT(CASE WHEN status_frete = 'cancelado' THEN 1 END) as cancelado,
        COUNT(CASE WHEN status_pagamento_motorista != 'quitado' AND status_frete != 'cancelado' THEN 1 END) as pagamentos_pendentes,
        COUNT(CASE WHEN (status_recebimento_cliente != 'recebido' OR (numero_cte_2 IS NOT NULL AND status_recebimento_cliente_2 != 'recebido')) AND status_frete != 'cancelado' THEN 1 END) as recebimentos_pendentes,
        COUNT(*) as total_geral
      FROM fretes
      WHERE (empresa_id = ? OR empresa_id = ?)
    `).get(empIdNum, empIdStr) || {};

    const status_counts = {
      em_transito: statusCountsRaw.em_transito || 0,
      entregue: statusCountsRaw.entregue || 0,
      cancelado: statusCountsRaw.cancelado || 0,
      pagamentos_pendentes: statusCountsRaw.pagamentos_pendentes || 0,
      recebimentos_pendentes: statusCountsRaw.recebimentos_pendentes || 0,
      total_geral: statusCountsRaw.total_geral || 0
    };

    // 6. Evolução Mensal dos Fretes
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const evolucaoRaw = db.prepare(`
      SELECT 
        strftime('%Y-%m', data_emissao) as mes_ano,
        COALESCE(SUM(valor_frete_venda + CASE WHEN (numero_cte_2 IS NOT NULL OR valor_frete_venda_2 > 0 OR tipo_operacao = 'triangular') THEN valor_frete_venda_2 ELSE 0 END), 0) as venda,
        COALESCE(SUM(CASE WHEN valor_frete_real > 0 THEN valor_frete_real ELSE COALESCE(valor_frete_compra, 0) END), 0) as compra,
        COALESCE(SUM(valor_comissao), 0) as lucro,
        COUNT(*) as fretes
      FROM fretes
      WHERE (empresa_id = ? OR empresa_id = ?) AND status_frete != 'cancelado' AND data_emissao IS NOT NULL AND data_emissao != ''
      GROUP BY strftime('%Y-%m', data_emissao)
      ORDER BY mes_ano ASC
      LIMIT 12
    `).all(empIdNum, empIdStr);

    let evolucao_mensal = [];
    if (evolucaoRaw.length > 0) {
      evolucao_mensal = evolucaoRaw.map(r => {
        let labelMes = r.mes_ano || '';
        if (r.mes_ano && r.mes_ano.includes('-')) {
          const [ano, mes] = r.mes_ano.split('-');
          const mIdx = parseInt(mes, 10) - 1;
          if (mIdx >= 0 && mIdx < 12) {
            labelMes = `${mesesNomes[mIdx]}/${ano.slice(2)}`;
          }
        }
        return {
          mes: labelMes,
          mes_ano: r.mes_ano,
          venda: Number(Number(r.venda || 0).toFixed(2)),
          compra: Number(Number(r.compra || 0).toFixed(2)),
          lucro: Number(Number(r.lucro || 0).toFixed(2)),
          fretes: r.fretes || 0
        };
      });
    } else {
      const agora = new Date();
      const mesAtualLabel = `${mesesNomes[agora.getMonth()]}/${String(agora.getFullYear()).slice(2)}`;
      evolucao_mensal = [{
        mes: mesAtualLabel,
        venda: totalVendaVal,
        compra: totalCompraVal,
        lucro: totalComissaoVal,
        fretes: fretesTotais.total_fretes || 0
      }];
    }

    // 7. Últimos Fretes Registrados
    const ultimos_fretes = db.prepare(`
      SELECT 
        f.*,
        (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_pago_historico
      FROM fretes f
      WHERE (f.empresa_id = ? OR f.empresa_id = ?) AND f.status_frete != 'cancelado'
      ORDER BY COALESCE(f.data_emissao, substr(f.created_at, 1, 10)) DESC, f.id DESC
      LIMIT 10
    `).all(empIdNum, empIdStr);

    return res.json({
      resumo: {
        // Formato Financeiro.jsx
        totalRecebido: Number(totalRecebidoGeral.toFixed(2)),
        totalAReceber: Number(totalAReceberGeral.toFixed(2)),
        totalPago: Number(totalPagoGeral.toFixed(2)),
        totalAPagar: Number(totalAPagarGeral.toFixed(2)),
        saldoProjetado: Number(saldoProjetado.toFixed(2)),
        saldoRealizado: Number(saldoRealizado.toFixed(2)),
        totalVendaFretes: totalVendaVal,
        totalCompraFretes: totalCompraVal,
        totalComissaoFretes: totalComissaoVal,
        totalFretes: fretesTotais.total_fretes || 0,

        // Formato Dashboard.jsx (snake_case)
        total_venda: totalVendaVal,
        total_compra: totalCompraVal,
        total_comissao: totalComissaoVal,
        margem_media_percentual: margemMediaPct,
        total_saldo_pendente_freteiros: Number(totalAPagarGeral.toFixed(2)),
        total_adiantamentos_pagos: Number(totalPagoGeral.toFixed(2)),
        total_a_receber_clientes: Number(totalAReceberGeral.toFixed(2)),
        total_recebido_clientes: Number(totalRecebidoGeral.toFixed(2)),
      },
      status_counts,
      evolucao_mensal,
      ultimos_fretes
    });
  } catch (error) {
    console.error('Erro ao calcular KPIs financeiros:', error);
    return res.status(500).json({ error: 'Erro ao calcular KPIs financeiros.' });
  }
};

/**
 * Listagem Unificada de Títulos (Contas a Pagar e Contas a Receber)
 * Totalmente deduplicada, com suporte a 2 CT-es (Triangular) e filtros por origem.
 */
const listTitulos = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const { tipo = 'todos', origem = 'todos', categoria, status = 'todos', search } = req.query;

    const titulos = [];

    // 1. Buscar títulos avulsos / operacionais da tabela financeiro_titulos
    let queryAvulsos = `
      SELECT t.*, f.numero_cte, f.cliente_nome as frete_cliente, f.motorista_nome as frete_motorista
      FROM financeiro_titulos t
      LEFT JOIN fretes f ON t.frete_id = f.id
      WHERE (t.empresa_id = ? OR t.empresa_id = ?) AND t.status != 'cancelado'
    `;
    const paramsAvulsos = [empIdNum, empIdStr];

    if (origem === 'operacional_fixo') {
      queryAvulsos += ` AND (t.frete_id IS NULL OR t.frete_id = 0)`;
    } else if (origem === 'frete_cte') {
      queryAvulsos += ` AND t.frete_id > 0`;
    }

    queryAvulsos += ` ORDER BY t.data_vencimento ASC, t.id DESC`;

    const titulosAvulsos = db.prepare(queryAvulsos).all(...paramsAvulsos);
    
    // Mapear frete_ids que já têm títulos criados manualmente na tabela financeiro_titulos
    const fretesComTitulosAvulsos = new Set();
    for (const t of titulosAvulsos) {
      if (t.frete_id) {
        fretesComTitulosAvulsos.add(`${t.tipo}_${t.frete_id}`);
      }
      titulos.push({
        ...t,
        origem: t.frete_id ? 'frete_cte' : (t.origem || 'operacional_fixo'),
        is_frete: Boolean(t.frete_id),
      });
    }

    // 2. Se origem !== 'operacional_fixo', adicionar os fretes da tabela fretes
    if (origem !== 'operacional_fixo') {
      const fretes = db.prepare(`
        SELECT 
          f.*,
          (SELECT COALESCE(SUM(valor), 0) FROM adiantamentos_historico WHERE frete_id = f.id) as total_pago_historico
        FROM fretes f
        WHERE (f.empresa_id = ? OR f.empresa_id = ?) AND f.status_frete != 'cancelado'
        ORDER BY COALESCE(f.data_vencimento_cliente, f.data_emissao, substr(f.created_at, 1, 10)) ASC, f.id DESC
      `).all(empIdNum, empIdStr);

      for (const f of fretes) {
        const isTriangular = Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0 || f.tipo_operacao === 'triangular');
        const isRepasse = Boolean(f.tipo_operacao === 'agenciamento_repasse' || Number(f.valor_repasse || 0) > 0);
        const dataEmissaoVal = f.data_emissao || (f.created_at ? f.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
        const dataVencVal = f.data_vencimento_cliente || dataEmissaoVal;

        const v1 = Number(f.valor_frete_venda || 0);
        const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
        const vTotalReceber = Number((v1 + v2).toFixed(2));

        // 2.1 Contas a Receber: CT-e 1 (+ CT-e 2 Triangular Unificado em 1 Linha)
        // REGRA DE OURO: Na modalidade "gestao_pagamentos", a empresa é a contratante/cliente que paga (NÃO é emissora de CT-e e NÃO gera receita a receber)
        if (f.tipo_operacao !== 'gestao_pagamentos' && (tipo === 'receber' || tipo === 'todos')) {
          if (!fretesComTitulosAvulsos.has(`receber_${f.id}`)) {
            const isRec1 = f.status_recebimento_cliente === 'recebido';
            const isRec2 = isTriangular ? (f.status_recebimento_cliente_2 === 'recebido') : true;

            const valorPagoReceber = Number(((isRec1 ? v1 : 0) + (isTriangular && f.status_recebimento_cliente_2 === 'recebido' ? v2 : 0)).toFixed(2));
            const isTotalmenteRecebido = isRec1 && isRec2;
            const isParcialmenteRecebido = !isTotalmenteRecebido && valorPagoReceber > 0;

            titulos.push({
              id: `frete_rec_${f.id}`,
              frete_id: f.id,
              empresa_id: empresaId,
              tipo: 'receber',
              origem: 'frete_cte',
              categoria: 'faturamento_frete',
              categoria_nome: isTriangular ? 'Faturamento de Frete (2 CT-es)' : 'Faturamento de Frete / CT-e',
              descricao: isTriangular 
                ? `CT-e 1 Nº ${f.numero_cte || 'S/N'} + CT-e 2 Nº ${f.numero_cte_2 || 'S/N'} (${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf})`
                : `Frete CT-e Nº ${f.numero_cte || 'S/N'} (${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf})`,
              numero_cte: f.numero_cte,
              numero_cte_2: f.numero_cte_2,
              nfe_referencia: f.nfe_referencia,
              nfe_referencia_2: f.nfe_referencia_2,
              cliente_nome: f.cliente_nome || 'Cliente Tomador',
              cliente_nome_2: f.cliente_nome_2 || f.cliente_nome,
              cliente_cnpj: f.cliente_cnpj,
              cliente_cnpj_2: f.cliente_cnpj_2,
              valor_cte_1: v1,
              valor_cte_2: v2,
              valor: vTotalReceber,
              valor_pago: valorPagoReceber,
              data_emissao: dataEmissaoVal,
              data_vencimento: dataVencVal,
              status: isTotalmenteRecebido ? 'pago' : (isParcialmenteRecebido ? 'parcial' : 'pendente'),
              forma_pagamento: 'Boleto / PIX',
              is_frete: true,
              is_triangular: isTriangular,
              origem_cidade: f.origem_cidade,
              origem_uf: f.origem_uf,
              destino_cidade: f.destino_cidade,
              destino_uf: f.destino_uf,
              motorista_nome: f.motorista_nome,
              placa_veiculo: f.placa_veiculo,
              placa_carreta: f.placa_carreta,
              peso_kg: f.peso_kg,
              peso_kg_2: f.peso_kg_2,
              tipo_carga: f.tipo_carga,
              tipo_recibo: 'receber'
            });
          }
        }

        // 2.2 Contas a Pagar: Freteiro / Motorista
        if (tipo === 'pagar' || tipo === 'todos') {
          if (!fretesComTitulosAvulsos.has(`pagar_${f.id}`)) {
            const valorTotalFreteiro = Number(f.valor_frete_real || f.valor_frete_compra || (Number(f.valor_saldo_motorista || 0) + Number(f.valor_adiantamento || 0)) || 0);
            const valorPagoFreteiro = Number(f.total_pago_historico || f.valor_adiantamento || 0);
            const isQuitadoFreteiro = f.status_pagamento_motorista === 'quitado' || (valorTotalFreteiro > 0 && valorPagoFreteiro >= valorTotalFreteiro - 0.01);

            const descFreteiro = isTriangular && f.numero_cte_2
              ? `Freteiro CT-e 1 Nº ${f.numero_cte || 'S/N'} + CT-e 2 Nº ${f.numero_cte_2} (${f.placa_veiculo || 'S/N'})`
              : `Freteiro CT-e Nº ${f.numero_cte || 'S/N'} (${f.placa_veiculo || 'S/N'})`;

            titulos.push({
              id: `frete_pag_${f.id}`,
              frete_id: f.id,
              empresa_id: empresaId,
              tipo: 'pagar',
              origem: 'frete_cte',
              categoria: 'frete_motorista',
              categoria_nome: 'Frete de Terceiro / Motorista',
              descricao: descFreteiro,
              pessoa_nome: f.favorecido_freteiro_nome || f.motorista_nome || 'Motorista / Parceiro',
              numero_cte: f.numero_cte,
              numero_cte_2: f.numero_cte_2,
              valor_cte_1: v1,
              valor_cte_2: v2,
              cliente_nome: f.cliente_nome,
              cliente_nome_2: f.cliente_nome_2,
              motorista_nome: f.motorista_nome,
              favorecido_freteiro_nome: f.favorecido_freteiro_nome,
              valor: valorTotalFreteiro,
              valor_pago: isQuitadoFreteiro ? valorTotalFreteiro : valorPagoFreteiro,
              data_emissao: dataEmissaoVal,
              data_vencimento: dataEmissaoVal,
              status: isQuitadoFreteiro ? 'pago' : (valorPagoFreteiro > 0 ? 'parcial' : 'pendente'),
              forma_pagamento: 'PIX',
              is_frete: true,
              is_triangular: isTriangular
            });

            // 2.3 Contas a Pagar: Comissão (se modalidade gestao_pagamentos ou destinatario_comissao_nome preenchido)
            if (Number(f.valor_comissao || 0) > 0 && (f.tipo_operacao === 'gestao_pagamentos' || f.destinatario_comissao_nome)) {
              const vCom = Number(f.valor_comissao);
              const isComPaga = f.status_comissao === 'pago';
              titulos.push({
                id: `frete_comissao_${f.id}`,
                frete_id: f.id,
                empresa_id: empresaId,
                tipo: 'pagar',
                origem: 'frete_cte',
                categoria: 'comissao_agenciamento',
                categoria_nome: 'Comissão de Agenciamento a Pagar',
                descricao: `Comissão Agenciamento CT-e Nº ${f.numero_cte || 'S/N'} ${f.numero_cte_2 ? '+ Nº ' + f.numero_cte_2 : ''}`,
                pessoa_nome: f.destinatario_comissao_nome || 'Fornecedor da Comissão',
                pessoa_documento: f.destinatario_comissao_doc || '',
                numero_cte: f.numero_cte,
                numero_cte_2: f.numero_cte_2,
                valor_cte_1: v1,
                valor_cte_2: v2,
                cliente_nome: f.cliente_nome,
                cliente_nome_2: f.cliente_nome_2,
                valor: vCom,
                valor_pago: isComPaga ? vCom : 0,
                data_emissao: dataEmissaoVal,
                data_vencimento: dataEmissaoVal,
                status: isComPaga ? 'pago' : 'pendente',
                forma_pagamento: 'PIX',
                is_frete: true,
                is_triangular: isTriangular
              });
            }

            // 2.4 Contas a Pagar: Repasse ao Embarcador (se houver)
            if (Number(f.valor_repasse || 0) > 0) {
              const vRep = Number(f.valor_repasse);
              const isRepPago = f.status_repasse === 'pago';
              titulos.push({
                id: `frete_repasse_${f.id}`,
                frete_id: f.id,
                empresa_id: empresaId,
                tipo: 'pagar',
                origem: 'frete_cte',
                categoria: 'repasse_agenciamento',
                categoria_nome: 'Repasse de Agenciamento',
                descricao: `Repasse Financeiro CT-e Nº ${f.numero_cte || 'S/N'} ${f.numero_cte_2 ? '+ Nº ' + f.numero_cte_2 : ''}`,
                pessoa_nome: f.destinatario_repasse_nome || f.cliente_nome || 'Embarcador / Parceiro',
                pessoa_documento: f.destinatario_repasse_doc || '',
                numero_cte: f.numero_cte,
                numero_cte_2: f.numero_cte_2,
                valor_cte_1: v1,
                valor_cte_2: v2,
                cliente_nome: f.cliente_nome,
                cliente_nome_2: f.cliente_nome_2,
                valor: vRep,
                valor_pago: isRepPago ? vRep : 0,
                data_emissao: dataEmissaoVal,
                data_vencimento: dataEmissaoVal,
                status: isRepPago ? 'pago' : 'pendente',
                forma_pagamento: 'PIX',
                is_frete: true,
                is_triangular: isTriangular
              });
            }
          }
        }
      }
    }

    // 3. Filtragem Final Consistente
    let resultado = titulos;

    if (tipo && tipo !== 'todos') {
      resultado = resultado.filter(t => t.tipo === tipo);
    }
    if (origem && origem !== 'todos') {
      resultado = resultado.filter(t => {
        if (origem === 'frete_cte') {
          return t.origem === 'frete_cte' || t.is_frete === true;
        }
        if (origem === 'operacional_fixo') {
          return t.origem === 'operacional_fixo' || (!t.is_frete && t.origem !== 'frete_cte');
        }
        return t.origem === origem;
      });
    }
    if (categoria) {
      resultado = resultado.filter(t => t.categoria === categoria);
    }
    if (status && status !== 'todos') {
      if (status === 'pago') {
        resultado = resultado.filter(t => t.status === 'pago' || t.status === 'recebido');
      } else if (status === 'parcial') {
        resultado = resultado.filter(t => t.status === 'parcial');
      } else if (status === 'pendente') {
        resultado = resultado.filter(t => t.status === 'pendente');
      }
    }
    if (search) {
      const q = search.toLowerCase().trim();
      resultado = resultado.filter(t => 
        (t.descricao && t.descricao.toLowerCase().includes(q)) ||
        (t.pessoa_nome && t.pessoa_nome.toLowerCase().includes(q)) ||
        (t.categoria_nome && t.categoria_nome.toLowerCase().includes(q)) ||
        (t.forma_pagamento && t.forma_pagamento.toLowerCase().includes(q))
      );
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao listar títulos financeiros:', error);
    return res.status(500).json({ error: 'Erro ao listar títulos financeiros: ' + error.message });
  }
};

/**
 * Criação de Novo Título Operacional / Avulso (Luz, Net, Água, Aluguel, Combustível, etc.)
 */
const createTitulo = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const {
      tipo,
      categoria,
      categoria_nome,
      descricao,
      pessoa_nome,
      pessoa_documento,
      valor,
      data_emissao,
      data_vencimento,
      forma_pagamento,
      observacoes
    } = req.body;

    if (!tipo || !descricao || !valor || !data_vencimento) {
      return res.status(400).json({ error: 'Tipo, descrição, valor e data de vencimento são obrigatórios.' });
    }

    let catNome = categoria_nome;
    if (!catNome) {
      const lista = tipo === 'receber' ? PLANO_CONTAS.receitas : PLANO_CONTAS.despesas;
      const found = lista.find(c => c.id === categoria);
      catNome = found ? found.nome : (categoria || 'Despesa Operacional');
    }

    const result = db.prepare(`
      INSERT INTO financeiro_titulos (
        empresa_id, tipo, origem, categoria, categoria_nome, descricao,
        pessoa_nome, pessoa_documento, valor, data_emissao, data_vencimento,
        status, forma_pagamento, observacoes
      ) VALUES (?, ?, 'avulso', ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)
    `).run(
      empresaId,
      tipo,
      categoria || 'outros_pagar',
      catNome,
      descricao.trim(),
      pessoa_nome ? pessoa_nome.trim() : null,
      pessoa_documento ? pessoa_documento.trim() : null,
      Number(valor),
      data_emissao || new Date().toISOString().slice(0, 10),
      data_vencimento,
      forma_pagamento || 'Boleto / PIX',
      observacoes || null
    );

    const created = db.prepare('SELECT * FROM financeiro_titulos WHERE id = ?').get(Number(result.lastInsertRowid));

    return res.status(201).json({
      message: 'Título cadastrado com sucesso no financeiro!',
      titulo: created
    });
  } catch (error) {
    console.error('Erro ao cadastrar título:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar título financeiro.' });
  }
};

/**
 * Atualização de Título Financeiro
 */
const updateTitulo = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const {
      descricao,
      categoria,
      categoria_nome,
      pessoa_nome,
      pessoa_documento,
      valor,
      data_vencimento,
      forma_pagamento,
      observacoes
    } = req.body;

    db.prepare(`
      UPDATE financeiro_titulos SET
        descricao = COALESCE(?, descricao),
        categoria = COALESCE(?, categoria),
        categoria_nome = COALESCE(?, categoria_nome),
        pessoa_nome = COALESCE(?, pessoa_nome),
        pessoa_documento = COALESCE(?, pessoa_documento),
        valor = COALESCE(?, valor),
        data_vencimento = COALESCE(?, data_vencimento),
        forma_pagamento = COALESCE(?, forma_pagamento),
        observacoes = COALESCE(?, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)
    `).run(
      descricao,
      categoria,
      categoria_nome,
      pessoa_nome,
      pessoa_documento,
      valor !== undefined ? Number(valor) : undefined,
      data_vencimento,
      forma_pagamento,
      observacoes,
      id,
      empIdNum,
      empIdStr
    );

    const updated = db.prepare('SELECT * FROM financeiro_titulos WHERE id = ?').get(id);
    return res.json({ message: 'Título atualizado com sucesso!', titulo: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar título.' });
  }
};

/**
 * Baixa / Quitação de Título (Pagar ou Receber - Total ou Parcial)
 */
const baixarTitulo = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);
    const { data_pagamento, valor_pago, valor_baixa, forma_pagamento, comprovante_ref, observacoes } = req.body;

    const dataPag = data_pagamento || new Date().toISOString().slice(0, 10);

    // 1. Frete a Receber (frete_rec_15 ou frete_rec2_15)
    if (String(id).startsWith('frete_rec')) {
      const isCte2Only = String(id).startsWith('frete_rec2_');
      const freteId = Number(id.replace('frete_rec2_', '').replace('frete_rec_', ''));
      if (!freteId || isNaN(freteId)) return res.status(400).json({ error: 'ID de frete inválido.' });
      const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(freteId, empIdNum, empIdStr);
      if (!frete) return res.status(404).json({ error: 'Frete não encontrado.' });

      const isTriangular = Boolean(frete.numero_cte_2 || Number(frete.valor_frete_venda_2 || 0) > 0 || frete.tipo_operacao === 'triangular');
      const v1 = Number(frete.valor_frete_venda || 0);
      const v2 = isTriangular ? Number(frete.valor_frete_venda_2 || 0) : 0;
      const vTotal = v1 + v2;
      const vBaixa = valor_baixa !== undefined ? Number(valor_baixa) : (valor_pago !== undefined ? Number(valor_pago) : (isCte2Only ? v2 : vTotal));

      if (isCte2Only) {
        const novoStatus2 = (vBaixa >= v2 - 0.01) ? 'recebido' : 'faturado';
        db.prepare(`UPDATE fretes SET status_recebimento_cliente_2 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)`).run(novoStatus2, freteId, empIdNum, empIdStr);
      } else if (isTriangular) {
        if (vBaixa >= vTotal - 0.01) {
          db.prepare(`UPDATE fretes SET status_recebimento_cliente = 'recebido', status_recebimento_cliente_2 = 'recebido', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)`).run(freteId, empIdNum, empIdStr);
        } else if (vBaixa >= v1 - 0.01) {
          db.prepare(`UPDATE fretes SET status_recebimento_cliente = 'recebido', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)`).run(freteId, empIdNum, empIdStr);
        }
      } else {
        const novoStatus = (vBaixa >= v1 - 0.01) ? 'recebido' : 'faturado';
        db.prepare(`UPDATE fretes SET status_recebimento_cliente = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)`).run(novoStatus, freteId, empIdNum, empIdStr);
      }

      return res.json({ message: 'Recebimento de frete registrado com sucesso!' });
    }

    // 2. Frete Repasse a Pagar (frete_repasse_15)
    if (String(id).startsWith('frete_repasse_')) {
      const freteId = Number(id.replace('frete_repasse_', ''));
      if (!freteId || isNaN(freteId)) return res.status(400).json({ error: 'ID de frete inválido.' });
      const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(freteId, empIdNum, empIdStr);
      if (!frete) return res.status(404).json({ error: 'Frete não encontrado.' });

      db.prepare(`
        UPDATE fretes SET
          status_repasse = 'pago',
          data_repasse = ?,
          comprovante_repasse = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)
      `).run(dataPag, comprovante_ref || null, freteId, empIdNum, empIdStr);

      return res.json({ message: 'Repasse marcado como quitado com sucesso!' });
    }

    // 2.1 Frete Comissão a Pagar (frete_comissao_15)
    if (String(id).startsWith('frete_comissao_')) {
      const freteId = Number(id.replace('frete_comissao_', ''));
      if (!freteId || isNaN(freteId)) return res.status(400).json({ error: 'ID de frete inválido.' });
      const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(freteId, empIdNum, empIdStr);
      if (!frete) return res.status(404).json({ error: 'Frete não encontrado.' });

      db.prepare(`
        UPDATE fretes SET
          status_comissao = 'pago',
          data_comissao_paga = ?,
          comprovante_comissao = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)
      `).run(dataPag, comprovante_ref || null, freteId, empIdNum, empIdStr);

      return res.json({ message: 'Comissão de agenciamento marcada como quitada com sucesso!' });
    }

    // 3. Frete Freteiro a Pagar (frete_pag_15)
    if (String(id).startsWith('frete_pag_')) {
      const freteId = Number(id.replace('frete_pag_', ''));
      if (!freteId || isNaN(freteId)) return res.status(400).json({ error: 'ID de frete inválido.' });
      const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(freteId, empIdNum, empIdStr);
      if (!frete) return res.status(404).json({ error: 'Frete não encontrado.' });

      const vTotal = Number(frete.valor_frete_real || frete.valor_frete_compra || (Number(frete.valor_saldo_motorista || 0) + Number(frete.valor_adiantamento || 0)) || 0);
      const jaPagoAnt = db.prepare('SELECT COALESCE(SUM(valor), 0) as total FROM adiantamentos_historico WHERE frete_id = ?').get(freteId)?.total || 0;
      
      const vBaixa = valor_baixa !== undefined ? Number(valor_baixa) : (valor_pago !== undefined ? Number(valor_pago) : Math.max(0, vTotal - jaPagoAnt));
      
      db.prepare(`
        INSERT INTO adiantamentos_historico (empresa_id, frete_id, tipo, valor, data_pagamento, forma_pagamento, comprovante_ref, observacoes)
        VALUES (?, ?, 'saldo_final', ?, ?, ?, ?, ?)
      `).run(empresaId, freteId, vBaixa, dataPag, forma_pagamento || 'PIX', comprovante_ref || null, observacoes || null);

      const novoTotalPago = Number((jaPagoAnt + vBaixa).toFixed(2));
      const novoSaldo = Math.max(0, Number((vTotal - novoTotalPago).toFixed(2)));
      let novoStatus = 'pendente';
      if (novoSaldo <= 0.01) {
        novoStatus = 'quitado';
      } else if (novoTotalPago > 0) {
        novoStatus = 'parcial';
      }

      db.prepare(`
        UPDATE fretes SET
          status_pagamento_motorista = ?,
          valor_saldo_motorista = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)
      `).run(novoStatus, novoSaldo, freteId, empIdNum, empIdStr);

      return res.json({ message: 'Pagamento de freteiro registrado com sucesso!' });
    }

    // 4. Título avulso da tabela financeiro_titulos
    const titulo = db.prepare('SELECT * FROM financeiro_titulos WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').get(id, empIdNum, empIdStr);
    if (!titulo) {
      return res.status(404).json({ error: 'Título não encontrado.' });
    }

    const valorTotalTitulo = Number(titulo.valor || 0);
    const jaPagoAnterior = Number(titulo.valor_pago || 0);

    let novoTotalPago = 0;
    if (valor_baixa !== undefined) {
      novoTotalPago = Number((jaPagoAnterior + Number(valor_baixa)).toFixed(2));
    } else if (valor_pago !== undefined) {
      novoTotalPago = Number(Number(valor_pago).toFixed(2));
    } else {
      novoTotalPago = valorTotalTitulo;
    }

    let novoStatus = 'pendente';
    if (novoTotalPago >= valorTotalTitulo - 0.01) {
      novoStatus = 'pago';
      novoTotalPago = valorTotalTitulo;
    } else if (novoTotalPago > 0) {
      novoStatus = 'parcial';
    } else {
      novoStatus = 'pendente';
      novoTotalPago = 0;
    }

    db.prepare(`
      UPDATE financeiro_titulos SET
        status = ?,
        valor_pago = ?,
        data_pagamento = ?,
        forma_pagamento = COALESCE(?, forma_pagamento),
        comprovante_ref = COALESCE(?, comprovante_ref),
        observacoes = COALESCE(?, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)
    `).run(
      novoStatus,
      novoTotalPago,
      dataPag,
      forma_pagamento || null,
      comprovante_ref || null,
      observacoes || null,
      id,
      empIdNum,
      empIdStr
    );

    return res.json({ 
      message: novoStatus === 'pago' ? 'Título quitado 100% com sucesso!' : `Baixa parcial registrada com sucesso! Saldo restante: R$ ${(valorTotalTitulo - novoTotalPago).toFixed(2)}`,
      status: novoStatus,
      valor_pago: novoTotalPago,
      saldo_restante: Math.max(0, Number((valorTotalTitulo - novoTotalPago).toFixed(2)))
    });
  } catch (error) {
    console.error('Erro ao baixar título:', error);
    return res.status(500).json({ error: 'Erro ao baixar título financeiro.' });
  }
};

/**
 * Exclusão de Título Avulso
 */
const deleteTitulo = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);

    db.prepare('DELETE FROM financeiro_titulos WHERE id = ? AND (empresa_id = ? OR empresa_id = ?)').run(id, empIdNum, empIdStr);
    return res.json({ message: 'Título excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir título.' });
  }
};

const listContasPagar = (req, res) => {
  req.query.tipo = 'pagar';
  return listTitulos(req, res);
};

const listContasReceber = (req, res) => {
  req.query.tipo = 'receber';
  return listTitulos(req, res);
};

const lancarPagamentoMotorista = (req, res) => {
  try {
    const { frete_id, tipo, valor, data_pagamento, forma_pagamento, comprovante_ref, observacoes } = req.body;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND empresa_id = ?').get(frete_id, empresaId);
    if (!frete) return res.status(404).json({ error: 'Frete não encontrado.' });

    const valorNum = Number(valor || 0);

    db.prepare(`
      INSERT INTO adiantamentos_historico (empresa_id, frete_id, tipo, valor, data_pagamento, forma_pagamento, comprovante_ref, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(empresaId, frete_id, tipo, valorNum, data_pagamento || new Date().toISOString().slice(0, 10), forma_pagamento || 'PIX', comprovante_ref || null, observacoes || null);

    const totalPago = db.prepare('SELECT COALESCE(SUM(valor), 0) as total FROM adiantamentos_historico WHERE frete_id = ?').get(frete_id)?.total || 0;
    const totalContratado = Number(frete.valor_frete_real || frete.valor_frete_compra || (Number(frete.valor_saldo_motorista || 0) + Number(frete.valor_adiantamento || 0)) || 0);
    const saldo = Math.max(0, Number((totalContratado - totalPago).toFixed(2)));

    let statusPag = 'pendente';
    if (saldo <= 0.01) {
      statusPag = 'quitado';
    } else if (totalPago > 0) {
      statusPag = (Math.abs(totalPago - (frete.valor_adiantamento || 0)) < 1) ? 'adiantamento_pago' : 'parcial';
    }

    db.prepare(`
      UPDATE fretes SET
        status_pagamento_motorista = ?,
        valor_saldo_motorista = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(statusPag, saldo, frete_id, empresaId);

    return res.json({ 
      message: 'Pagamento / Adiantamento registrado com sucesso!',
      total_pago: totalPago,
      saldo_devedor: saldo,
      status: statusPag
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao lançar pagamento.' });
  }
};

const atualizarStatusRecebimento = (req, res) => {
  try {
    const { id } = req.params;
    const { status_recebimento, campo = '1' } = req.body;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const col = campo === '2' ? 'status_recebimento_cliente_2' : 'status_recebimento_cliente';
    db.prepare(`UPDATE fretes SET ${col} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND empresa_id = ?`).run(status_recebimento, id, empresaId);

    return res.json({ message: 'Status de recebimento atualizado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar recebimento.' });
  }
};

module.exports = {
  getPlanoContas,
  getDashboardKPIs,
  listTitulos,
  createTitulo,
  updateTitulo,
  baixarTitulo,
  deleteTitulo,
  listContasPagar,
  listContasReceber,
  lancarPagamentoMotorista,
  atualizarStatusRecebimento
};
