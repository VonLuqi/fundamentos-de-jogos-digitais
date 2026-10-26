/**
 * Geradores T1–T20 — paridade completa Cookie Clicker (F0 + F3 + F7).
 */

import { COST_MULTIPLIER } from './constants.js';

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

export const GENERATORS = freezeAll([
  {
    id: 'wandering_shade',
    tier: 1,
    name: 'Sombra Vagante',
    blurb: 'Umbras recém-chegadas que ainda murmuram o nome do mundo de cima, até a margem as chamar pelo verdadeiro.',
    baseCost: '15',
    baseRate: '0.1',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'charon_servants',
    tier: 2,
    name: 'Servos de Caronte',
    blurb: 'Remadores mudos do barqueiro: cobram o óbolo, empurram a quilha negra e nunca perguntam para onde a alma segue.',
    baseCost: '100',
    baseRate: '1',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'cerberian_hound',
    tier: 3,
    name: 'Cão Cerberiano',
    blurb: 'Filhote da matilha do portão: três goelas, um posto — fareja a fuga e devolve o rebanho ao Império.',
    baseCost: '1100',
    baseRate: '8',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'tartarus_judge',
    tier: 4,
    name: 'Juiz do Tártaro',
    blurb: 'Herdeiro da linhagem de Minos: no abismo, pesa cada vida num único golpe de malhete e sela o destino em basalto.',
    baseCost: '12000',
    baseRate: '47',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'phlegethon_forge',
    tier: 5,
    name: 'Forja de Phlegethon',
    blurb: 'Oficina erguida sobre o rio de fogo: martelos ancestrais batem no compasso do coração da terra e fundem tributo em ferro estígio.',
    baseCost: '130000',
    baseRate: '260',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'obsidian_throne',
    tier: 6,
    name: 'Trono de Obsidiana',
    blurb: 'O assento negro do Imperador Ctoniano: quem nele se senta ouve o domínio inteiro ajoelhar-se em silêncio.',
    baseCost: '1400000',
    baseRate: '1400',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'mnemosyne_temple',
    tier: 7,
    name: 'Templo de Mnemosyne',
    blurb: 'Santuário das águas da memória onde cânticos antigos destilam almas puras.',
    baseCost: '20000000',
    baseRate: '7800',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'styx_tower',
    tier: 8,
    name: 'Torre do Estige',
    blurb: 'Pináculo de obsidiana onde oráculos conjuram correntes de juramentos.',
    baseCost: '330000000',
    baseRate: '44000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'star_barge',
    tier: 9,
    name: 'Barca das Estrelas',
    blurb: 'Galeão astral que atravessa o vazio entre constelações mortas e o Érebo.',
    baseCost: '5100000000',
    baseRate: '260000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'tartarus_lab',
    tier: 10,
    name: 'Laboratório do Tártaro',
    blurb: 'Athanores abissais que transmutam chumbo ctônico e cinzas em essência.',
    baseCost: '75000000000',
    baseRate: '1600000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'erebus_portal',
    tier: 11,
    name: 'Portal do Érebo',
    blurb: 'Fenda dimensional aberta para as profundezas primordiais da noite eterna.',
    baseCost: '1000000000000',
    baseRate: '10000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'chronos_loom',
    tier: 12,
    name: 'Tear de Cronos',
    blurb: 'Maquinário temporal que colhe almas do passado e do futuro ainda não vivido.',
    baseCost: '14000000000000',
    baseRate: '65000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'void_condenser',
    tier: 13,
    name: 'Condensador do Vazio',
    blurb: 'Câmaras de contenção que extraem almas puras da antimatéria primordial do Caos.',
    baseCost: '170000000000000',
    baseRate: '430000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'moirai_prism',
    tier: 14,
    name: 'Prisma das Moiras',
    blurb: 'Cristais de destino facetados que refratam a própria luz da mortalidade em almas.',
    baseCost: '2100000000000000',
    baseRate: '2900000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'fate_forge',
    tier: 15,
    name: 'Forja do Destino',
    blurb: 'Bigornas probabilísticas que materializam almas a partir do puro acaso.',
    baseCost: '26000000000000000',
    baseRate: '21000000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'fractal_engine',
    tier: 16,
    name: 'Motor Fractal',
    blurb: 'Geometrias recursivas infinitas onde cada alma contém um submundo inteiro dentro de si.',
    baseCost: '310000000000000000',
    baseRate: '150000000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'oracle_console',
    tier: 17,
    name: 'Console do Oráculo',
    blurb: 'Terminais de bronze estígio que reescrevem o código-fonte da realidade para imprimir almas.',
    baseCost: '71000000000000000000',
    baseRate: '1100000000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'chthonic_idleverse',
    tier: 18,
    name: 'Idleverso Ctoniano',
    blurb: 'Esferas de universos paralelos inteiros desviados para desaguar no Acheron.',
    baseCost: '12000000000000000000000',
    baseRate: '8300000000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'cortex_baker',
    tier: 19,
    name: 'Padeiro do Córtex',
    blurb: 'Mentes titânicas do tamanho de luas cujos sonhos se condensam em tributo.',
    baseCost: '1900000000000000000000000',
    baseRate: '64000000000000',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'the_emperor',
    tier: 20,
    name: 'O Imperador (You)',
    blurb: 'Avatares soberanos forjados à tua própria imagem para reger cada margem da eternidade.',
    baseCost: '540000000000000000000000000',
    baseRate: '510000000000000',
    multiplier: COST_MULTIPLIER,
  },
]);

export const GENERATOR_IDS = Object.freeze(GENERATORS.map((item) => item.id));

export const GENERATOR_BY_ID = Object.freeze(
  Object.fromEntries(GENERATORS.map((item) => [item.id, item])),
);

export function getGenerator(id) {
  return GENERATOR_BY_ID[id] ?? null;
}
