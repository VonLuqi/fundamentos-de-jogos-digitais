-- Prova Módulo 1 — ampliar admin_notes
-- Comentários por discursiva (até 8 × 2000) + nota geral cabem no JSON;
-- o teto antigo (4000) fazia falhar "Falha ao atualizar a tentativa." ao salvar anotações.

ALTER TABLE prova_attempts
  DROP CONSTRAINT IF EXISTS prova_attempts_admin_notes_check;

ALTER TABLE prova_attempts
  DROP CONSTRAINT IF EXISTS prova_attempts_admin_notes_len_chk;

ALTER TABLE prova_attempts
  ADD CONSTRAINT prova_attempts_admin_notes_len_chk
  CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 24000);
