/**
 * ShimmerView (Fase F2 — Eco do Acheron).
 * Camada de apresentação do fragmento clicável no Santuário e das pílulas de buffs ativos.
 * Regras de orçamento (Fase Perf):
 * - Zero `requestAnimationFrame` próprio (conduzido pelo caminho lento / dirty do UIRenderer).
 * - Reutiliza o botão do Eco e os nós de pílula de buff (sem recriar DOM por frame).
 * - Respeita `prefers-reduced-motion` e `fancy: false` (render estático de alto contraste).
 * - Usa o Object Pool (`acquirePooledNode` / `releasePooledNode`) para o texto flutuante do clique.
 */

import { getShimmerEffect } from '../config/shimmers.js';
import { cmp } from '../core/decimal.js';
import { formatSouls } from './NumberFormatter.js';
import { acquirePooledNode, releasePooledNode } from './particles.js';
import { createSpriteNode, shimmerSprite } from './world/SpriteAtlas.js';

export function formatShimmerFeedback(result) {
  if (!result || !result.ok) return '';
  const name = result.effectName || getShimmerEffect(result.effectId)?.name || 'Eco do Acheron';
  if (result.kind === 'instantLucky' && cmp(result.gained || '0', '0') > 0) {
    return `${name} · +${formatSouls(result.gained)} almas`;
  }
  if (result.kind === 'buildingSpecial') {
    const vGain = Number(result.verdictsGained) || 0;
    const vText = vGain > 0 ? `+${vGain} Veredito` : '';
    const bText = result.buff?.mult ? `×${formatSouls(result.buff.mult)} SPS (${result.buff.durationSec}s)` : '';
    const detail = [vText, bText].filter(Boolean).join(' · ');
    return detail ? `${name} · ${detail}` : name;
  }
  if (result.buff) {
    const label = result.kind === 'clickBuff' ? 'clique' : 'SPS';
    return `${name} · ×${formatSouls(result.buff.mult)} ${label} (${result.buff.durationSec}s)`;
  }
  return name;
}

export class ShimmerView {
  constructor(options = {}) {
    this._doc = options.document || (typeof document !== 'undefined' ? document : null);
    this._onClickShimmer = typeof options.onClickShimmer === 'function' ? options.onClickShimmer : null;
    this._shimmerHost = null;
    this._buffsHost = null;
    this._particleLayer = null;
    /** Pilha reutilizada: um botão por Eco na tela; sobras ficam ocultas. */
    this._buttons = [];
    this._buffNodes = new Map();
  }

  mount({ shimmerHost = null, buffsHost = null, particleLayer = null } = {}) {
    this._shimmerHost = shimmerHost;
    this._buffsHost = buffsHost;
    this._particleLayer = particleLayer;
    if (this._shimmerHost && this._doc?.createElement && this._buttons.length === 0) {
      this.#buttonAt(0);
    }
    return this;
  }

