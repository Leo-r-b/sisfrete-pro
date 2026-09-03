import React, { useState } from 'react';
import { Truck, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, KeyRound, Building2, Clock, MessageSquare, Phone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [licencaId, setLicencaId] = useState(
    localStorage.getItem('sisfrete_last_licenca_id') || '1'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trialModalData, setTrialModalData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTrialModalData(null);

    setLoading(true);
    const targetLicenca = (licencaId || '').trim();
    if (targetLicenca) {
      localStorage.setItem('sisfrete_last_licenca_id', targetLicenca);
    }

    const res = await login(email, password, targetLicenca);
    if (!res.success) {
      if (res.trial_expired && res.trialData) {
        setTrialModalData(res.trialData);
      } else {
        setError(typeof res.error === 'string' ? res.error : 'Erro ao realizar login.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 items-center justify-center shadow-xl shadow-blue-500/25 mb-4 transform hover:scale-105 transition">
            <Truck className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white font-heading tracking-tight">
            SisFrete <span className="text-emerald-400">PRO</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Gestão Multi-Empresa de Fretes & Subcontratação
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">

          <div className="mb-5">
            <h2 className="text-xl font-bold text-white font-heading">Acesso à Plataforma</h2>
            <p className="text-xs text-slate-400 mt-1">Informe suas credenciais para acessar o sistema.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ID DA EMPRESA / NÚMERO DA LICENÇA (OPCIONAL) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  ID da Licença <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                </label>
                {licencaId ? (
                  <span className="text-[10px] text-blue-400 font-mono font-bold">Licença #{licencaId}</span>
                ) : (
                  <span className="text-[10px] text-purple-400 font-mono font-bold">Global / Master</span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                <input
                  type="text"
                  value={licencaId}
                  onChange={(e) => setLicencaId(e.target.value)}
                  placeholder="Digite o número da licença"
                  className="w-full bg-slate-950/90 border border-slate-700 hover:border-blue-500/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition font-mono font-bold tracking-wider"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Deixe em branco para acesso Ghost Master / Login Global.
              </p>
            </div>

            {/* USUÁRIO / EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail ou Usuário</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@transportadora.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* SENHA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Senha de Acesso</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition p-0.5 focus:outline-none"
                  title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 transition duration-200 transform active:scale-95 disabled:opacity-60 mt-3 cursor-pointer"
            >
              <span>{loading ? 'Validando Licença & Acesso...' : 'Acessar Licença'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

        </div>

        {/* Security guarantee note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Isolamento Total & Confidencialidade de Licenças</span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: PERÍODO DE TESTE 7 DIAS EXPIRADO */}
      {/* ========================================================================= */}
      {trialModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Ícone de Destaque */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Clock className="h-8 w-8 animate-pulse text-amber-400" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider">
                Período de Avaliação Encerrado
              </span>
              <h3 className="text-xl font-bold font-heading text-white">
                Teste de 7 Dias Expirado
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                O período de teste gratuito do <strong className="text-white">SisFrete Pro</strong> para a empresa <span className="text-amber-300 font-bold">{trialModalData.empresa_nome || 'sua empresa'}</span> (Licença #{trialModalData.codigo_licenca}) encerrou em <span className="font-mono text-white font-bold">{trialModalData.data_expiracao_formatada || 'data limite'}</span>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-1 text-left">
              <p className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                <ShieldCheck className="h-4 w-4" />
                <span>Seus dados e fretes continuam salvos</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Para reativar seu acesso imediato e continuar emitindo seus CT-es, entre em contato com nosso atendimento comercial.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`https://wa.me/5544999999999?text=${encodeURIComponent(`Olá! Gostaria de ativar meu plano definitivo no SisFrete Pro para a empresa ${trialModalData.empresa_nome || ''} (Licença #${trialModalData.codigo_licenca}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition duration-200 cursor-pointer text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Falar no WhatsApp para Ativar</span>
              </a>

              <button
                type="button"
                onClick={() => setTrialModalData(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Tentar Outro Usuário / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
