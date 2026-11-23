import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHttpHandler } from '../../../packages/transport-http/http-handler.js';
import brand from '../../../packages/brand/metadata.json' with { type: 'json' };

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'public');
const assets = new Map([
  ['/client.js', ['client.js', 'text/javascript; charset=utf-8']],
  ['/client.css', ['client.css', 'text/css; charset=utf-8']],
  ['/icon.svg', ['icon.svg', 'image/svg+xml']],
]);
const INDEX = Buffer.from(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${brand.name.zh}（${brand.name.en}）文档审阅</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/client.css">
</head>
<body><div id="root"></div><script src="/client.js" defer></script></body>
</html>`);

const send = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  });
  res.end(body);
};

function route(req, res, apiHandler, authority, healthToken) {
  if (req.headers.host !== authority) return send(res, 403, 'Forbidden');
  if (req.method === 'GET' && req.url === '/health') {
    if (!healthToken || req.headers['x-workbuddy-review-token'] !== healthToken) return send(res, 403, 'Forbidden');
    return send(res, 200, JSON.stringify({ service: 'cospace-workbuddy-review' }), 'application/json; charset=utf-8');
  }
  const origin = req.headers.origin;
  if (origin && origin !== `http://${authority}`) return send(res, 403, 'Forbidden');
  const url = new URL(req.url || '/', `http://${authority}`);
  if (url.pathname === '/api') {
    if (req.method !== 'POST' || origin !== `http://${authority}`) return send(res, 403, 'Forbidden');
    return apiHandler(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.startsWith('/document/')) {
    if (url.pathname.startsWith('/document/')) {
      try {
        const id = decodeURIComponent(url.pathname.slice('/document/'.length));
        if (!id || id.includes('/') || id.length > 200) return send(res, 404, 'Not Found');
      } catch { return send(res, 404, 'Not Found'); }
    }
    return send(res, 200, req.method === 'HEAD' ? '' : INDEX, 'text/html; charset=utf-8');
  }
  const asset = assets.get(url.pathname);
  if (!asset) return send(res, 404, 'Not Found');
  try {
    const body = readFileSync(path.join(publicDir, asset[0]));
    return send(res, 200, req.method === 'HEAD' ? '' : body, asset[1]);
  } catch { return send(res, 503, 'Connector assets are not built'); }
}

export function createReviewHttpServer(api, { healthToken, onRequest } = {}) {
  const apiHandler = createHttpHandler(api);
  let server;
  let authority;
  return {
    async listen(port = 0) {
      server = createServer((req, res) => {
        onRequest?.();
        route(req, res, apiHandler, authority, healthToken);
      });
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.off('error', reject);
          const address = server.address();
          if (!address || typeof address === 'string') return reject(new Error('Loopback server did not bind a TCP port'));
          authority = `127.0.0.1:${address.port}`;
          resolve();
        });
      });
      return `http://${authority}`;
    },
    async close() {
      if (!server?.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
