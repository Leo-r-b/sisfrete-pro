import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  DollarSign, 
  Scale, 
  Truck, 
  Layers, 
  Building2 
} from 'lucide-react';
import api from '../services/api';

export default function ImportarCteCarregamentoModal({ 
  isOpen, 
  onClose, 
  carregamento, 
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [xmlFile1, setXmlFile1] = useState(null);
  const [xmlFile2, setXmlFile2] = useState(null);
  const [rawXmlText, setRawXmlText] = useState('');
  const [useTextMode, setUseTextMode] = useState(false);

  // Estado para conferência de balança e cálculo automático antes de salvar
  const [previewData, setPreviewData] = useState(null);

  // Resultado do processamento retornado pelo backend
  const [resultado, setResultado] = useState(null);

  if (!isOpen || !carregamento) return null;

  // Parser client-side para conferência imediata de Balança, CT-e e Valor Por Fora
  const parseXmlPreview = (xmlString) => {
    if (!xmlString || typeof xmlString !== 'string') {
      setPreviewData(null);
      return;
    }

    try {
      // 1. Extrair Peso da Balança: busca <qCarga> ou <pesoL>
      let pesoReal = 0;
      const qMatches = [...xmlString.matchAll(/<qCarga>([\d\.]+)<\/qCarga>/gi)];
      if (qMatches.length > 0) {
        const liqMatch = xmlString.match(/<tpMed>[^<]*(?:LIQ|LIQUIDO)[^<]*<\/tpMed>[\s\S]*?<qCarga>([\d\.]+)<\/qCarga>/i) ||
                         xmlString.match(/<qCarga>([\d\.]+)<\/qCarga>[\s\S]*?<tpMed>[^<]*(?:LIQ|LIQUIDO)[^<]*<\/tpMed>/i);
        if (liqMatch) {
          pesoReal = parseFloat(liqMatch[1]);
        } else {
          pesoReal = parseFloat(qMatches[0][1]);
        }
      }

      if (!pesoReal) {
        const pL = xmlString.match(/<pesoL>([\d\.]+)<\/pesoL>/i);
        if (pL) pesoReal = parseFloat(pL[1]);
      }

      // Se unidade for tonelada (ex: 35.51 ton -> 35510 kg)
      if (pesoReal > 0 && pesoReal < 150) {
        const isTon = xmlString.includes('<cUnid>02</cUnid>') || xmlString.toLowerCase().includes('tonelada');
        if (isTon) pesoReal = pesoReal * 1000;
      }

      // 2. Extrair Valor Fiscal do CT-e (<vTPrest> ou <vRec>)
      let valorCte = 0;
      const vMatch = xmlString.match(/<vTPrest>([\d\.]+)<\/vTPrest>/i) || xmlString.match(/<vRec>([\d\.]+)<\/vRec>/i);
      if (vMatch) valorCte = parseFloat(vMatch[1]) || 0;

      // 3. Extrair Número do CT-e (<nCT>)
      let numeroCte = '';
      const nMatch = xmlString.match(/<nCT>(\d+)<\/nCT>/i);
      if (nMatch) numeroCte = String(nMatch[1]).padStart(6, '0');

      // 4. Parâmetros combinados do carregamento
      const pesoAprox = Number(carregamento.peso_estimado_kg) || 0;
      const valorKg = Number(carregamento.valor_combinado_kg) || 0;
      const estimativa = Number(carregamento.valor_frete_estimado) || Number((pesoAprox * valorKg).toFixed(2));
      
      const pesoFinal = pesoReal > 0 ? pesoReal : pesoAprox;
      const valorReal = Number((pesoFinal * valorKg).toFixed(2));
      const valorPorFora = Number(Math.max(0, valorReal - valorCte).toFixed(2));

      setPreviewData({
        pesoAprox,
        pesoReal: pesoFinal,
        valorKg,
        estimativa,
        valorReal,
        valorCte,
        valorPorFora,
        numeroCte
      });
    } catch (err) {
      console.warn('Aviso ao gerar prévia do XML:', err);
    }
  };

  const handleXml1Change = (file) => {
    setXmlFile1(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        parseXmlPreview(ev.target?.result);
      };
      reader.readAsText(file);
    } else {
      setPreviewData(null);
    }
  };

  const handleRawTextChange = (text) => {
    setRawXmlText(text);
    parseXmlPreview(text);
  };

  const handleProcessarXml = async (e) => {
    e.preventDefault();

    if (!xmlFile1 && !rawXmlText.trim()) {
      alert('Por favor, selecione ao menos um arquivo XML de CT-e.');
      return;
    }

    try {
      setLoading(true);

      let res;
      if (useTextMode && rawXmlText.trim()) {
        res = await api.post(`/carregamentos/${carregamento.id}/importar-cte`, {
          xml: rawXmlText.trim()
        });
      } else {
        const formData = new FormData();
        if (xmlFile1) formData.append('xml_1', xmlFile1);
        if (xmlFile2) formData.append('xml_2', xmlFile2);

        res = await api.post(`/carregamentos/${carregamento.id}/importar-cte`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setResultado(res.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao importar CT-e:', err);
      alert(err.response?.data?.error || 'Erro ao importar CT-e.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setResultado(null);
    setXmlFile1(null);
    setXmlFile2(null);
    setRawXmlText('');
    setPreviewData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Importar XML do CT-e
              </h2>
              <p className="text-xs text-slate-400">
                Lançamento automático de peso real, freteiro e financeiro
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5">
          
          {/* Se o resultado do processamento já foi concluído com sucesso */}
          {resultado ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">
                  CT-e Vinculado & Lançado no Financeiro com Sucesso!
                </h3>
                <p className="text-xs text-slate-300">
                  O carregamento foi marcado como <strong>Concluído</strong> e os títulos financeiros foram gerados perfeitamente.
                </p>
              </div>

              {/* Resumo dos Valores, Peso da Balança e Valor Por Fora Calculados */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">CT-e Emitido:</span>
                  <strong className="text-white font-bold">
                    Nº {resultado.carregamento?.numero_cte}
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Peso Aprox. Inicial:</span>
                  <strong className="text-slate-400 font-mono">
                    {resultado.calculos?.peso_estimado_kg?.toLocaleString('pt-BR')} kg
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Peso Real do CT-e (Balança):</span>
                  <strong className="text-amber-400 font-black text-sm font-mono">
                    {resultado.calculos?.peso_real_kg?.toLocaleString('pt-BR')} kg
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Valor Unitário Combinado:</span>
                  <strong className="text-slate-200 font-bold font-mono">
                    R$ {resultado.calculos?.valor_combinado_kg?.toFixed(4)} / kg
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Estimativa Inicial:</span>
                  <strong className="text-slate-300 font-mono">
                    R$ {resultado.calculos?.valor_frete_estimado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800 bg-emerald-950/20 px-2 rounded-lg">
                  <span className="text-emerald-400 font-bold">Valor Real Total (A Pagar ao Motorista):</span>
                  <strong className="text-emerald-300 font-black text-sm font-mono">
                    R$ {resultado.calculos?.valor_frete_motorista_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800 px-2">
                  <span className="text-blue-400 font-medium">Valor do CT-e (Fiscal):</span>
                  <strong className="text-blue-300 font-bold font-mono">
                    R$ {resultado.calculos?.valor_cte_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {Number(resultado.calculos?.valor_por_fora) > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-amber-500/30 bg-amber-950/30 px-2.5 rounded-lg text-amber-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      VALOR POR FORA (Complemento):
                    </span>
                    <strong className="text-amber-200 font-black text-base font-mono">
                      R$ {resultado.calculos?.valor_por_fora?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                )}

                {resultado.calculos?.is_triangular && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800 text-purple-300 px-2">
                    <span>Repasse Intermediadora (Venda Triangular):</span>
                    <strong className="font-bold font-mono">
                      R$ {resultado.calculos?.valor_repasse_intermediadora?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Concluir & Voltar ao Mapa
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProcessarXml} className="space-y-4">
              
              {/* Card Resumo do Carregamento Vinculado */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    {carregamento.motorista_nome}
                  </span>
                  <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Cavalo: {carregamento.placa_cavalo}
                  </span>
                </div>
                
                <div className="text-slate-400 flex items-center justify-between pt-1">
                  <span>Carregado em: <strong className="text-slate-300">{carregamento.fornecedor_nome} ({carregamento.origem_cidade}/{carregamento.origem_uf})</strong></span>
                  <span>Combinado: <strong className="text-emerald-400">R$ {Number(carregamento.valor_combinado_kg || 0).toFixed(4)}/kg</strong></span>
                </div>

                {carregamento.is_triangular ? (
                  <div className="pt-1 text-purple-300 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Venda Triangular: <strong>{carregamento.intermediador_nome || 'Intermediadora'}</strong>
                  </div>
                ) : null}
              </div>

              {/* Modo de Entrada: Arquivo ou Texto */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-slate-300">
                  {useTextMode ? 'Colar Código XML' : 'Selecionar Arquivo .XML do CT-e'}
                </span>
                <button
                  type="button"
                  onClick={() => setUseTextMode(!useTextMode)}
                  className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer underline"
                >
                  {useTextMode ? 'Mudar para Envio de Arquivo' : 'Mudar para Colar Texto XML'}
                </button>
              </div>

              {useTextMode ? (
                <div>
                  <textarea
                    rows={5}
                    required
                    placeholder="Cole aqui o conteúdo XML do CT-e (<cteProc> ou <CTe>)..."
                    value={rawXmlText}
                    onChange={(e) => handleRawTextChange(e.target.value)}
                    className="w-full p-3 text-xs font-mono rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Arquivo XML 1 */}
                  <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/40 text-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept=".xml"
                      id="xml-input-1"
                      className="hidden"
                      onChange={(e) => handleXml1Change(e.target.files[0] || null)}
                    />
                    <label htmlFor="xml-input-1" className="cursor-pointer block">
                      <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      {xmlFile1 ? (
                        <p className="text-xs font-bold text-emerald-300">
                          {xmlFile1.name} ({(xmlFile1.size / 1024).toFixed(1)} KB)
                        </p>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-slate-200">
                            Clique ou arraste o XML do CT-e principal
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Arquivo .xml do Conhecimento emitido pela transportadora
                          </p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Arquivo XML 2 (Se Venda Triangular) */}
                  {carregamento.is_triangular ? (
                    <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 text-center">
                      <input
                        type="file"
                        accept=".xml"
                        id="xml-input-2"
                        className="hidden"
                        onChange={(e) => setXmlFile2(e.target.files[0] || null)}
                      />
                      <label htmlFor="xml-input-2" className="cursor-pointer block">
                        <span className="text-[11px] font-bold text-purple-300 block mb-1">
                          2º CT-e (Operação Triangular / Repasse) - Opcional
                        </span>
                        {xmlFile2 ? (
                          <p className="text-xs font-bold text-purple-200">
                            {xmlFile2.name} ({(xmlFile2.size / 1024).toFixed(1)} KB)
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400 underline">
                            Selecionar segundo CT-e da operação triangular
                          </span>
                        )}
                      </label>
                    </div>
                  ) : null}
                </div>
              )}

              {/* CARD DE CONFERÊNCIA EM TEMPO REAL: BALANÇA, ESTIMATIVA, REAL & VALOR POR FORA */}
              {previewData && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-xl space-y-2.5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      Conferência de Balança & Cálculo Automático:
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ XML Lido com Sucesso
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* 1. Pesos */}
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Peso Aprox. Inicial:</span>
                      <strong className="text-slate-300 text-xs font-mono">{previewData.pesoAprox?.toLocaleString('pt-BR')} kg</strong>
                      <span className="text-[10px] text-amber-400 block mt-1">Peso CT-e (Balança):</span>
                      <strong className="text-amber-300 text-xs font-black font-mono">{previewData.pesoReal?.toLocaleString('pt-BR')} kg</strong>
                    </div>

                    {/* 2. Valor Combinado & Estimativa */}
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Valor por KG:</span>
                      <strong className="text-emerald-400 text-xs font-bold font-mono">R$ {previewData.valorKg?.toFixed(4)}/kg</strong>
                      <span className="text-[10px] text-slate-400 block mt-1">Estimativa Inicial:</span>
                      <strong className="text-slate-300 text-xs font-mono">R$ {previewData.estimativa?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>

                    {/* 3. Valor do CT-e Fiscal */}
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-blue-400 block font-semibold">Valor do CT-e (Fiscal):</span>
                      <strong className="text-blue-300 text-sm font-bold font-mono">
                        R$ {previewData.valorCte?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-1">CT-e Nº:</span>
                      <strong className="text-slate-200 text-xs font-mono">{previewData.numeroCte || 'S/N'}</strong>
                    </div>

                    {/* 4. Valor Real & Valor Por Fora */}
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/40">
                      <span className="text-[10px] text-emerald-400 block font-bold">Valor Real Total:</span>
                      <strong className="text-emerald-300 text-sm font-black font-mono">
                        R$ {previewData.valorReal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[10px] text-amber-400 block font-black mt-1">VALOR POR FORA:</span>
                      <strong className="text-amber-300 text-sm font-black font-mono">
                        R$ {previewData.valorPorFora?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando & Lançando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar & Lançar no Financeiro
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
