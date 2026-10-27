#!/usr/bin/env node
/**
 * Gera catálogo Heavenly (129 nós CC PrestigeUpgrades 1:1) → talents.js + PHP TALENTS + map doc.
 * Uso: node scripts/gen-heavenly-talent-catalog.mjs
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const JS_OUT = path.join(root, 'js/hades-despertar/config/talents.js');
const PHP_PATH = path.join(root, 'backend/src/Services/Despertar/DespertarCatalog.php');
const MAP_DOC = path.join(root, 'docs/heavenly-map-cc-despertar.md');
const UPGRADES_JS = path.join(root, 'js/hades-despertar/config/upgrades.js');

/** Ordem canônica (custo crescente teemo) — 129 nomes CC exatos. */
const CC_ORDER = `Legacy; Twin Gates of Transcendence; Heavenly cookies; Angels; Belphegor; Classic dairy selection; How to bake your dragon; Box of brand biscuits; Box of macarons; Tin of british tea biscuits; Tin of butter cookies; Archangels; Mammon; Starter kit; Heavenly luck; Basic wallpaper assortment; Heralds; Permanent upgrade slot I; Abaddon; Virtues; Persistent memory; Lasting fortune; Lucky digit; Golden switch; Season switcher; Dominions; Satan; Starter kitchen; Decisive fate; Kitten angels; Asmodeus; Cherubim; Permanent upgrade slot II; Unholy bait; Halo gloves; Lucky number; Divine discount; Divine sales; Residual luck; Starlove; Starsnow; Starspawn; Starterror; Startrade; Beelzebub; Seraphim; Synergies Vol. I; Divine bakeries; Elder spice; Sacrilegious corruption; Five-finger discount; God; Lucifer; Inspired checklist; Golden cookie alert sound; Wrapping paper; Fanciful dairy selection; Genius accounting; Synergies Vol. II; Permanent upgrade slot III; Label printer; Wrinkly cookies; Distilled essence of redoubled luck; Distinguished wallpaper assortment; Unshackled flavor; Unshackled cursors; Chimera; Lucky payout; Eye of the wrinkler; Stevia Caelestis; Sugar baking; Diabetica Daemonicus; Permanent upgrade slot IV; Sugar craving; Aura gloves; Sugar aging process; Shimmering veil; Sucralosia Inutilis; Sugar crystal cookies; Keepsakes; Unshackled berrylium; Unshackled grandmas; Cat ladies; Kitten wages; Cosmic beginner's luck; Reinforced membrane; Unshackled farms; Unshackled blueberrylium; Permanent upgrade slot V; Luminous gloves; Fortune cookies; Pet the dragon; Sound test; Delicate touch; Unshackled mines; Unshackled chalcedhoney; Box of maybe cookies; Box of not cookies; Box of pastries; Milkhelp® lactose intolerance relief tablets; Unshackled factories; Unshackled buttergold; Unshackled banks; Unshackled sugarmuck; Unshackled temples; Steadfast murmur; Unshackled jetmint; Unshackled wizard towers; Unshackled cherrysilver; Unshackled shipments; Unshackled hazelrald; Unshackled alchemy labs; Unshackled portals; Unshackled mooncandy; Unshackled time machines; Unshackled astrofudge; Unshackled antimatter condensers; Unshackled alabascream; Glittering edge; Unshackled prisms; Unshackled iridyum; Unshackled chancemakers; Unshackled glucosmium; Unshackled fractal engines; Unshackled javascript consoles; Unshackled glimmeringue; Unshackled idleverses; Unshackled cortex bakers; Unshackled You`
  .split(';')
  .map((s) => s.trim());

/** Custos teemo/wiki — strings inteiras, ordem = CC_ORDER (129). */
const CC_COST_BY_NAME = Object.freeze({
  Legacy: '1',
  'Twin Gates of Transcendence': '1',
  'Heavenly cookies': '3',
  Angels: '7',
  Belphegor: '7',
  'Classic dairy selection': '9',
  'How to bake your dragon': '9',
  'Box of brand biscuits': '25',
  'Box of macarons': '25',
  'Tin of british tea biscuits': '25',
  'Tin of butter cookies': '25',
  Archangels: '49',
  Mammon: '49',
  'Starter kit': '50',
  'Heavenly luck': '77',
  'Basic wallpaper assortment': '99',
  Heralds: '100',
  'Permanent upgrade slot I': '100',
  Abaddon: '343',
  Virtues: '343',
  'Persistent memory': '500',
  'Lasting fortune': '777',
  'Lucky digit': '777',
  'Golden switch': '999',
  'Season switcher': '1111',
  Dominions: '2401',
  Satan: '2401',
  'Starter kitchen': '5000',
  'Decisive fate': '7777',
  'Kitten angels': '9000',
  Asmodeus: '16807',
  Cherubim: '16807',
  'Permanent upgrade slot II': '20000',
  'Unholy bait': '44444',
  'Halo gloves': '55555',
  'Lucky number': '77777',
  'Divine discount': '99999',
  'Divine sales': '99999',
  'Residual luck': '99999',
  Starlove: '111111',
  Starsnow: '111111',
  Starspawn: '111111',
  Starterror: '111111',
  Startrade: '111111',
  Beelzebub: '117649',
  Seraphim: '117649',
  'Synergies Vol. I': '222222',
  'Divine bakeries': '399999',
  'Elder spice': '444444',
  'Sacrilegious corruption': '444444',
  'Five-finger discount': '555555',
  God: '823543',
  Lucifer: '823543',
  'Inspired checklist': '900000',
  'Golden cookie alert sound': '999999',
  'Wrapping paper': '999999',
  'Fanciful dairy selection': '1000000',
  'Genius accounting': '2000000',
  'Synergies Vol. II': '2222222',
  'Permanent upgrade slot III': '3000000',
  'Label printer': '5000000',
  'Wrinkly cookies': '6666666',
  'Distilled essence of redoubled luck': '7777777',
  'Distinguished wallpaper assortment': '10000000',
  'Unshackled flavor': '10000000',
  'Unshackled cursors': '15000000',
  Chimera: '40353607',
  'Lucky payout': '77777777',
  'Eye of the wrinkler': '99999999',
  'Stevia Caelestis': '100000000',
  'Sugar baking': '200000000',
  'Diabetica Daemonicus': '300000000',
  'Permanent upgrade slot IV': '400000000',
  'Sugar craving': '400000000',
  'Aura gloves': '555555555',
  'Sugar aging process': '600000000',
  'Shimmering veil': '999999999',
  'Sucralosia Inutilis': '1000000000',
  'Sugar crystal cookies': '1000000000',
  Keepsakes: '1111111111',
  'Unshackled berrylium': '1810193360',
  'Unshackled grandmas': '1920000000',
  'Cat ladies': '9000000000',
  'Kitten wages': '9000000000',
  "Cosmic beginner's luck": '14999999985',
  'Reinforced membrane': '14999999985',
  'Unshackled farms': '32805000000',
  'Unshackled blueberrylium': '37879951162',
  'Permanent upgrade slot V': '50000000000',
  'Luminous gloves': '55555555555',
  'Fortune cookies': '77777777777',
  'Pet the dragon': '99999999999',
  'Sound test': '99999999999',
  'Delicate touch': '149999999985',
  'Unshackled mines': '245760000000',
  'Unshackled chalcedhoney': '327680000000',
  'Box of maybe cookies': '333000000000',
  'Box of not cookies': '333000000000',
  'Box of pastries': '333000000000',
  'Milkhelp® lactose intolerance relief tablets': '900000000000',
  'Unshackled factories': '1171875000000',
  'Unshackled buttergold': '1746928107422',
  'Unshackled banks': '4199040000000',
  'Unshackled sugarmuck': '6857003606358',
  'Unshackled temples': '12353145000000',
  'Steadfast murmur': '14999999999985',
  'Unshackled jetmint': '21788899719681',
  'Unshackled wizard towers': '31457280000000',
  'Unshackled cherrysilver': '59316416015158',
  'Unshackled shipments': '71744535000000',
  'Unshackled hazelrald': '143489070000000',
  'Unshackled alchemy labs': '150000000000000',
  'Unshackled portals': '292307565000000',
  'Unshackled mooncandy': '316227766016838',
  'Unshackled time machines': '537477120000000',
  'Unshackled astrofudge': '646316344324949',
  'Unshackled antimatter condensers': '941227755000000',
  'Unshackled alabascream': '1241250239661060',
  'Glittering edge': '1499999999999985',
  'Unshackled prisms': '1581202560000000',
  'Unshackled iridyum': '2262429955028239',
  'Unshackled chancemakers': '2562890625000000',
  'Unshackled glucosmium': '3944212159073245',
  'Unshackled fractal engines': '4026531840000000',
  'Unshackled javascript consoles': '6155080095000000',
  'Unshackled glimmeringue': '6617355139184080',
  'Unshackled idleverses': '9183300480000000',
  'Unshackled cortex bakers': '13408076085000000',
  'Unshackled You': '19200000000000000',
});

