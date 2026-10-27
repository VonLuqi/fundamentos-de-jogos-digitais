#!/usr/bin/env node
/**
 * Regenera Sinergias Vol. I/II canónicas (36) em upgrades.js + DespertarCatalog.php.
 * Mantém os 8 servos_* (grandma-types). Exporta LEGACY_SYNERGY_COSTS dos ids temáticos.
 * Uso: node scripts/gen-synergy-vol-catalog.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATOR_BY_ID } from '../js/hades-despertar/config/generators.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_PATH = path.join(root, 'js/hades-despertar/config/upgrades.js');
const PHP_PATH = path.join(root, 'backend/src/Services/Despertar/DespertarCatalog.php');

/** Custo Vol.I = max(baseCost)×1500; Vol.II = max×15_000_000 (≈×10k). */
function synergyCost(idA, idB, volume) {
  const ca = BigInt(GENERATOR_BY_ID[idA].baseCost);
  const cb = BigInt(GENERATOR_BY_ID[idB].baseCost);
  const max = ca > cb ? ca : cb;
  const mult = volume === 2 ? 15_000_000n : 1_500n;
  return (max * mult).toString();
}

/**
 * boosted ← base  means boosted gets +5%/base unit; base gets +0.1%/boosted unit.
 * Plan notation "hound ← chronos_loom" = boosted=hound, base=chronos_loom.
 */
