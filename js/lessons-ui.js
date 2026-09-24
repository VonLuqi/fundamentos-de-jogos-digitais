/**
 * Helpers compartilhados de renderização da Trilha de Aulas.
 * Consumido pelo dashboard e pela página `aulas.html`.
 */

'use strict';

import { LESSONS, MODULES, ROUTES } from './api.js';

export const PUBLISHED_GATE_KEY = 'published';

/** @param {object|null|undefined} lesson */
export function isAssessmentLesson(lesson) {
  return lesson?.kind === 'assessment';
}

export function isLessonPublished(lessonId, publishMap = {}) {
  if (Object.prototype.hasOwnProperty.call(publishMap, lessonId)) {
    return Boolean(publishMap[lessonId]);
  }
  // Sem mapa (ou entrada ausente): só aula1 começa liberada; Despertar fica selado.
  if (lessonId === 'despertar') return false;
  if (String(lessonId || '').startsWith('prova-')) return true; // gate próprio da prova
  return lessonId === 'aula1';
}

/**
 * @returns {'completed'|'available'|'coming-soon'|'locked'}
 */
export function resolveLessonState(lesson, user, { published = true, assessmentState = null } = {}) {
  if (isAssessmentLesson(lesson)) {
    if (assessmentState === 'completed') return 'completed';
    if (
      assessmentState === 'available'
      || assessmentState === 'in_progress'
      || assessmentState === 'awaiting'
    ) {
      return 'available';
    }
    if (assessmentState === 'coming-soon') {
      return user?.role === 'admin' ? 'available' : 'coming-soon';
    }
    // Sem status da API: admin vê disponível; aluno aguarda
    return user?.role === 'admin' ? 'available' : 'coming-soon';
  }

  const completedLessons = Array.isArray(user?.completedLessons) ? user.completedLessons : [];
  if (completedLessons.includes(lesson.id)) return 'completed';
  if (!published) {
    // Admin pode abrir para prévia; aluno vê "Em breve".
    return user?.role === 'admin' ? 'available' : 'coming-soon';
  }
  return 'available';
}

function defaultSubtitle(lesson, state, assessmentState = null) {
  if (isAssessmentLesson(lesson)) {
    if (assessmentState === 'in_progress') {
      return 'Em andamento — o tempo não pausa. Continue a prova.';
    }
    if (assessmentState === 'awaiting') {
      return 'Enviada — aguardando correção do Mestre.';
    }
    if (state === 'completed') {
      return 'Nota liberada — veja o resultado na Provação.';
    }
    if (state === 'coming-soon' || state === 'locked') {
      return 'Aguardando o Mestre liberar a prova para a sua turma.';
    }
    return lesson.subtitle || 'Avaliação do módulo';
  }
  if (state === 'completed') return `Concluída — +${lesson.rewardXp} XP recebidos`;
  if (state === 'coming-soon' || state === 'locked') return 'Em breve — aguardando liberação do Mestre';
  return lesson.subtitle;
}

function defaultHref(lesson, user, assessmentState = null) {
  if (isAssessmentLesson(lesson)) {
    if (user?.role === 'admin' && assessmentState !== 'in_progress') {
      return ROUTES.provaAdmin();
    }
    return ROUTES.prova();
  }
  if (lesson.href && typeof ROUTES[lesson.href] === 'function') {
    return ROUTES[lesson.href]();
  }
  return ROUTES.lesson(lesson.id);
}

function assessmentActionLabel(user, state, assessmentState) {
  if (assessmentState === 'in_progress') return 'Continuar';
  if (assessmentState === 'awaiting') return 'Ver status';
  if (state === 'completed') return 'Ver nota';
  if (user?.role === 'admin') return 'Hub';
  return 'Abrir prova';
}

/**
 * Renderiza a lista plana de aulas em um container (`<ul>`/`<ol>`).
 *
 * @param {HTMLElement} container
 * @param {{ role?: string, completedLessons?: string[] }} user
 * @param {object} [options]
 * @param {typeof LESSONS} [options.lessons]
 * @param {Record<string, boolean>} [options.publishMap]
 * @param {Record<string, string>} [options.assessmentStates] — id → available|coming-soon|in_progress|awaiting|completed
 * @param {(lesson: object) => string} [options.getHref]
 * @param {(lesson: object, state: string) => string} [options.getActionLabel]
 * @param {string} [options.emptyMessage]
 * @param {(lesson: object, state: string) => string} [options.getSubtitle]
 * @param {(lesson: object, state: string, row: HTMLElement) => void} [options.afterRow]
 */
