const fs = require('node:fs');
const path = require('node:path');
const db = require('../config/database');

// Listar todas as empresas cadastradas no sistema
const listEmpresas = async (req, res) => {
  try {
    const empresas = db.prepare(`
      SELECT e.*,
        COALESCE(e.codigo_licenca, CAST(e.id AS TEXT)) as codigo_licenca,
        COALESCE(e.limite_logins, 5) as limite_logins,
        (SELECT COUNT(*) FROM fretes f WHERE f.empresa_id = e.id) as total_fretes,
        (SELECT COUNT(*) FROM users u WHERE u.empresa_id = e.id) as total_usuarios
      FROM empresas e
      ORDER BY e.id ASC
    `).all();
    return res.json(empresas);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    return res.status(500).json({ error: 'Erro ao listar empresas.' });
  }
};

// Buscar empresa por ID ou Código de Licença
const getEmpresaById = async (req, res) => {
  try {
    await syncFromCloud();
    const { id } = req.params;
    const empresa = db.prepare('SELECT * FROM empresas WHERE id = ? OR codigo_licenca = ?').get(id, String(id));
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa / Licença não encontrada.' });
    }
    return res.json(empresa);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar empresa.' });
  }
};

// Criar nova empresa/filial (Multi-Tenant por ID / Código de Licença)
const createEmpresa = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const {
      codigo_licenca,
      limite_logins = 5,
      valor_mensalidade = 350.00,
      dia_vencimento = 10,
      tipo_licenca = 'paga', // 'paga' | 'teste_7dias' | 'gratuita'
      data_expiracao_teste,
      modo_operacao = 'padrao',
      percentual_comissao_padrao = 5.0,
      modulos_ativos,
      razao_social,
      nome_fantasia,
      cnpj,
      telefone,
      email,
      chave_pix,
      banco,
      agencia,
      conta,
      cidade,
      uf,
      // Dados opcionais do primeiro usuário Administrador da licença
      admin_name,
      admin_email,
      admin_password,
    } = req.body;

    if (!razao_social) {
      return res.status(400).json({ error: 'Razão Social da empresa é obrigatória.' });
    }

    const codLicenca = codigo_licenca ? String(codigo_licenca).trim() : null;

    if (codLicenca) {
      const existing = db.prepare('SELECT id FROM empresas WHERE codigo_licenca = ?').get(codLicenca);
      if (existing) {
        return res.status(400).json({ error: `Já existe uma empresa cadastrada com a Licença / ID '${codLicenca}'. Escolha outro número de ID.` });
      }
    }

    // Tratar valor da mensalidade e data de expiração para teste
    let valorMensalidadeNum = valor_mensalidade !== undefined && valor_mensalidade !== '' ? Number(valor_mensalidade) : 350.00;
    if (isNaN(valorMensalidadeNum)) valorMensalidadeNum = 0;

    let dataExpTesteFinal = data_expiracao_teste || null;
    if (tipo_licenca === 'teste_7dias' && !dataExpTesteFinal) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dataExpTesteFinal = d.toISOString().slice(0, 10);
      valorMensalidadeNum = 0; // Teste não cobra mensalidade imediata
    } else if (tipo_licenca === 'gratuita') {
      valorMensalidadeNum = 0;
    }

    // Processar módulos ativos para a licença (JSON array ou null para padrão)
    let modulosAtivosStr = null;
    if (Array.isArray(modulos_ativos)) {
      modulosAtivosStr = JSON.stringify(modulos_ativos);
    } else if (typeof modulos_ativos === 'string' && modulos_ativos.trim() !== '') {
      modulosAtivosStr = modulos_ativos.trim();
    }

    const ins = db.prepare(`
      INSERT INTO empresas (
        codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao,
        tipo_licenca, data_expiracao_teste,
        modo_operacao, percentual_comissao_padrao, modulos_ativos,
        razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, banco, agencia, conta, cidade, uf, ativo
      ) VALUES (?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      codLicenca,
      Number(limite_logins) || 5,
      valorMensalidadeNum,
      Number(dia_vencimento) || 10,
      tipo_licenca || 'paga',
      dataExpTesteFinal,
      modo_operacao || 'padrao',
      Number(percentual_comissao_padrao) || 5.0,
      modulosAtivosStr,
      razao_social.trim(),
      (nome_fantasia || razao_social).trim(),
      cnpj || '',
      telefone || '',
      email || '',
      chave_pix || '',
      banco || '',
      agencia || '',
      conta || '',
      cidade || '',
      uf || 'PR'
    );

    const novaEmpresaId = Number(ins.lastInsertRowid);
    
    // Se o código da licença não foi fornecido, definir como o próprio ID gerado
    const codLicencaFinal = codLicenca || String(novaEmpresaId);
    if (!codLicenca) {
      db.prepare('UPDATE empresas SET codigo_licenca = ? WHERE id = ?').run(codLicencaFinal, novaEmpresaId);
    }

    // 1. Gerar automaticamente a fatura se a mensalidade for maior que zero e plano for pago
    if (valorMensalidadeNum > 0 && tipo_licenca === 'paga') {
      const hoje = new Date();
      const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      const diaVencStr = String(dia_vencimento || 10).padStart(2, '0');
      const dataVenc = `${anoMes}-${diaVencStr}`;
      const hojeStr = hoje.toISOString().slice(0, 10);
      const statusInicial = (hojeStr > dataVenc) ? 'atrasado' : 'pendente';

      try {
        db.prepare(`
          INSERT INTO licencas_cobrancas (empresa_id, mes_referencia, data_vencimento, valor, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(novaEmpresaId, anoMes, dataVenc, valorMensalidadeNum, statusInicial);
      } catch (eCobranca) {
        console.warn('Aviso: cobrança automática de nova licença:', eCobranca.message);
      }
    }

    // 2. Se fornecido usuário administrador inicial da licença, cadastrar imediatamente
    let adminCriado = null;
    let passHashAdmin = null;
    if (admin_email && admin_password) {
      const emailLimpo = admin_email.trim().toLowerCase();
      const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(emailLimpo);
      if (!existingUser) {
        passHashAdmin = bcrypt.hashSync(admin_password.trim(), 10);
        const insUser = db.prepare(`
          INSERT INTO users (empresa_id, name, email, password_hash, role)
          VALUES (?, ?, ?, ?, 'admin')
        `).run(novaEmpresaId, (admin_name || nome_fantasia || razao_social).trim(), emailLimpo, passHashAdmin);
        adminCriado = {
          id: Number(insUser.lastInsertRowid),
          name: (admin_name || nome_fantasia || razao_social).trim(),
          email: emailLimpo,
          role: 'admin',
        };
      }
    }

    // Sincronizar com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: `INSERT INTO empresas (id, codigo_licenca, limite_logins, valor_mensalidade, dia_vencimento, data_adesao, tipo_licenca, data_expiracao_teste, modo_operacao, percentual_comissao_padrao, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, banco, agencia, conta, cidade, uf, ativo)
                VALUES (?, ?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          args: [
            novaEmpresaId, codLicencaFinal, Number(limite_logins) || 5, valorMensalidadeNum, Number(dia_vencimento) || 10,
            tipo_licenca || 'paga', dataExpTesteFinal,
            modo_operacao || 'padrao', Number(percentual_comissao_padrao) || 5.0, razao_social.trim(), (nome_fantasia || razao_social).trim(),
            cnpj || '', telefone || '', email || '', chave_pix || '', banco || '', agencia || '', conta || '', cidade || '', uf || 'PR'
          ]
        });
        if (adminCriado && passHashAdmin) {
          await turso.execute({
            sql: `INSERT INTO users (id, empresa_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, 'admin')`,
            args: [adminCriado.id, novaEmpresaId, adminCriado.name, adminCriado.email, passHashAdmin]
          });
        }
      } catch (tErr) {
        console.warn('Aviso sincronização createEmpresa Turso:', tErr.message);
      }
    }

    const empresaCriada = db.prepare('SELECT * FROM empresas WHERE id = ?').get(novaEmpresaId);

    return res.status(201).json({
      message: tipo_licenca === 'teste_7dias'
        ? `⏱️ Licença de Teste 7 Dias #${empresaCriada.codigo_licenca || empresaCriada.id} cadastrada com sucesso! Expira em ${new Date(dataExpTesteFinal + 'T12:00:00').toLocaleDateString('pt-BR')}.`
        : `Empresa / Licença #${empresaCriada.codigo_licenca || empresaCriada.id} cadastrada com sucesso!`,
      empresa: empresaCriada,
      admin_user: adminCriado,
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa: ' + error.message });
  }
};

