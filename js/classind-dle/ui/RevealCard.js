'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Painel pós-reveal: acerto/erro + porque.
 * @param {{ state: object, isHost?: boolean }} opts
 */
export function renderRevealCard(root, { state, isHost = false }) {
  if (!state || state.phase !== 'revealed') {
    root.innerHTML = '';
    root.hidden = true;
    return;
  }

  root.hidden = false;
  const myVote = state.myVote;
  let badgeClass = 'is-neutral';
  let badgeText = 'Revelado';
  if (isHost) {
    badgeText = 'Mestre — não vota';
  } else if (myVote && state.youWereCorrect === true) {
    badgeClass = 'is-correct';
    badgeText = 'Você acertou';
  } else if (myVote && state.youWereCorrect === false) {
    badgeClass = 'is-wrong';
    badgeText = 'Você errou';
  } else if (!myVote) {
    badgeText = 'Você não votou';
  }

  const winner = state.correctSide === 'A' ? state.sideA?.title : state.sideB?.title;
  const winnerRating = state.correctSide === 'A' ? state.ratingA : state.ratingB;

  const descA = Array.isArray(state.descriptors?.A) ? state.descriptors.A.join(', ') : '';
  const descB = Array.isArray(state.descriptors?.B) ? state.descriptors.B.join(', ') : '';

  root.innerHTML = `
    <section class="classind-reveal" aria-live="polite">
      <span class="classind-reveal__badge ${badgeClass}">${escapeHtml(badgeText)}</span>
      <h3>Maior faixa: ${escapeHtml(winner || state.correctSide)} (${escapeHtml(winnerRating || '?')})</h3>
      <p><strong>Porque:</strong> ${escapeHtml(state.rationale || 'Referência pedagógica da aula.')}</p>
      <p style="margin-top:0.55rem;font-size:0.92rem;">
        A (${escapeHtml(state.ratingA || '?')}): ${escapeHtml(descA || '—')}<br />
        B (${escapeHtml(state.ratingB || '?')}): ${escapeHtml(descB || '—')}
      </p>
      <p style="margin-top:0.55rem;font-size:0.85rem;color:var(--hades-text-muted);">
        Valores de referência para a aula (ClassInd BR pedagógico).
      </p>
    </section>
  `;
}
