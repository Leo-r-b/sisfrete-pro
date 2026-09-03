const path = require('path');
const fs = require('fs');
const db = require('../config/database');

// Tabelas permitidas para navegação e administração segura
const ALLOWED_TABLES = [
  { id: 'fretes', label: 'Fretes & CT-es 4.00 (SEFAZ)', hasEmpresaId: true, primaryKey: 'id', categoria: 'operacional' },
  { id: 'motoristas', label: 'Motoristas & Freteiros', hasEmpresaId: true, primaryKey: 'id', categoria: 'cadastros' },
  { id: 'clientes', label: 'Clientes / Embarcadores', hasEmpresaId: true, primaryKey: 'id', categoria: 'cadastros' },
  { id: 'users', label: 'Usuários & Colaboradores', hasEmpresaId: true, primaryKey: 'id', categoria: 'seguranca' },
  { id: 'financeiro_titulos', label: 'Contas a Pagar e Receber', hasEmpresaId: true, primaryKey: 'id', categoria: 'financeiro' },
  { id: 'financeiro_baixas_historico', label: 'Histórico de Baixas & Pagamentos', hasEmpresaId: true, primaryKey: 'id', categoria: 'financeiro' },
  { id: 'adiantamentos_historico', label: 'Histórico de Adiantamentos', hasEmpresaId: true, primaryKey: 'id', categoria: 'financeiro' },
  { id: 'mdfes', label: 'Manifestos de Carga (MDF-e 3.00)', hasEmpresaId: true, primaryKey: 'id', categoria: 'operacional' },
  { id: 'veiculos', label: 'Veículos / Frotas', hasEmpresaId: true, primaryKey: 'id', categoria: 'frotas' },
  { id: 'veiculos_manutencoes', label: 'Manutenções Preventivas', hasEmpresaId: true, primaryKey: 'id', categoria: 'frotas' },
  { id: 'veiculos_pneus', label: 'Pneus e Rodagem', hasEmpresaId: true, primaryKey: 'id', categoria: 'frotas' },
  { id: 'empresas', label: 'Empresas / Licenças Multi-Tenant', hasEmpresaId: false, primaryKey: 'id', categoria: 'saas' },
  { id: 'licencas_cobrancas', label: 'Faturamento Mensal SaaS', hasEmpresaId: true, primaryKey: 'id', categoria: 'saas' },
  { id: 'empresa_fiscal_config', label: 'Configurações Fiscais (Certificado A1)', hasEmpresaId: true, primaryKey: 'id', categoria: 'config' },
  { id: 'empresa_config', label: 'Dados Bancários da Empresa', hasEmpresaId: true, primaryKey: 'id', categoria: 'config' },
  { id: 'frete_eventos_rastreamento', label: 'Eventos de Rastreamento (Torre)', hasEmpresaId: false, primaryKey: 'id', categoria: 'operacional' }
];

/**
 * Retorna resumo das tabelas com total de registros (geral e por licença se especificado)
 */
const getTableSummary = async (req, res) => {
  try {
    const empresaIdParam = req.query.empresa_id;
    const hasEmpresaFilter = empresaIdParam && empresaIdParam !== 'todas';
    const empId = hasEmpresaFilter ? Number(empresaIdParam) : null;

    // Obter lista de empresas cadastradas para o seletor
    const empresas = db.prepare(`
      SELECT id, COALESCE(codigo_licenca, CAST(id AS TEXT)) as codigo_licenca, nome_fantasia, razao_social, ativo, tipo_licenca
      FROM empresas 
      ORDER BY id ASC
    `).all();

    const summary = ALLOWED_TABLES.map(tab => {
      let totalGeral = 0;
      let totalLicenca = 0;

      try {
        const rowGeral = db.prepare(`SELECT COUNT(*) as count FROM ${tab.id}`).get();
        totalGeral = rowGeral ? rowGeral.count : 0;

        if (hasEmpresaFilter && tab.hasEmpresaId) {
          const rowLic = db.prepare(`SELECT COUNT(*) as count FROM ${tab.id} WHERE empresa_id = ?`).get(empId);
          totalLicenca = rowLic ? rowLic.count : 0;
        } else {
          totalLicenca = totalGeral;
        }
      } catch (err) {
        // Tabela pode não existir ainda em alguns ambientes
        totalGeral = 0;
        totalLicenca = 0;
      }

      return {
        ...tab,
        totalGeral,
        totalLicenca
      };
    });

    return res.json({
      empresas,
      tables: summary,
      selectedEmpresaId: hasEmpresaFilter ? empId : 'todas'
    });
  } catch (error) {
    console.error('Erro getTableSummary:', error);
    return res.status(500).json({ error: 'Erro ao obter resumo do banco de dados: ' + error.message });
  }
};

/**
 * Consulta dados paginados de uma tabela com filtro por licença e busca
 */
