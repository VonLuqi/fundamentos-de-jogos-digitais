import { initAppShell } from './app-shell.js?v=20261028a';
import {
  ApiError,
  adminPhotoQueue,
  adminPhotoReview,
  changePassword,
  detectAvatarCount,
  getAvatarCatalog,
  loadAvatarImage,
  loadUserAvatar,
  logout,
  removeProfilePhoto,
  requireSession,
  setAvatar,
  updateFullName,
  updateProfile,
  uploadProfilePhoto,
} from './api.js?v=20261028a';

const root = document.getElementById('perfil-root');
let sessionToken = '';
let currentUser = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBox(message, isError) {
  const el = root?.querySelector('[data-perfil-status]');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('is-error', Boolean(isError));
}

function errorText(err) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Não foi possível salvar agora.';
}

async function paintPortrait(user) {
  const img = root?.querySelector('[data-perfil-portrait]');
  if (!img) return;
  await loadUserAvatar(img, user, { isSelf: true });
}

function render(user, catalog) {
  const display = user.displayName || user.fullName || user.username || 'Herói';
  const pending = user.photoStatus === 'pending';
  const rejected = user.photoStatus === 'rejected';
  const avatarIndex = Number(user.avatarIndex ?? 0) || 0;
  const avatars = catalog.map((entry, index) => `
    <button type="button" class="perfil-avatar${index === avatarIndex ? ' is-current' : ''}" data-avatar-index="${index}" aria-label="${escapeHtml(entry.label || 'Avatar')}">
      <img alt="" width="72" height="72" data-catalog-index="${index}">
    </button>`).join('');

  root.innerHTML = `
    <p class="perfil-status" data-perfil-status role="status"></p>
    <section class="perfil-card perfil-hero">
      <img class="perfil-portrait" data-perfil-portrait alt="" width="96" height="96">
      <div class="perfil-identity">
        <strong>${escapeHtml(display)}</strong>
        <span>@${escapeHtml(user.username || '')}</span>
        <span>${escapeHtml(user.bio || 'Sem bio ainda.')}</span>
        ${pending ? '<span class="perfil-note">Foto em análise.</span>' : ''}
        ${rejected ? `<span class="perfil-note">${escapeHtml(user.photoRejectReason || 'A foto foi recusada.')}</span>` : ''}
      </div>
    </section>
    <section class="perfil-card" id="editar">
      <h2>Nome e bio</h2>
      <form class="perfil-form" data-form="identity">
        <label>Nome de exibição
          <input name="displayName" maxlength="40" value="${escapeHtml(user.displayName || '')}" autocomplete="nickname">
        </label>
        <label>Bio
          <textarea name="bio" maxlength="160" rows="3">${escapeHtml(user.bio || '')}</textarea>
        </label>
        <div class="perfil-actions">
          <button class="btn-gold" type="submit">Guardar</button>
        </div>
      </form>
    </section>
    <section class="perfil-card" id="avatar">
      <h2>Avatar</h2>
      <div class="perfil-avatars">${avatars}</div>
      <form class="perfil-form" data-form="photo">
        <label>Foto (WEBP, PNG ou JPEG, até 1,5 MB)
          <input name="photo" type="file" accept="image/webp,image/png,image/jpeg">
        </label>
        <div class="perfil-actions">
          <button class="btn-gold" type="submit">Enviar foto</button>
          <button class="btn-gold btn-gold--ghost" type="button" data-photo-remove>Remover foto</button>
          <button class="btn-gold btn-gold--ghost" type="button" data-mode="catalog">Usar o catálogo</button>
          <button class="btn-gold btn-gold--ghost" type="button" data-mode="photo">Usar a foto</button>
        </div>
      </form>
    </section>
    <section class="perfil-card" id="conta">
      <h2>Conta</h2>
      <form class="perfil-form" data-form="name">
        <label>Nome civil
          <input name="fullName" required maxlength="255" value="${escapeHtml(user.fullName || '')}" autocomplete="name">
        </label>
        <label>Senha atual
          <input name="currentPassword" type="password" required autocomplete="current-password">
        </label>
        <div class="perfil-actions">
          <button class="btn-gold" type="submit">Atualizar nome</button>
        </div>
      </form>
      <form class="perfil-form" data-form="password">
        <label>Senha atual
          <input name="currentPassword" type="password" required autocomplete="current-password">
        </label>
        <label>Nova senha
          <input name="newPassword" type="password" required minlength="4" autocomplete="new-password">
        </label>
        <div class="perfil-actions">
          <button class="btn-gold" type="submit">Trocar senha</button>
        </div>
      </form>
    </section>
    <section class="perfil-card" id="moderacao" hidden>
      <h2>Fotos em análise</h2>
      <div class="perfil-queue" data-queue></div>
    </section>`;

  root.querySelectorAll('[data-catalog-index]').forEach((img) => {
    loadAvatarImage(img, Number(img.getAttribute('data-catalog-index')));
  });
  paintPortrait(user);
  bind(user);
  scrollToHash();
}

