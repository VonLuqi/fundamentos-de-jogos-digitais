/**
 * Cosméticos de upgrade / Bancada → sprites / Foice / altar (Fase E).
 * P0: procedural/CSS; WebP reais ficam para arte (E3).
 *
 * Catálogo congelado 0E — docs/plano-despertar-producao-profundo.md
 */

export const COSMETIC_LAYERS = Object.freeze([
  'hat',
  'aura',
  'blade',
  'trail',
  'shelf_fx',
]);

function freezeCosmetic(def) {
  const source = def.source === 'verdict' ? 'verdict' : 'upgrade';
  const layer = COSMETIC_LAYERS.includes(def.layer) ? def.layer : 'aura';
  const target = def.target === 'reap' || def.target === 'altar' ? def.target : undefined;
  return Object.freeze({
    ...def,
    source,
    layer,
    ...(target ? { target } : {}),
  });
}

/**
 * @typedef {{
 *   source?: 'upgrade'|'verdict',
 *   targetGeneratorId?: string,
 *   target?: 'reap'|'altar',
 *   accessory: string,
 *   coverage: number,
 *   layer?: string,
 *   priority?: number,
 * }} UpgradeCosmeticDef
 */

/** @type {Readonly<Record<string, UpgradeCosmeticDef>>} */
export const UPGRADE_COSMETICS = Object.freeze({
  // --- Foice (cadeia click) ---
  foice_afilada: freezeCosmetic({
    target: 'reap',
    accessory: 'blade_glow',
    coverage: 1,
    layer: 'blade',
    priority: 1,
  }),
  juramento_acheron: freezeCosmetic({
    target: 'reap',
    accessory: 'blade_runes',
    coverage: 1,
    layer: 'blade',
    priority: 2,
  }),
  pacto_das_margens: freezeCosmetic({
    target: 'reap',
    accessory: 'reap_ripple',
    coverage: 1,
    layer: 'trail',
    priority: 1,
  }),
  ceifador_ctoniano: freezeCosmetic({
    target: 'reap',
    accessory: 'blade_ember',
    coverage: 1,
    layer: 'blade',
    priority: 3,
  }),
  colheita_eterna: freezeCosmetic({
    target: 'altar',
    accessory: 'orbit_halo',
    coverage: 1,
    layer: 'aura',
    priority: 1,
  }),

  // --- Prateleiras / geradores ---
  moeda_no_barquinho: freezeCosmetic({
    targetGeneratorId: 'charon_servants',
    accessory: 'hat_charon',
    coverage: 0.5,
    layer: 'hat',
    priority: 1,
  }),
  frota_de_caronte: freezeCosmetic({
    targetGeneratorId: 'charon_servants',
    accessory: 'boat_wake',
    coverage: 0.5,
    layer: 'trail',
    priority: 1,
  }),
  umbras_despertas: freezeCosmetic({
    targetGeneratorId: 'wandering_shade',
    accessory: 'shade_wisp',
    coverage: 0.5,
    layer: 'aura',
    priority: 1,
  }),
  trela_cerberiana: freezeCosmetic({
    targetGeneratorId: 'cerberian_hound',
    accessory: 'hound_chain',
    coverage: 0.5,
    layer: 'shelf_fx',
    priority: 1,
  }),
  tres_cabecas: freezeCosmetic({
    targetGeneratorId: 'cerberian_hound',
    accessory: 'hound_triple_aura',
    coverage: 0.5,
    layer: 'aura',
    priority: 2,
  }),
  veredito_tartaro: freezeCosmetic({
    targetGeneratorId: 'tartarus_judge',
    accessory: 'judge_scale_fx',
    coverage: 0.5,
    layer: 'shelf_fx',
    priority: 1,
  }),

  // --- Bancada (persiste no Lethe) ---
  selo_do_juiz: freezeCosmetic({
    source: 'verdict',
    target: 'reap',
    accessory: 'blade_seal',
    coverage: 1,
    layer: 'blade',
    priority: 4,
  }),
});

export const UPGRADE_COSMETIC_IDS = Object.freeze(Object.keys(UPGRADE_COSMETICS));

