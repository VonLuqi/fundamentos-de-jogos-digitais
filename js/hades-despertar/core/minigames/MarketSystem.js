/**
 * MarketSystem (Fase F5 — Mercado de Caronte, desbloqueado com `obsidian_throne` Lv.1).
 * Bens atrelados aos geradores com valor de repouso, flutuação periódica e compra/venda em ações.
 */

import { MARKET_GOODS, MARKET_GOOD_BY_ID } from '../../config/minigames.js';
import { cmp, money, mul } from '../decimal.js';

/**
 * Valor de repouso (resting value) de um bem: `baseRestingValue + throneLevel`.
 */
export function calculateGoodRestingValue(goodOrId, throneLevel = 1) {
  const def = typeof goodOrId === 'string' ? MARKET_GOOD_BY_ID[goodOrId] : goodOrId;
  if (!def) return 10;
  const lv = Math.max(1, Math.floor(Number(throneLevel) || 1));
  return Number(def.baseRestingValue || 10) + (lv - 1);
}

/**
 * Capacidade máxima de ações por bem: escala com a quantidade do gerador atrelado e o nível do Trono.
 */
export function calculateGoodMaxStock(goodOrId, generators = {}, throneLevel = 1) {
  const def = typeof goodOrId === 'string' ? MARKET_GOOD_BY_ID[goodOrId] : goodOrId;
  if (!def) return 0;
  const genQty = Math.max(0, Math.floor(Number(generators?.[def.generatorId] || 0)));
  const lv = Math.max(1, Math.floor(Number(throneLevel) || 1));
  return Math.max(10, genQty + lv * 10);
}

export function defaultMarketState(throneLevel = 1) {
  const goods = {};
  for (const g of MARKET_GOODS) {
    const val = calculateGoodRestingValue(g, throneLevel);
    goods[g.id] = {
      id: g.id,
      stock: 0,
      price: val,
      lastDelta: 0,
    };
  }
  return {
    goods,
    totalProfitIndex: 0,
    tradesCount: 0,
  };
}

export function normalizeMarketState(raw = {}, { generators = {}, throneLevel = 1 } = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawGoods = src.goods && typeof src.goods === 'object' ? src.goods : {};
  const goods = {};

  for (const def of MARKET_GOODS) {
    const g = rawGoods[def.id];
    const resting = calculateGoodRestingValue(def, throneLevel);
    const maxStock = calculateGoodMaxStock(def, generators, throneLevel);
    const stock = g && Number.isFinite(Number(g.stock))
      ? Math.max(0, Math.min(maxStock, Math.floor(Number(g.stock))))
      : 0;
    const price = g && Number.isFinite(Number(g.price)) && Number(g.price) >= 1
      ? Number(Number(g.price).toFixed(2))
      : resting;
    const lastDelta = g && Number.isFinite(Number(g.lastDelta))
      ? Number(Number(g.lastDelta).toFixed(2))
      : 0;
    goods[def.id] = {
      id: def.id,
      stock,
      price,
      lastDelta,
    };
  }

  return {
    goods,
    totalProfitIndex: Number.isFinite(Number(src.totalProfitIndex))
      ? Number(Number(src.totalProfitIndex).toFixed(2))
      : 0,
    tradesCount: Math.max(0, Math.floor(Number(src.tradesCount) || 0)),
  };
}

/**
 * Converte o preço de índice de mercado (`price`) e `quantity` para custo em Almas:
 * `max(price, sps) * price * quantity` (em segundos de SPS, com piso para funcionar mesmo com SPS baixo).
 */
export function calculateMarketTradeSouls(price = 10, quantity = 1, sps = '0') {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  if (qty <= 0) return '0.00';
  const unitSps = cmp(sps || '0', '1') >= 0 ? (sps || '1') : '1';
  const unitPrice = mul(unitSps, String(Math.max(1, Number(price) || 1)));
  return money(mul(unitPrice, String(qty)));
}

/**
 * Avança um tick de flutuação de preços no Mercado de Caronte (reversão à média suave).
 */
