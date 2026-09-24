# Fase D — Loja Styx (pré-requisitos + ordenação)

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) §4  
> **Estado do documento:** fechado  
> **Estado da implementação:** Task 0 + D1–D3 feitos  
> **Dependência:** após **Fase A** (compras confiáveis); **bloqueia** cosméticos (Fase E)  
> **Paralelo:** pode rodar em paralelo à **Fase C**  
> **Fora desta fase:** redesign visual da strip; cosméticos; Selados

---

## Objetivo da fase

Reduzir poluição visual na strip Styx e priorizar o que o jogador pode comprar agora:

1. Extender `requires` com `upgradeId` / `allUpgradeIds`.
2. Encadear a linha da Foice (série: um elo visível por vez).
3. `sortStyxVisible`: affordáveis (custo↑) → resto cronológico.

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] P4 aceito
- [x] Ordem D1 → D3 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **P4** | Cadeia Foice | **Série** de 5 elos (um visível) | **Congelado** |
| **D-D1** | Soft-lock | Owned N+1 sem N continua **owned** (não esconde o que já comprou); só **reveal** de N+1 exige N | **Congelado** |
| **D-D2** | Geradores 1×/10× | Manter regra atual de qty; **não** obrigar `upgradeId` 1×→10× nesta fase (opcional depois) | **Congelado:** fora |
| **D-D3** | Sort | Tier A canBuy custo crescente; Tier B revealed !canBuy ordem catálogo | **Congelado** |

### Cadeia Foice (proposta)

| id | requer |
|----|--------|
| `foice_afilada` | (nenhum / styx unlock) |
| `juramento_acheron` | `foice_afilada` |
| `pacto_das_margens` | `juramento_acheron` |
| `ceifador_ctoniano` | `pacto_das_margens` |
| `colheita_eterna` | `ceifador_ctoniano` |

---

## Task D1 — Schema `requires.upgradeId` + fórmulas

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/core/formulas.js` (`meetsUpgradeRequirement`)
- `js/hades-despertar/core/GameState.js` / `UIRenderer.js` / `api/_lib/despertar-validate.js` (passam `upgrades`)
- `js/hades-despertar/config/upgrades.js` (`freezeRequires` para `allUpgradeIds`)
- `tests/despertar-formulas-smoke.mjs`

**Comportamento**

```js
requires: { upgradeId: 'foice_afilada' }
// ou
requires: { allUpgradeIds: ['foice_afilada'] }
```

Além de gerador/souls: exigir `state.upgrades.includes(requiredId)`.

**Checklist**

- [x] Testes unitários de meets*
- [x] Ausência de prereq = comportamento legado

**Aceite**

- [x] Sem `foice_afilada`, próximo elo falha `meetsUpgradeRequirement`

---

## Task D2 — Catálogo Foice + `describeUpgradeCard.revealed`

**Status:** feito (2026-09-22)

**Arquivos**

- `js/hades-despertar/config/upgrades.js` — cadeia `requires.upgradeId`
- `UIRenderer.js` (`describeUpgradeCard`) — `revealed = styx && (owned || meets)`; `canBuy` exige `meets`
- `tests/despertar-styx-smoke.mjs`

**Comportamento**

- Atualizar cadeia com `requires.upgradeId`.
- `revealed`: `styx && (owned || meets)` — N+1 só após compra de N; owned mid-cadeia não some.

**Checklist**

- [x] Blurbs intactos / ajustados se copy citar “próximo juramento”
- [x] Saves mid-cadeia não soft-lockam

**Aceite**

- [x] Strip mostra no máx. **um** próximo elo da Foice por vez *(em progressão linear)*

---

## Task D3 — `sortStyxVisible` + smokes

**Status:** feito (2026-09-22)

**Arquivos**

- `UIRenderer.js` — `sortStyxVisible` + `#renderStyx` reordena via `append`
- `tests/despertar-styx-smoke.mjs`

**Comportamento**

1. Tier A — canBuy, custo crescente.  
2. Tier B — revealed && !canBuy, ordem catálogo.  
3. Owned fora da lista (já).

**Checklist**

- [x] Smoke: sem `foice_afilada`, `juramento_acheron` não revela; após compra, aparece
- [x] Smoke sort: 2 affordáveis + 1 caro → affordáveis primeiro

**Aceite**

- [x] DoD Fase D fechado

---

## Definition of Done — Fase D

- [x] Task 0 + D1–D3 feitas
- [x] Cadeia um-a-um; affordáveis à esquerda/cima
- [x] Master Plan: marcar Fase D `[x]`
