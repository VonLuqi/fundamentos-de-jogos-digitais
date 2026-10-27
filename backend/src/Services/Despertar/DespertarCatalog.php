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

    // --- Fase F6 (Catábase das Avós / Grandmapocalypse + Sanguessugas do Acheron / Wrinklers) ---
    public const CATABASE_UNLOCK_SERVANTS = 7;
    public const CATABASE_RESEARCH_DURATION_SEC = 1800;
    public const CATABASE_PLEDGE_DURATION_SEC = 1800;
    public const CATABASE_PLEDGE_MAX_STEP = 12;
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

        // --- Fase F4: Linhagem Filhotes do Cérbero (Kitten Upgrades / Véu do Acheron) ---
        ['id' => 'filhote_vigia_estige', 'cost' => '9000000', 'kind' => 'veilMult', 'factor' => '0.1', 'requires' => ['minVeilPercent' => 52]],
        ['id' => 'filhote_rastreador_asfodelos', 'cost' => '9000000000', 'kind' => 'veilMult', 'factor' => '0.125', 'requires' => ['minVeilPercent' => 100]],
        ['id' => 'filhote_forjador_phlegethon', 'cost' => '90000000000000', 'kind' => 'veilMult', 'factor' => '0.15', 'requires' => ['minVeilPercent' => 200]],
        ['id' => 'filhote_supervisor_tartaro', 'cost' => '90000000000000000', 'kind' => 'veilMult', 'factor' => '0.175', 'requires' => ['minVeilPercent' => 300]],
        ['id' => 'filhote_intendente_erebo', 'cost' => '90000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 400]],
        ['id' => 'filhote_arauto_lethe', 'cost' => '90000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 500]],
        ['id' => 'cerbero_conselheiro_tartaro', 'cost' => '90000000000000000000000000', 'kind' => 'veilMult', 'factor' => '0.2', 'requires' => ['minVeilPercent' => 600]],

        // --- Fase F6: Centro de Pesquisa Estígio & Catábase das Avós (Grandmapocalypse + Wrinklers) ---
        ['id' => 'concilio_das_moiras', 'cost' => '1000000000', 'kind' => 'catabaseResearch', 'factor' => '1', 'generatorId' => 'charon_servants', 'generatorFactor' => '4', 'setsCatabaseStage' => 0, 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 7]],
        ['id' => 'soro_estigio', 'cost' => '4000000000', 'kind' => 'catabaseResearch', 'factor' => '1.01', 'setsCatabaseStage' => 0, 'requires' => ['upgradeId' => 'concilio_das_moiras', 'researchId' => 'soro_estigio']],
        ['id' => 'despertar_ctoniano', 'cost' => '16000000000', 'kind' => 'catabaseResearch', 'factor' => '1.02', 'setsCatabaseStage' => 1, 'requires' => ['upgradeId' => 'soro_estigio', 'researchId' => 'despertar_ctoniano']],
        ['id' => 'sinapse_espectral', 'cost' => '64000000000', 'kind' => 'catabaseResearch', 'factor' => '1.03', 'generatorId' => 'charon_servants', 'generatorFactor' => '2', 'setsCatabaseStage' => 1, 'requires' => ['upgradeId' => 'despertar_ctoniano', 'researchId' => 'sinapse_espectral']],
        ['id' => 'comunhao_abissal', 'cost' => '256000000000', 'kind' => 'catabaseResearch', 'factor' => '1.04', 'setsCatabaseStage' => 2, 'requires' => ['upgradeId' => 'sinapse_espectral', 'researchId' => 'comunhao_abissal']],
        ['id' => 'pacto_primordial', 'cost' => '1024000000000', 'kind' => 'catabaseResearch', 'factor' => '1.05', 'setsCatabaseStage' => 3, 'elderPactBonusPerNonServant' => '0.05', 'requires' => ['upgradeId' => 'comunhao_abissal', 'researchId' => 'pacto_primordial']],
        ['id' => 'ninho_do_acheron', 'cost' => '500000000000', 'kind' => 'leechCap', 'factor' => '4', 'requires' => ['upgradeId' => 'despertar_ctoniano']],
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
    ];

    /** Rio do Lethe — costs + requires (talentIds) for ascension gate. */
    public const TALENTS = [
        'memoria_das_sombras' => ['id' => 'memoria_das_sombras', 'cost' => '1', 'branch' => 'margem', 'ring' => 0, 'angle' => -95, 'requires' => [], 'effects' => ['startingSouls' => '5000']],
        'foice_ancestral' => ['id' => 'foice_ancestral', 'cost' => '15', 'branch' => 'margem', 'ring' => 1, 'angle' => -115, 'requires' => ['memoria_das_sombras'], 'effects' => ['kSps' => '0.01']],
        'margem_generosa' => ['id' => 'margem_generosa', 'cost' => '15', 'branch' => 'margem', 'ring' => 1, 'angle' => -75, 'requires' => ['memoria_das_sombras'], 'effects' => ['startingSouls' => '25000']],
        'preludio_ctoniano' => ['id' => 'preludio_ctoniano', 'cost' => '100', 'branch' => 'margem', 'ring' => 2, 'angle' => -95, 'requires' => ['memoria_das_sombras'], 'effects' => ['startingSouls' => '15000']],
        'segundo_folego' => ['id' => 'segundo_folego', 'cost' => '125', 'branch' => 'margem', 'ring' => 2, 'angle' => -70, 'requires' => ['margem_generosa'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 5]],
        'lamina_viva' => ['id' => 'lamina_viva', 'cost' => '125', 'branch' => 'margem', 'ring' => 2, 'angle' => -120, 'requires' => ['foice_ancestral'], 'effects' => ['startingSouls' => '50000']],
        'rebanho_despertado' => ['id' => 'rebanho_despertado', 'cost' => '500', 'branch' => 'margem', 'ring' => 3, 'angle' => -65, 'requires' => ['segundo_folego'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 25]],
        'mare_inicial' => ['id' => 'mare_inicial', 'cost' => '700', 'branch' => 'margem', 'ring' => 3, 'angle' => -105, 'requires' => ['preludio_ctoniano', 'foice_ancestral'], 'effects' => ['startingSouls' => '75000']],
        'torrente_das_umbras' => ['id' => 'torrente_das_umbras', 'cost' => '5000', 'branch' => 'margem', 'ring' => 4, 'angle' => -85, 'requires' => ['rebanho_despertado', 'lamina_viva'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 50]],
        'favor_de_caronte' => ['id' => 'favor_de_caronte', 'cost' => '3', 'branch' => 'imperio', 'ring' => 0, 'angle' => 0, 'requires' => [], 'effects' => ['generatorCostMult' => '0.85']],
        'olho_da_curva' => ['id' => 'olho_da_curva', 'cost' => '20', 'branch' => 'imperio', 'ring' => 1, 'angle' => -27.59, 'requires' => ['favor_de_caronte'], 'effects' => ['richAmort' => true]],
        'nectar_em_reserva' => ['id' => 'nectar_em_reserva', 'cost' => '25', 'branch' => 'imperio', 'ring' => 1, 'angle' => 27.59, 'requires' => ['favor_de_caronte'], 'effects' => ['nectarReserveBonus' => true]],
        'servo_das_margens' => ['id' => 'servo_das_margens', 'cost' => '20', 'branch' => 'imperio', 'ring' => 1, 'angle' => 0, 'requires' => ['favor_de_caronte'], 'effects' => ['startingGeneratorId' => 'charon_servants', 'startingGeneratorQty' => 3]],
        'matilha_cerberiana' => ['id' => 'matilha_cerberiana', 'cost' => '150', 'branch' => 'imperio', 'ring' => 2, 'angle' => -23.02, 'requires' => ['olho_da_curva'], 'effects' => ['startingGeneratorId' => 'cerberian_hound', 'startingGeneratorQty' => 3]],
        'ovo_primordial' => ['id' => 'ovo_primordial', 'cost' => '125', 'branch' => 'imperio', 'ring' => 2, 'angle' => 22, 'requires' => ['favor_de_caronte'], 'effects' => ['dragonUnlock' => true]],
        'forja_despertada' => ['id' => 'forja_despertada', 'cost' => '250', 'branch' => 'imperio', 'ring' => 2, 'angle' => -6.98, 'requires' => ['matilha_cerberiana'], 'effects' => ['startingGeneratorId' => 'phlegethon_forge', 'startingGeneratorQty' => 1]],
        'frenesi_de_nectar_talento' => ['id' => 'frenesi_de_nectar_talento', 'cost' => '800', 'branch' => 'imperio', 'ring' => 3, 'angle' => 20, 'requires' => ['nectar_em_reserva'], 'effects' => ['nectarFrenzyUnlock' => true]],
        'trono_sombrio' => ['id' => 'trono_sombrio', 'cost' => '1200', 'branch' => 'imperio', 'ring' => 3, 'angle' => -15, 'requires' => ['forja_despertada'], 'effects' => ['startingGeneratorId' => 'obsidian_throne', 'startingGeneratorQty' => 1]],
        'imperio_fluvial' => ['id' => 'imperio_fluvial', 'cost' => '7500', 'branch' => 'imperio', 'ring' => 4, 'angle' => 0, 'requires' => ['frenesi_de_nectar_talento', 'ovo_primordial'], 'effects' => ['startingGeneratorBonus' => ['cerberian_hound' => 2, 'phlegethon_forge' => 1]]],
        'juramento_eterno' => ['id' => 'juramento_eterno', 'cost' => '1', 'branch' => 'memoria', 'ring' => 0, 'angle' => 95, 'requires' => [], 'effects' => ['mnemosyneMult' => '1.25']],
        'noite_prolongada' => ['id' => 'noite_prolongada', 'cost' => '10', 'branch' => 'memoria', 'ring' => 1, 'angle' => 67.41, 'requires' => ['juramento_eterno'], 'effects' => ['offlineHours' => 12]],
        'veu_eficiente' => ['id' => 'veu_eficiente', 'cost' => '10', 'branch' => 'memoria', 'ring' => 1, 'angle' => 122.59, 'requires' => ['juramento_eterno'], 'effects' => ['offlineEfficiency' => '1.00']],
        'eco_do_styx' => ['id' => 'eco_do_styx', 'cost' => '20', 'branch' => 'memoria', 'ring' => 1, 'angle' => 95, 'requires' => ['juramento_eterno'], 'effects' => ['softPrestigeStyx' => true]],
        'pacto_do_silencio' => ['id' => 'pacto_do_silencio', 'cost' => '75', 'branch' => 'memoria', 'ring' => 2, 'angle' => 64.52, 'requires' => ['noite_prolongada'], 'effects' => ['offlineExtraHours' => 6]],
        'mnemosyne_profunda' => ['id' => 'mnemosyne_profunda', 'cost' => '125', 'branch' => 'memoria', 'ring' => 2, 'angle' => 96.6, 'requires' => ['juramento_eterno'], 'effects' => ['mnemosyneMult' => '1.50']],
        'sinergias_vol_i' => ['id' => 'sinergias_vol_i', 'cost' => '200', 'branch' => 'memoria', 'ring' => 2, 'angle' => 80.56, 'requires' => ['juramento_eterno'], 'effects' => ['synergyVolUnlock' => 1]],
        'eco_ressonante' => ['id' => 'eco_ressonante', 'cost' => '150', 'branch' => 'memoria', 'ring' => 2, 'angle' => 128.68, 'requires' => ['eco_do_styx'], 'effects' => ['softPrestigeStyxCount' => 2]],
        'rodizio_das_estacoes' => ['id' => 'rodizio_das_estacoes', 'cost' => '125', 'branch' => 'memoria', 'ring' => 2, 'angle' => 112.64, 'requires' => ['veu_eficiente'], 'effects' => ['seasonSwitcherUnlock' => true]],
        'legado_do_rio' => ['id' => 'legado_do_rio', 'cost' => '600', 'branch' => 'memoria', 'ring' => 3, 'angle' => 80, 'requires' => ['pacto_do_silencio', 'veu_eficiente'], 'effects' => ['offlineExtraHours' => 4]],
        'calice_da_memoria' => ['id' => 'calice_da_memoria', 'cost' => '700', 'branch' => 'memoria', 'ring' => 3, 'angle' => 94.34, 'requires' => ['mnemosyne_profunda'], 'effects' => ['mnemosyneGainMult' => '1.5']],
        'eco_ancestral_iii' => ['id' => 'eco_ancestral_iii', 'cost' => '900', 'branch' => 'memoria', 'ring' => 3, 'angle' => 125, 'requires' => ['eco_ressonante'], 'effects' => ['softPrestigeStyxCount' => 3]],
        'mnemosyne_tripla' => ['id' => 'mnemosyne_tripla', 'cost' => '800', 'branch' => 'memoria', 'ring' => 3, 'angle' => 105.66, 'requires' => ['calice_da_memoria'], 'effects' => ['mnemosyneMult' => '2']],
        'eco_ancestral_iv' => ['id' => 'eco_ancestral_iv', 'cost' => '6000', 'branch' => 'memoria', 'ring' => 4, 'angle' => 120, 'requires' => ['eco_ancestral_iii'], 'effects' => ['softPrestigeStyxCount' => 4]],
        'eco_ancestral_v' => ['id' => 'eco_ancestral_v', 'cost' => '7500', 'branch' => 'memoria', 'ring' => 4, 'angle' => 130, 'requires' => ['eco_ancestral_iv'], 'effects' => ['softPrestigeStyxCount' => 5]],
        'mnemosyne_raiz' => ['id' => 'mnemosyne_raiz', 'cost' => '10000', 'branch' => 'memoria', 'ring' => 4, 'angle' => 100, 'requires' => ['mnemosyne_tripla', 'calice_da_memoria'], 'effects' => ['mnemosyneMult' => '2.5']],
        'foice_afilada_rio' => ['id' => 'foice_afilada_rio', 'cost' => '1800', 'branch' => 'margem', 'ring' => 3, 'angle' => -125, 'requires' => ['lamina_viva'], 'effects' => ['kSps' => '0.02']],
        'almas_centenas' => ['id' => 'almas_centenas', 'cost' => '11000', 'branch' => 'margem', 'ring' => 4, 'angle' => -110, 'requires' => ['mare_inicial'], 'effects' => ['startingSouls' => '100000']],
        'sombra_centuria' => ['id' => 'sombra_centuria', 'cost' => '70000', 'branch' => 'margem', 'ring' => 5, 'angle' => -80, 'requires' => ['torrente_das_umbras'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 100]],
        'foice_profunda' => ['id' => 'foice_profunda', 'cost' => '80000', 'branch' => 'margem', 'ring' => 5, 'angle' => -120, 'requires' => ['foice_afilada_rio'], 'effects' => ['kSps' => '0.05']],
        'almas_milhao' => ['id' => 'almas_milhao', 'cost' => '90000', 'branch' => 'margem', 'ring' => 5, 'angle' => -100, 'requires' => ['almas_centenas'], 'effects' => ['startingSouls' => '1000000']],
        'eco_da_foice_rio' => ['id' => 'eco_da_foice_rio', 'cost' => '100000', 'branch' => 'margem', 'ring' => 5, 'angle' => -130, 'requires' => ['foice_profunda'], 'effects' => ['startingSouls' => '250000']],
        'legiao_das_umbras' => ['id' => 'legiao_das_umbras', 'cost' => '700000', 'branch' => 'margem', 'ring' => 6, 'angle' => -75, 'requires' => ['sombra_centuria'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 200]],
        'foice_voraz' => ['id' => 'foice_voraz', 'cost' => '750000', 'branch' => 'margem', 'ring' => 6, 'angle' => -118, 'requires' => ['foice_profunda'], 'effects' => ['kSps' => '0.08']],
        'almas_dezena_milhao' => ['id' => 'almas_dezena_milhao', 'cost' => '800000', 'branch' => 'margem', 'ring' => 6, 'angle' => -98, 'requires' => ['almas_milhao'], 'effects' => ['startingSouls' => '10000000']],
        'preludio_eterno' => ['id' => 'preludio_eterno', 'cost' => '650000', 'branch' => 'margem', 'ring' => 6, 'angle' => -88, 'requires' => ['almas_milhao', 'preludio_ctoniano'], 'effects' => ['startingSouls' => '5000000']],
        'margem_abundante' => ['id' => 'margem_abundante', 'cost' => '6000000', 'branch' => 'margem', 'ring' => 7, 'angle' => -95, 'requires' => ['almas_dezena_milhao'], 'effects' => ['startingSouls' => '50000000']],
        'sombra_mil' => ['id' => 'sombra_mil', 'cost' => '7000000', 'branch' => 'margem', 'ring' => 7, 'angle' => -70, 'requires' => ['legiao_das_umbras'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 1000]],
        'foice_absoluta' => ['id' => 'foice_absoluta', 'cost' => '7500000', 'branch' => 'margem', 'ring' => 7, 'angle' => -122, 'requires' => ['foice_voraz'], 'effects' => ['kSps' => '0.12']],
        'almas_cem_milhao' => ['id' => 'almas_cem_milhao', 'cost' => '44000000', 'branch' => 'margem', 'ring' => 8, 'angle' => -100, 'requires' => ['margem_abundante'], 'effects' => ['startingSouls' => '100000000']],
        'torrente_eterna' => ['id' => 'torrente_eterna', 'cost' => '50000000', 'branch' => 'margem', 'ring' => 8, 'angle' => -72, 'requires' => ['sombra_mil'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 2000]],
        'corte_do_abismo' => ['id' => 'corte_do_abismo', 'cost' => '56000000', 'branch' => 'margem', 'ring' => 8, 'angle' => -125, 'requires' => ['foice_absoluta'], 'effects' => ['kSps' => '0.15']],
        'mare_titanica' => ['id' => 'mare_titanica', 'cost' => '350000000', 'branch' => 'margem', 'ring' => 9, 'angle' => -98, 'requires' => ['almas_cem_milhao'], 'effects' => ['startingSouls' => '500000000']],
        'umbras_infinitas' => ['id' => 'umbras_infinitas', 'cost' => '380000000', 'branch' => 'margem', 'ring' => 9, 'angle' => -68, 'requires' => ['torrente_eterna'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 5000]],
        'foice_do_lethe' => ['id' => 'foice_do_lethe', 'cost' => '400000000', 'branch' => 'margem', 'ring' => 9, 'angle' => -128, 'requires' => ['corte_do_abismo'], 'effects' => ['kSps' => '0.20']],
        'raiz_da_margem' => ['id' => 'raiz_da_margem', 'cost' => '4000000000', 'branch' => 'margem', 'ring' => 10, 'angle' => -100, 'requires' => ['mare_titanica', 'foice_do_lethe'], 'effects' => ['startingSouls' => '1000000000']],
        'abismo_das_sombras' => ['id' => 'abismo_das_sombras', 'cost' => '5000000000', 'branch' => 'margem', 'ring' => 10, 'angle' => -70, 'requires' => ['umbras_infinitas'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 10000]],
        'lamina_do_esquecimento' => ['id' => 'lamina_do_esquecimento', 'cost' => '6000000000', 'branch' => 'margem', 'ring' => 10, 'angle' => -130, 'requires' => ['foice_do_lethe'], 'effects' => ['kSps' => '0.25']],
        'coroa_da_margem' => ['id' => 'coroa_da_margem', 'cost' => '40000000000', 'branch' => 'margem', 'ring' => 11, 'angle' => -95, 'requires' => ['raiz_da_margem', 'abismo_das_sombras'], 'effects' => ['startingSouls' => '5000000000']],
        'ceifa_absoluta' => ['id' => 'ceifa_absoluta', 'cost' => '50000000000', 'branch' => 'margem', 'ring' => 11, 'angle' => -125, 'requires' => ['lamina_do_esquecimento', 'raiz_da_margem'], 'effects' => ['kSps' => '0.30']],
        'legiao_final' => ['id' => 'legiao_final', 'cost' => '50000000000', 'branch' => 'margem', 'ring' => 11, 'angle' => -72, 'requires' => ['abismo_das_sombras', 'ceifa_absoluta'], 'effects' => ['startingGeneratorId' => 'wandering_shade', 'startingGeneratorQty' => 25000]],
        'pacto_barato' => ['id' => 'pacto_barato', 'cost' => '2500', 'branch' => 'imperio', 'ring' => 3, 'angle' => 8, 'requires' => ['favor_de_caronte', 'olho_da_curva'], 'effects' => ['generatorCostMult' => '0.75']],
        'juizes_iniciais' => ['id' => 'juizes_iniciais', 'cost' => '15000', 'branch' => 'imperio', 'ring' => 4, 'angle' => -20, 'requires' => ['trono_sombrio'], 'effects' => ['startingGeneratorId' => 'tartarus_judge', 'startingGeneratorQty' => 2]],
        'templo_inicial' => ['id' => 'templo_inicial', 'cost' => '20000', 'branch' => 'imperio', 'ring' => 4, 'angle' => 15, 'requires' => ['imperio_fluvial'], 'effects' => ['startingGeneratorId' => 'mnemosyne_temple', 'startingGeneratorQty' => 1]],
        'desconto_profundo' => ['id' => 'desconto_profundo', 'cost' => '110000', 'branch' => 'imperio', 'ring' => 5, 'angle' => 5, 'requires' => ['pacto_barato'], 'effects' => ['generatorCostMult' => '0.60']],
        'matilha_ampliada' => ['id' => 'matilha_ampliada', 'cost' => '100000', 'branch' => 'imperio', 'ring' => 5, 'angle' => -25, 'requires' => ['matilha_cerberiana', 'imperio_fluvial'], 'effects' => ['startingGeneratorId' => 'cerberian_hound', 'startingGeneratorQty' => 8]],
        'forja_dupla' => ['id' => 'forja_dupla', 'cost' => '120000', 'branch' => 'imperio', 'ring' => 5, 'angle' => -4.94, 'requires' => ['forja_despertada', 'imperio_fluvial'], 'effects' => ['startingGeneratorId' => 'phlegethon_forge', 'startingGeneratorQty' => 3]],
        'torre_do_styx_start' => ['id' => 'torre_do_styx_start', 'cost' => '140000', 'branch' => 'imperio', 'ring' => 5, 'angle' => 22, 'requires' => ['templo_inicial'], 'effects' => ['startingGeneratorId' => 'styx_tower', 'startingGeneratorQty' => 1]],
        'servos_dobrados' => ['id' => 'servos_dobrados', 'cost' => '90000', 'branch' => 'imperio', 'ring' => 5, 'angle' => -12.06, 'requires' => ['servo_das_margens', 'pacto_barato'], 'effects' => ['startingGeneratorId' => 'charon_servants', 'startingGeneratorQty' => 10]],
        'trono_reforcado' => ['id' => 'trono_reforcado', 'cost' => '900000', 'branch' => 'imperio', 'ring' => 6, 'angle' => -18, 'requires' => ['trono_sombrio', 'desconto_profundo'], 'effects' => ['startingGeneratorId' => 'obsidian_throne', 'startingGeneratorQty' => 3]],
        'barganha_abissal' => ['id' => 'barganha_abissal', 'cost' => '1000000', 'branch' => 'imperio', 'ring' => 6, 'angle' => 0, 'requires' => ['desconto_profundo'], 'effects' => ['generatorCostMult' => '0.50']],
        'barco_estelar_start' => ['id' => 'barco_estelar_start', 'cost' => '1100000', 'branch' => 'imperio', 'ring' => 6, 'angle' => 20, 'requires' => ['torre_do_styx_start'], 'effects' => ['startingGeneratorId' => 'star_barge', 'startingGeneratorQty' => 1]],
        'nectar_imperial' => ['id' => 'nectar_imperial', 'cost' => '850000', 'branch' => 'imperio', 'ring' => 6, 'angle' => 28, 'requires' => ['frenesi_de_nectar_talento', 'desconto_profundo'], 'effects' => ['nectarReserveBonus' => true, 'nectarFrenzyUnlock' => true]],
        'lab_tartaro_start' => ['id' => 'lab_tartaro_start', 'cost' => '8000000', 'branch' => 'imperio', 'ring' => 7, 'angle' => 18, 'requires' => ['barco_estelar_start'], 'effects' => ['startingGeneratorId' => 'tartarus_lab', 'startingGeneratorQty' => 1]],
        'matilha_imperial' => ['id' => 'matilha_imperial', 'cost' => '7500000', 'branch' => 'imperio', 'ring' => 7, 'angle' => -28, 'requires' => ['matilha_ampliada'], 'effects' => ['startingGeneratorId' => 'cerberian_hound', 'startingGeneratorQty' => 20]],
        'forja_imperial' => ['id' => 'forja_imperial', 'cost' => '8500000', 'branch' => 'imperio', 'ring' => 7, 'angle' => -8, 'requires' => ['forja_dupla', 'barganha_abissal'], 'effects' => ['startingGeneratorId' => 'phlegethon_forge', 'startingGeneratorQty' => 8]],
        'portal_erebus_start' => ['id' => 'portal_erebus_start', 'cost' => '50000000', 'branch' => 'imperio', 'ring' => 8, 'angle' => 16, 'requires' => ['lab_tartaro_start'], 'effects' => ['startingGeneratorId' => 'erebus_portal', 'startingGeneratorQty' => 1]],
        'desconto_absoluto' => ['id' => 'desconto_absoluto', 'cost' => '56000000', 'branch' => 'imperio', 'ring' => 8, 'angle' => 0, 'requires' => ['barganha_abissal'], 'effects' => ['generatorCostMult' => '0.40']],
        'tear_chronos_start' => ['id' => 'tear_chronos_start', 'cost' => '64000000', 'branch' => 'imperio', 'ring' => 8, 'angle' => 24, 'requires' => ['portal_erebus_start'], 'effects' => ['startingGeneratorId' => 'chronos_loom', 'startingGeneratorQty' => 1]],
        'trono_imperial' => ['id' => 'trono_imperial', 'cost' => '60000000', 'branch' => 'imperio', 'ring' => 8, 'angle' => -20, 'requires' => ['trono_reforcado', 'desconto_absoluto'], 'effects' => ['startingGeneratorId' => 'obsidian_throne', 'startingGeneratorQty' => 10]],
        'condensador_start' => ['id' => 'condensador_start', 'cost' => '450000000', 'branch' => 'imperio', 'ring' => 9, 'angle' => 14, 'requires' => ['tear_chronos_start'], 'effects' => ['startingGeneratorId' => 'void_condenser', 'startingGeneratorQty' => 1]],
        'pacto_do_abismo' => ['id' => 'pacto_do_abismo', 'cost' => '500000000', 'branch' => 'imperio', 'ring' => 9, 'angle' => -2, 'requires' => ['desconto_absoluto'], 'effects' => ['generatorCostMult' => '0.30']],
        'prisma_start' => ['id' => 'prisma_start', 'cost' => '600000000', 'branch' => 'imperio', 'ring' => 9, 'angle' => 22, 'requires' => ['condensador_start'], 'effects' => ['startingGeneratorId' => 'moirai_prism', 'startingGeneratorQty' => 1]],
        'imperio_do_abismo' => ['id' => 'imperio_do_abismo', 'cost' => '4500000000', 'branch' => 'imperio', 'ring' => 10, 'angle' => -15, 'requires' => ['matilha_imperial', 'forja_imperial', 'pacto_do_abismo'], 'effects' => ['startingGeneratorBonus' => ['cerberian_hound' => 5, 'phlegethon_forge' => 3]]],
        'forja_do_destino' => ['id' => 'forja_do_destino', 'cost' => '5500000000', 'branch' => 'imperio', 'ring' => 10, 'angle' => 18, 'requires' => ['prisma_start'], 'effects' => ['startingGeneratorId' => 'fate_forge', 'startingGeneratorQty' => 1]],
        'mercado_do_lethe' => ['id' => 'mercado_do_lethe', 'cost' => '7500000000', 'branch' => 'imperio', 'ring' => 10, 'angle' => 0, 'requires' => ['pacto_do_abismo', 'imperio_do_abismo'], 'effects' => ['generatorCostMult' => '0.25']],
        'coroa_do_imperio' => ['id' => 'coroa_do_imperio', 'cost' => '40000000000', 'branch' => 'imperio', 'ring' => 11, 'angle' => 8, 'requires' => ['forja_do_destino', 'mercado_do_lethe'], 'effects' => ['startingGeneratorId' => 'fractal_engine', 'startingGeneratorQty' => 1]],
        'trono_do_esquecimento' => ['id' => 'trono_do_esquecimento', 'cost' => '44000000000', 'branch' => 'imperio', 'ring' => 11, 'angle' => -22, 'requires' => ['trono_imperial', 'coroa_do_imperio'], 'effects' => ['startingGeneratorId' => 'obsidian_throne', 'startingGeneratorQty' => 25]],
        'dragao_coroado' => ['id' => 'dragao_coroado', 'cost' => '36000000000', 'branch' => 'imperio', 'ring' => 11, 'angle' => 28, 'requires' => ['ovo_primordial', 'mercado_do_lethe'], 'effects' => ['dragonUnlock' => true, 'generatorCostMult' => '0.25']],
        'sinergias_vol_ii' => ['id' => 'sinergias_vol_ii', 'cost' => '12500', 'branch' => 'memoria', 'ring' => 4, 'angle' => 88, 'requires' => ['sinergias_vol_i'], 'effects' => ['synergyVolUnlock' => 2]],
        'noite_profunda' => ['id' => 'noite_profunda', 'cost' => '14000', 'branch' => 'memoria', 'ring' => 4, 'angle' => 72, 'requires' => ['legado_do_rio'], 'effects' => ['offlineExtraHours' => 8]],
        'eco_ancestral_vi' => ['id' => 'eco_ancestral_vi', 'cost' => '70000', 'branch' => 'memoria', 'ring' => 5, 'angle' => 128, 'requires' => ['eco_ancestral_v'], 'effects' => ['softPrestigeStyxCount' => 6]],
        'mnemosyne_quintupla' => ['id' => 'mnemosyne_quintupla', 'cost' => '80000', 'branch' => 'memoria', 'ring' => 5, 'angle' => 100, 'requires' => ['mnemosyne_raiz'], 'effects' => ['mnemosyneMult' => '3']],
        'calice_dourado' => ['id' => 'calice_dourado', 'cost' => '100000', 'branch' => 'memoria', 'ring' => 5, 'angle' => 90, 'requires' => ['calice_da_memoria', 'mnemosyne_raiz'], 'effects' => ['mnemosyneGainMult' => '2']],
        'silencio_eterno' => ['id' => 'silencio_eterno', 'cost' => '90000', 'branch' => 'memoria', 'ring' => 5, 'angle' => 68, 'requires' => ['noite_profunda'], 'effects' => ['offlineExtraHours' => 8]],
        'eco_ancestral_vii' => ['id' => 'eco_ancestral_vii', 'cost' => '700000', 'branch' => 'memoria', 'ring' => 6, 'angle' => 132, 'requires' => ['eco_ancestral_vi'], 'effects' => ['softPrestigeStyxCount' => 7]],
        'mnemosyne_sestupla' => ['id' => 'mnemosyne_sestupla', 'cost' => '800000', 'branch' => 'memoria', 'ring' => 6, 'angle' => 102, 'requires' => ['mnemosyne_quintupla'], 'effects' => ['mnemosyneMult' => '4']],
        'legado_profundo' => ['id' => 'legado_profundo', 'cost' => '750000', 'branch' => 'memoria', 'ring' => 6, 'angle' => 78, 'requires' => ['silencio_eterno', 'legado_do_rio'], 'effects' => ['offlineExtraHours' => 10]],
        'veu_absoluto' => ['id' => 'veu_absoluto', 'cost' => '600000', 'branch' => 'memoria', 'ring' => 6, 'angle' => 115, 'requires' => ['veu_eficiente', 'noite_profunda'], 'effects' => ['offlineEfficiency' => '1.00']],
        'eco_ancestral_viii' => ['id' => 'eco_ancestral_viii', 'cost' => '6000000', 'branch' => 'memoria', 'ring' => 7, 'angle' => 135, 'requires' => ['eco_ancestral_vii'], 'effects' => ['softPrestigeStyxCount' => 8]],
        'mnemosyne_setupla' => ['id' => 'mnemosyne_setupla', 'cost' => '7000000', 'branch' => 'memoria', 'ring' => 7, 'angle' => 98, 'requires' => ['mnemosyne_sestupla'], 'effects' => ['mnemosyneMult' => '5']],
        'calice_abissal' => ['id' => 'calice_abissal', 'cost' => '8000000', 'branch' => 'memoria', 'ring' => 7, 'angle' => 88, 'requires' => ['calice_dourado'], 'effects' => ['mnemosyneGainMult' => '2.5']],
        'noite_abissal' => ['id' => 'noite_abissal', 'cost' => '7500000', 'branch' => 'memoria', 'ring' => 7, 'angle' => 70, 'requires' => ['legado_profundo'], 'effects' => ['offlineExtraHours' => 16]],
        'eco_ancestral_ix' => ['id' => 'eco_ancestral_ix', 'cost' => '44000000', 'branch' => 'memoria', 'ring' => 8, 'angle' => 138, 'requires' => ['eco_ancestral_viii'], 'effects' => ['softPrestigeStyxCount' => 9]],
        'mnemosyne_octupla' => ['id' => 'mnemosyne_octupla', 'cost' => '52000000', 'branch' => 'memoria', 'ring' => 8, 'angle' => 100, 'requires' => ['mnemosyne_setupla'], 'effects' => ['mnemosyneMult' => '6']],
        'memoria_viva' => ['id' => 'memoria_viva', 'cost' => '48000000', 'branch' => 'memoria', 'ring' => 8, 'angle' => 75, 'requires' => ['noite_abissal'], 'effects' => ['offlineExtraHours' => 12]],
        'eco_ancestral_x' => ['id' => 'eco_ancestral_x', 'cost' => '350000000', 'branch' => 'memoria', 'ring' => 9, 'angle' => 140, 'requires' => ['eco_ancestral_ix'], 'effects' => ['softPrestigeStyxCount' => 10]],
        'mnemosyne_nonupla' => ['id' => 'mnemosyne_nonupla', 'cost' => '400000000', 'branch' => 'memoria', 'ring' => 9, 'angle' => 102, 'requires' => ['mnemosyne_octupla'], 'effects' => ['mnemosyneMult' => '8']],
        'calice_do_esquecimento' => ['id' => 'calice_do_esquecimento', 'cost' => '380000000', 'branch' => 'memoria', 'ring' => 9, 'angle' => 88, 'requires' => ['calice_abissal', 'mnemosyne_octupla'], 'effects' => ['mnemosyneGainMult' => '3']],
        'raiz_da_memoria' => ['id' => 'raiz_da_memoria', 'cost' => '4500000000', 'branch' => 'memoria', 'ring' => 10, 'angle' => 100, 'requires' => ['mnemosyne_nonupla', 'calice_do_esquecimento'], 'effects' => ['mnemosyneMult' => '10']],
        'eco_infinito' => ['id' => 'eco_infinito', 'cost' => '5000000000', 'branch' => 'memoria', 'ring' => 10, 'angle' => 135, 'requires' => ['eco_ancestral_x'], 'effects' => ['softPrestigeStyxCount' => 12]],
        'noite_do_lethe' => ['id' => 'noite_do_lethe', 'cost' => '5500000000', 'branch' => 'memoria', 'ring' => 10, 'angle' => 72, 'requires' => ['memoria_viva', 'noite_abissal'], 'effects' => ['offlineExtraHours' => 24]],
        'coroa_da_memoria' => ['id' => 'coroa_da_memoria', 'cost' => '40000000000', 'branch' => 'memoria', 'ring' => 11, 'angle' => 98, 'requires' => ['raiz_da_memoria', 'eco_infinito'], 'effects' => ['mnemosyneMult' => '15']],
        'calice_final' => ['id' => 'calice_final', 'cost' => '44000000000', 'branch' => 'memoria', 'ring' => 11, 'angle' => 85, 'requires' => ['calice_do_esquecimento', 'raiz_da_memoria'], 'effects' => ['mnemosyneGainMult' => '5']],
        'eco_do_abismo' => ['id' => 'eco_do_abismo', 'cost' => '50000000000', 'branch' => 'memoria', 'ring' => 11, 'angle' => 140, 'requires' => ['eco_infinito', 'coroa_da_memoria'], 'effects' => ['softPrestigeStyxCount' => 15]],
    ];

        public const LEGACY_SYNERGY_COSTS = [
        'cortejo_das_margens_i' => '150000',
        'cortejo_das_margens_ii' => '1500000000',
        'brasa_cruzada_i' => '2100000000',
        'brasa_cruzada_ii' => '21000000000000',
        'guardiao_dos_umbrais_i' => '300000000',
        'guardiao_dos_umbrais_ii' => '3000000000000',
        'jurisprudencia_arcana_i' => '4950000000',
        'jurisprudencia_arcana_ii' => '49500000000000',
        'alquimia_estelar_i' => '1125000000000',
        'alquimia_estelar_ii' => '11250000000000000',
        'trama_do_erebo_i' => '210000000000000',
        'trama_do_erebo_ii' => '2100000000000000000',
        'refracao_do_vazio_i' => '31500000000000000',
        'refracao_do_vazio_ii' => '315000000000000000000',
        'geometria_do_acaso_i' => '4650000000000000000',
        'geometria_do_acaso_ii' => '46500000000000000000000',
        'compilacao_multiversal_i' => '180000000000000000000000',
        'compilacao_multiversal_ii' => '1800000000000000000000000000',
        'soberania_psiquica_i' => '8100000000000000000000000000',
        'soberania_psiquica_ii' => '81000000000000000000000000000000',
    ];

    public const LEGACY_TALENT_COSTS = [
        'memoria_das_sombras' => '1',
        'juramento_eterno' => '1',
        'noite_prolongada' => '2',
        'veu_eficiente' => '2',
        'foice_ancestral' => '3',
        'favor_de_caronte' => '3',
        'mnemosyne_profunda' => '5',
        'segundo_folego' => '5',
        'margem_generosa' => '3',
        'pacto_do_silencio' => '3',
        'olho_da_curva' => '4',
        'eco_do_styx' => '4',
        'rebanho_despertado' => '5',
        'matilha_cerberiana' => '6',
        'eco_ressonante' => '6',
        'calice_da_memoria' => '7',
        'mnemosyne_tripla' => '8',
        'forja_despertada' => '10',
        'nectar_em_reserva' => '5',
        'frenesi_de_nectar_talento' => '8',
        'ovo_primordial' => '5',
        'rodizio_das_estacoes' => '5',
        'eco_ancestral_iii' => '9',
        'eco_ancestral_iv' => '12',
        'eco_ancestral_v' => '15',
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
        // --- Fase F3: Marcos de posse T7–T12 (1, 50, 100, 200) ---
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
        // --- Fase F5: Néctar do Lethe, Níveis de Gerador e 4 Minigames ---
        'despertar_nectar_primeiro',
        'despertar_nivel_1',
        'despertar_nivel_10',
        'despertar_minigame_panteao',
        'despertar_minigame_grimorio',
        'despertar_minigame_jardim',
        'despertar_minigame_mercado',
        // --- Fase F4: Véu do Acheron, Filhotes do Cérbero, SPS, Cliques, Ecos e Posse T1–T6 ---
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
        // --- Fase F6: Catábase das Avós & Sanguessugas do Acheron ---
        'despertar_catabase_avos_1',
        'despertar_catabase_avos_3',
        'despertar_sanguessuga_1',
        'despertar_sanguessuga_50',
        'despertar_sanguessuga_200',
        'despertar_sanguessuga_shiny',
        'despertar_tregua_estigia',
        // --- Fase F7: Marcos de posse T13–T20 (1, 50, 100, 200, 300) + Big-Num ---
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
        // --- Fase F8: Dragão Ctoniano, 4 Estações, Fortunas de Hermes e Venda ---
        'despertar_dragao_filhote',
        'despertar_dragao_ladao',
        'despertar_estacoes_4',
        'despertar_reliquias_sazonais',
        'despertar_rei_saturno_5',
        'despertar_fortuna_1',
        'despertar_o_fortuna',
        'despertar_mercador_acheron',
    ];

    public const DESPERTAR_GENERATOR_MILESTONE_ACHIEVEMENTS = [
        'wandering_shade' => [
            50 => 'despertar_sombra_50',
            100 => 'despertar_sombra_100',
        ],
        'charon_servants' => [
            50 => 'despertar_servos_50',
        ],
        'cerberian_hound' => [
            50 => 'despertar_cao_50',
        ],
        'tartarus_judge' => [
            50 => 'despertar_juiz_50',
        ],
        'phlegethon_forge' => [
            50 => 'despertar_forja_50',
        ],
        'obsidian_throne' => [
            50 => 'despertar_trono_50',
        ],
        'mnemosyne_temple' => [
            1 => 'despertar_templo_1',
            50 => 'despertar_templo_50',
            100 => 'despertar_templo_100',
            200 => 'despertar_templo_200',
        ],
        'styx_tower' => [
            1 => 'despertar_torre_1',
            50 => 'despertar_torre_50',
            100 => 'despertar_torre_100',
            200 => 'despertar_torre_200',
        ],
        'star_barge' => [
            1 => 'despertar_barca_1',
            50 => 'despertar_barca_50',
            100 => 'despertar_barca_100',
            200 => 'despertar_barca_200',
        ],
        'tartarus_lab' => [
            1 => 'despertar_laboratorio_1',
            50 => 'despertar_laboratorio_50',
            100 => 'despertar_laboratorio_100',
            200 => 'despertar_laboratorio_200',
        ],
        'erebus_portal' => [
            1 => 'despertar_portal_1',
            50 => 'despertar_portal_50',
            100 => 'despertar_portal_100',
            200 => 'despertar_portal_200',
        ],
        'chronos_loom' => [
            1 => 'despertar_tear_1',
            50 => 'despertar_tear_50',
            100 => 'despertar_tear_100',
            200 => 'despertar_tear_200',
        ],
        'void_condenser' => [
            1 => 'despertar_condensador_1',
            50 => 'despertar_condensador_50',
            100 => 'despertar_condensador_100',
            200 => 'despertar_condensador_200',
            300 => 'despertar_condensador_300',
        ],
        'moirai_prism' => [
            1 => 'despertar_prisma_1',
            50 => 'despertar_prisma_50',
            100 => 'despertar_prisma_100',
            200 => 'despertar_prisma_200',
            300 => 'despertar_prisma_300',
        ],
        'fate_forge' => [
            1 => 'despertar_forja_destino_1',
            50 => 'despertar_forja_destino_50',
            100 => 'despertar_forja_destino_100',
            200 => 'despertar_forja_destino_200',
            300 => 'despertar_forja_destino_300',
        ],
        'fractal_engine' => [
            1 => 'despertar_motor_fractal_1',
            50 => 'despertar_motor_fractal_50',
            100 => 'despertar_motor_fractal_100',
            200 => 'despertar_motor_fractal_200',
            300 => 'despertar_motor_fractal_300',
        ],
        'oracle_console' => [
            1 => 'despertar_console_1',
            50 => 'despertar_console_50',
            100 => 'despertar_console_100',
            200 => 'despertar_console_200',
            300 => 'despertar_console_300',
        ],
        'chthonic_idleverse' => [
            1 => 'despertar_idleverso_1',
            50 => 'despertar_idleverso_50',
            100 => 'despertar_idleverso_100',
            200 => 'despertar_idleverso_200',
            300 => 'despertar_idleverso_300',
        ],
        'cortex_baker' => [
            1 => 'despertar_cortex_1',
            50 => 'despertar_cortex_50',
            100 => 'despertar_cortex_100',
            200 => 'despertar_cortex_200',
            300 => 'despertar_cortex_300',
        ],
        'the_emperor' => [
            1 => 'despertar_imperador_1',
            50 => 'despertar_imperador_50',
            100 => 'despertar_imperador_100',
            200 => 'despertar_imperador_200',
            300 => 'despertar_imperador_300',
        ],
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
