import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Printer,
  PlusCircle,
  Clock,
  RefreshCw,
  Repeat
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  AreaChart, 
  Area 
} from 'recharts';
import api from '../services/api';
import KpiCard from '../components/KpiCard';
import { StatusFreteBadge, StatusPagamentoBadge, StatusRecebimentoBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onNovoFrete, onImportarXml, onOpenRecibo, onOpenLancamento }) {
  const { activeEmpresa, metodologiaAtiva } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAgenciamento = metodologiaAtiva === 'agenciamento' || activeEmpresa?.modo_operacao === 'agenciamento_repasse' || activeEmpresa?.modo_operacao === 'gestao_pagamentos';
  const isGestao = activeEmpresa?.modo_operacao === 'gestao_pagamentos';

  const loadDashboard = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await api.get('/financeiro/kpis');
      setData(res.data);
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, activeEmpresa?.id, metodologiaAtiva]);

  // Recarregar quando a janela voltar a ter foco
  useEffect(() => {
    const handleFocus = () => {
      loadDashboard();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboard]);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Carregando painel geral...</p>
        </div>
      </div>
    );
  }

  const { resumo, status_counts, evolucao_mensal, ultimos_fretes } = data || {};
  const ultimosFretes = ultimos_fretes || [];

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner de Resumo */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
              {isAgenciamento ? <Repeat className="h-3.5 w-3.5 text-indigo-400" /> : <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{isAgenciamento ? 'Modelo Agenciamento & Repasses' : 'Gestão de Subcontratação & Margem Líquida'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white font-heading">
              {isAgenciamento ? 'Painel Geral de Agenciamento' : 'Visão Geral de Fretes & Comissões'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {isAgenciamento 
                ? 'Acompanhe faturamento bruto dos CT-es, comissões retidas da agência e controle de freteiros e repasses em tempo real.'
                : 'Acompanhe suas margens de lucro, adiantamentos efetuados e saldos devidos a motoristas terceiros em tempo real.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Recarregar Indicadores"
            >
              <RefreshCw className={`h-4 w-4 text-blue-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            <button
              onClick={isGestao ? onImportarXml : onNovoFrete}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-2.5 px-4 sm:px-5 rounded-xl shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm"
            >
              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{isGestao ? 'Importar CT-e para Rateio' : 'Cadastrar / Importar CT-e'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title={isGestao ? "Total em CT-es Gerenciados" : isAgenciamento ? "Total Agenciado (CT-es)" : "Faturamento Bruto (Venda)"}
          value={formatMoney(resumo?.total_venda ?? resumo?.totalVendaFretes)}
          subtext={isGestao ? "Volume total em CT-es importados" : isAgenciamento ? "Volume total transportado" : "Total cobrado dos clientes"}
          icon={DollarSign}
          color="blue"
        />

        <KpiCard
          title={isGestao ? "Frete Real a Pagar (Freteiros)" : isAgenciamento ? "Frete Real (Freteiros)" : "Custo Freteiros (Compra)"}
          value={formatMoney(resumo?.total_compra ?? resumo?.totalCompraFretes)}
          subtext={isGestao ? "Devido aos transportadores" : isAgenciamento ? "Total devido aos freteiros" : "Total acordado com motoristas"}
          icon={Truck}
          color="indigo"
        />

        <KpiCard
          title={isGestao ? "Comissão a Pagar (Agenciadores)" : isAgenciamento ? "Comissão da Agência" : "Lucro / Comissão Líquida"}
          value={formatMoney(resumo?.total_comissao ?? resumo?.totalComissaoFretes)}
          subtext={isGestao ? "Devido aos fornecedores de agenciamento" : `Margem Média: ${resumo?.margem_media_percentual || 0}%`}
          icon={TrendingUp}
          color={isGestao ? "purple" : "emerald"}
          trend={isGestao ? undefined : `+${resumo?.margem_media_percentual || 0}%`}
        />

        <KpiCard
          title={isGestao ? "Total a Pagar (Obrigações)" : "Saldo a Pagar (Motoristas)"}
          value={formatMoney(isGestao ? (resumo?.total_a_pagar_geral ?? resumo?.totalAPagar) : (resumo?.total_saldo_pendente_freteiros ?? resumo?.totalAPagar))}
          subtext={isGestao ? `Já Quitado: ${formatMoney(resumo?.total_pago_geral ?? resumo?.totalPago)}` : `Já Quitado: ${formatMoney(resumo?.total_adiantamentos_pagos ?? resumo?.totalPago)}`}
          icon={Wallet}
          color="amber"
        />
      </div>

      {/* Status Rápido & A Receber / Quitado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Em Trânsito</p>
              <p className="text-lg font-bold text-white font-heading">{status_counts?.em_transito || 0} viagens</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400">Ativas</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pagamentos Pendentes</p>
              <p className="text-lg font-bold text-white font-heading">{status_counts?.pagamentos_pendentes || 0} fretes</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400">Atenção</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{isGestao ? "Total Quitado / Pago" : "A Receber de Clientes"}</p>
              <p className="text-lg font-bold text-emerald-400 font-heading">
                {formatMoney(isGestao ? (resumo?.total_pago_geral ?? resumo?.totalPago) : (resumo?.total_a_receber_clientes ?? resumo?.totalAReceber))}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
            {isGestao ? "Pagamentos Baixados" : "Contas a Receber"}
          </span>
        </div>
      </div>

      {/* Gráficos de Evolução Financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Barras: Venda vs Custo vs Lucro */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-white">Evolução de Fretes e Faturamento</h3>
              <p className="text-xs text-slate-400">Comparativo entre Frete Cobrado (Venda), Custo com Motorista e Lucro</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {evolucao_mensal && evolucao_mensal.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucao_mensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                    formatter={(value) => [formatMoney(value)]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="venda" name={isAgenciamento ? "Frete Total (CT-e)" : "Frete Venda (Cliente)"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="compra" name={isAgenciamento ? "Frete Real (Freteiro)" : "Frete Motorista (Custo)"} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" name={isAgenciamento ? "Comissão da Agência" : "Lucro Líquido / Comissão"} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Nenhum dado financeiro para o período.
              </div>
            )}
          </div>
        </div>

        {/* Card de Adiantamentos & Saldos */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-white mb-1">Distribuição Financeira</h3>
            <p className="text-xs text-slate-400 mb-4">Detalhamento dos valores de fretes operados</p>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Já Quitado / Adiantado</span>
                  <span className="text-cyan-400 font-bold">{formatMoney(resumo?.total_adiantamentos_pagos ?? resumo?.totalPago)}</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (((resumo?.total_adiantamentos_pagos ?? resumo?.totalPago) || 0) / ((resumo?.total_compra ?? resumo?.totalCompraFretes) || 1)) * 100)}%` }} 
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Saldos Pendentes de Quitação</span>
                  <span className="text-amber-400 font-bold">{formatMoney(resumo?.total_saldo_pendente_freteiros ?? resumo?.totalAPagar)}</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (((resumo?.total_saldo_pendente_freteiros ?? resumo?.totalAPagar) || 0) / ((resumo?.total_compra ?? resumo?.totalCompraFretes) || 1)) * 100)}%` }} 
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <div className="flex justify-between text-xs text-emerald-400 font-semibold mb-1">
                  <span>{isAgenciamento ? "Comissão da Agência Gerada" : "Comissão / Lucro Gerado"}</span>
                  <span className="font-bold text-emerald-300">{formatMoney(resumo?.total_comissao ?? resumo?.totalComissaoFretes)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Retorno de <strong>{resumo?.margem_media_percentual || 0}%</strong> sobre o volume total operado.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <button
              onClick={onNovoFrete}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              + Adicionar Novo CT-e Manual / XML
            </button>
          </div>
        </div>

      </div>

      {/* Tabela de Fretes Recentes */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-white">Fretes & Viagens Recentes</h3>
            <p className="text-xs text-slate-400">Últimos conhecimentos de transporte cadastrados</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 uppercase text-[11px] font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">CT-e / Data</th>
                <th className="px-4 py-3">Rota (Origem ➔ Destino)</th>
                <th className="px-4 py-3">Motorista & Cliente</th>
                <th className="px-4 py-3 text-right">Frete Venda</th>
                <th className="px-4 py-3 text-right">Frete Motorista</th>
                <th className="px-4 py-3 text-right">Comissão / Lucro</th>
                <th className="px-4 py-3 text-right">Saldo Devedor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ultimosFretes && ultimosFretes.length > 0 ? (
                ultimosFretes.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-white font-mono">CT-e {f.numero_cte || 'S/N'}</p>
                      <p className="text-[11px] text-slate-500">{new Date(f.data_emissao).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-slate-200">{f.origem_cidade}/{f.origem_uf}</p>
                      <p className="text-[11px] text-slate-400">➔ {f.destino_cidade}/{f.destino_uf}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-blue-400 truncate max-w-[150px]">{f.motorista_nome}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{f.cliente_nome}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-200 whitespace-nowrap">
                      {formatMoney(Number(f.valor_frete_venda || 0) + Number(f.valor_frete_venda_2 || 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-300 whitespace-nowrap">
                      {formatMoney(f.valor_frete_real || f.valor_frete_compra || 0)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-bold text-emerald-400">{formatMoney(f.valor_comissao || 0)}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">({(f.percentual_margem || f.percentual_comissao || 0)?.toFixed(1)}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-400 whitespace-nowrap font-mono">
                      {formatMoney(f.status_pagamento_motorista === 'quitado' ? 0 : (f.valor_saldo_motorista || Math.max(0, (Number(f.valor_frete_real || f.valor_frete_compra || 0) - Number(f.valor_adiantamento || 0)))))}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap space-y-1">
                      <div><StatusFreteBadge status={f.status_frete} /></div>
                      <div><StatusPagamentoBadge status={f.status_pagamento_motorista} /></div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenRecibo(f)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Imprimir Recibo / Comprovante"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {f.valor_saldo_motorista > 0 && (
                          <button
                            onClick={() => onOpenLancamento(f)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition"
                            title="Lançar Adiantamento / Pagar Saldo"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    Nenhum frete cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
