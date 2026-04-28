'use strict';

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// ─── Rate limiter simples (in-memory) ────────────────────────────────────────
// Limita /login a 10 tentativas por minuto por IP — adequado para lab local.
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const window = 60_000; // 1 minuto
  const max = 10;
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + window };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + window;
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em breve.' });
  }
  next();
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo-do-lab-nao-use-em-producao';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';

// ─── Middleware base ───────────────────────────────────────────────────────────
app.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token ausente', hint: 'Envie o header: Authorization: Bearer <token>' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Token expirado' : 'Token inválido',
      detail: err.message,
      hint: expired ? 'Faça login novamente em POST /login' : 'Verifique o token enviado',
    });
  }
}

// ─── Rotas ────────────────────────────────────────────────────────────────────

/**
 * GET /
 * Health-check com lista de endpoints disponíveis.
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'owzap-learn API — laboratório de diagnóstico',
    endpoints: [
      'POST /login',
      'GET  /profile          (requer JWT)',
      'GET  /cors-test        (CORS aberto ou restrito)',
      'GET  /cors-blocked     (CORS bloqueado)',
      'GET  /slow             (resposta lenta — timeout)',
      'GET  /bad-json         (JSON malformado)',
      'GET  /wrong-content-type',
      'GET  /missing-headers  (sem headers de segurança)',
      'GET  /cache-test       (headers de cache)',
      'GET  /set-cookie       (Cookie com flags)',
      'GET  /status/:code     (retorna qualquer HTTP status)',
      'GET  /redirect         (301 redirect)',
    ],
  });
});

/**
 * POST /login
 * Retorna um JWT. Use { "username": "admin", "password": "admin" }.
 * Propósito: observar autenticação, token, expiração.
 */
app.post('/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username e password são obrigatórios' });
  }

  // Credenciais fixas apenas para laboratório local
  if (username !== 'admin' || password !== 'admin') {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ sub: username, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const decoded = jwt.decode(token);

  res.json({
    token,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    hint: 'Use o token no header: Authorization: Bearer <token>',
  });
});

/**
 * GET /profile
 * Rota protegida por JWT.
 * Propósito: observar headers de autorização, token expirado, 401.
 */
app.get('/profile', requireAuth, (req, res) => {
  res.json({
    message: 'Perfil do usuário autenticado',
    user: req.user,
    hint: 'Se chegar aqui o token é válido. Tente com token expirado ou alterado.',
  });
});

/**
 * GET /cors-test
 * Responde com CORS aberto (Access-Control-Allow-Origin: *).
 * Propósito: observar headers CORS na resposta.
 * Nota de lab: origin: '*' é intencional aqui para demonstrar CORS aberto.
 * Em produção, prefira especificar origens confiáveis.
 */
// nosemgrep: javascript.lang.security.audit.cors.cors-with-wildcard.cors-with-wildcard
app.get('/cors-test', cors({ origin: '*', methods: ['GET'] }), (req, res) => {
  res.json({
    message: 'CORS aberto (origin: *)',
    receivedOrigin: req.headers.origin || '(não enviado)',
    corsHeaders: {
      'Access-Control-Allow-Origin': '*',
    },
    hint: 'Observe os headers da resposta no ZAP. Compare com /cors-blocked.',
  });
});

/**
 * GET /cors-blocked
 * CORS restrito a origem específica. Qualquer outra origem recebe 403 na preflight.
 * Propósito: ver erro de CORS no browser/ZAP.
 */
app.get(
  '/cors-blocked',
  cors({
    origin: 'https://minha-origem-confiavel.example.com',
    optionsSuccessStatus: 200,
  }),
  (req, res) => {
    res.json({
      message: 'CORS restrito',
      hint: 'Envie com Origin diferente e observe o erro no ZAP.',
    });
  }
);

// Preflight para /cors-blocked
app.options('/cors-blocked', cors({ origin: 'https://minha-origem-confiavel.example.com' }));

