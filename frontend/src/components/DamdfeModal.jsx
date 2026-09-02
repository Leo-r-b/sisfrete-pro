import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Truck, 
  FileText,
  Building2,
  Calendar,
  Layers,
  Share2
} from 'lucide-react';

export default function DamdfeModal({ isOpen, onClose, damdfeData }) {
  const printRef = useRef(null);

  if (!isOpen || !damdfeData) return null;

  const { mdfe, ctes = [], empresa = {}, configFiscal = {} } = damdfeData;

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handlePrint = () => {
    window.print();
  };

  const chaveFormatada = mdfe.chave_mdfe 
    ? mdfe.chave_mdfe.replace(/(\d{4})/g, '$1 ').trim()
    : '4126 0812 3456 7800 0190 5800 1000 0000 0110 0000 0010';

  const isHomologacao = configFiscal.ambiente === 'homologacao' || !configFiscal.ambiente;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
        
        {/* Barra Superior de Ações */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <FileText className="h-5 w-5" />
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                DAMDFE - Documento Auxiliar do Manifesto Eletrônico de Documentos Fiscais
              </h3>
              <p className="text-[11px] text-slate-400">
                Modelo 58 • Série {mdfe.serie || 1} • Nº {mdfe.numero_mdfe}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir DAMDFE</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ÁREA IMPRESSA / DOCUMENTO OFICIAL DAMDFE */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950/60">
          <div 
            ref={printRef}
            className="bg-white text-black p-5 rounded-xl shadow-2xl border border-slate-300 font-sans text-[11px] leading-tight space-y-3 print:p-0 print:border-none print:shadow-none print:m-0"
          >
            
            {/* Aviso de Homologação se aplicável */}
            {isHomologacao && (
              <div className="text-center font-black text-xs text-red-600 border-2 border-dashed border-red-500 p-1 rounded uppercase tracking-widest bg-red-50">
                MDF-E EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL
              </div>
            )}

            {/* Cabeçalho DAMDFE */}
            <div className="border-2 border-black p-2.5 grid grid-cols-12 gap-2 items-center">
              
              {/* Dados do Emitente */}
              <div className="col-span-7 border-r border-black pr-2 space-y-1">
                <p className="font-black text-sm uppercase">{empresa.razao_social || 'TRANSPORTADORA SISFRETE LTDA'}</p>
                <p className="text-[10px] text-gray-700">{empresa.endereco || 'RUA PRINCIPAL DE CARGAS'}, {empresa.numero || '100'} - {empresa.cidade || 'CURITIBA'}/{empresa.uf || 'PR'}</p>
                <p className="text-[10px] font-mono"><strong>CNPJ:</strong> {empresa.cnpj || '12.345.678/0001-90'} • <strong>IE:</strong> {empresa.ie || 'ISENTO'}</p>
                <p className="text-[10px] font-mono"><strong>RNTRC:</strong> {configFiscal.rntrc_padrao || mdfe.rntrc || '12345678'}</p>
              </div>

              {/* Título DAMDFE e Série */}
              <div className="col-span-5 text-center space-y-1 pl-1">
                <p className="font-black text-xs">DAMDFE</p>
                <p className="text-[9px] uppercase font-bold text-gray-700">Documento Auxiliar do Manifesto Eletrônico de Documentos Fiscais</p>
                <div className="border border-black p-1 text-[10px] grid grid-cols-3 gap-1 font-mono font-bold bg-gray-50">
                  <div>MOD: 58</div>
                  <div>SERIE: {mdfe.serie || 1}</div>
                  <div>Nº: {mdfe.numero_mdfe}</div>
                </div>
              </div>

            </div>

            {/* Código de Barras, Chave de Acesso & QR Code */}
            <div className="border-2 border-black p-2.5 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-7 space-y-1.5">
                <p className="text-[9px] font-bold text-gray-600 uppercase">CHAVE DE ACESSO DO MDF-E</p>
                <p className="font-mono font-black text-xs tracking-wider bg-gray-50 p-1 border border-gray-300 rounded text-center">{chaveFormatada}</p>
                <div className="text-[9px] text-gray-600">
                  <span>Consulta de autenticidade no portal nacional: </span>
                  <strong className="font-mono text-[9px] text-blue-700">dfe-portal.svrs.rs.gov.br/MDFE/Consulta</strong>
                </div>
                <p className="text-[9px] font-mono font-bold text-gray-800">PROTOCOLO DE AUTORIZAÇÃO: {mdfe.protocolo_autorizacao || '941260000017547'}</p>
              </div>

              {/* QR Code Oficial da SEFAZ SVRS */}
              <div className="col-span-5 flex flex-col items-center justify-center border-l border-black pl-3 py-1">
                {mdfe.chave_mdfe ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`https://dfe-portal.svrs.rs.gov.br/mdfe/qrCode?chMDFe=${mdfe.chave_mdfe}&tpAmb=${isHomologacao ? '2' : '1'}`)}`}
                    alt="QR Code MDF-e SEFAZ"
                    className="w-24 h-24 border border-gray-300 p-1 bg-white rounded shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 border border-gray-300 flex items-center justify-center bg-gray-100 text-[9px] text-gray-500 text-center font-mono">
                    QR CODE MDF-E
                  </div>
                )}
                <span className="text-[8px] font-bold text-gray-600 uppercase mt-1">Consulta via Leitor / Smartphone</span>
              </div>
            </div>

            {/* Trajeto & Veículo & Motorista */}
            <div className="border-2 border-black p-2.5 space-y-2">
              <div className="grid grid-cols-4 gap-2 border-b border-gray-300 pb-1.5 text-[10px]">
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">UF CARREGAMENTO</span>
                  <strong className="font-mono text-xs">{mdfe.uf_origem || 'PR'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">UF DESCARREGAMENTO</span>
                  <strong className="font-mono text-xs">{mdfe.uf_destino || 'SP'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">PERCURSO UFS</span>
                  <strong className="font-mono text-xs">{mdfe.ufs_percurso || 'PR, SP'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">EMISSÃO</span>
                  <strong className="font-mono text-xs">{mdfe.data_emissao ? new Date(mdfe.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] pt-0.5">
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">VEÍCULO TRAÇÃO (CAVALO)</span>
                  <strong className="font-mono">{mdfe.placa_veiculo || 'ABC1D23'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">REBOQUE (CARRETA)</span>
                  <strong className="font-mono">{mdfe.placa_carreta || 'XYZ9E87'}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block text-[9px]">CONDUTOR / MOTORISTA</span>
                  <strong className="truncate block">{mdfe.motorista_nome || 'CARLOS EDUARDO SILVA'}</strong>
                </div>
              </div>
            </div>

            {/* Dados do Seguro da Carga */}
            <div className="border border-black p-2 text-[10px] grid grid-cols-3 gap-2 bg-gray-50">
              <div>
                <span className="text-gray-500 font-bold block text-[9px]">RESPONSÁVEL PELO SEGURO</span>
                <strong>1 - EMITENTE DO MDF-E</strong>
              </div>
              <div>
                <span className="text-gray-500 font-bold block text-[9px]">SEGURADORA & APÓLICE</span>
                <strong>{mdfe.seguradora_nome || 'PORTO SEGURO'} (Nº {mdfe.numero_apolice || '075482390001'})</strong>
              </div>
              <div>
                <span className="text-gray-500 font-bold block text-[9px]">NÚMERO DE AVERBAÇÃO</span>
                <strong className="font-mono text-emerald-700">{mdfe.numero_averbacao || '984321098234'}</strong>
              </div>
            </div>

            {/* Relação de CT-es / Documentos Vinculados */}
            <div className="border border-black p-2 space-y-1">
              <p className="font-bold text-[10px] uppercase border-b border-gray-300 pb-1">DOCUMENTOS FISCAIS VINCULADOS (CT-E / NF-E)</p>
              
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600 font-bold">
                    <th className="py-1">Documento</th>
                    <th className="py-1">Chave de Acesso</th>
                    <th className="py-1">Destino</th>
                    <th className="py-1 text-right">Peso (Kg)</th>
                    <th className="py-1 text-right">Valor Frete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ctes.length > 0 ? (
                    ctes.map((c, i) => (
                      <tr key={i}>
                        <td className="py-1 font-bold">CT-e {c.numero_cte || i + 1}</td>
                        <td className="py-1 font-mono text-[9px]">{c.chave_cte || chaveFormatada}</td>
                        <td className="py-1">{c.municipio_descarregamento || 'DESTINO'}/{c.uf_descarregamento || 'PR'}</td>
                        <td className="py-1 text-right font-mono">{Number(c.peso_kg || 0).toFixed(2)}</td>
                        <td className="py-1 text-right font-mono font-bold">{formatMoney(c.valor_frete)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-2 text-center text-gray-500">1 CT-e Vinculado Principal</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais do Manifesto */}
            <div className="border-2 border-black p-2 grid grid-cols-3 gap-2 text-center bg-gray-100 font-mono font-bold">
              <div>
                <span className="text-[9px] text-gray-600 block">QTD DOCUMENTOS</span>
                <span className="text-xs">{ctes.length || 1} CT-es</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-600 block">VALOR TOTAL DA CARGA</span>
                <span className="text-xs text-emerald-700">{formatMoney(mdfe.valor_total_carga)}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-600 block">PESO BRUTO TOTAL</span>
                <span className="text-xs">{Number(mdfe.peso_total_kg || 0).toLocaleString('pt-BR')} Kg</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
