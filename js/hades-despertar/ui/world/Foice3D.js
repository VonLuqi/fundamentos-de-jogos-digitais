/**
 * Foice 3D do altar (sprites/foice/foice-3d.glb) — substitui a imagem estática.
 *
 * Orçamento (Fase Perf):
 * - three.js é importado sob demanda, depois do primeiro paint; falhou → fica a imagem antiga.
 * - Zero requestAnimationFrame próprio: `frame(now)` é chamado pelo GameLoop.
 * - Parada: ~30 fps de flutuação suave (só com Fancy e sem reduced-motion); sem isso, desenha só
 *   quando muda. Empunhada / corte: 60 fps. Aba oculta / fora da tela: não desenha.
 * - Pixel ratio limitado (1,5; 1 no Auto-LOD). Contexto WebGL perdido → volta a imagem.
 *
 * Estados: solta, a Foice flutua no altar. Com o ponteiro no altar (ou ao clicar no toque), ela é
 * "empunhada" em primeira pessoa — vem para perto da câmera, cabo saindo do canto inferior direito,
 * e segue o ponteiro de leve. Ao sair, volta a flutuar.
 *
 * Corte (sempre com o fio): o fio é o lado côncavo da lâmina, virado para o cabo. Girar em torno
 * da mão nunca põe o fio na frente (ele só desliza); por isso o golpe é um puxão na diagonal em
 * direção à mão (para baixo e à direita) girando no sentido horário — o côncavo vai à frente e o
 * rastro fica atrás, no dorso. Preparação: a Foice sobe para o alto/esquerda (e se afasta); golpe:
 * desce na diagonal até passar um pouco da mão, vindo para a câmera; hit-stop com tranco; retorno.
 * Cada clique sorteia a inclinação da diagonal (30°–65°), o plano do giro e o tamanho do golpe.
 * Efeitos em 3D: fita varrida pelo fio, faíscas na ponta e luz na lâmina.
 */

const IDLE_FRAME_MS = 33;
const MAX_PIXEL_RATIO = 1.5;
/** Canvas = 128% do botão (CSS absoluto). Medir o botão, nunca o canvas: evita laço de resize. */
const CANVAS_SCALE = 1.28;
/** Teto de segurança do canvas em px CSS (um botão absurdo não pode virar buffer gigante). */
const MAX_CANVAS_CSS = 640;
const COSMETIC_CHECK_MS = 500;
/** Cosméticos da Foice (classes has-cosmetic-*) viram brilho na lâmina em vez de filtro CSS. */
const COSMETIC_GLOW = {
  blade_glow: { color: 0x00e0c8, intensity: 0.04, rim: 4.2 },
  blade_runes: { color: 0xa855f7, intensity: 0.04, rim: 4.2 },
  blade_ember: { color: 0xff5a1f, intensity: 0.05, rim: 4.6 },
  blade_seal: { color: 0xffc76a, intensity: 0.04, rim: 3.8 },
};
const RIM_DEFAULT = { color: 0x2ee6d0, intensity: 2.2 };
const FLASH_COLOR = 0xffc76a;
const SLASH_MS = { windup: 110, strike: 110, hold: 50, recover: 360 };
const SLASH_TOTAL_MS = SLASH_MS.windup + SLASH_MS.strike + SLASH_MS.hold + SLASH_MS.recover;
const HIT_MS = SLASH_MS.windup + SLASH_MS.strike;
const SHAKE_MS = 150;
/** Solta: a Foice deitada na diagonal, como a arte 2D. */
const REST = { x: 0.06, y: 0.18, z: -0.32, px: 0, py: 0, pz: 0 };
/** Empunhada (primeira pessoa): de pé, lâmina no alto, cabo vindo do canto inferior direito. */
const HELD = { x: -0.42, y: -0.72, z: 0.5, px: 0.42, py: -0.3, pz: 0.95 };
/** Mola da pegada: rápida e com um leve "tranco" ao agarrar. */
const GRAB_STIFFNESS = 210;
const GRAB_DAMPING = 19;
/** Toque/teclado: sem hover, a Foice fica empunhada um tempo depois do último corte. */
const GRAB_AFTER_CLICK_MS = 2600;
const CAMERA_Z = 6.2;
const CAMERA_FOV = 30;
/** Fita do fio: amostras a cada 5 ms do golpe (pose analítica), vida curta. */
const TRAIL_STEP_MS = 5;
const TRAIL_LIFE_MS = 300;
const TRAIL_MAX = 64;
const SPARKS = 26;
const SPARK_GRAVITY = -7;

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutQuad = (t) => 1 - (1 - t) ** 2;
const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Sorteia o corte do clique. Sentido sempre o do fio (puxão para a mão, giro horário); o que
 * varia é a diagonal na tela, o plano (eixo inclinado em profundidade) e o tamanho do arco.
 * Exportado para teste e para o rastro 2D (fallback) seguir a mesma diagonal.
 * @param {() => number} [random]
 */
