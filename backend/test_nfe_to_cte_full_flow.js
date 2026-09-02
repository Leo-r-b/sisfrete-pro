const fs = require('fs');
const { parseCteXml } = require('./src/services/cteXmlParser');
const { gerarXmlCte400, assinarXml, transmitirSefazCte } = require('./src/services/cteService');
const db = require('./src/config/database');

async function testFullNfeToCteFlow() {
  console.log('🧪 =========================================================');
  console.log('🧪 TESTE DO FLUXO COMPLETO: IMPORTAÇÃO NF-e ➔ EMISSÃO CT-e');
  console.log('🧪 =========================================================\n');

  // 1. XML de NF-e Real / Padrão SEFAZ com DV válido
  const nfeChaveExemplo = '41260876093731000190550010000451231098765437';
  const xmlNfeMock = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${nfeChaveExemplo}" versao="4.00">
    <ide>
      <cUF>41</cUF>
      <cNF>09876543</cNF>
      <natOp>VENDA DE PRODUCAO DO ESTABELECIMENTO</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>45123</nNF>
      <dhEmi>2026-08-31T10:00:00-03:00</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>4103453</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>2</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>0</indFinal>
      <indPres>0</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0</verProc>
    </ide>
    <emit>
      <CNPJ>76093731000190</CNPJ>
      <xNome>COPACOL-COOPERATIVA AGROINDUSTRIAL CONSOLATA</xNome>
      <xFant>COPACOL CAFELANDIA</xFant>
      <enderEmit>
        <xLgr>RUA DES MUNHOZ DE MELLO</xLgr>
        <nro>176</nro>
        <xBairro>CENTRO</xBairro>
        <cMun>4103453</cMun>
        <xMun>CAFELANDIA</xMun>
        <UF>PR</UF>
        <CEP>85415000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>4330001106</IE>
      <CRT>3</CRT>
    </emit>
    <dest>
      <CNPJ>76093731000190</CNPJ>
      <xNome>COPACOL UNIDADE PORTUARIA PARANAGUA</xNome>
      <enderDest>
        <xLgr>AVENIDA PORTUARIA</xLgr>
        <nro>1000</nro>
        <xBairro>PORTO</xBairro>
        <cMun>4122404</cMun>
        <xMun>PARANAGUA</xMun>
        <UF>PR</UF>
        <CEP>83200000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>
      <indIEDest>1</indIEDest>
      <IE>4330001106</IE>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>SOJ001</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>SOJA EM GRAOS A GRANEL TIPO EXPORTACAO</xProd>
        <NCM>12019000</NCM>
        <CFOP>5101</CFOP>
        <uCom>TON</uCom>
        <qCom>38.0000</qCom>
        <vUnCom>3289.47</vUnCom>
        <vProd>125000.00</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>TON</uTrib>
        <qTrib>38.0000</qTrib>
        <vUnTrib>3289.47</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMS00>
            <orig>0</orig>
            <CST>00</CST>
            <modBC>3</modBC>
            <vBC>125000.00</vBC>
            <pICMS>12.00</pICMS>
            <vICMS>15000.00</vICMS>
          </ICMS00>
        </ICMS>
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vBC>125000.00</vBC>
        <vICMS>15000.00</vICMS>
        <vProd>125000.00</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vNF>125000.00</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>0</modFrete>
      <veicTransp>
        <placa>FSR1A23</placa>
        <UF>PR</UF>
      </veicTransp>
      <reboque>
        <placa>XYZ9E87</placa>
        <UF>PR</UF>
      </reboque>
      <vol>
        <qVol>1</qVol>
        <esp>GRANEL</esp>
        <pesoL>38000.000</pesoL>
        <pesoB>38000.000</pesoB>
      </vol>
    </transp>
  </infNFe>
</NFe>`;

  console.log('1️⃣ Testando Parser da NF-e...');
  const parseResult = parseCteXml(xmlNfeMock);
  if (!parseResult.success) {
    console.error('❌ Erro no parser:', parseResult.error);
    return;
  }

  const dadosNfe = parseResult.data;
  console.log('✅ Dados Extraídos da NF-e com Sucesso:');
  console.log({
    chave_nfe: dadosNfe.chave_nfe,
    numero_nfe: dadosNfe.numero_nfe,
    remetente: `${dadosNfe.remetente_nome} (CNPJ: ${dadosNfe.remetente_cnpj} / IE: ${dadosNfe.remetente_ie})`,
    destinatario: `${dadosNfe.destinatario_nome} (CNPJ: ${dadosNfe.destinatario_cnpj} / IE: ${dadosNfe.destinatario_ie})`,
    origem: `${dadosNfe.origem_cidade}/${dadosNfe.origem_uf} (IBGE: ${dadosNfe.origem_ibge})`,
    destino: `${dadosNfe.destino_cidade}/${dadosNfe.destino_uf} (IBGE: ${dadosNfe.destino_ibge})`,
    produto: dadosNfe.tipo_carga,
    peso_kg: dadosNfe.peso_kg,
    valor_mercadoria: dadosNfe.valor_mercadoria,
    placa_veiculo: dadosNfe.placa_veiculo,
    placa_carreta: dadosNfe.placa_carreta
  });

  // 2. Carregar Empresa e Certificado da FSERVICE
  const empresaId = 11;
  const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId);
  const fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);
  const motorista = db.prepare('SELECT * FROM motoristas WHERE empresa_id = ? LIMIT 1').get(empresaId);

  const novoNumeroCte = Number(fiscalConfig.ultimo_numero_cte || 2) + 1;
  const serie = fiscalConfig.serie_cte || 1;

  // 3. Montar Objeto de Frete com os dados da NF-e
  const freteParaEmitir = {
    id: 999,
    empresa_id: empresaId,
    numero_cte: String(novoNumeroCte),
    serie_cte: serie,
    tipo_operacao: 'padrao',
    origem_cidade: dadosNfe.origem_cidade,
    origem_uf: dadosNfe.origem_uf,
    destino_cidade: dadosNfe.destino_cidade,
    destino_uf: dadosNfe.destino_uf,
    placa_veiculo: dadosNfe.placa_veiculo,
    placa_carreta: dadosNfe.placa_carreta,
    tipo_carga: dadosNfe.tipo_carga,
    peso_kg: dadosNfe.peso_kg,
    valor_mercadoria: dadosNfe.valor_mercadoria,
    valor_frete_venda: 8500.00,
    valor_frete_compra: 8075.00,
    nfe_referencia: dadosNfe.nfe_referencia,
    nfe_chave: dadosNfe.chave_nfe,
    data_emissao: new Date().toISOString().substring(0, 10)
  };

  const cliente = {
    razao_social: dadosNfe.remetente_nome,
    cnpj_cpf: dadosNfe.remetente_cnpj,
    inscricao_estadual: dadosNfe.remetente_ie,
    cidade: dadosNfe.origem_cidade,
    uf: dadosNfe.origem_uf
  };

  console.log('\n2️⃣ Gerando XML do CT-e 4.00 com a NF-e vinculada (<infNFe>)...');
  const { infCteCanonical, chave44, dhEmi, tpAmb } = gerarXmlCte400({
    empresa,
    fiscalConfig: {
      ...fiscalConfig,
      ultimo_numero_cte: novoNumeroCte
    },
    frete: freteParaEmitir,
    motorista,
    cliente
  });

  console.log(`Chave do CT-e: ${chave44}`);
  console.log('Verificando tag infNFe no XML gerado:', infCteCanonical.includes(`<chave>${nfeChaveExemplo}</chave>`) ? '✅ TAG infNFe PRESENTE COM CHAVE CORRETA' : '❌ infNFe AUSENTE');

  console.log('\n3️⃣ Assinando XML com Certificado A1...');
  const { xmlCteCompleto } = assinarXml(
    infCteCanonical,
    fiscalConfig.certificado_a1_base64,
    fiscalConfig.certificado_senha,
    tpAmb
  );

  console.log('\n4️⃣ Transmitindo Síncrono para a SEFAZ PR (https://homologacao.cte.fazenda.pr.gov.br)...');
  const sefazRes = await transmitirSefazCte({
    xml: xmlCteCompleto,
    chave44,
    ambiente: 'homologacao',
    pfxBase64: fiscalConfig.certificado_a1_base64,
    password: fiscalConfig.certificado_senha,
    uf: 'PR'
  });

  console.log('\n📡 Resposta da SEFAZ PR:');
  console.log({
    cStat: sefazRes.cStat,
    xMotivo: sefazRes.xMotivo,
    protocolo: sefazRes.protocolo,
    dhRecbto: sefazRes.dhRecbto
  });

  if (sefazRes.cStat === '100') {
    console.log('\n🎉🎉🎉 SUCESSO TOTAL: CT-E COM NF-E REFERENCIADA AUTORIZADO PELA SEFAZ PR! 🎉🎉🎉');
  } else {
    console.error('❌ Falha na autorização:', sefazRes);
  }
}

testFullNfeToCteFlow().catch(console.error);
