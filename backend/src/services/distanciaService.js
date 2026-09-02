const https = require('https');
const http = require('http');

/**
 * Coordenadas das principais cidades e polos logísticos por UF
 * Utilizado como fallback de alta precisão caso APIs externas estejam offline
 */
const COORDENADAS_UF = {
  'AC': { lat: -9.97499, lon: -67.8243 }, // Rio Branco
  'AL': { lat: -9.66599, lon: -35.735 },  // Maceió
  'AM': { lat: -3.10194, lon: -60.025 },  // Manaus
  'AP': { lat: 0.034934, lon: -51.0694 }, // Macapá
  'BA': { lat: -12.9718, lon: -38.5011 }, // Salvador
  'CE': { lat: -3.71839, lon: -38.5434 }, // Fortaleza
  'DF': { lat: -15.7795, lon: -47.9297 }, // Brasília
  'ES': { lat: -20.3155, lon: -40.3128 }, // Vitória
  'GO': { lat: -16.6864, lon: -49.2643 }, // Goiânia
  'MA': { lat: -2.53874, lon: -44.2825 }, // São Luís
  'MG': { lat: -19.9173, lon: -43.9346 }, // Belo Horizonte
  'MS': { lat: -20.4486, lon: -54.6295 }, // Campo Grande
  'MT': { lat: -15.6010, lon: -56.0974 }, // Cuiabá
  'PA': { lat: -1.4554, lon: -48.4898 },  // Belém
  'PB': { lat: -7.11509, lon: -34.8641 }, // João Pessoa
  'PE': { lat: -8.04666, lon: -34.8771 }, // Recife
  'PI': { lat: -5.0949, lon: -42.8042 },  // Teresina
  'PR': { lat: -25.4297, lon: -49.2719 }, // Curitiba
  'RJ': { lat: -22.9068, lon: -43.1729 }, // Rio de Janeiro
  'RN': { lat: -5.79357, lon: -35.1986 }, // Natal
  'RO': { lat: -8.76077, lon: -63.8999 }, // Porto Velho
  'RR': { lat: 2.82384, lon: -60.6753 },  // Boa Vista
  'RS': { lat: -30.0331, lon: -51.23 },   // Porto Alegre
  'SC': { lat: -27.5949, lon: -48.5482 }, // Florianópolis
  'SE': { lat: -10.9091, lon: -37.0677 }, // Aracaju
  'SP': { lat: -23.5489, lon: -46.6388 }, // São Paulo
  'TO': { lat: -10.2486, lon: -48.3243 }, // Palmas
};

// Cidades polos de grãos/óleo vegetal e principais portos do Brasil
const CIDADES_NOTAVEIS = {
  'ARAPONGAS_PR': { lat: -23.4147, lon: -51.4244 },
  'MARINGA_PR': { lat: -23.4205, lon: -51.9333 },
  'LONDRINA_PR': { lat: -23.3045, lon: -51.1696 },
  'CASCAVEL_PR': { lat: -24.9578, lon: -53.4595 },
  'FOZ DO IGUACU_PR': { lat: -25.5163, lon: -54.5854 },
  'PARANAGUA_PR': { lat: -25.5205, lon: -48.5095 },
  'CURITIBA_PR': { lat: -25.4297, lon: -49.2719 },
  'PONTA GROSSA_PR': { lat: -25.0994, lon: -50.1583 },
  'GUARAPUAVA_PR': { lat: -25.3907, lon: -51.4628 },
  'TOLEDO_PR': { lat: -24.7139, lon: -53.7431 },
  'APUCARANA_PR': { lat: -23.5517, lon: -51.4614 },
  'CAMPO MOURAO_PR': { lat: -24.0456, lon: -52.3808 },
  'UMUARAMA_PR': { lat: -23.7664, lon: -53.3250 },
  'PATOS DE MINAS_MG': { lat: -18.5789, lon: -46.5181 },
  'UBERLANDIA_MG': { lat: -18.9186, lon: -48.2772 },
  'UBERABA_MG': { lat: -19.7472, lon: -47.9392 },
  'SANTOS_SP': { lat: -23.9618, lon: -46.3322 },
  'SAO PAULO_SP': { lat: -23.5505, lon: -46.6333 },
  'CAMPINAS_SP': { lat: -22.9099, lon: -47.0626 },
  'RIBEIRAO PRETO_SP': { lat: -21.1775, lon: -47.8103 },
  'SAO JOSE DO RIO PRETO_SP': { lat: -20.8113, lon: -49.3758 },
  'BAURU_SP': { lat: -22.3147, lon: -49.0606 },
  'OURINHOS_SP': { lat: -22.9794, lon: -49.8706 },
  'ASSIS_SP': { lat: -22.6617, lon: -50.4181 },
  'PRESIDENTE PRUDENTE_SP': { lat: -22.1256, lon: -51.3889 },
  'RIO VERDE_GO': { lat: -17.7925, lon: -50.9192 },
  'JATAI_GO': { lat: -17.8814, lon: -51.7144 },
  'ITUMBIARA_GO': { lat: -18.4192, lon: -49.2178 },
  'ANAPOLIS_GO': { lat: -16.3267, lon: -48.9533 },
  'RONDONOPOLIS_MT': { lat: -16.4674, lon: -54.6361 },
  'SORRISO_MT': { lat: -12.5429, lon: -55.7214 },
  'LUCAS DO RIO VERDE_MT': { lat: -13.0503, lon: -55.9100 },
  'NOVA MUTUM_MT': { lat: -13.8292, lon: -56.0792 },
  'SINOP_MT': { lat: -11.8608, lon: -55.5097 },
  'PRIMAVERA DO LESTE_MT': { lat: -15.5592, lon: -54.2969 },
  'CAMPO NOVO DO PARECIS_MT': { lat: -13.6747, lon: -57.8897 },
  'DOURADOS_MS': { lat: -22.2231, lon: -54.8118 },
  'MARACAJU_MS': { lat: -21.6144, lon: -55.1683 },
  'SIDROLANDIA_MS': { lat: -20.9317, lon: -54.9614 },
  'CHAPADAO DO SUL_MS': { lat: -18.7936, lon: -52.6214 },
  'PASSO FUNDO_RS': { lat: -28.2612, lon: -52.4083 },
  'SANTA ROSA_RS': { lat: -27.8719, lon: -54.4811 },
  'IJUI_RS': { lat: -28.3878, lon: -53.9147 },
  'CRUZ ALTA_RS': { lat: -28.6389, lon: -53.6064 },
  'RIO GRANDE_RS': { lat: -32.0350, lon: -52.0986 },
  'ITAJAI_SC': { lat: -26.9078, lon: -48.6619 },
  'NAVEGANTES_SC': { lat: -26.8986, lon: -48.6544 },
  'SAO FRANCISCO DO SUL_SC': { lat: -26.2433, lon: -48.6381 },
  'CHAPECO_SC': { lat: -27.1006, lon: -52.6153 },
  'LUIS EDUARDO MAGALHAES_BA': { lat: -12.0967, lon: -45.7958 },
  'BARREIRAS_BA': { lat: -12.1528, lon: -44.9961 },
  'VITORIA DA CONQUISTA_BA': { lat: -14.8661, lon: -40.8394 },
};

