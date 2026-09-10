// CANNON é acessado do escopo global, carregado via CDN em minigame.html

/** Meia-extensão jogável da arena no plano XZ (coincide com Player/Projectile). */
export const ARENA_HALF_EXTENT = 110;

/** Raio padrão de soft separation entre inimigos (§3.3). */
export const ENEMY_SEPARATION_RADIUS = 2.6;

/** Tamanho de célula da grade 2D (GDD §5.4 / plano §4.1). */
export const SPATIAL_CELL_SIZE = 10;

/**
 * Grade de particionamento espacial 2D no plano XZ (§4.1).
 * Rebuild por tick; queries em célula + vizinhança → O(N) médio vs O(N²).
 */
export class SpatialHashGrid {
  /**
   * @param {number} [cellSize=SPATIAL_CELL_SIZE]
   */
  constructor(cellSize = SPATIAL_CELL_SIZE) {
    this.cellSize = Math.max(1, cellSize);
    this.invCell = 1 / this.cellSize;
    /** @type {Map<number, object[]>} */
    this.cells = new Map();
    /** @type {object[][]} */
    this._bucketPool = [];
    /** @type {object[][]} */
    this._activeBuckets = [];
    /** @type {object[] | null} */
    this.entities = null;
    this.version = 0;
  }

  /** Empacota (cx, cz) em chave inteira. */
  pack(cx, cz) {
    return ((cx + 512) << 16) | ((cz + 512) & 0xffff);
  }

  _acquireBucket() {
    const bucket = this._bucketPool.pop();
    if (bucket) {
      bucket.length = 0;
      return bucket;
    }
    return [];
  }

  clear() {
    for (let i = 0; i < this._activeBuckets.length; i += 1) {
      const bucket = this._activeBuckets[i];
      bucket.length = 0;
      this._bucketPool.push(bucket);
    }
    this._activeBuckets.length = 0;
    this.cells.clear();
    this.entities = null;
  }

