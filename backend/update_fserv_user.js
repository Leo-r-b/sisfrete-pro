const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

const newHash = bcrypt.hashSync('admin123', 10);

// Verifica usuário existente da empresa 11
let user = db.prepare('SELECT * FROM users WHERE empresa_id = 11').get();

if (user) {
  db.prepare(`
    UPDATE users 
    SET email = 'fserv@fserv.com',
        name = 'FSERV Administrador',
        password_hash = ?
    WHERE empresa_id = 11
  `).run(newHash);
  console.log('✅ Usuário da FSERV (empresa_id: 11) atualizado com sucesso!');
} else {
  // Se não existir, insere
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role, empresa_id)
    VALUES ('FSERV Administrador', 'fserv@fserv.com', ?, 'admin', 11)
  `).run(newHash);
  console.log('✅ Novo usuário da FSERV (empresa_id: 11) inserido com sucesso!');
}

const updatedUser = db.prepare('SELECT id, empresa_id, name, email, role FROM users WHERE empresa_id = 11').get();
console.log('📋 Dados do Usuário FSERV no Banco:', updatedUser);

const isMatch = bcrypt.compareSync('admin123', updatedUser ? newHash : '');
console.log('🔐 Validação da senha admin123:', isMatch);
