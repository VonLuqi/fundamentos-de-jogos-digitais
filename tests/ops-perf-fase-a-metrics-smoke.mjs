/**
 * Smoke Fase A / Task A6 — instrumentação de request (prep k6).
 * docs/otimizacoes/01-tasks-fase-a-contencao.md
 *
 * Uso: node tests/ops-perf-fase-a-metrics-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  __resetRequestMetricsColdForTests,
  createRequestMetrics,
  finishRequestMetrics,
  formatMetricsLine,
  metricsAddScryptMs,
  metricsBumpDb,
  metricsSetAction,
  metricsSetGateCache,
  metricsSetRateLimitBackend,
  metricsSetStatus,
  normalizeGateCache,
  parseMetricsLine,
  runWithMetrics,
} from '../api/_lib/request-metrics.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const captured = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const metricsSrc = read('api/_lib/request-metrics.js');
const despertarSrc = read('api/despertar.js');
const authSrc = read('api/auth.js');
const progressSrc = read('api/progress.js');
const gateSrc = read('api/_lib/despertar-gate.js');
const master = read('docs/otimizacoes/00-master-plan.md');
const taskDoc = read('docs/otimizacoes/01-tasks-fase-a-contencao.md');
const pkg = read('package.json');

assert(metricsSrc.includes('createRequestMetrics'), 'helper createRequestMetrics');
assert(metricsSrc.includes('formatMetricsLine'), 'helper formatMetricsLine');
assert(metricsSrc.includes('parseMetricsLine'), 'helper parseMetricsLine');
assert(metricsSrc.includes('AsyncLocalStorage'), 'ALS para RTT');
assert(despertarSrc.includes('runWithMetrics') && despertarSrc.includes('finishRequestMetrics'), 'despertar wire');
assert(despertarSrc.includes('metricsSetGateCache'), 'despertar gate_cache');
assert(authSrc.includes('runWithMetrics') && authSrc.includes('metricsAddScryptMs'), 'auth wire + scrypt');
assert(progressSrc.includes('runWithMetrics') && progressSrc.includes('profileGet'), 'progress wire');
assert(gateSrc.includes('metricsBumpDb'), 'gate miss conta RTT');
assert(/p95|extrair|baseline/i.test(master), 'Master Plan documenta extrair p95');
assert(/Task A6|request-metrics/i.test(taskDoc), 'doc Fase A cobre A6');
assert(pkg.includes('ops-perf-fase-a-metrics-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/request-metrics.js'), 'npm check syntax-check metrics');

assert(normalizeGateCache('hit_memo') === 'hit', 'normalize hit_memo');
assert(normalizeGateCache('hit_kv') === 'hit', 'normalize hit_kv');
assert(normalizeGateCache('miss') === 'miss', 'normalize miss');
assert(normalizeGateCache('bypass') === 'bypass', 'normalize bypass');

__resetRequestMetricsColdForTests();
const m = createRequestMetrics({ route: 'despertar', action: 'stateSync' });
assert(m.cold === 1, 'primeira métrica cold=1');
assert(m.request_id && m.request_id.length >= 32, 'request_id uuid');

const origLog = console.log;
console.log = (...args) => {
  captured.push(args.map(String).join(' '));
};

await runWithMetrics(m, async () => {
  metricsBumpDb(2);
  metricsBumpDb(1);
  metricsSetGateCache('hit_memo');
  metricsSetRateLimitBackend('memory');
  metricsAddScryptMs(12);
  metricsSetAction('stateSync');
  metricsSetStatus(200);
});
finishRequestMetrics(m);

console.log = origLog;

const line = captured.find((l) => l.includes('[metrics]'));
assert(line, 'emitiu linha [metrics]');
const parsed = parseMetricsLine(line);
assert(parsed, 'parseMetricsLine ok');
assert(parsed.request_id === m.request_id, 'request_id correlacionável');
assert(parsed.route === 'despertar', 'route');
assert(parsed.action === 'stateSync', 'action');
assert(parsed.db_round_trips === '3', 'db_round_trips');
assert(parsed.gate_cache === 'hit', 'gate_cache hit');
assert(parsed.rate_limit_backend === 'memory', 'rate_limit_backend');
assert(parsed.scrypt_ms === '12', 'scrypt_ms');
assert(parsed.status === '200', 'status');
assert(parsed.cold === '1', 'cold');
assert(Number(parsed.duration_ms) >= 0, 'duration_ms');

const fixture = formatMetricsLine({
  request_id: '00000000-0000-4000-8000-000000000001',
  route: 'auth',
  action: 'login',
  startedAt: Date.now() - 40,
  db_round_trips: 4,
  gate_cache: 'n/a',
  rate_limit_backend: 'db',
  scrypt_ms: 85,
  cold: 0,
  status: 200,
});
const fixtureParsed = parseMetricsLine(`[metrics] ${fixture}`);
assert(fixtureParsed?.route === 'auth' && fixtureParsed?.scrypt_ms === '85', 'fixture login parseável');

// Sem PII nos campos
assert(!/email=|token=|username=/i.test(line), 'log sem PII óbvio');

if (errors.length) {
  console.error('ops-perf-fase-a-metrics-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-a-metrics-smoke OK');
console.log(`  sample: ${line}`);
