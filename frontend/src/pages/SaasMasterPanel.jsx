import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck,
  Building2,
  KeyRound,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlusCircle,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  X,
  CreditCard,
  Receipt,
  FileCheck2,
  ExternalLink,
  Layers,
  Truck,
  Upload,
  Wrench,
  Database
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid 
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DatabaseExplorer from '../components/DatabaseExplorer';

export const MODULOS_SISTEMA = [
  { id: 'dashboard', nome: 'Painel Geral', desc: 'Métricas, gráficos executivos e margem de lucro' },
  { id: 'fretes', nome: 'Emissão de CT-e 4.00', desc: 'Emissão própria oficial SEFAZ, DACTE e Piso ANTT', tagFiscal: true },
  { id: 'importar_xml', nome: 'Importar XML / Terceiros', desc: 'Importação de XMLs recebidos e rateio de fretes' },
  { id: 'mdfe', nome: 'Manifestos (MDF-e 3.00)', desc: 'Manifesto Eletrônico de Cargas Modelo 58', tagFiscal: true },
  { id: 'torre_controle', nome: 'Torre de Controle', desc: 'Checkpoints de viagem e link público de rastreio' },
  { id: 'financeiro', nome: 'Financeiro Integrado', desc: 'Contas a Pagar/Receber, boletos e baixas PIX' },
  { id: 'frotas', nome: 'Frotas & Manutenção', desc: 'Controle de veículos próprios, manutenção e pneus' },
  { id: 'relatorios', nome: 'Relatórios & Extratos', desc: 'Extratos de motoristas, clientes e DRE analítico' },
  { id: 'motoristas', nome: 'Motoristas & Terceiros', desc: 'Cadastro de motoristas freteiros e transportadores' },
  { id: 'clientes', nome: 'Clientes / Embarcadores', desc: 'Cadastro de clientes e tomadores de frete' },
  { id: 'configuracoes', nome: 'Configurações da Empresa', desc: 'Dados cadastrais da empresa e usuários' },
];

