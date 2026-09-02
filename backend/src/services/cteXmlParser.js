const { XMLParser } = require('fast-xml-parser');

/**
 * Busca recursiva inteligente por uma chave em um objeto JavaScript (case-insensitive)
 */
function findNodeRecursive(obj, targetKey) {
  if (!obj || typeof obj !== 'object') return null;

  const targetLower = targetKey.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === targetLower) {
      return obj[key];
    }
  }

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const found = findNodeRecursive(obj[key], targetKey);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Extrai o Tomador do Serviço do CT-e de acordo com as regras da SEFAZ
 * (toma3 / toma4 / toma03: 0=Remetente, 1=Expedidor, 2=Recebedor, 3=Destinatário, 4=Outros)
 */
function extrairTomadorServico(infCte, ide, rem, dest, cleanXml) {
  let clienteNome = '';
  let clienteCnpj = '';

  // 1. Procurar toma4 (Tomador Outros com CNPJ/Razão Social própria)
  const toma4 = infCte.toma4 || ide.toma4 || findNodeRecursive(infCte, 'toma4') || findNodeRecursive(ide, 'toma4');
  if (toma4 && (toma4.xNome || toma4.CNPJ || toma4.CPF)) {
    clienteNome = toma4.xNome || toma4.xFant || '';
    clienteCnpj = toma4.CNPJ || toma4.CPF || '';
  }

  // Regex para toma4 caso não mapeado
  if (!clienteNome) {
    const toma4Match = cleanXml.match(/<toma4>[\s\S]*?<xNome>([^<]+)<\/xNome>[\s\S]*?<\/toma4>/i) ||
                       cleanXml.match(/<toma4>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>[\s\S]*?<xNome>([^<]+)<\/xNome>/i);
    if (toma4Match) {
      clienteNome = toma4Match[2] || toma4Match[1];
      const cnpjMatch = cleanXml.match(/<toma4>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/i);
      if (cnpjMatch) clienteCnpj = cnpjMatch[1];
    }
  }

  // 2. Procurar toma3 / toma03 / toma
  if (!clienteNome) {
    const tomaNode = infCte.toma3 || ide.toma03 || ide.toma3 || infCte.toma || ide.toma || {};
    const exped = infCte.exped || {};
    const receb = infCte.receb || {};

    let tomaCode = '';
    if (tomaNode.toma !== undefined) tomaCode = String(tomaNode.toma);
    else if (tomaNode.toma03 !== undefined) tomaCode = String(tomaNode.toma03);
    else {
      const matchToma = cleanXml.match(/<toma>([0-4])<\/toma>/i);
      if (matchToma) tomaCode = matchToma[1];
    }

    if (tomaCode === '0') { // 0 = Remetente
      clienteNome = rem.xNome || rem.xFant || '';
      clienteCnpj = rem.CNPJ || rem.CPF || '';
    } else if (tomaCode === '1') { // 1 = Expedidor
      clienteNome = exped.xNome || exped.xFant || '';
      clienteCnpj = exped.CNPJ || exped.CPF || '';
    } else if (tomaCode === '2') { // 2 = Recebedor
      clienteNome = receb.xNome || receb.xFant || '';
      clienteCnpj = receb.CNPJ || receb.CPF || '';
    } else if (tomaCode === '3') { // 3 = Destinatário
      clienteNome = dest.xNome || dest.xFant || '';
      clienteCnpj = dest.CNPJ || dest.CPF || '';
    } else if (tomaCode === '4') { // 4 = Outros
      const tomaOutros = tomaNode.toma4 || tomaNode;
      clienteNome = tomaOutros.xNome || tomaOutros.xFant || '';
      clienteCnpj = tomaOutros.CNPJ || tomaOutros.CPF || '';
    }
  }

  // Fallback caso não especificado no toma: Remetente ou Destinatário
  if (!clienteNome) {
    clienteNome = rem.xNome || dest.xNome || (infCte.emit?.xNome) || '';
    clienteCnpj = rem.CNPJ || dest.CNPJ || (infCte.emit?.CNPJ) || '';
  }

  return { clienteNome, clienteCnpj };
}

