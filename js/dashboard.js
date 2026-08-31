/**
 * ============================================================
 * SALÃO DOS HERÓIS — Painel do Aluno (localStorage)
 * ============================================================
 * Consome os dados gravados pelo `auth.js`:
 *
 *    localStorage['fjg_users']  → Array<UserAccount>
 *    localStorage['fjg_session']→ { name: string }
 *
 * Tudo aqui é lógica de apresentação/estado front-end. Quando
 * o back-end PHP/SQL entrar, estes pontos serão substituídos
 * por fetch() para endpoints reais — a estrutura de dados
 * (UserAccount) já está preparada para isso.
 * ============================================================
 */

'use strict';

/* ---------- Chaves de persistência (espelhado de auth.js) ---------- */
const STORAGE_KEYS = {
  USERS: 'fjg_users',
  SESSION: 'fjg_session',
};

/* ---------- Avatares pré-definidos ---- glifos Unicode ---------- */
const AVATAR_GLYPHS = ['◆', '♠', '♥', '♣', '♦', '★'];

/* ---------- Definições estáticas (Rank / Conquistas / Aulas)
   Os limites abaixo formam o "contrato de design" da gamificação.
   No futuro, eles podem vir de uma tabela `achievements` no SQL.
*/
const RANKS = [
  { minXp: 0, title: 'Alma Novata' },
  { minXp: 20, title: 'Iniciado do Tártaro' },
  { minXp: 60, title: 'Operador do Tártaro' },
  { minXp: 120, title: 'Veterano do Submundo' },
  { minXp: 240, title: 'Campeão Érebo' },
];

const ACHIEVEMENTS = [
  { id: 'primeiro_sangue', icon: '🩸', name: 'Primeiro Sangue', desc: 'Completou a Aula 1.' },
  { id: 'escudeiro', icon: '🛡️', name: 'Escudeiro', desc: 'Concluir 2 aulas.' },
  { id: 'arquiteto', icon: '⚙️', name: 'Arquiteto de Mapas', desc: 'Concluir a simulação da Aula 1.' },
  { id: 'cacador_echos', icon: '🔥', name: 'Caçador de Ecos', desc: 'Alcançar 20 XP.' },
  { id: 'desvendador', icon: '✦', name: 'Desvendador', desc: 'Desbloquear 3 conquistas.' },
  { id: 'campeao', icon: '👑', name: 'Campeão do Submundo', desc: 'Alcançar 120 XP.' },
];

const LESSONS = [
  { id: 'aula1', number: '01', title: 'A Regra do Jogo', subtitle: 'O Framework MDA e Mecânicas', rewardXp: 20, href: './aula1.html' },
  { id: 'aula2', number: '02', title: '????????', subtitle: 'Requisito: Concluir Aula Anterior', rewardXp: 20, href: './aula1.html' },
  { id: 'aula3', number: '03', title: '????????', subtitle: 'Requisito: Concluir Aula Anterior', rewardXp: 20, href: './aula1.html' },
];

const LEVEL_XP_BASE = 100; // nível sobe a cada 100 XP (stub simples)

/* ============================
   1. HELPERS DE STORAGE
   ============================ */
function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [];
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.warn('[DASHBOARD] Falha ao ler usuários do localStorage:', error);
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('[DASHBOARD] Não foi possível salvar usuários no localStorage:', error);
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

function getCurrentUser() {
  const session = getSession();
  if (!session || !session.name) return null;

  const users = loadUsers();
  const lookup = session.name.trim().toLowerCase();
  return users.find((user) => user.name.trim().toLowerCase() === lookup) ?? null;
}

/* ============================
   2. CÁLCULOS DE RANK / TÍTULO
   ============================ */
function getRankForXp(xp) {
  const rank = RANKS.filter((r) => xp >= r.minXp).pop();
  return rank ? rank.title : RANKS[0].title;
}

function getLevelForXp(xp) {
  return Math.max(1, Math.floor(xp / LEVEL_XP_BASE) + 1);
}

/* ============================
   3. RENDERIZAÇÃO DO PERFIL
   ============================ */
function renderProfile(user) {
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-rank').textContent = getRankForXp(user.xp);
  document.getElementById('level-value').textContent = String(getLevelForXp(user.xp));
  document.getElementById('avatar-glyph').textContent = AVATAR_GLYPHS[user.avatarIndex % AVATAR_GLYPHS.length];
  document.getElementById('stat-lessons').textContent = String(user.completedLessons.length);
  document.getElementById('stat-achievements').textContent = `${user.achievements.length} / ${ACHIEVEMENTS.length}`;
}

/* ============================
   4. BARra DE XP "JUICY"
   Lê o XP do localStorage e preenche a barra de 0 → valor, com
   transição CSS. A animação acontece de forma assíncrona logo
   após o primeiro paint, para garantir o efeito visual.
   ============================ */
