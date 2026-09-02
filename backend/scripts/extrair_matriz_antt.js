const https = require('https');
const querystring = require('querystring');
const fs = require('fs');

const TIPOS_CARGA_ANTT = [
  { id: 2, key: 'granel_liquido', nome: 'Granel líquido' },
  { id: 5, key: 'carga_geral', nome: 'Carga Geral' },
  { id: 1, key: 'granel_solido', nome: 'Granel sólido' },
  { id: 3, key: 'frigorificada', nome: 'Frigorificada ou Aquecida' },
  { id: 4, key: 'conteinerizada', nome: 'Conteinerizada' },
  { id: 6, key: 'neogranel', nome: 'Neogranel' },
  { id: 8, key: 'perigosa_liquido', nome: 'Perigosa (granel líquido)' },
  { id: 11, key: 'perigosa_geral', nome: 'Perigosa (carga geral)' },
  { id: 7, key: 'perigosa_solido', nome: 'Perigosa (granel sólido)' },
  { id: 9, key: 'perigosa_frigorificada', nome: 'Perigosa (Frigorificada ou Aquecida)' },
  { id: 10, key: 'perigosa_conteinerizada', nome: 'Perigosa (conteinerizada)' },
  { id: 12, key: 'granel_pressurizada', nome: 'Carga Granel Pressurizada' }
];

const EIXOS = [2, 3, 4, 5, 6, 7, 9];

function getAnttData(idTipo, eixos, isComposicao = false) {
  return new Promise((resolve) => {
    https.get('https://calculadorafrete.antt.gov.br/', (res) => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const tokenMatch = html.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
        const token = tokenMatch ? tokenMatch[1] : '';

        const postData = querystring.stringify({
          '__RequestVerificationToken': token,
          'Filtro.IdTipoCarga': String(idTipo),
          'Filtro.NumeroEixos': String(eixos),
          'Filtro.Distancia': '1000', // 1000 km para isolar CCD e CC
          'Filtro.IsComposicaoVeicular': isComposicao ? 'true' : 'false',
          'Filtro.IsAltoDesempenho': 'false',
          'Filtro.IsRetornoVazio': 'false'
        });

        const req = https.request('https://calculadorafrete.antt.gov.br/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0'
          }
        }, (pRes) => {
          let pData = '';
          pRes.on('data', c => pData += c);
          pRes.on('end', () => {
            const ccdMatch = pData.match(/Coeficiente de custo de deslocamento \(CCD\):\s*<[^>]+>\s*([\d\.,]+)\s*<\/[^>]+>/i) ||
                             pData.match(/deslocamento\s*\(CCD\):\s*([0-9\.,]+)/i);
            const ccMatch = pData.match(/Coeficiente de custo de carga e descarga \(CC\):\s*<[^>]+>\s*([\d\.,]+)\s*<\/[^>]+>/i) ||
                            pData.match(/carga e descarga\s*\(CC\):\s*([0-9\.,]+)/i);
            const valorMatch = pData.match(/valorFrete">\s*R\$\s*([\d\.,]+)/i);

            const ccdVal = ccdMatch ? parseFloat(ccdMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
            const ccVal = ccMatch ? parseFloat(ccMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
            const valorTot = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

            resolve({
              idTipo,
              eixos,
              isComposicao,
              ccd: ccdVal,
              cc: ccVal,
              valor1000km: valorTot
            });
          });
        });
        req.on('error', () => resolve(null));
        req.write(postData);
        req.end();
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  console.log('Extraindo matriz oficial de coeficientes da ANTT...');
  const resultadoTabelaB = {};
  const resultadoTabelaA = {};

  for (const tipo of TIPOS_CARGA_ANTT) {
    resultadoTabelaB[tipo.key] = { nome: tipo.nome, coeficientes: {} };
    resultadoTabelaA[tipo.key] = { nome: tipo.nome, coeficientes: {} };

    for (const nEixos of EIXOS) {
      // Tabela B (Apenas Veículo Automotor)
      const dataB = await getAnttData(tipo.id, nEixos, false);
      if (dataB && dataB.ccd) {
        resultadoTabelaB[tipo.key].coeficientes[nEixos] = { ccd: dataB.ccd, cc: dataB.cc };
        console.log(`Tabela B [${tipo.key}] ${nEixos} eixos => CCD: ${dataB.ccd} | CC: ${dataB.cc}`);
      }
      
      // Tabela A (Composição Veicular)
      const dataA = await getAnttData(tipo.id, nEixos, true);
      if (dataA && dataA.ccd) {
        resultadoTabelaA[tipo.key].coeficientes[nEixos] = { ccd: dataA.ccd, cc: dataA.cc };
      }
    }
  }

  fs.writeFileSync('./scripts/tabela_antt_extraida.json', JSON.stringify({ tabelaB: resultadoTabelaB, tabelaA: resultadoTabelaA }, null, 2));
  console.log('Salvo em tabela_antt_extraida.json com sucesso!');
}

run();
