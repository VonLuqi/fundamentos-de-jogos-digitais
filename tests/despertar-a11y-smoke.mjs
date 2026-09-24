/**
 * Smoke Task 14 — Acessibilidade e mobile do Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-a11y-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpolatedSouls } from '../js/hades-despertar/ui/UIRenderer.js';
import { spawnReapParticles } from '../js/hades-despertar/ui/particles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contraste WCAG 2.x entre duas cores hex absolutas. */
export function contrastRatio(fg, bg) {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const indexJs = read('js/hades-despertar/index.js');
const pkg = read('package.json');

staticAssert(/id="despertar-reap"[^>]*type="button"|type="button"[^>]*id="despertar-reap"/.test(html)
  || html.includes('id="despertar-reap"'), 'altar Ceifar presente');
staticAssert(
  /<button[^>]*id="despertar-reap"[\s\S]*?<\/button>/.test(html),
  'Altar é <button> (não div/span)',
);
staticAssert(html.includes('role="tablist"'), 'tablist presente');
staticAssert(html.includes('role="tab"'), 'tabs com role=tab');
staticAssert(html.includes('role="tabpanel"'), 'tabpanels presentes');
staticAssert(
  /id="tab-mundo"[^>]*tabindex="0"|tabindex="0"[^>]*id="tab-mundo"/.test(html)
    || /id="tab-styx"[^>]*tabindex="0"|tabindex="0"[^>]*id="tab-styx"/.test(html),
  'aba ativa (Mundo) inicia com tabindex=0',
);
staticAssert(html.includes('viewport'), 'viewport meta (mobile)');

staticAssert(indexJs.includes('ArrowRight'), 'setas nas abas');
staticAssert(indexJs.includes('Home') && indexJs.includes('End'), 'Home/End nas abas');
staticAssert(indexJs.includes("closest('[role=\"tab\"]')") || indexJs.includes('closest(\'[role="tab"]\')'),
  'setas só quando o foco está numa aba');

staticAssert(css.includes('--despertar-styx: #00a896'), 'token atmosfera Styx preservado');
staticAssert(css.includes('--despertar-purple: #7209b7'), 'token atmosfera Lethe preservado');
staticAssert(css.includes('--despertar-styx-text'), 'token de texto Styx');
staticAssert(css.includes('--despertar-purple-text'), 'token de texto Lethe (clareado)');
staticAssert(css.includes('touch-action: manipulation'), 'touch-action evita zoom iOS');
staticAssert(css.includes('safe-area-inset-bottom'), 'HUD/página respeita safe-area');
staticAssert(css.includes('prefers-reduced-motion'), 'reduced-motion no CSS');
staticAssert(
  css.includes('.despertar-tab[aria-selected="true"]')
    && (css.includes('box-shadow') || css.includes('text-shadow')),
  'aba selecionada com glow (G5.1)',
);
staticAssert(html.includes('id="despertar-tutorial-toast"'), 'toast tutorial Lethe (C3)');
staticAssert(html.includes('id="despertar-tutorial-toast-dismiss"'), 'botão Entendi no toast');
staticAssert(/Entendi/.test(html), 'copy Entendi');
staticAssert(
  /id="despertar-tutorial-toast"[^>]*aria-live="polite"|aria-live="polite"[^>]*id="despertar-tutorial-toast"/.test(html)
    || (html.includes('id="despertar-tutorial-toast"') && html.includes('aria-live="polite"')),
  'toast com aria-live polite',
);
staticAssert(css.includes('.despertar-tutorial-toast'), 'CSS toast tutorial');
staticAssert(css.includes('#tab-lethe.is-just-unlocked'), 'CSS first unlock aba Lethe');
staticAssert(
  /prefers-reduced-motion: reduce[\s\S]*#tab-lethe\.is-just-unlocked/.test(css)
    || /#tab-lethe\.is-just-unlocked[\s\S]*prefers-reduced-motion/.test(css),
  'reduced-motion cobre aba Lethe unlock',
);

/* Fase F — Juramentos Selados (a11y grade + tip) */
const uiSrc = read('js/hades-despertar/ui/UIRenderer.js');
staticAssert(html.includes('id="sealed-tooltip"'), 'F3: #sealed-tooltip');
staticAssert(
  /id="sealed-tooltip"[^>]*role="tooltip"|role="tooltip"[^>]*id="sealed-tooltip"/.test(html)
    || (html.includes('id="sealed-tooltip"') && html.includes('role="tooltip"')),
  'F3: sealed tip role=tooltip',
);
staticAssert(html.includes('class="despertar-sealed-icons"'), 'F3: grade sealed-icons');
staticAssert(css.includes('.despertar-sealed-icons'), 'F3: CSS sealed-icons');
staticAssert(/gap:\s*2px/.test(css.match(/\.despertar-sealed-icons\s*\{[^}]+\}/s)?.[0] || ''), 'F3: gap denso');
staticAssert(uiSrc.includes("setAttribute('aria-label', def.name)"), 'F3: aria-label nos ícones');
staticAssert(
  uiSrc.includes("setAttribute('aria-describedby', 'sealed-tooltip')"),
  'F3: aria-describedby no tip Selados',
);
staticAssert(uiSrc.includes('#hideSealedTip') || uiSrc.includes('hideSealedTip'), 'F3: hideSealedTip');
staticAssert(
  /Escape[\s\S]*hideSealedTip|hideSealedTip[\s\S]*Escape/.test(uiSrc),
  'F3: Esc fecha tip Selados',
);
staticAssert(
  uiSrc.includes("btn.type = 'button'") || uiSrc.includes('btn.type = "button"'),
  'F3: botões tabáveis (type=button)',
);
staticAssert(
  uiSrc.includes("addEventListener('focus'") && uiSrc.includes("addEventListener('blur'"),
  'F3: focus/blur tip (teclado)',
);

