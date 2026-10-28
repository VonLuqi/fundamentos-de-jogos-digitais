<?php
declare(strict_types=1);

namespace App\Services\Despertar;

/**
 * Catálogo estático e constantes de O Despertar (`js/hades-despertar/config/*`).
 */
final class DespertarCatalog
{
    public const COST_MULTIPLIER = '1.15';
    public const PRESTIGE_RUN_DIVISOR = '4000000000';
    /** Divisor legado (pré-rebalance) — só para telemetria/documentação do heal. */
    public const LEGACY_PRESTIGE_RUN_DIVISOR = '1000000000';
    public const OBOL_BONUS_PER = '0.01';
    public const PRESTIGE_SOFTCAP_START = '100';
    public const PRESTIGE_SOFTCAP_LOG_COEFF = '25';
    public const LETHE_PREVIEW_RUN_SOULS = '100000000';
    /** Milestone: carteira Lethe já alinhada às fórmulas atuais (V1). */
    public const LETHE_REBALANCE_MILESTONE = 'letheRebalanceV1';
    /** Heal automático V2 (softcap óbolos + árvore cara). */
    public const LETHE_REBALANCE_V2_MILESTONE = 'letheRebalanceV2';

    public const CLICK_BASE = '1';
    public const CLICK_FLAT_BASE = '0';
    public const CLICK_MULT_BASE = '1';
    public const CLICK_K_SPS_BASE = '0';
    public const CLICK_K_SPS_ANCESTRAL = '0.01';
    public const CLICK_CAP_PER_SECOND = 20;

    public const OFFLINE_MIN_SECONDS = 10;
    public const OFFLINE_MAX_HOURS_BASE = 8;
    public const OFFLINE_MAX_HOURS_TALENT = 12;
    public const OFFLINE_EXTRA_HOURS_SILENCIO = 6;
    public const OFFLINE_EFFICIENCY_BASE = '0.80';
    public const OFFLINE_EFFICIENCY_TALENT = '1.00';

    public const GENERATOR_COST_MULT_BASE = '1';
    public const GENERATOR_COST_MULT_CHARON = '0.85';
    public const STARTING_SOULS_MEMORY = '5000';
    public const STARTING_SOULS_MARGIN = '25000';
    public const STARTING_SOULS_PRELUDIO = '15000';
    public const STARTING_SOULS_LAMINA = '50000';
    public const STARTING_SOULS_MARE = '75000';
    public const STARTING_SHADE_FOLEGO = 5;
    public const STARTING_SHADE_REBANHO = 25;
    public const STARTING_SHADE_TORRENTE = 50;
    public const STARTING_CHARON_SERVO = 3;
    public const STARTING_THRONE_SOMBRIO = 1;
    public const STARTING_HOUND_MATILHA = 3;
    public const STARTING_FORGE_DESPERTADA = 1;
    public const OFFLINE_EXTRA_HOURS_LEGADO = 4;
    public const IMPERIO_FLUVIAL_HOUNDS = 2;
    public const IMPERIO_FLUVIAL_FORGE = 1;

    public const MNEMOSYNE_MULT_BASE = '1';
    public const TALENT_JURAMENTO_ETERNO_MULT = '1.25';
    public const TALENT_MNEMOSYNE_PROFUNDA_MULT = '1.50';
    public const TALENT_MNEMOSYNE_TRIPLA_MULT = '2';
    public const TALENT_MNEMOSYNE_RAIZ_MULT = '2.5';
    public const TALENT_CALICE_MNEMOSYNE_NUM = '3';
    public const TALENT_CALICE_MNEMOSYNE_DEN = '2';
    public const ECO_STYX_RESSONANTE_COUNT = 2;

    /** Legado — validateSync confia no cliente; não usam mais reject de ganho. */
    public const SYNC_GAIN_TOLERANCE = '1.08';
    public const SYNC_ABSURD_GAIN_FLOOR = '100';
    public const SYNC_OFFLINE_JITTER_SECONDS = 60;
    /** Copy legada (não retornada no sync econômico). */
    public const JUDGES_REFUSED_MESSAGE = 'Os Juízes recusaram o saldo declarado — o Submundo restaurou o estado verdadeiro.';

    public const NEGATIVO_MULT = '15';
    public const GOLD_MULT = '2';
    public const STYX_UNLOCK_SOULS = '100';

    // --- Fase F2 (Eco do Acheron — Shimmers Golden / Wrath) ---
    public const SHIMMER_SPAWN_MIN_SEC = 420;
    public const SHIMMER_SPAWN_MAX_SEC = 720;
    public const SHIMMER_LIFETIME_SEC = 13;
    public const SHIMMER_MAX_ACTIVE = 1;
    public const SHIMMER_MAX_ACTIVE_BUFFS = 3;
    public const SHIMMER_SYNC_TOLERANCE_MS = 15000;
    public const SHIMMER_FRENZY_MULT = '7';
    public const SHIMMER_FRENZY_DURATION_SEC = 77;
    public const SHIMMER_CLICK_FRENZY_MULT = '777';
    public const SHIMMER_CLICK_FRENZY_DURATION_SEC = 13;
    public const SHIMMER_LUCKY_WALLET_FRACTION = '0.15';
    public const SHIMMER_LUCKY_SPS_SECONDS = '900';
    public const SHIMMER_LUCKY_FLAT_BONUS = '13';
    public const SHIMMER_BUILDING_SPECIAL_DURATION_SEC = 30;
    public const SHIMMER_BUILDING_SPECIAL_MAX_MULT = '100';
    public const SHIMMER_CLOT_MULT = '0.5';
    public const SHIMMER_CLOT_DURATION_SEC = 66;
    public const SHIMMER_ELDER_FRENZY_MULT = '666';
    public const SHIMMER_ELDER_FRENZY_DURATION_SEC = 6;

    // --- Fase F5 (Néctar do Lethe / Sugar Lumps + Levels + 4 Minigames) ---
    public const NECTAR_UNLOCK_LIFETIME_SOULS = '1000000000';
    public const NECTAR_MATURE_MS = 72000000; // 20h
    public const NECTAR_RIPE_MS = 82800000; // 23h
    public const NECTAR_AUTOHARVEST_MS = 86400000; // 24h
    public const NECTAR_LEVEL_BONUS_PER = '0.01';
    public const NECTAR_RESERVE_BONUS_PER = '0.01';
    public const NECTAR_RESERVE_CAP = 100;
    public const NECTAR_FRENZY_MULT = '3';
    public const NECTAR_FRENZY_DURATION_SEC = 3600;
    public const NECTAR_MAX_GENERATOR_LEVEL = 100;
    public const NECTAR_SYNC_SKEW_TOLERANCE_MS = 60000;

    // --- Fase F4 (Véu do Acheron / Milk + Filhotes do Cérbero / Kittens Ctonianos) ---
    public const VEIL_PER_ACHIEVEMENT = '0.04';
    public const VEIL_PERCENT_PER_ACHIEVEMENT = 4;
    /** @var list<string> */
    public const CERBERUS_PUP_UPGRADE_IDS = [
        'filhote_vigia_estige',
        'filhote_rastreador_asfodelos',
        'filhote_forjador_phlegethon',
        'filhote_supervisor_tartaro',
        'filhote_intendente_erebo',
        'filhote_arauto_lethe',
        'cerbero_conselheiro_tartaro',
        'filhote_experto_erebo',
        'filhote_consultor_styx',
        'filhote_assistente_regional',
        'filhote_mercador_acheron',
        'filhote_analista_moiras',
        'filhote_executivo_hades',
        'filhote_admin_tartaro',
        'filhote_estrategista_olimpo',
    ];


    // --- Fase F6 (Catábase das Avós / Grandmapocalypse + Sanguessugas do Acheron / Wrinklers) ---
    public const CATABASE_UNLOCK_SERVANTS = 7;
    public const CATABASE_RESEARCH_DURATION_SEC = 1800;
    public const CATABASE_PLEDGE_DURATION_SEC = 1800;
    public const CATABASE_PLEDGE_MAX_STEP = 14;
    public const CATABASE_COVENANT_SPS_MULT = '0.95';
    public const CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT = '0.05';
    public const LEECH_BASE_CAP = 10;
    public const LEECH_MAX_CAP = 14;
    public const LEECH_DRAIN_PER_UNIT = '0.05';
    public const LEECH_PAYOUT_MULT_BASE = '1.1';
    public const LEECH_PAYOUT_MULT_SACRA = '1.155';
    public const LEECH_SHINY_PAYOUT_MULT = '3.3';
    public const LEECH_SHINY_CHANCE = 0.0001;
    public const LEECH_SPAWN_CHANCE_PER_SEC_PER_STAGE = 0.001;

    // --- Fase F8 (Venda de Geradores, Dragão Pitão/Ladão, 4 Estações, Ticker Fortunes & Stack Completo) ---
    public const GENERATOR_SELL_REFUND_BASE = '0.25';
    public const GENERATOR_SELL_REFUND_EARTH_SHATTERER = '0.50';
    public const DRAGON_MAX_STAGE = 4;
    public const DRAGON_STAGE1_SOULS_COST = '1000000';
    public const DRAGON_STAGE2_SACRIFICE_QTY = 50;
    public const DRAGON_STAGE3_SACRIFICE_QTY = 100;
    public const DRAGON_STAGE4_SACRIFICE_QTY = 200;
    public const DRAGON_BREATH_OF_MILK_BOOST = '1.05';
    public const DRAGON_CURSOR_CLICK_MULT = '1.05';
    public const DRAGON_RADIANT_APPETITE_MULT = '2';
    public const DRAGON_SCALE_SPS_MULT = '1.03';
    public const DRAGONFLIGHT_CLICK_MULT = '1111';
    public const DRAGONFLIGHT_DURATION_SEC = 10;

    public const SEASON_DURATION_MS = 86400000;
    public const SEASON_BASE_SWITCH_COST = '1000000000';
    public const SATURN_KING_MAX_LEVEL = 5;
    public const SATURN_KING_SPS_PER_LEVEL = '0.05';
    public const SATURN_KING_DISCOUNT_PER_LEVEL = '0.01';
    public const HERMES_FAIR_SHIMMER_RATE_MULT = 1.05;
    public const HERMES_CONTRACT_COST_MULT = '0.98';

    public const FORTUNE_BASE_CHANCE = 0.02;
    public const FORTUNE_O_FORTUNA_CHANCE = 0.04;
    public const FORTUNE_100_SPS_MULT = '1.01';
    public const FORTUNE_100_COST_MULT = '0.99';
    public const FORTUNE_101_SPS_MULT = '1.07';
    public const FORTUNE_101_UPGRADE_COST_MULT = '0.93';
    public const FORTUNE_102_OBOL_MULT = '1.01';
    public const FORTUNE_103_VEIL_FACTOR = '0.05';
    public const FORTUNE_LINE_SPS_MULT = '1.07';
    public const FORTUNE_LINE_COST_MULT = '0.93';
    public const PRESTIGE_CUBIC_DIVISOR = '1000000000000';

    public const DRAGON_AURAS = [
        'sopro_de_flegeton' => ['id' => 'sopro_de_flegeton', 'minStage' => 1, 'effectKind' => 'veilPupBoost', 'factor' => self::DRAGON_BREATH_OF_MILK_BOOST],
        'cursor_ancestral' => ['id' => 'cursor_ancestral', 'minStage' => 1, 'effectKind' => 'clickMult', 'factor' => self::DRAGON_CURSOR_CLICK_MULT],
        'abalo_do_tartaro' => ['id' => 'abalo_do_tartaro', 'minStage' => 2, 'effectKind' => 'sellRefundRate', 'factor' => self::GENERATOR_SELL_REFUND_EARTH_SHATTERER],
        'voo_draconico' => ['id' => 'voo_draconico', 'minStage' => 2, 'effectKind' => 'dragonflightShimmer', 'factor' => self::DRAGONFLIGHT_CLICK_MULT, 'durationSec' => self::DRAGONFLIGHT_DURATION_SEC],
        'apetite_radiante' => ['id' => 'apetite_radiante', 'minStage' => 3, 'effectKind' => 'spsMult', 'factor' => self::DRAGON_RADIANT_APPETITE_MULT],
    ];

    public const SEASONS = [
        'antesteria' => ['id' => 'antesteria', 'dropUpgradeIds' => ['ovo_orfico_bronze', 'ovo_orfico_prata', 'ovo_orfico_ouro', 'coroa_de_antesteria']],
        'lemuria' => ['id' => 'lemuria', 'dropUpgradeIds' => ['bolacha_espectral_estige', 'obolo_fantasma_lemuria', 'cranio_de_acucar_ctoniano']],
        'saturnalia' => ['id' => 'saturnalia', 'dropUpgradeIds' => ['presente_de_saturnalia', 'bencao_do_rei_saturno']],
        'feira_de_hermes' => ['id' => 'feira_de_hermes', 'dropUpgradeIds' => ['contrato_de_hermes']],
    ];

    public const ALL_SEASONAL_DROP_UPGRADE_IDS = [
        'ovo_orfico_bronze',
        'ovo_orfico_prata',
        'ovo_orfico_ouro',
        'coroa_de_antesteria',
        'bolacha_espectral_estige',
        'obolo_fantasma_lemuria',
        'cranio_de_acucar_ctoniano',
        'presente_de_saturnalia',
        'bencao_do_rei_saturno',
        'contrato_de_hermes',
    ];

    public const FORTUNE_IDS = [
        'fortune_100',
        'fortune_101',
        'fortune_102',
        'fortune_103',
        'fortune_gen_wandering_shade',
        'fortune_gen_charon_servants',
        'fortune_gen_cerberian_hound',
        'fortune_gen_tartarus_judge',
        'fortune_gen_phlegethon_forge',
        'fortune_gen_obsidian_throne',
        'fortune_gen_mnemosyne_temple',
        'fortune_gen_styx_tower',
        'fortune_gen_star_barge',
        'fortune_gen_tartarus_lab',
        'fortune_gen_erebus_portal',
        'fortune_gen_chronos_loom',
        'fortune_gen_void_condenser',
        'fortune_gen_moirai_prism',
        'fortune_gen_fate_forge',
        'fortune_gen_fractal_engine',
        'fortune_gen_oracle_console',
        'fortune_gen_chthonic_idleverse',
        'fortune_gen_cortex_baker',
        'fortune_gen_the_emperor',
    ];

    public const VEIL_TIERS = [
        ['id' => 'nevoa_cinzenta', 'name' => 'Névoa Cinzenta', 'minVeilPercent' => 0, 'minAchievements' => 0, 'color' => '#64748b', 'spriteId' => 'veu_nevoa_cinzenta'],
        ['id' => 'aguas_estige', 'name' => 'Águas do Estige', 'minVeilPercent' => 52, 'minAchievements' => 13, 'color' => '#00a896', 'spriteId' => 'veu_aguas_estige'],
        ['id' => 'corrente_lethe', 'name' => 'Corrente do Lethe', 'minVeilPercent' => 100, 'minAchievements' => 25, 'color' => '#7209b7', 'spriteId' => 'veu_corrente_lethe'],
        ['id' => 'chama_phlegethon', 'name' => 'Chama de Flegêton', 'minVeilPercent' => 200, 'minAchievements' => 50, 'color' => '#d90429', 'spriteId' => 'veu_chama_phlegethon'],
        ['id' => 'ouro_ancestral', 'name' => 'Ouro Ancestral', 'minVeilPercent' => 300, 'minAchievements' => 75, 'color' => '#cfa759', 'spriteId' => 'veu_ouro_ancestral'],
        ['id' => 'selo_tartaro', 'name' => 'Selo do Tártaro', 'minVeilPercent' => 400, 'minAchievements' => 100, 'color' => '#8b5cf6', 'spriteId' => 'veu_selo_tartaro'],
        ['id' => 'manto_hades', 'name' => 'Manto de Hades', 'minVeilPercent' => 600, 'minAchievements' => 150, 'color' => '#4c1d95', 'spriteId' => 'veu_manto_hades'],
        ['id' => 'coroa_estigia', 'name' => 'Coroa Estígia', 'minVeilPercent' => 800, 'minAchievements' => 200, 'color' => '#be123c', 'spriteId' => 'veu_coroa_estigia'],
        ['id' => 'trono_sombrio', 'name' => 'Trono Sombrio', 'minVeilPercent' => 1000, 'minAchievements' => 250, 'color' => '#0f172a', 'spriteId' => 'veu_trono_sombrio'],
        ['id' => 'olimpo_invertido', 'name' => 'Olimpo Invertido', 'minVeilPercent' => 1200, 'minAchievements' => 300, 'color' => '#eab308', 'spriteId' => 'veu_olimpo_invertido'],
        ['id' => 'veu_absoluto', 'name' => 'Véu Absoluto', 'minVeilPercent' => 1400, 'minAchievements' => 350, 'color' => '#f8fafc', 'spriteId' => 'veu_absoluto'],
        ['id' => 'selo_tartaro', 'name' => 'Selo do Tártaro', 'minVeilPercent' => 400, 'minAchievements' => 100, 'color' => '#8b5cf6', 'spriteId' => 'veu_selo_tartaro'],
        ['id' => 'manto_hades', 'name' => 'Manto de Hades', 'minVeilPercent' => 600, 'minAchievements' => 150, 'color' => '#4c1d95', 'spriteId' => 'veu_manto_hades'],
        ['id' => 'coroa_estigia', 'name' => 'Coroa Estígia', 'minVeilPercent' => 800, 'minAchievements' => 200, 'color' => '#be123c', 'spriteId' => 'veu_coroa_estigia'],
        ['id' => 'trono_sombrio', 'name' => 'Trono Sombrio', 'minVeilPercent' => 1000, 'minAchievements' => 250, 'color' => '#0f172a', 'spriteId' => 'veu_trono_sombrio'],
        ['id' => 'olimpo_invertido', 'name' => 'Olimpo Invertido', 'minVeilPercent' => 1200, 'minAchievements' => 300, 'color' => '#eab308', 'spriteId' => 'veu_olimpo_invertido'],
        ['id' => 'veu_absoluto', 'name' => 'Véu Absoluto', 'minVeilPercent' => 1400, 'minAchievements' => 350, 'color' => '#f8fafc', 'spriteId' => 'veu_absoluto'],
    ];

