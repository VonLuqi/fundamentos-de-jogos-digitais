/** Cap alinhado a `InstancedMesh.count` (§3.2) e ao milestone ≥200. */
export const ENEMY_POOL_SIZE = 256;

/** Fora do frustum enquanto inativo (padrão GDD §5.3). */
export const ENEMY_PARK_Y = -9999;

export const ENEMY_DEFAULT_SIZE = 2.4;
export const ENEMY_DEFAULT_COLOR = 0xff5e5e;

/**
 * Entidade Enemy (§3.1–3.2): lógica de chase/HP sem Mesh na cena.
 * Visual vem do `InstancedMesh` da horda em `RenderSystem`.
 * `mesh` é um Object3D proxy (não renderizado) para interpolação / hits.
 */
export class Enemy {
  /**
   * @param {object} [options]
   * @param {typeof import('https://unpkg.com/three@0.164.0/build/three.module.js')} THREE
   */
  constructor(THREE, options = {}) {
    this.poolIndex = -1;
    this.active = false;
    this.instanceIndex = -1;

    this.size = options.size ?? ENEMY_DEFAULT_SIZE;
    this.scale = 1;
    this.color = options.color ?? ENEMY_DEFAULT_COLOR;
    this.x = 0;
    this.y = ENEMY_PARK_Y;
    this.z = 0;
    this.rotationY = 0;

    this.speed = 0;
    this.hp = 0;
    this.damage = 0;
    this.hitCooldown = 0;

    // Proxy de pose — não entra na scene; serve lerp/colisão/VFX
    this.mesh = new THREE.Object3D();
    this.mesh.name = "EnemyTransform";
    this.mesh.position.set(0, ENEMY_PARK_Y, 0);
  }

  /**
   * Ativa a instância na posição dada (reuso do pool).
   * @param {{ x: number, z: number, y?: number }} position
   * @param {object} [options]
   * @returns {Enemy}
   */
  spawn(position, options = {}) {
    this.active = true;
    this.speed = options.speed ?? 8;
    this.hp = options.hp ?? 1;
    this.damage = options.damage ?? 12;
    this.hitCooldown = 0;
    this.size = options.size ?? this.size ?? ENEMY_DEFAULT_SIZE;
    this.scale = options.scale ?? 1;
    this.rotationY = options.rotationY ?? 0;
    this.color = Number.isFinite(options.color) ? options.color : this.color;

    this.x = position.x;
    this.z = position.z;
    this.y = Number.isFinite(position.y) ? position.y : this.size / 2 + 0.8;

    this.syncMesh();

    if (!this._prevPos) this._prevPos = new THREE.Vector3();
    if (!this._currPos) this._currPos = new THREE.Vector3();
    this._prevPos.set(this.x, this.y, this.z);
    this._currPos.set(this.x, this.y, this.z);
    this._freshSpawn = true;

    return this;
  }

  /** Devolve ao pool: zera estado e estaciona o proxy. */
  despawn() {
    this.active = false;
    this.instanceIndex = -1;
    this.hp = 0;
    this.speed = 0;
    this.damage = 0;
    this.hitCooldown = 0;
    this.rotationY = 0;
    this.scale = 1;
    this.x = 0;
    this.z = 0;
    this.y = ENEMY_PARK_Y;
    this._freshSpawn = false;
    this.mesh.position.set(0, ENEMY_PARK_Y, 0);
    this.mesh.rotation.y = 0;
    this.mesh.scale.setScalar(1);
    if (this._prevPos) this._prevPos.set(0, ENEMY_PARK_Y, 0);
    if (this._currPos) this._currPos.set(0, ENEMY_PARK_Y, 0);
  }

  /** Copia estado lógico → proxy (física); o InstancedMesh lê isso no render. */
  syncMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.rotationY;
    this.mesh.scale.setScalar(this.size * this.scale);
  }

  /**
   * Steering chase no plano XZ.
   * @param {number} delta
   * @param {{ x: number, z: number }} playerPosition
   */
  update(delta, playerPosition) {
    if (!this.active || !playerPosition) return;

    const directionX = playerPosition.x - this.x;
    const directionZ = playerPosition.z - this.z;
    const distance = Math.hypot(directionX, directionZ) || 1;
    const inv = 1 / distance;

    this.x += directionX * inv * this.speed * delta;
    this.z += directionZ * inv * this.speed * delta;
    if (!Number.isFinite(this.x) || !Number.isFinite(this.z)) {
      this.x = playerPosition.x + 8;
      this.z = playerPosition.z + 8;
    }
    this.rotationY = Math.atan2(directionX, directionZ);
    this.syncMesh();

    if (this.hitCooldown > 0) {
      this.hitCooldown = Math.max(0, this.hitCooldown - delta);
    }
  }

  /**
   * @param {number} amount
   * @returns {boolean} true se morreu
   */
  takeDamage(amount) {
    if (!this.active) return false;
    this.hp -= amount;
    return this.hp <= 0;
  }
}

/**
 * Object pool de Enemy — entidades lógicas; visual = InstancedMesh (§3.2).
 */
export class EnemyPool {
  /**
   * @param {typeof import('https://unpkg.com/three@0.164.0/build/three.module.js')} THREE
   * @param {number} [capacity=ENEMY_POOL_SIZE]
   */
  constructor(THREE, capacity = ENEMY_POOL_SIZE) {
    this.THREE = THREE;
    this.capacity = Math.max(1, capacity | 0);
    /** @type {Enemy[]} */
    this.all = [];
    /** @type {Enemy[]} */
    this.free = [];
    /** Lista viva — GameEngine.enemies aponta para este array. */
    /** @type {Enemy[]} */
    this.active = [];

    for (let i = 0; i < this.capacity; i += 1) {
      const enemy = new Enemy(THREE);
      enemy.poolIndex = i;
      this.all.push(enemy);
      this.free.push(enemy);
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
   * @param {object} [options]
   * @returns {Enemy | null}
   */
  acquire(position, options = {}) {
    const enemy = this.free.pop();
    if (!enemy) return null;
    enemy.spawn(position, options);
    this.active.push(enemy);
    return enemy;
  }

  /**
   * @param {Enemy | null | undefined} enemy
   */
  release(enemy) {
    if (!enemy?.active) return;
    const idx = this.active.indexOf(enemy);
    if (idx >= 0) this.active.splice(idx, 1);
    enemy.despawn();
    this.free.push(enemy);
  }

  /**
   * Libera pelo índice em `active` (seguro em loop reverso).
   * @param {number} index
   */
  releaseAt(index) {
    if (index < 0 || index >= this.active.length) return;
    const enemy = this.active[index];
    this.active.splice(index, 1);
    enemy.despawn();
    this.free.push(enemy);
  }

  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      this.releaseAt(i);
    }
  }
}
