const db = require('../config/database');
const { parseCteXml } = require('../services/cteXmlParser');
const { getCityCoordinates, normalizeString } = require('../services/brazilianCitiesGeo');
const multer = require('multer');

// Configuração do Multer em memória para suportar upload de até 2 XMLs (Venda Triangular)
const storage = multer.memoryStorage();
const uploadCteXml = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Formata data/hora para exibição humanizada (ex: "Hoje às 09:30", "Ontem às 14:00" ou "DD/MM/YYYY HH:mm")
 */
function formatDataHoraHumana(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const agora = new Date();
    const diffMs = agora.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

    const pad = (n) => String(n).padStart(2, '0');
    const dia = pad(d.getDate());
    const mes = pad(d.getMonth() + 1);
    const ano = d.getFullYear();
    const hora = pad(d.getHours());
    const min = pad(d.getMinutes());

    let tempoDecorrido = '';
    if (diffMins < 60) {
      tempoDecorrido = diffMins <= 1 ? 'agora mesmo' : `há ${diffMins} min`;
    } else if (diffHoras < 24) {
      tempoDecorrido = `há ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
    } else {
      const dias = Math.floor(diffHoras / 24);
      tempoDecorrido = `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    }

    const dataFormatada = `${dia}/${mes}/${ano} ${hora}:${min}`;
    return { dataFormatada, tempoDecorrido, horaMin: `${hora}:${min}` };
  } catch (e) {
    return { dataFormatada: isoString, tempoDecorrido: '', horaMin: '' };
  }
}

/**
 * 1. Listar Carregamentos com Agrupamento Geográfico para o Mapa
 */
