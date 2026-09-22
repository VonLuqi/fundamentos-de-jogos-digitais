/**
 * Stress turma ~30 — boot + ranking + sync (1 VU = 1 aluno, token pré-emitido).
 *
 * Sessões via service role evitam rate limit de login por IP (10/15 min) —
 * simula turma já autenticada no meio da aula (caso real mais quente).
 *
 * Pré:
 *   node scripts/seed-load-users.mjs --count 30
 *   npm run start   # ou BASE_URL=preview
 *
 *   k6 run -e BASE_URL=http://localhost:3000 -e VUS=30 -e DURATION=3m `
 *     -e LOAD_TOKENS_FILE=../../docs/load-results/raw/turma-tokens.json `
 *     tests/load/c-turma-30.js
 *
 * Nota: open() no k6 é relativo ao arquivo do script (não ao CWD).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// 2xx + respostas de negócio esperadas no sync (rate limit / conflito / gate)
http.setResponseCallback(
  http.expectedStatuses(200, 201, 204, 400, 403, 409, 429),
);

const bootFail = new Counter('turma_boot_fail');
const httpOk = new Rate('turma_http_ok');
const bootMs = new Trend('turma_boot_ms', true);

const tokenRows = new SharedArray('turma_tokens', () => {
  const file = String(__ENV.LOAD_TOKENS_FILE || '../../docs/load-results/raw/turma-tokens.json');
  const raw = open(file);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.tokens) || !parsed.tokens.length) {
    throw new Error(`Sem tokens em ${file} — rode scripts/seed-load-users.mjs`);
  }
  return parsed.tokens;
});

export const options = {
  scenarios: {
    turma_30: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 30),
      duration: String(__ENV.DURATION || '3m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:session_bootstrap}': ['p(95)<1200'],
    'http_req_duration{name:leaderboard_get}': ['p(95)<1500'],
    'http_req_duration{name:despertar_sync}': ['p(95)<2000'],
    turma_http_ok: ['rate>0.90'],
  },
};

function tokenForVu(vu) {
  const idx = (vu - 1) % tokenRows.length;
  return tokenRows[idx];
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

export default function turma30() {
  const baseUrl = String(__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const row = tokenForVu(__VU);
  const token = row.token;
  const t0 = Date.now();

  const boot = http.get(`${baseUrl}/api/session-bootstrap?token=${encodeURIComponent(token)}`, {
    tags: { name: 'session_bootstrap' },
  });
  const bootOk = check(boot, {
    'bootstrap 200': (r) => r.status === 200,
  });
  if (!bootOk) {
    bootFail.add(1);
    httpOk.add(0);
  } else {
    httpOk.add(1);
  }
  bootMs.add(Date.now() - t0);

  const lb = http.post(
    `${baseUrl}/api/progress`,
    JSON.stringify({
      token,
      action: 'leaderboardGet',
      scope: 'turma',
      sort: 'xp',
      limit: 25,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'leaderboard_get' },
    },
  );
  const lbOk = check(lb, {
    'leaderboard 200': (r) => r.status === 200,
    'leaderboard não 5xx': (r) => r.status < 500,
  });
  httpOk.add(lbOk && lb.status === 200 ? 1 : lb.status < 500 ? 1 : 0);

  const sync = http.post(
    `${baseUrl}/api/despertar`,
    JSON.stringify({
      token,
      action: 'stateSync',
      clientState: minimalClientState(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'despertar_sync' },
    },
  );
  check(sync, {
    'sync não 5xx': (r) => r.status < 500,
    'sync esperado': (r) =>
      r.status === 200 || r.status === 400 || r.status === 403 || r.status === 409 || r.status === 429,
  });
  httpOk.add(sync.status < 500 ? 1 : 0);

  sleep(Number(__ENV.THINK_TIME || 2));
}
