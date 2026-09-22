/**
 * C4 — Ranking: leaderboardGet periódico (pós-B5 RPC).
 * docs/otimizacoes/04-tasks-k6-carga.md · Fase C / C2
 *
 *   k6 run -e BASE_URL=… -e LOAD_USERNAME=… -e LOAD_PASSWORD=… tests/load/c4-ranking.js
 *
 * Opcional: LOAD_LB_SCOPE=turma|global  LOAD_LB_SORT=xp|achievements|juizoBest  LOAD_LB_LIMIT=25
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { getConfig } from './lib/config.js';

export const options = {
  scenarios: {
    c4_ranking: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '5m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:leaderboard_get}': ['p(95)<800'],
  },
};

export function setup() {
  const cfg = getConfig();
  if (!cfg.username || !cfg.password) {
    throw new Error('Defina LOAD_USERNAME e LOAD_PASSWORD');
  }
  const token = login(cfg.baseUrl, cfg.username, cfg.password);
  if (!token) throw new Error('login falhou no setup C4');
  return {
    token,
    baseUrl: cfg.baseUrl,
    scope: cfg.lbScope,
    sort: cfg.lbSort,
    limit: cfg.lbLimit,
  };
}

export default function c4Ranking(data) {
  const body = {
    token: data.token,
    action: 'leaderboardGet',
    scope: data.scope,
    sort: data.sort,
    limit: data.limit,
  };
  const res = http.post(`${data.baseUrl}/api/progress`, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'leaderboard_get' },
  });
  check(res, {
    'leaderboardGet não 5xx': (r) => r.status < 500,
    'leaderboardGet 200/4xx': (r) =>
      r.status === 200 || r.status === 400 || r.status === 403 || r.status === 429,
  });
  sleep(3);
}
