/**
 * brazilianCitiesGeo.js
 * Dicionário em memória com coordenadas geográficas de cidades e polos logísticos brasileiros
 * Permite posicionar caminhões e calcular agrupamentos por município no Mapa Operacional sem latência.
 */

// Mapa de Cidades Chave (Normalizadas: uppercase, sem acentos)
const BRAZIL_CITIES = {
  // Santa Catarina (SC)
  'MAFRA-SC': { lat: -26.1158, lng: -49.8053, nome: 'Mafra', uf: 'SC' },
  'JOINVILLE-SC': { lat: -26.3045, lng: -48.8487, nome: 'Joinville', uf: 'SC' },
  'ITAJAI-SC': { lat: -26.9078, lng: -48.6619, nome: 'Itajaí', uf: 'SC' },
  'NAVEGANTES-SC': { lat: -26.8978, lng: -48.6536, nome: 'Navegantes', uf: 'SC' },
  'SAO FRANCISCO DO SUL-SC': { lat: -26.2433, lng: -48.6381, nome: 'São Francisco do Sul', uf: 'SC' },
  'FLORIANOPOLIS-SC': { lat: -27.5954, lng: -48.5480, nome: 'Florianópolis', uf: 'SC' },
  'BLUMENAU-SC': { lat: -26.9194, lng: -49.0661, nome: 'Blumenau', uf: 'SC' },
  'CHAPECO-SC': { lat: -27.1004, lng: -52.6152, nome: 'Chapecó', uf: 'SC' },
  'CONCORDIA-SC': { lat: -27.2336, lng: -52.0256, nome: 'Concórdia', uf: 'SC' },
  'LAGES-SC': { lat: -27.8161, lng: -50.3261, nome: 'Lages', uf: 'SC' },
  'CRICIUMA-SC': { lat: -28.6775, lng: -49.3704, nome: 'Criciúma', uf: 'SC' },
  'VIDEIRA-SC': { lat: -27.0083, lng: -51.1528, nome: 'Videira', uf: 'SC' },
  'JOACABA-SC': { lat: -27.1772, lng: -51.5033, nome: 'Joaçaba', uf: 'SC' },
  'CANOINHAS-SC': { lat: -26.1775, lng: -50.3958, nome: 'Canoinhas', uf: 'SC' },
  'RIO NEGRINHO-SC': { lat: -26.2539, lng: -49.5169, nome: 'Rio Negrinho', uf: 'SC' },
  'SAO BENTO DO SUL-SC': { lat: -26.2503, lng: -49.3792, nome: 'São Bento do Sul', uf: 'SC' },
  'BRUSQUE-SC': { lat: -27.0978, lng: -48.9106, nome: 'Brusque', uf: 'SC' },
  'TUBARAO-SC': { lat: -28.4739, lng: -49.0158, nome: 'Tubarão', uf: 'SC' },
  'XANXERE-SC': { lat: -26.8747, lng: -52.4039, nome: 'Xanxerê', uf: 'SC' },
  'CAMPOS NOVOS-SC': { lat: -27.4019, lng: -51.2253, nome: 'Campos Novos', uf: 'SC' },

  // Paraná (PR)
  'RIO NEGRO-PR': { lat: -26.1039, lng: -49.7969, nome: 'Rio Negro', uf: 'PR' },
  'CURITIBA-PR': { lat: -25.4284, lng: -49.2733, nome: 'Curitiba', uf: 'PR' },
  'PARANAGUA-PR': { lat: -25.5205, lng: -48.5095, nome: 'Paranaguá', uf: 'PR' },
  'ANTONINA-PR': { lat: -25.4289, lng: -48.7128, nome: 'Antonina', uf: 'PR' },
  'SAO JOSE DOS PINHAIS-PR': { lat: -25.5347, lng: -49.2064, nome: 'São José dos Pinhais', uf: 'PR' },
  'ARAUCARIA-PR': { lat: -25.5925, lng: -49.4103, nome: 'Araucária', uf: 'PR' },
  'PONTA GROSSA-PR': { lat: -25.0945, lng: -50.1633, nome: 'Ponta Grossa', uf: 'PR' },
  'CASTRO-PR': { lat: -24.7911, lng: -50.0119, nome: 'Castro', uf: 'PR' },
  'CARAMBEI-PR': { lat: -24.9194, lng: -50.0983, nome: 'Carambeí', uf: 'PR' },
  'LONDRINA-PR': { lat: -23.3045, lng: -51.1696, nome: 'Londrina', uf: 'PR' },
  'MARINGA-PR': { lat: -23.4209, lng: -51.9331, nome: 'Maringá', uf: 'PR' },
  'CASCAVEL-PR': { lat: -24.9578, lng: -53.4595, nome: 'Cascavel', uf: 'PR' },
  'TOLEDO-PR': { lat: -24.7246, lng: -53.7432, nome: 'Toledo', uf: 'PR' },
  'FOZ DO IGUACU-PR': { lat: -25.5159, lng: -54.5854, nome: 'Foz do Iguaçu', uf: 'PR' },
  'GUARAPUAVA-PR': { lat: -25.3953, lng: -51.4625, nome: 'Guarapuava', uf: 'PR' },
  'SABAUDIA-PR': { lat: -23.3217, lng: -51.6247, nome: 'Sabáudia', uf: 'PR' },
  'ARAPONGAS-PR': { lat: -23.4158, lng: -51.4244, nome: 'Arapongas', uf: 'PR' },
  'APUCARANA-PR': { lat: -23.5519, lng: -51.4611, nome: 'Apucarana', uf: 'PR' },
  'CAMPO MOURAO-PR': { lat: -24.0458, lng: -52.3789, nome: 'Campo Mourão', uf: 'PR' },
  'PARANAVAI-PR': { lat: -23.0811, lng: -52.4647, nome: 'Paranavaí', uf: 'PR' },
  'UMUARAMA-PR': { lat: -23.7661, lng: -53.3250, nome: 'Umuarama', uf: 'PR' },
  'PATO BRANCO-PR': { lat: -26.2289, lng: -52.6711, nome: 'Pato Branco', uf: 'PR' },
  'FRANCISCO BELTRAO-PR': { lat: -26.0811, lng: -53.0550, nome: 'Francisco Beltrão', uf: 'PR' },
  'UNIAO DA VITORIA-PR': { lat: -26.2258, lng: -51.0869, nome: 'União da Vitória', uf: 'PR' },
  'LAPA-PR': { lat: -25.7686, lng: -49.7169, nome: 'Lapa', uf: 'PR' },
  'PALMEIRA-PR': { lat: -25.4267, lng: -50.0072, nome: 'Palmeira', uf: 'PR' },
  'IRATI-PR': { lat: -25.4678, lng: -50.6508, nome: 'Irati', uf: 'PR' },
  'TELEMACO BORBA-PR': { lat: -24.3239, lng: -50.6158, nome: 'Telêmaco Borba', uf: 'PR' },
  'ROLADIA-PR': { lat: -23.3100, lng: -51.3686, nome: 'Rolândia', uf: 'PR' },
  'CAMBE-PR': { lat: -23.2758, lng: -51.2789, nome: 'Cambé', uf: 'PR' },

  // Rio Grande do Sul (RS)
  'PORTO ALEGRE-RS': { lat: -30.0346, lng: -51.2177, nome: 'Porto Alegre', uf: 'RS' },
  'RIO GRANDE-RS': { lat: -32.0350, lng: -52.0986, nome: 'Rio Grande', uf: 'RS' },
  'PASSO FUNDO-RS': { lat: -28.2628, lng: -52.4067, nome: 'Passo Fundo', uf: 'RS' },
  'CAXIAS DO SUL-RS': { lat: -29.1678, lng: -51.1794, nome: 'Caxias do Sul', uf: 'RS' },
  'PELOTAS-RS': { lat: -31.7654, lng: -52.3376, nome: 'Pelotas', uf: 'RS' },
  'SANTA MARIA-RS': { lat: -29.6842, lng: -53.8069, nome: 'Santa Maria', uf: 'RS' },
  'CANOAS-RS': { lat: -29.9189, lng: -51.1806, nome: 'Canoas', uf: 'RS' },
  'IJUI-RS': { lat: -28.3878, lng: -53.9247, nome: 'Ijuí', uf: 'RS' },
  'CRUZ ALTA-RS': { lat: -28.6392, lng: -53.6047, nome: 'Cruz Alta', uf: 'RS' },
  'ERECHIM-RS': { lat: -27.6342, lng: -52.2739, nome: 'Erechim', uf: 'RS' },
  'LAJEADO-RS': { lat: -29.4667, lng: -51.9611, nome: 'Lajeado', uf: 'RS' },
  'URUGUAIANA-RS': { lat: -29.7547, lng: -57.0883, nome: 'Uruguaiana', uf: 'RS' },

  // São Paulo (SP)
  'SAO PAULO-SP': { lat: -23.5505, lng: -46.6333, nome: 'São Paulo', uf: 'SP' },
  'SANTOS-SP': { lat: -23.9618, lng: -46.3322, nome: 'Santos', uf: 'SP' },
  'CAMPINAS-SP': { lat: -22.9056, lng: -47.0608, nome: 'Campinas', uf: 'SP' },
  'RIBEIRAO PRETO-SP': { lat: -21.1767, lng: -47.8108, nome: 'Ribeirão Preto', uf: 'SP' },
  'SAO JOSE DO RIO PRETO-SP': { lat: -20.8113, lng: -49.3758, nome: 'São José do Rio Preto', uf: 'SP' },
  'PIRACICABA-SP': { lat: -22.7253, lng: -47.6492, nome: 'Piracicaba', uf: 'SP' },
  'SOROCABA-SP': { lat: -23.5015, lng: -47.4526, nome: 'Sorocaba', uf: 'SP' },
  'BAURU-SP': { lat: -22.3147, lng: -49.0606, nome: 'Bauru', uf: 'SP' },
  'PRESIDENTE PRUDENTE-SP': { lat: -22.1256, lng: -51.3889, nome: 'Presidente Prudente', uf: 'SP' },
  'MARILIA-SP': { lat: -22.2139, lng: -49.9458, nome: 'Marília', uf: 'SP' },
  'ARACATUBA-SP': { lat: -21.2089, lng: -50.4328, nome: 'Araçatuba', uf: 'SP' },
  'ASSIS-SP': { lat: -22.6617, lng: -50.4172, nome: 'Assis', uf: 'SP' },
  'LIMEIRA-SP': { lat: -22.5647, lng: -47.4017, nome: 'Limeira', uf: 'SP' },
  'PAULINIA-SP': { lat: -22.7611, lng: -47.1539, nome: 'Paulínia', uf: 'SP' },

  // Mato Grosso (MT)
  'CUIABA-MT': { lat: -15.6014, lng: -56.0979, nome: 'Cuiabá', uf: 'MT' },
  'RONDONOPOLIS-MT': { lat: -16.4674, lng: -54.6360, nome: 'Rondonópolis', uf: 'MT' },
  'SORRISO-MT': { lat: -12.5425, lng: -55.7214, nome: 'Sorriso', uf: 'MT' },
  'SINOP-MT': { lat: -11.8608, lng: -55.5097, nome: 'Sinop', uf: 'MT' },
  'LUCAS DO RIO VERDE-MT': { lat: -13.0536, lng: -55.9125, nome: 'Lucas do Rio Verde', uf: 'MT' },
  'NOVA MUTUM-MT': { lat: -13.8292, lng: -56.0792, nome: 'Nova Mutum', uf: 'MT' },
  'PRIMAVERA DO LESTE-MT': { lat: -15.5600, lng: -54.2981, nome: 'Primavera do Leste', uf: 'MT' },
  'CAMPO NOVO DO PARECIS-MT': { lat: -13.6750, lng: -57.8894, nome: 'Campo Novo do Parecis', uf: 'MT' },
  'SAPEZAL-MT': { lat: -13.5439, lng: -58.8142, nome: 'Sapezal', uf: 'MT' },
  'BARRA DO GARCAS-MT': { lat: -15.8942, lng: -52.2567, nome: 'Barra do Garças', uf: 'MT' },
  'TANGARA DA SERRA-MT': { lat: -14.6225, lng: -57.4933, nome: 'Tangará da Serra', uf: 'MT' },

  // Mato Grosso do Sul (MS)
  'CAMPO GRANDE-MS': { lat: -20.4697, lng: -54.6201, nome: 'Campo Grande', uf: 'MS' },
  'DOURADOS-MS': { lat: -22.2231, lng: -54.8117, nome: 'Dourados', uf: 'MS' },
  'TRES LAGOAS-MS': { lat: -20.7847, lng: -51.7042, nome: 'Três Lagoas', uf: 'MS' },
  'MARACAJU-MS': { lat: -21.6144, lng: -55.1683, nome: 'Maracaju', uf: 'MS' },
  'SAO GABRIEL DO OESTE-MS': { lat: -21.0142, lng: -54.5828, nome: 'São Gabriel do Oeste', uf: 'MS' },
  'CHAPADAO DO SUL-MS': { lat: -18.7933, lng: -52.6214, nome: 'Chapadão do Sul', uf: 'MS' },
  'NAVIRAI-MS': { lat: -23.0650, lng: -54.1906, nome: 'Naviraí', uf: 'MS' },
  'PONTA PORA-MS': { lat: -22.5361, lng: -55.7256, nome: 'Ponta Porã', uf: 'MS' },

  // Goiás (GO) e Distrito Federal (DF)
  'GOIANIA-GO': { lat: -16.6869, lng: -49.2648, nome: 'Goiânia', uf: 'GO' },
  'RIO VERDE-GO': { lat: -17.7925, lng: -50.9192, nome: 'Rio Verde', uf: 'GO' },
  'JATAI-GO': { lat: -17.8814, lng: -51.7144, nome: 'Jataí', uf: 'GO' },
  'ITUMBIARA-GO': { lat: -18.4189, lng: -49.2158, nome: 'Itumbiara', uf: 'GO' },
  'ANAPOLIS-GO': { lat: -16.3267, lng: -48.9534, nome: 'Anápolis', uf: 'GO' },
  'CRISTALINA-GO': { lat: -16.7686, lng: -47.6139, nome: 'Cristalina', uf: 'GO' },
  'CATALAO-GO': { lat: -18.1658, lng: -47.9464, nome: 'Catalão', uf: 'GO' },
  'BRASILIA-DF': { lat: -15.7975, lng: -47.8919, nome: 'Brasília', uf: 'DF' },

  // Minas Gerais (MG)
  'BELO HORIZONTE-MG': { lat: -19.9167, lng: -43.9345, nome: 'Belo Horizonte', uf: 'MG' },
  'UBERLANDIA-MG': { lat: -18.9186, lng: -48.2772, nome: 'Uberlândia', uf: 'MG' },
  'UBERABA-MG': { lat: -19.7472, lng: -47.9392, nome: 'Uberaba', uf: 'MG' },
  'PATOS DE MINAS-MG': { lat: -18.5789, lng: -46.5181, nome: 'Patos de Minas', uf: 'MG' },
  'POUSO ALEGRE-MG': { lat: -22.2300, lng: -45.9367, nome: 'Pouso Alegre', uf: 'MG' },
  'VARGINHA-MG': { lat: -21.5558, lng: -45.4339, nome: 'Varginha', uf: 'MG' },
  'CONTAGEM-MG': { lat: -19.9322, lng: -44.0539, nome: 'Contagem', uf: 'MG' },
  'JUIZ DE FORA-MG': { lat: -21.7587, lng: -43.3496, nome: 'Juiz de Fora', uf: 'MG' },
  'MONTES CLAROS-MG': { lat: -16.7281, lng: -43.8617, nome: 'Montes Claros', uf: 'MG' },

  // Bahia (BA) & Outros Estados
  'SALVADOR-BA': { lat: -12.9777, lng: -38.5016, nome: 'Salvador', uf: 'BA' },
  'LUIS EDUARDO MAGALHAES-BA': { lat: -12.0950, lng: -45.7958, nome: 'Luís Eduardo Magalhães', uf: 'BA' },
  'BARREIRAS-BA': { lat: -12.1528, lng: -44.9961, nome: 'Barreiras', uf: 'BA' },
  'FEIRA DE SANTANA-BA': { lat: -12.2667, lng: -38.9667, nome: 'Feira de Santana', uf: 'BA' },
  'ILHEUS-BA': { lat: -14.7936, lng: -39.0494, nome: 'Ilhéus', uf: 'BA' },
  'PALMAS-TO': { lat: -10.1844, lng: -48.3336, nome: 'Palmas', uf: 'TO' },
  'GURUPI-TO': { lat: -11.7292, lng: -49.0683, nome: 'Gurupi', uf: 'TO' },
  'PORTO VELHO-RO': { lat: -8.7619, lng: -63.9039, nome: 'Porto Velho', uf: 'RO' },
  'VILHENA-RO': { lat: -12.7406, lng: -60.1458, nome: 'Vilhena', uf: 'RO' },
  'BELEM-PA': { lat: -1.4558, lng: -48.4902, nome: 'Belém', uf: 'PA' },
  'BARCARENA-PA': { lat: -1.5058, lng: -48.6258, nome: 'Barcarena', uf: 'PA' },
  'RIO DE JANEIRO-RJ': { lat: -22.9068, lng: -43.1729, nome: 'Rio de Janeiro', uf: 'RJ' },
  'VITORIA-ES': { lat: -20.3155, lng: -40.3128, nome: 'Vitória', uf: 'ES' },
  'RECIFE-PE': { lat: -8.0476, lng: -34.8770, nome: 'Recife', uf: 'PE' },
  'FORTALEZA-CE': { lat: -3.7172, lng: -38.5433, nome: 'Fortaleza', uf: 'CE' }
};

