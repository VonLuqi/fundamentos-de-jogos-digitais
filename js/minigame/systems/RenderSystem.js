import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";
import System, {
  SpriteRenderer,
  Emitter,
  Rate,
  Span,
  Position,
  Mass,
  Radius,
  Life,
  RadialVelocity,
  Vector3D,
  Alpha,
  Scale,
  Color,
  PointZone,
} from "https://esm.sh/three-nebula@13.0.0";

export class RenderSystem {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.nebulaEffects = [];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0908, 1); // Fundo quase preto (tema Hades)

    // Habilitar sombras no renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    // Orthographic Camera (ajustada para top-down com leve profundidade)
    const frustumSize = 50; 
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2, 
      (frustumSize * aspect) / 2,  
      frustumSize / 2,             
      frustumSize / -2,            
      0.1,                         
      1000                         
    );
    this.camera.position.set(0, 30, 0); 
    this.camera.lookAt(0, 0, 0); 

    // --- ILUMINAÇÃO DRAMÁTICA LOW-POLY (Task 2.1 - ✅ Concluído) ---
    const ambientLight = new THREE.AmbientLight(0x805050, 1.2); 
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xff8c00, 3.5); 
    directionalLight.position.set(25, 40, 20); 
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    directionalLight.shadow.mapSize.width = 2048; 
    directionalLight.shadow.mapSize.height = 2048; 
    const shadowArea = 45; 
    directionalLight.shadow.camera.left = -shadowArea * aspect;
    directionalLight.shadow.camera.right = shadowArea * aspect;
    directionalLight.shadow.camera.top = shadowArea;
    directionalLight.shadow.camera.bottom = -shadowArea;
    directionalLight.shadow.camera.near = 1; 
    directionalLight.shadow.camera.far = 100; 
    directionalLight.shadow.bias = -0.003; 
    directionalLight.shadow.normalBias = 0.05;

    // --- Cenário (Task 2.2 - Chão Plano, Pedrinhas, e Lava "Flutuante") ---
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a110a, // Cor base da rocha escura
      roughness: 0.9,
      metalness: 0.1
    });


    // Grupo para organizar o terreno (limpeza do terreno anterior)
    const oldTerrainGroup = this.scene.getObjectByName('terrainGroup');
    if (oldTerrainGroup) {
      this.scene.remove(oldTerrainGroup);
    }

    const terrainGroup = new THREE.Group();
    terrainGroup.name = 'terrainGroup'; // Nomear para facilitar remoção futura
    this.scene.add(terrainGroup);

    const arenaSize = 240; // Largura e profundidade da arena (MAIOR)
    const halfArena = arenaSize / 2;

        // --- Modelo 1 (Chão da Arena) ---
    const mainGroundGeometry = new THREE.PlaneGeometry(arenaSize, arenaSize, 1, 1); 
    const mainGroundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 0.8, metalness: 0.1 });
    const mainGround = new THREE.Mesh(mainGroundGeometry, mainGroundMaterial);
    mainGround.rotation.x = -Math.PI / 2; 
    mainGround.position.y = 0; 
    mainGround.receiveShadow = true;
    mainGround.castShadow = true; // Chão projeta sombra para as pedrinhas
    terrainGroup.add(mainGround);

    // --- Modelo 2 (Pedrinhas/Detritos Low-Poly) ---
    const numPebbles = 200; // Mais pedrinhas
    const pebbleColors = [0x15110c, 0x221810, 0x1a110a, 0x2b201d]; // Variações de cor para as pedrinhas
    for (let i = 0; i < numPebbles; i++) {
      const pebbleHeight = THREE.MathUtils.randFloat(0.1, 0.5); // Pedrinhas bem pequenas
      const pebbleWidth = THREE.MathUtils.randFloat(0.5, 2.5);
      const pebbleDepth = THREE.MathUtils.randFloat(0.5, 2.5);
      const pebbleGeometry = new THREE.BoxGeometry(pebbleWidth, pebbleHeight, pebbleDepth);
      const pebbleColor = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
      const pebbleMaterial = new THREE.MeshStandardMaterial({ color: pebbleColor, roughness: 0.6, metalness: 0.05 });
      const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
      pebble.position.set(
        THREE.MathUtils.randFloat(-halfArena + 5, halfArena - 5), // Dentro da arena, com margem
        pebbleHeight / 2, // Na superfície do chão
        THREE.MathUtils.randFloat(-halfArena + 5, halfArena - 5)
      );
      pebble.rotation.y = THREE.MathUtils.randFloat(0, Math.PI * 2); 
      pebble.castShadow = true;
      pebble.receiveShadow = true;
      terrainGroup.add(pebble);
    }

    // --- Fim Cenário Detalhado ---

    // Área livre para gameplay — sem obstáculos nem paredes visuais

    // Target for camera follow
    this.followTarget = null;
    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  /** Set an object (Mesh) for the camera to follow */
  follow(targetMesh) {
    this.followTarget = targetMesh;
  }

  spawnBurst(position, options = {}) {
    if (!position) return;

    const color = new THREE.Color(options.color ?? 0x7dd3fc);
    const pulse = new System();
    const renderer = new SpriteRenderer(this.scene, THREE);
    const emitter = new Emitter();

    const particleMin = Number(options.particlesMin ?? 10);
    const particleMax = Number(options.particlesMax ?? 18);
    const lifeMin = Number(options.lifeMin ?? 0.45);
    const lifeMax = Number(options.lifeMax ?? 1.1);
    const radiusMin = Number(options.radiusMin ?? 0.2);
    const radiusMax = Number(options.radiusMax ?? 0.9);
    const speed = Number(options.speed ?? 4.8);
    const scale = Number(options.scale ?? 1.1);

    const accent = color.clone().offsetHSL(0.08, 0.18, 0.1);

    emitter
      .setRate(new Rate(new Span(particleMin, particleMax), new Span(0.01, 0.04)))
      .setInitializers([
        new Position(new PointZone(position.x, position.y ?? 1.2, position.z)),
        new Mass(1),
        new Radius(radiusMin, radiusMax),
        new Life(lifeMin, lifeMax),
        new RadialVelocity(speed, new Vector3D(1, 0.7, 1), 360),
      ])
      .setBehaviours([
        new Alpha(1, 0),
        new Scale(0.08, scale),
        new Color(color, accent),
      ])
      .emit();

    pulse.addRenderer(renderer).addEmitter(emitter).emit({
      onStart: () => {},
      onUpdate: () => {},
      onEnd: () => {},
    });

    this.nebulaEffects.push({
      system: pulse,
      expiresAt: performance.now() + (options.ttl ?? 1200),
    });
  }

  _resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    if (this.camera.isOrthographicCamera) {
      const frustumSize = 50;
      const aspect = width / height;
      this.camera.left = (frustumSize * aspect) / -2;
      this.camera.right = (frustumSize * aspect) / 2;
      this.camera.top = frustumSize / 2;
      this.camera.bottom = frustumSize / -2;
    }
    this.camera.updateProjectionMatrix();
  }

  /** Render the current frame */
  render() {
    if (this.followTarget) {
      this.camera.position.x = this.followTarget.position.x;
      this.camera.position.z = this.followTarget.position.z + 30; 
      this.camera.lookAt(this.followTarget.position.x, this.followTarget.position.y, this.followTarget.position.z);
    }

    const now = performance.now();
    this.nebulaEffects = this.nebulaEffects.filter((entry) => {
      entry.system.update();
      return now < entry.expiresAt;
    });

    this.renderer.render(this.scene, this.camera);
  }
}
