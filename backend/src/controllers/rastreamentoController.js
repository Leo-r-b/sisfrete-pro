const db = require('../config/database');
const crypto = require('crypto');

/**
 * Consulta Pública de Rastreamento pelo Cliente Final (Sem Login)
 */
const getPublicTracking = (req, res) => {
  try {
    const { token } = req.params;

    let frete = db.prepare(`
      SELECT f.id, f.numero_cte, f.cliente_nome, f.motorista_nome, f.placa_veiculo,
             f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
             f.tipo_carga, f.peso_kg, f.status_frete, f.data_emissao,
             f.nfe_referencia, e.razao_social as empresa_nome
      FROM fretes f
      INNER JOIN empresas e ON f.empresa_id = e.id
      WHERE f.rastreamento_token = ?
    `).get(token);

    if (!frete && /^\d+$/.test(token)) {
      frete = db.prepare(`
        SELECT f.id, f.numero_cte, f.cliente_nome, f.motorista_nome, f.placa_veiculo,
               f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
               f.tipo_carga, f.peso_kg, f.status_frete, f.data_emissao,
               f.nfe_referencia, e.razao_social as empresa_nome
        FROM fretes f
        INNER JOIN empresas e ON f.empresa_id = e.id
        WHERE f.id = ?
      `).get(Number(token));
    }

    if (!frete) {
      return res.status(404).json({ error: 'Código de rastreamento não localizado.' });
    }

    const eventos = db.prepare(`
      SELECT * FROM frete_eventos_rastreamento
      WHERE frete_id = ?
      ORDER BY id ASC
    `).all(frete.id);

    return res.json({
      frete,
      eventos: eventos || []
    });
  } catch (error) {
    console.error('Erro na consulta de rastreamento:', error);
    return res.status(500).json({ error: 'Erro ao consultar rastreamento.' });
  }
};

/**
 * Torre de Controle - Listar todas as viagens agrupadas por status (Kanban)
 * - Suporta operações triangulares (CT-e 1 + CT-e 2)
 * - Retém viagens entregues no kanban por no máximo 24 horas
 */
const getTorreControle = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const fretes = db.prepare(`
      SELECT f.id, f.numero_cte, f.numero_cte_2, f.cliente_nome, f.cliente_nome_2,
             f.motorista_nome, f.placa_veiculo, f.placa_carreta,
             f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
             f.tipo_carga, f.peso_kg, f.peso_kg_2, f.status_frete, f.data_emissao,
             f.data_entrega, f.updated_at, f.created_at,
             f.valor_frete_venda, f.valor_frete_venda_2, f.valor_frete_compra, f.valor_frete_real,
             f.tipo_operacao, f.canhoto_status, f.rastreamento_token
      FROM fretes f
      WHERE f.empresa_id = ? AND f.status_frete != 'cancelado'
      ORDER BY f.id DESC
    `).all(empresaId);

    // Limite de 24 horas para viagens concluídas / entregues
    const agora = new Date();
    const limite24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    const formatarViagem = (f) => {
      const isTriangular = f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
      const v1 = Number(f.valor_frete_venda || 0);
      const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
      return {
        ...f,
        is_triangular: isTriangular,
        valor_total_venda: v1 + v2,
      };
    };

    const formatados = fretes.map(formatarViagem);

    const entreguesFiltrados = formatados.filter(f => {
      if (f.status_frete !== 'entregue') return false;
      const dataRef = f.data_entrega || f.updated_at || f.created_at;
      if (!dataRef) return true;
      const dt = new Date(dataRef);
      return isNaN(dt.getTime()) || dt >= limite24h;
    });

    const kanban = {
      agendado: formatados.filter(f => f.status_frete === 'agendado'),
      em_transito: formatados.filter(f => f.status_frete === 'em_transito'),
      entregue: entreguesFiltrados
    };

    return res.json({
      kanban,
      totalViagens: fretes.length,
      emTransitoCount: kanban.em_transito.length,
      entreguesCount: kanban.entregue.length
    });
  } catch (error) {
    console.error('Erro na Torre de Controle:', error);
    return res.status(500).json({ error: 'Erro ao carregar Torre de Controle.' });
  }
};

