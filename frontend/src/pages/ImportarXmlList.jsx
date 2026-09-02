import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Truck, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clipboard, 
  Sparkles, 
  X, 
  FileCode,
  Layers,
  ArrowRight,
  Trash2,
  Ban,
  RotateCcw,
  AlertTriangle,
  FileCheck2,
  Edit,
  Eye,
  MessageCircle,
  Printer,
  Send,
  Copy,
  Check,
  ExternalLink,
  Repeat
} from 'lucide-react';
import api from '../services/api';
import FreteFormModal from './FreteFormModal';
import DacteModal from '../components/DacteModal';
import { useAuth } from '../context/AuthContext';

export default function ImportarXmlList({ onNovoFrete, onEditFrete, onOpenRecibo, onOpenLancamento }) {
  const { user, activeEmpresa } = useAuth();
  const isLicencaGestao = activeEmpresa?.modo_operacao === 'gestao_pagamentos';
  const isLicencaAgenciamento = activeEmpresa?.modo_operacao === 'agenciamento_repasse';
  const [fretesImportados, setFretesImportados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Modal Completo de Cadastro / Importação de Frete
  const [isFreteModalOpen, setIsFreteModalOpen] = useState(false);
  const [editingFrete, setEditingFrete] = useState(null);

  // Modal de Detalhes / Resumo do Frete com Print
  const [selectedFreteDetalhes, setSelectedFreteDetalhes] = useState(null);

  // Modal WhatsApp Comercial para o Cliente
  const [whatsAppModalFrete, setWhatsAppModalFrete] = useState(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [clienteTelefone, setClienteTelefone] = useState('');

  // Modal DACTE Fiscal
  const [dacteModalData, setDacteModalData] = useState(null);
  const [isDacteOpen, setIsDacteOpen] = useState(false);

  // Modal de Confirmação de Exclusão
  const [freteParaExcluir, setFreteParaExcluir] = useState(null);
  const [isExcluindo, setIsExcluindo] = useState(false);

  // Modal de Confirmação de Cancelamento
  const [freteParaCancelar, setFreteParaCancelar] = useState(null);
  const [isCancelando, setIsCancelando] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fretes', {
        params: { origem_registro: 'importacao_terceiros' }
      });
      setFretesImportados(res.data || []);
    } catch (err) {
      console.error('Erro ao listar fretes importados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNovoFrete = () => {
    setEditingFrete(null);
    setIsFreteModalOpen(true);
  };

  const handleOpenEditFrete = (frete) => {
    setEditingFrete(frete);
    setIsFreteModalOpen(true);
  };

  // Excluir Frete / XML do Sistema
  const handleConfirmExcluir = async () => {
    if (!freteParaExcluir) return;
    setIsExcluindo(true);
    try {
      await api.delete(`/fretes/${freteParaExcluir.id}`);
      setFretesImportados(prev => prev.filter(f => f.id !== freteParaExcluir.id));
      setFreteParaExcluir(null);
    } catch (err) {
      alert('Erro ao excluir documento: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsExcluindo(false);
    }
  };

  // Cancelar / Reativar CT-e
  const handleToggleCancelar = async () => {
    if (!freteParaCancelar) return;
    setIsCancelando(true);
    try {
      const novoStatus = freteParaCancelar.status_frete === 'cancelado' ? 'em_transito' : 'cancelado';
      await api.put(`/fretes/${freteParaCancelar.id}`, {
        ...freteParaCancelar,
        status_frete: novoStatus
      });
      setFretesImportados(prev => prev.map(f => f.id === freteParaCancelar.id ? { ...f, status_frete: novoStatus } : f));
      setFreteParaCancelar(null);
    } catch (err) {
      alert('Erro ao alterar status do documento: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsCancelando(false);
    }
  };

  const handleOpenDetalhes = async (frete) => {
    try {
      const res = await api.get(`/fretes/${frete.id}`);
      setSelectedFreteDetalhes(res.data);
    } catch (err) {
      setSelectedFreteDetalhes(frete);
    }
  };

  const handleOpenDacte = async (f) => {
    try {
      const res = await api.get(`/fiscal/dacte/${f.id}`);
      setDacteModalData(res.data);
      setIsDacteOpen(true);
    } catch (err) {
      alert('Erro ao carregar DACTE: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Gerador de mensagem para WhatsApp
  const gerarMensagemCliente = (f) => {
    if (!f) return '';
    const isTriangular = f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
    const isGestao = f.tipo_operacao === 'gestao_pagamentos' || isLicencaGestao;
    const isAgenciamento = !isGestao && (f.tipo_operacao === 'agenciamento_repasse' || (f.valor_frete_real > 0) || isLicencaAgenciamento);
    const totalVenda = (f.valor_frete_venda || 0) + (isTriangular ? (f.valor_frete_venda_2 || 0) : 0);
    const pesoTon1 = f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : '0.00';
    const pesoTon2 = f.peso_kg_2 ? (f.peso_kg_2 / 1000).toFixed(2) : pesoTon1;

    const freteReal = f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0);
    const pctComissao = f.percentual_comissao !== undefined && f.percentual_comissao !== '' ? Number(f.percentual_comissao) : 0;
    let valorComissao = 0;
    if (isGestao) {
      valorComissao = Number(f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '' ? f.valor_comissao : 0);
    } else if (f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '') {
      valorComissao = Number(f.valor_comissao);
    } else if (isAgenciamento) {
      valorComissao = Number((freteReal * (pctComissao / 100)).toFixed(2));
    } else {
      valorComissao = Number(f.valor_comissao || 0);
    }

    const valorRepasse = isGestao || isAgenciamento 
      ? (f.valor_repasse !== undefined && f.valor_repasse !== null && f.valor_repasse !== '' ? Number(f.valor_repasse) : Math.max(0, totalVenda - freteReal - valorComissao))
      : 0;

    if (f.tipo_operacao === 'gestao_pagamentos' || f.destinatario_comissao_nome || isGestao) {
      let cteDetails = `📋 *CT-e Nº:* ${f.numero_cte || 'S/N'} (${formatMoney(f.valor_frete_venda)})`;
      if (isTriangular) {
        cteDetails = `📋 *CT-e 1:* Nº ${f.numero_cte || 'S/N'} - ${formatMoney(f.valor_frete_venda)}
📋 *CT-e 2:* Nº ${f.numero_cte_2 || 'S/N'} - ${formatMoney(f.valor_frete_venda_2)}
💰 *Valor Total dos CT-es:* ${formatMoney(totalVenda)}`;
      }

      return `📊 *RATEIO OPERACIONAL - GESTÃO DE PAGAMENTOS*
---------------------------------------
${cteDetails}
📍 *Trajeto:* ${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf}
🚛 *Veículo:* ${f.placa_veiculo || 'N/I'} ${f.placa_carreta ? `| Carreta: ${f.placa_carreta}` : ''}
👤 *Transportador:* ${f.favorecido_freteiro_nome || f.motorista_nome || 'Freteiro'}
🔑 *Chave PIX:* ${f.pix_chave || 'A Combinar'}

💵 *DIVISÃO DOS PAGAMENTOS:*
• *Frete Real (${f.favorecido_freteiro_nome || f.motorista_nome || 'Freteiro'}):* ${formatMoney(freteReal)}
${valorComissao > 0 ? `• *Comissão (${f.destinatario_comissao_nome || 'Agenciador'}):* ${formatMoney(valorComissao)}\n` : ''}${valorRepasse > 0 ? `• *Repasse (${f.destinatario_repasse_nome || 'Conta de Destino'}):* ${formatMoney(valorRepasse)}\n` : ''}---------------------------------------
💰 *TOTAL CONCILIADO:* ${formatMoney(totalVenda)}
---------------------------------------
*${activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'Transportes & Logística'}*`;
    }

    if (isAgenciamento) {
      let cteDetails = `📋 *CT-e Nº:* ${f.numero_cte || 'S/N'} (${formatMoney(f.valor_frete_venda)})`;
      if (isTriangular) {
        cteDetails = `📋 *CT-e 1:* Nº ${f.numero_cte || 'S/N'} - ${formatMoney(f.valor_frete_venda)}
📋 *CT-e 2:* Nº ${f.numero_cte_2 || 'S/N'} - ${formatMoney(f.valor_frete_venda_2)}
💰 *Valor Total dos CT-es:* ${formatMoney(totalVenda)}`;
      }

      return `📊 *RESUMO OPERACIONAL - AGENCIAMENTO & REPASSE*
---------------------------------------
${cteDetails}
📍 *Trajeto:* ${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf}
🚛 *Veículo:* ${f.placa_veiculo || 'N/I'} ${f.placa_carreta ? `| Carreta: ${f.placa_carreta}` : ''}
👤 *Transportador:* ${f.motorista_nome}
🔑 *Chave PIX:* ${f.pix_chave || 'A Combinar'}

💵 *FECHAMENTO FINANCEIRO:*
• *Valor do Transportador (Frete Real):* ${formatMoney(freteReal)}
• *Comissão Retida (${pctComissao}% sobre Frete Real):* ${formatMoney(valorComissao)}
---------------------------------------
💰 *VALOR DISPONÍVEL PARA REPASSE:* ${formatMoney(valorRepasse)}
---------------------------------------
*${activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'Transportes & Logística'}*`;
    }

    let docSection = '';
    if (isTriangular) {
      docSection = `🔄 *OPERAÇÃO TRIANGULAR (2 CT-es Vinculados):*
📋 *CT-e 1:* Nº ${f.numero_cte || 'S/N'} ${f.nfe_referencia ? `(${f.nfe_referencia})` : ''}
🏢 *Tomador 1:* ${f.cliente_nome}
⚖️ *Peso 1:* ${pesoTon1} ton
💰 *Frete CT-e 1:* ${formatMoney(f.valor_frete_venda)}

📋 *CT-e 2:* Nº ${f.numero_cte_2 || 'S/N'} ${f.nfe_referencia_2 ? `(${f.nfe_referencia_2})` : ''}
🏢 *Tomador 2:* ${f.cliente_nome_2 || f.cliente_nome}
⚖️ *Peso 2:* ${pesoTon2} ton
💰 *Frete CT-e 2:* ${formatMoney(f.valor_frete_venda_2)}`;
    } else {
      docSection = `📋 *CT-e:* Nº ${f.numero_cte || 'S/N'} ${f.nfe_referencia ? `(${f.nfe_referencia})` : ''}
🏢 *Tomador / Cliente:* ${f.cliente_nome}
⚖️ *Peso da Carga:* ${pesoTon1} ton`;
    }

    return `🚚 *INFORMATIVO DE TRANSPORTE & FRETE*
---------------------------------------
${docSection}
---------------------------------------
📍 *Origem:* ${f.origem_cidade}/${f.origem_uf}
🏁 *Destino:* ${f.destino_cidade}/${f.destino_uf}
🚛 *Veículo:* Cavalo: ${f.placa_veiculo || 'N/I'} | Carreta: ${f.placa_carreta || 'N/I'}
👤 *Motorista:* ${f.motorista_nome}
---------------------------------------
💵 *VALOR TOTAL DO FRETE:* ${formatMoney(totalVenda)}
---------------------------------------
*${activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'Transportes & Logística'}*`;
  };

  const handleCopiarWhatsAppCliente = () => {
    if (!whatsAppModalFrete) return;
    const msg = gerarMensagemCliente(whatsAppModalFrete);
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleEnviarWhatsAppWeb = () => {
    if (!whatsAppModalFrete) return;
    const msg = encodeURIComponent(gerarMensagemCliente(whatsAppModalFrete));
    const phoneClean = clienteTelefone.replace(/\D/g, '');
    const url = phoneClean 
      ? `https://api.whatsapp.com/send?phone=55${phoneClean}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`;
    window.open(url, '_blank');
  };

  const filteredFretes = fretesImportados.filter(f => {
    // Filtro por status
    if (filtroStatus === 'conciliados' && f.status_frete === 'cancelado') return false;
    if (filtroStatus === 'cancelados' && f.status_frete !== 'cancelado') return false;

    // Filtro por busca de texto
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      String(f.numero_cte || '').toLowerCase().includes(term) ||
      String(f.numero_cte_2 || '').toLowerCase().includes(term) ||
      String(f.cliente_nome || '').toLowerCase().includes(term) ||
      String(f.cliente_nome_2 || '').toLowerCase().includes(term) ||
      String(f.motorista_nome || '').toLowerCase().includes(term) ||
      String(f.placa_veiculo || '').toLowerCase().includes(term) ||
      String(f.chave_cte || '').toLowerCase().includes(term) ||
      String(f.chave_cte_2 || '').toLowerCase().includes(term) ||
      String(f.nfe_referencia || '').toLowerCase().includes(term) ||
      String(f.nfe_referencia_2 || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-slate-100">
      
      {/* Header do Módulo de Importação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-blue-400" />
            <span>{isLicencaGestao ? 'Importação & Rateio de Pagamentos (CT-e)' : 'Importação de CT-e & XML de Terceiros'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {isLicencaGestao 
              ? 'Importe CT-es simples ou triangulares para ratear as obrigações a pagar: Frete Real (ao Freteiro), Comissão (ao Agenciador) e Repasse'
              : 'Conciliação completa de CT-e Simples e Triangular (2 CT-es), validação de duplicidade e controle financeiro'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNovoFrete}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isLicencaGestao ? '+ Importar CT-e para Rateio' : '+ Cadastrar / Importar CT-e (XML)'}</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        
        {/* Contadores e Abas Rápidas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filtroStatus === 'todos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({fretesImportados.length})
          </button>

          <button
            onClick={() => setFiltroStatus('conciliados')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              filtroStatus === 'conciliados' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Conciliados</span>
            <span className="text-[10px] opacity-80">({fretesImportados.filter(f => f.status_frete !== 'cancelado').length})</span>
          </button>

          <button
            onClick={() => setFiltroStatus('cancelados')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              filtroStatus === 'cancelados' 
                ? 'bg-rose-600 text-white shadow' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Cancelados</span>
            <span className="text-[10px] opacity-80">({fretesImportados.filter(f => f.status_frete === 'cancelado').length})</span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por CT-e, cliente, motorista, placa..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* TABELA DE FRETES / CT-ES IMPORTADOS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 uppercase text-[9.5px] font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-2.5 py-2.5">Documento(s) Fiscal(is)</th>
                <th className="px-2.5 py-2.5">Tomador(es)</th>
                <th className="px-2.5 py-2.5">Trajeto & Carga</th>
                <th className="px-2.5 py-2.5">Motorista / Placa</th>
                <th className="px-2.5 py-2.5 text-right">Valor Total Bruto</th>
                <th className="px-2.5 py-2.5 text-right">Fechamento (Custo / Lucro)</th>
                <th className="px-2 py-2.5 text-center">Status</th>
                <th className="px-2 py-2.5 text-center w-[200px] min-w-[200px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando documentos fiscais...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredFretes.length > 0 ? (
                filteredFretes.map((f) => {
                  const isCancelado = f.status_frete === 'cancelado';
                  const isTriangular = f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
                  const isGestao = f.tipo_operacao === 'gestao_pagamentos' || isLicencaGestao;
                  const isAgenciamento = !isGestao && (f.tipo_operacao === 'agenciamento_repasse' || (f.valor_frete_real > 0) || isLicencaAgenciamento);

                  const v1 = Number(f.valor_frete_venda || 0);
                  const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
                  const totalVenda = v1 + v2;

                  const pesoTotalTon = ((Number(f.peso_kg || 0) + (isTriangular ? Number(f.peso_kg_2 || 0) : 0)) / 1000).toFixed(2);
                  const freteReal = Number(f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0));
                  const pctComissao = f.percentual_comissao !== undefined && f.percentual_comissao !== '' ? Number(f.percentual_comissao) : 0;
                  
                  let valorComissao = 0;
                  if (isGestao) {
                    valorComissao = Number(f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '' ? f.valor_comissao : 0);
                  } else if (f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '') {
                    valorComissao = Number(f.valor_comissao);
                  } else if (isAgenciamento) {
                    valorComissao = Number((freteReal * (pctComissao / 100)).toFixed(2));
                  } else {
                    valorComissao = Number(Math.max(0, totalVenda - freteReal));
                  }

                  const margemPct = totalVenda > 0 ? ((valorComissao / totalVenda) * 100).toFixed(1) : '0.0';
                  const valorRepasse = isGestao || isAgenciamento 
                    ? (f.valor_repasse !== undefined && f.valor_repasse !== null && f.valor_repasse !== '' ? Number(f.valor_repasse) : Math.max(0, totalVenda - freteReal - valorComissao))
                    : Number(f.valor_repasse || 0);

                  return (
                    <tr key={f.id} className={`transition ${isCancelado ? 'bg-rose-950/20 opacity-70 hover:opacity-100' : 'hover:bg-slate-800/40'}`}>
                      
                      {/* 1. CT-e / Documento Fiscal */}
                      <td className="px-2.5 py-2">
                        {isTriangular ? (
                          <div className="space-y-0.5">
                            <div className="p-1 rounded bg-indigo-950/40 border border-indigo-500/30 text-[10px]">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-indigo-300 font-mono">1: Nº {f.numero_cte || 'S/N'}</span>
                                <span className="text-[9px] text-emerald-400 font-mono">{formatMoney(v1)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-indigo-900/50">
                                <span className="font-bold text-purple-300 font-mono">2: Nº {f.numero_cte_2 || 'S/N'}</span>
                                <span className="text-[9px] text-emerald-400 font-mono">{formatMoney(v2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[8.5px] font-bold">
                                🔄 Triangular
                              </span>
                              {f.data_emissao && (
                                <span className="text-[8.5px] text-slate-400 font-mono">
                                  {new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 text-xs">
                            <p className={`font-bold font-mono ${isCancelado ? 'line-through text-slate-400' : 'text-white'}`}>
                              CT-e Nº {f.numero_cte || 'S/N'}
                            </p>
                            <p className="text-[9.5px] text-slate-400 font-mono">
                              {f.data_emissao ? new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 2. Tomador(es) */}
                      <td className="px-2.5 py-2">
                        {isTriangular ? (
                          <div className="space-y-0.5 text-[11px]">
                            <p className="font-medium text-indigo-200 truncate max-w-[140px]" title={f.cliente_nome}>
                              1. {f.cliente_nome}
                            </p>
                            <p className="font-medium text-purple-200 truncate max-w-[140px]" title={f.cliente_nome_2 || f.cliente_nome}>
                              2. {f.cliente_nome_2 || f.cliente_nome}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-slate-200 truncate max-w-[140px]" title={f.cliente_nome}>{f.cliente_nome}</p>
                            <p className="text-[9.5px] text-slate-400 font-mono">{f.cliente_cnpj || '-'}</p>
                          </div>
                        )}
                      </td>

                      {/* 3. Trajeto & Carga */}
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1 font-medium text-slate-200 text-[11px]">
                          <span>{f.origem_cidade}/{f.origem_uf}</span>
                          <span className="text-slate-500">➔</span>
                          <span>{f.destino_cidade}/{f.destino_uf}</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-mono">
                          {pesoTotalTon}t • {f.tipo_carga || 'Geral'}
                        </p>
                      </td>

                      {/* 4. Veículo / Motorista */}
                      <td className="px-2.5 py-2">
                        <p className="font-medium text-blue-300 truncate max-w-[120px] text-[11px]">{f.motorista_nome}</p>
                        <p className="text-[9.5px] font-mono text-slate-400">
                          {f.placa_veiculo || 'S/N'} {f.placa_carreta ? `| ${f.placa_carreta}` : ''}
                        </p>
                      </td>

                      {/* 5. Valor Total Bruto */}
                      <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                        <span className="font-bold text-emerald-400 text-xs block">
                          {formatMoney(totalVenda)}
                        </span>
                        {isTriangular && (
                          <span className="text-[8.5px] text-slate-400 block">
                            (1: {formatMoney(v1)} | 2: {formatMoney(v2)})
                          </span>
                        )}
                      </td>

                      {/* 6. Fechamento (Custo / Lucro / Repasse) */}
                      <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap text-[10px]">
                        {isGestao || f.destinatario_comissao_nome || f.destinatario_repasse_nome ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-300 flex justify-end items-center gap-1" title={f.favorecido_freteiro_nome || f.motorista_nome || 'Freteiro'}>
                              <span className="text-slate-500">Freteiro:</span>
                              <span className="font-bold text-emerald-400">{formatMoney(freteReal)}</span>
                            </div>
                            {valorComissao > 0 && (
                              <div className="text-purple-300 flex justify-end items-center gap-1" title={f.destinatario_comissao_nome || 'Comissão'}>
                                <span className="text-slate-500">Comissão:</span>
                                <span className="font-bold text-purple-400">{formatMoney(valorComissao)}</span>
                              </div>
                            )}
                            {valorRepasse > 0 && (
                              <div className="text-indigo-300 flex justify-end items-center gap-1" title={f.destinatario_repasse_nome || 'Conta de Destino'}>
                                <span className="text-slate-500">Repasse:</span>
                                <span className="font-bold text-indigo-400">{formatMoney(valorRepasse)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-slate-300 flex justify-end items-center gap-1">
                              <span className="text-slate-500">Freteiro:</span>
                              <span className="font-bold text-indigo-300">{formatMoney(freteReal)}</span>
                            </div>
                            <div className="text-emerald-400 flex justify-end items-center gap-1">
                              <span className="text-slate-500">Lucro:</span>
                              <span className="font-bold">{formatMoney(valorComissao)}</span>
                              <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30">
                                {margemPct}%
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        {isCancelado ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold inline-flex items-center gap-0.5">
                            <Ban className="h-2.5 w-2.5" />
                            <span>Cancelado</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Conciliado</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Ações Completas (Ultra Compacto & 100% Horizontal) */}
                      <td className="px-2 py-2 text-center w-[200px] min-w-[200px] whitespace-nowrap">
                        <div className="flex items-center justify-center gap-0.5 flex-nowrap">
                          
                          {/* Resumo */}
                          <button
                            onClick={() => handleOpenDetalhes(f)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-blue-400 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition cursor-pointer shrink-0"
                            title="Resumo da Viagem & Fechamento Financeiro"
                          >
                            <Eye className="h-3 w-3" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => {
                              setWhatsAppModalFrete(f);
                              setCopiedWhatsApp(false);
                              setClienteTelefone(f.cliente_telefone || f.motorista_telefone || '');
                            }}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-emerald-400 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition cursor-pointer shrink-0"
                            title="Enviar Informativo / Resumo via WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </button>

                          {/* Recibo */}
                          {onOpenRecibo && (
                            <button
                              onClick={() => onOpenRecibo(f)}
                              className="p-1 rounded bg-slate-800 border border-slate-700 text-amber-400 hover:bg-amber-600 hover:border-amber-600 hover:text-white transition cursor-pointer shrink-0"
                              title="Imprimir Recibo de Frete"
                            >
                              <Printer className="h-3 w-3" />
                            </button>
                          )}

                          {/* Lançamento */}
                          {onOpenLancamento && (
                            <button
                              onClick={() => onOpenLancamento(f)}
                              className="p-1 rounded bg-slate-800 border border-slate-700 text-purple-400 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition cursor-pointer shrink-0"
                              title="Dar Baixa ou Lançamento Financeiro"
                            >
                              <DollarSign className="h-3 w-3" />
                            </button>
                          )}

                          {/* DACTE */}
                          <button
                            onClick={() => handleOpenDacte(f)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition cursor-pointer shrink-0"
                            title="Visualizar DACTE Fiscal"
                          >
                            <FileText className="h-3 w-3" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditFrete(f)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer shrink-0"
                            title="Editar dados deste frete / CT-e"
                          >
                            <Edit className="h-3 w-3" />
                          </button>

                          {/* Cancelar / Reativar */}
                          <button
                            onClick={() => setFreteParaCancelar(f)}
                            className={`p-1 rounded border transition cursor-pointer shrink-0 ${
                              isCancelado 
                                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 hover:bg-emerald-800 hover:text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-amber-600 hover:border-amber-600 hover:text-white'
                            }`}
                            title={isCancelado ? 'Reativar documento conciliado' : 'Cancelar este documento'}
                          >
                            {isCancelado ? <RotateCcw className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => setFreteParaExcluir(f)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition cursor-pointer shrink-0"
                            title="Excluir XML definitivamente do sistema"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Nenhum documento encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL COMPLETO DE CADASTRO / IMPORTAÇÃO ─── */}
      {isFreteModalOpen && (
        <FreteFormModal
          isOpen={isFreteModalOpen}
          onClose={() => setIsFreteModalOpen(false)}
          onSuccess={loadData}
          freteEdit={editingFrete}
          defaultOrigem="importacao_terceiros"
        />
      )}

      {/* ─── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ─── */}
      {freteParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-rose-600/50 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">Excluir XML / CT-e?</h3>
                <p className="text-xs text-slate-400">Esta ação removerá o documento fiscal do sistema</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p>
                <strong className="text-white">CT-e:</strong> Nº {freteParaExcluir.numero_cte || 'S/N'} 
                {freteParaExcluir.numero_cte_2 ? ` + CT-e 2 Nº ${freteParaExcluir.numero_cte_2}` : ''}
              </p>
              <p><strong className="text-white">Tomador:</strong> {freteParaExcluir.cliente_nome}</p>
              <p><strong className="text-white">Valor:</strong> {formatMoney((freteParaExcluir.valor_frete_venda || 0) + (freteParaExcluir.valor_frete_venda_2 || 0))}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFreteParaExcluir(null)}
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
                <span>{isExcluindo ? 'Excluindo...' : 'Sim, Excluir Documento'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL DE CONFIRMAÇÃO DE CANCELAMENTO / REATIVAÇÃO ─── */}
      {freteParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-950 border border-amber-600/50 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                {freteParaCancelar.status_frete === 'cancelado' ? <RotateCcw className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  {freteParaCancelar.status_frete === 'cancelado' ? 'Reativar Documento?' : 'Cancelar Documento?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {freteParaCancelar.status_frete === 'cancelado' 
                    ? 'O documento voltará ao status ativo de conciliação' 
                    : 'O documento será marcado como cancelado na conciliação'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p><strong className="text-white">CT-e:</strong> Nº {freteParaCancelar.numero_cte || 'S/N'} {freteParaCancelar.numero_cte_2 ? `+ Nº ${freteParaCancelar.numero_cte_2}` : ''}</p>
              <p><strong className="text-white">Tomador:</strong> {freteParaCancelar.cliente_nome}</p>
              <p><strong className="text-white">Valor:</strong> {formatMoney((freteParaCancelar.valor_frete_venda || 0) + (freteParaCancelar.valor_frete_venda_2 || 0))}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFreteParaCancelar(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleToggleCancelar}
                disabled={isCancelando}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                  freteParaCancelar.status_frete === 'cancelado'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                {isCancelando ? (
                  <span>Processando...</span>
                ) : freteParaCancelar.status_frete === 'cancelado' ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Reativar Documento</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    <span>Confirmar Cancelamento</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL WHATSAPP COMERCIAL PARA O CLIENTE */}
      {whatsAppModalFrete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setWhatsAppModalFrete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
            
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageCircle className="h-5 w-5" />
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">Informativo para o Cliente (WhatsApp)</h3>
                  <p className="text-[10px] text-slate-400">Texto pronto com resumo e dados da viagem</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModalFrete(null)}
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
                  {gerarMensagemCliente(whatsAppModalFrete)}
                </pre>
              </div>

              {/* Envio Direto com Telefone Opcional */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 space-y-2">
                <label className="block text-[10px] text-slate-300 font-semibold">
                  Enviar Direto para o WhatsApp do Cliente / Motorista:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="DDD + Número (ex: 4499887766)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleEnviarWhatsAppWeb}
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
                  onClick={() => setWhatsAppModalFrete(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Fechar
                </button>
                
                <button
                  onClick={handleCopiarWhatsAppCliente}
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

      {/* MODAL / DRAWER DE DETALHES & RESUMO DO FRETE COM PRINT */}
      {selectedFreteDetalhes && (() => {
        const isTriang = selectedFreteDetalhes.tipo_operacao === 'triangular' || Boolean(selectedFreteDetalhes.numero_cte_2 || Number(selectedFreteDetalhes.valor_frete_venda_2 || 0) > 0);
        const v1 = Number(selectedFreteDetalhes.valor_frete_venda || 0);
        const v2 = isTriang ? Number(selectedFreteDetalhes.valor_frete_venda_2 || 0) : 0;
        const totalV = v1 + v2;
        const freteReal = Number(selectedFreteDetalhes.valor_frete_real > 0 ? selectedFreteDetalhes.valor_frete_real : (selectedFreteDetalhes.valor_frete_compra || 0));
        const comissao = Number(selectedFreteDetalhes.valor_comissao !== undefined && selectedFreteDetalhes.valor_comissao !== null && selectedFreteDetalhes.valor_comissao !== '' ? selectedFreteDetalhes.valor_comissao : 0);
        const repasse = Number(selectedFreteDetalhes.valor_repasse || 0);

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedFreteDetalhes(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
          >
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-400" />
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                    {isTriang 
                      ? `Resumo da Viagem - CT-e 1 Nº ${selectedFreteDetalhes.numero_cte || 'S/N'} + CT-e 2 Nº ${selectedFreteDetalhes.numero_cte_2 || 'S/N'}`
                      : `Resumo da Viagem - CT-e Nº ${selectedFreteDetalhes.numero_cte || 'S/N'}`}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFreteDetalhes(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* Box dos Documentos Fiscais */}
                {isTriang ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Documento Fiscal 1</p>
                      <p className="text-sm font-bold text-white font-mono">CT-e Nº {selectedFreteDetalhes.numero_cte || 'S/N'}</p>
                      <p className="text-slate-300"><strong>Tomador 1:</strong> {selectedFreteDetalhes.cliente_nome}</p>
                      <p className="text-slate-400"><strong>Valor Bruto 1:</strong> <span className="font-mono text-emerald-400 font-bold">{formatMoney(v1)}</span></p>
                      {selectedFreteDetalhes.nfe_referencia && <p className="text-[10px] text-slate-400 font-mono">{selectedFreteDetalhes.nfe_referencia}</p>}
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Documento Fiscal 2 (Triangular)</p>
                      <p className="text-sm font-bold text-white font-mono">CT-e Nº {selectedFreteDetalhes.numero_cte_2 || 'S/N'}</p>
                      <p className="text-slate-300"><strong>Tomador 2:</strong> {selectedFreteDetalhes.cliente_nome_2 || selectedFreteDetalhes.cliente_nome}</p>
                      <p className="text-slate-400"><strong>Valor Bruto 2:</strong> <span className="font-mono text-emerald-400 font-bold">{formatMoney(v2)}</span></p>
                      {selectedFreteDetalhes.nfe_referencia_2 && <p className="text-[10px] text-slate-400 font-mono">{selectedFreteDetalhes.nfe_referencia_2}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                    <p className="text-slate-400 font-semibold uppercase">Documento Fiscal</p>
                    <p className="text-sm font-bold text-white mt-1">CT-e Nº {selectedFreteDetalhes.numero_cte || 'S/N'}</p>
                    <p className="text-slate-400 mt-1"><strong>Tomador:</strong> {selectedFreteDetalhes.cliente_nome}</p>
                    <p className="text-slate-400"><strong>Valor Cobrado:</strong> {formatMoney(v1)}</p>
                  </div>
                )}

                {/* Box de Trajeto e Transportador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Carga & Trajeto</p>
                    <p className="text-slate-200 mt-1"><strong>Rota:</strong> {selectedFreteDetalhes.origem_cidade}/{selectedFreteDetalhes.origem_uf} ➔ {selectedFreteDetalhes.destino_cidade}/{selectedFreteDetalhes.destino_uf}</p>
                    <p className="text-slate-400"><strong>Carga:</strong> {selectedFreteDetalhes.tipo_carga || 'Carga Geral'} ({(((Number(selectedFreteDetalhes.peso_kg || 0) + (isTriang ? Number(selectedFreteDetalhes.peso_kg_2 || 0) : 0))) / 1000).toFixed(2)} ton)</p>
                  </div>
                  
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Transportador / Veículo</p>
                    <p className="text-blue-300 font-bold mt-1">{selectedFreteDetalhes.motorista_nome}</p>
                    <p className="text-slate-300 font-mono">Cavalo: {selectedFreteDetalhes.placa_veiculo || 'S/N'} {selectedFreteDetalhes.placa_carreta ? `| Carreta: ${selectedFreteDetalhes.placa_carreta}` : ''}</p>
                    {selectedFreteDetalhes.pix_chave && <p className="text-emerald-400 font-mono">Chave PIX: {selectedFreteDetalhes.pix_chave}</p>}
                  </div>
                </div>

                {/* Demonstrativo Financeiro Fechado */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
                  <p className="font-bold text-white uppercase text-xs">Fechamento Financeiro da Operação</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-slate-400 text-[10px]">Venda Total Cobrada</p>
                      <p className="text-sm font-bold text-white mt-0.5 font-mono">
                        {formatMoney(totalV)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-slate-400 text-[10px]">Frete Real Motorista</p>
                      <p className="text-sm font-bold text-indigo-300 mt-0.5 font-mono">
                        {formatMoney(freteReal)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                      <p className="text-emerald-400 text-[10px]">Sua Margem / Lucro</p>
                      <p className="text-sm font-bold text-emerald-300 mt-0.5 font-mono">
                        {formatMoney(comissao)}
                      </p>
                    </div>
                  </div>

                  {repasse > 0 && (
                    <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/30 flex justify-between items-center text-xs font-mono">
                      <span className="text-purple-300 font-bold">Valor Disponível para Repasse ao Embarcador:</span>
                      <span className="text-purple-300 font-bold text-sm">{formatMoney(repasse)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                    <p>Adiantamento: <strong>{formatMoney(selectedFreteDetalhes.valor_adiantamento)}</strong></p>
                    <p>Pedágio/Desc: <strong>{formatMoney((selectedFreteDetalhes.valor_pedagio || 0) + (selectedFreteDetalhes.valor_combustivel || 0))}</strong></p>
                    <p>Saldo Devedor: <strong className="text-amber-400">{formatMoney(selectedFreteDetalhes.valor_saldo_motorista)}</strong></p>
                  </div>
                </div>

                {/* Botões de Ação do Resumo */}
                <div className="pt-3 flex justify-between items-center gap-2 border-t border-slate-800 flex-wrap">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    title="Imprimir tela ou salvar como PDF"
                  >
                    <Printer className="h-4 w-4 text-slate-400" />
                    <span>Imprimir / Print</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const f = selectedFreteDetalhes;
                        setSelectedFreteDetalhes(null);
                        handleOpenDacte(f);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      <span>DACTE Fiscal</span>
                    </button>

                    {onOpenRecibo && (
                      <button
                        onClick={() => {
                          const f = selectedFreteDetalhes;
                          setSelectedFreteDetalhes(null);
                          onOpenRecibo(f);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Imprimir Recibo</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DACTE EMISSÃO OFICIAL PDF */}
      <DacteModal
        isOpen={isDacteOpen}
        onClose={() => setIsDacteOpen(false)}
        dacteData={dacteModalData}
      />

    </div>
  );
}
