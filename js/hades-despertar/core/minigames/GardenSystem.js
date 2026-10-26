/**
 * GardenSystem (Fase F5 — Jardim de Perséfone, desbloqueado com `cerberian_hound` Lv.1).
 * Grelha de cultivo (2x2 a 6x6 conforme nível), solos, plantio em minutos de SPS e bônus passivos.
 */

import {
  GARDEN_SEEDS,
  GARDEN_SEED_BY_ID,
  GARDEN_SOIL_BY_ID,
  gardenDimensionsForLevel,
} from '../../config/minigames.js';
import { add, cmp, money, mul } from '../decimal.js';

export function defaultGardenState(houndLevel = 1) {
  const { rows, cols } = gardenDimensionsForLevel(houndLevel);
  return {
    soilId: 'barro_acheron',
    rows,
    cols,
    plots: Array.from({ length: rows * cols }, () => null),
    tickProgressSec: 0,
    harvestedPlants: 0,
  };
}

export function normalizeGardenState(raw = {}, { houndLevel = 1 } = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const { rows, cols } = gardenDimensionsForLevel(Math.max(1, houndLevel || 1));
  const totalPlots = rows * cols;
  const soilId = GARDEN_SOIL_BY_ID[src.soilId] ? src.soilId : 'barro_acheron';
  const rawPlots = Array.isArray(src.plots) ? src.plots : [];

  const plots = [];
  for (let i = 0; i < totalPlots; i += 1) {
    const p = rawPlots[i];
    if (p && typeof p === 'object' && GARDEN_SEED_BY_ID[p.seedId]) {
      const def = GARDEN_SEED_BY_ID[p.seedId];
      const ageTicks = Math.max(0, Math.floor(Number(p.ageTicks) || 0));
      if (ageTicks < def.lifespanTicks) {
        plots.push({
          seedId: def.id,
          ageTicks,
          mature: ageTicks >= def.matureTicks,
        });
        continue;
      }
    }
    plots.push(null);
  }

  return {
    soilId,
    rows,
    cols,
    plots,
    tickProgressSec: Math.max(0, Number(src.tickProgressSec) || 0),
    harvestedPlants: Math.max(0, Math.floor(Number(src.harvestedPlants) || 0)),
  };
}

/**
 * Calcula o custo em almas para plantar uma semente: `max(minCostSouls, sps * costSpsSeconds)`.
 */
export function calculateSeedPlantCost(seedOrId, sps = '0') {
  const def = typeof seedOrId === 'string' ? GARDEN_SEED_BY_ID[seedOrId] : seedOrId;
  if (!def) return '0.00';
  const spsCost = mul(sps || '0', def.costSpsSeconds || '60');
  const raw = cmp(spsCost, def.minCostSouls || '100') >= 0 ? spsCost : (def.minCostSouls || '100');
  return money(raw);
}

/**
 * Planta uma semente num plot `[0..rows*cols-1]`.
 */
export function plantGardenSeed(gardenState, {
  plotIndex,
  seedId,
  houndLevel = 1,
  unlocked = true,
  sps = '0',
} = {}) {
  if (!unlocked || Number(houndLevel) < 1) {
    return { ok: false, reason: 'locked', state: gardenState };
  }
  const def = GARDEN_SEED_BY_ID[String(seedId || '')];
  if (!def) {
    return { ok: false, reason: 'unknown_seed', state: gardenState };
  }

  const current = normalizeGardenState(gardenState, { houndLevel });
  const idx = Math.floor(Number(plotIndex));
  if (!Number.isFinite(idx) || idx < 0 || idx >= current.plots.length) {
    return { ok: false, reason: 'invalid_plot', state: current };
  }
  if (current.plots[idx] !== null) {
    return { ok: false, reason: 'plot_occupied', state: current };
  }

  const cost = calculateSeedPlantCost(def, sps);
  const nextPlots = [...current.plots];
  nextPlots[idx] = {
    seedId: def.id,
    ageTicks: 0,
    mature: false,
  };

  return {
    ok: true,
    cost,
    seed: def,
    plotIndex: idx,
    state: {
      ...current,
      plots: nextPlots,
    },
  };
}

/**
 * Colhe ou limpa um plot do Jardim.
 */
