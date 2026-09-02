import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Copy, 
  Check, 
  Eye, 
  PlusCircle, 
  Calendar,
  Layers,
  Send,
  X,
  Repeat,
  ArrowRight,
  ArrowLeft,
  GripVertical
} from 'lucide-react';
import api from '../services/api';

export default function TorreControle() {
  const [data, setData] = useState({ kanban: { agendado: [], em_transito: [], entregue: [] }, totalViagens: 0, emTransitoCount: 0, entreguesCount: 0 });
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Modal de Checkpoint / Evento
  const [selectedFrete, setSelectedFrete] = useState(null);
  const [eventoData, setEventoData] = useState({
    status: 'em_transito',
    descricao: '',
    cidade: '',
    uf: 'PR'
  });
  const [savingEvento, setSavingEvento] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const loadTorre = async () => {
    try {
      setLoading(true);
      const res = await api.get('/torre-controle');
      setData(res.data);
    } catch (err) {
      console.error('Erro na Torre de Controle:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTorre();
  }, []);

  const handleCopyTrackingLink = (f) => {
    const link = `${window.location.origin}/rastreio/${f.rastreamento_token || f.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(f.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleMoverStatus = async (id, novoStatus) => {
    // Atualização otimista no estado local
    setData(prev => {
      let movedItem = null;
      const newKanban = { agendado: [], em_transito: [], entregue: [] };

      Object.keys(prev.kanban).forEach(col => {
        prev.kanban[col].forEach(item => {
          if (item.id === id) {
            movedItem = { ...item, status_frete: novoStatus };
          } else {
            newKanban[col].push(item);
          }
        });
      });

      if (movedItem && newKanban[novoStatus]) {
        newKanban[novoStatus].unshift(movedItem);
      }

      return {
        ...prev,
        kanban: newKanban,
        emTransitoCount: newKanban.em_transito.length,
        entreguesCount: newKanban.entregue.length
      };
    });

    try {
      await api.post('/torre-controle/mover', { id, novo_status: novoStatus });
      loadTorre();
    } catch (err) {
      console.error('Erro ao mover viagem:', err);
      alert(err.response?.data?.error || 'Erro ao mover status da viagem.');
      loadTorre();
    }
  };

  // Handlers de Drag and Drop
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== col) {
      setDragOverColumn(col);
    }
  };

  const handleDragLeave = (e, col) => {
    if (dragOverColumn === col) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, col) => {
    e.preventDefault();
    setDragOverColumn(null);
    const idStr = e.dataTransfer.getData('text/plain') || String(draggedId);
    const id = Number(idStr);
    setDraggedId(null);

    if (id && col) {
      handleMoverStatus(id, col);
    }
  };

  const handleSaveEvento = async (e) => {
    e.preventDefault();
    if (!selectedFrete) return;
    setSavingEvento(true);

    try {
      await api.post(`/fretes/${selectedFrete.id}/rastreamento`, eventoData);
      setSelectedFrete(null);
      loadTorre();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar checkpoint.');
    } finally {
      setSavingEvento(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Renderizar Cartão da Viagem
  const renderCard = (f, currentStatus) => {
    const isTriangular = f.is_triangular || f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
    const v1 = Number(f.valor_frete_venda || 0);
    const v2 = isTriangular ? Number(f.valor_frete_venda_2 || 0) : 0;
    const vTot = v1 + v2;

    return (
      <div 
        key={f.id}
        draggable
        onDragStart={(e) => handleDragStart(e, f.id)}
        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs hover:border-blue-500/60 transition shadow-md cursor-grab active:cursor-grabbing group relative"
      >
        {/* Header do Cartão */}
        <div className="flex justify-between items-start gap-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <GripVertical className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
            <div className="min-w-0">
              {isTriangular ? (
                <div>
                  <span className="font-bold text-indigo-300 font-mono text-[11px] block">
                    CT-e 1 Nº {f.numero_cte || 'S/N'} + 2 Nº {f.numero_cte_2 || 'S/N'}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold inline-block mt-0.5">
                    🔄 Triangular (2 CT-es)
                  </span>
                </div>
              ) : (
                <span className="font-bold text-white font-mono text-xs">
                  CT-e Nº {f.numero_cte || 'S/N'}
                </span>
              )}
            </div>
          </div>
          <span className="text-emerald-400 font-mono font-bold text-xs shrink-0">
            {formatMoney(vTot)}
          </span>
        </div>

        {/* Tomador(es) */}
        <div className="text-[11px]">
          {isTriangular ? (
            <div className="space-y-0.5 text-slate-300">
              <p className="truncate" title={f.cliente_nome}>1. {f.cliente_nome}</p>
              <p className="truncate text-slate-400" title={f.cliente_nome_2 || f.cliente_nome}>2. {f.cliente_nome_2 || f.cliente_nome}</p>
            </div>
          ) : (
            <p className="text-slate-300 truncate" title={f.cliente_nome}>{f.cliente_nome}</p>
          )}
        </div>

        {/* Rota & Carga */}
        <p className="text-[11px] text-slate-300 flex items-center gap-1">
          <MapPin className={`h-3 w-3 shrink-0 ${
            currentStatus === 'agendado' ? 'text-amber-400' : currentStatus === 'em_transito' ? 'text-blue-400' : 'text-emerald-400'
          }`} />
          <span className="font-medium">{f.origem_cidade}/{f.origem_uf} ➔ {f.destino_cidade}/{f.destino_uf}</span>
        </p>

        {/* Motorista & Placa */}
        <div className="text-[10px] text-slate-400 flex justify-between items-center border-t border-slate-850 pt-1.5">
          <span className="text-blue-300 truncate max-w-[130px] font-medium">{f.motorista_nome}</span>
          <span className="font-mono text-slate-300">{f.placa_veiculo || 'S/N'}</span>
        </div>

        {/* Ações e Movimentação Rápida */}
        <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] gap-1">
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCopyTrackingLink(f)}
              className="flex items-center gap-1 p-1 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Copiar link público de rastreamento"
            >
              {copiedId === f.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className="h-3 w-3" />}
              <span className="hidden sm:inline">{copiedId === f.id ? 'Copiado!' : 'Rastreio'}</span>
            </button>

            <button
              onClick={() => {
                setSelectedFrete(f);
                setEventoData({ 
                  status: currentStatus, 
                  descricao: currentStatus === 'em_transito' ? 'Em trânsito regular' : '', 
                  cidade: currentStatus === 'entregue' ? f.destino_cidade : f.origem_cidade, 
                  uf: currentStatus === 'entregue' ? f.destino_uf : f.origem_uf 
                });
              }}
              className="p-1 px-1.5 rounded bg-slate-900 border border-slate-700 text-blue-400 hover:bg-blue-600 hover:text-white transition cursor-pointer font-semibold"
              title="Registrar Checkpoint / Ocorrência"
            >
              + Checkpoint
            </button>
          </div>

          {/* Botões de Transição Rápida */}
          <div className="flex items-center gap-1">
            {currentStatus === 'agendado' && (
              <button
                onClick={() => handleMoverStatus(f.id, 'em_transito')}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition cursor-pointer shadow"
                title="Iniciar Viagem / Mover para Em Trânsito"
              >
                <span>Iniciar</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}

            {currentStatus === 'em_transito' && (
              <>
                <button
                  onClick={() => handleMoverStatus(f.id, 'agendado')}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                  title="Voltar para Aguardando Coleta"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleMoverStatus(f.id, 'entregue')}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer shadow"
                  title="Concluir Entrega no Destino"
                >
                  <span>Entregue</span>
                  <Check className="h-3 w-3" />
                </button>
              </>
            )}

            {currentStatus === 'entregue' && (
              <button
                onClick={() => handleMoverStatus(f.id, 'em_transito')}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white font-semibold text-[10px] transition cursor-pointer"
                title="Reabrir Viagem / Voltar para Em Trânsito"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Reabrir</span>
              </button>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Header da Torre de Controle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">Torre de Controle de Viagens</h1>
          <p className="text-xs text-slate-400">
            Acompanhamento operacional em tempo real, arrastar e soltar (Drag & Drop) e links públicos de rastreamento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold font-mono">
            {data.emTransitoCount || 0} Viagens em Trânsito
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
            {data.entreguesCount || 0} Entregues (Últimas 24h)
          </div>
        </div>
      </div>

      {/* KANBAN OPERACIONAL INTERATIVO COM DRAG AND DROP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Coluna 1: Agendados / Coleta */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'agendado')}
          onDragLeave={(e) => handleDragLeave(e, 'agendado')}
          onDrop={(e) => handleDrop(e, 'agendado')}
          className={`p-4 rounded-3xl bg-slate-900 border space-y-3 flex flex-col min-h-[520px] transition ${
            dragOverColumn === 'agendado' 
              ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20' 
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Aguardando Coleta</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono font-bold">
              {data.kanban?.agendado?.length || 0}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            {data.kanban?.agendado?.length > 0 ? (
              data.kanban.agendado.map((f) => renderCard(f, 'agendado'))
            ) : (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800/60 rounded-2xl text-slate-600 text-xs text-center p-4">
                Nenhuma viagem aguardando coleta.<br />Arraste um cartão aqui.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2: Em Trânsito */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'em_transito')}
          onDragLeave={(e) => handleDragLeave(e, 'em_transito')}
          onDrop={(e) => handleDrop(e, 'em_transito')}
          className={`p-4 rounded-3xl bg-slate-900 border space-y-3 flex flex-col min-h-[520px] transition ${
            dragOverColumn === 'em_transito' 
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
              : 'border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="h-4 w-4" />
              <span>Em Trânsito na Rodovia</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold">
              {data.kanban?.em_transito?.length || 0}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            {data.kanban?.em_transito?.length > 0 ? (
              data.kanban.em_transito.map((f) => renderCard(f, 'em_transito'))
            ) : (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800/60 rounded-2xl text-slate-600 text-xs text-center p-4">
                Nenhuma viagem em trânsito.<br />Arraste um cartão aqui.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Entregues / Concluídas (Expira após 24h) */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'entregue')}
          onDragLeave={(e) => handleDragLeave(e, 'entregue')}
          onDrop={(e) => handleDrop(e, 'entregue')}
          className={`p-4 rounded-3xl bg-slate-900 border space-y-3 flex flex-col min-h-[520px] transition ${
            dragOverColumn === 'entregue' 
              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' 
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Entregues no Destino</span>
              </span>
              <span className="text-[9px] text-slate-500 block">Exibição das últimas 24h</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              {data.kanban?.entregue?.length || 0}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            {data.kanban?.entregue?.length > 0 ? (
              data.kanban.entregue.map((f) => renderCard(f, 'entregue'))
            ) : (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800/60 rounded-2xl text-slate-600 text-xs text-center p-4">
                Nenhuma entrega nas últimas 24h.<br />Arraste um cartão aqui para concluir.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE ADICIONAR CHECKPOINT NA VIAGEM */}
      {selectedFrete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-blue-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <MapPin className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  Registrar Checkpoint (CT-e {selectedFrete.numero_cte} {selectedFrete.numero_cte_2 ? `+ ${selectedFrete.numero_cte_2}` : ''})
                </h3>
              </div>
              <button onClick={() => setSelectedFrete(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvento} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status da Carga*</label>
                <select
                  value={eventoData.status}
                  onChange={(e) => setEventoData({ ...eventoData, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="agendado">Aguardando Coleta / Carregamento</option>
                  <option value="em_transito">Em Trânsito na Rodovia</option>
                  <option value="entregue">Entrega Concluída no Destino</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição da Ocorrência / Posição*</label>
                <input
                  type="text"
                  required
                  value={eventoData.descricao}
                  onChange={(e) => setEventoData({ ...eventoData, descricao: e.target.value })}
                  placeholder="Ex: Passando pelo posto fiscal em Ourinhos/SP, previsão de entrega amanhã às 08h"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Cidade Atual</label>
                  <input
                    type="text"
                    value={eventoData.cidade}
                    onChange={(e) => setEventoData({ ...eventoData, cidade: e.target.value })}
                    placeholder="Ex: Ponta Grossa"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={eventoData.uf}
                    onChange={(e) => setEventoData({ ...eventoData, uf: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedFrete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingEvento}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEvento ? 'Salvando...' : 'Salvar Checkpoint'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
