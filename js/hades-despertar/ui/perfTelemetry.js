/**
 * Telemetria de renderização (Perf-0) — `performance.mark` / `performance.measure`.
 * Custo zero em produção quando a flag dev está desligada.
 */

let _telemetryEnabled = false;

/**
 * Detecta se a flag de telemetria dev está ativa via URL (`?perf=1` / `?harness=1` em localhost)
 * ou programaticamente via `setPerfTelemetryEnabled(true)`.
 */
export function isPerfTelemetryEnabled(loc = globalThis?.location) {
  if (_telemetryEnabled) return true;
  if (!loc || typeof loc.search !== 'string') return false;
  const host = String(loc.hostname || '');
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  try {
    const params = new URLSearchParams(loc.search);
    return params.get('perf') === '1' || params.get('harness') === '1';
  } catch {
    return false;
  }
}

export function setPerfTelemetryEnabled(enabled) {
  _telemetryEnabled = Boolean(enabled);
  return _telemetryEnabled;
}

/**
 * Executa `performance.mark(start)` → `fn()` → `performance.mark(end)` + `performance.measure(name)`
 * somente quando a flag de telemetria dev está ativa.
 *
 * @template T
 * @param {string} name
 * @param {() => T} fn
 * @param { Performance | null } [perf]
 * @returns {T}
 */
export function withPerfMeasure(name, fn, perf = globalThis?.performance) {
  if (!_telemetryEnabled && !isPerfTelemetryEnabled()) {
    return fn();
  }
  if (!perf || typeof perf.mark !== 'function' || typeof perf.measure !== 'function') {
    return fn();
  }
  const startMark = `${name}:start`;
  const endMark = `${name}:end`;
  try {
    perf.mark(startMark);
    return fn();
  } finally {
    try {
      perf.mark(endMark);
      perf.measure(name, startMark, endMark);
    } catch {
      /* ignora ambientes sem User Timing completo */
    }
  }
}
