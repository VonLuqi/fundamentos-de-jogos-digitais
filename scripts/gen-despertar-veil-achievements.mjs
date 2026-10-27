#!/usr/bin/env node
/**
 * Expande conquistas normais (Véu Milk) até ≥350 e max Véu ≥1400%.
 * Atualiza data/game-catalog.json, DESPERTAR_ACHIEVEMENT_IDS + marcos PHP/JS.
 * Uso: node scripts/gen-despertar-veil-achievements.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = path.join(root, 'data/game-catalog.json');
const JS_ACH = path.join(root, 'js/hades-despertar/config/achievements.js');
const JS_FORMULAS = path.join(root, 'js/hades-despertar/core/formulas.js');
const PHP_PATH = path.join(root, 'backend/src/Services/Despertar/DespertarCatalog.php');
const PHP_FORMULAS = path.join(root, 'backend/src/Services/Despertar/DespertarFormulas.php');

const TARGET_NORMALS = 350;
const LATE_MILESTONES = [350, 400, 450, 500, 550, 600];
const T1T6_EXTRA = [150, 250, 300];

const GEN_SLUG = Object.freeze({
  wandering_shade: 'sombra',
  charon_servants: 'servos',
  cerberian_hound: 'cao',
  tartarus_judge: 'juiz',
  phlegethon_forge: 'forja',
  obsidian_throne: 'trono',
  mnemosyne_temple: 'templo',
  styx_tower: 'torre',
  star_barge: 'barca',
  tartarus_lab: 'laboratorio',
  erebus_portal: 'portal',
  chronos_loom: 'tear',
  void_condenser: 'condensador',
  moirai_prism: 'prisma',
  fate_forge: 'forja_destino',
  fractal_engine: 'motor_fractal',
  oracle_console: 'console',
  chthonic_idleverse: 'idleverso',
  cortex_baker: 'cortex',
  the_emperor: 'imperador',
});

const GEN_DISPLAY = Object.fromEntries(GENERATORS.map((g) => [g.id, g.name]));

/** Marcos base (espelho formulas.js antes da expansão). */
const BASE_MILESTONES = {
  wandering_shade: { 50: 'despertar_sombra_50', 100: 'despertar_sombra_100' },
  charon_servants: { 50: 'despertar_servos_50' },
  cerberian_hound: { 50: 'despertar_cao_50' },
  tartarus_judge: { 50: 'despertar_juiz_50' },
  phlegethon_forge: { 50: 'despertar_forja_50' },
  obsidian_throne: { 50: 'despertar_trono_50' },
  mnemosyne_temple: { 1: 'despertar_templo_1', 50: 'despertar_templo_50', 100: 'despertar_templo_100', 200: 'despertar_templo_200' },
  styx_tower: { 1: 'despertar_torre_1', 50: 'despertar_torre_50', 100: 'despertar_torre_100', 200: 'despertar_torre_200' },
  star_barge: { 1: 'despertar_barca_1', 50: 'despertar_barca_50', 100: 'despertar_barca_100', 200: 'despertar_barca_200' },
  tartarus_lab: { 1: 'despertar_laboratorio_1', 50: 'despertar_laboratorio_50', 100: 'despertar_laboratorio_100', 200: 'despertar_laboratorio_200' },
  erebus_portal: { 1: 'despertar_portal_1', 50: 'despertar_portal_50', 100: 'despertar_portal_100', 200: 'despertar_portal_200' },
  chronos_loom: { 1: 'despertar_tear_1', 50: 'despertar_tear_50', 100: 'despertar_tear_100', 200: 'despertar_tear_200' },
  void_condenser: { 1: 'despertar_condensador_1', 50: 'despertar_condensador_50', 100: 'despertar_condensador_100', 200: 'despertar_condensador_200', 300: 'despertar_condensador_300' },
  moirai_prism: { 1: 'despertar_prisma_1', 50: 'despertar_prisma_50', 100: 'despertar_prisma_100', 200: 'despertar_prisma_200', 300: 'despertar_prisma_300' },
  fate_forge: { 1: 'despertar_forja_destino_1', 50: 'despertar_forja_destino_50', 100: 'despertar_forja_destino_100', 200: 'despertar_forja_destino_200', 300: 'despertar_forja_destino_300' },
  fractal_engine: { 1: 'despertar_motor_fractal_1', 50: 'despertar_motor_fractal_50', 100: 'despertar_motor_fractal_100', 200: 'despertar_motor_fractal_200', 300: 'despertar_motor_fractal_300' },
  oracle_console: { 1: 'despertar_console_1', 50: 'despertar_console_50', 100: 'despertar_console_100', 200: 'despertar_console_200', 300: 'despertar_console_300' },
  chthonic_idleverse: { 1: 'despertar_idleverso_1', 50: 'despertar_idleverso_50', 100: 'despertar_idleverso_100', 200: 'despertar_idleverso_200', 300: 'despertar_idleverso_300' },
  cortex_baker: { 1: 'despertar_cortex_1', 50: 'despertar_cortex_50', 100: 'despertar_cortex_100', 200: 'despertar_cortex_200', 300: 'despertar_cortex_300' },
  the_emperor: { 1: 'despertar_imperador_1', 50: 'despertar_imperador_50', 100: 'despertar_imperador_100', 200: 'despertar_imperador_200', 300: 'despertar_imperador_300' },
};

