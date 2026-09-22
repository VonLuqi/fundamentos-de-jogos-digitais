# Guia de Implementação de Otimizações — Master Plan

**Projeto:** Fundamentos de Jogos Digitais (Arquitetura Vercel + Supabase)  
**Documento Base:** [`plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md)  
**Objetivo:** Transformar as diretrizes arquiteturais em tarefas técnicas, iterativas e rastreáveis para garantir que a API suporte alta concorrência sem exaustão de conexões e com baixa latência.

**Baseline k6 (lab):** 2026-09-22 · SHA `8b67ad6` · [`BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) (`measured`) · [`TURMA-30.md`](../load-results/TURMA-30.md)

---

## Índice de Fases

Este guia foi fatiado em documentos menores para facilitar a atribuição de tarefas e code reviews:

| Estado | Fase | Documento |
| --- | --- | --- |
| [x] | **Fase A:** Contenção e Cache Local (proteção cross-isolate, menos CPU no auth, menos RTT de gate) | [`01-tasks-fase-a-contencao.md`](./01-tasks-fase-a-contencao.md) — Task 0 + A1–A6 feitas |
| [x] | **Fase B:** Colapso de RTT e Batching (redução drástica de idas ao PostgREST) | [`02-tasks-fase-b-rtt-batching.md`](./02-tasks-fase-b-rtt-batching.md) — Task 0 + B1–B6 feitas |
| [x] | **Fase C:** Escala, Middleware e Observabilidade (proteção L7 e DB pooler para hotspots) | [`03-tasks-fase-c-escala-obs.md`](./03-tasks-fase-c-escala-obs.md) — Task 0 + C1–C7 feitas (código); preview cold-start opcional |
| [x] | **Testes k6:** Plano de Testes de Estresse e Carga (baseline e thresholds) | [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md) — C1–C6 + turma-30; baseline lab `measured` |

```text
[ Plano Arquitetural ]
         │
         ▼
[ 00 Master Plan ] ──► A (feita) ──► B (feita) ──► C (feita)
         │                                    ▲
         └──────────► 04 k6 (measured lab) ───┘
```

---

## Resumo do Roadmap de Execução

A implementação deve seguir a prioridade abaixo para mitigar os gargalos mais críticos (**G1, G2, G3 e G4**) o mais rápido possível:

| Prioridade | Fase | Foco principal | Gargalos resolvidos | Estado |
| --- | --- | --- | --- | --- |
| **P0 / P1** | **Fase A** | Cache de `lesson_gates`, rate limit no Redis/KV, `scrypt` async, purge de sessions fora do login, instrumentação de RTT | G1 (parcial), G3, G4, G5, G6 | **Feita** |
| **P1** | **Fase B** | RPC `stateSync`, `session-bootstrap` unificado | G1 (final), G8 | **Feita** |
| **P2** | **Fase B / C** | Leaderboard em SQL paginado, batching na UI de aula | G2, G7 | **Feita** |
| **P3** | **Fase C** | Edge Middleware (teto IP), refatoração de monólitos JS, pooler em hotspots se necessário | G9 (+ endurecimento L7) | **Feita** (pooler flag off) |

### Ordem congelada de entrega

1. ~~Fechar **Fase A**~~ ✓  
2. ~~Publicar **doc `04` (k6)** e arquivar **baseline**~~ ✓ lab 2026-09-22  
3. ~~Mesclar **Fase B** na `main`~~ ✓  
4. ~~**Fase C**~~ ✓ código C1–C7; evidência pooler/snapshot só se regressão em preview  

---

## Regras para o Desenvolvimento

### Testabilidade

- Nenhuma tarefa da **Fase B** pode ser mesclada na `main` sem que os testes de carga do **k6** (detalhados no doc `04`) tenham estabelecido o **baseline** do ambiente.  
- Smokes unitários/integrados do repo (`tests/*-smoke.mjs`) continuam obrigatórios por PR; k6 é o gate de **capacidade**, não substituto dos smokes.

### Autoridade

- Sob **nenhuma hipótese** as lógicas de validação de progresso (XP, conquistas, sync Despertar) devem ser movidas para o cliente (`js/api.js` / stores locais).
- A validação server-side deve ser **otimizada** via SQL/RPC, cache de dependências e menos RTT — **nunca removida**.

### Migrações

- Quaisquer mudanças no banco (RPCs, views, índices novos, jobs) devem constar na pasta [`db/`](../../db/) do projeto e passar por `npm run db:migrate`.
- A Fase A **não exige** RPC nova; se surgir tabela auxiliar de telemetria/cron, ainda assim vai em `db/migrate-*.sql`.

### Persistência de limites e cache

