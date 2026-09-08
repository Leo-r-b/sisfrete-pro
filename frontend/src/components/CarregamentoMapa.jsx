import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Layers, 
  DollarSign, 
  Building2, 
  ChevronRight, 
  Maximize2, 
  Filter, 
  Upload, 
  Phone,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';

// Fix para ícones padrão do Leaflet caso necessários
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function CarregamentoMapa({ 
  mapaCidades = [], 
  onSelectCidade, 
  onImportarCte, 
  onEditarCarregamento 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Estado para cidade selecionada ao clicar no badge do mapa
  const [selectedCidadeData, setSelectedCidadeData] = useState(null);
  const [basemapStyle, setBasemapStyle] = useState('osm-logistica'); // 'osm-logistica' | 'osm-padrao' | 'rodovias' | 'satellite'
  const currentTileLayerRef = useRef(null);

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centro inicial: Sul / Sudeste do Brasil (foco em Mafra/SC, PR, SP)
      const map = L.map(mapContainerRef.current, {
        center: [-25.5, -50.0],
        zoom: 7,
        zoomControl: false,
        attributionControl: false
      });

      // Controle de Zoom no canto inferior direito
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Alternar camadas de Mapa 100% Livres (Sem necessidade de API, Token ou Cadastro)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors (HOT)';
    let subdomains = 'abc';
    let maxZoom = 19;

    if (basemapStyle === 'osm-padrao') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
      subdomains = 'abc';
      maxZoom = 19;
    } else if (basemapStyle === 'rodovias') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Esri World Street Map';
      subdomains = 'abcd';
      maxZoom = 18;
    } else if (basemapStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Esri World Imagery (Satélite)';
      subdomains = 'abcd';
      maxZoom = 18;
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      subdomains,
      attribution
    }).addTo(map);

    currentTileLayerRef.current = newLayer;
  }, [basemapStyle]);

  // Atualizar marcadores quando mapaCidades mudar
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Limpar marcadores anteriores
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!mapaCidades || mapaCidades.length === 0) return;

    const bounds = L.latLngBounds([]);

    mapaCidades.forEach(ponto => {
      if (!ponto.latitude || !ponto.longitude) return;

      const latLng = [Number(ponto.latitude), Number(ponto.longitude)];
      bounds.extend(latLng);

      const count = ponto.total_caminhoes || 1;

      // Criar ícone customizado com a bolinha pulsante e o número de caminhões
      const customHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <!-- Anel de Pulso Animado -->
          <div class="absolute w-12 h-12 rounded-full bg-amber-500/30 animate-ping opacity-75"></div>
          <div class="absolute w-10 h-10 rounded-full bg-amber-400/20 animate-pulse"></div>
          
          <!-- Bolinha Principal com o Número -->
          <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-amber-500/40 border-2 border-slate-900 transform transition-all duration-200 group-hover:scale-125 group-hover:from-emerald-600 group-hover:to-teal-400">
            ${count}
          </div>

          <!-- Rótulo da Cidade abaixo da bolinha -->
          <div class="absolute -bottom-6 px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-slate-200 tracking-tight whitespace-nowrap shadow-md border border-slate-700 pointer-events-none group-hover:border-amber-400">
            ${ponto.cidade}/${ponto.uf} (${count})
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html: customHtml,
        className: 'custom-carregamento-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(latLng, { icon: divIcon }).addTo(map);

      // Ao clicar na bolinha, abre o painel detalhado de caminhões carregando naquele ponto
      marker.on('click', () => {
        setSelectedCidadeData(ponto);
        if (onSelectCidade) onSelectCidade(ponto);
        map.setView(latLng, Math.max(map.getZoom(), 9), { animate: true });
      });

      markersRef.current.push(marker);
    });

    // Ajustar zoom para enquadrar todos os pontos com padding
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
    }
  }, [mapaCidades]);

  const handleResetZoom = () => {
    if (!mapInstanceRef.current || !mapaCidades || mapaCidades.length === 0) return;
    const bounds = L.latLngBounds([]);
    mapaCidades.forEach(p => {
      if (p.latitude && p.longitude) bounds.extend([p.latitude, p.longitude]);
    });
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      
      {/* Container Leaflet do Mapa */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Barra de Controle Superior Flutuante sobre o Mapa */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="px-3.5 py-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-xl flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">
            {mapaCidades.reduce((acc, c) => acc + c.total_caminhoes, 0)} Caminhões em Carregamento
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-medium text-slate-400">
            {mapaCidades.length} {mapaCidades.length === 1 ? 'Cidade Ativa' : 'Cidades Ativas'}
          </span>
        </div>

        <button
          onClick={handleResetZoom}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl transition-all cursor-pointer"
          title="Enquadrar todos os caminhões no Brasil"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Seletor de Camadas Livres (100% Sem API / Sem Token) no Canto Superior Direito */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-1 p-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-xl">
        <span className="text-[10px] font-black text-emerald-400 px-2 flex items-center gap-1 tracking-wider uppercase">
          <Layers className="w-3 h-3 text-emerald-400" /> Mapa Livre:
        </span>
        <button
          type="button"
          onClick={() => setBasemapStyle('osm-logistica')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            basemapStyle === 'osm-logistica'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🚚 Logístico
        </button>
        <button
          type="button"
          onClick={() => setBasemapStyle('osm-padrao')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            basemapStyle === 'osm-padrao'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🗺️ Padrão
        </button>
        <button
          type="button"
          onClick={() => setBasemapStyle('rodovias')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            basemapStyle === 'rodovias'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🛣️ Rodovias
        </button>
        <button
          type="button"
          onClick={() => setBasemapStyle('satellite')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
            basemapStyle === 'satellite'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🛰️ Satélite
        </button>
      </div>

      {/* Legenda Informativa no Canto Inferior Esquerdo */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 shadow-xl">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-300 flex items-center justify-center text-[8px] font-black text-white">
            N
          </div>
          <span>Bolinha: Qtd de caminhões no local</span>
        </div>
        <span className="text-slate-600">•</span>
        <span className="text-amber-400 font-medium">Clique na bolinha para ver os motoristas</span>
        <span className="text-slate-600">•</span>
        <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> 100% Livre (Sem API)
        </span>
      </div>

      {/* GAVETA / MODAL LATERAL DE CAMINHÕES NA CIDADE CLICADA */}
      {selectedCidadeData && (
        <div className="absolute inset-y-0 right-0 z-20 w-full sm:w-[460px] bg-slate-900/98 backdrop-blur-xl border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Cabeçalho da Gaveta */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-amber-500/20">
                {selectedCidadeData.total_caminhoes}
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  {selectedCidadeData.cidade} - {selectedCidadeData.uf}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCidadeData.total_caminhoes} {selectedCidadeData.total_caminhoes === 1 ? 'caminhão carregando agora' : 'caminhões carregando agora'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedCidadeData(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista com Rolagem dos Caminhões Carregando nessa Cidade */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {selectedCidadeData.caminhoes.map((cam, idx) => (
              <div 
                key={cam.id} 
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 transition-all shadow-md group"
              >
                {/* Linha 1: Motorista, Placas e Tempo de Inclusão */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {cam.motorista_nome}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Cavalo: <strong className="text-slate-200">{cam.placa_cavalo}</strong>
                        {cam.placa_carreta && <> • Carreta: <strong className="text-slate-200">{cam.placa_carreta}</strong></>}
                      </p>
                    </div>
                  </div>

                  {/* Badge de Horário de Inclusão */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      {cam.hora_inclusao || 'Agora'}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {cam.tempo_decorrido || cam.data_inclusao_formatada}
                    </p>
                  </div>
                </div>

                {/* Linha 2: Fornecedor e Destino */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 mb-2.5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">🏢 Fornecedor (Onde carrega):</span>
                    <strong className="text-slate-200 truncate block">{cam.fornecedor_nome}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">🎯 Destino / Cliente:</span>
                    <strong className="text-slate-200 truncate block">{cam.destino_empresa_nome} ({cam.destino_cidade}/{cam.destino_uf})</strong>
                  </div>
                </div>

                {/* Linha 3: Intermediação Triangular (Se Houver) */}
                {cam.is_triangular && (
                  <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-[11px]">
                    <span className="text-purple-300 font-semibold flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Venda Triangular:
                    </span>
                    <span className="text-purple-200 font-medium truncate max-w-[220px]">
                      {cam.intermediador_nome || 'Empresa Intermediadora'}
                    </span>
                  </div>
                )}

                {/* Linha 4: Valor Combinado por KG & Estimativa / Real & Por Fora */}
                <div className="flex flex-col gap-1 text-xs py-1.5 border-t border-slate-700/60 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      Combinado: <strong className="text-emerald-400 font-bold">R$ {Number(cam.valor_combinado_kg || 0).toFixed(4)}/kg</strong>
                    </span>
                    <span className="text-slate-300 font-semibold">
                      {cam.status === 'concluido' && Number(cam.valor_frete_motorista_real) > 0
                        ? `Real: R$ ${Number(cam.valor_frete_motorista_real).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : `Est: R$ ${Number(cam.valor_frete_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  {Number(cam.valor_por_fora) > 0 && (
                    <div className="flex items-center justify-between text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-300 font-bold">
                      <span>Valor Por Fora:</span>
                      <span>R$ {Number(cam.valor_por_fora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação para o Carregamento */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onImportarCte) onImportarCte(cam);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Importar XML do CT-e
                  </button>

                  <button
                    onClick={() => {
                      if (onEditarCarregamento) onEditarCarregamento(cam);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé da Gaveta */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-center">
            <span className="text-[11px] text-slate-400">
              Clique em <strong>Importar XML</strong> para vincular a carga ao CT-e e ao Financeiro.
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
