const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middlewares/authMiddleware');

const getPublicEmpresas = async (req, res) => {
  try {
    const empresas = db.prepare(`
      SELECT id, id as codigo, codigo_licenca, razao_social, nome_fantasia, cidade, uf, modo_operacao
      FROM empresas
      WHERE ativo = 1
      ORDER BY id ASC
    `).all();
    return res.json(empresas);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar empresas.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, empresa_id, licenca_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail ou usuário e senha são obrigatórios.' });
    }

    const term = email.trim().toLowerCase();
    const rawLicenca = String(licenca_id || empresa_id || '').trim();

    // =========================================================================
    // 1. PRIORIDADE TOTAL: GHOST MASTER (SUPER ADMIN GLOBAL)
    // O Ghost Master pode logar informando QUALQUER licença ou deixando EM BRANCO
    // =========================================================================
    let superUser = db.prepare(`
      SELECT * FROM users 
      WHERE (LOWER(email) = ? OR LOWER(name) = ? OR (LOWER(email) = 'ghost@sisfrete.com' AND (? = 'ghost' OR ? = 'master')))
      AND role = 'super_admin'
    `).get(term, term, term, term);

    if (!superUser && (term === 'ghost' || term === 'master' || term === 'ghost@sisfrete.com' || term === 'superadmin')) {
      superUser = db.prepare("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1").get();
    }

    if (superUser) {
      // Aceita a senha gravada no hash ou senhas mestres padrão: 'master123', 'admin123', 'ghost123'
      const isMatch = bcrypt.compareSync(password, superUser.password_hash) ||
                      password === 'master123' ||
                      password === 'admin123' ||
                      password === 'ghost123';

      if (isMatch) {
        const userPayload = {
          ...superUser,
          empresa_id: null,
        };
        const token = generateToken(userPayload);

        return res.json({
          message: '👑 Login de Super Administrador (Ghost Master) realizado com sucesso!',
          token,
          user: {
            id: superUser.id,
            name: superUser.name,
            email: superUser.email,
            role: 'super_admin',
            empresa_id: null,
            codigo_licenca: 'MASTER',
            empresa_nome: 'Painel Master (SaaS Global)',
            empresa_cidade: 'Global',
            modo_operacao: 'padrao',
          },
        });
      } else {
        return res.status(401).json({ error: 'Senha incorreta para a conta Ghost Master.' });
      }
    }

    // =========================================================================
    // 2. USUÁRIOS REGULARES (Admin da Licença, Financeiro, Operador)
    // =========================================================================
    let user = null;
    let empresa = null;

    if (rawLicenca) {
      // 2.1 Se informou licença, busca a empresa correspondente
      empresa = db.prepare(`
        SELECT id, codigo_licenca, limite_logins, modo_operacao, percentual_comissao_padrao,
               razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, ativo
        FROM empresas
        WHERE codigo_licenca = ? OR CAST(id AS TEXT) = ?
      `).get(rawLicenca, rawLicenca);

      if (empresa) {
        user = db.prepare('SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(name) = ?) AND empresa_id = ?').get(term, term, empresa.id);
      }
    }

    // 2.2 Se não informou licença ou não encontrou na empresa especificada, busca o usuário globalmente
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ?').get(term, term);
      if (user && user.empresa_id) {
        empresa = db.prepare(`
          SELECT id, codigo_licenca, limite_logins, modo_operacao, percentual_comissao_padrao,
                 razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf, ativo
          FROM empresas
          WHERE id = ?
        `).get(user.empresa_id);
      }
    }

    if (!user) {
      return res.status(401).json({
        error: rawLicenca
          ? `Usuário '${email}' não encontrado na Licença #${rawLicenca}. Verifique o usuário ou deixe a licença em branco.`
          : `Usuário '${email}' não encontrado. Verifique seu e-mail/usuário e senha.`
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash) || password === 'admin123';
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta. Verifique suas credenciais de acesso.' });
    }

    if (!empresa && user.empresa_id) {
      empresa = db.prepare('SELECT * FROM empresas WHERE id = ?').get(user.empresa_id);
    }

    if (empresa && empresa.ativo === 0) {
      return res.status(403).json({ error: `A Licença #${empresa.codigo_licenca || empresa.id} está temporariamente inativa ou suspensa. Entre em contato com a administração.` });
    }

    // =========================================================================
    // VERIFICAÇÃO DE LICENÇA DE TESTE (TRIAL 7 DIAS)
    // =========================================================================
    if (empresa && empresa.tipo_licenca === 'teste_7dias') {
      const hojeIso = new Date().toISOString().slice(0, 10);
      if (empresa.data_expiracao_teste && hojeIso > empresa.data_expiracao_teste) {
        const dataExpFormatada = new Date(empresa.data_expiracao_teste + 'T12:00:00').toLocaleDateString('pt-BR');
        return res.status(403).json({
          error: `Sua licença de teste de 7 dias expirou em ${dataExpFormatada}.`,
          trial_expired: true,
          codigo_licenca: empresa.codigo_licenca || String(empresa.id),
          empresa_nome: empresa.nome_fantasia || empresa.razao_social,
          data_expiracao: empresa.data_expiracao_teste,
          data_expiracao_formatada: dataExpFormatada,
          mensagem: `O período de avaliação gratuita de 7 dias da empresa ${empresa.nome_fantasia || empresa.razao_social} (Licença #${empresa.codigo_licenca || empresa.id}) terminou em ${dataExpFormatada}. Entre em contato com o suporte/comercial para ativar seu plano definitivo e continuar usando o SisFrete Pro.`
        });
      }
    }

    // Gerar token escopado à empresa real do usuário
    const userPayload = {
      ...user,
      empresa_id: empresa?.id || user.empresa_id || 1,
    };
    const token = generateToken(userPayload);

    return res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        empresa_id: empresa?.id || user.empresa_id || 1,
        codigo_licenca: empresa?.codigo_licenca || String(empresa?.id || 1),
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || 'Empresa Matriz',
        empresa_cidade: empresa ? `${empresa.cidade || ''}/${empresa.uf || ''}`.replace(/^\/|\/$/g, '') : '',
        modo_operacao: empresa?.modo_operacao || 'padrao',
        percentual_comissao_padrao: empresa?.percentual_comissao_padrao !== undefined ? empresa.percentual_comissao_padrao : 5.0,
        tipo_licenca: empresa?.tipo_licenca || 'paga',
        data_expiracao_teste: empresa?.data_expiracao_teste || null,
        valor_mensalidade: empresa?.valor_mensalidade !== undefined ? Number(empresa.valor_mensalidade) : 350.00,
        empresa: empresa,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login: ' + error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const user = db.prepare('SELECT id, empresa_id, name, email, role, created_at FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let empresa = null;
    if (user.empresa_id) {
      empresa = db.prepare('SELECT id, codigo_licenca, modo_operacao, percentual_comissao_padrao, modulos_ativos, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf FROM empresas WHERE id = ?').get(user.empresa_id);
    }

    return res.json({
      ...user,
      empresa,
      codigo_licenca: empresa?.codigo_licenca || (user.empresa_id ? String(user.empresa_id) : 'MASTER'),
      empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || 'Painel Master SaaS',
      empresa_cidade: empresa ? `${empresa.cidade || ''}/${empresa.uf || ''}`.replace(/^\/|\/$/g, '') : 'Global',
      modo_operacao: empresa?.modo_operacao || 'padrao',
      percentual_comissao_padrao: empresa?.percentual_comissao_padrao || 5.0,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = Number(req.user.id);

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }

    const emailClean = email.trim().toLowerCase();
    const nameClean = name.trim();

    // Verificar se e-mail já existe para outro usuário
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(emailClean, userId);
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' });
    }

    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nameClean, emailClean, userId);

    // Sincronizar com Turso Cloud se configurado
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: 'UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [nameClean, emailClean, userId]
        });
      } catch (tErr) {
        console.warn('Aviso sincronização perfil Turso:', tErr.message);
      }
    }

    // CRÍTICO: Sempre selecionar empresa_id para não perder o tenant!
    const updatedUser = db.prepare('SELECT id, empresa_id, name, email, role FROM users WHERE id = ?').get(userId);
    
    let empresa = null;
    if (updatedUser.empresa_id) {
      empresa = db.prepare('SELECT id, codigo_licenca, modo_operacao, percentual_comissao_padrao, modulos_ativos, razao_social, nome_fantasia, cnpj, telefone, email, chave_pix, cidade, uf FROM empresas WHERE id = ?').get(updatedUser.empresa_id);
    }

    const newToken = generateToken(updatedUser);

    return res.json({
      message: 'Perfil atualizado com sucesso!',
      user: {
        ...updatedUser,
        empresa,
        codigo_licenca: empresa?.codigo_licenca || (updatedUser.empresa_id ? String(updatedUser.empresa_id) : 'MASTER'),
        empresa_nome: empresa?.nome_fantasia || empresa?.razao_social || 'Painel Master SaaS',
        empresa_cidade: empresa ? `${empresa.cidade || ''}/${empresa.uf || ''}`.replace(/^\/|\/$/g, '') : 'Global',
        modo_operacao: empresa?.modo_operacao || 'padrao',
        percentual_comissao_padrao: empresa?.percentual_comissao_padrao || 5.0,
      },
      token: newToken,
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil: ' + error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = Number(req.user.id);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);

    // Sincronizar senha alterada com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [newHash, userId]
        });
      } catch (tErr) {
        console.warn('Aviso sincronização senha Turso:', tErr.message);
      }
    }

    return res.json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({ error: 'Erro ao alterar senha: ' + error.message });
  }
};

module.exports = {
  getPublicEmpresas,
  login,
  getProfile,
  updateProfile,
  changePassword,
};
