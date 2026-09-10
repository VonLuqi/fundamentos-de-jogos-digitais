/**
 * ============================================================
 * SALÃO DOS HERÓIS — Painel do Aluno (consumindo /api/progress)
 * ============================================================
 * O estado de verdade vive no BACKEND. Este arquivo:
 *   1. Exige sessão ativa (senão redireciona ao Pacto de Sangue).
 *   2. Renderiza o perfil dinamicamente com os dados da API.
 *   3. Implementa a "Oferenda ao Estige" (resgate de código) com
 *      Game Feel: flash de tela, overlay de Level Up, barra de XP
 *      preenchendo com transição CSS e Screen Shake no erro.
 *   4. Adapta a interface para `role: "admin"` (coroa, aura e
 *      botão dourado "Gerar Códigos de Acesso").
 * ============================================================
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  getAchievementCollectionStats,
  renderAchievementsList,
  setRainbowVfxSuspended,
} from './achievements-ui.js';
import { isLessonPublished, renderLessonsList } from './lessons-ui.js';

import {
  detectAvatarCount,
  getAvatarCount,
  getAvatarCatalog,
  getAvatarFilterTagDefinitions,
  getAvatarMetaByIndex,
  getAvatarParentTagId,
  getAvatarPrimaryTagDefinitions,
  getAvatarSubTagDefinitions,
  isAvatarFilterAllTag,
  avatarSafeIndex,
  loadAvatarImage,
  ACHIEVEMENTS,
  LESSONS,
  ROUTES,
  ApiError,
  requireSession,
  redeemCode,
  generateCode,
  setAvatar,
  listCodes,
  logout,
  getSession,
  describeLevelProgress,
  fetchLessonsPublishMap,
  fetchFeatureUnlockMap,
  setFeatureGate,
  ARCANE_SURVIVORS_FEATURE_ID,
  FEATURE_UNLOCKED_GATE_KEY,
  normalizeAchievementRarity,
  listFriends,
  listClassmates,
  listNotes,
} from './api.js';

/* ---------- Estado local de apresentação (espelho do servidor) ---------- */
let currentUser = null;
let currentToken = null;
let publishMap = {};
let featureUnlockMap = { [ARCANE_SURVIVORS_FEATURE_ID]: false };
let shellApi = null;

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/* ============================================================
   1. RENDERIZAÇÃO DO PERFIL
   ============================================================ */
function renderProfile(user) {
  const isAdmin = user.role === 'admin';
  const collection = getAchievementCollectionStats(user);
  const username = user.username || user.name || '—';
  const fullName = user.fullName || user.name || username;

  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) usernameEl.textContent = `@${username}`;
  document.getElementById('profile-name').textContent = fullName;
  const progress = describeLevelProgress(user.xp, { isAdmin });
  document.getElementById('profile-rank').textContent = progress.rank;
  document.getElementById('level-value').textContent = progress.levelLabel;
  const avatarImg = document.getElementById('avatar-glyph');
  if (avatarImg) loadAvatarImage(avatarImg, user.avatarIndex);
  updateAvatarCounter(user.avatarIndex);
  document.getElementById('stat-lessons').textContent = String(isAdmin ? LESSONS.length : user.completedLessons.length);
  document.getElementById('stat-achievements').textContent =
    `${collection.unlocked} / ${collection.total}`;

  applyAdminSkin(user);
}

/**
 * Atualiza o indicador textual "Avatar X de N" abaixo da moldura,
 * mantendo o jogador ciente de qual avatar está selecionado dentro
 * da sequência progressiva (1-based para leitura humana).
 */
function updateAvatarCounter(avatarIndex) {
  const counter = document.getElementById('avatar-counter');
  if (!counter) return;
  const safeIndex = avatarSafeIndex(avatarIndex);
  const avatarMeta = getAvatarMetaByIndex(safeIndex);
  const name = avatarMeta?.label || `Avatar ${safeIndex + 1}`;
  counter.textContent = `Avatar ${safeIndex + 1} de ${getAvatarCount()} - ${name}`;
}

/**
 * PAINEL DO ADMIN — a interface se adapta ao papel do usuário.
 * A classe `is-admin` no painel ativa, via CSS: coroa sobre o avatar,
 * aura vermelha pulsante na moldura e borda diferenciada.
 * Ferramentas do Mestre ficam na mini-barra `#master-tools` (topo).
 */
function applyAdminSkin(user) {
  const isAdmin = user.role === 'admin';
  const panel = document.getElementById('profile-panel');
  const badge = document.getElementById('master-badge');
  const tools = document.getElementById('master-tools');

  panel?.classList.toggle('is-admin', isAdmin);
  if (badge) badge.hidden = !isAdmin;
  if (tools) {
    tools.hidden = !isAdmin;
    tools.setAttribute('aria-hidden', String(!isAdmin));
  }
}

/**
 * Previews do trilho esquerdo (Salão + Grimório).
 * Contagem da turma completa chega na Task 4 (`classmatesList`).
 */
