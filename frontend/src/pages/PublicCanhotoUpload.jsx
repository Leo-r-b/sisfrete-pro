import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  User, 
  FileText, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

export default function PublicCanhotoUpload() {
  const [token, setToken] = useState('');
  const [frete, setFrete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form
  const [fotoBase64, setFotoBase64] = useState('');
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Obter token da URL (ex: /canhoto/:token)
    const pathParts = window.location.pathname.split('/');
    const t = pathParts[pathParts.length - 1];
    setToken(t);

    if (t) {
      api.get(`/public/canhoto/${t}`)
        .then(res => {
          setFrete(res.data);
          if (res.data.canhoto_foto_url) {
            setFotoBase64(res.data.canhoto_foto_url);
            setRecebedorNome(res.data.canhoto_recebedor_nome || '');
            setRecebedorDoc(res.data.canhoto_recebedor_doc || '');
          }
        })
        .catch(err => {
          setError('Viagem ou comprovante não encontrado. Verifique o link fornecido pela transportadora.');
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFotoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fotoBase64) {
      alert('Por favor, tire ou selecione a foto do canhoto assinado.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await api.post(`/public/canhoto/${token}`, {
        foto_base64: fotoBase64,
        recebedor_nome: recebedorNome,
        recebedor_doc: recebedorDoc
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar comprovante.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Carregando dados da entrega...</p>
      </div>
    );
  }

  if (error && !frete) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white text-center space-y-3">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold">Link Inválido ou Expirado</h2>
        <p className="text-xs text-slate-400 max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 max-w-md mx-auto">
      
      {/* Header do Motorista */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2.5 text-blue-400">
          <Truck className="h-6 w-6" />
          <div>
            <h1 className="text-base font-bold text-white font-heading">Comprovante de Entrega Digital</h1>
            <p className="text-xs text-slate-400">{frete.empresa_nome || 'SisFrete Pro'}</p>
          </div>
        </div>

        {/* Card da Carga */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-white font-mono">CT-e Nº {frete.numero_cte || 'S/N'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
              {frete.tipo_carga || 'Carga Geral'}
            </span>
          </div>

          <div className="text-slate-300 space-y-1">
            <p><strong>Cliente:</strong> {frete.cliente_nome}</p>
            <p className="flex items-center gap-1 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span>{frete.origem_cidade}/{frete.origem_uf} ➔ {frete.destino_cidade}/{frete.destino_uf}</span>
            </p>
            <p className="text-slate-400">Motorista: <strong className="text-white">{frete.motorista_nome}</strong> ({frete.placa_veiculo})</p>
          </div>
        </div>
      </div>

      {/* Formulário de Foto e Envio */}
      {success ? (
        <div className="my-auto p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-lg font-bold text-white">Comprovante Enviado com Sucesso!</h2>
          <p className="text-xs text-slate-300">
            A foto do canhoto assinado foi registrada no sistema e o setor financeiro já foi notificado.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="my-auto space-y-4 py-4">
          
          {/* Área da Câmera / Upload */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-500/40 rounded-3xl p-6 bg-slate-900/80 hover:bg-slate-900 transition flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px]"
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {fotoBase64 ? (
              <div className="space-y-2">
                <img src={fotoBase64} alt="Canhoto" className="max-h-48 rounded-xl object-contain shadow-lg mx-auto" />
                <p className="text-[11px] text-blue-400 font-semibold flex items-center justify-center gap-1">
                  <Camera className="h-3.5 w-3.5" />
                  <span>Toque para tirar outra foto</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Camera className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-white text-sm">Tirar Foto do Canhoto</h3>
                <p className="text-[11px] text-slate-400">
                  Enquadre bem o documento assinado e com carimbo
                </p>
              </div>
            )}
          </div>

          {/* Dados de quem recebeu */}
          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nome de quem recebeu na entrega</label>
              <input
                type="text"
                value={recebedorNome}
                onChange={(e) => setRecebedorNome(e.target.value)}
                placeholder="Ex: João da Silva (Conferente)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">CPF ou RG do recebedor (Opcional)</label>
              <input
                type="text"
                value={recebedorDoc}
                onChange={(e) => setRecebedorDoc(e.target.value)}
                placeholder="Ex: 000.000.000-00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !fotoBase64}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Enviando Comprovante...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Enviar Comprovante de Entrega</span>
              </>
            )}
          </button>

        </form>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 pb-1">
        SisFrete Pro • Comprovante Digital de Transporte
      </div>

    </div>
  );
}
