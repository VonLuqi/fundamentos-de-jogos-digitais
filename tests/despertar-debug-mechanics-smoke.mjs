/**
 * Smoke — Estela do Mestre: forçar Eco / Sanguessuga / Lethe sem limites.
 * Uso: node tests/despertar-debug-mechanics-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');

run('HTML mecânicas na Estela', () => {
  assert.ok(html.includes('data-debug-action="spawnShimmer"'));
  assert.ok(html.includes('data-debug-action="spawnLeech"'));
  assert.ok(html.includes('data-debug-action="spawnShinyLeech"'));
  assert.ok(html.includes('data-debug-action="openLetheUnlimited"'));
  assert.ok(html.includes('data-debug-action="catabase1"'));
  assert.ok(html.includes('data-debug-shimmer-effect'));
});

run('index + GameState wire', () => {
  assert.ok(indexSrc.includes('openLetheUnlimited'));
  assert.ok(indexSrc.includes('spawnShimmer'));
  assert.ok(indexSrc.includes('openRiver'));
  assert.ok(stateSrc.includes('debugLocalPatch'));
});

run('spawn Eco + Sanguessuga + patch local', () => {
  const state = new GameState({ generators: { wandering_shade: 3 } });
  state.setCatabaseStage(1);
  const eco = state.spawnShimmer({ effectId: 'mare_acheron', force: true });
  assert.equal(eco.ok, true);
  assert.equal(eco.shimmer?.kind, 'mare_acheron');

  const leech = state.spawnLeech({ shiny: false });
  assert.equal(leech.ok, true);
  assert.ok((leech.state?.leeches || state.catabase.leeches).length >= 1);

  const shiny = state.spawnLeech({ shiny: true });
  assert.equal(shiny.ok, true);
  assert.ok((state.catabase.leeches || []).some((l) => l.shiny));

  const wrath = state.spawnShimmer({ effectId: 'clot_acheron', force: true });
  assert.equal(wrath.ok, true);
  assert.equal(wrath.shimmer?.kind, 'clot_acheron');

  const patch = state.debugLocalPatch({ mnemosyne: '999999', clearLeeches: true });
  assert.equal(patch.ok, true);
  assert.equal(patch.mnemosyne, '999999');
  assert.equal(patch.leeches, 0);
  assert.equal(state.ascensionOpen, false);
  state.ascensionOpen = true;
  assert.equal(state.ascensionOpen, true);
});

console.log(`\ndespertar-debug-mechanics-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
