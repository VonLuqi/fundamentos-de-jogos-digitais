/**
 * Persistência local de O Despertar.
 * IndexedDB `despertar-db-v2` / store `states` / chave = userId.
 * Fallback: sessionStorage (nunca a chave de auth em localStorage).
 * Epoch v2: invalida saves locais de quem jogou antes do gate do Acheron.
 */

import {
  SAVE_DEBOUNCE_MS,
  STORAGE_DB_NAME,
  STORAGE_SESSION_PREFIX,
  STORAGE_STORE_NAME,
} from '../config/constants.js';

export { STORAGE_DB_NAME, STORAGE_SESSION_PREFIX, STORAGE_STORE_NAME, SAVE_DEBOUNCE_MS };

function asUserId(userId) {
  if (userId == null || userId === '') return null;
  return String(userId);
}

function sessionKey(userId) {
  return `${STORAGE_SESSION_PREFIX}${userId}`;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export class StorageService {
  constructor(options = {}) {
    this.indexedDB = options.indexedDB ?? (typeof indexedDB !== 'undefined' ? indexedDB : null);
    this.sessionStorage = options.sessionStorage
      ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    this.dbName = options.dbName ?? STORAGE_DB_NAME;
    this.storeName = options.storeName ?? STORAGE_STORE_NAME;
    this.debounceMs = Number.isFinite(options.debounceMs) ? options.debounceMs : SAVE_DEBOUNCE_MS;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.setTimeout = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (fn, ms) => setTimeout(fn, ms);
    this.clearTimeout = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : (id) => clearTimeout(id);
    this._db = null;
    this._idbDisabled = !this.indexedDB;
    this._timerId = null;
    this._pendingUserId = null;
    this._pendingState = null;
    this._flushing = null;
  }

  async load(userId) {
    const id = asUserId(userId);
    if (!id) return null;
    try {
      const fromIdb = await this.#idbGet(id);
      if (fromIdb) return fromIdb;
    } catch {
      this._idbDisabled = true;
    }
    return this.#sessionGet(id);
  }

  async save(userId, snapshot, extra = {}) {
    const id = asUserId(userId);
    if (!id) return { ok: false, via: null };
    const record = {
      userId: id,
      savedAt: extra.savedAt ?? new Date(this.now()).toISOString(),
      state: snapshot ?? {},
    };
    if (!this._idbDisabled) {
      try {
        await this.#idbPut(record);
        return { ok: true, via: 'indexeddb', record };
      } catch {
        this._idbDisabled = true;
      }
    }
    const viaSession = this.#sessionPut(record);
    return { ok: viaSession, via: viaSession ? 'session' : null, record };
  }

  scheduleSave(userId, gameState) {
    const id = asUserId(userId);
    if (!id || !gameState) return;
    this._pendingUserId = id;
    this._pendingState = gameState;
    if (this._timerId != null) this.clearTimeout(this._timerId);
    this._timerId = this.setTimeout(() => {
      this._timerId = null;
      this.flush();
    }, this.debounceMs);
  }

  async flush() {
    if (this._timerId != null) {
      this.clearTimeout(this._timerId);
      this._timerId = null;
    }
    if (this._flushing) return this._flushing;
    const gameState = this._pendingState;
    const userId = this._pendingUserId;
    this._pendingState = null;
    this._pendingUserId = null;
    if (!gameState || userId == null) return { ok: false, via: null };
    this._flushing = this.save(userId, gameState.toSnapshot())
      .finally(() => { this._flushing = null; });
    return this._flushing;
  }

  attach(gameState, userId, { target } = {}) {
    const host = target
      ?? (typeof window !== 'undefined' ? window : null);
    const unsubscribe = gameState.subscribe(() => this.scheduleSave(userId, gameState));
    const onPageHide = () => { this.flush(); };
    host?.addEventListener?.('pagehide', onPageHide);
    return () => {
      unsubscribe();
      host?.removeEventListener?.('pagehide', onPageHide);
      this.flush();
    };
  }

  async #getDb() {
    if (this._idbDisabled) throw new Error('IndexedDB indisponível.');
    if (this._db) return this._db;
    const db = await new Promise((resolve, reject) => {
      let request;
      try {
        request = this.indexedDB.open(this.dbName, 1);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        const next = request.result;
        if (!next.objectStoreNames.contains(this.storeName)) {
          next.createObjectStore(this.storeName, { keyPath: 'userId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB.'));
    });
    this._db = db;
    return db;
  }

  async #idbGet(userId) {
    const db = await this.#getDb();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const row = await requestToPromise(store.get(userId));
    return row ?? null;
  }

  async #idbPut(record) {
    const db = await this.#getDb();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await requestToPromise(store.put(record));
    return record;
  }

  #sessionGet(userId) {
    if (!this.sessionStorage) return null;
    try {
      const raw = this.sessionStorage.getItem(sessionKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  #sessionPut(record) {
    if (!this.sessionStorage) return false;
    try {
      this.sessionStorage.setItem(sessionKey(record.userId), JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  }
}
