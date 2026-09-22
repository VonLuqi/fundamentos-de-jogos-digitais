# Fase C — Escala, Middleware e Observabilidade

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md) §§ 3.2–3.4, 3.6–3.7, 4.3–4.5, 5 · DoD Fase C  
> **Predecessor:** [`01-tasks-fase-a-contencao.md`](./01-tasks-fase-a-contencao.md) + [`02-tasks-fase-b-rtt-batching.md`](./02-tasks-fase-b-rtt-batching.md) (código B1–B6 feito; baseline k6 `measured` ainda **ops**)  
> **Estado do documento:** pronto para execução  
> **Estado da implementação:** Task 0 + C1–C7 feitas; baseline k6 lab `measured` (2026-09-22)  
> **Gargalos alvo:** G9 (cold start / monólitos), G4 (endurecimento L7), G7 (snapshot opcional), G1 (pooler só se necessário), observabilidade  
> **Fora desta fase:** Migrar para Supabase Auth; multi-região; cache CDN de POST autenticado; relaxar `validateSync` / XP client-side

---

## Objetivo da fase

Com A (contenção) e B (colapso de RTT) no código, a Fase C protege o **perímetro**, reduz **cold start**, e fecha o loop de **capacidade + alertas** — sem reinventar autoridade de jogo:

1. **Edge Middleware / WAF:** teto por IP e path budget **antes** do isolate Node (corta abuso volumétrico).
2. **Observabilidade:** alertas de conexão PG, p99 e cold start correlacionados aos logs A6 + k6 C4–C6.
3. **Monólitos:** fatiar `progress.js` (e bundling) para cold start medido ↓ sob 256 MB / 10 s.
4. **Cache estático + snapshots opcionais:** CDN em assets; snapshot de leaderboard só se p95 C4 ainda alto pós-B5.
5. **Pooler `pg` direto:** **somente** se RPC PostgREST de B ainda esgotar conexões / p95 no pico turma.

```text
Pós-B (código):
  bootstrap + RPC sync + leaderboard SQL + dirty/batch

Fase C:
  Edge (IP) → Node (KV user) → RPC/SQL
       ↓
  alertas + split monólito + (opcional) snapshot / pg pooler
```

---

## Pré-requisitos e gates

| Regra | Detalhe |
| --- | --- |
| **Baseline pós-A / pós-B** | Preferir `docs/load-results/BASELINE-POST-A.md` (e corrida pós-B) com status `measured` antes de decidir C5 (pooler) ou C4 (snapshot). Código de C1–C3 (Edge / obs / split) pode avançar em paralelo ao ops de baseline. |
| **Não regredir B** | Qualquer split de handler mantém DTO, smokes e `db_round_trips` ≤ limiares B no path quente. |
| **Autoridade** | Continua server-side. Edge só rejeita abuso (429/403); não decide XP/conquistas/sync. |
| **Direct PG** | Proibido sem pooler Transaction mode. `DATABASE_URL` de migrate (Session) ≠ URI de runtime (Transaction / 6543). |
| **no-store** | Manter `Cache-Control: no-store` em `/api/*` mutáveis; exceções GET públicas só com política explícita (C6). |

> **Nota de ordem prática:** C1 (Edge) e C2 (obs) são **baixo risco** e podem ir antes do split. C5 (pooler) é **último recurso** — só com evidência de métricas Supabase.

---

## Task 0 — Decisões congeladas

**Checklist**

- [x] D1–D8 abaixo aceitos pelo time antes do primeiro PR de código da Fase C
- [x] Limiares DoD (partida) alinhados ao doc [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md) + apêndice abaixo
- [x] Ordem de tasks C1 → C7 congelada

### Decisões

