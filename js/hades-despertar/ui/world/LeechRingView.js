/**
 * LeechRingView (Fase F6 — Sanguessugas do Acheron / Wrinklers + Controles da Catábase).
 *
 * Regras de orçamento (Fase Perf & A11y):
 * - Zero `requestAnimationFrame` próprio e zero `getBoundingClientRect` por frame.
 * - Pre-aloca os 14 slots radiais de Sanguessugas (`LEECH_MAX_CAP`) na montagem e apenas
 *   alterna `hidden`, `className` e `title` / `aria-label` na cadência lenta / on-dirty do UIRenderer.
 * - Respeita `prefers-reduced-motion` e `fancy: false` (aplica classe `.is-static` para congelar contorção).
 * - Dispara feedback flutuante via Object Pool (`acquirePooledNode` / `releasePooledNode`) ao estourar.
 */

import { CATABASE_STAGES } from '../../config/catabase.js';
import { LEECH_MAX_CAP } from '../../config/constants.js';
import { cmp } from '../../core/decimal.js';
import { formatSouls } from '../NumberFormatter.js';
import { acquirePooledNode, releasePooledNode } from '../particles.js';
import { catabaseSprite, createSpriteNode } from './SpriteAtlas.js';

/** Brasas visíveis por estágio da Catábase (0 = nenhuma). */
const CATABASE_MOTE_COUNT = Object.freeze([0, 6, 12, 20]);
const CATABASE_BOLT_COUNT = Object.freeze([0, 0, 4, 10]);

/** Pseudo-aleatório determinístico por slot (−1..1) — scatter estável entre syncs. */
function leechSlotNoise(slot, salt = 0) {
  const n = Math.imul(Math.floor(Number(slot) || 0) + 1 + salt * 17, 1103515245) + 12345;
  return (((n >>> 0) % 2001) / 1000) - 1;
}

export function leechSlotPolarPosition(slot = 0, maxSlots = 10) {
  const cap = Math.max(1, Math.min(LEECH_MAX_CAP, Number(maxSlots) || 10));
  const idx = Math.max(0, Math.min(cap - 1, Math.floor(Number(slot) || 0)));
  const nA = leechSlotNoise(idx, 1);
  const nR = leechSlotNoise(idx, 2);
  const nJ = leechSlotNoise(idx, 3);
  const nK = leechSlotNoise(idx, 4);
  // Ângulo irregular (±~14°) e raio orgânico — boca perto da Foice, corpo pra fora.
  const angleRad = ((idx / cap) * Math.PI * 2) - (Math.PI / 2) + nA * 0.25;
  const radiusPct = 38 + nR * 5.5;
  const xPct = Number((50 + Math.cos(angleRad) * radiusPct).toFixed(2));
  const yPct = Number((50 + Math.sin(angleRad) * radiusPct).toFixed(2));
  const deg = Number(((angleRad * 180) / Math.PI + 90 + nA * 4).toFixed(1));
  return {
    xPct,
    yPct,
    deg,
    jitterXPx: Number((nJ * 5).toFixed(2)),
    jitterYPx: Number((nK * 4).toFixed(2)),
    delaySec: Number((Math.abs(nA) * 0.55 + idx * 0.11).toFixed(2)),
    phaseSec: Number((1.6 + Math.abs(nR) * 0.9).toFixed(2)),
  };
}

export class LeechRingView {
  constructor(options = {}) {
    this._doc = options.document || (typeof document !== 'undefined' ? document : null);
    this._onPopLeech = typeof options.onPopLeech === 'function' ? options.onPopLeech : null;
    this._onActivatePledge = typeof options.onActivatePledge === 'function' ? options.onActivatePledge : null;
    this._onToggleCovenant = typeof options.onToggleCovenant === 'function' ? options.onToggleCovenant : null;
    this._stageHost = null;
    this._particleLayer = null;
    this._floatLayer = null;
    this._activeFloats = [];
    this._ringEl = null;
    this._pactBar = null;
    this._stageBadge = null;
    this._researchBadge = null;
    this._pledgeBtn = null;
    this._covenantBtn = null;
    this._slotButtons = [];
    this._slotSips = [];
    this._popOrigin = null;
    this._stageBackdrop = null;
    this._moteLayer = null;
    this._motes = [];
    this._bolts = [];
    this._lastStageSpriteId = null;
  }

