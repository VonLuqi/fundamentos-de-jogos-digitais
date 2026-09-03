import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";

export class Pickup {
  constructor(scene, position, options = {}) {
    const radius = options.radius ?? 0.7;
    const color = options.color ?? 0x6ee7ff;

    this.mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius, 0),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.15,
      })
    );

    this.mesh.position.set(position.x, 1.2, position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.value = options.value ?? 10;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  update(delta) {
    this.mesh.rotation.y += delta * 2;
    this.mesh.position.y = 1.2 + Math.sin((performance.now() * 0.004) + this.floatOffset) * 0.35;
  }
}
