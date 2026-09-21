'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Lista de participantes (Mestre + alunos).
 */
export function renderRosterHtml(state, { title = 'Na sala' } = {}) {
  const roster = Array.isArray(state?.roster) ? state.roster : [];
  return `
    <div class="classind-roster-wrap" aria-label="${escapeHtml(title)}">
      <p class="classind-roster__title">${escapeHtml(title)}</p>
      <ul class="classind-roster">
        ${roster.length ? roster.map((row) => `
          <li>
            <span>${escapeHtml(row.username || row.fullName || `user ${row.userId}`)}${row.role === 'admin' ? ' (Mestre)' : ''}</span>
            <span class="${row.role === 'admin' ? 'is-host' : row.hasVoted ? 'is-done' : 'is-pending'}">${
              row.role === 'admin' ? 'conduz' : row.hasVoted ? 'votou' : 'aguardando'
            }</span>
          </li>
        `).join('') : '<li>Nenhum participante ainda.</li>'}
      </ul>
    </div>
  `;
}

/**
 * Controles do Mestre + roster.
 */
export function renderHostControls(root, {
  state,
  onStartRound,
  onReveal,
  onNextRound,
  onCloseRoom,
}) {
  if (!root) return;

  const phase = state?.phase || 'lobby';
  const voters = Number(state?.votersCount) || 0;
  const eligible = Number(state?.eligibleVotersCount ?? state?.membersCount) || 0;
  const pending = Array.isArray(state?.pendingVoters) ? state.pendingVoters : [];

  if (phase === 'results' || phase === 'ranking') {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }

  const canStart = phase === 'lobby' || phase === 'revealed';
  const canReveal = phase === 'voting';
  const canNext = phase === 'revealed';
  const deckFinished = Boolean(state?.deckFinished);

  root.hidden = false;
  root.innerHTML = `
    <section class="classind-host" aria-label="Controles do Mestre">
      <p class="classind-host__title">Controles do Mestre · ${voters}/${eligible} alunos votaram</p>
      <p class="classind-host__hint">Você conduz a sala — o Mestre não vota.</p>
      <div class="classind-host__actions">
        <button type="button" class="lesson-cta" data-host="start" ${canStart && !deckFinished ? '' : 'disabled'}>
          ${phase === 'lobby' ? 'Abrir rodada' : 'Reabrir / rodada atual'}
        </button>
        <button type="button" class="lesson-cta" data-host="reveal" ${canReveal ? '' : 'disabled'}>Revelar</button>
        <button type="button" class="lesson-cta lesson-cta--ghost" data-host="next" ${canNext && !deckFinished ? '' : 'disabled'}>Próxima comparação</button>
        <button type="button" class="lesson-cta classind-host__close" data-host="close">Encerrar sala</button>
      </div>
      ${pending.length && phase === 'voting' ? `
        <p class="classind-host__pending">
          Faltam: ${escapeHtml(pending.map((p) => p.username || p.fullName || p.userId).join(', '))}
        </p>` : ''}
      ${renderRosterHtml(state, { title: 'Participantes' })}
    </section>
  `;

  root.querySelector('[data-host="start"]')?.addEventListener('click', onStartRound);
  root.querySelector('[data-host="reveal"]')?.addEventListener('click', onReveal);
  root.querySelector('[data-host="next"]')?.addEventListener('click', onNextRound);
  root.querySelector('[data-host="close"]')?.addEventListener('click', onCloseRoom);
}

/**
 * Painel só de roster (aluno).
 */
export function renderStudentRoster(root, { state }) {
  if (!root) return;
  root.hidden = false;
  root.innerHTML = `
    <section class="classind-host classind-host--roster-only" aria-label="Participantes da sala">
      ${renderRosterHtml(state, { title: 'Quem está na sala' })}
    </section>
  `;
}

export function renderCodeBanner(root, code) {
  if (!root) return;
  if (!code) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  root.innerHTML = `
    <div class="classind-code-banner">
      <p class="classind-code-banner__label">Código da sala</p>
      <p class="classind-code-banner__code">${escapeHtml(code)}</p>
    </div>
  `;
}
