# Plano — Polish Despertar: prateleiras Cookie · Foice · Juízo · Juramentos · copy Juízes

**Status:** planejamento (sem implementação neste doc)  
**Data:** 2026-09-22  
**Pai:** [`plano-despertar-ui-cookieclicker.md`](./plano-despertar-ui-cookieclicker.md) (Fase 8 feita) · [`plano-hades-despertar.md`](./plano-hades-despertar.md) · [`gdd-juizo-v2.md`](./gdd-juizo-v2.md)  
**Gatilho:** feedback do Mestre + prints (prateleiras esmagadas, strip Styx estranha, Foice.png, Juízo confuso, banner dos Juízes)

---

## 1. Objetivo

Corrigir presença visual e clareza de UX sem reabrir economia / sync / anti-cheat:

1. **Prateleiras** no padrão Cookie Clicker — campo fixo por gerador; NPCs pequeninos em matriz.
2. **Foice** (`assets/despertar/sprites/Foice.png`) como alvo do clique com animação de corte.
3. **Juízo** legível e juiceado: clicar no card (ou Empate); **sempre** o desafiante vira o próximo campeão.
4. **Juramentos (strip):** UI limpa, popup no hover, some da strip após compra (fica só em Stats).
5. **Copy dos Juízes:** explicar o que o banner vermelho significa (sync rejeitado).

**Fora de escopo:** SFX (stub C3), daily Juízo, novos itens da Bancada, leaderboard de SPS, arte P0 completa da lista B (só integrar o que já existe).

---

## 2. Diagnóstico (do que está quebrado hoje)

| Peça | Sintoma | Causa provável |
| --- | --- | --- |
| Prateleiras | Sprites viram “faixas” horizontais | Canvas baixo (`SHELF_HEIGHT≈44`) + `drawImage` em célula estreita; WebP wide sem contain; layout 1 fileira horizontal, não matriz |
| Strip Styx | Ícones “esquisitos”, bordas duplas, letra+sprite | CSS `.despertar-upgrade-icon` + mark/sprite sobrepostos; `title` nativo insuficiente |
| Owned na strip | Comprados continuam ocupando espaço | `#renderStyx` ainda revela owned na lista |
| Ceifar | Botão círculo vermelho + glyph ⚔ | Ainda não usa `Foice.png` |
| Juízo | Botões Maior/Menor/Igual; falha só texto `10 → L` | Loop dle textual; sucessor = “lado vencedor” (Q19 antigo) ≠ desejo atual |
| Banner vermelho | “Os Juízes recusaram o saldo declarado.” | Sync 400 / validate — correto, mas copy opaca para o aluno |

---

## 3. Decisões a congelar (perguntas)

| # | Tema | Proposta (default) | Alternativa |
| --- | --- | --- | --- |
| **P1** | Matriz da prateleira | Grid fixo **10×4** (=40) · célula 18² · contain → **congelado F1** | Só 1 fileira Cookie-clássica com scroll horizontal |
| **P2** | Pivot da Foice | Rotação de corte (~−28°→+38°) + pulse no botão; reduced → soft → **congelado F2** | Spritesheet 2–3 frames |
| **P3** | Input do Juízo | **Click no card** = “este tem a faixa mais alta”; botão **Empate**; sem Maior/Menor | Manter Maior/Menor + click no card como atalho |
| **P4** | Sucessor no acerto | **Sempre** desafiante → campeão (slide clássico HL); **reabre Q19** do GDD v2 | Manter lado vencedor |
| **P5** | Owned dos juramentos | Some da strip; lista em **Stats → Juramentos selados** | Aba Códice / strip “cinza permanente” |
| **P6** | Popup upgrade | Tooltip custom (nome, blurb, custo, req) no hover/focus | Só `title` nativo |

**Defaults recomendados:** P1 grid · P2 CSS rotate · P3 click-card · P4 sempre desafiante · P5 Stats · P6 tooltip custom.

---

## 4. Fases e tasks

### Fase F0 — Copy dos Juízes (rápido)

#### Task F0.1 — Banner legível

**Status:** feita (2026-09-22)

**Faz**

- [x] Trocar / complementar copy do sync rejeitado → `JUDGES_REFUSED_MESSAGE` em `constants.js` (API + validate + cliente).
- [x] Toast auto-dismiss (`API_WARNING_DISMISS_MS=8s`) + rumor no ticker (`JUDGES_REFUSED_TICKER`).
- [x] Smoke `tests/despertar-judges-copy-smoke.mjs`.

**Não faz:** mudar regras de validateSync.

