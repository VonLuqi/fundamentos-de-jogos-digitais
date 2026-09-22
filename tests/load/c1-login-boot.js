/**
 * C1 — Abertura de turma: login (1×/VU) + boot session-bootstrap.
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 * Preferir tokens pré-emitidos para VUs ≥ 10 (login_ip 10/15 min):
 *   k6 run -e BASE_URL=http://localhost:3000 -e VUS=30 -e DURATION=3m `
 *     -e LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json `
 *     tests/load/c1-login-boot.js
 *
 * Smoke com login real (≤5 VUs):
 *   k6 run -e LOAD_USERNAME=load_aluno_01 -e LOAD_PASSWORD=LoadTest!30 tests/load/c1-login-boot.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { defaultThresholds, getConfig } from './lib/config.js';
import { tokenForVu } from './lib/tokens.js';

http.setResponseCallback(http.expectedStatuses(200, 201, 204, 400, 401, 403, 409, 429));

export const options = {
  scenarios: {
    c1_boot: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '2m'),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:auth_login}': defaultThresholds['http_req_duration{name:auth_login}'],
    'http_req_duration{name:session_bootstrap}': ['p(95)<1200'],
  },
};

/** @type {string|null} */
let vuToken = null;

export default function c1LoginBoot() {
  const cfg = getConfig();
  const vus = Number(__ENV.VUS || 5);

  if (!vuToken) {
    vuToken = tokenForVu(__VU);
    if (!vuToken) {
      if (vus > 8) {
        throw new Error(
          'VUS>8 exige LOAD_TOKENS_FILE (rate limit login_ip). Seed: node scripts/seed-load-users.mjs --count 30',
        );
      }
      if (!cfg.username || !cfg.password) {
        throw new Error('Defina LOAD_TOKENS_FILE ou LOAD_USERNAME + LOAD_PASSWORD');
      }
      // Um login por VU (abertura); username com sufixo opcional load_aluno_XX
      const user =
        cfg.username.includes('_') && !__ENV.LOAD_USERNAME_FIXED
          ? cfg.username.replace(/\d+$/, String(__VU).padStart(2, '0'))
          : cfg.username;
      vuToken = login(cfg.baseUrl, user, cfg.password);
    }
  }

  check(vuToken, { 'token presente': (t) => Boolean(t) });
  if (!vuToken) {
    sleep(1);
    return;
  }

  const boot = http.get(`${cfg.baseUrl}/api/session-bootstrap?token=${encodeURIComponent(vuToken)}`, {
    tags: { name: 'session_bootstrap' },
  });

  if (boot.status === 404 || boot.status === 405) {
    const authGet = http.get(`${cfg.baseUrl}/api/auth?token=${encodeURIComponent(vuToken)}`, {
      tags: { name: 'session_get' },
    });
    check(authGet, { 'auth GET 200': (r) => r.status === 200 });
    const profile = http.get(`${cfg.baseUrl}/api/progress?token=${encodeURIComponent(vuToken)}`, {
      tags: { name: 'profile_get' },
    });
    check(profile, { 'progress GET 200': (r) => r.status === 200 });
  } else {
    check(boot, {
      'bootstrap 200': (r) => r.status === 200,
      'bootstrap ok': (r) => {
        try {
          return r.json('ok') === true;
        } catch {
          return false;
        }
      },
    });
  }

  sleep(Number(__ENV.THINK_TIME || 1));
}