    public const GENERATORS = [
        ['id' => 'wandering_shade', 'tier' => 1, 'baseCost' => '15', 'baseRate' => '0.1'],
        ['id' => 'charon_servants', 'tier' => 2, 'baseCost' => '100', 'baseRate' => '1'],
        ['id' => 'cerberian_hound', 'tier' => 3, 'baseCost' => '1100', 'baseRate' => '8'],
        ['id' => 'tartarus_judge', 'tier' => 4, 'baseCost' => '12000', 'baseRate' => '47'],
        ['id' => 'phlegethon_forge', 'tier' => 5, 'baseCost' => '130000', 'baseRate' => '260'],
        ['id' => 'obsidian_throne', 'tier' => 6, 'baseCost' => '1400000', 'baseRate' => '1400'],
        ['id' => 'mnemosyne_temple', 'tier' => 7, 'baseCost' => '20000000', 'baseRate' => '7800'],
        ['id' => 'styx_tower', 'tier' => 8, 'baseCost' => '330000000', 'baseRate' => '44000'],
        ['id' => 'star_barge', 'tier' => 9, 'baseCost' => '5100000000', 'baseRate' => '260000'],
        ['id' => 'tartarus_lab', 'tier' => 10, 'baseCost' => '75000000000', 'baseRate' => '1600000'],
        ['id' => 'erebus_portal', 'tier' => 11, 'baseCost' => '1000000000000', 'baseRate' => '10000000'],
        ['id' => 'chronos_loom', 'tier' => 12, 'baseCost' => '14000000000000', 'baseRate' => '65000000'],
        ['id' => 'void_condenser', 'tier' => 13, 'baseCost' => '170000000000000', 'baseRate' => '430000000'],
        ['id' => 'moirai_prism', 'tier' => 14, 'baseCost' => '2100000000000000', 'baseRate' => '2900000000'],
        ['id' => 'fate_forge', 'tier' => 15, 'baseCost' => '26000000000000000', 'baseRate' => '21000000000'],
        ['id' => 'fractal_engine', 'tier' => 16, 'baseCost' => '310000000000000000', 'baseRate' => '150000000000'],
        ['id' => 'oracle_console', 'tier' => 17, 'baseCost' => '71000000000000000000', 'baseRate' => '1100000000000'],
        ['id' => 'chthonic_idleverse', 'tier' => 18, 'baseCost' => '12000000000000000000000', 'baseRate' => '8300000000000'],
        ['id' => 'cortex_baker', 'tier' => 19, 'baseCost' => '1900000000000000000000000', 'baseRate' => '64000000000000'],
        ['id' => 'the_emperor', 'tier' => 20, 'baseCost' => '540000000000000000000000000', 'baseRate' => '510000000000000'],
    ];

