/**
 * C1 — Abertura de turma: login + boot (bootstrap se existir, senão auth GET + progress GET).
 * docs/otimizacoes/04-tasks-k6-carga.md
 *
 *   k6 run -e BASE_URL=… -e LOAD_USERNAME=… -e LOAD_PASSWORD=… tests/load/c1-login-boot.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { login } from './lib/auth.js';
import { defaultThresholds, getConfig } from './lib/config.js';

export const options = {
  scenarios: {
    c1_smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 5),
      duration: String(__ENV.DURATION || '2m'),
    },
  },
  thresholds: defaultThresholds,
};

export default function c1LoginBoot() {
  const cfg = getConfig();
  if (!cfg.username || !cfg.password) {
    throw new Error('Defina LOAD_USERNAME e LOAD_PASSWORD');
  }

  const token = login(cfg.baseUrl, cfg.username, cfg.password);
  check(token, { 'token presente': (t) => Boolean(t) });
  if (!token) {
    sleep(1);
    return;
  }

  const boot = http.get(`${cfg.baseUrl}/api/session-bootstrap?token=${encodeURIComponent(token)}`, {
    tags: { name: 'session_bootstrap' },
  });

  if (boot.status === 404 || boot.status === 405) {
    const authGet = http.get(`${cfg.baseUrl}/api/auth?token=${encodeURIComponent(token)}`, {
      tags: { name: 'session_get' },
    });
    check(authGet, { 'auth GET 200': (r) => r.status === 200 });
    const profile = http.get(`${cfg.baseUrl}/api/progress?token=${encodeURIComponent(token)}`, {
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

  sleep(1);
}
