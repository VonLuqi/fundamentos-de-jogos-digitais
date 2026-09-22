/**
 * C5 — ClassInd poll (degradado / getState periódico).
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 *   k6 run -e LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json tests/load/c5-classind-poll.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { getConfig } from './lib/config.js';
import { tokenForVu } from './lib/tokens.js';

http.setResponseCallback(http.expectedStatuses(200, 201, 204, 400, 403, 404, 429));

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

/** @type {string|null} */
let vuToken = null;

export default function c5ClassindPoll() {
  const cfg = getConfig();
  if (!vuToken) {
    vuToken = tokenForVu(__VU);
    if (!vuToken) {
      if (!cfg.username || !cfg.password) {
        throw new Error('Defina LOAD_TOKENS_FILE ou LOAD_USERNAME + LOAD_PASSWORD');
      }
      vuToken = login(cfg.baseUrl, cfg.username, cfg.password);
      if (!vuToken) throw new Error('login falhou no C5');
    }
  }

  const payload = {
    token: vuToken,
    action: 'getState',
  };
  if (cfg.classindRoomId) payload.roomId = cfg.classindRoomId;
  if (cfg.classindCode) payload.code = cfg.classindCode;

  const res = http.post(`${cfg.baseUrl}/api/classind`, JSON.stringify(payload), {
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
