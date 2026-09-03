import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";

export class VfxManager {
  constructor(scene) {
    this.scene = scene;
    this.maxEffectsPerCategory = 24;
    this.effects = [];
    this.categories = {
      combat: [],
      pickups: [],
      upgrades: [],
      ambient: [],
    };
  }

  destroyEffect(entry) {
    if (!entry) return;

    if (entry.group && entry.group.parent) {
      entry.group.parent.remove(entry.group);
    }

    if (Array.isArray(entry.particles)) {
      entry.particles.forEach((particle) => {
        if (particle && particle.material && particle.material.dispose) {
          particle.material.dispose();
        }
        if (particle && particle.geometry && particle.geometry.dispose) {
          particle.geometry.dispose();
        }
      });
    }
  }

  registerEffect(effect, category = "combat") {
    if (!effect) return null;

    const key = this.categories[category] ? category : "combat";
    effect.category = key;

    this.effects.push(effect);
    this.categories[key].push(effect);

    const overLimit = this.categories[key].length - this.maxEffectsPerCategory;
    if (overLimit > 0) {
      const expiredFromCategory = this.categories[key].slice(0, overLimit);
      this.categories[key] = this.categories[key].slice(overLimit);
      this.effects = this.effects.filter((entry) => {
        const shouldRemove = expiredFromCategory.includes(entry);
        if (shouldRemove) this.destroyEffect(entry);
        return !shouldRemove;
      });
    }

    return effect;
  }

  clearExpiredEffects(now = performance.now()) {
    const activeEffects = [];

    for (const entry of this.effects) {
      const dt = Math.max(0.016, (now - (entry.lastTick ?? now)) / 1000);
      entry.lastTick = now;

      if (Array.isArray(entry.particles)) {
        for (const particle of entry.particles) {
          if (!particle || !particle.userData) continue;
          const data = particle.userData;
          particle.position.x += data.vx * dt;
          particle.position.y += data.vy * dt;
          particle.position.z += data.vz * dt;

          data.life -= dt;
          const alpha = Math.max(0, data.life / data.maxLife);
          if (particle.material) {
            particle.material.opacity = Math.max(0, alpha);
          }
        }
      }

      if (now >= entry.expiresAt) {
        this.destroyEffect(entry);
        continue;
      }

      activeEffects.push(entry);
    }

    this.effects = activeEffects;

    Object.keys(this.categories).forEach((category) => {
      const entries = this.effects.filter((effect) => effect.category === category);
      this.categories[category] = entries.length > this.maxEffectsPerCategory
        ? entries.slice(entries.length - this.maxEffectsPerCategory)
        : entries;
    });

    this.effects = Object.values(this.categories).flat();
    return this.effects.length;
  }

  update() {
    this.clearExpiredEffects(performance.now());
    return this.effects.length;
  }

  spawnBurst(position, config = {}) {
    if (!position) return null;

    const group = new THREE.Group();
    const baseX = Number(position.x ?? 0);
    const baseY = Number(position.y ?? 1.2);
    const baseZ = Number(position.z ?? 0);
    const count = Number(config.particlesMax ?? 14);
    const ttl = Number(config.ttl ?? 700);
    const color = new THREE.Color(config.color ?? 0x7dd3fc);
    const particles = [];

    for (let i = 0; i < count; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), material);
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.9 + 0.15;
      const vx = Math.cos(angle) * spread * Number(config.speed ?? 4.2) * 0.7;
      const vy = (Math.random() * 1.4 + 0.2) * Number(config.speed ?? 4.2) * 0.65;
      const vz = Math.sin(angle) * spread * Number(config.speed ?? 4.2) * 0.7;

      mesh.position.set(
        baseX + (Math.random() - 0.5) * 0.4,
        baseY + (Math.random() - 0.5) * 0.4,
        baseZ + (Math.random() - 0.5) * 0.4,
      );
      mesh.userData = {
        vx,
        vy,
        vz,
        life: Number(config.lifeMax ?? 0.8) + Math.random() * 0.35,
        maxLife: Number(config.lifeMax ?? 0.8) + Math.random() * 0.35,
      };

