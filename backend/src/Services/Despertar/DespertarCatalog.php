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
    public const OBOL_BONUS_PER = '0.05';
    public const LETHE_PREVIEW_RUN_SOULS = '100000000';

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
    public const STARTING_SHADE_FOLEGO = 5;
    public const STARTING_SHADE_REBANHO = 25;
    public const STARTING_HOUND_MATILHA = 3;
    public const STARTING_FORGE_DESPERTADA = 1;

    public const MNEMOSYNE_MULT_BASE = '1';
    public const TALENT_JURAMENTO_ETERNO_MULT = '1.25';
    public const TALENT_MNEMOSYNE_PROFUNDA_MULT = '1.50';
    public const TALENT_MNEMOSYNE_TRIPLA_MULT = '2';
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

    public const GENERATORS = [
        ['id' => 'wandering_shade', 'tier' => 1, 'baseCost' => '15', 'baseRate' => '0.1'],
        ['id' => 'charon_servants', 'tier' => 2, 'baseCost' => '100', 'baseRate' => '0.8'],
        ['id' => 'cerberian_hound', 'tier' => 3, 'baseCost' => '1100', 'baseRate' => '8'],
        ['id' => 'tartarus_judge', 'tier' => 4, 'baseCost' => '12000', 'baseRate' => '47'],
        ['id' => 'phlegethon_forge', 'tier' => 5, 'baseCost' => '130000', 'baseRate' => '260'],
        ['id' => 'obsidian_throne', 'tier' => 6, 'baseCost' => '1400000', 'baseRate' => '3000'],
    ];

    public const UPGRADES = [
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
        // T1
        ['id' => 'umbras_despertas', 'cost' => '100', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 1]],
        ['id' => 'cortejo_das_sombras', 'cost' => '500', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 10]],
        ['id' => 'legiao_das_umbras', 'cost' => '5000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 25]],
        ['id' => 'mare_de_sombras', 'cost' => '50000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 50]],
        ['id' => 'eclipse_do_acheron', 'cost' => '500000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 100]],
        ['id' => 'cortejo_infinito', 'cost' => '5000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 150]],
        ['id' => 'noite_sem_fim', 'cost' => '50000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'wandering_shade', 'requires' => ['generatorId' => 'wandering_shade', 'quantity' => 200]],
        // T2
        ['id' => 'moeda_no_barquinho', 'cost' => '1000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 1]],
        ['id' => 'frota_de_caronte', 'cost' => '5000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 10]],
        ['id' => 'remadores_do_styx', 'cost' => '50000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 25]],
        ['id' => 'armada_das_margens', 'cost' => '500000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 50]],
        ['id' => 'travessia_eterna', 'cost' => '5000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 100]],
        ['id' => 'porto_das_cem_barcas', 'cost' => '50000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 150]],
        ['id' => 'mar_de_obolos', 'cost' => '500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'charon_servants', 'requires' => ['generatorId' => 'charon_servants', 'quantity' => 200]],
        // T3
        ['id' => 'trela_cerberiana', 'cost' => '11000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 1]],
        ['id' => 'tres_cabecas', 'cost' => '55000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 10]],
        ['id' => 'matilha_do_ade', 'cost' => '550000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 25]],
        ['id' => 'guardiao_triplo', 'cost' => '5500000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 50]],
        ['id' => 'canil_do_tartaro', 'cost' => '55000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 100]],
        ['id' => 'uivo_das_portas', 'cost' => '550000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 150]],
        ['id' => 'fome_sem_fim', 'cost' => '5500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'cerberian_hound', 'requires' => ['generatorId' => 'cerberian_hound', 'quantity' => 200]],
        // T4
        ['id' => 'veredito_tartaro', 'cost' => '120000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 1]],
        ['id' => 'lei_inquebravel', 'cost' => '600000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 10]],
        ['id' => 'banco_dos_juizes', 'cost' => '6000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 25]],
        ['id' => 'codigo_das_profundezas', 'cost' => '60000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 50]],
        ['id' => 'sentenca_coletiva', 'cost' => '600000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 100]],
        ['id' => 'colegio_infernus', 'cost' => '3000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 150]],
        ['id' => 'lei_do_abismo', 'cost' => '15000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'tartarus_judge', 'requires' => ['generatorId' => 'tartarus_judge', 'quantity' => 200]],
        // T5
        ['id' => 'brasa_phlegethon', 'cost' => '1300000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 1]],
        ['id' => 'fornalha_industrial', 'cost' => '6500000', 'kind' => 'generatorMult', 'factor' => '2', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 10]],
        ['id' => 'caldeiras_gemeas', 'cost' => '65000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 25]],
        ['id' => 'rio_de_ferro', 'cost' => '650000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 50]],
        ['id' => 'fundicao_eterna', 'cost' => '6500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 100]],
        ['id' => 'cinzas_do_rio', 'cost' => '32500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 150]],
        ['id' => 'coracao_de_magma', 'cost' => '162500000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'phlegethon_forge', 'requires' => ['generatorId' => 'phlegethon_forge', 'quantity' => 200]],
        // T6
        ['id' => 'cetro_obsidiana', 'cost' => '14000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 1]],
        ['id' => 'soberania_absoluta', 'cost' => '70000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 10]],
        ['id' => 'corte_obsidiana', 'cost' => '700000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 25]],
        ['id' => 'dominio_ctoniano', 'cost' => '7000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 50]],
        ['id' => 'imperio_sem_sol', 'cost' => '70000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 100]],
        ['id' => 'trono_sem_fim', 'cost' => '350000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 150]],
        ['id' => 'noite_do_imperador', 'cost' => '1750000000000000', 'kind' => 'generatorMult', 'factor' => '5', 'generatorId' => 'obsidian_throne', 'requires' => ['generatorId' => 'obsidian_throne', 'quantity' => 200]],
        // All
        ['id' => 'coroacao_imperador', 'cost' => '1000000000', 'kind' => 'allGeneratorsMult', 'factor' => '2', 'requires' => ['minSouls' => '0']],
        ['id' => 'rios_unificados', 'cost' => '100000000000', 'kind' => 'allGeneratorsMult', 'factor' => '2', 'requires' => ['minSouls' => '0']],
    ];

    public const TALENTS = [
        'memoria_das_sombras' => ['id' => 'memoria_das_sombras', 'cost' => '1'],
        'juramento_eterno' => ['id' => 'juramento_eterno', 'cost' => '1'],
        'noite_prolongada' => ['id' => 'noite_prolongada', 'cost' => '2'],
        'veu_eficiente' => ['id' => 'veu_eficiente', 'cost' => '2'],
        'foice_ancestral' => ['id' => 'foice_ancestral', 'cost' => '3'],
        'favor_de_caronte' => ['id' => 'favor_de_caronte', 'cost' => '3'],
        'mnemosyne_profunda' => ['id' => 'mnemosyne_profunda', 'cost' => '5'],
        'segundo_folego' => ['id' => 'segundo_folego', 'cost' => '5'],
        'margem_generosa' => ['id' => 'margem_generosa', 'cost' => '3'],
        'pacto_do_silencio' => ['id' => 'pacto_do_silencio', 'cost' => '3'],
        'olho_da_curva' => ['id' => 'olho_da_curva', 'cost' => '4'],
        'eco_do_styx' => ['id' => 'eco_do_styx', 'cost' => '4'],
        'rebanho_despertado' => ['id' => 'rebanho_despertado', 'cost' => '5'],
        'matilha_cerberiana' => ['id' => 'matilha_cerberiana', 'cost' => '6'],
        'eco_ressonante' => ['id' => 'eco_ressonante', 'cost' => '6'],
        'calice_da_memoria' => ['id' => 'calice_da_memoria', 'cost' => '7'],
        'mnemosyne_tripla' => ['id' => 'mnemosyne_tripla', 'cost' => '8'],
        'forja_despertada' => ['id' => 'forja_despertada', 'cost' => '10'],
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
