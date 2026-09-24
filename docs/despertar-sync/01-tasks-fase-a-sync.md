# Fase A — Sync anti-rubberband

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-despertar-sync-loja-selados-debug.md`](../plano-despertar-sync-loja-selados-debug.md) §1  
> **Estado do documento:** pronto para execução  
> **Estado da implementação:** Task 0 + A1–A5 feitas — **DoD da fase fechado** (2026-09-22)  
> **Problema alvo:** rubberbanding / snap-back em compras rápidas (optimistic buy + `applyAuthoritative` mid-RTT)  
> **Fora desta fase:** free shopping, Lethe, Styx sort, cosméticos, Selados (Fases B–F); WebSocket; pausar GameLoop; desligar optimistic buy

---

## Objetivo da fase

Eliminar a sensação de “tempo voltou” e a perda de compras feitas durante o flush:

1. Versionar mutações locais (`syncEpoch`).
2. Não zerar `_dirty` cegamente se o epoch avançou durante o RTT.
3. Em sync `ok`, **reconciliar** (merge) em vez de substituir cegamente almas/gens/upgrades.
4. Em reject (`JUDGES_REFUSED`), manter **replace total**.
5. Ecoar `clientEpoch` na resposta do server (campo opcional, backward-compatible).

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] P1 (sync strategy) aceito antes do primeiro PR
- [x] Ordem A1 → A5 congelada
- [x] Contrato opcional documentado em [`contratos-fase-b.md`](../otimizacoes/contratos-fase-b.md) (campo `clientEpoch`)

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **P1** | Estratégia | **Ambos:** dirty-preserve mid-flight **+** merge de `souls`/gens/upgrades em sync `ok` quando `echoEpoch < syncEpoch` ou ticks pós-send explicam o delta | **Congelado** (2026-09-22) |
| **A-D1** | Campos always-server | Sempre aceitar do server: `verdicts`, `juizo*`, `verdictPurchases`, `lastSyncAt` (+ talents se RPC dedicada) | **Congelado** |
| **A-D2** | Merge souls | Em `ok`: preferir `max(local, server)` se delta ≤ `dt * sps * tolerância`; senão server wins | **Congelado** |
| **A-D3** | maxGain pós-compra | **Não** nesta fase (fase opcional pós-A). Manter floor atual | **Congelado: fora** |
| **A-D4** | Fila `_pendingMutations` | **Opcional** — só se merge cosmético/juice precisar; default = epoch + dirty basta | **Congelado: sem fila** |

### Lacunas explícitas (não bloquear A)

| Tema | Onde cai |
| --- | --- |
| Free shopping / force shiny | Fase B |
| Shiny “apagado” por rubberband | Mitigado por A; force em B |

---

## Task A1 — Instrumentação harness (diagnóstico)

**Status:** feita (2026-09-22)

**Arquivos**

- `js/hades-despertar/ui/harness.js` — `syncDiagEnabled` / `logSyncDiag`
- `js/hades-despertar/services/ApiService.js` — `logDiag` / `_diag` / `isInFlight`
- `js/hades-despertar/index.js` — wire apply before/after + `window.__despertar.api`
- `tests/despertar-sync-smoke.mjs` · `tests/despertar-styx-smoke.mjs`
- `docs/otimizacoes/contratos-fase-b.md` §5 (`clientEpoch` / `echoEpoch`)

**Comportamento**

- Com `?harness=1` **ou** `?syncDiag=1` em localhost / 127.0.0.1: `console.debug('[despertar-sync-diag]', phase, data)`.
- Fases: `dirty`, `flush:reuse-in-flight`, `flush:start`, `flush:ok-before-apply`, `flush:ok-after-apply`, `flush:reject-*`, `flush:finally`, `apply:before`, `apply:after`.
- Payload inclui `dirty`, `inFlight`, `syncEpoch` (0 até A2), `souls` before/after.
- Morto fora de localhost — sem spam em produção.
- Baseline: sequência atual ainda zera `_dirty` antes do apply (rubberband reproduzível no console até A4).

**Checklist**

- [x] Log só em harness/admin (localhost + query) — sem spam em produção
- [x] Reproduz rubberband atual (baseline) antes do fix A2–A4

**Aceite**

- [x] Dá para ver no console a sequência dirty→flush→apply que causa snap-back

---

## Task A2 — `syncEpoch` no GameState + mutações

**Status:** feita (2026-09-22)

**Arquivos**

- `js/hades-despertar/core/GameState.js`
- `tests/despertar-sync-smoke.mjs`

**Comportamento**

- `state.syncEpoch` (number, inicia 0; restaura de `snapshot.syncEpoch` / `clientEpoch` na Estela local).
- `#bumpSyncEpoch()` em mutações sujas **ok**: `buyGenerator`, `buyUpgrade`, `applyPrestige`, `grantSouls`.
- Buys falhos **não** bumpam.
- `toSnapshot()` envia `clientEpoch` + `syncEpoch` (server ignora até A3).
- `applyAuthoritativeState` **não** sobrescreve `syncEpoch` (client-owned).

