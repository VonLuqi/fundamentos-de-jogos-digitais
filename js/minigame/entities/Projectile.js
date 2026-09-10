import * as THREE from "../three.js";

/** Cap de projéteis simultâneos (§4.2) — cobre spread/orbital sem GC. */
export const PROJECTILE_POOL_SIZE = 64;

const PARK_Y = -9999;
const DEFAULT_COLOR = 0xffd166;

/** Geometrias compartilhadas — lazy (só após Three carregar de verdade). */
let SHARED = null;

function getSharedGeometries() {
  if (SHARED) return SHARED;
  SHARED = {
    orb: new THREE.SphereGeometry(1, 10, 10),
    boneShaft: new THREE.CylinderGeometry(0.12, 0.16, 2.8, 6),
    boneTip: new THREE.ConeGeometry(0.22, 0.7, 5),
    boneButt: new THREE.SphereGeometry(0.22, 6, 6),
    boneDust: new THREE.ConeGeometry(0.35, 1.6, 5, 1, true),
    wind: new THREE.ConeGeometry(0.5, 4.5, 6, 1, false),
    bolt: new THREE.BoxGeometry(0.28, 3.2, 0.28),
    ringOuter: new THREE.RingGeometry(0.65, 1.9, 20),
    ringInner: new THREE.RingGeometry(0.3, 0.75, 16),
    pillar: new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8),
  };
  return SHARED;
}

function tintObject(root, colorHex) {
  if (!root) return;
  root.traverse((child) => {
    const mat = child.material;
    if (!mat) return;
    if (child.userData?.skipTint) return;
    if (mat.color) mat.color.setHex(colorHex);
    if (mat.emissive) mat.emissive.setHex(colorHex);
  });
}

function resetOpacity(root) {
  if (!root) return;
  root.traverse((child) => {
    const mat = child.material;
    if (!mat || mat.opacity === undefined) return;
    if (child.userData?.baseOpacity != null) {
      mat.opacity = child.userData.baseOpacity;
    }
  });
}

/**
 * Entidade Projectile (§4.2): padrões orb / bone / wind / lightning com API de pool.
 */
export class Projectile {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.poolIndex = -1;
    this.active = false;

    this.root = new THREE.Group();
    this.root.name = "ProjectileRoot";
    this.root.visible = false;
    this.root.position.set(0, PARK_Y, 0);
    scene.add(this.root);

    this.mesh = this.root;

    this._buildVisualVariants();
    this._hideAllVisuals();