const CANON = [
  // Vol. I
  { id: 'almanaques_do_destino_i', name: 'Almanaques do Destino Vol. I', blurb: 'Cães Cerberianos prevêem o plantio nas dobras do Tear de Cronos.', vol: 1, boosted: 'cerberian_hound', base: 'chronos_loom' },
  { id: 'magia_sismica_i', name: 'Magia Sísmica Vol. I', blurb: 'Juízes do Tártaro abalam a terra ao pé das Torres do Estige.', vol: 1, boosted: 'tartarus_judge', base: 'styx_tower' },
  { id: 'eletronica_quantica_i', name: 'Eletrônica Quântica Vol. I', blurb: 'Forjas de Phlegethon oscilam entre ser e não-ser nos Condensadores do Vazio.', vol: 1, boosted: 'phlegethon_forge', base: 'void_condenser' },
  { id: 'contratos_do_alem_i', name: 'Contratos do Além Vol. I', blurb: 'Tronos de Obsidiana assinam cláusulas pelos Portais do Érebo.', vol: 1, boosted: 'obsidian_throne', base: 'erebus_portal' },
  { id: 'paganismo_erebo_i', name: 'Paganismo do Érebo Vol. I', blurb: 'Templos de Mnemosyne invocam deuses melhor deixados além do Portal.', vol: 1, boosted: 'mnemosyne_temple', base: 'erebus_portal' },
  { id: 'saber_arcano_i', name: 'Saber Arcano Vol. I', blurb: 'Torres do Estige destilam o que os Laboratórios do Tártaro ousam especular.', vol: 1, boosted: 'styx_tower', base: 'tartarus_lab' },
  { id: 'combustivel_fossilisado_i', name: 'Combustível Fossilizado Vol. I', blurb: 'Juízes extraem combustível de civilizações mortas para as Barcas das Estrelas.', vol: 1, boosted: 'tartarus_judge', base: 'star_barge' },
  { id: 'minerios_primordiais_i', name: 'Minérios Primordiais Vol. I', blurb: 'O malhete do Juiz refina o metal mais doce nos athanores do Tártaro.', vol: 1, boosted: 'tartarus_judge', base: 'tartarus_lab' },
  { id: 'colheitas_infernais_i', name: 'Colheitas Infernais Vol. I', blurb: 'Matilhas cerberianas regam a margem com fogo dos Portais do Érebo.', vol: 1, boosted: 'cerberian_hound', base: 'erebus_portal' },
  { id: 'salto_parsec_i', name: 'Salto de Parsec Vol. I', blurb: 'Barcas das Estrelas cortam eras no Tear de Cronos.', vol: 1, boosted: 'star_barge', base: 'chronos_loom' },
  { id: 'verba_da_fisica_i', name: 'Verba da Física Vol. I', blurb: 'Tronos financiam colisores nos Condensadores do Vazio.', vol: 1, boosted: 'obsidian_throne', base: 'void_condenser' },
  { id: 'magia_luminosa_i', name: 'Magia Luminosa Vol. I', blurb: 'Torres do Estige refratam juramentos nos Prismas das Moiras.', vol: 1, boosted: 'styx_tower', base: 'moirai_prism' },
  { id: 'talismas_cravejados_i', name: 'Talismãs Cravejados Vol. I', blurb: 'Juízes do Tártaro selam sortes nas Forjas do Destino.', vol: 1, boosted: 'tartarus_judge', base: 'fate_forge' },
  { id: 'espelhos_recursivos_i', name: 'Espelhos Recursivos Vol. I', blurb: 'Prismas das Moiras apontam uns aos outros nos Motores Fractais.', vol: 1, boosted: 'moirai_prism', base: 'fractal_engine' },
  { id: 'avoas_script_i', name: 'Avós de Script Vol. I', blurb: 'Servos de Caronte hackeiam o Console do Oráculo com néctar energético.', vol: 1, boosted: 'charon_servants', base: 'oracle_console' },
  { id: 'cosmos_mil_folhas_i', name: 'Cosmos Mil-Folhas Vol. I', blurb: 'Portais do Érebo atravessam camadas de Idleversos Ctonianos.', vol: 1, boosted: 'erebus_portal', base: 'chthonic_idleverse' },
  { id: 'pensamentos_e_preces_i', name: 'Pensamentos e Preces Vol. I', blurb: 'Templos de Mnemosyne ensinam sacralidade aos Padeiros do Córtex.', vol: 1, boosted: 'mnemosyne_temple', base: 'cortex_baker' },
  { id: 'desenvolvimento_acelerado_i', name: 'Desenvolvimento Acelerado Vol. I', blurb: 'O Tear de Cronos amadurece avatares d’O Imperador em um só salto.', vol: 1, boosted: 'chronos_loom', base: 'the_emperor' },
  // Vol. II
  { id: 'oracao_da_chuva_ii', name: 'Oração da Chuva Vol. II', blurb: 'Cães Cerberianos dançam sob o aspergimento dos Templos de Mnemosyne.', vol: 2, boosted: 'cerberian_hound', base: 'mnemosyne_temple' },
  { id: 'mineracao_asteroide_ii', name: 'Mineração de Asteroides Vol. II', blurb: 'Juízes escavam cometas para as Barcas das Estrelas — com o suborno certo.', vol: 2, boosted: 'tartarus_judge', base: 'star_barge' },
  { id: 'overclock_temporal_ii', name: 'Overclock Temporal Vol. II', blurb: 'Forjas de Phlegethon batem no ritmo acelerado do Tear de Cronos.', vol: 2, boosted: 'phlegethon_forge', base: 'chronos_loom' },
  { id: 'prensas_de_obolo_ii', name: 'Prensas de Óbolo Vol. II', blurb: 'Forjas imprimem tributo tão real que quase vale o ferro do Trono.', vol: 2, boosted: 'phlegethon_forge', base: 'obsidian_throne' },
  { id: 'particula_divina_ii', name: 'Partícula Divina Vol. II', blurb: 'Templos descobrem que o divino cabe num Condensador do Vazio.', vol: 2, boosted: 'mnemosyne_temple', base: 'void_condenser' },
  { id: 'botanica_magica_ii', name: 'Botânica Mágica Vol. II', blurb: 'Matilhas e Torres do Estige cultivam juramentos geneticamente selados.', vol: 2, boosted: 'cerberian_hound', base: 'styx_tower' },
  { id: 'estaleiros_estigios_ii', name: 'Estaleiros Estígios Vol. II', blurb: 'Forjas e Barcas unem carpintaria, sorte e amianto astral.', vol: 2, boosted: 'phlegethon_forge', base: 'star_barge' },
  { id: 'fundo_de_ouro_ii', name: 'Fundo de Ouro Vol. II', blurb: 'Tronos de Obsidiana lastreiam a economia dos Laboratórios do Tártaro.', vol: 2, boosted: 'obsidian_throne', base: 'tartarus_lab' },
  { id: 'brilho_abissal_ii', name: 'Brilho Abissal Vol. II', blurb: 'Portais do Érebo sentem o olhar dos Prismas das Moiras.', vol: 2, boosted: 'erebus_portal', base: 'moirai_prism' },
  { id: 'fulgor_primitivo_ii', name: 'Fulgor Primitivo Vol. II', blurb: 'O Tear de Cronos ainda brilha com a luz antiga dos Prismas.', vol: 2, boosted: 'chronos_loom', base: 'moirai_prism' },
  { id: 'pericia_quimica_ii', name: 'Perícia Química Vol. II', blurb: 'Laboratórios e Condensadores inventam Fleshmeltium e Carbono++.', vol: 2, boosted: 'tartarus_lab', base: 'void_condenser' },
  { id: 'energias_misticas_ii', name: 'Energias Místicas Vol. II', blurb: 'Templos aquecem sob a luz cancerígena dos Prismas das Moiras.', vol: 2, boosted: 'mnemosyne_temple', base: 'moirai_prism' },
  { id: 'quarks_encantados_ii', name: 'Quarks Encantados Vol. II', blurb: 'Condensadores do Vazio caçam a sorte nas Forjas do Destino.', vol: 2, boosted: 'void_condenser', base: 'fate_forge' },
  { id: 'camundongos_clicando_ii', name: 'Camundongos Clicando Vol. II', blurb: 'Sombras Vagantes e Motores Fractais — blasfêmia recursiva absoluta.', vol: 2, boosted: 'wandering_shade', base: 'fractal_engine' },
  { id: 'tombola_oracular_ii', name: 'Tômbola Oracular Vol. II', blurb: 'Forjas do Destino sorteiam tickets no Console do Oráculo.', vol: 2, boosted: 'fate_forge', base: 'oracle_console' },
  { id: 'infraversos_ii', name: 'Infraversos e Superversos Vol. II', blurb: 'Motores Fractais aninham Idleversos dentro de Idleversos.', vol: 2, boosted: 'fractal_engine', base: 'chthonic_idleverse' },
  { id: 'mentes_ferteis_ii', name: 'Mentes Férteis Vol. II', blurb: 'Cães Cerberianos guardam as hortas que alimentam os Padeiros do Córtex.', vol: 2, boosted: 'cerberian_hound', base: 'cortex_baker' },
  { id: 'revisao_por_pares_ii', name: 'Revisão por Pares Vol. II', blurb: 'Consoles do Oráculo triplicam a vigilância d’O Imperador.', vol: 2, boosted: 'oracle_console', base: 'the_emperor' },
];