const listCarregamentos = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);

    const { status = 'todos', search, cidade, uf } = req.query;

    let query = `
      SELECT c.*,
        f.id as frete_id_vinculado,
        f.numero_cte as frete_numero_cte,
        f.status_frete as frete_status
      FROM carregamentos c
      LEFT JOIN fretes f ON c.frete_id = f.id
      WHERE (c.empresa_id = ? OR c.empresa_id = ?)
    `;
    const params = [empIdNum, empIdStr];

    if (status && status !== 'todos') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (cidade) {
      query += ` AND UPPER(c.origem_cidade) LIKE ?`;
      params.push(`%${cidade.trim().toUpperCase()}%`);
    }

    if (uf) {
      query += ` AND UPPER(c.origem_uf) = ?`;
      params.push(uf.trim().toUpperCase());
    }

    if (search) {
      const s = `%${search.trim().toLowerCase()}%`;
      query += ` AND (
        LOWER(c.motorista_nome) LIKE ? OR
        LOWER(c.placa_cavalo) LIKE ? OR
        LOWER(c.placa_carreta) LIKE ? OR
        LOWER(c.fornecedor_nome) LIKE ? OR
        LOWER(c.intermediador_nome) LIKE ? OR
        LOWER(c.origem_cidade) LIKE ? OR
        LOWER(c.destino_cidade) LIKE ? OR
        LOWER(c.destino_empresa_nome) LIKE ?
      )`;
      params.push(s, s, s, s, s, s, s, s);
    }

    query += ` ORDER BY 
      CASE 
        WHEN c.status = 'carregando' THEN 1 
        WHEN c.status = 'aguardando_cte' THEN 2 
        WHEN c.status = 'concluido' THEN 3 
        ELSE 4 
      END ASC,
      c.data_inclusao DESC, c.id DESC`;

    const rawCarregamentos = db.prepare(query).all(...params);

    // Formatar cada carregamento com datas humanas
    const carregamentos = rawCarregamentos.map(c => {
      const { dataFormatada, tempoDecorrido, horaMin } = formatDataHoraHumana(c.data_inclusao);
      return {
        ...c,
        data_inclusao_formatada: dataFormatada,
        tempo_decorrido: tempoDecorrido,
        hora_inclusao: horaMin
      };
    });

    // Agrupamento para o Mapa: Apenas carregamentos ativos ('carregando' ou 'aguardando_cte')
    // Agrupa por Cidade-UF
    const mapaCidadesMap = new Map();

    const ativosParaMapa = carregamentos.filter(c => c.status === 'carregando' || c.status === 'aguardando_cte');

    for (const c of ativosParaMapa) {
      const cidNorm = normalizeString(c.origem_cidade);
      const ufNorm = normalizeString(c.origem_uf);
      const key = `${cidNorm}-${ufNorm}`;

      if (!mapaCidadesMap.has(key)) {
        const coords = (c.latitude && c.longitude) 
          ? { lat: Number(c.latitude), lng: Number(c.longitude) }
          : getCityCoordinates(c.origem_cidade, c.origem_uf);

        mapaCidadesMap.set(key, {
          cidade: c.origem_cidade,
          uf: c.origem_uf,
          chave: key,
          latitude: coords.lat,
          longitude: coords.lng,
          total_caminhoes: 0,
          caminhoes: []
        });
      }

      const cidadeGrupo = mapaCidadesMap.get(key);
      cidadeGrupo.total_caminhoes += 1;
      cidadeGrupo.caminhoes.push({
        id: c.id,
        motorista_nome: c.motorista_nome,
        motorista_telefone: c.motorista_telefone,
        placa_cavalo: c.placa_cavalo,
        placa_carreta: c.placa_carreta,
        tipo_veiculo: c.tipo_veiculo,
        freteiro_nome: c.freteiro_nome,
        fornecedor_nome: c.fornecedor_nome,
        origem_cidade: c.origem_cidade,
        origem_uf: c.origem_uf,
        is_triangular: Boolean(c.is_triangular),
        intermediador_nome: c.intermediador_nome,
        destino_empresa_nome: c.destino_empresa_nome,
        destino_cidade: c.destino_cidade,
        destino_uf: c.destino_uf,
        tipo_carga: c.tipo_carga,
        valor_combinado_kg: c.valor_combinado_kg,
        peso_estimado_kg: c.peso_estimado_kg,
        valor_frete_estimado: c.valor_frete_estimado,
        peso_real_kg: c.peso_real_kg,
        valor_frete_motorista_real: c.valor_frete_motorista_real,
        valor_cte_total: c.valor_cte_total,
        valor_por_fora: c.valor_por_fora,
        status: c.status,
        data_inclusao: c.data_inclusao,
        data_inclusao_formatada: c.data_inclusao_formatada,
        tempo_decorrido: c.tempo_decorrido,
        hora_inclusao: c.hora_inclusao
      });
    }

    const mapa_cidades = Array.from(mapaCidadesMap.values());

    // Métricas para os Cards
    const totalCarregando = carregamentos.filter(c => c.status === 'carregando').length;
    const totalAguardandoCte = carregamentos.filter(c => c.status === 'aguardando_cte').length;
    const totalConcluidos = carregamentos.filter(c => c.status === 'concluido').length;
    const totalCidadesAtivas = mapa_cidades.length;
    const totalPesoEstimado = ativosParaMapa.reduce((acc, c) => acc + (Number(c.peso_estimado_kg) || 0), 0);
    const totalValorEstimado = ativosParaMapa.reduce((acc, c) => acc + (Number(c.valor_frete_estimado) || 0), 0);

    return res.json({
      carregamentos,
      mapa_cidades,
      metricas: {
        total_geral: carregamentos.length,
        total_carregando: totalCarregando,
        total_aguardando_cte: totalAguardandoCte,
        total_concluidos: totalConcluidos,
        total_cidades_ativas: totalCidadesAtivas,
        total_peso_estimado_ton: Number((totalPesoEstimado / 1000).toFixed(2)),
        total_valor_estimado: Number(totalValorEstimado.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Erro ao listar carregamentos:', error);
    return res.status(500).json({ error: 'Erro ao listar carregamentos: ' + error.message });
  }
};

/**
 * 2. Obter Detalhes de um Carregamento
 */
const getCarregamentoById = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);
    const empIdStr = String(empresaId);

    const carregamento = db.prepare(`
      SELECT c.*,
        f.id as frete_id,
        f.numero_cte as frete_numero_cte,
        f.chave_cte as frete_chave_cte,
        f.valor_frete_venda,
        f.valor_frete_compra
      FROM carregamentos c
      LEFT JOIN fretes f ON c.frete_id = f.id
      WHERE c.id = ? AND (c.empresa_id = ? OR c.empresa_id = ?)
    `).get(id, empIdNum, empIdStr);

    if (!carregamento) {
      return res.status(404).json({ error: 'Carregamento não encontrado.' });
    }

    const { dataFormatada, tempoDecorrido, horaMin } = formatDataHoraHumana(carregamento.data_inclusao);

    return res.json({
      ...carregamento,
      data_inclusao_formatada: dataFormatada,
      tempo_decorrido: tempoDecorrido,
      hora_inclusao: horaMin
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar carregamento: ' + error.message });
  }
};

/**
 * 3. Criar Novo Carregamento
 */
const createCarregamento = (req, res) => {
  try {
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const data = req.body;

    // Validação básica dos campos obrigatórios
    if (!data.motorista_nome || !data.placa_cavalo) {
      return res.status(400).json({ error: 'Nome do motorista e Placa do cavalo são obrigatórios.' });
    }
    if (!data.fornecedor_nome || !data.origem_cidade) {
      return res.status(400).json({ error: 'Empresa fornecedora e Cidade de origem são obrigatórias.' });
    }
    if (!data.destino_empresa_nome || !data.destino_cidade) {
      return res.status(400).json({ error: 'Empresa de destino e Cidade de destino são obrigatórias.' });
    }

    const origemCidade = String(data.origem_cidade).trim();
    const origemUf = String(data.origem_uf || 'SC').trim().toUpperCase();

    // Resolver coordenadas para o Mapa (ex: Mafra/SC -> lat: -26.1158, lng: -49.8053)
    let lat = Number(data.latitude) || null;
    let lng = Number(data.longitude) || null;
    if (!lat || !lng) {
      const coords = getCityCoordinates(origemCidade, origemUf);
      lat = coords.lat;
      lng = coords.lng;
    }

    // Cálculo comercial de frete estimado
    const valorKg = Number(data.valor_combinado_kg) || 0;
    const pesoEst = Number(data.peso_estimado_kg) || 0;
    let freteEst = Number(data.valor_frete_estimado) || 0;
    if (valorKg > 0 && pesoEst > 0 && (!freteEst || freteEst === 0)) {
      freteEst = Number((valorKg * pesoEst).toFixed(2));
    }

    const dataInclusao = data.data_inclusao || new Date().toISOString().replace('T', ' ').slice(0, 19);

    const stmt = db.prepare(`
      INSERT INTO carregamentos (
        empresa_id, status,
        motorista_id, motorista_nome, motorista_cpf, motorista_telefone,
        placa_cavalo, placa_carreta, tipo_veiculo, freteiro_nome, freteiro_documento,
        fornecedor_id, fornecedor_nome, origem_cidade, origem_uf, origem_endereco,
        latitude, longitude,
        is_triangular, intermediador_id, intermediador_nome, intermediador_cnpj,
        intermediador_cidade, intermediador_uf, valor_repasse_combinado,
        destino_cliente_id, destino_empresa_nome, destino_cidade, destino_uf,
        tipo_carga, tipo_negociacao, valor_combinado_kg, peso_estimado_kg,
        valor_frete_estimado, valor_adiantamento_combinado,
        data_inclusao, previsao_saida, observacoes
      ) VALUES (
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?
      )
    `);

    const result = stmt.run(
      empresaId,
      data.status || 'carregando',
      data.motorista_id || null,
      data.motorista_nome.trim(),
      data.motorista_cpf || null,
      data.motorista_telefone || null,
      data.placa_cavalo.trim().toUpperCase(),
      data.placa_carreta ? data.placa_carreta.trim().toUpperCase() : null,
      data.tipo_veiculo || 'Carreta LS',
      data.freteiro_nome || data.motorista_nome.trim(),
      data.freteiro_documento || data.motorista_cpf || null,
      data.fornecedor_id || null,
      data.fornecedor_nome.trim(),
      origemCidade,
      origemUf,
      data.origem_endereco || null,
      lat,
      lng,
      data.is_triangular ? 1 : 0,
      data.intermediador_id || null,
      data.intermediador_nome ? data.intermediador_nome.trim() : null,
      data.intermediador_cnpj || null,
      data.intermediador_cidade || null,
      data.intermediador_uf || null,
      Number(data.valor_repasse_combinado) || 0,
      data.destino_cliente_id || null,
      data.destino_empresa_nome.trim(),
      data.destino_cidade.trim(),
      (data.destino_uf || 'PR').trim().toUpperCase(),
      data.tipo_carga || 'Soja a Granel',
      data.tipo_negociacao || 'por_kg',
      valorKg,
      pesoEst,
      freteEst,
      Number(data.valor_adiantamento_combinado) || 0,
      dataInclusao,
      data.previsao_saida || null,
      data.observacoes || null
    );

    const insertedId = Number(result.lastInsertRowid);
    const created = db.prepare('SELECT * FROM carregamentos WHERE id = ?').get(insertedId);

    return res.status(201).json({
      message: 'Carregamento iniciado com sucesso e adicionado ao Mapa!',
      carregamento: created
    });
  } catch (error) {
    console.error('Erro ao criar carregamento:', error);
    return res.status(500).json({ error: 'Erro ao criar carregamento: ' + error.message });
  }
};

/**
 * 4. Atualizar Carregamento
 */
const updateCarregamento = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const data = req.body;

    const existing = db.prepare('SELECT * FROM carregamentos WHERE id = ? AND empresa_id = ?').get(id, empresaId);
    if (!existing) {
      return res.status(404).json({ error: 'Carregamento não encontrado.' });
    }

    const origemCidade = data.origem_cidade ? String(data.origem_cidade).trim() : existing.origem_cidade;
    const origemUf = data.origem_uf ? String(data.origem_uf).trim().toUpperCase() : existing.origem_uf;

    let lat = Number(data.latitude) || existing.latitude;
    let lng = Number(data.longitude) || existing.longitude;
    if (origemCidade !== existing.origem_cidade || origemUf !== existing.origem_uf || !lat || !lng) {
      const coords = getCityCoordinates(origemCidade, origemUf);
      lat = coords.lat;
      lng = coords.lng;
    }

    const valorKg = data.valor_combinado_kg !== undefined ? Number(data.valor_combinado_kg) : existing.valor_combinado_kg;
    const pesoEst = data.peso_estimado_kg !== undefined ? Number(data.peso_estimado_kg) : existing.peso_estimado_kg;
    let freteEst = data.valor_frete_estimado !== undefined ? Number(data.valor_frete_estimado) : existing.valor_frete_estimado;
    if (valorKg > 0 && pesoEst > 0 && (!freteEst || freteEst === 0)) {
      freteEst = Number((valorKg * pesoEst).toFixed(2));
    }

    db.prepare(`
      UPDATE carregamentos SET
        status = ?,
        motorista_id = ?,
        motorista_nome = ?,
        motorista_cpf = ?,
        motorista_telefone = ?,
        placa_cavalo = ?,
        placa_carreta = ?,
        tipo_veiculo = ?,
        freteiro_nome = ?,
        freteiro_documento = ?,
        fornecedor_id = ?,
        fornecedor_nome = ?,
        origem_cidade = ?,
        origem_uf = ?,
        origem_endereco = ?,
        latitude = ?,
        longitude = ?,
        is_triangular = ?,
        intermediador_id = ?,
        intermediador_nome = ?,
        intermediador_cnpj = ?,
        intermediador_cidade = ?,
        intermediador_uf = ?,
        valor_repasse_combinado = ?,
        destino_cliente_id = ?,
        destino_empresa_nome = ?,
        destino_cidade = ?,
        destino_uf = ?,
        tipo_carga = ?,
        tipo_negociacao = ?,
        valor_combinado_kg = ?,
        peso_estimado_kg = ?,
        valor_frete_estimado = ?,
        valor_adiantamento_combinado = ?,
        previsao_saida = ?,
        observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(
      data.status || existing.status,
      data.motorista_id !== undefined ? data.motorista_id : existing.motorista_id,
      data.motorista_nome ? data.motorista_nome.trim() : existing.motorista_nome,
      data.motorista_cpf !== undefined ? data.motorista_cpf : existing.motorista_cpf,
      data.motorista_telefone !== undefined ? data.motorista_telefone : existing.motorista_telefone,
      data.placa_cavalo ? data.placa_cavalo.trim().toUpperCase() : existing.placa_cavalo,
      data.placa_carreta !== undefined ? (data.placa_carreta ? data.placa_carreta.trim().toUpperCase() : null) : existing.placa_carreta,
      data.tipo_veiculo || existing.tipo_veiculo,
      data.freteiro_nome || existing.freteiro_nome,
      data.freteiro_documento !== undefined ? data.freteiro_documento : existing.freteiro_documento,
      data.fornecedor_id !== undefined ? data.fornecedor_id : existing.fornecedor_id,
      data.fornecedor_nome ? data.fornecedor_nome.trim() : existing.fornecedor_nome,
      origemCidade,
      origemUf,
      data.origem_endereco !== undefined ? data.origem_endereco : existing.origem_endereco,
      lat,
      lng,
      data.is_triangular !== undefined ? (data.is_triangular ? 1 : 0) : existing.is_triangular,
      data.intermediador_id !== undefined ? data.intermediador_id : existing.intermediador_id,
      data.intermediador_nome !== undefined ? data.intermediador_nome : existing.intermediador_nome,
      data.intermediador_cnpj !== undefined ? data.intermediador_cnpj : existing.intermediador_cnpj,
      data.intermediador_cidade !== undefined ? data.intermediador_cidade : existing.intermediador_cidade,
      data.intermediador_uf !== undefined ? data.intermediador_uf : existing.intermediador_uf,
      data.valor_repasse_combinado !== undefined ? Number(data.valor_repasse_combinado) : existing.valor_repasse_combinado,
      data.destino_cliente_id !== undefined ? data.destino_cliente_id : existing.destino_cliente_id,
      data.destino_empresa_nome ? data.destino_empresa_nome.trim() : existing.destino_empresa_nome,
      data.destino_cidade ? data.destino_cidade.trim() : existing.destino_cidade,
      data.destino_uf ? data.destino_uf.trim().toUpperCase() : existing.destino_uf,
      data.tipo_carga !== undefined ? data.tipo_carga : existing.tipo_carga,
      data.tipo_negociacao || existing.tipo_negociacao,
      valorKg,
      pesoEst,
      freteEst,
      data.valor_adiantamento_combinado !== undefined ? Number(data.valor_adiantamento_combinado) : existing.valor_adiantamento_combinado,
      data.previsao_saida !== undefined ? data.previsao_saida : existing.previsao_saida,
      data.observacoes !== undefined ? data.observacoes : existing.observacoes,
      id,
      empresaId
    );

    const updated = db.prepare('SELECT * FROM carregamentos WHERE id = ?').get(id);
    return res.json({ message: 'Carregamento atualizado com sucesso!', carregamento: updated });
  } catch (error) {
    console.error('Erro ao atualizar carregamento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar: ' + error.message });
  }
};

/**
 * 5. Excluir Carregamento
 */
const deleteCarregamento = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;

    const existing = db.prepare('SELECT * FROM carregamentos WHERE id = ? AND empresa_id = ?').get(id, empresaId);
    if (!existing) {
      return res.status(404).json({ error: 'Carregamento não encontrado.' });
    }

    db.prepare('DELETE FROM carregamentos WHERE id = ? AND empresa_id = ?').run(id, empresaId);
    return res.json({ message: 'Carregamento removido com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir carregamento: ' + error.message });
  }
};

/**
 * 6. IMPORTAÇÃO DO XML DO CT-E & LANÇAMENTO AUTOMÁTICO NO FINANCEIRO
 * 
 * Quando o CT-e fica pronto (ou 2 CT-es no caso de venda triangular):
 * - O usuário importa o XML
 * - O sistema extrai: número, chave, peso real da balança (kg), valores dos CT-es
 * - Recalcula o frete real do motorista: peso_real_kg * carregamento.valor_combinado_kg
 * - Calcula o repasse da empresa intermediadora (se venda triangular)
 * - Cria o registro oficial na tabela `fretes`
 * - Lança os títulos automaticamente no Contas a Pagar e Contas a Receber (`financeiro_titulos`)
 * - Atualiza o status do carregamento para 'concluido'
 */
const importarCteCarregamento = (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId || req.user?.empresa_id || 1;
    const empIdNum = Number(empresaId);

    const carregamento = db.prepare('SELECT * FROM carregamentos WHERE id = ? AND empresa_id = ?').get(id, empIdNum);
    if (!carregamento) {
      return res.status(404).json({ error: 'Carregamento não encontrado.' });
    }

    let xmlContent1 = '';
    let xmlContent2 = '';

    // Arquivos via Multer
    if (req.files) {
      if (Array.isArray(req.files) && req.files.length > 0) {
        xmlContent1 = req.files[0].buffer.toString('utf-8');
        if (req.files.length > 1) {
          xmlContent2 = req.files[1].buffer.toString('utf-8');
        }
      } else if (req.files.xml_1 || req.files.xml_2) {
        if (req.files.xml_1 && req.files.xml_1[0]) xmlContent1 = req.files.xml_1[0].buffer.toString('utf-8');
        if (req.files.xml_2 && req.files.xml_2[0]) xmlContent2 = req.files.xml_2[0].buffer.toString('utf-8');
      }
    } else if (req.file) {
      xmlContent1 = req.file.buffer.toString('utf-8');
    }

    // Texto XML via Body
    if (!xmlContent1 && req.body.xml) xmlContent1 = req.body.xml;
    if (!xmlContent1 && req.body.xml_1) xmlContent1 = req.body.xml_1;
    if (!xmlContent2 && req.body.xml_2) xmlContent2 = req.body.xml_2;

    if (!xmlContent1) {
      return res.status(400).json({ error: 'Por favor, selecione ou envie o arquivo XML do CT-e emitido.' });
    }

    // Parse do CT-e 1
    const parseResult1 = parseCteXml(xmlContent1);
    if (!parseResult1.success) {
      return res.status(400).json({ error: 'Erro ao processar o XML do CT-e 1: ' + parseResult1.error });
    }
    const cte1 = parseResult1.data;

    // Parse do CT-e 2 (se enviado ou se venda triangular)
    let cte2 = null;
    if (xmlContent2) {
      const parseResult2 = parseCteXml(xmlContent2);
      if (parseResult2.success) {
        cte2 = parseResult2.data;
      }
    }

    // 1. Extração do Peso Real da Balança
    const pesoCte1 = Number(cte1.peso_kg) || Number(cte1.carga_peso) || 0;
    const pesoCte2 = cte2 ? (Number(cte2.peso_kg) || Number(cte2.carga_peso) || 0) : 0;
    const pesoRealKg = (pesoCte1 + pesoCte2) > 0 ? (pesoCte1 + pesoCte2) : (carregamento.peso_estimado_kg || 0);

    // 2. Valores dos CT-es de Venda
    const valorCte1 = Number(cte1.valor_frete_venda) || Number(cte1.valor_total) || 0;
    const valorCte2 = cte2 ? (Number(cte2.valor_frete_venda) || Number(cte2.valor_total) || 0) : 0;
    const valorCteTotal = Number((valorCte1 + valorCte2).toFixed(2));

    // 3. Recalcular Frete Real do Motorista / Freteiro
    const valorKg = Number(carregamento.valor_combinado_kg) || 0;
    let valorFreteMotoristaReal = 0;
    if (valorKg > 0 && pesoRealKg > 0) {
      valorFreteMotoristaReal = Number((valorKg * pesoRealKg).toFixed(2));
    } else {
      valorFreteMotoristaReal = Number(carregamento.valor_frete_estimado) || Number(cte1.valor_frete_compra) || valorCte1;
    }

    // 4. Cálculo do VALOR POR FORA (Complemento entre o Frete Real Total e o Valor Fiscal do CT-e)
    const valorPorFora = Number(Math.max(0, valorFreteMotoristaReal - valorCteTotal).toFixed(2));
    const valorEstimadoInicial = Number(carregamento.valor_frete_estimado) || Number(((carregamento.peso_estimado_kg || 0) * valorKg).toFixed(2));

    // 5. Tratamento de Venda Triangular / Repasse ao Intermediador
    const isTriangular = Boolean(carregamento.is_triangular || cte2 || carregamento.intermediador_nome);
    let valorRepasse = 0;
    if (isTriangular) {
      if (carregamento.valor_repasse_combinado > 0) {
        valorRepasse = Number(carregamento.valor_repasse_combinado);
      } else if (valorCte2 > 0) {
        // No padrão de venda triangular brasileira, o 2º CT-e representa frequentemente o frete de repasse da venda triangular
        valorRepasse = valorCte2;
      } else {
        // Margem estimada de repasse
        valorRepasse = Math.max(0, Number((valorCteTotal - valorFreteMotoristaReal).toFixed(2)));
      }
    }

    const valorAdiantamento = Number(carregamento.valor_adiantamento_combinado) || 0;
    const valorSaldoMotorista = Math.max(0, Number((valorFreteMotoristaReal - valorAdiantamento).toFixed(2)));

    // Lucro / Margem da Empresa
    const valorComissao = Number((valorCteTotal - valorFreteMotoristaReal - (isTriangular ? valorRepasse : 0)).toFixed(2));
    const percentualMargem = valorCteTotal > 0 ? Number(((valorComissao / valorCteTotal) * 100).toFixed(1)) : 0;

    // Buscar ou vincular cliente tomador
    let clienteNome = cte1.cliente_nome || carregamento.destino_empresa_nome;
    let clienteCnpj = cte1.cliente_cnpj || null;

    // 6. Inserir na tabela `fretes` oficial do SisFrete PRO com valor_por_fora
    const insertFreteStmt = db.prepare(`
      INSERT INTO fretes (
        empresa_id, tipo_operacao, origem_registro,
        numero_cte, serie_cte, chave_cte, data_emissao,
        cliente_id, cliente_nome, cliente_cnpj,
        motorista_id, motorista_nome, placa_veiculo, placa_carreta,
        origem_cidade, origem_uf, destino_cidade, destino_uf,
        tipo_carga, peso_kg, valor_mercadoria,
        numero_cte_2, serie_cte_2, chave_cte_2, cliente_nome_2, cliente_cnpj_2, valor_frete_venda_2, peso_kg_2,
        valor_frete_venda, valor_frete_compra, valor_frete_real, valor_por_fora,
        valor_comissao, percentual_margem, valor_repasse,
        valor_adiantamento, valor_saldo_motorista,
        status_frete, status_pagamento_motorista, status_recebimento_cliente,
        xml_bruto, observacoes
      ) VALUES (
        ?, ?, 'carregamento_cte',
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        'em_transito', ?, 'pendente',
        ?, ?
      )
    `);

    const freteResult = insertFreteStmt.run(
      empresaId,
      isTriangular ? 'triangular' : 'padrao',
      cte1.numero_cte || 'S/N',
      cte1.serie_cte || '1',
      cte1.chave_cte || '',
      cte1.data_emissao || new Date().toISOString().slice(0, 10),
      carregamento.destino_cliente_id || null,
      clienteNome,
      clienteCnpj,
      carregamento.motorista_id || null,
      carregamento.motorista_nome,
      carregamento.placa_cavalo,
      carregamento.placa_carreta,
      carregamento.origem_cidade,
      carregamento.origem_uf,
      carregamento.destino_cidade,
      carregamento.destino_uf,
      carregamento.tipo_carga || cte1.tipo_carga || 'Carga Geral',
      pesoRealKg,
      Number(cte1.valor_mercadoria) || 0,
      cte2 ? cte2.numero_cte : (carregamento.numero_cte_2 || null),
      cte2 ? cte2.serie_cte : (carregamento.serie_cte_2 || null),
      cte2 ? cte2.chave_cte : (carregamento.chave_cte_2 || null),
      cte2 ? (cte2.cliente_nome || carregamento.intermediador_nome) : (carregamento.intermediador_nome || null),
      cte2 ? cte2.cliente_cnpj : (carregamento.intermediador_cnpj || null),
      valorCte2,
      pesoCte2,
      valorCte1,
      valorFreteMotoristaReal,
      valorFreteMotoristaReal,
      valorPorFora,
      valorComissao,
      percentualMargem,
      valorRepasse,
      valorAdiantamento,
      valorSaldoMotorista,
      valorAdiantamento > 0 ? 'adiantamento_pago' : 'pendente',
      xmlContent1,
      `Origem: Carregamento #${carregamento.id} (${carregamento.fornecedor_nome} - ${carregamento.origem_cidade}/${carregamento.origem_uf}). Combinado: R$ ${valorKg}/kg. CT-e Fiscal: R$ ${valorCteTotal.toFixed(2)} | Por Fora: R$ ${valorPorFora.toFixed(2)}.`
    );

    const novoFreteId = Number(freteResult.lastInsertRowid);

    // Se houve adiantamento no carregamento, registrar na tabela adiantamentos_historico
    if (valorAdiantamento > 0) {
      try {
        db.prepare(`
          INSERT INTO adiantamentos_historico (
            empresa_id, frete_id, tipo, valor, data_pagamento, forma_pagamento, observacoes
          ) VALUES (?, ?, 'adiantamento', ?, DATE('now'), 'PIX', 'Adiantamento lançado no carregamento')
        `).run(empresaId, novoFreteId, valorAdiantamento);
      } catch (e) {}
    }

    // 7. Lançamento Automático no Módulo FINANCEIRO (`financeiro_titulos`)
    const dataVencimentoPadrao = new Date();
    dataVencimentoPadrao.setDate(dataVencimentoPadrao.getDate() + 3);
    const dataVencStr = dataVencimentoPadrao.toISOString().slice(0, 10);

    // 7.1 TÍTULO A PAGAR: Motorista / Freteiro (Valor Real do Frete com discriminação CT-e vs Por Fora)
    const descTituloMotorista = valorPorFora > 0
      ? `Frete CT-e Nº ${cte1.numero_cte || 'S/N'} - Motorista: ${carregamento.motorista_nome} (${carregamento.placa_cavalo}) - Total Real: R$ ${valorFreteMotoristaReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (CT-e: R$ ${valorCteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + Por Fora: R$ ${valorPorFora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) - ${pesoRealKg.toLocaleString('pt-BR')} kg @ R$ ${valorKg}/kg`
      : `Frete CT-e Nº ${cte1.numero_cte || 'S/N'} - Motorista: ${carregamento.motorista_nome} (${carregamento.placa_cavalo}) - ${pesoRealKg.toLocaleString('pt-BR')} kg @ R$ ${valorKg}/kg`;

    db.prepare(`
      INSERT INTO financeiro_titulos (
        empresa_id, tipo, origem, frete_id, categoria, categoria_nome,
        descricao, pessoa_nome, pessoa_documento, valor, valor_pago,
        data_emissao, data_vencimento, status, forma_pagamento, observacoes
      ) VALUES (
        ?, 'pagar', 'frete_cte', ?, 'frete_motorista', 'Frete a Pagar (Motorista/Freteiro)',
        ?, ?, ?, ?, ?,
        DATE('now'), ?, ?, 'PIX', ?
      )
    `).run(
      empresaId,
      novoFreteId,
      descTituloMotorista,
      carregamento.motorista_nome,
      carregamento.motorista_cpf,
      valorFreteMotoristaReal,
      valorAdiantamento,
      dataVencStr,
      valorSaldoMotorista <= 0 ? 'pago' : (valorAdiantamento > 0 ? 'parcial' : 'pendente'),
      `Gerado pelo Carregamento #${carregamento.id}. Balança: ${pesoRealKg.toLocaleString('pt-BR')} kg @ R$ ${valorKg}/kg. CT-e Fiscal: R$ ${valorCteTotal.toFixed(2)}. Por Fora: R$ ${valorPorFora.toFixed(2)}.`
    );

    // 7.2 TÍTULO A PAGAR (Se Triangular): Repasse à Empresa Intermediadora
    if (isTriangular && valorRepasse > 0) {
      db.prepare(`
        INSERT INTO financeiro_titulos (
          empresa_id, tipo, origem, frete_id, categoria, categoria_nome,
          descricao, pessoa_nome, pessoa_documento, valor, valor_pago,
          data_emissao, data_vencimento, status, forma_pagamento, observacoes
        ) VALUES (
          ?, 'pagar', 'frete_cte', ?, 'repasse_agenciamento', 'Repasse Venda Triangular',
          ?, ?, ?, ?, 0,
          DATE('now'), ?, 'pendente', 'PIX', ?
        )
      `).run(
        empresaId,
        novoFreteId,
        `Repasse Venda Triangular - Intermediadora: ${carregamento.intermediador_nome || 'Parceiro'} (Ref CT-e Nº ${cte1.numero_cte || 'S/N'})`,
        carregamento.intermediador_nome || 'Intermediador Triangular',
        carregamento.intermediador_cnpj || null,
        valorRepasse,
        dataVencStr,
        `Repasse comercial de venda triangular gerado pelo Carregamento #${carregamento.id}.`
      );
    }

    // 7.3 TÍTULO A RECEBER: Faturamento de CT-e dos Clientes Tomadores
    if (valorCteTotal > 0) {
      db.prepare(`
        INSERT INTO financeiro_titulos (
          empresa_id, tipo, origem, frete_id, categoria, categoria_nome,
          descricao, pessoa_nome, pessoa_documento, valor, valor_pago,
          data_emissao, data_vencimento, status, forma_pagamento, observacoes
        ) VALUES (
          ?, 'receber', 'frete_cte', ?, 'faturamento_frete', 'Recebimento de CT-e (Tomador)',
          ?, ?, ?, ?, 0,
          DATE('now'), ?, 'pendente', 'Boleto / PIX', ?
        )
      `).run(
        empresaId,
        novoFreteId,
        `Faturamento CT-e Nº ${cte1.numero_cte || 'S/N'}${cte2 ? ' + Nº ' + cte2.numero_cte : ''} (${clienteNome})`,
        clienteNome,
        clienteCnpj,
        valorCteTotal,
        dataVencStr,
        `Lançamento automático de receita de frete gerado pelo Carregamento #${carregamento.id}.`
      );
    }

    // 8. Atualizar status do Carregamento para 'concluido' com valor_por_fora
    db.prepare(`
      UPDATE carregamentos SET
        status = 'concluido',
        frete_id = ?,
        numero_cte = ?,
        chave_cte = ?,
        numero_cte_2 = ?,
        chave_cte_2 = ?,
        peso_real_kg = ?,
        valor_frete_motorista_real = ?,
        valor_cte_total = ?,
        valor_repasse_real = ?,
        valor_por_fora = ?,
        data_cte_importado = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(
      novoFreteId,
      cte1.numero_cte || 'S/N',
      cte1.chave_cte || null,
      cte2 ? cte2.numero_cte : null,
      cte2 ? cte2.chave_cte : null,
      pesoRealKg,
      valorFreteMotoristaReal,
      valorCteTotal,
      valorRepasse,
      valorPorFora,
      id,
      empIdNum
    );

    const carregamentoAtualizado = db.prepare('SELECT * FROM carregamentos WHERE id = ?').get(id);

    return res.json({
      message: '🎉 CT-e importado com sucesso e lançado perfeitamente no Financeiro!',
      carregamento: carregamentoAtualizado,
      frete_id: novoFreteId,
      calculos: {
        peso_estimado_kg: Number(carregamento.peso_estimado_kg) || 0,
        peso_real_kg: pesoRealKg,
        valor_combinado_kg: valorKg,
        valor_frete_estimado: valorEstimadoInicial,
        valor_frete_motorista_real: valorFreteMotoristaReal,
        valor_cte_total: valorCteTotal,
        valor_por_fora: valorPorFora,
        valor_adiantamento: valorAdiantamento,
        valor_saldo_motorista: valorSaldoMotorista,
        valor_repasse_intermediadora: valorRepasse,
        lucro_comissao_empresa: valorComissao,
        percentual_margem: percentualMargem,
        is_triangular: isTriangular
      }
    });

  } catch (error) {
    console.error('Erro ao importar CT-e para carregamento:', error);
    return res.status(500).json({ error: 'Erro ao processar importação do CT-e: ' + error.message });
  }
};

module.exports = {
  uploadCteXml,
  listCarregamentos,
  getCarregamentoById,
  createCarregamento,
  updateCarregamento,
  deleteCarregamento,
  importarCteCarregamento
};
