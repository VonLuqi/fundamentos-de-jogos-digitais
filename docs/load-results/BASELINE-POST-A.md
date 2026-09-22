# Baseline pós-Fase A (gate merge Fase B)

| Campo | Valor |
| --- | --- |
| **Status** | `pending_staging_run` |
| **Data da corrida** | _TBD_ |
| **Commit SHA** | _TBD_ (`git rev-parse --short HEAD` no preview testado) |
| **Preview / BASE_URL** | _TBD_ |
| **k6 version** | _TBD_ |
| **Notas** | Slot criado na Task B1 (2026-09-22). Preencher após C1+C3 em staging. Até lá, limiares **partida** do plano arquitetural valem como alvo, não como medido. |

## Limiares partida (provisórios — plano §4)

Usar como critério de smoke até existir linha `measured`:

| Métrica | Partida | Fonte |
| --- | --- | --- |
| p95 `auth_login` | &lt; 2500 ms | plano / doc 04 |
| p95 `despertar_sync` | &lt; 1500 ms | plano / doc 04 |
| p95 boot (auth+progress ou bootstrap) | &lt; 800 ms | doc 04 |
| http_req_failed (C1/C3 legítimos) | &lt; 1% | doc 04 |
| `db_round_trips` sync (mediana, logs) | registrar agora; alvo pós-B3 ≤ 3 | A6 / Fase B DoD |

## Resultados medidos (preencher)

### C1 — Login + boot

| Etapa VUs | p50 login | p95 login | p99 login | fail% | Notas |
| --- | --- | --- | --- | --- | --- |
| Smoke 5 | | | | | |
| Média 30 | | | | | |

### C3 — Despertar sync

| Etapa VUs | p50 sync | p95 sync | p99 sync | fail% | mediana `db_round_trips` | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| Smoke 5 | | | | | | |
| Média 30 | | | | | | |

### Observabilidade

| Sinal | Observado |
| --- | --- |
| Conexões Supabase (pico) | |
| 429 rate (não-C6) | |
| Cold starts correlacionados a p99 | |

### Amostra `[metrics]` (opcional)

```text
# colar linhas sem token/PII
```

## Autorização de merge B2+

- [ ] Status deste arquivo = `measured`  
- [ ] C1 e C3 com pelo menos Smoke + Média preenchidos  
- [ ] PR B2+ cita este path + SHA  

Quando preenchido, mudar **Status** para `measured` e atualizar o apêndice de limiares em [`docs/otimizacoes/02-tasks-fase-b-rtt-batching.md`](../otimizacoes/02-tasks-fase-b-rtt-batching.md).
