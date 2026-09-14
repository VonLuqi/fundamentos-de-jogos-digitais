/**
 * Relatório do Mestre — agrupamento e parse das oferendas da Trilha.
 * Puro: sem DOM. souls.js e os smokes importam daqui.
 */

'use strict';

import {
  CONFIG_NOTES_END,
  CONFIG_NOTES_START,
  splitLessonRecord,
} from './lesson-paragraph.js';

function activityUserKey(id) {
  if (id == null || id === '') return '';
  return String(id);
}

function latestActivityTime(list) {
  let latest = 0;
  for (const item of Array.isArray(list) ? list : []) {
    const stamp = Date.parse(item?.updatedAt || item?.updated_at || '');
    if (!Number.isNaN(stamp) && stamp > latest) latest = stamp;
  }
  return latest;
}

/**
 * Agrupa oferendas da Trilha por aluno.
 * Admin fica de fora. Donos saem do mais recente para o mais antigo.
 *
 * @returns {Array<{ user: object, activities: object[] }>}
 */
export function groupActivitiesByUser(users, activities) {
  const userById = new Map();
  for (const user of Array.isArray(users) ? users : []) {
    if (!user || user.role === 'admin') continue;
    const key = activityUserKey(user.id);
    if (!key) continue;
    userById.set(key, user);
  }

  const grouped = new Map();
  for (const activity of Array.isArray(activities) ? activities : []) {
    if (!activity) continue;
    const key = activityUserKey(activity.userId ?? activity.user_id);
    if (!key) continue;
    const user = userById.get(key);
    if (!user || user.role === 'admin') continue;

    const entry = grouped.get(key) || { user, activities: [] };
    entry.activities.push(activity);
    grouped.set(key, entry);
  }

  return [...grouped.values()].sort((a, b) => {
    const delta = latestActivityTime(b.activities) - latestActivityTime(a.activities);
    if (delta !== 0) return delta;
    const nameA = String(a.user?.fullName || a.user?.username || '');
    const nameB = String(b.user?.fullName || b.user?.username || '');
    return nameA.localeCompare(nameB, 'pt-BR');
  });
}

function stripMarkerLines(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== CONFIG_NOTES_START && trimmed !== CONFIG_NOTES_END;
    })
    .join('\n')
    .trim();
}

export function parseActivityOffer(paragraph) {
  const parsed = splitLessonRecord(paragraph);
  const summary = stripMarkerLines(parsed.summary);
  const notes = stripMarkerLines(parsed.notes);
  return {
    summary,
    notes,
    empty: !summary && !notes,
  };
}

export function lessonHeading(lessonId, lessons = []) {
  const lesson = (Array.isArray(lessons) ? lessons : []).find((item) => item.id === lessonId);
  if (!lesson) return String(lessonId || '');
  const number = String(lesson.number || '').trim();
  const title = String(lesson.title || '').trim();
  if (number && title) return `${number} — ${title}`;
  return title || number || String(lessonId || '');
}

export function lessonChipLabel(lesson) {
  const number = String(lesson?.number || '').trim();
  if (number) return `Aula ${number}`;
  return String(lesson?.id || 'Aula');
}

export function latestActivitiesByLesson(activities) {
  const map = new Map();
  for (const item of Array.isArray(activities) ? activities : []) {
    const id = String(item?.lessonId || '').trim();
    if (!id) continue;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, item);
      continue;
    }
    const prevTime = Date.parse(prev.updatedAt || prev.updated_at || '') || 0;
    const nextTime = Date.parse(item.updatedAt || item.updated_at || '') || 0;
    if (nextTime >= prevTime) map.set(id, item);
  }
  return map;
}

export function orderedDeliveredActivities(activities, lessons = []) {
  const byLesson = latestActivitiesByLesson(activities);
  const ordered = [];
  for (const lesson of Array.isArray(lessons) ? lessons : []) {
    const row = byLesson.get(lesson.id);
    if (row) {
      ordered.push(row);
      byLesson.delete(lesson.id);
    }
  }
  for (const row of byLesson.values()) ordered.push(row);
  return ordered;
}

export function deliveredLessonCount(activities, lessons = []) {
  const delivered = latestActivitiesByLesson(activities);
  const catalog = Array.isArray(lessons) ? lessons : [];
  if (!catalog.length) return delivered.size;
  let count = 0;
  for (const lesson of catalog) {
    if (delivered.has(lesson.id)) count += 1;
  }
  return count;
}

