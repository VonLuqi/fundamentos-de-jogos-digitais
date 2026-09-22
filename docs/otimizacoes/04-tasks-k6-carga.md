# Testes k6 — Estresse e Carga (doc 04)

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md) §4  
> **Gate:** obrigatório **antes** de merge na `main` das tasks B2–B6  
> **Contratos Fase B:** [`contratos-fase-b.md`](./contratos-fase-b.md)  
> **Resultados:** [`docs/load-results/`](../load-results/)  
> **Estado do documento:** **fechado (lab measured)** — 2026-09-22 · SHA `8b67ad6`  
> **Baseline pós-A:** [`BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) status `measured`  
> **Baseline pós-B / turma-30:** [`BASELINE-POST-B.md`](../load-results/BASELINE-POST-B.md) · [`TURMA-30.md`](../load-results/TURMA-30.md)

---

## 1. Objetivos

1. Medir capacidade com alunos virtuais (login → dashboard/boot → aula → Despertar).  
2. Detectar exaustão de conexões / saturação PostgREST antes da sala real.  
3. Validar rate limits compartilhados (Fase A) sem falsos positivos no uso legítimo.  
4. Arquivar **baseline pós-A** e, depois, comparar **pós-B** (mesma seed de VUs).

---

## 2. Ambientes e segredos

| Item | Regra |
| --- | --- |
| Alvo | Preview/staging Vercel + Supabase de staging (nunca produção na 1ª corrida); **lab local** aceito para fechar gate documental |
| Base URL | `BASE_URL` (ex. `https://….vercel.app` ou `http://localhost:3000`) — sem barra final |
| Credenciais | Preferir **`LOAD_TOKENS_FILE`** (sessões pré-emitidas) para VUs ≥ 10 — evita rate limit `login_ip` (10/15 min) |
| Alternativa | `LOAD_USERNAME` + `LOAD_PASSWORD` só para smoke ≤ 5–8 VUs |
| Seeds | `npm run load:seed` → `docs/load-results/raw/turma-tokens.json` (**gitignored**) |
| Observabilidade | Logs `[metrics]` (A6) + dashboard Supabase (conexões) + Vercel function duration |

Variáveis em [`docs/load-results/README.md`](../load-results/README.md).

**Path do `open()` no k6:** relativo ao módulo que chama `open`. Scripts C1–C5 usam `tests/load/lib/tokens.js` →  
`LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json`.  
`c-turma-30.js` abre o arquivo no próprio script → `../../docs/load-results/raw/turma-tokens.json`.

---

## 3. Cenários

| ID | Nome | Ações | Duração típica | Estágio mínimo B1 |
| --- | --- | --- | --- | --- |
| **C1** | Abertura de turma | token/login 1×/VU → `session-bootstrap` | 2–5 min | **Obrigatório** |
| **C2** | Aula ativa | `lessonView` / paragraphs (progress) | 10–15 min | Recomendado |
| **C3** | Despertar lab | `stateSync` dirty 5–15 s | 10–15 min | **Obrigatório** |
| **C4** | Ranking | `leaderboardGet` | 5 min | Pós-B5 |
| **C5** | ClassInd degradado | poll fallback | curto | Fase C / ops |
| **C6** | Abuso | sync acima do limite / login spray | controlado | Após C1/C3 verdes |
| **Turma-30** | Mix realista | bootstrap + ranking + sync | 3 min / 30 VU | Stress sala |

### Dimensão de VUs (partida — calibrar)

| Etapa | VUs | Critério preliminar | Lab 2026-09-22 |
| --- | --- | --- | --- |
| Smoke | 5 | 0× 5xx; p95 rotas leves &lt; 800 ms | C1 boot p95 **769 ms** ✓ |
| Aula média | 30 | p95 sync &lt; 1,5 s; erros &lt; 1% | sync p95 **1289 ms** ✓ |
| Pico turma | 60–80 | p95 login &lt; 2,5 s; sem exaustão de conexões | _pending preview_ |
| Stress | 120+ | 429 graceful; sem cascata 5xx | _pending_ |

---

## 4. Métricas e thresholds (partida)

| Métrica | Ferramenta | Limite partida |
| --- | --- | --- |
| RPS / rota | k6 | desvio &gt; 2× do esperado → investigar |
| p50 / p95 / p99 | k6 | p95 sync &gt; 1,5 s; p99 login &gt; 3 s |
| Erros 5xx | k6 | &gt; 0,5% falha |
| 429 | k6 | só C6 ou acima do orçamento legítimo |
| `db_round_trips` | logs `[metrics]` | pós-B3: mediana sync ≤ 3 |
| `scrypt_ms` | logs auth | calibrar p99 |
| Conexões PG | Supabase | não atingir max / waiting |

Scripts C1–C5 tratam 400/403/409/429 como **esperados** em `http.setResponseCallback` (não inflar `http_req_failed`).

---

## 5. Scripts no repositório

| Arquivo | Cenário |
| --- | --- |
| [`tests/load/c1-login-boot.js`](../../tests/load/c1-login-boot.js) | C1 |
| [`tests/load/c2-aula.js`](../../tests/load/c2-aula.js) | C2 |
| [`tests/load/c3-despertar-sync.js`](../../tests/load/c3-despertar-sync.js) | C3 |
| [`tests/load/c4-ranking.js`](../../tests/load/c4-ranking.js) | C4 |
| [`tests/load/c5-classind-poll.js`](../../tests/load/c5-classind-poll.js) | C5 |
| [`tests/load/c6-abuse.js`](../../tests/load/c6-abuse.js) | C6 |
| [`tests/load/c-turma-30.js`](../../tests/load/c-turma-30.js) | Mix ~30 alunos |
| [`tests/load/lib/config.js`](../../tests/load/lib/config.js) | env / defaults |
| [`tests/load/lib/auth.js`](../../tests/load/lib/auth.js) | login helper |
| [`tests/load/lib/tokens.js`](../../tests/load/lib/tokens.js) | `LOAD_TOKENS_FILE` / SharedArray |

**npm:** `load:seed` · `load:c1` · `load:c3` · `load:c4` · `load:turma30`

**Runbook:** [`docs/load-results/RUNBOOK-CAPACIDADE.md`](../load-results/RUNBOOK-CAPACIDADE.md).

### Como rodar (local → staging)

```powershell
npm run load:seed
npm run start   # outro terminal

# C1 smoke
k6 run -e BASE_URL=http://localhost:3000 -e VUS=5 -e DURATION=1m `
  -e LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json `
  tests/load/c1-login-boot.js

# C3 / ranking / mix
npm run load:c3
npm run load:c4
npm run load:turma30
```

Smoke estático (sem binário k6):

- C1–C3 + doc: `node tests/ops-perf-fase-b-contracts-smoke.mjs`
- Runbook + C4–C6: `node tests/ops-perf-fase-c-obs-smoke.mjs`

---

## 6. Metodologia de baseline pós-A

1. Confirmar Fase A (+ B/C no código) em lab ou preview.  
2. `npm run load:seed` (selo + gate Despertar publicado).  
3. Smoke k6 (5 VUs) C1 — zero 5xx.  
4. Corrida **Aula média** (30 VUs) — `load:turma30` ou C1+C3.  
5. Exportar `--summary-export` em `docs/load-results/raw/` (gitignored).  
6. Preencher [`BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) → status `measured`.  
7. Atualizar apêndice em [`02-tasks-fase-b-rtt-batching.md`](./02-tasks-fase-b-rtt-batching.md).  
8. Opcional: repetir em preview Vercel para cold start.

### Comparação pós-B3

- Mesma seed de VUs / scripts C3 ou turma-30.  
- Regressão se: p95 sync ↑ vs baseline **ou** mediana `db_round_trips` sync &gt; 3 com RPC ligada.

---

## 7. Checklist do doc 04

- [x] Cenários C1–C6 descritos; C1+C3 obrigatórios; C4–C6 + turma-30  
- [x] Pasta `tests/load/` com scripts executáveis + `lib/tokens.js`  
- [x] Secrets só via env / raw gitignored  
- [x] Slot `BASELINE-POST-A.md` **preenchido (`measured`)**  
- [x] Runbook `RUNBOOK-CAPACIDADE.md`  
- [x] Corrida lab executada e números preenchidos (2026-09-22)  
- [x] C4–C6 scripts versionados  
- [ ] Corrida **preview Vercel** (cold start) — ops opcional / não bloqueia DoD lab  

---

## 8. Definition of Done (doc 04 + baseline)

Doc 04 está **operacional** quando:

- [x] Este documento + scripts C1–C6 (+ turma-30) versionados  
- [x] `BASELINE-POST-A.md` com status `measured` e tabelas numéricas  
- [x] Master Plan aponta SHA/data do baseline (`8b67ad6` / 2026-09-22)  

Gate de merge B2+: **cumprido** (código B já em `main`; baseline lab arquivado).

---

*Calibrar VUs/thresholds em preview após a primeira corrida Vercel; lab local fecha o gate documental.*
