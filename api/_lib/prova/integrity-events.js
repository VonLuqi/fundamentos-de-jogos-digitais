/**
 * Integridade da prova — validação de eventos + bump de summary (Task C2).
 */

export const PROVA_INTEGRITY_EVENT_TYPES = Object.freeze([
  'tab_blur',
  'tab_focus',
  'window_blur',
  'page_leave',
  'navigated_away',
  'beforeunload',
]);

const TYPE_SET = new Set(PROVA_INTEGRITY_EVENT_TYPES);

const BLUR_TYPES = new Set(['tab_blur', 'window_blur']);
const LEAVE_TYPES = new Set(['page_leave', 'navigated_away', 'beforeunload']);

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeIntegrityEventType(raw) {
  const type = String(raw || '').trim();
  return TYPE_SET.has(type) ? type : null;
}

/**
 * @param {unknown} summary
 * @returns {{ blurCount: number, leaveCount: number, lastEventAt: string|null }}
 */
export function normalizeIntegritySummary(summary) {
  const src = summary && typeof summary === 'object' ? summary : {};
  return {
    blurCount: Math.max(0, Number(src.blurCount) || 0),
    leaveCount: Math.max(0, Number(src.leaveCount) || 0),
    lastEventAt: src.lastEventAt ? String(src.lastEventAt) : null,
  };
}

/**
 * @param {unknown} summary
 * @param {string} eventType
 * @param {string} [atIso]
 */
export function bumpIntegritySummary(summary, eventType, atIso = new Date().toISOString()) {
  const next = normalizeIntegritySummary(summary);
  next.lastEventAt = atIso;
  if (BLUR_TYPES.has(eventType)) next.blurCount += 1;
  if (LEAVE_TYPES.has(eventType)) next.leaveCount += 1;
  return next;
}

/**
 * Meta opcional (JSON-safe, tamanho limitado).
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function sanitizeIntegrityMeta(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  try {
    const json = JSON.stringify(raw);
    if (json.length > 2000) return { truncated: true };
    return JSON.parse(json);
  } catch {
    return {};
  }
}
