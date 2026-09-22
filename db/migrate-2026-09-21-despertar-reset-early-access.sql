-- Migração 2026-09-21
-- Objetivo: zerar progresso antecipado de O Despertar (alunos que acharam
-- o jogo pela nav da Aula 05 antes do gate do Acheron).
--
-- Não apaga a Estela do Mestre (role = admin).
-- O cache IndexedDB do browser é invalidado no deploy via despertar-db-v2.

DELETE FROM despertar_states
WHERE user_id IN (
  SELECT id FROM users WHERE COALESCE(role, 'student') <> 'admin'
);