async function renderRailPreviews(token) {
  const summaryEl = document.getElementById('salao-preview-summary');
  const companionsEl = document.getElementById('salao-preview-companions');
  const turmaEl = document.getElementById('salao-preview-turma');
  const invitesWrap = document.getElementById('salao-preview-invites-wrap');
  const invitesEl = document.getElementById('salao-preview-invites');
  const grimorioSummary = document.getElementById('grimorio-preview-summary');

  if (turmaEl) {
    const turma = currentUser?.turma;
    turmaEl.textContent = turma ? String(turma) : 'Ver no Salão';
  }

  if (grimorioSummary) {
    grimorioSummary.textContent = 'O Grimório espera a primeira inscrição.';
  }

  if (!token) {
    if (summaryEl) summaryEl.textContent = 'Os laços estão inacessíveis no momento.';
    return;
  }

  try {
    const [friendsPayload, classmatesPayload, notesPayload] = await Promise.all([
      listFriends(token),
      listClassmates(token).catch(() => ({ count: null, classmates: [] })),
      listNotes(token).catch(() => ({ notes: [], count: 0 })),
    ]);

    const { accepted = [], incoming = [], outgoing = [] } = friendsPayload;
    const acceptedCount = accepted.length;
    const incomingCount = incoming.length;
    const classmateCount = Number.isFinite(classmatesPayload?.count)
      ? classmatesPayload.count
      : (classmatesPayload?.classmates?.length ?? null);

    if (turmaEl && classmateCount != null) {
      const label = classmateCount === 1 ? '1 aluno' : `${classmateCount} alunos`;
      if (currentUser?.role === 'admin') {
        const turmaCode = classmatesPayload?.turma
          ? String(classmatesPayload.turma)
          : null;
        turmaEl.textContent = turmaCode ? `${turmaCode} · ${label}` : `Todas · ${label}`;
      } else {
        const turmaCode = currentUser?.turma ? String(currentUser.turma) : null;
        turmaEl.textContent = turmaCode ? `${turmaCode} · ${label}` : label;
      }
    }

    if (companionsEl) companionsEl.textContent = `${acceptedCount} / 25`;

    if (invitesWrap && invitesEl) {
      if (incomingCount > 0) {
        invitesWrap.hidden = false;
        invitesEl.textContent = String(incomingCount);
      } else {
        invitesWrap.hidden = true;
      }
    }

    if (summaryEl) {
      if (incomingCount > 0) {
        summaryEl.textContent =
          incomingCount === 1
            ? '1 convite aguarda sua resposta.'
            : `${incomingCount} convites aguardam sua resposta.`;
      } else if (acceptedCount === 0 && outgoing.length === 0) {
        summaryEl.textContent = 'Nenhum companheiro ao seu lado… ainda.';
      } else {
        summaryEl.textContent = 'Turma e companheiros no Salão Espiritual.';
      }
    }

    if (grimorioSummary) {
      const notes = notesPayload.notes || [];
      const count = notesPayload.count ?? notes.length;
      if (count === 0) {
        grimorioSummary.textContent = 'O Grimório espera a primeira inscrição.';
      } else if (notesPayload.softWarning) {
        grimorioSummary.textContent = notesPayload.softWarningMessage
          || `O Grimório engrossa… (${count} inscrições).`;
      } else {
        grimorioSummary.textContent = count === 1
          ? '1 inscrição no Grimório.'
          : `${count} inscrições no Grimório.`;
      }

      const previewHost = document.getElementById('grimorio-preview');
      let list = document.getElementById('grimorio-preview-list');
      if (previewHost && !list) {
        list = document.createElement('ul');
        list.id = 'grimorio-preview-list';
        list.className = 'grimorio-preview-list';
        list.setAttribute('aria-label', 'Inscrições recentes');
        previewHost.appendChild(list);
      }
      if (list) {
        list.replaceChildren();
        notes
          .slice()
          .sort((a, b) => Number(b.pinned) - Number(a.pinned))
          .slice(0, 3)
          .forEach((note) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `./grimorio-nota.html?id=${encodeURIComponent(note.id)}`;
            a.textContent = note.pinned ? `◆ ${note.title}` : note.title;
            li.appendChild(a);
            list.appendChild(li);
          });
      }
    }
  } catch {
    if (summaryEl) summaryEl.textContent = 'Os laços estão inacessíveis no momento.';
    if (companionsEl) companionsEl.textContent = '— / 25';
  }
}

/* ============================================================
   2. BARRA DE XP "JUICY"
   ============================================================
   `animate = true` força o preenchimento a partir de 0, criando a
   sensação de progresso conquistado. Ao carregar a página usamos
   animação; após um resgate, animamos do valor antigo para o novo.
   ============================================================ */
function renderXpBar(user, { fromZero = false, surge = false } = {}) {
  const fillEl = document.getElementById('xp-fill');
  const textEl = document.getElementById('xp-text');
  const barEl = fillEl?.closest('.xp-bar');
  if (!fillEl || !textEl || !barEl) return;

  const progress = describeLevelProgress(user.xp, { isAdmin: user.role === 'admin' });
  const targetPercent = progress.barPercent;

  textEl.textContent = progress.barLabel;
  barEl.setAttribute(
    'aria-valuenow',
    String(progress.atMax ? (progress.quota || 100) : (progress.within || 0))
  );
  barEl.setAttribute('aria-valuemax', String(progress.quota || 100));
  barEl.style.setProperty('--xp-pct', String(Math.round(targetPercent)));
  if (progress.atMax) barEl.dataset.max = 'true';
  else delete barEl.dataset.max;

  if (fromZero) {
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';
    barEl.style.setProperty('--xp-pct', '0');
    void fillEl.offsetHeight;
    fillEl.style.transition = '';
  }

  window.setTimeout(() => {
    fillEl.style.width = `${targetPercent}%`;
    barEl.style.setProperty('--xp-pct', String(Math.round(targetPercent)));
  }, 180);

  if (surge) {
    barEl.classList.remove('is-surging');
    void barEl.offsetHeight;
    barEl.classList.add('is-surging');
    window.clearTimeout(barEl._surgeTimer);
    barEl._surgeTimer = window.setTimeout(() => {
      barEl.classList.remove('is-surging');
    }, 1200);
  }
}

