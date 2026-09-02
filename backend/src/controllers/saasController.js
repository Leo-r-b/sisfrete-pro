const db = require('../config/database');

// Sincronizar mensalidades automáticas de um mês específico
const sincronizarMensalidades = (mesRef) => {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const anoMes = mesRef || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const empresasAtivas = db.prepare('SELECT id, valor_mensalidade, dia_vencimento, tipo_licenca, data_expiracao_teste FROM empresas WHERE ativo = 1').all();

  for (const emp of empresasAtivas) {
    const valor = emp.valor_mensalidade !== undefined && emp.valor_mensalidade !== null ? Number(emp.valor_mensalidade) : 350.00;
    const tipo = emp.tipo_licenca || 'paga';

    // Não gera faturas pendentes de cobrança para licenças gratuitas ou em período de teste
    if (valor <= 0 || tipo === 'gratuita' || tipo === 'teste_7dias') {
      continue;
    }

    const diaVenc = String(emp.dia_vencimento || 10).padStart(2, '0');
    const dataVenc = `${anoMes}-${diaVenc}`;

    const cobranca = db.prepare('SELECT id, status, data_vencimento FROM licencas_cobrancas WHERE empresa_id = ? AND mes_referencia = ?').get(emp.id, anoMes);
    if (!cobranca) {
      const statusInicial = (hojeStr > dataVenc) ? 'atrasado' : 'pendente';
      db.prepare(`
        INSERT INTO licencas_cobrancas (empresa_id, mes_referencia, data_vencimento, valor, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(emp.id, anoMes, dataVenc, valor, statusInicial);
    } else if (cobranca.status === 'pendente' && hojeStr > cobranca.data_vencimento) {
      db.prepare(`UPDATE licencas_cobrancas SET status = 'atrasado' WHERE id = ?`).run(cobranca.id);
    }
  }
};

// Obter métricas e KPIs do Painel Master SaaS
const getSaasDashboard = (req, res) => {
  try {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const mesRefAtual = `${anoAtual}-${mesAtual}`;

    // Sincronizar cobranças do mês corrente
    sincronizarMensalidades(mesRefAtual);

    // 1. Total de Licenças
    const totalLicencas = db.prepare('SELECT COUNT(*) as count FROM empresas').get().count || 0;
    const licencasAtivas = db.prepare('SELECT COUNT(*) as count FROM empresas WHERE ativo = 1').get().count || 0;
    const licencasBloqueadas = db.prepare('SELECT COUNT(*) as count FROM empresas WHERE ativo = 0').get().count || 0;
    const licencasTeste = db.prepare("SELECT COUNT(*) as count FROM empresas WHERE tipo_licenca = 'teste_7dias'").get().count || 0;
    const licencasGratuitas = db.prepare("SELECT COUNT(*) as count FROM empresas WHERE tipo_licenca = 'gratuita' OR valor_mensalidade = 0").get().count || 0;

    // 2. MRR (Receita Recorrente Mensal Projetada - soma apenas empresas ativas do plano pago)
    const mrrRow = db.prepare("SELECT COALESCE(SUM(valor_mensalidade), 0) as mrr FROM empresas WHERE ativo = 1 AND (tipo_licenca = 'paga' OR tipo_licenca IS NULL)").get();
    const mrr = mrrRow?.mrr || 0;

    // 3. Métricas Financeiras do Mês Atual
    const faturamentoMes = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) as total_recebido,
        COALESCE(SUM(CASE WHEN status IN ('pendente', 'atrasado') THEN valor ELSE 0 END), 0) as total_a_receber,
        COALESCE(SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END), 0) as total_atrasado,
        COALESCE(SUM(valor), 0) as total_faturado,
        COUNT(CASE WHEN status = 'pago' THEN 1 END) as qtd_pagas,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as qtd_pendentes,
        COUNT(CASE WHEN status = 'atrasado' THEN 1 END) as qtd_atrasadas,
        COUNT(*) as total_cobrancas
      FROM licencas_cobrancas
      WHERE mes_referencia = ?
    `).get(mesRefAtual);

    // 4. Histórico dos últimos 6 meses de faturamento
    const historicoMeses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nomeMes = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      
      const stats = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) as recebido,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN valor ELSE 0 END), 0) as projetado
        FROM licencas_cobrancas
        WHERE mes_referencia = ?
      `).get(mRef);

      historicoMeses.push({
        mes_referencia: mRef,
        label: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
        recebido: stats?.recebido || 0,
        projetado: stats?.projetado || 0,
      });
    }

    // 5. Status Geral das Licenças com Última Mensalidade e Dados de Trial
    const licencasRaw = db.prepare(`
      SELECT 
        e.id, e.codigo_licenca, e.razao_social, e.nome_fantasia, e.cnpj, e.cidade, e.uf, e.ativo,
        e.limite_logins, e.valor_mensalidade, e.dia_vencimento, e.created_at, e.data_adesao,
        e.tipo_licenca, e.data_expiracao_teste, e.modo_operacao, e.percentual_comissao_padrao,
        (SELECT COUNT(*) FROM users u WHERE u.empresa_id = e.id) as total_usuarios,
        (SELECT COUNT(*) FROM fretes f WHERE f.empresa_id = e.id) as total_fretes,
        c.id as cobranca_id,
        c.status as status_cobranca,
        c.valor as valor_cobranca,
        c.data_vencimento,
        c.data_pagamento,
        c.forma_pagamento
      FROM empresas e
      LEFT JOIN licencas_cobrancas c ON c.empresa_id = e.id AND c.mes_referencia = ?
      ORDER BY e.id ASC
    `).all(mesRefAtual);

    const licencasComFinanceiro = licencasRaw.map(emp => {
      let diasRestantesTeste = null;
      let testeExpirado = false;

      if (emp.tipo_licenca === 'teste_7dias') {
        if (emp.data_expiracao_teste) {
          const exp = new Date(emp.data_expiracao_teste + 'T23:59:59');
          const agora = new Date();
          const diffMs = exp.getTime() - agora.getTime();
          diasRestantesTeste = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          testeExpirado = diasRestantesTeste <= 0;
        }
      }

      return {
        ...emp,
        tipo_licenca: emp.tipo_licenca || (emp.valor_mensalidade === 0 ? 'gratuita' : 'paga'),
        valor_mensalidade: emp.valor_mensalidade !== undefined ? Number(emp.valor_mensalidade) : 350.00,
        dias_restantes_teste: diasRestantesTeste,
        teste_expirado: testeExpirado,
      };
    });

    return res.json({
      mes_referencia_atual: mesRefAtual,
      total_licencas: totalLicencas,
      licencas_ativas: licencasAtivas,
      licencas_bloqueadas: licencasBloqueadas,
      licencas_teste: licencasTeste,
      licencas_gratuitas: licencasGratuitas,
      mrr_projetado: mrr,
      financeiro_mes: faturamentoMes,
      historico_meses: historicoMeses,
      licencas: licencasComFinanceiro,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard SaaS:', error);
    return res.status(500).json({ error: 'Erro ao buscar métricas SaaS: ' + error.message });
  }
};

// Listar todas as cobranças com filtros
const listCobrancas = (req, res) => {
  try {
    const { mes_referencia, status, empresa_id, busca } = req.query;
    const hojeStr = new Date().toISOString().slice(0, 10);

    // Se um mês foi informado, sincronizar cobranças
    if (mes_referencia) {
      sincronizarMensalidades(mes_referencia);
    }

    let query = `
      SELECT 
        c.*,
        COALESCE(e.nome_fantasia, e.razao_social, 'Empresa #' || c.empresa_id) as empresa_nome,
        e.razao_social,
        e.nome_fantasia,
        e.codigo_licenca,
        e.cnpj,
        e.telefone,
        e.email,
        e.cidade,
        e.uf,
        e.ativo as empresa_ativa
      FROM licencas_cobrancas c
      JOIN empresas e ON c.empresa_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (mes_referencia) {
      query += ` AND c.mes_referencia = ?`;
      params.push(mes_referencia);
    }

    if (status && status !== 'todos') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (empresa_id) {
      query += ` AND c.empresa_id = ?`;
      params.push(Number(empresa_id));
    }

    if (busca && busca.trim()) {
      const term = `%${busca.trim().toLowerCase()}%`;
      query += ` AND (LOWER(e.razao_social) LIKE ? OR LOWER(e.nome_fantasia) LIKE ? OR e.codigo_licenca LIKE ? OR e.cnpj LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY c.data_vencimento DESC, c.id DESC`;

    const cobrancas = db.prepare(query).all(...params);

    // Atualizar status dinâmico para registros atrasados
    const formatadas = cobrancas.map((item) => {
      let statusReal = item.status;
      if (statusReal === 'pendente' && hojeStr > item.data_vencimento) {
        statusReal = 'atrasado';
      }
      return {
        ...item,
        status: statusReal,
      };
    });

    return res.json(formatadas);
  } catch (error) {
    console.error('Erro ao listar cobranças:', error);
    return res.status(500).json({ error: 'Erro ao listar cobranças SaaS: ' + error.message });
  }
};

