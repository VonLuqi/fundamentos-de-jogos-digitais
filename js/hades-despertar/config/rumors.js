/**
 * Fila de rumores do letreiro (G2.3 / Q4+Q6).
 * Catálogo editável pelo Mestre — sem spoilers de solução nem salas /submundo ocultas.
 */

import { EDU_LOG_BY_ID } from './edu-logs.js';
import { JUDGES_REFUSED_TICKER } from './constants.js';

function freezeAll(list) {
  return Object.freeze(list.map((item) => Object.freeze({ ...item })));
}

/** Intervalo entre rumores na rotação (ms). */
export const RUMOR_ROTATE_MS = 14_000;

/** Quanto tempo um interrupt (Juízes / shiny) segura a faixa (ms). */
export const RUMOR_INTERRUPT_MS = 18_000;

export const SHINY_FIRST_TICKER =
  'Rumor: uma sombra nasceu invertida sob a Foice — o Submundo piscou o olho.';

/** Sync / Juízes — prioridade máxima (também em constants.js). */
export { JUDGES_REFUSED_TICKER };

/**
 * Curiosidades do Submundo / mitologia Hades (flavor, sem mecânica spoiler).
 * Edite à vontade — ids estáveis evitam “pulo” na fila ao salvar.
 */
export const RUMOR_CURIOSITIES = freezeAll([
  {
    id: 'cur_acheron',
    text: 'Curiosidade: o Acheron é o rio da dor — no Domínio, é onde a Foice dá o primeiro corte.',
  },
  {
    id: 'cur_cocytus',
    text: 'Curiosidade: o Cocytus é o rio dos lamentos; no Despertar, o lamento vira Almas / s.',
  },
  {
    id: 'cur_styx',
    text: 'Curiosidade: jurar pelo Styx era o juramento mais grave dos deuses — quebrá-lo custava um ano de silêncio.',
  },
  {
    id: 'cur_lethe',
    text: 'Curiosidade: quem bebe do Lethe esquece a vida anterior; Mnemosyne guarda o que merece voltar.',
  },
  {
    id: 'cur_charon',
    text: 'Curiosidade: Caronte só atravessa quem paga o óbolo — sem moeda, a sombra fica na margem.',
  },
  {
    id: 'cur_cerberus',
    text: 'Curiosidade: Cérbero guarda a porta, não a saída — entrar é fácil; sair é outro julgamento.',
  },
  {
    id: 'cur_three_judges',
    text: 'Curiosidade: Minos, Éaco e Radamanto pesavam as almas; no Domínio, o servidor ainda julga o saldo.',
  },
  {
    id: 'cur_obol',
    text: 'Curiosidade: o óbolo na boca do morto era passagem — aqui, óbolos compram memória permanente.',
  },
  {
    id: 'cur_asphodel',
    text: 'Curiosidade: nos Asfódelos as almas comuns vagueiam sem grande glória nem grande culpa.',
  },
  {
    id: 'cur_elysium',
    text: 'Curiosidade: os Campos Elísios eram para heróis — o resto do Submundo não é tão generoso.',
  },
]);

/**
 * Dicas leves de enigmas do Domínio — nunca revelar solução, nunca nomear sala oculta.
 */
export const RUMOR_ENIGMA_HINTS = freezeAll([
  {
    id: 'hint_listen',
    text: 'Dica do Domínio: às vezes o enigma fala baixo — leia de novo o que o Mestre já mostrou na Trilha.',
  },
  {
    id: 'hint_names',
    text: 'Dica do Domínio: rios e juramentos guardam nomes; o nome certo abre portas sem forçar a fechadura.',
  },
  {
    id: 'hint_patience',
    text: 'Dica do Domínio: nem todo véu cai no primeiro clique — o Submundo premia quem observa antes de cortar.',
  },
  {
    id: 'hint_echo',
    text: 'Dica do Domínio: se algo parece eco, talvez seja — compare o que ouviu com o que está escrito.',
  },
  {
    id: 'hint_margin',
    text: 'Dica do Domínio: margens, rodapés e sussurros às vezes pesam mais que o título da página.',
  },
  {
    id: 'hint_no_rush',
    text: 'Dica do Domínio: correr pelo mapa esconde o óbvio; caminhar revela o que o pressa apaga.',
  },
]);

const FALLBACK_RUMOR =
  'Rumor: as Sombras orbitam a Foice; os demais servos povoam as prateleiras do Mundo.';

