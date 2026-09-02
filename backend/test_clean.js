const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'sisfrete.db'));

db.exec(`
  DELETE FROM adiantamentos_historico;
  DELETE FROM fretes;
  DELETE FROM motoristas;
  DELETE FROM clientes;
  DELETE FROM sqlite_sequence WHERE name IN ('adiantamentos_historico', 'fretes', 'motoristas', 'clientes');
  CREATE TABLE IF NOT EXISTS system_state (key TEXT PRIMARY KEY, value TEXT);
  INSERT OR REPLACE INTO system_state (key, value) VALUES ('allow_empty', 'true');
  INSERT OR REPLACE INTO system_state (key, value) VALUES ('seeded', 'cleared');
`);

console.log('FRETES:', db.prepare('SELECT count(*) as total FROM fretes').get());
console.log('MOTORISTAS:', db.prepare('SELECT count(*) as total FROM motoristas').get());
console.log('CLIENTES:', db.prepare('SELECT count(*) as total FROM clientes').get());
console.log('USERS:', db.prepare('SELECT count(*) as total FROM users').get());
console.log('EMPRESA:', db.prepare('SELECT count(*) as total FROM empresa_config').get());
console.log('STATE:', db.prepare('SELECT * FROM system_state').all());
