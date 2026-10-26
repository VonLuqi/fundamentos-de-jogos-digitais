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
  body: 'O Despertar está fechado até o próximo patch. Enquanto isso, o Domínio honra o pódio do Submundo.',
  prizeNote:
    'Quem ficou em 1º em cada categoria do Despertar (Juízo, Catábases e Almas totais) ganha um prêmio.',
  tabletNote:
    'No fim do módulo, quem ficar em 1º no placar de XP e no de Relíquias (categorias ligadas entre si) ganha uma mesa digitalizadora. Confira esses placares no Placar completo.',
  ctaAulas: 'Voltar à Trilha',
  ctaRanking: 'Placar completo',
  boardsEyebrow: 'Top 3 · Despertar · global',
  loading: 'Consultando o Placar…',
  empty: 'Nenhuma alma neste placar ainda.',
  error: 'O Placar não respondeu. Tente o placar completo.',
});

/** Só métricas do Despertar (sem XP / Relíquias do Domínio). */
export const SEASON_CLOSED_CATEGORIES = Object.freeze([
  { sort: 'juizoBest', label: 'Juízo', metricKey: 'juizoBest', format: 'number' },
  { sort: 'prestigeCount', label: 'Catábases', metricKey: 'prestigeCount', format: 'number' },
  { sort: 'lifetimeSouls', label: 'Almas totais', metricKey: 'lifetimeSouls', format: 'souls' },
]);
