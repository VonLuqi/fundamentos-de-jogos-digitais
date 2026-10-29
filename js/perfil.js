import { initAppShell } from './app-shell.js';
import {
  ApiError,
  adminPhotoQueue,
  adminPhotoReview,
  changePassword,
  describeLevelProgress,
  detectAvatarCount,
  getAvatarCatalog,
  getSession,
  loadUserAvatar,
  logout,
  removeProfilePhoto,
  requireSession,
  ROUTES,
  setAvatar,
  updateFullName,
  updateProfile,
  uploadProfilePhoto,
  userDisplayName,
} from './api.js';
import { buildAvatarPicker } from './avatar-picker.js';
import { mountMessengerSeal } from './messenger-seal.js';

const root = document.getElementById('perfil-root');
const PHOTO_MAX_BYTES = 1572864;
const NAME_MIN = 2;
const NAME_MAX = 40;
const BIO_MAX = 160;

let sessionToken = '';
let currentUser = null;
let picker = null;
let seal = null;
let pendingPhoto = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function errorText(err) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Não foi possível salvar agora.';
}

/** Mensagem da seção (cada formulário responde no próprio lugar). */
function say(section, message, isError = false) {
  const el = root.querySelector(`[data-status="${section}"]`);
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('is-error', Boolean(isError && message));
}

function q(sel) {
  return root.querySelector(sel);
}

// ─── Estrutura (desenhada uma vez) ──────────────────────────────────────────