// Atualizar status de uma cobrança (Dar baixa, registrar pagamento, PIX, etc)
const atualizarStatusCobranca = (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, // 'pago', 'pendente', 'atrasado', 'cancelado'
      data_pagamento,
      forma_pagamento = 'PIX',
      comprovante_ref,
      observacoes,
      valor,
      data_vencimento,
    } = req.body;

    const existing = db.prepare('SELECT * FROM licencas_cobrancas WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fatura / Cobrança não encontrada.' });
    }

    const novoStatus = status || existing.status;
    const hojeStr = new Date().toISOString().slice(0, 10);
    const dataPag = novoStatus === 'pago' ? (data_pagamento || hojeStr) : (novoStatus === 'pendente' ? null : existing.data_pagamento);

    db.prepare(`
      UPDATE licencas_cobrancas SET
        status = ?,
        data_pagamento = ?,
        forma_pagamento = ?,
        comprovante_ref = ?,
        observacoes = ?,
        valor = ?,
        data_vencimento = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      novoStatus,
      dataPag,
      forma_pagamento || existing.forma_pagamento || 'PIX',
      comprovante_ref !== undefined ? comprovante_ref : existing.comprovante_ref,
      observacoes !== undefined ? observacoes : existing.observacoes,
      valor ? Number(valor) : existing.valor,
      data_vencimento || existing.data_vencimento,
      id
    );

    const updated = db.prepare(`
      SELECT 
        c.*,
        COALESCE(e.nome_fantasia, e.razao_social) as empresa_nome,
        e.codigo_licenca, e.cnpj
      FROM licencas_cobrancas c
      JOIN empresas e ON c.empresa_id = e.id
      WHERE c.id = ?
    `).get(id);

    return res.json({
      message: novoStatus === 'pago' 
        ? `Mensalidade da Licença #${updated.codigo_licenca} marcada como PAGA com sucesso!` 
        : 'Cobrança atualizada com sucesso!',
      cobranca: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar cobrança:', error);
    return res.status(500).json({ error: 'Erro ao atualizar cobrança: ' + error.message });
  }
};

