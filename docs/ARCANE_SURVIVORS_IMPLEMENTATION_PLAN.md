# Arcane Survivors — Plano de Implementação Técnico

> **Fonte de verdade:** [`arcane-survivors-gdd.md`](./arcane-survivors-gdd.md)  
> **Stack:** Three.js (WebGL) · Cannon.js · Object Pooling · Spatial Grid · Supabase via `/api/progress.js`  
> **Skills Three.js (obrigatório):** [`threejs-skills/skills/`](../threejs-skills/skills/) — ver regra Cursor `.cursor/rules/threejs-skills.mdc`  
> **Meta de produto:** Roguelite de sobrevivência 20 min, desktop + touch, integrado à plataforma educacional.

Este documento é o **mapa guia de desenvolvimento**: fases incrementais onde cada fase só avança quando a anterior está rodando de ponta a ponta (smoke manual ou smoke test).

### Legenda de status (auditoria 2026-09-09)

| Marca | Significado |
| :--- | :--- |
| `[x]` ✅ | Feito e reutilizável |
| `[ ]` ⚠️ | Parcial / existe mas diverge do GDD ou do critério técnico |
| `[ ]` ❌ | Não implementado — backlog real |

**Veredito:** vertical slice jogável (menu → run → level-up → fim → XP). Não recomeçar Fases 1–6; evoluir o código existente.

---

## Skills Three.js do Repositório (obrigatório em toda fase gráfica)

Qualquer tarefa que toque em cena, mesh, material, luz, câmera, instancing, shader, VFX, textura, loader, animação ou pós-processamento **deve** seguir as skills em `threejs-skills/skills/<nome>/SKILL.md` (ler a skill **antes** de codificar).

| Skill | Caminho | Uso no minigame |
| :--- | :--- | :--- |
| `threejs-fundamentals` | `threejs-skills/skills/threejs-fundamentals/SKILL.md` | Scene, camera, renderer, hierarchy, transforms |
| `threejs-geometry` | `threejs-skills/skills/threejs-geometry/SKILL.md` | Geometrias, `InstancedMesh`, buffers da horda |
| `threejs-materials` | `threejs-skills/skills/threejs-materials/SKILL.md` | Materiais de arena, armas, pickups, emissive |
| `threejs-lighting` | `threejs-skills/skills/threejs-lighting/SKILL.md` | Iluminação dark fantasy da arena |
| `threejs-textures` | `threejs-skills/skills/threejs-textures/SKILL.md` | Mapas/texturas de props e feedback visual |
| `threejs-animation` | `threejs-skills/skills/threejs-animation/SKILL.md` | Motion de câmera, órbitas, feedback de upgrade |
| `threejs-loaders` | `threejs-skills/skills/threejs-loaders/SKILL.md` | Carregar modelos/assets externos |
| `threejs-shaders` | `threejs-skills/skills/threejs-shaders/SKILL.md` | Glow, brilho de arma, efeitos custom |
| `threejs-interaction` | `threejs-skills/skills/threejs-interaction/SKILL.md` | Raycast/picking se houver interação 3D |
| `threejs-postprocessing` | `threejs-skills/skills/threejs-postprocessing/SKILL.md` | Bloom, passes de clima/raridade |

**Regra:** não inventar boilerplate Three.js genérico que contradiga essas skills. Em cada checklist abaixo, a nota “Skills: …” indica quais SKILL.md abrir naquele passo.

---

## Princípios de Execução

1. **Dependência estrita:** não abrir Fase N+1 sem um build jogável da Fase N.
2. **Arquivos-alvo únicos:** cada tarefa aponta o caminho canônico da árvore do GDD (§5.1).
3. **Skills Three.js primeiro:** ler `threejs-skills/skills/*/SKILL.md` relevantes antes de qualquer código gráfico.
4. **Performance desde cedo:** pools, `InstancedMesh` e grid espacial entram antes do polish visual.
5. **Contrato estável de input:** desktop e touch alimentam o mesmo vetor normalizado `(x, y)` no Player.
6. **Estado da engine:** `MENU` → `PLAYING` → `LEVEL_UP` → `VICTORY` | `DEFEAT`.
7. **Reuso primeiro:** preferir estender `js/minigame/**` existente a greenfield.

