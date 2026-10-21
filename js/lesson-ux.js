/**
 * UX e Leitura Guiada das Aulas (01 a 08)
 * - Realce visual automático de Checkpoints e alertas ("O que NÃO fazer")
 * - Barra de navegação guiada no rodapé de cada aba (Fundamentos ↔ Oficina ↔ Slides)
 * - Indicador visual de Passo 1 e Passo 2 na área de entrega para orientar os alunos
 */

'use strict';

export function bindLazySlideLoad(loadSlides) {
  if (typeof loadSlides !== 'function') return;
  const slidesPanel = document.getElementById('slides');
  let loaded = false;
  const run = () => {
    if (loaded) return;
    loaded = true;
    loadSlides();
  };

  if (slidesPanel?.classList.contains('is-active')) {
    run();
    return;
  }

  document.querySelectorAll('.tab[data-tab="slides"], [data-goto-tab="slides"]').forEach((trigger) => {
    trigger.addEventListener('click', run, { once: true });
  });
}

function switchToTab(tabId) {
  const targetTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
  if (!targetTab) return;
  targetTab.click();

  const tabsNav = document.querySelector('.tabs');
  if (tabsNav) {
    const rect = tabsNav.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
      tabsNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function enhanceLessonCallouts() {
  document.querySelectorAll('.lesson-content p').forEach((p) => {
    const firstStrong = p.querySelector('strong:first-child');
    if (!firstStrong) return;
    const label = firstStrong.textContent.trim();
    if (/^(Checkpoint|Teste rápido)\b/i.test(label)) {
      p.classList.add('lesson-checkpoint-callout');
      const wrap = document.createElement('span');
      while (p.firstChild) {
        wrap.appendChild(p.firstChild);
      }
      p.appendChild(wrap);
    }
  });

  document.querySelectorAll('.lesson-content h3.lesson-subtitle').forEach((h3) => {
    const text = h3.textContent.trim();
    if (/O que NÃO fazer|Erros comuns/i.test(text)) {
      h3.classList.add('lesson-warning-heading');
      const next = h3.nextElementSibling;
      if (next && next.classList.contains('lesson-list')) {
        next.classList.add('lesson-warning-list');
      }
    }
  });
}

function enhanceTabNavigation() {
  const oficinaTab = document.querySelector('.tab[data-tab="oficina"]');
  const oficinaLabel = oficinaTab ? oficinaTab.textContent.trim() : 'II. Oficina';

  const fundamentosArticle = document.querySelector('#fundamentos .hades-frame');
  if (fundamentosArticle && !fundamentosArticle.querySelector('.lesson-tab-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'lesson-tab-nav';
    nav.setAttribute('aria-label', 'Próximo passo da aula');
    nav.innerHTML = `
      <p class="lesson-tab-nav__hint">
        <strong>Terminou a leitura?</strong> Agora vamos colocar a mão na massa na atividade prática!
      </p>
      <div class="lesson-tab-nav__actions">
        <button type="button" class="lesson-cta" data-goto-tab="oficina">
          Ir para ${oficinaLabel} →
        </button>
      </div>
    `;
    fundamentosArticle.appendChild(nav);
  }

  const oficinaArticle = document.querySelector('#oficina .hades-frame');
  if (oficinaArticle && !oficinaArticle.querySelector('.lesson-tab-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'lesson-tab-nav';
    nav.setAttribute('aria-label', 'Navegação entre abas da aula');
    nav.innerHTML = `
      <p class="lesson-tab-nav__hint">
        Dúvida em algum conceito ou quer revisar os slides do professor?
      </p>
      <div class="lesson-tab-nav__actions">
        <button type="button" class="lesson-cta lesson-cta--ghost" data-goto-tab="fundamentos">
          ← Rever I. Fundamentos
        </button>
        <button type="button" class="lesson-cta lesson-cta--ghost" data-goto-tab="slides">
          Ver III. Slides →
        </button>
      </div>
    `;
    oficinaArticle.appendChild(nav);
  }

  const slidesArticle = document.querySelector('#slides .hades-frame');
  if (slidesArticle && !slidesArticle.querySelector('.lesson-tab-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'lesson-tab-nav';
    nav.setAttribute('aria-label', 'Voltar para a oficina');
    nav.innerHTML = `
      <p class="lesson-tab-nav__hint">
        Pronto para continuar a prática e enviar sua atividade?
      </p>
      <div class="lesson-tab-nav__actions">
        <button type="button" class="lesson-cta" data-goto-tab="oficina">
          ← Voltar para ${oficinaLabel}
        </button>
      </div>
    `;
    slidesArticle.appendChild(nav);
  }

  document.querySelectorAll('[data-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-goto-tab');
      if (target) switchToTab(target);
    });
  });
}

function enhanceSubmissionFlow() {
  const notesBox = document.getElementById('aula-atividade');
  const notesArea = document.getElementById('config-notes');
  const summaryArea = document.getElementById('gdd-text');
  const saveBtn = document.getElementById('btn-save-gdd');
  const journalArea = document.getElementById('lesson-journal');

  if (notesBox && journalArea && !notesBox.querySelector('.lesson-step-badge')) {
    const badge = document.createElement('span');
    badge.className = 'lesson-step-badge lesson-step-badge--final';
    badge.textContent = 'Entrega da Oficina · Diário da Aula';
    notesBox.insertBefore(badge, notesBox.firstChild);
    return;
  }

  if (!notesBox || !notesArea || !summaryArea || !saveBtn) return;

  if (!notesBox.querySelector('.lesson-step-badge')) {
    const step1Badge = document.createElement('span');
    step1Badge.className = 'lesson-step-badge';
    step1Badge.textContent = 'Passo 1 de 2 · Anotações da Prática (Obrigatório)';
    notesBox.insertBefore(step1Badge, notesBox.firstChild);
  }

  // Agrupa a seção final "Artefato gerado" + #gdd-text em um card visual de Passo 2
  if (!summaryArea.closest('.lesson-summary-box')) {
    const summaryBox = document.createElement('section');
    summaryBox.className = 'lesson-summary-box';
    summaryBox.setAttribute('aria-label', 'Síntese final e conclusão da aula');

    const step2Badge = document.createElement('span');
    step2Badge.className = 'lesson-step-badge lesson-step-badge--final';
    step2Badge.textContent = 'Passo 2 de 2 · Resumo Final e Envio (Obrigatório)';
    summaryBox.appendChild(step2Badge);

    // Encontra o h3 "Artefato gerado" logo após #aula-atividade
    let cursor = notesBox.nextElementSibling;
    const nodesToMove = [];
    const actionsRow = saveBtn.closest('.gdd-actions');

    while (cursor) {
      nodesToMove.push(cursor);
      if (cursor === actionsRow) break;
      cursor = cursor.nextElementSibling;
    }

    if (nodesToMove.length > 0 && notesBox.parentNode) {
      notesBox.parentNode.insertBefore(summaryBox, notesBox.nextSibling);
      nodesToMove.forEach((node) => summaryBox.appendChild(node));
    }

    const checklist = document.createElement('div');
    checklist.className = 'lesson-submit-checklist';
    checklist.setAttribute('aria-live', 'polite');
    checklist.innerHTML = `
      <span class="lesson-submit-pill" id="ux-pill-notes">○ Passo 1: Preencher anotações</span>
      <span class="lesson-submit-pill" id="ux-pill-summary">○ Passo 2: Escrever síntese final</span>
    `;

    if (actionsRow && actionsRow.parentNode) {
      actionsRow.parentNode.insertBefore(checklist, actionsRow);
    }
  }

  const pillNotes = document.getElementById('ux-pill-notes');
  const pillSummary = document.getElementById('ux-pill-summary');

  function syncPills() {
    const hasNotes = notesArea.value.trim().length > 0;
    const hasSummary = summaryArea.value.trim().length > 0;

    if (pillNotes) {
      pillNotes.classList.toggle('is-done', hasNotes);
      pillNotes.textContent = hasNotes
        ? '✓ Passo 1: Anotações preenchidas'
        : '○ Passo 1: Preencher anotações acima';
    }
    if (pillSummary) {
      pillSummary.classList.toggle('is-done', hasSummary);
      pillSummary.textContent = hasSummary
        ? '✓ Passo 2: Síntese preenchida'
        : '○ Passo 2: Escrever síntese final';
    }
  }

  notesArea.addEventListener('input', syncPills);
  summaryArea.addEventListener('input', syncPills);
  document.getElementById('btn-template-notes')?.addEventListener('click', () => {
    window.setTimeout(syncPills, 10);
  });

  // Atualiza também quando o texto é carregado do servidor
  window.setTimeout(syncPills, 350);
  window.setTimeout(syncPills, 1200);
}

function setCopyButtonFeedback(button, label, stateClass) {
  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent.trim() || 'Copiar código';
  }
  if (button._copyResetTimer) {
    window.clearTimeout(button._copyResetTimer);
  }

  button.classList.remove('is-copied', 'is-copy-error');
  if (stateClass) {
    button.classList.add(stateClass);
  }
  button.textContent = label;

  button._copyResetTimer = window.setTimeout(() => {
    button.classList.remove('is-copied', 'is-copy-error');
    button.textContent = button.dataset.originalLabel || 'Copiar código';
  }, 2200);
}

export function enhanceCodeBlocks() {
  document.querySelectorAll('.lesson-copy-code[data-copy-target]').forEach((button) => {
    if (button.dataset.uxCopyBound === 'true') return;
    button.dataset.uxCopyBound = 'true';
    button.dataset.originalLabel = button.textContent.trim() || 'Copiar código';

    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-copy-target');
      const pre = targetId ? document.getElementById(targetId) : null;
      const text = pre?.textContent?.trim() ?? '';
      if (!text) {
        setCopyButtonFeedback(button, '✕ Código indisponível', 'is-copy-error');
        return;
      }

      if (!navigator.clipboard?.writeText) {
        setCopyButtonFeedback(button, '✕ Copie manualmente', 'is-copy-error');
        return;
      }

      try {
        await navigator.clipboard.writeText(`${text}\n`);
        setCopyButtonFeedback(button, '✓ Código copiado!', 'is-copied');
      } catch {
        setCopyButtonFeedback(button, '✕ Erro ao copiar', 'is-copy-error');
      }
    });
  });
}

export function initLessonUx() {
  enhanceLessonCallouts();
  enhanceCodeBlocks();
  enhanceTabNavigation();
  enhanceSubmissionFlow();
}
