const db = require('../config/database');

const listMotoristas = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { search } = req.query;
    let query = `
      SELECT m.*,
        (SELECT COUNT(*) FROM fretes f WHERE f.motorista_id = m.id AND f.empresa_id = ? AND f.status_frete != 'cancelado') as total_viagens,
        (SELECT COALESCE(SUM(f.valor_frete_compra), 0) FROM fretes f WHERE f.motorista_id = m.id AND f.empresa_id = ? AND f.status_frete != 'cancelado') as total_ganhos,
        (SELECT COALESCE(SUM(f.valor_saldo_motorista), 0) FROM fretes f WHERE f.motorista_id = m.id AND f.empresa_id = ? AND f.status_frete != 'cancelado') as saldo_em_aberto
      FROM motoristas m
      WHERE m.empresa_id = ?
    `;
    const params = [empresaId, empresaId, empresaId, empresaId];

    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (m.nome LIKE ? OR m.cpf_cnpj LIKE ? OR m.placa_cavalo LIKE ? OR m.telefone LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY m.nome ASC`;

    const motoristas = db.prepare(query).all(...params);
    return res.json(motoristas);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar motoristas.' });
  }
};

const getMotoristaById = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const motorista = db.prepare('SELECT * FROM motoristas WHERE id = ? AND empresa_id = ?').get(id, empresaId);
    if (!motorista) {
      return res.status(404).json({ error: 'Motorista não encontrado.' });
    }

    const fretes = db.prepare('SELECT * FROM fretes WHERE motorista_id = ? AND empresa_id = ? ORDER BY data_emissao DESC').all(id, empresaId);

    return res.json({
      ...motorista,
      fretes,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar motorista.' });
  }
};

const createMotorista = (req, res) => {
  try {
    const empresaId = req.empresaId || 1;
    const { nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome do motorista é obrigatório.' });
    }

    const result = db.prepare(`
      INSERT INTO motoristas (empresa_id, nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      empresaId,
      nome.trim(),
      cpf_cnpj || null,
      telefone || null,
      pix_chave || null,
      pix_tipo || 'CPF',
      placa_cavalo ? placa_cavalo.toUpperCase() : null,
      placa_carreta ? placa_carreta.toUpperCase() : null,
      tipo_veiculo || 'Truck',
      cidade || null,
      uf ? uf.toUpperCase() : null,
      observacoes || null
    );

    const created = db.prepare('SELECT * FROM motoristas WHERE id = ? AND empresa_id = ?').get(Number(result.lastInsertRowid), empresaId);

    return res.status(201).json({
      message: 'Motorista cadastrado com sucesso!',
      motorista: created,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar motorista.' });
  }
};

const updateMotorista = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    const { nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes } = req.body;

    db.prepare(`
      UPDATE motoristas SET
        nome = ?, cpf_cnpj = ?, telefone = ?, pix_chave = ?, pix_tipo = ?,
        placa_cavalo = ?, placa_carreta = ?, tipo_veiculo = ?, cidade = ?, uf = ?, observacoes = ?
      WHERE id = ? AND empresa_id = ?
    `).run(
      nome.trim(),
      cpf_cnpj || null,
      telefone || null,
      pix_chave || null,
      pix_tipo || 'CPF',
      placa_cavalo ? placa_cavalo.toUpperCase() : null,
      placa_carreta ? placa_carreta.toUpperCase() : null,
      tipo_veiculo || 'Truck',
      cidade || null,
      uf ? uf.toUpperCase() : null,
      observacoes || null,
      id,
      empresaId
    );

    const updated = db.prepare('SELECT * FROM motoristas WHERE id = ? AND empresa_id = ?').get(id, empresaId);

    return res.json({
      message: 'Motorista atualizado com sucesso!',
      motorista: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar motorista.' });
  }
};

const deleteMotorista = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || 1;
    db.prepare('DELETE FROM motoristas WHERE id = ? AND empresa_id = ?').run(id, empresaId);
    return res.json({ message: 'Motorista excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir motorista.' });
  }
};

module.exports = {
  listMotoristas,
  getMotoristaById,
  createMotorista,
  updateMotorista,
  deleteMotorista,
};
