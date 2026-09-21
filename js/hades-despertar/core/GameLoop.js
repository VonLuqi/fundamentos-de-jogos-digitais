/**
 * Game loop RAF — GDD §5.2.
 * Ticks fixos (60 Hz), interpolação no render, panic aos 300 updates.
 * Relógio / RAF injetáveis para o smoke no Node.
 */

import { LOOP_PANIC_UPDATES, TICK_FPS } from '../config/constants.js';

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function defaultRequestFrame(callback) {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  throw new Error('requestAnimationFrame indisponível. Injete requestFrame no GameLoop.');
}

function defaultCancelFrame(id) {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  }
}

function defaultMatchMedia(query) {
  if (typeof matchMedia === 'function') return matchMedia(query);
  return null;
}

export class GameLoop {
  constructor(updateCallback, renderCallback, options = {}) {
    const fps = Number(options.fps) > 0 ? Number(options.fps) : TICK_FPS;
    this.update = typeof updateCallback === 'function' ? updateCallback : () => {};
    this.render = typeof renderCallback === 'function' ? renderCallback : () => {};
    this.step = 1000 / fps;
    this.panicUpdates = Number.isFinite(options.panicUpdates)
      ? options.panicUpdates
      : LOOP_PANIC_UPDATES;
    this.now = typeof options.now === 'function' ? options.now : defaultNow;
    this.requestFrame = typeof options.requestFrame === 'function'
      ? options.requestFrame
      : defaultRequestFrame;
    this.cancelFrame = typeof options.cancelFrame === 'function'
      ? options.cancelFrame
      : defaultCancelFrame;
    this.document = options.document ?? (typeof document !== 'undefined' ? document : null);
    this.matchMedia = typeof options.matchMedia === 'function'
      ? options.matchMedia
      : defaultMatchMedia;
    this.onResume = typeof options.onResume === 'function' ? options.onResume : null;

    this.lastTime = null;
    this.accumulatedLag = 0;
    this.animationFrameId = null;
    this.isRunning = false;
    this.hiddenAt = null;
    this._listeningVisibility = false;
    this._onVisibility = () => this.#handleVisibility();
    this.loop = (currentTime) => this.#onFrame(currentTime);
  }

  prefersReducedMotion() {
    try {
      return Boolean(this.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
    } catch {
      return false;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.accumulatedLag = 0;
    this.lastTime = this.now();
    this.#listenVisibility();
    this.#schedule();
  }

  stop() {
    this.isRunning = false;
    this.#pauseFrames();
    this.accumulatedLag = 0;
    this.lastTime = null;
    this.hiddenAt = null;
    this.#unlistenVisibility();
  }

  #schedule() {
    if (!this.isRunning || this.animationFrameId != null) return;
    this.animationFrameId = this.requestFrame(this.loop);
  }

  #pauseFrames() {
    if (this.animationFrameId == null) return;
    this.cancelFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  #listenVisibility() {
    if (!this.document?.addEventListener || this._listeningVisibility) return;
    this.document.addEventListener('visibilitychange', this._onVisibility);
    this._listeningVisibility = true;
  }

  #unlistenVisibility() {
    if (!this.document?.removeEventListener || !this._listeningVisibility) return;
    this.document.removeEventListener('visibilitychange', this._onVisibility);
    this._listeningVisibility = false;
  }

  #handleVisibility() {
    if (!this.document) return;
    if (this.document.hidden) {
      this.hiddenAt = this.now();
      this.#pauseFrames();
      return;
    }

    const elapsedMs = this.hiddenAt != null ? Math.max(0, this.now() - this.hiddenAt) : 0;
    this.hiddenAt = null;
    this.accumulatedLag = 0;
    this.lastTime = this.now();
    if (elapsedMs > 0 && this.onResume) {
      this.onResume(elapsedMs / 1000);
    }
    if (this.isRunning) this.#schedule();
  }

  #onFrame(currentTime) {
    this.animationFrameId = null;
    if (!this.isRunning) return;

    const now = Number.isFinite(currentTime) ? currentTime : this.now();
    const previous = this.lastTime == null ? now : this.lastTime;
    const deltaTime = Math.max(0, now - previous);
    this.lastTime = now;
    this.accumulatedLag += deltaTime;

    let updateCount = 0;
    while (this.accumulatedLag >= this.step) {
      this.update(this.step / 1000);
      this.accumulatedLag -= this.step;
      if (++updateCount >= this.panicUpdates) {
        this.accumulatedLag = 0;
        break;
      }
    }

    const reducedMotion = this.prefersReducedMotion();
    const alpha = reducedMotion ? 1 : this.accumulatedLag / this.step;
    this.render(alpha, { reducedMotion, updates: updateCount });

    if (this.isRunning) this.#schedule();
  }
}