  #buttonAt(index) {
    if (this._buttons[index]) return this._buttons[index];
    const btn = this._doc.createElement('button');
    btn.type = 'button';
    btn.className = 'despertar-shimmer';
    if (index === 0) btn.id = 'despertar-shimmer-btn';
    btn.hidden = true;
    btn.setAttribute('aria-label', 'Ceifar Eco do Acheron');
    btn.addEventListener?.('click', (event) => {
      event?.stopPropagation?.();
      this._onClickShimmer?.(btn.dataset?.shimmerId || null);
    });
    btn._shimmerId = null;
    btn._variant = null;
    this._buttons[index] = btn;
    this._shimmerHost.append?.(btn);
    return btn;
  }

  /**
   * Sincroniza o fragmento clicável e as pílulas de buffs ativos (cadência lenta / on-dirty).
   * @param {object} state
   * @param {{ reducedMotion?: boolean, fancy?: boolean, nowMs?: number }} [meta]
   */
  sync(state, meta = {}) {
    if (!state) return;
    const reducedMotion = Boolean(meta.reducedMotion);
    const fancy = meta.fancy !== false;
    const staticMode = reducedMotion || !fancy;
    const nowMs = Number.isFinite(Number(meta.nowMs))
      ? Number(meta.nowMs)
      : (typeof state.nowMs === 'function' ? state.nowMs() : Date.now());

    const shimmers = Array.isArray(state.shimmers) ? state.shimmers : (state.shimmer ? [state.shimmer] : []);
    this.#syncShimmerButtons(shimmers, { staticMode });
    this.#syncActiveBuffs(state.activeBuffs, { nowMs, staticMode });
  }

  /**
   * Dispara feedback visual ao ceifar um Eco usando o Object Pool de partículas.
   */
  spawnClickFeedback(result, opts = {}) {
    const reducedMotion = Boolean(opts.reducedMotion);
    const particlesOn = opts.particles !== false;
    if (reducedMotion || !particlesOn) return null;

    const host = this._particleLayer || this._shimmerHost;
    const doc = this._doc || host?.ownerDocument;
    if (!host || !doc?.createElement) return null;

    const text = formatShimmerFeedback(result);
    if (!text) return null;

    const node = acquirePooledNode(doc, 'shimmer-float', 'despertar-float despertar-shimmer-float');
    if (!node) return null;
    node.textContent = text;
    if (node.dataset) {
      node.dataset.variant = result?.variant || 'golden';
    }
    const xPct = Number.isFinite(Number(result?.shimmer?.x))
      ? Math.round(Number(result.shimmer.x) * 100)
      : 50;
    const yPct = Number.isFinite(Number(result?.shimmer?.y))
      ? Math.round(Number(result.shimmer.y) * 100)
      : 42;
    node.style?.setProperty?.('--shimmer-float-x', `${xPct}%`);
    node.style?.setProperty?.('--shimmer-float-y', `${yPct}%`);
    host.appendChild?.(node);

    const release = () => {
      if (node.dataset) delete node.dataset.variant;
      releasePooledNode(doc, 'shimmer-float', node);
    };
    node.addEventListener?.('animationend', release, { once: true });
    if (typeof globalThis.setTimeout === 'function') {
      globalThis.setTimeout(release, 1100);
    }
    return node;
  }

  #syncShimmerButtons(shimmers, { staticMode = false } = {}) {
    if (!this._shimmerHost || !this._doc?.createElement) return;
    shimmers.forEach((shimmer, i) => this.#syncShimmerButton(this.#buttonAt(i), shimmer, { staticMode }));
    for (let i = shimmers.length; i < this._buttons.length; i += 1) {
      const btn = this._buttons[i];
      if (!btn.hidden) btn.hidden = true;
      btn._shimmerId = null;
    }
  }

  #syncShimmerButton(btn, shimmer, { staticMode = false } = {}) {
    const isWrath = shimmer.variant === 'wrath';
    if (btn._shimmerId !== shimmer.id || btn._variant !== shimmer.variant) {
      const variantChanged = btn._variant !== shimmer.variant;
      btn._shimmerId = shimmer.id;
      btn._variant = shimmer.variant;
      const spriteId = isWrath ? 'eco_colerico' : 'eco_dourado';
      if (variantChanged || !btn.firstChild) {
        const spriteNode = createSpriteNode(this._doc, shimmerSprite(spriteId), {
          className: 'despertar-shimmer__sprite despertar-sprite',
        });
        btn.replaceChildren?.(spriteNode);
      }
      const xPct = Math.round((Number(shimmer.x) || 0.5) * 100);
      const yPct = Math.round((Number(shimmer.y) || 0.45) * 100);
      btn.style?.setProperty?.('--shimmer-x', `${xPct}%`);
      btn.style?.setProperty?.('--shimmer-y', `${yPct}%`);
      btn.setAttribute?.(
        'aria-label',
        isWrath ? 'Ceifar Eco Colérico do Acheron' : 'Ceifar Eco Dourado do Acheron',
      );
      if (btn.dataset) {
        btn.dataset.shimmerId = shimmer.id;
        btn.dataset.shimmerKind = shimmer.kind;
        btn.dataset.shimmerVariant = shimmer.variant || 'golden';
      }
    }

    btn.classList?.toggle?.('is-wrath', isWrath);
    btn.classList?.toggle?.('is-golden', !isWrath);
    btn.classList?.toggle?.('is-static', Boolean(staticMode));
    if (btn.hidden) btn.hidden = false;
  }

  #syncActiveBuffs(activeBuffs = {}, { nowMs = Date.now(), staticMode = false } = {}) {
    const host = this._buffsHost;
    if (!host || !this._doc?.createElement) return;

    const entries = Object.values(activeBuffs || {}).filter(
      (b) => b && typeof b === 'object' && Number(b.expiresAt) > nowMs,
    );

    if (entries.length === 0) {
      if (!host.hidden) host.hidden = true;
      for (const [, record] of this._buffNodes.entries()) {
        record.root?.remove?.();
      }
      this._buffNodes.clear();
      return;
    }

    if (host.hidden) host.hidden = false;
    const activeIds = new Set();

    for (const buff of entries) {
      const id = String(buff.id);
      activeIds.add(id);
      let record = this._buffNodes.get(id);
      if (!record) {
        const pill = this._doc.createElement('div');
        pill.className = 'despertar-buff-pill';
        if (pill.dataset) pill.dataset.buffId = id;

        const nameEl = this._doc.createElement('span');
        nameEl.className = 'despertar-buff-pill__name';

        const metaEl = this._doc.createElement('span');
        metaEl.className = 'despertar-buff-pill__meta despertar-num';

        pill.append?.(nameEl, metaEl);
        host.append?.(pill);
        record = { root: pill, nameEl, metaEl };
        this._buffNodes.set(id, record);
      }

      const def = getShimmerEffect(id);
      const name = buff.name || def?.name || id;
      const remSec = Math.max(1, Math.ceil((Number(buff.expiresAt) - nowMs) / 1000));
      const multLabel = buff.mult ? `×${formatSouls(buff.mult)}` : '';
      const metaText = multLabel ? `${multLabel} · ${remSec}s` : `${remSec}s`;

      if (record.nameEl.textContent !== name) record.nameEl.textContent = name;
      if (record.metaEl.textContent !== metaText) record.metaEl.textContent = metaText;
      record.root.classList?.toggle?.('is-wrath', buff.variant === 'wrath');
      record.root.classList?.toggle?.('is-static', Boolean(staticMode));
    }

    for (const [id, record] of this._buffNodes.entries()) {
      if (!activeIds.has(id)) {
        record.root?.remove?.();
        this._buffNodes.delete(id);
      }
    }
  }
}
