require('dotenv').config();
const { createClient } = require('@libsql/client');
const db = require('../src/config/database');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const tursoInfo = await turso.execute('PRAGMA table_info(empresas)');
  const tursoCols = new Set(tursoInfo.rows.map(c => c.name));

  const localEmps = db.prepare('SELECT * FROM empresas').all();
  console.log(`Encontradas ${localEmps.length} empresas no SQLite local.`);
  for (const emp of localEmps) {
    const keys = Object.keys(emp).filter(k => tursoCols.has(k) && emp[k] !== undefined && emp[k] !== null);
    const placeholders = keys.map(() => '?').join(', ');
    const cols = keys.join(', ');
    const vals = keys.map(k => emp[k]);
    await turso.execute({
      sql: `INSERT OR REPLACE INTO empresas (${cols}) VALUES (${placeholders})`,
      args: vals
    });
    console.log(`Empresa id=${emp.id} (#${emp.codigo_licenca} - ${emp.nome_fantasia}) sincronizada com Turso.`);
  }

  const res = await turso.execute('SELECT id, codigo_licenca, razao_social, nome_fantasia, modo_operacao FROM empresas');
  console.log('Empresas atualmente no Turso Cloud:', JSON.stringify(res.rows, null, 2));
}

main().catch(console.error);
