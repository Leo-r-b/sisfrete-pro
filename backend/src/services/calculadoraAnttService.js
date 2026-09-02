/**
 * Calculadora Oficial de Piso Mínimo de Frete ANTT
 * Regulamentação: Lei nº 13.703/2018, Resolução ANTT nº 5.867/2020 e Resolução ANTT nº 6.084/2026
 * Fonte Oficial Online: https://calculadorafrete.antt.gov.br/
 */

// Tabela B - Operações em que haja a contratação apenas do veículo automotor de cargas (PADRÃO OFICIAL)
const TABELA_B_ANTT = {
  granel_liquido: {
    nome: 'Granel líquido',
    coeficientes: {
      2: { ccd: 5.2831, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2831, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2831, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9986, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6714, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.1032, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8943, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  carga_geral: {
    nome: 'Carga Geral',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  granel_solido: {
    nome: 'Granel sólido',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  frigorificada: {
    nome: 'Frigorificada ou Aquecida',
    coeficientes: {
      2: { ccd: 6.1290, cc: 584.04, nome: 'Toco (2 eixos)' },
      3: { ccd: 6.1290, cc: 584.04, nome: 'Truck (3 eixos)' },
      4: { ccd: 6.1290, cc: 584.04, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 6.9472, cc: 645.26, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 7.7367, cc: 659.62, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 8.1867, cc: 775.96, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 9.1284, cc: 831.06, nome: 'Rodotrem (9 eixos)' }
    }
  },
  conteinerizada: {
    nome: 'Conteinerizada',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  neogranel: {
    nome: 'Neogranel',
    coeficientes: {
      2: { ccd: 5.2180, cc: 533.40, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.2180, cc: 533.40, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.2180, cc: 533.40, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 5.9334, cc: 594.62, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 6.6063, cc: 608.99, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.0381, cc: 720.31, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 7.8292, cc: 773.22, nome: 'Rodotrem (9 eixos)' }
    }
  },
  perigosa_liquido: {
    nome: 'Perigosa (granel líquido)',
    coeficientes: {
      2: { ccd: 6.0798, cc: 701.84, nome: 'Toco (2 eixos)' },
      3: { ccd: 6.0798, cc: 701.84, nome: 'Truck (3 eixos)' },
      4: { ccd: 6.0798, cc: 701.84, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 6.7953, cc: 763.06, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 7.4681, cc: 777.43, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.9181, cc: 893.76, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 8.7172, cc: 948.87, nome: 'Rodotrem (9 eixos)' }
    }
  },
  perigosa_geral: {
    nome: 'Perigosa (carga geral)',
    coeficientes: {
      2: { ccd: 5.6391, cc: 639.21, nome: 'Toco (2 eixos)' },
      3: { ccd: 5.6391, cc: 639.21, nome: 'Truck (3 eixos)' },
      4: { ccd: 5.6391, cc: 639.21, nome: 'Bitruck (4 eixos)' },
      5: { ccd: 6.3546, cc: 700.42, nome: 'Carreta 2 Eixos (5 eixos)' },
      6: { ccd: 7.0274, cc: 714.79, nome: 'Carreta LS (6 eixos)' },
      7: { ccd: 7.4774, cc: 831.13, nome: 'Bitrem (7 eixos)' },
      9: { ccd: 8.2766, cc: 886.23, nome: 'Rodotrem (9 eixos)' }
    }
  }
};

/**
 * Normaliza o tipo de carga
 */
function normalizarTipoCargaKey(tipo) {
  if (!tipo) return 'granel_liquido';
  const t = String(tipo).toLowerCase();

  if (t.includes('oleo') || t.includes('óleo') || t.includes('liquido') || t.includes('líquido') || t.includes('diesel') || t.includes('combustivel')) {
    return 'granel_liquido';
  }
  if (t.includes('soja') || t.includes('milho') || t.includes('grao') || t.includes('grão') || t.includes('solido') || t.includes('sólido') || t.includes('fertilizante')) {
    return 'granel_solido';
  }
  if (t.includes('frigo') || t.includes('carne') || t.includes('refrigerad') || t.includes('congelad') || t.includes('laticinio') || t.includes('leite')) {
    return 'frigorificada';
  }
  if (t.includes('conteiner') || t.includes('container')) {
    return 'conteinerizada';
  }
  if (t.includes('madeira') || t.includes('bobina') || t.includes('tubo') || t.includes('neogranel')) {
    return 'neogranel';
  }
  if (t.includes('perigos') || t.includes('inflamavel') || t.includes('quimico') || t.includes('químico')) {
    return t.includes('liquido') || t.includes('líquido') ? 'perigosa_liquido' : 'perigosa_geral';
  }
  if (t.includes('geral') || t.includes('alimento') || t.includes('farinha') || t.includes('manufaturado')) {
    return 'carga_geral';
  }

  return TABELA_B_ANTT[t] ? t : 'granel_liquido';
}

/**
 * Calcula o piso mínimo oficial da ANTT
 * Resolução ANTT nº 5.867/2020 e nº 6.084/2026
 * Tabela B - Operações em que haja a contratação apenas do veículo automotor de cargas
 */
function calcularPisoMinimoAntt({
  distanciaKm,
  numeroEixos = 6,
  tipoCarga = 'granel_liquido',
  custoPedagioPorEixoKm = 0.12,
  margemLucroDesejada = 15
}) {
  const cargaKey = normalizarTipoCargaKey(tipoCarga);
  const categoria = TABELA_B_ANTT[cargaKey] || TABELA_B_ANTT.granel_liquido;

  const nEixos = Number(numeroEixos) || 6;
  const eixosInfo = categoria.coeficientes[nEixos] || categoria.coeficientes[6];

  const distancia = Math.max(1, Number(distanciaKm || 0));

  // Fórmula Oficial ANTT: (Distância x CCD) + CC
  const ccd = Number(eixosInfo.ccd);
  const cc = Number(eixosInfo.cc);
  const pisoMinimoAntt = Number(((distancia * ccd) + cc).toFixed(2));

  // Pedágio
  const pedagioEstimado = Number((distancia * custoPedagioPorEixoKm * nEixos).toFixed(2));
  const custoTotalEstimado = Number((pisoMinimoAntt + pedagioEstimado).toFixed(2));

  // Precificação com Margem
  const margem = Number(margemLucroDesejada || 15) / 100;
  const precoVendaSugerido = Number((custoTotalEstimado / (1 - margem)).toFixed(2));
  const lucroEstimado = Number((precoVendaSugerido - custoTotalEstimado).toFixed(2));

  return {
    distanciaKm: distancia,
    numeroEixos: nEixos,
    veiculoNome: eixosInfo.nome,
    tipoCargaKey: cargaKey,
    tipoCargaNome: categoria.nome,
    operacaoTransporte: 'Tabela B - Operações em que Haja a Contratação Apenas do Veículo Automotor de Cargas',
    ccd,
    cc,
    pisoMinimoAntt,
    pedagioEstimado,
    custoTotalEstimado,
    margemLucroDesejada: Number(margemLucroDesejada),
    precoVendaSugerido,
    lucroEstimado,
    valorPorKm: Number((precoVendaSugerido / distancia).toFixed(2)),
    resolucao: 'Resolução ANTT nº 5.867/2020 e nº 6.084/2026'
  };
}

module.exports = {
  calcularPisoMinimoAntt,
  normalizarTipoCargaKey,
  TABELA_B_ANTT
};
