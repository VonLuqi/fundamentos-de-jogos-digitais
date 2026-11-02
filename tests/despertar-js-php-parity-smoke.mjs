/**
 * Paridade JS ≡ PHP do Despertar (o servidor é a autoridade; o cliente prevê).
 * Recupera a parte útil de despertar-full-parity-audit (catálogo e fórmulas) sem a checagem de arte
 * e acrescenta o que travou o Lethe: Catábase, Essência e selos do Rio têm que bater nos dois lados.
 *
 * Uso: node tests/despertar-js-php-parity-smoke.mjs   (precisa de `php` no PATH)
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { DESPERTAR_ACHIEVEMENT_IDS } from '../js/hades-despertar/config/achievements.js';
import { GENERATOR_SELL_REFUND_BASE, GENERATOR_SELL_REFUND_EARTH_SHATTERER } from '../js/hades-despertar/config/constants.js';
import { cmp, money, mul, mulPow115 } from '../js/hades-despertar/core/decimal.js';
import {
  calculateLuckyReward,
  generatorBatchCost,
  generatorPriceAt,
  generatorSellRefund,
  leechApparentMult,
  mnemosyneFromObolsGain,
  obolsFromRunSouls,
  prestigePreview,
} from '../js/hades-despertar/core/formulas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Tabela canônica Cookie Clicker Buildings (wiki). */
const CANONICAL_BUILDINGS = Object.freeze([
  ['wandering_shade', '15', '0.1'], ['charon_servants', '100', '1'], ['cerberian_hound', '1100', '8'],
  ['tartarus_judge', '12000', '47'], ['phlegethon_forge', '130000', '260'], ['obsidian_throne', '1400000', '1400'],
  ['mnemosyne_temple', '20000000', '7800'], ['styx_tower', '330000000', '44000'], ['star_barge', '5100000000', '260000'],
  ['tartarus_lab', '75000000000', '1600000'], ['erebus_portal', '1000000000000', '10000000'],
  ['chronos_loom', '14000000000000', '65000000'], ['void_condenser', '170000000000000', '430000000'],
  ['moirai_prism', '2100000000000000', '2900000000'], ['fate_forge', '26000000000000000', '21000000000'],
  ['fractal_engine', '310000000000000000', '150000000000'], ['oracle_console', '71000000000000000000', '1100000000000'],
  ['chthonic_idleverse', '12000000000000000000000', '8300000000000'],
  ['cortex_baker', '1900000000000000000000000', '64000000000000'],
  ['the_emperor', '540000000000000000000000000', '510000000000000'],
]);

/** Corridas e nº de Catábases em que o Lethe é comparado nos dois lados. */
const RUNS = ['0', '1000', '509999999', '510000000', '4000000000', '8000000000', '16000000000', '64000000000', '5184000000000', '1e20'];
const PRESTIGES = [0, 1, 2, 5];

const phpScript = `
  require 'backend/src/Core/Database.php';
  require 'backend/src/Core/GameCatalog.php';
  require 'backend/src/Services/Despertar/DespertarDecimal.php';
  require 'backend/src/Services/Despertar/DespertarCatalog.php';
  require 'backend/src/Services/Despertar/DespertarFormulas.php';
  use App\\Services\\Despertar\\DespertarCatalog as C;
  use App\\Services\\Despertar\\DespertarFormulas as F;

  $runs = json_decode($argv[1], true);
  $prestiges = json_decode($argv[2], true);
  $lethe = [];
  foreach ($runs as $r) {
    foreach ($prestiges as $p) {
      $prev = F::prestigePreview($r, $p, [], []);
      $lethe[$r . '|' . $p] = [(string) $prev['obolsGain'], (string) $prev['mnemosyneGain'], (bool) $prev['unlocked']];
    }
  }
  $talents = [];
  foreach (C::TALENTS as $id => $t) {
    $talents[$id] = ['cost' => (string) $t['cost'], 'requires' => array_values($t['requires'] ?? [])];
  }
  echo json_encode([
    'gen' => array_map(static fn($g) => [$g['id'], (string) $g['baseCost'], (string) $g['baseRate']], C::GENERATORS),
    'up' => array_map(static fn($u) => [$u['id'], $u['kind'], (string) ($u['cost'] ?? ''), (string) ($u['factor'] ?? '')], C::UPGRADES),
    'ach' => C::DESPERTAR_ACHIEVEMENT_IDS,
    'talents' => $talents,
    'lethe' => $lethe,
    'lucky' => (string) F::calculateLuckyReward('1000', '1'),
    'price' => (string) F::generatorPriceAt('15', 10),
    'sell' => (string) F::generatorSellRefund('15', 100, 10, '1', '0.25'),
    'batch' => (string) F::generatorBatchCost('15', 90, 10, '1'),
    'leech' => (string) F::leechApparentMult(4),
    'firstCatabase' => C::FIRST_CATABASE_RUN_SOULS,
  ]);
`;

