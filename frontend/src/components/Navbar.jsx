import React from 'react';
import { Search, Bell, Sparkles, RefreshCw, Menu, Building2, ChevronDown, Calculator, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ 
  onRefresh, 
  isRefreshing, 
  title, 
  subtitle, 
  onOpenMobileMenu, 
  onOpenCalculadora,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { user, empresas, activeEmpresa, switchEmpresa, metodologiaAtiva, setMetodologiaAtiva } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <header className="h-14 sm:h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Botão Hambúrguer Mobile */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 md:hidden transition"
          title="Menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Botão de Recolher/Expandir Menu no Desktop */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 shadow-sm transition items-center justify-center cursor-pointer"
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral (Mais espaço para tabelas)'}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4 text-purple-400" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}

        <div>
          <h2 className="text-sm sm:text-lg font-bold text-white font-heading truncate max-w-[160px] sm:max-w-none">
            {title}
          </h2>
          {subtitle && <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* BADGE DA METODOLOGIA OPERACIONAL DA LICENÇA ATIVA */}
        {activeEmpresa?.modo_operacao === 'gestao_pagamentos' ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/50 border border-blue-500/40 text-blue-300 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>💼 Gestão de Pagamentos (Rateio)</span>
          </div>
        ) : activeEmpresa?.modo_operacao === 'agenciamento_repasse' ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-500/40 text-purple-300 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>📊 Agenciamento & Repasse (Comissão {activeEmpresa?.percentual_comissao_padrao || 5}%)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>🚚 Subcontratação Tradicional (Freteiro)</span>
          </div>
        )}

        {/* SELETOR MULTI-EMPRESA / LICENÇA (SUPER ADMIN) OU IDENTIFICAÇÃO DA EMPRESA */}
        {activeEmpresa && (
          <div className="hidden lg:flex items-center">
            {isSuperAdmin && empresas && empresas.length > 1 ? (
              <div className="relative flex items-center">
                <Building2 className="absolute left-2.5 h-3.5 w-3.5 text-purple-400 pointer-events-none" />
                <select
                  value={activeEmpresa?.id || 1}
                  onChange={(e) => switchEmpresa(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-slate-800/90 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-400 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition cursor-pointer appearance-none shadow-sm"
                  title="👑 Acesso Ghost Master: Alternar entre qualquer licença do sistema"
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900 text-white font-medium py-1">
                      👑 #{emp.codigo_licenca || emp.id} - {emp.nome_fantasia || emp.razao_social}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-bold shadow-sm">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                <span className="truncate max-w-[140px]">
                  {activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'Empresa Matriz'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Calculadora ANTT */}
        {onOpenCalculadora && (
          <button
            onClick={onOpenCalculadora}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/40 transition cursor-pointer"
            title="Calculadora Oficial de Piso Mínimo ANTT & Pedágio"
          >
            <Calculator className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline">Piso ANTT</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="hidden sm:inline">Online</span>
        </div>
      </div>
    </header>
  );
}
