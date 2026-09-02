import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Cache em memória e deduplicação de requisições concorrentes
const inFlightRequests = new Map();
const responseCache = new Map();
const CACHE_TTL_MS = 3000; // 3 segundos de cache para navegação ultra-fluida

// Interceptor para injetar JWT Token e Tenant Empresa ID em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sisfrete_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeEmpresaId = localStorage.getItem('sisfrete_active_empresa_id');
  if (activeEmpresaId) {
    config.headers['x-empresa-id'] = activeEmpresaId;
  }

  // Limpa o cache imediatamente se for uma ação de escrita (POST, PUT, DELETE, PATCH)
  if (config.method && config.method.toUpperCase() !== 'GET') {
    responseCache.clear();
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para tratar erro 401 (Sessão expirada)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('sisfrete_token');
      localStorage.removeItem('sisfrete_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Wrapper de GET com cache e deduplicação de requisições simultâneas
const originalGet = api.get.bind(api);
api.get = function (url, config = {}) {
  if (config.noCache) {
    return originalGet(url, config);
  }

  const cacheKey = `${url}_${JSON.stringify(config.params || {})}_${localStorage.getItem('sisfrete_active_empresa_id') || ''}`;
  const now = Date.now();

  // 1. Se tem cache fresco (< 3s), retorna instantaneamente
  const cached = responseCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return Promise.resolve(cached.response);
  }

  // 2. Se já tem uma requisição idêntica em andamento, reaproveita a mesma promessa
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Executa a requisição
  const requestPromise = originalGet(url, config)
    .then((res) => {
      responseCache.set(cacheKey, { timestamp: Date.now(), response: res });
      inFlightRequests.delete(cacheKey);
      return res;
    })
    .catch((err) => {
      inFlightRequests.delete(cacheKey);
      return Promise.reject(err);
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export default api;
