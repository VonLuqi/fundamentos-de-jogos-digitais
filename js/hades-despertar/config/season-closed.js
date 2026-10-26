/**
 * Fechamento temporário do Despertar até o próximo patch.
 * Ligar `true` no ar; voltar a `false` no deploy da atualização do jogo.
 */

'use strict';

/** @type {boolean} */
export const DESPERTAR_SEASON_CLOSED = true;

export const SEASON_CLOSED_COPY = Object.freeze({
  eyebrow: 'Temporada encerrada',
  title: 'O Acheron guarda silêncio',
  body: 'O Despertar está fechado até o próximo patch. Enquanto isso, o Domínio honra o pódio de cada categoria.',
  ctaAulas: 'Voltar à Trilha',
  ctaRanking: 'Placar completo',
  boardsEyebrow: 'Top 3 · turma',
  loading: 'Consultando o Placar…',
  empty: 'Nenhuma alma neste placar ainda.',
  error: 'O Placar não respondeu. Tente o placar completo.',
});

/** Categorias do Placar do Domínio (mesmo contrato de leaderboardGet). */
export const SEASON_CLOSED_CATEGORIES = Object.freeze([
  { sort: 'juizoBest', label: 'Juízo', metricKey: 'juizoBest', format: 'number' },
  { sort: 'prestigeCount', label: 'Catábases', metricKey: 'prestigeCount', format: 'number' },
  { sort: 'lifetimeSouls', label: 'Almas totais', metricKey: 'lifetimeSouls', format: 'souls' },
  { sort: 'xp', label: 'XP', metricKey: 'xp', format: 'number' },
  { sort: 'achievements', label: 'Relíquias', metricKey: 'achievements', format: 'number' },
]);
