/**
 * Cosméticos de upgrade / Bancada → sprites / Foice / altar (Fase E).
 * Base (Foice/altar/Bancada) + 300 juramentos de linha (15×20), 1 accessory por marco.
 */

import { UPGRADES, getUpgrade } from './upgrades.js';

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

/** Accessories com WebP entregue (prefetch / art P0). */
export const P0_COSMETIC_ACCESSORIES = Object.freeze([
  'blade_glow',
  'blade_runes',
  'reap_ripple',
  'blade_ember',
  'orbit_halo',
  'hat_charon',
  'boat_wake',
  'shade_wisp',
  'hound_chain',
  'hound_triple_aura',
  'judge_scale_fx',
  'blade_seal',
]);

/** Alias dos 6 cosméticos de gerador já pixelados (não trocar id do accessory). */
export const LEGACY_GENERATOR_COSMETIC_ALIAS = Object.freeze({
  moeda_no_barquinho: Object.freeze({ accessory: 'hat_charon', layer: 'hat', coverage: 0.5 }),
  frota_de_caronte: Object.freeze({ accessory: 'boat_wake', layer: 'trail', coverage: 0.5 }),
  umbras_despertas: Object.freeze({ accessory: 'shade_wisp', layer: 'aura', coverage: 0.5 }),
  trela_cerberiana: Object.freeze({ accessory: 'hound_chain', layer: 'shelf_fx', coverage: 0.5 }),
  tres_cabecas: Object.freeze({ accessory: 'hound_triple_aura', layer: 'aura', coverage: 0.5 }),
  veredito_tartaro: Object.freeze({ accessory: 'judge_scale_fx', layer: 'shelf_fx', coverage: 0.5 }),
});

/** Foice / altar / Bancada — fora da malha 15×20. */
const BASE_COSMETICS = Object.freeze({
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
  selo_do_juiz: freezeCosmetic({
    source: 'verdict',
    target: 'reap',
    accessory: 'blade_seal',
    coverage: 1,
    layer: 'blade',
    priority: 4,
  }),
});

/**
 * Coverage 0.35 → 1.0 ao longo dos 15 marcos.
 * @param {number} tierIndex 1..15
 */
export function lineCosmeticCoverage(tierIndex) {
  const t = Math.max(1, Math.min(15, Math.floor(Number(tierIndex) || 1)));
  return 0.35 + ((t - 1) / 14) * 0.65;
}

/**
 * @param {readonly { id: string, kind?: string, generatorId?: string, requires?: { quantity?: number } }[]} [upgrades]
 * @returns {Record<string, UpgradeCosmeticDef>}
 */
export function buildGeneratorLineCosmetics(upgrades = UPGRADES) {
  /** @type {Map<string, typeof upgrades>} */
  const byGen = new Map();
  for (const up of upgrades) {
    if (!up || up.kind !== 'generatorMult' || !up.generatorId || !up.id) continue;
    const list = byGen.get(up.generatorId) || [];
    list.push(up);
    byGen.set(up.generatorId, list);
  }

  /** @type {Record<string, UpgradeCosmeticDef>} */
  const out = {};
  for (const [generatorId, list] of byGen) {
    list.sort((a, b) => {
      const qa = Number(a.requires?.quantity) || 0;
      const qb = Number(b.requires?.quantity) || 0;
      if (qa !== qb) return qa - qb;
      return String(a.id).localeCompare(String(b.id));
    });
    list.forEach((up, index) => {
      const tierIndex = index + 1;
      const alias = LEGACY_GENERATOR_COSMETIC_ALIAS[up.id];
      const accessory = alias?.accessory || up.id;
      const layer = alias?.layer || 'aura';
      const coverage = alias && Number.isFinite(Number(alias.coverage))
        ? Number(alias.coverage)
        : lineCosmeticCoverage(tierIndex);
      out[up.id] = freezeCosmetic({
        targetGeneratorId: generatorId,
        accessory,
        coverage,
        layer,
        priority: tierIndex,
      });
    });
  }
  return out;
}

const LINE_COSMETICS = buildGeneratorLineCosmetics(UPGRADES);

/** @type {Readonly<Record<string, UpgradeCosmeticDef>>} */
export const UPGRADE_COSMETICS = Object.freeze({
  ...BASE_COSMETICS,
  ...LINE_COSMETICS,
});

export const UPGRADE_COSMETIC_IDS = Object.freeze(Object.keys(UPGRADE_COSMETICS));

/** Ids de upgrade de linha com cosmético (300). */
export const GENERATOR_LINE_COSMETIC_IDS = Object.freeze(Object.keys(LINE_COSMETICS));

/**
 * @param {string} upgradeId
 * @returns {UpgradeCosmeticDef|null}
 */
export function cosmeticForUpgrade(upgradeId) {
  const id = String(upgradeId || '');
  return UPGRADE_COSMETICS[id] || null;
}

/**
 * Rótulo amigável do accessory (nome do upgrade que o libera, ou o id).
 * @param {string} accessory
 * @returns {string}
 */
export function cosmeticLabel(accessory) {
  const acc = String(accessory || '');
  if (!acc) return '';
  for (const [upgradeId, alias] of Object.entries(LEGACY_GENERATOR_COSMETIC_ALIAS)) {
    if (alias.accessory === acc) {
      return getUpgrade(upgradeId)?.name || acc;
    }
  }
  const fromUpgrade = getUpgrade(acc);
  if (fromUpgrade?.name) return fromUpgrade.name;
  for (const id of UPGRADE_COSMETIC_IDS) {
    const def = UPGRADE_COSMETICS[id];
    if (def?.accessory === acc) {
      return getUpgrade(id)?.name || acc;
    }
  }
  return acc;
}

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
 * Uma variação por unidade (estilo avó): o cosmético de maior prioridade
 * que cobre o índice. Empate fica com o último da lista.
 * @param {Array<{ accessory?: string, coverage?: number, priority?: number, upgradeId?: string }>} cosmetics
 * @param {number} index
 * @param {(cos: object) => boolean} [accept]
 */
export function pickCoveredCosmetic(cosmetics, index, accept = null) {
  let chosen = null;
  for (const cos of cosmetics || []) {
    if (!cos?.accessory) continue;
    if (accept && !accept(cos)) continue;
    const salt = cos.upgradeId || cos.accessory || 0;
    if (!indexMatchesCoverage(index, cos.coverage, salt)) continue;
    if (!chosen || (Number(cos.priority) || 0) >= (Number(chosen.priority) || 0)) {
      chosen = cos;
    }
  }
  return chosen;
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
