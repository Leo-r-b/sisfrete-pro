import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Truck, 
  MapPin, 
  Calendar, 
  Layers, 
  X, 
  AlertTriangle,
  Lock,
  RefreshCw,
  Send
} from 'lucide-react';
import api from '../services/api';
import DamdfeModal from '../components/DamdfeModal';

export default function MdfeList() {
  const [mdfes, setMdfes] = useState([]);
  const [fretesDisponiveis, setFretesDisponiveis] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [isDamdfeOpen, setIsDamdfeOpen] = useState(false);
  const [damdfeData, setDamdfeData] = useState(null);

  // Modal de Encerramento
  const [mdfeEncerrar, setMdfeEncerrar] = useState(null);
  const [municipioEncerrar, setMunicipioEncerrar] = useState('');
  const [ufEncerrar, setUfEncerrar] = useState('PR');
  const [savingEncerrar, setSavingEncerrar] = useState(false);

  // Modal de Cancelamento
  const [mdfeCancelar, setMdfeCancelar] = useState(null);
  const [justificativaCancelar, setJustificativaCancelar] = useState('');
  const [savingCancelar, setSavingCancelar] = useState(false);

  // Form de Novo MDF-e
  const [formData, setFormData] = useState({
    serie: 1,
    numero_mdfe: '',
    uf_origem: 'PR',
    uf_destino: 'PR',
    ufs_percurso: '',
    motorista_id: '',
    motorista_nome: '',
    motorista_cpf: '',
    placa_veiculo: '',
    placa_carreta: '',
    rntrc: '53148055',
    seguradora_nome: 'PORTO SEGURO CIA SEGUROS',
    seguradora_cnpj: '61.198.164/0001-60',
    numero_apolice: '075482390001',
    numero_averbacao: '',
    produto_predominante: 'SOJA EM GRAOS',
    ctes_ids: []
  });
  const [savingNovo, setSavingNovo] = useState(false);
  const [novoError, setNovoError] = useState('');

  // Emissão
  const [isEmitindoId, setIsEmitindoId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFiltro,
        search: search
      };

      const [resMdfes, resFretes, resMotoristas] = await Promise.all([
        api.get('/mdfe', { params }),
        api.get('/fretes'),
        api.get('/motoristas')
      ]);

      setMdfes(resMdfes.data || []);
      setFretesDisponiveis(resFretes.data || []);
      setMotoristas(resMotoristas.data || []);
    } catch (err) {
      console.error('Erro ao carregar MDF-es:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFiltro, search]);

  const handleOpenNovo = () => {
    setFormData({
      serie: 1,
      numero_mdfe: '',
      uf_origem: 'PR',
      uf_destino: 'PR',
      ufs_percurso: '',
      motorista_id: '',
      motorista_nome: '',
      motorista_cpf: '',
      placa_veiculo: '',
      placa_carreta: '',
      rntrc: '53148055',
      seguradora_nome: 'PORTO SEGURO CIA SEGUROS',
      seguradora_cnpj: '61.198.164/0001-60',
      numero_apolice: '075482390001',
      numero_averbacao: `AVB-${Date.now().toString().slice(-6)}`,
      produto_predominante: 'SOJA EM GRAOS',
      ctes_ids: []
    });
    setNovoError('');
    setIsNovoModalOpen(true);
  };

  const handleSelectMotorista = (motoristaId) => {
    const mot = motoristas.find(m => String(m.id) === String(motoristaId));
    if (mot) {
      setFormData(prev => ({
        ...prev,
        motorista_id: motoristaId,
        motorista_nome: mot.nome || '',
        motorista_cpf: mot.cpf_cnpj ? mot.cpf_cnpj.replace(/\D/g, '') : '',
        placa_veiculo: mot.placa_cavalo ? mot.placa_cavalo.replace(/\W/g, '').toUpperCase() : prev.placa_veiculo,
        placa_carreta: mot.placa_carreta ? mot.placa_carreta.replace(/\W/g, '').toUpperCase() : prev.placa_carreta
      }));
    } else {
      setFormData(prev => ({ ...prev, motorista_id: motoristaId }));
    }
  };

  const handleToggleCte = (freteId) => {
    const ids = [...formData.ctes_ids];
    const idx = ids.indexOf(freteId);
    if (idx > -1) {
      ids.splice(idx, 1);
    } else {
      ids.push(freteId);
    }

    // Auto-ajustar UFs com base nos CT-es selecionados
    const fretesSel = fretesDisponiveis.filter(f => ids.includes(f.id));
    const updates = { ctes_ids: ids };
    if (fretesSel.length > 0) {
      if (fretesSel[0].origem_uf) updates.uf_origem = fretesSel[0].origem_uf.toUpperCase();
      if (fretesSel[0].destino_uf) updates.uf_destino = fretesSel[0].destino_uf.toUpperCase();
      if (fretesSel[0].tipo_carga) updates.produto_predominante = fretesSel[0].tipo_carga.toUpperCase();
    }

    setFormData({ ...formData, ...updates });
  };

  const handleSaveNovo = async (e) => {
    e.preventDefault();
    setNovoError('');
    setSavingNovo(true);

    try {
      await api.post('/mdfe', formData);
      setIsNovoModalOpen(false);
      loadData();
    } catch (err) {
      setNovoError(err.response?.data?.error || 'Erro ao criar MDF-e.');
    } finally {
      setSavingNovo(false);
    }
  };

  const handleEmitirSefaz = async (id) => {
    try {
      setIsEmitindoId(id);
      const res = await api.post(`/mdfe/emitir/${id}`);
      alert(res.data.message || 'MDF-e autorizado com sucesso na SEFAZ!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao emitir MDF-e na SEFAZ.');
    } finally {
      setIsEmitindoId(null);
    }
  };

  const handleOpenDamdfe = async (id) => {
    try {
      const res = await api.get(`/mdfe/damdfe/${id}`);
      setDamdfeData(res.data);
      setIsDamdfeOpen(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar DAMDFE.');
    }
  };

  const handleConfirmarEncerramento = async (e) => {
    e.preventDefault();
    if (!mdfeEncerrar) return;
    setSavingEncerrar(true);

    try {
      await api.post(`/mdfe/encerrar/${mdfeEncerrar.id}`, {
        municipio_encerramento: municipioEncerrar,
        uf_encerramento: ufEncerrar
      });
      setMdfeEncerrar(null);
      loadData();
      alert('MDF-e encerrado com sucesso na SEFAZ!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao encerrar MDF-e.');
    } finally {
      setSavingEncerrar(false);
    }
  };

  const handleConfirmarCancelamento = async (e) => {
    e.preventDefault();
    if (!mdfeCancelar) return;
    if (!justificativaCancelar || justificativaCancelar.length < 15) {
      alert('A justificativa de cancelamento deve conter no mínimo 15 caracteres.');
      return;
    }
    setSavingCancelar(true);

    try {
      const res = await api.post(`/mdfe/cancelar/${mdfeCancelar.id}`, {
        justificativa: justificativaCancelar
      });
      alert(res.data.message || 'MDF-e cancelado com sucesso na SEFAZ!');
      setMdfeCancelar(null);
      setJustificativaCancelar('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar MDF-e.');
    } finally {
      setSavingCancelar(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-[1700px] mx-auto">
      
      {/* Header com Ação de Emissão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Manifestos Eletrônicos (MDF-e 3.00)
          </h1>
          <p className="text-xs text-slate-400">
            Emissão de Manifesto Fiscal de Carga Modelo 58, Agrupamento de CT-es e Encerramento de Viagem
          </p>
        </div>

        <button
          onClick={handleOpenNovo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Novo MDF-e (Manifesto)</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="todos">Todos os Status</option>
            <option value="rascunho">Rascunhos</option>
            <option value="autorizado">Autorizados SEFAZ (Em Viagem)</option>
            <option value="encerrado">Encerrados</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, placa, motorista ou chave..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* TABELA DE MDF-E */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Manifesto / Série</th>
                <th className="px-4 py-3">Percurso / UFs</th>
                <th className="px-4 py-3">Veículo / Motorista</th>
                <th className="px-4 py-3">CT-es Vinculados</th>
                <th className="px-4 py-3 text-right">Valor Total Carga</th>
                <th className="px-4 py-3 text-center">Status SEFAZ</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando manifestos...</span>
                    </div>
                  </td>
                </tr>
              ) : mdfes.length > 0 ? (
                mdfes.map((m) => {
                  const isAutorizado = m.status_mdfe === 'autorizado';
                  const isEncerrado = m.status_mdfe === 'encerrado';
                  const isRascunho = m.status_mdfe === 'rascunho' || !m.status_mdfe;

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Documento */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-white font-mono text-xs">MDF-e Nº {m.numero_mdfe}</p>
                        <p className="text-[10px] text-slate-400">Série {m.serie || 1} • {m.data_emissao ? new Date(m.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                        {m.protocolo_autorizacao && (
                          <p className="text-[9px] font-mono text-emerald-400 font-semibold truncate max-w-[140px]">
                            Prot: {m.protocolo_autorizacao}
                          </p>
                        )}
                      </td>

                      {/* Percurso */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-semibold text-slate-200">
                          <span>{m.uf_origem}</span>
                          <span className="text-slate-500">➔</span>
                          <span>{m.uf_destino}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">Percurso: {m.ufs_percurso || `${m.uf_origem}, ${m.uf_destino}`}</p>
                      </td>

                      {/* Veículo & Motorista */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-blue-300 truncate max-w-[150px]">{m.motorista_nome || 'Motorista'}</p>
                        <p className="text-[10px] font-mono text-slate-300">
                          {m.placa_veiculo || 'S/N'} {m.placa_carreta ? `/ ${m.placa_carreta}` : ''}
                        </p>
                      </td>

                      {/* CT-es */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                          {m.total_ctes_vinculados || m.quantidade_ctes || 1} CT-e(s)
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{(Number(m.peso_total_kg || 0) / 1000).toFixed(2)} ton</p>
                      </td>

                      {/* Valor Total */}
                      <td className="px-4 py-3 text-right font-mono font-black text-xs text-emerald-400">
                        {formatMoney(m.valor_total_carga)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isAutorizado && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                            🟢 Autorizado SEFAZ
                          </span>
                        )}
                        {isEncerrado && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                            🔒 Encerrado
                          </span>
                        )}
                        {isRascunho && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            📝 Rascunho
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Transmitir SEFAZ se rascunho */}
                          {isRascunho && (
                            <button
                              onClick={() => handleEmitirSefaz(m.id)}
                              disabled={isEmitindoId === m.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
                              title="Transmitir MDF-e para SEFAZ"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{isEmitindoId === m.id ? 'Emitindo...' : 'Emitir SEFAZ'}</span>
                            </button>
                          )}

                          {/* DAMDFE */}
                          <button
                            onClick={() => handleOpenDamdfe(m.id)}
                            className="p-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
                            title="Visualizar / Imprimir DAMDFE"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* Cancelar Manifesto se Autorizado */}
                          {isAutorizado && (
                            <button
                              onClick={() => {
                                setMdfeCancelar(m);
                                setJustificativaCancelar('Cancelamento de MDF-e solicitado pelo emitente');
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition cursor-pointer"
                              title="Cancelar MDF-e na SEFAZ"
                            >
                              <X className="h-3 w-3" />
                              <span>Cancelar</span>
                            </button>
                          )}

                          {/* Encerrar Manifesto se Autorizado */}
                          {isAutorizado && (
                            <button
                              onClick={() => {
                                setMdfeEncerrar(m);
                                setMunicipioEncerrar(m.uf_destino === 'PR' ? 'CURITIBA' : 'SAO PAULO');
                                setUfEncerrar(m.uf_destino);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition cursor-pointer"
                              title="Encerrar MDF-e no destino"
                            >
                              <Lock className="h-3 w-3" />
                              <span>Encerrar</span>
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhum manifesto MDF-e cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NOVO MDF-E */}
      {isNovoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[92vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <FileText className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Criar Novo Manifesto (MDF-e 3.00)</h3>
              </div>
              <button onClick={() => setIsNovoModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {novoError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{novoError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNovo} className="space-y-4 text-xs overflow-y-auto pr-1">
              
              {/* Selecionar Motorista Cadastrado */}
              {motoristas.length > 0 && (
                <div className="p-3 bg-slate-850 border border-slate-700/60 rounded-2xl">
                  <label className="block text-slate-300 font-semibold mb-1">Puxar Dados do Motorista Cadastrado</label>
                  <select
                    value={formData.motorista_id || ''}
                    onChange={(e) => handleSelectMotorista(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Selecione para preencher motorista e veículo automaticamente --</option>
                    {motoristas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome} (CPF: {m.cpf_cnpj || 'S/N'} • Placa: {m.placa_cavalo || 'S/N'})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Trajeto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">UF Início*</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.uf_origem}
                    onChange={(e) => setFormData({ ...formData, uf_origem: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">UF Destino*</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.uf_destino}
                    onChange={(e) => setFormData({ ...formData, uf_destino: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Percurso de UFs</label>
                  <input
                    type="text"
                    value={formData.ufs_percurso}
                    onChange={(e) => setFormData({ ...formData, ufs_percurso: e.target.value.toUpperCase() })}
                    placeholder="PR, SP"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Veículo e Motorista */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Condutor*</label>
                  <input
                    type="text"
                    required
                    value={formData.motorista_nome}
                    onChange={(e) => setFormData({ ...formData, motorista_nome: e.target.value })}
                    placeholder="Nome completo"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CPF Condutor*</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={formData.motorista_cpf}
                    onChange={(e) => setFormData({ ...formData, motorista_cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Placa Cavalo (Tração)*</label>
                  <input
                    type="text"
                    required
                    value={formData.placa_veiculo}
                    onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
                    placeholder="ABC1D23"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Placa Carreta (Reboque)</label>
                  <input
                    type="text"
                    value={formData.placa_carreta}
                    onChange={(e) => setFormData({ ...formData, placa_carreta: e.target.value.toUpperCase() })}
                    placeholder="XYZ9E87"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seguro e Carga */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Seguradora</label>
                  <input
                    type="text"
                    value={formData.seguradora_nome}
                    onChange={(e) => setFormData({ ...formData, seguradora_nome: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nº Apólice</label>
                  <input
                    type="text"
                    value={formData.numero_apolice}
                    onChange={(e) => setFormData({ ...formData, numero_apolice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Produto Predominante</label>
                  <input
                    type="text"
                    value={formData.produto_predominante}
                    onChange={(e) => setFormData({ ...formData, produto_predominante: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seleção de CT-es Vinculados */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-[11px]">Selecionar CT-es para o Manifesto:</span>
                  <span className="text-purple-400 font-bold text-xs">{formData.ctes_ids.length} selecionado(s)</span>
                </div>

                {fretesDisponiveis.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {fretesDisponiveis.map((f) => {
                      const isSelected = formData.ctes_ids.includes(f.id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => handleToggleCte(f.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected 
                              ? 'bg-purple-500/20 border-purple-500/50 text-white' 
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">CT-e Nº {f.numero_cte || f.id} • {f.cliente_nome || 'Cliente'}</p>
                            <p className="text-[10px] text-slate-400">{f.origem_cidade || 'Origem'}/{f.origem_uf || 'PR'} ➔ {f.destino_cidade || 'Destino'}/{f.destino_uf || 'PR'} • {f.peso_kg ? (f.peso_kg/1000).toFixed(2) : '0'}t</p>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 text-xs">{formatMoney(f.valor_frete_venda)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-2">Nenhum frete com CT-e disponível para vínculo.</p>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNovoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingNovo}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingNovo ? 'Criando Manifesto...' : 'Gravar MDF-e'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ENCERRAMENTO DE MDF-E */}
      {mdfeEncerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Lock className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Encerrar MDF-e Nº {mdfeEncerrar.numero_mdfe}</h3>
              </div>
              <button onClick={() => setMdfeEncerrar(null)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              O encerramento é obrigatório ao término da viagem para liberar o veículo para novos manifestos perante a SEFAZ.
            </p>

            <form onSubmit={handleConfirmarEncerramento} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Município de Descarga / Encerramento*</label>
                <input
                  type="text"
                  required
                  value={municipioEncerrar}
                  onChange={(e) => setMunicipioEncerrar(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">UF de Encerramento*</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={ufEncerrar}
                  onChange={(e) => setUfEncerrar(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMdfeEncerrar(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingEncerrar}
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingEncerrar ? 'Encerrando...' : 'Confirmar Encerramento SEFAZ'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CANCELAMENTO DE MDF-E */}
      {mdfeCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Cancelar MDF-e Nº {mdfeCancelar.numero_mdfe}</h3>
              </div>
              <button onClick={() => setMdfeCancelar(null)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              O cancelamento perante a SEFAZ só é permitido se o transporte ainda não foi iniciado.
            </p>

            <form onSubmit={handleConfirmarCancelamento} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificativa de Cancelamento (mínimo 15 caracteres)*</label>
                <textarea
                  rows={3}
                  required
                  minLength={15}
                  value={justificativaCancelar}
                  onChange={(e) => setJustificativaCancelar(e.target.value)}
                  placeholder="Informe o motivo do cancelamento do manifesto..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMdfeCancelar(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={savingCancelar}
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {savingCancelar ? 'Cancelando...' : 'Confirmar Cancelamento SEFAZ'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DAMDFE */}
      <DamdfeModal
        isOpen={isDamdfeOpen}
        onClose={() => setIsDamdfeOpen(false)}
        damdfeData={damdfeData}
      />

    </div>
  );
}
