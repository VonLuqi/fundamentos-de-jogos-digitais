/**
 * Helpers compartilhados de renderização da Trilha de Aulas.
 * Consumido pelo dashboard e pela página `aulas.html`.
 */

'use strict';

import { LESSONS, MODULES, ROUTES } from './api.js';

export const PUBLISHED_GATE_KEY = 'published';

export function isLessonPublished(lessonId, publishMap = {}) {
  if (Object.prototype.hasOwnProperty.call(publishMap, lessonId)) {
    return Boolean(publishMap[lessonId]);
  }
  // Sem mapa (ou entrada ausente): só aula1 começa liberada.
  return lessonId === 'aula1';
}

/**
 * @returns {'completed'|'available'|'coming-soon'|'locked'}
 */
export function resolveLessonState(lesson, user, { published = true } = {}) {
  const completedLessons = Array.isArray(user?.completedLessons) ? user.completedLessons : [];
  if (completedLessons.includes(lesson.id)) return 'completed';
  if (!published) {
    // Admin pode abrir para prévia; aluno vê "Em breve".
    return user?.role === 'admin' ? 'available' : 'coming-soon';
  }
  return 'available';
}

function defaultSubtitle(lesson, state) {
  if (state === 'completed') return `Concluída — +${lesson.rewardXp} XP recebidos`;
  if (state === 'coming-soon' || state === 'locked') return 'Em breve — aguardando liberação do Mestre';
  return lesson.subtitle;
}

/**
 * Renderiza a lista plana de aulas em um container (`<ul>`/`<ol>`).
 *
 * @param {HTMLElement} container
 * @param {{ role?: string, completedLessons?: string[] }} user
 * @param {object} [options]
 * @param {typeof LESSONS} [options.lessons]
 * @param {Record<string, boolean>} [options.publishMap]
 * @param {(lesson: object) => string} [options.getHref]
 * @param {string} [options.emptyMessage]
 * @param {(lesson: object, state: string) => string} [options.getSubtitle]
 * @param {(lesson: object, state: string, row: HTMLElement) => void} [options.afterRow]
 */
export function renderLessonsList(container, user, options = {}) {
  if (!container) return;

  const {
    lessons = LESSONS,
    publishMap = {},
    getHref = (lesson) => ROUTES.lesson(lesson.id),
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
    const published = isLessonPublished(lesson.id, publishMap);
    const state = resolveLessonState(lesson, user, { published });
    const lockedVisual = state === 'locked' || state === 'coming-soon';
    const canNavigate = state === 'available' || state === 'completed';

    const li = document.createElement('li');
    li.className = [
      'lesson-row',
      lockedVisual ? 'is-locked' : '',
      state === 'coming-soon' ? 'is-coming-soon' : '',
      state === 'completed' ? 'is-completed' : '',
      !published && user?.role === 'admin' ? 'is-unpublished' : '',
    ]
      .filter(Boolean)
      .join(' ');
    li.style.setProperty('--lesson-index', String(index));
    li.dataset.lessonId = lesson.id;
    li.dataset.state = state;
    li.dataset.published = String(published);

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
    } else if (!published && user?.role === 'admin') {
      subtitle.textContent = 'Não liberada para a turma — você pode abrir como prévia';
    } else {
      subtitle.textContent = defaultSubtitle(lesson, state);
    }
    body.append(title, subtitle);

    if (!canNavigate) {
      const lock = document.createElement('span');
      lock.className = 'lesson-row__lock';
      lock.setAttribute('aria-hidden', 'true');
      lock.textContent = '🔒';
      li.append(number, body, lock);
    } else {
      const action = document.createElement('a');
      action.className = 'lesson-row__action';
      action.href = getHref(lesson);
      action.textContent = state === 'completed' ? 'Rever' : 'Iniciar';
      action.setAttribute('aria-label', `${state === 'completed' ? 'Rever' : 'Iniciar'} ${lesson.title}`);
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
