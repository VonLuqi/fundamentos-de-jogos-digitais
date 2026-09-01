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

import {
  detectAvatarCount,
  getAvatarCount,
  avatarSafeIndex,
  loadAvatarImage,
  ACHIEVEMENTS,
  LESSONS,
  LEVEL_XP_BASE,
  ROUTES,
  ApiError,
  requireSession,
  redeemCode,
  generateCode,
  setAvatar,
  listCodes,
  listUsers,
  logout,
  getSession,
  rankForXp,
  levelForXp,
  xpWithinLevel,
} from './api.js';

/* ---------- Estado local de apresentação (espelho do servidor) ---------- */
let currentUser = null;
let currentToken = null;

/* ============================================================
   1. RENDERIZAÇÃO DO PERFIL
   ============================================================ */
function renderProfile(user) {
  const isAdmin = user.role === 'admin';
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-rank').textContent = isAdmin ? 'Mestre do Infinito' : rankForXp(user.xp);
  document.getElementById('level-value').textContent = isAdmin ? '∞' : String(levelForXp(user.xp));
  const avatarImg = document.getElementById('avatar-glyph');
  if (avatarImg) loadAvatarImage(avatarImg, user.avatarIndex);
  updateAvatarCounter(user.avatarIndex);
  document.getElementById('stat-lessons').textContent = String(isAdmin ? LESSONS.length : user.completedLessons.length);
  document.getElementById('stat-achievements').textContent =
    `${isAdmin ? ACHIEVEMENTS.length : user.achievements.length} / ${ACHIEVEMENTS.length}`;

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
  counter.textContent = `Avatar ${avatarSafeIndex(avatarIndex) + 1} de ${getAvatarCount()}`;
}

/**
 * PAINEL DO ADMIN — a interface se adapta ao papel do usuário.
 * A classe `is-admin` no painel ativa, via CSS: coroa sobre o avatar,
 * aura vermelha pulsante na moldura e borda diferenciada.
 */
function applyAdminSkin(user) {
  const isAdmin = user.role === 'admin';
  const panel = document.getElementById('profile-panel');
  const badge = document.getElementById('master-badge');
  const tools = document.getElementById('admin-tools');

  panel.classList.toggle('is-admin', isAdmin);
  if (badge) badge.hidden = !isAdmin;
  if (tools) tools.hidden = !isAdmin;
}

/* ============================================================
   2. BARRA DE XP "JUICY"
   ============================================================
   `animate = true` força o preenchimento a partir de 0, criando a
   sensação de progresso conquistado. Ao carregar a página usamos
   animação; após um resgate, animamos do valor antigo para o novo.
   ============================================================ */
function renderXpBar(user, { fromZero = false } = {}) {
  const fillEl = document.getElementById('xp-fill');
  const textEl = document.getElementById('xp-text');
  const barEl = fillEl?.closest('.xp-bar');
  if (!fillEl || !textEl || !barEl) return;

  if (user.role === 'admin') {
    textEl.textContent = '∞ / ∞ XP';
    barEl.setAttribute('aria-valuenow', String(LEVEL_XP_BASE));
    fillEl.style.width = '100%';
    return;
  }

  const xpInLevel = xpWithinLevel(user.xp);
  const targetPercent = Math.min((xpInLevel / LEVEL_XP_BASE) * 100, 100);

  textEl.textContent = `${xpInLevel} / ${LEVEL_XP_BASE} XP`;
  barEl.setAttribute('aria-valuenow', String(xpInLevel));

  if (fromZero) {
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';
    void fillEl.offsetHeight; // reflow: garante que o 0% seja aplicado
    fillEl.style.transition = '';
  }

  // Pequeno atraso para que a transição CSS seja perceptível.
  window.setTimeout(() => {
    fillEl.style.width = `${targetPercent}%`;
  }, 180);
}

/* ============================================================
   3. CONQUISTAS
   ============================================================ */
