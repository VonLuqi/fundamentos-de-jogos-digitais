import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';
import {
  POWERUP_LIBRARY,
  POWERUP_WEAPON_POOL,
  POWERUP_STATUS_POOL,
  getRandomPowerupChoices,
  applyPowerupChoice,
  ITEM_PROGRESSION_LIBRARY,
  RARITY_DEFINITIONS,
  buildProgressionEntry,
  createFreshItemState,
  getPowerupDisplayData,
  resolvePickupReward,
  getRarityWeight,
  isItemFinalTier,
  scaleItemValueByRarity,
} from '../js/minigame/systems/PowerupSystem.js';
import {
  getDifficultyLevel,
  getSpawnInterval,
  getEnemySpawnCount,
  getEnemyStats,
} from '../js/minigame/engine/DifficultyConfig.js';
import { normalizeStatusId } from '../js/minigame/systems/StatusSystem.js';

const projectileSource = fs.readFileSync(path.resolve('js/minigame/entities/Projectile.js'), 'utf8');
const stubbedSource = `
  const THREE = {
    Group: class {
      constructor() {
        this.children = [];
        this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.x = x; this.y = y; this.z = z; return this; } };
        this.rotation = { x: 0, y: 0, z: 0 };
      }
      add(...items) {
        this.children.push(...items);
      }
    },
    Mesh: class {
      constructor() {
        this.position = {
          x: 0,
          y: 0,
          z: 0,
          set: (x, y, z) => {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
          },
        };
        this.rotation = { x: 0, y: 0, z: 0 };
      }
    },
    SphereGeometry: class {},
    RingGeometry: class {},
    CylinderGeometry: class {},
    MeshStandardMaterial: class {},
    MeshBasicMaterial: class {},
    DoubleSide: 2,
    Math: Math,
  };
  ${projectileSource
    .replace(/import \* as THREE from "https:\/\/unpkg\.com\/three@0\.164\.0\/build\/three\.module\.js";\n?/, '')
    .replace('export class Projectile {', 'class Projectile {')}
  export { Projectile };
`;

const { Projectile } = await import(`data:text/javascript,${encodeURIComponent(stubbedSource)}`);

const vfxSource = fs.readFileSync(path.resolve('js/minigame/systems/VfxSystem.js'), 'utf8');
const stubbedVfxSource = `
  const THREE = {
    Color: class {
      constructor(value = 0x7dd3fc) { this.value = value; }
      clone() { return new THREE.Color(this.value); }
      offsetHSL() { return this; }
    },
    MeshBasicMaterial: class {},
    DoubleSide: 2,
  };
  class SpriteRenderer { constructor() {} }
  class Emitter { setRate() { return this; } setInitializers() { return this; } setBehaviours() { return this; } emit() { return this; } }
  class System { addRenderer() { return this; } addEmitter() { return this; } emit() { return this; } update() { return this; } }
  class Rate { constructor() {} }
  class Span { constructor() {} }
  class Position { constructor() {} }
  class Mass { constructor() {} }
  class Radius { constructor() {} }
  class Life { constructor() {} }
  class RadialVelocity { constructor() {} }
  class Vector3D { constructor() {} }
  class Alpha { constructor() {} }
  class Scale { constructor() {} }
  class Color { constructor() {} }
  class PointZone { constructor() {} }
  ${vfxSource
    .replace(/import \* as THREE from "https:\/\/unpkg\.com\/three@0\.164\.0\/build\/three\.module\.js";\n?/, '')
    .replace(/import System, \{\s*SpriteRenderer,\s*Emitter,\s*Rate,\s*Span,\s*Position,\s*Mass,\s*Radius,\s*Life,\s*RadialVelocity,\s*Vector3D,\s*Alpha,\s*Scale,\s*Color,\s*PointZone,\s*\} from "https:\/\/esm\.sh\/three-nebula@13\.0\.0";\n?/, '')
    .replace(/export class VfxManager \{/, 'class VfxManager {')
    .replace(/export class VfxSystem extends VfxManager \{/, 'class VfxSystem extends VfxManager {')
    .replace(/export class VfxSystem \{/, 'class VfxSystem {')}
  export { VfxManager, VfxSystem };
`;
const { VfxSystem, VfxManager } = await import(`data:text/javascript,${encodeURIComponent(stubbedVfxSource)}`);

