# Contratos congelados — Fase B

> **Origem:** Task 0 / B1 · [`02-tasks-fase-b-rtt-batching.md`](./02-tasks-fase-b-rtt-batching.md)  
> **Estado:** congelado (2026-09-22)  
> **Implementação de runtime:** B2+ (após baseline k6)

Este arquivo é a referência de shape para smokes estáticos e PRs. Mudanças exigem bump explícito de versão de contrato + atualização do smoke `tests/ops-perf-fase-b-contracts-smoke.mjs`.

**Versão de contrato:** `fase-b.v1`

---

## 1. `GET /api/session-bootstrap` (D4)

### Request

| Item | Valor |
| --- | --- |
| Método | `GET` |
| Path | `/api/session-bootstrap` |
| Query | `token` (string opaca de sessão) — obrigatório |
| Headers | nenhum especial; `Cache-Control: no-store` (global `/api/*`) |

### Response 200

```json
{
  "ok": true,
  "user": {
    "id": 1,
    "full_name": "…",
    "name": "…",
    "fullName": "…",
    "username": "…",
    "turma": "TCG01",
    "role": "student",
    "xp": 0,
    "achievements": [],
    "email": null,
    "emailVerifiedAt": null
  },
  "gates": {
    "despertar": {
      "published": false
    }
  }
}
```

Regras:

- `user` = **mesmo DTO** de `sanitizeUser` em `api/auth.js` / `api/progress.js` (aliases `name` / `fullName` / `achievements`).
- `gates.despertar.published` = resultado de `isDespertarPublished` (default **false** / selado).
- Sem notes, friends, leaderboard, estado Despertar.

### Erros

| Status | Condição |
| --- | --- |
| 400 | token ausente |
| 401 | sessão inválida / expirada |
| 503 | Supabase não configurado |

### Métricas A6

- `route=session-bootstrap` (arquivo dedicado `api/session-bootstrap.js`)
- `action=bootstrap`
- `gate_cache` preenchido quando o gate for lido via helper A3

### Cliente (B2)

- `fetchSessionBootstrap(token)` em `js/api.js`
- `requireSession` / shell preferem bootstrap; `validateSession` + `fetchProfile` = fallback se 404/503

---

## 2. RPC `despertar_persist_and_award` (D1–D3)

### Assinatura SQL (congelada)

```sql
despertar_persist_and_award(
  p_user_id integer,
  p_patch jsonb,
  p_achievement_ids text[],
  p_xp_delta integer DEFAULT 0
) RETURNS jsonb
```

`users.id` e `despertar_states.user_id` são **integer** (`db/setup.sql`).

### Semântica

| Passo | Efeito |
| --- | --- |
| 1 | `UPDATE despertar_states` com campos de `p_patch` onde `user_id = p_user_id` (1 linha esperada) |
| 2 | Se `p_achievement_ids` não vazio: `UPDATE users` somando `p_xp_delta` e fazendo append só dos ids ainda ausentes em `conquistas` |
| 3 | Retorno JSON: `{ state: <row despertar_states>, user: { id, xp, conquistas } }` |

### Fora da RPC (permanecem no Node)

- `validateSync` / `applySanitizedEduLogs`
- Rate limit KV (A2)
- Gate `published` / selo Mensageiro
- Rate limit / sessão

### Feature flag

| Env | Default | Efeito |
| --- | --- | --- |
| `DESPERTAR_SYNC_RPC` | unset / `0` | path legado multi-RTT |
| `DESPERTAR_SYNC_RPC=1` | — | handler chama RPC após validate ok |

Fallback: erro/ausência de RPC → path legado + log `sync_rpc_fallback=1`.

### Chaves esperadas em `p_patch` (subset)

Alinhadas ao `persistPatch` atual / colunas de `despertar_states` (snake_case):  
`souls`, `obols`, `mnemosyne`, `lifetime_souls`, `run_souls`, `prestige_count`, `generators_state`, `shiny_counts`, `upgrades_state`, `talents_state`, `edu_logs_seen`, `milestones`, `verdicts`, `juizo_*`, `verdict_purchases`, `juizo_run`, `last_sync_at`, `updated_at`, …

A RPC **não** valida economia de jogo — só persiste o patch já autenticado pelo Node.

---

## 3. Batch de aula (D6) — `lessonEventsBatch`

**Status:** implementado (B6)

```json
{
  "token": "…",
  "action": "lessonEventsBatch",
  "events": [
    { "type": "lessonView", "lessonId": "aula1", "clientTs": 0 },
    { "type": "lessonParagraph", "lessonId": "aula1", "paragraph": "…", "clientTs": 0 }
  ]
}
```

Resposta: `{ ok: true, results: [ { ok, index, type, error?, … } ] }` — sucesso parcial permitido.  
Cliente: `enqueueLessonEvent` / `flushLessonEvents` em `js/api.js`; fallback item-a-item se 404/405.

---

## 4. Leaderboard SQL (D5) — `leaderboard_page`

**Status:** implementado (B5)

RPC: `leaderboard_page(p_scope, p_turma, p_sort, p_limit, p_viewer_id) → jsonb`  
Parâmetros públicos inalterados: `scope` ∈ `turma|global`, `sort` ∈ `xp|achievements|juizoBest`, `LIMIT` default `LEADERBOARD_TOP` (50).  
Cliente opcional: `limit`. Implementação: `ORDER BY …` + window rank no SQL; fallback legado se RPC ausente.

---

## Checklist de revisão de contrato

- [x] D4 bootstrap shape congelado
- [x] D2 RPC nome + tipos (`integer` user id) congelados
- [x] D3 flag `DESPERTAR_SYNC_RPC` documentada
- [x] Smoke estático `ops-perf-fase-b-contracts-smoke.mjs` amarra strings-chave
