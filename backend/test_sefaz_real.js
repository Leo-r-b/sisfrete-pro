const fs = require('fs');
const https = require('https');
const forge = require('./node_modules/node-forge');

function extrairPemDoPfx(pfxBuffer, passphrase) {
  const pfxDer = forge.util.createBuffer(pfxBuffer.toString('binary'));
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, passphrase);

  let keyBag = null;
  let certBag = null;
  const caBags = [];

  for (let i = 0; i < pfx.safeContents.length; i++) {
    const sc = pfx.safeContents[i];
    for (let j = 0; j < sc.safeBags.length; j++) {
      const bag = sc.safeBags[j];
      if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag || bag.type === forge.pki.oids.keyBag) {
        keyBag = bag.key;
      } else if (bag.type === forge.pki.oids.certBag && bag.cert) {
        if (!certBag) {
          certBag = bag.cert;
        } else {
          caBags.push(bag.cert);
        }
      }
    }
  }

  const keyPem = forge.pki.privateKeyToPem(keyBag);
  const certPem = forge.pki.certificateToPem(certBag);
  const caPems = caBags.map(c => forge.pki.certificateToPem(c)).join('\n');

  return { keyPem, certPem, caPems };
}

function postSefaz(urlStr, soapXml, keyPem, certPem, caPems) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      key: keyPem,
      cert: certPem + (caPems ? '\n' + caPems : ''),
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapXml)
      },
      timeout: 20000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: body
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout ao conectar na SEFAZ'));
    });

    req.write(soapXml);
    req.end();
  });
}

async function testarConexaoRealSefaz() {
  const pfxPath = 'C:\\Users\\ACER\\Downloads\\CERTIFICADO FSERV  LTDA E_33590616000119-2026.pfx';
  const pfxBuffer = fs.readFileSync(pfxPath);
  const passphrase = '09012611';

  const { keyPem, certPem, caPems } = extrairPemDoPfx(pfxBuffer, passphrase);

  // Envelope SOAP 1.2 Sem caracteres de edição (Canonical / Minificado)
  const soapXml = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeStatusServicoV4"><consStatServCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServCTe></cteDadosMsg></soap12:Body></soap12:Envelope>`;

  const endpoints = [
    {
      nome: 'SEFAZ PR (Paraná) - CTeStatusServicoV4',
      url: 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeStatusServicoV4'
    },
    {
      nome: 'SVRS - CTeStatusServicoV4',
      url: 'https://cte-homologacao.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx'
    }
  ];

  console.log('\n📡 Testando Status do Serviço SEFAZ em Homologação com XML Canônico...');

  for (const ep of endpoints) {
    console.log(`\n======================================================`);
    console.log(`Testando: ${ep.nome}`);
    try {
      const res = await postSefaz(ep.url, soapXml, keyPem, certPem, caPems);
      console.log(`✅ Resposta recebida da SEFAZ! Status HTTP ${res.statusCode}`);
      console.log('XML Resposta da SEFAZ:');
      console.log(res.data);
    } catch (err) {
      console.error(`❌ Erro de conexão em ${ep.nome}:`, err.message);
    }
  }
}

testarConexaoRealSefaz().catch(console.error);