// Sincronizar / Gerar mensalidades para um mês informado
const gerarMensalidadesMes = (req, res) => {
  try {
    const { mes_referencia } = req.body;
    const hoje = new Date();
    const targetMes = mes_referencia || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    sincronizarMensalidades(targetMes);

    const count = db.prepare('SELECT COUNT(*) as count FROM licencas_cobrancas WHERE mes_referencia = ?').get(targetMes);

    return res.json({
      message: `Mensalidades do período ${targetMes} geradas/sincronizadas com sucesso! Total de ${count.count} cobranças no mês.`,
      mes_referencia: targetMes,
      total: count.count,
    });
  } catch (error) {
    console.error('Erro ao gerar mensalidades:', error);
    return res.status(500).json({ error: 'Erro ao sincronizar mensalidades: ' + error.message });
  }
};

// Criar cobrança avulsa para uma empresa
const createCobrancaAvulsa = (req, res) => {
  try {
    const {
      empresa_id,
      mes_referencia,
      data_vencimento,
      valor = 350.00,
      status = 'pendente',
      observacoes,
    } = req.body;

    if (!empresa_id || !mes_referencia || !data_vencimento) {
      return res.status(400).json({ error: 'Empresa, mês de referência e data de vencimento são obrigatórios.' });
    }

    const existing = db.prepare('SELECT id FROM licencas_cobrancas WHERE empresa_id = ? AND mes_referencia = ?').get(empresa_id, mes_referencia);
    if (existing) {
      return res.status(400).json({ error: `Já existe uma cobrança para esta licença referente ao mês ${mes_referencia}.` });
    }

    const ins = db.prepare(`
      INSERT INTO licencas_cobrancas (empresa_id, mes_referencia, data_vencimento, valor, status, observacoes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(empresa_id), mes_referencia, data_vencimento, Number(valor) || 350.00, status, observacoes || '');

    const created = db.prepare('SELECT * FROM licencas_cobrancas WHERE id = ?').get(Number(ins.lastInsertRowid));

    return res.status(201).json({
      message: 'Cobrança gerada com sucesso!',
      cobranca: created,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar cobrança avulsa: ' + error.message });
  }
};

// Excluir uma cobrança
const deleteCobranca = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM licencas_cobrancas WHERE id = ?').run(id);
    return res.json({ message: 'Cobrança excluída com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir cobrança.' });
  }
};

// Renovar / Estender Período de Teste de uma Licença (+7 dias, +15 dias, etc.)
const renovarPeriodoTeste = async (req, res) => {
  try {
    const { id } = req.params;
    const { dias = 7 } = req.body;

    const empresa = db.prepare('SELECT id, codigo_licenca, tipo_licenca, data_expiracao_teste, nome_fantasia, razao_social FROM empresas WHERE id = ?').get(id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa / Licença não encontrada.' });
    }

    const hoje = new Date();
    let baseDate = hoje;

    // Se a empresa já tem uma data futura de expiração, estende a partir dela
    if (empresa.data_expiracao_teste) {
      const expAtual = new Date(empresa.data_expiracao_teste + 'T12:00:00');
      if (expAtual > hoje) {
        baseDate = expAtual;
      }
    }

    const novaExp = new Date(baseDate);
    novaExp.setDate(novaExp.getDate() + Number(dias));
    const novaExpIso = novaExp.toISOString().slice(0, 10);
    const dataFormatada = new Date(novaExpIso + 'T12:00:00').toLocaleDateString('pt-BR');

    db.prepare(`
      UPDATE empresas SET
        tipo_licenca = 'teste_7dias',
        data_expiracao_teste = ?,
        valor_mensalidade = 0,
        ativo = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(novaExpIso, id);

    // Sincronizar com Turso
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: `UPDATE empresas SET tipo_licenca = 'teste_7dias', data_expiracao_teste = ?, valor_mensalidade = 0, ativo = 1 WHERE id = ?`,
          args: [novaExpIso, id]
        });
      } catch (eT) {
        console.warn('Aviso renovarPeriodoTeste Turso:', eT.message);
      }
    }

    return res.json({
      message: `⏱️ Período de teste da Licença #${empresa.codigo_licenca || empresa.id} estendido por +${dias} dias! Válido até ${dataFormatada}.`,
      data_expiracao_teste: novaExpIso,
      data_expiracao_formatada: dataFormatada,
    });
  } catch (error) {
    console.error('Erro ao renovar teste:', error);
    return res.status(500).json({ error: 'Erro ao renovar teste: ' + error.message });
  }
};

