import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Printer,
  Share2,
  Check,
  Repeat,
  Camera,
  Download,
  Smartphone,
  Copy,
  Send,
  ShieldCheck,
  TrendingUp,
  Building2,
  DollarSign,
  Scale
} from 'lucide-react';
import { toPng } from 'html-to-image';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReciboModal({ frete, isOpen, onClose }) {
  const { activeEmpresa } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [generatingPrint, setGeneratingPrint] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [fullFrete, setFullFrete] = useState(frete || {});
  const [loadingFrete, setLoadingFrete] = useState(false);
  const printRef = useRef();

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Carregar dados completos do frete se vier apenas resumo / título financeiro
  useEffect(() => {
    if (isOpen && frete) {
      setFullFrete(frete);
      const targetId = frete.frete_id || frete.id;
      if (targetId && (!frete.origem_cidade || !frete.motorista_nome || frete.valor_frete_compra === undefined)) {
        setLoadingFrete(true);
        api.get(`/fretes/${targetId}`)
          .then(res => {
            if (res.data) setFullFrete(prev => ({ ...prev, ...res.data, ...frete }));
          })
          .catch(err => console.warn('Erro ao carregar detalhes completos do frete para o recibo:', err))
          .finally(() => setLoadingFrete(false));
      }
    }
  }, [isOpen, frete]);

  if (!isOpen || !frete) return null;

  const f = fullFrete || frete;

  const formatMoney = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Identificação se o recibo é de Contas a Receber (Cliente Tomador) ou Contas a Pagar (Motorista / Freteiro)
  const isRecebimentoCliente = f.tipo === 'receber' || f.tipo_recibo === 'receber' || f.origem_aba === 'receber' || String(f.id).startsWith('frete_rec');

  // Dados da Empresa Ativa
  const empresa = activeEmpresa || f.empresa_detalhes || {};
  const razaoSocial = empresa.razao_social || empresa.nome_fantasia || 'TRANSPORTES & LOGÍSTICA';
  const nomeFantasia = empresa.nome_fantasia || empresa.razao_social || 'Transportes';
  const cnpj = empresa.cnpj || '';
  const telefone = empresa.telefone || '';
  const cidade = empresa.cidade || '';
  const uf = empresa.uf || '';

  const isTriangular = f.tipo_operacao === 'triangular' || Boolean(f.numero_cte_2 || Number(f.valor_frete_venda_2 || 0) > 0);
  const isLicencaGestao = f.tipo_operacao === 'gestao_pagamentos' || empresa.modo_operacao === 'gestao_pagamentos';
  const isAgenciamento = !isRecebimentoCliente && (isLicencaGestao || f.tipo_operacao === 'agenciamento_repasse' || (f.valor_frete_real > 0) || (empresa.modo_operacao === 'agenciamento_repasse'));

  // REGRA DE OURO: No frete triangular NÃO somar os pesos dos dois CT-es (é uma única viagem física)
  const pesoTon1 = f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : '0.00';
  const pesoTon2 = f.peso_kg_2 ? (f.peso_kg_2 / 1000).toFixed(2) : pesoTon1;
  const pesoTotalTon = f.peso_kg ? (f.peso_kg / 1000).toFixed(2) : (f.peso_kg_2 ? (f.peso_kg_2 / 1000).toFixed(2) : '0.00');
  const pesoTotalKg = Number(f.peso_kg || f.peso_kg_2 || 0);

  const v1 = Number(f.valor_frete_venda || f.valor_cte_1 || (isRecebimentoCliente && !isTriangular ? f.valor : 0));
  const v2 = isTriangular ? Number(f.valor_frete_venda_2 || f.valor_cte_2 || 0) : 0;
  const totalCte = (v1 + v2) || Number(f.valor || 0);

  const freteReal = Number(f.valor_frete_real > 0 ? f.valor_frete_real : (f.valor_frete_compra || (Number(f.valor_saldo_motorista || 0) + Number(f.valor_adiantamento || 0)) || f.valor || 0));
  const pctComissao = f.percentual_comissao !== undefined && f.percentual_comissao !== '' ? Number(f.percentual_comissao) : 5.0;
  const valorComissao = (isLicencaGestao && f.valor_comissao !== undefined && f.valor_comissao !== null && f.valor_comissao !== '')
    ? Number(f.valor_comissao)
    : isAgenciamento
      ? Number((freteReal * (pctComissao / 100)).toFixed(2))
      : Number(f.valor_comissao || Math.max(0, totalCte - freteReal));
  const valorRepasse = isAgenciamento
    ? (f.valor_repasse !== undefined && f.valor_repasse !== null && f.valor_repasse !== '' ? Number(f.valor_repasse) : Math.max(0, totalCte - freteReal - valorComissao))
    : Number(f.valor_repasse || 0);

  const valorSaldoMotorista = (f.valor_saldo_motorista !== undefined && f.valor_saldo_motorista !== null && Number(f.valor_saldo_motorista) > 0)
    ? Number(f.valor_saldo_motorista)
    : Math.max(0, freteReal - Number(f.valor_adiantamento || 0) - Number(f.valor_pedagio || 0) - Number(f.valor_combustivel || 0) - Number(f.outros_descontos || 0) + Number(f.valor_acrescimos || 0));

  const isQuitadoCliente = f.status === 'pago' || f.status === 'recebido' || f.status_recebimento_cliente === 'recebido';

  const getWhatsAppText = () => {
    // 1. Mensagem de Recibo para o CLIENTE TOMADOR (Contas a Receber)
    if (isRecebimentoCliente) {
      let cteDetails = `📋 *CT-e Nº:* ${f.numero_cte || 'S/N'} (${formatMoney(v1 || totalCte)})`;
      if (isTriangular) {
        cteDetails = `📋 *CT-e 1:* Nº ${f.numero_cte || 'S/N'} - ${formatMoney(v1)}
📋 *CT-e 2:* Nº ${f.numero_cte_2 || 'S/N'} - ${formatMoney(v2)}
💰 *Valor Total do Frete:* ${formatMoney(totalCte)}`;
      }

      return `🧾 *COMPROVANTE DE PRESTAÇÃO DE SERVIÇOS & RECIBO DE FRETE*
---------------------------------------
${cteDetails}
📍 *Trajeto:* ${f.origem_cidade || '-'}/${f.origem_uf || '-'} ➔ ${f.destino_cidade || '-'}/${f.destino_uf || '-'}
🏢 *Tomador do Serviço:* ${f.cliente_nome || 'Cliente Tomador'}
⚖️ *Peso da Carga:* ${pesoTotalTon} ton (${Number(pesoTotalKg).toLocaleString('pt-BR')} kg)
🚛 *Veículo:* ${f.placa_veiculo || 'N/I'} | Motorista: ${f.motorista_nome || 'N/I'}

💵 *VALOR TOTAL FATURADO:* ${formatMoney(totalCte)}
📌 *Status do Recebimento:* ${isQuitadoCliente ? 'QUITADO / RECEBIDO ✅' : 'PENDENTE DE LIQUIDAÇÃO ⏳'}
---------------------------------------
*${razaoSocial}*`;
    }

    // 2. Mensagem de Recibo de Gestão de Pagamentos / Agenciamento
    if (isLicencaGestao || f.destinatario_comissao_nome) {
      let cteDetails = `📋 *CT-e Nº:* ${f.numero_cte || 'S/N'} (${formatMoney(f.valor_frete_venda || totalCte)})`;
      if (isTriangular) {
        cteDetails = `📋 *CT-e 1:* Nº ${f.numero_cte || 'S/N'} - ${formatMoney(v1)}
📋 *CT-e 2:* Nº ${f.numero_cte_2 || 'S/N'} - ${formatMoney(v2)}
💰 *Total Bruto CT-es:* ${formatMoney(totalCte)}`;
      }

      return `📊 *RATEIO OPERACIONAL - GESTÃO DE PAGAMENTOS*
---------------------------------------
${cteDetails}
📍 *Trajeto:* ${f.origem_cidade || '-'}/${f.origem_uf || '-'} ➔ ${f.destino_cidade || '-'}/${f.destino_uf || '-'}
🚛 *Veículo:* ${f.placa_veiculo || 'N/I'} ${f.placa_carreta ? `| Carreta: ${f.placa_carreta}` : ''}
👤 *Transportador:* ${f.favorecido_freteiro_nome || f.motorista_nome || f.pessoa_nome || 'N/I'}
🔑 *Chave PIX:* ${f.motorista_detalhes?.pix_chave || f.pix_chave || 'A Combinar'}

💵 *DESTINAÇÃO DOS PAGAMENTOS:*
• *Frete Real (${f.favorecido_freteiro_nome || f.motorista_nome || 'Freteiro'}):* ${formatMoney(freteReal)}
• *Comissão (${f.destinatario_comissao_nome || 'Fornecedor'}):* ${formatMoney(valorComissao)}
• *Repasse (${f.destinatario_repasse_nome || 'Destinatário'}):* ${formatMoney(valorRepasse)}
---------------------------------------
💰 *TOTAL CONCILIADO:* ${formatMoney(totalCte)}
---------------------------------------
*${nomeFantasia || razaoSocial}*`;
    }

    if (isAgenciamento) {
      let cteDetails = `📋 *CT-e Nº:* ${f.numero_cte || 'S/N'} (${formatMoney(f.valor_frete_venda)})`;
      if (isTriangular) {
        cteDetails = `📋 *CT-e 1:* Nº ${f.numero_cte || 'S/N'} - ${formatMoney(v1)}
📋 *CT-e 2:* Nº ${f.numero_cte_2 || 'S/N'} - ${formatMoney(v2)}
💰 *Total Bruto CT-es:* ${formatMoney(totalCte)}`;
      }

      return `📊 *RESUMO OPERACIONAL - AGENCIAMENTO & REPASSE*
---------------------------------------
${cteDetails}
📍 *Trajeto:* ${f.origem_cidade || '-'}/${f.origem_uf || '-'} ➔ ${f.destino_cidade || '-'}/${f.destino_uf || '-'}
🚛 *Veículo:* ${f.placa_veiculo || 'N/I'} ${f.placa_carreta ? `| Carreta: ${f.placa_carreta}` : ''}
👤 *Transportador:* ${f.motorista_nome || f.pessoa_nome || 'N/I'}
🔑 *Chave PIX:* ${f.motorista_detalhes?.pix_chave || f.pix_chave || 'A Combinar'}

💵 *DEMONSTRATIVO FINANCEIRO:*
• *Valor do Transportador (Frete Real):* ${formatMoney(freteReal)}
• *Comissão Retida (${pctComissao}% sobre Frete Real):* ${formatMoney(valorComissao)}
---------------------------------------
💰 *VALOR DISPONÍVEL PARA REPASSE:* ${formatMoney(valorRepasse)}
---------------------------------------
*${nomeFantasia || razaoSocial}*`;
    }

    // 3. Mensagem de Recibo de Freteiro / Motorista (Contas a Pagar)
    let cteHeader = `📋 *CT-e Nº:* ${f.numero_cte || 'S/N'} ${f.nfe_referencia ? `(${f.nfe_referencia})` : ''}`;
    if (isTriangular) {
      cteHeader = `🔄 *OPERAÇÃO TRIANGULAR (2 CT-es Vinculados):*
📋 *CT-e 1 (Remessa):* Nº ${f.numero_cte || 'S/N'} ${f.nfe_referencia ? `[${f.nfe_referencia}]` : ''} - ${pesoTon1}t
📋 *CT-e 2 (Venda):* Nº ${f.numero_cte_2 || 'S/N'} ${f.nfe_referencia_2 ? `[${f.nfe_referencia_2}]` : ''} - ${pesoTon2}t`;
    }

    return `🚚 *ORDEM DE CARREGAMENTO & RECIBO DE FRETE*
---------------------------------------
${cteHeader}
📍 *Trajeto:* ${f.origem_cidade || '-'}/${f.origem_uf || '-'} ➔ ${f.destino_cidade || '-'}/${f.destino_uf || '-'}
🚛 *Veículo:* ${f.placa_veiculo || 'N/I'} | Carreta: ${f.placa_carreta || 'N/I'}
👤 *Motorista:* ${f.motorista_nome || f.pessoa_nome || 'N/I'}
⚖️ *Peso da Carga:* ${pesoTotalTon} ton (${Number(pesoTotalKg).toLocaleString('pt-BR')} kg)
🔑 *PIX:* ${f.motorista_detalhes?.pix_chave || f.pix_chave || 'A Combinar'}

💰 *VALORES DO MOTORISTA:*
• *Frete Contratado:* ${formatMoney(freteReal)}
• *Adiantamento:* ${formatMoney(f.valor_adiantamento)}
• *Descontos/Pedágio:* ${formatMoney((f.valor_pedagio || 0) + (f.valor_combustivel || 0) + (f.outros_descontos || 0))}
---------------------------------------
💵 *SALDO RESTANTE:* ${formatMoney(valorSaldoMotorista)}
📌 *Status:* ${(f.status_pagamento_motorista || f.status || 'pendente').toUpperCase()}
---------------------------------------
*${nomeFantasia || razaoSocial}*`;
  };

  // Gerar Print em Imagem e Compartilhar no WhatsApp / Download
  const handleCaptureAndShareWhatsApp = async () => {
    if (!printRef.current) return;
    setGeneratingPrint(true);
    setActionFeedback('Gerando foto do recibo para celular...');

    try {
      const dataUrl = await toPng(printRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (!blob) {
        throw new Error('Falha ao gerar o arquivo de imagem.');
      }

      const fileName = `recibo-${isRecebimentoCliente ? 'cliente' : 'freteiro'}-${f.numero_cte || 'viagem'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 1. Compartilhamento Nativo no Celular (Web Share API)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Recibo de Frete - CT-e ${f.numero_cte || ''}`,
            text: getWhatsAppText(),
          });
          setActionFeedback('Enviado com sucesso para o WhatsApp!');
          setGeneratingPrint(false);
          return;
        } catch (shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.warn('Share API falhou, usando fallback de cópia/download:', shareErr);
          } else {
            setGeneratingPrint(false);
            setActionFeedback('');
            return;
          }
        }
      }

      // 2. Fallback para Computador / WhatsApp Web:
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 6000);
        }
      } catch (clipErr) {
        console.warn('Erro ao copiar imagem para clipboard:', clipErr);
      }

      // Download da imagem
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Abrir o WhatsApp Web com mensagem pré-formatada
      const cleanPhone = (isRecebimentoCliente ? (f.cliente_telefone || f.pessoa_telefone) : (f.motorista_detalhes?.telefone || f.motorista_telefone || f.cliente_telefone || ''))?.replace(/\D/g, '') || '';
      const phoneParam = cleanPhone.length >= 10 ? `phone=55${cleanPhone}&` : '';
      const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(getWhatsAppText())}`;
      window.open(waUrl, '_blank');

      setActionFeedback('📸 Print do recibo copiado e baixado! Cole (Ctrl+V) no WhatsApp.');
      setTimeout(() => setActionFeedback(''), 6000);
      setGeneratingPrint(false);

    } catch (err) {
      console.error('Erro ao gerar print:', err);
      setActionFeedback('Erro ao gerar imagem: ' + (err.message || err));
      setGeneratingPrint(false);
      setTimeout(() => setActionFeedback(''), 5000);
    }
  };

  const handleCopyTextOnly = () => {
    navigator.clipboard.writeText(getWhatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">

        {/* Modal Header Fixo */}
        <div className="no-print flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-800 bg-slate-900 z-30">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl ${isRecebimentoCliente
                ? 'bg-emerald-600/20 text-emerald-400'
                : isAgenciamento
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'bg-blue-600/20 text-blue-400'
              }`}>
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm sm:text-base text-white leading-tight">
                {isRecebimentoCliente
                  ? 'Recibo de Frete (Cliente / Tomador)'
                  : isAgenciamento
                    ? 'Recibo de Agenciamento & Repasse'
                    : isTriangular ? 'Recibo Freteiro (Triangular)' : 'Recibo do Motorista / Freteiro'}
              </h3>
              <p className="text-[10px] text-slate-400">Proporção Celular / WhatsApp</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botão de Destaque: Print / WhatsApp */}
            <button
              onClick={handleCaptureAndShareWhatsApp}
              disabled={generatingPrint}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg transition disabled:opacity-50 ${isRecebimentoCliente
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : isAgenciamento
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
              title="Gerar foto proporcional e enviar no WhatsApp"
            >
              {generatingPrint ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : (
                <Camera className="h-3.5 w-3.5 text-white" />
              )}
              <span>{generatingPrint ? 'Gerando...' : 'Print WhatsApp'}</span>
            </button>

            {/* Copiar Texto */}
            <button
              onClick={handleCopyTextOnly}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Copiar apenas o texto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Texto'}</span>
            </button>

            {/* Imprimir */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Imprimir A4 / Salvar PDF"
            >
              <Printer className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 transition cursor-pointer"
              title="Fechar (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Feedback visual de ações */}
        {actionFeedback && (
          <div className="no-print px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            {copiedImage && (
              <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded font-bold">
                Ctrl + V Pronto!
              </span>
            )}
          </div>
        )}

        {/* Scrollable Receipt Area - FORMATO VERTICAL OTIMIZADO PARA CELULAR (MAX-W 430px) */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-4 bg-slate-950/80 flex justify-center">

          <div
            ref={printRef}
            className="w-full max-w-[430px] bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-2.5 text-[11px] leading-tight border border-slate-200"
            style={{ boxSizing: 'border-box' }}
          >

            {/* Header Empresa Dinâmico */}
            <div className="border-b-2 border-slate-900 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-tight uppercase">
                    {razaoSocial}
                  </h2>
                  <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                    {cnpj ? `CNPJ: ${cnpj}` : ''} {telefone ? `• Tel: ${telefone}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {cidade ? `${cidade}${uf ? ` - ${uf}` : ''}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 text-white font-bold text-[9px] rounded uppercase tracking-wider ${isRecebimentoCliente
                      ? 'bg-emerald-700'
                      : isAgenciamento
                        ? 'bg-indigo-700'
                        : isTriangular
                          ? 'bg-purple-700'
                          : 'bg-slate-900'
                    }`}>
                    {isRecebimentoCliente
                      ? (isTriangular ? 'Recibo Frete Triangular' : 'Recebimento de Frete')
                      : isAgenciamento
                        ? (isTriangular ? 'Repasse Triangular' : 'Agenciamento & Repasse')
                        : (isTriangular ? 'Frete Triangular' : 'Recibo de Frete')}
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Emissão: {new Date(f.data_emissao || Date.now()).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Destaque da Operação com Peso Único Correto */}
            {isRecebimentoCliente ? (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-700 flex-shrink-0" />
                  <span>{isTriangular ? 'OPERAÇÃO TRIANGULAR (2 CT-es)' : 'PRESTAÇÃO DE SERVIÇO DE TRANSPORTE'}</span>
                </div>
                <span className="bg-emerald-700 text-white px-2 py-0.5 rounded-md text-[10px]">
                  {pesoTotalTon} ton
                </span>
              </div>
            ) : isLicencaGestao ? (
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  <span>GESTÃO DE PAGAMENTOS: RATEIO FRETEIRO + COMISSÃO + REPASSE</span>
                </div>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-[10px] font-mono">
                  CT-e Total: {formatMoney(totalCte)}
                </span>
              </div>
            ) : isAgenciamento ? (
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                  <span>AGENCIAMENTO: FRETE REAL + 5% COMISSÃO</span>
                </div>
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px] font-mono">
                  CT-e: {formatMoney(totalCte)}
                </span>
              </div>
            ) : isTriangular && (
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  <span>OPERAÇÃO TRIANGULAR (2 CT-es Vinculados)</span>
                </div>
                <span className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[10px]">
                  {pesoTotalTon} ton
                </span>
              </div>
            )}

            {/* Dados dos CT-es */}
            <div className="grid grid-cols-2 gap-2">

              {/* CT-e 1 */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">
                    {isTriangular ? 'CT-e 1' : 'CT-e Fiscal'}
                  </p>
                  {f.nfe_referencia && (
                    <span className="text-[9px] font-bold text-blue-700">{f.nfe_referencia}</span>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-xs">Nº {f.numero_cte || 'S/N'}</p>
                <p className="text-slate-700 text-[10px] truncate" title={f.cliente_nome}>
                  <strong>Tomador:</strong> {f.cliente_nome || 'Cliente Tomador'}
                </p>
                <p className="text-slate-700 text-[10px]">
                  <strong>Valor CT-e 1:</strong> <span className="font-bold text-slate-900">{formatMoney(v1 || totalCte)}</span>
                </p>
                {pesoTon1 > 0 && (
                  <p className="text-slate-500 text-[9px]">
                    Peso: {pesoTon1}t ({Number(f.peso_kg || 0).toLocaleString('pt-BR')} kg)
                  </p>
                )}
              </div>

              {/* CT-e 2 (Triangular) ou Carga (Padrão) */}
              {isTriangular ? (
                <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-200 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-indigo-800 font-bold uppercase text-[9px]">CT-e 2</p>
                    {f.nfe_referencia_2 && (
                      <span className="text-[9px] font-bold text-indigo-700">{f.nfe_referencia_2}</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 text-xs">Nº {f.numero_cte_2 || 'S/N'}</p>
                  <p className="text-slate-700 text-[10px] truncate" title={f.cliente_nome_2 || f.cliente_nome}>
                    <strong>Tomador:</strong> {f.cliente_nome_2 || f.cliente_nome || 'Cliente Tomador 2'}
                  </p>
                  <p className="text-slate-700 text-[10px]">
                    <strong>Valor CT-e 2:</strong> <span className="font-bold text-indigo-950">{formatMoney(v2)}</span>
                  </p>
                  {pesoTon2 > 0 && (
                    <p className="text-slate-500 text-[9px]">
                      Peso: {pesoTon2}t
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Carga Transportada</p>
                  <p className="font-bold text-slate-900 text-xs">{f.tipo_carga || 'Carga Geral'}</p>
                  <p className="text-slate-700 text-[10px]">
                    <strong>Tomador:</strong> {f.cliente_nome || 'N/I'}
                  </p>
                  <p className="text-slate-700 text-[10px]">
                    <strong>Total Bruto:</strong> <span className="font-bold text-emerald-800">{formatMoney(totalCte)}</span>
                  </p>
                </div>
              )}

            </div>

            {/* Trajeto Único */}
            <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Trajeto da Viagem:</span>
              <span className="font-bold text-slate-900 text-xs">
                {f.origem_cidade || 'Origem'}/{f.origem_uf || 'PR'} ➔ {f.destino_cidade || 'Destino'}/{f.destino_uf || 'SP'}
              </span>
            </div>

            {/* Dados do Motorista / Veículo */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 space-y-1">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <p className="text-slate-500 font-bold uppercase text-[9px]">
                  {isRecebimentoCliente
                    ? 'Veículo / Motorista Executor'
                    : isAgenciamento
                      ? 'Transportador (Terceirizado)'
                      : 'Motorista Contratado (Terceiro)'}
                </p>
                <span className="text-[10px] font-bold text-slate-700">
                  {f.motorista_detalhes?.telefone || f.motorista_telefone || 'Sem tel'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-800 pt-0.5">
                <p className="col-span-2">
                  <strong>Motorista:</strong> <span className="font-bold text-slate-900">{f.motorista_nome || f.pessoa_nome || 'Motorista'}</span>
                </p>
                <p>
                  <strong>Cavalo:</strong> <span className="font-mono font-bold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 text-slate-900">{f.placa_veiculo || 'N/I'}</span>
                </p>
                <p>
                  <strong>Carreta:</strong> <span className="font-mono font-bold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 text-slate-900">{f.placa_carreta || 'N/I'}</span>
                </p>
                {!isRecebimentoCliente && (
                  <p className="col-span-2 pt-0.5">
                    <strong>Chave PIX:</strong> <span className="font-mono font-bold text-emerald-800">{f.motorista_detalhes?.pix_chave || f.pix_chave || 'A Combinar'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* DEMONSTRATIVO FINANCEIRO: CONTAS A RECEBER (CLIENTE)     */}
            {/* ========================================================= */}
            {isRecebimentoCliente ? (
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Demonstrativo do Frete ao Cliente / Tomador
                </p>
                <table className="w-full text-left text-[10px] border border-slate-300 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[9px] uppercase">
                    <tr>
                      <th className="p-1.5">Descrição do Faturamento</th>
                      <th className="p-1.5 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 font-semibold text-slate-800">
                        {isTriangular ? `1. Frete CT-e 1 (Nº ${f.numero_cte || 'S/N'})` : `Frete CT-e Nº ${f.numero_cte || 'S/N'}`}
                      </td>
                      <td className="p-1.5 text-right font-bold text-slate-900">{formatMoney(v1 || totalCte)}</td>
                    </tr>
                    {isTriangular && v2 > 0 && (
                      <tr>
                        <td className="p-1.5 font-semibold text-slate-800">
                          2. Frete CT-e 2 (Nº ${f.numero_cte_2 || 'S/N'})
                        </td>
                        <td className="p-1.5 text-right font-bold text-slate-900">{formatMoney(v2)}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white font-bold text-[11px]">
                      <td className="p-2 uppercase">VALOR TOTAL DO SERVIÇO / FRETE</td>
                      <td className="p-2 text-right text-emerald-300 font-mono text-xs font-black">{formatMoney(totalCte)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : isAgenciamento ? (
              /* ========================================================= */
              /* DEMONSTRATIVO FINANCEIRO: AGENCIAMENTO & REPASSE         */
              /* ========================================================= */
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Demonstrativo Financeiro do Agenciamento & Repasse
                </p>
                <table className="w-full text-left text-[10px] border border-slate-300 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[9px] uppercase">
                    <tr>
                      <th className="p-1.5">Descrição Financeira</th>
                      <th className="p-1.5 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 font-semibold text-slate-800">
                        {isTriangular ? `Total Bruto dos CT-es (${formatMoney(v1)} + ${formatMoney(v2)})` : 'Valor Total Bruto do CT-e'}
                      </td>
                      <td className="p-1.5 text-right font-black text-slate-900">{formatMoney(totalCte)}</td>
                    </tr>
                    <tr className="bg-emerald-50/60 text-emerald-950">
                      <td className="p-1.5 font-bold">1. Valor do Transportador (Frete Real Negociado)</td>
                      <td className="p-1.5 text-right font-mono font-black text-emerald-800">{formatMoney(freteReal)}</td>
                    </tr>
                    <tr className="bg-purple-50/60 text-purple-950">
                      <td className="p-1.5 font-bold">2. Comissão Retida ({pctComissao}% sobre o Frete Real)</td>
                      <td className="p-1.5 text-right font-mono font-black text-purple-800">{formatMoney(valorComissao)}</td>
                    </tr>
                    <tr className="bg-indigo-900 text-white font-bold text-[11px]">
                      <td className="p-2">3. VALOR DISPONÍVEL PARA REPASSE</td>
                      <td className="p-2 text-right text-indigo-200 font-mono text-xs font-black">{formatMoney(valorRepasse)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              /* ========================================================= */
              /* DEMONSTRATIVO FINANCEIRO: MOTORISTA / CONTAS A PAGAR     */
              /* ========================================================= */
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Demonstrativo Financeiro do Motorista (Valor Contratado)
                </p>
                <table className="w-full text-left text-[10px] border border-slate-300 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[9px] uppercase">
                    <tr>
                      <th className="p-1.5">Descrição</th>
                      <th className="p-1.5 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-1.5 font-semibold text-slate-800">Valor Total do Frete Contratado</td>
                      <td className="p-1.5 text-right font-bold text-slate-900">{formatMoney(freteReal)}</td>
                    </tr>
                    {f.valor_adiantamento > 0 && (
                      <tr className="text-blue-700 bg-blue-50/50">
                        <td className="p-1.5">(-) Adiantamento {f.percentual_adiantamento ? `(${f.percentual_adiantamento}%)` : ''}</td>
                        <td className="p-1.5 text-right font-semibold">- {formatMoney(f.valor_adiantamento)}</td>
                      </tr>
                    )}
                    {f.valor_pedagio > 0 && (
                      <tr className="text-amber-800">
                        <td className="p-1.5">(-) Desconto Vale-Pedágio</td>
                        <td className="p-1.5 text-right font-semibold">- {formatMoney(f.valor_pedagio)}</td>
                      </tr>
                    )}
                    {f.valor_combustivel > 0 && (
                      <tr className="text-amber-800">
                        <td className="p-1.5">(-) Desconto Abastecimento</td>
                        <td className="p-1.5 text-right font-semibold">- {formatMoney(f.valor_combustivel)}</td>
                      </tr>
                    )}
                    {f.outros_descontos > 0 && (
                      <tr className="text-rose-700">
                        <td className="p-1.5">(-) Outros Descontos</td>
                        <td className="p-1.5 text-right font-semibold">- {formatMoney(f.outros_descontos)}</td>
                      </tr>
                    )}
                    {f.valor_acrescimos > 0 && (
                      <tr className="text-emerald-700">
                        <td className="p-1.5">(+) Acréscimos / Diárias</td>
                        <td className="p-1.5 text-right font-semibold">+ {formatMoney(f.valor_acrescimos)}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white font-bold text-[11px]">
                      <td className="p-2">SALDO A PAGAR NA ENTREGA</td>
                      <td className="p-2 text-right text-emerald-300 font-mono text-xs">{formatMoney(valorSaldoMotorista)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Declaração e Assinaturas */}
            <div className="pt-1.5 border-t border-slate-300 text-[9px] text-slate-600 space-y-1.5">
              <p className="text-justify leading-snug">
                {isRecebimentoCliente
                  ? 'Declaramos para os devidos fins de direito que os serviços de transporte de cargas referenciados neste documento foram devidamente prestados e faturados conforme os valores e condições acima discriminadas.'
                  : isAgenciamento
                    ? 'Declaro que realizei o transporte da carga descrita neste documento conforme os valores acordados de frete real e dados de repasse informados.'
                    : 'Declaro que recebi os valores acima acordados referente ao transporte da carga descrita neste documento e concordo com os valores contratados e eventuais descontos acordados.'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 text-center">
                <div className="border-t border-slate-700 pt-0.5">
                  <p className="font-bold text-slate-900 text-[10px] truncate">
                    {isRecebimentoCliente ? (f.cliente_nome || 'Tomador do Serviço') : (f.motorista_nome || f.pessoa_nome || 'Motorista')}
                  </p>
                  <p className="text-[8px] text-slate-500">
                    {isRecebimentoCliente ? 'Assinatura do Tomador / Cliente' : (isAgenciamento ? 'Assinatura do Transportador' : 'Assinatura do Motorista')}
                  </p>
                </div>
                <div className="border-t border-slate-700 pt-0.5">
                  <p className="font-bold text-slate-900 text-[10px] truncate">{nomeFantasia || razaoSocial}</p>
                  <p className="text-[8px] text-slate-500">Assinatura da Transportadora Emitente</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer (No Print) */}
        <div className="no-print flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-900">
          <button
            onClick={handleCaptureAndShareWhatsApp}
            disabled={generatingPrint}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-50 ${isRecebimentoCliente
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : isAgenciamento
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              }`}
          >
            <Camera className="h-4 w-4 text-white" />
            <span>Gerar & Compartilhar Print</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