const VEIL_TIERS_EXTRA = [
  { id: 'selo_tartaro', name: 'Selo do Tártaro', minVeilPercent: 400, minAchievements: 100, color: '#8b5cf6', spriteId: 'veu_selo_tartaro' },
  { id: 'manto_hades', name: 'Manto de Hades', minVeilPercent: 600, minAchievements: 150, color: '#4c1d95', spriteId: 'veu_manto_hades' },
  { id: 'coroa_estigia', name: 'Coroa Estígia', minVeilPercent: 800, minAchievements: 200, color: '#be123c', spriteId: 'veu_coroa_estigia' },
  { id: 'trono_sombrio', name: 'Trono Sombrio', minVeilPercent: 1000, minAchievements: 250, color: '#0f172a', spriteId: 'veu_trono_sombrio' },
  { id: 'olimpo_invertido', name: 'Olimpo Invertido', minVeilPercent: 1200, minAchievements: 300, color: '#eab308', spriteId: 'veu_olimpo_invertido' },
  { id: 'veu_absoluto', name: 'Véu Absoluto', minVeilPercent: 1400, minAchievements: 350, color: '#f8fafc', spriteId: 'veu_absoluto' },
];

const VOLUME_RULES = [
  { id: 'despertar_prestigio_10', name: 'Dez Lethes', desc: 'Completou 10 Rituais do Lethe.', kind: 'prestige', min: 10 },
  { id: 'despertar_prestigio_25', name: 'Vinte e Cinco Ciclos', desc: 'Completou 25 Rituais do Lethe.', kind: 'prestige', min: 25 },
  { id: 'despertar_prestigio_50', name: 'Meio Centenário Infernal', desc: 'Completou 50 Rituais do Lethe.', kind: 'prestige', min: 50 },
  { id: 'despertar_prestigio_100', name: 'Centúria do Rio', desc: 'Completou 100 Rituais do Lethe.', kind: 'prestige', min: 100 },
  { id: 'despertar_filhotes_3', name: 'Matilha Tripla', desc: 'Comprou 3 upgrades Filhote do Cérbero (veilMult).', kind: 'filhotes', min: 3 },
  { id: 'despertar_filhotes_5', name: 'Quinteto Cerberiano', desc: 'Comprou 5 upgrades Filhote do Cérbero.', kind: 'filhotes', min: 5 },
  { id: 'despertar_filhotes_8', name: 'Octeto do Portão', desc: 'Comprou 8 upgrades Filhote do Cérbero.', kind: 'filhotes', min: 8 },
  { id: 'despertar_filhotes_10', name: 'Dez Coleiras de Ouro', desc: 'Comprou 10 upgrades Filhote do Cérbero.', kind: 'filhotes', min: 10 },
  { id: 'despertar_filhotes_15', name: 'Matilha Completa', desc: 'Comprou os 15 Filhotes do Cérbero.', kind: 'filhotes', min: 15 },
  { id: 'despertar_ausencia_10h', name: 'Vigília de Dez Horas', desc: 'Colheu offline por 10 horas acumuladas.', kind: 'offlineHours', min: 10 },
  { id: 'despertar_ausencia_24h', name: 'Dia no Submundo', desc: 'Colheu offline por 24 horas acumuladas.', kind: 'offlineHours', min: 24 },
  { id: 'despertar_ausencia_72h', name: 'Três Noites de Lethe', desc: 'Colheu offline por 72 horas acumuladas.', kind: 'offlineHours', min: 72 },
  { id: 'despertar_cliques_10k', name: 'Dez Mil Golpes', desc: 'Ceifou com 10.000 cliques na Foice.', kind: 'clicks', min: 10000 },
  { id: 'despertar_cliques_100k', name: 'Centena de Mil Lâminas', desc: 'Ceifou com 100.000 cliques na Foice.', kind: 'clicks', min: 100000 },
  { id: 'despertar_talentos_25', name: 'Vinte e Cinco Nós Celestes', desc: 'Desbloqueou 25 talentos Heavenly.', kind: 'talents', min: 25 },
  { id: 'despertar_talentos_50', name: 'Meio Céu Comprado', desc: 'Desbloqueou 50 talentos Heavenly.', kind: 'talents', min: 50 },
  { id: 'despertar_talentos_100', name: 'Constelação Mnemosyne', desc: 'Desbloqueou 100 talentos Heavenly.', kind: 'talents', min: 100 },
  { id: 'despertar_melhorias_50', name: 'Cinquenta Selos Styx', desc: 'Possui 50 melhorias permanentes.', kind: 'upgrades', min: 50 },
  { id: 'despertar_melhorias_100', name: 'Centenário de Melhorias', desc: 'Possui 100 melhorias permanentes.', kind: 'upgrades', min: 100 },
  { id: 'despertar_melhorias_150', name: 'Arquivo Saturado', desc: 'Possui 150 melhorias permanentes.', kind: 'upgrades', min: 150 },
  { id: 'despertar_juizo_50', name: 'Juízo Implacável', desc: 'Alcançou sequência de 50 no Juízo.', kind: 'juizo', min: 50 },
  { id: 'despertar_juizo_100', name: 'Sentença Perfeita', desc: 'Alcançou sequência de 100 no Juízo.', kind: 'juizo', min: 100 },
  { id: 'despertar_almas_1e39', name: 'Duodecilhão do Véu', desc: 'Ceifou 1 duodecilhão (1e39) de almas acumuladas.', kind: 'lifetime', min: '1000000000000000000000000000000000000000' },
  { id: 'despertar_sps_1e27', name: 'Caudal Octilhão', desc: 'Alcançou 1 octilhão (1e27) de Almas / s.', kind: 'sps', min: '1000000000000000000000000000' },
  { id: 'despertar_sps_1e33', name: 'Torrente Decilhão', desc: 'Alcançou 1 decilhão (1e33) de Almas / s.', kind: 'sps', min: '1000000000000000000000000000000000' },
  { id: 'despertar_ecos_777', name: 'Setecentos e Setenta e Sete Ecos', desc: 'Reivindicou 777 Ecos dourados.', kind: 'shimmers', min: 777 },
  { id: 'despertar_nectar_100', name: 'Centena de Gotas Lethe', desc: 'Colheu 100 unidades de Néctar no total.', kind: 'nectar', min: 100 },
  { id: 'despertar_nectar_1000', name: 'Mil Gotas da Memória', desc: 'Colheu 1000 unidades de Néctar no total.', kind: 'nectar', min: 1000 },
  { id: 'despertar_sanguessuga_500', name: 'Quinhentas Vísceras', desc: 'Estourou 500 Sanguessugas do Acheron.', kind: 'leeches', min: 500 },
  { id: 'despertar_sanguessuga_1000', name: 'Mil Banquetes Sombrios', desc: 'Estourou 1000 Sanguessugas do Acheron.', kind: 'leeches', min: 1000 },
  { id: 'despertar_prestigio_200', name: 'Duzentos Rios Cruzados', desc: 'Completou 200 Rituais do Lethe.', kind: 'prestige', min: 200 },
  { id: 'despertar_cliques_1m', name: 'Um Milhão de Golpes', desc: 'Ceifou com 1.000.000 cliques na Foice.', kind: 'clicks', min: 1000000 },
  { id: 'despertar_ausencia_168h', name: 'Semana no Submundo', desc: 'Colheu offline por 168 horas acumuladas.', kind: 'offlineHours', min: 168 },
];

