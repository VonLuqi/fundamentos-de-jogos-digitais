/**
 * C5 — ClassInd poll (degradado / getState periódico).
 * docs/otimizacoes/04-tasks-k6-carga.md · Fase C / C2
 *
 *   k6 run -e BASE_URL=… -e LOAD_USERNAME=… -e LOAD_PASSWORD=… tests/load/c5-classind-poll.js
 *
 * Opcional: LOAD_CLASSIND_ROOM_ID=… ou LOAD_CLASSIND_CODE=ABCD
 * Sem sala: ainda bate /api/classind (espera 4xx) — mede degradação do path, não happy-path.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { getConfig } from './lib/config.js';

export const options = {
  scenarios: {
    c5_classind: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '3m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:classind_get_state}': ['p(95)<1500'],
  },
};

export function setup() {
  const cfg = getConfig();
  if (!cfg.username || !cfg.password) {
    throw new Error('Defina LOAD_USERNAME e LOAD_PASSWORD');
  }
  const token = login(cfg.baseUrl, cfg.username, cfg.password);
  if (!token) throw new Error('login falhou no setup C5');
  return {
    token,
    baseUrl: cfg.baseUrl,
    roomId: cfg.classindRoomId,
    code: cfg.classindCode,
  };
}

export default function c5ClassindPoll(data) {
  const payload = {
    token: data.token,
    action: 'getState',
  };
  if (data.roomId) payload.roomId = data.roomId;
  if (data.code) payload.code = data.code;

  const res = http.post(`${data.baseUrl}/api/classind`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'classind_get_state' },
  });
  check(res, {
    'classind getState não 5xx': (r) => r.status < 500,
    'classind getState 200/4xx': (r) =>
      r.status === 200 || r.status === 400 || r.status === 403 || r.status === 404 || r.status === 429,
  });
  sleep(2);
}
