import React, { useState, useEffect } from 'react';
import { X, DollarSign, Send, CheckCircle2, Copy } from 'lucide-react';
import api from '../services/api';

export default function LancamentoModal({ frete, isOpen, onClose, onSuccess }) {
  const [tipo, setTipo] = useState('adiantamento');
  const [valor, setValor] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().substring(0, 10));
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [comprovanteRef, setComprovanteRef] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !frete) return null;

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSetSugestao = (tipoLancamento) => {
    setTipo(tipoLancamento);
    if (tipoLancamento === 'adiantamento') {
      setValor(frete.valor_adiantamento > 0 ? frete.valor_adiantamento : '');
    } else if (tipoLancamento === 'saldo') {
      setValor(frete.valor_saldo_motorista || '');
    }
  };

  const valorNum = parseFloat(valor || 0);
  const saldoAtual = Number(frete.valor_saldo_motorista || 0);
  const totalPagoAnterior = (frete.total_ja_pago !== undefined) 
    ? Number(frete.total_ja_pago) 
    : Math.max(0, Number(frete.valor_frete_compra || 0) - saldoAtual);
  const saldoRestantePrevia = Math.max(0, saldoAtual - (isNaN(valorNum) ? 0 : valorNum));
  const isQuitacaoTotal = saldoRestantePrevia <= 0.01 && valorNum > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/financeiro/pagamentos', {
        frete_id: frete.id,
        tipo,
        valor: parseFloat(valor),
        data_pagamento: dataPagamento,
        forma_pagamento: formaPagamento,
        comprovante_ref: comprovanteRef,
        observacoes,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <h3 className="font-heading font-bold text-lg text-white">Lançar Pagamento ao Motorista</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo do Frete Selecionado */}
        <div className="p-4 mx-6 mt-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">CT-e / Viagem:</span>
            <span className="font-semibold text-white">CT-e Nº {frete.numero_cte || 'S/N'} ({frete.origem_cidade}/{frete.origem_uf} ➔ {frete.destino_cidade}/{frete.destino_uf})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Motorista Terceiro:</span>
            <span className="font-semibold text-blue-400">{frete.motorista_nome}</span>
          </div>
          <div className="flex justify-between border-t border-slate-700/60 pt-1.5">
            <span className="text-slate-400">Frete Total Contratado:</span>
            <span className="font-bold text-white">{formatMoney(frete.valor_frete_compra)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Já Pago Anteriormente:</span>
            <span className="font-bold text-cyan-400">{formatMoney(totalPagoAnterior)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-700/60 pt-1.5">
            <span className="text-slate-400 font-bold">Saldo Devedor Atual:</span>
            <span className="font-bold text-amber-400 text-sm">{formatMoney(saldoAtual)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Botões de Preenchimento Rápido */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Lançamento</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSetSugestao('adiantamento')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  tipo === 'adiantamento'
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Adiantamento
              </button>
              <button
                type="button"
                onClick={() => handleSetSugestao('saldo')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  tipo === 'saldo'
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Quitação do Saldo
              </button>
              <button
                type="button"
                onClick={() => handleSetSugestao('parcial')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  tipo === 'parcial' || tipo === 'abastecimento'
                    ? 'bg-amber-600/20 text-amber-400 border-amber-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Pagamento Parcial
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Valor a Pagar (R$)*</label>
              <input
                type="number"
                step="0.01"
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Data do Pagamento*</label>
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Forma de Pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="PIX">PIX Instantâneo</option>
                <option value="TED">Transferência TED/DOC</option>
                <option value="Dinheiro">Dinheiro em Espécie</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nº Comprovante / Autenticação</label>
              <input
                type="text"
                value={comprovanteRef}
                onChange={(e) => setComprovanteRef(e.target.value)}
                placeholder="Ex: PIX-982143"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Observações do Lançamento</label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pago na saída do armazém"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Prévia do Resultado Financeiro */}
          {valorNum > 0 && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-semibold ${
              isQuitacaoTotal 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
            }`}>
              <span>{isQuitacaoTotal ? '✅ Quitação Total do Frete:' : '⏳ Saldo Devedor Restante Após Lançamento:'}</span>
              <span className="font-mono text-sm font-bold">
                {isQuitacaoTotal ? 'R$ 0,00 (100% Quitado)' : formatMoney(saldoRestantePrevia)}
              </span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? 'Processando...' : 'Confirmar Pagamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