**Aceite:** aluno entende que foi anti-cheat / rehydrate, não “bug aleatório”.

---

### Fase F1 — Prateleiras Cookie (matriz fixa)

**Status:** feita (2026-09-22) — P1 = **grid 10×4**

#### Task F1.1 — Campo fixo por gerador

**Faz**

- [x] Campo **full-width** da prateleira; altura = 4 linhas; canvas cresce em colunas com `overflow-x` se preciso.
- [x] NPCs em ordem **coluna-major** (enche coluna de cima→baixo, depois a seguinte).
- [x] Label do gerador fora/acima do campo.
- [x] Campos **distintos por tier** (cores/atmosfera do rio).

#### Task F1.2 — Matriz de NPCs pequeninos

**Faz**

- [x] Layout em **colunas × 4 linhas**; canvas cresce com qty (overflow-x); teto visual `SHELF_NPC_CAP`=400.
- [x] Célula **36²** (+ DPR); `drawContainedInCell` / silhueta escalada (nunca stretch assimétrico).
- [x] qty 0 → vazio; qty 1 → 1 célula; qty 100 → 40.
- [x] Bob idle leve; reduced-motion off.

**Arquivos:** `WorldView.js`, `css/despertar.css`, smoke `despertar-world-smoke.mjs`.

**Aceite:** print não mostra mais “faixas” esmagadas; parece Cookie (building area + tiny icons).

---

### Fase F2 — Foice animada no clique

**Status:** feita (2026-09-22) — P2 = **CSS rotate slash**

#### Task F2.1 — Integrar asset

**Faz**

- [x] Usar `assets/despertar/sprites/Foice.png` (+ cópia `sprites/foice/foice-idle.png`).
- [x] Substituir glyph ⚔ por `<img data-reap-foice>` no `#despertar-reap`.
- [x] Fallback: `bindFoiceAsset` mostra glyph se a imagem falhar.

#### Task F2.2 — Animação de corte

**Faz**

- [x] Classe `is-slashing` / `despertarFoiceSlash` (~240 ms) via `playFoiceSlash`.
- [x] Empilha com juice C1 (pulse + shockwave + float); sem shake extra.
- [x] `prefers-reduced-motion` → `is-slash-soft` (pulse, sem arco).
- [x] Smoke `tests/despertar-foice-smoke.mjs`.

**Aceite:** cada clique “corta”; idle legível com a foice visível.

---

### Fase F3 — Juízo: input + sucessor + juice

> **Breaking change de design:** reabre Q19 (`gdd-juizo-v2.md`). Atualizar GDD na mesma PR.

#### Task F3.1 — Input: cards clicáveis + Empate

**Faz**

- [x] Remover (ou esconder) botões Maior / Menor como UI primária.
- [x] **Click no card campeão** → guess `lower`? **Não** — mapeamento novo:  
  - Click no card = “**este** tem a faixa mais alta” → choice legado `A` (campeão) ou `B` (desafiante).  
  - Botão **Empate** → `tie`.
- [x] Campeão continua com faixa revelada; desafiante com `?` até o reveal.
- [x] Pergunta copy: “Qual exige a faixa ClassInd **mais alta**?” (ou equivalente).
- [x] Teclado: setas / 1–2 / E para empate; focus trap mantém.

**Nota API:** reusa `A` \| `B` \| `tie` (aliases `higher`/`lower` podem ficar, mas a UI volta ao pick-card).

#### Task F3.2 — Sucessor: sempre o segundo vira o primeiro

**Faz**

- [x] Em `juizoGuess` no acerto: `championId = run.challengerId` **sempre** (também no empate correto).
- [x] Animação de slide: desafiante → slot campeão; novo desafiante entra à direita.
- [x] Atualizar `gdd-juizo-v2.md` Q19 + smoke (`higher promove…` → novos casos).

**Aceite:** sequência clássica Higher-Lower / dle; nunca “campeão fica” no acerto.

#### Task F3.3 — Juice do Juízo

**Faz**

- [x] Acerto: flip/`?`→faixa, confetti contido, pulse nos cards, bump de sequência.
- [x] Erro: shake do stage, revelação grande das duas faixas (não só `10 → L` solto), vinheta curta.
- [x] Tela de falha: mostrar **os dois cards** com capas + faixas + Δ, depois CTAs.
- [x] Reduced-motion: estados finais sem flip/shake.

**Arquivos:** `JuizoModal.js`, `despertar.css`, `despertar-juizo.js`, `gdd-juizo-v2.md`, `despertar-juizo-smoke.mjs`.

---

### Fase F4 — Juramentos (strip Styx)

