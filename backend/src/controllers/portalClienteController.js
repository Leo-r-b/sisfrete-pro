const db = require('../config/database');

/**
 * Listagem de Fretes do Cliente Logado (Portal do Embarcador)
 */
const getPortalFretes = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const clienteId = req.user?.cliente_id;
    const { status, search } = req.query;

    let query = `
      SELECT f.id, f.numero_cte, f.serie_cte, f.chave_cte_44, f.data_emissao,
             f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
             f.tipo_carga, f.peso_kg, f.valor_frete_venda, f.status_frete,
             f.status_recebimento_cliente, f.canhoto_foto_url, f.canhoto_status,
             f.canhoto_data_hora, f.nfe_referencia
      FROM fretes f
      WHERE f.empresa_id = ? AND f.status_frete != 'cancelado'
    `;
    const params = [empresaId];

    if (clienteId) {
      query += ` AND (f.cliente_id = ? OR f.cliente_id_2 = ?)`;
      params.push(clienteId, clienteId);
    }

    if (status && status !== 'todos') {
      query += ` AND f.status_frete = ?`;
      params.push(status);
    }

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (f.numero_cte LIKE ? OR f.nfe_referencia LIKE ? OR f.destino_cidade LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY f.data_emissao DESC, f.id DESC`;

    const fretes = db.prepare(query).all(...params);
    return res.json(fretes);
  } catch (error) {
    console.error('Erro no portal do cliente:', error);
    return res.status(500).json({ error: 'Erro ao carregar dados do portal do cliente.' });
  }
};

module.exports = {
  getPortalFretes
};