function ccCost(ccName) {
  const cost = CC_COST_BY_NAME[ccName];
  if (cost == null) throw new Error(`CC_COST_BY_NAME ausente: ${ccName}`);
  if (!/^\d+$/.test(cost)) throw new Error(`custo inválido (não-inteiro): ${ccName}=${cost}`);
  return cost;
}

const MILKHELP_CC = 'Milkhelp&reg; lactose intolerance relief tablets';

const CC_ID_OVERRIDE = Object.freeze({
  Legacy: 'legado',
  'Twin Gates of Transcendence': 'portoes_gemeos',
  'Heavenly cookies': 'bolachas_celestes',
  'How to bake your dragon': 'ovo_primordial',
  'Season switcher': 'rodizio_das_estacoes',
  'Synergies Vol. I': 'sinergias_vol_i',
  'Synergies Vol. II': 'sinergias_vol_ii',
  'Permanent upgrade slot I': 'permanent_slot_i',
  'Permanent upgrade slot II': 'permanent_slot_ii',
  'Permanent upgrade slot III': 'permanent_slot_iii',
  'Permanent upgrade slot IV': 'permanent_slot_iv',
  'Permanent upgrade slot V': 'permanent_slot_v',
  [MILKHELP_CC]: 'comprimidos_milkhelp',
  'Milkhelp® lactose intolerance relief tablets': 'comprimidos_milkhelp',
  'Starter kit': 'kit_inicial',
  'Starter kitchen': 'cozinha_inicial',
  'Halo gloves': 'luvas_de_halo',
  'Divine discount': 'desconto_divino',
  'Divine sales': 'vendas_divinas',
  'Genius accounting': 'contabilidade_genial',
  'Abaddon': 'abadao',
  'Lucky number': 'numero_da_sorte',
  'Lucky payout': 'pagamento_da_sorte',
  'Mammon': 'mamon',
  'Sugar baking': 'cozimento_de_acucar',
  'Sugar craving': 'frenesi_de_acucar',
  'Chimera': 'quimera',
});

const UNSHACKLE_GEN = Object.freeze({
  'Unshackled grandmas': 'charon_servants',
  'Unshackled farms': 'cerberian_hound',
  'Unshackled mines': 'tartarus_judge',
  'Unshackled factories': 'phlegethon_forge',
  'Unshackled banks': 'obsidian_throne',
  'Unshackled temples': 'mnemosyne_temple',
  'Unshackled wizard towers': 'styx_tower',
  'Unshackled shipments': 'star_barge',
  'Unshackled alchemy labs': 'tartarus_lab',
  'Unshackled portals': 'erebus_portal',
  'Unshackled time machines': 'chronos_loom',
  'Unshackled antimatter condensers': 'void_condenser',
  'Unshackled prisms': 'moirai_prism',
  'Unshackled chancemakers': 'fate_forge',
  'Unshackled fractal engines': 'fractal_engine',
  'Unshackled javascript consoles': 'oracle_console',
  'Unshackled idleverses': 'chthonic_idleverse',
  'Unshackled cortex bakers': 'cortex_baker',
  'Unshackled You': 'the_emperor',
});

const OLD_RIVER_IDS = [
  'memoria_das_sombras', 'foice_ancestral', 'margem_generosa', 'preludio_ctoniano', 'segundo_folego',
  'lamina_viva', 'rebanho_despertado', 'mare_inicial', 'torrente_das_umbras', 'favor_de_caronte',
  'olho_da_curva', 'nectar_em_reserva', 'servo_das_margens', 'matilha_cerberiana', 'forja_despertada',
  'frenesi_de_nectar_talento', 'trono_sombrio', 'imperio_fluvial', 'juramento_eterno', 'noite_prolongada',
  'veu_eficiente', 'eco_do_styx', 'pacto_do_silencio', 'mnemosyne_profunda', 'eco_ressonante',
  'legado_do_rio', 'calice_da_memoria', 'eco_ancestral_iii', 'mnemosyne_tripla', 'eco_ancestral_iv',
  'eco_ancestral_v', 'mnemosyne_raiz', 'sinergias_vol_i', 'sinergias_vol_ii', 'rodizio_das_estacoes',
  'ovo_primordial',
];