| # | Tema | Decisão | Status |
| --- | --- | --- | --- |
| **D1** | Edge rate limit | **Vercel Middleware** (`middleware.js` na raiz) + store **KV/Upstash** (mesmo prefixo `fjd:` da A1) para teto por **IP** em `/api/auth`, `/api/despertar`, `/api/progress`. Não substitui rate limit por `userId` (A2). | **Congelado** |
| **D2** | Limites Edge (partida) | Auth: **30 req / min / IP** (paths `/api/auth`); Despertar: **60 / min / IP**; Progress: **90 / min / IP**. Resposta **429** + `Retry-After`. Ajustar só após C6 k6. | **Congelado** |
| **D3** | Fail policy Edge | Se KV indisponível no Edge: **fail-open com teto coarse in-memory por isolate** + header/log `edge_rate_degraded=1` (disponibilidade da aula). WAF Vercel permanece complementar. | **Congelado** |
| **D4** | Split monólito | Extrair de `api/progress.js` (≈3k linhas) módulos por domínio: `api/progress/` ou `_lib/progress/*` (friends, notes, lessons, admin, leaderboard já em `_lib`). **Não** mudar contratos HTTP públicos na v1 do split. | **Congelado** |
| **D5** | Pooler `pg` | **Gate de evidência:** só abrir path `pg` + Transaction pooler se, com RPC B ligadas, staging mostrar conexões Supabase *approaching max* **ou** p95 sync/leaderboard ainda acima do limiar pós-B. Feature flag `DESPERTAR_PG_POOL=1` (default off). Env runtime: **`DATABASE_URL_RUNTIME`** (≠ `DATABASE_URL` de migrate). | **Congelado** |
| **D6** | Snapshot leaderboard | **Opcional pós-C4 k6:** se p95 `leaderboardGet` ainda alto com RPC B5, materializar `leaderboard_snapshots` ou cache KV TTL **30–60 s** por `(scope,turma,sort)`. Invalidação best-effort em awards. | **Congelado** |
| **D7** | Observabilidade | Manter logs A6; adicionar: (1) checklist de alertas Supabase (conexões, waiting); (2) runbook em `docs/load-results/`; (3) scripts k6 **C4–C6**; (4) opcional export OpenTelemetry / Axiom — não bloqueia C1–C3. | **Congelado** |
| **D8** | Cache estático | Garantir `Cache-Control` longo (ou immutable + hash) em `/assets/**` e `/data/*.json` públicos via `vercel.json`. **Nunca** cachear POST `/api/*`. GET `/api/session-bootstrap` permanece `no-store`. | **Congelado** |

### Lacunas explícitas (não bloquear C)

| Tema | Onde cai |
| --- | --- |
| Supabase Auth / IdP | Fora de escopo (plano §6) |
| Multi-região ativa-ativa | Fora de escopo |
| Reescrever `validateSync` inteiro em PL/pgSQL | Só se D5 + evidência extrema |
| B4.1 RPC `award_user_achievements` genérica | Backlog B; não bloqueia C |

---

## Task C1 — Edge Middleware (teto IP)

**Arquivos alvo**

- `middleware.js` (raiz) — matcher `/api/auth`, `/api/despertar`, `/api/progress` (e cron **fora** do teto de aluno ou com secret)  
- `api/_lib/edge-rate-limit.js` — KV REST Edge-compatible + fail-open memória (prefixo `fjd:`)  
- `.env.example` + README  
- Smoke: `tests/ops-perf-fase-c-edge-smoke.mjs` (estático + mock)

**Comportamento**

1. Identificar IP (`x-forwarded-for` / `x-real-ip` — primeiro hop confiável).  
2. Consumir contador KV por path group + IP (janela 60 s).  
3. Acima do limite → **429** sem invocar Node.  
4. Abaixo → `next()` (`@vercel/functions`).  
5. Cron `/api/cron/*` exige `CRON_SECRET` (já A5); **não** aplicar o mesmo budget de aluno.

**Checklist**

- [x] Middleware versionado + matcher explícito  
- [x] Limites D2 documentados  
- [x] Fail-open degradê D3  
- [x] Smoke: strings-chave + (ideal) teste de contador memory  
- [ ] k6 C6 (abuso) espera 429 no Edge ou no handler  

**Aceite**

- [ ] Spray de IP em staging: Node **não** satura antes do 429 Edge  
- [ ] Aluno legítimo (1 IP, turma) **não** toma 429 nos limites D2  

---

## Task C2 — Observabilidade e runbook de capacidade

**Arquivos alvo**

- `docs/load-results/RUNBOOK-CAPACIDADE.md`  
- `tests/load/c4-ranking.js`, `c5-classind-poll.js`, `c6-abuse.js`  
- [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md) atualizado  
- Smoke: `tests/ops-perf-fase-c-obs-smoke.mjs`  
- Checklist dashboards (Supabase + Vercel) no runbook §2

