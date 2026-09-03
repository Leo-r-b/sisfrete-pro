import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  DollarSign, 
  TrendingUp, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Layers, 
  Repeat, 
  FileText, 
  Calculator, 
  Scale, 
  UserCheck,
  Clipboard,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FreteFormModal({ isOpen, onClose, onSuccess, freteEdit, defaultOrigem = 'importacao_terceiros' }) {
  const { activeEmpresa } = useAuth();
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const motoristaDropdownRef = useRef(null);

  // Determinar modalidade operacional configurada para a licença
  const isLicencaGestao = activeEmpresa?.modo_operacao === 'gestao_pagamentos';
  const isLicencaRepasse = activeEmpresa?.modo_operacao === 'agenciamento_repasse';
  const isModoAgenciamento = isLicencaGestao || isLicencaRepasse;
  const defaultComissaoPct = activeEmpresa?.percentual_comissao_padrao !== undefined ? Number(activeEmpresa.percentual_comissao_padrao) : 5.0;

  // Lista de motoristas cadastrados para autocomplete
  const [motoristasCadastrados, setMotoristasCadastrados] = useState([]);
  const [showMotoristaSuggestions, setShowMotoristaSuggestions] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Formato da operação: 'simples' (1 CT-e) ou 'triangular' (2 CT-es)
  const [formatoOperacao, setFormatoOperacao] = useState('simples');

  // Form State
  const [formData, setFormData] = useState({
    tipo_operacao: isLicencaGestao ? 'gestao_pagamentos' : isLicencaRepasse ? 'agenciamento_repasse' : 'padrao',
    
    // CT-e 1
    numero_cte: '',
    serie_cte: '1',
    chave_cte: '',
    nfe_referencia: '',
    cliente_nome: '',
    cliente_cnpj: '',
    peso_kg: '',
    valor_frete_venda: '', // Valor Bruto do CT-e 1

    // Subcontratação tradicional apenas (ton/kg)
    tarifa_tipo_venda: 'ton',
    tarifa_valor_venda: '',

    // CT-e 2 (quando operação triangular de 2 CT-es)
    numero_cte_2: '',
    serie_cte_2: '1',
    chave_cte_2: '',
    nfe_referencia_2: '',
    cliente_nome_2: '',
    cliente_cnpj_2: '',
    peso_kg_2: '',
    valor_frete_venda_2: '', // Valor Bruto do CT-e 2
    tarifa_tipo_venda_2: 'ton',
    tarifa_valor_venda_2: '',

    // Rota da Viagem
    origem_cidade: '',
    origem_uf: 'PR',
    destino_cidade: '',
    destino_uf: 'PR',

    // Motorista / Freteiro
    motorista_id: null,
    motorista_nome: '',
    motorista_telefone: '',
    pix_chave: '',
    pix_tipo: 'CPF',
    placa_veiculo: '',
    placa_carreta: '',
    tipo_carga: 'Carga Geral',

    // Modo Agenciamento & Repasse / Gestão de Pagamentos
    valor_frete_real: '', // Valor real digitado pelo operador para o freteiro
    favorecido_freteiro_nome: '',
    percentual_comissao: defaultComissaoPct, // 5.0%
    valor_comissao: '',
    destinatario_comissao_nome: '',
    destinatario_comissao_doc: '',
    valor_repasse: '',
    destinatario_repasse_nome: '',
    destinatario_repasse_doc: '',
    status_repasse: 'pendente',
    status_comissao: 'pendente',

    // Modo Subcontratação Tradicional
    tarifa_tipo_compra: 'ton',
    tarifa_valor_compra: '',
    valor_frete_compra: '',
    percentual_adiantamento: '',
    valor_adiantamento: '',
    adiantamento_ja_pago: false,
    valor_pedagio: '',
    valor_combustivel: '',
    outros_descontos: '',
    valor_acrescimos: '',

    status_frete: 'em_transito',
    data_emissao: new Date().toISOString().substring(0, 10),
    data_vencimento_cliente: '',
    data_vencimento_cliente_2: '',
    observacoes: '',
    xml_bruto: '',
  });

  const [importing1, setImporting1] = useState(false);
  const [importing2, setImporting2] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteTarget, setPasteTarget] = useState('cte1');
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  // Carregar motoristas cadastrados
  useEffect(() => {
    if (isOpen) {
      api.get('/motoristas')
        .then((res) => setMotoristasCadastrados(res.data || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Fechar ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fechar dropdown de motorista ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (motoristaDropdownRef.current && !motoristaDropdownRef.current.contains(event.target)) {
        setShowMotoristaSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (freteEdit) {
      const isTriang = !!freteEdit.numero_cte_2 || parseFloat(freteEdit.valor_frete_venda_2 || 0) > 0 || freteEdit.tipo_operacao === 'triangular';
      setFormatoOperacao(isTriang ? 'triangular' : 'simples');
      setFormData({
        ...freteEdit,
        tipo_operacao: isLicencaGestao ? 'gestao_pagamentos' : isLicencaRepasse ? 'agenciamento_repasse' : (freteEdit.tipo_operacao || 'padrao'),
        peso_kg: freteEdit.peso_kg || '',
        peso_kg_2: freteEdit.peso_kg_2 || '',
        tarifa_tipo_venda: freteEdit.tarifa_tipo_venda || 'ton',
        tarifa_valor_venda: freteEdit.tarifa_valor_venda || '',
        tarifa_tipo_venda_2: freteEdit.tarifa_tipo_venda_2 || 'ton',
        tarifa_valor_venda_2: freteEdit.tarifa_valor_venda_2 || '',
        tarifa_tipo_compra: freteEdit.tarifa_tipo_compra || 'ton',
        tarifa_valor_compra: freteEdit.tarifa_valor_compra || '',
        valor_frete_venda: freteEdit.valor_frete_venda || '',
        valor_frete_venda_2: freteEdit.valor_frete_venda_2 || '',
        valor_frete_compra: freteEdit.valor_frete_compra || '',
        valor_frete_real: freteEdit.valor_frete_real || '',
        favorecido_freteiro_nome: freteEdit.favorecido_freteiro_nome || freteEdit.motorista_nome || '',
        percentual_comissao: freteEdit.percentual_comissao !== undefined ? freteEdit.percentual_comissao : defaultComissaoPct,
        valor_comissao: freteEdit.valor_comissao !== undefined && freteEdit.valor_comissao !== null ? freteEdit.valor_comissao : '',
        destinatario_comissao_nome: freteEdit.destinatario_comissao_nome || '',
        destinatario_comissao_doc: freteEdit.destinatario_comissao_doc || '',
        valor_repasse: freteEdit.valor_repasse || '',
        destinatario_repasse_nome: freteEdit.destinatario_repasse_nome || '',
        destinatario_repasse_doc: freteEdit.destinatario_repasse_doc || '',
        status_repasse: freteEdit.status_repasse || 'pendente',
        status_comissao: freteEdit.status_comissao || 'pendente',
        percentual_adiantamento: freteEdit.percentual_adiantamento !== undefined ? freteEdit.percentual_adiantamento : '',
        valor_adiantamento: freteEdit.valor_adiantamento !== undefined ? freteEdit.valor_adiantamento : '',
        valor_pedagio: freteEdit.valor_pedagio || '',
        valor_combustivel: freteEdit.valor_combustivel || '',
        outros_descontos: freteEdit.outros_descontos || '',
        valor_acrescimos: freteEdit.valor_acrescimos || '',
        adiantamento_ja_pago: false,
      });
    } else {
      setFormatoOperacao('simples');
      setFormData({
        tipo_operacao: isLicencaGestao ? 'gestao_pagamentos' : isLicencaRepasse ? 'agenciamento_repasse' : 'padrao',
        numero_cte: '',
        serie_cte: '1',
        chave_cte: '',
        nfe_referencia: '',
        cliente_nome: '',
        cliente_cnpj: '',
        peso_kg: '',
        tarifa_tipo_venda: 'ton',
        tarifa_valor_venda: '',
        valor_frete_venda: '',
        numero_cte_2: '',
        serie_cte_2: '1',
        chave_cte_2: '',
        nfe_referencia_2: '',
        cliente_nome_2: '',
        cliente_cnpj_2: '',
        peso_kg_2: '',
        tarifa_tipo_venda_2: 'ton',
        tarifa_valor_venda_2: '',
        valor_frete_venda_2: '',
        origem_cidade: '',
        origem_uf: 'PR',
        destino_cidade: '',
        destino_uf: 'PR',
        motorista_id: null,
        motorista_nome: '',
        motorista_telefone: '',
        pix_chave: '',
        pix_tipo: 'CPF',
        placa_veiculo: '',
        placa_carreta: '',
        tipo_carga: 'Carga Geral',
        tarifa_tipo_compra: 'ton',
        tarifa_valor_compra: '',
        valor_frete_compra: '',
        valor_frete_real: '',
        favorecido_freteiro_nome: '',
        percentual_comissao: defaultComissaoPct,
        valor_comissao: '',
        destinatario_comissao_nome: '',
        destinatario_comissao_doc: '',
        valor_repasse: '',
        destinatario_repasse_nome: '',
        destinatario_repasse_doc: '',
        status_repasse: 'pendente',
        status_comissao: 'pendente',
        percentual_adiantamento: '',
        valor_adiantamento: '',
        adiantamento_ja_pago: false,
        valor_pedagio: '',
        valor_combustivel: '',
        outros_descontos: '',
        valor_acrescimos: '',
        status_frete: 'em_transito',
        data_emissao: new Date().toISOString().substring(0, 10),
        data_vencimento_cliente: '',
        data_vencimento_cliente_2: '',
        observacoes: '',
        xml_bruto: '',
      });
    }
    setFeedbackMsg({ type: '', text: '' });
  }, [freteEdit, isOpen, isLicencaGestao, isLicencaRepasse, defaultComissaoPct]);

  if (!isOpen) return null;

  // =========================================================================
  // CÁLCULOS MATEMÁTICOS
  // =========================================================================
  const pesoKg1 = parseFloat(formData.peso_kg || 0);
  const pesoTon1 = pesoKg1 / 1000;
  const pesoKg2 = parseFloat(formData.peso_kg_2 || 0);
  const pesoTon2 = pesoKg2 / 1000;

  // Valores Brutos dos CT-es
  let valorVenda1 = 0;
  if (isLicencaRepasse || isLicencaGestao || formData.tipo_operacao === 'gestao_pagamentos') {
    // No modo agenciamento / gestão de pagamentos: Valor real direto do CT-e
    valorVenda1 = parseFloat(formData.valor_frete_venda || 0);
  } else {
    // No modo subcontratação padrão: Preço por ton/kg se configurado
    const tarifaVal1 = parseFloat(formData.tarifa_valor_venda || 0);
    if (tarifaVal1 > 0) {
      valorVenda1 = formData.tarifa_tipo_venda === 'kg' ? pesoKg1 * tarifaVal1 : pesoTon1 * tarifaVal1;
    } else {
      valorVenda1 = parseFloat(formData.valor_frete_venda || 0);
    }
  }

  let valorVenda2 = 0;
  if (formatoOperacao === 'triangular') {
    if (isLicencaRepasse || isLicencaGestao || formData.tipo_operacao === 'gestao_pagamentos') {
      valorVenda2 = parseFloat(formData.valor_frete_venda_2 || 0);
    } else {
      const tarifaVal2 = parseFloat(formData.tarifa_valor_venda_2 || 0);
      if (tarifaVal2 > 0) {
        valorVenda2 = formData.tarifa_tipo_venda_2 === 'kg' ? pesoKg2 * tarifaVal2 : pesoTon2 * tarifaVal2;
      } else {
        valorVenda2 = parseFloat(formData.valor_frete_venda_2 || 0);
      }
    }
  }

  // Total Bruto dos CT-es
  const valorVendaTotal = valorVenda1 + valorVenda2;

  // 1. CÁLCULO NO MODO AGENCIAMENTO & REPASSE / GESTÃO DE PAGAMENTOS
  const valorFreteReal = parseFloat(formData.valor_frete_real || 0);
  const pctComissao = parseFloat(formData.percentual_comissao !== undefined && formData.percentual_comissao !== '' ? formData.percentual_comissao : defaultComissaoPct);
  
  let valorComissaoAgenciamento = 0;
  if (isLicencaGestao || formData.tipo_operacao === 'gestao_pagamentos') {
    // Na gestão de pagamentos, a comissão NÃO tem percentual fixo; é digitada livremente em R$ pelo operador
    valorComissaoAgenciamento = parseFloat(formData.valor_comissao || 0);
  } else {
    valorComissaoAgenciamento = Number((valorFreteReal * (pctComissao / 100)).toFixed(2));
  }

  let valorRepasseAgenciamento = 0;
  if ((isLicencaGestao || formData.tipo_operacao === 'gestao_pagamentos') && formData.valor_repasse !== undefined && formData.valor_repasse !== '' && formData.valor_repasse !== null) {
    valorRepasseAgenciamento = parseFloat(formData.valor_repasse || 0);
  } else {
    valorRepasseAgenciamento = Number(Math.max(0, valorVendaTotal - valorFreteReal - valorComissaoAgenciamento).toFixed(2));
  }

  // 2. CÁLCULO NO MODO SUBCONTRATAÇÃO PADRÃO
  const tarifaCompraVal = parseFloat(formData.tarifa_valor_compra || 0);
  let valorCompraPadrao = parseFloat(formData.valor_frete_compra || 0);
  if (tarifaCompraVal > 0) {
    valorCompraPadrao = formData.tarifa_tipo_compra === 'kg' ? pesoKg1 * tarifaCompraVal : pesoTon1 * tarifaCompraVal;
  }
  const comissaoPadrao = valorVendaTotal - valorCompraPadrao;
  const margemPadrao = valorVendaTotal > 0 ? (comissaoPadrao / valorVendaTotal) * 100 : 0;

  // Compra consolidada final para envio
  const valorCompraFinal = isLicencaRepasse ? valorFreteReal : valorCompraPadrao;
  const comissaoFinal = isLicencaRepasse ? valorComissaoAgenciamento : comissaoPadrao;
  const margemFinal = valorVendaTotal > 0 ? (comissaoFinal / valorVendaTotal) * 100 : 0;

  // Adiantamento no modo padrão
  let adiantamentoCalc = 0;
  if (formData.valor_adiantamento !== '' && formData.valor_adiantamento !== null) {
    adiantamentoCalc = parseFloat(formData.valor_adiantamento || 0);
  } else if (formData.percentual_adiantamento !== '' && formData.percentual_adiantamento !== null) {
    const pct = parseFloat(formData.percentual_adiantamento || 0);
    if (pct > 0 && valorCompraPadrao > 0) {
      adiantamentoCalc = (valorCompraPadrao * pct) / 100;
    }
  }

  const pedagio = parseFloat(formData.valor_pedagio || 0);
  const combustivel = parseFloat(formData.valor_combustivel || 0);
  const outrosDesc = parseFloat(formData.outros_descontos || 0);
  const acrescimos = parseFloat(formData.valor_acrescimos || 0);
  const saldoRestantePadrao = Math.max(0, valorCompraPadrao - adiantamentoCalc - pedagio - combustivel - outrosDesc + acrescimos);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Seleção de motorista no autocomplete
  const handleSelectMotorista = (mot) => {
    setFormData((prev) => ({
      ...prev,
      motorista_id: mot.id,
      motorista_nome: mot.nome,
      motorista_telefone: mot.telefone || prev.motorista_telefone,
      pix_chave: mot.pix_chave || mot.cpf_cnpj || prev.pix_chave,
      pix_tipo: mot.pix_tipo || 'CPF',
      placa_veiculo: mot.placa_cavalo || mot.placa || prev.placa_veiculo,
      placa_carreta: mot.placa_carreta || prev.placa_carreta,
      origem_cidade: mot.cidade || prev.origem_cidade,
      origem_uf: mot.uf || prev.origem_uf,
    }));
    setShowMotoristaSuggestions(false);
  };

  const motoristasFiltrados = motoristasCadastrados.filter((m) =>
    m.nome?.toLowerCase().includes((formData.motorista_nome || '').toLowerCase())
  );

  const handleCopyPix = (pix) => {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Leitor universal de arquivos XML no navegador
  const readXmlFileAsText = async (file) => {
    if (!file) throw new Error('Nenhum arquivo selecionado.');
    if (file.size === 0) throw new Error('O arquivo selecionado está vazio (0 bytes).');

    if (typeof file.text === 'function') {
      try {
        const text = await file.text();
        if (text && text.trim().length > 0) {
          if (text.startsWith('%PDF')) {
            throw new Error('O arquivo selecionado é um PDF. Por favor, selecione o arquivo com extensão .XML emitido pela SEFAZ.');
          }
          return text;
        }
      } catch (errPdf) {
        if (errPdf.message && errPdf.message.includes('PDF')) throw errPdf;
      }
    }

    let content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file, 'UTF-8');
    });

    if (content && content.trim().length > 0) return content;

    content = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file, 'ISO-8859-1');
    });

    if (content && content.trim().length > 0) return content;

    throw new Error('Não foi possível ler o arquivo. Verifique se o arquivo XML é válido.');
  };

  // Parser Client-side de emergência
  const parseXmlClientSide = (xmlText) => {
    try {
      let cleanXml = xmlText.replace(/^\uFEFF/, '').trim();
      if (cleanXml.includes('&lt;') && cleanXml.includes('&gt;')) {
        cleanXml = cleanXml
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
      }

      const chMatch = cleanXml.match(/\b(\d{44})\b/);
      const chave = chMatch ? chMatch[1] : '';

      const nctMatch = cleanXml.match(/<nCT>(\d+)<\/nCT>/i) || cleanXml.match(/<nNF>(\d+)<\/nNF>/i) || cleanXml.match(/<nMDF>(\d+)<\/nMDF>/i);
      const numeroCte = nctMatch ? nctMatch[1].padStart(6, '0') : (chave ? chave.substring(25, 34) : '');

      const munIni = cleanXml.match(/<xMunIni>([^<]+)<\/xMunIni>/i) || cleanXml.match(/<xMun>([^<]+)<\/xMun>/i);
      const ufIni = cleanXml.match(/<UFIni>([^<]+)<\/UFIni>/i) || cleanXml.match(/<UF>([^<]+)<\/UF>/i);
      const munFim = cleanXml.match(/<xMunFim>([^<]+)<\/xMunFim>/i);
      const ufFim = cleanXml.match(/<UFFim>([^<]+)<\/UFFim>/i);

      const pesoLMatch = cleanXml.match(/<pesoL>([\d\.]+)<\/pesoL>/i);
      const rxLiq = cleanXml.match(/<tpMed>[^<]*(?:LIQ|LIQUIDO)[^<]*<\/tpMed>[\s\S]*?<qCarga>([\d\.]+)<\/qCarga>/i) ||
                    cleanXml.match(/<qCarga>([\d\.]+)<\/qCarga>[\s\S]*?<tpMed>[^<]*(?:LIQ|LIQUIDO)[^<]*<\/tpMed>/i);
      const qCarga = cleanXml.match(/<qCarga>([\d\.]+)<\/qCarga>/i) || cleanXml.match(/<pesoB>([\d\.]+)<\/pesoB>/i);
      const pesoKg = pesoLMatch ? parseFloat(pesoLMatch[1]) : (rxLiq ? parseFloat(rxLiq[1]) : (qCarga ? parseFloat(qCarga[1]) : 0));

      const vTPrest = cleanXml.match(/<vTPrest>([\d\.]+)<\/vTPrest>/i) || cleanXml.match(/<vRec>([\d\.]+)<\/vRec>/i) || cleanXml.match(/<vNF>([\d\.]+)<\/vNF>/i) || cleanXml.match(/<vCarga>([\d\.]+)<\/vCarga>/i);
      const valorFrete = vTPrest ? parseFloat(vTPrest[1]) : 0;

      const placaMatch = cleanXml.match(/<placa>([A-Z0-9]+)<\/placa>/i);
      const placa = placaMatch ? placaMatch[1].toUpperCase() : '';

      const nomeMatch = cleanXml.match(/<toma4>[\s\S]*?<xNome>([^<]+)<\/xNome>/i) ||
                        cleanXml.match(/<rem>[\s\S]*?<xNome>([^<]+)<\/xNome>/i) ||
                        cleanXml.match(/<dest>[\s\S]*?<xNome>([^<]+)<\/xNome>/i) ||
                        cleanXml.match(/<emit>[\s\S]*?<xNome>([^<]+)<\/xNome>/i);
      const clienteNome = nomeMatch ? nomeMatch[1] : '';

      const cnpjMatch = cleanXml.match(/<toma4>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/i) ||
                        cleanXml.match(/<rem>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/i) ||
                        cleanXml.match(/<dest>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/i);
      const clienteCnpj = cnpjMatch ? cnpjMatch[1] : '';

      const nfeMatch = cleanXml.match(/<chave>(\d{44})<\/chave>/i);
      const nfeRef = nfeMatch ? `NF-e ${parseInt(nfeMatch[1].substring(25, 34), 10)}` : '';

      if (numeroCte || chave || clienteNome || pesoKg || valorFrete) {
        return {
          chave_cte: chave,
          numero_cte: numeroCte,
          origem_cidade: munIni ? munIni[1] : '',
          origem_uf: ufIni ? ufIni[1] : '',
          destino_cidade: munFim ? munFim[1] : '',
          destino_uf: ufFim ? ufFim[1] : '',
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpj,
          peso_kg: pesoKg,
          peso_toneladas: parseFloat((pesoKg / 1000).toFixed(2)),
          valor_frete_venda: valorFrete,
          placa_veiculo: placa,
          nfe_referencia: nfeRef,
        };
      }
    } catch (e) {}
    return null;
  };

  // Upload XML 1
  const handleXmlUpload1 = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting1(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const xmlString = await readXmlFileAsText(file);
      let d = null;
      try {
        const res = await api.post('/import/xml-text', { xml: xmlString });
        d = res.data?.dados;
      } catch (apiErr) {
        d = parseXmlClientSide(xmlString);
        if (!d) throw apiErr;
      }

      if (!d) d = parseXmlClientSide(xmlString);

      if (!d || (!d.numero_cte && !d.cliente_nome && !d.origem_cidade && !d.peso_kg && !d.valor_frete_venda)) {
        throw new Error('Não foi possível reconhecer os dados do CT-e no arquivo XML.');
      }

      setFormData((prev) => ({
        ...prev,
        numero_cte: d.numero_cte || prev.numero_cte,
        chave_cte: d.chave_cte || prev.chave_cte,
        nfe_referencia: d.nfe_referencia || prev.nfe_referencia,
        peso_kg: d.peso_kg || prev.peso_kg,
        origem_cidade: d.origem_cidade || prev.origem_cidade,
        origem_uf: d.origem_uf || prev.origem_uf,
        destino_cidade: d.destino_cidade || prev.destino_cidade,
        destino_uf: d.destino_uf || prev.destino_uf,
        cliente_nome: d.cliente_nome || prev.cliente_nome,
        cliente_cnpj: d.cliente_cnpj || prev.cliente_cnpj,
        motorista_nome: d.motorista_nome || prev.motorista_nome,
        placa_veiculo: d.placa_veiculo || prev.placa_veiculo,
        placa_carreta: d.placa_carreta || prev.placa_carreta,
        valor_frete_venda: d.valor_frete_venda !== undefined && d.valor_frete_venda !== null ? d.valor_frete_venda : prev.valor_frete_venda,
        xml_bruto: xmlString,
      }));

      setFeedbackMsg({
        type: 'success',
        text: `CT-e 1 Nº ${d.numero_cte || 'S/N'} importado com sucesso! Valor Bruto: ${formatMoney(d.valor_frete_venda || 0)} | Tomador: ${d.cliente_nome || 'N/I'}`,
      });
    } catch (err) {
      console.error('Erro ao importar XML 1:', err);
      setFeedbackMsg({ type: 'error', text: 'Erro ao ler arquivo XML: ' + (err.response?.data?.error || err.message) });
    } finally {
      setImporting1(false);
      if (fileInputRef1.current) fileInputRef1.current.value = '';
    }
  };

  // Upload XML 2 (Triangular)
  const handleXmlUpload2 = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting2(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const xmlString = await readXmlFileAsText(file);
      let d = null;
      try {
        const res = await api.post('/import/xml-text', { xml: xmlString });
        d = res.data?.dados;
      } catch (apiErr) {
        d = parseXmlClientSide(xmlString);
        if (!d) throw apiErr;
      }

      if (!d) d = parseXmlClientSide(xmlString);

      setFormData((prev) => ({
        ...prev,
        numero_cte_2: d.numero_cte || prev.numero_cte_2,
        chave_cte_2: d.chave_cte || prev.chave_cte_2,
        nfe_referencia_2: d.nfe_referencia || prev.nfe_referencia_2,
        peso_kg_2: d.peso_kg || prev.peso_kg_2 || prev.peso_kg,
        cliente_nome_2: d.cliente_nome || prev.cliente_nome_2,
        cliente_cnpj_2: d.cliente_cnpj || prev.cliente_cnpj_2,
        destino_cidade: d.destino_cidade || prev.destino_cidade,
        destino_uf: d.destino_uf || prev.destino_uf,
        valor_frete_venda_2: d.valor_frete_venda !== undefined && d.valor_frete_venda !== null ? d.valor_frete_venda : prev.valor_frete_venda_2,
      }));

      setFeedbackMsg({ 
        type: 'success', 
        text: `CT-e 2 Nº ${d.numero_cte || ''} importado com sucesso! Valor Bruto 2: ${formatMoney(d.valor_frete_venda || 0)} | Tomador 2: ${d.cliente_nome || 'N/I'}` 
      });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao ler XML 2: ' + (err.response?.data?.error || err.message) });
    } finally {
      setImporting2(false);
      if (fileInputRef2.current) fileInputRef2.current.value = '';
    }
  };

  const handleProcessPastedText = async () => {
    if (!pasteText.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Cole o texto do XML ou chave no campo.' });
      return;
    }

    try {
      let d = null;
      try {
        const res = await api.post('/import/xml-text', { xml: pasteText });
        d = res.data?.dados;
      } catch (e) {
        d = parseXmlClientSide(pasteText);
      }

      if (!d) d = parseXmlClientSide(pasteText);

      if (!d || (!d.numero_cte && !d.cliente_nome && !d.origem_cidade && !d.peso_kg)) {
        throw new Error('Não foi possível extrair os dados do CT-e do texto fornecido.');
      }

      if (pasteTarget === 'cte1') {
        setFormData((prev) => ({
          ...prev,
          numero_cte: d.numero_cte || prev.numero_cte,
          chave_cte: d.chave_cte || prev.chave_cte,
          nfe_referencia: d.nfe_referencia || prev.nfe_referencia,
          peso_kg: d.peso_kg || prev.peso_kg,
          origem_cidade: d.origem_cidade || prev.origem_cidade,
          origem_uf: d.origem_uf || prev.origem_uf,
          destino_cidade: d.destino_cidade || prev.destino_cidade,
          destino_uf: d.destino_uf || prev.destino_uf,
          cliente_nome: d.cliente_nome || prev.cliente_nome,
          cliente_cnpj: d.cliente_cnpj || prev.cliente_cnpj,
          motorista_nome: d.motorista_nome || prev.motorista_nome,
          placa_veiculo: d.placa_veiculo || prev.placa_veiculo,
          placa_carreta: d.placa_carreta || prev.placa_carreta,
          valor_frete_venda: d.valor_frete_venda || prev.valor_frete_venda,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          numero_cte_2: d.numero_cte || prev.numero_cte_2,
          chave_cte_2: d.chave_cte || prev.chave_cte_2,
          nfe_referencia_2: d.nfe_referencia || prev.nfe_referencia_2,
          peso_kg_2: d.peso_kg || prev.peso_kg_2 || prev.peso_kg,
          cliente_nome_2: d.cliente_nome || prev.cliente_nome_2,
          cliente_cnpj_2: d.cliente_cnpj || prev.cliente_cnpj_2,
          destino_cidade: d.destino_cidade || prev.destino_cidade,
          destino_uf: d.destino_uf || prev.destino_uf,
          valor_frete_venda_2: d.valor_frete_venda || prev.valor_frete_venda_2,
        }));
      }

      setFeedbackMsg({ type: 'success', text: 'Dados extraídos com sucesso do texto fornecido!' });
      setIsPasteOpen(false);
      setPasteText('');
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao processar texto: ' + (err.response?.data?.error || err.message) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.motorista_nome || !formData.origem_cidade || !formData.destino_cidade) {
      setFeedbackMsg({ type: 'error', text: 'Preencha os campos obrigatórios (Freteiro, Origem e Destino).' });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        origem_registro: freteEdit?.origem_registro || defaultOrigem,
        tipo_operacao: isLicencaGestao || formData.tipo_operacao === 'gestao_pagamentos' ? 'gestao_pagamentos' : isLicencaRepasse || formData.tipo_operacao === 'agenciamento_repasse' ? 'agenciamento_repasse' : (formatoOperacao === 'triangular' ? 'triangular' : 'padrao'),
        formato_operacao: formatoOperacao,
        valor_frete_venda: valorVenda1,
        valor_frete_venda_2: formatoOperacao === 'triangular' ? valorVenda2 : 0,
        valor_frete_compra: valorCompraFinal,
        valor_frete_real: valorFreteReal,
        favorecido_freteiro_nome: formData.favorecido_freteiro_nome || formData.motorista_nome || null,
        valor_comissao: valorComissaoAgenciamento,
        percentual_comissao: pctComissao,
        destinatario_comissao_nome: formData.destinatario_comissao_nome || null,
        destinatario_comissao_doc: formData.destinatario_comissao_doc || null,
        valor_repasse: valorRepasseAgenciamento,
        destinatario_repasse_nome: formData.destinatario_repasse_nome || null,
        destinatario_repasse_doc: formData.destinatario_repasse_doc || null,
        valor_adiantamento: adiantamentoCalc,
        percentual_adiantamento: formData.percentual_adiantamento === '' ? 0 : parseFloat(formData.percentual_adiantamento || 0),
      };

      if (freteEdit) {
        await api.put(`/fretes/${freteEdit.id}`, payload);
      } else {
        await api.post('/fretes', payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar frete.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-6 max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLicencaGestao ? 'bg-blue-600/20 text-blue-400' : isLicencaRepasse ? 'bg-indigo-600/20 text-indigo-400' : 'bg-blue-600/20 text-blue-400'}`}>
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-white">
                {freteEdit 
                  ? 'Editar Frete' 
                  : isLicencaGestao
                  ? 'Organização & Gestão de Pagamentos (Rateio)'
                  : isLicencaRepasse 
                  ? 'Agenciamento & Repasse (Comissão de 5%)' 
                  : 'Lançamento de Frete por Tonelada / Quilo'}
              </h3>
              <p className="text-xs text-slate-400">
                {isLicencaGestao
                  ? `Licença #${activeEmpresa?.codigo_licenca || activeEmpresa?.id} • Modo Gestão de Pagamentos (Freteiro, Comissão e Repasse)`
                  : isLicencaRepasse
                  ? `Licença #${activeEmpresa?.codigo_licenca || activeEmpresa?.id} • Modo Agenciamento com Repasse e Frete Real`
                  : `Licença #${activeEmpresa?.codigo_licenca || activeEmpresa?.id} • Subcontratação Padrão com Margem e Adiantamento`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Mensagens de Feedback */}
          {feedbackMsg.text && (
            <div className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}>
              {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* SELETOR DE FORMATO: 1 CT-E OU 2 CT-ES (TRIANGULAR) */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Formato da Operação:</span>
              <span className="text-[11px] text-slate-400">
                {isLicencaRepasse
                  ? 'Escolha se a viagem possui 1 CT-e simples ou 2 CT-es (venda triangular)'
                  : 'Escolha entre 1 CT-e ou operação triangular'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-750">
              <button
                type="button"
                onClick={() => setFormatoOperacao('simples')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  formatoOperacao === 'simples'
                    ? isLicencaRepasse ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1 CT-e (Simples)
              </button>

              <button
                type="button"
                onClick={() => setFormatoOperacao('triangular')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  formatoOperacao === 'triangular'
                    ? isLicencaRepasse ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Repeat className="h-3.5 w-3.5" />
                <span>2 CT-es (Triangular)</span>
              </button>
            </div>
          </div>

          {/* BOTÕES RÁPIDOS DE IMPORTAÇÃO DE XML */}
          {!freteEdit && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  onClick={() => fileInputRef1.current?.click()}
                  className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-3.5 text-center cursor-pointer bg-slate-900/70 hover:bg-slate-850 transition flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4 text-indigo-400" />
                  <span className="font-bold text-slate-200 text-xs sm:text-sm">
                    {importing1 ? 'Lendo CT-e 1...' : formatoOperacao === 'triangular' ? 'Importar XML do CT-e 1' : 'Importar XML do CT-e'}
                  </span>
                  <input
                    ref={fileInputRef1}
                    type="file"
                    accept=".xml,.txt,text/xml,application/xml,text/plain"
                    onChange={handleXmlUpload1}
                    className="hidden"
                  />
                </div>

                {formatoOperacao === 'triangular' && (
                  <div
                    onClick={() => fileInputRef2.current?.click()}
                    className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-2xl p-3.5 text-center cursor-pointer bg-slate-900/70 hover:bg-slate-850 transition flex items-center justify-center gap-2"
                  >
                    <Upload className="h-4 w-4 text-purple-400" />
                    <span className="font-bold text-slate-200 text-xs sm:text-sm">
                      {importing2 ? 'Lendo CT-e 2...' : 'Importar XML do CT-e 2 (Destino)'}
                    </span>
                    <input
                      ref={fileInputRef2}
                      type="file"
                      accept=".xml,.txt,text/xml,application/xml,text/plain"
                      onChange={handleXmlUpload2}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Botão para Colar XML em Texto */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsPasteOpen(!isPasteOpen)}
                  className="text-xs text-slate-400 hover:text-indigo-400 transition flex items-center gap-1.5 font-medium py-1 px-3 rounded-lg hover:bg-slate-800"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  <span>{isPasteOpen ? 'Fechar campo de colar XML' : '📋 Ou clique aqui para colar texto / chave do XML'}</span>
                </button>
              </div>

              {/* Caixa de Texto para Colar XML */}
              {isPasteOpen && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Cole o código XML ou chave do CT-e:</span>
                    {formatoOperacao === 'triangular' && (
                      <div className="flex items-center gap-2 text-xs">
                        <label className="flex items-center gap-1 text-indigo-300 font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="pasteTarget"
                            checked={pasteTarget === 'cte1'}
                            onChange={() => setPasteTarget('cte1')}
                          />
                          CT-e 1
                        </label>
                        <label className="flex items-center gap-1 text-purple-300 font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="pasteTarget"
                            checked={pasteTarget === 'cte2'}
                            onChange={() => setPasteTarget('cte2')}
                          />
                          CT-e 2
                        </label>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Cole aqui o conteúdo do XML (<cteProc>...</cteProc>) ou a chave de 44 dígitos..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsPasteOpen(false); setPasteText(''); }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                    >
                      Processar Texto Colado
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* CARD DO CT-E 1 */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="font-bold text-indigo-400 uppercase flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>{formatoOperacao === 'triangular' ? 'Dados do CT-e 1' : 'Dados do CT-e'}</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {pesoTon1 > 0 ? `${pesoTon1.toFixed(2)} Toneladas (${pesoKg1.toLocaleString('pt-BR')} kg)` : 'Informe o peso'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Nº do CT-e 1 *</label>
                <input
                  type="text"
                  required
                  name="numero_cte"
                  value={formData.numero_cte}
                  onChange={handleChange}
                  placeholder="Ex: 004589"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nota Fiscal (NF-e)</label>
                <input
                  type="text"
                  name="nfe_referencia"
                  value={formData.nfe_referencia}
                  onChange={handleChange}
                  placeholder="Ex: NF-e 12345"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Peso da Carga (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  name="peso_kg"
                  value={formData.peso_kg}
                  onChange={handleChange}
                  placeholder="Ex: 35060"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tomador de Serviço (Cliente 1)</label>
                <input
                  type="text"
                  name="cliente_nome"
                  value={formData.cliente_nome}
                  onChange={handleChange}
                  placeholder="Ex: Cooperativa Agro..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-semibold text-indigo-300"
                />
              </div>
            </div>

            {/* VALOR DO CT-E 1 */}
            {isLicencaGestao || isLicencaRepasse || formData.tipo_operacao === 'gestao_pagamentos' || formData.tipo_operacao === 'agenciamento_repasse' ? (
              // NO MODO GESTÃO DE PAGAMENTOS OU AGENCIAMENTO: APENAS O VALOR REAL DO CT-E (SEM TARIFA / SEM TONELADA)
              <div className="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs text-indigo-300 font-bold mb-0.5">
                    Valor Real do CT-e 1 (R$) *
                  </label>
                  <p className="text-[11px] text-slate-400">Valor total bruto emitido no documento fiscal CT-e 1</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    name="valor_frete_venda"
                    value={formData.valor_frete_venda}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-48 bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-white font-mono font-black text-base focus:border-indigo-400 focus:outline-none text-right"
                  />
                </div>
              </div>
            ) : (
              // NO MODO SUBCONTRATAÇÃO PADRÃO: ESCOLHA ENTRE TONELADA, KG OU FIXO
              <div className="p-3 rounded-xl bg-slate-900 border border-blue-500/30 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[11px] text-blue-300 font-semibold mb-1">Base do Cálculo 1</label>
                  <select
                    name="tarifa_tipo_venda"
                    value={formData.tarifa_tipo_venda}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none"
                  >
                    <option value="ton">R$ por Tonelada (R$/ton)</option>
                    <option value="kg">R$ por Quilo (R$/kg)</option>
                    <option value="fixo">Valor Fechado (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-blue-300 font-semibold mb-1">
                    {formData.tarifa_tipo_venda === 'ton' ? 'Valor por Tonelada (R$)' : formData.tarifa_tipo_venda === 'kg' ? 'Valor por Quilo (R$)' : 'Valor Total Fechado (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="tarifa_valor_venda"
                    value={formData.tarifa_valor_venda}
                    onChange={handleChange}
                    placeholder={formData.tarifa_tipo_venda === 'ton' ? 'Ex: 40.00' : 'Ex: 0.04'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block uppercase font-semibold">Valor a Receber (CT-e 1):</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{formatMoney(valorVenda1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* CARD DO CT-E 2 (QUANDO SELECIONADO 2 CT-ES TRIANGULAR) */}
          {/* ========================================================================= */}
          {formatoOperacao === 'triangular' && (
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                <span className="font-bold text-purple-400 uppercase flex items-center gap-1.5">
                  <Repeat className="h-4 w-4" />
                  <span>Dados do CT-e 2 (Operação Triangular)</span>
                </span>
                <span className="text-purple-300 font-mono text-[11px]">
                  {pesoTon2 > 0 ? `${pesoTon2.toFixed(2)} Toneladas (${pesoKg2.toLocaleString('pt-BR')} kg)` : 'Informe o peso'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nº do CT-e 2 *</label>
                  <input
                    type="text"
                    required
                    name="numero_cte_2"
                    value={formData.numero_cte_2}
                    onChange={handleChange}
                    placeholder="Ex: 004590"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nota Fiscal 2 (NF-e)</label>
                  <input
                    type="text"
                    name="nfe_referencia_2"
                    value={formData.nfe_referencia_2}
                    onChange={handleChange}
                    placeholder="Ex: NF-e 67890"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Peso CT-e 2 (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="peso_kg_2"
                    value={formData.peso_kg_2 || formData.peso_kg}
                    onChange={handleChange}
                    placeholder="Ex: 35060"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tomador de Serviço (Cliente 2)</label>
                  <input
                    type="text"
                    name="cliente_nome_2"
                    value={formData.cliente_nome_2}
                    onChange={handleChange}
                    placeholder="Ex: Moinho Arapongas..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none font-semibold text-purple-300"
                  />
                </div>
              </div>

              {/* VALOR DO CT-E 2 */}
              {isLicencaGestao || isLicencaRepasse || formData.tipo_operacao === 'gestao_pagamentos' || formData.tipo_operacao === 'agenciamento_repasse' ? (
                // NO MODO GESTÃO DE PAGAMENTOS OU AGENCIAMENTO: APENAS O VALOR REAL DO CT-E 2 (SEM TARIFA / SEM TONELADA)
                <div className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs text-purple-300 font-bold mb-0.5">
                      Valor Real do CT-e 2 (R$) *
                    </label>
                    <p className="text-[11px] text-slate-400">Valor total bruto emitido no documento fiscal CT-e 2</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      name="valor_frete_venda_2"
                      value={formData.valor_frete_venda_2}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-48 bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white font-mono font-black text-base focus:border-purple-400 focus:outline-none text-right"
                    />
                  </div>
                </div>
              ) : (
                // NO MODO SUBCONTRATAÇÃO PADRÃO: ESCOLHA ENTRE TONELADA, KG OU FIXO
                <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-purple-300 font-semibold mb-1">Base do Cálculo 2</label>
                    <select
                      name="tarifa_tipo_venda_2"
                      value={formData.tarifa_tipo_venda_2}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none"
                    >
                      <option value="ton">R$ por Tonelada (R$/ton)</option>
                      <option value="kg">R$ por Quilo (R$/kg)</option>
                      <option value="fixo">Valor Fechado (R$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-purple-300 font-semibold mb-1">
                      {formData.tarifa_tipo_venda_2 === 'ton' ? 'Valor por Tonelada (R$)' : formData.tarifa_tipo_venda_2 === 'kg' ? 'Valor por Quilo (R$)' : 'Valor Total Fechado (R$)'}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="tarifa_valor_venda_2"
                      value={formData.tarifa_valor_venda_2}
                      onChange={handleChange}
                      placeholder={formData.tarifa_tipo_venda_2 === 'ton' ? 'Ex: 40.00' : 'Ex: 0.04'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-semibold">Valor a Receber (CT-e 2):</span>
                    <span className="text-base font-bold text-purple-300 font-mono">{formatMoney(valorVenda2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEÇÃO PRINCIPAL DE RATEIO E DESTINAÇÃO DE PAGAMENTOS */}
          {/* ========================================================================= */}
          {(isLicencaGestao || formData.tipo_operacao === 'gestao_pagamentos') ? (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-indigo-950/20 to-slate-900 border-2 border-indigo-500/50 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-500/30 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white uppercase text-xs tracking-wider block">
                      Rateio de Pagamentos (Freteiro, Comissão e Repasse)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Os 3 valores serão lançados automaticamente com seus respectivos favorecidos no Contas a Pagar
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow">
                    {isLicencaGestao ? 'Total dos CT-es a Ratear:' : 'Total Bruto do CT-e:'} {formatMoney(valorVendaTotal)}
                  </span>
                </div>
              </div>

              {formatoOperacao === 'triangular' && (
                <div className="text-[11px] text-indigo-200/90 bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-500/30 flex justify-between items-center">
                  <span>CT-e 1: <strong className="text-white font-mono">{formatMoney(valorVenda1)}</strong></span>
                  <span className="text-slate-500">+</span>
                  <span>CT-e 2: <strong className="text-white font-mono">{formatMoney(valorVenda2)}</strong></span>
                  <span className="text-slate-500">=</span>
                  <span className="font-bold text-emerald-400 font-mono">{isLicencaGestao ? 'Soma Total dos CT-es:' : 'Soma Bruta Faturada:'} {formatMoney(valorVendaTotal)}</span>
                </div>
              )}

              {/* Grid: 1. Frete Real (Gilmar) | 2. Comissão (Colorado) | 3. Repasse (Pulpo) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                
                {/* 1. FRETE REAL (FRETEIRO / TRANSPORTADOR) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-emerald-500/60 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 text-[11px] uppercase font-bold flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      <span>1. Frete Real (Freteiro) *</span>
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">DIGITE O VALOR</span>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Valor do Frete Real (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      name="valor_frete_real"
                      value={formData.valor_frete_real}
                      onChange={handleChange}
                      placeholder="Ex: 4000.00"
                      className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-white font-mono font-black text-base focus:border-emerald-400 focus:outline-none shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Favorecido / Transportador (Conta a Pagar):</label>
                    <input
                      type="text"
                      autoComplete="off"
                      name="favorecido_freteiro_nome"
                      value={formData.favorecido_freteiro_nome !== undefined && formData.favorecido_freteiro_nome !== '' ? formData.favorecido_freteiro_nome : (formData.motorista_nome || '')}
                      onChange={(e) => setFormData({ ...formData, favorecido_freteiro_nome: e.target.value })}
                      placeholder="Nome do freteiro / transportador"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Gera Conta a Pagar na categoria <strong>Frete de Terceiro</strong> para este favorecido.
                  </p>
                </div>

                {/* 2. COMISSÃO DA OPERAÇÃO */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-purple-500/60 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 text-[11px] uppercase font-bold flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>2. Comissão a Pagar (Agenciador / Fornecedor)</span>
                    </span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">DIGITE EM R$</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Valor da Comissão a Pagar (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor_comissao"
                      value={formData.valor_comissao !== undefined ? formData.valor_comissao : ''}
                      onChange={handleChange}
                      placeholder="0.00 (Opcional - Ex: 500.00)"
                      className="w-full bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white font-mono font-black text-base focus:border-purple-400 focus:outline-none shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Agenciador / Fornecedor da Comissão (Favorecido):</label>
                    <input
                      type="text"
                      autoComplete="off"
                      name="destinatario_comissao_nome"
                      value={formData.destinatario_comissao_nome || ''}
                      onChange={handleChange}
                      placeholder="Nome do agenciador"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Gera Conta a Pagar de <strong>Comissão de Agenciamento</strong> para o fornecedor indicado.
                  </p>
                </div>

                {/* 3. REPASSE RESTANTE */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-indigo-500/60 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300 text-[11px] uppercase font-bold flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5" />
                      <span>3. Valor do Repasse a Pagar</span>
                    </span>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">SALDO RESTANTE</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Valor do Repasse (R$):</span>
                      <button
                        type="button"
                        onClick={() => {
                          const autoRepasse = Math.max(0, Number((valorVendaTotal - valorFreteReal - valorComissaoAgenciamento).toFixed(2)));
                          setFormData({ ...formData, valor_repasse: autoRepasse });
                        }}
                        className="text-[9px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        Auto-calcular Saldo
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      name="valor_repasse"
                      value={formData.valor_repasse !== undefined && formData.valor_repasse !== '' ? formData.valor_repasse : valorRepasseAgenciamento}
                      onChange={handleChange}
                      placeholder="0.00 (Ex: 1400.00)"
                      className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-white font-mono font-black text-base focus:border-indigo-400 focus:outline-none shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Destinatário do Repasse (Favorecido):</label>
                    <input
                      type="text"
                      autoComplete="off"
                      name="destinatario_repasse_nome"
                      value={formData.destinatario_repasse_nome || ''}
                      onChange={handleChange}
                      placeholder="Nome da conta de destino / parceiro"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Gera Conta a Pagar de <strong>Repasse Financeiro</strong> para o parceiro definido.
                  </p>
                </div>

              </div>

              {/* CARD DE CONFERÊNCIA MATEMÁTICA EM TEMPO REAL */}
              {(() => {
                const somaRateio = Number((valorFreteReal + valorComissaoAgenciamento + valorRepasseAgenciamento).toFixed(2));
                const diferenca = Number((valorVendaTotal - somaRateio).toFixed(2));
                const isEquilibrado = Math.abs(diferenca) < 0.01 && valorVendaTotal > 0;
                const isFreteMaiorCte = diferenca < -0.01 && valorVendaTotal > 0;
                const valorPorFora = Math.abs(diferenca);

                return (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                    isEquilibrado
                      ? 'bg-slate-950/90 border-emerald-500/40 text-slate-300'
                      : isFreteMaiorCte
                      ? 'bg-blue-950/30 border-blue-500/50 text-blue-200'
                      : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  }`}>
                    <div className="flex items-center justify-between font-semibold flex-wrap gap-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className={`h-4 w-4 ${isEquilibrado ? 'text-emerald-400' : isFreteMaiorCte ? 'text-blue-400' : 'text-amber-400'}`} />
                        <span>{isFreteMaiorCte ? 'Conferência: Frete Declarado Superior ao CT-e' : 'Conferência de Rateio e Fechamento'}</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        Soma Rateada: {formatMoney(somaRateio)} / Total CT-e: {formatMoney(valorVendaTotal)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-xs flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-emerald-400 font-bold">
                        Freteiro ({formData.favorecido_freteiro_nome || formData.motorista_nome || 'Freteiro'}): {formatMoney(valorFreteReal)}
                      </span>
                      {valorComissaoAgenciamento > 0 && (
                        <>
                          <span className="text-slate-500">+</span>
                          <span className="text-purple-400 font-bold">
                            Comissão ({formData.destinatario_comissao_nome || 'Agenciador'}): {formatMoney(valorComissaoAgenciamento)}
                          </span>
                        </>
                      )}
                      {valorRepasseAgenciamento > 0 && (
                        <>
                          <span className="text-slate-500">+</span>
                          <span className="text-indigo-400 font-bold">
                            Repasse ({formData.destinatario_repasse_nome || 'Conta de Destino'}): {formatMoney(valorRepasseAgenciamento)}
                          </span>
                        </>
                      )}
                      <span className="text-slate-500">=</span>
                      <span className="text-white font-black bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        Total: {formatMoney(somaRateio)}
                      </span>
                    </div>

                    {isFreteMaiorCte ? (
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-blue-500/30 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">📄 Coberto pelo CT-e Fiscal:</span>
                          <span className="font-mono font-bold text-white">{formatMoney(valorVendaTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-amber-300 font-semibold pt-1 border-t border-slate-800">
                          <span className="flex items-center gap-1.5">
                            <span>💼 Parcela Complementar ("Por Fora"):</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                              Gerado no Financeiro
                            </span>
                          </span>
                          <span className="font-mono font-bold text-amber-400">+{formatMoney(valorPorFora)}</span>
                        </div>
                        <p className="text-[10px] text-blue-300 pt-1 border-t border-slate-800/80 leading-relaxed">
                          💡 <strong>Vinculação Financeira Automática:</strong> O financeiro gerará 1 Contas a Receber ({formatMoney(valorVendaTotal)}) do cliente e dividirá o pagamento do motorista em: Parcela Fiscal CT-e ({formatMoney(valorVendaTotal)}) + Parcela "Por Fora" ({formatMoney(valorPorFora)}) com CT-e, placa e peso informados.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center text-[11px]">
                        {isEquilibrado ? (
                          <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Rateio 100% Equilibrado! Os pagamentos cobrem exatamente o valor do CT-e.</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center justify-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Atenção: Sobra de {formatMoney(Math.abs(diferenca))} no CT-e a ser rateada.</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : isLicencaRepasse ? (
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/50 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <span>Negociação do Frete Real, Comissão (5%) e Repasse</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Total Bruto do(s) CT-e(s): {formatMoney(valorVendaTotal)}
                </span>
              </div>

              {formatoOperacao === 'triangular' && (
                <div className="text-[11px] text-indigo-200/80 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/20 flex justify-between">
                  <span>CT-e 1: <strong>{formatMoney(valorVenda1)}</strong></span>
                  <span>+</span>
                  <span>CT-e 2: <strong>{formatMoney(valorVenda2)}</strong></span>
                  <span>=</span>
                  <span className="font-bold text-white font-mono">Soma Bruta: {formatMoney(valorVendaTotal)}</span>
                </div>
              )}

              {/* Grid: 1. Frete Real (Input) | 2. Comissão 5% | 3. Repasse Restante */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* 1. VALOR REAL DO FRETE */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-emerald-500/60 shadow-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 text-[11px] uppercase font-bold">1. Frete Real (Freteiro) *</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">DIGITE O VALOR</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    name="valor_frete_real"
                    value={formData.valor_frete_real}
                    onChange={handleChange}
                    placeholder="Ex: 8500.00"
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-white font-mono font-black text-base focus:border-emerald-400 focus:outline-none shadow-inner"
                  />
                  <p className="text-[10px] text-slate-400">Valor real negociado para pagar ao freteiro.</p>
                </div>

                {/* 2. COMISSÃO DA EMPRESA (5%) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-purple-500/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 text-[11px] uppercase font-bold">2. Comissão Retida</span>
                    <span className="text-purple-300 text-[10px] font-bold font-mono bg-purple-500/20 px-1.5 py-0.5 rounded">
                      {pctComissao}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-400 font-mono pt-1">
                    {formatMoney(valorComissaoAgenciamento)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Calculado: {pctComissao}% sobre o Frete Real ({formatMoney(valorFreteReal)}).
                  </p>
                </div>

                {/* 3. VALOR DE REPASSE (RESTANTE) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-indigo-500/60 shadow-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300 text-[11px] uppercase font-bold">3. Valor de Repasse</span>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">REPASSE</span>
                  </div>
                  <div className="text-2xl font-black text-indigo-400 font-mono pt-1">
                    {formatMoney(valorRepasseAgenciamento)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Restante: Total CT-e menos Frete Real e Comissão.
                  </p>
                </div>

              </div>

              {/* CARD DE CONFERÊNCIA MATEMÁTICA EM TEMPO REAL */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Conferência de Fechamento da Operação</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    {formatMoney(valorFreteReal + valorComissaoAgenciamento + valorRepasseAgenciamento)} / {formatMoney(valorVendaTotal)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 font-mono text-center text-xs text-slate-300 flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-emerald-400 font-bold">Freteiro: {formatMoney(valorFreteReal)}</span>
                  <span>+</span>
                  <span className="text-purple-400 font-bold">Comissão ({pctComissao}%): {formatMoney(valorComissaoAgenciamento)}</span>
                  <span>+</span>
                  <span className="text-indigo-400 font-bold">Repasse: {formatMoney(valorRepasseAgenciamento)}</span>
                  <span>=</span>
                  <span className="text-white font-black bg-slate-800 px-2 py-0.5 rounded">CT-e Total: {formatMoney(valorVendaTotal)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* CONSOLIDAÇÃO FINANCEIRA SUBCONTRATAÇÃO TRADICIONAL */
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span>Fechamento Financeiro & Frete Único do Motorista</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  Peso: <strong>{pesoTon1.toFixed(2)} ton</strong> ({pesoKg1.toLocaleString('pt-BR')} kg)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-750 flex flex-col justify-between">
                  <span className="text-slate-400 text-[11px] uppercase font-semibold">Total a Receber dos Clientes:</span>
                  <h4 className="text-2xl font-black text-white font-mono mt-1">{formatMoney(valorVendaTotal)}</h4>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-750 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-300 text-[11px] uppercase font-semibold">Frete Pago ao Motorista:</span>
                    <select
                      name="tarifa_tipo_compra"
                      value={formData.tarifa_tipo_compra}
                      onChange={handleChange}
                      className="bg-slate-800 border border-slate-700 rounded text-[10px] text-white px-1.5 py-0.5"
                    >
                      <option value="ton">R$/ton</option>
                      <option value="fixo">R$ Fixo</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      name={formData.tarifa_tipo_compra === 'ton' ? 'tarifa_valor_compra' : 'valor_frete_compra'}
                      value={formData.tarifa_tipo_compra === 'ton' ? formData.tarifa_valor_compra : formData.valor_frete_compra}
                      onChange={handleChange}
                      placeholder={formData.tarifa_tipo_compra === 'ton' ? 'Tarifa R$/ton' : 'Total R$'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none"
                    />
                    <div className="flex items-center justify-end font-mono font-bold text-indigo-300 text-sm">
                      {formatMoney(valorCompraPadrao)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                comissaoPadrao >= 0 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-slate-400">Sua Comissão Líquida / Lucro Real:</p>
                  <h3 className="text-2xl font-black font-heading mt-0.5">{formatMoney(comissaoPadrao)}</h3>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                  comissaoPadrao >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  Margem: {margemPadrao.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* ROTA DA VIAGEM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-750">
            <div>
              <p className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span>Origem (Carregamento)*</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  name="origem_cidade"
                  value={formData.origem_cidade}
                  onChange={handleChange}
                  placeholder="Ex: Mafra"
                  className="col-span-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  maxLength={2}
                  name="origem_uf"
                  value={formData.origem_uf}
                  onChange={handleChange}
                  placeholder="SC"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center uppercase font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span>Destino (Descarregamento)*</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  name="destino_cidade"
                  value={formData.destino_cidade}
                  onChange={handleChange}
                  placeholder="Ex: Curitiba"
                  className="col-span-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  maxLength={2}
                  name="destino_uf"
                  value={formData.destino_uf}
                  onChange={handleChange}
                  placeholder="PR"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center uppercase font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* DADOS DO FRETEIRO / MOTORISTA E PIX EM DESTAQUE */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-750 space-y-3 relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white flex items-center gap-1.5 uppercase">
                <Truck className="h-4 w-4 text-indigo-400" />
                <span>Freteiro Terceirizado, Veículo & Dados Bancários / PIX</span>
              </p>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Selecione da lista ou digite os dados</span>
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Campo Motorista com Dropdown Autocomplete */}
              <div className="relative" ref={motoristaDropdownRef}>
                <label className="block text-[11px] text-slate-400 mb-1">Nome do Freteiro / Motorista *</label>
                <input
                  type="text"
                  required
                  name="motorista_nome"
                  value={formData.motorista_nome}
                  onFocus={() => setShowMotoristaSuggestions(true)}
                  onChange={(e) => {
                    handleChange(e);
                    setShowMotoristaSuggestions(true);
                  }}
                  placeholder="Digite para buscar..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-bold"
                  autoComplete="off"
                />

                {/* Dropdown de Sugestões */}
                {showMotoristaSuggestions && motoristasFiltrados.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {motoristasFiltrados.map((m) => (
                      <div
                        key={m.id}
                        onMouseDown={() => handleSelectMotorista(m)}
                        className="p-2.5 hover:bg-slate-800 cursor-pointer transition flex flex-col gap-0.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-xs">{m.nome}</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded font-bold">
                            {m.placa_cavalo || m.placa || 'Sem placa'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>Tel: {m.telefone || 'S/ Tel'}</span>
                          {m.pix_chave && <span className="text-purple-300 font-mono">PIX: {m.pix_chave} ({m.pix_tipo || 'CPF'})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  name="motorista_telefone"
                  value={formData.motorista_telefone}
                  onChange={handleChange}
                  placeholder="(41) 98765-4321"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              {/* Chave PIX do Freteiro */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-emerald-400 font-bold">Chave PIX do Freteiro</label>
                  {formData.pix_chave && (
                    <button
                      type="button"
                      onClick={() => handleCopyPix(formData.pix_chave)}
                      className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      {copiedPix ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  name="pix_chave"
                  value={formData.pix_chave}
                  onChange={handleChange}
                  placeholder="Ex: CPF, Telefone, E-mail ou Aleatória"
                  className="w-full bg-slate-800 border border-emerald-500/40 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Placa Cavalo / Caminhão</label>
                <input
                  type="text"
                  name="placa_veiculo"
                  value={formData.placa_veiculo}
                  onChange={handleChange}
                  placeholder="ABC1D23"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Placa Carreta</label>
                <input
                  type="text"
                  name="placa_carreta"
                  value={formData.placa_carreta}
                  onChange={handleChange}
                  placeholder="XYZ9E87"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900 py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'Salvando...' : freteEdit ? 'Atualizar Frete' : 'Salvar Frete'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
