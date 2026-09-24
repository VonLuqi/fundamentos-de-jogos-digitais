# Plano — Auréolas · Letreiro · Hover SPS · Shiny · HUD juicy · Juízo · Aside retrátil

**Status:** G0.1 · S.1 · G1–G5 · J.1 · J.2 (B1 Soft) feitas (2026-09-22) — B2/B3 adiados  
**Data:** 2026-09-22  
**Pai:** [`plano-hades-despertar.md`](./plano-hades-despertar.md) · [`plano-despertar-ui-cookieclicker.md`](./plano-despertar-ui-cookieclicker.md) · [`plano-despertar-polish-foice-juizo-upgrades.md`](./plano-despertar-polish-foice-juizo-upgrades.md) · [`gdd-juizo-v2.md`](./gdd-juizo-v2.md) · [`plano-reformulacao-navegacao-app-shell.md`](./plano-reformulacao-navegacao-app-shell.md)  
**Gatilho:** feedback do Mestre + prints (Cookie Clicker mobile · abas Mundo · prateleiras Servos/Cão/Juiz) + pedido de mais viewport no clicker/site  
**Referência visual:** Cookie Clicker — cursors em anéis concêntricos lado a lado; news ticker; HUD densa.

**Decisões congeladas:** ver [§9](#9-decisões-congeladas).

---

## 1. Objetivo

Fechar o gap entre o Despertar atual e a presença “Cookie Clicker no Submundo”, sem reabrir sync/anti-cheat de almas:

1. **Auréolas** — Sombras Vagantes enchem anéis em torno da Foice (lado a lado → novo anel), como cursors do Cookie.
2. **Letreiro digital** — textos de rumor / labels de área rolam início→fim (marquee).
3. **Hover por NPC** — ver almas/s **individuais** (incluindo shiny).
4. **Shiny** — qualquer unidade pode nascer invertida e render mais SPS; hover revela o bônus.
5. **HUD** — mais amigável, intuitiva e *juicy* (feedback, hierarquia, affordances).
6. **Juízo** — documentar o loop, Vereditos, Bancada e Juramentos do Styx ligados a juízes; abrir espaço para balance/reforma.
7. **Aside retrátil** — em **todas** as páginas do app-shell, poder recolher a nav lateral e liberar largura útil na tela (especialmente no Despertar em desktop).

**Fora de escopo (congelado):** SFX obrigatório, Wrinklers/parasitas do Tártaro, daily Juízo, leaderboard de SPS, arte P0 completa nova (só invert/CSS onde der), pacotes Juízo **B2/B3** (sink / repeat).

## 2. Diagnóstico (estado atual)


| Peça                 | Hoje                                                                                       | Gap vs desejo                                                             |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Órbita T1            | Auréolas Cookie + escala por anel + gancho shiny visual | **G1.1+G1.2 feitas** |
| Sprite órbita        | Cursor procedural (não usa `wandering_shade.webp`)                                         | Opcional: silhueta/sombra real + shiny                                    |
| Ticker               | `#despertar-ticker` texto **estático** + ellipsis                                          | Marquee contínuo (news Cookie)                                            |
| Labels de prateleira | `.despertar-shelf__label` estático (`SERVOS DE CARONTE`…)                                  | Letreiro por área (ou só overflow)                                        |
| Hover NPC            | Tip unidade + “produção desta unidade”; store = linha total | **G3 feita** |
| Shiny                | Economia + render + persistência `shiny_counts` jsonb | **G4 feita** |
| HUD                  | Funcional, tokens Hades, tabs claras                                                       | Pouco juice; tabs “planas”; pouca affordance de hover/CTA                 |
| Juízo                | Loop HL completo server-side                                                               | Falta **leitura de design** consolidada neste ciclo + decisões de balance |
| Aside shell          | Desktop: sidebar **recolhível** (`is-nav-collapsed` + localStorage); mobile: drawer `is-open` | **S.1 feita** — main full-width no desktop |


### 2.1 Arquivos-chave


| Path                                                                 | Papel                                             |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `js/hades-despertar/ui/world/AltarOrbit.js`                          | Anel único T1                                     |
| `js/hades-despertar/ui/world/WorldView.js`                           | Prateleiras T2–T6, cap 400                        |
| `js/hades-despertar/ui/UIRenderer.js`                                | Ticker, store, tooltips Styx                      |
| `js/hades-despertar/core/formulas.js` / `Entity.js` / `GameState.js` | SPS, qty, upgrades                                |
| `js/hades-despertar/config/generators.js`                            | baseCost / baseRate                               |
| `api/_lib/despertar-juizo.js`                                        | Streak, milestones → Vereditos                    |
| `js/hades-despertar/config/verdict-shop.js`                          | Bancada                                           |
| `css/despertar.css`                                                  | Ticker, shelves, tabs                             |
| `js/app-shell.js` · `css/app-shell.css`                              | Sidebar / drawer / toggle — **alvo da Fase S**    |
| `pages/*.html` (+ `index.html` se shell)                             | Markup `data-shell-sidebar` / `data-shell-toggle` |


---

## 3. Task 0 — Esclarecer dúvidas

**Status:** fechada em G0.1 (2026-09-22). Fonte das respostas: anotações do Mestre na coluna Pergunta + defaults onde não havia veto. Tabela histórica abaixo; **autoridade = §9**.

| # | Tema | Pergunta | Proposta (default) | Alternativa |
| --- | --- | --- | --- | --- |
| **Q1** | Modelo das auréolas | Quantos slots por anel? Cap total? | *Slots fixos por raio (ex. 8 / 12 / 16 / 20…) até cap visual ~40–60* | Densidade contínua |
| **Q2** | Visual da sombra | Cursor / sprite / foicezinha? | Sprite/silhueta | *Manter cursor atual + packing* ← **escolhido** |
| **Q3** | Anéis de outros geradores | Só T1 ou T2+? | *Só Sombras* | Anéis por tier |
| **Q4** | Letreiro — quais textos? | Ticker e/ou labels? | *Ticker sempre; labels só se overflow* + **pool ampliado** (curiosidades Hades + dicas de enigmas sem spoiler) | Tudo marquee sempre |
| **Q5** | Velocidade / pausa | … | *40–60 px/s; pausa hover; reduced-motion estático* | Velocidade × SPS |
| **Q6** | Pool de rumores | Uma linha vs fila? | *Fila rotativa (Códice visto + progresso + curiosidades + dicas leves + sync)* | Só linha atual |
| **Q7** | SPS no hover | Bruto vs efetivo? | *Efetivo (+ shiny)* | Só baseRate |
| **Q8** | Shiny — quando | Buy vs retrofit? | *No buy, por unidade do lote* | Retrofit save |
| **Q9** | Shiny — chance/mult | … | *Negativo 0,5% · ×15 + glitch (mais raro); Gold 2% · ×2 ouro* | 0.5%×3 / 2%×1.5 |
| **Q10** | Shiny — sync | … | *`shinyCounts[id]`; bounds; cliente rola / server valida qty* | Lista por unidade |
| **Q11** | Shiny — visual | Invert vs arte? | *Invert + glow; reduced = borda* | WebP dedicado |
| **Q12** | Shiny — Lethe | Morrem no ritual? | *Sim (qty+shiny); Bancada fica* | Memória Mnemosyne |
| **Q13** | Hover — hit-test | Canvas vs DOM? | *Canvas → tooltip DOM* | Buttons DOM |
| **Q14** | HUD juicy | Escopo? | *Polish contido (tabs, pop, tooltips, CTA)* | Redesign colunas |
| **Q15** | Juízo reforma | Docs vs números? | *B0+B4+B1 Soft; B2/B3 adiados* | Mudar milestones já |
| **Q16** | Naming Juízo/Juiz | … | *Manter ids + copy/tooltip* | Renomear gerador |
| **Q17** | Prioridade | Ordem? | *S → G1 → G2 → G3 → G4 → G5 → J* | Shiny antes / aside fim |
| **Q18** | Aside | Hide vs rail? | *Hide total + `localStorage`; mobile drawer intacto* | Rail ~56px |

---

## 4. Visão alvo (por feature)

### 4.1 Auréolas (Sombras Vagantes)

```
         ○ ○ ○ ○          ← anel 2 (só depois do 1 completo)
      ○           ○
    ○      ⚔       ○     ← anel 1 enche slot a slot
      ○           ○
         ○ ○ ○ ○
```

- Ao comprar a 1ª sombra: 1 slot no anel interno.
- Próximas: aparecem **ao lado** (ângulo fixo por slot), até fechar o círculo.
- Anel completo → começa o próximo raio (auréola).
- Rotação conjunta do anel (velocidade constante); `prefers-reduced-motion` → anéis estáticos.
- Cap visual `ORBIT_CURSOR_CAP`=**200**; anéis densos 12/18/24/… — qty 63 = 63 ícones lado a lado.- **Visual (Q2):** manter o **cursor procedural atual** (`drawCursor`); só mudar packing → anéis. Shiny = invert/glow no mesmo glyph.

### 4.2 Letreiro

- Faixa superior: texto entra pela direita, sai pela esquerda (LTR).
- Duplicata do nó para loop seamless quando o texto for mais curto que o track.
- Labels de prateleira: mesmo componente se `scrollWidth > clientWidth`.
- **Pool (Q4+Q6):** fila rotativa com (prioridade alta → baixa):
  1. Sync rejeitado / Juízes (se ativo);
  2. Códice já desbloqueado (último log);
  3. Flavor de progresso (SPS, órbita, prateleiras);
  4. **Curiosidades** do Submundo / mitologia Hades (catálogo estático, sem spoiler de mecânica);
  5. **Dicas leves** de enigmas do Domínio (nunca revelar solução; nunca vazar salas `/submundo/*` não visitadas).
- Shiny first-of-run pode furar a fila uma vez.
### 4.3 Hover SPS

Tooltip sticky perto do cursor/célula:

```
Sombra Vagante
Almas / s: 0,12
(negativo ×15 / gold ×2)          ← raridades
```

Store card continua mostrando **SPS da linha** (todas as unidades daquele gerador).

### 4.4 Shiny

- Visual: cores invertidas + leve brilho.
- Economia: `unitRate = baseRate × … × (shiny ? SHINY_MULT : 1)`.
- Contagem: `qty` total + `shinyCount` ≤ `qty`.
- Primeira compra shiny: rumor no ticker (“Uma sombra nasceu invertida sob a Foice.”).

### 4.5 HUD juicy (contido)

- Tab ativa: glow Styx + peso tipográfico (já parcial — reforçar).
- Número de Almas: flash/pop curto ao ceifar e ao tick “visível”.
- **Ceifar:** alminhas sobem e somem; quantidade escala com almas/clique (`reapParticleCount`).
- Prateleiras: bob já existe; hover célula = highlight + tooltip.
- CTA Juízo: contraste e label “ClassInd · Higher/Lower” se ainda opaco.
- Não reinventar o layout de 3 colunas.

### 4.6 Aside retrátil (app-shell, todas as páginas)

```
[ ▌ Nav ] [ Conteúdo …………… ]     → toggle →     [ Conteúdo full-bleed ……… ]
                                                     [☰] no header restaura nav
```

- **Desktop (≥ breakpoint shell):** usuário recolhe o aside; `main` ganha a largura inteira (Despertar, Grimório, Aulas, etc.).
- **Mobile:** mantém o drawer atual (`is-open` / overlay) — não inventar segundo modo.
- Preferência lembrada entre páginas da mesma origem.
- A11y: `aria-expanded` no toggle; quando colapsado, sidebar `aria-hidden` / fora do tab order (como o drawer fechado no mobile).

---

## 5. Leitura do Juízo (balance)

### 5.1 O que é o Juízo

Minigame **Higher/Lower ClassInd** no modal (`JuizoModal` + `api/_lib/despertar-juizo.js`):

1. **Campeão** mostra a faixa (`L < 10 < 12 < 14 < 16 < 18`).
2. **Desafiante** mostra `?`.
3. Jogador clica no card com a faixa **mais alta**, ou **Empate**.
4. **Acerto** → streak++; desafiante **sempre** vira o próximo campeão; novo desafiante.
5. **Erro** → streak zera; revela faixas + Δ; fim da corrida.
6. Esc/abandon → zera current **sem** vazar rating do desafiante.

O GameLoop do clicker **não pausa**. CTA só habilita com pool ready ≥ 30.

### 5.2 Como se ganha “pontos” (Vereditos)

**Não** se ganha Veredito por acerto avulso. Só quando o **melhor streak da conta** cruza um marco **pela primeira vez**:


| Milestone | Streak | Vereditos | Cumulativo |
| --------- | ------ | --------- | ---------- |
| `s5`      | 5      | 1         | 1          |
| `s10`     | 10     | 2         | 3          |
| `s15`     | 15     | 3         | 6          |
| `s20`     | 20     | 4         | 10         |
| `s25`     | 25     | 5         | 15         |
| `s40`     | 40     | 8         | 23         |
| `s60`     | 60     | 12        | 35         |
| `s100`    | 100    | 20        | **55**     |


- Persistido em `juizoMilestonesClaimed` (1× por id).
- Repetir streak 25 depois de já ter `s25` → **0** Vereditos novos.
- Catch-up (J.2): se o recorde já passou um marco novo (ex. `s20`) e ele ainda não foi claimado, paga na próxima avaliação.
- Teto teórico de Vereditos via milestones ≈ **55** (sem outros sinks/sources).

### 5.3 Bancada do Juiz (upgrades de Vereditos)

Permanentes; **sobrevivem ao Lethe** (`verdictPurchases`):


| id                 | Nome             | Custo | Efeito                            |
| ------------------ | ---------------- | ----- | --------------------------------- |
| `selo_do_juiz`     | Selo do Juiz     | 2     | clique ×1.05                      |
| `memoria_classind` | Memória ClassInd | 4     | offline +0,5 h                    |
| `olho_do_tartarus` | Olho do Tártaro  | 8     | SPS ×1.02                         |
| `pacto_duplo`      | Pacto Duplo      | 12    | 1º gerador da corrida ×0,90 custo |


**Custo total para comprar tudo:** 2+4+8+12 = **26** Vereditos → alcançável com milestones até ~`s60` (35 cumulativos); sobram Vereditos até `s100`.

### 5.4 “Upgrades do Juiz” que **não** são Juízo

Não confundir:


| Sistema                     | Onde                                  | O que faz                                 |
| --------------------------- | ------------------------------------- | ----------------------------------------- |
| **Juízo** (minigame)        | Modal + Vereditos + Bancada           | Skill ClassInd → buffs permanentes leves  |
| **Juiz do Tártaro**         | Gerador T4 `tartarus_judge`           | 47 almas/s base × qty                     |
| **Juramentos do Styx** (T4) | `veredito_tartaro`, `lei_inquebravel` | ×2 na linha do gerador (1× / 10× owned)   |
| **Placar**                  | `juizoBest`                           | Ranking turma/global — não paga Vereditos |


### 5.5 Hipóteses de balance (para escolher na Task 0 / Fase J)


| Pacote               | Ideia                                                                    | Prós                 | Contras                      |
| -------------------- | ------------------------------------------------------------------------ | -------------------- | ---------------------------- |
| **B0 — Manter**      | Só melhorar copy/HUD do CTA                                              | Zero risco econômico | Bancada continua “cara” cedo |
| **B1 — Soft**        | Milestone intermediário (ex. s20→4) ou −1 custo nos itens baratos        | Acessível mais cedo  | Infla Vereditos mid          |
| **B2 — Sink**        | Novo item Bancada (ex. +1% clique) caro                                  | Usa o teto 51        | Escopo + sync                |
| **B3 — Repeat**      | Veredito pequeno a cada N acertos **após** s100                          | Endgame Juízo        | Anti-farm; precisa cap/dia   |
| **B4 — Educacional** | Tooltip na Bancada: “Vereditos vêm do **recorde**, não da corrida atual” | Clareza              | Não muda números             |


**Recomendação aplicada:** G0.1 = **B0 + B4**; J.2 = **B1 Soft** (`s20→4` + −1 nos dois itens baratos). **B2/B3** continuam adiados.

---

## 6. Fases e tasks

### Fase G0 — Task 0 (este doc)

#### Task G0.1 — Congelar Q1–Q18

**Status:** feita (2026-09-22)

**Faz**

- [x] Responder tabela da §3 (anotações do Mestre + defaults sem veto).
- [x] Anotar pacote de Juízo: **B0 + B4**.
- [x] Congelar Q18: hide total + `localStorage`; mobile drawer intacto.
- [x] Preencher [§9 Decisões congeladas](#9-decisões-congeladas).

**Aceite:** §9 preenchida; Fases S / G1+ liberadas.

---

### Fase S — Aside retrátil (app-shell, site-wide)

**Depende:** Q18. Pode rodar **em paralelo** às fases do Despertar (não mexe em economia).

#### Task S.1 — Colapsar nav em desktop em todas as páginas do shell

**Status:** feita (2026-09-22)

**Faz**

- [x] Estado `is-nav-collapsed` no `[data-shell]` (desktop only); CSS faz sidebar sumir e `.app-shell__main` ocupar a largura (grid `0 + 1fr`).
- [x] `[data-shell-toggle]`: desktop alterna colapso; mobile mantém drawer `is-open`.
- [x] Persistência `localStorage` chave `hades-shell-nav-collapsed`.
- [x] Labels a11y: `aria-expanded`, `aria-controls`; colapsado → `aria-hidden` + `inert`.
- [x] Transição curta + `prefers-reduced-motion`.
- [x] Smoke `tests/shell-nav-collapse-smoke.mjs` (+ menu smoke sem regressão).

**Arquivos:** `js/app-shell.js`, `css/app-shell.css`, `tests/shell-nav-collapse-smoke.mjs`.

**Aceite:** desktop recolhe/expande; preferência persiste entre páginas; mobile drawer intacto.
---

### Fase G1 — Auréolas Cookie na Foice

**Depende:** Q1–Q3.

#### Task G1.1 — Packing lado a lado + anéis

**Status:** feita (2026-09-22)

**Faz**

- [x] Substituir distribuição `i/count` por **slots angulares fixos** por anel (`ORBIT_RING_SLOTS` = 12/18/24/…).
- [x] Preencher anel interno até `slots[ring]`; overflow → próximo raio (`orbitSlotLayout`).
- [x] `ORBIT_CURSOR_CAP`=**200** (amenda: midgame 63+ visível; qty econômica pode passar do cap).
- [x] Rotação com parallax leve entre anéis (`ORBIT_RING_PARALLAX`).
- [x] `prefers-reduced-motion` → pintura estática (ângulo 0).

**Arquivos:** `js/hades-despertar/ui/world/AltarOrbit.js`, `tests/despertar-orbit-smoke.mjs`, `package.json` (check).

**Aceite:** 1 sombra = 1 ícone; N < slots = arco incompleto sem reespalhar; anel 1 cheio antes do 2.
#### Task G1.2 — Visual da sombra (Q2)

**Status:** feita (2026-09-22)

**Faz**

- [x] Manter cursor procedural (`drawOrbitCursor`); packing em anéis (G1.1).
- [x] Escala por anel (`orbitRingScale`: −8%/anel, piso 0.72).
- [x] Gancho shiny G4: `markShinyPlacements` + `orbitShinyCountFromState`; invert/glow (reduced = borda dourada).

**Arquivos:** `AltarOrbit.js`, `tests/despertar-orbit-smoke.mjs`.

**Aceite:** órbita legível 1×→cap; anéis externos menores; shiny visual pronto quando `shinyCounts` existir.
---

### Fase G2 — Letreiro digital

**Depende:** Q4–Q6.

#### Task G2.1 — Componente marquee

**Status:** feita (2026-09-22)

**Faz**

- [x] Utilitário `Marquee.js`: track + 2 segs; animação contínua; pausa hover/focus.
- [x] Aplicar em `#despertar-ticker` (UIRenderer + Juízes no index).
- [x] Reduced-motion: `is-static` + ellipsis + `title`/`aria-label` completo.

**Arquivos:** `js/hades-despertar/ui/Marquee.js`, `UIRenderer.js`, `index.js`, `css/despertar.css`, `tests/despertar-marquee-smoke.mjs`.

**Aceite:** texto longo percorre a faixa; hover pausa; reduced-motion ok.

#### Task G2.2 — Labels de área (se Q4)

**Status:** feita (2026-09-22)

**Faz**

- [x] `setMarqueeTextIfOverflow` — anima **só se** `scrollWidth > clientWidth`.
- [x] Labels `.despertar-shelf__label` via `WorldView.#refreshShelfLabel` (sync + resize).
- [x] Altura estável (`min-height` / `line-height`); pausa no hover da prateleira.

**Arquivos:** `Marquee.js`, `WorldView.js`, `css/despertar.css`, `tests/despertar-marquee-smoke.mjs`.

**Aceite:** nome curto fica parado; nome/área estreita → letreiro; layout das shelves intacto.

#### Task G2.3 — Fila de rumores (Q4 + Q6)

**Status:** feita (2026-09-22)

**Faz**

- [x] Rotacionar fila: Códice visto + progresso + **curiosidades Hades** + **dicas leves de enigmas** (sem spoiler / sem ARG `/submundo` não revelado).
- [x] Catálogo estático de curiosidades/dicas em config (fácil de editar pelo Mestre).
- [x] Sync reject continua prioridade máxima no ticker.
- [x] Evento shiny (primeira da corrida) pode interromper uma vez.

**Arquivos:** `config/rumors.js`, `UIRenderer.js`, `index.js`, `tests/despertar-rumor-smoke.mjs`.

**Aceite:** texto longo percorre a faixa sem corte seco; hover pausa; a11y ok.

---

### Fase G3 — Hover SPS por NPC

**Depende:** Q7, Q13.

#### Task G3.1 — Hit-test + tooltip

**Status:** feita (2026-09-22)

**Faz**

- [x] Mapear pointer → índice de célula (shelf) / slot (órbita).
- [x] Tooltip DOM unificado: nome, Almas/s da unidade, badge shiny se houver.
- [x] Fórmula alinhada a `formulas.js` (mesma fonte que o server).

**Arquivos:** `formulas.js` (`effectiveUnitSPS`), `WorldView.js` (`shelfHitIndex`), `AltarOrbit.js` (`orbitHitIndex`), `UIRenderer.js` (tip `#despertar-npc-tooltip`), `css/despertar.css`, `tests/despertar-npc-hover-smoke.mjs`.

**Aceite:** hover em NPC/órbita mostra Almas/s efetivas; shiny badge quando marcado.

#### Task G3.2 — Store vs shelf

**Status:** feita (2026-09-22)

**Faz**

- [x] Shelf/órbita = **por unidade**; card do mercado = **linha total** (e amortização como hoje).
- [x] Copy curta no tooltip: “produção desta unidade”.

**Arquivos:** `UIRenderer.js` (`NPC_UNIT_PRODUCTION_BLURB`, tip blurb, title `Linha total · Amortização`), `tests/despertar-npc-hover-smoke.mjs`.

**Aceite:** hover num Servo isolado mostra SPS daquele servo; somar mentally ≈ linha da store (± arredondamento).

---

### Fase G4 — Sistema shiny

**Depende:** Q8–Q12, G3 (tooltip).

#### Task G4.1 — Estado + fórmulas

**Status:** feita (2026-09-22)

**Faz**

- [x] `shinyCounts` (ou equivalente) no `GameState` / snapshot / sync.
- [x] No buy: para cada unidade do lote, `Math.random() < p` → shiny++ (seed/server policy: ver nota anti-cheat abaixo).
- [x] `lineSPS` considera `(qty - shiny) * rate + shiny * rate * SHINY_MULT`.
- [x] Lethe zera shiny com geradores (Q12).

**Anti-cheat (congelado Q10):** cliente rola shiny no buy; server **só valida** `0 ≤ shinyCounts[id] ≤ qty` e recalcula SPS. Exploit máximo documentado = linha inteira ×`SHINY_MULT` (×15). Sem server-RNG nesta leva.

**Arquivos:** `formulas.js` (`lineSPS`), `GameState.js`, `despertar-validate.js` (`normalizeShinyCounts`), `UIRenderer.js` (linha da store), `tests/despertar-shiny-smoke.mjs`.  
**Nota:** coluna SQL / RPC de persistência = **G4.3**; sync já valida + ecoa `shinyCounts` no DTO; IDB local via `toSnapshot`.

#### Task G4.2 — Render shiny

**Status:** feita (2026-09-22)

**Faz**

- [x] Shelf + órbita: invert/glow nos índices shiny (primeiros `shinyCount` ou posições marcadas).
- [x] Ticker one-shot na primeira shiny da sessão/corrida.

**Arquivos:** `WorldView.js` (`drawContainedInCell` / `drawNpcSilhouette` shiny), `AltarOrbit.js` (já G1.2), `index.js` (`announceShinyFirst` no buy), `tests/despertar-world-smoke.mjs` · `despertar-shiny-smoke.mjs` · `despertar-rumor-smoke.mjs`.

#### Task G4.3 — Persistência

**Status:** feita (2026-09-22)

**Faz**

- [x] IndexedDB + `POST /api/despertar` campos novos; migration tolerante (default 0).
- [x] Smoke de fórmulas + validateSync.

**Arquivos:** `db/migrate-2026-09-22-despertar-shiny-counts.sql`, `db/setup.sql`, `api/despertar.js` (`ROW_SELECT`), `despertar-validate.js` (`canonicalToRowPatch`), `tests/despertar-shiny-smoke.mjs`.  
**Nota:** IDB já guardava `toSnapshot().shinyCounts` desde G4.1; G4.3 fecha o caminho Postgres/RPC.

**Aceite:** comprar ~100 unidades eventualmente produz shiny; hover mostra ×15; Lethe limpa; sync não rejeita save legítimo.

---

### Fase G5 — HUD amigável / juicy

**Depende:** Q14; idealmente após G2–G3 (tooltips consistentes).

#### Task G5.1 — Hierarquia e affordance

**Status:** feita (2026-09-22)

**Faz**

- [x] Tabs: estado `aria-selected` mais visível (glow, peso).
- [x] Almas / SPS: micro-feedback no ceifar e quando SPS muda de ordem de grandeza.
- [x] CTA Juízo: label + hint de Vereditos/recorde.
- [x] Unificar estilo de tooltips (Styx, NPC, Bancada).

#### Task G5.2 — Juice contido

**Status:** feita (2026-09-22)

**Faz**

- [x] Highlight de célula no hover; leve scale no buy de gerador refletido na shelf/órbita.
- [x] Respeitar `prefers-reduced-motion` em tudo.

**Aceite:** aluno novo entende onde clicar, o que as abas fazem, e vê feedback imediato sem “UI de planilha”.

---

### Fase J — Juízo: clareza + balance (pós-Q15)

#### Task J.1 — Copy educacional

**Status:** feita (2026-09-22)

**Faz**

- [x] Bancada / CTA / Códice: explicar que Vereditos vêm de **marcos do melhor streak**, não de cada acerto.
- [x] Distinguir Juízo × Juiz do Tártaro × Juramentos `veredito_tartaro` (Q16).

**Arquivos:** `juizo-pool.js` (copy B4), `edu-logs.js`, `generators.js`, `UIRenderer.js` (blurbs Styx), `pages/despertar.html`, `JuizoModal.js`, `gdd-juizo-v2.md`, smokes.

#### Task J.2 — Pacote de números

**Status:** feita (2026-09-22) — pacote escolhido: **B1 Soft** (B2/B3 adiados)

**Faz**

- [x] Implementar B1 Soft em `despertar-juizo.js` + `verdict-shop.js` + GDD curto.
- [x] Atualizar `gdd-juizo-v2.md` e smokes.

**Detalhe B1 Soft**

- Milestone `s20` → **4** Vereditos; teto milestones **55**.
- Catch-up: marcos unclaimed com `best ≥ limiar` pagam na próxima avaliação.
- Bancada: Selo **2**, Memória **4**, Olho 8, Pacto 12 (total **26**).

**Aceite:** Bancada acessível mais cedo; saves antigos com best≥20 recebem `s20` no próximo claim.

---

## 7. Ordem sugerida e dependências

```
G0 (Q1–Q18)
 ├─ S Aside retrátil (paralelo; site-wide)
 └─ G1 Auréolas
 └─ G2 Letreiro          ┐
 └─ G3 Hover SPS ────────┼─ G5 HUD (depois)
 └─ G4 Shiny (após G3)  ┘
 └─ J Juízo (paralelo a G5 se só copy)
```

Estimativa grossa (após G0): **S 0,25–0,5 d** · G1 0,5–1 d · G2 0,5 d · G3 0,5–1 d · G4 1–1,5 d · G5 0,5–1 d · J copy 0,25 d (+ balance se houver).

---

## 8. Riscos


| Risco                           | Mitigação                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Órbita densa demais em mobile   | Cap + slots menores; testar 360px                                                       |
| Shiny exploit (todos ×2)        | Validar bounds; mult moderado (×2); opcional audit log se SPS saltar                    |
| Marquee acessibilidade          | Pausa hover/focus; reduced-motion off                                                   |
| Confusão Juízo/Juiz             | Copy J.1 antes de mudar números                                                         |
| Sync schema                     | Campos opcionais com default 0; sem migration destrutiva                                |
| Aside: colapso vs drawer mobile | Separar `is-nav-collapsed` (desktop) de `is-open` (mobile); testes nos dois breakpoints |
| Aside: aluno “perde” a nav      | Toggle sempre visível no header; Esc / clique fora só no drawer mobile                  |


---

## 9. Decisões congeladas

> Congeladas em **Task G0.1** (2026-09-22). Fonte: anotações do Mestre na §3 + defaults sem veto.

| # | Decisão |
| --- | --- |
| **Q1** | Slots densos por anel **28 → 36 → 44 → 52 → 60**; gap curto; opacidade cai com o raio; cap visual **200**. |
| **Q2** | **Manter o cursor procedural atual**; só mudar packing para auréolas Cookie. |
| **Q3** | **Só Sombras Vagantes** orbitam a Foice; T2+ ficam nas prateleiras. |
| **Q4** | Ticker = marquee sempre; labels de shelf = marquee **só se overflow**. Pool inclui o que já existe **+ curiosidades do Submundo/Hades + dicas leves de enigmas** (sem spoiler). |
| **Q5** | ~40–60 px/s; **pausa no hover/focus**; `prefers-reduced-motion` → estático + ellipsis. |
| **Q6** | **Fila rotativa** (prioridades na §4.2); não uma linha única. |
| **Q7** | Hover mostra SPS **efetivo** da unidade (`baseRate × genMult × prestige × spsVerdict` × shiny se houver). |
| **Q8** | Shiny rola **no buy** (cada unidade do lote 1/10/100/Máx); saves antigos começam com 0 shiny. |
| **Q9** | Chance **0,5% negativo ×15** (mais raro) + **2% gold ×2**; mutuamente exclusivos; **não** afeta custo. |
| **Q10** | Persistência `shinyCounts[id]` com `0 ≤ shiny ≤ qty`; server rejeita fora dos bounds e recalcula SPS. **RNG no cliente**; server não atribui shiny. |
| **Q11** | Visual **invert + glow Styx** no canvas; reduced-motion = borda dourada (sem invert animado). |
| **Q12** | Lethe **zera** qty + shiny dos geradores; Bancada / Vereditos / compras de Vereditos **permanecem**. |
| **Q13** | **Hit-test no canvas** (shelf + órbita) → tooltip DOM; teclado cíclico opcional depois. |
| **Q14** | HUD juicy **contido**: tabs, pop Almas/SPS, tooltips unificados, micro-bounce, CTA Juízo claro. Sem redesenhar colunas. |
| **Q15** | Juízo = **B0 + B4** (copy) + **B1 Soft** (números). **B2/B3** adiados. |
| **Q16** | Manter ids; copy distingue **Juízo** (minigame) × **Juiz do Tártaro** (gerador T4) × Juramentos Styx. |
| **Q17** | Ordem: **S → G1 → G2 → G3 → G4 → G5 → J** (S pode paralelo a G1). |
| **Q18** | Desktop: **hide total** (`is-nav-collapsed`) + main 100%; toggle no header; `localStorage` `hades-shell-nav-collapsed`. Mobile: drawer atual intacto. |
| **Pacote Juízo** | **B0 + B4 + B1 Soft** (B2/B3 adiados) |
| **Shiny anti-cheat** | Bounds-only no server (ver Q10). |

---

## 10. Checklist de aceite global

- [x] Aside do shell recolhe no desktop em **todas** as páginas; main full-width; preferência persiste; mobile drawer ok.
- [x] Sombras formam auréolas Cookie (lado a lado → anel seguinte) com cursor atual.
- [x] Ticker (e labels se overflow) = letreiro; fila com curiosidades/dicas; reduced-motion ok.
- [x] Hover em NPC/órbita mostra Almas/s **efetivas** da unidade (e shiny).
- [x] Negativo 0,5% ×15 (glitch, mais raro) + Gold 2% ×2: existem, persistem, rendem mais, morrem no Lethe.
- [x] HUD mais clara e com juice contido.
- [x] Copy Juízo B0+B4; balance **B1 Soft** feita; B2/B3 explicitamente adiados.

---

*Documento operacional. G0.1 fechada — implementação liberada a partir da Fase S / G1.*