### Critérios de “Done” por fase

| Fase | Critério mínimo de aceite | Status |
| :--- | :--- | :---: |
| 1 | Canvas WebGL + loop 60 Hz + input produzindo vetor sem crash | ✅ |
| 2 | Player move na arena com câmera follow e colisão de limites | ✅ |
| 3 | ≥200 inimigos simultâneos via InstancedMesh a ~60 FPS desktop | ✅ |
| 4 | Auto-ataque mata inimigos; HP do player cai ao contato; morte → `DEFEAT` | ✅ |
| 5 | Gemas → level-up → overlay de cartas → resume; HUD atualiza em tempo real | ⚠️ |
| 6 | Fim de run autenticada persiste XP/run/conquistas no Supabase | ⚠️ |

---

## Fase 0: Pré-requisitos (Spike / Setup de Repo) — ✅

- [x] ✅ **Validar dependências do minigame:** `three`, `cannon`, `three-nebula`, `@vfx-js/core` no `package.json`; runtime do minigame ainda via CDN/unpkg em HTML/imports. (`package.json`)
- [x] ✅ **Indexar skills Three.js do repo:** 10 skills em `threejs-skills/skills/*/SKILL.md` + regra `.cursor/rules/threejs-skills.mdc`. (`threejs-skills/skills/`)
- [x] ✅ **Criar pasta do módulo:** `js/minigame/{engine,entities,systems}/` conforme árvore do GDD. (`js/minigame/`)
- [x] ✅ **Definir rota de acesso:** `pages/minigame.html` página isolada (fora do app-shell). (`local-server.mjs`)

---

## Fase 1: Setup da Engine e Arquitetura Base — ✅

**Objetivo:** Boilerplate WebGL + game loop com fixed timestep + state machine + input unificado.

### 1.1 Shell da página — ✅

- [x] ✅ **Configurar HTML/CSS base:** `#game-canvas`, `#minigame-hud`, overlays de menu/upgrade/resultado, dark fantasy. (`pages/minigame.html`)
- [x] ✅ **Carregar runtime gráfico:** Three.js + Cannon.js (CDN / unpkg / esm.sh) antes dos módulos ESM. (`pages/minigame.html`)
- [x] ✅ **Bootstrap da aplicação:** Init da engine, menu e transição para run. (`js/minigame/main.js`)

### 1.2 Game Loop e State Machine — ✅

- [x] ✅ **Criar Game Loop estável:** `requestAnimationFrame` + acumulador, `timeStep = 1/60`, clamp `maxFrameDelta = 0.25`, `maxPhysicsSteps = 5`, `alpha` no render. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Implementar State Machine:** `playing` / `paused-upgrade` / `victory` / `defeat`; `updatePhysics` só via `isSimulating()`. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Separar update/render:** `updatePhysics(dt)` na simulação; HUD/VFX 1×/frame; `render(alpha)` com lerp prev→curr e restore. (`js/minigame/engine/GameEngine.js`, `js/minigame/systems/RenderSystem.js`)

### 1.3 Input — ✅

- [x] ✅ **Mapear teclado desktop:** WASD + setas → vetor 8 direções normalizado (`getDirection()` / `getMoveVector()`). (`js/minigame/engine/InputHandler.js`)
- [x] ✅ **Implementar Virtual Joystick (touch):** `touchstart/move/end` no canto inferior esquerdo; mesmo contrato `{ x, z }` do teclado; UI `#virtual-joystick`. (`js/minigame/engine/InputHandler.js`, `pages/minigame.html`)
- [x] ✅ **Expor API de leitura:** `getMoveVector()` (canônico) + alias `getDirection()`; teclado tem prioridade sobre o stick. (`js/minigame/engine/InputHandler.js`)

### 1.4 Render mínimo — ✅

> Skills aplicadas: `threejs-fundamentals`, `threejs-lighting`, `threejs-materials`, `threejs-geometry`

