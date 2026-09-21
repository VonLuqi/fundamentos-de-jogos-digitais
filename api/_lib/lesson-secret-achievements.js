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

/* ============================================================
   AULA 03 — Homo Ludens + Pixel / Identidade (Voz / Artesão / Identidade)
   ============================================================ */

const HOMO_LUDENS_CORE = Object.freeze([
  ['homo ludens', 'homoludens'],
  ['huizinga', 'johan huizinga'],
  [
    'cultura surge como jogo',
    'cultura se desenvolve como jogo',
    'cultura surge e se desenvolve como jogo',
    'jogo como elemento da cultura',
    'cultura como jogo',
    'no jogo e pelo jogo',
    'matriz da cultura',
    'cultura joga',
  ],
]);

const IMPORT_SIGNALS = Object.freeze([
  ['import', 'importei', 'importar', 'importacao', 'importação', 'importado'],
  [
    'filesystem',
    'file system',
    'arrastar',
    'arrastei',
    'drag and drop',
    'arrastar e soltar',
    'res://',
    'sprites/hero',
    'sprites',
  ],
]);

const NEAREST_SIGNALS = Object.freeze([
  [
    'nearest',
    'filtro nearest',
    'texture filter',
    'filtro de textura',
    'sem blur',
    'sem borrão',
    'sem borrao',
    'pixel nitido',
    'pixel nítido',
    'pixel duro',
    'nao borrar',
    'não borrar',
    'nao borrou',
    'não borrou',
  ],
]);

const SPRITE_SIGNALS = Object.freeze([
  ['sprite2d', 'sprite 2d', 'sprite', 'textura'],
]);

const CULTURE_FOLKLORE = Object.freeze([
  [
    'folclore',
    'saci',
    'curupira',
    'iara',
    'boitata',
    'boitatá',
    'cuca',
    'mula sem cabeca',
    'mula sem cabeça',
    'boto',
    'lobisomem',
  ],
]);

const CULTURE_FAUNA = Object.freeze([
  [
    'fauna',
    'onca',
    'onça',
    'tucano',
    'mico',
    'mico-leao',
    'mico-leão',
    'jabuti',
    'capivara',
    'arara',
    'tamandua',
    'tamanduá',
  ],
]);

const CULTURE_URBAN = Object.freeze([
  [
    'urbano',
    'regional',
    'cidade',
    'cordel',
    'frevo',
    'sertao',
    'sertão',
    'amazonia',
    'amazônia',
    'nordeste',
    'favela',
    'centro historico',
    'centro histórico',
    'brasileiro',
    'brasilidade',
    'cultura brasileira',
  ],
]);

const PERSONALIZATION_SIGNALS = Object.freeze([
  'personalizei',
  'personalizar',
  'personalizacao',
  'personalização',
  'recolor',
  'recolorei',
  'recolorir',
  'recolore',
  'editei',
  'editar',
  'edicao',
  'edição',
  'alterei',
  'alterar',
  'modifiquei',
  'modificar',
  'identidade',
  'mascara cultural',
  'máscara cultural',
  'ancora cultural',
  'âncora cultural',
  'referencia cultural',
  'referência cultural',
  'inspirado',
  'inspirada',
  'inspiracao',
  'inspiração',
]);

export const AULA3_SECRET_THRESHOLDS = Object.freeze({
  homoLudensMin: 2,
  homoLudensTotal: HOMO_LUDENS_CORE.length,
  artesaoImportMin: 1,
  artesaoNearestMin: 1,
  artesaoSpriteMin: 1,
  identidadeCultureMin: 1,
  identidadePersonalizationMin: 1,
});

/**
 * ≥2/3 conceitos: Homo Ludens · Huizinga · cultura-como-jogo.
 */
export function matchesHomoLudens(normalizedText) {
  return coverageAtLeast(
    normalizedText,
    HOMO_LUDENS_CORE,
    AULA3_SECRET_THRESHOLDS.homoLudensMin
  );
}

/**
 * Import/FileSystem + Nearest (ou pixel nítido) + Sprite2D/sprite.
 */
export function matchesArtesaoDoPixel(normalizedText) {
  const importOk = coverageAtLeast(
    normalizedText,
    IMPORT_SIGNALS,
    AULA3_SECRET_THRESHOLDS.artesaoImportMin
  );
  const nearestOk = coverageAtLeast(
    normalizedText,
    NEAREST_SIGNALS,
    AULA3_SECRET_THRESHOLDS.artesaoNearestMin
  );
  const spriteOk = coverageAtLeast(
    normalizedText,
    SPRITE_SIGNALS,
    AULA3_SECRET_THRESHOLDS.artesaoSpriteMin
  );
  return importOk && nearestOk && spriteOk;
}

/**
 * Âncora cultural BR (folclore | fauna | urbano) + sinal de personalização.
 */