/**
 * Parser Universal de Documentos Fiscais de Transporte (CT-e 3.0/4.0, CT-e OS, NF-e e MDF-e)
 */
function parseCteXml(xmlContent) {
  try {
    if (!xmlContent || typeof xmlContent !== 'string') {
      return { success: false, error: 'Conteúdo XML vazio ou inválido.' };
    }

    let cleanXml = xmlContent
      .replace(/^\uFEFF/, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (!cleanXml) {
      return { success: false, error: 'Conteúdo XML está vazio.' };
    }

    // Se estiver em Base64
    if (!cleanXml.startsWith('<') && !cleanXml.includes('<') && /^[A-Za-z0-9+/=\r\n]+$/.test(cleanXml)) {
      try {
        const decoded = Buffer.from(cleanXml, 'base64').toString('utf-8');
        if (decoded.includes('<')) {
          cleanXml = decoded.replace(/^\uFEFF/, '').trim();
        }
      } catch (e) {}
    }

    // Se estiver com entidades escapadas (&lt; / &gt;)
    if (cleanXml.includes('&lt;') && cleanXml.includes('&gt;')) {
      cleanXml = cleanXml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      trimValues: true,
      parseTagValue: false,
    });

    let parsed = null;
    try {
      parsed = parser.parse(cleanXml);
    } catch (parseErr) {
      console.warn('Aviso: fast-xml-parser falhou, tentando fallback regex:', parseErr.message);
    }

    if (parsed) {
      // 1. TENTATIVA CT-E / CTeOS
      let infCte = findNodeRecursive(parsed, 'infCte') || findNodeRecursive(parsed, 'infCTe') || findNodeRecursive(parsed, 'infCteComp');

      if (infCte) {
        return parseInfCteNode(infCte, parsed, cleanXml);
      }

      // 2. TENTATIVA NF-E (Se o usuário enviou o XML da Nota Fiscal Eletrônica)
      let infNFe = findNodeRecursive(parsed, 'infNFe') || findNodeRecursive(parsed, 'infNfe');
      if (infNFe) {
        return parseInfNFeNode(infNFe, parsed, cleanXml);
      }

      // 3. TENTATIVA MDF-E (Manifesto de Carga)
      let infMDFe = findNodeRecursive(parsed, 'infMDFe') || findNodeRecursive(parsed, 'infMdfe');
      if (infMDFe) {
        return parseInfMDFeNode(infMDFe, parsed, cleanXml);
      }
    }

    // 4. FALLBACK VIA REGEX DIRETO NO XML TEXTO
    return parseViaRegexFallback(cleanXml);

  } catch (error) {
    console.error('Erro no parser XML:', error);
    try {
      return parseViaRegexFallback(xmlContent);
    } catch (e) {
      return {
        success: false,
        error: 'Falha ao processar arquivo XML: ' + error.message,
      };
    }
  }
}

/**
 * Processamento de nó <infCte>
 */
