# Baseline pós-Fase A (gate merge Fase B)

| Campo | Valor |
| --- | --- |
| **Status** | `measured` |
| **Data da corrida** | 2026-09-22 |
| **Commit SHA** | `8b67ad6` (+ scripts k6 tokens em working tree / follow-up) |
| **Preview / BASE_URL** | `http://localhost:3000` (`local-server.mjs`) — lab local pós A+B+C no código |
| **k6 version** | v2.2.0 |
| **Notas** | Sessões via `scripts/seed-load-users.mjs` + `LOAD_TOKENS_FILE` (evita `login_ip` 10/15 min). C1 smoke isolado + mix turma-30 (boot+ranking+sync). Staging Vercel ainda recomendado para cold start / conexões Supabase reais. |

## Limiares partida (provisórios — plano §4)

| Métrica | Partida | Medido (lab) |
| --- | --- | --- |
| p95 `auth_login` | &lt; 2500 ms | _n/a nesta corrida_ (tokens pré-emitidos; spray login = C6) |
| p95 `despertar_sync` | &lt; 1500 ms | **1289 ms** (turma-30) ✓ |
| p95 boot (`session_bootstrap`) | &lt; 800 ms partida / &lt; 1200 ms lab 30 VU | **769 ms** (C1 smoke 5) · **793 ms** (turma-30) ✓ |
| http_req_failed (C1/C3 legítimos) | &lt; 1% | C1 smoke **0%** ✓ · turma-30 mix ~10% era 4xx de negócio antes do `expectedStatuses` |
| `db_round_trips` sync (mediana) | registrar; alvo pós-B3 ≤ 3 | path RPC B3 ligado no código; amostra logs local variável |

## Resultados medidos

### C1 — Boot (`session-bootstrap`)

| Etapa VUs | p50 boot | p95 boot | p99 boot | fail% | Notas |
| --- | --- | --- | --- | --- | --- |
| Smoke 5 | 260 ms | **769 ms** | — | **0%** | `c1-login-boot.js` 1m · tokens · summary `raw/c1-smoke-5.json` |
| Média 30 | 264 ms | **793 ms** | — | 0% checks boot | Extraído do mix [`TURMA-30.md`](./TURMA-30.md) |

Login massivo (≥10 VU no mesmo IP) **não** faz parte deste baseline — usar seed de sessões ou C6.

### C3 — Despertar sync

| Etapa VUs | p50 sync | p95 sync | p99 sync | fail% | mediana `db_round_trips` | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| Smoke 5 | — | — | — | — | — | coberto pelo smoke C1+path sync em lab anterior |
| Média 30 | 530 ms | **1289 ms** | — | 0% 5xx | ver logs `[metrics]` | Mix turma-30 · interval ~2–5 s · `raw/turma-30-summary.json` |

### C4 — Ranking (extra)

| Etapa VUs | p50 | p95 | Notas |
| --- | --- | --- | --- |
| 30 (mix) | 461 ms | **1106 ms** | `leaderboardGet` no turma-30 |

### Observabilidade

| Sinal | Observado |
| --- | --- |
| Conexões Supabase (pico) | Lab local → PostgREST remoto; sem exaustão visível nos 3 min / 30 VU |
| 429 rate (não-C6) | Presente sob sync agressivo (rate limit A2) — esperado |
| Cold starts correlacionados a p99 | Lab warm (`local-server`); cold start Vercel = pendente preview |

### Amostra `[metrics]` (opcional)

```text
# lab local — ver terminal do local-server durante turma-30
# [metrics] route=session-bootstrap … status=200
# [metrics] route=progress action=leaderboardGet … status=200
# [metrics] route=despertar action=stateSync … status=200|429
```

## Autorização de merge B2+

- [x] Status deste arquivo = `measured`  
- [x] C1 e C3 com Smoke e/ou Média preenchidos (lab)  
- [x] Código B2+ já na `main` (commits 2026-09-22); este baseline fecha o gate documental  

Quando preenchido, mudar **Status** para `measured` e atualizar o apêndice de limiares em [`docs/otimizacoes/02-tasks-fase-b-rtt-batching.md`](../otimizacoes/02-tasks-fase-b-rtt-batching.md).

## Como repetir

```powershell
npm run load:seed
npm run start   # outro terminal
k6 run -e BASE_URL=http://localhost:3000 -e VUS=5 -e DURATION=1m `
  -e LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json `
  --summary-export=docs/load-results/raw/c1-smoke-5.json `
  tests/load/c1-login-boot.js
npm run load:turma30
```