// Alterar Tipo de Licença (Paga, Teste 7 Dias, Gratuita)
const alterarTipoLicenca = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_licenca, valor_mensalidade } = req.body;

    const empresa = db.prepare('SELECT id, codigo_licenca FROM empresas WHERE id = ?').get(id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    let valorFinal = Number(valor_mensalidade !== undefined ? valor_mensalidade : 350.00);
    let dataExp = null;

    if (tipo_licenca === 'gratuita') {
      valorFinal = 0;
    } else if (tipo_licenca === 'teste_7dias') {
      valorFinal = 0;
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dataExp = d.toISOString().slice(0, 10);
    }

    db.prepare(`
      UPDATE empresas SET
        tipo_licenca = ?,
        valor_mensalidade = ?,
        data_expiracao_teste = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tipo_licenca, valorFinal, dataExp, id);

    // Sincronizar com Turso
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: `UPDATE empresas SET tipo_licenca = ?, valor_mensalidade = ?, data_expiracao_teste = ? WHERE id = ?`,
          args: [tipo_licenca, valorFinal, dataExp, id]
        });
      } catch (eT) {
        console.warn('Aviso alterarTipoLicenca Turso:', eT.message);
      }
    }

    return res.json({
      message: `Plano da Licença #${empresa.codigo_licenca || empresa.id} atualizado com sucesso!`,
      tipo_licenca,
      valor_mensalidade: valorFinal,
      data_expiracao_teste: dataExp
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar tipo de licença: ' + error.message });
  }
};

module.exports = {
  sincronizarMensalidades,
  getSaasDashboard,
  listCobrancas,
  atualizarStatusCobranca,
  gerarMensalidadesMes,
  createCobrancaAvulsa,
  deleteCobranca,
  renovarPeriodoTeste,
  alterarTipoLicenca,
};