function renderAchievements(user, highlightIds = []) {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  grid.innerHTML = '';
  if (ACHIEVEMENTS.length === 0) {
    const li = document.createElement('li');
    li.className = 'achievement-empty';
    li.textContent = 'Nenhuma conquista cadastrada ainda.';
    grid.appendChild(li);
    return;
  }

  ACHIEVEMENTS.forEach((ach, index) => {
    const unlocked = user.role === 'admin' || user.achievements.includes(ach.id);
    const justUnlocked = highlightIds.includes(ach.id);

    const li = document.createElement('li');
    li.className = [
      'achievement-card',
      unlocked ? 'is-unlocked' : 'is-locked',
      justUnlocked ? 'is-just-unlocked' : '',
    ]
      .filter(Boolean)
      .join(' ');
    li.style.setProperty('--ach-index', String(index));

    const icon = document.createElement('span');
    icon.className = 'achievement-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = ach.icon;

    const name = document.createElement('p');
    name.className = 'achievement-card__name';
    name.textContent = ach.name;

    const desc = document.createElement('p');
    desc.className = 'achievement-card__desc';
    desc.textContent = ach.desc;

    li.append(icon, name, desc);
    grid.appendChild(li);
  });
}

/* ============================================================
   4. TRILHA DE AULAS
   ============================================================ */
