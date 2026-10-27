#!/usr/bin/env node
/**
 * Gera a ladder completa de 15 Filhotes (veilMult) → upgrades.js, PHP UPGRADES, CERBERUS_PUP_UPGRADE_IDS.
 * Uso: node scripts/gen-cerberus-pup-catalog.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_UPGRADES = path.join(root, 'js/hades-despertar/config/upgrades.js');
const JS_ACHIEVEMENTS = path.join(root, 'js/hades-despertar/config/achievements.js');
const PHP_PATH = path.join(root, 'backend/src/Services/Despertar/DespertarCatalog.php');

/** id, factor, minVeilPercent, cost */
const LADDER = [
  ['filhote_vigia_estige', '0.1', 52, '9000000'],
  ['filhote_rastreador_asfodelos', '0.125', 100, '9000000000'],
  ['filhote_forjador_phlegethon', '0.15', 200, '90000000000000'],
  ['filhote_supervisor_tartaro', '0.175', 300, '90000000000000000'],
  ['filhote_intendente_erebo', '0.2', 400, '90000000000000000000'],
  ['filhote_arauto_lethe', '0.2', 500, '90000000000000000000000'],
  ['cerbero_conselheiro_tartaro', '0.2', 600, '90000000000000000000000000'],
  ['filhote_experto_erebo', '0.2', 700, '90000000000000000000000000000'],
  ['filhote_consultor_styx', '0.2', 800, '90000000000000000000000000000000'],
  ['filhote_assistente_regional', '0.175', 900, '90000000000000000000000000000000000'],
  ['filhote_mercador_acheron', '0.15', 1000, '90000000000000000000000000000000000000'],
  ['filhote_analista_moiras', '0.125', 1100, '90000000000000000000000000000000000000000'],
  ['filhote_executivo_hades', '0.115', 1200, '90000000000000000000000000000000000000000000'],
  ['filhote_admin_tartaro', '0.11', 1300, '90000000000000000000000000000000000000000000000'],
  ['filhote_estrategista_olimpo', '0.105', 1400, '90000000000000000000000000000000000000000000000000'],
];

const META = {
  filhote_vigia_estige: {
    name: 'Filhote Vigia do Estige',
    blurb: 'Os primeiros filhotes farejam o Véu do Acheron e aceleram as margens.',
  },
  filhote_rastreador_asfodelos: {
    name: 'Filhote Rastreador de Asfódelos',
    blurb: 'Três focinhos atentos que pastoreiam as almas pelos campos cinzentos.',
  },
  filhote_forjador_phlegethon: {
    name: 'Filhote Forjador do Phlegethon',
    blurb: 'Bafejam enxofre nas fornalhas e transformam a névoa de conquistas em brasa pura.',
  },
  filhote_supervisor_tartaro: {
    name: 'Filhote Supervisor do Tártaro',
    blurb: 'Rosnam em três tons harmónicos para manter cada oficina do Tártaro no compasso.',
  },
  filhote_intendente_erebo: {
    name: 'Filhote Intendente do Érebo',
    blurb: 'Organizam as caravanas sombrias com disciplina tripla e coleiras de ouro.',
  },
  filhote_arauto_lethe: {
    name: 'Filhote Arauto do Lethe',
    blurb: 'Bebem da espuma sagrada do Véu sem esquecer um único comando do Trono.',
  },
  cerbero_conselheiro_tartaro: {
    name: 'Cérbero Conselheiro do Tártaro',
    blurb: 'A matilha primordial senta-se aos pés de Hades; cada conquista ecoa em produção absoluta.',
  },
  filhote_experto_erebo: {
    name: 'Filhote Experto do Érebo',
    blurb: 'Audita sombras nas galerias do Érebo e converte cada selo de conquista em margem líquida.',
  },
  filhote_consultor_styx: {
    name: 'Filhote Consultor do Styx',
    blurb: 'Negocia contratos trifásicos à beira do rio negro; o Véu obedece como cláusula.',
  },
  filhote_assistente_regional: {
    name: 'Filhote Assistente Regional',
    blurb: 'Supervisiona cinco domínios menores com três latidos simultâneos e um único relatório.',
  },
  filhote_mercador_acheron: {
    name: 'Filhote Mercador do Acheron',
    blurb: 'Troca ecos de glória por juros compostos nas docas do Acheron.',
  },
  filhote_analista_moiras: {
    name: 'Filhote Analista das Moiras',
    blurb: 'Lê o fio das conquistas como planilha e prevê o próximo salto de produção.',
  },
  filhote_executivo_hades: {
    name: 'Filhote Executivo de Hades',
    blurb: 'Apresenta trimestres infernais ao Trono; cada slide é mais +4% de Véu.',
  },
  filhote_admin_tartaro: {
    name: 'Filhote Admin do Tártaro',
    blurb: 'Arquiva petições de almas e devolve apenas os formulários que multiplicam o caudal.',
  },
  filhote_estrategista_olimpo: {
    name: 'Filhote Estrategista do Olimpo',
    blurb: 'Olha o Olimpo de baixo para cima e ainda assim dobra as margens do Submundo.',
  },
};

