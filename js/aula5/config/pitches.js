/**
 * Pitches 16+/18+ para Adequação Reversa (Aula 05 · Task 5).
 */

'use strict';

/** @typedef {{
 *  id: string,
 *  title: string,
 *  originalRating: '16'|'18',
 *  coreLoop: string,
 *  original: { visual: string, narrative: string, reward: string, enemies: string },
 *  axes: { violencia: string, sexo: string, drogas: string },
 *  hints: string[],
 * }} Pitch */

/** @type {Pitch[]} */
export const PITCHES = [
  {
    id: 'necropole-viral',
    title: 'Necrópole Viral',
    originalRating: '18',
    coreLoop: 'Eliminar ameaça → coletar recurso → recuperar vida → avançar zona',
    original: {
      visual: 'Zumbis com desmembramento explícito, sangue arterial e membros no chão.',
      narrative: 'Surto viral em cidade realista; civis mortos e cadáveres em close.',
      reward: 'Seringas / “drogas de combate” que restauram vida instantaneamente.',
      enemies: 'Humanos infectados recognizáveis (vizinhos, crianças em silhueta).',
    },
    axes: {
      violencia: 'Gore e violência extrema contra figuras humanas.',
      sexo: 'Não é o eixo principal.',
      drogas: 'Substâncias realistas como mecânica de cura (glamourização de uso).',
    },
    hints: [
      'Troque zumbis por robôs/sucata ou criaturas claramente não-humanas.',
      'Sangue → óleo, faíscas, gosma fantasiosa.',
      'Seringa → bateria mágica / núcleo de energia / poção claramente fantástica.',
    ],
  },
  {
    id: 'sombra-contrato',
    title: 'Sombra do Contrato',
    originalRating: '18',
    coreLoop: 'Infiltrar → eliminar alvo em stealth → escapar sem alerta',
    original: {
      visual: 'Execução sangrenta em close-up (garganta, faca, sangue no chão).',
      narrative: 'Assassinato por contrato em cenário contemporâneo realista.',
      reward: 'Combo de “finishers” brutais que dão XP extra quanto mais gráfico.',
      enemies: 'Guardas humanos com gritos de dor prolongados.',
    },
    axes: {
      violencia: 'Violência gráfica e recompensa por crueldade visual.',
      sexo: 'Não é o eixo principal.',
      drogas: 'Não é o eixo principal.',
    },
    hints: [
      'Finishers → nocaute / sono / captura com rede / desligamento robótico.',
      'Sem sangue: desmaio, holograma que se dissolve, “erro de sistema”.',
      'Preserve o stealth e o verbo “eliminar ameaça sem alerta”.',
    ],
  },
  {
    id: 'app-destinos',
    title: 'App de Destinos',
    originalRating: '16',
    coreLoop: 'Conversar → escolher resposta → subir afinidade → desbloquear encontro',
    original: {
      visual: 'Cenas de nudez parcial e poses sexuais em eventos de romance.',
      narrative: 'Dating sim com opções sexuais explícitas e “galeria adulta” como meta.',
      reward: 'Afinidade máxima libera cenas sexuais e itens com conotação erótica.',
      enemies: 'N/A (conflito social / rivais com ciúme sexual explícito).',
    },
    axes: {
      violencia: 'Baixa / simbólica.',
      sexo: 'Nudez e conteúdo sexual como recompensa central.',
      drogas: 'Não é o eixo principal.',
    },
    hints: [
      'Encontros → café, festival, missão cooperativa sem nudez.',
      'Recompensa → traje cosmético, música, final emotivo “PG”.',
      'Preserve o loop de diálogo + afinidade.',
    ],
  },
  {
    id: 'porao-horas',
    title: 'Porão das Horas',
    originalRating: '18',
    coreLoop: 'Explorar → gerenciar sanidade → sobreviver ao horro → escapar',
    original: {
      visual: 'Terror corporal realista; uso visível de substâncias para “aguentar o medo”.',
      narrative: 'Protagonista adult se droga para continuar na dungeon; decadência gráfica.',
      reward: 'Itens de “entorpecente” que restauram sanidade com animação realista de uso.',
      enemies: 'Ameaças humanas torturadas / cadáveres em evidência.',
    },
    axes: {
      violencia: 'Horror visceral e cadáveres.',
      sexo: 'Não é o eixo principal.',
      drogas: 'Uso realista de substâncias como mecânica central.',
    },
    hints: [
      'Entorpecente → amuleto, chá fantástico, “luz de Mnemosyne”, cristal de foco.',
      'Cadáveres → sombras, manequins, ecos sem anatomia.',
      'Preserve gestão de sanidade / medo sem glamourizar droga real.',
    ],
  },
];

export function getPitchById(id) {
  return PITCHES.find((p) => p.id === id) || null;
}

export function pickRandomPitch() {
  const i = Math.floor(Math.random() * PITCHES.length);
  return PITCHES[i];
}
