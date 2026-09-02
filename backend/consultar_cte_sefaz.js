const fs = require('fs');
const https = require('https');
const forge = require('./node_modules/node-forge');
const zlib = require('zlib');

function extrairCredenciaisCertificado(pfxBuffer, passphrase) {
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
        if (!certBag) certBag = bag.cert;
        else caBags.push(bag.cert);
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
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data: body }));
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(soapXml);
    req.end();
  });
}

async function consultarCteSefaz(chave44) {
  const pfxPath = 'C:\\Users\\ACER\\Downloads\\CERTIFICADO FSERV  LTDA E_33590616000119-2026.pfx';
  const pfxBuffer = fs.readFileSync(pfxPath);
  const creds = extrairCredenciaisCertificado(pfxBuffer, '09012611');

  const xmlMsg = `<consSitCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chCTe>${chave44}</chCTe></consSitCTe>`;
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeConsultaV4">${xmlMsg}</cteDadosMsg></soap12:Body></soap12:Envelope>`;

  const sefazUrl = 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeConsultaV4';

  console.log(`\n🔍 Consultando CT-e ${chave44} diretamente no WebService CTeConsultaV4 da SEFAZ PR...`);
  const res = await postSefaz(sefazUrl, soapEnvelope, creds.keyPem, creds.certPem, creds.caPems);
  console.log(`📡 Retorno SEFAZ PR Consulta (Status ${res.statusCode}):`);
  console.log(res.data);
}

consultarCteSefaz('41260833590616000119570010000000021655807200').catch(console.error);
