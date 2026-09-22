# Warmup — Task C7

| Item | Valor |
| --- | --- |
| Rota | `GET\|POST /api/cron/warmup` |
| Auth | `Authorization: Bearer $CRON_SECRET` |
| Cron | `45 11 * * 1-5` (11:45 UTC ≈ **08:45 BRT**, dias úteis) |
| Janela recomendada | **15–30 min antes** da abertura da turma; ajustar `vercel.json` se o horário da aula mudar |
| O que faz | Ping GET em `/api/auth`, `/api/progress`, `/api/session-bootstrap` (401 esperado) + SELECT leve `users` — **sem scrypt** |
| Local | `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/warmup` |

Aceite lab (`cold=1` ↓ no primeiro login): medir em staging pós-deploy; até lá infra pronta / métrica `pending_lab_measure`.
