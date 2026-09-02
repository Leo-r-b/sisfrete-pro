const db = require('./src/config/database');
const { gerarXmlCte400, assinarXml, transmitirSefazCte } = require('./src/services/cteService');

async function emitirCteReal() {
  console.log('🚀 Iniciando Emissão Real e Transmissão Direta com SEFAZ PR...');

  const empresaId = 11; // FSERVICE

  // 1. Garantir Cliente Copacol
  let cliente = db.prepare('SELECT * FROM clientes WHERE empresa_id = ? AND cnpj_cpf LIKE \'%76093731000190%\'').get(empresaId);
  if (!cliente) {
    const ins = db.prepare(`
      INSERT INTO clientes (
        empresa_id, razao_social, nome_fantasia, cnpj_cpf,
        telefone, email, cidade, uf
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      empresaId,
      'COPACOL-COOPERATIVA AGROINDUSTRIAL CONSOLATA',
      'COPACOL Consolata',
      '76.093.731/0001-90',
      '(45) 3241-8000',
      'faturamento@copacol.com.br',
      'Cafelândia',
      'PR'
    );
    cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(ins.lastInsertRowid);
  }

  // 2. Motorista
  const motorista = db.prepare('SELECT * FROM motoristas WHERE empresa_id = ? LIMIT 1').get(empresaId);

  // 3. Empresa e Config Fiscal
  const empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId);
  const fiscalConfig = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresaId);

  const novoNumeroCte = Number(fiscalConfig.ultimo_numero_cte || 2) + 1;
  const serie = fiscalConfig.serie_cte || 1;

  // 4. Inserir Frete
  const insFrete = db.prepare(`
    INSERT INTO fretes (
      empresa_id, cliente_id, cliente_nome, motorista_id, motorista_nome, status_sefaz,
      numero_cte, serie_cte, tipo_operacao,
      origem_cidade, origem_uf, destino_cidade, destino_uf,
      placa_veiculo, placa_carreta,
      tipo_carga, peso_kg, valor_frete_venda, valor_frete_compra,
      valor_adiantamento, valor_saldo_motorista, valor_mercadoria,
      nfe_referencia, data_emissao, status_frete
    ) VALUES (
      ?, ?, ?, ?, ?, 'pendente',
      ?, ?, 'padrao',
      'Sabáudia', 'PR', 'Paranaguá', 'PR',
      'FSR1A23', 'XYZ9E87',
      'Soja em Grãos', 38000, 8500.00, 8075.00,
      5000.00, 3075.00, 125000.00,
      'NFe 4126 0876 0937 3100 0190 5500 1000 0451 2310 9876 5432',
      DATE('now'), 'em_transito'
    )
  `).run(
    empresaId,
    cliente.id,
    cliente.razao_social,
    motorista?.id || null,
    motorista?.nome || 'Carlos Alberto de Oliveira',
    String(novoNumeroCte),
    serie
  );

  const novoFreteId = Number(insFrete.lastInsertRowid);
  const frete = db.prepare('SELECT * FROM fretes WHERE id = ?').get(novoFreteId);

  console.log(`📋 Frete Criado no Banco: ID ${novoFreteId}, CT-e nº ${novoNumeroCte}`);

  // 5. Gerar XML CT-e 4.00 com schema RTC Homologado
  const { infCteCanonical, chave44, dhEmi } = gerarXmlCte400({
    empresa,
    fiscalConfig: {
      ...fiscalConfig,
      ultimo_numero_cte: novoNumeroCte
    },
    frete,
    motorista,
    cliente
  });

  // 6. Assinar Digitalmente com o Certificado A1 da FSERVICE
  const { xmlCteCompleto } = assinarXml(
    infCteCanonical,
    fiscalConfig.certificado_a1_base64,
    fiscalConfig.certificado_senha
  );

  console.log(`🔑 Chave de Acesso Gerada: ${chave44}`);
  console.log('📡 Transmitindo síncrono para a SEFAZ PR (https://homologacao.cte.fazenda.pr.gov.br)...');

  // 7. Transmissão Síncrona Real com a SEFAZ PR
  const sefazRes = await transmitirSefazCte({
    xml: xmlCteCompleto,
    chave44,
    ambiente: 'homologacao',
    pfxBase64: fiscalConfig.certificado_a1_base64,
    password: fiscalConfig.certificado_senha,
    uf: 'PR'
  });

  console.log('\n📡 Resposta da SEFAZ PR:', {
    cStat: sefazRes.cStat,
    xMotivo: sefazRes.xMotivo,
    protocolo: sefazRes.protocolo,
    dhRecbto: sefazRes.dhRecbto
  });

  if (sefazRes.cStat === '100') {
    // 8. Atualizar Banco de Dados com a Autorização Real
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
        ambiente_emissao = 'homologacao',
        motivo_rejeicao = NULL
      WHERE id = ?
    `).run(
      String(novoNumeroCte),
      chave44,
      String(novoNumeroCte),
      serie,
      sefazRes.protocolo,
      sefazRes.dhRecbto,
      xmlCteCompleto,
      sefazRes.xmlProtocolado,
      novoFreteId
    );

    db.prepare(`
      UPDATE empresa_fiscal_config SET
        ultimo_numero_cte = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE empresa_id = ?
    `).run(novoNumeroCte, empresaId);

    console.log('\n🎉🎉🎉 CT-e AUTORIZADO COM SUCESSO NA SEFAZ PR! 🎉🎉🎉');
    console.log('================================================================');
    console.log('Status SEFAZ:', sefazRes.cStat, '-', sefazRes.xMotivo);
    console.log('Chave de Acesso (44 Dígitos):', chave44);
    console.log('Número do Protocolo SEFAZ PR:', sefazRes.protocolo);
    console.log('Data/Hora de Autorização:', sefazRes.dhRecbto);
    console.log('Emitente:', empresa.razao_social, `(CNPJ: ${empresa.cnpj} / IE: 9086184599)`);
    console.log('Tomador / Cliente:', cliente.razao_social, `(CNPJ: 76.093.731/0001-90 / IE: 4330001106)`);
    console.log('Valor da Prestação:', `R$ ${frete.valor_frete_venda.toFixed(2)}`);
    console.log('================================================================');
  } else {
    console.error('❌ Falha na autorização SEFAZ:', sefazRes);
  }
}

emitCteReal = emitirCteReal();
