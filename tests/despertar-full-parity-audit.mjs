/**
 * Auditoria Forense de Paridade Real — Cookie Clicker ↔ O Despertar
 *
 * Mede verdade de código/disco (não checkboxes dos docs):
 *   1. Volume de catálogo JS ≡ PHP + tabela canónica CC (baseCost/baseRate)
 *   2. Fórmulas (1.15, sell, Lucky, leech, stack SPS)
 *   3. Assets WebP vs manifest / art-requests / foice / conquistas
 *
 * Exit ≠ 0 = falha técnica (JS≠PHP, fórmula, ficheiro do manifest em falta).
 * Warnings = gaps de volume CC denso / arte ainda open (não falham o gate).
 *
 * Uso: node tests/despertar-full-parity-audit.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { SHIMMER_EFFECTS } from '../js/hades-despertar/config/shimmers.js';
import { DESPERTAR_ACHIEVEMENT_IDS } from '../js/hades-despertar/config/achievements.js';
import {
  LEECH_DRAIN_PER_UNIT,
  LEECH_PAYOUT_MULT_BASE,
  LEECH_SHINY_PAYOUT_MULT,
  GENERATOR_SELL_REFUND_BASE,
  GENERATOR_SELL_REFUND_EARTH_SHATTERER,
} from '../js/hades-despertar/config/constants.js';
import { cmp, money, mul, mulPow115 } from '../js/hades-despertar/core/decimal.js';
import {
  calculateLuckyReward,
  calculateSpsBreakdown,
  generatorBatchCost,
  generatorPriceAt,
  generatorSellRefund,
  leechApparentMult,
} from '../js/hades-despertar/core/formulas.js';
import { leechPayoutMultiplier } from '../js/hades-despertar/core/CatabaseSystem.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = path.join(root, 'assets/despertar/sprites');

/** Tabela canónica Cookie Clicker Buildings (wiki) — dígito a dígito. */
const CANONICAL_BUILDINGS = Object.freeze([
  { id: 'wandering_shade', baseCost: '15', baseRate: '0.1' },
  { id: 'charon_servants', baseCost: '100', baseRate: '1' },
  { id: 'cerberian_hound', baseCost: '1100', baseRate: '8' },
  { id: 'tartarus_judge', baseCost: '12000', baseRate: '47' },
  { id: 'phlegethon_forge', baseCost: '130000', baseRate: '260' },
  { id: 'obsidian_throne', baseCost: '1400000', baseRate: '1400' },
  { id: 'mnemosyne_temple', baseCost: '20000000', baseRate: '7800' },
  { id: 'styx_tower', baseCost: '330000000', baseRate: '44000' },
  { id: 'star_barge', baseCost: '5100000000', baseRate: '260000' },
  { id: 'tartarus_lab', baseCost: '75000000000', baseRate: '1600000' },
  { id: 'erebus_portal', baseCost: '1000000000000', baseRate: '10000000' },
  { id: 'chronos_loom', baseCost: '14000000000000', baseRate: '65000000' },
  { id: 'void_condenser', baseCost: '170000000000000', baseRate: '430000000' },
  { id: 'moirai_prism', baseCost: '2100000000000000', baseRate: '2900000000' },
  { id: 'fate_forge', baseCost: '26000000000000000', baseRate: '21000000000' },
  { id: 'fractal_engine', baseCost: '310000000000000000', baseRate: '150000000000' },
  { id: 'oracle_console', baseCost: '71000000000000000000', baseRate: '1100000000000' },
  { id: 'chthonic_idleverse', baseCost: '12000000000000000000000', baseRate: '8300000000000' },
  { id: 'cortex_baker', baseCost: '1900000000000000000000000', baseRate: '64000000000000' },
  { id: 'the_emperor', baseCost: '540000000000000000000000000', baseRate: '510000000000000' },
]);

/** Marcos Styx do Despertar (15 tiers ≤300) — densos no early, distintos da escada CC até 600. */
const EXPECTED_MILESTONES = Object.freeze([
  1, 5, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300,
]);

const SPS_STACK_KEYS = Object.freeze([
  'baseLinesSps',
  'prestigeMult',
  'verdictMult',
  'minigamesMult',
  'seasonalCompoundMult',
  'catabaseResearchMult',
  'saturnaliaMult',
  'fortuneGlobalMult',
  'dragonScaleMult',
  'cerberusPupMult',
  'nectarReserveMult',
  'dragonAuraMult',
  'elderCovenantMult',
  'activeBuffsMult',
  'rawSps',
  'leechApparentMult',
  'effectiveSps',
]);