    this.speed = 0;
    this.damage = 0;
    this.life = 0;
    this.velocity = { x: 0, z: 0 };
    this.maxDistance = 18;
    this.arenaLimit = 110;
    this.spawnPosition = { x: 0, z: 0 };
    this.visualType = "orb";
    this.staticEffect = false;
    this.visualOnly = false;
    this.isExpired = false;
    this.hitApplied = false;
    this.damageRadius = 0;
    this.explosionRadius = 0;
    this.strokeLength = 0;
    this.pierce = false;
    this.maxPierce = 64;
    this.pierceCount = 0;
    /** @type {Set<number>} */
    this.hitIds = new Set();
    this.radius = 0.45;
    this.color = DEFAULT_COLOR;
    this._activeVisual = null;
  }

  _buildVisualVariants() {
    const color = DEFAULT_COLOR;
    const geo = getSharedGeometries();

    const orb = new THREE.Mesh(
      geo.orb,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.1,
      })
    );
    orb.name = "ProjectileOrb";
    orb.castShadow = false;

    const bone = new THREE.Group();
    bone.name = "ProjectileBone";
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xe7e0d4,
      emissive: 0xc4b5fd,
      emissiveIntensity: 0.55,
      roughness: 0.55,
      metalness: 0.05,
      flatShading: true,
    });
    const shaft = new THREE.Mesh(geo.boneShaft, boneMat);
    shaft.rotation.z = Math.PI / 2;
    const tip = new THREE.Mesh(geo.boneTip, boneMat.clone());
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 1.55;
    const butt = new THREE.Mesh(geo.boneButt, boneMat.clone());
    butt.position.x = -1.4;
    const dustTrail = new THREE.Mesh(
      geo.boneDust,
      new THREE.MeshBasicMaterial({
        color: 0xd6c7a1,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    dustTrail.name = "BoneDustTrail";
    dustTrail.userData.skipTint = true;
    dustTrail.rotation.z = Math.PI / 2;
    dustTrail.position.x = -1.8;
    bone.add(shaft, tip, butt, dustTrail);

    const wind = new THREE.Mesh(
      geo.wind,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.05,
      })
    );
    wind.name = "ProjectileWind";
    wind.rotation.x = Math.PI / 2;
    wind.castShadow = false;

    const lightningBolt = new THREE.Mesh(
      geo.bolt,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.5,
        roughness: 0.15,
        metalness: 0.25,
      })
    );
    lightningBolt.name = "ProjectileLightningBolt";
    lightningBolt.rotation.x = Math.PI / 2;
    lightningBolt.rotation.z = Math.PI / 2;
    lightningBolt.castShadow = false;

    const lightningStatic = new THREE.Group();
    lightningStatic.name = "ProjectileLightningStatic";

    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geo.ringOuter, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.userData.baseOpacity = 0.8;

    const pulseMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(geo.ringInner, pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.1;
    pulse.userData.baseOpacity = 0.9;

    const pillar = new THREE.Mesh(
      geo.pillar,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.1,
      })
    );
    pillar.position.y = 1.2;
    lightningStatic.add(ring, pulse, pillar);

    this.visuals = { orb, bone, wind, lightningBolt, lightningStatic };
    for (const visual of Object.values(this.visuals)) {
      visual.visible = false;
      this.root.add(visual);
    }
  }

  _hideAllVisuals() {
    for (const visual of Object.values(this.visuals)) {
      visual.visible = false;
    }
    this._activeVisual = null;
  }

  /**
   * @param {string} visualType
   * @param {boolean} staticEffect
   * @param {{ x: number, z: number }} direction
   * @param {number} radius
   */
  _showVisual(visualType, staticEffect, direction, radius) {
    this._hideAllVisuals();

    let key = "orb";
    if (visualType === "wind") key = "wind";
    else if (visualType === "bone" || visualType === "spear") key = "bone";
    else if (visualType === "lightning") key = staticEffect ? "lightningStatic" : "lightningBolt";

    const visual = this.visuals[key];
    visual.visible = true;
    this._activeVisual = visual;

    if (key === "orb") {
      const r = Math.max(0.15, radius || 0.45);
      visual.scale.setScalar(r);
      visual.position.set(0, 0, 0);
      visual.rotation.set(0, 0, 0);
    } else if (key === "bone") {
      visual.scale.setScalar(Math.max(0.7, (radius || 0.42) * 1.6));
      visual.rotation.set(0, 0, Math.atan2(direction.z, direction.x));
    } else if (key === "wind") {
      visual.scale.setScalar(1);
      visual.rotation.x = Math.PI / 2;
      visual.rotation.z = Math.atan2(direction.z, direction.x);
    } else if (key === "lightningBolt") {
      visual.scale.setScalar(1);
      visual.rotation.x = Math.PI / 2;
      visual.rotation.z = Math.PI / 2;
    } else if (key === "lightningStatic") {
      visual.scale.setScalar(1);
      visual.rotation.set(0, 0, 0);
      resetOpacity(visual);
    }
  }

  /**
   * @param {{ x: number, z: number, y?: number }} position
   * @param {{ x: number, z: number }} direction
   * @param {object} [options]
   * @returns {Projectile}
   */
  spawn(position, direction, options = {}) {
    const dirX = direction?.x ?? 0;
    const dirZ = direction?.z ?? 0;
    const dirLen = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / dirLen;
    const nz = dirZ / dirLen;

    this.active = true;
    this.isExpired = false;
    this.hitApplied = false;

    this.radius = options.radius ?? 0.45;
    this.color = options.color ?? DEFAULT_COLOR;
    this.visualType = options.visualType ?? "orb";
    this.staticEffect = options.staticEffect ?? false;
    this.visualOnly = options.visualOnly ?? false;
    this.damageRadius = options.damageRadius ?? 0;
    this.explosionRadius = options.explosionRadius ?? 0;
    this.pierce = Boolean(options.pierce);
    this.maxPierce = Number.isFinite(options.maxPierce) ? options.maxPierce : 64;
    this.pierceCount = 0;
    this.hitIds.clear();
    this.speed = options.speed ?? 28;
    this.damage = options.damage ?? 1;
    this.life = options.life ?? 1.8;
    this.maxDistance = options.maxDistance ?? 18;
    this.arenaLimit = options.arenaLimit ?? 110;
    this.strokeLength = this.visualType === "lightning" ? 3.2 : 0;

    this.velocity.x = nx * this.speed;
    this.velocity.z = nz * this.speed;

    const px = position.x;
    const pz = position.z;
    const py = Number.isFinite(position.y) ? position.y : 1.8;
    this.spawnPosition.x = px;
    this.spawnPosition.z = pz;

    this._showVisual(this.visualType, this.staticEffect, { x: nx, z: nz }, this.radius);
    tintObject(this._activeVisual, this.color);

    this.root.visible = true;
    this.root.position.set(px, py, pz);
    this.root.rotation.set(0, 0, 0);

    // Evita fantasma de 1 frame: lerp antigo (morte / PARK_Y) → spawn
    if (!this._prevPos) this._prevPos = new THREE.Vector3();
    if (!this._currPos) this._currPos = new THREE.Vector3();
    this._prevPos.set(px, py, pz);
    this._currPos.set(px, py, pz);
    this._freshSpawn = true;

    return this;
  }

  despawn() {
    this.active = false;
    this.isExpired = false;
    this.hitApplied = false;
    this.life = 0;
    this.speed = 0;
    this.damage = 0;
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.damageRadius = 0;
    this.explosionRadius = 0;
    this.pierce = false;
    this.maxPierce = 64;
    this.pierceCount = 0;
    this.hitIds.clear();
    this.visualOnly = false;
    this.staticEffect = false;
    this.visualType = "orb";
    this._freshSpawn = false;

    this._hideAllVisuals();
    this.root.visible = false;
    this.root.position.set(0, PARK_Y, 0);
    this.root.rotation.set(0, 0, 0);
    if (this._prevPos) this._prevPos.set(0, PARK_Y, 0);
    if (this._currPos) this._currPos.set(0, PARK_Y, 0);
  }

  /**
   * @param {number} delta
   */
  update(delta) {
    if (!this.active) return;

    this.life -= delta;

    if (this.staticEffect) {
      if (this.visualType === "lightning") {
        this.root.rotation.y += delta * 3.2;
        const visual = this._activeVisual;
        if (visual?.children?.length) {
          for (let index = 0; index < visual.children.length; index += 1) {
            const child = visual.children[index];
            const mat = child.material;
            if (mat && mat.opacity !== undefined) {
              const pulse = 0.55 + Math.sin((this.life + index) * 24) * 0.45;
              mat.opacity = Math.max(0.2, pulse);
            }
          }
        }
      }
      if (this.life <= 0) this.isExpired = true;
      return;
    }

    this.root.position.x += this.velocity.x * delta;
    this.root.position.z += this.velocity.z * delta;

    if (this.visualType === "lightning") {
      this.root.rotation.y = Math.atan2(this.velocity.z, this.velocity.x);
      this.root.position.y = 1.8;
    } else if (this.visualType === "bone" || this.visualType === "spear") {
      if (this._activeVisual) {
        this._activeVisual.rotation.z = Math.atan2(this.velocity.z, this.velocity.x);
      }
      this.root.position.y = 1.6;
    } else if (this.visualType === "wind" && this._activeVisual) {
      this._activeVisual.rotation.z = Math.atan2(this.velocity.z, this.velocity.x);
    }

    const traveled = Math.hypot(
      this.root.position.x - this.spawnPosition.x,
      this.root.position.z - this.spawnPosition.z
    );

    const beyondArena =
      Math.abs(this.root.position.x) > this.arenaLimit ||
      Math.abs(this.root.position.z) > this.arenaLimit;

    if (this.life <= 0 || traveled > this.maxDistance || beyondArena) {
      this.isExpired = true;
    }
  }
}

