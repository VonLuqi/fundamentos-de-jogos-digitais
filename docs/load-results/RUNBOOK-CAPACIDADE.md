# Runbook de capacidade — Fundamentos de Jogos Digitais

> **Fase C / Task C2** · Master: [`docs/otimizacoes/00-master-plan.md`](../otimizacoes/00-master-plan.md)  
> **k6:** [`docs/otimizacoes/04-tasks-k6-carga.md`](../otimizacoes/04-tasks-k6-carga.md) · scripts em [`tests/load/`](../../tests/load/)  
> **Limiares DoD C:** apêndice em [`03-tasks-fase-c-escala-obs.md`](../otimizacoes/03-tasks-fase-c-escala-obs.md)  
> **Baseline:** [`BASELINE-POST-A.md`](./BASELINE-POST-A.md) (preencher até `measured`)

Este runbook é o caminho para um membro novo medir capacidade, interpretar `[metrics]` e reagir a exaustão de conexões / abuso — **sem** mover autoridade de jogo para o cliente.

---

## 1. Onde mirar (sinais)

| Sinal | Onde | O que indica |
| --- | --- | --- |
| `[metrics] … duration_ms=… db_round_trips=… cold=0\|1 status=…` | Logs Vercel (Functions) | Latência, RTT PostgREST, cold start, status |
| `rate_limit_backend=kv\|memory` | `[metrics]` Despertar / underworld | Contenção Fase A; `memory` + `rate_limit_degraded` = KV off |
| `edge_rate_degraded=1` / header `x-edge-rate-degraded` | Logs Edge / resposta | Middleware C1 sem KV (fail-open) |
| Conexões / `waiting` | Supabase → Database → Reports / Metrics | Pooler saturando (gatilho C5) |
| `too many connections` / 5xx em massa | Logs API + Supabase | Incidente de capacidade (ver §3) |
| Function duration / cold starts | Vercel → Observability | Cold correlacionado a p99 login/boot |
| 429 legítimo vs abuso | k6 C1–C3 vs C6 | Pico turma ≈ 0× 429; abuso ≥ 95% 429 |

Formato tipico A6:

```text
[metrics] request_id=… route=despertar action=stateSync duration_ms=142 db_round_trips=5 gate_cache=hit rate_limit_backend=kv cold=0 status=200
```

Sem PII / token nos pastes versionados.

---

## 2. Checklist dashboards (partida — manual)

Copiar para o dia da aula / corrida de carga:

### Supabase (staging primeiro)

- [ ] Project → **Database** → conexões ativas vs `max_connections` / pooler  
- [ ] Sem fila longa de **waiting** sob C1+C3 (30 VUs)  
- [ ] Sem erro recorrente `too many connections` nos logs  
- [ ] API health (PostgREST) sem 5xx em rajada  

### Vercel

- [ ] Preview/Production da URL sob teste (`BASE_URL`)  
- [ ] Functions: duração p95 das rotas `auth`, `progress`, `despertar`  
- [ ] Cold starts no minuto 0 da corrida (correlacionar com p99 login)  
- [ ] Warmup C7 rodou 15–30 min antes (`/api/cron/warmup` + `CRON_SECRET`) — ver [`WARMUP-C7.md`](./WARMUP-C7.md)  
- [ ] KV / Upstash provisionado em Preview se quiser medir path KV (não memória)  
- [ ] Middleware C1 ativo (spray C6 deve 429 cedo)  

### Repo / local