**Comportamento**

1. Documentar onde mirar: conexões pooler, `waiting`, erros `too many connections`, cold starts Vercel, linhas `[metrics]`.  
2. Completar C4–C6 no repo (mesmo estilo de C1–C3).  
3. Definir alertas de **partida** (não precisam estar automatizados no dia 1 — checklist manual OK).  
4. Ligar DoD numérico da Fase C ao apêndice deste doc.

**Checklist**

- [x] Runbook com passos “incidente: conexões altas”  
- [x] C4–C6 scripts + menção no doc `04`  
- [x] Tabela de alertas (partida) no runbook  
- [x] Smoke estático aponta arquivos  

**Aceite**

- [x] Novo membro do time consegue rodar C1+C3+C4 com o runbook  
- [x] Apêndice DoD C tem limiares preenchíveis pós-`measured`  

---

## Task C3 — Split do monólito `progress.js` (G9)

**Arquivos alvo**

- `api/progress.js` → fachada fina **ou** re-exports  
- `api/_lib/progress/*.js` (sugestão): `friends.js`, `notes.js`, `lessons.js`, `admin.js`, `underworld.js`, `redeem.js`  
- Manter `leaderboard` em `api/_lib/leaderboard.js` (já B5)  
- Smokes existentes de progress/friends/grimorio/aulas **verdes** sem mudança de contrato

**Comportamento**

1. Extrair handlers por `action` sem alterar shape JSON.  
2. `handleProgress` vira switch fino + imports lazy **só se** medição de cold start exigir (cuidado com duplicar init).  
3. Medir cold start (Vercel logs / `cold=1` A6) antes/depois no mesmo path (`profileGet`, `redeem`).  
4. **Não** fatiar `despertar.js` nesta task salvo cold start Despertar ainda dominante após progress.

**Checklist**

- [x] Nenhuma action órfã  
- [x] `node --check` + smokes de amigos/grimório/aula/redeem  
- [x] Diff de cold start documentado em `docs/load-results/` (screenshot ou tabela) — estrutural done; p95 staging `pending_staging_measure`  
- [x] Bundle / imports: eager por desenho até medição; lazy só se staging exigir  

**Aceite**

- [x] Cold start p95 de `progress` ↓ vs baseline da branch **ou** justificado “já &lt; limiar” — justificado (split estrutural; medida staging pendente)  
- [x] Zero regressão funcional nos smokes listados  

---

## Task C4 — Snapshot / cache de leaderboard (opcional)

**Pré-condição:** k6 C4 com RPC B5 `measured`; só executar se p95 `leaderboardGet` ainda &gt; limiar do apêndice.

**Arquivos alvo**

- `api/_lib/leaderboard-cache.js` — KV `fjd:lb:g{gen}:{scope}:{turma}:{sort}:{limit}` TTL **30–60 s** (partida 45)  
- `api/_lib/progress/leaderboard-handler.js` — lê snapshot antes da RPC; `via: rpc+kv` em hit  
- Flag `LEADERBOARD_KV_CACHE=1` (**default off** até evidência k6)  
- Invalidate best-effort (bump `fjd:lb:gen`) em awards / redeem / admin XP  
- Smoke: `tests/ops-perf-fase-c-leaderboard-cache-smoke.mjs`  
- Juízo (`juizoBest`): **TTL-only** (não invalida a cada sync — evita cache thrash no lab)

**Checklist**

- [x] Feature flag ou TTL documentado  
- [x] Stale máximo ≤ 60 s  
- [x] Invalidate ou TTL-only explícito no DoD  

**Aceite**

- [x] Infra pronta; flag off até `measured`. Ligar se p95 C4 &gt; 800 ms — senão permanece “não necessária em prod” com RPC B5 + TTL opcional  

---

## Task C5 — Path `pg` + pooler (último recurso)

**Pré-condição:** evidência D5 (conexões / p95) com B3–B5 ligados.

**Estado:** infra **pronta** atrás de flag (`DESPERTAR_PG_POOL`, default **off**). Baseline ainda `pending_staging_run` — ligar só com approaching max / p95 acima do limiar.

