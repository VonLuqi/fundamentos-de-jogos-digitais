/**
 * Rio do Lethe — árvore radial (tooltip no cursor, clique para selar).
 */

import {
  TALENTS,
  TALENT_BRANCHES,
  TALENT_BY_ID,
  meetsTalentRequirement,
  talentNodePosition,
} from '../config/talents.js';
import { formatSouls } from './NumberFormatter.js';
import { cmp } from '../core/decimal.js';
import { talentSprite } from './world/SpriteAtlas.js';

const RING_GAP = 88;
const ROOT_R = 56;
const NODE_R = 26;
const VIEW_W = 1600;
const VIEW_H = 1200;
const CX = VIEW_W / 2;
const CY = VIEW_H * 0.88;
const TIP_OFFSET = 18;
const DRAG_THRESHOLD = 5;
const SCALE_MIN = 0.45;
const SCALE_MAX = 1.85;
const LERP = 0.28;

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function nodeState(talent, { talents, mnemosyne, canSpend }) {
  const owned = talents.includes(talent.id);
  if (owned) return 'owned';
  const meets = meetsTalentRequirement(talent, { talents });
  if (!meets) return 'locked';
  if (!canSpend) return 'session-locked';
  if (cmp(mnemosyne, talent.cost) >= 0) return 'available';
  return 'afford-locked';
}

function statusLabel(st, readonly = false) {
  if (st === 'owned') return 'Selado';
  if (readonly) {
    if (st === 'locked') return 'Pré-requisito ainda não selado';
    return 'Só se sela no Rio após o ritual';
  }
  if (st === 'available') return 'Clique para selar';
  if (st === 'afford-locked') return 'Essência insuficiente';
  if (st === 'session-locked') return 'Sela só nesta tela após a Catábase';
  return 'Pré-requisito ainda não selado';
}

/**
 * @param {object} options
 * @param {HTMLElement|null} [options.root]
 * @param {boolean} [options.readonly] Memória do Rio — árvore fechada, sem selar
 * @param {() => import('../core/GameState.js').GameState} options.getState
 * @param {(id: string) => Promise<boolean>|boolean} [options.onBuyTalent]
 * @param {() => Promise<void>|void} [options.onClose]
 */
