import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  PlusCircle, 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  Scale, 
  Layers, 
  Building2, 
  Upload, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2, 
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react';
import api from '../services/api';
import CarregamentoMapa from '../components/CarregamentoMapa';
import NovoCarregamentoModal from '../components/NovoCarregamentoModal';
import ImportarCteCarregamentoModal from '../components/ImportarCteCarregamentoModal';

export default function CarregamentosList() {
  const [carregamentos, setCarregamentos] = useState([]);
  const [mapaCidades, setMapaCidades] = useState([]);
  const [metricas, setMetricas] = useState({
    total_geral: 0,
    total_carregando: 0,
    total_aguardando_cte: 0,
    total_concluidos: 0,
    total_cidades_ativas: 0,
    total_peso_estimado_ton: 0,
    total_valor_estimado: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mapa'); // 'mapa' | 'tabela'
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [carregamentoParaEditar, setCarregamentoParaEditar] = useState(null);

  const [isImportarXmlOpen, setIsImportarXmlOpen] = useState(false);
  const [carregamentoParaImportar, setCarregamentoParaImportar] = useState(null);

  const [carregamentoParaExcluir, setCarregamentoParaExcluir] = useState(null);
  const [isExcluindo, setIsExcluindo] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/carregamentos', {
        params: {
          status: filtroStatus !== 'todos' ? filtroStatus : undefined,
          search: search.trim() || undefined
        }
      });

      setCarregamentos(res.data?.carregamentos || []);
      setMapaCidades(res.data?.mapa_cidades || []);
      if (res.data?.metricas) {
        setMetricas(res.data.metricas);
      }
    } catch (err) {
      console.error('Erro ao carregar carregamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenNovo = () => {
    setCarregamentoParaEditar(null);
    setIsNovoModalOpen(true);
  };

  const handleOpenEditar = (item) => {
    setCarregamentoParaEditar(item);
    setIsNovoModalOpen(true);
  };

  const handleOpenImportarXml = (item) => {
    setCarregamentoParaImportar(item);
    setIsImportarXmlOpen(true);
  };

  const handleConfirmExcluir = async () => {
    if (!carregamentoParaExcluir) return;
    try {
      setIsExcluindo(true);
      await api.delete(`/carregamentos/${carregamentoParaExcluir.id}`);
      setCarregamentoParaExcluir(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir carregamento.');
    } finally {
      setIsExcluindo(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* 1. CARDS DE MÉTRICAS EXECUTIVAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Caminhões Carregando */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-amber-950/40 border border-amber-500/30 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Carregando Agora
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metricas.total_carregando}
            </span>
            <span className="text-xs text-amber-400 font-semibold">caminhões</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Presentes no pátio dos fornecedores
          </p>
        </div>

        {/* Card 2: Cidades Ativas no Mapa */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-blue-950/40 border border-blue-500/30 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              Cidades Ativas
            </span>
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metricas.total_cidades_ativas}
            </span>
            <span className="text-xs text-blue-400 font-semibold">polos</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Pontos de carregamento com cargas ativas
          </p>
        </div>

        {/* Card 3: Peso Estimado Total */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Volume Estimado
            </span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metricas.total_peso_estimado_ton.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Ton</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Estimativa de carga em processo
          </p>
        </div>

        {/* Card 4: Frete Estimado Total */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Frete Previsto
            </span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-indigo-300 font-medium">R$</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {metricas.total_valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Negociado a pagar aos freteiros
          </p>
        </div>

        {/* Card 5: Concluídos / CT-e Faturado */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-teal-950/40 border border-teal-500/30 shadow-lg shadow-teal-500/5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
              CT-e Concluídos
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {metricas.total_concluidos}
            </span>
            <span className="text-xs text-teal-400 font-semibold">faturados</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Integrados ao módulo Financeiro
          </p>
        </div>

      </div>

      {/* 2. BARRA DE FILTROS & AÇÕES */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        
        {/* Lado Esquerdo: Abas de Visualização (Mapa vs Tabela) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('mapa')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mapa'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Mapa Operacional (Ao Vivo)
          </button>

          <button
            onClick={() => setActiveTab('tabela')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tabela'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Lista de Carregamentos
          </button>
        </div>

        {/* Lado Direito: Filtros & Botão Novo Carregamento */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Busca por texto */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar motorista, placa, Mafra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </form>

          {/* Filtro de Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="todos">Status: Todos</option>
            <option value="carregando">No Pátio (Carregando)</option>
            <option value="aguardando_cte">Aguardando CT-e</option>
            <option value="concluido">Concluídos (Com CT-e)</option>
          </select>

          {/* Botão de Atualizar */}
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão Principal: Novo Carregamento */}
          <button
            onClick={handleOpenNovo}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Carregamento
          </button>
        </div>

      </div>

      {/* 3. CONTEÚDO PRINCIPAL: MAPA OU TABELA */}
      {activeTab === 'mapa' ? (
        <div className="space-y-3">
          {/* Componente Leaflet do Mapa */}
          <CarregamentoMapa
            mapaCidades={mapaCidades}
            onImportarCte={handleOpenImportarXml}
            onEditarCarregamento={handleOpenEditar}
          />
        </div>
      ) : (
        /* TABELA DE CARREGAMENTOS */
        <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Motorista & Veículo</th>
                  <th className="py-3.5 px-4">Onde Carrega (Fornecedor)</th>
                  <th className="py-3.5 px-4">Inclusão</th>
                  <th className="py-3.5 px-4">Destino (Cliente)</th>
                  <th className="py-3.5 px-4">Valor Combinado</th>
                  <th className="py-3.5 px-4 text-center">Operação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {carregamentos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum carregamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  carregamentos.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-850/50 transition-colors group">
                      
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'carregando' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[10px] border border-amber-500/20">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Carregando
                          </span>
                        )}
                        {item.status === 'aguardando_cte' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 font-bold text-[10px] border border-blue-500/20">
                            <Clock className="w-3 h-3" />
                            Aguardando CT-e
                          </span>
                        )}
                        {item.status === 'concluido' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-bold text-[10px] border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            CT-e {item.numero_cte || 'OK'}
                          </span>
                        )}
                      </td>

                      {/* Motorista & Placas */}
                      <td className="py-3.5 px-4">
                        <strong className="text-white font-bold block">
                          {item.motorista_nome}
                        </strong>
                        <span className="text-[11px] text-slate-400 block">
                          Cavalo: <strong className="text-slate-200">{item.placa_cavalo}</strong>
                          {item.placa_carreta && <> | Carreta: <strong className="text-slate-200">{item.placa_carreta}</strong></>}
                        </span>
                      </td>

                      {/* Fornecedor & Cidade de Carregamento */}
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-200 block truncate max-w-[200px]">
                          {item.fornecedor_nome}
                        </strong>
                        <span className="text-[11px] text-amber-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.origem_cidade} - {item.origem_uf}
                        </span>
                      </td>

                      {/* Data e Hora de Inclusão */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-200 font-semibold block">
                          {item.hora_inclusao || '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.tempo_decorrido || item.data_inclusao_formatada}
                        </span>
                      </td>

                      {/* Destino */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-300 block truncate max-w-[180px]">
                          {item.destino_empresa_nome}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.destino_cidade}/{item.destino_uf}
                        </span>
                      </td>

                      {/* Valores Combinados */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <strong className="text-emerald-400 font-bold block">
                          R$ {Number(item.valor_combinado_kg || 0).toFixed(4)} / kg
                        </strong>
                        {item.status === 'concluido' && Number(item.valor_frete_motorista_real) > 0 ? (
                          <div className="text-[10px] space-y-0.5 mt-0.5">
                            <span className="text-slate-300 block">
                              Real: <strong>R$ {Number(item.valor_frete_motorista_real).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            {Number(item.valor_por_fora) > 0 && (
                              <span className="text-amber-400 font-bold block bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                Por Fora: R$ {Number(item.valor_por_fora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Est: R$ {Number(item.valor_frete_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Operação (Triangular ou Padrão) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.is_triangular ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20" title={`Intermediadora: ${item.intermediador_nome || '-'}`}>
                            <Layers className="w-3 h-3" />
                            Triangular
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">
                            Padrão
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== 'concluido' ? (
                            <button
                              onClick={() => handleOpenImportarXml(item)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                              title="Importar XML do CT-e e Lançar no Financeiro"
                            >
                              <Upload className="w-3 h-3" />
                              Importar CT-e
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                              Lançado
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenEditar(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                            title="Editar Carregamento"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setCarregamentoParaExcluir(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Excluir Carregamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR CARREGAMENTO */}
      <NovoCarregamentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSuccess={loadData}
        carregamentoParaEditar={carregamentoParaEditar}
      />

      {/* MODAL: IMPORTAR XML DO CT-E */}
      <ImportarCteCarregamentoModal
        isOpen={isImportarXmlOpen}
        onClose={() => setIsImportarXmlOpen(false)}
        carregamento={carregamentoParaImportar}
        onSuccess={loadData}
      />

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {carregamentoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Excluir Carregamento?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tem certeza que deseja remover o carregamento do motorista <strong>{carregamentoParaExcluir.motorista_nome}</strong> ({carregamentoParaExcluir.placa_cavalo}) em {carregamentoParaExcluir.origem_cidade}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCarregamentoParaExcluir(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isExcluindo}
                onClick={handleConfirmExcluir}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExcluindo ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