let php;
try {
  php = JSON.parse(execFileSync('php', ['-r', phpScript, JSON.stringify(RUNS), JSON.stringify(PRESTIGES)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }));
} catch (error) {
  console.error(`PHP indisponível ou falhou: ${error.message}`);
  process.exit(1);
}

let passed = 0;
let failed = 0;
function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok — ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL — ${label}\n  ${error.message}`);
  }
}

check('20 geradores: JS ≡ tabela canônica ≡ PHP (id, baseCost, baseRate)', () => {
  assert.equal(GENERATORS.length, 20);
  assert.equal(php.gen.length, 20);
  CANONICAL_BUILDINGS.forEach(([id, cost, rate], i) => {
    const g = GENERATORS[i];
    assert.deepEqual([g.id, String(g.baseCost), String(g.baseRate)], [id, cost, rate], `JS tier ${i + 1}`);
    assert.deepEqual(php.gen[i], [id, cost, rate], `PHP tier ${i + 1}`);
  });
});

check('upgrades: mesma ordem, kind, custo e fator no JS e no PHP', () => {
  assert.equal(php.up.length, UPGRADES.length, `PHP ${php.up.length} ≠ JS ${UPGRADES.length}`);
  UPGRADES.forEach((u, i) => {
    assert.deepEqual(php.up[i], [u.id, u.kind, String(u.cost ?? ''), String(u.factor ?? '')], u.id);
  });
});

check('conquistas do Despertar: mesmos ids no JS e no PHP', () => {
  assert.deepEqual([...php.ach].sort(), [...DESPERTAR_ACHIEVEMENT_IDS].sort());
});

check('talentos do Rio: mesmos ids, MESMO custo e MESMOS pré-requisitos no JS e no PHP', () => {
  assert.equal(Object.keys(php.talents).length, TALENTS.length);
  for (const t of TALENTS) {
    const server = php.talents[t.id];
    assert.ok(server, `PHP não conhece o selo ${t.id}`);
    assert.equal(String(server.cost), String(t.cost), `custo de ${t.id}`);
    assert.deepEqual([...server.requires].sort(), [...(t.requires?.talentIds ?? [])].sort(), `pré-requisitos de ${t.id}`);
  }
});

check('Lethe: óbolos, Essência e liberação da Catábase iguais no JS e no PHP (corridas × Catábases)', () => {
  for (const run of RUNS) {
    for (const k of PRESTIGES) {
      const js = prestigePreview(run, k, [], []);
      assert.deepEqual(
        [String(js.obolsGain), String(js.mnemosyneGain), Boolean(js.unlocked)],
        php.lethe[`${run}|${k}`],
        `run=${run} catábases=${k}`,
      );
    }
  }
  assert.equal(php.firstCatabase, '510000000');
});

check('regra do Lethe: quem faz a Catábase sai com Essência para o selo raiz (custo 1)', () => {
  const rootCost = Number(TALENTS.find((t) => !(t.requires?.talentIds ?? []).length)?.cost);
  for (const run of RUNS) {
    for (const k of PRESTIGES) {
      const p = prestigePreview(run, k, [], []);
      if (!p.unlocked) continue;
      assert.ok(Number(p.mnemosyneGain) >= rootCost, `run=${run} catábases=${k}: ${p.mnemosyneGain} de Essência < ${rootCost}`);
    }
  }
  assert.equal(String(mnemosyneFromObolsGain('1')), '1');
  assert.equal(String(obolsFromRunSouls('510000000', 0, [])), '1');
});

check('fórmulas: curva 1,15, venda, Lucky e sanguessuga iguais no JS e no PHP', () => {
  const price = generatorPriceAt('15', 10);
  assert.equal(cmp(price, money(mulPow115('15', 10))), 0);
  const batch = generatorBatchCost('15', 90, 10, '1');
  assert.equal(cmp(generatorSellRefund('15', 100, 10, '1', GENERATOR_SELL_REFUND_BASE), money(mul(batch, '0.25'))), 0);
  assert.equal(cmp(generatorSellRefund('15', 100, 10, '1', GENERATOR_SELL_REFUND_EARTH_SHATTERER), money(mul(batch, '0.50'))), 0);
  assert.equal(cmp(calculateLuckyReward({ souls: '1000', sps: '1' }), '163'), 0);
  assert.equal(cmp(calculateLuckyReward({ souls: '1e20', sps: '2' }), '1813'), 0);
  assert.equal(cmp(php.price, price), 0, 'preço');
  assert.equal(cmp(php.batch, batch), 0, 'lote');
  assert.equal(cmp(php.sell, generatorSellRefund('15', 100, 10, '1', '0.25')), 0, 'venda');
  assert.equal(cmp(php.lucky, calculateLuckyReward({ souls: '1000', sps: '1' })), 0, 'Lucky');
  assert.equal(cmp(php.leech, leechApparentMult(4)), 0, 'sanguessuga');
});

console.log(`\ndespertar-js-php-parity-smoke: ${passed} ok, ${failed} falhas`);
process.exit(failed > 0 ? 1 : 0);