/**
 * Object pool de Projectile — acquire/release sem `new` / `scene.remove`.
 */
export class ProjectilePool {
  /**
   * @param {THREE.Scene} scene
   * @param {number} [capacity=PROJECTILE_POOL_SIZE]
   */
  constructor(scene, capacity = PROJECTILE_POOL_SIZE) {
    this.scene = scene;
    this.capacity = Math.max(1, capacity | 0);
    /** @type {Projectile[]} */
    this.all = [];
    /** @type {Projectile[]} */
    this.free = [];
    /** Lista viva — GameEngine.projectiles aponta para este array. */
    /** @type {Projectile[]} */
    this.active = [];

    for (let i = 0; i < this.capacity; i += 1) {
      const projectile = new Projectile(scene);
      projectile.poolIndex = i;
      this.all.push(projectile);
      this.free.push(projectile);
    }
  }

  get activeCount() {
    return this.active.length;
  }

  get freeCount() {
    return this.free.length;
  }

  get isFull() {
    return this.free.length === 0;
  }

  /**
   * @param {{ x: number, z: number, y?: number }} position
   * @param {{ x: number, z: number }} direction
   * @param {object} [options]
   * @returns {Projectile | null}
   */
  acquire(position, direction, options = {}) {
    const projectile = this.free.pop();
    if (!projectile) return null;
    projectile.spawn(position, direction, options);
    this.active.push(projectile);
    return projectile;
  }

  /**
   * @param {Projectile | null | undefined} projectile
   */
  release(projectile) {
    if (!projectile?.active) return;
    const idx = this.active.indexOf(projectile);
    if (idx >= 0) this.active.splice(idx, 1);
    projectile.despawn();
    this.free.push(projectile);
  }

  /**
   * @param {number} index
   */
  releaseAt(index) {
    if (index < 0 || index >= this.active.length) return;
    const projectile = this.active[index];
    this.active.splice(index, 1);
    projectile.despawn();
    this.free.push(projectile);
  }

  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      this.releaseAt(i);
    }
  }
}
