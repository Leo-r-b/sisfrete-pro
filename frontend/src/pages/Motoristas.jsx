import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, Search, Truck, Edit, Trash2, Copy, Check, DollarSign, Wallet } from 'lucide-react';
import api from '../services/api';

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMot, setEditingMot] = useState(null);
  const [copiedPixId, setCopiedPixId] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    cpf_cnpj: '',
    telefone: '',
    pix_chave: '',
    pix_tipo: 'CPF',
    placa_cavalo: '',
    placa_carreta: '',
    tipo_veiculo: 'Truck',
    cidade: '',
    uf: 'SP',
    observacoes: '',
  });

  const loadMotoristas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/motoristas', { params: { search } });
      setMotoristas(res.data);
    } catch (err) {
      console.error('Erro ao buscar motoristas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMotoristas();
  }, [search]);

  const handleOpenNew = () => {
    setEditingMot(null);
    setFormData({
      nome: '',
      cpf_cnpj: '',
      telefone: '',
      pix_chave: '',
      pix_tipo: 'CPF',
      placa_cavalo: '',
      placa_carreta: '',
      tipo_veiculo: 'Truck',
      cidade: '',
      uf: 'SP',
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mot) => {
    setEditingMot(mot);
    setFormData({
      nome: mot.nome || '',
      cpf_cnpj: mot.cpf_cnpj || '',
      telefone: mot.telefone || '',
      pix_chave: mot.pix_chave || '',
      pix_tipo: mot.pix_tipo || 'CPF',
      placa_cavalo: mot.placa_cavalo || '',
      placa_carreta: mot.placa_carreta || '',
      tipo_veiculo: mot.tipo_veiculo || 'Truck',
      cidade: mot.cidade || '',
      uf: mot.uf || 'SP',
      observacoes: mot.observacoes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMot) {
        await api.put(`/motoristas/${editingMot.id}`, formData);
      } else {
        await api.post('/motoristas', formData);
      }
      setIsModalOpen(false);
      loadMotoristas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar motorista.');
    }
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o cadastro do motorista "${nome}"?`)) return;
    try {
      await api.delete(`/motoristas/${id}`);
      loadMotoristas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir motorista.');
    }
  };

  const handleCopyPix = (pix, id) => {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Motoristas & Freteiros Terceiros</h1>
          <p className="text-xs text-slate-400">Cadastro de transportadores autônomos, histórico de viagens e chaves PIX</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/20 transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Cadastrar Motorista</span>
        </button>
      </div>

      {/* Busca */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do motorista, CPF, placa ou telefone..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista / Grid de Motoristas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Carregando motoristas...</span>
          </div>
        ) : motoristas.length > 0 ? (
          motoristas.map((m) => (
            <div key={m.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4 hover:border-slate-750 transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-base text-white">{m.nome}</h3>
                    <p className="text-xs text-slate-400">{m.cpf_cnpj || 'CPF não cadastrado'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.nome)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Placas & Veículo */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block uppercase">Cavalo / Veículo</span>
                    <span className="font-mono font-bold text-amber-300 text-xs">{m.placa_cavalo || 'NÃO INF.'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 block uppercase">Carreta</span>
                    <span className="font-mono font-bold text-amber-300 text-xs">{m.placa_carreta || 'NÃO INF.'}</span>
                  </div>
                </div>

                {/* Contato & PIX */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                  <p><strong>Telefone:</strong> {m.telefone || 'Sem telefone'}</p>
                  <div className="flex items-center justify-between">
                    <span className="truncate"><strong>PIX:</strong> {m.pix_chave || 'Não cadastrada'}</span>
                    {m.pix_chave && (
                      <button
                        onClick={() => handleCopyPix(m.pix_chave, m.id)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Copiar PIX"
                      >
                        {copiedPixId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Estatísticas de Viagens */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Viagens</span>
                  <span className="font-bold text-white">{m.total_viagens || 0} fretes</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Saldo Devedor Atual</span>
                  <span className={`font-mono font-bold ${m.saldo_em_aberto > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatMoney(m.saldo_em_aberto)}
                  </span>
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            Nenhum motorista encontrado.
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição de Motorista */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <h3 className="font-heading font-bold text-lg text-white mb-4">
              {editingMot ? 'Editar Motorista' : 'Novo Motorista Terceiro'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo*</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Placa Cavalo / Caminhão</label>
                  <input
                    type="text"
                    value={formData.placa_cavalo}
                    onChange={(e) => setFormData({ ...formData, placa_cavalo: e.target.value.toUpperCase() })}
                    placeholder="ABC1D23"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Placa Carreta</label>
                  <input
                    type="text"
                    value={formData.placa_carreta}
                    onChange={(e) => setFormData({ ...formData, placa_carreta: e.target.value.toUpperCase() })}
                    placeholder="XYZ9E87"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Chave PIX</label>
                  <input
                    type="text"
                    value={formData.pix_chave}
                    onChange={(e) => setFormData({ ...formData, pix_chave: e.target.value })}
                    placeholder="Chave PIX para transferências"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo PIX</label>
                  <select
                    value={formData.pix_tipo}
                    onChange={(e) => setFormData({ ...formData, pix_tipo: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="Celular">Celular</option>
                    <option value="Email">E-mail</option>
                    <option value="Aleatoria">Aleatória</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                >
                  Salvar Motorista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
