import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sisfrete_token') || null);
  const [empresas, setEmpresas] = useState([]);
  const [activeEmpresa, setActiveEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metodologiaAtiva, setMetodologiaAtivaState] = useState(() => {
    return localStorage.getItem('sisfrete_metodologia') || 'todos';
  });

  const setMetodologiaAtiva = (novaMetodologia) => {
    localStorage.setItem('sisfrete_metodologia', novaMetodologia);
    setMetodologiaAtivaState(novaMetodologia);
  };

  const loadEmpresas = async (currentUser) => {
    const activeUser = currentUser || user;
    const activeRole = activeUser?.role;
    try {
      if (activeRole === 'super_admin') {
        // Super Admin (Ghost Master) carrega todas as licenças do SaaS
        const res = await api.get('/empresas');
        setEmpresas(res.data || []);
        
        const storedActiveId = localStorage.getItem('sisfrete_active_empresa_id');
        let current = null;
        if (storedActiveId && res.data) {
          current = res.data.find((e) => String(e.id) === String(storedActiveId));
        }
        if (!current && res.data && res.data.length > 0) {
          current = res.data[0];
          localStorage.setItem('sisfrete_active_empresa_id', current.id);
        }
        setActiveEmpresa(current);
        const modo = (current?.modo_operacao === 'agenciamento_repasse' || current?.modo_operacao === 'gestao_pagamentos') ? 'agenciamento' : 'transportadora';
        setMetodologiaAtivaState(modo);
        localStorage.setItem('sisfrete_metodologia', modo);
      } else {
        // Administrador normal e operadores carregam EXCLUSIVAMENTE os dados da sua própria licença
        const emp = activeUser?.empresa;
        if (emp) {
          setActiveEmpresa(emp);
          setEmpresas([emp]);
          localStorage.setItem('sisfrete_active_empresa_id', emp.id);
          const modo = (emp.modo_operacao === 'agenciamento_repasse' || emp.modo_operacao === 'gestao_pagamentos') ? 'agenciamento' : 'transportadora';
          setMetodologiaAtivaState(modo);
          localStorage.setItem('sisfrete_metodologia', modo);
        } else {
          try {
            const res = await api.get('/empresa');
            if (res.data) {
              setActiveEmpresa(res.data);
              setEmpresas([res.data]);
              localStorage.setItem('sisfrete_active_empresa_id', res.data.id);
              const modo = (res.data.modo_operacao === 'agenciamento_repasse' || res.data.modo_operacao === 'gestao_pagamentos') ? 'agenciamento' : 'transportadora';
              setMetodologiaAtivaState(modo);
              localStorage.setItem('sisfrete_metodologia', modo);
            }
          } catch (e) {
            console.warn('Fallback empresa info:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados da empresa:', err);
    }
  };

  const switchEmpresa = (empresaId) => {
    // Apenas Super Admin pode alternar entre licenças
    if (user?.role !== 'super_admin') return;

    const selected = empresas.find((e) => Number(e.id) === Number(empresaId));
    if (selected) {
      localStorage.setItem('sisfrete_active_empresa_id', selected.id);
      const modo = (selected.modo_operacao === 'agenciamento_repasse' || selected.modo_operacao === 'gestao_pagamentos') ? 'agenciamento' : 'transportadora';
      localStorage.setItem('sisfrete_metodologia', modo);
      setActiveEmpresa(selected);
      // Recarregar a página para atualizar todos os estados das abas sob o novo tenant
      window.location.reload();
    }
  };

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('sisfrete_token');
      const storedUser = localStorage.getItem('sisfrete_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          const res = await api.get('/auth/profile');
          const freshUser = res.data;
          setUser(freshUser);
          localStorage.setItem('sisfrete_user', JSON.stringify(freshUser));
          if (freshUser.empresa_id) {
            localStorage.setItem('sisfrete_active_empresa_id', freshUser.empresa_id);
          }
          await loadEmpresas(freshUser);
        } catch (err) {
          console.warn('Sessão expirada:', err);
          logout();
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (email, password, empresaId) => {
    try {
      const payload = { email, password };
      if (empresaId) {
        payload.empresa_id = empresaId;
      }
      const res = await api.post('/auth/login', payload);
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('sisfrete_token', receivedToken);
      localStorage.setItem('sisfrete_user', JSON.stringify(receivedUser));
      if (receivedUser.empresa_id) {
        localStorage.setItem('sisfrete_active_empresa_id', receivedUser.empresa_id);
      }

      setToken(receivedToken);
      setUser(receivedUser);
      await loadEmpresas(receivedUser);

      return { success: true };
    } catch (err) {
      const data = err.response?.data || {};
      const rawError = data.error || data.message || err.message;
      const errorMsg = typeof rawError === 'string' ? rawError : (rawError?.message || 'Erro ao realizar login. Verifique suas credenciais.');
      return {
        success: false,
        error: errorMsg,
        trial_expired: !!data.trial_expired,
        trialData: data.trial_expired ? data : null,
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('sisfrete_token');
    localStorage.removeItem('sisfrete_user');
    localStorage.removeItem('sisfrete_active_empresa_id');
    setUser(null);
    setToken(null);
    setActiveEmpresa(null);
    setEmpresas([]);
  };

  const updateProfile = async (data) => {
    try {
      const res = await api.put('/auth/profile', data);
      const { user: updatedUser, token: newToken } = res.data;
      if (newToken) {
        localStorage.setItem('sisfrete_token', newToken);
        setToken(newToken);
      }
      if (updatedUser.empresa_id) {
        localStorage.setItem('sisfrete_active_empresa_id', updatedUser.empresa_id);
      }
      localStorage.setItem('sisfrete_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (updatedUser.empresa) {
        setActiveEmpresa(updatedUser.empresa);
        setEmpresas([updatedUser.empresa]);
      }
      return { success: true, message: res.data.message };
    } catch (err) {
      const rawError = err.response?.data?.error || err.response?.data?.message || err.message;
      return { success: false, error: typeof rawError === 'string' ? rawError : 'Erro ao atualizar perfil.' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      return { success: true, message: res.data.message };
    } catch (err) {
      const rawError = err.response?.data?.error || err.response?.data?.message || err.message;
      return { success: false, error: typeof rawError === 'string' ? rawError : 'Erro ao alterar senha.' };
    }
  };

  // Força um refresh do usuário logado a partir do backend.
  // Deve ser chamado sempre que outro componente editar o usuário logado
  // (ex: aba "Usuários & Permissões" editando o próprio usuário).
  const refreshCurrentUser = async () => {
    try {
      const res = await api.get('/auth/profile');
      const freshUser = res.data;
      setUser(freshUser);
      localStorage.setItem('sisfrete_user', JSON.stringify(freshUser));
      return { success: true };
    } catch (err) {
      console.warn('Erro ao atualizar dados do usuário logado:', err);
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        empresas,
        activeEmpresa,
        switchEmpresa,
        loadEmpresas,
        metodologiaAtiva,
        setMetodologiaAtiva,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateProfile,
        changePassword,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
