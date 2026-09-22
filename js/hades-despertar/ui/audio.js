/**
 * Task C3 — Áudio do Despertar (deferido).
 *
 * Decisão (Q18 / §13): **nenhum SFX nesta reformulação Cookie UI**.
 * Ceifar, compra, juramento e Juízo ficam só com juice visual (C1/C2).
 *
 * Este módulo é um no-op estável para plugar SFX numa fase posterior
 * sem caçar call sites. Não carrega arquivos de áudio.
 */

/** Master switch — permanece false até a fase de áudio. */
export const SFX_ENABLED = false;

/** IDs reservados para a leva futura. */
export const SFX_IDS = Object.freeze({
  reap: 'reap',
  buy: 'buy',
  upgrade: 'upgrade',
  juizoHit: 'juizo_hit',
  juizoMiss: 'juizo_miss',
  lethe: 'lethe',
});

/**
 * Toca um SFX se habilitado. Hoje sempre retorna false.
 * @param {string} _id
 * @param {{ reducedMotion?: boolean }} [_options]
 * @returns {boolean}
 */
export function playSfx(_id, _options = {}) {
  if (!SFX_ENABLED) return false;
  return false;
}

/**
 * Preload futuro (no-op).
 * @returns {Promise<void>}
 */
export async function preloadSfx() {
  return undefined;
}
