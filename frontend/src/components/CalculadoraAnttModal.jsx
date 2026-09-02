import React, { useState } from 'react';
import { 
  X, 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Truck, 
  Navigation, 
  ShieldCheck, 
  CheckCircle2,
  Layers
} from 'lucide-react';
import api from '../services/api';

export default function CalculadoraAnttModal({ isOpen, onClose }) {
  const [params, setParams] = useState({
    distanciaKm: 650,
    numeroEixos: 6,
    tipoCarga: 'granel_liquido', // PADRÃO: Granel Líquido (Óleo Vegetal / Combustíveis)
    custoPedagioPorEixoKm: 0.12,
    margemLucroDesejada: 15
  });

  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);

  if (!isOpen) return null;

  const handleCalcular = async (e) => {
    e?.preventDefault();
    setCalculando(true);
    try {
      const res = await api.post('/calculadora/antt', params);
      setResultado(res.data);
    } catch (err) {
      alert('Erro ao calcular piso ANTT.');
    } finally {
      setCalculando(false);
    }
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-blue-400">
            <Calculator className="h-5 w-5" />
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                Calculadora Oficial de Piso Mínimo ANTT & Pedágio
              </h3>
              <p className="text-xs text-slate-400">
                Resolução ANTT nº 5.867/2020 e nº 6.084/2026 (Tabela Oficial https://calculadorafrete.antt.gov.br/)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCalcular} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Distância da Rota (KM)*</label>
              <input
                type="number"
                required
                min={1}
                value={params.distanciaKm}
                onChange={(e) => setParams({ ...params, distanciaKm: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tipo de Veículo / Eixos*</label>
              <select
                value={params.numeroEixos}
                onChange={(e) => setParams({ ...params, numeroEixos: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value={2}>Toco (2 eixos)</option>
                <option value={3}>Truck (3 eixos)</option>
                <option value={4}>Bitruck (4 eixos)</option>
                <option value={5}>Carreta 2 eixos (5 eixos)</option>
                <option value={6}>Carreta LS (6 eixos)</option>
                <option value={7}>Bitrem (7 eixos)</option>
                <option value={9}>Rodotrem (9 eixos)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Categoria de Carga ANTT*</label>
              <select
                value={params.tipoCarga}
                onChange={(e) => setParams({ ...params, tipoCarga: e.target.value })}
                className="w-full bg-slate-800 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-bold focus:border-amber-400 focus:outline-none"
              >
                <option value="granel_liquido">🛢️ Granel Líquido (Óleo Vegetal / Combustível) [PADRÃO]</option>
                <option value="carga_geral">📦 Carga Geral</option>
                <option value="granel_solido">🌾 Granel Sólido (Soja / Milho)</option>
                <option value="frigorificada">❄️ Frigorificada ou Aquecida</option>
                <option value="conteinerizada">🚢 Conteinerizada</option>
                <option value="neogranel">🪵 Neogranel (Madeira / Bobinas)</option>
                <option value="perigosa_liquido">☣️ Perigosa (Granel Líquido)</option>
                <option value="perigosa_geral">⚠️ Perigosa (Carga Geral)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Margem de Lucro Desejada (%)*</label>
              <input
                type="number"
                min={0}
                max={99}
                value={params.margemLucroDesejada}
                onChange={(e) => setParams({ ...params, margemLucroDesejada: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={calculando}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Calculator className="h-4 w-4" />
            <span>{calculando ? 'Calculando...' : 'Calcular Piso Mínimo Oficial ANTT'}</span>
          </button>
        </form>

        {/* RESULTADOS DO CÁLCULO */}
        {resultado && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs animate-fadeIn">
            <h4 className="font-bold text-white uppercase text-[11px] border-b border-slate-800 pb-1.5">
              Demonstrativo de Custos e Precificação ({resultado.distanciaKm} km)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">1. Piso Mínimo ANTT:</span>
                <strong className="text-amber-400 font-mono text-sm">{formatMoney(resultado.pisoMinimoAntt)}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">2. Pedágio Estimado:</span>
                <strong className="text-slate-200 font-mono text-sm">{formatMoney(resultado.pedagioEstimado)}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Custo Operacional:</span>
                <strong className="text-rose-400 font-mono text-sm">{formatMoney(resultado.custoTotalEstimado)}</strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
              <div>
                <span className="text-emerald-400 font-bold block text-[11px] uppercase">
                  Preço de Venda Sugerido ({resultado.margemLucroDesejada}% Margem):
                </span>
                <span className="text-slate-400 text-[10px]">
                  R$ {resultado.valorPorKm} por KM • Lucro Estimado: {formatMoney(resultado.lucroEstimado)}
                </span>
              </div>
              <strong className="text-emerald-400 font-mono text-base font-black">
                {formatMoney(resultado.precoVendaSugerido)}
              </strong>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
