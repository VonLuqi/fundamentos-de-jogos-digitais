'use strict';

import {
  ApiError,
  ROUTES,
  getAchievementById,
  getSession,
  underworldRedeem,
} from '../api.js';

const form = document.getElementById('estige-form');
const statusEl = document.getElementById('estige-status');
const celebrate = document.getElementById('estige-celebrate');
const celebrateCard = document.getElementById('estige-celebrate-card');
const celebrateTitle = document.getElementById('estige-celebrate-title');
const celebrateDesc = document.getElementById('estige-celebrate-desc');
const celebrateXp = document.getElementById('estige-celebrate-xp');
const celebrateClose = document.getElementById('estige-celebrate-close');
const embersRoot = document.getElementById('estige-embers');
const auraAudio = document.getElementById('estige-aura');

console.log(
  '%c⚡ [CHARON_SYSTEM]: Calcule o hash SHA-256 em hexadecimal da string "ESTIGE_OBOLO_2026" utilizando crypto.subtle.digest().',
  'color:#cfa759;font-family:Cinzel,serif;font-size:13px;'
);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stopAura() {
  if (!auraAudio) return;
  auraAudio.pause();
  auraAudio.currentTime = 0;
}

function playAura() {
  if (!auraAudio) return;
  stopAura();
  const play = auraAudio.play();
  if (play && typeof play.catch === 'function') {
    play.catch(() => {
      /* Autoplay bloqueado — o clique em “Pagar o tributo” costuma liberar. */
    });
  }
}

function clearEmbers() {
  if (embersRoot) embersRoot.replaceChildren();
}

function spawnEmbers(count = 36) {
  if (!embersRoot || prefersReducedMotion()) return;
  clearEmbers();
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const ember = document.createElement('span');
    ember.className = 'submundo__ember';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
    const dist = 42 + Math.random() * 58;
    ember.style.setProperty('--dx', `${Math.cos(angle) * dist}vmin`);
    ember.style.setProperty('--dy', `${Math.sin(angle) * dist - 8}vmin`);
    ember.style.setProperty('--delay', `${Math.random() * 180}ms`);
    ember.style.setProperty('--dur', `${900 + Math.random() * 1100}ms`);
    ember.style.setProperty('--scale', `${0.55 + Math.random() * 1.35}`);
    ember.dataset.tone = Math.random() > 0.55 ? 'gold' : 'blood';
    frag.appendChild(ember);
  }
  embersRoot.appendChild(frag);
}

function quake(intensity = 'hard') {
  if (prefersReducedMotion()) return;
  document.documentElement.classList.remove('is-soberano-quake', 'is-soberano-quake--hard', 'is-soberano-quake--soft');
  void document.documentElement.offsetWidth;
  document.documentElement.classList.add('is-soberano-quake', `is-soberano-quake--${intensity}`);
  celebrateCard?.classList.remove('is-shaking');
  void celebrateCard?.offsetWidth;
  celebrateCard?.classList.add('is-shaking');
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(intensity === 'hard' ? [40, 30, 55, 30, 80] : [25, 40, 25]);
  }
}

function showCelebrate(achievement, xp) {
  if (!celebrate) return;
  if (celebrateTitle) celebrateTitle.textContent = achievement?.name || 'Soberano do Submundo';
  if (celebrateDesc) {
    celebrateDesc.textContent = String(achievement?.desc || '').trim();
  }
  if (celebrateXp) {
    if (xp > 0) {
      celebrateXp.hidden = false;
      celebrateXp.textContent = `+${xp} XP`;
    } else {
      celebrateXp.hidden = true;
      celebrateXp.textContent = '';
    }
  }

  celebrate.hidden = false;
  celebrate.classList.remove('is-open', 'is-epic');
  document.body.classList.add('is-soberano-celebrate');
  spawnEmbers(xp > 0 ? 42 : 24);
  playAura();

  requestAnimationFrame(() => {
    celebrate.classList.add('is-open', 'is-epic');
    quake('hard');
    window.setTimeout(() => {
      celebrateCard?.classList.remove('is-shaking');
      quake('soft');
    }, 720);
    window.setTimeout(() => {
      celebrateCard?.classList.remove('is-shaking');
      quake('soft');
    }, 1280);
  });

  celebrateClose?.focus({ preventScroll: true });
}

function teardownCelebrate() {
  stopAura();
  document.documentElement.classList.remove('is-soberano-quake', 'is-soberano-quake--hard', 'is-soberano-quake--soft');
  document.body.classList.remove('is-soberano-celebrate');
  celebrate?.classList.remove('is-open', 'is-epic');
  celebrateCard?.classList.remove('is-shaking');
  clearEmbers();
}

celebrateClose?.addEventListener('click', () => {
  teardownCelebrate();
  window.location.assign(ROUTES.conquistas());
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = getSession();
  if (!session?.token) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Caronte só aceita óbolo de quem possui sessão no Domínio.';
    }
    return;
  }
  const hash = String(document.getElementById('estige-obolo')?.value || '').trim();
  if (!hash) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Apresente o óbolo.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = '';
    statusEl.textContent = 'O barqueiro avalia o tributo…';
  }
  try {
    const result = await underworldRedeem(session.token, hash);
    const achievement = getAchievementById('soberano_do_submundo');
    const xp = result.alreadyOwned ? 0 : (result.awarded?.xp || achievement?.xp || 0);
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.alreadyOwned
        ? 'Você já cruzou estas águas.'
        : 'Travessia selada.';
    }
    showCelebrate(achievement, xp);
  } catch (error) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = error instanceof ApiError
        ? error.message
        : 'Óbolo rejeitado.';
    }
  }
});
