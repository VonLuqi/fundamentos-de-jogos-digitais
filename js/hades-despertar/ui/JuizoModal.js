/**
 * Modal do Juízo do Tartarus — F3: click-card + Empate; sucessor sempre desafiante.
 * GameLoop continua; Esc / Voltar abandonam sem revelar faixas.
 * Choices canônicos: A | B | tie (aliases higher/lower ainda aceitos no server).
 */

'use strict';

import { juiceBumpClass, juicePrefersReducedMotion } from './juice.js';
import { JUIZO_MODAL_EDU_HINT } from '../config/juizo-pool.js';

function setText(el, value) {
  if (el) el.textContent = value == null ? '' : String(value);
}

function setHidden(el, hidden) {
  if (el) el.hidden = Boolean(hidden);
}

function wait(ms) {
  return new Promise((resolve) => {
    const timer = typeof globalThis.setTimeout === 'function'
      ? globalThis.setTimeout.bind(globalThis)
      : null;
    if (!timer) {
      resolve();
      return;
    }
    timer(resolve, ms);
  });
}

function cardNodes(root, side) {
  return {
    root: root.querySelector(`[data-juizo-card="${side}"]`),
    title: root.querySelector(`[data-juizo-title="${side}"]`),
    blurb: root.querySelector(`[data-juizo-blurb="${side}"]`),
    cover: root.querySelector(`[data-juizo-cover="${side}"]`),
    rating: root.querySelector(`[data-juizo-rating="${side}"]`),
  };
}

function failCardNodes(root, side) {
  return {
    root: root.querySelector(`[data-juizo-fail-card="${side}"]`),
    title: root.querySelector(`[data-juizo-fail-title="${side}"]`),
    cover: root.querySelector(`[data-juizo-fail-cover="${side}"]`),
    rating: root.querySelector(`[data-juizo-fail-rating="${side}"]`),
  };
}

export class JuizoModal {
  /**
   * @param {Document} doc
   * @param {{
   *   start: () => Promise<object>,
   *   guess: (choice: string) => Promise<object>,
   *   abandon: () => Promise<object>,
   * }} api
   */
  constructor(doc, api) {
    this.doc = doc;
    this.api = api;
    this.root = doc.getElementById('despertar-juizo-modal');
    this._busy = false;
    this._focusBefore = null;
    this._lastPair = null;
    this._onKey = (event) => this.#onKeyDown(event);
  }

