const db = require('../config/database');
const crypto = require('crypto');

/**
 * Obter dados da viagem para a tela pública do motorista bater foto do canhoto
 */
const getPublicCanhotoInfo = (req, res) => {
  try {
    const { token } = req.params;

    let frete = db.prepare(`
      SELECT f.id, f.numero_cte, f.cliente_nome, f.motorista_nome, f.placa_veiculo,
             f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
             f.tipo_carga, f.peso_kg, f.canhoto_status, f.canhoto_foto_url,
             f.canhoto_data_hora, e.razao_social as empresa_nome
      FROM fretes f
      INNER JOIN empresas e ON f.empresa_id = e.id
      WHERE f.canhoto_token_acesso = ?
    `).get(token);

    if (!frete) {
      // Se não encontrou por token, tenta buscar por ID se for numérico (fallback inteligente)
      if (/^\d+$/.test(token)) {
        frete = db.prepare(`
          SELECT f.id, f.numero_cte, f.cliente_nome, f.motorista_nome, f.placa_veiculo,
                 f.origem_cidade, f.origem_uf, f.destino_cidade, f.destino_uf,
                 f.tipo_carga, f.peso_kg, f.canhoto_status, f.canhoto_foto_url,
                 f.canhoto_data_hora, e.razao_social as empresa_nome
          FROM fretes f
          INNER JOIN empresas e ON f.empresa_id = e.id
          WHERE f.id = ?
        `).get(Number(token));
      }
    }

    if (!frete) {
      return res.status(404).json({ error: 'Viagem ou comprovante de entrega não encontrado.' });
    }

    return res.json(frete);
  } catch (error) {
    console.error('Erro ao buscar dados públicos do canhoto:', error);
    return res.status(500).json({ error: 'Erro ao buscar comprovante.' });
  }
};

/**
 * Upload da Foto do Canhoto pelo Motorista (Mobile)
 */
const uploadPublicCanhoto = (req, res) => {
  try {
    const { token } = req.params;
    const { foto_base64, geolocalizacao, recebedor_nome, recebedor_doc } = req.body;

    if (!foto_base64) {
      return res.status(400).json({ error: 'A foto do canhoto assinado é obrigatória.' });
    }

    let frete = db.prepare(`SELECT id, empresa_id FROM fretes WHERE canhoto_token_acesso = ?`).get(token);
    if (!frete && /^\d+$/.test(token)) {
      frete = db.prepare(`SELECT id, empresa_id FROM fretes WHERE id = ?`).get(Number(token));
    }

    if (!frete) {
      return res.status(404).json({ error: 'Frete não localizado.' });
    }

    const dataHoraNow = new Date().toISOString();

    db.prepare(`
      UPDATE fretes SET
        canhoto_foto_url = ?,
        canhoto_data_hora = ?,
        canhoto_geolocalizacao = ?,
        canhoto_recebedor_nome = ?,
        canhoto_recebedor_doc = ?,
        canhoto_status = 'pendente',
        status_frete = 'entregue',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      foto_base64,
      dataHoraNow,
      geolocalizacao || null,
      recebedor_nome || null,
      recebedor_doc || null,
      frete.id
    );

    // Adicionar evento no rastreamento
    db.prepare(`
      INSERT INTO frete_eventos_rastreamento (frete_id, status, descricao, data_hora)
      VALUES (?, 'entregue', 'Comprovante / Canhoto Digital enviado pelo motorista no destino', ?)
    `).run(frete.id, dataHoraNow);

    return res.json({
      message: 'Comprovante de entrega enviado com sucesso! O setor financeiro foi notificado para validação.',
      dataHora: dataHoraNow
    });
  } catch (error) {
    console.error('Erro no upload do canhoto:', error);
    return res.status(500).json({ error: 'Erro ao enviar foto do canhoto.' });
  }
};

/**
 * Auditoria / Aprovação Interna do Canhoto pelo Operador/Financeiro
 */
const auditarCanhoto = (req, res) => {
  try {
    const { id } = req.params;
    const { status, motivo_rejeicao } = req.body; // 'aprovado' | 'rejeitado'
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    db.prepare(`
      UPDATE fretes SET
        canhoto_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(status === 'aprovado' ? 'aprovado' : 'rejeitado', id, empresaId);

    return res.json({
      message: status === 'aprovado' 
        ? 'Canhoto validado e aprovado com sucesso! Faturamento liberado.' 
        : 'Canhoto rejeitado. O motorista será orientado a reenviar nova foto.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao auditar canhoto.' });
  }
};

/**
 * Gerar ou obter token de acesso do canhoto
 */
const gerarTokenCanhoto = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const token = crypto.randomBytes(8).toString('hex');

    db.prepare(`
      UPDATE fretes SET
        canhoto_token_acesso = COALESCE(canhoto_token_acesso, ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(token, id, empresaId);

    const frete = db.prepare(`SELECT canhoto_token_acesso FROM fretes WHERE id = ?`).get(id);

    return res.json({
      token: frete.canhoto_token_acesso,
      url: `/canhoto/${frete.canhoto_token_acesso}`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar link de canhoto.' });
  }
};

module.exports = {
  getPublicCanhotoInfo,
  uploadPublicCanhoto,
  auditarCanhoto,
  gerarTokenCanhoto
};
