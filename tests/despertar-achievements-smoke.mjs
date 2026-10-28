/**
 * Smoke Task 12 — Conquistas do Despertar: catálogo, arte e limiares (cliente).
 * O avaliador do servidor PHP tem paridade coberta em despertar-php-server-smoke.
 *
 * Uso: node tests/despertar-achievements-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESPERTAR_ACHIEVEMENT_IDS } from '../js/hades-despertar/config/achievements.js';
import { JUIZO_STREAK_MILESTONES } from '../js/hades-despertar/config/juizo-pool.js';
import { EDU_LOG_IDS } from '../js/hades-despertar/config/edu-logs.js';
import {
  VERDICT_SHOP,
  VERDICT_SHOP_IDS,
  VERDICT_SHOP_TOTAL_COST,
} from '../js/hades-despertar/config/verdict-shop.js';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { evaluateDespertarAchievementIds } from '../js/hades-despertar/core/formulas.js';

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

const catalogJson = JSON.parse(read('data/game-catalog.json'));
const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
const indexJs = read('js/hades-despertar/index.js');
const despertarCss = read('css/despertar.css');

staticAssert(Array.isArray(catalogJson.achievements), 'game-catalog.json tem achievements');
staticAssert(Array.isArray(artCatalog), 'assets/achievements/catalog.json é array');
staticAssert(EDU_LOG_IDS.length === 29, `Códice tem 29 logs (tem ${EDU_LOG_IDS.length})`);
staticAssert(DESPERTAR_ACHIEVEMENT_IDS.includes('despertar_arquiteto_do_loop'), 'ids incluem Arquiteto do Loop');
staticAssert(DESPERTAR_ACHIEVEMENT_IDS.includes('despertar_paciencia'), 'ids incluem Paciência (D2)');

for (const id of DESPERTAR_ACHIEVEMENT_IDS) {
  const entry = catalogJson.achievements.find((a) => a.id === id);
  staticAssert(Boolean(entry), `game-catalog.json inclui ${id}`);
  if (entry) {
    staticAssert(entry.meta?.family === 'despertar', `${id} meta.family=despertar`);
    staticAssert(typeof entry.art === 'string' && entry.art.endsWith('.webp'), `${id} tem art webp`);
    staticAssert(fs.existsSync(path.join(root, 'assets/achievements', entry.art)), `arte existe: ${entry.art}`);
    staticAssert(
      artCatalog.some((e) => String(e?.file || '') === entry.art),
      `assets/achievements/catalog.json lista ${entry.art}`,
    );
  }
  staticAssert(Boolean(getAchievementById(id) || ACHIEVEMENTS.find((a) => a.id === id)), `game-catalog.js resolve ${id}`);
}

staticAssert(
  catalogJson.achievements.find((a) => a.id === 'despertar_arquiteto_do_loop')?.hidden === true,
  'Arquiteto do Loop é hidden',
);
staticAssert(
  catalogJson.achievements.find((a) => a.id === 'despertar_paciencia')?.hidden === true,
  'Paciência é hidden',
);

const gameStateSrc = read('js/hades-despertar/core/GameState.js');
staticAssert(
  gameStateSrc.includes('milestones.offline') && gameStateSrc.includes('3600'),
  'GameState seta milestones.offline no catch-up ≥ 1 h',
);
staticAssert(indexJs.includes('presentGrimoireAwards'), 'cliente toasta awarded');
staticAssert(indexJs.includes('onSynced'), 'ApiService onSynced wired');
staticAssert(despertarCss.includes('grimorio-award-toast'), 'despertar.css tem toast de relíquia');

// --- D2 P0: limiares isolados ---
{
  const base = {
    lifetimeSouls: '0',
    souls: '0',
    runSouls: '0',
    prestigeCount: 0,
    generators: {},
    upgrades: [],
    talents: [],
    milestones: {},
    shinyCounts: {},
    goldCounts: {},
    juizoBestStreak: 0,
    verdictPurchases: [],
    eduLogsSeen: [],
  };
  const unlocks = (patch, id) => evaluateDespertarAchievementIds({ ...base, ...patch }, []).includes(id);

  assert.ok(unlocks({ lifetimeSouls: '100' }, 'despertar_cem_almas'));
  assert.ok(!unlocks({ lifetimeSouls: '99' }, 'despertar_cem_almas'));
  assert.ok(unlocks({ lifetimeSouls: '1000000' }, 'despertar_milhao'));
  assert.ok(unlocks({
    upgrades: ['foice_afilada', 'juramento_acheron', 'pacto_das_margens', 'ceifador_ctoniano', 'colheita_eterna'],
  }, 'despertar_styx_cinco'));
  assert.ok(unlocks({ shinyCounts: { wandering_shade: 1 } }, 'despertar_shiny'));
  assert.ok(unlocks({ goldCounts: { wandering_shade: 1 } }, 'despertar_gold'));
  assert.ok(unlocks({ prestigeCount: 3 }, 'despertar_catabase_3'));
  assert.ok(unlocks({ juizoBestStreak: 1 }, 'despertar_juizo_1'));
  assert.ok(unlocks({ juizoBestStreak: 10 }, 'despertar_juizo_10'));
  assert.ok(!unlocks({ juizoBestStreak: 9 }, 'despertar_juizo_10'));
  assert.ok(unlocks({ verdictPurchases: [...VERDICT_SHOP_IDS] }, 'despertar_bancada_cheia'));
  assert.ok(!unlocks({}, 'despertar_paciencia'), 'Paciência exige milestones.offline');
  assert.ok(unlocks({ milestones: { offline: true } }, 'despertar_paciencia'));
}

// --- D2: GameState milestones.offline após ≥ 1 h ---
{
  const gs = GameState.fromSnapshot({
    souls: '100',
    lifetimeSouls: '100',
    runSouls: '100',
    generators: { wandering_shade: 1 },
  });
  assert.equal(Boolean(gs.milestones.offline), false);
  gs.applyOffline(3600);
  assert.equal(gs.milestones.offline, true, '1 h creditável → offline');
}

// --- D3: ladder Juízo × Vereditos × copy Q16 ---
{
  const juizoAlbumIds = ['despertar_juizo_1', 'despertar_juizo_5', 'despertar_juizo_10', 'despertar_juizo_25'];
  for (const id of juizoAlbumIds) {
    const streak = Number(id.split('_').pop());
    const at = evaluateDespertarAchievementIds({ juizoBestStreak: streak, lifetimeSouls: '0', generators: {}, upgrades: [], talents: [] }, []);
    const below = evaluateDespertarAchievementIds({ juizoBestStreak: streak - 1, lifetimeSouls: '0', generators: {}, upgrades: [], talents: [] }, []);
    assert.ok(at.includes(id) && !below.includes(id), `ladder Álbum: ${id} abre em ${streak}`);

    const entry = catalogJson.achievements.find((a) => a.id === id);
    staticAssert(Boolean(entry), `catálogo ${id}`);
    const blob = `${entry?.name || ''} ${entry?.desc || ''}`;
    staticAssert(/Ju[ií]zo/i.test(blob), `${id} copy menciona Juízo`);
    staticAssert(!/^Juiz do Recorde$/i.test(String(entry?.name || '')), `${id} não usa nome ambíguo Juiz do Recorde`);
    if (id !== 'despertar_juizo_10') {
      staticAssert(/Juiz do Tártaro/i.test(String(entry?.desc || '')), `${id} desc diferencia Juiz do Tártaro`);
    }
  }
  assert.ok(JUIZO_STREAK_MILESTONES.some((m) => m.streak === 5 && m.verdicts === 1), 'Veredito s5 intacto');
  assert.ok(JUIZO_STREAK_MILESTONES.some((m) => m.streak === 25 && m.verdicts === 5), 'Veredito s25 intacto');
  assert.equal(VERDICT_SHOP.length, 8, 'Bancada 8 itens');
  assert.equal(VERDICT_SHOP_TOTAL_COST, 63, 'Bancada custos F2');

  const generatorsSrc = read('js/hades-despertar/config/generators.js');
  staticAssert(generatorsSrc.includes('Minos') || generatorsSrc.includes('malhete'), 'blurb T4 Juiz do Tártaro em lore (não meta)');
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
