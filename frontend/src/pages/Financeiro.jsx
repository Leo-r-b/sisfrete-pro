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
  Send
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
    if (cat === 'frete_complemento') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950/40 border border-amber-500/40 text-amber-300 shadow-sm" title="Frete Complementar ('Por Fora')">
          <Layers className="h-3 w-3 text-amber-400" />
          <span>Frete Por Fora</span>
        </span>
      );
    }

    if (cat === 'faturamento_frete') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
          <Truck className="h-3 w-3 text-emerald-400" />
          <span>{nome || 'Recebimento CT-e'}</span>
        </span>
      );
    }

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
      repasse_agenciamento: Repeat,
      comissao_agenciamento: DollarSign,
      faturamento_frete: Truck
    };
    const IconComponent = icons[cat] || Layers;

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
        <IconComponent className="h-3 w-3 text-blue-400" />
        <span>{nome || cat}</span>
      </span>
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

      {/* Cards de Resumo Financeiro & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* 1. Total a Receber */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />
              <span>Total a Receber</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
              Pendente
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
              <span>Total a Pagar</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">
              Pendente
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

        {/* 3. Saldo Líquido Projetado */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-blue-500/20 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              <span>Saldo Projetado</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
              Líquido
            </span>
          </div>
          <h3 className={`text-xl sm:text-2xl font-black font-mono ${
            (kpis?.resumo?.saldoProjetado || 0) >= 0 ? 'text-blue-400' : 'text-rose-400'
          }`}>
            {formatMoney(kpis?.resumo?.saldoProjetado || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
            <span>Realizado no Caixa:</span>
            <strong className="text-white font-mono">{formatMoney(kpis?.resumo?.saldoRealizado || 0)}</strong>
          </p>
        </div>

        {/* 4. Comissões de Frete / Margem Operacional */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span>
                {metodologiaAtiva === 'agenciamento' ? 'Comissão da Agência' : metodologiaAtiva === 'transportadora' ? 'Lucro de Fretes' : 'Comissão & Margem'}
              </span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">
              {kpis?.resumo?.totalFretes || 0} Viagens
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
            {formatMoney(kpis?.resumo?.totalComissaoFretes || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
            <span>{metodologiaAtiva === 'agenciamento' ? 'Total Agenciado:' : 'Faturamento Bruto:'}</span>
            <strong className="text-white font-mono">{formatMoney(kpis?.resumo?.totalVendaFretes || 0)}</strong>
          </p>
        </div>

      </div>

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
              <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Descrição / Título</th>
                  <th className="px-3 py-2.5">Categoria (Plano de Contas)</th>
                  <th className="px-3 py-2.5">Favorecido / Tomador</th>
                  <th className="px-3 py-2.5">Vencimento</th>
                  <th className="px-3 py-2.5 text-right">Valor Total / Pago</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Carregando títulos financeiros...</span>
                      </div>
                    </td>
                  </tr>
                ) : titulos.filter(t => t.tipo === activeSubTab).length > 0 ? (
                  titulos.filter(t => t.tipo === activeSubTab).map((t) => {
                    const valorTotal = Number(t.valor || 0);
                    const valorPago = Number(t.valor_pago || 0);
                    const saldoPendente = Math.max(0, Number((valorTotal - valorPago).toFixed(2)));

                    const isQuitado = (t.status === 'pago' || t.status === 'recebido') || (valorPago >= valorTotal - 0.01 && valorTotal > 0);
                    const isParcial = !isQuitado && valorPago > 0;
                    const isPendente = !isQuitado && !isParcial;
                    const isVencido = !isQuitado && t.data_vencimento && t.data_vencimento < new Date().toISOString().slice(0, 10);

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* Descrição & Origem */}
                        <td className="px-3 py-2.5">
                          {t.is_triangular ? (
                            <div className="space-y-1">
                              <div className="p-1 rounded bg-indigo-950/40 border border-indigo-500/30 text-[10px]">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-indigo-300 font-mono">1: Nº {t.numero_cte || 'S/N'}</span>
                                  <span className="text-[9px] text-emerald-400 font-mono">{formatMoney(t.valor_cte_1 || t.valor)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-indigo-900/50">
                                  <span className="font-bold text-purple-300 font-mono">2: Nº {t.numero_cte_2 || 'S/N'}</span>
                                  <span className="text-[9px] text-emerald-400 font-mono">{formatMoney(t.valor_cte_2)}</span>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[8.5px] font-bold inline-block">
                                🔄 Triangular (2 CT-es)
                              </span>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-white text-xs truncate max-w-[200px]" title={t.descricao}>{t.descricao}</p>
                              <span className="text-[10px] text-slate-400">
                                {t.is_frete ? '🚚 Vinculado a Frete' : '🏢 Despesa / Título Avulso'}
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
                              <p className="font-medium text-indigo-200 truncate max-w-[150px] lg:max-w-[200px]" title={t.cliente_nome}>1. {t.cliente_nome}</p>
                              <p className="font-medium text-purple-200 truncate max-w-[150px] lg:max-w-[200px]" title={t.cliente_nome_2 || t.cliente_nome}>2. {t.cliente_nome_2 || t.cliente_nome}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-slate-200 truncate max-w-[160px] lg:max-w-[220px]" title={t.pessoa_nome}>{t.pessoa_nome || '-'}</p>
                              {t.forma_pagamento && (
                                <p className="text-[10px] text-slate-400 font-mono">{t.forma_pagamento}</p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Vencimento */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <p className={`font-semibold font-mono ${isVencido ? 'text-rose-400' : 'text-slate-300'}`}>
                            {t.data_vencimento ? new Date(t.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </p>
                          {isVencido && <span className="text-[9px] text-rose-400 font-bold block">Vencido</span>}
                        </td>

                        {/* Valor */}
                        <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                          <span className={`font-bold text-xs ${t.tipo === 'receber' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(valorTotal)}
                          </span>
                          {t.is_triangular && (t.valor_cte_1 > 0 || t.valor_cte_2 > 0) && (
                            <span className="text-[8.5px] text-slate-400 block font-normal">
                              (CT-es: {formatMoney(t.valor_cte_1)} | {formatMoney(t.valor_cte_2)})
                            </span>
                          )}
                          {valorPago > 0 && !isQuitado && (
                            <span className="text-[10px] text-emerald-400 block font-medium">Pago: {formatMoney(valorPago)}</span>
                          )}
                          {isParcial && saldoPendente > 0 && (
                            <span className="text-[10px] text-amber-400 block font-bold">Saldo: {formatMoney(saldoPendente)}</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {isQuitado ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center justify-center gap-1 mx-auto w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{t.tipo === 'receber' ? 'Recebido 100%' : 'Quitado 100%'}</span>
                            </span>
                          ) : isParcial ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40 flex items-center justify-center gap-1 mx-auto w-fit">
                              <Clock className="h-3 w-3" />
                              <span>Parcial ({formatMoney(valorPago)})</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center justify-center gap-1 mx-auto w-fit">
                              <Clock className="h-3 w-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        {/* Ações Rápidas: Baixar, WhatsApp, Boleto, Recibo, Excluir */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            
                            {/* Botão de Baixa */}
                            {!isQuitado ? (
                              <button
                                onClick={() => handleOpenBaixa(t)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                  isParcial 
                                    ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' 
                                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                }`}
                                title="Registrar Pagamento / Baixar Título"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>{isParcial ? `Pagar Saldo (${formatMoney(saldoPendente)})` : (t.tipo === 'receber' ? 'Receber' : 'Quitar')}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                <span>Baixado</span>
                              </span>
                            )}

                            {/* Botão WhatsApp Cobrança / PIX */}
                            <button
                              onClick={() => {
                                setWhatsAppModalFinanceiro(t);
                                setCopiedWhatsApp(false);
                                setWhatsappTelefone('');
                              }}
                              className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition cursor-pointer shrink-0"
                              title={t.tipo === 'receber' ? 'Enviar cobrança com chave PIX no WhatsApp' : 'Enviar informativo de acerto no WhatsApp'}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>

                            {/* Botão Recibo se houver frete vinculado */}
                            {t.frete_id && onOpenRecibo && (
                              <button
                                onClick={() => handleOpenReciboFromTitulo(t)}
                                className="p-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 transition cursor-pointer shrink-0"
                                title="Imprimir Recibo Oficial"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Botão Excluir Lançamento (Para Fretes ou Títulos Avulsos) */}
                            <button
                              onClick={() => setTituloParaExcluir(t)}
                              className="p-1 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition cursor-pointer shrink-0"
                              title="Excluir Lançamento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
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
