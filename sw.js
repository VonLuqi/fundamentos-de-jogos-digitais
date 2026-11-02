/* Fundamentos — service worker mínimo (instalabilidade PWA). Sem cache offline. */
'use strict';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const path = new URL(event.request.url).pathname;
  // Um 404 antigo de /uploads/ ficava no cache do navegador e a foto aprovada
  // continuava a cair no personagem do catálogo.
  if (path.startsWith('/uploads/') || path.endsWith('/assets/achievements/catalog.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  // Reinício da T2: o aviso, o tranco e a época vivem nestes módulos; revalida a cada carga
  // (o Apache/Cloudflare servem .js por 7 dias e as páginas importam estes arquivos sem ?v= novo).
  if (
    path.endsWith('/js/app-shell.js')
    || path.endsWith('/js/api.js')
    || path.endsWith('/hades-despertar/config/season-closed.js')
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }));
    return;
  }
  event.respondWith(fetch(event.request));
});
