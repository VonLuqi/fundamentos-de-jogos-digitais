# Load results — baselines de capacidade

Artefatos de corridas k6 / amostragem `[metrics]` para o gate da Fase B.

| Arquivo | Significado |
| --- | --- |
| [`BASELINE-POST-A.md`](./BASELINE-POST-A.md) | Baseline lab **measured** (2026-09-22, `8b67ad6`) |
| [`BASELINE-POST-B.md`](./BASELINE-POST-B.md) | Mix pós-B / turma-30 |
| [`RUNBOOK-CAPACIDADE.md`](./RUNBOOK-CAPACIDADE.md) | Runbook Fase C / C2 — incidentes, alertas, como rodar C1+C3+C4 |
| [`COLD-START-PROGRESS-C3.md`](./COLD-START-PROGRESS-C3.md) | Nota cold start pós-split `progress` (C3) |
| [`WARMUP-C7.md`](./WARMUP-C7.md) | Cron warmup C7 — janela pré-aula |
| [`TURMA-30.md`](./TURMA-30.md) | Stress k6 ~30 alunos (boot + ranking + sync) |

## Env para k6 (nunca commitar valores)

```bash
BASE_URL=http://localhost:3000   # ou preview Vercel
# Preferido (VUs ≥ 10): tokens pré-emitidos — path relativo a tests/load/lib/
# LOAD_TOKENS_FILE=../../../docs/load-results/raw/turma-tokens.json
LOAD_USERNAME=load_aluno_01
LOAD_PASSWORD=
```

```powershell
npm run load:seed
npm run load:c1    # requer k6 + server
npm run load:turma30
```

## Como arquivar uma corrida

1. `k6 run --summary-export=docs/load-results/raw/c3-YYYYMMDD.json tests/load/c3-despertar-sync.js`  
2. Colar p95/p99 e taxas de erro na tabela do `BASELINE-*.md`.  
3. Anotar commit SHA (`git rev-parse --short HEAD`) e URL do preview.  
4. Opcional: colar 5–10 linhas `[metrics]` anonimizadas (sem token).  

Pasta `raw/` pode ser gitignored se os JSON forem grandes — o markdown resumido deve permanecer versionado.
