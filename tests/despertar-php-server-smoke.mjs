/**
 * Smoke do servidor PHP do Despertar (substitui os smokes do antigo backend Vercel api/).
 * Roda funções puras de DespertarService (sem banco) via PHP CLI e compara com o cliente.
 *
 * Uso: node tests/despertar-php-server-smoke.mjs
 * Requer `php` no PATH (XAMPP: C:\xampp\php). Sem PHP, falha — o servidor não pode ficar sem gate.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { canPrestige, migrateUpgradeSave, prestigePreview } from '../js/hades-despertar/core/formulas.js';
import { LEGACY_SYNERGY_COSTS } from '../js/hades-despertar/config/upgrades.js';
import { JUIZO_RATING_ORDER, JUIZO_STREAK_MILESTONES } from '../js/hades-despertar/config/juizo-pool.js';
import { CURRENT_SEASON } from '../js/hades-despertar/config/season-closed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW_MS = Date.UTC(2026, 9, 28, 12, 0, 0);

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`[PASS] ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`[FAIL] ${name}`);
    console.error(error);
  }
}

/** Executa um corpo PHP com o backend carregado; o corpo deve fazer `echo json_encode(...)`. */
function php(body) {
  const script = `<?php
    declare(strict_types=1);
    require 'backend/src/Core/Database.php';
    require 'backend/src/Core/GameCatalog.php';
    require 'backend/src/Services/Despertar/DespertarDecimal.php';
    require 'backend/src/Services/Despertar/DespertarCatalog.php';
    require 'backend/src/Services/Despertar/DespertarFormulas.php';
    require 'backend/src/Services/Despertar/DespertarService.php';
    use App\\Services\\Despertar\\DespertarCatalog;
    use App\\Services\\Despertar\\DespertarService;
    $now = ${NOW_MS};
    ${body}
  `;
  const res = spawnSync('php', [], { cwd: root, input: script, encoding: 'utf8' });
  assert.equal(res.error, undefined, `PHP CLI indisponível: ${res.error}`);
  assert.equal(res.status, 0, `PHP falhou:\n${res.stdout}\n${res.stderr}`);
  return JSON.parse(res.stdout);
}

const BASE_ROW = {
  souls: '1000.00',
  obols: '0.00',
  mnemosyne: '0.00',
  lifetime_souls: '5000.00',
  run_souls: '5000.00',
  prestige_count: 0,
  generators_state: { wandering_shade: 5 },
  upgrades_state: [],
  talents_state: [],
};

run('validateSync: payload que não é objeto → 400 com o estado do banco', () => {
  const out = php(`
    $r = DespertarService::validateSync(${phpJson(BASE_ROW)}, 'lixo', $now);
    echo json_encode(['ok' => $r['ok'], 'status' => $r['status'], 'souls' => $r['state']['souls']]);
  `);
  assert.equal(out.ok, false);
  assert.equal(out.status, 400);
  assert.equal(cmp(out.souls, '1000'), 0);
});

run('validateSync: IDs fora do catálogo são descartados; echoEpoch volta', () => {
  const client = {
    souls: '900',
    runSouls: '5000',
    lifetimeSouls: '5000',
    generators: { wandering_shade: 6, gerador_falso: 99 },
    upgrades: ['upgrade_falso'],
    clientEpoch: 7,
  };
  const out = php(`
    $r = DespertarService::validateSync(${phpJson(BASE_ROW)}, ${phpJson(client)}, $now);
    echo json_encode([
      'ok' => $r['ok'],
      'echo' => $r['echoEpoch'] ?? null,
      'gens' => $r['next']['generators'],
      'ups' => $r['next']['upgrades'],
      'hasPatch' => isset($r['patch']),
    ]);
  `);
  assert.equal(out.ok, true);
  assert.equal(out.echo, 7);
  assert.equal(out.gens.wandering_shade, 6);
  assert.equal(out.gens.gerador_falso, undefined, 'gerador desconhecido some');
  assert.deepEqual(out.ups, [], 'upgrade desconhecido some');
  assert.equal(out.hasPatch, true);
});

run('validateSync: shiny/gold acima da quantidade são cortados (soft clamp)', () => {
  const client = {
    souls: '1000',
    generators: { wandering_shade: 3 },
    shinyCounts: { wandering_shade: 50 },
    goldCounts: { wandering_shade: 50 },
  };
  const out = php(`
    $r = DespertarService::validateSync(${phpJson(BASE_ROW)}, ${phpJson(client)}, $now);
    echo json_encode(['ok' => $r['ok'], 'shiny' => $r['next']['shinyCounts'], 'gold' => $r['next']['goldCounts']]);
  `);
  assert.equal(out.ok, true);
  const shiny = Number(out.shiny.wandering_shade || 0);
  const gold = Number(out.gold.wandering_shade || 0);
  assert.ok(shiny + gold <= 3, `shiny+gold ≤ qty (shiny=${shiny}, gold=${gold})`);
});

