import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FretesList from './pages/FretesList';
import Financeiro from './pages/Financeiro';
import Motoristas from './pages/Motoristas';
import Clientes from './pages/Clientes';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios';
import SaasMasterPanel from './pages/SaasMasterPanel';
import MdfeList from './pages/MdfeList';
import TorreControle from './pages/TorreControle';
import FrotasManutencao from './pages/FrotasManutencao';
import ImportarXmlList from './pages/ImportarXmlList';
import PublicCanhotoUpload from './pages/PublicCanhotoUpload';
import PublicTracking from './pages/PublicTracking';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import FreteFormModal from './pages/FreteFormModal';
import ReciboModal from './components/ReciboModal';
import LancamentoModal from './components/LancamentoModal';
import CalculadoraAnttModal from './components/CalculadoraAnttModal';

function MainApp() {
  const { user, activeEmpresa, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(
    user?.role === 'super_admin' ? 'saas_master' : 'dashboard'
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        if (!activeTab || activeTab === 'dashboard') {
          setActiveTab('saas_master');
        }
      } else {
        if (activeTab === 'saas_master' || !activeTab) {
          setActiveTab('dashboard');
        }
      }
    }
  }, [user?.role]);

  const isLicencaGestao = activeEmpresa?.modo_operacao === 'gestao_pagamentos';

  // Redirecionar para Dashboard se a empresa em Gestão de Pagamentos tentar abrir módulo indisponível (CT-e próprio, MDF-e, Torre ou Frotas)
  useEffect(() => {
    if (isLicencaGestao && ['fretes', 'mdfe', 'torre_controle', 'frotas'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isLicencaGestao, activeTab]);

  // Modais Globais
  const [isFreteModalOpen, setIsFreteModalOpen] = useState(false);
  const [editingFrete, setEditingFrete] = useState(null);

  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
  const [selectedFreteRecibo, setSelectedFreteRecibo] = useState(null);

  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [selectedFreteLancamento, setSelectedFreteLancamento] = useState(null);

  // Calculadora ANTT
  const [isCalculadoraOpen, setIsCalculadoraOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenNovoFrete = () => {
    setEditingFrete(null);
    setIsFreteModalOpen(true);
  };

  const handleOpenEditFrete = (frete) => {
    setEditingFrete(frete);
    setIsFreteModalOpen(true);
  };

  const handleOpenRecibo = (frete) => {
    setSelectedFreteRecibo(frete);
    setIsReciboModalOpen(true);
  };

  const handleOpenLancamento = (frete) => {
    setSelectedFreteLancamento(frete);
    setIsLancamentoModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide font-heading">Iniciando SisFrete Pro...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const getPageTitle = () => {
    const isLicencaAgenciamento = activeEmpresa?.modo_operacao === 'agenciamento_repasse';
    switch (activeTab) {
      case 'saas_master':
        return { title: 'Painel Master SaaS', subtitle: 'Gestão de Licenças & Contas a Receber Recorrente (R$ 350 / Dia 10)' };
      case 'dashboard':
        return { 
          title: isLicencaGestao ? 'Painel de Gestão de Pagamentos' : 'Painel Geral', 
          subtitle: isLicencaGestao ? 'Visão consolidada de pagamentos a freteiros, comissões e repasses' : 'Métricas executivas de transporte e fluxo financeiro' 
        };
      case 'fretes':
        return { 
          title: 'Emissão de Conhecimentos (CT-e 4.00)', 
          subtitle: 'Emissão oficial SEFAZ, cálculo de Piso ANTT, DACTE e Repasses automáticos' 
        };
      case 'importar_xml':
        return { 
          title: isLicencaGestao ? 'Importação & Rateio de Pagamentos (CT-e)' : 'Importação de CT-e & XML de Terceiros', 
          subtitle: isLicencaGestao
            ? 'Importação de CT-es recebidos para desdobramento financeiro: Frete Real, Comissão e Repasse'
            : 'Conciliação e importação de documentos fiscais recebidos para controle financeiro e subcontratação' 
        };
      case 'mdfe':
        return { title: 'Manifestos Eletrônicos (MDF-e 3.00)', subtitle: 'Manifesto Fiscal de Carga Modelo 58 e Encerramento de Viagens' };
      case 'torre_controle':
        return { title: 'Torre de Controle de Viagens', subtitle: 'Rastreamento operacional, checkpoints e links de clientes' };
      case 'financeiro':
        return { 
          title: 'Financeiro Integrado', 
          subtitle: isLicencaGestao
            ? 'Contas a Pagar (Freteiros, Comissões e Repasses), baixas PIX e controle de fluxo'
            : 'Contas a Pagar, Contas a Receber, Boletos/PIX e Plano de Contas' 
        };
      case 'frotas':
        return { title: 'Gestão de Frotas & Manutenção', subtitle: 'Revisões preventivas, trocas de óleo, histórico e pneus' };
      case 'relatorios':
        return { title: 'Relatórios & Extratos Fiscais', subtitle: 'Extratos consolidados de transportadores, tomadores e lucratividade' };
      case 'motoristas':
        return { 
          title: (isLicencaGestao || isLicencaAgenciamento) ? 'Transportadores & Freteiros' : 'Motoristas & Terceiros', 
          subtitle: 'Base de transportadores autônomos e dados para pagamento' 
        };
      case 'clientes':
        return { 
          title: isLicencaGestao ? 'Fornecedores, Agenciadores & Parceiros' : 'Clientes / Embarcadores', 
          subtitle: isLicencaGestao ? 'Cadastro de agenciadores (fornecedores) e parceiros de repasse' : 'Empresas contratantes e histórico de faturamento' 
        };
      case 'configuracoes':
        return { title: 'Configurações & Acesso', subtitle: 'Certificado Digital A1, SEFAZ, senhas e licença ativa' };
      default:
        return { title: 'SisFrete Pro', subtitle: '' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Sidebar de Navegação */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNovoFrete={handleOpenNovoFrete}
        onOpenCalculadora={() => setIsCalculadoraOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Área Principal de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Navbar com botão Mobile */}
        <Navbar
          title={title}
          subtitle={subtitle}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCalculadora={() => setIsCalculadoraOpen(true)}
        />

        {/* Conteúdo Dinâmico com Scroll */}
        <main key={refreshKey} className="flex-1 overflow-y-auto bg-slate-950 pb-6">
          {activeTab === 'saas_master' && (
            <SaasMasterPanel
              onSelectEmpresaOperacional={(tab) => setActiveTab(tab || 'fretes')}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              onNovoFrete={handleOpenNovoFrete}
              onImportarXml={() => setActiveTab('importar_xml')}
              onOpenRecibo={handleOpenRecibo}
              onOpenLancamento={handleOpenLancamento}
            />
          )}

          {activeTab === 'fretes' && (
            <FretesList
              onNovoFrete={handleOpenNovoFrete}
              onEditFrete={handleOpenEditFrete}
              onOpenRecibo={handleOpenRecibo}
              onOpenLancamento={handleOpenLancamento}
            />
          )}

          {activeTab === 'importar_xml' && (
            <ImportarXmlList
              onNovoFrete={handleOpenNovoFrete}
              onEditFrete={handleOpenEditFrete}
              onOpenRecibo={handleOpenRecibo}
              onOpenLancamento={handleOpenLancamento}
            />
          )}

          {activeTab === 'mdfe' && <MdfeList />}

          {activeTab === 'torre_controle' && <TorreControle />}

          {activeTab === 'financeiro' && (
            <Financeiro
              onOpenLancamento={handleOpenLancamento}
              onOpenRecibo={handleOpenRecibo}
            />
          )}

          {activeTab === 'frotas' && <FrotasManutencao />}

          {activeTab === 'relatorios' && (
            <Relatorios
              onOpenLancamento={handleOpenLancamento}
              onOpenRecibo={handleOpenRecibo}
            />
          )}

          {activeTab === 'motoristas' && <Motoristas />}

          {activeTab === 'clientes' && <Clientes />}

          {activeTab === 'configuracoes' && <Configuracoes />}
        </main>
      </div>

      {/* Modais Globais do Sistema */}
      <FreteFormModal
        isOpen={isFreteModalOpen}
        onClose={() => setIsFreteModalOpen(false)}
        onSuccess={handleRefresh}
        freteEdit={editingFrete}
      />

      <ReciboModal
        isOpen={isReciboModalOpen}
        onClose={() => setIsReciboModalOpen(false)}
        frete={selectedFreteRecibo}
      />

      <LancamentoModal
        isOpen={isLancamentoModalOpen}
        onClose={() => setIsLancamentoModalOpen(false)}
        onSuccess={handleRefresh}
        frete={selectedFreteLancamento}
      />

      <CalculadoraAnttModal
        isOpen={isCalculadoraOpen}
        onClose={() => setIsCalculadoraOpen(false)}
      />

    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xl font-bold flex items-center justify-center mx-auto">
              !
            </div>
            <h2 className="text-xl font-bold font-heading text-white">SisFrete Pro</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Ocorreu um erro temporário de renderização.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => {
                  localStorage.removeItem('sisfrete_token');
                  localStorage.removeItem('sisfrete_user');
                  localStorage.removeItem('sisfrete_active_empresa_id');
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Limpar Sessão
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Recarregar Sistema
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const currentPath = window.location.pathname;

  // Rotas Públicas Mobile / Clientes sem Autenticação
  if (currentPath.startsWith('/canhoto/')) {
    return <PublicCanhotoUpload />;
  }

  if (currentPath.startsWith('/rastreio/')) {
    return <PublicTracking />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
