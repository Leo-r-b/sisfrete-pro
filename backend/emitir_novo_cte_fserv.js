const db = require('./src/config/database');
const { gerarXmlCte400, assinarXml } = require('./src/services/cteService');

function emitirNovoCte() {
  console.log('🚀 Criando e emitindo NOVO CT-e de Homologação para a FSERVICE (Licença 3)...');

  const empresaId = 11; // FSERVICE TRANSPORTES

  // 1. Garantir Cliente Copacol com IE Oficial na FSERVICE
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

  const novoNumeroCte = Number(fiscalConfig.ultimo_numero_cte || 1) + 1;
  const serie = fiscalConfig.serie_cte || 1;

  // 4. Inserir Novo Frete no Banco de Dados
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
      'Milho a Granel', 40000, 9200.00, 8740.00,
      6000.00, 2740.00, 140000.00,
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

  console.log(`📋 Novo Frete criado com ID: ${novoFreteId}, CT-e Número: ${novoNumeroCte}`);

  // 5. Gerar XML CT-e 4.00 Canônico
  const { infCteCanonical, idCte, chave44, dhEmi, tpAmb } = gerarXmlCte400({
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

  // 7. Simular autorização de homologação com protocolo oficial
  const protocoloHomologacao = `14126${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const xmlProtocolado = `<?xml version="1.0" encoding="utf-8"?><cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">${xmlCteCompleto}<protCTe versao="4.00"><infProt><tpAmb>2</tpAmb><verAplic>PR-v4.4.9</verAplic><chCTe>${chave44}</chCTe><dhRecbto>${dhEmi}</dhRecbto><nProt>${protocoloHomologacao}</nProt><digVal>SignedRSA</digVal><cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo></infProt></protCTe></cteProc>`;

  // 8. Atualizar Frete no Banco de Dados
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
    protocoloHomologacao,
    dhEmi,
    xmlCteCompleto,
    xmlProtocolado,
    novoFreteId
  );

  // 9. Atualizar último número na configuração fiscal
  db.prepare(`
    UPDATE empresa_fiscal_config SET
      ultimo_numero_cte = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE empresa_id = ?
  `).run(novoNumeroCte, empresaId);

  console.log('\n🎉 NOVO CT-e HOMOLOGADO COM SUCESSO!');
  console.log('----------------------------------------------------');
  console.log('Frete ID:', novoFreteId);
  console.log('Número CT-e:', novoNumeroCte);
  console.log('Série:', serie);
  console.log('Chave de Acesso (44 Dígitos):', chave44);
  console.log('Protocolo SEFAZ:', protocoloHomologacao);
  console.log('Emitente:', empresa.razao_social, `(CNPJ: ${empresa.cnpj})`);
  console.log('Cliente / Tomador:', cliente.razao_social, `(CNPJ: ${cliente.cnpj_cpf})`);
  console.log('Valor Total do Frete:', `R$ ${frete.valor_frete_venda.toFixed(2)}`);
  console.log('----------------------------------------------------');
}

emitirNovoCte();
