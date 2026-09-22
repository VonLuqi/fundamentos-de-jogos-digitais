/**
 * C3 — Despertar lab: stateSync periódico (payload mínimo; servidor valida).
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 *   k6 run -e BASE_URL=… -e LOAD_USERNAME=… -e LOAD_PASSWORD=… tests/load/c3-despertar-sync.js
 *
 * Nota: clientState abaixo é esqueleto — ajuste com estado válido do aluno de load
 * se o servidor rejeitar 400. O objetivo do baseline é latência/RTT do path autenticado.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { defaultThresholds, getConfig } from './lib/config.js';

export const options = {
  scenarios: {
    c3_sync: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '5m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:despertar_sync}': defaultThresholds['http_req_duration{name:despertar_sync}'],
  },
};

export function setup() {
  const cfg = getConfig();
  if (!cfg.username || !cfg.password) {
    throw new Error('Defina LOAD_USERNAME e LOAD_PASSWORD');
  }
  const token = login(cfg.baseUrl, cfg.username, cfg.password);
  if (!token) throw new Error('login falhou no setup C3');
  return { token, baseUrl: cfg.baseUrl, syncIntervalMs: cfg.syncIntervalMs };
}

function minimalClientState() {
  const now = new Date().toISOString();
  return {
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
    lastSyncAt: now,
  };
}

export default function c3DespertarSync(data) {
  const res = http.post(
    `${data.baseUrl}/api/despertar`,
    JSON.stringify({
      token: data.token,
      action: 'stateSync',
      clientState: minimalClientState(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'despertar_sync' },
    },
  );
  check(res, {
    'sync não 5xx': (r) => r.status < 500,
    'sync 200/4xx esperado': (r) =>
      r.status === 200 || r.status === 400 || r.status === 403 || r.status === 409 || r.status === 429,
  });
  sleep((data.syncIntervalMs || 10000) / 1000);
}
