/**
 * Constantes congeladas de O Despertar (plano Task 0 / Task 2).
 */

export const TICK_FPS = 60;
export const LOOP_PANIC_UPDATES = 300;

export const COST_MULTIPLIER = '1.15';

export const PRESTIGE_RUN_DIVISOR = '4000000000';
/** +1% SPS por óbolo (paridade CC / Lethe rebalance V2). */
export const OBOL_BONUS_PER = '0.01';
/** Softcap do bônus de prestígio: linear até este raw, depois log10. */
export const PRESTIGE_SOFTCAP_START = '100';
export const PRESTIGE_SOFTCAP_LOG_COEFF = '25';
export const LETHE_PREVIEW_RUN_SOULS = '100000000';

export const CLICK_BASE = '1';
export const CLICK_FLAT_BASE = '0';
export const CLICK_MULT_BASE = '1';
export const CLICK_K_SPS_BASE = '0';
export const CLICK_K_SPS_ANCESTRAL = '0.01';
export const CLICK_CAP_PER_SECOND = 20;

export const OFFLINE_MIN_SECONDS = 10;
export const OFFLINE_MAX_HOURS_BASE = 8;
export const OFFLINE_MAX_HOURS_TALENT = 12;
/** Pacto do Silêncio (F1) — soma com Noite / Bancada. */
export const OFFLINE_EXTRA_HOURS_SILENCIO = 6;
export const OFFLINE_EFFICIENCY_BASE = '0.80';
export const OFFLINE_EFFICIENCY_TALENT = '1.00';

export const GENERATOR_COST_MULT_BASE = '1';
export const GENERATOR_COST_MULT_CHARON = '0.85';
export const STARTING_SOULS_MEMORY = '5000';
/** Margem Generosa (F1) — soma com Memória das Sombras. */
export const STARTING_SOULS_MARGIN = '25000';
/** Segundo Fôlego — starting shade qty (max com Rebanho). */
export const STARTING_SHADE_FOLEGO = 5;
/** Rebanho (F1) — starting shade qty (max com Segundo Fôlego). */
export const STARTING_SHADE_REBANHO = 25;

export const MNEMOSYNE_MULT_BASE = '1';
export const TALENT_JURAMENTO_ETERNO_MULT = '1.25';
export const TALENT_MNEMOSYNE_PROFUNDA_MULT = '1.50';
/** Mnemosyne Tripla — terceiro patamar do bônus de prestígio. */
export const TALENT_MNEMOSYNE_TRIPLA_MULT = '2';
/** Matilha Cerberiana — Cães no início da corrida. */
export const STARTING_HOUND_MATILHA = 3;
/** Forja Despertada — 1 Forja de Phlegethon no início. */
export const STARTING_FORGE_DESPERTADA = 1;
/** Cálice da Memória — essência do Lethe ×3/2. */
export const TALENT_CALICE_MNEMOSYNE_NUM = 3;
export const TALENT_CALICE_MNEMOSYNE_DEN = 2;
/** Eco Ressonante — Juramentos Styx grátis pós-Lethe. */
export const ECO_STYX_RESSONANTE_COUNT = 2;

export const SYNC_HEARTBEAT_MS = 30_000;
export const SYNC_MIN_INTERVAL_MS = 5_000;
/** Legado — sync PHP confia no cliente; não disparam mais reject de ganho. */
export const SYNC_GAIN_TOLERANCE = '1.08';
export const SYNC_ABSURD_GAIN_FLOOR = '100';
export const SYNC_MAX_PER_MINUTE = 12;
export const SYNC_OFFLINE_JITTER_SECONDS = 60;

/** Copy legada (sync econômico não a devolve; cliente suprime toast se aparecer). */
export const JUDGES_REFUSED_MESSAGE =
  'Os Juízes recusaram o saldo declarado — o Submundo restaurou o estado verdadeiro.';

/** Rumor do ticker (catálogo de rumores; não é mais disparado no reject de sync). */
export const JUDGES_REFUSED_TICKER =
  'Rumor: o servidor julga o saldo — o browser só simula; a Estela verdadeira é a do Submundo.';

/** Auto-dismiss do banner api-warning (ms). */
export const API_WARNING_DISMISS_MS = 8_000;

export const BUY_MAX_CAP = 10_000;
export const BUY_MODES = Object.freeze(['1', '10', '100', 'max']);

/**
 * Raridades de unidade no buy (G4):
 * - Negativo (persistido como shiny_counts): 0,5% · ×15 · invert+glitch (mais raro)
 * - Gold (gold_counts): 2% · ×2 · ouro (segundo)
 * Rolls mutuamente exclusivos por unidade (negativo primeiro).
 */
export const NEGATIVO_MULT = '15';
export const NEGATIVO_CHANCE = 0.005;
export const GOLD_MULT = '2';
export const GOLD_CHANCE = 0.02;

