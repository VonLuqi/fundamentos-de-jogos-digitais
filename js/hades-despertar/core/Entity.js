/**
 * Unidade de gerador — evolução ES-Module de Aldo111 Entity.
 * UpgradeMult NÃO vive aqui: o estado (juramentos) passa o multiplicador.
 */

import { GENERATOR_COST_MULT_BASE } from '../config/constants.js';
import { getGenerator } from '../config/generators.js';
import { cmp, money, mul, sub } from './decimal.js';
import {
  generatorBatchCost,
  generatorPriceAt,
  maxAffordableCount,
} from './formulas.js';

function asQuantity(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 0) return 0;
  return qty;
}

export class Entity {
  constructor(def = {}) {
    const catalog = def.id && !def.baseCost ? getGenerator(def.id) : null;
    const src = catalog ? { ...catalog, ...def } : def;
    this.id = src.id;
    this.tier = src.tier ?? null;
    this.name = src.name ?? src.id;
    this.blurb = src.blurb ?? '';
    this.baseCost = String(src.baseCost ?? '0');
    this.baseRate = String(src.baseRate ?? '0');
    this.multiplier = String(src.multiplier ?? '1.15');
    this.quantity = asQuantity(src.quantity);
  }

  priceAt(n, costMult = GENERATOR_COST_MULT_BASE) {
    return generatorPriceAt(this.baseCost, n, costMult);
  }

  nextPrice(costMult = GENERATOR_COST_MULT_BASE) {
    return this.priceAt(this.quantity, costMult);
  }

  batchCost(count, costMult = GENERATOR_COST_MULT_BASE) {
    return generatorBatchCost(this.baseCost, this.quantity, count, costMult);
  }

  maxAffordable(wallet, costMult = GENERATOR_COST_MULT_BASE) {
    return maxAffordableCount(this.baseCost, this.quantity, wallet, costMult);
  }

  unitRate(upgradeMult = '1') {
    return mul(this.baseRate, upgradeMult);
  }

  rate(upgradeMult = '1') {
    if (this.quantity <= 0) return '0';
    return mul(mul(String(this.quantity), this.baseRate), upgradeMult);
  }

  buy(count, wallet, costMult = GENERATOR_COST_MULT_BASE) {
    const qty = Math.floor(Number(count) || 0);
    if (qty <= 0) {
      return { ok: false, wallet: money(wallet), cost: money('0'), bought: 0 };
    }
    const cost = this.batchCost(qty, costMult);
    if (cmp(wallet, cost) < 0) {
      return { ok: false, wallet: money(wallet), cost, bought: 0 };
    }
    this.quantity += qty;
    return {
      ok: true,
      wallet: money(sub(wallet, cost)),
      cost,
      bought: qty,
    };
  }
}