/**
 * Movimentação Rápida / Drag & Drop de Status da Viagem
 */
const moverStatusViagem = (req, res) => {
  try {
    const { id, novo_status } = req.body;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    if (!id || !novo_status) {
      return res.status(400).json({ error: 'ID da viagem e novo_status são obrigatórios.' });
    }

    const statusValidos = ['agendado', 'em_transito', 'entregue'];
    if (!statusValidos.includes(novo_status)) {
      return res.status(400).json({ error: 'Status inválido. Use: agendado, em_transito ou entregue.' });
    }

    const frete = db.prepare(`SELECT * FROM fretes WHERE id = ? AND empresa_id = ?`).get(id, empresaId);
    if (!frete) {
      return res.status(404).json({ error: 'Viagem não encontrada.' });
    }

    // Se estiver movendo para 'entregue', gravar data_entrega = CURRENT_TIMESTAMP
    if (novo_status === 'entregue') {
      db.prepare(`
        UPDATE fretes 
        SET status_frete = ?, data_entrega = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(novo_status, id);
    } else {
      db.prepare(`
        UPDATE fretes 
        SET status_frete = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(novo_status, id);
    }

    // Registrar evento no histórico
    const descricoes = {
      agendado: 'Viagem redefinida para Aguardando Coleta / Agendada',
      em_transito: 'Carga coletada e viagem em trânsito na rodovia',
      entregue: 'Carga entregue com sucesso no destino final'
    };

    db.prepare(`
      INSERT INTO frete_eventos_rastreamento (
        frete_id, status, descricao, cidade, uf
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      novo_status,
      descricoes[novo_status] || `Status alterado para ${novo_status}`,
      novo_status === 'entregue' ? frete.destino_cidade : (novo_status === 'em_transito' ? frete.origem_cidade : null),
      novo_status === 'entregue' ? frete.destino_uf : (novo_status === 'em_transito' ? frete.origem_uf : null)
    );

    return res.json({ message: `Viagem #${id} movida para ${novo_status} com sucesso!` });
  } catch (error) {
    console.error('Erro ao mover status da viagem:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status da viagem: ' + error.message });
  }
};

/**
 * Adicionar Novo Evento / Checkpoint de Rastreamento na Viagem
 */
const addEventoRastreamento = (req, res) => {
  try {
    const { id } = req.params;
    const { status, descricao, cidade, uf, latitude, longitude } = req.body;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const frete = db.prepare(`SELECT * FROM fretes WHERE id = ? AND empresa_id = ?`).get(id, empresaId);
    if (!frete) return res.status(404).json({ error: 'Frete não encontrado.' });

    db.prepare(`
      INSERT INTO frete_eventos_rastreamento (
        frete_id, status, descricao, cidade, uf, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      status || frete.status_frete,
      descricao.trim(),
      cidade || null,
      uf || null,
      latitude || null,
      longitude || null
    );

    // Se o status alterou, atualizar no frete
    if (status && status !== frete.status_frete) {
      if (status === 'entregue') {
        db.prepare(`UPDATE fretes SET status_frete = ?, data_entrega = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
      } else {
        db.prepare(`UPDATE fretes SET status_frete = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
      }
    }

    const eventos = db.prepare(`SELECT * FROM frete_eventos_rastreamento WHERE frete_id = ? ORDER BY id ASC`).all(id);

    return res.status(201).json({ message: 'Checkpoint de rastreamento registrado!', eventos });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao registrar evento de rastreamento.' });
  }
};

/**
 * Gerar ou Obter Token de Rastreamento Público
 */
const gerarTokenRastreamento = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const token = crypto.randomBytes(8).toString('hex');

    db.prepare(`
      UPDATE fretes SET
        rastreamento_token = COALESCE(rastreamento_token, ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(token, id, empresaId);

    const frete = db.prepare(`SELECT rastreamento_token FROM fretes WHERE id = ?`).get(id);

    return res.json({
      token: frete.rastreamento_token,
      url: `/rastreio/${frete.rastreamento_token}`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar link de rastreamento.' });
  }
};

module.exports = {
  getPublicTracking,
  getTorreControle,
  moverStatusViagem,
  addEventoRastreamento,
  gerarTokenRastreamento
};