  mount({ stageHost = null, particleLayer = null, floatLayer = null, altarCol = null } = {}) {
    this._stageHost = stageHost;
    this._particleLayer = particleLayer;
    this._floatLayer = floatLayer
      || this._doc?.querySelector?.('[data-float-layer]')
      || particleLayer
      || null;
    // Limpa floats órfãos de builds antigas (classe sem CSS / release quebrado).
    this.#sweepStaleFloats();
    if (!this._doc?.createElement) return this;

    if (this._stageHost && !this._stageBackdrop) {
      const backdrop = this._doc.createElement('div');
      backdrop.className = 'despertar-catabase-stage-bg';
      backdrop.id = 'despertar-catabase-stage-bg';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.hidden = true;
      this._stageBackdrop = backdrop;
      this._stageHost.prepend?.(backdrop);
    }

    if (this._stageHost && !this._ringEl) {
      const ring = this._doc.createElement('div');
      ring.className = 'despertar-leech-ring';
      ring.id = 'despertar-leech-ring';
      ring.setAttribute('role', 'group');
      ring.setAttribute('aria-label', 'Sanguessugas do Acheron ancoradas na Foice');
      ring.hidden = true;

      for (let slot = 0; slot < LEECH_MAX_CAP; slot += 1) {
        const btn = this._doc.createElement('button');
        btn.type = 'button';
        btn.className = 'despertar-leech';
        btn.dataset.leechSlot = String(slot);
        btn.hidden = true;
        btn.addEventListener?.('click', (event) => {
          event?.stopPropagation?.();
          const style = btn.style;
          const read = (name) => style?.getPropertyValue?.(name)
            || style?.props?.[name]
            || '';
          this._popOrigin = {
            x: read('--leech-x'),
            y: read('--leech-y'),
            shiny: Boolean(btn.classList?.contains?.('is-shiny')),
          };
          this._onPopLeech?.(slot);
        });
        const spriteHost = createSpriteNode(
          this._doc,
          catabaseSprite('sanguessuga_normal'),
          { className: 'despertar-sprite despertar-leech__sprite' },
        );
        btn.append?.(spriteHost);
        const sips = [];
        for (let i = 0; i < 3; i += 1) {
          const sip = this._doc.createElement('span');
          sip.className = 'despertar-leech__sip';
          sip.setAttribute?.('aria-hidden', 'true');
          sip.style?.setProperty?.('--sip-d', `${(i * 0.42).toFixed(2)}s`);
          sip.style?.setProperty?.('--sip-dur', `${(1.15 + i * 0.22).toFixed(2)}s`);
          sips.push(sip);
        }
        this._slotSips.push(sips);
        this.#attachSips(btn, sips);
        ring.append?.(btn);
        this._slotButtons.push(btn);
      }

      this._ringEl = ring;
      this._stageHost.append?.(ring);
    }

    if (this._stageHost && !this._moteLayer) {
      const layer = this._doc.createElement('div');
      layer.className = 'despertar-catabase-motes';
      layer.id = 'despertar-catabase-motes';
      layer.setAttribute('aria-hidden', 'true');
      layer.hidden = true;
      const total = CATABASE_MOTE_COUNT[CATABASE_MOTE_COUNT.length - 1];
      for (let i = 0; i < total; i += 1) {
        const mote = this._doc.createElement('span');
        mote.className = 'despertar-catabase-mote';
        mote.hidden = true;
        const drift = ((i % 5) - 2) * 10;
        mote.style?.setProperty?.('--mx', `${10 + ((i * 37) % 80)}%`);
        mote.style?.setProperty?.('--my', `${18 + ((i * 19) % 58)}%`);
        mote.style?.setProperty?.('--md', `${((i * 0.23) % 2.6).toFixed(2)}s`);
        mote.style?.setProperty?.('--mdur', `${(2.4 + (i % 4) * 0.45).toFixed(2)}s`);
        mote.style?.setProperty?.('--mdx', `${drift}px`);
        layer.append?.(mote);
        this._motes.push(mote);
      }
      const boltTotal = CATABASE_BOLT_COUNT[CATABASE_BOLT_COUNT.length - 1];
      for (let i = 0; i < boltTotal; i += 1) {
        const bolt = this._doc.createElement('span');
        bolt.className = 'despertar-catabase-bolt';
        bolt.hidden = true;
        bolt.style?.setProperty?.('--bx', `${14 + ((i * 53) % 72)}%`);
        bolt.style?.setProperty?.('--by', `${16 + ((i * 29) % 58)}%`);
        bolt.style?.setProperty?.('--bd', `${((i * 0.41) % 2.2).toFixed(2)}s`);
        bolt.style?.setProperty?.('--bdur', `${(1.5 + (i % 5) * 0.32).toFixed(2)}s`);
        bolt.style?.setProperty?.('--br', `${-32 + ((i * 19) % 64)}deg`);
        layer.append?.(bolt);
        this._bolts.push(bolt);
      }
      this._moteLayer = layer;
      this._stageHost.append?.(layer);
    }

    const pactParent = altarCol || this._stageHost;
    if (pactParent && !this._pactBar) {
      const bar = this._doc.createElement('div');
      bar.className = 'despertar-catabase-bar';
      bar.id = 'despertar-catabase-bar';
      bar.hidden = true;

      const stageBadge = this._doc.createElement('p');
      stageBadge.className = 'despertar-catabase-bar__stage';
      stageBadge.id = 'despertar-catabase-stage';

      const researchBadge = this._doc.createElement('p');
      researchBadge.className = 'despertar-catabase-bar__research';
      researchBadge.id = 'despertar-catabase-research';
      researchBadge.hidden = true;

      const actions = this._doc.createElement('div');
      actions.className = 'despertar-catabase-bar__actions';

      const pledgeBtn = this._doc.createElement('button');
      pledgeBtn.type = 'button';
      pledgeBtn.className = 'despertar-ghost despertar-catabase-bar__btn';
      pledgeBtn.id = 'despertar-catabase-pledge';
      pledgeBtn.hidden = true;
      pledgeBtn.addEventListener?.('click', () => this._onActivatePledge?.());

      const covenantBtn = this._doc.createElement('button');
      covenantBtn.type = 'button';
      covenantBtn.className = 'despertar-ghost despertar-catabase-bar__btn';
      covenantBtn.id = 'despertar-catabase-covenant';
      covenantBtn.hidden = true;
      covenantBtn.addEventListener?.('click', () => this._onToggleCovenant?.());

      actions.append?.(pledgeBtn, covenantBtn);
      bar.append?.(stageBadge, researchBadge, actions);
      pactParent.append?.(bar);

      this._pactBar = bar;
      this._stageBadge = stageBadge;
      this._researchBadge = researchBadge;
      this._pledgeBtn = pledgeBtn;
      this._covenantBtn = covenantBtn;
    }

    return this;
  }

