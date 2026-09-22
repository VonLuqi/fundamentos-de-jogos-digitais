/**
 * C2 — Aula ativa: lessonView periódico.
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 *   k6 run -e LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json tests/load/c2-aula.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { getConfig } from './lib/config.js';
import { tokenForVu } from './lib/tokens.js';

http.setResponseCallback(http.expectedStatuses(200, 201, 204, 400, 403, 429));

export const options = {
  scenarios: {
    c2_aula: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '5m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:lesson_view}': ['p(95)<1500'],
  },
};

/** @type {string|null} */
let vuToken = null;

export default function c2Aula() {
  const cfg = getConfig();
  if (!vuToken) {
    vuToken = tokenForVu(__VU);
    if (!vuToken) {
      if (!cfg.username || !cfg.password) {
        throw new Error('Defina LOAD_TOKENS_FILE ou LOAD_USERNAME + LOAD_PASSWORD');
      }
      vuToken = login(cfg.baseUrl, cfg.username, cfg.password);
      if (!vuToken) throw new Error('login falhou no C2');
    }
  }

  const res = http.post(
    `${cfg.baseUrl}/api/progress`,
    JSON.stringify({
      token: vuToken,
      action: 'lessonView',
      lessonId: cfg.lessonId,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'lesson_view' },
    },
  );
  check(res, {
    'lessonView 2xx/4xx esperado': (r) =>
      r.status === 200 || r.status === 400 || r.status === 403 || r.status === 429,
  });
  sleep(8);
}
