/**
 * Wizard IARC de mesa + Patch Note procedural (Aula 05).
 */

'use strict';

import { PITCHES, getPitchById, pickRandomPitch } from './config/pitches.js';
import { generateProceduralPitch } from './config/procedural-pitches.js';

const CLASSIND_TABLE = [
  { rating: 'L', label: 'Livre', tip: 'Sem eixos relevantes; violência inexistente ou só comicidade leve.' },
  { rating: '10', label: '10 anos', tip: 'Violência fantasiosa / medo leve; sem gore nem sexo.' },
  { rating: '12', label: '12 anos', tip: 'Violência mais presente; temas sexuais insinuados.' },
  { rating: '14', label: '14 anos', tip: 'Violência intensa; sexualidade/drogas em menção.' },
  { rating: '16', label: '16 anos', tip: 'Violência forte; conteúdo sexual/drogas em destaque.' },
  { rating: '18', label: '18 anos', tip: 'Gore extremo; sexo explícito; drogas glamourizadas.' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function val(root, id) {
  return root.querySelector(`#${id}`)?.value?.trim() || '';
}

function setStatus(root, message, kind = 'info') {
  const el = root.querySelector('#iarc-wizard-status');
  if (!el) return;
  el.className = `gdd-save-status is-${kind}`;
  el.textContent = message;
}

export function buildPatchNote({
  pitch,
  visual,
  narrative,
  reward,
  enemies,
  coreLoop,
  targetRating,
  argumentsText,
}) {
  const faixa = targetRating === 'L' ? 'Livre (L)' : '10 anos';
  return [
    `# Patch Note de Higienização — ${pitch.title}`,
    '',
    `## Design original (por que ${pitch.originalRating}+)`,
    `- Visual: ${pitch.original.visual}`,
    `- Narrativa: ${pitch.original.narrative}`,
    `- Cura/recompensa: ${pitch.original.reward}`,
    `- Ameaças: ${pitch.original.enemies}`,
    `- Eixos: violência — ${pitch.axes.violencia}`,
    `- Eixos: sexo — ${pitch.axes.sexo}`,
    `- Eixos: drogas — ${pitch.axes.drogas}`,
    '',
    `## Design proposto (${faixa})`,
    `- Feedback visual: ${visual}`,
    `- Narrativa / temática: ${narrative}`,
    `- Mecânica de cura/recompensa: ${reward}`,
    `- Inimigos / ameaças: ${enemies}`,
    '',
    '## Mecânica-core preservada',
    coreLoop || pitch.coreLoop,
    '',
    '## Argumentos ClassInd / IARC',
    argumentsText,
    '',
    '## Autoavaliação da faixa-alvo',
    `Faixa-alvo declarada: **${faixa}**.`,
    '',
  ].join('\n');
}

export function buildNotesFromWizard(data) {
  return [
    `1) Pitch escolhido: ${data.pitch.title}`,
    `2) Por que o original seria ${data.pitch.originalRating}+: violência=${data.pitch.axes.violencia} | sexo=${data.pitch.axes.sexo} | drogas=${data.pitch.axes.drogas}`,
    `3) Reescrita — feedback visual: ${data.visual}`,
    `4) Reescrita — narrativa / temática: ${data.narrative}`,
    `5) Reescrita — mecânica de cura/recompensa: ${data.reward}`,
    `6) Mecânica-core preservada: ${data.coreLoop || data.pitch.coreLoop}`,
    `7) Faixa-alvo (${data.targetRating === 'L' ? 'L' : '10'}) e argumentos: ${data.argumentsText}`,
    '8) Observações / dúvidas: ...',
  ].join('\n');
}

export function buildSummaryFromWizard(data) {
  const faixa = data.targetRating === 'L' ? 'Livre' : '10';
  return [
    'No ClassInd-dle, pequenos feedbacks (sangue, cadáveres, temas sexuais) mudaram a faixa mais do que o “gênero” do jogo.',
    `No pitch ${data.pitch.title} (${data.pitch.originalRating}+), higienizamos visual/narrativa/cura para mirar ${faixa}:`,
    `${data.visual} / ${data.reward}.`,
    `A mecânica-core permanece: ${data.coreLoop || data.pitch.coreLoop}.`,
    `Argumento ClassInd/IARC: ${data.argumentsText}`,
  ].join(' ');
}

/**
 * @param {HTMLElement} mount
 * @param {{ onFinalize?: (payload: { notes: string, summary: string, patchNote: string, data: object }) => void|Promise<void> }} options
 */
export function initIarcWizard(mount, { onFinalize } = {}) {
  if (!mount) return;

  /** @type {import('./config/pitches.js').Pitch} */
  let activePitch = generateProceduralPitch();
  let presetCursor = 0;
  let lastPayload = null;
  let draft = {
    visual: '',
    narrative: '',
    reward: '',
    enemies: '',
    coreLoop: activePitch.coreLoop,
    argumentsText: '',
    targetRating: 'L',
  };

  function readDraft() {
    draft = {
      visual: val(mount, 'iarc-visual') || draft.visual,
      narrative: val(mount, 'iarc-narrative') || draft.narrative,
      reward: val(mount, 'iarc-reward') || draft.reward,
      enemies: val(mount, 'iarc-enemies') || draft.enemies,
      coreLoop: val(mount, 'iarc-core') || activePitch.coreLoop,
      argumentsText: val(mount, 'iarc-args') || draft.argumentsText,
      targetRating: mount.querySelector('input[name="iarc-target"]:checked')?.value || draft.targetRating || 'L',
    };
  }

  function collectData() {
    readDraft();
    return {
      pitch: activePitch,
      ...draft,
      coreLoop: draft.coreLoop || activePitch.coreLoop,
    };
  }

  function nextPreset() {
    const pitch = PITCHES[presetCursor % PITCHES.length] || pickRandomPitch();
    presetCursor += 1;
    return pitch;
  }

  function render() {
    const pitch = activePitch;
    const sourceLabel = pitch.procedural ? 'Desafio gerado agora' : 'Exemplo da aula';
    const hasPatch = Boolean(lastPayload?.patchNote);

    mount.innerHTML = `
      <section class="iarc-wizard" aria-label="Adequação reversa — simulação IARC de mesa">
        <header class="iarc-wizard__intro">
          <p class="lesson-chip">Parte 2 · Adequação reversa</p>
          <h3 class="lesson-subtitle">Simulação IARC de mesa</h3>
          <p>
            Imagine que você preenche o formulário das lojas digitais: o ClassInd/IARC lê o que o jogador
            <em>vê e sente</em>, não só o “gênero” do jogo. Sua missão é pegar um pitch <strong>16+/18+</strong>
            e redesenhar feedbacks até <strong>Livre (L)</strong> ou no máximo <strong>10</strong>,
            <strong>sem matar o loop-core</strong> (o verbo do jogo).
          </p>
        </header>

        <ol class="iarc-wizard__steps" aria-label="Passos">
          <li class="iarc-step">
            <p class="iarc-step__num">1</p>
            <div class="iarc-step__body">
              <h4 class="iarc-step__title">Receba o desafio</h4>
              <p class="iarc-step__lead">Gere um pitch procedural ou use um exemplo da aula.</p>
              <div class="iarc-wizard__row">
                <button type="button" class="lesson-cta" id="iarc-new-challenge">Novo desafio</button>
                <button type="button" class="lesson-cta lesson-cta--ghost" id="iarc-preset">Usar exemplo da aula</button>
              </div>
              <p class="iarc-wizard__hint">${escapeHtml(sourceLabel)} · ${escapeHtml(pitch.title)} (${escapeHtml(pitch.originalRating)}+)</p>
            </div>
          </li>

          <li class="iarc-step">
            <p class="iarc-step__num">2</p>
            <div class="iarc-step__body">
              <h4 class="iarc-step__title">Leia o original (por que a faixa sobe)</h4>
              <div class="iarc-wizard__original">
                <ul class="lesson-list">
                  <li><strong>Loop-core:</strong> ${escapeHtml(pitch.coreLoop)}</li>
                  <li><strong>Visual:</strong> ${escapeHtml(pitch.original.visual)}</li>
                  <li><strong>Narrativa:</strong> ${escapeHtml(pitch.original.narrative)}</li>
                  <li><strong>Cura/recompensa:</strong> ${escapeHtml(pitch.original.reward)}</li>
                  <li><strong>Ameaças:</strong> ${escapeHtml(pitch.original.enemies)}</li>
                </ul>
                <p><strong>Eixos:</strong> violência — ${escapeHtml(pitch.axes.violencia)} · sexo — ${escapeHtml(pitch.axes.sexo)} · drogas — ${escapeHtml(pitch.axes.drogas)}</p>
                <p class="iarc-wizard__hint"><strong>Pistas:</strong> ${escapeHtml(pitch.hints.join(' · '))}</p>
              </div>
              <details class="iarc-wizard__table">
                <summary>Consulta rápida — faixas ClassInd</summary>
                <ul class="lesson-list">
                  ${CLASSIND_TABLE.map((row) => `
                    <li><strong>${escapeHtml(row.rating)} — ${escapeHtml(row.label)}:</strong> ${escapeHtml(row.tip)}</li>
                  `).join('')}
                </ul>
                <p class="iarc-wizard__hint">Atenuantes: fantasia, não-humano, comicidade. Agravantes: gore, realismo, cadáveres, glamourização.</p>
              </details>
            </div>
          </li>

          <li class="iarc-step">
            <p class="iarc-step__num">3</p>
            <div class="iarc-step__body">
              <h4 class="iarc-step__title">Reescreva os feedbacks</h4>
              <p class="iarc-step__lead">Mude o que o jogador vê/sente. Mantenha o verbo do jogo.</p>
              <div class="iarc-wizard__field">
                <label for="iarc-visual">Feedback visual *</label>
                <textarea id="iarc-visual" rows="2" placeholder="Ex.: robôs de sucata; faíscas no lugar de sangue">${escapeHtml(draft.visual)}</textarea>
              </div>
              <div class="iarc-wizard__field">
                <label for="iarc-narrative">Narrativa / temática *</label>
                <textarea id="iarc-narrative" rows="2" placeholder="Ex.: invasão de autômatos em cidade fantástica">${escapeHtml(draft.narrative)}</textarea>
              </div>
              <div class="iarc-wizard__field">
                <label for="iarc-reward">Cura / recompensa *</label>
                <textarea id="iarc-reward" rows="2" placeholder="Ex.: bateria mágica / núcleo de luz">${escapeHtml(draft.reward)}</textarea>
              </div>
              <div class="iarc-wizard__field">
                <label for="iarc-enemies">Inimigos / ameaças *</label>
                <textarea id="iarc-enemies" rows="2" placeholder="Ex.: drones e golems sem anatomia humana">${escapeHtml(draft.enemies)}</textarea>
              </div>
              <div class="iarc-wizard__field">
                <label for="iarc-core">Mecânica-core preservada</label>
                <input id="iarc-core" type="text" maxlength="200" value="${escapeHtml(draft.coreLoop || pitch.coreLoop)}" />
              </div>
            </div>
          </li>

          <li class="iarc-step">
            <p class="iarc-step__num">4</p>
            <div class="iarc-step__body">
              <h4 class="iarc-step__title">Argumente a faixa-alvo</h4>
              <div class="iarc-wizard__field">
                <label for="iarc-args">Argumentos ClassInd / IARC *</label>
                <textarea id="iarc-args" rows="3" placeholder="Ex.: violência contra não-humanos sem sangue + cura fantástica = atenuantes para L/10">${escapeHtml(draft.argumentsText)}</textarea>
              </div>
              <fieldset class="iarc-wizard__rating">
                <legend>Faixa-alvo *</legend>
                <label><input type="radio" name="iarc-target" value="L" ${draft.targetRating !== '10' ? 'checked' : ''} /> Livre (L)</label>
                <label><input type="radio" name="iarc-target" value="10" ${draft.targetRating === '10' ? 'checked' : ''} /> 10 anos</label>
              </fieldset>
            </div>
          </li>

          <li class="iarc-step">
            <p class="iarc-step__num">5</p>
            <div class="iarc-step__body">
              <h4 class="iarc-step__title">Gere o Patch Note e finalize</h4>
              <p class="iarc-step__lead">Gere o artefato, revise o texto e finalize a aula (grava no Grimório).</p>
              <div class="iarc-wizard__actions iarc-wizard__actions--stack">
                <button type="button" class="lesson-cta" id="iarc-generate">Gerar Patch Note</button>
                <div class="iarc-wizard__actions-row">
                  <button type="button" class="lesson-cta" id="iarc-finalize" ${hasPatch ? '' : 'disabled'}>Finalizar aula</button>
                  <button type="button" class="lesson-cta lesson-cta--ghost" id="iarc-copy" ${hasPatch ? '' : 'disabled'}>Copiar</button>
                  <button type="button" class="lesson-cta lesson-cta--ghost" id="iarc-download" ${hasPatch ? '' : 'disabled'}>Baixar .md</button>
                </div>
              </div>
              <p id="iarc-wizard-status" class="gdd-save-status" aria-live="polite"></p>
              <div class="iarc-wizard__field">
                <label for="iarc-output">Patch Note gerado</label>
                <textarea id="iarc-output" class="iarc-wizard__output" rows="14" readonly placeholder="O Patch Note aparece aqui após gerar.">${escapeHtml(lastPayload?.patchNote || '')}</textarea>
              </div>
            </div>
          </li>
        </ol>
      </section>
    `;

    const enableExports = (enabled) => {
      ['iarc-finalize', 'iarc-copy', 'iarc-download'].forEach((id) => {
        const btn = mount.querySelector(`#${id}`);
        if (btn) btn.disabled = !enabled;
      });
    };
    if (lastPayload) enableExports(true);

    mount.querySelector('#iarc-new-challenge')?.addEventListener('click', () => {
      readDraft();
      activePitch = generateProceduralPitch();
      draft.coreLoop = activePitch.coreLoop;
      draft.visual = '';
      draft.narrative = '';
      draft.reward = '';
      draft.enemies = '';
      draft.argumentsText = '';
      lastPayload = null;
      render();
      setStatus(mount, `Novo desafio: ${activePitch.title}`, 'success');
    });

    mount.querySelector('#iarc-preset')?.addEventListener('click', () => {
      readDraft();
      activePitch = nextPreset() || getPitchById(PITCHES[0]?.id) || pickRandomPitch();
      draft.coreLoop = activePitch.coreLoop;
      lastPayload = null;
      render();
      setStatus(mount, `Exemplo: ${activePitch.title}`, 'success');
    });

    mount.querySelector('#iarc-generate')?.addEventListener('click', () => {
      const data = collectData();
      const missing = [];
      if (!data.visual) missing.push('visual');
      if (!data.narrative) missing.push('narrativa');
      if (!data.reward) missing.push('cura/recompensa');
      if (!data.enemies) missing.push('inimigos');
      if (!data.argumentsText) missing.push('argumentos');
      if (missing.length) {
        setStatus(mount, `Preencha: ${missing.join(', ')}.`, 'error');
        enableExports(false);
        return;
      }

      const patchNote = buildPatchNote(data);
      const notes = buildNotesFromWizard(data);
      const summary = buildSummaryFromWizard(data);
      lastPayload = { notes, summary, patchNote, data };

      const out = mount.querySelector('#iarc-output');
      if (out) out.value = patchNote;
      enableExports(true);
      setStatus(mount, 'Patch Note pronto. Finalize a aula ou baixe o .md.', 'success');
    });

    mount.querySelector('#iarc-finalize')?.addEventListener('click', async () => {
      if (!lastPayload) {
        setStatus(mount, 'Gere o Patch Note antes de finalizar.', 'error');
        return;
      }
      const btn = mount.querySelector('#iarc-finalize');
      if (btn) btn.disabled = true;
      try {
        await onFinalize?.(lastPayload);
        setStatus(mount, 'Aula finalizada. Patch Note enviado ao Grimório.', 'success');
      } catch (error) {
        setStatus(mount, error?.message || 'Falha ao finalizar.', 'error');
        if (btn) btn.disabled = false;
      }
    });

    mount.querySelector('#iarc-copy')?.addEventListener('click', async () => {
      const text = mount.querySelector('#iarc-output')?.value || '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus(mount, 'Patch Note copiado.', 'success');
      } catch {
        setStatus(mount, 'Não foi possível copiar automaticamente.', 'error');
      }
    });

    mount.querySelector('#iarc-download')?.addEventListener('click', () => {
      const text = mount.querySelector('#iarc-output')?.value || '';
      if (!text) return;
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patch-note-${activePitch.id}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(mount, 'Download iniciado.', 'success');
    });
  }

  render();
}
