const fs = require('fs');
const https = require('https');
const forge = require('./node_modules/node-forge');
const crypto = require('crypto');
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
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag)).getBytes();
  const certBase64 = Buffer.from(certDer, 'binary').toString('base64');
  const caPems = caBags.map(c => forge.pki.certificateToPem(c)).join('\n');

  return { keyBag, certBag, keyPem, certPem, certBase64, caPems };
}

function calcularDV(chave43) {
  let soma = 0;
  let peso = 2;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return String((resto === 0 || resto === 1) ? 0 : 11 - resto);
}

function getDhEmiBrasilia() {
  const d = new Date(Date.now() - 3 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`;
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

function gerarXmlRTC(creds) {
  const cUF = '41';
  const aamm = '2608';
  const mod = '57';
  const serie = 1;
  const nCT = 1;
  const serieClean = String(serie).padStart(3, '0');
  const nCTClean = String(nCT).padStart(9, '0');
  const tpEmis = '1';
  const cCT = Math.floor(10000000 + Math.random() * 90000000);
  const cCTClean = String(cCT).padStart(8, '0');
  const cnpjEmit = '33590616000119';
  const dhEmi = getDhEmiBrasilia();

  const chave43 = `${cUF}${aamm}${cnpjEmit}${mod}${serieClean}${nCTClean}${tpEmis}${cCTClean}`;
  const cDV = calcularDV(chave43);
  const chave44 = `${chave43}${cDV}`;
  const idCte = `CTe${chave44}`;

  const cnpjCliente = '76093731000190';
  const ieCliente = '4330001106';

  const imposto = `<imp><ICMS><ICMS00><CST>00</CST><vBC>8500.00</vBC><pICMS>12.00</pICMS><vICMS>1020.00</vICMS></ICMS00></ICMS><IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>8500.00</vBC><gIBSUF><pIBSUF>0.10</pIBSUF><vIBSUF>8.50</vIBSUF></gIBSUF><gIBSMun><pIBSMun>0.00</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun><vIBS>8.50</vIBS><gCBS><pCBS>0.90</pCBS><vCBS>76.50</vCBS></gCBS></gIBSCBS></IBSCBS><vTotDFe>8500.00</vTotDFe></imp>`;

  const infCteCanonical = `<infCte xmlns="http://www.portalfiscal.inf.br/cte" Id="${idCte}" versao="4.00"><ide><cUF>41</cUF><cCT>${cCTClean}</cCT><CFOP>5353</CFOP><natOp>PRESTACAO DE SERVICO DE TRANSPORTE</natOp><mod>57</mod><serie>${serie}</serie><nCT>${nCT}</nCT><dhEmi>${dhEmi}</dhEmi><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${cDV}</cDV><tpAmb>2</tpAmb><tpCTe>0</tpCTe><procEmi>0</procEmi><verProc>SisFretePRO_4.00</verProc><cMunEnv>4122701</cMunEnv><xMunEnv>SABAUDIA</xMunEnv><UFEnv>PR</UFEnv><modal>01</modal><tpServ>0</tpServ><cMunIni>4122701</cMunIni><xMunIni>SABAUDIA</xMunIni><UFIni>PR</UFIni><cMunFim>4122404</cMunFim><xMunFim>Paranagua</xMunFim><UFFim>PR</UFFim><retira>1</retira><indIEToma>1</indIEToma><toma3><toma>0</toma></toma3></ide><emit><CNPJ>${cnpjEmit}</CNPJ><IE>9086184599</IE><xNome>FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA</xNome><xFant>FSERV SERVICOS</xFant><enderEmit><xLgr>ROD PR 218</xLgr><nro>SN</nro><xBairro>RURAL</xBairro><cMun>4122701</cMun><xMun>SABAUDIA</xMun><CEP>86720000</CEP><UF>PR</UF><fone>4432551000</fone></enderEmit><CRT>3</CRT></emit><rem><CNPJ>${cnpjCliente}</CNPJ><IE>${ieCliente}</IE><xNome>CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome><enderReme><xLgr>RUA DES MUNHOZ DE MELLO</xLgr><nro>176</nro><xBairro>CENTRO</xBairro><cMun>4103453</cMun><xMun>CAFELANDIA</xMun><CEP>85415000</CEP><UF>PR</UF></enderReme></rem><dest><CNPJ>${cnpjCliente}</CNPJ><IE>${ieCliente}</IE><xNome>CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome><enderDest><xLgr>RODOVIA BR 376</xLgr><nro>KM 15</nro><xBairro>PORTO</xBairro><cMun>4122404</cMun><xMun>Paranagua</xMun><CEP>83200000</CEP><UF>PR</UF></enderDest></dest><vPrest><vTPrest>8500.00</vTPrest><vRec>8500.00</vRec><Comp><xNome>FRETE VALOR</xNome><vComp>8500.00</vComp></Comp></vPrest>${imposto}<infCTeNorm><infCarga><vCarga>125000.00</vCarga><proPred>Soja em Graos</proPred><infQ><cUnid>01</cUnid><tpMed>PESO BRUTO</tpMed><qCarga>38000.0000</qCarga></infQ></infCarga><infDoc><infOutros><tpDoc>99</tpDoc><descOutros>DECLARACAO DE TRANSPORTE HOMOLOGACAO</descOutros><nDoc>1001</nDoc><dEmi>2026-08-31</dEmi><vDocFisc>125000.00</vDocFisc></infOutros></infDoc><infModal versaoModal="4.00"><rodo><RNTRC>53148055</RNTRC></rodo></infModal></infCTeNorm></infCte>`;

  const infCteNoXml = infCteCanonical.replace(' xmlns="http://www.portalfiscal.inf.br/cte"', '');
  const digestValue = crypto.createHash('sha1').update(infCteCanonical, 'utf8').digest('base64');

  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${idCte}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;

  const signer = crypto.createSign('RSA-SHA1');
  signer.update(signedInfo, 'utf8');
  const signatureBase64 = signer.sign(creds.keyPem, 'base64');

  const signatureTag = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureBase64}</SignatureValue><KeyInfo><X509Data><X509Certificate>${creds.certBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;

  const qrCodeFinal = `http://www.fazenda.pr.gov.br/cte/qrcode?chCTe=${chave44}&amp;tpAmb=2`;
  const infCTeSupl = `<infCTeSupl><qrCodCTe>${qrCodeFinal}</qrCodCTe></infCTeSupl>`;

  const xmlCteCompleto = `<CTe xmlns="http://www.portalfiscal.inf.br/cte">${infCteNoXml}${infCTeSupl}${signatureTag}</CTe>`;

  return { xmlCteCompleto, chave44 };
}

async function testar() {
  const pfxPath = 'C:\\Users\\ACER\\Downloads\\CERTIFICADO FSERV  LTDA E_33590616000119-2026.pfx';
  const pfxBuffer = fs.readFileSync(pfxPath);
  const creds = extrairCredenciaisCertificado(pfxBuffer, '09012611');

  const sefazUrl = 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeRecepcaoSincV4';

  console.log(`\n🚀 Testando Transmissão CT-e 4.00 com vTotDFe na SEFAZ PR...`);
  const { xmlCteCompleto, chave44 } = gerarXmlRTC(creds);
  console.log(`Chave 44: ${chave44}`);

  const xmlGzipBase64 = zlib.gzipSync(Buffer.from(xmlCteCompleto, 'utf8')).toString('base64');
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeRecepcaoSincV4">${xmlGzipBase64}</cteDadosMsg></soap12:Body></soap12:Envelope>`;

  const res = await postSefaz(sefazUrl, soapEnvelope, creds.keyPem, creds.certPem, creds.caPems);
  console.log(`\n📡 Retorno SEFAZ PR (Status ${res.statusCode}):`);
  console.log(res.data);
}

testar().catch(console.error);