const LEGACY_TALENT_MAP_MANUAL = Object.freeze({
  legado: 'legado',
  sinergias_vol_i: 'sinergias_vol_i',
  sinergias_vol_ii: 'sinergias_vol_ii',
  ovo_primordial: 'ovo_primordial',
  rodizio_das_estacoes: 'rodizio_das_estacoes',
  juramento_eterno: 'legado',
  memoria_das_sombras: 'kit_inicial',
  margem_generosa: 'kit_inicial',
  foice_ancestral: 'luvas_de_halo',
  favor_de_caronte: 'desconto_divino',
  olho_da_curva: 'contabilidade_genial',
  eco_do_styx: 'permanent_slot_i',
  eco_ressonante: 'permanent_slot_ii',
  eco_ancestral_iii: 'permanent_slot_iii',
  eco_ancestral_iv: 'permanent_slot_iv',
  eco_ancestral_v: 'permanent_slot_v',
  noite_prolongada: 'mamon',
  veu_eficiente: 'portoes_gemeos',
  pacto_do_silencio: 'abadao',
  mnemosyne_profunda: 'numero_da_sorte',
  mnemosyne_tripla: 'pagamento_da_sorte',
  mnemosyne_raiz: 'quimera',
  nectar_em_reserva: 'cozimento_de_acucar',
  frenesi_de_nectar_talento: 'frenesi_de_acucar',
});

const angelPriceFactor = 1e9;

function ccAlias(name) {
  if (name.includes('Milkhelp')) return MILKHELP_CC;
  return name;
}

function slugId(ccName) {
  const key = ccAlias(ccName);
  if (CC_ID_OVERRIDE[key]) return CC_ID_OVERRIDE[key];
  return key
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parsePrestigeBlock(chunk) {
  const nameM = chunk.match(/new Game\.Upgrade\('((?:\\'|[^'])*)'/);
  if (!nameM) return null;
  const name = nameM[1].replace(/\\'/g, "'");
  const poolIdx = chunk.indexOf("upgrade.pool='prestige'");
  const poolIdx2 = chunk.indexOf("Game.last.pool='prestige'");
  const poolAt = poolIdx !== -1 ? poolIdx : poolIdx2;
  if (poolAt === -1) return null;
  const head = chunk.slice(0, poolAt).trimEnd();
  let priceExpr = null;
  const iconTail = head.match(/,(Math\.pow\([^)]+\)|[0-9.eE+-]+|\d+\*\d+),(\[\d+,\d+\])\);\s*$/);
  if (iconTail) {
    priceExpr = iconTail[1].trim();
  } else {
    const alt = head.match(/,(\[[\d+,\d+]+\])\);\s*$/);
    if (alt) {
      const before = head.slice(0, alt.index);
      const priceM = before.match(/,(Math\.pow\([^)]+\)|[0-9.eE+-]+|\d+\*\d+)\s*$/);
      if (priceM) priceExpr = priceM[1].trim();
    }
  }
  const parentsM = chunk.match(/(?:Game\.last\.|upgrade\.)parents=\[([^\]]*)\]/);
  const parents = parentsM
    ? parentsM[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
    : [];
  return { name, parents, priceExpr };
}

function evalPrice(expr) {
  if (!expr) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('Math', 'angelPriceFactor', `return (${expr});`);
    const v = fn(Math, angelPriceFactor);
    if (typeof v === 'number' && Number.isFinite(v)) return Math.ceil(v);
    return null;
  } catch {
    return null;
  }
}

function buildCcMetaFromMain(src) {
  const byName = new Map();
  const re = /new Game\.Upgrade\(/g;
  const indices = [];
  let m;
  while ((m = re.exec(src)) !== null) indices.push(m.index);
  for (let i = 0; i < indices.length; i += 1) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : start + 12000;
    const chunk = src.slice(start, Math.min(end, start + 12000));
    const parsed = parsePrestigeBlock(chunk);
    if (!parsed) continue;
    const price = evalPrice(parsed.priceExpr);
    if (!byName.has(parsed.name)) byName.set(parsed.name, { ...parsed, price });
  }

  const buildingUnshackleNames = [
    ['Unshackled cursors', 1, 'Unshackled flavor'],
    ['Unshackled grandmas', 2, 'Unshackled cursors'],
    ['Unshackled farms', 3, 'Unshackled grandmas'],
    ['Unshackled mines', 4, 'Unshackled farms'],
    ['Unshackled factories', 5, 'Unshackled mines'],
    ['Unshackled banks', 6, 'Unshackled factories'],
    ['Unshackled temples', 7, 'Unshackled banks'],
    ['Unshackled wizard towers', 8, 'Unshackled temples'],
    ['Unshackled shipments', 9, 'Unshackled wizard towers'],
    ['Unshackled alchemy labs', 10, 'Unshackled shipments'],
    ['Unshackled portals', 11, 'Unshackled alchemy labs'],
    ['Unshackled time machines', 12, 'Unshackled portals'],
    ['Unshackled antimatter condensers', 13, 'Unshackled time machines'],
    ['Unshackled prisms', 14, 'Unshackled antimatter condensers'],
    ['Unshackled chancemakers', 15, 'Unshackled prisms'],
    ['Unshackled fractal engines', 16, 'Unshackled chancemakers'],
    ['Unshackled javascript consoles', 17, 'Unshackled fractal engines'],
    ['Unshackled idleverses', 18, 'Unshackled javascript consoles'],
    ['Unshackled cortex bakers', 19, 'Unshackled idleverses'],
    ['Unshackled You', 20, 'Unshackled cortex bakers'],
  ];
  for (const [name, , parent] of buildingUnshackleNames) {
    byName.set(name, { name, parents: [parent] });
  }

  const tierFlavors = [
    'berrylium', 'blueberrylium', 'chalcedhoney', 'buttergold', 'sugarmuck', 'jetmint',
    'cherrysilver', 'hazelrald', 'mooncandy', 'astrofudge', 'alabascream', 'iridyum', 'glucosmium', 'glimmeringue',
  ];
  byName.set('Unshackled flavor', { name: 'Unshackled flavor', parents: ['Label printer'] });
  for (let i = 0; i < tierFlavors.length; i += 1) {
    const flavor = tierFlavors[i];
    const name = `Unshackled ${flavor}`;
    const parent = i === 0 ? 'Unshackled flavor' : `Unshackled ${tierFlavors[i - 1]}`;
    byName.set(name, { name, parents: [parent] });
  }

  return byName;
}

async function loadCcMain() {
  const cache = path.join(root, '.cache/cc-main.js');
  const tmp = path.join(os.tmpdir(), 'cc-main.js');
  for (const p of [cache, tmp]) {
    try {
      return await fs.readFile(p, 'utf8');
    } catch { /* next */ }
  }
  const res = await fetch('https://orteil.dashnet.org/cookieclicker/main.js');
  if (!res.ok) throw new Error(`fetch cc main.js: ${res.status}`);
  const text = await res.text();
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(cache, text, 'utf8');
  return text;
}

const UNSHACKLE_TIER_NAMES = [
  'flavor', 'berrylium', 'blueberrylium', 'chalcedhoney', 'buttergold', 'sugarmuck', 'jetmint',
  'cherrysilver', 'hazelrald', 'mooncandy', 'astrofudge', 'alabascream', 'iridyum', 'glucosmium', 'glimmeringue',
];

