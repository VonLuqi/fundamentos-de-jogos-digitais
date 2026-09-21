/**
 * Smoke — wizard IARC + pitches procedurais + capas ClassInd-dle
 * Uso: node tests/aula5-iarc-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PITCHES } from '../js/aula5/config/pitches.js';
import { generateProceduralPitch } from '../js/aula5/config/procedural-pitches.js';
import {
  buildNotesFromWizard,
  buildPatchNote,
  buildSummaryFromWizard,
} from '../js/aula5/iarc-wizard.js';
import { ROUNDS } from '../js/classind-dle/config/rounds.js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(c, m) {
  if (!c) errors.push(m);
}

const coversDir = path.join(root, 'assets', 'classind-dle', 'covers');
const coverFiles = fs.readdirSync(coversDir).filter((n) => n.endsWith('.webp'));
assert(coverFiles.length >= 20, `esperava ≥20 webp (foi ${coverFiles.length})`);
assert(coverFiles.every((n) => /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(n)), 'capas com slug canônico');
assert(!coverFiles.some((n) => /[A-Z ]/.test(n)), 'sem maiúsculas/espaços nos webp');

for (const needed of [
  'the-sims-4.webp',
  'hollow-knight.webp',
  'doom-eternal.webp',
  'cuphead.webp',
  'blasphemous.webp',
]) {
  assert(coverFiles.includes(needed), `capa ${needed}`);
}

assert(PITCHES.length === 4, '4 pitches preset');
assert(PITCHES.every((p) => ['16', '18'].includes(p.originalRating)), 'presets 16/18');

const procedural = generateProceduralPitch();
assert(Boolean(procedural?.title), 'procedural gera título');
assert(['16', '18'].includes(procedural.originalRating), 'procedural 16/18');
assert(Boolean(procedural.coreLoop), 'procedural tem loop-core');
assert(Boolean(procedural.axes?.violencia), 'procedural tem eixos');

const another = generateProceduralPitch();
assert(Boolean(another?.title), 'segundo procedural ok');

const pitch = procedural;
const data = {
  pitch,
  visual: 'robôs e faíscas',
  narrative: 'invasão de autômatos',
  reward: 'bateria mágica',
  enemies: 'drones',
  coreLoop: pitch.coreLoop,
  argumentsText: 'não-humanos sem sangue + cura fantástica = L',
  targetRating: 'L',
};
const note = buildPatchNote(data);
assert(note.includes('# Patch Note de Higienização'), 'patch title');
assert(note.includes('Livre (L)'), 'faixa L');
assert(note.includes('bateria mágica'), 'conteúdo reescrita');
assert(note.includes(pitch.title), 'patch cita pitch procedural');
assert(!/Insight do ClassInd-dle/i.test(note), 'patch sem insight');
assert(buildNotesFromWizard(data).includes(pitch.title), 'notes pitch');
assert(!buildNotesFromWizard(data).includes('Insight do ClassInd-dle'), 'notes sem insight');
assert(buildSummaryFromWizard(data).includes('ClassInd'), 'summary');

const html = fs.readFileSync(path.join(root, 'pages', 'aula5.html'), 'utf8');
assert(html.includes('iarc-wizard-root'), 'mount wizard');
assert(html.includes('aula5-iarc.css'), 'css wizard');
assert(!html.includes('id="config-notes"'), 'sem anotações na página');
assert(!/Material da atividade/i.test(html), 'sem material baixável na Oficina');

const wizardSrc = fs.readFileSync(path.join(root, 'js', 'aula5', 'iarc-wizard.js'), 'utf8');
assert(wizardSrc.includes('generateProceduralPitch'), 'wizard usa procedural');
assert(wizardSrc.includes('iarc-new-challenge'), 'botão Novo desafio');
assert(wizardSrc.includes('iarc-preset'), 'botão Usar exemplo');
assert(wizardSrc.includes('iarc-finalize'), 'botão Finalizar aula');
assert(!wizardSrc.includes('iarc-pitch'), 'sem select de exemplo');
assert(!wizardSrc.includes('iarc-insight'), 'sem campo insight');
assert(!wizardSrc.includes('Aplicar nas anotações'), 'sem aplicar em anotações');
assert(wizardSrc.includes('iarc-wizard__actions--stack'), 'passo 5 com stack de ações');

const aula5js = fs.readFileSync(path.join(root, 'js', 'aula5.js'), 'utf8');
assert(aula5js.includes('initIarcWizard'), 'aula5 importa wizard');
assert(aula5js.includes('onFinalize'), 'finalize grava parágrafo');

assert(ROUNDS.length >= 6, 'deck ≥6');
const withCover = ROUNDS.filter((r) => r.sideA.cover || r.sideB.cover);
assert(withCover.length >= 4, 'várias rodadas com capa');

for (const rel of [
  'js/aula5/iarc-wizard.js',
  'js/aula5/config/pitches.js',
  'js/aula5/config/procedural-pitches.js',
  'scripts/normalize-classind-covers.mjs',
]) {
  try {
    require('child_process').execFileSync(process.execPath, ['--check', path.join(root, rel)], { stdio: 'pipe' });
  } catch (error) {
    errors.push(`syntax ${rel}: ${error.stderr?.toString() || error.message}`);
  }
}

if (errors.length) {
  console.error('aula5-iarc-smoke FALHOU:');
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}
console.log('aula5-iarc-smoke OK');
