/**
 * Geradores T1–T6 — GDD §4.1 / plano congelado.
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
    blurb: 'Sombras à margem do Acheron.',
    baseCost: '15',
    baseRate: '0.1',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'charon_servants',
    tier: 2,
    name: 'Servos de Caronte',
    blurb: 'Remadores que cobram a passagem.',
    baseCost: '100',
    baseRate: '0.8',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'cerberian_hound',
    tier: 3,
    name: 'Cão Cerberiano',
    blurb: 'Três goelas, um posto.',
    baseCost: '1100',
    baseRate: '8',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'tartarus_judge',
    tier: 4,
    name: 'Juiz do Tártaro',
    blurb: 'Gerador T4 de almas/s — distinto do minigame Juízo e da Bancada.',
    baseCost: '12000',
    baseRate: '47',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'phlegethon_forge',
    tier: 5,
    name: 'Forja de Phlegethon',
    blurb: 'Fogo industrial do rio.',
    baseCost: '130000',
    baseRate: '260',
    multiplier: COST_MULTIPLIER,
  },
  {
    id: 'obsidian_throne',
    tier: 6,
    name: 'Trono de Obsidiana',
    blurb: 'O assento do Imperador Ctoniano.',
    baseCost: '1400000',
    baseRate: '1400',
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
