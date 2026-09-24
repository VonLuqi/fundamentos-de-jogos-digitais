/**
 * Cosméticos de upgrade → sprites / Foice (Fase E).
 * P0: procedural/CSS; WebP reais ficam para arte depois.
 */

function freezeCosmetic(def) {
  return Object.freeze({ ...def });
}

/**
 * @typedef {{
 *   targetGeneratorId?: string,
 *   target?: 'reap',
 *   accessory: string,
 *   coverage: number,
 *   layer?: string,
 *   priority?: number,
 * }} UpgradeCosmeticDef
 */

/** @type {Readonly<Record<string, UpgradeCosmeticDef>>} */
export const UPGRADE_COSMETICS = Object.freeze({
  moeda_no_barquinho: freezeCosmetic({
    targetGeneratorId: 'charon_servants',
    accessory: 'hat_charon',
    coverage: 0.5,
    layer: 'hat',
    priority: 1,
  }),
  foice_afilada: freezeCosmetic({
    target: 'reap',
    accessory: 'blade_glow',
    coverage: 1,
    layer: 'blade',
    priority: 1,
  }),
});

export const UPGRADE_COSMETIC_IDS = Object.freeze(Object.keys(UPGRADE_COSMETICS));

/**
 * Hash estável → [0, 1). Visualmente irregular; não re-rola entre frames.
 * @param {number} index
 * @param {number|string} [salt]
 */
export function coverageHash01(index, salt = 0) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  let s = 0;
  if (typeof salt === 'string') {
    for (let k = 0; k < salt.length; k += 1) {
      s = Math.imul(s ^ salt.charCodeAt(k), 0x01000193);
    }
  } else {
    s = Math.floor(Number(salt) || 0) | 0;
  }
  let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(s, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * Mask ~coverage dos índices — espalhamento pseudo-aleatório estável.
 * (Bresenham em grade coluna-major pintava faixas inteiras de chapéu.)
 * @param {number} index
 * @param {number} coverage
 * @param {number|string} [salt] upgradeId / accessory p/ padrões distintos
 */
export function indexMatchesCoverage(index, coverage, salt = 0) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  const c = Number(coverage);
  if (!Number.isFinite(c) || c <= 0) return false;
  if (c >= 1) return true;
  return coverageHash01(i, salt) < c;
}

/**
 * Máscara booleana para índices `[0, count)`.
 * @param {number} count
 * @param {number} coverage
 * @param {number|string} [salt]
 * @returns {boolean[]}
 */
export function cosmeticCoverageMask(count, coverage, salt = 0) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const mask = new Array(n);
  for (let i = 0; i < n; i += 1) {
    mask[i] = indexMatchesCoverage(i, coverage, salt);
  }
  return mask;
}

/**
 * Índices que recebem o accessory.
 * @param {number} count
 * @param {number} coverage
 * @param {number|string} [salt]
 * @returns {number[]}
 */
export function cosmeticCoverageIndices(count, coverage, salt = 0) {
  const mask = cosmeticCoverageMask(count, coverage, salt);
  const out = [];
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) out.push(i);
  }
  return out;
}

/**
 * @param {UpgradeCosmeticDef} def
 * @param {string} upgradeId
 */
function normalizeActive(def, upgradeId) {
  return {
    upgradeId,
    targetGeneratorId: def.targetGeneratorId ? String(def.targetGeneratorId) : null,
    target: def.target === 'reap' ? 'reap' : null,
    accessory: String(def.accessory || ''),
    coverage: Number(def.coverage) || 0,
    layer: String(def.layer || 'default'),
    priority: Number(def.priority) || 0,
  };
}

/**
 * Mesma layer → maior priority; layers distintas empilham.
 * @param {ReturnType<typeof normalizeActive>[]} list
 */
export function resolveCosmeticLayers(list = []) {
  const best = new Map();
  for (const item of list) {
    if (!item?.accessory) continue;
    const key = item.target === 'reap'
      ? `reap:${item.layer}`
      : `gen:${item.targetGeneratorId || ''}:${item.layer}`;
    const prev = best.get(key);
    if (!prev || item.priority >= prev.priority) best.set(key, item);
  }
  return [...best.values()];
}

/**
 * Cosméticos ativos para o state (upgrades owned) — pronto para WorldView / Foice.
 * @param {{ upgrades?: string[] }|null|undefined} state
 */
export function activeCosmetics(state) {
  const owned = new Set(
    (Array.isArray(state?.upgrades) ? state.upgrades : []).map((id) => String(id)),
  );
  const raw = [];
  for (const id of UPGRADE_COSMETIC_IDS) {
    if (!owned.has(id)) continue;
    const def = UPGRADE_COSMETICS[id];
    if (!def) continue;
    raw.push(normalizeActive(def, id));
  }
  return resolveCosmeticLayers(raw);
}

/**
 * Filtra cosméticos de prateleira para um gerador.
 * @param {ReturnType<typeof activeCosmetics>} active
 * @param {string} generatorId
 */
export function cosmeticsForGenerator(active, generatorId) {
  const id = String(generatorId || '');
  return (Array.isArray(active) ? active : []).filter(
    (item) => item.targetGeneratorId === id && item.target !== 'reap',
  );
}

/**
 * Cosméticos da Foice (`target: 'reap'`).
 * @param {ReturnType<typeof activeCosmetics>} active
 */
export function cosmeticsForReap(active) {
  return (Array.isArray(active) ? active : []).filter((item) => item.target === 'reap');
}

/**
 * Classes CSS `has-cosmetic-<accessory>` para `#despertar-reap`.
 * @param {{ upgrades?: string[] }|ReturnType<typeof activeCosmetics>|null|undefined} stateOrActive
 * @returns {string[]}
 */
export function reapCosmeticClassNames(stateOrActive) {
  const active = Array.isArray(stateOrActive)
    ? stateOrActive
    : activeCosmetics(stateOrActive);
  return cosmeticsForReap(active)
    .filter((c) => c.accessory)
    .map((c) => `has-cosmetic-${c.accessory}`);
}

/**
 * Aplica/remove classes cosméticas no botão da Foice.
 * @param {Element|null|undefined} element
 * @param {{ upgrades?: string[] }|ReturnType<typeof activeCosmetics>|null|undefined} stateOrActive
 * @returns {string[]} classes ativas
 */
export function applyReapCosmeticClasses(element, stateOrActive) {
  if (!element?.classList) return [];
  const next = new Set(reapCosmeticClassNames(stateOrActive));
  const list = element.classList;
  const existing = typeof list.values === 'function'
    ? [...list]
    : (list._on ? [...list._on] : []);
  for (const cls of existing) {
    const name = String(cls);
    if (name.startsWith('has-cosmetic-') && !next.has(name)) {
      list.remove(name);
    }
  }
  for (const cls of next) list.add(cls);
  return [...next];
}