function milestoneId(genId, qty) {
  const slug = GEN_SLUG[genId];
  if (!slug) throw new Error(`slug missing for ${genId}`);
  return `despertar_${slug}_${qty}`;
}

function buildFullMilestoneMap() {
  const map = {};
  for (const gen of GENERATORS) {
    const base = { ...(BASE_MILESTONES[gen.id] || {}) };
    const existingQty = new Set(Object.keys(base).map(Number));
    const extras = gen.tier <= 6 ? [...T1T6_EXTRA, ...LATE_MILESTONES] : LATE_MILESTONES;
    for (const qty of extras) {
      if (existingQty.has(qty)) continue;
      const id = milestoneId(gen.id, qty);
      base[qty] = id;
      existingQty.add(qty);
    }
    map[gen.id] = base;
  }
  return map;
}

function achEntry({ id, name, desc, meta, difficulty = 'mythic', xp = 40, art = 'despertar_soberania.webp', icon = '🏛️' }) {
  return {
    id,
    name,
    desc,
    icon,
    art,
    hidden: false,
    difficulty,
    rarity: difficulty === 'hard' ? 'gold' : difficulty === 'medium' ? 'silver' : 'rainbow',
    xp,
    meta: { family: 'despertar', kind: 'progress', ...meta },
  };
}

