const db = require('../config/database');
const mdfeService = require('../services/mdfeService');

/**
 * Listagem de MDF-es da Empresa
 */
const listMdfes = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { status, search } = req.query;

    let query = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM mdfe_ctes_vinculados WHERE mdfe_id = m.id) as total_ctes_vinculados
      FROM mdfes m
      WHERE m.empresa_id = ?
    `;
    const params = [empresaId];

    if (status && status !== 'todos') {
      query += ` AND m.status_mdfe = ?`;
      params.push(status);
    }
    if (search) {
      const term = `%${search.trim()}%`;
      query += ` AND (m.numero_mdfe LIKE ? OR m.motorista_nome LIKE ? OR m.placa_veiculo LIKE ? OR m.chave_mdfe LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY m.id DESC`;

    const mdfes = db.prepare(query).all(...params);

    // Carregar CT-es vinculados
    const stmtCtes = db.prepare(`SELECT * FROM mdfe_ctes_vinculados WHERE mdfe_id = ?`);
    for (const m of mdfes) {
      m.ctes = stmtCtes.all(m.id);
    }

    return res.json(mdfes);
  } catch (error) {
    console.error('Erro ao listar MDF-es:', error);
    return res.status(500).json({ error: 'Erro ao listar MDF-es.' });
  }
};

/**
 * Criação / Rascunho de MDF-e
 */
const createMdfe = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const {
      serie = 1,
      numero_mdfe,
      uf_origem,
      uf_destino,
      ufs_percurso,
      motorista_nome,
      motorista_cpf,
      placa_veiculo,
      placa_carreta,
      rntrc,
      seguradora_nome,
      seguradora_cnpj,
      numero_apolice,
      numero_averbacao,
      ctes_ids = []
    } = req.body;

    // Próximo número sequencial
    let num = numero_mdfe;
    if (!num) {
      const maxNum = db.prepare(`SELECT MAX(numero_mdfe) as max_num FROM mdfes WHERE empresa_id = ?`).get(empresaId);
      num = (maxNum?.max_num || 0) + 1;
    }

    // Buscar dados dos CT-es selecionados
    let valorTotal = 0;
    let pesoTotal = 0;
    const ctesData = [];

    if (ctes_ids.length > 0) {
      const placeholders = ctes_ids.map(() => '?').join(',');
      const rows = db.prepare(`SELECT * FROM fretes WHERE id IN (${placeholders}) AND empresa_id = ?`).all(...ctes_ids, empresaId);
      for (const r of rows) {
        const vCarga = (r.valor_frete_venda || 0) + (r.valor_frete_venda_2 || 0);
        const pCarga = (r.peso_kg || 0) + (r.peso_kg_2 || 0);
        valorTotal += vCarga;
        pesoTotal += pCarga;
        ctesData.push({
          frete_id: r.id,
          chave_cte: r.chave_cte_44 || r.chave_cte || `412608123456780001905700100000${String(r.id).padStart(6, '0')}1000000010`,
          numero_cte: r.numero_cte,
          valor_frete: vCarga,
          peso_kg: pCarga,
          municipio_descarregamento: r.destino_cidade || 'DESTINO',
          uf_descarregamento: r.destino_uf || uf_destino || 'PR'
        });
      }
    }

    const insertResult = db.prepare(`
      INSERT INTO mdfes (
        empresa_id, serie, numero_mdfe, uf_origem, uf_destino, ufs_percurso,
        motorista_nome, motorista_cpf, placa_veiculo, placa_carreta, rntrc,
        seguradora_nome, seguradora_cnpj, numero_apolice, numero_averbacao,
        valor_total_carga, peso_total_kg, quantidade_ctes, status_mdfe, data_emissao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rascunho', DATE('now'))
    `).run(
      empresaId,
      serie,
      num,
      uf_origem || 'PR',
      uf_destino || 'SP',
      Array.isArray(ufs_percurso) ? ufs_percurso.join(',') : (ufs_percurso || ''),
      motorista_nome,
      motorista_cpf,
      placa_veiculo,
      placa_carreta,
      rntrc,
      seguradora_nome,
      seguradora_cnpj,
      numero_apolice,
      numero_averbacao,
      valorTotal,
      pesoTotal,
      ctesData.length
    );

    const mdfeId = Number(insertResult.lastInsertRowid);

    const stmtItem = db.prepare(`
      INSERT INTO mdfe_ctes_vinculados (
        mdfe_id, frete_id, chave_cte, numero_cte, valor_frete, peso_kg,
        municipio_descarregamento, uf_descarregamento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of ctesData) {
      stmtItem.run(mdfeId, c.frete_id, c.chave_cte, c.numero_cte, c.valor_frete, c.peso_kg, c.municipio_descarregamento, c.uf_descarregamento);
    }

    const created = db.prepare(`SELECT * FROM mdfes WHERE id = ?`).get(mdfeId);
    created.ctes = db.prepare(`SELECT * FROM mdfe_ctes_vinculados WHERE mdfe_id = ?`).all(mdfeId);

    return res.status(201).json({ message: 'Manifesto MDF-e criado com sucesso!', mdfe: created });
  } catch (error) {
    console.error('Erro ao criar MDF-e:', error);
    return res.status(500).json({ error: 'Erro ao criar MDF-e.' });
  }
};

/**
 * Transmitir e Emitir MDF-e 3.00 na SEFAZ
 */
