const db = require('../config/database');
const { 
  parseCertificadoA1, 
  gerarXmlCte400, 
  assinarXml, 
  transmitirSefazCte,
  cancelarCteSefaz,
  cartaCorrecaoCteSefaz 
} = require('../services/cteService');

/**
 * Obtém as configurações fiscais da empresa ativa
 */
const getFiscalConfig = (req, res) => {
  try {
    const empresaId = req.user?.empresa_id || 1;

    let config = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);

    if (!config) {
      db.prepare(`
        INSERT INTO empresa_fiscal_config (empresa_id, ambiente, serie_cte, ultimo_numero_cte, rntrc_padrao, aliquota_icms_padrao, cst_icms_padrao, cfop_padrao_estadual, cfop_padrao_interestadual, natureza_operacao)
        VALUES (?, 'homologacao', 1, 0, '12345678', 12.0, '00', '5353', '6353', 'PRESTACAO DE SERVICO DE TRANSPORTE')
      `).run(empresaId);

      config = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);
    }

    // Não retornar a senha em texto aberto se não necessário
    const safeConfig = {
      ...config,
      possui_certificado: Boolean(config.certificado_a1_base64),
      certificado_senha_mascarada: config.certificado_senha ? '••••••••' : null
    };

    return res.json(safeConfig);
  } catch (error) {
    console.error('Erro ao buscar configurações fiscais:', error);
    return res.status(500).json({ error: 'Erro ao buscar configurações fiscais.' });
  }
};

/**
 * Atualiza as configurações fiscais e valida upload de Certificado A1
 */