/**
 * Flavor de progresso (prioridade média na §4.2).
 * @param {object} state
 * @returns {{ id: string, text: string }[]}
 */
export function buildProgressRumors(state) {
  const items = [];
  const clickCount = Number(state?.clickCount) || 0;
  const qty = typeof state?.quantities === 'function' ? state.quantities() : (state?.generators || {});
  const t1 = Number(qty.wandering_shade || 0);
  const t2 = Number(qty.charon_servants || 0);
  let spsPositive = false;
  try {
    spsPositive = typeof state?.sps === 'function'
      ? Number(state.sps()) > 0
      : Number(state?.sps) > 0;
  } catch {
    spsPositive = false;
  }

  if (clickCount < 1) {
    items.push({
      id: 'prog_uncut',
      text: 'Rumor do Submundo: a Foice ainda não cortou.',
    });
  } else {
    items.push({
      id: 'prog_orbit',
      text: 'Rumor: as Sombras orbitam a Foice; os demais servos povoam as prateleiras do Mundo.',
    });
  }
  if (spsPositive) {
    items.push({
      id: 'prog_sps',
      text: 'Rumor: o Cocytus lamuria — as Almas / s já fluem sozinhas.',
    });
  }
  if (t1 >= 1) {
    items.push({
      id: 'prog_t1',
      text: 'Rumor: a primeira auréola fechou o círculo em torno da Foice.',
    });
  }
  if (t2 >= 1) {
    items.push({
      id: 'prog_shelf',
      text: 'Rumor: as prateleiras do Mundo acordaram — Servos de Caronte já caminham na margem.',
    });
  }
  return items;
}

/**
 * Entradas do Códice já vistas.
 * @param {string[]} seen
 * @returns {{ id: string, text: string }[]}
 */
export function buildCodexRumors(seen = []) {
  const ids = Array.isArray(seen) ? seen : [];
  const items = [];
  for (const id of ids) {
    const log = EDU_LOG_BY_ID[id];
    if (!log) continue;
    items.push({
      id: `codex_${id}`,
      text: `Rumor: ${log.title} — ${log.body}`,
    });
  }
  return items;
}

/**
 * Assinatura leve: se mudar, a fila é remonta (mantém índice estável quando possível).
 * @param {object} state
 */
export function rumorPoolSignature(state) {
  const seen = Array.isArray(state?.eduLogsSeen) ? state.eduLogsSeen.join(',') : '';
  const clickCount = Number(state?.clickCount) || 0;
  const qty = typeof state?.quantities === 'function' ? state.quantities() : (state?.generators || {});
  const t1 = Number(qty.wandering_shade || 0) >= 1 ? 1 : 0;
  const t2 = Number(qty.charon_servants || 0) >= 1 ? 1 : 0;
  let sps = 0;
  try {
    sps = typeof state?.sps === 'function'
      ? (Number(state.sps()) > 0 ? 1 : 0)
      : (Number(state?.sps) > 0 ? 1 : 0);
  } catch {
    sps = 0;
  }
  return `${seen}|c${clickCount < 1 ? 0 : 1}|s${sps}|t${t1}${t2}`;
}

/**
 * Pool rotativo (sem sync/shiny — esses são interrupts).
 * Ordem de inserção ≈ prioridade de leitura: Códice → progresso → curiosidades → dicas.
 * @param {object} state
 * @returns {{ id: string, text: string }[]}
 */
export function buildRumorPool(state) {
  const codex = buildCodexRumors(state?.eduLogsSeen);
  const progress = buildProgressRumors(state);
  const curiosities = RUMOR_CURIOSITIES.map((item) => ({ id: item.id, text: item.text }));
  const hints = RUMOR_ENIGMA_HINTS.map((item) => ({ id: item.id, text: item.text }));
  const pool = [...codex, ...progress, ...curiosities, ...hints];
  return pool.length ? pool : [{ id: 'fallback', text: FALLBACK_RUMOR }];
}

/**
 * Próximo rumor da fila.
 * @param {{ id: string, text: string }[]} pool
 * @param {number} index
 */
export function pickRumor(pool, index = 0) {
  const list = Array.isArray(pool) && pool.length ? pool : [{ id: 'fallback', text: FALLBACK_RUMOR }];
  const i = ((Math.floor(Number(index) || 0) % list.length) + list.length) % list.length;
  return { ...list[i], index: i };
}
