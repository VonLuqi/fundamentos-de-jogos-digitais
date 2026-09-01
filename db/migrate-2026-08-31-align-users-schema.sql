-- ============================================================
-- MIGRAÇÃO — Alinha o schema real do Supabase de produção com o
-- que o código da aplicação espera.
-- ============================================================
-- Contexto: a tabela `users` em produção foi criada com apenas
-- (id, username, password, role, xp, conquistas). O código em
-- api/auth.js e api/progress.js espera também password_hash,
-- completed_lessons, redeemed_codes, avatar_index e created_at.
--
-- Esta migração é ADITIVA e IDEMPOTENTE (IF NOT EXISTS): não
-- remove nem renomeia nenhuma coluna existente, então os dados
-- atuais (ex.: usuário admin VonLuqi) permanecem intactos.
--
-- A coluna `conquistas` é mantida com esse nome no banco — o
-- código passou a mapear `conquistas` (DB) ↔ `achievements`
-- (contrato da API/frontend) internamente, sem exigir rename.
--
-- Execute este script no SQL Editor do Supabase do projeto
-- `hades-db` (ambiente `main` / produção).
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS completed_lessons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS redeemed_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_index int4 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Garante que a coluna `conquistas` exista e tenha o tipo/default
-- corretos, caso algum ambiente ainda não a possua (no-op em prod,
-- já confirmada existente e com valor `[]` para o admin).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS conquistas text[] NOT NULL DEFAULT '{}';

-- Observação: nenhuma alteração é necessária na tabela `sessions`
-- — seu schema (token text PK, user_id int4 FK, created_at
-- timestamptz) já está correto e bate com o que api/auth.js espera.

-- ============================================================
-- Passo 2 (adicional) — a coluna legada `password` (texto plano)
-- ainda tinha restrição NOT NULL. Novos usuários passam a ser
-- criados só com `password_hash`; usuários antigos continuam
-- migrando de `password` para `password_hash` no primeiro login
-- (ver api/auth.js). Tornamos `password` opcional para permitir
-- o insert de novos registros sem valor legado.
-- ============================================================
ALTER TABLE users
  ALTER COLUMN password DROP NOT NULL;
