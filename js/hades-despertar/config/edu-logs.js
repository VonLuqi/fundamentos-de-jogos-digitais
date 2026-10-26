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
  {
    id: 'log_synergy_blades',
    title: 'Sinergias e Mil Foices',
    body: 'Sinergias acoplam pares de geradores (+5% no maior por unidade da base e +0,1% na base por unidade do maior), enquanto Mil Foices soma bônus linear por estrutura não-Sombra ao clique e às Sombras.',
  },
  {
    id: 'log_shimmer_echo',
    title: 'Eco do Acheron e Razão Variável',
    body: 'Recompensas de razão variável (Variable Ratio Schedule) quebram a monotonia exponencial: a Colheita usa min(15% da carteira, 15 min de SPS) + 13 para premiar sem inflacionar a curva, enquanto Maré (×7 SPS) e Fúria da Foice (×777 clique) criam janelas de pico ativo.',
  },
  {
    id: 'log_midgame_payoff',
    title: 'Payoff do Mid-Game (T7–T12)',
    body: 'Do Templo de Mnemosyne (T7) ao Tear de Cronos (T12), o tempo de retorno puro (BaseCost / BaseSPS) salta de minutos para horas e dias: são os multiplicadores empilhados e as sinergias cruzadas que comprimem esse horizonte de volta para minutos reais.',
  },
  {
    id: 'log_nectar_minigames',
    title: 'Néctar do Lethe, Time-Gating e Minigames',
    body: 'O Néctar do Lethe (~24 h por gota, desbloqueado em 1B de almas) cria retenção de longo prazo e custo de oportunidade: gastar 1 Néctar no Nível 1 de Cão, Templo, Torre ou Trono abre os 4 minigames (+1% SPS da linha/nível), enquanto reter até 100 Néctares com Néctar em Reserva dobra todo o SPS global.',
  },
  {
    id: 'log_veil_kittens',
    title: 'Véu do Acheron e Produtório Cerberiano',
    body: 'Cada conquista normal (+4% de Véu, incluindo conquistas das Aulas e do Grimório; conquistas Shadow somam +0%) deixa de ser mero troféu extrínseco e alimenta a linhagem Filhotes do Cérbero via produtório composto ∏(1 + m·f_i), onde cada novo filhote multiplica todo o SPS global.',
  },
  {
    id: 'log_catabase_wrinklers',
    title: 'Catábase das Avós e o Paradoxo das Sanguessugas',
    body: 'Cada Sanguessuga do Acheron reduz o SPS imediato em 5% (10 unidades drenam 50%), mas acumula individualmente todo o dreno coletivo em paralelo e devolve ×1,1 ao estourar: com 10 Sanguessugas ativas, o multiplicador efetivo sobre o SPS passivo salta para ×6,0 (0,5 + 10 × 0,5 × 1,1 = 6,0).',
  },
  {
    id: 'log_late_bignum_payoff',
    title: 'Escala Exponencial Extrema, IEEE 754 e o Payoff de T13–T20',
    body: 'Acima de 2^53 − 1 (~9×10^15, entre o Prisma das Moiras T14 e a Forja do Destino T15), o tipo Number IEEE 754 perde precisão inteira: por isso a economia usa aritmética BigInt/BCMath em string decimal até a casa dos Decilhões/Vigintilhões, onde o payoff teórico de anos d’O Imperador (T20, 540 Sp) é vencido pela composição exponencial de F1–F6.',
  },
  {
    id: 'log_incremental_architecture_f8',
    title: 'Arquitetura Completa de um Jogo Incremental (Stack, Sinks de Sacrifício e Loops Sazonais)',
    body: 'No ápice de um jogo incremental, o SPS nasce da composição ordenada de ~15–19 camadas multiplicativas independentes (Linhas → Prestígio → Vereditos → Minigames → Relíquias Sazonais → Catábase → Saturnália → Fortunas → Escama Dracónica → Filhotes/Véu → Néctar em Reserva → Auras do Dragão → Aliança → Buffs Ativos), enquanto sinks não-monetários (sacrificar 50–200 geradores ao Dragão Pitão/Ladão, vender estruturas com 25%/50% de reembolso e caçar Fortunas de 2%/4% no ciclo natural do Ticker) evitam a inflação estática.',
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
  log_synergy_blades: 'Sinergias e Mil Foices acoplam geradores entre si.',
  log_shimmer_echo: 'Ecos do Acheron trazem picos estocásticos (Maré, Colheita e Fúria).',
  log_midgame_payoff: 'Multiplicadores e sinergias comprimem o payoff de horas/dias em T7–T12.',
  log_nectar_minigames: 'O Néctar (24 h) nivela geradores, abre 4 minigames e acumula até +100% SPS.',
  log_veil_kittens: 'Cada conquista normal (+4% Véu) multiplica o SPS via Filhotes do Cérbero.',
  log_catabase_wrinklers: '10 Sanguessugas drenam 50% do SPS, mas devolvem ×6,0 ao estourar (0,5 + 10×0,5×1,1).',
  log_late_bignum_payoff: 'T13–T20 ultrapassam 2^53−1 (IEEE 754): precisão BigInt/Decimal e stack composto vencem payoffs de anos.',
  log_incremental_architecture_f8: 'Stack completo (14+ camadas), sacrifícios do Dragão, 4 Estações, Fortunas (2%/4%) e Venda (25%/50%).',
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
