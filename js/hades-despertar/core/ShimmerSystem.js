/**
 * ShimmerSystem (Fase F2 — Eco do Acheron).
 * Responsabilidades isoladas (SRP):
 * 1. Sorteio de intervalo de spawn (7–12 min base, com modificador de sorte).
 * 2. Sorteio do efeito na tabela de rolls (bloqueando Wrath quando Catábase está inativa).
 * 3. Criação do objeto `shimmer` clicável e resolução do efeito ao clicar.
 * 4. Gestão de `activeBuffs` (renovação de duração, cap de overlap e poda de expirados).
 */

import { GENERATORS } from '../config/generators.js';
import { wrathProbabilityForStage } from '../config/catabase.js';
import {
  SHIMMER_BY_ID,
  SHIMMER_CONFIG,
  SHIMMER_EFFECTS,
  getShimmerEffect,
  isBuffShimmerEffect,
  isKnownShimmerId,
} from '../config/shimmers.js';
import {
  buildingSpecialMultFromQty,
  calculateLuckyReward,
} from './formulas.js';

/**
 * Calcula o atraso até o próximo Eco (em segundos).
 * @param {() => number} [random]
 * @param {{ minSec?: number, maxSec?: number, luckMult?: number }} [opts]
 */
export function rollNextShimmerDelaySec(random = Math.random, opts = {}) {
  const minSec = Number.isFinite(Number(opts.minSec))
    ? Math.max(1, Number(opts.minSec))
    : SHIMMER_CONFIG.spawnMinSec;
  const maxSec = Number.isFinite(Number(opts.maxSec))
    ? Math.max(minSec, Number(opts.maxSec))
    : SHIMMER_CONFIG.spawnMaxSec;
  const luckMult = Number.isFinite(Number(opts.luckMult)) && Number(opts.luckMult) > 0
    ? Number(opts.luckMult)
    : 1;
  const r = Math.min(1, Math.max(0, Number(random()) || 0));
  const raw = minSec + r * (maxSec - minSec);
  return raw / luckMult;
}

/**
 * Filtra os efeitos elegíveis da pool de Ecos.
 * Quando `catabaseActive === false`, efeitos com `requiresCatabase: true` (Wrath) são bloqueados.
 * @param {{ catabaseActive?: boolean, variant?: 'golden'|'wrath'|null }} [opts]
 */
export function eligibleShimmerEffects(opts = {}) {
  const catabaseActive = Boolean(opts.catabaseActive);
  const dragonflightActive = Boolean(opts.dragonflightActive);
  const variant = opts.variant || null;
  return SHIMMER_EFFECTS.filter((effect) => {
    if (effect.manualOnly || Number(effect.weight) <= 0) return false;
    if (effect.requiresCatabase && !catabaseActive) return false;
    if (effect.requiresDragonflight && !dragonflightActive) return false;
    if (variant && effect.variant !== variant) return false;
    return true;
  });
}

/**
 * Sorteia um efeito elegível por peso (`weight`).
 * @param {{ catabaseActive?: boolean, dragonflightActive?: boolean, variant?: 'golden'|'wrath'|null, random?: () => number, forceEffectId?: string }} [opts]
 */
export function rollShimmerEffect(opts = {}) {
  const catabaseActive = Boolean(opts.catabaseActive);
  const dragonflightActive = Boolean(opts.dragonflightActive);
  if (opts.forceEffectId) {
    const forced = getShimmerEffect(opts.forceEffectId);
    if (
      forced
      && (!forced.requiresCatabase || catabaseActive)
      && (!forced.requiresDragonflight || dragonflightActive)
    ) {
      return forced;
    }
  }
  const pool = eligibleShimmerEffects({
    catabaseActive,
    dragonflightActive,
    variant: opts.variant || null,
  });
  if (!pool.length) return SHIMMER_EFFECTS[0];
  const random = typeof opts.random === 'function' ? opts.random : Math.random;
  const totalWeight = pool.reduce((acc, item) => acc + Math.max(1, Number(item.weight) || 1), 0);
  let target = Math.min(0.999999, Math.max(0, Number(random()) || 0)) * totalWeight;
  for (const item of pool) {
    const w = Math.max(1, Number(item.weight) || 1);
    if (target < w) return item;
    target -= w;
  }
  return pool[pool.length - 1];
}

