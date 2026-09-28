/**
 * Stats auxiliares da Estela (Fase D / Task D1).
 * docs/plano-despertar-producao-profundo.md — shape congelado 0D.
 *
 * Server-owned: incrementos só em paths autoritativos.
 * Cliente pode espelhar no DTO; sync NÃO baixa contadores.
 */

export const DESPERTAR_STATS_KEYS = Object.freeze([
  'clicks',
  'max_buy_biggest',
  'juizo_tie_wins',
]);

/** Shape canônico (camelCase no JS; snake no jsonb). */
export function emptyDespertarStats() {
  return {
    clicks: 0,
    maxBuyBiggest: 0,
    juizoTieWins: 0,
  };
}

function asNonNegInt(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * @param {unknown} raw — row.stats / dto.stats / snake_case
 */
export function normalizeDespertarStats(raw) {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    clicks: asNonNegInt(obj.clicks ?? obj.clickCount),
    maxBuyBiggest: asNonNegInt(
      obj.maxBuyBiggest ?? obj.max_buy_biggest ?? obj.maxBuy,
    ),
    juizoTieWins: asNonNegInt(
      obj.juizoTieWins ?? obj.juizo_tie_wins ?? obj.tieWins,
    ),
  };
}

/** Persistência jsonb (snake_case). */
export function statsToRowJson(stats) {
  const s = normalizeDespertarStats(stats);
  return {
    clicks: s.clicks,
    max_buy_biggest: s.maxBuyBiggest,
    juizo_tie_wins: s.juizoTieWins,
  };
}

/** DTO cliente (camelCase). */
export function statsToDto(stats) {
  return normalizeDespertarStats(stats);
}

/**
 * Merge monotônico: cada chave = max(server, incoming).
 * Nunca diminui (anti-cheat / prestige não zera).
 */
export function mergeDespertarStats(serverStats, incomingStats) {
  const a = normalizeDespertarStats(serverStats);
  const b = normalizeDespertarStats(incomingStats);
  return {
    clicks: Math.max(a.clicks, b.clicks),
    maxBuyBiggest: Math.max(a.maxBuyBiggest, b.maxBuyBiggest),
    juizoTieWins: Math.max(a.juizoTieWins, b.juizoTieWins),
  };
}

/**
 * @param {object|null|undefined} stats
 * @param {number} delta
 */
export function bumpClicks(stats, delta = 1) {
  const s = normalizeDespertarStats(stats);
  const add = asNonNegInt(delta);
  return { ...s, clicks: s.clicks + add };
}

/**
 * @param {object|null|undefined} stats
 * @param {number} bought — unidades numa única compra
 */
export function bumpMaxBuyBiggest(stats, bought) {
  const s = normalizeDespertarStats(stats);
  const n = asNonNegInt(bought);
  if (n <= 0) return s;
  return { ...s, maxBuyBiggest: Math.max(s.maxBuyBiggest, n) };
}

/**
 * @param {object|null|undefined} stats
 * @param {number} [delta=1]
 */
export function bumpJuizoTieWins(stats, delta = 1) {
  const s = normalizeDespertarStats(stats);
  const add = asNonNegInt(delta);
  return { ...s, juizoTieWins: s.juizoTieWins + add };
}
