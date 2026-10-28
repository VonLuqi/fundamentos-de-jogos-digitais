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
import { getUpgrade } from '../../config/upgrades.js';
import { cmp } from '../../core/decimal.js';
import { formatSouls } from '../NumberFormatter.js';
import { acquirePooledNode, releasePooledNode } from '../particles.js';
import { catabaseSprite, createSpriteNode } from './SpriteAtlas.js';

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
    this._stageBackdrop = null;
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
          this._onPopLeech?.(slot);
        });
        const spriteHost = createSpriteNode(
          this._doc,
          catabaseSprite('sanguessuga_normal'),
          { className: 'despertar-sprite despertar-leech__sprite' },
        );
        btn.append?.(spriteHost);
        ring.append?.(btn);
        this._slotButtons.push(btn);
      }

      this._ringEl = ring;
      this._stageHost.append?.(ring);
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

        const resTargetId = state.catabase?.researchTargetId || null;
        const resRem = Math.ceil(Number(state.catabase?.researchRemainingSec || 0));
        if (this._researchBadge) {
          if (resTargetId && resRem > 0) {
            const upDef = getUpgrade(resTargetId);
            this._researchBadge.hidden = false;
            const mins = Math.floor(resRem / 60);
            const secs = resRem % 60;
            const clock = mins > 0
              ? `${mins}:${String(secs).padStart(2, '0')}`
              : `${secs}s`;
            this._researchBadge.textContent = `Pesquisa: ${upDef?.name || resTargetId} (${clock}) · aba Arquivo`;
          } else if (hasResearchHub) {
            this._researchBadge.hidden = false;
            this._researchBadge.textContent = 'Arquivo Estígio · detalhes na aba Arquivo';
          } else {
            this._researchBadge.hidden = true;
          }
        }

        const canUsePacts = structStage >= 3 || (Array.isArray(state.upgrades) && state.upgrades.includes('pacto_primordial'));
        if (this._pledgeBtn) {
          this._pledgeBtn.hidden = !canUsePacts || covOn;
          if (!this._pledgeBtn.hidden) {
            const pCost = typeof state.pledgeCost === 'function' ? state.pledgeCost() : '1';
            this._pledgeBtn.textContent = pledgeOn
              ? `Renovar Trégua (${formatSouls(pCost)})`
              : `Juramento de Trégua (${formatSouls(pCost)} almas)`;
            this._pledgeBtn.disabled = cmp(state.souls || '0', pCost) < 0 && !state.debugFlags?.freeShopping;
          }
        }
        if (this._covenantBtn) {
          this._covenantBtn.hidden = !canUsePacts;
          if (!this._covenantBtn.hidden) {
            this._covenantBtn.textContent = covOn
              ? 'Revogar Aliança Eterna'
              : 'Aliança Eterna (−5% SPS)';
          }
        }
      }
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

    const prefix = result.leech?.shiny ? 'Sanguessuga Dourada!' : 'Sanguessuga estourada';
    const payout = formatSouls(result.payout || '0');
    node.textContent = cmp(result.payout || '0', '0') > 0
      ? `${prefix} · +${payout}`
      : prefix;

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
    const release = () => this.#releaseFloat(doc, node);
    node.addEventListener?.('animationend', release, { once: true });
    // Timeout duro: não depende de CSS/animationend (reduced-motion / cache velho).
    if (typeof globalThis.setTimeout === 'function') {
      const timer = globalThis.setTimeout(release, 1100);
      if (typeof timer?.unref === 'function') timer.unref();
    }
    return node;
  }
}