function buildNewAchievements(catalog, milestoneMap) {
  const have = new Set(catalog.achievements.map((a) => a.id));
  const out = [];

  for (const gen of GENERATORS) {
    const thresholds = milestoneMap[gen.id];
    const gName = GEN_DISPLAY[gen.id] || gen.id;
    for (const [qtyStr, achId] of Object.entries(thresholds)) {
      if (have.has(achId)) continue;
      const qty = Number(qtyStr);
      out.push(
        achEntry({
          id: achId,
          name: `${qty} ${gName}`,
          desc: `Mantém ${qty} unidades de ${gName}.`,
          meta: { generatorId: gen.id, milestone: qty },
          xp: qty >= 500 ? 55 : qty >= 300 ? 45 : 35,
        }),
      );
      have.add(achId);
    }
  }

  for (const rule of VOLUME_RULES) {
    if (have.has(rule.id)) continue;
    out.push(
      achEntry({
        id: rule.id,
        name: rule.name,
        desc: rule.desc,
        meta: { veilVolume: rule.kind, threshold: rule.min },
        xp: 30,
        difficulty: rule.kind === 'prestige' || rule.kind === 'filhotes' ? 'hard' : 'mythic',
      }),
    );
    have.add(rule.id);
  }

  return out;
}

function formatJsMilestoneMap(map) {
  const lines = ['const GENERATOR_MILESTONE_ACHIEVEMENTS = Object.freeze({'];
  for (const gen of GENERATORS) {
    const thresholds = map[gen.id];
    const inner = Object.entries(thresholds)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([q, id]) => `${q}: '${id}'`)
      .join(', ');
    lines.push(`  ${gen.id}: { ${inner} },`);
  }
  lines.push('});');
  return lines.join('\n');
}

function formatPhpMilestoneMap(map) {
  const lines = ['    public const DESPERTAR_GENERATOR_MILESTONE_ACHIEVEMENTS = ['];
  for (const gen of GENERATORS) {
    const thresholds = map[gen.id];
    const inner = Object.entries(thresholds)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([q, id]) => `${q} => '${id}'`)
      .join(', ');
    lines.push(`        '${gen.id}' => [${inner}],`);
  }
  lines.push('    ];');
  return lines.join('\n');
}

function formatJsVolumeEval() {
  const lines = [
    '  // --- Véu volume (gen-despertar-veil-achievements.mjs) ---',
    '  const pupSet = new Set(CERBERUS_PUP_UPGRADE_IDS);',
    '  const pupOwned = upgrades.filter((uid) => pupSet.has(uid)).length;',
    '  const offlineHours = Math.max(0, Number(state.offlineSecondsAccumulated ?? stats.offlineSeconds ?? stats.offline_seconds ?? 0)) / 3600;',
    '  const totalNectarVol = Math.max(Number(state.totalNectarHarvested ?? milestones.f5Nectar?.totalNectarHarvested ?? 0), 0);',
  ];
  for (const rule of VOLUME_RULES) {
    switch (rule.kind) {
      case 'prestige':
        lines.push(`  take('${rule.id}', prestigeCount >= ${rule.min});`);
        break;
      case 'filhotes':
        lines.push(`  take('${rule.id}', pupOwned >= ${rule.min});`);
        break;
      case 'offlineHours':
        lines.push(`  take('${rule.id}', offlineHours >= ${rule.min});`);
        break;
      case 'clicks':
        lines.push(`  take('${rule.id}', clicks >= ${rule.min});`);
        break;
      case 'talents':
        lines.push(`  take('${rule.id}', talents.length >= ${rule.min});`);
        break;
      case 'upgrades':
        lines.push(`  take('${rule.id}', upgrades.length >= ${rule.min});`);
        break;
      case 'juizo':
        lines.push(`  take('${rule.id}', juizoBest >= ${rule.min});`);
        break;
      case 'lifetime':
        lines.push(`  take('${rule.id}', cmp(lifetime, '${rule.min}') >= 0);`);
        break;
      case 'sps':
        lines.push(`  take('${rule.id}', cmp(sps, '${rule.min}') >= 0);`);
        break;
      case 'shimmers':
        lines.push(`  take('${rule.id}', shimmersClicked >= ${rule.min});`);
        break;
      case 'nectar':
        lines.push(`  take('${rule.id}', totalNectarVol >= ${rule.min});`);
        break;
      case 'leeches':
        lines.push(`  take('${rule.id}', leechesPopped >= ${rule.min});`);
        break;
      default:
        throw new Error(`kind ${rule.kind}`);
    }
  }
  return lines.join('\n');
}

