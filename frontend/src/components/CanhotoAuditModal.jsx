import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Calendar, 
  Camera, 
  User, 
  FileText, 
  Share2,
  Copy,
  ExternalLink,
  Check
} from 'lucide-react';
import api from '../services/api';

export default function CanhotoAuditModal({ isOpen, onClose, frete, onUpdated }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !frete) return null;

  const publicLink = `${window.location.origin}/canhoto/${frete.canhoto_token_acesso || frete.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleAuditar = async (status) => {
    try {
      setSaving(true);
      const res = await api.post(`/fretes/${frete.id}/canhoto-auditar`, { status });
      alert(res.data.message);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao auditar comprovante.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2 text-emerald-400">
            <Camera className="h-5 w-5" />
            <div>
              <h3 className="font-heading font-bold text-base text-white">Canhoto Digital & Comprovante de Entrega</h3>
              <p className="text-xs text-slate-400">CT-e Nº {frete.numero_cte || 'S/N'} • {frete.cliente_nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Link para o Motorista */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-blue-400" />
              <span>Link do Motorista para Foto do Canhoto (WhatsApp):</span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicLink}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold whitespace-nowrap transition cursor-pointer"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Visualização da Foto */}
          {frete.canhoto_foto_url ? (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center max-h-80">
                <img
                  src={frete.canhoto_foto_url}
                  alt="Canhoto Digital de Entrega"
                  className="max-h-80 w-auto object-contain rounded-lg shadow"
                />
              </div>

              {/* Informações da Entrega */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Data e Hora da Foto:</span>
                  <strong className="text-white font-mono">
                    {frete.canhoto_data_hora ? new Date(frete.canhoto_data_hora).toLocaleString('pt-BR') : '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Recebedor / Documento:</span>
                  <strong className="text-white">
                    {frete.canhoto_recebedor_nome || 'Não informado'} {frete.canhoto_recebedor_doc ? `(${frete.canhoto_recebedor_doc})` : ''}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-950 border border-dashed border-slate-800 space-y-2">
              <Camera className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-slate-400 font-medium">Nenhuma foto de canhoto enviada pelo motorista até o momento.</p>
              <p className="text-[11px] text-slate-500">Envie o link acima para o motorista bater a foto no ato da entrega.</p>
            </div>
          )}

          {/* Ações de Auditoria */}
          {frete.canhoto_foto_url && (
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleAuditar('rejeitado')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>Rejeitar Canhoto</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleAuditar('aprovado')}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Aprovar & Liberar Faturamento</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
