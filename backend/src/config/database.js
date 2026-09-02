const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

let dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'sisfrete.db');

// Se estiver no Render com disco montado ou DATABASE_PATH personalizado
if (process.env.DATABASE_PATH) {
  const customDir = path.dirname(process.env.DATABASE_PATH);
  if (!fs.existsSync(customDir)) {
    try {
      fs.mkdirSync(customDir, { recursive: true });
    } catch (e) {}
  }
  const defaultDb = path.join(__dirname, '..', '..', 'sisfrete.db');
  if (!fs.existsSync(process.env.DATABASE_PATH) && fs.existsSync(defaultDb)) {
    try {
      fs.copyFileSync(defaultDb, process.env.DATABASE_PATH);
    } catch (e) {}
  }
} else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDir = '/tmp';
  const tmpDbPath = path.join(tmpDir, 'sisfrete.db');
  try {
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, tmpDbPath);
    }
    dbPath = tmpDbPath;
  } catch (err) {
    console.warn('Aviso: erro ao configurar banco em /tmp:', err.message);
  }
}

const db = new DatabaseSync(dbPath);

// Enable foreign keys
try {
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_licenca TEXT UNIQUE,
      limite_logins INTEGER DEFAULT 5,
      valor_mensalidade REAL DEFAULT 350.00,
      dia_vencimento INTEGER DEFAULT 10,
      data_adesao DATE DEFAULT (DATE('now')),
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT,
      cnpj TEXT,
      telefone TEXT,
      email TEXT,
      chave_pix TEXT,
      banco TEXT,
      agencia TEXT,
      conta TEXT,
      cidade TEXT,
      uf TEXT,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS licencas_cobrancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      mes_referencia TEXT NOT NULL, -- Formato YYYY-MM (ex: '2026-08')
      data_vencimento DATE NOT NULL, -- Vencimento todo dia 10 (ex: '2026-08-10')
      valor REAL NOT NULL DEFAULT 350.00,
      status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado', 'cancelado'
      data_pagamento DATE,
      forma_pagamento TEXT DEFAULT 'PIX', -- 'PIX', 'Boleto', 'Transferência', 'Cartão', 'Dinheiro'
      comprovante_ref TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      UNIQUE (empresa_id, mes_referencia)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operador', -- admin, financeiro, operador, super_admin
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS empresa_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT,
      cnpj TEXT,
      telefone TEXT,
      email TEXT,
      chave_pix TEXT,
      banco TEXT,
      agencia TEXT,
      conta TEXT,
      cidade TEXT,
      uf TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS motoristas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      nome TEXT NOT NULL,
      cpf_cnpj TEXT,
      telefone TEXT,
      pix_chave TEXT,
      pix_tipo TEXT DEFAULT 'CPF', -- CPF, CNPJ, Celular, Email, Aleatoria
      placa_cavalo TEXT,
      placa_carreta TEXT,
      tipo_veiculo TEXT DEFAULT 'Truck', -- Toco, Truck, Bitruck, Carreta, Bitrem, Rodotrem
      cidade TEXT,
      uf TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT,
      cnpj_cpf TEXT,
      telefone TEXT,
      email TEXT,
      cidade TEXT,
      uf TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fretes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      tipo_operacao TEXT DEFAULT 'padrao', -- 'padrao', 'triangular'
      numero_cte TEXT,
      serie_cte TEXT,
      chave_cte TEXT,
      data_emissao DATE,
      cliente_id INTEGER,
      cliente_nome TEXT NOT NULL,
      motorista_id INTEGER,
      motorista_nome TEXT NOT NULL,
      origem_cidade TEXT NOT NULL,
      origem_uf TEXT NOT NULL,
      destino_cidade TEXT NOT NULL,
      destino_uf TEXT NOT NULL,
      placa_veiculo TEXT,
      placa_carreta TEXT,
      tipo_carga TEXT,
      peso_kg REAL DEFAULT 0,
      valor_mercadoria REAL DEFAULT 0,
      
      -- Dados do Segundo CT-e (Operação Triangular / Venda Triangular)
      numero_cte_2 TEXT,
      serie_cte_2 TEXT,
      chave_cte_2 TEXT,
      cliente_id_2 INTEGER,
      cliente_nome_2 TEXT,
      cliente_cnpj_2 TEXT,
      valor_frete_venda_2 REAL DEFAULT 0,
      tipo_carga_2 TEXT,
      peso_kg_2 REAL DEFAULT 0,
      status_recebimento_cliente_2 TEXT DEFAULT 'pendente',
      data_vencimento_cliente_2 DATE,
      
      -- Valores Financeiros de Subcontratação
      valor_frete_venda REAL NOT NULL DEFAULT 0,  -- Cobrado do cliente 1
      valor_frete_compra REAL NOT NULL DEFAULT 0, -- Pago ao freteiro (Valor único da viagem)
      valor_comissao REAL NOT NULL DEFAULT 0,     -- Margem bruta (venda total - compra)
      percentual_margem REAL NOT NULL DEFAULT 0,  -- % sobre frete de venda total
      
      -- Adiantamento e Descontos do Freteiro
      percentual_adiantamento REAL DEFAULT 0,
      valor_adiantamento REAL DEFAULT 0,
      valor_pedagio REAL DEFAULT 0,
      valor_combustivel REAL DEFAULT 0,
      outros_descontos REAL DEFAULT 0,
      valor_acrescimos REAL DEFAULT 0,
      valor_saldo_motorista REAL NOT NULL DEFAULT 0, -- Compra - adiantamento - descontos + acrescimos
      
      -- Status de Controle
      status_frete TEXT DEFAULT 'em_transito', -- 'em_transito', 'entregue', 'cancelado'
      status_pagamento_motorista TEXT DEFAULT 'pendente', -- 'pendente', 'adiantamento_pago', 'quitado'
      status_recebimento_cliente TEXT DEFAULT 'pendente', -- 'pendente', 'faturado', 'recebido'
      
      data_previsao_entrega DATE,
      data_entrega DATE,
      data_vencimento_cliente DATE,
      observacoes TEXT,
      xml_bruto TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
      FOREIGN KEY (cliente_id_2) REFERENCES clientes(id) ON DELETE SET NULL,
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS adiantamentos_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      frete_id INTEGER NOT NULL,
      tipo TEXT NOT NULL, -- 'adiantamento', 'saldo', 'abastecimento', 'pedagio', 'estadia', 'outro'
      valor REAL NOT NULL,
      data_pagamento DATE DEFAULT (DATE('now')),
      forma_pagamento TEXT DEFAULT 'PIX', -- 'PIX', 'TED', 'Dinheiro', 'Cheque'
      comprovante_ref TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS empresa_fiscal_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1 UNIQUE,
      ambiente TEXT DEFAULT 'homologacao', -- 'homologacao' (tpAmb=2) ou 'producao' (tpAmb=1)
      certificado_a1_base64 TEXT,
      certificado_senha TEXT,
      certificado_validade DATETIME,
      certificado_titular TEXT,
      certificado_cnpj TEXT,
      serie_cte INTEGER DEFAULT 1,
      ultimo_numero_cte INTEGER DEFAULT 0,
      rntrc_padrao TEXT,
      aliquota_icms_padrao REAL DEFAULT 12.0,
      cst_icms_padrao TEXT DEFAULT '00',
      cfop_padrao_estadual TEXT DEFAULT '5353',
      cfop_padrao_interestadual TEXT DEFAULT '6353',
      natureza_operacao TEXT DEFAULT 'PRESTACAO DE SERVICO DE TRANSPORTE',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financeiro_titulos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      tipo TEXT NOT NULL, -- 'pagar' | 'receber'
      origem TEXT DEFAULT 'avulso', -- 'frete_cte' | 'avulso' | 'recorrente'
      frete_id INTEGER,
      categoria TEXT NOT NULL, -- 'frete_motorista', 'repasse_agenciamento', 'energia', 'agua', 'internet', 'aluguel', 'combustivel', 'manutencao', 'seguro', 'contador', 'salarios', 'impostos', 'faturamento_frete', 'comissao_agenciamento', 'outros'
      categoria_nome TEXT,
      descricao TEXT NOT NULL,
      pessoa_nome TEXT,
      pessoa_documento TEXT,
      valor REAL NOT NULL,
      valor_pago REAL DEFAULT 0,
      data_emissao DATE DEFAULT (DATE('now')),
      data_vencimento DATE NOT NULL,
      data_pagamento DATE,
      status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'parcial', 'atrasado', 'cancelado'
      forma_pagamento TEXT DEFAULT 'PIX', -- 'PIX', 'Boleto', 'Transferência', 'Dinheiro', 'Cartão'
      comprovante_ref TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS mdfes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      serie INTEGER DEFAULT 1,
      numero_mdfe INTEGER NOT NULL,
      chave_mdfe TEXT UNIQUE,
      protocolo_autorizacao TEXT,
      data_autorizacao DATETIME,
      uf_origem TEXT NOT NULL,
      uf_destino TEXT NOT NULL,
      ufs_percurso TEXT,
      motorista_nome TEXT,
      motorista_cpf TEXT,
      placa_veiculo TEXT,
      placa_carreta TEXT,
      rntrc TEXT,
      seguradora_nome TEXT,
      seguradora_cnpj TEXT,
      numero_apolice TEXT,
      numero_averbacao TEXT,
      valor_total_carga REAL DEFAULT 0,
      peso_total_kg REAL DEFAULT 0,
      quantidade_ctes INTEGER DEFAULT 0,
      status_mdfe TEXT DEFAULT 'rascunho',
      data_emissao DATE DEFAULT (DATE('now')),
      data_encerramento DATETIME,
      municipio_encerramento TEXT,
      uf_encerramento TEXT,
      xml_mdfe TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mdfe_ctes_vinculados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mdfe_id INTEGER NOT NULL,
      frete_id INTEGER,
      chave_cte TEXT NOT NULL,
      numero_cte TEXT,
      valor_frete REAL DEFAULT 0,
      peso_kg REAL DEFAULT 0,
      municipio_descarregamento TEXT,
      uf_descarregamento TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mdfe_id) REFERENCES mdfes(id) ON DELETE CASCADE,
      FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS frete_eventos_rastreamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      frete_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      descricao TEXT NOT NULL,
      cidade TEXT,
      uf TEXT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      latitude REAL,
      longitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS veiculos_manutencoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      placa TEXT NOT NULL,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      quilometragem INTEGER,
      data_manutencao DATE NOT NULL,
      proxima_manutencao_km INTEGER,
      proxima_manutencao_data DATE,
      oficina_nome TEXT,
      valor REAL NOT NULL,
      status TEXT DEFAULT 'realizada',
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS veiculos_pneus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      placa TEXT NOT NULL,
      posicao TEXT NOT NULL,
      numero_fogo TEXT,
      marca_modelo TEXT,
      sulco_mm REAL,
      recapagens INTEGER DEFAULT 0,
      status TEXT DEFAULT 'em_uso',
      km_instalacao INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cobrancas_bancarias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER DEFAULT 1,
      titulo_id INTEGER,
      frete_id INTEGER,
      cliente_nome TEXT NOT NULL,
      cliente_documento TEXT,
      valor REAL NOT NULL,
      data_vencimento DATE NOT NULL,
      linha_digitavel TEXT,
      codigo_barras TEXT,
      pix_copia_cola TEXT,
      pix_qrcode_url TEXT,
      status TEXT DEFAULT 'pendente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );
  `);

  // Migrações dinâmicas de coluna para bases existentes
  const tablesWithEmpresa = ['users', 'motoristas', 'clientes', 'fretes', 'adiantamentos_historico', 'empresa_config', 'empresa_fiscal_config', 'financeiro_titulos', 'mdfes', 'veiculos_manutencoes', 'veiculos_pneus', 'cobrancas_bancarias'];
  for (const table of tablesWithEmpresa) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!cols.includes('empresa_id')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN empresa_id INTEGER DEFAULT 1`);
      }
    } catch (e) {
      console.warn(`Aviso: migração empresa_id em ${table}:`, e.message);
    }
  }

  // Migrações dinâmicas para a tabela empresas (código de licença, limite de logins, mensalidade, vencimento e modo operacional)
  try {
    const empCols = db.prepare(`PRAGMA table_info(empresas)`).all().map(c => c.name);
    if (!empCols.includes('codigo_licenca')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN codigo_licenca TEXT`);
      db.exec(`UPDATE empresas SET codigo_licenca = CAST(id AS TEXT) WHERE codigo_licenca IS NULL`);
    }
    if (!empCols.includes('limite_logins')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN limite_logins INTEGER DEFAULT 5`);
      db.exec(`UPDATE empresas SET limite_logins = 10 WHERE limite_logins IS NULL`);
    }
    if (!empCols.includes('valor_mensalidade')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN valor_mensalidade REAL DEFAULT 350.00`);
      db.exec(`UPDATE empresas SET valor_mensalidade = 350.00 WHERE valor_mensalidade IS NULL`);
    }
    if (!empCols.includes('dia_vencimento')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN dia_vencimento INTEGER DEFAULT 10`);
      db.exec(`UPDATE empresas SET dia_vencimento = 10 WHERE dia_vencimento IS NULL`);
    }
    if (!empCols.includes('data_adesao')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN data_adesao DATE`);
      db.exec(`UPDATE empresas SET data_adesao = DATE('now') WHERE data_adesao IS NULL`);
    }
    if (!empCols.includes('modo_operacao')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN modo_operacao TEXT DEFAULT 'padrao'`);
      db.exec(`UPDATE empresas SET modo_operacao = 'padrao' WHERE modo_operacao IS NULL`);
    }
    if (!empCols.includes('percentual_comissao_padrao')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN percentual_comissao_padrao REAL DEFAULT 5.0`);
      db.exec(`UPDATE empresas SET percentual_comissao_padrao = 5.0 WHERE percentual_comissao_padrao IS NULL`);
    }
    if (!empCols.includes('tipo_licenca')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN tipo_licenca TEXT DEFAULT 'paga'`);
      db.exec(`UPDATE empresas SET tipo_licenca = 'paga' WHERE tipo_licenca IS NULL`);
    }
    if (!empCols.includes('data_expiracao_teste')) {
      db.exec(`ALTER TABLE empresas ADD COLUMN data_expiracao_teste DATE`);
    }
  } catch (e) {
    console.warn('Aviso: migração colunas em empresas:', e.message);
  }

  // Garantir colunas adicionais de fretes
  const tableCols = db.prepare(`PRAGMA table_info(fretes)`).all();
  const colNames = tableCols.map((c) => c.name);

  const newCols = [
    { name: 'tipo_operacao', def: "TEXT DEFAULT 'padrao'" },
    { name: 'numero_cte_2', def: 'TEXT' },
    { name: 'serie_cte_2', def: 'TEXT' },
    { name: 'chave_cte_2', def: 'TEXT' },
    { name: 'cliente_id_2', def: 'INTEGER' },
    { name: 'cliente_nome_2', def: 'TEXT' },
    { name: 'cliente_cnpj_2', def: 'TEXT' },
    { name: 'valor_frete_venda_2', def: 'REAL DEFAULT 0' },
    { name: 'tipo_carga_2', def: 'TEXT' },
    { name: 'peso_kg_2', def: 'REAL DEFAULT 0' },
    { name: 'status_recebimento_cliente_2', def: "TEXT DEFAULT 'pendente'" },
    { name: 'data_vencimento_cliente_2', def: 'DATE' },
    { name: 'tarifa_tipo_venda', def: "TEXT DEFAULT 'ton'" },
    { name: 'tarifa_valor_venda', def: 'REAL DEFAULT 0' },
    { name: 'tarifa_tipo_venda_2', def: "TEXT DEFAULT 'ton'" },
    { name: 'tarifa_valor_venda_2', def: 'REAL DEFAULT 0' },
    { name: 'tarifa_tipo_compra', def: "TEXT DEFAULT 'fixo'" },
    { name: 'tarifa_valor_compra', def: 'REAL DEFAULT 0' },
    { name: 'nfe_referencia', def: 'TEXT' },
    { name: 'nfe_chave', def: 'TEXT' },
    { name: 'nfe_referencia_2', def: 'TEXT' },
    { name: 'nfe_chave_2', def: 'TEXT' },
    // Colunas para Agenciamento & Repasse (Metodologia Pulpo / Licença 4 / Gestão de Pagamentos)
    { name: 'valor_frete_real', def: 'REAL DEFAULT 0' },
    { name: 'percentual_comissao', def: 'REAL DEFAULT 5.0' },
    { name: 'valor_repasse', def: 'REAL DEFAULT 0' },
    { name: 'status_repasse', def: "TEXT DEFAULT 'pendente'" },
    { name: 'data_repasse', def: 'DATE' },
    { name: 'comprovante_repasse', def: 'TEXT' },
    // Destinação dos Favorecidos (Modalidade Organização & Gestão de Pagamentos)
    { name: 'favorecido_freteiro_nome', def: 'TEXT' },
    { name: 'destinatario_comissao_nome', def: 'TEXT' },
    { name: 'destinatario_comissao_doc', def: 'TEXT' },
    { name: 'status_comissao', def: "TEXT DEFAULT 'pendente'" },
    { name: 'data_comissao_paga', def: 'DATE' },
    { name: 'comprovante_comissao', def: 'TEXT' },
    { name: 'destinatario_repasse_nome', def: 'TEXT' },
    { name: 'destinatario_repasse_doc', def: 'TEXT' },
    // Colunas Fiscais SEFAZ CT-e 4.00
    { name: 'status_sefaz', def: "TEXT DEFAULT 'rascunho'" },
    { name: 'chave_cte_44', def: 'TEXT' },
    { name: 'protocolo_sefaz', def: 'TEXT' },
    { name: 'data_emissao_sefaz', def: 'DATETIME' },
    { name: 'xml_assinado', def: 'TEXT' },
    { name: 'xml_protocolado', def: 'TEXT' },
    { name: 'motivo_rejeicao', def: 'TEXT' },
    { name: 'ambiente_emissao', def: "TEXT DEFAULT 'homologacao'" },
    // Averbação de Seguros (AT&M / Porto Seguro)
    { name: 'protocolo_averbacao', def: 'TEXT' },
    { name: 'status_averbacao', def: "TEXT DEFAULT 'pendente'" },
    { name: 'data_averbacao', def: 'DATETIME' },
    // CIOT ANTT
    { name: 'numero_ciot', def: 'TEXT' },
    { name: 'protocolo_ciot', def: 'TEXT' },
    { name: 'ipef_operadora', def: 'TEXT' },
    // Canhoto Digital POD
    { name: 'canhoto_foto_url', def: 'TEXT' },
    { name: 'canhoto_data_hora', def: 'DATETIME' },
    { name: 'canhoto_geolocalizacao', def: 'TEXT' },
    { name: 'canhoto_status', def: "TEXT DEFAULT 'pendente'" },
    { name: 'canhoto_recebedor_nome', def: 'TEXT' },
    { name: 'canhoto_recebedor_doc', def: 'TEXT' },
    { name: 'canhoto_token_acesso', def: 'TEXT' },
    // Rastreamento Público
    { name: 'rastreamento_token', def: 'TEXT' },
    // Automação de Rota e ANTT
    { name: 'distancia_km', def: 'REAL DEFAULT 0' },
    { name: 'piso_minimo_antt', def: 'REAL DEFAULT 0' },
    // Origem do Registro & Tributação
    { name: 'origem_registro', def: "TEXT DEFAULT 'emissao_propria'" },
    { name: 'valor_icms', def: 'REAL DEFAULT 0' },
    { name: 'aliquota_icms', def: 'REAL DEFAULT 12.0' },
    { name: 'cst_icms', def: "TEXT DEFAULT '00'" },
    { name: 'cfop', def: "TEXT DEFAULT '5353'" },
  ];

  for (const col of newCols) {
    if (!colNames.includes(col.name)) {
      try {
        db.exec(`ALTER TABLE fretes ADD COLUMN ${col.name} ${col.def}`);
      } catch (err) {
        console.warn(`Coluna ${col.name} já existente ou erro ao adicionar:`, err.message);
      }
    }
  }

  // Garantir coluna numero_eixos em motoristas
  try {
    const motCols = db.prepare(`PRAGMA table_info(motoristas)`).all().map(c => c.name);
    if (!motCols.includes('numero_eixos')) {
      db.exec(`ALTER TABLE motoristas ADD COLUMN numero_eixos INTEGER DEFAULT 6`);
    }
  } catch (e) {}

  // Garantir que a Empresa 1 exista na tabela empresas
  const empresaCount = db.prepare('SELECT COUNT(*) as count FROM empresas').get();
  if (empresaCount.count === 0) {
    const existingConfig = db.prepare('SELECT * FROM empresa_config LIMIT 1').get();
    db.prepare(`
      INSERT INTO empresas (id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      1,
      '1',
      10,
      350.00,
      10,
      existingConfig?.razao_social || 'LOGÍSTICA & TRANSPORTES BRASIL LTDA',
      existingConfig?.nome_fantasia || 'LogBrasil Agenciamento',
      existingConfig?.cnpj || '34.123.456/0001-89',
      existingConfig?.telefone || '(11) 98765-4321',
      existingConfig?.email || 'contato@logbrasil.com.br',
      existingConfig?.chave_pix || '34123456000189',
      existingConfig?.cidade || 'Arapongas',
      existingConfig?.uf || 'PR'
    );
  }

  // 1. Garantir Usuário GHOST MASTER (Super Admin Global - DESVINCULADO de qualquer licença)
  const masterPassHash = bcrypt.hashSync('master123', 10);
  const ghostUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get('ghost@sisfrete.com');
  if (!ghostUser) {
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(null, 'Ghost Master (SaaS Owner)', 'ghost@sisfrete.com', masterPassHash, 'super_admin');
  }

  // 2. Garantir Administrador da Licença 1 (se nenhum usuário existir para a empresa 1)
  const usersEmp1Count = db.prepare('SELECT COUNT(*) as count FROM users WHERE empresa_id = 1').get();
  if (!usersEmp1Count || usersEmp1Count.count === 0) {
    const adminPassHash = bcrypt.hashSync('admin123', 10);
    const operadorPassHash = bcrypt.hashSync('operador123', 10);
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, 'Administrador Arapongas', 'admin@sisfrete.com', adminPassHash, 'admin');
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, 'Operador Logístico', 'operador@sisfrete.com', operadorPassHash, 'operador');
  }

  // 3. Garantir que a Licença 9 (BOBLOG TRANSPORTES) exista no banco (se não existir)
  let boblogEmpresa = db.prepare("SELECT id FROM empresas WHERE codigo_licenca = '9' OR id = 9").get();
  if (!boblogEmpresa) {
    try {
      db.prepare(`
        INSERT INTO empresas (
          id, codigo_licenca, limite_logins, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, modo_operacao, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'padrao', 1)
      `).run(
        9,
        '9',
        10,
        'BOBLOG TRANSPORTE RODOVIARIO DE CARGAS LTDA - ME',
        'BOBLOG TRANSPORTES',
        '15.528.305/0001-48',
        '(71) 3301-4500',
        'teste@boblog.com',
        '15528305000148',
        'Salvador',
        'BA'
      );
      boblogEmpresa = { id: 9 };
    } catch (e) {
      const ins = db.prepare(`
        INSERT INTO empresas (
          codigo_licenca, limite_logins, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, modo_operacao, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'padrao', 1)
      `).run(
        '9',
        10,
        'BOBLOG TRANSPORTE RODOVIARIO DE CARGAS LTDA - ME',
        'BOBLOG TRANSPORTES',
        '15.528.305/0001-48',
        '(71) 3301-4500',
        'teste@boblog.com',
        '15528305000148',
        'Salvador',
        'BA'
      );
      boblogEmpresa = { id: Number(ins.lastInsertRowid) };
    }
  }

  // Garantir usuário da Licença 9 apenas se não existir
  const usersEmp9Count = db.prepare('SELECT COUNT(*) as count FROM users WHERE empresa_id = ?').get(boblogEmpresa.id);
  if (!usersEmp9Count || usersEmp9Count.count === 0) {
    const boblogPassHash = bcrypt.hashSync('boblog123', 10);
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(boblogEmpresa.id, 'Boblog Transportes', 'teste@boblog.com', boblogPassHash, 'admin');
  }

  // =========================================================================
  // 4. GARANTIR A LICENÇA 4 (se não existir)
  // =========================================================================
  let pulpoEmpresa = db.prepare("SELECT id FROM empresas WHERE codigo_licenca = '4' OR id = 4").get();
  if (!pulpoEmpresa) {
    try {
      db.prepare(`
        INSERT INTO empresas (
          id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
          razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf,
          modo_operacao, percentual_comissao_padrao, ativo
        ) VALUES (?, ?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        4,
        '4',
        10,
        350.00,
        10,
        'COLORADO LOGISTICA E TRANSPORTES LTDA',
        'Colorado Transportes',
        '48.912.345/0001-60',
        '(41) 3999-4400',
        'contato@colorado.com.br',
        '48912345000160',
        'Maringá',
        'PR',
        'agenciamento_repasse',
        5.0
      );
      pulpoEmpresa = { id: 4 };
    } catch (e) {
      const ins = db.prepare(`
        INSERT INTO empresas (
          codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
          razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf,
          modo_operacao, percentual_comissao_padrao, ativo
        ) VALUES (?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        '4',
        10,
        350.00,
        10,
        'COLORADO LOGISTICA E TRANSPORTES LTDA',
        'Colorado Transportes',
        '48.912.345/0001-60',
        '(41) 3999-4400',
        'contato@colorado.com.br',
        '48912345000160',
        'Maringá',
        'PR',
        'agenciamento_repasse',
        5.0
      );
      pulpoEmpresa = { id: Number(ins.lastInsertRowid) };
    }
  }

  // Garantir usuário admin da Licença 4 apenas se não existir usuário na licença 4
  const usersEmp4Count = db.prepare('SELECT COUNT(*) as count FROM users WHERE empresa_id = ?').get(pulpoEmpresa.id);
  if (!usersEmp4Count || usersEmp4Count.count === 0) {
    const pulpoPassHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(pulpoEmpresa.id, 'Gerente Colorado', 'admin@pulpo.com', pulpoPassHash, 'admin');
  }



  // =========================================================================
  // 5. GARANTIR A LICENÇA 3 (FSERVICE TRANSPORTES)
  // =========================================================================
  let fserviceEmpresa = db.prepare("SELECT id FROM empresas WHERE codigo_licenca = '3' OR id = 3").get();
  const fserviceCertBase64 = "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";

  if (!fserviceEmpresa) {
    try {
      db.prepare(`
        INSERT INTO empresas (
          id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
          razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf,
          modo_operacao, percentual_comissao_padrao, ativo
        ) VALUES (?, ?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        3,
        '3',
        10,
        350.00,
        10,
        'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA',
        'FSERVICE TRANSPORTES',
        '33.590.616/0001-19',
        '(44) 3255-1000',
        'contato@fservice.com.br',
        '33590616000119',
        'Sabáudia',
        'PR',
        'padrao',
        5.0
      );
      fserviceEmpresa = { id: 3 };
    } catch (e) {
      const ins = db.prepare(`
        INSERT INTO empresas (
          codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
          razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf,
          modo_operacao, percentual_comissao_padrao, ativo
        ) VALUES (?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        '3',
        10,
        350.00,
        10,
        'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA',
        'FSERVICE TRANSPORTES',
        '33.590.616/0001-19',
        '(44) 3255-1000',
        'contato@fservice.com.br',
        '33590616000119',
        'Sabáudia',
        'PR',
        'padrao',
        5.0
      );
      fserviceEmpresa = { id: Number(ins.lastInsertRowid) };
    }
  }

  // Garantir usuário admin da Licença 3 apenas se não existir
  const userFserv = db.prepare('SELECT id FROM users WHERE empresa_id = ?').get(fserviceEmpresa.id);
  if (!userFserv) {
    const fservicePassHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(fserviceEmpresa.id, 'FSERV Administrador', 'fserv@fserv.com', fservicePassHash, 'admin');
  }

  // Configuração Fiscal e Certificado A1 da FSERVICE
  const fiscalEmp3 = db.prepare('SELECT id FROM empresa_fiscal_config WHERE empresa_id = ?').get(fserviceEmpresa.id);
  if (fiscalEmp3) {
    db.prepare(`
      UPDATE empresa_fiscal_config SET
        ambiente = 'homologacao',
        serie_cte = 1,
        ultimo_numero_cte = 2,
        rntrc_padrao = '53148055',
        aliquota_icms_padrao = 12.0,
        cst_icms_padrao = '00',
        cfop_padrao_estadual = '5353',
        cfop_padrao_interestadual = '6353',
        natureza_operacao = 'PRESTACAO DE SERVICO DE TRANSPORTE',
        certificado_a1_base64 = ?,
        certificado_senha = '09012611',
        certificado_validade = '2027-01-09T16:56:04.000Z',
        certificado_titular = 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA E:33590616000119',
        certificado_cnpj = '33590616000119',
        updated_at = CURRENT_TIMESTAMP
      WHERE empresa_id = ?
    `).run(fserviceCertBase64, fserviceEmpresa.id);
  } else {
    db.prepare(`
      INSERT INTO empresa_fiscal_config (
        empresa_id, ambiente, serie_cte, ultimo_numero_cte, rntrc_padrao,
        aliquota_icms_padrao, cst_icms_padrao, cfop_padrao_estadual, cfop_padrao_interestadual,
        natureza_operacao, certificado_a1_base64, certificado_senha,
        certificado_validade, certificado_titular, certificado_cnpj
      ) VALUES (?, 'homologacao', 1, 2, '53148055', 12.0, '00', '5353', '6353', 'PRESTACAO DE SERVICO DE TRANSPORTE', ?, '09012611', '2027-01-09T16:56:04.000Z', 'FSERV PRESTADORA DE SERVICOS DE ESCRITORIO LTDA E:33590616000119', '33590616000119')
    `).run(fserviceEmpresa.id, fserviceCertBase64);
  }



  // GERAR / SINCRONIZAR MENSALIDADES DE LICENÇAS AUTOMATICAMENTE (R$ 350 / Vencimento dia 10)
  try {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const mesRefAtual = `${anoAtual}-${mesAtual}`;
    const hojeStr = hoje.toISOString().slice(0, 10);

    const todasEmpresasAtivas = db.prepare('SELECT id, valor_mensalidade, dia_vencimento FROM empresas WHERE ativo = 1').all();
    for (const emp of todasEmpresasAtivas) {
      const diaVenc = String(emp.dia_vencimento || 10).padStart(2, '0');
      const dataVenc = `${mesRefAtual}-${diaVenc}`;
      const valor = emp.valor_mensalidade || 350.00;

      const cobrancaExistente = db.prepare('SELECT id, status, data_vencimento FROM licencas_cobrancas WHERE empresa_id = ? AND mes_referencia = ?').get(emp.id, mesRefAtual);
      if (!cobrancaExistente) {
        const statusInicial = (hojeStr > dataVenc) ? 'atrasado' : 'pendente';
        db.prepare(`
          INSERT INTO licencas_cobrancas (empresa_id, mes_referencia, data_vencimento, valor, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(emp.id, mesRefAtual, dataVenc, valor, statusInicial);
      } else if (cobrancaExistente.status === 'pendente' && hojeStr > cobrancaExistente.data_vencimento) {
        db.prepare(`UPDATE licencas_cobrancas SET status = 'atrasado' WHERE id = ?`).run(cobrancaExistente.id);
      }
    }
    // Garantir coluna metodologia_padrao em empresas
    try {
      db.exec("ALTER TABLE empresas ADD COLUMN metodologia_padrao TEXT DEFAULT 'hibrido'");
    } catch (e) {}

    // Garantir coluna origem_registro em fretes ('emissao_propria' vs 'importacao_terceiros')
    try {
      db.exec("ALTER TABLE fretes ADD COLUMN origem_registro TEXT DEFAULT 'emissao_propria'");
    } catch (e) {}

    // Garantir colunas de cancelamento fiscal SEFAZ em fretes
    try {
      db.exec("ALTER TABLE fretes ADD COLUMN protocolo_cancelamento TEXT");
    } catch (e) {}
    try {
      db.exec("ALTER TABLE fretes ADD COLUMN data_cancelamento_sefaz TEXT");
    } catch (e) {}
    try {
      db.exec("ALTER TABLE fretes ADD COLUMN justificativa_cancelamento TEXT");
    } catch (e) {}
    try {
      db.exec("ALTER TABLE fretes ADD COLUMN xml_evento_cancelamento TEXT");
    } catch (e) {}


  } catch (errCobrancas) {
    console.warn('Aviso: erro ao sincronizar mensalidades de licenças:', errCobrancas.message);
  }
}

initDatabase();

module.exports = db;
