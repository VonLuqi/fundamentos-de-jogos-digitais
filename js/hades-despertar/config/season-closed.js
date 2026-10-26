/**
 * Hold do Despertar até o Dia 1.
 * Com `true` + Acheron selado (`published=false`), todos veem o pódio.
 * O Mestre libera no Dia 1 pelo botão do véu (ou “Abrir o Acheron” no Painel).
 */

'use strict';

/**
 * Enquanto true, `published=false` mostra o véu de temporada (com top 3).
 * No Dia 1, liberar o Acheron abre o jogo sem precisar redeployar este flag.
 * @type {boolean}
 */
export const DESPERTAR_SEASON_CLOSED = true;

export const SEASON_CLOSED_COPY = Object.freeze({
  eyebrow: 'Temporada encerrada · aguardando Dia 1',
  title: 'O Acheron guarda silêncio',
  body: 'O Despertar está fechado até a liberação do Dia 1. Enquanto isso, o Domínio honra o pódio do Submundo.',
  prizeNote:
    'Quem ficou em 1º em cada categoria do Despertar (Juízo, Catábases e Almas totais) ganha um prêmio.',
  tabletNote:
    'No fim do módulo, quem ficar em 1º no placar de XP e no de Relíquias (categorias ligadas entre si) ganha uma mesa digitalizadora. Confira esses placares no Placar completo.',
  ctaAulas: 'Voltar à Trilha',
  ctaRanking: 'Placar completo',
  ctaLiberate: 'Liberar Despertar (Dia 1)',
  ctaPreview: 'Pré-visualizar / Testar Despertar',
  liberating: 'Abrindo o Acheron…',
  liberateError: 'Não foi possível liberar. Tente Abrir o Acheron no Painel.',
  previewBanner: 'Modo teste — a turma ainda vê o Acheron fechado.',
  ctaExitPreview: 'Sair do teste',
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