export function matchesIdentidadeLudica(normalizedText) {
  const cultureGroups = [...CULTURE_FOLKLORE, ...CULTURE_FAUNA, ...CULTURE_URBAN];
  const cultureOk = coverageAtLeast(
    normalizedText,
    cultureGroups,
    AULA3_SECRET_THRESHOLDS.identidadeCultureMin
  );
  if (!cultureOk) return false;

  const personalizationHits = PERSONALIZATION_SIGNALS.filter((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  }).length;
  return personalizationHits >= AULA3_SECRET_THRESHOLDS.identidadePersonalizationMin;
}

/** —— Aula 04: plataformas · viewport · criatividade sob limite —— */

const PLATFORM_HISTORY_CORE = Object.freeze([
  [
    'plataforma',
    'plataformas',
    'console',
    'consoles',
    'hardware',
    'linha do tempo',
    'historico',
    'histórico',
  ],
  [
    'atari',
    'nes',
    'famicom',
    'snes',
    'mega drive',
    'genesis',
    'game boy',
    'gameboy',
    'gba',
    'game boy advance',
    '8-bit',
    '8 bit',
    '16-bit',
    '16 bit',
    'portatil',
    'portátil',
  ],
  [
    'resolucao',
    'resolução',
    'paleta',
    'sprites por scanline',
    'scanline',
    'restricao tecnica',
    'restrição técnica',
    'limitacao de hardware',
    'limitação de hardware',
  ],
]);

const VIEWPORT_SIZE_SIGNALS = Object.freeze([
  [
    'viewport width',
    'viewport height',
    'viewport width/height',
    'viewport nativo',
    'resolucao nativa',
    'resolução nativa',
    '320x180',
    '320×180',
    '480x270',
    '480×270',
    '160x144',
    '160×144',
    '256x224',
    '256×224',
  ],
]);

const STRETCH_VIEWPORT_SIGNALS = Object.freeze([
  [
    'stretch mode viewport',
    'mode viewport',
    'modo viewport',
    'stretch viewport',
    'stretch mode = viewport',
    'stretch mode: viewport',
  ],
]);

const STRETCH_ASPECT_KEEP_SIGNALS = Object.freeze([
  [
    'aspect keep',
    'keep aspect',
    'aspect = keep',
    'aspect: keep',
    'stretch aspect keep',
    'manter proporcao',
    'manter proporção',
    'proporcao preservada',
    'proporção preservada',
  ],
]);

const RESTRICTION_CREATIVITY_RESTRICTION = Object.freeze([
  [
    'restricao',
    'restrição',
    'limitacao',
    'limitação',
    'limite',
    'limites',
    'hardware',
    'sob restrição',
    'sob restricao',
    'sob limite',
  ],
]);

const RESTRICTION_CREATIVITY_SOLUTION = Object.freeze([
  [
    'criatividade',
    'criativo',
    'criativa',
    'solucao',
    'solução',
    'truque',
    'truques',
    'design',
    'mecanica',
    'mecânica',
    'visual',
    'forca criatividade',
    'força criatividade',
    'inventa',
    'inventar',
  ],
]);

export const AULA4_SECRET_THRESHOLDS = Object.freeze({
  arqueologoMin: 2,
  arqueologoTotal: PLATFORM_HISTORY_CORE.length,
  artesaoViewportMin: 1,
  artesaoStretchModeMin: 1,
  artesaoAspectMin: 1,
  criatividadeRestrictionMin: 1,
  criatividadeSolutionMin: 1,
});

/**
 * ≥2/3: plataforma/console · gerações nomeadas · restrição (resolução/paleta/sprites).
 */
export function matchesArqueologoDeHardware(normalizedText) {
  return coverageAtLeast(
    normalizedText,
    PLATFORM_HISTORY_CORE,
    AULA4_SECRET_THRESHOLDS.arqueologoMin
  );
}

/**
 * Viewport size + Stretch Mode viewport + Aspect keep (aliases PT/EN).
 */
export function matchesArtesaoDaViewport(normalizedText) {
  const viewportOk = coverageAtLeast(
    normalizedText,
    VIEWPORT_SIZE_SIGNALS,
    AULA4_SECRET_THRESHOLDS.artesaoViewportMin
  );
  const stretchOk = coverageAtLeast(
    normalizedText,
    STRETCH_VIEWPORT_SIGNALS,
    AULA4_SECRET_THRESHOLDS.artesaoStretchModeMin
  );
  const aspectOk = coverageAtLeast(
    normalizedText,
    STRETCH_ASPECT_KEEP_SIGNALS,
    AULA4_SECRET_THRESHOLDS.artesaoAspectMin
  );
  return viewportOk && stretchOk && aspectOk;
}

/**
 * Restrição/limitação/hardware + criatividade/solução/truque/design.
 */
