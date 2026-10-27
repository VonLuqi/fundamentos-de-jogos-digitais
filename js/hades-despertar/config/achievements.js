/**
 * Fase F4 — Catálogo de Conquistas do Despertar, Regras do Véu do Acheron (Milk)
 * e Sabores/Tiers Visuais Ctonianos.
 *
 * Regra canónica (paridade Cookie Clicker):
 * - Cada conquista normal desbloqueada (`!shadow`) adiciona +4% de Véu (`0.04` em fração).
 * - Conquistas Shadow (`shadow: true`) não adicionam Véu (`+0%`).
 */

import { ACHIEVEMENTS, getAchievementById } from '../../game-catalog.js';

export const VEIL_PER_ACHIEVEMENT = '0.04';
export const VEIL_PERCENT_PER_ACHIEVEMENT = 4;

/**
 * Tiers Visuais do Véu (Sabores do Acheron) a cada escalão de conquistas/percentagem.
 */
export const VEIL_TIERS = Object.freeze([
  Object.freeze({
    id: 'nevoa_cinzenta',
    name: 'Névoa Cinzenta',
    minVeilPercent: 0,
    minAchievements: 0,
    color: '#64748b',
    spriteId: 'veu_nevoa_cinzenta',
  }),
  Object.freeze({
    id: 'aguas_estige',
    name: 'Águas do Estige',
    minVeilPercent: 52,
    minAchievements: 13,
    color: '#00a896',
    spriteId: 'veu_aguas_estige',
  }),
  Object.freeze({
    id: 'corrente_lethe',
    name: 'Corrente do Lethe',
    minVeilPercent: 100,
    minAchievements: 25,
    color: '#7209b7',
    spriteId: 'veu_corrente_lethe',
  }),
  Object.freeze({
    id: 'chama_phlegethon',
    name: 'Chama de Flegêton',
    minVeilPercent: 200,
    minAchievements: 50,
    color: '#d90429',
    spriteId: 'veu_chama_phlegethon',
  }),
  Object.freeze({
    id: 'ouro_ancestral',
    name: 'Ouro Ancestral',
    minVeilPercent: 300,
    minAchievements: 75,
    color: '#cfa759',
    spriteId: 'veu_ouro_ancestral',
  }),
  Object.freeze({
    id: 'selo_tartaro',
    name: 'Selo do Tártaro',
    minVeilPercent: 400,
    minAchievements: 100,
    color: '#8b5cf6',
    spriteId: 'veu_selo_tartaro',
  }),
  Object.freeze({
    id: 'manto_hades',
    name: 'Manto de Hades',
    minVeilPercent: 600,
    minAchievements: 150,
    color: '#4c1d95',
    spriteId: 'veu_manto_hades',
  }),
  Object.freeze({
    id: 'coroa_estigia',
    name: 'Coroa Estígia',
    minVeilPercent: 800,
    minAchievements: 200,
    color: '#be123c',
    spriteId: 'veu_coroa_estigia',
  }),
  Object.freeze({
    id: 'trono_sombrio',
    name: 'Trono Sombrio',
    minVeilPercent: 1000,
    minAchievements: 250,
    color: '#0f172a',
    spriteId: 'veu_trono_sombrio',
  }),
  Object.freeze({
    id: 'olimpo_invertido',
    name: 'Olimpo Invertido',
    minVeilPercent: 1200,
    minAchievements: 300,
    color: '#eab308',
    spriteId: 'veu_olimpo_invertido',
  }),
  Object.freeze({
    id: 'veu_absoluto',
    name: 'Véu Absoluto',
    minVeilPercent: 1400,
    minAchievements: 350,
    color: '#f8fafc',
    spriteId: 'veu_absoluto',
  }),
]);

export const CERBERUS_PUP_UPGRADE_IDS = Object.freeze([
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
]);

export const DESPERTAR_ACHIEVEMENTS = Object.freeze(
  ACHIEVEMENTS.filter(
    (entry) => entry.meta?.family === 'despertar' || String(entry.id).startsWith('despertar_'),
  ),
);

export const DESPERTAR_ACHIEVEMENT_IDS = Object.freeze(
  DESPERTAR_ACHIEVEMENTS.map((entry) => entry.id),
);

export const DESPERTAR_SHADOW_ACHIEVEMENT_IDS = Object.freeze(
  DESPERTAR_ACHIEVEMENTS.filter((entry) => Boolean(entry.shadow || entry.meta?.shadow)).map((entry) => entry.id),
);

export const DESPERTAR_NORMAL_ACHIEVEMENT_IDS = Object.freeze(
  DESPERTAR_ACHIEVEMENTS.filter((entry) => !entry.shadow && !entry.meta?.shadow).map((entry) => entry.id),
);

export const ALL_NORMAL_ACHIEVEMENT_IDS = Object.freeze(
  ACHIEVEMENTS.filter((entry) => !entry.shadow && !entry.meta?.shadow).map((entry) => entry.id),
);

const ALL_KNOWN_SET = new Set(ACHIEVEMENTS.map((entry) => entry.id));
const SHADOW_SET = new Set(
  ACHIEVEMENTS.filter((entry) => Boolean(entry.shadow || entry.meta?.shadow)).map((entry) => entry.id),
);

export function isKnownAchievementId(id) {
  return ALL_KNOWN_SET.has(String(id || ''));
}

export function isShadowAchievementId(id) {
  const key = String(id || '');
  if (SHADOW_SET.has(key)) return true;
  const entry = getAchievementById(key);
  return Boolean(entry?.shadow || entry?.meta?.shadow);
}

/**
 * Conquista elegível para o Véu (+4% Milk): existe no catálogo e NÃO é Shadow.
 */
export function isNormalAchievementId(id) {
  const key = String(id || '');
  return ALL_KNOWN_SET.has(key) && !SHADOW_SET.has(key);
}

/**
 * Retorna o Tier Visual (Sabor do Acheron) correspondente a `veilPercent`.
 */
export function veilTierForPercent(veilPct = 0) {
  const pct = Math.max(0, Number(veilPct) || 0);
  let active = VEIL_TIERS[0];
  for (const tier of VEIL_TIERS) {
    if (pct >= tier.minVeilPercent) {
      active = tier;
    }
  }
  return active;
}
