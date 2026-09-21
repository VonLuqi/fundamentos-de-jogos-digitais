/**
 * Deck pedagógico ClassInd-dle — aula5-v1
 * Fonte única para API (Task 3) e UI (Task 4).
 * Ratings = referência de aula (podem divergir de lojas ao longo do tempo).
 */

'use strict';

export const DECK_ID = 'aula5-v1';

const COVER_BASE = '/assets/classind-dle/covers';

function coverUrl(filename) {
  if (!filename) return null;
  return `${COVER_BASE}/${filename}`;
}

/**
 * @typedef {{ title: string, blurb: string, cover?: string|null, rating: string, descriptors: string[] }} Side
 * @typedef {{ id: string, question: string, sideA: Side, sideB: Side, correctSide: 'A'|'B', rationale: string }} Round
 */

/** @type {Round[]} */
export const ROUNDS = [
  {
    id: 'r1-mk11-sf6',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Mortal Kombat 11',
      blurb: 'Luta com fatalidades, gore explícito e desmembramento.',
      cover: 'mortal-kombat-11.webp',
      rating: '18',
      descriptors: ['violência extrema', 'gore'],
    },
    sideB: {
      title: 'Street Fighter 6',
      blurb: 'Luta competitiva com impacto, sem desmembramento pedagógico.',
      cover: 'street-fighter-6.webp',
      rating: '12',
      descriptors: ['violência'],
    },
    correctSide: 'A',
    rationale:
      'MK11 sobe a 18 por violência extrema/gore. SF6 fica em 12 por violência de luta sem o mesmo nível de gore.',
  },
  {
    id: 'r2-sims-hk',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'The Sims 4',
      blurb: 'Simulação de vida com temas sexuais, nudez censurada e relacionamentos adultos.',
      cover: 'the-sims-4.webp',
      rating: '12',
      descriptors: ['temas sexuais', 'nudez'],
    },
    sideB: {
      title: 'Hollow Knight',
      blurb: 'Metroidvania com combate fantasioso, criaturas e clima de medo.',
      cover: 'hollow-knight.webp',
      rating: '10',
      descriptors: ['violência fantasiosa', 'medo'],
    },
    correctSide: 'A',
    rationale:
      'Pegadinha: Sims 4 (12) supera Hollow Knight (10) por temas sexuais/nudez — não por “mais ação”.',
  },
  {
    id: 'r3-undertale-hotline',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Undertale',
      blurb: 'RPG com combate fantasioso contra monstros e humor; violência estilizada.',
      cover: 'undertale.webp',
      rating: '10',
      descriptors: ['violência fantasiosa', 'não-humanos'],
    },
    sideB: {
      title: 'Hotline Miami',
      blurb: 'Ação top-down com violência gráfica explícita contra humanos e sangue.',
      cover: 'hotline-miami.webp',
      rating: '18',
      descriptors: ['violência extrema', 'gore', 'humanos'],
    },
    correctSide: 'B',
    rationale:
      'Hotline Miami sobe a 18 por violência gráfica contra humanos. Undertale fica em 10 com combate fantasioso contra não-humanos.',
  },
  {
    id: 'r4-cuphead-blasphemous',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Cuphead',
      blurb: 'Run-and-gun cartunesco com violência estilizada e humor clássico.',
      cover: 'cuphead.webp',
      rating: '10',
      descriptors: ['violência fantasiosa', 'comicidade'],
    },
    sideB: {
      title: 'Blasphemous',
      blurb: 'Metroidvania penitent com gore religioso, execução e horror corporal.',
      cover: 'blasphemous.webp',
      rating: '18',
      descriptors: ['violência extrema', 'gore', 'temas adultos'],
    },
    correctSide: 'B',
    rationale: 'Blasphemous (18) pelo gore e temas adultos; Cuphead permanece em violência cartunesca (10).',
  },
  {
    id: 'r5-supermarket-gta',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Supermarket Simulator',
      blurb: 'Simulação de loja: empilhar prateleiras, caixa e rotina sem violência.',
      cover: 'supermarket-simulator.webp',
      rating: 'L',
      descriptors: ['conteúdo livre'],
    },
    sideB: {
      title: 'Grand Theft Auto: San Andreas',
      blurb: 'Mundo aberto com violência, drogas, crimes e temas adultos explícitos.',
      cover: 'gta-san-andreas.webp',
      rating: '18',
      descriptors: ['violência', 'drogas', 'temas adultos'],
    },
    correctSide: 'B',
    rationale: 'Contraste máximo: simulação Livre vs GTA 18 nos três eixos clássicos.',
  },
  {
    id: 'r6-vampire-doom',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Vampire Survivors',
      blurb: 'Horda survival com sprites e violência fantasiosa arcade.',
      cover: 'vampire-survivors.webp',
      rating: '10',
      descriptors: ['violência fantasiosa'],
    },
    sideB: {
      title: 'Doom Eternal',
      blurb: 'FPS com violência intensa e gore demoníaco.',
      cover: 'doom-eternal.webp',
      rating: '16',
      descriptors: ['violência intensa', 'gore'],
    },
    correctSide: 'B',
    rationale: 'Doom Eternal (16) pela violência/gore; Vampire Survivors fica na violência fantasiosa (10).',
  },
  {
    id: 'r7-simpsons-silenthill',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'The Simpsons: Hit & Run',
      blurb: 'Ação/aventura humorística com violência cartoon.',
      cover: 'the-simpsons-hit-and-run.webp',
      rating: '10',
      descriptors: ['violência fantasiosa', 'comicidade'],
    },
    sideB: {
      title: 'Silent Hill 2 (2024)',
      blurb: 'Terror psicológico com violência, horror corporal e temas adultos.',
      cover: 'silent-hill-2-2024.webp',
      rating: '18',
      descriptors: ['medo intenso', 'violência', 'temas adultos'],
    },
    correctSide: 'B',
    rationale: 'Silent Hill 2 (18) pelo terror/violência maduros; Hit & Run permanece cartoon (10).',
  },
  {
    id: 'r8-fnaf-gow',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: "Five Nights at Freddy's",
      blurb: 'Terror de jumpscare com animatrônicos; medo forte, violência pouco gráfica.',
      cover: 'five-nights-at-freddys.webp',
      rating: '12',
      descriptors: ['medo'],
    },
    sideB: {
      title: 'God of War Ragnarök',
      blurb: 'Ação mitológica com combate visceral, sangue e temas maduros.',
      cover: 'god-of-war-ragnarok.webp',
      rating: '18',
      descriptors: ['violência', 'sangue', 'temas adultos'],
    },
    correctSide: 'B',
    rationale: 'GoW Ragnarök (18) pela violência intensa; FNAF pesa mais no medo (12) do que no gore.',
  },
  {
    id: 'r9-rivals-re',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Marvel Rivals',
      blurb: 'Hero shooter com combate estilizado entre heróis.',
      cover: 'marvel-rivals.webp',
      rating: '12',
      descriptors: ['violência'],
    },
    sideB: {
      title: 'Resident Evil Village',
      blurb: 'Survival horror com violência gráfica, gore e terror.',
      cover: 'resident-evil-village.webp',
      rating: '18',
      descriptors: ['violência extrema', 'gore', 'medo'],
    },
    correctSide: 'B',
    rationale: 'RE Village (18) pelo horror/gore; Marvel Rivals fica em violência de combate (12).',
  },
  {
    id: 'r10-cod-crimson',
    question: 'Qual exige a idade mais alta?',
    sideA: {
      title: 'Call of Duty: Black Ops',
      blurb: 'FPS militar com violência realista de combate contemporâneo.',
      cover: 'call-of-duty-black-ops.webp',
      rating: '18',
      descriptors: ['violência', 'sangue'],
    },
    sideB: {
      title: 'Crimson Desert',
      blurb: 'Ação/aventura com combate; referência pedagógica de violência intensa em mundo aberto.',
      cover: 'crimson-desert.webp',
      rating: '16',
      descriptors: ['violência'],
    },
    correctSide: 'A',
    rationale:
      'Black Ops (18) pela violência militar realista/sangue; Crimson Desert na referência da aula fica em 16.',
  },
];

