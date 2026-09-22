/**
 * Bancada do Juiz — itens permanentes pagos com Vereditos (Task 19 / J.2 B1 Soft).
 * Não resetam no Lethe (ficam em verdictPurchases).
 * B1: −1 Veredito nos dois itens baratos (selo, memória).
 */

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({
    ...item,
    effects: Object.freeze({ ...item.effects }),
  })));
}

export const VERDICT_SHOP = freezeAll([
  {
    id: 'selo_do_juiz',
    name: 'Selo do Juiz',
    blurb: '+5% no clique. O carimbo do Tártaro na foice.',
    cost: 2,
    effects: { clickMult: '1.05' },
  },
  {
    id: 'memoria_classind',
    name: 'Memória ClassInd',
    blurb: 'Offline +30 min de teto. O catálogo não dorme.',
    cost: 4,
    effects: { offlineExtraHours: 0.5 },
  },
  {
    id: 'olho_do_tartarus',
    name: 'Olho do Tártaro',
    blurb: '+2% SPS. A sentença observa a máquina.',
    cost: 8,
    effects: { spsMult: '1.02' },
  },
  {
    id: 'pacto_duplo',
    name: 'Pacto Duplo',
    blurb: '1º gerador da corrida −10% custo.',
    cost: 12,
    effects: { firstGeneratorCostMult: '0.90' },
  },
]);

/** Soma dos custos da Bancada (B1 Soft = 26). */
export const VERDICT_SHOP_TOTAL_COST = VERDICT_SHOP.reduce((sum, item) => sum + item.cost, 0);

export const VERDICT_SHOP_IDS = Object.freeze(VERDICT_SHOP.map((item) => item.id));

export const VERDICT_SHOP_BY_ID = Object.freeze(
  Object.fromEntries(VERDICT_SHOP.map((item) => [item.id, item])),
);

export function getVerdictShopItem(id) {
  return VERDICT_SHOP_BY_ID[id] ?? null;
}

export function isKnownVerdictPurchase(id) {
  return Object.prototype.hasOwnProperty.call(VERDICT_SHOP_BY_ID, id);
}
