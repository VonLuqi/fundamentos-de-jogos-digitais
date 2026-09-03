import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";
import { getSession, submitMinigameRun } from "../../api.js";
import { InputHandler } from "./InputHandler.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Pickup } from "../entities/Pickup.js";
import { Projectile } from "../entities/Projectile.js";
import { PhysicsSystem } from "../systems/PhysicsSystem.js";
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
    this.state = "playing";
    this.runTime = 0;
    this.gameDuration = 20 * 60;
    this.resultSubmitted = false;
    this.upgradeOverlay = null;
    this.upgradeChoices = [];

    const config = {
      soulblade: { name: "Soulblade", weapon: "Lâmina Arcana", color: 0x00e5ff, hp: 100, speed: 15, projectileDamage: 1, projectileSpeed: 28, projectileColor: 0xffd166 },
      graveguard: { name: "Graveguard", weapon: "Lança de Ossos", color: 0xa78bfa, hp: 130, speed: 12, projectileDamage: 2, projectileSpeed: 24, projectileColor: 0xc4b5fd },
      warden: { name: "Warden of Echoes", weapon: "Orbe de Fogo", color: 0x34d399, hp: 90, speed: 17, projectileDamage: 1.5, projectileSpeed: 34, projectileColor: 0xf97316 },
    }[characterKey] || {
      name: "Soulblade", weapon: "Lâmina Arcana", color: 0x00e5ff, hp: 100, speed: 15, projectileDamage: 1, projectileSpeed: 28, projectileColor: 0xffd166,
    };

    this.characterConfig = config;

    this.weaponLibrary = {
      "lâmina arcana": { id: "lâmina arcana", name: "Lâmina Arcana", pattern: "nearest", fireRate: 0.42, damage: 1, speed: 28, color: 0xffd166, radius: 0.52 },
      "lança de ossos": { id: "lança de ossos", name: "Shotgun de Ossos", pattern: "spread", fireRate: 0.72, damage: 2, speed: 24, color: 0xc4b5fd, radius: 0.48 },
      "orbe de fogo": { id: "orbe de fogo", name: "Orbe de Fogo", pattern: "orbital", fireRate: 0.9, damage: 1.5, speed: 34, color: 0xf97316, radius: 0.58, explosionRadius: 1.2 },
      "vento cortante": { id: "vento cortante", name: "Vento Cortante", pattern: "cleave", fireRate: 0.3, damage: 1.2, speed: 32, color: 0x93c5fd, radius: 0.28, life: 0.55 },
      "relâmpago sagrado": { id: "relâmpago sagrado", name: "Relâmpago Sagrado", pattern: "lightning", fireRate: 0.55, damage: 2.2, speed: 26, color: 0xfed7aa, radius: 0.18, life: 0.45 },
    };

    this.input = new InputHandler();
    this.physics = new PhysicsSystem();
    this.vfx = new VfxSystem(this.renderSystem.scene);
    this.physics.world.gravity.set(0, -9.82, 0);

    this.weaponProfile = {
      soulblade: { fireRate: 0.42, pattern: "nearest" },
      graveguard: { fireRate: 0.75, pattern: "spread" },
      warden: { fireRate: 0.9, pattern: "orbital" },
    }[this.characterKey] || { fireRate: 0.45, pattern: "nearest" };

    this.player = new Player(this.renderSystem.scene, this.physics.world, {
      color: config.color,
      speed: config.speed,
      size: 2,
    });
    this.player.hp = config.hp;
    this.player.maxHp = config.hp;
    this.player.baseMaxHp = config.hp;
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

    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, 0, 0);
    this.physics.addBody(groundBody);

    this.enemies = [];
    this.projectiles = [];
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

    if (hpEl) hpEl.textContent = `${Math.max(0, Math.round(this.player.hp))} / ${Math.max(1, Math.round(this.player.maxHp))}`;
    if (xpEl) xpEl.textContent = `${Math.max(0, Math.round(this.player.xp))} / ${Math.max(1, Math.round(this.player.xpToNextLevel))}`;
    if (timeEl) {
      const elapsed = Math.min(this.runTime, this.gameDuration);
      const minutes = Math.floor(elapsed / 60);
      const seconds = Math.floor(elapsed % 60);
      const totalMinutes = Math.floor(this.gameDuration / 60);
      const totalSeconds = Math.floor(this.gameDuration % 60);
      timeEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} / ${String(totalMinutes).padStart(2, "0")}:${String(totalSeconds).padStart(2, "0")}`;
    }
    if (statusEl) {
      const activeStatuses = this.player.statusSlots
        .filter(Boolean)
        .map((slot) => STATUS_LIBRARY[normalizeStatusId(slot.id)]?.name || slot.id)
        .slice(0, 2)
        .join(" • ");
      statusEl.textContent = activeStatuses || "Nenhum status";
    }
    if (weaponListEl) {
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
    if (statusListEl) {
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
    if (levelEl) levelEl.textContent = `Lv ${this.player.level}`;
    if (healthFill) healthFill.style.width = `${Math.round(hpRatio * 100)}%`;
    if (xpFill) xpFill.style.width = `${Math.round(xpRatio * 100)}%`;
    if (dmgEl) dmgEl.textContent = `${this.player.projectileDamage?.toFixed(1) ?? "1.0"}`;
    if (speedEl) speedEl.textContent = `${Math.round(this.player.speed ?? this.player.baseSpeed ?? 15)}`;
    if (atkEl) atkEl.textContent = `${(this.weaponProfile.fireRate / (this.player.attackCooldownMultiplier || 1)).toFixed(2)}s`;
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
    this.lastTime = performance.now();
    this.updateHud();
    requestAnimationFrame(this._loop.bind(this));
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

    const finalXp = Math.max(0, Math.round(this.player.xp));
    this.showResultOverlay({ won, xp: finalXp });
    this.updateHud();

    const session = getSession();
    if (!session?.token) {
      console.warn("GameEngine: sessão não encontrada; XP não foi enviado ao backend.");
      return;
    }

    try {
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

  /** Start the game loop */
  start() {
    this.showHud();
    this.state = "playing";
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop.bind(this));
  }

  /** Stop the game loop */
  stop() {
    this.running = false;
  }

  _loop(timestamp) {
    if (!this.running) return;
    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(delta);
    this.renderSystem.render();

    if (this.running) {
      requestAnimationFrame(this._loop.bind(this));
    }
  }

  /**
   * Game state update – called each frame.
   * @param {number} delta – elapsed time in seconds since previous frame.
   */
  update(delta) {
    if (this.state !== "playing") return;

    this.runTime += delta;
    const direction = this.input.getDirection();
    this.player.update(delta, direction);

    if (this.xpPickupRing) {
      const baseRange = this.player.basePickupRange ?? 2.2;
      const range = this.player.pickupRange ?? baseRange;
      const visualScale = Math.max(0.9, 1 + ((range - baseRange) / 2.2) * 2.2);
      this.xpPickupRing.position.set(this.player.mesh.position.x, 0.12, this.player.mesh.position.z);
      this.xpPickupRing.scale.set(visualScale, visualScale, visualScale);
    }

    const arenaLimit = 110;
    this.player.body.position.x = THREE.MathUtils.clamp(this.player.body.position.x, -arenaLimit, arenaLimit);
    this.player.body.position.z = THREE.MathUtils.clamp(this.player.body.position.z, -arenaLimit, arenaLimit);

    if (this.player.hp <= 0) {
      this.finishRun({ won: false });
      return;
    }

    if (this.runTime >= this.gameDuration) {
      this.finishRun({ won: true });
      return;
    }

    this.updateHud();
    this.vfx.update();

    if (this.player.regenPerSecond > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regenPerSecond * delta);
    }

    if (this.player.xp >= this.player.xpToNextLevel) {
      this.player.xp -= this.player.xpToNextLevel;
      this.player.level += 1;
      this.player.xpToNextLevel = this.getXpForLevel(this.player.level);
      this.triggerLevelUp();
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.spawnTimer += delta;

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
      this.attackCooldown = this.weaponProfile.fireRate / (this.player.attackCooldownMultiplier || 1);
    }

    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updatePickups(delta);
    this.physics.update(delta);
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
    const width = 200;
    const playerPos = this.player.mesh.position;
    const difficulty = this.getDifficultyLevel();
    const enemyStats = getEnemyStats(difficulty, this.player.level);
    const phaseMultiplier = 1 + difficulty * 0.7;

    let x = 0;
    let z = 0;
    let attempts = 0;

    do {
      x = (Math.random() - 0.5) * width;
      z = (Math.random() - 0.5) * width;
      attempts += 1;
    } while (attempts < 20 && Math.hypot(x - playerPos.x, z - playerPos.z) < 24);

    const enemy = new Enemy(this.renderSystem.scene, { x, z }, {
      speed: enemyStats.speed * phaseMultiplier,
      hp: enemyStats.hp,
      damage: enemyStats.damage,
    });

    this.enemies.push(enemy);
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

  getNearestEnemy() {
    if (!this.enemies.length) return null;
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
      if (dist < nearestDistance) {
        nearest = enemy;
        nearestDistance = dist;
      }
    }

    return nearest;
  }

  getAimVector(fallbackDirection = { x: 1, z: 0 }, preferMouse = false) {
    if (preferMouse) {
      const mouseAim = this.input.getMouseAimDirection();
      if (mouseAim && (mouseAim.x !== 0 || mouseAim.z !== 0)) {
        return mouseAim;
      }
    }

    const nearestEnemy = this.getNearestEnemy();
    if (nearestEnemy) {
      const dx = nearestEnemy.mesh.position.x - this.player.mesh.position.x;
      const dz = nearestEnemy.mesh.position.z - this.player.mesh.position.z;
      const length = Math.hypot(dx, dz) || 1;
      return { x: dx / length, z: dz / length };
    }

    return fallbackDirection;
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
    const fallback = direction && (direction.x !== 0 || direction.z !== 0)
      ? direction
      : { x: 1, z: 0 };

    const activeWeapons = this.player.weaponSlots.filter(Boolean);
    if (!activeWeapons.length) return;

    activeWeapons.forEach((weapon) => {
      const weaponPattern = weapon.pattern || "nearest";
      const useMouseAim = weapon.id === "lança de ossos";
      const aim = useMouseAim
        ? this.getAimVector(fallback, true)
        : this.getAimVector(fallback, false);

      if (weaponPattern === "nearest") {
        this.fireProjectile(aim, weapon);
        this.vfx.spawnImpact({
          x: this.player.mesh.position.x + aim.x * 1.4,
          y: this.player.mesh.position.y,
          z: this.player.mesh.position.z + aim.z * 1.4,
        }, {
          color: weapon.color ?? 0xffd166,
          particlesMin: 7,
          particlesMax: 11,
          lifeMin: 0.2,
          lifeMax: 0.7,
          radiusMin: 0.12,
          radiusMax: 0.6,
          speed: 2.6,
          scale: 0.8,
          ttl: 600,
        });
        return;
      }

      if (weaponPattern === "spread") {
        const baseAngle = Math.atan2(aim.z, aim.x);
        const boneOffsets = [-0.9, -0.42, 0, 0.42, 0.9];
        this.vfx.spawnImpact({
          x: this.player.mesh.position.x + aim.x * 1.4,
          y: this.player.mesh.position.y,
          z: this.player.mesh.position.z + aim.z * 1.4,
        }, {
          color: weapon.color ?? 0xc4b5fd,
          particlesMin: 8,
          particlesMax: 14,
          lifeMin: 0.25,
          lifeMax: 0.75,
          radiusMin: 0.14,
          radiusMax: 0.7,
          speed: 3.4,
          scale: 0.95,
          ttl: 650,
        });

        boneOffsets.forEach((offset, index) => {
          const spreadAngle = baseAngle + offset;
          const falloff = 0.7 + (index === 2 ? 1.0 : 0.55 + Math.abs(offset) * 0.25);
          this.fireProjectile({
            x: Math.cos(spreadAngle) * falloff,
            z: Math.sin(spreadAngle) * falloff,
          }, {
            ...weapon,
            speed: (weapon.speed ?? 24) * 1.2,
            damage: (weapon.damage ?? 2) * 0.9,
            color: 0xc4b5fd,
            radius: 0.32,
            life: 0.95,
            maxDistance: 16,
          });
        });
        return;
      }

      if (weaponPattern === "cleave") {
        const cleaveAngles = [-0.75, 0, 0.75];
        this.vfx.spawnWindCleaveTrail(this.player.mesh.position, aim, weapon.color ?? 0x93c5fd);
        cleaveAngles.forEach((offset) => {
          const angle = Math.atan2(aim.z, aim.x) + offset;
          this.fireProjectile({ x: Math.cos(angle), z: Math.sin(angle) }, {
            ...weapon,
            speed: (weapon.speed ?? 28) * 1.35,
            damage: (weapon.damage ?? 1.2) * 1.15,
            color: 0x8cf0ff,
            life: 0.9,
            radius: 0.2,
            maxDistance: 18,
            visualType: "wind",
          });
        });
        return;
      }

      if (weaponPattern === "lightning") {
        this.vfx.spawnLightningImpact(this.player.mesh.position, { x: this.player.mesh.position.x + (aim.x * 2.4), y: 1.2, z: this.player.mesh.position.z + (aim.z * 2.4) }, weapon.color ?? 0xfde68a);
        const visibleEnemies = this.enemies.filter((enemy) => this.isEnemyVisible(enemy));
        const strike = visibleEnemies.length
          ? visibleEnemies[Math.floor(Math.random() * visibleEnemies.length)]
          : null;

        if (!strike) return;

        const targetPos = { x: strike.mesh.position.x, z: strike.mesh.position.z };
        const hitDirection = {
          x: strike.mesh.position.x - this.player.mesh.position.x,
          z: strike.mesh.position.z - this.player.mesh.position.z,
        };
        const len = Math.hypot(hitDirection.x, hitDirection.z) || 1;
        const vector = { x: hitDirection.x / len, z: hitDirection.z / len };

        this.fireProjectile(vector, {
          ...weapon,
          speed: 0,
          damage: (weapon.damage ?? 1) * 1.5,
          color: 0xfde68a,
          life: 0.38,
          radius: 0.3,
          damageRadius: 4.8,
          visualType: "lightning",
          staticEffect: true,
          visualOnly: false,
        }, targetPos);

        this.fireProjectile({ x: 0, z: 0 }, {
          ...weapon,
          speed: 0,
          damage: 0,
          color: 0xfde68a,
          life: 0.42,
          radius: 0.25,
          visualType: "lightning",
          staticEffect: true,
          visualOnly: true,
          damageRadius: 0,
        }, { x: this.player.mesh.position.x, z: this.player.mesh.position.z });

        if (strike.takeDamage(weapon.damage ?? 1.5)) {
          const victimIndex = this.enemies.findIndex((entry) => entry === strike);
          if (victimIndex >= 0) {
            this.renderSystem.scene.remove(strike.mesh);
            this.enemies.splice(victimIndex, 1);
            this.spawnPickup({ x: strike.mesh.position.x, z: strike.mesh.position.z }, this.getPickupValue());
          }
        }
        return;
      }

      const orbitalCount = 8;
      this.vfx.spawnFireOrbBurst(this.player.mesh.position, weapon.color ?? 0xf97316);
      for (let i = 0; i < orbitalCount; i += 1) {
        const angle = (Math.PI * 2 * i) / orbitalCount + (this.runTime * 2.6);
        this.fireProjectile({ x: Math.cos(angle), z: Math.sin(angle) }, weapon);
      }
    });
  }

  fireProjectile(direction, weaponOverride = null, positionOverride = null) {
    const weapon = weaponOverride || {
      speed: this.player.projectileSpeed ?? 28,
      damage: this.player.projectileDamage ?? 1,
      color: this.player.projectileColor ?? 0xffd166,
    };

    const spawnPosition = positionOverride ?? this.player.mesh.position;

    const projectile = new Projectile(this.renderSystem.scene, spawnPosition, direction, {
      speed: weapon.speed ?? 28,
      damage: weapon.damage ?? 1,
      life: weapon.life ?? 1.8,
      color: weapon.color ?? 0xffd166,
      radius: weapon.radius ?? 0.5,
      explosionRadius: weapon.explosionRadius ?? 0,
      maxDistance: weapon.maxDistance ?? 18,
      arenaLimit: 110,
      visualType: weapon.visualType ?? "orb",
      staticEffect: weapon.staticEffect ?? false,
      visualOnly: weapon.visualOnly ?? false,
      damageRadius: weapon.damageRadius ?? 0,
    });

    projectile.explosionRadius = weapon.explosionRadius ?? 0;
    this.projectiles.push(projectile);
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

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, playerPos);

      const dist = enemy.mesh.position.distanceTo(playerPos);
      if (dist < 2.3 && enemy.hitCooldown <= 0) {
        const mitigation = this.player.resistanceMultiplier || 1;
        const damageTaken = enemy.damage / mitigation;
        this.player.hp = Math.max(0, this.player.hp - damageTaken);
        enemy.hitCooldown = 1.1;
        console.log("Player hit:", this.player.hp, "mitigado por", mitigation);
      }

      if (enemy.hp <= 0) {
        this.vfx.spawnEnemyDeathBurst(enemy.mesh.position, 0x8b5cf6);
        this.renderSystem.scene.remove(enemy.mesh);
        this.enemies.splice(i, 1);
      }
    }
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);

      if (projectile.visualOnly && projectile.staticEffect && projectile.visualType === "lightning") {
        if (projectile.isExpired || projectile.life <= 0) {
          this.renderSystem.scene.remove(projectile.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (projectile.staticEffect && projectile.visualType === "lightning" && !projectile.hitApplied && !projectile.visualOnly) {
        const victims = this.enemies.filter((candidate) => {
          const dist = candidate.mesh.position.distanceTo(projectile.mesh.position);
          const visible = this.isEnemyVisible(candidate);
          return visible && dist <= (projectile.damageRadius ?? 2.4);
        });

        if (victims.length > 0) {
          projectile.hitApplied = true;
          for (const victim of victims) {
            const dead = victim.takeDamage(projectile.damage);
            if (dead) {
              const victimIndex = this.enemies.findIndex((entry) => entry === victim);
              if (victimIndex >= 0) {
                this.renderSystem.scene.remove(victim.mesh);
                this.enemies.splice(victimIndex, 1);
                this.spawnPickup({
                  x: victim.mesh.position.x,
                  z: victim.mesh.position.z,
                }, this.getPickupValue());
              }
            }
          }
        }
      }

      let victims = [];
      if (projectile.explosionRadius > 0) {
        victims = this.enemies.filter((candidate) => candidate.mesh.position.distanceTo(projectile.mesh.position) <= projectile.explosionRadius);
      } else if (!projectile.staticEffect || projectile.visualType !== "lightning") {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dist = projectile.mesh.position.distanceTo(enemy.mesh.position);
          if (dist < 2.2) {
            victims = [enemy];
            break;
          }
        }
      }

      if (victims.length > 0 && !(projectile.staticEffect && projectile.visualType === "lightning")) {
        for (const victim of victims) {
          const dead = victim.takeDamage(projectile.damage);
          if (dead) {
            const victimIndex = this.enemies.findIndex((entry) => entry === victim);
            if (victimIndex >= 0) {
              this.vfx.spawnEnemyDeathBurst(victim.mesh.position, 0x8b5cf6);
              this.vfx.spawnEnemyDeathBurst(victim.mesh.position, 0x8b5cf6);
              this.renderSystem.scene.remove(victim.mesh);
              this.enemies.splice(victimIndex, 1);
              this.spawnPickup({
                x: victim.mesh.position.x,
                z: victim.mesh.position.z,
              }, this.getPickupValue());
            }
          }
        }

        this.renderSystem.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (projectile.isExpired || projectile.life <= 0) {
        this.renderSystem.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
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
