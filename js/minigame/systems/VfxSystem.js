/**
 * VfxSystem — combate MVP (§4.5)
 * Skills: threejs-shaders (anel/arco ShaderMaterial), threejs-materials (additive/emissive),
 * threejs-animation (Clock / expand+fade), threejs-lighting (PointLight flash),
 * threejs-postprocessing (bloom no RenderSystem).
 */
import * as THREE from "../three.js";

const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uProgress;
  uniform float uThickness;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;
    float soft = max(0.04, uThickness);
    float ring = smoothstep(uProgress - soft, uProgress, d)
      * (1.0 - smoothstep(uProgress, uProgress + soft * 1.4, d));
    float fade = 1.0 - clamp(uProgress * 0.55, 0.0, 0.85);
    float alpha = ring * uOpacity * fade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const BOLT_VERT = /* glsl */ `
  varying float vY;
  void main() {
    vY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BOLT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying float vY;

  void main() {
    float flicker = 0.65 + 0.35 * sin(uTime * 48.0 + vY * 6.0);
    float core = 1.0 - smoothstep(0.0, 1.4, abs(vY - 1.1));
    float alpha = uOpacity * flicker * (0.45 + core * 0.55);
    gl_FragColor = vec4(uColor * (1.1 + core * 0.6), alpha);
  }
`;

