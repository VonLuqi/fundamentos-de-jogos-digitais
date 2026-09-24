/**
 * Listeners de integridade da prova (Tasks C2–C3).
 * Best-effort: blur / visibility / pagehide — com debounce para não floodar.
 * beforeunload: aviso nativo do navegador enquanto a prova está em andamento.
 */

'use strict';

export const PROVA_INTEGRITY_DEBOUNCE_MS = 3000;

/**
 * @param {object} options
 * @param {(type: string, meta?: Record<string, unknown>) => void|Promise<void>} [options.onEvent]
 * @param {() => void} [options.onFirstExit] — modal na 1ª saída detectada
 * @param {() => boolean} [options.shouldWarnUnload] — Task C3: dialog nativo ao fechar aba
 * @param {number} [options.debounceMs]
 * @param {Document} [options.doc]
 * @param {Window} [options.win]
 */
export function createProvaIntegrityMonitor(options = {}) {
  const {
    onEvent = null,
    onFirstExit = null,
    shouldWarnUnload = null,
    debounceMs = PROVA_INTEGRITY_DEBOUNCE_MS,
    doc = typeof document !== 'undefined' ? document : null,
    win = typeof window !== 'undefined' ? window : null,
  } = options;

  let running = false;
  let lastBlurAt = 0;
  let lastLeaveAt = 0;
  let firstExitFired = false;
  /** Quando true, não mostra o aviso nativo (saída intencional). */
  let unloadAllowed = false;
  /** @type {number|null} */
  let hiddenAt = null;
  /** @type {Array<[string, EventListener]>} */
  const docListeners = [];
  /** @type {Array<[string, EventListener]>} */
  const winListeners = [];

  function fireFirstExit() {
    if (firstExitFired) return;
    firstExitFired = true;
    try {
      onFirstExit?.();
    } catch (err) {
      console.warn('[prova/integrity] onFirstExit', err);
    }
  }

  /**
   * @param {string} type
   * @param {Record<string, unknown>} [meta]
   * @param {{ countAsExit?: boolean }} [opts]
   */
  function emit(type, meta = {}, opts = {}) {
    if (!running) return;
    if (opts.countAsExit !== false && type !== 'tab_focus') {
      fireFirstExit();
    }
    try {
      const result = onEvent?.(type, meta);
      if (result && typeof result.then === 'function') {
        result.catch((err) => console.warn('[prova/integrity] onEvent', err));
      }
    } catch (err) {
      console.warn('[prova/integrity] onEvent', err);
    }
  }

  /**
   * Debounce compartilhado para tab_blur / window_blur (máx. 1 / 3s).
   * @param {'tab_blur'|'window_blur'} type
   * @param {Record<string, unknown>} [meta]
   */
  function emitBlurDebounced(type, meta = {}) {
    const now = Date.now();
    if (now - lastBlurAt < debounceMs) return;
    lastBlurAt = now;
    emit(type, meta);
  }

  /**
   * pagehide + beforeunload costumam disparar juntos — 1 leave / 3s.
   * @param {'page_leave'|'beforeunload'} type
   * @param {Record<string, unknown>} [meta]
   */
  function emitLeaveDebounced(type, meta = {}) {
    const now = Date.now();
    if (now - lastLeaveAt < debounceMs) return;
    lastLeaveAt = now;
    emit(type, meta);
  }

  function onVisibilityChange() {
    if (!doc) return;
    if (doc.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      emitBlurDebounced('tab_blur', { via: 'visibilitychange' });
      return;
    }
    const absentMs = hiddenAt != null ? Math.max(0, Date.now() - hiddenAt) : null;
    hiddenAt = null;
    emit('tab_focus', { absentMs }, { countAsExit: false });
  }

  function onWindowBlur() {
    if (!doc) return;
    // Se a aba já está hidden, visibility cobre — evita double count
    if (doc.visibilityState === 'hidden') return;
    emitBlurDebounced('window_blur', { via: 'window.blur' });
  }

  function onPageHide(event) {
    emitLeaveDebounced('page_leave', {
      persisted: Boolean(event?.persisted),
      via: 'pagehide',
    });
  }

  /**
   * @param {BeforeUnloadEvent} event
   */
  function onBeforeUnload(event) {
    emitLeaveDebounced('beforeunload', { via: 'beforeunload' });
    // Task C3: aviso nativo do browser (texto customizado é ignorado pelos browsers modernos)
    if (unloadAllowed) return;
    let warn = true;
    try {
      warn = shouldWarnUnload ? Boolean(shouldWarnUnload()) : true;
    } catch {
      warn = true;
    }
    if (!warn) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function addDoc(type, fn) {
    if (!doc) return;
    doc.addEventListener(type, fn);
    docListeners.push([type, fn]);
  }

  function addWin(type, fn) {
    if (!win) return;
    win.addEventListener(type, fn);
    winListeners.push([type, fn]);
  }

  function start() {
    if (running) return;
    running = true;
    firstExitFired = false;
    unloadAllowed = false;
    lastBlurAt = 0;
    lastLeaveAt = 0;
    hiddenAt = null;
    addDoc('visibilitychange', onVisibilityChange);
    addWin('blur', onWindowBlur);
    addWin('pagehide', onPageHide);
    addWin('beforeunload', onBeforeUnload);
  }

  function stop() {
    if (!running) return;
    running = false;
    for (const [type, fn] of docListeners) {
      doc?.removeEventListener(type, fn);
    }
    for (const [type, fn] of winListeners) {
      win?.removeEventListener(type, fn);
    }
    docListeners.length = 0;
    winListeners.length = 0;
    hiddenAt = null;
  }

  /** Libera fechamento/navegação sem o dialog nativo (saída confirmada). */
  function allowUnload() {
    unloadAllowed = true;
  }

  /** Reporta saída intencional (botão Sair) sem depender dos listeners. */
  function reportManualLeave(meta = {}) {
    emitLeaveDebounced('page_leave', { ...meta, via: 'manual' });
  }

  return {
    start,
    stop,
    allowUnload,
    reportManualLeave,
    get running() {
      return running;
    },
    get firstExitFired() {
      return firstExitFired;
    },
    get unloadAllowed() {
      return unloadAllowed;
    },
  };
}
