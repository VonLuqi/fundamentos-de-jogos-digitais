export class InputHandler {
  constructor() {
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      w: false,
      a: false,
      s: false,
      d: false,
    };
    this.mouse = {
      x: 0,
      y: 0,
      inside: false,
    };
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerleave', this._onPointerLeave);
  }

  _onKeyDown(e) {
    const key = e.key;
    if (this.keys.hasOwnProperty(key)) {
      this.keys[key] = true;
    }
  }

  _onKeyUp(e) {
    const key = e.key;
    if (this.keys.hasOwnProperty(key)) {
      this.keys[key] = false;
    }
  }

  _onPointerMove(event) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    this.mouse.inside = true;
  }

  _onPointerLeave() {
    this.mouse.inside = false;
  }

  getMouseAimDirection() {
    if (!this.mouse.inside) return null;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = this.mouse.x - centerX;
    const dy = this.mouse.y - centerY;
    const length = Math.hypot(dx, dy) || 1;

    return {
      x: dx / length,
      z: dy / length,
    };
  }

  /**
   * Returns a normalized direction vector (x, z) based on currently pressed keys.
   * Para um jogo top-down, 'y' no input se traduz em 'z' no mundo 3D.
   * @returns {{x:number, z:number}}
   */
  getDirection() {
    let x = 0;
    let z = 0; // Usamos 'z' para o movimento para frente/trás no mundo 3D
    if (this.keys.ArrowLeft || this.keys.a) x -= 1;
    if (this.keys.ArrowRight || this.keys.d) x += 1;
    if (this.keys.ArrowUp || this.keys.w) z -= 1; // 'Para cima' no teclado -> 'para trás' no eixo Z (câmera olhando para -Z)
    if (this.keys.ArrowDown || this.keys.s) z += 1; // 'Para baixo' no teclado -> 'para frente' no eixo Z

    // Normalizar (evita velocidade maior na diagonal)
    if (x !== 0 || z !== 0) {
      const length = Math.hypot(x, z);
      x /= length;
      z /= length;
    }
    return { x, z }; // Retorna x e z
  }
}
