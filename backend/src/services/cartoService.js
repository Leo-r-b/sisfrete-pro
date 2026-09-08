const db = require('../config/database');

/**
 * cartoService.js
 * Integração oficial com a API da CARTO (clausa.app.carto.com)
 * Suporte a:
 * 1. CARTO Basemaps & Tiles (Voyager, Dark Matter, Positron, High-Res Vector/Raster)
 * 2. CARTO SQL API & Geocoding
 * 3. Execução de CARTO Workflows via API (conforme docs.carto.com/carto-user-manual/workflows/executing-workflows-via-api)
 */

const DEFAULT_API_BASE_URL = 'https://gcp-us-east1.api.carto.com';

/**
 * Recupera as configurações salvas da CARTO no banco
 */
function getCartoConfig(empresaId = 1) {
  try {
    const row = db.prepare('SELECT value FROM system_state WHERE key = ?').get(`carto_config_${empresaId}`);
    if (row && row.value) {
      return JSON.parse(row.value);
    }
  } catch (e) {}

  // Fallback padrão se não configurado
  return {
    organization: 'clausa',
    accessToken: process.env.CARTO_ACCESS_TOKEN || '',
    apiBaseUrl: process.env.CARTO_API_BASE_URL || DEFAULT_API_BASE_URL,
    defaultBasemap: 'dark-matter', // 'voyager', 'dark-matter', 'positron'
    connectionName: 'carto_dw',
    workflowApiUrl: '',
    ativo: false
  };
}

/**
 * Salva as configurações da CARTO no banco
 */
function saveCartoConfig(config, empresaId = 1) {
  const current = getCartoConfig(empresaId);
  const updated = {
    ...current,
    ...config,
    ativo: Boolean(config.accessToken && config.accessToken.trim().length > 10)
  };

  const jsonVal = JSON.stringify(updated);
  db.prepare(`
    INSERT INTO system_state (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(`carto_config_${empresaId}`, jsonVal);

  return updated;
}

/**
 * Testa a conexão com a API da CARTO usando o Access Token
 */
async function testCartoConnection(token, apiBaseUrl = DEFAULT_API_BASE_URL) {
  if (!token || token.trim().length < 10) {
    return { success: false, error: 'Token de acesso da CARTO não informado ou muito curto.' };
  }

  const cleanToken = token.trim();
  const baseUrl = apiBaseUrl.trim().replace(/\/+$/, '');

  try {
    // 1. Tenta validar endpoint de usuário / workspace
    const res = await fetch(`${baseUrl}/v3/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: 'Conexão com a CARTO API validada com sucesso!',
        organization: data.organization || data.account || 'clausa',
        data
      };
    }

    // 2. Se /v3/me retornar 404/403, testa chamada SQL API simples (SELECT 1)
    const sqlRes = await fetch(`${baseUrl}/v3/sql/carto_dw/query?q=SELECT%201%20as%20online`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (sqlRes.ok || sqlRes.status === 200) {
      return {
        success: true,
        message: 'Conexão com CARTO SQL API ativa!',
        organization: 'clausa'
      };
    }

    const errBody = await res.text();
    return {
      success: false,
      status: res.status,
      error: `Falha na autenticação da CARTO (Status ${res.status}): ${errBody || res.statusText}`
    };
  } catch (err) {
    return {
      success: false,
      error: `Erro de rede ao conectar com ${baseUrl}: ${err.message}`
    };
  }
}

/**
 * Retorna as URLs de Tiles da CARTO com suporte a token autenticado ou basemaps públicos de alta velocidade
 */
function getBasemapTileUrl(style = 'dark-matter', accessToken = '') {
  // Estilos suportados:
  // - 'dark-matter' -> cartodb dark matter
  // - 'voyager' -> cartodb voyager
  // - 'positron' -> cartodb positron
  const s = String(style).toLowerCase().trim();

  let subpath = 'rastertiles/voyager';
  if (s.includes('dark')) {
    subpath = 'dark_all';
  } else if (s.includes('positron') || s.includes('claro') || s.includes('light')) {
    subpath = 'light_all';
  } else {
    subpath = 'rastertiles/voyager';
  }

  // Se houver subpath com rastertiles
  if (subpath.startsWith('rastertiles')) {
    return `https://{s}.basemaps.cartocdn.com/${subpath}/{z}/{x}/{y}{r}.png`;
  }

  return `https://{s}.basemaps.cartocdn.com/${subpath}/{z}/{x}/{y}.png`;
}

/**
 * Executa um CARTO Workflow via API (Sync ou Async)
 * Conforme documentação: https://docs.carto.com/carto-user-manual/workflows/executing-workflows-via-api
 */
async function executeCartoWorkflow({
  connection = 'carto_dw',
  callStatement,
  queryParameters = {},
  isAsync = true,
  empresaId = 1
}) {
  const config = getCartoConfig(empresaId);
  const token = config.accessToken;

  if (!token) {
    throw new Error('CARTO API Access Token não configurado no sistema.');
  }

  const baseUrl = (config.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  const targetConn = connection || config.connectionName || 'carto_dw';

  const endpoint = isAsync
    ? `${baseUrl}/v3/sql/${targetConn}/job`
    : `${baseUrl}/v3/sql/${targetConn}/query`;

  const payload = isAsync
    ? {
        query: callStatement,
        queryParameters
      }
    : {
        q: callStatement,
        queryParameters
      };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro na execução do CARTO Workflow (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Consulta o status de um Job Assíncrono do CARTO Workflow
 */
async function getCartoJobStatus(jobId, connection = 'carto_dw', empresaId = 1) {
  const config = getCartoConfig(empresaId);
  const token = config.accessToken;
  const baseUrl = (config.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

  const res = await fetch(`${baseUrl}/v3/sql/${connection}/job/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Erro ao verificar status do Job CARTO (${res.status})`);
  }

  return await res.json();
}

module.exports = {
  getCartoConfig,
  saveCartoConfig,
  testCartoConnection,
  getBasemapTileUrl,
  executeCartoWorkflow,
  getCartoJobStatus
};
