async function testLiveXmlImport() {
  const loginRes = await fetch('https://sisfrete-pro.vercel.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sisfrete.com', password: 'admin123' })
  });
  const token = (await loginRes.json()).token;

  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
  <CTe>
    <infCte Id="CTe35260811222333000144570010000045891001234567" versao="3.00">
      <ide>
        <nCT>4589</nCT>
        <serie>1</serie>
        <dhEmi>2026-08-25T10:00:00-03:00</dhEmi>
        <xMunIni>Cascavel</xMunIni>
        <UFIni>PR</UFIni>
        <xMunFim>Santos</xMunFim>
        <UFFim>SP</UFFim>
        <toma3><toma>0</toma></toma3>
      </ide>
      <rem>
        <xNome>AGROINDÚSTRIA SUL BRASIL S/A</xNome>
        <CNPJ>11222333000144</CNPJ>
      </rem>
      <vPrest><vTPrest>12500.00</vTPrest></vPrest>
      <infCTeNorm>
        <infCarga>
          <vCarga>185000.00</vCarga>
          <proPred>Soja a Granel</proPred>
          <infQ><qCarga>32000.00</qCarga></infQ>
        </infCarga>
        <infDoc>
          <infNFe><chave>35260811222333000144550010000458911001234567</chave></infNFe>
        </infDoc>
        <infModal><rodo><veic><placa>ABC1D23</placa></veic></rodo></infModal>
      </infCTeNorm>
    </infCte>
  </CTe>
</cteProc>`;

  const res = await fetch('https://sisfrete-pro.vercel.app/api/import/xml-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ xml: xmlSample })
  });

  console.log('Live import HTTP status:', res.status);
  const json = await res.json();
  console.log('Live import message:', json.message);
  console.log('Dados extraídos:', json.dados);
}

testLiveXmlImport();
