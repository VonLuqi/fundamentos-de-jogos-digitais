# Fase A — Contenção e Cache Local

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md) §§ 3.3, 3.4, 3.6, 3.7, 5  
> **Estado do documento:** pronto para execução  
> **Estado da implementação:** Task 0 + A1–A6 feitas (DoD da fase — ver checklist abaixo)  
> **Gargalos alvo:** G1 (parcial — remove RTT do gate), G3, G4, G5, G6  
> **Fora desta fase:** RPC `stateSync`, `session-bootstrap`, Edge Middleware, leaderboard SQL, batching de aula (Fases B/C)

---

## Objetivo da fase

Proteger a API sob concorrência **sem** ainda colapsar o pipeline PostgREST em RPC:

1. Rate limits de jogo **compartilhados** entre isolates (fim da dependência exclusiva de `Map`).
2. Cache de `lesson_gates` (Despertar published) com invalidação no admin.
3. Auth com **`scrypt` assíncrono** (menos bloqueio do event loop no cold start).
4. **Purge** de sessions expiradas **fora** do hot path de login/register.
5. Instrumentação mínima (`db_round_trips`, `duration_ms`) para alimentar o baseline k6 (doc `04`).

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] D1–D6 abaixo aceitos pelo time antes do primeiro PR de código
- [x] Variáveis de ambiente de KV documentadas no README / `.env.example` (sem secrets)
- [x] Ordem de tasks A1 → A6 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **D1** | Store compartilhado | Usar **`@vercel/kv`** (já no `package.json`) como backing de rate limit + cache de gate. Se KV não estiver configurado em dev local, fallback explícito (D3). | **Congelado** |
| **D2** | Limites iniciais | Sync Despertar: **12 / min / userId**; Juízo guess: **2 / s / userId**; underworld redeem: **12 / min / userId** (paridade com Maps atuais). Ajustar só após baseline k6. Exportados em `GAME_RATE_LIMITS` (`api/_lib/rate-limit-kv.js`). | **Congelado** |
| **D3** | Fail policy | **Despertar sync / Juízo / underworld:** se KV indisponível → **fail-open** com teto **local** (`Map`) + log `rate_limit_degraded=1` (disponibilidade da aula). **Não** fail-open em auth login (permanece DB). | **Congelado** |
| **D4** | Cache de gate | Chave `gate:despertar:published` → `"0"` \| `"1"`; TTL **60 s**; **invalidate** síncrono em `setLessonGate` (admin). Memoização por isolate opcional por request burst. | **Congelado** (impl. em A3) |
| **D5** | scrypt | Trocar `scryptSync` → `crypto.scrypt` (promisificado) em `api/auth.js`. **Manter** N/r/p defaults do Node e keylen 64. Sem redução de custo criptográfico nesta fase. | **Congelado** (impl. em A4) |
| **D6** | Purge sessions | Remover `purgeExpiredSessions` do path de login/register/GET auth. Expor limpeza via **rota interna cron** (`api/cron/sessions-purge.js` ou action admin protegida) + agendar no Vercel Cron (diário). | **Congelado** · **feita (A5)** |

### Lacunas explícitas (não bloquear A)

| Tema | Onde cai |
| --- | --- |
| Edge Middleware teto IP | Fase C / [`03-tasks-fase-c-escala-obs.md`](./03-tasks-fase-c-escala-obs.md) |
| Baseline k6 C1–C6 | Doc `04` (obrigatório antes de merge B) |
| RPC sync / bootstrap | Fase B / doc `02` |

---

## Task A1 — Cliente KV + helper de rate limit

**Status:** feita (2026-09-22)

**Arquivos**

- `api/_lib/kv.js` — `getKv()` / `isKvConfigured()` / `kvKey()` (prefixo `fjd:`)
- `api/_lib/rate-limit-kv.js` — `consumeRateLimit`, `consumeGameRateLimit`, `applyRetryAfterHeader`, `GAME_RATE_LIMITS`
- `tests/ops-perf-fase-a-kv-smoke.mjs`
- `.env.example` + README (env KV)

**Comportamento**

- Encapsular `@vercel/kv` sem espalhar imports nos monólitos.
- API: `consumeRateLimit({ key, limit, windowMs }) → { limited, remaining, retryAfterSec, backend: 'kv'|'memory', degraded }`.
- Memória: sliding window (paridade Maps legados); KV: fixed window `INCR`+`PEXPIRE`.
- `applyRetryAfterHeader(res, result)` para respostas **429**.
- Ligação em Despertar/progress = **Task A2** (helper pronto; callers ainda nos Maps).

**Checklist**

- [x] Helper único pronto para Despertar e progress (underworld) — wiring em A2
- [x] Sem throw não tratado se `KV_REST_API_URL` / token ausentes
- [x] Smoke cobre: limited=true após N+1 hits no backend memory (determinístico sem Redis)
- [x] Documentar env vars necessárias para prod/preview