const LEGACY_SYNERGY_COSTS = {
  cortejo_das_margens_i: '150000',
  cortejo_das_margens_ii: '1500000000',
  brasa_cruzada_i: '2100000000',
  brasa_cruzada_ii: '21000000000000',
  guardiao_dos_umbrais_i: '300000000',
  guardiao_dos_umbrais_ii: '3000000000000',
  jurisprudencia_arcana_i: '4950000000',
  jurisprudencia_arcana_ii: '49500000000000',
  alquimia_estelar_i: '1125000000000',
  alquimia_estelar_ii: '11250000000000000',
  trama_do_erebo_i: '210000000000000',
  trama_do_erebo_ii: '2100000000000000000',
  refracao_do_vazio_i: '31500000000000000',
  refracao_do_vazio_ii: '315000000000000000000',
  geometria_do_acaso_i: '4650000000000000000',
  geometria_do_acaso_ii: '46500000000000000000000',
  compilacao_multiversal_i: '180000000000000000000000',
  compilacao_multiversal_ii: '1800000000000000000000000000',
  soberania_psiquica_i: '8100000000000000000000000000',
  soberania_psiquica_ii: '81000000000000000000000000000000',
};

function buildDefs() {
  return CANON.map((row) => {
    const qty = row.vol === 2 ? 75 : 15;
    const talentId = row.vol === 2 ? 'sinergias_vol_ii' : 'sinergias_vol_i';
    return {
      id: row.id,
      name: row.name,
      blurb: row.blurb,
      cost: synergyCost(row.boosted, row.base, row.vol),
      kind: 'synergyMult',
      baseGeneratorId: row.base,
      boostedGeneratorId: row.boosted,
      baseBonusPerBoosted: '0.001',
      boostedBonusPerBase: '0.05',
      requires: {
        talentId,
        minGenerators: {
          [row.boosted]: qty,
          [row.base]: qty,
        },
      },
    };
  });
}

function formatJsBlock(defs) {
  const lines = ['  // --- Sinergias Vol. I e Vol. II (malha canónica wiki CC) ---'];
  for (const d of defs) {
    const mg = Object.entries(d.requires.minGenerators)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    lines.push('  {');
    lines.push(`    id: '${d.id}',`);
    lines.push(`    name: '${d.name.replace(/'/g, "\\'")}',`);
    lines.push(`    blurb: '${d.blurb.replace(/'/g, "\\'")}',`);
    lines.push(`    cost: '${d.cost}',`);
    lines.push(`    kind: 'synergyMult',`);
    lines.push(`    baseGeneratorId: '${d.baseGeneratorId}',`);
    lines.push(`    boostedGeneratorId: '${d.boostedGeneratorId}',`);
    lines.push(`    baseBonusPerBoosted: '${d.baseBonusPerBoosted}',`);
    lines.push(`    boostedBonusPerBase: '${d.boostedBonusPerBase}',`);
    lines.push(`    requires: { talentId: '${d.requires.talentId}', minGenerators: { ${mg} } },`);
    lines.push('  },');
  }
  return lines.join('\n');
}