**Checklist**

- [x] Epoch sobe em toda buy otimista
- [x] Snapshot carrega `clientEpoch` (ou `syncEpoch`)
- [x] Não quebra `toSnapshot` / `apply` legados

**Aceite**

- [x] Smoke: após N buys, `syncEpoch === N` (ou ≥ N se outras mutações)

---

## Task A3 — Eco `clientEpoch` no server

**Status:** feita (2026-09-22)

**Arquivos**

- `api/_lib/despertar-validate.js` — `parseClientEpoch`, `buildStateDto(..., { echoEpoch })`
- `api/despertar.js` — `stateSync` ecoa no `state` + envelope
- `docs/otimizacoes/contratos-fase-b.md` §5
- `tests/despertar-sync-smoke.mjs`

**Comportamento**

- Aceita `clientEpoch` ou `syncEpoch` (number ≥ 0); inválido/ausente = sem eco (legado).
- Eco em `state.echoEpoch` e no envelope da resposta `stateSync` (ok e reject).
- Sem validação de autoridade sobre o epoch.

**Checklist**

- [x] Resposta inclui `echoEpoch` ou `clientEpoch`
- [x] Ausência do campo = comportamento legado (sem regressão)
- [x] Contrato documentado

**Aceite**

- [x] Sync smoke: round-trip ecoa o valor enviado

---

## Task A4 — `ApiService.flush`: dirty-preserve + apply reconcile

**Status:** feita (2026-09-22)

**Arquivos**

- `js/hades-despertar/core/GameState.js` — `applyAuthoritativeState(snap, { mode })` replace vs reconcile
- `js/hades-despertar/services/ApiService.js` — dirty-preserve + `syncFn` injetável
- `js/hades-despertar/index.js` — wire meta (`mode`, `elapsedMs`, `sps`)
- `tests/despertar-sync-smoke.mjs`

**Comportamento**

1. Antes do await: `epochAtSend` do snapshot.
2. Após `ok`: apply `mode: 'reconcile'`; se `localEpoch > epochAtSend` (ou `echoEpoch < localEpoch`) → `_dirty = true` + re-armar flush.
3. Reconcile: max qty / união upgrades / souls com tolerância de ticks; Juízo/talents/óbolos = server.
4. Após reject 400/409: `mode: 'replace'` + dirty limpo.

**Checklist**

- [x] `_dirty` preservado se epoch avançou durante RTT
- [x] Modo `merge: 'reconcile'` vs `replace` (reject)
- [x] Campos always-server sempre aplicados
- [x] Sem pausar GameLoop

**Aceite**

- [x] Spam mid-flight: qty/upgrades não somem (smoke com syncFn)
- [x] Reject malicioso ainda restaura DB completo

---

## Task A5 — Smokes sync

**Status:** feita (2026-09-22)

**Arquivos**

- `tests/despertar-sync-smoke.mjs` — casos A1–A5 + spam 20 buys / epoch estável
- `package.json` — `npm run check` já inclui `despertar-sync-smoke.mjs`

**Checklist**

- [x] Caso: buy durante `_inFlight` → geradores/upgrades presentes após apply (A4 + A5 spam)
- [x] Caso: reject → restore total (A4 replace / flush 400)
- [x] Caso: eco epoch na resposta (A3 + A5 estável)
- [x] `npm run check` / smoke listado no package

**Aceite**

- [x] Smokes verdes; DoD da Fase A fechado

---

## Definition of Done — Fase A

- [x] Task 0 + A1–A5 feitas
- [x] Spam buy sem rubberband perceptível de qty/upgrades (smoke A5)
- [x] Reject path intacto
- [x] Master Plan: marcar Fase A `[x]`