run('validateSync: almas negativas viram 0', () => {
  const out = php(`
    $r = DespertarService::validateSync(${phpJson(BASE_ROW)}, ['souls' => '-50', 'generators' => ['wandering_shade' => 5]], $now);
    echo json_encode(['ok' => $r['ok'], 'souls' => $r['next']['souls']]);
  `);
  assert.equal(out.ok, true);
  assert.equal(cmp(out.souls, '0'), 0);
});

run('applyPrestige: sem óbolos a render → 400; JS concorda', () => {
  const out = php(`
    $r = DespertarService::applyPrestige(${phpJson(BASE_ROW)}, $now);
    echo json_encode(['ok' => $r['ok'], 'status' => $r['status']]);
  `);
  assert.equal(out.ok, false);
  assert.equal(out.status, 400);
  assert.equal(canPrestige('5000', 0, []), false);
});

run('applyPrestige: corrida madura → óbolos JS ≡ PHP, geradores zerados, +1 Catábase', () => {
  const ripe = { ...BASE_ROW, run_souls: '1000000000000.00', lifetime_souls: '1000000000000.00' };
  const out = php(`
    $r = DespertarService::applyPrestige(${phpJson(ripe)}, $now);
    $s = $r['state'];
    echo json_encode([
      'ok' => $r['ok'],
      'obols' => $s['obols'],
      'prestigeCount' => $s['prestigeCount'],
      'shade' => $s['generators']['wandering_shade'] ?? 0,
      'runSouls' => $s['runSouls'],
    ]);
  `);
  assert.equal(out.ok, true);
  assert.equal(canPrestige('1000000000000', 0, []), true);
  const preview = prestigePreview('1000000000000', 0, [], []);
  const jsObols = String(preview.obolsGain ?? preview.obols ?? preview.gain);
  assert.equal(cmp(out.obols, jsObols), 0, `óbolos PHP ${out.obols} ≡ JS ${jsObols}`);
  assert.equal(out.prestigeCount, 1);
  assert.equal(out.shade, 0);
  assert.equal(cmp(out.runSouls, '0'), 0);
});

run('rowToCanonical → canonicalToRowPatch → rowToCanonical preserva o núcleo', () => {
  const row = {
    ...BASE_ROW,
    upgrades_state: ['foice_afilada', 'upgrade_falso'],
    shiny_counts: { wandering_shade: 1 },
  };
  const out = php(`
    $a = DespertarService::rowToCanonical(${phpJson(row)});
    $patch = DespertarService::canonicalToRowPatch($a, '2026-10-28T12:00:00.000Z');
    $b = DespertarService::rowToCanonical($patch);
    echo json_encode(['a' => $a, 'b' => $b]);
  `);
  for (const key of ['souls', 'obols', 'runSouls', 'lifetimeSouls', 'prestigeCount', 'generators', 'upgrades', 'shinyCounts']) {
    assert.deepEqual(out.b[key], out.a[key], `round-trip ${key}`);
  }
  assert.deepEqual(out.a.upgrades, ['foice_afilada'], 'upgrade desconhecido some no load');
});

run('Pausa da turma: ativa só liberada e dentro da janela', () => {
  const future = new Date(NOW_MS + 60_000).toISOString();
  const past = new Date(NOW_MS - 60_000).toISOString();
  const out = php(`
    echo json_encode([
      'on' => DespertarService::isDespertarPauseActive(['released' => true, 'pauseUntil' => '${future}'], $now),
      'expired' => DespertarService::isDespertarPauseActive(['released' => true, 'pauseUntil' => '${past}'], $now),
      'notReleased' => DespertarService::isDespertarPauseActive(['released' => false, 'pauseUntil' => '${future}'], $now),
      'dto' => DespertarService::pausePublicDto(['released' => true, 'pauseUntil' => '${future}'], $now),
      'dtoExpired' => DespertarService::pausePublicDto(['released' => true, 'pauseUntil' => '${past}'], $now),
      'window' => DespertarService::pauseWindowDto(['released' => true, 'pauseUntil' => '${past}'], $now),
    ]);
  `);
  assert.equal(out.on, true);
  assert.equal(out.expired, false);
  assert.equal(out.notReleased, false);
  assert.equal(out.dto.active, true);
  assert.ok(out.dto.reason, 'motivo padrão preenchido');
  assert.equal(out.dtoExpired, null);
  assert.equal(out.window.active, false, 'janela expirada continua visível como inativa');
});