/* ============================================================
   3. PREVIEWS DO HUB (álbum + trilha)
   ============================================================ */
const ACHIEVEMENT_PREVIEW_LIMIT = 5;

/** Ordem decrescente: arco-íris → ouro → prata → cobre → pedra. */
const RARITY_RANK = Object.freeze({
  unique: 6,
  rainbow: 5,
  gold: 4,
  silver: 3,
  copper: 2,
  stone: 1,
});

function rarityRankFor(achievement) {
  const rarity = normalizeAchievementRarity(achievement?.rarity, achievement?.difficulty);
  return RARITY_RANK[rarity] || 0;
}

function pickAchievementPreview(user, highlightIds = []) {
  const unlockedIds = new Set(user?.achievements || []);
  const unlocked = user?.role === 'admin'
    ? [...ACHIEVEMENTS]
    : ACHIEVEMENTS.filter((achievement) => unlockedIds.has(achievement.id));

  const highlightSet = new Set(highlightIds);

  return unlocked
    .sort((a, b) => {
      const rarityDiff = rarityRankFor(b) - rarityRankFor(a);
      if (rarityDiff !== 0) return rarityDiff;
      // Empate de raridade: recém-desbloqueadas primeiro.
      const aHot = highlightSet.has(a.id) ? 1 : 0;
      const bHot = highlightSet.has(b.id) ? 1 : 0;
      return bHot - aHot;
    })
    .slice(0, ACHIEVEMENT_PREVIEW_LIMIT);
}

function pickLessonPreview(user) {
  const completed = new Set(user?.completedLessons || []);
  const published = LESSONS.filter((lesson) => isLessonPublished(lesson.id, publishMap));

  const nextOpen = published.find((lesson) => !completed.has(lesson.id));
  if (nextOpen) return [nextOpen];

  const lastCompleted = [...LESSONS].reverse().find((lesson) => completed.has(lesson.id));
  if (lastCompleted) return [lastCompleted];

  if (published.length > 0) return [published[0]];
  return LESSONS.slice(0, 1);
}

function renderAchievements(user, highlightIds = []) {
  const summary = document.getElementById('achievements-summary');
  const grid = document.getElementById('achievements-preview');
  if (!grid) return;

  const collection = getAchievementCollectionStats(user);
  if (summary) {
    summary.textContent = `${collection.unlocked} / ${collection.total} relíquias no álbum`;
  }

  const preview = pickAchievementPreview(user, highlightIds);
  renderAchievementsList(grid, user, {
    highlightIds,
    mode: 'cards',
    achievements: preview,
    emptyMessage: 'Nenhuma relíquia descoberta ainda — explore a Trilha e o Altar.',
  });
}

function renderLessons(user) {
  const summary = document.getElementById('lessons-summary');
  const list = document.getElementById('lessons-preview');
  if (!list) return;

  const completed = Array.isArray(user?.completedLessons) ? user.completedLessons.length : 0;
  const publishedCount = LESSONS.filter((lesson) => isLessonPublished(lesson.id, publishMap)).length;
  if (summary) {
    summary.textContent = user?.role === 'admin'
      ? `${publishedCount} de ${LESSONS.length} aulas liberadas para a turma`
      : `${completed} concluída(s) · ${publishedCount} liberada(s) de ${LESSONS.length}`;
  }

  renderLessonsList(list, user, {
    lessons: pickLessonPreview(user),
    publishMap,
  });
}

/* ============================================================
   5. GAME FEEL — Efeitos de tela
   ============================================================ */
/** Flash dourado sutil cobrindo a tela: recompensa o acerto. */
function flashScreen() {
  const flash = document.getElementById('screen-flash');
  if (!flash) return;
  flash.classList.remove('is-active');
  void flash.offsetHeight;
  flash.classList.add('is-active');
  flash.addEventListener('animationend', () => flash.classList.remove('is-active'), { once: true });
}

/** Overlay de "Level Up" / recompensa concedida. */
function showLevelUpOverlay(title, detail) {
  const overlay = document.getElementById('levelup-overlay');
  const titleEl = document.getElementById('levelup-title');
  const detailEl = document.getElementById('levelup-detail');
  if (!overlay || !titleEl || !detailEl) return;

  titleEl.textContent = title;
  detailEl.textContent = detail;

  overlay.classList.remove('is-active');
  void overlay.offsetHeight;
  overlay.classList.add('is-active');

  window.setTimeout(() => overlay.classList.remove('is-active'), 2600);
}

/** Screen Shake no altar: comunica rejeição sem precisar ler o texto. */
function shakeAltar() {
  const slot = document.getElementById('altar-slot');
  if (!slot) return;
  slot.classList.remove('is-shaking');
  void slot.offsetHeight;
  slot.classList.add('is-shaking');
  slot.addEventListener('animationend', () => slot.classList.remove('is-shaking'), { once: true });
}

