const { syncFromTurso, tursoClient } = require('../config/tursoSync');
const db = require('../config/database');

async function syncFromCloud(force = false) {
  try {
    await syncFromTurso(db);
  } catch (err) {
    console.warn('Aviso syncFromCloud:', err.message);
  }
}

module.exports = {
  syncFromCloud,
  getTursoClient: () => tursoClient,
};
