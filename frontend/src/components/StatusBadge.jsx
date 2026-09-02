import React from 'react';

export function StatusFreteBadge({ status }) {
  const configs = {
    em_transito: { label: 'Em Trânsito', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    entregue: { label: 'Entregue', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    cancelado: { label: 'Cancelado', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  };

  const current = configs[status] || { label: status || 'Desconhecido', bg: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {current.label}
    </span>
  );
}

export function StatusPagamentoBadge({ status, percentual }) {
  const configs = {
    pendente: { label: 'A Pagar', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    adiantamento_pago: { label: 'Adiantamento Pago', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    parcial: { label: 'Parcialmente Pago', bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    quitado: { label: 'Quitado 100%', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    pago: { label: 'Quitado 100%', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  };

  const current = configs[status] || { label: status || 'Pendente', bg: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg}`}>
      {current.label}
    </span>
  );
}

export function StatusRecebimentoBadge({ status }) {
  const configs = {
    pendente: { label: 'A Faturar / Pendente', bg: 'bg-slate-700/60 text-slate-300 border-slate-600' },
    faturado: { label: 'Faturado', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    parcial: { label: 'Parcialmente Recebido', bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    recebido: { label: 'Recebido 100%', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    pago: { label: 'Recebido 100%', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  };

  const current = configs[status] || { label: status || 'Pendente', bg: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg}`}>
      {current.label}
    </span>
  );
}
