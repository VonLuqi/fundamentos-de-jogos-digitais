-- Migração 2026-09-21
-- Objetivo: schema ClassInd-dle (salas, rodadas, votos, membros, snapshot Realtime)
-- Task 2 — docs/plano-aula5-classind-iarc.md
--
-- user_id é integer (users.id), não UUID de auth.users.
-- Mutações: só via API com SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- Push live: postgres_changes em classind_live_snapshots (SELECT anon/authenticated).
--
-- Deploy: rode este SQL no Supabase (SQL Editor) ANTES do merge que liga a UI live.
-- Confirme no Dashboard → Database → Publications que classind_live_snapshots
-- está em supabase_realtime (o bloco abaixo tenta adicionar automaticamente).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classind_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  host_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turma text NULL CHECK (turma IS NULL OR turma IN ('TCG01', 'TCG02')),
  phase text NOT NULL DEFAULT 'lobby'
    CHECK (phase IN ('lobby', 'voting', 'revealed', 'results', 'ranking', 'closed')),
  current_round_index integer NOT NULL DEFAULT 0
    CHECK (current_round_index >= 0),
  deck_id text NOT NULL DEFAULT 'aula5-v1',
  state_version bigint NOT NULL DEFAULT 0
    CHECK (state_version >= 0),
  settings jsonb NOT NULL DEFAULT '{"requireAllVotes":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classind_rooms_code_fmt_chk CHECK (code ~ '^[A-Z0-9]{4,6}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS classind_rooms_code_uidx
  ON classind_rooms (code);

CREATE INDEX IF NOT EXISTS classind_rooms_host_idx
  ON classind_rooms (host_user_id);

CREATE INDEX IF NOT EXISTS classind_rooms_phase_updated_idx
  ON classind_rooms (phase, updated_at DESC);

ALTER TABLE classind_rooms ENABLE ROW LEVEL SECURITY;
-- Sem policies: anon/authenticated não leem nem escrevem. Service-role bypass.

-- ---------------------------------------------------------------------------
-- Rounds (snapshot do deck por sala; secret separado do public)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classind_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES classind_rooms(id) ON DELETE CASCADE,
  round_index integer NOT NULL CHECK (round_index >= 0),
  payload_public jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_secret jsonb NOT NULL DEFAULT '{}'::jsonb,
  phase text NOT NULL DEFAULT 'voting'
    CHECK (phase IN ('voting', 'revealed')),
  revealed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classind_rounds_room_index_uidx UNIQUE (room_id, round_index)
);

CREATE INDEX IF NOT EXISTS classind_rounds_room_idx
  ON classind_rounds (room_id, round_index);

ALTER TABLE classind_rounds ENABLE ROW LEVEL SECURITY;
-- Sem policies: payload_secret nunca exposto ao anon.

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classind_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES classind_rounds(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('A', 'B')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classind_votes_round_user_uidx UNIQUE (round_id, user_id)
);

CREATE INDEX IF NOT EXISTS classind_votes_round_idx
  ON classind_votes (round_id);

CREATE INDEX IF NOT EXISTS classind_votes_user_idx
  ON classind_votes (user_id);

ALTER TABLE classind_votes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Members (presença / quorum X/Y)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classind_members (
  room_id uuid NOT NULL REFERENCES classind_rooms(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS classind_members_room_idx
  ON classind_members (room_id);

CREATE INDEX IF NOT EXISTS classind_members_user_idx
  ON classind_members (user_id);

ALTER TABLE classind_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Live snapshots (única tabela legível pelo browser via anon + Realtime)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classind_live_snapshots (
  room_id uuid PRIMARY KEY REFERENCES classind_rooms(id) ON DELETE CASCADE,
  state_version bigint NOT NULL DEFAULT 0 CHECK (state_version >= 0),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garante colunas completas em UPDATE via Realtime (filtros / diffs)
ALTER TABLE classind_live_snapshots REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS classind_live_snapshots_updated_idx
  ON classind_live_snapshots (updated_at DESC);

ALTER TABLE classind_live_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classind_live_snapshots_select_public ON classind_live_snapshots;
CREATE POLICY classind_live_snapshots_select_public
  ON classind_live_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Sem policies de INSERT/UPDATE/DELETE para anon/authenticated.
-- Writes: só service-role (API).

-- ---------------------------------------------------------------------------
-- Publication Realtime (idempotente)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'classind_live_snapshots'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE classind_live_snapshots;
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime ausente — habilite Realtime no dashboard do projeto.';
  END IF;
END $$;
