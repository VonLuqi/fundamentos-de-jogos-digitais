/**
 * Smoke Task 12 — Conquistas + elegibilidade do Códice no servidor
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-achievements-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DESPERTAR_ACHIEVEMENT_IDS,
  DESPERTAR_HIDDEN_IDS,
  DESPERTAR_PUBLIC_IDS,
  computeEligibleEduLogs,
  evaluateDespertarAchievementIds,
  sanitizeEduLogsSeen,
} from '../api/_lib/despertar-achievements.js';
import { EDU_LOG_IDS } from '../js/hades-despertar/config/edu-logs.js';
import { GENERATOR_IDS } from '../js/hades-despertar/config/generators.js';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

[
  'api/_lib/despertar-achievements.js',
  'api/despertar.js',
  'data/game-catalog.json',
  'assets/achievements/catalog.json',
  'js/grimorio-awards.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const catalogJson = JSON.parse(read('data/game-catalog.json'));
const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
const despertarApi = read('api/despertar.js');
const indexJs = read('js/hades-despertar/index.js');
const despertarCss = read('css/despertar.css');

staticAssert(Array.isArray(catalogJson.achievements), 'game-catalog.json tem achievements');
staticAssert(Array.isArray(artCatalog), 'assets/achievements/catalog.json é array');
staticAssert(EDU_LOG_IDS.length === 13, `Códice tem 13 logs (tem ${EDU_LOG_IDS.length})`);
staticAssert(DESPERTAR_PUBLIC_IDS.length === 11, '11 conquistas públicas do Despertar');
staticAssert(DESPERTAR_HIDDEN_IDS.length === 1, '1 conquista hidden (Arquiteto)');
staticAssert(
  DESPERTAR_ACHIEVEMENT_IDS.includes('despertar_arquiteto_do_loop'),
  'ids incluem Arquiteto do Loop',
);

for (const id of DESPERTAR_ACHIEVEMENT_IDS) {
  const entry = catalogJson.achievements.find((a) => a.id === id);
  staticAssert(Boolean(entry), `game-catalog.json inclui ${id}`);
  if (entry) {
    staticAssert(entry.meta?.family === 'despertar', `${id} meta.family=despertar`);
    staticAssert(typeof entry.art === 'string' && entry.art.endsWith('.webp'), `${id} tem art webp`);
    const artPath = path.join(root, 'assets/achievements', entry.art);
    staticAssert(fs.existsSync(artPath), `arte existe: ${entry.art}`);
    staticAssert(
      artCatalog.some((e) => String(e?.file || '') === entry.art),
      `assets/achievements/catalog.json lista ${entry.art}`,
    );
  }
  const runtime = getAchievementById(id) || ACHIEVEMENTS.find((a) => a.id === id);
  staticAssert(Boolean(runtime), `game-catalog.js resolve ${id}`);
}

staticAssert(
  catalogJson.achievements.find((a) => a.id === 'despertar_arquiteto_do_loop')?.hidden === true,
  'Arquiteto do Loop é hidden',
);

staticAssert(despertarApi.includes('grantDespertarAchievements'), 'api/despertar grant helper');
staticAssert(
  despertarApi.includes('evaluateDespertarAchievementIds')
    || despertarApi.includes('planDespertarAwards'),
  'api/despertar avalia ids',
);
staticAssert(despertarApi.includes('sanitizeEduLogsSeen'), 'api/despertar sanitiza edu logs');
staticAssert(despertarApi.includes('applySanitizedEduLogs'), 'api/despertar aplica sanitize no sync');
staticAssert(indexJs.includes('presentGrimoireAwards'), 'cliente toasta awarded');
staticAssert(indexJs.includes('onSynced'), 'ApiService onSynced wired');
staticAssert(despertarCss.includes('grimorio-award-toast'), 'despertar.css tem toast de relíquia');

// --- Elegibilidade: DevTools não marca os 12 com lifetime=1 ---
{
  const poor = {
    lifetimeSouls: '1',
    souls: '1',
    runSouls: '1',
    prestigeCount: 0,
    generators: {},
    upgrades: [],
    talents: [],
    milestones: {},
    eduLogsSeen: [...EDU_LOG_IDS],
  };
  const eligible = computeEligibleEduLogs(poor, { syncOk: true });
  staticAssert(eligible.includes('log_input'), 'lifetime≥1 → log_input');
  staticAssert(eligible.includes('log_loop'), 'lifetime≥1 → log_loop');
  staticAssert(eligible.includes('log_authority'), 'syncOk → log_authority');
  staticAssert(!eligible.includes('log_prestige'), 'sem catábase → sem log_prestige');
  staticAssert(!eligible.includes('log_offline'), 'sem marco/progresso → sem log_offline');
  staticAssert(eligible.length < EDU_LOG_IDS.length, 'estado pobre não elegibiliza os 13');

  const sanitized = sanitizeEduLogsSeen(poor.eduLogsSeen, poor, { syncOk: true });
  staticAssert(
    sanitized.length === eligible.length,
    'sanitize ∩ elegíveis (não aceita DevTools claiming all)',
  );
  staticAssert(
    !evaluateDespertarAchievementIds(poor, { unlocked: [], syncOk: true })
      .includes('despertar_arquiteto_do_loop'),
    'Arquiteto bloqueado sem Códice legítimo',
  );
  staticAssert(
    evaluateDespertarAchievementIds(poor, { unlocked: [], syncOk: true })
      .includes('despertar_primeira_alma'),
    'Primeira Alma com lifetime≥1',
  );
}

// --- Códice completo legítimo → Arquiteto ---
{
  const generators = Object.fromEntries(GENERATOR_IDS.map((id) => [id, 1]));
  generators.wandering_shade = 5;
  const rich = {
    lifetimeSouls: '1000',
    souls: '100',
    runSouls: '100000',
    prestigeCount: 1,
    generators,
    upgrades: ['styx_shade_x2'],
    talents: ['echo_of_styx'],
    milestones: { offline: true, shade: true, forge: true, throne: true },
    verdictPurchases: ['selo_do_juiz'],
    eduLogsSeen: [...EDU_LOG_IDS],
  };
  const eligible = computeEligibleEduLogs(rich, { syncOk: true });
  staticAssert(
    eligible.length === EDU_LOG_IDS.length,
    `estado rico elegibiliza os 13 (tem ${eligible.length})`,
  );
  const sanitized = sanitizeEduLogsSeen(rich.eduLogsSeen, rich, { syncOk: true });
  staticAssert(sanitized.length === 13, 'sanitize aceita os 13 quando elegíveis');
  const earned = evaluateDespertarAchievementIds(rich, { unlocked: [], syncOk: true });
  staticAssert(earned.includes('despertar_arquiteto_do_loop'), 'Arquiteto com Códice completo');
  staticAssert(earned.includes('despertar_catabase'), 'Catábase com prestige≥1');
  staticAssert(earned.includes('despertar_soberania'), 'Soberania com todos os geradores');
  staticAssert(earned.includes('despertar_mnemosyne'), 'Mnemosyne com talento');
}

try {
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('despertar-achievements-smoke: ok');
} catch (err) {
  console.error('despertar-achievements-smoke: FAIL');
  for (const msg of errors) console.error(`  - ${msg}`);
  process.exitCode = 1;
  if (errors.length === 0) throw err;
}