- [x] ✅ **Ler skills de setup:** `RenderSystem` / `Player` alinhados às skills do repo (comentários + padrões). (`threejs-skills/skills/*/SKILL.md`)
- [x] ✅ **Inicializar cena Three.js:** Renderer (ACES/SRGB/shadows), Scene+FogExp2, OrthoCamera, Hemisphere+Ambient+Directional, Groups. (`js/minigame/systems/RenderSystem.js`)
- [x] ✅ **Placeholder visual do player:** `BoxGeometry` + `MeshStandardMaterial` PBR/emissive/`flatShading`. (`js/minigame/entities/Player.js`)
- [x] ✅ **Detritos via InstancedMesh:** 200 pedrinhas em 1 draw call + `instanceColor` (skill geometry). (`js/minigame/systems/RenderSystem.js`)

**Gate Fase 1:** ✅ Canvas + loop 60 Hz + input teclado/touch + render alinhado às skills.

---

## Fase 2: Movimentação e Arena — ✅

**Objetivo:** Player jogável dentro de arena delimitada com câmera isometric/top-down follow.

### 2.1 Entidade Player — ✅

- [x] ✅ **Criar entidade Player:** Posição `(x,y,z)`, velocidade, HP/maxHP, facing; mesh low-poly + cone de frente. (`js/minigame/entities/Player.js`)
- [x] ✅ **Integrar corpo físico:** `CANNON.Body` kinematic-like sincronizado com a mesh. (`js/minigame/entities/Player.js`)
- [x] ✅ **Aplicar movimento no tick:** `position += dir * speed * dt` + clamp; `rotationY = atan2(dir.x, dir.z)` mantém facing parado. (`js/minigame/entities/Player.js`)

### 2.2 Arena e limites — ✅

> Skills: `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-textures`

- [x] ✅ **Modelar chão da arena:** Plano + pedrinhas InstancedMesh + bordas visuais do playable area. (`js/minigame/systems/RenderSystem.js`)
- [x] ✅ **Clamp de bounds:** `ARENA_HALF_EXTENT` (110) no Player + `physics.clampToArena` no loop + paredes Cannon. (`js/minigame/entities/Player.js`, `PhysicsSystem.js`)
- [x] ✅ **Inicializar PhysicsSystem:** Gravity `(0,0,0)` top-down; step 60 Hz alinhado ao GameEngine; chão + 4 paredes estáticas; sem override `-9.82`. (`js/minigame/systems/PhysicsSystem.js`)

### 2.3 Câmera — ✅

> Skills: `threejs-fundamentals`, `threejs-animation`

- [x] ✅ **Câmera follow isométrica:** Offset `(20, 38, 20)` ≈ **53°** de elevação; lookAt suave no player. (`js/minigame/systems/RenderSystem.js`)
- [x] ✅ **Ajuste de FOV/ângulo:** Ortho frustum 52 + damping exponencial via `THREE.Clock` (frame-rate independent). (`js/minigame/systems/RenderSystem.js`)

### 2.4 Seleção de campeão — ✅

- [x] ✅ **Menu de 3 classes:** Soulblade, Graveguard, Warden of Echoes. (`js/minigame/main.js`)
- [x] ✅ **Factory de atributos:** HP/speed/dano/arma inicial aplicados no `GameEngine` ctor. (`js/minigame/engine/GameEngine.js`)

**Gate Fase 2:** ✅ Escolher campeão → arena → mover com bounds → câmera isométrica acompanha.

---

## Fase 3: Sistema de Hordas — ✅

**Objetivo:** Spawner escalonado + pathfinding simples + renderização massiva com `InstancedMesh`.

### 3.1 Entidade e Pool de Inimigos — ✅

- [x] ✅ **Criar entidade Enemy:** Mesh + hp/speed/damage/chase; API `active` / `spawn` / `despawn`; campos `x/y/z/rotationY/scale` para InstancedMesh. (`js/minigame/entities/Enemy.js`)
- [x] ✅ **Object pool de inimigos:** `EnemyPool` pré-aloca `ENEMY_POOL_SIZE` (256); acquire/release sem `new`/`scene.remove`; `GameEngine.enemies` = lista viva. (`js/minigame/entities/Enemy.js`, `GameEngine.js`)

### 3.2 Renderização instanciada — ✅

> Skills: `threejs-geometry`, `threejs-fundamentals`, `threejs-materials`