function branchFor(ccName) {
  const n = ccName;
  if (
    n === 'Legacy'
    || n === 'Persistent memory'
    || n === 'Inspired checklist'
    || n === 'Genius accounting'
    || n === 'Label printer'
    || /^Permanent upgrade slot/.test(n)
  ) return 'persistent';
  if (/^(Angels|Archangels|Virtues|Dominions|Cherubim|Seraphim|God|Kitten angels|Cat ladies|Kitten wages)$/.test(n)) return 'angel';
  if (/^(Belphegor|Mammon|Abaddon|Satan|Asmodeus|Beelzebub|Lucifer|Unholy bait|Elder spice|Sacrilegious corruption|Wrinkly cookies|Stevia Caelestis|Diabetica Daemonicus|Sucralosia Inutilis|Eye of the wrinkler)$/.test(n)) return 'demon';
  if (/^(Twin Gates|Heavenly luck|Lasting fortune|Decisive fate|Lucky digit|Lucky number|Lucky payout|Golden switch|Residual luck|Distilled essence|Shimmering veil|Cosmic beginner|Reinforced membrane|Delicate touch|Steadfast murmur|Glittering edge|Fortune cookies)$/.test(n) || n.includes('luck') || n.includes('fortune') || n.includes('Shimmer') || n.includes('veil') || n.includes('membrane') || n.includes('touch') || n.includes('murmur') || n.includes('edge')) return 'golden';
  if (/^(Divine discount|Divine sales|Divine bakeries|Five-finger discount|Halo gloves|Aura gloves|Luminous gloves)$/.test(n)) return 'discount';
  if (/^(Starter kit|Starter kitchen|Heavenly cookies|Wrinkly cookies|Chimera|Heralds)$/.test(n) || n.startsWith('Box of') || n.startsWith('Tin of') || n.includes('cookies') && !n.includes('Fortune')) return 'cookie';
  if (/^(Season switcher|Starlove|Starsnow|Starspawn|Starterror|Startrade|Keepsakes|Wrapping paper)$/.test(n)) return 'season';
  if (/^(Sugar baking|Sugar craving|Sugar aging process|Sugar crystal cookies|Milkhelp)/.test(n)) return 'nectar';
  if (n.startsWith('Unshackled')) return 'unshackled';
  if (/^(Classic dairy|Fanciful dairy|Basic wallpaper|Distinguished wallpaper|Golden cookie alert|Sound test|How to bake|Pet the dragon)$/.test(n) || n.includes('dairy') || n.includes('wallpaper') || n.includes('Sound test')) return 'misc';
  if (/^(Synergies Vol\. I|Synergies Vol\. II)/.test(n)) return 'production';
  return 'misc';
}

function effectsFor(ccName) {
  const n = ccName;
  switch (n) {
    case 'Legacy': return {};
    case 'Twin Gates of Transcendence': return { offlineRate: '0.05' };
    case 'Heavenly cookies': return { allGeneratorsMult: '1.10' };
    case 'Angels':
    case 'Archangels':
    case 'Virtues':
    case 'Dominions':
    case 'Cherubim':
    case 'Seraphim':
      return { offlineRate: '0.10' };
    case 'God': return { offlineRate: '0.05' };
    case 'Belphegor': return { offlineExtraHours: 4 };
    case 'Mammon': return { offlineExtraHours: 8 };
    case 'Abaddon': return { offlineExtraHours: 16 };
    case 'Satan': return { offlineExtraHours: 32 };
    case 'Asmodeus': return { offlineExtraHours: 64 };
    case 'Beelzebub': return { offlineExtraHours: 128 };
    case 'Lucifer': return { offlineExtraHours: 256 };
    case 'Kitten angels': return { kittenVeilFactor: '0.1' };
    case 'Cat ladies': return { catLadies: true };
    case 'Kitten wages': return { kittenUpgradeDiscount: true };
    case 'Milkhelp® lactose intolerance relief tablets': return { milkhelpServants: true };
    case 'Elder spice': return { nectarReserveBonus: true };
    case 'Sacrilegious corruption': return { allGeneratorsMult: '1.05' };
    case 'Unholy bait': return {};
    case 'Eye of the wrinkler': return { allGeneratorsMult: '1.05' };
    case 'Permanent upgrade slot I': return { permanentSlot: 1 };
    case 'Permanent upgrade slot II': return { permanentSlot: 2 };
    case 'Permanent upgrade slot III': return { permanentSlot: 3 };
    case 'Permanent upgrade slot IV': return { permanentSlot: 4 };
    case 'Permanent upgrade slot V': return { permanentSlot: 5 };
    case 'Synergies Vol. I': return { synergyVolUnlock: 1 };
    case 'Synergies Vol. II': return { synergyVolUnlock: 2 };
    case 'Starter kit': return { startingGeneratorId: 'wandering_shade', startingGeneratorQty: 10 };
    case 'Starter kitchen': return { startingGeneratorId: 'charon_servants', startingGeneratorQty: 5 };
    case 'Halo gloves': return { clickTalentMult: '1.10' };
    case 'Aura gloves':
    case 'Luminous gloves':
      return { clickTalentMult: '1.05' };
    case 'Divine discount': return { generatorCostMult: '0.99' };
    case 'Divine sales': return { upgradeCostMult: '0.99' };
    case 'Divine bakeries': return { generatorCostMult: '0.99', upgradeCostMult: '0.99' };
    case 'Heavenly luck': return { shimmerLuckMult: '1.05' };
    case 'Lasting fortune': return { shimmerLuckMult: '1.02' };
    case 'Decisive fate': return { shimmerLuckMult: '1.02' };
    case 'Lucky digit': return { prestigeEffectMult: '1.01', shimmerLuckMult: '1.01' };
    case 'Lucky number': return { prestigeEffectMult: '1.01', shimmerLuckMult: '1.01' };
    case 'Lucky payout': return { prestigeEffectMult: '1.01', shimmerLuckMult: '1.01' };
    case 'Golden switch': return { goldenSwitchUnlock: true };
    case 'Season switcher': return { seasonSwitcherUnlock: true };
    case 'How to bake your dragon': return { dragonUnlock: true };
    case 'Pet the dragon': return { dragonUnlock: true };
    case 'Unshackled cursors': return { unshackleFingers: true };
    case 'Inspired checklist': return { buyAllUnlock: true, vaultUnlock: true };
    case 'Genius accounting': return { richAmort: true };
    case 'Label printer': return { labelPrinter: true };
    case 'Heralds': return { allGeneratorsMult: '1.01' };
    case 'Wrinkly cookies': return { allGeneratorsMult: '1.10' };
    case 'Sugar baking': return { nectarReserveBonus: true };
    case 'Sugar craving': return { nectarFrenzyUnlock: true };
    case 'Sugar aging process': return { nectarReserveBonus: true, nectarFrenzyUnlock: true };
    case 'Chimera':
      return { offlineRate: '0.05', offlineExtraHours: 48, upgradeCostMult: '0.99' };
    default:
      break;
  }
  if (UNSHACKLE_GEN[n]) return { unshackleGeneratorId: UNSHACKLE_GEN[n] };
  if (n.startsWith('Unshackled ') && n !== 'Unshackled cursors') {
    const tier = n.replace('Unshackled ', '');
    if (UNSHACKLE_TIER_NAMES.includes(tier)) {
      return { cosmeticId: tier === 'flavor' ? 'sabor_liberado' : tier };
    }
  }
  if (/dairy|wallpaper|Wrapping paper|Box of|Tin of/.test(n)) {
    return { cosmeticId: slugId(n) };
  }
  if (n === 'Persistent memory') return { buyAllUnlock: true };
  if (n === 'Five-finger discount') return { generatorCostMult: '0.99' };
  if (n === 'Golden cookie alert sound' || n === 'Sound test') return { cosmeticId: slugId(n) };
  return {};
}

