/**
 * Gabarito e correção automática — Prova Módulo 1.
 * Server-only. Nunca enviar MC_ANSWER_KEY / rubricas ao client do aluno.
 */

import {
  DISCURSIVE_POINTS_EACH,
  EXAM_ID,
  MC_POINTS_EACH,
  QUESTIONS,
  getQuestionById,
  listMcQuestionIds,
} from './questions-modulo1.js';

export { EXAM_ID };

/** @type {Readonly<Record<string, 'A'|'B'|'C'|'D'|'E'>>} */
export const MC_ANSWER_KEY = Object.freeze({
  q01: 'B',
  q02: 'C',
  q03: 'D',
  q04: 'D',
  q05: 'B',
  q06: 'C',
  q07: 'B',
  q08: 'B',
  q09: 'B',
  q10: 'C',
  q11: 'A',
  q12: 'D',
});

/** Justificativas curtas — só admin. */
export const MC_JUSTIFICATIONS = Object.freeze({
  q01: 'Círculo Mágico = contrato de regras temporário ao apertar Play. As outras misturam código, interface ou hardware.',
  q02: 'Inspector edita física; Viewport 2D mostra o efeito na hora — sem precisar de código.',
  q03: 'Core Loop = ciclo repetitivo de ações do jogador. Não é Grokking, asset, .tscn nem física.',
  q04: 'Receita da Aula 02: raiz CharacterBody2D + Sprite2D + CollisionShape2D.',
  q05: 'Homo Ludens: cultura e jogo andam juntos; folclore vira sistema jogável, não só enfeite.',
  q06: 'Filter → Nearest evita o embaçado da suavização padrão.',
  q07: 'viewport + keep + integer = proporção e pixels quadrados.',
  q08: 'NES: resolução baixa, poucas cores, flicker, reuso de tiles.',
  q09: 'ClassInd = aviso para famílias, não censura prévia.',
  q10: 'Mesmo loop; o que muda a faixa é o feedback (fantasia vs sangue/gore).',
  q11: 'Atenuante típico: inimigos irreais/cômicos em vez de humanos.',
  q12: 'Sem passo 4, a janela distorce a pixel art ao redimensionar.',
});

/**
 * Rubricas discursivas — só admin (correção manual).
 * @type {Readonly<Record<string, { focus: string, synthesis: string, excellent: string, proficient: string, developing: string }>>}
 */
