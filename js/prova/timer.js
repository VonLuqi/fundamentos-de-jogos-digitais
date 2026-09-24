/**
 * Cronômetro server-authoritative da prova (Task B3).
 * Sync com endsAt + serverNow; tick local; poll de re-sync; urgência 5 min.
 */

'use strict';

export const PROVA_TIMER_URGENT_MS = 5 * 60 * 1000;
export const PROVA_TIMER_POLL_MS = 30 * 1000;
export const PROVA_TIMER_TICK_MS = 1000;

/**
 * @param {unknown} iso
 * @returns {number|null}
 */
export function parseTimeMs(iso) {
  if (iso == null || iso === '') return null;
  if (typeof iso === 'number' && Number.isFinite(iso)) return iso;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Alinha relógio local ao servidor: offset = serverNow - Date.now()
 * remaining = endsAt - (Date.now() + offset)
 *
 * @param {string|number|null|undefined} endsAt
 * @param {string|number|null|undefined} serverNow
 * @returns {{ endsAtMs: number|null, offsetMs: number, remainingMs: number|null }}
 */
export function computeTimerSync(endsAt, serverNow) {
  const endsAtMs = parseTimeMs(endsAt);
  const serverMs = parseTimeMs(serverNow);
  const offsetMs = serverMs != null ? serverMs - Date.now() : 0;
  const remainingMs = endsAtMs != null
    ? Math.max(0, endsAtMs - (Date.now() + offsetMs))
    : null;
  return { endsAtMs, offsetMs, remainingMs };
}

/**
 * @param {number|null|undefined} remainingMs
 */
export function formatRemaining(remainingMs) {
  if (remainingMs == null || !Number.isFinite(remainingMs)) return '—:—';
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isUrgent(remainingMs, thresholdMs = PROVA_TIMER_URGENT_MS) {
  return remainingMs != null
    && Number.isFinite(remainingMs)
    && remainingMs > 0
    && remainingMs <= thresholdMs;
}

/**
 * @param {object} options
 * @param {HTMLElement|null} [options.valueEl]
 * @param {HTMLElement|null} [options.rootEl]
 * @param {() => void} [options.onExpire]
 * @param {() => Promise<{ endsAt?: string, serverNow?: string, remainingMs?: number }|null|void>} [options.onResync]
 * @param {number} [options.pollMs]
 * @param {number} [options.tickMs]
 * @param {number} [options.urgentMs]
 */
export function createProvaTimer(options = {}) {
  const {
    valueEl = null,
    rootEl = null,
    onExpire = null,
    onResync = null,
    pollMs = PROVA_TIMER_POLL_MS,
    tickMs = PROVA_TIMER_TICK_MS,
    urgentMs = PROVA_TIMER_URGENT_MS,
  } = options;

  let endsAtMs = null;
  let offsetMs = 0;
  let tickId = null;
  let pollId = null;
  let expired = false;
  let running = false;

  function nowAligned() {
    return Date.now() + offsetMs;
  }

  function remaining() {
    if (endsAtMs == null) return null;
    return Math.max(0, endsAtMs - nowAligned());
  }

  function paint() {
    const rem = remaining();
    if (valueEl) valueEl.textContent = formatRemaining(rem);
    if (rootEl) rootEl.classList.toggle('is-urgent', isUrgent(rem, urgentMs));
    return rem;
  }

  function clearTimers() {
    if (tickId) {
      globalThis.clearInterval(tickId);
      tickId = null;
    }
    if (pollId) {
      globalThis.clearInterval(pollId);
      pollId = null;
    }
  }

  function fireExpire() {
    if (expired) return;
    expired = true;
    clearTimers();
    running = false;
    paint();
    if (typeof onExpire === 'function') onExpire();
  }

  function tick() {
    if (!running) return;
    const rem = paint();
    if (rem != null && rem <= 0) fireExpire();
  }

  async function poll() {
    if (!running || typeof onResync !== 'function') return;
    try {
      const data = await onResync();
      if (!data || !running) return;
      if (data.endsAt || data.serverNow) {
        sync(data.endsAt ?? endsAtMs, data.serverNow);
      } else if (data.remainingMs != null && endsAtMs != null) {
        // Ajusta endsAt a partir do remaining reportado pelo servidor
        endsAtMs = nowAligned() + Number(data.remainingMs);
        paint();
        if (Number(data.remainingMs) <= 0) fireExpire();
      }
    } catch (error) {
      console.warn('[prova/timer] resync', error);
    }
  }

  /**
   * @param {string|number|null|undefined} endsAt
   * @param {string|number|null|undefined} [serverNow]
   */
  function sync(endsAt, serverNow) {
    const computed = computeTimerSync(
      endsAt ?? endsAtMs,
      serverNow,
    );
    if (computed.endsAtMs != null) endsAtMs = computed.endsAtMs;
    if (serverNow != null) offsetMs = computed.offsetMs;
    expired = false;
    const rem = paint();
    if (rem != null && rem <= 0) {
      fireExpire();
    }
  }

  /**
   * @param {string|number} endsAt
   * @param {string|number|null|undefined} [serverNow]
   */
  function start(endsAt, serverNow) {
    stop();
    expired = false;
    running = true;
    sync(endsAt, serverNow);
    if (expired) return;
    tickId = globalThis.setInterval(tick, tickMs);
    if (typeof onResync === 'function') {
      pollId = globalThis.setInterval(() => {
        void poll();
      }, pollMs);
    }
  }

  function stop() {
    running = false;
    clearTimers();
  }

  function getState() {
    return {
      running,
      expired,
      endsAtMs,
      offsetMs,
      remainingMs: remaining(),
    };
  }

  return {
    start,
    stop,
    sync,
    paint,
    getState,
    remaining,
  };
}
