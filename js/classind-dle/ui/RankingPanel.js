'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function medalClass(rank) {
  if (rank === 1) return 'is-gold';
  if (rank === 2) return 'is-silver';
  if (rank === 3) return 'is-bronze';
  return '';
}

/**
 * Ranking final da sessão.
 */
export function renderRankingPanel(root, {
  state,
  isHost = false,
  onCloseRoom,
}) {
  if (!root) return;

  const ranking = Array.isArray(state?.ranking) ? state.ranking : [];

  root.innerHTML = `
    <section class="classind-ranking" aria-label="Ranking da sessão">
      <p class="lesson-chip">Resultado final</p>
      <h2 class="lesson-title">Ranking</h2>
      <p class="classind-ranking__lead">Ordenado por acertos nesta sessão.</p>
      <ol class="classind-ranking__list">
        ${ranking.length ? ranking.map((row) => `
          <li class="${medalClass(Number(row.rank))}">
            <span class="classind-ranking__pos">#${Number(row.rank) || '?'}</span>
            <span class="classind-ranking__name">${escapeHtml(row.username || `user ${row.userId}`)}</span>
            <span class="classind-ranking__score">${Number(row.scoreCorrect) || 0}/${Number(row.scoreTotal ?? row.scoreAnswered) || 0}</span>
          </li>
        `).join('') : '<li>Nenhum aluno ranqueado.</li>'}
      </ol>
      ${isHost ? `
        <div class="classind-ranking__actions">
          <button type="button" class="lesson-cta classind-host__close" data-ranking="close">Encerrar sala</button>
        </div>
      ` : `
        <p class="classind-ranking__wait">Aguarde o Mestre encerrar a sala.</p>
      `}
    </section>
  `;

  root.querySelector('[data-ranking="close"]')?.addEventListener('click', onCloseRoom);
}
