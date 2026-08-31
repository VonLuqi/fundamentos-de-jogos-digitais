-- Habilita extensão para hashing (opcional)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  xp integer NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_lessons jsonb NOT NULL DEFAULT '[]'::jsonb,
  redeemed_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  avatar_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de sessões simples (tokens opacos)
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir ADMIN (use a função crypt para gerar hash com pgcrypto)
-- Substitua a senha abaixo por uma segura ou execute o INSERT via painel SQL do Supabase
INSERT INTO users (username, password_hash, role, xp, achievements, completed_lessons, redeemed_codes, avatar_index)
VALUES (
  'VonLuqi',
  crypt('TaciLucas2002@', gen_salt('bf')),
  'admin',
  0,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  0
)
ON CONFLICT (username) DO NOTHING;

-- Observação: se o seu provedor não tiver pgcrypto, insira a senha em texto plano apenas para dev,
-- ou gere o hash em Node.js e atualize o registro.