function createRingMaterial(colorHex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 1 },
      uProgress: { value: 0.15 },
      uThickness: { value: 0.08 },
    },
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function createBoltMaterial(colorHex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: BOLT_VERT,
    fragmentShader: BOLT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export class VfxManager {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.maxEffectsPerCategory = 28;
    this.effects = [];
    this.categories = {
      combat: [],
      pickups: [],
      upgrades: [],
      ambient: [],
    };

    this._clock = new THREE.Clock();
    this._sharedSphere = new THREE.SphereGeometry(0.14, 6, 6);
    this._sharedPlane = new THREE.PlaneGeometry(1, 1, 1, 1);
    this._sharedBolt = new THREE.BoxGeometry(0.22, 2.6, 0.22);
    this._sharedArc = new THREE.RingGeometry(0.55, 2.4, 28, 1, 0, Math.PI * 0.95);

    /** @type {THREE.PointLight[]} */
    this._lightPool = [];
    for (let i = 0; i < 8; i += 1) {
      const light = new THREE.PointLight(0xffffff, 0, 14, 2);
      light.visible = false;
      light.castShadow = false;
      scene.add(light);
      this._lightPool.push(light);
    }
  }

  _acquireLight() {
    for (const light of this._lightPool) {
      if (!light.visible || light.intensity <= 0.05) return light;
    }
    return this._lightPool[0];
  }

  destroyEffect(entry) {
    if (!entry) return;

    if (entry.group?.parent) {
      entry.group.parent.remove(entry.group);
    }

    if (entry.light) {
      entry.light.intensity = 0;
      entry.light.visible = false;
    }

    if (Array.isArray(entry.particles)) {
      for (const particle of entry.particles) {
        if (!particle?.material) continue;
        // Material compartilhado do burst — dispose uma vez em entry.material
        if (entry.material && particle.material === entry.material) continue;
        particle.material.dispose?.();
      }
    }

    if (entry.material) {
      entry.material.dispose?.();
    }
  }

  registerEffect(effect, category = "combat") {
    if (!effect) return null;

    const key = this.categories[category] ? category : "combat";
    effect.category = key;
    effect.lastTick = performance.now();

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

  /**
   * Flash pontual (threejs-lighting) — curto e barato.
   * @param {{ x: number, y?: number, z: number }} position
   * @param {number} colorHex
   * @param {{ intensity?: number, distance?: number, durationMs?: number }} [opts]
   */
  spawnLightFlash(position, colorHex = 0xffffff, opts = {}) {
    const light = this._acquireLight();
    const durationMs = opts.durationMs ?? 220;
    light.color.setHex(colorHex);
    light.intensity = opts.intensity ?? 5.5;
    light.distance = opts.distance ?? 16;
    light.position.set(position.x, position.y ?? 2.2, position.z);
    light.visible = true;

    return this.registerEffect({
      kind: "flash",
      category: "combat",
      light,
      baseIntensity: light.intensity,
      bornAt: performance.now(),
      ttl: durationMs,
      expiresAt: performance.now() + durationMs,
    }, "combat");
  }

  /**
   * Anel shader expansivo (shockwave / impacto).
   */
  spawnExpandingRing(position, config = {}) {
    const color = config.color ?? 0x93c5fd;
    const material = createRingMaterial(color);
    material.uniforms.uThickness.value = config.thickness ?? 0.07;
    const mesh = new THREE.Mesh(this._sharedPlane, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x ?? 0, (position.y ?? 0.12) + 0.05, position.z ?? 0);
    mesh.scale.setScalar(config.startScale ?? 1.2);

    const group = new THREE.Group();
    group.add(mesh);
    this.scene.add(group);

    return this.registerEffect({
      kind: "ring",
      category: config.category ?? "combat",
      group,
      mesh,
      material,
      startScale: config.startScale ?? 1.2,
      endScale: config.endScale ?? 10,
      expiresAt: performance.now() + (config.ttl ?? 700),
      bornAt: performance.now(),
      ttl: config.ttl ?? 700,
    }, config.category ?? "combat");
  }

  /**
   * Arco frontal da Lâmina (RingGeometry parcial + shader).
   */
  spawnShaderArc(origin, direction = { x: 0, z: -1 }, config = {}) {
    const color = config.color ?? 0xa78bfa;
    const material = createRingMaterial(color);
    material.uniforms.uThickness.value = 0.11;
    const mesh = new THREE.Mesh(this._sharedArc, material);
    mesh.rotation.x = -Math.PI / 2;
    const len = Math.hypot(direction.x ?? 0, direction.z ?? 0) || 1;
    const nx = (direction.x ?? 0) / len;
    const nz = (direction.z ?? 0) / len;
    // RingGeometry (0→π) após rot.x fica espelhado no chão — +π alinha com a mira
    const yaw = Math.atan2(nx, nz) + Math.PI;
    mesh.rotation.z = yaw;
    mesh.position.set(
      (origin.x ?? 0) + nx * 0.35,
      0.35,
      (origin.z ?? 0) + nz * 0.35
    );
    mesh.scale.setScalar(config.startScale ?? 1.4);

    const group = new THREE.Group();
    group.add(mesh);
    this.scene.add(group);

    return this.registerEffect({
      kind: "ring",
      category: "combat",
      group,
      mesh,
      material,
      startScale: config.startScale ?? 1.4,
      endScale: config.endScale ?? 4.2,
      expiresAt: performance.now() + (config.ttl ?? 420),
      bornAt: performance.now(),
      ttl: config.ttl ?? 420,
    }, "combat");
  }

  /**
   * Pilar de relâmpago com shader flicker.
   */
  spawnLightningBoltMesh(position, color = 0xfde68a, ttl = 420) {
    const material = createBoltMaterial(color);
    const mesh = new THREE.Mesh(this._sharedBolt, material);
    mesh.position.set(position.x ?? 0, 1.3, position.z ?? 0);

    const group = new THREE.Group();
    group.add(mesh);
    this.scene.add(group);

    return this.registerEffect({
      kind: "bolt",
      category: "combat",
      group,
      mesh,
      material,
      expiresAt: performance.now() + ttl,
      bornAt: performance.now(),
      ttl,
    }, "combat");
  }

  clearExpiredEffects(now = performance.now()) {
    const elapsed = this._clock.getElapsedTime();
    const activeEffects = [];

    for (const entry of this.effects) {
      const dt = Math.max(0.016, (now - (entry.lastTick ?? now)) / 1000);
      entry.lastTick = now;
      const lifeT = entry.ttl > 0 ? THREE.MathUtils.clamp((now - (entry.bornAt ?? now)) / entry.ttl, 0, 1) : 1;

      if (entry.kind === "ring" && entry.mesh && entry.material?.uniforms) {
        const scale = THREE.MathUtils.lerp(entry.startScale ?? 1, entry.endScale ?? 8, lifeT);
        entry.mesh.scale.setScalar(scale);
        entry.material.uniforms.uProgress.value = 0.12 + lifeT * 0.85;
        entry.material.uniforms.uOpacity.value = 1 - lifeT * 0.92;
      } else if (entry.kind === "bolt" && entry.material?.uniforms) {
        entry.material.uniforms.uTime.value = elapsed;
        entry.material.uniforms.uOpacity.value = 1 - lifeT * 0.85;
        if (entry.mesh) {
          entry.mesh.scale.x = 0.85 + Math.sin(elapsed * 40) * 0.2;
          entry.mesh.scale.z = entry.mesh.scale.x;
        }
      } else if (entry.kind === "flash" && entry.light) {
        const remain = Math.max(0, (entry.expiresAt - now) / Math.max(1, entry.ttl || 220));
        entry.light.intensity = (entry.baseIntensity ?? 4) * remain;
        if (entry.light.intensity <= 0.04) entry.light.visible = false;
      } else if (Array.isArray(entry.particles)) {
        let sharedOpacity = null;
        if (entry.material && entry.particles[0]?.material === entry.material) {
          sharedOpacity = Math.max(0, 1 - lifeT);
          entry.material.opacity = sharedOpacity;
        }
        for (const particle of entry.particles) {
          if (!particle?.userData) continue;
          const data = particle.userData;
          particle.position.x += data.vx * dt;
          particle.position.y += data.vy * dt;
          particle.position.z += data.vz * dt;
          data.life -= dt;
          const alpha = Math.max(0, data.life / data.maxLife);
          if (sharedOpacity == null && particle.material) {
            particle.material.opacity = alpha;
          }
          if (data.shrink) {
            const s = 0.35 + alpha * 0.9;
            particle.scale.setScalar(s);
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

    // Reconstrói índices por categoria sem descartar efeitos vivos (evita leak → freeze/tela preta)
    for (const key of Object.keys(this.categories)) {
      this.categories[key] = [];
    }
    for (const effect of this.effects) {
      const key = this.categories[effect.category] ? effect.category : "combat";
      this.categories[key].push(effect);
    }
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
    const count = Math.max(4, Number(config.particlesMax ?? 14));
    const ttl = Number(config.ttl ?? 700);
    const color = new THREE.Color(config.color ?? 0x7dd3fc);
    const particles = [];
    const speed = Number(config.speed ?? 4.2);

    // Um material por burst (não por partícula) — evita estourar WebGL em ~2s de spam
    const sharedMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(this._sharedSphere, sharedMaterial);
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.9 + 0.15;
      const vx = Math.cos(angle) * spread * speed * 0.7;
      const vy = (Math.random() * 1.4 + 0.2) * speed * 0.65;
      const vz = Math.sin(angle) * spread * speed * 0.7;

      mesh.position.set(
        baseX + (Math.random() - 0.5) * 0.4,
        baseY + (Math.random() - 0.5) * 0.4,
        baseZ + (Math.random() - 0.5) * 0.4
      );
      const life = Number(config.lifeMax ?? 0.8) + Math.random() * 0.35;
      mesh.userData = { vx, vy, vz, life, maxLife: life, shrink: true };
      group.add(mesh);
      particles.push(mesh);
    }

    this.scene.add(group);

    const category = config.category ?? "combat";
    return this.registerEffect({
      kind: "burst",
      category,
      group,
      particles,
      material: sharedMaterial,
      expiresAt: performance.now() + ttl,
      bornAt: performance.now(),
      ttl,
    }, category);
  }

  spawnImpact(position, config = {}) {
    const color = config.color ?? 0xf97316;
    this.spawnLightFlash(position, color, { intensity: 3.2, durationMs: 160 });
    return this.spawnBurst(position, {
      ...config,
      category: config.category ?? "combat",
      color,
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
    this.spawnExpandingRing(position, {
      color: config.color ?? 0x8b5cf6,
      startScale: 1.5,
      endScale: 8,
      ttl: 900,
      category: "upgrades",
    });
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
    const tx = target.x ?? target?.position?.x ?? 0;
    const ty = target.y ?? target?.position?.y ?? 1.2;
    const tz = target.z ?? target?.position?.z ?? 0;

    this.spawnLightningBoltMesh({ x: tx, y: ty, z: tz }, color, 380);
    this.spawnLightFlash({ x: tx, y: 2.4, z: tz }, color, { intensity: 7, durationMs: 200 });
    this.spawnExpandingRing({ x: tx, y: 0.12, z: tz }, {
      color,
      startScale: 0.8,
      endScale: 4.5,
      ttl: 380,
      thickness: 0.09,
    });

    const originBurst = this.spawnBurst(origin, {
      category: "combat",
      color,
      particlesMax: 10,
      lifeMax: 0.55,
      speed: 5,
      ttl: 500,
    });
    const targetBurst = this.spawnBurst({ x: tx, y: ty, z: tz }, {
      category: "combat",
      color,
      particlesMax: 16,
      lifeMax: 0.7,
      speed: 7,
      ttl: 650,
    });
    return { originBurst, targetBurst };
  }

  spawnWindShockwave(position, color = 0x93c5fd) {
    this.spawnLightFlash(position, color, { intensity: 4.5, durationMs: 240, distance: 20 });
    this.spawnExpandingRing(position, {
      color,
      startScale: 1.5,
      endScale: 14,
      ttl: 650,
      thickness: 0.06,
    });
    return this.spawnBurst(position, {
      category: "combat",
      color,
      particlesMax: 28,
      lifeMax: 0.85,
      speed: 9.5,
      ttl: 800,
    });
  }

  spawnMeleeArc(origin, direction = { x: 1, z: 0 }, color = 0xa78bfa) {
    this.spawnShaderArc(origin, direction, { color, ttl: 280, startScale: 1.8, endScale: 4.2 });
    this.spawnLightFlash(origin, color, { intensity: 2.4, durationMs: 110 });

    const ox = origin.x ?? origin?.position?.x ?? 0;
    const oy = origin.y ?? origin?.position?.y ?? 1.2;
    const oz = origin.z ?? origin?.position?.z ?? 0;
    const len = Math.hypot(direction.x ?? 0, direction.z ?? 0) || 1;
    const nx = (direction.x ?? 0) / len;
    const nz = (direction.z ?? 0) / len;

    return this.spawnBurst({
      x: ox + nx * 1.0,
      y: oy,
      z: oz + nz * 1.0,
    }, {
      category: "combat",
      color,
      particlesMax: 8,
      lifeMax: 0.35,
      speed: 6.5,
      ttl: 320,
    });
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
    this.spawnLightFlash(position, color, { intensity: 4.2, durationMs: 180 });
    this.spawnExpandingRing(position, {
      color,
      startScale: 1,
      endScale: 5.5,
      ttl: 500,
      thickness: 0.08,
    });
    return this.spawnBurst(position, {
      category: "combat",
      color,
      particlesMax: 22,
      lifeMax: 0.9,
      speed: 6.4,
      ttl: 850,
    });
  }

  spawnEnemyDeathBurst(position, color = 0x8b5cf6) {
    this.spawnLightFlash(position, color, { intensity: 2.8, durationMs: 150 });
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
    return this.spawnLevelUp(position, { color });
  }
}

export class VfxSystem extends VfxManager {}
