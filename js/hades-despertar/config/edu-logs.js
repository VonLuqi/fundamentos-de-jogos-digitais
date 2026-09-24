/**
 * Códice do Loop — logs educacionais (GDD §2.3).
 * Gatilhos em GameState.unlockLogs; aba UI na Task 10a (UIRenderer).
 */

import { JUIZO_CODEX_BODY, JUIZO_CODEX_TITLE } from './juizo-pool.js';

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

export const EDU_LOGS = freezeAll([
  {
    id: 'log_input',
    title: 'O clique é o input',
    body: 'Ação do jogador altera o estado (saldo de Almas).',
  },
  {
    id: 'log_state',
    title: 'Estado e carteira',
    body: 'Números na HUD são o estado do jogo, não “pontos de história”.',
  },
  {
    id: 'log_loop',
    title: 'O Game Loop',
    body: 'O mundo avança em ticks mesmo sem clicar — RAF + delta time.',
  },
  {
    id: 'log_delta',
    title: 'Delta e ausência',
    body: 'Tempo real importa; o loop não “inventa” frames perdidos — acumula ou faz catch-up.',
  },
  {
    id: 'log_generator',
    title: 'Automação',
    body: 'SPS = quantidade × taxa × juramentos.',
  },
  {
    id: 'log_curve',
    title: 'Curva 1.15',
    body: 'Preço = Base × 1.15^n — cada unidade fica mais cara.',
  },
  {
    id: 'log_amort',
    title: 'Amortização',
    body: 'Tempo para o gerador “se pagar”; o GDD calcula T_amort na tabela.',
  },
  {
    id: 'log_upgrade',
    title: 'Multiplicadores',
    body: 'Upgrades não somam +1 alma; multiplicam a máquina.',
  },
  {
    id: 'log_wall',
    title: 'A parede',
    body: 'Curva exponencial cria barreira; o gênero responde com prestígio.',
  },
  {
    id: 'log_lethe_unlock',
    title: 'O Lethe se abre',
    body: 'A parede da corrida revela o rio da memória — o prestígio deixa de ser lenda.',
  },
  {
    id: 'log_lethe_ritual',
    title: 'O Ritual do Lethe',
    body: 'Há óbolos a colher: beber do Lethe reseta a corrida e guarda memória permanente.',
  },
  {
    id: 'log_styx_open',
    title: 'O Styx aceita teu nome',
    body: 'Juramentos do Styx multiplicam a máquina — upgrades não somam almas soltas.',
  },
  {
    id: 'log_prestige',
    title: 'Catábase',
    body: 'Reset da corrida em troca de óbolos; bônus permanente no SPS.',
  },
  {
    id: 'log_authority',
    title: 'O servidor julga',
    body: 'O browser simula fluido; o saldo eterno é o que o servidor aceita.',
  },
  {
    id: 'log_offline',
    title: 'Colheita na ausência',
    body: 'Teto de horas × eficiência — design de respeito ao sono do aluno.',
  },
  {
    id: 'log_juizo',
    title: JUIZO_CODEX_TITLE,
    body: JUIZO_CODEX_BODY,
  },
]);

export const EDU_LOG_IDS = Object.freeze(EDU_LOGS.map((item) => item.id));

export const EDU_LOG_BY_ID = Object.freeze(
  Object.fromEntries(EDU_LOGS.map((item) => [item.id, item])),
);

/** Logs com interrupt de ticker na primeira revelação (Fase C / C2). */
export const EDU_LOG_TICKER_IDS = Object.freeze([
  'log_lethe_unlock',
  'log_lethe_ritual',
  'log_styx_open',
]);

/**
 * Primeira frase do body (ou title) para o letreiro.
 * @param {{ body?: string, title?: string }|null|undefined} log
 */
export function eduLogTickerPhrase(log) {
  if (!log) return '';
  const body = String(log.body ?? '').trim();
  if (body) {
    const match = body.match(/^(.+?[.!?])(?:\s|$)/u);
    return (match ? match[1] : body).trim();
  }
  return String(log.title ?? '').trim();
}