  /**
   * Insere entidades ativas na grade a partir de `(x, z)`.
   * @param {Array<{ active?: boolean, x?: number, z?: number, mesh?: { position: { x: number, z: number } } }>} entities
   */
  rebuild(entities) {
    this.clear();
    this.entities = entities;
    this.version += 1;
    if (!entities?.length) return;

    const inv = this.invCell;
    for (let i = 0; i < entities.length; i += 1) {
      const e = entities[i];
      if (!e?.active) continue;

      const x = Number.isFinite(e.x) ? e.x : e.mesh?.position?.x ?? 0;
      const z = Number.isFinite(e.z) ? e.z : e.mesh?.position?.z ?? 0;
      const cx = Math.floor(x * inv);
      const cz = Math.floor(z * inv);
      e._gridCellX = cx;
      e._gridCellZ = cz;
      e._gridVersion = this.version;

      const key = this.pack(cx, cz);
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = this._acquireBucket();
        this.cells.set(key, bucket);
        this._activeBuckets.push(bucket);
      }
      bucket.push(e);
    }
  }

  /**
   * Coleta entidades numa bola XZ (célula + anéis necessários).
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @param {object[]} [out]
   * @returns {object[]}
   */
  queryRadius(x, z, radius, out = []) {
    out.length = 0;
    if (!(radius > 0) || this.cells.size === 0) return out;

    const cellRadius = Math.max(1, Math.ceil(radius * this.invCell));
    const cx = Math.floor(x * this.invCell);
    const cz = Math.floor(z * this.invCell);
    const r2 = radius * radius;

    for (let ox = -cellRadius; ox <= cellRadius; ox += 1) {
      for (let oz = -cellRadius; oz <= cellRadius; oz += 1) {
        const bucket = this.cells.get(this.pack(cx + ox, cz + oz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const e = bucket[i];
          if (!e?.active) continue;
          const ex = Number.isFinite(e.x) ? e.x : e.mesh?.position?.x ?? 0;
          const ez = Number.isFinite(e.z) ? e.z : e.mesh?.position?.z ?? 0;
          const dx = ex - x;
          const dz = ez - z;
          if (dx * dx + dz * dz <= r2) out.push(e);
        }
      }
    }
    return out;
  }

  /**
   * Primeiro hit dentro do raio (útil para projéteis pontuais).
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {object | null}
   */
  queryFirst(x, z, radius) {
    if (!(radius > 0) || this.cells.size === 0) return null;

    const cellRadius = Math.max(1, Math.ceil(radius * this.invCell));
    const cx = Math.floor(x * this.invCell);
    const cz = Math.floor(z * this.invCell);
    const r2 = radius * radius;

    for (let ox = -cellRadius; ox <= cellRadius; ox += 1) {
      for (let oz = -cellRadius; oz <= cellRadius; oz += 1) {
        const bucket = this.cells.get(this.pack(cx + ox, cz + oz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const e = bucket[i];
          if (!e?.active) continue;
          const ex = Number.isFinite(e.x) ? e.x : e.mesh?.position?.x ?? 0;
          const ez = Number.isFinite(e.z) ? e.z : e.mesh?.position?.z ?? 0;
          const dx = ex - x;
          const dz = ez - z;
          if (dx * dx + dz * dz <= r2) return e;
        }
      }
    }
    return null;
  }

  /**
   * Inimigo mais próximo de `(x, z)` até `maxRadius`.
   * @param {number} x
   * @param {number} z
   * @param {number} [maxRadius=Infinity]
   * @returns {object | null}
   */
  queryNearest(x, z, maxRadius = Number.POSITIVE_INFINITY) {
    if (this.cells.size === 0) return null;

    const finite = Number.isFinite(maxRadius);
    const cellRadius = finite
      ? Math.max(1, Math.ceil(maxRadius * this.invCell))
      : Math.max(1, Math.ceil(ARENA_HALF_EXTENT * 2 * this.invCell));
    const cx = Math.floor(x * this.invCell);
    const cz = Math.floor(z * this.invCell);
    const maxR2 = finite ? maxRadius * maxRadius : Number.POSITIVE_INFINITY;

    let nearest = null;
    let nearestD2 = maxR2;

    for (let ox = -cellRadius; ox <= cellRadius; ox += 1) {
      for (let oz = -cellRadius; oz <= cellRadius; oz += 1) {
        const bucket = this.cells.get(this.pack(cx + ox, cz + oz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const e = bucket[i];
          if (!e?.active) continue;
          const ex = Number.isFinite(e.x) ? e.x : e.mesh?.position?.x ?? 0;
          const ez = Number.isFinite(e.z) ? e.z : e.mesh?.position?.z ?? 0;
          const dx = ex - x;
          const dz = ez - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < nearestD2) {
            nearestD2 = d2;
            nearest = e;
          }
        }
      }
    }
    return nearest;
  }

  /**
   * Itera vizinhos na janela de células. Callback pode retornar `false` para parar.
   * @param {object} entity
   * @param {(other: object) => (void|boolean)} callback
   * @param {number} [cellWindow=1]
   */
  forEachNeighbor(entity, callback, cellWindow = 1) {
    if (!entity?.active) return;
    const ax = entity._gridCellX ?? Math.floor((entity.x ?? 0) * this.invCell);
    const az = entity._gridCellZ ?? Math.floor((entity.z ?? 0) * this.invCell);
    const w = Math.max(0, cellWindow | 0);

    for (let ox = -w; ox <= w; ox += 1) {
      for (let oz = -w; oz <= w; oz += 1) {
        const bucket = this.cells.get(this.pack(ax + ox, az + oz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const other = bucket[i];
          if (!other?.active || other === entity) continue;
          if (callback(other) === false) return;
        }
      }
    }
  }
}

/**
 * Física top-down da arena (§2.2).
 * Gravity Y=0; passo alinhado ao fixed timestep do GameEngine (60 Hz);
 * chão + 4 paredes estáticas; grade espacial §4.1 + soft separation §3.3.
 */
export class PhysicsSystem {
  /**
   * @param {{ timeStep?: number, arenaHalfExtent?: number, spatialCellSize?: number }} [options]
   */
  constructor(options = {}) {
    this.timeStep = options.timeStep ?? 1 / 60;
    this.arenaHalfExtent = options.arenaHalfExtent ?? ARENA_HALF_EXTENT;

    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.allowSleep = true;

    this.defaultMaterial = new CANNON.Material("arenaDefault");
    this.defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      { friction: 0.0, restitution: 0.0 }
    );
    this.world.addContactMaterial(this.defaultContactMaterial);
    this.world.defaultContactMaterial = this.defaultContactMaterial;

    this.staticBodies = [];
    this.spatialGrid = new SpatialHashGrid(options.spatialCellSize ?? SPATIAL_CELL_SIZE);
    /** Buffer reutilizável para queries de combate. */
    this._queryBuffer = [];
    this._buildArenaBounds();
  }

  get arenaLimit() {
    return this.arenaHalfExtent;
  }

  /** Chão + quatro paredes (AABB) — limites físicos da arena. */
  _buildArenaBounds() {
    const half = this.arenaHalfExtent;
    const wallThickness = 2;
    const wallHeight = 8;
    const wallLength = half * 2 + wallThickness * 2;

    const ground = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
    ground.addShape(new CANNON.Plane());
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    ground.position.set(0, 0, 0);
    this._addStatic(ground);

    const walls = [
      { x: 0, z: -(half + wallThickness / 2), sx: wallLength / 2, sz: wallThickness / 2 },
      { x: 0, z: half + wallThickness / 2, sx: wallLength / 2, sz: wallThickness / 2 },
      { x: -(half + wallThickness / 2), z: 0, sx: wallThickness / 2, sz: wallLength / 2 },
      { x: half + wallThickness / 2, z: 0, sx: wallThickness / 2, sz: wallLength / 2 },
    ];

    for (const wall of walls) {
      const body = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(wall.sx, wallHeight / 2, wall.sz)));
      body.position.set(wall.x, wallHeight / 2, wall.z);
      this._addStatic(body);
    }
  }

  _addStatic(body) {
    this.world.addBody(body);
    this.staticBodies.push(body);
  }

  /**
   * Step alinhado ao fixed timestep do GameEngine.
   * @param {number} dt
   */
  update(dt) {
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : this.timeStep;
    this.world.step(this.timeStep, delta, 2);
  }

  /**
   * Rebuild da grade de inimigos após poses do tick (§4.1).
   * @param {Array} enemies
   */
  rebuildEnemySpatialGrid(enemies) {
    this.spatialGrid.rebuild(enemies);
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @param {object[]} [out]
   * @returns {object[]}
   */
  queryEnemiesNear(x, z, radius, out = this._queryBuffer) {
    return this.spatialGrid.queryRadius(x, z, radius, out);
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} [maxRadius]
   * @returns {object | null}
   */
  queryNearestEnemy(x, z, maxRadius = 48) {
    return this.spatialGrid.queryNearest(x, z, maxRadius);
  }

  /**
   * Clamp utilitário no plano XZ (fallback além das paredes).
   * @param {{ x: number, z: number }} position
   * @returns {{ x: number, z: number }}
   */
  clampToArena(position) {
    const limit = this.arenaHalfExtent;
    return {
      x: Math.max(-limit, Math.min(limit, position.x)),
      z: Math.max(-limit, Math.min(limit, position.z)),
    };
  }

  /**
   * Soft separation da horda (§3.3) usando a SpatialHashGrid (§4.1).
   * Chama `rebuild` internamente nas poses pós-chase.
   *
   * @param {Array<{ active?: boolean, x: number, z: number, syncMesh?: Function }>} enemies
   * @param {{
   *   dt?: number,
   *   separationRadius?: number,
   *   strength?: number,
   *   maxNeighbors?: number,
   * }} [options]
   */
  applyEnemySoftSeparation(enemies, options = {}) {
    const list = enemies;
    const n = list?.length ?? 0;
    if (n < 2) {
      if (n === 1 && list[0]?.active) {
        const clamped = this.clampToArena(list[0]);
        list[0].x = clamped.x;
        list[0].z = clamped.z;
        list[0].syncMesh?.();
      }
      return;
    }

    const dt = Number.isFinite(options.dt) ? Math.max(0, options.dt) : this.timeStep;
    const radius = options.separationRadius ?? ENEMY_SEPARATION_RADIUS;
    const strength = options.strength ?? 7.2;
    const maxNeighbors = options.maxNeighbors ?? 10;
    const radiusSq = radius * radius;

    this.spatialGrid.rebuild(list);

    for (let i = 0; i < n; i += 1) {
      const a = list[i];
      if (!a?.active) continue;

      let pushX = 0;
      let pushZ = 0;
      let counted = 0;

      this.spatialGrid.forEachNeighbor(a, (other) => {
        if (counted >= maxNeighbors) return false;
        const dx = a.x - other.x;
        const dz = a.z - other.z;
        const d2 = dx * dx + dz * dz;

        if (d2 <= 1e-8) {
          const ang = (i * 2.399963 + counted) % (Math.PI * 2);
          pushX += Math.cos(ang);
          pushZ += Math.sin(ang);
          counted += 1;
        } else if (d2 < radiusSq) {
          const dist = Math.sqrt(d2);
          const overlap = (radius - dist) / radius;
          const inv = overlap / dist;
          pushX += dx * inv;
          pushZ += dz * inv;
          counted += 1;
        }
        if (counted >= maxNeighbors) return false;
      }, 1);

      if (counted > 0) {
        a.x += pushX * strength * dt;
        a.z += pushZ * strength * dt;
      }

      const clamped = this.clampToArena(a);
      a.x = clamped.x;
      a.z = clamped.z;
      a.syncMesh?.();
    }
  }

  /**
   * @param {CANNON.Body} body
   */
  addBody(body) {
    this.world.addBody(body);
  }

  /**
   * @param {CANNON.Body} body
   */
  removeBody(body) {
    this.world.removeBody(body);
  }
}
