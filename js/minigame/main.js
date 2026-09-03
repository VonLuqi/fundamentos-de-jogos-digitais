import { RenderSystem } from "./systems/RenderSystem.js";
import { GameEngine } from "./engine/GameEngine.js";

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

let selectedCharacter = "soulblade";

function selectCharacter(key) {
  selectedCharacter = key;
  const cards = document.querySelectorAll("[data-character-card]");
  cards.forEach((card) => {
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

function startGame(characterKey = selectedCharacter) {
  console.log("startGame: Initializing game for", characterKey);
  const canvas = document.getElementById("game-canvas");
  const hud = document.getElementById("minigame-hud");
  if (!canvas) {
    console.error("startGame: Canvas element not found!");
    return;
  }
  try {
    const render = new RenderSystem(canvas);
    const engine = new GameEngine({ renderSystem: render, characterKey: characterKey });
    if (hud) {
      hud.style.display = "flex";
    }
    engine.start();
    console.log("startGame: GameEngine started.");
  } catch (error) {
    console.error("startGame: Error initializing game engine:", error);
  }
}

function showCanvas() {
  console.log("showCanvas: Button clicked. Attempting to hide menu and show canvas.");
  const menu = document.getElementById("menu-layer");
  const canvas = document.getElementById("game-canvas");

  if (!menu) {
    console.error("showCanvas: Menu layer element (#menu-layer) not found!");
    return;
  }
  if (!canvas) {
    console.error("showCanvas: Canvas element (#game-canvas) not found!");
    return;
  }

  try {
    menu.style.opacity = "0";
    setTimeout(() => {
      menu.style.display = "none";
      canvas.style.display = "block";
      canvas.style.opacity = "0";
      requestAnimationFrame(() => {
        canvas.style.transition = "opacity 0.5s";
        canvas.style.opacity = "1";
      });
      startGame(selectedCharacter);
      console.log("showCanvas: Transition and startGame initiated.");
    }, 300);
  } catch (error) {
    console.error("showCanvas: Error during canvas transition or game start:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded: DOM fully loaded and parsed.");

  const cards = document.querySelectorAll("[data-character-card]");
  cards.forEach((card) => {
    card.addEventListener("click", () => selectCharacter(card.dataset.characterCard));
  });

  const btn = document.getElementById("start-btn");
  if (btn) {
    btn.addEventListener("click", showCanvas);
    console.log("DOMContentLoaded: Event listener attached to #start-btn.");
  } else {
    console.error("DOMContentLoaded: Start button (#start-btn) not found!");
  }

  selectCharacter(selectedCharacter);
});