function setAltarFeedback(message, kind = 'info') {
  const el = document.getElementById('altar-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = `altar__feedback is-${kind}`;
}

/* ============================================================
   6. OFERENDA AO ESTIGE (resgate de código via API)
   ============================================================ */
function initAltar() {
  const form = document.getElementById('altar-form');
  const input = document.getElementById('altar-input');
  const button = document.getElementById('btn-offer');
  if (!form || !input || !button) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = input.value.trim();

    if (!code) {
      setAltarFeedback('A ranhura do altar está vazia.', 'error');
      shakeAltar();
      return;
    }

    const label = button.querySelector('.btn-offer__label');
    const originalLabel = label.textContent;
    button.disabled = true;
    label.textContent = 'Oferendando...';
    setAltarFeedback('O Estige avalia sua oferenda...', 'info');

    try {
      const result = await redeemCode(currentToken, code);
      currentUser = result.user;

      // === JUICE EM CADEIA: flash → overlay → barra de XP enchendo ===
      flashScreen();

      const achievementNames = result.awarded.achievements
        .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name)
        .filter(Boolean);

      const detailParts = [`+${result.awarded.xp} XP`];
      if (achievementNames.length > 0) {
        detailParts.push(`Conquista: ${achievementNames.join(', ')}`);
      }
      if (result.leveledUp) {
        const after = describeLevelProgress(currentUser.xp, {
          isAdmin: currentUser.role === 'admin',
        });
        detailParts.push(`Nível ${after.levelLabel}`);
      }

      showLevelUpOverlay(
        result.leveledUp ? 'LEVEL UP!' : 'Oferenda Aceita',
        `${result.awarded.lesson} — ${detailParts.join(' • ')}`
      );

      renderProfile(currentUser);
      renderXpBar(currentUser, { surge: true });
      renderAchievements(currentUser, result.awarded.achievements);
      renderLessons(currentUser);

      const albumHint = result.awarded.achievements.length > 0
        ? ' · Nova figurinha no Álbum de Relíquias.'
        : '';
      setAltarFeedback(`Oferenda aceita: ${detailParts.join(' • ')}${albumHint}`, 'success');
      input.value = '';
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao contatar o Domínio.';
      setAltarFeedback(message, 'error');
      shakeAltar();
    } finally {
      button.disabled = false;
      label.textContent = originalLabel;
    }
  });
}

/* ============================================================
   7. TROCA DE AVATAR (persistida na API)
   ============================================================ */