- [x] ✅ **Ler skill de geometry:** InstancedMesh + `setMatrixAt` / `instanceColor` / `count`. (`threejs-skills/skills/threejs-geometry/SKILL.md`)
- [x] ✅ **Criar InstancedMesh da horda:** `initEnemyHorde(ENEMY_POOL_SIZE)` — 1 draw call; entidades sem Mesh na cena. (`js/minigame/systems/RenderSystem.js`, `Enemy.js`)
- [x] ✅ **Sync de matrizes:** `updateEnemyHordeInstances` no render (após lerp); `count` = ativos. (`js/minigame/systems/RenderSystem.js`)

### 3.3 IA / Pathfinding básico — ✅

- [x] ✅ **Steering chase:** Vetor em direção ao player a cada update. (`js/minigame/entities/Enemy.js`)
- [x] ✅ **Separação leve (opcional):** `applyEnemySoftSeparation` via `SpatialHashGrid` + clamp de arena. (`js/minigame/systems/PhysicsSystem.js`, `GameEngine.js`)

### 3.4 Spawner e curva de dificuldade — ✅

- [x] ✅ **Tabela de dificuldade 0–20 min:** `getDifficultyLevel`, `getSpawnInterval`, `getEnemySpawnCount`, `getEnemyStats`. (`js/minigame/engine/DifficultyConfig.js`)
- [x] ✅ **EnemySpawner no loop:** Timer + spawn no perímetro com stats da curva. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Cap de simultâneos:** `ENEMY_POOL_SIZE` (256) = `InstancedMesh` capacity; spawn no-op se `isFull`. (`js/minigame/entities/Enemy.js`, `GameEngine.js`)

**Gate Fase 3:** ✅ Horda InstancedMesh + pool/cap + chase + soft separation.

---

## Fase 4: Armas, Combate e Física — ✅

**Objetivo:** Auto-ataque geométrico, projéteis em pool, hitboxes, HP e fim de run por morte.

### 4.1 Spatial Partitioning (Broad-phase) — ✅

- [x] ✅ **Implementar grade espacial 2D:** `SpatialHashGrid` (células 10×10) + Cannon `NaiveBroadphase` para corpos. (`js/minigame/systems/PhysicsSystem.js`)
- [x] ✅ **Rebuild/update por tick:** `rebuildEnemySpatialGrid` pós-chase/separação; queries em hits/aim. (`PhysicsSystem.js`, `GameEngine.js`)

### 4.2 Projéteis e Pool — ✅

- [x] ✅ **Criar entidade Projectile:** orb / wind / lightning + API `active` / `spawn` / `despawn`; `ProjectilePool` (128). (`js/minigame/entities/Projectile.js`)
- [x] ✅ **Sincronizar meshes de projéteis:** Meshes individuais pré-alocadas (variantes no root); acquire/release sem `new`/`scene.remove`. (`Projectile.js`, `GameEngine.js`)

### 4.3 Sistema de armas ativas (5 slots) — ✅

- [x] ✅ **Modelo de slots de arma:** `createWeaponSlots` + 5 slots / níveis. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Lâmina Arcana:** Pattern `melee` — cone frontal curto na direção do movimento. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Lança de Ossos:** Pattern `pierce` — projétil linear perfurante (não mais shotgun). (`GameEngine.js`, `Projectile.js`)
- [x] ✅ **Orbe de Fogo (orbital):** Pattern `orbital` ativo. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Vento Cortante:** Pattern `shockwave` — pulso 360° com knockback. (`GameEngine.js`, `VfxSystem.js`)
- [x] ✅ **Relâmpago Sagrado:** Alvos aleatórios visíveis + AoE; strikes escalam com nível. (`GameEngine.js`)
- [x] ✅ **Auto-fire por cooldown:** Armas tiqueiam com fireRate + modificadores de status. (`js/minigame/engine/GameEngine.js`)

### 4.4 Dano, HP e morte — ✅

- [x] ✅ **Resolve hits projétil→inimigo:** Queries via `SpatialHashGrid` (`queryEnemiesNear` / `queryFirst`); kill → pool; pierce com `hitIds`. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Contact damage inimigo→player:** `hitCooldown` no Enemy. (`js/minigame/entities/Enemy.js`)
- [x] ✅ **Transição DEFEAT:** `hp <= 0` → `finishRun({ won: false })` + overlay. (`js/minigame/engine/GameEngine.js`)

