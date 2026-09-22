'use strict';

import { initAppShell } from './app-shell.js';
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
  getAchievementById,
  ACHIEVEMENTS,
  ACHIEVEMENT_RARITY_LABELS,
  describeLevelProgress,
  getAvatarCount,
  logout,
  LESSONS,
  adminUpdateProfile,
  adminAdjustXp,
  adminSetLessonCompleted,
  adminGrantAchievement,
  adminRevokeAchievement,
  adminClearEmailSeal,
  adminInvalidateSessions,
  adminForceTempPassword,
  adminIssueSoulRecoveryCode,
} from './api.js';
import {
  activityLessonIds,
  buildAlunosCsvRows,
  buildAtividadesCsvRows,
  csvWithBom,
  deliveredLessonCount,
  emptyReportFilters,
  groupActivitiesByUser,
  hasUniqueRelic,
  latestActivitiesByLesson,
  lessonChipLabel,
  lessonHeading,
  matchesSoulFilters,
  matchesVigiliaOwner,
  orderedDeliveredActivities,
  parseActivityOffer,
  parseReportFilters,
  writeReportFilterParams,
} from './souls-report.js';

let currentToken = null;
let currentUser = null;
let selectedOwnerId = null;
let allStudents = [];
let activityOwners = [];
let visibleActivityOwners = [];
let vigiliaOwners = [];
let filteredStudentsCache = [];
let filteredActivityOwnersCache = [];
let selectedActivityUsername = '';
let selectedEspelhoUsername = '';
let currentTab = 'users';
let reportFilters = emptyReportFilters();
let filterBarBound = false;
let espelhoBound = false;

function maskEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 1 || at === value.length - 1) return '•••';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const keep = local.length >= 2 ? 2 : 1;
  return `${local.slice(0, keep)}***@${domain}`;
}

function seloState(user) {
  const email = String(user?.email || '').trim();
  const verified = user?.emailVerifiedAt ?? user?.email_verified_at ?? null;
  if (!email) return { kind: 'empty', label: 'vazio' };
  if (verified) return { kind: 'confirmed', label: 'confirmado' };
  return { kind: 'pending', label: 'pendente' };
}

function mergeStudentUser(next) {
  if (!next?.id) return;
  const normalized = { ...next };
  allStudents = allStudents.map((user) => (
    String(user.id) === String(normalized.id) ? { ...user, ...normalized } : user
  ));
  activityOwners = activityOwners.map((owner) => (
    String(owner.user?.id) === String(normalized.id)
      ? { ...owner, user: { ...owner.user, ...normalized } }
      : owner
  ));
}

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
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'soul-card';
  card.style.animationDelay = `${Math.min(index, 10) * 45}ms`;
  card.dataset.username = String(user.username || '');
  if (normalizeUsername(selectedEspelhoUsername) === normalizeUsername(user.username)) {
    card.classList.add('is-active');
  }

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
  const oferendas = lessonIdsForUser(user).length;
  const lessonTotal = Array.isArray(LESSONS) ? LESSONS.length : 0;

  meta.append(
    metric('Cadastro', formatDate(user.created_at)),
    metric('XP', String(user.xp ?? 0)),
    metric('Oferendas', lessonTotal ? `${oferendas}/${lessonTotal}` : String(oferendas)),
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
  card.addEventListener('click', () => openSoulEspelho(user));
  return card;
}