function initAvatarSwap() {
  const frame = document.getElementById('avatar-frame');
  if (!frame) return;

  function buildAvatarPickerContent() {
    const wrapper = document.createElement('div');
    wrapper.className = 'avatar-picker';

    const head = document.createElement('div');
    head.className = 'avatar-picker__head';

    const tagsGroup = document.createElement('div');
    tagsGroup.className = 'avatar-picker__tags';
    tagsGroup.setAttribute('role', 'group');
    tagsGroup.setAttribute('aria-label', 'Filtrar por categoria');

    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'avatar-picker__tag avatar-picker__tag--more';
    moreBtn.textContent = '+';
    moreBtn.setAttribute('aria-haspopup', 'dialog');
    moreBtn.setAttribute('aria-expanded', 'false');
    moreBtn.setAttribute('aria-controls', 'avatar-picker-more-modal');
    moreBtn.setAttribute('aria-label', 'Abrir tags específicas');

    const moreModal = document.createElement('div');
    moreModal.id = 'avatar-picker-more-modal';
    moreModal.className = 'avatar-picker__more-modal';
    moreModal.hidden = true;
    moreModal.setAttribute('role', 'dialog');
    moreModal.setAttribute('aria-modal', 'true');
    moreModal.setAttribute('aria-labelledby', 'avatar-picker-more-title');

    const moreDialog = document.createElement('div');
    moreDialog.className = 'avatar-picker__more-dialog';

    const moreTitle = document.createElement('h3');
    moreTitle.id = 'avatar-picker-more-title';
    moreTitle.className = 'avatar-picker__more-title';
    moreTitle.textContent = 'Tags específicas';

    const moreHint = document.createElement('p');
    moreHint.className = 'avatar-picker__more-hint';
    moreHint.textContent = 'Filtros menores e mais precisos.';

    const moreBody = document.createElement('div');
    moreBody.className = 'avatar-picker__more-body';

    const moreClose = document.createElement('button');
    moreClose.type = 'button';
    moreClose.className = 'btn-gold btn-gold--ghost avatar-picker__more-close';
    moreClose.textContent = 'Fechar';

    moreDialog.append(moreTitle, moreHint, moreBody, moreClose);
    moreModal.appendChild(moreDialog);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'avatar-picker__search';

    const searchLabel = document.createElement('label');
    searchLabel.className = 'avatar-picker__search-label';
    searchLabel.htmlFor = 'avatar-picker-search';
    searchLabel.textContent = 'Buscar avatar';

    const searchInput = document.createElement('input');
    searchInput.id = 'avatar-picker-search';
    searchInput.className = 'avatar-picker__search-input';
    searchInput.type = 'search';
    searchInput.placeholder = 'Ex.: Kratos';
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = false;

    searchWrap.append(searchLabel, searchInput);

    const grid = document.createElement('div');
    grid.className = 'avatar-picker-grid';

    const empty = document.createElement('p');
    empty.className = 'avatar-picker__empty';
    empty.textContent = 'Nenhum avatar encontrado para esse filtro.';
    empty.hidden = true;

    const meta = document.createElement('p');
    meta.className = 'avatar-picker__meta';

    const status = document.createElement('p');
    status.className = 'avatar-picker__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Carregando galeria...';

    const actions = document.createElement('div');
    actions.className = 'avatar-picker__actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-gold btn-gold--ghost';
    cancelBtn.textContent = 'Cancelar';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn-gold avatar-picker__confirm';
    confirmBtn.textContent = 'Confirmar Avatar';

    actions.append(cancelBtn, confirmBtn);

    const avatars = getAvatarCatalog().map((avatar, index) => ({
      ...avatar,
      index,
      tags: Array.isArray(avatar.tags) ? avatar.tags : [],
      searchableText: normalizeSearchText([
        avatar.label,
        ...(avatar.searchTerms || []),
        `avatar ${index + 1}`,
        String(index + 1),
      ].join(' ')),
    }));

    const tagCounts = new Map();
    avatars.forEach((avatar) => {
      avatar.tags.forEach((tagId) => {
        tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
      });
    });

    const filterTags = getAvatarFilterTagDefinitions().filter((tag) => (
      isAvatarFilterAllTag(tag.id) || (tagCounts.get(tag.id) || 0) > 0
    ));

    const visibleSubTags = getAvatarSubTagDefinitions()
      .filter((tag) => (tagCounts.get(tag.id) || 0) > 0);

    const selectedIndex = avatarSafeIndex(currentUser?.avatarIndex ?? 0);
    let pendingIndex = selectedIndex;
    let activeTagId = 'todos';
    const allButtons = [];
    const primaryTagButtons = [];
    let subTagButtons = [];
    let loadedOk = 0;
    let loadFailed = 0;

    function currentTagButtons() {
      return [...primaryTagButtons, ...subTagButtons];
    }

    function setBusy(busy) {
      allButtons.forEach((button) => {
        button.disabled = busy;
      });
      currentTagButtons().forEach((button) => {
        button.disabled = busy;
      });
      moreBtn.disabled = busy;
      moreClose.disabled = busy;
      searchInput.disabled = busy;
      confirmBtn.disabled = busy;
      cancelBtn.disabled = busy;
    }

    function isMoreModalOpen() {
      return !moreModal.hidden;
    }

    function closeMoreModal() {
      if (moreModal.hidden) return;
      moreModal.hidden = true;
      moreBtn.setAttribute('aria-expanded', 'false');
      moreBtn.focus();
    }

    function rebuildMoreModalBody() {
      moreBody.innerHTML = '';
      subTagButtons = [];

      if (visibleSubTags.length === 0) {
        const emptyMore = document.createElement('p');
        emptyMore.className = 'avatar-picker__more-empty';
        emptyMore.textContent = 'Nenhuma tag específica disponível.';
        moreBody.appendChild(emptyMore);
        return;
      }

      getAvatarPrimaryTagDefinitions().forEach((parent) => {
        const children = visibleSubTags.filter((tag) => tag.parent === parent.id);
        if (children.length === 0) return;

        const section = document.createElement('section');
        section.className = 'avatar-picker__more-section';

        const heading = document.createElement('h4');
        heading.className = 'avatar-picker__more-section-title';
        heading.textContent = parent.label;

        const chips = document.createElement('div');
        chips.className = 'avatar-picker__more-chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', `Tags de ${parent.label}`);

        children.forEach((tag) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'avatar-picker__tag avatar-picker__tag--sub';
          chip.dataset.tagId = tag.id;
          chip.textContent = tag.label;
          const pressed = activeTagId === tag.id;
          chip.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          if (pressed) chip.classList.add('is-active');

          chip.addEventListener('click', () => {
            if (chip.disabled) return;
            setActiveTag(tag.id);
            closeMoreModal();
          });

          subTagButtons.push(chip);
          chips.appendChild(chip);
        });

        section.append(heading, chips);
        moreBody.appendChild(section);
      });
    }

    function openMoreModal() {
      rebuildMoreModalBody();
      moreModal.hidden = false;
      moreBtn.setAttribute('aria-expanded', 'true');
      moreClose.focus();
    }

    function updateTagUi() {
      const parentOfActive = getAvatarParentTagId(activeTagId);
      const secondaryActive = Boolean(parentOfActive);

      primaryTagButtons.forEach((button) => {
        const pressed = button.dataset.tagId === activeTagId;
        const context = button.dataset.tagId === parentOfActive;
        button.classList.toggle('is-active', pressed);
        button.classList.toggle('is-context', context);
        button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      });

      moreBtn.classList.toggle('is-active', secondaryActive || isMoreModalOpen());
      moreBtn.setAttribute('aria-expanded', isMoreModalOpen() ? 'true' : 'false');

      if (isMoreModalOpen()) {
        rebuildMoreModalBody();
      }
    }

    function updateSelectionUi() {
      allButtons.forEach((button) => {
        const buttonIndex = Number(button.dataset.avatarIndex);
        button.classList.toggle('is-selected', buttonIndex === pendingIndex);
      });

      const selectedAvatar = avatars[pendingIndex];
      const selectedName = selectedAvatar?.label || `Avatar ${pendingIndex + 1}`;
      meta.textContent = `Selecionado: Avatar ${pendingIndex + 1} - ${selectedName}`;
      confirmBtn.disabled = pendingIndex === avatarSafeIndex(currentUser?.avatarIndex ?? 0);
    }

    function applyFilter() {
      const query = normalizeSearchText(searchInput.value);
      const filterByTag = !isAvatarFilterAllTag(activeTagId);
      const filterActive = query.length > 0 || filterByTag;
      let visibleCount = 0;

      allButtons.forEach((button) => {
        const searchableText = button.dataset.searchableText || '';
        const buttonTags = String(button.dataset.tags || '')
          .split(/\s+/)
          .filter(Boolean);
        const matchesQuery = query.length === 0 || searchableText.includes(query);
        const matchesTag = !filterByTag || buttonTags.includes(activeTagId);
        const visible = matchesQuery && matchesTag;
        button.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      empty.hidden = visibleCount > 0;

      // Meta/confirm usam pendingIndex — seleção sobrevive ao filtro mesmo se o card sumir.
      // Status ocioso sem contador: só filtro ativo, erro de imagem ou vazio.
      if (count > 0 && loadFailed + loadedOk === count) {
        if (filterActive) {
          status.textContent = visibleCount === 0
            ? 'Nenhum avatar encontrado para esse filtro.'
            : `${visibleCount} avatar${visibleCount === 1 ? '' : 'es'} encontrado${visibleCount === 1 ? '' : 's'}.`;
        } else if (loadFailed > 0) {
          status.textContent = `${loadFailed} avatar${loadFailed === 1 ? '' : 'es'} com falha de imagem.`;
        } else {
          status.textContent = '';
        }
      }
    }

    function setActiveTag(nextTagId) {
      const normalized = String(nextTagId || 'todos');
      if (normalized === activeTagId && !isAvatarFilterAllTag(normalized)) {
        activeTagId = 'todos';
      } else {
        activeTagId = normalized;
      }
      updateTagUi();
      applyFilter();
    }

    filterTags.forEach((tag) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'avatar-picker__tag';
      chip.dataset.tagId = tag.id;
      chip.textContent = tag.label;
      chip.setAttribute('aria-pressed', isAvatarFilterAllTag(tag.id) ? 'true' : 'false');
      if (isAvatarFilterAllTag(tag.id)) {
        chip.classList.add('is-active');
      }
      chip.addEventListener('click', () => {
        if (chip.disabled) return;
        setActiveTag(tag.id);
      });
      primaryTagButtons.push(chip);
      tagsGroup.appendChild(chip);
    });

    if (visibleSubTags.length > 0) {
      moreBtn.addEventListener('click', () => {
        if (moreBtn.disabled) return;
        if (isMoreModalOpen()) closeMoreModal();
        else openMoreModal();
      });
      tagsGroup.appendChild(moreBtn);
    }

    moreClose.addEventListener('click', closeMoreModal);
    moreModal.addEventListener('click', (event) => {
      if (event.target === moreModal) closeMoreModal();
    });

    head.appendChild(tagsGroup);

    const count = avatars.length;
    if (count === 0) {
      status.textContent = 'Galeria vazia. Adicione avatares para habilitar a seleção.';
      confirmBtn.disabled = true;
      searchInput.disabled = true;
      primaryTagButtons.forEach((button) => {
        button.disabled = true;
      });
      moreBtn.disabled = true;
    }

    avatars.forEach((avatar) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'avatar-picker__option';
      option.dataset.avatarIndex = String(avatar.index);
      option.dataset.searchableText = avatar.searchableText;
      option.dataset.tags = avatar.tags.join(' ');
      option.setAttribute('aria-label', `Selecionar ${avatar.label}`);

      const image = document.createElement('img');
      image.className = 'avatar-picker__image';
      image.alt = avatar.label;

      const label = document.createElement('span');
      label.className = 'avatar-picker__label';
      label.textContent = avatar.label;

      option.append(image, label);
      allButtons.push(option);

      loadAvatarImage(image, avatar.index)
        .then((ok) => {
          if (ok) loadedOk += 1;
          else loadFailed += 1;

          if (loadedOk + loadFailed === count) {
            if (loadedOk === 0) {
              status.textContent = 'Falha ao carregar os avatares agora.';
              confirmBtn.disabled = true;
            } else {
              applyFilter();
            }
          }
        });

      option.addEventListener('click', () => {
        if (option.disabled) return;
        pendingIndex = avatar.index;
        updateSelectionUi();
      });

      grid.appendChild(option);
    });

    searchInput.addEventListener('input', applyFilter);
    cancelBtn.addEventListener('click', () => {
      closeMoreModal();
      closeScrollModal();
    });

    confirmBtn.addEventListener('click', async () => {
      if (confirmBtn.disabled) {
        if (pendingIndex === avatarSafeIndex(currentUser?.avatarIndex ?? 0)) {
          closeMoreModal();
          closeScrollModal();
        }
        return;
      }

      setBusy(true);
      closeMoreModal();
      status.textContent = 'Salvando avatar...';

      frame.classList.remove('is-swapping');
      void frame.offsetHeight;
      frame.classList.add('is-swapping');

      try {
        const { user } = await setAvatar(currentToken, pendingIndex);
        currentUser = user;
        renderProfile(currentUser);
        closeScrollModal();
      } catch (error) {
        status.textContent = error instanceof ApiError
          ? error.message
          : 'Não foi possível trocar o avatar agora.';
        setBusy(false);
      }
    });

    updateTagUi();
    updateSelectionUi();
    applyFilter();

    const chrome = document.createElement('div');
    chrome.className = 'avatar-picker__chrome';
    chrome.append(head, searchWrap);

    const scrollRegion = document.createElement('div');
    scrollRegion.className = 'avatar-picker__scroll';
    scrollRegion.append(grid);

    const footer = document.createElement('div');
    footer.className = 'avatar-picker__footer';
    footer.append(empty, meta, status, actions);

    wrapper.append(chrome, scrollRegion, footer, moreModal);
    return { wrapper, focusElement: searchInput };
  }

  frame.addEventListener('click', () => {
    const picker = buildAvatarPickerContent();
    openScrollModal('Escolha seu Avatar', picker.wrapper, {
      closeLabel: 'Fechar galeria',
      focusElement: picker.focusElement,
      variant: 'avatar',
    });
  });
}

