/**
 * Conquista de evento: concluir o ClassInd-dle (deck no desempenho).
 * Não é volátil: não passa pelo parágrafo da oficina.
 */

export const CLASSIND_DLE_SECRET_ID = 'segredo_juri_do_telao';

/**
 * Aluno (não Mestre) que votou ao menos uma vez numa sessão cujo deck acabou.
 * @param {{ isAdmin?: boolean, deckFinished?: boolean, scoreAnswered?: number }} ctx
 */
export function qualifiesForClassindDleSecret(ctx = {}) {
  if (ctx.isAdmin) return false;
  if (!ctx.deckFinished) return false;
  return Number(ctx.scoreAnswered) >= 1;
}
