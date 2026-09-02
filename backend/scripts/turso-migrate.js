require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ ERRO: TURSO_DATABASE_URL não configurada no arquivo .env!');
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

async function safeAddColumn(tableName, columnName, colDefinition) {
  try {
    const info = await client.execute(`PRAGMA table_info(${tableName})`);
    const cols = info.rows.map(r => r.name);
    if (!cols.includes(columnName)) {
      await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${colDefinition}`);
      console.log(`  + Coluna '${columnName}' adicionada à tabela '${tableName}'.`);
    }
  } catch (e) {
    console.warn(`  ! Aviso ao verificar coluna ${tableName}.${columnName}:`, e.message);
  }
}

async function migrateTurso() {
  console.log('====================================================');
  console.log('🚀 Iniciando Migração & Configuração no Turso DB...');
  console.log(`📡 URL do Banco: ${url}`);
  console.log('====================================================\n');

  try {
    console.log('⏳ Criando tabelas estruturais no Turso...');
    await client.batch([
      // 1. Tabela Empresas / Licenças (Multi-Tenant)
      `CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_licenca TEXT UNIQUE,
        limite_logins INTEGER DEFAULT 5,
        valor_mensalidade REAL DEFAULT 350.00,
        dia_vencimento INTEGER DEFAULT 10,
        data_adesao DATE,
        modo_operacao TEXT DEFAULT 'padrao',
        percentual_comissao_padrao REAL DEFAULT 5.0,
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
        uf TEXT DEFAULT 'PR',
        percentual_adiantamento_padrao REAL DEFAULT 70.0,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 2. Tabela Cobranças de Licenças SaaS (Recorrente R$ 350 / Dia 10)
      `CREATE TABLE IF NOT EXISTS licencas_cobrancas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        mes_referencia TEXT NOT NULL,
        data_vencimento DATE NOT NULL,
        valor REAL NOT NULL DEFAULT 350.00,
        status TEXT NOT NULL DEFAULT 'pendente',
        data_pagamento DATE,
        forma_pagamento TEXT DEFAULT 'PIX',
        comprovante_ref TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      );`,

      // 3. Tabela Usuários (com empresa_id NULL para Super Admin)
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operador',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 4. Tabela Motoristas
      `CREATE TABLE IF NOT EXISTS motoristas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT 1,
        nome TEXT NOT NULL,
        cpf_cnpj TEXT,
        telefone TEXT,
        pix_chave TEXT,
        pix_tipo TEXT DEFAULT 'CPF',
        placa_cavalo TEXT,
        placa_carreta TEXT,
        tipo_veiculo TEXT DEFAULT 'Truck',
        cidade TEXT,
        uf TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 5. Tabela Clientes
      `CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT 1,
        razao_social TEXT NOT NULL,
        nome_fantasia TEXT,
        cnpj_cpf TEXT,
        telefone TEXT,
        email TEXT,
        cidade TEXT,
        uf TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 6. Tabela Fretes (Multi-Tenant e Subcontratação)
      `CREATE TABLE IF NOT EXISTS fretes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT 1,
        tipo_operacao TEXT DEFAULT 'padrao',
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
        tarifa_tipo_venda TEXT DEFAULT 'ton',
        tarifa_valor_venda REAL DEFAULT 0,
        tarifa_tipo_venda_2 TEXT DEFAULT 'ton',
        tarifa_valor_venda_2 REAL DEFAULT 0,
        tarifa_tipo_compra TEXT DEFAULT 'fixo',
        tarifa_valor_compra REAL DEFAULT 0,
        nfe_referencia TEXT,
        nfe_chave TEXT,
        nfe_referencia_2 TEXT,
        nfe_chave_2 TEXT,
        valor_frete_real REAL DEFAULT 0,
        percentual_comissao REAL DEFAULT 5.0,
        valor_repasse REAL DEFAULT 0,
        status_repasse TEXT DEFAULT 'pendente',
        data_repasse DATE,
        comprovante_repasse TEXT,
        favorecido_freteiro_nome TEXT,
        destinatario_comissao_nome TEXT,
        destinatario_comissao_doc TEXT,
        status_comissao TEXT DEFAULT 'pendente',
        data_comissao_paga DATE,
        comprovante_comissao TEXT,
        destinatario_repasse_nome TEXT,
        destinatario_repasse_doc TEXT,
        valor_frete_venda REAL NOT NULL DEFAULT 0,
        valor_frete_compra REAL NOT NULL DEFAULT 0,
        valor_comissao REAL NOT NULL DEFAULT 0,
        percentual_margem REAL NOT NULL DEFAULT 0,
        percentual_adiantamento REAL DEFAULT 70.0,
        valor_adiantamento REAL DEFAULT 0,
        valor_pedagio REAL DEFAULT 0,
        valor_combustivel REAL DEFAULT 0,
        outros_descontos REAL DEFAULT 0,
        valor_acrescimos REAL DEFAULT 0,
        valor_saldo_motorista REAL NOT NULL DEFAULT 0,
        status_frete TEXT DEFAULT 'em_transito',
        status_pagamento_motorista TEXT DEFAULT 'pendente',
        status_recebimento_cliente TEXT DEFAULT 'pendente',
        data_previsao_entrega DATE,
        data_entrega DATE,
        data_vencimento_cliente DATE,
        observacoes TEXT,
        xml_bruto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 8. Tabela de Configurações Fiscais & Certificado Digital A1
      `CREATE TABLE IF NOT EXISTS empresa_fiscal_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT 1 UNIQUE,
        ambiente TEXT DEFAULT 'homologacao',
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 9. Tabela de Títulos Financeiros (Contas a Pagar & Receber - Operacional & Administrativo)
      `CREATE TABLE IF NOT EXISTS financeiro_titulos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT 1,
        tipo TEXT NOT NULL,
        origem TEXT DEFAULT 'avulso',
        frete_id INTEGER,
        categoria TEXT NOT NULL,
        categoria_nome TEXT,
        descricao TEXT NOT NULL,
        pessoa_nome TEXT,
        pessoa_documento TEXT,
        valor REAL NOT NULL,
        valor_pago REAL DEFAULT 0,
        data_emissao DATE,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        status TEXT DEFAULT 'pendente',
        forma_pagamento TEXT DEFAULT 'PIX',
        comprovante_ref TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 10. Tabela de MDF-e 3.00 (Manifesto Eletrônico de Documentos Fiscais)
      `CREATE TABLE IF NOT EXISTS mdfes (
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
        data_emissao DATE,
        data_encerramento DATETIME,
        municipio_encerramento TEXT,
        uf_encerramento TEXT,
        xml_mdfe TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS mdfe_ctes_vinculados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mdfe_id INTEGER NOT NULL,
        frete_id INTEGER,
        chave_cte TEXT NOT NULL,
        numero_cte TEXT,
        valor_frete REAL DEFAULT 0,
        peso_kg REAL DEFAULT 0,
        municipio_descarregamento TEXT,
        uf_descarregamento TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 11. Eventos de Rastreamento (Torre de Controle)
      `CREATE TABLE IF NOT EXISTS frete_eventos_rastreamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        frete_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        descricao TEXT NOT NULL,
        cidade TEXT,
        uf TEXT,
        data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 12. Gestão de Frotas & Manutenção
      `CREATE TABLE IF NOT EXISTS veiculos_manutencoes (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS veiculos_pneus (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      // 13. Cobranças Bancárias & PIX
      `CREATE TABLE IF NOT EXISTS cobrancas_bancarias (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    ], 'write');

    // Garantir colunas multi-tenant e novas colunas de repasse e fiscais
    await safeAddColumn('users', 'empresa_id', 'INTEGER');
    await safeAddColumn('users', 'cliente_id', 'INTEGER');
    await safeAddColumn('users', 'is_cliente_portal', 'INTEGER DEFAULT 0');
    await safeAddColumn('fretes', 'empresa_id', 'INTEGER DEFAULT 1');
    await safeAddColumn('fretes', 'valor_frete_real', 'REAL DEFAULT 0');
    await safeAddColumn('fretes', 'percentual_comissao', 'REAL DEFAULT 5.0');
    await safeAddColumn('fretes', 'valor_repasse', 'REAL DEFAULT 0');
    await safeAddColumn('fretes', 'status_repasse', "TEXT DEFAULT 'pendente'");
    await safeAddColumn('fretes', 'data_repasse', 'DATE');
    await safeAddColumn('fretes', 'comprovante_repasse', 'TEXT');
    // Colunas Fiscais SEFAZ CT-e 4.00
    await safeAddColumn('fretes', 'status_sefaz', "TEXT DEFAULT 'rascunho'");
    await safeAddColumn('fretes', 'chave_cte_44', 'TEXT');
    await safeAddColumn('fretes', 'protocolo_sefaz', 'TEXT');
    await safeAddColumn('fretes', 'data_emissao_sefaz', 'DATETIME');
    await safeAddColumn('fretes', 'xml_assinado', 'TEXT');
    await safeAddColumn('fretes', 'xml_protocolado', 'TEXT');
    await safeAddColumn('fretes', 'motivo_rejeicao', 'TEXT');
    await safeAddColumn('fretes', 'ambiente_emissao', "TEXT DEFAULT 'homologacao'");
    // Averbação de Seguros (AT&M / Porto Seguro)
    await safeAddColumn('fretes', 'protocolo_averbacao', 'TEXT');
    await safeAddColumn('fretes', 'status_averbacao', "TEXT DEFAULT 'pendente'");
    await safeAddColumn('fretes', 'data_averbacao', 'DATETIME');
    // CIOT ANTT
    await safeAddColumn('fretes', 'numero_ciot', 'TEXT');
    await safeAddColumn('fretes', 'protocolo_ciot', 'TEXT');
    await safeAddColumn('fretes', 'ipef_operadora', 'TEXT');
    // Canhoto Digital POD
    await safeAddColumn('fretes', 'canhoto_foto_url', 'TEXT');
    await safeAddColumn('fretes', 'canhoto_data_hora', 'DATETIME');
    await safeAddColumn('fretes', 'canhoto_geolocalizacao', 'TEXT');
    await safeAddColumn('fretes', 'canhoto_status', "TEXT DEFAULT 'pendente'");
    await safeAddColumn('fretes', 'canhoto_recebedor_nome', 'TEXT');
    await safeAddColumn('fretes', 'canhoto_recebedor_doc', 'TEXT');
    await safeAddColumn('fretes', 'canhoto_token_acesso', 'TEXT');
    // Rastreamento Público
    await safeAddColumn('fretes', 'rastreamento_token', 'TEXT');
    // Automação de Rota e ANTT
    await safeAddColumn('fretes', 'distancia_km', 'REAL DEFAULT 0');
    await safeAddColumn('fretes', 'piso_minimo_antt', 'REAL DEFAULT 0');
    // Origem do Registro e Impostos
    await safeAddColumn('fretes', 'origem_registro', "TEXT DEFAULT 'emissao_propria'");
    await safeAddColumn('fretes', 'valor_icms', 'REAL DEFAULT 0');
    await safeAddColumn('fretes', 'aliquota_icms', 'REAL DEFAULT 12.0');
    await safeAddColumn('fretes', 'cst_icms', "TEXT DEFAULT '00'");
    await safeAddColumn('fretes', 'cfop', "TEXT DEFAULT '5353'");
    // Destinação de Pagamentos (Rateio Freteiro, Comissão e Repasse)
    await safeAddColumn('fretes', 'favorecido_freteiro_nome', 'TEXT');
    await safeAddColumn('fretes', 'destinatario_comissao_nome', 'TEXT');
    await safeAddColumn('fretes', 'destinatario_comissao_doc', 'TEXT');
    await safeAddColumn('fretes', 'status_comissao', "TEXT DEFAULT 'pendente'");
    await safeAddColumn('fretes', 'data_comissao_paga', 'DATE');
    await safeAddColumn('fretes', 'comprovante_comissao', 'TEXT');
    await safeAddColumn('fretes', 'destinatario_repasse_nome', 'TEXT');
    await safeAddColumn('fretes', 'destinatario_repasse_doc', 'TEXT');
    // Configurações Fiscais Avançadas
    await safeAddColumn('empresa_fiscal_config', 'atm_usuario', 'TEXT');
    await safeAddColumn('empresa_fiscal_config', 'atm_senha', 'TEXT');
    await safeAddColumn('empresa_fiscal_config', 'atm_codigo_seguradora', 'TEXT');
    await safeAddColumn('empresa_fiscal_config', 'atm_numero_apolice', 'TEXT');
    await safeAddColumn('motoristas', 'empresa_id', 'INTEGER DEFAULT 1');
    await safeAddColumn('motoristas', 'numero_eixos', 'INTEGER DEFAULT 6');
    await safeAddColumn('clientes', 'empresa_id', 'INTEGER DEFAULT 1');
    await safeAddColumn('adiantamentos_historico', 'empresa_id', 'INTEGER DEFAULT 1');
    await safeAddColumn('empresas', 'codigo_licenca', 'TEXT');
    await safeAddColumn('empresas', 'limite_logins', 'INTEGER DEFAULT 5');
    await safeAddColumn('empresas', 'valor_mensalidade', 'REAL DEFAULT 350.00');
    await safeAddColumn('empresas', 'dia_vencimento', 'INTEGER DEFAULT 10');
    await safeAddColumn('empresas', 'data_adesao', 'DATE');
    await safeAddColumn('empresas', 'modo_operacao', "TEXT DEFAULT 'padrao'");
    await safeAddColumn('empresas', 'percentual_comissao_padrao', 'REAL DEFAULT 5.0');
    await safeAddColumn('empresas', 'tipo_licenca', "TEXT DEFAULT 'paga'");
    await safeAddColumn('empresas', 'data_expiracao_teste', 'DATE');
    await safeAddColumn('empresas', 'ativo', 'INTEGER DEFAULT 1');

    console.log('✅ Todas as tabelas e colunas verificadas no Turso!');

    // 2. Garantir Licença 1, Licença 9 e Licença 4 (Pulpo Agenciamento & Repasse)
    console.log('⏳ Sincronizando licenças e empresas no Turso...');
    
    // Licença 1
    const l1 = await client.execute("SELECT id FROM empresas WHERE codigo_licenca = '1' OR id = 1");
    if (l1.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO empresas (id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, modo_operacao, ativo)
              VALUES (1, '1', 10, 350.00, 10, '2026-01-01', 'SISFRETE TRANSPORTES & LOGÍSTICA LTDA', 'SisFrete Matriz', '12.345.678/0001-90', '(41) 3344-5566', 'contato@sisfrete.com', '12345678000190', 'Curitiba', 'PR', 'padrao', 1)`
      });
    }

    // Licença 9
    const l9 = await client.execute("SELECT id FROM empresas WHERE codigo_licenca = '9' OR id = 9");
    if (l9.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO empresas (id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, modo_operacao, ativo)
              VALUES (9, '9', 8, 350.00, 10, '2026-02-10', 'LOGÍSTICA & TRANSPORTES BRASIL LTDA', 'LogBrasil Agenciamento', '34.123.456/0001-89', '(11) 98765-4321', 'contato@logbrasil.com.br', '34123456000189', 'São Paulo', 'SP', 'padrao', 1)`
      });
    }

    // Licença 4 (Pulpo Agenciamento com Comissão 5% e Repasse)
    const l4 = await client.execute("SELECT id FROM empresas WHERE codigo_licenca = '4' OR id = 4");
    if (l4.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO empresas (id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, modo_operacao, percentual_comissao_padrao, ativo)
              VALUES (4, '4', 10, 350.00, 10, '2026-08-28', 'PULPO AGENCIAMENTO & LOGÍSTICA LTDA', 'Pulpo Repasses - Licença 4', '48.912.345/0001-60', '(41) 3999-4400', 'contato@pulpo.com.br', '48912345000160', 'Curitiba', 'PR', 'agenciamento_repasse', 5.0, 1)`
      });
      console.log('✅ Licença #4 (Pulpo Agenciamento & Repasse) criada no Turso!');
    } else {
      await client.execute({
        sql: `UPDATE empresas SET modo_operacao = 'agenciamento_repasse', percentual_comissao_padrao = 5.0 WHERE id = ?`,
        args: [l4.rows[0].id]
      });
      console.log('✅ Licença #4 atualizada no Turso com modo_operacao = agenciamento_repasse!');
    }

    // 3. Cadastrar ou Atualizar Usuários com Isolamento Rígido de Licença
    console.log('⏳ Sincronizando usuários mestres e administradores...');
    const ghostPassHash = bcrypt.hashSync('master123', 10);
    const adminPassHash = bcrypt.hashSync('admin123', 10);

    // Garantir Super Admin Ghost (empresa_id = NULL)
    const ghostExists = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['ghost@sisfrete.com']
    });

    if (ghostExists.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO users (empresa_id, name, email, password_hash, role) VALUES (NULL, ?, ?, ?, ?)',
        args: ['Ghost Master (Super Admin)', 'ghost@sisfrete.com', ghostPassHash, 'super_admin']
      });
    } else {
      await client.execute({
        sql: 'UPDATE users SET empresa_id = NULL, role = ? WHERE email = ?',
        args: ['super_admin', 'ghost@sisfrete.com']
      });
    }

    // Admin Licença 1 (SisFrete Matriz)
    const admin1Exists = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['admin@sisfrete.com']
    });
    if (admin1Exists.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO users (empresa_id, name, email, password_hash, role) VALUES (1, ?, ?, ?, ?)',
        args: ['Administrador Arapongas', 'admin@sisfrete.com', adminPassHash, 'admin']
      });
    } else {
      await client.execute({
        sql: 'UPDATE users SET empresa_id = 1 WHERE email = ?',
        args: ['admin@sisfrete.com']
      });
    }

    // Operador Licença 1
    const op1Exists = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['operador@sisfrete.com']
    });
    if (op1Exists.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO users (empresa_id, name, email, password_hash, role) VALUES (1, ?, ?, ?, ?)',
        args: ['Operador Logístico', 'operador@sisfrete.com', adminPassHash, 'operador']
      });
    } else {
      await client.execute({
        sql: 'UPDATE users SET empresa_id = 1 WHERE email = ?',
        args: ['operador@sisfrete.com']
      });
    }

    // Admin da Licença 4 (Pulpo)
    const admin4Exists = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['admin@pulpo.com']
    });
    if (admin4Exists.rows.length === 0) {
      await client.execute({
        sql: 'INSERT INTO users (empresa_id, name, email, password_hash, role) VALUES (4, ?, ?, ?, ?)',
        args: ['Gerente Pulpo', 'admin@pulpo.com', adminPassHash, 'admin']
      });
      console.log('✅ Usuário admin@pulpo.com criado para a Licença 4 no Turso!');
    } else {
      await client.execute({
        sql: 'UPDATE users SET empresa_id = 4, role = ? WHERE email = ?',
        args: ['admin', 'admin@pulpo.com']
      });
    }

    // Motoristas com PIX na Licença 4
    const mot4 = await client.execute('SELECT COUNT(*) as count FROM motoristas WHERE empresa_id = 4');
    if (Number(mot4.rows[0].count) === 0) {
      await client.batch([
        {
          sql: `INSERT INTO motoristas (empresa_id, nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes)
                VALUES (4, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['Carlos Eduardo Silveira (Freteiro)', '044.891.239-11', '(41) 99881-2233', '04489123911', 'CPF', 'ABC-4D20', 'CAR-9911', 'Carreta LS', 'Curitiba', 'PR', 'Freteiro cadastrado - Chave PIX CPF Nubank']
        },
        {
          sql: `INSERT INTO motoristas (empresa_id, nome, cpf_cnpj, telefone, pix_chave, pix_tipo, placa_cavalo, placa_carreta, tipo_veiculo, cidade, uf, observacoes)
                VALUES (4, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: ['Marcos Rogério Barbosa (Freteiro)', '512.984.109-77', '(41) 98765-1122', 'marcos.fretes@gmail.com', 'E-mail', 'BRS-8E99', 'CAR-4422', 'Bitrem', 'Ponta Grossa', 'PR', 'Freteiro parceiro - Chave PIX E-mail Bradesco']
        }
      ], 'write');
      console.log('✅ Freteiros com Chave PIX cadastrados na Licença 4 no Turso!');
    }

    // 4. Sincronizar Faturas de Mensalidade Recorrente (R$ 350 com Vencimento Dia 10)
    console.log('⏳ Sincronizando cobranças de mensalidades (R$ 350 / Dia 10)...');
    const hoje = new Date();
    const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const empresasRes = await client.execute('SELECT id, valor_mensalidade, dia_vencimento FROM empresas WHERE ativo = 1');

    for (const emp of empresasRes.rows) {
      const cobExist = await client.execute({
        sql: 'SELECT id FROM licencas_cobrancas WHERE empresa_id = ? AND mes_referencia = ?',
        args: [emp.id, anoMes]
      });

      if (cobExist.rows.length === 0) {
        const diaVencStr = String(emp.dia_vencimento || 10).padStart(2, '0');
        const dataVenc = `${anoMes}-${diaVencStr}`;
        const hojeStr = hoje.toISOString().slice(0, 10);
        const status = (hojeStr > dataVenc) ? 'atrasado' : 'pendente';

        await client.execute({
          sql: `INSERT INTO licencas_cobrancas (empresa_id, mes_referencia, data_vencimento, valor, status)
                VALUES (?, ?, ?, ?, ?)`,
          args: [emp.id, anoMes, dataVenc, Number(emp.valor_mensalidade || 350.00), status]
        });
      }
    }
    console.log('✅ Cobranças do mês sincronizadas no Turso!');

    console.log('\n====================================================');
    console.log('🎉 MIGRAÇÃO TURSO CONCLUÍDA COM 100% DE SUCESSO!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Erro durante a migração no Turso:', err);
    process.exit(1);
  }
}

migrateTurso();