function renderShell(user) {
  const isAdmin = user.role === 'admin';
  root.innerHTML = `
    <section class="perfil-hero hades-mirror-frame" aria-label="Cartão do herói">
      <div class="perfil-hero__portrait">
        <img class="perfil-hero__img" data-hero-img alt="" width="128" height="128">
        <span class="perfil-hero__badge" data-hero-badge hidden></span>
      </div>
      <div class="perfil-hero__id">
        <p class="perfil-hero__eyebrow" data-hero-eyebrow></p>
        <h2 class="perfil-hero__name" data-hero-name></h2>
        <p class="perfil-hero__handle" data-hero-handle></p>
        <p class="perfil-hero__civil" data-hero-civil hidden></p>
        <p class="perfil-hero__bio" data-hero-bio></p>
        <div class="perfil-hero__level">
          <span class="perfil-level" aria-label="Nível atual"><span class="perfil-level__label">Nível</span><span class="perfil-level__value" data-hero-level></span></span>
          <div class="perfil-xp" role="progressbar" aria-label="Experiência" aria-valuemin="0" data-hero-xp>
            <div class="perfil-xp__fill" data-hero-xp-fill></div>
            <span class="perfil-xp__text" data-hero-xp-text></span>
          </div>
        </div>
      </div>
      <a class="btn-gold btn-gold--ghost perfil-hero__panel" href="${ROUTES.dashboard()}">Painel do Herói</a>
    </section>

    <nav class="perfil-nav" aria-label="Seções do perfil">
      <a href="#editar">Identidade</a>
      <a href="#avatar">Avatar</a>
      <a href="#conta">Conta</a>
      ${isAdmin ? '<a href="#moderacao">Moderação</a>' : ''}
    </nav>

    <section class="perfil-card" id="editar" aria-labelledby="perfil-id-title">
      <h2 class="perfil-card__title" id="perfil-id-title">Identidade</h2>
      <p class="perfil-card__lede">Como a turma te vê no placar, nos amigos e no Salão Espiritual.</p>
      <form class="perfil-form" data-form="identity" novalidate>
        <label class="perfil-field">
          <span class="perfil-field__label">Nome de exibição <span class="perfil-field__count" data-count="displayName"></span></span>
          <input name="displayName" maxlength="${NAME_MAX}" autocomplete="nickname" placeholder="Ex.: Ceifadora do Acheron">
          <span class="perfil-field__hint">Entre ${NAME_MIN} e ${NAME_MAX} caracteres. Vazio usa o teu nome civil.</span>
        </label>
        <label class="perfil-field">
          <span class="perfil-field__label">Bio <span class="perfil-field__count" data-count="bio"></span></span>
          <textarea name="bio" maxlength="${BIO_MAX}" rows="3" placeholder="Uma linha sobre o teu herói."></textarea>
        </label>
        <div class="perfil-actions">
          <button class="btn-gold" type="submit" data-identity-save disabled>Guardar identidade</button>
          <p class="perfil-status" data-status="identity" role="status" aria-live="polite"></p>
        </div>
      </form>
    </section>

    <section class="perfil-card" id="avatar" aria-labelledby="perfil-avatar-title">
      <h2 class="perfil-card__title" id="perfil-avatar-title">Avatar</h2>
      <fieldset class="perfil-mode">
        <legend class="perfil-field__label">O que a turma vê</legend>
        <label class="perfil-mode__opt"><input type="radio" name="avatarMode" value="catalog"><span>Personagem do catálogo</span></label>
        <label class="perfil-mode__opt" data-mode-photo><input type="radio" name="avatarMode" value="photo"><span>Minha foto</span></label>
      </fieldset>
      <p class="perfil-status" data-status="mode" role="status" aria-live="polite"></p>

      <div class="perfil-photo">
        <div class="perfil-photo__frame">
          <img class="perfil-photo__img" data-photo-img alt="" width="112" height="112" hidden>
          <span class="perfil-photo__empty" data-photo-empty>Sem foto</span>
        </div>
        <div class="perfil-photo__body">
          <p class="perfil-photo__state" data-photo-state></p>
          <p class="perfil-field__hint">WEBP, PNG ou JPEG até 1,5 MB. A foto passa pela análise do Mestre antes de aparecer para a turma.</p>
          <div class="perfil-actions">
            <label class="btn-gold btn-gold--ghost perfil-file">
              Escolher imagem
              <input type="file" accept="image/webp,image/png,image/jpeg" data-photo-input>
            </label>
            <button class="btn-gold" type="button" data-photo-send hidden>Enviar para análise</button>
            <button class="btn-gold btn-gold--ghost" type="button" data-photo-cancel hidden>Descartar</button>
            <button class="btn-gold btn-gold--ghost" type="button" data-photo-remove hidden>Remover foto</button>
          </div>
          <p class="perfil-status" data-status="photo" role="status" aria-live="polite"></p>
        </div>
      </div>

      <h3 class="perfil-card__sub">Personagens do catálogo</h3>
      <div class="perfil-picker" data-picker></div>
    </section>

    <section class="perfil-card" id="conta" aria-labelledby="perfil-conta-title">
      <h2 class="perfil-card__title" id="perfil-conta-title">Conta</h2>
      <div class="perfil-grid">
        <form class="perfil-form" data-form="name">
          <h3 class="perfil-card__sub">Nome civil</h3>
          <p class="perfil-field__hint">Só tu e o Mestre veem. Pede a senha atual.</p>
          <input type="text" name="username" autocomplete="username" value="${escapeHtml(user.username || '')}" hidden tabindex="-1" aria-hidden="true">
          <label class="perfil-field"><span class="perfil-field__label">Nome civil</span>
            <input name="fullName" required maxlength="255" autocomplete="name"></label>
          <label class="perfil-field"><span class="perfil-field__label">Senha atual</span>
            <input name="currentPassword" type="password" required autocomplete="current-password"></label>
          <div class="perfil-actions">
            <button class="btn-gold" type="submit">Atualizar nome</button>
            <p class="perfil-status" data-status="name" role="status" aria-live="polite"></p>
          </div>
        </form>
        <form class="perfil-form" data-form="password">
          <h3 class="perfil-card__sub">Palavra (senha)</h3>
          <input type="text" name="username" autocomplete="username" value="${escapeHtml(user.username || '')}" hidden tabindex="-1" aria-hidden="true">
          <label class="perfil-field"><span class="perfil-field__label">Senha atual</span>
            <input name="currentPassword" type="password" required autocomplete="current-password"></label>
          <label class="perfil-field"><span class="perfil-field__label">Nova senha</span>
            <input name="newPassword" type="password" required minlength="4" autocomplete="new-password"></label>
          <label class="perfil-field"><span class="perfil-field__label">Repita a nova senha</span>
            <input name="confirmPassword" type="password" required minlength="4" autocomplete="new-password"></label>
          <div class="perfil-actions">
            <button class="btn-gold" type="submit">Trocar senha</button>
            <p class="perfil-status" data-status="password" role="status" aria-live="polite"></p>
          </div>
        </form>
      </div>
      <div class="perfil-seal" data-seal-host></div>
    </section>

    ${isAdmin ? `
    <section class="perfil-card" id="moderacao" aria-labelledby="perfil-mod-title">
      <h2 class="perfil-card__title" id="perfil-mod-title">Moderação de fotos</h2>
      <p class="perfil-card__lede">Fotos enviadas pela turma aguardando aprovação.</p>
      <p class="perfil-status" data-status="queue" role="status" aria-live="polite"></p>
      <div class="perfil-queue" data-queue></div>
    </section>` : ''}`;
}