const PT_NAMES = Object.freeze({
  Legacy: ['Legado', 'Desbloqueia o sistema de Essência de Mnemosyne e juramentos permanentes.'],
  'Twin Gates of Transcendence': ['Portões Gêmeos', 'Offline rende 5% do SPS enquanto o rio dorme.'],
  'Heavenly cookies': ['Bolachas Celestes', 'Todos os geradores produzem +10% para sempre.'],
  Angels: ['Anjos', 'Mensageiros das receitas proibidas — +10% offline.'],
  Belphegor: ['Belphegor', 'Daemon da preguiça — estende a maré offline.'],
  'Permanent upgrade slot I': ['Eco do Styx I', 'Um juramento Styx permanece selado entre corridas.'],
  'Permanent upgrade slot II': ['Eco do Styx II', 'Dois juramentos permanentes na margem.'],
  'Permanent upgrade slot III': ['Eco do Styx III', 'Três juramentos atravessam o Lethe.'],
  'Permanent upgrade slot IV': ['Eco do Styx IV', 'Quatro juramentos sobrevivem à Catábase.'],
  'Permanent upgrade slot V': ['Eco do Styx V', 'Cinco juramentos — memória máxima do rio.'],
  'Synergies Vol. I': ['Sinergias Vol. I', 'Malha Styx Vol. I (pares ≥ 15).'],
  'Synergies Vol. II': ['Sinergias Vol. II', 'Malha Styx Vol. II (pares ≥ 75).'],
  'How to bake your dragon': ['Ovo Primordial', 'Desperta o Dragão Ctoniano.'],
  'Season switcher': ['Roda das Estações', 'Seletor de estações do Submundo.'],
  Heralds: ['Eco da Turma', 'Todos os geradores +1% — os arautos sussurram.'],
});

function ptLabel(ccName) {
  if (PT_NAMES[ccName]) return PT_NAMES[ccName];
  const id = slugId(ccName);
  const title = id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return [title, `Eco celestial espelhado: ${ccName}.`];
}

function spreadAnglesByRing(talents, { ringGap = 88, rootR = 56, nodeR = 26, padding = 6 } = {}) {
  const minChord = 2 * nodeR + padding;
  const byRing = new Map();
  for (const t of talents) {
    const ring = Math.max(0, Number(t.ring) || 0);
    if (!byRing.has(ring)) byRing.set(ring, []);
    byRing.get(ring).push(t);
  }
  for (const [, list] of byRing) {
    if (list.length < 2) continue;
    const ring = Math.max(0, Number(list[0].ring) || 0);
    const r = ring === 0 ? rootR : ring * ringGap + 36;
    const ratio = Math.min(1, minChord / (2 * r));
    const minDeg = 2 * Math.asin(ratio) * (180 / Math.PI) * 1.02;
    list.sort((a, b) => Number(a.angle) - Number(b.angle));
    for (let pass = 0; pass < 64; pass += 1) {
      let moved = false;
      for (let i = 0; i < list.length - 1; i += 1) {
        const gap = Number(list[i + 1].angle) - Number(list[i].angle);
        if (gap + 1e-9 < minDeg) {
          const need = (minDeg - gap) / 2;
          list[i].angle -= need;
          list[i + 1].angle += need;
          moved = true;
        }
      }
      if (!moved) break;
    }
    for (const t of list) t.angle = Math.round(Number(t.angle) * 100) / 100;
  }
  return talents;
}

function assignBaseAngle(branch, indexInBranch, totalInBranch) {
  const ranges = {
    misc: [-20, 20],
    persistent: [-20, 20],
    angel: [-100, -50],
    demon: [50, 100],
    golden: [-40, -10],
    discount: [-40, -10],
    production: [10, 40],
    cookie: [10, 40],
    season: [110, 140],
    nectar: [110, 140],
    unshackled: [-140, -110],
  };
  let [lo, hi] = ranges[branch] || [-20, 20];
  if (branch === 'unshackled' && indexInBranch % 2 === 1) {
    lo = 110;
    hi = 140;
  }
  const t = totalInBranch <= 1 ? 0.5 : indexInBranch / (totalInBranch - 1);
  return lo + (hi - lo) * t;
}

function bfsRings(talents, rootId = 'legado') {
  const byId = Object.fromEntries(talents.map((t) => [t.id, t]));
  for (const t of talents) {
    if (t.id === rootId) {
      t.ring = 0;
      t.requires = {};
    } else if (!t.requires?.talentIds?.length) {
      t.requires = { talentIds: [rootId] };
    }
  }
  const dist = { [rootId]: 0 };
  let q = [rootId];
  while (q.length) {
    const nextQ = [];
    for (const id of q) {
      for (const t of talents) {
        const need = t.requires?.talentIds || [];
        if (!need.includes(id)) continue;
        if (need.every((pid) => dist[pid] != null)) {
          const d = Math.max(...need.map((pid) => dist[pid])) + 1;
          if (dist[t.id] == null || d < dist[t.id]) {
            dist[t.id] = d;
            nextQ.push(t.id);
          }
        }
      }
    }
    q = nextQ;
  }
  for (const t of talents) {
    t.ring = dist[t.id] ?? 99;
    if (t.ring === 99) throw new Error(`talento desconexo: ${t.id} (${t.ccName})`);
  }
}

