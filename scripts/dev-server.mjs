#!/usr/bin/env node
/**
 * Servidor de Desenvolvimento Local (Frontend Estático + Proxy API HostGator)
 * - Serve HTML, CSS, JS, SVG, WebP, PNG sem cache (Cache-Control: no-store)
 * - Encaminha chamadas /api/* para o backend PHP/MySQL em produção na HostGator
 *   (preservando Authorization: Bearer e corpo JSON)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const PROD_API_BASE = 'https://projects.vonluqi.com/fundamentos-de-jogos-digitais';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

const SUBMUNDO_ROUTES = {
  '/submundo/tartaro-oculto': '/pages/submundo/tartaro-oculto.html',
  '/submundo/asfodelos-sussurros': '/pages/submundo/asfodelos-sussurros.html',
  '/submundo/hecate-encruzilhada': '/pages/submundo/hecate-encruzilhada.html',
  '/submundo/elisios-julgamento': '/pages/submundo/elisios-julgamento.html',
  '/submundo/persefone-jardim': '/pages/submundo/persefone-jardim.html',
  '/submundo/persefone-estacoes': '/pages/submundo/persefone-jardim.html',
  '/submundo/observatorio-sombras': '/pages/submundo/observatorio-sombras.html',
  '/submundo/observatorio-oculto': '/pages/submundo/observatorio-sombras.html',
  '/submundo/cocito-espelho': '/pages/submundo/cocito-espelho.html',
  '/submundo/estige-obolo': '/pages/submundo/estige-obolo.html',
};

const server = http.createServer(async (req, res) => {
  try {
    const rawUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(rawUrl.pathname);

    // Suporta abrir tanto em / quanto em /fundamentos-de-jogos-digitais/
    if (pathname.startsWith('/fundamentos-de-jogos-digitais')) {
      pathname = pathname.slice('/fundamentos-de-jogos-digitais'.length) || '/';
    }

    // Proxy transparente para /api/* na HostGator
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const targetUrl = `${PROD_API_BASE}${pathname}${rawUrl.search}`;
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const bodyBuffer = Buffer.concat(chunks);

      const forwardHeaders = {
        Accept: req.headers['accept'] || 'application/json',
      };
      if (req.headers['content-type']) {
        forwardHeaders['Content-Type'] = req.headers['content-type'];
      }
      if (req.headers['authorization']) {
        forwardHeaders['Authorization'] = req.headers['authorization'];
      }

      const upstream = await fetch(targetUrl, {
        method: req.method || 'GET',
        headers: forwardHeaders,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? bodyBuffer : undefined,
      });

      const responseBuffer = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(responseBuffer);
      return;
    }

    // Rotas do ARG do Submundo
    const cleanSub = pathname.replace(/\/+$/, '');
    if (SUBMUNDO_ROUTES[cleanSub]) {
      pathname = SUBMUNDO_ROUTES[cleanSub];
    }

    if (pathname === '/') {
      pathname = '/index.html';
    }

    const filePath = path.resolve(ROOT, `.${pathname}`);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n============================================================`);
  console.log(`  DOMÍNIO DO HERÓI — Servidor Local Ativo!`);
  console.log(`  -> Home:      http://localhost:${PORT}/`);
  console.log(`  -> Dashboard: http://localhost:${PORT}/pages/dashboard.html`);
  console.log(`  -> Códigos:   http://localhost:${PORT}/pages/codigos.html`);
  console.log(`  -> Almas:     http://localhost:${PORT}/pages/souls.html`);
  console.log(`============================================================\n`);
});
