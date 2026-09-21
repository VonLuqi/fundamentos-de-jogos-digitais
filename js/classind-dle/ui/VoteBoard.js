'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sideCard(sideKey, side, {
  tally,
  myVote,
  canVote,
  revealed,
  correctSide,
  rating,
}) {
  const selected = myVote === sideKey;
  const isCorrect = revealed && correctSide === sideKey;
  const isWrong = revealed && myVote === sideKey && correctSide && correctSide !== sideKey;
  const classes = [
    'classind-card',
    selected ? 'is-selected' : '',
    isCorrect ? 'is-correct' : '',
    isWrong ? 'is-wrong' : '',
  ].filter(Boolean).join(' ');

  const media = side?.imageUrl
    ? `<img src="${escapeHtml(side.imageUrl)}" alt="" loading="lazy" />`
    : `<span class="classind-card__placeholder">${escapeHtml(sideKey)}</span>`;

  const voteDisabled = !canVote || Boolean(myVote);
  const ratingHtml = revealed && rating
    ? `<p class="classind-card__rating">Faixa ${escapeHtml(rating)}</p>`
    : '';

  return `
    <article class="${classes}" data-side="${sideKey}">
      <div class="classind-card__media">${media}</div>
      <div class="classind-card__body">
        <p class="classind-card__side">Opção ${escapeHtml(sideKey)}</p>
        <h3 class="classind-card__title">${escapeHtml(side?.title || '—')}</h3>
        <p class="classind-card__blurb">${escapeHtml(side?.blurb || '')}</p>
        <p class="classind-card__tally" aria-live="polite">${Number(tally) || 0} voto(s)</p>
        ${ratingHtml}
        ${canVote ? `
          <button type="button" class="lesson-cta classind-card__btn" data-vote="${sideKey}" ${voteDisabled ? 'disabled' : ''}>
            ${myVote === sideKey ? 'Seu voto' : `Votar ${sideKey}`}
          </button>` : ''}
      </div>
    </article>
  `;
}

/**
 * Placar A/B + botões de voto.
 */
export function renderVoteBoard(root, {
  state,
  canVote,
  onVote,
}) {
  const phase = state?.phase || 'lobby';
  const revealed = phase === 'revealed';
  const myVote = state?.myVote || null;

  if (phase === 'closed') {
    root.innerHTML = `<div class="classind-empty"><p>Sala encerrada.</p></div>`;
    return;
  }

  if (phase === 'results' || phase === 'ranking' || state?.deckFinished) {
    root.innerHTML = `
      <div class="classind-empty">
        <p>Fim do deck desta sessão.</p>
      </div>
    `;
    return;
  }

  if (phase === 'lobby' && !state?.sideA) {
    root.innerHTML = `
      <div class="classind-empty">
        <p>Sala em lobby. Aguarde o Mestre abrir a próxima comparação.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <p class="classind-question">${escapeHtml(state?.question || 'Qual exige a idade mais alta?')}</p>
    <div class="classind-meta">
      <span>Rodada ${(Number(state?.roundIndex) || 0) + 1} / ${Number(state?.deckLength) || '?'}</span>
      <span>Votos ${Number(state?.votersCount) || 0} / ${Number(state?.eligibleVotersCount ?? state?.membersCount) || 0}</span>
      ${typeof state?.scoreCorrect === 'number' ? `<span class="classind-meta__score">Acertos ${Number(state.scoreCorrect) || 0}/${Number(state.scoreAnswered) || 0}</span>` : ''}
      ${myVote ? `<span>Você votou em ${escapeHtml(myVote)}</span>` : ''}
      ${!canVote && phase === 'voting' ? '<span>Aguardando votos dos alunos</span>' : ''}
    </div>
    <div class="classind-board">
      ${sideCard('A', state?.sideA, {
        tally: state?.tallies?.A,
        myVote,
        canVote: canVote && phase === 'voting',
        revealed,
        correctSide: state?.correctSide,
        rating: state?.ratingA,
      })}
      <div class="classind-vs" aria-hidden="true">VS</div>
      ${sideCard('B', state?.sideB, {
        tally: state?.tallies?.B,
        myVote,
        canVote: canVote && phase === 'voting',
        revealed,
        correctSide: state?.correctSide,
        rating: state?.ratingB,
      })}
    </div>
  `;

  root.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', () => onVote(btn.getAttribute('data-vote')));
  });
}