function animateXpBar(user) {
  const fillEl = document.getElementById('xp-fill');
  const textEl = document.getElementById('xp-text');
  const barEl = fillEl ? fillEl.closest('.xp-bar') : null;
  if (!fillEl || !textEl || !barEl) return;

  const xpMax = LEVEL_XP_BASE; // barra representa progresso até o próximo nível
  const xpInLevel = user.xp % LEVEL_XP_BASE;
  const targetPercent = Math.min((xpInLevel / xpMax) * 100, 100);

  // Atualiza texto + ARIA com o valor FINAL (atual em localStorage).
  textEl.textContent = `${xpInLevel} / ${xpMax} XP`;
  barEl.setAttribute('aria-valuenow', String(xpInLevel));

  // JUICE: dispara a transição a partir de 0 — feedback visual gratificante.
  window.setTimeout(() => {
    fillEl.style.width = `${targetPercent}%`;
  }, 200);
}

/* ============================
   5. TROCA DE AVATAR
   ============================ */
function initAvatarSwap(user, users) {
  const frame = document.getElementById('avatar-frame');
  const glyph = document.getElementById('avatar-glyph');
  if (!frame || !glyph) return;

  frame.addEventListener('click', () => {
    // Avança para o próximo avatar da lista circular
    user.avatarIndex = (user.avatarIndex + 1) % AVATAR_GLYPHS.length;

    // Persiste a escolha no array de usuários e já atualiza session
    saveUsers(users);
    glyph.textContent = AVATAR_GLYPHS[user.avatarIndex];

    // JUICE: animação "flash" da troca (classe controlada para re-disparo)
    frame.classList.remove('is-swapping');
    // eslint-disable-next-line no-unused-expressions
    frame.offsetHeight;
    frame.classList.add('is-swapping');
  });
}

/* ============================
   6. CONQUISTAS
   ============================ */
function renderAchievements(user) {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  grid.innerHTML = '';
  ACHIEVEMENTS.forEach((ach, index) => {
    const unlocked = user.achievements.includes(ach.id);

    const li = document.createElement('li');
    li.className = `achievement-card ${unlocked ? 'is-unlocked' : 'is-locked'}`;
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

/* ============================
   7. LISTAGEM DE AULAS
   ============================ */
function renderLessons(user) {
  const list = document.getElementById('lessons-list');
  if (!list) return;

  list.innerHTML = '';
  LESSONS.forEach((lesson, index) => {
    const completed = user.completedLessons.includes(lesson.id);
    const locked = !completed && index > 0 && !user.completedLessons.includes(LESSONS[index - 1].id);

    const li = document.createElement('li');
    li.className = `lesson-row ${locked ? 'is-locked' : ''} ${completed ? 'is-completed' : ''}`;
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
    subtitle.textContent = lesson.subtitle;
    body.append(title, subtitle);

    if (locked) {
      const lockIcon = document.createElement('span');
      lockIcon.setAttribute('aria-hidden', 'true');
      lockIcon.textContent = '🔒';
      li.append(number, body, lockIcon);
    } else {
      const action = document.createElement('a');
      action.className = 'lesson-row__action';
      action.href = lesson.href;
      action.textContent = completed ? 'Rever' : 'Iniciar';
      if (completed) {
        action.setAttribute('aria-label', `Rever ${lesson.title}`);
      } else {
        action.setAttribute('aria-label', `Iniciar ${lesson.title}`);
      }

      // JUICE: ao clicar, concede o XP da aula (uma única vez) e marca como concluída.
      action.addEventListener('click', () => {
        if (!user.completedLessons.includes(lesson.id)) {
          user.completedLessons.push(lesson.id);
          user.xp += lesson.rewardXp;
          // Exemplo de conquista desbloqueada por progresso
          if (user.xp >= 20 && !user.achievements.includes('cacador_echos')) {
            user.achievements.push('cacador_echos');
          }
          saveUsers(loadUsers().map((u) => (u.name.trim().toLowerCase() === user.name.trim().toLowerCase() ? user : u)));
        }
      });

      li.append(number, body, action);
    }

    list.appendChild(li);
  });
}

/* ============================
   8. LOGOUT
   ============================ */
function initLogout() {
  const btn = document.getElementById('btn-logout');
  if (!btn) return;
  btn.addEventListener('click', () => {
    clearSession();
    window.location.href = './auth.html';
  });
}

/* ============================
   9. BOOT
   ============================ */
function init() {
  const user = getCurrentUser();

  // Sem sessão? Retorna ao Pacto de Sangue.
  if (!user) {
    window.location.href = './auth.html';
    return;
  }

  const users = loadUsers();

  renderProfile(user);
  renderAchievements(user);
  renderLessons(user);
  animateXpBar(user);
  initAvatarSwap(user, users);
  initLogout();
}

document.addEventListener('DOMContentLoaded', init);