export default function SaasMasterPanel({ onSelectEmpresaOperacional }) {
  const { user, empresas, switchEmpresa, loadEmpresas } = useAuth();
  
  // Abas do Painel Master
  const [masterTab, setMasterTab] = useState('metricas'); // 'metricas' | 'licencas' | 'cobrancas' | 'usuarios' | 'banco_dados'
  const [dbExplorerEmpresaId, setDbExplorerEmpresaId] = useState('todas');

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Mês Selecionado para Cobranças (Formato YYYY-MM)
  const hoje = new Date();
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMes, setSelectedMes] = useState(mesAtualStr);

  // Cobranças State
  const [cobrancas, setCobrancas] = useState([]);
  const [loadingCobrancas, setLoadingCobrancas] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Baixa de Pagamento
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [selectedCobrancaBaixa, setSelectedCobrancaBaixa] = useState(null);
  const [baixaForm, setBaixaForm] = useState({
    data_pagamento: hoje.toISOString().slice(0, 10),
    forma_pagamento: 'PIX',
    comprovante_ref: '',
    observacoes: '',
    valor: 350.00,
  });
  const [savingBaixa, setSavingBaixa] = useState(false);

  // Modal Recibo de Licença
  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
  const [selectedCobrancaRecibo, setSelectedCobrancaRecibo] = useState(null);

  // Modal Nova Licença / Edição de Licença
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [empresaForm, setEmpresaForm] = useState({
    codigo_licenca: '',
    limite_logins: 5,
    valor_mensalidade: 350.00,
    dia_vencimento: 10,
    tipo_licenca: 'paga', // 'paga' | 'teste_7dias' | 'gratuita'
    data_expiracao_teste: '',
    modo_operacao: 'padrao',
    percentual_comissao_padrao: 5.0,
    modulos_ativos: MODULOS_SISTEMA.map(m => m.id),
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    chave_pix: '',
    banco: '',
    agencia: '',
    conta: '',
    cidade: '',
    uf: 'PR',
    ativo: 1,
    // Admin inicial opcional
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [empresaModalError, setEmpresaModalError] = useState('');
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  // Modal Usuário Global
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    empresa_id: 1,
  });
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalError, setUserModalError] = useState('');
  const [userFilterEmpresa, setUserFilterEmpresa] = useState('todas');

  // Carregar Dashboard SaaS
  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await api.get('/saas/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Erro ao carregar métricas SaaS:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Carregar Cobranças do Mês Selecionado
  const loadCobrancas = async () => {
    try {
      setLoadingCobrancas(true);
      const res = await api.get('/saas/cobrancas', {
        params: {
          mes_referencia: selectedMes,
          status: statusFilter,
          busca: searchTerm,
        },
      });
      setCobrancas(res.data);
    } catch (err) {
      console.error('Erro ao carregar cobranças:', err);
    } finally {
      setLoadingCobrancas(false);
    }
  };

  // Carregar Usuários Globais
  const loadGlobalUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/users');
      setUsersList(res.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadCobrancas();
    loadGlobalUsers();
  }, []);

  useEffect(() => {
    loadCobrancas();
  }, [selectedMes, statusFilter, searchTerm]);

  // Sincronizar/Gerar Mensalidades do Mês
  const handleGerarMensalidades = async () => {
    try {
      const res = await api.post('/saas/gerar-mensalidades', { mes_referencia: selectedMes });
      alert(res.data.message);
      loadCobrancas();
      loadDashboard();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar mensalidades.');
    }
  };

  // Abrir Modal de Baixa
  const handleOpenBaixa = (cobranca) => {
    setSelectedCobrancaBaixa(cobranca);
    setBaixaForm({
      data_pagamento: cobranca.data_pagamento || hoje.toISOString().slice(0, 10),
      forma_pagamento: cobranca.forma_pagamento || 'PIX',
      comprovante_ref: cobranca.comprovante_ref || '',
      observacoes: cobranca.observacoes || '',
      valor: cobranca.valor || 350.00,
    });
    setIsBaixaModalOpen(true);
  };

  // Salvar Baixa de Cobrança
  const handleSaveBaixa = async (e) => {
    e.preventDefault();
    if (!selectedCobrancaBaixa) return;
    try {
      setSavingBaixa(true);
      await api.put(`/saas/cobrancas/${selectedCobrancaBaixa.id}`, {
        status: 'pago',
        ...baixaForm,
      });
      setIsBaixaModalOpen(false);
      loadCobrancas();
      loadDashboard();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar baixa.');
    } finally {
      setSavingBaixa(false);
    }
  };

  // Cancelar Baixa (Reabrir fatura como pendente)
  const handleReabrirCobranca = async (cobranca) => {
    if (!window.confirm(`Deseja desfazer a baixa e reabrir a fatura da Licença #${cobranca.codigo_licenca}?`)) return;
    try {
      await api.put(`/saas/cobrancas/${cobranca.id}`, {
        status: 'pendente',
        data_pagamento: null,
      });
      loadCobrancas();
      loadDashboard();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao reabrir cobrança.');
    }
  };

  // Abrir Recibo de Quitação
  const handleOpenRecibo = (cobranca) => {
    setSelectedCobrancaRecibo(cobranca);
    setIsReciboModalOpen(true);
  };

  // Salvar Nova Licença ou Edição
  const handleOpenNewLicenca = () => {
    setEditingEmpresa(null);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const expTeste = d.toISOString().slice(0, 10);

    setEmpresaForm({
      codigo_licenca: '',
      limite_logins: 5,
      valor_mensalidade: 350.00,
      dia_vencimento: 10,
      tipo_licenca: 'paga',
      data_expiracao_teste: expTeste,
      modo_operacao: 'padrao',
      percentual_comissao_padrao: 5.0,
      modulos_ativos: MODULOS_SISTEMA.map(m => m.id),
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      telefone: '',
      email: '',
      chave_pix: '',
      banco: '',
      agencia: '',
      conta: '',
      cidade: '',
      uf: 'PR',
      ativo: 1,
      admin_name: '',
      admin_email: '',
      admin_password: '',
    });
    setEmpresaModalError('');
    setIsEmpresaModalOpen(true);
  };

  const handleOpenEditLicenca = (emp) => {
    setEditingEmpresa(emp);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const expTesteDefault = d.toISOString().slice(0, 10);

    let modulosIniciais = MODULOS_SISTEMA.map(m => m.id);
    if (emp.modulos_ativos) {
      if (Array.isArray(emp.modulos_ativos)) {
        modulosIniciais = emp.modulos_ativos;
      } else if (typeof emp.modulos_ativos === 'string') {
        try {
          const parsed = JSON.parse(emp.modulos_ativos);
          if (Array.isArray(parsed)) modulosIniciais = parsed;
        } catch (e) {}
      }
    } else if (emp.modo_operacao === 'gestao_pagamentos') {
      modulosIniciais = ['dashboard', 'importar_xml', 'financeiro', 'relatorios', 'motoristas', 'clientes', 'configuracoes'];
    }

    setEmpresaForm({
      codigo_licenca: emp.codigo_licenca || String(emp.id),
      limite_logins: emp.limite_logins || 5,
      valor_mensalidade: emp.valor_mensalidade !== undefined && emp.valor_mensalidade !== null ? Number(emp.valor_mensalidade) : 350.00,
      dia_vencimento: emp.dia_vencimento !== undefined ? emp.dia_vencimento : 10,
      tipo_licenca: emp.tipo_licenca || (emp.valor_mensalidade === 0 ? 'gratuita' : 'paga'),
      data_expiracao_teste: emp.data_expiracao_teste || expTesteDefault,
      modo_operacao: emp.modo_operacao || 'padrao',
      percentual_comissao_padrao: emp.percentual_comissao_padrao !== undefined ? emp.percentual_comissao_padrao : 5.0,
      modulos_ativos: modulosIniciais,
      razao_social: emp.razao_social || '',
      nome_fantasia: emp.nome_fantasia || '',
      cnpj: emp.cnpj || '',
      telefone: emp.telefone || '',
      email: emp.email || '',
      chave_pix: emp.chave_pix || '',
      banco: emp.banco || '',
      agencia: emp.agencia || '',
      conta: emp.conta || '',
      cidade: emp.cidade || '',
      uf: emp.uf || 'PR',
      ativo: emp.ativo !== undefined ? emp.ativo : 1,
      admin_name: '',
      admin_email: '',
      admin_password: '',
    });
    setEmpresaModalError('');
    setIsEmpresaModalOpen(true);
  };

  // Renovar / Estender Teste (+7 dias)
  const handleRenovarTeste = async (empId, dias = 7) => {
    try {
      const res = await api.post(`/saas/empresas/${empId}/renovar-teste`, { dias });
      alert(res.data.message);
      await loadDashboard();
      await loadEmpresas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao renovar teste da licença.');
    }
  };

  // Alterar Plano / Tipo de Licença (Paga, Teste 7D, Gratuita)
  const handleAlterarTipoLicenca = async (empId, tipo, valor = 350) => {
    try {
      const res = await api.put(`/saas/empresas/${empId}/tipo-licenca`, { tipo_licenca: tipo, valor_mensalidade: valor });
      alert(res.data.message);
      await loadDashboard();
      await loadEmpresas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar plano da licença.');
    }
  };

  const handleSaveLicenca = async (e) => {
    e.preventDefault();
    setEmpresaModalError('');
    setSavingEmpresa(true);
    try {
      if (editingEmpresa) {
        await api.put(`/empresas/${editingEmpresa.id}`, empresaForm);
      } else {
        await api.post('/empresas', empresaForm);
      }
      setIsEmpresaModalOpen(false);
      await loadDashboard();
      await loadCobrancas();
      await loadEmpresas();
      await loadGlobalUsers();
    } catch (err) {
      setEmpresaModalError(err.response?.data?.error || 'Erro ao salvar licença.');
    } finally {
      setSavingEmpresa(false);
    }
  };

  const handleDeleteLicenca = async (id, nome) => {
    if (!window.confirm(`ATENÇÃO: Deseja realmente excluir a Licença "${nome}"? Todos os fretes, motoristas e usuários desta licença serão apagados permanentemente.`)) return;
    try {
      await api.delete(`/empresas/${id}`);
      await loadDashboard();
      await loadCobrancas();
      await loadEmpresas();
      await loadGlobalUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir licença.');
    }
  };

  // Alternar para o ambiente de fretes de uma empresa
  const handleAcessarAmbienteOperacional = (empId) => {
    switchEmpresa(empId);
    if (onSelectEmpresaOperacional) {
      onSelectEmpresaOperacional('fretes');
    }
  };

  // Salvar Usuário Global
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      empresa_id: empresas[0]?.id || 1,
    });
    setUserModalError('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      empresa_id: u.empresa_id || empresas[0]?.id || 1,
    });
    setUserModalError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserModalError('');
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, userForm);
      } else {
        await api.post('/users', userForm);
      }
      setIsUserModalOpen(false);
      loadGlobalUsers();
    } catch (err) {
      setUserModalError(err.response?.data?.error || 'Erro ao salvar usuário.');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Deseja excluir o usuário "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      loadGlobalUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário.');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (userFilterEmpresa === 'todas') return true;
    return String(u.empresa_id) === String(userFilterEmpresa);
  });

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      
      {/* Header Principal do Painel Master */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  👑 Super Admin Master
                </span>
                <span className="text-xs text-slate-400 font-mono">SaaS Owner</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-heading mt-0.5">
                Painel Master de Licenças & Contas a Receber
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Gestão central de empresas contratantes, criação de licenças e faturamento recorrente mensal (R$ 350/mês • Dia 10).
              </p>
            </div>
          </div>

          {/* Ações Rápidas de Topo */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenNewLicenca}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Licença / Empresa</span>
            </button>
            <button
              onClick={() => { loadDashboard(); loadCobrancas(); }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Atualizar Dados Master"
            >
              <RefreshCw className={`h-4 w-4 ${loadingDashboard ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navegação de Abas do Painel Master */}
      <div className="flex border-b border-slate-800 gap-1 sm:gap-2 overflow-x-auto select-none">
        <button
          onClick={() => setMasterTab('metricas')}
          className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            masterTab === 'metricas'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Visão Geral & Métricas SaaS</span>
        </button>

        <button
          onClick={() => setMasterTab('licencas')}
          className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            masterTab === 'licencas'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Gestão de Licenças</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-700 font-mono">
            {dashboardData?.total_licencas || empresas.length}
          </span>
        </button>

        <button
          onClick={() => setMasterTab('cobrancas')}
          className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            masterTab === 'cobrancas'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Contas a Receber SaaS</span>
          {dashboardData?.financeiro_mes?.qtd_atrasadas > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/30 text-rose-300 font-bold border border-rose-500/50">
              {dashboardData.financeiro_mes.qtd_atrasadas} atrasadas
            </span>
          )}
        </button>

        <button
          onClick={() => setMasterTab('usuarios')}
          className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            masterTab === 'usuarios'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Usuários Globais</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {usersList.length}
          </span>
        </button>

        <button
          onClick={() => setMasterTab('banco_dados')}
          className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            masterTab === 'banco_dados'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Tabelas do Banco</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
            Render SQLite
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: VISÃO GERAL & MÉTRICAS SAAS */}
      {/* ========================================================================= */}
      {masterTab === 'metricas' && (
        <div className="space-y-5">
          {/* CARDS DE KPIS EXECUTIVOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: MRR Projetado */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">MRR Recorrente</span>
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white font-heading mt-2">
                R$ {Number(dashboardData?.mrr_projetado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-purple-400 mt-1 font-medium">
                {dashboardData?.licencas_ativas || 0} licenças ativas
              </p>
            </div>

            {/* Card 2: Total a Receber no Mês */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">A Receber no Mês</span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-400 font-heading mt-2">
                R$ {Number(dashboardData?.financeiro_mes?.total_a_receber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {dashboardData?.financeiro_mes?.qtd_pendentes || 0} faturas pendentes (Venc. Dia 10)
              </p>
            </div>

            {/* Card 3: Total Recebido no Mês */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Recebido no Mês</span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-400 font-heading mt-2">
                R$ {Number(dashboardData?.financeiro_mes?.total_recebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {dashboardData?.financeiro_mes?.qtd_pagas || 0} mensalidades baixadas
              </p>
            </div>

            {/* Card 4: Faturas em Atraso */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Faturas em Atraso</span>
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-400 font-heading mt-2">
                R$ {Number(dashboardData?.financeiro_mes?.total_atrasado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {dashboardData?.financeiro_mes?.qtd_atrasadas || 0} licenças vencidas
              </p>
            </div>

            {/* Card 5: Total de Licenças */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">Base de Licenças</span>
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white font-heading mt-2">
                {dashboardData?.total_licencas || 0} <span className="text-xs font-normal text-slate-400">empresas</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {dashboardData?.licencas_ativas || 0} ativas • {dashboardData?.licencas_bloqueadas || 0} bloqueadas
              </p>
            </div>

          </div>

          {/* GRÁFICO DE FATURAMENTO DOS ÚLTIMOS 6 MESES */}
          {dashboardData?.historico_meses && dashboardData.historico_meses.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-heading font-bold text-base text-white">Histórico de Faturamento de Mensalidades (SaaS)</h3>
                  <p className="text-xs text-slate-400">Valores faturados e recebidos de mensalidades (R$ 350/mês por licença)</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
                    <span className="text-slate-300">Projetado / Faturado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                    <span className="text-slate-300">Recebido</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.historico_meses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `R$${val}`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, '']}
                    />
                    <Bar dataKey="projetado" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Projetado" />
                    <Bar dataKey="recebido" fill="#10b981" radius={[6, 6, 0, 0]} name="Recebido" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TABELA DE STATUS DAS LICENÇAS NO MÊS ATUAL COM AÇÕES DIRETAS */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-white">Status das Licenças no Mês Atual ({dashboardData?.mes_referencia_atual})</h3>
                <p className="text-xs text-slate-400">Controle instantâneo: isente mensalidades, renove testes e dê baixas diretamente nesta tabela</p>
              </div>
              <button
                onClick={() => setMasterTab('cobrancas')}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>Ver Contas a Receber Completo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">ID / Licença</th>
                    <th className="px-3 py-2.5">Empresa Contratante</th>
                    <th className="px-3 py-2.5">Tipo / Plano</th>
                    <th className="px-3 py-2.5">Mensalidade</th>
                    <th className="px-3 py-2.5 text-center">Status Mês</th>
                    <th className="px-3 py-2.5 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dashboardData?.licencas?.map((lic) => {
                    const status = lic.status_cobranca || 'pendente';
                    const isTeste = lic.tipo_licenca === 'teste_7dias';
                    const isGratis = lic.tipo_licenca === 'gratuita' || Number(lic.valor_mensalidade || 0) === 0;

                    return (
                      <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-purple-400">
                          #{lic.codigo_licenca || lic.id}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-white">{lic.nome_fantasia || lic.razao_social}</p>
                          <p className="text-[10px] text-slate-400">{lic.cidade ? `${lic.cidade}/${lic.uf || ''}` : (lic.cnpj || '---')}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          {isTeste ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              lic.teste_expirado ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}>
                              <Clock className="h-3 w-3" />
                              <span>{lic.teste_expirado ? '⚠ Teste Expirado' : `⏱️ Teste (${lic.dias_restantes_teste}d)`}</span>
                            </span>
                          ) : isGratis ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              🎁 Isento / Grátis
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              💰 Plano Pago
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-bold font-mono">
                          {isGratis || isTeste ? (
                            <span className="text-emerald-400">R$ 0,00</span>
                          ) : (
                            <span className="text-white">R$ {Number(lic.valor_mensalidade || 350).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {isGratis || isTeste ? (
                            <span className="text-[10px] text-slate-500 italic">Sem fatura</span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              status === 'pago'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : status === 'atrasado'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {status === 'pago' ? '✓ Pago' : status === 'atrasado' ? '⚠ Atrasado' : '⏳ Pendente'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Ação de Isentar Mensalidade */}
                            {!isGratis && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Deseja zerar a mensalidade da Licença #${lic.codigo_licenca || lic.id} e torná-la 100% gratuita?`)) {
                                    handleAlterarTipoLicenca(lic.id, 'gratuita', 0);
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition cursor-pointer"
                                title="Zerar a mensalidade desta empresa (Tornar Gratuita)"
                              >
                                🎁 Isentar
                              </button>
                            )}

                            {/* Ação de Renovar Teste */}
                            {isTeste && (
                              <button
                                onClick={() => handleRenovarTeste(lic.id, 7)}
                                className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-[10px] font-bold transition cursor-pointer"
                                title="Estender teste por mais 7 dias"
                              >
                                ⏱️ +7 Dias
                              </button>
                            )}

                            {/* Ação de Ativar Cobrança */}
                            {(isGratis || isTeste) && (
                              <button
                                onClick={() => {
                                  const val = prompt('Informe o valor da mensalidade (R$):', '350.00');
                                  if (val !== null && !isNaN(Number(val))) {
                                    handleAlterarTipoLicenca(lic.id, 'paga', Number(val));
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 text-[10px] font-bold transition cursor-pointer"
                                title="Ativar mensalidade paga"
                              >
                                💰 Cobrar
                              </button>
                            )}

                            {lic.cobranca_id && status !== 'pago' && (
                              <button
                                onClick={() => handleOpenBaixa({
                                  id: lic.cobranca_id,
                                  codigo_licenca: lic.codigo_licenca || lic.id,
                                  empresa_nome: lic.nome_fantasia || lic.razao_social,
                                  valor: lic.valor_mensalidade || 350.00,
                                })}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition shadow"
                              >
                                Baixa
                              </button>
                            )}

                            <button
                              onClick={() => handleAcessarAmbienteOperacional(lic.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition border border-slate-700"
                              title="Acessar Sistema desta Empresa"
                            >
                              Entrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: GESTÃO DE LICENÇAS & EMPRESAS */}
      {/* ========================================================================= */}
      {masterTab === 'licencas' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">Base Global de Licenças (Multi-Tenant)</h3>
              <p className="text-xs text-slate-400">
                Cada empresa possui seu próprio <strong>Código de Licença</strong> para login, limites e faturamento mensal de R$ 350.
              </p>
            </div>
            <button
              onClick={handleOpenNewLicenca}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 transition cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Licença / Empresa</span>
            </button>
          </div>

          {/* Grid de Cards de Licenças */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData?.licencas?.map((emp) => {
              const limite = emp.limite_logins || 5;
              const usados = emp.total_usuarios || 0;
              const percentUsado = Math.min(100, Math.round((usados / limite) * 100));
              const isAtivo = emp.ativo === 1;
              const isTeste = emp.tipo_licenca === 'teste_7dias';
              const isGratis = emp.tipo_licenca === 'gratuita' || Number(emp.valor_mensalidade || 0) === 0;

              return (
                <div
                  key={emp.id}
                  className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                    !isAtivo
                      ? 'bg-rose-950/20 border-rose-500/30 opacity-75'
                      : isTeste && emp.teste_expirado
                      ? 'bg-amber-950/25 border-amber-500/40'
                      : isTeste
                      ? 'bg-blue-950/25 border-blue-500/40 hover:border-blue-500'
                      : isGratis
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500'
                      : 'bg-slate-800/40 border-slate-800 hover:border-purple-500/50'
                  }`}
                >
                  <div>
                    {/* Header do Card com o ID da Licença e Badges de Tipo */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="px-3 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 font-mono font-black text-sm flex items-center gap-1.5">
                          <KeyRound className="h-4 w-4" />
                          <span>ID #{emp.codigo_licenca || emp.id}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-heading">
                            {emp.nome_fantasia || emp.razao_social}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {emp.razao_social}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* BADGE DE TIPO DE LICENÇA */}
                        {isTeste ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            emp.teste_expirado
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {emp.teste_expirado
                                ? `⚠ Teste Expirado (${emp.data_expiracao_teste ? new Date(emp.data_expiracao_teste + 'T12:00:00').toLocaleDateString('pt-BR') : 'Vencido'})`
                                : `⏱️ Teste: ${emp.dias_restantes_teste}d restantes`}
                            </span>
                          </span>
                        ) : isGratis ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🎁 Grátis / Isento
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            💰 Plano Pago
                          </span>
                        )}

                        {emp.modo_operacao === 'gestao_pagamentos' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            💼 Gestão Pagamentos
                          </span>
                        ) : emp.modo_operacao === 'agenciamento_repasse' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            📊 Agenciamento & Repasse
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            🚚 Subcontratação
                          </span>
                        )}

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isAtivo 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {isAtivo ? '✓ Ativa' : '✕ Bloqueada'}
                        </span>

                        {emp.modulos_ativos ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            <Layers className="h-2.5 w-2.5 text-purple-400" />
                            <span>
                              {(() => {
                                try {
                                  const arr = typeof emp.modulos_ativos === 'string' ? JSON.parse(emp.modulos_ativos) : emp.modulos_ativos;
                                  return `${arr.length} abas liberadas`;
                                } catch(e) { return 'Módulos customizados'; }
                              })()}
                            </span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                            💎 Todas as Abas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dados Financeiros e de Plano */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl mb-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          {isTeste ? 'Plano de Teste' : isGratis ? 'Mensalidade' : 'Mensalidade SaaS'}
                        </span>
                        <span className={`font-mono font-bold text-sm ${isGratis || isTeste ? 'text-emerald-400' : 'text-purple-400'}`}>
                          {isGratis || isTeste ? 'R$ 0,00 (Grátis)' : `R$ ${Number(emp.valor_mensalidade || 350).toFixed(2)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          {isTeste ? 'Expira em' : 'Vencimento'}
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          {isTeste && emp.data_expiracao_teste
                            ? new Date(emp.data_expiracao_teste + 'T12:00:00').toLocaleDateString('pt-BR')
                            : `Todo dia ${emp.dia_vencimento || 10}`}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Ações Rápidas de Plano (Teste 7D, Grátis, Pago) */}
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {isTeste && (
                        <button
                          onClick={() => handleRenovarTeste(emp.id, 7)}
                          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 text-[11px] font-bold flex items-center gap-1 transition"
                          title="Adicionar mais 7 dias de teste gratuito para esta empresa"
                        >
                          <Clock className="h-3 w-3" />
                          <span>+7 Dias Teste</span>
                        </button>
                      )}

                      {!isGratis && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja zerar a mensalidade da Licença #${emp.codigo_licenca || emp.id} e torná-la 100% gratuita?`)) {
                              handleAlterarTipoLicenca(emp.id, 'gratuita', 0);
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition"
                          title="Zerar mensalidade (Tornar Gratuita/Isenta)"
                        >
                          🎁 Zerar Mensalidade
                        </button>
                      )}

                      {(isGratis || isTeste) && (
                        <button
                          onClick={() => {
                            const val = prompt('Informe o valor da mensalidade (R$):', '350.00');
                            if (val !== null && !isNaN(Number(val))) {
                              handleAlterarTipoLicenca(emp.id, 'paga', Number(val));
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 text-[11px] font-bold transition"
                          title="Converter para plano pago regular"
                        >
                          💰 Ativar Plano Pago
                        </button>
                      )}

                      {!isTeste && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja converter a Licença #${emp.codigo_licenca || emp.id} para Teste Grátis de 7 Dias?`)) {
                              handleAlterarTipoLicenca(emp.id, 'teste_7dias', 0);
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold transition"
                          title="Mudar para Período de Teste 7 Dias"
                        >
                          ⏱️ Mudar p/ Teste 7D
                        </button>
                      )}
                    </div>

                    {/* Barra de Logins Utilizados */}
                    <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Logins Cadastrados:</span>
                        <span className="font-bold font-mono text-white">
                          {usados} / {limite} usuários
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            percentUsado >= 100 ? 'bg-rose-500' : percentUsado >= 80 ? 'bg-amber-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${percentUsado}%` }}
                        />
                      </div>
                    </div>

                    {/* Dados de Contato e Localização */}
                    <div className="space-y-1 text-xs text-slate-300 pt-1">
                      {emp.cnpj && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">CNPJ:</span>
                          <span className="font-mono text-slate-300 font-semibold">{emp.cnpj}</span>
                        </div>
                      )}
                      {(emp.cidade || emp.uf) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span>{emp.cidade || 'Não informada'} / {emp.uf || 'PR'}</span>
                        </div>
                      )}
                      {emp.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <span className="font-mono text-slate-300">{emp.telefone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé com Ações */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-xs">
                    <div className="text-[11px] text-slate-400">
                      <strong>{emp.total_fretes || 0}</strong> fretes operados
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setDbExplorerEmpresaId(String(emp.id));
                          setMasterTab('banco_dados');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/40 hover:text-purple-300 text-slate-300 font-bold text-xs border border-slate-700 transition"
                        title="Ver e gerenciar banco de dados desta licença"
                      >
                        <Database className="h-3.5 w-3.5 text-purple-400" />
                        <span>Ver Banco</span>
                      </button>

                      <button
                        onClick={() => handleAcessarAmbienteOperacional(emp.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition"
                        title="Entrar no painel operacional de fretes desta empresa"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Acessar Ambiente</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditLicenca(emp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                        title="Editar Licença"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      {dashboardData?.licencas?.length > 1 && (
                        <button
                          onClick={() => handleDeleteLicenca(emp.id, emp.nome_fantasia || emp.razao_social)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                          title="Excluir Licença"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CONTAS A RECEBER SAAS (MENSALIDADES R$ 350 / VENCIMENTO DIA 10) */}
      {/* ========================================================================= */}
      {masterTab === 'cobrancas' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          
          {/* Header e Filtros */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                Contas a Receber de Mensalidades de Licenças (SaaS)
              </h3>
              <p className="text-xs text-slate-400">
                Cobrança recorrente de R$ 350,00 por empresa com vencimento todo dia 10 de cada mês.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Seletor de Mês de Referência */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-slate-400">Mês:</span>
                <input
                  type="month"
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                />
              </div>

              {/* Botão de Sincronizar / Gerar Mensalidades do Mês */}
              <button
                onClick={handleGerarMensalidades}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition cursor-pointer"
                title="Gera cobranças para todas as licenças ativas que ainda não possuem fatura no mês"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Sincronizar Mês</span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros por Status e Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            {/* Filtro de Status */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'todos', label: 'Todas as Faturas' },
                { id: 'pendente', label: 'Pendentes' },
                { id: 'pago', label: 'Pagas / Recebidas' },
                { id: 'atrasado', label: 'Em Atraso' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por Licença, Nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabela de Faturas */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Licença</th>
                  <th className="px-3 py-2.5">Empresa / Razão Social</th>
                  <th className="px-3 py-2.5">Mês Ref.</th>
                  <th className="px-3 py-2.5">Vencimento</th>
                  <th className="px-3 py-2.5">Valor</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5">Pagamento / PIX</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cobrancas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      Nenhuma mensalidade encontrada para o período e filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  cobrancas.map((cob) => {
                    const isPago = cob.status === 'pago';
                    const isAtrasado = cob.status === 'atrasado';

                    return (
                      <tr key={cob.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-purple-400 whitespace-nowrap">
                          #{cob.codigo_licenca || cob.empresa_id}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-white">{cob.nome_fantasia || cob.razao_social}</p>
                          <p className="text-[10px] text-slate-400">{cob.cnpj || cob.cidade || '---'}</p>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-300">
                          {cob.mes_referencia}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-white whitespace-nowrap">
                          {cob.data_vencimento ? new Date(cob.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Dia 10'}
                        </td>
                        <td className="px-3 py-2.5 font-bold font-mono text-white whitespace-nowrap">
                          R$ {Number(cob.valor || 350).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isPago 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : isAtrasado 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {isPago ? '✓ Pago' : isAtrasado ? '⚠ Atrasado' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300 text-[11px]">
                          {isPago ? (
                            <div>
                              <span className="text-emerald-400 font-semibold font-mono">
                                {cob.data_pagamento ? new Date(cob.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Pago'}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {cob.forma_pagamento} {cob.comprovante_ref ? `• ${cob.comprovante_ref}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Aguardando recebimento</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPago ? (
                              <button
                                onClick={() => handleOpenBaixa(cob)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition cursor-pointer"
                                title="Registrar recebimento de mensalidade"
                              >
                                Baixar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenRecibo(cob)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 transition"
                                  title="Ver Recibo de Quitação da Licença"
                                >
                                  <Receipt className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReabrirCobranca(cob)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-400 transition"
                                  title="Desfazer baixa / Reabrir"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: USUÁRIOS GLOBAIS */}
      {/* ========================================================================= */}
      {masterTab === 'usuarios' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">Usuários & Logins de Todas as Licenças</h3>
              <p className="text-xs text-slate-400">
                Gerencie colaboradores e administradores de todas as empresas do ecossistema SisFrete Pro.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={userFilterEmpresa}
                onChange={(e) => setUserFilterEmpresa(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="todas">Filtrar: Todas as Licenças</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    ID #{emp.codigo_licenca || emp.id} - {emp.nome_fantasia || emp.razao_social}
                  </option>
                ))}
              </select>
              <button
                onClick={handleOpenNewUser}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Novo Usuário</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="px-3 py-2.5">E-mail (Login)</th>
                  <th className="px-3 py-2.5">Licença Vinculada</th>
                  <th className="px-3 py-2.5 text-center">Permissão</th>
                  <th className="px-3 py-2.5">Criado em</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isMaster = u.role === 'super_admin';
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2.5 font-semibold text-white">
                        {u.name}
                        {isMaster && <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">MASTER GLOBAL</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300 text-[11px]">{u.email}</td>
                      <td className="px-3 py-2.5 text-slate-300 font-medium">
                        {isMaster ? (
                          <span className="text-purple-400 font-bold text-[11px]">Todas as Licenças (Global)</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950 border border-blue-800/50 text-blue-300 text-[11px]">
                            <KeyRound className="h-3 w-3 text-blue-400" />
                            <span>ID #{u.empresa_id || 1} • {u.empresa_nome || 'Matriz'}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          u.role === 'super_admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : u.role === 'admin'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : u.role === 'financeiro'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                            title="Editar / Redefinir Senha"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {u.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: EXPLORADOR E GESTOR DE BANCO DE DADOS (RENDER SQLITE) */}
      {/* ========================================================================= */}
      {masterTab === 'banco_dados' && (
        <DatabaseExplorer initialEmpresaId={dbExplorerEmpresaId} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BAIXA DE PAGAMENTO / RECEBIMENTO DE MENSALIDADE */}
      {/* ========================================================================= */}
      {isBaixaModalOpen && selectedCobrancaBaixa && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Baixa de Mensalidade de Licença</h3>
              </div>
              <button 
                onClick={() => setIsBaixaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">Empresa: <strong className="text-white">{selectedCobrancaBaixa.empresa_nome}</strong></p>
              <p className="text-slate-400">Licença: <strong className="text-purple-400 font-mono">#{selectedCobrancaBaixa.codigo_licenca}</strong></p>
              <p className="text-slate-400">Mês de Referência: <strong className="text-white font-mono">{selectedCobrancaBaixa.mes_referencia}</strong></p>
            </div>

            <form onSubmit={handleSaveBaixa} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Recebido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={baixaForm.valor}
                    onChange={(e) => setBaixaForm({ ...baixaForm, valor: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    required
                    value={baixaForm.data_pagamento}
                    onChange={(e) => setBaixaForm({ ...baixaForm, data_pagamento: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Forma de Pagamento</label>
                <select
                  value={baixaForm.forma_pagamento}
                  onChange={(e) => setBaixaForm({ ...baixaForm, forma_pagamento: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="TED">Transferência / TED</option>
                  <option value="Cartão">Cartão de Crédito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Comprovante / ID da Transação (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Chave E2E PIX, Nº Comprovante..."
                  value={baixaForm.comprovante_ref}
                  onChange={(e) => setBaixaForm({ ...baixaForm, comprovante_ref: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Anotações internas sobre o pagamento..."
                  value={baixaForm.observacoes}
                  onChange={(e) => setBaixaForm({ ...baixaForm, observacoes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBaixaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBaixa}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {savingBaixa ? 'Salvando...' : 'Confirmar Baixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECIBO DE QUITAÇÃO DE LICENÇA (IMPRESSÃO / PDF) */}
      {/* ========================================================================= */}
      {isReciboModalOpen && selectedCobrancaRecibo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Receipt className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Recibo de Quitação de Licença</h3>
              </div>
              <button 
                onClick={() => setIsReciboModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Recibo Formatado para Impressão */}
            <div id="recibo-licenca-print" className="p-6 bg-white text-slate-900 rounded-2xl space-y-4 shadow-md font-sans">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">SisFrete Pro • Plataforma SaaS</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Comprovante de Quitação de Mensalidade de Licença</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs uppercase">
                    ✓ QUITADO
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">Fatura #{selectedCobrancaRecibo.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Empresa Licenciada</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedCobrancaRecibo.nome_fantasia || selectedCobrancaRecibo.razao_social}</p>
                  <p className="text-[11px] text-slate-600 font-mono">CNPJ: {selectedCobrancaRecibo.cnpj || '---'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Código da Licença</p>
                  <p className="font-bold font-mono text-purple-700 text-sm">ID #{selectedCobrancaRecibo.codigo_licenca || selectedCobrancaRecibo.empresa_id}</p>
                  <p className="text-[11px] text-slate-600">Cidade: {selectedCobrancaRecibo.cidade || 'PR'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-y border-slate-200 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Mês de Referência:</span>
                  <span className="font-bold font-mono text-slate-900">{selectedCobrancaRecibo.mes_referencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Vencimento Original:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {selectedCobrancaRecibo.data_vencimento ? new Date(selectedCobrancaRecibo.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Data do Pagamento:</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {selectedCobrancaRecibo.data_pagamento ? new Date(selectedCobrancaRecibo.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Forma de Pagamento:</span>
                  <span className="font-bold font-mono text-slate-900">{selectedCobrancaRecibo.forma_pagamento || 'PIX'}</span>
                </div>
                {selectedCobrancaRecibo.comprovante_ref && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Referência / Autenticação:</span>
                    <span className="font-mono text-slate-800 text-[11px]">{selectedCobrancaRecibo.comprovante_ref}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-100 text-sm">
                  <span className="font-bold text-slate-900">Valor Total Pago:</span>
                  <span className="font-black font-mono text-emerald-700 text-base">
                    R$ {Number(selectedCobrancaRecibo.valor || 350).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center pt-2">
                Documento gerado automaticamente pelo SisFrete Pro SaaS Master para fins de quitação e controle financeiro.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NOVA LICENÇA / EDIÇÃO DE LICENÇA */}
      {/* ========================================================================= */}
      {isEmpresaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Building2 className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  {editingEmpresa ? `Editar Licença #${empresaForm.codigo_licenca}` : 'Cadastrar Nova Licença / Empresa Contratante'}
                </h3>
              </div>
              <button 
                onClick={() => setIsEmpresaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {empresaModalError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{empresaModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLicenca} className="space-y-4 text-xs">
              
              {/* DADOS DA LICENÇA */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="font-bold text-purple-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Parâmetros da Licença, Plano & Cobrança</span>
                </h4>

                {/* SELETOR DE PLANO / TIPO DE LICENÇA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Tipo de Licença / Plano *
                    </label>
                    <select
                      value={empresaForm.tipo_licenca}
                      onChange={(e) => {
                        const novoTipo = e.target.value;
                        let novoValor = empresaForm.valor_mensalidade;
                        let novaExp = empresaForm.data_expiracao_teste;
                        if (novoTipo === 'gratuita') {
                          novoValor = 0;
                        } else if (novoTipo === 'teste_7dias') {
                          novoValor = 0;
                          if (!novaExp) {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            novaExp = d.toISOString().slice(0, 10);
                          }
                        } else if (novoTipo === 'paga' && Number(novoValor) === 0) {
                          novoValor = 350.00;
                        }
                        setEmpresaForm({
                          ...empresaForm,
                          tipo_licenca: novoTipo,
                          valor_mensalidade: novoValor,
                          data_expiracao_teste: novaExp,
                        });
                      }}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                    >
                      <option value="paga">💰 Plano Pago Recorrente (Mensalidade)</option>
                      <option value="teste_7dias">⏱️ Teste Grátis 7 Dias (Trial com Expiração)</option>
                      <option value="gratuita">🎁 Licença Gratuita / Isenta (R$ 0,00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ID / Código da Licença
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 250, 199 (ou deixe vazio p/ auto)"
                      value={empresaForm.codigo_licenca}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, codigo_licenca: e.target.value })}
                      className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* SE FOR TESTE DE 7 DIAS */}
                {empresaForm.tipo_licenca === 'teste_7dias' && (
                  <div className="p-3 bg-blue-950/30 border border-blue-500/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-blue-300 font-semibold">
                        Data de Expiração do Teste Gratuito *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setEmpresaForm({ ...empresaForm, data_expiracao_teste: d.toISOString().slice(0, 10) });
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline"
                      >
                        +7 Dias a partir de Hoje
                      </button>
                    </div>
                    <input
                      type="date"
                      required
                      value={empresaForm.data_expiracao_teste}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, data_expiracao_teste: e.target.value })}
                      className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-blue-200/80">
                      ⏱️ Após esta data, o login da empresa será bloqueado automaticamente com aviso amigável para contato comercial.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Limite de Logins
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={empresaForm.limite_logins}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, limite_logins: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-300 font-semibold">
                        Mensalidade (R$)
                      </label>
                      {Number(empresaForm.valor_mensalidade) === 0 && (
                        <span className="text-[10px] text-emerald-400 font-bold">Grátis</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={empresaForm.valor_mensalidade}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, valor_mensalidade: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Dia de Vencimento
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={empresaForm.dia_vencimento}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, dia_vencimento: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Status de Acesso da Licença
                    </label>
                    <select
                      value={empresaForm.ativo}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, ativo: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                    >
                      <option value={1}>✓ Ativa (Acesso Liberado)</option>
                      <option value={0}>✕ Bloqueada / Suspensa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* METODOLOGIA OPERACIONAL DA LICENÇA */}
              <div className="p-4 rounded-2xl bg-indigo-950/25 border border-indigo-500/40 space-y-3">
                <h4 className="font-bold text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Metodologia Operacional da Licença</span>
                </h4>

                <div className={`grid grid-cols-1 ${empresaForm.modo_operacao === 'agenciamento_repasse' ? 'sm:grid-cols-2' : ''} gap-3`}>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Forma de Trabalho / Regra de Cálculo</label>
                    <select
                      value={empresaForm.modo_operacao}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, modo_operacao: e.target.value })}
                      className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="padrao">🚚 Subcontratação Tradicional (Freteiro)</option>
                      <option value="agenciamento_repasse">📊 Agenciamento & Repasse (Comissão Fixa % + Repasse)</option>
                      <option value="gestao_pagamentos">💼 Organização & Gestão de Pagamentos (Rateio Livre em R$)</option>
                    </select>
                  </div>

                  {empresaForm.modo_operacao === 'agenciamento_repasse' && (
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Comissão Padrão da Agência (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={empresaForm.percentual_comissao_padrao}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, percentual_comissao_padrao: e.target.value })}
                        className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                  {empresaForm.modo_operacao === 'gestao_pagamentos'
                    ? '💼 Modo Organização & Gestão de Pagamentos: Criado especificamente para empresas contratantes que são CLIENTES de agenciadores de frete. A empresa NÃO emite CT-e nem MDF-e (módulos fiscais e frotas ficam ocultos) e NÃO fatura frete a receber. O operador informa livremente os valores em R$ para cada parte (Freteiro, Agenciador e Repasse) no momento da importação do CT-e.'
                    : empresaForm.modo_operacao === 'agenciamento_repasse'
                    ? '💡 Modo Agenciamento & Repasse: Ao importar o CT-e, o operador digita o Frete Real. O sistema retém automaticamente a comissão da empresa e calcula o Valor de Repasse (CT-e - Frete Real - Comissão).'
                    : '💡 Modo Subcontratação Padrão: Frete Venda - Frete Compra = Margem / Adiantamento e Saldo do Motorista.'}
                </p>
              </div>

              {/* MÓDULOS E ABAS HABILITADAS PARA A LICENÇA */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Abas & Módulos Habilitados nesta Licença</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Selecione quais abas a transportadora terá acesso para definir o plano e valor cobrado.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEmpresaForm({
                        ...empresaForm,
                        modulos_ativos: MODULOS_SISTEMA.map(m => m.id)
                      })}
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold transition cursor-pointer"
                    >
                      💎 Plano Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpresaForm({
                        ...empresaForm,
                        modulos_ativos: ['dashboard', 'importar_xml', 'torre_controle', 'financeiro', 'relatorios', 'motoristas', 'clientes', 'configuracoes']
                      })}
                      className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[10px] font-bold transition cursor-pointer"
                    >
                      🚚 Subcontratação (Sem CT-e/MDF-e)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpresaForm({
                        ...empresaForm,
                        modulos_ativos: ['dashboard', 'importar_xml', 'financeiro', 'relatorios', 'motoristas', 'clientes', 'configuracoes']
                      })}
                      className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold transition cursor-pointer"
                    >
                      💼 Gestão de Pagamentos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {MODULOS_SISTEMA.map((modulo) => {
                    const isAtivo = empresaForm.modulos_ativos?.includes(modulo.id);
                    return (
                      <div
                        key={modulo.id}
                        onClick={() => {
                          const atuais = empresaForm.modulos_ativos || [];
                          let novos;
                          if (atuais.includes(modulo.id)) {
                            if (atuais.length <= 1) return; // Não permitir desmarcar todos os módulos
                            novos = atuais.filter(id => id !== modulo.id);
                          } else {
                            novos = [...atuais, modulo.id];
                          }
                          setEmpresaForm({ ...empresaForm, modulos_ativos: novos });
                        }}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                          isAtivo 
                            ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500' 
                            : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-90 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAtivo}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{modulo.nome}</span>
                            {modulo.tagFiscal && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">
                                Fiscal SEFAZ
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{modulo.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DADOS CADASTRAIS DA EMPRESA */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Dados Cadastrais da Empresa</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={empresaForm.razao_social}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, razao_social: e.target.value })}
                      placeholder="Ex: Transportadora Sol Nascente Ltda"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      value={empresaForm.nome_fantasia}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, nome_fantasia: e.target.value })}
                      placeholder="Ex: Sol Nascente Log"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={empresaForm.cnpj}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={empresaForm.telefone}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">E-mail</label>
                    <input
                      type="email"
                      value={empresaForm.email}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Cidade</label>
                    <input
                      type="text"
                      value={empresaForm.cidade}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, cidade: e.target.value })}
                      placeholder="Ex: Salvador, Curitiba..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={empresaForm.uf}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, uf: e.target.value.toUpperCase() })}
                      placeholder="PR, BA, SP..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* PRIMEIRO LOGIN DE ADMINISTRADOR (APENAS NA CRIAÇÃO) */}
              {!editingEmpresa && (
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <h4 className="font-bold text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>Primeiro Usuário Administrador da Empresa (Opcional)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ao preencher, o sistema criará imediatamente o login de acesso do cliente para esta licença.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nome do Administrador</label>
                      <input
                        type="text"
                        value={empresaForm.admin_name}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, admin_name: e.target.value })}
                        placeholder="Ex: João da Silva"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">E-mail de Login</label>
                      <input
                        type="email"
                        value={empresaForm.admin_email}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, admin_email: e.target.value })}
                        placeholder="admin@empresa.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Senha Inicial</label>
                      <input
                        type="password"
                        value={empresaForm.admin_password}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, admin_password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpresaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEmpresa}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEmpresa ? 'Salvando...' : editingEmpresa ? 'Salvar Alterações' : 'Criar Licença & Gerar Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CRIAÇÃO / EDIÇÃO DE USUÁRIO GLOBAL */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Users className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  {editingUser ? `Editar Usuário: ${editingUser.name}` : 'Cadastrar Usuário'}
                </h3>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {userModalError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{userModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Licença / Empresa Contratante</label>
                <select
                  value={userForm.empresa_id}
                  onChange={(e) => setUserForm({ ...userForm, empresa_id: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      ID #{emp.codigo_licenca || emp.id} - {emp.nome_fantasia || emp.razao_social}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Nome do colaborador"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail (Login de Acesso)</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@empresa.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {editingUser ? 'Nova Senha (Deixe em branco para manter a atual)' : 'Senha de Acesso'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nível de Permissão</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  <option value="admin">Administrador da Licença</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="operador">Operador Logístico</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