/**
 * Cria uma instância de `shimmer` ativa na tela.
 * Na Fase F6, quando `catabaseStage >= 1` e `variant` não for forçado, sorteia a variante
 * Colérica (`wrath`) com probabilidade `33%` (estágio 1), `66%` (estágio 2) ou `100%` (estágio 3).
 * @param {{
 *   nowMs?: number,
 *   catabaseActive?: boolean,
 *   catabaseStage?: number,
 *   effectId?: string,
 *   variant?: 'golden'|'wrath'|null,
 *   lifetimeSec?: number,
 *   random?: () => number,
 *   x?: number,
 *   y?: number,
 * }} [opts]
 */
export function createShimmerInstance(opts = {}) {
  const random = typeof opts.random === 'function' ? opts.random : Math.random;
  const nowMs = Number.isFinite(Number(opts.nowMs)) ? Math.floor(Number(opts.nowMs)) : Date.now();
  const stage = Number.isFinite(Number(opts.catabaseStage))
    ? Math.max(0, Math.min(3, Math.floor(Number(opts.catabaseStage))))
    : 0;
  const catabaseActive = Boolean(opts.catabaseActive || stage >= 1);

  let chosenVariant = opts.variant || null;
  if (!chosenVariant && !opts.effectId && stage >= 1 && catabaseActive) {
    const wrathProb = wrathProbabilityForStage(stage);
    chosenVariant = Number(random()) < wrathProb ? 'wrath' : 'golden';
  }

  const effect = rollShimmerEffect({
    catabaseActive,
    dragonflightActive: Boolean(opts.dragonflightActive),
    variant: chosenVariant,
    forceEffectId: opts.effectId,
    random,
  });
  const lifetimeSec = Number.isFinite(Number(opts.lifetimeSec)) && Number(opts.lifetimeSec) > 0
    ? Number(opts.lifetimeSec)
    : SHIMMER_CONFIG.lifetimeSec;
  const x = Number.isFinite(Number(opts.x))
    ? Math.min(0.88, Math.max(0.12, Number(opts.x)))
    : Number((0.18 + random() * 0.64).toFixed(3));
  const y = Number.isFinite(Number(opts.y))
    ? Math.min(0.86, Math.max(0.14, Number(opts.y)))
    : Number((0.18 + random() * 0.62).toFixed(3));

  return {
    id: `shimmer_${nowMs}_${effect.id}`,
    kind: effect.id,
    variant: effect.variant,
    spriteId: effect.spriteId,
    spawnedAt: nowMs,
    expiresAt: nowMs + Math.round(lifetimeSec * 1000),
    x,
    y,
  };
}

/**
 * Normaliza um objeto `shimmer` vindo de snapshot.
 */
export function normalizeShimmerInstance(raw, opts = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = String(raw.kind ?? raw.effectId ?? '');
  const def = getShimmerEffect(kind);
  if (!def) return null;
  if (def.requiresCatabase && !opts.catabaseActive) return null;
  const spawnedAt = Math.floor(Number(raw.spawnedAt) || 0);
  const expiresAt = Math.floor(Number(raw.expiresAt) || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0 || expiresAt <= spawnedAt) return null;
  if (opts.nowMs != null && Number.isFinite(Number(opts.nowMs)) && expiresAt <= Number(opts.nowMs)) {
    return null;
  }
  return {
    id: String(raw.id || `shimmer_${spawnedAt}_${def.id}`),
    kind: def.id,
    variant: def.variant,
    spriteId: def.spriteId,
    spawnedAt,
    expiresAt,
    x: Number.isFinite(Number(raw.x)) ? Math.min(0.9, Math.max(0.1, Number(raw.x))) : 0.5,
    y: Number.isFinite(Number(raw.y)) ? Math.min(0.9, Math.max(0.1, Number(raw.y))) : 0.5,
  };
}

