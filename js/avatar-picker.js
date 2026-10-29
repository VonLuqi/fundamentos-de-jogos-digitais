/**
 * Galeria de avatares do catálogo (filtros por categoria, tags específicas e busca por nome).
 * Saiu do Painel do Herói para o Perfil: aqui fica embutida na seção Avatar.
 *
 * buildAvatarPicker({ currentIndex, onConfirm }) → { wrapper, focusElement, setCurrent }
 * - onConfirm(index) é async; se rejeitar, a mensagem aparece no status da galeria.
 */

import {
  ApiError,
  avatarSafeIndex,
  getAvatarCatalog,
  getAvatarFilterTagDefinitions,
  getAvatarParentTagId,
  getAvatarPrimaryTagDefinitions,
  getAvatarSubTagDefinitions,
  isAvatarFilterAllTag,
  loadAvatarImage,
} from './api.js';

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function buildAvatarPicker({ currentIndex = 0, onConfirm } = {}) {
  let savedIndex = avatarSafeIndex(currentIndex);
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

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn-gold btn-gold--ghost';
  resetBtn.textContent = 'Desfazer';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'btn-gold avatar-picker__confirm';
  confirmBtn.textContent = 'Usar este avatar';

  actions.append(resetBtn, confirmBtn);

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

  let pendingIndex = savedIndex;
  let activeTagId = 'todos';
  const allButtons = [];
  const primaryTagButtons = [];
  let subTagButtons = [];
  let loadedOk = 0;
  let loadFailed = 0;
  const count = avatars.length;

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
    resetBtn.disabled = busy;
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
      button.classList.toggle('is-current', buttonIndex === savedIndex);
    });

    const selectedAvatar = avatars[pendingIndex];
    const selectedName = selectedAvatar?.label || `Avatar ${pendingIndex + 1}`;
    meta.textContent = pendingIndex === savedIndex
      ? `Em uso: ${selectedName}`
      : `Selecionado: ${selectedName} — confirme para usar`;
    confirmBtn.disabled = pendingIndex === savedIndex;
    resetBtn.disabled = pendingIndex === savedIndex;
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
  moreModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMoreModal();
  });

  head.appendChild(tagsGroup);

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
    image.loading = 'lazy';

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
  resetBtn.addEventListener('click', () => {
    pendingIndex = savedIndex;
    updateSelectionUi();
  });

  confirmBtn.addEventListener('click', async () => {
    if (confirmBtn.disabled || typeof onConfirm !== 'function') return;
    setBusy(true);
    closeMoreModal();
    status.textContent = 'Salvando avatar...';
    try {
      await onConfirm(pendingIndex);
      savedIndex = pendingIndex;
      status.textContent = 'Avatar atualizado.';
    } catch (error) {
      status.textContent = error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Não foi possível trocar o avatar agora.';
    } finally {
      setBusy(false);
      updateSelectionUi();
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

  return {
    wrapper,
    focusElement: searchInput,
    /** Atualiza o avatar em uso vindo de fora (ex.: outra aba salvou). */
    setCurrent(index) {
      savedIndex = avatarSafeIndex(index);
      pendingIndex = savedIndex;
      updateSelectionUi();
    },
  };
}