**Aceite**

- [x] Contrato KV pronto: mesma chave `fjd:…` compartilhada entre isolates quando KV provisionado (exercício end-to-end com Redis = smoke opcional em staging; CI valida path memory)
- [x] Sem KV: `consumeRateLimit` não throw; usa `backend: 'memory'` (degradê com log quando KV configurado falha)

---

## Task A2 — Migrar rate limits Despertar + underworld para KV

**Status:** feita (2026-09-22)

**Arquivos**

- `api/despertar.js` — sync + Juízo via `consumeGameRateLimit` + `Retry-After`
- `api/progress.js` — underworld redeem idem
- Smokes: `tests/despertar-sync-smoke.mjs`, `tests/despertar-juizo-smoke.mjs`, `tests/submundo-enigma-smoke.mjs`, `tests/ops-perf-fase-a-kv-smoke.mjs`

**Comportamento**

- Fonte de verdade: helper A1 (`GAME_RATE_LIMITS` / KV; Map só no degradê D3 dentro de `rate-limit-kv.js`).
- Mensagens 429 preservadas (Submundo / Juízo / oferendas).
- `auth-rate.js` (DB) **não** alterado.

**Checklist**

- [x] Sync: 12/min/userId via KV helper
- [x] Juízo: ~2/s/userId via KV helper
- [x] Underworld redeem: 12/min/userId via KV helper
- [x] `Retry-After` presente nos 429
- [x] Smokes atualizados (Maps removidos)

**Aceite**

- [x] Contrato multi-isolate: mesma chave `fjd:rl:…` quando KV provisionado (path memory validado no CI)
- [x] Auth rate limit DB (`api/_lib/auth-rate.js`) **não** alterado nesta task

---

## Task A3 — Cache de `lesson_gates` (Despertar published)

**Status:** feita (2026-09-22)

**Arquivos**

- `api/_lib/despertar-gate.js` — memo (5 s) + KV (`fjd:gate:despertar:published`, TTL 60 s) + `invalidateDespertarPublishedCache`
- `api/progress.js` — `setLessonGate` invalida quando `despertar` / `published`
- `tests/ops-perf-fase-a-gate-cache-smoke.mjs`

**Comportamento**

```text
isDespertarPublished(supabase)
  1. hit memo isolate (TTL 5 s)
  2. hit KV gate:despertar:published
  3. miss → SELECT lesson_gates → set memo + KV TTL 60s → return
```

- `setLessonGate(despertar/published)` → DEL KV + limpa memo **após** upsert OK, antes da resposta.
- Default seguro: ausência / erro → selado (`false`). Admin bypass inalterado (`isDespertarSealedForUser`).
- `getLastDespertarGateCacheStatus()` → `hit_memo` | `hit_kv` | `miss` | `n/a` (prep A6).

**Checklist**

- [x] Path quente não consulta `lesson_gates` em todo request quando cache quente (memo/KV)
- [x] Admin libera/fecha → invalidate (sem esperar 60 s)
- [x] Admin continua bypass de selo
- [x] Smoke de gate + invalidate

**Aceite**

- [x] Smoke: 2ª leitura = `hit_memo` sem SELECT; pós-invalidate = `miss` + SELECT
- [x] Sem KV: leitura por miss/SELECT funciona sem 5xx; memo isolate ainda evita SELECT em burst

---

## Task A4 — `scrypt` assíncrono no auth

**Status:** feita (2026-09-22)

**Arquivos**

- `api/auth.js` — `hashPassword` / `verifyPassword` async (`promisify(crypto.scrypt)`); bcrypt via `compare`
- `tests/ops-perf-fase-a-scrypt-smoke.mjs`
- `api/_lib/store.js` scrypt legado: **fora de escopo** (path morto para auth vivo)

**Comportamento**

- Formato on-disk inalterado: `saltHex(12 bytes):derivedHex` com **keylen 64** e N/r/p defaults do Node.
- Login/register/reset/admin temp password **await** hash/verify.
- bcrypt legado: `bcrypt.compare` + **migrate → scrypt** on-success; plaintext → scrypt preservado.
- Log opcional: `AUTH_LOG_SCRYPT=1` → `scrypt_ms=… op=hash|verify`.

**Checklist**

- [x] Nenhum `scryptSync` no path quente de `api/auth.js`
- [x] Login com hash scrypt existente continua válido (mesmo salt/keylen)
- [x] Migração bcrypt → scrypt on-success
- [x] Smoke de password / auth (roundtrip + asserts estáticos)

**Aceite**

- [x] Smoke: hash/verify scrypt + verify bcrypt legado
- [ ] Em carga C1 (doc `04`): p95/p99 login — pendente baseline k6

---

## Task A5 — Purge de sessions fora do hot path

**Status:** feita (2026-09-22)

**Arquivos**