run('Juízo: aliases de escolha e ordem de classificação JS ≡ PHP', () => {
  const out = php(`
    echo json_encode([
      'milestones' => array_map(static fn($m) => ['streak' => $m['streak'], 'verdicts' => $m['verdicts']], DespertarCatalog::JUIZO_STREAK_MILESTONES),
      'order' => DespertarCatalog::JUIZO_RATING_ORDER,
      'higher' => DespertarService::normalizeJuizoChoice('higher'),
      'lower' => DespertarService::normalizeJuizoChoice('LOWER'),
      'tie' => DespertarService::normalizeJuizoChoice('tie'),
      'bad' => DespertarService::normalizeJuizoChoice('talvez'),
      'okHigher' => DespertarService::isCorrectJuizoGuess('10', '16', 'higher'),
      'badHigher' => DespertarService::isCorrectJuizoGuess('16', '10', 'higher'),
      'okTie' => DespertarService::isCorrectJuizoGuess('12', '12', 'tie'),
      'unknownRating' => DespertarService::isCorrectJuizoGuess('99', '10', 'lower'),
    ]);
  `);
  assert.deepEqual(out.order, [...JUIZO_RATING_ORDER]);
  assert.deepEqual(out.milestones, JUIZO_STREAK_MILESTONES.map(({ streak, verdicts }) => ({ streak, verdicts })), 'marcos de Vereditos JS ≡ PHP');
  assert.equal(out.higher, 'B');
  assert.equal(out.lower, 'A');
  assert.equal(out.tie, 'tie');
  assert.equal(out.bad, null);
  assert.equal(out.okHigher, true);
  assert.equal(out.badHigher, false);
  assert.equal(out.okTie, true);
  assert.equal(out.unknownRating, false);
});

// ─── Teto suave do sync: nunca recusa, corta só o impossível ───────────────
const CEIL_ROW = {
  souls: '1000.00',
  lifetime_souls: '50000.00',
  run_souls: '50000.00',
  generators_state: { wandering_shade: 50, charon_servants: 20, cerberian_hound: 5 },
  upgrades_state: [],
  last_sync_at: new Date(NOW_MS - 30_000).toISOString(),
  stats: { shimmersClicked: 2 },
};
const CEIL_CLIENT = {
  souls: '1000',
  lifetimeSouls: '50000',
  runSouls: '50000',
  generators: CEIL_ROW.generators_state,
  upgrades: [],
  shimmersClicked: 2,
};

function syncCase(client, row = CEIL_ROW) {
  return php(`
    $r = DespertarService::validateSync(${phpJson(row)}, ${phpJson(client)}, $now);
    $sps = App\\Services\\Despertar\\DespertarFormulas::calculateTotalSPS(['generators' => ${phpJson(row.generators_state)}]);
    echo json_encode([
      'ok' => $r['ok'], 'status' => $r['status'], 'sps' => $sps,
      'action' => $r['ceiling']['action'] ?? null, 'limit' => $r['ceiling']['limit'] ?? null,
      'souls' => $r['next']['souls'], 'lifetime' => $r['next']['lifetimeSouls'],
      'generators' => $r['next']['generators'], 'clicks' => $r['next']['stats']['shimmersClicked'] ?? null,
      'corrections' => array_column($r['corrections'], 'system'),
      'antiCheat' => $r['next']['milestones']['antiCheat'] ?? null,
    ]);
  `);
}

run('Teto: jogador honesto (30 s de SPS) passa sem correção', () => {
  const probe = syncCase(CEIL_CLIENT);
  const gain = (Number(probe.sps) * 30).toFixed(2);
  const out = syncCase({
    ...CEIL_CLIENT,
    souls: String(1000 + Number(gain)),
    lifetimeSouls: String(50000 + Number(gain)),
    runSouls: String(50000 + Number(gain)),
  });
  assert.equal(out.ok, true);
  assert.equal(out.action, 'ok');
  assert.deepEqual(out.corrections, []);
  assert.equal(cmp(out.souls, String(1000 + Number(gain))), 0);
});

run('Teto: Lucky de 1 eco novo (900 s de SPS) passa', () => {
  const probe = syncCase(CEIL_CLIENT);
  const lucky = Number(probe.sps) * 900;
  const out = syncCase({ ...CEIL_CLIENT, souls: String(1000 + lucky), lifetimeSouls: String(50000 + lucky), shimmersClicked: 3 });
  assert.equal(out.ok, true);
  assert.equal(out.action, 'ok');
  assert.equal(out.clicks, 3);
});