export function emptyReportFilters() {
  return {
    q: '',
    turmas: [],
    completed: [],
    viewed: [],
    activity: [],
    needAll: false,
    noActivity: false,
    unique: false,
  };
}

export function parseCsvParam(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseReportFilters(search) {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(search || '');
  const filters = emptyReportFilters();
  filters.q = String(params.get('q') || '');
  filters.turmas = parseCsvParam(params.get('turma'));
  filters.completed = parseCsvParam(params.get('concluiu'));
  filters.viewed = parseCsvParam(params.get('viu'));
  filters.activity = parseCsvParam(params.get('aula'));
  filters.needAll = params.get('need') === 'all';
  filters.noActivity = params.get('sem') === '1';
  filters.unique = params.get('unica') === '1';
  return filters;
}

export function writeReportFilterParams(url, filters) {
  const params = url.searchParams;
  const setOrDelete = (key, value) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  setOrDelete('q', String(filters?.q || '').trim());
  setOrDelete('turma', (filters?.turmas || []).join(','));
  setOrDelete('concluiu', (filters?.completed || []).join(','));
  setOrDelete('viu', (filters?.viewed || []).join(','));
  setOrDelete('aula', (filters?.activity || []).join(','));
  setOrDelete('need', filters?.needAll ? 'all' : '');
  setOrDelete('sem', filters?.noActivity ? '1' : '');
  setOrDelete('unica', filters?.unique ? '1' : '');
}

export function foldSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function hasUniqueRelic(achievements, rarityOf) {
  if (typeof rarityOf !== 'function') return false;
  return (Array.isArray(achievements) ? achievements : []).some((id) => rarityOf(id) === 'unique');
}

export function viewedLessonIds(user) {
  const views = Array.isArray(user?.viewedLessons) ? user.viewedLessons : [];
  return views
    .map((item) => String(item?.lessonId || item || '').trim())
    .filter(Boolean);
}

export function activityLessonIds(activities) {
  return [...latestActivitiesByLesson(activities).keys()];
}

export function matchLessonFacet(ownedIds, selectedIds, needAll = false) {
  const selected = (Array.isArray(selectedIds) ? selectedIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean);
  if (!selected.length) return true;
  const owned = new Set(
    (Array.isArray(ownedIds) ? ownedIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
  );
  if (needAll) return selected.every((id) => owned.has(id));
  return selected.some((id) => owned.has(id));
}

function matchQuery(user, query) {
  const needle = foldSearchText(query).replace(/^@+/, '');
  if (!needle) return true;
  const name = foldSearchText(user?.fullName || user?.name);
  const username = foldSearchText(user?.username);
  return name.includes(needle) || username.includes(needle);
}

function matchTurma(user, turmas) {
  const selected = (Array.isArray(turmas) ? turmas : []).map((item) => String(item).trim()).filter(Boolean);
  if (!selected.length) return true;
  return selected.includes(String(user?.turma || '').trim());
}

/**
 * Facetas combinam com E. Opções de uma faceta de aula combinam com OU,
 * ou com ⊆ se needAll. Sem oferenda vence a faceta Enviou em.
 */
export function matchesSoulFilters(record, filters = emptyReportFilters(), options = {}) {
  const user = record?.user || record || {};
  const scope = options.scope === 'activities' ? 'activities' : 'users';
  const rarityOf = options.rarityOf;
  const deliveredIds = Array.isArray(options.activityLessonIds)
    ? options.activityLessonIds
    : activityLessonIds(record?.activities);

  if (!matchQuery(user, filters.q)) return false;
  if (!matchTurma(user, filters.turmas)) return false;
  if (filters.unique && !hasUniqueRelic(user.achievements, rarityOf)) return false;

  if (scope === 'activities') {
    if (!deliveredIds.length) return false;
    return matchLessonFacet(deliveredIds, filters.activity, filters.needAll);
  }

  if (filters.noActivity) {
    if (deliveredIds.length > 0) return false;
  } else if (!matchLessonFacet(deliveredIds, filters.activity, filters.needAll)) {
    return false;
  }

  if (!matchLessonFacet(user.completedLessons, filters.completed, filters.needAll)) return false;
  if (!matchLessonFacet(viewedLessonIds(user), filters.viewed, filters.needAll)) return false;
  return true;
}
