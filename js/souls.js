'use strict';

import {
  detectAvatarCount,
  loadAvatarImage,
  ROUTES,
  ApiError,
  requireAdmin,
  listUsers,
  listNotesAdmin,
  listNotesForUser,
  getSession,
} from './api.js';

let currentToken = null;
let selectedOwnerId = null;

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function revealSoulsApp() {
  const app = document.getElementById('souls-app');
  if (app) app.hidden = false;
  document.body.classList.add('is-admin-ready');
}

function formatDate(value) {
  if (!value) return 'indisponivel';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'indisponivel';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR');
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
    metric('Perfil', user.role === 'admin' ? 'Administrador' : 'Aluno'),
    metric('Turma', user.turma || 'Nao informada')
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

function buildActivity(activity, index) {
  const item = document.createElement('article');
  item.className = 'activity-card';
  item.style.animationDelay = `${Math.min(index, 10) * 45}ms`;

  const title = document.createElement('p');
  title.className = 'activity-card__title';
  title.textContent = 'GDD - Integracao documental';

  const details = document.createElement('p');
  details.className = 'activity-card__details';
  details.textContent = `${activity.fullName} (@${activity.username}) | ${activity.turma || 'Turma nao informada'} | Atualizado em ${formatDate(activity.updatedAt)}`;

  const paragraph = document.createElement('p');
  paragraph.className = 'activity-card__paragraph';
  paragraph.textContent = activity.paragraph;

  item.append(title, details, paragraph);
  return item;
}

function renderActivities(activities) {
  const list = document.getElementById('activities-list');
  if (!list) return;

  list.innerHTML = '';
  if (!activities.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nenhuma atividade GDD enviada ainda.';
    list.appendChild(empty);
    return;
  }

  activities.forEach((activity, index) => {
    list.appendChild(buildActivity(activity, index));
  });
}

function setActiveTab(tabName) {
  const tabs = [
    { name: 'users', btn: 'tab-users', panel: 'report-users' },
    { name: 'activities', btn: 'tab-activities', panel: 'report-activities' },
    { name: 'grimorios', btn: 'tab-grimorios', panel: 'report-grimorios' },
  ];

  tabs.forEach(({ name, btn, panel }) => {
    const active = tabName === name;
    const button = document.getElementById(btn);
    const panelEl = document.getElementById(panel);
    button?.classList.toggle('is-active', active);
    button?.setAttribute('aria-selected', String(active));
    if (panelEl) panelEl.hidden = !active;
  });

  try {
    const url = new URL(window.location.href);
    if (tabName === 'users') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tabName);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch {
    // ignore
  }
}

function closeVigiliaDetail() {
  selectedOwnerId = null;
  const detail = document.getElementById('vigilia-detail');
  if (detail) detail.hidden = true;
  document.querySelectorAll('.vigilia-owner.is-active').forEach((node) => {
    node.classList.remove('is-active');
  });
}

async function openOwnerGrimorio(owner) {
  selectedOwnerId = owner.userId;
  const detail = document.getElementById('vigilia-detail');
  const title = document.getElementById('vigilia-detail-title');
  const notesList = document.getElementById('vigilia-notes');
  const empty = document.getElementById('vigilia-notes-empty');

  document.querySelectorAll('.vigilia-owner').forEach((node) => {
    node.classList.toggle('is-active', Number(node.dataset.userId) === Number(owner.userId));
  });

  if (detail) detail.hidden = false;
  if (title) {
    title.textContent = `Grimório de @${owner.username}`;
  }
  if (notesList) {
    notesList.innerHTML = '<li class="loading">Abrindo grimório...</li>';
  }
  if (empty) empty.hidden = true;

  try {
    const payload = await listNotesForUser(currentToken, owner.userId);
    const notes = payload.notes || [];
    if (!notesList) return;

    notesList.innerHTML = '';
    if (notes.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    notes.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'vigilia-note';

      const link = document.createElement('a');
      link.className = 'vigilia-note__link';
      link.href = ROUTES.grimorioNota(note.id);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const name = document.createElement('p');
      name.className = 'vigilia-note__title';
      name.textContent = note.pinned ? `◆ ${note.title}` : note.title;

      const meta = document.createElement('p');
      meta.className = 'vigilia-note__meta';
      const parts = [
        formatDateTime(note.updatedAt),
        note.sharedWithCount
          ? (note.sharedWithCount === 1 ? '1 revelação' : `${note.sharedWithCount} revelações`)
          : null,
        Array.isArray(note.tags) && note.tags.length
          ? note.tags.map((tag) => `#${tag}`).join(' ')
          : null,
      ].filter(Boolean);
      meta.textContent = parts.join(' · ');

      link.append(name, meta);
      li.appendChild(link);
      notesList.appendChild(li);
    });
  } catch (error) {
    if (notesList) {
      notesList.innerHTML = '';
      const err = document.createElement('li');
      err.className = 'empty';
      err.textContent = error instanceof ApiError
        ? error.message
        : 'Falha ao abrir o grimório do aluno.';
      notesList.appendChild(err);
    }
  }
}

