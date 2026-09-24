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
    },
    "prova": {
      "inProgress": false,
      "attemptId": null,
      "examId": null,
      "endsAt": null,
      "remainingMs": null,
      "currentQuestionIndex": null
    }
  }
}
```

Regras:

- `user` = **mesmo DTO** de `sanitizeUser` em `api/auth.js` / `api/progress.js` (aliases `name` / `fullName` / `achievements`).
- `gates.despertar.published` = resultado de `isDespertarPublished` (default **false** / selado).
- `gates.prova` (Task C1, **aditivo**): `inProgress` se existe tentativa `in_progress` do aluno; campos extras para o cliente retomar. Admin sempre `inProgress: false`. Cliente antigo ignora; novo usa para redirect global.
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

## 5. Extensão opcional — `clientEpoch` (Despertar sync · Fase A)

> **Origem:** [`docs/despertar-sync/01-tasks-fase-a-sync.md`](../despertar-sync/01-tasks-fase-a-sync.md) Task 0 / A3  
> **Status:** contrato documentado; eco no wire **implementado** (Task A3, 2026-09-22)

Campo **opcional** no payload de `action: 'stateSync'` e no DTO de resposta. Clientes legados omitem; server **ignora** para validação de economia (é hint de rebase no client).

### Request (subset)

```json
{
  "token": "…",
  "action": "stateSync",
  "clientEpoch": 12
}
```

| Campo | Tipo | Regra |
| --- | --- | --- |
| `clientEpoch` | number ≥ 0 (inteiro) | Opcional. Monotônico no client a cada mutação suja (`buy*`, prestige local, grants). Ausente = legado. |

### Response (eco)

Em `ok` e em reject com `state`, o DTO pode incluir:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `echoEpoch` | number \| omitido | Eco do `clientEpoch` recebido nesta request. Se o client omitiu, omitir no eco. |

Alias aceitável no state embutido: `clientEpoch` (mesmo valor). Preferir **`echoEpoch`** no envelope / state DTO para não confundir com o epoch local pós-merge.

### Semântica no client (Fase A)

- Se `echoEpoch < syncEpoch` local após o RTT → **não** replace cego de souls/gens/upgrades; merge reconcile + remarcar dirty.
- Reject (`JUDGES_REFUSED` / 400/409) → replace total **independente** do epoch.

---

## Checklist de revisão de contrato

- [x] D4 bootstrap shape congelado
- [x] D2 RPC nome + tipos (`integer` user id) congelados
- [x] D3 flag `DESPERTAR_SYNC_RPC` documentada
- [x] Smoke estático `ops-perf-fase-b-contracts-smoke.mjs` amarra strings-chave
- [x] Extensão opcional `clientEpoch` / `echoEpoch` documentada (Despertar Fase A)