  mount() {
    if (!this.root) return this;
    this.play = this.root.querySelector('[data-juizo-view="play"]');
    this.fail = this.root.querySelector('[data-juizo-view="fail"]');
    this.stage = this.root.querySelector('[data-juizo-stage]');
    this.failStage = this.root.querySelector('[data-juizo-fail-stage]');
    this.confetti = this.root.querySelector('[data-juizo-confetti]');
    this.hudStreak = this.root.querySelector('[data-juizo-hud="streak"]');
    this.hudBest = this.root.querySelector('[data-juizo-hud="best"]');
    this.hudVerdicts = this.root.querySelector('[data-juizo-hud="verdicts"]');
    this.cardA = cardNodes(this.root, 'A');
    this.cardB = cardNodes(this.root, 'B');
    this.failCardA = failCardNodes(this.root, 'A');
    this.failCardB = failCardNodes(this.root, 'B');
    this.failBody = this.root.querySelector('[data-juizo-fail-body]');
    this.reveal = this.root.querySelector('[data-juizo-reveal]');
    this.revealA = this.root.querySelector('[data-juizo-reveal-a]');
    this.revealB = this.root.querySelector('[data-juizo-reveal-b]');
    this.btnTie = this.root.querySelector('[data-juizo-choice="tie"]');
    this.btnBack = this.root.querySelector('[data-juizo-action="back"]');
    this.btnRestart = this.root.querySelector('[data-juizo-action="restart"]');
    this.btnFailBack = this.root.querySelector('[data-juizo-action="fail-back"]');

    const eduHint = this.root.querySelector('[data-juizo-hint]');
    if (eduHint) eduHint.textContent = JUIZO_MODAL_EDU_HINT;

    this.cardA?.root?.addEventListener('click', () => this.#guess('A'));
    this.cardB?.root?.addEventListener('click', () => this.#guess('B'));
    this.btnTie?.addEventListener('click', () => this.#guess('tie'));
    this.btnBack?.addEventListener('click', () => this.close({ abandon: true }));
    this.btnFailBack?.addEventListener('click', () => this.close({ abandon: false }));
    this.btnRestart?.addEventListener('click', () => this.open());
    return this;
  }

  get isOpen() {
    return Boolean(this.root && !this.root.hidden);
  }

  async open() {
    if (!this.root || this._busy) return;
    this._busy = true;
    try {
      const result = await this.api.start();
      if (!result?.ok || !result.pair) {
        throw new Error(result?.error || 'O Juízo se fecha.');
      }
      this._focusBefore = this.doc.activeElement;
      this.root.hidden = false;
      this.root.setAttribute('aria-hidden', 'false');
      this.doc.addEventListener('keydown', this._onKey);
      this.#showPlay(result);
      this.cardA?.root?.focus();
    } catch (error) {
      console.error('[JuizoModal]', error);
      throw error;
    } finally {
      this._busy = false;
    }
  }

  async close({ abandon = true } = {}) {
    if (!this.root || this.root.hidden) return;
    if (abandon && this.play && !this.play.hidden) {
      try {
        await this.api.abandon();
      } catch {
        /* fecha mesmo assim */
      }
    }
    this.#clearConfetti();
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    this.doc.removeEventListener('keydown', this._onKey);
    const prev = this._focusBefore;
    this._focusBefore = null;
    if (prev && typeof prev.focus === 'function') prev.focus();
  }

  #onKeyDown(event) {
    if (!this.isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close({ abandon: true });
      return;
    }

    if (this.play && !this.play.hidden && !this._busy) {
      const key = event.key;
      if (key === 'ArrowLeft' || key === '1') {
        event.preventDefault();
        this.#guess('A');
        return;
      }
      if (key === 'ArrowRight' || key === '2') {
        event.preventDefault();
        this.#guess('B');
        return;
      }
      if (key === 'e' || key === 'E') {
        event.preventDefault();
        this.#guess('tie');
        return;
      }
    }

    if (event.key !== 'Tab' || !this.root) return;
    const focusable = [...this.root.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null || el === this.doc.activeElement);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #renderHud(hud = {}, { bump = false } = {}) {
    setText(this.hudStreak, `Sequência ${hud.streak ?? 0}`);
    setText(this.hudBest, `Recorde ${hud.best ?? 0}`);
    setText(this.hudVerdicts, `${hud.verdicts ?? 0} Vereditos`);
    if (bump && !juicePrefersReducedMotion()) {
      juiceBumpClass(this.hudStreak, 'is-bump', 480);
    }
  }

  #paintCard(nodes, card, { rating, mystery = false, reveal = false } = {}) {
    if (!nodes?.root || !card) return;
    setText(nodes.title, card.title || '—');
    if (nodes.blurb) setText(nodes.blurb, card.blurb || '');
    if (nodes.cover) {
      nodes.cover.alt = card.title || '';
      nodes.cover.src = card.coverUrl || card.cover || '';
      nodes.cover.hidden = !(card.coverUrl || card.cover);
    }
    if (!nodes.rating) return;
    nodes.rating.classList.toggle('is-mystery', mystery);
    nodes.rating.classList.remove('is-reveal');
    if (mystery) {
      setText(nodes.rating, '?');
      nodes.rating.setAttribute('aria-label', 'Faixa do desafiante oculta');
      return;
    }
    const value = rating ?? card.rating ?? '—';
    setText(nodes.rating, value);
    nodes.rating.setAttribute('aria-label', `Faixa ${value}`);
    if (reveal && !juicePrefersReducedMotion()) {
      juiceBumpClass(nodes.rating, 'is-reveal', 520);
    }
  }

  #clearCardFeel() {
    this.cardA?.root?.classList.remove('is-hit', 'is-miss');
    this.cardB?.root?.classList.remove('is-hit', 'is-miss');
    this.stage?.classList.remove('is-slide-in', 'is-shake');
    this.failStage?.classList.remove('is-shake', 'is-vignette');
  }

