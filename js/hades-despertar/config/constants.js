/**
 * Constantes congeladas de O Despertar (plano Task 0 / Task 2).
 */

export const TICK_FPS = 60;
export const LOOP_PANIC_UPDATES = 300;

export const COST_MULTIPLIER = '1.15';

export const PRESTIGE_RUN_DIVISOR = '1000000000';
export const OBOL_BONUS_PER = '0.05';
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
export const OFFLINE_EFFICIENCY_BASE = '0.80';
export const OFFLINE_EFFICIENCY_TALENT = '1.00';

export const GENERATOR_COST_MULT_BASE = '1';
export const GENERATOR_COST_MULT_CHARON = '0.95';
export const STARTING_SOULS_MEMORY = '100';

export const MNEMOSYNE_MULT_BASE = '1';
export const TALENT_JURAMENTO_ETERNO_MULT = '1.10';
export const TALENT_MNEMOSYNE_PROFUNDA_MULT = '1.25';

export const SYNC_HEARTBEAT_MS = 30_000;
export const SYNC_MIN_INTERVAL_MS = 5_000;
export const SYNC_GAIN_TOLERANCE = '1.05';
export const SYNC_ABSURD_GAIN_FLOOR = '100';
export const SYNC_MAX_PER_MINUTE = 12;
export const SYNC_OFFLINE_JITTER_SECONDS = 60;

export const BUY_MAX_CAP = 10_000;
export const BUY_MODES = Object.freeze(['1', '10', '100', 'max']);

export const STORAGE_DB_NAME = 'despertar-db';
export const STORAGE_STORE_NAME = 'states';
export const STORAGE_SESSION_PREFIX = 'despertar:state:';
export const SAVE_DEBOUNCE_MS = 1000;

export const STYX_UNLOCK_SOULS = '100';
export const COCYTUS_T2_SOULS = '50';
export const PHLEGETHON_SOULS = '32500';
