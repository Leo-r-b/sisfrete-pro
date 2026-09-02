import React, { useState, useEffect } from 'react';
import { Building2, PlusCircle, Search, Edit, Trash2, Phone, Mail, DollarSign, FileText } from 'lucide-react';
import api from '../services/api';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCli, setEditingCli] = useState(null);

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj_cpf: '',
    telefone: '',
    email: '',
    cidade: '',
    uf: 'SP',
  });

  const loadClientes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clientes', { params: { search } });
      setClientes(res.data);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [search]);

  const handleOpenNew = () => {
    setEditingCli(null);
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj_cpf: '',
      telefone: '',
      email: '',
      cidade: '',
      uf: 'SP',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cli) => {
    setEditingCli(cli);
    setFormData({
      razao_social: cli.razao_social || '',
      nome_fantasia: cli.nome_fantasia || '',
      cnpj_cpf: cli.cnpj_cpf || '',
      telefone: cli.telefone || '',
      email: cli.email || '',
      cidade: cli.cidade || '',
      uf: cli.uf || 'SP',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCli) {
        await api.put(`/clientes/${editingCli.id}`, formData);
      } else {
        await api.post('/clientes', formData);
      }
      setIsModalOpen(false);
      loadClientes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar cliente.');
    }
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o cliente "${nome}"?`)) return;
    try {
      await api.delete(`/clientes/${id}`);
      loadClientes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir cliente.');
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Clientes & Embarcadores</h1>
          <p className="text-xs text-slate-400">Cadastro de empresas tomadoras de serviço e faturamento acumulado</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/20 transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Cadastrar Cliente</span>
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
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Carregando clientes...</span>
          </div>
        ) : clientes.length > 0 ? (
          clientes.map((c) => (
            <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4 hover:border-slate-750 transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-base text-white">{c.nome_fantasia || c.razao_social}</h3>
                    <p className="text-[11px] text-slate-400">{c.razao_social}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{c.cnpj_cpf || 'CNPJ não informado'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.razao_social)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                  <p><strong>Telefone:</strong> {c.telefone || 'Não informado'}</p>
                  <p><strong>E-mail:</strong> {c.email || 'Não informado'}</p>
                  {c.cidade && <p><strong>Localização:</strong> {c.cidade}/{c.uf}</p>}
                </div>
              </div>

              {/* Métricas do Cliente */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Volume de Fretes</span>
                  <span className="font-bold text-white">{c.total_fretes || 0} CT-es</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Total Faturado</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatMoney(c.total_faturado)}
                  </span>
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            Nenhum cliente cadastrado.
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <h3 className="font-heading font-bold text-lg text-white mb-4">
              {editingCli ? 'Editar Cliente' : 'Novo Cliente / Embarcador'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Razão Social*</label>
                <input
                  type="text"
                  required
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    value={formData.cnpj_cpf}
                    onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="block text-slate-300 font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-center uppercase font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
