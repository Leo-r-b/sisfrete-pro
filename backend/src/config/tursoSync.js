const { createClient } = require('@libsql/client');

const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://sisfrete-leo-r-b.aws-us-east-2.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc4NjMxMDcsImlkIjoiMDFhMDQ0ZjEtYzUwMS03OTFjLTgyMTYtNTYyYjA3OTNhNmNhIiwia2lkIjoid2pGSVBxSDJRcVZmX3E5Q2RUYlpiSWdDb3E5WWFUQUJYVm4xTXJwd1Z1USIsInJpZCI6IjY0NmEzYmYyLTJiNDYtNDk1My05MjZmLTMzMTJjYjNiNGE3NSJ9.xvZkVFq-61olLVmeqcaeVZA0t6V___B4nsCQPu45TmctOSpqGQGtUFO6VeUU-2KwTbOqrnK22H2ltKwNUZAVAA';

let tursoClient = null;
try {
  if (TURSO_URL && TURSO_TOKEN) {
    tursoClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
} catch (e) {
  console.warn('Aviso ao inicializar cliente Turso:', e.message);
}

// Lista de tabelas gerenciadas pelo SisFrete
const SYNC_TABLES = [
  'empresas',
  'users',
  'empresa_config',
  'empresa_fiscal_config',
  'licencas_cobrancas',
  'motoristas',
  'clientes',
  'fretes',
  'financeiro_titulos',
  'adiantamentos_historico',
  'cobrancas_bancarias',
  'mdfes',
  'mdfe_ctes_vinculados',
  'frete_eventos_rastreamento',
  'veiculos_manutencoes',
  'veiculos_pneus'
];

let lastSyncTimestamp = 0;
let isSyncing = false;
let pendingWrites = [];

/**
 * Puxa alterações do Turso Cloud para o SQLite local de forma PARALELIZADA e ultrarrápida.
 * NUNCA apaga dados locais automaticamente para evitar perda de dados em cold-starts.
 */
async function syncFromTurso(localDb) {
  if (!tursoClient || isSyncing) return;
  isSyncing = true;
  lastSyncTimestamp = Date.now(); // Marca imediatamente para evitar requisições concorrentes disparando múltiplos syncs

  try {
    // 1. Consulta TODAS as 16 tabelas em PARALELO em 1 único roundtrip de rede (~150ms)
    const tableQueries = SYNC_TABLES.map(table =>
      tursoClient.execute(`SELECT * FROM ${table}`)
        .then(res => ({ table, rows: res?.rows || [] }))
        .catch(() => ({ table, rows: [] }))
    );

    const remoteData = await Promise.all(tableQueries);

    // 2. Insere/Atualiza os dados no SQLite local em memória (processamento local < 10ms)
    for (const { table, rows: remoteRows } of remoteData) {
      if (!remoteRows || remoteRows.length === 0) continue;
      try {
        const localCols = localDb.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
        if (localCols.length === 0) continue;

        for (const row of remoteRows) {
          const keys = Object.keys(row).filter(k => localCols.includes(k) && row[k] !== undefined);
          if (keys.length === 0) continue;

          const placeholders = keys.map(() => '?').join(', ');
          const colList = keys.join(', ');
          const values = keys.map(k => row[k]);

          const sql = `INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`;
          try {
            localDb.prepare(sql).run(...values);
          } catch (insertErr) {
            // Ignorar erros individuais de constraint
          }
        }
      } catch (tableErr) {
        // Ignorar erro de tabela individual
      }
    }
    lastSyncTimestamp = Date.now();
  } catch (err) {
    console.warn('Aviso no sync do Turso:', err.message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Envia uma instrução SQL de escrita diretamente para o Turso Cloud
 */
async function pushToTurso(sql, args = []) {
  if (!tursoClient) return;

  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith('INSERT') && !upper.startsWith('UPDATE') && !upper.startsWith('DELETE') && !upper.startsWith('REPLACE')) {
    return;
  }

  try {
    const cleanArgs = Array.isArray(args) ? args.map(a => a === undefined ? null : a) : [];
    await tursoClient.execute({ sql, args: cleanArgs });
  } catch (err) {
    console.warn('Aviso ao enviar escrita para o Turso:', err.message, '| SQL:', sql.substring(0, 80));
  }
}

/**
 * Aguarda a finalização das escritas pendentes no Turso com timeout de segurança
 * (Impede que a interface fique congelada caso haja lentidão na rede com Ohio/EUA)
 */
async function flushTursoWrites(timeoutMs = 600) {
  if (pendingWrites.length === 0) return;
  const current = [...pendingWrites];
  pendingWrites = [];
  
  await Promise.race([
    Promise.allSettled(current),
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ]);
}

/**
 * Aplica os wrappers transparentes de escrita no objeto DatabaseSync local
 */
function applyTursoHooks(localDb) {
  const originalPrepare = localDb.prepare.bind(localDb);
  const originalExec = localDb.exec.bind(localDb);

  localDb.prepare = function (sql) {
    const stmt = originalPrepare(sql);
    const originalRun = stmt.run.bind(stmt);

    const upper = sql.trim().toUpperCase();
    const isWrite = upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE') || upper.startsWith('REPLACE');

    if (isWrite) {
      stmt.run = function (...args) {
        const result = originalRun(...args);
        // Registrar promessa de envio para o Turso
        const p = pushToTurso(sql, args);
        pendingWrites.push(p);
        return result;
      };
    }

    return stmt;
  };

  localDb.exec = function (sql) {
    const result = originalExec(sql);
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE') || upper.startsWith('REPLACE')) {
      const p = pushToTurso(sql, []);
      pendingWrites.push(p);
    }
    return result;
  };
}

module.exports = {
  tursoClient,
  syncFromTurso,
  pushToTurso,
  flushTursoWrites,
  applyTursoHooks,
  getLastSyncTimestamp: () => lastSyncTimestamp,
  resetSyncTimestamp: () => { lastSyncTimestamp = Date.now(); }
};
