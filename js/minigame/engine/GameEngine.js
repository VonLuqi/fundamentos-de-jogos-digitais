import * as THREE from "../three.js";
import { InputHandler } from "./InputHandler.js";
import { Player } from "../entities/Player.js";
import { EnemyPool, ENEMY_POOL_SIZE } from "../entities/Enemy.js";
import { Pickup } from "../entities/Pickup.js";
import { ProjectilePool, PROJECTILE_POOL_SIZE } from "../entities/Projectile.js";
import { PhysicsSystem, ARENA_HALF_EXTENT } from "../systems/PhysicsSystem.js";
import { createStatusSlots, applyStatusToPlayer, normalizeStatusId, STATUS_LIBRARY } from "../systems/StatusSystem.js";
import {
  POWERUP_LIBRARY,
  getRandomPowerupChoices,
  applyPowerupChoice,
  resolvePickupReward,
  ITEM_PROGRESSION_LIBRARY,
  getPowerupDisplayData,
} from "../systems/PowerupSystem.js";
import { getDifficultyLevel, getEnemyStats, getEnemySpawnCount, getSpawnInterval } from "./DifficultyConfig.js";
import { VfxSystem } from "../systems/VfxSystem.js";

export class GameEngine {
  /**
   * @param {{ renderSystem: import('../systems/RenderSystem.js').RenderSystem, characterKey?: string }} params
   */
  constructor({ renderSystem, characterKey = "soulblade" }) {
    this.renderSystem = renderSystem;
    this.characterKey = characterKey;
    this.lastTime = 0;
    this.running = false;
    /** @type {'playing' | 'paused-upgrade' | 'victory' | 'defeat'} */
    this.state = "playing";
    /** Fixed physics step (60 Hz) — GDD / plano §1.2 */
    this.timeStep = 1 / 60;
    this.accumulator = 0;
    this.maxFrameDelta = 0.25;
    this.maxPhysicsSteps = 8;
    this.runTime = 0;
    this.gameDuration = 20 * 60;
    this.resultSubmitted = false;
    this.upgradeOverlay = null;
    this.upgradeChoices = [];
    this._onFrame = this._loop.bind(this);
    this._renderAlpha = 1;
    this._hasInterpolationSample = false;

    const config = {
      soulblade: { name: "Soulblade", weapon: "Lâmina Arcana", color: 0x00e5ff, hp: 100, speed: 15, projectileDamage: 1, projectileSpeed: 28, projectileColor: 0xffd166 },
      graveguard: { name: "Graveguard", weapon: "Lança de Ossos", color: 0xa78bfa, hp: 130, speed: 12, projectileDamage: 2, projectileSpeed: 24, projectileColor: 0xc4b5fd },
      warden: { name: "Warden of Echoes", weapon: "Orbe de Fogo", color: 0x34d399, hp: 90, speed: 17, projectileDamage: 1.5, projectileSpeed: 34, projectileColor: 0xf97316 },
    }[characterKey] || {
      name: "Soulblade", weapon: "Lâmina Arcana", color: 0x00e5ff, hp: 100, speed: 15, projectileDamage: 1, projectileSpeed: 28, projectileColor: 0xffd166,
    };

    this.characterConfig = config;

    this.weaponLibrary = {
      "lâmina arcana": {
        id: "lâmina arcana",
        name: "Lâmina Arcana",
        pattern: "melee",
        fireRate: 0.58,
        damage: 1.45,
        color: 0xa78bfa,
        meleeRange: 5.8,
        meleeHalfAngle: 0.95,
      },
      "lança de ossos": {
        id: "lança de ossos",
        name: "Lança de Ossos",
        pattern: "pierce",
        fireRate: 0.68,
        damage: 2,
        speed: 34,
        color: 0xc4b5fd,
        radius: 0.42,
        life: 1.6,
        maxDistance: 48,
        pierce: true,
        maxPierce: 64,
        visualType: "bone",
      },
      "orbe de fogo": {
        id: "orbe de fogo",
        name: "Orbe de Fogo",
        pattern: "orbital",
        fireRate: 0.9,
        damage: 1.5,
        speed: 34,
        color: 0xf97316,
        radius: 0.58,
        explosionRadius: 1.2,
      },
      "vento cortante": {
        id: "vento cortante",
        name: "Vento Cortante",
        pattern: "shockwave",
        fireRate: 1.15,
        damage: 1.1,
        color: 0x93c5fd,
        shockwaveRadius: 8.5,
        knockback: 7.2,
      },
      "relâmpago sagrado": {
        id: "relâmpago sagrado",
        name: "Relâmpago Sagrado",
        pattern: "lightning",
        fireRate: 0.7,
        damage: 2.4,
        color: 0xfde68a,
        strikeCount: 1,
        aoeRadius: 2.8,
        life: 0.42,
      },
    };

    this.input = new InputHandler();
    this.physics = new PhysicsSystem({
      timeStep: this.timeStep,
      arenaHalfExtent: ARENA_HALF_EXTENT,
    });
    this.vfx = new VfxSystem(this.renderSystem.scene);

    this.weaponProfile = {
      soulblade: { fireRate: 0.58, pattern: "melee" },
      graveguard: { fireRate: 0.68, pattern: "pierce" },
      warden: { fireRate: 0.9, pattern: "orbital" },
    }[this.characterKey] || { fireRate: 0.4, pattern: "melee" };

    this.player = new Player(this.renderSystem.scene, this.physics.world, {
      color: config.color,
      speed: config.speed,
      size: 2,
      hp: config.hp,
      maxHp: config.hp,
      arenaLimit: this.physics.arenaLimit,
    });
    this.player.xp = 0;
    this.player.level = 1;
    this.player.xpToNextLevel = this.getXpForLevel(1);
    this.player.characterKey = this.characterKey;
    this.player.characterName = config.name;
    this.player.weaponName = config.weapon;
    this.player.baseSpeed = config.speed;
    this.player.speed = config.speed;
    this.player.baseProjectileDamage = config.projectileDamage;
    this.player.projectileDamage = config.projectileDamage;
    this.player.baseProjectileSpeed = config.projectileSpeed;
    this.player.projectileSpeed = config.projectileSpeed;
    this.player.projectileColor = config.projectileColor;
    this.player.basePickupRange = 2.2;
    this.player.pickupRange = 2.2;
    this.player.baseRegenPerSecond = 0;
    this.player.regenPerSecond = 0;
    this.player.resistanceMultiplier = 1;
    this.player.attackCooldownMultiplier = 1;
    this.player.weaponSlots = this.createWeaponSlots(config.weapon);
    this.player.statusSlots = createStatusSlots();
    applyStatusToPlayer(this.player, this.player.statusSlots);
    this.player.activeWeapons = this.player.weaponSlots.filter(Boolean).length;

    this.xpPickupRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
    );
    this.xpPickupRing.rotation.x = -Math.PI / 2;
    this.xpPickupRing.position.set(0, 0.08, 0);
    this.xpPickupRing.visible = true;
    this.renderSystem.scene.add(this.xpPickupRing);

    // Chão + paredes vêm do PhysicsSystem (§2.2)
    if (typeof this.renderSystem.buildArenaBoundary === "function") {
      this.renderSystem.buildArenaBoundary(this.physics.arenaLimit);
    }