function renderUsers(users, options = {}) {
  const grid = document.getElementById('souls-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = options.emptyCopy || 'Nenhuma alma atravessou o Domínio ainda.';
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
    const activityHandle = options.u !== undefined && tab === 'activities'
      ? options.u
      : (tab === 'activities' ? selectedActivityUsername : '');
    const userHandle = options.u !== undefined && tab === 'users'
      ? options.u
      : (tab === 'users' ? selectedEspelhoUsername : '');
    if (tab === 'users') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    const handle = tab === 'activities' ? activityHandle : (tab === 'users' ? userHandle : '');
    if (handle) url.searchParams.set('u', String(handle).trim());
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

function findStudentByUsername(username, pool = filteredStudentsCache) {
  const needle = normalizeUsername(username);
  if (!needle) return null;
  const list = Array.isArray(pool) && pool.length ? pool : allStudents;
  return list.find((user) => normalizeUsername(user.username) === needle) || null;
}

function markActiveEspelho(username) {
  const needle = normalizeUsername(username);
  document.querySelectorAll('.soul-card').forEach((node) => {
    node.classList.toggle('is-active', normalizeUsername(node.dataset.username) === needle && Boolean(needle));
  });
}

function closeSoulEspelho(options = {}) {
  selectedEspelhoUsername = '';
  markActiveEspelho('');
  const panel = document.getElementById('soul-espelho');
  const body = document.getElementById('espelho-body');
  if (panel) panel.hidden = true;
  if (body) body.innerHTML = '';
  if (!options.skipHistory) writeReportQuery({ tab: 'users', u: '' });
}

function section(title) {
  const box = document.createElement('section');
  box.className = 'espelho-section';
  const label = document.createElement('p');
  label.className = 'espelho-section__label';
  label.textContent = title;
  box.appendChild(label);
  return box;
}

function row(text) {
  const el = document.createElement('p');
  el.className = 'espelho-row';
  el.textContent = text;
  return el;
}

async function runEspelhoMutation(label, fn) {
  try {
    const result = await fn();
    if (result?.user) {
      mergeStudentUser(result.user);
      applyReportFilters({ skipHistory: true });
      const fresh = findStudentByUsername(result.user.username, allStudents);
      if (fresh) openSoulEspelho(fresh, { skipHistory: true });
    } else if (selectedEspelhoUsername) {
      const fresh = findStudentByUsername(selectedEspelhoUsername, allStudents);
      if (fresh) openSoulEspelho(fresh, { skipHistory: true });
    }
    return result;
  } catch (error) {
    showApiWarning(error instanceof ApiError ? error.message : `Falha: ${label}`);
    return null;
  }
}

function openSoulEspelho(user, options = {}) {
  if (!user || user.role === 'admin') return;
  const username = String(user.username || '').trim();
  if (!username) return;

  selectedEspelhoUsername = username;
  const panel = document.getElementById('soul-espelho');
  const title = document.getElementById('espelho-title');
  const body = document.getElementById('espelho-body');
  if (!panel || !body) return;

  panel.hidden = false;
  if (title) title.textContent = `Espelho · @${username}`;
  markActiveEspelho(username);
  body.innerHTML = '';

  const progress = describeLevelProgress(user.xp);
  const seal = seloState(user);
  const owned = new Set(Array.isArray(user.achievements) ? user.achievements : []);
  const activityIds = lessonIdsForUser(user);
  const notesCount = vigiliaOwners.find((o) => Number(o.userId) === Number(user.id))?.notesCount || 0;

  // Identidade
  const idSec = section('Identidade');
  const avatar = document.createElement('img');
  avatar.className = 'soul-card__avatar';
  avatar.alt = '';
  loadAvatarImage(avatar, user.avatarIndex ?? 0);
  idSec.appendChild(avatar);
  idSec.appendChild(row(`${user.fullName || user.name} · @${user.username}`));
  idSec.appendChild(row(`Turma ${user.turma || '—'} · ${user.role === 'admin' ? 'Mestre' : 'Aluno'}`));

  const nameInput = document.createElement('input');
  nameInput.className = 'espelho-input';
  nameInput.value = user.fullName || '';
  nameInput.placeholder = 'Nome completo';
  const turmaSelect = document.createElement('select');
  turmaSelect.className = 'espelho-select';
  ['TCG01', 'TCG02'].forEach((code) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = code;
    if (user.turma === code) opt.selected = true;
    turmaSelect.appendChild(opt);
  });
  const avatarInput = document.createElement('input');
  avatarInput.className = 'espelho-input';
  avatarInput.type = 'number';
  avatarInput.min = '0';
  avatarInput.max = String(Math.max(0, getAvatarCount() - 1));
  avatarInput.value = String(user.avatarIndex ?? 0);
  avatarInput.title = 'Índice do avatar';
  const saveProfile = document.createElement('button');
  saveProfile.type = 'button';
  saveProfile.className = 'btn-refresh';
  saveProfile.textContent = 'Salvar perfil';
  saveProfile.addEventListener('click', async () => {
    if (!window.confirm('Salvar alterações de perfil desta alma?')) return;
    await runEspelhoMutation('perfil', () => adminUpdateProfile(currentToken, user.id, {
      fullName: nameInput.value,
      turma: turmaSelect.value,
      avatarIndex: Number(avatarInput.value),
    }));
  });
  const profileRow = document.createElement('div');
  profileRow.className = 'espelho-actions';
  profileRow.append(nameInput, turmaSelect, avatarInput, saveProfile);
  idSec.appendChild(profileRow);
  body.appendChild(idSec);

  // Selo
  const sealSec = section('Selo do Mensageiro');
  sealSec.appendChild(row(
    seal.kind === 'empty'
      ? 'Sem e-mail'
      : `${maskEmail(user.email)} · ${seal.label}${user.emailVerifiedAt ? ` · ${formatDateTime(user.emailVerifiedAt)}` : ''}`,
  ));
  const clearSeal = document.createElement('button');
  clearSeal.type = 'button';
  clearSeal.className = 'btn-refresh';
  clearSeal.textContent = 'Limpar e-mail / re-selo';
  clearSeal.addEventListener('click', async () => {
    if (!window.confirm('Zerar e-mail e selo desta alma? Ela precisará vincular de novo.')) return;
    await runEspelhoMutation('selo', () => adminClearEmailSeal(currentToken, user.id));
  });
  sealSec.appendChild(clearSeal);
  body.appendChild(sealSec);

  // Progresso
  const progSec = section('Progresso');
  progSec.appendChild(row(`XP ${user.xp ?? 0} · Nível ${progress.levelLabel} · ${progress.rank}`));
  const xpInput = document.createElement('input');
  xpInput.className = 'espelho-input';
  xpInput.type = 'number';
  xpInput.placeholder = 'XP';
  xpInput.value = String(user.xp ?? 0);
  const reasonInput = document.createElement('input');
  reasonInput.className = 'espelho-input';
  reasonInput.placeholder = 'Razão do ajuste';
  const setXp = document.createElement('button');
  setXp.type = 'button';
  setXp.className = 'btn-refresh';
  setXp.textContent = 'Definir XP';
  setXp.addEventListener('click', async () => {
    const reason = reasonInput.value.trim();
    if (reason.length < 3) {
      showApiWarning('Informe a razão do ajuste de XP.');
      return;
    }
    if (!window.confirm(`Definir XP de @${username} para ${xpInput.value}?`)) return;
    await runEspelhoMutation('XP', () => adminAdjustXp(currentToken, user.id, {
      mode: 'set',
      xp: Number(xpInput.value),
      reason,
    }));
  });
  const deltaXp = document.createElement('button');
  deltaXp.type = 'button';
  deltaXp.className = 'btn-refresh';
  deltaXp.textContent = 'Somar Δ';
  deltaXp.addEventListener('click', async () => {
    const reason = reasonInput.value.trim();
    if (reason.length < 3) {
      showApiWarning('Informe a razão do ajuste de XP.');
      return;
    }
    if (!window.confirm(`Somar ${xpInput.value} XP a @${username}?`)) return;
    await runEspelhoMutation('XP', () => adminAdjustXp(currentToken, user.id, {
      mode: 'delta',
      xp: Number(xpInput.value),
      reason,
    }));
  });
  const xpActions = document.createElement('div');
  xpActions.className = 'espelho-actions';
  xpActions.append(xpInput, reasonInput, setXp, deltaXp);
  progSec.appendChild(xpActions);

  const lessonsWrap = document.createElement('div');
  lessonsWrap.className = 'espelho-actions';
  const completed = new Set(Array.isArray(user.completedLessons) ? user.completedLessons : []);
  LESSONS.forEach((lesson) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-refresh';
    const on = completed.has(lesson.id);
    btn.textContent = `${on ? '✓' : '○'} ${lessonChipLabel(lesson)}`;
    btn.title = lessonHeading(lesson.id, LESSONS);
    btn.addEventListener('click', async () => {
      const next = !on;
      if (!window.confirm(`${next ? 'Marcar' : 'Desmarcar'} ${lessonHeading(lesson.id, LESSONS)}?`)) return;
      await runEspelhoMutation('aula', () => adminSetLessonCompleted(currentToken, user.id, lesson.id, next));
    });
    lessonsWrap.appendChild(btn);
  });
  progSec.appendChild(row('Aulas concluídas (clique para alternar):'));
  progSec.appendChild(lessonsWrap);
  progSec.appendChild(row(`Vistas: ${Array.isArray(user.viewedLessons) ? user.viewedLessons.length : 0}`));
  body.appendChild(progSec);

  // Conquistas
  const achSec = section('Conquistas');
  const achList = document.createElement('div');
  achList.className = 'espelho-achievements';
  (Array.isArray(ACHIEVEMENTS) ? ACHIEVEMENTS : []).forEach((entry) => {
    const id = entry?.id;
    if (!id) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    const has = owned.has(id);
    btn.classList.toggle('is-owned', has);
    const rarity = getAchievementRarity(id);
    const rarityLabel = ACHIEVEMENT_RARITY_LABELS?.[rarity] || rarity;
    const meta = getAchievementById(id);
    btn.textContent = `${has ? '◆' : '◇'} ${meta?.name || id} (${rarityLabel})`;
    btn.title = id;
    btn.addEventListener('click', async () => {
      if (has) {
        if (!window.confirm(`Revogar ${meta?.name || id}? O XP da conquista será debitado.`)) return;
        await runEspelhoMutation('conquista', () => adminRevokeAchievement(currentToken, user.id, id));
      } else {
        if (!window.confirm(`Conceder ${meta?.name || id}?`)) return;
        await runEspelhoMutation('conquista', () => adminGrantAchievement(currentToken, user.id, id));
      }
    });
    achList.appendChild(btn);
  });
  achSec.appendChild(achList);
  body.appendChild(achSec);

  // Atividades / Vigília / Despertar
  const trailSec = section('Trilha · Vigília · Despertar');
  const chips = document.createElement('div');
  chips.className = 'espelho-actions';
  LESSONS.forEach((lesson) => {
    const chip = document.createElement('span');
    chip.className = `trail-chip ${activityIds.includes(lesson.id) ? 'is-sent' : 'is-missing'}`;
    chip.textContent = `${lessonChipLabel(lesson)} · ${activityIds.includes(lesson.id) ? 'Enviou' : 'Ausente'}`;
    chips.appendChild(chip);
  });
  trailSec.appendChild(chips);
  const openActivities = document.createElement('button');
  openActivities.type = 'button';
  openActivities.className = 'btn-refresh';
  openActivities.textContent = 'Abrir aba Atividades';
  openActivities.addEventListener('click', () => {
    selectedActivityUsername = username;
    setActiveTab('activities');
    restoreActivityDetail();
  });
  trailSec.appendChild(openActivities);
  trailSec.appendChild(row(
    notesCount
      ? `${notesCount} inscrição(ões) sob Vigília`
      : 'Nenhuma inscrição sob Vigília',
  ));
  if (notesCount) {
    const openVigilia = document.createElement('button');
    openVigilia.type = 'button';
    openVigilia.className = 'btn-refresh';
    openVigilia.textContent = 'Abrir Vigília';
    openVigilia.addEventListener('click', () => {
      setActiveTab('grimorios');
      const owner = vigiliaOwners.find((o) => Number(o.userId) === Number(user.id));
      if (owner) openOwnerGrimorio(owner);
    });
    trailSec.appendChild(openVigilia);
  }
  trailSec.appendChild(row(
    user.hasDespertarState
      ? 'Há Estela de O Despertar gravada'
      : 'Sem Estela de O Despertar',
  ));
  body.appendChild(trailSec);

  // Segurança
  const secSec = section('Segurança');
  secSec.appendChild(row('Aluno sem e-mail ou Mensageiro fora do ar → Emitir Código de Recuperação.'));
  const wipeSessions = document.createElement('button');
  wipeSessions.type = 'button';
  wipeSessions.className = 'btn-refresh';
  wipeSessions.textContent = 'Invalidar sessões';
  wipeSessions.addEventListener('click', async () => {
    if (!window.confirm(`Encerrar todas as sessões de @${username}?`)) return;
    const result = await runEspelhoMutation('sessões', () => adminInvalidateSessions(currentToken, user.id));
    if (result?.ok !== false && result) {
      showApiWarning(`Sessões de @${username} encerradas.`);
    }
  });
  const issueCode = document.createElement('button');
  issueCode.type = 'button';
  issueCode.className = 'btn-refresh';
  issueCode.textContent = 'Emitir Código de Recuperação';
  issueCode.addEventListener('click', async () => {
    if (!window.confirm(
      `Emitir Código de Recuperação da Alma para @${username}?\n\n`
      + 'Vale 24h, uso único. Mostre só na sala — não reaparece.',
    )) return;
    const result = await runEspelhoMutation('código', () => adminIssueSoulRecoveryCode(currentToken, user.id));
    if (result?.code) {
      const expiresLabel = result.expiresAt
        ? new Date(result.expiresAt).toLocaleString('pt-BR')
        : '24h';
      window.prompt(
        `Código de Recuperação · @${username} (expira ${expiresLabel})\n`
        + 'Aluno usa em A Palavra se perdeu? → O Mestre me deu um código.',
        result.code,
      );
    }
  });
  const tempPass = document.createElement('button');
  tempPass.type = 'button';
  tempPass.className = 'btn-refresh';
  tempPass.textContent = 'Palavra temporária';
  tempPass.addEventListener('click', async () => {
    if (!window.confirm(`Gerar Palavra temporária (pronta) para @${username}? Sessões atuais caem.`)) return;
    const result = await runEspelhoMutation('senha', () => adminForceTempPassword(currentToken, user.id));
    if (result?.tempPassword) {
      window.prompt('Palavra temporária (copie agora — não aparece de novo):', result.tempPassword);
    }
  });
  const secActions = document.createElement('div');
  secActions.className = 'espelho-actions';
  secActions.append(wipeSessions, issueCode, tempPass);
  secSec.appendChild(secActions);
  body.appendChild(secSec);

  if (!options.skipHistory) writeReportQuery({ tab: 'users', u: username });
}

