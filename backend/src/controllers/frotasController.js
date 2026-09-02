const db = require('../config/database');

/**
 * Listagem de Manutenções e Histórico de Veículos
 */
const listManutencoes = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { placa, status } = req.query;

    let query = `SELECT * FROM veiculos_manutencoes WHERE empresa_id = ?`;
    const params = [empresaId];

    if (placa) {
      query += ` AND placa = ?`;
      params.push(placa);
    }
    if (status && status !== 'todos') {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY data_manutencao DESC, id DESC`;

    const manutencoes = db.prepare(query).all(...params);
    return res.json(manutencoes);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar manutenções.' });
  }
};

const createManutencao = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const {
      placa,
      tipo,
      descricao,
      quilometragem,
      data_manutencao,
      proxima_manutencao_km,
      proxima_manutencao_data,
      oficina_nome,
      valor,
      status,
      observacoes
    } = req.body;

    if (!placa || !descricao || !data_manutencao) {
      return res.status(400).json({ error: 'Placa, descrição e data da manutenção são obrigatórios.' });
    }

    const result = db.prepare(`
      INSERT INTO veiculos_manutencoes (
        empresa_id, placa, tipo, descricao, quilometragem, data_manutencao,
        proxima_manutencao_km, proxima_manutencao_data, oficina_nome, valor,
        status, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      empresaId,
      placa.toUpperCase().trim(),
      tipo || 'revisao_geral',
      descricao.trim(),
      quilometragem ? Number(quilometragem) : null,
      data_manutencao,
      proxima_manutencao_km ? Number(proxima_manutencao_km) : null,
      proxima_manutencao_data || null,
      oficina_nome || null,
      Number(valor || 0),
      status || 'realizada',
      observacoes || null
    );

    const created = db.prepare(`SELECT * FROM veiculos_manutencoes WHERE id = ?`).get(Number(result.lastInsertRowid));
    return res.status(201).json({ message: 'Manutenção registrada com sucesso!', manutencao: created });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao registrar manutenção.' });
  }
};

/**
 * Gestão de Pneus
 */
const listPneus = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { placa } = req.query;

    let query = `SELECT * FROM veiculos_pneus WHERE empresa_id = ?`;
    const params = [empresaId];

    if (placa) {
      query += ` AND placa = ?`;
      params.push(placa);
    }

    query += ` ORDER BY placa ASC, posicao ASC`;
    const pneus = db.prepare(query).all(...params);
    return res.json(pneus);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar pneus.' });
  }
};

const createOrUpdatePneu = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { placa, posicao, numero_fogo, marca_modelo, sulco_mm, recapagens, status, km_instalacao } = req.body;

    const result = db.prepare(`
      INSERT INTO veiculos_pneus (
        empresa_id, placa, posicao, numero_fogo, marca_modelo, sulco_mm, recapagens, status, km_instalacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      empresaId,
      placa.toUpperCase().trim(),
      posicao,
      numero_fogo || null,
      marca_modelo || 'Michelin X Multi',
      Number(sulco_mm || 12.0),
      Number(recapagens || 0),
      status || 'em_uso',
      km_instalacao ? Number(km_instalacao) : null
    );

    const created = db.prepare(`SELECT * FROM veiculos_pneus WHERE id = ?`).get(Number(result.lastInsertRowid));
    return res.status(201).json({ message: 'Pneu registrado com sucesso!', pneu: created });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao registrar pneu.' });
  }
};

module.exports = {
  listManutencoes,
  createManutencao,
  listPneus,
  createOrUpdatePneu
};