/* ============================================================
   8. MODAL "PERGAMINHO" (substitui o alert nativo)
   ============================================================ */
function openScrollModal(title, contentNode, options = {}) {
  const {
    closeLabel = 'Selar o Pergaminho',
    focusElement = null,
    variant = null,
  } = options;
  const modal = document.getElementById('scroll-modal');
  const titleEl = document.getElementById('scroll-modal-title');
  const bodyEl = document.getElementById('scroll-modal-body');
  const closeButton = document.getElementById('scroll-modal-close');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = '';
  bodyEl.appendChild(contentNode);

  modal.classList.toggle('scroll-modal--avatar', variant === 'avatar');

  if (closeButton) {
    closeButton.textContent = closeLabel;
    // No modo avatar, Cancelar/Confirmar cobrem o fechamento — evita 3 CTAs.
    closeButton.hidden = variant === 'avatar';
  }

  modal.hidden = false;
  modal.classList.add('is-open');
  // Canvas VFX arco-íris (mesmo com z-index baixo) some enquanto o pergaminho está aberto.
  setRainbowVfxSuspended(true, 'scroll-modal');
  if (focusElement && typeof focusElement.focus === 'function') {
    focusElement.focus();
  } else if (closeButton && !closeButton.hidden) {
    closeButton.focus();
  }
}

