'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bindUppercaseCodeInput(input) {
  if (!input) return;
  const forceUpper = () => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = String(input.value || '').toUpperCase();
    if (input.value !== next) {
      input.value = next;
      if (typeof start === 'number' && typeof end === 'number') {
        input.setSelectionRange(start, end);
      }
    }
  };
  input.addEventListener('input', forceUpper);
  input.addEventListener('blur', forceUpper);
  forceUpper();
}

/**
 * Tela inicial: entrar por código / criar sala (admin).
 */
export function renderGate(root, {
  isAdmin,
  onJoin,
  onCreate,
  busy = false,
  initialCode = '',
}) {
  root.innerHTML = `
    <section class="classind-gate" aria-label="Entrar no ClassInd-dle">
      <p class="lesson-chip">Higher / Lower · ao vivo</p>
      <h2 class="lesson-title">Qual exige a idade mais alta?</h2>
      <p>Entre com o código do Mestre. O placar sobe em tempo real; a resposta só aparece após o revelar.</p>
      <div class="classind-gate__grid">
        <div class="classind-panel">
          <h3>Entrar na sala</h3>
          <p>Digite o código projetado no telão (4–6 caracteres).</p>
          <div class="classind-field">
            <label for="classind-join-code">Código</label>
            <input
              id="classind-join-code"
              class="classind-join-code"
              name="code"
              maxlength="6"
              autocomplete="off"
              spellcheck="false"
              autocapitalize="characters"
              value="${escapeHtml(String(initialCode || '').toUpperCase())}"
              placeholder="STYX"
            />
          </div>
          <button type="button" class="lesson-cta" id="classind-join-btn" ${busy ? 'disabled' : ''}>Entrar</button>
        </div>
        ${isAdmin ? `
        <div class="classind-panel">
          <h3>Painel do Mestre</h3>
          <p>Crie uma sala para a turma. O código fica grande no topo para o telão.</p>
          <div class="classind-field">
            <label for="classind-turma">Turma (opcional)</label>
            <select id="classind-turma">
              <option value="">Qualquer</option>
              <option value="TCG01">TCG01</option>
              <option value="TCG02">TCG02</option>
            </select>
          </div>
          <label class="classind-field" style="flex-direction:row;align-items:center;gap:0.5rem;">
            <input type="checkbox" id="classind-require-all" />
            <span>Exigir todos os votos antes de revelar</span>
          </label>
          <button type="button" class="lesson-cta" id="classind-create-btn" ${busy ? 'disabled' : ''}>Criar sala</button>
        </div>` : `
        <div class="classind-panel">
          <h3>Aguardando o Mestre</h3>
          <p>Quando a sala estiver aberta, use o código anunciado. Volte à Aula 05 se ainda estiver nos Fundamentos.</p>
          <a class="lesson-cta lesson-cta--ghost" href="./aula5.html">Voltar à Aula 05</a>
        </div>`}
      </div>
    </section>
  `;

  const joinInput = root.querySelector('#classind-join-code');
  bindUppercaseCodeInput(joinInput);
  const joinBtn = root.querySelector('#classind-join-btn');
  joinBtn?.addEventListener('click', () => onJoin(joinInput?.value || ''));
  joinInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onJoin(joinInput.value || '');
  });

  const createBtn = root.querySelector('#classind-create-btn');
  createBtn?.addEventListener('click', () => {
    const turma = root.querySelector('#classind-turma')?.value || null;
    const requireAllVotes = Boolean(root.querySelector('#classind-require-all')?.checked);
    onCreate({ turma: turma || undefined, settings: { requireAllVotes } });
  });
}