- `api/auth.js` — removidas calls oportunistas (GET/login/register)
- `api/_lib/sessions.js` — `purgeExpiredSessions` retorna `{ ok, deleted, error }`
- `api/cron/sessions-purge.js` — rota protegida por `CRON_SECRET`
- `vercel.json` — cron `0 5 * * *` → `/api/cron/sessions-purge`
- `local-server.mjs` — wire local da rota
- `tests/ops-perf-fase-a-sessions-purge-smoke.mjs`
- Índice `sessions_expires_at_idx` já existe (`db/setup.sql` + migrate TTL) — **sem migration nova**

**Comportamento**

- Auth: criar/validar sessão **sem** DELETE amplo.
- Cron diário (05:00 UTC): `DELETE … WHERE expires_at < now()` + `select token` para contar.
- Authz: `Authorization: Bearer $CRON_SECRET` (ou `x-cron-secret`); comparação timing-safe.

**Checklist**

- [x] Zero chamadas a `purgeExpiredSessions` em `api/auth.js`
- [x] Rota/job documentada + secret (README + `.env.example`)
- [x] Smoke: auth sem purge; cron 401 sem secret
- [x] Migration não necessária (índice já presente)

**Aceite**

- [x] Hot path de login/register/GET sem purge (assert estático + smoke)
- [ ] Job em staging com `CRON_SECRET` — validar uma execução real pós-deploy (ops)

---

## Task A6 — Instrumentação de request (prep k6)

**Status:** feita (2026-09-22)

**Arquivos**

- `api/_lib/request-metrics.js` — ALS + `createRequestMetrics` / `finishRequestMetrics` / `parseMetricsLine`
- `api/despertar.js`, `api/auth.js`, `api/progress.js` — wrap + status
- `api/_lib/sessions.js`, `api/_lib/despertar-gate.js` — `metricsBumpDb` nos RTT
- `tests/ops-perf-fase-a-metrics-smoke.mjs`
- Master Plan: seção “Como extrair p95…”

**Campos**

`request_id`, `route`, `action`, `duration_ms`, `db_round_trips`, `gate_cache`, `rate_limit_backend`, `scrypt_ms` (auth), `cold`, `status` — sem PII.

**Checklist**

- [x] stateSync loga `db_round_trips` e `gate_cache`
- [x] login loga `duration_ms` e `scrypt_ms`
- [x] Documentar no Master Plan como extrair p95 (doc `04` ainda planejado)
- [x] Smoke de parse / fixture

**Aceite**

- [x] Smoke: linha `[metrics]` parseável e correlacionável por `request_id`
- [ ] Staging: 10 syncs → 10 linhas (validação ops pós-deploy)

---

## Ordem de PRs sugerida

| PR | Tasks | Nota |
| --- | --- | --- |
| PR-A1 | A1 + A2 | Rate limit primeiro (G4) |
| PR-A2 | A3 | Cache gate (G1 parcial, G5) |
| PR-A3 | A4 + A5 | Auth CPU + purge (G3, G6) |
| PR-A4 | A6 | Instrumentação (pode ir junto do A1 se pequeno) |

Evitar um único PR monólito da fase inteira.

---

## Definition of Done — Fase A

A Fase A está **fechada** quando:

- [x] Tasks A1–A6 com Aceite OK (staging ops pontuais: cron real + 10 syncs com metrics — ver A5/A6)
- [x] Limites de sync/Juízo/underworld via helper KV (cross-isolate com KV; memory degradê sem KV)
- [x] Gate Despertar com cache memo/KV + invalidate admin
- [x] Login/register **não** disparam purge global de `sessions`
- [x] `scrypt` async no path quente de auth
- [x] Logs com `db_round_trips` / `duration_ms` em sync e login
- [x] Master Plan atualizado (Task 0 + A1–A6)
- [x] Nenhuma validação de XP/conquistas movida ao cliente
- [ ] Sem merge de trabalho da Fase B até baseline k6 (doc `04`) — **ainda vigente**

---

## Checklist rápido de review (PR)

- [ ] Sem novos `Map` como único rate limit em path de jogo
- [ ] Sem `scryptSync` em `api/auth.js`
- [ ] Invalidação de gate no admin testada
- [ ] `Retry-After` nos 429 novos/alterados
- [ ] Fail policy D3 respeitada e logada
- [ ] Env KV documentada; app não quebra sem KV em dev
- [ ] Smokes CI verdes

---

## Apêndice — chaves KV sugeridas

| Chave | Valor | TTL |
| --- | --- | --- |
| `rl:despertar:sync:{userId}` | contador / janela | janela 60 s |
| `rl:despertar:juizo:{userId}` | contador / janela | janela 1 s |
| `rl:underworld:redeem:{userId}` | contador / janela | janela 60 s |
| `gate:despertar:published` | `0` \| `1` | 60 s (ou até DEL) |

Prefixo global opcional: `fjd:` para evitar colisão em KV compartilhado entre projetos.
