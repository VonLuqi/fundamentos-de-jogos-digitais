/**
 * Regras puras das conquistas do Grimório (MVP + 4 secretas).
 * Usado por api/progress.js e pelos smokes — sem I/O.
 */

export const GRIMORIO_PUBLIC_IDS = Object.freeze([
  'grimorio_primeira_inscricao',
  'grimorio_elo_da_trilha',
  'grimorio_dez_inscricoes',
  'grimorio_revelacao',
  'grimorio_fixador',
  'grimorio_eco_clonado',
]);

export const GRIMORIO_SECRET_IDS = Object.freeze([
  'grimorio_vinculo_oculto',
  'grimorio_eco_invertido',
  'grimorio_escriba_ritual',
  'grimorio_cartografo_pessoal',
]);

export const GRIMORIO_ACHIEVEMENT_IDS = Object.freeze([
  ...GRIMORIO_PUBLIC_IDS,
  ...GRIMORIO_SECRET_IDS,
]);

/** Thresholds (servidor) — não espelhados no JSON público para não spoilar. */
export const GRIMORIO_THRESHOLDS = Object.freeze({
  dezInscricoes: 10,
  cartografoMinTags: 4,
  escribaMinWords: 80,
  escribaMinConcepts: 2,
});

const ESCRIBA_CONCEPT_ALIASES = Object.freeze([
  ['jogo', 'game', 'ludico', 'lúdico'],
  ['aula', 'trilha', 'licao', 'lição', 'modulo', 'módulo'],
  ['mecanica', 'mecânica', 'fisica', 'física', 'gravidade', 'massa'],
  ['heroi', 'herói', 'companheiro', 'dominio', 'domínio', 'hades'],
  ['gdd', 'documento', 'design', 'prototipo', 'protótipo'],
]);

export function normalizeGrimoireText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text) {
  const normalized = normalizeGrimoireText(text);
  if (!normalized) return 0;
  return normalized.split(' ').filter(Boolean).length;
}

export function countMatchedConcepts(text) {
  const normalized = normalizeGrimoireText(text);
  if (!normalized) return 0;
  return ESCRIBA_CONCEPT_ALIASES.filter((aliases) =>
    aliases.some((alias) => normalized.includes(normalizeGrimoireText(alias)))
  ).length;
}

export function matchesEscribaRitual(body) {
  const words = countWords(body);
  const concepts = countMatchedConcepts(body);
  return (
    words >= GRIMORIO_THRESHOLDS.escribaMinWords
    && concepts >= GRIMORIO_THRESHOLDS.escribaMinConcepts
  );
}

export function matchesCartografoPessoal(tags = []) {
  const unique = new Set(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag || '').trim().toLowerCase())
      .filter(Boolean)
  );
  return unique.size >= GRIMORIO_THRESHOLDS.cartografoMinTags;
}

/**
 * @param {object} snapshot
 * @param {string[]} snapshot.unlocked
 * @param {'create'|'update'|'share'|'clone'} snapshot.event
 * @param {number} snapshot.originalNoteCount  notas próprias sem cloned_from
 * @param {boolean} [snapshot.isCloneNote]      nota sob análise é clone
 * @param {{ lessonId?: string|null, body?: string, tags?: string[], shareCount?: number, pinned?: boolean }} snapshot.note
 * @returns {string[]}
 */
export function evaluateGrimoireAchievementIds(snapshot = {}) {
  const unlocked = new Set(
    Array.isArray(snapshot.unlocked) ? snapshot.unlocked.map(String) : []
  );
  const event = String(snapshot.event || '');
  const originalNoteCount = Math.max(0, Number(snapshot.originalNoteCount) || 0);
  const isCloneNote = Boolean(snapshot.isCloneNote);
  const note = snapshot.note && typeof snapshot.note === 'object' ? snapshot.note : {};
  const lessonId = note.lessonId ? String(note.lessonId) : '';
  const shareCount = Math.max(0, Number(note.shareCount) || 0);
  const pinned = Boolean(note.pinned);
  const candidates = [];

  const consider = (id, passes) => {
    if (!passes || unlocked.has(id) || candidates.includes(id)) return;
    candidates.push(id);
  };

  if (event === 'create' && !isCloneNote) {
    consider('grimorio_primeira_inscricao', originalNoteCount >= 1);
    consider('grimorio_dez_inscricoes', originalNoteCount >= GRIMORIO_THRESHOLDS.dezInscricoes);
  }

  if ((event === 'create' || event === 'update') && !isCloneNote) {
    consider('grimorio_elo_da_trilha', Boolean(lessonId));
    consider('grimorio_fixador', pinned);
    consider('grimorio_escriba_ritual', matchesEscribaRitual(note.body));
    consider('grimorio_cartografo_pessoal', matchesCartografoPessoal(note.tags));
  }

  if (event === 'update' && !isCloneNote) {
    consider('grimorio_dez_inscricoes', originalNoteCount >= GRIMORIO_THRESHOLDS.dezInscricoes);
  }

  if (event === 'share') {
    consider('grimorio_revelacao', true);
    consider('grimorio_vinculo_oculto', Boolean(lessonId));
  }

  if ((event === 'create' || event === 'update') && !isCloneNote) {
    consider('grimorio_vinculo_oculto', Boolean(lessonId) && shareCount >= 1);
  }

  if (event === 'clone') {
    consider('grimorio_eco_clonado', true);
    consider('grimorio_eco_invertido', true);
  }

  return candidates;
}