### 4.5 VFX de combate (mínimo viável) — ✅

> Skills: `threejs-shaders`, `threejs-postprocessing`, `threejs-materials`, `threejs-animation`, `threejs-lighting`

- [x] ✅ **Ler skills de VFX:** ShaderMaterial anel/arco/bolt; bloom; additive particles; PointLight flash. (`threejs-skills/skills/*`)
- [x] ✅ **Scaffold VfxSystem:** Caps por categoria + bursts + rings/bolts/flashes. (`js/minigame/systems/VfxSystem.js`)
- [x] ✅ **Feedback visual por arma:** Melee arco roxo, pierce impacto, orbital anel fogo, shockwave anel+flash, lightning bolt+AoE. (`VfxSystem.js`, bloom em `RenderSystem.js`)

**Gate Fase 4:** ✅ Combate jogável completo (grade, pools, padrões GDD, VFX MVP).

---

## Fase 5: Progressão e HUD — ⚠️

**Objetivo:** Gemas de XP, level-up com cartas, status passivos, HUD completo e vitória aos 20:00.

### 5.1 Pickups de XP — ⚠️

- [ ] ⚠️ **Criar entidade Pickup:** Gema/XP + coleta; **sem** pool dedicado. (`js/minigame/entities/Pickup.js`)
- [x] ✅ **Atração e coleta:** Magnet/`pickupRange` + XP na run. (`js/minigame/engine/GameEngine.js`)

### 5.2 Curva de nível da run — ✅

- [x] ✅ **Barra de XP / level-up:** Thresholds + `paused-upgrade`. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Congelar simulação no overlay:** `update` early-return se não `playing`. (`js/minigame/engine/GameEngine.js`)

### 5.3 Power-ups (biblioteca 40) — ⚠️

- [ ] ⚠️ **Biblioteca de 40 upgrades:** Hoje **35** (15 arma + 20 status) + raridades/pesos. (`js/minigame/systems/PowerupSystem.js`)
- [x] ✅ **Sorteio de 3–4 cartas:** `getRandomPowerupChoices(3, player)` com filtros de build. (`js/minigame/systems/PowerupSystem.js`)
- [x] ✅ **Aplicar escolha:** `applyPowerupChoice` arma/status/evolução. (`js/minigame/systems/PowerupSystem.js`)
- [ ] ❌ **Reroll / Skip consumível:** Não há botões/contadores por run. (`pages/minigame.html`)

### 5.4 Status passivos (5 slots) — ⚠️

- [ ] ⚠️ **StatusSystem matemático:** 5 slots + speed/damage/AS/maxHp/pickup (+ regen/resistance extras); valores **não** batem 1:1 com Might +10% / CDR −7.5% do GDD. (`js/minigame/systems/StatusSystem.js`)
- [x] ✅ **Recalcular stats derivados:** `applyStatusToPlayer` reaplica modifiers. (`js/minigame/systems/StatusSystem.js`)

### 5.5 HUD HTML sobreposto — ⚠️

- [ ] ⚠️ **Header bar:** XP, nível, cronômetro ok; **kills/gemas** incompletos vs GDD. (`pages/minigame.html`)
- [x] ✅ **Status do campeão:** HP bar + painel esquerdo. (`pages/minigame.html`)
- [x] ✅ **Slots de build:** Listas de armas/status no HUD. (`pages/minigame.html`)
- [x] ✅ **Binding de atualização:** `updateHud()` no loop. (`js/minigame/engine/GameEngine.js`)
- [x] ✅ **Modal de cartas de grimório:** Overlay com raridade/tag/impacto. (`pages/minigame.html`)

### 5.6 Clímax e vitória — ⚠️

- [ ] ⚠️ **Soft cap 20:00:** Vitória automática em `runTime >= 1200s`; **sem** Chefe do Tártaro. (`js/minigame/engine/GameEngine.js`)
- [ ] ⚠️ **Estado VICTORY:** Overlay com XP; **kills/build final** no summary ainda fracos. (`js/minigame/engine/GameEngine.js`)

