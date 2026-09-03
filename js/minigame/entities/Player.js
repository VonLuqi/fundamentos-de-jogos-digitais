import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";
// CANNON é acessado do escopo global, carregado via CDN em minigame.html

export class Player {
  /**
   * @param {THREE.Scene} scene – cena onde o mesh será adicionado
   * @param {CANNON.World} physicsWorld – mundo físico do Cannon.js
   * @param {object} [options]
   */
  constructor(scene, physicsWorld, options = {}) {
    const size = options.size ?? 2; // Tamanho do player
    const color = options.color ?? 0x00e5ff; // Ciano vibrante para o player
    
    // Mesh visual (Three.js)
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3, // Brilho sutil
      metalness: 0.1,
      roughness: 0.4,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, size / 2 + 0.7, 0); // Elevar ligeiramente do chão para evitar o efeito de "presas no piso"
    this.mesh.castShadow = true;   // Player projeta sombra
    this.mesh.receiveShadow = true; // Player recebe sombra
    this.mesh.name = "PlayerMesh"; // Para facilitar a busca no RenderSystem
    scene.add(this.mesh);

    this.speed = options.speed ?? 15; // Velocidade ajustada para o novo cenário
    this.arenaLimit = options.arenaLimit ?? 110;

    // Corpo físico (Cannon.js)
    const playerShape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)); // Meia largura, altura, profundidade
    this.body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, size / 2 + 0.7, 0),
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

    console.log("Player: Mesh and Cannon Body created.", this.mesh, this.body);
  }

  /**
   * Atualiza a posição do player no mundo físico.
   * @param {number} delta – tempo em segundos desde o último frame
   * @param {{x:number, z:number}} dir – vetor de direção (x, z) já normalizado
   */
  update(delta, dir) {
    if (!dir) return;

    const currentX = this.body.position.x;
    const currentZ = this.body.position.z;
    const moveSpeed = this.speed;

    const moveX = dir.x * moveSpeed;
    const moveZ = dir.z * moveSpeed;

    const nextX = currentX + moveX * delta;
    const nextZ = currentZ + moveZ * delta;

    const clampedX = THREE.MathUtils.clamp(nextX, -this.arenaLimit, this.arenaLimit);
    const clampedZ = THREE.MathUtils.clamp(nextZ, -this.arenaLimit, this.arenaLimit);

    this.body.position.x = clampedX;
    this.body.position.z = clampedZ;
    this.body.position.y = 1.7;

    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);

    this.mesh.position.copy(this.body.position);
    this.mesh.rotation.x = 0;
    this.mesh.rotation.z = 0;
    this.mesh.rotation.y = 0;
  }
}
