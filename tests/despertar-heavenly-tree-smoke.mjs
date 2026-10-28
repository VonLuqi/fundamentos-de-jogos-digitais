/**
 * Smoke — catálogo Heavenly 129 + grafo + migração legado.
 * Uso: node tests/despertar-heavenly-tree-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TALENTS,
  TALENT_BRANCHES,
  TALENT_BY_ID,
  LEGACY_TALENT_MAP,
  LEGACY_TALENT_COSTS,
  talentNodePosition,
  talentRingRadius,
} from '../js/hades-despertar/config/talents.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  heavenlyPowerFromUpgrades,
  migrateTalentSave,
  talentEffects,
} from '../js/hades-despertar/core/formulas.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';

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

run('TALENTS.length === 129', () => {
  assert.equal(TALENTS.length, 129);
});

run('custos são inteiros decimais (sem e+)', () => {
  for (const t of TALENTS) {
    assert.match(String(t.cost), /^\d+$/, t.id);
  }
});

run('grafo: único root legado, sem órfãos', () => {
  const byId = Object.fromEntries(TALENTS.map((t) => [t.id, t]));
  const roots = TALENTS.filter((t) => !(t.requires?.talentIds?.length));
  assert.equal(roots.length, 1);
  assert.equal(roots[0].id, 'legado');
  for (const t of TALENTS) {
    if (t.id === 'legado') continue;
    const reqs = t.requires?.talentIds || [];
    assert.ok(reqs.length >= 1, `órfão ${t.id}`);
    for (const pid of reqs) {
      assert.ok(byId[pid], `${t.id} → pai ${pid}`);
    }
  }
});

run('um nó por família de efeito principal', () => {
  assert.equal(talentEffects(['portoes_gemeos']).offlineRate, '0.05');
  assert.equal(talentEffects(['permanent_slot_i']).permanentSlot, 1);
  assert.equal(talentEffects(['sinergias_vol_i']).synergyVolUnlock, 1);
  assert.equal(talentEffects(['unshackled_cursors']).unshackleFingers, true);
  assert.equal(talentEffects(['contabilidade_genial']).richAmort, true);
  assert.equal(talentEffects(['belphegor']).offlineHours, 8 + 4);
  assert.equal(talentEffects(['quimera']).offlineRate, '0.05');
  assert.ok(talentEffects(['quimera']).offlineHours >= 8 + 48);
});

run('migrateTalentSave: eco_do_styx → permanent_slot_i', () => {
  const m = migrateTalentSave(['eco_do_styx'], '0');
  assert.deepEqual(m.talents, ['permanent_slot_i']);
  assert.equal(cmp(m.mnemosyne, '0'), 0);
});

run('migrateTalentSave: id null-mapped refund', () => {
  const m = migrateTalentSave(['rebanho_despertado'], '2');
  assert.deepEqual(m.talents, []);
  assert.equal(cmp(m.mnemosyne, '7'), 0);
});

run('heavenlyPowerFromUpgrades escada', () => {
  const hp = UPGRADES.filter((u) => u.kind === 'heavenlyPower');
  assert.ok(hp.length >= 5);
  const ids = hp.map((u) => u.id);
  assert.equal(cmp(heavenlyPowerFromUpgrades([]), '0'), 0);
  assert.equal(cmp(heavenlyPowerFromUpgrades([ids[0]]), String(hp[0].factor)), 0);
});

run('LetheRiverTree usa TALENT_BRANCHES', () => {
  const src = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/LetheRiverTree.js'), 'utf8');
  assert.ok(src.includes('TALENT_BRANCHES'));
  assert.ok(src.includes('Object.keys(TALENT_BRANCHES)'));
  const branchKeys = new Set(TALENTS.map((t) => t.branch));
  for (const key of Object.keys(TALENT_BRANCHES)) {
    assert.ok(branchKeys.has(key), `branch ${key}`);
  }
});

run('LEGACY_TALENT_MAP ⊆ catálogo ou null', () => {
  for (const [oldId, mapped] of Object.entries(LEGACY_TALENT_MAP)) {
    if (mapped === null) {
      // null-mapped ids sem custo explícito ainda reembolsam 0 (save heal seguro).
      if (LEGACY_TALENT_COSTS[oldId]) {
        assert.ok(cmp(LEGACY_TALENT_COSTS[oldId], '0') > 0, `custo legado ${oldId}`);
      }
    } else {
      assert.ok(TALENT_BY_ID[mapped], `${oldId} → ${mapped}`);
    }
  }
});

run('layout polar: nós sem colisão + arestas sob controle', () => {
  const CX = 800;
  const CY = 1056;
  const RING_GAP = 88;
  const ROOT_R = 56;
  const NODE_R = 26;
  const pos = Object.fromEntries(
    TALENTS.map((t) => [
      t.id,
      talentNodePosition(t, { cx: CX, cy: CY, ringGap: RING_GAP, rootR: ROOT_R }),
    ]),
  );
  let minD = Infinity;
  const ids = TALENTS.map((t) => t.id);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = pos[ids[i]];
      const b = pos[ids[j]];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < minD) minD = d;
    }
  }
  assert.ok(minD >= NODE_R * 2 - 0.5, `minDist ${minD}`);

  const edges = [];
  for (const t of TALENTS) {
    for (const pid of t.requires?.talentIds || []) {
      const a = pos[pid];
      const b = pos[t.id];
      if (!a || !b) continue;
      edges.push(Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  edges.sort((a, b) => a - b);
  const mean = edges.reduce((s, v) => s + v, 0) / edges.length;
  const p90 = edges[Math.floor(edges.length * 0.9)];
  const max = edges[edges.length - 1];
  assert.ok(mean < 450, `edge mean ${mean}`);
  assert.ok(p90 < 1100, `edge p90 ${p90}`);
  assert.ok(max < 3200, `edge max ${max}`);
});

run('rings altos comprimidos + gerador com wedges/pull', () => {
  const full = 8 * 88 + 36;
  const deep = talentRingRadius(26, { ringGap: 88, rootR: 56 });
  assert.ok(deep < 26 * 88 + 36, `ring26 ${deep} deve comprimir`);
  assert.ok(talentRingRadius(8) === full || Math.abs(talentRingRadius(8) - full) < 1e-6);
  const gen = fs.readFileSync(path.join(root, 'scripts/gen-heavenly-talent-catalog.mjs'), 'utf8');
  assert.ok(gen.includes('pullAngleTowardParents'));
  assert.ok(gen.includes("unshackled: [-148, -100]"));
  assert.ok(!gen.includes('season: [110, 140],\n    nectar: [110, 140],\n    unshackled: [-140, -110]'));
  const ui = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/LetheRiverTree.js'), 'utf8');
  assert.ok(ui.includes('talentRingRadius'));
  assert.ok(ui.includes('medianRing'));
});

console.log(`\ndespertar-heavenly-tree-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
