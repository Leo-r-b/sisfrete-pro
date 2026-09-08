import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Key, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  Layers, 
  Play, 
  Sparkles, 
  Eye, 
  EyeOff,
  Database
} from 'lucide-react';
import api from '../services/api';

export default function CartoConfigCard() {
  const [config, setConfig] = useState({
    organization: 'clausa',
    defaultBasemap: 'dark-matter',
    connectionName: 'carto_dw',
    apiBaseUrl: 'https://gcp-us-east1.api.carto.com',
    workflowApiUrl: '',
    hasToken: false,
    tokenMasked: '',
    ativo: false
  });

  const [inputToken, setInputToken] = useState('');
  const [organization, setOrganization] = useState('clausa');
  const [connectionName, setConnectionName] = useState('carto_dw');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://gcp-us-east1.api.carto.com');
  const [workflowApiUrl, setWorkflowApiUrl] = useState('');
  const [showToken, setShowToken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState(false);

  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [workflowResult, setWorkflowResult] = useState(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/carto/config');
      if (res.data) {
        setConfig(res.data);
        setOrganization(res.data.organization || 'clausa');
        setConnectionName(res.data.connectionName || 'carto_dw');
        setApiBaseUrl(res.data.apiBaseUrl || 'https://gcp-us-east1.api.carto.com');
        setWorkflowApiUrl(res.data.workflowApiUrl || '');
        if (res.data.tokenMasked) {
          setInputToken(res.data.tokenMasked);
        }
      }
    } catch (err) {
      console.warn('Aviso ao carregar config CARTO:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleTestConnection = async () => {
    if (!inputToken || inputToken.includes('...')) {
      alert('Por favor, cole seu Access Token completo gerado na CARTO para testar.');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const res = await api.post('/carto/test', {
        token: inputToken,
        apiBaseUrl
      });

      setTestResult(res.data);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.error || err.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);

      const payload = {
        organization: organization.trim() || 'clausa',
        connectionName: connectionName.trim() || 'carto_dw',
        apiBaseUrl: apiBaseUrl.trim() || 'https://gcp-us-east1.api.carto.com',
        workflowApiUrl: workflowApiUrl.trim(),
      };

      // Só envia o token se não for a versão mascarada
      if (inputToken && !inputToken.includes('...')) {
        payload.accessToken = inputToken.trim();
      }

      await api.post('/carto/config', payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      loadConfig();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar configurações da CARTO.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWorkflow = async () => {
    if (!workflowApiUrl.trim()) {
      alert('Por favor, informe a URL ou comando do Workflow da CARTO.');
      return;
    }

    try {
      setExecutingWorkflow(true);
      setWorkflowResult(null);

      const res = await api.post('/carto/execute-workflow', {
        connection: connectionName,
        callStatement: workflowApiUrl.trim(),
        queryParameters: {},
        isAsync: true
      });

      setWorkflowResult(res.data);
    } catch (err) {
      setWorkflowResult({
        error: err.response?.data?.error || err.message
      });
    } finally {
      setExecutingWorkflow(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
      
      {/* Top Banner Informativo da CARTO */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Integração Oficial CARTO (GIS, Mapas & Workflows)
              </h3>
              {config.ativo ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Aguardando Token
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Conectado ao workspace <strong>{organization}.app.carto.com</strong>. Mapas cartográficos em alta resolução e automação espacial.
            </p>
          </div>
        </div>

        {/* Link direto para a conta CARTO do usuário */}
        <a
          href="https://clausa.app.carto.com/developers/tokens"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
        >
          <span>Abrir Developers no CARTO</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Formulário de Credenciais da CARTO */}
      <form onSubmit={handleSave} className="space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Organização CARTO */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Organização / Subdomínio CARTO *
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 text-xs bg-slate-950 border border-r-0 border-slate-700 rounded-l-xl text-slate-500">
                https://
              </span>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value.toLowerCase())}
                placeholder="clausa"
                className="flex-1 px-3 py-2 text-sm bg-slate-900 border-y border-slate-700 text-white font-semibold focus:outline-none focus:border-blue-500"
              />
              <span className="px-3 py-2 text-xs bg-slate-950 border border-l-0 border-slate-700 rounded-r-xl text-slate-500">
                .app.carto.com
              </span>
            </div>
          </div>

          {/* Nome da Conexão / Data Warehouse */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Conexão DW (Data Warehouse)
            </label>
            <div className="relative">
              <Database className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder="carto_dw"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

        </div>

        {/* API Access Token */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              CARTO API Access Token *
            </label>
            <a
              href="https://clausa.app.carto.com/developers/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              Criar Token na CARTO <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Cole aqui seu API Access Token (ex: eyJhbGciOi...)"
              className="w-full pl-3 pr-24 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                title={showToken ? 'Ocultar' : 'Mostrar'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !inputToken}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all cursor-pointer"
              >
                {testing ? 'Testando...' : 'Testar'}
              </button>
            </div>
          </div>

          {/* Feedback do Teste de Conexão */}
          {testResult && (
            <div className={`mt-2 p-3 rounded-xl text-xs flex items-start gap-2 border ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <strong>{testResult.success ? 'Conexão Aprovada!' : 'Falha na Conexão:'}</strong>{' '}
                {testResult.message || testResult.error}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO CARTO WORKFLOWS VIA API */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-200">
                Execução de CARTO Workflows via API
              </span>
            </div>
            <a
              href="https://docs.carto.com/carto-user-manual/workflows/executing-workflows-via-api"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
            >
              Documentação de Workflows <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-[11px] text-slate-400">
            Se você possui um Workflow criado no canvas da CARTO com acesso API habilitado, cole abaixo a instrução SQL <code className="text-purple-300">CALL workflows_temp...</code> ou o Endpoint:
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowApiUrl}
              onChange={(e) => setWorkflowApiUrl(e.target.value)}
              placeholder="Ex: CALL workflows_temp.meu_workflow_logistica()"
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleTestWorkflow}
              disabled={executingWorkflow || !workflowApiUrl.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-all cursor-pointer"
            >
              <Play className="w-3 h-3" />
              {executingWorkflow ? 'Executando...' : 'Testar Workflow'}
            </button>
          </div>

          {workflowResult && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
              <pre>{JSON.stringify(workflowResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Botão de Salvar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
            </span>
          )}
          {!saveSuccess && <div />}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações da CARTO'
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
