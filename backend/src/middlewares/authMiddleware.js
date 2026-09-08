const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sisfrete_pro_super_secure_key_2026_!#';

function generateToken(user) {
  const empresaId = user.role === 'super_admin' ? null : (user.empresa_id !== undefined && user.empresa_id !== null ? Number(user.empresa_id) : 1);
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      empresa_id: empresaId,
      pode_alternar_empresa: (user.pode_alternar_empresa || user.role === 'super_admin') ? 1 : 0,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Tenant Context:
    // 1. Super Admin (Ghost Master): pode chavear empresa via header x-empresa-id
    // 2. Usuário com permissão pode_alternar_empresa: pode chavear empresa via header x-empresa-id
    // 3. Demais colaboradores: SEMPRE restritos ao req.user.empresa_id
    const headerEmpresaId = req.headers['x-empresa-id'];
    let podeAlternar = req.user.role === 'super_admin' || Boolean(req.user.pode_alternar_empresa);

    // Fallback: se o token foi emitido antes da concessão da permissão
    if (!podeAlternar && req.user.id && headerEmpresaId) {
      try {
        const db = require('../config/database');
        const u = db.prepare('SELECT pode_alternar_empresa FROM users WHERE id = ?').get(req.user.id);
        if (u && u.pode_alternar_empresa) {
          podeAlternar = true;
          req.user.pode_alternar_empresa = 1;
        }
      } catch (e) {}
    }

    if (req.user.role === 'super_admin') {
      if (headerEmpresaId && !isNaN(parseInt(headerEmpresaId, 10))) {
        req.empresaId = parseInt(headerEmpresaId, 10);
      } else if (req.user.empresa_id) {
        req.empresaId = parseInt(req.user.empresa_id, 10);
      } else {
        // Super Admin opera em modo global desvinculado
        req.empresaId = null;
      }
    } else if (podeAlternar) {
      // Usuário comum com permissão para alternar:
      // Pode chavear SOMENTE para as empresas expressamente autorizadas pelo Master
      try {
        const db = require('../config/database');
        const u = db.prepare('SELECT pode_alternar_empresa, empresas_permitidas, empresa_id FROM users WHERE id = ?').get(req.user.id);
        
        let allowedIds = [];
        if (u?.empresa_id) allowedIds.push(parseInt(u.empresa_id, 10));
        if (u?.empresas_permitidas) {
          try {
            const parsed = JSON.parse(u.empresas_permitidas);
            if (Array.isArray(parsed)) {
              parsed.forEach(id => {
                const num = parseInt(id, 10);
                if (!isNaN(num) && !allowedIds.includes(num)) allowedIds.push(num);
              });
            }
          } catch (e) {}
        }
        if (allowedIds.length === 0) {
          allowedIds = [u?.empresa_id ? parseInt(u.empresa_id, 10) : (req.user.empresa_id ? parseInt(req.user.empresa_id, 10) : 1)];
        }

        if (headerEmpresaId && !isNaN(parseInt(headerEmpresaId, 10))) {
          const targetId = parseInt(headerEmpresaId, 10);
          if (allowedIds.includes(targetId)) {
            req.empresaId = targetId;
          } else {
            return res.status(403).json({ error: 'Acesso negado. Você não tem autorização para operar nesta empresa/licença.' });
          }
        } else {
          req.empresaId = u?.empresa_id ? parseInt(u.empresa_id, 10) : (req.user.empresa_id ? parseInt(req.user.empresa_id, 10) : 1);
        }
      } catch (err) {
        req.empresaId = req.user.empresa_id ? parseInt(req.user.empresa_id, 10) : 1;
      }
    } else {
      req.empresaId = req.user.empresa_id ? parseInt(req.user.empresa_id, 10) : 1;
    }

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para realizar esta operação.' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authMiddleware,
  requireRole,
};
