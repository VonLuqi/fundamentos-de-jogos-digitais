-- Migração 2026-09-22
-- Objetivo: Senha do Caronte (site_settings) + purpose legacy_reset + rate limit legacy_bind
-- (Task 4 — docs/plano-ops-nav-email-perf-admin.md)

-- Configuração opaca do Domínio (hash da Senha do Caronte, etc.).
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value_hash text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by integer REFERENCES users(id) ON DELETE SET NULL
);

-- Tokens de e-mail: aceitar propósito de recuperação legada (selo + Nova Palavra).
ALTER TABLE auth_email_tokens
  DROP CONSTRAINT IF EXISTS auth_email_tokens_purpose_check;

ALTER TABLE auth_email_tokens
  ADD CONSTRAINT auth_email_tokens_purpose_check
  CHECK (purpose IN ('reset_password', 'verify_email', 'legacy_reset'));

-- Rate limit: tentativas do atalho legado (IP + username).
ALTER TABLE auth_rate_events
  DROP CONSTRAINT IF EXISTS auth_rate_events_action_check;

ALTER TABLE auth_rate_events
  ADD CONSTRAINT auth_rate_events_action_check
  CHECK (action IN ('login', 'register', 'legacy_bind'));
