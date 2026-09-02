const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();
const { createClient } = require('@libsql/client');

const paths = [
  path.join(__dirname, '..', '..', 'sisfrete.db'),
  path.join(__dirname, '..', 'sisfrete.db'),
  path.join(__dirname, 'sisfrete.db')
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log('Atualizando SQLite em:', p);
    const db = new DatabaseSync(p);
    try {
      db.prepare(`
        UPDATE empresas SET
          razao_social = 'COLORADO LOGISTICA E TRANSPORTES LTDA',
          nome_fantasia = 'Colorado Transportes',
          cidade = 'Maringá',
          uf = 'PR',
          telefone = '(41) 3999-4400',
          chave_pix = '48912345000160',
          modo_operacao = 'agenciamento_repasse',
          percentual_comissao_padrao = 5.0
        WHERE id = 4 OR codigo_licenca = '4'
      `).run();
      console.log('✅ Atualizado com sucesso:', db.prepare("SELECT id, codigo_licenca, razao_social, nome_fantasia, cidade, uf FROM empresas WHERE id = 4 OR codigo_licenca = '4'").all());
    } catch (e) {
      console.warn('Erro ao atualizar', p, e.message);
    }
  }
}

// Turso Cloud DB
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://sisfrete-leo-r-b.aws-us-east-2.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function updateTurso() {
  try {
    await client.execute({
      sql: `UPDATE empresas SET
        razao_social = 'COLORADO LOGISTICA E TRANSPORTES LTDA',
        nome_fantasia = 'Colorado Transportes',
        cidade = 'Maringá',
        uf = 'PR',
        telefone = '(41) 3999-4400',
        chave_pix = '48912345000160',
        modo_operacao = 'agenciamento_repasse',
        percentual_comissao_padrao = 5.0
      WHERE id = 4 OR codigo_licenca = '4'`
    });
    console.log('✅ Turso DB atualizado para Colorado Transportes!');
    const res = await client.execute("SELECT id, codigo_licenca, razao_social, nome_fantasia, cidade, uf, modo_operacao FROM empresas WHERE id = 4 OR codigo_licenca = '4'");
    console.log('Empresa 4 no Turso:', res.rows[0]);
  } catch (e) {
    console.error('Erro no Turso:', e);
  }
}

updateTurso();
