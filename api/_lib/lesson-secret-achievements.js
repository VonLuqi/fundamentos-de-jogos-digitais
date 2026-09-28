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

/** Polo brasileiro — não basta IARC sozinho. */
const CLASSIND_BR_SIGNALS = Object.freeze([
  'classind',
  'classificacao indicativa',
]);

/** Polo lojas / consórcio — não basta ClassInd sozinho. */
const IARC_STORE_SIGNALS = Object.freeze([
  'iarc',
  'international age rating',
  'consorcio',
  'lojas digitais',
]);

/**
 * Faixa-alvo Livre/L/10 com contexto. “não é Livre” ou “livre” solto não conta.
 * 10 é entrega plena da oficina (Livre ou 10).
 * Aceita um trecho curto entre “faixa-alvo” e o valor (“ficou Livre”, “: 10”).
 */
const FAIXA_ALVO_VALUE_PATTERNS = Object.freeze([
  /\bfaixa(?:[\s\-]?alvo)?[\s\S]{0,32}?\b(livre|l|10)\b/,
  /\balvo[^a-z0-9]{0,12}(livre|l|10)\b/,
  /\brating[^a-z0-9]{0,12}(livre|l|10)\b/,
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
  oraculoPoles: 2,
  seloLivreMin: 1,
  balancaTermMin: 2,
});

function hasAnySignal(normalizedText, signals) {
  return (Array.isArray(signals) ? signals : []).some((signal) => {
    const needle = normalizeForSecretCheck(signal);
    return needle && String(normalizedText || '').includes(needle);
  });
}

/**
 * Sistema brasileiro E consórcio das lojas (ClassInd/classificação indicativa + IARC).
 */
export function matchesOraculoDoClassind(normalizedText) {
  return hasAnySignal(normalizedText, CLASSIND_BR_SIGNALS)
    && hasAnySignal(normalizedText, IARC_STORE_SIGNALS);
}

/**
 * Documentou faixa-alvo Livre/L ou 10 (oficina aceita as duas).
 */
