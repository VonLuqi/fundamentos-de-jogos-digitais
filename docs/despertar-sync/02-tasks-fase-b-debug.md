# Fase B — Admin / Debug

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) §2  
> **Estado do documento:** pronto para execução  
> **Estado da implementação:** Task 0 + B1–B4 feitas — **DoD da fase fechado** (2026-09-22)  
> **Dependência:** preferível após **Fase A** (senão force shiny / free shop ainda sofrem rubberband)  
> **Fora desta fase:** subir `SHINY_CHANCE` de produção; persistir free shopping no DB; Lethe/Styx/cosméticos/Selados

---

## Objetivo da fase

Completar o painel `#despertar-debug` (e espelho harness) para QA sem travas financeiras nem RNG:

1. Setters **absolutos** de almas / óbolos / mnemosyne / vereditos.
2. Checkbox **Compras Gratuitas** (`freeShopping`) — só local/admin.
3. Checkbox **Forçar Shinies** + botão “50% shiny na linha”.
4. Nota no painel: chance natural = 1%; rubberband era causa comum de “sumiço”.

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] P2 / P3 aceitos
- [x] Ordem B1 → B4 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **P2** | Free shopping + sync | **Sync off** enquanto `freeShopping`; botão “Sair do modo teste” limpa flag (+ `debugReset` opcional) | **Congelado** (2026-09-22) |
| **P3** | Shiny natural | **Manter 1%** em produção; force só debug | **Congelado** |
| **B-D1** | Set absoluto | Novo modo `DEBUG_SET_PATCH` — substitui campos numéricos (clamp ≥0); não toca `generators_state` salvo pedido explícito; `flush()` antes | **Congelado** |
| **B-D2** | Gate | `role === admin` no server; flags cliente só admin UI / localhost harness | **Congelado** |

### Lacunas explícitas

| Tema | Onde cai |
| --- | --- |
| Diagnóstico profundo de Lethe zerando shiny | Nota no painel; UX Lethe = Fase C |

---

## Task B1 — HTML do painel (inputs + checkboxes)

**Status:** feita (2026-09-22)

**Arquivos**

- `pages/despertar.html` (`#despertar-debug`)
- `css/despertar.css` — layout setters / flags
- `tests/despertar-debug-smoke.mjs` — asserts estáticos B1

**Comportamento**

| Controle | Binding |
|----------|---------|
| Input + Aplicar almas / óbolos / mnemosyne / vereditos | `data-debug-set` + `data-debug-apply` |
| Checkbox Free Shopping | `data-debug-flag="freeShopping"` |
| Checkbox Force Shiny | `data-debug-flag="forceShiny"` |
| Sair do modo teste | `data-debug-action="exitTestMode"` |
| Select linha + “Marcar 50% shiny” | `data-debug-shiny-line` + `data-debug-action="shinyHalf"` |
| Nota textual | 1% natural; free shopping sem sync |

**Checklist**

- [x] Controles só visíveis no sandbox admin (mesmo gate: `#despertar-debug[hidden]` até `bindDebugSandbox`)
- [x] Labels claros PT-BR

**Aceite**

- [x] Painel renderiza controles sem quebrar presets aditivos existentes

---

## Task B2 — Server `DEBUG_SET_PATCH`

**Status:** feita (2026-09-22)

**Arquivos**

- `api/_lib/despertar-debug.js` — `buildDebugSetPatch` / `parseAbsoluteMoney` / `expandDebugSci`
- `api/despertar.js` — `debugGrant` aceita `set` (admin only)
- `js/api.js` — `despertarDebugSet`
- `js/hades-despertar/services/ApiService.js` — `debugSet`
- `js/hades-despertar/index.js` — wire `[data-debug-apply]`
- `tests/despertar-debug-smoke.mjs`

**Comportamento**

- Body `{ action: 'debugGrant', set: { souls, run_souls?, lifetime_souls?, obols?, mnemosyne?, verdicts? } }`
- Clamp ≥ 0; `1e12` aceito; só `role === admin` (403 senão)
- Definir `souls` sem run/lifetime → ancora os três ao mesmo valor absoluto
- Não toca `generators_state`; flush no client antes do apply

**Checklist**

- [x] Non-admin → 403 (mesmo gate do bloco debug)
- [x] Set 1e12 almas → valor absoluto no patch (não aditivo)
- [x] Smoke admin (unitário `buildDebugSetPatch`)

**Aceite**

- [x] Input “Aplicar” chama `debugSet` + aplica state no HUD

---

## Task B3 — `GameState.debugFlags` + ramos de buy

**Status:** feita (2026-09-22)

**Arquivos**

- `js/hades-despertar/core/GameState.js` — `debugFlags`, free/force, `setShinyCount`
- `js/hades-despertar/ui/UIRenderer.js` — custo 0 / canBuy em free
- `js/hades-despertar/index.js` — flags, exit, shiny 50%, skip `requestSync`
- `tests/despertar-debug-smoke.mjs`

**Comportamento**

- `debugFlags = { freeShopping, forceShiny }` — **não** entra em `toSnapshot`
- Free: compra sem debitar; UI mostra custo 0; **sem** `requestSync`
- Force shiny: `chance = 1` → `shinyGained === bought`
- Sair do modo teste: limpa flags
- 50% shiny na linha: `setShinyCount` + sync só se não free

**Checklist**

- [x] Flags não serializam no save Postgres
- [x] Sair do modo: limpa flags
- [x] Force shiny → `shinyGained === bought`

**Aceite**

- [x] Free shopping compra sem saldo; force shiny brilha na hora (smoke)

---

## Task B4 — Smokes debug

**Status:** feita (2026-09-22)

**Arquivos**

- `tests/despertar-debug-smoke.mjs` — casos B1–B4 + fecho checklist
- `package.json` — `npm run check` já inclui `despertar-debug-smoke.mjs`

**Checklist**

- [x] Set souls → absoluto
- [x] Force shiny → shinyGained === bought
- [x] Free shopping não marca dirty sync (ou não flusha)

**Aceite**

- [x] Smokes verdes; DoD Fase B fechado

---

## Definition of Done — Fase B

- [x] Task 0 + B1–B4 feitas
- [x] Admin define almas num input; free shopping + force shiny só com role adequada
- [x] Master Plan: marcar Fase B `[x]`