function renderLessons(user) {
  const list = document.getElementById('lessons-list');
  if (!list) return;

  list.innerHTML = '';
  if (LESSONS.length === 0) {
    const li = document.createElement('li');
    li.className = 'lesson-empty';
    li.textContent = 'Nenhuma aula cadastrada ainda.';
    list.appendChild(li);
    return;
  }

  LESSONS.forEach((lesson, index) => {
    const completed = user.completedLessons.includes(lesson.id);
    const locked = false;

    const li = document.createElement('li');
    li.className = ['lesson-row', locked ? 'is-locked' : '', completed ? 'is-completed' : '']
      .filter(Boolean)
      .join(' ');
    li.style.setProperty('--lesson-index', String(index));

    const number = document.createElement('span');
    number.className = 'lesson-row__number';
    number.textContent = lesson.number;

    const body = document.createElement('div');
    body.className = 'lesson-row__body';
    const title = document.createElement('p');
    title.className = 'lesson-row__title';
    title.textContent = lesson.title;
    const subtitle = document.createElement('p');
    subtitle.className = 'lesson-row__subtitle';
    subtitle.textContent = completed ? `Concluída — +${lesson.rewardXp} XP recebidos` : lesson.subtitle;
    body.append(title, subtitle);

    if (locked) {
      const lock = document.createElement('span');
      lock.setAttribute('aria-hidden', 'true');
      lock.textContent = '🔒';
      li.append(number, body, lock);
    } else {
      // Apenas navega para a aula. O XP é concedido SOMENTE pela
      // Oferenda ao Estige (validada no servidor) — não por clique.
      const action = document.createElement('a');
      action.className = 'lesson-row__action';
      action.href = ROUTES.lesson(lesson.id);
      action.textContent = completed ? 'Rever' : 'Iniciar';
      action.setAttribute('aria-label', `${completed ? 'Rever' : 'Iniciar'} ${lesson.title}`);
      li.append(number, body, action);
    }

    list.appendChild(li);
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

      showLevelUpOverlay(
        result.leveledUp ? 'LEVEL UP!' : 'Oferenda Aceita',
        `${result.awarded.lesson} — ${detailParts.join(' • ')}`
      );

      renderProfile(currentUser);
      renderXpBar(currentUser);
      renderAchievements(currentUser, result.awarded.achievements);
      renderLessons(currentUser);

      setAltarFeedback(`Oferenda aceita: ${detailParts.join(' • ')}`, 'success');
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

    const note = document.createElement('p');
    note.className = 'scroll-modal__note';
    note.textContent = 'Escolha diretamente um avatar da galeria.';

    const grid = document.createElement('div');
    grid.className = 'avatar-picker-grid';

    const status = document.createElement('p');
    status.className = 'avatar-picker__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const selectedIndex = avatarSafeIndex(currentUser?.avatarIndex ?? 0);
    const allButtons = [];

    function setBusy(busy) {
      allButtons.forEach((button) => {
        button.disabled = busy;
      });
    }

    for (let index = 0; index < getAvatarCount(); index += 1) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'avatar-picker__option';
      option.setAttribute('aria-label', `Selecionar Avatar ${index + 1}`);
      if (index === selectedIndex) option.classList.add('is-selected');

      const image = document.createElement('img');
      image.className = 'avatar-picker__image';
      image.alt = `Avatar ${index + 1}`;
      loadAvatarImage(image, index);

      const label = document.createElement('span');
      label.className = 'avatar-picker__label';
      label.textContent = `Avatar ${index + 1}`;

      option.append(image, label);
      allButtons.push(option);

      option.addEventListener('click', async () => {
        if (option.disabled) return;

        if (avatarSafeIndex(currentUser.avatarIndex) === index) {
          closeScrollModal();
          return;
        }

        setBusy(true);
        status.textContent = 'Salvando avatar...';

        frame.classList.remove('is-swapping');
        void frame.offsetHeight;
        frame.classList.add('is-swapping');

        try {
          const { user } = await setAvatar(currentToken, index);
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

      grid.appendChild(option);
    }

    wrapper.append(note, grid, status);
    return wrapper;
  }

  frame.addEventListener('click', () => {
    openScrollModal('Escolha seu Avatar', buildAvatarPickerContent());
  });
}

/* ============================================================
   8. MODAL "PERGAMINHO" (substitui o alert nativo)
   ============================================================ */
function openScrollModal(title, contentNode) {
  const modal = document.getElementById('scroll-modal');
  const titleEl = document.getElementById('scroll-modal-title');
  const bodyEl = document.getElementById('scroll-modal-body');
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = '';
  bodyEl.appendChild(contentNode);

  modal.hidden = false;
  modal.classList.add('is-open');
  document.getElementById('scroll-modal-close')?.focus();
}

function closeScrollModal() {
  const modal = document.getElementById('scroll-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.hidden = true;
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

/* ============================================================
   9. FERRAMENTAS DO ADMIN
   ============================================================ */
function initAdminTools() {
  const tools = document.getElementById('admin-tools');
  if (currentUser?.role !== 'admin') {
    if (tools) tools.hidden = true;
    return;
  }
  if (tools) tools.hidden = false;

  const btnCodes = document.getElementById('btn-generate-codes');
  const btnSouls = document.getElementById('btn-list-souls');

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
        const status = entry.used ? 'USADO' : entry.expired ? 'EXPIRADO' : 'ATIVO';
        meta.textContent = `${entry.lessonTitle} — +${entry.xp} XP • ${status}`;

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
    footerNote.textContent = 'Cada código é único e fica vinculado à aula escolhida.';
    wrapper.appendChild(footerNote);

    openScrollModal('Gerar Código de Acesso', wrapper);
  });

  btnSouls?.addEventListener('click', async () => {
    try {
      const { users } = await listUsers(currentToken);
      const wrapper = document.createElement('div');

      users.forEach((u) => {
        const row = document.createElement('div');
        row.className = 'code-row';

        const name = document.createElement('span');
        name.className = 'code-row__code';
        name.textContent = u.role === 'admin' ? `♛ ${u.name}` : u.name;

        const meta = document.createElement('span');
        meta.className = 'code-row__meta';
        meta.textContent = `${u.xp} XP • ${u.completedLessons.length} aula(s) • ${u.achievements.length} conquista(s)`;

        row.append(name, meta);
        wrapper.appendChild(row);
      });

      openScrollModal(`Almas Registradas (${users.length})`, wrapper);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao consultar as almas.';
      const p = document.createElement('p');
      p.textContent = message;
      openScrollModal('Erro', p);
    }
  });
}

/* ============================================================
   10. LOGOUT
   ============================================================ */
function initLogout() {
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await logout();
    window.location.href = ROUTES.auth();
  });
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
  // Dispara a varredura de assets/avatars/ em paralelo com o guard de
  // sessão, para não adicionar latência extra desnecessária ao boot.
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
  await avatarCountReady; // garante getAvatarCount()/avatarSafeIndex corretos antes de renderizar

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
  initLogout();
}

document.addEventListener('DOMContentLoaded', init);
