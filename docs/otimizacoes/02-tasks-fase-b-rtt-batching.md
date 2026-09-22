# Fase B — Colapso de RTT e Batching

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md) §§ 3.2, 3.5, 3.7, 5 · DoD Fase B  
> **Predecessor:** [`01-tasks-fase-a-contencao.md`](./01-tasks-fase-a-contencao.md) (feita)  
> **Estado do documento:** pronto para execução  
> **Estado da implementação:** Task 0 + B1–B6 feitas (merge B2+ bloqueado até baseline `measured`)
> **Gargalos alvo:** G1 (final), G8, G7, G2 (parcial — batch UI)  
> **Fora desta fase:** Edge Middleware, split de monólitos, path `pg`+pooler dedicado, snapshot leaderboard opcional (Fase C / doc [`03-tasks-fase-c-escala-obs.md`](./03-tasks-fase-c-escala-obs.md))

---

## Objetivo da fase

Reduzir **amplificação de round-trips** PostgREST nos caminhos quentes, sem mover autoridade de XP/conquistas/sync para o cliente:

1. **Gate de capacidade:** baseline k6 (doc `04`) arquivado **antes** de merge na `main`.
2. **`session-bootstrap`:** um GET autentica + perfil + gates (corta G8).
3. **Colapso de `stateSync`:** ideal **1 RPC** (ou ≤ 2–3 RTT) mantendo `validateSync` authoritative.
4. **Award / achievements:** menos SELECT+UPDATE separados (RPC ou patch único).
5. **Leaderboard SQL** paginado (corta G7).
6. **Menos RPS ocioso:** dirty-sync endurecido + batch de eventos de aula no cliente (corta G2 parcial).

```text
Hoje (sync típico, pós-A):
  sessão + user + gate(cache?) + state + update + achievements  ≈ 4–7 RTT

Alvo Fase B:
  session-bootstrap (boot página)     → 1 HTTP / 2–3 RTT DB
  stateSync                           → 1 RPC (ou ≤ 3 RTT)
  leaderboardGet                      → 1 query ORDER BY … LIMIT
```

---

## Pré-requisito absoluto (gate de merge)

| Regra | Detalhe |
| --- | --- |
| **Baseline k6** | Nenhuma task B2–B6 mesclada na `main` sem doc [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md) publicado **e** baseline de staging arquivado (p95 sync/login + `db_round_trips` médios). |
| **Comparação A/B** | Após B3 (RPC sync), repetir C3 com a **mesma seed** de VUs; regressão se `db_round_trips` médio de sync > 3 ou p95 sync piorar vs baseline pós-A. |
| **Autoridade** | `validateSync`, awards e redeem permanecem server-side. Cliente só envia estado/candidatos; servidor decide. |
| **Migrations** | Toda RPC/view/índice novo em `db/migrate-*.sql` + `npm run db:migrate`. |