- Rate limits de jogo (Despertar sync, Juízo, underworld) **não** podem depender só de `Map` em memória do isolate.
- Preferir store compartilhado já alinhado ao deploy Vercel: **`@vercel/kv`** (Upstash) ou cliente Redis Upstash equivalente. Auth login/register permanece no modelo DB (`auth_rate_events`) salvo decisão explícita em contrário.
- Política de falha do KV deve ser **documentada por rota** (fail-open com teto local vs fail-closed) — ver Task 0 da Fase A.

### API e Edge

- Manter `Cache-Control: no-store` em `/api/*` mutáveis (`vercel.json`), salvo política explícita por rota GET segura (Fase C / assets).
- Edge Middleware (teto IP) é **Fase C**, não A — na A o foco é KV no handler Node.

### Escopo explícito fora deste guia

- Migrar para Supabase Auth / IdP.  
- Multi-região ativa-ativa.  
- Cache CDN de POST autenticado.  
- Relaxar validação authoritative de XP.

---

## Como extrair p95 das métricas (prep doc `04` / k6)

Logs estruturados emitidos pelos handlers (`auth`, `progress`, `despertar`):

```text
[metrics] request_id=… route=despertar action=stateSync duration_ms=142 db_round_trips=5 gate_cache=hit rate_limit_backend=kv cold=0 status=200
```

Campos (sem PII): `request_id`, `route`, `action`, `duration_ms`, `db_round_trips`, `gate_cache` (`hit|miss|bypass|n/a`), `rate_limit_backend` (`kv|memory|db|n/a`), `scrypt_ms` (auth), `cold`, `status`.

**Baseline (arquivado):**

1. Lab: C1 smoke + turma-30 → [`BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) / [`TURMA-30.md`](../load-results/TURMA-30.md).  
2. Opcional: repetir em preview Vercel e anexar cold start.  
3. Helper de parse: `parseMetricsLine` em `api/_lib/request-metrics.js` (smoke A6).

## Definition of Done por fase (resumo)

| Fase | DoD resumido | Estado |
| --- | --- | --- |
| **A** | Sync/Juízo/underworld limitados cross-isolate; gate com hit de cache no path quente; login sem purge global; `scrypt` async; logs com `db_round_trips` / `duration_ms` | **Feito** |
| **B** | `stateSync` típico ≤ 2–3 RTT (ideal 1 RPC); boot página ≤ 1 round-trip sessão+perfil; baseline k6 comparado e p95 dentro do limiar | **Feito** |
| **C** | Teto IP no Edge; observabilidade/alertas de conexão; monólitos fatiados ou cold start medido ↓; pooler só se RPC insuficiente | **Feito** (código; cold-start preview opcional) |
| **k6** | Cenários C1–C6 versionados; baseline arquivado com commit + data; thresholds como gate de release | **Feito** (lab `measured`) |

---

## Como usar estes documentos

1. Abrir o doc da fase.  
2. Congelar **Task 0** (decisões) antes de codar.  
3. Executar tasks na ordem; marcar checklists.  
4. Cumprir **Aceite** da task + smokes listados.  
5. Atualizar o índice deste Master Plan (`[x]` / `[ ]`) quando o **doc da fase** estiver completo e o **DoD da fase** fechado.

---

## Referências rápidas

| Artefato | Caminho |
| --- | --- |
| Plano arquitetural (gargalos G1–G10) | [`docs/plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md) |
| Ops já fechado (auth rate DB, TTL sessions, batch gates) | [`docs/plano-ops-nav-email-perf-admin.md`](../plano-ops-nav-email-perf-admin.md) |
| Client Supabase | [`api/supabaseClient.js`](../../api/supabaseClient.js) |
| Gate Despertar | [`api/_lib/despertar-gate.js`](../../api/_lib/despertar-gate.js) |
| Rate sync / Juízo | `api/_lib/rate-limit-kv.js` + `api/despertar.js` | KV + degradê memória (Fase A) |
| Auth scrypt | `api/auth.js` | async (Fase A) |
| Sessions / purge | `api/_lib/sessions.js` + `api/cron/sessions-purge.js` | fora do hot path (Fase A) |
| Métricas | `api/_lib/request-metrics.js` | `[metrics]` prep k6 (Fase A) |
| Fase B (RTT) | [`02-tasks-fase-b-rtt-batching.md`](./02-tasks-fase-b-rtt-batching.md) | Task 0+B1–B6; contratos [`contratos-fase-b.md`](./contratos-fase-b.md) |
| Fase C (escala) | [`03-tasks-fase-c-escala-obs.md`](./03-tasks-fase-c-escala-obs.md) | Task 0+C1–C7 |
| k6 / baseline | [`04-tasks-k6-carga.md`](./04-tasks-k6-carga.md) · [`docs/load-results/`](../load-results/) | **measured** `8b67ad6` / 2026-09-22 |
| Deploy limits | [`vercel.json`](../../vercel.json) | 256 MB, 10 s, cron purge + warmup |