  #choiceButtons() {
    return [this.cardA?.root, this.cardB?.root, this.btnTie].filter(Boolean);
  }

  #setChoicesDisabled(disabled) {
    this.#choiceButtons().forEach((btn) => {
      btn.disabled = Boolean(disabled);
    });
  }

  #clearConfetti() {
    if (!this.confetti) return;
    this.confetti.replaceChildren();
    this.confetti.classList.remove('is-active');
  }

  #burstConfetti() {
    if (!this.confetti || juicePrefersReducedMotion()) return;
    this.#clearConfetti();
    const frag = this.doc.createDocumentFragment();
    for (let i = 0; i < 14; i += 1) {
      const bit = this.doc.createElement('span');
      bit.className = 'despertar-juizo-modal__confetti-bit';
      bit.style.setProperty('--juizo-bit-x', `${(Math.random() * 100).toFixed(1)}%`);
      bit.style.setProperty('--juizo-bit-delay', `${(Math.random() * 120).toFixed(0)}ms`);
      bit.style.setProperty('--juizo-bit-rot', `${(Math.random() * 160 - 80).toFixed(0)}deg`);
      frag.appendChild(bit);
    }
    this.confetti.appendChild(frag);
    this.confetti.classList.add('is-active');
    const timer = typeof globalThis.setTimeout === 'function'
      ? globalThis.setTimeout.bind(globalThis)
      : null;
    timer?.(() => this.#clearConfetti(), 900);
  }

  #showPlay(result, { celebrate = false, slide = false } = {}) {
    setHidden(this.play, false);
    setHidden(this.fail, true);
    setHidden(this.reveal, true);
    this.reveal?.classList.remove('is-reveal');
    this._lastPair = result.pair || null;
    this.#renderHud(result.hud, { bump: celebrate });
    this.#clearCardFeel();
    this.#paintCard(this.cardA, result.pair?.cardA, {
      rating: result.pair?.cardA?.rating,
      mystery: false,
    });
    this.#paintCard(this.cardB, result.pair?.cardB, { mystery: true });
    if (slide && !juicePrefersReducedMotion()) {
      juiceBumpClass(this.stage, 'is-slide-in', 520);
    }
    if (celebrate && !juicePrefersReducedMotion()) {
      juiceBumpClass(this.cardA?.root, 'is-hit', 450);
      juiceBumpClass(this.cardB?.root, 'is-hit', 450);
    }
    this.#setChoicesDisabled(false);
  }

  async #celebrateHit(result) {
    const reduced = juicePrefersReducedMotion();
    if (result.ratingB != null && this._lastPair?.cardB) {
      this.#renderHud(result.hud, { bump: !reduced });
      this.#paintCard(this.cardB, this._lastPair.cardB, {
        rating: result.ratingB,
        reveal: !reduced,
      });
      this.#burstConfetti();
      if (!reduced) {
        juiceBumpClass(this.cardA?.root, 'is-hit', 420);
        juiceBumpClass(this.cardB?.root, 'is-hit', 420);
        await wait(520);
      }
    }
    this.#showPlay(result, { celebrate: true, slide: true });
  }

  #showFail(result) {
    setHidden(this.play, true);
    setHidden(this.fail, false);
    this.#renderHud(result.hud);
    this.#clearCardFeel();
    this.#clearConfetti();

    const a = result.ratingA ?? '?';
    const b = result.ratingB ?? '?';
    const n = result.brokenStreak ?? 0;
    const best = result.hud?.best ?? 0;
    const delta = result.deltaLabel || `${a} → ${b}`;
    const pair = this._lastPair;

    this.#paintCard(this.failCardA, {
      ...(pair?.cardA || {}),
      rating: a,
    }, { rating: a, reveal: !juicePrefersReducedMotion() });
    this.#paintCard(this.failCardB, {
      ...(pair?.cardB || {}),
      rating: b,
    }, { rating: b, reveal: !juicePrefersReducedMotion() });

    setHidden(this.reveal, false);
    setText(this.revealA, a);
    setText(this.revealB, b);
    this.reveal?.classList.remove('is-reveal');
    if (!juicePrefersReducedMotion()) {
      void this.reveal?.offsetWidth;
      this.reveal?.classList.add('is-reveal');
      juiceBumpClass(this.failStage, 'is-shake', 480);
      juiceBumpClass(this.failStage, 'is-vignette', 700);
      juiceBumpClass(this.failCardB?.root, 'is-miss', 480);
    }

    setText(
      this.failBody,
      `Δ ${delta}. Sequência quebrada em ${n}. Recorde: ${best}.`,
    );
    this.btnRestart?.focus();
  }

  async #guess(choice) {
    if (this._busy || !this.isOpen) return;
    if (this.play?.hidden) return;
    this._busy = true;
    this.#setChoicesDisabled(true);
    try {
      const result = await this.api.guess(choice);
      if (!result?.ok) {
        throw new Error(result?.error || 'O Juízo se fecha.');
      }
      if (result.ended) {
        this.#showFail(result);
      } else {
        await this.#celebrateHit(result);
      }
    } catch (error) {
      console.error('[JuizoModal]', error);
      this.#setChoicesDisabled(false);
    } finally {
      this._busy = false;
    }
  }
}
