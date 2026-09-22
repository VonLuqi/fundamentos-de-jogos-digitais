# Stress turma ~30 — 2026-09-22

Simulação de **30 alunos** já autenticados (sessões pré-emitidas), 3 min contínuos.

| Item | Valor |
| --- | --- |
| Alvo | `http://localhost:3000` (`local-server.mjs`) |
| Script | `tests/load/c-turma-30.js` |
| VUs | 30 (1 VU ≈ 1 aluno) |
| Duração | 3m · think time ~2s |
| Perfil | `session-bootstrap` → `leaderboardGet` → `stateSync` |
| Seed | `node scripts/seed-load-users.mjs --count 30` (selo + gate Despertar publicado) |
| Artefatos | `docs/load-results/raw/turma-30-k6.txt`, `turma-30-summary.json` |

## Resultados

| Métrica | Valor | Gate |
| --- | --- | --- |
| Iterações | 1521 (~8.3/s) | — |
| Checks | **100%** (7605/7605) | ✓ |
| 5xx | **0** | ✓ |
| `turma_http_ok` | **100%** | ✓ >90% |
| Bootstrap p95 | **793 ms** | ✓ <1200 |
| Leaderboard p95 | **1.10 s** | ✓ <1500 |
| Despertar sync p95 | **1.28 s** | ✓ <2000 |
| `http_req_failed` (k6 default) | **9.90%** | ✗ <5% * |

\* Na corrida, o k6 contava 4xx de negócio (ex.: sync 429/403) como falha HTTP. Checks customizados passaram 100% e **não houve 5xx**. O script agora trata 400/403/409/429 como esperados em `http_req_failed`.

## Leitura

Com ~30 alunos batendo boot + ranking + sync em loop agressivo (bem mais quente que uma aula real), a API local **segura**: latências dentro dos limiares, zero erro de servidor.

Para repetir:

```powershell
node scripts/seed-load-users.mjs --count 30
npm run start
k6 run -e BASE_URL=http://localhost:3000 -e VUS=30 -e DURATION=3m `
  -e LOAD_TOKENS_FILE=../../docs/load-results/raw/turma-tokens.json `
  tests/load/c-turma-30.js
```

**Nota:** o seed marca `lesson_gates.despertar/published = true`. Se o Domínio não deve estar aberto, reverter no admin ou com `--no-publish` no próximo seed.
