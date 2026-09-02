const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config();

// Inicializar banco de dados SQLite
require('./config/database');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rotas da API
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'SisFrete Pro API',
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'SisFrete Pro API',
    timestamp: new Date().toISOString(),
  });
});

// Servir Frontend React compilado (Produção unificada no Render / VPS)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Tratamento de Erros Global
app.use((err, req, res, next) => {
  console.error('Erro na requisição:', err);
  res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 SisFrete Pro Backend rodando na porta ${PORT}`);
    console.log(`📡 URL da API: http://localhost:${PORT}/api`);
    console.log(`===========================================`);
  });
}

module.exports = app;
