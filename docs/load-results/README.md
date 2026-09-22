# Load results — baselines de capacidade

Artefatos de corridas k6 / amostragem `[metrics]` para o gate da Fase B.

| Arquivo | Significado |
| --- | --- |
| [`BASELINE-POST-A.md`](./BASELINE-POST-A.md) | Baseline **após Fase A**, **antes** de merge B2+ |
| [`RUNBOOK-CAPACIDADE.md`](./RUNBOOK-CAPACIDADE.md) | Runbook Fase C / C2 — incidentes, alertas, como rodar C1+C3+C4 |
| [`COLD-START-PROGRESS-C3.md`](./COLD-START-PROGRESS-C3.md) | Nota cold start pós-split `progress` (C3) |
| [`WARMUP-C7.md`](./WARMUP-C7.md) | Cron warmup C7 — janela pré-aula |
| [`TURMA-30.md`](./TURMA-30.md) | Stress k6 ~30 alunos (boot + ranking + sync) |
| `BASELINE-POST-B.md` | (criar após B3/B5) comparação A/B |

## Env para k6 (nunca commitar valores)

```bash
BASE_URL=https://seu-preview.vercel.app
LOAD_USERNAME=load_aluno_01
LOAD_PASSWORD=
# Alternativa: JSON array de tokens já válidos
# LOAD_TOKENS_JSON=["token1","token2"]
```

## Como arquivar uma corrida

1. `k6 run --summary-export=docs/load-results/raw/c3-YYYYMMDD.json tests/load/c3-despertar-sync.js`  
2. Colar p95/p99 e taxas de erro na tabela do `BASELINE-*.md`.  
3. Anotar commit SHA (`git rev-parse --short HEAD`) e URL do preview.  
4. Opcional: colar 5–10 linhas `[metrics]` anonimizadas (sem token).  

Pasta `raw/` pode ser gitignored se os JSON forem grandes — o markdown resumido deve permanecer versionado.
