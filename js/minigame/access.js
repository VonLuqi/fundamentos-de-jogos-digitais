/**
 * Acesso ao Arcane Survivors — sem importar api.js (evita game-catalog.json
 * no caminho crítico do menu / botão Iniciar).
 */

export const ARCANE_SURVIVORS_FEATURE_ID = "arcane_survivors";
const SESSION_KEY = "activeSession";
const API_BASE = "/api";

export function getLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token ? session : null;
  } catch {
    return null;
  }
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} (timeout ${ms}ms)`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error("API sem JSON — rode `vercel dev` ou publique no Vercel.");
  }
  if (!response.ok || payload?.ok === false) {
    const err = new Error(payload?.error || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return payload;
}

function normalizeUser(raw) {
  if (!raw) return raw;
  const fullName = raw.fullName ?? raw.full_name ?? raw.name ?? raw.username ?? "Jogador";
  return {
    ...raw,
    name: fullName,
    fullName,
    role: raw.role ?? "student",
  };
}

/**
 * Valida sessão sem redirecionar. Timeout curto para não travar o botão.
 * @returns {Promise<{ session: object, user: object } | null>}
 */
export async function softValidateSession(timeoutMs = 4000) {
  const session = getLocalSession();
  if (!session) return null;

  try {
    const payload = await withTimeout(
      requestJson(`/auth?token=${encodeURIComponent(session.token)}`, { method: "GET" }),
      timeoutMs,
      "Validação de sessão"
    );
    const user = normalizeUser(payload.user);
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          token: session.token,
          name: user.name,
          role: user.role,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      /* ignore */
    }
    return { session, user };
  } catch (error) {
    if (error?.status === 401) return null;
    // Offline / API lenta: se o cache local já diz admin, libera a arena.
    if (session.role === "admin") {
      return { session, user: normalizeUser({ name: session.name, role: "admin" }) };
    }
    console.warn("softValidateSession:", error);
    return {
      session,
      user: normalizeUser({ name: session.name, role: session.role || "student" }),
    };
  }
}

export async function fetchFeatureUnlocked(token, featureId = ARCANE_SURVIVORS_FEATURE_ID, timeoutMs = 4000) {
  try {
    const payload = await withTimeout(
      requestJson("/progress", {
        method: "POST",
        body: JSON.stringify({ token, action: "featureGates", featureId }),
      }),
      timeoutMs,
      "Feature gates"
    );
    return Boolean(payload?.gates?.unlocked);
  } catch (error) {
    console.warn("fetchFeatureUnlocked:", error);
    return false;
  }
}
