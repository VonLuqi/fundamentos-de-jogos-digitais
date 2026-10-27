/**
 * Rio do Lethe — árvore permanente de Mnemosyne (3 vertentes).
 * Compra só com ascensionOpen (pós-Ritual). Sem reset no Lethe.
 * Gerado por scripts/gen-talent-river-catalog.mjs — não editar à mão o array TALENTS.
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
 * @typedef {'margem'|'imperio'|'memoria'} TalentBranch
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
export const TALENTS = freezeAll([
  {
    id: "memoria_das_sombras",
    name: "Memória das Sombras",
    blurb: "Começa cada corrida com 5 000 almas na margem.",
    cost: "1",
    branch: "margem",
    ring: 0,
    angle: -95,
    icon: "memoria_das_sombras",
    requires: {},
    effects: {
      startingSouls: "5000",
    },
  },
  {
    id: "foice_ancestral",
    name: "Foice Ancestral",
    blurb: "Cada clique rouba +1% do teu SPS.",
    cost: "15",
    branch: "margem",
    ring: 1,
    angle: -115,
    icon: "foice_ancestral",
    requires: {
      talentIds: [
        "memoria_das_sombras",
      ],
    },
    effects: {
      kSps: "0.01",
    },
  },
  {
    id: "margem_generosa",
    name: "Margem Generosa",
    blurb: "+25 000 almas ao despertar de cada corrida.",
    cost: "15",
    branch: "margem",
    ring: 1,
    angle: -75,
    icon: "margem_generosa",
    requires: {
      talentIds: [
        "memoria_das_sombras",
      ],
    },
    effects: {
      startingSouls: "25000",
    },
  },
  {
    id: "preludio_ctoniano",
    name: "Prelúdio Ctoniano",
    blurb: "+15 000 almas iniciais — o rio reconhece teu nome.",
    cost: "100",
    branch: "margem",
    ring: 2,
    angle: -95,
    icon: "preludio_ctoniano",
    requires: {
      talentIds: [
        "memoria_das_sombras",
      ],
    },
    effects: {
      startingSouls: "15000",
    },
  },
  {
    id: "segundo_folego",
    name: "Segundo Fôlego",
    blurb: "Acorda com 5 Sombras Vagantes já na margem.",
    cost: "125",
    branch: "margem",
    ring: 2,
    angle: -70,
    icon: "segundo_folego",
    requires: {
      talentIds: [
        "margem_generosa",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 5,
    },
  },
  {
    id: "lamina_viva",
    name: "Lâmina Viva",
    blurb: "+50 000 almas iniciais — a foice canta antes do primeiro corte.",
    cost: "125",
    branch: "margem",
    ring: 2,
    angle: -120,
    icon: "lamina_viva",
    requires: {
      talentIds: [
        "foice_ancestral",
      ],
    },
    effects: {
      startingSouls: "50000",
    },
  },
  {
    id: "rebanho_despertado",
    name: "Rebanho",
    blurb: "25 Sombras Vagantes ao começar a corrida (substitui o Fôlego).",
    cost: "500",
    branch: "margem",
    ring: 3,
    angle: -65,
    icon: "rebanho_despertado",
    requires: {
      talentIds: [
        "segundo_folego",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 25,
    },
  },
  {
    id: "mare_inicial",
    name: "Maré Inicial",
    blurb: "+75 000 almas iniciais se a foice e o prelúdio já fluem.",
    cost: "700",
    branch: "margem",
    ring: 3,
    angle: -105,
    icon: "mare_inicial",
    requires: {
      talentIds: [
        "preludio_ctoniano",
        "foice_ancestral",
      ],
    },
    effects: {
      startingSouls: "75000",
    },
  },
  {
    id: "torrente_das_umbras",
    name: "Torrente das Umbras",
    blurb: "50 Sombras Vagantes no despertar — a margem vira legião.",
    cost: "5000",
    branch: "margem",
    ring: 4,
    angle: -85,
    icon: "torrente_das_umbras",
    requires: {
      talentIds: [
        "rebanho_despertado",
        "lamina_viva",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 50,
    },
  },
  {
    id: "favor_de_caronte",
    name: "Favor de Caronte",
    blurb: "Geradores custam 15% menos almas.",
    cost: "3",
    branch: "imperio",
    ring: 0,
    angle: 0,
    icon: "favor_de_caronte",
    requires: {},
    effects: {
      generatorCostMult: "0.85",
    },
  },
  {
    id: "olho_da_curva",
    name: "Olho da Curva",
    blurb: "Revela a amortização rica na Estela.",
    cost: "20",
    branch: "imperio",
    ring: 1,
    angle: -27.59,
    icon: "olho_da_curva",
    requires: {
      talentIds: [
        "favor_de_caronte",
      ],
    },
    effects: {
      richAmort: true,
    },
  },
  {
    id: "nectar_em_reserva",
    name: "Néctar em Reserva",
    blurb: "Ativa o bônus de Reserva de Néctar no SPS.",
    cost: "25",
    branch: "imperio",
    ring: 1,
    angle: 27.59,
    icon: "nectar_em_reserva",
    requires: {
      talentIds: [
        "favor_de_caronte",
      ],
    },
    effects: {
      nectarReserveBonus: true,
    },
  },
  {
    id: "servo_das_margens",
    name: "Servo das Margens",
    blurb: "Começa com 3 Servos de Caronte.",
    cost: "20",
    branch: "imperio",
    ring: 1,
    angle: 0,
    icon: "servo_das_margens",
    requires: {
      talentIds: [
        "favor_de_caronte",
      ],
    },
    effects: {
      startingGeneratorId: "charon_servants",
      startingGeneratorQty: 3,
    },
  },
  {
    id: "matilha_cerberiana",
    name: "Matilha Cerberiana",
    blurb: "3 Cães Cerberianos no despertar.",
    cost: "150",
    branch: "imperio",
    ring: 2,
    angle: -23.02,
    icon: "matilha_cerberiana",
    requires: {
      talentIds: [
        "olho_da_curva",
      ],
    },
    effects: {
      startingGeneratorId: "cerberian_hound",
      startingGeneratorQty: 3,
    },
  },
  {
    id: "ovo_primordial",
    name: "Ovo Primordial",
    blurb: "Desbloqueia o Dragão Ctoniano (Pitão → Ladão).",
    cost: "125",
    branch: "imperio",
    ring: 2,
    angle: 22,
    icon: "ovo_primordial",
    requires: {
      talentIds: [
        "favor_de_caronte",
      ],
    },
    effects: {
      dragonUnlock: true,
    },
  },
  {
    id: "forja_despertada",
    name: "Forja Despertada",
    blurb: "1 Forja do Flegetonte no início da corrida.",
    cost: "250",
    branch: "imperio",
    ring: 2,
    angle: -6.98,
    icon: "forja_despertada",
    requires: {
      talentIds: [
        "matilha_cerberiana",
      ],
    },
    effects: {
      startingGeneratorId: "phlegethon_forge",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "frenesi_de_nectar_talento",
    name: "Cálice do Frenesi",
    blurb: "Desbloqueia o Frenesi de Néctar manual.",
    cost: "800",
    branch: "imperio",
    ring: 3,
    angle: 20,
    icon: "frenesi_de_nectar_talento",
    requires: {
      talentIds: [
        "nectar_em_reserva",
      ],
    },
    effects: {
      nectarFrenzyUnlock: true,
    },
  },
  {
    id: "trono_sombrio",
    name: "Trono Sombrio",
    blurb: "1 Trono de Obsidiana ao despertar.",
    cost: "1200",
    branch: "imperio",
    ring: 3,
    angle: -15,
    icon: "trono_sombrio",
    requires: {
      talentIds: [
        "forja_despertada",
      ],
    },
    effects: {
      startingGeneratorId: "obsidian_throne",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "imperio_fluvial",
    name: "Império Fluvial",
    blurb: "O rio carrega forja e matilha: +2 Cães e +1 Forja no despertar.",
    cost: "7500",
    branch: "imperio",
    ring: 4,
    angle: 0,
    icon: "imperio_fluvial",
    requires: {
      talentIds: [
        "frenesi_de_nectar_talento",
        "ovo_primordial",
      ],
    },
    effects: {
      startingGeneratorBonus: {
        cerberian_hound: 2,
        phlegethon_forge: 1,
      },
    },
  },
  {
    id: "juramento_eterno",
    name: "Juramento Eterno",
    blurb: "Óbolos rendem +25% no multiplicador de prestígio.",
    cost: "1",
    branch: "memoria",
    ring: 0,
    angle: 95,
    icon: "juramento_eterno",
    requires: {},
    effects: {
      mnemosyneMult: "1.25",
    },
  },
  {
    id: "noite_prolongada",
    name: "Noite Prolongada",
    blurb: "Teto base offline sobe para 12h (em vez de 8). Extras ainda somam.",
    cost: "10",
    branch: "memoria",
    ring: 1,
    angle: 67.41,
    icon: "noite_prolongada",
    requires: {
      talentIds: [
        "juramento_eterno",
      ],
    },
    effects: {
      offlineHours: 12,
    },
  },
  {
    id: "veu_eficiente",
    name: "Véu Eficiente",
    blurb: "Offline rende 100% do SPS (em vez de 80%).",
    cost: "10",
    branch: "memoria",
    ring: 1,
    angle: 122.59,
    icon: "veu_eficiente",
    requires: {
      talentIds: [
        "juramento_eterno",
      ],
    },
    effects: {
      offlineEfficiency: "1.00",
    },
  },
  {
    id: "eco_do_styx",
    name: "Eco do Styx",
    blurb: "Após o Lethe, 1 juramento Styx elegível volta selado.",
    cost: "20",
    branch: "memoria",
    ring: 1,
    angle: 95,
    icon: "eco_do_styx",
    requires: {
      talentIds: [
        "juramento_eterno",
      ],
    },
    effects: {
      softPrestigeStyx: true,
    },
  },
  {
    id: "pacto_do_silencio",
    name: "Pacto do Silêncio",
    blurb: "+6h ao teto offline (soma com a base).",
    cost: "75",
    branch: "memoria",
    ring: 2,
    angle: 64.52,
    icon: "pacto_do_silencio",
    requires: {
      talentIds: [
        "noite_prolongada",
      ],
    },
    effects: {
      offlineExtraHours: 6,
    },
  },
  {
    id: "mnemosyne_profunda",
    name: "Mnemosyne Profunda",
    blurb: "Óbolos ×1,5 no bônus de prestígio.",
    cost: "125",
    branch: "memoria",
    ring: 2,
    angle: 96.6,
    icon: "mnemosyne_profunda",
    requires: {
      talentIds: [
        "juramento_eterno",
      ],
    },
    effects: {
      mnemosyneMult: "1.50",
    },
  },
  {
    id: "sinergias_vol_i",
    name: "Sinergias Vol. I",
    blurb: "Desbloqueia a malha Styx de sinergias Vol. I (qty ≥ 15 nos pares).",
    cost: "200",
    branch: "memoria",
    ring: 2,
    angle: 80.56,
    icon: "sinergias_vol_i",
    requires: {
      talentIds: [
        "juramento_eterno",
      ],
    },
    effects: {
      synergyVolUnlock: 1,
    },
  },
  {
    id: "eco_ressonante",
    name: "Eco Ressonante",
    blurb: "Eco do Styx guarda 2 juramentos após o Lethe.",
    cost: "150",
    branch: "memoria",
    ring: 2,
    angle: 128.68,
    icon: "eco_ressonante",
    requires: {
      talentIds: [
        "eco_do_styx",
      ],
    },
    effects: {
      softPrestigeStyxCount: 2,
    },
  },
  {
    id: "rodizio_das_estacoes",
    name: "Roda das Estações",
    blurb: "Desbloqueia o seletor de Estações do Submundo.",
    cost: "125",
    branch: "memoria",
    ring: 2,
    angle: 112.64,
    icon: "rodizio_das_estacoes",
    requires: {
      talentIds: [
        "veu_eficiente",
      ],
    },
    effects: {
      seasonSwitcherUnlock: true,
    },
  },
  {
    id: "legado_do_rio",
    name: "Legado do Rio",
    blurb: "+4h ao teto offline se o véu e o pacto já fluem.",
    cost: "600",
    branch: "memoria",
    ring: 3,
    angle: 80,
    icon: "legado_do_rio",
    requires: {
      talentIds: [
        "pacto_do_silencio",
        "veu_eficiente",
      ],
    },
    effects: {
      offlineExtraHours: 4,
    },
  },
  {
    id: "calice_da_memoria",
    name: "Cálice da Memória",
    blurb: "Essência ganha no ritual ×1,5.",
    cost: "700",
    branch: "memoria",
    ring: 3,
    angle: 94.34,
    icon: "calice_da_memoria",
    requires: {
      talentIds: [
        "mnemosyne_profunda",
      ],
    },
    effects: {
      mnemosyneGainMult: "1.5",
    },
  },
  {
    id: "eco_ancestral_iii",
    name: "Eco do Styx III",
    blurb: "3 juramentos Styx sobrevivem ao Lethe.",
    cost: "900",
    branch: "memoria",
    ring: 3,
    angle: 125,
    icon: "eco_ancestral_iii",
    requires: {
      talentIds: [
        "eco_ressonante",
      ],
    },
    effects: {
      softPrestigeStyxCount: 3,
    },
  },
  {
    id: "mnemosyne_tripla",
    name: "Mnemosyne Tripla",
    blurb: "Óbolos ×2 no bônus de prestígio.",
    cost: "800",
    branch: "memoria",
    ring: 3,
    angle: 105.66,
    icon: "mnemosyne_tripla",
    requires: {
      talentIds: [
        "calice_da_memoria",
      ],
    },
    effects: {
      mnemosyneMult: "2",
    },
  },
  {
    id: "eco_ancestral_iv",
    name: "Eco do Styx IV",
    blurb: "4 juramentos Styx após cada Catábase.",
    cost: "6000",
    branch: "memoria",
    ring: 4,
    angle: 120,
    icon: "eco_ancestral_iv",
    requires: {
      talentIds: [
        "eco_ancestral_iii",
      ],
    },
    effects: {
      softPrestigeStyxCount: 4,
    },
  },
  {
    id: "eco_ancestral_v",
    name: "Eco do Styx V",
    blurb: "5 juramentos Styx — memória máxima do rio.",
    cost: "7500",
    branch: "memoria",
    ring: 4,
    angle: 130,
    icon: "eco_ancestral_v",
    requires: {
      talentIds: [
        "eco_ancestral_iv",
      ],
    },
    effects: {
      softPrestigeStyxCount: 5,
    },
  },
  {
    id: "mnemosyne_raiz",
    name: "Raiz de Mnemosyne",
    blurb: "Óbolos ×2,5 no bônus — a raiz do rio.",
    cost: "10000",
    branch: "memoria",
    ring: 4,
    angle: 100,
    icon: "mnemosyne_raiz",
    requires: {
      talentIds: [
        "mnemosyne_tripla",
        "calice_da_memoria",
      ],
    },
    effects: {
      mnemosyneMult: "2.5",
    },
  },
  {
    id: "foice_afilada_rio",
    name: "Foice Afilada",
    blurb: "Clique rouba +2% do SPS.",
    cost: "1800",
    branch: "margem",
    ring: 3,
    angle: -125,
    icon: "foice_afilada_rio",
    requires: {
      talentIds: [
        "lamina_viva",
      ],
    },
    effects: {
      kSps: "0.02",
    },
  },
  {
    id: "almas_centenas",
    name: "Almas das Centenas",
    blurb: "+100 000 almas ao despertar.",
    cost: "11000",
    branch: "margem",
    ring: 4,
    angle: -110,
    icon: "almas_centenas",
    requires: {
      talentIds: [
        "mare_inicial",
      ],
    },
    effects: {
      startingSouls: "100000",
    },
  },
  {
    id: "sombra_centuria",
    name: "Centúria de Sombras",
    blurb: "100 Sombras Vagantes no despertar.",
    cost: "70000",
    branch: "margem",
    ring: 5,
    angle: -80,
    icon: "sombra_centuria",
    requires: {
      talentIds: [
        "torrente_das_umbras",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 100,
    },
  },
  {
    id: "foice_profunda",
    name: "Foice Profunda",
    blurb: "Clique rouba +5% do SPS.",
    cost: "80000",
    branch: "margem",
    ring: 5,
    angle: -120,
    icon: "foice_profunda",
    requires: {
      talentIds: [
        "foice_afilada_rio",
      ],
    },
    effects: {
      kSps: "0.05",
    },
  },
  {
    id: "almas_milhao",
    name: "Maré do Milhão",
    blurb: "+1 000 000 almas iniciais.",
    cost: "90000",
    branch: "margem",
    ring: 5,
    angle: -100,
    icon: "almas_milhao",
    requires: {
      talentIds: [
        "almas_centenas",
      ],
    },
    effects: {
      startingSouls: "1000000",
    },
  },
  {
    id: "eco_da_foice_rio",
    name: "Eco da Foice",
    blurb: "+250 000 almas iniciais — eco da lâmina na margem.",
    cost: "100000",
    branch: "margem",
    ring: 5,
    angle: -130,
    icon: "eco_da_foice_rio",
    requires: {
      talentIds: [
        "foice_profunda",
      ],
    },
    effects: {
      startingSouls: "250000",
    },
  },
  {
    id: "legiao_das_umbras",
    name: "Legião das Umbras",
    blurb: "200 Sombras no despertar.",
    cost: "700000",
    branch: "margem",
    ring: 6,
    angle: -75,
    icon: "legiao_das_umbras",
    requires: {
      talentIds: [
        "sombra_centuria",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 200,
    },
  },
  {
    id: "foice_voraz",
    name: "Foice Voraz",
    blurb: "Clique rouba +8% do SPS.",
    cost: "750000",
    branch: "margem",
    ring: 6,
    angle: -118,
    icon: "foice_voraz",
    requires: {
      talentIds: [
        "foice_profunda",
      ],
    },
    effects: {
      kSps: "0.08",
    },
  },
  {
    id: "almas_dezena_milhao",
    name: "Dez Milhões",
    blurb: "+10 000 000 almas iniciais.",
    cost: "800000",
    branch: "margem",
    ring: 6,
    angle: -98,
    icon: "almas_dezena_milhao",
    requires: {
      talentIds: [
        "almas_milhao",
      ],
    },
    effects: {
      startingSouls: "10000000",
    },
  },
  {
    id: "preludio_eterno",
    name: "Prelúdio Eterno",
    blurb: "+5 000 000 almas se a maré do milhão flui.",
    cost: "650000",
    branch: "margem",
    ring: 6,
    angle: -88,
    icon: "preludio_eterno",
    requires: {
      talentIds: [
        "almas_milhao",
        "preludio_ctoniano",
      ],
    },
    effects: {
      startingSouls: "5000000",
    },
  },
  {
    id: "margem_abundante",
    name: "Margem Abundante",
    blurb: "+50 000 000 almas iniciais.",
    cost: "6000000",
    branch: "margem",
    ring: 7,
    angle: -95,
    icon: "margem_abundante",
    requires: {
      talentIds: [
        "almas_dezena_milhao",
      ],
    },
    effects: {
      startingSouls: "50000000",
    },
  },
  {
    id: "sombra_mil",
    name: "Mil Sombras",
    blurb: "1 000 Sombras Vagantes ao despertar.",
    cost: "7000000",
    branch: "margem",
    ring: 7,
    angle: -70,
    icon: "sombra_mil",
    requires: {
      talentIds: [
        "legiao_das_umbras",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 1000,
    },
  },
  {
    id: "foice_absoluta",
    name: "Foice Absoluta",
    blurb: "Clique rouba +12% do SPS.",
    cost: "7500000",
    branch: "margem",
    ring: 7,
    angle: -122,
    icon: "foice_absoluta",
    requires: {
      talentIds: [
        "foice_voraz",
      ],
    },
    effects: {
      kSps: "0.12",
    },
  },
  {
    id: "almas_cem_milhao",
    name: "Cem Milhões",
    blurb: "+100 000 000 almas iniciais.",
    cost: "44000000",
    branch: "margem",
    ring: 8,
    angle: -100,
    icon: "almas_cem_milhao",
    requires: {
      talentIds: [
        "margem_abundante",
      ],
    },
    effects: {
      startingSouls: "100000000",
    },
  },
  {
    id: "torrente_eterna",
    name: "Torrente Eterna",
    blurb: "2 000 Sombras no despertar.",
    cost: "50000000",
    branch: "margem",
    ring: 8,
    angle: -72,
    icon: "torrente_eterna",
    requires: {
      talentIds: [
        "sombra_mil",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 2000,
    },
  },
  {
    id: "corte_do_abismo",
    name: "Corte do Abismo",
    blurb: "Clique rouba +15% do SPS.",
    cost: "56000000",
    branch: "margem",
    ring: 8,
    angle: -125,
    icon: "corte_do_abismo",
    requires: {
      talentIds: [
        "foice_absoluta",
      ],
    },
    effects: {
      kSps: "0.15",
    },
  },
  {
    id: "mare_titanica",
    name: "Maré Titânica",
    blurb: "+500 000 000 almas iniciais.",
    cost: "350000000",
    branch: "margem",
    ring: 9,
    angle: -98,
    icon: "mare_titanica",
    requires: {
      talentIds: [
        "almas_cem_milhao",
      ],
    },
    effects: {
      startingSouls: "500000000",
    },
  },
  {
    id: "umbras_infinitas",
    name: "Umbras Infinitas",
    blurb: "5 000 Sombras Vagantes no despertar.",
    cost: "380000000",
    branch: "margem",
    ring: 9,
    angle: -68,
    icon: "umbras_infinitas",
    requires: {
      talentIds: [
        "torrente_eterna",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 5000,
    },
  },
  {
    id: "foice_do_lethe",
    name: "Foice do Lethe",
    blurb: "Clique rouba +20% do SPS.",
    cost: "400000000",
    branch: "margem",
    ring: 9,
    angle: -128,
    icon: "foice_do_lethe",
    requires: {
      talentIds: [
        "corte_do_abismo",
      ],
    },
    effects: {
      kSps: "0.20",
    },
  },
  {
    id: "raiz_da_margem",
    name: "Raiz da Margem",
    blurb: "+1 000 000 000 almas — capstone da margem.",
    cost: "4000000000",
    branch: "margem",
    ring: 10,
    angle: -100,
    icon: "raiz_da_margem",
    requires: {
      talentIds: [
        "mare_titanica",
        "foice_do_lethe",
      ],
    },
    effects: {
      startingSouls: "1000000000",
    },
  },
  {
    id: "abismo_das_sombras",
    name: "Abismo das Sombras",
    blurb: "10 000 Sombras no despertar — legião final.",
    cost: "5000000000",
    branch: "margem",
    ring: 10,
    angle: -70,
    icon: "abismo_das_sombras",
    requires: {
      talentIds: [
        "umbras_infinitas",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 10000,
    },
  },
  {
    id: "lamina_do_esquecimento",
    name: "Lâmina do Esquecimento",
    blurb: "Clique rouba +25% do SPS — foice final.",
    cost: "6000000000",
    branch: "margem",
    ring: 10,
    angle: -130,
    icon: "lamina_do_esquecimento",
    requires: {
      talentIds: [
        "foice_do_lethe",
      ],
    },
    effects: {
      kSps: "0.25",
    },
  },
  {
    id: "coroa_da_margem",
    name: "Coroa da Margem",
    blurb: "+5 000 000 000 almas — o rio te coroa.",
    cost: "40000000000",
    branch: "margem",
    ring: 11,
    angle: -95,
    icon: "coroa_da_margem",
    requires: {
      talentIds: [
        "raiz_da_margem",
        "abismo_das_sombras",
      ],
    },
    effects: {
      startingSouls: "5000000000",
    },
  },
  {
    id: "ceifa_absoluta",
    name: "Ceifa Absoluta",
    blurb: "Clique rouba +30% do SPS — ceifa do abismo.",
    cost: "50000000000",
    branch: "margem",
    ring: 11,
    angle: -125,
    icon: "ceifa_absoluta",
    requires: {
      talentIds: [
        "lamina_do_esquecimento",
        "raiz_da_margem",
      ],
    },
    effects: {
      kSps: "0.30",
    },
  },
  {
    id: "legiao_final",
    name: "Legião Final",
    blurb: "25 000 Sombras — a margem esvazia o Lethe.",
    cost: "50000000000",
    branch: "margem",
    ring: 11,
    angle: -72,
    icon: "legiao_final",
    requires: {
      talentIds: [
        "abismo_das_sombras",
        "ceifa_absoluta",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 25000,
    },
  },
  {
    id: "pacto_barato",
    name: "Pacto Barato",
    blurb: "Geradores custam 25% menos (melhor que Favor).",
    cost: "2500",
    branch: "imperio",
    ring: 3,
    angle: 8,
    icon: "pacto_barato",
    requires: {
      talentIds: [
        "favor_de_caronte",
        "olho_da_curva",
      ],
    },
    effects: {
      generatorCostMult: "0.75",
    },
  },
  {
    id: "juizes_iniciais",
    name: "Juízes Iniciais",
    blurb: "2 Juízes do Tártaro ao despertar.",
    cost: "15000",
    branch: "imperio",
    ring: 4,
    angle: -20,
    icon: "juizes_iniciais",
    requires: {
      talentIds: [
        "trono_sombrio",
      ],
    },
    effects: {
      startingGeneratorId: "tartarus_judge",
      startingGeneratorQty: 2,
    },
  },
  {
    id: "templo_inicial",
    name: "Templo Inicial",
    blurb: "1 Templo de Mnemosyne no despertar.",
    cost: "20000",
    branch: "imperio",
    ring: 4,
    angle: 15,
    icon: "templo_inicial",
    requires: {
      talentIds: [
        "imperio_fluvial",
      ],
    },
    effects: {
      startingGeneratorId: "mnemosyne_temple",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "desconto_profundo",
    name: "Desconto Profundo",
    blurb: "Geradores custam 40% menos.",
    cost: "110000",
    branch: "imperio",
    ring: 5,
    angle: 5,
    icon: "desconto_profundo",
    requires: {
      talentIds: [
        "pacto_barato",
      ],
    },
    effects: {
      generatorCostMult: "0.60",
    },
  },
  {
    id: "matilha_ampliada",
    name: "Matilha Ampliada",
    blurb: "8 Cães Cerberianos no despertar.",
    cost: "100000",
    branch: "imperio",
    ring: 5,
    angle: -25,
    icon: "matilha_ampliada",
    requires: {
      talentIds: [
        "matilha_cerberiana",
        "imperio_fluvial",
      ],
    },
    effects: {
      startingGeneratorId: "cerberian_hound",
      startingGeneratorQty: 8,
    },
  },
  {
    id: "forja_dupla",
    name: "Forja Dupla",
    blurb: "3 Forjas do Flegetonte no despertar.",
    cost: "120000",
    branch: "imperio",
    ring: 5,
    angle: -4.94,
    icon: "forja_dupla",
    requires: {
      talentIds: [
        "forja_despertada",
        "imperio_fluvial",
      ],
    },
    effects: {
      startingGeneratorId: "phlegethon_forge",
      startingGeneratorQty: 3,
    },
  },
  {
    id: "torre_do_styx_start",
    name: "Torre Semeada",
    blurb: "1 Torre do Styx ao despertar.",
    cost: "140000",
    branch: "imperio",
    ring: 5,
    angle: 22,
    icon: "torre_do_styx_start",
    requires: {
      talentIds: [
        "templo_inicial",
      ],
    },
    effects: {
      startingGeneratorId: "styx_tower",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "servos_dobrados",
    name: "Servos Dobrados",
    blurb: "10 Servos de Caronte no despertar.",
    cost: "90000",
    branch: "imperio",
    ring: 5,
    angle: -12.06,
    icon: "servos_dobrados",
    requires: {
      talentIds: [
        "servo_das_margens",
        "pacto_barato",
      ],
    },
    effects: {
      startingGeneratorId: "charon_servants",
      startingGeneratorQty: 10,
    },
  },
  {
    id: "trono_reforcado",
    name: "Trono Reforçado",
    blurb: "3 Tronos de Obsidiana no despertar.",
    cost: "900000",
    branch: "imperio",
    ring: 6,
    angle: -18,
    icon: "trono_reforcado",
    requires: {
      talentIds: [
        "trono_sombrio",
        "desconto_profundo",
      ],
    },
    effects: {
      startingGeneratorId: "obsidian_throne",
      startingGeneratorQty: 3,
    },
  },
  {
    id: "barganha_abissal",
    name: "Barganha Abissal",
    blurb: "Geradores custam 50% menos.",
    cost: "1000000",
    branch: "imperio",
    ring: 6,
    angle: 0,
    icon: "barganha_abissal",
    requires: {
      talentIds: [
        "desconto_profundo",
      ],
    },
    effects: {
      generatorCostMult: "0.50",
    },
  },
  {
    id: "barco_estelar_start",
    name: "Barcaça Semeada",
    blurb: "1 Barcaça Estelar no despertar.",
    cost: "1100000",
    branch: "imperio",
    ring: 6,
    angle: 20,
    icon: "barco_estelar_start",
    requires: {
      talentIds: [
        "torre_do_styx_start",
      ],
    },
    effects: {
      startingGeneratorId: "star_barge",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "nectar_imperial",
    name: "Néctar Imperial",
    blurb: "Reserva e Frenesi já fluem: bônus de império consolidado.",
    cost: "850000",
    branch: "imperio",
    ring: 6,
    angle: 28,
    icon: "nectar_imperial",
    requires: {
      talentIds: [
        "frenesi_de_nectar_talento",
        "desconto_profundo",
      ],
    },
    effects: {
      nectarReserveBonus: true,
      nectarFrenzyUnlock: true,
    },
  },
  {
    id: "lab_tartaro_start",
    name: "Labirinto Semeado",
    blurb: "1 Labirinto do Tártaro no despertar.",
    cost: "8000000",
    branch: "imperio",
    ring: 7,
    angle: 18,
    icon: "lab_tartaro_start",
    requires: {
      talentIds: [
        "barco_estelar_start",
      ],
    },
    effects: {
      startingGeneratorId: "tartarus_lab",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "matilha_imperial",
    name: "Matilha Imperial",
    blurb: "20 Cães Cerberianos no despertar.",
    cost: "7500000",
    branch: "imperio",
    ring: 7,
    angle: -28,
    icon: "matilha_imperial",
    requires: {
      talentIds: [
        "matilha_ampliada",
      ],
    },
    effects: {
      startingGeneratorId: "cerberian_hound",
      startingGeneratorQty: 20,
    },
  },
  {
    id: "forja_imperial",
    name: "Forja Imperial",
    blurb: "8 Forjas no despertar.",
    cost: "8500000",
    branch: "imperio",
    ring: 7,
    angle: -8,
    icon: "forja_imperial",
    requires: {
      talentIds: [
        "forja_dupla",
        "barganha_abissal",
      ],
    },
    effects: {
      startingGeneratorId: "phlegethon_forge",
      startingGeneratorQty: 8,
    },
  },
  {
    id: "portal_erebus_start",
    name: "Portal Semeado",
    blurb: "1 Portal de Érebo no despertar.",
    cost: "50000000",
    branch: "imperio",
    ring: 8,
    angle: 16,
    icon: "portal_erebus_start",
    requires: {
      talentIds: [
        "lab_tartaro_start",
      ],
    },
    effects: {
      startingGeneratorId: "erebus_portal",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "desconto_absoluto",
    name: "Desconto Absoluto",
    blurb: "Geradores custam 60% menos.",
    cost: "56000000",
    branch: "imperio",
    ring: 8,
    angle: 0,
    icon: "desconto_absoluto",
    requires: {
      talentIds: [
        "barganha_abissal",
      ],
    },
    effects: {
      generatorCostMult: "0.40",
    },
  },
  {
    id: "tear_chronos_start",
    name: "Tear Semeado",
    blurb: "1 Tear de Chronos no despertar.",
    cost: "64000000",
    branch: "imperio",
    ring: 8,
    angle: 24,
    icon: "tear_chronos_start",
    requires: {
      talentIds: [
        "portal_erebus_start",
      ],
    },
    effects: {
      startingGeneratorId: "chronos_loom",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "trono_imperial",
    name: "Trono Imperial",
    blurb: "10 Tronos no despertar.",
    cost: "60000000",
    branch: "imperio",
    ring: 8,
    angle: -20,
    icon: "trono_imperial",
    requires: {
      talentIds: [
        "trono_reforcado",
        "desconto_absoluto",
      ],
    },
    effects: {
      startingGeneratorId: "obsidian_throne",
      startingGeneratorQty: 10,
    },
  },
  {
    id: "condensador_start",
    name: "Condensador Semeado",
    blurb: "1 Condensador do Vazio no despertar.",
    cost: "450000000",
    branch: "imperio",
    ring: 9,
    angle: 14,
    icon: "condensador_start",
    requires: {
      talentIds: [
        "tear_chronos_start",
      ],
    },
    effects: {
      startingGeneratorId: "void_condenser",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "pacto_do_abismo",
    name: "Pacto do Abismo",
    blurb: "Geradores custam 70% menos.",
    cost: "500000000",
    branch: "imperio",
    ring: 9,
    angle: -2,
    icon: "pacto_do_abismo",
    requires: {
      talentIds: [
        "desconto_absoluto",
      ],
    },
    effects: {
      generatorCostMult: "0.30",
    },
  },
  {
    id: "prisma_start",
    name: "Prisma Semeado",
    blurb: "1 Prisma das Moiras no despertar.",
    cost: "600000000",
    branch: "imperio",
    ring: 9,
    angle: 22,
    icon: "prisma_start",
    requires: {
      talentIds: [
        "condensador_start",
      ],
    },
    effects: {
      startingGeneratorId: "moirai_prism",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "imperio_do_abismo",
    name: "Império do Abismo",
    blurb: "+5 Cães e +3 Forjas — capstone de estrutura.",
    cost: "4500000000",
    branch: "imperio",
    ring: 10,
    angle: -15,
    icon: "imperio_do_abismo",
    requires: {
      talentIds: [
        "matilha_imperial",
        "forja_imperial",
        "pacto_do_abismo",
      ],
    },
    effects: {
      startingGeneratorBonus: {
        cerberian_hound: 5,
        phlegethon_forge: 3,
      },
    },
  },
  {
    id: "forja_do_destino",
    name: "Forja do Destino",
    blurb: "1 Forja do Destino no despertar.",
    cost: "5500000000",
    branch: "imperio",
    ring: 10,
    angle: 18,
    icon: "forja_do_destino",
    requires: {
      talentIds: [
        "prisma_start",
      ],
    },
    effects: {
      startingGeneratorId: "fate_forge",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "mercado_do_lethe",
    name: "Mercado do Lethe",
    blurb: "Geradores custam 75% menos — barganha final.",
    cost: "7500000000",
    branch: "imperio",
    ring: 10,
    angle: 0,
    icon: "mercado_do_lethe",
    requires: {
      talentIds: [
        "pacto_do_abismo",
        "imperio_do_abismo",
      ],
    },
    effects: {
      generatorCostMult: "0.25",
    },
  },
  {
    id: "coroa_do_imperio",
    name: "Coroa do Império",
    blurb: "1 Motor Fractal no despertar — capstone.",
    cost: "40000000000",
    branch: "imperio",
    ring: 11,
    angle: 8,
    icon: "coroa_do_imperio",
    requires: {
      talentIds: [
        "forja_do_destino",
        "mercado_do_lethe",
      ],
    },
    effects: {
      startingGeneratorId: "fractal_engine",
      startingGeneratorQty: 1,
    },
  },
  {
    id: "trono_do_esquecimento",
    name: "Trono do Esquecimento",
    blurb: "25 Tronos no despertar — poder imperial final.",
    cost: "44000000000",
    branch: "imperio",
    ring: 11,
    angle: -22,
    icon: "trono_do_esquecimento",
    requires: {
      talentIds: [
        "trono_imperial",
        "coroa_do_imperio",
      ],
    },
    effects: {
      startingGeneratorId: "obsidian_throne",
      startingGeneratorQty: 25,
    },
  },
  {
    id: "dragao_coroado",
    name: "Dragão Coroado",
    blurb: "Ovo + Mercado: o dragão reina no abismo.",
    cost: "36000000000",
    branch: "imperio",
    ring: 11,
    angle: 28,
    icon: "dragao_coroado",
    requires: {
      talentIds: [
        "ovo_primordial",
        "mercado_do_lethe",
      ],
    },
    effects: {
      dragonUnlock: true,
      generatorCostMult: "0.25",
    },
  },
  {
    id: "sinergias_vol_ii",
    name: "Sinergias Vol. II",
    blurb: "Desbloqueia a malha Styx de sinergias Vol. II (qty ≥ 75 nos pares).",
    cost: "12500",
    branch: "memoria",
    ring: 4,
    angle: 88,
    icon: "sinergias_vol_ii",
    requires: {
      talentIds: [
        "sinergias_vol_i",
      ],
    },
    effects: {
      synergyVolUnlock: 2,
    },
  },
  {
    id: "noite_profunda",
    name: "Noite Profunda",
    blurb: "+8h ao teto offline (soma — não substitui extras).",
    cost: "14000",
    branch: "memoria",
    ring: 4,
    angle: 72,
    icon: "noite_profunda",
    requires: {
      talentIds: [
        "legado_do_rio",
      ],
    },
    effects: {
      offlineExtraHours: 8,
    },
  },
  {
    id: "eco_ancestral_vi",
    name: "Eco do Styx VI",
    blurb: "6 juramentos Styx sobrevivem ao Lethe.",
    cost: "70000",
    branch: "memoria",
    ring: 5,
    angle: 128,
    icon: "eco_ancestral_vi",
    requires: {
      talentIds: [
        "eco_ancestral_v",
      ],
    },
    effects: {
      softPrestigeStyxCount: 6,
    },
  },
  {
    id: "mnemosyne_quintupla",
    name: "Mnemosyne Quíntupla",
    blurb: "Óbolos ×3 no bônus de prestígio.",
    cost: "80000",
    branch: "memoria",
    ring: 5,
    angle: 100,
    icon: "mnemosyne_quintupla",
    requires: {
      talentIds: [
        "mnemosyne_raiz",
      ],
    },
    effects: {
      mnemosyneMult: "3",
    },
  },
  {
    id: "calice_dourado",
    name: "Cálice Dourado",
    blurb: "Essência do ritual ×2.",
    cost: "100000",
    branch: "memoria",
    ring: 5,
    angle: 90,
    icon: "calice_dourado",
    requires: {
      talentIds: [
        "calice_da_memoria",
        "mnemosyne_raiz",
      ],
    },
    effects: {
      mnemosyneGainMult: "2",
    },
  },
  {
    id: "silencio_eterno",
    name: "Silêncio Eterno",
    blurb: "+8h ao teto offline.",
    cost: "90000",
    branch: "memoria",
    ring: 5,
    angle: 68,
    icon: "silencio_eterno",
    requires: {
      talentIds: [
        "noite_profunda",
      ],
    },
    effects: {
      offlineExtraHours: 8,
    },
  },
  {
    id: "eco_ancestral_vii",
    name: "Eco do Styx VII",
    blurb: "7 juramentos Styx após Catábase.",
    cost: "700000",
    branch: "memoria",
    ring: 6,
    angle: 132,
    icon: "eco_ancestral_vii",
    requires: {
      talentIds: [
        "eco_ancestral_vi",
      ],
    },
    effects: {
      softPrestigeStyxCount: 7,
    },
  },
  {
    id: "mnemosyne_sestupla",
    name: "Mnemosyne Sêxtupla",
    blurb: "Óbolos ×4 no bônus.",
    cost: "800000",
    branch: "memoria",
    ring: 6,
    angle: 102,
    icon: "mnemosyne_sestupla",
    requires: {
      talentIds: [
        "mnemosyne_quintupla",
      ],
    },
    effects: {
      mnemosyneMult: "4",
    },
  },
  {
    id: "legado_profundo",
    name: "Legado Profundo",
    blurb: "+10h ao teto offline.",
    cost: "750000",
    branch: "memoria",
    ring: 6,
    angle: 78,
    icon: "legado_profundo",
    requires: {
      talentIds: [
        "silencio_eterno",
        "legado_do_rio",
      ],
    },
    effects: {
      offlineExtraHours: 10,
    },
  },
  {
    id: "veu_absoluto",
    name: "Véu Absoluto",
    blurb: "Offline 100% — selo reforçado.",
    cost: "600000",
    branch: "memoria",
    ring: 6,
    angle: 115,
    icon: "veu_absoluto",
    requires: {
      talentIds: [
        "veu_eficiente",
        "noite_profunda",
      ],
    },
    effects: {
      offlineEfficiency: "1.00",
    },
  },
  {
    id: "eco_ancestral_viii",
    name: "Eco do Styx VIII",
    blurb: "8 juramentos Styx sobrevivem.",
    cost: "6000000",
    branch: "memoria",
    ring: 7,
    angle: 135,
    icon: "eco_ancestral_viii",
    requires: {
      talentIds: [
        "eco_ancestral_vii",
      ],
    },
    effects: {
      softPrestigeStyxCount: 8,
    },
  },
  {
    id: "mnemosyne_setupla",
    name: "Mnemosyne Sétupla",
    blurb: "Óbolos ×5 no bônus.",
    cost: "7000000",
    branch: "memoria",
    ring: 7,
    angle: 98,
    icon: "mnemosyne_setupla",
    requires: {
      talentIds: [
        "mnemosyne_sestupla",
      ],
    },
    effects: {
      mnemosyneMult: "5",
    },
  },
  {
    id: "calice_abissal",
    name: "Cálice Abissal",
    blurb: "Essência do ritual ×2,5.",
    cost: "8000000",
    branch: "memoria",
    ring: 7,
    angle: 88,
    icon: "calice_abissal",
    requires: {
      talentIds: [
        "calice_dourado",
      ],
    },
    effects: {
      mnemosyneGainMult: "2.5",
    },
  },
  {
    id: "noite_abissal",
    name: "Noite Abissal",
    blurb: "+16h ao teto offline.",
    cost: "7500000",
    branch: "memoria",
    ring: 7,
    angle: 70,
    icon: "noite_abissal",
    requires: {
      talentIds: [
        "legado_profundo",
      ],
    },
    effects: {
      offlineExtraHours: 16,
    },
  },
  {
    id: "eco_ancestral_ix",
    name: "Eco do Styx IX",
    blurb: "9 juramentos Styx após o Lethe.",
    cost: "44000000",
    branch: "memoria",
    ring: 8,
    angle: 138,
    icon: "eco_ancestral_ix",
    requires: {
      talentIds: [
        "eco_ancestral_viii",
      ],
    },
    effects: {
      softPrestigeStyxCount: 9,
    },
  },
  {
    id: "mnemosyne_octupla",
    name: "Mnemosyne Óctupla",
    blurb: "Óbolos ×6 no bônus.",
    cost: "52000000",
    branch: "memoria",
    ring: 8,
    angle: 100,
    icon: "mnemosyne_octupla",
    requires: {
      talentIds: [
        "mnemosyne_setupla",
      ],
    },
    effects: {
      mnemosyneMult: "6",
    },
  },
  {
    id: "memoria_viva",
    name: "Memória Viva",
    blurb: "+12h ao teto offline.",
    cost: "48000000",
    branch: "memoria",
    ring: 8,
    angle: 75,
    icon: "memoria_viva",
    requires: {
      talentIds: [
        "noite_abissal",
      ],
    },
    effects: {
      offlineExtraHours: 12,
    },
  },
  {
    id: "eco_ancestral_x",
    name: "Eco do Styx X",
    blurb: "10 juramentos Styx — eco do abismo.",
    cost: "350000000",
    branch: "memoria",
    ring: 9,
    angle: 140,
    icon: "eco_ancestral_x",
    requires: {
      talentIds: [
        "eco_ancestral_ix",
      ],
    },
    effects: {
      softPrestigeStyxCount: 10,
    },
  },
  {
    id: "mnemosyne_nonupla",
    name: "Mnemosyne Nônupla",
    blurb: "Óbolos ×8 no bônus.",
    cost: "400000000",
    branch: "memoria",
    ring: 9,
    angle: 102,
    icon: "mnemosyne_nonupla",
    requires: {
      talentIds: [
        "mnemosyne_octupla",
      ],
    },
    effects: {
      mnemosyneMult: "8",
    },
  },
  {
    id: "calice_do_esquecimento",
    name: "Cálice do Esquecimento",
    blurb: "Essência do ritual ×3.",
    cost: "380000000",
    branch: "memoria",
    ring: 9,
    angle: 88,
    icon: "calice_do_esquecimento",
    requires: {
      talentIds: [
        "calice_abissal",
        "mnemosyne_octupla",
      ],
    },
    effects: {
      mnemosyneGainMult: "3",
    },
  },
  {
    id: "raiz_da_memoria",
    name: "Raiz da Memória",
    blurb: "Óbolos ×10 — capstone de prestígio.",
    cost: "4500000000",
    branch: "memoria",
    ring: 10,
    angle: 100,
    icon: "raiz_da_memoria",
    requires: {
      talentIds: [
        "mnemosyne_nonupla",
        "calice_do_esquecimento",
      ],
    },
    effects: {
      mnemosyneMult: "10",
    },
  },
  {
    id: "eco_infinito",
    name: "Eco Infinito",
    blurb: "12 juramentos Styx sobrevivem ao Lethe.",
    cost: "5000000000",
    branch: "memoria",
    ring: 10,
    angle: 135,
    icon: "eco_infinito",
    requires: {
      talentIds: [
        "eco_ancestral_x",
      ],
    },
    effects: {
      softPrestigeStyxCount: 12,
    },
  },
  {
    id: "noite_do_lethe",
    name: "Noite do Lethe",
    blurb: "+24h ao teto offline — a noite longa do rio.",
    cost: "5500000000",
    branch: "memoria",
    ring: 10,
    angle: 72,
    icon: "noite_do_lethe",
    requires: {
      talentIds: [
        "memoria_viva",
        "noite_abissal",
      ],
    },
    effects: {
      offlineExtraHours: 24,
    },
  },
  {
    id: "coroa_da_memoria",
    name: "Coroa da Memória",
    blurb: "Óbolos ×15 — a memória coroa o rio.",
    cost: "40000000000",
    branch: "memoria",
    ring: 11,
    angle: 98,
    icon: "coroa_da_memoria",
    requires: {
      talentIds: [
        "raiz_da_memoria",
        "eco_infinito",
      ],
    },
    effects: {
      mnemosyneMult: "15",
    },
  },
  {
    id: "calice_final",
    name: "Cálice Final",
    blurb: "Essência do ritual ×5 — capstone.",
    cost: "44000000000",
    branch: "memoria",
    ring: 11,
    angle: 85,
    icon: "calice_final",
    requires: {
      talentIds: [
        "calice_do_esquecimento",
        "raiz_da_memoria",
      ],
    },
    effects: {
      mnemosyneGainMult: "5",
    },
  },
  {
    id: "eco_do_abismo",
    name: "Eco do Abismo",
    blurb: "15 juramentos Styx — memória máxima.",
    cost: "50000000000",
    branch: "memoria",
    ring: 11,
    angle: 140,
    icon: "eco_do_abismo",
    requires: {
      talentIds: [
        "eco_infinito",
        "coroa_da_memoria",
      ],
    },
    effects: {
      softPrestigeStyxCount: 15,
    },
  },
]);

export const TALENT_IDS = Object.freeze(TALENTS.map((item) => item.id));

export const TALENT_BY_ID = Object.freeze(
  Object.fromEntries(TALENTS.map((item) => [item.id, item])),
);

export const TALENT_BRANCHES = Object.freeze({
  margem: Object.freeze({ id: 'margem', label: 'MARGEM' }),
  imperio: Object.freeze({ id: 'imperio', label: 'IMPÉRIO' }),
  memoria: Object.freeze({ id: 'memoria', label: 'MEMÓRIA' }),
});

/** Custos legados para refund se um id sumir do catálogo. */
export const LEGACY_TALENT_COSTS = Object.freeze({
  memoria_das_sombras: "1",
  foice_ancestral: "3",
  margem_generosa: "3",
  preludio_ctoniano: "4",
  segundo_folego: "5",
  lamina_viva: "5",
  rebanho_despertado: "5",
  mare_inicial: "7",
  torrente_das_umbras: "10",
  favor_de_caronte: "3",
  olho_da_curva: "4",
  nectar_em_reserva: "5",
  servo_das_margens: "4",
  matilha_cerberiana: "6",
  ovo_primordial: "5",
  forja_despertada: "10",
  frenesi_de_nectar_talento: "8",
  trono_sombrio: "12",
  imperio_fluvial: "15",
  juramento_eterno: "1",
  noite_prolongada: "2",
  veu_eficiente: "2",
  eco_do_styx: "4",
  pacto_do_silencio: "3",
  mnemosyne_profunda: "5",
  sinergias_vol_i: "8",
  eco_ressonante: "6",
  rodizio_das_estacoes: "5",
  legado_do_rio: "6",
  calice_da_memoria: "7",
  eco_ancestral_iii: "9",
  mnemosyne_tripla: "8",
  eco_ancestral_iv: "12",
  eco_ancestral_v: "15",
  mnemosyne_raiz: "20",
});

/** IDs antigos → novos (identidade enquanto os gates estáveis permanecem). */
export const LEGACY_TALENT_MAP = Object.freeze({
  ...Object.fromEntries(Object.keys(LEGACY_TALENT_COSTS).map((id) => [id, id])),
});

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