const emitirMdfe = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const mdfe = db.prepare(`SELECT * FROM mdfes WHERE id = ? AND empresa_id = ?`).get(id, empresaId);
    if (!mdfe) return res.status(404).json({ error: 'MDF-e não encontrado.' });

    const ctes = db.prepare(`SELECT * FROM mdfe_ctes_vinculados WHERE mdfe_id = ?`).all(id);
    const empresa = db.prepare(`SELECT * FROM empresas WHERE id = ?`).get(empresaId) || { razao_social: 'TRANSPORTADORA SISFRETE LTDA', cnpj: '12.345.678/0001-90' };
    const configFiscal = db.prepare(`SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?`).get(empresaId) || { ambiente: 'homologacao' };

    const resultado = await mdfeService.emitirMdfeSefaz({ mdfe, ctes, empresa, configFiscal });

    if (resultado.sucesso) {
      db.prepare(`
        UPDATE mdfes SET
          status_mdfe = 'autorizado',
          chave_mdfe = ?,
          protocolo_autorizacao = ?,
          data_autorizacao = ?,
          xml_mdfe = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND empresa_id = ?
      `).run(
        resultado.chaveAcesso,
        resultado.protocolo,
        resultado.dhRecbto,
        resultado.xmlProtocolado,
        id,
        empresaId
      );

      return res.json({
        message: 'MDF-e emitido e autorizado com sucesso na SEFAZ!',
        protocolo: resultado.protocolo,
        chaveAcesso: resultado.chaveAcesso
      });
    } else {
      return res.status(400).json({ error: resultado.xMotivo || 'Rejeição SEFAZ ao emitir MDF-e.' });
    }
  } catch (error) {
    console.error('Erro na transmissão do MDF-e:', error);
    return res.status(500).json({ error: 'Erro ao transmitir MDF-e para a SEFAZ.' });
  }
};

/**
 * Encerrar MDF-e
 */
const encerrarMdfe = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { municipio_encerramento, uf_encerramento } = req.body;

    const mdfe = db.prepare(`SELECT * FROM mdfes WHERE id = ? AND empresa_id = ?`).get(id, empresaId);
    if (!mdfe) return res.status(404).json({ error: 'MDF-e não encontrado.' });

    const empresa = db.prepare(`SELECT * FROM empresas WHERE id = ?`).get(empresaId);
    const configFiscal = db.prepare(`SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?`).get(empresaId) || { ambiente: 'homologacao' };

    const resEnc = await mdfeService.encerrarMdfeSefaz({
      mdfe,
      municipio: municipio_encerramento || mdfe.uf_destino,
      uf: uf_encerramento || mdfe.uf_destino,
      configFiscal,
      empresa
    });

    if (!resEnc.sucesso) {
      return res.status(400).json({ error: resEnc.xMotivo || 'Rejeição SEFAZ ao encerrar MDF-e.' });
    }

    db.prepare(`
      UPDATE mdfes SET
        status_mdfe = 'encerrado',
        data_encerramento = CURRENT_TIMESTAMP,
        municipio_encerramento = ?,
        uf_encerramento = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(municipio_encerramento || mdfe.uf_destino, uf_encerramento || mdfe.uf_destino, id, empresaId);

    return res.json({ message: 'MDF-e encerrado com sucesso na SEFAZ!', protocolo: resEnc.protocolo });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao encerrar MDF-e: ' + error.message });
  }
};

/**
 * Cancelar MDF-e na SEFAZ (Evento 110111)
 */
const cancelarMdfe = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const { justificativa } = req.body;

    const mdfe = db.prepare(`SELECT * FROM mdfes WHERE id = ? AND empresa_id = ?`).get(id, empresaId);
    if (!mdfe) return res.status(404).json({ error: 'MDF-e não encontrado.' });

    const empresa = db.prepare(`SELECT * FROM empresas WHERE id = ?`).get(empresaId);
    const configFiscal = db.prepare(`SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?`).get(empresaId) || { ambiente: 'homologacao' };

    const resCanc = await mdfeService.cancelarMdfeSefaz({
      mdfe,
      justificativa: justificativa || 'Cancelamento solicitado pelo emitente',
      configFiscal,
      empresa
    });

    if (!resCanc.sucesso) {
      return res.status(400).json({ error: resCanc.xMotivo || 'Rejeição SEFAZ ao cancelar MDF-e.' });
    }

    db.prepare(`
      UPDATE mdfes SET
        status_mdfe = 'cancelado',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(id, empresaId);

    return res.json({ message: 'MDF-e cancelado com sucesso na SEFAZ!', protocolo: resCanc.protocolo });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cancelar MDF-e: ' + error.message });
  }
};

/**
 * Obter dados para exibição do DAMDFE em PDF
 */
const getDamdfeData = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const mdfe = db.prepare(`SELECT * FROM mdfes WHERE id = ? AND empresa_id = ?`).get(id, empresaId);
    if (!mdfe) return res.status(404).json({ error: 'MDF-e não encontrado.' });

    const ctes = db.prepare(`SELECT * FROM mdfe_ctes_vinculados WHERE mdfe_id = ?`).all(id);
    const empresa = db.prepare(`SELECT * FROM empresas WHERE id = ?`).get(empresaId);
    const configFiscal = db.prepare(`SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?`).get(empresaId);

    return res.json({
      mdfe,
      ctes,
      empresa,
      configFiscal
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao carregar dados do DAMDFE.' });
  }
};

module.exports = {
  listMdfes,
  createMdfe,
  emitirMdfe,
  encerrarMdfe,
  cancelarMdfe,
  getDamdfeData
};
