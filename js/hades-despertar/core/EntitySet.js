/**
 * Coleção de geradores — evolução ES-Module de Aldo111 EntitySet.
 */

import { GENERATOR_COST_MULT_BASE } from '../config/constants.js';
import { GENERATORS } from '../config/generators.js';
import { add } from './decimal.js';
import { Entity } from './Entity.js';

export class EntitySet {
  constructor(entities = []) {
    this.items = new Map();
    for (const entity of entities) this.add(entity);
  }

  static fromCatalog(quantities = {}) {
    const entities = GENERATORS.map((def) => new Entity({
      ...def,
      quantity: quantities[def.id] || 0,
    }));
    return new EntitySet(entities);
  }

  add(entity) {
    const item = entity instanceof Entity ? entity : new Entity(entity);
    this.items.set(item.id, item);
    return item;
  }

  get(id) {
    return this.items.get(id) ?? null;
  }

  get size() {
    return this.items.size;
  }

  [Symbol.iterator]() {
    return this.items.values();
  }

  quantities() {
    const out = {};
    for (const entity of this.items.values()) {
      if (entity.quantity > 0) out[entity.id] = entity.quantity;
    }
    return out;
  }

  applyQuantities(quantities = {}) {
    for (const entity of this.items.values()) {
      entity.quantity = Number(quantities[entity.id] || 0) || 0;
    }
  }

  buy(id, count, wallet, costMult = GENERATOR_COST_MULT_BASE) {
    const entity = this.get(id);
    if (!entity) {
      return { ok: false, wallet, cost: '0.00', bought: 0 };
    }
    return entity.buy(count, wallet, costMult);
  }

  totalRate(upgradeMultById = {}) {
    let sum = '0';
    for (const entity of this.items.values()) {
      const upgradeMult = upgradeMultById[entity.id] ?? '1';
      sum = add(sum, entity.rate(upgradeMult));
    }
    return sum;
  }
}
