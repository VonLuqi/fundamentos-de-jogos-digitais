/**
 * Smoke — menu mobile, arco-íris stacking e Almas admin-only
 * (docs/plano-correcao-menu-mobile-arcoiris-almas.md — Fase 4).
 *
 * Uso: node tests/menu-arcoiris-almas-smoke.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notes = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const shellPages = [
  'pages/dashboard.html',
  'pages/aulas.html',
  'pages/conquistas.html',
  'pages/companheiro.html',
  'pages/salao-espiritual.html',
  'pages/grimorio.html',
  'pages/grimorio-editar.html',
  'pages/aula1.html',
  'pages/aula2.html',
  'pages/aula3.html',
];

const appShellCss = read('css/app-shell.css');
const achievementsUi = read('js/achievements-ui.js');
const appShellJs = read('js/app-shell.js');
const dashboardJs = read('js/dashboard.js');
const conquistasCss = read('css/conquistas.css');
const dashboardCss = read('css/dashboard.css');
const soulsJs = read('js/souls.js');
const apiJs = read('js/api.js');

/* --- C1 Aluno: Almas oculto (markup + CSS + JS) --- */
shellPages.forEach((rel) => {
  const html = read(rel);
  const soulsLink = html.match(/<a[^>]*data-nav-item="souls"[^>]*>[\s\S]*?<\/a>/);
  assert(Boolean(soulsLink), `${rel}: precisa do link data-nav-item=souls`);
  if (soulsLink) {
    assert(soulsLink[0].includes('data-admin-only'), `${rel}: Almas precisa de data-admin-only`);
    assert(/\shidden([\s>])/.test(soulsLink[0]), `${rel}: Almas precisa do atributo hidden no HTML`);
  }

  const minigameLink = html.match(/<a[^>]*data-nav-item="minigame"[^>]*>[\s\S]*?<\/a>/);
  assert(Boolean(minigameLink), `${rel}: precisa do link data-nav-item=minigame`);
  if (minigameLink) {
    assert(minigameLink[0].includes('data-feature-gate="arcane_survivors"'), `${rel}: minigame precisa de data-feature-gate`);
    assert(minigameLink[0].includes('is-locked'), `${rel}: minigame começa com is-locked no HTML`);
    assert(/aria-disabled="true"/.test(minigameLink[0]), `${rel}: minigame começa aria-disabled=true`);
  }
});

assert(
  appShellCss.includes('.app-shell__link.is-locked'),
  'app-shell.css deve estilizar links de feature selados (.is-locked)'
);
assert(
  appShellJs.includes('applyNavFeatureGates')
    && appShellJs.includes('data-feature-gate')
    && appShellJs.includes('ARCANE_SURVIVORS_FEATURE_ID'),
  'app-shell.js deve aplicar selo de feature no nav'
);
assert(
  apiJs.includes('featureGates')
    && apiJs.includes('setFeatureGate')
    && apiJs.includes('ARCANE_SURVIVORS_FEATURE_ID'),
  'api.js deve expor fetch/set do gate Arcane Survivors'
);
assert(
  dashboardJs.includes('btn-toggle-minigame')
    && dashboardJs.includes('setFeatureGate'),
  'dashboard.js deve permitir admin destravar/travar o minigame'
);
notes.push('Arcane Survivors: nav selado + toggle admin ok (smoke estático)');

assert(
  appShellCss.includes('display: none !important')
    && appShellCss.includes('[data-admin-only][hidden]'),
  'app-shell.css deve forçar [hidden] em admin-only (Fase 1)'
);
assert(
  appShellJs.includes("role === 'admin'")
    && appShellJs.includes('data-admin-only')
    && appShellJs.includes('item.hidden'),
  'app-shell.js deve esconder data-admin-only quando role !== admin'
);
notes.push('C1 Aluno/Almas: CSS+JS+markup ok (smoke estático; validar login aluno no device)');

/* --- C2 Admin: Almas visível quando role admin --- */
assert(
  appShellJs.includes("const allow = role === 'admin'"),
  'admin deve liberar data-admin-only (allow = role === admin)'
);
notes.push('C2 Admin/Almas: lógica allow=admin ok');

