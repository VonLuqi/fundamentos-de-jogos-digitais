/**
 * Foice 3D do altar (sprites/foice/foice-3d.glb) — substitui a imagem estática.
 *
 * Orçamento (Fase Perf):
 * - three.js é importado sob demanda, depois do primeiro paint; falhou → fica a imagem antiga.
 * - Zero requestAnimationFrame próprio: `frame(now)` é chamado pelo GameLoop.
 * - Parada: ~30 fps de balanço suave (só com Fancy e sem reduced-motion); sem isso, desenha só
 *   quando muda. Corte: 60 fps durante ~0,6 s. Aba oculta / fora da tela: não desenha.
 * - Pixel ratio limitado (1,5; 1 no Auto-LOD). Contexto WebGL perdido → volta a imagem.
 *
 * Corte: cada clique sorteia uma diagonal (lado, inclinação e torção) — preparação, golpe com
 * overshoot, hit-stop curto e retorno elástico, com flash na lâmina.
 */

const IDLE_FRAME_MS = 33;
const MAX_PIXEL_RATIO = 1.5;
const SLASH_MS = { windup: 70, strike: 140, hold: 45, recover: 320 };
const SLASH_TOTAL_MS = SLASH_MS.windup + SLASH_MS.strike + SLASH_MS.hold + SLASH_MS.recover;
/** Pose de descanso: a Foice deitada na diagonal, como a arte 2D. */
const REST = { z: -0.32, y: 0.18, x: 0.06 };

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInQuad = (t) => t * t;
const easeOutBack = (t, s = 1.9) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const easeOutElastic = (t) => (t === 0 || t === 1
  ? t
  : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Sorteia o corte do clique: diagonal de 20°–65°, alternando lado com viés, torção 3D.
 * Exportado para teste e para o rastro 2D seguir o mesmo ângulo.
 * @param {() => number} [random]
 * @param {{ lastDir?: number }} [prev]
 */
export function rollSlash(random = Math.random, prev = {}) {
  // 70% de chance de alternar o lado: ritmo de "vai e volta" sem ficar previsível.
  const lastDir = prev.lastDir || (random() < 0.5 ? -1 : 1);
  const dir = random() < 0.7 ? -lastDir : lastDir;
  const tiltDeg = 20 + random() * 45;
  return {
    dir,
    tiltDeg,
    /** Ângulo do rastro na tela (graus, sentido horário a partir do eixo X). */
    angleDeg: dir > 0 ? tiltDeg : 180 - tiltDeg,
    swing: (70 + random() * 40) * (Math.PI / 180),
    twist: (random() * 2 - 1) * 0.5,
    lift: 0.05 + random() * 0.08,
  };
}

/**
 * Pose do corte no instante `t` (ms desde o clique). Devolve deltas sobre a pose de descanso.
 * @returns {{ rotZ: number, rotY: number, offX: number, offY: number, scale: number, flash: number, done: boolean }}
 */
export function slashPose(slash, t) {
  const { windup, strike, hold, recover } = SLASH_MS;
  const tiltRad = slash.tiltDeg * (Math.PI / 180);
  const back = -slash.dir * slash.swing * 0.3;
  const forward = slash.dir * slash.swing;
  let k;
  let rotZ;
  let scale = 1;
  let flash = 0;
  if (t < windup) {
    k = easeInQuad(t / windup);
    rotZ = lerp(0, back, k);
    scale = lerp(1, 0.96, k);
  } else if (t < windup + strike) {
    k = easeOutBack(clamp01((t - windup) / strike));
    rotZ = lerp(back, forward, k);
    scale = lerp(0.96, 1.06, Math.min(1, k));
    flash = Math.min(1, k);
  } else if (t < windup + strike + hold) {
    rotZ = forward; // hit-stop
    scale = 1.06;
    flash = 1;
  } else {
    k = clamp01((t - windup - strike - hold) / recover);
    const e = easeOutElastic(k);
    rotZ = lerp(forward, 0, e);
    scale = lerp(1.06, 1, easeOutCubic(k));
    flash = 1 - easeOutCubic(k);
  }
  const reach = Math.sin(clamp01(t / (windup + strike)) * Math.PI) * (t < windup + strike + hold ? 1 : 0);
  return {
    rotZ,
    rotY: slash.twist * reach,
    offX: Math.cos(tiltRad) * slash.dir * 0.12 * reach,
    offY: Math.sin(tiltRad) * slash.lift * reach,
    scale,
    flash,
    done: t >= SLASH_TOTAL_MS,
  };
}

export class Foice3D {
  /**
   * @param {{
   *   button: HTMLElement, modelUrl: string,
   *   document?: Document, window?: Window,
   *   getMotion?: () => { reducedMotion: boolean, fancy: boolean, lowQuality: boolean },
   *   random?: () => number,
   *   loadThree?: () => Promise<{ THREE: any, GLTFLoader: any, RoomEnvironment: any }>,
   * }} options
   */
  constructor(options) {
    this.button = options.button;
    this.modelUrl = options.modelUrl;
    this._doc = options.document || (typeof document !== 'undefined' ? document : null);
    this._win = options.window || (typeof window !== 'undefined' ? window : null);
    this._getMotion = options.getMotion || (() => ({ reducedMotion: false, fancy: true, lowQuality: false }));
    this._random = options.random || Math.random;
    this._loadThree = options.loadThree || Foice3D.importThree;
    this.ready = false;
    this.failed = false;
    this._slash = null;
    this._slashStart = 0;
    this._lastDir = 0;
    this._lastFrame = 0;
    this._dirty = true;
    this._onScreen = true;
    this._pixelRatio = 0;
  }

  static async importThree() {
    const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
    return { THREE, GLTFLoader, RoomEnvironment };
  }

  /** Sem WebGL não adianta baixar 0,7 MB de modelo. */
  static supportsWebGL(doc) {
    try {
      const probe = doc?.createElement?.('canvas');
      return Boolean(probe?.getContext?.('webgl2') || probe?.getContext?.('webgl'));
    } catch {
      return false;
    }
  }

  async load() {
    if (this.ready || this.failed || !this.button || !this._doc) return false;
    if (!Foice3D.supportsWebGL(this._doc)) {
      this.failed = true;
      return false;
    }
    try {
      const { THREE, GLTFLoader, RoomEnvironment } = await this._loadThree();
      this.THREE = THREE;
      const canvas = this._doc.createElement('canvas');
      canvas.className = 'despertar-reap__foice despertar-reap__foice--3d';
      canvas.setAttribute('aria-hidden', 'true');
      this.canvas = canvas;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: (this._win?.devicePixelRatio || 1) < 1.5,
        powerPreference: 'low-power',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      this.renderer = renderer;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
      pmrem.dispose();

      // Luz do Submundo: chave dourada, recorte do Estige, preenchimento do Lethe.
      scene.add(new THREE.HemisphereLight(0xe8d4a8, 0x0a0a0f, 0.55));
      const key = new THREE.DirectionalLight(0xffd9a0, 2.4);
      key.position.set(-2.5, 3, 4);
      const rim = new THREE.DirectionalLight(0x2ee6d0, 2.2);
      rim.position.set(3, 1.5, -3);
      const fill = new THREE.PointLight(0xa855f7, 6, 8, 2);
      fill.position.set(1.8, -1.6, 2);
      scene.add(key, rim, fill);
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0, 6.2);
      this.camera = camera;

      const gltf = await new GLTFLoader().loadAsync(this.modelUrl);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const fit = 2.0 / Math.max(size.x, size.y, size.z);
      const pivot = new THREE.Group();
      pivot.scale.setScalar(fit);
      pivot.add(model);
      scene.add(pivot);
      this.pivot = pivot;
      this._baseScale = fit;

      this._materials = [];
      model.traverse((node) => {
        if (!node.isMesh) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) {
          m.envMapIntensity = 0.9;
          if (m.emissive) {
            m.emissive.setHex(0xffc76a);
            m.emissiveIntensity = 0;
            this._materials.push(m);
          }
        }
      });

      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault?.();
        this.#fallback();
      });
      if (typeof IntersectionObserver === 'function') {
        this._io = new IntersectionObserver((entries) => {
          this._onScreen = entries.some((e) => e.isIntersecting);
          if (this._onScreen) this._dirty = true;
        });
        this._io.observe(canvas);
      }
      if (typeof ResizeObserver === 'function') {
        this._ro = new ResizeObserver(() => { this._pixelRatio = 0; this._dirty = true; });
        this._ro.observe(this.button);
      }

      const img = this.button.querySelector?.('[data-reap-foice]');
      this.button.insertBefore?.(canvas, img || this.button.firstChild);
      this.button.classList?.add('has-foice-3d');
      this.#resize();
      this.#pose(0);
      renderer.render(scene, camera);
      if (img) img.hidden = true;
      this.ready = true;
      return true;
    } catch (error) {
      if (typeof console !== 'undefined') console.warn('[Foice3D] usando a imagem estática:', error);
      this.#fallback();
      return false;
    }
  }

  #fallback() {
    this.failed = true;
    this.ready = false;
    this.canvas?.remove?.();
    this.button?.classList?.remove('has-foice-3d');
    const img = this.button?.querySelector?.('[data-reap-foice]');
    if (img) img.hidden = false;
    this._io?.disconnect?.();
    this._ro?.disconnect?.();
    this.renderer?.dispose?.();
  }

  #resize() {
    const motion = this._getMotion();
    const ratio = Math.min(this._win?.devicePixelRatio || 1, motion.lowQuality ? 1 : MAX_PIXEL_RATIO);
    const w = Math.max(1, Math.round(this.canvas.clientWidth || this.button.clientWidth || 280));
    const h = Math.max(1, Math.round(this.canvas.clientHeight || this.button.clientHeight || 280));
    if (ratio === this._pixelRatio && w === this._w && h === this._h) return;
    this._pixelRatio = ratio;
    this._w = w;
    this._h = h;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Aplica a pose: descanso + balanço parado + corte. */
  #pose(nowMs) {
    const motion = this._getMotion();
    const idle = !motion.reducedMotion && motion.fancy;
    const t = nowMs / 1000;
    let rotZ = REST.z;
    let rotY = REST.y;
    let posX = 0;
    let posY = 0;
    let scale = 1;
    let flash = 0;
    if (idle) {
      rotY += Math.sin(t * 0.7) * 0.22;
      rotZ += Math.sin(t * 0.9) * 0.04;
      posY += Math.sin(t * 1.3) * 0.05;
    }
    if (this._slash) {
      const p = slashPose(this._slash, nowMs - this._slashStart);
      rotZ += p.rotZ;
      rotY += p.rotY;
      posX += p.offX;
      posY += p.offY;
      scale *= p.scale;
      flash = p.flash;
      if (p.done) this._slash = null;
    }
    this.pivot.rotation.set(REST.x, rotY, rotZ);
    this.pivot.position.set(posX, posY, 0);
    this.pivot.scale.setScalar(this._baseScale * scale);
    // Brilho dourado por cima da textura (forte demais estourava a Foice num bege chapado).
    for (const m of this._materials) m.emissiveIntensity = flash * 0.22;
  }

  /**
   * Chamado a cada frame pelo GameLoop. Só desenha quando precisa.
   * @param {number} nowMs
   */
  frame(nowMs) {
    if (!this.ready || this._doc?.hidden || !this._onScreen) return;
    const motion = this._getMotion();
    const animating = Boolean(this._slash);
    const idle = !motion.reducedMotion && motion.fancy;
    if (!animating && !this._dirty) {
      if (!idle || nowMs - this._lastFrame < IDLE_FRAME_MS) return;
    }
    this._lastFrame = nowMs;
    this._dirty = false;
    this.#resize();
    this.#pose(nowMs);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Dispara o corte diagonal do clique. Devolve o corte sorteado (para o rastro/partículas).
   * Com reduced-motion: corte curto e sem torção.
   */
  slash(nowMs, { reducedMotion = false } = {}) {
    const slash = rollSlash(this._random, { lastDir: this._lastDir });
    if (reducedMotion) {
      slash.swing *= 0.25;
      slash.twist = 0;
      slash.lift = 0;
    }
    this._lastDir = slash.dir;
    if (this.ready) {
      this._slash = slash;
      this._slashStart = nowMs;
      this._dirty = true;
    }
    return slash;
  }

  dispose() {
    this._io?.disconnect?.();
    this._ro?.disconnect?.();
    this.renderer?.dispose?.();
  }
}