function parseInfCteNode(infCte, parsedRoot, cleanXml) {
  const ide = infCte.ide || {};
  const emit = infCte.emit || {};
  const rem = infCte.rem || {};
  const dest = infCte.dest || {};
  const infCTeNorm = infCte.infCTeNorm || {};
  const infCarga = infCTeNorm.infCarga || infCte.infCarga || {};
  const infDoc = infCTeNorm.infDoc || infCte.infDoc || {};
  const rodo = infCTeNorm.infModal?.rodo || infCte.infModal?.rodo || {};

  // Chave CT-e
  let chave = '';
  if (infCte['@_Id']) {
    chave = String(infCte['@_Id']).replace(/^CTe/i, '');
  } else {
    const chNode = findNodeRecursive(parsedRoot, 'chCTe');
    if (chNode) chave = String(chNode);
  }

  // Número CT-e
  const nCT = ide.nCT || ide.nProt || '';
  const numeroCte = nCT ? String(nCT).padStart(6, '0') : '';
  const serieCte = String(ide.serie || '1');
  const dataEmissao = ide.dhEmi ? String(ide.dhEmi).substring(0, 10) : new Date().toISOString().substring(0, 10);

  // Origem e Destino
  const toma4 = infCte.toma4 || ide.toma4 || findNodeRecursive(infCte, 'toma4') || findNodeRecursive(ide, 'toma4');
  const origemCidade = ide.xMunIni || rem.enderReme?.xMun || emit.enderEmit?.xMun || '';
  const origemUf = ide.UFIni || rem.enderReme?.UF || emit.enderEmit?.UF || '';
  const destinoCidade = ide.xMunFim || dest.enderDest?.xMun || toma4?.enderToma?.xMun || '';
  const destinoUf = ide.UFFim || dest.enderDest?.UF || toma4?.enderToma?.UF || '';

  // Identificação correta do TOMADOR DO SERVIÇO (Cliente que paga o frete)
  const { clienteNome, clienteCnpj } = extrairTomadorServico(infCte, ide, rem, dest, cleanXml);

  // Peso
  let pesoKg = 0;
  if (infCarga.infQ) {
    const qArray = Array.isArray(infCarga.infQ) ? infCarga.infQ : [infCarga.infQ];
    for (const q of qArray) {
      const qVal = parseFloat(q.qCarga || 0);
      if (q.cUnid === '02' || q.tpMed === 'PESO EM TONELADAS') {
        pesoKg = qVal * 1000;
        break;
      }
      if (q.tpMed === 'PESO BRUTO' || q.tpMed === 'PESO DECLARADO' || q.tpMed === 'PESO REAL' || q.cUnid === '01' || !pesoKg) {
        pesoKg = qVal;
      }
    }
  }

  if (!pesoKg) {
    const pesoMatch = cleanXml.match(/<qCarga>([\d\.]+)<\/qCarga>/i);
    if (pesoMatch) pesoKg = parseFloat(pesoMatch[1]) || 0;
  }

  const pesoTon = parseFloat((pesoKg / 1000).toFixed(2));
  const tipoCarga = infCarga.proPred || infCarga.xOutCat || 'Carga Geral';
  const valorMercadoria = parseFloat(infCarga.vCarga || 0);

  // Notas Fiscais vinculadas
  let nfeChaves = [];
  let nfeNumeros = [];

  if (infDoc.infNFe) {
    const nfeArray = Array.isArray(infDoc.infNFe) ? infDoc.infNFe : [infDoc.infNFe];
    for (const item of nfeArray) {
      const ch = item.chave || (typeof item === 'string' ? item : '');
      if (ch) {
        nfeChaves.push(ch);
        if (ch.length === 44) {
          const numNfe = parseInt(ch.substring(25, 34), 10);
          nfeNumeros.push(`NF-e ${numNfe}`);
        }
      }
    }
  }

  if (infDoc.infNF) {
    const nfArray = Array.isArray(infDoc.infNF) ? infDoc.infNF : [infDoc.infNF];
    for (const item of nfArray) {
      if (item.nNF) nfeNumeros.push(`NF ${item.nNF}`);
    }
  }

  // Se não achou na tag infDoc, busca via regex
  if (nfeNumeros.length === 0) {
    const nfeMatches = [...cleanXml.matchAll(/<chave>(\d{44})<\/chave>/gi)];
    for (const m of nfeMatches) {
      const ch = m[1];
      nfeChaves.push(ch);
      const numNfe = parseInt(ch.substring(25, 34), 10);
      nfeNumeros.push(`NF-e ${numNfe}`);
    }
  }

  const nfeReferencia = nfeNumeros.join(', ') || (nfeChaves.length > 0 ? `NF-e ${nfeChaves[0].substring(25, 34)}` : '');

  // Modal Rodoviário (Placas e Motorista)
  let placaVeiculo = '';
  let placaCarreta = '';
  let motoristaNome = '';
  let motoristaCpf = '';

  if (rodo.veic) {
    const veics = Array.isArray(rodo.veic) ? rodo.veic : [rodo.veic];
    if (veics[0]?.placa) placaVeiculo = String(veics[0].placa).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (veics[1]?.placa) placaCarreta = String(veics[1].placa).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  // Valor da Prestação do Serviço (Frete Cobrado / Venda)
  const vPrest = infCte.vPrest || {};
  let valorFreteVenda = parseFloat(vPrest.vTPrest || vPrest.vRec || 0);
  if (!valorFreteVenda) {
    const vMatch = cleanXml.match(/<vTPrest>([\d\.]+)<\/vTPrest>/i) || cleanXml.match(/<vRec>([\d\.]+)<\/vRec>/i);
    if (vMatch) valorFreteVenda = parseFloat(vMatch[1]) || 0;
  }

  return {
    success: true,
    data: {
      chave_cte: chave,
      numero_cte: numeroCte,
      serie_cte: serieCte,
      data_emissao: dataEmissao,
      origem_cidade: origemCidade,
      origem_uf: origemUf,
      destino_cidade: destinoCidade,
      destino_uf: destinoUf,
      cliente_nome: clienteNome,
      cliente_cnpj: clienteCnpj,
      tipo_carga: tipoCarga,
      peso_kg: pesoKg,
      peso_toneladas: pesoTon,
      valor_mercadoria: valorMercadoria,
      valor_frete_venda: valorFreteVenda,
      nfe_referencia: nfeReferencia,
      nfe_chave: nfeChaves[0] || '',
      placa_veiculo: placaVeiculo,
      placa_carreta: placaCarreta,
      motorista_nome: motoristaNome,
      motorista_cpf: motoristaCpf,
      tipo_documento: 'CT-e',
    },
  };
}

/**
 * Processamento se o usuário enviar o XML de uma NF-e
 */
function parseInfNFeNode(infNFe, parsedRoot, cleanXml) {
  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const dest = infNFe.dest || {};
  const transp = infNFe.transp || {};
  const total = infNFe.total?.ICMSTot || {};

  let chave = '';
  if (infNFe['@_Id']) {
    chave = String(infNFe['@_Id']).replace(/^NFe/i, '');
  }

  const numeroNfe = ide.nNF ? String(ide.nNF).padStart(6, '0') : '';
  const serie = String(ide.serie || '1');
  const dataEmissao = ide.dhEmi ? String(ide.dhEmi).substring(0, 10) : new Date().toISOString().substring(0, 10);

  const origemCidade = emit.enderEmit?.xMun || '';
  const origemUf = emit.enderEmit?.UF || '';
  const origemIbge = String(emit.enderEmit?.cMun || '');
  const origemLogradouro = emit.enderEmit?.xLgr || '';
  const origemNumero = emit.enderEmit?.nro || '';
  const origemBairro = emit.enderEmit?.xBairro || '';
  const origemCep = emit.enderEmit?.CEP || '';
  const remetenteIe = emit.IE || '';

  const destinoCidade = dest.enderDest?.xMun || '';
  const destinoUf = dest.enderDest?.UF || '';
  const destinoIbge = String(dest.enderDest?.cMun || '');
  const destinoLogradouro = dest.enderDest?.xLgr || '';
  const destinoNumero = dest.enderDest?.nro || '';
  const destinoBairro = dest.enderDest?.xBairro || '';
  const destinoCep = dest.enderDest?.CEP || '';
  const destinatarioIe = dest.IE || '';

  // Tomador com base em modFrete (0=CIF Remetente paga, 1=FOB Destinatário paga, 9=Sem frete)
  const modFrete = transp.modFrete !== undefined ? String(transp.modFrete) : '0';
  const clienteNome = (modFrete === '1' ? dest.xNome : emit.xNome) || emit.xNome || dest.xNome || '';
  const clienteCnpj = (modFrete === '1' ? (dest.CNPJ || dest.CPF) : (emit.CNPJ || emit.CPF)) || emit.CNPJ || dest.CNPJ || '';
  const clienteIe = (modFrete === '1' ? destinatarioIe : remetenteIe) || '';

  // Descrição do Produto Predominante e Lista de Itens
  let tipoCarga = 'Carga Geral';
  const itens = [];
  if (infNFe.det) {
    const detList = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
    for (const d of detList) {
      if (d?.prod?.xProd) {
        itens.push({
          codigo: d.prod.cProd || '',
          descricao: d.prod.xProd || '',
          ncm: d.prod.NCM || '',
          cfop: d.prod.CFOP || '',
          unidade: d.prod.uCom || '',
          quantidade: parseFloat(d.prod.qCom || 0),
          valor_unitario: parseFloat(d.prod.vUnCom || 0),
          valor_total: parseFloat(d.prod.vProd || 0),
        });
      }
    }
    if (itens.length > 0) {
      tipoCarga = itens[0].descricao;
    }
  }

  // Peso na NF-e: Priorizar sempre peso líquido (pesoL) da mercadoria faturada.
  // Em cargas de granel líquido (óleo vegetal) e grãos, pesoB frequentemente inclui a pesagem bruta com o caminhão/veículo (ex: 62.27 ton vs 42.71 ton de carga líquida)
  let pesoKg = 0;
  if (transp.vol) {
    const volArray = Array.isArray(transp.vol) ? transp.vol : [transp.vol];
    for (const v of volArray) {
      const pL = parseFloat(String(v.pesoL || 0).replace(',', '.'));
      const pB = parseFloat(String(v.pesoB || 0).replace(',', '.'));
      if (pL > 0) {
        pesoKg += pL;
      } else if (pB > 0) {
        pesoKg += pB;
      }
    }
  }

  // Fallback para peso pelos itens (det.prod.qCom / det.prod.qTrib) caso pesoL não esteja em vol ou seja menor/mais preciso
  if (itens.length > 0) {
    const totalQtdItens = itens.reduce((sum, item) => sum + (parseFloat(item.quantidade || 0)), 0);
    const un = String(itens[0].unidade || '').toUpperCase().trim();
    if (totalQtdItens > 0) {
      if (un === 'KG' || un === 'LT' || un === 'L' || un === 'KGS' || un === 'QUILO' || un === 'LITRO' || un === 'LITROS') {
        if (pesoKg === 0 || (pesoKg > 55000 && totalQtdItens < 50000)) {
          // Se o peso em vol tinha tara do caminhão (>55 ton) mas os itens têm ~42 ton líquidas
          pesoKg = totalQtdItens;
        }
      } else if (un === 'TON' || un === 'TO' || un === 'T' || un === 'TONELADA' || un === 'TONELADAS') {
        const pesoItensKg = totalQtdItens * 1000;
        if (pesoKg === 0 || (pesoKg > 55000 && pesoItensKg < 50000)) {
          pesoKg = pesoItensKg;
        }
      }
    }
  }

  // Fallback regex se ainda for 0
  if (pesoKg === 0) {
    const pLMatch = cleanXml.match(/<pesoL>([\d\.,]+)<\/pesoL>/i);
    if (pLMatch) {
      pesoKg = parseFloat(pLMatch[1].replace(',', '.')) || 0;
    }
  }

  const pesoTon = parseFloat((pesoKg / 1000).toFixed(2));
  const valorMercadoria = parseFloat(total.vProd || total.vNF || 0);

  // Placas na NF-e
  let placaVeiculo = '';
  let placaCarreta = '';
  if (transp.veicTransp?.placa) {
    placaVeiculo = String(transp.veicTransp.placa).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }
  if (transp.reboque) {
    const rebArray = Array.isArray(transp.reboque) ? transp.reboque : [transp.reboque];
    if (rebArray[0]?.placa) {
      if (!placaVeiculo) {
        placaVeiculo = String(rebArray[0].placa).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      } else {
        placaCarreta = String(rebArray[0].placa).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      }
    }
  }

  return {
    success: true,
    data: {
      chave_cte: chave,
      chave_nfe: chave,
      numero_cte: numeroNfe,
      numero_nfe: numeroNfe,
      serie_cte: serie,
      data_emissao: dataEmissao,
      origem_cidade: origemCidade,
      origem_uf: origemUf,
      origem_ibge: origemIbge,
      origem_logradouro: origemLogradouro,
      origem_numero: origemNumero,
      origem_bairro: origemBairro,
      origem_cep: origemCep,
      destino_cidade: destinoCidade,
      destino_uf: destinoUf,
      destino_ibge: destinoIbge,
      destino_logradouro: destinoLogradouro,
      destino_numero: destinoNumero,
      destino_bairro: destinoBairro,
      destino_cep: destinoCep,
      cliente_nome: clienteNome,
      cliente_cnpj: clienteCnpj,
      cliente_ie: clienteIe,
      remetente_nome: emit.xNome || '',
      remetente_cnpj: emit.CNPJ || '',
      remetente_ie: remetenteIe,
      destinatario_nome: dest.xNome || '',
      destinatario_cnpj: dest.CNPJ || dest.CPF || '',
      destinatario_ie: destinatarioIe,
      tipo_carga: tipoCarga,
      peso_kg: pesoKg > 0 ? pesoKg : 32000,
      peso_toneladas: pesoKg > 0 ? pesoTon : 32.0,
      valor_mercadoria: valorMercadoria,
      nfe_referencia: chave ? `NF-e ${numeroNfe} (${chave})` : `NF-e ${numeroNfe}`,
      nfe_chave: chave,
      placa_veiculo: placaVeiculo,
      placa_carreta: placaCarreta,
      motorista_nome: transp.transporta?.xNome || '',
      motorista_cpf: transp.transporta?.CPF || '',
      itens_nfe: itens,
      mod_frete: modFrete,
      tipo_documento: 'NF-e',
    },
  };
}

/**
 * Processamento se for MDF-e
 */
function parseInfMDFeNode(infMDFe, parsedRoot, cleanXml) {
  const ide = infMDFe.ide || {};
  const emit = infMDFe.emit || {};
  const tot = infMDFe.tot || {};
  const rodo = infMDFe.infModal?.rodo || {};

  const num = ide.nMDF ? String(ide.nMDF).padStart(6, '0') : '';
  const pesoKg = parseFloat(tot.qCarga || 0);

  let placaVeiculo = '';
  let placaCarreta = '';
  let motoristaNome = '';

  if (rodo.veicTracao?.placa) {
    placaVeiculo = String(rodo.veicTracao.placa).toUpperCase();
  }
  if (rodo.veicReb?.placa) {
    placaCarreta = String(rodo.veicReb.placa).toUpperCase();
  }
  if (rodo.veicTracao?.condutor) {
    const c = Array.isArray(rodo.veicTracao.condutor) ? rodo.veicTracao.condutor[0] : rodo.veicTracao.condutor;
    motoristaNome = c?.xNome || '';
  }

  return {
    success: true,
    data: {
      chave_cte: '',
      numero_cte: num,
      serie_cte: String(ide.serie || '1'),
      data_emissao: ide.dhEmi ? String(ide.dhEmi).substring(0, 10) : new Date().toISOString().substring(0, 10),
      origem_cidade: ide.xMunIni || emit.enderEmit?.xMun || '',
      origem_uf: ide.UFIni || emit.enderEmit?.UF || '',
      destino_cidade: ide.xMunFim || '',
      destino_uf: ide.UFFim || '',
      cliente_nome: emit.xNome || '',
      cliente_cnpj: emit.CNPJ || '',
      tipo_carga: 'Carga Geral',
      peso_kg: pesoKg,
      peso_toneladas: parseFloat((pesoKg / 1000).toFixed(2)),
      valor_mercadoria: parseFloat(tot.vCarga || 0),
      nfe_referencia: `MDF-e ${num}`,
      nfe_chave: '',
      placa_veiculo: placaVeiculo,
      placa_carreta: placaCarreta,
      motorista_nome: motoristaNome,
      motorista_cpf: '',
      tipo_documento: 'MDF-e',
    },
  };
}

/**
 * Fallback de extração via regex quando as tags têm estruturas atípicas
 */
function parseViaRegexFallback(xml) {
  const nCTMatch = xml.match(/<nCT>(\d+)<\/nCT>/i) || xml.match(/<nNF>(\d+)<\/nNF>/i);
  const numeroCte = nCTMatch ? nCTMatch[1].padStart(6, '0') : '';

  const qCargaMatch = xml.match(/<qCarga>([\d\.]+)<\/qCarga>/i) || xml.match(/<pesoB>([\d\.]+)<\/pesoB>/i);
  const pesoKg = qCargaMatch ? parseFloat(qCargaMatch[1]) : 0;

  const munIniMatch = xml.match(/<xMunIni>([^<]+)<\/xMunIni>/i) || xml.match(/<xMun>([^<]+)<\/xMun>/i);
  const ufIniMatch = xml.match(/<UFIni>([^<]+)<\/UFIni>/i) || xml.match(/<UF>([^<]+)<\/UF>/i);

  const munFimMatch = xml.match(/<xMunFim>([^<]+)<\/xMunFim>/i);
  const ufFimMatch = xml.match(/<UFFim>([^<]+)<\/UFFim>/i);

  const placaMatch = xml.match(/<placa>([A-Z0-9]+)<\/placa>/i);
  const motoMatch = xml.match(/<xNome>([^<]+)<\/xNome>/i);

  const chaveMatch = xml.match(/\b(\d{44})\b/);

  if (!numeroCte && !pesoKg && !chaveMatch) {
    return {
      success: false,
      error: 'Não foi possível reconhecer a estrutura do arquivo XML. Verifique se o arquivo é um CT-e, NF-e ou MDF-e válido da SEFAZ.',
    };
  }

  return {
    success: true,
    data: {
      chave_cte: chaveMatch ? chaveMatch[1] : '',
      numero_cte: numeroCte || (chaveMatch ? chaveMatch[1].substring(25, 34) : 'S/N'),
      serie_cte: '1',
      data_emissao: new Date().toISOString().substring(0, 10),
      origem_cidade: munIniMatch ? munIniMatch[1] : '',
      origem_uf: ufIniMatch ? ufIniMatch[1] : 'SP',
      destino_cidade: munFimMatch ? munFimMatch[1] : '',
      destino_uf: ufFimMatch ? ufFimMatch[1] : 'SP',
      cliente_nome: motoMatch ? motoMatch[1] : 'Cliente Geral',
      cliente_cnpj: '',
      tipo_carga: 'Carga Geral',
      peso_kg: pesoKg,
      peso_toneladas: parseFloat((pesoKg / 1000).toFixed(2)),
      valor_mercadoria: 0,
      nfe_referencia: chaveMatch ? `NF-e ${chaveMatch[1].substring(25, 34)}` : '',
      nfe_chave: chaveMatch ? chaveMatch[1] : '',
      placa_veiculo: placaMatch ? placaMatch[1].toUpperCase() : '',
      placa_carreta: '',
      motorista_nome: '',
      motorista_cpf: '',
      tipo_documento: 'XML SEFAZ',
    },
  };
}

module.exports = {
  parseCteXml,
};
