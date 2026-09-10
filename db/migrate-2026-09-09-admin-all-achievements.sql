-- ============================================================
-- MIGRAÇÃO — Concede TODAS as conquistas do catálogo aos admins
-- ============================================================
-- Contexto: o Mestre (role = 'admin') vê o álbum completo só no
-- frontend/API (`sanitizeUser` injeta ALL_ACHIEVEMENT_IDS). No
-- banco, `users.conquistas` pode continuar vazio — só visual.
--
-- Este script materializa o catálogo atual (`data/game-catalog.json`)
-- em `users.conquistas` para todo usuário com role = 'admin'.
--
-- Idempotente: substitui o array pelo conjunto completo do catálogo.
-- Não altera XP (admin usa progressão simbólica ∞ no produto).
--
-- Execute no SQL Editor do Supabase (ambiente main / produção).
-- Ao adicionar conquistas novas no JSON, rode de novo (ou atualize
-- a lista ARRAY[...] abaixo).
-- ============================================================

UPDATE users
SET conquistas = ARRAY[
  'aula1_concluida',
  'gdd_integracao_documental',
  'segredo_cartografo_do_inspector',
  'segredo_alquimista_da_fisica',
  'segredo_juramento_do_circulo',
  'soberano_do_submundo',
  'grimorio_primeira_inscricao',
  'grimorio_elo_da_trilha',
  'grimorio_dez_inscricoes',
  'grimorio_revelacao',
  'grimorio_vinculo_oculto',
  'grimorio_eco_invertido',
  'grimorio_escriba_ritual',
  'grimorio_cartografo_pessoal',
  'grimorio_fixador',
  'grimorio_eco_clonado'
]::text[]
WHERE role = 'admin';

-- Conferência rápida (opcional):
-- SELECT id, username, role, conquistas, cardinality(conquistas) AS total
-- FROM users
-- WHERE role = 'admin';