function publicSide(side) {
  return {
    title: side.title,
    blurb: side.blurb,
    imageUrl: coverUrl(side.cover),
  };
}

/**
 * @param {Round} round
 */
export function splitRoundPayload(round) {
  return {
    public: {
      question: round.question,
      sideA: publicSide(round.sideA),
      sideB: publicSide(round.sideB),
      roundId: round.id,
    },
    secret: {
      correctSide: round.correctSide,
      ratingA: round.sideA.rating,
      ratingB: round.sideB.rating,
      descriptors: {
        A: [...round.sideA.descriptors],
        B: [...round.sideB.descriptors],
      },
      rationale: round.rationale,
    },
  };
}

/**
 * Ordem aleatória dos índices do deck (Fisher–Yates).
 * Usada em createRoom para cada sala ter combates em ordem diferente, sem repetir.
 */
export function shuffleDeckOrder() {
  const order = Array.from({ length: ROUNDS.length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

/**
 * @param {number} index índice sequencial da sessão (0 = 1ª comparação)
 * @param {number[]|null|undefined} deckOrder ordem embaralhada gravada em room.settings
 */
export function getRoundByIndex(index, deckOrder = null) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= ROUNDS.length) return null;
  if (Array.isArray(deckOrder) && deckOrder.length === ROUNDS.length) {
    const source = Number(deckOrder[i]);
    if (!Number.isInteger(source) || source < 0 || source >= ROUNDS.length) return null;
    return ROUNDS[source] || null;
  }
  return ROUNDS[i];
}

export function deckLength() {
  return ROUNDS.length;
}
