import React, { useState, useEffect } from 'react';
import { 
  Database,
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  Edit, 
  PlusCircle, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  KeyRound, 
  Layers, 
  Truck, 
  Users, 
  DollarSign, 
  Receipt, 
  FileSpreadsheet, 
  ArrowRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  Wrench,
  Circle,
  HelpCircle,
  Save
} from 'lucide-react';
import api from '../services/api';

export default function DatabaseExplorer({ initialEmpresaId = 'todas' }) {
  // Estado de Licença selecionada
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(initialEmpresaId);
  const [empresas, setEmpresas] = useState([]);

  // Estado de Tabelas e Resumo
  const [tablesSummary, setTablesSummary] = useState([]);
  const [activeTable, setActiveTable] = useState('fretes');
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Estado de Dados da Tabela Ativa
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limitPerPage, setLimitPerPage] = useState(25);

  // Modais de Edição / Inserção
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null); // null se for inserção
  const [recordFormData, setRecordFormData] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordModalError, setRecordModalError] = useState('');

  // Modal de Purge / Limpeza de Licença
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeScope, setPurgeScope] = useState('operacional'); // 'operacional' | 'completo'
  const [purging, setPurging] = useState(false);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState('');
  const [purgeErrorMsg, setPurgeErrorMsg] = useState('');

  // Carregar Resumo das Tabelas e Empresas
  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get('/saas/database/summary', {
        params: { empresa_id: selectedEmpresaId }
      });
      setEmpresas(res.data.empresas || []);
      setTablesSummary(res.data.tables || []);
    } catch (err) {
      console.error('Erro ao carregar resumo do banco:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Carregar Registros da Tabela Ativa
  const loadTableData = async (table = activeTable, page = currentPage, search = searchTerm) => {
    try {
      setLoadingData(true);
      const res = await api.get('/saas/database/table-data', {
        params: {
          table,
          empresa_id: selectedEmpresaId,
          search,
          page,
          limit: limitPerPage,
          order_by: 'id',
          order_dir: 'DESC'
        }
      });
      setTableData(res.data.rows || []);
      setColumns(res.data.columns || []);
      setCurrentPage(res.data.pagination?.page || 1);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(res.data.pagination?.totalRecords || 0);
    } catch (err) {
      console.error('Erro ao carregar dados da tabela:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedEmpresaId]);

  useEffect(() => {
    loadTableData(activeTable, 1, searchTerm);
  }, [activeTable, selectedEmpresaId, limitPerPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTableData(activeTable, 1, searchTerm);
  };

  // Download do Backup SQLite real do Render
  const handleDownloadBackup = async () => {
    try {
      const res = await api.get('/saas/database/download-backup', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const dataHora = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `sisfrete-backup-${dataHora}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao baixar arquivo do banco de dados: ' + (err.response?.data?.error || err.message));
    }
  };

  // Abrir Modal de Novo Registro
  const handleOpenNewRecord = () => {
    setEditingRecord(null);
    const initialData = {};
    columns.forEach(col => {
      if (col.name === 'empresa_id') {
        initialData[col.name] = selectedEmpresaId !== 'todas' ? Number(selectedEmpresaId) : 1;
      } else if (col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at') {
        initialData[col.name] = col.dflt_value ? col.dflt_value.replace(/'/g, '') : '';
      }
    });
    setRecordFormData(initialData);
    setRecordModalError('');
    setIsRecordModalOpen(true);
  };

  // Abrir Modal de Edição de Registro
  const handleOpenEditRecord = (row) => {
    setEditingRecord(row);
    const initialData = { ...row };
    delete initialData.created_at;
    delete initialData.updated_at;
    setRecordFormData(initialData);
    setRecordModalError('');
    setIsRecordModalOpen(true);
  };

  // Salvar Registro (Insert ou Update)
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    setRecordModalError('');
    setSavingRecord(true);
    try {
      if (editingRecord) {
        await api.put('/saas/database/record', {
          table: activeTable,
          id: editingRecord.id,
          data: recordFormData
        });
      } else {
        await api.post('/saas/database/record', {
          table: activeTable,
          data: recordFormData
        });
      }
      setIsRecordModalOpen(false);
      await loadTableData(activeTable, currentPage, searchTerm);
      await loadSummary();
    } catch (err) {
      setRecordModalError(err.response?.data?.error || 'Erro ao salvar registro.');
    } finally {
      setSavingRecord(false);
    }
  };

  // Excluir Registro Individual
  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o registro #${id} da tabela '${activeTable}'?`)) {
      return;
    }
    try {
      await api.delete('/saas/database/record', {
        data: { table: activeTable, id }
      });
      await loadTableData(activeTable, currentPage, searchTerm);
      await loadSummary();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir registro.');
    }
  };

  // Executar Limpeza de Dados da Licença
  const handlePurgeLicenca = async () => {
    if (selectedEmpresaId === 'todas') {
      alert('Selecione uma licença específica para executar a limpeza de dados.');
      return;
    }
    const emp = empresas.find(e => String(e.id) === String(selectedEmpresaId));
    const nomeEmp = emp?.nome_fantasia || emp?.razao_social || `#${selectedEmpresaId}`;

    const confirmMsg = purgeScope === 'completo'
      ? `ATENÇÃO CRÍTICA: Você está prestes a apagar TODOS os dados (Fretes, Financeiro, Clientes, Motoristas e Frotas) da Licença "${nomeEmp}". Deseja continuar?`
      : `Confirma a limpeza de todos os Fretes, Títulos Financeiros e Manifestos da Licença "${nomeEmp}"? (Cadastros de Clientes e Motoristas serão mantidos).`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setPurging(true);
      setPurgeErrorMsg('');
      const res = await api.post('/saas/database/purge-licenca', {
        empresa_id: selectedEmpresaId,
        scope: purgeScope
      });
      setPurgeSuccessMsg(res.data.message);
      await loadTableData(activeTable, 1, '');
      await loadSummary();
      setTimeout(() => {
        setIsPurgeModalOpen(false);
        setPurgeSuccessMsg('');
      }, 2000);
    } catch (err) {
      setPurgeErrorMsg(err.response?.data?.error || 'Erro ao limpar dados da licença.');
    } finally {
      setPurging(false);
    }
  };

  const activeEmpresaObj = empresas.find(e => String(e.id) === String(selectedEmpresaId));
  const activeTableConfig = tablesSummary.find(t => t.id === activeTable);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR: CONTROLE DE LICENÇA & AÇÕES GLOBAIS */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Database className="h-4 w-4" />
              <span>Explorador & Gestor de Banco de Dados Multi-Tenant</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black">
                GHOST MASTER ONLY
              </span>
            </div>
            <h2 className="font-heading font-black text-lg sm:text-xl text-white mt-1">
              Visualização de Tabelas & Isolamento por Licença
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspecione, edite e gerencie as tabelas reais do banco de dados SQLite no Render divididas por cada empresa.
            </p>
          </div>

          {/* Botões de Ações Globais */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition shadow"
              title="Baixar cópia física do arquivo sisfrete.db do servidor Render"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Baixar Backup SQLite (.db)</span>
            </button>

            {selectedEmpresaId !== 'todas' && (
              <button
                onClick={() => {
                  setPurgeSuccessMsg('');
                  setPurgeErrorMsg('');
                  setIsPurgeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/40 text-rose-300 text-xs font-bold transition"
                title="Limpar ou resetar dados desta licença"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Limpar Dados Desta Licença</span>
              </button>
            )}

            <button
              onClick={() => {
                loadSummary();
                loadTableData(activeTable, currentPage, searchTerm);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData || loadingSummary ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* SELETOR DE LICENÇA / EMPRESA */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
              <KeyRound className="h-3.5 w-3.5 text-blue-400" />
              <span>Licença Selecionada:</span>
            </label>
            <select
              value={selectedEmpresaId}
              onChange={(e) => {
                setSelectedEmpresaId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:max-w-md bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2 text-white font-bold text-xs focus:border-purple-500 focus:outline-none"
            >
              <option value="todas">🌐 Todas as Licenças (Visão Global de Dados)</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  Licença #{emp.codigo_licenca || emp.id} • {emp.nome_fantasia || emp.razao_social} {emp.ativo === 0 ? '(Inativa)' : ''}
                </option>
              ))}
            </select>
          </div>

          {activeEmpresaObj && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 font-mono font-bold">
                ID #{activeEmpresaObj.codigo_licenca || activeEmpresaObj.id}
              </span>
              <span className="text-slate-300 font-bold">{activeEmpresaObj.nome_fantasia || activeEmpresaObj.razao_social}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELEÇÃO DE TABELAS (TABS HORIZONTAIS COM TOTALIZADORES) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tablesSummary.map((tab) => {
          const isActive = activeTable === tab.id;
          const qtd = selectedEmpresaId === 'todas' ? tab.totalGeral : tab.totalLicenca;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTable(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-purple-900/60 text-purple-200' : 'bg-slate-800 text-slate-400'
              }`}>
                {qtd}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TABELA DE DADOS (DATA GRID COM BUSCA E AÇÕES) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Busca */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar em '${activeTableConfig?.label || activeTable}'...`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  loadTableData(activeTable, 1, '');
                }}
                className="absolute right-12 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold"
            >
              Filtrar
            </button>
          </form>

          {/* Ações da Tabela */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewRecord}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Novo Registro</span>
            </button>

            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>Exibir:</span>
              <select
                value={limitPerPage}
                onChange={(e) => setLimitPerPage(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Registros com Scroll Horizontal */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[550px] overflow-y-auto">
          {loadingData ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-400 mb-2" />
              <p className="text-xs">Carregando dados da tabela {activeTableConfig?.label}...</p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Database className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-300">Nenhum registro encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm ? 'Nenhum resultado para a busca aplicada.' : 'Esta tabela não possui registros para o filtro selecionado.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 sticky top-0 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-center w-16">Ações</th>
                  {columns.map((col) => (
                    <th key={col.name} className="px-3 py-2.5 whitespace-nowrap">
                      <span>{col.name}</span>
                      <span className="text-[9px] text-slate-600 font-mono ml-1">({col.type || 'TEXT'})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditRecord(row)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                          title="Editar Registro"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(row.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                          title="Excluir Registro"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    {columns.map((col) => {
                      const val = row[col.name];
                      let displayVal = val;
                      if (val === null || val === undefined) {
                        displayVal = <span className="text-slate-600 italic">null</span>;
                      } else if (typeof val === 'string' && val.length > 50) {
                        displayVal = <span title={val}>{val.slice(0, 50)}...</span>;
                      } else if (col.name.includes('valor') && typeof val === 'number') {
                        displayVal = <span className="font-mono text-emerald-400 font-bold">R$ {val.toFixed(2)}</span>;
                      } else if (col.name === 'empresa_id') {
                        displayVal = (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800/50 text-blue-300 font-mono text-[10px] font-bold">
                            #{val}
                          </span>
                        );
                      } else if (col.name === 'id') {
                        displayVal = <span className="font-mono font-bold text-purple-300">#{val}</span>;
                      }

                      return (
                        <td key={col.name} className="px-3 py-2 whitespace-nowrap text-slate-300 text-[11px]">
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé e Paginação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-400">
          <div>
            Mostrando <strong>{tableData.length}</strong> de <strong>{totalRecords}</strong> registros • Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => loadTableData(activeTable, currentPage - 1, searchTerm)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono font-bold text-white text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => loadTableData(activeTable, currentPage + 1, searchTerm)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIÇÃO OU INSERÇÃO DINÂMICA DE REGISTRO */}
      {/* ========================================================================= */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Database className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  {editingRecord 
                    ? `Editar Registro #${editingRecord.id} em '${activeTableConfig?.label || activeTable}'`
                    : `Novo Registro em '${activeTableConfig?.label || activeTable}'`}
                </h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {recordModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                {recordModalError}
              </div>
            )}

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs overflow-y-auto pr-2 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {columns
                  .filter(col => col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at')
                  .map((col) => {
                    const isEmpresaCol = col.name === 'empresa_id';
                    return (
                      <div key={col.name} className={col.type === 'TEXT' && (col.name.includes('obs') || col.name.includes('xml')) ? 'sm:col-span-2' : ''}>
                        <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                          <span>{col.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">({col.type || 'TEXT'})</span>
                        </label>
                        {isEmpresaCol ? (
                          <select
                            value={recordFormData[col.name] || ''}
                            onChange={(e) => setRecordFormData({ ...recordFormData, [col.name]: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-purple-500 focus:outline-none"
                          >
                            {empresas.map((e) => (
                              <option key={e.id} value={e.id}>
                                Licença #{e.codigo_licenca || e.id} • {e.nome_fantasia || e.razao_social}
                              </option>
                            ))}
                          </select>
                        ) : col.name.includes('obs') || col.name.includes('xml') ? (
                          <textarea
                            rows={3}
                            value={recordFormData[col.name] !== undefined && recordFormData[col.name] !== null ? recordFormData[col.name] : ''}
                            onChange={(e) => setRecordFormData({ ...recordFormData, [col.name]: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                          />
                        ) : (
                          <input
                            type={['INTEGER', 'REAL', 'FLOAT', 'NUMERIC'].includes((col.type || '').toUpperCase()) ? 'number' : 'text'}
                            step={['REAL', 'FLOAT'].includes((col.type || '').toUpperCase()) ? '0.01' : undefined}
                            value={recordFormData[col.name] !== undefined && recordFormData[col.name] !== null ? recordFormData[col.name] : ''}
                            onChange={(e) => setRecordFormData({ ...recordFormData, [col.name]: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingRecord ? 'Salvando...' : 'Salvar no Banco'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LIMPEZA / PURGE DE DADOS DA LICENÇA */}
      {/* ========================================================================= */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">
                  Limpar Dados da Licença #{activeEmpresaObj?.codigo_licenca || activeEmpresaObj?.id}
                </h3>
              </div>
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {purgeSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>{purgeSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {purgeErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    {purgeErrorMsg}
                  </div>
                )}

                <p className="text-slate-300 leading-relaxed">
                  Você está prestes a apagar dados da empresa <strong>{activeEmpresaObj?.nome_fantasia || activeEmpresaObj?.razao_social}</strong> (Licença #{activeEmpresaObj?.codigo_licenca || activeEmpresaObj?.id}). Escolha o escopo da limpeza:
                </p>

                <div className="space-y-2">
                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    purgeScope === 'operacional'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
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
                      <p className="text-[11px] text-slate-400 mt-1">
                        Apaga todos os <strong>Fretes, Títulos a Pagar/Receber, Adiantamentos, Manifestos MDF-e e Frotas</strong>.
                      </p>
                      <p className="text-[10px] text-emerald-400 mt-1">
                        ✓ Mantém: Motoristas, Clientes, Usuários e Configurações da Empresa.
                      </p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    purgeScope === 'completo'
                      ? 'bg-rose-500/10 border-rose-500/50 text-rose-200 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
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
                      <p className="font-bold text-xs text-rose-300">💥 Limpeza Completa (Zerar Tudo)</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Apaga <strong>TUDO</strong> vinculado a esta empresa (incluindo Motoristas e Clientes).
                      </p>
                      <p className="text-[10px] text-amber-400 mt-1">
                        ✓ Mantém apenas: O cadastro da empresa e o usuário Administrador.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPurgeModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={purging}
                    onClick={handlePurgeLicenca}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{purging ? 'Limpando...' : 'Confirmar Limpeza'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