export function rollSlash(random = Math.random) {
  const tiltDeg = 30 + random() * 35;
  const a = tiltDeg * (Math.PI / 180);
  const lean = 0.3 + random() * 0.4;
  const az = random() * Math.PI * 2;
  return {
    /** Varredura do rastro 2D: da esquerda para a direita, descendo. */
    dir: 1,
    tiltDeg,
    /** Ângulo do rastro na tela (graus, sentido horário a partir do eixo X). */
    angleDeg: tiltDeg,
    /** Eixo do giro: perto de +Z, inclinado para dar profundidade (o golpe gira no sentido −). */
    axis: [Math.sin(lean) * Math.cos(az), Math.sin(lean) * Math.sin(az), Math.cos(lean)],
    /** Giro de passagem (após a mão) e de preparação, em rad. */
    arc: (12 + random() * 14) * (Math.PI / 180),
    back: (24 + random() * 14) * (Math.PI / 180),
    /** Quanto a Foice sobe na preparação (unidades da cena). */
    reach: 0.7 + random() * 0.3,
    /** Puxão do golpe: para baixo e à direita, em direção à mão (o fio vai à frente). */
    lunge: [Math.cos(a), -Math.sin(a)],
    lungeScale: 1,
  };
}

/**
 * Pose do corte no instante `t` (ms desde o clique): ângulo em torno de `slash.axis` e
 * deslocamentos sobre a pose base. `emit` = fase em que o fio deixa rastro.
 */
export function slashPose(slash, t) {
  const { windup, strike, hold, recover } = SLASH_MS;
  const ls = slash.lungeScale ?? 1;
  const L = 0.08 * ls;
  const pull = -(slash.reach ?? 0.85) * ls;
  let angle;
  let lunge;
  let scale;
  let flash = 0;
  let emit = false;
  if (t < windup) {
    const k = easeOutQuad(clamp01(t / windup));
    angle = lerp(0, slash.back, k);
    lunge = lerp(0, pull, k);
    scale = lerp(1, 0.95, k);
  } else if (t < HIT_MS) {
    const k = clamp01((t - windup) / strike);
    angle = lerp(slash.back, -slash.arc, easeOutBack(k, 1.1));
    lunge = lerp(pull, L, easeOutCubic(k));
    scale = lerp(0.95, 1.04, easeOutCubic(k));
    flash = k;
    emit = true;
  } else if (t < HIT_MS + hold) {
    angle = -slash.arc; // hit-stop
    lunge = L;
    scale = 1.04;
    flash = 1;
    emit = true;
  } else {
    const k = clamp01((t - HIT_MS - hold) / recover);
    angle = lerp(-slash.arc, 0, easeOutBack(k, 1.2));
    lunge = lerp(L, 0, easeOutCubic(k));
    scale = lerp(1.04, 1, easeOutCubic(k));
    flash = Math.max(0, 1 - k * 2.5);
  }
  const shake = t >= HIT_MS ? Math.max(0, 1 - (t - HIT_MS) / SHAKE_MS) * ls : 0;
  return {
    angle,
    offX: slash.lunge[0] * lunge,
    offY: slash.lunge[1] * lunge,
    // Na preparação se afasta da câmera; no golpe vem para perto.
    offZ: lunge >= 0 ? 1.6 * lunge : 0.35 * lunge,
    scale,
    flash,
    shake,
    emit,
    done: t >= SLASH_TOTAL_MS,
  };
}