// ─── Pintura (atualiza só o que muda) ───────────────────────────────────────

function paintHero(user) {
  const isAdmin = user.role === 'admin';
  const progress = describeLevelProgress(user.xp, { isAdmin });
  const turma = user.turma ? `Turma ${String(user.turma).toUpperCase()}` : (isAdmin ? 'Mestre do Domínio' : '');
  q('[data-hero-eyebrow]').textContent = [progress.rank, turma].filter(Boolean).join(' · ');
  q('[data-hero-name]').textContent = userDisplayName(user);
  q('[data-hero-handle]').textContent = `@${user.username || ''}`;
  const civil = q('[data-hero-civil]');
  const hasDisplay = Boolean(String(user.displayName || '').trim());
  civil.hidden = !hasDisplay;
  civil.textContent = hasDisplay ? `Nome civil: ${user.fullName || ''} (só tu vês)` : '';
  const bio = q('[data-hero-bio]');
  bio.textContent = user.bio ? `“${user.bio}”` : 'Sem bio ainda.';
  bio.classList.toggle('is-empty', !user.bio);
  q('[data-hero-level]').textContent = progress.levelLabel;
  const xp = q('[data-hero-xp]');
  xp.setAttribute('aria-valuenow', String(progress.atMax ? (progress.quota || 100) : (progress.within || 0)));
  xp.setAttribute('aria-valuemax', String(progress.quota || 100));
  q('[data-hero-xp-fill]').style.width = `${Math.max(0, Math.min(100, progress.barPercent))}%`;
  q('[data-hero-xp-text]').textContent = progress.barLabel;

  const badge = q('[data-hero-badge]');
  const pending = Boolean(user.photoPendingUrl) || user.photoStatus === 'pending';
  badge.hidden = !pending;
  badge.textContent = pending ? 'Foto em análise' : '';
  loadUserAvatar(q('[data-hero-img]'), user, { isSelf: true });
}

function paintIdentity(user, { force = false } = {}) {
  const form = q('[data-form="identity"]');
  if (force || !form.dataset.dirty) {
    form.displayName.value = user.displayName || '';
    form.bio.value = user.bio || '';
    delete form.dataset.dirty;
  }
  updateIdentityCounters();
}

function updateIdentityCounters() {
  const form = q('[data-form="identity"]');
  const name = form.displayName.value;
  const bio = form.bio.value;
  q('[data-count="displayName"]').textContent = `${name.trim().length}/${NAME_MAX}`;
  q('[data-count="bio"]').textContent = `${bio.length}/${BIO_MAX}`;
  const changed = name.trim() !== (currentUser.displayName || '') || bio.trim() !== (currentUser.bio || '');
  const nameOk = name.trim().length === 0 || name.trim().length >= NAME_MIN;
  q('[data-identity-save]').disabled = !changed || !nameOk;
  if (changed) form.dataset.dirty = '1';
  else delete form.dataset.dirty;
}

function photoStateText(user) {
  if (user.photoStatus === 'pending' || user.photoPendingUrl) {
    return { text: 'Em análise pelo Mestre. Enquanto isso a turma vê o avatar anterior.', tone: 'pending' };
  }
  if (user.photoStatus === 'rejected') {
    return { text: `Foto recusada: ${user.photoRejectReason || 'sem motivo informado'}. Podes enviar outra.`, tone: 'error' };
  }
  if (user.photoUrl) return { text: 'Foto aprovada.', tone: 'ok' };
  return { text: 'Nenhuma foto enviada.', tone: '' };
}