/**
 * Normaliza e sanitiza o mapa `activeBuffs`, aplicando:
 * - Rejeição/remoção de IDs desconhecidos ou não-buff
 * - Bloqueio de buffs Wrath quando `catabaseActive === false`
 * - Remoção de buffs já expirados em `nowMs`
 * - Cap de sobreposição (`SHIMMER_CONFIG.maxActiveBuffs`)
 */
export function normalizeActiveBuffs(raw, opts = {}) {
  if (!raw || typeof raw !== 'object') return {};
  const nowMs = opts.nowMs != null && Number.isFinite(Number(opts.nowMs))
    ? Math.floor(Number(opts.nowMs))
    : null;
  const catabaseActive = Boolean(opts.catabaseActive);
  const maxBuffs = Number.isFinite(Number(opts.maxBuffs))
    ? Math.max(1, Math.floor(Number(opts.maxBuffs)))
    : SHIMMER_CONFIG.maxActiveBuffs;

  const entries = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([key, val]) => (val && typeof val === 'object' ? { id: val.id || key, ...val } : null));

  const valid = [];
  const seen = new Set();
  for (const item of entries) {
    if (!item || typeof item !== 'object') continue;
    const id = String(item.id ?? '');
    if (!id || seen.has(id) || !isKnownShimmerId(id) || !isBuffShimmerEffect(id)) continue;
    const def = SHIMMER_BY_ID[id];
    if (def.requiresCatabase && !catabaseActive) continue;

    const expiresAt = Math.floor(Number(item.expiresAt) || 0);
    const startedAt = Math.floor(Number(item.startedAt) || (expiresAt - def.durationSec * 1000));
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) continue;
    if (nowMs != null && expiresAt <= nowMs) continue;

    const maxDurationMs = Math.round(def.durationSec * 1000) + SHIMMER_CONFIG.syncToleranceMs;
    const cappedExpiresAt = nowMs != null
      ? Math.min(expiresAt, nowMs + maxDurationMs)
      : expiresAt;

    let mult = def.factor || '1';
    if (def.kind === 'buildingSpecial') {
      mult = item.mult != null ? String(item.mult) : '2';
    }

    seen.add(id);
    valid.push({
      id,
      name: def.name,
      kind: def.kind,
      variant: def.variant,
      mult,
      startedAt,
      expiresAt: cappedExpiresAt,
      durationSec: def.durationSec,
      ...(item.generatorId ? { generatorId: String(item.generatorId) } : {}),
    });
  }

  valid.sort((a, b) => b.expiresAt - a.expiresAt);
  const capped = valid.slice(0, maxBuffs);
  const out = {};
  for (const b of capped) {
    out[b.id] = b;
  }
  return out;
}

/**
 * Remove buffs expirados do mapa `activeBuffs`.
 * @returns {{ nextBuffs: Record<string, object>, changed: boolean, expiredIds: string[] }}
 */
export function pruneExpiredBuffs(activeBuffs = {}, nowMs = Date.now()) {
  if (!activeBuffs || typeof activeBuffs !== 'object') {
    return { nextBuffs: {}, changed: false, expiredIds: [] };
  }
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const nextBuffs = {};
  const expiredIds = [];
  let changed = false;

  for (const [key, buff] of Object.entries(activeBuffs)) {
    if (!buff || typeof buff !== 'object') {
      changed = true;
      continue;
    }
    const id = String(buff.id || key);
    if (!isKnownShimmerId(id) || Number(buff.expiresAt) <= now) {
      expiredIds.push(id);
      changed = true;
      continue;
    }
    nextBuffs[id] = buff;
  }

  return { nextBuffs, changed, expiredIds };
}

/**
 * Ativa ou renova um buff no mapa `activeBuffs`, respeitando o cap de sobreposição.
 */
