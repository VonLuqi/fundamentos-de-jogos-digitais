import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";

export class Projectile {
  constructor(scene, position, direction, options = {}) {
    const radius = options.radius ?? 0.45;
    const color = options.color ?? 0xffd166;
    const visualType = options.visualType ?? "orb";
    const staticEffect = options.staticEffect ?? false;
    const visualOnly = options.visualOnly ?? false;
    this.damageRadius = options.damageRadius ?? 0;

    if (visualType === "lightning") {
      if (staticEffect) {
        this.mesh = new THREE.Group();

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.65, 1.9, 28),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;

        const pulse = new THREE.Mesh(
          new THREE.RingGeometry(0.3, 0.75, 20),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          })
        );
        pulse.rotation.x = -Math.PI / 2;
        pulse.position.y = 0.1;

        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.8,
            roughness: 0.2,
            metalness: 0.1,
          })
        );
        pillar.position.y = 1.2;

        this.mesh.add(ring, pulse, pillar);
      } else {
        this.mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 3.2, 0.28),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.5,
            roughness: 0.15,
            metalness: 0.25,
          })
        );
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.rotation.z = Math.PI / 2;
      }
    } else if (visualType === "wind") {
      this.mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 4.5, 6, 1, false),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.7,
          roughness: 0.4,
          metalness: 0.05,
        })
      );
      this.mesh.rotation.x = Math.PI / 2;
      this.mesh.rotation.z = Math.atan2(direction.z, direction.x);
    } else {
      this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 12),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.25,
        })
      );
    }

    this.mesh.position.set(position.x, 1.8, position.z);
    scene.add(this.mesh);

    this.speed = options.speed ?? 28;
    this.damage = options.damage ?? 1;
    this.life = options.life ?? 1.8;
    this.velocity = {
      x: direction.x * this.speed,
      z: direction.z * this.speed,
    };
    this.maxDistance = options.maxDistance ?? 18;
    this.arenaLimit = options.arenaLimit ?? 110;
    this.strokeLength = visualType === "lightning" ? 3.2 : 0;
    this.spawnPosition = { x: position.x, z: position.z };
    this.visualType = visualType;
    this.staticEffect = staticEffect;
    this.visualOnly = visualOnly;
    this.isExpired = false;
    this.hitApplied = false;
  }

  update(delta) {
    this.life -= delta;

    if (this.staticEffect) {
      if (this.visualType === "lightning") {
        this.mesh.rotation.y = (this.mesh.rotation.y ?? 0) + delta * 3.2;
        if (this.mesh.children && this.mesh.children.length > 1) {
          this.mesh.children.forEach((child, index) => {
            if (child.material && child.material.opacity !== undefined) {
              const pulse = 0.55 + Math.sin((this.life + index) * 24) * 0.45;
              child.material.opacity = Math.max(0.2, pulse);
            }
          });
        }
      }
      if (this.life <= 0) {
        this.isExpired = true;
      }
      return;
    }

    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.z += this.velocity.z * delta;

    if (this.visualType === "lightning") {
      this.mesh.rotation.y = Math.atan2(this.velocity.z, this.velocity.x);
      this.mesh.position.y = 1.8;
    }

    const traveled = Math.hypot(
      this.mesh.position.x - this.spawnPosition.x,
      this.mesh.position.z - this.spawnPosition.z
    );

    const beyondArena =
      Math.abs(this.mesh.position.x) > this.arenaLimit ||
      Math.abs(this.mesh.position.z) > this.arenaLimit;

    if (this.life <= 0 || traveled > this.maxDistance || beyondArena) {
      this.isExpired = true;
    }
  }
}