function formatPhpVolumeEval() {
  const lines = [
    '        // --- Véu volume (gen-despertar-veil-achievements.mjs) ---',
    "        $pupSet = array_flip(DespertarCatalog::CERBERUS_PUP_UPGRADE_IDS);",
    '        $pupOwned = 0;',
    '        foreach ($upgrades as $uid) {',
    '            if (isset($pupSet[(string) $uid])) {',
    '                $pupOwned++;',
    '            }',
    '        }',
    "        $offlineHours = max(0, (int) ($state['offlineSecondsAccumulated'] ?? $stats['offline_seconds'] ?? $stats['offlineSeconds'] ?? 0)) / 3600;",
    "        $totalNectarVol = max((int) ($state['totalNectarHarvested'] ?? $f5Nectar['totalNectarHarvested'] ?? 0), 0);",
  ];
  for (const rule of VOLUME_RULES) {
    switch (rule.kind) {
      case 'prestige':
        lines.push(`        $take('${rule.id}', $prestigeCount >= ${rule.min});`);
        break;
      case 'filhotes':
        lines.push(`        $take('${rule.id}', $pupOwned >= ${rule.min});`);
        break;
      case 'offlineHours':
        lines.push(`        $take('${rule.id}', $offlineHours >= ${rule.min});`);
        break;
      case 'clicks':
        lines.push(`        $take('${rule.id}', $clicks >= ${rule.min});`);
        break;
      case 'talents':
        lines.push(`        $take('${rule.id}', count($talents) >= ${rule.min});`);
        break;
      case 'upgrades':
        lines.push(`        $take('${rule.id}', count($upgrades) >= ${rule.min});`);
        break;
      case 'juizo':
        lines.push(`        $take('${rule.id}', $juizoBest >= ${rule.min});`);
        break;
      case 'lifetime':
        lines.push(`        $take('${rule.id}', DespertarDecimal::cmp($lifetime, '${rule.min}') >= 0);`);
        break;
      case 'sps':
        lines.push(`        $take('${rule.id}', DespertarDecimal::cmp($sps, '${rule.min}') >= 0);`);
        break;
      case 'shimmers':
        lines.push(`        $take('${rule.id}', $shimmersClicked >= ${rule.min});`);
        break;
      case 'nectar':
        lines.push(`        $take('${rule.id}', $totalNectarVol >= ${rule.min});`);
        break;
      case 'leeches':
        lines.push(`        $take('${rule.id}', $leechesPopped >= ${rule.min});`);
        break;
      default:
        throw new Error(`kind ${rule.kind}`);
    }
  }
  return lines.join('\n');
}

function formatVeilTiersJs(baseTiers) {
  const all = [...baseTiers, ...VEIL_TIERS_EXTRA];
  const lines = ['export const VEIL_TIERS = Object.freeze(['];
  for (const t of all) {
    lines.push('  Object.freeze({');
    lines.push(`    id: '${t.id}',`);
    lines.push(`    name: '${t.name}',`);
    lines.push(`    minVeilPercent: ${t.minVeilPercent},`);
    lines.push(`    minAchievements: ${t.minAchievements},`);
    lines.push(`    color: '${t.color}',`);
    lines.push(`    spriteId: '${t.spriteId}',`);
    lines.push('  }),');
  }
  lines.push(']);');
  return lines.join('\n');
}