    this.enemyPool = new EnemyPool(THREE, ENEMY_POOL_SIZE);
    /** Lista viva do pool (mesma referência — sem push/splice avulsos). */
    this.enemies = this.enemyPool.active;
    if (typeof this.renderSystem.setEnemyHordeEntities === "function") {
      this.renderSystem.setEnemyHordeEntities(this.enemies);
    }
    this.projectilePool = new ProjectilePool(this.renderSystem.scene, PROJECTILE_POOL_SIZE);
    this.projectiles = this.projectilePool.active;
    this.pickups = [];
    this.spawnTimer = 0;
    this.attackCooldown = 0;

    this.resultOverlay = this._createResultOverlay();
    this.upgradeOverlay = this._createUpgradeOverlay();
    this.hud = this._createHud();
    if (this.hud) {
      this.hud.style.display = "none";
    }

    if (typeof this.renderSystem.follow === "function") {
      this.renderSystem.follow(this.player.mesh);
    }

    console.log("GameEngine: Initialized Input, Player, Combat, Pickup, Timer, and End-of-run systems.");
  }

  /** Start the game loop */
  start() {
    this.showHud();
    this.state = "playing";
    this.running = true;
    this.accumulator = 0;
    this._hasInterpolationSample = false;
    this.lastTime = performance.now();
    this.input.setActive(true);

    // Spawn inicial aqui (não no construtor) — menu responde mais rápido
    if ((this.enemies?.length ?? 0) === 0) {
      for (let i = 0; i < 3; i += 1) {
        this.spawnEnemy();
      }
      this.spawnTimer = 0;
    }

    requestAnimationFrame(this._onFrame);
  }

  _createHud() {
    let hud = document.getElementById("minigame-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "minigame-hud";
      hud.innerHTML = `
        <div class="minigame-hud__panel">
          <span class="minigame-hud__label">HP</span>
          <strong id="minigame-hp">100</strong>
        </div>
        <div class="minigame-hud__panel">
          <span class="minigame-hud__label">XP</span>
          <strong id="minigame-xp">0</strong>
        </div>
        <div class="minigame-hud__panel minigame-hud__panel--time">
          <span class="minigame-hud__label">Tempo</span>
          <strong id="minigame-time">00:00 / 20:00</strong>
        </div>
        <div class="minigame-hud__panel minigame-hud__panel--status">
          <span class="minigame-hud__label">Status</span>
          <strong id="minigame-status">Velocidade • Dano • Ataque</strong>
        </div>
      `;
      document.body.appendChild(hud);
    }

    return hud;
  }

  updateHud() {
    if (!this.hud) return;

    const hpEl = document.getElementById("minigame-hp");
    const xpEl = document.getElementById("minigame-xp");
    const timeEl = document.getElementById("minigame-time");
    const statusEl = document.getElementById("minigame-status");
    const levelEl = document.getElementById("minigame-level");
    const healthFill = document.getElementById("minigame-health-fill");
    const xpFill = document.getElementById("minigame-xp-fill");
    const dmgEl = document.getElementById("minigame-dmg");
    const speedEl = document.getElementById("minigame-speed");
    const atkEl = document.getElementById("minigame-atk");
    const weaponListEl = document.getElementById("minigame-weapons");
    const statusListEl = document.getElementById("minigame-status-list");

    const hpRatio = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
    const xpRatio = Math.max(0, Math.min(1, this.player.xp / this.player.xpToNextLevel));
    const hpText = `${Math.max(0, Math.round(this.player.hp))} / ${Math.max(1, Math.round(this.player.maxHp))}`;
    const xpText = `${Math.max(0, Math.round(this.player.xp))} / ${Math.max(1, Math.round(this.player.xpToNextLevel))}`;
    const elapsed = Math.min(this.runTime, this.gameDuration);
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    const totalMinutes = Math.floor(this.gameDuration / 60);
    const totalSeconds = Math.floor(this.gameDuration % 60);
    const timeText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} / ${String(totalMinutes).padStart(2, "0")}:${String(totalSeconds).padStart(2, "0")}`;

    if (hpEl && hpEl.textContent !== hpText) hpEl.textContent = hpText;
    if (xpEl && xpEl.textContent !== xpText) xpEl.textContent = xpText;
    if (timeEl && timeEl.textContent !== timeText) timeEl.textContent = timeText;

    if (statusEl) {
      const activeStatuses = this.player.statusSlots
        .filter(Boolean)
        .map((slot) => STATUS_LIBRARY[normalizeStatusId(slot.id)]?.name || slot.id)
        .slice(0, 2)
        .join(" • ");
      const statusText = activeStatuses || "Nenhum status";
      if (statusEl.textContent !== statusText) statusEl.textContent = statusText;
    }

    const weaponsSig = (this.player.weaponSlots || [])
      .map((w) => (w ? `${w.id}:${w.level || 1}` : ""))
      .join("|");
    if (weaponListEl && this._hudWeaponsSig !== weaponsSig) {
      this._hudWeaponsSig = weaponsSig;
      const weapons = this.player.weaponSlots.filter(Boolean);
      weaponListEl.innerHTML = weapons.length
        ? weapons.map((weapon) => `
            <span class="minigame-chip minigame-chip--with-count">
              <span>${weapon.name || weapon.id}</span>
              <span class="minigame-chip__count">${weapon.level || 1}</span>
            </span>
          `).join("")
        : '<span class="minigame-chip minigame-chip--empty">Nenhuma arma</span>';
    }

    const statusSig = (this.player.statusSlots || [])
      .map((s) => (s ? `${normalizeStatusId(s.id)}:${s.level || 1}` : ""))
      .join("|");
    if (statusListEl && this._hudStatusSig !== statusSig) {
      this._hudStatusSig = statusSig;
      const statuses = this.player.statusSlots.filter(Boolean);
      statusListEl.innerHTML = statuses.length
        ? statuses.map((slot) => `
            <span class="minigame-chip minigame-chip--with-count">
              <span>${STATUS_LIBRARY[normalizeStatusId(slot.id)]?.name || slot.id}</span>
              <span class="minigame-chip__count">${slot.level || 1}</span>
            </span>
          `).join("")
        : '<span class="minigame-chip minigame-chip--empty">Nenhum status</span>';
    }

    const levelText = `Lv ${this.player.level}`;
    if (levelEl && levelEl.textContent !== levelText) levelEl.textContent = levelText;

    const hpPct = `${Math.round(hpRatio * 100)}%`;
    const xpPct = `${Math.round(xpRatio * 100)}%`;
    if (healthFill && healthFill.style.width !== hpPct) healthFill.style.width = hpPct;
    if (xpFill && xpFill.style.width !== xpPct) xpFill.style.width = xpPct;

    const dmgText = `${this.player.projectileDamage?.toFixed(1) ?? "1.0"}`;
    const speedText = `${Math.round(this.player.speed ?? this.player.baseSpeed ?? 15)}`;
    const slotRate = this.player.weaponSlots.find(Boolean)?.fireRate;
    const baseRate = Number.isFinite(slotRate) ? slotRate : this.weaponProfile.fireRate;
    const atkText = `${(baseRate / (this.player.attackCooldownMultiplier || 1)).toFixed(2)}s`;
    if (dmgEl && dmgEl.textContent !== dmgText) dmgEl.textContent = dmgText;
    if (speedEl && speedEl.textContent !== speedText) speedEl.textContent = speedText;
    if (atkEl && atkEl.textContent !== atkText) atkEl.textContent = atkText;
  }

  _createResultOverlay() {
    let overlay = document.getElementById("minigame-result-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "minigame-result-overlay";
      overlay.setAttribute("aria-live", "polite");
      overlay.innerHTML = `
        <div class="minigame-result" role="dialog" aria-modal="false">
          <p class="minigame-result__eyebrow">Run concluída</p>
          <h2 data-role="title">Vitória</h2>
          <p data-role="summary">Você acumulou XP e concluiu a missão.</p>
          <button type="button" class="start-button" data-action="return-dashboard">Voltar ao Painel</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const button = overlay.querySelector("[data-action='return-dashboard']");
      if (button) {
        button.addEventListener("click", () => {
          window.location.href = "../index.html";
        });
      }
    }

    overlay.style.display = "none";
    overlay.style.opacity = "0";
    return overlay;
  }

  _createUpgradeOverlay() {
    const overlay = document.getElementById("minigame-upgrade-overlay");
    if (!overlay) return null;

    overlay.style.display = "none";
    overlay.style.opacity = "0";
    return overlay;
  }

  getXpForLevel(level) {
    return Math.max(100, 100 + (level - 1) * 40);
  }

  triggerLevelUp() {
    if (!this.upgradeOverlay || this.state === "victory" || this.state === "defeat") return;

    this.state = "paused-upgrade";
    this.running = false;
    this.input.setActive(false);
    this.vfx.spawnLevelUpAura(this.player.mesh.position, 0x8b5cf6);
    this.upgradeChoices = getRandomPowerupChoices(3, this.player);

    const container = this.upgradeOverlay.querySelector("#minigame-upgrade-options");
    if (!container) return;

    container.innerHTML = "";

    this.upgradeChoices.forEach((powerupId) => {
      const powerup = POWERUP_LIBRARY[powerupId];
      if (!powerup) return;

      const display = getPowerupDisplayData(powerupId);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "minigame-upgrade__card";
      card.dataset.rarity = display.rarity;
      const cardStyle = `--rarity-color: #${display.color.toString(16).padStart(6, '0')};`;
      card.style.setProperty("--rarity-color", `#${display.color.toString(16).padStart(6, '0')}`);
      card.innerHTML = `
        <div class="minigame-upgrade__header">
          <span class="minigame-upgrade__tag">${display.tag}</span>
          <span class="minigame-upgrade__rarity">${display.rarityLabel}</span>
        </div>
        <div class="minigame-upgrade__meta">
          <span class="minigame-upgrade__state">${display.stateLabel}</span>
          <span class="minigame-upgrade__impact">${display.impactEstimate}</span>
        </div>
        <strong>${powerup.name}</strong>
        <small>${powerup.description}</small>
      `;
      card.addEventListener("click", () => this.chooseUpgrade(powerupId));
      container.appendChild(card);
    });

    this.upgradeOverlay.style.display = "flex";
    this.upgradeOverlay.style.opacity = "1";
  }

  chooseUpgrade(powerupId) {
    const result = applyPowerupChoice(this.player, powerupId);
    if (!result.applied) {
      console.warn("GameEngine: upgrade inválido.", powerupId, result);
      return;
    }

    if (this.upgradeOverlay) {
      this.upgradeOverlay.style.display = "none";
      this.upgradeOverlay.style.opacity = "0";
    }

    this.state = "playing";
    this.running = true;
    this.accumulator = 0;
    this._hasInterpolationSample = false;
    this.lastTime = performance.now();
    this.input.setActive(true);
    this.updateHud();
    requestAnimationFrame(this._onFrame);
  }

  showResultOverlay({ won, xp }) {
    if (!this.resultOverlay) return;

    const titleEl = this.resultOverlay.querySelector("[data-role='title']");
    const summaryEl = this.resultOverlay.querySelector("[data-role='summary']");
    if (titleEl) {
      titleEl.textContent = won ? "Vitória" : "Derrota";
    }
    if (summaryEl) {
      summaryEl.textContent = won
        ? `Você concluiu a run com ${xp} XP e retornou ao painel do herói.`
        : `Você acumulou ${xp} XP antes da derrota. Tente outra corrida.`;
    }

    this.resultOverlay.style.display = "flex";
    this.resultOverlay.style.opacity = "1";
  }

  async finishRun({ won }) {
    if (this.resultSubmitted) return;
    this.resultSubmitted = true;
    this.state = won ? "victory" : "defeat";
    this.running = false;
    this.input.setActive(false);
    this.enemyPool?.releaseAll();
    this.projectilePool?.releaseAll();

    const finalXp = Math.max(0, Math.round(this.player.xp));
    this.showResultOverlay({ won, xp: finalXp });
    this.updateHud();

    try {
      const { getSession, submitMinigameRun } = await import("../../api.js");
      const session = getSession();
      if (!session?.token) {
        console.warn("GameEngine: sessão não encontrada; XP não foi enviado ao backend.");
        return;
      }

      const payload = await submitMinigameRun(session.token, finalXp, this.runTime);
      const summaryEl = this.resultOverlay?.querySelector("[data-role='summary']");
      const totalXp = Number(payload?.user?.xp ?? payload?.totalXp ?? finalXp);
      if (summaryEl) {
        summaryEl.textContent = won
          ? `Vitória confirmada! ${finalXp} XP foram registrados e o perfil agora está em ${totalXp} XP.`
          : `Derrota registrada. ${finalXp} XP foram salvos e o perfil está em ${totalXp} XP.`;
      }
      console.log("GameEngine: run XP enviado com sucesso.", payload);
    } catch (error) {
      console.error("GameEngine: falha ao enviar XP da run.", error);
      const summaryEl = this.resultOverlay?.querySelector("[data-role='summary']");
      if (summaryEl) {
        summaryEl.textContent = `Você marcou ${finalXp} XP, mas a sincronização com o painel falhou. Tente novamente.`;
      }
    }
  }

  /** Stop the game loop */
  stop() {
    this.running = false;
    this.input.setActive(false);
  }

  /** Simulação só roda em `playing` (LEVEL_UP / VICTORY / DEFEAT pausam a física). */
  isSimulating() {
    return this.state === "playing";
  }

  /**
   * Loop com fixed timestep + acumulador (60 Hz).
   * Clamp de delta evita spiral-of-death; `alpha` interpola o render.
   */
  _loop(timestamp) {
    if (!this.running) return;

    try {
      const deltaReal = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      if (this.isSimulating()) {
        this.accumulator += Math.min(deltaReal, this.maxFrameDelta);

        let steps = 0;
        while (this.accumulator >= this.timeStep && steps < this.maxPhysicsSteps) {
          this._captureInterpolationState();
          this.updatePhysics(this.timeStep);
          this.accumulator -= this.timeStep;
          steps += 1;

          // Level-up / fim de run param a simulação no meio do catch-up
          if (!this.isSimulating() || !this.running) {
            this.accumulator = 0;
            break;
          }
        }

        if (steps >= this.maxPhysicsSteps) {
          this.accumulator = 0;
        }

        this._renderAlpha = this.timeStep > 0 ? this.accumulator / this.timeStep : 1;
      } else {
        this.accumulator = 0;
        this._renderAlpha = 1;
      }

      // HUD / VFX uma vez por frame (não por substep de física)
      if (this.isSimulating()) {
        this.updateHud();
        this.vfx.update();
      }

      this._applyInterpolatedTransforms(this._renderAlpha);
      this.renderSystem.render(this._renderAlpha);
      this._restorePhysicsTransforms();
    } catch (error) {
      console.error("GameEngine._loop: erro no frame (mantendo loop ativo).", error);
      this.accumulator = 0;
    }

    if (this.running) {
      requestAnimationFrame(this._onFrame);
    }
  }

  _ensurePrevPos(entity) {
    if (!entity) return null;
    if (!entity._prevPos) entity._prevPos = new THREE.Vector3();
    if (!entity._currPos) entity._currPos = new THREE.Vector3();
    return entity;
  }

  /** Snapshot das poses atuais antes do próximo passo físico (para lerp no render). */
  _captureInterpolationState() {
    const player = this._ensurePrevPos(this.player);
    if (player) {
      player._prevPos.copy(player.body.position);
    }

    for (const enemy of this.enemies) {
      this._ensurePrevPos(enemy);
      enemy._prevPos.copy(enemy.mesh.position);
      enemy._freshSpawn = false;
    }

    for (const projectile of this.projectiles) {
      if (!projectile?.mesh) continue;
      this._ensurePrevPos(projectile);
      projectile._prevPos.copy(projectile.mesh.position);
      projectile._freshSpawn = false;
    }

    for (const pickup of this.pickups) {
      if (!pickup?.mesh) continue;
      this._ensurePrevPos(pickup);
      pickup._prevPos.copy(pickup.mesh.position);
    }

    if (this.xpPickupRing) {
      this._ensurePrevPos(this.xpPickupRing);
      this.xpPickupRing._prevPos.copy(this.xpPickupRing.position);
    }

    this._hasInterpolationSample = true;
  }

  _storeCurrentPos(entity, source) {
    if (!entity?._currPos || !source) return;
    entity._currPos.set(source.x, source.y ?? entity._currPos.y, source.z);
  }

  _applyInterpolatedTransforms(alpha) {
    this._finalizeInterpolationCurrents();

    if (!this._hasInterpolationSample) {
      this._restorePhysicsTransforms();
      return;
    }

    const a = THREE.MathUtils.clamp(alpha, 0, 1);

    const lerpEntity = (entity, target, { lockY = null } = {}) => {
      if (!entity?._prevPos || !entity?._currPos || !target) return;
      // Spawn no meio do frame: não interpolar de PARK_Y / vida anterior
      if (entity._freshSpawn) {
        target.x = entity._currPos.x;
        target.y = lockY ?? entity._currPos.y;
        target.z = entity._currPos.z;
        return;
      }
      target.x = entity._prevPos.x + (entity._currPos.x - entity._prevPos.x) * a;
      target.y = lockY ?? (entity._prevPos.y + (entity._currPos.y - entity._prevPos.y) * a);
      target.z = entity._prevPos.z + (entity._currPos.z - entity._prevPos.z) * a;
    };

    if (this.player) {
      lerpEntity(this.player, this.player.mesh.position, { lockY: this.player._currPos.y });
    }

    for (const enemy of this.enemies) {
      lerpEntity(enemy, enemy.mesh.position);
    }

    for (const projectile of this.projectiles) {
      if (!projectile.mesh) continue;
      lerpEntity(projectile, projectile.mesh.position);
    }

    for (const pickup of this.pickups) {
      if (!pickup.mesh) continue;
      lerpEntity(pickup, pickup.mesh.position, { lockY: pickup.mesh.position.y });
    }

    if (this.xpPickupRing) {
      lerpEntity(this.xpPickupRing, this.xpPickupRing.position, { lockY: 0.12 });
    }
  }

  _finalizeInterpolationCurrents() {
    if (this.player) {
      this._ensurePrevPos(this.player);
      this._storeCurrentPos(this.player, this.player.body.position);
    }
    for (const enemy of this.enemies) {
      this._ensurePrevPos(enemy);
      this._storeCurrentPos(enemy, enemy.mesh.position);
    }
    for (const projectile of this.projectiles) {
      if (!projectile?.mesh) continue;
      this._ensurePrevPos(projectile);
      this._storeCurrentPos(projectile, projectile.mesh.position);
    }
    for (const pickup of this.pickups) {
      if (!pickup?.mesh) continue;
      this._ensurePrevPos(pickup);
      this._storeCurrentPos(pickup, pickup.mesh.position);
    }
    if (this.xpPickupRing) {
      this._ensurePrevPos(this.xpPickupRing);
      this._storeCurrentPos(this.xpPickupRing, this.xpPickupRing.position);
    }
  }

  _restorePhysicsTransforms() {
    if (this.player?._currPos) {
      this.player.mesh.position.copy(this.player._currPos);
    }
    for (const enemy of this.enemies) {
      if (enemy?._currPos) enemy.mesh.position.copy(enemy._currPos);
    }
    for (const projectile of this.projectiles) {
      if (projectile?._currPos && projectile.mesh) projectile.mesh.position.copy(projectile._currPos);
    }
    for (const pickup of this.pickups) {
      if (pickup?._currPos && pickup.mesh) {
        const y = pickup.mesh.position.y;
        pickup.mesh.position.x = pickup._currPos.x;
        pickup.mesh.position.z = pickup._currPos.z;
        pickup.mesh.position.y = y;
      }
    }
    if (this.xpPickupRing?._currPos) {
      this.xpPickupRing.position.x = this.xpPickupRing._currPos.x;
      this.xpPickupRing.position.z = this.xpPickupRing._currPos.z;
      this.xpPickupRing.position.y = 0.12;
    }
  }

  /**
   * Passo fixo de simulação (60 Hz). Não chama render/HUD.
   * @param {number} dt
   */
  updatePhysics(dt) {
    if (!this.isSimulating()) return;

    this.runTime += dt;
    const rawMove = this.input.getMoveVector();
    const direction = typeof this.renderSystem.screenToWorldMove === "function"
      ? this.renderSystem.screenToWorldMove(rawMove.x, rawMove.z)
      : { x: rawMove.x, z: rawMove.z };
    this.player.update(dt, direction);

    if (this.xpPickupRing) {
      const baseRange = this.player.basePickupRange ?? 2.2;
      const range = this.player.pickupRange ?? baseRange;
      const visualScale = Math.max(0.9, 1 + ((range - baseRange) / 2.2) * 2.2);
      this.xpPickupRing.position.set(this.player.body.position.x, 0.12, this.player.body.position.z);
      this.xpPickupRing.scale.set(visualScale, visualScale, visualScale);
    }

    const clamped = this.physics.clampToArena(this.player.body.position);
    this.player.body.position.x = clamped.x;
    this.player.body.position.z = clamped.z;

    if (this.player.hp <= 0) {
      this.finishRun({ won: false });
      return;
    }

    if (this.runTime >= this.gameDuration) {
      this.finishRun({ won: true });
      return;
    }

    if (this.player.regenPerSecond > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regenPerSecond * dt);
    }

    if (this.player.xp >= this.player.xpToNextLevel) {
      this.player.xp -= this.player.xpToNextLevel;
      this.player.level += 1;
      this.player.xpToNextLevel = this.getXpForLevel(this.player.level);
      this.triggerLevelUp();
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.spawnTimer += dt;

    const difficulty = this.getDifficultyLevel();
    const spawnInterval = getSpawnInterval(difficulty);
    if (this.spawnTimer >= spawnInterval) {
      const spawnCount = getEnemySpawnCount(difficulty);
      for (let i = 0; i < spawnCount; i += 1) {
        this.spawnEnemy();
      }
      this.spawnTimer = 0;
    }

    if (this.attackCooldown <= 0) {
      this.fireWeaponPattern(direction);
      const slotRate = this.player.weaponSlots.find(Boolean)?.fireRate;
      const baseRate = Number.isFinite(slotRate) ? slotRate : this.weaponProfile.fireRate;
      this.attackCooldown = baseRate / (this.player.attackCooldownMultiplier || 1);
    }

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.physics.update(dt);
  }

  /** @deprecated Use updatePhysics — mantido para compatibilidade. */
  update(delta) {
    this.updatePhysics(delta);
  }

  getDifficultyLevel() {
    return getDifficultyLevel(this.runTime, this.player.level);
  }

  getPickupValue() {
    const difficulty = this.getDifficultyLevel();
    const baseReward = 8 + difficulty * 6 + this.player.level * 2;
    return Math.max(10, Math.round(baseReward));
  }

  showHud() {
    if (this.hud) {
      this.hud.style.display = "flex";
    }
  }

  spawnEnemy() {
    if (this.enemyPool.isFull) return null;

    const playerPos = this.player.mesh.position;
    const difficulty = this.getDifficultyLevel();
    const enemyStats = getEnemyStats(difficulty, this.player.level);
    const phaseMultiplier = 1 + difficulty * 0.55;

    // Perímetro do framing (plano §3.4) — não no miolo da arena 200² (fora da câmera)
    const frustum = this.renderSystem.frustumSize ?? 52;
    const minR = frustum * 0.55;
    const maxR = frustum * 0.72;
    const angle = Math.random() * Math.PI * 2;
    const radius = minR + Math.random() * Math.max(0.5, maxR - minR);
    let x = playerPos.x + Math.cos(angle) * radius;
    let z = playerPos.z + Math.sin(angle) * radius;

    const limit = this.physics.arenaLimit ?? 110;
    x = Math.max(-limit + 2, Math.min(limit - 2, x));
    z = Math.max(-limit + 2, Math.min(limit - 2, z));

    return this.enemyPool.acquire({ x, z }, {
      speed: enemyStats.speed * phaseMultiplier,
      hp: enemyStats.hp,
      damage: enemyStats.damage,
      color: 0xff6b6b,
    });
  }

  /**
   * Mata / devolve inimigo ao pool (§3.1). Captura posição antes do despawn.
   * @param {import('../entities/Enemy.js').Enemy} enemy
   * @param {{ dropPickup?: boolean, deathVfx?: boolean }} [options]
   */
  killEnemy(enemy, options = {}) {
    if (!enemy?.active) return;
    const dropPickup = options.dropPickup === true;
    const deathVfx = options.deathVfx !== false;
    const px = enemy.x;
    const pz = enemy.z;

    if (deathVfx) {
      this.vfx.spawnEnemyDeathBurst({ x: px, y: enemy.y, z: pz }, 0x8b5cf6);
    }
    this.enemyPool.release(enemy);
    if (dropPickup) {
      this.spawnPickup({ x: px, z: pz }, this.getPickupValue());
    }
  }

  createWeaponSlots(initialWeaponName) {
    const slots = Array.from({ length: 5 }, () => null);
    const starterKey = this.getWeaponKey(initialWeaponName);
    const starter = this.weaponLibrary[starterKey] || this.weaponLibrary["lâmina arcana"];
    slots[0] = {
      ...starter,
      slot: 0,
      level: 1,
    };
    return slots;
  }

  getWeaponKey(name) {
    const normalized = (name || "").trim().toLowerCase();
    if (!normalized) return "lâmina arcana";
    const aliases = {
      "lâmina arcana": "lâmina arcana",
      "lança de ossos": "lança de ossos",
      "shotgun de ossos": "lança de ossos",
      "orbe de fogo": "orbe de fogo",
      "vento cortante": "vento cortante",
      "relâmpago sagrado": "relâmpago sagrado",
    };
    return aliases[normalized] || Object.keys(this.weaponLibrary).find((key) => key.includes(normalized)) || "lâmina arcana";
  }

  addWeaponForSlot(weaponName, slotIndex) {
    const key = this.getWeaponKey(weaponName);
    const weapon = this.weaponLibrary[key];
    if (!weapon || !this.player.weaponSlots[slotIndex]) return false;
    this.player.weaponSlots[slotIndex] = { ...weapon, slot: slotIndex, level: 1 };
    return true;
  }

  addStatusForSlot(statusId, slotIndex) {
    const normalizedId = normalizeStatusId(statusId);
    const statusDefinition = STATUS_LIBRARY[normalizedId];
    if (!statusDefinition || slotIndex < 0 || slotIndex >= this.player.statusSlots.length) return false;

    const existing = this.player.statusSlots[slotIndex];
    const nextLevel = existing ? (existing.level || 1) + 1 : 1;
    this.player.statusSlots[slotIndex] = { id: statusDefinition.id, level: nextLevel };
    applyStatusToPlayer(this.player, this.player.statusSlots);
    this.updateHud();
    return true;
  }

  getNearestEnemy(maxRange = 48) {
    if (!this.enemies.length) return null;
    const playerPos = this.player.mesh.position;
    const nearest = this.physics.queryNearestEnemy(playerPos.x, playerPos.z, maxRange);
    if (nearest) return nearest;

    // Fallback amplo se nada no raio de mira
    return this.physics.queryNearestEnemy(playerPos.x, playerPos.z, Number.POSITIVE_INFINITY);
  }

  /**
   * Mira mouse → ponto no chão → direção a partir do player (câmera isométrica).
   * @returns {{ x: number, z: number } | null}
   */
  getMouseAimWorldDirection() {
    if (!this.input?.mouse?.inside) return null;
    if (typeof this.renderSystem.unprojectToGround !== "function") return null;

    const hit = this.renderSystem.unprojectToGround(this.input.mouse.x, this.input.mouse.y);
    if (!hit) return null;

    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    const dx = hit.x - px;
    const dz = hit.z - pz;
    const length = Math.hypot(dx, dz);
    if (length < 0.5) return null;

    return { x: dx / length, z: dz / length };
  }

  getAimVector(fallbackDirection = { x: 1, z: 0 }, preferMouse = false) {
    if (preferMouse) {
      const mouseAim = this.getMouseAimWorldDirection();
      if (mouseAim && Number.isFinite(mouseAim.x) && Number.isFinite(mouseAim.z)
        && (mouseAim.x !== 0 || mouseAim.z !== 0)) {
        return mouseAim;
      }
    }

    const nearestEnemy = this.getNearestEnemy();
    if (nearestEnemy) {
      const ex = Number.isFinite(nearestEnemy.x) ? nearestEnemy.x : nearestEnemy.mesh?.position?.x;
      const ez = Number.isFinite(nearestEnemy.z) ? nearestEnemy.z : nearestEnemy.mesh?.position?.z;
      const dx = (ex ?? 0) - this.player.mesh.position.x;
      const dz = (ez ?? 0) - this.player.mesh.position.z;
      const length = Math.hypot(dx, dz);
      if (Number.isFinite(length) && length > 1e-4) {
        return { x: dx / length, z: dz / length };
      }
    }

    const fbLen = Math.hypot(fallbackDirection.x || 0, fallbackDirection.z || 0);
    if (Number.isFinite(fbLen) && fbLen > 1e-6) {
      return { x: fallbackDirection.x / fbLen, z: fallbackDirection.z / fbLen };
    }
    const facing = this.player.getFacingDirection?.() || { x: 0, z: -1 };
    return { x: facing.x || 0, z: facing.z || -1 };
  }

  getWeaponDisplayName(weapon) {
    if (!weapon) return 'Nenhuma arma';
    const baseName = String(weapon.name || weapon.id || 'Arma').replace(/\s+Final$/, '');
    return (Number(weapon.level ?? 1) >= 10) ? `${baseName} Final` : baseName;
  }

  isEnemyVisible(enemy) {
    if (!enemy || !this.renderSystem?.camera) return false;

    const camera = this.renderSystem.camera;
    const halfWidth = Math.max(12, (camera.right - camera.left) / 2);
    const halfHeight = Math.max(12, (camera.top - camera.bottom) / 2);
    const dx = enemy.mesh.position.x - this.player.mesh.position.x;
    const dz = enemy.mesh.position.z - this.player.mesh.position.z;

    return Math.abs(dx) <= halfWidth && Math.abs(dz) <= halfHeight;
  }

  fireWeaponPattern(direction) {
    const facing = this.player.getFacingDirection?.() || this.player.facing || { x: 0, z: -1 };
    const moveFallback = direction && (direction.x !== 0 || direction.z !== 0)
      ? direction
      : { x: facing.x || 0, z: facing.z || -1 };

    const activeWeapons = this.player.weaponSlots.filter(Boolean);
    if (!activeWeapons.length) return;

    for (const weapon of activeWeapons) {
      const pattern = weapon.pattern || "melee";
      // Mira: movimento/facing para melee; aim (nearest/mouse) para pierce
      const aim = pattern === "pierce"
        ? this.getAimVector(moveFallback, true)
        : moveFallback;

      if (pattern === "melee" || pattern === "nearest") {
        this.fireMeleeArc(weapon, aim);
        continue;
      }

      if (pattern === "pierce" || pattern === "spread") {
        this.fireBoneLance(weapon, aim);
        continue;
      }

      if (pattern === "shockwave" || pattern === "cleave") {
        this.fireWindShockwave(weapon);
        continue;
      }

      if (pattern === "lightning") {
        this.fireSacredLightning(weapon);
        continue;
      }

      // orbital (padrão)
      const orbitalCount = 8;
      this.vfx.spawnFireOrbBurst(this.player.mesh.position, weapon.color ?? 0xf97316);
      for (let i = 0; i < orbitalCount; i += 1) {
        const angle = (Math.PI * 2 * i) / orbitalCount + (this.runTime * 2.6);
        this.fireProjectile({ x: Math.cos(angle), z: Math.sin(angle) }, weapon);
      }
    }
  }

  /**
   * Lâmina Arcana — GDD §3.1: feixes cortantes em arco roxo, curto alcance, direção do movimento.
   * @param {object} weapon
   * @param {{ x: number, z: number }} aim
   */
  fireMeleeArc(weapon, aim) {
    const px = this.player.mesh.position.x;
    const py = this.player.mesh.position.y;
    const pz = this.player.mesh.position.z;
    const range = weapon.meleeRange ?? 5.8;
    const halfAngle = weapon.meleeHalfAngle ?? 0.95;
    const cosThreshold = Math.cos(halfAngle);
    const len = Math.hypot(aim.x, aim.z) || 1;
    const ax = aim.x / len;
    const az = aim.z / len;
    const damage = (weapon.damage ?? 1.45) * (this.player.projectileDamage ?? 1);

    this.vfx.spawnMeleeArc(
      { x: px + ax * 2.0, y: py, z: pz + az * 2.0 },
      { x: ax, z: az },
      weapon.color ?? 0xa78bfa
    );

    // Feixes em leque (arco) — identidade visual do GDD; alcance curto
    const slashOffsets = [-0.42, 0, 0.42];
    const spawnPos = { x: px + ax * 1.5, y: 1.55, z: pz + az * 1.5 };
    for (const offset of slashOffsets) {
      const angle = Math.atan2(az, ax) + offset;
      this.fireProjectile(
        { x: Math.cos(angle), z: Math.sin(angle) },
        {
          ...weapon,
          visualType: "wind",
          speed: 22,
          life: 0.28,
          maxDistance: range * 0.85,
          damage: damage * 0.4,
          radius: 0.36,
          color: weapon.color ?? 0xa78bfa,
          pierce: true,
          maxPierce: 5,
          explosionRadius: 0,
        },
        spawnPos
      );
    }

    // Dano principal: cone frontal imediato (curto alcance / inimigos frontais)
    const nearby = this.physics.queryEnemiesNear(px, pz, range).slice();
    for (const enemy of nearby) {
      if (!enemy?.active) continue;
      const dx = enemy.x - px;
      const dz = enemy.z - pz;
      const dist = Math.hypot(dx, dz) || 1;
      const dot = (dx / dist) * ax + (dz / dist) * az;
      if (dot < cosThreshold) continue;

      if (enemy.takeDamage(damage)) {
        this.killEnemy(enemy, { dropPickup: true });
      }
    }
  }

  /**
   * Lança de Ossos — GDD §3.1: projétil linear perfurante até o limite da tela,
   * visual esquelético com rastro de poeira.
   * @param {object} weapon
   * @param {{ x: number, z: number }} aim
   */
  fireBoneLance(weapon, aim) {
    const len = Math.hypot(aim?.x || 0, aim?.z || 0);
    if (!(len > 1e-4) || !Number.isFinite(len)) return;

    const ax = aim.x / len;
    const az = aim.z / len;
    const bolts = Math.max(1, Math.round(weapon.boltCount ?? 1));
    const frustum = this.renderSystem.frustumSize ?? 52;
    const screenReach = Math.max(28, frustum * 0.85);

    // Rastro de poeira leve no disparo (sem burst pesado a cada tiro)
    this.vfx.spawnBurst({
      x: this.player.mesh.position.x + ax * 1.2,
      y: 1.4,
      z: this.player.mesh.position.z + az * 1.2,
    }, {
      category: "combat",
      color: 0xd6c7a1,
      particlesMax: 5,
      lifeMax: 0.28,
      speed: 3.2,
      ttl: 280,
    });

    for (let i = 0; i < bolts; i += 1) {
      const wobble = bolts > 1 ? (i - (bolts - 1) / 2) * 0.08 : 0;
      const base = Math.atan2(az, ax) + wobble;
      this.fireProjectile({ x: Math.cos(base), z: Math.sin(base) }, {
        ...weapon,
        name: weapon.name || "Lança de Ossos",
        pierce: true,
        maxPierce: weapon.maxPierce ?? 64,
        speed: weapon.speed ?? 34,
        damage: (weapon.damage ?? 2) * (this.player.projectileDamage ?? 1),
        color: weapon.color ?? 0xc4b5fd,
        radius: weapon.radius ?? 0.42,
        life: weapon.life ?? 1.6,
        maxDistance: weapon.maxDistance ?? screenReach,
        visualType: "bone",
        explosionRadius: 0,
      });
    }
  }

  /**
   * Vento Cortante — pulso 360° com knockback (GDD §3.1).
   * @param {object} weapon
   */
  fireWindShockwave(weapon) {
    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    const radius = weapon.shockwaveRadius ?? weapon.range ?? 8.5;
    const knockback = weapon.knockback ?? 7.2;
    const damage = weapon.damage ?? 1.1;

    this.vfx.spawnWindShockwave({ x: px, y: 1.2, z: pz }, weapon.color ?? 0x93c5fd);

    const nearby = this.physics.queryEnemiesNear(px, pz, radius).slice();
    for (const enemy of nearby) {
      if (!enemy?.active) continue;
      const dx = enemy.x - px;
      const dz = enemy.z - pz;
      const dist = Math.hypot(dx, dz) || 1;
      const falloff = Math.max(0.2, 1 - dist / radius);
      const push = knockback * falloff;
      enemy.x += (dx / dist) * push;
      enemy.z += (dz / dist) * push;
      const clamped = this.physics.clampToArena(enemy);
      enemy.x = clamped.x;
      enemy.z = clamped.z;
      enemy.syncMesh?.();

      if (enemy.takeDamage(damage * (0.65 + falloff * 0.5))) {
        this.killEnemy(enemy, { dropPickup: true });
      }
    }

    this.physics.rebuildEnemySpatialGrid(this.enemies);
  }

  /**
   * Relâmpago Sagrado — alvos aleatórios visíveis + AoE (GDD §3.1).
   * @param {object} weapon
   */
  fireSacredLightning(weapon) {
    const visible = this.enemies.filter((enemy) => this.isEnemyVisible(enemy));
    const level = Number(weapon.level ?? 1);
    const strikeCount = Math.max(
      1,
      Math.round(weapon.strikeCount ?? 1) + (level >= 10 || weapon.isFinal ? 2 : level >= 5 ? 1 : 0)
    );
    const aoeRadius = weapon.aoeRadius ?? 2.8;
    const damage = weapon.damage ?? 2.4;

    if (!visible.length) {
      // Sem alvo: descarga no solo à frente
      const facing = this.player.getFacingDirection?.() || { x: 0, z: -1 };
      const tx = this.player.mesh.position.x + facing.x * 4;
      const tz = this.player.mesh.position.z + facing.z * 4;
      this.vfx.spawnLightningImpact(this.player.mesh.position, { x: tx, y: 1.2, z: tz }, weapon.color ?? 0xfde68a);
      this.fireProjectile({ x: 0, z: 0 }, {
        ...weapon,
        speed: 0,
        damage: 0,
        life: weapon.life ?? 0.42,
        visualType: "lightning",
        staticEffect: true,
        visualOnly: true,
      }, { x: tx, z: tz });
      return;
    }

    const pool = visible.slice();
    const targets = [];
    for (let i = 0; i < strikeCount && pool.length; i += 1) {
      const idx = Math.floor(Math.random() * pool.length);
      targets.push(pool.splice(idx, 1)[0]);
    }

    for (const strike of targets) {
      if (!strike?.active) continue;
      const tx = strike.x;
      const tz = strike.z;
      this.vfx.spawnLightningImpact(
        this.player.mesh.position,
        { x: tx, y: 1.2, z: tz },
        weapon.color ?? 0xfde68a
      );

      this.fireProjectile({ x: 0, z: 0 }, {
        ...weapon,
        speed: 0,
        damage: 0,
        color: weapon.color ?? 0xfde68a,
        life: weapon.life ?? 0.42,
        radius: 0.25,
        visualType: "lightning",
        staticEffect: true,
        visualOnly: true,
      }, { x: tx, z: tz });

      const victims = this.physics.queryEnemiesNear(tx, tz, aoeRadius).slice();
      for (const victim of victims) {
        if (!victim?.active) continue;
        const isPrimary = victim === strike;
        const dealt = damage * (isPrimary ? 1.25 : 0.7);
        if (victim.takeDamage(dealt)) {
          this.killEnemy(victim, { dropPickup: true });
        }
      }
    }
  }

  fireProjectile(direction, weaponOverride = null, positionOverride = null) {
    if (this.projectilePool.isFull) return null;

    const dir = direction || { x: 0, z: -1 };
    const dirLen = Math.hypot(dir.x || 0, dir.z || 0);
    if (dirLen < 1e-4) return null;

    const weapon = weaponOverride || {
      speed: this.player.projectileSpeed ?? 28,
      damage: this.player.projectileDamage ?? 1,
      color: this.player.projectileColor ?? 0xffd166,
    };

    const spawnPosition = positionOverride ?? this.player.mesh.position;

    return this.projectilePool.acquire(spawnPosition, {
      x: dir.x / dirLen,
      z: dir.z / dirLen,
    }, {
      speed: weapon.speed ?? 28,
      damage: weapon.damage ?? 1,
      life: weapon.life ?? 1.8,
      color: weapon.color ?? 0xffd166,
      radius: weapon.radius ?? 0.5,
      explosionRadius: weapon.explosionRadius ?? 0,
      maxDistance: weapon.maxDistance ?? 18,
      arenaLimit: this.physics.arenaLimit,
      visualType: weapon.visualType ?? "orb",
      staticEffect: weapon.staticEffect ?? false,
      visualOnly: weapon.visualOnly ?? false,
      damageRadius: weapon.damageRadius ?? 0,
      pierce: weapon.pierce ?? false,
      maxPierce: weapon.maxPierce ?? 64,
    });
  }

  /**
   * Devolve projétil ao pool (§4.2).
   * @param {import('../entities/Projectile.js').Projectile} projectile
   */
  releaseProjectile(projectile) {
    this.projectilePool.release(projectile);
  }

  spawnPickup(position, value = 10, reward = null) {
    if (!position) return;

    const color = reward ? (reward.kind === 'weapon' ? 0xfbbf24 : 0x60a5fa) : 0x7dd3fc;
    const pickup = new Pickup(this.renderSystem.scene, position, {
      value,
      color,
    });

    pickup.reward = reward || null;
    this.pickups.push(pickup);
    if (reward) {
      this.vfx.spawnRewardPickup(position, { color, particlesMin: 12, particlesMax: 18, ttl: 1100 });
    } else {
      this.vfx.spawnPickupOrb(position, color);
    }
  }

  buildItemRewardForDrop() {
    const weaponSlots = this.player.weaponSlots || [];
    const statusSlots = this.player.statusSlots || [];
    const availableWeaponKeys = Object.keys(ITEM_PROGRESSION_LIBRARY).filter((key) => ITEM_PROGRESSION_LIBRARY[key].category === 'weapon');
    const availableStatusKeys = Object.keys(ITEM_PROGRESSION_LIBRARY).filter((key) => ITEM_PROGRESSION_LIBRARY[key].category === 'status');

    const hasEmptyWeaponSlot = weaponSlots.some((slot) => !slot);
    const hasEmptyStatusSlot = statusSlots.some((slot) => !slot);

    if (hasEmptyWeaponSlot && Math.random() < 0.7) {
      const key = availableWeaponKeys[Math.floor(Math.random() * availableWeaponKeys.length)];
      return { kind: 'weapon', itemId: key };
    }

    if (hasEmptyStatusSlot && Math.random() < 0.5) {
      const key = availableStatusKeys[Math.floor(Math.random() * availableStatusKeys.length)];
      return { kind: 'status', itemId: key };
    }

    const weaponPool = weaponSlots.filter(Boolean).map((slot) => slot.id).filter(Boolean);
    const statusPool = statusSlots.filter(Boolean).map((slot) => normalizeStatusId(slot.id)).filter(Boolean);

    if (weaponPool.length > 0 && Math.random() < 0.7) {
      const weaponId = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      return { kind: 'weapon', itemId: weaponId };
    }

    if (statusPool.length > 0) {
      const statusId = statusPool[Math.floor(Math.random() * statusPool.length)];
      return { kind: 'status', itemId: statusId };
    }

    const fallback = availableWeaponKeys[Math.floor(Math.random() * availableWeaponKeys.length)];
    return { kind: 'weapon', itemId: fallback };
  }

  updateEnemies(delta) {
    const playerPos = this.player.mesh.position;

    // 1) Chase
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) {
        this.enemyPool.releaseAt(i);
        continue;
      }
      enemy.update(delta, playerPos);
    }

    // 2) Soft separation (§3.3) — rebuild interno da grade
    this.physics.applyEnemySoftSeparation(this.enemies, { dt: delta });

    // 3) Rebuild pós-separação para combate (§4.1)
    this.physics.rebuildEnemySpatialGrid(this.enemies);

    // 4) Contact damage + morte
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy?.active) continue;

      const dist = Math.hypot(enemy.x - playerPos.x, enemy.z - playerPos.z);
      if (dist < 2.3 && enemy.hitCooldown <= 0) {
        const mitigation = this.player.resistanceMultiplier || 1;
        const damageTaken = enemy.damage / mitigation;
        this.player.hp = Math.max(0, this.player.hp - damageTaken);
        enemy.hitCooldown = 1.1;
        console.log("Player hit:", this.player.hp, "mitigado por", mitigation);
      }

      if (enemy.hp <= 0) {
        this.killEnemy(enemy, { dropPickup: false });
      }
    }
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile?.active) {
        this.projectilePool.releaseAt(i);
        continue;
      }

      projectile.update(delta);

      if (projectile.visualOnly && projectile.staticEffect && projectile.visualType === "lightning") {
        if (projectile.isExpired || projectile.life <= 0) {
          this.releaseProjectile(projectile);
          continue;
        }
      }

      const px = projectile.mesh.position.x;
      const pz = projectile.mesh.position.z;

      if (projectile.staticEffect && projectile.visualType === "lightning" && !projectile.hitApplied && !projectile.visualOnly) {
        const damageRadius = projectile.damageRadius ?? 2.4;
        const nearby = this.physics.queryEnemiesNear(px, pz, damageRadius).slice();
        const victims = nearby.filter((candidate) => this.isEnemyVisible(candidate));

        if (victims.length > 0) {
          projectile.hitApplied = true;
          for (const victim of victims) {
            const dead = victim.takeDamage(projectile.damage);
            if (dead) {
              this.killEnemy(victim, { dropPickup: true });
            }
          }
        }
      }

      let victims = [];
      if (projectile.explosionRadius > 0) {
        victims = this.physics.queryEnemiesNear(px, pz, projectile.explosionRadius).slice();
      } else if (!projectile.staticEffect || projectile.visualType !== "lightning") {
        if (projectile.pierce) {
          const nearby = this.physics.queryEnemiesNear(px, pz, 2.2).slice();
          victims = nearby.filter((enemy) => enemy?.active && !projectile.hitIds.has(enemy.poolIndex));
        } else {
          const hit = this.physics.spatialGrid.queryFirst(px, pz, 2.2);
          if (hit) victims = [hit];
        }
      }

      if (victims.length > 0 && !(projectile.staticEffect && projectile.visualType === "lightning")) {
        let shouldRelease = !projectile.pierce;

        for (const victim of victims) {
          if (!victim?.active) continue;

          if (projectile.pierce) {
            if (projectile.hitIds.has(victim.poolIndex)) continue;
            projectile.hitIds.add(victim.poolIndex);
            projectile.pierceCount += 1;
          }

          const dead = victim.takeDamage(projectile.damage);
          if (dead) {
            this.killEnemy(victim, { dropPickup: true });
          }

          if (projectile.pierce && projectile.pierceCount >= (projectile.maxPierce ?? 64)) {
            shouldRelease = true;
            break;
          }
        }

        if (shouldRelease) {
          this.releaseProjectile(projectile);
          continue;
        }
      }

      if (projectile.isExpired || projectile.life <= 0) {
        this.releaseProjectile(projectile);
      }
    }
  }

  updatePickups(delta) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      pickup.update(delta);

      const pickupRange = this.player.pickupRange ?? 2.2;
      const dist = pickup.mesh.position.distanceTo(this.player.mesh.position);
      if (dist < pickupRange) {
        if (pickup.reward) {
          const resolved = resolvePickupReward(this.player, pickup.reward);
          if (resolved.applied) {
            const rewardColor = pickup.reward.kind === 'weapon' ? 0xfbbf24 : 0x60a5fa;
            this.vfx.spawnRewardPickup(this.player.mesh.position, {
              color: rewardColor,
              particlesMin: 18,
              particlesMax: 26,
              lifeMin: 0.55,
              lifeMax: 1.4,
              radiusMin: 0.35,
              radiusMax: 1.25,
              speed: 8,
              scale: 1.5,
              ttl: 1300,
            });
            console.log("Item pickup collected:", resolved);
            this.updateHud();
          }
        } else {
          this.player.xp += pickup.value;
          this.vfx.spawnPickup(this.player.mesh.position, {
            color: 0x7dd3fc,
            particlesMin: 10,
            particlesMax: 16,
            lifeMin: 0.5,
            lifeMax: 1.2,
            radiusMin: 0.25,
            radiusMax: 0.85,
            speed: 5.2,
            scale: 1.1,
            ttl: 1000,
          });
          console.log("XP pickup collected:", this.player.xp, "range:", pickupRange);
        }

        this.renderSystem.scene.remove(pickup.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }
}
