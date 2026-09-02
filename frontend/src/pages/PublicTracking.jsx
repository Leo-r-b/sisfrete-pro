import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Building2
} from 'lucide-react';
import api from '../services/api';

export default function PublicTracking() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const t = pathParts[pathParts.length - 1];
    setToken(t);

    if (t) {
      api.get(`/public/rastreio/${t}`)
        .then(res => {
          setData(res.data);
        })
        .catch(err => {
          setError('Código de rastreamento não encontrado ou carga inexistente.');
        })
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Localizando informações da carga...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white text-center space-y-3">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Rastreamento Não Localizado</h2>
        <p className="text-xs text-slate-400 max-w-sm">{error}</p>
      </div>
    );
  }

  const { frete, eventos = [] } = data || {};

  const getStatusBadge = (st) => {
    if (st === 'entregue') {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Entrega Concluída ✅</span>;
    }
    if (st === 'em_transito') {
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">🚚 Em Trânsito na Rodovia</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">⏳ Aguardando Coleta</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      
      {/* Header do Rastreamento */}
      <div className="text-center space-y-1 pt-2">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-2">
          <Truck className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-white font-heading">Rastreamento de Transporte em Tempo Real</h1>
        <p className="text-xs text-slate-400">{frete.empresa_nome || 'SisFrete Pro'}</p>
      </div>

      {/* Card da Carga & Status */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Documento de Frete</span>
            <strong className="text-sm font-bold text-white font-mono">CT-e Nº {frete.numero_cte || 'S/N'}</strong>
          </div>
          <div>
            {getStatusBadge(frete.status_frete)}
          </div>
        </div>

        {/* Trajeto */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-200">
            <span className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span>{frete.origem_cidade}/{frete.origem_uf}</span>
            </span>
            <span className="text-slate-500">➔</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <MapPin className="h-4 w-4" />
              <span>{frete.destino_cidade}/{frete.destino_uf}</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-slate-850">
            <div>Carga: <strong className="text-slate-200">{frete.tipo_carga || 'Carga Geral'}</strong></div>
            <div>Peso: <strong className="text-slate-200">{frete.peso_kg ? (frete.peso_kg/1000).toFixed(2) : '0'} ton</strong></div>
          </div>
        </div>
      </div>

      {/* Linha do Tempo de Eventos / Checkpoints */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
        <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <span>Histórico de Checkpoints & Ocorrências</span>
        </h3>

        {eventos.length > 0 ? (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800 pl-8">
            {eventos.map((ev, i) => (
              <div key={ev.id || i} className="relative space-y-1">
                <div className="absolute -left-8 top-0.5 w-7 h-7 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-300">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="flex justify-between items-center">
                  <strong className="text-white text-xs">{ev.descricao}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {ev.data_hora ? new Date(ev.data_hora).toLocaleString('pt-BR') : '-'}
                  </span>
                </div>
                {ev.cidade && (
                  <p className="text-[11px] text-blue-400 font-semibold">
                    📍 {ev.cidade}/{ev.uf || 'PR'}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">Carga coletada e viagem em andamento.</p>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-600 pb-4">
        SisFrete Pro • Torre de Rastreamento Logístico
      </div>

    </div>
  );
}
