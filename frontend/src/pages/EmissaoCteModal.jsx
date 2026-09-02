import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Truck, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Scale, 
  FileText, 
  Building2, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Navigation,
  Send,
  PlusCircle,
  Upload,
  FileCode,
  Sparkles,
  RotateCcw,
  Percent,
  Calculator
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Coeficientes Oficiais da ANTT por Tipo de Carga e Eixos (Resolução nº 5.867/2020 e nº 6.084/2026)
// Tabela B - Operações em que haja a contratação apenas do veículo automotor de cargas
// Fonte Oficial Online: https://calculadorafrete.antt.gov.br/
const TABELA_ANTT_OFICIAL = {
  granel_liquido: {
    nome: 'Granel líquido',
    coeficientes: {
      2: { ccd: 5.2831, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2831, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2831, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9986, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6714, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.1032, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8943, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  carga_geral: {
    nome: 'Carga Geral',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  granel_solido: {
    nome: 'Granel sólido',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  frigorificada: {
    nome: 'Frigorificada ou Aquecida',
    coeficientes: {
      2: { ccd: 6.1290, cc: 584.04, nome: 'Toco (2 eixos)' },
      3: { ccd: 6.1290, cc: 584.04, nome: 'Truck (3 eixos)' },
      4: { ccd: 6.1290, cc: 584.04, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 6.9472, cc: 645.26, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 7.7367, cc: 659.62, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 8.1867, cc: 775.96, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 9.1284, cc: 831.06, nome: 'Rodotrem (9 eixos)' }
    }
  },
  conteinerizada: {
    nome: 'Conteinerizada',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  neogranel: {
    nome: 'Neogranel',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  perigosa_liquido: {
    nome: 'Perigosa (granel líquido)',
    coeficientes: {
      2: { ccd: 6.0798, cc: 701.84, nome: 'Toco (2 eixos)' },
      3: { ccd: 6.0798, cc: 701.84, nome: 'Truck (3 eixos)' },
      4: { ccd: 6.0798, cc: 701.84, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 6.7953, cc: 763.06, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 7.4681, cc: 777.43, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.9181, cc: 893.76, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 8.7172, cc: 948.87, nome: 'Rodotrem (9 eixos)' }
    }
  },
  perigosa_geral: {
    nome: 'Perigosa (carga geral)',
    coeficientes: {
      2: { ccd: 5.6391, cc: 639.21, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.6391, cc: 639.21, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.6391, cc: 639.21, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 6.3546, cc: 700.42, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 7.0274, cc: 714.79, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.4774, cc: 831.13, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 8.2766, cc: 886.23, nome: 'Rodotrem (9 eixos)' }
    }
  }
};

const INITIAL_FORM_DATA = {
  tipo_operacao: 'subcontratacao_tradicional', // 'subcontratacao_tradicional' ou 'agenciamento_repasse'
  
  // Veículo & Motorista
  motorista_id: '',
  motorista_nome: '',
  motorista_cpf: '',
  placa_veiculo: '',
  placa_carreta: '',
  numero_eixos: 6,
  
  // Rota & Carga
  origem_cidade: '',
  origem_uf: '',
  destino_cidade: '',
  destino_uf: '',
  distancia_km: '',
  tipo_carga_antt: 'granel_liquido', // PADRÃO: Granel Líquido (Óleo Vegetal)
  tipo_carga: '',
  peso_kg: '',
  
  // Cliente / Tomador
  cliente_id: '',
  cliente_nome: '',
  cliente_cnpj: '',
  nfe_referencia: '',
  nfe_chave: '',
  
  // Valores Gerais / CT-e
  valor_frete_venda: '', // Valor Total CT-e / ANTT (vai no XML/SEFAZ)
  
  // Subcontratação Tradicional
  valor_cliente: '',     // A Receber do Cliente
  valor_motorista: '',   // A Pagar ao Motorista
  
  // Agenciamento & Repasse com Comissão
  valor_frete_real: '',      // Valor Real do Frete (gerencial, não vai no CT-e)
  percentual_comissao: 5,   // Percentual de Comissão (%) sobre frete real
  
  valor_adiantamento: 0,
  valor_pedagio: 0
};

export default function EmissaoCteModal({ isOpen, onClose, onSuccess, onOpenDacte }) {
  const { activeEmpresa, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_master;
  const nfeFileInputRef = useRef(null);

  // Dados mestres cadastrados
  const [motoristas, setMotoristas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);

  // Form State Limpo
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [pisoAnttCalculado, setPisoAnttCalculado] = useState(0);
  const [pedagioEstimado, setPedagioEstimado] = useState(0);
  const [isEmitindo, setIsEmitindo] = useState(false);
  const [isImportingNfe, setIsImportingNfe] = useState(false);
  const [isCalculandoDistancia, setIsCalculandoDistancia] = useState(false);
  const [nfeImportadaSuccess, setNfeImportadaSuccess] = useState('');
  const [erroValidacao, setErroValidacao] = useState('');

  // Modal Vermelho de Alerta de Infração ANTT
  const [isAlertaPisoModalOpen, setIsAlertaPisoModalOpen] = useState(false);
  const [riscoAssumidoUsuario, setRiscoAssumidoUsuario] = useState(false);

  // Função para fechar e limpar completamente todos os dados do formulário
  const handleCloseModal = () => {
    setFormData(INITIAL_FORM_DATA);
    setNfeImportadaSuccess('');
    setErroValidacao('');
    setPisoAnttCalculado(0);
    setPedagioEstimado(0);
    setRiscoAssumidoUsuario(false);
    if (nfeFileInputRef.current) nfeFileInputRef.current.value = '';
    onClose();
  };

  // Resetar dados sempre que o modal for aberto respeitando a modalidade da empresa ativa
  useEffect(() => {
    if (isOpen) {
      const modoPadrao = activeEmpresa?.modo_operacao === 'agenciamento_repasse' ? 'agenciamento_repasse' : 'subcontratacao_tradicional';
      const comissaoPadrao = activeEmpresa?.percentual_comissao_padrao !== undefined ? Number(activeEmpresa.percentual_comissao_padrao) : 5;
      
      setFormData({
        ...INITIAL_FORM_DATA,
        tipo_operacao: modoPadrao,
        percentual_comissao: comissaoPadrao
      });
      setNfeImportadaSuccess('');
      setErroValidacao('');
      setPisoAnttCalculado(0);
      setPedagioEstimado(0);
      setRiscoAssumidoUsuario(false);
      setLoadingBase(true);
      Promise.all([
        api.get('/motoristas'),
        api.get('/clientes')
      ])
        .then(([resMot, resCli]) => {
          setMotoristas(resMot.data || []);
          setClientes(resCli.data || []);
        })
        .catch(err => console.error('Erro ao carregar dados base:', err))
        .finally(() => setLoadingBase(false));
    }
  }, [isOpen, activeEmpresa]);

  // Função para buscar distância rodoviária automática (Google Maps / Roteamento)
  const buscarDistanciaAutomatica = async (origemCidade, origemUf, destinoCidade, destinoUf) => {
    if (!origemCidade || !destinoCidade) return;
    setIsCalculandoDistancia(true);
    try {
      const res = await api.post('/rota/distancia', {
        origem_cidade: origemCidade,
        origem_uf: origemUf,
        destino_cidade: destinoCidade,
        destino_uf: destinoUf
      });
      if (res.data?.distancia_km) {
        const distKm = Number(res.data.distancia_km);
        
        // Calcular piso diretamente com a nova distância
        const cargaKey = formData.tipo_carga_antt || 'granel_liquido';
        const categoria = TABELA_ANTT_OFICIAL[cargaKey] || TABELA_ANTT_OFICIAL.granel_liquido;
        const nEixos = Number(formData.numero_eixos || 6);
        const eixosInfo = categoria.coeficientes[nEixos] || categoria.coeficientes[6];
        const novoPiso = Number(((eixosInfo.ccd * distKm) + eixosInfo.cc).toFixed(2));

        setFormData(prev => ({
          ...prev,
          distancia_km: distKm,
          valor_frete_venda: novoPiso
        }));
        setPisoAnttCalculado(novoPiso);
      }
    } catch (err) {
      console.warn('Aviso: falha na consulta de rota:', err);
    } finally {
      setIsCalculandoDistancia(false);
    }
  };

  // Recalcular Piso Mínimo Oficial ANTT em tempo real (Resolução nº 5.867/2020 e nº 6.084/2026)
  useEffect(() => {
    const cargaKey = formData.tipo_carga_antt || 'granel_liquido';
    const categoria = TABELA_ANTT_OFICIAL[cargaKey] || TABELA_ANTT_OFICIAL.granel_liquido;
    const nEixos = Number(formData.numero_eixos || 6);
    const eixosInfo = categoria.coeficientes[nEixos] || categoria.coeficientes[6];
    const dist = Number(formData.distancia_km || 0);

    if (dist > 0) {
      // Fórmula Oficial ANTT: (CCD * Distância) + CC
      const custoDeslocamento = eixosInfo.ccd * dist;
      const custoCargaDescarga = eixosInfo.cc;
      const piso = Number((custoDeslocamento + custoCargaDescarga).toFixed(2));
      
      // Pedágio estimado regulatório (R$ 0,12 por eixo por km)
      const ped = Number((dist * 0.12 * nEixos).toFixed(2));

      setPisoAnttCalculado(piso);
      setPedagioEstimado(ped);

      // Preenchimento automático do "Valor CT-e / ANTT":
      // Atualiza automaticamente quando o frete ainda não foi digitado ou quando é menor que o piso
      setFormData(prev => {
        if (!prev.valor_frete_venda || Number(prev.valor_frete_venda) === 0 || (!riscoAssumidoUsuario && Number(prev.valor_frete_venda) < piso)) {
          return { ...prev, valor_frete_venda: piso };
        }
        return prev;
      });
    } else {
      setPisoAnttCalculado(0);
      setPedagioEstimado(0);
    }
  }, [formData.distancia_km, formData.numero_eixos, formData.tipo_carga_antt, riscoAssumidoUsuario]);

  if (!isOpen) return null;

  // Handler de Seleção de Motorista / Caminhão (Auto-preenche eixos cadastrados)
  const handleSelectMotorista = (motId) => {
    const mot = motoristas.find(m => String(m.id) === String(motId));
    if (mot) {
      let eixos = mot.numero_eixos;
      if (!eixos) {
        const tipo = String(mot.tipo_veiculo || '').toLowerCase();
        if (tipo.includes('toco')) eixos = 2;
        else if (tipo.includes('truck')) eixos = 3;
        else if (tipo.includes('bitruck')) eixos = 4;
        else if (tipo.includes('bitrem')) eixos = 7;
        else if (tipo.includes('rodotrem')) eixos = 9;
        else eixos = 6;
      }
      setFormData(prev => ({
        ...prev,
        motorista_id: mot.id,
        motorista_nome: mot.nome,
        motorista_cpf: mot.cpf_cnpj || '',
        placa_veiculo: (mot.placa_cavalo || 'ABC1D23').toUpperCase(),
        placa_carreta: (mot.placa_carreta || 'XYZ9E87').toUpperCase(),
        numero_eixos: eixos
      }));
    }
  };

  // Handler de Seleção de Cliente / Tomador
  const handleSelectCliente = (cliId) => {
    const cli = clientes.find(c => String(c.id) === String(cliId));
    if (cli) {
      setFormData(prev => ({
        ...prev,
        cliente_id: cli.id,
        cliente_nome: cli.razao_social || cli.nome_fantasia,
        cliente_cnpj: cli.cnpj_cpf || ''
      }));
    }
  };

  // Handler de Importação Direta do XML da NF-e com cálculo de distância e peso líquido
  const handleImportNfeFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImportingNfe(true);
    setErroValidacao('');
    setNfeImportadaSuccess('');

    const form = new FormData();
    form.append('xml', file);

    try {
      const res = await api.post('/import/xml-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const parsed = res.data?.dados;
      if (parsed) {
        let matchedClienteId = '';
        if (parsed.cliente_cnpj && clientes.length > 0) {
          const cleanCnpj = String(parsed.cliente_cnpj).replace(/\D/g, '');
          const found = clientes.find(c => String(c.cnpj_cpf || '').replace(/\D/g, '') === cleanCnpj);
          if (found) matchedClienteId = found.id;
        }

        const origCid = parsed.origem_cidade || '';
        const origUf = parsed.origem_uf || 'PR';
        const destCid = parsed.destino_cidade || '';
        const destUf = parsed.destino_uf || 'SP';

        // Detectar tipo de carga
        const prodDesc = String(parsed.tipo_carga || '').toLowerCase();
        let tipoAnttDetectado = 'granel_liquido';
        if (prodDesc.includes('soja') || prodDesc.includes('milho') || prodDesc.includes('grao') || prodDesc.includes('grão') || prodDesc.includes('farelo')) {
          tipoAnttDetectado = 'granel_solido';
        } else if (prodDesc.includes('frigo') || prodDesc.includes('carne') || prodDesc.includes('refrigerad')) {
          tipoAnttDetectado = 'frigorificada';
        }

        const pesoFormatado = parsed.peso_kg || 42710;

        setFormData(prev => ({
          ...prev,
          origem_cidade: origCid,
          origem_uf: origUf,
          destino_cidade: destCid,
          destino_uf: destUf,
          cliente_id: matchedClienteId || prev.cliente_id,
          cliente_nome: parsed.cliente_nome || parsed.remetente_nome || prev.cliente_nome,
          cliente_cnpj: parsed.cliente_cnpj || parsed.remetente_cnpj || prev.cliente_cnpj,
          tipo_carga_antt: tipoAnttDetectado,
          tipo_carga: parsed.tipo_carga || 'Óleo Vegetal a Granel',
          peso_kg: pesoFormatado,
          valor_mercadoria: parsed.valor_mercadoria || prev.valor_mercadoria,
          nfe_referencia: parsed.chave_nfe || parsed.nfe_referencia || prev.nfe_referencia,
          nfe_chave: parsed.chave_nfe || parsed.nfe_chave || prev.nfe_chave || '',
          placa_veiculo: parsed.placa_veiculo || prev.placa_veiculo,
          placa_carreta: parsed.placa_carreta || prev.placa_carreta
        }));

        // Consulta automática da distância rodoviária e atualização do Piso ANTT
        await buscarDistanciaAutomatica(origCid, origUf, destCid, destUf);

        setNfeImportadaSuccess(`✅ NF-e Nº ${parsed.numero_nfe || 'Importada'} vinculada! Rota: ${origCid}/${origUf} ➔ ${destCid}/${destUf} • ${(Number(pesoFormatado)/1000).toFixed(2)} ton líquidas • ${parsed.tipo_carga || 'Granel Líquido'}`);
      }
    } catch (err) {
      setErroValidacao(err.response?.data?.error || 'Erro ao processar o arquivo XML da NF-e.');
    } finally {
      setIsImportingNfe(false);
      if (nfeFileInputRef.current) nfeFileInputRef.current.value = '';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS FINANCEIROS POR MODALIDADE (SUBCONTRATAÇÃO VS AGENCIAMENTO)
  // ═══════════════════════════════════════════════════════════════════════
  const isAgenciamento = formData.tipo_operacao === 'agenciamento_repasse';
  
  // 1. Valor Total do CT-e (vai no XML SEFAZ, piso ANTT ou maior)
  const valorFreteCte = Number(formData.valor_frete_venda || 0);

  // Cálculos no modo AGENCIAMENTO & REPASSE COM COMISSÃO:
  const valorFreteReal = Number(formData.valor_frete_real || 0);
  const percentualComissao = Number(formData.percentual_comissao !== undefined && formData.percentual_comissao !== '' ? formData.percentual_comissao : 5);
  const valorComissaoAgenciamento = Number((valorFreteReal * (percentualComissao / 100)).toFixed(2));
  // Fórmula Oficial Solicitada: Repasse = Valor total do CT-e - Valor real do frete - Comissão
  const valorRepasseAgenciamento = Number(Math.max(0, valorFreteCte - valorFreteReal - valorComissaoAgenciamento).toFixed(2));

  // Cálculos no modo SUBCONTRATAÇÃO TRADICIONAL (mantido intacto):
  const valorCliente = Number(formData.valor_cliente || valorFreteCte);
  const valorMotorista = Number(formData.valor_motorista || 0);
  const seuLucroSubcontratacao = Number((valorCliente - valorMotorista).toFixed(2));
  const valorRepasseSubcontratacao = Number((valorFreteCte - valorCliente).toFixed(2));

  const isAbaixoDoPiso = pisoAnttCalculado > 0 && valorFreteCte > 0 && valorFreteCte < pisoAnttCalculado;

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Digitação livre do valor do frete (NÃO abre modal durante a digitação)
  const handleValorFreteChange = (novoValor) => {
    setFormData(prev => ({ ...prev, valor_frete_venda: novoValor }));
  };

  // Validação disparada apenas ao sair do campo (Tab / Clique fora)
  const handleValorFreteBlur = () => {
    const valNum = Number(formData.valor_frete_venda || 0);
    if (pisoAnttCalculado > 0 && valNum > 0 && valNum < pisoAnttCalculado && !riscoAssumidoUsuario) {
      setIsAlertaPisoModalOpen(true);
    }
  };

  // Transmissão Síncrona do CT-e
  const handleEmitirCte = async (e) => {
    e.preventDefault();
    setErroValidacao('');

    // Validação de Trava da ANTT ao submeter
    if (pisoAnttCalculado > 0 && Number(formData.valor_frete_venda || 0) < pisoAnttCalculado && !riscoAssumidoUsuario) {
      setIsAlertaPisoModalOpen(true);
      return;
    }

    if (!formData.placa_veiculo || !formData.motorista_nome || !formData.cliente_nome) {
      setErroValidacao('Preencha os dados do veículo, motorista e tomador.');
      return;
    }

    setIsEmitindo(true);

    try {
      // Montagem do payload conforme a modalidade escolhida
      const payloadFrete = isAgenciamento ? {
        ...formData,
        origem_registro: 'emissao_propria',
        tipo_operacao: 'agenciamento_repasse',
        valor_frete_venda: valorFreteCte,
        valor_frete_real: valorFreteReal,
        percentual_comissao: percentualComissao,
        valor_comissao: valorComissaoAgenciamento,
        valor_repasse: valorRepasseAgenciamento,
        valor_frete_compra: valorFreteReal,
        piso_minimo_antt: pisoAnttCalculado,
        status_frete: 'em_transito'
      } : {
        ...formData,
        origem_registro: 'emissao_propria',
        tipo_operacao: 'subcontratacao_tradicional',
        valor_frete_venda: valorFreteCte,
        valor_frete_compra: valorMotorista,
        valor_frete_real: valorCliente,
        valor_repasse: valorRepasseSubcontratacao >= 0 ? valorRepasseSubcontratacao : 0,
        valor_comissao: seuLucroSubcontratacao,
        piso_minimo_antt: pisoAnttCalculado,
        status_frete: 'em_transito'
      };

      // 1. Criar o Frete no banco de dados
      const resFrete = await api.post('/fretes', payloadFrete);
      const novoFrete = resFrete.data?.frete || resFrete.data;
      const freteId = novoFrete?.id;

      // 2. Transmitir e Emitir síncrono na SEFAZ
      const resEmissao = await api.post(`/fiscal/emitir/${freteId}`);

      alert(`🎉 CT-e Nº ${resEmissao.data.numeroCte || novoFrete.numero_cte || freteId} AUTORIZADO COM SUCESSO NA SEFAZ!\nProtocolo: ${resEmissao.data.protocolo}`);

      if (onSuccess) onSuccess();
      handleCloseModal();

      // 3. Abrir DACTE se callback fornecido
      if (onOpenDacte) {
        const dacteRes = await api.get(`/fiscal/dacte/${freteId}`);
        onOpenDacte(dacteRes.data);
      }
    } catch (err) {
      console.error('Erro na emissão do CT-e:', err);
      setErroValidacao(err.response?.data?.error || 'Erro ao autorizar CT-e na SEFAZ.');
    } finally {
      setIsEmitindo(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto overflow-x-hidden animate-fadeIn"
    >
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-blue-500/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Compacto & Limpo */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-850 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
              isAgenciamento ? 'bg-purple-600/20 border-purple-500/40 text-purple-400' : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
            }`}>
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Emissão de CT-e 4.00</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isAgenciamento 
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isAgenciamento ? '📊 Agenciamento & Repasse' : '🚚 Subcontratação Tradicional'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  SEFAZ Oficial
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Importe o XML da NF-e para cálculo automático de rota, peso e piso ANTT
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleCloseModal} 
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar e limpar formulário"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerta de Validação se houver */}
        {erroValidacao && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-shake flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{erroValidacao}</span>
          </div>
        )}

        {/* Formulário Principal em Etapas Inteligentes */}
        <form onSubmit={handleEmitirCte} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 text-xs">
          
          {/* ETAPA 1: VEÍCULO & MOTORISTA (AUTOCOMPLETE INTELIGENTE) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Truck className="h-4 w-4" />
                <span>1. Veículo & Motorista</span>
              </span>
              <span className="text-slate-400 text-[10px]">Selecione da frota ou digite a placa</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              
              {/* Seletor Rápido de Caminhão/Motorista */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-slate-300 font-semibold mb-1">Selecionar da Frota Cadastrada</label>
                <select
                  value={formData.motorista_id}
                  onChange={(e) => handleSelectMotorista(e.target.value)}
                  className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-white font-medium focus:border-blue-400 focus:outline-none"
                >
                  <option value="">-- Selecione o Veículo / Motorista para Auto-Preencher --</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>
                      🚛 Placa: {m.placa_cavalo || 'S/N'} • {m.nome} • {m.tipo_veiculo || 'Carreta LS'} ({m.numero_eixos || 6} Eixos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Placa Cavalo */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Placa Cavalo (Tração)*</label>
                <input
                  type="text"
                  required
                  value={formData.placa_veiculo}
                  onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
                  placeholder="ABC1D23"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Placa Carreta */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Placa Carreta (Reboque)</label>
                <input
                  type="text"
                  value={formData.placa_carreta}
                  onChange={(e) => setFormData({ ...formData, placa_carreta: e.target.value.toUpperCase() })}
                  placeholder="XYZ9E87"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Número de Eixos (Base da Tabela ANTT) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Rodado / Eixos (ANTT)*</label>
                <select
                  value={formData.numero_eixos}
                  onChange={(e) => setFormData({ ...formData, numero_eixos: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-bold focus:border-blue-500 focus:outline-none"
                >
                  <option value={2}>2 Eixos (Toco)</option>
                  <option value={3}>3 Eixos (Truck)</option>
                  <option value={4}>4 Eixos (Bitruck)</option>
                  <option value={5}>5 Eixos (Carreta 2 Eixos)</option>
                  <option value={6}>6 Eixos (Carreta LS 3 Eixos)</option>
                  <option value={7}>7 Eixos (Bitrem)</option>
                  <option value={9}>9 Eixos (Rodotrem)</option>
                </select>
              </div>

              {/* Nome do Motorista */}
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Nome do Motorista*</label>
                <input
                  type="text"
                  required
                  value={formData.motorista_nome}
                  onChange={(e) => setFormData({ ...formData, motorista_nome: e.target.value })}
                  placeholder="Nome completo do condutor"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* CPF do Motorista */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">CPF do Motorista</label>
                <input
                  type="text"
                  value={formData.motorista_cpf}
                  onChange={(e) => setFormData({ ...formData, motorista_cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

            </div>
          </div>

          {/* ETAPA 2: ROTA, TOMADOR & IMPORTAÇÃO DE XML DA NF-E */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>2. Rota, Tomador & Nota Fiscal (NF-e)</span>
              </span>

              {/* BOTÃO EM DESTAQUE PARA IMPORTAR XML DA NF-E */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xml,text/xml"
                  ref={nfeFileInputRef}
                  onChange={handleImportNfeFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => nfeFileInputRef.current?.click()}
                  disabled={isImportingNfe}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                  title="Importe o XML da NF-e para preencher origem, destino, tomador, peso líquido e rota automaticamente"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isImportingNfe ? 'Lendo NF-e XML...' : '📄 Importar XML da NF-e (Auto-Preencher)'}</span>
                </button>
              </div>
            </div>

            {/* Aviso de Sucesso da Importação da NF-e */}
            {nfeImportadaSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{nfeImportadaSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* Origem */}
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Origem (Carregamento / Remetente)*</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.origem_cidade}
                    onChange={(e) => setFormData({ ...formData, origem_cidade: e.target.value })}
                    placeholder="Cidade"
                    className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.origem_uf}
                    onChange={(e) => setFormData({ ...formData, origem_uf: e.target.value.toUpperCase() })}
                    placeholder="UF"
                    className="w-14 min-w-[3.5rem] bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Destino */}
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Destino (Descarregamento / Destinatário)*</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.destino_cidade}
                    onChange={(e) => setFormData({ ...formData, destino_cidade: e.target.value })}
                    placeholder="Cidade"
                    className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.destino_uf}
                    onChange={(e) => setFormData({ ...formData, destino_uf: e.target.value.toUpperCase() })}
                    placeholder="UF"
                    className="w-14 min-w-[3.5rem] bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-white font-mono text-center uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Distância KM com botão de recálculo via rota */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">Distância (KM)*</label>
                  <button
                    type="button"
                    onClick={() => buscarDistanciaAutomatica(formData.origem_cidade, formData.origem_uf, formData.destino_cidade, formData.destino_uf)}
                    disabled={isCalculandoDistancia}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold cursor-pointer"
                    title="Recalcular distância rodoviária automática"
                  >
                    <Navigation className={`h-3 w-3 ${isCalculandoDistancia ? 'animate-spin' : ''}`} />
                    <span>{isCalculandoDistancia ? 'Calculando...' : 'Recalcular'}</span>
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.distancia_km}
                  onChange={(e) => setFormData({ ...formData, distancia_km: Number(e.target.value) })}
                  placeholder="Ex: 668"
                  className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-400 focus:outline-none"
                />
              </div>

              {/* Categoria Oficial de Carga ANTT (Padrão: Granel Líquido) */}
              <div className="sm:col-span-3">
                <label className="block text-amber-400 font-bold mb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                  <span>Categoria ANTT (Tabela de Piso Mínimo)*</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tabela B (Veículo Automotor)</span>
                </label>
                <select
                  value={formData.tipo_carga_antt}
                  onChange={(e) => setFormData({ ...formData, tipo_carga_antt: e.target.value })}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-bold focus:border-amber-400 focus:outline-none text-xs"
                >
                  <option value="granel_liquido">🛢️ Granel líquido (Óleo Vegetal / Combustíveis) [PADRÃO]</option>
                  <option value="carga_geral">📦 Carga Geral</option>
                  <option value="granel_solido">🌾 Granel sólido (Soja / Milho / Farelo)</option>
                  <option value="frigorificada">❄️ Frigorificada ou Aquecida</option>
                  <option value="conteinerizada">🚢 Conteinerizada</option>
                  <option value="neogranel">🪵 Neogranel</option>
                  <option value="perigosa_liquido">☣️ Perigosa (granel líquido)</option>
                  <option value="perigosa_geral">⚠️ Perigosa (carga geral)</option>
                </select>
              </div>

              {/* Tomador / Cliente */}
              <div className="sm:col-span-3">
                <label className="block text-slate-300 font-semibold mb-1">Tomador / Embarcador (Cliente que paga o Frete)*</label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleSelectCliente(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none mb-1.5"
                >
                  <option value="">-- Selecione da lista ou preencha pelo XML / digitando abaixo --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.razao_social || c.nome_fantasia} ({c.cnpj_cpf})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  placeholder="Razão Social / Nome do Tomador do Frete"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:border-blue-500 focus:outline-none text-[11px]"
                />
              </div>

              {/* Peso Carga Líquido (Kg) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Peso Líquido (Kg)*</label>
                <input
                  type="number"
                  required
                  value={formData.peso_kg}
                  onChange={(e) => setFormData({ ...formData, peso_kg: Number(e.target.value) })}
                  placeholder="Ex: 42710"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Descrição do Produto da NF-e */}
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Produto Predominante da NF-e</label>
                <input
                  type="text"
                  value={formData.tipo_carga}
                  onChange={(e) => setFormData({ ...formData, tipo_carga: e.target.value })}
                  placeholder="Ex: Óleo de Soja Bruto a Granel"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Chave ou Número da NF-e */}
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Chave / Número NF-e</label>
                <input
                  type="text"
                  value={formData.nfe_referencia}
                  onChange={(e) => setFormData({ ...formData, nfe_referencia: e.target.value })}
                  placeholder="Nº NF-e ou Chave 44 dígitos"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

            </div>
          </div>

          {/* ETAPA 3: VALOR DO FRETE, PISO ANTT & FINANCEIRO POR MODALIDADE */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2">
                <span className={`font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 ${
                  isAgenciamento ? 'text-purple-400' : 'text-amber-400'
                }`}>
                  <DollarSign className="h-4 w-4" />
                  <span>3. Valores, Piso Mínimo ANTT & {isAgenciamento ? 'Comissão / Repasse' : 'Repasse'}</span>
                </span>
              </div>

              {/* MODALIDADE OPERACIONAL: Seletor apenas para Super Admin (Ghost Master), Badge fixa para licenças regulares */}
              {isSuperAdmin ? (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-purple-500/40 shadow-sm">
                  <span className="text-[9px] text-purple-400 font-bold uppercase px-1">👑 Master:</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_operacao: 'subcontratacao_tradicional' })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      !isAgenciamento 
                        ? 'bg-emerald-600 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🚚 Subcontratação
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_operacao: 'agenciamento_repasse' })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      isAgenciamento 
                        ? 'bg-purple-600 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📊 Agenciamento
                  </button>
                </div>
              ) : (
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                  isAgenciamento
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isAgenciamento ? '📊 Modalidade: Agenciamento & Repasse' : '🚚 Modalidade: Subcontratação Tradicional'}
                </span>
              )}
            </div>

            {/* CARD DE VALIDAÇÃO ANTT EM DESTAQUE */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition ${
              isAbaixoDoPiso 
                ? 'bg-rose-500/15 border-rose-500/50 text-rose-200' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-xs flex items-center gap-1.5 uppercase">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Piso Mínimo Obrigatório ANTT:</span>
                    <strong className="text-base font-mono font-black text-white">{formatMoney(pisoAnttCalculado)}</strong>
                  </span>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tabela B (Veículo Automotor) • {TABELA_ANTT_OFICIAL[formData.tipo_carga_antt]?.nome || 'Granel líquido'} • {formData.numero_eixos} Eixos • {formData.distancia_km || 0} KM
                  </p>
                </div>

                {isAbaixoDoPiso ? (
                  <button
                    type="button"
                    onClick={() => setIsAlertaPisoModalOpen(true)}
                    className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase shadow flex items-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>⚠️ Valor Abaixo do Piso ANTT</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ Em Conformidade com ANTT
                  </span>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* CASO 1: MODALIDADE AGENCIAMENTO & REPASSE COM COMISSÃO               */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {isAgenciamento ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* 1. Valor Total CT-e = Piso ANTT ou maior (vai no XML/SEFAZ) */}
                  <div>
                    <label className="block text-emerald-400 font-bold mb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                      <span>🧾 Valor Total CT-e (R$)*</span>
                      <span className="text-[9px] text-emerald-400 font-mono">Piso ANTT / SEFAZ</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.valor_frete_venda}
                      onChange={(e) => handleValorFreteChange(e.target.value)}
                      onBlur={handleValorFreteBlur}
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-emerald-400 font-mono text-base font-black focus:outline-none ${
                        isAbaixoDoPiso ? 'border-rose-500 text-rose-400' : 'border-emerald-500/50 focus:border-emerald-400'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {isAbaixoDoPiso ? '⚠️ Inferior ao piso regulatório!' : 'Valor oficial que constará no XML da SEFAZ'}
                    </span>
                  </div>

                  {/* 2. Valor Real do Frete: Valor gerencial (não vai no CT-e) */}
                  <div>
                    <label className="block text-sky-400 font-bold mb-1 text-[11px] uppercase tracking-wide">
                      🏷️ Valor Real do Frete (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_frete_real}
                      onChange={(e) => setFormData({ ...formData, valor_frete_real: e.target.value })}
                      placeholder="Ex: 4000,00"
                      className="w-full bg-slate-900 border border-sky-500/40 rounded-xl px-3 py-2 text-sky-300 font-mono text-base font-bold focus:border-sky-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Valor real negociado (NÃO vai aparecer no CT-e)
                    </span>
                  </div>

                  {/* 3. Comissão (Gerencial): Percentual incidente sobre Valor Real do Frete */}
                  <div>
                    <label className="block text-purple-400 font-bold mb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                      <span>📊 Comissão Gerencial (%)</span>
                      <span className="text-[9px] text-purple-400 font-mono font-bold">
                        {formatMoney(valorComissaoAgenciamento)}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.percentual_comissao}
                        onChange={(e) => setFormData({ ...formData, percentual_comissao: Number(e.target.value) })}
                        placeholder="Ex: 5"
                        className="w-full bg-slate-900 border border-purple-500/40 rounded-xl pl-3 pr-8 py-2 text-purple-300 font-mono text-base font-bold focus:border-purple-400 focus:outline-none"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400 pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Percentual incidente sobre o Valor Real do Frete
                    </span>
                  </div>

                </div>

                {/* ─── PAINEL DE 4 CARDS GERENCIAIS (AGENCIAMENTO & REPASSE) ─── */}
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-2.5">
                  <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5" />
                    Memória de Cálculo de Agenciamento & Repasse (Controle Gerencial)
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    
                    {/* Card 1 = Valor total do CTE */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">🧾 Card 1: Total CT-e</span>
                      <strong className="text-sm sm:text-base font-black font-mono text-emerald-400 block mt-0.5">
                        {formatMoney(valorFreteCte)}
                      </strong>
                      <span className="text-[9px] text-slate-500">Piso ANTT / XML</span>
                    </div>

                    {/* Card 2 = Valor real do frete */}
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">🏷️ Card 2: Frete Real</span>
                      <strong className="text-sm sm:text-base font-black font-mono text-sky-400 block mt-0.5">
                        {formatMoney(valorFreteReal)}
                      </strong>
                      <span className="text-[9px] text-slate-500">Valor gerencial</span>
                    </div>

                    {/* Card 3 = Valor da comissão em R$ */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">💰 Card 3: Comissão</span>
                      <strong className="text-sm sm:text-base font-black font-mono text-amber-400 block mt-0.5">
                        {formatMoney(valorComissaoAgenciamento)}
                      </strong>
                      <span className="text-[9px] text-slate-500">{percentualComissao}% s/ frete real</span>
                    </div>

                    {/* Card 4 = Repasse (Valor total CT-e - Valor real frete - Comissão) */}
                    <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/40">
                      <span className="text-[10px] uppercase font-bold text-purple-300 block">📤 Card 4: Repasse</span>
                      <strong className="text-sm sm:text-base font-black font-mono text-purple-300 block mt-0.5">
                        {formatMoney(valorRepasseAgenciamento)}
                      </strong>
                      <span className="text-[9px] text-purple-400">Total − Real − Comissão</span>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              /* ═══════════════════════════════════════════════════════════════════════ */
              /* CASO 2: MODALIDADE SUBCONTRATAÇÃO TRADICIONAL (MANTIDO INTACTO)       */
              /* ═══════════════════════════════════════════════════════════════════════ */
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* 1. Valor Total CT-e (vai no XML, auto-preenchido com piso) */}
                  <div>
                    <label className="block text-emerald-400 font-bold mb-1 text-[11px] uppercase tracking-wide flex items-center justify-between">
                      <span>🧾 Valor CT-e / ANTT (R$)*</span>
                      <span className="text-[9px] text-emerald-400 font-mono">Auto-Piso</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.valor_frete_venda}
                      onChange={(e) => handleValorFreteChange(e.target.value)}
                      onBlur={handleValorFreteBlur}
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-emerald-400 font-mono text-base font-black focus:outline-none ${
                        isAbaixoDoPiso ? 'border-rose-500 text-rose-400' : 'border-emerald-500/50 focus:border-emerald-400'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {isAbaixoDoPiso ? '⚠️ Inferior ao piso regulatório!' : 'Valor oficial que constará no XML da SEFAZ'}
                    </span>
                  </div>

                  {/* 2. A Receber do Cliente */}
                  <div>
                    <label className="block text-blue-400 font-bold mb-1 text-[11px] uppercase tracking-wide">
                      💳 A Receber do Cliente (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_cliente}
                      onChange={(e) => setFormData({ ...formData, valor_cliente: Number(e.target.value) })}
                      placeholder={String(valorFreteCte || '')}
                      className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-blue-300 font-mono text-base font-bold focus:border-blue-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">O que o cliente efetivamente te paga</span>
                  </div>

                  {/* 3. A Pagar ao Motorista */}
                  <div>
                    <label className="block text-amber-400 font-bold mb-1 text-[11px] uppercase tracking-wide">
                      🚛 A Pagar ao Motorista (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_motorista}
                      onChange={(e) => setFormData({ ...formData, valor_motorista: Number(e.target.value) })}
                      placeholder="0,00"
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono text-base font-bold focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Custo do frete contratado com motorista</span>
                  </div>

                </div>

                {/* ─── Painel de Resumo Gerencial (somente leitura, não vai no CT-e) ─── */}
                {(valorMotorista > 0 || valorCliente > 0) && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" />
                      Resumo Gerencial — Controle Interno (não aparece no CT-e)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

                      {/* Seu Lucro */}
                      <div className={`p-2.5 rounded-xl border ${
                        seuLucroSubcontratacao >= 0
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">💰 Seu Lucro</span>
                        <strong className={`text-sm font-black font-mono block ${
                          seuLucroSubcontratacao >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {formatMoney(seuLucroSubcontratacao)}
                        </strong>
                        <span className="text-[9px] text-slate-500">Receber − Motorista</span>
                      </div>

                      {/* A Pagar Motorista */}
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">🚛 Pagar Motorista</span>
                        <strong className="text-sm font-black font-mono text-amber-400 block">
                          {formatMoney(valorMotorista)}
                        </strong>
                        <span className="text-[9px] text-slate-500">Custo operacional</span>
                      </div>

                      {/* Valor CT-e */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">🧾 Valor CT-e</span>
                        <strong className="text-sm font-black font-mono text-emerald-400 block">
                          {formatMoney(valorFreteCte)}
                        </strong>
                        <span className="text-[9px] text-slate-500">Piso ANTT / XML</span>
                      </div>

                      {/* Repasse */}
                      <div className={`p-2.5 rounded-xl border ${
                        valorRepasseSubcontratacao > 0
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-slate-800 border-slate-700'
                      }`}>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">📤 Repasse</span>
                        <strong className={`text-sm font-black font-mono block ${
                          valorRepasseSubcontratacao > 0 ? 'text-purple-400' : 'text-slate-500'
                        }`}>
                          {formatMoney(Math.max(0, valorRepasseSubcontratacao))}
                        </strong>
                        <span className="text-[9px] text-slate-500">CT-e − Receber cliente</span>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ESPAÇO PARA O FORMULÁRIO RESPONSIVO */}
          <div className="h-2" />

        </form>

        {/* FOOTER FIXO: BOTÃO DE EMISSÃO E CANCELAMENTO (SEM SCROLL HORIZONTAL) */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            Ao emitir, o CT-e 4.00 é assinado, transmitido à SEFAZ e gera o DACTE.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleEmitirCte}
              disabled={isEmitindo}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isEmitindo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Transmitindo para SEFAZ...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>🚀 Emitir CT-e 4.00 na SEFAZ</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ─── MODAL VERMELHO DE ALERTA DE INFRAÇÃO REGULATÓRIA ANTT (PISO MÍNIMO) ─── */}
      {isAlertaPisoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-950 border-2 border-rose-600 rounded-3xl shadow-2xl shadow-rose-950/60 overflow-hidden text-slate-100 flex flex-col space-y-4">
            
            {/* Header Vermelho de Alerta */}
            <div className="bg-rose-950/80 border-b border-rose-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/40">
                  <AlertTriangle className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-white tracking-wide uppercase">
                    Alerta de Infração ANTT
                  </h3>
                  <p className="text-[11px] text-rose-300">
                    Valor Informado Inferior ao Piso Mínimo Obrigatório
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertaPisoModalOpen(false)}
                className="p-1 rounded-lg text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Alerta com Penalidades */}
            <div className="px-6 py-2 space-y-4 text-xs">
              
              {/* Comparativo dos Valores */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/40">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-900/50">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">Valor Digitado:</span>
                  <strong className="text-base font-black font-mono text-rose-300">
                    {formatMoney(formData.valor_frete_venda)}
                  </strong>
                  <span className="text-[9px] text-rose-400 block mt-0.5">⚠️ Abaixo do Piso</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-900/50">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Piso Obrigatório ANTT:</span>
                  <strong className="text-base font-black font-mono text-emerald-400">
                    {formatMoney(pisoAnttCalculado)}
                  </strong>
                  <span className="text-[9px] text-emerald-400 block mt-0.5">✓ Exigido por Lei</span>
                </div>
              </div>

              {/* Alerta de Multas e Riscos */}
              <div className="p-4 rounded-2xl bg-rose-900/20 border border-rose-700/50 space-y-2">
                <h4 className="font-bold text-rose-300 uppercase text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  Penalidades Previstas (Lei nº 13.703/2018 & Res. ANTT 5.867/2020):
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Multa de até R$ 10.500,00</strong> aplicada pela ANTT por CT-e emitido abaixo do piso;</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Indenização obrigatória ao transportador no valor de 2x (o dobro)</strong> da diferença não paga;</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Risco de bloqueio do CIOT</strong> e autuação em fiscalizações eletrônicas e de balança.</span>
                  </li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Recomendamos ajustar o <strong>Valor Total do CT-e</strong> para o piso mínimo regulatório ({formatMoney(pisoAnttCalculado)}).
              </p>

            </div>

            {/* Ações do Modal */}
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              
              {/* Botão de Corrigir para o Piso (Ação Recomendada) */}
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, valor_frete_venda: pisoAnttCalculado }));
                  setRiscoAssumidoUsuario(false);
                  setIsAlertaPisoModalOpen(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Ajustar para o Piso Obrigatório ({formatMoney(pisoAnttCalculado)})</span>
              </button>

              {/* Botão de Assumir Risco (Exceção) */}
              <button
                type="button"
                onClick={() => {
                  setRiscoAssumidoUsuario(true);
                  setIsAlertaPisoModalOpen(false);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Assumir Risco e Manter Valor</span>
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