  /**
   * Sincroniza os slots de Sanguessugas e a barra de Trégua/Aliança (apenas na cadência lenta / on-dirty).
   */
  sync(state, meta = {}) {
    if (!state) return;
    const reducedMotion = Boolean(meta.reducedMotion);
    const fancy = meta.fancy !== false;
    const staticMode = reducedMotion || !fancy;

    const leeches = typeof state.leeches === 'function'
      ? state.leeches()
      : (state.catabase?.leeches || []);
    const maxCap = typeof state.maxLeeches === 'function' ? state.maxLeeches() : 10;

    if (this._ringEl) {
      this._ringEl.hidden = leeches.length === 0;
      this._ringEl.classList?.toggle?.('is-static', staticMode);

      const bySlot = new Map();
      for (const l of leeches) {
        if (l && Number.isFinite(Number(l.slot))) {
          bySlot.set(Number(l.slot), l);
        }
      }

      for (let s = 0; s < this._slotButtons.length; s += 1) {
        const btn = this._slotButtons[s];
        const leech = bySlot.get(s);
        if (!leech) {
          btn.hidden = true;
          continue;
        }
        btn.hidden = false;
        const pos = leechSlotPolarPosition(s, maxCap);
        btn.style?.setProperty?.('--leech-x', `${pos.xPct}%`);
        btn.style?.setProperty?.('--leech-y', `${pos.yPct}%`);
        btn.style?.setProperty?.('--leech-deg', `${pos.deg}deg`);
        btn.style?.setProperty?.('--leech-jx', `${pos.jitterXPx}px`);
        btn.style?.setProperty?.('--leech-jy', `${pos.jitterYPx}px`);
        btn.style?.setProperty?.('--leech-delay', `${pos.delaySec}s`);
        btn.style?.setProperty?.('--leech-phase', `${pos.phaseSec}s`);
        btn.classList?.toggle?.('is-shiny', Boolean(leech.shiny));
        btn.classList?.toggle?.('is-static', staticMode);
        const digLabel = formatSouls(leech.digested || '0');
        const kindLabel = leech.shiny ? 'Sanguessuga Abissal Dourada' : 'Sanguessuga do Acheron';
        const showDigest = typeof state.leechDigestVisible === 'function'
          ? state.leechDigestVisible()
          : Boolean(state.talents?.includes?.('eye_of_the_wrinkler'));
        const digestPart = showDigest ? ` · Digerido: ${digLabel} almas` : '';
        const label = `${kindLabel}${digestPart} (clique para estourar)`;
        btn.setAttribute?.('aria-label', label);
        btn.title = label;
        const spriteId = leech.shiny ? 'sanguessuga_shiny' : 'sanguessuga_normal';
        if (btn.dataset.spriteId !== spriteId) {
          btn.dataset.spriteId = spriteId;
          btn.replaceChildren?.(
            createSpriteNode(
              this._doc,
              catabaseSprite(spriteId),
              { className: 'despertar-sprite despertar-leech__sprite' },
            ),
          );
          this.#attachSips(btn, this._slotSips[s]);
        }
      }
    }

    if (this._pactBar) {
      const structStage = typeof state.structuralCatabaseStage === 'function'
        ? state.structuralCatabaseStage()
        : Number(state.catabase?.stage || 0);
      const effStage = typeof state.catabaseStage === 'function'
        ? state.catabaseStage()
        : structStage;

      if (this._stageBackdrop) {
        const stageInfoBg = CATABASE_STAGES[effStage] || CATABASE_STAGES[0];
        const showBg = effStage >= 1 && !Number.isNaN(effStage);
        this._stageBackdrop.hidden = !showBg;
        this._stageBackdrop.classList?.toggle?.('is-static', staticMode);
        if (showBg && stageInfoBg.spriteId && this._lastStageSpriteId !== stageInfoBg.spriteId) {
          this._lastStageSpriteId = stageInfoBg.spriteId;
          this._stageBackdrop.replaceChildren?.(
            createSpriteNode(
              this._doc,
              catabaseSprite(stageInfoBg.spriteId),
              { className: 'despertar-sprite despertar-catabase-stage-bg__sprite' },
            ),
          );
        }
        if (!showBg) this._lastStageSpriteId = null;
      }
      const hasResearchHub = Array.isArray(state.upgrades) && state.upgrades.includes('concilio_das_moiras');
      const showBar = hasResearchHub || structStage >= 1;
      this._pactBar.hidden = !showBar;
      if (!showBar) this.#syncStageMotes(0, { staticMode });

      if (showBar) {
        const stageInfo = CATABASE_STAGES[effStage] || CATABASE_STAGES[0];
        const covOn = typeof state.isElderCovenantActive === 'function'
          ? state.isElderCovenantActive()
          : Boolean(state.catabase?.covenantActive);
        const pledgeOn = typeof state.isElderPledgeActive === 'function'
          ? state.isElderPledgeActive()
          : false;

        let statusText = stageInfo.name;
        if (covOn) statusText = 'Catábase contida · Aliança Eterna (−5% SPS)';
        else if (pledgeOn) statusText = 'Catábase suspensa · Juramento de Trégua ativo';

        if (this._stageBadge) {
          this._stageBadge.textContent = statusText;
        }
        this.#syncStageMotes(effStage, { staticMode, contained: covOn || pledgeOn });

        if (this._researchBadge) this._researchBadge.hidden = true;

        if (this._pledgeBtn) this._pledgeBtn.hidden = true;
        if (this._covenantBtn) this._covenantBtn.hidden = true;
      }
    }
  }

