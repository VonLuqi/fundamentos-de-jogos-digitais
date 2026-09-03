import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";

export class Enemy {
  constructor(scene, position, options = {}) {
    const size = options.size ?? 2.4;
    const color = options.color ?? 0xff5e5e;

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.7,
        metalness: 0.1,
      })
    );

    this.mesh.position.set(position.x, size / 2 + 0.8, position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = "EnemyMesh";
    scene.add(this.mesh);

    this.speed = options.speed ?? 8;
    this.hp = options.hp ?? 1;
    this.damage = options.damage ?? 12;
    this.hitCooldown = 0;
  }

  update(delta, playerPosition) {
    if (!playerPosition) return;

    const directionX = playerPosition.x - this.mesh.position.x;
    const directionZ = playerPosition.z - this.mesh.position.z;
    const distance = Math.hypot(directionX, directionZ) || 1;

    this.mesh.position.x += (directionX / distance) * this.speed * delta;
    this.mesh.position.z += (directionZ / distance) * this.speed * delta;

    if (this.hitCooldown > 0) {
      this.hitCooldown = Math.max(0, this.hitCooldown - delta);
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    return this.hp <= 0;
  }
}