function escapeJs(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatJsBlock() {
  const lines = [
    '  // --- Fase F4: Linhagem Filhotes do Cérbero (Kitten Upgrades / Véu do Acheron) — gerado ---',
  ];
  for (const [id, factor, minVeil, cost] of LADDER) {
    const { name, blurb } = META[id];
    lines.push('  {');
    lines.push(`    id: '${id}',`);
    lines.push(`    name: '${escapeJs(name)}',`);
    lines.push(`    blurb: '${escapeJs(blurb)}',`);
    lines.push(`    cost: '${cost}',`);
    lines.push("    kind: 'veilMult',");
    lines.push(`    factor: '${factor}',`);
    lines.push(`    requires: { minVeilPercent: ${minVeil} },`);
    lines.push('  },');
  }
  return lines.join('\n');
}

function formatPhpRows() {
  return LADDER.map(
    ([id, factor, minVeil, cost]) =>
      `        ['id' => '${id}', 'cost' => '${cost}', 'kind' => 'veilMult', 'factor' => '${factor}', 'requires' => ['minVeilPercent' => ${minVeil}]],`,
  ).join('\n');
}

function formatCerberusIdsJs() {
  const ids = LADDER.map(([id]) => `  '${id}',`).join('\n');
  return `export const CERBERUS_PUP_UPGRADE_IDS = Object.freeze([\n${ids}\n]);`;
}

async function patchUpgradesJs() {
  let src = await fs.readFile(JS_UPGRADES, 'utf8');
  const start = src.indexOf('  // --- Fase F4: Linhagem Filhotes do Cérbero');
  const end = src.indexOf('  // --- Fase F6: Centro de Pesquisa Estígio');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Marcadores Filhotes/F6 não encontrados (${start}, ${end})`);
  }
  src = `${src.slice(0, start)}${formatJsBlock()}\n\n${src.slice(end)}`;
  await fs.writeFile(JS_UPGRADES, src);
}

async function patchPhpUpgrades() {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  const start = src.indexOf('        // --- Fase F4: Linhagem Filhotes do Cérbero');
  const end = src.indexOf('        // --- Fase F6: Centro de Pesquisa Estígio');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Marcadores PHP Filhotes/F6 não encontrados (${start}, ${end})`);
  }
  const block = `        // --- Fase F4: Linhagem Filhotes do Cérbero (Kitten Upgrades / Véu do Acheron) — gerado ---\n${formatPhpRows()}\n\n        `;
  src = `${src.slice(0, start)}${block}${src.slice(end)}`;
  await fs.writeFile(PHP_PATH, src);
}

async function patchCerberusIds() {
  let src = await fs.readFile(JS_ACHIEVEMENTS, 'utf8');
  const re = /export const CERBERUS_PUP_UPGRADE_IDS = Object\.freeze\(\[[\s\S]*?\]\);/;
  if (!re.test(src)) throw new Error('CERBERUS_PUP_UPGRADE_IDS não encontrado');
  src = src.replace(re, formatCerberusIdsJs());
  await fs.writeFile(JS_ACHIEVEMENTS, src);
}

if (LADDER.length !== 15) throw new Error(`esperava 15 filhotes, got ${LADDER.length}`);

await patchUpgradesJs();
await patchPhpUpgrades();
await patchCerberusIds();

console.log(`wrote ${LADDER.length} Filhotes veilMult (fortune_103 permanece separado)`);
console.log('sample', LADDER[0][0], LADDER[14][0], LADDER[14][2]);