const bg = '#0a0a0f';
const styxAtmosphere = '#00a896';
const purpleAtmosphere = '#7209b7';
const purpleText = '#a855f7';

staticAssert(
  contrastRatio(styxAtmosphere, bg) >= 4.5,
  `Styx texto/atmosfera vs fundo ≥ 4.5 (tem ${contrastRatio(styxAtmosphere, bg).toFixed(2)})`,
);
staticAssert(
  contrastRatio(purpleAtmosphere, bg) < 4.5,
  'atmosfera Lethe #7209b7 falha AA — por isso o texto usa token clareado',
);
staticAssert(
  contrastRatio(purpleText, bg) >= 4.5,
  `Lethe texto #a855f7 vs fundo ≥ 4.5 (tem ${contrastRatio(purpleText, bg).toFixed(2)})`,
);

staticAssert(pkg.includes('despertar-a11y-smoke.mjs'), 'npm run check inclui este smoke');

if (errors.length) {
  console.error('despertar-a11y-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('reduced-motion: interpolação de almas não adianta o saldo', () => {
  assert.equal(interpolatedSouls('100', '10', 0.5, true), '100');
  assert.notEqual(interpolatedSouls('100', '10', 0.5, false), '100');
});

await run('reduced-motion: partículas não spawnam', () => {
  const created = [];
  const host = {
    appendChild(node) {
      created.push(node);
      return node;
    },
    ownerDocument: {
      createElement(tag) {
        return {
          tagName: tag,
          className: '',
          style: { setProperty() {} },
          setAttribute() {},
          addEventListener() {},
        };
      },
    },
  };
  assert.equal(spawnReapParticles(host, { reducedMotion: true }), 0);
  assert.equal(created.length, 0);
});

await run('contraste WCAG dos acentos de texto', () => {
  assert.ok(contrastRatio('#00a896', '#0a0a0f') >= 4.5);
  assert.ok(contrastRatio('#a855f7', '#0a0a0f') >= 4.5);
  assert.ok(contrastRatio('#7209b7', '#0a0a0f') < 4.5);
});

await run('toast tutorial: show + Entendi esconde (C3)', async () => {
  const { showTutorialToast } = await import('../js/hades-despertar/ui/juice.js');
  const nodes = new Map();
  const makeEl = (id) => {
    const el = {
      id,
      hidden: true,
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); },
      },
      textContent: '',
      addEventListener(type, fn) {
        this._on = this._on || {};
        this._on[type] = fn;
      },
      click() { this._on?.click?.(); },
    };
    nodes.set(id, el);
    return el;
  };
  const toast = makeEl('despertar-tutorial-toast');
  const text = makeEl('despertar-tutorial-toast-text');
  const btn = makeEl('despertar-tutorial-toast-dismiss');
  const root = {
    getElementById(id) {
      return nodes.get(id) || null;
    },
  };
  assert.equal(showTutorialToast({ text: 'O Lethe se abre.', root, holdMs: 60_000 }), true);
  assert.equal(toast.hidden, false);
  assert.ok(toast.classList.contains('is-visible'));
  assert.equal(text.textContent, 'O Lethe se abre.');
  btn.click();
  assert.equal(toast.hidden, true);
  assert.equal(toast.classList.contains('is-visible'), false);
});

console.log(`\ndespertar-a11y-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
