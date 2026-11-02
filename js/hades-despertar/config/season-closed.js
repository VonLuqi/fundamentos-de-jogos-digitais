/**
 * Temporadas do Despertar.
 * Hold bloqueante enquanto DESPERTAR_SEASON_CLOSED && !season_liberated.
 * Após Abrir Temporada 2 (seasonOpen), o jogo libera e o Hall/Placar servem o archive T1.
 */

'use strict';

/** Temporada ativa de jogo (live). Archive histórico fica em season_id menores. */
export const CURRENT_SEASON = 2;

/**
 * Enquanto true e `season_liberated` não for true, mostra o véu bloqueante.
 * Após seasonOpen (T2), o gate season_liberated=true encerra o hold sem redeploy.
 * @type {boolean}
 */
export const DESPERTAR_SEASON_CLOSED = true;

/**
 * Instante em que o servidor abre a Temporada 2 sozinho (Brasília).
 * O mesmo literal está em DespertarService::SEASON_OPENS_AT.
 */
export const SEASON_OPENS_AT = '2026-11-01T00:00:00-03:00';

/**
 * Reinício da Temporada 2 (bugs): o Despertar fica trancado para os alunos até este instante;
 * a primeira requisição depois dele zera tudo no servidor e sobe a época.
 * O mesmo literal está em DespertarService::SEASON_RESTART_AT.
 */
export const SEASON_RESTART_AT = '2026-11-02T12:00:00-03:00';

/** Aviso do véu bloqueante durante o tranco do reinício (aluno). */
export const SEASON_RESTART_COPY = Object.freeze({
  eyebrow: 'Temporada 2 · reinício por bugs',
  title: 'O Acheron guarda silêncio',
  body: 'Encontramos bugs na Temporada 2 que poderiam deixar alguém em vantagem injusta. Por isso ela vai reiniciar: o Despertar fica fechado até lá e, ao meio-dia de segunda-feira, 2 de novembro (Brasília), todo mundo começa do zero, com as mesmas chances. O pódio da Temporada 1 continua eterno e o XP que você já ganhou fica.',
  countdownLabel: 'A Temporada 2 recomeça em',
  countdownDone: 'O Acheron abre…',
  previewBanner: 'Modo teste — a turma está com o Acheron trancado até o reinício da Temporada 2.',
  navLabel: 'O Despertar · reinício',
  navTitle: 'Temporada 2 reiniciando — ver o aviso',
});

/** Boot que não conseguiu confirmar a época da temporada com o servidor (nunca joga com save de época desconhecida). */
export const SEASON_RECONNECT_COPY = Object.freeze({
  eyebrow: 'Reconectando ao Acheron',
  title: 'O Acheron ainda não respondeu',
  body: 'Não foi possível confirmar a temporada com o servidor. Seu progresso não foi tocado; tentando de novo em instantes…',
  retryMs: 8000,
});

/** Banner do app-shell (todas as páginas) enquanto o reinício não acontece. */
export const SEASON_RESTART_BANNER_COPY = Object.freeze({
  text: 'O Despertar está fechado: a Temporada 2 vai reiniciar por causa de bugs, para ninguém sair em vantagem injusta. Todo mundo recomeça do zero na segunda-feira, 2 de novembro, ao meio-dia (Brasília). O XP ganho fica.',
  countdownPrefix: 'Reinicia em',
  countdownDone: 'Reiniciando…',
  cta: 'Ver o aviso',
});

export const SEASON_CLOSED_COPY = Object.freeze({
  eyebrow: 'Temporada 1 encerrada · abrindo Temporada 2',
  title: 'O Acheron guarda silêncio',
  body: 'A Temporada 1 fechou. O pódio abaixo fica eterno no Hall e no Placar. A Temporada 2 começa do zero.',
  countdownLabel: 'A Temporada 2 abre em',
  countdownDone: 'O Acheron abre…',
  prizeNote:
    'Quem ficou em 1º em cada categoria do Despertar (Juízo, Catábases e Almas totais) ganha um prêmio.',
  tabletNote:
    'No fim do módulo, quem ficar em 1º no placar de XP e no de Relíquias (categorias ligadas entre si) ganha uma mesa digitalizadora. Confira esses placares no Placar completo.',
  ctaAulas: 'Voltar à Trilha',
  ctaRanking: 'Placar completo',
  ctaLiberate: 'Abrir Temporada 2',
  ctaPreview: 'Pré-visualizar / Testar Despertar',
  liberating: 'Abrindo a Temporada 2…',
  liberateError: 'Não foi possível abrir a Temporada 2. Tente de novo ou use o Painel.',
  liberateConfirm: 'Isto zera o Despertar de TODA a turma, congela o placar da T1 e devolve as conquistas do Despertar para serem reconquistadas (o XP ganho fica; reconquistar não paga de novo). Digite TEMPORADA 2 para confirmar.',
  liberateConfirmToken: 'TEMPORADA 2',
  previewBanner: 'Modo teste — a turma ainda vê o Acheron fechado.',
  ctaExitPreview: 'Sair do teste',
  boardsEyebrow: 'Top 3 · Temporada 1 · global',
  loading: 'Consultando o Placar…',
  empty: 'Nenhuma alma neste placar ainda.',
  error: 'O Placar não respondeu. Tente o placar completo.',
});

export const SEASON_HALL_COPY = Object.freeze({
  title: 'Hall da Temporada 1',
  eyebrow: 'Arquivo eterno · Despertar',
  body: 'Pódio congelado no encerramento da Temporada 1. A Temporada 2 corre em paralelo no Acheron.',
  ctaClose: 'Fechar',
  ctaRanking: 'Ver no Placar completo',
  loading: 'Abrindo o arquivo…',
  empty: 'O arquivo da Temporada 1 ainda não foi gravado.',
  error: 'Não foi possível ler o Hall.',
  fabLabel: 'Hall T1',
  fabTitle: 'Hall da Temporada 1 — pódio eterno',
});

/** Só métricas do Despertar (sem XP / Relíquias do Domínio). */
export const SEASON_CLOSED_CATEGORIES = Object.freeze([
  { sort: 'juizoBest', label: 'Juízo', metricKey: 'juizoBest', format: 'number' },
  { sort: 'prestigeCount', label: 'Catábases', metricKey: 'prestigeCount', format: 'number' },
  { sort: 'lifetimeSouls', label: 'Almas totais', metricKey: 'lifetimeSouls', format: 'souls' },
]);
