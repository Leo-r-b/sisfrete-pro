const { parseCteXml } = require('../src/services/cteXmlParser');

const xml1 = `<?xml version="1.0" encoding="UTF-8"?>
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
      <vPrest>
        <vTPrest>12500.00</vTPrest>
      </vPrest>
      <infCTeNorm>
        <infCarga>
          <vCarga>185000.00</vCarga>
          <proPred>Soja a Granel</proPred>
          <infQ>
            <cUnid>01</cUnid>
            <tpMed>PESO BRUTO</tpMed>
            <qCarga>32000.00</qCarga>
          </infQ>
        </infCarga>
        <infDoc>
          <infNFe>
            <chave>35260811222333000144550010000458911001234567</chave>
          </infNFe>
        </infDoc>
        <infModal>
          <rodo>
            <veic><placa>ABC1D23</placa></veic>
            <moto><xNome>Carlos Eduardo Silva</xNome><CPF>12345678900</CPF></moto>
          </rodo>
        </infModal>
      </infCTeNorm>
    </infCte>
  </CTe>
</cteProc>`;

const r1 = parseCteXml(xml1);
console.log('Test 1 (CT-e 3.0):', r1.success ? '✅ SUCCESS' : '❌ FAIL');
console.log('CT-e parsed data:', r1.data);
