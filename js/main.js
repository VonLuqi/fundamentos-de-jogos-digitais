/**
 * ============================================================
 * FUNDAMENTOS DE JOGOS DIGITAIS — Home / Introdução
 * ============================================================
 * Responsabilidade atual:
 *  - apresentar a plataforma;
 *  - oferecer um CTA único de entrada;
 *  - encaminhar para auth ou dashboard conforme sessão.
 * ============================================================
 */

'use strict';

import {
  ROUTES,
  getSession,
  validateSession,
} from './api.js';

async function resolveEntryTarget() {
  const session = getSession();
  if (!session?.token) return ROUTES.auth();

  try {
    await validateSession(session.token);
    return ROUTES.dashboard();
  } catch (error) {
    return ROUTES.auth();
  }
}

async function handleEnterSystem() {
  const button = document.getElementById('btn-enter-system');
  if (button) button.disabled = true;

  try {
    const target = await resolveEntryTarget();
    window.location.href = target;
  } finally {
    if (button) button.disabled = false;
  }
}

async function init() {
  const button = document.getElementById('btn-enter-system');
  if (!button) return;

  button.addEventListener('click', handleEnterSystem);
}

document.addEventListener('DOMContentLoaded', init);
