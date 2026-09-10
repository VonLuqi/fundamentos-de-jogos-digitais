/**
 * Notas de atividade do Grimório — derivadas de lesson_paragraphs (não user_notes).
 */

'use strict';

export const ACTIVITY_NOTE_ID_PREFIX = 'activity:';
export const ACTIVITY_NOTE_TAG = 'atividade';

export function isActivityNoteId(id) {
  return String(id || '').startsWith(ACTIVITY_NOTE_ID_PREFIX);
}

export function activityNoteId(lessonId) {
  return `${ACTIVITY_NOTE_ID_PREFIX}${String(lessonId || '').trim()}`;
}

export function lessonIdFromActivityNoteId(id) {
  const raw = String(id || '');
  if (!raw.startsWith(ACTIVITY_NOTE_ID_PREFIX)) return null;
  const lessonId = raw.slice(ACTIVITY_NOTE_ID_PREFIX.length).trim();
  return lessonId || null;
}

export function isLegacyActivityUserNote(note) {
  if (!note || note.isActivityNote) return false;
  if (!note.lessonId) return false;
  const tags = Array.isArray(note.tags) ? note.tags : [];
  return tags.includes(ACTIVITY_NOTE_TAG);
}

function lessonTitle(lessonId, lessons = []) {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) return lessonId;
  const number = String(lesson.number || '').trim();
  const title = String(lesson.title || '').trim();
  if (number && title) return `${number} — ${title}`;
  return title || number || lessonId;
}

/**
 * @param {Array<{ lessonId: string, paragraph: string, createdAt?: string|null, updatedAt?: string|null }>} activities
 * @param {Array<{ id: string, number?: string, title?: string }>} lessons
 */
export function toActivityNotes(activities, lessons = []) {
  const list = Array.isArray(activities) ? activities : [];
  return list
    .map((row) => {
      const lessonId = String(row?.lessonId || '').trim();
      const body = String(row?.paragraph || '').trim();
      if (!lessonId || !body) return null;
      const updatedAt = row.updatedAt || row.createdAt || null;
      return {
        id: activityNoteId(lessonId),
        title: `Atividade · ${lessonTitle(lessonId, lessons)}`,
        body,
        pinned: false,
        tags: [ACTIVITY_NOTE_TAG, lessonId],
        lessonId,
        clonedFromNoteId: null,
        createdAt: row.createdAt || updatedAt,
        updatedAt,
        sharedWithCount: 0,
        sharedWithUsernames: [],
        unreadEventsCount: 0,
        isActivityNote: true,
      };
    })
    .filter(Boolean);
}

export function activityReadingPayload(note) {
  return {
    ok: true,
    canEdit: false,
    canClone: false,
    canRefuse: false,
    readOnly: true,
    note: {
      ...note,
      body: note.body || '',
      sharedWith: [],
      events: [],
      clonedFrom: null,
    },
  };
}