function buildHeavenly(ccMeta) {
  const ccToId = new Map();
  for (const ccName of CC_ORDER) {
    ccToId.set(ccName, slugId(ccName));
  }
  for (const [cc, id] of Object.entries(CC_ID_OVERRIDE)) ccToId.set(cc, id);

  /** @type {import('../js/hades-despertar/config/talents.js').TalentDef[]} */
  const raw = CC_ORDER.map((ccName) => {
    const meta = ccMeta.get(ccName) || ccMeta.get(ccAlias(ccName));
    if (!meta) throw new Error(`CC meta ausente: ${ccName}`);
    const id = ccToId.get(ccName);
    const branch = branchFor(ccName);
    const [name, blurb] = ptLabel(ccName);
    let parentCc = [...(meta.parents || [])];
    if (ccName !== 'Legacy' && parentCc.length === 0) parentCc = ['Legacy'];
    const talentIds = parentCc.map((p) => ccToId.get(p) || slugId(p));
    const cost = ccCost(ccName);
    return {
      id,
      ccName,
      name,
      blurb,
      cost,
      branch,
      ring: 0,
      angle: 0,
      icon: id,
      requires: talentIds.length ? { talentIds } : {},
      effects: effectsFor(ccName),
      status: OLD_RIVER_IDS.includes(id) ? 'keep' : (Object.values(CC_ID_OVERRIDE).includes(id) ? 'keep' : 'new'),
    };
  });

  bfsRings(raw);
  const branchCounts = {};
  for (const t of raw) {
    branchCounts[t.branch] = (branchCounts[t.branch] || 0) + 1;
  }
  const branchIdx = {};
  for (const t of raw) {
    const i = branchIdx[t.branch] || 0;
    branchIdx[t.branch] = i + 1;
    t.angle = assignBaseAngle(t.branch, i, branchCounts[t.branch]);
  }
  return spreadAnglesByRing(raw);
}

function effectsSummary(effects) {
  return Object.entries(effects || {})
    .map(([k, v]) => (typeof v === 'object' ? `${k}` : `${k}=${v}`))
    .join(', ') || '—';
}

function phpExportEffects(effects) {
  const parts = [];
  for (const [k, v] of Object.entries(effects || {})) {
    if (typeof v === 'boolean') parts.push(`'${k}' => ${v ? 'true' : 'false'}`);
    else if (typeof v === 'number') parts.push(`'${k}' => ${v}`);
    else if (typeof v === 'object' && v !== null) {
      const inner = Object.entries(v).map(([gk, gv]) => `'${gk}' => ${Number(gv)}`).join(', ');
      parts.push(`'${k}' => [${inner}]`);
    } else parts.push(`'${k}' => '${String(v).replace(/'/g, "\\'")}'`);
  }
  return `[${parts.join(', ')}]`;
}

function phpTalentBlock(talents) {
  const lines = talents.map((t) => {
    const req = (t.requires?.talentIds || []).map((id) => `'${id}'`).join(', ');
    return `        '${t.id}' => ['id' => '${t.id}', 'cost' => '${t.cost}', 'branch' => '${t.branch}', 'ring' => ${t.ring}, 'angle' => ${t.angle}, 'requires' => [${req}], 'effects' => ${phpExportEffects(t.effects)}],`;
  });
  return `    public const TALENTS = [\n${lines.join('\n')}\n    ];`;
}

function jsLiteral(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((v) => `${pad}  ${jsLiteral(v, indent + 1)}`).join(',\n')},\n${pad}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return `{\n${keys.map((k) => `${pad}  ${k}: ${jsLiteral(value[k], indent + 1)}`).join(',\n')},\n${pad}}`;
  }
  return JSON.stringify(value);
}

/** Custos de refund do Rio do Lethe (nós removidos) — não inclui ids Heavenly atuais. */
const RIVER_LEGACY_COSTS = Object.freeze({
  memoria_das_sombras: '1',
  juramento_eterno: '1',
  noite_prolongada: '2',
  veu_eficiente: '2',
  foice_ancestral: '3',
  favor_de_caronte: '3',
  margem_generosa: '3',
  pacto_do_silencio: '3',
  olho_da_curva: '4',
  eco_do_styx: '4',
  mnemosyne_profunda: '5',
  segundo_folego: '5',
  margem_generosa: '3',
  nectar_em_reserva: '5',
  ovo_primordial: '5',
  rebanho_despertado: '5',
  matilha_cerberiana: '6',
  eco_ressonante: '6',
  calice_da_memoria: '7',
  mnemosyne_tripla: '8',
  frenesi_de_nectar_talento: '8',
  eco_ancestral_iii: '9',
  forja_despertada: '10',
  eco_ancestral_iv: '12',
  eco_ancestral_v: '15',
  rodizio_das_estacoes: '5',
  preludio_ctoniano: '4',
  lamina_viva: '5',
  mare_inicial: '7',
  legado_do_rio: '6',
  sinergias_vol_i: '8',
  sinergias_vol_ii: '25',
});

function buildLegacyMaps() {
  const legacyCosts = { ...RIVER_LEGACY_COSTS };
  const legacyMap = { ...LEGACY_TALENT_MAP_MANUAL };
  for (const oldId of OLD_RIVER_IDS) {
    if (legacyMap[oldId] === undefined) legacyMap[oldId] = null;
    if (legacyCosts[oldId] == null && RIVER_LEGACY_COSTS[oldId]) {
      legacyCosts[oldId] = RIVER_LEGACY_COSTS[oldId];
    }
  }
  return { legacyCosts, legacyMap };
}

function phpLegacyBlock(legacyCosts, legacyMap) {
  const costLines = Object.entries(legacyCosts).map(
    ([k, v]) => `        '${k}' => '${v}',`,
  );
  const mapLines = Object.entries(legacyMap).map(([k, v]) => {
    if (v === null) return `        '${k}' => null,`;
    return `        '${k}' => '${v}',`;
  });
  return {
    costs: `    public const LEGACY_TALENT_COSTS = [\n${costLines.join('\n')}\n    ];`,
    map: `    public const LEGACY_TALENT_MAP = [\n${mapLines.join('\n')}\n    ];`,
  };
}

