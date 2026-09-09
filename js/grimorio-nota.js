/**
 * Deep link legado — redireciona para o workspace do Grimório.
 * Mantido para bookmarks de grimorio-nota.html?id=
 */

'use strict';

import { ROUTES } from './api.js';

function noteIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

const params = new URLSearchParams(window.location.search);
const noteId = noteIdFromQuery();

if (params.get('edit') === '1' && noteId) {
  window.location.replace(ROUTES.grimorioEditar(noteId));
} else if (noteId) {
  window.location.replace(ROUTES.grimorioNota(noteId));
} else {
  window.location.replace(ROUTES.grimorio());
}
