/**
 * Letreiro digital (marquee) — G2.1.
 * Track duplicado + animação contínua; pausa hover/focus; reduced-motion → estático.
 */

export const MARQUEE_SPEED_PX_PER_SEC = 48;

function prefersReducedMotion(matchMediaFn) {
  try {
    const probe = matchMediaFn
      ?? (typeof matchMedia === 'function' ? matchMedia.bind(globalThis) : null);
    if (typeof probe !== 'function') return false;
    return Boolean(probe('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

function classAdd(el, name) {
  if (!el) return;
  if (el.classList?.add) el.classList.add(name);
  else if (typeof el.className === 'string' && !el.className.split(/\s+/).includes(name)) {
    el.className = `${el.className} ${name}`.trim();
  }
}

function classRemove(el, name) {
  if (!el) return;
  if (el.classList?.remove) el.classList.remove(name);
  else if (typeof el.className === 'string') {
    el.className = el.className.split(/\s+/).filter((c) => c && c !== name).join(' ');
  }
}

function classToggle(el, name, on) {
  if (on) classAdd(el, name);
  else classRemove(el, name);
}

/**
 * Garante a estrutura do letreiro dentro do host.
 * @param {Element} host
 * @returns {Element|null} track
 */
export function bindMarquee(host) {
  if (!host) return null;
  classAdd(host, 'despertar-marquee');
  if (!host.hasAttribute || (typeof host.hasAttribute === 'function' && !host.hasAttribute('tabindex'))) {
    host.setAttribute?.('tabindex', '0');
  }

  let track = host.querySelector?.('.despertar-marquee__track');
  if (!track) {
    const doc = host.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc?.createElement) return null;
    const initial = (host.textContent || '').trim();
    host.textContent = '';
    track = doc.createElement('span');
    track.className = 'despertar-marquee__track';
    const a = doc.createElement('span');
    a.className = 'despertar-marquee__seg';
    a.textContent = initial;
    const b = doc.createElement('span');
    b.className = 'despertar-marquee__seg';
    b.setAttribute?.('aria-hidden', 'true');
    b.textContent = initial;
    if (typeof track.append === 'function') track.append(a, b);
    else {
      track.appendChild?.(a);
      track.appendChild?.(b);
      track.children = track.children || [a, b];
    }
    if (typeof host.append === 'function') host.append(track);
    else host.appendChild?.(track);
  }
  return track;
}

/**
 * Atualiza o texto do letreiro (só remonta se mudou).
 * @param {Element|null} host
 * @param {string} text
 * @param {{ reducedMotion?: boolean, matchMedia?: Function, speed?: number }} [options]
 */
export function setMarqueeText(host, text, options = {}) {
  if (!host) return false;
  const next = String(text ?? '');
  const track = bindMarquee(host);
  if (!track) {
    host.textContent = next;
    host.setAttribute('title', next);
    return false;
  }

  const segs = typeof track.querySelectorAll === 'function'
    ? [...track.querySelectorAll('.despertar-marquee__seg')]
    : [...(track.childNodes || [])].filter((n) => String(n.className || '').includes('despertar-marquee__seg'));
  const current = segs[0]?.textContent ?? '';
  if (current !== next) {
    for (const seg of segs) {
      seg.textContent = next;
    }
  }
  host.setAttribute('title', next);
  host.setAttribute('aria-label', next);

  const reduced = typeof options.reducedMotion === 'boolean'
    ? options.reducedMotion
    : prefersReducedMotion(options.matchMedia);
  classToggle(host, 'is-static', reduced);
  if (reduced) classRemove(host, 'is-overflow');

  if (reduced) {
    host.style?.removeProperty?.('--marquee-dur');
    return true;
  }

  // Duração ∝ largura do segmento (≈ metade do track) / velocidade (Q5 ~40–60 px/s).
  const speed = Number(options.speed) > 0 ? Number(options.speed) : MARQUEE_SPEED_PX_PER_SEC;
  const measure = () => {
    const first = segs[0];
    const width = first?.offsetWidth || track.scrollWidth / 2 || 0;
    if (width <= 0) return;
    const dur = Math.max(6, width / speed);
    host.style?.setProperty?.('--marquee-dur', `${dur.toFixed(2)}s`);
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(measure);
  } else {
    measure();
  }
  return true;
}

/**
 * Marquee só se o texto não cabe (Q4 labels). Senão fica estático com ellipsis.
 * @param {Element|null} host
 * @param {string} text
 * @param {{ reducedMotion?: boolean, matchMedia?: Function, speed?: number }} [options]
 * @returns {'scroll'|'static'|false}
 */
export function setMarqueeTextIfOverflow(host, text, options = {}) {
  if (!host) return false;
  const next = String(text ?? '');
  const reduced = typeof options.reducedMotion === 'boolean'
    ? options.reducedMotion
    : prefersReducedMotion(options.matchMedia);

  // Monta estrutura em modo estático para medir.
  setMarqueeText(host, next, { ...options, reducedMotion: true });
  if (reduced) return 'static';

  const decide = () => {
    const track = host.querySelector?.('.despertar-marquee__track');
    const first =
      track?.querySelectorAll?.('.despertar-marquee__seg')?.[0]
      ?? host.querySelectorAll?.('.despertar-marquee__seg')?.[0]
      ?? null;
    const textW = Number(first?.scrollWidth) || Number(first?.offsetWidth) || 0;
    const boxW = Number(host.clientWidth) || 0;
    const overflows = boxW > 0 && textW > boxW + 1;
    if (overflows) {
      setMarqueeText(host, next, { ...options, reducedMotion: false });
      classAdd(host, 'is-overflow');
      classRemove(host, 'is-static');
      return 'scroll';
    }
    classAdd(host, 'is-static');
    classRemove(host, 'is-overflow');
    host.style?.removeProperty?.('--marquee-dur');
    return 'static';
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      requestAnimationFrame(decide);
    });
    return 'static';
  }
  return decide();
}

export { prefersReducedMotion as marqueePrefersReducedMotion };
