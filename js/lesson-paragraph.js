/**
 * Pacote único de parágrafo de aula: síntese + bloco de anotações da prática.
 * Marcadores idênticos em aula1–aula4; o relatório do Mestre reutiliza o split.
 */

export const CONFIG_NOTES_START = '=== ANOTACOES_DE_CONFIGURACAO ===';
export const CONFIG_NOTES_END = '=== FIM_ANOTACOES_DE_CONFIGURACAO ===';

export function normalizeParagraph(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function normalizeNotes(text) {
  return String(text || '').replace(/\r\n/g, '\n').trim();
}

export function composeLessonRecord(summary, notes) {
  const normalizedSummary = normalizeParagraph(summary);
  const normalizedNotes = normalizeNotes(notes);

  if (!normalizedSummary && !normalizedNotes) return '';
  if (!normalizedNotes) return normalizedSummary;
  if (!normalizedSummary) {
    return `${CONFIG_NOTES_START}\n${normalizedNotes}\n${CONFIG_NOTES_END}`;
  }

  return `${normalizedSummary}\n\n${CONFIG_NOTES_START}\n${normalizedNotes}\n${CONFIG_NOTES_END}`;
}

export function splitLessonRecord(record) {
  const text = String(record || '');
  const start = text.indexOf(CONFIG_NOTES_START);
  const end = text.indexOf(CONFIG_NOTES_END);

  if (start < 0 || end < 0 || end < start) {
    return {
      summary: text,
      notes: '',
    };
  }

  const summary = text.slice(0, start).trim();
  const notes = text.slice(start + CONFIG_NOTES_START.length, end).trim();
  return { summary, notes };
}