**Gate Fase 5:** ⚠️ Loop de progressão jogável; fechar 40 cards, reroll, chefe/summary rico.

---

## Fase 6: Integração Backend (Supabase) — ⚠️

**Objetivo:** Persistir telemetria da run de forma autenticada e disparar conquistas.

### 6.1 Cliente — ⚠️

- [ ] ⚠️ **Expandir `submitMinigameRun`:** Hoje só `xp` + `duration` (sem kills/build/won/character / Bearer estilo GDD). (`js/api.js`)
- [x] ✅ **Chamar no fim da run:** `finishRun` → `getSession` → `submitMinigameRun`; falha não quebra UI. (`js/minigame/engine/GameEngine.js`)
- [ ] ❌ **Montar `runSummary`:** Sem serialização de slots finais / kills / won. (`js/minigame/engine/GameEngine.js`)

### 6.2 API Serverless — ⚠️

- [ ] ⚠️ **Action `addRunXP` robusta:** Token + feature gate `arcane_survivors` + XP≥0; **anti-abuso** (clamp/rate) mínimo. (`api/progress.js`)
- [x] ✅ **Atualizar perfil/XP:** Soma XP do usuário autenticado no Supabase. (`api/progress.js`)
- [ ] ❌ **Inserir `user_minigame_runs`:** Não persiste registro completo da partida. (`api/progress.js`)
- [ ] ❌ **Avaliar `user_achievements` de run:** Gatilhos Lorde do Tártaro / Ceifador não ligados ao fim de run. (`api/progress.js`)

### 6.3 Persistência / Schema — ❌

- [ ] ❌ **Migration de tabela de runs:** Sem `user_minigame_runs` dedicada neste fluxo. (`db/`)
- [ ] ❌ **Smoke de integração automatizado:** Só checklist manual possível hoje. (`tests/`)

**Gate Fase 6:** ⚠️ XP da run sobe no perfil se logado; telemetria/conquistas/tabela de runs pendentes.

---

## Fase 7 (Pós-MVP): Polish, Balance e Hardening — ❌

> Não bloqueia o MVP jogável, mas é necessária para “feel” de Vampire Survivors / Hades e fechar o GDD.

- [ ] ❌ **Balance da curva de horda:** Ajustar pressão mid-game (min 8–12). (`js/minigame/engine/DifficultyConfig.js`)
- [ ] ❌ **Alinhar pool a 40 power-ups exactos do GDD:** Fechar gap 35→40. (`js/minigame/systems/PowerupSystem.js`)
- [ ] ⚠️ **Identidade visual por arma:** Base existe; polish com skills `threejs-shaders` / `animation` / `materials`. (`js/minigame/systems/VfxSystem.js`)
- [ ] ⚠️ **Estabilidade pós level-up:** Fluxo funciona; monitorar regressões (ver `minigame-fix-plan.md`). (`js/minigame/engine/GameEngine.js`)
- [ ] ❌ **Playtest de 20 min completo:** FPS/memory com horda atual (sem InstancedMesh). (`docs/` notas de playtest)
- [ ] ❌ **Anti-abuso server-side:** Cap XP/hora, validação duração vs kills, rate limit. (`api/progress.js`)
- [ ] ❌ **CTA no shell da plataforma (opcional):** Link/nav para `pages/minigame.html`. (nav / hub)

---

## Backlog prioritário (o que ainda falta de verdade)

Ordem sugerida de ataque sobre o código **já existente**:

1. ✅ Touch joystick + unificar contrato de input (feito em §1.3)
2. ✅ Object pool + `InstancedMesh` da horda (+ cap 256)
3. ✅ Spatial grid para hits (`SpatialHashGrid`)
4. ⚠️ Fechar 40 power-ups + reroll/skip
5. ✅ Alinhar padrões de arma ao GDD (melee / pierce / shockwave / lightning)
6. ✅ Fixed timestep no `GameEngine` (feito em §1.2)
7. ⚠️ Payload rico + `user_minigame_runs` + conquistas de run
8. ❌ Chefe do Tártaro (ou formalizar vitória-only @ 20:00)
9. ✅ Alinhar render/VFX às `threejs-skills/` (arena/player + combate §4.5)
10. ❌ Balance + playtest 20 min + anti-abuso

