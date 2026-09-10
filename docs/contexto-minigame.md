# Contexto — Minigame Roguelite (Arcane Survivors)

Documento de orientação rápida: **ideia do minigame** e **o que já está implementado**.  
Design completo: [`minigame-gdd.md`](./minigame-gdd.md).  
Planos auxiliares: [`minigame-implementation-plan.md`](./minigame-implementation-plan.md), [`minigame-balance-plan.md`](./minigame-balance-plan.md), [`minigame-fix-plan.md`](./minigame-fix-plan.md), [`planejamento-correcoes-minigame.md`](./planejamento-correcoes-minigame.md).

> Não confundir com o ARG *Enigma do Submundo* (salas `/submundo`). Este documento cobre só o **jogo de sobrevivência** em `pages/minigame.html`.

---

## 1. Ideia

**Arcane Survivors** é um minigame **top-down de sobrevivência roguelite**, no espírito de *Vampire Survivors*, integrado à plataforma educacional Fundamentos de Jogos Digitais.

### Premissa

- Arena vista de cima; o herói move-se com WASD/setas e **dispara automaticamente**.
- Hordas de inimigos avançam; derrotá-los gera gemas de XP da run.
- Ao subir de nível, o jogador escolhe **power-ups** (armas ou status) e monta uma build.
- A run termina em **derrota** (HP zerado) ou **vitória** (sobreviver **20 minutos**).
- O XP da run pode ser enviado ao perfil do aluno (`action: addRunXP` no backend).

### Objetivos de design

| Objetivo | Como aparece no jogo |
| --- | --- |
| Loop curto e compulsivo | Entrar, lutar, evoluir, morrer/vencer, repetir |
| Decisão rápida | Overlay de upgrades a cada level-up |
| Progressão sentida | Poder cresce via slots de arma + status |
| Ligação com o curso | XP da run → XP do perfil (server-side) |
| Identidade visual | Tema sombrio/místico; Three.js + VFX; HUD estilo Domínio/Hades |

### Core loop

1. Escolher personagem (3 opções).
2. Entrar na arena com arma inicial.
3. Mover + auto-ataque; inimigos spawnam com dificuldade crescente.
4. Coletar XP → level-up → escolher upgrade.
5. Repetir até 20:00 ou morte.
6. Tela de resultado + `submitMinigameRun` (se logado).

---

## 2. Design alvo (GDD)

| Pilar | Meta |
| --- | --- |
| Personagens | Soulblade, Graveguard, Warden of Echoes (arma inicial distinta) |
| Armas | 5 slots; famílias: Lâmina Arcana, Lança de Ossos, Orbe de Fogo, Vento Cortante, Relâmpago Sagrado |
| Status | 5 slots cumulativos (velocidade, dano, ataque, vida, pickup, etc.) |
| Power-ups | **40** no GDD (20 arma + 20 status), com raridades |
| Duração | Vitória aos **20 minutos**; curva de dificuldade |
| Stack | Three.js (cena/câmera), Cannon.js (física), página isolada do app-shell |

---

## 3. O que já está implementado

O jogo é **jogável de ponta a ponta** (menu → run → level-up → fim → envio de XP). Vários planos antigos ainda marcam itens como “pendentes”; o código já avançou além desses checklists em vários pontos.

### 3.1 Base de gameplay — ✅

| Área | Estado | Onde |
| --- | --- | --- |
| Página + canvas | ✅ | `pages/minigame.html` |
| Bootstrap / seleção de personagem | ✅ | `js/minigame/main.js` |
| Loop, estados (playing / upgrade / victory / defeat) | ✅ | `js/minigame/engine/GameEngine.js` |
| Input WASD/setas | ✅ | `js/minigame/engine/InputHandler.js` |
| Render Three.js + follow cam | ✅ | `js/minigame/systems/RenderSystem.js` |
| Física Cannon | ✅ | `js/minigame/systems/PhysicsSystem.js` |
| Player / Enemy / Projectile / Pickup | ✅ | `js/minigame/entities/*` |
| VFX | ✅ | `js/minigame/systems/VfxSystem.js` |
| Arena com limites | ✅ | GameEngine + render |

### 3.2 Sistemas de build — ✅ (com lacunas vs GDD)

