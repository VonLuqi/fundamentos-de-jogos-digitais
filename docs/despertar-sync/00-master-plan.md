# Guia de Implementação — Despertar Sync · Loja · Selados · Debug

**Projeto:** Fundamentos de Jogos Digitais — minigame *O Despertar*  
**Documento Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md)  
**Pais:** [`plano-hades-despertar.md`](../plano-hades-despertar.md) · [`plano-despertar-ui-cookieclicker.md`](../plano-despertar-ui-cookieclicker.md) · [`plano-despertar-aureolas-letreiro-shiny-hud-juizo.md`](../plano-despertar-aureolas-letreiro-shiny-hud-juizo.md)  
**Objetivo:** Transformar o backlog (anti-rubberband, debug, Lethe/tutoriais, Styx, cosméticos, Juramentos Selados) em tarefas técnicas, iterativas e rastreáveis — com ordem de dependência clara e Definition of Done por fase.

**Status do guia:** fechado (2026-09-22) — **Fases A–F feitas**

---

## Índice de Fases

Este guia foi fatiado em documentos menores para facilitar atribuição de PRs e code reviews:

| Estado | Fase | Documento |
| --- | --- | --- |
| [x] | **Fase A:** Sync anti-rubberband (epoch + dirty-preserve + merge) | [`01-tasks-fase-a-sync.md`](./01-tasks-fase-a-sync.md) — Task 0 + A1–A5 feitas |
| [x] | **Fase B:** Admin / Debug (setters, free shopping, force shiny) | [`02-tasks-fase-b-debug.md`](./02-tasks-fase-b-debug.md) — Task 0 + B1–B4 feitas |
| [x] | **Fase C:** Lethe progressivo + tutoriais | [`03-tasks-fase-c-lethe.md`](./03-tasks-fase-c-lethe.md) — Task 0 + C1–C3 feitas |
| [x] | **Fase D:** Loja Styx (pré-requisitos + ordenação inteligente) | [`04-tasks-fase-d-styx.md`](./04-tasks-fase-d-styx.md) — Task 0 + D1–D3 feitas |
| [x] | **Fase E:** Cosméticos de upgrade → sprites / Foice | [`05-tasks-fase-e-cosmetics.md`](./05-tasks-fase-e-cosmetics.md) — Task 0 + E1–E4 feitas |
| [x] | **Fase F:** Juramentos Selados (grade Cookie + tooltip) | [`06-tasks-fase-f-selados.md`](./06-tasks-fase-f-selados.md) — Task 0 + F1–F3 feitas |

```text
[ Plano Base (análise) ]
         │
         ▼
[ 00 Master Plan ] ──► A Sync ──► B Debug
         │                 │
         │                 ├──► C Lethe (paralelo a D)
         │                 └──► D Styx ──► E Cosméticos
         │
         └──────────────────────► F Selados (paralelo a C–E)
```

---

## Resumo do Roadmap de Execução

A implementação deve seguir a prioridade abaixo para eliminar o gargalo que invalida o resto (**rubberband em compras rápidas**) o mais cedo possível:

| Prioridade | Fase | Foco principal | Bloqueia / Desbloqueia | Estado |
| --- | --- | --- | --- | --- |
| **P0** | **Fase A** | `syncEpoch`, preservar `_dirty` mid-flight, merge reconcile vs replace | Sem A, spam buy continua mentindo o estado | **Feita** |
| **P1** | **Fase B** | Setters absolutos, free shopping, force shiny + nota 1% | Confiança em testes manuais de C–F | **Feita** |
| **P2** | **Fase C / D** | Reveal Lethe + logs; cadeia Foice + sort “posso comprar” | C ∥ D após A; D alimenta E | **Feita** |
| **P3** | **Fase E / F** | Coverage cosmético nos sprites; grade densa Selados + tip | E após D (upgrades ativos); F só UI | **Feita** |

### Ordem congelada de entrega

1. Congelar **Task 0** de cada fase (decisões P1–P6 do plano base) antes do primeiro PR daquela fase.  
2. ~~Fechar **Fase A** (smokes sync)~~ ✓ antes de confiar em free shopping / spam Styx.  
3. ~~Mesclar **Fase B** (admin)~~ ✓ — preferível antes de C–F para acelerar QA.  
4. **Fase C** e **Fase D** em paralelo (PRs separados).  
5. **Fase E** após D (precisa da árvore de upgrades estável).  
6. **Fase F** a qualquer momento após A (só UI Stats); idealmente junto com polish de Styx tip.

### Estimativa grossa

| Fase | Effort |
| --- | --- |
| A Sync | 1–1,5 d |
| B Debug | 0,5 d |
| C Lethe | 0,5 d |
| D Styx | 0,5–1 d |
| E Cosméticos | 1–1,5 d |
| F Selados | 0,5 d |

---

## Regras para o Desenvolvimento

### Autoridade (sync)

- Sob **nenhuma hipótese** a validação authoritative de sync (`validateSync`, `maxGain`, reject `JUDGES_REFUSED`) deve ser movida para o cliente.
- Reconcile no client só em sync **`ok`**; path de reject continua **`replace` total** + aviso.
- Não afrouxar `SYNC_ABSURD_GAIN_FLOOR` sem telemetria (opcional pós-A: `maxGain` pós-compra — só se Task 0 da Fase A autorizar).