/**
 * Um passo da mola da pegada (semi-implícito). Exportado para teste.
 * @returns {{ value: number, velocity: number }}
 */
export function stepGrab(value, velocity, target, dtSec) {
  const dt = Math.min(0.05, Math.max(0, dtSec));
  const v = velocity + (GRAB_STIFFNESS * (target - value) - GRAB_DAMPING * velocity) * dt;
  return { value: value + v * dt, velocity: v };
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
    this._from = null;
    this._burst = false;
    this._trail = [];
    this._trailT = 0;
    this._sparksAlive = 0;
    this._shake = 0;
    this._hover = false;
    this._grabUntil = 0;
    this._grab = 0;
    this._grabV = 0;
    this._aim = { x: 0, y: 0, tx: 0, ty: 0 };
    this._lastFrame = 0;
    this._dirty = true;
    this._onScreen = true;
    this._pixelRatio = 0;
    this._listeners = [];
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

  /** Empunhada (0 = solta, 1 = na mão). Para teste/HUD. */
  get grab() {
    return this._grab;
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
      const rim = new THREE.DirectionalLight(RIM_DEFAULT.color, RIM_DEFAULT.intensity);
      this._rim = rim;
      rim.position.set(3, 1.5, -3);
      const fill = new THREE.PointLight(0xa855f7, 6, 8, 2);
      fill.position.set(1.8, -1.6, 2);
      scene.add(key, rim, fill);
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
      camera.position.set(0, 0, CAMERA_Z);
      this.camera = camera;

      const gltf = await new GLTFLoader().loadAsync(this.modelUrl);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const fit = 2.0 / Math.max(size.x, size.y, size.z);
      const pivot = new THREE.Group();
      pivot.matrixAutoUpdate = false;
      pivot.scale.setScalar(fit);
      pivot.add(model);
      scene.add(pivot);
      this.pivot = pivot;
      this._baseScale = fit;

      this._materials = [];
      this._glowBase = new THREE.Color(0x000000);
      this._glowFlash = new THREE.Color(FLASH_COLOR);
      this._glowIntensity = 0;
      this._cosmeticKey = null;
      this._cosmeticCheckedAt = -Infinity;
      model.traverse((node) => {
        if (!node.isMesh) return;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of mats) {
          m.envMapIntensity = 0.9;
          if (m.emissive) {
            m.emissive.setHex(FLASH_COLOR);
            m.emissiveIntensity = 0;
            this._materials.push(m);
          }
        }
      });
      this.#buildEffects(THREE, model);

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
      this.#bindPointer();

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

  /** Ponteiro no altar = Foice na mão; a posição do ponteiro mira de leve. */
  #bindPointer() {
    const zone = this.button.closest?.('.despertar-reap-stage') || this.button.parentElement || this.button;
    if (!zone?.addEventListener) return;
    const on = (type, fn) => {
      zone.addEventListener(type, fn, { passive: true });
      this._listeners.push([zone, type, fn]);
    };
    const aimAt = (event) => {
      const r = zone.getBoundingClientRect?.();
      if (!r || !r.width || !r.height) return;
      this._aim.tx = Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1));
      this._aim.ty = Math.max(-1, Math.min(1, ((event.clientY - r.top) / r.height) * 2 - 1));
      this._dirty = true;
    };
    on('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      this._hover = true;
      aimAt(event);
    });
    on('pointermove', (event) => {
      if (event.pointerType !== 'touch') aimAt(event);
    });
    on('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      this._hover = false;
      this._aim.tx = 0;
      this._aim.ty = 0;
      this._dirty = true;
    });
  }

  #fallback() {
    this.failed = true;
    this.ready = false;
    this.canvas?.remove?.();
    this.button?.classList?.remove('has-foice-3d');
    const img = this.button?.querySelector?.('[data-reap-foice]');
    if (img) img.hidden = false;
    this.#unbind();
    this.renderer?.dispose?.();
  }

  #unbind() {
    this._io?.disconnect?.();
    this._ro?.disconnect?.();
    for (const [el, type, fn] of this._listeners) el.removeEventListener?.(type, fn);
    this._listeners = [];
  }

  #resize() {
    const motion = this._getMotion();
    const ratio = Math.min(this._win?.devicePixelRatio || 1, motion.lowQuality ? 1 : MAX_PIXEL_RATIO);
    const side = (px) => Math.max(1, Math.min(MAX_CANVAS_CSS, Math.round((px || 220) * CANVAS_SCALE)));
    const w = side(this.button.clientWidth);
    const h = side(this.button.clientHeight || this.button.clientWidth);
    if (ratio === this._pixelRatio && w === this._w && h === this._h) return;
    this._pixelRatio = ratio;
    this._w = w;
    this._h = h;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Lê as classes has-cosmetic-blade_* do botão (barato, a cada 0,5 s) e ajusta o brilho. */
  #syncCosmetic(nowMs) {
    if (nowMs - this._cosmeticCheckedAt < COSMETIC_CHECK_MS) return;
    this._cosmeticCheckedAt = nowMs;
    const id = Object.keys(COSMETIC_GLOW).find((k) => this.button.classList?.contains(`has-cosmetic-${k}`)) || null;
    if (id === this._cosmeticKey) return;
    this._cosmeticKey = id;
    const glow = id ? COSMETIC_GLOW[id] : null;
    // Aura na borda (luz de recorte) + toque de emissive: emissive forte tingia a Foice inteira.
    this._glowBase.setHex(glow ? glow.color : 0x000000);
    this._glowIntensity = glow ? glow.intensity : 0;
    this._rim.color.setHex(glow ? glow.color : RIM_DEFAULT.color);
    this._rim.intensity = glow ? glow.rim : RIM_DEFAULT.intensity;
    this._trailInner?.setHex(glow ? glow.color : RIM_DEFAULT.color);
    this._dirty = true;
  }

  /**
   * Pontos do fio em coordenadas do pivô: a ponta (canto superior esquerdo na pose solta) e um
   * ponto no meio da lâmina, a caminho da cabeça. A fita do rastro vai de um ao outro.
   */
  #findBladePoints(THREE, model) {
    const { pivot } = this;
    pivot.rotation.set(REST.x, REST.y, REST.z);
    pivot.updateMatrix();
    pivot.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    let tip = null;
    let head = null;
    let butt = null;
    let tipScore = -Infinity;
    let headScore = -Infinity;
    let buttScore = Infinity;
    model.traverse((node) => {
      const pos = node.isMesh ? node.geometry?.attributes?.position : null;
      if (!pos) return;
      const step = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
        const ts = v.y - 0.3 * v.x;
        const hs = v.x + v.y;
        if (ts > tipScore) { tipScore = ts; tip = v.clone(); }
        if (hs > headScore) { headScore = hs; head = v.clone(); }
        if (hs < buttScore) { buttScore = hs; butt = v.clone(); }
      }
    });
    const inv = pivot.matrixWorld.clone().invert();
    const tipLocal = (tip || new THREE.Vector3(-0.6, 0.5, 0)).applyMatrix4(inv);
    const headLocal = (head || new THREE.Vector3(0.4, 0.3, 0)).applyMatrix4(inv);
    const buttLocal = (butt || new THREE.Vector3(-1, -0.6, 0)).applyMatrix4(inv);
    return {
      tip: tipLocal,
      inner: tipLocal.clone().lerp(headLocal, 0.3),
      // Onde a mão segura: o golpe gira em torno daqui, e a lâmina varre a tela.
      grip: buttLocal.clone().lerp(headLocal, 0.28),
    };
  }

  /** Fita do fio, faíscas e luz na ponta — tudo criado uma vez, só atualizado no golpe. */
  #buildEffects(THREE, model) {
    const blade = this.#findBladePoints(THREE, model);
    this._tipLocal = blade.tip;
    this._innerLocal = blade.inner;
    this._gripLocal = blade.grip;
    this._gripWorld = new THREE.Vector3();

    const tipLight = new THREE.PointLight(FLASH_COLOR, 0, 2.5, 2);
    tipLight.position.copy(blade.tip);
    this.pivot.add(tipLight);
    this._tipLight = tipLight;

    // Alfa por vértice e blending normal: aditivo num canvas transparente deixava faixa preta.
    const trailGeo = new THREE.BufferGeometry();
    this._trailPos = new Float32Array(TRAIL_MAX * 2 * 3);
    this._trailCol = new Float32Array(TRAIL_MAX * 2 * 4);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this._trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this._trailCol, 4).setUsage(THREE.DynamicDrawUsage));
    const index = [];
    for (let i = 0; i < TRAIL_MAX - 1; i += 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    trailGeo.setIndex(index);
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }));
    trail.frustumCulled = false;
    trail.renderOrder = 2;
    this.scene.add(trail);
    this._trailMesh = trail;
    this._trailInner = new THREE.Color(RIM_DEFAULT.color);

    const dot = this._doc.createElement('canvas');
    dot.width = 32;
    dot.height = 32;
    const ctx = dot.getContext?.('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,240,200,0.8)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    }
    const sparkGeo = new THREE.BufferGeometry();
    this._sparkPos = new Float32Array(SPARKS * 3);
    this._sparkCol = new Float32Array(SPARKS * 4);
    this._sparkVel = new Float32Array(SPARKS * 3);
    this._sparkLife = new Float32Array(SPARKS);
    this._sparkAge = new Float32Array(SPARKS).fill(Infinity);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this._sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(this._sparkCol, 4).setUsage(THREE.DynamicDrawUsage));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
      size: 0.14,
      map: ctx ? new THREE.CanvasTexture(dot) : null,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }));
    sparks.frustumCulled = false;
    sparks.renderOrder = 3;
    sparks.visible = false;
    this.scene.add(sparks);
    this._sparks = sparks;

    this._tmpA = new THREE.Vector3();
    this._tmpB = new THREE.Vector3();
    this._axis = new THREE.Vector3();
    this._euler = new THREE.Euler();
    this._qRest = new THREE.Quaternion();
    this._qHeld = new THREE.Quaternion();
    this._qSlash = new THREE.Quaternion();
    this._qTmp = new THREE.Quaternion();
    this._pos = new THREE.Vector3();
    this._posTmp = new THREE.Vector3();
    this._scl = new THREE.Vector3();
    this._lastPose = { q: new THREE.Quaternion(), pos: new THREE.Vector3(), scale: 1 };
  }

  /**
   * Monta a transformação do pivô em `nowMs`: solta ↔ empunhada (mola) + corte. Sem tocar em
   * materiais: também serve para amostrar o fio em instantes entre frames.
   */
  #applyTransform(nowMs) {
    const motion = this._getMotion();
    const idle = !motion.reducedMotion && motion.fancy;
    const t = nowMs / 1000;
    const g = this._grab;
    const aim = this._aim;
    // Solta: flutua e balança. Na mão: só a respiração do braço + mira no ponteiro.
    const sway = idle ? 1 - clamp01(g) * 0.75 : 0;
    const restY = REST.y + Math.sin(t * 0.7) * 0.22 * sway;
    const restZ = REST.z + Math.sin(t * 0.9) * 0.04 * sway;
    const bob = Math.sin(t * 1.3) * 0.08 * sway;
    this._qRest.setFromEuler(this._euler.set(REST.x, restY, restZ));
    this._qHeld.setFromEuler(this._euler.set(
      HELD.x + aim.y * 0.12,
      HELD.y + aim.x * 0.22,
      HELD.z - aim.x * 0.08,
    ));
    const q = this._qTmp.slerpQuaternions(this._qRest, this._qHeld, g);
    const pos = this._pos.set(
      lerp(REST.px, HELD.px + aim.x * 0.14, g),
      lerp(REST.py, HELD.py - aim.y * 0.1, g) + bob,
      lerp(REST.pz, HELD.pz, g),
    );
    let scale = 1;
    let p = null;
    if (this._slash) {
      const st = nowMs - this._slashStart;
      p = slashPose(this._slash, st);
      const ax = this._slash.axis;
      this._qSlash.setFromAxisAngle(this._axis.set(ax[0], ax[1], ax[2]), p.angle);
      // Gira em torno da mão (não do meio da Foice): pos' = mão + R·(pos − mão).
      const grip = this._gripWorld.copy(this._gripLocal).multiplyScalar(this._baseScale).applyQuaternion(q).add(pos);
      pos.sub(grip).applyQuaternion(this._qSlash).add(grip);
      q.premultiply(this._qSlash);
      pos.x += p.offX;
      pos.y += p.offY;
      pos.z += p.offZ;
      scale = p.scale;
      // Clique no meio de outro golpe: sai da pose atual em vez de pular para a base.
      const from = this._from;
      if (from && st < SLASH_MS.windup) {
        const k = easeOutQuad(st / SLASH_MS.windup);
        q.slerpQuaternions(from.q, this._qSlash.copy(q), k);
        pos.lerpVectors(from.pos, this._posTmp.copy(pos), k);
        scale = lerp(from.scale, scale, k);
      }
    }
    const s = this._baseScale * scale;
    this.pivot.matrix.compose(pos, q, this._scl.set(s, s, s));
    this.pivot.matrixWorldNeedsUpdate = true;
    return p;
  }

  /** Amostra o fio (ponta → meio da lâmina) em coordenadas do mundo. */
  #sampleBlade(nowMs) {
    const m = this.pivot.matrix;
    this._trail.push({
      t: nowMs,
      tip: this._tmpA.copy(this._tipLocal).applyMatrix4(m).toArray(),
      inner: this._tmpB.copy(this._innerLocal).applyMatrix4(m).toArray(),
    });
    if (this._trail.length > TRAIL_MAX) this._trail.shift();
  }

  /** Amostras a cada 5 ms desde o último frame (fita lisa mesmo a 30–60 fps). */
  #emitTrail(nowMs) {
    if (!this._slash || !this._trailMesh || this._slash.calm) return;
    const from = Math.max(this._trailT, this._slashStart + SLASH_MS.windup);
    for (let ts = from + TRAIL_STEP_MS; ts < nowMs; ts += TRAIL_STEP_MS) {
      const p = this.#applyTransform(ts);
      if (p?.emit) this.#sampleBlade(ts);
    }
    this._trailT = nowMs;
  }

  #updateTrail(nowMs) {
    const list = this._trail;
    while (list.length && nowMs - list[0].t > TRAIL_LIFE_MS) list.shift();
    const n = list.length;
    const geo = this._trailMesh.geometry;
    if (n < 2) {
      geo.setDrawRange(0, 0);
      return;
    }
    const pos = this._trailPos;
    const col = this._trailCol;
    const inner = this._trailInner;
    for (let i = 0; i < n; i += 1) {
      const s = list[i];
      const age = clamp01((nowMs - s.t) / TRAIL_LIFE_MS);
      // Some com o tempo e na cauda; a borda do fio é quase branca, o miolo puxa a cor do cosmético.
      const fade = (1 - age) * Math.min(1, (i + 1) / (n * 0.25));
      pos.set(s.tip, i * 6);
      pos.set(s.inner, i * 6 + 3);
      col.set([1, 0.95, 0.8, fade], i * 8);
      col.set([inner.r, inner.g, inner.b, 0.06 * fade], i * 8 + 4);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, (n - 1) * 6);
  }

  /** Faíscas saem da ponta na direção do golpe, no instante do impacto. */
  #burstSparks() {
    if (!this._sparks || this._trail.length < 2) return;
    const a = this._trail[this._trail.length - 1].tip;
    const b = this._trail[Math.max(0, this._trail.length - 4)].tip;
    const len = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    const cx = (a[0] - b[0]) / len;
    const cy = (a[1] - b[1]) / len;
    const r = this._random;
    for (let i = 0; i < SPARKS; i += 1) {
      const speed = 1.8 + r() * 3.2;
      const spread = (r() - 0.5) * 1.6;
      this._sparkPos.set(a, i * 3);
      this._sparkVel[i * 3] = (cx - cy * spread) * speed;
      this._sparkVel[i * 3 + 1] = (cy + cx * spread) * speed + r() * 1.2;
      this._sparkVel[i * 3 + 2] = (r() - 0.3) * 2;
      this._sparkLife[i] = 0.22 + r() * 0.24;
      this._sparkAge[i] = 0;
      const warm = r();
      this._sparkCol.set(warm < 0.75 ? [1, 0.85 + warm * 0.15, 0.55, 1] : [0.6, 1, 0.95, 1], i * 4);
    }
    this._sparksAlive = SPARKS;
    this._sparks.visible = true;
  }

  #updateSparks(dtSec) {
    if (!this._sparksAlive) return;
    let alive = 0;
    const dt = Math.min(0.05, Math.max(0, dtSec));
    for (let i = 0; i < SPARKS; i += 1) {
      const age = (this._sparkAge[i] += dt);
      const life = this._sparkLife[i];
      if (age >= life) {
        this._sparkCol[i * 4 + 3] = 0;
        continue;
      }
      alive += 1;
      const o = i * 3;
      this._sparkVel[o + 1] += SPARK_GRAVITY * dt;
      this._sparkVel[o] *= 0.96;
      this._sparkPos[o] += this._sparkVel[o] * dt;
      this._sparkPos[o + 1] += this._sparkVel[o + 1] * dt;
      this._sparkPos[o + 2] += this._sparkVel[o + 2] * dt;
      this._sparkCol[i * 4 + 3] = (1 - age / life) ** 1.3;
    }
    const geo = this._sparks.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    this._sparksAlive = alive;
    if (!alive) this._sparks.visible = false;
  }

  /** Mola da pegada + mira suavizada. Devolve se ainda está se movendo. */
  #updateGrab(nowMs, dtSec) {
    const motion = this._getMotion();
    const target = this._hover || nowMs < this._grabUntil ? 1 : 0;
    const aim = this._aim;
    if (motion.reducedMotion) {
      this._grab = target;
      this._grabV = 0;
      aim.x = 0;
      aim.y = 0;
      return false;
    }
    const step = stepGrab(this._grab, this._grabV, target, dtSec);
    this._grab = step.value;
    this._grabV = step.velocity;
    if (Math.abs(target - this._grab) < 1e-3 && Math.abs(this._grabV) < 1e-3) {
      this._grab = target;
      this._grabV = 0;
    }
    const k = 1 - Math.exp(-Math.min(0.05, dtSec) * 14);
    aim.x += (aim.tx * target - aim.x) * k;
    aim.y += (aim.ty * target - aim.y) * k;
    const aimMoving = Math.abs(aim.tx * target - aim.x) > 1e-3 || Math.abs(aim.ty * target - aim.y) > 1e-3;
    return this._grab !== target || aimMoving;
  }

  /** Aplica a pose do frame + efeitos (flash, luz da ponta, tranco de câmera). */
  #pose(nowMs) {
    const st = this._slash ? nowMs - this._slashStart : 0;
    const p = this.#applyTransform(nowMs);
    let flash = 0;
    let shake = 0;
    if (p) {
      flash = p.flash;
      shake = p.shake;
      if (p.emit && !this._slash.calm) this.#sampleBlade(nowMs);
      if (!this._burst && st >= HIT_MS) {
        this._burst = true;
        if (!this._slash.calm && !this._getMotion().lowQuality) this.#burstSparks();
      }
      const last = this._lastPose;
      this.pivot.matrix.decompose(last.pos, last.q, this._scl);
      last.scale = this._scl.x / this._baseScale;
      if (p.done) {
        this._slash = null;
        this._from = null;
      }
    }
    // Tranco de câmera + "zoom" no impacto: o golpe pesa sem mexer no layout da página.
    if (shake > 0 || this._shake > 0) {
      const r = this._random;
      const cam = this.camera;
      cam.position.set((r() - 0.5) * 0.07 * shake, (r() - 0.5) * 0.07 * shake, CAMERA_Z);
      cam.fov = CAMERA_FOV - 1.4 * shake;
      cam.updateProjectionMatrix();
      this._shake = shake;
    }
    if (this._tipLight) this._tipLight.intensity = 2.5 * flash;
    // Brilho do cosmético (contínuo) + flash dourado do corte por cima da textura
    // (forte demais estourava a Foice num bege chapado).
    for (const m of this._materials) {
      m.emissive.copy(this._glowBase).lerp(this._glowFlash, flash);
      m.emissiveIntensity = this._glowIntensity * (1 - flash) + flash * 0.06;
    }
  }

  /**
   * Chamado a cada frame pelo GameLoop. Só desenha quando precisa.
   * @param {number} nowMs
   */
  frame(nowMs) {
    if (!this.ready || this._doc?.hidden || !this._onScreen) return;
    const motion = this._getMotion();
    const dtSec = this._lastFrame ? Math.max(0, (nowMs - this._lastFrame) / 1000) : 0;
    const grabbing = this.#updateGrab(nowMs, dtSec);
    const fx = this._trail.length > 0 || this._sparksAlive > 0 || this._shake > 0;
    const animating = Boolean(this._slash) || fx || grabbing;
    const idle = !motion.reducedMotion && motion.fancy;
    if (!animating && !this._dirty) {
      if (!idle || nowMs - this._lastFrame < IDLE_FRAME_MS) return;
    }
    this._lastFrame = nowMs;
    this._dirty = false;
    this.#syncCosmetic(nowMs);
    this.#resize();
    this.#emitTrail(nowMs);
    this.#pose(nowMs);
    if (this._trailMesh) this.#updateTrail(nowMs);
    this.#updateSparks(dtSec);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Dispara o corte do clique (a Foice é empunhada se ainda estava solta). Devolve o corte
   * sorteado (para o rastro 2D no fallback). Com reduced-motion: giro curto, no plano da tela,
   * sem avanço, rastro nem faíscas.
   */
  slash(nowMs, { reducedMotion = false } = {}) {
    const slash = rollSlash(this._random);
    if (reducedMotion) {
      slash.arc *= 0.25;
      slash.back *= 0.3;
      slash.axis = [0, 0, 1];
      slash.lungeScale = 0;
      slash.calm = true;
    }
    this._grabUntil = nowMs + GRAB_AFTER_CLICK_MS;
    if (this.ready) {
      if (this._slash && this._lastPose) {
        const last = this._lastPose;
        this._from = { q: last.q.clone(), pos: last.pos.clone(), scale: last.scale };
      } else {
        this._from = null;
      }
      this._slash = slash;
      this._slashStart = nowMs;
      this._trailT = nowMs;
      this._burst = false;
      this._dirty = true;
    }
    return slash;
  }

  dispose() {
    this.#unbind();
    this.renderer?.dispose?.();
  }
}