export const DISCURSIVE_RUBRICS = Object.freeze({
  q13: Object.freeze({
    focus: 'Limite técnico gera criatividade (Aula 04).',
    excellent:
      'Cita Project Settings → Display → Window com viewport + keep + integer. Explica que a restrição de resolução força criatividade (tiles, abstração). Tom de memorando.',
    proficient:
      'Acerta os settings (pequenos erros de nome ok), mas explica pouco a “restrição que ajuda”.',
    developing:
      'Config errada (disabled, só importação) ou trata o limite só como problema ruim.',
    synthesis:
      '(a) viewport nativa + stretch viewport + aspect keep + scale integer. (b) limite inventa o estilo do design.',
  }),
  q14: Object.freeze({
    focus: 'ClassInd não corta o Core Loop; muda a “roupa” visual (Aula 05).',
    excellent:
      'Formato Patch Note. Não muda o loop. Violência → fantasia/não-humano/cômico. Drogas → poção/item mágico sem glamour. Usa atenuantes/agravantes. Mira L ou 10.',
    proficient:
      'Muda feedback certo e preserva o loop, mas esquece os termos atenuante/agravante.',
    developing: 'Quer remover tiro/combate ou mudar o Core Loop.',
    synthesis: 'Muda apresentação; mecânica (mover → atirar → curar) fica.',
  }),
  q15: Object.freeze({
    focus: 'Física emergente vs controle por input (Aulas 01→02).',
    excellent:
      'RigidBody = física que “acontece sozinha”. CharacterBody = controle pelo teclado/Input Map + move_and_slide(). Player precisa de resposta previsível.',
    proficient: 'Entende a diferença básica, mas esquece move_and_slide().',
    developing: 'Troca os nós ou acha que RigidBody é o ideal para o Player.',
    synthesis: 'Player = controle firme; física pura demais = caos no avatar.',
  }),
  q16: Object.freeze({
    focus: 'Homo Ludens na práxis do sprite cultural (Aula 03).',
    excellent:
      'Cultura não é só skin: vira jogo (sistemas, identificação). Liga a Huizinga e ao Círculo Mágico.',
    proficient: 'Liga identidade visual a Huizinga, mas fica superficial.',
    developing: 'Diz que é só enfeite / “patriotismo na arte”.',
    synthesis: 'Máscara cultural = cultura jogável, não decoração.',
  }),
  q17: Object.freeze({
    focus: 'Estrutura mecânica → fenômeno neuromotor (Aula 02).',
    excellent:
      'Core Loop = ciclo de ações. Grokking = teclas na memória muscular. Loop claro + feedback bom → deixa de “pensar as teclas”.',
    proficient: 'Define os dois, mas liga mal a causa e o efeito.',
    developing: 'Confunde Core Loop com assets; acha que Grokking é função da Godot.',
    synthesis: 'Sem loop bem feito e feedback claro, não há Grokking.',
  }),
  q18: Object.freeze({
    focus: 'Fluxo Input Map → script → nós (Aula 02).',
    excellent:
      'Input Map nomeia ações → script no CharacterBody lê e move com move_and_slide() → Sprite desenha → CollisionShape colide.',
    proficient: 'Entende o conjunto, mas esquece move_and_slide() ou o papel dos filhos.',
    developing: 'Dá colisão ao Sprite, ou Input Map no FileSystem, etc.',
    synthesis: 'Input abstrato + script + visual + colisão = movimento na tela.',
  }),
  q19: Object.freeze({
    focus: 'Duas travas em níveis diferentes do pipeline (Aulas 03–04).',
    excellent:
      'Nearest = nitidez do sprite/textura (não embara). Integer = escala da janela só em 2×, 3×, 4×… (não estica pixel torto).',
    proficient: 'Sabe que as duas evitam distorção, mas não separa “imagem” e “tela”.',
    developing: 'Trata as duas como a mesma coisa; mistura com física ou ClassInd.',
    synthesis: 'Nearest salva o pixel do asset; Integer salva o quadro ao redimensionar.',
  }),
  q20: Object.freeze({
    focus: 'IARC + ClassInd + atenuantes no fechamento do módulo (Aula 05).',
    excellent:
      'IARC: um formulário gera classificação em várias regiões, barato e rápido para indie. ClassInd: energia mágica + inimigos folclóricos = atenuante; sangue real = agravante. Faixa provável: Livre ou 10 anos.',
    proficient: 'Acerta IARC e L/10, mas esquece “atenuante” ou o não-humano.',
    developing: 'Fala em censura genérica; não explica IARC nem atenuantes.',
    synthesis: 'IARC = alcance global; feedback mágico = faixa baixa.',
  }),
});

const VALID_CHOICES = new Set(['A', 'B', 'C', 'D', 'E']);

/**
 * Remove campos internos / gabarito — payload seguro para o aluno.
 * @param {ReadonlyArray<object>} [questions]
 */
export function sanitizeQuestionsForClient(questions = QUESTIONS) {
  return questions.map((q) => {
    const base = {
      id: q.id,
      index: q.index,
      type: q.type,
      points: q.points,
      title: q.title || null,
      prompt: q.prompt,
    };
    if (q.type === 'mc') {
      return {
        ...base,
        choices: { ...q.choices },
      };
    }
    return {
      ...base,
      role: q.role || null,
      scenario: q.scenario || null,
      mission: q.mission || null,
    };
  });
}

/**
 * Payload admin: questões + gabarito MC + rubricas discursivas.
 * @param {ReadonlyArray<object>} [questions]
 */
