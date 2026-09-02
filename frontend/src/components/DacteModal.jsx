import React, { useRef } from 'react';
import { 
  Printer, 
  Download, 
  Share2, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Truck,
  FileText,
  Building2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';

export default function DacteModal({ isOpen, onClose, dacteData }) {
  const printRef = useRef(null);

  if (!isOpen || !dacteData) return null;

  const {
    frete = {},
    empresa = {},
    cliente = {},
    motorista = {},
    fiscalConfig = {},
    isHomologacao = true,
    chave_cte_44 = '',
    protocolo = '',
    data_emissao = ''
  } = dacteData;

  const formatChave = (chave) => {
    if (!chave) return '';
    const clean = chave.replace(/\D/g, '');
    return clean.replace(/(\d{4})/g, '$1 ').trim();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadXml = async () => {
    try {
      const res = await api.get(`/fiscal/xml/${frete.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CTe_${chave_cte_44 || frete.numero_cte || frete.id}.xml`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao baixar XML do CT-e: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleShareWhatsApp = () => {
    const texto = `🚚 *DACTE CT-e Nº ${frete.numero_cte || '000000'} AUTORIZADO SEFAZ*\n` +
      `🔑 *Chave de Acesso:* ${chave_cte_44}\n` +
      `🏢 *Emitente:* ${empresa.razao_social || 'SISFRETE'}\n` +
      `📍 *Rota:* ${frete.origem_cidade}/${frete.origem_uf} ➔ ${frete.destino_cidade}/${frete.destino_uf}\n` +
      `💰 *Valor do Frete:* R$ ${Number(frete.valor_frete_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `📋 *Protocolo SEFAZ:* ${protocolo}\n` +
      `\n_Documento fiscal emitido via SisFrete Pro_`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:static print:p-0 print:bg-white print:overflow-visible">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:bg-white print:rounded-none">
        
        {/* Modal Toolbar (Não sai na impressão) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-none">
                DACTE - Documento Auxiliar do CT-e
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                CT-e Modelo 57 • Série {frete.serie_cte || '1'} • Nº {frete.numero_cte || '000001'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir DACTE</span>
            </button>
            <button
              onClick={handleDownloadXml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar XML</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
              title="Compartilhar no WhatsApp"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* DACTE Layout Impresso / Visualizável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
          
          <div ref={printRef} className="bg-white text-black p-6 rounded-xl border border-slate-300 shadow-md font-sans text-xs select-text">
            
            {/* Banner de Cancelamento se aplicável */}
            {frete.status_sefaz === 'cancelado' && (
              <div className="mb-4 bg-rose-100 border-2 border-dashed border-rose-600 text-rose-900 font-extrabold text-center py-2 px-3 rounded text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                <span>🚫 CT-E CANCELADO NA SEFAZ • PROTOCOLO DE CANCELAMENTO: {frete.protocolo_cancelamento || protocolo}</span>
              </div>
            )}

            {/* Banner de Homologação se aplicável */}
            {isHomologacao && (
              <div className="mb-4 bg-amber-100 border-2 border-dashed border-amber-500 text-amber-900 font-extrabold text-center py-2 px-3 rounded text-xs uppercase tracking-wider">
                ⚠️ CT-E EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL (TESTES SEFAZ)
              </div>
            )}

            {/* Cabeçalho Superior do DACTE */}
            <div className="grid grid-cols-12 border-2 border-black divide-x-2 divide-black mb-3">
              {/* Emitente */}
              <div className="col-span-5 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-6 w-6 text-black" />
                    <span className="font-black text-sm uppercase tracking-tight">
                      {empresa.razao_social || 'SISFRETE TRANSPORTES LTDA'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-700">CNPJ: {empresa.cnpj || '12.345.678/0001-90'} • IE: {empresa.ie || 'ISENTO'}</p>
                  <p className="text-[10px] text-gray-700">{empresa.cidade || 'Curitiba'} - {empresa.uf || 'PR'}</p>
                  <p className="text-[10px] text-gray-700">Fone: {empresa.telefone || '(41) 3333-4444'}</p>
                </div>
                <div className="mt-2 pt-1 border-t border-gray-300 text-[9px] font-bold">
                  MODAL: RODOVIÁRIO • TIPO: NORMAL
                </div>
              </div>

              {/* Título DACTE */}
              <div className="col-span-3 p-3 flex flex-col items-center justify-center text-center">
                <span className="font-black text-lg tracking-wider">DACTE</span>
                <span className="text-[9px] font-semibold leading-tight">Documento Auxiliar do Conhecimento de Transporte Eletrônico</span>
                <div className="mt-2 text-left w-full border-t border-gray-300 pt-1">
                  <p className="text-[9px]"><strong>MOD:</strong> 57 • <strong>SÉRIE:</strong> {frete.serie_cte || '1'}</p>
                  <p className="text-[9px]"><strong>NÚMERO:</strong> {frete.numero_cte || '000001'}</p>
                </div>
              </div>

              {/* Chave de Acesso e Código de Barras */}
              <div className="col-span-4 p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase block text-gray-600">Chave de Acesso:</span>
                  <div className="font-mono text-[10px] font-bold text-center tracking-wider bg-gray-100 p-1.5 border border-gray-300 rounded mb-1.5">
                    {formatChave(chave_cte_44)}
                  </div>
                  {/* Simulação Visual do Código de Barras Code 128C */}
                  <div className="h-8 bg-gradient-to-r from-black via-gray-800 to-black rounded flex items-center justify-center text-white text-[8px] tracking-widest font-mono">
                    ||| | |||| | ||| || ||| | |||| ||| || ||||
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-gray-600">
                  Consulta em: <span className="underline">www.cte.fazenda.gov.br</span>
                </div>
              </div>
            </div>

            {/* Protocolo de Autorização */}
            <div className="border border-black p-2 bg-gray-50 flex items-center justify-between mb-3 text-[10px]">
              <div>
                <span className="font-bold">PROTOCOLO DE AUTORIZAÇÃO DE USO: </span>
                <span className="font-mono">{protocolo || '141260000000000'}</span>
              </div>
              <div>
                <span className="font-bold">DATA/HORA AUTORIZAÇÃO: </span>
                <span>{data_emissao ? new Date(data_emissao).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</span>
              </div>
            </div>

            {/* Rota da Prestação */}
            <div className="border border-black p-2 mb-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-600 block uppercase">Início da Prestação (Origem):</span>
                  <p className="font-bold text-xs uppercase">{frete.origem_cidade} - {frete.origem_uf}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-600 block uppercase">Término da Prestação (Destino):</span>
                  <p className="font-bold text-xs uppercase">{frete.destino_cidade} - {frete.destino_uf}</p>
                </div>
              </div>
            </div>

            {/* Tomador do Serviço */}
            <div className="border border-black p-2 mb-3">
              <span className="text-[9px] font-bold text-gray-600 block uppercase mb-1">Tomador do Serviço (Pagador do Frete):</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <p className="font-bold text-xs uppercase">{frete.cliente_nome}</p>
                  <p className="text-[10px] text-gray-700">CNPJ: {cliente.cnpj_cpf || '00.000.000/0001-00'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-700">{frete.origem_cidade} - {frete.origem_uf}</p>
                  <p className="text-[10px] text-gray-700">IE: {cliente.ie || 'ISENTO'}</p>
                </div>
              </div>
            </div>

            {/* Valores do Frete & Impostos */}
            <div className="border border-black mb-3">
              <div className="bg-gray-200 px-2 py-1 font-bold text-[10px] border-b border-black">
                COMPONENTES DA PRESTAÇÃO & IMPOSTOS
              </div>
              <div className="grid grid-cols-4 divide-x divide-black p-2 text-center text-[10px]">
                <div>
                  <span className="text-[9px] text-gray-600 block">VALOR TOTAL DO FRETE</span>
                  <span className="font-bold text-xs">
                    R$ {Number(frete.valor_frete_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">BASE DE CÁLCULO ICMS</span>
                  <span className="font-semibold">
                    R$ {Number(frete.valor_frete_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">ALÍQUOTA ICMS</span>
                  <span className="font-semibold">{fiscalConfig.aliquota_icms_padrao || 12.0}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">VALOR ICMS</span>
                  <span className="font-bold">
                    R$ {((Number(frete.valor_frete_venda || 0) * (fiscalConfig.aliquota_icms_padrao || 12.0)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Dados da Carga e Documentos Originários */}
            <div className="border border-black mb-3">
              <div className="bg-gray-200 px-2 py-1 font-bold text-[10px] border-b border-black">
                DADOS DA CARGA & NOTAS FISCAIS ELETRÔNICAS (NF-E)
              </div>
              <div className="p-2 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-[9px] text-gray-600 block">PRODUTO PREDOMINANTE:</span>
                  <span className="font-bold uppercase">{frete.tipo_carga || 'CARGA GERAL'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">PESO TOTAL (KG / TON):</span>
                  <span className="font-bold">{frete.peso_kg || 0} kg ({((frete.peso_kg || 0) / 1000).toFixed(2)} ton)</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">VALOR DA MERCADORIA:</span>
                  <span className="font-bold">R$ {Number(frete.valor_mercadoria || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="col-span-3 pt-2 border-t border-gray-200">
                  <span className="text-[9px] text-gray-600 block">DOCUMENTOS VINCULADOS:</span>
                  <span className="font-mono text-[9px]">NF-e: {frete.nfe_referencia || 'NFe 47006'} • Chave: {frete.nfe_chave || '41260812345678000190550010000470061234567890'}</span>
                </div>
              </div>
            </div>

            {/* Dados do Transporte Rodoviário & Motorista */}
            <div className="border border-black mb-3">
              <div className="bg-gray-200 px-2 py-1 font-bold text-[10px] border-b border-black">
                DADOS DO VEÍCULO & MOTORISTA
              </div>
              <div className="p-2 grid grid-cols-4 gap-2 text-[10px]">
                <div>
                  <span className="text-[9px] text-gray-600 block">RNTRC:</span>
                  <span className="font-bold">{fiscalConfig.rntrc_padrao || '12345678'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">PLACA CAVALO:</span>
                  <span className="font-bold uppercase">{frete.placa_veiculo || 'ABC1D23'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">PLACA CARRETA:</span>
                  <span className="font-bold uppercase">{frete.placa_carreta || 'XYZ9E87'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-600 block">MOTORISTA:</span>
                  <span className="font-bold uppercase truncate">{frete.motorista_nome || 'CARLOS SILVA'}</span>
                </div>
              </div>
            </div>

            {/* Canhoto de Recebimento Destacável */}
            <div className="border-2 border-dashed border-gray-400 p-3 mt-4 text-[9px]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold uppercase">DECLARAÇÃO DE RECEBIMENTO DO CT-E Nº {frete.numero_cte || '000001'}</span>
                <span>EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-gray-600 mb-3">
                DECLARO QUE RECEBI OS SERVIÇOS CONSTANTES NESTE CONHECIMENTO DE TRANSPORTE ELETRÔNICO.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-300">
                <div className="border-t border-black pt-1 text-center">DATA DE RECEBIMENTO</div>
                <div className="border-t border-black pt-1 text-center">NOME DO RECEBEDOR E RG</div>
                <div className="border-t border-black pt-1 text-center">ASSINATURA DO RECEBEDOR</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
