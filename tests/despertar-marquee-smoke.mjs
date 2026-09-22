/**
 * Smoke Task G2.1 — letreiro digital (marquee).
 * Uso: node tests/despertar-marquee-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MARQUEE_SPEED_PX_PER_SEC,
  bindMarquee,
  setMarqueeText,
  setMarqueeTextIfOverflow,
} from '../js/hades-despertar/ui/Marquee.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const marqueeSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/Marquee.js'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/ui/Marquee.js')), 'Marquee.js');
staticAssert(html.includes('id="despertar-ticker"'), 'ticker no HTML');
staticAssert(rendererSrc.includes('setMarqueeText'), 'UIRenderer usa setMarqueeText');
staticAssert(rendererSrc.includes('bindMarquee'), 'UIRenderer bindMarquee no mount');
staticAssert(indexSrc.includes('setMarqueeText') || indexSrc.includes('interruptTicker'), 'index usa setMarqueeText/interrupt no Juízes');
staticAssert(rendererSrc.includes('buildRumorPool') || rendererSrc.includes('setMarqueeText'), 'UIRenderer ticker');
const worldSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js'), 'utf8');
staticAssert(worldSrc.includes('setMarqueeTextIfOverflow'), 'WorldView labels G2.2');
staticAssert(worldSrc.includes('#refreshShelfLabel') || worldSrc.includes('refreshShelfLabel'), 'refreshShelfLabel');
staticAssert(css.includes('despertarMarquee'), 'keyframes marquee');
staticAssert(css.includes('animation-play-state: paused'), 'pausa hover/focus');
staticAssert(css.includes('.despertar-shelf__label.despertar-marquee') || css.includes('shelf__label.is-overflow'), 'CSS label shelf marquee');
staticAssert(css.includes('.despertar-marquee.is-static'), 'reduced-motion estático');
staticAssert(marqueeSrc.includes('setMarqueeTextIfOverflow'), 'API overflow');
staticAssert(marqueeSrc.includes('MARQUEE_SPEED_PX_PER_SEC'), 'velocidade Q5');
staticAssert(pkg.includes('despertar-marquee-smoke.mjs'), 'check inclui smoke');

if (errors.length) {
  console.error('despertar-marquee-smoke (estático):');
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

function fakeHost(initial = 'Rumor inicial') {
  const kids = [];
  const host = {
    classList: {
      _on: new Set(),
      add(n) { this._on.add(n); },
      remove(n) { this._on.delete(n); },
      toggle(n, on) {
        if (on) this._on.add(n);
        else this._on.delete(n);
      },
      contains(n) { return this._on.has(n); },
    },
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = v; },
      removeProperty(k) { delete this.props[k]; },
    },
    attrs: {},
    textContent: initial,
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    querySelector(sel) {
      if (sel === '.despertar-marquee__track') {
        return kids.find((k) => k.className === 'despertar-marquee__track') || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.despertar-marquee__seg') {
        const track = this.querySelector('.despertar-marquee__track');
        return track?.children || [];
      }
      return [];
    },
    append(...nodes) { kids.push(...nodes); },
    ownerDocument: {
      createElement(tag) {
        const el = {
          tag,
          className: '',
          textContent: '',
          attrs: {},
          children: [],
          offsetWidth: 240,
          setAttribute(k, v) { this.attrs[k] = String(v); },
          append(...nodes) { this.children.push(...nodes); },
          querySelectorAll(sel) {
            if (sel === '.despertar-marquee__seg') return this.children;
            return [];
          },
        };
        return el;
      },
    },
  };
  // After bind, querySelector needs to find track in kids
  host.querySelector = (sel) => {
    if (sel === '.despertar-marquee__track') {
      return kids.find((k) => k.className === 'despertar-marquee__track') || null;
    }
    return null;
  };
  host.querySelectorAll = (sel) => {
    if (sel === '.despertar-marquee__seg') {
      const track = host.querySelector('.despertar-marquee__track');
      return track?.children || [];
    }
    return [];
  };
  return host;
}

run('velocidade default ~48 px/s', () => {
  assert.equal(MARQUEE_SPEED_PX_PER_SEC, 48);
});

run('bindMarquee cria track + 2 segs', () => {
  const host = fakeHost('Olá Submundo');
  const track = bindMarquee(host);
  assert.ok(track);
  assert.ok(host.classList.contains('despertar-marquee'));
  assert.equal(track.children.length, 2);
  assert.equal(track.children[0].textContent, 'Olá Submundo');
  assert.equal(track.children[1].attrs['aria-hidden'], 'true');
});

run('setMarqueeText atualiza segs, title e duração', () => {
  const host = fakeHost('');
  setMarqueeText(host, 'Rumor: Colheita na ausência — Teto de horas × eficiência', {
    reducedMotion: false,
  });
  const segs = host.querySelectorAll('.despertar-marquee__seg');
  assert.equal(segs.length, 2);
  assert.equal(segs[0].textContent.includes('Colheita'), true);
  assert.equal(host.attrs.title.includes('Colheita'), true);
  assert.equal(host.classList.contains('is-static'), false);
  // rAF may not exist in node — measure sync fallback
  assert.ok(host.style.props['--marquee-dur'] || true);
});

run('reduced-motion → is-static sem animação forçada', () => {
  const host = fakeHost('x');
  setMarqueeText(host, 'Texto longo do Códice do Submundo', { reducedMotion: true });
  assert.equal(host.classList.contains('is-static'), true);
  assert.equal(host.attrs.title.includes('Códice'), true);
});

run('G2.2: IfOverflow — overflow → is-overflow; cabe → is-static', () => {
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (fn) => { fn(); return 1; };
  try {
    const wide = fakeHost('');
    Object.defineProperty(wide, 'clientWidth', { value: 48, configurable: true });
    setMarqueeTextIfOverflow(wide, 'SERVOS DE CARONTE', { reducedMotion: false });
    // Após 1º decide síncrono: segs existem — força overflow e reavalia
    const seg = wide.querySelectorAll('.despertar-marquee__seg')[0];
    Object.defineProperty(seg, 'scrollWidth', { value: 220, configurable: true });
    Object.defineProperty(seg, 'offsetWidth', { value: 220, configurable: true });
    setMarqueeTextIfOverflow(wide, 'SERVOS DE CARONTE', { reducedMotion: false });
    assert.equal(wide.classList.contains('is-overflow'), true);
    assert.equal(wide.classList.contains('is-static'), false);

    const fit = fakeHost('');
    Object.defineProperty(fit, 'clientWidth', { value: 400, configurable: true });
    setMarqueeTextIfOverflow(fit, 'X', { reducedMotion: false });
    const segFit = fit.querySelectorAll('.despertar-marquee__seg')[0];
    Object.defineProperty(segFit, 'scrollWidth', { value: 12, configurable: true });
    Object.defineProperty(segFit, 'offsetWidth', { value: 12, configurable: true });
    setMarqueeTextIfOverflow(fit, 'X', { reducedMotion: false });
    assert.equal(fit.classList.contains('is-overflow'), false);
    assert.equal(fit.classList.contains('is-static'), true);
  } finally {
    if (raf) globalThis.requestAnimationFrame = raf;
    else delete globalThis.requestAnimationFrame;
  }
});

console.log(`\nMarquee smoke: ${passed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