> **Nota de ordem prática:** Task **B0** e o **esboço de contratos (B1)** podem ser escritos em paralelo ao doc `04`. Código de B2+ só sobe após baseline.

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] D1–D8 abaixo aceitos pelo time antes do primeiro PR de código da Fase B
- [x] Limiares numéricos de DoD alinhados a **partida** do doc `04` (números `measured` após corrida staging — ver `BASELINE-POST-A.md`)
- [x] Ordem de tasks B1 → B6 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **D1** | Estratégia de colapso sync | **Híbrida:** validação permanece em **Node** (`validateSync` em `api/_lib/despertar-validate.js`) como fonte de verdade; persistência + grant de conquistas Despertar via **RPC Postgres** em 1 chamada PostgREST (`supabase.rpc`). Evita reescrever regras de sync em PL/pgSQL na v1. | **Congelado** |
| **D2** | Nome da RPC de sync | `despertar_persist_and_award(p_user_id integer, p_patch jsonb, p_achievement_ids text[], p_xp_delta integer)` — ver [`contratos-fase-b.md`](./contratos-fase-b.md). | **Congelado** |
| **D3** | Fallback | Feature flag env `DESPERTAR_SYNC_RPC=1` (default off até smoke+staging). Se RPC ausente/erro → path legado multi-RTT (paridade pós-A) + log `sync_rpc_fallback=1`. | **Congelado** |
| **D4** | `session-bootstrap` | Novo endpoint **`GET /api/session-bootstrap?token=`**. Resposta mínima: `{ user, gates: { despertar: { published } } }`. Cliente: `requireSession` / boot shell preferem bootstrap; `validateSession`+`fetchProfile` = fallback. | **Congelado** |
| **D5** | Leaderboard | Empurrar sort/limit ao SQL (`ORDER BY` + `LIMIT LEADERBOARD_TOP`). Join/juizo via subquery ou `LEFT JOIN despertar_states`. **Sem** carregar turma inteira para sort em Node. Snapshot Redis/tabela fica **opcional** (só se p95 ainda alto após SQL). | **Congelado** |
| **D6** | Batch de aula | Cliente enfileira `lessonView` / paragraph saves; flush a cada **N s** (ex. 8–15) **ou** `visibilitychange`/`pagehide`. Servidor: action `lessonEventsBatch` (array validado). Autoridade/hash de parágrafo inalterados. Shape em contratos. | **Congelado** |
| **D7** | Dirty sync | Heartbeat **não** envia body se `!dirty` e sem achievements pendentes (ApiService já aproximado — endurecer e medir RPS com métricas A6). | **Congelado** |
| **D8** | Award genérico (progress) | Onde houver padrão SELECT user → merge conquistas → UPDATE, preferir RPC `award_user_achievements` **ou** um único `.update({ xp, conquistas })` sem re-select desnecessário. Escopo inicial: path Despertar grant + 1–2 hotspots de `progress`. | **Congelado** |

### Lacunas explícitas (não bloquear B)

| Tema | Onde cai |
| --- | --- |
| Edge Middleware / WAF | Fase C / [`03-tasks-fase-c-escala-obs.md`](./03-tasks-fase-c-escala-obs.md) |
| Split monólito `progress.js` | Fase C |
| Pooler `pg` direto (sem PostgREST) | Fase C — só se RPC insuficiente |
| Reescrever `validateSync` inteiro em SQL | Fora de escopo B (D1) |

---

## Task B1 — Contratos + gate baseline (doc)

**Status:** feita (2026-09-22) — corrida staging `measured` ainda **ops**

**Arquivos**

