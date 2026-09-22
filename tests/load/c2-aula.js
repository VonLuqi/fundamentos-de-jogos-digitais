/**
 * C2 — Aula ativa: lessonView periódico (esqueleto).
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 *   k6 run -e BASE_URL=… -e LOAD_USERNAME=… -e LOAD_PASSWORD=… tests/load/c2-aula.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { getConfig } from './lib/config.js';

export const options = {
  scenarios: {
    c2_aula: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '5m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:lesson_view}': ['p(95)<1500'],
  },
};

export function setup() {
  const cfg = getConfig();
  if (!cfg.username || !cfg.password) {
    throw new Error('Defina LOAD_USERNAME e LOAD_PASSWORD');
  }
  const token = login(cfg.baseUrl, cfg.username, cfg.password);
  if (!token) throw new Error('login falhou no setup C2');
  return { token, baseUrl: cfg.baseUrl, lessonId: cfg.lessonId };
}

export default function c2Aula(data) {
  const res = http.post(
    `${data.baseUrl}/api/progress`,
    JSON.stringify({
      token: data.token,
      action: 'lessonView',
      lessonId: data.lessonId,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'lesson_view' },
    },
  );
  check(res, {
    'lessonView 2xx/4xx esperado': (r) => r.status === 200 || r.status === 400 || r.status === 403,
  });
  sleep(8);
}
