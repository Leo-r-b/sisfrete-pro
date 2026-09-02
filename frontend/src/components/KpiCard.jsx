import React from 'react';

export default function KpiCard({ title, value, subtext, icon: Icon, color = 'blue', trend }) {
  const colorMap = {
    blue: 'from-blue-600/20 to-blue-500/5 text-blue-400 border-blue-500/20 group-hover:border-blue-500/40',
    emerald: 'from-emerald-600/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40',
    amber: 'from-amber-600/20 to-amber-500/5 text-amber-400 border-amber-500/20 group-hover:border-amber-500/40',
    cyan: 'from-cyan-600/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20 group-hover:border-cyan-500/40',
    rose: 'from-rose-600/20 to-rose-500/5 text-rose-400 border-rose-500/20 group-hover:border-rose-500/40',
    indigo: 'from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/40',
  };

  const iconBgMap = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    rose: 'bg-rose-500/20 text-rose-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b p-5 shadow-lg backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colorMap[color] || colorMap.blue} bg-slate-900/80`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white font-heading">{value}</h3>
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 ${iconBgMap[color] || iconBgMap.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      {(subtext || trend) && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
          {trend && <span className="font-semibold text-emerald-400">{trend}</span>}
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
}
