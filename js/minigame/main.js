import {
  ARCANE_SURVIVORS_FEATURE_ID,
  fetchFeatureUnlocked,
  softValidateSession,
} from "./access.js";

const CHARACTER_DEFS = {
  soulblade: {
    name: "Soulblade",
    weapon: "Lâmina Arcana",
    color: 0x00e5ff,
    hp: 100,
    speed: 15,
    projectileDamage: 1,
    projectileSpeed: 28,
    projectileColor: 0xffd166,
  },
  graveguard: {
    name: "Graveguard",
    weapon: "Lança de Ossos",
    color: 0xa78bfa,
    hp: 130,
    speed: 12,
    projectileDamage: 2,
    projectileSpeed: 24,
    projectileColor: 0xc4b5fd,
  },
  warden: {
    name: "Warden of Echoes",
    weapon: "Orbe de Fogo",
    color: 0x34d399,
    hp: 90,
    speed: 17,
    projectileDamage: 1.5,
    projectileSpeed: 34,
    projectileColor: 0x7dd3fc,
  },
};

const START_TIMEOUT_MS = 20000;

let selectedCharacter = "soulblade";
let accessAllowed = false;
let bootReady = false;
let starting = false;

function getStartBtn() {
  return document.getElementById("start-btn");
}

function setBootStatus(message, isError = false) {
  const el = document.getElementById("minigame-boot-status");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
  el.dataset.tone = isError ? "error" : "info";
}

function setStartEnabled(enabled, label = "Iniciar Partida") {
  const btn = getStartBtn();
  if (!btn) return;
  btn.disabled = !enabled;
  btn.textContent = label;
  btn.setAttribute("aria-busy", enabled ? "false" : "true");
}

function unsealPlayUi() {
  const play = document.getElementById("minigame-play");
  const sealed = document.getElementById("minigame-sealed");
  play?.classList.remove("is-sealed");
  if (sealed) sealed.hidden = true;
}

function selectCharacter(key) {
  if (!CHARACTER_DEFS[key]) return;
  selectedCharacter = key;
  document.querySelectorAll("[data-character-card]").forEach((card) => {
    const isSelected = card.dataset.characterCard === key;
    card.classList.toggle("is-selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  const summary = document.getElementById("selected-character-summary");
  const def = CHARACTER_DEFS[key];
  if (summary && def) {
    summary.textContent = `${def.name} • ${def.weapon} • HP ${def.hp}`;
  }
}

function restoreMenu() {
  const menu = document.getElementById("menu-layer");
  const canvas = document.getElementById("game-canvas");
  if (menu) {
    menu.style.display = "";
    menu.style.opacity = "1";
  }
  if (canvas) {
    canvas.style.display = "none";
    canvas.style.opacity = "0";
  }
  starting = false;
  setStartEnabled(accessAllowed && bootReady, accessAllowed ? "Iniciar Partida" : "Arena selada");
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} demorou demais (${Math.round(ms / 1000)}s). Recarregue a página.`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function startGame(characterKey = selectedCharacter) {
  const canvas = document.getElementById("game-canvas");
  const hud = document.getElementById("minigame-hud");
  if (!canvas) {
    throw new Error("Canvas #game-canvas não encontrado.");
  }

  if (typeof window.CANNON === "undefined") {
    throw new Error("Cannon.js não carregou. Verifique a rede / CDN e recarregue.");
  }

  setBootStatus("Carregando Three.js…");
  try {
    await withTimeout(import("./three.js"), 12000, "Three.js");
  } catch (error) {
    throw new Error(
      `Three.js não carregou (${error?.message || error}). Confira /js/vendor/three/build/three.module.js`
    );
  }

  setBootStatus("Carregando motor 3D…");
  const [{ RenderSystem }, { GameEngine }] = await withTimeout(
    Promise.all([
      import("./systems/RenderSystem.js"),
      import("./engine/GameEngine.js"),
    ]),
    START_TIMEOUT_MS,
    "Import do motor"
  );

  setBootStatus("Criando arena…");
  const render = new RenderSystem(canvas);
  const engine = new GameEngine({ renderSystem: render, characterKey });
  if (hud) hud.style.display = "flex";
  engine.start();
  setBootStatus("");
  return engine;
}

async function onStartClick() {
  if (starting) {
    setBootStatus("Já iniciando… aguarde ou recarregue se travar.", true);
    return;
  }

  if (!bootReady) {
    setBootStatus("Ainda verificando acesso…");
    setStartEnabled(false, "Aguarde…");
    return;
  }

  if (!accessAllowed) {
    setBootStatus("Arena selada para esta conta.", true);
    window.alert("Arcane Survivors ainda está selado para esta conta.");
    return;
  }

  const menu = document.getElementById("menu-layer");
  const canvas = document.getElementById("game-canvas");
  if (!menu || !canvas) {
    setBootStatus("UI incompleta — recarregue a página.", true);
    window.alert("UI do minigame incompleta. Recarregue a página.");
    return;
  }

  starting = true;
  setStartEnabled(false, "Iniciando…");
  setBootStatus("Iniciando partida…");
  menu.style.opacity = "0.35";

  try {
    menu.style.display = "none";
    canvas.style.display = "block";
    canvas.style.opacity = "1";
    await withTimeout(startGame(selectedCharacter), START_TIMEOUT_MS + 5000, "Start completo");
    console.log("Arcane Survivors: partida iniciada.");
  } catch (error) {
    console.error("Arcane Survivors: falha ao iniciar.", error);
    restoreMenu();
    const detail = error?.message || String(error);
    setBootStatus(detail, true);
    window.alert(`Não foi possível iniciar a partida.\n\n${detail}`);
  }
}

function showSealedState(reason = "") {
  const play = document.getElementById("minigame-play");
  const sealed = document.getElementById("minigame-sealed");
  play?.classList.add("is-sealed");
  if (sealed) sealed.hidden = false;
  accessAllowed = false;
  setStartEnabled(false, "Arena selada");
  if (reason) setBootStatus(reason, true);
}

function bindPlayUi() {
  document.querySelectorAll("[data-character-card]").forEach((card) => {
    card.addEventListener("click", () => selectCharacter(card.dataset.characterCard));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCharacter(card.dataset.characterCard);
      }
    });
  });

  const btn = getStartBtn();
  if (btn) {
    btn.type = "button";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void onStartClick();
    });
  }

  selectCharacter(selectedCharacter);
  setStartEnabled(false, "Verificando acesso…");
  setBootStatus("Verificando acesso…");
}

async function resolveAccess() {
  const result = await softValidateSession(4000);
  if (!result?.user) {
    showSealedState("Faça login para entrar na arena.");
    bootReady = true;
    return false;
  }

  const { session, user } = result;
  const isAdmin = user.role === "admin";
  let unlocked = false;

  if (!isAdmin && session?.token) {
    unlocked = await fetchFeatureUnlocked(session.token, ARCANE_SURVIVORS_FEATURE_ID, 4000);
  }

  if (unlocked || isAdmin) {
    accessAllowed = true;
    unsealPlayUi();
    bootReady = true;
    setStartEnabled(true, "Iniciar Partida");
    setBootStatus(isAdmin ? "Acesso Mestre liberado." : "Arena liberada.");
    return true;
  }

  showSealedState("O Mestre ainda não destravou Arcane Survivors.");
  bootReady = true;
  return false;
}

function boot() {
  try {
    bindPlayUi();
    void resolveAccess();
  } catch (error) {
    console.error("Arcane Survivors: boot falhou", error);
    setBootStatus(error?.message || String(error), true);
    setStartEnabled(false, "Erro no boot");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
