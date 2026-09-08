import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Clock, 
  Upload, 
  Layers, 
  Check, 
  AlertCircle, 
  Sparkles, 
  UserCheck, 
  FileText 
} from 'lucide-react';
import api from '../services/api';

export default function NovoCarregamentoModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  carregamentoParaEditar = null 
}) {
  const [loading, setLoading] = useState(false);
  const [motoristasCadastrados, setMotoristasCadastrados] = useState([]);
  const [clientesCadastrados, setClientesCadastrados] = useState([]);

  // Estados do formulário
  const [motoristaId, setMotoristaId] = useState('');
  const [motoristaNome, setMotoristaNome] = useState('');
  const [motoristaCpf, setMotoristaCpf] = useState('');
  const [motoristaTelefone, setMotoristaTelefone] = useState('');
  const [placaCavalo, setPlacaCavalo] = useState('');
  const [placaCarreta, setPlacaCarreta] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState('Carreta LS');
  const [freteiroNome, setFreteiroNome] = useState('');

  // Local de Carregamento (Origem)
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [origemCidade, setOrigemCidade] = useState('Mafra');
  const [origemUf, setOrigemUf] = useState('SC');

  // Venda Triangular / Intermediação
  const [isTriangular, setIsTriangular] = useState(false);
  const [intermediadorId, setIntermediadorId] = useState('');
  const [intermediadorNome, setIntermediadorNome] = useState('');
  const [intermediadorCnpj, setIntermediadorCnpj] = useState('');
  const [valorRepasseCombinado, setValorRepasseCombinado] = useState('');

  // Destino
  const [destinoClienteId, setDestinoClienteId] = useState('');
  const [destinoEmpresaNome, setDestinoEmpresaNome] = useState('');
  const [destinoCidade, setDestinoCidade] = useState('Paranaguá');
  const [destinoUf, setDestinoUf] = useState('PR');

  // Condições Comerciais & Carga
  const [tipoCarga, setTipoCarga] = useState('Soja em Grãos');
  const [valorCombinadoKg, setValorCombinadoKg] = useState('');
  const [pesoEstimadoKg, setPesoEstimadoKg] = useState('38000');
  const [valorAdiantamento, setValorAdiantamento] = useState('');

  // Data e Hora de Inclusão
  const getAgoraLocalIso = () => {
    const agora = new Date();
    const tzOffset = agora.getTimezoneOffset() * 60000;
    return new Date(agora.getTime() - tzOffset).toISOString().slice(0, 16);
  };
  const [dataInclusao, setDataInclusao] = useState(getAgoraLocalIso());
  const [observacoes, setObservacoes] = useState('');

  // Arquivo XML do CT-e (Opcional se já emitido)
  const [xmlFile1, setXmlFile1] = useState(null);
  const [xmlFile2, setXmlFile2] = useState(null);

  // Carregar dados existentes do banco (Motoristas e Clientes/Fornecedores)
  useEffect(() => {
    if (!isOpen) return;

    const carregarDadosDoSistema = async () => {
      try {
        const [resMot, resCli] = await Promise.all([
          api.get('/motoristas'),
          api.get('/clientes')
        ]);
        setMotoristasCadastrados(resMot.data || []);
        setClientesCadastrados(resCli.data || []);
      } catch (err) {
        console.warn('Aviso ao carregar dados do banco:', err);
      }
    };

    carregarDadosDoSistema();

    // Se for edição de carregamento existente
    if (carregamentoParaEditar) {
      setMotoristaId(carregamentoParaEditar.motorista_id || '');
      setMotoristaNome(carregamentoParaEditar.motorista_nome || '');
      setMotoristaCpf(carregamentoParaEditar.motorista_cpf || '');
      setMotoristaTelefone(carregamentoParaEditar.motorista_telefone || '');
      setPlacaCavalo(carregamentoParaEditar.placa_cavalo || '');
      setPlacaCarreta(carregamentoParaEditar.placa_carreta || '');
      setTipoVeiculo(carregamentoParaEditar.tipo_veiculo || 'Carreta LS');
      setFreteiroNome(carregamentoParaEditar.freteiro_nome || '');

      setFornecedorId(carregamentoParaEditar.fornecedor_id || '');
      setFornecedorNome(carregamentoParaEditar.fornecedor_nome || '');
      setOrigemCidade(carregamentoParaEditar.origem_cidade || 'Mafra');
      setOrigemUf(carregamentoParaEditar.origem_uf || 'SC');

      setIsTriangular(Boolean(carregamentoParaEditar.is_triangular));
      setIntermediadorId(carregamentoParaEditar.intermediador_id || '');
      setIntermediadorNome(carregamentoParaEditar.intermediador_nome || '');
      setIntermediadorCnpj(carregamentoParaEditar.intermediador_cnpj || '');
      setValorRepasseCombinado(carregamentoParaEditar.valor_repasse_combinado || '');

      setDestinoClienteId(carregamentoParaEditar.destino_cliente_id || '');
      setDestinoEmpresaNome(carregamentoParaEditar.destino_empresa_nome || '');
      setDestinoCidade(carregamentoParaEditar.destino_cidade || 'Paranaguá');
      setDestinoUf(carregamentoParaEditar.destino_uf || 'PR');

      setTipoCarga(carregamentoParaEditar.tipo_carga || 'Soja em Grãos');
      setValorCombinadoKg(carregamentoParaEditar.valor_combinado_kg || '');
      setPesoEstimadoKg(carregamentoParaEditar.peso_estimado_kg || '38000');
      setValorAdiantamento(carregamentoParaEditar.valor_adiantamento_combinado || '');

      if (carregamentoParaEditar.data_inclusao) {
        setDataInclusao(carregamentoParaEditar.data_inclusao.slice(0, 16));
      }
      setObservacoes(carregamentoParaEditar.observacoes || '');
    } else {
      // Limpar campos para novo registro
      setMotoristaId('');
      setMotoristaNome('');
      setMotoristaCpf('');
      setMotoristaTelefone('');
      setPlacaCavalo('');
      setPlacaCarreta('');
      setTipoVeiculo('Carreta LS');
      setFreteiroNome('');
      setFornecedorId('');
      setFornecedorNome('');
      setOrigemCidade('Mafra');
      setOrigemUf('SC');
      setIsTriangular(false);
      setIntermediadorId('');
      setIntermediadorNome('');
      setIntermediadorCnpj('');
      setValorRepasseCombinado('');
      setDestinoClienteId('');
      setDestinoEmpresaNome('');
      setDestinoCidade('Paranaguá');
      setDestinoUf('PR');
      setTipoCarga('Soja em Grãos');
      setValorCombinadoKg('');
      setPesoEstimadoKg('38000');
      setValorAdiantamento('');
      setDataInclusao(getAgoraLocalIso());
      setObservacoes('');
      setXmlFile1(null);
      setXmlFile2(null);
    }
  }, [isOpen, carregamentoParaEditar]);

  // Ao selecionar um motorista existente no banco
  const handleSelectMotorista = (e) => {
    const mId = e.target.value;
    setMotoristaId(mId);
    if (!mId) return;

    const mot = motoristasCadastrados.find(m => String(m.id) === String(mId));
    if (mot) {
      setMotoristaNome(mot.nome || '');
      setMotoristaCpf(mot.cpf_cnpj || '');
      setMotoristaTelefone(mot.telefone || '');
      if (mot.placa_cavalo) setPlacaCavalo(mot.placa_cavalo);
      if (mot.placa_carreta) setPlacaCarreta(mot.placa_carreta);
      if (mot.tipo_veiculo) setTipoVeiculo(mot.tipo_veiculo);
      setFreteiroNome(mot.nome || '');
    }
  };

  // Ao selecionar um fornecedor existente no banco
  const handleSelectFornecedor = (e) => {
    const cId = e.target.value;
    setFornecedorId(cId);
    if (!cId) return;

    const cli = clientesCadastrados.find(c => String(c.id) === String(cId));
    if (cli) {
      setFornecedorNome(cli.razao_social || cli.nome_fantasia || '');
      if (cli.cidade) setOrigemCidade(cli.cidade);
      if (cli.uf) setOrigemUf(cli.uf);
    }
  };

  // Ao selecionar um intermediador existente
  const handleSelectIntermediador = (e) => {
    const cId = e.target.value;
    setIntermediadorId(cId);
    if (!cId) return;

    const cli = clientesCadastrados.find(c => String(c.id) === String(cId));
    if (cli) {
      setIntermediadorNome(cli.razao_social || cli.nome_fantasia || '');
      if (cli.cnpj_cpf) setIntermediadorCnpj(cli.cnpj_cpf);
    }
  };

  // Ao selecionar cliente de destino
  const handleSelectDestinoCliente = (e) => {
    const cId = e.target.value;
    setDestinoClienteId(cId);
    if (!cId) return;

    const cli = clientesCadastrados.find(c => String(c.id) === String(cId));
    if (cli) {
      setDestinoEmpresaNome(cli.razao_social || cli.nome_fantasia || '');
      if (cli.cidade) setDestinoCidade(cli.cidade);
      if (cli.uf) setDestinoUf(cli.uf);
    }
  };

  // Cálculo de frete estimado
  const vKg = parseFloat(valorCombinadoKg) || 0;
  const pKg = parseFloat(pesoEstimadoKg) || 0;
  const freteEstimadoTotal = vKg * pKg;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!motoristaNome.trim() || !placaCavalo.trim()) {
      alert('Por favor, informe o Nome do Motorista e a Placa do Cavalo.');
      return;
    }
    if (!fornecedorNome.trim() || !origemCidade.trim()) {
      alert('Por favor, informe a Empresa Fornecedora e a Cidade de Carregamento.');
      return;
    }
    if (!destinoEmpresaNome.trim() || !destinoCidade.trim()) {
      alert('Por favor, informe a Empresa de Destino e Cidade de Destino.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        motorista_id: motoristaId ? Number(motoristaId) : null,
        motorista_nome: motoristaNome.trim(),
        motorista_cpf: motoristaCpf.trim() || null,
        motorista_telefone: motoristaTelefone.trim() || null,
        placa_cavalo: placaCavalo.trim().toUpperCase(),
        placa_carreta: placaCarreta ? placaCarreta.trim().toUpperCase() : null,
        tipo_veiculo: tipoVeiculo,
        freteiro_nome: freteiroNome.trim() || motoristaNome.trim(),
        fornecedor_id: fornecedorId ? Number(fornecedorId) : null,
        fornecedor_nome: fornecedorNome.trim(),
        origem_cidade: origemCidade.trim(),
        origem_uf: origemUf.trim().toUpperCase(),
        is_triangular: isTriangular ? 1 : 0,
        intermediador_id: intermediadorId ? Number(intermediadorId) : null,
        intermediador_nome: isTriangular ? intermediadorNome.trim() : null,
        intermediador_cnpj: isTriangular ? intermediadorCnpj.trim() : null,
        valor_repasse_combinado: isTriangular ? (parseFloat(valorRepasseCombinado) || 0) : 0,
        destino_cliente_id: destinoClienteId ? Number(destinoClienteId) : null,
        destino_empresa_nome: destinoEmpresaNome.trim(),
        destino_cidade: destinoCidade.trim(),
        destino_uf: destinoUf.trim().toUpperCase(),
        tipo_carga: tipoCarga.trim(),
        tipo_negociacao: 'por_kg',
        valor_combinado_kg: vKg,
        peso_estimado_kg: pKg,
        valor_frete_estimado: freteEstimadoTotal,
        valor_adiantamento_combinado: parseFloat(valorAdiantamento) || 0,
        data_inclusao: dataInclusao ? dataInclusao.replace('T', ' ') : undefined,
        observacoes: observacoes.trim() || null
      };

      let carregamentoId = carregamentoParaEditar?.id;

      if (carregamentoParaEditar) {
        await api.put(`/carregamentos/${carregamentoParaEditar.id}`, payload);
      } else {
        const resNovo = await api.post('/carregamentos', payload);
        carregamentoId = resNovo.data?.carregamento?.id;
      }

      // Se o usuário já anexou o XML do CT-e, processar a importação imediatamente!
      if (carregamentoId && xmlFile1) {
        const formData = new FormData();
        formData.append('xml_1', xmlFile1);
        if (xmlFile2) {
          formData.append('xml_2', xmlFile2);
        }

        await api.post(`/carregamentos/${carregamentoId}/importar-cte`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar carregamento:', err);
      alert(err.response?.data?.error || 'Erro ao salvar carregamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {carregamentoParaEditar ? 'Editar Carregamento' : 'Novo Carregamento em Andamento'}
              </h2>
              <p className="text-xs text-slate-400">
                Preencha os dados do caminhão. A carga será monitorada no Mapa em tempo real.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* SEÇÃO 1: MOTORISTA & VEÍCULO */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                1. Motorista, Freteiro & Caminhão
              </h3>
              
              {motoristasCadastrados.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Puxar do Cadastro:</span>
                  <select
                    value={motoristaId}
                    onChange={handleSelectMotorista}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-blue-300 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Selecione um motorista salvo...</option>
                    {motoristasCadastrados.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.placa_cavalo || 'S/ placa'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nome do Motorista / Freteiro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={motoristaNome}
                  onChange={(e) => setMotoristaNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(41) 99881-2233"
                  value={motoristaTelefone}
                  onChange={(e) => setMotoristaTelefone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Placa do Cavalo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ABC-4D20"
                  value={placaCavalo}
                  onChange={(e) => setPlacaCavalo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Placa da Carreta
                </label>
                <input
                  type="text"
                  placeholder="Ex: CAR-9911"
                  value={placaCarreta}
                  onChange={(e) => setPlacaCarreta(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-semibold tracking-wider placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tipo de Veículo
                </label>
                <select
                  value={tipoVeiculo}
                  onChange={(e) => setTipoVeiculo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Carreta LS">Carreta LS (6 eixos)</option>
                  <option value="Bitrem">Bitrem (7 eixos)</option>
                  <option value="Rodotrem">Rodotrem (9 eixos)</option>
                  <option value="Vanderleia">Vanderléia (3 eixos)</option>
                  <option value="Bitruck">Bitruck (4 eixos)</option>
                  <option value="Truck">Truck (3 eixos)</option>
                  <option value="Toco">Toco (2 eixos)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: FORNECEDOR & LOCAL DE CARREGAMENTO */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                2. Onde Está Carregando (Fornecedor & Local)
              </h3>

              {clientesCadastrados.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Puxar Fornecedor:</span>
                  <select
                    value={fornecedorId}
                    onChange={handleSelectFornecedor}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Selecione fornecedor salvo...</option>
                    {clientesCadastrados.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.razao_social || c.nome_fantasia} ({c.cidade || 'S/ cidade'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Empresa Fornecedora (Local do Carregamento) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bunge Alimentos Mafra / Seara Alimentos"
                  value={fornecedorNome}
                  onChange={(e) => setFornecedorNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mafra"
                    value={origemCidade}
                    onChange={(e) => setOrigemCidade(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="SC"
                    value={origemUf}
                    onChange={(e) => setOrigemUf(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white text-center font-bold focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: OPERAÇÃO TRIANGULAR (TOGGLE) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">
                  Operação / Venda Triangular?
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  (Marque se houver empresa intermediando a venda e repasse)
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTriangular}
                  onChange={(e) => setIsTriangular(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {isTriangular && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                    Empresa Intermediadora *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: AgroSul Intermediações & Logística"
                    value={intermediadorNome}
                    onChange={(e) => setIntermediadorNome(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-purple-500/40 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                    Repasse Combinado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500.00"
                    value={valorRepasseCombinado}
                    onChange={(e) => setValorRepasseCombinado(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-purple-500/40 text-purple-200 font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: DESTINO */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              3. Destino (Cliente Final & Descarregamento)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Empresa de Destino (Recebedor / Cliente) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Terminal Portuário de Paranaguá S/A"
                  value={destinoEmpresaNome}
                  onChange={(e) => setDestinoEmpresaNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Cidade Destino *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Paranaguá"
                    value={destinoCidade}
                    onChange={(e) => setDestinoCidade(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="PR"
                    value={destinoUf}
                    onChange={(e) => setDestinoUf(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white text-center font-bold focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: NEGOCIAÇÃO COMERCIAL (VALOR POR KG & ESTIMATIVA) */}
          <div className="p-4 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/30 space-y-3.5">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              4. Negociação Comercial & Valores de Frete
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tipo de Carga
                </label>
                <input
                  type="text"
                  placeholder="Ex: Soja em Grãos"
                  value={tipoCarga}
                  onChange={(e) => setTipoCarga(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                  Valor Combinado por KG (R$/kg) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Ex: 0.115"
                  value={valorCombinadoKg}
                  onChange={(e) => setValorCombinadoKg(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-emerald-500/50 text-emerald-400 font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Peso Estimado (kg)
                </label>
                <input
                  type="number"
                  placeholder="38000"
                  value={pesoEstimadoKg}
                  onChange={(e) => setPesoEstimadoKg(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Adiantamento Combinado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorAdiantamento}
                  onChange={(e) => setValorAdiantamento(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Painel com Cálculo de Frete Estimado em Destaque */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Fórmula de Cálculo: <strong>{pKg.toLocaleString('pt-BR')} kg × R$ {vKg.toFixed(4)}/kg</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Frete Estimado Total:</span>
                <span className="text-emerald-400 font-black text-sm">
                  R$ {freteEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 6: DATA E HORA DE INCLUSÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Data e Hora de Inclusão do Carregamento *
              </label>
              <input
                type="datetime-local"
                required
                value={dataInclusao}
                onChange={(e) => setDataInclusao(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Este horário aparecerá na bolinha do mapa para indicar há quanto tempo o caminhão está no local.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Observações Operacionais
              </label>
              <input
                type="text"
                placeholder="Ex: Carga granel limpa, aguardando liberação de pátio..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* SEÇÃO 7: IMPORTAÇÃO DO XML DO CT-E (OPCIONAL NESTE MOMENTO) */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-400" />
                5. Importar XML do CT-e Já Feito (Opcional)
              </h3>
              <span className="text-[10px] text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                Pode ser feito agora ou depois pelo mapa
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Se o CT-e já estiver pronto, você pode anexar o XML agora. O sistema lerá o peso real da balança, recalculará o frete e lançará tudo automaticamente no Financeiro!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Arquivo XML do CT-e (Principal)
                </label>
                <input
                  type="file"
                  accept=".xml"
                  onChange={(e) => setXmlFile1(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer"
                />
              </div>

              {isTriangular && (
                <div>
                  <label className="block text-[11px] font-medium text-purple-300 mb-1">
                    2º XML (Venda Triangular / Repasse)
                  </label>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setXmlFile2(e.target.files[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando Carregamento...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {carregamentoParaEditar ? 'Atualizar Carregamento' : 'Salvar e Monitorar no Mapa'}
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
