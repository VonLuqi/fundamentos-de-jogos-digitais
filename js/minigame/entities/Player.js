import * as THREE from "../three.js";
// CANNON é acessado do escopo global, carregado via CDN em minigame.html
import { ARENA_HALF_EXTENT } from "../systems/PhysicsSystem.js";

/**
 * Entidade Player (§2.1):
 * posição, velocidade, HP, corpo Cannon e facing (rotationY) a partir do vetor de movimento.
 * Visual: threejs-geometry + threejs-materials (low-poly PBR).
 */
export class Player {
  /**
   * @param {THREE.Scene} scene
   * @param {CANNON.World} physicsWorld
   * @param {object} [options]
   */
  constructor(scene, physicsWorld, options = {}) {
    const size = options.size ?? 2;
    const color = options.color ?? 0x00e5ff;
    const groundOffset = size / 2 + 0.7;

    this.size = size;
    this.speed = options.speed ?? 15;
    this.baseSpeed = this.speed;
    this.arenaLimit = options.arenaLimit ?? ARENA_HALF_EXTENT;

    this.hp = options.hp ?? 100;
    this.maxHp = options.maxHp ?? this.hp;
    this.baseMaxHp = this.maxHp;

    /** Direção de facing no plano XZ (normalizada). Default: “norte” (-Z). */
    this.facing = { x: 0, z: -1 };
    this.rotationY = 0;

    // Corpo — BoxGeometry + PBR emissive (skills geometry/materials)
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      metalness: 0.15,
      roughness: 0.45,
      flatShading: true,
      fog: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, groundOffset, 0);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = "PlayerMesh";
    this.mesh.frustumCulled = true;

    // Indicador de frente (cone) — deixa o rotationY legível no top-down
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.22, size * 0.55, 4),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        metalness: 0.2,
        roughness: 0.4,
        flatShading: true,
        fog: true,
      })
    );
    nose.name = "PlayerFacing";
    nose.rotation.x = Math.PI / 2; // eixo do cone → +Z local
    nose.position.set(0, 0, size * 0.55);
    nose.castShadow = true;
    this.mesh.add(nose);

    this.mesh.rotation.y = this.rotationY;
    scene.add(this.mesh);

    const half = size / 2;
    const playerShape = new CANNON.Box(new CANNON.Vec3(half, half, half));
    this.body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, groundOffset, 0),
      shape: playerShape,
      linearDamping: 0,
      angularDamping: 0,
    });
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.allowSleep = false;
    this.body.fixedRotation = true;
    this.body.updateMassProperties();
    physicsWorld.addBody(this.body);

    this._groundY = groundOffset;
  }

  /** Posição lógica no mundo (proxy do corpo físico). */
  get position() {
    return this.body.position;
  }

  /**
   * Movimento + clamp de arena + facing pelo vetor de input.
   * @param {number} delta
   * @param {{x?:number, z?:number, y?:number}|null} dir Vetor normalizado (getMoveVector)
   */
  update(delta, dir) {
    if (!dir) return;

    const inputX = Number(dir.x) || 0;
    const inputZ = Number(dir.z) || 0;
    const moving = Math.hypot(inputX, inputZ) > 0.001;

    if (moving) {
      const moveSpeed = this.speed;
      const nextX = this.body.position.x + inputX * moveSpeed * delta;
      const nextZ = this.body.position.z + inputZ * moveSpeed * delta;

      this.body.position.x = THREE.MathUtils.clamp(nextX, -this.arenaLimit, this.arenaLimit);
      this.body.position.z = THREE.MathUtils.clamp(nextZ, -this.arenaLimit, this.arenaLimit);

      // Facing: atan2(x, z) → rotationY no Object3D (threejs-fundamentals)
      this.facing.x = inputX;
      this.facing.z = inputZ;
      this.rotationY = Math.atan2(inputX, inputZ);
    }

    this.body.position.y = this._groundY;
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);

    this.mesh.position.copy(this.body.position);
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;
    this.mesh.rotation.y = this.rotationY;
  }

  /** Vetor unitário na direção que o campeão está olhando. */
  getFacingDirection() {
    return { x: this.facing.x, z: this.facing.z };
  }
}