### Debug / Free shopping

- Flags `freeShopping` / `forceShiny` **nunca** persistem no Postgres do save “real”.
- Free shopping: **sync off** enquanto ativo (default P2); sair do modo limpa flag (+ `debugReset` opcional).
- Setters absolutos: só `role === admin` no server (`despertar-debug.js`).

### UX e progressão

- Tutoriais: Códice + ticker / toast leve — **sem** modal bloqueante.
- Pré-requisitos Styx: upgrade ausente na cadeia = **hidden**, não soft-lock (owned N+1 sem N continua owned).
- Cosméticos P0 = **procedural/CSS**; WebP real fica para arte depois (`PEDIDOS-MESTRE.md`).

### Testabilidade

- Cada task lista smokes (`tests/despertar-*-smoke.mjs`); PR não mescla sem os smokes da fase.
- Instrumentação temporária de epoch/dirty (Fase A) pode sair após aceite, ou ficar atrás de `?harness=1`.

### Escopo explícito fora deste guia

- WebSocket / sync por ação individual.  
- Pausar `GameLoop` durante flush.  
- Desligar optimistic buy.  
- Subir `SHINY_CHANCE` de produção (1% permanece; force só debug).  
- Reabrir anti-cheat de almas além do necessário para reconciliar compras.

---

## Definition of Done por fase (resumo)

| Fase | DoD resumido | Estado |
| --- | --- | --- |
| **A** | Spam 20 buys &lt;3 s sem snap-back de qty/upgrades; reject ainda restaura; `clientEpoch` ecoado | **Feito** |
| **B** | Admin set almas absoluto; free shopping compra sem saldo; force shiny brilha na hora; só role adequada | **Feito** |
| **C** | First unlock Lethe = feedback + log; segunda render não re-dispara | **Feito** |
| **D** | Cadeia Foice um-a-um; affordáveis primeiro na strip | **Feito** |
| **E** | ≥1 upgrade altera ~coverage dos sprites/Foice sem reload | **Feito** |
| **F** | Selados = grade densa Cookie; hover/tip com nome+blurb; a11y ok | **Feito** |

### Aceite global (fecho do guia)

- [x] Spam de compras sem rubberband perceptível; reject ainda restaura. *(Fase A)*
- [x] Admin: set almas, free shopping, force shiny só com role adequada. *(Fase B)*
- [x] Primeiro unlock do Lethe tem feedback + log/tutorial. *(Fase C)*
- [x] Styx: cadeia Foice um-a-um; affordáveis primeiro. *(Fase D)*
- [x] ≥1 upgrade reflete visualmente em sprites/Foice. *(Fase E)*
- [x] Juramentos Selados = grade densa + tooltip hover. *(Fase F)*

---

## Decisões a congelar (Task 0 global — do plano base)

| # | Tema | Default sugerido | Onde formalizar |
| --- | --- | --- | --- |
| **P1** | Sync | **Ambos** (dirty-preserve + merge souls em ok) | Fase A Task 0 — **congelado** |
| **P2** | Free shopping | **Sync off** enquanto ativo | Fase B Task 0 — **congelado** |
| **P3** | Shiny natural | **Manter 1%**; force só debug | Fase B Task 0 — **congelado** |
| **P4** | Cadeia Foice | **Série** (um visível) | Fase D Task 0 — **congelado** |
| **P5** | Cosméticos | **Procedural P0** | Fase E Task 0 — **congelado** |
| **P6** | Selados | **Reusar classes Styx; tip `#sealed-tooltip`** | Fase F Task 0 — **congelado** |

---

## Como usar estes documentos

1. Abrir o doc da fase.  
2. Congelar **Task 0** (decisões) antes de codar.  
3. Executar tasks na ordem; marcar checklists.  
4. Cumprir **Aceite** da task + smokes listados.  
5. Atualizar o índice deste Master Plan (`[x]` / `[ ]`) quando o **doc da fase** estiver completo e o **DoD da fase** fechado.  
6. Manter o [plano base](../plano-despertar-sync-loja-selados-debug.md) como referência de análise; o **status de execução** vive aqui.

---

## Referências rápidas

| Artefato | Caminho |
| --- | --- |
| Plano base (análise completa) | [`docs/plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) |
| Client sync | `js/hades-despertar/services/ApiService.js` |
| Estado | `js/hades-despertar/core/GameState.js` · `index.js` |
| Validate / DTO | `api/_lib/despertar-validate.js` · `api/despertar.js` |
| Debug admin | `api/_lib/despertar-debug.js` · `#despertar-debug` |
| Styx / Selados UI | `js/hades-despertar/ui/UIRenderer.js` |
| Fórmulas / requires | `js/hades-despertar/core/formulas.js` · `config/upgrades.js` |
| Mundo / órbita | `ui/world/WorldView.js` · `AltarOrbit.js` |
| Contratos sync (Fase B perf) | [`docs/otimizacoes/contratos-fase-b.md`](../otimizacoes/contratos-fase-b.md) |
| Smokes | `tests/despertar-*-smoke.mjs` |
