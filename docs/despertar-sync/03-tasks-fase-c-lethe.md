# Fase C — Lethe progressivo + tutoriais

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) §3  
> **Estado do documento:** fechado  
> **Estado da implementação:** Task 0 + C1–C3 feitos  
> **Dependência:** independente de B/D após **Fase A** estável (milestones sync ok)  
> **Paralelo:** pode rodar em paralelo à **Fase D**  
> **Fora desta fase:** redesign completo do Panteão; modal bloqueante de tutorial; Styx sort (Fase D)

---

## Objetivo da fase

Dar feedback quando o Lethe **abre de verdade** e amarrar desbloqueios a tutoriais leves:

1. First unlock: flash + ticker + `milestones.letheSeen`.
2. Logs no Códice (`log_lethe_unlock`, `log_lethe_ritual`, opcional `log_styx_open`).
3. Toast opcional não-bloqueante (“Entendi”).
4. CSS `is-just-unlocked` na aba (respeitar `prefers-reduced-motion`).

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] Tom do tutorial (ticker vs toast) aceito
- [x] Ordem C1 → C3 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **C-D1** | Persistência | `milestones.letheSeen` no objeto milestones existente (sync/merge) | **Congelado** |
| **C-D2** | UX tutorial | Unlock → `interruptTicker` 5 s + flash aba/tela; toast `#despertar-tutorial-toast` **opcional**; **sem** modal | **Congelado** |
| **C-D3** | Condição Lethe | Manter `isLetheOpen` atual (`runSouls ≥ 1e8` ou prestígio/óbolos/essência) | **Congelado:** sem mudar fórmula |

---

## Task C1 — Milestone + transição locked→open

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/core/GameState.js` — `markLetheSeen()`
- `js/hades-despertar/ui/UIRenderer.js` — `#renderLethe` / `#announceLetheUnlock`
- `js/hades-despertar/ui/juice.js` — `flashLetheUnlock`
- `css/despertar.css` — `#tab-lethe.is-just-unlocked` + flash `.is-lethe`
- `tests/despertar-lethe-smoke.mjs`

**Comportamento**

| Camada | Condição | UI |
|--------|----------|-----|
| Tab velada | `!isLetheOpen` | Locked copy (atual) |
| First unlock | `isLetheOpen && !milestones.letheSeen` | Flash + ticker + `letheSeen = true` + `requestSync` |
| Ritual CTA | `canPrestige()` | Botão intenso (já parcial) |

**Checklist**

- [x] Transição dispara **uma vez**
- [x] Segunda render / reload com milestone = sem re-toast

**Aceite**

- [x] Aluno sente o desbloqueio sem abrir o Códice sozinho

---

## Task C2 — Edu-logs + wire `#logTriggered`

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/config/edu-logs.js` — `log_lethe_*`, `log_styx_open`, `eduLogTickerPhrase`
- `GameState.js` — `#logTriggered` + `markLetheSeen` chama `unlockLogs`
- `UIRenderer.js` — `#announceEduLogTickers` (one-shot; mount seed)
- `api/_lib/despertar-achievements.js` — elegibilidade server espelhada
- `tests/despertar-lethe-smoke.mjs` / `despertar-codex-smoke.mjs`

**Comportamento**

| Log | Gatilho |
|-----|---------|
| `log_lethe_unlock` | first `isLetheOpen` |
| `log_lethe_ritual` | first `canPrestige()` true |
| `log_styx_open` | first `isStyxUnlocked` |

**Checklist**

- [x] Entradas no Códice
- [x] Ticker com primeira frase do log
- [x] Reduced-motion: só texto / sem flash agressivo

**Aceite**

- [x] Smoke: `runSouls = 1e8` → log presente; segunda pass não re-dispara

---

## Task C3 — CSS + smoke

**Status:** feito (2026-09-22)

**Arquivos**

- `css/despertar.css` — `#tab-lethe.is-just-unlocked` + `.despertar-tutorial-toast` + reduced-motion
- `pages/despertar.html` — `#despertar-tutorial-toast` + “Entendi”
- `js/hades-despertar/ui/juice.js` — `showTutorialToast`
- `tests/despertar-lethe-smoke.mjs` / `despertar-a11y-smoke.mjs`

**Checklist**

- [x] Animação curta; `prefers-reduced-motion` = sem motion
- [x] Smoke cobre first unlock + idempotência
- [x] Toast opcional não-bloqueante + a11y

**Aceite**

- [x] DoD Fase C fechado

---

## Definition of Done — Fase C

- [x] Task 0 + C1–C3 feitas
- [x] First unlock Lethe = feedback + log; sem spam em re-render
- [x] Master Plan: marcar Fase C `[x]`