function renderVigiliaOwners(owners) {
  const host = document.getElementById('vigilia-owners');
  if (!host) return;

  host.innerHTML = '';
  if (!owners.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nenhum grimório sob vigília.';
    host.appendChild(empty);
    closeVigiliaDetail();
    return;
  }

  owners.forEach((owner) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'vigilia-owner';
    card.dataset.userId = String(owner.userId);
    if (Number(selectedOwnerId) === Number(owner.userId)) {
      card.classList.add('is-active');
    }

    const name = document.createElement('p');
    name.className = 'vigilia-owner__name';
    name.textContent = owner.fullName || owner.username;

    const handle = document.createElement('p');
    handle.className = 'vigilia-owner__handle';
    handle.textContent = `@${owner.username}`;

    const meta = document.createElement('p');
    meta.className = 'vigilia-owner__meta';
    const countLabel = owner.notesCount === 1
      ? '1 inscrição'
      : `${owner.notesCount} inscrições`;
    meta.textContent = [owner.turma || 'Sem turma', countLabel].join(' · ');

    card.append(name, handle, meta);
    card.addEventListener('click', () => {
      openOwnerGrimorio(owner);
    });
    host.appendChild(card);
  });
}

async function loadVigilancia() {
  const host = document.getElementById('vigilia-owners');
  if (host) {
    host.innerHTML = '<p class="loading">Consultando grimórios...</p>';
  }

  try {
    const payload = await listNotesAdmin(currentToken);
    renderVigiliaOwners(payload.owners || []);
  } catch (error) {
    if (host) {
      host.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = error instanceof ApiError
        ? error.message
        : 'Falha ao consultar grimórios sob vigília.';
      host.appendChild(empty);
    }
  }
}

async function loadSouls() {
  const grid = document.getElementById('souls-grid');
  const activitiesList = document.getElementById('activities-list');
  if (grid) {
    grid.innerHTML = '<p class="loading">Consultando o submundo...</p>';
  }
  if (activitiesList) {
    activitiesList.innerHTML = '<p class="loading">Consultando atividades...</p>';
  }

  const { users, activities } = await listUsers(currentToken);
  const students = (users || []).filter((user) => user.role !== 'admin');
  setSummary(students);
  renderUsers(students);
  renderActivities(activities || []);
  await loadVigilancia();
}

function tabFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = String(params.get('tab') || '').toLowerCase();
    if (tab === 'activities' || tab === 'grimorios' || tab === 'vigilancia') {
      return tab === 'vigilancia' ? 'grimorios' : tab;
    }
    if (window.location.hash === '#grimorios' || window.location.hash === '#vigilancia') {
      return 'grimorios';
    }
  } catch {
    // ignore
  }
  return 'users';
}

async function init() {
  const avatarCountReady = detectAvatarCount();

  let result;
  try {
    result = await requireAdmin();
  } catch (error) {
    showApiWarning(error instanceof ApiError ? error.message : 'A API nao respondeu.');
    return;
  }

  if (!result) return;

  revealSoulsApp();
  currentToken = getSession()?.token ?? null;
  await avatarCountReady;

  try {
    await loadSouls();
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      window.location.replace(ROUTES.dashboard());
      return;
    }
    showApiWarning(error instanceof ApiError ? error.message : 'Falha ao consultar as almas registradas.');
  }

  setActiveTab(tabFromLocation());

  document.getElementById('btn-refresh')?.addEventListener('click', async () => {
    try {
      await loadSouls();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        window.location.replace(ROUTES.dashboard());
        return;
      }
      showApiWarning(error instanceof ApiError ? error.message : 'Falha ao atualizar a lista de almas.');
    }
  });

  document.getElementById('tab-users')?.addEventListener('click', () => setActiveTab('users'));
  document.getElementById('tab-activities')?.addEventListener('click', () => setActiveTab('activities'));
  document.getElementById('tab-grimorios')?.addEventListener('click', () => setActiveTab('grimorios'));
  document.getElementById('vigilia-detail-close')?.addEventListener('click', () => closeVigiliaDetail());
}

document.addEventListener('DOMContentLoaded', init);
