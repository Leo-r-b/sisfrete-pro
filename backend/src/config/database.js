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

    CREATE TABLE IF NOT EXISTS financeiro_baixas_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      titulo_id INTEGER,          -- Vinculado a financeiro_titulos (se título avulso)
      frete_id INTEGER,           -- Vinculado a fretes (se título originado de CT-e)
      tipo_titulo TEXT NOT NULL,  -- 'pagar' | 'receber'
      tipo_parcela TEXT DEFAULT 'parcial', -- 'adiantamento', 'saldo', 'fiscal', 'por_fora', 'comissao', 'repasse', 'quitacao'
      valor REAL NOT NULL,
      data_pagamento DATE DEFAULT (DATE('now')),
      forma_pagamento TEXT DEFAULT 'PIX', -- 'PIX', 'TED', 'Boleto', 'Dinheiro', 'Cartão'
      comprovante_ref TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (titulo_id) REFERENCES financeiro_titulos(id) ON DELETE CASCADE,
      FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_baixas_empresa ON financeiro_baixas_historico(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_baixas_titulo ON financeiro_baixas_historico(titulo_id);
    CREATE INDEX IF NOT EXISTS idx_baixas_frete ON financeiro_baixas_historico(frete_id);

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

    CREATE TABLE IF NOT EXISTS carregamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT 'carregando', -- 'carregando', 'aguardando_cte', 'concluido', 'cancelado'
      
      -- Motorista & Veículo
      motorista_id INTEGER,
      motorista_nome TEXT NOT NULL,
      motorista_cpf TEXT,
      motorista_telefone TEXT,
      placa_cavalo TEXT NOT NULL,
      placa_carreta TEXT,
      tipo_veiculo TEXT DEFAULT 'Carreta LS',
      freteiro_nome TEXT,
      freteiro_documento TEXT,
      
      -- Origem / Onde está carregando
      fornecedor_id INTEGER,
      fornecedor_nome TEXT NOT NULL,
      origem_cidade TEXT NOT NULL,
      origem_uf TEXT NOT NULL,
      origem_endereco TEXT,
      latitude REAL,
      longitude REAL,
      
      -- Venda Triangular / Intermediação
      is_triangular INTEGER DEFAULT 0,
      intermediador_id INTEGER,
      intermediador_nome TEXT,
      intermediador_cnpj TEXT,
      intermediador_cidade TEXT,
      intermediador_uf TEXT,
      valor_repasse_combinado REAL DEFAULT 0,
      
      -- Destino
      destino_cliente_id INTEGER,
      destino_empresa_nome TEXT NOT NULL,
      destino_cidade TEXT NOT NULL,
      destino_uf TEXT NOT NULL,
      
      -- Condições Comerciais
      modalidade TEXT DEFAULT 'gestao_pagamentos', -- 'gestao_pagamentos', 'subcontratacao', 'agenciamento_repasse'
      tipo_carga TEXT,
      tipo_negociacao TEXT DEFAULT 'por_kg', -- 'por_kg', 'por_ton', 'total_fechado'
      valor_combinado_kg REAL DEFAULT 0,
      peso_estimado_kg REAL DEFAULT 0,
      valor_frete_estimado REAL DEFAULT 0,
      valor_adiantamento_combinado REAL DEFAULT 0,
      valor_frete_tomador_kg REAL DEFAULT 0,
      valor_frete_tomador_total REAL DEFAULT 0,
      comissao_agenciamento_tipo TEXT DEFAULT 'percentual', -- 'percentual', 'fixo'
      comissao_agenciamento_valor REAL DEFAULT 0,
      valor_comissao_real REAL DEFAULT 0,
      
      -- Vínculo com CT-e / Frete
      frete_id INTEGER,
      numero_cte TEXT,
      chave_cte TEXT,
      numero_cte_2 TEXT,
      chave_cte_2 TEXT,
      peso_real_kg REAL DEFAULT 0,
      valor_frete_motorista_real REAL DEFAULT 0,
      valor_cte_total REAL DEFAULT 0,
      valor_repasse_real REAL DEFAULT 0,
      valor_por_fora REAL DEFAULT 0,
      data_cte_importado DATETIME,
      
      -- Datas e Observações
      data_inclusao DATETIME DEFAULT CURRENT_TIMESTAMP,
      previsao_saida DATETIME,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
      FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE SET NULL
    );
  `);

  // Migrações dinâmicas de coluna para bases existentes
  const tablesWithEmpresa = ['users', 'motoristas', 'clientes', 'fretes', 'adiantamentos_historico', 'empresa_config', 'empresa_fiscal_config', 'financeiro_titulos', 'mdfes', 'veiculos_manutencoes', 'veiculos_pneus', 'cobrancas_bancarias', 'carregamentos'];
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

  // Garantir coluna valor_por_fora e colunas de modalidades em carregamentos
  try {
    const carregCols = db.prepare(`PRAGMA table_info(carregamentos)`).all().map(c => c.name);
    if (!carregCols.includes('valor_por_fora')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN valor_por_fora REAL DEFAULT 0`);
    }
    if (!carregCols.includes('modalidade')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN modalidade TEXT DEFAULT 'gestao_pagamentos'`);
    }
    if (!carregCols.includes('valor_frete_tomador_kg')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN valor_frete_tomador_kg REAL DEFAULT 0`);
    }
    if (!carregCols.includes('valor_frete_tomador_total')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN valor_frete_tomador_total REAL DEFAULT 0`);
    }
    if (!carregCols.includes('comissao_agenciamento_tipo')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN comissao_agenciamento_tipo TEXT DEFAULT 'percentual'`);
    }
    if (!carregCols.includes('comissao_agenciamento_valor')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN comissao_agenciamento_valor REAL DEFAULT 0`);
    }
    if (!carregCols.includes('valor_comissao_real')) {
      db.exec(`ALTER TABLE carregamentos ADD COLUMN valor_comissao_real REAL DEFAULT 0`);
    }
  } catch (e) {}

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
    { name: 'cliente_cnpj', def: 'TEXT' },
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
    { name: 'valor_por_fora', def: 'REAL DEFAULT 0' },
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
    // Desconto / Abatimento de Frete (Roubo de carga, quebra, avaria)
    { name: 'motivo_desconto', def: 'TEXT' },
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

  // Garantir colunas de desconto em financeiro_titulos
  try {
    const titCols = db.prepare(`PRAGMA table_info(financeiro_titulos)`).all().map(c => c.name);
    if (!titCols.includes('valor_desconto')) {
      db.exec(`ALTER TABLE financeiro_titulos ADD COLUMN valor_desconto REAL DEFAULT 0`);
    }
    if (!titCols.includes('motivo_desconto')) {
      db.exec(`ALTER TABLE financeiro_titulos ADD COLUMN motivo_desconto TEXT`);
    }
  } catch (e) {}

  // Garantir colunas de desconto em financeiro_baixas_historico
  try {
    const baixasCols = db.prepare(`PRAGMA table_info(financeiro_baixas_historico)`).all().map(c => c.name);
    if (!baixasCols.includes('desconto')) {
      db.exec(`ALTER TABLE financeiro_baixas_historico ADD COLUMN desconto REAL DEFAULT 0`);
    }
    if (!baixasCols.includes('motivo_desconto')) {
      db.exec(`ALTER TABLE financeiro_baixas_historico ADD COLUMN motivo_desconto TEXT`);
    }
  } catch (e) {}

  // =========================================================================
  // USUÁRIOS SUPER_ADMIN (MASTER SAAS - 100% DESVINCULADOS DE LICENÇAS)
  // O Master tem autonomia completa para criar e excluir todas e quaisquer licenças.
  // =========================================================================
  const masterPassHash = bcrypt.hashSync('master123', 10);
  
  // Garantir que ghost@sisfrete.com exista e tenha empresa_id = null
  const ghostUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get('ghost@sisfrete.com');
  if (!ghostUser) {
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(null, 'Ghost Master (SaaS Owner)', 'ghost@sisfrete.com', masterPassHash, 'super_admin');
  } else {
    db.prepare("UPDATE users SET empresa_id = NULL, role = 'super_admin' WHERE id = ?").run(ghostUser.id);
  }

  // Garantir que leonardo45893@gmail.com exista e tenha empresa_id = null
  const leoUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get('leonardo45893@gmail.com');
  if (leoUser) {
    db.prepare("UPDATE users SET empresa_id = NULL, role = 'super_admin' WHERE id = ?").run(leoUser.id);
  } else {
    db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(null, 'Leonardo Master', 'leonardo45893@gmail.com', masterPassHash, 'super_admin');
  }

  // Garantir que qualquer usuário com role super_admin tenha empresa_id = NULL
  try {
    db.prepare("UPDATE users SET empresa_id = NULL WHERE role = 'super_admin'").run();
  } catch (e) {}



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

    // Garantir coluna modulos_ativos em empresas (controle granular de abas)
    try {
      db.exec("ALTER TABLE empresas ADD COLUMN modulos_ativos TEXT");
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

// Conectar sincronização e replicação transparente com o Turso Cloud
const { applyTursoHooks, syncFromTurso } = require('./tursoSync');
applyTursoHooks(db);

// Sincronizar em background ao iniciar o servidor (cold start do Render / restauração em nuvem)
syncFromTurso(db).catch(err => console.warn('Aviso syncFromTurso inicial:', err.message));

module.exports = db;