- [`contratos-fase-b.md`](./contratos-fase-b.md) — `fase-b.v1`
- [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md)
- [`docs/load-results/BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) (status `pending_staging_run`)
- `tests/load/c1-login-boot.js`, `c2-aula.js`, `c3-despertar-sync.js` + `lib/`
- `tests/ops-perf-fase-b-contracts-smoke.mjs`

### Contrato `GET /api/session-bootstrap`

Ver forma canônica em [`contratos-fase-b.md`](./contratos-fase-b.md) §1.

### Contrato RPC `despertar_persist_and_award`

Ver forma canônica em [`contratos-fase-b.md`](./contratos-fase-b.md) §2 (`p_user_id integer`).

**Checklist**

- [x] Contratos D4/D2 revisados e versionados (`fase-b.v1`)
- [x] Doc `04` publicado com cenários C1–C3 mínimos + scripts
- [x] Slot baseline em `docs/load-results/BASELINE-POST-A.md`
- [x] Limiares DoD provisórios (partida) preenchidos no apêndice
- [ ] Baseline staging com status `measured` (**ops** — bloqueia merge B2+ na `main`)

**Aceite**

- [x] Smoke de contratos CI (`ops-perf-fase-b-contracts-smoke`)
- [x] PR de código B2+ deve citar `docs/load-results/BASELINE-POST-A.md` (quando `measured`)

---

## Task B2 — `session-bootstrap` unificado

**Status:** feita (2026-09-22) — merge na `main` ainda gated por baseline `measured`

**Arquivos alvo**

- `api/session-bootstrap.js` (preferido — cold start menor) **ou** action em rota existente  
- `js/api.js` — `fetchSessionBootstrap(token)`, `requireSession` / boot  
- `js/app-shell.js` / páginas que hoje fazem auth+progress  
- `local-server.mjs` — wire da rota  
- Smoke: `tests/ops-perf-fase-b-bootstrap-smoke.mjs`

**Comportamento**

1. Validar sessão (1–2 RTT sessions).  
2. Carregar user sanitize (1 RTT).  
3. Ler gate Despertar via `isDespertarPublished` (0 RTT se cache A3 quente).  
4. Responder payload D4.  
5. Cliente: **uma** chamada no boot protegido; não chamar `fetchProfile` em seguida se bootstrap ok.

**Checklist**

- [x] Endpoint + wire local/Vercel
- [x] `requireSession` / shell usam bootstrap
- [x] Fallback legado se 404/503 no bootstrap (não quebrar preview antigo)
- [x] Métricas A6: `db_round_trips` típico ≤ 3 no boot
- [x] Smoke estático + (ideal) handler 401 sem token

**Aceite**

- [x] Navegação dashboard: **1** request de sessão/perfil no happy path
- [x] DTO `user` idêntico ao sanitize atual (sem regressão de campos do front)

---

## Task B3 — Colapso RTT de `stateSync` (RPC híbrida)

**Status:** feita (2026-09-22) — flag default off; merge/`measured` ainda ops

**Arquivos alvo**

- `db/migrate-2026-09-22-despertar-persist-award-rpc.sql`  
- `api/despertar.js` — path `stateSync` sob flag D3  
- `api/_lib/despertar-persist-rpc.js`  
- `api/_lib/despertar-validate.js` — **inalterado** como fonte de regras  
- Smokes: `tests/despertar-sync-smoke.mjs` + `tests/ops-perf-fase-b-sync-rpc-smoke.mjs`  
- Comparar `db_round_trips` nos logs A6

**Fluxo alvo**

```text
stateSync (flag on):
  ① rate limit KV (A2)
  ② loadSessionUser          (~2 RTT)
  ③ isDespertarPublished     (0–1 RTT, cache A3)
  ④ getOrCreateState         (1 RTT)     — ou incluir create na RPC em v1.1
  ⑤ validateSync (CPU Node)
  ⑥ rpc despertar_persist_and_award  (1 RTT)  ← substitui persistPatch + grant
```

**Alvo numérico:** `db_round_trips` ≤ **3** no sync quente típico (estado já existe, gate hit, sem renew de sessão). Ideal futuro: fundir ④+⑥.

**Checklist**

- [x] Migration RPC + grants `EXECUTE` para service role
- [x] Handler chama RPC só após `validateSync` ok
- [x] Feature flag + fallback legado
- [x] Paridade: mesmos erros 400/409; DTO `state` / `awarded` estáveis
- [x] Smoke: flag off = comportamento A; flag on = 1 rpc no path de save
- [ ] k6 C3 pós-merge: p95 sync ≤ limiar do baseline (não regredir) — **ops**

**Aceite**

- [ ] Em staging com flag on: mediana `db_round_trips` de `action=stateSync` ≤ 3 — **ops** (após `db:migrate` + `DESPERTAR_SYNC_RPC=1`)
- [x] Nenhuma regra de sync movida ao cliente
- [x] Teste de paridade: fixture de patch → mesmo estado final legado vs RPC (planejamento de awards + validateSync no smoke)

---

## Task B4 — Award / conquistas com menos RTT

**Status:** feita (2026-09-22) — RPC Despertar via B3; hotspot `redeem` com UPDATE RETURNING

**Arquivos alvo**

- Mesma RPC B3 e/ou RPC `award_user_achievements`  
- `api/despertar.js` `grantDespertarAchievements`  
- Hotspots seguros em `api/progress.js` (ex.: após redeem) — **só** se o patch for mecânico  
- Smoke de achievements Despertar existente + `tests/ops-perf-fase-b-award-smoke.mjs`

**Comportamento**

- Preferir **um** UPDATE atômico de `xp` + `conquistas` sem SELECT prévio quando os ids já foram filtrados em memória a partir de um user já carregado.  
- Se precisar releitura, preferir `UPDATE … RETURNING` via RPC.  
- Não alterar catálogo/`ACHIEVEMENT_RULES` no cliente.

**Decisão B4 (D8)**

| Caminho | Escolha |
| --- | --- |
| Despertar sync/grant | RPC `despertar_persist_and_award` quando `DESPERTAR_SYNC_RPC=1` (B3); legado = 1 UPDATE com snapshot (sem SELECT extra) |
| Progress `redeem` / `awardAchievementIds` / parágrafo / underworld | **Um** `.update({ xp, conquistas, … }).select('*')` (RETURNING) — sem RPC `award_user_achievements` nesta entrega |
| RPC `award_user_achievements` genérica | **Adiada a B4.1** (só se staging mostrar race/contention em awards progress) |

**Checklist**

- [x] Grant Despertar usa path RPC quando flag on (coberto por B3)  
- [x] Pelo menos um hotspot progress documentado (`redeem` + `awardAchievementIds`; RPC genérica → B4.1)  
- [x] Smokes de conquistas verdes  

**Aceite**

- [x] Sync com achievement nova: sem segundo round-trip separado de `users` no path RPC  
- [x] XP/conquistas finais conferem com regras server-side  

---

## Task B5 — Leaderboard SQL paginado

**Status:** feita (2026-09-22) — p95 staging ainda **ops**

**Arquivos alvo**

- `api/_lib/leaderboard.js` + action `leaderboardGet` em `api/progress.js`  
- `db/migrate-2026-09-22-leaderboard-page-rpc.sql`  
- `js/ranking.js` / `js/api.js` — parâmetro `limit` opcional  
- Smoke: `tests/ranking-smoke.mjs` + `tests/ops-perf-fase-b-leaderboard-smoke.mjs`

**Comportamento**

```text
Hoje: SELECT users (turma/global) + SELECT despertar_states IN (…) + sort Node
Alvo: uma query (ou RPC) com ORDER BY xp|achievements|juizo DESC LIMIT $n
      juizoBest via LEFT JOIN despertar_states.juizo_best_streak (ou coluna espelhada)
```

- Manter scopes `turma` | `global` e sorts atuais.  
- Excluir `role = admin` como hoje.  
- Snapshot cache (Redis TTL 15–60 s) **opcional** — só se necessário após SQL.

**Checklist**

- [x] Sort/limit no SQL  
- [x] Paridade top-N com fixture pequena (smoke)  
- [x] Métricas: 1–2 RTT por `leaderboardGet` (RPC = 1 + sessão/user do handler)  
- [x] Sem transferir lista completa de alunos ao isolate  
- [ ] Turma staging p95 vs baseline — **ops**

**Aceite**

- [ ] Turma de tamanho staging: p95 `leaderboardGet` melhora vs baseline A (ou fica < limiar doc `04`) — **ops**  
- [x] UI ranking inalterada para o aluno  

---

## Task B6 — Dirty sync + batch de eventos de aula

**Status:** feita (2026-09-22)

**Arquivos alvo**

- `js/hades-despertar/services/ApiService.js` — heartbeat dirty-only (D7)  
- `js/lesson-paragraph.js` / `js/lessons-ui.js` / callers de `lessonView`  
- `api/progress.js` — `lessonEventsBatch` (ou equivalente)  
- `js/api.js` — helper de enqueue/flush  
- Smokes de aula + despertar sync/pages + `tests/ops-perf-fase-b-lesson-batch-smoke.mjs`

**Comportamento**

1. **Despertar:** heartbeat só `requestSync` se `_dirty` (e/ou fila de awards client-side pendente de confirmação). Compras continuam forçando sync.  
2. **Aula:** buffer local `{ type, lessonId, …, ts }[]`; flush periódico / blur; servidor valida cada item com as mesmas regras do path unitário.  
3. Resposta batch: sucesso parcial explícito (`results[]`) para não perder parágrafo válido se um item falhar.

**Checklist**

- [x] RPS ocioso de sync cai (heartbeat dirty-only; medir com A6 em staging)  
- [x] Batch não relaxa hash/autoridade de parágrafo (mesmos `executeLessonParagraph`)  
- [x] Flush no `pagehide` para não perder progresso  
- [x] Feature detect / fallback: se batch 404, flush item a item  

**Aceite**

- [x] Scroll de aula 5 min: ≤ ~1 POST batch / intervalo (views enfileirados; parágrafo no finalize faz flush imediato)  
- [x] Despertar idle 2 min: sem syncs sem dirty (salvo renew de sessão irrelevante)  

---

## Ordem de PRs sugerida

| PR | Tasks | Nota |
| --- | --- | --- |
| PR-B0 | B1 (contratos) + link baseline | Sem código de runtime crítico |
| PR-B1 | B2 bootstrap | G8; baixo risco |
| PR-B2 | B3 + B4 (RPC sync/award) | G1; flag off default |
| PR-B3 | B5 leaderboard SQL | G7 |
| PR-B4 | B6 dirty + batch aula | G2 parcial; UX |

Não mesclar PR-B2+ na `main` sem baseline k6.

---

## Definition of Done — Fase B

A Fase B está **fechada** quando:

- [ ] Baseline k6 (doc `04`) arquivado e citado no Master Plan  
- [ ] Boot página protegida ≤ **1** round-trip HTTP de sessão+perfil+gate Despertar (bootstrap)  
- [ ] `stateSync` típico ≤ **2–3** RTT (`db_round_trips` nos logs A6); ideal 1 RPC de persistência  
- [ ] Leaderboard sem full-scan + sort Node  
- [ ] Dirty sync + batch de aula em produção/preview com flag estável  
- [ ] k6 C3 pós-B: p95 sync ≤ limiar acordado; sem exaustão de conexões no pico turma  
- [ ] Nenhuma validação de XP/conquistas/sync movida ao cliente  
- [ ] Master Plan: marcar Fase B `[x]` só com DoD acima  

---

## Checklist rápido de review (PR)

- [ ] Migration em `db/` + `db:migrate` documentado  
- [ ] Feature flag / fallback para RPC  
- [ ] Paridade de DTO e erros com path legado  
- [ ] Métricas A6 ainda emitidas (`db_round_trips` faz sentido pós-colapso)  
- [ ] Smokes CI verdes  
- [ ] Sem `Cache-Control` público em POST autenticado  
- [ ] Baseline k6 referenciado no PR description  

---

## Apêndice — inventário de hotspots (Fase B)

| Componente | Caminho | Papel |
| --- | --- | --- |
| Sync validate | `api/_lib/despertar-validate.js` | Fonte de verdade (D1) |
| Sync handler | `api/despertar.js` | Orquestra rate limit, gate, RPC |
| Award progress | `api/progress.js` `redeem` / `awardAchievementIds` | UPDATE RETURNING (B4); RPC genérica → B4.1 |
| Client sync | `js/hades-despertar/services/ApiService.js` | Dirty / heartbeat |
| Boot cliente | `js/api.js` `requireSession` / `fetchProfile` | G8 |
| Shell gate | `js/app-shell.js` | Pode consumir `gates.despertar` do bootstrap |
| Leaderboard | `api/_lib/leaderboard.js` | G7 |
| Ranking UI | `js/ranking.js` / `pages/ranking.html` | Consumidor |
| Aula events | `js/api.js` lessonEventsBatch / enqueue | G2 (B6) |
| Métricas | `api/_lib/request-metrics.js` | Prova de RTT (A6) |

---

## Apêndice — limiares (partida + medido)

| Métrica | Baseline pós-A | Alvo pós-B | Medido em |
| --- | --- | --- | --- |
| p95 `stateSync` | _pending `BASELINE-POST-A`_ · partida ≤ 1,5 s | ≤ baseline e ≤ 1,5 s | k6 C3 |
| `db_round_trips` sync (mediana) | _registrar na 1ª corrida_ | ≤ 3 | logs `[metrics]` |
| p95 boot (bootstrap) | _pending_ · partida ≤ 800 ms | ≤ 800 ms | k6 C1 |
| p95 `leaderboardGet` | _pending_ | ↓ vs A | k6 C4 |

Fonte do slot: [`docs/load-results/BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md).

---

*Documento vivo: atualizar limiares após a primeira corrida k6 do doc `04` e após ligar a flag `DESPERTAR_SYNC_RPC` em staging.*