// Atualizar dados de uma empresa/filial
const updateEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_licenca,
      limite_logins,
      valor_mensalidade,
      dia_vencimento,
      tipo_licenca,
      data_expiracao_teste,
      modo_operacao,
      percentual_comissao_padrao,
      modulos_ativos,
      razao_social,
      nome_fantasia,
      cnpj,
      telefone,
      email,
      chave_pix,
      banco,
      agencia,
      conta,
      cidade,
      uf,
      ativo,
    } = req.body;

    const existing = db.prepare('SELECT id, codigo_licenca, valor_mensalidade, tipo_licenca, data_expiracao_teste, modulos_ativos FROM empresas WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    const codLicenca = codigo_licenca !== undefined ? String(codigo_licenca).trim() : existing.codigo_licenca;

    if (codLicenca && codLicenca !== existing.codigo_licenca) {
      const duplicate = db.prepare('SELECT id FROM empresas WHERE codigo_licenca = ? AND id != ?').get(codLicenca, id);
      if (duplicate) {
        return res.status(400).json({ error: `O ID / Licença '${codLicenca}' já está sendo utilizado por outra empresa.` });
      }
    }

    // Permite zerar a mensalidade sem forçar 350.00
    let valorMensalidadeFinal = existing.valor_mensalidade;
    if (valor_mensalidade !== undefined && valor_mensalidade !== null && valor_mensalidade !== '') {
      valorMensalidadeFinal = Number(valor_mensalidade);
      if (isNaN(valorMensalidadeFinal)) valorMensalidadeFinal = 0;
    }

    let tipoLicencaFinal = tipo_licenca || existing.tipo_licenca || 'paga';
    let dataExpTesteFinal = data_expiracao_teste !== undefined ? data_expiracao_teste : existing.data_expiracao_teste;

    if (tipoLicencaFinal === 'gratuita') {
      valorMensalidadeFinal = 0;
    } else if (tipoLicencaFinal === 'teste_7dias' && !dataExpTesteFinal) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dataExpTesteFinal = d.toISOString().slice(0, 10);
      valorMensalidadeFinal = 0;
    }

    let modulosAtivosFinal = existing.modulos_ativos;
    if (modulos_ativos !== undefined) {
      if (Array.isArray(modulos_ativos)) {
        modulosAtivosFinal = JSON.stringify(modulos_ativos);
      } else if (typeof modulos_ativos === 'string') {
        modulosAtivosFinal = modulos_ativos.trim() || null;
      } else if (modulos_ativos === null) {
        modulosAtivosFinal = null;
      }
    }

    db.prepare(`
      UPDATE empresas SET
        codigo_licenca = ?, limite_logins = ?, valor_mensalidade = ?, dia_vencimento = ?,
        tipo_licenca = ?, data_expiracao_teste = ?,
        modo_operacao = COALESCE(?, modo_operacao, 'padrao'),
        percentual_comissao_padrao = COALESCE(?, percentual_comissao_padrao, 5.0),
        modulos_ativos = ?,
        razao_social = ?, nome_fantasia = ?, cnpj = ?,
        telefone = ?, email = ?, chave_pix = ?, banco = ?, agencia = ?, conta = ?,
        cidade = ?, uf = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      codLicenca || String(id),
      limite_logins !== undefined ? Number(limite_logins) : 5,
      valorMensalidadeFinal,
      dia_vencimento !== undefined ? Number(dia_vencimento) : 10,
      tipoLicencaFinal,
      dataExpTesteFinal,
      modo_operacao || null,
      percentual_comissao_padrao !== undefined ? Number(percentual_comissao_padrao) : null,
      modulosAtivosFinal,
      razao_social || 'SisFrete Transportes',
      nome_fantasia || razao_social,
      cnpj || '',
      telefone || '',
      email || '',
      chave_pix || '',
      banco || '',
      agencia || '',
      conta || '',
      cidade || '',
      uf || 'PR',
      ativo !== undefined ? (ativo ? 1 : 0) : 1,
      id
    );

    // Sincronizar com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: `UPDATE empresas SET
                  codigo_licenca = ?, limite_logins = ?, valor_mensalidade = ?, dia_vencimento = ?,
                  tipo_licenca = ?, data_expiracao_teste = ?,
                  modo_operacao = COALESCE(?, modo_operacao, 'padrao'),
                  percentual_comissao_padrao = COALESCE(?, percentual_comissao_padrao, 5.0),
                  modulos_ativos = ?,
                  razao_social = ?, nome_fantasia = ?, cnpj = ?,
                  telefone = ?, email = ?, chave_pix = ?, banco = ?, agencia = ?, conta = ?,
                  cidade = ?, uf = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? OR codigo_licenca = ?`,
          args: [
            codLicenca || String(id), limite_logins !== undefined ? Number(limite_logins) : 5,
            valorMensalidadeFinal, dia_vencimento !== undefined ? Number(dia_vencimento) : 10,
            tipoLicencaFinal, dataExpTesteFinal,
            modo_operacao || null, percentual_comissao_padrao !== undefined ? Number(percentual_comissao_padrao) : null,
            modulosAtivosFinal,
            razao_social || 'SisFrete Transportes', nome_fantasia || razao_social, cnpj || '',
            telefone || '', email || '', chave_pix || '', banco || '', agencia || '', conta || '',
            cidade || '', uf || 'PR', ativo !== undefined ? (ativo ? 1 : 0) : 1,
            id, String(id)
          ]
        });
      } catch (tErr) {
        console.warn('Aviso sincronização updateEmpresa Turso:', tErr.message);
      }
    }

    const updated = db.prepare('SELECT * FROM empresas WHERE id = ?').get(id);
    return res.json({
      message: 'Licença / Empresa atualizada com sucesso!',
      empresa: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return res.status(500).json({ error: 'Erro ao atualizar empresa: ' + error.message });
  }
};

// Excluir ou desativar empresa
const deleteEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = Number(id);

    if (empresaId === 1) {
      return res.status(400).json({ error: 'A empresa principal matriz (ID: 1) não pode ser excluída.' });
    }

    // Excluir em cascata todos os dados da empresa
    db.prepare('DELETE FROM licencas_cobrancas WHERE empresa_id = ?').run(empresaId);
    db.prepare('DELETE FROM adiantamentos_historico WHERE empresa_id = ?').run(empresaId);
    db.prepare('DELETE FROM fretes WHERE empresa_id = ?').run(empresaId);
    db.prepare('DELETE FROM motoristas WHERE empresa_id = ?').run(empresaId);
    db.prepare('DELETE FROM clientes WHERE empresa_id = ?').run(empresaId);
    db.prepare('DELETE FROM users WHERE empresa_id = ?').run(empresaId);
    db.prepare('DELETE FROM empresas WHERE id = ?').run(empresaId);

    // Sincronizar com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({ sql: 'DELETE FROM licencas_cobrancas WHERE empresa_id = ?', args: [empresaId] });
        await turso.execute({ sql: 'DELETE FROM adiantamentos_historico WHERE empresa_id = ?', args: [empresaId] });
        await turso.execute({ sql: 'DELETE FROM fretes WHERE empresa_id = ?', args: [empresaId] });
        await turso.execute({ sql: 'DELETE FROM motoristas WHERE empresa_id = ?', args: [empresaId] });
        await turso.execute({ sql: 'DELETE FROM clientes WHERE empresa_id = ?', args: [empresaId] });
        await turso.execute({ sql: 'DELETE FROM users WHERE empresa_id = ?', args: [empresaId] });
        await turso.execute({ sql: 'DELETE FROM empresas WHERE id = ?', args: [empresaId] });
      } catch (tErr) {
        console.warn('Aviso sincronização deleteEmpresa Turso:', tErr.message);
      }
    }

    return res.json({ message: 'Empresa e todos os seus registros excluídos com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir empresa: ' + error.message });
  }
};

// Obter configurações da empresa ativa na sessão
const getEmpresaConfig = (req, res) => {
  try {
    const empresaId = req.empresaId || (req.user?.empresa_id ? Number(req.user.empresa_id) : 1);
    let config = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId);
    if (!config && req.user?.role === 'super_admin') {
      config = db.prepare('SELECT * FROM empresas ORDER BY id ASC LIMIT 1').get();
    }
    if (!config) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados da empresa.' });
  }
};

// Atualizar configurações da empresa ativa na sessão
const updateEmpresaConfig = async (req, res) => {
  try {
    const empresaId = req.empresaId || (req.user?.empresa_id ? Number(req.user.empresa_id) : 1);
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      telefone,
      email,
      chave_pix,
      banco,
      agencia,
      conta,
      cidade,
      uf,
    } = req.body;

    const finalRazao = razao_social || 'Transportes & Logística';
    const finalFantasia = nome_fantasia || razao_social;

    db.prepare(`
      UPDATE empresas SET
        razao_social = ?, nome_fantasia = ?, cnpj = ?, telefone = ?, email = ?,
        chave_pix = ?, banco = ?, agencia = ?, conta = ?, cidade = ?, uf = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      finalRazao,
      finalFantasia,
      cnpj || '',
      telefone || '',
      email || '',
      chave_pix || '',
      banco || '',
      agencia || '',
      conta || '',
      cidade || '',
      uf || 'PR',
      empresaId
    );

    // Sincronizar com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: `UPDATE empresas SET
                  razao_social = ?, nome_fantasia = ?, cnpj = ?, telefone = ?, email = ?,
                  chave_pix = ?, banco = ?, agencia = ?, conta = ?, cidade = ?, uf = ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [
            finalRazao, finalFantasia, cnpj || '', telefone || '', email || '',
            chave_pix || '', banco || '', agencia || '', conta || '', cidade || '', uf || 'PR',
            empresaId
          ]
        });
      } catch (tErr) {
        console.warn('Aviso sincronização updateEmpresaConfig Turso:', tErr.message);
      }
    }

    const updated = db.prepare('SELECT * FROM empresas WHERE id = ?').get(empresaId);

    return res.json({
      message: 'Configurações da empresa atualizadas com sucesso!',
      empresa: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar dados da empresa: ' + error.message });
  }
};