function restoreSoulEspelho() {
  const username = selectedEspelhoUsername || usernameFromLocation();
  if (!username || currentTab !== 'users') return;
  const user = findStudentByUsername(username, allStudents);
  if (user) openSoulEspelho(user, { skipHistory: true });
  else closeSoulEspelho({ skipHistory: true });
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

  let handle = '';
  if (tabName === 'activities') handle = selectedActivityUsername;
  if (tabName === 'users') handle = selectedEspelhoUsername || usernameFromLocation();
  writeReportQuery({ tab: tabName, u: handle });

  if (tabName === 'activities') restoreActivityDetail();
  if (tabName === 'users') restoreSoulEspelho();
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
    empty.textContent = vigiliaOwners.length
      ? 'Nenhum grimório neste véu.'
      : 'Nenhum grimório sob Vigília.';
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
    host.innerHTML = '<p class="loading">Consultando a Vigília…</p>';
  }

  try {
    const payload = await listNotesAdmin(currentToken);
    vigiliaOwners = payload.owners || [];
    applyReportFilters({ skipHistory: true });
  } catch (error) {
    vigiliaOwners = [];
    if (host) {
      host.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = error instanceof ApiError
        ? error.message
        : 'Falha ao consultar grimórios sob Vigília.';
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
  const drawer = document.getElementById('report-filters-drawer');
  if (!bar) return;

  bar.hidden = false;
  if (drawer) drawer.hidden = false;

  const isUsers = currentTab === 'users';
  const isVigilia = currentTab === 'grimorios';

  bar.querySelectorAll('[data-users-only]').forEach((node) => {
    node.hidden = !isUsers;
  });
  bar.querySelectorAll('[data-hide-on-vigilia]').forEach((node) => {
    node.hidden = isVigilia;
  });

  const facetsRow = bar.querySelector('[data-facet-row]');
  if (facetsRow) {
    // Vigília: só busca + turma (linha primária).
    facetsRow.hidden = isVigilia;
  }

  const qInput = document.getElementById('filter-q');
  const qLabel = document.getElementById('filter-q-label');
  if (qInput) {
    qInput.placeholder = isVigilia
      ? 'Título, tag ou @dono…'
      : 'Buscar alma…';
  }
  if (qLabel) {
    qLabel.textContent = isVigilia ? 'Buscar na Vigília' : 'Buscar';
  }

  const csvAlunos = document.getElementById('btn-csv-alunos');
  const csvAtividades = document.getElementById('btn-csv-atividades');
  if (csvAlunos) csvAlunos.hidden = currentTab !== 'users';
  if (csvAtividades) csvAtividades.hidden = currentTab !== 'activities';
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

/** Facetas escondidas na aba atual não entram no match (evita “bleed” confuso). */
function filtersForCurrentTab() {
  const base = { ...reportFilters };
  if (currentTab === 'activities') {
    return {
      ...base,
      completed: [],
      viewed: [],
      noActivity: false,
    };
  }
  if (currentTab === 'grimorios') {
    return {
      ...emptyReportFilters(),
      q: base.q,
      turmas: [...(base.turmas || [])],
    };
  }
  return base;
}

function applyReportFilters(options = {}) {
  const rarityOf = getAchievementRarity;
  const effective = filtersForCurrentTab();

  filteredStudentsCache = allStudents.filter((user) => matchesSoulFilters(user, effective, {
    scope: 'users',
    rarityOf,
    activityLessonIds: lessonIdsForUser(user),
  }));
  filteredActivityOwnersCache = activityOwners.filter((owner) => matchesSoulFilters(owner, effective, {
    scope: 'activities',
    rarityOf,
    activityLessonIds: activityLessonIds(owner.activities),
  }));
  const filteredVigilia = vigiliaOwners.filter((owner) => matchesVigiliaOwner(owner, effective));

  renderUsers(filteredStudentsCache, {
    emptyCopy: allStudents.length
      ? 'Nenhuma alma neste véu.'
      : 'Nenhuma alma atravessou o Domínio ainda.',
  });
  renderActivityOwners(filteredActivityOwnersCache, { sourceCount: activityOwners.length });
  renderVigiliaOwners(filteredVigilia);

  let count = filteredStudentsCache.length;
  if (currentTab === 'activities') count = filteredActivityOwnersCache.length;
  if (currentTab === 'grimorios') count = filteredVigilia.length;

  const countEl = document.getElementById('filter-count');
  if (countEl) {
    countEl.textContent = currentTab === 'grimorios'
      ? `${count} grimórios neste véu`
      : `${count} almas neste véu`;
  }

  if (selectedActivityUsername && !findActivityOwner(selectedActivityUsername, filteredActivityOwnersCache)) {
    closeActivityDetail({ skipHistory: true });
  }

  if (selectedOwnerId && !filteredVigilia.some((o) => Number(o.userId) === Number(selectedOwnerId))) {
    closeVigiliaDetail();
  }

  if (!options.skipHistory) writeReportQuery();
}

function downloadCsv(filename, rows) {
  const blob = new Blob([csvWithBom(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportAlunosCsv() {
  const rows = buildAlunosCsvRows(filteredStudentsCache, {
    rarityOf: getAchievementRarity,
    activityCountOf: (user) => lessonIdsForUser(user).length,
  });
  downloadCsv('almas-veu.csv', rows);
}

function exportAtividadesCsv() {
  const rows = buildAtividadesCsvRows(filteredActivityOwnersCache, LESSONS, {
    rarityOf: getAchievementRarity,
  });
  downloadCsv('atividades-veu.csv', rows);
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

async function handleLogout() {
  await logout();
  window.location.href = ROUTES.auth();
}

async function loadSouls() {
  const grid = document.getElementById('souls-grid');
  const ownersHost = document.getElementById('activity-owners');
  if (grid) {
    grid.innerHTML = '<p class="loading">Consultando o Submundo…</p>';
  }
  if (ownersHost) {
    ownersHost.innerHTML = '<p class="loading">Consultando oferendas da Trilha…</p>';
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
  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'souls',
    role: 'admin',
    onLogout: handleLogout,
    token: currentToken,
  });

  await avatarCountReady;
  reportFilters = parseReportFilters(window.location.search);
  currentTab = tabFromLocation();
  mountFilterBar();

  // Desktop: drawer sempre aberto; mobile começa fechado (summary visível).
  const drawer = document.getElementById('report-filters-drawer');
  if (drawer && window.matchMedia('(min-width: 901px)').matches) {
    drawer.open = true;
  }

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

  document.getElementById('btn-csv-alunos')?.addEventListener('click', () => exportAlunosCsv());
  document.getElementById('btn-csv-atividades')?.addEventListener('click', () => exportAtividadesCsv());

  document.getElementById('tab-users')?.addEventListener('click', () => setActiveTab('users'));
  document.getElementById('tab-activities')?.addEventListener('click', () => setActiveTab('activities'));
  document.getElementById('tab-grimorios')?.addEventListener('click', () => setActiveTab('grimorios'));
  document.getElementById('vigilia-detail-close')?.addEventListener('click', () => closeVigiliaDetail());
  document.getElementById('activity-detail-close')?.addEventListener('click', () => closeActivityDetail());

  if (!espelhoBound) {
    document.getElementById('espelho-close')?.addEventListener('click', () => closeSoulEspelho());
    espelhoBound = true;
  }
}

document.addEventListener('DOMContentLoaded', init);
