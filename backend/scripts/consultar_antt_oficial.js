const https = require('https');
const querystring = require('querystring');

async function consultarAnttOficial(idTipoCarga, numeroEixos, distancia, isComposicao = false, isAltoDesempenho = false, isRetornoVazio = false) {
  return new Promise((resolve, reject) => {
    https.get('https://calculadorafrete.antt.gov.br/', (res) => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const tokenMatch = html.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
        const token = tokenMatch ? tokenMatch[1] : '';

        const postData = querystring.stringify({
          '__RequestVerificationToken': token,
          'Filtro.IdTipoCarga': String(idTipoCarga),
          'Filtro.NumeroEixos': String(numeroEixos),
          'Filtro.Distancia': String(distancia),
          'Filtro.IsComposicaoVeicular': isComposicao ? 'true' : 'false',
          'Filtro.IsAltoDesempenho': isAltoDesempenho ? 'true' : 'false',
          'Filtro.IsRetornoVazio': isRetornoVazio ? 'true' : 'false'
        });

        const req = https.request('https://calculadorafrete.antt.gov.br/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        }, (pRes) => {
          let pData = '';
          pRes.on('data', c => pData += c);
          pRes.on('end', () => {
            const cleanText = pData.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
            const valorMatch = pData.match(/R\$\s*([\d\.,]+)/i);
            const ccdMatch = pData.match(/deslocamento\s*\(CCD\):\s*([\d\.,]+)/i);
            const ccMatch = pData.match(/carga e descarga\s*\(CC\):\s*([\d\.,]+)/i);
            const opMatch = pData.match(/Operação de Transporte:\s*([^<]+)/i);

            resolve({
              valorOficial: valorMatch ? valorMatch[1] : null,
              ccd: ccdMatch ? ccdMatch[1] : null,
              cc: ccMatch ? ccMatch[1] : null,
              operacao: opMatch ? opMatch[1].trim() : null,
              html: pData
            });
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    }).on('error', reject);
  });
}

// Testar com o caso do print do usuário: Granel liquido (id=2), 6 eixos, 668km, isComposicao=false
consultarAnttOficial(2, 6, 668, false).then(r => {
  console.log('--- TESTE ANTT OFICIAL ---');
  console.log('Valor Oficial:', r.valorOficial);
  console.log('CCD:', r.ccd);
  console.log('CC:', r.cc);
  console.log('Operação:', r.operacao);
}).catch(console.error);

module.exports = { consultarAnttOficial };