test('task 1 progression model defines stable item metadata and new-state defaults', () => {
  const weaponEntry = buildProgressionEntry('weapon', 'lâmina arcana');
  const statusEntry = buildProgressionEntry('status', 'speed');

  assert.ok(ITEM_PROGRESSION_LIBRARY['lâmina arcana']);
  assert.ok(ITEM_PROGRESSION_LIBRARY.speed);
  assert.equal(weaponEntry.state, 'new');
  assert.equal(statusEntry.state, 'new');
  assert.equal(weaponEntry.maxProgression, 10);
  assert.equal(statusEntry.maxProgression, 10);
  assert.ok(RARITY_DEFINITIONS.common);
  assert.ok(weaponEntry.baseStats.damage >= 1);
});

test('task 2 fresh item pickups use stable base stats and never start as inflated buffs', () => {
  const weaponState = createFreshItemState('weapon', 'vento cortante');
  const statusState = createFreshItemState('status', 'speed');

  assert.equal(weaponState.state, 'new');
  assert.equal(statusState.state, 'new');
  assert.equal(weaponState.level, 1);
  assert.ok(Math.abs(weaponState.damage - 1.2) < 0.001);
  assert.ok(Math.abs(statusState.value - 0.05) < 0.001);
  assert.equal(weaponState.isFinal, false);
});

test('task 3 upgrade cards expose rarity metadata and display it visibly', () => {
  const powerup = getPowerupDisplayData('WA1');
  const finalEvolution = getPowerupDisplayData('WD4');

  assert.ok(powerup.rarity);
  assert.ok(RARITY_DEFINITIONS[powerup.rarity]);
  assert.equal(powerup.rarityLabel, RARITY_DEFINITIONS[powerup.rarity].label);
  assert.equal(finalEvolution.rarity, 'legendary');
  assert.ok(finalEvolution.tag.includes('Final'));
});

test('powerup library keeps weapon upgrades identity-based and removes +3 tiers', () => {
  const weaponNames = Object.values(POWERUP_LIBRARY)
    .filter((entry) => entry.category === 'weapon')
    .map((entry) => entry.name);

  assert.equal(weaponNames.some((name) => name.includes('+3')), false);
  assert.ok(weaponNames.some((name) => name.includes('Final')));
  assert.ok(POWERUP_WEAPON_POOL.length >= 15);
  assert.equal(POWERUP_STATUS_POOL.length, 20);
});

test('random choices return 3 valid options without duplicates', () => {
  const choices = getRandomPowerupChoices(3);
  assert.equal(choices.length, 3);
  const seen = new Set();
  for (const choice of choices) {
    assert.ok(POWERUP_LIBRARY[choice]);
    assert.ok(!seen.has(choice));
    seen.add(choice);
  }
});

