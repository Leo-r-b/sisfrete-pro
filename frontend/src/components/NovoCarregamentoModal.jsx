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
  FileText,
  Briefcase,
  Handshake,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NovoCarregamentoModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  carregamentoParaEditar = null 
}) {
  const { activeEmpresa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [motoristasCadastrados, setMotoristasCadastrados] = useState([]);
  const [clientesCadastrados, setClientesCadastrados] = useState([]);

  // Modalidade de Operação (Gestão de Pagamentos, Subcontratação, Agenciamento)
  const [modalidade, setModalidade] = useState(activeEmpresa?.modo_operacao || 'gestao_pagamentos');
  
  // Condições Específicas de Subcontratação
  const [tipoCobrancaTomador, setTipoCobrancaTomador] = useState('mesmo_motorista');
  const [valorFreteTomadorKg, setValorFreteTomadorKg] = useState('');
  const [valorFreteTomadorTotal, setValorFreteTomadorTotal] = useState('');

  // Condições Específicas de Agenciamento
  const [comissaoAgenciamentoTipo, setComissaoAgenciamentoTipo] = useState('percentual');
  const [comissaoAgenciamentoValor, setComissaoAgenciamentoValor] = useState(
    activeEmpresa?.percentual_comissao_padrao !== undefined ? String(activeEmpresa.percentual_comissao_padrao) : '5.0'
  );

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
      setModalidade(carregamentoParaEditar.modalidade || activeEmpresa?.modo_operacao || 'gestao_pagamentos');
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

      setIsTriangular(Boolean(
        carregamentoParaEditar.is_triangular === 1 ||
        carregamentoParaEditar.is_triangular === true ||
        carregamentoParaEditar.is_triangular === '1' ||
        carregamentoParaEditar.is_triangular === 'true'
      ));
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

      setValorFreteTomadorKg(carregamentoParaEditar.valor_frete_tomador_kg || '');
      setValorFreteTomadorTotal(carregamentoParaEditar.valor_frete_tomador_total || '');
      setTipoCobrancaTomador(
        Number(carregamentoParaEditar.valor_frete_tomador_total) > 0 ? 'total' :
        (Number(carregamentoParaEditar.valor_frete_tomador_kg) > 0 ? 'por_kg' : 'mesmo_motorista')
      );
      setComissaoAgenciamentoTipo(carregamentoParaEditar.comissao_agenciamento_tipo || 'percentual');
      setComissaoAgenciamentoValor(
        carregamentoParaEditar.comissao_agenciamento_valor !== undefined && carregamentoParaEditar.comissao_agenciamento_valor !== null
          ? String(carregamentoParaEditar.comissao_agenciamento_valor)
          : (activeEmpresa?.percentual_comissao_padrao !== undefined ? String(activeEmpresa.percentual_comissao_padrao) : '5.0')
      );

      if (carregamentoParaEditar.data_inclusao) {
        setDataInclusao(carregamentoParaEditar.data_inclusao.slice(0, 16));
      }
      setObservacoes(carregamentoParaEditar.observacoes || '');
    } else {
      // Limpar campos para novo registro
      setModalidade(activeEmpresa?.modo_operacao || 'gestao_pagamentos');
      setTipoCobrancaTomador('mesmo_motorista');
      setValorFreteTomadorKg('');
      setValorFreteTomadorTotal('');
      setComissaoAgenciamentoTipo('percentual');
      setComissaoAgenciamentoValor(
        activeEmpresa?.percentual_comissao_padrao !== undefined ? String(activeEmpresa.percentual_comissao_padrao) : '5.0'
      );
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
  }, [isOpen, carregamentoParaEditar, activeEmpresa]);

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

  // Cálculo de frete estimado para o Motorista
  const vKg = parseFloat(valorCombinadoKg) || 0;
  const pKg = parseFloat(pesoEstimadoKg) || 0;
  const freteEstimadoMotorista = Number((vKg * pKg).toFixed(2));

  // Cálculo de frete estimado para o Tomador (Subcontratação)
  let freteEstimadoTomador = freteEstimadoMotorista;
  if (tipoCobrancaTomador === 'por_kg' && parseFloat(valorFreteTomadorKg) > 0) {
    freteEstimadoTomador = Number((pKg * parseFloat(valorFreteTomadorKg)).toFixed(2));
  } else if (tipoCobrancaTomador === 'total' && parseFloat(valorFreteTomadorTotal) > 0) {
    freteEstimadoTomador = parseFloat(valorFreteTomadorTotal);
  }
  const margemEstimadaSubcontratacao = Number((freteEstimadoTomador - freteEstimadoMotorista).toFixed(2));

  // Cálculo de comissão estimada (Agenciamento)
  let comissaoEstimadaAgenciamento = 0;
  if (comissaoAgenciamentoTipo === 'percentual') {
    comissaoEstimadaAgenciamento = Number(((freteEstimadoMotorista * (parseFloat(comissaoAgenciamentoValor) || 0)) / 100).toFixed(2));
  } else {
    comissaoEstimadaAgenciamento = parseFloat(comissaoAgenciamentoValor) || 0;
  }

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
        modalidade: modalidade,
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
        intermediador_id: isTriangular && intermediadorId ? Number(intermediadorId) : null,
        intermediador_nome: isTriangular && intermediadorNome ? intermediadorNome.trim() : null,
        intermediador_cnpj: isTriangular && intermediadorCnpj ? intermediadorCnpj.trim() : null,
        valor_repasse_combinado: isTriangular && valorRepasseCombinado ? (parseFloat(valorRepasseCombinado) || 0) : 0,
        destino_cliente_id: destinoClienteId ? Number(destinoClienteId) : null,
        destino_empresa_nome: destinoEmpresaNome.trim(),
        destino_cidade: destinoCidade.trim(),
        destino_uf: destinoUf.trim().toUpperCase(),
        tipo_carga: tipoCarga.trim(),
        tipo_negociacao: 'por_kg',
        valor_combinado_kg: vKg,
        peso_estimado_kg: pKg,
        valor_frete_estimado: freteEstimadoMotorista,
        valor_adiantamento_combinado: parseFloat(valorAdiantamento) || 0,
        valor_frete_tomador_kg: modalidade === 'subcontratacao' && tipoCobrancaTomador === 'por_kg' ? (parseFloat(valorFreteTomadorKg) || 0) : 0,
        valor_frete_tomador_total: modalidade === 'subcontratacao' && tipoCobrancaTomador === 'total' ? (parseFloat(valorFreteTomadorTotal) || 0) : 0,
        comissao_agenciamento_tipo: comissaoAgenciamentoTipo,
        comissao_agenciamento_valor: modalidade === 'agenciamento_repasse' ? (parseFloat(comissaoAgenciamentoValor) || 0) : 0,
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
          
          {/* BANNER SELETOR DE MODALIDADE */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-400" />
                Modalidade da Operação & Regra Financeira
              </label>
              <span className="text-[11px] text-slate-400">
                Define o comportamento contábil ao importar o CT-e
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Opção 1: Gestão de Pagamentos */}
              <button
                type="button"
                onClick={() => setModalidade('gestao_pagamentos')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  modalidade === 'gestao_pagamentos'
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${modalidade === 'gestao_pagamentos' ? 'text-amber-400' : 'text-slate-300'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    Gestão de Pagamentos
                  </span>
                  {modalidade === 'gestao_pagamentos' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Ex: Farimax / Embarcador. Paga o freteiro (CT-e + Por Fora). <strong className="text-amber-300/90">Não gera contas a receber.</strong>
                </p>
              </button>

              {/* Opção 2: Subcontratação Tradicional */}
              <button
                type="button"
                onClick={() => setModalidade('subcontratacao')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  modalidade === 'subcontratacao'
                    ? 'bg-blue-500/10 border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${modalidade === 'subcontratacao' ? 'text-blue-400' : 'text-slate-300'}`}>
                    <Truck className="w-4 h-4" />
                    Subcontratação
                  </span>
                  {modalidade === 'subcontratacao' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Transportadora oficial. <strong className="text-blue-300/90">Fatura o Tomador (CT-e + Por Fora)</strong> e paga o terceiro.
                </p>
              </button>

              {/* Opção 3: Agenciamento & Repasse */}
              <button
                type="button"
                onClick={() => setModalidade('agenciamento_repasse')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  modalidade === 'agenciamento_repasse'
                    ? 'bg-purple-500/10 border-purple-500/60 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${modalidade === 'agenciamento_repasse' ? 'text-purple-400' : 'text-slate-300'}`}>
                    <Handshake className="w-4 h-4" />
                    Agenciamento & Repasse
                  </span>
                  {modalidade === 'agenciamento_repasse' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Intermediação de fretes. Paga o freteiro e <strong className="text-purple-300/90">recebe a comissão/lucro</strong> do frete.
                </p>
              </button>
            </div>
          </div>

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

          {/* SEÇÃO 4: NEGOCIAÇÃO COMERCIAL (VALOR COMBINADO & REGRAS DA MODALIDADE) */}
          <div className={`p-4 rounded-xl border space-y-4 ${
            modalidade === 'subcontratacao'
              ? 'bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/30 border-blue-500/30'
              : modalidade === 'agenciamento_repasse'
                ? 'bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950/30 border-purple-500/30'
                : 'bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/30 border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
                <DollarSign className={`w-4 h-4 ${
                  modalidade === 'subcontratacao' ? 'text-blue-400' : (modalidade === 'agenciamento_repasse' ? 'text-purple-400' : 'text-emerald-400')
                }`} />
                4. Negociação Comercial (Motorista & Modalidade)
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                modalidade === 'subcontratacao'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : modalidade === 'agenciamento_repasse'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                {modalidade === 'subcontratacao' ? 'Subcontratação Tradicional' : (modalidade === 'agenciamento_repasse' ? 'Agenciamento & Repasse' : 'Gestão de Pagamentos')}
              </span>
            </div>

            {/* Parâmetros do Frete do Motorista (Comum a todas as modalidades) */}
            <div>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block mb-2">
                A) Frete Acordado com o Motorista / Freteiro
              </span>
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
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Valor por KG do Motorista (R$/kg) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="Ex: 0.150"
                    value={valorCombinadoKg}
                    onChange={(e) => setValorCombinadoKg(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-amber-500/50 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Peso Estimado (kg) *
                  </label>
                  <input
                    type="number"
                    placeholder="35000"
                    value={pesoEstimadoKg}
                    onChange={(e) => setPesoEstimadoKg(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Adiantamento (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={valorAdiantamento}
                    onChange={(e) => setValorAdiantamento(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* CONDIÇÃO ESPECÍFICA: SUBCONTRATAÇÃO TRADICIONAL */}
            {modalidade === 'subcontratacao' && (
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    B) Condição de Recebimento com o Cliente Tomador (Transportadora)
                  </span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Fatura o Tomador: CT-e + Por Fora
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoCobrancaTomador('mesmo_motorista')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      tipoCobrancaTomador === 'mesmo_motorista'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">Repasse Integral (Padrão)</span>
                    <span className="text-[10px] leading-tight block text-slate-400">
                      Tomador paga o valor total do motorista (CT-e + Por Fora).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCobrancaTomador('por_kg')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      tipoCobrancaTomador === 'por_kg'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">Valor/KG Diferenciado</span>
                    <span className="text-[10px] leading-tight block text-slate-400">
                      Cobra do tomador valor/kg superior ao freteiro (Margem).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCobrancaTomador('total')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      tipoCobrancaTomador === 'total'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">Valor Fixo Fechado</span>
                    <span className="text-[10px] leading-tight block text-slate-400">
                      Preço total fixado com o cliente para a viagem.
                    </span>
                  </button>
                </div>

                {tipoCobrancaTomador === 'por_kg' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-300 mb-1">
                      Valor por KG Cobrado do Tomador (R$/kg)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Ex: 0.165"
                      value={valorFreteTomadorKg}
                      onChange={(e) => setValorFreteTomadorKg(e.target.value)}
                      className="w-full sm:w-1/2 px-3 py-1.5 text-sm rounded-lg bg-slate-900 border border-blue-500/50 text-blue-300 font-bold focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}

                {tipoCobrancaTomador === 'total' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-300 mb-1">
                      Valor Total Cobrado do Tomador (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 5800.00"
                      value={valorFreteTomadorTotal}
                      onChange={(e) => setValorFreteTomadorTotal(e.target.value)}
                      className="w-full sm:w-1/2 px-3 py-1.5 text-sm rounded-lg bg-slate-900 border border-blue-500/50 text-blue-300 font-bold focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}
              </div>
            )}

            {/* CONDIÇÃO ESPECÍFICA: AGENCIAMENTO & REPASSE */}
            {modalidade === 'agenciamento_repasse' && (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Handshake className="w-3.5 h-3.5 text-purple-400" />
                    B) Comissão & Honorários de Agenciamento
                  </span>
                  <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    A Agência fatura a comissão/lucro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                      Formato da Comissão
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setComissaoAgenciamentoTipo('percentual')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                          comissaoAgenciamentoTipo === 'percentual'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        % Percentual
                      </button>
                      <button
                        type="button"
                        onClick={() => setComissaoAgenciamentoTipo('fixo')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                          comissaoAgenciamentoTipo === 'fixo'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        R$ Valor Fixo
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                      {comissaoAgenciamentoTipo === 'percentual' ? 'Percentual de Comissão (%)' : 'Valor da Comissão (R$)'}
                    </label>
                    <input
                      type="number"
                      step={comissaoAgenciamentoTipo === 'percentual' ? '0.1' : '0.01'}
                      value={comissaoAgenciamentoValor}
                      onChange={(e) => setComissaoAgenciamentoValor(e.target.value)}
                      placeholder={comissaoAgenciamentoTipo === 'percentual' ? '5.0' : '250.00'}
                      className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-900 border border-purple-500/50 text-purple-200 font-bold focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* RESUMO PROJETADO CONFORME A MODALIDADE */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">
                  Estimativa Motorista ({pKg.toLocaleString('pt-BR')} kg × R$ {vKg.toFixed(4)}/kg):
                </span>
                <span className="text-amber-400 font-black text-sm font-mono">
                  R$ {freteEstimadoMotorista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {modalidade === 'subcontratacao' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-500/20">
                    <span className="text-slate-400 block text-[10px]">📥 A Receber do Tomador:</span>
                    <strong className="text-blue-300 font-black text-xs font-mono">
                      R$ {freteEstimadoTomador.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/20">
                    <span className="text-slate-400 block text-[10px]">📤 A Pagar ao Motorista:</span>
                    <strong className="text-amber-300 font-black text-xs font-mono">
                      R$ {freteEstimadoMotorista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <span className="text-slate-400 block text-[10px]">💰 Margem Estimada:</span>
                    <strong className="text-emerald-300 font-black text-xs font-mono">
                      R$ {margemEstimadaSubcontratacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              )}

              {modalidade === 'agenciamento_repasse' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/20">
                    <span className="text-slate-400 block text-[10px]">📤 A Pagar ao Motorista:</span>
                    <strong className="text-amber-300 font-black text-xs font-mono">
                      R$ {freteEstimadoMotorista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/20">
                    <span className="text-slate-400 block text-[10px]">📥 A Receber (Comissão Agência):</span>
                    <strong className="text-purple-300 font-black text-xs font-mono">
                      R$ {comissaoEstimadaAgenciamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              )}

              {modalidade === 'gestao_pagamentos' && (
                <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                  <span className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Gestão de Pagamentos: Não gera contas a receber. Apenas contas a pagar para o motorista/repasse.
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    A pagar: <strong className="text-amber-400 font-bold">R$ {freteEstimadoMotorista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </span>
                </div>
              )}
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
