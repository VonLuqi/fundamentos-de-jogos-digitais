/**
 * Panteão de Mnemosyne — permanente, custo em essência, sem reset no Lethe.
 *
 * Task 0F (congelada): +5 talentos P0 — docs/plano-despertar-producao-profundo.md (F1).
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
    effects: { startingSouls: '5000' },
  },
  {
    id: 'juramento_eterno',
    name: 'Juramento Eterno',
    cost: '1',
    effects: { mnemosyneMult: '1.25' },
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
    effects: { generatorCostMult: '0.85' },
  },
  {
    id: 'mnemosyne_profunda',
    name: 'Mnemosyne Profunda',
    cost: '5',
    effects: { mnemosyneMult: '1.50' },
  },
  {
    id: 'segundo_folego',
    name: 'Segundo Fôlego',
    cost: '5',
    effects: { startingGeneratorId: 'wandering_shade', startingGeneratorQty: 5 },
  },
  // --- Task F1 (0F P0) ---
  {
    id: 'margem_generosa',
    name: 'Margem Generosa',
    cost: '3',
    effects: { startingSouls: '25000' },
  },
  {
    id: 'pacto_do_silencio',
    name: 'Pacto do Silêncio',
    cost: '3',
    effects: { offlineExtraHours: 6 },
  },
  {
    id: 'olho_da_curva',
    name: 'Olho da Curva',
    cost: '4',
    effects: { richAmort: true },
  },
  {
    id: 'eco_do_styx',
    name: 'Eco do Styx',
    cost: '4',
    effects: { softPrestigeStyx: true },
  },
  {
    id: 'rebanho_despertado',
    name: 'Rebanho',
    cost: '5',
    effects: { startingGeneratorId: 'wandering_shade', startingGeneratorQty: 25 },
  },
  // --- Panteão caro (sinks de essência) ---
  {
    id: 'matilha_cerberiana',
    name: 'Matilha Cerberiana',
    cost: '6',
    effects: { startingGeneratorId: 'cerberian_hound', startingGeneratorQty: 3 },
  },
  {
    id: 'eco_ressonante',
    name: 'Eco Ressonante',
    cost: '6',
    effects: { softPrestigeStyxCount: 2 },
  },
  {
    id: 'calice_da_memoria',
    name: 'Cálice da Memória',
    cost: '7',
    effects: { mnemosyneGainMult: '1.5' },
  },
  {
    id: 'mnemosyne_tripla',
    name: 'Mnemosyne Tripla',
    cost: '8',
    effects: { mnemosyneMult: '2' },
  },
  {
    id: 'forja_despertada',
    name: 'Forja Despertada',
    cost: '10',
    effects: { startingGeneratorId: 'phlegethon_forge', startingGeneratorQty: 1 },
  },
  // --- Fase F5: Néctar do Lethe (Sugar Baking & Sugar Frenzy) ---
  {
    id: 'nectar_em_reserva',
    name: 'Néctar em Reserva',
    cost: '5',
    effects: { nectarReserveBonus: true },
  },
  {
    id: 'frenesi_de_nectar_talento',
    name: 'Cálice do Frenesi',
    cost: '8',
    effects: { nectarFrenzyUnlock: true },
  },
  // --- Fase F8: Dragão Ctoniano, Estações do Submundo e Slots de Eco do Styx III–V ---
  {
    id: 'ovo_primordial',
    name: 'Ovo Primordial',
    cost: '5',
    effects: { dragonUnlock: true },
  },
  {
    id: 'rodizio_das_estacoes',
    name: 'Roda das Estações',
    cost: '5',
    effects: { seasonSwitcherUnlock: true },
  },
  {
    id: 'eco_ancestral_iii',
    name: 'Eco do Styx III',
    cost: '9',
    effects: { softPrestigeStyxCount: 3 },
  },
  {
    id: 'eco_ancestral_iv',
    name: 'Eco do Styx IV',
    cost: '12',
    effects: { softPrestigeStyxCount: 4 },
  },
  {
    id: 'eco_ancestral_v',
    name: 'Eco do Styx V',
    cost: '15',
    effects: { softPrestigeStyxCount: 5 },
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
