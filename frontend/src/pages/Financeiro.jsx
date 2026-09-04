import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Printer, 
  Building2, 
  Truck,
  Calendar,
  AlertCircle,
  Repeat,
  MapPin,
  PlusCircle,
  Filter,
  Search,
  Zap,
  Droplet,
  Wifi,
  Fuel,
  Wrench,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Landmark,
  Layers,
  X,
  Trash2,
  CheckCheck,
  QrCode,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Plus,
  PackageCheck,
  Globe,
  Eye,
  Scissors
} from 'lucide-react';
import api from '../services/api';
import { StatusPagamentoBadge, StatusRecebimentoBadge, StatusFreteBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function Financeiro({ onOpenLancamento, onOpenRecibo }) {
  const { user, activeEmpresa, metodologiaAtiva, setMetodologiaAtiva } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('pagar'); // 'pagar' | 'receber' | 'demonstrativo'
  
  const [titulos, setTitulos] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [planoContas, setPlanoContas] = useState({ despesas: [], receitas: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Modal Exclusão de Lançamentos
  const [tituloParaExcluir, setTituloParaExcluir] = useState(null);
  const [isExcluindo, setIsExcluindo] = useState(false);

  // Filtros
  const [filtroOrigem, setFiltroOrigem] = useState('todos'); // 'todos' | 'frete_cte' | 'operacional_fixo'
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos' | 'pendente' | 'pago'
  const [search, setSearch] = useState('');

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [novoFormData, setNovoFormData] = useState({
    tipo: 'pagar',
    categoria: 'energia',
    categoria_nome: '',
    descricao: '',
    pessoa_nome: '',
    pessoa_documento: '',
    valor: '',
    data_vencimento: new Date().toISOString().slice(0, 10),
    data_emissao: new Date().toISOString().slice(0, 10),
    forma_pagamento: 'Boleto',
    observacoes: ''
  });
  const [savingNovo, setSavingNovo] = useState(false);
  const [novoError, setNovoError] = useState('');

  // Modal de Baixa / Quitação
  const [tituloBaixa, setTituloBaixa] = useState(null);
  const [baixaFormData, setBaixaFormData] = useState({
    valor_pago: '',
    data_pagamento: new Date().toISOString().slice(0, 10),
    forma_pagamento: 'PIX',
    comprovante_ref: '',
    observacoes: ''
  });
  const [savingBaixa, setSavingBaixa] = useState(false);
  const [copiedPixId, setCopiedPixId] = useState(null);

  const [whatsAppModalFinanceiro, setWhatsAppModalFinanceiro] = useState(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [whatsappTelefone, setWhatsappTelefone] = useState('');

  // Modal de Aplicar / Editar Desconto de Frete (Abatimento por Roubo / Quebra / Avaria)
  const [modalDescontoTitulo, setModalDescontoTitulo] = useState(null);
  const [valorDescontoModal, setValorDescontoModal] = useState('');
  const [motivoDescontoModal, setMotivoDescontoModal] = useState('');
  const [salvandoDesconto, setSalvandoDesconto] = useState(false);

  const handleOpenModalDesconto = (titulo) => {
    setModalDescontoTitulo(titulo);
    setValorDescontoModal(titulo.valor_desconto > 0 ? String(titulo.valor_desconto) : '');
    setMotivoDescontoModal(titulo.motivo_desconto || '');
  };

  const handleSalvarDesconto = async (e) => {
    if (e) e.preventDefault();
    if (!modalDescontoTitulo) return;
    setSalvandoDesconto(true);
    try {
      await api.put(`/financeiro/titulos/${modalDescontoTitulo.id}/desconto`, {
        valor_desconto: parseFloat(valorDescontoModal || 0),
        motivo_desconto: motivoDescontoModal
      });
      setModalDescontoTitulo(null);
      await fetchTitulos();
      await fetchKpis();
    } catch (err) {
      alert('Erro ao registrar desconto: ' + (err.response?.data?.error || err.message));
    } finally {
      setSalvandoDesconto(false);
    }
  };

  // Controle de expansão de histórico de baixas parciais
  const [expandedTituloIds, setExpandedTituloIds] = useState(new Set());

  const toggleExpandTitulo = (id) => {
    setExpandedTituloIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEstornarBaixa = async (baixaId) => {
    if (!window.confirm('Tem certeza que deseja estornar este pagamento? O saldo pendente será recalculado automaticamente.')) {
      return;
    }
    try {
      await api.delete(`/financeiro/baixas/${baixaId}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao estornar baixa.');
    }
  };

  // Refs de controle — declarados após os estados que referenciam
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  // filtrosRef: sempre mantém os valores MAIS RECENTES dos filtros
  // Atualizado a cada render via o effect sem dependências abaixo
  const filtrosRef = useRef({ filtroOrigem: 'todos', filtroCategoria: '', filtroStatus: 'todos', search: '' });

  // Sincroniza o ref a cada render (sem dependências — roda após qualquer render)
  // Isso garante que fetchTitulos (que é useCallback vazio) sempre acessa o valor atual
  filtrosRef.current = { filtroOrigem, filtroCategoria, filtroStatus, search };


  // ─── fetchTitulos: cancela requisição anterior e inicia nova ───────────────
  const fetchTitulos = useCallback(async () => {
    // Cancelar requisição anterior se ainda estiver em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Ler filtros do ref para evitar stale closure
    const { filtroOrigem: origem, filtroCategoria: categoria, filtroStatus: status, search: busca } = filtrosRef.current;

    setLoading(true);
    setLoadError(null);
    try {
      const params = { tipo: 'todos', origem, categoria, status, search: busca };
      const res = await api.get('/financeiro/titulos', {
        params,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setTitulos(res.data || []);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Erro ao carregar títulos:', err);
        setLoadError('Falha ao carregar dados. Verifique a conexão e tente novamente.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // ─── fetchKpis: separado, não cancela com troca de aba ────────────────────
  const fetchKpis = useCallback(async () => {
    try {
      const res = await api.get('/financeiro/kpis');
      setKpis(res.data || null);
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
    }
  }, []);

  // ─── Plano de Contas: carrega apenas 1x na montagem ───────────────────────
  useEffect(() => {
    api.get('/financeiro/plano-contas')
      .then(res => { if (res.data) setPlanoContas(res.data); })
      .catch(() => {});
    fetchKpis();
  }, [fetchKpis]);

  // ─── Effect principal: filtros de aba/origem/status (sem debounce) ─────────
  useEffect(() => {
    clearTimeout(debounceTimerRef.current);
    fetchTitulos();
    fetchKpis();
  }, [filtroOrigem, filtroCategoria, filtroStatus, fetchTitulos, fetchKpis]);

  // ─── Effect de busca: com debounce de 400ms ───────────────────────────────
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    // Não disparar no mount inicial (o effect principal já cobre)
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchTitulos();
    }, 400);
    return () => clearTimeout(debounceTimerRef.current);
  }, [search, fetchTitulos]);

  // ─── loadData para uso após mutações (salvar, baixar, excluir) ────────────
  const loadData = useCallback(() => {
    fetchTitulos();
    fetchKpis();
  }, [fetchTitulos, fetchKpis]);


  const gerarMensagemFinanceiro = (t) => {
    if (!t) return '';
    const isReceber = t.tipo === 'receber';
    const valorFmt = formatMoney(t.valor);
    const vencFmt = t.data_vencimento ? new Date(t.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'A Combinar';
    const pixChave = activeEmpresa?.chave_pix || 'CNPJ / Chave Cadastrada';

    if (isReceber) {
      return `📄 *INFORMATIVO DE FATURAMENTO & COBRANÇA - FRETE*
---------------------------------------
🏢 *Pagador / Tomador:* ${t.pessoa_nome || 'Cliente'}
📋 *Documento:* ${t.descricao}
💵 *Valor a Receber:* ${valorFmt}
📅 *Vencimento:* ${vencFmt}

🔑 *DADOS PARA PAGAMENTO VIA PIX:*
• *Chave PIX:* ${pixChave}
• *Favorecido:* ${activeEmpresa?.razao_social || activeEmpresa?.nome_fantasia || 'SisFrete Pro'}

_Favor enviar o comprovante de pagamento após a transferência._
---------------------------------------
*${activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'SisFrete Logística'}*`;
    }

    return `💵 *INFORMATIVO DE ACERTO / PAGAMENTO DE FRETE*
---------------------------------------
👤 *Favorecido:* ${t.pessoa_nome || 'Motorista / Terceiro'}
📋 *Referência:* ${t.descricao}
💰 *Valor do Acerto:* ${valorFmt}
📅 *Data:* ${vencFmt}
---------------------------------------
*${activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'SisFrete Logística'}*`;
  };

  const handleCopiarWhatsAppFinanceiro = () => {
    if (!whatsAppModalFinanceiro) return;
    const msg = gerarMensagemFinanceiro(whatsAppModalFinanceiro);
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleEnviarWhatsAppFinanceiro = () => {
    if (!whatsAppModalFinanceiro) return;
    const msg = encodeURIComponent(gerarMensagemFinanceiro(whatsAppModalFinanceiro));
    const phoneClean = whatsappTelefone.replace(/\D/g, '');
    const url = phoneClean 
      ? `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`;
    window.open(url, '_blank');
  };

  const handleCopyPix = (pix, id) => {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  const handleOpenNovo = (tipo = 'pagar') => {
    setNovoFormData({
      tipo: tipo,
      categoria: tipo === 'pagar' ? 'energia' : 'faturamento_frete',
      categoria_nome: '',
      descricao: '',
      pessoa_nome: '',
      pessoa_documento: '',
      valor: '',
      data_vencimento: new Date().toISOString().slice(0, 10),
      data_emissao: new Date().toISOString().slice(0, 10),
      forma_pagamento: 'Boleto',
      observacoes: ''
    });
    setNovoError('');
    setIsNovoModalOpen(true);
  };

  const handleSaveNovo = async (e) => {
    e.preventDefault();
    setNovoError('');
    setSavingNovo(true);

    try {
      await api.post('/financeiro/titulos', novoFormData);
      setIsNovoModalOpen(false);
      loadData();
    } catch (err) {
      setNovoError(err.response?.data?.error || 'Erro ao cadastrar título financeiro.');
    } finally {
      setSavingNovo(false);
    }
  };

  const handleOpenBaixa = (t) => {
    const valorTotal = Number(t.valor || 0);
    const jaPago = Number(t.valor_pago || 0);
    const saldoRestante = Math.max(0, Number((valorTotal - jaPago).toFixed(2)));

    setTituloBaixa(t);
    setBaixaFormData({
      valor_baixa: saldoRestante > 0 ? saldoRestante : valorTotal,
      data_pagamento: new Date().toISOString().slice(0, 10),
      forma_pagamento: t.forma_pagamento || 'PIX',
      comprovante_ref: '',
      observacoes: ''
    });
  };

  const handleConfirmarBaixa = async (e) => {
    e.preventDefault();
    if (!tituloBaixa) return;
    setSavingBaixa(true);

    try {
      await api.post(`/financeiro/titulos/${tituloBaixa.id}/baixar`, {
        valor_baixa: Number(baixaFormData.valor_baixa),
        data_pagamento: baixaFormData.data_pagamento,
        forma_pagamento: baixaFormData.forma_pagamento,
        comprovante_ref: baixaFormData.comprovante_ref,
        observacoes: baixaFormData.observacoes
      });
      setTituloBaixa(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar baixa.');
    } finally {
      setSavingBaixa(false);
    }
  };

  const handleOpenReciboFromTitulo = async (t) => {
    if (!t.frete_id && !t.id) return;
    const targetId = t.frete_id || t.id;
    try {
      const res = await api.get(`/fretes/${targetId}`);
      if (onOpenRecibo) {
        onOpenRecibo({
          ...res.data,
          ...t,
          id: targetId,
          frete_id: targetId,
          tipo: t.tipo || activeSubTab,
          origem_aba: activeSubTab,
          tipo_recibo: activeSubTab === 'receber' ? 'receber' : 'pagar',
          valor_recibo: t.valor,
        });
      }
    } catch (err) {
      if (onOpenRecibo) {
        onOpenRecibo({
          id: targetId,
          frete_id: targetId,
          ...t,
          tipo: t.tipo || activeSubTab,
          origem_aba: activeSubTab,
          tipo_recibo: activeSubTab === 'receber' ? 'receber' : 'pagar',
          valor_recibo: t.valor,
        });
      }
    }
  };

  const handleConfirmExcluir = async () => {
    if (!tituloParaExcluir) return;
    setIsExcluindo(true);
    try {
      if (tituloParaExcluir.is_frete || tituloParaExcluir.frete_id) {
        await api.delete(`/fretes/${tituloParaExcluir.frete_id}`);
      } else {
        await api.delete(`/financeiro/titulos/${tituloParaExcluir.id}`);
      }
      setTituloParaExcluir(null);
      fetchTitulos();
      fetchKpis();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir lançamento.');
    } finally {
      setIsExcluindo(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getCategoriaBadge = (cat, nome) => {
    const icons = {
      energia: Zap,
      agua: Droplet,
      internet_telefonia: Wifi,
      aluguel: Building2,
      combustivel: Fuel,
      manutencao_oficina: Wrench,
      seguro_rastreador: ShieldCheck,
      contador_honorarios: FileSpreadsheet,
      salarios_prolabore: Users,
      impostos_taxas: Landmark,
      frete_motorista: Truck,
      frete_complemento: Layers,
      repasse_agenciamento: Repeat,
      repasse_embarcador: Repeat,
      comissao_agenciamento: DollarSign,
      faturamento_frete: Truck
    };
    const IconComponent = icons[cat] || Layers;

    const labels = {
      frete_motorista: 'Frete Terceiro',
      frete_complemento: 'Frete Por Fora',
      comissao_agenciamento: 'Comissão',
      repasse_embarcador: 'Repasse',
      repasse_agenciamento: 'Repasse',
      faturamento_frete: 'Recebimento CT-e'
    };
    const labelTexto = labels[cat] || nome || cat;

    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <IconComponent className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span className="truncate max-w-[140px]" title={labelTexto}>{labelTexto}</span>
      </span>
    );
  };

  // ─── Agrupamento estruturado por Frete / CT-e (ou avulsos) ───────────────
  const titulosFiltrados = titulos.filter(t => t.tipo === activeSubTab);

  const gruposTitulos = [];
  const fretesMap = new Map();

  for (const t of titulosFiltrados) {
    if (t.is_frete && t.frete_id) {
      if (!fretesMap.has(t.frete_id)) {
        const novoGrupo = {
          key: `frete_${t.frete_id}`,
          is_frete: true,
          frete_id: t.frete_id,
          numero_cte: t.numero_cte,
          numero_cte_2: t.numero_cte_2,
          is_triangular: t.is_triangular,
          motorista_nome: t.motorista_nome || t.pessoa_nome,
          cliente_nome: t.cliente_nome,
          cliente_nome_2: t.cliente_nome_2,
          placa_veiculo: t.placa_veiculo,
          titulos: []
        };
        fretesMap.set(t.frete_id, novoGrupo);
        gruposTitulos.push(novoGrupo);
      }
      fretesMap.get(t.frete_id).titulos.push(t);
    } else {
      gruposTitulos.push({
        key: `avulso_${t.id}`,
        is_frete: false,
        titulos: [t]
      });
    }
  }

  const accentBorderColor = activeSubTab === 'receber' ? 'border-l-emerald-500' : 'border-l-blue-500';

  const renderTituloRow = (t, isInsideFreteGroup, isLastInGroup, isMultiplasParcelas) => {
    const valorTotal = Number(t.valor || 0);
    const valorPago = Number(t.valor_pago || 0);
    const valorDesconto = Number(t.valor_desconto || 0);
    const motivoDesconto = t.motivo_desconto || '';
    const saldoPendente = Math.max(0, Number((valorTotal - valorPago - valorDesconto).toFixed(2)));

    const isQuitado = (t.status === 'pago' || t.status === 'recebido') || (saldoPendente <= 0.01 && valorTotal > 0);
    const isParcial = !isQuitado && valorPago > 0;
    const isPendente = !isQuitado && !isParcial;
    const isVencido = !isQuitado && t.data_vencimento && t.data_vencimento < new Date().toISOString().slice(0, 10);

    const isPorFora = t.tipo_parcela === 'complemento' || t.categoria === 'frete_complemento' || t.descricao?.toLowerCase().includes('por fora');
    const isFiscal = t.tipo_parcela === 'fiscal' || (t.categoria === 'frete_motorista' && isMultiplasParcelas);
    const isComissao = t.tipo_parcela === 'comissao' || t.categoria === 'comissao_agenciamento';
    const isRepasse = t.tipo_parcela === 'repasse' || t.categoria === 'repasse_embarcador';

    return (
      <React.Fragment key={t.id}>
        <tr className={`hover:bg-slate-800/30 transition border-l-2 ${
          isInsideFreteGroup ? 'border-l-slate-700' : 'border-l-transparent'
        } ${
          isLastInGroup 
            ? (isInsideFreteGroup ? 'border-b-2 border-slate-950 shadow-sm' : 'border-b border-slate-800') 
            : 'border-b border-slate-800/50'
        }`}>
        
          {/* Descrição & Origem */}
          <td className="px-3.5 py-2.5">
            {isPorFora ? (
              <div className="flex items-start gap-2 pl-3 py-0.5">
                <span className="text-slate-500 font-bold text-xs select-none mt-0.5">↳</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium inline-flex items-center gap-1">
                      <Layers className="h-3 w-3 text-slate-400" />
                      Por Fora
                    </span>
                    <p className="font-semibold text-slate-200 text-xs truncate max-w-[220px]" title={t.descricao}>
                      {t.descricao}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Diferença acordada s/ CT-e Fiscal
                  </span>
                </div>
              </div>
            ) : isFiscal ? (
              <div className="flex items-start gap-2 py-0.5">
                <span className="text-slate-500 font-bold text-xs select-none mt-0.5">1.</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium inline-flex items-center gap-1">
                      <Truck className="h-3 w-3 text-slate-400" />
                      CT-e Fiscal
                    </span>
                    <p className="font-semibold text-slate-200 text-xs truncate max-w-[220px]" title={t.descricao}>
                      {t.descricao}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Valor oficial acobertado pelo CT-e
                  </span>
                </div>
              </div>
            ) : isComissao ? (
              <div className="flex items-start gap-2 pl-3 py-0.5">
                <span className="text-slate-500 font-bold text-xs select-none mt-0.5">↳</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium inline-flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-slate-400" />
                      Comissão
                    </span>
                    <p className="font-semibold text-slate-200 text-xs truncate max-w-[220px]" title={t.descricao}>
                      {t.descricao}
                    </p>
                  </div>
                </div>
              </div>
            ) : isRepasse ? (
              <div className="flex items-start gap-2 pl-3 py-0.5">
                <span className="text-slate-500 font-bold text-xs select-none mt-0.5">↳</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium inline-flex items-center gap-1">
                      <Repeat className="h-3 w-3 text-slate-400" />
                      Repasse
                    </span>
                    <p className="font-semibold text-slate-200 text-xs truncate max-w-[220px]" title={t.descricao}>
                      {t.descricao}
                    </p>
                  </div>
                </div>
              </div>
            ) : t.is_triangular ? (
              <div className="space-y-1">
                <div className="p-1.5 rounded bg-slate-800/60 border border-slate-700 text-[10px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-300 font-mono">1: Nº {t.numero_cte || 'S/N'}</span>
                    <span className="text-[9px] text-slate-300 font-mono">{formatMoney(t.valor_cte_1 || t.valor)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-700/60">
                    <span className="font-semibold text-slate-300 font-mono">2: Nº {t.numero_cte_2 || 'S/N'}</span>
                    <span className="text-[9px] text-slate-300 font-mono">{formatMoney(t.valor_cte_2)}</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-medium inline-block">
                  Triangular (2 CT-es)
                </span>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-200 text-xs truncate max-w-[220px]" title={t.descricao}>{t.descricao}</p>
                <span className="text-[10px] text-slate-500">
                  {t.is_frete ? 'Vinculado a Frete' : 'Operacional / Fixo'}
                </span>
              </div>
            )}
          </td>

          {/* Categoria */}
          <td className="px-3 py-2.5 whitespace-nowrap">
            {getCategoriaBadge(t.categoria, t.categoria_nome)}
          </td>

          {/* Pessoa / Fornecedor / Tomador */}
          <td className="px-3 py-2.5">
            {t.tipo === 'receber' && t.is_triangular ? (
              <div className="space-y-0.5 text-[11px]">
                <p className="font-medium text-slate-300 truncate max-w-[150px] lg:max-w-[200px]" title={t.cliente_nome}>1. {t.cliente_nome}</p>
                <p className="font-medium text-slate-300 truncate max-w-[150px] lg:max-w-[200px]" title={t.cliente_nome_2 || t.cliente_nome}>2. {t.cliente_nome_2 || t.cliente_nome}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-200 truncate max-w-[160px] lg:max-w-[220px]" title={t.pessoa_nome}>{t.pessoa_nome || '-'}</p>
                {t.forma_pagamento && (
                  <p className="text-[10px] text-slate-500 font-mono">{t.forma_pagamento}</p>
                )}
              </div>
            )}
          </td>

          {/* Vencimento */}
          <td className="px-3 py-2.5 whitespace-nowrap">
            <p className="font-mono text-xs text-slate-300">
              {t.data_vencimento ? new Date(t.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
            </p>
            {isVencido && (
              <span className="text-[9.5px] text-slate-500 font-medium block">
                Vencido
              </span>
            )}
          </td>

          {/* Valor Bruto do Título */}
          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
            <span className="font-medium text-xs text-slate-200">
              {formatMoney(valorTotal)}
            </span>
            {t.is_triangular && (t.valor_cte_1 > 0 || t.valor_cte_2 > 0) && (
              <span className="text-[8.5px] text-slate-500 block font-normal">
                (CT-es: {formatMoney(t.valor_cte_1)} | {formatMoney(t.valor_cte_2)})
              </span>
            )}
          </td>

          {/* Desconto / Abatimento de Frete */}
          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
            {valorDesconto > 0 ? (
              <div 
                className="cursor-pointer group text-right" 
                onClick={() => handleOpenModalDesconto(t)} 
                title={`Clique para editar desconto. Motivo: ${motivoDesconto || 'Não especificado'}`}
              >
                <span className="font-bold text-xs text-rose-400 group-hover:underline block">
                  -{formatMoney(valorDesconto)}
                </span>
                {motivoDesconto && (
                  <span className="text-[8.5px] text-slate-400 truncate max-w-[110px] block ml-auto" title={motivoDesconto}>
                    {motivoDesconto}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenModalDesconto(t)}
                className="text-slate-600 hover:text-slate-300 text-xs px-2 py-0.5 rounded transition cursor-pointer hover:bg-slate-800"
                title="Aplicar desconto / abatimento (Roubo, avaria, quebra)"
              >
                -
              </button>
            )}
          </td>

          {/* Pago e Saldo Restante - DESTAQUE IMPORTANTE */}
          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
            {valorPago > 0 && !isQuitado && (
              <span className="text-[9.5px] text-slate-400 block font-normal">Pago: {formatMoney(valorPago)}</span>
            )}
            <span className={`font-bold text-xs ${
              saldoPendente <= 0.01 
                ? 'text-slate-500 font-normal' 
                : 'text-amber-300'
            }`}>
              {saldoPendente <= 0.01 ? 'R$ 0,00' : formatMoney(saldoPendente)}
            </span>
          </td>

          {/* Status Geral Discreto */}
          <td className="px-3 py-2.5 text-center whitespace-nowrap">
            {isQuitado ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/20 font-medium inline-flex items-center justify-center gap-1 mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>{t.tipo === 'receber' ? 'Recebido' : 'Quitado'}</span>
              </span>
            ) : isParcial ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-blue-400 border border-blue-500/20 font-medium inline-flex items-center justify-center gap-1 mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>Parcial</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium inline-flex items-center justify-center gap-1 mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>Pendente</span>
              </span>
            )}
          </td>

          {/* Ações Rápidas em Estilo Neutro e Homogêneo */}
          <td className="px-3 py-2.5 text-center whitespace-nowrap">
            <div className="flex items-center justify-center gap-1 flex-nowrap">
              
              {/* 1. Quitar / Pagar Saldo (Cifrão) */}
              {!isQuitado ? (
                <button
                  type="button"
                  onClick={() => handleOpenBaixa(t)}
                  className="p-1.5 rounded-lg bg-slate-800/90 text-slate-300 hover:text-emerald-300 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer shadow-sm"
                  title={isParcial ? `Pagar Saldo Restante: ${formatMoney(saldoPendente)}` : (t.tipo === 'receber' ? `Receber Valor: ${formatMoney(saldoPendente)}` : `Quitar Título: ${formatMoney(saldoPendente)}`)}
                >
                  <DollarSign className="h-3.5 w-3.5 stroke-[2]" />
                </button>
              ) : (
                <span 
                  className="p-1.5 rounded-lg bg-slate-800/40 text-slate-600 border border-slate-800 inline-flex items-center justify-center cursor-default"
                  title="Título 100% Quitado"
                >
                  <Check className="h-3.5 w-3.5 stroke-[2]" />
                </span>
              )}

              {/* 2. Ver Extrato de Baixas (Olho) */}
              <button
                type="button"
                onClick={() => toggleExpandTitulo(t.id)}
                className={`p-1.5 rounded-lg border transition cursor-pointer shadow-sm ${
                  expandedTituloIds.has(t.id)
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-750 border-slate-700 hover:border-slate-600'
                }`}
                title={t.quantidade_baixas > 0 ? `Ver Extrato de Baixas (${t.quantidade_baixas} baixa(s))` : 'Ver Extrato de Baixas'}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>

              {/* 3. Imprimir Recibo Oficial (Impressora) */}
              {t.frete_id && onOpenRecibo && (
                <button
                  type="button"
                  onClick={() => handleOpenReciboFromTitulo(t)}
                  className="p-1.5 rounded-lg bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition cursor-pointer shadow-sm"
                  title="Imprimir Recibo Oficial"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              )}

              {/* 4. Desconto / Abatimento de Carga (Tesoura) */}
              <button
                type="button"
                onClick={() => handleOpenModalDesconto(t)}
                className={`p-1.5 rounded-lg border transition cursor-pointer shadow-sm ${
                  valorDesconto > 0
                    ? 'bg-slate-800/90 text-rose-400 border-rose-500/40 hover:bg-rose-950/40'
                    : 'bg-slate-800/90 text-slate-400 hover:text-rose-400 hover:bg-slate-750 border-slate-700 hover:border-slate-600'
                }`}
                title={valorDesconto > 0 ? `Desconto Aplicado: -${formatMoney(valorDesconto)} (${motivoDesconto || 'Editar'})` : 'Aplicar Desconto de Carga (Roubo / Avaria)'}
              >
                <Scissors className="h-3.5 w-3.5" />
              </button>

              {/* 5. WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  setWhatsAppModalFinanceiro(t);
                  setCopiedWhatsApp(false);
                  setWhatsappTelefone('');
                }}
                className="p-1.5 rounded-lg bg-slate-800/90 text-slate-400 hover:text-emerald-400 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition cursor-pointer shadow-sm"
                title={t.tipo === 'receber' ? 'Enviar cobrança no WhatsApp' : 'Enviar comprovante / extrato no WhatsApp'}
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>

              {/* 6. Excluir */}
              <button
                type="button"
                onClick={() => setTituloParaExcluir(t)}
                className="p-1.5 rounded-lg bg-slate-800/90 text-slate-400 hover:text-rose-400 hover:bg-slate-750 border border-slate-700 hover:border-rose-500/40 transition cursor-pointer shadow-sm"
                title="Excluir Lançamento Financeiro"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>

        </tr>

        {/* SUB-LINHA EXPANSÍVEL: HISTÓRICO COMPLETO DE BAIXAS PARCIAIS */}
        {expandedTituloIds.has(t.id) && (
          <tr key={`extrato_${t.id}`} className="bg-slate-950/90 border-b border-slate-800">
            <td colSpan={9} className="px-4 py-4 sm:px-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-4 space-y-3.5 shadow-2xl">
                {/* Header do Accordion */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Histórico de Baixas & Pagamentos
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-mono font-bold">
                        {t.historico_baixas?.length || 0} lançamento(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Título: <strong className="text-slate-200">{t.descricao}</strong> | Favorecido: <strong className="text-slate-200">{t.pessoa_nome || '-'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isQuitado && (
                      <button
                        onClick={() => handleOpenBaixa(t)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Lançar Nova Baixa ({formatMoney(saldoPendente)})</span>
                      </button>
                    )}
                    {t.frete_id && onOpenRecibo && (
                      <button
                        onClick={() => handleOpenReciboFromTitulo(t)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs transition cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Imprimir Recibo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso Visual de Quitação */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-400">
                      Total do Título: <strong className="text-white">{formatMoney(valorTotal)}</strong>
                    </span>
                    <span className="text-emerald-400">
                      Total Pago: <strong className="font-bold">{formatMoney(valorPago)}</strong> ({t.percentual_pago || 0}%)
                    </span>
                    <span className={saldoPendente > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {saldoPendente > 0 ? `Saldo Pendente: ${formatMoney(saldoPendente)}` : '✅ 100% Liquidado'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isQuitado ? 'bg-emerald-500' : isParcial ? 'bg-indigo-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, t.percentual_pago || 0))}%` }}
                    />
                  </div>
                </div>

                {/* Tabela de Baixas */}
                {t.historico_baixas && t.historico_baixas.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-800/60 uppercase text-[9.5px] font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Data</th>
                          <th className="py-2 px-3">Tipo / Parcela</th>
                          <th className="py-2 px-3">Forma</th>
                          <th className="py-2 px-3">Comprovante / Autenticação</th>
                          <th className="py-2 px-3">Observações</th>
                          <th className="py-2 px-3 text-right">Valor Pago</th>
                          <th className="py-2 px-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-mono">
                        {t.historico_baixas.map((bx, idx) => (
                          <tr key={bx.id || idx} className="hover:bg-slate-800/30 transition">
                            <td className="py-2 px-3 text-slate-200">
                              {bx.data_pagamento ? new Date(bx.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-blue-300 border border-slate-700 font-sans font-semibold">
                                {bx.tipo_parcela === 'por_fora' ? '💼 Frete Por Fora' : bx.tipo_parcela === 'fiscal' ? '📄 Parcela CT-e' : bx.tipo_parcela === 'repasse' ? '🔄 Repasse' : bx.tipo_parcela === 'comissao' ? '📈 Comissão' : '💵 Baixa Parcial'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-sans">
                              {bx.forma_pagamento || 'PIX'}
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-sans">
                              {bx.comprovante_ref ? (
                                <span className="text-slate-300 font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                  {bx.comprovante_ref}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-sans max-w-[150px] truncate" title={bx.observacoes}>
                              {bx.observacoes || '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400 text-xs">
                              {formatMoney(bx.valor)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {typeof bx.id === 'number' && (
                                <button
                                  onClick={() => handleEstornarBaixa(bx.id)}
                                  className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                  title="Estornar este pagamento e estornar saldo"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-xs italic bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    Nenhuma baixa parcial registrada até o momento para este lançamento.
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-[1700px] mx-auto">
      
      {/* Header Financeiro com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">Gestão Financeira Integrada</h1>
          <p className="text-xs text-slate-400">
            Controle de Fretes, Repasses e Contas Operacionais (Energia, Água, Internet, Aluguel, Combustível e Impostos)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenNovo('pagar')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-semibold text-xs transition cursor-pointer"
          >
            <ArrowDownRight className="h-4 w-4 text-rose-400" />
            <span>+ Nova Conta a Pagar</span>
          </button>

          <button
            onClick={() => handleOpenNovo('receber')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs transition cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            <span>+ Nova Conta a Receber</span>
          </button>
        </div>
      </div>

      {/* Banner de Erro de Carregamento */}
      {loadError && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span className="flex-1">{loadError}</span>
          <button
            onClick={() => fetchTitulos()}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold transition cursor-pointer whitespace-nowrap"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Cards de Resumo Financeiro & KPIs Contextuais por Modalidade */}
      {(() => {
        const modoOperacao = activeEmpresa?.modo_operacao || kpis?.resumo?.modo_operacao || 'padrao';
        const isGestao = modoOperacao === 'gestao_pagamentos';
        const isRepasse = modoOperacao === 'agenciamento_repasse';

        if (isGestao) {
          // Modalidade: GESTÃO DE PAGAMENTOS (Ex: Farimax)
          // Foco: Cargas/Viagens Gerenciadas, Freteiros a Pagar, Total Efetivamente Quitado e Repasses a Terceiros
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Cargas Gerenciadas */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-indigo-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4" />
                    <span>Cargas Gerenciadas</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-bold">
                    Gestão & Rateio
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                  {kpis?.resumo?.totalFretes || 0} Viagens
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Peso Movimentado:</span>
                  <strong className="text-indigo-300 font-mono">{kpis?.resumo?.total_peso_toneladas || '0.00'} ton</strong>
                </p>
              </div>

              {/* 2. Freteiros a Pagar (Saldo Aberto) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-amber-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownRight className="h-4 w-4" />
                    <span>A Pagar aos Freteiros</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                    Saldo Aberto
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatMoney(kpis?.resumo?.totalAPagar || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Frete Contratado:</span>
                  <strong className="text-amber-400 font-mono">{formatMoney(kpis?.resumo?.totalCompraFretes || 0)}</strong>
                </p>
              </div>

              {/* 3. Total Quitado */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Total Já Quitado</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                    Liquidado
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  {formatMoney(kpis?.resumo?.totalPago || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Status Geral:</span>
                  <strong className="text-emerald-300 font-mono">Baixas Parciais + Totais</strong>
                </p>
              </div>

              {/* 4. Repasses & Terceiros */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Repeat className="h-4 w-4" />
                    <span>Repasses & Encargos</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold">
                    Terceiros
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
                  {formatMoney(kpis?.resumo?.total_repasses_geral || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Comissão / Repasse:</span>
                  <strong className="text-white font-mono">{formatMoney(kpis?.resumo?.totalComissaoFretes || 0)}</strong>
                </p>
              </div>
            </div>
          );
        }

        if (isRepasse) {
          // Modalidade: AGENCIAMENTO & REPASSE (Ex: Colorado)
          // Foco: Volume Agenciado, Comissão da Agência, Repasses Pendentes e Concluídos
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Volume Bruto Agenciado */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-blue-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    <span>Volume Agenciado</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold">
                    {kpis?.resumo?.totalFretes || 0} CT-es
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatMoney(kpis?.resumo?.totalVendaFretes || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Volume Total:</span>
                  <strong className="text-blue-300 font-mono">{kpis?.resumo?.total_peso_toneladas || '0.00'} ton</strong>
                </p>
              </div>

              {/* 2. Comissão Retida da Agência */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    <span>Comissão da Agência</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold">
                    Receita Líquida
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
                  {formatMoney(kpis?.resumo?.totalComissaoFretes || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Margem Retida:</span>
                  <strong className="text-white font-mono">5.0% Médio</strong>
                </p>
              </div>

              {/* 3. Repasses a Fazer */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownRight className="h-4 w-4" />
                    <span>Repasses Pendentes</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-bold">
                    A Pagar
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatMoney(kpis?.resumo?.totalAPagar || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Destino:</span>
                  <strong className="text-rose-400 font-mono">Embarcadores & Freteiros</strong>
                </p>
              </div>

              {/* 4. Repasses Concluídos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Repasses Efetuados</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                    Quitado
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  {formatMoney(kpis?.resumo?.totalPago || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Total Liquidado:</span>
                  <strong className="text-emerald-300 font-mono">{formatMoney(kpis?.resumo?.totalPago || 0)}</strong>
                </p>
              </div>
            </div>
          );
        }

        // Modalidade: PADRÃO / SUBCONTRATAÇÃO / TRANSPORTADORA (Ex: Gilmar / Boblog)
        // Foco: Faturamento (CT-e), Custos de Frete, LUCRO OPERACIONAL e Caixa Realizado
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total a Receber */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Faturamento de Fretes</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                  CT-es
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                {formatMoney(kpis?.resumo?.totalAReceber || 0)}
              </h3>
              <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                <span>Já Recebido:</span>
                <strong className="text-emerald-400 font-mono">{formatMoney(kpis?.resumo?.totalRecebido || 0)}</strong>
              </p>
            </div>

            {/* 2. Total a Pagar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-rose-500/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownRight className="h-4 w-4" />
                  <span>Custos de Transporte</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-bold">
                  Freteiros + Despesas
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                {formatMoney(kpis?.resumo?.totalAPagar || 0)}
              </h3>
              <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                <span>Já Quitado:</span>
                <strong className="text-rose-400 font-mono">{formatMoney(kpis?.resumo?.totalPago || 0)}</strong>
              </p>
            </div>

            {/* 3. Lucro Operacional (Subcontratação) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Lucro Operacional</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                  Margem {kpis?.resumo?.margem_lucro_percentual || 0}%
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {formatMoney(kpis?.resumo?.lucro_operacional || 0)}
              </h3>
              <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                <span>Viagens Operadas:</span>
                <strong className="text-white font-mono">{kpis?.resumo?.totalFretes || 0} Viagens ({kpis?.resumo?.total_peso_toneladas || '0.00'}t)</strong>
              </p>
            </div>

            {/* 4. Saldo em Caixa Realizado */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-blue-500/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  <span>Saldo em Caixa</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold">
                  Realizado
                </span>
              </div>
              <h3 className={`text-xl sm:text-2xl font-black font-mono ${
                (kpis?.resumo?.saldoRealizado || 0) >= 0 ? 'text-blue-400' : 'text-rose-400'
              }`}>
                {formatMoney(kpis?.resumo?.saldoRealizado || 0)}
              </h3>
              <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                <span>Projetado a Receber:</span>
                <strong className="text-white font-mono">{formatMoney(kpis?.resumo?.saldoProjetado || 0)}</strong>
              </p>
            </div>
          </div>
        );
      })()}

      {/* Navegação de Sub-Abas do Módulo Financeiro */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('pagar')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'pagar'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownRight className="h-4 w-4" />
          <span>Contas a Pagar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-mono">
            {/* Bug 3 Fix: contar respeitando filtroOrigem */}
            {titulos.filter(t => {
              if (t.tipo !== 'pagar') return false;
              if (filtroOrigem === 'todos') return true;
              if (filtroOrigem === 'frete_cte') return t.origem === 'frete_cte' || t.is_frete;
              if (filtroOrigem === 'operacional_fixo') return !t.is_frete && t.origem !== 'frete_cte';
              return true;
            }).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('receber')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'receber'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Contas a Receber</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
            {/* Bug 3 Fix: contar respeitando filtroOrigem */}
            {titulos.filter(t => {
              if (t.tipo !== 'receber') return false;
              if (filtroOrigem === 'todos') return true;
              if (filtroOrigem === 'frete_cte') return t.origem === 'frete_cte' || t.is_frete;
              if (filtroOrigem === 'operacional_fixo') return !t.is_frete && t.origem !== 'frete_cte';
              return true;
            }).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('demonstrativo')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'demonstrativo'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Plano de Contas & Categorias</span>
        </button>
      </div>

      {/* Barra de Filtros Rápidos */}
      {activeSubTab !== 'demonstrativo' && (
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            
            {/* Filtro de Origem */}
            <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setFiltroOrigem('todos')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  filtroOrigem === 'todos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroOrigem('frete_cte')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  filtroOrigem === 'frete_cte' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🚚 Fretes & CT-e
              </button>
              <button
                onClick={() => setFiltroOrigem('operacional_fixo')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  filtroOrigem === 'operacional_fixo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏢 Operacionais & Fixas
              </button>
            </div>

            {/* Filtro de Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="parcial">Parcialmente Pagos</option>
              <option value="pago">Quitados / Recebidos</option>
            </select>
          </div>

          {/* Busca por Texto */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar título, fornecedor ou tomador..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* TABELA DE TÍTULOS (CONTAS A PAGAR E A RECEBER) */}
      {activeSubTab !== 'demonstrativo' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Descrição / Título</th>
                  <th className="px-3 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5">Favorecido / Tomador</th>
                  <th className="px-3 py-2.5">Vencimento</th>
                  <th className="px-3 py-2.5 text-right font-mono">Valor Título</th>
                  <th className="px-3 py-2.5 text-right font-mono">Desconto</th>
                  <th className="px-3 py-2.5 text-right font-mono">Pago / Saldo</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Carregando títulos financeiros...</span>
                      </div>
                    </td>
                  </tr>
                ) : gruposTitulos.length > 0 ? (
                  gruposTitulos.map((grupo) => {
                    if (grupo.is_frete) {
                      const totalValorGrupo = grupo.titulos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
                      const totalPagoGrupo = grupo.titulos.reduce((acc, item) => acc + Number(item.valor_pago || 0), 0);
                      const totalDescontoGrupo = grupo.titulos.reduce((acc, item) => acc + Number(item.valor_desconto || 0), 0);
                      const saldoPendenteGrupo = Math.max(0, Number((totalValorGrupo - totalPagoGrupo - totalDescontoGrupo).toFixed(2)));
                      const isGrupoQuitado = saldoPendenteGrupo <= 0.01 && totalValorGrupo > 0;
                      const isGrupoParcial = !isGrupoQuitado && totalPagoGrupo > 0;
                      const isMultiplasParcelas = grupo.titulos.length > 1;

                      return (
                        <React.Fragment key={grupo.key}>
                          {/* CABEÇALHO DO BLOCO DA OPERAÇÃO / CT-e */}
                          <tr className="bg-slate-850 border-t border-slate-700/80 border-b border-slate-800/80">
                            <td colSpan={9} className="px-3.5 py-2.5 text-xs">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px] font-semibold flex items-center gap-1.5">
                                    <Truck className="h-3 w-3 text-slate-400" />
                                    CT-e Nº {grupo.numero_cte || 'S/N'}
                                  </span>
                                  {grupo.is_triangular && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-medium">
                                      Triangular (+ Nº {grupo.numero_cte_2 || 'S/N'})
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-100 text-xs">
                                    {grupo.motorista_nome}
                                  </span>
                                  {grupo.placa_veiculo && (
                                    <span className="text-[10.5px] text-slate-400 font-mono">
                                      • Placa: <strong className="text-slate-300 font-normal">{grupo.placa_veiculo}</strong>
                                    </span>
                                  )}
                                  {grupo.cliente_nome && (
                                    <span className="text-[10.5px] text-slate-400 truncate max-w-[200px]" title={grupo.cliente_nome}>
                                      • Tomador: {grupo.cliente_nome}
                                    </span>
                                  )}
                                  {isMultiplasParcelas && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-750 font-normal">
                                      {grupo.titulos.length} parcelas vinculadas
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-slate-400 text-[10.5px]">Total:</span>
                                    <span className="font-mono font-bold text-slate-200 text-xs">
                                      {formatMoney(totalValorGrupo)}
                                    </span>
                                  </div>
                                  {totalDescontoGrupo > 0 && (
                                    <span className="text-[10px] text-rose-400 font-mono font-medium" title="Total de descontos abatidos do freteiro">
                                      (Desc: -{formatMoney(totalDescontoGrupo)})
                                    </span>
                                  )}
                                  {totalPagoGrupo > 0 && !isGrupoQuitado && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      (Pago: {formatMoney(totalPagoGrupo)})
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                                    isGrupoQuitado 
                                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20 font-medium' 
                                      : isGrupoParcial
                                        ? 'bg-slate-800 text-blue-300 border border-blue-500/20 font-semibold'
                                        : 'bg-slate-800 text-amber-300 border border-amber-500/30 font-bold'
                                  }`}>
                                    {isGrupoQuitado ? 'Liquidado' : `Saldo: ${formatMoney(saldoPendenteGrupo)}`}
                                  </span>

                                  {onOpenRecibo && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReciboFromTitulo(grupo.titulos[0])}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer text-[10.5px] font-medium"
                                      title="Imprimir Recibo Geral da Operação"
                                    >
                                      <Printer className="h-3 w-3 text-slate-400" />
                                      <span>Recibo Geral</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* LINHAS DOS TÍTULOS VINCULADOS AO FRETE */}
                          {grupo.titulos.map((t, idx) => 
                            renderTituloRow(t, true, idx === grupo.titulos.length - 1, isMultiplasParcelas)
                          )}
                        </React.Fragment>
                      );
                    } else {
                      // Título Avulso (Operacional/Fixo)
                      return (
                        <React.Fragment key={grupo.key}>
                          {renderTituloRow(grupo.titulos[0], false, true, false)}
                        </React.Fragment>
                      );
                    }
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                      Nenhum título encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: DEMONSTRATIVO & PLANO DE CONTAS DA TRANSPORTADORA */}
      {activeSubTab === 'demonstrativo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Despesas Padronizadas */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ArrowDownRight className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Plano de Contas (Despesas & Custos)</h3>
              </div>
              <button
                onClick={() => handleOpenNovo('pagar')}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold"
              >
                + Lançar Despesa
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {planoContas.despesas.map((d) => (
                <div key={d.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {getCategoriaBadge(d.id, d.nome)}
                    <span className="text-slate-400 text-[11px] font-medium">{d.grupo}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleOpenNovo('pagar');
                      setNovoFormData(prev => ({ ...prev, categoria: d.id, categoria_nome: d.nome }));
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold text-[11px]"
                  >
                    Lançar ➔
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Receitas Padronizadas */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ArrowUpRight className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Plano de Contas (Receitas & Entradas)</h3>
              </div>
              <button
                onClick={() => handleOpenNovo('receber')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold"
              >
                + Lançar Receita
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {planoContas.receitas.map((r) => (
                <div key={r.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {getCategoriaBadge(r.id, r.nome)}
                    <span className="text-slate-400 text-[11px] font-medium">{r.grupo}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleOpenNovo('receber');
                      setNovoFormData(prev => ({ ...prev, categoria: r.id, categoria_nome: r.nome }));
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px]"
                  >
                    Lançar ➔
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE NOVO LANÇAMENTO FINANCEIRO (CONTAS A PAGAR / RECEBER) */}
      {isNovoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-400" />
                <h3 className="font-heading font-bold text-base text-white">
                  Novo Título ({novoFormData.tipo === 'pagar' ? 'Conta a Pagar' : 'Conta a Receber'})
                </h3>
              </div>
              <button 
                onClick={() => setIsNovoModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {novoError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{novoError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNovo} className="space-y-4 text-xs">
              
              {/* Tipo de Título */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNovoFormData({ ...novoFormData, tipo: 'pagar', categoria: 'energia' })}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                    novoFormData.tipo === 'pagar' 
                      ? 'bg-rose-600 text-white shadow-md' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  <span>Conta a Pagar (Despesa)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNovoFormData({ ...novoFormData, tipo: 'receber', categoria: 'faturamento_frete' })}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                    novoFormData.tipo === 'receber' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Conta a Receber (Entrada)</span>
                </button>
              </div>

              {/* Categoria do Plano de Contas */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Categoria (Plano de Contas)*</label>
                <select
                  value={novoFormData.categoria}
                  onChange={(e) => {
                    const lista = novoFormData.tipo === 'receber' ? planoContas.receitas : planoContas.despesas;
                    const found = lista.find(c => c.id === e.target.value);
                    setNovoFormData({
                      ...novoFormData,
                      categoria: e.target.value,
                      categoria_nome: found ? found.nome : ''
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  {(novoFormData.tipo === 'receber' ? planoContas.receitas : planoContas.despesas).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.grupo})</option>
                  ))}
                </select>
              </div>

              {/* Descrição do Título */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição do Título*</label>
                <input
                  type="text"
                  required
                  value={novoFormData.descricao}
                  onChange={(e) => setNovoFormData({ ...novoFormData, descricao: e.target.value })}
                  placeholder="Ex: Conta de Luz Copel - Mês 08/2026, Aluguel Pátio..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Fornecedor / Favorecido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {novoFormData.tipo === 'pagar' ? 'Fornecedor / Favorecido' : 'Cliente / Pagador'}
                  </label>
                  <input
                    type="text"
                    value={novoFormData.pessoa_nome}
                    onChange={(e) => setNovoFormData({ ...novoFormData, pessoa_nome: e.target.value })}
                    placeholder="Ex: Copel, Claro, Posto Ipiranga..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CNPJ / CPF do Favorecido</label>
                  <input
                    type="text"
                    value={novoFormData.pessoa_documento}
                    onChange={(e) => setNovoFormData({ ...novoFormData, pessoa_documento: e.target.value })}
                    placeholder="Opcional"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor (R$)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={novoFormData.valor}
                    onChange={(e) => setNovoFormData({ ...novoFormData, valor: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data de Vencimento*</label>
                  <input
                    type="date"
                    required
                    value={novoFormData.data_vencimento}
                    onChange={(e) => setNovoFormData({ ...novoFormData, data_vencimento: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Forma de Pagamento</label>
                  <select
                    value={novoFormData.forma_pagamento}
                    onChange={(e) => setNovoFormData({ ...novoFormData, forma_pagamento: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="PIX">PIX</option>
                    <option value="Débito Automático">Débito Automático</option>
                    <option value="Transferência">Transferência / TED</option>
                    <option value="Cartão">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={novoFormData.observacoes}
                  onChange={(e) => setNovoFormData({ ...novoFormData, observacoes: e.target.value })}
                  placeholder="Informações adicionais, código de barras, etc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNovoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingNovo}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingNovo ? 'Salvando...' : 'Salvar Título Financeiro'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE BAIXA / QUITAÇÃO DE TÍTULO */}
      {tituloBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCheck className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  Registrar Baixa de {tituloBaixa.tipo === 'receber' ? 'Recebimento' : 'Pagamento'}
                </h3>
              </div>
              <button 
                onClick={() => setTituloBaixa(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const vTotal = Number(tituloBaixa.valor || 0);
              const vJaPago = Number(tituloBaixa.valor_pago || 0);
              const vSaldo = Math.max(0, Number((vTotal - vJaPago).toFixed(2)));
              const vBaixaAtual = Number(baixaFormData.valor_baixa || 0);
              const vRestanteApos = Math.max(0, Number((vSaldo - vBaixaAtual).toFixed(2)));
              const isQuitacaoTotal = vRestanteApos <= 0.01;

              return (
                <>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <p className="font-bold text-white text-sm">{tituloBaixa.descricao}</p>
                    <p className="text-slate-400">Favorecido: <strong className="text-slate-200">{tituloBaixa.pessoa_nome || '-'}</strong></p>
                    
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Valor Total</span>
                        <strong className="text-slate-200 font-mono">{formatMoney(vTotal)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Já Pago</span>
                        <strong className="text-emerald-400 font-mono">{formatMoney(vJaPago)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-400 uppercase block font-bold">Saldo Atual</span>
                        <strong className="text-rose-400 font-mono font-black">{formatMoney(vSaldo)}</strong>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmarBaixa} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Valor Desta Baixa (R$)*</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={baixaFormData.valor_baixa}
                          onChange={(e) => setBaixaFormData({ ...baixaFormData, valor_baixa: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Data da Baixa*</label>
                        <input
                          type="date"
                          required
                          value={baixaFormData.data_pagamento}
                          onChange={(e) => setBaixaFormData({ ...baixaFormData, data_pagamento: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Alerta explicativo dinâmico */}
                    {vBaixaAtual > 0 && (
                      <div className={`p-2.5 rounded-xl border text-[11px] ${
                        isQuitacaoTotal 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                      }`}>
                        {isQuitacaoTotal ? (
                          <p className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            <span>Quitação Total: Este pagamento liquidará 100% do saldo do título.</span>
                          </p>
                        ) : (
                          <p className="font-bold flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-indigo-400" />
                            <span>Baixa Parcial: Restará saldo de {formatMoney(vRestanteApos)}. O título permanecerá com status 'Parcial'.</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Forma de Pagamento</label>
                      <select
                        value={baixaFormData.forma_pagamento}
                        onChange={(e) => setBaixaFormData({ ...baixaFormData, forma_pagamento: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Boleto">Boleto Bancário</option>
                        <option value="Transferência">Transferência / TED</option>
                        <option value="Débito Automático">Débito Automático</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Comprovante / Autenticação (Opcional)</label>
                      <input
                        type="text"
                        value={baixaFormData.comprovante_ref}
                        onChange={(e) => setBaixaFormData({ ...baixaFormData, comprovante_ref: e.target.value })}
                        placeholder="Número de autenticação ou ref."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setTituloBaixa(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={savingBaixa}
                        className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                      >
                        {savingBaixa ? 'Registrando...' : isQuitacaoTotal ? 'Confirmar Quitação Total' : 'Confirmar Baixa Parcial'}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}

          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE LANÇAMENTO */}
      {tituloParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-rose-600/50 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  {tituloParaExcluir.is_frete ? 'Excluir Viagem / Lançamento?' : 'Excluir Título Financeiro?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {tituloParaExcluir.is_frete 
                    ? 'Esta ação removerá o frete e todas as suas contas a pagar/receber vinculadas.' 
                    : 'Esta ação removerá este título operacional do fluxo financeiro.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p><strong className="text-white">Descrição:</strong> {tituloParaExcluir.descricao}</p>
              <p><strong className="text-white">Favorecido / Pessoa:</strong> {tituloParaExcluir.pessoa_nome || '-'}</p>
              <p><strong className="text-white">Valor:</strong> {formatMoney(tituloParaExcluir.valor)}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTituloParaExcluir(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmExcluir}
                disabled={isExcluindo}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isExcluindo ? 'Excluindo...' : 'Sim, Excluir Lançamento'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE APLICAR / EDITAR DESCONTO DE FRETE (ROUBO DE CARGA, QUEBRA, AVARIA) */}
      {modalDescontoTitulo && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalDescontoTitulo(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
        >
          <div className="w-full max-w-lg bg-slate-950 border border-rose-500/50 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Scissors className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">
                    Desconto de Frete (Abatimento de Carga)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Abatimento por roubo de carga, falta de óleo ou avaria
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDescontoTitulo(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSalvarDesconto} className="p-6 space-y-4 text-xs">
              
              {/* Informações do Título / Operação */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <p><strong className="text-white">Documento:</strong> {modalDescontoTitulo.descricao}</p>
                <p><strong className="text-white">Favorecido:</strong> {modalDescontoTitulo.pessoa_nome || '-'}</p>
                <p><strong className="text-white">Valor do Título:</strong> {formatMoney(modalDescontoTitulo.valor)}</p>
                {modalDescontoTitulo.valor_pago > 0 && (
                  <p><strong className="text-emerald-400">Total Já Pago:</strong> {formatMoney(modalDescontoTitulo.valor_pago)}</p>
                )}
              </div>

              {/* Input de Valor do Desconto */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Valor do Desconto / Abatimento (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-rose-400 font-mono text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={valorDescontoModal}
                    onChange={(e) => setValorDescontoModal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-rose-500/50 rounded-xl pl-11 pr-3 py-2.5 text-white font-mono font-bold text-base focus:border-rose-400 focus:outline-none shadow-inner"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Este valor será subtraído do saldo a pagar ao freteiro. Digite 0 para remover o desconto.
                </p>
              </div>

              {/* Motivo do Desconto */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Motivo do Desconto:
                </label>
                <input
                  type="text"
                  value={motivoDescontoModal}
                  onChange={(e) => setMotivoDescontoModal(e.target.value)}
                  placeholder="Ex: Roubo de carga de óleo na estrada, falta de produto, quebra excessiva..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
                />
              </div>

              {/* Atalhos Rápidos de Motivo */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10.5px] text-slate-400 block font-medium">Motivos frequentes no ramo de óleo/granel:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Roubo / Furto de Carga (Óleo)',
                    'Quebra / Falta de Mercadoria',
                    'Avaria / Derramamento de Produto',
                    'Multa / Atraso de Descarga'
                  ].map((motivo) => (
                    <button
                      key={motivo}
                      type="button"
                      onClick={() => setMotivoDescontoModal(motivo)}
                      className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-800 transition cursor-pointer text-[10.5px]"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulação em Tempo Real */}
              {(() => {
                const totalTit = Number(modalDescontoTitulo.valor || 0);
                const desc = parseFloat(valorDescontoModal || 0);
                const pago = Number(modalDescontoTitulo.valor_pago || 0);
                const novoSaldo = Math.max(0, Number((totalTit - pago - desc).toFixed(2)));

                return (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Valor Original:</span>
                      <strong className="text-white">{formatMoney(totalTit)}</strong>
                    </div>
                    {desc > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span>Desconto Aplicado:</span>
                        <strong>-{formatMoney(desc)}</strong>
                      </div>
                    )}
                    {pago > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Total Pago:</span>
                        <strong>{formatMoney(pago)}</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-slate-800">
                      <span>Novo Saldo Devedor:</span>
                      <strong className="text-sm">{formatMoney(novoSaldo)}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalDescontoTitulo(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvandoDesconto}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Scissors className="h-4 w-4" />
                  <span>{salvandoDesconto ? 'Salvando...' : 'Confirmar e Salvar Desconto'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL WHATSAPP FINANCEIRO (COBRANÇA DE CLIENTE OU INFORMATIVO DE MOTORISTA) */}
      {whatsAppModalFinanceiro && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setWhatsAppModalFinanceiro(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
            
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageCircle className="h-5 w-5" />
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                    {whatsAppModalFinanceiro.tipo === 'receber' ? 'Cobrança com Chave PIX (WhatsApp)' : 'Informativo de Pagamento (WhatsApp)'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Mensagem rápida pronta para envio direto ou cópia</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModalFinanceiro(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto">
              
              {/* Prévia da Mensagem */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Prévia da Mensagem:</label>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                  {gerarMensagemFinanceiro(whatsAppModalFinanceiro)}
                </pre>
              </div>

              {/* Envio Direto com Telefone Opcional */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 space-y-2">
                <label className="block text-[10px] text-slate-300 font-semibold">
                  Número do WhatsApp (Opcional):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={whatsappTelefone}
                    onChange={(e) => setWhatsappTelefone(e.target.value)}
                    placeholder="DDD + Número (ex: 4499887766)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleEnviarWhatsAppFinanceiro}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Abrir no WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setWhatsAppModalFinanceiro(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Fechar
                </button>
                
                <button
                  onClick={handleCopiarWhatsAppFinanceiro}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  {copiedWhatsApp ? <Check className="h-4 w-4 text-emerald-200" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedWhatsApp ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