/** @deprecated use NEGATIVO_MULT — alias p/ código legado */
export const SHINY_MULT = NEGATIVO_MULT;
/** @deprecated use NEGATIVO_CHANCE */
export const SHINY_CHANCE = NEGATIVO_CHANCE;

export const STORAGE_DB_NAME = 'despertar-db-v2';
export const STORAGE_STORE_NAME = 'states';
export const STORAGE_SESSION_PREFIX = 'despertar:v2:state:';
export const SAVE_DEBOUNCE_MS = 1000;

export const STYX_UNLOCK_SOULS = '100';
export const COCYTUS_T2_SOULS = '50';
export const PHLEGETHON_SOULS = '32500';

// --- Fase Perf (Perf-0 a Perf-5): Orçamento de render, LOD e Preferências ---
export const PERF_UI_SLOW_INTERVAL_MS = 160;
export const PERF_SHELF_NONFANCY_FRAME_SKIP = 10;
export const PERF_AUTO_LOD_FPS_THRESHOLD = 28;
export const PERF_AUTO_LOD_FRAME_MS = 1000 / PERF_AUTO_LOD_FPS_THRESHOLD;
export const PERF_AUTO_LOD_WINDOW_FRAMES = 30;
export const PERF_ANIMATED_VARIANT_CAP_PER_SHELF = 12;
export const PERF_ORBIT_LOD_CURSOR_CAP = 80;
export const PERF_PREFS_STORAGE_KEY = 'despertar:v2:prefs';
export const DEFAULT_PERF_PREFS = Object.freeze({
  cursors: true,
  particles: true,
  fancy: true,
});

// --- Fase F2 (Eco do Acheron — Shimmers Golden / Wrath) ---
export const SHIMMER_SPAWN_MIN_SEC = 420;
export const SHIMMER_SPAWN_MAX_SEC = 720;
export const SHIMMER_LIFETIME_SEC = 13;
export const SHIMMER_MAX_ACTIVE = 1;
export const SHIMMER_MAX_ACTIVE_BUFFS = 3;
export const SHIMMER_SYNC_TOLERANCE_MS = 15_000;
export const SHIMMER_FRENZY_MULT = '7';
export const SHIMMER_FRENZY_DURATION_SEC = 77;
export const SHIMMER_CLICK_FRENZY_MULT = '777';
export const SHIMMER_CLICK_FRENZY_DURATION_SEC = 13;
export const SHIMMER_LUCKY_WALLET_FRACTION = '0.15';
export const SHIMMER_LUCKY_SPS_SECONDS = '900';
export const SHIMMER_LUCKY_FLAT_BONUS = '13';
export const SHIMMER_BUILDING_SPECIAL_DURATION_SEC = 30;
export const SHIMMER_BUILDING_SPECIAL_MAX_MULT = '100';
export const SHIMMER_CLOT_MULT = '0.5';
export const SHIMMER_CLOT_DURATION_SEC = 66;
export const SHIMMER_ELDER_FRENZY_MULT = '666';
export const SHIMMER_ELDER_FRENZY_DURATION_SEC = 6;

// --- Fase F5 (Néctar do Lethe / Sugar Lumps + Levels + 4 Minigames) ---
export const NECTAR_UNLOCK_LIFETIME_SOULS = '1000000000';
export const NECTAR_MATURE_MS = 20 * 3600 * 1000; // 20h
export const NECTAR_RIPE_MS = 23 * 3600 * 1000; // 23h
export const NECTAR_AUTOHARVEST_MS = 24 * 3600 * 1000; // 24h
export const NECTAR_MATURE_HARVEST_CHANCE = 0.5;
export const NECTAR_LEVEL_BONUS_PER = '0.01'; // +1% SPS da linha por nível
export const NECTAR_RESERVE_BONUS_PER = '0.01'; // +1% SPS global por Néctar em reserva
export const NECTAR_RESERVE_CAP = 100; // máx 100 Néctares (×2.0 SPS global)
export const NECTAR_FRENZY_MULT = '3';
export const NECTAR_FRENZY_DURATION_SEC = 3600; // 1h
export const NECTAR_FRENZY_COST = 1;
export const NECTAR_MAX_GENERATOR_LEVEL = 100;
export const NECTAR_SYNC_SKEW_TOLERANCE_MS = 60_000;

// --- Fase F4 (Véu do Acheron / Milk + Filhotes do Cérbero / Kittens Ctonianos) ---
export const VEIL_PER_ACHIEVEMENT = '0.04'; // +4% de Véu por conquista normal
export const VEIL_PERCENT_PER_ACHIEVEMENT = 4;

