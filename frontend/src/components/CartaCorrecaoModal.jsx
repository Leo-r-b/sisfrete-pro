import React, { useState } from 'react';
import { 
  FileEdit, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  Info,
  Send
} from 'lucide-react';
import api from '../services/api';

const GRUPOS_COMUNS = [
  { id: 'compl', nome: 'Informações Complementares / Observações', campos: [
    { id: 'xObs', nome: 'Observações Gerais do Frete (xObs)' },
    { id: 'xCampo', nome: 'Campos de Interesse do Emitente (xCampo)' }
  ]},
  { id: 'rodo', nome: 'Transporte Rodoviário / Veículo & RNTRC', campos: [
    { id: 'placa', nome: 'Placa do Veículo / Carreta' },
    { id: 'RNTRC', nome: 'RNTRC do Transportador / Veículo' },
    { id: 'RENAVAM', nome: 'Código RENAVAM' },
    { id: 'UF', nome: 'UF de Licenciamento do Veículo' }
  ]},
  { id: 'infDoc', nome: 'Documentos Originários / NF-e', campos: [
    { id: 'nDoc', nome: 'Número do Documento / Pedido' },
    { id: 'dEmi', nome: 'Data de Emissão do Documento' },
    { id: 'chave', nome: 'Chave de Acesso da NF-e' }
  ]},
  { id: 'dest', nome: 'Destinatário (Dados Complementares)', campos: [
    { id: 'email', nome: 'E-mail do Destinatário' },
    { id: 'fone', nome: 'Telefone do Destinatário' },
    { id: 'xCpl', nome: 'Complemento do Endereço de Entrega' }
  ]},
  { id: 'rem', nome: 'Remetente (Dados Complementares)', campos: [
    { id: 'email', nome: 'E-mail do Remetente' },
    { id: 'fone', nome: 'Telefone do Remetente' },
    { id: 'xCpl', nome: 'Complemento do Endereço de Coleta' }
  ]},
  { id: 'outro', nome: 'Outro Grupo / Campo Personalizado', campos: [] }
];

export default function CartaCorrecaoModal({ isOpen, onClose, frete, onSuccess }) {
  if (!isOpen || !frete) return null;

  const [grupoSelecionado, setGrupoSelecionado] = useState('compl');
  const [campoSelecionado, setCampoSelecionado] = useState('xObs');
  const [grupoManual, setGrupoManual] = useState('');
  const [campoManual, setCampoManual] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const grupoObj = GRUPOS_COMUNS.find(g => g.id === grupoSelecionado);

  const handleGrupoChange = (e) => {
    const gId = e.target.value;
    setGrupoSelecionado(gId);
    const targetGrupo = GRUPOS_COMUNS.find(g => g.id === gId);
    if (targetGrupo && targetGrupo.campos.length > 0) {
      setCampoSelecionado(targetGrupo.campos[0].id);
    } else {
      setCampoSelecionado('manual');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const finalGrupo = grupoSelecionado === 'outro' ? grupoManual.trim() : grupoSelecionado;
    const finalCampo = campoSelecionado === 'manual' || grupoSelecionado === 'outro' ? campoManual.trim() : campoSelecionado;

    if (!finalGrupo) {
      setError('Informe o grupo da tag XML a ser corrigida.');
      return;
    }
    if (!finalCampo) {
      setError('Informe o campo / tag XML a ser corrigida.');
      return;
    }
    if (!novoValor || !novoValor.trim()) {
      setError('Informe o novo valor corrigido.');
      return;
    }

    setEnviando(true);
    try {
      const res = await api.post(`/fiscal/cce/${frete.id}`, {
        grupoAlterado: finalGrupo,
        campoAlterado: finalCampo,
        valorAlterado: novoValor.trim()
      });

      setSuccess(`🎉 Carta de Correção homologada na SEFAZ! Protocolo: ${res.data.protocolo}`);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2200);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar Carta de Correção na SEFAZ.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-blue-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3 text-blue-400">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">Carta de Correção Eletrônica (CC-e)</h3>
              <p className="text-xs text-slate-400">Evento 110110 • CT-e 4.00 SEFAZ</p>
            </div>
          </div>
          {!enviando && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Mensagens de Feedback */}
        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumo do CT-e */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>CT-e Nº:</span>
            <strong className="text-white font-mono">CT-e {frete.numero_cte || 'S/N'} (Série {frete.serie_cte || '1'})</strong>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Tomador / Pagador:</span>
            <strong className="text-white truncate max-w-[240px]">{frete.cliente_nome}</strong>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Motorista / Veículo:</span>
            <strong className="text-slate-200">{frete.motorista_nome} ({frete.placa_veiculo || 'S/N'})</strong>
          </div>
          <div className="pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono truncate block">
              Chave: {frete.chave_cte_44 || frete.chave_cte || 'N/A'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Seleção do Grupo */}
          <div>
            <label className="block text-slate-200 text-xs font-semibold mb-1">
              Grupo de Informações a Corrigir <span className="text-blue-400">*</span>
            </label>
            <select
              value={grupoSelecionado}
              onChange={handleGrupoChange}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {GRUPOS_COMUNS.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>

          {/* Grupo Manual se 'outro' */}
          {grupoSelecionado === 'outro' && (
            <div>
              <label className="block text-slate-200 text-xs font-semibold mb-1">
                Nome do Grupo XML (Tag Pai) <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                required
                value={grupoManual}
                onChange={(e) => setGrupoManual(e.target.value)}
                placeholder="Ex: compl, rodo, toma4, veicNovos"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* 2. Seleção do Campo */}
          {grupoSelecionado !== 'outro' && grupoObj?.campos.length > 0 && (
            <div>
              <label className="block text-slate-200 text-xs font-semibold mb-1">
                Campo / Tag XML a Corrigir <span className="text-blue-400">*</span>
              </label>
              <select
                value={campoSelecionado}
                onChange={(e) => setCampoSelecionado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {grupoObj.campos.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.id})</option>
                ))}
                <option value="manual">Outro campo deste grupo...</option>
              </select>
            </div>
          )}

          {/* Campo Manual se 'manual' */}
          {(campoSelecionado === 'manual' || grupoSelecionado === 'outro') && (
            <div>
              <label className="block text-slate-200 text-xs font-semibold mb-1">
                Nome da Tag XML do Campo <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                required
                value={campoManual}
                onChange={(e) => setCampoManual(e.target.value)}
                placeholder="Ex: xObs, placa, RNTRC, nDoc"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* 3. Novo Valor Corrigido */}
          <div>
            <label className="block text-slate-200 text-xs font-semibold mb-1">
              Novo Valor Corrigido <span className="text-blue-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder="Digite o novo valor que substituirá o anterior no documento fiscal..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Alerta Fiscal SINIEF */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-200">
              <Info className="h-4 w-4 text-blue-400" />
              <span>Regras Fiscais da Carta de Correção (Art. 58-B Convênio SINIEF 06/89)</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              A CC-e <strong>NÃO pode</strong> ser utilizada para corrigir: <strong>1)</strong> Valores do imposto (base de cálculo, alíquota, valor do frete); <strong>2)</strong> Mudança do emitente, tomador ou destinatário; <strong>3)</strong> Data de emissão que altere o período de apuração fiscal.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              disabled={enviando}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Voltar
            </button>

            <button
              type="submit"
              disabled={enviando || !novoValor.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Transmitindo CC-e SEFAZ...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Transmitir Carta de Correção SEFAZ</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
