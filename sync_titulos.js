const db = require('./backend/src/config/database');

console.log('--- Antes da correção ---');
console.log(db.prepare('SELECT id, descricao, valor, valor_pago, status FROM financeiro_titulos').all());

// 1. Atualizar títulos parciais
const resParcial = db.prepare("UPDATE financeiro_titulos SET status = 'parcial' WHERE valor_pago > 0 AND valor_pago < (valor - 0.01)").run();
console.log('Títulos atualizados para parcial:', resParcial.changes);

// 2. Atualizar títulos quitados
const resPago = db.prepare("UPDATE financeiro_titulos SET status = 'pago' WHERE valor_pago >= (valor - 0.01) AND valor > 0").run();
console.log('Títulos atualizados para pago:', resPago.changes);

console.log('--- Depois da correção ---');
console.log(db.prepare('SELECT id, descricao, valor, valor_pago, status FROM financeiro_titulos').all());
