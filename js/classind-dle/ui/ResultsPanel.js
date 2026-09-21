'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function outcomeLabel(outcome) {
  if (outcome === 'correct') return 'acertou';
  if (outcome === 'wrong') return 'errou';
  return 'não votou';
}

/**
 * Tela de desempenho (fim do deck).
 * Aluno: próprio placar + breakdown.
 * Mestre: tabela de todos + CTA Ver ranking.
 */
export function renderResultsPanel(root, {
  state,
  isHost = false,
  onShowRanking,
  onCloseRoom,
}) {
  if (!root) return;

  if (isHost) {
    const rows = Array.isArray(state?.performances) ? state.performances : [];
    root.innerHTML = `
      <section class="classind-results" aria-label="Desempenho da turma">
        <p class="lesson-chip">Fim do deck</p>
        <h2 class="lesson-title">Desempenho da turma</h2>
        <p class="classind-results__lead">Acertos de cada aluno nesta sessão.</p>
        <ul class="classind-results__list">
          ${rows.length ? rows.map((row) => {
            const denom = Number(row.scoreTotal ?? row.scoreAnswered) || 0;
            return `
            <li>
              <span>${escapeHtml(row.username || `user ${row.userId}`)}</span>
              <span class="classind-results__score">${Number(row.scoreCorrect) || 0}/${denom}</span>
            </li>`;
          }).join('') : '<li>Nenhum aluno com votos nesta sessão.</li>'}
        </ul>
        <div class="classind-results__actions">
          <button type="button" class="lesson-cta" data-results="ranking">Ver ranking</button>
          <button type="button" class="lesson-cta classind-host__close" data-results="close">Encerrar sala</button>
        </div>
      </section>
    `;
    root.querySelector('[data-results="ranking"]')?.addEventListener('click', onShowRanking);
    root.querySelector('[data-results="close"]')?.addEventListener('click', onCloseRoom);
    return;
  }

  const hasPerformance = Boolean(state?.myPerformance);
  const perf = state?.myPerformance || {
    scoreCorrect: state?.scoreCorrect || 0,
    scoreAnswered: state?.scoreAnswered || 0,
    rounds: [],
  };
  const rounds = Array.isArray(perf.rounds) ? perf.rounds : [];
  // Denominador = rodadas reveladas (deck jogado), não só as respondidas.
  const total = rounds.length
    || Number(perf.scoreTotal)
    || Number(perf.scoreAnswered)
    || 0;
  const correct = Number(perf.scoreCorrect) || 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  let roundsHtml;
  if (rounds.length) {
    roundsHtml = rounds.map((row, i) => `
      <li class="is-${escapeHtml(row.outcome || 'skipped')}">
        <span>Rodada ${i + 1}: ${escapeHtml(row.titleA)} vs ${escapeHtml(row.titleB)}</span>
        <span>${escapeHtml(outcomeLabel(row.outcome))}</span>
      </li>
    `).join('');
  } else if (!hasPerformance) {
    roundsHtml = '<li>Sincronizando desempenho…</li>';
  } else {
    roundsHtml = '<li>Você não votou em nenhuma rodada revelada.</li>';
  }

  root.innerHTML = `
    <section class="classind-results" aria-label="Seu desempenho">
      <p class="lesson-chip">Fim do deck</p>
      <h2 class="lesson-title">Seu desempenho</h2>
      <p class="classind-results__scoreline">
        Acertos <strong>${correct}/${total}</strong>
        ${total ? `<span>(${pct}%)</span>` : ''}
      </p>
      <ul class="classind-results__rounds">
        ${roundsHtml}
      </ul>
      <p class="classind-results__wait">Aguarde o Mestre abrir o ranking.</p>
    </section>
  `;
}