export function questionsForAdmin(questions = QUESTIONS) {
  return questions.map((q) => {
    const client = sanitizeQuestionsForClient([q])[0];
    if (q.type === 'mc') {
      return {
        ...client,
        correctChoice: MC_ANSWER_KEY[q.id] || null,
        justification: MC_JUSTIFICATIONS[q.id] || null,
      };
    }
    return {
      ...client,
      rubric: DISCURSIVE_RUBRICS[q.id] || null,
    };
  });
}

/**
 * Normaliza escolha MC (A–E) ou null.
 * @param {unknown} choice
 * @returns {'A'|'B'|'C'|'D'|'E'|null}
 */
export function normalizeMcChoice(choice) {
  if (choice == null || choice === '') return null;
  const raw = String(choice).trim().toUpperCase();
  return VALID_CHOICES.has(raw) ? /** @type {'A'|'B'|'C'|'D'|'E'} */ (raw) : null;
}

/**
 * @param {string} questionId
 * @param {unknown} choice
 */
export function isMcChoiceCorrect(questionId, choice) {
  const expected = MC_ANSWER_KEY[String(questionId)];
  if (!expected) return false;
  const normalized = normalizeMcChoice(choice);
  return normalized != null && normalized === expected;
}

/**
 * Aceita:
 * - Array de { questionId|question_id, choice }
 * - Record/map questionId → choice
 *
 * @param {Array<{questionId?: string, question_id?: string, choice?: unknown}>|Record<string, unknown>} answers
 * @returns {{
 *   mcScore: number,
 *   maxMcScore: number,
 *   gradedCount: number,
 *   blankCount: number,
 *   results: Array<{
 *     questionId: string,
 *     choice: string|null,
 *     correctChoice: string,
 *     isCorrect: boolean,
 *     pointsAwarded: number,
 *   }>
 * }}
 */
export function gradeMultipleChoice(answers) {
  const byId = new Map();

  if (Array.isArray(answers)) {
    for (const row of answers) {
      if (!row || typeof row !== 'object') continue;
      const id = String(row.questionId ?? row.question_id ?? '').trim();
      if (!id) continue;
      byId.set(id, row.choice);
    }
  } else if (answers && typeof answers === 'object') {
    for (const [id, choice] of Object.entries(answers)) {
      byId.set(String(id), choice);
    }
  }

  const mcIds = listMcQuestionIds();
  let mcScore = 0;
  let gradedCount = 0;
  let blankCount = 0;
  /** @type {Array<object>} */
  const results = [];

  for (const questionId of mcIds) {
    const correctChoice = MC_ANSWER_KEY[questionId];
    const choice = normalizeMcChoice(byId.get(questionId));
    const isCorrect = choice != null && choice === correctChoice;
    const pointsAwarded = isCorrect ? MC_POINTS_EACH : 0;
    if (choice == null) blankCount += 1;
    else gradedCount += 1;
    if (isCorrect) mcScore += MC_POINTS_EACH;
    results.push({
      questionId,
      choice,
      correctChoice,
      isCorrect,
      pointsAwarded,
    });
  }

  return {
    mcScore,
    maxMcScore: mcIds.length * MC_POINTS_EACH,
    gradedCount,
    blankCount,
    results,
  };
}

/**
 * Valida nota discursiva fracionária (0, 0.25, 0.5, 0.75, 1) ou qualquer 0–1 com 2 casas.
 * @param {unknown} value
 * @returns {number|null}
 */
export function normalizeDiscursivePoints(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > DISCURSIVE_POINTS_EACH) return null;
  return Math.round(n * 100) / 100;
}

export function getMcCorrectChoice(questionId) {
  return MC_ANSWER_KEY[String(questionId)] || null;
}

export function getDiscursiveRubric(questionId) {
  return DISCURSIVE_RUBRICS[String(questionId)] || null;
}

/** Sanity: chave cobre todas as MC do banco de questões. */
export function assertAnswerKeyCoversQuestions() {
  const missing = [];
  const extra = [];
  for (const id of listMcQuestionIds()) {
    if (!MC_ANSWER_KEY[id]) missing.push(id);
  }
  for (const id of Object.keys(MC_ANSWER_KEY)) {
    const q = getQuestionById(id);
    if (!q || q.type !== 'mc') extra.push(id);
  }
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}
