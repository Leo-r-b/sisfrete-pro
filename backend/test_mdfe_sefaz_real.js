/**
 * test_mdfe_sefaz_real.js
 * Teste ponta a ponta — MDF-e 3.00 com transmissão real à SEFAZ (SVRS)
 * FSERVICE LTDA — CNPJ 33.590.616/0001-19 — Ambiente: Homologação
 */

const db = require('./src/config/database');
const mdfeService = require('./src/services/mdfeService');

async function testarMdfeSefaz() {
  console.log('======================================================');
  console.log('🚀 TESTE MDF-e 3.00 — FSERVICE LTDA (Homologação)');
  console.log('📡 Autorizador: SEFAZ Virtual RS (SVRS)');
  console.log('======================================================\n');

  // 1. Carregar dados da empresa FSERVICE
  const empresa = db.prepare("SELECT * FROM empresas WHERE cnpj LIKE '%33590616000119%' OR codigo_licenca = '3'").get();
  if (!empresa) {
    console.error('❌ Empresa FSERVICE não encontrada no banco!');
    return;
  }
  console.log(`✅ Empresa: ${empresa.razao_social} (ID: ${empresa.id})`);

  // 2. Carregar configuração fiscal com certificado A1
  const configFiscal = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresa.id);
  if (!configFiscal) {
    console.error('❌ Configuração fiscal não encontrada!');
    return;
  }
  if (!configFiscal.certificado_a1_base64) {
    console.error('❌ Certificado A1 não está configurado no banco!');
    return;
  }
  console.log(`✅ Config Fiscal: ambiente=${configFiscal.ambiente} | RNTRC=${configFiscal.rntrc_padrao}`);
  console.log(`✅ Certificado A1: ${configFiscal.certificado_titular} (validade: ${configFiscal.certificado_validade?.substring(0, 10)})`);

  // 3. Buscar o último CT-e autorizado da FSERVICE para vincular
  const fretes = db.prepare(`
    SELECT * FROM fretes 
    WHERE empresa_id = ? AND status_sefaz = 'autorizado' 
    ORDER BY id DESC LIMIT 2
  `).all(empresa.id);

  if (fretes.length === 0) {
    console.error('❌ Nenhum CT-e autorizado encontrado para vincular ao MDF-e!');
    return;
  }

  console.log(`✅ CT-es autorizados encontrados: ${fretes.length}`);
  fretes.forEach(f => console.log(`   CT-e #${f.numero_cte} | Chave: ${f.chave_cte_44} | Prot: ${f.protocolo_sefaz}`));

  // 4. Montar dados do MDF-e de teste
  const proximoNumero = (db.prepare('SELECT MAX(numero_mdfe) as max FROM mdfes WHERE empresa_id = ?').get(empresa.id)?.max || 0) + 1;

  // Gerar CPF matematicamente válido para o condutor (SEFAZ valida DV do CPF)
  function gerarCpfValido() {
    const n = [0, 3, 4, 9, 8, 1, 2, 4, 9];
    let d1 = n.reduce((total, num, i) => total + num * (10 - i), 0) % 11;
    d1 = d1 < 2 ? 0 : 11 - d1;
    let d2 = [...n, d1].reduce((total, num, i) => total + num * (11 - i), 0) % 11;
    d2 = d2 < 2 ? 0 : 11 - d2;
    return [...n, d1, d2].join('');
  }
  const cpfCondutor = gerarCpfValido();

  const mdfe = {
    id: 99999,
    empresa_id: empresa.id,
    serie: 1,
    numero_mdfe: proximoNumero,
    uf_origem: 'PR',
    uf_destino: 'PR',
    ufs_percurso: '',
    motorista_nome: 'CARLOS EDUARDO DA SILVA',
    motorista_cpf: cpfCondutor,
    placa_veiculo: 'ABC1D23',
    placa_carreta: null,
    rntrc: configFiscal.rntrc_padrao || '53148055',
    valor_total_carga: fretes.reduce((s, f) => s + (f.valor_frete_venda || 0), 0),
    peso_total_kg: fretes.reduce((s, f) => s + (f.peso_kg || 0), 0),
    seguradora_nome: 'PORTO SEGURO CIA SEGUROS',
    numero_apolice: '075482390001'
  };

  // Normalizar peso e valor
  if (mdfe.peso_total_kg < 100) mdfe.peso_total_kg = 38000;
  if (mdfe.valor_total_carga < 10) mdfe.valor_total_carga = 5000;

  // CT-es vinculados
  const ctes = fretes.map(f => ({
    frete_id: f.id,
    chave_cte: f.chave_cte_44 || '',
    numero_cte: f.numero_cte,
    valor_frete: f.valor_frete_venda || 0,
    peso_kg: f.peso_kg || 0,
    municipio_descarregamento: f.destino_cidade || 'PARANAGUA',
    uf_descarregamento: f.destino_uf || 'PR'
  }));

  console.log(`\n📋 MDF-e a ser emitido:`);
  console.log(`   Número: ${mdfe.numero_mdfe} | Série: ${mdfe.serie}`);
  console.log(`   Rota: ${mdfe.uf_origem} → ${mdfe.uf_destino}`);
  console.log(`   Motorista: ${mdfe.motorista_nome} | CPF: ${mdfe.motorista_cpf}`);
  console.log(`   Placa: ${mdfe.placa_veiculo}`);
  console.log(`   CT-es: ${ctes.length} | Valor Total: R$ ${mdfe.valor_total_carga.toFixed(2)} | Peso: ${mdfe.peso_total_kg} kg`);

  // 5. EMITIR MDF-e na SEFAZ REAL
  console.log('\n⏳ Transmitindo MDF-e para SEFAZ (SVRS — Homologação)...');
  const startTime = Date.now();

  const resultado = await mdfeService.emitirMdfeSefaz({ mdfe, ctes, empresa, configFiscal });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️  Tempo de resposta: ${elapsed}s`);

  if (resultado.sucesso) {
    console.log('\n✅ ================================================');
    console.log('🎉 MDF-e AUTORIZADO PELA SEFAZ!');
    console.log('✅ ================================================');
    console.log(`   cStat    : ${resultado.cStat}`);
    console.log(`   xMotivo  : ${resultado.xMotivo}`);
    console.log(`   chMDFe   : ${resultado.chaveAcesso}`);
    console.log(`   nProt    : ${resultado.protocolo}`);
    console.log(`   dhRecbto : ${resultado.dhRecbto}`);

    // Salvar no banco de dados
    const insertResult = db.prepare(`
      INSERT INTO mdfes (
        empresa_id, serie, numero_mdfe, chave_mdfe, protocolo_autorizacao,
        data_autorizacao, uf_origem, uf_destino, ufs_percurso,
        motorista_nome, motorista_cpf, placa_veiculo, placa_carreta, rntrc,
        valor_total_carga, peso_total_kg, quantidade_ctes,
        status_mdfe, data_emissao, xml_mdfe
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'autorizado', DATE('now'), ?)
    `).run(
      empresa.id, mdfe.serie, mdfe.numero_mdfe,
      resultado.chaveAcesso, resultado.protocolo, resultado.dhRecbto,
      mdfe.uf_origem, mdfe.uf_destino, mdfe.ufs_percurso || '',
      mdfe.motorista_nome, mdfe.motorista_cpf, mdfe.placa_veiculo,
      mdfe.placa_carreta || null, mdfe.rntrc,
      mdfe.valor_total_carga, mdfe.peso_total_kg, ctes.length,
      resultado.xmlProtocolado || ''
    );

    const mdfeId = Number(insertResult.lastInsertRowid);

    // Vincular CT-es
    const stmtVinculo = db.prepare(`
      INSERT INTO mdfe_ctes_vinculados (mdfe_id, frete_id, chave_cte, numero_cte, valor_frete, peso_kg, municipio_descarregamento, uf_descarregamento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of ctes) {
      stmtVinculo.run(mdfeId, c.frete_id, c.chave_cte, c.numero_cte, c.valor_frete, c.peso_kg, c.municipio_descarregamento, c.uf_descarregamento);
    }

    console.log(`\n💾 MDF-e salvo no banco de dados (ID: ${mdfeId})`);

    // 6. TESTAR ENCERRAMENTO
    console.log('\n⏳ Testando Encerramento do MDF-e na SEFAZ...');
    const mdfeCompleto = db.prepare('SELECT * FROM mdfes WHERE id = ?').get(mdfeId);

    const resultadoEnc = await mdfeService.encerrarMdfeSefaz({
      mdfe: mdfeCompleto,
      municipio: 'SAO PAULO',
      codigoMunicipio: '3550308',
      uf: 'SP',
      configFiscal,
      empresa
    });

    if (resultadoEnc.sucesso) {
      console.log('\n✅ MDF-e ENCERRADO COM SUCESSO!');
      console.log(`   cStat    : ${resultadoEnc.cStat}`);
      console.log(`   xMotivo  : ${resultadoEnc.xMotivo}`);
      console.log(`   nProt    : ${resultadoEnc.protocolo}`);

      // Atualizar status no banco
      db.prepare(`
        UPDATE mdfes SET status_mdfe = 'encerrado', data_encerramento = CURRENT_TIMESTAMP,
        municipio_encerramento = 'SAO PAULO', uf_encerramento = 'SP', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(mdfeId);

    } else {
      console.log(`\n⚠️ Encerramento: cStat=${resultadoEnc.cStat} | ${resultadoEnc.xMotivo}`);
    }

    console.log('\n======================================================');
    console.log('📊 RESUMO FINAL DO TESTE MDF-e');
    console.log('======================================================');
    console.log(`  Empresa  : ${empresa.razao_social}`);
    console.log(`  CNPJ     : ${empresa.cnpj}`);
    console.log(`  Número   : ${mdfe.numero_mdfe}`);
    console.log(`  chMDFe   : ${resultado.chaveAcesso}`);
    console.log(`  Protocolo: ${resultado.protocolo}`);
    console.log(`  xMotivo  : ${resultado.xMotivo}`);
    console.log(`  Status BD: autorizado → encerrado`);
    console.log('======================================================');

  } else {
    console.log('\n❌ MDF-e REJEITADO PELA SEFAZ:');
    console.log(`   cStat  : ${resultado.cStat}`);
    console.log(`   xMotivo: ${resultado.xMotivo}`);
  }
}

testarMdfeSefaz().catch(err => {
  console.error('\n💥 Erro crítico no teste MDF-e:', err.message);
  console.error(err.stack);
});
