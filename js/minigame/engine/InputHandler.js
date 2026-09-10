/**
 * Input unificado desktop + touch.
 * Teclado (WASD/setas) e Virtual Joystick emitem o mesmo contrato { x, z }
 * (eixo vertical de tela → z no mundo top-down).
 */
export class InputHandler {
  constructor(options = {}) {
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

    /** Vetor analógico do joystick (já normalizado, magnitude 0–1). */
    this.joystick = { x: 0, z: 0, active: false };

    this.maxRadius = Number(options.maxRadius) || 48;
    this._touchId = null;
    this._origin = { x: 0, y: 0 };
    this._root = null;
    this._knob = null;
    this._base = null;
    this._mounted = false;
    this._visible = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerleave", this._onPointerLeave);

    this.mount(options.parent);
  }

  /**
   * Cria / liga o Virtual Joystick no canto inferior esquerdo.
   * @param {ParentNode} [parent]
   */
  mount(parent = document.body) {
    if (this._mounted) return;

    let root = document.getElementById("virtual-joystick");
    if (!root) {
      root = document.createElement("div");
      root.id = "virtual-joystick";
      root.setAttribute("aria-hidden", "true");
      root.innerHTML = `
        <div class="virtual-joystick__base" data-role="base">
          <div class="virtual-joystick__knob" data-role="knob"></div>
        </div>
      `;
      (parent || document.body).appendChild(root);
    }

    this._root = root;
    this._base = root.querySelector('[data-role="base"]') || root;
    this._knob = root.querySelector('[data-role="knob"]');

    this._base.addEventListener("touchstart", this._onTouchStart, { passive: false });
    window.addEventListener("touchmove", this._onTouchMove, { passive: false });
    window.addEventListener("touchend", this._onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", this._onTouchEnd, { passive: false });

    this._mounted = true;
    this._syncVisibility();
  }

  /** Mostra/oculta o joystick (ex.: ao iniciar/pausar a run). */
  setActive(active) {
    this._gameActive = Boolean(active);
    if (!active) this._resetJoystick();
    this._syncVisibility();
  }

  _prefersTouchUi() {
    if (typeof window === "undefined") return false;
    if ("ontouchstart" in window) return true;
    if (navigator.maxTouchPoints > 0) return true;
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }

  _syncVisibility() {
    if (!this._root) return;
    const show = Boolean(this._gameActive) && this._prefersTouchUi();
    this._visible = show;
    this._root.classList.toggle("is-visible", show);
    this._root.setAttribute("aria-hidden", show ? "false" : "true");
  }

  _onKeyDown(e) {
    const key = this._normalizeKey(e.key);
    if (Object.prototype.hasOwnProperty.call(this.keys, key)) {
      this.keys[key] = true;
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    const key = this._normalizeKey(e.key);
    if (Object.prototype.hasOwnProperty.call(this.keys, key)) {
      this.keys[key] = false;
    }
  }

  _normalizeKey(key) {
    if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
      return key;
    }
    return String(key || "").toLowerCase();
  }

  _onPointerMove(event) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    this.mouse.inside = true;
  }

  _onPointerLeave() {
    this.mouse.inside = false;
  }

  _touchPointInBase(touch) {
    if (!this._base) return false;
    const rect = this._base.getBoundingClientRect();
    const pad = 28;
    return (
      touch.clientX >= rect.left - pad &&
      touch.clientX <= rect.right + pad &&
      touch.clientY >= rect.top - pad &&
      touch.clientY <= rect.bottom + pad
    );
  }

  _onTouchStart(event) {
    if (!this._visible || this._touchId !== null) return;

    const touch = event.changedTouches[0];
    if (!touch || !this._touchPointInBase(touch)) return;

    event.preventDefault();
    this._touchId = touch.identifier;

    const rect = this._base.getBoundingClientRect();
    this._origin.x = rect.left + rect.width / 2;
    this._origin.y = rect.top + rect.height / 2;

    this.joystick.active = true;
    this._applyJoystickDelta(touch.clientX - this._origin.x, touch.clientY - this._origin.y);
  }

  _onTouchMove(event) {
    if (this._touchId === null) return;

    let touch = null;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i].identifier === this._touchId) {
        touch = event.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    event.preventDefault();
    this._applyJoystickDelta(touch.clientX - this._origin.x, touch.clientY - this._origin.y);
  }

  _onTouchEnd(event) {
    if (this._touchId === null) return;

    let ended = false;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i].identifier === this._touchId) {
        ended = true;
        break;
      }
    }
    if (!ended) return;

    event.preventDefault();
    this._resetJoystick();
  }

  _applyJoystickDelta(dx, dy) {
    const length = Math.hypot(dx, dy);
    const clamped = Math.min(length, this.maxRadius);
    const nx = length > 0 ? dx / length : 0;
    const ny = length > 0 ? dy / length : 0;
    const magnitude = clamped / this.maxRadius;

    // Tela: +x direita, +y baixo → mundo: +x direita, +z "para baixo" (igual teclado)
    this.joystick.x = nx * magnitude;
    this.joystick.z = ny * magnitude;

    if (this._knob) {
      this._knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
    }
  }

  _resetJoystick() {
    this._touchId = null;
    this.joystick.x = 0;
    this.joystick.z = 0;
    this.joystick.active = false;
    if (this._knob) {
      this._knob.style.transform = "translate(0px, 0px)";
    }
  }

  _keyboardVector() {
    let x = 0;
    let z = 0;
    if (this.keys.ArrowLeft || this.keys.a) x -= 1;
    if (this.keys.ArrowRight || this.keys.d) x += 1;
    if (this.keys.ArrowUp || this.keys.w) z -= 1;
    if (this.keys.ArrowDown || this.keys.s) z += 1;

    if (x !== 0 || z !== 0) {
      const length = Math.hypot(x, z);
      x /= length;
      z /= length;
    }
    return { x, z };
  }

  getMouseAimDirection() {
    // Legado: mira pelo centro da tela (errado na câmera isométrica).
    // Preferir GameEngine.getMouseAimWorldDirection().
    if (!this.mouse.inside) return null;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = this.mouse.x - centerX;
    const dy = this.mouse.y - centerY;
    const length = Math.hypot(dx, dy);
    if (length < 12) return null;

    return {
      x: dx / length,
      z: dy / length,
    };
  }

  /**
   * Vetor de movimento normalizado — contrato único teclado + touch.
   * @returns {{x:number, z:number, y?:number}}
   */
  getMoveVector() {
    const keyboard = this._keyboardVector();
    if (keyboard.x !== 0 || keyboard.z !== 0) {
      return { x: keyboard.x, z: keyboard.z, y: keyboard.z };
    }

    if (this.joystick.active || this.joystick.x !== 0 || this.joystick.z !== 0) {
      return { x: this.joystick.x, z: this.joystick.z, y: this.joystick.z };
    }

    return { x: 0, z: 0, y: 0 };
  }

  /**
   * Alias legado — mesmo contrato de {@link getMoveVector}.
   * @returns {{x:number, z:number}}
   */
  getDirection() {
    const vector = this.getMoveVector();
    return { x: vector.x, z: vector.z };
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerleave", this._onPointerLeave);
    window.removeEventListener("touchmove", this._onTouchMove);
    window.removeEventListener("touchend", this._onTouchEnd);
    window.removeEventListener("touchcancel", this._onTouchEnd);

    if (this._base) {
      this._base.removeEventListener("touchstart", this._onTouchStart);
    }
    if (this._root?.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }

    this._mounted = false;
    this._root = null;
    this._base = null;
    this._knob = null;
  }
}