export function matchesSeloDoLivre(normalizedText) {
  const text = String(normalizedText || '');
  return FAIXA_ALVO_VALUE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Distinguiu os dois pratos: atenuante E agravante, ou par fantasia × realismo.
 */
export function matchesBalancaDaFaixa(normalizedText) {
  const attenHit = hasAnySignal(normalizedText, ATTENUATION_SIGNALS);
  const aggravHit = hasAnySignal(normalizedText, AGGRAVATION_SIGNALS);
  if (attenHit && aggravHit) return true;

  const fantasyHit = hasAnySignal(normalizedText, FANTASY_SIGNALS);
  const realismHit = hasAnySignal(normalizedText, REALISM_SIGNALS);
  return fantasyHit && realismHit;
}

/* ============================================================
   AULA 06 — Mercado / PI / Monetização ética / Loja Godot
   ============================================================ */

/** Polo mercado (geografia / indústria). */
const MERCADO_CORE = Object.freeze([
  ['mercado', 'industria de jogos', 'industria dos jogos', 'industria'],
]);

const MERCADO_GEO = Object.freeze([
  ['brasil', 'brasileiro', 'nacional', 'bgs', 'sbgames'],
  ['internacional', 'global', 'exterior', 'mundo', 'steam', 'mobile'],
  ['indie', 'aaa', 'mid-core', 'midcore'],
]);

/** Polo Original IP × prestação de serviços. */
const IP_AUTHORAL = Object.freeze([
  ['original ip', 'ip proprio', 'ip próprio', 'propriedade intelectual', 'autoral', 'dono do ip'],
  ['ip'],
]);

const IP_SERVICE = Object.freeze([
  ['prestacao de servicos', 'prestação de serviços', 'outsourcing', 'gamificacao', 'gamificação'],
  ['servico', 'servicos', 'serviço', 'serviços', 'work-for-hire', 'work for hire'],
]);

/** Sinais da loja prática (preço fixo / cosmético / UI / anti-azar). */
const LOJA_SHOP_SIGNALS = Object.freeze([
  ['loja', 'balcao', 'balcão', 'interface de loja'],
]);

const LOJA_PRICE_SIGNALS = Object.freeze([
  ['preco fixo', 'preço fixo', 'preco', 'preço', 'deterministico', 'determinístico'],
]);

const LOJA_COSMETIC_SIGNALS = Object.freeze([
  ['cosmetico', 'cosmético', 'chapeu', 'chapéu', 'capa', 'aura', 'skin'],
]);

const LOJA_COIN_SIGNALS = Object.freeze([
  ['moeda', 'moedas', 'saldo', 'coletar moeda', 'moedas da fase', 'ganhas jogando'],
]);

const LOJA_UI_SIGNALS = Object.freeze([
  ['button', 'botao', 'botão', 'panelcontainer', 'panel', 'pressed', 'sinal', 'gdscript', 'control'],
]);

const LOJA_ANTI_LOOT_SIGNALS = Object.freeze([
  ['sem loot', 'sem sorte', 'sem randi', 'sem aposta', 'sem azar', 'nao loot', 'não loot'],
  ['loot box', 'lootbox'],
]);

/** Ética / tempo do jogador / ClassInd 18+ em azar. */
const ETICA_PHRASE_SIGNALS = Object.freeze([
  ['monetizacao etica', 'monetização ética', 'design etico', 'design ético', 'receita etica', 'receita ética'],
  ['sustentavel', 'sustentável', 'respeitar o jogador', 'respeita o jogador'],
]);

const TEMPO_JOGADOR_SIGNALS = Object.freeze([
  ['tempo do jogador', 'respeitar o tempo', 'respeita o tempo', 'respeito ao tempo'],
]);

const CLASSIND_AZAR_SIGNALS = Object.freeze([
  ['classind', '18+', '18 +', 'jogo de azar', 'jogos de azar', 'microtransacao', 'microtransação'],
  ['loot box', 'lootbox', 'mecanica abusiva', 'mecânica abusiva'],
]);

export const AULA6_SECRET_THRESHOLDS = Object.freeze({
  mercadorMarketMin: 2,
  mercadorIpMin: 2,
  balcaoMin: 3,
  balcaoTotal: 6,
  tempoEthicsMin: 1,
  tempoPoleMin: 1,
});

/** `etica`/`etico` com fronteira de palavra — evita falso positivo em "cosmetico". */
function hasEthicsWord(normalizedText) {
  return /\betica\b|\betico\b/.test(String(normalizedText || ''));
}

/**
 * Mercado BR/internacional (≥2 sinais de mercado) OU Original IP × serviços (ambos polos).
 */
export function matchesMercadorDoStyx(normalizedText) {
  const marketCore = coverageAtLeast(normalizedText, MERCADO_CORE, 1);
  const marketGeo = coverageAtLeast(normalizedText, MERCADO_GEO, 1);
  if (marketCore && marketGeo) return true;
  if (coverageAtLeast(normalizedText, MERCADO_GEO, AULA6_SECRET_THRESHOLDS.mercadorMarketMin)) {
    return true;
  }

  const ipHit = coverageAtLeast(normalizedText, IP_AUTHORAL, 1);
  const serviceHit = coverageAtLeast(normalizedText, IP_SERVICE, 1);
  return ipHit && serviceHit;
}

/**
 * Loja com evidência prática: ≥3 entre loja · preço · cosmético · moeda · UI · anti-loot.
 */
export function matchesBalcaoSemAzar(normalizedText) {
  const groups = [
    LOJA_SHOP_SIGNALS,
    LOJA_PRICE_SIGNALS,
    LOJA_COSMETIC_SIGNALS,
    LOJA_COIN_SIGNALS,
    LOJA_UI_SIGNALS,
    LOJA_ANTI_LOOT_SIGNALS,
  ];
  let hits = 0;
  for (const group of groups) {
    if (coverageAtLeast(normalizedText, group, 1)) hits += 1;
  }
  return hits >= AULA6_SECRET_THRESHOLDS.balcaoMin;
}

/**
 * Monetização ética E (tempo do jogador OU ClassInd/18+/azar abusivo).
 */
export function matchesTempoRespeitado(normalizedText) {
  const ethicsOk = hasEthicsWord(normalizedText)
    || coverageAtLeast(
      normalizedText,
      ETICA_PHRASE_SIGNALS,
      AULA6_SECRET_THRESHOLDS.tempoEthicsMin
    );
  if (!ethicsOk) return false;

  const timeOk = coverageAtLeast(
    normalizedText,
    TEMPO_JOGADOR_SIGNALS,
    AULA6_SECRET_THRESHOLDS.tempoPoleMin
  );
  const classindOk = coverageAtLeast(
    normalizedText,
    CLASSIND_AZAR_SIGNALS,
    AULA6_SECRET_THRESHOLDS.tempoPoleMin
  );
  return timeOk || classindOk;
}

/* ============================================================
   AULA 07 — Papéis / Workflow / Scope Creep / Versionamento
   ============================================================ */

/** Cinco ofícios de estúdio (cada grupo = um papel). */
const OFICIO_PROGRAMACAO = Object.freeze([
  ['programacao', 'programação', 'programador', 'codigo', 'código', 'script', 'gdscript'],
]);

const OFICIO_ARTE = Object.freeze([
  ['artista', 'sprites', 'sprite', 'pixel art', 'arte do cenario', 'arte do cenário', 'papel de arte', 'oficio de arte', 'ofício de arte'],
]);

const OFICIO_AUDIO = Object.freeze([
  ['audio', 'áudio', 'sfx', 'musica', 'música', 'efeito sonoro', 'papel de audio', 'papel de áudio'],
]);

const OFICIO_DESIGN = Object.freeze([
  ['game design', 'gamedesign', 'designer', 'gdd', 'regras do jogo', 'core loop'],
]);

const OFICIO_PRODUCAO = Object.freeze([
  ['producao', 'produção', 'produtor', 'cronograma', 'produtor do dia'],
]);

/** Scope Creep / cercado do MVP. */
const SCOPE_CREEP_SIGNALS = Object.freeze([
  ['scope creep', 'scopecreep', 'estouro de escopo', 'escopo creep'],
]);

const SCOPE_CUT_SIGNALS = Object.freeze([
  ['fora do escopo', 'fora do mvp', 'cortamos', 'cortar', 'cercado'],
  ['mvp', 'nao faremos', 'não faremos', 'fica de fora', 'deixamos de fora'],
]);

/** Pastas / cenas / sync. */
const PASTA_GODOT_SIGNALS = Object.freeze([
  ['pasta', 'pastas', 'filesystem', 'file system'],
  ['cenas/', 'sprites/', 'audio/', 'scripts/', 'labirintodemoedas', 'labirinto de moedas'],
]);

const CENA_TSCN_SIGNALS = Object.freeze([
  ['.tscn', 'tscn', 'player.tscn', 'moeda.tscn', 'cenario.tscn', 'cenário.tscn'],
  ['cena-esqueleto', 'cena esqueleto', 'cenas-esqueleto', 'stub'],
]);

const PASTA_SYNC_SIGNALS = Object.freeze([
  ['pasta compartilhada', 'pasta sync', 'drive', 'onedrive', 'google drive'],
  ['versionamento', 'backup', 'zip', 'nao sobrescrever', 'não sobrescrever', 'anti-sobrescrita'],
]);

export const AULA7_SECRET_THRESHOLDS = Object.freeze({
  oficiosMin: 2,
  pastaMin: 2,
  pastaTotal: 3,
});

/**
 * ≥2 papéis de estúdio citados (prog / arte / áudio / design / produção).
 */
export function matchesCincoOficios(normalizedText) {
  const groups = [
    OFICIO_PROGRAMACAO,
    OFICIO_ARTE,
    OFICIO_AUDIO,
    OFICIO_DESIGN,
    OFICIO_PRODUCAO,
  ];
  let hits = 0;
  for (const group of groups) {
    if (coverageAtLeast(normalizedText, group, 1)) hits += 1;
  }
  return hits >= AULA7_SECRET_THRESHOLDS.oficiosMin;
}

/**
 * Menciona Scope Creep OU evidencia corte explícito / fora do escopo / MVP.
 */
export function matchesCercadoDoEscopo(normalizedText) {
  if (coverageAtLeast(normalizedText, SCOPE_CREEP_SIGNALS, 1)) return true;
  return coverageAtLeast(normalizedText, SCOPE_CUT_SIGNALS, 1);
}

/**
 * ≥2 entre: pastas Godot · cena/.tscn · pasta compartilhada/versionamento.
 */
export function matchesPastaSagrada(normalizedText) {
  const groups = [
    PASTA_GODOT_SIGNALS,
    CENA_TSCN_SIGNALS,
    PASTA_SYNC_SIGNALS,
  ];
  let hits = 0;
  for (const group of groups) {
    if (coverageAtLeast(normalizedText, group, 1)) hits += 1;
  }
  return hits >= AULA7_SECRET_THRESHOLDS.pastaMin;
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
  aula6: Object.freeze([
    {
      id: 'segredo_mercador_do_styx',
      test: (ctx) => matchesMercadorDoStyx(ctx.normalizedText),
    },
    {
      id: 'segredo_balcao_sem_azar',
      test: (ctx) => matchesBalcaoSemAzar(ctx.normalizedText),
    },
    {
      id: 'segredo_tempo_respeitado',
      test: (ctx) => matchesTempoRespeitado(ctx.normalizedText),
    },
  ]),
  aula7: Object.freeze([
    {
      id: 'segredo_cinco_oficios',
      test: (ctx) => matchesCincoOficios(ctx.normalizedText),
    },
    {
      id: 'segredo_cercado_do_escopo',
      test: (ctx) => matchesCercadoDoEscopo(ctx.normalizedText),
    },
    {
      id: 'segredo_pasta_sagrada',
      test: (ctx) => matchesPastaSagrada(ctx.normalizedText),
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