/**
 * Estatísticas do Banco de Dados por Empresa / Licença (Contagem de Registros sem alterar estrutura)
 */
const getDatabaseStats = (req, res) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const empresaIdUser = req.empresaId || req.user?.empresa_id || 1;

    let empresas = [];
    if (isSuperAdmin) {
      empresas = db.prepare('SELECT id, codigo_licenca, razao_social, nome_fantasia, cnpj FROM empresas ORDER BY id ASC').all();
    } else {
      empresas = db.prepare('SELECT id, codigo_licenca, razao_social, nome_fantasia, cnpj FROM empresas WHERE id = ?').all(empresaIdUser);
    }

    const stats = empresas.map(emp => {
      const empId = emp.id;
      const empIdStr = String(emp.id);
      const totalFretes = db.prepare('SELECT COUNT(*) as count FROM fretes WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalTitulos = db.prepare('SELECT COUNT(*) as count FROM financeiro_titulos WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalAdiantamentos = db.prepare('SELECT COUNT(*) as count FROM adiantamentos_historico WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalRastreamento = db.prepare('SELECT COUNT(*) as count FROM frete_eventos_rastreamento WHERE frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)').get(empId, empIdStr)?.count || 0;
      const totalMotoristas = db.prepare('SELECT COUNT(*) as count FROM motoristas WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalClientes = db.prepare('SELECT COUNT(*) as count FROM clientes WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalMdfes = db.prepare('SELECT COUNT(*) as count FROM mdfes WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalManutencoes = db.prepare('SELECT COUNT(*) as count FROM veiculos_manutencoes WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalPneus = db.prepare('SELECT COUNT(*) as count FROM veiculos_pneus WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;
      const totalCobrancas = db.prepare('SELECT COUNT(*) as count FROM cobrancas_bancarias WHERE empresa_id = ? OR empresa_id = ?').get(empId, empIdStr)?.count || 0;

      const totalRegistros = totalFretes + totalTitulos + totalAdiantamentos + totalRastreamento + totalMotoristas + totalClientes + totalMdfes + totalManutencoes + totalPneus + totalCobrancas;

      return {
        empresa_id: emp.id,
        codigo_licenca: emp.codigo_licenca || String(emp.id),
        nome_fantasia: emp.nome_fantasia || emp.razao_social || `Licença #${emp.id}`,
        razao_social: emp.razao_social || '',
        cnpj: emp.cnpj || '',
        fretes: totalFretes,
        financeiro: totalTitulos,
        adiantamentos: totalAdiantamentos,
        rastreamento: totalRastreamento,
        motoristas: totalMotoristas,
        clientes: totalClientes,
        mdfes: totalMdfes,
        manutencoes: totalManutencoes,
        pneus: totalPneus,
        cobrancas: totalCobrancas,
        total_registros: totalRegistros
      };
    });

    return res.json({
      empresas: stats,
      total_geral: stats.reduce((acc, curr) => acc + curr.total_registros, 0)
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do banco de dados:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas do banco de dados.' });
  }
};

// Reset do banco de dados completo e isolado por empresa (Tenant-scoped ou Global)
const resetDatabase = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const empresaIdUser = req.empresaId || req.user?.empresa_id || 1;
    
    // Alvo pode ser informado pelo Super Admin, ou padrão é a empresa do usuário
    const targetEmpresaId = req.body?.empresa_id ? (isSuperAdmin ? req.body.empresa_id : empresaIdUser) : empresaIdUser;
    const scope = req.body?.scope || 'operacional'; // 'operacional' | 'completo' | 'global_todos'
    const scopeAll = (scope === 'global_todos' || req.body?.scope === 'all' || targetEmpresaId === 'all') && isSuperAdmin;

    let targetEmpresa = null;
    let nomeEmpresa = '';

    if (!scopeAll) {
      targetEmpresa = db.prepare('SELECT id, codigo_licenca, nome_fantasia, razao_social FROM empresas WHERE id = ? OR codigo_licenca = ?').get(targetEmpresaId, String(targetEmpresaId));
      if (!targetEmpresa) {
        return res.status(404).json({ error: 'Empresa / Licença não encontrada.' });
      }
      nomeEmpresa = targetEmpresa.nome_fantasia || targetEmpresa.razao_social || `Licença ID #${targetEmpresaId}`;
    }

    if (scopeAll) {
      // 1. Limpeza global de todas as tabelas transacionais de todas as empresas (estrutura preservada 100%)
      db.prepare('DELETE FROM mdfe_ctes_vinculados').run();
      db.prepare('DELETE FROM mdfes').run();
      db.prepare('DELETE FROM frete_eventos_rastreamento').run();
      db.prepare('DELETE FROM cobrancas_bancarias').run();
      db.prepare('DELETE FROM adiantamentos_historico').run();
      db.prepare('DELETE FROM financeiro_titulos').run();
      db.prepare('DELETE FROM veiculos_manutencoes').run();
      db.prepare('DELETE FROM veiculos_pneus').run();
      db.prepare('DELETE FROM fretes').run();
      if (scope === 'completo' || scope === 'global_todos') {
        db.prepare('DELETE FROM motoristas').run();
        db.prepare('DELETE FROM clientes').run();
      }
    } else {
      const empId = Number(targetEmpresa.id);
      const empIdStr = String(targetEmpresa.id);

      // Limpeza de MDF-e
      db.prepare(`
        DELETE FROM mdfe_ctes_vinculados 
        WHERE mdfe_id IN (SELECT id FROM mdfes WHERE empresa_id = ? OR empresa_id = ?) 
           OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)
      `).run(empId, empIdStr, empId, empIdStr);
      db.prepare('DELETE FROM mdfes WHERE empresa_id = ? OR empresa_id = ?').run(empId, empIdStr);

      // Eventos de Rastreamento / Torre de Controle
      db.prepare('DELETE FROM frete_eventos_rastreamento WHERE frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)').run(empId, empIdStr);

      // Boletos / Cobranças
      db.prepare('DELETE FROM cobrancas_bancarias WHERE empresa_id = ? OR empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)').run(empId, empIdStr, empId, empIdStr);

      // Adiantamentos
      db.prepare('DELETE FROM adiantamentos_historico WHERE empresa_id = ? OR empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)').run(empId, empIdStr, empId, empIdStr);

      // Financeiro
      db.prepare('DELETE FROM financeiro_titulos WHERE empresa_id = ? OR empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)').run(empId, empIdStr, empId, empIdStr);

      // Fretes
      db.prepare('DELETE FROM fretes WHERE empresa_id = ? OR empresa_id = ?').run(empId, empIdStr);

      // Frotas
      db.prepare('DELETE FROM veiculos_manutencoes WHERE empresa_id = ? OR empresa_id = ?').run(empId, empIdStr);
      db.prepare('DELETE FROM veiculos_pneus WHERE empresa_id = ? OR empresa_id = ?').run(empId, empIdStr);

      // Se escopo for completo, limpa também motoristas e clientes
      if (scope === 'completo') {
        db.prepare('DELETE FROM motoristas WHERE empresa_id = ? OR empresa_id = ?').run(empId, empIdStr);
        db.prepare('DELETE FROM clientes WHERE empresa_id = ? OR empresa_id = ?').run(empId, empIdStr);
      }
    }

    // 2. Limpar o Turso Cloud para que o syncFromTurso NÃO traga os dados de volta
    const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://sisfrete-leo-r-b.aws-us-east-2.turso.io';
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc4NjMxMDcsImlkIjoiMDFhMDQ0ZjEtYzUwMS03OTFjLTgyMTYtNTYyYjA3OTNhNmNhIiwia2lkIjoid2pGSVBxSDJRcVZmX3E5Q2RUYlpiSWdDb3E5WWFUQUJYVm4xTXJwd1Z1USIsInJpZCI6IjY0NmEzYmYyLTJiNDYtNDk1My05MjZmLTMzMTJjYjNiNGE3NSJ9.xvZkVFq-61olLVmeqcaeVZA0t6V___B4nsCQPu45TmctOSpqGQGtUFO6VeUU-2KwTbOqrnK22H2ltKwNUZAVAA';

    let tursoCleanupErrors = [];
    try {
      const { createClient } = require('@libsql/client');
      const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

      // Lista de tabelas a limpar no Turso (mesma ordem do SQLite local)
      const tablesToClean = scopeAll
        ? [
            'mdfe_ctes_vinculados', 'mdfes', 'frete_eventos_rastreamento',
            'cobrancas_bancarias', 'adiantamentos_historico', 'financeiro_titulos',
            'veiculos_manutencoes', 'veiculos_pneus', 'fretes',
            ...(scope === 'completo' || scope === 'global_todos' ? ['motoristas', 'clientes'] : [])
          ]
        : null;

      if (scopeAll) {
        for (const table of tablesToClean) {
          try {
            await turso.execute(`DELETE FROM ${table}`);
          } catch (tableErr) {
            tursoCleanupErrors.push(`${table}: ${tableErr.message}`);
          }
        }
      } else {
        const empId = Number(targetEmpresa.id);
        const empIdStr = String(targetEmpresa.id);

        // Cada DELETE é isolado para que falha em uma tabela não bloqueie as outras
        const deletes = [
          { sql: `DELETE FROM mdfe_ctes_vinculados WHERE mdfe_id IN (SELECT id FROM mdfes WHERE empresa_id = ? OR empresa_id = ?) OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)`, args: [empId, empIdStr, empId, empIdStr] },
          { sql: 'DELETE FROM mdfes WHERE empresa_id = ? OR empresa_id = ?', args: [empId, empIdStr] },
          { sql: 'DELETE FROM frete_eventos_rastreamento WHERE frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)', args: [empId, empIdStr] },
          { sql: 'DELETE FROM cobrancas_bancarias WHERE empresa_id = ? OR empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)', args: [empId, empIdStr, empId, empIdStr] },
          { sql: 'DELETE FROM adiantamentos_historico WHERE empresa_id = ? OR empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)', args: [empId, empIdStr, empId, empIdStr] },
          { sql: 'DELETE FROM financeiro_titulos WHERE empresa_id = ? OR empresa_id = ? OR frete_id IN (SELECT id FROM fretes WHERE empresa_id = ? OR empresa_id = ?)', args: [empId, empIdStr, empId, empIdStr] },
          { sql: 'DELETE FROM veiculos_manutencoes WHERE empresa_id = ? OR empresa_id = ?', args: [empId, empIdStr] },
          { sql: 'DELETE FROM veiculos_pneus WHERE empresa_id = ? OR empresa_id = ?', args: [empId, empIdStr] },
          { sql: 'DELETE FROM fretes WHERE empresa_id = ? OR empresa_id = ?', args: [empId, empIdStr] },
        ];

        if (scope === 'completo') {
          deletes.push(
            { sql: 'DELETE FROM motoristas WHERE empresa_id = ? OR empresa_id = ?', args: [empId, empIdStr] },
            { sql: 'DELETE FROM clientes WHERE empresa_id = ? OR empresa_id = ?', args: [empId, empIdStr] }
          );
        }

        for (const del of deletes) {
          try {
            await turso.execute(del);
          } catch (tableErr) {
            tursoCleanupErrors.push(tableErr.message);
          }
        }
      }

      if (tursoCleanupErrors.length > 0) {
        console.warn('Avisos na limpeza Turso (parcialmente concluída):', tursoCleanupErrors);
      }
    } catch (tursoErr) {
      console.warn('Aviso: erro ao conectar com Turso Cloud para limpeza:', tursoErr.message);
    }

    // 3. Forçar reset do timestamp de sync para que o próximo syncFromTurso NÃO re-popule dados apagados
    try {
      const { resetSyncTimestamp } = require('../config/tursoSync');
      if (typeof resetSyncTimestamp === 'function') resetSyncTimestamp();
    } catch (e) {}

    const msg = scopeAll
      ? 'Limpeza global realizada com sucesso! Todos os dados operacionais e financeiros de todas as empresas foram limpos. Estrutura do banco, usuários e empresas permanecem 100% intactos.'
      : `Dados ${scope === 'completo' ? 'completos' : 'operacionais e financeiros'} da licença "${nomeEmpresa}" (ID #${targetEmpresaId}) foram apagados com sucesso! A estrutura do banco de dados, logins e certificado A1 permanecem intactos.`;

    return res.json({
      success: true,
      message: msg,
      tursoWarnings: tursoCleanupErrors.length > 0 ? tursoCleanupErrors : undefined
    });
  } catch (error) {
    console.error('Erro ao resetar banco de dados:', error);
    return res.status(500).json({ error: 'Erro ao limpar banco de dados: ' + error.message });
  }
};

module.exports = {
  listEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getEmpresaConfig,
  updateEmpresaConfig,
  getDatabaseStats,
  resetDatabase,
};