let failed = 0;
let passed = 0;
const warnings = [];
const failures = [];

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.stack || error.message}`);
    failed += 1;
    failures.push({ name, message: String(error.message || error) });
  }
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`[WARN] ${msg}`);
}

function countByKind(list) {
  const out = {};
  for (const item of list) {
    const k = item.kind || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function walkWebp(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkWebp(full));
    else if (entry.name.toLowerCase().endsWith('.webp')) out.push(full);
  }
  return out;
}

function requestFilesOnDisk(req) {
  const base = path.join(root, 'assets/despertar/sprites');
  const missing = [];
  const present = [];

  const checkRel = (rel) => {
    const cleaned = String(rel).replace(/^\.?\/?/, '');
    const full = path.join(base, cleaned);
    if (fs.existsSync(full)) present.push(cleaned);
    else missing.push(cleaned);
  };

  for (const f of req.files || []) checkRel(f);

  for (const id of req.minigameSpriteIds || []) {
    checkRel(`minigames/${id}.webp`);
  }
  for (const id of req.veilSpriteIds || []) {
    checkRel(`veil/${id}.webp`);
  }
  for (const id of req.catabaseSpriteIds || []) {
    checkRel(`catabase/${id}.webp`);
  }
  for (const id of req.generatorIds || []) {
    checkRel(`generators/${id}.webp`);
  }
  for (const id of req.upgradeIds || req.upgradeIdsPriority || req.f1UpgradeIds || req.f3SynergyIds || []) {
    checkRel(`upgrades/${id}.webp`);
  }

  // Globs largos: upgrades/*.webp / minigames/*.webp — exige ≥1 ficheiro no folder
  if (req.filesGlob && !(req.files || []).length && !(req.minigameSpriteIds || req.upgradeIds || req.veilSpriteIds || req.catabaseSpriteIds || req.generatorIds || req.upgradeIdsPriority || req.f1UpgradeIds || req.f3SynergyIds || []).length) {
    const glob = String(req.filesGlob);
    if (glob.startsWith('upgrades/')) {
      const n = walkWebp(path.join(base, 'upgrades')).length;
      if (n > 0) present.push(`upgrades/* (${n})`);
      else missing.push('upgrades/*.webp');
    } else if (glob.startsWith('minigames/')) {
      const n = walkWebp(path.join(base, 'minigames')).length;
      if (n > 0) present.push(`minigames/* (${n})`);
      else missing.push('minigames/*.webp');
    } else if (glob.includes('seasons/') || glob.includes('dragon')) {
      const n = walkWebp(path.join(base, 'seasons')).length;
      if (n > 0) present.push(`seasons/* (${n})`);
      else missing.push('seasons/*.webp');
    }
  }

  // Cosméticos e juízo chrome vivem fora de sprites/
  if (req.id === 'art_cosmetics') {
    for (const f of req.files || []) {
      const full = path.join(root, 'assets/despertar', f);
      if (fs.existsSync(full)) present.push(f);
      else missing.push(f);
    }
  }
  if (req.id === 'art_juizo_chrome') {
    for (const f of req.files || []) {
      const full = path.join(root, 'assets/despertar', f.replace(/^juizo\//, 'juizo/'));
      const alt = path.join(root, f.startsWith('assets/') ? f : path.join('assets/despertar', f));
      if (fs.existsSync(full) || fs.existsSync(alt)) present.push(f);
      else missing.push(f);
    }
  }

  return { present, missing, complete: missing.length === 0 && (present.length > 0 || (req.files || []).length === 0) };
}

// ─── 1. Volume catálogo JS ───────────────────────────────────────────────────

run('1. 20 geradores com baseCost/baseRate canónicos CC', () => {
  assert.equal(GENERATORS.length, 20, `esperado 20 geradores, got ${GENERATORS.length}`);
  assert.equal(CANONICAL_BUILDINGS.length, 20);
  for (let i = 0; i < 20; i += 1) {
    const g = GENERATORS[i];
    const c = CANONICAL_BUILDINGS[i];
    assert.equal(g.id, c.id, `tier ${i + 1} id`);
    assert.equal(String(g.baseCost), c.baseCost, `${g.id} baseCost`);
    assert.equal(String(g.baseRate), c.baseRate, `${g.id} baseRate`);
  }
});

run('2. 15 marcos generatorMult por gerador (1…300 Styx) → 300 de linha', () => {
  for (const gen of GENERATORS) {
    const tiers = UPGRADES.filter((u) => u.kind === 'generatorMult' && u.generatorId === gen.id);
    assert.equal(tiers.length, 15, `${gen.id} deve ter 15 tiers`);
    assert.deepEqual(
      tiers.map((u) => u.requires?.quantity),
      [...EXPECTED_MILESTONES],
      `marcos de ${gen.id}`,
    );
  }
  const line = UPGRADES.filter((u) => u.kind === 'generatorMult');
  assert.equal(line.length, 300);
});

run('3. Contagens por kind + talentos + shimmers + conquistas', () => {
  const byKind = countByKind(UPGRADES);
  assert.equal(byKind.generatorMult, 300);
  assert.ok((byKind.synergyMult || 0) >= 4, 'ao menos sinergias base');
  assert.ok((byKind.veilMult || 0) >= 7, 'Filhotes do Cérbero');
  const tf = (byKind.thousandBlades || 0) + (byKind.thousandBladesMult || 0);
  assert.equal(tf, 12, `cadeia Mil Foices = 12 (got ${tf})`);
  assert.ok(TALENTS.length >= 100, `≥100 talentos rio (got ${TALENTS.length})`);
  assert.ok(SHIMMER_EFFECTS.length >= 6, 'efeitos Eco do Acheron');
  assert.equal(DESPERTAR_ACHIEVEMENT_IDS.length, 138, `138 despertar_* (got ${DESPERTAR_ACHIEVEMENT_IDS.length})`);

  const volCanon = UPGRADES.filter(
    (u) => u.kind === 'synergyMult' && u.boostedBonusPerBase === '0.05',
  ).length;
  assert.equal(volCanon, 36, `Sinergias Vol.I/II canónicas = 36 (got ${volCanon})`);
  // Grandma-types / volume residual → WARN only
  if ((byKind.synergyMult || 0) < 44) {
    warn(`Sinergias totais: ${byKind.synergyMult || 0} (36 Vol.I/II + 8 Servos esperados)`);
  }
  if ((byKind.veilMult || 0) < 10) {
    warn(`Filhotes (veilMult): ${byKind.veilMult || 0} (CC kitten ladder é mais longa)`);
  }
  if (TALENTS.length < 200) {
    warn(`Talentos/HC: ${TALENTS.length} (árvore Heavenly do CC ainda é maior)`);
  }
});

// ─── 2. JS ≡ PHP via PHP CLI ─────────────────────────────────────────────────

run('4. JS ≡ PHP: geradores, upgrades, talentos, achievements, SPS/Lucky', () => {
  const jsGen = GENERATORS.map((g) => ({ id: g.id, baseCost: String(g.baseCost), baseRate: String(g.baseRate) }));
  const jsUp = UPGRADES.map((u) => ({ id: u.id, kind: u.kind, cost: String(u.cost ?? ''), factor: String(u.factor ?? '') }));
  const jsTal = TALENTS.map((t) => t.id);
  const jsAch = [...DESPERTAR_ACHIEVEMENT_IDS];

  const luckyJs = calculateLuckyReward({ souls: '1000', sps: '1' });
  const priceJs = generatorPriceAt('15', 10);
  const sellJs = generatorSellRefund('15', 100, 10, '1', '0.25');
  const batchJs = generatorBatchCost('15', 90, 10, '1');
  const leechJs = leechApparentMult(4);

  const tmpDir = path.join(root, '.tmp', 'parity-audit');
  fs.mkdirSync(tmpDir, { recursive: true });
  const phpOutPath = path.join(tmpDir, 'php-out.json');
  fs.writeFileSync(
    path.join(tmpDir, 'js-catalog.json'),
    JSON.stringify({ jsGen, jsUp, jsTal, jsAch }),
    'utf8',
  );

  const phpScript = `
    require 'backend/src/Core/Database.php';
    require 'backend/src/Core/GameCatalog.php';
    require 'backend/src/Services/Despertar/DespertarDecimal.php';
    require 'backend/src/Services/Despertar/DespertarCatalog.php';
    require 'backend/src/Services/Despertar/DespertarFormulas.php';

    use App\\Services\\Despertar\\DespertarCatalog;
    use App\\Services\\Despertar\\DespertarFormulas;

    $outPath = $argv[1];
    $phpGen = [];
    foreach (DespertarCatalog::GENERATORS as $g) {
      $phpGen[] = ['id' => $g['id'], 'baseCost' => (string)$g['baseCost'], 'baseRate' => (string)$g['baseRate']];
    }
    $phpUp = [];
    foreach (DespertarCatalog::UPGRADES as $u) {
      $phpUp[] = [
        'id' => $u['id'],
        'kind' => $u['kind'],
        'cost' => (string)($u['cost'] ?? ''),
        'factor' => (string)($u['factor'] ?? ''),
      ];
    }
    $phpTal = array_values(array_map(static fn($t) => is_array($t) ? ($t['id'] ?? '') : (string)$t, array_values(DespertarCatalog::TALENTS)));
    if (count($phpTal) === 0 || $phpTal[0] === '') {
      $phpTal = array_keys(DespertarCatalog::TALENTS);
    }
    $phpAch = DespertarCatalog::DESPERTAR_ACHIEVEMENT_IDS;

    $lucky = DespertarFormulas::calculateLuckyReward('1000', '1');
    $price = DespertarFormulas::generatorPriceAt('15', 10);
    $sell = DespertarFormulas::generatorSellRefund('15', 100, 10, '1', '0.25');
    $batch = DespertarFormulas::generatorBatchCost('15', 90, 10, '1');
    $leech = DespertarFormulas::leechApparentMult(4);

    file_put_contents($outPath, json_encode([
      'phpGen' => $phpGen,
      'phpUp' => $phpUp,
      'phpTal' => $phpTal,
      'phpAch' => $phpAch,
      'lucky' => (string)$lucky,
      'price' => (string)$price,
      'sell' => (string)$sell,
      'batch' => (string)$batch,
      'leech' => (string)$leech,
      'genCount' => count($phpGen),
      'upCount' => count($phpUp),
      'talCount' => count(DespertarCatalog::TALENTS),
      'achCount' => count($phpAch),
    ]));
  `;

  execFileSync('php', ['-r', phpScript, phpOutPath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const php = JSON.parse(fs.readFileSync(phpOutPath, 'utf8'));

  assert.equal(php.genCount, 20);
  assert.equal(php.upCount, UPGRADES.length, `upgrades PHP ${php.upCount} ≠ JS ${UPGRADES.length}`);
  assert.equal(php.talCount, TALENTS.length);
  assert.equal(php.achCount, DESPERTAR_ACHIEVEMENT_IDS.length);

  for (let i = 0; i < 20; i += 1) {
    assert.equal(php.phpGen[i].id, jsGen[i].id);
    assert.equal(php.phpGen[i].baseCost, jsGen[i].baseCost);
    assert.equal(php.phpGen[i].baseRate, jsGen[i].baseRate);
  }

  const jsUpIds = jsUp.map((u) => u.id);
  const phpUpIds = php.phpUp.map((u) => u.id);
  assert.deepEqual(phpUpIds, jsUpIds, 'ordem/IDs de upgrades JS ≡ PHP');

  for (let i = 0; i < jsUp.length; i += 1) {
    assert.equal(php.phpUp[i].kind, jsUp[i].kind, `kind ${jsUp[i].id}`);
    assert.equal(php.phpUp[i].cost, jsUp[i].cost, `cost ${jsUp[i].id}`);
    assert.equal(php.phpUp[i].factor, jsUp[i].factor, `factor ${jsUp[i].id}`);
  }

  assert.deepEqual([...php.phpTal].sort(), [...jsTal].sort(), 'talentos JS ≡ PHP');
  assert.deepEqual([...php.phpAch].sort(), [...jsAch].sort(), 'achievements JS ≡ PHP');

  assert.equal(cmp(php.lucky, luckyJs), 0, `Lucky PHP ${php.lucky} ≠ JS ${luckyJs}`);
  assert.equal(cmp(php.price, priceJs), 0, `price PHP ≠ JS`);
  assert.equal(cmp(php.sell, sellJs), 0, `sell PHP ≠ JS`);
  assert.equal(cmp(php.batch, batchJs), 0, `batch PHP ≠ JS`);
  assert.equal(cmp(php.leech, leechJs), 0, `leech PHP ≠ JS`);
});

// ─── 3. Fórmulas algébricas ──────────────────────────────────────────────────

run('5. Curva 1.15, sell 25%/50%, Lucky, leech −5%/pop ×1.1/×3.3, stack keys', () => {
  // 15 * 1.15^10 via BigInt (mulPow115) — sem float IEEE
  const p10 = generatorPriceAt('15', 10);
  assert.equal(cmp(p10, money(mulPow115('15', 10))), 0);
  assert.ok(cmp(generatorPriceAt('15', 11), p10) > 0);

  const batch = generatorBatchCost('15', 90, 10, '1');
  const r25 = generatorSellRefund('15', 100, 10, '1', GENERATOR_SELL_REFUND_BASE);
  const r50 = generatorSellRefund('15', 100, 10, '1', GENERATOR_SELL_REFUND_EARTH_SHATTERER);
  assert.equal(cmp(r25, money(mul(batch, '0.25'))), 0);
  assert.equal(cmp(r50, money(mul(batch, '0.50'))), 0);

  // Lucky: min(15% wallet, 15 min SPS) + 13
  // wallet 1000 → 150; sps 1 → 900; min=150 +13 = 163
  assert.equal(cmp(calculateLuckyReward({ souls: '1000', sps: '1' }), '163'), 0);
  // wallet huge, sps 2 → min(huge, 1800)+13 = 1813
  assert.equal(cmp(calculateLuckyReward({ souls: '1e20', sps: '2' }), '1813'), 0);

  assert.equal(String(LEECH_DRAIN_PER_UNIT), '0.05');
  assert.equal(cmp(leechApparentMult(0), '1'), 0);
  assert.equal(cmp(leechApparentMult(2), '0.9'), 0);
  assert.equal(cmp(leechApparentMult(10), '0.5'), 0);

  assert.equal(String(leechPayoutMultiplier({ shiny: false, upgrades: [] })), LEECH_PAYOUT_MULT_BASE);
  assert.equal(String(leechPayoutMultiplier({ shiny: true, upgrades: [] })), LEECH_SHINY_PAYOUT_MULT);
  assert.equal(String(leechPayoutMultiplier({ shiny: false, upgrades: ['visceras_sacras'] })), '1.155');

  const bd = calculateSpsBreakdown({
    generators: { wandering_shade: 1 },
    upgrades: [],
    talents: [],
    obols: '0',
  });
  for (const key of SPS_STACK_KEYS) {
    assert.ok(key in bd, `stack key ausente: ${key}`);
  }
  warn('Digestão Sanguessuga: modelo n² documentado (cada leech acumula drain total) — distinto do CC clássico per-wrinkler; não falha o gate técnico.');
});

// ─── 4. Disco visual ─────────────────────────────────────────────────────────

run('6. manifest.json: todos os webp/svg existem em disco', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(SPRITES, 'manifest.json'), 'utf8'),
  );
  let checked = 0;
  const missing = [];
  const cats = ['generators', 'upgrades', 'shimmers', 'minigames', 'veil', 'catabase', 'seasons'];
  for (const cat of cats) {
    const map = manifest[cat];
    if (!map || typeof map !== 'object') continue;
    for (const [id, entry] of Object.entries(map)) {
      checked += 1;
      const webpRel = entry.webp || `${cat}/${id}.webp`;
      const svgRel = entry.svg || `${cat}/${id}.svg`;
      const webp = path.join(SPRITES, webpRel);
      const svg = path.join(SPRITES, svgRel);
      if (!fs.existsSync(webp)) missing.push(webpRel);
      if (!fs.existsSync(svg)) missing.push(svgRel);
    }
  }
  assert.ok(checked > 0, 'manifest sem entradas reconhecíveis');
  assert.equal(missing.length, 0, `ficheiros em falta no manifest:\n${missing.slice(0, 20).join('\n')}`);
});

run('7. Inventário WebP / Foice / conquistas / art-requests', () => {
  const allWebp = walkWebp(SPRITES);
  assert.ok(allWebp.length >= 400, `esperados ≥400 webp em sprites (got ${allWebp.length})`);

  const foiceIdleWebp = path.join(SPRITES, 'foice', 'foice-idle.webp');
  const foicePressedWebp = path.join(SPRITES, 'foice', 'foice-pressed.webp');
  const foicePng = path.join(SPRITES, 'Foice.png');
  if (!fs.existsSync(foiceIdleWebp) || !fs.existsSync(foicePressedWebp)) {
    warn(`Foice P0: foice-idle/pressed.webp ausentes; UI usa ${fs.existsSync(foicePng) ? 'Foice.png' : 'fallback glyph'}`);
  }

  const achDir = path.join(root, 'assets/achievements');
  const achWebp = fs.existsSync(achDir)
    ? fs.readdirSync(achDir).filter((f) => /^despertar_.*\.webp$/i.test(f))
    : [];
  if (achWebp.length < DESPERTAR_ACHIEVEMENT_IDS.length) {
    warn(`Conquistas: ${achWebp.length} ficheiros únicos despertar_*.webp para ${DESPERTAR_ACHIEVEMENT_IDS.length} IDs (reuse de arte)`);
  }

  const cosmeticsDir = path.join(root, 'assets/despertar/cosmetics');
  const cosWebp = walkWebp(cosmeticsDir);
  if (cosWebp.length === 0) {
    warn('Cosméticos: pasta sem .webp (fallback procedural/CSS)');
  }

  const art = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  const staleOpen = [];
  const trulyOpen = [];
  for (const req of art.requests || []) {
    const { missing, complete } = requestFilesOnDisk(req);
    if (req.status === 'open' && complete && missing.length === 0) {
      staleOpen.push(req.id);
    } else if (req.status === 'open') {
      trulyOpen.push({ id: req.id, missing: missing.slice(0, 5) });
    }
  }
  if (staleOpen.length) {
    warn(`art-requests status stale (ficheiros existem mas status=open): ${staleOpen.join(', ')}`);
  }
  if (trulyOpen.length) {
    warn(`art-requests ainda pendentes: ${trulyOpen.map((t) => t.id).join(', ')}`);
  }

  // Expose for summary JSON
  globalThis.__DESPERTAR_AUDIT_ART__ = {
    webpCount: allWebp.length,
    achWebpUnique: achWebp.length,
    staleOpen,
    trulyOpen: trulyOpen.map((t) => t.id),
    foiceWebpReady: fs.existsSync(foiceIdleWebp) && fs.existsSync(foicePressedWebp),
  };
});

// ─── Resumo ──────────────────────────────────────────────────────────────────

const byKind = countByKind(UPGRADES);
const artSummary = globalThis.__DESPERTAR_AUDIT_ART__ || {};

const summary = {
  ok: failed === 0,
  passed,
  failed,
  failures,
  warnings,
  catalog: {
    generators: GENERATORS.length,
    upgrades: UPGRADES.length,
    byKind,
    talents: TALENTS.length,
    shimmerEffects: SHIMMER_EFFECTS.length,
    despertarAchievements: DESPERTAR_ACHIEVEMENT_IDS.length,
    synergyMult: byKind.synergyMult || 0,
    veilMult: byKind.veilMult || 0,
    thousandBladesChain: (byKind.thousandBlades || 0) + (byKind.thousandBladesMult || 0),
  },
  art: artSummary,
  pillars: {
    codeFormulasPct: failed === 0 ? 100 : Math.round((passed / (passed + failed)) * 100),
    catalogVolumePct: Math.round(
      // Weighted: gens 100, line tiers 100, synergies capped, kittens capped, TF capped, talents capped
      (
        100 + // 20 gens
        100 + // 300 line
        Math.min(100, ((byKind.synergyMult || 0) / 100) * 100) +
        Math.min(100, ((byKind.veilMult || 0) / 13) * 100) +
        Math.min(100, (((byKind.thousandBlades || 0) + (byKind.thousandBladesMult || 0)) / 12) * 100) +
        Math.min(100, (TALENTS.length / 80) * 100)
      ) / 6,
    ),
    artWebpPct: Math.round(
      (
        (artSummary.foiceWebpReady ? 100 : 40) +
        (GENERATORS.length === 20 ? 100 : 0) +
        Math.min(100, ((artSummary.webpCount || 0) / 466) * 100) +
        Math.min(100, ((artSummary.achWebpUnique || 0) / 24) * 100) +
        ((artSummary.trulyOpen || []).includes('art_cosmetics') ? 20 : 80)
      ) / 5,
    ),
  },
};

console.log('\n========== AUDIT SUMMARY ==========');
console.log(JSON.stringify(summary, null, 2));
console.log(`\n${failed === 0 ? 'OK' : 'FAILED'} — ${passed} pass / ${failed} fail / ${warnings.length} warn`);

process.exit(failed === 0 ? 0 : 1);
