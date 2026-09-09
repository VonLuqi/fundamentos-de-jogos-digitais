/**
 * Chips de marcas do Grimório (editor + display).
 */

'use strict';

export const NOTE_TAG_MAX = 12;
export const NOTE_TAG_LEN = 32;

export function normalizeTagList(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') list = raw.split(/[,;#]+/);
  return [...new Set(
    list
      .map((tag) => String(tag || '').trim().slice(0, NOTE_TAG_LEN))
      .filter(Boolean)
  )].slice(0, NOTE_TAG_MAX);
}

export function renderTagChips(container, tags, { removable = false, onRemove } = {}) {
  if (!container) return;
  container.replaceChildren();
  const list = normalizeTagList(tags);
  if (list.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  list.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'note-tag-chip';
    chip.dataset.tag = tag;
    const label = document.createElement('span');
    label.className = 'note-tag-chip__label';
    label.textContent = tag;
    chip.appendChild(label);
    if (removable) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'note-tag-chip__remove';
      btn.setAttribute('aria-label', `Remover marca ${tag}`);
      btn.textContent = '×';
      btn.addEventListener('click', () => onRemove?.(tag));
      chip.appendChild(btn);
    }
    container.appendChild(chip);
  });
}

/**
 * Liga input + lista de chips. Retorna { getTags, setTags, destroy }.
 */
export function bindTagChipEditor({
  input,
  chipsEl,
  hiddenInput,
  max = NOTE_TAG_MAX,
} = {}) {
  let tags = [];

  const sync = () => {
    renderTagChips(chipsEl, tags, {
      removable: true,
      onRemove: (tag) => {
        tags = tags.filter((item) => item !== tag);
        sync();
      },
    });
    if (hiddenInput) hiddenInput.value = tags.join(',');
  };

  const commitDraft = (raw) => {
    const pieces = normalizeTagList(raw);
    if (pieces.length === 0) return false;
    let changed = false;
    pieces.forEach((tag) => {
      if (tags.length >= max) return;
      if (tags.includes(tag)) return;
      tags.push(tag);
      changed = true;
    });
    if (input) input.value = '';
    if (changed) sync();
    return changed;
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitDraft(input.value);
      return;
    }
    if (event.key === 'Backspace' && !input.value && tags.length) {
      tags.pop();
      sync();
    }
  };

  const onBlur = () => {
    if (input?.value?.trim()) commitDraft(input.value);
  };

  input?.addEventListener('keydown', onKeyDown);
  input?.addEventListener('blur', onBlur);
  sync();

  return {
    getTags: () => [...tags],
    setTags: (next) => {
      tags = normalizeTagList(next);
      sync();
    },
    destroy: () => {
      input?.removeEventListener('keydown', onKeyDown);
      input?.removeEventListener('blur', onBlur);
    },
  };
}
