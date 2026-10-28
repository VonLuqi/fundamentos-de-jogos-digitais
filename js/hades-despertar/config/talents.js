/**
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
export const TALENTS = freezeAll([
  {
    id: "legado",
    name: "Legado",
    blurb: "Desbloqueia o sistema de Essência de Mnemosyne e juramentos permanentes.",
    cost: "1",
    branch: "persistent",
    ring: 0,
    angle: 2,
    icon: "legado",
    requires: {},
    effects: {},
  },
  {
    id: "portoes_gemeos",
    name: "Portões Gêmeos",
    blurb: "Duas portas que não fecham nem quando você dorme. Offline rende +5% do SPS.",
    cost: "1",
    branch: "misc",
    ring: 1,
    angle: -67.98,
    icon: "portoes_gemeos",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      offlineRate: "0.05",
    },
  },
  {
    id: "bolachas_celestes",
    name: "Bolachas Celestes",
    blurb: "O pão dos que já atravessaram. Todos os geradores +10%.",
    cost: "3",
    branch: "cookie",
    ring: 1,
    angle: 69.97,
    icon: "bolachas_celestes",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      allGeneratorsMult: "1.10",
    },
  },
  {
    id: "angels",
    name: "Anjos",
    blurb: "Mensageiros que vigiam a margem na sua ausência. Offline rende +10% do SPS.",
    cost: "7",
    branch: "angel",
    ring: 2,
    angle: -95.25,
    icon: "angels",
    requires: {
      talentIds: [
        "portoes_gemeos",
      ],
    },
    effects: {
      offlineRate: "0.10",
    },
  },
  {
    id: "belphegor",
    name: "Belphegor",
    blurb: "O daemon da preguiça conta as horas por você. Janela offline +4 h.",
    cost: "7",
    branch: "demon",
    ring: 2,
    angle: 14.45,
    icon: "belphegor",
    requires: {
      talentIds: [
        "portoes_gemeos",
      ],
    },
    effects: {
      offlineExtraHours: 4,
    },
  },
  {
    id: "classic_dairy_selection",
    name: "Ânforas de Leite Ancestral",
    blurb: "Leite servido nas ânforas dos primeiros mortos. Todos os geradores +1%.",
    cost: "9",
    branch: "misc",
    ring: 1,
    angle: -40.39,
    icon: "classic_dairy_selection",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "ovo_primordial",
    name: "Ovo Primordial",
    blurb: "Uma casca morna sob as cinzas do Phlegethon. Desperta o Dragão Ctoniano.",
    cost: "9",
    branch: "misc",
    ring: 1,
    angle: -12.8,
    icon: "ovo_primordial",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      dragonUnlock: true,
    },
  },
  {
    id: "box_of_brand_biscuits",
    name: "Caixa de Óbolos Cunhados",
    blurb: "Moedas de Caronte assadas em fornada. Todos os geradores +2%.",
    cost: "25",
    branch: "cookie",
    ring: 2,
    angle: 30.12,
    icon: "box_of_brand_biscuits",
    requires: {
      talentIds: [
        "bolachas_celestes",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "box_of_macarons",
    name: "Caixa de Doces de Perséfone",
    blurb: "Pequenas romãs açucaradas da rainha. Todos os geradores +2%.",
    cost: "25",
    branch: "cookie",
    ring: 2,
    angle: 45.84,
    icon: "box_of_macarons",
    requires: {
      talentIds: [
        "bolachas_celestes",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "tin_of_british_tea_biscuits",
    name: "Lata de Biscoitos de Hermes",
    blurb: "Para o chá do mensageiro entre duas viagens. Todos os geradores +2%.",
    cost: "25",
    branch: "cookie",
    ring: 2,
    angle: 61.64,
    icon: "tin_of_british_tea_biscuits",
    requires: {
      talentIds: [
        "bolachas_celestes",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "tin_of_butter_cookies",
    name: "Lata de Bolachas de Ambrosia",
    blurb: "Manteiga dos deuses, só um pouco rançosa. Todos os geradores +2%.",
    cost: "25",
    branch: "cookie",
    ring: 2,
    angle: 77.51,
    icon: "tin_of_butter_cookies",
    requires: {
      talentIds: [
        "bolachas_celestes",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "archangels",
    name: "Arcanjos",
    blurb: "Asas maiores, vigília mais longa. Offline rende +10% do SPS.",
    cost: "49",
    branch: "angel",
    ring: 3,
    angle: -59.15,
    icon: "archangels",
    requires: {
      talentIds: [
        "angels",
      ],
    },
    effects: {
      offlineRate: "0.10",
    },
  },
  {
    id: "mamon",
    name: "Mamon",
    blurb: "O avarento estica a maré enquanto você descansa. Janela offline +8 h.",
    cost: "49",
    branch: "demon",
    ring: 3,
    angle: 39.22,
    icon: "mamon",
    requires: {
      talentIds: [
        "belphegor",
      ],
    },
    effects: {
      offlineExtraHours: 8,
    },
  },
  {
    id: "kit_inicial",
    name: "Kit Inicial",
    blurb: "Toda corrida começa com companhia. Cada corrida começa com 10 × Sombra Vagante.",
    cost: "50",
    branch: "cookie",
    ring: 3,
    angle: 27.9,
    icon: "kit_inicial",
    requires: {
      talentIds: [
        "tin_of_british_tea_biscuits",
        "box_of_macarons",
        "box_of_brand_biscuits",
        "tin_of_butter_cookies",
      ],
    },
    effects: {
      startingGeneratorId: "wandering_shade",
      startingGeneratorQty: 10,
    },
  },
  {
    id: "heavenly_luck",
    name: "Sorte Celeste",
    blurb: "As correntes do Acheron sobem mais vezes. Ecos do Acheron aparecem +5% mais.",
    cost: "77",
    branch: "golden",
    ring: 1,
    angle: -95.57,
    icon: "heavenly_luck",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      shimmerLuckMult: "1.05",
    },
  },
  {
    id: "basic_wallpaper_assortment",
    name: "Tapeçarias do Érebo",
    blurb: "Paredes de sombra bordada para o Domínio. Todos os geradores +1%.",
    cost: "99",
    branch: "misc",
    ring: 2,
    angle: -32.39,
    icon: "basic_wallpaper_assortment",
    requires: {
      talentIds: [
        "classic_dairy_selection",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "heralds",
    name: "Eco da Turma",
    blurb: "Os arautos sussurram. Todos os geradores +1%.",
    cost: "100",
    branch: "cookie",
    ring: 1,
    angle: 97.56,
    icon: "heralds",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "permanent_slot_i",
    name: "Eco do Styx I",
    blurb: "Um juramento permanece selado entre corridas. 1 juramento(s) sobrevivem ao Lethe.",
    cost: "100",
    branch: "persistent",
    ring: 1,
    angle: 14.79,
    icon: "permanent_slot_i",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      permanentSlot: 1,
    },
  },
  {
    id: "abadao",
    name: "Abadom",
    blurb: "O destruidor guarda a porta do sono. Janela offline +16 h.",
    cost: "343",
    branch: "demon",
    ring: 4,
    angle: 44.93,
    icon: "abadao",
    requires: {
      talentIds: [
        "mamon",
      ],
    },
    effects: {
      offlineExtraHours: 16,
    },
  },
  {
    id: "virtues",
    name: "Virtudes",
    blurb: "Disciplina que trabalha sozinha. Offline rende +10% do SPS.",
    cost: "343",
    branch: "angel",
    ring: 4,
    angle: -62.42,
    icon: "virtues",
    requires: {
      talentIds: [
        "archangels",
      ],
    },
    effects: {
      offlineRate: "0.10",
    },
  },
  {
    id: "persistent_memory",
    name: "Memória Persistente",
    blurb: "O Arquivo Estígio lembra onde parou. Pesquisas do Arquivo Estígio 10× mais rápidas.",
    cost: "500",
    branch: "persistent",
    ring: 1,
    angle: 42.38,
    icon: "persistent_memory",
    requires: {
      talentIds: [
        "legado",
      ],
    },
    effects: {
      researchDurationMult: 0.1,
    },
  },
  {
    id: "lasting_fortune",
    name: "Fortuna Duradoura",
    blurb: "A maré dourada demora a baixar. Ecos do Acheron aparecem +2% mais.",
    cost: "777",
    branch: "golden",
    ring: 2,
    angle: -79.42,
    icon: "lasting_fortune",
    requires: {
      talentIds: [
        "heavenly_luck",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "lucky_digit",
    name: "Dígito da Sorte",
    blurb: "Um número que Caronte sempre aceita. Ecos do Acheron aparecem +1% mais. Potência dos Óbolos +1%.",
    cost: "777",
    branch: "golden",
    ring: 2,
    angle: -63.69,
    icon: "lucky_digit",
    requires: {
      talentIds: [
        "heavenly_luck",
      ],
    },
    effects: {
      prestigeEffectMult: "1.01",
      shimmerLuckMult: "1.01",
    },
  },
  {
    id: "golden_switch",
    name: "Chave Dourada",
    blurb: "Um ferrolho de ouro que mantém a forja acesa. Todos os geradores +10%.",
    cost: "999",
    branch: "golden",
    ring: 2,
    angle: -48.01,
    icon: "golden_switch",
    requires: {
      talentIds: [
        "heavenly_luck",
      ],
    },
    effects: {
      allGeneratorsMult: "1.10",
    },
  },
  {
    id: "rodizio_das_estacoes",
    name: "Roda das Estações",
    blurb: "Gire o ano do Submundo. Libera a troca de estações.",
    cost: "1111",
    branch: "season",
    ring: 2,
    angle: 93.46,
    icon: "rodizio_das_estacoes",
    requires: {
      talentIds: [
        "heralds",
      ],
    },
    effects: {
      seasonSwitcherUnlock: true,
    },
  },
  {
    id: "dominions",
    name: "Dominações",
    blurb: "Ordens que seguem cumpridas na sua ausência. Offline rende +10% do SPS.",
    cost: "2401",
    branch: "angel",
    ring: 5,
    angle: -65.53,
    icon: "dominions",
    requires: {
      talentIds: [
        "virtues",
      ],
    },
    effects: {
      offlineRate: "0.10",
    },
  },
  {
    id: "satan",
    name: "Satanás",
    blurb: "O adversário prolonga a noite. Janela offline +32 h.",
    cost: "2401",
    branch: "demon",
    ring: 5,
    angle: 52.61,
    icon: "satan",
    requires: {
      talentIds: [
        "abadao",
      ],
    },
    effects: {
      offlineExtraHours: 32,
    },
  },
  {
    id: "cozinha_inicial",
    name: "Cozinha Inicial",
    blurb: "Os remadores já chegam ao cais. Cada corrida começa com 5 × Servos de Caronte.",
    cost: "5000",
    branch: "cookie",
    ring: 4,
    angle: 36.18,
    icon: "cozinha_inicial",
    requires: {
      talentIds: [
        "kit_inicial",
      ],
    },
    effects: {
      startingGeneratorId: "charon_servants",
      startingGeneratorQty: 5,
    },
  },
  {
    id: "decisive_fate",
    name: "Destino Decisivo",
    blurb: "As Moiras cortam o fio na hora certa. Ecos do Acheron aparecem +2% mais.",
    cost: "7777",
    branch: "golden",
    ring: 3,
    angle: -47.84,
    icon: "decisive_fate",
    requires: {
      talentIds: [
        "lasting_fortune",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "kitten_angels",
    name: "Filhotes Alados",
    blurb: "Até os cães do Cérbero ganham asas. Conta como mais um Filhote do Cérbero (+10% do Véu).",
    cost: "9000",
    branch: "angel",
    ring: 6,
    angle: -70.33,
    icon: "kitten_angels",
    requires: {
      talentIds: [
        "dominions",
      ],
    },
    effects: {
      kittenVeilFactor: "0.1",
    },
  },
  {
    id: "asmodeus",
    name: "Asmodeu",
    blurb: "O daemon do desejo não deixa a maré esfriar. Janela offline +64 h.",
    cost: "16807",
    branch: "demon",
    ring: 6,
    angle: 49.39,
    icon: "asmodeus",
    requires: {
      talentIds: [
        "satan",
      ],
    },
    effects: {
      offlineExtraHours: 64,
    },
  },
  {
    id: "cherubim",
    name: "Querubins",
    blurb: "Guardiões de quatro faces sobre o rio. Offline rende +10% do SPS.",
    cost: "16807",
    branch: "angel",
    ring: 6,
    angle: -64.32,
    icon: "cherubim",
    requires: {
      talentIds: [
        "dominions",
      ],
    },
    effects: {
      offlineRate: "0.10",
    },
  },
  {
    id: "permanent_slot_ii",
    name: "Eco do Styx II",
    blurb: "Dois juramentos permanentes na margem. 2 juramento(s) sobrevivem ao Lethe.",
    cost: "20000",
    branch: "persistent",
    ring: 2,
    angle: -1.18,
    icon: "permanent_slot_ii",
    requires: {
      talentIds: [
        "permanent_slot_i",
      ],
    },
    effects: {
      permanentSlot: 2,
    },
  },
  {
    id: "unholy_bait",
    name: "Isca Profana",
    blurb: "Carne velha jogada no Acheron. Sanguessugas surgem 5× mais.",
    cost: "44444",
    branch: "demon",
    ring: 5,
    angle: 45.49,
    icon: "unholy_bait",
    requires: {
      talentIds: [
        "cozinha_inicial",
      ],
    },
    effects: {
      leechSpawnMult: 5,
    },
  },
  {
    id: "luvas_de_halo",
    name: "Luvas de Auréola",
    blurb: "A Foice pesa menos. Ceifar +10%.",
    cost: "55555",
    branch: "discount",
    ring: 4,
    angle: -2.36,
    icon: "luvas_de_halo",
    requires: {
      talentIds: [
        "kit_inicial",
      ],
    },
    effects: {
      clickTalentMult: "1.10",
    },
  },
  {
    id: "numero_da_sorte",
    name: "Número da Sorte",
    blurb: "Sete, como os portões. Ecos do Acheron aparecem +1% mais. Potência dos Óbolos +1%.",
    cost: "77777",
    branch: "golden",
    ring: 3,
    angle: -36.52,
    icon: "numero_da_sorte",
    requires: {
      talentIds: [
        "lucky_digit",
        "lasting_fortune",
      ],
    },
    effects: {
      prestigeEffectMult: "1.01",
      shimmerLuckMult: "1.01",
    },
  },
  {
    id: "desconto_divino",
    name: "Desconto Divino",
    blurb: "Os deuses pechincham por você. Geradores 1% mais baratos.",
    cost: "99999",
    branch: "discount",
    ring: 4,
    angle: -37.34,
    icon: "desconto_divino",
    requires: {
      talentIds: [
        "decisive_fate",
      ],
    },
    effects: {
      generatorCostMult: "0.99",
    },
  },
  {
    id: "vendas_divinas",
    name: "Liquidação Divina",
    blurb: "Juramentos em promoção no Olimpo. Juramentos 1% mais baratos.",
    cost: "99999",
    branch: "discount",
    ring: 4,
    angle: -28.59,
    icon: "vendas_divinas",
    requires: {
      talentIds: [
        "decisive_fate",
      ],
    },
    effects: {
      upgradeCostMult: "0.99",
    },
  },
  {
    id: "residual_luck",
    name: "Sorte Residual",
    blurb: "Restos de ouro no fundo do rio. Ecos do Acheron aparecem +3% mais.",
    cost: "99999",
    branch: "golden",
    ring: 3,
    angle: -25.2,
    icon: "residual_luck",
    requires: {
      talentIds: [
        "golden_switch",
      ],
    },
    effects: {
      shimmerLuckMult: "1.03",
    },
  },
  {
    id: "starlove",
    name: "Estrela de Antestéria",
    blurb: "O festival das flores chama os Ecos. Ecos do Acheron aparecem +2% mais.",
    cost: "111111",
    branch: "season",
    ring: 3,
    angle: 57.27,
    icon: "starlove",
    requires: {
      talentIds: [
        "rodizio_das_estacoes",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "starsnow",
    name: "Estrela de Saturnália",
    blurb: "A neve de Saturno brilha no Acheron. Ecos do Acheron aparecem +2% mais.",
    cost: "111111",
    branch: "season",
    ring: 3,
    angle: 68.59,
    icon: "starsnow",
    requires: {
      talentIds: [
        "rodizio_das_estacoes",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "starspawn",
    name: "Estrela de Perséfone",
    blurb: "A primavera da rainha agita o rio. Ecos do Acheron aparecem +2% mais.",
    cost: "111111",
    branch: "season",
    ring: 3,
    angle: 79.91,
    icon: "starspawn",
    requires: {
      talentIds: [
        "rodizio_das_estacoes",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "starterror",
    name: "Estrela de Lemúria",
    blurb: "Os mortos inquietos atraem Ecos. Ecos do Acheron aparecem +2% mais.",
    cost: "111111",
    branch: "season",
    ring: 3,
    angle: 91.22,
    icon: "starterror",
    requires: {
      talentIds: [
        "rodizio_das_estacoes",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "startrade",
    name: "Estrela de Hermes",
    blurb: "Dia de feira, dia de sorte. Ecos do Acheron aparecem +2% mais.",
    cost: "111111",
    branch: "season",
    ring: 3,
    angle: 102.54,
    icon: "startrade",
    requires: {
      talentIds: [
        "rodizio_das_estacoes",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "beelzebub",
    name: "Belzebu",
    blurb: "O senhor das moscas não deixa nada parar. Janela offline +128 h.",
    cost: "117649",
    branch: "demon",
    ring: 7,
    angle: 57.84,
    icon: "beelzebub",
    requires: {
      talentIds: [
        "asmodeus",
      ],
    },
    effects: {
      offlineExtraHours: 128,
    },
  },
  {
    id: "seraphim",
    name: "Serafins",
    blurb: "Fogo que vigia de longe. Offline rende +10% do SPS.",
    cost: "117649",
    branch: "angel",
    ring: 7,
    angle: -66.36,
    icon: "seraphim",
    requires: {
      talentIds: [
        "cherubim",
      ],
    },
    effects: {
      offlineRate: "0.10",
    },
  },
  {
    id: "sinergias_vol_i",
    name: "Sinergias Vol. I",
    blurb: "Malha Styx Vol. I. Libera as Sinergias Vol. I.",
    cost: "222222",
    branch: "production",
    ring: 6,
    angle: 2.17,
    icon: "sinergias_vol_i",
    requires: {
      talentIds: [
        "satan",
        "dominions",
      ],
    },
    effects: {
      synergyVolUnlock: 1,
    },
  },
  {
    id: "divine_bakeries",
    name: "Padarias Divinas",
    blurb: "Tudo no Olimpo sai mais em conta. Geradores 1% mais baratos. Juramentos 1% mais baratos.",
    cost: "399999",
    branch: "discount",
    ring: 5,
    angle: -28.1,
    icon: "divine_bakeries",
    requires: {
      talentIds: [
        "vendas_divinas",
        "desconto_divino",
      ],
    },
    effects: {
      generatorCostMult: "0.99",
      upgradeCostMult: "0.99",
    },
  },
  {
    id: "elder_spice",
    name: "Especiaria Anciã",
    blurb: "Um tempero que atrai mais Sanguessugas. +2 vagas de Sanguessuga.",
    cost: "444444",
    branch: "demon",
    ring: 6,
    angle: 55.4,
    icon: "elder_spice",
    requires: {
      talentIds: [
        "unholy_bait",
      ],
    },
    effects: {
      leechCapBonus: 2,
    },
  },
  {
    id: "sacrilegious_corruption",
    name: "Corrupção Sacrílega",
    blurb: "O que é digerido volta mais gordo. Sanguessugas devolvem +5%.",
    cost: "444444",
    branch: "demon",
    ring: 6,
    angle: 61.41,
    icon: "sacrilegious_corruption",
    requires: {
      talentIds: [
        "unholy_bait",
      ],
    },
    effects: {
      leechPayoutMult: "1.05",
    },
  },
  {
    id: "five_finger_discount",
    name: "Desconto dos Cinco Dedos",
    blurb: "Ninguém viu nada. Geradores 1% mais baratos.",
    cost: "555555",
    branch: "discount",
    ring: 5,
    angle: 1.95,
    icon: "five_finger_discount",
    requires: {
      talentIds: [
        "luvas_de_halo",
        "abadao",
      ],
    },
    effects: {
      generatorCostMult: "0.99",
    },
  },
  {
    id: "god",
    name: "Deus",
    blurb: "Nada escapa ao olhar mais alto. Offline rende +5% do SPS.",
    cost: "823543",
    branch: "angel",
    ring: 8,
    angle: -60.57,
    icon: "god",
    requires: {
      talentIds: [
        "seraphim",
      ],
    },
    effects: {
      offlineRate: "0.05",
    },
  },
  {
    id: "lucifer",
    name: "Lúcifer",
    blurb: "A estrela caída estende a noite inteira. Janela offline +256 h.",
    cost: "823543",
    branch: "demon",
    ring: 8,
    angle: 61.34,
    icon: "lucifer",
    requires: {
      talentIds: [
        "beelzebub",
      ],
    },
    effects: {
      offlineExtraHours: 256,
    },
  },
  {
    id: "inspired_checklist",
    name: "Lista Inspirada",
    blurb: "Juramentos riscados um a um. Juramentos 2% mais baratos.",
    cost: "900000",
    branch: "persistent",
    ring: 3,
    angle: 1.85,
    icon: "inspired_checklist",
    requires: {
      talentIds: [
        "persistent_memory",
        "permanent_slot_ii",
      ],
    },
    effects: {
      upgradeCostMult: "0.98",
    },
  },
  {
    id: "golden_cookie_alert_sound",
    name: "Sino do Acheron",
    blurb: "Um badalo que avisa antes da maré. Todos os geradores +1%.",
    cost: "999999",
    branch: "misc",
    ring: 4,
    angle: -19.85,
    icon: "golden_cookie_alert_sound",
    requires: {
      talentIds: [
        "residual_luck",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "wrapping_paper",
    name: "Mortalhas de Presente",
    blurb: "Embrulhos fúnebres para as festas. Todos os geradores +1%.",
    cost: "999999",
    branch: "season",
    ring: 2,
    angle: 109.5,
    icon: "wrapping_paper",
    requires: {
      talentIds: [
        "heralds",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "fanciful_dairy_selection",
    name: "Ânforas de Néctar Raro",
    blurb: "Leites de sabores que nenhum vivo provou. Todos os geradores +1%.",
    cost: "1000000",
    branch: "misc",
    ring: 2,
    angle: -16.78,
    icon: "fanciful_dairy_selection",
    requires: {
      talentIds: [
        "classic_dairy_selection",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "contabilidade_genial",
    name: "Contabilidade Genial",
    blurb: "Caronte anota cada óbolo. A loja detalha em quanto tempo cada compra se paga.",
    cost: "2000000",
    branch: "persistent",
    ring: 4,
    angle: 6.38,
    icon: "contabilidade_genial",
    requires: {
      talentIds: [
        "inspired_checklist",
      ],
    },
    effects: {
      richAmort: true,
    },
  },
  {
    id: "sinergias_vol_ii",
    name: "Sinergias Vol. II",
    blurb: "Malha Styx Vol. II. Libera as Sinergias Vol. II.",
    cost: "2222222",
    branch: "production",
    ring: 8,
    angle: 13.27,
    icon: "sinergias_vol_ii",
    requires: {
      talentIds: [
        "beelzebub",
        "seraphim",
        "sinergias_vol_i",
      ],
    },
    effects: {
      synergyVolUnlock: 2,
    },
  },
  {
    id: "permanent_slot_iii",
    name: "Eco do Styx III",
    blurb: "Três juramentos atravessam o Lethe. 3 juramento(s) sobrevivem ao Lethe.",
    cost: "3000000",
    branch: "persistent",
    ring: 3,
    angle: 13.16,
    icon: "permanent_slot_iii",
    requires: {
      talentIds: [
        "permanent_slot_ii",
      ],
    },
    effects: {
      permanentSlot: 3,
    },
  },
  {
    id: "label_printer",
    name: "Selos de Bronze",
    blurb: "Cada juramento ganha seu selo. Juramentos 1% mais baratos.",
    cost: "5000000",
    branch: "persistent",
    ring: 5,
    angle: 9.08,
    icon: "label_printer",
    requires: {
      talentIds: [
        "contabilidade_genial",
      ],
    },
    effects: {
      upgradeCostMult: "0.99",
    },
  },
  {
    id: "wrinkly_cookies",
    name: "Bolachas Enrugadas",
    blurb: "Assadas no ventre das Sanguessugas. Todos os geradores +10%.",
    cost: "6666666",
    branch: "demon",
    ring: 7,
    angle: 63.04,
    icon: "wrinkly_cookies",
    requires: {
      talentIds: [
        "sacrilegious_corruption",
        "elder_spice",
      ],
    },
    effects: {
      allGeneratorsMult: "1.10",
    },
  },
  {
    id: "distilled_essence_of_redoubled_luck",
    name: "Essência de Sorte Destilada",
    blurb: "Uma gota que dobra o acaso. Ecos do Acheron aparecem +5% mais.",
    cost: "7777777",
    branch: "golden",
    ring: 6,
    angle: -36.68,
    icon: "distilled_essence_of_redoubled_luck",
    requires: {
      talentIds: [
        "divine_bakeries",
        "residual_luck",
      ],
    },
    effects: {
      shimmerLuckMult: "1.05",
    },
  },
  {
    id: "distinguished_wallpaper_assortment",
    name: "Tapeçarias do Olimpo",
    blurb: "Fios de ouro roubados de cima. Todos os geradores +1%.",
    cost: "10000000",
    branch: "misc",
    ring: 3,
    angle: -9.47,
    icon: "distinguished_wallpaper_assortment",
    requires: {
      talentIds: [
        "basic_wallpaper_assortment",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_flavor",
    name: "Sabor Liberto",
    blurb: "O primeiro sabor sem correntes. Todos os geradores +1%.",
    cost: "10000000",
    branch: "unshackled",
    ring: 6,
    angle: -58.3,
    icon: "unshackled_flavor",
    requires: {
      talentIds: [
        "label_printer",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_cursors",
    name: "Foices Libertas",
    blurb: "As Mil Foices sem grilhões. Mil Foices rendem ×25.",
    cost: "15000000",
    branch: "unshackled",
    ring: 7,
    angle: 28.83,
    icon: "unshackled_cursors",
    requires: {
      talentIds: [
        "unshackled_flavor",
      ],
    },
    effects: {
      unshackleFingers: true,
    },
  },
  {
    id: "quimera",
    name: "Quimera",
    blurb: "Três bestas, uma só vigília. Juramentos 1% mais baratos. Offline rende +5% do SPS. Janela offline +48 h.",
    cost: "40353607",
    branch: "cookie",
    ring: 9,
    angle: 22.65,
    icon: "quimera",
    requires: {
      talentIds: [
        "god",
        "lucifer",
        "sinergias_vol_ii",
      ],
    },
    effects: {
      offlineRate: "0.05",
      offlineExtraHours: 48,
      upgradeCostMult: "0.99",
    },
  },
  {
    id: "pagamento_da_sorte",
    name: "Pagamento da Sorte",
    blurb: "Caronte paga o troco em ouro. Ecos do Acheron aparecem +1% mais. Potência dos Óbolos +1%.",
    cost: "77777777",
    branch: "golden",
    ring: 4,
    angle: -46.08,
    icon: "pagamento_da_sorte",
    requires: {
      talentIds: [
        "numero_da_sorte",
        "decisive_fate",
      ],
    },
    effects: {
      prestigeEffectMult: "1.01",
      shimmerLuckMult: "1.01",
    },
  },
  {
    id: "eye_of_the_wrinkler",
    name: "Olho da Sanguessuga",
    blurb: "Você vê o que elas engoliram. Mostra quanto cada Sanguessuga digeriu.",
    cost: "99999999",
    branch: "demon",
    ring: 8,
    angle: 65.93,
    icon: "eye_of_the_wrinkler",
    requires: {
      talentIds: [
        "wrinkly_cookies",
      ],
    },
    effects: {
      leechDigestVisible: true,
    },
  },
  {
    id: "stevia_caelestis",
    name: "Estévia Celeste",
    blurb: "Um doce que não pesa na balança dos Juízes. Todos os geradores +2%.",
    cost: "100000000",
    branch: "demon",
    ring: 8,
    angle: 70.51,
    icon: "stevia_caelestis",
    requires: {
      talentIds: [
        "wrinkly_cookies",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "cozimento_de_acucar",
    name: "Cozimento de Néctar",
    blurb: "Néctar guardado é néctar que rende. Néctar em Reserva: +1% de SPS por Néctar guardado (até 100).",
    cost: "200000000",
    branch: "nectar",
    ring: 9,
    angle: 93.08,
    icon: "cozimento_de_acucar",
    requires: {
      talentIds: [
        "stevia_caelestis",
      ],
    },
    effects: {
      nectarReserveBonus: true,
    },
  },
  {
    id: "diabetica_daemonicus",
    name: "Diabetes Demoníaca",
    blurb: "Açúcar demais deixa a Foice nervosa. Ceifar +5%.",
    cost: "300000000",
    branch: "demon",
    ring: 9,
    angle: 71.58,
    icon: "diabetica_daemonicus",
    requires: {
      talentIds: [
        "stevia_caelestis",
        "lucifer",
      ],
    },
    effects: {
      clickTalentMult: "1.05",
    },
  },
  {
    id: "permanent_slot_iv",
    name: "Eco do Styx IV",
    blurb: "Quatro juramentos sobrevivem à Catábase. 4 juramento(s) sobrevivem ao Lethe.",
    cost: "400000000",
    branch: "persistent",
    ring: 4,
    angle: 15.13,
    icon: "permanent_slot_iv",
    requires: {
      talentIds: [
        "permanent_slot_iii",
      ],
    },
    effects: {
      permanentSlot: 4,
    },
  },
  {
    id: "frenesi_de_acucar",
    name: "Desejo de Néctar",
    blurb: "Uma vontade que só o Frenesi mata. Libera o Frenesi de Néctar (×3 SPS por 1 h, uma vez por corrida).",
    cost: "400000000",
    branch: "nectar",
    ring: 10,
    angle: 109.09,
    icon: "frenesi_de_acucar",
    requires: {
      talentIds: [
        "cozimento_de_acucar",
      ],
    },
    effects: {
      nectarFrenzyUnlock: true,
    },
  },
  {
    id: "aura_gloves",
    name: "Luvas de Aura",
    blurb: "Mãos que brilham no escuro. Ceifar +5%.",
    cost: "555555555",
    branch: "discount",
    ring: 5,
    angle: -5.17,
    icon: "aura_gloves",
    requires: {
      talentIds: [
        "luvas_de_halo",
      ],
    },
    effects: {
      clickTalentMult: "1.05",
    },
  },
  {
    id: "sugar_aging_process",
    name: "Envelhecer o Néctar",
    blurb: "O néctar velho é o mais forte. Néctar em Reserva: +1% de SPS por Néctar guardado (até 100). Libera o Frenesi de Néctar (×3 SPS por 1 h, uma vez por corrida).",
    cost: "600000000",
    branch: "nectar",
    ring: 11,
    angle: 109.32,
    icon: "sugar_aging_process",
    requires: {
      talentIds: [
        "frenesi_de_acucar",
        "diabetica_daemonicus",
      ],
    },
    effects: {
      nectarReserveBonus: true,
      nectarFrenzyUnlock: true,
    },
  },
  {
    id: "shimmering_veil",
    name: "Manto Cintilante",
    blurb: "Um tecido de luz sobre o Domínio. Todos os geradores +10%.",
    cost: "999999999",
    branch: "golden",
    ring: 7,
    angle: -39.61,
    icon: "shimmering_veil",
    requires: {
      talentIds: [
        "distilled_essence_of_redoubled_luck",
      ],
    },
    effects: {
      allGeneratorsMult: "1.10",
    },
  },
  {
    id: "sucralosia_inutilis",
    name: "Sucralose Inútil",
    blurb: "Um adoçante que só serve para dar sorte. Ecos do Acheron aparecem +2% mais.",
    cost: "1000000000",
    branch: "demon",
    ring: 10,
    angle: 74.57,
    icon: "sucralosia_inutilis",
    requires: {
      talentIds: [
        "diabetica_daemonicus",
      ],
    },
    effects: {
      shimmerLuckMult: "1.02",
    },
  },
  {
    id: "sugar_crystal_cookies",
    name: "Bolachas de Cristal de Néctar",
    blurb: "Crocantes como gelo do Cócito. Todos os geradores +5%.",
    cost: "1000000000",
    branch: "cookie",
    ring: 10,
    angle: 70.83,
    icon: "sugar_crystal_cookies",
    requires: {
      talentIds: [
        "cozimento_de_acucar",
      ],
    },
    effects: {
      allGeneratorsMult: "1.05",
    },
  },
  {
    id: "keepsakes",
    name: "Relicários",
    blurb: "Lembranças de festas passadas. Todos os geradores +2%.",
    cost: "1111111111",
    branch: "season",
    ring: 4,
    angle: 98.85,
    icon: "keepsakes",
    requires: {
      talentIds: [
        "starsnow",
        "starlove",
        "starterror",
        "startrade",
        "starspawn",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "unshackled_berrylium",
    name: "Bagálio Liberto",
    blurb: "Frutos de metal que não enferrujam. Todos os geradores +1%.",
    cost: "1810193360",
    branch: "unshackled",
    ring: 7,
    angle: -99.63,
    icon: "unshackled_berrylium",
    requires: {
      talentIds: [
        "unshackled_flavor",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_grandmas",
    name: "Servos Libertos",
    blurb: "Os remadores de Caronte sem correntes. Servos de Caronte produz ×25.",
    cost: "1920000000",
    branch: "unshackled",
    ring: 8,
    angle: 79.26,
    icon: "unshackled_grandmas",
    requires: {
      talentIds: [
        "unshackled_cursors",
      ],
    },
    effects: {
      unshackleGeneratorId: "charon_servants",
    },
  },
  {
    id: "cat_ladies",
    name: "Damas dos Filhotes",
    blurb: "Quem cuida dos cães cuida do Domínio. ×1,29 de SPS por Filhote do Cérbero possuído.",
    cost: "9000000000",
    branch: "angel",
    ring: 7,
    angle: -61.16,
    icon: "cat_ladies",
    requires: {
      talentIds: [
        "kitten_angels",
      ],
    },
    effects: {
      catLadies: true,
    },
  },
  {
    id: "kitten_wages",
    name: "Salário dos Filhotes",
    blurb: "Ossos mais baratos no mercado. Filhotes do Cérbero 10% mais baratos.",
    cost: "9000000000",
    branch: "angel",
    ring: 7,
    angle: -55.96,
    icon: "kitten_wages",
    requires: {
      talentIds: [
        "kitten_angels",
      ],
    },
    effects: {
      kittenUpgradeDiscount: true,
    },
  },
  {
    id: "cosmic_beginner_s_luck",
    name: "Sorte de Principiante Cósmica",
    blurb: "O rio ajuda quem acabou de chegar. Ecos do Acheron aparecem +3% mais.",
    cost: "14999999985",
    branch: "golden",
    ring: 8,
    angle: -39.92,
    icon: "cosmic_beginner_s_luck",
    requires: {
      talentIds: [
        "shimmering_veil",
      ],
    },
    effects: {
      shimmerLuckMult: "1.03",
    },
  },
  {
    id: "reinforced_membrane",
    name: "Membrana Reforçada",
    blurb: "O Manto não rasga tão fácil. Todos os geradores +2%.",
    cost: "14999999985",
    branch: "golden",
    ring: 8,
    angle: -35.34,
    icon: "reinforced_membrane",
    requires: {
      talentIds: [
        "shimmering_veil",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "unshackled_farms",
    name: "Cães Libertos",
    blurb: "Os Cães Cerberianos soltos da coleira. Cão Cerberiano produz ×25.",
    cost: "32805000000",
    branch: "unshackled",
    ring: 9,
    angle: -20.47,
    icon: "unshackled_farms",
    requires: {
      talentIds: [
        "unshackled_grandmas",
      ],
    },
    effects: {
      unshackleGeneratorId: "cerberian_hound",
    },
  },
  {
    id: "unshackled_blueberrylium",
    name: "Mirtilálio Liberto",
    blurb: "Um metal azul que pulsa. Todos os geradores +1%.",
    cost: "37879951162",
    branch: "unshackled",
    ring: 8,
    angle: 8.68,
    icon: "unshackled_blueberrylium",
    requires: {
      talentIds: [
        "unshackled_berrylium",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "permanent_slot_v",
    name: "Eco do Styx V",
    blurb: "Cinco juramentos — memória máxima do rio. 5 juramento(s) sobrevivem ao Lethe.",
    cost: "50000000000",
    branch: "persistent",
    ring: 5,
    angle: 16.2,
    icon: "permanent_slot_v",
    requires: {
      talentIds: [
        "permanent_slot_iv",
      ],
    },
    effects: {
      permanentSlot: 5,
    },
  },
  {
    id: "luminous_gloves",
    name: "Luvas Luminosas",
    blurb: "Cada golpe acende a margem. Ceifar +5%.",
    cost: "55555555555",
    branch: "discount",
    ring: 6,
    angle: -9.3,
    icon: "luminous_gloves",
    requires: {
      talentIds: [
        "aura_gloves",
      ],
    },
    effects: {
      clickTalentMult: "1.05",
    },
  },
  {
    id: "fortune_cookies",
    name: "Óbolos da Sorte",
    blurb: "Moedas com uma profecia gravada. Todos os geradores +2%.",
    cost: "77777777777",
    branch: "golden",
    ring: 7,
    angle: -34.4,
    icon: "fortune_cookies",
    requires: {
      talentIds: [
        "distilled_essence_of_redoubled_luck",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "pet_the_dragon",
    name: "Afagar o Dragão",
    blurb: "Ele ronrona fogo. Todos os geradores +2%.",
    cost: "99999999999",
    branch: "misc",
    ring: 4,
    angle: -11.11,
    icon: "pet_the_dragon",
    requires: {
      talentIds: [
        "ovo_primordial",
        "residual_luck",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "sound_test",
    name: "Teste de Lira",
    blurb: "Afinando a lira de Orfeu. Todos os geradores +1%.",
    cost: "99999999999",
    branch: "misc",
    ring: 5,
    angle: -12.3,
    icon: "sound_test",
    requires: {
      talentIds: [
        "fanciful_dairy_selection",
        "distinguished_wallpaper_assortment",
        "golden_cookie_alert_sound",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "delicate_touch",
    name: "Toque Delicado",
    blurb: "A Foice passa sem rasgar o Manto. Todos os geradores +2%.",
    cost: "149999999985",
    branch: "golden",
    ring: 9,
    angle: -36.03,
    icon: "delicate_touch",
    requires: {
      talentIds: [
        "reinforced_membrane",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "unshackled_mines",
    name: "Juízes Libertos",
    blurb: "Os Juízes do Tártaro sem amarras. Juiz do Tártaro produz ×25.",
    cost: "245760000000",
    branch: "unshackled",
    ring: 10,
    angle: -74.05,
    icon: "unshackled_mines",
    requires: {
      talentIds: [
        "unshackled_farms",
      ],
    },
    effects: {
      unshackleGeneratorId: "tartarus_judge",
    },
  },
  {
    id: "unshackled_chalcedhoney",
    name: "Calcedmel Liberto",
    blurb: "Mel de pedra escorrendo livre. Todos os geradores +1%.",
    cost: "327680000000",
    branch: "unshackled",
    ring: 9,
    angle: 67.47,
    icon: "unshackled_chalcedhoney",
    requires: {
      talentIds: [
        "unshackled_blueberrylium",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "box_of_maybe_cookies",
    name: "Caixa de Talvez-Bolachas",
    blurb: "Pode ser que estejam aí dentro. Todos os geradores +2%.",
    cost: "333000000000",
    branch: "cookie",
    ring: 11,
    angle: 57.8,
    icon: "box_of_maybe_cookies",
    requires: {
      talentIds: [
        "sugar_crystal_cookies",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "box_of_not_cookies",
    name: "Caixa de Não-Bolachas",
    blurb: "Definitivamente não são bolachas. Todos os geradores +2%.",
    cost: "333000000000",
    branch: "cookie",
    ring: 11,
    angle: 61.24,
    icon: "box_of_not_cookies",
    requires: {
      talentIds: [
        "sugar_crystal_cookies",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "box_of_pastries",
    name: "Caixa de Doces do Elísio",
    blurb: "Confeitaria dos campos dos bem-aventurados. Todos os geradores +2%.",
    cost: "333000000000",
    branch: "cookie",
    ring: 11,
    angle: 64.68,
    icon: "box_of_pastries",
    requires: {
      talentIds: [
        "sugar_crystal_cookies",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "comprimidos_milkhelp",
    name: "Pastilhas do Véu",
    blurb: "Para quem bebe Véu demais. +5% de SPS por 100% de Véu.",
    cost: "900000000000",
    branch: "nectar",
    ring: 8,
    angle: 28.57,
    icon: "comprimidos_milkhelp",
    requires: {
      talentIds: [
        "cat_ladies",
      ],
    },
    effects: {
      milkhelpServants: true,
    },
  },
  {
    id: "unshackled_factories",
    name: "Forjas Libertas",
    blurb: "O Phlegethon sem represas. Forja de Phlegethon produz ×25.",
    cost: "1171875000000",
    branch: "unshackled",
    ring: 11,
    angle: -102.24,
    icon: "unshackled_factories",
    requires: {
      talentIds: [
        "unshackled_mines",
      ],
    },
    effects: {
      unshackleGeneratorId: "phlegethon_forge",
    },
  },
  {
    id: "unshackled_buttergold",
    name: "Manteigouro Liberto",
    blurb: "Ouro que derrete na boca. Todos os geradores +1%.",
    cost: "1746928107422",
    branch: "unshackled",
    ring: 10,
    angle: 102.03,
    icon: "unshackled_buttergold",
    requires: {
      talentIds: [
        "unshackled_chalcedhoney",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_banks",
    name: "Tronos Libertos",
    blurb: "O Trono de Obsidiana sem dono. Trono de Obsidiana produz ×25.",
    cost: "4199040000000",
    branch: "unshackled",
    ring: 12,
    angle: -116.48,
    icon: "unshackled_banks",
    requires: {
      talentIds: [
        "unshackled_factories",
      ],
    },
    effects: {
      unshackleGeneratorId: "obsidian_throne",
    },
  },
  {
    id: "unshackled_sugarmuck",
    name: "Açucarlodo Liberto",
    blurb: "Um lodo doce no fundo do rio. Todos os geradores +1%.",
    cost: "6857003606358",
    branch: "unshackled",
    ring: 11,
    angle: 120.57,
    icon: "unshackled_sugarmuck",
    requires: {
      talentIds: [
        "unshackled_buttergold",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_temples",
    name: "Templos Libertos",
    blurb: "Mnemosyne lembra sem limites. Templo de Mnemosyne produz ×25.",
    cost: "12353145000000",
    branch: "unshackled",
    ring: 13,
    angle: -123.04,
    icon: "unshackled_temples",
    requires: {
      talentIds: [
        "unshackled_banks",
      ],
    },
    effects: {
      unshackleGeneratorId: "mnemosyne_temple",
    },
  },
  {
    id: "steadfast_murmur",
    name: "Murmúrio Firme",
    blurb: "O Manto sussurra e não cede. Todos os geradores +2%.",
    cost: "14999999999985",
    branch: "golden",
    ring: 10,
    angle: -34.75,
    icon: "steadfast_murmur",
    requires: {
      talentIds: [
        "delicate_touch",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "unshackled_jetmint",
    name: "Menta Negra Liberta",
    blurb: "Fresca como um túmulo. Todos os geradores +1%.",
    cost: "21788899719681",
    branch: "unshackled",
    ring: 12,
    angle: 131.04,
    icon: "unshackled_jetmint",
    requires: {
      talentIds: [
        "unshackled_sugarmuck",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_wizard_towers",
    name: "Torres Libertas",
    blurb: "As Torres do Estige sem selos. Torre do Estige produz ×25.",
    cost: "31457280000000",
    branch: "unshackled",
    ring: 14,
    angle: -125.38,
    icon: "unshackled_wizard_towers",
    requires: {
      talentIds: [
        "unshackled_temples",
      ],
    },
    effects: {
      unshackleGeneratorId: "styx_tower",
    },
  },
  {
    id: "unshackled_cherrysilver",
    name: "Cereja-Prata Liberta",
    blurb: "Fruta que reflete a lua. Todos os geradores +1%.",
    cost: "59316416015158",
    branch: "unshackled",
    ring: 13,
    angle: 137.06,
    icon: "unshackled_cherrysilver",
    requires: {
      talentIds: [
        "unshackled_jetmint",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_shipments",
    name: "Barcas Libertas",
    blurb: "As Barcas das Estrelas sem âncora. Barca das Estrelas produz ×25.",
    cost: "71744535000000",
    branch: "unshackled",
    ring: 15,
    angle: -125.39,
    icon: "unshackled_shipments",
    requires: {
      talentIds: [
        "unshackled_wizard_towers",
      ],
    },
    effects: {
      unshackleGeneratorId: "star_barge",
    },
  },
  {
    id: "unshackled_hazelrald",
    name: "Avelãrald Liberto",
    blurb: "Uma joia com gosto de noz. Todos os geradores +1%.",
    cost: "143489070000000",
    branch: "unshackled",
    ring: 14,
    angle: 140.63,
    icon: "unshackled_hazelrald",
    requires: {
      talentIds: [
        "unshackled_cherrysilver",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_alchemy_labs",
    name: "Laboratórios Libertos",
    blurb: "A alquimia do Tártaro sem regras. Laboratório do Tártaro produz ×25.",
    cost: "150000000000000",
    branch: "unshackled",
    ring: 16,
    angle: -124.13,
    icon: "unshackled_alchemy_labs",
    requires: {
      talentIds: [
        "unshackled_shipments",
      ],
    },
    effects: {
      unshackleGeneratorId: "tartarus_lab",
    },
  },
  {
    id: "unshackled_portals",
    name: "Portais Libertos",
    blurb: "O Érebo de portas escancaradas. Portal do Érebo produz ×25.",
    cost: "292307565000000",
    branch: "unshackled",
    ring: 17,
    angle: -2.76,
    icon: "unshackled_portals",
    requires: {
      talentIds: [
        "unshackled_alchemy_labs",
      ],
    },
    effects: {
      unshackleGeneratorId: "erebus_portal",
    },
  },
  {
    id: "unshackled_mooncandy",
    name: "Doce Lunar Liberto",
    blurb: "Açúcar colhido de Selene. Todos os geradores +1%.",
    cost: "316227766016838",
    branch: "unshackled",
    ring: 15,
    angle: 23.45,
    icon: "unshackled_mooncandy",
    requires: {
      talentIds: [
        "unshackled_hazelrald",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_time_machines",
    name: "Teares Libertos",
    blurb: "O Tear de Cronos sem fio de prumo. Tear de Cronos produz ×25.",
    cost: "537477120000000",
    branch: "unshackled",
    ring: 18,
    angle: 64.26,
    icon: "unshackled_time_machines",
    requires: {
      talentIds: [
        "unshackled_portals",
      ],
    },
    effects: {
      unshackleGeneratorId: "chronos_loom",
    },
  },
  {
    id: "unshackled_astrofudge",
    name: "Astrocaramelo Liberto",
    blurb: "Caramelo de estrela cadente. Todos os geradores +1%.",
    cost: "646316344324949",
    branch: "unshackled",
    ring: 16,
    angle: -39.72,
    icon: "unshackled_astrofudge",
    requires: {
      talentIds: [
        "unshackled_mooncandy",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_antimatter_condensers",
    name: "Condensadores Libertos",
    blurb: "O Vazio sem contenção. Condensador do Vazio produz ×25.",
    cost: "941227755000000",
    branch: "unshackled",
    ring: 19,
    angle: 101.39,
    icon: "unshackled_antimatter_condensers",
    requires: {
      talentIds: [
        "unshackled_time_machines",
      ],
    },
    effects: {
      unshackleGeneratorId: "void_condenser",
    },
  },
  {
    id: "unshackled_alabascream",
    name: "Alabascreme Liberto",
    blurb: "Creme branco como mármore de túmulo. Todos os geradores +1%.",
    cost: "1241250239661060",
    branch: "unshackled",
    ring: 17,
    angle: -73.2,
    icon: "unshackled_alabascream",
    requires: {
      talentIds: [
        "unshackled_astrofudge",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "glittering_edge",
    name: "Fio Cintilante",
    blurb: "A borda do Manto corta a escuridão. Todos os geradores +2%.",
    cost: "1499999999999985",
    branch: "golden",
    ring: 11,
    angle: -33.52,
    icon: "glittering_edge",
    requires: {
      talentIds: [
        "steadfast_murmur",
      ],
    },
    effects: {
      allGeneratorsMult: "1.02",
    },
  },
  {
    id: "unshackled_prisms",
    name: "Prismas Libertos",
    blurb: "A luz das Moiras sem filtro. Prisma das Moiras produz ×25.",
    cost: "1581202560000000",
    branch: "unshackled",
    ring: 20,
    angle: 122.07,
    icon: "unshackled_prisms",
    requires: {
      talentIds: [
        "unshackled_antimatter_condensers",
      ],
    },
    effects: {
      unshackleGeneratorId: "moirai_prism",
    },
  },
  {
    id: "unshackled_iridyum",
    name: "Irídio Liberto",
    blurb: "O metal do arco-íris de Íris. Todos os geradores +1%.",
    cost: "2262429955028239",
    branch: "unshackled",
    ring: 18,
    angle: -90.34,
    icon: "unshackled_iridyum",
    requires: {
      talentIds: [
        "unshackled_alabascream",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_chancemakers",
    name: "Forjas do Destino Libertas",
    blurb: "O acaso forjado sem molde. Forja do Destino produz ×25.",
    cost: "2562890625000000",
    branch: "unshackled",
    ring: 21,
    angle: 133.7134605468919,
    icon: "unshackled_chancemakers",
    requires: {
      talentIds: [
        "unshackled_prisms",
      ],
    },
    effects: {
      unshackleGeneratorId: "fate_forge",
    },
  },
  {
    id: "unshackled_glucosmium",
    name: "Glicósmio Liberto",
    blurb: "Açúcar das estrelas mais densas. Todos os geradores +1%.",
    cost: "3944212159073245",
    branch: "unshackled",
    ring: 19,
    angle: -98.5,
    icon: "unshackled_glucosmium",
    requires: {
      talentIds: [
        "unshackled_iridyum",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_fractal_engines",
    name: "Motores Fractais Libertos",
    blurb: "Engrenagens dentro de engrenagens, soltas. Motor Fractal produz ×25.",
    cost: "4026531840000000",
    branch: "unshackled",
    ring: 22,
    angle: 140.3806385949082,
    icon: "unshackled_fractal_engines",
    requires: {
      talentIds: [
        "unshackled_chancemakers",
      ],
    },
    effects: {
      unshackleGeneratorId: "fractal_engine",
    },
  },
  {
    id: "unshackled_javascript_consoles",
    name: "Consoles do Oráculo Libertos",
    blurb: "O Oráculo fala sem censura. Console do Oráculo produz ×25.",
    cost: "6155080095000000",
    branch: "unshackled",
    ring: 23,
    angle: 29.668174756611272,
    icon: "unshackled_javascript_consoles",
    requires: {
      talentIds: [
        "unshackled_fractal_engines",
      ],
    },
    effects: {
      unshackleGeneratorId: "oracle_console",
    },
  },
  {
    id: "unshackled_glimmeringue",
    name: "Merengue Cintilante Liberto",
    blurb: "Espuma de luz que não desmancha. Todos os geradores +1%.",
    cost: "6617355139184080",
    branch: "unshackled",
    ring: 20,
    angle: 12.93,
    icon: "unshackled_glimmeringue",
    requires: {
      talentIds: [
        "unshackled_glucosmium",
      ],
    },
    effects: {
      allGeneratorsMult: "1.01",
    },
  },
  {
    id: "unshackled_idleverses",
    name: "Idleversos Libertos",
    blurb: "Universos ociosos sem fronteira. Idleverso Ctoniano produz ×25.",
    cost: "9183300480000000",
    branch: "unshackled",
    ring: 24,
    angle: -29.953092119157912,
    icon: "unshackled_idleverses",
    requires: {
      talentIds: [
        "unshackled_javascript_consoles",
      ],
    },
    effects: {
      unshackleGeneratorId: "chthonic_idleverse",
    },
  },
  {
    id: "unshackled_cortex_bakers",
    name: "Padeiros do Córtex Libertos",
    blurb: "Mentes que assam sem parar. Padeiro do Córtex produz ×25.",
    cost: "13408076085000000",
    branch: "unshackled",
    ring: 25,
    angle: 50.893446393286666,
    icon: "unshackled_cortex_bakers",
    requires: {
      talentIds: [
        "unshackled_idleverses",
      ],
    },
    effects: {
      unshackleGeneratorId: "cortex_baker",
    },
  },
  {
    id: "unshackled_you",
    name: "Imperador Liberto",
    blurb: "Você mesmo, sem correntes. O Imperador (You) produz ×25.",
    cost: "19200000000000000",
    branch: "unshackled",
    ring: 26,
    angle: -17.008604483692324,
    icon: "unshackled_you",
    requires: {
      talentIds: [
        "unshackled_cortex_bakers",
      ],
    },
    effects: {
      unshackleGeneratorId: "the_emperor",
    },
  },
]);

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
export const LEGACY_TALENT_COSTS = Object.freeze({
  memoria_das_sombras: "1",
  juramento_eterno: "1",
  noite_prolongada: "2",
  veu_eficiente: "2",
  foice_ancestral: "3",
  favor_de_caronte: "3",
  margem_generosa: "3",
  pacto_do_silencio: "3",
  olho_da_curva: "4",
  eco_do_styx: "4",
  mnemosyne_profunda: "5",
  segundo_folego: "5",
  nectar_em_reserva: "5",
  ovo_primordial: "5",
  rebanho_despertado: "5",
  matilha_cerberiana: "6",
  eco_ressonante: "6",
  calice_da_memoria: "7",
  mnemosyne_tripla: "8",
  frenesi_de_nectar_talento: "8",
  eco_ancestral_iii: "9",
  forja_despertada: "10",
  eco_ancestral_iv: "12",
  eco_ancestral_v: "15",
  rodizio_das_estacoes: "5",
  preludio_ctoniano: "4",
  lamina_viva: "5",
  mare_inicial: "7",
  legado_do_rio: "6",
  sinergias_vol_i: "8",
  sinergias_vol_ii: "25",
});

/** IDs antigos do Rio → nós Heavenly (null = só refund). */
export const LEGACY_TALENT_MAP = Object.freeze({
  legado: "legado",
  sinergias_vol_i: "sinergias_vol_i",
  sinergias_vol_ii: "sinergias_vol_ii",
  ovo_primordial: "ovo_primordial",
  rodizio_das_estacoes: "rodizio_das_estacoes",
  juramento_eterno: "legado",
  memoria_das_sombras: "kit_inicial",
  margem_generosa: "kit_inicial",
  foice_ancestral: "luvas_de_halo",
  favor_de_caronte: "desconto_divino",
  olho_da_curva: "contabilidade_genial",
  eco_do_styx: "permanent_slot_i",
  eco_ressonante: "permanent_slot_ii",
  eco_ancestral_iii: "permanent_slot_iii",
  eco_ancestral_iv: "permanent_slot_iv",
  eco_ancestral_v: "permanent_slot_v",
  noite_prolongada: "mamon",
  veu_eficiente: "portoes_gemeos",
  pacto_do_silencio: "abadao",
  mnemosyne_profunda: "numero_da_sorte",
  mnemosyne_tripla: "pagamento_da_sorte",
  mnemosyne_raiz: "quimera",
  nectar_em_reserva: "cozimento_de_acucar",
  frenesi_de_nectar_talento: "frenesi_de_acucar",
  preludio_ctoniano: null,
  segundo_folego: null,
  lamina_viva: null,
  rebanho_despertado: null,
  mare_inicial: null,
  torrente_das_umbras: null,
  servo_das_margens: null,
  matilha_cerberiana: null,
  forja_despertada: null,
  trono_sombrio: null,
  imperio_fluvial: null,
  legado_do_rio: null,
  calice_da_memoria: null,
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

/** Raio polar: rings 1–8 com gap cheio; rings altos comprimidos (árvore menos espalhada). */
export function talentRingRadius(ring, { ringGap = 88, rootR = 56 } = {}) {
  const n = Math.max(0, Math.floor(Number(ring) || 0));
  if (n === 0) return rootR;
  let r = 36;
  for (let i = 1; i <= n; i += 1) {
    const shrink = i <= 8 ? 1 : Math.max(0.45, 1 - 0.035 * (i - 8));
    r += ringGap * shrink;
  }
  return r;
}

export function talentNodePosition(talent, { cx = 0, cy = 0, ringGap = 88, rootR = 56 } = {}) {
  const ring = Math.max(0, Number(talent?.ring) || 0);
  const angleDeg = Number(talent?.angle) || 0;
  const rad = (angleDeg * Math.PI) / 180;
  const r = talentRingRadius(ring, { ringGap, rootR });
  return {
    x: cx + Math.sin(rad) * r,
    y: cy - Math.cos(rad) * r,
    r,
    angleDeg,
  };
}
