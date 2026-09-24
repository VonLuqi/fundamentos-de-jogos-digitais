/**
 * Raridade visual/econômica por índice na linha.
 * Convenção: índices 0..neg-1 = negativo; neg..neg+gold-1 = gold.
 */

/**
 * @param {number} index
 * @param {{ gold?: number, shiny?: number, negativo?: number }} counts
 * @returns {'normal'|'gold'|'negativo'}
 */
export function unitRarityAt(index, counts = {}) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  const gold = Math.max(0, Math.floor(Number(counts.gold) || 0));
  const neg = Math.max(
    0,
    Math.floor(Number(counts.negativo ?? counts.shiny) || 0),
  );
  if (i < neg) return 'negativo';
  if (i < neg + gold) return 'gold';
  return 'normal';
}
