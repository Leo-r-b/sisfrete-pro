const db = require('../config/database');

const listClientes = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { search } = req.query;
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM fretes f WHERE (f.cliente_id = c.id OR f.cliente_id_2 = c.id) AND f.empresa_id = ? AND f.status_frete != 'cancelado') as total_fretes,
        (SELECT COALESCE(SUM(
          CASE 
            WHEN f.cliente_id = c.id AND f.cliente_id_2 = c.id THEN f.valor_frete_venda + f.valor_frete_venda_2
            WHEN f.cliente_id = c.id THEN f.valor_frete_venda
            WHEN f.cliente_id_2 = c.id THEN f.valor_frete_venda_2
            ELSE 0
          END
        ), 0) FROM fretes f WHERE (f.cliente_id = c.id OR f.cliente_id_2 = c.id) AND f.empresa_id = ? AND f.status_frete != 'cancelado') as total_faturado
      FROM clientes c
      WHERE c.empresa_id = ?
    `;
    const params = [empresaId, empresaId, empresaId];

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (c.razao_social LIKE ? OR c.nome_fantasia LIKE ? OR c.cnpj_cpf LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY c.razao_social ASC`;

    const clientes = db.prepare(query).all(...params);
    return res.json(clientes);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar clientes.' });
  }
};

const getClienteById = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ? AND empresa_id = ?').get(id, empresaId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const fretes = db.prepare('SELECT * FROM fretes WHERE (cliente_id = ? OR cliente_id_2 = ?) AND empresa_id = ? ORDER BY data_emissao DESC').all(id, id, empresaId);

    return res.json({
      ...cliente,
      fretes,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar cliente.' });
  }
};

const createCliente = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf } = req.body;

    if (!razao_social) {
      return res.status(400).json({ error: 'Razão social / Nome do cliente é obrigatório.' });
    }

    const result = db.prepare(`
      INSERT INTO clientes (empresa_id, razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      empresaId,
      razao_social.trim(),
      nome_fantasia ? nome_fantasia.trim() : razao_social.trim(),
      cnpj_cpf || null,
      telefone || null,
      email || null,
      cidade || null,
      uf ? uf.toUpperCase() : null
    );

    const created = db.prepare('SELECT * FROM clientes WHERE id = ? AND empresa_id = ?').get(Number(result.lastInsertRowid), empresaId);

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      cliente: created,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar cliente.' });
  }
};

const updateCliente = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const { razao_social, nome_fantasia, cnpj_cpf, telefone, email, cidade, uf } = req.body;

    db.prepare(`
      UPDATE clientes SET
        razao_social = ?, nome_fantasia = ?, cnpj_cpf = ?, telefone = ?, email = ?, cidade = ?, uf = ?
      WHERE id = ? AND empresa_id = ?
    `).run(
      razao_social.trim(),
      nome_fantasia ? nome_fantasia.trim() : razao_social.trim(),
      cnpj_cpf || null,
      telefone || null,
      email || null,
      cidade || null,
      uf ? uf.toUpperCase() : null,
      id,
      empresaId
    );

    const updated = db.prepare('SELECT * FROM clientes WHERE id = ? AND empresa_id = ?').get(id, empresaId);

    return res.json({
      message: 'Cliente atualizado com sucesso!',
      cliente: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
};

const deleteCliente = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    db.prepare('DELETE FROM clientes WHERE id = ? AND empresa_id = ?').run(id, empresaId);
    return res.json({ message: 'Cliente excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
};

module.exports = {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
};