---

## Ordem Cronológica Sugerida (Sprints) — atualizada

| Sprint | Foco | Base existente | Entrega |
| :---: | :--- | :--- | :--- |
| 0 | ✅ Setup | já feito | Repo/módulo ok |
| 1 | ✅ Loop + touch | reusar `GameEngine`/`InputHandler` | Fixed step + joystick |
| 2 | ✅ Arena (manutenção) | reusar | Só polish câmera se desejado |
| 3 | ✅ Perf da horda | pool + InstancedMesh + sep | — |
| 4 | ✅ Combate | padrões + VFX MVP | — |
| 5 | ⚠️ Conteúdo/UX | reusar Powerup/HUD | 40 cards, reroll, chefe/summary |
| 6 | ⚠️ Backend rico | reusar `addRunXP` | Runs + achievements |
| 7 | ❌ Polish | — | Balance + skills Three.js |

---

## Matriz de Dependências (arquivo × fase)

| Módulo | F1 | F2 | F3 | F4 | F5 | F6 | Status repo |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `pages/minigame.html` | ● | ◐ | | | ● | ◐ | ✅ |
| `js/minigame/main.js` | ● | ● | | | ◐ | ● | ✅ |
| `js/minigame/engine/GameEngine.js` | ● | ● | ● | ● | ● | ● | ⚠️ |
| `js/minigame/engine/InputHandler.js` | ● | ◐ | | | | | ⚠️ |
| `js/minigame/engine/DifficultyConfig.js` | | | ● | | ● | | ✅ |
| `js/minigame/entities/Player.js` | | ● | | ● | ● | | ✅ |
| `js/minigame/entities/Enemy.js` | | | ● | ● | | | ✅ |
| `js/minigame/entities/Projectile.js` | | | | ● | | | ✅ |
| `js/minigame/entities/Pickup.js` | | | | | ● | | ⚠️ |
| `js/minigame/systems/RenderSystem.js` | ● | ● | ● | ● | | | ✅ |
| `js/minigame/systems/PhysicsSystem.js` | | ● | ◐ | ● | ● | | ✅ |
| `js/minigame/systems/PowerupSystem.js` | | | | | ● | | ⚠️ |
| `js/minigame/systems/StatusSystem.js` | | | | | ● | | ⚠️ |
| `js/minigame/systems/VfxSystem.js` | | | | ● | ◐ | | ⚠️ |
| `js/api.js` | | | | | | ● | ⚠️ |
| `api/progress.js` | | | | | | ● | ⚠️ |

● = trabalho principal · ◐ = ajustes / wiring

---

## Checklist Rápido de Smoke (por PR)

- [x] ✅ Abrir `/pages/minigame.html` sem erros de console. *(validar em cada PR)*
- [x] ✅ Menu → personagem → arena.
- [x] ✅ Movimento teclado **e** touch (DevTools device mode). *(joystick visível com pointer coarse / touch)*
- [x] ✅ Inimigos spawnam e perseguem.
- [x] ✅ Arma inicial causa dano / kills sobem. *(kills internos; HUD de kills fraco)*
- [x] ✅ Coleta de gema sobe XP; level-up pausa e aplica carta.
- [x] ✅ Morte e/ou 20:00 mostram resultado.
- [x] ✅ Com sessão logada, XP da run reflete no perfil. *(se feature `arcane_survivors` liberada)*

---

## Referências

- GDD técnico/visual: [`docs/arcane-survivors-gdd.md`](./arcane-survivors-gdd.md)
- GDD legado / complementar: [`docs/minigame-gdd.md`](./minigame-gdd.md)
- Contexto de estado do código: [`docs/contexto-minigame.md`](./contexto-minigame.md)
- Planos auxiliares: [`minigame-balance-plan.md`](./minigame-balance-plan.md), [`minigame-fix-plan.md`](./minigame-fix-plan.md)
- Skills Three.js (fonte de verdade gráfica): [`threejs-skills/skills/`](../threejs-skills/skills/)
- Regra Cursor (sempre ativa): [`.cursor/rules/threejs-skills.mdc`](../.cursor/rules/threejs-skills.mdc)
