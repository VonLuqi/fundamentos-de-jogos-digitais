# Deploy — ClassInd-dle (Task 2)

Antes de usar a UI live (Tasks 3–4), rode a migration no **Supabase SQL Editor**:

1. Abra o projeto Supabase → **SQL** → New query.
2. Cole o conteúdo de [`db/migrate-2026-09-21-classind-dle.sql`](../db/migrate-2026-09-21-classind-dle.sql).
3. Run.
4. Se o banco **já** tinha a migration anterior, rode também [`db/migrate-2026-09-21-classind-dle-results-ranking.sql`](../db/migrate-2026-09-21-classind-dle-results-ranking.sql) (libera phases `results` / `ranking` no fim do deck).
5. Confirme em **Database → Publications → supabase_realtime** que `classind_live_snapshots` está listada.
6. Em **Authentication → API** (ou Project Settings → API), anote a **anon/public key** — a Task 3 devolve essa key no `joinRoom` / `createRoom` via env `SUPABASE_ANON_KEY`.

Smoke local (estático + check remoto se `.env` tiver Supabase):

```bash
node tests/classind-schema-smoke.mjs
```

# Env — ClassInd-dle Realtime (Task 3)

Além de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, defina a **anon key** para o browser receber push:

```env
SUPABASE_ANON_KEY=eyJ...   # Project Settings → API → anon public
```

Aceito também: `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

A API devolve `{ realtime: { url, anonKey, roomId } }` em `createRoom` / `joinRoom` / `getState`.  
**Nunca** exponha a service-role key no front.
