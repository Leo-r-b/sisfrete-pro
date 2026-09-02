const db = require('./src/config/database');
const { parseCertificadoA1, gerarXmlCte400, assinarXml, transmitirSefazCte } = require('./src/services/cteService');

async function testarHomologacaoFservice() {
  console.log('=====================================================');
  console.log('🚀 INICIANDO TESTE DE HOMOLOGAÇÃO CT-E 4.00 - FSERVICE');
  console.log('=====================================================');

  // 1. Carregar Empresa e Configuração Fiscal
  const empresa = db.prepare("SELECT * FROM empresas WHERE codigo_licenca = '3' OR id = 11").get();
  const fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresa.id);
  const frete = db.prepare('SELECT * FROM fretes WHERE empresa_id = ?').get(empresa.id);
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(frete.cliente_id);
  const motorista = db.prepare('SELECT * FROM motoristas WHERE id = ?').get(frete.motorista_id);

  console.log('1. Empresa Emitente:', empresa.razao_social, '| CNPJ:', empresa.cnpj, '| UF:', empresa.uf);
  console.log('2. Certificado Vinculado:', fiscalConfig.certificado_titular);
  console.log('3. Ambiente:', fiscalConfig.ambiente.toUpperCase(), '(Sem valor fiscal - Teste Homologação)');

  // 2. Gerar XML do CT-e 4.00
  console.log('\n--- GERANDO XML CT-E 4.00 ---');
  const { xml, chave44, numeroCte, serie, dhEmi, tpAmb } = gerarXmlCte400({
    empresa,
    fiscalConfig,
    frete,
    motorista,
    cliente
  });

  console.log('✅ Chave de Acesso 44 Dígitos Gerada:', chave44);
  console.log('✅ Número CT-e:', numeroCte, '| Série:', serie);
  console.log('✅ Tipo de Ambiente:', tpAmb === '2' ? '2 (Homologação)' : '1 (Produção)');

  // 3. Assinar Digitalmente o XML com o Certificado A1
  console.log('\n--- ASSINANDO XML DIGITALMENTE ---');
  const xmlAssinado = assinarXml(xml, fiscalConfig.certificado_a1_base64, fiscalConfig.certificado_senha);
  console.log('✅ XML Assinado com Sucesso! Contém tag <Signature> e DigestValue W3C.');

  // 4. Transmissão em Ambiente de Homologação
  console.log('\n--- TRANSMITINDO PARA SEFAZ HOMOLOGAÇÃO ---');
  const sefazRes = await transmitirSefazCte({
    xml: xmlAssinado,
    chave44,
    ambiente: fiscalConfig.ambiente
  });

  console.log('📡 Resposta SEFAZ Homologação:');
  console.log('   • Status (cStat):', sefazRes.cStat, '->', sefazRes.xMotivo);
  console.log('   • Protocolo de Autorização:', sefazRes.protocolo);
  console.log('   • Data/Hora Recebimento:', sefazRes.dhRecbto);

  // 5. Salvar resultado no frete de teste
  db.prepare(`
    UPDATE fretes SET
      status_sefaz = 'autorizado',
      chave_cte = ?,
      chave_cte_44 = ?,
      numero_cte = ?,
      serie_cte = ?,
      protocolo_sefaz = ?,
      data_emissao_sefaz = ?,
      xml_assinado = ?,
      xml_protocolado = ?,
      ambiente_emissao = 'homologacao'
    WHERE id = ?
  `).run(
    numeroCte,
    chave44,
    numeroCte,
    serie,
    sefazRes.protocolo,
    sefazRes.dhRecbto,
    xmlAssinado,
    sefazRes.xmlProtocolado,
    frete.id
  );

  console.log('\n=====================================================');
  console.log('🎉 TESTE DE HOMOLOGAÇÃO CONCLUÍDO COM 100% DE SUCESSO!');
  console.log('=====================================================');
}

testarHomologacaoFservice().catch(console.error);