function closeScrollModal() {
  const modal = document.getElementById('scroll-modal');
  if (!modal) return;
  modal.classList.remove('is-open', 'scroll-modal--avatar');
  modal.hidden = true;
  const closeButton = document.getElementById('scroll-modal-close');
  if (closeButton) closeButton.hidden = false;
  setRainbowVfxSuspended(false, 'scroll-modal');
}

function initScrollModal() {
  document.getElementById('scroll-modal-close')?.addEventListener('click', closeScrollModal);
  document.getElementById('scroll-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'scroll-modal') closeScrollModal();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeScrollModal();
  });
}

function syncMinigameToggleButton() {
  const btn = document.getElementById('btn-toggle-minigame');
  if (!btn) return;
  const unlocked = Boolean(featureUnlockMap[ARCANE_SURVIVORS_FEATURE_ID]);
  btn.textContent = unlocked ? 'Travar Arcane Survivors' : 'Destravar Arcane Survivors';
  btn.setAttribute('aria-pressed', String(unlocked));
  btn.classList.toggle('btn-gold--pulse', !unlocked);
}

/* ============================================================
   9. FERRAMENTAS DO ADMIN
   ============================================================ */
function initAdminTools() {
  const tools = document.getElementById('master-tools');
  if (currentUser?.role !== 'admin') {
    if (tools) {
      tools.hidden = true;
      tools.setAttribute('aria-hidden', 'true');
    }
    // Defesa: não registra listeners de Gerar / Liberar / Almas para student.
    return;
  }
  if (tools) {
    tools.hidden = false;
    tools.setAttribute('aria-hidden', 'false');
  }

  const btnCodes = document.getElementById('btn-generate-codes');
  const btnManageLessons = document.getElementById('btn-manage-lessons');
  const btnToggleMinigame = document.getElementById('btn-toggle-minigame');
  const btnSouls = document.getElementById('btn-list-souls');
  const btnVigilancia = document.getElementById('btn-vigilancia');

  syncMinigameToggleButton();

  btnManageLessons?.addEventListener('click', () => {
    window.location.href = ROUTES.aulas();
  });

  btnToggleMinigame?.addEventListener('click', async () => {
    const unlocked = Boolean(featureUnlockMap[ARCANE_SURVIVORS_FEATURE_ID]);
    const next = !unlocked;
    btnToggleMinigame.disabled = true;
    const original = btnToggleMinigame.textContent;
    btnToggleMinigame.textContent = next ? 'Destravando…' : 'Travando…';
    try {
      const result = await setFeatureGate(
        currentToken,
        ARCANE_SURVIVORS_FEATURE_ID,
        FEATURE_UNLOCKED_GATE_KEY,
        next
      );
      featureUnlockMap = {
        ...featureUnlockMap,
        [ARCANE_SURVIVORS_FEATURE_ID]: Boolean(result?.gates?.unlocked),
      };
      shellApi?.applyFeatureGates?.(featureUnlockMap);
      syncMinigameToggleButton();
    } catch (error) {
      const p = document.createElement('p');
      p.textContent = error instanceof ApiError ? error.message : 'Falha ao atualizar o selo do minigame.';
      openScrollModal('Erro', p);
      btnToggleMinigame.textContent = original;
    } finally {
      btnToggleMinigame.disabled = false;
    }
  });

  btnCodes?.addEventListener('click', async () => {
    const wrapper = document.createElement('div');

    const help = document.createElement('p');
    help.className = 'scroll-modal__note';
    help.textContent = 'Escolha a aula para gerar um código único de 7 caracteres.';
    wrapper.appendChild(help);

    const lessons = LESSONS;
    if (lessons.length === 0) {
      const noLessons = document.createElement('p');
      noLessons.className = 'scroll-modal__note';
      noLessons.textContent = 'Não há aulas cadastradas no sistema. Cadastre as novas aulas para habilitar a geração de códigos.';
      wrapper.appendChild(noLessons);
    }

    lessons.forEach((lesson) => {
      const row = document.createElement('div');
      row.className = 'code-row';

      const left = document.createElement('span');
      left.className = 'code-row__code';
      left.textContent = `${lesson.number} ${lesson.title}`;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-row__action';
      button.textContent = 'Gerar';

      button.addEventListener('click', async () => {
        button.disabled = true;
        const original = button.textContent;
        button.textContent = 'Gerando...';
        try {
          const result = await generateCode(currentToken, lesson.id);
          const { code } = result;

          const codeBlock = document.createElement('div');
          codeBlock.className = 'code-row';

          const codeValue = document.createElement('span');
          codeValue.className = 'code-row__code';
          codeValue.textContent = code.code;

          const codeMeta = document.createElement('span');
          codeMeta.className = 'code-row__meta';
          codeMeta.textContent = `${code.lessonTitle} — +${code.xp} XP • expira em 20 min`;

          codeBlock.append(codeValue, codeMeta);
          openScrollModal('Código Gerado', codeBlock);
        } catch (error) {
          const p = document.createElement('p');
          p.textContent = error instanceof ApiError ? error.message : 'Falha ao gerar código.';
          openScrollModal('Erro', p);
        } finally {
          button.disabled = false;
          button.textContent = original;
        }
      });

      row.append(left, button);
      wrapper.appendChild(row);
    });

    try {
      const { codes } = await listCodes(currentToken);
      const historyTitle = document.createElement('p');
      historyTitle.className = 'scroll-modal__note';
      historyTitle.textContent = 'Histórico recente de códigos gerados:';
      wrapper.appendChild(historyTitle);

      codes.forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'code-row';

        const code = document.createElement('span');
        code.className = 'code-row__code';
        code.textContent = entry.code;

        const meta = document.createElement('span');
        meta.className = 'code-row__meta';
        const status = entry.expired ? 'EXPIRADO' : 'ATIVO';
        const usage = entry.used ? ' • já resgatado' : '';
        meta.textContent = `${entry.lessonTitle} — +${entry.xp} XP • ${status}${usage}`;

        row.append(code, meta);
        wrapper.appendChild(row);
      });
    } catch {
      const note = document.createElement('p');
      note.className = 'scroll-modal__note';
      note.textContent = 'Histórico indisponível no momento, mas você ainda pode gerar novos códigos.';
      wrapper.appendChild(note);
    }

    const footerNote = document.createElement('p');
    footerNote.className = 'scroll-modal__note';
    footerNote.textContent = 'O código vale para a turma inteira e só deixa de funcionar quando expira (20 min). Cada aluno pode resgatá-lo uma única vez.';
    wrapper.appendChild(footerNote);

    openScrollModal('Gerar Código de Acesso', wrapper);
  });

  btnSouls?.addEventListener('click', async () => {
    window.location.href = ROUTES.souls();
  });

  btnVigilancia?.addEventListener('click', () => {
    window.location.href = `${ROUTES.souls()}?tab=grimorios`;
  });
}

