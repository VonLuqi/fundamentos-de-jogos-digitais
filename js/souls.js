'use strict';

import {
  detectAvatarCount,
  loadAvatarImage,
  ROUTES,
  ApiError,
  requireSession,
  listUsers,
  getSession,
} from './api.js';

let currentToken = null;

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function formatDate(value) {
  if (!value) return 'indisponivel';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'indisponivel';
  return date.toLocaleDateString('pt-BR');
}

function sumViewEvents(users) {
  return users.reduce((total, user) => {
    const views = Array.isArray(user.viewedLessons) ? user.viewedLessons : [];
    const userTotal = views.reduce((acc, item) => acc + Number(item.viewCount || 0), 0);
    return total + userTotal;
  }, 0);
}

function setSummary(users) {
  const completed = users.reduce((acc, user) => acc + (Array.isArray(user.completedLessons) ? user.completedLessons.length : 0), 0);
  const achievements = users.reduce((acc, user) => acc + (Array.isArray(user.achievements) ? user.achievements.length : 0), 0);

  document.getElementById('sum-users').textContent = String(users.length);
  document.getElementById('sum-views').textContent = String(sumViewEvents(users));
  document.getElementById('sum-completed').textContent = String(completed);
  document.getElementById('sum-achievements').textContent = String(achievements);
}

function metric(label, value) {
  const box = document.createElement('div');
  box.className = 'metric';

  const title = document.createElement('p');
  title.className = 'metric__label';
  title.textContent = label;

  const content = document.createElement('p');
  content.className = 'metric__value';
  content.textContent = value;

  box.append(title, content);
  return box;
}

function buildSoulCard(user, index) {
  const card = document.createElement('article');
  card.className = 'soul-card';
  card.style.animationDelay = `${Math.min(index, 10) * 45}ms`;

  const header = document.createElement('div');
  header.className = 'soul-card__header';

  const avatar = document.createElement('img');
  avatar.className = 'soul-card__avatar';
  avatar.alt = `Avatar de ${user.fullName || user.name || user.username}`;
  loadAvatarImage(avatar, user.avatarIndex ?? 0);

  const identify = document.createElement('div');

  const name = document.createElement('p');
  name.className = 'soul-card__name';
  if (user.role === 'admin') name.classList.add('is-admin');
  name.textContent = user.role === 'admin' ? `♛ ${user.fullName || user.name}` : (user.fullName || user.name);

  const username = document.createElement('p');
  username.className = 'soul-card__username';
  username.textContent = `@${user.username}`;

  identify.append(name, username);
  header.append(avatar, identify);

  const meta = document.createElement('div');
  meta.className = 'soul-card__meta';

  const viewedLessons = Array.isArray(user.viewedLessons) ? user.viewedLessons : [];

  meta.append(
    metric('Cadastro', formatDate(user.created_at)),
    metric('XP', String(user.xp ?? 0)),
    metric('Aulas vistas', String(viewedLessons.length)),
    metric('Aulas concluidas', String(Array.isArray(user.completedLessons) ? user.completedLessons.length : 0)),
    metric('Conquistas', String(Array.isArray(user.achievements) ? user.achievements.length : 0)),
    metric('Perfil', user.role === 'admin' ? 'Administrador' : 'Aluno')
  );

  const views = document.createElement('ul');
  views.className = 'soul-card__views';

  if (viewedLessons.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'nenhuma aula vista';
    views.appendChild(empty);
  } else {
    viewedLessons.forEach((item) => {
      const row = document.createElement('li');
      row.textContent = `${item.lessonId}: ${item.viewCount}x`;
      views.appendChild(row);
    });
  }

  card.append(header, meta, views);
  return card;
}

function renderUsers(users) {
  const grid = document.getElementById('souls-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nenhuma alma cadastrada ainda.';
    grid.appendChild(empty);
    return;
  }

  users
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    })
    .forEach((user, index) => {
      grid.appendChild(buildSoulCard(user, index));
    });
}

async function loadSouls() {
  const grid = document.getElementById('souls-grid');
  if (grid) {
    grid.innerHTML = '<p class="loading">Consultando o submundo...</p>';
  }

  const { users } = await listUsers(currentToken);
  const students = (users || []).filter((user) => user.role !== 'admin');
  setSummary(students);
  renderUsers(students);
}

async function init() {
  const avatarCountReady = detectAvatarCount();

  let result;
  try {
    result = await requireSession();
  } catch (error) {
    showApiWarning(error instanceof ApiError ? error.message : 'A API nao respondeu.');
    return;
  }

  if (!result) return;
  if (result.user.role !== 'admin') {
    window.location.replace(ROUTES.dashboard());
    return;
  }

  currentToken = getSession()?.token ?? null;
  await avatarCountReady;

  try {
    await loadSouls();
  } catch (error) {
    showApiWarning(error instanceof ApiError ? error.message : 'Falha ao consultar as almas registradas.');
  }

  document.getElementById('btn-refresh')?.addEventListener('click', async () => {
    try {
      await loadSouls();
    } catch (error) {
      showApiWarning(error instanceof ApiError ? error.message : 'Falha ao atualizar a lista de almas.');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