/** Accessories P0 (12). */
export const P0_COSMETIC_ACCESSORIES = Object.freeze(
  UPGRADE_COSMETIC_IDS.map((id) => UPGRADE_COSMETICS[id].accessory),
);

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
 * @param {number} index
 * @param {number} coverage
 * @param {number|string} [salt]
 */
export function indexMatchesCoverage(index, coverage, salt = 0) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  const c = Number(coverage);
  if (!Number.isFinite(c) || c <= 0) return false;
  if (c >= 1) return true;
  return coverageHash01(i, salt) < c;
}

/**
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
 * @param {string} sourceId
 */
function normalizeActive(def, sourceId) {
  const target = def.target === 'reap' || def.target === 'altar' ? def.target : null;
  return {
    upgradeId: sourceId,
    sourceId,
    source: def.source === 'verdict' ? 'verdict' : 'upgrade',
    targetGeneratorId: def.targetGeneratorId ? String(def.targetGeneratorId) : null,
    target,
    accessory: String(def.accessory || ''),
    coverage: Number(def.coverage) || 0,
    layer: String(def.layer || 'aura'),
    priority: Number(def.priority) || 0,
  };
}

function layerKey(item) {
  if (item.target === 'reap') return `reap:${item.layer}`;
  if (item.target === 'altar') return `altar:${item.layer}`;
  return `gen:${item.targetGeneratorId || ''}:${item.layer}`;
}

/**
 * Mesma (target, layer) → maior priority; layers distintas empilham.
 * @param {ReturnType<typeof normalizeActive>[]} list
 */
export function resolveCosmeticLayers(list = []) {
  const best = new Map();
  for (const item of list) {
    if (!item?.accessory) continue;
    const key = layerKey(item);
    const prev = best.get(key);
    if (!prev || item.priority >= prev.priority) best.set(key, item);
  }
  return [...best.values()];
}

/**
 * Cosméticos ativos — upgrades owned + compras da Bancada (`source: verdict`).
 * @param {{ upgrades?: string[], verdictPurchases?: string[] }|null|undefined} state
 */
export function activeCosmetics(state) {
  const ownedUpgrades = new Set(
    (Array.isArray(state?.upgrades) ? state.upgrades : []).map((id) => String(id)),
  );
  const ownedVerdicts = new Set(
    (Array.isArray(state?.verdictPurchases) ? state.verdictPurchases : []).map((id) => String(id)),
  );
  const raw = [];
  for (const id of UPGRADE_COSMETIC_IDS) {
    const def = UPGRADE_COSMETICS[id];
    if (!def) continue;
    const source = def.source === 'verdict' ? 'verdict' : 'upgrade';
    if (source === 'verdict') {
      if (!ownedVerdicts.has(id)) continue;
    } else if (!ownedUpgrades.has(id)) {
      continue;
    }
    raw.push(normalizeActive(def, id));
  }
  return resolveCosmeticLayers(raw);
}

/**
 * Filtra cosméticos de prateleira para um gerador (não reap/altar).
 * @param {ReturnType<typeof activeCosmetics>} active
 * @param {string} generatorId
 */
export function cosmeticsForGenerator(active, generatorId) {
  const id = String(generatorId || '');
  return (Array.isArray(active) ? active : []).filter(
    (item) => item.targetGeneratorId === id && !item.target,
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
 * Cosméticos do altar / órbita (`target: 'altar'`).
 * @param {ReturnType<typeof activeCosmetics>} active
 */
export function cosmeticsForAltar(active) {
  return (Array.isArray(active) ? active : []).filter((item) => item.target === 'altar');
}

/**
 * Classes CSS `has-cosmetic-<accessory>` para `#despertar-reap`.
 * @param {{ upgrades?: string[], verdictPurchases?: string[] }|ReturnType<typeof activeCosmetics>|null|undefined} stateOrActive
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
 * @param {{ upgrades?: string[], verdictPurchases?: string[] }|ReturnType<typeof activeCosmetics>|null|undefined} stateOrActive
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
