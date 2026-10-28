/**
 * Smoke — Foice 3D: corte diagonal variável, volta ao descanso, fallback sem WebGL e orçamento.
 * O render WebGL em si é conferido no navegador (tmp/foice3d-harness.html); aqui vai o que é lógica.
 * Uso: node tests/despertar-foice3d-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Foice3D, rollSlash, slashPose } from '../js/hades-despertar/ui/world/Foice3D.js';
import { foiceModelUrl } from '../js/hades-despertar/ui/world/SpriteAtlas.js';
import { ART_VERSIONS } from '../js/hades-despertar/config/art-versions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// 1. Cada clique sorteia uma diagonal diferente, alternando de lado com frequência.
let seed = 11;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const slashes = [];
let lastDir = 0;
for (let i = 0; i < 40; i += 1) {
  const s = rollSlash(random, { lastDir });
  lastDir = s.dir;
  slashes.push(s);
}
assert.ok(slashes.every((s) => s.tiltDeg >= 20 && s.tiltDeg <= 65), 'inclinação 20°–65°');
assert.ok(new Set(slashes.map((s) => Math.round(s.tiltDeg))).size > 15, 'ângulos variam entre cliques');
const flips = slashes.slice(1).filter((s, i) => s.dir !== slashes[i].dir).length;
assert.ok(flips >= 20 && flips < 39, `alterna de lado na maioria das vezes, sem ficar previsível (${flips}/39)`);
assert.ok(slashes.some((s) => s.dir > 0) && slashes.some((s) => s.dir < 0));

// 2. O corte começa e termina na pose de descanso (sem "pulo"), e passa pelo golpe.
for (const s of slashes.slice(0, 8)) {
  const start = slashPose(s, 0);
  const end = slashPose(s, 2000);
  assert.ok(Math.abs(start.rotZ) < 1e-9 && start.scale === 1, 'começa no descanso');
  assert.ok(Math.abs(end.rotZ) < 1e-6 && Math.abs(end.scale - 1) < 1e-6 && end.flash < 1e-6, 'termina no descanso');
  assert.equal(end.done, true);
  const peak = slashPose(s, 230);
  assert.ok(Math.sign(peak.rotZ) === s.dir && Math.abs(peak.rotZ) > 1, 'golpe gira na direção sorteada');
  assert.equal(peak.flash, 1, 'flash no hit-stop');
}

// 3. Sem WebGL: não baixa o modelo, não mexe na imagem estática.
const img = { hidden: false };
const button = { querySelector: () => img, classList: { add() {}, remove() {} } };
const noGl = { createElement: () => ({ getContext: () => null }) };
let imported = false;
const foice = new Foice3D({ button, modelUrl: 'x.glb', document: noGl, loadThree: async () => { imported = true; return {}; } });
assert.equal(await foice.load(), false);
assert.equal(foice.failed, true);
assert.equal(imported, false, 'three.js nem é importado sem WebGL');
assert.equal(img.hidden, false, 'imagem estática continua visível');
foice.frame(1000); // não quebra sem renderer
assert.ok(foice.slash(1000).dir, 'clique ainda sorteia o corte (rastro) mesmo sem 3D');

// 4. three.js falhou ao carregar → fallback para a imagem.
const glDoc = { createElement: () => ({ getContext: () => ({}) }) };
const broken = new Foice3D({ button, modelUrl: 'x.glb', document: glDoc, loadThree: async () => { throw new Error('rede'); } });
const warn = console.warn;
console.warn = () => {};
assert.equal(await broken.load(), false);
console.warn = warn;
assert.equal(img.hidden, false);

// 5. Orçamento: sem RAF próprio; o GameLoop chama frame(); modelo otimizado e versionado.
const src = read('js/hades-despertar/ui/world/Foice3D.js');
assert.ok(!/requestAnimationFrame\s*\(/.test(src), 'Foice3D não tem requestAnimationFrame próprio');
assert.ok(/^\s*import\s/m.test(src) === false, 'three.js só por import() dinâmico');
const indexSrc = read('js/hades-despertar/index.js');
assert.match(indexSrc, /renderer\.render\(alpha, meta\);\s*\n\s*foice3d\?\.frame\(performance\.now\(\)\);/, 'frame() dentro do render do GameLoop');
assert.match(indexSrc, /requestIdleCallback\(startFoice3d/, 'carrega depois do primeiro paint');
const glb = path.join(root, 'assets/despertar/sprites/foice/foice-3d.glb');
const size = fs.statSync(glb).size;
assert.ok(size < 1.2e6, `foice-3d.glb otimizado (${(size / 1e6).toFixed(2)} MB)`);
assert.ok(foiceModelUrl().endsWith(`foice-3d.glb?v=${ART_VERSIONS.foice}`), 'URL do modelo com versão de cache');
const page = read('pages/despertar.html');
assert.match(page, /"three": "\.\.\/js\/vendor\/three\/three\.module\.min\.js"/);
assert.match(page, /"three\/addons\/": "\.\.\/js\/vendor\/three\/addons\/"/);
for (const f of ['three.module.min.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/BufferGeometryUtils.js', 'addons/environments/RoomEnvironment.js', 'LICENSE']) {
  assert.ok(fs.existsSync(path.join(root, 'js/vendor/three', f)), `vendor three: ${f}`);
}
assert.match(read('.htaccess'), /AddType model\/gltf-binary \.glb/);

// 6. Layout: o canvas mede o botão (não a si mesmo) — senão cresce em loop e some da coluna.
assert.match(src, /this\.button\.clientWidth/, '#resize mede o botão');
assert.match(src, /MAX_CANVAS_CSS/, 'tamanho do canvas tem teto');
const css = read('css/despertar.css');
const rule = css.match(/\.despertar-reap\.has-foice-3d \.despertar-reap__foice--3d \{([^}]*)\}/)?.[1] || '';
assert.match(rule, /position: absolute;/, 'canvas fora do fluxo do grid');
assert.match(rule, /pointer-events: none;/, 'canvas não rouba o clique do botão');
assert.match(rule, /filter: none !important;/, 'sem filtro CSS no canvas WebGL');

console.log('despertar-foice3d-smoke: ok');
