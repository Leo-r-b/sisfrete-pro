require('dotenv').config();
const db = require('../src/config/database');
const { createClient } = require('@libsql/client');

async function wipeDatabaseOperationalData(targetEmpresaId = null) {
  console.log('--- INICIANDO LIMPEZA DE DADOS OPERACIONAIS DO BANCO ---');

  const tablesToWipe = [
    'mdfe_ctes_vinculados',
    'mdfes',
    'frete_eventos_rastreamento',
    'cobrancas_bancarias',
    'adiantamentos_historico',
    'financeiro_titulos',
    'veiculos_manutencoes',
    'veiculos_pneus',
    'fretes',
    'motoristas',
    'clientes'
  ];

  if (targetEmpresaId) {
    console.log(`Limpando apenas empresa ID #${targetEmpresaId}...`);
    db.prepare(`DELETE FROM mdfe_ctes_vinculados WHERE mdfe_id IN (SELECT id FROM mdfes WHERE empresa_id = ?) OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`).run(targetEmpresaId, targetEmpresaId);
    db.prepare(`DELETE FROM mdfes WHERE empresa_id = ?`).run(targetEmpresaId);
    db.prepare(`DELETE FROM frete_eventos_rastreamento WHERE frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`).run(targetEmpresaId);
    db.prepare(`DELETE FROM cobrancas_bancarias WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`).run(targetEmpresaId, targetEmpresaId);
    db.prepare(`DELETE FROM adiantamentos_historico WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`).run(targetEmpresaId, targetEmpresaId);
    db.prepare(`DELETE FROM financeiro_titulos WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`).run(targetEmpresaId, targetEmpresaId);
    db.prepare(`DELETE FROM veiculos_manutencoes WHERE empresa_id = ?`).run(targetEmpresaId);
    db.prepare(`DELETE FROM veiculos_pneus WHERE empresa_id = ?`).run(targetEmpresaId);
    db.prepare(`DELETE FROM fretes WHERE empresa_id = ?`).run(targetEmpresaId);
    db.prepare(`DELETE FROM motoristas WHERE empresa_id = ?`).run(targetEmpresaId);
    db.prepare(`DELETE FROM clientes WHERE empresa_id = ?`).run(targetEmpresaId);
  } else {
    console.log('Limpando dados operacionais de TODAS as empresas...');
    for (const table of tablesToWipe) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }

  console.log('✅ SQLite Local limpo com sucesso.');

  // Turso Cloud
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    console.log('Conectando ao Turso Cloud para sincronizar a limpeza...');
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    if (targetEmpresaId) {
      await turso.execute({
        sql: `DELETE FROM mdfe_ctes_vinculados WHERE mdfe_id IN (SELECT id FROM mdfes WHERE empresa_id = ?) OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`,
        args: [targetEmpresaId, targetEmpresaId]
      });
      await turso.execute({ sql: 'DELETE FROM mdfes WHERE empresa_id = ?', args: [targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM frete_eventos_rastreamento WHERE frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)', args: [targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM cobrancas_bancarias WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)', args: [targetEmpresaId, targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM adiantamentos_historico WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)', args: [targetEmpresaId, targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM financeiro_titulos WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)', args: [targetEmpresaId, targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM veiculos_manutencoes WHERE empresa_id = ?', args: [targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM veiculos_pneus WHERE empresa_id = ?', args: [targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM fretes WHERE empresa_id = ?', args: [targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM motoristas WHERE empresa_id = ?', args: [targetEmpresaId] });
      await turso.execute({ sql: 'DELETE FROM clientes WHERE empresa_id = ?', args: [targetEmpresaId] });
    } else {
      for (const table of tablesToWipe) {
        await turso.execute(`DELETE FROM ${table}`);
      }
    }
    console.log('✅ Turso Cloud limpo com sucesso.');
  }

  console.log('\n--- VERIFICAÇÃO PÓS-LIMPEZA ---');
  console.log('Empresas (Preservadas):', db.prepare('SELECT COUNT(*) as c FROM empresas').get().c);
  console.log('Usuários (Preservados):', db.prepare('SELECT COUNT(*) as c FROM users').get().c);
  console.log('Config Fiscal A1 (Preservada):', db.prepare('SELECT COUNT(*) as c FROM empresa_fiscal_config').get().c);
  console.log('Fretes / CT-es:', db.prepare('SELECT COUNT(*) as c FROM fretes').get().c);
  console.log('MDF-es:', db.prepare('SELECT COUNT(*) as c FROM mdfes').get().c);
  console.log('Financeiro:', db.prepare('SELECT COUNT(*) as c FROM financeiro_titulos').get().c);
  console.log('Manutenções Frota:', db.prepare('SELECT COUNT(*) as c FROM veiculos_manutencoes').get().c);
  console.log('Motoristas:', db.prepare('SELECT COUNT(*) as c FROM motoristas').get().c);
  console.log('Clientes:', db.prepare('SELECT COUNT(*) as c FROM clientes').get().c);
}

// Executar limpeza global
wipeDatabaseOperationalData().then(() => {
  console.log('\n🎉 LIMPEZA CONCLUÍDA! O sistema está pronto do absoluto zero para emissões reais.');
  process.exit(0);
}).catch(err => {
  console.error('Erro na limpeza:', err);
  process.exit(1);
});
