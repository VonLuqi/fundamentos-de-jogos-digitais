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
const celebrateTitle = document.getElementById('estige-celebrate-title');
const celebrateDesc = document.getElementById('estige-celebrate-desc');
const celebrateClose = document.getElementById('estige-celebrate-close');

console.log(
  '%c⚡ [CHARON_SYSTEM]: Calcule o hash SHA-256 em hexadecimal da string "ESTIGE_OBOLO_2026" utilizando crypto.subtle.digest().',
  'color:#cfa759;font-family:Cinzel,serif;font-size:13px;'
);

function showCelebrate(achievement, xp) {
  if (!celebrate) return;
  if (celebrateTitle) celebrateTitle.textContent = achievement?.name || 'Soberano do Submundo';
  if (celebrateDesc) {
    const xpNote = xp ? ` (+${xp} XP)` : '';
    celebrateDesc.textContent = `${achievement?.desc || ''}${xpNote}`.trim();
  }
  celebrate.hidden = false;
  requestAnimationFrame(() => celebrate.classList.add('is-open'));
}

celebrateClose?.addEventListener('click', () => {
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
    const xp = result.awarded?.xp || achievement?.xp || 0;
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.alreadyOwned
        ? 'Você já cruzou estas águas.'
        : 'Travessia selada.';
    }
    showCelebrate(achievement, result.alreadyOwned ? 0 : xp);
  } catch (error) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = error instanceof ApiError
        ? error.message
        : 'Óbolo rejeitado.';
    }
  }
});
