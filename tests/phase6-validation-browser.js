'use strict';

/**
 * Validador dedicado da Fase 6 para Aula 1.
 * Uso no DevTools (na pagina da Aula 1):
 *   await import('/tests/phase6-validation-browser.js');
 *   await window.runPhase6Validation();
 */

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getText(selector) {
  const el = document.querySelector(selector);
  return el ? String(el.textContent || '').trim() : '';
}

function isHidden(id) {
  const el = document.getElementById(id);
  return !el || el.hidden;
}

function setTextareaValue(id, value) {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLTextAreaElement)) return false;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function clickOficinaTab() {
  const tab = document.querySelector('[data-tab="oficina"]');
  if (tab instanceof HTMLElement) tab.click();
}

function snapshot() {
  return {
    saveStatus: getText('#gdd-save-status'),
    overlayVisible: !isHidden('discovery-overlay'),
    secretBurstVisible: !isHidden('discovery-secret-burst'),
    achievementName: getText('.discovery-card__item-name'),
  };
}

async function runSaveScenario(achievements) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/api/progress') && init?.method === 'POST') {
      const body = JSON.parse(init.body || '{}');

      if (body.action === 'saveLessonParagraph') {
        return new Response(
          JSON.stringify({
            awarded: { xp: 20, achievements },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return originalFetch(input, init);
  };

  try {
    clickOficinaTab();
    await wait(120);

    const okNotes = setTextareaValue('config-notes', 'Teste 1\\nMassa: 1.5 -> inercia maior');
    const okGdd = setTextareaValue('gdd-text', 'Neste mundo, a bola responde as variaveis do inspector.');
    const saveBtn = document.getElementById('btn-save-gdd');

    if (!okNotes || !okGdd || !(saveBtn instanceof HTMLButtonElement)) {
      return { ok: false, reason: 'Campos da Aula 1 nao encontrados.' };
    }

    saveBtn.click();
    await wait(900);
    const first = snapshot();

    await wait(2400);
    const second = snapshot();

    return { ok: true, first, second };
  } finally {
    window.fetch = originalFetch;
  }
}

async function runPhase6Validation() {
  const consoleErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => {
    consoleErrors.push(args.map((x) => String(x)).join(' '));
    originalConsoleError(...args);
  };

  try {
    const single = await runSaveScenario(['aula1_concluida']);
    const multi = await runSaveScenario([
      'segredo_cartografo_do_inspector',
      'segredo_juramento_do_circulo',
    ]);

    const role = (() => {
      try {
        const raw = localStorage.getItem('activeSession');
        if (!raw) return 'unknown';
        const parsed = JSON.parse(raw);
        return parsed?.role || 'unknown';
      } catch {
        return 'unknown';
      }
    })();

    const result = {
      timestamp: new Date().toISOString(),
      role,
      single,
      multi,
      consoleErrors,
      checks: {
        singleScenarioExecuted: Boolean(single?.ok),
        multiScenarioExecuted: Boolean(multi?.ok),
        noConsoleErrors: consoleErrors.length === 0,
      },
    };

    window.__phase6ValidationLastResult = result;
    return result;
  } finally {
    console.error = originalConsoleError;
  }
}

window.runPhase6Validation = runPhase6Validation;
