-- Migração 2026-09-03 — Código de aula compartilhado pela turma.
--
-- Contexto: o resgate de um código marcava `redeemed_at` e invalidava o código
-- para todos os outros alunos. A regra correta é: o código vale para a turma
-- inteira enquanto não expirar (`expires_at`); cada aluno resgata uma única vez
-- (controle feito em `users.redeemed_codes`).
--
-- `redeemed_at` / `redeemed_by` passam a ser apenas telemetria do primeiro resgate.

-- O índice parcial assumia uso único do código.
DROP INDEX IF EXISTS redeem_codes_active_idx;

CREATE INDEX IF NOT EXISTS redeem_codes_active_idx
  ON redeem_codes (lesson_id, expires_at DESC);

COMMENT ON COLUMN redeem_codes.redeemed_at IS
  'Telemetria do primeiro resgate. Não invalida o código: a validade é definida por expires_at.';

COMMENT ON COLUMN redeem_codes.redeemed_by IS
  'Usuário do primeiro resgate. Não invalida o código para os demais alunos.';
