# Testes k6 — Estresse e Carga (doc 04)

> **Master Plan:** [`00-master-plan.md`](./00-master-plan.md)  
> **Base:** [`plano-arquitetura-performance-escalabilidade.md`](../plano-arquitetura-performance-escalabilidade.md) §4  
> **Gate:** obrigatório **antes** de merge na `main` das tasks B2–B6  
> **Contratos Fase B:** [`contratos-fase-b.md`](./contratos-fase-b.md)  
> **Resultados:** [`docs/load-results/`](../load-results/)  
> **Estado do documento:** pronto para execução  
> **Baseline pós-A:** slot em [`docs/load-results/BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) — preencher números após corrida em staging

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
| Alvo | Preview/staging Vercel + Supabase de staging (nunca produção na 1ª corrida) |
| Base URL | `BASE_URL` (ex. `https://….vercel.app`) — sem barra final |
| Credenciais | `LOAD_USER_PREFIX`, `LOAD_PASSWORD` ou lista `LOAD_TOKENS_JSON` — **só env**, nunca commit |
| Seeds | Criar N alunos de load via admin/script offline; não misturar com turma real |
| Observabilidade | Logs `[metrics]` (A6) + dashboard Supabase (conexões) + Vercel function duration |

Variáveis documentadas em [`docs/load-results/README.md`](../load-results/README.md) e espelhadas nos scripts `tests/load/*.js`.

---

## 3. Cenários

| ID | Nome | Ações | Duração típica | Estágio mínimo B1 |
| --- | --- | --- | --- | --- |
| **C1** | Abertura de turma | `POST /api/auth` login → `GET` bootstrap **ou** auth+progress | 2–5 min | **Obrigatório** |
| **C2** | Aula ativa | `lessonView` / paragraphs (progress) | 10–15 min | Recomendado |
| **C3** | Despertar lab | `stateSync` dirty 5–15 s | 10–15 min | **Obrigatório** |
| **C4** | Ranking | `leaderboardGet` | 5 min | Pós-B5 |
| **C5** | ClassInd degradado | poll fallback | curto | Fase C / ops |
| **C6** | Abuso | sync acima do limite / login spray | controlado | Após C1/C3 verdes |

### Dimensão de VUs (partida — calibrar)

| Etapa | VUs | Critério preliminar |
| --- | --- | --- |
| Smoke | 5 | 0× 5xx; p95 rotas leves &lt; 800 ms |
| Aula média | 30 | p95 sync &lt; 1,5 s; erros &lt; 1% |
| Pico turma | 60–80 | p95 login &lt; 2,5 s; sem exaustão de conexões |
| Stress | 120+ | 429 graceful; sem cascata 5xx |

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

### Thresholds k6 (esqueleto)

```js
thresholds: {
  http_req_failed: ['rate<0.01'],
  'http_req_duration{name:auth_login}': ['p(95)<2500'],
  'http_req_duration{name:despertar_sync}': ['p(95)<1500'],
  'http_req_duration{name:session_bootstrap}': ['p(95)<800'],
}
```

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
| [`tests/load/lib/config.js`](../../tests/load/lib/config.js) | env / defaults |
| [`tests/load/lib/auth.js`](../../tests/load/lib/auth.js) | login helper |

**Runbook (incidentes + alertas + onboarding):** [`docs/load-results/RUNBOOK-CAPACIDADE.md`](../load-results/RUNBOOK-CAPACIDADE.md).

### Como rodar (local → staging)

```bash
# Requer k6 instalado: https://k6.io/docs/get-started/installation/
export BASE_URL="https://seu-preview.vercel.app"
export LOAD_USERNAME="load_aluno_01"
export LOAD_PASSWORD="…"

k6 run tests/load/c1-login-boot.js
k6 run tests/load/c3-despertar-sync.js
k6 run tests/load/c4-ranking.js
# opcional:
# k6 run tests/load/c5-classind-poll.js
# k6 run tests/load/c6-abuse.js
```

Smoke estático (sem k6/binário):

- C1–C3 + doc: `node tests/ops-perf-fase-b-contracts-smoke.mjs`
- Runbook + C4–C6 (Fase C / C2): `node tests/ops-perf-fase-c-obs-smoke.mjs`

---

## 6. Metodologia de baseline pós-A

1. Confirmar Fase A em preview (KV opcional; métricas A6 ligadas).  
2. Smoke k6 (5 VUs) C1 + C3 — zero 5xx.  
3. Corrida **Aula média** (30 VUs) C1 depois C3 — **uma variável por vez**.  
4. Exportar summary JSON do k6 (`--summary-export`).  
5. Amostrar 50+ linhas `[metrics]` `action=stateSync` / `login` dos logs Vercel → mediana `db_round_trips`, p95 aproximado.  
6. Preencher [`docs/load-results/BASELINE-POST-A.md`](../load-results/BASELINE-POST-A.md) (data, commit SHA, URL preview, tabelas).  
7. Atualizar apêndice de limiares em [`02-tasks-fase-b-rtt-batching.md`](./02-tasks-fase-b-rtt-batching.md).  
8. Só então autorizar merge de B2+ na `main`.

### Comparação pós-B3

- Mesma `BASE_URL` class / mesma seed de VUs / mesmo script C3.  
- Regressão se: p95 sync ↑ vs baseline **ou** mediana `db_round_trips` sync &gt; 3 com `DESPERTAR_SYNC_RPC=1`.

---

## 7. Checklist do doc 04

- [x] Cenários C1–C6 descritos; C1+C3 obrigatórios para baseline; C4–C6 scripts na Fase C / C2  
- [x] Pasta `tests/load/` com esqueletos C1–C6  
- [x] Secrets só via env (documentado)  
- [x] Slot `docs/load-results/BASELINE-POST-A.md`  
- [x] Runbook `docs/load-results/RUNBOOK-CAPACIDADE.md` (Fase C / C2)  
- [ ] Corrida staging executada e números preenchidos (**ops**)  
- [x] C4–C6 scripts versionados (ranking / ClassInd poll / abuso)  

---

## 8. Definition of Done (doc 04 + baseline)

Doc 04 está **operacional** quando:

- [x] Este documento + scripts C1–C3 versionados  
- [ ] `BASELINE-POST-A.md` com status `measured` e tabelas numéricas  
- [ ] Master Plan aponta o SHA/data do baseline  

Gate de merge B2+: baseline `measured` + referência no PR.

---

*Scripts k6 são esqueletos executáveis; calibrar VUs/thresholds após a primeira corrida real.*
