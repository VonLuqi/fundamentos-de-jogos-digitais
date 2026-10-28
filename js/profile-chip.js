import * as api from './api.js';

const chips = new WeakMap();
let nextId = 0;

function cachedUser(token) {
  try {
    const cached = JSON.parse(sessionStorage.getItem('hades_session_bootstrap_swr_v1') || 'null');
    if (token && cached?.token === token) return cached.user;
  } catch { /* Storage can be unavailable in private mode. */ }
  return null;
}

export function syncProfileChip(shell) {
  chips.get(shell)?.sync();
}

export function initProfileChip(shell, { user, token, onLogout } = {}) {
  if (chips.has(shell)) return chips.get(shell);
  const original = shell.querySelector('[data-shell-logout]');
  if (!original) return null;
  const home = original.parentElement;
  const root = document.createElement('div');
  root.className = 'profile-chip';
  root.innerHTML = `<button type="button" class="profile-chip__trigger" aria-haspopup="menu" aria-expanded="false">
    <span class="profile-chip__portrait"><span class="profile-chip__initial" aria-hidden="true"></span><img alt="" width="44" height="44"><span class="profile-chip__pending" title="Foto em análise" hidden>Em análise</span></span>
    <span class="profile-chip__identity"><span class="profile-chip__name"></span><span class="profile-chip__username"></span></span>
    <span class="profile-chip__chevron" aria-hidden="true">⌃</span>
  </button><div class="profile-chip__menu" role="menu" aria-label="Opções do perfil" hidden>
    <div class="profile-chip__ornament" aria-hidden="true">◆</div>
    <div class="profile-chip__summary" role="presentation">
      <span class="profile-chip__portrait profile-chip__portrait--large"><span class="profile-chip__initial" aria-hidden="true"></span><canvas width="112" height="112" aria-hidden="true" hidden></canvas></span>
      <span class="profile-chip__identity"><span class="profile-chip__name"></span><span class="profile-chip__username"></span><span class="profile-chip__turma" hidden></span></span>
    </div>
    <a role="menuitem" tabindex="-1" href="../perfil/"><span class="profile-chip__glyph" aria-hidden="true">♙</span>Meu perfil</a>
    <a role="menuitem" tabindex="-1" href="../perfil/#editar"><span class="profile-chip__glyph" aria-hidden="true">✎</span>Editar perfil</a>
    <a role="menuitem" tabindex="-1" href="../perfil/#avatar"><span class="profile-chip__glyph" aria-hidden="true">◈</span>Trocar avatar</a>
    <div role="separator"></div>
  </div>`;
  original.replaceWith(root);
  const trigger = root.querySelector('button');
  const menu = root.querySelector('[role="menu"]');
  menu.id = `shell-profile-menu-${++nextId}`;
  trigger.setAttribute('aria-controls', menu.id);
  // Reuse the original node so existing logout listeners are preserved.
  original.className = 'profile-chip__logout';
  original.innerHTML = '<span class="profile-chip__glyph" aria-hidden="true">⏻</span>Encerrar sessão';
  original.setAttribute('role', 'menuitem');
  original.tabIndex = -1;
  menu.append(original);
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  items.forEach((item, index) => item.style.setProperty('--profile-item-index', index));
  const topLayer = typeof menu.showPopover === 'function';
  if (topLayer) menu.setAttribute('popover', 'manual');
  let opened = false;
  let closeTimer;
  let currentUser = {};
  let revision = 0;

  function update(next) {
    if (!next || typeof next !== 'object') return;
    currentUser = { ...currentUser, ...next };
    revision++;
    const name = currentUser.displayName || String(currentUser.fullName || currentUser.name || '').trim().split(/\s+/)[0] || 'Meu perfil';
    root.querySelectorAll('.profile-chip__name').forEach((el) => { el.textContent = name; });
    root.querySelectorAll('.profile-chip__username').forEach((el) => {
      el.textContent = currentUser.username ? `@${String(currentUser.username).replace(/^@/, '')}` : '';
    });
    const turma = root.querySelector('.profile-chip__turma');
    turma.textContent = currentUser.turma ? `Turma ${currentUser.turma}` : '';
    turma.hidden = !currentUser.turma;
    root.querySelector('.profile-chip__pending').hidden = !currentUser.photoPendingUrl;
    trigger.setAttribute('aria-label', `Opções do perfil de ${name}${currentUser.photoPendingUrl ? ', foto em análise' : ''}`);
    // A fresh node prevents an older async avatar load from overwriting a newer profile.
    const previous = root.querySelector('img');
    const img = previous.cloneNode(false);
    img.removeAttribute('src');
    previous.replaceWith(img);
    // Mantém a inicial até haver pixels válidos; não cria outro download.
    const canvas = root.querySelector('canvas');
    const context = canvas.getContext('2d');
    const initials = root.querySelectorAll('.profile-chip__initial');
    initials.forEach((el) => { el.textContent = Array.from(name.trim())[0]?.toLocaleUpperCase('pt-BR') || '◆'; });
    function showInitial() {
      if (!root.contains(img)) return;
      img.hidden = true;
      canvas.hidden = true;
      initials.forEach((el) => { el.hidden = false; });
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
    function drawPortrait() {
      if (!root.contains(img)) return;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!img.complete || !side) return;
      img.hidden = false;
      initials[0].hidden = true;
      if (!context) return;
      try {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2,
          side, side, 0, 0, canvas.width, canvas.height);
        canvas.hidden = false;
        initials[1].hidden = true;
      } catch {
        canvas.hidden = true;
        initials[1].hidden = false;
      }
    }
    showInitial();
    img.addEventListener('load', drawPortrait);
    img.addEventListener('error', showInitial);
    const loadUserAvatar = api.loadUserAvatar || ((el, profile) => api.loadAvatarImage(el, profile.avatar_index));
    // Também cobre imagem já em cache e rejeição do helper, sem perder o fallback.
    Promise.resolve().then(() => loadUserAvatar(img, currentUser, { isSelf: true }))
      .then(drawPortrait).catch(showInitial);
  }

  function position() {
    if (!topLayer) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(304, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    // Rodapé abre para cima; chip junto ao toggle recolhido abre para baixo.
    const above = !root.classList.contains('is-detached');
    const anchorX = Math.max(24, Math.min(width - 24, rect.left + rect.width / 2 - left));
    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.top = above ? 'auto' : `${rect.bottom + 8}px`;
    menu.style.bottom = above ? `${Math.max(12, window.innerHeight - rect.top + 8)}px` : 'auto';
    menu.style.maxHeight = `${Math.max(44, above ? rect.top - 20 : window.innerHeight - rect.bottom - 20)}px`;
    menu.style.transformOrigin = `${anchorX}px ${above ? 'bottom' : 'top'}`;
    menu.style.setProperty('--profile-reveal-y', above ? '8px' : '-8px');
  }

  function finishClose() {
    if (opened) return;
    if (topLayer && menu.matches(':popover-open')) menu.hidePopover();
    menu.hidden = true;
  }

  function close(restoreFocus = false) {
    if (!opened) return;
    opened = false;
    trigger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menu.setAttribute('inert', '');
    if (restoreFocus) trigger.focus({ preventScroll: true });
    clearTimeout(closeTimer);
    closeTimer = setTimeout(finishClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 120);
  }

  function open(index = 0) {
    clearTimeout(closeTimer);
    menu.hidden = false;
    menu.removeAttribute('inert');
    position();
    if (topLayer && !menu.matches(':popover-open')) menu.showPopover();
    opened = true;
    trigger.setAttribute('aria-expanded', 'true');
    // Flush the initial transform before starting the transition.
    void menu.offsetWidth;
    menu.classList.add('is-open');
    items[index].focus({ preventScroll: true });
  }

  trigger.addEventListener('click', () => opened ? close(true) : open());
  trigger.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    open(event.key === 'ArrowUp' ? items.length - 1 : 0);
  });
  menu.addEventListener('keydown', (event) => {
    const index = items.indexOf(document.activeElement);
    const target = { ArrowDown: (index + 1) % items.length, ArrowUp: (index + items.length - 1) % items.length, Home: 0, End: items.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    items[target].focus();
  });
  // Capture before app-shell's Escape handler: one Escape closes only this menu.
  window.addEventListener('keydown', (event) => {
    if (!opened) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
    } else if (event.key === 'Tab') {
      close(true); // Let the drawer trap process Tab from the trigger.
    }
  }, true);
  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) close();
  });
  document.addEventListener('focusin', (event) => {
    if (!root.contains(event.target)) close();
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('[role="menuitem"]')) close(true);
  });
  if (typeof onLogout === 'function') original.addEventListener('click', onLogout);
  window.addEventListener('resize', () => close());
  window.addEventListener('scroll', (event) => {
    if (!menu.contains(event.target)) close();
  }, true);
  window.addEventListener('profile:updated', (event) => update(event.detail?.user || event.detail));

  function sync() {
    close();
    const collapsed = shell.classList.contains('is-nav-collapsed') && !window.matchMedia('(max-width: 980px)').matches;
    root.classList.toggle('is-detached', collapsed);
    const destination = collapsed ? (shell.querySelector('.app-shell__header-left') || shell) : home;
    if (root.parentElement !== destination) destination.append(root);
  }
  const controller = { sync, close, update };
  chips.set(shell, controller);
  const session = api.getSession();
  const authToken = token || session?.token;
  const initial = user || cachedUser(authToken);
  update(initial || session || {});
  if (!initial && authToken) {
    const initialRevision = revision;
    api.fetchProfile(authToken).then((result) => {
      if (revision === initialRevision) update(result.user);
    }).catch(() => {});
  }
  sync();
  return controller;
}