- [ ] `git rev-parse --short HEAD` anotado no baseline  
- [ ] Seeds `LOAD_USERNAME` / `LOAD_PASSWORD` só em env  
- [ ] k6 instalado ([install](https://k6.io/docs/get-started/installation/))

---

## 3. Incidente: conexões altas / waiting

**Sintomas:** p95 sync/login sobe; 5xx; logs `too many connections`; Supabase waiting ↑; alunos “travados” no boot.

**Passos (ordem):**

1. **Confirmar ambiente** — staging vs prod; não “otimizar” prod às cegas.  
2. **Cortar spray** — se for abuso, Edge C1 / WAF / rate limit A2 devem 429; não reiniciar DB como primeiro passo.  
3. **Reduzir carga** — baixar VUs da corrida ou pedir pausa de sync agressivo na turma (Despertar dirty ≥ 5–15 s).  
4. **Checar flags** — `DESPERTAR_SYNC_RPC=1` + migration B3 aplicada? Sem RPC, RTT explode (ver baseline B).  
5. **KV** — se `rate_limit_backend=memory` em todos os isolates, provisionar KV (contenção cross-isolate).  
6. **Pooler** — só se métricas mostram approaching max **com** RPC B ligadas → avaliar Task **C5** (`DESPERTAR_PG_POOL`, Transaction mode 6543). **Nunca** usar `DATABASE_URL` Session de migrate no runtime.  
7. **Registrar** — data, SHA, URL, pico de conexões, 5 linhas `[metrics]` anonimizadas em `docs/load-results/` (nota ou baseline).  

**Não fazer:** abrir Direct PG sem pooler; cachear POST autenticado; relaxar `validateSync` no cliente.

---

## 4. Como rodar C1 + C3 + C4 (novo membro)

```bash
# Secrets só via env — ver README desta pasta
export BASE_URL="https://seu-preview.vercel.app"
export LOAD_USERNAME="load_aluno_01"
export LOAD_PASSWORD="…"

# Smoke (5 VUs)
k6 run -e VUS=5 -e DURATION=2m tests/load/c1-login-boot.js
k6 run -e VUS=5 -e DURATION=5m tests/load/c3-despertar-sync.js
k6 run -e VUS=5 -e DURATION=3m tests/load/c4-ranking.js

# Opcional: ClassInd poll / abuso
# k6 run tests/load/c5-classind-poll.js
# k6 run tests/load/c6-abuse.js
```

Arquivar:

```bash
k6 run --summary-export=docs/load-results/raw/c4-YYYYMMDD.json tests/load/c4-ranking.js
```

Preencher tabelas em [`BASELINE-POST-A.md`](./BASELINE-POST-A.md) (e, pós-B, `BASELINE-POST-B.md`). Atualizar coluna **Medido** do apêndice DoD C no doc `03`.

Smoke **sem** binário k6 (CI):

```bash
node tests/ops-perf-fase-c-obs-smoke.mjs
```

---

## 5. Tabela de alertas (partida)

Alertas **manuais** no dia 1 — automatizar depois (Axiom/OTel opcional, não bloqueia).

| ID | Condição (partida) | Severidade | Ação |
| --- | --- | --- | --- |
| A1 | Taxa 5xx &gt; 0,5% em C1/C3 (não-C6) | P0 | Parar corrida; ver §3; checar deploy |
| A2 | Conexões Supabase approaching max **ou** waiting sustentado | P0 | Reduzir carga; evidência para C5 |
| A3 | p95 `despertar_sync` &gt; 1,5 s (30 VUs) | P1 | Amostrar `[metrics]` RTT; RPC B3? |
| A4 | p95 `auth_login` &gt; 2,5 s | P1 | Cold start / scrypt; warmup C7? |
| A5 | p95 `leaderboardGet` &gt; 800 ms pós-B5 | P2 | Evidência para snapshot C4 |
| A6 | 429 em C1–C3 legítimo (pico turma) | P1 | Revisar Edge D2 / KV degradê |
| A7 | C6: &lt; 95% 429 sob spray | P1 | Middleware C1 / matcher / KV |
| A8 | `cold=1` ratio progress sem ↓ pós-C3 split | P2 | Revisar Task C3 |
| A9 | `rate_limit_degraded` / `edge_rate_degraded` contínuo em Preview “oficial” | P2 | Provisionar KV |

---

## 6. Ligação ao DoD Fase C

| Item DoD C | Evidência neste runbook |
| --- | --- |
| Edge teto IP | C6 + A7; middleware em Preview |
| Runbook + C4–C6 | Este arquivo + `tests/load/c4|c5|c6-*.js` |
| Cold start / split | A8 + logs A6 |
| Snapshot / pooler | A5 / A2 → só com `measured` |
| k6 pico graceful | A1 + A6 |

Limiares numéricos preenchíveis: apêndice do doc [`03-tasks-fase-c-escala-obs.md`](../otimizacoes/03-tasks-fase-c-escala-obs.md).