/* ============================================================
   10. LOGOUT
   ============================================================ */
async function handleDashboardLogout() {
  await logout();
  window.location.href = ROUTES.auth();
}

/* ============================================================
   11. AVISO DE API INDISPONÍVEL
   ============================================================ */
function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

/* ============================================================
   12. BOOT
   ============================================================ */
async function init() {
  initScrollModal();
  // Carrega a galeria fixa de avatares em paralelo com o guard de sessão.
  const avatarCountReady = detectAvatarCount();

  let result;
  try {
    // Guard de rota: sem sessão válida → Pacto de Sangue.
    result = await requireSession();
  } catch (error) {
    showApiWarning(
      error instanceof ApiError
        ? error.message
        : 'A API não respondeu. Rode `vercel dev` localmente ou publique no Vercel.'
    );
    return;
  }

  if (!result) return; // requireSession já redirecionou

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  shellApi = initAppShell({
    route: 'dashboard',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: handleDashboardLogout,
  });

  await avatarCountReady; // garante getAvatarCount()/avatarSafeIndex corretos antes de renderizar

  try {
    publishMap = await fetchLessonsPublishMap(currentToken, LESSONS.map((lesson) => lesson.id));
  } catch {
    publishMap = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson.id === 'aula1']));
  }

  try {
    featureUnlockMap = await fetchFeatureUnlockMap(currentToken, [ARCANE_SURVIVORS_FEATURE_ID]);
  } catch {
    featureUnlockMap = { [ARCANE_SURVIVORS_FEATURE_ID]: false };
  }
  if (shellApi?.featureGatesReady) {
    await shellApi.featureGatesReady;
  }
  shellApi?.applyFeatureGates?.(featureUnlockMap);

  // A hidratação visual (stats/cards) pode falhar por dado inesperado
  // do servidor, mas isso NUNCA pode impedir os botões de funcionar.
  // Por isso a renderização fica isolada em seu próprio try/catch,
  // separado da vinculação dos event listeners logo abaixo.
  try {
    renderProfile(currentUser);
    renderAchievements(currentUser);
    renderLessons(currentUser);
    renderXpBar(currentUser, { fromZero: true }); // JUICE: enche de 0 até o valor real
  } catch (error) {
    console.error('[dashboard] Falha ao renderizar os dados do perfil:', error);
  }

  initAltar();
  initAvatarSwap();
  initAdminTools();
  renderRailPreviews(currentToken).catch((error) => {
    console.error('[dashboard] Falha ao renderizar previews do trilho:', error);
  });
}

document.addEventListener('DOMContentLoaded', init);
