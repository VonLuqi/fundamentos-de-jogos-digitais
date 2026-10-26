/**
 * Fase F8 — Catálogo congelado das Fortunas de Hermes (Paridade News Ticker Fortunes).
 * - 4 Fortunas Globais (#100, #101, #102, #103)
 * - 20 Fortunes de Linha (T1–T20: +7% SPS e −7% custo do gerador correspondente)
 * Regra canónica: 2% de chance apenas no ciclo natural do ticker (4% com conquista `despertar_o_fortuna`).
 */

import { GENERATORS } from './generators.js';
import {
  FORTUNE_100_COST_MULT,
  FORTUNE_100_SPS_MULT,
  FORTUNE_101_SPS_MULT,
  FORTUNE_101_UPGRADE_COST_MULT,
  FORTUNE_102_OBOL_MULT,
  FORTUNE_103_VEIL_FACTOR,
  FORTUNE_BASE_CHANCE,
  FORTUNE_LINE_COST_MULT,
  FORTUNE_LINE_SPS_MULT,
  FORTUNE_O_FORTUNA_CHANCE,
} from './constants.js';

function freezeDeep(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

export const O_FORTUNA_ACHIEVEMENT_ID = 'despertar_o_fortuna';

const GLOBAL_FORTUNES = [
  {
    id: 'fortune_100',
    upgradeId: 'fortune_100',
    code: '#100',
    name: 'Fortuna #100 — Sussurro de Mercúrio',
    tickerText: 'FORTUNA #100: "Uma moeda encontrada na fenda do barco vale por um império inteiro." (Clique para reivindicar!)',
    kind: 'fortuneGlobal',
    spsFactor: FORTUNE_100_SPS_MULT,
    generatorCostMult: FORTUNE_100_COST_MULT,
    cost: '77777777',
    blurb: 'Produção global de Almas / s +1% e todos os geradores custam 1% menos.',
  },
  {
    id: 'fortune_101',
    upgradeId: 'fortune_101',
    code: '#101',
    name: 'Fortuna #101 — Decreto da Moira Dourada',
    tickerText: 'FORTUNA #101: "Átropos hesitou por um segundo; os pergaminhos do Styx cobraram menos tinta." (Clique para reivindicar!)',
    kind: 'fortuneGlobal',
    spsFactor: FORTUNE_101_SPS_MULT,
    upgradeCostMult: FORTUNE_101_UPGRADE_COST_MULT,
    cost: '7777777777',
    blurb: 'Produção global de Almas / s +7% e todos os juramentos do Styx custam 7% menos.',
  },
  {
    id: 'fortune_102',
    upgradeId: 'fortune_102',
    code: '#102',
    name: 'Fortuna #102 — Balança de Caronte',
    tickerText: 'FORTUNA #102: "Quem guarda um óbolo sob a língua descobre que o barqueiro devolve juros." (Clique para reivindicar!)',
    kind: 'fortuneObol',
    obolGainMult: FORTUNE_102_OBOL_MULT,
    cost: '777777777777',
    blurb: 'Concede +1% de ganho adicional de Óbolos de Caronte no Ritual do Lethe.',
  },
  {
    id: 'fortune_103',
    upgradeId: 'fortune_103',
    code: '#103',
    name: 'Fortuna #103 — Filhote da Fortuna',
    tickerText: 'FORTUNA #103: "Um filhote de três cabeças brinca com um dado de ouro às margens do Véu." (Clique para reivindicar!)',
    kind: 'veilMult',
    veilFactor: FORTUNE_103_VEIL_FACTOR,
    cost: '77777777777777',
    blurb: 'Filhote da Fortuna: multiplica o SPS global em 1 + (Véu × 0,05) na cadeia Cerberiana.',
  },
];

const LINE_FORTUNES = GENERATORS.map((gen, idx) => {
  const num = String(idx + 1).padStart(3, '0');
  // Custo ~ 7 × baseCost do gerador (acessível assim que a linha está ativa)
  const baseBig = BigInt(gen.baseCost);
  const fortuneCost = (baseBig * 77n).toString();
  return {
    id: `fortune_gen_${gen.id}`,
    upgradeId: `fortune_gen_${gen.id}`,
    code: `#${num}`,
    generatorId: gen.id,
    name: `Fortuna #${num} — Sorte de ${gen.name}`,
    tickerText: `FORTUNA #${num}: "Os augúrios favorecem ${gen.name} — o preço cede e a colheita ferve." (Clique para reivindicar!)`,
    kind: 'fortuneLine',
    spsFactor: FORTUNE_LINE_SPS_MULT,
    generatorCostMult: FORTUNE_LINE_COST_MULT,
    cost: fortuneCost,
    blurb: `${gen.name} produz +7% Almas / s e custa 7% menos para contratar.`,
  };
});

export const FORTUNES = freezeDeep([...GLOBAL_FORTUNES, ...LINE_FORTUNES]);

export const FORTUNE_IDS = Object.freeze(FORTUNES.map((f) => f.id));

export const FORTUNE_BY_ID = Object.freeze(
  Object.fromEntries(FORTUNES.map((f) => [f.id, f])),
);

export const FORTUNE_BY_GENERATOR_ID = Object.freeze(
  Object.fromEntries(
    LINE_FORTUNES.map((f) => [f.generatorId, f]),
  ),
);

export const FORTUNE_CONFIG = Object.freeze({
  baseChance: FORTUNE_BASE_CHANCE,
  oFortunaChance: FORTUNE_O_FORTUNA_CHANCE,
});

export function getFortune(id) {
  return FORTUNE_BY_ID[String(id ?? '')] ?? null;
}

export function isKnownFortuneId(id) {
  return Boolean(FORTUNE_BY_ID[String(id ?? '')]);
}