const getTableData = async (req, res) => {
  try {
    const { table, empresa_id, search, page = 1, limit = 50, order_by = 'id', order_dir = 'DESC' } = req.query;

    const tableConfig = ALLOWED_TABLES.find(t => t.id === table);
    if (!tableConfig) {
      return res.status(400).json({ error: `Tabela '${table}' não permitida ou inexistente.` });
    }

    // Obter colunas reais da tabela via PRAGMA
    const columnsInfo = db.prepare(`PRAGMA table_info(${tableConfig.id})`).all();
    const columnNames = columnsInfo.map(c => c.name);

    // Validação de ordenação
    const safeOrderBy = columnNames.includes(order_by) ? order_by : (columnNames[0] || 'id');
    const safeOrderDir = String(order_dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Montar cláusulas WHERE
    const whereParts = [];
    const params = [];

    const hasEmpresaFilter = empresa_id && empresa_id !== 'todas';
    if (hasEmpresaFilter && tableConfig.hasEmpresaId) {
      whereParts.push(`empresa_id = ?`);
      params.push(Number(empresa_id));
    }

    // Busca textual nas colunas TEXT / VARCHAR
    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      const searchableCols = columnsInfo
        .filter(c => ['TEXT', 'VARCHAR', 'CHAR', 'CLOB'].some(type => (c.type || '').toUpperCase().includes(type)))
        .map(c => c.name);

      if (searchableCols.length > 0) {
        const searchConditions = searchableCols.map(col => `${col} LIKE ?`).join(' OR ');
        whereParts.push(`(${searchConditions})`);
        searchableCols.forEach(() => params.push(term));
      }
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    // Contagem total de registros correspondentes
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM ${tableConfig.id} ${whereClause}`).get(...params);
    const totalRecords = countRow ? countRow.total : 0;

    // Paginação
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Consulta de registros
    const query = `
      SELECT * FROM ${tableConfig.id}
      ${whereClause}
      ORDER BY ${safeOrderBy} ${safeOrderDir}
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(query).all(...params, limitNum, offset);

    return res.json({
      table: tableConfig.id,
      label: tableConfig.label,
      columns: columnsInfo,
      rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Erro getTableData:', error);
    return res.status(500).json({ error: 'Erro ao consultar dados da tabela: ' + error.message });
  }
};

/**
 * Insere um novo registro na tabela selecionada
 */
const insertRecord = async (req, res) => {
  try {
    const { table, data } = req.body;
    if (!table || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Parâmetros inválidos: tabela e dados são obrigatórios.' });
    }

    const tableConfig = ALLOWED_TABLES.find(t => t.id === table);
    if (!tableConfig) {
      return res.status(400).json({ error: `Tabela '${table}' não permitida.` });
    }

    const columnsInfo = db.prepare(`PRAGMA table_info(${tableConfig.id})`).all();
    const validCols = columnsInfo.map(c => c.name).filter(c => c !== 'id'); // não incluir id autoincrement

    const fieldsToInsert = [];
    const values = [];

    for (const key of Object.keys(data)) {
      if (validCols.includes(key) && data[key] !== undefined) {
        fieldsToInsert.push(key);
        values.push(data[key]);
      }
    }

    if (fieldsToInsert.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para inserção.' });
    }

    const placeholders = fieldsToInsert.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableConfig.id} (${fieldsToInsert.join(', ')}) VALUES (${placeholders})`;
    
    const result = db.prepare(sql).run(...values);

    return res.json({
      success: true,
      message: `Registro inserido com sucesso na tabela '${tableConfig.label}'!`,
      newId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Erro insertRecord:', error);
    return res.status(500).json({ error: 'Erro ao inserir registro: ' + error.message });
  }
};

/**
 * Atualiza um registro existente na tabela indicada pelo ID
 */
const updateRecord = async (req, res) => {
  try {
    const { table, id, data } = req.body;
    if (!table || !id || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Parâmetros inválidos: tabela, id e dados são obrigatórios.' });
    }

    const tableConfig = ALLOWED_TABLES.find(t => t.id === table);
    if (!tableConfig) {
      return res.status(400).json({ error: `Tabela '${table}' não permitida.` });
    }

    const columnsInfo = db.prepare(`PRAGMA table_info(${tableConfig.id})`).all();
    const validCols = columnsInfo.map(c => c.name).filter(c => c !== 'id');

    const fieldsToUpdate = [];
    const values = [];

    for (const key of Object.keys(data)) {
      if (validCols.includes(key) && data[key] !== undefined) {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    // Atualizar updated_at se existir na tabela
    if (validCols.includes('updated_at') && !Object.keys(data).includes('updated_at')) {
      fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
    }

    values.push(id);
    const sql = `UPDATE ${tableConfig.id} SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    return res.json({
      success: true,
      message: `Registro #${id} atualizado com sucesso na tabela '${tableConfig.label}'!`
    });
  } catch (error) {
    console.error('Erro updateRecord:', error);
    return res.status(500).json({ error: 'Erro ao atualizar registro: ' + error.message });
  }
};

/**
 * Exclui um registro específico de uma tabela
 */
const deleteRecord = async (req, res) => {
  try {
    const { table, id } = req.body;
    if (!table || !id) {
      return res.status(400).json({ error: 'Tabela e ID são obrigatórios para exclusão.' });
    }

    const tableConfig = ALLOWED_TABLES.find(t => t.id === table);
    if (!tableConfig) {
      return res.status(400).json({ error: `Tabela '${table}' não permitida.` });
    }

    // Não permitir exclusão acidental da Licença 1 (Matriz padrão) ou do Super Admin
    if (tableConfig.id === 'empresas' && Number(id) === 1) {
      return res.status(403).json({ error: 'A Licença Matriz #1 não pode ser excluída por ser a âncora principal do sistema.' });
    }
    if (tableConfig.id === 'users') {
      const userObj = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
      if (userObj && userObj.role === 'super_admin') {
        const countSuper = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'").get();
        if (countSuper.count <= 1) {
          return res.status(403).json({ error: 'Não é permitido excluir o único usuário Super Admin do sistema.' });
        }
      }
    }

    db.prepare(`DELETE FROM ${tableConfig.id} WHERE id = ?`).run(id);

    return res.json({
      success: true,
      message: `Registro #${id} excluído com sucesso da tabela '${tableConfig.label}'.`
    });
  } catch (error) {
    console.error('Erro deleteRecord:', error);
    return res.status(500).json({ error: 'Erro ao excluir registro: ' + error.message });
  }
};

/**
 * Limpa dados de uma licença específica (escopo operacional ou completo)
 */
const purgeLicenca = async (req, res) => {
  try {
    const { empresa_id, scope = 'operacional' } = req.body;
    if (!empresa_id) {
      return res.status(400).json({ error: 'ID da licença é obrigatório.' });
    }

    const empId = Number(empresa_id);
    const emp = db.prepare('SELECT id, codigo_licenca, nome_fantasia, razao_social FROM empresas WHERE id = ?').get(empId);
    if (!emp) {
      return res.status(404).json({ error: 'Licença não encontrada.' });
    }

    const nomeLic = emp.nome_fantasia || emp.razao_social || `#${emp.id}`;

    // 1. Apagar dados dependentes de fretes e operacional
    db.prepare(`
      DELETE FROM adiantamentos_historico 
      WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)
    `).run(empId, empId);

    db.prepare(`
      DELETE FROM financeiro_titulos 
      WHERE empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)
    `).run(empId, empId);

    db.prepare(`
      DELETE FROM mdfes WHERE empresa_id = ?
    `).run(empId);

    try {
      db.prepare(`DELETE FROM frete_eventos_rastreamento WHERE frete_id IN (SELECT id FROM fretes WHERE empresa_id = ?)`).run(empId);
    } catch (e) {}

    try {
      db.prepare(`DELETE FROM cobrancas_bancarias WHERE empresa_id = ?`).run(empId);
    } catch (e) {}

    db.prepare(`DELETE FROM fretes WHERE empresa_id = ?`).run(empId);

    // 2. Frotas
    try {
      db.prepare(`DELETE FROM veiculos_manutencoes WHERE empresa_id = ?`).run(empId);
      db.prepare(`DELETE FROM veiculos_pneus WHERE empresa_id = ?`).run(empId);
      db.prepare(`DELETE FROM veiculos WHERE empresa_id = ?`).run(empId);
    } catch (e) {}

    // 3. Se for completo, apaga também motoristas e clientes
    if (scope === 'completo') {
      db.prepare(`DELETE FROM motoristas WHERE empresa_id = ?`).run(empId);
      db.prepare(`DELETE FROM clientes WHERE empresa_id = ?`).run(empId);
    }

    return res.json({
      success: true,
      message: `Dados ${scope === 'completo' ? 'completos' : 'operacionais'} da Licença "${nomeLic}" foram limpos com sucesso! Os cadastros da empresa e logins de acesso permanecem intactos.`
    });
  } catch (error) {
    console.error('Erro purgeLicenca:', error);
    return res.status(500).json({ error: 'Erro ao limpar dados da licença: ' + error.message });
  }
};

/**
 * Download direto do arquivo SQLite real do servidor Render
 */
const downloadBackup = async (req, res) => {
  try {
    // Caminhos possíveis para o banco local
    const possiblePaths = [
      path.resolve(__dirname, '../../sisfrete.db'),
      path.resolve(__dirname, '../../../sisfrete.db'),
      path.resolve(process.cwd(), 'backend/sisfrete.db'),
      path.resolve(process.cwd(), 'sisfrete.db')
    ];

    let foundPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return res.status(404).json({ error: 'Arquivo do banco de dados SQLite não encontrado no servidor.' });
    }

    const dataHoraStr = new Date().toISOString().slice(0, 10);
    const fileName = `sisfrete-backup-${dataHoraStr}.db`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    const fileStream = fs.createReadStream(foundPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro downloadBackup:', error);
    return res.status(500).json({ error: 'Erro ao gerar download do backup: ' + error.message });
  }
};

module.exports = {
  getTableSummary,
  getTableData,
  insertRecord,
  updateRecord,
  deleteRecord,
  purgeLicenca,
  downloadBackup,
};
