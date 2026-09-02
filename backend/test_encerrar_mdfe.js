/**
 * test_encerrar_mdfe.js
 * Teste de encerramento do MDF-e autorizado na SEFAZ SVRS
 */

const db = require('./src/config/database');
const mdfeService = require('./src/services/mdfeService');

async function testarEncerramento() {
  console.log('🚀 Testando encerramento do MDF-e 41260833590616000119580010000000011477802026 na SEFAZ SVRS...');

  const empresa = db.prepare("SELECT * FROM empresas WHERE id = 11 OR cnpj LIKE '%33590616000119%' OR codigo_licenca = '3'").get();
  const configFiscal = db.prepare('SELECT * FROM empresa_fiscal_config WHERE empresa_id = ?').get(empresa.id);

  const mdfe = {
    chave_mdfe: '41260833590616000119580010000000011477802026',
    protocolo_autorizacao: '941260000017544',
    uf_destino: 'PR'
  };

  const res = await mdfeService.encerrarMdfeSefaz({
    mdfe,
    municipio: 'PARANAGUA',
    codigoMunicipio: '4122404',
    uf: 'PR',
    configFiscal,
    empresa
  });

  console.log('\n📊 Resultado Encerramento SEFAZ:', res);
}

testarEncerramento().catch(console.error);