function formatVeilTiersPhp(baseTiers) {
  const all = [...baseTiers, ...VEIL_TIERS_EXTRA];
  const rows = all.map(
    (t) =>
      `        ['id' => '${t.id}', 'name' => '${t.name}', 'minVeilPercent' => ${t.minVeilPercent}, 'minAchievements' => ${t.minAchievements}, 'color' => '${t.color}', 'spriteId' => '${t.spriteId}'],`,
  );
  return `    public const VEIL_TIERS = [\n${rows.join('\n')}\n    ];`;
}

async function patchCatalog(newAchievements) {
  const raw = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
  raw.achievements.push(...newAchievements);
  await fs.writeFile(CATALOG_PATH, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
}

async function patchDespertarIdsPhp(ids) {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  const lines = ids.map((id) => `        '${id}',`).join('\n');
  const block = `    public const DESPERTAR_ACHIEVEMENT_IDS = [\n${lines}\n    ];`;
  const re = /    public const DESPERTAR_ACHIEVEMENT_IDS = \[[\s\S]*?\n    \];/;
  if (!re.test(src)) throw new Error('DESPERTAR_ACHIEVEMENT_IDS não encontrado');
  src = src.replace(re, block);
  await fs.writeFile(PHP_PATH, src);
}

async function patchMilestoneJs(map) {
  let src = await fs.readFile(JS_FORMULAS, 'utf8');
  const re = /const GENERATOR_MILESTONE_ACHIEVEMENTS = Object\.freeze\(\{[\s\S]*?\}\);/;
  if (!re.test(src)) throw new Error('GENERATOR_MILESTONE_ACHIEVEMENTS JS não encontrado');
  src = src.replace(re, formatJsMilestoneMap(map));
  await fs.writeFile(JS_FORMULAS, src);
}

async function patchMilestonePhp(map) {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  const re = /    public const DESPERTAR_GENERATOR_MILESTONE_ACHIEVEMENTS = \[[\s\S]*?\n    \];/;
  if (!re.test(src)) throw new Error('DESPERTAR_GENERATOR_MILESTONE_ACHIEVEMENTS PHP não encontrado');
  src = src.replace(re, formatPhpMilestoneMap(map));
  await fs.writeFile(PHP_PATH, src);
}

async function patchVolumeEvalJs(block) {
  let src = await fs.readFile(JS_FORMULAS, 'utf8');
  const startMark = '  // --- Véu volume (gen-despertar-veil-achievements.mjs) ---';
  const endMark = '  return earned;';
  const start = src.indexOf(startMark);
  const end = src.lastIndexOf(endMark);
  if (start >= 0 && end > start) {
    src = `${src.slice(0, start)}${block}\n\n  ${src.slice(end)}`;
  } else {
    const ret = src.lastIndexOf(endMark);
    if (ret < 0) throw new Error('return earned JS não encontrado');
    src = `${src.slice(0, ret)}${block}\n\n  ${src.slice(ret)}`;
  }
  await fs.writeFile(JS_FORMULAS, src);
}

async function patchVolumeEvalPhp(block) {
  let src = await fs.readFile(PHP_FORMULAS, 'utf8');
  const startMark = '        // --- Véu volume (gen-despertar-veil-achievements.mjs) ---';
  const endMark = '        return $earned;';
  const start = src.indexOf(startMark);
  const end = src.lastIndexOf(endMark);
  if (start >= 0 && end > start) {
    src = `${src.slice(0, start)}${block}\n\n        ${src.slice(end)}`;
  } else {
    const ret = src.lastIndexOf(endMark);
    if (ret < 0) throw new Error('return $earned PHP não encontrado');
    src = `${src.slice(0, ret)}${block}\n\n        ${src.slice(ret)}`;
  }
  await fs.writeFile(PHP_FORMULAS, src);
}

async function patchVeilTiersJs() {
  const { VEIL_TIERS } = await import('../js/hades-despertar/config/achievements.js');
  const base = VEIL_TIERS.filter((t) => !VEIL_TIERS_EXTRA.some((e) => e.id === t.id));
  let src = await fs.readFile(JS_ACH, 'utf8');
  const re = /export const VEIL_TIERS = Object\.freeze\(\[[\s\S]*?\]\);/;
  src = src.replace(re, formatVeilTiersJs([...base]));
  await fs.writeFile(JS_ACH, src);
}

async function patchVeilTiersPhp() {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  const baseFive = [
    { id: 'nevoa_cinzenta', name: 'Névoa Cinzenta', minVeilPercent: 0, minAchievements: 0, color: '#64748b', spriteId: 'veu_nevoa_cinzenta' },
    { id: 'aguas_estige', name: 'Águas do Estige', minVeilPercent: 52, minAchievements: 13, color: '#00a896', spriteId: 'veu_aguas_estige' },
    { id: 'corrente_lethe', name: 'Corrente do Lethe', minVeilPercent: 100, minAchievements: 25, color: '#7209b7', spriteId: 'veu_corrente_lethe' },
    { id: 'chama_phlegethon', name: 'Chama de Flegêton', minVeilPercent: 200, minAchievements: 50, color: '#d90429', spriteId: 'veu_chama_phlegethon' },
    { id: 'ouro_ancestral', name: 'Ouro Ancestral', minVeilPercent: 300, minAchievements: 75, color: '#cfa759', spriteId: 'veu_ouro_ancestral' },
  ];
  const re = /    public const VEIL_TIERS = \[[\s\S]*?\n    \];/;
  src = src.replace(re, formatVeilTiersPhp([...baseFive, ...VEIL_TIERS_EXTRA]));
  await fs.writeFile(PHP_PATH, src);
}

async function addCerberusIdsToPhp() {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  if (src.includes('CERBERUS_PUP_UPGRADE_IDS')) return;
  const { CERBERUS_PUP_UPGRADE_IDS } = await import('../js/hades-despertar/config/achievements.js');
  const lines = CERBERUS_PUP_UPGRADE_IDS.map((id) => `        '${id}',`).join('\n');
  const block = `\n    /** @var list<string> */\n    public const CERBERUS_PUP_UPGRADE_IDS = [\n${lines}\n    ];\n`;
  const anchor = '    public const VEIL_PERCENT_PER_ACHIEVEMENT = 4;';
  if (!src.includes(anchor)) throw new Error('anchor VEIL_PERCENT não encontrado');
  src = src.replace(anchor, `${anchor}${block}`);
  await fs.writeFile(PHP_PATH, src);
}

const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
const milestoneMap = buildFullMilestoneMap();
let newAch = buildNewAchievements(catalog, milestoneMap);

let normals = catalog.achievements.filter((a) => !a.shadow && !a.meta?.shadow).length;
if (normals + newAch.length < TARGET_NORMALS) {
  console.warn(`Ainda abaixo de ${TARGET_NORMALS} após lote planeado (${normals}+${newAch.length})`);
}

if (newAch.length > 0) {
  await patchCatalog(newAch);
  catalog.achievements.push(...newAch);
}

normals = catalog.achievements.filter((a) => !a.shadow && !a.meta?.shadow).length;
const despertarIds = catalog.achievements
  .filter((a) => a.meta?.family === 'despertar' || String(a.id).startsWith('despertar_'))
  .map((a) => a.id);

await patchMilestoneJs(milestoneMap);
await patchMilestonePhp(milestoneMap);
await patchDespertarIdsPhp(despertarIds);
await patchVeilTiersJs();
await patchVeilTiersPhp();

{
  let formSrc = await fs.readFile(JS_FORMULAS, 'utf8');
  if (!formSrc.includes('CERBERUS_PUP_UPGRADE_IDS')) {
    const imp = formSrc.match(/import \{([^}]+)\} from '\.\.\/config\/achievements\.js';/);
    if (!imp) throw new Error('import achievements.js não encontrado em formulas.js');
    const names = `${imp[1].trim()}, CERBERUS_PUP_UPGRADE_IDS`;
    formSrc = formSrc.replace(imp[0], `import { ${names} } from '../config/achievements.js';`);
    await fs.writeFile(JS_FORMULAS, formSrc);
  }
}

await addCerberusIdsToPhp();
await patchVolumeEvalJs(formatJsVolumeEval());
await patchVolumeEvalPhp(formatPhpVolumeEval());

const maxVeil = normals * 4;
console.log(JSON.stringify({ normals, added: newAch.length, despertarIds: despertarIds.length, maxVeilPercent: maxVeil }, null, 2));

if (normals < TARGET_NORMALS) {
  process.exitCode = 1;
  throw new Error(`normals ${normals} < ${TARGET_NORMALS}`);
}
