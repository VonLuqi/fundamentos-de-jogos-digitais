-- Migração 2026-10-02 — TTL configurável + código de uso único.
--
-- `single_use = false` (default): compartilhamento de turma (regra atual).
-- `single_use = true`: o primeiro resgate invalida o código (redeemed_at).
-- A duração continua em `expires_at` (definida na geração).

ALTER TABLE redeem_codes
  ADD COLUMN IF NOT EXISTS single_use boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN redeem_codes.single_use IS
  'Se true, o primeiro resgate esgota o código. Se false, vale para a turma até expires_at.';

COMMENT ON COLUMN redeem_codes.redeemed_at IS
  'Primeiro resgate. Em códigos compartilhados é telemetria; em single_use invalida o código.';

COMMENT ON COLUMN redeem_codes.redeemed_by IS
  'Usuário do primeiro resgate (telemetria ou dono do uso único).';
