-- Migração 2026-09-21 (b)
-- ClassInd-dle: fases results + ranking (fim de sessão / desempenho)
-- Pré-requisito: migrate-2026-09-21-classind-dle.sql

ALTER TABLE classind_rooms
  DROP CONSTRAINT IF EXISTS classind_rooms_phase_check;

ALTER TABLE classind_rooms
  ADD CONSTRAINT classind_rooms_phase_check
  CHECK (phase IN ('lobby', 'voting', 'revealed', 'results', 'ranking', 'closed'));
