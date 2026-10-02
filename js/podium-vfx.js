/**
 * Pódio do Placar — top 4 (arco-íris / ouro / prata / cobre).
 */

'use strict';

export const PODIUM_CLASS_PREFIX = 'is-podium-';

/** @type {ReadonlyArray<{ rank: number, tier: string, label: string }>} */
export const PODIUM_TIERS = Object.freeze([
  { rank: 1, tier: 'rainbow', label: 'Arco-íris' },
  { rank: 2, tier: 'gold', label: 'Ouro' },
  { rank: 3, tier: 'silver', label: 'Prata' },
  { rank: 4, tier: 'copper', label: 'Cobre' },
]);

/**
 * @param {unknown} rank
 * @returns {{ rank: number, tier: string, label: string, className: string } | null}
 */
export function podiumTierForRank(rank) {
  const n = Number(rank);
  if (!Number.isInteger(n) || n < 1 || n > 4) return null;
  const entry = PODIUM_TIERS.find((item) => item.rank === n);
  if (!entry) return null;
  return {
    rank: entry.rank,
    tier: entry.tier,
    label: entry.label,
    className: `${PODIUM_CLASS_PREFIX}${entry.rank}`,
  };
}

/** Remove is-podium-1..4 de um elemento. */
export function clearPodiumClasses(el) {
  if (!el?.classList) return;
  for (let i = 1; i <= 4; i += 1) {
    el.classList.remove(`${PODIUM_CLASS_PREFIX}${i}`);
  }
  if (el.dataset) delete el.dataset.podiumRank;
}

/**
 * Aplica a classe de pódio (ou limpa se fora do top 4).
 * @param {Element|null|undefined} el
 * @param {unknown} rank
 * @returns {ReturnType<typeof podiumTierForRank>}
 */
export function applyPodiumClasses(el, rank) {
  if (!el) return null;
  clearPodiumClasses(el);
  const podium = podiumTierForRank(rank);
  if (!podium) return null;
  el.classList.add(podium.className);
  if (el.dataset) el.dataset.podiumRank = String(podium.rank);
  return podium;
}
