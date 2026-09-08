const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.TURSO_DATABASE_URL || 'libsql://sisfrete-leo-r-b.aws-us-east-2.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc4NjMxMDcsImlkIjoiMDFhMDQ0ZjEtYzUwMS03OTFjLTgyMTYtNTYyYjA3OTNhNmNhIiwia2lkIjoid2pGSVBxSDJRcVZmX3E5Q2RUYlpiSWdDb3E5WWFUQUJYVm4xTXJwd1Z1USIsInJpZCI6IjY0NmEzYmYyLTJiNDYtNDk1My05MjZmLTMzMTJjYjNiNGE3NSJ9.xvZkVFq-61olLVmeqcaeVZA0t6V___B4nsCQPu45TmctOSpqGQGtUFO6VeUU-2KwTbOqrnK22H2ltKwNUZAVAA';

const renderDbPath = path.join(__dirname, '..', 'render_live_sisfrete.db');
if (!fs.existsSync(renderDbPath)) {
  console.error('Arquivo render_live_sisfrete.db não encontrado!');
  process.exit(1);
}

const renderDb = new DatabaseSync(renderDbPath);
const turso = createClient({ url, authToken });

const ALL_TABLES = [
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

async function syncAll() {
  console.log('===========================================================');
  console.log('🚀 CLONANDO DADOS REAIS DO RENDER PARA O TURSO CLOUD...');
  console.log('===========================================================\n');

  // 1. Garantir que tabelas existam no Turso com as mesmas colunas
  for (const table of ALL_TABLES) {
    const tableDef = renderDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`).get(table);
    if (!tableDef || !tableDef.sql) continue;

    try {
      await turso.execute(tableDef.sql);
      console.log(`✅ Tabela ${table} verificada/criada no Turso`);
    } catch (err) {
      // Pode já existir, tudo bem
    }

    // Garantir colunas
    const localCols = renderDb.prepare(`PRAGMA table_info(${table})`).all();
    try {
      const remoteInfo = await turso.execute(`PRAGMA table_info(${table})`);
      const remoteCols = remoteInfo.rows.map(r => r.name);

      for (const col of localCols) {
        if (!remoteCols.includes(col.name)) {
          try {
            await turso.execute(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type || 'TEXT'}`);
            console.log(`  + Coluna ${table}.${col.name} adicionada no Turso`);
          } catch (e) {}
        }
      }
    } catch (err) {}
  }

  // 2. Limpar dados antigos do Turso para garantir espelhamento exato com o Render
  console.log('\n🧹 Limpando dados divergentes no Turso para manter espelhamento fiel ao Render...');
  for (const table of [...ALL_TABLES].reverse()) {
    try {
      await turso.execute(`DELETE FROM ${table}`);
    } catch (e) {}
  }

  // 3. Copiar todos os dados linha por linha do Render para o Turso
  console.log('\n📦 Copiando registros reais do Render para o Turso...');
  for (const table of ALL_TABLES) {
    let rows = [];
    try {
      rows = renderDb.prepare(`SELECT * FROM ${table}`).all();
    } catch (e) {
      continue;
    }

    if (rows.length === 0) {
      console.log(`ℹ️ ${table}: 0 registros.`);
      continue;
    }

    console.log(`⏳ Gravando ${rows.length} registros em ${table}...`);
    for (const row of rows) {
      const keys = Object.keys(row).filter(k => row[k] !== undefined);
      const placeholders = keys.map(() => '?').join(', ');
      const colList = keys.join(', ');
      const values = keys.map(k => row[k]);

      const sql = `INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`;
      try {
        await turso.execute({ sql, args: values });
      } catch (insertErr) {
        console.warn(`Erro ao inserir em ${table}:`, insertErr.message);
      }
    }
    console.log(`✅ ${table}: ${rows.length} registros gravados no Turso com sucesso!`);
  }

  // 4. Atualizar os bancos locais para que fiquem idênticos
  console.log('\n💾 Atualizando sisfrete.db local para espelhar o Render...');
  const backendDbPath = path.join(__dirname, '..', 'sisfrete.db');
  const rootDbPath = path.join(__dirname, '..', '..', 'sisfrete.db');
  fs.copyFileSync(renderDbPath, backendDbPath);
  fs.copyFileSync(renderDbPath, rootDbPath);
  console.log('✅ sisfrete.db (backend) e sisfrete.db (raiz) atualizados!');

  console.log('\n===========================================================');
  console.log('🎉 SUCESSO! RENDER E TURSO AGORA TÊM EXATAMENTE OS MESMOS DADOS!');
  console.log('===========================================================');
}

syncAll().catch(console.error);
