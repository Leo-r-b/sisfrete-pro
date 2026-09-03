import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  DollarSign, 
  Users, 
  Building2, 
  Settings, 
  LogOut, 
  PlusCircle, 
  FileText, 
  FileSpreadsheet, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  Wrench, 
  Calculator, 
  Upload,
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, onNovoFrete, onOpenCalculadora, isMobileOpen, onCloseMobile }) {
  const { user, activeEmpresa, logout, getModulosAtivosList } = useAuth();
  const isLicencaGestao = activeEmpresa?.modo_operacao === 'gestao_pagamentos';
  const isLicencaRepasse = activeEmpresa?.modo_operacao === 'agenciamento_repasse';

  const isSuperAdmin = user?.role === 'super_admin';

  const saasMasterItems = [
    { id: 'saas_master', label: '👑 Painel Master SaaS', icon: ShieldCheck, badge: 'Master' },
  ];

  const allMenuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'fretes', label: 'Emissão de CT-e 4.00', icon: Truck },
    { id: 'importar_xml', label: isLicencaGestao ? 'Importação & Rateio CT-e' : 'Importar XML / Terceiros', icon: Upload },
    { id: 'mdfe', label: 'Manifestos (MDF-e 3.00)', icon: Layers },
    { id: 'torre_controle', label: 'Torre de Controle', icon: MapPin },
    { id: 'financeiro', label: 'Financeiro Integrado', icon: DollarSign },
    { id: 'frotas', label: 'Frotas & Manutenção', icon: Wrench },
    { id: 'relatorios', label: 'Relatórios & Extratos', icon: FileSpreadsheet },
    { id: 'motoristas', label: (isLicencaGestao || isLicencaRepasse) ? 'Transportadores & Freteiros' : 'Motoristas & Terceiros', icon: Users },
    { id: 'clientes', label: isLicencaGestao ? 'Fornecedores & Agenciadores' : 'Clientes / Embarcadores', icon: Building2 },
    { id: 'configuracoes', label: 'Configurações & Acesso', icon: Settings },
  ];

  // Controle Granular de Abas da Licença
  const modulosConfigurados = getModulosAtivosList ? getModulosAtivosList(activeEmpresa) : null;

  const menuItems = (user?.role === 'super_admin')
    ? allMenuItems
    : (modulosConfigurados
        ? allMenuItems.filter(item => modulosConfigurados.includes(item.id))
        : (isLicencaGestao
            ? allMenuItems.filter(item => !['fretes', 'mdfe', 'torre_controle', 'frotas'].includes(item.id))
            : allMenuItems));

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Overlay escuro em mobile quando o menu está aberto */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Principal (Desktop fixo + Mobile gaveta lateral) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="font-heading font-bold text-base tracking-tight text-white leading-none">
                SisFrete <span className="text-emerald-400">PRO</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">
                {isLicencaGestao ? 'GESTÃO DE PAGAMENTOS' : isLicencaRepasse ? 'AGENCIAMENTO & REPASSE' : 'GESTÃO & LOGÍSTICA'}
              </p>
            </div>
          </div>

          {/* Botão de Fechar no Mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-3 overflow-y-auto">
          
          {/* SEÇÃO EXCLUSIVA SUPER ADMIN MASTER */}
          {isSuperAdmin && (
            <div>
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-purple-400 mb-1.5 flex items-center gap-1.5 text-left">
                <span>👑 Gestão SaaS Master</span>
              </p>
              <div className="space-y-1">
                {saasMasterItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-left transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-950/40'
                          : 'text-purple-300/80 hover:text-purple-200 hover:bg-purple-900/20'
                      }`}
                    >
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? 'text-purple-300' : 'text-purple-400'}`} />
                      <span className="flex-1 text-left leading-snug">{item.label}</span>
                      {isActive && (
                        <span className="ml-2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MÓDULOS OPERACIONAIS DE FRETES */}
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 text-left">
              {isSuperAdmin ? '🚚 Operações de Fretes (Licença Ativa)' : 'Módulos Principais'}
            </p>
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-left transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="flex-1 text-left leading-snug">{item.label}</span>
                    {isActive && (
                      <span className="ml-2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Usuário'}</p>
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.role === 'super_admin'
                    ? '👑 Super Admin Master'
                    : user?.role === 'admin'
                    ? '👑 Administrador'
                    : user?.role === 'operador_financeiro'
                    ? '🚚 Operador & 💰 Financeiro'
                    : user?.role === 'financeiro'
                    ? '💰 Financeiro'
                    : '🚚 Operador'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 py-1.5 rounded-lg transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}
