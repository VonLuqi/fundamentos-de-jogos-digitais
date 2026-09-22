/**
 * C3 — Despertar lab: stateSync periódico.
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 *   k6 run -e BASE_URL=http://localhost:3000 -e VUS=30 -e DURATION=3m `
 *     -e LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json `
 *     tests/load/c3-despertar-sync.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { defaultThresholds, getConfig } from './lib/config.js';
import { tokenForVu } from './lib/tokens.js';

http.setResponseCallback(http.expectedStatuses(200, 201, 204, 400, 403, 409, 429));

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

/** @type {string|null} */
let vuToken = null;

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

export default function c3DespertarSync() {
  const cfg = getConfig();
  if (!vuToken) {
    vuToken = tokenForVu(__VU);
    if (!vuToken) {
      if (!cfg.username || !cfg.password) {
        throw new Error('Defina LOAD_TOKENS_FILE ou LOAD_USERNAME + LOAD_PASSWORD');
      }
      vuToken = login(cfg.baseUrl, cfg.username, cfg.password);
      if (!vuToken) throw new Error('login falhou no C3');
    }
  }

  const res = http.post(
    `${cfg.baseUrl}/api/despertar`,
    JSON.stringify({
      token: vuToken,
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
  sleep(Math.max(1, (cfg.syncIntervalMs || 10000) / 1000));
}