// Coordenadas Centrais por Estado (Fallback caso cidade não esteja cadastrada)
const UF_CENTROIDS = {
  'SC': { lat: -27.2423, lng: -50.2189 },
  'PR': { lat: -24.8900, lng: -51.5500 },
  'RS': { lat: -30.0000, lng: -53.0000 },
  'SP': { lat: -22.1000, lng: -48.7000 },
  'MT': { lat: -12.6400, lng: -55.4200 },
  'MS': { lat: -20.7700, lng: -54.7800 },
  'GO': { lat: -15.9300, lng: -50.1400 },
  'MG': { lat: -18.1000, lng: -44.3800 },
  'BA': { lat: -12.5000, lng: -41.7000 },
  'RJ': { lat: -22.2500, lng: -42.6600 },
  'ES': { lat: -19.6800, lng: -40.5300 },
  'TO': { lat: -10.2500, lng: -48.2500 },
  'RO': { lat: -10.9000, lng: -62.8000 },
  'PA': { lat: -3.7900, lng: -52.4800 },
  'MA': { lat: -5.4200, lng: -45.4400 },
  'PI': { lat: -7.7100, lng: -42.7200 },
  'CE': { lat: -5.2000, lng: -39.5300 },
  'RN': { lat: -5.8100, lng: -36.5900 },
  'PB': { lat: -7.1200, lng: -36.7200 },
  'PE': { lat: -8.3800, lng: -37.8600 },
  'AL': { lat: -9.6200, lng: -36.8200 },
  'SE': { lat: -10.5700, lng: -37.4500 },
  'DF': { lat: -15.7975, lng: -47.8919 },
  'AC': { lat: -9.1000, lng: -70.5500 },
  'AM': { lat: -3.4700, lng: -65.1000 },
  'RR': { lat: 2.7300, lng: -61.3000 },
  'AP': { lat: 1.4100, lng: -51.7700 }
};