    public const UPGRADES = [
        // --- Cadeia da Foice (clickMult + clickKSps) ---
        ['id' => 'foice_afilada', 'cost' => '100', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['minSouls' => '0']],
        ['id' => 'juramento_acheron', 'cost' => '500', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'foice_afilada', 'minSouls' => '0']],
        ['id' => 'pacto_das_margens', 'cost' => '2500', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'juramento_acheron', 'minSouls' => '0']],
        ['id' => 'ceifador_ctoniano', 'cost' => '10000', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'pacto_das_margens', 'minSouls' => '0']],
        ['id' => 'colheita_eterna', 'cost' => '50000', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'ceifador_ctoniano', 'minSouls' => '0']],
        ['id' => 'fio_da_foice', 'cost' => '250000000', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'colheita_eterna', 'minSouls' => '0']],
        ['id' => 'lamina_do_styx', 'cost' => '1250000000', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'fio_da_foice', 'minSouls' => '0']],
        ['id' => 'ceifa_das_almas', 'cost' => '6250000000', 'kind' => 'clickMult', 'factor' => '5', 'requires' => ['upgradeId' => 'lamina_do_styx', 'minSouls' => '0']],
        ['id' => 'pacto_do_corte', 'cost' => '31250000000', 'kind' => 'clickMult', 'factor' => '5', 'requires' => ['upgradeId' => 'ceifa_das_almas', 'minSouls' => '0']],
        ['id' => 'eco_da_foice', 'cost' => '100000000000', 'kind' => 'clickKSps', 'factor' => '0.01', 'requires' => ['upgradeId' => 'pacto_do_corte', 'minSouls' => '0']],
        ['id' => 'danca_da_morte', 'cost' => '500000000000', 'kind' => 'clickMult', 'factor' => '2', 'requires' => ['upgradeId' => 'eco_da_foice', 'minSouls' => '0']],
        ['id' => 'colheita_absoluta', 'cost' => '2500000000000', 'kind' => 'clickMult', 'factor' => '5', 'requires' => ['upgradeId' => 'danca_da_morte', 'minSouls' => '0']],

        // --- Cadeia Mil Foices (Paridade Thousand Fingers · 12 elos wiki) ---
        ['id' => 'mil_foices', 'cost' => '100000', 'kind' => 'thousandBlades', 'factor' => '0.1', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 25]],
        ['id' => 'milhao_de_foices', 'cost' => '10000000', 'kind' => 'thousandBladesMult', 'factor' => '5', 'requires' => ['upgradeId' => 'mil_foices', 'generatorId' => 'wandering_shade', 'quantity' => 50]],
        ['id' => 'bilhao_de_foices', 'cost' => '100000000', 'kind' => 'thousandBladesMult', 'factor' => '10', 'requires' => ['upgradeId' => 'milhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 100]],
        ['id' => 'trilhao_de_foices', 'cost' => '1000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'bilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 150]],
        ['id' => 'quadrilhao_de_foices', 'cost' => '10000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'trilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 200]],
        ['id' => 'quintilhao_de_foices', 'cost' => '10000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'quadrilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 250]],
        ['id' => 'sextilhao_de_foices', 'cost' => '10000000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'quintilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 300]],
        ['id' => 'septilhao_de_foices', 'cost' => '10000000000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'sextilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 350]],
        ['id' => 'octilhao_de_foices', 'cost' => '10000000000000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'septilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 400]],
        ['id' => 'nonilhao_de_foices', 'cost' => '10000000000000000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'octilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 450]],
        ['id' => 'decilhao_de_foices', 'cost' => '10000000000000000000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'nonilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 500]],
        ['id' => 'undecilhao_de_foices', 'cost' => '10000000000000000000000000000000', 'kind' => 'thousandBladesMult', 'factor' => '20', 'requires' => ['upgradeId' => 'decilhao_de_foices', 'generatorId' => 'wandering_shade', 'quantity' => 550]],

        // --- T1 Sombra Vagante (15 tiers) ---
        ['id' => 'umbras_despertas', 'cost' => '100', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 1]],
        ['id' => 'sussurro_dos_juncos', 'cost' => '250', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 5]],
        ['id' => 'cortejo_das_sombras', 'cost' => '500', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 10]],
        ['id' => 'legiao_das_umbras', 'cost' => '5000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 25]],
        ['id' => 'mare_de_sombras', 'cost' => '50000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 50]],
        ['id' => 'manto_do_crepusculo', 'cost' => '150000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 75]],
        ['id' => 'eclipse_do_acheron', 'cost' => '500000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 100]],
        ['id' => 'procissao_silente', 'cost' => '1500000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 125]],
        ['id' => 'cortejo_infinito', 'cost' => '5000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 150]],
        ['id' => 'coroa_de_penumbra', 'cost' => '15000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 175]],
        ['id' => 'noite_sem_fim', 'cost' => '50000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 200]],
        ['id' => 'veu_dos_esquecidos', 'cost' => '150000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 225]],
        ['id' => 'abismo_sussurrante', 'cost' => '500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 250]],
        ['id' => 'eternidade_cinzenta', 'cost' => '1500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 275]],
        ['id' => 'soberania_das_umbras', 'cost' => '5000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 300]],

        // --- T2 Servos de Caronte (15 tiers) ---
        ['id' => 'moeda_no_barquinho', 'cost' => '1000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 1]],
        ['id' => 'remos_de_cipreste', 'cost' => '2500', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 5]],
        ['id' => 'frota_de_caronte', 'cost' => '5000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 10]],
        ['id' => 'remadores_do_styx', 'cost' => '50000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 25]],
        ['id' => 'armada_das_margens', 'cost' => '500000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 50]],
        ['id' => 'lanternas_de_estige', 'cost' => '1500000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 75]],
        ['id' => 'travessia_eterna', 'cost' => '5000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 100]],
        ['id' => 'pedagio_inapelavel', 'cost' => '15000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 125]],
        ['id' => 'porto_das_cem_barcas', 'cost' => '50000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 150]],
        ['id' => 'velas_de_mortalha', 'cost' => '150000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 175]],
        ['id' => 'mar_de_obolos', 'cost' => '500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 200]],
        ['id' => 'bussola_dos_afogados', 'cost' => '1500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 225]],
        ['id' => 'esquadra_do_cocytus', 'cost' => '5000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 250]],
        ['id' => 'almirantado_das_aguas_negras', 'cost' => '15000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 275]],
        ['id' => 'horizonte_de_caronte', 'cost' => '50000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 300]],

        // --- T3 Cão Cerberiano (15 tiers) ---
        ['id' => 'trela_cerberiana', 'cost' => '11000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 1]],
        ['id' => 'faro_de_enxofre', 'cost' => '27500', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 5]],
        ['id' => 'tres_cabecas', 'cost' => '55000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 10]],
        ['id' => 'matilha_do_ade', 'cost' => '550000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 25]],
        ['id' => 'guardiao_triplo', 'cost' => '5500000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 50]],
        ['id' => 'coleira_de_bronze_estigio', 'cost' => '16500000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 75]],
        ['id' => 'canil_do_tartaro', 'cost' => '55000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 100]],
        ['id' => 'presas_de_obsidiana', 'cost' => '165000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 125]],
        ['id' => 'uivo_das_portas', 'cost' => '550000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 150]],
        ['id' => 'juba_de_serpentes', 'cost' => '1650000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 175]],
        ['id' => 'fome_sem_fim', 'cost' => '5500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 200]],
        ['id' => 'sentinela_dos_tres_rios', 'cost' => '16500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 225]],
        ['id' => 'cacada_infernus', 'cost' => '55000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 250]],
        ['id' => 'rugido_do_abismo', 'cost' => '165000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 275]],
        ['id' => 'soberania_cerberiana', 'cost' => '550000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 300]],

        // --- T4 Juiz do Tártaro (15 tiers) ---
        ['id' => 'veredito_tartaro', 'cost' => '120000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 1]],
        ['id' => 'balanca_de_ouro_frio', 'cost' => '300000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 5]],
        ['id' => 'lei_inquebravel', 'cost' => '600000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 10]],
        ['id' => 'banco_dos_juizes', 'cost' => '6000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 25]],
        ['id' => 'codigo_das_profundezas', 'cost' => '60000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 50]],
        ['id' => 'pergaminhos_de_bronze', 'cost' => '180000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 75]],
        ['id' => 'sentenca_coletiva', 'cost' => '600000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 100]],
        ['id' => 'tribunal_dos_cem_ecos', 'cost' => '1200000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 125]],
        ['id' => 'colegio_infernus', 'cost' => '3000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 150]],
        ['id' => 'malhete_de_adamante', 'cost' => '7500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 175]],
        ['id' => 'lei_do_abismo', 'cost' => '15000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 200]],
        ['id' => 'jurisprudencia_eterna', 'cost' => '45000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 225]],
        ['id' => 'supremo_conselho_ctoniano', 'cost' => '150000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 250]],
        ['id' => 'decreto_irrevogavel', 'cost' => '450000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 275]],
        ['id' => 'justica_absoluta_do_tartaro', 'cost' => '1500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 300]],

        // --- T5 Forja de Phlegethon (15 tiers) ---
        ['id' => 'brasa_phlegethon', 'cost' => '1300000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 1]],
        ['id' => 'foles_de_tifao', 'cost' => '3250000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 5]],
        ['id' => 'fornalha_industrial', 'cost' => '6500000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 10]],
        ['id' => 'caldeiras_gemeas', 'cost' => '65000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 25]],
        ['id' => 'rio_de_ferro', 'cost' => '650000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 50]],
        ['id' => 'bigornas_ciclopicas', 'cost' => '1950000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 75]],
        ['id' => 'fundicao_eterna', 'cost' => '6500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 100]],
        ['id' => 'tempera_de_lagrimas', 'cost' => '16250000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 125]],
        ['id' => 'cinzas_do_rio', 'cost' => '32500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 150]],
        ['id' => 'martelos_automatos', 'cost' => '81250000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 175]],
        ['id' => 'coracao_de_magma', 'cost' => '162500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 200]],
        ['id' => 'veias_de_piropo', 'cost' => '487500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 225]],
        ['id' => 'cidadela_da_forja', 'cost' => '1625000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 250]],
        ['id' => 'sol_subterraneo', 'cost' => '4875000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 275]],
        ['id' => 'hegemonia_do_phlegethon', 'cost' => '16250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 300]],

        // --- T6 Trono de Obsidiana (15 tiers) ---
        ['id' => 'cetro_obsidiana', 'cost' => '14000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 1]],
        ['id' => 'degraus_de_onix', 'cost' => '35000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 5]],
        ['id' => 'soberania_absoluta', 'cost' => '70000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 10]],
        ['id' => 'corte_obsidiana', 'cost' => '700000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 25]],
        ['id' => 'dominio_ctoniano', 'cost' => '7000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 50]],
        ['id' => 'dossel_de_estrelas_mortas', 'cost' => '21000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 75]],
        ['id' => 'imperio_sem_sol', 'cost' => '70000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 100]],
        ['id' => 'diadema_de_sangue_e_ouro', 'cost' => '175000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 125]],
        ['id' => 'trono_sem_fim', 'cost' => '350000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 150]],
        ['id' => 'arautos_da_eternidade', 'cost' => '875000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 175]],
        ['id' => 'noite_do_imperador', 'cost' => '1750000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 200]],
        ['id' => 'pacto_das_coroas_negras', 'cost' => '5250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 225]],
        ['id' => 'dinastia_do_erebo', 'cost' => '17500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 250]],
        ['id' => 'onipresenca_de_obsidiana', 'cost' => '52500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 275]],
        ['id' => 'apoteose_do_submundo', 'cost' => '175000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 300]],

        // --- T7 Templo de Mnemosyne (15 tiers) ---
        ['id' => 'incenso_de_asfodelos', 'cost' => '200000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 1]],
        ['id' => 'colunas_de_marmore_negro', 'cost' => '500000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 5]],
        ['id' => 'coro_das_recordacoes', 'cost' => '1000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 10]],
        ['id' => 'liturgia_da_memoria', 'cost' => '10000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 25]],
        ['id' => 'altares_de_prata_fria', 'cost' => '100000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 50]],
        ['id' => 'sacerdocio_do_esquecimento', 'cost' => '300000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 75]],
        ['id' => 'campanario_de_mnemosyne', 'cost' => '1000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 100]],
        ['id' => 'claustro_dos_ecos', 'cost' => '2500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 125]],
        ['id' => 'basilica_das_aguas_claras', 'cost' => '5000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 150]],
        ['id' => 'reliquias_da_primeira_era', 'cost' => '12500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 175]],
        ['id' => 'sinodo_dos_imortais', 'cost' => '25000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 200]],
        ['id' => 'navio_votivo_de_ouro', 'cost' => '75000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 225]],
        ['id' => 'oraculo_da_lembranca_pura', 'cost' => '250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 250]],
        ['id' => 'abobada_das_nove_musas', 'cost' => '750000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 275]],
        ['id' => 'panteao_da_memoria_eterna', 'cost' => '2500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'mnemosyne_temple', 'requires' => ['generatorId' => 'mnemosyne_temple', 'quantity' => 300]],

        // --- T8 Torre do Estige (15 tiers) ---
        ['id' => 'grimorio_das_aguas_negras', 'cost' => '3300000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 1]],
        ['id' => 'astrolabio_de_bronze_estigio', 'cost' => '8250000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 5]],
        ['id' => 'circulo_de_invocacao_ctoniana', 'cost' => '16500000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 10]],
        ['id' => 'esfera_de_vidro_fumego', 'cost' => '165000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 25]],
        ['id' => 'runas_do_juramento_quebrado', 'cost' => '1650000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 50]],
        ['id' => 'conclave_dos_arcanos_mortos', 'cost' => '4950000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 75]],
        ['id' => 'farol_de_chama_verde', 'cost' => '16500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 100]],
        ['id' => 'biblioteca_de_pergaminhos_vivos', 'cost' => '41250000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 125]],
        ['id' => 'pinaculo_da_tempestade_de_almas', 'cost' => '82500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 150]],
        ['id' => 'selo_de_hecate_noturna', 'cost' => '206250000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 175]],
        ['id' => 'cidadela_dos_feiticeiros_do_styx', 'cost' => '412500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 200]],
        ['id' => 'coroa_de_relampagos_frios', 'cost' => '1237500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 225]],
        ['id' => 'observatorio_do_abismo_profundo', 'cost' => '4125000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 250]],
        ['id' => 'nexus_de_encantamento_perpetuo', 'cost' => '12375000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 275]],
        ['id' => 'arquimagia_do_rio_inviolavel', 'cost' => '41250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'styx_tower', 'requires' => ['generatorId' => 'styx_tower', 'quantity' => 300]],

        // --- T9 Barca das Estrelas (15 tiers) ---
        ['id' => 'velas_de_eter_noturno', 'cost' => '51000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 1]],
        ['id' => 'sextante_das_constelacoes_mortas', 'cost' => '127500000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 5]],
        ['id' => 'quilha_de_meteorito_ferro', 'cost' => '255000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 10]],
        ['id' => 'carta_nautica_do_vazio', 'cost' => '2550000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 25]],
        ['id' => 'lemes_de_luz_fossil', 'cost' => '25500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 50]],
        ['id' => 'ancoradouro_da_nebulosa', 'cost' => '76500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 75]],
        ['id' => 'comboio_astral_do_acheron', 'cost' => '255000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 100]],
        ['id' => 'lanternas_de_pulsar', 'cost' => '637500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 125]],
        ['id' => 'convocados_do_zenite', 'cost' => '1275000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 150]],
        ['id' => 'astrolabio_de_nyx', 'cost' => '3187500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 175]],
        ['id' => 'armada_das_esferas_celestes', 'cost' => '6375000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 200]],
        ['id' => 'propulsao_de_cometa_negro', 'cost' => '19125000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 225]],
        ['id' => 'cais_do_horizonte_de_eventos', 'cost' => '63750000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 250]],
        ['id' => 'rotas_transcendais_do_erebo', 'cost' => '191250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 275]],
        ['id' => 'soberania_da_frota_sideral', 'cost' => '637500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'star_barge', 'requires' => ['generatorId' => 'star_barge', 'quantity' => 300]],

        // --- T10 Laboratório do Tártaro (15 tiers) ---
        ['id' => 'alambiques_de_obsidiana', 'cost' => '750000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 1]],
        ['id' => 'mercurio_filosofal_ctoniano', 'cost' => '1875000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 5]],
        ['id' => 'fornalha_de_athanor_duplo', 'cost' => '3750000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 10]],
        ['id' => 'sal_de_enxofre_purificado', 'cost' => '37500000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 25]],
        ['id' => 'cadinhos_de_ouro_frio', 'cost' => '375000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 50]],
        ['id' => 'elixir_da_noite_perpetua', 'cost' => '1125000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 75]],
        ['id' => 'pedra_rubra_do_tartaro', 'cost' => '3750000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 100]],
        ['id' => 'serpentinas_de_eter_puro', 'cost' => '9375000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 125]],
        ['id' => 'reagentes_de_cinza_titanica', 'cost' => '18750000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 150]],
        ['id' => 'hermetismo_das_profundezas', 'cost' => '46875000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 175]],
        ['id' => 'grande_obra_do_submundo', 'cost' => '93750000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 200]],
        ['id' => 'solvente_universal_do_styx', 'cost' => '281250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 225]],
        ['id' => 'matriz_de_transmutacao_aurica', 'cost' => '937500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 250]],
        ['id' => 'quintessencia_do_erebo', 'cost' => '2812500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 275]],
        ['id' => 'crisopeia_absoluta_de_hades', 'cost' => '9375000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_lab', 'requires' => ['generatorId' => 'tartarus_lab', 'quantity' => 300]],

        // --- T11 Portal do Érebo (15 tiers) ---
        ['id' => 'umbral_de_pedra_vazia', 'cost' => '10000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 1]],
        ['id' => 'chaves_do_abismo_anterior', 'cost' => '25000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 5]],
        ['id' => 'aneis_de_contencao_dimensional', 'cost' => '50000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 10]],
        ['id' => 'ventos_do_outro_lado', 'cost' => '500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 25]],
        ['id' => 'pilares_de_noite_solida', 'cost' => '5000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 50]],
        ['id' => 'convergencia_das_fendas', 'cost' => '15000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 75]],
        ['id' => 'horizonte_do_erebo_eterno', 'cost' => '50000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 100]],
        ['id' => 'ancoras_de_gravidade_escura', 'cost' => '125000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 125]],
        ['id' => 'corredor_dos_mil_planos', 'cost' => '250000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 150]],
        ['id' => 'rasgo_no_veu_primordial', 'cost' => '625000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 175]],
        ['id' => 'malha_de_portais_imperiais', 'cost' => '1250000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 200]],
        ['id' => 'vortice_de_caos_domado', 'cost' => '3750000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 225]],
        ['id' => 'singularidade_ctoniana', 'cost' => '12500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 250]],
        ['id' => 'onipresenca_dimensional', 'cost' => '37500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 275]],
        ['id' => 'impero_do_erebo_sem_fronteiras', 'cost' => '125000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'erebus_portal', 'requires' => ['generatorId' => 'erebus_portal', 'quantity' => 300]],

        // --- T12 Tear de Cronos (15 tiers) ---
        ['id' => 'fuso_de_bronze_temporal', 'cost' => '140000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 1]],
        ['id' => 'engrenagens_retrogradas', 'cost' => '350000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 5]],
        ['id' => 'fios_das_moiras_dourados', 'cost' => '700000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 10]],
        ['id' => 'pendulo_da_eternidade', 'cost' => '7000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 25]],
        ['id' => 'ampulheta_de_areia_estelar', 'cost' => '70000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 50]],
        ['id' => 'bobinas_de_causalidade', 'cost' => '210000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 75]],
        ['id' => 'relogio_do_juizo_perpetuo', 'cost' => '700000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 100]],
        ['id' => 'dobras_de_segundo_infinito', 'cost' => '1750000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 125]],
        ['id' => 'tapecaria_das_eras_mortas', 'cost' => '3500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 150]],
        ['id' => 'paradoxo_da_colheita_dupla', 'cost' => '8750000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 175]],
        ['id' => 'santuario_de_cronos_desperto', 'cost' => '17500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 200]],
        ['id' => 'lacos_de_retroalimentacao_eterna', 'cost' => '52500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 225]],
        ['id' => 'horizonte_acronico', 'cost' => '175000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 250]],
        ['id' => 'coroa_do_tempo_soberano', 'cost' => '525000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 275]],
        ['id' => 'dominio_sobre_o_principio_e_o_fim', 'cost' => '1750000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chronos_loom', 'requires' => ['generatorId' => 'chronos_loom', 'quantity' => 300]],

        // --- T13 Condensador do Vazio (15 tiers) ---
        ['id' => 'camara_de_vazio_primordial', 'cost' => '1700000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 1]],
        ['id' => 'bobinas_de_antimateria_estigia', 'cost' => '4250000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 5]],
        ['id' => 'injetores_de_vacuo_absoluto', 'cost' => '8500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 10]],
        ['id' => 'colisor_de_sombras_opostas', 'cost' => '85000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 25]],
        ['id' => 'aneis_de_aniquilacao_controlada', 'cost' => '850000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 50]],
        ['id' => 'simetria_reversa_do_erebo', 'cost' => '2550000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 75]],
        ['id' => 'nucleo_de_singularidade_fria', 'cost' => '8500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 100]],
        ['id' => 'destilador_de_entropia_negra', 'cost' => '21250000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 125]],
        ['id' => 'matriz_de_positrons_ctonianos', 'cost' => '42500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 150]],
        ['id' => 'reator_de_ponto_zero_abissal', 'cost' => '106250000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 175]],
        ['id' => 'catedral_do_vacuo_eterno', 'cost' => '212500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 200]],
        ['id' => 'horizonte_de_baryons_invertidos', 'cost' => '637500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 225]],
        ['id' => 'oceano_de_dirac_subterraneo', 'cost' => '2125000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 250]],
        ['id' => 'coroa_da_nao_existencia', 'cost' => '6375000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 275]],
        ['id' => 'soberania_do_vazio_absoluto', 'cost' => '21250000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'void_condenser', 'requires' => ['generatorId' => 'void_condenser', 'quantity' => 300]],

        // --- T14 Prisma das Moiras (15 tiers) ---
        ['id' => 'lente_de_quartzo_estigio', 'cost' => '21000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 1]],
        ['id' => 'espelhos_de_obsidiana_polida', 'cost' => '52500000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 5]],
        ['id' => 'refracao_das_tres_irmas', 'cost' => '105000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 10]],
        ['id' => 'camera_de_difracao_aurica', 'cost' => '1050000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 25]],
        ['id' => 'espectro_invisivel_do_acheron', 'cost' => '10500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 50]],
        ['id' => 'rede_de_cristais_de_atropos', 'cost' => '31500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 75]],
        ['id' => 'sol_negro_refratado', 'cost' => '105000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 100]],
        ['id' => 'caleidoscopio_das_vidas_passadas', 'cost' => '262500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 125]],
        ['id' => 'feixe_coerente_de_lethe', 'cost' => '525000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 150]],
        ['id' => 'auroras_de_flegenton', 'cost' => '1312500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 175]],
        ['id' => 'abobada_de_diamante_astral', 'cost' => '2625000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 200]],
        ['id' => 'polarizacao_do_destino_puro', 'cost' => '7875000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 225]],
        ['id' => 'arco_iris_do_submundo', 'cost' => '26250000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 250]],
        ['id' => 'fulgor_primordial_de_nyx', 'cost' => '78750000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 275]],
        ['id' => 'onividencia_prismatica_das_moiras', 'cost' => '262500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'moirai_prism', 'requires' => ['generatorId' => 'moirai_prism', 'quantity' => 300]],

        // --- T15 Forja do Destino (15 tiers) ---
        ['id' => 'dados_de_osso_de_tita', 'cost' => '260000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 1]],
        ['id' => 'moedas_de_duas_caras_de_caronte', 'cost' => '650000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 5]],
        ['id' => 'roleta_das_parcas', 'cost' => '1300000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 10]],
        ['id' => 'bigorna_da_improbabilidade', 'cost' => '13000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 25]],
        ['id' => 'tarot_de_ouro_e_enxofre', 'cost' => '130000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 50]],
        ['id' => 'pendulo_de_tyche_subterranea', 'cost' => '390000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 75]],
        ['id' => 'fornalha_de_milagres_estatisticos', 'cost' => '1300000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 100]],
        ['id' => 'colapso_de_onda_favoravel', 'cost' => '3250000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 125]],
        ['id' => 'lei_dos_grandes_numeros_estigios', 'cost' => '6500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 150]],
        ['id' => 'oraculo_de_monte_carlo_ctoniano', 'cost' => '16250000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 175]],
        ['id' => 'cidadela_do_acaso_soberano', 'cost' => '32500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 200]],
        ['id' => 'determinismo_dourado', 'cost' => '97500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 225]],
        ['id' => 'roda_da_fortuna_inapelavel', 'cost' => '325000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 250]],
        ['id' => 'providencia_abissal', 'cost' => '975000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 275]],
        ['id' => 'senhor_de_todas_as_probabilidades', 'cost' => '3250000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fate_forge', 'requires' => ['generatorId' => 'fate_forge', 'quantity' => 300]],

        // --- T16 Motor Fractal (15 tiers) ---
        ['id' => 'semente_de_mandelbrot_estigia', 'cost' => '3100000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 1]],
        ['id' => 'triangulo_de_sierpinski_funebre', 'cost' => '7750000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 5]],
        ['id' => 'esponja_de_menger_de_obsidiana', 'cost' => '15500000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 10]],
        ['id' => 'recursao_sem_condicao_de_parada', 'cost' => '155000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 25]],
        ['id' => 'costa_infinita_do_acheron', 'cost' => '1550000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 50]],
        ['id' => 'floco_de_koch_do_cocytus', 'cost' => '4650000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 75]],
        ['id' => 'autosimilaridade_imperial', 'cost' => '15500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 100]],
        ['id' => 'atrator_estranho_do_tartaro', 'cost' => '38750000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 125]],
        ['id' => 'dimensao_de_hausdorff_ctoniana', 'cost' => '77500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 150]],
        ['id' => 'conjunto_de_julia_noturno', 'cost' => '193750000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 175]],
        ['id' => 'labirinto_de_hilbert_perpetuo', 'cost' => '387500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 200]],
        ['id' => 'arvore_de_pitagoras_de_ouro', 'cost' => '1162500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 225]],
        ['id' => 'caleidoscopio_recursivo_do_erebo', 'cost' => '3875000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 250]],
        ['id' => 'abismo_dentro_do_abismo', 'cost' => '11625000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 275]],
        ['id' => 'onipotencia_fractal_infindavel', 'cost' => '38750000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'fractal_engine', 'requires' => ['generatorId' => 'fractal_engine', 'quantity' => 300]],

        // --- T17 Console do Oráculo (15 tiers) ---
        ['id' => 'terminal_de_bronze_de_delfos', 'cost' => '710000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 1]],
        ['id' => 'compilador_de_juramentos_estigios', 'cost' => '1775000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 5]],
        ['id' => 'laco_while_true_da_eternidade', 'cost' => '3550000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 10]],
        ['id' => 'ponteiro_direto_para_o_acheron', 'cost' => '35500000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 25]],
        ['id' => 'garbage_collector_do_tartaro', 'cost' => '355000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 50]],
        ['id' => 'injecao_de_dependencia_divina', 'cost' => '1065000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 75]],
        ['id' => 'kernel_ctoniano_em_anel_zero', 'cost' => '3550000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 100]],
        ['id' => 'assincronia_multithread_das_moiras', 'cost' => '8875000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 125]],
        ['id' => 'bigint_sem_limite_de_precisao', 'cost' => '17750000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 150]],
        ['id' => 'metaprogramacao_do_erebo', 'cost' => '44375000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 175]],
        ['id' => 'mainframe_da_sibila_de_cumas', 'cost' => '88750000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 200]],
        ['id' => 'patch_ao_vivo_no_cosmos', 'cost' => '266250000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 225]],
        ['id' => 'hypervisor_dos_cinco_rios', 'cost' => '887500000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 250]],
        ['id' => 'acesso_root_ao_livro_da_vida', 'cost' => '2662500000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 275]],
        ['id' => 'arquiteto_supremo_da_simulacao', 'cost' => '8875000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'oracle_console', 'requires' => ['generatorId' => 'oracle_console', 'quantity' => 300]],

        // --- T18 Idleverso Ctoniano (15 tiers) ---
        ['id' => 'fenda_para_o_submundo_vizinho', 'cost' => '120000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 1]],
        ['id' => 'sifao_interdimensional_de_almas', 'cost' => '300000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 5]],
        ['id' => 'tratado_dos_dez_hades', 'cost' => '600000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 10]],
        ['id' => 'malha_de_branas_ctoniana', 'cost' => '6000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 25]],
        ['id' => 'alfandega_do_multiverso', 'cost' => '60000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 50]],
        ['id' => 'convergencia_das_infinitas_margens', 'cost' => '180000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 75]],
        ['id' => 'imperio_transversal_do_erebo', 'cost' => '600000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 100]],
        ['id' => 'colheita_de_linhas_temporais_mortas', 'cost' => '1500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 125]],
        ['id' => 'ressoador_de_cordas_cosmicas', 'cost' => '3000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 150]],
        ['id' => 'anexacao_de_planos_superiores', 'cost' => '7500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 175]],
        ['id' => 'parlamento_dos_duzentos_cosmos', 'cost' => '15000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 200]],
        ['id' => 'fusao_de_constantes_universais', 'cost' => '45000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 225]],
        ['id' => 'biblioteca_de_babel_subterranea', 'cost' => '150000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 250]],
        ['id' => 'hegemonia_omnidirecional', 'cost' => '450000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 275]],
        ['id' => 'soberano_do_omnidominio_ctoniano', 'cost' => '1500000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'chthonic_idleverse', 'requires' => ['generatorId' => 'chthonic_idleverse', 'quantity' => 300]],

        // --- T19 Padeiro do Córtex (15 tiers) ---
        ['id' => 'lobo_frontal_de_tita', 'cost' => '19000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 1]],
        ['id' => 'sinapses_de_relampago_estigio', 'cost' => '47500000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 5]],
        ['id' => 'sonho_lucido_coletivo', 'cost' => '95000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 10]],
        ['id' => 'hemisferios_em_ressonancia_aurica', 'cost' => '950000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 25]],
        ['id' => 'noosfera_do_submundo', 'cost' => '9500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 50]],
        ['id' => 'arquitetura_de_hipnos_e_mnemosyne', 'cost' => '28500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 75]],
        ['id' => 'cem_luas_pensantes', 'cost' => '95000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 100]],
        ['id' => 'materializacao_psicocinetica', 'cost' => '237500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 125]],
        ['id' => 'inconsciente_abissal_unificado', 'cost' => '475000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 150]],
        ['id' => 'hipercepcao_transcendental', 'cost' => '1187500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 175]],
        ['id' => 'panteao_neural_dos_duzentos', 'cost' => '2375000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 200]],
        ['id' => 'solipsismo_imperial', 'cost' => '7125000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 225]],
        ['id' => 'catedral_de_materia_cinzenta_astral', 'cost' => '23750000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 250]],
        ['id' => 'vontade_pura_sem_intermediarios', 'cost' => '71250000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 275]],
        ['id' => 'onisciencia_do_cortex_primordial', 'cost' => '237500000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cortex_baker', 'requires' => ['generatorId' => 'cortex_baker', 'quantity' => 300]],

        // --- T20 O Imperador (You) (15 tiers) ---
        ['id' => 'reflexo_na_agua_do_styx', 'cost' => '5400000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 1]],
        ['id' => 'cinco_sombras_da_coroa', 'cost' => '13500000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 5]],
        ['id' => 'decemvirato_de_ti_mesmo', 'cost' => '27000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 10]],
        ['id' => 'corte_imperial_de_clones_ctonianos', 'cost' => '270000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 25]],
        ['id' => 'cinquenta_tronos_para_um_so_nome', 'cost' => '2700000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 50]],
        ['id' => 'coro_unissono_do_soberano', 'cost' => '8100000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 75]],
        ['id' => 'centuria_de_imperadores_imortais', 'cost' => '27000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 100]],
        ['id' => 'dinastia_autogerada', 'cost' => '67500000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 125]],
        ['id' => 'ubiquidade_do_cetro_negro', 'cost' => '135000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 150]],
        ['id' => 'espelho_infinito_da_soberania', 'cost' => '337500000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 175]],
        ['id' => 'duzentos_avatares_do_fim', 'cost' => '675000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 200]],
        ['id' => 'identidade_cosmica_absoluta', 'cost' => '2025000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 225]],
        ['id' => 'apoteose_multiplicada', 'cost' => '6750000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 250]],
        ['id' => 'eu_sou_o_acheron_e_o_lethe', 'cost' => '20250000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 275]],
        ['id' => 'o_imperador_eterno_trezentos', 'cost' => '67500000000000000000000000000000000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'the_emperor', 'requires' => ['generatorId' => 'the_emperor', 'quantity' => 300]],

        // --- Sinergias Vol. I e Vol. II (malha canónica wiki CC) ---
        [
            'id' => 'almanaques_do_destino_i',
            'cost' => '21000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'chronos_loom',
            'boostedGeneratorId' => 'cerberian_hound',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['cerberian_hound' => 15, 'chronos_loom' => 15]],
        ],
        [
            'id' => 'magia_sismica_i',
            'cost' => '495000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'styx_tower',
            'boostedGeneratorId' => 'tartarus_judge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['tartarus_judge' => 15, 'styx_tower' => 15]],
        ],
        [
            'id' => 'eletronica_quantica_i',
            'cost' => '255000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'void_condenser',
            'boostedGeneratorId' => 'phlegethon_forge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['phlegethon_forge' => 15, 'void_condenser' => 15]],
        ],
        [
            'id' => 'contratos_do_alem_i',
            'cost' => '1500000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'erebus_portal',
            'boostedGeneratorId' => 'obsidian_throne',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['obsidian_throne' => 15, 'erebus_portal' => 15]],
        ],
        [
            'id' => 'paganismo_erebo_i',
            'cost' => '1500000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'erebus_portal',
            'boostedGeneratorId' => 'mnemosyne_temple',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['mnemosyne_temple' => 15, 'erebus_portal' => 15]],
        ],
        [
            'id' => 'saber_arcano_i',
            'cost' => '112500000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'tartarus_lab',
            'boostedGeneratorId' => 'styx_tower',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['styx_tower' => 15, 'tartarus_lab' => 15]],
        ],
        [
            'id' => 'combustivel_fossilisado_i',
            'cost' => '7650000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'star_barge',
            'boostedGeneratorId' => 'tartarus_judge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['tartarus_judge' => 15, 'star_barge' => 15]],
        ],
        [
            'id' => 'minerios_primordiais_i',
            'cost' => '112500000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'tartarus_lab',
            'boostedGeneratorId' => 'tartarus_judge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['tartarus_judge' => 15, 'tartarus_lab' => 15]],
        ],
        [
            'id' => 'colheitas_infernais_i',
            'cost' => '1500000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'erebus_portal',
            'boostedGeneratorId' => 'cerberian_hound',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['cerberian_hound' => 15, 'erebus_portal' => 15]],
        ],
        [
            'id' => 'salto_parsec_i',
            'cost' => '21000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'chronos_loom',
            'boostedGeneratorId' => 'star_barge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['star_barge' => 15, 'chronos_loom' => 15]],
        ],
        [
            'id' => 'verba_da_fisica_i',
            'cost' => '255000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'void_condenser',
            'boostedGeneratorId' => 'obsidian_throne',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['obsidian_throne' => 15, 'void_condenser' => 15]],
        ],
        [
            'id' => 'magia_luminosa_i',
            'cost' => '3150000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'moirai_prism',
            'boostedGeneratorId' => 'styx_tower',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['styx_tower' => 15, 'moirai_prism' => 15]],
        ],
        [
            'id' => 'talismas_cravejados_i',
            'cost' => '39000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'fate_forge',
            'boostedGeneratorId' => 'tartarus_judge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['tartarus_judge' => 15, 'fate_forge' => 15]],
        ],
        [
            'id' => 'espelhos_recursivos_i',
            'cost' => '465000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'fractal_engine',
            'boostedGeneratorId' => 'moirai_prism',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['moirai_prism' => 15, 'fractal_engine' => 15]],
        ],
        [
            'id' => 'avoas_script_i',
            'cost' => '106500000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'oracle_console',
            'boostedGeneratorId' => 'charon_servants',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['charon_servants' => 15, 'oracle_console' => 15]],
        ],
        [
            'id' => 'cosmos_mil_folhas_i',
            'cost' => '18000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'chthonic_idleverse',
            'boostedGeneratorId' => 'erebus_portal',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['erebus_portal' => 15, 'chthonic_idleverse' => 15]],
        ],
        [
            'id' => 'pensamentos_e_preces_i',
            'cost' => '2850000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'cortex_baker',
            'boostedGeneratorId' => 'mnemosyne_temple',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['mnemosyne_temple' => 15, 'cortex_baker' => 15]],
        ],
        [
            'id' => 'desenvolvimento_acelerado_i',
            'cost' => '810000000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'the_emperor',
            'boostedGeneratorId' => 'chronos_loom',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_i', 'minGenerators' => ['chronos_loom' => 15, 'the_emperor' => 15]],
        ],
        [
            'id' => 'oracao_da_chuva_ii',
            'cost' => '300000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'mnemosyne_temple',
            'boostedGeneratorId' => 'cerberian_hound',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['cerberian_hound' => 75, 'mnemosyne_temple' => 75]],
        ],
        [
            'id' => 'mineracao_asteroide_ii',
            'cost' => '76500000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'star_barge',
            'boostedGeneratorId' => 'tartarus_judge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['tartarus_judge' => 75, 'star_barge' => 75]],
        ],
        [
            'id' => 'overclock_temporal_ii',
            'cost' => '210000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'chronos_loom',
            'boostedGeneratorId' => 'phlegethon_forge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['phlegethon_forge' => 75, 'chronos_loom' => 75]],
        ],
        [
            'id' => 'prensas_de_obolo_ii',
            'cost' => '21000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'obsidian_throne',
            'boostedGeneratorId' => 'phlegethon_forge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['phlegethon_forge' => 75, 'obsidian_throne' => 75]],
        ],
        [
            'id' => 'particula_divina_ii',
            'cost' => '2550000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'void_condenser',
            'boostedGeneratorId' => 'mnemosyne_temple',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['mnemosyne_temple' => 75, 'void_condenser' => 75]],
        ],
        [
            'id' => 'botanica_magica_ii',
            'cost' => '4950000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'styx_tower',
            'boostedGeneratorId' => 'cerberian_hound',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['cerberian_hound' => 75, 'styx_tower' => 75]],
        ],
        [
            'id' => 'estaleiros_estigios_ii',
            'cost' => '76500000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'star_barge',
            'boostedGeneratorId' => 'phlegethon_forge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['phlegethon_forge' => 75, 'star_barge' => 75]],
        ],
        [
            'id' => 'fundo_de_ouro_ii',
            'cost' => '1125000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'tartarus_lab',
            'boostedGeneratorId' => 'obsidian_throne',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['obsidian_throne' => 75, 'tartarus_lab' => 75]],
        ],
        [
            'id' => 'brilho_abissal_ii',
            'cost' => '31500000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'moirai_prism',
            'boostedGeneratorId' => 'erebus_portal',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['erebus_portal' => 75, 'moirai_prism' => 75]],
        ],
        [
            'id' => 'fulgor_primitivo_ii',
            'cost' => '31500000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'moirai_prism',
            'boostedGeneratorId' => 'chronos_loom',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['chronos_loom' => 75, 'moirai_prism' => 75]],
        ],
        [
            'id' => 'pericia_quimica_ii',
            'cost' => '2550000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'void_condenser',
            'boostedGeneratorId' => 'tartarus_lab',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['tartarus_lab' => 75, 'void_condenser' => 75]],
        ],
        [
            'id' => 'energias_misticas_ii',
            'cost' => '31500000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'moirai_prism',
            'boostedGeneratorId' => 'mnemosyne_temple',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['mnemosyne_temple' => 75, 'moirai_prism' => 75]],
        ],
        [
            'id' => 'quarks_encantados_ii',
            'cost' => '390000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'fate_forge',
            'boostedGeneratorId' => 'void_condenser',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['void_condenser' => 75, 'fate_forge' => 75]],
        ],
        [
            'id' => 'camundongos_clicando_ii',
            'cost' => '4650000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'fractal_engine',
            'boostedGeneratorId' => 'wandering_shade',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['wandering_shade' => 75, 'fractal_engine' => 75]],
        ],
        [
            'id' => 'tombola_oracular_ii',
            'cost' => '1065000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'oracle_console',
            'boostedGeneratorId' => 'fate_forge',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['fate_forge' => 75, 'oracle_console' => 75]],
        ],
        [
            'id' => 'infraversos_ii',
            'cost' => '180000000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'chthonic_idleverse',
            'boostedGeneratorId' => 'fractal_engine',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['fractal_engine' => 75, 'chthonic_idleverse' => 75]],
        ],
        [
            'id' => 'mentes_ferteis_ii',
            'cost' => '28500000000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'cortex_baker',
            'boostedGeneratorId' => 'cerberian_hound',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['cerberian_hound' => 75, 'cortex_baker' => 75]],
        ],
        [
            'id' => 'revisao_por_pares_ii',
            'cost' => '8100000000000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'the_emperor',
            'boostedGeneratorId' => 'oracle_console',
            'baseBonusPerBoosted' => '0.001',
            'boostedBonusPerBase' => '0.05',
            'requires' => ['talentId' => 'sinergias_vol_ii', 'minGenerators' => ['oracle_console' => 75, 'the_emperor' => 75]],
        ],

        [
            'id' => 'servos_do_vazio',
            'cost' => '1700000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'void_condenser',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'void_condenser' => 15]],
        ],
        [
            'id' => 'servos_prismaticos',
            'cost' => '21000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'moirai_prism',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'moirai_prism' => 15]],
        ],
        [
            'id' => 'servos_da_fortuna',
            'cost' => '260000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'fate_forge',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'fate_forge' => 15]],
        ],
        [
            'id' => 'servos_fractais',
            'cost' => '3100000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'fractal_engine',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'fractal_engine' => 15]],
        ],
        [
            'id' => 'servos_algoritmicos_do_oraculo',
            'cost' => '710000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'oracle_console',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'oracle_console' => 15]],
        ],
        [
            'id' => 'servos_transversais',
            'cost' => '120000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'chthonic_idleverse',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'chthonic_idleverse' => 15]],
        ],
        [
            'id' => 'servos_psionicos',
            'cost' => '19000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'cortex_baker',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'cortex_baker' => 15]],
        ],
        [
            'id' => 'servos_da_guarda_imperial',
            'cost' => '5400000000000000000000000000',
            'kind' => 'synergyMult',
            'baseGeneratorId' => 'charon_servants',
            'boostedGeneratorId' => 'the_emperor',
            'baseBonusPerBoosted' => '0.01',
            'boostedBonusPerBase' => '0.01',
            'requires' => ['minGenerators' => ['charon_servants' => 1, 'the_emperor' => 15]],
        ],

        // --- All Generators ---
        ['id' => 'coroacao_imperador', 'cost' => '1000000000', 'kind' => 'allGeneratorsMult', 'factor' => '2', 'requires' => ['minSouls' => '0']],
        ['id' => 'rios_unificados', 'cost' => '100000000000', 'kind' => 'allGeneratorsMult', 'factor' => '2', 'requires' => ['minSouls' => '0']],

        // --- Fase F4: Linhagem Filhotes do Cérbero (Kitten Upgrades / Véu do Acheron) — gerado ---
        ['id' => 'filhote_vigia_estige', 'cost' => '9000000', 'kind' => 'veilMult', 'factor' => '0.1', 'requires' => ['minVeilPercent' => 52]],
        ['id' => 'filhote_rastreador_asfodelos', 'cost' => '9000000000', 'kind' => 'veilMult', 'factor' => '0.125', 'requires' => ['minVeilPercent' => 100]],
        ['id' => 'filhote_forjador_phlegethon', 'cost' => '90000000000000', 'kind' => 'veilMult', 'factor' => '0.15', 'requires' => ['minVeilPercent' => 200]],
        ['id' => 'filhote_supervisor_tartaro', 'cost' => '90000000000000000', 'kind' => 'veilMult', 'factor' => '0.175', 'requires' => ['minVeilPercent' => 300]],
        ['id' => 'filhote_intendente_erebo', 'cost' => '90000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 400]],
        ['id' => 'filhote_arauto_lethe', 'cost' => '90000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 500]],
        ['id' => 'cerbero_conselheiro_tartaro', 'cost' => '90000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 600]],
        ['id' => 'filhote_experto_erebo', 'cost' => '90000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 700]],
        ['id' => 'filhote_consultor_styx', 'cost' => '90000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 800]],
        ['id' => 'filhote_assistente_regional', 'cost' => '90000000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.175', 'requires' => ['minVeilPercent' => 900]],
        ['id' => 'filhote_mercador_acheron', 'cost' => '90000000000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.15', 'requires' => ['minVeilPercent' => 1000]],
        ['id' => 'filhote_analista_moiras', 'cost' => '90000000000000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.125', 'requires' => ['minVeilPercent' => 1100]],
        ['id' => 'filhote_executivo_hades', 'cost' => '90000000000000000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.115', 'requires' => ['minVeilPercent' => 1200]],
        ['id' => 'filhote_admin_tartaro', 'cost' => '90000000000000000000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.11', 'requires' => ['minVeilPercent' => 1300]],
        ['id' => 'filhote_estrategista_olimpo', 'cost' => '90000000000000000000000000000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.105', 'requires' => ['minVeilPercent' => 1400]],

                // --- Fase F6: Centro de Pesquisa Estígio & Catábase das Avós (Grandmapocalypse + Wrinklers) ---
        ['id' => 'concilio_das_moiras', 'cost' => '1000000000', 'kind' => 'catabaseResearch', 'factor' => '1', 'generatorId' => 'charon_servants', 'generatorFactor' => '4', 'setsCatabaseStage' => 0, 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 7]],
        ['id' => 'soro_estigio', 'cost' => '4000000000', 'kind' => 'catabaseResearch', 'factor' => '1.01', 'setsCatabaseStage' => 0, 'requires' => ['upgradeId' => 'concilio_das_moiras', 'researchId' => 'soro_estigio']],
        ['id' => 'despertar_ctoniano', 'cost' => '16000000000', 'kind' => 'catabaseResearch', 'factor' => '1.02', 'setsCatabaseStage' => 1, 'requires' => ['upgradeId' => 'soro_estigio', 'researchId' => 'despertar_ctoniano']],
        ['id' => 'sinapse_espectral', 'cost' => '64000000000', 'kind' => 'catabaseResearch', 'factor' => '1.03', 'generatorId' => 'charon_servants', 'generatorFactor' => '2', 'setsCatabaseStage' => 1, 'requires' => ['upgradeId' => 'despertar_ctoniano', 'researchId' => 'sinapse_espectral']],
        ['id' => 'comunhao_abissal', 'cost' => '256000000000', 'kind' => 'catabaseResearch', 'factor' => '1.04', 'setsCatabaseStage' => 2, 'requires' => ['upgradeId' => 'sinapse_espectral', 'researchId' => 'comunhao_abissal']],
        ['id' => 'pacto_primordial', 'cost' => '1024000000000', 'kind' => 'catabaseResearch', 'factor' => '1.05', 'setsCatabaseStage' => 3, 'elderPactBonusPerNonServant' => '0.05', 'requires' => ['upgradeId' => 'comunhao_abissal', 'researchId' => 'pacto_primordial']],
        ['id' => 'ninho_do_acheron', 'cost' => '500000000000', 'kind' => 'leechCap', 'factor' => '2', 'requires' => ['upgradeId' => 'despertar_ctoniano']],
        ['id' => 'visceras_sacras', 'cost' => '2000000000000', 'kind' => 'leechPayout', 'factor' => '1.05', 'requires' => ['upgradeId' => 'comunhao_abissal']],

        // --- Fase F8: Dragão Ctoniano, Drops das 4 Estações e 24 Fortunas de Hermes ---
        ['id' => 'escama_de_ladao', 'cost' => '777777', 'kind' => 'dragonScale', 'factor' => '1.03', 'requires' => ['dragonStage' => 1]],
        ['id' => 'ovo_orfico_bronze', 'cost' => '100000', 'kind' => 'seasonalCompound', 'factor' => '0.01', 'seasonId' => 'antesteria', 'requires' => ['seasonalDropId' => 'ovo_orfico_bronze']],
        ['id' => 'ovo_orfico_prata', 'cost' => '500000', 'kind' => 'seasonalCompound', 'factor' => '0.01', 'seasonId' => 'antesteria', 'requires' => ['seasonalDropId' => 'ovo_orfico_prata']],
        ['id' => 'ovo_orfico_ouro', 'cost' => '2500000', 'kind' => 'seasonalCompound', 'factor' => '0.02', 'seasonId' => 'antesteria', 'requires' => ['seasonalDropId' => 'ovo_orfico_ouro']],
        ['id' => 'coroa_de_antesteria', 'cost' => '10000000', 'kind' => 'seasonalCompound', 'factor' => '0.02', 'seasonId' => 'antesteria', 'requires' => ['seasonalDropId' => 'coroa_de_antesteria']],
        ['id' => 'bolacha_espectral_estige', 'cost' => '400000', 'kind' => 'seasonalCompound', 'factor' => '0.02', 'seasonId' => 'lemuria', 'requires' => ['seasonalDropId' => 'bolacha_espectral_estige']],
        ['id' => 'obolo_fantasma_lemuria', 'cost' => '2000000', 'kind' => 'seasonalCompound', 'factor' => '0.02', 'seasonId' => 'lemuria', 'requires' => ['seasonalDropId' => 'obolo_fantasma_lemuria']],
        ['id' => 'cranio_de_acucar_ctoniano', 'cost' => '10000000', 'kind' => 'seasonalCompound', 'factor' => '0.02', 'seasonId' => 'lemuria', 'requires' => ['seasonalDropId' => 'cranio_de_acucar_ctoniano']],
        ['id' => 'presente_de_saturnalia', 'cost' => '1000000', 'kind' => 'seasonalCompound', 'factor' => '0.02', 'seasonId' => 'saturnalia', 'requires' => ['seasonalDropId' => 'presente_de_saturnalia']],
        ['id' => 'bencao_do_rei_saturno', 'cost' => '5000000', 'kind' => 'saturnaliaMult', 'factor' => '1.15', 'seasonId' => 'saturnalia', 'requires' => ['seasonalDropId' => 'bencao_do_rei_saturno']],
        ['id' => 'contrato_de_hermes', 'cost' => '5000000', 'kind' => 'hermesContract', 'factor' => '0.98', 'seasonId' => 'feira_de_hermes', 'requires' => ['seasonalDropId' => 'contrato_de_hermes']],
        ['id' => 'fortune_100', 'cost' => '77777777', 'kind' => 'fortuneGlobal', 'factor' => '1.01', 'generatorCostMult' => '0.99', 'requires' => ['fortuneId' => 'fortune_100']],
        ['id' => 'fortune_101', 'cost' => '7777777777', 'kind' => 'fortuneGlobal', 'factor' => '1.07', 'upgradeCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_101']],
        ['id' => 'fortune_102', 'cost' => '777777777777', 'kind' => 'fortuneObol', 'factor' => '1.01', 'requires' => ['fortuneId' => 'fortune_102']],
        ['id' => 'fortune_103', 'cost' => '77777777777777', 'kind' => 'veilMult', 'factor' => '0.05', 'requires' => ['fortuneId' => 'fortune_103']],
        ['id' => 'fortune_gen_wandering_shade', 'cost' => '1155', 'kind' => 'fortuneLine', 'generatorId' => 'wandering_shade', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_wandering_shade']],
        ['id' => 'fortune_gen_charon_servants', 'cost' => '7700', 'kind' => 'fortuneLine', 'generatorId' => 'charon_servants', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_charon_servants']],
        ['id' => 'fortune_gen_cerberian_hound', 'cost' => '84700', 'kind' => 'fortuneLine', 'generatorId' => 'cerberian_hound', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_cerberian_hound']],
        ['id' => 'fortune_gen_tartarus_judge', 'cost' => '924000', 'kind' => 'fortuneLine', 'generatorId' => 'tartarus_judge', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_tartarus_judge']],
        ['id' => 'fortune_gen_phlegethon_forge', 'cost' => '10010000', 'kind' => 'fortuneLine', 'generatorId' => 'phlegethon_forge', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_phlegethon_forge']],
        ['id' => 'fortune_gen_obsidian_throne', 'cost' => '107800000', 'kind' => 'fortuneLine', 'generatorId' => 'obsidian_throne', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_obsidian_throne']],
        ['id' => 'fortune_gen_mnemosyne_temple', 'cost' => '1540000000', 'kind' => 'fortuneLine', 'generatorId' => 'mnemosyne_temple', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_mnemosyne_temple']],
        ['id' => 'fortune_gen_styx_tower', 'cost' => '25410000000', 'kind' => 'fortuneLine', 'generatorId' => 'styx_tower', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_styx_tower']],
        ['id' => 'fortune_gen_star_barge', 'cost' => '392700000000', 'kind' => 'fortuneLine', 'generatorId' => 'star_barge', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_star_barge']],
        ['id' => 'fortune_gen_tartarus_lab', 'cost' => '5775000000000', 'kind' => 'fortuneLine', 'generatorId' => 'tartarus_lab', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_tartarus_lab']],
        ['id' => 'fortune_gen_erebus_portal', 'cost' => '77000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'erebus_portal', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_erebus_portal']],
        ['id' => 'fortune_gen_chronos_loom', 'cost' => '1078000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'chronos_loom', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_chronos_loom']],
        ['id' => 'fortune_gen_void_condenser', 'cost' => '13090000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'void_condenser', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_void_condenser']],
        ['id' => 'fortune_gen_moirai_prism', 'cost' => '161700000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'moirai_prism', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_moirai_prism']],
        ['id' => 'fortune_gen_fate_forge', 'cost' => '2002000000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'fate_forge', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_fate_forge']],
        ['id' => 'fortune_gen_fractal_engine', 'cost' => '23870000000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'fractal_engine', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_fractal_engine']],
        ['id' => 'fortune_gen_oracle_console', 'cost' => '5467000000000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'oracle_console', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_oracle_console']],
        ['id' => 'fortune_gen_chthonic_idleverse', 'cost' => '924000000000000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'chthonic_idleverse', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_chthonic_idleverse']],
        ['id' => 'fortune_gen_cortex_baker', 'cost' => '146300000000000000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'cortex_baker', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_cortex_baker']],
        ['id' => 'fortune_gen_the_emperor', 'cost' => '41580000000000000000000000000', 'kind' => 'fortuneLine', 'generatorId' => 'the_emperor', 'factor' => '1.07', 'generatorCostMult' => '0.93', 'requires' => ['fortuneId' => 'fortune_gen_the_emperor']],
        ['id' => 'segredo_do_obolo', 'cost' => '11', 'kind' => 'heavenlyPower', 'factor' => '0.05', 'requires' => ['talentId' => 'legado']],
        ['id' => 'banca_do_obolo', 'cost' => '1111', 'kind' => 'heavenlyPower', 'factor' => '0.20', 'requires' => ['upgradeId' => 'segredo_do_obolo']],
        ['id' => 'forja_do_obolo', 'cost' => '111111', 'kind' => 'heavenlyPower', 'factor' => '0.25', 'requires' => ['upgradeId' => 'banca_do_obolo']],
        ['id' => 'confeitaria_do_obolo', 'cost' => '11111111', 'kind' => 'heavenlyPower', 'factor' => '0.25', 'requires' => ['upgradeId' => 'forja_do_obolo']],
        ['id' => 'chave_do_obolo', 'cost' => '1111111111', 'kind' => 'heavenlyPower', 'factor' => '0.25', 'requires' => ['upgradeId' => 'confeitaria_do_obolo']],
    ];

    /** Rio do Lethe — costs + requires (talentIds) for ascension gate. */
    public const TALENTS = [
        'legado' => ['id' => 'legado', 'cost' => '1', 'branch' => 'persistent', 'ring' => 0, 'angle' => 2, 'requires' => [], 'effects' => []],
        'portoes_gemeos' => ['id' => 'portoes_gemeos', 'cost' => '1', 'branch' => 'misc', 'ring' => 1, 'angle' => -67.98, 'requires' => ['legado'], 'effects' => ['offlineRate' => '0.05']],
        'bolachas_celestes' => ['id' => 'bolachas_celestes', 'cost' => '3', 'branch' => 'cookie', 'ring' => 1, 'angle' => 69.97, 'requires' => ['legado'], 'effects' => ['allGeneratorsMult' => '1.10']],
        'angels' => ['id' => 'angels', 'cost' => '7', 'branch' => 'angel', 'ring' => 2, 'angle' => -95.25, 'requires' => ['portoes_gemeos'], 'effects' => ['offlineRate' => '0.10']],
        'belphegor' => ['id' => 'belphegor', 'cost' => '7', 'branch' => 'demon', 'ring' => 2, 'angle' => 14.45, 'requires' => ['portoes_gemeos'], 'effects' => ['offlineExtraHours' => 4]],
        'classic_dairy_selection' => ['id' => 'classic_dairy_selection', 'cost' => '9', 'branch' => 'misc', 'ring' => 1, 'angle' => -40.39, 'requires' => ['legado'], 'effects' => ['cosmeticId' => 'classic_dairy_selection']],
        'ovo_primordial' => ['id' => 'ovo_primordial', 'cost' => '9', 'branch' => 'misc', 'ring' => 1, 'angle' => -12.8, 'requires' => ['legado'], 'effects' => ['dragonUnlock' => true]],
        'box_of_brand_biscuits' => ['id' => 'box_of_brand_biscuits', 'cost' => '25', 'branch' => 'cookie', 'ring' => 2, 'angle' => 30.12, 'requires' => ['bolachas_celestes'], 'effects' => ['cosmeticId' => 'box_of_brand_biscuits']],
        'box_of_macarons' => ['id' => 'box_of_macarons', 'cost' => '25', 'branch' => 'cookie', 'ring' => 2, 'angle' => 45.84, 'requires' => ['bolachas_celestes'], 'effects' => ['cosmeticId' => 'box_of_macarons']],
        'tin_of_british_tea_biscuits' => ['id' => 'tin_of_british_tea_biscuits', 'cost' => '25', 'branch' => 'cookie', 'ring' => 2, 'angle' => 61.64, 'requires' => ['bolachas_celestes'], 'effects' => ['cosmeticId' => 'tin_of_british_tea_biscuits']],
        'tin_of_butter_cookies' => ['id' => 'tin_of_butter_cookies', 'cost' => '25', 'branch' => 'cookie', 'ring' => 2, 'angle' => 77.51, 'requires' => ['bolachas_celestes'], 'effects' => ['cosmeticId' => 'tin_of_butter_cookies']],
        'archangels' => ['id' => 'archangels', 'cost' => '49', 'branch' => 'angel', 'ring' => 3, 'angle' => -59.15, 'requires' => ['angels'], 'effects' => ['offlineRate' => '0.10']],
        'mamon' => ['id' => 'mamon', 'cost' => '49', 'branch' => 'demon', 'ring' => 3, 'angle' => 39.22, 'requires' => ['belphegor'], 'effects' => ['offlineExtraHours' => 8]],
        'kit_inicial' => ['id' => 'kit_inicial', 'cost' => '50', 'branch' => 'cookie', 'ring' => 3, 'angle' => 27.9, 'requires' => ['tin_of_british_tea_biscuits', 'box_of_macarons', 'box_of_brand_biscuits', 'tin_of_butter_cookies'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 10]],
        'heavenly_luck' => ['id' => 'heavenly_luck', 'cost' => '77', 'branch' => 'golden', 'ring' => 1, 'angle' => -95.57, 'requires' => ['legado'], 'effects' => ['shimmerLuckMult' => '1.05']],
        'basic_wallpaper_assortment' => ['id' => 'basic_wallpaper_assortment', 'cost' => '99', 'branch' => 'misc', 'ring' => 2, 'angle' => -32.39, 'requires' => ['classic_dairy_selection'], 'effects' => ['cosmeticId' => 'basic_wallpaper_assortment']],
        'heralds' => ['id' => 'heralds', 'cost' => '100', 'branch' => 'cookie', 'ring' => 1, 'angle' => 97.56, 'requires' => ['legado'], 'effects' => ['allGeneratorsMult' => '1.01']],
        'permanent_slot_i' => ['id' => 'permanent_slot_i', 'cost' => '100', 'branch' => 'persistent', 'ring' => 1, 'angle' => 14.79, 'requires' => ['legado'], 'effects' => ['permanentSlot' => 1]],
        'abadao' => ['id' => 'abadao', 'cost' => '343', 'branch' => 'demon', 'ring' => 4, 'angle' => 44.93, 'requires' => ['mamon'], 'effects' => ['offlineExtraHours' => 16]],
        'virtues' => ['id' => 'virtues', 'cost' => '343', 'branch' => 'angel', 'ring' => 4, 'angle' => -62.42, 'requires' => ['archangels'], 'effects' => ['offlineRate' => '0.10']],
        'persistent_memory' => ['id' => 'persistent_memory', 'cost' => '500', 'branch' => 'persistent', 'ring' => 1, 'angle' => 42.38, 'requires' => ['legado'], 'effects' => ['buyAllUnlock' => true, 'researchDurationMult' => 0.1]],
        'lasting_fortune' => ['id' => 'lasting_fortune', 'cost' => '777', 'branch' => 'golden', 'ring' => 2, 'angle' => -79.42, 'requires' => ['heavenly_luck'], 'effects' => ['shimmerLuckMult' => '1.02']],
        'lucky_digit' => ['id' => 'lucky_digit', 'cost' => '777', 'branch' => 'golden', 'ring' => 2, 'angle' => -63.69, 'requires' => ['heavenly_luck'], 'effects' => ['prestigeEffectMult' => '1.01', 'shimmerLuckMult' => '1.01']],
        'golden_switch' => ['id' => 'golden_switch', 'cost' => '999', 'branch' => 'golden', 'ring' => 2, 'angle' => -48.01, 'requires' => ['heavenly_luck'], 'effects' => ['goldenSwitchUnlock' => true]],
        'rodizio_das_estacoes' => ['id' => 'rodizio_das_estacoes', 'cost' => '1111', 'branch' => 'season', 'ring' => 2, 'angle' => 93.46, 'requires' => ['heralds'], 'effects' => ['seasonSwitcherUnlock' => true]],
        'dominions' => ['id' => 'dominions', 'cost' => '2401', 'branch' => 'angel', 'ring' => 5, 'angle' => -65.53, 'requires' => ['virtues'], 'effects' => ['offlineRate' => '0.10']],
        'satan' => ['id' => 'satan', 'cost' => '2401', 'branch' => 'demon', 'ring' => 5, 'angle' => 52.61, 'requires' => ['abadao'], 'effects' => ['offlineExtraHours' => 32]],
        'cozinha_inicial' => ['id' => 'cozinha_inicial', 'cost' => '5000', 'branch' => 'cookie', 'ring' => 4, 'angle' => 36.18, 'requires' => ['kit_inicial'], 'effects' => ['startingGeneratorId' => 'charon_servants', 'startingGeneratorQty' => 5]],
        'decisive_fate' => ['id' => 'decisive_fate', 'cost' => '7777', 'branch' => 'golden', 'ring' => 3, 'angle' => -47.84, 'requires' => ['lasting_fortune'], 'effects' => ['shimmerLuckMult' => '1.02']],
        'kitten_angels' => ['id' => 'kitten_angels', 'cost' => '9000', 'branch' => 'angel', 'ring' => 6, 'angle' => -70.33, 'requires' => ['dominions'], 'effects' => ['kittenVeilFactor' => '0.1']],
        'asmodeus' => ['id' => 'asmodeus', 'cost' => '16807', 'branch' => 'demon', 'ring' => 6, 'angle' => 49.39, 'requires' => ['satan'], 'effects' => ['offlineExtraHours' => 64]],
        'cherubim' => ['id' => 'cherubim', 'cost' => '16807', 'branch' => 'angel', 'ring' => 6, 'angle' => -64.32, 'requires' => ['dominions'], 'effects' => ['offlineRate' => '0.10']],
        'permanent_slot_ii' => ['id' => 'permanent_slot_ii', 'cost' => '20000', 'branch' => 'persistent', 'ring' => 2, 'angle' => -1.18, 'requires' => ['permanent_slot_i'], 'effects' => ['permanentSlot' => 2]],
        'unholy_bait' => ['id' => 'unholy_bait', 'cost' => '44444', 'branch' => 'demon', 'ring' => 5, 'angle' => 45.49, 'requires' => ['cozinha_inicial'], 'effects' => ['leechSpawnMult' => 5]],
        'luvas_de_halo' => ['id' => 'luvas_de_halo', 'cost' => '55555', 'branch' => 'discount', 'ring' => 4, 'angle' => -2.36, 'requires' => ['kit_inicial'], 'effects' => ['clickTalentMult' => '1.10']],
        'numero_da_sorte' => ['id' => 'numero_da_sorte', 'cost' => '77777', 'branch' => 'golden', 'ring' => 3, 'angle' => -36.52, 'requires' => ['lucky_digit', 'lasting_fortune'], 'effects' => ['prestigeEffectMult' => '1.01', 'shimmerLuckMult' => '1.01']],
        'desconto_divino' => ['id' => 'desconto_divino', 'cost' => '99999', 'branch' => 'discount', 'ring' => 4, 'angle' => -37.34, 'requires' => ['decisive_fate'], 'effects' => ['generatorCostMult' => '0.99']],
        'vendas_divinas' => ['id' => 'vendas_divinas', 'cost' => '99999', 'branch' => 'discount', 'ring' => 4, 'angle' => -28.59, 'requires' => ['decisive_fate'], 'effects' => ['upgradeCostMult' => '0.99']],
        'residual_luck' => ['id' => 'residual_luck', 'cost' => '99999', 'branch' => 'golden', 'ring' => 3, 'angle' => -25.2, 'requires' => ['golden_switch'], 'effects' => []],
        'starlove' => ['id' => 'starlove', 'cost' => '111111', 'branch' => 'season', 'ring' => 3, 'angle' => 57.27, 'requires' => ['rodizio_das_estacoes'], 'effects' => []],
        'starsnow' => ['id' => 'starsnow', 'cost' => '111111', 'branch' => 'season', 'ring' => 3, 'angle' => 68.59, 'requires' => ['rodizio_das_estacoes'], 'effects' => []],
        'starspawn' => ['id' => 'starspawn', 'cost' => '111111', 'branch' => 'season', 'ring' => 3, 'angle' => 79.91, 'requires' => ['rodizio_das_estacoes'], 'effects' => []],
        'starterror' => ['id' => 'starterror', 'cost' => '111111', 'branch' => 'season', 'ring' => 3, 'angle' => 91.22, 'requires' => ['rodizio_das_estacoes'], 'effects' => []],
        'startrade' => ['id' => 'startrade', 'cost' => '111111', 'branch' => 'season', 'ring' => 3, 'angle' => 102.54, 'requires' => ['rodizio_das_estacoes'], 'effects' => []],
        'beelzebub' => ['id' => 'beelzebub', 'cost' => '117649', 'branch' => 'demon', 'ring' => 7, 'angle' => 57.84, 'requires' => ['asmodeus'], 'effects' => ['offlineExtraHours' => 128]],
        'seraphim' => ['id' => 'seraphim', 'cost' => '117649', 'branch' => 'angel', 'ring' => 7, 'angle' => -66.36, 'requires' => ['cherubim'], 'effects' => ['offlineRate' => '0.10']],
        'sinergias_vol_i' => ['id' => 'sinergias_vol_i', 'cost' => '222222', 'branch' => 'production', 'ring' => 6, 'angle' => 2.17, 'requires' => ['satan', 'dominions'], 'effects' => ['synergyVolUnlock' => 1]],
        'divine_bakeries' => ['id' => 'divine_bakeries', 'cost' => '399999', 'branch' => 'discount', 'ring' => 5, 'angle' => -28.1, 'requires' => ['vendas_divinas', 'desconto_divino'], 'effects' => ['generatorCostMult' => '0.99', 'upgradeCostMult' => '0.99']],
        'elder_spice' => ['id' => 'elder_spice', 'cost' => '444444', 'branch' => 'demon', 'ring' => 6, 'angle' => 55.4, 'requires' => ['unholy_bait'], 'effects' => ['leechCapBonus' => 2]],
        'sacrilegious_corruption' => ['id' => 'sacrilegious_corruption', 'cost' => '444444', 'branch' => 'demon', 'ring' => 6, 'angle' => 61.41, 'requires' => ['unholy_bait'], 'effects' => ['leechPayoutMult' => '1.05']],
        'five_finger_discount' => ['id' => 'five_finger_discount', 'cost' => '555555', 'branch' => 'discount', 'ring' => 5, 'angle' => 1.95, 'requires' => ['luvas_de_halo', 'abadao'], 'effects' => ['generatorCostMult' => '0.99']],
        'god' => ['id' => 'god', 'cost' => '823543', 'branch' => 'angel', 'ring' => 8, 'angle' => -60.57, 'requires' => ['seraphim'], 'effects' => ['offlineRate' => '0.05']],
        'lucifer' => ['id' => 'lucifer', 'cost' => '823543', 'branch' => 'demon', 'ring' => 8, 'angle' => 61.34, 'requires' => ['beelzebub'], 'effects' => ['offlineExtraHours' => 256]],
        'inspired_checklist' => ['id' => 'inspired_checklist', 'cost' => '900000', 'branch' => 'persistent', 'ring' => 3, 'angle' => 1.85, 'requires' => ['persistent_memory', 'permanent_slot_ii'], 'effects' => ['buyAllUnlock' => true, 'vaultUnlock' => true]],
        'golden_cookie_alert_sound' => ['id' => 'golden_cookie_alert_sound', 'cost' => '999999', 'branch' => 'misc', 'ring' => 4, 'angle' => -19.85, 'requires' => ['residual_luck'], 'effects' => ['cosmeticId' => 'golden_cookie_alert_sound']],
        'wrapping_paper' => ['id' => 'wrapping_paper', 'cost' => '999999', 'branch' => 'season', 'ring' => 2, 'angle' => 109.5, 'requires' => ['heralds'], 'effects' => ['cosmeticId' => 'wrapping_paper']],
        'fanciful_dairy_selection' => ['id' => 'fanciful_dairy_selection', 'cost' => '1000000', 'branch' => 'misc', 'ring' => 2, 'angle' => -16.78, 'requires' => ['classic_dairy_selection'], 'effects' => ['cosmeticId' => 'fanciful_dairy_selection']],
        'contabilidade_genial' => ['id' => 'contabilidade_genial', 'cost' => '2000000', 'branch' => 'persistent', 'ring' => 4, 'angle' => 6.38, 'requires' => ['inspired_checklist'], 'effects' => ['richAmort' => true]],
        'sinergias_vol_ii' => ['id' => 'sinergias_vol_ii', 'cost' => '2222222', 'branch' => 'production', 'ring' => 8, 'angle' => 13.27, 'requires' => ['beelzebub', 'seraphim', 'sinergias_vol_i'], 'effects' => ['synergyVolUnlock' => 2]],
        'permanent_slot_iii' => ['id' => 'permanent_slot_iii', 'cost' => '3000000', 'branch' => 'persistent', 'ring' => 3, 'angle' => 13.16, 'requires' => ['permanent_slot_ii'], 'effects' => ['permanentSlot' => 3]],
        'label_printer' => ['id' => 'label_printer', 'cost' => '5000000', 'branch' => 'persistent', 'ring' => 5, 'angle' => 9.08, 'requires' => ['contabilidade_genial'], 'effects' => ['labelPrinter' => true]],
        'wrinkly_cookies' => ['id' => 'wrinkly_cookies', 'cost' => '6666666', 'branch' => 'demon', 'ring' => 7, 'angle' => 63.04, 'requires' => ['sacrilegious_corruption', 'elder_spice'], 'effects' => ['allGeneratorsMult' => '1.10']],
        'distilled_essence_of_redoubled_luck' => ['id' => 'distilled_essence_of_redoubled_luck', 'cost' => '7777777', 'branch' => 'golden', 'ring' => 6, 'angle' => -36.68, 'requires' => ['divine_bakeries', 'residual_luck'], 'effects' => []],
        'distinguished_wallpaper_assortment' => ['id' => 'distinguished_wallpaper_assortment', 'cost' => '10000000', 'branch' => 'misc', 'ring' => 3, 'angle' => -9.47, 'requires' => ['basic_wallpaper_assortment'], 'effects' => ['cosmeticId' => 'distinguished_wallpaper_assortment']],
        'unshackled_flavor' => ['id' => 'unshackled_flavor', 'cost' => '10000000', 'branch' => 'unshackled', 'ring' => 6, 'angle' => -58.3, 'requires' => ['label_printer'], 'effects' => ['cosmeticId' => 'sabor_liberado']],
        'unshackled_cursors' => ['id' => 'unshackled_cursors', 'cost' => '15000000', 'branch' => 'unshackled', 'ring' => 7, 'angle' => 28.83, 'requires' => ['unshackled_flavor'], 'effects' => ['unshackleFingers' => true]],
        'quimera' => ['id' => 'quimera', 'cost' => '40353607', 'branch' => 'cookie', 'ring' => 9, 'angle' => 22.65, 'requires' => ['god', 'lucifer', 'sinergias_vol_ii'], 'effects' => ['offlineRate' => '0.05', 'offlineExtraHours' => 48, 'upgradeCostMult' => '0.99']],
        'pagamento_da_sorte' => ['id' => 'pagamento_da_sorte', 'cost' => '77777777', 'branch' => 'golden', 'ring' => 4, 'angle' => -46.08, 'requires' => ['numero_da_sorte', 'decisive_fate'], 'effects' => ['prestigeEffectMult' => '1.01', 'shimmerLuckMult' => '1.01']],
        'eye_of_the_wrinkler' => ['id' => 'eye_of_the_wrinkler', 'cost' => '99999999', 'branch' => 'demon', 'ring' => 8, 'angle' => 65.93, 'requires' => ['wrinkly_cookies'], 'effects' => ['leechDigestVisible' => true]],
        'stevia_caelestis' => ['id' => 'stevia_caelestis', 'cost' => '100000000', 'branch' => 'demon', 'ring' => 8, 'angle' => 70.51, 'requires' => ['wrinkly_cookies'], 'effects' => []],
        'cozimento_de_acucar' => ['id' => 'cozimento_de_acucar', 'cost' => '200000000', 'branch' => 'nectar', 'ring' => 9, 'angle' => 93.08, 'requires' => ['stevia_caelestis'], 'effects' => ['nectarReserveBonus' => true]],
        'diabetica_daemonicus' => ['id' => 'diabetica_daemonicus', 'cost' => '300000000', 'branch' => 'demon', 'ring' => 9, 'angle' => 71.58, 'requires' => ['stevia_caelestis', 'lucifer'], 'effects' => []],
        'permanent_slot_iv' => ['id' => 'permanent_slot_iv', 'cost' => '400000000', 'branch' => 'persistent', 'ring' => 4, 'angle' => 15.13, 'requires' => ['permanent_slot_iii'], 'effects' => ['permanentSlot' => 4]],
        'frenesi_de_acucar' => ['id' => 'frenesi_de_acucar', 'cost' => '400000000', 'branch' => 'nectar', 'ring' => 10, 'angle' => 109.09, 'requires' => ['cozimento_de_acucar'], 'effects' => ['nectarFrenzyUnlock' => true]],
        'aura_gloves' => ['id' => 'aura_gloves', 'cost' => '555555555', 'branch' => 'discount', 'ring' => 5, 'angle' => -5.17, 'requires' => ['luvas_de_halo'], 'effects' => ['clickTalentMult' => '1.05']],
        'sugar_aging_process' => ['id' => 'sugar_aging_process', 'cost' => '600000000', 'branch' => 'nectar', 'ring' => 11, 'angle' => 109.32, 'requires' => ['frenesi_de_acucar', 'diabetica_daemonicus'], 'effects' => ['nectarReserveBonus' => true, 'nectarFrenzyUnlock' => true]],
        'shimmering_veil' => ['id' => 'shimmering_veil', 'cost' => '999999999', 'branch' => 'golden', 'ring' => 7, 'angle' => -39.61, 'requires' => ['distilled_essence_of_redoubled_luck'], 'effects' => []],
        'sucralosia_inutilis' => ['id' => 'sucralosia_inutilis', 'cost' => '1000000000', 'branch' => 'demon', 'ring' => 10, 'angle' => 74.57, 'requires' => ['diabetica_daemonicus'], 'effects' => []],
        'sugar_crystal_cookies' => ['id' => 'sugar_crystal_cookies', 'cost' => '1000000000', 'branch' => 'cookie', 'ring' => 10, 'angle' => 70.83, 'requires' => ['cozimento_de_acucar'], 'effects' => []],
        'keepsakes' => ['id' => 'keepsakes', 'cost' => '1111111111', 'branch' => 'season', 'ring' => 4, 'angle' => 98.85, 'requires' => ['starsnow', 'starlove', 'starterror', 'startrade', 'starspawn'], 'effects' => []],
        'unshackled_berrylium' => ['id' => 'unshackled_berrylium', 'cost' => '1810193360', 'branch' => 'unshackled', 'ring' => 7, 'angle' => -99.63, 'requires' => ['unshackled_flavor'], 'effects' => ['cosmeticId' => 'berrylium']],
        'unshackled_grandmas' => ['id' => 'unshackled_grandmas', 'cost' => '1920000000', 'branch' => 'unshackled', 'ring' => 8, 'angle' => 79.26, 'requires' => ['unshackled_cursors'], 'effects' => ['unshackleGeneratorId' => 'charon_servants']],
        'cat_ladies' => ['id' => 'cat_ladies', 'cost' => '9000000000', 'branch' => 'angel', 'ring' => 7, 'angle' => -61.16, 'requires' => ['kitten_angels'], 'effects' => ['catLadies' => true]],
        'kitten_wages' => ['id' => 'kitten_wages', 'cost' => '9000000000', 'branch' => 'angel', 'ring' => 7, 'angle' => -55.96, 'requires' => ['kitten_angels'], 'effects' => ['kittenUpgradeDiscount' => true]],
        'cosmic_beginner_s_luck' => ['id' => 'cosmic_beginner_s_luck', 'cost' => '14999999985', 'branch' => 'golden', 'ring' => 8, 'angle' => -39.92, 'requires' => ['shimmering_veil'], 'effects' => []],
        'reinforced_membrane' => ['id' => 'reinforced_membrane', 'cost' => '14999999985', 'branch' => 'golden', 'ring' => 8, 'angle' => -35.34, 'requires' => ['shimmering_veil'], 'effects' => []],
        'unshackled_farms' => ['id' => 'unshackled_farms', 'cost' => '32805000000', 'branch' => 'unshackled', 'ring' => 9, 'angle' => -20.47, 'requires' => ['unshackled_grandmas'], 'effects' => ['unshackleGeneratorId' => 'cerberian_hound']],
        'unshackled_blueberrylium' => ['id' => 'unshackled_blueberrylium', 'cost' => '37879951162', 'branch' => 'unshackled', 'ring' => 8, 'angle' => 8.68, 'requires' => ['unshackled_berrylium'], 'effects' => ['cosmeticId' => 'blueberrylium']],
        'permanent_slot_v' => ['id' => 'permanent_slot_v', 'cost' => '50000000000', 'branch' => 'persistent', 'ring' => 5, 'angle' => 16.2, 'requires' => ['permanent_slot_iv'], 'effects' => ['permanentSlot' => 5]],
        'luminous_gloves' => ['id' => 'luminous_gloves', 'cost' => '55555555555', 'branch' => 'discount', 'ring' => 6, 'angle' => -9.3, 'requires' => ['aura_gloves'], 'effects' => ['clickTalentMult' => '1.05']],
        'fortune_cookies' => ['id' => 'fortune_cookies', 'cost' => '77777777777', 'branch' => 'golden', 'ring' => 7, 'angle' => -34.4, 'requires' => ['distilled_essence_of_redoubled_luck'], 'effects' => []],
        'pet_the_dragon' => ['id' => 'pet_the_dragon', 'cost' => '99999999999', 'branch' => 'misc', 'ring' => 4, 'angle' => -11.11, 'requires' => ['ovo_primordial', 'residual_luck'], 'effects' => ['dragonUnlock' => true]],
        'sound_test' => ['id' => 'sound_test', 'cost' => '99999999999', 'branch' => 'misc', 'ring' => 5, 'angle' => -12.3, 'requires' => ['fanciful_dairy_selection', 'distinguished_wallpaper_assortment', 'golden_cookie_alert_sound'], 'effects' => ['cosmeticId' => 'sound_test']],
        'delicate_touch' => ['id' => 'delicate_touch', 'cost' => '149999999985', 'branch' => 'golden', 'ring' => 9, 'angle' => -36.03, 'requires' => ['reinforced_membrane'], 'effects' => []],
        'unshackled_mines' => ['id' => 'unshackled_mines', 'cost' => '245760000000', 'branch' => 'unshackled', 'ring' => 10, 'angle' => -74.05, 'requires' => ['unshackled_farms'], 'effects' => ['unshackleGeneratorId' => 'tartarus_judge']],
        'unshackled_chalcedhoney' => ['id' => 'unshackled_chalcedhoney', 'cost' => '327680000000', 'branch' => 'unshackled', 'ring' => 9, 'angle' => 67.47, 'requires' => ['unshackled_blueberrylium'], 'effects' => ['cosmeticId' => 'chalcedhoney']],
        'box_of_maybe_cookies' => ['id' => 'box_of_maybe_cookies', 'cost' => '333000000000', 'branch' => 'cookie', 'ring' => 11, 'angle' => 57.8, 'requires' => ['sugar_crystal_cookies'], 'effects' => ['cosmeticId' => 'box_of_maybe_cookies']],
        'box_of_not_cookies' => ['id' => 'box_of_not_cookies', 'cost' => '333000000000', 'branch' => 'cookie', 'ring' => 11, 'angle' => 61.24, 'requires' => ['sugar_crystal_cookies'], 'effects' => ['cosmeticId' => 'box_of_not_cookies']],
        'box_of_pastries' => ['id' => 'box_of_pastries', 'cost' => '333000000000', 'branch' => 'cookie', 'ring' => 11, 'angle' => 64.68, 'requires' => ['sugar_crystal_cookies'], 'effects' => ['cosmeticId' => 'box_of_pastries']],
        'comprimidos_milkhelp' => ['id' => 'comprimidos_milkhelp', 'cost' => '900000000000', 'branch' => 'nectar', 'ring' => 8, 'angle' => 28.57, 'requires' => ['cat_ladies'], 'effects' => ['milkhelpServants' => true]],
        'unshackled_factories' => ['id' => 'unshackled_factories', 'cost' => '1171875000000', 'branch' => 'unshackled', 'ring' => 11, 'angle' => -102.24, 'requires' => ['unshackled_mines'], 'effects' => ['unshackleGeneratorId' => 'phlegethon_forge']],
        'unshackled_buttergold' => ['id' => 'unshackled_buttergold', 'cost' => '1746928107422', 'branch' => 'unshackled', 'ring' => 10, 'angle' => 102.03, 'requires' => ['unshackled_chalcedhoney'], 'effects' => ['cosmeticId' => 'buttergold']],
        'unshackled_banks' => ['id' => 'unshackled_banks', 'cost' => '4199040000000', 'branch' => 'unshackled', 'ring' => 12, 'angle' => -116.48, 'requires' => ['unshackled_factories'], 'effects' => ['unshackleGeneratorId' => 'obsidian_throne']],
        'unshackled_sugarmuck' => ['id' => 'unshackled_sugarmuck', 'cost' => '6857003606358', 'branch' => 'unshackled', 'ring' => 11, 'angle' => 120.57, 'requires' => ['unshackled_buttergold'], 'effects' => ['cosmeticId' => 'sugarmuck']],
        'unshackled_temples' => ['id' => 'unshackled_temples', 'cost' => '12353145000000', 'branch' => 'unshackled', 'ring' => 13, 'angle' => -123.04, 'requires' => ['unshackled_banks'], 'effects' => ['unshackleGeneratorId' => 'mnemosyne_temple']],
        'steadfast_murmur' => ['id' => 'steadfast_murmur', 'cost' => '14999999999985', 'branch' => 'golden', 'ring' => 10, 'angle' => -34.75, 'requires' => ['delicate_touch'], 'effects' => []],
        'unshackled_jetmint' => ['id' => 'unshackled_jetmint', 'cost' => '21788899719681', 'branch' => 'unshackled', 'ring' => 12, 'angle' => 131.04, 'requires' => ['unshackled_sugarmuck'], 'effects' => ['cosmeticId' => 'jetmint']],
        'unshackled_wizard_towers' => ['id' => 'unshackled_wizard_towers', 'cost' => '31457280000000', 'branch' => 'unshackled', 'ring' => 14, 'angle' => -125.38, 'requires' => ['unshackled_temples'], 'effects' => ['unshackleGeneratorId' => 'styx_tower']],
        'unshackled_cherrysilver' => ['id' => 'unshackled_cherrysilver', 'cost' => '59316416015158', 'branch' => 'unshackled', 'ring' => 13, 'angle' => 137.06, 'requires' => ['unshackled_jetmint'], 'effects' => ['cosmeticId' => 'cherrysilver']],
        'unshackled_shipments' => ['id' => 'unshackled_shipments', 'cost' => '71744535000000', 'branch' => 'unshackled', 'ring' => 15, 'angle' => -125.39, 'requires' => ['unshackled_wizard_towers'], 'effects' => ['unshackleGeneratorId' => 'star_barge']],
        'unshackled_hazelrald' => ['id' => 'unshackled_hazelrald', 'cost' => '143489070000000', 'branch' => 'unshackled', 'ring' => 14, 'angle' => 140.63, 'requires' => ['unshackled_cherrysilver'], 'effects' => ['cosmeticId' => 'hazelrald']],
        'unshackled_alchemy_labs' => ['id' => 'unshackled_alchemy_labs', 'cost' => '150000000000000', 'branch' => 'unshackled', 'ring' => 16, 'angle' => -124.13, 'requires' => ['unshackled_shipments'], 'effects' => ['unshackleGeneratorId' => 'tartarus_lab']],
        'unshackled_portals' => ['id' => 'unshackled_portals', 'cost' => '292307565000000', 'branch' => 'unshackled', 'ring' => 17, 'angle' => -2.76, 'requires' => ['unshackled_alchemy_labs'], 'effects' => ['unshackleGeneratorId' => 'erebus_portal']],
        'unshackled_mooncandy' => ['id' => 'unshackled_mooncandy', 'cost' => '316227766016838', 'branch' => 'unshackled', 'ring' => 15, 'angle' => 23.45, 'requires' => ['unshackled_hazelrald'], 'effects' => ['cosmeticId' => 'mooncandy']],
        'unshackled_time_machines' => ['id' => 'unshackled_time_machines', 'cost' => '537477120000000', 'branch' => 'unshackled', 'ring' => 18, 'angle' => 64.26, 'requires' => ['unshackled_portals'], 'effects' => ['unshackleGeneratorId' => 'chronos_loom']],
        'unshackled_astrofudge' => ['id' => 'unshackled_astrofudge', 'cost' => '646316344324949', 'branch' => 'unshackled', 'ring' => 16, 'angle' => -39.72, 'requires' => ['unshackled_mooncandy'], 'effects' => ['cosmeticId' => 'astrofudge']],
        'unshackled_antimatter_condensers' => ['id' => 'unshackled_antimatter_condensers', 'cost' => '941227755000000', 'branch' => 'unshackled', 'ring' => 19, 'angle' => 101.39, 'requires' => ['unshackled_time_machines'], 'effects' => ['unshackleGeneratorId' => 'void_condenser']],
        'unshackled_alabascream' => ['id' => 'unshackled_alabascream', 'cost' => '1241250239661060', 'branch' => 'unshackled', 'ring' => 17, 'angle' => -73.2, 'requires' => ['unshackled_astrofudge'], 'effects' => ['cosmeticId' => 'alabascream']],
        'glittering_edge' => ['id' => 'glittering_edge', 'cost' => '1499999999999985', 'branch' => 'golden', 'ring' => 11, 'angle' => -33.52, 'requires' => ['steadfast_murmur'], 'effects' => []],
        'unshackled_prisms' => ['id' => 'unshackled_prisms', 'cost' => '1581202560000000', 'branch' => 'unshackled', 'ring' => 20, 'angle' => 122.07, 'requires' => ['unshackled_antimatter_condensers'], 'effects' => ['unshackleGeneratorId' => 'moirai_prism']],
        'unshackled_iridyum' => ['id' => 'unshackled_iridyum', 'cost' => '2262429955028239', 'branch' => 'unshackled', 'ring' => 18, 'angle' => -90.34, 'requires' => ['unshackled_alabascream'], 'effects' => ['cosmeticId' => 'iridyum']],
        'unshackled_chancemakers' => ['id' => 'unshackled_chancemakers', 'cost' => '2562890625000000', 'branch' => 'unshackled', 'ring' => 21, 'angle' => 133.7134605468919, 'requires' => ['unshackled_prisms'], 'effects' => ['unshackleGeneratorId' => 'fate_forge']],
        'unshackled_glucosmium' => ['id' => 'unshackled_glucosmium', 'cost' => '3944212159073245', 'branch' => 'unshackled', 'ring' => 19, 'angle' => -98.5, 'requires' => ['unshackled_iridyum'], 'effects' => ['cosmeticId' => 'glucosmium']],
        'unshackled_fractal_engines' => ['id' => 'unshackled_fractal_engines', 'cost' => '4026531840000000', 'branch' => 'unshackled', 'ring' => 22, 'angle' => 140.3806385949082, 'requires' => ['unshackled_chancemakers'], 'effects' => ['unshackleGeneratorId' => 'fractal_engine']],
        'unshackled_javascript_consoles' => ['id' => 'unshackled_javascript_consoles', 'cost' => '6155080095000000', 'branch' => 'unshackled', 'ring' => 23, 'angle' => 29.668174756611272, 'requires' => ['unshackled_fractal_engines'], 'effects' => ['unshackleGeneratorId' => 'oracle_console']],
        'unshackled_glimmeringue' => ['id' => 'unshackled_glimmeringue', 'cost' => '6617355139184080', 'branch' => 'unshackled', 'ring' => 20, 'angle' => 12.93, 'requires' => ['unshackled_glucosmium'], 'effects' => ['cosmeticId' => 'glimmeringue']],
        'unshackled_idleverses' => ['id' => 'unshackled_idleverses', 'cost' => '9183300480000000', 'branch' => 'unshackled', 'ring' => 24, 'angle' => -29.953092119157912, 'requires' => ['unshackled_javascript_consoles'], 'effects' => ['unshackleGeneratorId' => 'chthonic_idleverse']],
        'unshackled_cortex_bakers' => ['id' => 'unshackled_cortex_bakers', 'cost' => '13408076085000000', 'branch' => 'unshackled', 'ring' => 25, 'angle' => 50.893446393286666, 'requires' => ['unshackled_idleverses'], 'effects' => ['unshackleGeneratorId' => 'cortex_baker']],
        'unshackled_you' => ['id' => 'unshackled_you', 'cost' => '19200000000000000', 'branch' => 'unshackled', 'ring' => 26, 'angle' => -17.008604483692324, 'requires' => ['unshackled_cortex_bakers'], 'effects' => ['unshackleGeneratorId' => 'the_emperor']],
    ];

    public const LEGACY_TALENT_COSTS = [
        'memoria_das_sombras' => '1',
        'juramento_eterno' => '1',
        'noite_prolongada' => '2',
        'veu_eficiente' => '2',
        'foice_ancestral' => '3',
        'favor_de_caronte' => '3',
        'margem_generosa' => '3',
        'pacto_do_silencio' => '3',
        'olho_da_curva' => '4',
        'eco_do_styx' => '4',
        'mnemosyne_profunda' => '5',
        'segundo_folego' => '5',
        'nectar_em_reserva' => '5',
        'ovo_primordial' => '5',
        'rebanho_despertado' => '5',
        'matilha_cerberiana' => '6',
        'eco_ressonante' => '6',
        'calice_da_memoria' => '7',
        'mnemosyne_tripla' => '8',
        'frenesi_de_nectar_talento' => '8',
        'eco_ancestral_iii' => '9',
        'forja_despertada' => '10',
        'eco_ancestral_iv' => '12',
        'eco_ancestral_v' => '15',
        'rodizio_das_estacoes' => '5',
        'preludio_ctoniano' => '4',
        'lamina_viva' => '5',
        'mare_inicial' => '7',
        'legado_do_rio' => '6',
        'sinergias_vol_i' => '8',
        'sinergias_vol_ii' => '25',
    ];

    public const LEGACY_TALENT_MAP = [
        'legado' => 'legado',
        'sinergias_vol_i' => 'sinergias_vol_i',
        'sinergias_vol_ii' => 'sinergias_vol_ii',
        'ovo_primordial' => 'ovo_primordial',
        'rodizio_das_estacoes' => 'rodizio_das_estacoes',
        'juramento_eterno' => 'legado',
        'memoria_das_sombras' => 'kit_inicial',
        'margem_generosa' => 'kit_inicial',
        'foice_ancestral' => 'luvas_de_halo',
        'favor_de_caronte' => 'desconto_divino',
        'olho_da_curva' => 'contabilidade_genial',
        'eco_do_styx' => 'permanent_slot_i',
        'eco_ressonante' => 'permanent_slot_ii',
        'eco_ancestral_iii' => 'permanent_slot_iii',
        'eco_ancestral_iv' => 'permanent_slot_iv',
        'eco_ancestral_v' => 'permanent_slot_v',
        'noite_prolongada' => 'mamon',
        'veu_eficiente' => 'portoes_gemeos',
        'pacto_do_silencio' => 'abadao',
        'mnemosyne_profunda' => 'numero_da_sorte',
        'mnemosyne_tripla' => 'pagamento_da_sorte',
        'mnemosyne_raiz' => 'quimera',
        'nectar_em_reserva' => 'cozimento_de_acucar',
        'frenesi_de_nectar_talento' => 'frenesi_de_acucar',
        'preludio_ctoniano' => null,
        'segundo_folego' => null,
        'lamina_viva' => null,
        'rebanho_despertado' => null,
        'mare_inicial' => null,
        'torrente_das_umbras' => null,
        'servo_das_margens' => null,
        'matilha_cerberiana' => null,
        'forja_despertada' => null,
        'trono_sombrio' => null,
        'imperio_fluvial' => null,
        'legado_do_rio' => null,
        'calice_da_memoria' => null,
    ];

    public const VERDICT_SHOP = [
        'selo_do_juiz' => ['id' => 'selo_do_juiz', 'cost' => 1, 'effects' => ['clickMult' => '1.05']],
        'memoria_classind' => ['id' => 'memoria_classind', 'cost' => 4, 'effects' => ['offlineExtraHours' => 0.5]],
        'sentenca_afiada' => ['id' => 'sentenca_afiada', 'cost' => 6, 'effects' => ['clickMult' => '1.08']],
        'olho_do_tartarus' => ['id' => 'olho_do_tartarus', 'cost' => 8, 'effects' => ['spsMult' => '1.02']],
        'eco_do_veredito' => ['id' => 'eco_do_veredito', 'cost' => 8, 'effects' => ['verdictBonus' => true]],
        'catalogo_vivo' => ['id' => 'catalogo_vivo', 'cost' => 10, 'effects' => ['juizoMercy' => true]],
        'pacto_duplo' => ['id' => 'pacto_duplo', 'cost' => 12, 'effects' => ['firstGeneratorCostMult' => '0.90']],
        'peso_das_faixas' => ['id' => 'peso_das_faixas', 'cost' => 14, 'effects' => ['spsMult' => '1.03']],
    ];

    public const SHIMMER_EFFECTS = [
        [
            'id' => 'frenesi_nectar',
            'name' => 'Frenesi de Néctar',
            'kind' => 'spsBuff',
            'variant' => 'golden',
            'factor' => self::NECTAR_FRENZY_MULT,
            'durationSec' => self::NECTAR_FRENZY_DURATION_SEC,
            'requiresCatabase' => false,
            'manualOnly' => true,
        ],
        [
            'id' => 'mare_acheron',
            'name' => 'Maré do Acheron',
            'kind' => 'spsBuff',
            'variant' => 'golden',
            'factor' => self::SHIMMER_FRENZY_MULT,
            'durationSec' => self::SHIMMER_FRENZY_DURATION_SEC,
            'requiresCatabase' => false,
        ],
        [
            'id' => 'colheita_acheron',
            'name' => 'Colheita do Acheron',
            'kind' => 'instantLucky',
            'variant' => 'golden',
            'walletFraction' => self::SHIMMER_LUCKY_WALLET_FRACTION,
            'spsSeconds' => self::SHIMMER_LUCKY_SPS_SECONDS,
            'flatBonus' => self::SHIMMER_LUCKY_FLAT_BONUS,
            'durationSec' => 0,
            'requiresCatabase' => false,
        ],
        [
            'id' => 'furia_foice',
            'name' => 'Fúria da Foice',
            'kind' => 'clickBuff',
            'variant' => 'golden',
            'factor' => self::SHIMMER_CLICK_FRENZY_MULT,
            'durationSec' => self::SHIMMER_CLICK_FRENZY_DURATION_SEC,
            'requiresCatabase' => false,
        ],
        [
            'id' => 'selo_juizo',
            'name' => 'Selo do Juízo',
            'kind' => 'buildingSpecial',
            'variant' => 'golden',
            'factor' => '1',
            'durationSec' => self::SHIMMER_BUILDING_SPECIAL_DURATION_SEC,
            'verdictsGain' => 1,
            'minGeneratorQty' => 10,
            'requiresCatabase' => false,
        ],
        [
            'id' => 'clot_acheron',
            'name' => 'Coágulo do Acheron',
            'kind' => 'spsBuff',
            'variant' => 'wrath',
            'factor' => self::SHIMMER_CLOT_MULT,
            'durationSec' => self::SHIMMER_CLOT_DURATION_SEC,
            'requiresCatabase' => true,
        ],
        [
            'id' => 'elder_frenzy_acheron',
            'name' => 'Fúria Anciã do Acheron',
            'kind' => 'spsBuff',
            'variant' => 'wrath',
            'factor' => self::SHIMMER_ELDER_FRENZY_MULT,
            'durationSec' => self::SHIMMER_ELDER_FRENZY_DURATION_SEC,
            'requiresCatabase' => true,
        ],
        [
            'id' => 'voo_draconico_acheron',
            'name' => 'Voo Dracónico',
            'kind' => 'clickBuff',
            'variant' => 'golden',
            'factor' => self::DRAGONFLIGHT_CLICK_MULT,
            'durationSec' => self::DRAGONFLIGHT_DURATION_SEC,
            'requiresCatabase' => false,
            'requiresDragonflight' => true,
        ],
    ];

    public const PANTHEON_SLOTS = [
        ['id' => 'diamond', 'multIndex' => 0],
        ['id' => 'ruby', 'multIndex' => 1],
        ['id' => 'jade', 'multIndex' => 2],
    ];

    public const PANTHEON_SPIRITS = [
        'spirit_nyx' => [
            'id' => 'spirit_nyx',
            'spsMultBySlot' => ['1.15', '1.10', '1.05'],
            'clickMultBySlot' => ['0.90', '0.93', '0.96'],
        ],
        'spirit_thanatos' => [
            'id' => 'spirit_thanatos',
            'spsMultBySlot' => ['0.95', '0.97', '0.98'],
            'clickMultBySlot' => ['1.30', '1.20', '1.10'],
        ],
        'spirit_hypnos' => [
            'id' => 'spirit_hypnos',
            'spsMultBySlot' => ['1.10', '1.07', '1.03'],
            'clickMultBySlot' => ['1', '1', '1'],
        ],
        'spirit_persephone' => [
            'id' => 'spirit_persephone',
            'spsMultBySlot' => ['1.08', '1.05', '1.02'],
            'clickMultBySlot' => ['1.08', '1.05', '1.02'],
        ],
    ];

    public const GARDEN_SOILS = [
        'barro_acheron' => ['id' => 'barro_acheron', 'passiveEffMult' => '1'],
        'cinzas_phlegethon' => ['id' => 'cinzas_phlegethon', 'passiveEffMult' => '0.75'],
        'adubo_estigio' => ['id' => 'adubo_estigio', 'passiveEffMult' => '1.25'],
    ];

    public const GARDEN_SEEDS = [
        'asfodelo_cinzento' => [
            'id' => 'asfodelo_cinzento',
            'matureTicks' => 3,
            'lifespanTicks' => 12,
            'spsBonusPerPlot' => '0.01',
            'clickBonusPerPlot' => '0',
        ],
        'roma_de_persefone' => [
            'id' => 'roma_de_persefone',
            'matureTicks' => 4,
            'lifespanTicks' => 15,
            'spsBonusPerPlot' => '0.02',
            'clickBonusPerPlot' => '0',
        ],
        'lirio_do_lethe' => [
            'id' => 'lirio_do_lethe',
            'matureTicks' => 3,
            'lifespanTicks' => 10,
            'spsBonusPerPlot' => '0',
            'clickBonusPerPlot' => '0.03',
        ],
        'papoula_de_hipnos' => [
            'id' => 'papoula_de_hipnos',
            'matureTicks' => 5,
            'lifespanTicks' => 16,
            'spsBonusPerPlot' => '0.01',
            'clickBonusPerPlot' => '0.01',
        ],
    ];

    public const EDU_LOG_IDS = [
        'log_input',
        'log_state',
        'log_loop',
        'log_delta',
        'log_generator',
        'log_curve',
        'log_amort',
        'log_upgrade',
        'log_wall',
        'log_lethe_unlock',
        'log_lethe_ritual',
        'log_styx_open',
        'log_prestige',
        'log_authority',
        'log_offline',
        'log_juizo',
        'log_reap_power',
        'log_buy_modes',
        'log_sealed_juramentos',
        'log_verdicts_milestone',
        'log_obols_bonus',
        'log_synergy_blades',
        'log_shimmer_echo',
        'log_midgame_payoff',
        'log_nectar_minigames',
        'log_veil_kittens',
        'log_catabase_wrinklers',
        'log_late_bignum_payoff',
        'log_incremental_architecture_f8',
    ];

    public const DESPERTAR_ACHIEVEMENT_IDS = [
        'despertar_primeira_alma',
        'despertar_primeira_sombra',
        'despertar_automacao',
        'despertar_forja',
        'despertar_trono',
        'despertar_catabase',
        'despertar_mnemosyne',
        'despertar_soberania',
        'despertar_juizo_5',
        'despertar_juizo_25',
        'despertar_veredito',
        'despertar_cem_almas',
        'despertar_mil_almas',
        'despertar_milhao',
        'despertar_styx_primeiro',
        'despertar_styx_cinco',
        'despertar_shiny',
        'despertar_gold',
        'despertar_catabase_3',
        'despertar_juizo_1',
        'despertar_juizo_10',
        'despertar_bancada_cheia',
        'despertar_arquiteto_do_loop',
        'despertar_paciencia',
        'despertar_templo_1',
        'despertar_templo_50',
        'despertar_templo_100',
        'despertar_templo_200',
        'despertar_torre_1',
        'despertar_torre_50',
        'despertar_torre_100',
        'despertar_torre_200',
        'despertar_barca_1',
        'despertar_barca_50',
        'despertar_barca_100',
        'despertar_barca_200',
        'despertar_laboratorio_1',
        'despertar_laboratorio_50',
        'despertar_laboratorio_100',
        'despertar_laboratorio_200',
        'despertar_portal_1',
        'despertar_portal_50',
        'despertar_portal_100',
        'despertar_portal_200',
        'despertar_tear_1',
        'despertar_tear_50',
        'despertar_tear_100',
        'despertar_tear_200',
        'despertar_nectar_primeiro',
        'despertar_nivel_1',
        'despertar_nivel_10',
        'despertar_minigame_panteao',
        'despertar_minigame_grimorio',
        'despertar_minigame_jardim',
        'despertar_minigame_mercado',
        'despertar_bilhao',
        'despertar_trilhao',
        'despertar_sps_100',
        'despertar_sps_10k',
        'despertar_sps_1m',
        'despertar_sps_1b',
        'despertar_cliques_100',
        'despertar_cliques_1000',
        'despertar_eco_1',
        'despertar_eco_7',
        'despertar_eco_27',
        'despertar_eco_colerico',
        'despertar_sombra_50',
        'despertar_sombra_100',
        'despertar_servos_50',
        'despertar_cao_50',
        'despertar_juiz_50',
        'despertar_forja_50',
        'despertar_trono_50',
        'despertar_catabase_5',
        'despertar_filhote_primeiro',
        'despertar_sombra_sorte_pura',
        'despertar_sombra_vigilia_eterna',
        'despertar_catabase_avos_1',
        'despertar_catabase_avos_2',
        'despertar_catabase_avos_3',
        'despertar_sanguessuga_1',
        'despertar_sanguessuga_50',
        'despertar_sanguessuga_200',
        'despertar_sanguessuga_shiny',
        'despertar_tregua_estigia',
        'despertar_alianca_eterna',
        'despertar_condensador_1',
        'despertar_condensador_50',
        'despertar_condensador_100',
        'despertar_condensador_200',
        'despertar_condensador_300',
        'despertar_prisma_1',
        'despertar_prisma_50',
        'despertar_prisma_100',
        'despertar_prisma_200',
        'despertar_prisma_300',
        'despertar_forja_destino_1',
        'despertar_forja_destino_50',
        'despertar_forja_destino_100',
        'despertar_forja_destino_200',
        'despertar_forja_destino_300',
        'despertar_motor_fractal_1',
        'despertar_motor_fractal_50',
        'despertar_motor_fractal_100',
        'despertar_motor_fractal_200',
        'despertar_motor_fractal_300',
        'despertar_console_1',
        'despertar_console_50',
        'despertar_console_100',
        'despertar_console_200',
        'despertar_console_300',
        'despertar_idleverso_1',
        'despertar_idleverso_50',
        'despertar_idleverso_100',
        'despertar_idleverso_200',
        'despertar_idleverso_300',
        'despertar_cortex_1',
        'despertar_cortex_50',
        'despertar_cortex_100',
        'despertar_cortex_200',
        'despertar_cortex_300',
        'despertar_imperador_1',
        'despertar_imperador_50',
        'despertar_imperador_100',
        'despertar_imperador_200',
        'despertar_imperador_300',
        'despertar_vinte_rios',
        'despertar_almas_1e21',
        'despertar_almas_1e30',
        'despertar_sps_1e15',
        'despertar_sps_1e21',
        'despertar_dragao_filhote',
        'despertar_dragao_ladao',
        'despertar_estacoes_4',
        'despertar_reliquias_sazonais',
        'despertar_rei_saturno_5',
        'despertar_fortuna_1',
        'despertar_o_fortuna',
        'despertar_mercador_acheron',
        'despertar_sombra_150',
        'despertar_sombra_250',
        'despertar_sombra_300',
        'despertar_sombra_350',
        'despertar_sombra_400',
        'despertar_sombra_450',
        'despertar_sombra_500',
        'despertar_sombra_550',
        'despertar_sombra_600',
        'despertar_servos_150',
        'despertar_servos_250',
        'despertar_servos_300',
        'despertar_servos_350',
        'despertar_servos_400',
        'despertar_servos_450',
        'despertar_servos_500',
        'despertar_servos_550',
        'despertar_servos_600',
        'despertar_cao_150',
        'despertar_cao_250',
        'despertar_cao_300',
        'despertar_cao_350',
        'despertar_cao_400',
        'despertar_cao_450',
        'despertar_cao_500',
        'despertar_cao_550',
        'despertar_cao_600',
        'despertar_juiz_150',
        'despertar_juiz_250',
        'despertar_juiz_300',
        'despertar_juiz_350',
        'despertar_juiz_400',
        'despertar_juiz_450',
        'despertar_juiz_500',
        'despertar_juiz_550',
        'despertar_juiz_600',
        'despertar_forja_150',
        'despertar_forja_250',
        'despertar_forja_300',
        'despertar_forja_350',
        'despertar_forja_400',
        'despertar_forja_450',
        'despertar_forja_500',
        'despertar_forja_550',
        'despertar_forja_600',
        'despertar_trono_150',
        'despertar_trono_250',
        'despertar_trono_300',
        'despertar_trono_350',
        'despertar_trono_400',
        'despertar_trono_450',
        'despertar_trono_500',
        'despertar_trono_550',
        'despertar_trono_600',
        'despertar_templo_350',
        'despertar_templo_400',
        'despertar_templo_450',
        'despertar_templo_500',
        'despertar_templo_550',
        'despertar_templo_600',
        'despertar_torre_350',
        'despertar_torre_400',
        'despertar_torre_450',
        'despertar_torre_500',
        'despertar_torre_550',
        'despertar_torre_600',
        'despertar_barca_350',
        'despertar_barca_400',
        'despertar_barca_450',
        'despertar_barca_500',
        'despertar_barca_550',
        'despertar_barca_600',
        'despertar_laboratorio_350',
        'despertar_laboratorio_400',
        'despertar_laboratorio_450',
        'despertar_laboratorio_500',
        'despertar_laboratorio_550',
        'despertar_laboratorio_600',
        'despertar_portal_350',
        'despertar_portal_400',
        'despertar_portal_450',
        'despertar_portal_500',
        'despertar_portal_550',
        'despertar_portal_600',
        'despertar_tear_350',
        'despertar_tear_400',
        'despertar_tear_450',
        'despertar_tear_500',
        'despertar_tear_550',
        'despertar_tear_600',
        'despertar_condensador_350',
        'despertar_condensador_400',
        'despertar_condensador_450',
        'despertar_condensador_500',
        'despertar_condensador_550',
        'despertar_condensador_600',
        'despertar_prisma_350',
        'despertar_prisma_400',
        'despertar_prisma_450',
        'despertar_prisma_500',
        'despertar_prisma_550',
        'despertar_prisma_600',
        'despertar_forja_destino_350',
        'despertar_forja_destino_400',
        'despertar_forja_destino_450',
        'despertar_forja_destino_500',
        'despertar_forja_destino_550',
        'despertar_forja_destino_600',
        'despertar_motor_fractal_350',
        'despertar_motor_fractal_400',
        'despertar_motor_fractal_450',
        'despertar_motor_fractal_500',
        'despertar_motor_fractal_550',
        'despertar_motor_fractal_600',
        'despertar_console_350',
        'despertar_console_400',
        'despertar_console_450',
        'despertar_console_500',
        'despertar_console_550',
        'despertar_console_600',
        'despertar_idleverso_350',
        'despertar_idleverso_400',
        'despertar_idleverso_450',
        'despertar_idleverso_500',
        'despertar_idleverso_550',
        'despertar_idleverso_600',
        'despertar_cortex_350',
        'despertar_cortex_400',
        'despertar_cortex_450',
        'despertar_cortex_500',
        'despertar_cortex_550',
        'despertar_cortex_600',
        'despertar_imperador_350',
        'despertar_imperador_400',
        'despertar_imperador_450',
        'despertar_imperador_500',
        'despertar_imperador_550',
        'despertar_imperador_600',
        'despertar_prestigio_10',
        'despertar_prestigio_25',
        'despertar_prestigio_50',
        'despertar_prestigio_100',
        'despertar_filhotes_3',
        'despertar_filhotes_5',
        'despertar_filhotes_8',
        'despertar_filhotes_10',
        'despertar_filhotes_15',
        'despertar_ausencia_10h',
        'despertar_ausencia_24h',
        'despertar_ausencia_72h',
        'despertar_cliques_10k',
        'despertar_cliques_100k',
        'despertar_talentos_25',
        'despertar_talentos_50',
        'despertar_talentos_100',
        'despertar_melhorias_50',
        'despertar_melhorias_100',
        'despertar_melhorias_150',
        'despertar_juizo_50',
        'despertar_juizo_100',
        'despertar_almas_1e39',
        'despertar_sps_1e27',
        'despertar_sps_1e33',
        'despertar_ecos_777',
        'despertar_nectar_100',
        'despertar_nectar_1000',
        'despertar_sanguessuga_500',
        'despertar_sanguessuga_1000',
        'despertar_prestigio_200',
        'despertar_cliques_1m',
        'despertar_ausencia_168h',
    ];

    public const DESPERTAR_GENERATOR_MILESTONE_ACHIEVEMENTS = [
        'wandering_shade' => [50 => 'despertar_sombra_50', 100 => 'despertar_sombra_100', 150 => 'despertar_sombra_150', 250 => 'despertar_sombra_250', 300 => 'despertar_sombra_300', 350 => 'despertar_sombra_350', 400 => 'despertar_sombra_400', 450 => 'despertar_sombra_450', 500 => 'despertar_sombra_500', 550 => 'despertar_sombra_550', 600 => 'despertar_sombra_600'],
        'charon_servants' => [50 => 'despertar_servos_50', 150 => 'despertar_servos_150', 250 => 'despertar_servos_250', 300 => 'despertar_servos_300', 350 => 'despertar_servos_350', 400 => 'despertar_servos_400', 450 => 'despertar_servos_450', 500 => 'despertar_servos_500', 550 => 'despertar_servos_550', 600 => 'despertar_servos_600'],
        'cerberian_hound' => [50 => 'despertar_cao_50', 150 => 'despertar_cao_150', 250 => 'despertar_cao_250', 300 => 'despertar_cao_300', 350 => 'despertar_cao_350', 400 => 'despertar_cao_400', 450 => 'despertar_cao_450', 500 => 'despertar_cao_500', 550 => 'despertar_cao_550', 600 => 'despertar_cao_600'],
        'tartarus_judge' => [50 => 'despertar_juiz_50', 150 => 'despertar_juiz_150', 250 => 'despertar_juiz_250', 300 => 'despertar_juiz_300', 350 => 'despertar_juiz_350', 400 => 'despertar_juiz_400', 450 => 'despertar_juiz_450', 500 => 'despertar_juiz_500', 550 => 'despertar_juiz_550', 600 => 'despertar_juiz_600'],
        'phlegethon_forge' => [50 => 'despertar_forja_50', 150 => 'despertar_forja_150', 250 => 'despertar_forja_250', 300 => 'despertar_forja_300', 350 => 'despertar_forja_350', 400 => 'despertar_forja_400', 450 => 'despertar_forja_450', 500 => 'despertar_forja_500', 550 => 'despertar_forja_550', 600 => 'despertar_forja_600'],
        'obsidian_throne' => [50 => 'despertar_trono_50', 150 => 'despertar_trono_150', 250 => 'despertar_trono_250', 300 => 'despertar_trono_300', 350 => 'despertar_trono_350', 400 => 'despertar_trono_400', 450 => 'despertar_trono_450', 500 => 'despertar_trono_500', 550 => 'despertar_trono_550', 600 => 'despertar_trono_600'],
        'mnemosyne_temple' => [1 => 'despertar_templo_1', 50 => 'despertar_templo_50', 100 => 'despertar_templo_100', 200 => 'despertar_templo_200', 350 => 'despertar_templo_350', 400 => 'despertar_templo_400', 450 => 'despertar_templo_450', 500 => 'despertar_templo_500', 550 => 'despertar_templo_550', 600 => 'despertar_templo_600'],
        'styx_tower' => [1 => 'despertar_torre_1', 50 => 'despertar_torre_50', 100 => 'despertar_torre_100', 200 => 'despertar_torre_200', 350 => 'despertar_torre_350', 400 => 'despertar_torre_400', 450 => 'despertar_torre_450', 500 => 'despertar_torre_500', 550 => 'despertar_torre_550', 600 => 'despertar_torre_600'],
        'star_barge' => [1 => 'despertar_barca_1', 50 => 'despertar_barca_50', 100 => 'despertar_barca_100', 200 => 'despertar_barca_200', 350 => 'despertar_barca_350', 400 => 'despertar_barca_400', 450 => 'despertar_barca_450', 500 => 'despertar_barca_500', 550 => 'despertar_barca_550', 600 => 'despertar_barca_600'],
        'tartarus_lab' => [1 => 'despertar_laboratorio_1', 50 => 'despertar_laboratorio_50', 100 => 'despertar_laboratorio_100', 200 => 'despertar_laboratorio_200', 350 => 'despertar_laboratorio_350', 400 => 'despertar_laboratorio_400', 450 => 'despertar_laboratorio_450', 500 => 'despertar_laboratorio_500', 550 => 'despertar_laboratorio_550', 600 => 'despertar_laboratorio_600'],
        'erebus_portal' => [1 => 'despertar_portal_1', 50 => 'despertar_portal_50', 100 => 'despertar_portal_100', 200 => 'despertar_portal_200', 350 => 'despertar_portal_350', 400 => 'despertar_portal_400', 450 => 'despertar_portal_450', 500 => 'despertar_portal_500', 550 => 'despertar_portal_550', 600 => 'despertar_portal_600'],
        'chronos_loom' => [1 => 'despertar_tear_1', 50 => 'despertar_tear_50', 100 => 'despertar_tear_100', 200 => 'despertar_tear_200', 350 => 'despertar_tear_350', 400 => 'despertar_tear_400', 450 => 'despertar_tear_450', 500 => 'despertar_tear_500', 550 => 'despertar_tear_550', 600 => 'despertar_tear_600'],
        'void_condenser' => [1 => 'despertar_condensador_1', 50 => 'despertar_condensador_50', 100 => 'despertar_condensador_100', 200 => 'despertar_condensador_200', 300 => 'despertar_condensador_300', 350 => 'despertar_condensador_350', 400 => 'despertar_condensador_400', 450 => 'despertar_condensador_450', 500 => 'despertar_condensador_500', 550 => 'despertar_condensador_550', 600 => 'despertar_condensador_600'],
        'moirai_prism' => [1 => 'despertar_prisma_1', 50 => 'despertar_prisma_50', 100 => 'despertar_prisma_100', 200 => 'despertar_prisma_200', 300 => 'despertar_prisma_300', 350 => 'despertar_prisma_350', 400 => 'despertar_prisma_400', 450 => 'despertar_prisma_450', 500 => 'despertar_prisma_500', 550 => 'despertar_prisma_550', 600 => 'despertar_prisma_600'],
        'fate_forge' => [1 => 'despertar_forja_destino_1', 50 => 'despertar_forja_destino_50', 100 => 'despertar_forja_destino_100', 200 => 'despertar_forja_destino_200', 300 => 'despertar_forja_destino_300', 350 => 'despertar_forja_destino_350', 400 => 'despertar_forja_destino_400', 450 => 'despertar_forja_destino_450', 500 => 'despertar_forja_destino_500', 550 => 'despertar_forja_destino_550', 600 => 'despertar_forja_destino_600'],
        'fractal_engine' => [1 => 'despertar_motor_fractal_1', 50 => 'despertar_motor_fractal_50', 100 => 'despertar_motor_fractal_100', 200 => 'despertar_motor_fractal_200', 300 => 'despertar_motor_fractal_300', 350 => 'despertar_motor_fractal_350', 400 => 'despertar_motor_fractal_400', 450 => 'despertar_motor_fractal_450', 500 => 'despertar_motor_fractal_500', 550 => 'despertar_motor_fractal_550', 600 => 'despertar_motor_fractal_600'],
        'oracle_console' => [1 => 'despertar_console_1', 50 => 'despertar_console_50', 100 => 'despertar_console_100', 200 => 'despertar_console_200', 300 => 'despertar_console_300', 350 => 'despertar_console_350', 400 => 'despertar_console_400', 450 => 'despertar_console_450', 500 => 'despertar_console_500', 550 => 'despertar_console_550', 600 => 'despertar_console_600'],
        'chthonic_idleverse' => [1 => 'despertar_idleverso_1', 50 => 'despertar_idleverso_50', 100 => 'despertar_idleverso_100', 200 => 'despertar_idleverso_200', 300 => 'despertar_idleverso_300', 350 => 'despertar_idleverso_350', 400 => 'despertar_idleverso_400', 450 => 'despertar_idleverso_450', 500 => 'despertar_idleverso_500', 550 => 'despertar_idleverso_550', 600 => 'despertar_idleverso_600'],
        'cortex_baker' => [1 => 'despertar_cortex_1', 50 => 'despertar_cortex_50', 100 => 'despertar_cortex_100', 200 => 'despertar_cortex_200', 300 => 'despertar_cortex_300', 350 => 'despertar_cortex_350', 400 => 'despertar_cortex_400', 450 => 'despertar_cortex_450', 500 => 'despertar_cortex_500', 550 => 'despertar_cortex_550', 600 => 'despertar_cortex_600'],
        'the_emperor' => [1 => 'despertar_imperador_1', 50 => 'despertar_imperador_50', 100 => 'despertar_imperador_100', 200 => 'despertar_imperador_200', 300 => 'despertar_imperador_300', 350 => 'despertar_imperador_350', 400 => 'despertar_imperador_400', 450 => 'despertar_imperador_450', 500 => 'despertar_imperador_500', 550 => 'despertar_imperador_550', 600 => 'despertar_imperador_600'],
    ];

    public const DESPERTAR_JUIZO_STREAK_THRESHOLDS = [
        'despertar_juizo_1' => 1,
        'despertar_juizo_5' => 5,
        'despertar_juizo_10' => 10,
        'despertar_juizo_25' => 25,
    ];

    public const JUIZO_STREAK_MILESTONES = [
        ['id' => 's5', 'streak' => 5, 'verdicts' => 1],
        ['id' => 's10', 'streak' => 10, 'verdicts' => 2],
        ['id' => 's15', 'streak' => 15, 'verdicts' => 3],
        ['id' => 's20', 'streak' => 20, 'verdicts' => 4],
        ['id' => 's25', 'streak' => 25, 'verdicts' => 5],
        ['id' => 's40', 'streak' => 40, 'verdicts' => 8],
        ['id' => 's60', 'streak' => 60, 'verdicts' => 12],
        ['id' => 's100', 'streak' => 100, 'verdicts' => 20],
    ];

    public const JUIZO_RATING_ORDER = ['L', '6', '10', '12', '14', '16', '18'];

    public const CLASSIND_SHARED_COVERS = [
        'animal-crossing-new-horizons.webp' => true,
        'blasphemous.webp' => true,
        'call-of-duty-black-ops.webp' => true,
        'celeste.webp' => true,
        'crimson-desert.webp' => true,
        'cuphead.webp' => true,
        'doom-eternal.webp' => true,
        'five-nights-at-freddys.webp' => true,
        'god-of-war-2005.webp' => true,
        'god-of-war-2.webp' => true,
        'god-of-war-3.webp' => true,
        'god-of-war-ragnarok.webp' => true,
        'gta-6.webp' => true,
        'gta-san-andreas.webp' => true,
        'hollow-knight.webp' => true,
        'hotline-miami.webp' => true,
        'marvel-rivals.webp' => true,
        'mortal-kombat-11.webp' => true,
        'resident-evil-village.webp' => true,
        'silent-hill-2-2024.webp' => true,
        'street-fighter-6.webp' => true,
        'supermarket-simulator.webp' => true,
        'the-simpsons-hit-and-run.webp' => true,
        'the-sims-4.webp' => true,
        'undertale.webp' => true,
        'vampire-survivors.webp' => true,
        'wuthering-waves.webp' => true,
    ];

    /** @var array<string, array<string, mixed>>|null */
    private static ?array $generatorsById = null;
    /** @var array<string, array<string, mixed>>|null */
    private static ?array $upgradesById = null;
    /** @var array<string, array<string, mixed>>|null */
    private static ?array $shimmersById = null;
    /** @var array<int, array<string, mixed>>|null */
    private static ?array $juizoPool = null;

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function generatorsById(): array
    {
        if (self::$generatorsById === null) {
            self::$generatorsById = [];
            foreach (self::GENERATORS as $g) {
                self::$generatorsById[$g['id']] = $g;
            }
        }
        return self::$generatorsById;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function upgradesById(): array
    {
        if (self::$upgradesById === null) {
            self::$upgradesById = [];
            foreach (self::UPGRADES as $u) {
                self::$upgradesById[$u['id']] = $u;
            }
        }
        return self::$upgradesById;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function shimmersById(): array
    {
        if (self::$shimmersById === null) {
            self::$shimmersById = [];
            foreach (self::SHIMMER_EFFECTS as $s) {
                self::$shimmersById[$s['id']] = $s;
            }
        }
        return self::$shimmersById;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function getJuizoReadyPool(): array
    {
        if (self::$juizoPool !== null) {
            return self::$juizoPool;
        }
        $root = defined('FJD_ROOT') ? FJD_ROOT : dirname(__DIR__, 3);
        $path = $root . '/data/despertar-juizo-pool.stub.json';
        if (!is_file($path)) {
            self::$juizoPool = [];
            return [];
        }
        $raw = @file_get_contents($path);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        $games = is_array($decoded['games'] ?? null) ? $decoded['games'] : [];
        $validRatings = array_flip(self::JUIZO_RATING_ORDER);

        $ready = [];
        foreach ($games as $g) {
            if (!is_array($g) || empty($g['id']) || empty($g['title'])) {
                continue;
            }
            $rating = isset($g['rating']) ? (string) $g['rating'] : '';
            if ($rating === '' || !isset($validRatings[$rating])) {
                continue;
            }
            $id = (string) $g['id'];
            $ready[] = [
                'id' => $id,
                'title' => (string) $g['title'],
                'rating' => $rating,
                'blurb' => isset($g['blurb']) && is_string($g['blurb']) ? $g['blurb'] : '',
                'cover' => isset($g['cover']) && is_string($g['cover']) ? $g['cover'] : "{$id}.webp",
                'descriptors' => is_array($g['descriptors'] ?? null)
                    ? array_values(array_map('strval', $g['descriptors']))
                    : [],
                'source' => isset($g['source']) ? (string) $g['source'] : 'stub',
            ];
        }
        self::$juizoPool = $ready;
        return self::$juizoPool;
    }

    public static function resolveJuizoCoverUrl(string $cover): string
    {
        $file = trim($cover);
        if ($file === '' || $file === 'no-image.webp') {
            return '/assets/despertar-juizo/covers/no-image.webp';
        }
        if (isset(self::CLASSIND_SHARED_COVERS[$file])) {
            return "/assets/classind-dle/covers/{$file}";
        }
        return "/assets/despertar-juizo/covers/{$file}";
    }

    /**
     * @param array<string, mixed>|null $game
     * @return array<string, mixed>|null
     */
    public static function toPublicJuizoCard(?array $game): ?array
    {
        if (!$game) {
            return null;
        }
        return [
            'id' => (string) $game['id'],
            'title' => (string) $game['title'],
            'blurb' => (string) ($game['blurb'] ?? ''),
            'cover' => (string) $game['cover'],
            'coverUrl' => self::resolveJuizoCoverUrl((string) $game['cover']),
            'descriptors' => array_values($game['descriptors'] ?? []),
        ];
    }
}