async function patchPhpLegacy(legacyCosts, legacyMap) {
  const src = await fs.readFile(PHP_PATH, 'utf8');
  const { costs, map } = phpLegacyBlock(legacyCosts, legacyMap);
  const legacyCostsRe =
    /    public const LEGACY_TALENT_COSTS = \[[\s\S]*?\r?\n    \];\r?\n\r?\n    public const LEGACY_TALENT_MAP/;
  const verdictRe =
    /    public const VERDICT_SHOP = \[[\s\S]*?\r?\n    \];\r?\n\r?\n    public const SHIMMER_EFFECTS/;
  const legacyMapRe =
    /    public const LEGACY_TALENT_MAP = \[[\s\S]*?\r?\n    \];\r?\n\r?\n    public const VERDICT_SHOP = \[[\s\S]*?\r?\n    \];\r?\n\r?\n    public const SHIMMER_EFFECTS/;
  const verdictBlockMatch = src.match(/    public const VERDICT_SHOP = \[[\s\S]*?\r?\n    \];/);
  if (!verdictBlockMatch) {
    throw new Error('Não encontrou VERDICT_SHOP entre LEGACY_TALENT_MAP e SHIMMER_EFFECTS no PHP');
  }
  const verdictBlock = verdictBlockMatch[0];
  let next = src.replace(
    legacyCostsRe,
    () => `${costs}\n\n    public const LEGACY_TALENT_MAP`,
  );
  if (next === src) {
    const fallbackCosts = /    public const LEGACY_TALENT_COSTS = \[[\s\S]*?\r?\n    \];/;
    if (!fallbackCosts.test(src)) throw new Error('Não encontrou LEGACY_TALENT_COSTS no PHP');
    next = src.replace(fallbackCosts, () => costs);
  }
  let next2 = next.replace(
    legacyMapRe,
    () => `${map}\n\n${verdictBlock}\n\n    public const SHIMMER_EFFECTS`,
  );
  if (next2 === next) {
    const fallbackMap =
      /    public const LEGACY_TALENT_MAP = \[[\s\S]*?\r?\n    \];\r?\n\r?\n    public const SHIMMER_EFFECTS/;
    if (fallbackMap.test(next)) {
      next2 = next.replace(fallbackMap, () => `${map}\n\n${verdictBlock}\n\n    public const SHIMMER_EFFECTS`);
    } else {
      const legacyOnly = /    public const LEGACY_TALENT_MAP = \[[\s\S]*?\r?\n    \];/;
      if (!legacyOnly.test(next)) throw new Error('Não encontrou LEGACY_TALENT_MAP no PHP');
      next2 = next.replace(legacyOnly, () => `${map}\n\n${verdictBlock}`);
    }
  }
  if (next2 === next && !verdictRe.test(next)) {
    throw new Error('Patch LEGACY_TALENT_MAP falhou — VERDICT_SHOP/SHIMMER ausente');
  }
  next = next2;
  if (next !== src) await fs.writeFile(PHP_PATH, next, 'utf8');
}

function buildTalentsJs(talents) {
  const { legacyCosts, legacyMap } = buildLegacyMaps();
  const exportTalents = talents.map(({ ccName, status, ...t }) => t);

  return `/**
 * Árvore Heavenly — paridade Cookie Clicker PrestigeUpgrades (129).
 * Compra com Essência de Mnemosyne pós-Ritual. Permanece após Lethe.
 * Gerado por scripts/gen-heavenly-talent-catalog.mjs — não editar TALENTS à mão.
 */

function freezeRequires(requires = {}) {
  const next = { ...requires };
  if (Array.isArray(requires.talentIds)) {
    next.talentIds = Object.freeze([...requires.talentIds]);
  }
  return Object.freeze(next);
}

function freezeEffects(effects = {}) {
  const next = { ...effects };
  if (effects.startingGeneratorBonus && typeof effects.startingGeneratorBonus === 'object') {
    next.startingGeneratorBonus = Object.freeze({ ...effects.startingGeneratorBonus });
  }
  return Object.freeze(next);
}

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({
    ...item,
    effects: freezeEffects(item.effects || {}),
    requires: freezeRequires(item.requires || {}),
  })));
}

/**
 * @typedef {'persistent'|'angel'|'demon'|'production'|'golden'|'discount'|'cookie'|'season'|'nectar'|'unshackled'|'misc'} TalentBranch
 * @typedef {{
 *   id: string,
 *   name: string,
 *   blurb: string,
 *   cost: string,
 *   branch: TalentBranch,
 *   ring: number,
 *   angle: number,
 *   icon: string,
 *   requires: { talentIds?: string[] },
 *   effects: Record<string, unknown>,
 * }} TalentDef
 */

/** @type {TalentDef[]} */
export const TALENTS = freezeAll(${jsLiteral(exportTalents, 0)});

export const TALENT_IDS = Object.freeze(TALENTS.map((item) => item.id));

export const TALENT_BY_ID = Object.freeze(
  Object.fromEntries(TALENTS.map((item) => [item.id, item])),
);

export const TALENT_BRANCHES = Object.freeze({
  persistent: Object.freeze({ id: 'persistent', label: 'PERSISTENTE' }),
  angel: Object.freeze({ id: 'angel', label: 'ANJOS' }),
  demon: Object.freeze({ id: 'demon', label: 'DAEMÔNIO' }),
  production: Object.freeze({ id: 'production', label: 'PRODUÇÃO' }),
  golden: Object.freeze({ id: 'golden', label: 'DOURADO' }),
  discount: Object.freeze({ id: 'discount', label: 'DESCONTO' }),
  cookie: Object.freeze({ id: 'cookie', label: 'BOLACHAS' }),
  season: Object.freeze({ id: 'season', label: 'ESTAÇÕES' }),
  nectar: Object.freeze({ id: 'nectar', label: 'NÉCTAR' }),
  unshackled: Object.freeze({ id: 'unshackled', label: 'LIBERTO' }),
  misc: Object.freeze({ id: 'misc', label: 'MISC' }),
});

/** Custos legados (Rio do Lethe) para refund quando id sumir ou mapear para null. */
export const LEGACY_TALENT_COSTS = Object.freeze(${jsLiteral(legacyCosts, 0)});

/** IDs antigos do Rio → nós Heavenly (null = só refund). */
export const LEGACY_TALENT_MAP = Object.freeze(${jsLiteral(legacyMap, 0)});

export function getTalent(id) {
  return TALENT_BY_ID[id] ?? null;
}

export function isKnownTalentId(id) {
  return Object.prototype.hasOwnProperty.call(TALENT_BY_ID, id);
}

export function meetsTalentRequirement(talent, { talents = [] } = {}) {
  if (!talent) return false;
  const owned = new Set((talents || []).map((id) => String(id)));
  const need = talent.requires?.talentIds;
  if (!Array.isArray(need) || need.length === 0) return true;
  return need.every((id) => owned.has(id));
}

export function talentNodePosition(talent, { cx = 0, cy = 0, ringGap = 88, rootR = 56 } = {}) {
  const ring = Math.max(0, Number(talent?.ring) || 0);
  const angleDeg = Number(talent?.angle) || 0;
  const rad = (angleDeg * Math.PI) / 180;
  const r = ring === 0 ? rootR : ring * ringGap + 36;
  return {
    x: cx + Math.sin(rad) * r,
    y: cy - Math.cos(rad) * r,
    r,
    angleDeg,
  };
}
`;
}

async function patchPhp(talents) {
  const src = await fs.readFile(PHP_PATH, 'utf8');
  const re =
    /    public const TALENTS = \[[\s\S]*?\n    \];\r?\n\r?\n    public const LEGACY_TALENT_COSTS/;
  if (!re.test(src)) throw new Error('Não encontrou public const TALENTS para patch');
  const block = phpTalentBlock(talents);
  const next = src.replace(re, () => `${block}\n\n    public const LEGACY_TALENT_COSTS`);
  if (next !== src) await fs.writeFile(PHP_PATH, next, 'utf8');
}