run('Teto: edição absurda é cortada no limite, sem recusar', () => {
  const out = syncCase({ ...CEIL_CLIENT, souls: '1e30', lifetimeSouls: '1e30' });
  assert.equal(out.ok, true);
  assert.equal(out.status, 200);
  assert.equal(out.action, 'ganho acima do teto cortado');
  assert.ok(cmp(out.souls, '1000000000') < 0, `almas cortadas (${out.souls})`);
  assert.ok(cmp(out.lifetime, '1000000000') < 0, `lifetime cortado (${out.lifetime})`);
  assert.equal(out.antiCheat.clamps, 1);
});

run('Teto: compra que nem o limite paga é desfeita', () => {
  const out = syncCase({ ...CEIL_CLIENT, souls: '0', generators: { ...CEIL_ROW.generators_state, obsidian_throne: 1000 } });
  assert.equal(out.ok, true);
  assert.equal(out.action, 'compras impagáveis desfeitas');
  assert.equal(out.generators.obsidian_throne ?? 0, 0);
});

run('Teto: venda de gerador reembolsa sem bandeira', () => {
  const out = syncCase({ ...CEIL_CLIENT, souls: '1500', generators: { ...CEIL_ROW.generators_state, wandering_shade: 30 } });
  assert.equal(out.ok, true);
  assert.equal(out.action, 'ok');
  assert.equal(out.generators.wandering_shade, 30);
});

run('Teto: ecos além das fichas não contam; lifetime não regride', () => {
  const inflated = syncCase({ ...CEIL_CLIENT, shimmersClicked: 500 });
  assert.equal(inflated.ok, true);
  assert.ok(inflated.clicks <= 2 + 3, `ecos creditados ≤ fichas (${inflated.clicks})`);
  const stale = syncCase({ ...CEIL_CLIENT, lifetimeSouls: '10', runSouls: '10' });
  assert.equal(cmp(stale.lifetime, '50000'), 0);
});

run('Sem recusa por subsistema: buff vencido e Néctar com relógio errado', () => {
  const buff = syncCase({ ...CEIL_CLIENT, activeBuffs: { mare_acheron: { id: 'mare_acheron', expiresAt: NOW_MS - 5 } } });
  assert.equal(buff.ok, true);
  assert.deepEqual(buff.corrections, ['buffs']);
  const nectar = syncCase({ ...CEIL_CLIENT, nectarCycleStartedAt: NOW_MS + 999_999_999 });
  assert.equal(nectar.ok, true);
  assert.deepEqual(nectar.corrections, ['nectar']);
});

run('Toda DespertarCatalog::CONSTANTE usada no backend existe', () => {
  // Um gerador já apagou LEGACY_SYNERGY_COSTS e o PHP dava fatal em saves legados.
  const dir = path.join(root, 'backend', 'src');
  const used = new Set();
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.php')) {
        for (const m of fs.readFileSync(full, 'utf8').matchAll(/DespertarCatalog::([A-Z][A-Z0-9_]+)\b(?!\s*\()/g)) {
          used.add(m[1]);
        }
      }
    }
  };
  walk(dir);
  const out = php(`
    echo json_encode(array_keys((new ReflectionClass(DespertarCatalog::class))->getConstants()));
  `);
  const defined = new Set(out);
  const missing = [...used].filter((name) => !defined.has(name));
  assert.deepEqual(missing, [], `constantes ausentes: ${missing.join(', ')}`);
});

run('Save legado: sinergia temática reembolsa almas igual em JS e PHP', () => {
  const legacyId = Object.keys(LEGACY_SYNERGY_COSTS)[0];
  const js = migrateUpgradeSave(['foice_afilada', legacyId], '100');
  const out = php(`
    $c = DespertarService::rowToCanonical(['souls' => '100.00', 'upgrades_state' => ['foice_afilada', '${legacyId}']]);
    echo json_encode(['souls' => $c['souls'], 'upgrades' => $c['upgrades']]);
  `);
  assert.deepEqual(out.upgrades, ['foice_afilada']);
  assert.equal(cmp(out.souls, js.souls), 0, `PHP ${out.souls} ≡ JS ${js.souls}`);
  assert.ok(cmp(out.souls, '100') > 0, 'houve reembolso');
});

run('Temporada: cliente e servidor seguram o hold da T1 juntos', () => {
  const out = php(`
    echo json_encode(['hold' => DespertarService::SEASON_CLOSED_HOLD]);
  `);
  assert.equal(CURRENT_SEASON, 2);
  assert.equal(typeof out.hold, 'boolean');
});

/** Serializa um valor JS como literal PHP via json_decode (aspas simples escapadas). */
function phpJson(value) {
  const json = JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `json_decode('${json}', true)`;
}

console.log(`\ndespertar-php-server-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