export function harvestGardenPlot(gardenState, {
  plotIndex,
  houndLevel = 1,
  unlocked = true,
} = {}) {
  if (!unlocked || Number(houndLevel) < 1) {
    return { ok: false, reason: 'locked', state: gardenState };
  }
  const current = normalizeGardenState(gardenState, { houndLevel });
  const idx = Math.floor(Number(plotIndex));
  if (!Number.isFinite(idx) || idx < 0 || idx >= current.plots.length) {
    return { ok: false, reason: 'invalid_plot', state: current };
  }
  const existing = current.plots[idx];
  if (!existing) {
    return { ok: false, reason: 'empty_plot', state: current };
  }

  const nextPlots = [...current.plots];
  nextPlots[idx] = null;
  const wasMature = Boolean(existing.mature);

  return {
    ok: true,
    wasMature,
    seedId: existing.seedId,
    state: {
      ...current,
      plots: nextPlots,
      harvestedPlants: current.harvestedPlants + (wasMature ? 1 : 0),
    },
  };
}

/**
 * Troca o solo ativo do Jardim (respeitando requisito mínimo de Cães Cerberianos).
 */
export function selectGardenSoil(gardenState, {
  soilId,
  houndQty = 0,
  houndLevel = 1,
  unlocked = true,
} = {}) {
  if (!unlocked || Number(houndLevel) < 1) {
    return { ok: false, reason: 'locked', state: gardenState };
  }
  const soil = GARDEN_SOIL_BY_ID[String(soilId || '')];
  if (!soil) {
    return { ok: false, reason: 'unknown_soil', state: gardenState };
  }
  if (Number(houndQty || 0) < Number(soil.minHounds || 1)) {
    return { ok: false, reason: 'insufficient_hounds', state: gardenState };
  }
  const current = normalizeGardenState(gardenState, { houndLevel });
  return {
    ok: true,
    soil,
    state: {
      ...current,
      soilId: soil.id,
      tickProgressSec: 0,
    },
  };
}

/**
 * Avança `ticks` ciclos de maturação do Jardim (ou acumula `dtSeconds` até completar um tick de solo).
 */
export function stepGardenTicks(gardenState, {
  ticks = 1,
  houndLevel = 1,
  unlocked = true,
} = {}) {
  if (!unlocked || Number(houndLevel) < 1) return gardenState;
  const current = normalizeGardenState(gardenState, { houndLevel });
  const nTicks = Math.max(0, Math.floor(Number(ticks) || 0));
  if (nTicks <= 0) return current;

  let nextPlots = [...current.plots];
  for (let t = 0; t < nTicks; t += 1) {
    nextPlots = nextPlots.map((cell) => {
      if (!cell) return null;
      const def = GARDEN_SEED_BY_ID[cell.seedId];
      if (!def) return null;
      const nextAge = cell.ageTicks + 1;
      if (nextAge >= def.lifespanTicks) {
        return null; // Planta murcha após o ciclo de vida
      }
      return {
        seedId: def.id,
        ageTicks: nextAge,
        mature: nextAge >= def.matureTicks,
      };
    });
  }

  return {
    ...current,
    plots: nextPlots,
  };
}

/**
 * Calcula os multiplicadores passivos de todas as plantas maduras no Jardim,
 * modulados pela eficiência do Solo ativo (`passiveEffMult`).
 */
export function gardenModifiers(gardenState, { unlocked = true, houndLevel = 1 } = {}) {
  if (!unlocked || Number(houndLevel) < 1 || !gardenState || typeof gardenState !== 'object') {
    return { spsMult: '1', clickMult: '1', shimmerLuckMult: 1, matureCount: 0 };
  }
  const current = normalizeGardenState(gardenState, { houndLevel });
  const soil = GARDEN_SOIL_BY_ID[current.soilId] || GARDEN_SOIL_BY_ID.barro_acheron;
  const soilMult = soil.passiveEffMult || '1';

  let spsBonusSum = '0';
  let clickBonusSum = '0';
  let shimmerLuckBonus = 0;
  let matureCount = 0;

  for (const cell of current.plots) {
    if (!cell || !cell.mature) continue;
    const def = GARDEN_SEED_BY_ID[cell.seedId];
    if (!def) continue;
    matureCount += 1;
    if (cmp(def.spsBonusPerPlot || '0', '0') > 0) {
      spsBonusSum = add(spsBonusSum, mul(def.spsBonusPerPlot, soilMult));
    }
    if (cmp(def.clickBonusPerPlot || '0', '0') > 0) {
      clickBonusSum = add(clickBonusSum, mul(def.clickBonusPerPlot, soilMult));
    }
    if (Number(def.shimmerLuckPerPlot) > 0) {
      shimmerLuckBonus += Number(def.shimmerLuckPerPlot) * Number(soilMult);
    }
  }

  return {
    spsMult: add('1', spsBonusSum),
    clickMult: add('1', clickBonusSum),
    shimmerLuckMult: 1 + shimmerLuckBonus,
    matureCount,
  };
}
