const bcrypt = require('bcryptjs');
const db = require('../config/database');

const listUsers = async (req, res) => {
  try {
    const isSuper = req.user.role === 'super_admin';
    let users;

    if (isSuper) {
      // Super Admin visualiza todos os usuários de todas as licenças
      users = db.prepare(`
        SELECT u.id, u.empresa_id, u.name, u.email, u.role, u.created_at, u.updated_at,
               COALESCE(e.nome_fantasia, e.razao_social, 'Empresa Matriz') as empresa_nome,
               COALESCE(e.codigo_licenca, CAST(e.id AS TEXT)) as codigo_licenca,
               e.cidade as empresa_cidade, e.uf as empresa_uf
        FROM users u
        LEFT JOIN empresas e ON u.empresa_id = e.id
        ORDER BY u.name ASC
      `).all();
    } else {
      // Admin normal visualiza APENAS os colaboradores da sua própria licença (NUNCA super_admin)
      users = db.prepare(`
        SELECT u.id, u.empresa_id, u.name, u.email, u.role, u.created_at, u.updated_at,
               COALESCE(e.nome_fantasia, e.razao_social, 'Empresa Matriz') as empresa_nome,
               COALESCE(e.codigo_licenca, CAST(e.id AS TEXT)) as codigo_licenca,
               e.cidade as empresa_cidade, e.uf as empresa_uf
        FROM users u
        LEFT JOIN empresas e ON u.empresa_id = e.id
        WHERE u.empresa_id = ? AND u.role != 'super_admin'
        ORDER BY u.name ASC
      `).all(req.empresaId);
    }

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'operador', empresa_id } = req.body;
    const isSuper = req.user.role === 'super_admin';
    
    // Se não for Super Admin, trava a criação obrigatoriamente na empresa do usuário logado
    const targetEmpresaId = isSuper ? (empresa_id ? Number(empresa_id) : (req.empresaId || 1)) : req.user.empresa_id;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    // Apenas Super Admin pode criar outro super_admin
    const targetRole = (!isSuper && role === 'super_admin') ? 'operador' : role;

    // Verificar limite de logins da licença
    const empresa = db.prepare('SELECT id, codigo_licenca, limite_logins FROM empresas WHERE id = ?').get(targetEmpresaId);
    if (empresa) {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE empresa_id = ? AND role != ?').get(targetEmpresaId, 'super_admin');
      const limite = empresa.limite_logins || 5;
      if (userCount.count >= limite) {
        return res.status(400).json({ 
          error: `Limite de logins para a Licença #${empresa.codigo_licenca || empresa.id} atingido (máximo de ${limite} logins cadastrados). Expanda a licença para adicionar mais colaboradores.` 
        });
      }
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Já existe um usuário com este e-mail.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const finalEmpresaId = targetRole === 'super_admin' ? null : targetEmpresaId;
    const finalEmail = email.trim().toLowerCase();
    const finalName = name.trim();

    const result = db.prepare(`
      INSERT INTO users (empresa_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(finalEmpresaId, finalName, finalEmail, passwordHash, targetRole);

    const newUserId = Number(result.lastInsertRowid);

    // Sincronizar com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({
          sql: 'INSERT INTO users (id, empresa_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
          args: [newUserId, finalEmpresaId, finalName, finalEmail, passwordHash, targetRole]
        });
      } catch (tErr) {
        console.warn('Aviso sincronização createUser Turso:', tErr.message);
      }
    }

    const created = db.prepare('SELECT id, empresa_id, name, email, role, created_at FROM users WHERE id = ?').get(newUserId);

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      user: created,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar usuário: ' + error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, empresa_id } = req.body;
    const isSuper = req.user.role === 'super_admin';

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Se o usuário a ser editado for super_admin e quem estiver logado NÃO for super_admin: BLOQUEIO TOTAL
    if (existing.role === 'super_admin' && !isSuper) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar credenciais de um Super Administrador.' });
    }

    // Se não for super_admin, o usuário a ser editado DEVE pertencer à mesma empresa
    if (!isSuper && existing.empresa_id !== req.user.empresa_id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar usuários de outra licença.' });
    }

    // Verificar se email já existe em outro usuário
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailCheck = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), id);
      if (emailCheck) {
        return res.status(400).json({ error: 'Este e-mail já pertence a outro usuário.' });
      }
    }

    let passwordHash = existing.password_hash;
    if (password && password.trim().length >= 6) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    const targetEmpresaId = isSuper ? (empresa_id !== undefined ? (role === 'super_admin' ? null : Number(empresa_id)) : (existing.role === 'super_admin' ? null : existing.empresa_id)) : existing.empresa_id;
    const targetRole = (!isSuper && (role === 'super_admin' || existing.role === 'super_admin')) ? existing.role : (role || existing.role);
    const finalName = name ? name.trim() : existing.name;
    const finalEmail = email ? email.trim().toLowerCase() : existing.email;

    db.prepare(`
      UPDATE users 
      SET empresa_id = ?, name = ?, email = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      targetEmpresaId,
      finalName,
      finalEmail,
      targetRole,
      passwordHash,
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
          sql: 'UPDATE users SET empresa_id = ?, name = ?, email = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [targetEmpresaId, finalName, finalEmail, targetRole, passwordHash, id]
        });
      } catch (tErr) {
        console.warn('Aviso sincronização updateUser Turso:', tErr.message);
      }
    }

    const updated = db.prepare('SELECT id, empresa_id, name, email, role, updated_at FROM users WHERE id = ?').get(id);

    return res.json({
      message: 'Usuário atualizado com sucesso!',
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário: ' + error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const isSuper = req.user.role === 'super_admin';

    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir o seu próprio usuário logado.' });
    }

    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Se o usuário a ser excluído for super_admin e quem estiver logado NÃO for super_admin: BLOQUEIO TOTAL
    if (target.role === 'super_admin' && !isSuper) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir um Super Administrador.' });
    }

    // Se não for super_admin, o usuário a ser excluído DEVE pertencer à mesma empresa
    if (!isSuper && target.empresa_id !== req.user.empresa_id) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir usuários de outra licença.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    // Sincronizar com Turso Cloud
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = require('@libsql/client');
        const turso = createClient({
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN
        });
        await turso.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
      } catch (tErr) {
        console.warn('Aviso sincronização deleteUser Turso:', tErr.message);
      }
    }

    return res.json({ message: 'Usuário excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir usuário: ' + error.message });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
