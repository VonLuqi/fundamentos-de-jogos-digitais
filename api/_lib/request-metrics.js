/**
 * Instrumentação de request (Fase A / Task A6) — prep baseline k6.
 * Logs key=value sem PII. Contador de RTT via AsyncLocalStorage.
 *
 * @see docs/otimizacoes/01-tasks-fase-a-contencao.md
 * @see docs/otimizacoes/00-master-plan.md (§ extrair p95)
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';

const storage = new AsyncLocalStorage();

/** Primeira métrica por isolate ≈ cold start (best-effort). */
let isolateCold = true;

/**
 * @typedef {object} RequestMetrics
 * @property {string} request_id
 * @property {string} route
 * @property {string} action
 * @property {number} startedAt
 * @property {number} db_round_trips
 * @property {string} gate_cache
 * @property {string} rate_limit_backend
 * @property {number} [scrypt_ms]
 * @property {0|1} cold
 * @property {number} [status]
 */

/**
 * @param {{ route: string, action?: string }} opts
 * @returns {RequestMetrics}
 */
export function createRequestMetrics(opts) {
  const cold = isolateCold ? 1 : 0;
  isolateCold = false;
  return {
    request_id: crypto.randomUUID(),
    route: String(opts?.route || 'unknown'),
    action: String(opts?.action || 'n/a'),
    startedAt: Date.now(),
    db_round_trips: 0,
    gate_cache: 'n/a',
    rate_limit_backend: 'n/a',
    scrypt_ms: undefined,
    cold,
    status: undefined,
  };
}

/**
 * @template T
 * @param {RequestMetrics} metrics
 * @param {() => Promise<T>|T} fn
 * @returns {Promise<T>}
 */
export async function runWithMetrics(metrics, fn) {
  return storage.run(metrics, fn);
}

/** @returns {RequestMetrics|undefined} */
export function getRequestMetrics() {
  return storage.getStore();
}

export function metricsBumpDb(n = 1) {
  const m = storage.getStore();
  if (!m) return;
  const delta = Number(n);
  if (!Number.isFinite(delta) || delta === 0) return;
  m.db_round_trips += delta;
}

export function metricsSetAction(action) {
  const m = storage.getStore();
  if (m && action != null) m.action = String(action);
}

export function metricsSetGateCache(status) {
  const m = storage.getStore();
  if (!m) return;
  m.gate_cache = normalizeGateCache(status);
}

export function metricsSetRateLimitBackend(backend) {
  const m = storage.getStore();
  if (!m) return;
  const b = String(backend || 'n/a');
  m.rate_limit_backend = b === 'kv' || b === 'memory' || b === 'db' ? b : 'n/a';
}

export function metricsAddScryptMs(ms) {
  const m = storage.getStore();
  if (!m) return;
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return;
  m.scrypt_ms = (m.scrypt_ms || 0) + Math.round(n);
}

export function metricsSetStatus(status) {
  const m = storage.getStore();
  if (!m) return;
  const code = Number(status);
  if (Number.isFinite(code)) m.status = code;
}

/**
 * Normaliza status A3 → contrato A6: hit | miss | bypass | n/a
 * @param {string} [raw]
 */
export function normalizeGateCache(raw) {
  const s = String(raw || 'n/a');
  if (s === 'hit_memo' || s === 'hit_kv' || s === 'hit') return 'hit';
  if (s === 'miss') return 'miss';
  if (s === 'bypass') return 'bypass';
  return 'n/a';
}

/**
 * @param {RequestMetrics} metrics
 * @param {{ status?: number }} [extra]
 * @returns {string}
 */
export function formatMetricsLine(metrics, extra = {}) {
  const duration_ms = Math.max(0, Date.now() - Number(metrics.startedAt || Date.now()));
  const status = extra.status ?? metrics.status;
  const parts = [
    `request_id=${metrics.request_id}`,
    `route=${metrics.route}`,
    `action=${sanitizeToken(metrics.action)}`,
    `duration_ms=${duration_ms}`,
    `db_round_trips=${Number(metrics.db_round_trips) || 0}`,
    `gate_cache=${normalizeGateCache(metrics.gate_cache)}`,
    `rate_limit_backend=${metrics.rate_limit_backend || 'n/a'}`,
    `cold=${metrics.cold ? 1 : 0}`,
  ];
  if (Number.isFinite(metrics.scrypt_ms)) {
    parts.splice(4, 0, `scrypt_ms=${Math.round(metrics.scrypt_ms)}`);
  }
  if (Number.isFinite(status)) {
    parts.push(`status=${status}`);
  }
  return parts.join(' ');
}

/**
 * Emite log estruturado. Idempotente-ish: marca finished.
 * @param {RequestMetrics} metrics
 * @param {{ status?: number }} [extra]
 */
export function finishRequestMetrics(metrics, extra = {}) {
  if (!metrics || metrics.__finished) return;
  metrics.__finished = true;
  if (Number.isFinite(extra.status)) metrics.status = extra.status;
  console.log(`[metrics] ${formatMetricsLine(metrics, extra)}`);
}

/**
 * Parse de linha `[metrics] k=v …` para smokes / doc 04.
 * @param {string} line
 * @returns {Record<string, string>|null}
 */
export function parseMetricsLine(line) {
  const raw = String(line || '').trim();
  const body = raw.startsWith('[metrics]')
    ? raw.slice('[metrics]'.length).trim()
    : raw;
  if (!body.includes('request_id=')) return null;
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of body.split(/\s+/)) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    out[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return out.request_id ? out : null;
}

/** Só testes. */
export function __resetRequestMetricsColdForTests() {
  isolateCold = true;
}

function sanitizeToken(value) {
  return String(value || 'n/a').replace(/[^\w.-]+/g, '_').slice(0, 64) || 'n/a';
}
