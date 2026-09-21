/**
 * Juramentos do Styx — todos ×2 no alvo. Resetam no Lethe.
 */

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({
    ...item,
    requires: Object.freeze({ ...item.requires }),
  })));
}

export const UPGRADES = freezeAll([
  {
    id: 'foice_afilada',
    name: 'Foice Afiada',
    cost: '100',
    kind: 'clickMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
  {
    id: 'juramento_acheron',
    name: 'Juramento do Acheron',
    cost: '500',
    kind: 'clickMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
  {
    id: 'pacto_das_margens',
    name: 'Pacto das Margens',
    cost: '2500',
    kind: 'clickMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
  {
    id: 'ceifador_ctoniano',
    name: 'Ceifador Ctoniano',
    cost: '10000',
    kind: 'clickMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
  {
    id: 'colheita_eterna',
    name: 'Colheita Eterna',
    cost: '50000',
    kind: 'clickMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
  {
    id: 'umbras_despertas',
    name: 'Umbras Despertas',
    cost: '100',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'wandering_shade',
    requires: { generatorId: 'wandering_shade', quantity: 1 },
  },
  {
    id: 'cortejo_das_sombras',
    name: 'Cortejo das Sombras',
    cost: '500',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'wandering_shade',
    requires: { generatorId: 'wandering_shade', quantity: 10 },
  },
  {
    id: 'moeda_no_barquinho',
    name: 'Moeda no Barquinho',
    cost: '1000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'charon_servants',
    requires: { generatorId: 'charon_servants', quantity: 1 },
  },
  {
    id: 'frota_de_caronte',
    name: 'Frota de Caronte',
    cost: '5000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'charon_servants',
    requires: { generatorId: 'charon_servants', quantity: 10 },
  },
  {
    id: 'trela_cerberiana',
    name: 'Trela Cerberiana',
    cost: '11000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'cerberian_hound',
    requires: { generatorId: 'cerberian_hound', quantity: 1 },
  },
  {
    id: 'tres_cabecas',
    name: 'Três Cabeças',
    cost: '55000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'cerberian_hound',
    requires: { generatorId: 'cerberian_hound', quantity: 10 },
  },
  {
    id: 'veredito_tartaro',
    name: 'Veredito do Tártaro',
    cost: '120000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'tartarus_judge',
    requires: { generatorId: 'tartarus_judge', quantity: 1 },
  },
  {
    id: 'lei_inquebravel',
    name: 'Lei Inquebrável',
    cost: '600000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'tartarus_judge',
    requires: { generatorId: 'tartarus_judge', quantity: 10 },
  },
  {
    id: 'brasa_phlegethon',
    name: 'Brasa de Phlegethon',
    cost: '1300000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'phlegethon_forge',
    requires: { generatorId: 'phlegethon_forge', quantity: 1 },
  },
  {
    id: 'fornalha_industrial',
    name: 'Fornalha Industrial',
    cost: '6500000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'phlegethon_forge',
    requires: { generatorId: 'phlegethon_forge', quantity: 10 },
  },
  {
    id: 'cetro_obsidiana',
    name: 'Cetro de Obsidiana',
    cost: '14000000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'obsidian_throne',
    requires: { generatorId: 'obsidian_throne', quantity: 1 },
  },
  {
    id: 'soberania_absoluta',
    name: 'Soberania Absoluta',
    cost: '70000000',
    kind: 'generatorMult',
    factor: '2',
    generatorId: 'obsidian_throne',
    requires: { generatorId: 'obsidian_throne', quantity: 10 },
  },
  {
    id: 'coroacao_imperador',
    name: 'Coroação do Imperador',
    cost: '1000000',
    kind: 'allGeneratorsMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
  {
    id: 'rios_unificados',
    name: 'Rios Unificados',
    cost: '100000000',
    kind: 'allGeneratorsMult',
    factor: '2',
    requires: { minSouls: '0' },
  },
]);

export const UPGRADE_IDS = Object.freeze(UPGRADES.map((item) => item.id));

export const UPGRADE_BY_ID = Object.freeze(
  Object.fromEntries(UPGRADES.map((item) => [item.id, item])),
);

export function getUpgrade(id) {
  return UPGRADE_BY_ID[id] ?? null;
}

export function isKnownUpgradeId(id) {
  return Object.prototype.hasOwnProperty.call(UPGRADE_BY_ID, id);
}