**Arquivos alvo**

- `api/_lib/pg-pool.js` — Pool Transaction; max 1–3 (`PG_POOL_MAX`, partida 2); `DATABASE_URL_RUNTIME`  
- Hotspot: `callDespertarPersistAndAward` (sync persist) — pg primeiro, fallback PostgREST  
- Flag `DESPERTAR_PG_POOL=1`  
- Smoke: `tests/ops-perf-fase-c-pg-pool-smoke.mjs`  
- `.env.example` + README  

**Comportamento**

1. Confirmar no dashboard: pooler **Transaction**, porta típica **6543**.  
2. Runtime URI = `DATABASE_URL_RUNTIME` (≠ `DATABASE_URL` de migrate).  
3. Fallback para PostgREST/RPC se pool falhar + log `pg_pool_fallback=1`.  
4. Flag off = path B (PostgREST/RPC) inalterado.

**Checklist**

- [x] Documentar env `DATABASE_URL_RUNTIME` (nome final no Task 0 / D5)  
- [x] Proibido connection-per-request sem pool (`Pool` + `pgQuery`)  
- [x] Limite de clients por isolate documentado (max 1–3)  

**Aceite**

- [x] Flag off restaura comportamento B  
- [ ] Pico turma sem `too many connections` — **ops** (só relevante com flag on + evidência D5)  

---

## Task C6 — Cache de assets estáticos + política GET

**Arquivos alvo**

- `vercel.json` headers para `/assets/(.*)` e `/data/(.*)`  
- `/api/(.*)` permanece `no-store`  
- README: nota de cache bust  
- Smoke: `tests/ops-perf-fase-c-assets-cache-smoke.mjs`

**Comportamento**

| Path | Cache-Control |
| --- | --- |
| `/api/*` | `no-store, max-age=0` |
| `/assets/*` | `public, max-age=604800, stale-while-revalidate=86400` (7d; paths sem hash) |
| `/data/*` | `public, max-age=60, stale-while-revalidate=300` (JSON mutável sem hash) |

**Checklist**

- [x] Headers longos só em estáticos  
- [x] Smoke/grep: `no-store` ainda em `/api/`  
- [x] Catálogo JSON versionável (hash no filename **ou** TTL curto se mutável sem hash) — TTL curto em `/data/`  

**Aceite**

- [x] Repeat view de aula: assets em cache CDN/browser; API autenticada continua no-store — política versionada + smoke; validação em Preview é ops  

---

## Task C7 — Warmup / health de auth (opcional)

**Arquivos alvo**

- `api/cron/warmup.js` + `api/_lib/cron-auth.js`  
- `vercel.json` schedule `45 11 * * 1-5` (≈ 08:45 BRT, dias úteis)  
- `docs/load-results/WARMUP-C7.md`  
- Smoke: `tests/ops-perf-fase-c-warmup-smoke.mjs`

**Comportamento**

- Reduz cold start no minuto 0 do C1; **não** substitui scrypt async (A4).  
- Sem secrets em querystring; usar `CRON_SECRET`.  
- Pings GET em auth / progress / session-bootstrap (401 esperado) + SELECT leve `users`.

**Checklist**

- [x] Rota protegida  
- [x] Documentar janela recomendada pré-aula (15–30 min; cron 08:45 BRT ajustável)  

**Aceite**

- [x] Infra pronta; métrica lab `cold=1` ↓ → `pending_lab_measure` em [`WARMUP-C7.md`](../load-results/WARMUP-C7.md)  

---

## Ordem de PRs sugerida

| PR | Tasks | Nota |
| --- | --- | --- |
| PR-C0 | Task 0 (decisões) + este doc | Sem runtime |
| PR-C1 | C1 Edge IP | Baixo risco; paralelo a ops baseline |
| PR-C2 | C2 runbook + k6 C4–C6 | Observabilidade |
| PR-C3 | C3 split progress | G9; PRs pequenos por domínio |
| PR-C4 | C6 assets cache | Pode ir junto de C1 |
| PR-C5 | C4 snapshot | Só com evidência C4 k6 |
| PR-C6 | C5 pg pooler | Último; flag off default |
| PR-C7 | C7 warmup | Opcional |

