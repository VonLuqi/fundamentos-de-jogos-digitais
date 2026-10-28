/**
 * Smoke — Foice 3D: corte diagonal variável, volta ao descanso, fallback sem WebGL e orçamento.
 * O render WebGL em si é conferido no navegador (tmp/foice3d-harness.html); aqui vai o que é lógica.
 * Uso: node tests/despertar-foice3d-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Foice3D, rollSlash, slashPose, stepGrab } from '../js/hades-despertar/ui/world/Foice3D.js';
import { foiceModelUrl } from '../js/hades-despertar/ui/world/SpriteAtlas.js';
import { ART_VERSIONS } from '../js/hades-despertar/config/art-versions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// 1. Cada clique sorteia uma diagonal diferente — mas sempre no sentido do fio (puxão para a mão,
//    giro horário). Cortar com o dorso da lâmina não faz sentido.
let seed = 11;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const slashes = Array.from({ length: 40 }, () => rollSlash(random));
assert.ok(slashes.every((s) => s.tiltDeg >= 30 && s.tiltDeg <= 65), 'inclinação 30°–65°');
assert.ok(new Set(slashes.map((s) => Math.round(s.tiltDeg))).size > 15, 'diagonais variam entre cliques');
assert.ok(slashes.every((s) => s.dir === 1 && s.angleDeg === s.tiltDeg), 'rastro 2D sempre desce para a direita');
assert.ok(slashes.every((s) => s.lunge[0] > 0 && s.lunge[1] < 0), 'golpe puxa para baixo/direita (para a mão)');
assert.ok(slashes.every((s) => s.axis[2] > 0.7), 'eixo perto da tela: o sentido do giro não inverte');
const leans = slashes.map((s) => Math.hypot(s.axis[0], s.axis[1]));
assert.ok(Math.min(...leans) > 0.25 && new Set(leans.map((l) => l.toFixed(2))).size > 15, 'plano do golpe inclinado e variado (3D)');

// 2. O corte começa e termina na pose base (sem "pulo"); no golpe gira no sentido do fio.
for (const s of slashes.slice(0, 8)) {
  const start = slashPose(s, 0);
  const end = slashPose(s, 2000);
  assert.ok(Math.abs(start.angle) < 1e-9 && start.scale === 1, 'começa na pose base');
  assert.ok(Math.abs(end.angle) < 1e-6 && Math.abs(end.scale - 1) < 1e-6 && end.flash < 1e-6, 'termina na pose base');
  assert.equal(end.done, true);
  const windup = slashPose(s, 100);
  assert.ok(windup.angle > 0 && windup.offX < 0 && windup.offY > 0, 'preparação: sobe para o alto/esquerda');
  assert.ok(windup.offZ < 0, 'preparação: afasta da câmera');
  const mid = slashPose(s, 150);
  const later = slashPose(s, 190);
  assert.ok(later.angle < mid.angle && later.offX > mid.offX && later.offY < mid.offY, 'golpe: horário, descendo para a direita');
  assert.equal(mid.emit, true, 'o fio deixa rastro no golpe');
  const hit = slashPose(s, 240);
  assert.ok(hit.angle < 0 && hit.flash === 1 && hit.shake > 0.5, 'hit-stop passa da mão com flash e tranco');
  assert.equal(slashPose(s, 50).emit, false, 'preparação não deixa rastro');
}

// 2b. Pegada: a mola leva de solta (0) a empunhada (1) rápido, com leve tranco, e volta.
let g = { value: 0, velocity: 0 };
let peak = 0;
for (let i = 0; i < 30; i += 1) { g = stepGrab(g.value, g.velocity, 1, 1 / 60); peak = Math.max(peak, g.value); }
assert.ok(Math.abs(g.value - 1) < 0.03, `empunha em ~0,5 s (${g.value.toFixed(3)})`);
assert.ok(peak > 1 && peak < 1.12, `tranco curto ao agarrar (pico ${peak.toFixed(3)})`);
for (let i = 0; i < 60; i += 1) g = stepGrab(g.value, g.velocity, 0, 1 / 60);
assert.ok(Math.abs(g.value) < 0.03, 'solta de novo');
assert.ok(Number.isFinite(stepGrab(0, 0, 1, 5).value), 'dt enorme (aba voltando) não explode');

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
assert.equal(foice.grab, 0, 'sem 3D não há pegada');

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
assert.match(rule, /mask-image:/, 'bordas do canvas suaves (empunhada sai do quadro sem corte reto)');
assert.match(src, /pointerenter/, 'ponteiro no altar empunha a Foice');
assert.match(indexSrc, /if \(slash && !foice3d\.ready\)/, 'rastro 2D só sem 3D (no 3D a fita é do próprio fio)');

console.log('despertar-foice3d-smoke: ok');
