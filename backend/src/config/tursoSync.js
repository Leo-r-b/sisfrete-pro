const { createClient } = require('@libsql/client');
const path = require('node:path');
const fs = require('node:fs');

// Garantir carregamento das variáveis se ainda não carregadas
if (!process.env.TURSO_DATABASE_URL) {
  const envBackend = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envBackend)) {
    require('dotenv').config({ path: envBackend });
  }
}

const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://sisfrete-leo-r-b.aws-us-east-2.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc4NjMxMDcsImlkIjoiMDFhMDQ0ZjEtYzUwMS03OTFjLTgyMTYtNTYyYjA3OTNhNmNhIiwia2lkIjoid2pGSVBxSDJRcVZmX3E5Q2RUYlpiSWdDb3E5WWFUQUJYVm4xTXJwd1Z1USIsInJpZCI6IjY0NmEzYmYyLTJiNDYtNDk1My05MjZmLTMzMTJjYjNiNGE3NSJ9.xvZkVFq-61olLVmeqcaeVZA0t6V___B4nsCQPu45TmctOSpqGQGtUFO6VeUU-2KwTbOqrnK22H2ltKwNUZAVAA';

let tursoClient = null;
try {
  if (TURSO_URL && TURSO_TOKEN) {
    tursoClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
    console.log('📡 Cliente Turso Cloud inicializado com sucesso.');
  }
} catch (e) {
  console.warn('Aviso ao inicializar cliente Turso:', e.message);
}

// Lista completa de tabelas gerenciadas pelo SisFrete Pro
const SYNC_TABLES = [
  'empresas',
  'users',
  'empresa_config',
  'empresa_fiscal_config',
  'licencas_cobrancas',
  'motoristas',
  'clientes',
  'fretes',
  'carregamentos',
  'financeiro_titulos',
  'financeiro_baixas_historico',
  'adiantamentos_historico',
  'system_state',
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
 * Executado na inicialização (cold-start do Render) para recuperar o estado real da nuvem.
 */
async function syncFromTurso(localDb) {
  if (!tursoClient || isSyncing) return;
  isSyncing = true;
  lastSyncTimestamp = Date.now();

  try {
    // 1. Consulta todas as tabelas em paralelo em apenas 1 roundtrip de rede
    const tableQueries = SYNC_TABLES.map(table =>
      tursoClient.execute(`SELECT * FROM ${table}`)
        .then(res => ({ table, rows: res?.rows || [] }))
        .catch(() => ({ table, rows: [] }))
    );

    const remoteData = await Promise.all(tableQueries);

    // 2. Insere/Atualiza os dados no SQLite local
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
            // Ignora pequenas constraints pontuais
          }
        }

        // Se a tabela tem chave primária ID e recebemos registros da nuvem,
        // remove registros locais que foram apagados na nuvem
        if (localCols.includes('id') && remoteRows.length > 0) {
          const remoteIdSet = new Set(remoteRows.map(r => r.id).filter(id => id !== undefined && id !== null));
          const localRows = localDb.prepare(`SELECT id FROM ${table}`).all();
          for (const lRow of localRows) {
            if (!remoteIdSet.has(lRow.id)) {
              try {
                localDb.prepare(`DELETE FROM ${table} WHERE id = ?`).run(lRow.id);
              } catch (delErr) {}
            }
          }
        }
      } catch (tableErr) {
        // Ignora erro individual de tabela
      }
    }
    lastSyncTimestamp = Date.now();
    console.log('✅ Sincronização Turso Cloud ➔ SQLite local concluída com sucesso!');
  } catch (err) {
    console.warn('Aviso no syncFromTurso:', err.message);
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
    console.warn('Aviso ao replicar escrita para o Turso:', err.message, '| SQL:', sql.substring(0, 100));
  }
}

/**
 * Transforma uma query de INSERT para incluir o ID gerado localmente,
 * garantindo que a nuvem do Turso tenha exatamente o mesmo ID.
 */
function transformInsertWithId(sql, args, lastInsertRowid) {
  if (!lastInsertRowid) return { sql, args };

  // Verifica se é um INSERT INTO table (colunas) VALUES (...)
  const match = sql.match(/^\s*INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (match) {
    const tableName = match[1];
    const colList = match[2];
    const valList = match[3];
    const cols = colList.split(',').map(c => c.trim().toLowerCase());

    // Se já tinha id nas colunas, mantém
    if (cols.includes('id')) {
      return { sql, args };
    }

    // Injeta o id gerado e substitui por INSERT OR REPLACE para garantia de integridade
    const newSql = `INSERT OR REPLACE INTO ${tableName} (id, ${colList}) VALUES (?, ${valList})`;
    const newArgs = [Number(lastInsertRowid), ...args];
    return { sql: newSql, args: newArgs };
  }

  return { sql, args };
}

/**
 * Aguarda a finalização das escritas pendentes no Turso com timeout de segurança
 */
async function flushTursoWrites(timeoutMs = 800) {
  if (pendingWrites.length === 0) return;
  const current = [...pendingWrites];
  pendingWrites = [];
  
  await Promise.race([
    Promise.allSettled(current),
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ]);
}

/**
 * Aplica os wrappers transparentes de escrita no objeto DatabaseSync local.
 * Toda alteração feita localmente pelo SisFrete é espelhada no Turso em background.
 */
function applyTursoHooks(localDb) {
  if (localDb._tursoHooksApplied) return;
  localDb._tursoHooksApplied = true;

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
        
        // Replicar para o Turso em background com ID consistente
        let targetSql = sql;
        let targetArgs = args;

        if (upper.startsWith('INSERT') && result && result.lastInsertRowid) {
          const transformed = transformInsertWithId(sql, args, result.lastInsertRowid);
          targetSql = transformed.sql;
          targetArgs = transformed.args;
        }

        const p = pushToTurso(targetSql, targetArgs);
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

  console.log('🔗 Ganchos do Turso Cloud acoplados ao SQLite local com sucesso!');
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