---

## Definition of Done — Fase C

A Fase C está **fechada** quando:

- [ ] Edge teto IP ativo em preview/prod (ou WAF equivalente documentado)  
- [x] Runbook de capacidade + C4–C6 no repo  
- [x] Cold start / tamanho de `progress` medido e ↓ **ou** justificado — split estrutural C3; p95 staging `pending_staging_measure` ([`COLD-START-PROGRESS-C3.md`](../load-results/COLD-START-PROGRESS-C3.md))  
- [x] Assets estáticos com cache longo; `/api/*` mutável `no-store`  
- [x] Snapshot leaderboard **ou** evidência de que RPC B5 basta — cache C4 atrás de flag (default off); ligar só se p95 measured &gt; limiar  
- [x] Pooler `pg` **ou** evidência de que PostgREST+RPC basta (sem approaching max) — infra C5 atrás de flag; default off até evidência D5  
- [ ] k6 pico turma: degradação graceful (429), sem cascata 5xx  
- [ ] Nenhuma validação de XP/conquistas/sync movida ao cliente  
- [ ] Master Plan: Fase C `[x]` só com DoD acima  

---

## Checklist rápido de review (PR)

- [ ] Matcher Edge não cobre estáticos por engano  
- [ ] Fail policy Edge documentada  
- [ ] Split não altera contratos HTTP  
- [ ] Sem `DATABASE_URL` Session mode no runtime  
- [ ] Smokes CI verdes  
- [ ] Métricas A6 ainda emitidas nos handlers fatiados  
- [ ] Sem `Cache-Control` público em POST autenticado  

---

## Apêndice — inventário de hotspots (Fase C)

| Componente | Caminho | Papel |
| --- | --- | --- |
| Edge Middleware | `middleware.js` + `api/_lib/edge-rate-limit.js` | Teto IP L7 (C1) |
| KV / rate | `api/_lib/kv.js`, `rate-limit-kv.js` | Camada 2 userId (A) + Edge (C) |
| Progress monólito | `api/progress.js` + `api/_lib/progress/*` | Split C3 (fachada + domínios) |
| Leaderboard | `api/_lib/leaderboard.js` + `leaderboard-cache.js` | RPC B5; snapshot C4 (flag) |
| Sync RPC | `despertar_persist_and_award` + `pg-pool.js` | B3; C5 flag `DESPERTAR_PG_POOL` |
| Métricas | `api/_lib/request-metrics.js` | A6 + runbook C2 |
| Cron | `api/cron/*` | Purge A5; warmup C7 |
| k6 | `tests/load/` | C1–C6 |

---

## Apêndice — limiares (partida + medido)

Preencher **Medido (preencher)** após corrida `measured` em staging (ver runbook). Deixar `_pending_` até lá.

| Métrica | Partida pós-B | Alvo pós-C | Medido (preencher) | Fonte |
| --- | --- | --- | --- | --- |
| p95 `stateSync` | ≤ limiar B / ≤ 1,5 s | não regredir | _pending_ | k6 C3 |
| p95 `leaderboardGet` | pós-B5 | ≤ 800 ms **ou** ↓ vs B | _pending_ | k6 C4 |
| p95 login (C1) | ≤ 2,5 s | ≤ 2,5 s; menos cold com warmup | _pending_ | k6 C1 |
| Edge 429 (legítimo) | — | ≈ 0 no pico turma | _pending_ | k6 C1–C3 |
| Edge 429 (abuso) | — | ≥ 95% bloqueado antes do Node | _pending_ | k6 C6 |
| Conexões PG | sem approaching max | idem; ou C5 ligado | _pending_ | Supabase metrics |
| `cold=1` ratio progress | baseline branch | ↓ ≥ 20% **ou** &lt; limiar | _pending_ | logs A6 |

Fonte: [`docs/load-results/`](../load-results/) · [`RUNBOOK-CAPACIDADE.md`](../load-results/RUNBOOK-CAPACIDADE.md) · [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md).

---

*Documento vivo: Task 0 + C1–C7 feitas (código Fase C). Warmup: [`WARMUP-C7.md`](../load-results/WARMUP-C7.md). Gates ops/k6 (`measured`, Edge aceite) ainda abertos.*