export function activateOrRenewBuff(activeBuffs = {}, buffSpec, nowMs = Date.now()) {
  const def = getShimmerEffect(buffSpec?.id);
  if (!def || !isBuffShimmerEffect(def)) {
    return { nextBuffs: { ...(activeBuffs || {}) }, activated: null, changed: false };
  }
  const now = Math.floor(Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now());
  const durationSec = Number.isFinite(Number(buffSpec.durationSec)) && Number(buffSpec.durationSec) > 0
    ? Number(buffSpec.durationSec)
    : def.durationSec;
  const durationMs = Math.round(durationSec * 1000);
  const mult = buffSpec.mult != null ? String(buffSpec.mult) : String(def.factor || '1');

  const { nextBuffs: pruned } = pruneExpiredBuffs(activeBuffs, now);
  const next = { ...pruned };

  const entry = {
    id: def.id,
    name: def.name,
    kind: def.kind,
    variant: def.variant,
    mult,
    startedAt: now,
    expiresAt: now + durationMs,
    durationSec,
    ...(buffSpec.generatorId ? { generatorId: String(buffSpec.generatorId) } : {}),
  };

  next[def.id] = entry;

  const keys = Object.keys(next);
  if (keys.length > SHIMMER_CONFIG.maxActiveBuffs) {
    const sorted = Object.values(next).sort((a, b) => b.expiresAt - a.expiresAt);
    const trimmed = {};
    for (const item of sorted.slice(0, SHIMMER_CONFIG.maxActiveBuffs)) {
      trimmed[item.id] = item;
    }
    return { nextBuffs: trimmed, activated: trimmed[def.id] || entry, changed: true };
  }

  return { nextBuffs: next, activated: entry, changed: true };
}

/**
 * Resolve o clique em um `shimmer` e retorna a descrição da recompensa/buff.
 */
export function resolveShimmerClickEffect({
  shimmer,
  souls = '0',
  sps = '0',
  generators = {},
  activeBuffs = {},
  nowMs = Date.now(),
  random = Math.random,
} = {}) {
  const def = getShimmerEffect(shimmer?.kind || shimmer?.id);
  if (!def) {
    return { ok: false, reason: 'unknown_shimmer' };
  }

  if (def.kind === 'instantLucky') {
    const gained = calculateLuckyReward({ souls, sps });
    return {
      ok: true,
      effectId: def.id,
      effectName: def.name,
      kind: def.kind,
      variant: def.variant,
      gained,
      verdictsGained: 0,
      buff: null,
      nextBuffs: { ...(activeBuffs || {}) },
      buffChanged: false,
    };
  }

  if (def.kind === 'buildingSpecial') {
    const minQty = Number(def.minGeneratorQty) || 10;
    const eligible = GENERATORS.filter((g) => Number(generators?.[g.id] || 0) >= minQty);
    const verdictsGained = Math.max(0, Number(def.verdictsGain) || 1);
    if (eligible.length > 0) {
      const idx = Math.min(eligible.length - 1, Math.max(0, Math.floor((Number(random()) || 0) * eligible.length)));
      const pickedGen = eligible[idx];
      const qty = Math.floor(Number(generators?.[pickedGen.id] || 0));
      const mult = buildingSpecialMultFromQty(qty);
      const { nextBuffs, activated, changed } = activateOrRenewBuff(
        activeBuffs,
        {
          id: def.id,
          mult,
          durationSec: def.durationSec,
          generatorId: pickedGen.id,
        },
        nowMs,
      );
      return {
        ok: true,
        effectId: def.id,
        effectName: def.name,
        kind: def.kind,
        variant: def.variant,
        gained: '0.00',
        verdictsGained,
        buff: activated,
        nextBuffs,
        buffChanged: changed,
      };
    }

    return {
      ok: true,
      effectId: def.id,
      effectName: def.name,
      kind: def.kind,
      variant: def.variant,
      gained: '0.00',
      verdictsGained,
      buff: null,
      nextBuffs: { ...(activeBuffs || {}) },
      buffChanged: false,
    };
  }

  const { nextBuffs, activated, changed } = activateOrRenewBuff(
    activeBuffs,
    {
      id: def.id,
      mult: def.factor,
      durationSec: def.durationSec,
    },
    nowMs,
  );
  return {
    ok: true,
    effectId: def.id,
    effectName: def.name,
    kind: def.kind,
    variant: def.variant,
    gained: '0.00',
    verdictsGained: 0,
    buff: activated,
    nextBuffs,
    buffChanged: changed,
  };
}