  #attachSips(btn, sips = []) {
    if (!btn?.append) return;
    for (const sip of sips || []) btn.append(sip);
  }

  #syncStageMotes(stage, { staticMode = false, contained = false } = {}) {
    const layer = this._moteLayer;
    if (!layer) return;
    const level = Math.max(0, Math.min(CATABASE_MOTE_COUNT.length - 1, Math.floor(Number(stage) || 0)));
    const count = CATABASE_MOTE_COUNT[level];
    const bolts = CATABASE_BOLT_COUNT[level];
    layer.hidden = count === 0 && bolts === 0;
    if (layer.dataset) layer.dataset.stage = String(level);
    layer.classList?.toggle?.('is-static', Boolean(staticMode) || Boolean(contained));
    layer.classList?.toggle?.('is-contained', Boolean(contained));
    for (let i = 0; i < this._motes.length; i += 1) {
      this._motes[i].hidden = i >= count;
    }
    for (let i = 0; i < this._bolts.length; i += 1) {
      this._bolts[i].hidden = i >= bolts;
    }
  }

  #sweepStaleFloats() {
    const roots = [this._floatLayer, this._particleLayer, this._stageHost].filter(Boolean);
    const seen = new Set();
    for (const root of roots) {
      const nodes = root.querySelectorAll?.(
        '.despertar-leech-float, .despertar-reap-float',
      ) || [];
      for (const node of nodes) {
        if (seen.has(node)) continue;
        seen.add(node);
        try { node.remove?.(); } catch { /* ignore */ }
      }
    }
    this._activeFloats = [];
  }

  #releaseFloat(doc, node) {
    if (!node || node.dataset?.leechFloatReleased === '1') return;
    if (node.dataset) node.dataset.leechFloatReleased = '1';
    this._activeFloats = this._activeFloats.filter((n) => n !== node);
    try {
      if (node.style) {
        node.style.animation = 'none';
        node.style.opacity = '0';
      }
    } catch { /* ignore */ }
    releasePooledNode(doc, 'leech-float', node);
  }

  /**
   * Anel e fragmentos no ponto da sanguessuga. Coordenadas do stage, não da float-layer.
   */
  #spawnPopBurst(doc, origin, shiny) {
    const host = this._stageHost || this._particleLayer;
    if (!host?.append || !doc?.createElement) return [];
    const pct = (value, fallback) => {
      const raw = String(value || '').trim();
      if (!raw) return fallback;
      return raw.endsWith('%') ? raw : `${raw}%`;
    };
    const x = pct(origin?.x, '50%');
    const y = pct(origin?.y, '50%');
    const nodes = [];
    const place = (node, dx, dy, delay) => {
      node.setAttribute?.('aria-hidden', 'true');
      if (shiny) node.className += ' is-shiny';
      node.style?.setProperty?.('--burst-x', x);
      node.style?.setProperty?.('--burst-y', y);
      node.style?.setProperty?.('--burst-dx', `${dx}px`);
      node.style?.setProperty?.('--burst-dy', `${dy}px`);
      node.style?.setProperty?.('--burst-d', `${delay}s`);
      host.append(node);
      nodes.push(node);
    };
    const ring = doc.createElement('span');
    ring.className = 'despertar-leech-burst despertar-leech-burst--ring';
    place(ring, 0, 0, 0);
    const bits = [
      [-18, -22], [16, -26], [-10, 14], [20, 8], [0, -34],
    ];
    bits.forEach(([dx, dy], i) => {
      const bit = doc.createElement('span');
      bit.className = 'despertar-leech-burst';
      place(bit, dx, dy, i * 0.02);
    });
    return nodes;
  }

  /**
   * Cada clique (não só o estouro): o verme pisca e solta um punhado de partículas.
   */
  playClickHit(slot, opts = {}) {
    const btn = this._slotButtons?.[slot];
    if (!btn) return;
    btn.classList?.toggle?.('is-hit', false);
    try { void btn.offsetWidth; } catch { /* mock */ }
    btn.classList?.toggle?.('is-hit', true);
    if (typeof globalThis.setTimeout === 'function') {
      const timer = globalThis.setTimeout(() => {
        btn.classList?.toggle?.('is-hit', false);
      }, 240);
      if (typeof timer?.unref === 'function') timer.unref();
    }
    if (opts.reducedMotion) return;
    const style = btn.style;
    const read = (name) => style?.getPropertyValue?.(name) || style?.props?.[name] || '';
    const motes = this.#spawnClickMotes(this._doc, {
      x: read('--leech-x'),
      y: read('--leech-y'),
      shiny: Boolean(opts.shiny || btn.classList?.contains?.('is-shiny')),
    });
    if (typeof globalThis.setTimeout === 'function') {
      const timer = globalThis.setTimeout(() => {
        for (const mote of motes) {
          try { mote.remove?.(); } catch { /* ignore */ }
        }
      }, 480);
      if (typeof timer?.unref === 'function') timer.unref();
    }
  }

  #spawnClickMotes(doc, origin) {
    const host = this._stageHost || this._particleLayer;
    if (!host?.append || !doc?.createElement) return [];
    const pct = (value, fallback) => {
      const raw = String(value || '').trim();
      if (!raw) return fallback;
      return raw.endsWith('%') ? raw : `${raw}%`;
    };
    const x = pct(origin?.x, '50%');
    const y = pct(origin?.y, '50%');
    const shiny = Boolean(origin?.shiny);
    const bits = [[-14, -18], [12, -16], [-8, 12], [16, 6]];
    return bits.map(([dx, dy], i) => {
      const mote = doc.createElement('span');
      mote.className = 'despertar-leech-burst despertar-leech-burst--tap';
      if (shiny) mote.className += ' is-shiny';
      mote.setAttribute?.('aria-hidden', 'true');
      mote.style?.setProperty?.('--burst-x', x);
      mote.style?.setProperty?.('--burst-y', y);
      mote.style?.setProperty?.('--burst-dx', `${dx}px`);
      mote.style?.setProperty?.('--burst-dy', `${dy}px`);
      mote.style?.setProperty?.('--burst-d', `${i * 0.02}s`);
      host.append(mote);
      return mote;
    });
  }

  /**
   * Dispara texto flutuante ao estourar uma Sanguessuga.
   * Sempre agenda remoção por timeout (prefers-reduced-motion zera animationend).
   */
  spawnPopFeedback(result, opts = {}) {
    if (!result?.ok || !result?.popped) return null;
    if (opts.reducedMotion) return null;
    const host = this._floatLayer || this._particleLayer || this._stageHost;
    const doc = this._doc || host?.ownerDocument;
    if (!host || !doc?.createElement) return null;

    // Cap: evita coluna de textos se o release falhar de novo.
    while (this._activeFloats.length >= 3) {
      this.#releaseFloat(doc, this._activeFloats[0]);
    }

    const node = acquirePooledNode(doc, 'leech-float', 'despertar-float despertar-leech-float');
    if (!node) return null;
    if (node.dataset) delete node.dataset.leechFloatReleased;

    const origin = this._popOrigin;
    this._popOrigin = null;
    const shiny = Boolean(result.leech?.shiny || origin?.shiny);
    const prefix = shiny ? 'Sanguessuga Dourada!' : 'Sanguessuga estourada';
    const payout = formatSouls(result.payout || '0');
    node.textContent = cmp(result.payout || '0', '0') > 0
      ? `${prefix} · +${payout}`
      : prefix;

    const bursts = this.#spawnPopBurst(doc, origin, shiny);

    const x = 38 + Math.random() * 24;
    const y = 40 + Math.random() * 28;
    if (node.style) {
      // Cinto de segurança: mesmo se o CSS cacheado não tiver .despertar-float.
      node.style.position = 'absolute';
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.style.transform = 'translate(-50%, -50%)';
      node.style.pointerEvents = 'none';
      node.style.whiteSpace = 'nowrap';
      node.style.zIndex = '12';
      node.style.opacity = '1';
      node.style.setProperty?.('--float-x', `${x}%`);
      node.style.setProperty?.('--float-y', `${y}%`);
      node.style.animation = 'none';
    }
    host.appendChild?.(node);
    try { void node.offsetWidth; } catch { /* mock */ }
    if (node.style) {
      node.style.animation = '';
      try { node.style.removeProperty?.('animation'); } catch { /* mock */ }
    }

    this._activeFloats.push(node);
    const release = () => {
      this.#releaseFloat(doc, node);
      for (const burst of bursts) {
        try { burst.remove?.(); } catch { /* ignore */ }
      }
    };
    node.addEventListener?.('animationend', release, { once: true });
    // Timeout duro: não depende de CSS/animationend (reduced-motion / cache velho).
    if (typeof globalThis.setTimeout === 'function') {
      const timer = globalThis.setTimeout(release, 1100);
      if (typeof timer?.unref === 'function') timer.unref();
    }
    return node;
  }
}
