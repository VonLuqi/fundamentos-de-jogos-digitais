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
  {
    id: 'log_reap_power',
    title: 'A Foice e o clique',
    body: 'O clique é input; potência da Foice multiplica o ganho por ação.',
  },
  {
    id: 'log_buy_modes',
    title: 'Modos de compra',
    body: 'Mercado: ×1 / ×10 / máx. — o input muda o quanto você gasta.',
  },
  {
    id: 'log_sealed_juramentos',
    title: 'Juramentos selados',
    body: 'Alguns juramentos ficam selados até a máquina crescer.',
  },
  {
    id: 'log_verdicts_milestone',
    title: 'Vereditos do Juízo',
    body: 'Vereditos compram sentenças na Bancada — meta-moeda do loop.',
  },
  {
    id: 'log_obols_bonus',
    title: 'Óbolos e memória',
    body: 'Óbolos vêm do Lethe; alimentam bônus permanente entre corridas.',
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

/** Duração do popover no livro (B-D3). */
export const CODEX_TIP_MS = 5_000;

/**
 * Tips curtas no unlock do livro (≤90 chars).
 * Ausente ⇒ só badge, sem popover. Inclui ids B-D4 para B3.
 */
export const EDU_LOG_TIP = Object.freeze({
  log_input: 'Cada clique altera o estado — começo do loop.',
  log_lethe_unlock: 'O Lethe se abre — a memória do Submundo te espera.',
  log_lethe_ritual: 'Beber do Lethe reseta a corrida e guarda óbolos.',
  log_styx_open: 'Juramentos do Styx multiplicam a máquina.',
  log_reap_power: 'A Foice multiplica o clique — potencia o input.',
  log_buy_modes: 'Troca ×1 / ×10 / máx. no Mercado para gastar melhor.',
  log_sealed_juramentos: 'Juramentos selados abrem conforme a máquina cresce.',
  log_verdicts_milestone: 'Vereditos do Juízo compram sentenças na Bancada.',
  log_obols_bonus: 'Óbolos do Lethe são memória entre catábases.',
});

export const EDU_LOG_TIP_IDS = Object.freeze(Object.keys(EDU_LOG_TIP));

/**
 * @param {string} id
 * @returns {string}
 */
export function eduLogTip(id) {
  const tip = EDU_LOG_TIP[String(id ?? '')];
  return tip ? String(tip) : '';
}

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
