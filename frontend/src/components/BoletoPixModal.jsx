import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign,
  Share2
} from 'lucide-react';

export default function BoletoPixModal({ isOpen, onClose, boletoData }) {
  const [copiedLinha, setCopiedLinha] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  if (!isOpen || !boletoData) return null;

  const {
    titulo,
    linhaDigitavel,
    codigoBarras,
    pixCopiaCola,
    pixQrCodeUrl
  } = boletoData;

  const handleCopyLinha = () => {
    navigator.clipboard.writeText(linhaDigitavel);
    setCopiedLinha(true);
    setTimeout(() => setCopiedLinha(false), 3000);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCopiaCola);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
        
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2 text-emerald-400">
            <FileText className="h-5 w-5" />
            <div>
              <h3 className="font-heading font-bold text-base text-white">Cobrança Bancária & PIX</h3>
              <p className="text-xs text-slate-400">{titulo.descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Card do Resumo */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Sacado / Pagador:</span>
              <strong className="text-sm font-bold text-white">{titulo.pessoa_nome || 'Cliente'}</strong>
              <span className="text-slate-400 block text-[11px]">Vencimento: {new Date(titulo.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Valor Total:</span>
              <strong className="text-lg font-black text-emerald-400 font-mono">{formatMoney(titulo.valor)}</strong>
            </div>
          </div>

          {/* PIX QR CODE & Copia e Cola */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <span className="font-bold text-emerald-300 uppercase text-xs flex items-center justify-center gap-1">
              <QrCode className="h-4 w-4" />
              <span>Pagamento Instantâneo via PIX</span>
            </span>

            {pixQrCodeUrl && (
              <img
                src={pixQrCodeUrl}
                alt="QR Code PIX"
                className="w-40 h-40 bg-white p-2 rounded-xl mx-auto shadow-md"
              />
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pixCopiaCola}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 font-mono"
              />
              <button
                onClick={handleCopyPix}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold whitespace-nowrap transition cursor-pointer"
              >
                {copiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
              </button>
            </div>
          </div>

          {/* BOLETO BANCÁRIO & LINHA DIGITÁVEL */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="font-bold text-white uppercase text-xs">Linha Digitável do Boleto:</span>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={linhaDigitavel}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
              />
              <button
                onClick={handleCopyLinha}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold whitespace-nowrap transition cursor-pointer"
              >
                {copiedLinha ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLinha ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Código de barras simulado */}
            <div className="text-center pt-2">
              <div className="bg-white text-black font-mono font-bold text-xs py-2 tracking-widest rounded border border-gray-300">
                ||| | |||| ||| |||| | ||| |||| | |||| ||||
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">{codigoBarras}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Fatura</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Fechar
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