export function stepMarketTick(marketState, {
  generators = {},
  throneLevel = 1,
  unlocked = true,
  random = Math.random,
} = {}) {
  if (!unlocked || Number(throneLevel) < 1) return marketState;
  const current = normalizeMarketState(marketState, { generators, throneLevel });
  const nextGoods = {};

  for (const def of MARKET_GOODS) {
    const entry = current.goods[def.id];
    const resting = calculateGoodRestingValue(def, throneLevel);
    const pull = (resting - entry.price) * 0.08;
    const noise = ((Number(random()) || 0.5) - 0.5) * 4;
    const delta = Number((pull + noise).toFixed(2));
    const nextPrice = Math.max(1, Number((entry.price + delta).toFixed(2)));
    nextGoods[def.id] = {
      ...entry,
      price: nextPrice,
      lastDelta: Number((nextPrice - entry.price).toFixed(2)),
    };
  }

  return {
    ...current,
    goods: nextGoods,
  };
}

/**
 * Compra ações de um bem no Mercado de Caronte.
 */
export function buyMarketGood(marketState, {
  goodId,
  quantity = 1,
  generators = {},
  throneLevel = 1,
  unlocked = true,
  souls = '0',
  sps = '0',
} = {}) {
  if (!unlocked || Number(throneLevel) < 1) {
    return { ok: false, reason: 'locked', state: marketState };
  }
  const def = MARKET_GOOD_BY_ID[String(goodId || '')];
  if (!def) {
    return { ok: false, reason: 'unknown_good', state: marketState };
  }
  const current = normalizeMarketState(marketState, { generators, throneLevel });
  const entry = current.goods[def.id];
  const maxStock = calculateGoodMaxStock(def, generators, throneLevel);
  const room = Math.max(0, maxStock - entry.stock);
  const qty = Math.min(room, Math.max(0, Math.floor(Number(quantity) || 0)));
  if (qty <= 0) {
    return { ok: false, reason: 'stock_full', state: current };
  }

  const totalSoulsCost = calculateMarketTradeSouls(entry.price, qty, sps);
  if (cmp(souls || '0', totalSoulsCost) < 0) {
    return { ok: false, reason: 'insufficient_souls', cost: totalSoulsCost, state: current };
  }

  const nextGoods = {
    ...current.goods,
    [def.id]: {
      ...entry,
      stock: entry.stock + qty,
    },
  };

  return {
    ok: true,
    goodId: def.id,
    bought: qty,
    price: entry.price,
    cost: totalSoulsCost,
    state: {
      ...current,
      goods: nextGoods,
      tradesCount: current.tradesCount + 1,
    },
  };
}

/**
 * Vende ações de um bem no Mercado de Caronte.
 */
export function sellMarketGood(marketState, {
  goodId,
  quantity = 1,
  generators = {},
  throneLevel = 1,
  unlocked = true,
  sps = '0',
} = {}) {
  if (!unlocked || Number(throneLevel) < 1) {
    return { ok: false, reason: 'locked', state: marketState };
  }
  const def = MARKET_GOOD_BY_ID[String(goodId || '')];
  if (!def) {
    return { ok: false, reason: 'unknown_good', state: marketState };
  }
  const current = normalizeMarketState(marketState, { generators, throneLevel });
  const entry = current.goods[def.id];
  const qty = Math.min(entry.stock, Math.max(0, Math.floor(Number(quantity) || 0)));
  if (qty <= 0) {
    return { ok: false, reason: 'no_stock', state: current };
  }

  const resting = calculateGoodRestingValue(def, throneLevel);
  const revenue = calculateMarketTradeSouls(entry.price, qty, sps);
  const profitDelta = Number(((entry.price - resting) * qty).toFixed(2));

  const nextGoods = {
    ...current.goods,
    [def.id]: {
      ...entry,
      stock: entry.stock - qty,
    },
  };

  return {
    ok: true,
    goodId: def.id,
    sold: qty,
    price: entry.price,
    revenue,
    profitDelta,
    state: {
      ...current,
      goods: nextGoods,
      totalProfitIndex: Number((current.totalProfitIndex + profitDelta).toFixed(2)),
      tradesCount: current.tradesCount + 1,
    },
  };
}
