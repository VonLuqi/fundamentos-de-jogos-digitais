/**
 * Sync autoritativo com /api/despertar (Task 9 + Fase B / B6).
 * Heartbeat 30 s só envia se `_dirty` (D7); compras forçam sync.
 * Mínimo 5 s entre syncs.
 */

import {
  despertarJuizoAbandon,
  despertarJuizoGuess,
  despertarJuizoStart,
  despertarPrestige,
  despertarStateGet,
  despertarStateSync,
  despertarTalentBuy,
  despertarVerdictBuy,
  despertarDebugGrant,
  despertarDebugReset,
  despertarDebugSandbox,
} from '../../api.js';
import {
  SYNC_HEARTBEAT_MS,
  SYNC_MIN_INTERVAL_MS,
} from '../config/constants.js';

export class ApiService {
  /**
   * @param {object} options
   * @param {() => string|null} options.getToken
   * @param {() => object} options.getSnapshot — GameState.toSnapshot()
   * @param {(state: object) => void} options.applyServerState
   * @param {(info: { status?: number, error?: string, state?: object }) => void} [options.onRejected]
   * @param {(info: { ok: true, state: object, awarded?: unknown[] }) => void} [options.onSynced]
   */
  constructor(options = {}) {
    this.getToken = typeof options.getToken === 'function' ? options.getToken : () => null;
    this.getSnapshot = typeof options.getSnapshot === 'function' ? options.getSnapshot : () => ({});
    this.applyServerState = typeof options.applyServerState === 'function'
      ? options.applyServerState
      : () => {};
    this.onRejected = typeof options.onRejected === 'function' ? options.onRejected : null;
    this.onSynced = typeof options.onSynced === 'function' ? options.onSynced : null;
    this.heartbeatMs = Number.isFinite(options.heartbeatMs) ? options.heartbeatMs : SYNC_HEARTBEAT_MS;
    this.minIntervalMs = Number.isFinite(options.minIntervalMs)
      ? options.minIntervalMs
      : SYNC_MIN_INTERVAL_MS;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this._timer = null;
    this._flushTimer = null;
    this._inFlight = null;
    this._lastSyncAt = 0;
    this._dirty = false;
  }

  start() {
    this.stop();
    // D7 / B6: tick ocioso NÃO marca dirty — só tenta flush se já houver mudanças.
    this._timer = setInterval(() => {
      if (!this._dirty) return;
      this._armFlushTimer({ force: false });
    }, this.heartbeatMs);
    return this;
  }

  stop() {
    if (this._timer != null) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._flushTimer != null) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
  }

  /** Marca dirty sem agendar (útil em testes / composição). */
  markDirty() {
    this._dirty = true;
  }

  get isDirty() {
    return this._dirty;
  }

  /**
   * Marca dirty e agenda sync (respeita mínimo 5 s).
   * @param {{ force?: boolean }} [options] force=true encurta a espera ao mínimo (compras).
   */
  scheduleFlush({ force = false } = {}) {
    this._dirty = true;
    this._armFlushTimer({ force });
  }

  _armFlushTimer({ force = false } = {}) {
    if (this._flushTimer != null) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    const elapsed = this.now() - this._lastSyncAt;
    const wait = force
      ? Math.max(0, this.minIntervalMs - elapsed)
      : Math.max(this.minIntervalMs - elapsed, 0);
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this.flush();
    }, wait);
  }

  /** Flush imediato após compra / prestígio / talento (ainda respeita min interval). */
  requestSync() {
    this.scheduleFlush({ force: true });
  }

  async pullState({ apply = true } = {}) {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarStateGet(token);
    if (result?.state && apply) {
      this.applyServerState(result.state);
      this.onSynced?.({ ok: true, state: result.state, awarded: result.awarded || [] });
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async flush() {
    if (this._inFlight) return this._inFlight;
    // Idle / heartbeat: sem dirty e já sincronizou ao menos uma vez → no-op.
    if (!this._dirty && this._lastSyncAt > 0) return null;

    const token = this.getToken();
    if (!token) return null;

    const snapshot = this.getSnapshot();
    this._inFlight = (async () => {
      try {
        const result = await despertarStateSync(token, snapshot);
        this._lastSyncAt = this.now();
        this._dirty = false;
        if (result?.state) {
          this.applyServerState(result.state);
          this.onSynced?.({ ok: true, state: result.state, awarded: result.awarded || [] });
        }
        return result;
      } catch (error) {
        const status = Number(error?.status) || 0;
        const payload = error?.payload || {};
        if (payload.state) {
          this.applyServerState(payload.state);
        }
        this.onRejected?.({
          status,
          error: payload.error || error?.message || 'sync_failed',
          state: payload.state,
        });
        if (status === 400 || status === 409) {
          this._dirty = false;
          this._lastSyncAt = this.now();
        }
        throw error;
      } finally {
        this._inFlight = null;
      }
    })();

    return this._inFlight;
  }

  async prestige() {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarPrestige(token);
    if (result?.state) {
      this.applyServerState(result.state);
      this.onSynced?.({ ok: true, state: result.state, awarded: result.awarded || [] });
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async talentBuy(talentId) {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarTalentBuy(token, talentId);
    if (result?.state) {
      this.applyServerState(result.state);
      this.onSynced?.({ ok: true, state: result.state, awarded: result.awarded || [] });
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async verdictBuy(purchaseId) {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarVerdictBuy(token, purchaseId);
    if (result?.state) {
      this.applyServerState(result.state);
      this.onSynced?.({ ok: true, state: result.state, awarded: result.awarded || [] });
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async debugSandbox() {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarDebugSandbox(token);
    if (result?.state) {
      this.applyServerState(result.state);
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async debugReset() {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarDebugReset(token);
    if (result?.state) {
      this.applyServerState(result.state);
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async debugGrant(grantId) {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarDebugGrant(token, grantId);
    if (result?.state) {
      this.applyServerState(result.state);
      this._lastSyncAt = this.now();
      this._dirty = false;
    }
    return result;
  }

  async juizoStart() {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarJuizoStart(token);
    if (result?.state) {
      this.applyServerState(result.state);
      this._lastSyncAt = this.now();
    }
    return result;
  }

  async juizoGuess(choice) {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarJuizoGuess(token, choice);
    if (result?.state) {
      this.applyServerState(result.state);
      this.onSynced?.({ ok: true, state: result.state, awarded: result.awarded || [] });
      this._lastSyncAt = this.now();
    }
    return result;
  }

  async juizoAbandon() {
    const token = this.getToken();
    if (!token) return null;
    const result = await despertarJuizoAbandon(token);
    if (result?.state) {
      this.applyServerState(result.state);
      this._lastSyncAt = this.now();
    }
    return result;
  }
}
