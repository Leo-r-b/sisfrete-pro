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
    // 2. Administrador normal e operadores: SEMPRE restritos ao req.user.empresa_id
    const headerEmpresaId = req.headers['x-empresa-id'];
    if (req.user.role === 'super_admin') {
      if (headerEmpresaId && !isNaN(parseInt(headerEmpresaId, 10))) {
        req.empresaId = parseInt(headerEmpresaId, 10);
      } else if (req.user.empresa_id) {
        req.empresaId = parseInt(req.user.empresa_id, 10);
      } else {
        // Fallback: super_admin sem empresa selecionada usa empresa 1
        req.empresaId = 1;
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
