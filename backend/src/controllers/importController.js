const multer = require('multer');
const { parseCteXml } = require('../services/cteXmlParser');

// Configuração do Multer em memória
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const parseXmlFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const xmlString = req.file.buffer.toString('utf-8');
    const result = parseCteXml(xmlString);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      message: 'CT-e XML processado com sucesso!',
      dados: result.data,
      xml_bruto: xmlString,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar arquivo: ' + error.message });
  }
};

const parseXmlText = (req, res) => {
  try {
    const { xml } = req.body;
    if (!xml) {
      return res.status(400).json({ error: 'Conteúdo XML é obrigatório.' });
    }

    const result = parseCteXml(xml);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      message: 'CT-e XML processado com sucesso!',
      dados: result.data,
      xml_bruto: xml,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar texto XML: ' + error.message });
  }
};

// Parser simples para texto/OCR extraído de PDF ou DACTE
const parseDacteText = (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Texto do DACTE não fornecido.' });
    }

    // Extrair chave de 44 dígitos
    const chaveMatch = rawText.match(/\b(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})\b/) ||
                       rawText.match(/\b(\d{44})\b/);
    const chave = chaveMatch ? chaveMatch[0].replace(/\s+/g, '') : '';

    // Extrair número CT-e
    const numMatch = rawText.match(/(?:CT-e|DACTE|NÚMERO|Nº|N°)\s*:?\s*(\d{1,9})\b/i);
    const numeroCte = numMatch ? numMatch[1].padStart(6, '0') : '';

    // Extrair placa
    const placaMatch = rawText.match(/\b([A-Z]{3}-?\d[A-Z0-9]\d{2})\b/i);
    const placa = placaMatch ? placaMatch[1].replace('-', '').toUpperCase() : '';

    // Extrair valores
    const valorMatch = rawText.match(/(?:VALOR TOTAL|VALOR DA PRESTAÇÃO|TOTAL DO SERVIÇO|V\. PREST)\s*:?\s*R?\$?\s*([\d\.,]+)/i);
    let valorFrete = 0;
    if (valorMatch) {
      const cleanVal = valorMatch[1].replace(/\./g, '').replace(',', '.');
      valorFrete = parseFloat(cleanVal) || 0;
    }

    return res.json({
      message: 'Dados extraídos do DACTE!',
      dados: {
        chave_cte: chave,
        numero_cte: numeroCte,
        placa_veiculo: placa,
        valor_frete_venda: valorFrete,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar DACTE: ' + error.message });
  }
};

module.exports = {
  upload,
  parseXmlFile,
  parseXmlText,
  parseDacteText,
};
