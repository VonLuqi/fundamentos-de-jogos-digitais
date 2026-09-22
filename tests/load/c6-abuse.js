/**
 * C6 — Abuso: spray login + stateSync acima do orçamento legítimo.
 * docs/otimizacoes/04-tasks-k6-carga.md · Fase C / C2
 *
 *   k6 run -e BASE_URL=… tests/load/c6-abuse.js
 *
 * Objetivo: observar 429 (Edge C1 e/ou rate limit A2) sem cascata 5xx.
 * Thresholds tratam 429 como sucesso do cenário de abuso (http_req_failed só 5xx).
 *
 * Opcional: LOAD_USERNAME/LOAD_PASSWORD — se presentes, sync autenticado também é sprayado.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { login } from './lib/auth.js';
import { getConfig } from './lib/config.js';

const status429 = new Counter('abuse_status_429');
const status5xx = new Counter('abuse_status_5xx');

export const options = {
  scenarios: {
    c6_abuse: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: String(__ENV.DURATION || '1m'),
    },
  },
  thresholds: {
    // Só falha de infra conta: 4xx (incl. 429) não entram em http_req_failed por padrão no k6
    // quando status < 400... na verdade k6 marca failed para status >= 400 por default.
    // Usamos checks + counters; thresholds frouxos em failed + exigir 429s.
    http_req_failed: ['rate<1'],
    abuse_status_5xx: ['count<5'],
    abuse_status_429: ['count>10'],
  },
};

export function setup() {
  const cfg = getConfig();
  let token = null;
  if (cfg.username && cfg.password) {
    token = login(cfg.baseUrl, cfg.username, cfg.password);
  }
  return { baseUrl: cfg.baseUrl, token };
}

function trackStatus(res) {
  if (res.status === 429) status429.add(1);
  if (res.status >= 500) status5xx.add(1);
}

export default function c6Abuse(data) {
  // Spray de login (teto Edge auth 30/min/IP — vários VUs devem 429)
  const loginRes = http.post(
    `${data.baseUrl}/api/auth`,
    JSON.stringify({
      action: 'login',
      username: `abuse_${__VU}_${Date.now()}`,
      password: 'invalid-password-abuse',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'abuse_login' },
    },
  );
  trackStatus(loginRes);
  check(loginRes, {
    'abuse login não 5xx': (r) => r.status < 500,
    'abuse login 4xx/429 esperado': (r) =>
      r.status === 400 || r.status === 401 || r.status === 403 || r.status === 429,
  });

  // Spray sync (Edge despertar 60/min + A2 userId se autenticado)
  const syncBody = {
    token: data.token || 'invalid-token',
    action: 'stateSync',
    clientState: {
      souls: '0',
      obols: '0',
      mnemosyne: '0',
      lifetimeSouls: '0',
      runSouls: '0',
      prestigeCount: 0,
      generators: {},
      upgrades: {},
      talents: {},
      eduLogsSeen: [],
      milestones: {},
      verdicts: {},
      lastSyncAt: new Date().toISOString(),
    },
  };
  const syncRes = http.post(`${data.baseUrl}/api/despertar`, JSON.stringify(syncBody), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'abuse_sync' },
  });
  trackStatus(syncRes);
  check(syncRes, {
    'abuse sync não 5xx': (r) => r.status < 500,
  });

  sleep(0.05);
}
