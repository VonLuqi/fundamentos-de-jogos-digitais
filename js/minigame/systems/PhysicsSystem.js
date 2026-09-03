// CANNON é acessado do escopo global, carregado via CDN em minigame.html

export class PhysicsSystem {
  constructor() {
    // Acessar CANNON do escopo global, pois o CDN não é um módulo ES padrão.
    // 'CANNON' é globalmente disponível após o script ser carregado em minigame.html
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // Sem gravidade para jogo top-down
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10; // Mais iterações para maior precisão

    // Materiais de contato padrão (se precisar)
    this.defaultContactMaterial = new CANNON.ContactMaterial(
      new CANNON.Material("default"),
      new CANNON.Material("default"),
      { friction: 0.0, restitution: 0.0 } // Sem atrito, sem salto
    );
    this.world.addContactMaterial(this.defaultContactMaterial);

    console.log("PhysicsSystem: Cannon.js World initialized.", this.world);
  }

  /**
   * Atualiza o mundo físico do Cannon.js
   * @param {number} delta – tempo em segundos desde o último frame
   */
  update(delta) {
    // Usar um fixed time step para física consistente
    const fixedTimeStep = 1 / 60; // 60 updates por segundo
    this.world.step(fixedTimeStep, delta, 3); // maxSubSteps = 3
  }

  /**
   * Adiciona um corpo ao mundo físico.
   * @param {CANNON.Body} body
   */
  addBody(body) {
    this.world.addBody(body);
  }

  /**
   * Remove um corpo do mundo físico.
   * @param {CANNON.Body} body
   */
  removeBody(body) {
    this.world.removeBody(body);
  }
}
