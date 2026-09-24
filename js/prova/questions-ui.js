/**
 * Render de questões da prova (MC + discursiva).
 * Task B2 — docs/plano-prova-modulo1-online.md
 */

'use strict';

/**
 * @typedef {object} ProvaQuestion
 * @property {string} id
 * @property {number} index
 * @property {'mc'|'discursive'} type
 * @property {string} [title]
 * @property {string} prompt
 * @property {Record<string, string>} [choices]
 * @property {string|null} [role]
 * @property {string|null} [scenario]
 * @property {string|null} [mission]
 */

/**
 * @typedef {object} ProvaAnswerLocal
 * @property {string|null} [choice]
 * @property {string|null} [textAnswer]
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converte prompt com quebras de linha em blocos <p>.
 * @param {string} prompt
 */
export function formatPromptHtml(prompt) {
  const text = String(prompt || '').trim();
  if (!text) return '<p></p>';
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/**
 * @param {ProvaQuestion|null|undefined} question
 * @param {HTMLElement|null} promptEl
 */
export function renderPrompt(question, promptEl) {
  if (!promptEl) return;
  if (!question) {
    promptEl.innerHTML = '';
    return;
  }
  promptEl.innerHTML = formatPromptHtml(question.prompt);
}

/**
 * @param {object} opts
 * @param {ProvaQuestion} opts.question
 * @param {HTMLFieldSetElement|null} opts.choicesEl
 * @param {HTMLElement|null} opts.discursiveEl
 * @param {HTMLTextAreaElement|null} opts.textareaEl
 * @param {HTMLElement|null} opts.charCountEl
 * @param {ProvaAnswerLocal|null} [opts.answer]
 * @param {(payload: { questionId: string, choice?: string|null, textAnswer?: string|null }) => void} [opts.onChange]
 * @param {boolean} [opts.disabled]
 */
export function renderQuestion(opts) {
  const {
    question,
    choicesEl,
    discursiveEl,
    textareaEl,
    charCountEl,
    answer = null,
    onChange = null,
    disabled = false,
  } = opts;

  if (!question) return;

  if (question.type === 'mc') {
    if (discursiveEl) discursiveEl.hidden = true;
    if (textareaEl) {
      textareaEl.value = '';
      textareaEl.disabled = true;
    }
    if (!choicesEl) return;
    choicesEl.hidden = false;
    choicesEl.replaceChildren();

    const legend = document.createElement('legend');
    legend.className = 'prova-choices__legend';
    legend.textContent = 'Escolha uma alternativa';
    choicesEl.appendChild(legend);

    const choices = question.choices || {};
    for (const letter of ['A', 'B', 'C', 'D', 'E']) {
      if (!choices[letter]) continue;
      const label = document.createElement('label');
      label.className = 'prova-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'prova-choice';
      input.id = `prova-choice-${letter}`;
      input.value = letter;
      input.disabled = disabled;
      input.setAttribute('aria-label', `Alternativa ${letter}`);
      if (answer?.choice === letter) input.checked = true;
      input.addEventListener('change', () => {
        if (!input.checked || !onChange) return;
        onChange({ questionId: question.id, choice: letter, textAnswer: null });
      });
      const letterSpan = document.createElement('span');
      letterSpan.className = 'prova-choice__letter';
      letterSpan.setAttribute('aria-hidden', 'true');
      letterSpan.textContent = `${letter})`;
      const textSpan = document.createElement('span');
      textSpan.className = 'prova-choice__text';
      textSpan.id = `prova-choice-text-${letter}`;
      textSpan.textContent = choices[letter];
      input.setAttribute('aria-describedby', textSpan.id);
      label.htmlFor = input.id;
      label.append(input, letterSpan, textSpan);
      choicesEl.appendChild(label);
    }
    return;
  }

  // Discursive
  if (choicesEl) {
    choicesEl.hidden = true;
    choicesEl.replaceChildren();
  }
  if (discursiveEl) discursiveEl.hidden = false;
  if (textareaEl) {
    textareaEl.disabled = disabled;
    textareaEl.value = answer?.textAnswer != null ? String(answer.textAnswer) : '';
    if (charCountEl) charCountEl.textContent = String(textareaEl.value.length);
    textareaEl.oninput = () => {
      if (charCountEl) charCountEl.textContent = String(textareaEl.value.length);
      if (onChange) {
        onChange({
          questionId: question.id,
          choice: null,
          textAnswer: textareaEl.value,
        });
      }
    };
  }
}

/**
 * Lê a resposta atual do DOM para a questão.
 * @param {ProvaQuestion} question
 * @param {{ choicesEl?: HTMLElement|null, textareaEl?: HTMLTextAreaElement|null }} els
 * @returns {ProvaAnswerLocal}
 */
export function readAnswerFromDom(question, els) {
  if (!question) return { choice: null, textAnswer: null };
  if (question.type === 'mc') {
    const checked = els.choicesEl?.querySelector('input[name="prova-choice"]:checked');
    return {
      choice: checked ? String(checked.value) : null,
      textAnswer: null,
    };
  }
  return {
    choice: null,
    textAnswer: els.textareaEl ? String(els.textareaEl.value) : '',
  };
}

/**
 * @param {ProvaAnswerLocal|null|undefined} answer
 * @param {'mc'|'discursive'} type
 */
export function isAnswerFilled(answer, type) {
  if (!answer) return false;
  if (type === 'mc') return Boolean(answer.choice);
  return String(answer.textAnswer || '').trim().length > 0;
}

/**
 * Atualiza classes is-answered / is-current nos dots.
 * @param {HTMLElement|null} progressEl
 * @param {number} currentIndex
 * @param {ProvaQuestion[]} questions
 * @param {Record<string, ProvaAnswerLocal>} answersById
 */
export function syncProgressDots(progressEl, currentIndex, questions, answersById) {
  if (!progressEl) return;
  progressEl.querySelectorAll('.prova-progress__dot').forEach((dot) => {
    const i = Number(dot.dataset.index);
    const q = questions[i];
    const filled = q ? isAnswerFilled(answersById[q.id], q.type) : false;
    dot.classList.toggle('is-current', i === currentIndex);
    dot.classList.toggle('is-answered', filled);
    dot.disabled = false;
  });
}
