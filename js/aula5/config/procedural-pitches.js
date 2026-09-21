/**
 * Geração procedural de desafios 16+/18+ para Adequação Reversa (Aula 05).
 */

'use strict';

const TITLES = [
  'Arquivo Cinza',
  'Mercado das Máscaras',
  'Estação Nebulosa',
  'Clínica do Eco',
  'Arena de Vidro',
  'Bairro das Horas Mortas',
  'Protocolo Íris',
  'Templo do Reflexo',
];

const LOOPS = [
  'Eliminar ameaça → coletar recurso → recuperar vida → avançar zona',
  'Infiltrar → eliminar alvo em stealth → escapar sem alerta',
  'Conversar → escolher resposta → subir afinidade → desbloquear encontro',
  'Explorar → enfrentar pico de medo → estabilizar → seguir o próximo corredor',
  'Construir base → defender onda → reparar → expandir território',
];

const HEAVY_VISUAL = [
  'Desmembramento explícito, sangue arterial e membros no chão.',
  'Execução sangrenta em close-up com gritos prolongados.',
  'Cadáveres humanos recognizáveis em primeiro plano.',
  'Gore demoníaco com vísceras e impacto visceral.',
];

const HEAVY_NARRATIVE = [
  'Surto em cidade realista com civis mortos e trauma doméstico.',
  'Assassinato por contrato em cenário contemporâneo.',
  'Dating sim com opções sexuais explícitas como meta principal.',
  'Terror com uso realista de substâncias para “aguentar o medo”.',
];

const HEAVY_REWARD = [
  'Seringas / drogas de combate que restauram vida instantaneamente.',
  'Finishers brutais que dão XP quanto mais gráfico o kill.',
  'Afinidade máxima libera cenas sexuais e itens eróticos.',
  'Consumir substâncias realistas libera buffs permanentes.',
];

const HEAVY_ENEMIES = [
  'Humanos infectados recognizáveis (vizinhos, crianças em silhueta).',
  'Guardas humanos com dor prolongada e sangue no chão.',
  'Rivais com ciúme sexual explícito e nudez parcial.',
  'Ameaças humanas sob efeito de drogas realistas.',
];

const AXES_POOL = [
  {
    violencia: 'Gore e violência extrema contra figuras humanas.',
    sexo: 'Não é o eixo principal.',
    drogas: 'Substâncias realistas como mecânica (glamourização de uso).',
    dominant: 'violencia+drogas',
  },
  {
    violencia: 'Violência gráfica e recompensa por crueldade visual.',
    sexo: 'Não é o eixo principal.',
    drogas: 'Não é o eixo principal.',
    dominant: 'violencia',
  },
  {
    violencia: 'Baixa / simbólica.',
    sexo: 'Nudez e conteúdo sexual como recompensa central.',
    drogas: 'Não é o eixo principal.',
    dominant: 'sexo',
  },
  {
    violencia: 'Medo intenso e ameaça física.',
    sexo: 'Não é o eixo principal.',
    drogas: 'Uso detalhado e realista de substâncias sob estresse.',
    dominant: 'drogas',
  },
];

const HINTS_POOL = [
  [
    'Troque humanos por robôs, slimes ou criaturas claramente não-humanas.',
    'Sangue → óleo, faíscas, gosma fantasiosa.',
    'Seringa/droga → bateria mágica / poção claramente fantástica.',
  ],
  [
    'Finishers → nocaute, sono, captura ou “desligamento” de sistema.',
    'Sem sangue: desmaio, holograma que se dissolve.',
    'Preserve o verbo do loop (stealth, eliminar, escapar).',
  ],
  [
    'Encontros → café, festival, missão cooperativa sem nudez.',
    'Recompensa de afinidade → diálogo, traje cosmético, música.',
    'Mantenha o loop de conversa → escolha → afinidade.',
  ],
  [
    'Substância realista → amuleto, respiração, luz ritual.',
    'Medo sobe pela atmosfera, não pelo uso de drogas.',
    'Preserve explorar → enfrentar medo → estabilizar.',
  ],
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function slugify(title) {
  return String(title || 'desafio')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Monta um pitch 16+/18+ aleatório no mesmo formato dos presets.
 * @returns {import('./pitches.js').Pitch}
 */
export function generateProceduralPitch() {
  const title = pick(TITLES);
  const axesIndex = Math.floor(Math.random() * AXES_POOL.length);
  const axes = AXES_POOL[axesIndex];
  const rating = Math.random() < 0.55 ? '18' : '16';

  return {
    id: `proc-${slugify(title)}-${Date.now().toString(36).slice(-4)}`,
    title,
    originalRating: rating,
    coreLoop: pick(LOOPS),
    original: {
      visual: pick(HEAVY_VISUAL),
      narrative: pick(HEAVY_NARRATIVE),
      reward: pick(HEAVY_REWARD),
      enemies: pick(HEAVY_ENEMIES),
    },
    axes: {
      violencia: axes.violencia,
      sexo: axes.sexo,
      drogas: axes.drogas,
    },
    hints: HINTS_POOL[axesIndex] || HINTS_POOL[0],
    procedural: true,
  };
}