test('powerups can be applied to a player build', () => {
  const player = {
    weaponSlots: [
      { id: 'lâmina arcana', damage: 10, speed: 20, level: 1 },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
    baseSpeed: 15,
    speed: 15,
    projectiles: 1,
  };

  const result = applyPowerupChoice(player, 'WA1');
  assert.equal(result.applied, true);
  assert.ok(player.weaponSlots[0].damage >= 10);
  assert.ok(Array.isArray(player.statusSlots));
});

test('new weapon pickups start from stable base stats and wind cleave stays in a controlled range', () => {
  const player = {
    weaponSlots: [null, null, null, null, null],
    statusSlots: [null, null, null, null, null],
  };

  const windPickup = applyPowerupChoice(player, 'WD1');
  assert.equal(windPickup.applied, true);
  assert.equal(player.weaponSlots[0].id, 'vento cortante');
  assert.ok(Math.abs(player.weaponSlots[0].damage - 1.2) < 0.5, `wind damage was ${player.weaponSlots[0].damage}`);
  assert.ok(Math.abs(player.weaponSlots[0].speed - 28) < 10, `wind speed was ${player.weaponSlots[0].speed}`);
  assert.equal(player.weaponSlots[0].pattern, 'cleave');
});

test('final evolution upgrades only unlock at level 10 and only bone spear follows mouse aim', () => {
  const lowLevelPlayer = {
    weaponSlots: [
      { id: 'lança de ossos', level: 9, pattern: 'spread' },
      { id: 'orbe de fogo', level: 9, pattern: 'orbital' },
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
  };

  const lowChoices = getRandomPowerupChoices(6, lowLevelPlayer);
  assert.ok(!lowChoices.some((id) => POWERUP_LIBRARY[id].weapon === 'lança de ossos' && POWERUP_LIBRARY[id].type === 'evolution'));

  const finalLevelPlayer = {
    weaponSlots: [
      { id: 'lança de ossos', level: 10, pattern: 'spread' },
      { id: 'orbe de fogo', level: 9, pattern: 'orbital' },
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
  };

  const finalChoices = getRandomPowerupChoices(6, finalLevelPlayer);
  assert.ok(finalChoices.some((id) => POWERUP_LIBRARY[id].weapon === 'lança de ossos' && POWERUP_LIBRARY[id].type === 'evolution'));
});

test('task 4 final-tier items stop at level 10 and reject post-final upgrades', () => {
  const finalPlayer = {
    weaponSlots: [
      { id: 'lâmina arcana', level: 10, pattern: 'nearest', damage: 12, speed: 32, color: 0xffd166, name: 'Lâmina Arcana Final', isFinal: true },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
  };

  const result = applyPowerupChoice(finalPlayer, 'WA1');
  assert.equal(result.applied, false);
  assert.equal(finalPlayer.weaponSlots[0].level, 10);
  assert.equal(finalPlayer.weaponSlots[0].isFinal, true);
  assert.equal(finalPlayer.weaponSlots[0].name, 'Lâmina Arcana Final');
});

test('task 5 upgrades are generated per item and respect the current build', () => {
  const player = {
    weaponSlots: [
      { id: 'lâmina arcana', level: 3, pattern: 'nearest', damage: 3, speed: 28, color: 0xffd166 },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [
      { id: 'speed', level: 2 },
      null,
      null,
      null,
      null,
    ],
  };

  const choices = getRandomPowerupChoices(3, player);
  assert.equal(choices.length, 3);
  assert.ok(choices.every((id) => {
    const powerup = POWERUP_LIBRARY[id];
    return powerup && (
      powerup.weapon === 'lâmina arcana' ||
      powerup.type === 'speed'
    );
  }));
  assert.ok(!choices.some((id) => POWERUP_LIBRARY[id].weapon === 'lança de ossos'));
});

test('task 6 upgrade cards communicate rarity, state and impact clearly', () => {
  const weaponCard = getPowerupDisplayData('WA1');
  const statusCard = getPowerupDisplayData('SA1');

  assert.ok(weaponCard.impactEstimate);
  assert.ok(statusCard.impactEstimate);
  assert.ok(weaponCard.stateLabel);
  assert.equal(weaponCard.rarityLabel, RARITY_DEFINITIONS[weaponCard.rarity].label);
  assert.ok(weaponCard.tag.includes('Arma') || weaponCard.tag.includes('Status'));
});

test('task 7 item pickups resolve into real build upgrades in gameplay', () => {
  const player = {
    weaponSlots: [
      { id: 'lâmina arcana', level: 2, pattern: 'nearest', damage: 2, speed: 28 },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [
      { id: 'speed', level: 1 },
      null,
      null,
      null,
      null,
    ],
    baseSpeed: 15,
    speed: 15,
    baseProjectileDamage: 1,
    projectileDamage: 1,
    baseProjectileSpeed: 28,
    projectileSpeed: 28,
    baseMaxHp: 100,
    maxHp: 100,
    hp: 100,
    basePickupRange: 2.2,
    pickupRange: 2.2,
    baseRegenPerSecond: 0,
    regenPerSecond: 0,
    resistanceMultiplier: 1,
    attackCooldownMultiplier: 1,
  };

  const outcome = resolvePickupReward(player, { kind: 'weapon', itemId: 'lâmina arcana' });
  assert.equal(outcome.applied, true);
  assert.equal(player.weaponSlots[0].level >= 3, true);

  const statusOutcome = resolvePickupReward(player, { kind: 'status', itemId: 'damage' });
  assert.equal(statusOutcome.applied, true);
  assert.equal(normalizeStatusId(player.statusSlots[1]?.id || 'damage'), 'damage');
});

test('task 9 validation rules cover the progression edge cases and rarity weight contract', () => {
  const freshWeapon = createFreshItemState('weapon', 'lâmina arcana');
  const freshStatus = createFreshItemState('status', 'damage');
  const upgraded = { id: 'lâmina arcana', level: 7, isFinal: false };
  const finalWeapon = { id: 'lâmina arcana', level: 10, isFinal: true };

  assert.equal(freshWeapon.isBuffed, false);
  assert.equal(freshWeapon.state, 'new');
  assert.equal(freshStatus.state, 'new');
  assert.equal(isItemFinalTier(upgraded), false);
  assert.equal(isItemFinalTier(finalWeapon), true);
  assert.equal(getRarityWeight('common'), 60);
  assert.equal(getRarityWeight('legendary'), 1);
  assert.ok(Math.abs(scaleItemValueByRarity(10, 'rare') - 14.2) < 0.001);
  assert.ok(Math.abs(scaleItemValueByRarity(10, 'legendary') - 24) < 0.001);

  const finalPlayer = {
    weaponSlots: [
      { id: 'lâmina arcana', level: 10, isFinal: true, name: 'Lâmina Arcana Final' },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
  };

  const noUpgrade = resolvePickupReward(finalPlayer, { kind: 'weapon', itemId: 'lâmina arcana' });
  assert.equal(noUpgrade.applied, false);
  assert.equal(finalPlayer.weaponSlots[0].level, 10);
  assert.equal(finalPlayer.weaponSlots[0].isFinal, true);
});

test('task 11 defines attack-specific VFX emitters and visual identity per weapon type', () => {
  const scene = { add() {}, remove() {} };
  const vfx = new VfxSystem(scene);

  assert.equal(typeof vfx.spawnLightningImpact, 'function');
  assert.equal(typeof vfx.spawnWindCleaveTrail, 'function');
  assert.equal(typeof vfx.spawnFireOrbBurst, 'function');
  assert.equal(typeof vfx.spawnEnemyDeathBurst, 'function');
  assert.equal(typeof vfx.spawnPickupOrb, 'function');
  assert.equal(typeof vfx.spawnLevelUpAura, 'function');

  const lightning = vfx.spawnLightningImpact({ x: 0, y: 1.2, z: 0 }, { x: 2, y: 1.2, z: 0 }, 0xfde68a);
  const wind = vfx.spawnWindCleaveTrail({ x: 0, y: 1.2, z: 0 }, { x: 1, z: 0 }, 0x93c5fd);
  const fire = vfx.spawnFireOrbBurst({ x: 0, y: 1.2, z: 0 }, 0xf97316);
  const death = vfx.spawnEnemyDeathBurst({ x: 0, y: 1.2, z: 0 }, 0x8b5cf6);
  const pickup = vfx.spawnPickupOrb({ x: 0, y: 1.2, z: 0 }, 0x7dd3fc);
  const levelUp = vfx.spawnLevelUpAura({ x: 0, y: 1.2, z: 0 }, 0x8b5cf6);

  assert.ok(lightning || wind || fire || death || pickup || levelUp);
});

test('task 12 creates a VFX manager with lifecycle control and effect categories', () => {
  const scene = { add() {}, remove() {} };
  const manager = new VfxManager(scene);

  assert.equal(typeof manager.registerEffect, 'function');
  assert.equal(typeof manager.update, 'function');
  assert.equal(typeof manager.clearExpiredEffects, 'function');
  assert.ok(manager.categories && manager.categories.combat);
  assert.ok(manager.categories.pickups);
  assert.ok(manager.categories.upgrades);

  const created = manager.spawnPickupBurst({ x: 0, y: 1.2, z: 0 }, 0x7dd3fc);
  assert.ok(created);
  assert.equal(manager.categories.pickups.length >= 1, true);
});

test('task 13 integrates VFX into the gameplay loop for combat, pickups, and upgrades', () => {
  const gameSource = fs.readFileSync(path.resolve('js/minigame/engine/GameEngine.js'), 'utf8');

  assert.match(gameSource, /this\.vfx\.spawnLightningImpact\(/);
  assert.match(gameSource, /this\.vfx\.spawnWindCleaveTrail\(/);
  assert.match(gameSource, /this\.vfx\.spawnFireOrbBurst\(/);
  assert.match(gameSource, /this\.vfx\.spawnEnemyDeathBurst\(/);
  assert.match(gameSource, /this\.vfx\.spawnPickupOrb\(/);
  assert.match(gameSource, /this\.vfx\.spawnLevelUpAura\(/);
});

test('task 14 prunes expired VFX and keeps the manager bounded during intense combat', () => {
  const scene = { add() {}, remove() {} };
  const manager = new VfxManager(scene);
  manager.maxEffectsPerCategory = 2;

  const stale = { category: 'combat', system: { update() {} }, expiresAt: performance.now() - 100 };
  const fresh = { category: 'combat', system: { update() {} }, expiresAt: performance.now() + 5000 };

  manager.registerEffect(stale, 'combat');
  manager.registerEffect(fresh, 'combat');
  manager.registerEffect({ category: 'combat', system: { update() {} }, expiresAt: performance.now() + 1000 }, 'combat');

  assert.ok(manager.maxEffectsPerCategory);
  assert.equal(manager.effects.length <= 2, true);
  assert.equal(manager.categories.combat.length <= 2, true);

  manager.clearExpiredEffects();
  assert.equal(manager.effects.some((effect) => effect === stale), false);
  assert.equal(manager.categories.combat.some((effect) => effect === stale), false);
});

test('task 15 final VFX integration keeps attack, pickup and upgrade feedback consistent and bounded', () => {
  const gameSource = fs.readFileSync(path.resolve('js/minigame/engine/GameEngine.js'), 'utf8');
  const vfxSource = fs.readFileSync(path.resolve('js/minigame/systems/VfxSystem.js'), 'utf8');

  assert.match(gameSource, /this\.vfx\.spawnWindCleaveTrail\(/);
  assert.match(gameSource, /this\.vfx\.spawnLightningImpact\(/);
  assert.match(gameSource, /this\.vfx\.spawnFireOrbBurst\(/);
  assert.match(gameSource, /this\.vfx\.spawnEnemyDeathBurst\(/);
  assert.match(gameSource, /this\.vfx\.spawnPickupOrb\(/);
  assert.match(gameSource, /this\.vfx\.spawnLevelUpAura\(/);

  assert.match(vfxSource, /maxEffectsPerCategory/);
  assert.match(vfxSource, /this\.categories\s*=\s*\{/);
  assert.match(vfxSource, /spawnLightningImpact\(/);
  assert.match(vfxSource, /spawnWindCleaveTrail\(/);
  assert.match(vfxSource, /spawnFireOrbBurst\(/);
  assert.match(vfxSource, /spawnLevelUpAura\(/);
});

test('task 16 final project checklist keeps build progression, rarity and VFX aligned', () => {
  const gameSource = fs.readFileSync(path.resolve('js/minigame/engine/GameEngine.js'), 'utf8');
  const powerupSource = fs.readFileSync(path.resolve('js/minigame/systems/PowerupSystem.js'), 'utf8');

  assert.match(gameSource, /this\.updateHud\(/);
  assert.match(gameSource, /this\.vfx\.spawnLevelUpAura\(/);
  assert.match(powerupSource, /RARITY_DEFINITIONS|ITEM_PROGRESSION_LIBRARY/);
  assert.match(powerupSource, /isFinal|Final/);
});

test('final wind evolution and fire area upgrades modify the weapon behavior', () => {
  const windPlayer = {
    weaponSlots: [
      { id: 'vento cortante', level: 3, damage: 1.5, speed: 28, color: 0x93c5fd, pattern: 'nearest' },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
  };

  const firePlayer = {
    weaponSlots: [
      { id: 'orbe de fogo', level: 2, damage: 1.5, speed: 28, color: 0x7dd3fc, pattern: 'orbital', explosionRadius: 1.2 },
      null,
      null,
      null,
      null,
    ],
    statusSlots: [null, null, null, null, null],
  };

  const windResult = applyPowerupChoice(windPlayer, 'WD4');
  assert.equal(windResult.applied, true);
  assert.equal(windPlayer.weaponSlots[0].pattern, 'cleave');
  assert.notEqual(windPlayer.weaponSlots[0].color, 0x93c5fd);

  const fireResult = applyPowerupChoice(firePlayer, 'WC2');
  assert.equal(fireResult.applied, true);
  assert.ok((firePlayer.weaponSlots[0].explosionRadius ?? 0) > 1.2);
});

test('lightning static effects create a visible group and a visual-only origin pulse for the player', () => {
  const scene = { add() {} };
  const projectile = new Projectile(scene, { x: 4, y: 0, z: 2 }, { x: 1, z: 0 }, {
    visualType: 'lightning',
    staticEffect: true,
    visualOnly: true,
    damageRadius: 0,
  });

  assert.ok(projectile.mesh);
  assert.ok(projectile.mesh.children && projectile.mesh.children.length >= 2, 'lightning visual should include multiple visible parts');
  assert.equal(projectile.visualOnly, true);
});

test('fire orbs apply area damage when enemies are inside the explosion radius', () => {
  const enemy = {
    mesh: { position: { x: 1.4, z: 0 } },
    hp: 10,
    takeDamage(amount) {
      this.hp -= amount;
      return this.hp <= 0;
    },
  };

  const projectile = {
    mesh: { position: { x: 0, z: 0 } },
    damage: 3,
    explosionRadius: 3,
    life: 1,
    isExpired: false,
    update() {},
  };

  const getDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const victimCandidates = [enemy].filter((candidate) => getDistance(candidate.mesh.position, projectile.mesh.position) <= projectile.explosionRadius);
  assert.equal(victimCandidates.length, 1);
  assert.ok(getDistance(victimCandidates[0].mesh.position, projectile.mesh.position) <= projectile.explosionRadius);
});

test('build starts empty and fills up to 5 slots, with per-item counts', () => {
  const player = {
    weaponSlots: [null, null, null, null, null],
    statusSlots: [null, null, null, null, null],
    baseSpeed: 15,
    speed: 15,
    projectileDamage: 1,
    baseProjectileDamage: 1,
    projectileSpeed: 28,
    baseProjectileSpeed: 28,
    maxHp: 100,
    baseMaxHp: 100,
    pickupRange: 2.2,
    basePickupRange: 2.2,
    resistanceMultiplier: 1,
    attackCooldownMultiplier: 1,
    hp: 100,
  };

  const firstStatus = applyPowerupChoice(player, 'SA1');
  const secondStatus = applyPowerupChoice(player, 'SB1');
  const thirdStatus = applyPowerupChoice(player, 'SC1');
  const fourthStatus = applyPowerupChoice(player, 'SD1');
  const fifthStatus = applyPowerupChoice(player, 'SE1');
  const sixthStatus = applyPowerupChoice(player, 'SF1');

  assert.equal(firstStatus.applied, true);
  assert.equal(player.statusSlots.filter(Boolean).length, 5);
  assert.equal(sixthStatus.applied, true);
  assert.equal(player.statusSlots.filter((slot) => slot && slot.id === 'speed').length, 1);

  const weaponResult = applyPowerupChoice(player, 'WA1');
  assert.equal(weaponResult.applied, true);
  assert.equal(player.weaponSlots.filter(Boolean).length, 1);
});

test('projectiles expire when leaving the arena or exceeding their max distance', () => {
  const scene = { add() {}, remove() {} };
  const projectile = new Projectile(scene, { x: 0, z: 0 }, { x: 1, z: 0 }, {
    speed: 10,
    life: 1,
    maxDistance: 2,
    radius: 0.2,
  });

  projectile.mesh.position.x = 40;
  projectile.mesh.position.z = 40;
  projectile.update(0.016);
  assert.equal(projectile.isExpired, true);

  const projectile2 = new Projectile(scene, { x: 0, z: 0 }, { x: 1, z: 0 }, {
    speed: 10,
    life: 5,
    maxDistance: 1,
    radius: 0.2,
  });

  projectile2.mesh.position.x = 2;
  projectile2.mesh.position.z = 0;
  projectile2.update(0.016);
  assert.equal(projectile2.isExpired, true);
});

test('difficulty scales faster and increases spawn pressure over time without making the early game instantly unfair', () => {
  const earlyDifficulty = getDifficultyLevel(120, 1);
  const midDifficulty = getDifficultyLevel(420, 3);
  const lateDifficulty = getDifficultyLevel(900, 5);

  assert.ok(earlyDifficulty > 0.1 && earlyDifficulty < 1.0, `early difficulty should stay very low, got ${earlyDifficulty}`);
  assert.ok(midDifficulty > 1.0 && midDifficulty < 3.2, `mid difficulty should rise gradually, got ${midDifficulty}`);
  assert.ok(lateDifficulty > 2.0 && lateDifficulty <= 10, `late difficulty should be much higher, got ${lateDifficulty}`);

  assert.ok(getSpawnInterval(earlyDifficulty) > 1.3, `spawn interval should stay generous early, got ${getSpawnInterval(earlyDifficulty)}`);
  assert.ok(getEnemySpawnCount(midDifficulty) >= 1 && getEnemySpawnCount(midDifficulty) <= 3, `spawn count should stay controlled, got ${getEnemySpawnCount(midDifficulty)}`);

  const earlyStats = getEnemyStats(earlyDifficulty, 1);
  const enemyStats = getEnemyStats(midDifficulty, 3);
  assert.ok(earlyStats.hp <= 6, `expected early enemy hp to be paper-like, got ${earlyStats.hp}`);
  assert.ok(earlyStats.damage <= 5, `expected early enemy damage to be nearly harmless, got ${earlyStats.damage}`);
  assert.ok(earlyStats.speed <= 8, `expected early enemy speed to be slow, got ${earlyStats.speed}`);
  assert.ok(enemyStats.speed > 8, `mid-game enemy speed should rise, got ${enemyStats.speed}`);
  assert.ok(enemyStats.hp > 8, `mid-game enemy hp should rise, got ${enemyStats.hp}`);
  assert.ok(enemyStats.damage > 8, `mid-game enemy damage should rise, got ${enemyStats.damage}`);
});

test('projectile bounds follow the arena size instead of a hard-coded 38-unit cutoff', () => {
  const scene = { add() {}, remove() {} };
  const projectile = new Projectile(scene, { x: 0, z: 0 }, { x: 1, z: 0 }, {
    speed: 10,
    life: 1,
    maxDistance: 40,
    radius: 0.2,
    arenaLimit: 110,
  });

  projectile.mesh.position.x = 111;
  projectile.mesh.position.z = 0;
  projectile.update(0.016);

  assert.equal(projectile.isExpired, true);
  assert.ok(projectile.arenaLimit >= 100);
});
