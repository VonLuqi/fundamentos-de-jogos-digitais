import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStatusSlots,
  buildStatusEffects,
  normalizeStatusId,
  STATUS_LIBRARY,
  resolveStatusSlotIndex,
} from '../js/minigame/systems/StatusSystem.js';
import { applyPowerupChoice } from '../js/minigame/systems/PowerupSystem.js';

test('status slots are created with 5 slots', () => {
  const slots = createStatusSlots();
  assert.equal(slots.length, 5);
  assert.deepEqual(slots, [null, null, null, null, null]);
});

test('status ids are normalized and effects are cumulative', () => {
  const speed = normalizeStatusId(' Velocidade ');
  assert.equal(speed, 'speed');
  assert.ok(STATUS_LIBRARY.speed);

  const slots = [
    { id: 'speed', level: 1 },
    { id: 'speed', level: 2 },
    { id: 'damage', level: 1 },
  ];

  const effects = buildStatusEffects(slots);
  assert.ok(effects.speedMultiplier > 1);
  assert.ok(effects.damageMultiplier > 1);
  assert.ok(effects.maxHpMultiplier >= 1);
});

test('status upgrades are resolved to a fixed 5-slot layout', () => {
  const slots = [
    { id: 'speed', level: 1 },
    { id: 'damage', level: 1 },
    { id: 'attackSpeed', level: 1 },
    { id: 'maxHp', level: 1 },
    { id: 'pickupRange', level: 1 },
  ];

  assert.equal(resolveStatusSlotIndex('speed', slots), 0);
  assert.equal(resolveStatusSlotIndex('damage', slots), 1);
  assert.equal(resolveStatusSlotIndex('attackSpeed', slots), 2);
  assert.equal(resolveStatusSlotIndex('maxHp', slots), 3);
  assert.equal(resolveStatusSlotIndex('pickupRange', slots), 4);
  assert.equal(resolveStatusSlotIndex('projectileSpeed', slots), 2);
  assert.equal(resolveStatusSlotIndex('resistance', slots), 2);
});

test('same-type status upgrades stack in the same slot and update the player from the final build state', () => {
  const player = {
    baseSpeed: 15,
    speed: 15,
    baseProjectileDamage: 1,
    projectileDamage: 1,
    baseProjectileSpeed: 24,
    projectileSpeed: 24,
    baseMaxHp: 100,
    maxHp: 100,
    hp: 100,
    basePickupRange: 2.2,
    pickupRange: 2.2,
    baseRegenPerSecond: 0,
    regenPerSecond: 0,
    resistanceMultiplier: 1,
    attackCooldownMultiplier: 1,
    statusSlots: createStatusSlots(),
  };

  applyPowerupChoice(player, 'SA1');
  applyPowerupChoice(player, 'SA2');

  assert.equal(player.statusSlots[0].id, 'speed');
  assert.equal(player.statusSlots[0].level, 2);
  assert.ok(player.speed > 17.5, `expected stacked speed bonus to exceed 17.5, got ${player.speed}`);

  const rebuilt = [
    { id: 'speed', level: 2 },
    { id: 'damage', level: 1 },
  ];
  const rebuiltEffects = buildStatusEffects(rebuilt);
  assert.ok(rebuiltEffects.speedMultiplier > rebuiltEffects.damageMultiplier);
});