function normalizarTexto(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function calcularDistanciaHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanciaLinhaReta = R * c;

  // Fator médio de traçado rodoviário no Brasil (1.28x sobre linha reta)
  return Math.round(distanciaLinhaReta * 1.28);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'SisFretePro/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Consulta a distância entre origem e destino
 * 1º Tenta Google Maps Distance Matrix API (se GOOGLE_MAPS_API_KEY existir)
 * 2º Fallback instantâneo via Geocodificação / Matriz Rodoviária
 */
async function consultarDistanciaRodoviaria(origemCidade, origemUf, destinoCidade, destinoUf) {
  const origCidadeNorm = normalizarTexto(origemCidade);
  const origUfNorm = normalizarTexto(origemUf);
  const destCidadeNorm = normalizarTexto(destinoCidade);
  const destUfNorm = normalizarTexto(destinoUf);

  if (!origCidadeNorm || !destCidadeNorm) {
    return { distancia_km: 650, provider: 'default' };
  }

  // Mesma cidade
  if (origCidadeNorm === destCidadeNorm && origUfNorm === destUfNorm) {
    return { distancia_km: 30, provider: 'local' };
  }

  const origemStr = `${origCidadeNorm}, ${origUfNorm}, Brasil`;
  const destinoStr = `${destCidadeNorm}, ${destUfNorm}, Brasil`;

  // 1. Tentar Google Maps API (se chave configurada)
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origemStr)}&destinations=${encodeURIComponent(destinoStr)}&mode=driving&language=pt-BR&key=${googleApiKey}`;
      const data = await fetchJson(url);
      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const meters = data.rows[0].elements[0].distance.value;
        const km = Math.round(meters / 1000);
        if (km > 0) {
          return {
            distancia_km: km,
            duracao_texto: data.rows[0].elements[0].duration?.text || '',
            provider: 'google_maps',
            origem: data.origin_addresses?.[0] || origemStr,
            destino: data.destination_addresses?.[0] || destinoStr
          };
        }
      }
    } catch (err) {
      console.warn('Aviso: Google Maps API falhou, usando fallback rodoviário:', err.message);
    }
  }

  // 2. Fallback Inteligente via Coordenadas das Cidades Notáveis ou Estados
  const origKey = `${origCidadeNorm}_${origUfNorm}`;
  const destKey = `${destCidadeNorm}_${destUfNorm}`;

  const coordOrig = CIDADES_NOTAVEIS[origKey] || COORDENADAS_UF[origUfNorm];
  const coordDest = CIDADES_NOTAVEIS[destKey] || COORDENADAS_UF[destUfNorm];

  if (coordOrig && coordDest) {
    const kmEstimado = calcularDistanciaHaversineKm(coordOrig.lat, coordOrig.lon, coordDest.lat, coordDest.lon);
    return {
      distancia_km: Math.max(20, kmEstimado),
      provider: 'matriz_rodoviaria_nacional',
      origem: `${origCidadeNorm}/${origUfNorm}`,
      destino: `${destCidadeNorm}/${destUfNorm}`
    };
  }

  // Fallback padrão se nada for encontrado
  return {
    distancia_km: 650,
    provider: 'estimativa_padrao',
    origem: `${origCidadeNorm}/${origUfNorm}`,
    destino: `${destCidadeNorm}/${destUfNorm}`
  };
}

module.exports = {
  consultarDistanciaRodoviaria,
  normalizarTexto
};
