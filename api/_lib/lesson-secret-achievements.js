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

/* ============================================================
   AULA 02 — Glossário + Player (Léxico / Arquiteto / Cartógrafo)
   ============================================================ */

const GLOSSARY_CORE = Object.freeze([
  ['core loop', 'coreloop', 'ciclo basico', 'ciclo básico', 'andar coletar avancar', 'andar coletar avançar'],
  [
    'grokking',
    'grok',
    'memoria muscular',
    'memória muscular',
    'dominio do controle',
    'domínio do controle',
    'parar de pensar as teclas',
  ],
  ['assets', 'asset', 'sprites', 'imagens e sons', 'recursos do jogo', 'filesystem'],
]);

const PLAYER_NODES = Object.freeze([
  ['characterbody2d', 'character body 2d', 'characterbody', 'corpo do jogador', 'corpo controlavel', 'corpo controlável'],
  ['sprite2d', 'sprite 2d', 'sprite'],
  [
    'collisionshape2d',
    'collision shape 2d',
    'collisionshape',
    'forma de colisao',
    'forma de colisão',
    'shape de colisao',
    'shape de colisão',
  ],
]);

const SCENE_RECIPE_SIGNALS = Object.freeze([
  'cena',
  'cenas',
  'no',
  'nós',
  'nos',
  'node',
  'nodes',
  'receita',
  'receita de bolo',
  'hierarquia',
  'tscn',
  'player.tscn',
]);

const INPUT_ACTIONS = Object.freeze([
  ['ir_cima', 'ir cima'],
  ['ir_baixo', 'ir baixo'],
  ['ir_esquerda', 'ir esquerda'],
  ['ir_direita', 'ir direita'],
]);

const INPUT_DIRECTIONS = Object.freeze([
  ['cima', 'up', 'norte'],
  ['baixo', 'down', 'sul'],
  ['esquerda', 'left', 'oeste'],
  ['direita', 'right', 'leste'],
]);

const INPUT_MAP_SIGNALS = Object.freeze([
  'input map',
  'inputmap',
  'mapeamento de teclas',
  'project settings',
  'wasd',
  'setas',
  'seta',
  'teclado',
]);

export const AULA2_SECRET_THRESHOLDS = Object.freeze({
  lexicoMin: 3,
  lexicoTotal: GLOSSARY_CORE.length,
  arquitetoNodesMin: 3,
  arquitetoRecipeMin: 1,
  cartografoActionsMin: 4,
  cartografoDirectionsMin: 4,
  cartografoMapSignalsMin: 1,
});

export function matchesLexicoDoDesenvolvedor(normalizedText) {
  return coverageAtLeast(
    normalizedText,
    GLOSSARY_CORE,
    AULA2_SECRET_THRESHOLDS.lexicoMin
  );
}

export function matchesArquitetoDeCenas(normalizedText) {
  const nodesOk = coverageAtLeast(
    normalizedText,
    PLAYER_NODES,
    AULA2_SECRET_THRESHOLDS.arquitetoNodesMin
  );
  if (!nodesOk) return false;
  const recipeHits = SCENE_RECIPE_SIGNALS.filter((signal) => {
    const needle = normalizeForSecretCheck(signal);
    // Evita falso positivo de "no" isolado: exige palavra inteira curta.
    if (needle.length <= 2) {
      return new RegExp(`(?:^|\\s)${needle}(?:\\s|$)`).test(normalizedText);
    }
    return needle && normalizedText.includes(needle);
  }).length;
  return recipeHits >= AULA2_SECRET_THRESHOLDS.arquitetoRecipeMin;
}

/**
 * Caminho principal: as 4 ações ir_*.
 * Caminho soft: 4 direções + sinal de Input Map / WASD / setas.
 */
export function matchesCartografoDoInput(normalizedText) {
  const actions = countConceptHits(normalizedText, INPUT_ACTIONS);
  if (actions >= AULA2_SECRET_THRESHOLDS.cartografoActionsMin) return true;

  const directions = countConceptHits(normalizedText, INPUT_DIRECTIONS);
  const mapSignals = INPUT_MAP_SIGNALS.filter((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  }).length;
  return (
    directions >= AULA2_SECRET_THRESHOLDS.cartografoDirectionsMin
    && mapSignals >= AULA2_SECRET_THRESHOLDS.cartografoMapSignalsMin
  );
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
  aula2: Object.freeze([
    {
      id: 'segredo_lexico_do_desenvolvedor',
      test: (ctx) => matchesLexicoDoDesenvolvedor(ctx.normalizedText),
    },
    {
      id: 'segredo_arquiteto_de_cenas',
      test: (ctx) => matchesArquitetoDeCenas(ctx.normalizedText),
    },
    {
      id: 'segredo_cartografo_do_input',
      test: (ctx) => matchesCartografoDoInput(ctx.normalizedText),
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