/* --- C1/C2 Menu mobile densidade (sem scroll típico) --- */
assert(
  appShellCss.includes('min-height: 2.75rem'),
  'mobile ≤980px: links com min-height 2.75rem (densidade Fase 2)'
);
assert(
  appShellCss.includes('max-height: 640px')
    && appShellCss.includes('min-height: 2.55rem'),
  'mobile altura curta: densidade extra 2.55rem'
);
assert(
  appShellCss.includes('gap: 0.75rem'),
  'sidebar mobile deve reduzir gap para 0.75rem'
);
assert(
  !appShellCss.includes('min-height: 3.45rem'),
  'não deve restar min-height 3.45rem inflado no mobile (regressão Fase 2)'
);
notes.push('C1/C2 Menu: densidade CSS ok (altura estimada admin+notch ~584px < 640)');

/* --- C3 Rainbow não cobre header --- */
assert(
  /RAINBOW_VFX_CANVAS_Z_INDEX\s*=\s*25/.test(achievementsUi),
  'canvas VFX deve usar z-index 25 (abaixo do header 40)'
);
assert(
  achievementsUi.includes('pinRainbowVfxCanvasLayer')
    && achievementsUi.includes('canvas.style.zIndex'),
  'deve pininar zIndex no canvas (lib pode ignorar option)'
);
assert(
  appShellCss.includes('z-index: 40'),
  'header mobile permanece z-index 40 (> canvas 25)'
);

assert(
  /\.achievement-slot\.is-unlocked\[data-rarity='rainbow'\][\s\S]*?overflow:\s*hidden/.test(conquistasCss),
  'slot rainbow álbum: overflow hidden (não visible)'
);
assert(
  !/\.achievement-slot\.is-unlocked\[data-rarity='rainbow'\][\s\S]{0,120}?overflow:\s*visible/.test(conquistasCss),
  'slot rainbow não deve declarar overflow visible'
);
assert(
  /\.achievement-slot\s*\{[^}]*overflow:\s*hidden/.test(conquistasCss)
    && /\.achievement-slot\s*\{[^}]*contain:\s*paint/.test(conquistasCss),
  'achievement-slot base: overflow hidden + contain paint'
);
assert(
  /\.achievement-card\s*\{[^}]*overflow:\s*hidden/.test(dashboardCss)
    && /\.achievement-card\s*\{[^}]*contain:\s*paint/.test(dashboardCss),
  'achievement-card hub: overflow hidden + contain paint'
);
notes.push('C3 Rainbow/header: z-index 25 + contain ok');

/* --- C4 Drawer suspende VFX --- */
assert(
  appShellJs.includes('setRainbowVfxSuspended')
    && appShellJs.includes("'shell-drawer'"),
  'drawer deve suspender VFX com reason shell-drawer'
);
assert(
  achievementsUi.includes('rainbowVfxSuspendReasons')
    && achievementsUi.includes("reason = 'default'"),
  'suspend deve aceitar reasons concorrentes'
);
notes.push('C4 Menu+rainbow: shell-drawer suspend ok');

/* --- C5 Modal avatar / regressão --- */
assert(
  dashboardJs.includes("setRainbowVfxSuspended(true, 'scroll-modal')")
    && dashboardJs.includes("setRainbowVfxSuspended(false, 'scroll-modal')"),
  'scroll-modal deve suspender VFX com reason scroll-modal'
);
assert(
  dashboardCss.includes('.scroll-modal') && dashboardCss.includes('z-index: 80'),
  'scroll-modal z-index 80 acima do canvas 25'
);
assert(
  conquistasCss.includes('.relic-modal') && conquistasCss.includes('z-index: 80'),
  'relic-modal z-index 80'
);
notes.push('C5 Modais: scroll-modal + relic-modal acima do VFX');

/* --- C6 Desktop + defesa souls --- */
assert(
  apiJs.includes('export async function requireAdmin')
    && apiJs.includes("role !== 'admin'"),
  'requireAdmin deve redirecionar não-admin'
);
assert(
  soulsJs.includes('requireAdmin'),
  'souls.js deve chamar requireAdmin'
);
notes.push('C6 Desktop/defesa: requireAdmin + souls ok');

/* --- Syntax check dos JS tocados --- */
[
  'js/app-shell.js',
  'js/achievements-ui.js',
  'js/dashboard.js',
].forEach((rel) => {
  const result = spawnSync(process.execPath, ['--check', path.join(root, rel)], {
    encoding: 'utf8',
  });
  assert(result.status === 0, `node --check ${rel} falhou: ${result.stderr || result.stdout}`);
});

console.log('Smoke menu / arco-íris / Almas (Fase 4)\n');
notes.forEach((n) => console.log(`  · ${n}`));

if (errors.length) {
  console.error(`\nFALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`\nOK — ${notes.length} cenários cobertos estaticamente.`);
console.log('Manual restante: login aluno/admin no device (Brave/Android) para scrollbar visual + glitch vivo.');
