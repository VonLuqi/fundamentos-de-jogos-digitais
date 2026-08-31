import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy(new Error('Body muito grande'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/api/auth') {
      const body = req.method === 'POST' ? await parseBody(req) : {};
      console.log(`[${new Date().toISOString()}] ${req.method} /api/auth`, { body, query: Object.fromEntries(url.searchParams.entries()) });
      const request = {
        method: req.method,
        headers: req.headers,
        query: Object.fromEntries(url.searchParams.entries()),
        body,
      };
      const response = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          console.log(`[${new Date().toISOString()}] response status: ${this.statusCode}`, payload);
          sendJson(res, this.statusCode || 200, payload);
          return payload;
        },
      };
      await handler(request, response);
      if (!res.writableEnded) {
        const payload = response.body || { ok: true };
        console.log(`[${new Date().toISOString()}] final response status: ${response.statusCode}`, payload);
        sendJson(res, response.statusCode || 200, payload);
      }
      return;
    }

    let filePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(filePath).replace(/^\/+/, '');
    const fullPath = path.join(__dirname, safePath);
    let finalPath = fullPath;
    try {
      await fs.access(finalPath);
    } catch {
      const fallback = path.join(__dirname, 'index.html');
      try { await fs.access(fallback); finalPath = fallback; } catch {}
    }

    const file = await fs.readFile(finalPath);
    const ext = path.extname(finalPath).toLowerCase();
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(file);
  } catch (error) {
    console.error('server error:', error);
    sendJson(res, 500, { ok: false, error: 'Erro interno do servidor local.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Local app running at http://localhost:${PORT}`);
});
