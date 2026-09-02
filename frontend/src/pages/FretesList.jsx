import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Printer, 
  DollarSign, 
  Edit, 
  Trash2, 
  Truck, 
  Eye, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Calendar, 
  Layers, 
  Repeat, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  MessageCircle, 
  X,
  Phone,
  Scale,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Camera,
  Ban,
  AlertTriangle,
  XCircle,
  RotateCcw,
  FileEdit
} from 'lucide-react';
import api from '../services/api';
import { StatusFreteBadge, StatusPagamentoBadge, StatusRecebimentoBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import DacteModal from '../components/DacteModal';
import CanhotoAuditModal from '../components/CanhotoAuditModal';
import EmissaoCteModal from './EmissaoCteModal';
import CartaCorrecaoModal from '../components/CartaCorrecaoModal';

export default function FretesList({ onNovoFrete, onEditFrete, onOpenRecibo, onOpenLancamento }) {
  const { user, activeEmpresa } = useAuth();
  const isLicencaAgenciamento = activeEmpresa?.modo_operacao === 'agenciamento_repasse';
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFrete, setStatusFrete] = useState('');
  const [statusPagamento, setStatusPagamento] = useState('');
  const [statusRecebimento, setStatusRecebimento] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState('');
  const [selectedFreteDetalhes, setSelectedFreteDetalhes] = useState(null);
  
  // Modal de Emissão Rápida de CT-e (Poucos Cliques & ANTT)
  const [isEmissaoModalOpen, setIsEmissaoModalOpen] = useState(false);

  // Modal DACTE Fiscal
  const [dacteModalData, setDacteModalData] = useState(null);
  const [isDacteOpen, setIsDacteOpen] = useState(false);

  // Modal Canhoto Digital POD
  const [canhotoModalFrete, setCanhotoModalFrete] = useState(null);

  // Modal de Cancelamento de CT-e SEFAZ
  const [cteParaCancelar, setCteParaCancelar] = useState(null);
  const [justificativaCte, setJustificativaCte] = useState('');
  const [cancelandoCte, setCancelandoCte] = useState(false);
  const [cancelamentoError, setCancelamentoError] = useState('');
  const [cancelamentoSuccess, setCancelamentoSuccess] = useState('');

  // Modal Carta de Correção Eletrônica (CC-e) SEFAZ
  const [cceFrete, setCceFrete] = useState(null);

  // Modal de Emissão CT-e SEFAZ
  const [emitindoFrete, setEmitindoFrete] = useState(null);
  const [isTransmittingSefaz, setIsTransmittingSefaz] = useState(false);
  const [emissaoError, setEmissaoError] = useState('');
  const [emissaoSuccess, setEmissaoSuccess] = useState('');

  // Modal WhatsApp Comercial para o Cliente
  const [whatsAppModalFrete, setWhatsAppModalFrete] = useState(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [clienteTelefone, setClienteTelefone] = useState('');

  const loadFretes = async () => {
    try {
      setLoading(true);
      const params = {
        origem_registro: 'emissao_propria'
      };
      if (search) params.search = search;
      if (statusFrete) params.status_frete = statusFrete;
      if (statusPagamento) params.status_pagamento = statusPagamento;
      if (statusRecebimento) params.status_recebimento = statusRecebimento;
      if (tipoOperacao) params.tipo_operacao = tipoOperacao;

      const res = await api.get('/fretes', { params });
      setFretes(res.data);
    } catch (err) {
      console.error('Erro ao buscar fretes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFretes();
  }, [search, statusFrete, statusPagamento, statusRecebimento, tipoOperacao]);

  // Fechar modais ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (whatsAppModalFrete) setWhatsAppModalFrete(null);
        if (selectedFreteDetalhes) setSelectedFreteDetalhes(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [whatsAppModalFrete, selectedFreteDetalhes]);

  const handleDelete = async (id, numero) => {
    if (!window.confirm(`Tem certeza que deseja excluir o frete CT-e Nº ${numero || id}?`)) {
      return;
    }
    try {
      await api.delete(`/fretes/${id}`);
      loadFretes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir frete.');
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

  // Abrir DACTE Oficial
  const handleOpenDacte = async (f) => {
    try {
      const res = await api.get(`/fiscal/dacte/${f.id}`);
      setDacteModalData(res.data);
      setIsDacteOpen(true);
    } catch (err) {
      alert('Erro ao carregar DACTE: ' + (err.response?.data?.error || err.message));
    }
  };

  // Transmitir CT-e para a SEFAZ
  const handleTransmitirSefaz = async (f) => {
    setIsTransmittingSefaz(true);
    setEmissaoError('');
    setEmissaoSuccess('');
    try {
      const res = await api.post(`/fiscal/emitir/${f.id}`);
      setEmissaoSuccess(res.data.message || 'CT-e emitido e autorizado com sucesso na SEFAZ!');
      await loadFretes();
      setTimeout(async () => {
        setEmitindoFrete(null);
        await handleOpenDacte(f);
      }, 1000);
    } catch (err) {
      setEmissaoError(err.response?.data?.error || 'Erro ao transmitir para a SEFAZ.');
    } finally {
      setIsTransmittingSefaz(false);
    }
  };

  // Cancelar CT-e 4.00 na SEFAZ (Evento 110111)
  const handleConfirmarCancelamentoCte = async (e) => {
    e.preventDefault();
    if (!cteParaCancelar) return;
    if (!justificativaCte || justificativaCte.trim().length < 15) {
      setCancelamentoError('A justificativa de cancelamento deve conter no mínimo 15 caracteres (exigência fiscal SEFAZ).');
      return;
    }

    setCancelandoCte(true);
    setCancelamentoError('');
    setCancelamentoSuccess('');

    try {
      const res = await api.post(`/fiscal/cancelar/${cteParaCancelar.id}`, {
        justificativa: justificativaCte.trim()
      });

      setCancelamentoSuccess(`🎉 CT-e cancelado com sucesso na SEFAZ!\nProtocolo: ${res.data.protocolo}`);
      setTimeout(() => {
        setCteParaCancelar(null);
        setJustificativaCte('');
        setCancelamentoSuccess('');
        loadFretes();
      }, 1800);
    } catch (err) {
      setCancelamentoError(err.response?.data?.error || 'Erro ao homologar cancelamento na SEFAZ.');
    } finally {
      setCancelandoCte(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Gerador de mensagem para WhatsApp
  const gerarMensagemCliente = (f) => {
    if (!f) return '';
    const isTriangular = f.tipo_operacao === 'triangular' || !!f.numero_cte_2;
    const isAgenciamento = f.tipo_operacao === 'agenciamento_repasse' || (f.valor_frete_real > 0) || isLicencaAgenciamento;
    const totalVenda = (f.valor_frete_venda || 0) + (isTriangular ? (f.valor_frete_venda_2 || 0) : 0);
    const pesoTon1 = f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : '0.00';
    const pesoTon2 = f.peso_kg_2 ? (f.peso_kg_2 / 1000).toFixed(2) : pesoTon1;

    const freteReal = f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || 0);
    const pctComissao = f.percentual_comissao !== undefined && f.percentual_comissao !== '' ? Number(f.percentual_comissao) : 5.0;
    const valorComissao = isAgenciamento ? Number((freteReal * (pctComissao / 100)).toFixed(2)) : (f.valor_comissao || 0);
    const valorRepasse = isAgenciamento 
      ? (f.valor_repasse !== undefined && f.valor_repasse !== null && f.valor_repasse !== '' ? Number(f.valor_repasse) : Math.max(0, totalVenda - freteReal - valorComissao))
      : 0;

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

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Ação de Cadastro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Emissão de Conhecimentos (CT-e 4.00)
          </h1>
          <p className="text-xs text-slate-400">
            Emissão oficial e síncrona na SEFAZ com cálculo automático de Piso ANTT, DACTE e Repasses
          </p>
        </div>
        <button
          onClick={() => setIsEmissaoModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition transform hover:-translate-y-0.5 text-xs sm:text-sm cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Emitir CT-e Rápido</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca Responsiva */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          {/* Busca por texto */}
          <div className="sm:col-span-2 lg:col-span-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar CT-e, Motorista, Placa..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 sm:py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filtro Tipo de Operação */}
          <div>
            <select
              value={tipoOperacao}
              onChange={(e) => setTipoOperacao(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Modalidade (Todas)</option>
              <option value="padrao">1 CT-e (Padrão)</option>
              <option value="triangular">🔄 Triangular (2 CT-es)</option>
            </select>
          </div>

          {/* Filtro Status Frete */}
          <div>
            <select
              value={statusFrete}
              onChange={(e) => setStatusFrete(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Status Viagem (Todos)</option>
              <option value="em_transito">Em Trânsito</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Filtro Status Pagamento Freteiro */}
          <div>
            <select
              value={statusPagamento}
              onChange={(e) => setStatusPagamento(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Pagamento Freteiro (Todos)</option>
              <option value="pendente">A Pagar (Pendente)</option>
              <option value="adiantamento_pago">Adiantamento Pago</option>
              <option value="quitado">Quitado 100%</option>
            </select>
          </div>

          {/* Filtro Status Recebimento Cliente */}
          <div>
            <select
              value={statusRecebimento}
              onChange={(e) => setStatusRecebimento(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Faturamento (Todos)</option>
              <option value="pendente">Pendente / A Faturar</option>
              <option value="faturado">Faturado</option>
              <option value="recebido">Recebido</option>
            </select>
          </div>

        </div>
      </div>

      {/* 1. VISUALIZAÇÃO DESKTOP: TABELA ENXUTA 100% FIT (SEM BARRA DE SCROLL HORIZONTAL) */}
      <div className="hidden md:block rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-[11px] text-slate-300">
          <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-3 py-3">Documento(s)</th>
              <th className="px-3 py-3">Trajeto</th>
              <th className="px-3 py-3">Motorista / Freteiro</th>
              <th className="px-3 py-3">Tomador(es)</th>
              <th className="px-3 py-3 text-right">{isLicencaAgenciamento ? 'Total CT-e' : 'Frete Venda'}</th>
              <th className="px-3 py-3 text-right">{isLicencaAgenciamento ? 'Frete Real (Terceiro)' : 'Frete Motorista'}</th>
              <th className="px-3 py-3 text-right">{isLicencaAgenciamento ? 'Comissão (5%)' : 'Comissão (Lucro)'}</th>
              {isLicencaAgenciamento ? (
                <th className="px-3 py-3 text-right text-indigo-400">Valor de Repasse</th>
              ) : (
                <th className="px-3 py-3 text-right">Saldo Devedor</th>
              )}
              <th className="px-3 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Carregando fretes...</span>
                  </div>
                </td>
              </tr>
            ) : fretes.length > 0 ? (
              fretes.map((f) => {
                const isTriangular = f.tipo_operacao === 'triangular' || !!f.numero_cte_2;
                const isRepasse = f.tipo_operacao === 'agenciamento_repasse' || (f.valor_frete_real > 0) || isLicencaAgenciamento;
                const totalVenda = (f.valor_frete_venda || 0) + (isTriangular ? (f.valor_frete_venda_2 || 0) : 0);
                const pesoTonFisico = f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : '0.00';
                const vReal = f.valor_frete_real > 0 ? f.valor_frete_real : f.valor_frete_compra;
                const vRepasse = f.valor_repasse || Math.max(0, totalVenda - vReal - (f.valor_comissao || 0));

                return (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    
                    {/* Documentos Fiscais */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleOpenDacte(f)}
                          className={`font-bold font-mono text-xs hover:underline flex items-center gap-1 cursor-pointer ${
                            f.status_sefaz === 'cancelado' ? 'text-rose-400 line-through' : 'text-indigo-400 hover:text-indigo-300'
                          }`}
                          title="Clique para abrir e imprimir o DACTE"
                        >
                          <FileText className="h-3 w-3 inline text-indigo-400" />
                          <span>CT-e {f.numero_cte || 'S/N'}</span>
                        </button>
                        {f.status_sefaz === 'cancelado' && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black inline-flex items-center gap-0.5">
                            <Ban className="h-2.5 w-2.5" />
                            <span>CANCELADO</span>
                          </span>
                        )}
                        {isRepasse && f.status_sefaz !== 'cancelado' && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-black">
                            5% REPASSE
                          </span>
                        )}
                        {isTriangular && (
                          <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold">
                            + CT-e {f.numero_cte_2 || '2'}
                          </span>
                        )}
                      </div>
                      {f.nfe_referencia && (
                        <p className="text-[10px] text-indigo-400 font-medium truncate max-w-[130px]">
                          {f.nfe_referencia}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        {f.data_emissao ? new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </td>

                    {/* Trajeto Único */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 font-semibold text-slate-200">
                        <span>{f.origem_cidade}/{f.origem_uf}</span>
                        <span className="text-slate-500">➔</span>
                        <span>{f.destino_cidade}/{f.destino_uf}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {pesoTonFisico}t • {f.tipo_carga || 'Carga Geral'}
                      </p>
                    </td>

                    {/* Motorista / Freteiro & Placas & PIX */}
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-indigo-300 truncate max-w-[140px]">{f.motorista_nome}</p>
                      <p className="text-[10px] font-mono text-slate-400 font-bold">
                        {f.placa_veiculo || 'S/N'} {f.placa_carreta ? `/ ${f.placa_carreta}` : ''}
                      </p>
                    </td>

                    {/* Clientes / Tomadores */}
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-200 truncate max-w-[140px]">{f.cliente_nome}</p>
                      {isTriangular && f.cliente_nome_2 && f.cliente_nome_2 !== f.cliente_nome && (
                        <p className="text-[10px] text-indigo-300 truncate max-w-[140px]">
                          + {f.cliente_nome_2}
                        </p>
                      )}
                    </td>

                    {/* Frete Venda / CT-e Total */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className={`font-black font-mono text-xs ${f.status_sefaz === 'cancelado' ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {formatMoney(totalVenda)}
                      </span>
                    </td>

                    {/* Frete Real / Compra */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                      <span className="font-bold text-emerald-400 text-xs">{formatMoney(vReal)}</span>
                    </td>

                    {/* Comissão */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className="font-bold text-purple-400 block font-mono text-xs">{formatMoney(f.valor_comissao)}</span>
                      <span className="text-[9px] text-slate-400">({f.percentual_comissao || 5}%)</span>
                    </td>

                    {/* Repasse ou Saldo */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                      {isRepasse ? (
                        <span className="font-black text-indigo-400 text-xs bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                          {formatMoney(vRepasse)}
                        </span>
                      ) : (
                        <span className={`font-bold ${f.valor_saldo_motorista > 0 ? 'text-amber-400 text-xs' : 'text-slate-500'}`}>
                          {formatMoney(f.valor_saldo_motorista)}
                        </span>
                      )}
                    </td>

                    {/* BARRA DE AÇÕES RÁPIDAS (COMPACTA) */}
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* 1. Olho (Visualizar Detalhes) */}
                        <button
                          onClick={() => handleOpenDetalhes(f)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="👁️ Visualizar Detalhes do Frete"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* 2. DACTE Oficial CT-e 4.00 */}
                        <button
                          onClick={() => handleOpenDacte(f)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] font-bold transition shadow-sm cursor-pointer"
                          title="📄 Visualizar e Imprimir DACTE Oficial"
                        >
                          <FileText className="h-3.5 w-3.5 text-indigo-400" />
                          <span>DACTE</span>
                        </button>

                        {/* 3. Emitir CT-e na SEFAZ (se não emitido / rascunho) */}
                        {f.status_sefaz !== 'autorizado' && f.status_sefaz !== 'cancelado' && (
                          <button
                            onClick={() => {
                              setEmitindoFrete(f);
                              setEmissaoError('');
                              setEmissaoSuccess('');
                            }}
                            className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                            title="🚀 Transmitir CT-e 4.00 para a SEFAZ"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* 4. Carta de Correção Eletrônica (CC-e) na SEFAZ (se autorizado) */}
                        {f.status_sefaz === 'autorizado' && (
                          <button
                            onClick={() => setCceFrete(f)}
                            className="p-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                            title="📝 Emitir Carta de Correção Eletrônica (CC-e) na SEFAZ"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* 5. Cancelar CT-e 4.00 Oficial na SEFAZ (se autorizado) */}
                        {f.status_sefaz === 'autorizado' && (
                          <button
                            onClick={() => {
                              setCteParaCancelar(f);
                              setJustificativaCte('');
                              setCancelamentoError('');
                              setCancelamentoSuccess('');
                            }}
                            className="p-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                            title="🚫 Cancelar CT-e 4.00 Oficial na SEFAZ"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* 5. Canhoto Digital / POD */}
                        <button
                          onClick={() => setCanhotoModalFrete(f)}
                          className={`p-1 rounded-lg border transition cursor-pointer ${
                            f.canhoto_status === 'aprovado'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : f.canhoto_foto_url
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="📷 Canhoto Digital / Comprovante de Entrega"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>

                        {/* 6. Impressora (Recibo / PDF) */}
                        <button
                          onClick={() => onOpenRecibo(f)}
                          className="p-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                          title="🖨️ Imprimir Recibo"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {/* 7. WhatsApp Comercial para o Cliente */}
                        <button
                          onClick={() => {
                            setWhatsAppModalFrete(f);
                            setCopiedWhatsApp(false);
                          }}
                          className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                          title="💬 WhatsApp Comercial para o Cliente"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>

                        {/* 8. Editar Frete */}
                        <button
                          onClick={() => onEditFrete(f)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                          title="✏️ Editar Frete"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        {/* 9. Excluir Frete (Admin) */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(f.id, f.numero_cte)}
                            className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer"
                            title="❌ Excluir Frete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  Nenhum frete encontrado com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2. VISUALIZAÇÃO MOBILE (CARDS DE FRETE PARA CELULAR) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Carregando fretes...</span>
          </div>
        ) : fretes.length > 0 ? (
          fretes.map((f) => {
            const isTriangular = f.tipo_operacao === 'triangular' || !!f.numero_cte_2;
            const totalVenda = (f.valor_frete_venda || 0) + (isTriangular ? (f.valor_frete_venda_2 || 0) : 0);
            const pesoTonFisico = f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : '0.00';

            return (
              <div key={f.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
                
                {/* Header Card */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white font-mono text-sm">CT-e {f.numero_cte || 'S/N'}</span>
                      {isTriangular && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold">
                          + CT-e {f.numero_cte_2 || '2'}
                        </span>
                      )}
                    </div>
                    {f.nfe_referencia && (
                      <p className="text-[10px] text-blue-400 font-medium mt-0.5">{f.nfe_referencia}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {f.data_emissao ? new Date(f.data_emissao).toLocaleDateString('pt-BR') : '-'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {formatMoney(totalVenda)}
                    </span>
                  </div>
                </div>

                {/* Trajeto e Carga */}
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-blue-400" />
                      {f.origem_cidade}/{f.origem_uf} ➔ {f.destino_cidade}/{f.destino_uf}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{pesoTonFisico}t</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>Tomador:</strong> {f.cliente_nome} {isTriangular && f.cliente_nome_2 ? `+ ${f.cliente_nome_2}` : ''}
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Motorista: <strong className="text-blue-300">{f.motorista_nome}</strong></span>
                    <span className="font-mono font-bold text-slate-300">{f.placa_veiculo || 'S/N'}</span>
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Sua Comissão:</span>
                    <span className="font-bold text-emerald-400 font-mono">{formatMoney(f.valor_comissao)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Saldo Freteiro:</span>
                    <span className={`font-bold font-mono ${f.valor_saldo_motorista > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {formatMoney(f.valor_saldo_motorista)}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação para Celular */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    onClick={() => handleOpenDetalhes(f)}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                  >
                    <Eye className="h-4 w-4 text-blue-400" />
                    <span>Ver</span>
                  </button>

                  <button
                    onClick={() => handleOpenDacte(f)}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30"
                  >
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span>DACTE</span>
                  </button>

                  <button
                    onClick={() => {
                      setWhatsAppModalFrete(f);
                      setCopiedWhatsApp(false);
                    }}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Whats</span>
                  </button>

                  <button
                    onClick={() => onEditFrete(f)}
                    className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-800 text-amber-300 text-xs font-semibold"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* Ações Fiscais SEFAZ Mobile (CC-e e Cancelar) */}
                {f.status_sefaz === 'autorizado' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => setCceFrete(f)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition cursor-pointer"
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                      <span>Carta Correção (CC-e)</span>
                    </button>
                    <button
                      onClick={() => {
                        setCteParaCancelar(f);
                        setJustificativaCte('');
                        setCancelamentoError('');
                        setCancelamentoSuccess('');
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Cancelar SEFAZ</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
            Nenhum frete encontrado.
          </div>
        )}
      </div>

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
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">Informativo para o Cliente</h3>
                  <p className="text-[10px] text-slate-400">Sem custos internos de motorista ou margem</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModalFrete(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
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
                  Enviar Direto para o WhatsApp do Cliente (Opcional):
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
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
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
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Fechar
                </button>
                
                <button
                  onClick={handleCopiarWhatsAppCliente}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
                >
                  {copiedWhatsApp ? <Check className="h-4 w-4 text-emerald-200" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedWhatsApp ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Drawer / Modal de Detalhes do Frete */}
      {selectedFreteDetalhes && (
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
                  Detalhes do Frete {selectedFreteDetalhes.tipo_operacao === 'triangular' ? 'Triangular' : `CT-e Nº ${selectedFreteDetalhes.numero_cte || 'S/N'}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFreteDetalhes(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Box dos CT-es */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                <div>
                  <p className="text-slate-400 font-semibold uppercase">
                    {selectedFreteDetalhes.tipo_operacao === 'triangular' ? 'CT-e 1 (Remessa)' : 'Documento Fiscal'}
                  </p>
                  <p className="text-sm font-bold text-white mt-1">CT-e Nº {selectedFreteDetalhes.numero_cte || 'S/N'}</p>
                  <p className="text-slate-400 mt-1"><strong>Tomador 1:</strong> {selectedFreteDetalhes.cliente_nome}</p>
                  <p className="text-slate-400"><strong>Venda 1:</strong> {formatMoney(selectedFreteDetalhes.valor_frete_venda)}</p>
                </div>
                
                {selectedFreteDetalhes.tipo_operacao === 'triangular' ? (
                  <div>
                    <p className="text-indigo-400 font-semibold uppercase">CT-e 2 (Venda Triangular)</p>
                    <p className="text-sm font-bold text-white mt-1">CT-e Nº {selectedFreteDetalhes.numero_cte_2 || 'S/N'}</p>
                    <p className="text-slate-400 mt-1"><strong>Tomador 2:</strong> {selectedFreteDetalhes.cliente_nome_2 || selectedFreteDetalhes.cliente_nome}</p>
                    <p className="text-slate-400"><strong>Venda 2:</strong> {formatMoney(selectedFreteDetalhes.valor_frete_venda_2)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-400 font-semibold uppercase">Carga & Trajeto</p>
                    <p className="text-slate-200 mt-1"><strong>Rota:</strong> {selectedFreteDetalhes.origem_cidade}/{selectedFreteDetalhes.origem_uf} ➔ {selectedFreteDetalhes.destino_cidade}/{selectedFreteDetalhes.destino_uf}</p>
                    <p className="text-slate-400"><strong>Carga:</strong> {selectedFreteDetalhes.tipo_carga || 'Carga Geral'}</p>
                  </div>
                )}
              </div>

              {/* Demonstrativo Financeiro do Frete */}
              {selectedFreteDetalhes.tipo_operacao === 'agenciamento_repasse' || selectedFreteDetalhes.valor_frete_real > 0 ? (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white uppercase text-xs">Metodologia: Agenciamento & Repasse (Comissão 5%)</p>
                    <span className="font-mono text-xs text-indigo-300 font-bold">
                      CT-e: {formatMoney(selectedFreteDetalhes.valor_frete_venda)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">1. Frete Real (Freteiro)</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                        {formatMoney(selectedFreteDetalhes.valor_frete_real || selectedFreteDetalhes.valor_frete_compra)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-purple-300 text-[10px] uppercase font-semibold">2. Sua Comissão ({selectedFreteDetalhes.percentual_comissao || 5}%)</p>
                      <p className="text-sm font-bold text-purple-400 mt-0.5 font-mono">
                        {formatMoney(selectedFreteDetalhes.valor_comissao)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/40">
                      <p className="text-indigo-300 text-[10px] uppercase font-semibold">3. Valor de Repasse</p>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5 font-mono">
                        {formatMoney(selectedFreteDetalhes.valor_repasse || Math.max(0, selectedFreteDetalhes.valor_frete_venda - (selectedFreteDetalhes.valor_frete_real || selectedFreteDetalhes.valor_frete_compra) - selectedFreteDetalhes.valor_comissao))}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <p><strong>Freteiro:</strong> {selectedFreteDetalhes.motorista_nome} • <strong>Veículo:</strong> {selectedFreteDetalhes.placa_veiculo || 'S/N'}</p>
                    {selectedFreteDetalhes.pix_chave && (
                      <p className="text-emerald-400 font-mono">
                        <strong>Chave PIX:</strong> {selectedFreteDetalhes.pix_chave} ({selectedFreteDetalhes.pix_tipo || 'CPF'})
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
                  <p className="font-bold text-white uppercase text-xs">Fechamento Financeiro da Subcontratação</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-slate-400">Venda Total Cobrada</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {formatMoney((selectedFreteDetalhes.valor_frete_venda || 0) + (selectedFreteDetalhes.tipo_operacao === 'triangular' ? (selectedFreteDetalhes.valor_frete_venda_2 || 0) : 0))}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-slate-400">Frete Único Motorista</p>
                      <p className="text-sm font-bold text-indigo-300 mt-0.5">{formatMoney(selectedFreteDetalhes.valor_frete_compra)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                      <p className="text-emerald-400">Sua Comissão Líquida</p>
                      <p className="text-sm font-bold text-emerald-300 mt-0.5">
                        {formatMoney(selectedFreteDetalhes.valor_comissao)} ({selectedFreteDetalhes.percentual_margem?.toFixed(1)}%)
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                    <p>Adiantamento: <strong>{formatMoney(selectedFreteDetalhes.valor_adiantamento)}</strong></p>
                    <p>Pedágio/Desc: <strong>{formatMoney((selectedFreteDetalhes.valor_pedagio || 0) + (selectedFreteDetalhes.valor_combustivel || 0))}</strong></p>
                    <p>Saldo Devedor: <strong className="text-amber-400">{formatMoney(selectedFreteDetalhes.valor_saldo_motorista)}</strong></p>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    const f = selectedFreteDetalhes;
                    setSelectedFreteDetalhes(null);
                    handleOpenDacte(f);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  <FileText className="h-4 w-4" />
                  <span>DACTE Fiscal</span>
                </button>
                <button
                  onClick={() => {
                    const f = selectedFreteDetalhes;
                    setSelectedFreteDetalhes(null);
                    onOpenRecibo(f);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Recibo</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EMISSÃO FISCAL CT-E 4.00 SEFAZ */}
      {emitindoFrete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isTransmittingSefaz) setEmitindoFrete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
                <div>
                  <h3 className="font-heading font-bold text-base text-white">Emissão Fiscal de CT-e na SEFAZ</h3>
                  <p className="text-xs text-slate-400">Protocolo Síncrono CT-e 4.00</p>
                </div>
              </div>
              {!isTransmittingSefaz && (
                <button 
                  onClick={() => setEmitindoFrete(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {emissaoSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>{emissaoSuccess}</span>
              </div>
            )}

            {emissaoError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span>{emissaoError}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-slate-300">
                <span>Documento:</span>
                <strong className="text-white font-mono">CT-e Nº {emitindoFrete.numero_cte || 'Novo'}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Tomador / Pagador:</span>
                <strong className="text-white truncate max-w-[200px]">{emitindoFrete.cliente_nome}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Trajeto:</span>
                <strong className="text-slate-200">{emitindoFrete.origem_cidade}/{emitindoFrete.origem_uf} ➔ {emitindoFrete.destino_cidade}/{emitindoFrete.destino_uf}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Motorista / Veículo:</span>
                <strong className="text-slate-200">{emitindoFrete.motorista_nome} ({emitindoFrete.placa_veiculo || 'S/N'})</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="font-bold text-white uppercase">Valor do Frete CT-e:</span>
                <strong className="text-emerald-400 font-mono text-sm">{formatMoney(emitindoFrete.valor_frete_venda)}</strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-start gap-2">
              <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Ao confirmar, o SisFrete Pro montará a árvore XML 4.00, assinará digitalmente com o Certificado A1 e enviará diretamente ao WebService da SEFAZ para autorização em tempo real.
              </span>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isTransmittingSefaz}
                onClick={() => setEmitindoFrete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isTransmittingSefaz}
                onClick={() => handleTransmitirSefaz(emitindoFrete)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer"
              >
                {isTransmittingSefaz ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitindo para SEFAZ...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Confirmar & Transmitir SEFAZ</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE CANCELAMENTO OFICIAL DE CT-E 4.00 NA SEFAZ */}
      {cteParaCancelar && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !cancelandoCte) setCteParaCancelar(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-rose-600/50 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">Cancelar CT-e na SEFAZ</h3>
                  <p className="text-xs text-slate-400">Evento 110111 - Cancelamento Homologado</p>
                </div>
              </div>
              {!cancelandoCte && (
                <button 
                  onClick={() => setCteParaCancelar(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {cancelamentoSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>{cancelamentoSuccess}</span>
              </div>
            )}

            {cancelamentoError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span>{cancelamentoError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>CT-e Nº:</span>
                <strong className="text-white font-mono">CT-e {cteParaCancelar.numero_cte || 'S/N'} (Série {cteParaCancelar.serie_cte || '1'})</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Tomador / Pagador:</span>
                <strong className="text-white truncate max-w-[220px]">{cteParaCancelar.cliente_nome}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Valor Total CT-e:</span>
                <strong className="text-emerald-400 font-mono">{formatMoney(cteParaCancelar.valor_frete_venda)}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Protocolo SEFAZ:</span>
                <strong className="text-blue-300 font-mono text-[11px]">{cteParaCancelar.protocolo_sefaz || 'Autorizado'}</strong>
              </div>
              <div className="pt-1 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono truncate">
                  Chave: {cteParaCancelar.chave_cte_44 || cteParaCancelar.chave_cte || 'N/A'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmarCancelamentoCte} className="space-y-3">
              <div>
                <label className="block text-slate-200 text-xs font-semibold mb-1">
                  Justificativa do Cancelamento <span className="text-rose-400">*</span>
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    (Mínimo 15 caracteres - Atual: {justificativaCte.length})
                  </span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={justificativaCte}
                  onChange={(e) => setJustificativaCte(e.target.value)}
                  placeholder="Ex: Carga cancelada pelo embarcador antes do início do transporte..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Atenção Fiscal:</strong> O cancelamento de CT-e deve ser realizado no prazo regulamentar legal (até 7 dias / 168 horas) desde que não tenha sido emitido MDF-e vinculado ou iniciada a prestação.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={cancelandoCte}
                  onClick={() => setCteParaCancelar(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={cancelandoCte || justificativaCte.trim().length < 15}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {cancelandoCte ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmitindo Cancelamento SEFAZ...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4" />
                      <span>Confirmar Cancelamento na SEFAZ</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL DACTE EMISSÃO OFICIAL PDF */}
      <DacteModal
        isOpen={isDacteOpen}
        onClose={() => setIsDacteOpen(false)}
        dacteData={dacteModalData}
      />

      {/* MODAL CANHOTO DIGITAL AUDITORIA */}
      <CanhotoAuditModal
        isOpen={!!canhotoModalFrete}
        onClose={() => setCanhotoModalFrete(null)}
        frete={canhotoModalFrete}
        onUpdated={loadFretes}
      />

      {/* MODAL DE EMISSÃO RÁPIDA DE CT-E 4.00 (POUCOS CLIQUES) */}
      <EmissaoCteModal
        isOpen={isEmissaoModalOpen}
        onClose={() => setIsEmissaoModalOpen(false)}
        onSuccess={loadFretes}
        onOpenDacte={(dacteData) => {
          setDacteModalData(dacteData);
          setIsDacteOpen(true);
        }}
      />

      {/* MODAL CARTA DE CORREÇÃO ELETRÔNICA (CC-e) CT-e 4.00 */}
      <CartaCorrecaoModal
        isOpen={!!cceFrete}
        onClose={() => setCceFrete(null)}
        frete={cceFrete}
        onSuccess={loadFretes}
      />

    </div>
  );
}