function paintAvatar(user) {
  const mode = (user.avatarMode || 'catalog') === 'photo' ? 'photo' : 'catalog';
  const hasApproved = Boolean(user.photoUrl);
  root.querySelectorAll('input[name="avatarMode"]').forEach((input) => {
    input.checked = input.value === mode;
  });
  const photoOpt = q('[data-mode-photo]');
  const photoRadio = photoOpt.querySelector('input');
  // "Minha foto" só pode ser escolhida com uma foto aprovada.
  photoRadio.disabled = !hasApproved && mode !== 'photo';
  photoOpt.classList.toggle('is-disabled', photoRadio.disabled);
  photoOpt.title = photoRadio.disabled ? 'Disponível depois que o Mestre aprovar a tua foto.' : '';

  const state = photoStateText(user);
  const stateEl = q('[data-photo-state]');
  stateEl.textContent = state.text;
  stateEl.dataset.tone = state.tone;

  const img = q('[data-photo-img]');
  const empty = q('[data-photo-empty]');
  const sending = Boolean(pendingPhoto);
  if (sending || user.photoPendingUrl || user.photoUrl) {
    // Prévia local > foto em análise > foto aprovada (mesmo que o modo atual seja o catálogo).
    loadUserAvatar(img, sending
      ? { photoPendingUrl: pendingPhoto }
      : { ...user, avatarMode: 'photo' }, { isSelf: true });
    img.hidden = false;
    empty.hidden = true;
  } else {
    img.hidden = true;
    empty.hidden = false;
    img.removeAttribute('src');
  }
  q('[data-photo-send]').hidden = !sending;
  q('[data-photo-cancel]').hidden = !sending;
  q('[data-photo-remove]').hidden = sending || !(user.photoUrl || user.photoPendingUrl);
  picker?.setCurrent(Number(user.avatarIndex ?? 0) || 0);
}

function paintAccount(user) {
  const form = q('[data-form="name"]');
  if (document.activeElement !== form.fullName) form.fullName.value = user.fullName || '';
  seal?.render(user);
}

function paintAll(user) {
  paintHero(user);
  paintIdentity(user);
  paintAvatar(user);
  paintAccount(user);
}

async function applyUser(next) {
  if (!next) return;
  currentUser = { ...currentUser, ...next };
  paintAll(currentUser);
}

// ─── Eventos ────────────────────────────────────────────────────────────────

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(webp|png|jpeg)$/.test(file.type)) {
      reject(new Error('Formato inválido. Envie WEBP, PNG ou JPEG.'));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      reject(new Error('Imagem grande demais (máx. 1,5 MB).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function bind() {
  const identity = q('[data-form="identity"]');
  identity.addEventListener('input', updateIdentityCounters);
  identity.addEventListener('submit', async (event) => {
    event.preventDefault();
    const save = q('[data-identity-save]');
    save.disabled = true;
    say('identity', 'Guardando…');
    try {
      const result = await updateProfile(sessionToken, {
        displayName: identity.displayName.value.trim(),
        bio: identity.bio.value.trim(),
      });
      delete identity.dataset.dirty;
      await applyUser(result.user);
      paintIdentity(currentUser, { force: true });
      say('identity', 'Identidade guardada.');
    } catch (err) {
      say('identity', errorText(err), true);
      updateIdentityCounters();
    }
  });

  root.querySelectorAll('input[name="avatarMode"]').forEach((input) => {
    input.addEventListener('change', async () => {
      if (!input.checked) return;
      say('mode', 'Atualizando…');
      try {
        const result = await updateProfile(sessionToken, { avatarMode: input.value });
        await applyUser(result.user);
        say('mode', input.value === 'photo' ? 'A turma passa a ver a tua foto.' : 'A turma passa a ver o personagem do catálogo.');
      } catch (err) {
        say('mode', errorText(err), true);
        paintAvatar(currentUser);
      }
    });
  });

  const fileInput = q('[data-photo-input]');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      pendingPhoto = await readImage(file);
      say('photo', 'Confere a prévia e envia para análise.');
    } catch (err) {
      pendingPhoto = null;
      say('photo', errorText(err), true);
    }
    fileInput.value = '';
    paintAvatar(currentUser);
  });

  q('[data-photo-cancel]').addEventListener('click', () => {
    pendingPhoto = null;
    say('photo', '');
    paintAvatar(currentUser);
  });

  q('[data-photo-send]').addEventListener('click', async () => {
    if (!pendingPhoto) return;
    const send = q('[data-photo-send]');
    send.disabled = true;
    say('photo', 'Enviando…');
    try {
      const result = await uploadProfilePhoto(sessionToken, pendingPhoto);
      pendingPhoto = null;
      await applyUser(result.user);
      say('photo', 'Foto enviada. O Mestre vai analisar.');
    } catch (err) {
      say('photo', errorText(err), true);
    } finally {
      send.disabled = false;
    }
  });

  q('[data-photo-remove]').addEventListener('click', async () => {
    if (!window.confirm('Remover a tua foto? A turma volta a ver o personagem do catálogo.')) return;
    say('photo', 'Removendo…');
    try {
      const result = await removeProfilePhoto(sessionToken);
      await applyUser(result.user);
      say('photo', 'Foto removida.');
    } catch (err) {
      say('photo', errorText(err), true);
    }
  });

  const nameForm = q('[data-form="name"]');
  nameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    say('name', 'Atualizando…');
    try {
      const result = await updateFullName(sessionToken, nameForm.fullName.value.trim(), nameForm.currentPassword.value);
      nameForm.currentPassword.value = '';
      await applyUser(result.user);
      say('name', 'Nome civil atualizado.');
    } catch (err) {
      say('name', errorText(err), true);
    }
  });

  const passForm = q('[data-form="password"]');
  passForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (passForm.newPassword.value !== passForm.confirmPassword.value) {
      say('password', 'As duas senhas novas não são iguais.', true);
      passForm.confirmPassword.focus();
      return;
    }
    say('password', 'Trocando…');
    try {
      await changePassword(sessionToken, passForm.currentPassword.value, passForm.newPassword.value);
      passForm.reset();
      say('password', 'Senha atualizada.');
    } catch (err) {
      say('password', errorText(err), true);
    }
  });
}

