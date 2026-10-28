/**
 * Corça de Ártemis (Reindeer do Cookie Clicker): só na Saturnália, atravessa o Acheron e, ao ser
 * clicada, rende 1 min de produção (SeasonSystem.catchArtemisDeer). Sem RAF próprio — `frame()` é
 * chamado pelo GameLoop, como a Foice 3D.
 */

import { formatSouls } from './NumberFormatter.js';
import { isSaturnaliaActive } from './DragonSeasonsView.js';
import { createSpriteNode, seasonSprite } from './world/SpriteAtlas.js';

export const DEER_RUN_MS = 8000;
export const DEER_FIRST_DELAY_MS = [30_000, 60_000];
export const DEER_INTERVAL_MS = [120_000, 240_000];

const between = (random, [lo, hi]) => lo + random() * (hi - lo);

export class ArtemisDeerView {
  /**
   * @param {{
   *   document: Document,
   *   layer: HTMLElement|null,
   *   getState: () => any,
   *   onCatch: () => { ok: boolean, reward?: string }|null,
   *   reducedMotion?: () => boolean,
   *   random?: () => number,
   * }} options
   */
  constructor(options) {
    this.doc = options.document;
    this.layer = options.layer;
    this.getState = options.getState;
    this.onCatch = options.onCatch;
    this.reducedMotion = options.reducedMotion || (() => false);
    this.random = options.random || Math.random;
    this._nextAt = null;
    this._deer = null;
    this._despawnAt = 0;
  }

  /** @param {number} nowMs relógio real (performance.now) */
  frame(nowMs) {
    if (!this.layer || this.doc?.hidden) return;
    if (this._deer && nowMs >= this._despawnAt) this.#despawn();
    if (!isSaturnaliaActive(this.getState() || {})) {
      this._nextAt = null;
      if (this._deer) this.#despawn();
      return;
    }
    if (this._deer) return;
    if (this._nextAt == null) {
      this._nextAt = nowMs + between(this.random, DEER_FIRST_DELAY_MS);
      return;
    }
    if (nowMs >= this._nextAt) {
      this.#spawn(nowMs);
      this._nextAt = nowMs + DEER_RUN_MS + between(this.random, DEER_INTERVAL_MS);
    }
  }

  #spawn(nowMs) {
    const deer = this.doc.createElement('button');
    deer.type = 'button';
    const reduced = this.reducedMotion();
    const fromRight = this.random() < 0.5;
    deer.className = `despertar-corca${fromRight ? ' is-from-right' : ''}${reduced ? ' is-still' : ''}`;
    deer.setAttribute('aria-label', 'Capturar a Corça de Ártemis');
    deer.style.setProperty('--corca-y', `${Math.round(12 + this.random() * 50)}%`);
    deer.style.setProperty('--corca-ms', `${DEER_RUN_MS}ms`);
    deer.append(createSpriteNode(this.doc, seasonSprite('corca_de_artemis', 'Corça de Ártemis'), {
      className: 'despertar-sprite despertar-corca__art',
    }));
    deer.addEventListener('click', () => this.#catch(deer));
    this.layer.append(deer);
    this._deer = deer;
    this._despawnAt = nowMs + DEER_RUN_MS;
  }

  #catch(deer) {
    if (deer !== this._deer) return;
    const res = this.onCatch?.();
    this.#despawn();
    if (!res?.ok) return;
    const pop = this.doc.createElement('span');
    pop.className = 'despertar-corca__pop';
    pop.textContent = `Corça! +${formatSouls(res.reward || '0')} almas`;
    pop.style.setProperty('--corca-y', deer.style.getPropertyValue?.('--corca-y') || '40%');
    pop.addEventListener('animationend', () => pop.remove());
    this.layer.append(pop);
  }

  #despawn() {
    this._deer?.remove();
    this._deer = null;
  }

  /** Para teste: há corça na tela? */
  get visible() {
    return Boolean(this._deer);
  }
}