export function bindLetheRiverTree({
  root: rootArg = null,
  readonly = false,
  getState,
  onBuyTalent,
  onClose,
} = {}) {
  const root = rootArg || document.getElementById('despertar-lethe-river');
  if (!root) {
    return { open() {}, close() {}, refresh() {}, isOpen: () => false };
  }
  const flowGradientId = readonly ? 'lethe-memory-flow' : 'lethe-river-flow';
  if (readonly) root.classList.add('lethe-river--memory');

  const svg = root.querySelector('[data-river-svg]');
  const stage = root.querySelector('[data-river-stage]');
  const tip = root.querySelector('[data-river-tip]');
  const tipName = root.querySelector('[data-river-name]');
  const tipCost = root.querySelector('[data-river-cost]');
  const tipBlurb = root.querySelector('[data-river-blurb]');
  const tipHint = root.querySelector('[data-river-hint]');
  const essenceEl = root.querySelector('[data-river-essence]');
  const continueBtn = root.querySelector('[data-river-continue]');

  let hoverId = null;
  let panX = 0;
  let panY = 0;
  let scale = 1;
  let targetPanX = 0;
  let targetPanY = 0;
  let targetScale = 1;
  let dragMode = 'idle'; // idle | pending | active
  let dragPtrId = null;
  let lastPtr = null;
  let openFlag = false;
  /** @type {Set<string>} ids com selo em voo (permite selar outros nós na hora) */
  const sealingIds = new Set();
  let animFrame = 0;
  let motionPaused = false;
  let tipVisible = false;
  let lastTipX = 0;
  let lastTipY = 0;
  let tipW = 280;
  let tipH = 120;
  const reduced = prefersReducedMotion();

  const positions = Object.fromEntries(
    TALENTS.map((t) => [t.id, talentNodePosition(t, { cx: CX, cy: CY, ringGap: RING_GAP, rootR: ROOT_R })]),
  );
  /** @type {{ id: string, x: number, y: number, pointerId: number } | null} */
  let nodePtr = null;

  function applyTransform() {
    if (!stage) return;
    stage.setAttribute('transform', `translate(${panX} ${panY}) scale(${scale})`);
  }

  function clientToViewBox(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: VIEW_W / 2, y: VIEW_H / 2 };
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  /** Zoom em torno do ponto do cursor (coords viewBox). */
  function setScaleAround(nextScale, viewX, viewY) {
    const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, nextScale));
    const prev = targetScale || scale || 1;
    if (Math.abs(clamped - prev) < 1e-6) return;
    const ratio = clamped / prev;
    targetPanX = viewX - (viewX - targetPanX) * ratio;
    targetPanY = viewY - (viewY - targetPanY) * ratio;
    targetScale = clamped;
    if (reduced) {
      panX = targetPanX;
      panY = targetPanY;
      scale = targetScale;
      applyTransform();
    }
  }

  function tickMotion() {
    if (!openFlag || motionPaused) {
      animFrame = 0;
      return;
    }
    if (!reduced && dragMode !== 'active') {
      panX += (targetPanX - panX) * LERP;
      panY += (targetPanY - panY) * LERP;
      scale += (targetScale - scale) * LERP;
      if (
        Math.abs(targetPanX - panX) > 0.04
        || Math.abs(targetPanY - panY) > 0.04
        || Math.abs(targetScale - scale) > 0.0008
      ) {
        applyTransform();
      } else if (
        panX !== targetPanX
        || panY !== targetPanY
        || scale !== targetScale
      ) {
        panX = targetPanX;
        panY = targetPanY;
        scale = targetScale;
        applyTransform();
      }
    } else if (dragMode === 'active') {
      // pan já aplicado no pointermove; só garante sync
      applyTransform();
    }
    animFrame = requestAnimationFrame(tickMotion);
  }

  function showTip(talent, st, clientX, clientY) {
    if (!tip || !talent) return;
    if (tipName) tipName.textContent = talent.name;
    if (tipCost) {
      tipCost.textContent = st === 'owned'
        ? 'Selado'
        : `${formatSouls(talent.cost)} ESSÊNCIA`;
    }
    if (tipBlurb) tipBlurb.textContent = talent.blurb || '';
    if (tipHint) tipHint.textContent = statusLabel(st, readonly);
    tip.dataset.state = st;
    tip.hidden = false;
    tip.classList.add('is-visible');
    tipVisible = true;
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      lastTipX = clientX;
      lastTipY = clientY;
    }
    // mede uma vez após layout (evita thrash no pointermove)
    const rect = tip.getBoundingClientRect();
    if (rect.width > 0) tipW = rect.width;
    if (rect.height > 0) tipH = rect.height;
    moveTip(lastTipX, lastTipY);
  }

  function hideTip() {
    if (!tip) return;
    tip.classList.remove('is-visible');
    tipVisible = false;
    tip.hidden = true;
    hoverId = null;
  }

  function moveTip(clientX, clientY) {
    if (!tip || !tipVisible) return;
    lastTipX = clientX;
    lastTipY = clientY;
    const pad = 12;
    let x = clientX + TIP_OFFSET;
    let y = clientY + TIP_OFFSET;
    if (x + tipW > window.innerWidth - pad) {
      x = clientX - tipW - TIP_OFFSET;
    }
    if (y + tipH > window.innerHeight - pad) {
      y = clientY - tipH - TIP_OFFSET;
    }
    tip.style.left = `${Math.max(pad, x)}px`;
    tip.style.top = `${Math.max(pad, y)}px`;
  }

  function pulseNode(id) {
    const el = stage?.querySelector(`[data-talent-id="${id}"]`);
    if (!el) return;
    el.classList.remove('is-sealing');
    void el.getBoundingClientRect();
    el.classList.add('is-sealing');
    window.setTimeout(() => el.classList.remove('is-sealing'), reduced ? 0 : 650);
  }

  /** Enquanto o Rio (sessão) está aberto, a janela de selo permanece ativa. */
  function ensureSpendSession(state) {
    if (readonly || !state || !openFlag) return false;
    if (!state.ascensionOpen) {
      state.ascensionOpen = true;
      state.milestones = { ...(state.milestones || {}), ascensionOpen: true };
    }
    return true;
  }

  async function trySeal(id) {
    if (readonly || !onBuyTalent || sealingIds.has(id)) return false;
    const state = typeof getState === 'function' ? getState() : null;
    if (!state) return false;
    ensureSpendSession(state);
    if (!state.ascensionOpen) return false;
    const talent = TALENT_BY_ID[id];
    if (!talent) return false;
    const st = nodeState(talent, {
      talents: state.talents || [],
      mnemosyne: state.mnemosyne || '0',
      canSpend: true,
    });
    if (st === 'locked') return false;
    if (st === 'afford-locked') return false;
    if (st === 'owned') return false;
    sealingIds.add(id);
    pulseNode(id);
    try {
      // onBuyTalent otimista: resolve true assim que o selo local aplica.
      const ok = await onBuyTalent(id);
      refresh();
      const next = getState?.();
      if (ok && next && hoverId === id) {
        ensureSpendSession(next);
        showTip(
          talent,
          nodeState(talent, {
            talents: next.talents || [],
            mnemosyne: next.mnemosyne || '0',
            canSpend: Boolean(next.ascensionOpen) || openFlag,
          }),
          lastTipX,
          lastTipY,
        );
      }
      return Boolean(ok);
    } finally {
      sealingIds.delete(id);
    }
  }

  function endDrag(ev) {
    if (dragPtrId != null && svg?.hasPointerCapture?.(dragPtrId)) {
      try { svg.releasePointerCapture(dragPtrId); } catch { /* ignore */ }
    }
    dragMode = 'idle';
    dragPtrId = null;
    lastPtr = null;
    if (ev?.pointerId != null && svg) {
      // noop — capture already released
    }
  }

  function liveNodeState(talent) {
    const state = typeof getState === 'function' ? getState() : null;
    if (!state) return 'locked';
    ensureSpendSession(state);
    return nodeState(talent, {
      talents: state.talents || [],
      mnemosyne: state.mnemosyne || '0',
      canSpend: readonly ? false : (Boolean(state.ascensionOpen) || openFlag),
    });
  }

  function applyNodePresentation(g, talent, st) {
    const hot = hoverId === talent.id ? ' is-hot' : '';
    g.setAttribute('class', `lethe-river__node lethe-river__node--${st}${hot}`);
    g.setAttribute(
      'aria-label',
      `${talent.name}. ${talent.blurb || ''} ${statusLabel(st, readonly)}`,
    );
  }

  function ensureGraphStructure() {
    if (!svg || !stage) return null;
    let rings = stage.querySelector('[data-river-rings]');
    if (!rings) {
      rings = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      rings.setAttribute('data-river-rings', '');
      stage.prepend(rings);
      const maxRing = TALENTS.reduce((m, t) => Math.max(m, Number(t.ring) || 0), 0);
      for (let r = 0; r <= maxRing; r += 1) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(CX));
        c.setAttribute('cy', String(CY));
        c.setAttribute('r', String(r === 0 ? ROOT_R : r * RING_GAP + 36));
        c.setAttribute('class', 'lethe-river__ring');
        rings.appendChild(c);
      }
    }

    let edges = stage.querySelector('[data-river-edges]');
    if (!edges) {
      edges = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      edges.setAttribute('data-river-edges', '');
      stage.appendChild(edges);
      for (const talent of TALENTS) {
        const parents = talent.requires?.talentIds || [];
        const to = positions[talent.id];
        for (const pid of parents) {
          const from = positions[pid];
          if (!from || !to) continue;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2 - 18;
          path.setAttribute('d', `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`);
          path.setAttribute('class', 'lethe-river__edge');
          path.style.stroke = `url(#${flowGradientId})`;
          if (!reduced && !readonly) path.classList.add('lethe-river__edge--flow');
          edges.appendChild(path);
        }
      }
    }

    let nodes = stage.querySelector('[data-river-nodes]');
    if (!nodes) {
      nodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodes.setAttribute('data-river-nodes', '');
      stage.appendChild(nodes);
      for (const talent of TALENTS) {
        const pos = positions[talent.id];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.dataset.talentId = talent.id;
        applyNodePresentation(g, talent, 'locked');

        const body = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        body.setAttribute('class', 'lethe-river__node-body');

        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('r', String(NODE_R + 8));
        halo.setAttribute('class', 'lethe-river__node-halo');
        body.appendChild(halo);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', String(NODE_R));
        circle.setAttribute('class', 'lethe-river__node-disk');
        body.appendChild(circle);

        const sprite = talentSprite(talent.id);
        if (sprite.webp) {
          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttribute('href', sprite.webp);
          img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', sprite.webp);
          img.setAttribute('x', String(-18));
          img.setAttribute('y', String(-18));
          img.setAttribute('width', '36');
          img.setAttribute('height', '36');
          img.setAttribute('class', 'lethe-river__node-art');
          img.addEventListener('error', () => {
            img.remove();
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('class', 'lethe-river__node-mark');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('dominant-baseline', 'central');
            t.textContent = sprite.mark;
            body.appendChild(t);
          });
          body.appendChild(img);
        } else {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('class', 'lethe-river__node-mark');
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('dominant-baseline', 'central');
          t.textContent = sprite.mark;
          body.appendChild(t);
        }
        g.appendChild(body);

        g.addEventListener('pointerenter', (ev) => {
          if (dragMode === 'active') return;
          hoverId = talent.id;
          g.classList.add('is-hot');
          showTip(talent, liveNodeState(talent), ev.clientX, ev.clientY);
        });
        g.addEventListener('pointermove', (ev) => {
          if (dragMode === 'active') return;
          if (hoverId === talent.id) moveTip(ev.clientX, ev.clientY);
        });
        g.addEventListener('pointerleave', () => {
          if (dragMode === 'active') return;
          if (hoverId === talent.id) {
            g.classList.remove('is-hot');
            hideTip();
          }
        });
        if (!readonly) {
          g.addEventListener('pointerdown', (ev) => {
            if (ev.button != null && ev.button !== 0) return;
            nodePtr = {
              id: talent.id,
              x: ev.clientX,
              y: ev.clientY,
              pointerId: ev.pointerId,
            };
          });
          g.addEventListener('pointerup', (ev) => {
            if (!nodePtr || nodePtr.id !== talent.id) return;
            if (nodePtr.pointerId != null && ev.pointerId !== nodePtr.pointerId) return;
            const moved = Math.hypot(ev.clientX - nodePtr.x, ev.clientY - nodePtr.y);
            const wasDrag = dragMode === 'active';
            nodePtr = null;
            if (wasDrag || moved >= DRAG_THRESHOLD) return;
            ev.preventDefault();
            ev.stopPropagation();
            try {
              window.getSelection?.()?.removeAllRanges?.();
            } catch { /* ignore */ }
            void trySeal(talent.id);
          });
          g.addEventListener('pointercancel', () => {
            if (nodePtr?.id === talent.id) nodePtr = null;
          });
          // Alias: dblclick ainda sela (idempotente se o clique único já selou).
          g.addEventListener('dblclick', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            try {
              window.getSelection?.()?.removeAllRanges?.();
            } catch { /* ignore */ }
            void trySeal(talent.id);
          });
          g.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              void trySeal(talent.id);
            }
          });
        } else {
          g.setAttribute('role', 'img');
          g.removeAttribute('tabindex');
        }
        nodes.appendChild(g);
      }
    }

    let labelsG = stage.querySelector('[data-river-branches]');
    if (!labelsG) {
      labelsG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelsG.setAttribute('data-river-branches', '');
      stage.appendChild(labelsG);
      // Ângulo mediano da vertente × raio externo ao anel 3 — acompanha o leque real.
      const LABEL_RING = 3.6;
      const labelR = LABEL_RING * RING_GAP + ROOT_R;
      for (const key of /** @type {const} */ (['margem', 'imperio', 'memoria'])) {
        const branchTalents = TALENTS.filter((t) => t.branch === key);
        if (!branchTalents.length) continue;
        const angles = branchTalents.map((t) => Number(t.angle) || 0).sort((a, b) => a - b);
        const midAngle = angles[Math.floor(angles.length / 2)] || 0;
        const rad = (midAngle * Math.PI) / 180;
        const x = CX + Math.sin(rad) * labelR;
        const y = CY - Math.cos(rad) * labelR;
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', String(x));
        t.setAttribute('y', String(y));
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('class', 'lethe-river__branch-label');
        t.dataset.branch = key;
        t.textContent = TALENT_BRANCHES[key]?.label || key.toUpperCase();
        labelsG.appendChild(t);
      }
    }

    return nodes;
  }

  function renderGraph(state) {
    if (!svg || !stage) return;
    ensureSpendSession(state);
    const talents = state.talents || [];
    const mnemosyne = state.mnemosyne || '0';
    const canSpend = readonly ? false : (Boolean(state.ascensionOpen) || openFlag);
    const nodes = ensureGraphStructure();
    if (!nodes) return;

    // Só atualiza classes dos nós — arestas/anéis ficam intactos (animação contínua).
    for (const talent of TALENTS) {
      const g = nodes.querySelector(`[data-talent-id="${talent.id}"]`);
      if (!g) continue;
      const st = nodeState(talent, { talents, mnemosyne, canSpend });
      applyNodePresentation(g, talent, st);
    }
  }

  function refresh() {
    const state = typeof getState === 'function' ? getState() : null;
    if (!state) return;
    if (essenceEl) {
      essenceEl.textContent = formatSouls(state.mnemosyne || '0');
      if (!readonly) {
        essenceEl.classList.remove('is-pulse');
        void essenceEl.offsetWidth;
        essenceEl.classList.add('is-pulse');
      }
    }
    renderGraph(state);
    applyTransform();
  }

  function open() {
    openFlag = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    root.classList.add('is-open');
    hoverId = null;
    hideTip();
    endDrag();
    const state = typeof getState === 'function' ? getState() : null;
    ensureSpendSession(state);
    if (readonly) {
      targetPanX = 0;
      targetPanY = 120;
      targetScale = 0.52;
      panX = 0;
      panY = 120;
      scale = 0.52;
    } else {
      targetPanX = 0;
      targetPanY = 40;
      targetScale = 1;
      panX = 0;
      panY = reduced ? 40 : 80;
      scale = reduced ? 1 : 0.86;
    }
    refresh();
    if (!animFrame) animFrame = requestAnimationFrame(tickMotion);
    if (!readonly) continueBtn?.focus();
  }

  function close() {
    if (readonly) {
      // Memória do Rio: o painel pai controla a visibilidade; só pausa tip/drag.
      hideTip();
      endDrag();
      return;
    }
    openFlag = false;
    root.classList.remove('is-open');
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    hideTip();
    endDrag();
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = 0;
    }
  }

  continueBtn?.addEventListener('click', async () => {
    continueBtn.disabled = true;
    try {
      await onClose?.();
      close();
    } finally {
      continueBtn.disabled = false;
    }
  });

  svg?.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    if (ev.target?.closest?.('[data-talent-id]')) return;
    dragMode = 'pending';
    dragPtrId = ev.pointerId;
    lastPtr = { x: ev.clientX, y: ev.clientY };
    hideTip();
  });
  svg?.addEventListener('pointermove', (ev) => {
    if (dragMode === 'idle' || !lastPtr) return;
    if (dragPtrId != null && ev.pointerId !== dragPtrId) return;
    const dx = ev.clientX - lastPtr.x;
    const dy = ev.clientY - lastPtr.y;
    if (dragMode === 'pending') {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragMode = 'active';
      svg.setPointerCapture?.(ev.pointerId);
      hideTip();
    }
    targetPanX += dx;
    targetPanY += dy;
    panX += dx;
    panY += dy;
    lastPtr = { x: ev.clientX, y: ev.clientY };
    applyTransform();
  });
  svg?.addEventListener('pointerup', (ev) => endDrag(ev));
  svg?.addEventListener('pointercancel', (ev) => endDrag(ev));
  svg?.addEventListener('lostpointercapture', () => {
    dragMode = 'idle';
    dragPtrId = null;
    lastPtr = null;
  });
  svg?.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (dragMode === 'active') return;
    const { x, y } = clientToViewBox(ev.clientX, ev.clientY);
    const factor = ev.deltaY < 0 ? 1.1 : 0.91;
    setScaleAround(targetScale * factor, x, y);
  }, { passive: false });
  // Bloqueia seleção nativa (watermark / labels) no duplo clique do SVG.
  svg?.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    try {
      window.getSelection?.()?.removeAllRanges?.();
    } catch { /* ignore */ }
  });
  svg?.addEventListener('selectstart', (ev) => {
    ev.preventDefault();
  });

  /**
   * Pausa rAF / tip quando o painel embutido não está visível (aba Lethe).
   * @param {boolean} paused
   */
  function setMotionPaused(paused) {
    motionPaused = Boolean(paused);
    if (motionPaused) {
      hideTip();
      endDrag();
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = 0;
      }
      return;
    }
    if (openFlag && !animFrame) animFrame = requestAnimationFrame(tickMotion);
  }

  return {
    open,
    close,
    refresh,
    isOpen: () => openFlag,
    setMotionPaused,
  };
}
