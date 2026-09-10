/**
 * RenderSystem — alinhado às skills do repo:
 * - threejs-fundamentals (cena, câmera ortho isométrica, renderer, Groups, fog)
 * - threejs-animation (follow com lerp / Clock delta)
 * - threejs-lighting (hemisphere + ambient + directional + shadows)
 * - threejs-materials (MeshStandardMaterial PBR / flatShading low-poly)
 * - threejs-geometry (Plane/Box + InstancedMesh para detritos e horda)
 * - threejs-postprocessing (UnrealBloomPass suave para VFX emissive §4.5)
 */
import * as THREE from "../three.js";
import { ENEMY_POOL_SIZE, ENEMY_DEFAULT_COLOR, ENEMY_PARK_Y } from "../entities/Enemy.js";

export class RenderSystem {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.followTarget = null;
    this.frustumSize = 52;
    this.arenaSize = 240;
    this._dummy = new THREE.Object3D();
    this._tmpColor = new THREE.Color();
    /** @type {THREE.InstancedMesh | null} */
    this.enemyHorde = null;
    /** @type {Array<{ active?: boolean, mesh?: THREE.Object3D, rotationY?: number, scale?: number, size?: number, color?: number }> | null} */
    this._enemyHordeEntities = null;
    /** @type {import('three/addons/postprocessing/EffectComposer.js').EffectComposer | null} */
    this.composer = null;
    /** @type {import('three/addons/postprocessing/UnrealBloomPass.js').UnrealBloomPass | null} */
    this.bloomPass = null;
    this._postFxReady = false;

    // §2.3 — follow isométrico (~55° de elevação) + suavização
    // elevação = atan(y / sqrt(x²+z²)) ≈ atan(38/28.3) ≈ 53°
    this.cameraOffset = new THREE.Vector3(20, 38, 20);
    this.cameraFollowDamping = 8.5; // 1/s — skill animation (procedural / delta)
    this._clock = new THREE.Clock();
    this._desiredCamPos = new THREE.Vector3();
    this._desiredLookAt = new THREE.Vector3();
    this._smoothedLookAt = new THREE.Vector3(0, 0, 0);
    this._cameraInitialized = false;

    this._initRenderer(canvas);
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initArena();
    this.initEnemyHorde(ENEMY_POOL_SIZE);
    // Bloom é opcional e assíncrono — não pode derrubar o import do RenderSystem
    void this._initPostProcessing();

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  /** threejs-fundamentals — WebGLRenderer + tone mapping + shadows */
  _initRenderer(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0908, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    if ("outputColorSpace" in this.renderer) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
  }