function mountPicker(user) {
  picker = buildAvatarPicker({
    currentIndex: Number(user.avatarIndex ?? 0) || 0,
    onConfirm: async (index) => {
      const result = await setAvatar(sessionToken, index);
      await applyUser(result.user);
      if ((currentUser.avatarMode || 'catalog') === 'photo') {
        say('mode', 'Personagem guardado. A turma só vê ele se escolheres "Personagem do catálogo".');
      }
    },
  });
  q('[data-picker]').append(picker.wrapper);
}

async function renderQueue() {
  if (currentUser?.role !== 'admin') return;
  const host = q('[data-queue]');
  if (!host) return;
  try {
    const payload = await adminPhotoQueue(sessionToken);
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) {
      host.innerHTML = '<p class="perfil-field__hint">Nenhuma foto pendente.</p>';
      return;
    }
    host.innerHTML = items.map((item) => `
      <article class="perfil-queue__item">
        <img class="perfil-queue__img" src="${escapeHtml(item.photoPendingUrl)}" alt="Foto enviada por ${escapeHtml(item.fullName || item.username)}">
        <form class="perfil-form" data-review="${Number(item.userId)}">
          <strong>${escapeHtml(item.fullName || item.username)}</strong>
          <span class="perfil-field__hint">@${escapeHtml(item.username)} ${escapeHtml(item.turma || '')}</span>
          <label class="perfil-field"><span class="perfil-field__label">Motivo, se recusar</span>
            <input name="reason" maxlength="160"></label>
          <div class="perfil-actions">
            <button class="btn-gold" type="submit" name="decision" value="approve">Aprovar</button>
            <button class="btn-gold btn-gold--ghost" type="submit" name="decision" value="reject">Recusar</button>
          </div>
        </form>
      </article>`).join('');
    host.querySelectorAll('[data-review]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const decision = event.submitter?.value || 'reject';
        const reason = String(new FormData(form).get('reason') || '');
        try {
          await adminPhotoReview(sessionToken, Number(form.getAttribute('data-review')), decision, reason);
          say('queue', decision === 'approve' ? 'Foto aprovada.' : 'Foto recusada.');
          await renderQueue();
        } catch (err) {
          say('queue', errorText(err), true);
        }
      });
    });
  } catch (err) {
    host.innerHTML = '';
    say('queue', errorText(err), true);
  }
}

function scrollToHash() {
  const id = (location.hash || '').replace('#', '');
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

/** ?selo=1 (vindo do lembrete do Mensageiro) abre a Conta com o campo de e-mail em foco. */
function focusSealFromQuery() {
  if (new URLSearchParams(location.search).get('selo') !== '1') return;
  document.getElementById('conta')?.scrollIntoView({ block: 'start' });
  document.getElementById('messenger-input')?.focus();
}

async function boot() {
  const auth = await requireSession();
  if (!auth?.session || !auth.user || !root) return;
  sessionToken = auth.session.token;
  currentUser = auth.user;
  initAppShell({
    route: 'perfil',
    role: auth.user.role || 'student',
    user: auth.user,
    token: sessionToken,
    onLogout: () => logout(),
  });
  await detectAvatarCount();
  getAvatarCatalog();
  renderShell(currentUser);
  bind();
  mountPicker(currentUser);
  seal = mountMessengerSeal(q('[data-seal-host]'), {
    getUser: () => currentUser,
    getToken: () => sessionToken || getSession()?.token,
    onUser: (patch) => applyUser(patch),
  });
  paintAll(currentUser);
  await renderQueue();
  scrollToHash();
  focusSealFromQuery();
  window.addEventListener('hashchange', scrollToHash);
}

boot();
