/**
 * Motor volátil das secretas por aula (aliases conceituais + cobertura M de N).
 * Thresholds e aliases ficam aqui (não no JSON público) para não spoilar.
 */

export function normalizeForSecretCheck(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function conceptMatched(normalizedText, aliases) {
  return (Array.isArray(aliases) ? aliases : []).some((alias) => {
    const needle = normalizeForSecretCheck(alias);
    return needle && normalizedText.includes(needle);
  });
}

/** Quantos grupos de aliases batem no texto. */
export function countConceptHits(normalizedText, conceptGroups = []) {
  return conceptGroups.filter((aliases) => conceptMatched(normalizedText, aliases)).length;
}

export function coverageAtLeast(normalizedText, conceptGroups, minHits) {
  const need = Math.max(0, Number(minHits) || 0);
  if (need === 0) return true;
  return countConceptHits(normalizedText, conceptGroups) >= need;
}

/**
 * Marcadores flexíveis de experimento/teste numerado.
 * Aceita: teste 1, Teste#2, test 3, experimento 4, exp. 5
 */
export function countUniqueExperimentMarkers(normalizedText) {
  const text = String(normalizedText || '');
  const pattern = /(?:teste|test|experimento|exp)\s*(?:[:.#\-]|n[ºo°.]?)?\s*(\d{1,3})/g;
  const ids = new Set();
  for (const match of text.matchAll(pattern)) {
    ids.add(match[1]);
  }
  return ids.size;
}

const PHYSICS_CORE = Object.freeze([
  ['massa', 'mass', 'peso', 'weight'],
  ['gravidade', 'gravity', 'gravidade da cena'],
  ['friccao', 'friction', 'atrito'],
  ['elasticidade', 'elasticity', 'bounciness', 'restituicao', 'restituição'],
]);

const PHYSICS_MOTION = Object.freeze([
  ['inercia', 'inertia'],
  ['queda', 'cair', 'fall', 'falling'],
  ['quique', 'bounce', 'ricochete'],
  ['desliza', 'deslizamento', 'slide', 'sliding'],
  ['velocidade', 'velocity', 'movimento', 'motion'],
]);

/** Seis eixos da síntese do Inspector (Juramento). */
const CIRCLE_AXES = Object.freeze([
  ['forca de movimento', 'forca do movimento', 'forca horizontal', 'force', 'aceleracao', 'aceleração'],
  ['impulso de pulo', 'impulso do pulo', 'jump force', 'pulo', 'salto', 'jump'],
  ['massa', 'mass', 'peso'],
  ['gravidade da cena', 'gravidade', 'gravity'],
  ['friccao', 'friction', 'atrito'],
  ['elasticidade', 'elasticity', 'bounciness', 'quique'],
]);

/** Sinais de fechamento — boost opcional, nunca gate único. */
const CLOSING_SIGNALS = Object.freeze([
  'neste mundo, a bola',
  'neste mundo a bola',
  'a bola responde',
  'em resumo',
  'em sintese',
  'em síntese',
  'portanto',
  'concluo',
  'conclusao',
  'conclusão',
  'no inspector',
  'pelo inspector',
]);

export function hasClosingSignal(normalizedText) {
  return CLOSING_SIGNALS.some((signal) => normalizedText.includes(normalizeForSecretCheck(signal)));
}

export const AULA1_SECRET_THRESHOLDS = Object.freeze({
  cartografoMinMarkers: 3,
  alquimistaCoreMin: 3,
  alquimistaCoreTotal: PHYSICS_CORE.length,
  juramentoAxesMin: 5,
  juramentoAxesSoft: 4,
});

export function matchesCartografoDoInspector(normalizedText) {
  return countUniqueExperimentMarkers(normalizedText) >= AULA1_SECRET_THRESHOLDS.cartografoMinMarkers;
}

export function matchesAlquimistaDaFisica(normalizedText) {
  const coreOk = coverageAtLeast(
    normalizedText,
    PHYSICS_CORE,
    AULA1_SECRET_THRESHOLDS.alquimistaCoreMin
  );
  const motionOk = coverageAtLeast(normalizedText, PHYSICS_MOTION, 1);
  return coreOk && motionOk;
}

/**
 * Síntese ampla das variáveis — sem frase ritual obrigatória.
 * Caminho principal: ≥5/6 eixos.
 * Caminho soft: ≥4/6 eixos + qualquer sinal de fechamento.
 */
export function matchesJuramentoDoCirculo(normalizedText) {
  const axes = countConceptHits(normalizedText, CIRCLE_AXES);
  if (axes >= AULA1_SECRET_THRESHOLDS.juramentoAxesMin) return true;
  if (axes >= AULA1_SECRET_THRESHOLDS.juramentoAxesSoft && hasClosingSignal(normalizedText)) {
    return true;
  }
  return false;
}

const LESSON_SECRET_RULES = Object.freeze({
  aula1: Object.freeze([
    {
      id: 'segredo_cartografo_do_inspector',
      test: (ctx) => matchesCartografoDoInspector(ctx.normalizedText),
    },
    {
      id: 'segredo_alquimista_da_fisica',
      test: (ctx) => matchesAlquimistaDaFisica(ctx.normalizedText),
    },
    {
      id: 'segredo_juramento_do_circulo',
      test: (ctx) => matchesJuramentoDoCirculo(ctx.normalizedText),
    },
  ]),
});

export function listLessonSecretIds(lessonId) {
  return (LESSON_SECRET_RULES[String(lessonId || '')] || []).map((rule) => rule.id);
}

export function allLessonSecretIds() {
  return [...new Set(
    Object.values(LESSON_SECRET_RULES).flatMap((rules) => rules.map((rule) => rule.id))
  )];
}

/**
 * @returns {{ id: string }[]}
 */
export function evaluateSecretAchievements(lessonId, paragraphText, alreadyUnlocked = []) {
  const rules = LESSON_SECRET_RULES[String(lessonId || '')] || [];
  if (rules.length === 0) return [];

  const unlocked = new Set(
    (Array.isArray(alreadyUnlocked) ? alreadyUnlocked : []).map(String)
  );
  const normalizedText = normalizeForSecretCheck(paragraphText);
  const context = { normalizedText, rawText: String(paragraphText || '') };

  return rules
    .filter((rule) => !unlocked.has(rule.id))
    .filter((rule) => {
      try {
        return Boolean(rule.test(context));
      } catch {
        return false;
      }
    })
    .map((rule) => ({ id: rule.id }));
}