async function writeMapDoc(talents) {
  const lines = [
    '# Mapa Heavenly — Cookie Clicker → O Despertar',
    '',
    `Gerado em ${new Date().toISOString().slice(0, 10)} por \`scripts/gen-heavenly-talent-catalog.mjs\` (${talents.length} nós).`,
    '',
    '| CC name | id | branch | cost | requires | effects | status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const t of talents) {
    const req = (t.requires?.talentIds || []).join(', ') || '—';
    lines.push(`| ${t.ccName} | ${t.id} | ${t.branch} | ${t.cost} | ${req} | ${effectsSummary(t.effects)} | ${t.status || 'new'} |`);
  }
  await fs.writeFile(MAP_DOC, `${lines.join('\n')}\n`, 'utf8');
}

const HEAVENLY_POWER_UPGRADES = [
  { id: 'segredo_do_obolo', name: 'Segredo do Óbolo', blurb: 'Desbloqueia 5% da potência de prestígio na corrida.', cost: '11', kind: 'heavenlyPower', factor: '0.05', requires: { talentId: 'legado' } },
  { id: 'banca_do_obolo', name: 'Banca do Óbolo', blurb: 'Potência de prestígio +20% (acumula).', cost: '1111', kind: 'heavenlyPower', factor: '0.20', requires: { upgradeId: 'segredo_do_obolo' } },
  { id: 'forja_do_obolo', name: 'Forja do Óbolo', blurb: 'Potência de prestígio +25%.', cost: '111111', kind: 'heavenlyPower', factor: '0.25', requires: { upgradeId: 'banca_do_obolo' } },
  { id: 'confeitaria_do_obolo', name: 'Confeitaria do Óbolo', blurb: 'Potência de prestígio +25%.', cost: '11111111', kind: 'heavenlyPower', factor: '0.25', requires: { upgradeId: 'forja_do_obolo' } },
  { id: 'chave_do_obolo', name: 'Chave do Óbolo', blurb: 'Potência de prestígio +25% — escada completa.', cost: '1111111111', kind: 'heavenlyPower', factor: '0.25', requires: { upgradeId: 'confeitaria_do_obolo' } },
];

async function patchHeavenlyPowerUpgrades() {
  const src = await fs.readFile(UPGRADES_JS, 'utf8');
  const missing = HEAVENLY_POWER_UPGRADES.filter(
    (u) => !src.includes(`id: '${u.id}'`) && !src.includes(`id: "${u.id}"`),
  );
  if (missing.length === 0) {
    console.log('heavenlyPower upgrades já presentes em upgrades.js');
    return;
  }
  const block = missing.map((u) => `  ${jsLiteral(u, 1).split('\n').join('\n  ')},`).join('\n');
  const patched = src.replace(
    /(requires: \{ fortuneId: 'fortune_gen_the_emperor' \},\r?\n  \},\r?\n)(\]\);)/,
    `$1${block}\r\n$2`,
  );
  if (patched === src) throw new Error('Não encontrou fechamento UPGRADES em upgrades.js');
  await fs.writeFile(UPGRADES_JS, patched, 'utf8');
  console.log(' appended heavenlyPower upgrades:', missing.map((u) => u.id).join(', '));

  const phpSrc = await fs.readFile(PHP_PATH, 'utf8');
  const phpLines = missing.map((u) => {
    const req = u.requires.talentId
      ? `['talentId' => '${u.requires.talentId}']`
      : `['upgradeId' => '${u.requires.upgradeId}']`;
    return `        ['id' => '${u.id}', 'cost' => '${u.cost}', 'kind' => '${u.kind}', 'factor' => '${u.factor}', 'requires' => ${req}],`;
  }).join('\n');
  const phpNext = phpSrc.replace(
    /(\['id' => 'fortune_gen_the_emperor'[\s\S]*?\],\r?\n)(    \];)/,
    `$1${phpLines}\r\n$2`,
  );
  if (phpNext === phpSrc) {
    console.warn('AVISO: não patchou UPGRADES PHP — inserir heavenlyPower manualmente');
  } else {
    await fs.writeFile(PHP_PATH, phpNext, 'utf8');
    console.log(' patched heavenlyPower in DespertarCatalog.php UPGRADES');
  }
}

async function main() {
  if (CC_ORDER.length !== 129) {
    throw new Error(`CC_ORDER deve ter 129 entradas (tem ${CC_ORDER.length})`);
  }
  if (Object.keys(CC_COST_BY_NAME).length !== 129) {
    throw new Error(`CC_COST_BY_NAME deve ter 129 entradas (tem ${Object.keys(CC_COST_BY_NAME).length})`);
  }
  for (const name of CC_ORDER) ccCost(name);
  const ccMain = await loadCcMain();
  const ccMeta = buildCcMetaFromMain(ccMain);
  for (const name of CC_ORDER) {
    if (!ccMeta.has(name) && !ccMeta.has(ccAlias(name))) {
      throw new Error(`meta CC faltando: ${name}`);
    }
  }

  const HEAVENLY = buildHeavenly(ccMeta);
  if (HEAVENLY.length !== 129) throw new Error(`HEAVENLY.length=${HEAVENLY.length}`);

  const ids = new Set();
  const ccNames = new Set();
  for (const t of HEAVENLY) {
    if (ids.has(t.id)) throw new Error(`id duplicado: ${t.id}`);
    if (ccNames.has(t.ccName)) throw new Error(`ccName duplicado: ${t.ccName}`);
    if (!/^\d+$/.test(t.cost)) throw new Error(`custo não-inteiro: ${t.id}=${t.cost}`);
    ids.add(t.id);
    ccNames.add(t.ccName);
  }
  if (HEAVENLY.find((t) => t.id === 'angels')?.cost !== '7') {
    throw new Error(`Angels cost esperado 7, got ${HEAVENLY.find((t) => t.id === 'angels')?.cost}`);
  }
  if (HEAVENLY.find((t) => t.id === 'permanent_slot_i')?.cost !== '100') {
    throw new Error(`permanent_slot_i cost esperado 100, got ${HEAVENLY.find((t) => t.id === 'permanent_slot_i')?.cost}`);
  }

  await fs.writeFile(JS_OUT, buildTalentsJs(HEAVENLY), 'utf8');
  const { legacyCosts, legacyMap } = buildLegacyMaps();
  await patchPhp(HEAVENLY.map(({ ccName, status, ...t }) => t));
  await patchPhpLegacy(legacyCosts, legacyMap);
  await writeMapDoc(HEAVENLY);
  await patchHeavenlyPowerUpgrades();

  console.log('HEAVENLY', HEAVENLY.length);
  console.log('wrote', path.relative(root, JS_OUT));
  console.log('wrote', path.relative(root, MAP_DOC));
  console.log('patched TALENTS in DespertarCatalog.php');
  console.log('sample costs (first 30):');
  for (const t of HEAVENLY.slice(0, 30)) {
    console.log(`  ${t.ccName} → ${t.id} = ${t.cost} [${t.branch}]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
