/**
 * Banner "Voltar à inscrição" em páginas de aula (?fromNote=).
 */

'use strict';

import { ApiError, ROUTES, getNote, getSession } from './api.js';

export function initFromNoteBanner({ token } = {}) {
  const params = new URLSearchParams(window.location.search);
  const noteId = Number(params.get('fromNote'));
  if (!Number.isInteger(noteId) || noteId <= 0) return;

  const sessionToken = token || getSession()?.token;
  if (!sessionToken) return;

  const host = document.querySelector('.app-shell__content') || document.querySelector('main');
  if (!host) return;

  const bar = document.createElement('p');
  bar.className = 'grimorio-from-note';
  bar.id = 'grimorio-from-note';
  bar.innerHTML = '<span class="grimorio-from-note__label">Voltando à inscrição…</span>';
  host.prepend(bar);

  getNote(sessionToken, noteId)
    .then((payload) => {
      const title = payload.note?.title || 'inscrição';
      bar.replaceChildren();
      const link = document.createElement('a');
      link.className = 'grimorio-from-note__link';
      link.href = ROUTES.grimorioNota(noteId);
      link.textContent = `← Voltar à inscrição: ${title}`;
      bar.appendChild(link);
    })
    .catch((error) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        bar.remove();
        return;
      }
      bar.replaceChildren();
      const link = document.createElement('a');
      link.className = 'grimorio-from-note__link';
      link.href = ROUTES.grimorioNota(noteId);
      link.textContent = '← Voltar à inscrição';
      bar.appendChild(link);
    });
}