  /** threejs-fundamentals — Scene background + fog */
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1410);
    // Fog leve — densidade alta apagava chão/inimigos no framing isométrico
    this.scene.fog = new THREE.FogExp2(0x1a1410, 0.0035);
  }

  /** threejs-fundamentals — OrthographicCamera com framing isométrico (~45–60°) */
  _initCamera() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const fs = this.frustumSize;
    this.camera = new THREE.OrthographicCamera(
      (fs * aspect) / -2,
      (fs * aspect) / 2,
      fs / 2,
      fs / -2,
      0.1,
      1000
    );
    this.camera.name = "ArenaCamera";

    const o = this.cameraOffset;
    this.camera.position.set(o.x, o.y, o.z);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this._smoothedLookAt.set(0, 0, 0);
    this._cameraInitialized = false;
  }

  /**
   * Elevação atual da câmera em graus (debug / tuning §2.3).
   * @returns {number}
   */
  getCameraElevationDeg() {
    const o = this.cameraOffset;
    const horiz = Math.hypot(o.x, o.z) || 1;
    return (Math.atan2(o.y, horiz) * 180) / Math.PI;
  }

  /**
   * Ajusta o offset isométrico preservando o framing jogável.
   * @param {{ x?: number, y?: number, z?: number }} offset
   */
  setCameraOffset(offset = {}) {
    if (Number.isFinite(offset.x)) this.cameraOffset.x = offset.x;
    if (Number.isFinite(offset.y)) this.cameraOffset.y = offset.y;
    if (Number.isFinite(offset.z)) this.cameraOffset.z = offset.z;
  }

  /** threejs-postprocessing — bloom suave (lazy import; falha ≠ bloquear partida) */
  async _initPostProcessing() {
    try {
      const [
        { EffectComposer },
        { RenderPass },
        { UnrealBloomPass },
      ] = await Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"),
        import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"),
      ]);

      const width = this.canvas.clientWidth || window.innerWidth || 1;
      const height = this.canvas.clientHeight || window.innerHeight || 1;

      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.composer.setSize(width, height);

      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.22,
        0.4,
        0.82
      );
      this.composer.addPass(this.bloomPass);
      this._postFxReady = true;
    } catch (error) {
      console.warn("RenderSystem: postprocessing indisponível; usando render direto.", error);
      this.composer = null;
      this.bloomPass = null;
      this._postFxReady = false;
    }
  }

  /** threejs-lighting — Hemisphere + Ambient fill + Directional key com shadows */
  _initLights() {
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = "lightsGroup";
    this.scene.add(this.lightsGroup);

    // Céu arcano / chão vulcânico — fill mais forte para leitura no top-down
    this.hemiLight = new THREE.HemisphereLight(0xb07acc, 0x3a2818, 1.15);
    this.hemiLight.name = "HemiLight";
    this.hemiLight.position.set(0, 50, 0);
    this.lightsGroup.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xc4a484, 0.85);
    this.ambientLight.name = "AmbientFill";
    this.lightsGroup.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffb066, 2.8);
    this.dirLight.name = "KeySun";
    this.dirLight.position.set(25, 40, 20);
    this.dirLight.castShadow = true;
    this.dirLight.target.position.set(0, 0, 0);
    this.lightsGroup.add(this.dirLight);
    this.lightsGroup.add(this.dirLight.target);

    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.bias = -0.0001;
    this.dirLight.shadow.normalBias = 0.02;
    this._updateShadowFrustum(window.innerWidth / Math.max(1, window.innerHeight));
  }

  _updateShadowFrustum(aspect) {
    const shadowArea = 45;
    const cam = this.dirLight.shadow.camera;
    cam.left = -shadowArea * aspect;
    cam.right = shadowArea * aspect;
    cam.top = shadowArea;
    cam.bottom = -shadowArea;
    cam.updateProjectionMatrix();
  }

  /**
   * threejs-geometry + materials — chão PlaneGeometry + pedrinhas via InstancedMesh
   * (1 draw call para detritos estáticos, conforme skill geometry).
   */
  _initArena() {
    const oldTerrainGroup = this.scene.getObjectByName("terrainGroup");
    if (oldTerrainGroup) {
      this.scene.remove(oldTerrainGroup);
      oldTerrainGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    }

    this.terrainGroup = new THREE.Group();
    this.terrainGroup.name = "terrainGroup";
    this.scene.add(this.terrainGroup);

    const arenaSize = this.arenaSize;
    const halfArena = arenaSize / 2;

    // Chão — MeshStandardMaterial PBR (threejs-materials)
    const groundGeometry = new THREE.PlaneGeometry(arenaSize, arenaSize, 1, 1);
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1c,
      roughness: 0.82,
      metalness: 0.06,
      flatShading: true,
      fog: true,
    });
    const mainGround = new THREE.Mesh(groundGeometry, this.groundMaterial);
    mainGround.name = "ArenaGround";
    mainGround.rotation.x = -Math.PI / 2;
    mainGround.position.y = 0;
    mainGround.receiveShadow = true;
    mainGround.castShadow = false;
    this.terrainGroup.add(mainGround);

    // Pedrinhas low-poly — InstancedMesh + instanceColor (threejs-geometry)
    const pebbleCount = 200;
    const pebbleGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.pebbleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.05,
      flatShading: true,
      fog: true,
    });
    const pebbles = new THREE.InstancedMesh(pebbleGeometry, this.pebbleMaterial, pebbleCount);
    pebbles.name = "ArenaPebbles";
    // Sem castShadow: 200 instâncias no shadow map geravam hitch periódico (~5s)
    pebbles.castShadow = false;
    pebbles.receiveShadow = true;
    pebbles.frustumCulled = true;

    const pebbleColors = [0x2a2018, 0x3a2a20, 0x4a3428, 0x352818, 0x463020];
    for (let i = 0; i < pebbleCount; i += 1) {
      const height = THREE.MathUtils.randFloat(0.1, 0.5);
      const width = THREE.MathUtils.randFloat(0.5, 2.5);
      const depth = THREE.MathUtils.randFloat(0.5, 2.5);

      this._dummy.position.set(
        THREE.MathUtils.randFloat(-halfArena + 5, halfArena - 5),
        height / 2,
        THREE.MathUtils.randFloat(-halfArena + 5, halfArena - 5)
      );
      this._dummy.rotation.set(0, THREE.MathUtils.randFloat(0, Math.PI * 2), 0);
      this._dummy.scale.set(width, height, depth);
      this._dummy.updateMatrix();
      pebbles.setMatrixAt(i, this._dummy.matrix);

      this._tmpColor.setHex(pebbleColors[i % pebbleColors.length]);
      pebbles.setColorAt(i, this._tmpColor);
    }

    pebbles.instanceMatrix.needsUpdate = true;
    if (pebbles.instanceColor) {
      pebbles.instanceColor.needsUpdate = true;
    }

    this.terrainGroup.add(pebbles);
    this.pebbleInstances = pebbles;
  }

  /**
   * §3.2 — InstancedMesh da horda (1 draw call; skills geometry + materials).
   * Cap = `count` máximo do buffer (= ENEMY_POOL_SIZE).
   * @param {number} [capacity=ENEMY_POOL_SIZE]
   */
  initEnemyHorde(capacity = ENEMY_POOL_SIZE) {
    const old = this.scene.getObjectByName("EnemyHorde");
    if (old) {
      this.scene.remove(old);
      if (old.geometry) old.geometry.dispose();
      if (old.material) old.material.dispose();
    }

    const maxCount = Math.max(1, capacity | 0);
    // Unit box — escala por `enemy.size * scale` no sync (skill geometry)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.enemyHordeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xc02028,
      emissiveIntensity: 0.85,
      roughness: 0.45,
      metalness: 0.08,
      flatShading: true,
      fog: true,
    });

    const horde = new THREE.InstancedMesh(geometry, this.enemyHordeMaterial, maxCount);
    horde.name = "EnemyHorde";
    horde.castShadow = false;
    horde.receiveShadow = true;
    // Arena grande + instâncias dinâmicas: culling por bounds do mesh raiz é enganoso
    horde.frustumCulled = false;
    horde.count = 0;

    this._dummy.position.set(0, ENEMY_PARK_Y, 0);
    this._dummy.rotation.set(0, 0, 0);
    this._dummy.scale.setScalar(1);
    this._dummy.updateMatrix();
    this._tmpColor.setHex(ENEMY_DEFAULT_COLOR);

    for (let i = 0; i < maxCount; i += 1) {
      horde.setMatrixAt(i, this._dummy.matrix);
      horde.setColorAt(i, this._tmpColor);
    }
    horde.instanceMatrix.needsUpdate = true;
    if (horde.instanceColor) {
      horde.instanceColor.needsUpdate = true;
    }

    this.scene.add(horde);
    this.enemyHorde = horde;
    this.enemyHordeCapacity = maxCount;
  }

  /**
   * Liga a lista viva do pool para sync no render (após interpolação).
   * @param {Array} enemies
   */
  setEnemyHordeEntities(enemies) {
    this._enemyHordeEntities = enemies;
  }

  /**
   * Atualiza matrizes/cores da horda a partir das entidades ativas (GDD §5.3).
   * Usa `mesh.position` (já lerped) para render suave.
   * @param {Array} [enemies]
   * @param {THREE.InstancedMesh} [instancedMesh]
   */
  updateEnemyHordeInstances(enemies = this._enemyHordeEntities, instancedMesh = this.enemyHorde) {
    if (!instancedMesh || !enemies) return;

    const maxCount = this.enemyHordeCapacity ?? instancedMesh.count;
    const n = Math.min(enemies.length, maxCount);
    const dummy = this._dummy;
    const color = this._tmpColor;

    for (let i = 0; i < n; i += 1) {
      const enemy = enemies[i];
      if (!enemy?.active) {
        dummy.position.set(0, ENEMY_PARK_Y, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const pos = enemy.mesh?.position;
      dummy.position.set(
        pos?.x ?? enemy.x ?? 0,
        pos?.y ?? enemy.y ?? 0,
        pos?.z ?? enemy.z ?? 0
      );
      dummy.rotation.set(0, enemy.rotationY ?? enemy.mesh?.rotation?.y ?? 0, 0);
      const size = enemy.size ?? 1;
      const scale = enemy.scale ?? 1;
      const sx = enemy.mesh?.scale?.x;
      const uniform = Number.isFinite(sx) && sx > 0 ? sx : size * scale;
      dummy.scale.setScalar(uniform);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);

      color.setHex(enemy.color ?? ENEMY_DEFAULT_COLOR);
      instancedMesh.setColorAt(i, color);

      enemy.instanceIndex = i;
    }

    // Esconde slots órfãos quando a horda encolhe (evita “fantasmas” de 1 frame)
    const prevCount = this._enemyHordeDrawn ?? 0;
    if (prevCount > n) {
      dummy.position.set(0, ENEMY_PARK_Y, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      const clearUntil = Math.min(prevCount, maxCount);
      for (let i = n; i < clearUntil; i += 1) {
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
    }
    this._enemyHordeDrawn = n;

    instancedMesh.count = n;
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Converte input de tela (x direita, z baixo) → XZ mundo na câmera isométrica.
   * Sem isso, WASD/joystick empurram nos eixos do mundo e “baixo” vira diagonal na tela.
   * @param {number} screenX
   * @param {number} screenZ
   * @returns {{ x: number, z: number }}
   */
  screenToWorldMove(screenX = 0, screenZ = 0) {
    const mag = Math.hypot(screenX, screenZ);
    if (mag < 1e-6) return { x: 0, z: 0 };

    const sx = screenX / mag;
    const sz = screenZ / mag;
    const o = this.cameraOffset;
    const flen = Math.hypot(o.x, o.z) || 1;

    // "Cima" na tela = afastar da câmera no chão
    const upX = -o.x / flen;
    const upZ = -o.z / flen;
    // "Direita" na tela (negado vs cross(up,forward) — espelhava A/D no iso)
    const rightX = -upZ;
    const rightZ = upX;

    // screenZ > 0 = baixo na tela = −up
    let x = rightX * sx + upX * -sz;
    let z = rightZ * sx + upZ * -sz;
    const len = Math.hypot(x, z) || 1;
    x = (x / len) * Math.min(1, mag);
    z = (z / len) * Math.min(1, mag);
    return { x, z };
  }

  /**
   * Ponto no plano Y=0 sob o cursor (para mira da Lança).
   * @param {number} clientX
   * @param {number} clientY
   * @returns {THREE.Vector3 | null}
   */
  unprojectToGround(clientX, clientY) {
    const canvas = this.canvas;
    if (!canvas || !this.camera) return null;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    const ndcX = ((clientX - rect.left) / width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / height) * 2 - 1);

    if (!this._raycaster) this._raycaster = new THREE.Raycaster();
    if (!this._groundPlane) this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (!this._groundHit) this._groundHit = new THREE.Vector3();
    if (!this._ndc) this._ndc = new THREE.Vector2();

    this._ndc.set(ndcX, ndcY);
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const hit = this._raycaster.ray.intersectPlane(this._groundPlane, this._groundHit);
    return hit ? this._groundHit : null;
  }

  /**
   * Bordas visuais da área jogável (espelha paredes Cannon do PhysicsSystem).
   * Skills: geometry (BoxGeometry) + materials (emissive rim).
   * @param {number} halfExtent
   */
  buildArenaBoundary(halfExtent = 110) {
    const old = this.scene.getObjectByName("arenaBoundaryGroup");
    if (old) {
      this.scene.remove(old);
      old.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    }

    const group = new THREE.Group();
    group.name = "arenaBoundaryGroup";

    const thickness = 1.6;
    const height = 1.2;
    const length = halfExtent * 2 + thickness;
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b0764,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.45,
      roughness: 0.55,
      metalness: 0.25,
      flatShading: true,
      fog: true,
      transparent: true,
      opacity: 0.85,
    });

    const specs = [
      { x: 0, z: -(halfExtent + thickness / 2), sx: length, sz: thickness },
      { x: 0, z: halfExtent + thickness / 2, sx: length, sz: thickness },
      { x: -(halfExtent + thickness / 2), z: 0, sx: thickness, sz: length },
      { x: halfExtent + thickness / 2, z: 0, sx: thickness, sz: length },
    ];

    for (const spec of specs) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(spec.sx, height, spec.sz),
        rimMaterial
      );
      mesh.position.set(spec.x, height / 2, spec.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // Faixa no chão ao longo do perímetro jogável
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const floorThickness = 1.1;
    const floorSpecs = [
      { x: 0, z: -halfExtent, sx: halfExtent * 2, sz: floorThickness },
      { x: 0, z: halfExtent, sx: halfExtent * 2, sz: floorThickness },
      { x: -halfExtent, z: 0, sx: floorThickness, sz: halfExtent * 2 },
      { x: halfExtent, z: 0, sx: floorThickness, sz: halfExtent * 2 },
    ];
    for (const spec of floorSpecs) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(spec.sx, 0.06, spec.sz), floorMat);
      strip.position.set(spec.x, 0.03, spec.z);
      group.add(strip);
    }

    this.scene.add(group);
    this.arenaBoundaryGroup = group;
    this.playableHalfExtent = halfExtent;
  }

  /** VFX de combate ficam no VfxSystem — evita three-nebula (custo alto / hitch). */
  spawnBurst() {
    return null;
  }

  _resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);

    const aspect = width / Math.max(1, height);
    if (this.camera.isOrthographicCamera) {
      const fs = this.frustumSize;
      this.camera.left = (fs * aspect) / -2;
      this.camera.right = (fs * aspect) / 2;
      this.camera.top = fs / 2;
      this.camera.bottom = fs / -2;
      this.camera.updateProjectionMatrix();
    }

    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }

    if (this.dirLight) {
      this._updateShadowFrustum(aspect);
    }
  }

  /** Set an object (Mesh) for the camera to follow */
  follow(targetMesh) {
    this.followTarget = targetMesh;
    this._cameraInitialized = false;
  }

  /**
   * Render the current frame
   * @param {number} [alpha=1] Fator de interpolação (0–1); meshes já vêm lerped do GameEngine.
   */
  render(alpha = 1) {
    void alpha;
    const delta = Math.min(0.05, this._clock.getDelta());

    if (this.followTarget) {
      const tx = this.followTarget.position.x;
      const ty = this.followTarget.position.y;
      const tz = this.followTarget.position.z;
      const o = this.cameraOffset;

      this._desiredCamPos.set(tx + o.x, ty + o.y, tz + o.z);
      this._desiredLookAt.set(tx, ty * 0.35, tz);

      if (!this._cameraInitialized) {
        this.camera.position.copy(this._desiredCamPos);
        this._smoothedLookAt.copy(this._desiredLookAt);
        this._cameraInitialized = true;
      } else {
        // Lerp exponencial frame-rate independent (threejs-animation / Clock delta)
        const t = 1 - Math.exp(-this.cameraFollowDamping * delta);
        this.camera.position.lerp(this._desiredCamPos, t);
        this._smoothedLookAt.lerp(this._desiredLookAt, t);
      }

      this.camera.lookAt(this._smoothedLookAt);

      if (this.dirLight?.target) {
        this.dirLight.target.position.set(tx, 0, tz);
        this.dirLight.target.updateMatrixWorld();
        // Key light alinhada ao eixo isométrico da câmera
        this.dirLight.position.set(tx + o.x * 1.15, o.y + 8, tz + o.z * 1.15);
      }
    }

    const now = performance.now();
    void now;

    if (this._enemyHordeEntities) {
      this.updateEnemyHordeInstances(this._enemyHordeEntities, this.enemyHorde);
    }

    try {
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (error) {
      console.error("RenderSystem.render falhou; caindo para render direto.", error);
      this.composer = null;
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (fallbackError) {
        console.error("RenderSystem: render direto também falhou.", fallbackError);
      }
    }
  }
}
