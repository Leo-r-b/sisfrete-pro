import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Lock, 
  User, 
  Users, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  Edit, 
  Trash2,
  KeyRound,
  DollarSign,
  AlertTriangle,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  MapPin,
  Phone,
  Mail,
  ArrowRightLeft,
  Briefcase,
  Layers,
  Key
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MODULOS_SISTEMA } from './SaasMasterPanel';

export default function Configuracoes() {
  const { user, updateProfile, changePassword, empresas, activeEmpresa, switchEmpresa, loadEmpresas, refreshCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'usuarios' | 'empresas' | 'empresa' | 'database'

  // Perfil State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Troca de Senha State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showUserModalPassword, setShowUserModalPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  // Usuários do Sistema State (Admin)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operador',
    empresa_id: 1,
    permiteOperacional: true,
    permiteFinanceiro: false,
    isAdminLicenca: false,
    isSuperAdminUser: false
  });
  const [userModalError, setUserModalError] = useState('');

  // Empresas & Licenças State (Admin)
  const [empresasDetailedList, setEmpresasDetailedList] = useState([]);
  const [loadingEmpresasList, setLoadingEmpresasList] = useState(false);
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
  const [editingEmpresaObj, setEditingEmpresaObj] = useState(null);
  const [empresaModalFormData, setEmpresaModalFormData] = useState({
    codigo_licenca: '',
    limite_logins: 5,
    valor_mensalidade: 350.00,
    dia_vencimento: 10,
    tipo_licenca: 'paga',
    data_expiracao_teste: '',
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
  });
  const [empresaModalError, setEmpresaModalError] = useState('');
  const [savingEmpresaModal, setSavingEmpresaModal] = useState(false);

  // Empresa Config State (Empresa Ativa)
  const [empresaData, setEmpresaData] = useState({
    codigo_licenca: '',
    limite_logins: 5,
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
  });
  const [empresaMsg, setEmpresaMsg] = useState({ type: '', text: '' });
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  // Reset Database & Multi-Tenant Purge State (Admin / Super Admin)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resettingDb, setResettingDb] = useState(false);
  const [dbMsg, setDbMsg] = useState({ type: '', text: '' });
  const [dbStatsList, setDbStatsList] = useState([]);
  const [loadingDbStats, setLoadingDbStats] = useState(false);
  const [selectedEmpresaForPurge, setSelectedEmpresaForPurge] = useState(activeEmpresa?.id || 1);
  const [purgeScope, setPurgeScope] = useState('operacional'); // 'operacional' | 'completo' | 'global_todos'

  // Configurações Fiscais & Certificado A1 State
  const [fiscalData, setFiscalData] = useState({
    ambiente: 'homologacao',
    serie_cte: 1,
    ultimo_numero_cte: 0,
    rntrc_padrao: '12345678',
    aliquota_icms_padrao: 12.0,
    cst_icms_padrao: '00',
    cfop_padrao_estadual: '5353',
    cfop_padrao_interestadual: '6353',
    natureza_operacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    certificado_senha: '',
    certificado_validade: null,
    certificado_titular: null,
    certificado_cnpj: null,
    possui_certificado: false
  });
  const [certFile, setCertFile] = useState(null);
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [fiscalMsg, setFiscalMsg] = useState({ type: '', text: '' });
  const [sefazStatus, setSefazStatus] = useState(null);
  const [testingSefaz, setTestingSefaz] = useState(false);
  const [showCertPassword, setShowCertPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Carregar lista de usuários da empresa ou de todas (se super_admin)
  const loadUsers = async () => {
    if (!['admin', 'super_admin'].includes(user?.role)) return;
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

  // Carregar lista detalhada de empresas e licenças (Exclusivo do Super Admin / Ghost Master)
  const fetchEmpresasDetailed = async () => {
    if (user?.role !== 'super_admin') return;
    try {
      setLoadingEmpresasList(true);
      const res = await api.get('/empresas');
      setEmpresasDetailedList(res.data);
    } catch (err) {
      console.error('Erro ao carregar lista de empresas:', err);
    } finally {
      setLoadingEmpresasList(false);
    }
  };

  // Carregar dados da empresa ativa
  const loadEmpresa = async () => {
    try {
      const res = await api.get('/empresa');
      if (res.data) {
        setEmpresaData(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err);
    }
  };

  // Carregar dados fiscais
  const loadFiscalConfig = async () => {
    try {
      const res = await api.get('/fiscal/config');
      if (res.data) {
        setFiscalData(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações fiscais:', err);
    }
  };

  const handleTestSefaz = async () => {
    setTestingSefaz(true);
    try {
      const res = await api.post('/fiscal/test-sefaz');
      setSefazStatus(res.data);
    } catch (err) {
      setSefazStatus({
        online: false,
        xMotivo: err.response?.data?.error || 'Erro ao consultar SEFAZ'
      });
    } finally {
      setTestingSefaz(false);
    }
  };

  const handleSaveFiscal = async (e) => {
    e.preventDefault();
    setSavingFiscal(true);
    setFiscalMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('ambiente', fiscalData.ambiente);
      formData.append('serie_cte', fiscalData.serie_cte);
      formData.append('ultimo_numero_cte', fiscalData.ultimo_numero_cte);
      formData.append('rntrc_padrao', fiscalData.rntrc_padrao);
      formData.append('aliquota_icms_padrao', fiscalData.aliquota_icms_padrao);
      formData.append('cst_icms_padrao', fiscalData.cst_icms_padrao);
      formData.append('cfop_padrao_estadual', fiscalData.cfop_padrao_estadual);
      formData.append('cfop_padrao_interestadual', fiscalData.cfop_padrao_interestadual);
      formData.append('natureza_operacao', fiscalData.natureza_operacao);
      
      if (fiscalData.certificado_senha) {
        formData.append('certificado_senha', fiscalData.certificado_senha);
      }
      if (certFile) {
        formData.append('certificado', certFile);
      }

      const res = await api.put('/fiscal/config', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFiscalMsg({ type: 'success', text: 'Configurações fiscais e Certificado Digital salvos com sucesso!' });
      if (res.data?.config) {
        setFiscalData(res.data.config);
      }
      setCertFile(null);
    } catch (err) {
      setFiscalMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar configurações fiscais.' });
    } finally {
      setSavingFiscal(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      loadUsers();
      fetchEmpresasDetailed();
      loadEmpresa();
      loadFiscalConfig();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'usuarios') {
      loadUsers();
    } else if (activeTab === 'empresas') {
      fetchEmpresasDetailed();
    } else if (activeTab === 'empresa') {
      loadEmpresa();
    } else if (activeTab === 'fiscal') {
      loadFiscalConfig();
    } else if (activeTab === 'database') {
      fetchDbStats();
    }
  }, [activeTab]);

  // Salvar Alteração de Perfil (Login/Nome)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });

    const res = await updateProfile({ name, email });
    if (res.success) {
      setProfileMsg({ type: 'success', text: 'Seus dados foram atualizados com sucesso!' });
      await loadUsers();
      if (user?.role === 'super_admin') {
        fetchEmpresasDetailed();
      }
    } else {
      setProfileMsg({ type: 'error', text: res.error });
    }
    setSavingProfile(false);
  };

  // Salvar Troca de Senha
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'A confirmação de senha não confere com a nova senha.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setSavingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({ type: 'success', text: 'Sua senha foi alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg({ type: 'error', text: res.error });
    }
    setSavingPassword(false);
  };

  // Salvar Configurações da Empresa Ativa
  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    setSavingEmpresa(true);
    setEmpresaMsg({ type: '', text: '' });

    try {
      const res = await api.put('/empresa', empresaData);
      setEmpresaMsg({ type: 'success', text: 'Dados da licença ativa atualizados com sucesso!' });
      if (res.data?.empresa) {
        setEmpresaData(res.data.empresa);
      }
      await loadEmpresas();
      fetchEmpresasDetailed();
    } catch (err) {
      setEmpresaMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar dados.' });
    } finally {
      setSavingEmpresa(false);
    }
  };

  // Gestão de Usuários com Múltiplas Permissões
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'operador',
      empresa_id: activeEmpresa?.id || user?.empresa_id || 1,
      permiteOperacional: true,
      permiteFinanceiro: false,
      isAdminLicenca: false,
      isSuperAdminUser: false
    });
    setUserModalError('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    const isSuper = u.role === 'super_admin';
    const isAdmin = u.role === 'admin';
    const isOpFin = u.role === 'operador_financeiro';
    const isOp = u.role === 'operador';
    const isFin = u.role === 'financeiro';

    setUserFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      empresa_id: u.empresa_id || activeEmpresa?.id || user?.empresa_id || 1,
      permiteOperacional: isOp || isOpFin || isAdmin || isSuper,
      permiteFinanceiro: isFin || isOpFin || isAdmin || isSuper,
      isAdminLicenca: isAdmin,
      isSuperAdminUser: isSuper
    });
    setUserModalError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserModalError('');

    let finalRole = 'operador';
    if (userFormData.isSuperAdminUser && user?.role === 'super_admin') {
      finalRole = 'super_admin';
    } else if (userFormData.isAdminLicenca) {
      finalRole = 'admin';
    } else {
      if (userFormData.permiteOperacional && userFormData.permiteFinanceiro) {
        finalRole = 'operador_financeiro';
      } else if (userFormData.permiteOperacional) {
        finalRole = 'operador';
      } else if (userFormData.permiteFinanceiro) {
        finalRole = 'financeiro';
      } else {
        setUserModalError('Selecione ao menos uma permissão para o usuário da equipe (Operacional ou Financeiro).');
        return;
      }
    }

    try {
      const payload = {
        name: userFormData.name,
        email: userFormData.email,
        password: userFormData.password,
        role: finalRole,
        empresa_id: userFormData.empresa_id
      };

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        // Se o usuário editado for o próprio usuário logado,
        // atualiza o AuthContext via API para sincronizar "Minha Conta" e o header
        if (editingUser.id === user?.id) {
          await refreshCurrentUser();
        }
      } else {
        await api.post('/users', payload);
      }
      setIsUserModalOpen(false);
      await loadUsers();
      if (user?.role === 'super_admin') {
        fetchEmpresasDetailed();
      }
    } catch (err) {
      setUserModalError(err.response?.data?.error || 'Erro ao salvar usuário.');
    }
  };

  const handleDeleteUser = async (id, userName) => {
    if (!window.confirm(`Deseja excluir o usuário "${userName}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
      fetchEmpresasDetailed();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário.');
    }
  };

  // Gestão de Empresas / Licenças
  const handleOpenNewEmpresa = () => {
    setEditingEmpresaObj(null);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const expTeste = d.toISOString().slice(0, 10);

    setEmpresaModalFormData({
      codigo_licenca: '',
      limite_logins: 5,
      valor_mensalidade: 350.00,
      dia_vencimento: 10,
      tipo_licenca: 'paga',
      data_expiracao_teste: expTeste,
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
    });
    setEmpresaModalError('');
    setIsEmpresaModalOpen(true);
  };

  const handleOpenEditEmpresa = (emp) => {
    setEditingEmpresaObj(emp);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const expTeste = d.toISOString().slice(0, 10);

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

    setEmpresaModalFormData({
      codigo_licenca: emp.codigo_licenca || String(emp.id),
      limite_logins: emp.limite_logins || 5,
      valor_mensalidade: emp.valor_mensalidade !== undefined && emp.valor_mensalidade !== null ? Number(emp.valor_mensalidade) : 350.00,
      dia_vencimento: emp.dia_vencimento !== undefined ? emp.dia_vencimento : 10,
      tipo_licenca: emp.tipo_licenca || (Number(emp.valor_mensalidade) === 0 ? 'gratuita' : 'paga'),
      data_expiracao_teste: emp.data_expiracao_teste || expTeste,
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
    });
    setEmpresaModalError('');
    setIsEmpresaModalOpen(true);
  };

  const handleSaveEmpresaModal = async (e) => {
    e.preventDefault();
    setEmpresaModalError('');
    setSavingEmpresaModal(true);

    try {
      if (editingEmpresaObj) {
        await api.put(`/empresas/${editingEmpresaObj.id}`, empresaModalFormData);
      } else {
        await api.post('/empresas', empresaModalFormData);
      }
      setIsEmpresaModalOpen(false);
      await fetchEmpresasDetailed();
      await loadEmpresas();
      loadEmpresa();
    } catch (err) {
      setEmpresaModalError(err.response?.data?.error || 'Erro ao salvar licença / empresa.');
    } finally {
      setSavingEmpresaModal(false);
    }
  };

  const handleDeleteEmpresa = async (id, nomeEmpresa) => {
    if (!window.confirm(`Deseja realmente excluir a Licença "${nomeEmpresa}"? Todos os seus dados vinculados serão excluídos permanentemente.`)) {
      return;
    }
    try {
      await api.delete(`/empresas/${id}`);
      await fetchEmpresasDetailed();
      await loadEmpresas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir empresa.');
    }
  };

  // Buscar estatísticas de registros do banco de dados por empresa / licença
  const fetchDbStats = async () => {
    if (!['admin', 'super_admin'].includes(user?.role)) return;
    setLoadingDbStats(true);
    try {
      const res = await api.get('/config/database-stats');
      if (res.data?.empresas) {
        setDbStatsList(res.data.empresas);
        if (user?.role !== 'super_admin' && activeEmpresa?.id) {
          setSelectedEmpresaForPurge(activeEmpresa.id);
        } else if (res.data.empresas.length > 0 && !selectedEmpresaForPurge) {
          setSelectedEmpresaForPurge(res.data.empresas[0].empresa_id);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar estatísticas do banco de dados:', err);
    } finally {
      setLoadingDbStats(false);
    }
  };

  // Reset / Limpeza de Dados por Licença (Estrutura 100% preservada)
  const handleExecutarReset = async () => {
    const inputUpper = resetConfirmInput.trim().toUpperCase();
    if (inputUpper !== 'CONFIRMAR' && inputUpper !== 'LIMPAR BANCO' && inputUpper !== 'APAGAR') {
      alert('Por favor, digite exatamente "CONFIRMAR" para autorizar a exclusão dos dados.');
      return;
    }

    setResettingDb(true);
    setDbMsg({ type: '', text: '' });

    try {
      const targetId = user?.role === 'super_admin' ? selectedEmpresaForPurge : (activeEmpresa?.id || 1);
      const isAll = targetId === 'all';
      const res = await api.post('/config/reset-database', {
        empresa_id: isAll ? undefined : Number(targetId),
        scope: isAll ? 'global_todos' : purgeScope
      });

      setDbMsg({ type: 'success', text: res.data.message || 'Dados limpos com sucesso!' });
      setIsResetModalOpen(false);
      setResetConfirmInput('');
      await fetchDbStats();
      await loadEmpresas();
      if (user?.role === 'super_admin') {
        fetchEmpresasDetailed();
      }
    } catch (err) {
      setDbMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao limpar dados do banco de dados.' });
    } finally {
      setResettingDb(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">Painel de Configurações & Acesso</h1>
        <p className="text-xs text-slate-400">Gestão de Licenças (IDs), controle de logins permitidos, segurança e manutenção</p>
      </div>

      {/* Navegação de Abas Responsiva */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'perfil'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Minha Conta</span>
        </button>

        {/* ABA EXCLUSIVA DO GHOST MASTER / SUPER_ADMIN */}
        {user?.role === 'super_admin' && (
          <button
            onClick={() => setActiveTab('empresas')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'empresas'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-purple-300'
            }`}
          >
            <KeyRound className="h-4 w-4 text-purple-400" />
            <span>Licenças & Empresas (Master)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold">
              {empresasDetailedList.length || empresas.length}
            </span>
          </button>
        )}

        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'usuarios'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuários & Permissões</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {usersList.length}
            </span>
          </button>
        )}

        {/* ABA DE DADOS DA EMPRESA (ADMIN OU SUPER_ADMIN) */}
        {['admin', 'super_admin'].includes(user?.role) && (
          <button
            onClick={() => setActiveTab('empresa')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'empresa'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Dados da Licença Ativa</span>
          </button>
        )}

        {/* ABA DE EMISSÃO FISCAL & CERTIFICADO A1 (ADMIN OU SUPER_ADMIN) */}
        {['admin', 'super_admin'].includes(user?.role) && (
          <button
            onClick={() => setActiveTab('fiscal')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'fiscal'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-emerald-300'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Emissão Fiscal & Certificado A1</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              fiscalData.ambiente === 'producao' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {fiscalData.ambiente === 'producao' ? 'PROD' : 'HOMOLOG'}
            </span>
          </button>
        )}

        {/* ABA DE FILIAIS E LICENÇAS (EXCLUSIVO GHOST MASTER / SUPER_ADMIN) */}
        {user?.role === 'super_admin' && (
          <button
            onClick={() => setActiveTab('empresas')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'empresas'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-purple-300'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Filiais & Licenças Multi-Tenant</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-300 font-mono">
              {empresasDetailedList.length || empresas.length}
            </span>
          </button>
        )}

        {/* ABA DE LIMPEZA DO BANCO DE DADOS (ADMIN OU SUPER_ADMIN / GHOST MASTER) */}
        {['admin', 'super_admin'].includes(user?.role) && (
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'database'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-rose-300'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Banco de Dados (Limpeza)</span>
          </button>
        )}
      </div>

      {/* ABA 1: MINHA CONTA & ALTERAÇÃO DE SENHA */}
      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Card 1: Alteração de Dados de Login / Perfil */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-blue-400 border-b border-slate-800 pb-3">
              <User className="h-5 w-5" />
              <h3 className="font-heading font-bold text-base text-white">Dados de Identificação & Login</h3>
            </div>

            {profileMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                profileMsg.type === 'success' 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail de Login</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nível de Acesso</label>
                <input
                  type="text"
                  disabled
                  value={
                    user?.role === 'super_admin' 
                      ? '👑 Super Admin / Ghost Master (SaaS Owner)' 
                      : user?.role === 'admin' 
                        ? 'Administrador da Licença' 
                        : user?.role === 'financeiro' 
                          ? 'Financeiro' 
                          : 'Operador / Lançador'
                  }
                  className="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed uppercase font-semibold text-[11px]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações de Perfil'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Alteração de Senha */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 border-b border-slate-800 pb-3">
              <Lock className="h-5 w-5" />
              <h3 className="font-heading font-bold text-base text-white">Alteração de Senha</h3>
            </div>

            {passwordMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                passwordMsg.type === 'success' 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Senha Atual</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showCurrentPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showNewPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingPassword ? 'Alterando...' : 'Confirmar e Alterar Senha'}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ABA: GESTÃO DE LICENÇAS & EMPRESAS (MULTI-TENANT COM ID DE LICENÇA) */}
      {activeTab === 'empresas' && user?.role === 'super_admin' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">Licenças & Empresas Multi-Tenant</h3>
              <p className="text-xs text-slate-400">
                Cada empresa possui seu próprio <strong>ID de Licença</strong> para login (ex: ID 250, ID 199) e limite de logins cadastrados.
              </p>
            </div>
            <button
              onClick={handleOpenNewEmpresa}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Licença / Empresa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {empresasDetailedList.map((emp) => {
              const isCurrent = Number(emp.id) === Number(activeEmpresa?.id);
              const limite = emp.limite_logins || 5;
              const usados = emp.total_usuarios || 0;
              const percentUsado = Math.min(100, Math.round((usados / limite) * 100));

              return (
                <div
                  key={emp.id}
                  className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-blue-950/30 border-blue-500/60 shadow-lg shadow-blue-950/40'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header do Card com o ID da Licença em Destaque */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-mono font-black text-sm flex items-center gap-1.5">
                          <KeyRound className="h-4 w-4" />
                          <span>ID {emp.codigo_licenca || emp.id}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-heading">
                            {emp.nome_fantasia || emp.razao_social}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {emp.razao_social}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Ativa Agora
                        </span>
                      ) : (
                        <button
                          onClick={() => switchEmpresa(emp.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-[11px] font-bold transition border border-slate-700"
                          title="Alternar para esta licença"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Alternar</span>
                        </button>
                      )}
                    </div>

                    {/* Barra de Logins Utilizados vs Limite da Licença */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Capacidade de Logins:</span>
                        <span className="font-bold font-mono text-white">
                          {usados} / {limite} usuários
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            percentUsado >= 100 ? 'bg-rose-500' : percentUsado >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentUsado}%` }}
                        />
                      </div>
                    </div>

                    {/* Informações Cadastrais */}
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
                      {emp.chave_pix && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">PIX:</span>
                          <span className="font-mono text-slate-300 text-[11px] truncate">{emp.chave_pix}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span><strong>{emp.total_fretes || 0}</strong> fretes registrados</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditEmpresa(emp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                        title="Editar Licença & Limite"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      {empresasDetailedList.length > 1 && (
                        <button
                          onClick={() => handleDeleteEmpresa(emp.id, emp.nome_fantasia || emp.razao_social)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                          title="Excluir Licença e seus dados"
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

      {/* ABA 2: GESTÃO DE USUÁRIOS & PERMISSÕES (ADMIN OU SUPER_ADMIN) */}
      {activeTab === 'usuarios' && ['admin', 'super_admin'].includes(user?.role) && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">Usuários & Permissões da Equipe</h3>
              <p className="text-xs text-slate-400">
                Controle de logins vinculados à Licença ativa: <strong className="text-white">ID #{activeEmpresa?.codigo_licenca || activeEmpresa?.id}</strong>.
              </p>
            </div>
            <button
              onClick={handleOpenNewUser}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="px-3 py-2.5">E-mail (Login)</th>
                  <th className="px-3 py-2.5">Licença / Empresa</th>
                  <th className="px-3 py-2.5 text-center">Permissões</th>
                  <th className="px-3 py-2.5">Criado em</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2.5 font-semibold text-white">
                      {u.name}
                      {u.id === user.id && <span className="ml-2 text-[10px] text-blue-400 font-normal">(Você)</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-300 text-[11px]">{u.email}</td>
                    <td className="px-3 py-2.5 text-slate-300 font-medium">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950 border border-blue-800/50 text-blue-300 text-[11px]">
                        <KeyRound className="h-3 w-3 text-blue-400" />
                        <span>ID #{u.empresa_id || 1} • {u.empresa_nome || 'Matriz'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {u.role === 'super_admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          👑 Super Admin
                        </span>
                      ) : u.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          👑 Administrador
                        </span>
                      ) : u.role === 'operador_financeiro' ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            🚚 Operacional
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            💰 Financeiro
                          </span>
                        </div>
                      ) : u.role === 'financeiro' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          💰 Financeiro
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          🚚 Operacional
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: DADOS DA LICENÇA ATIVA */}
      {activeTab === 'empresa' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 sm:space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                Dados da Licença Ativa: {activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'Empresa Matriz'}
              </h3>
              <p className="text-xs text-slate-400">Estes dados serão impressos automaticamente nos recibos emitidos por esta licença</p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Licença #{activeEmpresa?.codigo_licenca || activeEmpresa?.id || 1}</span>
            </span>
          </div>

          {empresaMsg.text && (
            <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              empresaMsg.type === 'success' 
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
            }`}>
              {empresaMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              <span>{empresaMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveEmpresa} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Razão Social</label>
                <input
                  type="text"
                  required
                  value={empresaData.razao_social || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, razao_social: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Fantasia (Filial)</label>
                <input
                  type="text"
                  value={empresaData.nome_fantasia || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, nome_fantasia: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={empresaData.cnpj || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, cnpj: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={empresaData.telefone || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, telefone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail Comercial</label>
                <input
                  type="email"
                  value={empresaData.email || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cidade</label>
                <input
                  type="text"
                  value={empresaData.cidade || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, cidade: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">UF (Estado)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={empresaData.uf || ''}
                  onChange={(e) => setEmpresaData({ ...empresaData, uf: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Chave PIX da Empresa (Recebimentos)</label>
              <input
                type="text"
                value={empresaData.chave_pix || ''}
                onChange={(e) => setEmpresaData({ ...empresaData, chave_pix: e.target.value })}
                placeholder="CNPJ ou Chave Aleatória"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingEmpresa}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {savingEmpresa ? 'Salvando...' : 'Salvar Dados da Licença Ativa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA: EMISSÃO FISCAL & CERTIFICADO DIGITAL A1 (CT-E 4.00) */}
      {activeTab === 'fiscal' && (
        <div className="space-y-6">
          
          {/* Card de Status da SEFAZ em Tempo Real */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <h3 className="font-heading font-bold text-base text-white">Comunicação com a SEFAZ (CT-e 4.00 Síncrono)</h3>
                  <p className="text-xs text-slate-400">Validação em tempo real dos WebServices autorizadores estaduais</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSefaz}
                disabled={testingSefaz}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingSefaz ? 'animate-spin' : ''}`} />
                <span>{testingSefaz ? 'Consultando SEFAZ...' : 'Testar Conexão SEFAZ'}</span>
              </button>
            </div>

            {sefazStatus && (
              <div className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
                sefazStatus.online 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {sefazStatus.online ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400 mt-0.5" /> : <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400 mt-0.5" />}
                <div className="space-y-1">
                  <p className="font-bold text-sm text-white">
                    {sefazStatus.xMotivo} (Status {sefazStatus.cStat || '107'})
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Ambiente Ativo: <strong>{sefazStatus.ambiente}</strong> • Versão: <strong>{sefazStatus.versaoAplicativo || '4.00'}</strong> • Latência: <strong>{sefazStatus.tempoResposta || '45ms'}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Formulário Principal de Configurações Fiscais */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 text-blue-400 border-b border-slate-800 pb-3">
              <Settings className="h-5 w-5" />
              <div>
                <h3 className="font-heading font-bold text-base text-white">Parâmetros de Emissão & Certificado Digital A1</h3>
                <p className="text-xs text-slate-400">Configure o ambiente de testes ou produção fiscal para emissão de CT-e</p>
              </div>
            </div>

            {fiscalMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                fiscalMsg.type === 'success' 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}>
                {fiscalMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                <span>{fiscalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveFiscal} className="space-y-5 text-xs">
              
              {/* 1. SELETOR DE AMBIENTE (HOMOLOGAÇÃO X PRODUÇÃO) */}
              <div>
                <label className="block text-slate-300 font-bold mb-2">Ambiente de Emissão SEFAZ*</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    fiscalData.ambiente === 'homologacao'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-md'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="ambiente"
                      value="homologacao"
                      checked={fiscalData.ambiente === 'homologacao'}
                      onChange={(e) => setFiscalData({ ...fiscalData, ambiente: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-bold text-sm text-white">🧪 Homologação (Ambiente de Testes)</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Permite emitir, cancelar e testar CT-es à vontade sem gerar impostos ou cobranças reais na SEFAZ. (Recomendado para início)
                      </p>
                    </div>
                  </label>

                  <label className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    fiscalData.ambiente === 'producao'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-md'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="ambiente"
                      value="producao"
                      checked={fiscalData.ambiente === 'producao'}
                      onChange={(e) => setFiscalData({ ...fiscalData, ambiente: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-bold text-sm text-white">🟢 Produção (Emissão Fiscal Real)</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Emissão oficial de CT-e com validade jurídica perante a Receita Federal e SEFAZs estaduais.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. UPLOAD E DIAGNÓSTICO DO CERTIFICADO DIGITAL A1 */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Key className="h-4 w-4 text-blue-400" />
                    <span>Certificado Digital A1 (.pfx / .p12)</span>
                  </div>
                  {fiscalData.possui_certificado ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Certificado Ativo</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Motor Sandbox Ativo</span>
                    </span>
                  )}
                </div>

                {fiscalData.certificado_titular && (
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-300">
                    <p><strong>Titular:</strong> <span className="text-white">{fiscalData.certificado_titular}</span></p>
                    <p><strong>CNPJ:</strong> <span className="text-white font-mono">{fiscalData.certificado_cnpj || '12.345.678/0001-90'}</span></p>
                    <p><strong>Validade:</strong> <span className="text-emerald-400 font-semibold">{fiscalData.certificado_validade ? new Date(fiscalData.certificado_validade).toLocaleDateString('pt-BR') : 'Indeterminada'}</span></p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {fiscalData.possui_certificado ? 'Substituir Arquivo do Certificado (.pfx)' : 'Selecionar Arquivo do Certificado (.pfx)'}
                    </label>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setCertFile(e.target.files[0])}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Senha do Certificado Digital</label>
                    <div className="relative">
                      <input
                        type={showCertPassword ? 'text' : 'password'}
                        value={fiscalData.certificado_senha || ''}
                        onChange={(e) => setFiscalData({ ...fiscalData, certificado_senha: e.target.value })}
                        placeholder={fiscalData.possui_certificado ? '•••••••• (senha gravada)' : 'Digite a senha do .pfx'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white focus:border-blue-500 focus:outline-none font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCertPassword(!showCertPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                      >
                        {showCertPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. PARÂMETROS FISCAIS DA SÉRIE E TRIBUTAÇÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Série do CT-e*</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={fiscalData.serie_cte}
                    onChange={(e) => setFiscalData({ ...fiscalData, serie_cte: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Último Número Emitido</label>
                  <input
                    type="number"
                    min={0}
                    value={fiscalData.ultimo_numero_cte}
                    onChange={(e) => setFiscalData({ ...fiscalData, ultimo_numero_cte: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Próximo CT-e será o Nº {Number(fiscalData.ultimo_numero_cte || 0) + 1}</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">RNTRC da Transportadora*</label>
                  <input
                    type="text"
                    required
                    value={fiscalData.rntrc_padrao || ''}
                    onChange={(e) => setFiscalData({ ...fiscalData, rntrc_padrao: e.target.value })}
                    placeholder="8 dígitos ANTT"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Alíquota Padrão ICMS (%)*</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={fiscalData.aliquota_icms_padrao}
                    onChange={(e) => setFiscalData({ ...fiscalData, aliquota_icms_padrao: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CST / Tributação ICMS</label>
                  <select
                    value={fiscalData.cst_icms_padrao}
                    onChange={(e) => setFiscalData({ ...fiscalData, cst_icms_padrao: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="00">00 - Tributado Integralmente</option>
                    <option value="40">40 - Isento</option>
                    <option value="60">60 - ICMS Cobrado por ST</option>
                    <option value="90">90 - Outros / Simples Nacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CFOP Transporte Estadual / Interestadual</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={fiscalData.cfop_padrao_estadual}
                      onChange={(e) => setFiscalData({ ...fiscalData, cfop_padrao_estadual: e.target.value })}
                      placeholder="5353"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={fiscalData.cfop_padrao_interestadual}
                      onChange={(e) => setFiscalData({ ...fiscalData, cfop_padrao_interestadual: e.target.value })}
                      placeholder="6353"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Natureza da Operação Padrão</label>
                <input
                  type="text"
                  value={fiscalData.natureza_operacao || ''}
                  onChange={(e) => setFiscalData({ ...fiscalData, natureza_operacao: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingFiscal}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{savingFiscal ? 'Salvando Configurações...' : 'Salvar Configurações Fiscais'}</span>
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* ABA: BANCO DE DADOS & LIMPEZA DE DADOS POR LICENÇA (ADMIN OU SUPER_ADMIN / GHOST MASTER) */}
      {activeTab === 'database' && ['admin', 'super_admin'].includes(user?.role) && (() => {
        const isSuperAdmin = user?.role === 'super_admin';
        const isGlobalAll = selectedEmpresaForPurge === 'all';
        
        const currentStats = isGlobalAll
          ? {
              nome_fantasia: 'TODAS AS LICENÇAS (RESET GERAL DO SISTEMA)',
              codigo_licenca: 'GLOBAL',
              fretes: dbStatsList.reduce((a, b) => a + (b.fretes || 0), 0),
              financeiro: dbStatsList.reduce((a, b) => a + (b.financeiro || 0), 0),
              adiantamentos: dbStatsList.reduce((a, b) => a + (b.adiantamentos || 0), 0),
              rastreamento: dbStatsList.reduce((a, b) => a + (b.rastreamento || 0), 0),
              motoristas: dbStatsList.reduce((a, b) => a + (b.motoristas || 0), 0),
              clientes: dbStatsList.reduce((a, b) => a + (b.clientes || 0), 0),
              mdfes: dbStatsList.reduce((a, b) => a + (b.mdfes || 0), 0),
              manutencoes: dbStatsList.reduce((a, b) => a + (b.manutencoes || 0), 0),
              pneus: dbStatsList.reduce((a, b) => a + (b.pneus || 0), 0),
              cobrancas: dbStatsList.reduce((a, b) => a + (b.cobrancas || 0), 0),
              total_registros: dbStatsList.reduce((a, b) => a + (b.total_registros || 0), 0),
            }
          : (dbStatsList.find(s => String(s.empresa_id) === String(selectedEmpresaForPurge)) || {
              nome_fantasia: activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || `Licença ID #${activeEmpresa?.id || 1}`,
              codigo_licenca: activeEmpresa?.codigo_licenca || activeEmpresa?.id || '1',
              fretes: 0,
              financeiro: 0,
              adiantamentos: 0,
              rastreamento: 0,
              motoristas: 0,
              clientes: 0,
              mdfes: 0,
              manutencoes: 0,
              pneus: 0,
              cobrancas: 0,
              total_registros: 0
            });

        return (
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 sm:space-y-6">
            
            {/* Header da Aba */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                    Gerenciador & Limpeza de Dados por Licença
                  </h3>
                  <p className="text-xs text-slate-400">
                    Exclusão segura de dados operacionais e financeiros por filial ou geral. A estrutura das tabelas permanece intacta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchDbStats}
                disabled={loadingDbStats}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingDbStats ? 'animate-spin text-blue-400' : ''}`} />
                <span>{loadingDbStats ? 'Atualizando...' : 'Recarregar Contagens'}</span>
              </button>
            </div>

            {/* Mensagem de Feedback */}
            {dbMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn ${
                dbMsg.type === 'success' 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}>
                {dbMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                <span>{dbMsg.text}</span>
              </div>
            )}

            {/* SELETOR DE LICENÇA (EXCLUSIVO SUPER ADMIN / GHOST MASTER) */}
            {isSuperAdmin && (
              <div className="space-y-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    1. Selecione a Licença / Empresa que deseja gerenciar ou apagar dados:
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-950/50 px-2 py-0.5 rounded border border-purple-900/50">
                    👑 Modo Ghost Master
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {dbStatsList.map((emp) => {
                    const isSelected = String(selectedEmpresaForPurge) === String(emp.empresa_id);
                    return (
                      <div
                        key={emp.empresa_id}
                        onClick={() => setSelectedEmpresaForPurge(emp.empresa_id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500/60 text-white shadow-md shadow-blue-600/10'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            Licença #{emp.codigo_licenca || emp.empresa_id}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {emp.total_registros} registros
                          </span>
                        </div>
                        <p className="font-bold text-xs truncate" title={emp.nome_fantasia || emp.razao_social}>
                          {emp.nome_fantasia || emp.razao_social}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {emp.cnpj ? `CNPJ: ${emp.cnpj}` : `ID Banco: ${emp.empresa_id}`}
                        </p>
                      </div>
                    );
                  })}

                  {/* Opção Global para Todas as Licenças */}
                  <div
                    onClick={() => setSelectedEmpresaForPurge('all')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      selectedEmpresaForPurge === 'all'
                        ? 'bg-rose-600/20 border-rose-500/60 text-rose-200 shadow-md shadow-rose-600/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-rose-900/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-900/50">
                        GLOBAL (TODAS)
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">
                        {dbStatsList.reduce((a, b) => a + (b.total_registros || 0), 0)} no total
                      </span>
                    </div>
                    <p className="font-bold text-xs text-rose-300 truncate">
                      ⚠️ Todas as Licenças Cadastradas
                    </p>
                    <p className="text-[10px] text-rose-400/70 truncate">
                      Limpeza geral de todas as empresas do sistema
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAINEL DE CONTAGEM DE DADOS ATUAIS DA LICENÇA SELECIONADA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-200">
                  2. Registros Armazenados na Licença Selecionada: <span className="text-blue-400 font-mono">ID #{currentStats.codigo_licenca} - {currentStats.nome_fantasia}</span>
                </label>
                <span className="text-xs text-slate-400">
                  Total: <strong className="text-white font-mono">{currentStats.total_registros || 0}</strong> itens
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">🚚 Fretes & CT-es</p>
                  <p className="text-lg font-black text-white font-mono mt-0.5">{currentStats.fretes || 0}</p>
                  <p className="text-[9px] text-slate-500">Viagens e emissões</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">💰 Títulos Financeiros</p>
                  <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">{currentStats.financeiro || 0}</p>
                  <p className="text-[9px] text-slate-500">Contas a pagar e receber</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">📡 Rastreamento / Torre</p>
                  <p className="text-lg font-black text-blue-400 font-mono mt-0.5">{currentStats.rastreamento || 0}</p>
                  <p className="text-[9px] text-slate-500">Eventos de viagem</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">💵 Adiantamentos / PIX</p>
                  <p className="text-lg font-black text-purple-400 font-mono mt-0.5">{currentStats.adiantamentos || 0}</p>
                  <p className="text-[9px] text-slate-500">Histórico de quitações</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">👤 Motoristas</p>
                  <p className="text-lg font-black text-amber-400 font-mono mt-0.5">{currentStats.motoristas || 0}</p>
                  <p className="text-[9px] text-slate-500">Cadastros de freteiros</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">🏢 Clientes / Tomadores</p>
                  <p className="text-lg font-black text-indigo-400 font-mono mt-0.5">{currentStats.clientes || 0}</p>
                  <p className="text-[9px] text-slate-500">Embarcadores cadastrados</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">📑 Manifestos MDF-e</p>
                  <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">{currentStats.mdfes || 0}</p>
                  <p className="text-[9px] text-slate-500">MDF-e 3.00 emitidos</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">🔧 Manutenção & Frotas</p>
                  <p className="text-lg font-black text-rose-400 font-mono mt-0.5">{(currentStats.manutencoes || 0) + (currentStats.pneus || 0)}</p>
                  <p className="text-[9px] text-slate-500">Pneus e oficinas</p>
                </div>
              </div>
            </div>

            {/* SELEÇÃO DO ESCOPO DE LIMPEZA */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-200">
                3. Escolha o que deseja apagar desta licença:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  purgeScope === 'operacional'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}>
                  <input
                    type="radio"
                    name="purgeScope"
                    value="operacional"
                    checked={purgeScope === 'operacional'}
                    onChange={() => setPurgeScope('operacional')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold text-xs text-white">🚚 Limpar Apenas Operacional & Financeiro (Recomendado)</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Apaga todos os <strong>Fretes, CT-es importados, Rastreamento / Torre, Títulos Financeiros, DRE e Extratos</strong>.
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-1 font-medium">
                      ✓ Mantém: Motoristas, Clientes, Veículos, Logins de acesso e Certificado Digital A1.
                    </p>
                  </div>
                </label>

                <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  purgeScope === 'completo'
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}>
                  <input
                    type="radio"
                    name="purgeScope"
                    value="completo"
                    checked={purgeScope === 'completo'}
                    onChange={() => setPurgeScope('completo')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold text-xs text-white">🧹 Reset Completo da Licença (Operacional + Cadastros)</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Apaga <strong>Fretes, Financeiro, Motoristas, Clientes e Ordens de Manutenção</strong> desta licença.
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-1 font-medium">
                      ✓ Mantém: Usuários de acesso, cadastro da Empresa e Certificado A1.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* GARANTIA DE INTEGRIDADE ESTRUTURAL */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span>Garantia de Integridade e Isolamento do Banco de Dados</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • <strong>A estrutura das tabelas permanece 100% intacta:</strong> A operação executa exclusivamente comandos seguros de limpeza de linhas (<code className="text-emerald-300">DELETE</code>), sem alterar schemas, colunas ou configurações do SQLite/Turso.
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • <strong>Isolamento Multi-Tenant:</strong> Dados de outras empresas e filiais não são afetados quando você limpa uma licença individual.
              </p>
            </div>

            {/* Botão de Disparo */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Alvo Selecionado: <strong className="text-white">{currentStats.nome_fantasia}</strong> (ID #{currentStats.codigo_licenca})
              </span>

              <button
                type="button"
                onClick={() => {
                  setResetConfirmInput('');
                  setIsResetModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Apagar Dados de: {currentStats.nome_fantasia}...</span>
              </button>
            </div>

          </div>
        );
      })()}

      {/* MODAL DE CONFIRMAÇÃO SEGURA DE LIMPEZA DE DADOS */}
      {isResetModalOpen && (() => {
        const isGlobalAll = selectedEmpresaForPurge === 'all';
        const targetEmp = isGlobalAll
          ? { nome_fantasia: 'TODAS AS LICENÇAS (RESET GERAL DO SISTEMA)', codigo_licenca: 'GLOBAL' }
          : (dbStatsList.find(s => String(s.empresa_id) === String(selectedEmpresaForPurge)) || activeEmpresa || { nome_fantasia: 'Licença Ativa', codigo_licenca: '1' });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-heading font-bold text-base text-white">Confirmação de Exclusão de Dados</h3>
                </div>
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs space-y-2">
                <p>
                  Você está prestes a apagar os dados da empresa/licença:
                </p>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-white">
                  <p><strong>Licença:</strong> #{targetEmp.codigo_licenca || targetEmp.id || targetEmp.empresa_id}</p>
                  <p><strong>Empresa:</strong> {targetEmp.nome_fantasia || targetEmp.razao_social}</p>
                  <p><strong>Escopo:</strong> {isGlobalAll ? 'GLOBAL (Todas as Empresas)' : (purgeScope === 'completo' ? 'Reset Completo (Operacional + Cadastros)' : 'Apenas Dados Operacionais & Financeiros')}</p>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">
                  ✓ Lembrando: Apaga apenas os dados da tabela. A estrutura do banco de dados e os logins de usuários permanecem intactos.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <p className="text-slate-400">
                  Para confirmar a exclusão, digite <strong className="text-white">CONFIRMAR</strong> abaixo:
                </p>
                <input
                  type="text"
                  value={resetConfirmInput}
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  placeholder="Digite CONFIRMAR"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center focus:border-rose-500 focus:outline-none uppercase font-bold"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecutarReset}
                  disabled={resetConfirmInput.trim().toUpperCase() !== 'CONFIRMAR' || resettingDb}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  {resettingDb ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  <span>{resettingDb ? 'Apagando dados...' : 'Sim, Apagar Dados Agora'}</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal de Cadastro/Edição de Licença / Empresa */}
      {isEmpresaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <KeyRound className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  {editingEmpresaObj ? `Editar Licença #${editingEmpresaObj.codigo_licenca || editingEmpresaObj.id}` : 'Nova Licença / Empresa Multi-Tenant'}
                </h3>
              </div>
              <button
                onClick={() => setIsEmpresaModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {empresaModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                {empresaModalError}
              </div>
            )}

            <form onSubmit={handleSaveEmpresaModal} className="space-y-3.5 text-xs">
              
              {/* TIPO DE PLANO & PARÂMETROS FINANCEIROS */}
              <div className="p-3.5 bg-slate-950/80 border border-purple-500/40 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-purple-300 font-bold mb-1">Tipo de Licença / Plano*</label>
                    <select
                      value={empresaModalFormData.tipo_licenca}
                      onChange={(e) => {
                        const novoTipo = e.target.value;
                        let novoValor = empresaModalFormData.valor_mensalidade;
                        let novaExp = empresaModalFormData.data_expiracao_teste;
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
                        setEmpresaModalFormData({
                          ...empresaModalFormData,
                          tipo_licenca: novoTipo,
                          valor_mensalidade: novoValor,
                          data_expiracao_teste: novaExp,
                        });
                      }}
                      className="w-full bg-slate-900 border border-purple-500/50 rounded-lg px-3 py-2 text-white focus:border-purple-400 focus:outline-none font-bold"
                    >
                      <option value="paga">💰 Plano Pago Recorrente</option>
                      <option value="teste_7dias">⏱️ Teste Grátis 7 Dias (Trial)</option>
                      <option value="gratuita">🎁 Licença Gratuita / Isenta (R$ 0,00)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-purple-300 font-bold">Mensalidade (R$)</label>
                      {Number(empresaModalFormData.valor_mensalidade) === 0 && (
                        <span className="text-[10px] text-emerald-400 font-bold">Grátis / R$ 0</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={empresaModalFormData.valor_mensalidade}
                      onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, valor_mensalidade: e.target.value })}
                      className="w-full bg-slate-900 border border-purple-500/50 rounded-lg px-3 py-2 text-white focus:border-purple-400 focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Se for teste de 7 dias */}
                {empresaModalFormData.tipo_licenca === 'teste_7dias' && (
                  <div className="p-2.5 bg-blue-950/40 border border-blue-500/40 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-blue-300 font-bold">Data Limite de Expiração do Teste*</label>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setEmpresaModalFormData({ ...empresaModalFormData, data_expiracao_teste: d.toISOString().slice(0, 10) });
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline"
                      >
                        +7 Dias Hoje
                      </button>
                    </div>
                    <input
                      type="date"
                      required
                      value={empresaModalFormData.data_expiracao_teste}
                      onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, data_expiracao_teste: e.target.value })}
                      className="w-full bg-slate-900 border border-blue-500/50 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* ID DA LICENÇA & LIMITE DE LOGINS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl">
                <div>
                  <label className="block text-blue-300 font-bold mb-1">ID / Número da Licença*</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 250, 199, 1001"
                    value={empresaModalFormData.codigo_licenca}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, codigo_licenca: e.target.value })}
                    className="w-full bg-slate-950 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Código digitado na tela de login.</p>
                </div>

                <div>
                  <label className="block text-blue-300 font-bold mb-1">Limite de Logins Permitidos*</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={empresaModalFormData.limite_logins}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, limite_logins: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Qtd. máxima de colaboradores.</p>
                </div>
              </div>

              {/* MÓDULOS E ABAS HABILITADAS PARA A LICENÇA */}
              <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Abas & Módulos Habilitados</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Defina quais abas a transportadora terá acesso neste plano.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEmpresaModalFormData({
                        ...empresaModalFormData,
                        modulos_ativos: MODULOS_SISTEMA.map(m => m.id)
                      })}
                      className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold transition cursor-pointer"
                    >
                      💎 Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpresaModalFormData({
                        ...empresaModalFormData,
                        modulos_ativos: ['dashboard', 'importar_xml', 'torre_controle', 'financeiro', 'relatorios', 'motoristas', 'clientes', 'configuracoes']
                      })}
                      className="px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[9px] font-bold transition cursor-pointer"
                    >
                      🚚 Sem Fiscal
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpresaModalFormData({
                        ...empresaModalFormData,
                        modulos_ativos: ['dashboard', 'importar_xml', 'financeiro', 'relatorios', 'motoristas', 'clientes', 'configuracoes']
                      })}
                      className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold transition cursor-pointer"
                    >
                      💼 Pagamentos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 max-h-48 overflow-y-auto pr-1">
                  {MODULOS_SISTEMA.map((modulo) => {
                    const isAtivo = empresaModalFormData.modulos_ativos?.includes(modulo.id);
                    return (
                      <div
                        key={modulo.id}
                        onClick={() => {
                          const atuais = empresaModalFormData.modulos_ativos || [];
                          let novos;
                          if (atuais.includes(modulo.id)) {
                            if (atuais.length <= 1) return;
                            novos = atuais.filter(id => id !== modulo.id);
                          } else {
                            novos = [...atuais, modulo.id];
                          }
                          setEmpresaModalFormData({ ...empresaModalFormData, modulos_ativos: novos });
                        }}
                        className={`p-2 rounded-lg border transition cursor-pointer flex items-start gap-2 ${
                          isAtivo 
                            ? 'bg-emerald-950/20 border-emerald-500/40' 
                            : 'bg-slate-900/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAtivo}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-white text-[11px]">{modulo.nome}</span>
                            {modulo.tagFiscal && (
                              <span className="text-[8px] font-bold px-1 rounded bg-amber-500/20 text-amber-300">
                                Fiscal
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 truncate">{modulo.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Razão Social da Transportadora*</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Transportadora ABC Ltda"
                    value={empresaModalFormData.razao_social}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, razao_social: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    placeholder="Ex: Transportadora ABC"
                    value={empresaModalFormData.nome_fantasia}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, nome_fantasia: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={empresaModalFormData.cnpj}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, cnpj: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={empresaModalFormData.telefone}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, telefone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Arapongas"
                    value={empresaModalFormData.cidade}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, cidade: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="PR"
                    value={empresaModalFormData.uf}
                    onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, uf: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chave PIX (Para Recibos)</label>
                <input
                  type="text"
                  placeholder="CNPJ, E-mail ou Telefone"
                  value={empresaModalFormData.chave_pix}
                  onChange={(e) => setEmpresaModalFormData({ ...empresaModalFormData, chave_pix: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpresaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEmpresaModal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                >
                  {savingEmpresaModal ? 'Salvando...' : 'Salvar Licença'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição de Usuário da Equipe */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <h3 className="font-heading font-bold text-lg text-white mb-4">
              {editingUser ? 'Editar Usuário & Permissão' : 'Novo Usuário da Equipe'}
            </h3>

            {userModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                {userModalError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo*</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail ou Login*</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Licença / Empresa Vinculada*</label>
                {user?.role === 'super_admin' ? (
                  <select
                    value={userFormData.empresa_id}
                    onChange={(e) => setUserFormData({ ...userFormData, empresa_id: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none font-medium"
                  >
                    {empresasDetailedList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        🔑 Licença #{emp.codigo_licenca || emp.id} - {emp.nome_fantasia || emp.razao_social}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-blue-300 font-semibold text-xs flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-400" />
                    <span>Licença #{activeEmpresa?.codigo_licenca || activeEmpresa?.id || 1} • {activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha de Acesso*'}
                </label>
                <div className="relative">
                  <input
                    type={showUserModalPassword ? 'text' : 'password'}
                    required={!editingUser}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserModalPassword(!showUserModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showUserModalPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showUserModalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* SELEÇÃO INTELIGENTE DE MÚLTIPLAS PERMISSÕES */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Permissões & Módulos Liberados*</span>
                  <span className="text-[10px] text-slate-400 font-normal">Selecione uma ou mais</span>
                </label>

                {/* Opção 1: Administrador da Licença */}
                <div 
                  onClick={() => setUserFormData(prev => ({ 
                    ...prev, 
                    isAdminLicenca: !prev.isAdminLicenca,
                    isSuperAdminUser: false 
                  }))}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    userFormData.isAdminLicenca 
                      ? 'bg-purple-950/40 border-purple-500/60 text-purple-200 shadow-md' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={userFormData.isAdminLicenca}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 pointer-events-none"
                  />
                  <div>
                    <strong className="text-xs text-white block">👑 Administrador da Licença (Acesso Total)</strong>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Gerenciamento de dados cadastrais da empresa, certificado digital A1, equipe e todos os módulos operacionais e financeiros.
                    </p>
                  </div>
                </div>

                {/* Opções de Módulos da Equipe (quando não for Admin Geral) */}
                {!userFormData.isAdminLicenca && (
                  <div className="space-y-2 pt-0.5">
                    
                    {/* Checkbox 1: Operacional / Fretes */}
                    <div 
                      onClick={() => setUserFormData(prev => ({ ...prev, permiteOperacional: !prev.permiteOperacional }))}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                        userFormData.permiteOperacional 
                          ? 'bg-blue-950/40 border-blue-500/60 text-blue-200' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userFormData.permiteOperacional}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                      <div>
                        <strong className="text-xs text-white block">🚚 Operacional / Fretes</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Lançamento e Consulta de Fretes, Emissão de CT-e 4.00, Manifestos MDF-e 3.00, Torre de Controle e Frotas.
                        </p>
                      </div>
                    </div>

                    {/* Checkbox 2: Financeiro */}
                    <div 
                      onClick={() => setUserFormData(prev => ({ ...prev, permiteFinanceiro: !prev.permiteFinanceiro }))}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                        userFormData.permiteFinanceiro 
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={userFormData.permiteFinanceiro}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                      />
                      <div>
                        <strong className="text-xs text-white block">💰 Financeiro & Repasses</strong>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Gestão Financeira, Contas a Pagar e Receber, Liquidação de Adiantamentos, Comissões e Repasses.
                        </p>
                      </div>
                    </div>

                  </div>
                )}

                {/* Opção Exclusiva para Super Admin logado */}
                {user?.role === 'super_admin' && (
                  <div 
                    onClick={() => setUserFormData(prev => ({ 
                      ...prev, 
                      isSuperAdminUser: !prev.isSuperAdminUser,
                      isAdminLicenca: false 
                    }))}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 mt-1 select-none ${
                      userFormData.isSuperAdminUser 
                        ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={userFormData.isSuperAdminUser}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-amber-600 pointer-events-none"
                    />
                    <div>
                      <strong className="text-xs text-amber-300 block">👑 Super Admin / Ghost Master (Acesso Global SaaS)</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