| Área | Estado | Notas |
| --- | --- | --- |
| 3 personagens com stats/arma inicial | ✅ | Soulblade, Graveguard, Warden |
| 5 slots de arma | ✅ | `createWeaponSlots` + biblioteca de padrões (nearest, spread, orbital, cleave, lightning) |
| 5 slots de status | ✅ | `StatusSystem.js` (`STATUS_SLOT_ORDER`) |
| Biblioteca de power-ups + escolha no level-up | ✅ | `PowerupSystem.js` + overlay no HUD |
| Raridades / progressão de item | ✅ | `RARITY_DEFINITIONS`, `ITEM_PROGRESSION_LIBRARY` |
| Contagem de power-ups | ⚠️ | Código tem **~35** entradas em `POWERUP_LIBRARY`; GDD pede **40** |
| HUD (HP, XP, nível, tempo, armas, status) | ✅ | Markup em `minigame.html` + updates no GameEngine |
| Overlay de upgrade | ✅ | Cartas com tag, raridade, impacto |
| Dificuldade 20 min | ✅ | `DifficultyConfig.js` (nível 0–10, spawn, stats de inimigo) |
| Vitória / derrota + submit XP | ✅ | `submitMinigameRun` → `api/progress.js` `addRunXP` |

### 3.3 Integração com a plataforma

- Cliente: `js/api.js` → `submitMinigameRun(token, xp, durationSeconds)`.
- Servidor: `api/progress.js` action `addRunXP` soma XP ao usuário autenticado.
- Navegação: página **fora do app-shell** principal (rota secundária / órfã na reformulação de nav); acesso típico via URL `pages/minigame.html` (ou rewrite, se houver).

### 3.4 Ainda em evolução / polimento

Com base nos planos de correção e balanceamento (e no gap GDD × código):

- Completar/alinhar pool aos **40 power-ups** do GDD.
- Balancear pressão de horda (planos citam jogo ainda fácil demais).
- Identidade visual/comportamental de armas (ex.: Relâmpago como raio, Vento como cleave — ver `minigame-balance-plan.md`).
- Estabilidade pós level-up / HUD (já houve bugs de “travar ao upar”; ver `minigame-fix-plan.md`).
- Reintegrar CTA/navegação no shell, se desejado (hoje é exceção arquitetural).
- Playtest longo (run completa 20 min) e anti-abuso no `addRunXP` (validação server-side ainda mínima).

---

## 4. Mapa de arquivos

```
pages/minigame.html                 # UI, HUD, overlays, CDN Three/Cannon
js/minigame/main.js                 # Menu + start
js/minigame/engine/GameEngine.js    # Loop, combate, UI, fim de run
js/minigame/engine/InputHandler.js
js/minigame/engine/DifficultyConfig.js
js/minigame/entities/{Player,Enemy,Projectile,Pickup}.js
js/minigame/systems/{Render,Physics,Powerup,Status,Vfx}System.js
js/api.js                           # submitMinigameRun
api/progress.js                     # addRunXP
docs/minigame-gdd.md                # Design alvo
docs/minigame-*.md                  # Planos de impl. / balance / fix
```

---

## 5. Como rodar

1. `npm run dev` (ou `node local-server.mjs`).
2. Abrir `/pages/minigame.html` (ou a rota equivalente no servidor).
3. Escolher personagem → Iniciar.
4. Para gravar XP no perfil: estar logado na mesma origem.

---

## 6. Estado atual (resumo)

| Item | Status |
| --- | --- |
| Ideia / GDD roguelite | ✅ Documentado |
| Protótipo jogável (cena, combate, XP, fim) | ✅ |
| 3 personagens + slots arma/status + level-up | ✅ |
| Curva 20 min + submit XP | ✅ |
| Pool 40 power-ups alinhado ao GDD | ⚠️ Parcial (~35) |
| Balanceamento “feel” Vampire Survivors | ⏳ Em evolução |
| Integração no menu principal / shell | ❌ Fora de escopo atual de nav |

**Em uma frase:** o Arcane Survivors já é um roguelite de sobrevivência jogável com build por upgrades e bridge de XP para o curso; o trabalho restante é fechar o conteúdo do GDD, balancear a pressão da run e polir armas/HUD/navegação — não recomeçar o motor.