#### Task F4.1 — UI da strip

**Faz**

- [x] Grid limpo: célula fixa quadrada (ex. 44²), **uma** borda, sem mark+sprite empilhados tortos.
- [x] Ícone = sprite WebP/SVG contain; letra de fallback só se sprite falhar.
- [x] Estados: `affordable` / `locked` / `disabled` com contraste claro (Styx teal / muted).

#### Task F4.2 — Popup no hover/focus

**Faz**

- [x] Tooltip/popover: **nome · blurb · custo · requisito** (já existem em `describeUpgrade` / `upgradeBlurb`).
- [x] Posicionar acima/abaixo sem sair da viewport; fechar em blur/Esc.
- [x] Acessível: `aria-describedby` ou `role="tooltip"`.

#### Task F4.3 — Some após compra → Stats

**Faz**

- [x] Strip lista **só não-owned** revelados (Cookie: upgrades comprados somem da barra).
- [x] Em **Stats**, seção **Juramentos selados**: chips/lista read-only dos ids em `state.upgrades`.
- [x] Compra: juice `sealUpgradeIcon` → remove da strip; aparece em Stats.
- [x] Lethe: juramentos resetam → voltam à strip quando elegíveis de novo (comportamento atual da economia).

**Aceite:** strip nunca fica lotada de owned; Stats mostra o histórico da corrida.

---

### Fase F5 — QA / docs

#### Task F5.1 — Smokes

**Faz**

- [x] Estender `despertar-world-smoke` (grid / aspect).
- [x] Estender `despertar-juice-smoke` ou novo `despertar-foice-smoke` (asset + classe slash).
- [x] Atualizar `despertar-juizo-smoke` (click-card mapping + sucessor sempre desafiante).
- [x] Smoke Styx: owned some; Stats lista owned.
- [x] `npm run check`.

#### Task F5.2 — Docs

**Faz**

- [x] Atualizar `gdd-juizo-v2.md` (Q19 + input).
- [x] Ponte curta neste plano → checkbox no `plano-despertar-ui-cookieclicker.md` §14.
- [x] README: 1 linha “Foice.png + prateleiras matriz” se couber.

---

## 5. Ordem sugerida

| Ordem | Task | Risco |
| --- | --- | --- |
| 1 | F0.1 copy Juízes | Baixo |
| 2 | F1.1–F1.2 prateleiras | Médio (perf canvas) |
| 3 | F4.1–F4.3 juramentos | Baixo |
| 4 | F2.1–F2.2 Foice | Baixo |
| 5 | F3.1–F3.3 Juízo | Médio (API sucessor + UX) |
| 6 | F5 smokes/docs | Baixo |

PRs sugeridos: **PR-A** F0+F1 · **PR-B** F4 · **PR-C** F2 · **PR-D** F3+F5.

---

## 6. Critérios de aceite globais

- [x] Prateleiras = campo fixo + matriz de ícones pequenos (sem stretch).
- [x] Clique = Foice visível cortando (reduced-motion ok).
- [x] Juízo: click no card ou Empate; faixa do 1º visível; **2º sempre vira 1º** no acerto; juice perceptível.
- [x] Juramentos: popup no hover; comprado some da strip e aparece em Stats; UI sem borda dupla.
- [x] Banner dos Juízes compreensível (anti-cheat / estado restaurado).
- [x] Sem regressão: sync, Vereditos, Bancada, caps E2, `npm run check` verde.

---

## 7. Riscos

| Risco | Mitigação |
| --- | --- |
| Grid 40 NPCs × 6 shelves come CPU | Manter cap 40; 1 canvas/shelf; pause offscreen / reduced-motion |
| Trocar sucessor do Juízo quebra expectativa de saves | Só muda regra de próximo campeão; streaks/vereditos intactos |
| Foice.png fundo preto | Preferir asset com alpha; se opaco, `mix-blend` / mask CSS até WebP transparente (pedido B1) |
| Tooltip tapa store | Flip placement + `pointer-events` cuidadoso |

---

## 8. Próximo passo operacional

1. Mestre confirma defaults §3 (P1–P6) ou marca o contrário.  
2. [x] F0.1 copy Juízes.  
3. [x] F1 prateleiras matriz.  
4. [x] F2 Foice + slash.  
5. [x] F3 Juízo (click-card + sucessor + juice).  
6. [x] F4 Juramentos (strip + tooltip + Stats).  
7. [x] F5 smokes / docs — polish pós-Fase 8 **fechado**.

---

*Documento vivo. Não substitui o GDD; amenda polish pós-Fase 8.*