/**
 * GET /slow
 * Responde após delay configurável (padrão 5 s).
 * Propósito: observar timeouts, retries no cliente.
 */
app.get('/slow', (req, res) => {
  const requested = parseInt(req.query.ms, 10);
  // Limita o delay a no mínimo 0 e no máximo 30 s para evitar esgotamento de recursos.
  const delay = Number.isFinite(requested) ? Math.max(0, Math.min(requested, 30_000)) : 5_000;
  setTimeout(() => {
    res.json({
      message: `Resposta após ${delay} ms`,
      hint: 'Configure timeout no cliente e veja o comportamento no ZAP.',
    });
  }, delay);
});

/**
 * GET /bad-json
 * Envia corpo que parece JSON mas não é JSON válido.
 * Propósito: observar erros de parsing no cliente.
 */
app.get('/bad-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end('{ "chave": "valor", "quebrado": true, }'); // trailing comma — JSON inválido
});

/**
 * GET /wrong-content-type
 * Envia JSON com Content-Type: text/plain.
 * Propósito: ver como cliente/proxy reage a content-type incorreto.
 */
app.get('/wrong-content-type', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(JSON.stringify({ message: 'Sou JSON mas meu Content-Type diz text/plain', hint: 'Observe o Content-Type no ZAP.' }));
});

/**
 * GET /missing-headers
 * Resposta sem headers de segurança comuns.
 * Propósito: observar ausência de X-Content-Type-Options, X-Frame-Options, etc.
 */
app.get('/missing-headers', (req, res) => {
  res.json({
    message: 'Resposta sem headers de segurança',
    hint: 'Compare com /cache-test e veja os headers no ZAP. Faltam: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security.',
  });
});

/**
 * GET /cache-test
 * Demonstra headers de cache.
 * Propósito: entender Cache-Control, ETag, Last-Modified.
 */
app.get('/cache-test', (req, res) => {
  const etag = '"abc123-lab-etag"';
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  res
    .set({
      'Cache-Control': 'public, max-age=60',
      ETag: etag,
      'Last-Modified': new Date('2026-01-01').toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    })
    .json({
      message: 'Resposta cacheável',
      hint: 'Faça a mesma requisição duas vezes. Na segunda, envie o ETag no header If-None-Match e veja o 304.',
    });
});

/**
 * GET /set-cookie
 * Define cookies com flags variadas para análise.
 * Propósito: observar SameSite, Secure, HttpOnly no ZAP.
 */
app.get('/set-cookie', (req, res) => {
  res.setHeader('Set-Cookie', [
    'sessao_segura=abc123; HttpOnly; Secure; SameSite=Strict; Path=/',
    'preferencia=dark; SameSite=Lax; Path=/',
    'rastreamento=xyz; Path=/',
  ]);
  res.json({
    message: 'Cookies definidos com flags diferentes',
    hint: 'Observe os Set-Cookie no ZAP: um tem HttpOnly+Secure, outro tem SameSite=Lax, outro não tem flags.',
  });
});

/**
 * GET /status/:code
 * Retorna o HTTP status code solicitado.
 * Propósito: testar como cliente reage a 2xx, 3xx, 4xx, 5xx.
 */
app.get('/status/:code', (req, res) => {
  const code = parseInt(req.params.code, 10);
  if (isNaN(code) || code < 100 || code > 599) {
    return res.status(400).json({ error: 'Status code inválido (100-599)' });
  }
  res.status(code).json({
    message: `Respondendo com status ${code}`,
    hint: `Observe como o ZAP e o cliente tratam o status ${code}.`,
  });
});

/**
 * GET /redirect
 * Retorna um 301 redirect para /.
 * Propósito: observar redirecionamentos no ZAP.
 */
app.get('/redirect', (req, res) => {
  res.redirect(301, '/');
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`owzap-learn API rodando em http://localhost:${PORT}`);
  console.log(`JWT_EXPIRY: ${JWT_EXPIRY}`);
});
