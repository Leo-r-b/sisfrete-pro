const https = require('https');
const fs = require('fs');
const forge = require('./node_modules/node-forge');

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
      reject(new Error('Timeout na comunicação'));
    });

    req.write(soapXml);
    req.end();
  });
}

async function consultarCadastro() {
  const pfxPath = 'C:\\Users\\ACER\\Downloads\\CERTIFICADO FSERV  LTDA E_33590616000119-2026.pfx';
  const pfxBuffer = fs.readFileSync(pfxPath);
  const { keyPem, certPem, caPems } = extrairCredenciaisCertificado(pfxBuffer, '09012611');

  const consCadXml = `<ConsCad xmlns="http://www.portalfiscal.inf.br/nfe" versao="2.00"><infCons><xServ>CONS-CAD</xServ><UF>PR</UF><CNPJ>76093731000190</CNPJ></infCons></ConsCad>`;
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4">${consCadXml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const url = 'https://nfe.sefa.pr.gov.br/nfe/CadConsultaCadastro4';

  const res = await postSefaz(url, soapEnvelope, keyPem, certPem, caPems);
  console.log(res.data);
}

consultarCadastro().catch(console.error);