function formatPhpEntries(defs) {
  const chunks = [];
  for (const d of defs) {
    const mg = Object.entries(d.requires.minGenerators)
      .map(([k, v]) => `'${k}' => ${v}`)
      .join(', ');
    chunks.push(`        [
            'id' => '${d.id}',
            'cost' => '${d.cost}',
            'kind' => 'synergyMult',
            'baseGeneratorId' => '${d.baseGeneratorId}',
            'boostedGeneratorId' => '${d.boostedGeneratorId}',
            'baseBonusPerBoosted' => '${d.baseBonusPerBoosted}',
            'boostedBonusPerBase' => '${d.boostedBonusPerBase}',
            'requires' => ['talentId' => '${d.requires.talentId}', 'minGenerators' => [${mg}]],
        ]`);
  }
  return chunks.join(',\n');
}

function formatLegacyJs() {
  const entries = Object.entries(LEGACY_SYNERGY_COSTS)
    .map(([k, v]) => `  ${k}: '${v}',`)
    .join('\n');
  return `/** Custos de sinergias temáticas pré-malha wiki (refund em almas). */\nexport const LEGACY_SYNERGY_COSTS = Object.freeze({\n${entries}\n});\n`;
}

function formatLegacyPhp() {
  const entries = Object.entries(LEGACY_SYNERGY_COSTS)
    .map(([k, v]) => `        '${k}' => '${v}',`)
    .join('\n');
  return `    public const LEGACY_SYNERGY_COSTS = [\n${entries}\n    ];\n`;
}

async function patchJs(defs) {
  let src = await fs.readFile(JS_PATH, 'utf8');
  const start = src.indexOf('  // --- Sinergias Vol. I e Vol. II');
  const servosId = src.indexOf("id: 'servos_do_vazio'");
  if (start < 0 || servosId < 0) {
    throw new Error(`Marcadores de sinergia/servos não encontrados em upgrades.js (${start}, ${servosId})`);
  }
  // Início do objeto `{` imediatamente antes do id servos.
  const servos = src.lastIndexOf('{', servosId);
  const block = `${formatJsBlock(defs)}\n\n  `;
  src = `${src.slice(0, start)}${block}${src.slice(servos)}`;

  if (!src.includes('LEGACY_SYNERGY_COSTS')) {
    // Append export before final helpers if present, else at end after UPGRADES freeze.
    const anchor = 'export const UPGRADE_BY_ID';
    if (src.includes(anchor)) {
      src = src.replace(anchor, `${formatLegacyJs()}\n${anchor}`);
    } else {
      src += `\n${formatLegacyJs()}`;
    }
  } else {
    src = src.replace(
      /\/\*\* Custos de sinergias[\s\S]*?export const LEGACY_SYNERGY_COSTS = Object\.freeze\(\{[\s\S]*?\}\);\n/,
      formatLegacyJs(),
    );
  }

  await fs.writeFile(JS_PATH, src);
}

async function patchPhp(defs) {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  const start = src.indexOf('        // --- Sinergias Vol. I e Vol. II');
  const servosId = src.indexOf("'id' => 'servos_do_vazio'");
  if (start < 0 || servosId < 0) {
    throw new Error(`Marcadores de sinergia/servos não encontrados em DespertarCatalog.php (${start}, ${servosId})`);
  }
  const servosEntry = src.lastIndexOf('[', servosId);
  const block = `        // --- Sinergias Vol. I e Vol. II (malha canónica wiki CC) ---\n${formatPhpEntries(defs)},\n\n        `;
  src = `${src.slice(0, start)}${block}${src.slice(servosEntry)}`;

  if (!src.includes('LEGACY_SYNERGY_COSTS')) {
    const talentAnchor = 'public const LEGACY_TALENT_COSTS';
    if (src.includes(talentAnchor)) {
      src = src.replace(talentAnchor, `${formatLegacyPhp()}\n    ${talentAnchor}`);
    } else {
      src = src.replace(
        'public const LETHE_REBALANCE_V2_MILESTONE',
        `${formatLegacyPhp()}\n    public const LETHE_REBALANCE_V2_MILESTONE`,
      );
    }
  } else {
    src = src.replace(
      /public const LEGACY_SYNERGY_COSTS = \[[\s\S]*?\];\n/,
      formatLegacyPhp(),
    );
  }

  await fs.writeFile(PHP_PATH, src);
}

const defs = buildDefs();
if (defs.length !== 36) throw new Error(`esperava 36, got ${defs.length}`);
await patchJs(defs);
await patchPhp(defs);
console.log(`wrote ${defs.length} sinergias canónicas + LEGACY_SYNERGY_COSTS`);
console.log('sample', defs[0].id, defs[0].cost, defs[18].id, defs[18].cost);
