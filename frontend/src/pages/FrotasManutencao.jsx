import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Truck, 
  PlusCircle, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Fuel, 
  Search, 
  Clock, 
  X,
  Gauge
} from 'lucide-react';
import api from '../services/api';

export default function FrotasManutencao() {
  const [activeTab, setActiveTab] = useState('manutencoes'); // 'manutencoes' | 'pneus'
  const [manutencoes, setManutencoes] = useState([]);
  const [pneus, setPneus] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Manutenção
  const [isNovoManutencaoOpen, setIsNovoManutencaoOpen] = useState(false);
  const [formData, setFormData] = useState({
    placa: '',
    tipo: 'oleo_filtros',
    descricao: '',
    quilometragem: '',
    data_manutencao: new Date().toISOString().slice(0, 10),
    proxima_manutencao_km: '',
    proxima_manutencao_data: '',
    oficina_nome: '',
    valor: '',
    status: 'realizada',
    observacoes: ''
  });
  const [saving, setSaving] = useState(false);

  // Modal Pneu
  const [isNovoPneuOpen, setIsNovoPneuOpen] = useState(false);
  const [pneuFormData, setPneuFormData] = useState({
    placa: '',
    posicao: '1D',
    numero_fogo: '',
    marca_modelo: 'Michelin X Multi',
    sulco_mm: 14.0,
    recapagens: 0,
    status: 'em_uso',
    km_instalacao: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [resManut, resPneus] = await Promise.all([
        api.get('/frotas/manutencoes'),
        api.get('/frotas/pneus')
      ]);
      setManutencoes(resManut.data || []);
      setPneus(resPneus.data || []);
    } catch (err) {
      console.error('Erro ao carregar frotas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveManutencao = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/frotas/manutencoes', formData);
      setIsNovoManutencaoOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar manutenção.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePneu = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/frotas/pneus', pneuFormData);
      setIsNovoPneuOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar pneu.');
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Header Frotas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading">Gestão de Frotas & Manutenções</h1>
          <p className="text-xs text-slate-400">
            Controle de revisões preventivas, trocas de óleo, pneus e saúde dos veículos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNovoManutencaoOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow transition cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Nova Manutenção</span>
          </button>

          <button
            onClick={() => setIsNovoPneuOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Pneu / Sulco</span>
          </button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('manutencoes')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'manutencoes'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Histórico de Manutenções</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold">
            {manutencoes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pneus')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'pneus'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Gestão de Pneus & Sulcos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
            {pneus.length}
          </span>
        </button>
      </div>

      {/* ABA: MANUTENÇÕES */}
      {activeTab === 'manutencoes' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Placa / Veículo</th>
                  <th className="px-4 py-3">Tipo / Descrição</th>
                  <th className="px-4 py-3">KM / Oficina</th>
                  <th className="px-4 py-3">Data Manutenção</th>
                  <th className="px-4 py-3">Próxima Revisão</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Carregando manutenções...
                    </td>
                  </tr>
                ) : manutencoes.length > 0 ? (
                  manutencoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-white text-xs">{m.placa}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-200">{m.descricao}</p>
                        <span className="text-[10px] text-blue-400 font-medium uppercase">{m.tipo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-slate-300">{m.quilometragem ? `${m.quilometragem.toLocaleString('pt-BR')} KM` : '-'}</p>
                        <p className="text-[10px] text-slate-500">{m.oficina_nome || '-'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {m.data_manutencao ? new Date(m.data_manutencao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-300">
                        {m.proxima_manutencao_km ? `${m.proxima_manutencao_km.toLocaleString('pt-BR')} KM` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                        {formatMoney(m.valor)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                          {m.status === 'realizada' ? 'Realizada ✅' : 'Agendada ⏳'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma manutenção registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: PNEUS */}
      {activeTab === 'pneus' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Marca / Modelo</th>
                  <th className="px-4 py-3">Nº Fogo</th>
                  <th className="px-4 py-3 text-center">Sulco (mm)</th>
                  <th className="px-4 py-3 text-center">Recapagens</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pneus.length > 0 ? (
                  pneus.map((p) => {
                    const isSulcoBaixo = p.sulco_mm < 4.0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-white">{p.placa}</td>
                        <td className="px-4 py-3 font-bold text-blue-400">{p.posicao}</td>
                        <td className="px-4 py-3 text-slate-200">{p.marca_modelo}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{p.numero_fogo || '-'}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span className={isSulcoBaixo ? 'text-rose-400' : 'text-emerald-400'}>
                            {p.sulco_mm} mm {isSulcoBaixo ? '⚠️' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-300">{p.recapagens}x</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhum pneu cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOVA MANUTENÇÃO */}
      {isNovoManutencaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Wrench className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Registrar Manutenção de Veículo</h3>
              </div>
              <button onClick={() => setIsNovoManutencaoOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManutencao} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Placa do Veículo*</label>
                  <input
                    type="text"
                    required
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC1D23"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Manutenção*</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="oleo_filtros">Troca de Óleo & Filtros</option>
                    <option value="freios">Freios & Pastilhas</option>
                    <option value="suspensao">Suspensão & Molas</option>
                    <option value="eletrica">Elétrica & Bateria</option>
                    <option value="tacografo">Aferição de Tacógrafo</option>
                    <option value="revisao_geral">Revisão Geral Preventiva</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição do Serviço Realizado*</label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Troca de óleo do motor 15W40 + filtros de combustível e ar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quilometragem (KM)</label>
                  <input
                    type="number"
                    value={formData.quilometragem}
                    onChange={(e) => setFormData({ ...formData, quilometragem: e.target.value })}
                    placeholder="345000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data Realizada*</label>
                  <input
                    type="date"
                    required
                    value={formData.data_manutencao}
                    onChange={(e) => setFormData({ ...formData, data_manutencao: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor (R$)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Próxima Revisão (KM)</label>
                  <input
                    type="number"
                    value={formData.proxima_manutencao_km}
                    onChange={(e) => setFormData({ ...formData, proxima_manutencao_km: e.target.value })}
                    placeholder="365000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Oficina / Auto Peças</label>
                  <input
                    type="text"
                    value={formData.oficina_nome}
                    onChange={(e) => setFormData({ ...formData, oficina_nome: e.target.value })}
                    placeholder="Ex: Mecânica Scania Truck"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNovoManutencaoOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Gravar Manutenção'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO PNEU */}
      {isNovoPneuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Layers className="h-5 w-5" />
                <h3 className="font-heading font-bold text-base text-white">Cadastrar / Medir Pneu</h3>
              </div>
              <button onClick={() => setIsNovoPneuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePneu} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Placa*</label>
                  <input
                    type="text"
                    required
                    value={pneuFormData.placa}
                    onChange={(e) => setPneuFormData({ ...pneuFormData, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC1D23"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Posição*</label>
                  <select
                    value={pneuFormData.posicao}
                    onChange={(e) => setPneuFormData({ ...pneuFormData, posicao: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="1D">1D (Dianteiro Direito)</option>
                    <option value="1E">1E (Dianteiro Esquerdo)</option>
                    <option value="2DE">2DE (Tração Direito Ext)</option>
                    <option value="2DI">2DI (Tração Direito Int)</option>
                    <option value="2EE">2EE (Tração Esquerdo Ext)</option>
                    <option value="2EI">2EI (Tração Esquerdo Int)</option>
                    <option value="ESTEPE">Estepe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Marca e Modelo*</label>
                <input
                  type="text"
                  required
                  value={pneuFormData.marca_modelo}
                  onChange={(e) => setPneuFormData({ ...pneuFormData, marca_modelo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sulco Atual (mm)*</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={pneuFormData.sulco_mm}
                    onChange={(e) => setPneuFormData({ ...pneuFormData, sulco_mm: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nº Fogo / Código</label>
                  <input
                    type="text"
                    value={pneuFormData.numero_fogo}
                    onChange={(e) => setPneuFormData({ ...pneuFormData, numero_fogo: e.target.value })}
                    placeholder="Ex: PN-908"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNovoPneuOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Gravando...' : 'Gravar Pneu'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
