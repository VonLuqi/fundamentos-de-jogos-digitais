/**
 * Panteão de Mnemosyne — permanente, custo em essência, sem reset no Lethe.
 */

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({
    ...item,
    effects: Object.freeze({ ...item.effects }),
  })));
}

export const TALENTS = freezeAll([
  {
    id: 'memoria_das_sombras',
    name: 'Memória das Sombras',
    cost: '1',
    effects: { startingSouls: '100' },
  },
  {
    id: 'juramento_eterno',
    name: 'Juramento Eterno',
    cost: '1',
    effects: { mnemosyneMult: '1.10' },
  },
  {
    id: 'noite_prolongada',
    name: 'Noite Prolongada',
    cost: '2',
    effects: { offlineHours: 12 },
  },
  {
    id: 'veu_eficiente',
    name: 'Véu Eficiente',
    cost: '2',
    effects: { offlineEfficiency: '1.00' },
  },
  {
    id: 'foice_ancestral',
    name: 'Foice Ancestral',
    cost: '3',
    effects: { kSps: '0.01' },
  },
  {
    id: 'favor_de_caronte',
    name: 'Favor de Caronte',
    cost: '3',
    effects: { generatorCostMult: '0.95' },
  },
  {
    id: 'mnemosyne_profunda',
    name: 'Mnemosyne Profunda',
    cost: '5',
    effects: { mnemosyneMult: '1.25' },
  },
  {
    id: 'segundo_folego',
    name: 'Segundo Fôlego',
    cost: '5',
    effects: { startingGeneratorId: 'wandering_shade', startingGeneratorQty: 1 },
  },
]);

export const TALENT_IDS = Object.freeze(TALENTS.map((item) => item.id));

export const TALENT_BY_ID = Object.freeze(
  Object.fromEntries(TALENTS.map((item) => [item.id, item])),
);

export function getTalent(id) {
  return TALENT_BY_ID[id] ?? null;
}

export function isKnownTalentId(id) {
  return Object.prototype.hasOwnProperty.call(TALENT_BY_ID, id);
}