export function matchesCriatividadeSobLimite(normalizedText) {
  const restrictionOk = coverageAtLeast(
    normalizedText,
    RESTRICTION_CREATIVITY_RESTRICTION,
    AULA4_SECRET_THRESHOLDS.criatividadeRestrictionMin
  );
  const solutionOk = coverageAtLeast(
    normalizedText,
    RESTRICTION_CREATIVITY_SOLUTION,
    AULA4_SECRET_THRESHOLDS.criatividadeSolutionMin
  );
  return restrictionOk && solutionOk;
}

/* ============================================================
   AULA 05 — ClassInd / IARC / Design Saudável
   ============================================================ */

const CLASSIND_SYSTEM_SIGNALS = Object.freeze([
  'classind',
  'iarc',
  'classificacao indicativa',
]);

const LIVRE_WORD_SIGNALS = Object.freeze([
  'livre',
  'faixa livre',
  'selo livre',
  'classificacao livre',
  'rating livre',
  'faixa-alvo livre',
  'faixa alvo livre',
]);

/** “L” só conta com contexto de faixa/selo/alvo (evita falso positivo). */
const LIVRE_L_PATTERNS = Object.freeze([
  /\bfaixa(?:[\s\-]?alvo)?\s*[:=]?\s*l\b/,
  /\balvo\s*[:=]?\s*l\b/,
  /\bselo\s*[:=]?\s*l\b/,
  /\brating\s*[:=]?\s*l\b/,
  /\bclassificacao\s*[:=]?\s*l\b/,
  /\biarc\s*[:=]?\s*l\b/,
  /\bclassind\s*[:=]?\s*l\b/,
  /\b(?:ate|maximo|para)\s+l\b/,
]);

const ATTENUATION_SIGNALS = Object.freeze([
  'atenuante',
  'atenua',
  'atenuar',
  'atenuacao',
]);

const AGGRAVATION_SIGNALS = Object.freeze([
  'agravante',
  'agrava',
  'agravar',
  'agravacao',
]);

const FANTASY_SIGNALS = Object.freeze([
  'fantasia',
  'fantastico',
  'nao-humano',
  'nao humano',
  'comicidade',
]);

const REALISM_SIGNALS = Object.freeze([
  'realismo',
  'realista',
]);

export const AULA5_SECRET_THRESHOLDS = Object.freeze({
  oraculoMin: 1,
  seloLivreMin: 1,
  balancaTermMin: 1,
});

/**
 * Keywords: ClassInd · IARC · classificação indicativa.
 */
export function matchesOraculoDoClassind(normalizedText) {
  const hits = CLASSIND_SYSTEM_SIGNALS.filter((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  }).length;
  return hits >= AULA5_SECRET_THRESHOLDS.oraculoMin;
}

/**
 * Faixa-alvo Livre (palavra) ou “L” contextual após higienização.
 */
export function matchesSeloDoLivre(normalizedText) {
  const wordHit = LIVRE_WORD_SIGNALS.some((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  });
  if (wordHit) return true;
  return LIVRE_L_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

/**
 * Atenuante OU agravante OU par fantasia × realismo.
 */
export function matchesBalancaDaFaixa(normalizedText) {
  const attenHit = ATTENUATION_SIGNALS.some((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  });
  if (attenHit) return true;

  const aggravHit = AGGRAVATION_SIGNALS.some((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  });
  if (aggravHit) return true;

  const fantasyHit = FANTASY_SIGNALS.some((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  });
  const realismHit = REALISM_SIGNALS.some((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && normalizedText.includes(needle);
  });
  return fantasyHit && realismHit;
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
  aula3: Object.freeze([
    {
      id: 'segredo_homo_ludens',
      test: (ctx) => matchesHomoLudens(ctx.normalizedText),
    },
    {
      id: 'segredo_artesao_do_pixel',
      test: (ctx) => matchesArtesaoDoPixel(ctx.normalizedText),
    },
    {
      id: 'segredo_identidade_ludica',
      test: (ctx) => matchesIdentidadeLudica(ctx.normalizedText),
    },
  ]),
  aula4: Object.freeze([
    {
      id: 'segredo_arqueologo_de_hardware',
      test: (ctx) => matchesArqueologoDeHardware(ctx.normalizedText),
    },
    {
      id: 'segredo_artesao_da_viewport',
      test: (ctx) => matchesArtesaoDaViewport(ctx.normalizedText),
    },
    {
      id: 'segredo_criatividade_sob_limite',
      test: (ctx) => matchesCriatividadeSobLimite(ctx.normalizedText),
    },
  ]),
  aula5: Object.freeze([
    {
      id: 'segredo_oraculo_do_classind',
      test: (ctx) => matchesOraculoDoClassind(ctx.normalizedText),
    },
    {
      id: 'segredo_selo_do_livre',
      test: (ctx) => matchesSeloDoLivre(ctx.normalizedText),
    },
    {
      id: 'segredo_balanca_da_faixa',
      test: (ctx) => matchesBalancaDaFaixa(ctx.normalizedText),
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