// --- Fase F6 (Catábase das Avós / Grandmapocalypse + Sanguessugas do Acheron / Wrinklers) ---
export const CATABASE_UNLOCK_SERVANTS = 7;
export const CATABASE_RESEARCH_DURATION_SEC = 1800; // 30 min base entre pesquisas
export const CATABASE_PLEDGE_DURATION_SEC = 1800; // 30 min de Trégua (Elder Pledge)
export const CATABASE_PLEDGE_MAX_STEP = 12; // 8^12 = 68.719.476.736 (teto canónico)
export const CATABASE_COVENANT_SPS_MULT = '0.95'; // −5% SPS global na Aliança Eterna (Elder Covenant)
export const CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT = '0.05'; // +0.05 SPS base em Servos por prédio não-Servo
export const LEECH_BASE_CAP = 10;
export const LEECH_MAX_CAP = 14; // com Ninho do Acheron (+4 slots)
export const LEECH_DRAIN_PER_UNIT = '0.05'; // −5% SPS aparente por Sanguessuga
export const LEECH_PAYOUT_MULT_BASE = '1.1'; // ×1.1 digerido no pop
export const LEECH_PAYOUT_MULT_SACRA = '1.155'; // ×1.155 com Vísceras Sacras (+5%)
export const LEECH_SHINY_PAYOUT_MULT = '3.3'; // ×3.3 para Sanguessuga Dourada/Abissal (Shiny)
export const LEECH_SHINY_CHANCE = 0.0001; // 0.01% (1 em 10.000)
export const LEECH_SPAWN_CHANCE_PER_SEC_PER_STAGE = 0.001; // escala por estágio (1..3)
export const WRATH_SHIMMER_PROB_BY_STAGE = Object.freeze([0, 1 / 3, 2 / 3, 1]);

// --- Fase F8 (Venda de Geradores, Dragão Pitão/Ladão, 4 Estações, Ticker Fortunes & Stack Completo) ---
export const GENERATOR_SELL_REFUND_BASE = '0.25'; // 25% do preço da unidade N-1
export const GENERATOR_SELL_REFUND_EARTH_SHATTERER = '0.50'; // 50% com aura Abalo do Tártaro
export const DRAGON_MAX_STAGE = 4;
export const DRAGON_STAGE1_SOULS_COST = '1000000'; // 1M almas para chocar o Ovo Primordial
export const DRAGON_STAGE2_SACRIFICE_QTY = 50;
export const DRAGON_STAGE3_SACRIFICE_QTY = 100;
export const DRAGON_STAGE4_SACRIFICE_QTY = 200;
export const DRAGON_BREATH_OF_MILK_BOOST = '1.05'; // +5% eficácia nos Filhotes do Cérbero
export const DRAGON_CURSOR_CLICK_MULT = '1.05'; // +5% poder de clique
export const DRAGON_RADIANT_APPETITE_MULT = '2'; // ×2.0 SPS global
export const DRAGON_SCALE_SPS_MULT = '1.03'; // +3% SPS global (Escama de Ladão)
export const DRAGONFLIGHT_CLICK_MULT = '1111'; // ×1111 poder de clique por 10s
export const DRAGONFLIGHT_DURATION_SEC = 10;

export const SEASON_DURATION_MS = 24 * 3600 * 1000; // 24h por estação
export const SEASON_BASE_SWITCH_COST = '1000000000'; // 1B almas base (×2 por troca)
export const SATURN_KING_MAX_LEVEL = 5;
export const SATURN_KING_SPS_PER_LEVEL = '0.05'; // +5% SPS por nível (até +25%)
export const SATURN_KING_DISCOUNT_PER_LEVEL = '0.01'; // -1% custo por nível (até -5%)
export const HERMES_FAIR_SHIMMER_RATE_MULT = 1.05; // +5% frequência de Ecos
export const HERMES_CONTRACT_COST_MULT = '0.98'; // -2% custo de geradores na Feira de Hermes

export const FORTUNE_BASE_CHANCE = 0.02; // 2% no ciclo natural do ticker
export const FORTUNE_O_FORTUNA_CHANCE = 0.04; // 4% com conquista Moira Dourada (O Fortuna)
export const FORTUNE_100_SPS_MULT = '1.01'; // +1% SPS global
export const FORTUNE_100_COST_MULT = '0.99'; // -1% custo de todos os geradores
export const FORTUNE_101_SPS_MULT = '1.07'; // +7% SPS global
export const FORTUNE_101_UPGRADE_COST_MULT = '0.93'; // -7% custo de upgrades
export const FORTUNE_102_OBOL_MULT = '1.01'; // +1% ganho de Óbolos
export const FORTUNE_103_VEIL_FACTOR = '0.05'; // Filhote da Fortuna (fator 0.05 no Véu)
export const FORTUNE_LINE_SPS_MULT = '1.07'; // +7% SPS na linha
export const FORTUNE_LINE_COST_MULT = '0.93'; // -7% custo na linha
export const PRESTIGE_CUBIC_DIVISOR = '1000000000000'; // 1e12 (referência cúbica CC)