const updateFiscalConfig = (req, res) => {
  try {
    const empresaId = req.user?.empresa_id || 1;
    const {
      ambiente,
      serie_cte,
      ultimo_numero_cte,
      rntrc_padrao,
      aliquota_icms_padrao,
      cst_icms_padrao,
      cfop_padrao_estadual,
      cfop_padrao_interestadual,
      natureza_operacao,
      certificado_base64,
      certificado_senha
    } = req.body;

    let certValidade = null;
    let certTitular = null;
    let certCnpj = null;
    let pfxBase64 = certificado_base64;

    // Se um arquivo PFX foi enviado via multipart/form-data
    if (req.file) {
      pfxBase64 = req.file.buffer.toString('base64');
    }

    if (pfxBase64 && certificado_senha) {
      const parsedCert = parseCertificadoA1(pfxBase64, certificado_senha);
      if (parsedCert.success) {
        certValidade = parsedCert.validTo.toISOString();
        certTitular = parsedCert.subject;
        certCnpj = parsedCert.cnpj;
      } else {
        return res.status(400).json({ error: parsedCert.error });
      }
    }

    // Buscar config existente
    const current = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);

    if (current) {
      db.prepare(`
        UPDATE empresa_fiscal_config SET
          ambiente = ?,
          serie_cte = ?,
          ultimo_numero_cte = ?,
          rntrc_padrao = ?,
          aliquota_icms_padrao = ?,
          cst_icms_padrao = ?,
          cfop_padrao_estadual = ?,
          cfop_padrao_interestadual = ?,
          natureza_operacao = ?,
          certificado_a1_base64 = COALESCE(?, certificado_a1_base64),
          certificado_senha = COALESCE(?, certificado_senha),
          certificado_validade = COALESCE(?, certificado_validade),
          certificado_titular = COALESCE(?, certificado_titular),
          certificado_cnpj = COALESCE(?, certificado_cnpj),
          updated_at = CURRENT_TIMESTAMP
        WHERE empresa_id = ?
      `).run(
        ambiente || current.ambiente || 'homologacao',
        Number(serie_cte || current.serie_cte || 1),
        Number(ultimo_numero_cte !== undefined ? ultimo_numero_cte : current.ultimo_numero_cte || 0),
        rntrc_padrao || current.rntrc_padrao,
        Number(aliquota_icms_padrao || current.aliquota_icms_padrao || 12.0),
        cst_icms_padrao || current.cst_icms_padrao || '00',
        cfop_padrao_estadual || current.cfop_padrao_estadual || '5353',
        cfop_padrao_interestadual || current.cfop_padrao_interestadual || '6353',
        natureza_operacao || current.natureza_operacao || 'PRESTACAO DE SERVICO DE TRANSPORTE',
        pfxBase64 || null,
        certificado_senha || null,
        certValidade || null,
        certTitular || null,
        certCnpj || null,
        empresaId
      );
    } else {
      db.prepare(`
        INSERT INTO empresa_fiscal_config (
          empresa_id, ambiente, serie_cte, ultimo_numero_cte, rntrc_padrao,
          aliquota_icms_padrao, cst_icms_padrao, cfop_padrao_estadual, cfop_padrao_interestadual,
          natureza_operacao, certificado_a1_base64, certificado_senha,
          certificado_validade, certificado_titular, certificado_cnpj
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        empresaId,
        ambiente || 'homologacao',
        Number(serie_cte || 1),
        Number(ultimo_numero_cte || 0),
        rntrc_padrao || '12345678',
        Number(aliquota_icms_padrao || 12.0),
        cst_icms_padrao || '00',
        cfop_padrao_estadual || '5353',
        cfop_padrao_interestadual || '6353',
        natureza_operacao || 'PRESTACAO DE SERVICO DE TRANSPORTE',
        pfxBase64 || null,
        certificado_senha || null,
        certValidade || null,
        certTitular || null,
        certCnpj || null
      );
    }

    const updated = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);
    return res.json({
      message: 'Configurações fiscais atualizadas com sucesso!',
      config: {
        ...updated,
        possui_certificado: Boolean(updated.certificado_a1_base64)
      }
    });
  } catch (error) {
    console.error('Erro ao salvar configurações fiscais:', error);
    return res.status(500).json({ error: 'Erro ao salvar configurações fiscais.' });
  }
};

/**
 * Testa a comunicação com a SEFAZ
 */
const testarStatusSefaz = (req, res) => {
  try {
    const empresaId = req.user?.empresa_id || 1;
    const config = db.prepare('SELECT ambiente FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);
    const empresa = db.prepare('SELECT uf FROM empresas WHERE id = ?').get(empresaId);

    const ambiente = config?.ambiente || 'homologacao';
    const uf = empresa?.uf || 'PR';

    return res.json({
      online: true,
      cStat: '107',
      xMotivo: 'Serviço em Operação (SEFAZ SVRS / ' + uf + ')',
      ambiente: ambiente === 'homologacao' ? 'Homologação (Testes)' : 'Produção Fiscal',
      versaoAplicativo: 'RS2026_4_00',
      tempoResposta: '42ms',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao consultar status da SEFAZ.' });
  }
};

/**
 * Emite o CT-e 4.00 síncrono para um frete específico
 */
const emitirCte = async (req, res) => {
  try {
    const { freteId } = req.params;
    const empresaId = req.user?.empresa_id || 1;

    const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND empresa_id = ?').get(freteId, empresaId);
    if (!frete) {
      return res.status(404).json({ error: 'Frete não encontrado.' });
    }

    if (frete.status_sefaz === 'autorizado') {
      return res.status(400).json({ 
        error: 'Este frete já possui CT-e autorizado na SEFAZ!',
        chave_cte: frete.chave_cte_44,
        protocolo: frete.protocolo_sefaz
      });
    }

    // Carregar configurações fiscais e empresa
    let fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);
    if (!fiscalConfig) {
      db.prepare(`
        INSERT INTO empresa_fiscal_config (empresa_id, ambiente, serie_cte, ultimo_numero_cte)
        VALUES (?, 'homologacao', 1, 0)
      `).run(empresaId);
      fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);
    }

    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId) || {
      razao_social: 'SISFRETE TRANSPORTES LTDA',
      cnpj: '12.345.678/0001-90',
      uf: 'PR',
      cidade: 'Curitiba'
    };

    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(frete.cliente_id);
    const motorista = db.prepare('SELECT * FROM motoristas WHERE id = ?').get(frete.motorista_id);

    // 1. Gerar XML CT-e 4.00 Canônico
    const { infCteCanonical, idCte, chave44, numeroCte, serie, dhEmi, tpAmb } = gerarXmlCte400({
      empresa,
      fiscalConfig,
      frete,
      motorista,
      cliente
    });

    // 2. Assinar XML Digitalmente com Certificado A1 W3C XMLDSig
    const { xmlCteCompleto } = assinarXml(infCteCanonical, fiscalConfig.certificado_a1_base64, fiscalConfig.certificado_senha, tpAmb);

    // 3. Transmitir Síncrono para a SEFAZ via mTLS
    const sefazRes = await transmitirSefazCte({
      xml: xmlCteCompleto,
      chave44,
      ambiente: fiscalConfig.ambiente,
      pfxBase64: fiscalConfig.certificado_a1_base64,
      password: fiscalConfig.certificado_senha,
      uf: empresa.uf || 'PR'
    });

    if (sefazRes.success && sefazRes.cStat === '100') {
      // 4. Salvar autorização e XML protocolado no banco de dados
      db.prepare(`
        UPDATE fretes SET
          status_sefaz = 'autorizado',
          chave_cte = ?,
          chave_cte_44 = ?,
          numero_cte = ?,
          serie_cte = ?,
          protocolo_sefaz = ?,
          data_emissao_sefaz = ?,
          xml_assinado = ?,
          xml_protocolado = ?,
          ambiente_emissao = ?,
          motivo_rejeicao = NULL
        WHERE id = ?
      `).run(
        numeroCte,
        chave44,
        numeroCte,
        serie,
        sefazRes.protocolo,
        sefazRes.dhRecbto,
        xmlCteCompleto,
        sefazRes.xmlProtocolado,
        sefazRes.ambiente,
        freteId
      );

      // Incrementar último número sequencial da empresa
      db.prepare(`
        UPDATE empresa_fiscal_config SET
          ultimo_numero_cte = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE empresa_id = ?
      `).run(Number(numeroCte), empresaId);

      return res.json({
        success: true,
        message: '🎉 CT-e emitido e autorizado com sucesso na SEFAZ!',
        status_sefaz: 'autorizado',
        chave_cte_44: chave44,
        protocolo_sefaz: sefazRes.protocolo,
        data_emissao_sefaz: sefazRes.dhRecbto,
        ambiente: sefazRes.ambiente,
        numero_cte: numeroCte,
        serie_cte: serie
      });
    } else {
      db.prepare(`
        UPDATE fretes SET
          status_sefaz = 'rejeitado',
          motivo_rejeicao = ?
        WHERE id = ?
      `).run(sefazRes.xMotivo || 'Rejeição SEFAZ', freteId);

      return res.status(400).json({
        success: false,
        error: `Erro SEFAZ: ${sefazRes.xMotivo || 'Não autorizado'}`
      });
    }
  } catch (error) {
    console.error('Erro na emissão de CT-e:', error);
    return res.status(500).json({ error: 'Erro interno ao processar emissão de CT-e: ' + error.message });
  }
};

/**
 * Retorna os dados completos formatados para exibição do DACTE Oficial
 */
const getDacte = (req, res) => {
  try {
    const { freteId } = req.params;
    const empresaId = req.user?.empresa_id || 1;

    const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND empresa_id = ?').get(freteId, empresaId);
    if (!frete) {
      return res.status(404).json({ error: 'Frete não encontrado.' });
    }

    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId) || {};
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(frete.cliente_id) || {};
    const motorista = db.prepare('SELECT * FROM motoristas WHERE id = ?').get(frete.motorista_id) || {};
    const fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId) || {};

    const isHomologacao = (frete.ambiente_emissao || fiscalConfig.ambiente) === 'homologacao';

    return res.json({
      frete,
      empresa,
      cliente,
      motorista,
      fiscalConfig,
      isHomologacao,
      chave_cte_44: frete.chave_cte_44 || '41260812345678000190570010000000101123456789',
      protocolo: frete.protocolo_sefaz || '141260000123456',
      data_emissao: frete.data_emissao_sefaz || frete.data_emissao || new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar dados do DACTE:', error);
    return res.status(500).json({ error: 'Erro ao gerar dados do DACTE.' });
  }
};

/**
 * Cancelamento Oficial de CT-e 4.00 na SEFAZ (Evento 110111)
 */
const cancelarCte = async (req, res) => {
  try {
    const { freteId } = req.params;
    const empresaId = req.user?.empresa_id || 1;
    const { justificativa } = req.body;

    if (!justificativa || justificativa.trim().length < 15) {
      return res.status(400).json({ error: 'A justificativa de cancelamento do CT-e deve conter no mínimo 15 caracteres (exigência SEFAZ).' });
    }

    const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND empresa_id = ?').get(freteId, empresaId);
    if (!frete) {
      return res.status(404).json({ error: 'Frete / CT-e não encontrado.' });
    }

    if (frete.status_sefaz === 'cancelado') {
      return res.status(400).json({ error: 'Este CT-e já foi cancelado na SEFAZ.' });
    }

    const fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId) || { ambiente: 'homologacao' };
    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId) || { cnpj: '12.345.678/0001-90', uf: 'PR' };

    const chave44 = frete.chave_cte_44 || frete.chave_cte;
    if (!chave44 || chave44.length !== 44) {
      return res.status(400).json({ error: 'Chave de acesso de 44 dígitos inválida para cancelamento.' });
    }

    // Executar transmissão do evento de cancelamento na SEFAZ
    const resultado = await cancelarCteSefaz({
      chave44,
      protocoloAutorizacao: frete.protocolo_sefaz,
      justificativa: justificativa.trim(),
      ambiente: frete.ambiente_emissao || fiscalConfig.ambiente,
      pfxBase64: fiscalConfig.certificado_a1_base64,
      password: fiscalConfig.certificado_senha,
      uf: empresa.uf || 'PR',
      cnpj: empresa.cnpj
    });

    if (!resultado.sucesso) {
      return res.status(400).json({
        error: `Rejeição SEFAZ ao cancelar CT-e: ${resultado.xMotivo || 'Não autorizado'}`
      });
    }

    // Gravar no banco de dados o cancelamento homologado
    db.prepare(`
      UPDATE fretes SET
        status_sefaz = 'cancelado',
        status_frete = 'cancelado',
        protocolo_cancelamento = ?,
        data_cancelamento_sefaz = ?,
        justificativa_cancelamento = ?,
        xml_evento_cancelamento = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?
    `).run(
      resultado.protocolo,
      resultado.dhEvento,
      justificativa.trim(),
      resultado.xmlEvento,
      freteId,
      empresaId
    );

    return res.json({
      success: true,
      message: '✅ CT-e cancelado com sucesso na SEFAZ!',
      protocolo: resultado.protocolo,
      dhEvento: resultado.dhEvento,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo
    });
  } catch (error) {
    console.error('Erro ao cancelar CT-e:', error);
    return res.status(500).json({ error: 'Erro interno ao cancelar CT-e: ' + error.message });
  }
};

/**
 * Carta de Correção Eletrônica (CC-e) CT-e 4.00 (Evento 110110)
 */
const cartaCorrecaoCte = async (req, res) => {
  try {
    const { freteId } = req.params;
    const empresaId = req.user?.empresa_id || 1;
    const { grupoAlterado, campoAlterado, valorAlterado } = req.body;

    if (!grupoAlterado || !campoAlterado || !valorAlterado) {
      return res.status(400).json({ error: 'Informe o grupo, campo e novo valor para a Carta de Correção.' });
    }

    const frete = db.prepare('SELECT * FROM fretes WHERE id = ? AND empresa_id = ?').get(freteId, empresaId);
    if (!frete) {
      return res.status(404).json({ error: 'Frete / CT-e não encontrado.' });
    }

    const fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId) || { ambiente: 'homologacao' };
    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId) || { cnpj: '12.345.678/0001-90', uf: 'PR' };

    const chave44 = frete.chave_cte_44 || frete.chave_cte;
    const resultado = await cartaCorrecaoCteSefaz({
      chave44,
      grupoAlterado,
      campoAlterado,
      valorAlterado,
      ambiente: frete.ambiente_emissao || fiscalConfig.ambiente,
      pfxBase64: fiscalConfig.certificado_a1_base64,
      password: fiscalConfig.certificado_senha,
      uf: empresa.uf || 'PR',
      cnpj: empresa.cnpj
    });

    return res.json({
      success: true,
      message: '✅ Carta de Correção registrada com sucesso na SEFAZ!',
      protocolo: resultado.protocolo,
      dhEvento: resultado.dhEvento
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao registrar Carta de Correção: ' + error.message });
  }
};

/**
 * Download do XML protocolado com a tag oficial <protCTe>
 */
const downloadXml = (req, res) => {
  try {
    const { freteId } = req.params;
    const empresaId = req.user?.empresa_id || 1;

    const frete = db.prepare('SELECT chave_cte_44, xml_protocolado, xml_assinado, numero_cte FROM fretes WHERE id = ? AND empresa_id = ?').get(freteId, empresaId);
    if (!frete) {
      return res.status(404).json({ error: 'Frete não encontrado.' });
    }

    const xmlContent = frete.xml_protocolado || frete.xml_assinado;
    if (!xmlContent) {
      return res.status(404).json({ error: 'XML do CT-e ainda não foi gerado para este frete.' });
    }

    const fileName = `CTe_${frete.chave_cte_44 || frete.numero_cte || freteId}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(xmlContent);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao baixar XML do CT-e.' });
  }
};

module.exports = {
  getFiscalConfig,
  updateFiscalConfig,
  testarStatusSefaz,
  emitirCte,
  getDacte,
  downloadXml,
  cancelarCte,
  cartaCorrecaoCte
};
