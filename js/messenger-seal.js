/**
 * Selo do Mensageiro (e-mail de recuperação da Palavra) — opcional para alunos, oculto para o Mestre.
 * Saiu do Painel do Herói para a seção Conta do Perfil.
 *
 * mountMessengerSeal(host, { getUser, getToken, onUser }) → { render(user) }
 */

import { ApiError, bindEmail, needsMessengerSeal, requestEmailVerification } from './api.js';

const RESEND_COPY = 'Se o selo ainda estiver pendente, o Mensageiro já partiu. Olhe a caixa — e o reino das promoções.';
const FAILED_COPY = 'O Mensageiro não partiu. Olhe o spam ou avise o Mestre — canal de e-mail.';
const BIND_FAILED_COPY = 'O endereço foi gravado, mas o Mensageiro não partiu. Avise o Mestre — canal de e-mail.';

export function maskEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 1 || at === value.length - 1) return '•••';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const keep = local.length >= 2 ? 2 : 1;
  return `${local.slice(0, keep)}***@${domain}`;
}

export function messengerSealKind(user) {
  const email = String(user?.email || '').trim();
  if (!email) return 'empty';
  if (user.emailVerifiedAt) return 'confirmed';
  return 'pending';
}

export function mountMessengerSeal(host, { getUser, getToken, onUser } = {}) {
  if (!host) return { render() {} };
  host.innerHTML = `
    <section class="messenger-seal" data-seal>
      <h3 class="messenger-seal__title">Selo do Mensageiro</h3>
      <p class="messenger-seal__state" data-seal-state></p>
      <p class="messenger-seal__email" data-seal-email hidden></p>
      <p class="messenger-seal__status" data-seal-status role="status" aria-live="polite"></p>
      <form class="messenger-seal__form" data-seal-form hidden>
        <label class="messenger-seal__label" for="messenger-input">E-mail</label>
        <input class="messenger-seal__input" type="email" id="messenger-input" name="email"
          placeholder="Ex.: maria.silva@email.com" autocomplete="email" inputmode="email" required>
        <div class="messenger-seal__actions">
          <button class="btn-gold" type="submit" data-seal-bind>Vincular e-mail</button>
          <button class="btn-gold btn-gold--ghost" type="button" data-seal-cancel hidden>Cancelar</button>
        </div>
      </form>
      <div class="messenger-seal__actions" data-seal-actions>
        <button class="btn-gold btn-gold--ghost" type="button" data-seal-resend>Confirmar o selo</button>
        <button class="btn-gold btn-gold--ghost" type="button" data-seal-change>Trocar endereço</button>
      </div>
    </section>`;

  const q = (sel) => host.querySelector(sel);
  const seal = q('[data-seal]');
  const stateEl = q('[data-seal-state]');
  const emailEl = q('[data-seal-email]');
  const statusEl = q('[data-seal-status]');
  const form = q('[data-seal-form]');
  const input = q('#messenger-input');
  const bindBtn = q('[data-seal-bind]');
  const cancelBtn = q('[data-seal-cancel]');
  const actions = q('[data-seal-actions]');
  const resendBtn = q('[data-seal-resend]');
  const changeBtn = q('[data-seal-change]');
  let showForm = false;

  const setStatus = (message, isError = false) => {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-error', Boolean(isError && message));
  };

  function render(user = getUser?.()) {
    if (!user || user.role === 'admin') {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const kind = messengerSealKind(user);
    const formOpen = kind === 'empty' || showForm;
    seal.classList.toggle('messenger-seal--nudge', needsMessengerSeal(user) && kind !== 'confirmed');

    stateEl.textContent = kind === 'empty'
      ? 'O Mensageiro é opcional — sem ele, peça ao Mestre se a Palavra se perder. Vincule um e-mail se quiser recuperar sozinho.'
      : kind === 'pending'
        ? 'O selo ainda não foi reconhecido. Abra o Mensageiro na caixa de entrada — e o reino das promoções. Você já pode usar o Domínio.'
        : 'Selo reconhecido. A Palavra pode ser recuperada por este endereço.';

    emailEl.hidden = kind === 'empty';
    emailEl.textContent = kind === 'empty' ? '' : maskEmail(user.email);

    form.hidden = !formOpen;
    cancelBtn.hidden = kind === 'empty' || !formOpen;
    bindBtn.textContent = kind === 'empty' ? 'Vincular e-mail' : 'Selar novo endereço';
    if (!formOpen) input.value = '';

    // Form e ações nunca juntos; reenviar só no pendente.
    actions.hidden = formOpen;
    resendBtn.hidden = kind !== 'pending';
    changeBtn.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = String(input.value || '').trim();
    if (!email) {
      setStatus('Informe um e-mail.', true);
      return;
    }
    const token = getToken?.();
    if (!token) return;
    bindBtn.disabled = true;
    setStatus('Chamando o Mensageiro...');
    try {
      const result = await bindEmail(token, email);
      showForm = false;
      const patch = result.user || { email: result.email, emailVerifiedAt: result.emailVerifiedAt ?? null };
      onUser?.(patch);
      setStatus(result.mailSent === false
        ? BIND_FAILED_COPY
        : 'O Mensageiro partiu. Confirme o selo na caixa de entrada — e o reino das promoções.', result.mailSent === false);
      render();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'Falha ao vincular o e-mail.', true);
    } finally {
      bindBtn.disabled = false;
    }
  });

  resendBtn.addEventListener('click', async () => {
    const token = getToken?.();
    if (!token) return;
    resendBtn.disabled = true;
    setStatus('Chamando o Mensageiro...');
    try {
      const result = await requestEmailVerification(token);
      setStatus(result?.mailSent === false ? FAILED_COPY : RESEND_COPY, result?.mailSent === false);
    } catch (error) {
      setStatus(error instanceof ApiError
        ? error.message
        : 'Falha ao chamar o Mensageiro. Avise o Mestre — canal de e-mail.', true);
    } finally {
      resendBtn.disabled = false;
    }
  });

  changeBtn.addEventListener('click', () => {
    showForm = true;
    setStatus('');
    render();
    input.focus();
  });

  cancelBtn.addEventListener('click', () => {
    showForm = false;
    setStatus('');
    render();
  });

  render();
  return { render };
}
