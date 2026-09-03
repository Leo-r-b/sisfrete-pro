import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  Download,
  Printer,
  Share2,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Repeat,
  FileText,
  Clock,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Wallet,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
  Camera,
  Wrench,
  Fuel,
  Gauge,
  Briefcase,
  AlertTriangle,
  Landmark
} from 'lucide-react';
import api from '../services/api';
import { StatusPagamentoBadge, StatusRecebimentoBadge, StatusFreteBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function Relatorios({ onOpenLancamento, onOpenRecibo }) {
  const { activeEmpresa, metodologiaAtiva, setMetodologiaAtiva } = useAuth();
  
  // Metodologia Operacional da Licença Ativa
  const isLicencaGestao = activeEmpresa?.modo_operacao === 'gestao_pagamentos';
  const isLicencaRepasse = activeEmpresa?.modo_operacao === 'agenciamento_repasse';
  const isAgenciamento = isLicencaRepasse || isLicencaGestao;
  const isSubcontratacao = !isAgenciamento;

  // Aba inicial estrita conforme a licença ativa
  const [activeTab, setActiveTab] = useState(isAgenciamento ? 'repasses' : 'dre'); 
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [filtroPlaca, setFiltroPlaca] = useState('');
  const [filtroTipoManut, setFiltroTipoManut] = useState('');

  // Ajustar aba ativa automaticamente quando a licença for trocada
  useEffect(() => {
    if (isSubcontratacao && activeTab === 'repasses') {
      setActiveTab('dre');
    } else if (isAgenciamento && activeTab === 'dre') {
      setActiveTab('repasses');
    }
  }, [activeEmpresa?.id, activeEmpresa?.modo_operacao]);

  // Estados dos Relatórios
  const [relRepasses, setRelRepasses] = useState({ totais: {}, fretes: [] });
  const [relDre, setRelDre] = useState({ totais: {}, viagens: [] });
  const [relFinanceiroFluxo, setRelFinanceiroFluxo] = useState({ totais: {}, categorias_despesas: [], fretes: [], titulos: [], manutencoes: [] });
  const [relManutencaoFrota, setRelManutencaoFrota] = useState({ totais: {}, veiculos: [], manutencoes: [] });
  const [relMotoristas, setRelMotoristas] = useState({ totais: {}, motoristas: [] });
  const [relClientes, setRelClientes] = useState({ totais: {}, clientes: [] });
  const [relCanhotos, setRelCanhotos] = useState({ totais: {}, fretes: [] });
  const [relContasPagas, setRelContasPagas] = useState({ totais: {}, baixas: [] });

  // Extrato Individual do Motorista
  const [selectedMotoristaExtrato, setSelectedMotoristaExtrato] = useState(null);
  const [extratoMotoristaData, setExtratoMotoristaData] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleFiltroDataRapido = (tipo) => {
    const hoje = new Date();
    const format = (d) => d.toISOString().slice(0, 10);

    if (tipo === 'hoje') {
      setDataInicio(format(hoje));
      setDataFim(format(hoje));
    } else if (tipo === 'semana') {
      const primeiroDia = new Date(hoje);
      primeiroDia.setDate(hoje.getDate() - hoje.getDay());
      setDataInicio(format(primeiroDia));
      setDataFim(format(hoje));
    } else if (tipo === 'mes') {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(format(primeiroDia));
      setDataFim(format(hoje));
    } else if (tipo === 'mes_anterior') {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      setDataInicio(format(primeiroDia));
      setDataFim(format(ultimoDia));
    } else if (tipo === 'limpar') {
      setDataInicio('');
      setDataFim('');
    }
  };

  // Carregar Dados do Relatório Selecionado
  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        metodologia: metodologiaAtiva || 'todos'
      };
      if (search) params.search = search;
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      if (statusFiltro) {
        params.status_repasse = statusFiltro;
        params.status_pagamento = statusFiltro;
        params.status = statusFiltro;
      }
      if (filtroPlaca) params.placa = filtroPlaca;
      if (filtroTipoManut) params.tipo = filtroTipoManut;

      if (activeTab === 'repasses') {
        const res = await api.get('/relatorios/repasses-comissoes', { params });
        setRelRepasses(res.data || { totais: {}, fretes: [] });
      } else if (activeTab === 'dre') {
        const res = await api.get('/relatorios/dre-operacional', { params });
        setRelDre(res.data || { totais: {}, viagens: [] });
      } else if (activeTab === 'financeiro_fluxo') {
        const res = await api.get('/relatorios/financeiro-fluxo', { params });
        setRelFinanceiroFluxo(res.data || { totais: {}, categorias_despesas: [], fretes: [], titulos: [], manutencoes: [] });
      } else if (activeTab === 'manutencao_frota') {
        const res = await api.get('/relatorios/manutencao-frota', { params });
        setRelManutencaoFrota(res.data || { totais: {}, veiculos: [], manutencoes: [] });
      } else if (activeTab === 'motoristas') {
        const res = await api.get('/relatorios/motoristas', { params });
        setRelMotoristas(res.data || { totais: {}, motoristas: [] });
      } else if (activeTab === 'clientes') {
        const res = await api.get('/relatorios/clientes', { params });
        setRelClientes(res.data || { totais: {}, clientes: [] });
      } else if (activeTab === 'canhotos') {
        const res = await api.get('/relatorios/canhotos-pod', { params });
        setRelCanhotos(res.data || { totais: {}, fretes: [] });
      } else if (activeTab === 'contas_pagas') {
        const res = await api.get('/relatorios/contas-pagas', { params });
        setRelContasPagas(res.data || { totais: {}, baixas: [] });
      }
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, search, dataInicio, dataFim, statusFiltro, filtroPlaca, filtroTipoManut, metodologiaAtiva]);

  // Carregar Extrato Analítico do Motorista
  const handleOpenExtratoMotorista = async (nome) => {
    try {
      setSelectedMotoristaExtrato(nome);
      setLoadingExtrato(true);
      const res = await api.get('/relatorios/motorista-extrato', { params: { motorista_nome: nome } });
      setExtratoMotoristaData(res.data);
    } catch (err) {
      alert('Erro ao carregar extrato do motorista: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingExtrato(false);
    }
  };

  // Exportar para Excel (.CSV limpo e compatível com UTF-8)
  const handleExportarExcel = () => {
    let headers = [];
    let rows = [];
    let filename = `extrato_${activeTab}_${new Date().toISOString().substring(0, 10)}.csv`;

    if (activeTab === 'repasses') {
      headers = ['CT-e', 'Data Emissao', 'Motorista', 'Placa Veiculo', 'Tomador / Cliente', 'Frete Bruto (R$)', 'Comissao (%)', 'Comissao (R$)', 'Repasse Devido (R$)', 'Adiantamento Pago (R$)', 'Saldo a Pagar (R$)', 'Chave PIX', 'Status Repasse'];
      rows = (relRepasses.fretes || []).map(f => [
        `"CT-e ${f.numero_cte || 'S/N'}"`,
        `"${f.data_emissao || ''}"`,
        `"${f.motorista_nome || ''}"`,
        `"${f.placa_veiculo || ''}"`,
        `"${f.cliente_nome || ''}"`,
        (f.valor_frete_bruto || 0).toFixed(2).replace('.', ','),
        `${f.percentual_comissao || 5}%`,
        (f.valor_comissao || 0).toFixed(2).replace('.', ','),
        (f.valor_repasse_total || 0).toFixed(2).replace('.', ','),
        (f.valor_adiantamento_pago || 0).toFixed(2).replace('.', ','),
        (f.saldo_remanescente_repasse || 0).toFixed(2).replace('.', ','),
        `"${f.pix_chave || ''}"`,
        `"${f.status_repasse_calculado || 'pendente'}"`
      ]);
    } else if (activeTab === 'dre') {
      headers = ['CT-e', 'Data', 'Embarcador / Cliente', 'Motorista', 'Receita Bruta (R$)', 'Impostos (R$)', 'Repasse Freteiro (R$)', 'Pedagio (R$)', 'Custo Operacional Total (R$)', 'Lucro Liquido (R$)', 'Margem (%)'];
      rows = (relDre.viagens || []).map(v => [
        `"CT-e ${v.numero_cte || 'S/N'}"`,
        `"${v.data_emissao || ''}"`,
        `"${v.cliente_nome || ''}"`,
        `"${v.motorista_nome || ''}"`,
        (v.receita_bruta || 0).toFixed(2).replace('.', ','),
        (v.impostos || 0).toFixed(2).replace('.', ','),
        (v.custo_repasse || 0).toFixed(2).replace('.', ','),
        (v.pedagio || 0).toFixed(2).replace('.', ','),
        (v.custo_operacional_total || 0).toFixed(2).replace('.', ','),
        (v.lucro_bruto || 0).toFixed(2).replace('.', ','),
        `${v.margem_lucro_pct || 0}%`
      ]);
    } else if (activeTab === 'financeiro_fluxo') {
      headers = ['Categoria / Origem', 'Descricao / Fornecedor / Favorecido', 'Data Vencimento / Emissao', 'Tipo (Entrada/Saida)', 'Valor Total (R$)', 'Valor Realizado / Pago (R$)', 'Saldo Pendente (R$)', 'Status'];
      rows = (relFinanceiroFluxo.titulos || []).map(t => [
        `"${t.categoria_nome || t.categoria || 'Geral'}"`,
        `"${t.descricao || ''} (${t.pessoa_nome || 'N/I'})"`,
        `"${t.data_vencimento || t.data_emissao || ''}"`,
        t.tipo === 'receber' ? 'Entrada / Receita' : 'Saída / Despesa',
        (t.valor || 0).toFixed(2).replace('.', ','),
        (t.valor_pago || 0).toFixed(2).replace('.', ','),
        Math.max(0, (t.valor || 0) - (t.valor_pago || 0)).toFixed(2).replace('.', ','),
        `"${t.status || 'pendente'}"`
      ]);
    } else if (activeTab === 'manutencao_frota') {
      headers = ['Placa Veiculo', 'Data Manutencao', 'Tipo Manutencao', 'Descricao do Servico / Pecas', 'KM Atual', 'Oficina / Parceiro', 'Valor (R$)', 'Proxima Revisao KM', 'Proxima Revisao Data', 'Status'];
      rows = (relManutencaoFrota.manutencoes || []).map(m => [
        `"${m.placa || ''}"`,
        `"${m.data_manutencao || ''}"`,
        `"${m.tipo || 'preventiva'}"`,
        `"${m.descricao || ''}"`,
        m.quilometragem || '',
        `"${m.oficina_nome || '-'}"`,
        (m.valor || 0).toFixed(2).replace('.', ','),
        m.proxima_manutencao_km || '',
        m.proxima_manutencao_data || '',
        `"${m.status || 'realizada'}"`
      ]);
    } else if (activeTab === 'motoristas') {
      headers = ['Motorista', 'Telefone', 'Placa Cavalo', 'Placa Carreta', 'Total Viagens', 'Volume (Ton)', 'Frete Total Contratado (R$)', 'Total Pago (R$)', 'Saldo Devedor (R$)', 'Chave PIX'];
      rows = (relMotoristas.motoristas || []).map(m => [
        `"${m.motorista_nome || ''}"`,
        `"${m.motorista_telefone || ''}"`,
        `"${m.placa_veiculo || ''}"`,
        `"${m.placa_carreta || ''}"`,
        m.total_viagens || 0,
        (m.total_peso_ton || 0).toFixed(2).replace('.', ','),
        (m.total_frete_contratado || 0).toFixed(2).replace('.', ','),
        (m.total_efetivamente_pago || 0).toFixed(2).replace('.', ','),
        (m.total_saldo_devedor || 0).toFixed(2).replace('.', ','),
        `"${m.pix_chave || ''}"`
      ]);
    } else if (activeTab === 'clientes') {
      headers = ['Cliente / Embarcador', 'Total CT-es', 'Volume (Ton)', 'Faturamento Total (R$)', 'Total Recebido (R$)', 'Saldo a Receber (R$)', 'Comissao Agendada (R$)', 'Margem (%)'];
      rows = (relClientes.clientes || []).map(c => [
        `"${c.cliente_nome || ''}"`,
        c.total_ctes || 0,
        (c.total_peso_ton || 0).toFixed(2).replace('.', ','),
        (c.total_faturamento || 0).toFixed(2).replace('.', ','),
        (c.total_recebido || 0).toFixed(2).replace('.', ','),
        (c.total_a_receber || 0).toFixed(2).replace('.', ','),
        (c.total_comissao_estimada || 0).toFixed(2).replace('.', ','),
        `${c.margem_percentual || 0}%`
      ]);
    } else if (activeTab === 'contas_pagas') {
      headers = ['Data Pagamento', 'Tipo / Parcela', 'Favorecido', 'Descricao / CT-e', 'Forma Pagamento', 'Comprovante / Autenticacao', 'Valor Pago (R$)'];
      rows = (relContasPagas.baixas || []).map(b => [
        `"${b.data_pagamento || ''}"`,
        `"${b.tipo_parcela || ''}"`,
        `"${b.favorecido || ''}"`,
        `"${b.descricao || ''}"`,
        `"${b.forma_pagamento || ''}"`,
        `"${b.comprovante_ref || ''}"`,
        (b.valor || 0).toFixed(2).replace('.', ',')
      ]);
    } else if (activeTab === 'canhotos') {
      headers = ['CT-e', 'Data Emissao', 'Tomador', 'Motorista', 'Placa', 'Status Canhoto POD', 'Data/Hora Entrega', 'Recebedor Nome', 'Doc Recebedor'];
      rows = (relCanhotos.fretes || []).map(f => [
        `"CT-e ${f.numero_cte || 'S/N'}"`,
        `"${f.data_emissao || ''}"`,
        `"${f.cliente_nome || ''}"`,
        `"${f.motorista_nome || ''}"`,
        `"${f.placa_veiculo || ''}"`,
        `"${f.canhoto_status || 'pendente'}"`,
        `"${f.canhoto_data_hora || '-'}"`,
        `"${f.canhoto_recebedor_nome || '-'}"`,
        `"${f.canhoto_recebedor_doc || '-'}"`
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar para Impressão / Salvar PDF
  const handleImprimirPdf = () => {
    window.print();
  };

  // Copiar Extrato para WhatsApp do Motorista
  const handleCopyWhatsAppMotorista = (data) => {
    if (!data) return;
    const { motorista, resumo, fretes } = data;

    let viagensTxt = (fretes || []).map((f, i) => {
      const ctes = `CT-e ${f.numero_cte || 'S/N'}`;
      const rota = `${f.origem_cidade}/${f.origem_uf} ➔ ${f.destino_cidade}/${f.destino_uf}`;
      const peso = (f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : '0') + 't';
      const contratado = Number(f.valor_frete_compra || 0);
      const jaPago = Number(f.total_ja_pago || 0);
      const saldoViagem = Math.max(0, Number((contratado - jaPago).toFixed(2)));
      const statusViagem = saldoViagem <= 0.01 ? '100% QUITADO' : (jaPago > 0 ? 'PARCIALMENTE PAGO' : 'PENDENTE');

      return `🔹 *Viagem ${i + 1} (${new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}):* ${ctes} | ${rota} (${peso})
   • Frete Acertado: ${formatMoney(contratado)}
   • Já Pago / Adiantado: ${formatMoney(jaPago)}
   • Saldo Devedor: *${formatMoney(saldoViagem)}* [${statusViagem}]`;
    }).join('\n\n');

    const totalContratado = Number(resumo?.total_contratado || 0);
    const totalPago = Number(resumo?.total_pago || 0);
    const saldoGeral = Math.max(0, Number((totalContratado - totalPago).toFixed(2)));

    const msg = `🚚 *EXTRATO DE FRETES & PAGAMENTOS*
👤 *Motorista:* ${motorista.nome}
🚛 *Veículo:* ${motorista.placa_cavalo || 'N/I'} | Carreta: ${motorista.placa_carreta || 'N/I'}
🔑 *Chave PIX:* ${motorista.pix_chave || 'Informar na agência'}
---------------------------------------------
📊 *RESUMO GERAL:*
• Total de Viagens: *${resumo.total_viagens}*
• Volume: *${resumo.total_toneladas} toneladas*
• Valor Total Contratado: *${formatMoney(totalContratado)}*
• Total Efetivamente Pago: *${formatMoney(totalPago)}*
---------------------------------------------
💵 *SALDO REMANESCENTE A RECEBER: ${formatMoney(saldoGeral)}*
---------------------------------------------
📋 *DETALHAMENTO POR VIAGEM:*
${viagensTxt}

---------------------------------------------
*${activeEmpresa?.nome_fantasia || activeEmpresa?.razao_social || 'SisFrete Pro'}*`;

    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 3000);
  };

  const getNomeAbaFormatado = () => {
    switch (activeTab) {
      case 'repasses': return 'EXTRATO DE REPASSES & COMISSÕES DE AGENCIAMENTO';
      case 'dre': return 'DEMONSTRATIVO DE RESULTADO OPERACIONAL POR VIAGEM (DRE)';
      case 'contas_pagas': return 'RELATÓRIO ANALÍTICO DE CONTAS PAGAS & BAIXAS PARCIAIS';
      case 'financeiro_fluxo': return 'RELATÓRIO FINANCEIRO CONSOLIDADO & FLUXO DE CAIXA';
      case 'manutencao_frota': return 'RELATÓRIO DE MANUTENÇÃO DA FROTA & CUSTOS DE VEÍCULOS';
      case 'motoristas': return 'EXTRATO CONSOLIDADO DE MOTORISTAS & FRETES';
      case 'clientes': return 'EXTRATO DE FATURAMENTO POR TOMADOR / CLIENTE';
      case 'canhotos': return 'AUDITORIA & COMPROVAÇÃO DE ENTREGA (CANHOTOS POD)';
      default: return 'EXTRATO OPERACIONAL DE TRANSPORTES';
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 w-full max-w-[1700px] mx-auto print:p-0 print:max-w-full print:space-y-2">
      
      {/* Header na Tela (Oculto na Impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading flex items-center gap-2">
            <span>Relatórios & Extratos Estratégicos</span>
            {isLicencaGestao ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>💼 Gestão de Pagamentos (Rateio Freteiro, Comissão e Repasse)</span>
              </span>
            ) : isLicencaRepasse ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span>📊 Agenciamento & Repasse (Comissão {activeEmpresa?.percentual_comissao_padrao || 5}%)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>🚚 Subcontratação Tradicional (Freteiro)</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">
            {isLicencaGestao
              ? 'Rateio de pagamentos por CT-e, destinação individual para transportador, comissão de parceiro e repasses financeiros'
              : isLicencaRepasse 
              ? 'Gestão de comissões retidas da agência, repasses a caminhoneiros, faturamento e fluxo financeiro'
              : 'DRE operacional por viagem, lucro líquido do freteiro, controle de abastecimento/manutenção e fluxo financeiro'}
          </p>
        </div>

        {/* Botões de Exportação */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Exportar dados da tabela atual para planilha Excel (.CSV)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Exportar CSV / Excel</span>
          </button>

          <button
            onClick={handleImprimirPdf}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Imprimir relatório oficial em formato PDF"
          >
            <Printer className="h-4 w-4 text-blue-400" />
            <span>Imprimir Extrato (PDF)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CABEÇALHO OFICIAL MINIMALISTA TIPO EXTRATO BANCÁRIO (EXCLUSIVO PARA IMPRESSÃO PDF) */}
      {/* ========================================================================= */}
      <div className="hidden print:block border-b border-slate-400 pb-2 mb-2 text-slate-900 font-sans">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-tight">
              {activeEmpresa?.razao_social || 'SISFRETE PRO - TRANSPORTE & LOGÍSTICA'}
            </h2>
            <p className="text-[9.5px] text-slate-600">
              CNPJ: {activeEmpresa?.cnpj || '34.123.456/0001-89'} • {activeEmpresa?.cidade || 'Arapongas'}/{activeEmpresa?.uf || 'PR'} • Tel: {activeEmpresa?.telefone || '(43) 3055-0000'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10.5px] font-bold uppercase text-slate-800 block">
              {getNomeAbaFormatado()}
            </span>
            <span className="text-[9px] text-slate-500">
              {dataInicio || dataFim ? `Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'} • ` : ''}Emissão: {new Date().toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO ENTRE RELATÓRIOS (ENQUADRADAS NA METODOLOGIA DA LICENÇA) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 print:hidden text-xs">
        
        {/* ABA EXCLUSIVA DE AGENCIAMENTO: Repasses & Comissões */}
        {isAgenciamento && (
          <button
            onClick={() => setActiveTab('repasses')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'repasses'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Foco Agenciamento: Comissões retidas, repasses devidos a motoristas e saldos"
          >
            <DollarSign className="h-4 w-4" />
            <span>Repasses & Comissões</span>
          </button>
        )}

        {/* ABA EXCLUSIVA DE SUBCONTRATAÇÃO / FRETE: DRE por Viagem */}
        {!isAgenciamento && (
          <button
            onClick={() => setActiveTab('dre')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dre'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Foco Subcontratação: Frete Venda (-) Frete Compra/Freteiro = Margem Operacional"
          >
            <TrendingUp className="h-4 w-4" />
            <span>DRE por Viagem (Margens)</span>
          </button>
        )}

        {/* DEMAIS ABAS COMPARTILHADAS */}
        <button
          onClick={() => setActiveTab('financeiro_fluxo')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'financeiro_fluxo'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Consolidado Financeiro: Entradas vs Saídas operacionais, custos fixos e saldo real"
        >
          <Landmark className="h-4 w-4 text-emerald-400" />
          <span>Fluxo Financeiro & Caixa</span>
        </button>

        <button
          onClick={() => setActiveTab('manutencao_frota')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'manutencao_frota'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Gestão de Frota: Custos de oficinas, peças, pneus, preventivas e corretivas"
        >
          <Wrench className="h-4 w-4 text-amber-400" />
          <span>Manutenção & Frota</span>
        </button>

        <button
          onClick={() => setActiveTab('motoristas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'motoristas'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Extrato de Viagens e Acertos de Motoristas"
        >
          <Users className="h-4 w-4" />
          <span>Extrato de Motoristas</span>
        </button>

        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'clientes'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Clientes & Embarcadores</span>
        </button>

        <button
          onClick={() => setActiveTab('contas_pagas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'contas_pagas'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Extrato Analítico de Pagamentos e Baixas Parciais"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Contas Pagas & Baixas</span>
        </button>

        <button
          onClick={() => setActiveTab('canhotos')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'canhotos'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Auditoria Canhotos POD</span>
        </button>
      </div>

      {/* BARRA DE FILTROS (OCULTA NA IMPRESSÃO) */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por CT-e, motorista, cliente, placa ou descrição..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="Data Início"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              placeholder="Data Fim"
            />
          </div>
        </div>

        {/* Atalhos Rápidos de Data */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            Período:
          </span>
          <button
            type="button"
            onClick={() => handleFiltroDataRapido('hoje')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => handleFiltroDataRapido('semana')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Esta Semana
          </button>
          <button
            type="button"
            onClick={() => handleFiltroDataRapido('mes')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Este Mês
          </button>
          <button
            type="button"
            onClick={() => handleFiltroDataRapido('mes_anterior')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Mês Anterior
          </button>
          {(dataInicio || dataFim) && (
            <button
              type="button"
              onClick={() => handleFiltroDataRapido('limpar')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium transition cursor-pointer border border-rose-500/30 ml-auto"
            >
              Limpar Datas
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RELATÓRIO DE REPASSES & COMISSÕES DE AGENCIAMENTO */}
      {/* ========================================================================= */}
      {activeTab === 'repasses' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Faturamento Bruto</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relRepasses.totais?.total_faturamento_bruto)}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relRepasses.totais?.total_fretes || 0} viagens no período</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                {isLicencaGestao ? 'Comissão a Pagar' : 'Comissão Agência'}
              </span>
              <strong className="text-base font-mono font-black text-amber-400">
                {formatMoney(relRepasses.totais?.total_comissao_agencia)}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                {isLicencaGestao
                  ? (Number(relRepasses.totais?.total_comissao_agencia || 0) > 0 ? 'Comissão cadastrada' : 'Sem comissão')
                  : `Margem: ${relRepasses.totais?.margem_agenciamento_pct || 0}%`}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Repasse Total Freteiros</span>
              <strong className="text-base font-mono font-black text-blue-400">
                {formatMoney(relRepasses.totais?.total_repasse_devido)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Valor líquido contratado</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Adiantamentos Pagos</span>
              <strong className="text-base font-mono font-black text-emerald-300">
                {formatMoney(relRepasses.totais?.total_adiantamento_pago)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Quitado na saída</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-rose-300 text-[10px] uppercase font-bold block">Saldo a Pagar</span>
              <strong className="text-base font-mono font-black text-rose-400">
                {formatMoney(relRepasses.totais?.total_saldo_pendente_repasse)}
              </strong>
              <span className="text-[10px] text-rose-300/80 block">{relRepasses.totais?.total_repasses_pendentes || 0} repasses pendentes</span>
            </div>
          </div>

          {/* TABELA TIPO EXTRATO BANCÁRIO */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Data / CT-e</th>
                    <th className="px-3 py-2">Motorista / Placa</th>
                    <th className="px-3 py-2">Tomador / Rota</th>
                    <th className="px-3 py-2 text-right">Total CT-es</th>
                    <th className="px-3 py-2 text-right">{isLicencaGestao ? 'Comissão' : 'Comissão Agência'}</th>
                    <th className="px-3 py-2 text-right">Repasse Total</th>
                    <th className="px-3 py-2 text-right">Adiantado</th>
                    <th className="px-3 py-2 text-right font-black">Saldo Líquido</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Carregando extrato...</td>
                    </tr>
                  ) : (relRepasses.fretes || []).length > 0 ? (
                    (relRepasses.fretes || []).map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-1.5 font-mono">
                          {f.is_triangular || f.numero_cte_2 ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-indigo-300 block text-[10px]">1: CT-e {f.numero_cte || 'S/N'}</span>
                              <span className="font-bold text-purple-300 block text-[10px]">2: CT-e {f.numero_cte_2 || 'S/N'}</span>
                              <span className="text-[8.5px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold inline-block">🔄 Triangular</span>
                            </div>
                          ) : (
                            <span className="font-bold text-white print:text-slate-900 block">CT-e {f.numero_cte || 'S/N'}</span>
                          )}
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">{f.data_emissao ? new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-semibold text-slate-200 print:text-slate-900 block truncate max-w-[150px]">{f.motorista_nome}</span>
                          <span className="text-[9.5px] font-mono text-slate-400 print:text-slate-600">{f.placa_veiculo} • PIX: {f.pix_chave || 'N/I'}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          {f.is_triangular && f.cliente_nome_2 ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-200 print:text-slate-900 block truncate max-w-[150px]" title={f.cliente_nome}>1. {f.cliente_nome}</span>
                              <span className="font-medium text-slate-300 print:text-slate-900 block truncate max-w-[150px]" title={f.cliente_nome_2}>2. {f.cliente_nome_2}</span>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-300 print:text-slate-900 block truncate max-w-[150px]">{f.cliente_nome}</span>
                          )}
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">{f.origem_cidade}/${f.origem_uf} ➔ {f.destino_cidade}/${f.destino_uf}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-400 print:text-slate-900">
                          {formatMoney(f.valor_frete_bruto)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-amber-400 print:text-slate-900">
                          {Number(f.valor_comissao || 0) > 0 ? formatMoney(f.valor_comissao) : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-400 print:text-slate-900">
                          {formatMoney(f.valor_repasse_total)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-emerald-300 print:text-slate-900">
                          {formatMoney(f.valor_adiantamento_pago)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-black text-rose-400 print:text-slate-900">
                          {formatMoney(f.saldo_remanescente_repasse)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {f.saldo_remanescente_repasse <= 0.01 ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-500/20 text-emerald-300 print:text-slate-900 print:bg-transparent font-bold">
                              Quitado ✅
                            </span>
                          ) : f.valor_adiantamento_pago > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-500/20 text-amber-300 print:text-slate-900 print:bg-transparent font-bold">
                              Adiantado ⏳
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-rose-500/20 text-rose-300 print:text-slate-900 print:bg-transparent font-bold">
                              Pendente ⚠️
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum lançamento no período.
                      </td>
                    </tr>
                  )}
                </tbody>
                
                {/* RODAPÉ TIPO EXTRATO BANCÁRIO */}
                <tfoot className="bg-slate-850 font-bold border-t border-slate-700 print:bg-slate-100 print:border-slate-400 text-xs">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-white print:text-slate-900 uppercase">
                      Totalizador do Período ({relRepasses.totais?.total_fretes || 0} Lançamentos)
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 print:text-slate-900">
                      {formatMoney(relRepasses.totais?.total_faturamento_bruto)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-400 print:text-slate-900">
                      {Number(relRepasses.totais?.total_comissao_agencia || 0) > 0 ? formatMoney(relRepasses.totais?.total_comissao_agencia) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-400 print:text-slate-900">
                      {formatMoney(relRepasses.totais?.total_repasse_devido)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-300 print:text-slate-900">
                      {formatMoney(relRepasses.totais?.total_adiantamento_pago)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-400 print:text-slate-900 font-black">
                      {formatMoney(relRepasses.totais?.total_saldo_pendente_repasse)}
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] text-slate-400 print:text-slate-700">
                      -
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RELATÓRIO DRE OPERACIONAL POR VIAGEM */}
      {/* ========================================================================= */}
      {activeTab === 'dre' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Receita Bruta Total</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relDre.totais?.receita_bruta_total)}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relDre.totais?.total_viagens || 0} viagens operadas</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Custos Operacionais</span>
              <strong className="text-base font-mono font-black text-rose-400">
                {formatMoney(relDre.totais?.custo_total)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Repasses + Pedágios</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">Lucro Líquido Operacional</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relDre.totais?.lucro_liquido_total)}
              </strong>
              <span className="text-[10px] text-emerald-300/80 block">Margem Líquida: {relDre.totais?.margem_liquida_media_pct || 0}%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-blue-300 text-[10px] uppercase font-bold block">Margem % Média</span>
              <strong className="text-base font-mono font-black text-blue-400">
                {relDre.totais?.margem_liquida_media_pct || 0}%
              </strong>
              <span className="text-[10px] text-blue-300/80 block">Retorno sobre o frete</span>
            </div>
          </div>

          {/* TABELA DRE */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Data / CT-e</th>
                    <th className="px-3 py-2">Embarcador / Motorista</th>
                    <th className="px-3 py-2 text-right">Receita Bruta</th>
                    <th className="px-3 py-2 text-right">Repasse Freteiro</th>
                    <th className="px-3 py-2 text-right">Pedágio</th>
                    <th className="px-3 py-2 text-right">Custo Total</th>
                    <th className="px-3 py-2 text-right font-black">Lucro Líquido</th>
                    <th className="px-3 py-2 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Calculando DRE...</td>
                    </tr>
                  ) : (relDre.viagens || []).length > 0 ? (
                    (relDre.viagens || []).map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-1.5 font-mono">
                          {v.is_triangular ? (
                            <div>
                              <span className="font-bold text-white print:text-slate-900 block text-[11px]">
                                CT-e 1 Nº {v.numero_cte || 'S/N'}
                              </span>
                              <span className="font-bold text-purple-300 print:text-purple-800 block text-[11px]">
                                CT-e 2 Nº {v.numero_cte_2 || 'S/N'}
                              </span>
                              <span className="text-[8.5px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold inline-block mt-0.5">
                                🔄 Triangular (2 CT-es)
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-white print:text-slate-900 block">CT-e Nº {v.numero_cte || 'S/N'}</span>
                          )}
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600 block mt-0.5">
                            {v.data_emissao ? new Date(v.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {v.is_triangular ? (
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-200 print:text-slate-900 block truncate max-w-[180px]" title={v.cliente_nome}>
                                1. {v.cliente_nome}
                              </span>
                              <span className="font-medium text-purple-200 print:text-purple-800 block truncate max-w-[180px]" title={v.cliente_nome_2 || v.cliente_nome}>
                                2. {v.cliente_nome_2 || v.cliente_nome}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-200 print:text-slate-900 block truncate max-w-[180px]">{v.cliente_nome}</span>
                          )}
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600 block">Mot: {v.motorista_nome} ({v.placa_veiculo})</span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-100 print:text-slate-900">
                          {formatMoney(v.receita_bruta)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-rose-300 print:text-slate-900">
                          -{formatMoney(v.custo_repasse)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-400 print:text-slate-900">
                          -{formatMoney(v.pedagio)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-rose-400 print:text-slate-900 font-semibold">
                          -{formatMoney(v.custo_operacional_total)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-black text-emerald-400 print:text-slate-900">
                          {formatMoney(v.lucro_bruto)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-300 print:text-slate-900">
                          {v.margem_lucro_pct}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum lançamento DRE no período.
                      </td>
                    </tr>
                  )}
                </tbody>
                
                {/* RODAPÉ DRE */}
                <tfoot className="bg-slate-850 font-bold border-t border-slate-700 print:bg-slate-100 print:border-slate-400 text-xs">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-white print:text-slate-900 uppercase">
                      Total DRE ({relDre.totais?.total_viagens || 0} Viagens)
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-100 print:text-slate-900">
                      {formatMoney(relDre.totais?.receita_bruta_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-300 print:text-slate-900">
                      -{formatMoney(relDre.totais?.custo_repasse_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400 print:text-slate-900">
                      -{formatMoney(relDre.totais?.pedagio_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-400 print:text-slate-900 font-semibold">
                      -{formatMoney(relDre.totais?.custo_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 print:text-slate-900 font-black">
                      {formatMoney(relDre.totais?.lucro_liquido_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-300 print:text-slate-900 font-bold">
                      {relDre.totais?.margem_liquida_media_pct || 0}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RELATÓRIO FINANCEIRO CONSOLIDADO & FLUXO DE CAIXA */}
      {/* ========================================================================= */}
      {activeTab === 'financeiro_fluxo' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO FINANCEIRO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                {metodologiaAtiva === 'agenciamento' ? 'Receita Comissões (5-10%)' : 'Faturamento Total Bruto'}
              </span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relFinanceiroFluxo.totais?.receita_bruta_total)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Recebido: {formatMoney(relFinanceiroFluxo.totais?.total_recebido_clientes)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                {metodologiaAtiva === 'agenciamento' ? 'Repasses a Freteiros' : 'Custos Freteiros + Frota'}
              </span>
              <strong className="text-base font-mono font-black text-rose-400">
                {formatMoney(relFinanceiroFluxo.totais?.despesa_total_consolidada)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Pago: {formatMoney(relFinanceiroFluxo.totais?.despesas_operacionais_pagas)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">Resultado Líquido do Caixa</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relFinanceiroFluxo.totais?.lucro_liquido_real)}
              </strong>
              <span className="text-[10px] text-emerald-300/80 block">Margem Líquida: {relFinanceiroFluxo.totais?.margem_liquida_pct || 0}%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-blue-300 text-[10px] uppercase font-bold block">A Receber vs A Pagar</span>
              <strong className="text-base font-mono font-black text-blue-400">
                {formatMoney(relFinanceiroFluxo.totais?.saldo_a_receber_clientes)}
              </strong>
              <span className="text-[10px] text-rose-300/80 block">A Pagar: {formatMoney(relFinanceiroFluxo.totais?.repasse_freteiros_pendente || relFinanceiroFluxo.totais?.despesas_operacionais_pendentes)}</span>
            </div>
          </div>

          {/* TABELA CONSOLIDADA DE FLUXO FINANCEIRO */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Categoria / Origem</th>
                    <th className="px-3 py-2">Descrição / Favorecido / Tomador</th>
                    <th className="px-3 py-2">Vencimento / Data</th>
                    <th className="px-3 py-2 text-center">Tipo</th>
                    <th className="px-3 py-2 text-right">Valor Total</th>
                    <th className="px-3 py-2 text-right">Valor Realizado</th>
                    <th className="px-3 py-2 text-right font-black">Saldo Pendente</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Carregando fluxo financeiro...</td>
                    </tr>
                  ) : (relFinanceiroFluxo.titulos || []).length > 0 ? (
                    (relFinanceiroFluxo.titulos || []).map((t) => {
                      const vTot = Number(t.valor || 0);
                      const vPg = Number(t.valor_pago || 0);
                      const vSaldo = Math.max(0, Number((vTot - vPg).toFixed(2)));
                      const isQuitado = t.status === 'pago' || t.status === 'recebido' || vSaldo <= 0.01;

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-3 py-1.5">
                            <span className="font-semibold text-slate-200 print:text-slate-900 block">{t.categoria_nome || t.categoria || 'Geral'}</span>
                            <span className="text-[9px] text-slate-400 print:text-slate-600">{t.origem === 'frete_cte' ? '🚚 Frete / CT-e' : '🏢 Operacional Fixo'}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="font-medium text-white print:text-slate-900 block truncate max-w-[200px]">{t.descricao}</span>
                            <span className="text-[9.5px] text-slate-400 print:text-slate-600">{t.pessoa_nome || '-'}</span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-300 print:text-slate-900">
                            {t.data_vencimento ? new Date(t.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                              t.tipo === 'receber' ? 'bg-emerald-500/20 text-emerald-300 print:text-slate-900' : 'bg-rose-500/20 text-rose-300 print:text-slate-900'
                            }`}>
                              {t.tipo === 'receber' ? 'Receita / Entrada' : 'Despesa / Saída'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-100 print:text-slate-900">
                            {formatMoney(vTot)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-emerald-300 print:text-slate-900">
                            {formatMoney(vPg)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-black text-rose-400 print:text-slate-900">
                            {formatMoney(vSaldo)}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {isQuitado ? (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-500/20 text-emerald-300 font-bold">Quitado ✅</span>
                            ) : vPg > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-indigo-500/20 text-indigo-300 font-bold">Parcial ⏳</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-500/20 text-amber-300 font-bold">Pendente ⚠️</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum título financeiro no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RELATÓRIO DE MANUTENÇÃO DA FROTA & CUSTOS DE VEÍCULOS */}
      {/* ========================================================================= */}
      {activeTab === 'manutencao_frota' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO MANUTENÇÃO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Gasto em Manutenções</span>
              <strong className="text-base font-mono font-black text-rose-400">
                {formatMoney(relManutencaoFrota.totais?.total_gasto)}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relManutencaoFrota.totais?.total_manutencoes || 0} ordens de serviço</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Preventivas vs Corretivas</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {relManutencaoFrota.totais?.total_preventivas || 0} / {relManutencaoFrota.totais?.total_corretivas || 0}
              </strong>
              <span className="text-[10px] text-slate-500 block">Pneus & Freios: {relManutencaoFrota.totais?.total_pneus_freios || 0}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-blue-300 text-[10px] uppercase font-bold block">Veículos Atendidos</span>
              <strong className="text-base font-mono font-black text-blue-400">
                {relManutencaoFrota.totais?.total_veiculos_atendidos || 0} veículos
              </strong>
              <span className="text-[10px] text-blue-300/80 block">Custo Médio: {formatMoney(relManutencaoFrota.totais?.custo_medio_veiculo)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-300 text-[10px] uppercase font-bold block">Próximas Revisões Agendadas</span>
              <strong className="text-base font-mono font-black text-amber-400">
                {relManutencaoFrota.totais?.total_agendadas || 0} agendadas
              </strong>
              <span className="text-[10px] text-amber-300/80 block">Programadas no plano</span>
            </div>
          </div>

          {/* TABELA DE ORDENS DE SERVIÇO / MANUTENÇÕES */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Data / Placa</th>
                    <th className="px-3 py-2">Tipo de Serviço</th>
                    <th className="px-3 py-2">Descrição da Manutenção / Peças</th>
                    <th className="px-3 py-2">KM Atual</th>
                    <th className="px-3 py-2">Oficina / Fornecedor</th>
                    <th className="px-3 py-2">Próxima Revisão</th>
                    <th className="px-3 py-2 text-right font-black">Valor do Serviço</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Carregando histórico de manutenção...</td>
                    </tr>
                  ) : (relManutencaoFrota.manutencoes || []).length > 0 ? (
                    (relManutencaoFrota.manutencoes || []).map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-1.5 font-mono">
                          <span className="font-bold text-white print:text-slate-900 block">{m.placa}</span>
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">{m.data_manutencao ? new Date(m.data_manutencao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.tipo === 'preventiva' || m.tipo === 'revisao_geral'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : m.tipo === 'pneus_freios'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {m.tipo === 'preventiva' ? 'Preventiva' : m.tipo === 'corretiva' ? 'Corretiva' : m.tipo === 'pneus_freios' ? 'Pneus & Freios' : 'Revisão'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-slate-200 print:text-slate-900 block truncate max-w-[220px]">{m.descricao}</span>
                          {m.observacoes && <span className="text-[9.5px] text-slate-400 print:text-slate-600 block">{m.observacoes}</span>}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-300 print:text-slate-900">
                          {m.quilometragem ? `${m.quilometragem.toLocaleString('pt-BR')} km` : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-slate-300 print:text-slate-900">
                          {m.oficina_nome || 'Oficina Própria / Terceirizada'}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-amber-300 print:text-slate-900">
                          {m.proxima_manutencao_km ? `${m.proxima_manutencao_km.toLocaleString('pt-BR')} km` : ''} 
                          {m.proxima_manutencao_data ? ` (${new Date(m.proxima_manutencao_data + 'T12:00:00').toLocaleDateString('pt-BR')})` : ''}
                          {!m.proxima_manutencao_km && !m.proxima_manutencao_data && '-'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-400 print:text-slate-900">
                          {formatMoney(m.valor)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {m.status === 'realizada' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-500/20 text-emerald-300 font-bold">Realizada ✅</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-500/20 text-amber-300 font-bold">Agendada ⏳</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhuma ordem de manutenção registrada no período.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* RODAPÉ MANUTENÇÃO */}
                <tfoot className="bg-slate-850 font-bold border-t border-slate-700 print:bg-slate-100 print:border-slate-400 text-xs">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-white print:text-slate-900 uppercase">
                      Totalizador de Manutenções ({relManutencaoFrota.totais?.total_manutencoes || 0} Ordens de Serviço)
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-400 print:text-slate-900 font-black">
                      {formatMoney(relManutencaoFrota.totais?.total_gasto)}
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] text-slate-400 print:text-slate-700">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RELATÓRIO CONSOLIDADO DE MOTORISTAS */}
      {/* ========================================================================= */}
      {activeTab === 'motoristas' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Motoristas Ativos</span>
              <strong className="text-base font-mono font-black text-white">
                {relMotoristas.totais?.total_motoristas || 0}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relMotoristas.totais?.total_viagens || 0} viagens</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Frete Total Contratado</span>
              <strong className="text-base font-mono font-black text-blue-400">
                {formatMoney(relMotoristas.totais?.total_frete_contratado)}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relMotoristas.totais?.total_peso_ton || 0} ton</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Efetivamente Pago</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relMotoristas.totais?.total_efetivamente_pago)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Adiantamentos + Saldos</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-rose-300 text-[10px] uppercase font-bold block">Saldo Devedor a Pagar</span>
              <strong className="text-base font-mono font-black text-rose-400">
                {formatMoney(relMotoristas.totais?.total_saldo_devedor)}
              </strong>
              <span className="text-[10px] text-rose-300/80 block">A acertar</span>
            </div>
          </div>

          {/* TABELA DE MOTORISTAS */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Motorista / Contato</th>
                    <th className="px-3 py-2">Veículo / Chave PIX</th>
                    <th className="px-3 py-2 text-center">Viagens</th>
                    <th className="px-3 py-2 text-right">Volume (Ton)</th>
                    <th className="px-3 py-2 text-right">Frete Contratado</th>
                    <th className="px-3 py-2 text-right">Total Pago</th>
                    <th className="px-3 py-2 text-right font-black">Saldo a Pagar</th>
                    <th className="px-3 py-2 text-center print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Carregando motoristas...</td>
                    </tr>
                  ) : (relMotoristas.motoristas || []).length > 0 ? (
                    (relMotoristas.motoristas || []).map((m) => (
                      <tr key={m.motorista_nome} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-1.5">
                          <span className="font-semibold text-white print:text-slate-900 block">{m.motorista_nome}</span>
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">{m.motorista_telefone || 'Sem telefone'}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-mono text-slate-300 print:text-slate-900 block">{m.placa_veiculo} {m.placa_carreta ? `/ ${m.placa_carreta}` : ''}</span>
                          <span className="text-[9.5px] text-slate-500 print:text-slate-600 truncate max-w-[140px] block">PIX: {m.pix_chave || 'N/I'}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center font-bold text-white print:text-slate-900">
                          {m.total_viagens}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-300 print:text-slate-900">
                          {m.total_peso_ton} t
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-400 print:text-slate-900">
                          {formatMoney(m.total_frete_contratado)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-emerald-400 print:text-slate-900">
                          {formatMoney(m.total_efetivamente_pago)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-black text-rose-400 print:text-slate-900">
                          {formatMoney(m.total_saldo_devedor)}
                        </td>
                        <td className="px-3 py-1.5 text-center print:hidden">
                          <button
                            onClick={() => handleOpenExtratoMotorista(m.motorista_nome)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-[10px] transition cursor-pointer"
                          >
                            Extrato Detalhado
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum motorista no período.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* RODAPÉ MOTORISTAS */}
                <tfoot className="bg-slate-850 font-bold border-t border-slate-700 print:bg-slate-100 print:border-slate-400 text-xs">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-white print:text-slate-900 uppercase">
                      Total ({relMotoristas.totais?.total_motoristas || 0} Motoristas)
                    </td>
                    <td className="px-3 py-2 text-center text-white print:text-slate-900">
                      {relMotoristas.totais?.total_viagens || 0}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-900">
                      {relMotoristas.totais?.total_peso_ton || 0} t
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-400 print:text-slate-900">
                      {formatMoney(relMotoristas.totais?.total_frete_contratado)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 print:text-slate-900">
                      {formatMoney(relMotoristas.totais?.total_efetivamente_pago)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-400 print:text-slate-900 font-black">
                      {formatMoney(relMotoristas.totais?.total_saldo_devedor)}
                    </td>
                    <td className="px-3 py-2 text-center print:hidden">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. RELATÓRIO DE CLIENTES / EMBARCADORES */}
      {/* ========================================================================= */}
      {activeTab === 'clientes' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total de Embarcadores</span>
              <strong className="text-base font-mono font-black text-white">
                {relClientes.totais?.total_clientes || 0}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relClientes.totais?.total_ctes || 0} CT-es faturados</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Faturamento Total</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {formatMoney(relClientes.totais?.total_faturamento)}
              </strong>
              <span className="text-[10px] text-slate-500 block">{relClientes.totais?.total_peso_ton || 0} ton transportadas</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Recebido</span>
              <strong className="text-base font-mono font-black text-emerald-300">
                {formatMoney(relClientes.totais?.total_recebido)}
              </strong>
              <span className="text-[10px] text-slate-500 block">Títulos quitados</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-rose-300 text-[10px] uppercase font-bold block">Saldo a Receber</span>
              <strong className="text-base font-mono font-black text-rose-400">
                {formatMoney(relClientes.totais?.total_a_receber)}
              </strong>
              <span className="text-[10px] text-rose-300/80 block">Em aberto</span>
            </div>
          </div>

          {/* TABELA DE CLIENTES */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Cliente / Embarcador</th>
                    <th className="px-3 py-2 text-center">CT-es</th>
                    <th className="px-3 py-2 text-right">Volume (Ton)</th>
                    <th className="px-3 py-2 text-right">Faturamento Total</th>
                    <th className="px-3 py-2 text-right">Total Recebido</th>
                    <th className="px-3 py-2 text-right font-black">Saldo a Receber</th>
                    <th className="px-3 py-2 text-right">Comissão Agência</th>
                    <th className="px-3 py-2 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Carregando clientes...</td>
                    </tr>
                  ) : (relClientes.clientes || []).length > 0 ? (
                    (relClientes.clientes || []).map((c) => (
                      <tr key={c.cliente_nome} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-1.5">
                          <span className="font-semibold text-white print:text-slate-900 block">{c.cliente_nome}</span>
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">Rotas: {c.rotas_principais?.join(' • ') || 'Diversas'}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center font-bold text-white print:text-slate-900">
                          {c.total_ctes}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-300 print:text-slate-900">
                          {c.total_peso_ton} t
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-400 print:text-slate-900">
                          {formatMoney(c.total_faturamento)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-emerald-300 print:text-slate-900">
                          {formatMoney(c.total_recebido)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-black text-rose-400 print:text-slate-900">
                          {formatMoney(c.total_a_receber)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-amber-400 print:text-slate-900">
                          {formatMoney(c.total_comissao_estimada)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-300 print:text-slate-900">
                          {c.margem_percentual}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum cliente no período.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* RODAPÉ CLIENTES */}
                <tfoot className="bg-slate-850 font-bold border-t border-slate-700 print:bg-slate-100 print:border-slate-400 text-xs">
                  <tr>
                    <td className="px-3 py-2 text-white print:text-slate-900 uppercase">
                      Total ({relClientes.totais?.total_clientes || 0} Embarcadores)
                    </td>
                    <td className="px-3 py-2 text-center text-white print:text-slate-900">
                      {relClientes.totais?.total_ctes || 0}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-900">
                      {relClientes.totais?.total_peso_ton || 0} t
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 print:text-slate-900">
                      {formatMoney(relClientes.totais?.total_faturamento)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-300 print:text-slate-900">
                      {formatMoney(relClientes.totais?.total_recebido)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-400 print:text-slate-900 font-black">
                      {formatMoney(relClientes.totais?.total_a_receber)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-400 print:text-slate-900">
                      {formatMoney(relClientes.totais?.total_comissao)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-300 print:text-slate-900 font-bold">
                      -
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RELATÓRIO DE CANHOTOS DIGITAIS POD */}
      {/* ========================================================================= */}
      {activeTab === 'canhotos' && (
        <div className="space-y-4 print:space-y-1">
          
          {/* CARDS RESUMO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Taxa de Comprovação</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {relCanhotos.totais?.taxa_comprovacao_pct || 0}%
              </strong>
              <span className="text-[10px] text-slate-500 block">{relCanhotos.totais?.total_aprovados || 0} de {relCanhotos.totais?.total_ctes || 0} comprovados</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">Canhotos Aprovados</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                {relCanhotos.totais?.total_aprovados || 0}
              </strong>
              <span className="text-[10px] text-emerald-300/80 block">Faturamento liberado</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-300 text-[10px] uppercase font-bold block">Em Análise</span>
              <strong className="text-base font-mono font-black text-amber-400">
                {relCanhotos.totais?.total_em_analise || 0}
              </strong>
              <span className="text-[10px] text-amber-300/80 block">Aguardando conferência</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-rose-300 text-[10px] uppercase font-bold block">Canhotos Pendentes</span>
              <strong className="text-base font-mono font-black text-rose-400">
                {relCanhotos.totais?.total_pendentes || 0}
              </strong>
              <span className="text-[10px] text-rose-300/80 block">Aguardando motorista</span>
            </div>
          </div>

          {/* TABELA DE AUDITORIA DE CANHOTOS */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print-table">
                <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Data / CT-e</th>
                    <th className="px-3 py-2">Embarcador / Destino</th>
                    <th className="px-3 py-2">Motorista / Placa</th>
                    <th className="px-3 py-2 text-center">Status POD</th>
                    <th className="px-3 py-2">Data/Hora Comprovação</th>
                    <th className="px-3 py-2">Recebedor / Documento</th>
                    <th className="px-3 py-2 text-center print:hidden">Foto Canhoto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 print:text-slate-800">Carregando canhotos...</td>
                    </tr>
                  ) : (relCanhotos.fretes || []).length > 0 ? (
                    (relCanhotos.fretes || []).map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-1.5 font-mono">
                          <span className="font-bold text-white print:text-slate-900 block">CT-e {f.numero_cte || 'S/N'}</span>
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">{f.data_emissao ? new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-slate-200 print:text-slate-900 block truncate max-w-[160px]">{f.cliente_nome}</span>
                          <span className="text-[9.5px] text-slate-400 print:text-slate-600">{f.origem_cidade}/{f.origem_uf} ➔ {f.destino_cidade}/{f.destino_uf}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-blue-300 print:text-slate-900 block truncate max-w-[140px]">{f.motorista_nome}</span>
                          <span className="text-[9.5px] font-mono text-slate-400 print:text-slate-600">{f.placa_veiculo}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {f.canhoto_status === 'aprovado' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-500/20 text-emerald-300 print:text-slate-900 font-bold">
                              Aprovado ✅
                            </span>
                          ) : f.canhoto_status === 'em_analise' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-500/20 text-amber-300 print:text-slate-900 font-bold">
                              Em Análise 🔍
                            </span>
                          ) : f.canhoto_status === 'rejeitado' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-rose-500/20 text-rose-300 print:text-slate-900 font-bold">
                              Rejeitado ❌
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-slate-800 text-slate-400 print:text-slate-700 font-bold">
                              Pendente ⏳
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-300 print:text-slate-900">
                          {f.canhoto_data_hora ? new Date(f.canhoto_data_hora).toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="text-slate-200 print:text-slate-900 block">{f.canhoto_recebedor_nome || '-'}</span>
                          <span className="text-[9.5px] text-slate-500 print:text-slate-600">{f.canhoto_recebedor_doc || ''}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center print:hidden">
                          {f.canhoto_foto_url ? (
                            <a
                              href={f.canhoto_foto_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] hover:bg-emerald-600/30 transition"
                            >
                              Ver Foto
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500">Sem Foto</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum CT-e no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. RELATÓRIO DE CONTAS PAGAS & BAIXAS PARCIAIS ANALÍTICAS               */}
      {/* ========================================================================= */}
      {activeTab === 'contas_pagas' && (
        <div className="space-y-4 print:space-y-1">
          {/* CARDS RESUMO (OCULTOS NA IMPRESSÃO) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Total Pago / Liquidado
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <strong className="text-xl font-mono font-black text-emerald-400 block">
                {formatMoney(relContasPagas.totais?.total_pago)}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                {relContasPagas.totais?.total_lancamentos || 0} pagamento(s) realizados no período
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Volume de Baixas
                </span>
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <strong className="text-xl font-mono font-black text-white block">
                {relContasPagas.totais?.total_lancamentos || 0} Baixas
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Pagamentos totais e parcelas parciais
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Recebimentos no Período
                </span>
                <ArrowDownRight className="h-4 w-4 text-indigo-400" />
              </div>
              <strong className="text-xl font-mono font-black text-indigo-400 block">
                {formatMoney(relContasPagas.totais?.total_recebido)}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                Liquidações de fretes a receber de clientes
              </span>
            </div>
          </div>

          {/* TABELA ANALÍTICA DE BAIXAS */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl print:border-slate-300 print:bg-white print:rounded-none">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h3 className="font-bold text-white text-xs font-heading">
                  Extrato Analítico de Baixas & Pagamentos Efetuados
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {relContasPagas.baixas?.length || 0} registro(s) encontrado(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 print:text-slate-900">
                <thead className="bg-slate-850 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                  <tr>
                    <th className="px-3 py-2.5">Data Baixa</th>
                    <th className="px-3 py-2.5">Tipo / Parcela</th>
                    <th className="px-3 py-2.5">Favorecido / Fornecedor</th>
                    <th className="px-3 py-2.5">Descrição / CT-e Vinculado</th>
                    <th className="px-3 py-2.5 text-center">Forma</th>
                    <th className="px-3 py-2.5">Comprovante / Ref.</th>
                    <th className="px-3 py-2.5 text-right font-black">Valor Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        Carregando extrato de contas pagas...
                      </td>
                    </tr>
                  ) : relContasPagas.baixas?.length > 0 ? (
                    relContasPagas.baixas.map((b, i) => (
                      <tr key={b.id || i} className="hover:bg-slate-800/40 print:hover:bg-transparent transition">
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-300 print:text-slate-800 text-[11px]">
                          {b.data_pagamento ? new Date(b.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {b.tipo_parcela === 'por_fora' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Por Fora
                            </span>
                          ) : b.tipo_parcela === 'adiantamento' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Adiantamento
                            </span>
                          ) : b.tipo_parcela === 'repasse' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Repasse
                            </span>
                          ) : b.tipo_parcela === 'comissao' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Comissão
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              CT-e Fiscal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-white print:text-slate-900">
                          {b.favorecido || 'Não Identificado'}
                        </td>
                        <td className="px-3 py-2 text-slate-300 print:text-slate-800">
                          <p className="line-clamp-1">{b.descricao || '-'}</p>
                          {b.observacoes && (
                            <p className="text-[10px] text-slate-500 italic line-clamp-1">{b.observacoes}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300 uppercase">
                            {b.forma_pagamento || 'PIX'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                          {b.comprovante_ref ? (
                            <span className="text-emerald-400" title={b.comprovante_ref}>
                              {b.comprovante_ref}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400 text-xs whitespace-nowrap">
                          {formatMoney(b.valor)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500 print:text-slate-800">
                        Nenhum pagamento ou baixa registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ANALÍTICO DE EXTRATO DO MOTORISTA */}
      {/* ========================================================================= */}
      {selectedMotoristaExtrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto print:hidden">
          <div className="w-full max-w-4xl bg-slate-900 border border-blue-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header Extrato */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white">
                    Extrato de Fretes: {selectedMotoristaExtrato}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Prestação de contas detalhada com saldos e comprovantes PIX
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyWhatsAppMotorista(extratoMotoristaData)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{copiedMsg ? 'Copiado ✅' : 'WhatsApp'}</span>
                </button>

                <button
                  onClick={() => setSelectedMotoristaExtrato(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Extrato */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {loadingExtrato ? (
                <div className="py-12 text-center text-slate-400">Carregando extrato analítico...</div>
              ) : extratoMotoristaData ? (
                <>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Veículo / Placas</span>
                      <strong className="text-white font-mono">{extratoMotoristaData.motorista?.placa_cavalo || 'N/I'} / {extratoMotoristaData.motorista?.placa_carreta || 'N/I'}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Chave PIX</span>
                      <strong className="text-emerald-400 font-mono truncate block">{extratoMotoristaData.motorista?.pix_chave || 'Não informada'}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Contratado</span>
                      <strong className="text-blue-400 font-mono text-sm">{formatMoney(extratoMotoristaData.resumo?.total_contratado)}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Saldo a Receber</span>
                      <strong className="text-rose-400 font-mono text-sm font-black">{formatMoney(extratoMotoristaData.resumo?.saldo_devedor)}</strong>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-850 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5">CT-e / Data</th>
                          <th className="px-3 py-2.5">Trajeto</th>
                          <th className="px-3 py-2.5 text-right">Frete Acertado</th>
                          <th className="px-3 py-2.5 text-right">Já Pago</th>
                          <th className="px-3 py-2.5 text-right font-black">Saldo</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(extratoMotoristaData.fretes || []).map((f) => (
                          <tr key={f.id} className="hover:bg-slate-900/50">
                            <td className="px-3 py-2">
                              <p className="font-bold text-white font-mono">CT-e {f.numero_cte || 'S/N'}</p>
                              <p className="text-[10px] text-slate-400">{new Date(f.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {f.origem_cidade}/{f.origem_uf} ➔ {f.destino_cidade}/{f.destino_uf}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-blue-400">
                              {formatMoney(f.valor_frete_compra)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-400">
                              {formatMoney(f.total_ja_pago)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-black text-rose-400">
                              {formatMoney(f.valor_saldo_motorista)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {f.valor_saldo_motorista <= 0.01 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                  Quitado ✅
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                  Pendente ⏳
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
