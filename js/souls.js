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
  getAchievementRarity,
  LESSONS,
} from './api.js';
import {
  activityLessonIds,
  deliveredLessonCount,
  emptyReportFilters,
  groupActivitiesByUser,
  hasUniqueRelic,
  latestActivitiesByLesson,
  lessonChipLabel,
  lessonHeading,
  matchesSoulFilters,
  orderedDeliveredActivities,
  parseActivityOffer,
  parseReportFilters,
  writeReportFilterParams,
} from './souls-report.js';

let currentToken = null;
let selectedOwnerId = null;
let allStudents = [];
let activityOwners = [];
let visibleActivityOwners = [];
let selectedActivityUsername = '';
let currentTab = 'users';
let reportFilters = emptyReportFilters();
let filterBarBound = false;

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

function appendUniquePill(host, user) {
  if (!host || !hasUniqueRelic(user?.achievements, getAchievementRarity)) return;
  const pill = document.createElement('span');
  pill.className = 'relic-pill';
  pill.textContent = 'Única';
  pill.title = 'Relíquia de raridade Única';
  host.appendChild(pill);
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
  appendUniquePill(identify, user);
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

function renderUsers(users, options = {}) {
  const grid = document.getElementById('souls-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = options.emptyCopy || 'Nenhuma alma cadastrada ainda.';
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

function buildActivityOwnerCard(owner, index) {
  const user = owner.user || {};
  const sent = deliveredLessonCount(owner.activities, LESSONS);
  const total = LESSONS.length || sent;

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'activity-owner';
  card.style.animationDelay = `${Math.min(index, 10) * 45}ms`;
  card.dataset.username = String(user.username || '');
  if (normalizeUsername(selectedActivityUsername) === normalizeUsername(user.username)) {
    card.classList.add('is-active');
  }

  const avatar = document.createElement('img');
  avatar.className = 'activity-owner__avatar';
  avatar.alt = `Avatar de ${user.fullName || user.name || user.username || 'aluno'}`;
  loadAvatarImage(avatar, user.avatarIndex ?? 0);

  const identify = document.createElement('div');
  identify.className = 'activity-owner__identify';

  const name = document.createElement('p');
  name.className = 'activity-owner__name';
  name.textContent = user.fullName || user.name || user.username || 'Aluno';

  const handle = document.createElement('p');
  handle.className = 'activity-owner__handle';
  handle.textContent = `@${user.username || ''}`;

  const meta = document.createElement('p');
  meta.className = 'activity-owner__meta';
  meta.textContent = [
    user.turma || 'Sem turma',
    `${sent}/${total} aulas com oferenda`,
  ].join(' · ');

  identify.append(name, handle, meta);
  appendUniquePill(identify, user);
  card.append(avatar, identify);
  card.addEventListener('click', () => {
    openOwnerActivities(owner);
  });
  return card;
}

function renderActivityOwners(owners, options = {}) {
  const host = document.getElementById('activity-owners');
  if (!host) return;

  visibleActivityOwners = Array.isArray(owners) ? owners : [];
  host.innerHTML = '';
  if (!visibleActivityOwners.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    const sourceCount = options.sourceCount ?? visibleActivityOwners.length;
    empty.textContent = sourceCount === 0
      ? 'Nenhuma oferenda na Trilha ainda.'
      : 'Nenhuma alma neste véu.';
    host.appendChild(empty);
    closeActivityDetail({ skipHistory: true });
    return;
  }

  owners.forEach((owner, index) => {
    host.appendChild(buildActivityOwnerCard(owner, index));
  });
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function usernameFromLocation() {
  try {
    return String(new URL(window.location.href).searchParams.get('u') || '').trim();
  } catch {
    return '';
  }
}

function findActivityOwner(username, pool = visibleActivityOwners) {
  const needle = normalizeUsername(username);
  if (!needle) return null;
  const list = Array.isArray(pool) ? pool : [];
  return list.find((owner) => normalizeUsername(owner.user?.username) === needle) || null;
}

function writeReportQuery(options = {}) {
  try {
    const url = new URL(window.location.href);
    const tab = options.tab ?? currentTab;
    const handle = options.u !== undefined ? options.u : selectedActivityUsername;
    if (tab === 'users') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    if (tab === 'activities' && handle) url.searchParams.set('u', String(handle).trim());
    else url.searchParams.delete('u');
    writeReportFilterParams(url, reportFilters);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch {
    // ignore
  }
}

function markActiveActivityOwner(username) {
  const needle = normalizeUsername(username);
  document.querySelectorAll('.activity-owner').forEach((node) => {
    node.classList.toggle('is-active', normalizeUsername(node.dataset.username) === needle && Boolean(needle));
  });
}

function closeActivityDetail(options = {}) {
  selectedActivityUsername = '';
  markActiveActivityOwner('');
  const detail = document.getElementById('activity-detail');
  if (detail) detail.hidden = true;
  const map = document.getElementById('activity-trail-map');
  if (map) {
    map.innerHTML = '';
    map.hidden = true;
  }
  const lessons = document.getElementById('activity-lessons');
  if (lessons) lessons.innerHTML = '';
  const title = document.getElementById('activity-detail-title');
  if (title) title.textContent = 'Oferendas da Trilha';
  if (!options.skipHistory) writeReportQuery({ tab: 'activities', u: '' });
}

function renderTrailMap(owner) {
  const map = document.getElementById('activity-trail-map');
  if (!map) return;

  map.innerHTML = '';
  const delivered = latestActivitiesByLesson(owner.activities);
  LESSONS.forEach((lesson) => {
    const sent = delivered.has(lesson.id);
    const chip = document.createElement('span');
    chip.className = `trail-chip ${sent ? 'is-sent' : 'is-missing'}`;
    chip.title = lessonHeading(lesson.id, LESSONS);
    chip.setAttribute('aria-label', `${lessonChipLabel(lesson)}: ${sent ? 'Enviou' : 'Ausente'}`);

    const label = document.createElement('span');
    label.textContent = lessonChipLabel(lesson);

    const state = document.createElement('span');
    state.className = 'trail-chip__state';
    state.textContent = sent ? 'Enviou' : 'Ausente';

    chip.append(label, state);
    map.appendChild(chip);
  });
  map.hidden = LESSONS.length === 0;
}

function appendActivityBlock(host, label, text) {
  if (!text) return;
  const block = document.createElement('section');
  block.className = 'activity-block';

  const heading = document.createElement('h4');
  heading.className = 'activity-block__label';
  heading.textContent = label;

  const body = document.createElement('p');
  body.className = 'activity-block__text';
  body.textContent = text;

  block.append(heading, body);
  host.appendChild(block);
}

function renderActivityLessons(owner) {
  const host = document.getElementById('activity-lessons');
  if (!host) return;

  host.innerHTML = '';
  const rows = orderedDeliveredActivities(owner.activities, LESSONS);
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Esta alma ainda não deixou oferenda na Trilha.';
    host.appendChild(empty);
    return;
  }

  rows.forEach((activity) => {
    const section = document.createElement('article');
    section.className = 'activity-lesson';

    const heading = document.createElement('h3');
    heading.className = 'activity-lesson__title';
    heading.textContent = lessonHeading(activity.lessonId, LESSONS);

    const meta = document.createElement('p');
    meta.className = 'activity-lesson__meta';
    meta.textContent = `Atualizado em ${formatDate(activity.updatedAt)}`;

    section.append(heading, meta);

    const offer = parseActivityOffer(activity.paragraph);
    if (offer.empty) {
      const vacant = document.createElement('p');
      vacant.className = 'activity-offer-empty';
      vacant.textContent = '*Oferenda vazia.*';
      section.appendChild(vacant);
    } else {
      appendActivityBlock(section, 'Síntese', offer.summary);
      appendActivityBlock(section, 'Anotações da prática', offer.notes);
    }

    host.appendChild(section);
  });
}

function renderMissingActivityOwner(username) {
  selectedActivityUsername = '';
  markActiveActivityOwner('');
  const detail = document.getElementById('activity-detail');
  const title = document.getElementById('activity-detail-title');
  const map = document.getElementById('activity-trail-map');
  const lessons = document.getElementById('activity-lessons');
  if (detail) detail.hidden = false;
  if (title) title.textContent = `Oferendas da Trilha · @${normalizeUsername(username) || username}`;
  if (map) {
    map.innerHTML = '';
    map.hidden = true;
  }
  if (lessons) {
    lessons.innerHTML = '';
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Esta alma ainda não deixou oferenda na Trilha.';
    lessons.appendChild(empty);
  }
}

function openOwnerActivities(owner, options = {}) {
  const user = owner?.user || {};
  const username = String(user.username || '').trim();
  if (!username) return;

  selectedActivityUsername = username;
  const detail = document.getElementById('activity-detail');
  const title = document.getElementById('activity-detail-title');
  if (detail) detail.hidden = false;
  if (title) title.textContent = `Oferendas da Trilha · @${username}`;
  markActiveActivityOwner(username);
  renderTrailMap(owner);
  renderActivityLessons(owner);
  if (!options.skipHistory) writeReportQuery({ tab: 'activities', u: username });
}

function restoreActivityDetail() {
  const username = selectedActivityUsername || usernameFromLocation();
  if (!username) return;
  const visible = findActivityOwner(username, visibleActivityOwners);
  const activitiesPanel = document.getElementById('report-activities');
  const tabActive = Boolean(activitiesPanel && !activitiesPanel.hidden);
  if (visible) {
    openOwnerActivities(visible, { skipHistory: !tabActive });
    return;
  }
  if (findActivityOwner(username, activityOwners)) {
    closeActivityDetail({ skipHistory: !tabActive });
    if (tabActive) writeReportQuery({ tab: 'activities', u: '' });
    return;
  }
  if (usernameFromLocation() && tabActive) {
    renderMissingActivityOwner(usernameFromLocation());
  }
}

function setActiveTab(tabName) {
  currentTab = tabName;
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

  syncFilterBarVisibility();
  applyReportFilters({ skipHistory: true });
  writeReportQuery({ tab: tabName, u: tabName === 'activities' ? selectedActivityUsername : '' });

  if (tabName === 'activities') restoreActivityDetail();
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

function lessonIdsForUser(user) {
  const owner = activityOwners.find((item) => String(item.user?.id) === String(user?.id));
  return owner ? activityLessonIds(owner.activities) : [];
}

function fillLessonFilterChips(facetId, facetKey) {
  const host = document.querySelector(`#${facetId} .filter-facet__chips`);
  if (!host || host.dataset.ready === '1') return;
  host.innerHTML = '';
  LESSONS.forEach((lesson) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.dataset.facet = facetKey;
    chip.dataset.value = lesson.id;
    chip.textContent = lessonChipLabel(lesson);
    chip.title = lessonHeading(lesson.id, LESSONS);
    host.appendChild(chip);
  });
  host.dataset.ready = '1';
}

function syncFilterBarVisibility() {
  const bar = document.getElementById('report-filters');
  if (!bar) return;
  bar.hidden = currentTab === 'grimorios';
  bar.querySelectorAll('[data-users-only]').forEach((node) => {
    node.hidden = currentTab !== 'users';
  });
}

function syncFilterBarUI() {
  const search = document.getElementById('filter-q');
  if (search && search.value !== reportFilters.q) search.value = reportFilters.q;

  document.querySelectorAll('#report-filters .filter-chip').forEach((chip) => {
    const facet = chip.dataset.facet;
    const selected = Array.isArray(reportFilters[facet]) ? reportFilters[facet] : [];
    chip.classList.toggle('is-on', selected.includes(chip.dataset.value));
  });

  const needAll = document.getElementById('filter-need-all');
  if (needAll) needAll.checked = Boolean(reportFilters.needAll);
  const noActivity = document.getElementById('filter-no-activity');
  if (noActivity) noActivity.checked = Boolean(reportFilters.noActivity);

  const unique = document.getElementById('filter-unique');
  if (unique) {
    unique.classList.toggle('is-on', Boolean(reportFilters.unique));
    unique.setAttribute('aria-pressed', String(Boolean(reportFilters.unique)));
  }
}

function applyReportFilters(options = {}) {
  const rarityOf = getAchievementRarity;
  const filteredStudents = allStudents.filter((user) => matchesSoulFilters(user, reportFilters, {
    scope: 'users',
    rarityOf,
    activityLessonIds: lessonIdsForUser(user),
  }));
  const filteredOwners = activityOwners.filter((owner) => matchesSoulFilters(owner, reportFilters, {
    scope: 'activities',
    rarityOf,
    activityLessonIds: activityLessonIds(owner.activities),
  }));

  renderUsers(filteredStudents, {
    emptyCopy: allStudents.length ? 'Nenhuma alma neste véu.' : 'Nenhuma alma cadastrada ainda.',
  });
  renderActivityOwners(filteredOwners, { sourceCount: activityOwners.length });

  const count = currentTab === 'activities' ? filteredOwners.length : filteredStudents.length;
  const countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = `${count} almas neste véu`;

  if (selectedActivityUsername && !findActivityOwner(selectedActivityUsername, filteredOwners)) {
    closeActivityDetail({ skipHistory: true });
  }

  if (!options.skipHistory) writeReportQuery();
}

function toggleFilterChip(chip) {
  const facet = chip?.dataset?.facet;
  const value = chip?.dataset?.value;
  if (!facet || !value || !Array.isArray(reportFilters[facet])) return;
  const list = reportFilters[facet];
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else list.push(value);
  syncFilterBarUI();
  applyReportFilters();
  if (currentTab === 'activities') restoreActivityDetail();
}

function mountFilterBar() {
  fillLessonFilterChips('filter-completed', 'completed');
  fillLessonFilterChips('filter-viewed', 'viewed');
  fillLessonFilterChips('filter-activity', 'activity');
  syncFilterBarUI();
  syncFilterBarVisibility();
  if (filterBarBound) return;
  filterBarBound = true;

  const bar = document.getElementById('report-filters');
  if (!bar) return;

  bar.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  bar.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (chip && bar.contains(chip)) toggleFilterChip(chip);
  });

  document.getElementById('filter-q')?.addEventListener('input', (event) => {
    reportFilters.q = event.target.value;
    applyReportFilters();
    if (currentTab === 'activities') restoreActivityDetail();
  });
  document.getElementById('filter-need-all')?.addEventListener('change', (event) => {
    reportFilters.needAll = Boolean(event.target.checked);
    applyReportFilters();
    if (currentTab === 'activities') restoreActivityDetail();
  });
  document.getElementById('filter-no-activity')?.addEventListener('change', (event) => {
    reportFilters.noActivity = Boolean(event.target.checked);
    applyReportFilters();
  });
  document.getElementById('filter-unique')?.addEventListener('click', () => {
    reportFilters.unique = !reportFilters.unique;
    syncFilterBarUI();
    applyReportFilters();
    if (currentTab === 'activities') restoreActivityDetail();
  });
  document.getElementById('filter-clear')?.addEventListener('click', () => {
    reportFilters = emptyReportFilters();
    syncFilterBarUI();
    applyReportFilters();
    if (currentTab === 'activities') restoreActivityDetail();
  });
}

async function loadSouls() {
  const grid = document.getElementById('souls-grid');
  const ownersHost = document.getElementById('activity-owners');
  if (grid) {
    grid.innerHTML = '<p class="loading">Consultando o submundo...</p>';
  }
  if (ownersHost) {
    ownersHost.innerHTML = '<p class="loading">Consultando atividades...</p>';
  }

  const { users, activities } = await listUsers(currentToken);
  const students = (users || []).filter((user) => user.role !== 'admin');
  allStudents = students;
  activityOwners = groupActivitiesByUser(students, activities || []);
  setSummary(allStudents);
  applyReportFilters({ skipHistory: true });
  restoreActivityDetail();
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
  reportFilters = parseReportFilters(window.location.search);
  currentTab = tabFromLocation();
  mountFilterBar();

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
  document.getElementById('activity-detail-close')?.addEventListener('click', () => closeActivityDetail());
}

document.addEventListener('DOMContentLoaded', init);