export function renderLessonsList(container, user, options = {}) {
  if (!container) return;

  const {
    lessons = LESSONS,
    publishMap = {},
    assessmentStates = {},
    getHref,
    getActionLabel,
    emptyMessage = 'Nenhuma aula cadastrada ainda.',
    getSubtitle,
    afterRow,
  } = options;

  container.innerHTML = '';
  if (!lessons || lessons.length === 0) {
    const li = document.createElement('li');
    li.className = 'lesson-empty';
    li.textContent = emptyMessage;
    container.appendChild(li);
    return;
  }

  lessons.forEach((lesson, index) => {
    const assessmentState = assessmentStates[lesson.id] || null;
    const published = isAssessmentLesson(lesson)
      ? true
      : isLessonPublished(lesson.id, publishMap);
    const state = resolveLessonState(lesson, user, { published, assessmentState });
    const lockedVisual = state === 'locked' || state === 'coming-soon';
    const canNavigate = state === 'available' || state === 'completed'
      || assessmentState === 'awaiting'
      || assessmentState === 'in_progress';

    const li = document.createElement('li');
    li.className = [
      'lesson-row',
      isAssessmentLesson(lesson) ? 'is-assessment' : '',
      lockedVisual ? 'is-locked' : '',
      state === 'coming-soon' ? 'is-coming-soon' : '',
      state === 'completed' ? 'is-completed' : '',
      assessmentState === 'in_progress' ? 'is-in-progress' : '',
      !published && user?.role === 'admin' && !isAssessmentLesson(lesson) ? 'is-unpublished' : '',
    ]
      .filter(Boolean)
      .join(' ');
    li.style.setProperty('--lesson-index', String(index));
    li.dataset.lessonId = lesson.id;
    li.dataset.state = state;
    li.dataset.published = String(published);
    if (isAssessmentLesson(lesson)) li.dataset.kind = 'assessment';

    const number = document.createElement('span');
    number.className = 'lesson-row__number';
    number.textContent = lesson.number;

    const body = document.createElement('div');
    body.className = 'lesson-row__body';

    const title = document.createElement('p');
    title.className = 'lesson-row__title';
    title.textContent = lesson.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'lesson-row__subtitle';
    if (typeof getSubtitle === 'function') {
      subtitle.textContent = getSubtitle(lesson, state);
    } else if (!published && user?.role === 'admin' && !isAssessmentLesson(lesson)) {
      subtitle.textContent = 'Não liberada para a turma — você pode abrir como prévia';
    } else {
      subtitle.textContent = defaultSubtitle(lesson, state, assessmentState);
    }
    body.append(title, subtitle);

    // awaiting: aluno pode abrir a tela da prova (status), mesmo sem "available"
    const navigate = canNavigate || (isAssessmentLesson(lesson) && assessmentState === 'awaiting');

    if (!navigate) {
      const lock = document.createElement('span');
      lock.className = 'lesson-row__lock';
      lock.setAttribute('aria-hidden', 'true');
      lock.textContent = '🔒';
      li.append(number, body, lock);
    } else {
      const action = document.createElement('a');
      action.className = 'lesson-row__action';
      action.href = typeof getHref === 'function'
        ? getHref(lesson)
        : defaultHref(lesson, user, assessmentState);
      const label = typeof getActionLabel === 'function'
        ? getActionLabel(lesson, state)
        : (isAssessmentLesson(lesson)
          ? assessmentActionLabel(user, state, assessmentState)
          : (state === 'completed' ? 'Rever' : 'Iniciar'));
      action.textContent = label;
      action.setAttribute('aria-label', `${label} — ${lesson.title}`);
      li.append(number, body, action);
    }

    if (typeof afterRow === 'function') {
      afterRow(lesson, state, li);
    }

    container.appendChild(li);
  });
}

/**
 * Renderiza a trilha agrupada por módulo.
 */
export function renderModulesTrail(container, user, options = {}) {
  if (!container) return;

  const {
    modules = MODULES,
    emptyMessage = 'Nenhuma aula cadastrada ainda.',
    ...listOptions
  } = options;

  container.innerHTML = '';

  const allLessons = modules.flatMap((module) => module.lessons || []);
  if (allLessons.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'lesson-empty trail-empty';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  modules.forEach((module, moduleIndex) => {
    const section = document.createElement('section');
    section.className = 'trail-module';
    section.style.setProperty('--module-index', String(moduleIndex));
    section.dataset.moduleId = module.id;

    const header = document.createElement('header');
    header.className = 'trail-module__header';

    const badge = document.createElement('span');
    badge.className = 'trail-module__badge';
    badge.textContent = module.number;

    const titles = document.createElement('div');
    titles.className = 'trail-module__titles';

    const title = document.createElement('h2');
    title.className = 'trail-module__title';
    title.textContent = module.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'trail-module__subtitle';
    subtitle.textContent = module.subtitle || '';

    titles.append(title, subtitle);
    header.append(badge, titles);

    const list = document.createElement('ul');
    list.className = 'lessons-list';
    list.setAttribute('aria-label', `Aulas do ${module.number}`);

    renderLessonsList(list, user, {
      ...listOptions,
      lessons: module.lessons || [],
    });

    section.append(header, list);
    container.appendChild(section);
  });
}