      group.add(mesh);
      particles.push(mesh);
    }

    this.scene.add(group);

    const category = config.category ?? "combat";
    const effect = {
      category,
      group,
      particles,
      expiresAt: performance.now() + ttl,
      lastTick: performance.now(),
    };

    return this.registerEffect(effect, category) ? group : group;
  }

  spawnImpact(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "combat",
      color: config.color ?? 0xf97316,
      particlesMax: config.particlesMax ?? 12,
      lifeMax: config.lifeMax ?? 0.7,
      speed: config.speed ?? 4,
      ttl: config.ttl ?? 700,
    });
  }

  spawnLightningStrike(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "combat",
      color: config.color ?? 0xfde68a,
      particlesMax: config.particlesMax ?? 18,
      lifeMax: config.lifeMax ?? 0.8,
      speed: config.speed ?? 6.5,
      ttl: config.ttl ?? 800,
    });
  }

  spawnWindCleave(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "combat",
      color: config.color ?? 0x93c5fd,
      particlesMax: config.particlesMax ?? 16,
      lifeMax: config.lifeMax ?? 0.9,
      speed: config.speed ?? 5.5,
      ttl: config.ttl ?? 750,
    });
  }

  spawnFireBurst(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "combat",
      color: config.color ?? 0xf97316,
      particlesMax: config.particlesMax ?? 18,
      lifeMax: config.lifeMax ?? 1.1,
      speed: config.speed ?? 6.4,
      ttl: config.ttl ?? 850,
    });
  }

  spawnPickup(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "pickups",
      color: config.color ?? 0x7dd3fc,
      particlesMax: config.particlesMax ?? 14,
      lifeMax: config.lifeMax ?? 1.0,
      speed: config.speed ?? 5.2,
      ttl: config.ttl ?? 1000,
    });
  }

  spawnRewardPickup(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "pickups",
      color: config.color ?? 0xfbbf24,
      particlesMax: config.particlesMax ?? 18,
      lifeMax: config.lifeMax ?? 1.2,
      speed: config.speed ?? 6.8,
      ttl: config.ttl ?? 1100,
    });
  }

  spawnLevelUp(position, config = {}) {
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "upgrades",
      color: config.color ?? 0x8b5cf6,
      particlesMax: config.particlesMax ?? 22,
      lifeMax: config.lifeMax ?? 1.3,
      speed: config.speed ?? 7.4,
      ttl: config.ttl ?? 1200,
    });
  }

  spawnLightningImpact(origin, target, color = 0xfde68a) {
    const originBurst = this.spawnBurst(origin, {
      category: "combat",
      color,
      particlesMax: 16,
      lifeMax: 0.7,
      speed: 6,
      ttl: 700,
    });
    const targetBurst = this.spawnBurst(target, {
      category: "combat",
      color,
      particlesMax: 18,
      lifeMax: 0.8,
      speed: 7,
      ttl: 800,
    });
    return { originBurst, targetBurst };
  }

  spawnWindCleaveTrail(origin, direction = { x: 1, z: 0 }, color = 0x93c5fd) {
    const trailPosition = {
      x: (origin.x ?? origin?.position?.x ?? 0) + (direction.x ?? 0) * 1.4,
      y: origin.y ?? 1.2,
      z: (origin.z ?? origin?.position?.z ?? 0) + (direction.z ?? 0) * 1.4,
    };

    return this.spawnBurst(trailPosition, {
      category: "combat",
      color,
      particlesMax: 16,
      lifeMax: 0.8,
      speed: 5.2,
      ttl: 750,
    });
  }

  spawnFireOrbBurst(position, color = 0xf97316) {
    return this.spawnBurst(position, {
      category: "combat",
      color,
      particlesMax: 20,
      lifeMax: 0.9,
      speed: 6,
      ttl: 850,
    });
  }

  spawnEnemyDeathBurst(position, color = 0x8b5cf6) {
    return this.spawnBurst(position, {
      category: "combat",
      color,
      particlesMax: 18,
      lifeMax: 0.85,
      speed: 5,
      ttl: 700,
    });
  }

  spawnPickupOrb(position, color = 0x7dd3fc) {
    return this.spawnBurst(position, {
      category: "pickups",
      color,
      particlesMax: 14,
      lifeMax: 1.0,
      speed: 4.8,
      ttl: 900,
    });
  }

  spawnPickupBurst(position, color = 0x7dd3fc) {
    return this.spawnPickupOrb(position, color);
  }

  spawnLevelUpAura(position, color = 0x8b5cf6) {
    return this.spawnBurst(position, {
      category: "upgrades",
      color,
      particlesMax: 26,
      lifeMax: 1.4,
      speed: 7.8,
      ttl: 1200,
    });
  }
}

export class VfxSystem extends VfxManager {}
