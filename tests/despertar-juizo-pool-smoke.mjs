/**
 * Smoke Task 17 — Pool ClassInd + schema Juízo
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-juizo-pool-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStateDto, rowToCanonical } from '../api/_lib/despertar-validate.js';
import {
  CLASSIND_SHARED_COVERS,
  JUIZO_BANCADA_HINT,
  JUIZO_CODEX_BODY,
  JUIZO_CTA_LABEL,
  JUIZO_CTA_READY_HINT,
  JUIZO_MIN_READY,
  JUIZO_MODAL_EDU_HINT,
  JUIZO_POOL_SHORT_COPY,
  JUIZO_READY_POOL,
  JUIZO_STUB_GAMES,
  getJuizoCtaState,
  isJuizoPoolReady,
  resolveJuizoCoverUrl,
  toPublicJuizoCard,
} from '../js/hades-despertar/config/juizo-pool.js';

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

const stubPath = 'data/despertar-juizo-pool.stub.json';
const stub = JSON.parse(read(stubPath) || '{}');
const migrate = read('db/migrate-2026-09-22-despertar-juizo.sql');
const setup = read('db/setup.sql');
const html = read('pages/despertar.html');
const indexJs = read('js/hades-despertar/index.js');
const apiSrc = read('api/despertar.js');
const pkg = read('package.json');
const readme = read('README.md');

staticAssert(Array.isArray(stub.games), 'stub.games é array');
staticAssert(stub.games.length >= 200, `stub ≥ 200 títulos (tem ${stub.games?.length})`);
staticAssert(JUIZO_STUB_GAMES.length >= 200, 'JUIZO_STUB_GAMES ≥ 200');
staticAssert(JUIZO_MIN_READY === 30, 'mínimo ready = 30');
staticAssert(
  JUIZO_READY_POOL.every((g) => g.rating != null && g.rating !== ''),
  'ready pool só com rating',
);
staticAssert(
  JUIZO_READY_POOL.length === stub.games.filter((g) => g.rating != null && g.rating !== '').length,
  'ready count bate com stub filtrado',
);

staticAssert(migrate.includes('verdicts'), 'migration verdicts');
staticAssert(migrate.includes('juizo_best_streak'), 'migration juizo_best_streak');
staticAssert(migrate.includes('juizo_current_streak'), 'migration juizo_current_streak');
staticAssert(migrate.includes('juizo_milestones_claimed'), 'migration milestones');
staticAssert(migrate.includes('verdict_purchases'), 'migration verdict_purchases');
staticAssert(migrate.includes('juizo_run'), 'migration juizo_run');
staticAssert(setup.includes('juizo_best_streak'), 'setup.sql espelha Juízo');
staticAssert(setup.includes('verdicts'), 'setup.sql tem verdicts');

staticAssert(apiSrc.includes('juizo_best_streak'), 'ROW_SELECT inclui Juízo');
staticAssert(html.includes('id="despertar-juizo-open"'), 'CTA Abrir o Juízo');
staticAssert(html.includes(JUIZO_POOL_SHORT_COPY), 'copy pool curto no HTML');
staticAssert(html.includes(JUIZO_BANCADA_HINT), 'Bancada hint J.1 no HTML');
staticAssert(html.includes(JUIZO_MODAL_EDU_HINT), 'modal hint J.1 no HTML');
staticAssert(indexJs.includes('bindJuizoCta') || indexJs.includes('getJuizoCtaState'), 'CTA wired');

const eduSrc = read('js/hades-despertar/config/edu-logs.js');
staticAssert(eduSrc.includes('JUIZO_CODEX_BODY') || eduSrc.includes(JUIZO_CODEX_BODY.slice(0, 40)), 'Códice log_juizo J.1');
const genSrc = read('js/hades-despertar/config/generators.js');
staticAssert(genSrc.includes('distinto do minigame Juízo'), 'Juiz do Tártaro blurb Q16');
const uiSrc = read('js/hades-despertar/ui/UIRenderer.js');
staticAssert(uiSrc.includes('Não é Veredito do Juízo'), 'Juramento Styx blurb Q16');
staticAssert(uiSrc.includes('JUIZO_BANCADA_HINT'), 'Bancada hint wired no renderer');
staticAssert(fs.existsSync(path.join(root, 'assets/despertar-juizo/covers/README.md')), 'pasta capas Juízo');
staticAssert(pkg.includes('despertar-juizo-pool-smoke.mjs'), 'check inclui este smoke');
staticAssert(
  readme.includes('despertar-juizo-pool.stub') || readme.includes('Juízo'),
  'README menciona Juízo/stub',
);

const classindDir = path.join(root, 'assets/classind-dle/covers');
for (const game of JUIZO_READY_POOL) {
  const url = resolveJuizoCoverUrl(game.cover);
  if (CLASSIND_SHARED_COVERS.has(game.cover)) {
    staticAssert(url.includes('/assets/classind-dle/covers/'), `${game.id} usa capa ClassInd`);
    staticAssert(
      fs.existsSync(path.join(classindDir, game.cover)),
      `capa ClassInd existe: ${game.cover}`,
    );
  } else {
    staticAssert(url.includes('/assets/despertar-juizo/covers/'), `${game.id} fallback Juízo`);
  }
}

if (errors.length) {
  console.error('despertar-juizo-pool-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('CTA disabled enquanto ready < 30', () => {
  const cta = getJuizoCtaState();
  assert.equal(cta.min, 30);
  assert.equal(cta.ready, isJuizoPoolReady());
  assert.equal(cta.label, JUIZO_CTA_LABEL);
  if (cta.count < 30) {
    assert.equal(cta.ready, false);
    assert.equal(cta.hint, JUIZO_POOL_SHORT_COPY);
  } else {
    assert.equal(cta.hint, JUIZO_CTA_READY_HINT);
  }
});

await run('J.1 copy educacional distingue sistemas', () => {
  assert.match(JUIZO_BANCADA_HINT, /marcos do melhor streak/);
  assert.match(JUIZO_BANCADA_HINT, /Juiz do Tártaro/);
  assert.match(JUIZO_BANCADA_HINT, /Juramentos do Styx/);
  assert.match(JUIZO_CODEX_BODY, /não de cada acerto/);
  assert.match(JUIZO_CODEX_BODY, /Veredito do Tártaro/);
  assert.match(JUIZO_MODAL_EDU_HINT, /marcos do teu recorde/);
  assert.match(JUIZO_CTA_READY_HINT, /não de cada acerto/);
});

await run('toPublicJuizoCard não vaza rating', () => {
  const sample = JUIZO_READY_POOL[0];
  assert.ok(sample, 'precisa ≥1 ready');
  const pub = toPublicJuizoCard(sample);
  assert.equal(pub.id, sample.id);
  assert.equal(pub.title, sample.title);
  assert.ok(pub.coverUrl);
  assert.equal('rating' in pub, false);
});

await run('DTO stateGet inclui campos Juízo zerados', () => {
  const dto = buildStateDto(rowToCanonical({
    souls: 0,
    obols: 0,
    mnemosyne: 0,
    lifetime_souls: 0,
    run_souls: 0,
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
  }));
  assert.equal(dto.verdicts, 0);
  assert.equal(dto.juizoBestStreak, 0);
  assert.equal(dto.juizoCurrentStreak, 0);
  assert.deepEqual(dto.juizoMilestonesClaimed, []);
  assert.deepEqual(dto.verdictPurchases, []);
  assert.equal('juizoRun' in dto, false, 'juizo_run não vaza no DTO público');
});

console.log(`\ndespertar-juizo-pool-smoke: ${passed} passed, ${failed} failed`);
console.log(`Pool: stub=${JUIZO_STUB_GAMES.length} ready=${JUIZO_READY_POOL.length} (min ${JUIZO_MIN_READY})`);
if (failed) process.exitCode = 1;