/**
 * Normaliza string removendo acentuação e espaços extras
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Obtém coordenadas aproximadas de uma cidade brasileira
 * @param {string} cidade Nome do município
 * @param {string} uf Sigla do estado (2 letras)
 * @returns {{ lat: number, lng: number }}
 */
function getCityCoordinates(cidade, uf) {
  const cleanCity = normalizeString(cidade);
  const cleanUf = normalizeString(uf);

  // 1. Tentar busca exata por Chave CIDADE-UF
  const key = `${cleanCity}-${cleanUf}`;
  if (BRAZIL_CITIES[key]) {
    return { lat: BRAZIL_CITIES[key].lat, lng: BRAZIL_CITIES[key].lng };
  }

  // 2. Tentar busca parcial de cidade no mesmo estado
  for (const [k, data] of Object.entries(BRAZIL_CITIES)) {
    if (data.uf === cleanUf && (cleanCity.includes(data.nome.toUpperCase()) || data.nome.toUpperCase().includes(cleanCity))) {
      return { lat: data.lat, lng: data.lng };
    }
  }

  // 3. Fallback por centróide da UF
  if (UF_CENTROIDS[cleanUf]) {
    // Pequeno offset pseudo-aleatório baseado no nome da cidade para não sobrepor marcadores da mesma UF
    const hash = cleanCity.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offsetLat = ((hash % 10) - 5) * 0.05;
    const offsetLng = (((hash >> 2) % 10) - 5) * 0.05;
    return {
      lat: Number((UF_CENTROIDS[cleanUf].lat + offsetLat).toFixed(4)),
      lng: Number((UF_CENTROIDS[cleanUf].lng + offsetLng).toFixed(4))
    };
  }

  // 4. Fallback padrão Brasil Central (Goiás / DF)
  return { lat: -15.7975, lng: -47.8919 };
}

module.exports = {
  getCityCoordinates,
  normalizeString,
  BRAZIL_CITIES
};
