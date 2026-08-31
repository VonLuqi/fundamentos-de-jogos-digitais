// Client-side helpers: session, auth, progress + Game Feel effects
const API_AUTH = '/api/auth';
const API_PROGRESS = '/api/progress';

export function saveSession(token, user) {
  const payload = { token, user };
  localStorage.setItem('activeSession', JSON.stringify(payload));
}

export function loadSession() {
  try { return JSON.parse(localStorage.getItem('activeSession')); } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem('activeSession');
}

export async function login(username, password) {
  const res = await fetch(API_AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', username, password }) });
  return res.json();
}

export async function register(username, password) {
  const res = await fetch(API_AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', username, password }) });
  return res.json();
}

export async function redeemCode(code) {
  const sess = loadSession();
  if (!sess) throw new Error('No session');
  const res = await fetch(API_PROGRESS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redeem', token: sess.token, code }) });
  return res.json();
}

// Minimal DOM helpers for Game Feel
export function flashScreen() {
  const el = document.getElementById('screen-flash') || document.querySelector('.screen-flash');
  if (!el) return;
  el.classList.add('is-active');
  setTimeout(() => el.classList.remove('is-active'), 900);
}

export function showLevelup(awarded) {
  const ov = document.getElementById('levelup-overlay') || document.querySelector('.levelup-overlay');
  if (!ov) return;
  const title = ov.querySelector('.levelup-card__title');
  const glyph = ov.querySelector('.levelup-card__glyph');
  title.textContent = `Level Up! +${awarded.xp} XP`;
  glyph.textContent = '✶';
  ov.classList.add('is-active');
  setTimeout(() => ov.classList.remove('is-active'), 1800);
}

export function shake(el) {
  if (!el) return;
  el.classList.add('is-shaking');
  setTimeout(() => el.classList.remove('is-shaking'), 520);
}

export function updateXpBar(user) {
  const bar = document.getElementById('xp-fill') || document.getElementById('xp-bar-fill');
  const label = document.getElementById('xp-text') || document.getElementById('xp-label');
  if (!bar || !label) return;
  const xp = user.xp || 0;
  const pct = Math.min(100, (xp % 100));
  bar.style.width = pct + '%';
  label.textContent = `${xp} XP`;
}

export function renderProfile(user) {
  const nameEl = document.getElementById('profile-name') || document.getElementById('player-name');
  const xpEl = document.getElementById('xp-text') || document.getElementById('player-xp');
  const avatarEl = document.getElementById('avatar-glyph') || document.getElementById('player-avatar');
  if (nameEl) nameEl.textContent = user.username || '—';
  if (xpEl) xpEl.textContent = `${user.xp || 0} XP`;
  if (avatarEl) avatarEl.textContent = ['⚔','♛','⚑','☼','✹','☽'][user.avatar_index || 0];
  updateXpBar(user);
}

// Hook up altar input behavior
export function bindAltar() {
  const btn = document.getElementById('btn-offer') || document.getElementById('offer-btn');
  const input = document.getElementById('altar-input') || document.getElementById('altar-code');
  if (!btn || !input) return;
  btn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const code = input.value.trim();
    if (!code) return;
    try {
      const result = await redeemCode(code);
      if (result.ok) {
        flashScreen();
        showLevelup(result.awarded);
        const sess = loadSession();
        if (sess) saveSession(sess.token, result.user);
        renderProfile(result.user);
      } else {
        shake(input);
        const fb = document.getElementById('altar-feedback');
        if (fb) fb.textContent = result.error || 'O Estige rejeitou a oferenda.';
      }
    } catch (err) {
      console.error(err);
      shake(input);
    }
  });
}

// Admin UI helper
export function bindAdmin() {
  const btn = document.getElementById('btn-generate-codes') || document.getElementById('admin-gen');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    alert('Códigos ativos:\nMDA2026 — Aula 1 (20 XP)');
  });
}
