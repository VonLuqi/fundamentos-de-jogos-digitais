# Plano — Reformulação UI/UX Cookie Clicker + Arte p5.js + Juízo Higher/Lower

**Status:** implementado (Fases A–E · 2026-09-22)  
**Data:** 2026-09-22  
**Base:** [`plano-hades-despertar.md`](./plano-hades-despertar.md) (Fases 0–8) · [`gdd-hades-despertar.md`](./gdd-hades-despertar.md) · [`gdd-juizo-v2.md`](./gdd-juizo-v2.md)  
**Referências de UI:** Cookie Clicker (prints anexados) · [Rule34dle](https://rule34dle.com)-style Higher/Lower · skill p5.js [NousResearch/hermes-agent …/p5js](https://github.com/NousResearch/hermes-agent/tree/main/skills/creative/p5js)

---

## 1. Objetivo

Reformular **O Despertar** para uma experiência de clicker **densa, visceral e legível** no espírito do Cookie Clicker — sem virar um clone temático de cookies — mantendo:

- atmosfera Hades / rios do Submundo;
- economia e sync **server-authoritative** já entregues;
- papel educacional (Códice, loop, SPS, prestígio);
- Juízo ClassInd reformulado para um loop **Higher / Lower** (estilo dle), mais claro e juiceado.

**Fora de escopo deste plano (até decisão):** PvP, apostas, leaderboard de SPS/Almas, troca do stack auth/shell.

---

## 2. Diagnóstico do estado atual

| Peça | Hoje | Gap vs Cookie Clicker / desejo |
| --- | --- | --- |
| Layout | 3 colunas: Altar \| Mercado \| Abas | Cookie Clicker = **Interação** \| **Mundo visual + Stats** \| **Store**; o “mundo” (NPCs) quase não existe |
| Clique | Botão “Ceifar” + partículas CSS leves | “Big Cookie”: alvo enorme, cursors orbitando, chuva de moeda, milk layer |
| Geradores | Lista de compra no centro | Lista na **direita** + **prateleiras animadas** no centro por tipo |
| Upgrades | Aba Styx (separada) | Faixa de ícones **acima** da store; compra sem trocar de “página mental” |
| Prestígio / Options | Abas Lethe / Estela / Códice | Tabs Options · Stats · Info · **Legacy** no centro |
| Juice | Task 15 (pulse, flash, partículas CSS) | Ainda “limpo”; falta densidade, cascata de feedback, presença de NPCs |
| Arte | Quase só tipografia + tokens CSS | Precisa de sprites / silhuetas / ícones por gerador e upgrade |
| Juízo | Modal A/B/Empate (champion-stays) | Quer Higher/Lower estilo dle: valor conhecido vs `?`, revelar, streak |
| Tempo | Loop 60 Hz com `dt` em segundos | Relato: “segundos passam mais rápido que a vida real” → **bug P0** a investigar |

### 2.1 Hipótese do bug de tempo (P0)

O `GameLoop` já passa `update(this.step / 1000)` (segundos reais). Causas candidatas:

1. **Interpolação da HUD** (`interpolatedSouls` com `sps * alpha`) faz o número “correr” e parecer que 1 s de SPS rende mais visualmente.
2. **Offline / resume** aplicando catch-up em cima de tick ainda ativo (dupla contagem).
3. **Smoke/harness** ou aba em background com `visibility` mal tratada.
4. Confusão entre **Almas/s** e ticks de UI (render 60 fps ≠ 60 almas).
5. Bug pontual em `sessionSeconds` / logs educacionais (gatilho aos 5 s de sessão).

**Aceite do fix:** cronômetro de laboratório — 60 s de parede → ~60 s de produção passiva (±2%), com e sem aba em foco.

---

## 3. Visão alvo — “Cookie Clicker no Submundo”

### 3.1 Mapeamento de colunas (desktop)

```
┌──────────────────┬────────────────────────────┬──────────────────┐
│  ESQUERDA        │  CENTRO                    │  DIREITA         │
│  Santuário       │  Domínio / News / Stats    │  Store           │
│                  │                            │                  │
│  Nome da corrida │  Ticker (Códice / rumor)   │  Upgrades (fila) │
│  Almas (huge)    │  Tabs: Mundo│Stats│Códice│ │  Buy 1/10/100/Máx│
│  Almas / s       │         Lethe              │  Geradores       │
│                  │                            │  (lista densa)   │
│  [FOICE / PORTAL]│  Prateleiras por gerador   │                  │
│  Sombras orbitam │  (NPCs p5 / sprites)       │                  │
│  Chuva de almas  │                            │                  │
│  “Leite” = véu   │                            │                  │
│  CTA Juízo       │                            │                  │
└──────────────────┴────────────────────────────┴──────────────────┘
```

**Mobile:** empilhar como Cookie Clicker mobile — Altar → Mundo (colapsável) → Store; sem exigir 3 colunas.

### 3.2 Mapeamento Cookie Clicker → Despertar

| Cookie Clicker | Despertar |
| --- | --- |
| Big Cookie | **Foice / Portal do Acheron** (alvo dominante) |
| Cursors orbitando | **Sombras / foices menores** orbitando conforme `wandering_shade` (+ escalões) |
| Cookie rain | Chuva de **fragmentos de alma** (partículas) |
| Milk / líquidos de fundo | **Véu do Acheron** sobe com prestígio / marcos (não mente o saldo) |
| Building shelves (centro) | **Prateleiras dos Rios**: uma faixa por gerador com N sprites |
| News ticker | **Rumor do Submundo**: rotaciona logs do Códice + flavor |
| Options / Stats / Info / Legacy | **Estela / Estatísticas / Códice / Lethe** |
| Store upgrades (topo) | **Juramentos do Styx** como ícones compráveis |
| Buildings list | **Mercado dos Rios** (lista atual, densificada) |
| Legacy / Heavenly chips | **Óbolos + Mnemosyne** (já existem) |
| Wrinklers (late) | **Opcional Fase B** — parasitas do Tártaro (não no MVP visual) |

### 3.3 Juízo → Higher / Lower (estilo dle)

| Hoje (Juízo) | Alvo (inspirado em Rule34dle / Higher-Lower) |
| --- | --- |
| Dois cards; escolher A, B ou Empate | Card **campeão** com faixa **revelada** (ou só o número); card **desafiante** com `?` |
| Pergunta: “qual idade mais alta?” | “A faixa ClassInd do desafiante é **maior**, **menor** ou **igual**?” |
| Empate como terceiro botão sempre | Botões: **Maior** · **Menor** · **Igual** (Igual = empate de faixa) |
| Champion-stays | Mantém: acerto → desafiante vira campeão (ou campeão permanece no empate correto); erro → fim + Δ |
| Modal escuro denso | Layout dle: HUD streak/best/score no topo; VS no centro; revelação animada do número |

**Anti-cheat permanece:** ratings só no servidor; cliente nunca recebe a faixa do desafiante antes do guess.

---

## 4. Arte e pipeline p5.js

### 4.1 Skill oficial

- **Não há skill p5.js instalada no Cursor deste workspace.**
- Referência útil (Hermes): [skills/creative/p5js](https://github.com/NousResearch/hermes-agent/tree/main/skills/creative/p5js) — pipeline HTML self-contained, export PNG/GIF, referências de partículas/noise/WebGL.
- **Decisão proposta:** copiar/adaptar essa skill para `.cursor/skills/p5js/` (ou `skills/p5js/`) no repo **como skill do projeto**, para os agentes seguirem o mesmo padrão criativo.

### 4.2 Papel do p5.js no Despertar

| Uso | Onde | Notas |
| --- | --- | --- |
| **Runtime canvas** | Coluna esquerda (Foice + órbita) + centro (prateleiras) | 1–2 canvases; pausar com `prefers-reduced-motion` |
| **Pipeline offline** | Gerar sprites PNG/WebP estáticos (ícones de gerador, upgrades, juízo chrome) | Export via `saveCanvas` / script headless do skill |
| **Não usar p5 para** | HUD de números, store DOM, sync, anti-cheat | Continua HTML/CSS/JS módulos |

### 4.3 Alternativas (se p5 não bastar)

| Opção | Quando usar |
| --- | --- |
| **CSS + SVG inline** | Ícones simples, silhuetas, estados hover |
| **PixiJS** | Se >200 sprites animados a 60 fps no mobile mid |
| **Kenney / OpenGameArt** (CC0) | Placeholders até arte final |
| **Arte do Mestre** | Peças herói (Foice, Trono, capas Juízo) — lista de pedidos na Task A5 |

### 4.4 Direção visual (não “tutorial p5”)

- Paleta Hades já existente (`--hades-*`): obsidiana, Styx teal, fogo `#d90429`, ouro.
- NPCs: silhuetas ctonianas legíveis em 32–64 px; animação idle curta (2–4 frames ou bob procedural).
- Evitar: cookies, pastel, purple-glow genérico de AI, emojis como arte final.

---

## 5. Juice (polarização)

Meta: **feedback imediato e empilhável**, sem mentir saldo (regra Task 15).

| Camada | Exemplos |
| --- | --- |
| Clique | Scale squash da Foice, ring shockwave, float `+N` almas, hitstop 1 frame |
| Passivo | Motes saindo das prateleiras na taxa visual limitada (cap FPS) |
| Compra gerador | Slide-in de sprite na prateleira + flash na store row |
| Compra upgrade | Ícone “quebra o lacre” + pulse Styx |
| Prestígio | Vinheta Lethe já existe — expandir com dissolução das prateleiras |
| Juízo | Slide do card, flip revelando faixa, shake no erro, confetti contido no acerto |
| A11y | `prefers-reduced-motion` → só estados estáticos + números |

---

## 6. Princípios técnicos (congelar cedo)

1. **DOM para economia; Canvas para presença.** Store e HUD continuam sem `innerHTML` a 60 Hz.
2. **Simulação continua dona do saldo.** p5 / juice só lê snapshot; nunca escreve almas.
3. **Server-authoritative intacto.** Reform UI não reabre sync.
4. **Perf budget:** mobile mid ≥ 30 fps com prateleiras; desktop ≥ 50 fps; panic do loop permanece.
5. **Shell Hades permanece** (nav, tokens); a página do jogo pode “fullscreen” o layout 3 colunas dentro de `app-shell__content`.
6. **Arte versionada** em `assets/despertar/` + manifesto JSON (id → arquivo → frame size).

---

## 7. Fases de entrega

| Fase | Nome | Entrega |
| --- | --- | --- |
| **0** | Decisões + bug tempo | Respostas às perguntas; P0 clock fix; skill p5 no repo |
| **A** | Shell Cookie layout | 3 colunas remapeadas; store à direita; altar dominante |
| **B** | Presença / NPCs | Prateleiras + órbita + chuva; pipeline p5 |
| **C** | Juice 2.0 | Camadas de feedback; reduced-motion |
| **D** | Juízo Higher/Lower | UI dle + API compatível / migration se preciso |
| **E** | Polish + QA | Smokes, perf, a11y, pedidos de arte residual |

Cada fase tem tasks com **Faz / Perguntas / Aceite / Não faz**.

---

## Fase 0 — Decisões, clock e skill

### Task 0.1 — Congelar mapeamento de layout

**Faz**

- [x] Validar o diagrama §3.1 (ou variante aprovada). → **defaults §13**
- [x] Decidir nomes de UI na nav interna (Mundo / Stats / Códice / Lethe). (+ Bancada / Estela)

**Perguntas**

- [x] Q1: Centro mostra **sempre** as prateleiras, com Stats/Códice/Lethe como overlays/tabs — ou tabs **substituem** o mundo (como Options no Cookie Clicker)? → **tabs substituem o painel** (Mundo default; Stats/Códice/Lethe/Bancada/Estela como no Cookie Options)
- [x] Q2: Em mobile, a ordem é Altar → Store → Mundo, ou Altar → Mundo → Store? → **Altar → Store → Mundo**

**Aceite:** diagrama assinado no README curto da fase. *(congelado via §13 + layout em `pages/despertar.html`)*

### Task 0.2 — P0: sincronizar tempo com a parede

**Faz**

- [x] Reproduzir o bug (cronômetro 60 s vs almas ganhas / `sessionSeconds`).
- [x] Isolar: HUD interpolada vs `GameState.tick` vs offline resume.
- [x] Fix + smoke `tests/despertar-clock-smoke.mjs` (60 ticks de 1 s simulados ≈ 60 s de SPS).
- [x] Documentar no plano o root cause.

**Root cause:** a HUD usava `interpolatedSouls(souls, sps, alpha)` como se `alpha` avançasse até **1 s inteiro** de SPS entre ticks, fazendo o contador “correr” à frente do `GameState`. O loop a 60 Hz já é suave; a HUD agora mostra **saldo real**. `interpolatedSouls` limita-se a no máximo `1/TICK_FPS` s (só para efeitos/testes).

**Perguntas**

- [x] Q3: O “segundo rápido” é sentido na **produção de almas**, no **timer de sessão do Códice**, ou na **animações**? → **produção percebida na HUD** (interpolação), não no tick autoritativo

**Aceite:** 60 s de parede ≈ 60 s de produção (±2%) em Chromium desktop. *(smoke Node: FakeClock + GameLoop)*

### Task 0.3 — Instalar skill p5.js no projeto

**Faz**

- [x] Adaptar [Hermes p5js skill](https://github.com/NousResearch/hermes-agent/tree/main/skills/creative/p5js) → `.cursor/skills/p5js/` (ou path que o time usar).
- [x] README mínimo: quando usar runtime vs export estático. *(no próprio SKILL.md)*
- [x] Decidir CDN p5 versão pinada (ex. `1.11.x`) se runtime. → **1.11.3**; CDN só na Fase B

**Perguntas**

- [x] Q4: Preferência **runtime p5** na página do jogo, ou **só export** de assets + Pixi/Canvas2D leve? → **runtime leve** altar+prateleiras; ícones estáticos exportados
- [x] Q5: OK adicionar dependência CDN na `despertar.html` (sem bundler)? → **sim na Fase B**; jogo permanece jogável sem p5

**Aceite:** skill versionada; um sketch de smoke gera PNG de silhueta T1. → `scripts/p5/smoke-t1-silhouette.html` (tecla S)

### Task 0.4 — Inventário de arte (gerar vs pedir ao Mestre)

**Faz**

- [x] Lista A (p5/procedural): partículas, órbitas, bob de silhuetas, backgrounds. → §11
- [x] Lista B (pedir ao Mestre): Foice herói, ícones 6 geradores, ícones ~N juramentos, chrome do Juízo, capas faltantes do pool. → §11

**Perguntas**

- [x] Q6: Estilo dos NPCs: **silhueta flat**, **pixel art 32×32**, ou **ilustração paint**? → **silhueta flat Hades + bob**
- [x] Q7: Orçamento: quantas peças o Mestre entrega na 1ª leva? → **B1–B3 (P0)** na 1ª leva; resto P1/P2

**Aceite:** checklist A/B no fim deste doc (§11), atualizado.

---

## Fase A — Layout Cookie Clicker (DOM)

### Task A1 — Remapear grid CSS

**Faz**

- [x] `despertar.css`: coluna esquerda = altar dominante; centro = mundo/tabs; direita = store.
- [x] Mover `#despertar-market-list` para a coluna direita.
- [x] Mover Juramentos (Styx) para **faixa de ícones** acima da store (ou sticky no topo da direita).
- [x] Manter Lethe / Bancada / Estela / Códice acessíveis (tabs do centro ou sub-painéis).
- [~] Smoke a11y: tab order, `aria-*`, foco. *(atualizado para tab-mundo)*

**Perguntas**

- [x] Q8: Bancada do Juiz fica na store (direita), no centro (tab), ou só via modal do Juízo? → **tab no centro**

**Não faz:** ainda sem sprites de NPC.

**Aceite:** desktop 3 colunas legível ≥1280px; mobile empilhado sem overflow horizontal.

### Task A2 — Altar “Big Foice”

**Faz**

- [x] Alvo de clique ≥ 40% da altura da coluna esquerda.
- [x] HUD: Almas (display enorme) + Almas/s imediatamente abaixo (padrão Cookie).
- [x] Remover/redistribuir HUD secundária (clique / bônus) para tooltip ou Stats. *(secundária compacta sob o altar)*
- [x] CTA Juízo sob o altar (sem competir com o clique).

**Perguntas**

- [x] Q9: O alvo é **botão acessível** com arte atrás, ou canvas clicável + hitbox invisível acessível? → **botão acessível**

**Aceite:** ceifar com mouse e teclado; hit area confortável no mobile.

### Task A3 — Store densa (direita)

**Faz**

- [x] Rows de gerador: ícone | nome | custo | qty grande semi-transparente (à direita, estilo Cookie).
- [x] Affordable = destaque; locked = silhueta `???` até requisito.
- [x] Buy modes sticky.
- [x] Upgrades Styx como grid de ícones (tooltip com blurb + custo).

**Perguntas**

- [x] Q10: Queremos **Sell** (vender geradores)? → **não**

**Aceite:** compra 1/10/100/Máx sem relayout da lista a 60 Hz (padrão Task 7).

### Task A4 — Centro: News + tabs

**Faz**

- [x] Ticker “Rumor do Submundo” (Códice unlocks + flavor).
- [x] Tabs: Mundo (default) · Stats · Códice · Lethe (Legacy). (+ Bancada · Estela)
- [x] Stats: lifetime, cliques, tempo de sessão, prestígios, juizoBest, vereditos — **sem** vazar anti-cheat.

**Perguntas**

- [ ] Q11: O ticker pode citar logs ainda **não** desbloqueados (só flavor), ou só Códice já visto?

**Aceite:** tabs teclado-acessíveis; Stats não mostra SPS “otimista” diferente do servidor.

---

## Fase B — Presença visual (NPCs + p5)

### Task B1 — Camada `WorldView`

**Faz**

- [x] Módulo `js/hades-despertar/ui/world/WorldView.js` (ou `p5/WorldSketch.js`). → **Canvas2D** (sem CDN p5; jogável offline)
- [x] Lê `state.quantities()`; desenha até **cap por tipo** (ex. máx. 40 sprites/gerador) para perf.
- [x] Uma “prateleira” horizontal por gerador desbloqueado.
- [x] Pause total se `prefers-reduced-motion`.

**Perguntas**

- [x] Q12: Caps por gerador: 20 / 40 / 80? → **40** (§13)
- [x] Q13: Prateleiras empilham só os geradores com qty≥1, ou sempre 6 faixas veladas? → **só qty≥1** (e revelados)

**Aceite:** comprar T1 faz aparecer sombra na prateleira em &lt;100 ms (percebido). → smoke + sync no render

### Task B2 — Órbita no altar

**Faz**

- [x] Contagem visual de “cursors” proporcional a `wandering_shade` (e/ou clique power). → **T1 only**, cap 40
- [x] Partículas de chuva de almas (rate limitada). → `soulRainRate(sps)`, máx. 6/s e 16 motes
- [x] Camada de véu (milk) por prestígio / marco. → `veilPercent` + `.is-milk`

**Perguntas**

- [x] Q14: Órbita reflete só T1 ou **todos** os geradores (anéis concêntricos)? → **só T1** (§13); anéis extras depois

**Aceite:** 0 geradores = altar limpo; 100 T1 = órbita densa sem cair abaixo do budget. → `ORBIT_CURSOR_CAP=40`

### Task B3 — Pipeline de assets p5

**Faz**

- [x] Pasta `assets/despertar/sprites/` + `manifest.json`.
- [x] Scripts/sketches para gerar silhuetas T1–T6 e ícones de juramento (export WebP). → `npm run despertar:sprites` + `scripts/p5/export-despertar-sprites.html`
- [x] Fallback SVG se asset faltar. → `SpriteAtlas` WebP → SVG → marca texto

**Perguntas**

- [x] Q15: Geração one-shot (commit PNGs) ou regenerate no CI? → **one-shot commitado** (regerar com o script)

**Aceite:** mercado e prateleiras nunca quebram sem PNG (fallback). → silhueta canvas + mark DOM

### Task B4 — Pedidos de arte ao Mestre

**Faz**

- [x] Abrir lista §11 com prioridades P0/P1/P2. → `assets/despertar/art-requests.json` + `PEDIDOS-MESTRE.md`
- [x] Spec: tamanho, fundo transparente, paleta, naming.

**Perguntas**

- [x] Q16: Formato preferido: WebP, PNG, ou SVG? → **WebP** (SVG fallback)

**Aceite:** Mestre tem brief + paths; jogo segue com placeholders.

---

## Fase C — Juice 2.0

### Task C1 — Clique e compra

**Faz**

- [x] Float text `+N`, shockwave, screen shake leve (opt-in). → `playReapJuice`
- [x] Compra: row flash + sprite spawn tween. → `flashBuyRow` + `tweenShelfSpawn`
- [x] Upgrade: ícone “selado → ativo”. → `sealUpgradeIcon`

**Perguntas**

- [x] Q17: Shake/hitstop OK no contexto educacional, ou só partículas? → **shake suave**, opt-out `prefers-reduced-motion` (§13)

### Task C2 — Passivo visível

**Faz**

- [x] Motes das prateleiras com **budget** (máx. N partículas/s). → `SHELF_MOTE_MAX_PER_SEC=8`
- [x] Nunca inferir saldo só pela quantidade de partículas. → peso log + HUD/title = qty real

**Aceite:** reduced-motion desliga C1+C2; smoke estende `despertar-juice-smoke.mjs`.

### Task C3 — Audio (opcional)

**Faz**

- [x] Decidir se há SFX (ceifar, compra, juízo). → **não nesta leva**; stub no-op `ui/audio.js`

**Perguntas**

- [x] Q18: Áudio nesta reformulação ou fase posterior? → **fase posterior** (§13)

**Aceite:** decisão congelada; juice visual (C1/C2) cobre o feedback.

---

## Fase D — Juízo Higher / Lower

### Task D1 — Design de loop (congelar)

**Status:** feita (2026-09-22) — [`gdd-juizo-v2.md`](./gdd-juizo-v2.md)

**Faz**

- [x] GDD curto do Juízo v2 (1 página).
- [x] Manter Vereditos + milestones de recorde + Bancada.

**Perguntas**

- [x] Q19: No acerto, o desafiante **substitui** o campeão (Higher/Lower clássico) ou mantemos champion-stays atual? → **lado vencedor da comparação** (Maior→desafiante; Menor/Igual→campeão fica)
- [x] Q20: Mostramos a faixa do campeão **antes** do guess (Rule34dle mostra o número esquerdo) ou só depois (mais hardcore)? → **sim, antes**
- [x] Q21: Botão **Igual** permanece? (recomendado: sim, mapeia empate de faixa) → **sim**

### Task D2 — UI dle

**Status:** feita (2026-09-22)

**Faz**

- [x] Reformular `JuizoModal.js` + CSS: cards grandes, VS, `?`, botões Maior/Menor/Igual.
- [x] Animação de revelação do número/faixa.
- [x] HUD: sequência · recorde · vereditos · (opcional) score da corrida.

**Perguntas**

- [x] Q22: Juízo continua **modal overlay** (GameLoop atrás) ou vira tab/página? → **modal overlay**

**Nota:** Campeão recebe `rating` no pair público; desafiante não. Choices `higher`/`lower`/`tie` vão direto ao server (D3).

### Task D3 — API / compat

**Status:** feita (2026-09-22)

**Faz**

- [x] Preferência: reusar `juizoGuess` com `choice: 'higher' | 'lower' | 'tie'` (alias de lógica A/B/tie recalculada no server).
- [x] Ou migration: novos campos no `juizo_run`. → **não** — aliases bastam; schema intacto.
- [x] Smoke `despertar-juizo-smoke.mjs` atualizado.
- [x] Pool/capas: inalterado na regra ready≥30.

**Perguntas**

- [x] Q23: Precisamos de season/daily challenge (como “Daily” do dle) ou só endless streak? → **não** nesta leva (endless)

**Não faz:** expor ratings do desafiante no cliente; rationale ClassInd longo na falha (só Δ).

**Aceite:** empate só quando faixas iguais; F5 preserva recorde/vereditos; GameLoop não pausa.

---

## Fase E — QA, perf, documentação

### Task E1 — Smokes

**Status:** feita (2026-09-22)

**Faz**

- [x] `despertar-ui-smoke` (novo layout selectors).
- [x] `despertar-clock-smoke` (P0).
- [x] `despertar-world-smoke` (caps, reduced-motion).
- [x] `despertar-juizo-smoke` (Higher/Lower).
- [x] Atualizar `npm run check`. → já no `check`; E1 revalida via asserts no ui-smoke

**Suite E1 (rodar):**

```bash
node tests/despertar-ui-smoke.mjs
node tests/despertar-clock-smoke.mjs
node tests/despertar-world-smoke.mjs
node tests/despertar-juizo-smoke.mjs
```

### Task E2 — Perf pass

**Status:** feita (2026-09-22)

**Faz**

- [x] Profile mobile: comprar 100 T1; abrir Juízo; 30 s idle. → smoke Node `tests/despertar-perf-smoke.mjs` (cenário + budget); profile Chrome DevTools mobile permanece recomendado em handset real
- [x] Documentar caps finais. → tabela abaixo

#### Caps finais (congelados)

| Cap | Valor | Onde | Nota |
| --- | --- | --- | --- |
| `SHELF_NPC_CAP` | **400** | `WorldView.js` | sprites/gerador nas prateleiras (cresce + overflow-x; teto de segurança) |
| `ORBIT_CURSOR_CAP` | **40** | `AltarOrbit.js` | cursors T1 no altar |
| `SHELF_MOTE_MAX_PER_SEC` | **8** | `WorldView.js` | budget global de motes passivos |
| `SHELF_MOTE_MAX_ON_SCREEN` | **20** | `WorldView.js` | teto DOM de motes de prateleira |
| `SOUL_RAIN_MAX_PER_SEC` | **6** | `AltarOrbit.js` | chuva passiva |
| `SOUL_RAIN_MAX_MOTES` | **16** | `AltarOrbit.js` | motes de chuva simultâneos |
| `MAX_MOTES` (reap) | **24** | `particles.js` | juice do clique |
| `TICK_FPS` | **60** | `constants.js` | tick fixo |
| `LOOP_PANIC_UPDATES` | **300** | `constants.js` | corta catch-up |
| `CLICK_CAP_PER_SECOND` | **20** | `constants.js` | anti-auto-clicker |

**Alvos:** mobile mid ≥ 30 fps com prateleiras cheias; desktop ≥ 50 fps. HUD = saldo real; juice/motes são teatro.

### Task E3 — Docs

**Status:** feita (2026-09-22)

**Faz**

- [x] Atualizar GDD §2 UI + Juízo. → `gdd-hades-despertar.md` §2.3–2.4 · Vereditos em §3.2
- [x] Atualizar `plano-hades-despertar.md` com ponte “Fase 8 — UI Cookie / Juízo dle”.
- [x] README: screenshot + nota de arte. → preview T1 + `PEDIDOS-MESTRE.md`

---

## 8. Riscos

| Risco | Mitigação |
| --- | --- |
| Canvas come CPU no mobile | Caps de sprites; pause offscreen; fallback CSS |
| Aluno confunde partículas com saldo | Copy + regra: HUD é verdade; juice é teatro |
| p5 bundle / CDN offline | Pin + fallback sem world canvas |
| Reform Juízo quebra saves | Alias de choices; não resetar milestones |
| Escopo infinito de arte | Listas A/B; MVP com silhuetas |
| Clock bug mascara economia | P0 antes de juice pesado |

---

## 9. Ordem sugerida de PRs

1. **PR0** — Clock fix + smokes  
2. **PR1** — Layout DOM Cookie (Fase A)  
3. **PR2** — WorldView + assets mínimos (Fase B)  
4. **PR3** — Juice 2.0 (Fase C)  
5. **PR4** — Juízo Higher/Lower (Fase D)  
6. **PR5** — Skill p5 + pipeline de export + polish (pode paralelo a PR2)

---

## 10. Critérios de aceite globais

- [x] Parece um clicker “de verdade”: altar dominante, store densa, mundo com NPCs. → layout + WorldView
- [x] 1 s real ≈ 1 s de SPS (medido). → `despertar-clock-smoke`
- [x] Juice perceptível; reduced-motion respeitado. → C1/C2 + world/juice smokes
- [x] Toda compra tem feedback visual; geradores aparecem no mundo. → C1 + WorldView sync
- [x] Juízo jogável no padrão Higher/Lower sem vazar faixa. → D2/D3 + juizo-smoke
- [x] Sem regressão de sync/anti-cheat/conquistas/Bancada/Placar. → smokes pré-existentes + D3 sem migration
- [x] Arte faltante listada para o Mestre; jogo jogável com fallbacks. → B4 / `PEDIDOS-MESTRE.md`

---

## 11. Lista de arte — gerar (A) vs pedir (B)

*Congelado em Task 0.4 (defaults §13). Checkboxes = entregue.*

### A — Procedural / p5 / CSS (time)

| ID | Peça | Notas | Status |
| --- | --- | --- | --- |
| A1 | Chuva de almas | Partículas DOM + rate limit (AltarOrbit) | [x] B2 |
| A2 | Órbita de sombras | Contagem capped (T1) | [x] B2 |
| A3 | Bob idle silhueta | Por tier; WorldView Canvas2D | [x] B1 |
| A4 | Shockwave clique | Canvas ou CSS | [x] C1 |
| A5 | Fundo prateleira por rio | Gradiente + pattern CSS | [~] CSS shelves |
| A6 | Ícones placeholder juramento | Geometria / letra no strip Styx | [x] placeholder |

### B — Pedir ao Mestre (hero / identidade)

Brief: [`assets/despertar/PEDIDOS-MESTRE.md`](../assets/despertar/PEDIDOS-MESTRE.md) · JSON: [`art-requests.json`](../assets/despertar/art-requests.json)

| ID | Peça | Spec | Pri | Status |
| --- | --- | --- | --- | --- |
| B1 | Foice / Portal (idle + pressed) | 512² WebP, transparente → `sprites/foice/` | P0 | [ ] open |
| B2 | Ícone + sprite Sombra Vagante | 64² + 128² → `generators/wandering_shade.*` | P0 | [ ] open |
| B3 | Servos de Caronte | idem → `charon_servants.*` | P0 | [ ] open |
| B4 | Cão Cerberiano | 64² + 128² | P1 | [ ] open |
| B5 | Juiz do Tártaro | idem | P1 | [ ] open |
| B6 | Forja do Phlegethon | idem | P1 | [ ] open |
| B7 | Trono de Obsidiana | idem | P1 | [ ] open |
| B8 | Set de ~8–12 ícones de Juramentos | 48² (+128²) `upgrades/{id}.webp` | P1 | [ ] open |
| B9 | Chrome Juízo (VS, moldura) | SVG → `assets/despertar/juizo/` | P1 | [ ] open |
| B10 | Capas faltantes do pool Juízo | 600×800 WebP; 9 files missing (regen script) | P2 | [ ] open |

**Spec global:** WebP + SVG fallback; fundo transparente; paleta Hades (§13 / PEDIDOS); naming = id do catálogo.

*(Atualizar checkboxes conforme entregas.)*

---

## 12. Backlog de perguntas (checklist único)

Copiar respostas abaixo ou marcar no PR0.

### Layout e produto

- [x] **Q1** Mundo sempre visível vs tabs que substituem o mundo? → **tabs substituem** (Mundo default)
- [x] **Q2** Ordem mobile das seções? → **Altar → Store → Mundo**
- [x] **Q8** Onde vive a Bancada? → **tab no centro** (store se quiser paridade Cookie depois)
- [x] **Q9** Botão DOM vs canvas clicável? → **botão acessível** + arte atrás
- [x] **Q10** Sell de geradores? → **não**
- [x] **Q11** Ticker só com Códice visto? → **só visto** (+ flavor de progresso)

### Tempo e técnica

- [x] **Q3** Onde o tempo “parece” rápido? → **HUD interpolada** (corrigido)
- [x] **Q4** p5 runtime vs só export? → **runtime leve** + export de ícones
- [x] **Q5** CDN p5 na página OK? → **sim (1.11.3) na Fase B**

### Arte

- [x] **Q6** Estilo NPC (silhueta / pixel / paint)? → **silhueta flat + bob**
- [x] **Q7** Quantas artes o Mestre entrega na 1ª leva? → **B1–B3**
- [x] **Q15** Assets commitados vs CI regenerate? → **commitados** (one-shot)
- [x] **Q16** WebP / PNG / SVG? → **WebP** (SVG fallback)
- [x] **Q12–Q14** Caps e órbita (ver Fase B) → **cap 40**; órbita principal = T1

### Juice / áudio

- [x] **Q17** Shake/hitstop OK? → **shake suave**, opt-out reduced-motion
- [x] **Q18** SFX nesta leva? → **depois**

### Juízo

- [x] **Q19** Champion replace vs stays? → **champion vira o lado vencedor**
- [x] **Q20** Faixa do campeão visível antes do guess? → **sim**
- [x] **Q21** Botão Igual? → **sim**
- [x] **Q22** Modal vs página? → **modal overlay**
- [x] **Q23** Daily challenge? → **não nesta leva**

---

## 13. Defaults recomendados (se o Mestre quiser “só aprovar”)

Usar estes defaults **exceto** onde marcar o contrário:

| Tema | Default |
| --- | --- |
| Centro | Mundo sempre visível; Stats/Códice/Lethe como tabs overlay |
| Mobile | Altar → Store → Mundo |
| Sell | Não |
| Bancada | Tab no centro (junto a Lethe) ou painel na store — **store** se quiser paridade Cookie |
| p5 | Runtime leve no altar + prateleiras; ícones estáticos exportados |
| NPC style | Silhueta flat Hades + bob |
| Caps | 40 sprites/gerador |
| Órbita | Anel principal = T1; anéis extras opcionais depois |
| Juízo | Higher/Lower; campeão com faixa visível; Igual=empate; champion vira o lado “vencedor” da comparação; modal overlay |
| Áudio | Depois |
| Shake | Sim, suave, opt-out reduced-motion |

---

## 14. Próximo passo operacional

1. [x] Responder §12 via defaults §13 (Task 0).  
2. [x] Clock fix + `despertar-clock-smoke` (PR0 conteúdo).  
3. [x] Task 0.3 skill p5 + smoke T1; inventário §11.  
4. [~] Fase A (layout Cookie) — **já aplicada** em HTML/CSS/UIRenderer; polish restante em PR1 se preciso.  
5. [x] Fase B–C (WorldView, juice, áudio stub).  
6. [x] Task D2 (UI dle do Juízo).  
7. [x] Task D3 (API alias higher/lower + smoke).  
8. [x] Task E1 (smokes Cookie / clock / world / juízo).  
9. [x] Task E2 (perf smoke + caps finais).  
10. [x] Task E3 (docs GDD / plano-hades / README).  
11. Plano Cookie **fechado** — arte residual via `PEDIDOS-MESTRE.md`.  
12. [x] Polish pós-Fase 8: [`plano-despertar-polish-foice-juizo-upgrades.md`](./plano-despertar-polish-foice-juizo-upgrades.md) (F0–F5: prateleiras matriz · Foice · Juízo · Juramentos · copy Juízes · smokes/docs).

---

*Documento vivo: atualizar checkboxes e respostas conforme as decisões do Mestre. Não substitui o GDD; amenda UI/UX e Juízo para a Fase 8.*