function scrollToHash() {
  const id = (location.hash || '').replace('#', '');
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

async function applyUser(next) {
  if (!next) return;
  currentUser = next;
  const catalog = getAvatarCatalog();
  render(next, catalog);
}

function bind(user) {
  root.querySelector('[data-form="identity"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await updateProfile(sessionToken, {
        displayName: String(data.get('displayName') || ''),
        bio: String(data.get('bio') || ''),
      });
      await applyUser(result.user || user);
      statusBox('Perfil guardado.');
    } catch (err) {
      statusBox(errorText(err), true);
    }
  });

  root.querySelectorAll('[data-avatar-index]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const result = await setAvatar(sessionToken, Number(button.getAttribute('data-avatar-index')));
        await applyUser(result.user || user);
        statusBox('Avatar atualizado.');
      } catch (err) {
        statusBox(errorText(err), true);
      }
    });
  });

  root.querySelector('[data-form="photo"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = event.currentTarget.photo?.files?.[0];
    if (!file) {
      statusBox('Escolha uma imagem.', true);
      return;
    }
    try {
      const dataUrl = await readImage(file);
      const result = await uploadProfilePhoto(sessionToken, dataUrl);
      await applyUser(result.user || user);
      statusBox('Foto enviada para análise.');
    } catch (err) {
      statusBox(errorText(err), true);
    }
  });

  root.querySelector('[data-photo-remove]')?.addEventListener('click', async () => {
    try {
      const result = await removeProfilePhoto(sessionToken);
      await applyUser(result.user || user);
      statusBox('Foto removida.');
    } catch (err) {
      statusBox(errorText(err), true);
    }
  });

  root.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const result = await updateProfile(sessionToken, { avatarMode: button.getAttribute('data-mode') });
        await applyUser(result.user || user);
        statusBox('Modo de avatar atualizado.');
      } catch (err) {
        statusBox(errorText(err), true);
      }
    });
  });

  root.querySelector('[data-form="name"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await updateFullName(sessionToken, String(data.get('fullName') || ''), String(data.get('currentPassword') || ''));
      await applyUser(result.user || user);
      statusBox('Nome civil atualizado.');
    } catch (err) {
      statusBox(errorText(err), true);
    }
  });

  root.querySelector('[data-form="password"]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await changePassword(sessionToken, String(data.get('currentPassword') || ''), String(data.get('newPassword') || ''));
      event.currentTarget.reset();
      statusBox('Senha atualizada.');
    } catch (err) {
      statusBox(errorText(err), true);
    }
  });
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(webp|png|jpeg)$/.test(file.type)) {
      reject(new Error('Formato inválido. Envie WEBP, PNG ou JPEG.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      if (value.length > 1572864 * 4 / 3 + 128) {
        reject(new Error('Imagem grande demais (máx. 1,5 MB).'));
        return;
      }
      resolve(value);
    };
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function renderQueue() {
  if (currentUser?.role !== 'admin') return;
  const section = root.querySelector('#moderacao');
  const host = root.querySelector('[data-queue]');
  if (!section || !host) return;
  section.hidden = false;
  try {
    const payload = await adminPhotoQueue(sessionToken);
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) {
      host.innerHTML = '<p class="perfil-note">Nenhuma foto pendente.</p>';
      return;
    }
    host.innerHTML = items.map((item) => `
      <article>
        <img src="${escapeHtml(item.photoPendingUrl)}" alt="">
        <form class="perfil-form" data-review="${Number(item.userId)}">
          <strong>${escapeHtml(item.fullName || item.username)}</strong>
          <span class="perfil-note">@${escapeHtml(item.username)} ${escapeHtml(item.turma || '')}</span>
          <label>Motivo, se recusar
            <input name="reason" maxlength="160">
          </label>
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
          statusBox(decision === 'approve' ? 'Foto aprovada.' : 'Foto recusada.');
          await renderQueue();
        } catch (err) {
          statusBox(errorText(err), true);
        }
      });
    });
  } catch (err) {
    host.innerHTML = `<p class="perfil-note">${escapeHtml(errorText(err))}</p>`;
  }
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
  render(auth.user, getAvatarCatalog());
  await renderQueue();
  window.addEventListener('hashchange', scrollToHash);
}

boot();
