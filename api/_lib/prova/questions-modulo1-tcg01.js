/**
 * Variante TCG01 da Provação do Círculo Mágico.
 * Mesmos conceitos e IDs (q01–q20) que o banco canônico (TCG02),
 * com enunciados/exemplos levemente reescritos e alternativas MC
 * reordenadas — a letra correta NÃO coincide com a do TCG02.
 *
 * Server-only. Não importar em JS público.
 */

/** @type {ReadonlyArray<object>} */
export const QUESTIONS_TCG01 = Object.freeze([
  Object.freeze({
    id: 'q01',
    index: 0,
    type: 'mc',
    points: 1,
    title: 'Questão 01',
    prompt:
      'O “Círculo Mágico” é o ponto de partida para ler a experiência do jogador. Considere o trecho:\n\n' +
      '“Dentro do círculo mágico, as leis e costumes da vida ordinária não contam.”\n\n' +
      'À luz desse texto e da Aula 01, o que ocorre, em conceito, no instante em que se pressiona Play na engine?',
    choices: Object.freeze({
      A: 'A interface da engine (Scene, FileSystem, Inspector) desaparece, e ninguém consegue mais alterar as regras físicas.',
      B: 'O jogador vai direto para um ambiente de código difícil e é obrigado a escrever scripts em GDScript.',
      C: 'O jogo força o jogador a agir como na vida real, usando só costumes do cotidiano.',
      D: 'O jogo cria um contrato de regras temporário e um espaço próprio: a vida cotidiana “pausa” e o sistema organiza o que pode acontecer dentro da experiência.',
      E: 'As regras do jogo são desligadas para sempre, para proteger o jogador das limitações do hardware.',
    }),
  }),
  Object.freeze({
    id: 'q02',
    index: 1,
    type: 'mc',
    points: 1,
    title: 'Questão 02',
    prompt:
      'Na prática da Godot 4 (Aula 01), certos painéis tornam visíveis e editáveis as regras “invisíveis” do jogo. Qual é a função principal da combinação Inspector + Viewport 2D ao ajustar um RigidBody2D?',
    choices: Object.freeze({
      A: 'Os dois servem só para escrever e compilar scripts do Input Map e do Core Loop.',
      B: 'Permitem ver e alterar propriedades físicas (massa, gravidade, fricção, elasticidade) e observar na hora o efeito dessas mudanças.',
      C: 'O Inspector organiza a hierarquia das cenas; a Viewport 2D lista áudio e imagens em pastas.',
      D: 'Servem principalmente para importar pixel art e aplicar filtros culturais no sprite.',
      E: 'Servem para imitar resoluções antigas (Atari 2600, NES) redimensionando a tela.',
    }),
  }),
  Object.freeze({
    id: 'q03',
    index: 2,
    type: 'mc',
    points: 1,
    title: 'Questão 03',
    prompt:
      'Para sair da observação e entrar na interação, o time precisa do vocabulário do ofício. Leia o trecho da Aula 02:\n\n' +
      '“Glossário nomeia o ofício; a cena do Player é o primeiro lugar onde esses termos viram estrutura.”\n\n' +
      'Segundo esse trecho e o material, o que é Core Loop na prática?',
    choices: Object.freeze({
      A: 'O ciclo básico e repetitivo de ações do jogador (exemplo: andar → coletar → avançar).',
      B: 'O momento em que os controles saem da cabeça e vão para a memória muscular (sem pensar nas teclas).',
      C: 'O conjunto de imagens, sons e arquivos do FileSystem usados várias vezes no projeto.',
      D: 'A “receita” reutilizável de um nó (arquivo .tscn) para clonar inimigos e cenários.',
      E: 'O sistema de física da Godot 4 que calcula fricção e elasticidade de um StaticBody2D o tempo todo.',
    }),
  }),
  Object.freeze({
    id: 'q04',
    index: 3,
    type: 'mc',
    points: 1,
    title: 'Questão 04',
    prompt:
      'Na Godot 4, “tudo é um nó” e uma cena é uma “receita de bolo” reutilizável. Para montar um personagem que responde a comandos e colide com o cenário de forma controlada, qual hierarquia a Aula 02 apresentou?',
    choices: Object.freeze({
      A: 'Raiz RigidBody2D (Player), com filhos Sprite2D e Input Map.',
      B: 'Raiz StaticBody2D (Player), com filhos CharacterBody2D e a função move_and_slide.',
      C: 'Raiz CharacterBody2D (Player), com filhos Sprite2D e CollisionShape2D.',
      D: 'Raiz Node2D (Player), com filhos Viewport 2D e CollisionShape2D.',
      E: 'Raiz CollisionShape2D (Player), com filhos CharacterBody2D e Sprite2D.',
    }),
  }),
  Object.freeze({
    id: 'q05',
    index: 4,
    type: 'mc',
    points: 1,
    title: 'Questão 05',
    prompt:
      'A Aula 03 traz as ideias de Johan Huizinga: o jogo não é só software de regras — também participa da cultura. Leia:\n\n' +
      '“A cultura joga — e o sprite é uma das máscaras com que esse jogo se mostra.”\n\n' +
      'Com base nisso e no conceito de Homo Ludens, assinale a melhor descrição da relação entre jogos digitais e identidade cultural:',
    choices: Object.freeze({
      A: 'Usar sprite com marca cultural é obrigação do Ministério da Justiça para conseguir o selo IARC.',
      B: 'O jogo é só uma pausa das coisas sérias; serve apenas para decorar o cenário com folclore.',
      C: 'Identidade cultural de verdade só vale com física hiper-realista; sprites 2D artísticos não contam.',
      D: 'A cultura humana nasce e cresce também pelo jogo; por isso lendas, folclore e paisagens locais não são só enfeite — devem virar sistemas jogáveis.',
      E: 'Homo Ludens manda separar cultura intelectual da diversão, deixando o Círculo Mágico sem referências do mundo real.',
    }),
  }),
  Object.freeze({
    id: 'q06',
    index: 5,
    type: 'mc',
    points: 1,
    title: 'Questão 06',
    prompt:
      'Ao importar pixel art (ex.: pacote Tiny Swords), a Godot 4 pode suavizar a imagem por padrão e deixá-la embaçada. Qual configuração no Inspector garante nitidez no Sprite2D?',
    choices: Object.freeze({
      A: 'Mudar Texture para Smooth, para suavizar os pixels.',
      B: 'Mudar Window Override para o modo Stretch.',
      C: 'Ativar colisão do tipo Nearest no CollisionShape2D.',
      D: 'Ajustar Scale Mode para Viewport no painel FileSystem.',
      E: 'Mudar Filter para Nearest, para manter a aresta do pixel nítida.',
    }),
  }),
  Object.freeze({
    id: 'q07',
    index: 6,
    type: 'mc',
    points: 1,
    title: 'Questão 07',
    prompt:
      'Muitas vezes o bom design nasce da restrição técnica. Para manter estética retrô (ex.: 320×180) e evitar pixels “esmagados” ao redimensionar a janela, qual combinação em Project Settings → Display → Window está correta?',
    choices: Object.freeze({
      A: 'Stretch Mode: viewport, Aspect: keep, Scale Mode: integer.',
      B: 'Stretch Mode: disabled, Aspect: ignore, Scale Mode: fractional.',
      C: 'Stretch Mode: canvas_items, Aspect: expand, Scale Mode: nearest.',
      D: 'Stretch Mode: viewport, Aspect: keep, Scale Mode: fractional.',
      E: 'Stretch Mode: canvas_items, Aspect: keep, Scale Mode: integer.',
    }),
  }),
  Object.freeze({
    id: 'q08',
    index: 7,
    type: 'mc',
    points: 1,
    title: 'Questão 08',
    prompt:
      'Na Aula 04, a “restrição técnica” mostra como o limite do hardware molda o design de uma geração. O NES (console 8-bit de mesa) tinha limites fortes. Qual alternativa descreve melhor esses limites e as soluções criativas da época?',
    choices: Object.freeze({
      A: 'O NES rodava em 720p com cores quase ilimitadas, então não precisava reutilizar tiles.',
      B: 'A principal restrição do NES era ser obrigado a usar o IARC, que censurava os temas dos jogos 8-bit.',
      C: 'Com resolução cerca de 256×240 e poucas cores (~52), a pouca RAM e o limite de sprites por linha da tela geravam flicker; os designers reaproveitavam tiles e criavam mecânicas que escondiam os limites do hardware.',
      D: 'Consoles 8-bit dependiam só do filtro Nearest com Mode 7, deixando personagens só como silhuetas.',
      E: 'O hardware dos anos 70–80 tinha GPU ilimitada; a baixa resolução era escolha só por motivos folclóricos e culturais.',
    }),
  }),
  Object.freeze({
    id: 'q09',
    index: 8,
    type: 'mc',
    points: 1,
    title: 'Questão 09',
    prompt:
      'Antes de publicar um jogo, é preciso compreender o público e como a sociedade o avalia. No Brasil usamos o ClassInd. Qual é a função principal desse sistema?',
    choices: Object.freeze({
      A: 'Censurar e proibir desenvolver/exibir jogos com qualquer menção a drogas ou violência.',
      B: 'Cobrar impostos altos de desenvolvedores independentes em troca de selos nas lojas.',
      C: 'Certificar qualidade lúdica e obrigar todos os jogos a serem “Livre”, punindo estética fotorrealista.',
      D: 'Servir principalmente como aviso de conteúdo e informação para famílias e responsáveis, olhando três eixos (Violência, Sexo e Drogas) com atenuantes e agravantes — sem ser censura prévia.',
      E: 'Avaliar se o código, o Core Loop e as colisões estão sem bugs antes de dar o selo de “design saudável”.',
    }),
  }),
  Object.freeze({
    id: 'q10',
    index: 9,
    type: 'mc',
    points: 1,
    title: 'Questão 10',
    prompt:
      'Dois jogos compartilham o mesmo Core Loop: “andar furtivo → mirar → lançar um projétil no inimigo → coletar item de cura”. O Jogo A fica “10 anos” e o Jogo B fica “18 anos”. Pelo Design Saudável da Aula 05, por quê?',
    choices: Object.freeze({
      A: 'Porque o IARC prejudica jogos gratuitos e favorece só estúdios AAA, sem olhar o conteúdo.',
      B: 'Por causa do feedback visual e temático: o Jogo A usa violência leve, irreal e fantasiosa, sem sangue; o Jogo B usa realismo agressivo, sangue e gore (agravantes).',
      C: 'Por causa do Grokking: o Jogo B tem comandos mais difíceis, então sobe a faixa etária.',
      D: 'Porque o Jogo A usou filtro Nearest na pixel art, e isso “esconde” conteúdo sensível automaticamente.',
      E: 'Porque o Jogo B usou RigidBody2D, e a física imprevisível aumenta sozinha a classificação de violência.',
    }),
  }),
  Object.freeze({
    id: 'q11',
    index: 10,
    type: 'mc',
    points: 1,
    title: 'Questão 11',
    prompt:
      'Para alcançar mais público (ou baixar a faixa etária no IARC), a equipe pode fazer um “Patch Note de Higienização”. Qual exemplo melhor mostra um atenuante aceito pela classificação?',
    choices: Object.freeze({
      A: 'Aumentar o detalhe do cadáver no chão para educar moralmente o jogador.',
      B: 'Trocar poções mágicas de cura por injeções realistas de drogas glamorizadas.',
      C: 'Trocar oponentes humanos armados por criaturas irreais, fantasiosas e cômicas.',
      D: 'Colocar diálogos pesados e com conotação sexual para “mascarar” a violência.',
      E: 'Subir a resolução de 320×180 para 4K, esperando que a violência pareça menos pesada.',
    }),
  }),
  Object.freeze({
    id: 'q12',
    index: 11,
    type: 'mc',
    points: 1,
    title: 'Questão 12',
    prompt:
      'O Módulo 1 segue esta ordem:\n' +
      '1. Jogo como regras (Círculo Mágico).\n' +
      '2. Movimento inicial (Player e Glossário).\n' +
      '3. Identidade visual (Homo Ludens e Sprite com Nearest).\n' +
      '4. Restrição de hardware / resolução nativa (Viewport Settings).\n' +
      '5. Classificação e ética de lançamento (ClassInd/IARC).\n\n' +
      'Se o aluno pular o passo 4, qual problema aparece ao rodar o jogo 2D pixelizado em monitor HD?',
    choices: Object.freeze({
      A: 'O Core Loop atrasa o input e o jogador nunca chega ao Grokking.',
      B: 'O jogo é banido das lojas por não mostrar o formulário IARC na tela.',
      C: 'A tela distorce: ao redimensionar a janela, a arte deixa de respeitar proporções nítidas e a estética clássica da etapa 3 se estraga.',
      D: 'A física do Inspector conflita com o CharacterBody2D e gera velocidade infinita.',
      E: 'Massa, fricção e elasticidade somem de dentro do Círculo Mágico.',
    }),
  }),
  Object.freeze({
    id: 'q13',
    index: 12,
    type: 'discursive',
    points: 1,
    title: 'Questão 13: O Dilema do Arquivista Retro',
    role: 'Arquiteto sênior de conversão / portabilidade.',
    scenario:
      'Seu estúdio indie vai fazer um demake (versão intencionalmente retrô) de um título AAA conhecido, no estilo de portáteis 16-bit (ex.: Game Boy Color). A pixel art ficou boa, mas o programador júnior jogou tudo na engine e deu errado: ao maximizar a janela no Windows, os pixels viram retângulos tortos (shimmering) e barras pretas estranhas aparecem.',
    mission:
      'Escreva um memorando técnico curto para o Diretor de Arte e o júnior. Nele:\n' +
      '(a) Liste os passos e configurações na Godot 4 para corrigir o redimensionamento da janela (Aula 04);\n' +
      '(b) Explique, com o conceito de “restrição técnica”, por que limitar a resolução nativa ajuda a criatividade do estúdio, em vez de só atrapalhar.',
    prompt:
      'Seu papel: Arquiteto sênior de conversão / portabilidade.\n\n' +
      'Cenário: Seu estúdio indie vai fazer um demake (versão intencionalmente retrô) de um título AAA conhecido, no estilo de portáteis 16-bit (ex.: Game Boy Color). A pixel art ficou boa, mas o programador júnior jogou tudo na engine e deu errado: ao maximizar a janela no Windows, os pixels viram retângulos tortos (shimmering) e barras pretas estranhas aparecem.\n\n' +
      'Missão: Escreva um memorando técnico curto para o Diretor de Arte e o júnior. Nele:\n' +
      '(a) Liste os passos e configurações na Godot 4 para corrigir o redimensionamento da janela (Aula 04);\n' +
      '(b) Explique, com o conceito de “restrição técnica”, por que limitar a resolução nativa ajuda a criatividade do estúdio, em vez de só atrapalhar.',
  }),
  Object.freeze({
    id: 'q14',
    index: 13,
    type: 'discursive',
    points: 1,
    title: 'Questão 14: O Tribunal da Classificação Indicativa',
    role: 'Conselheiro de Design Saudável e ClassInd.',
    scenario:
      'A equipe apresenta um protótipo de sobrevivência urbana: você é um justiceiro que elimina membros de cartéis em becos hiper-realistas com armas de fogo e coleta cápsulas químicas dos corpos para recuperar energia. O contrato pede público jovem, mas no estado atual o jogo tende a cair em 16 ou 18 anos no ClassInd. O Diretor Criativo não aceita mudar o Core Loop (andar, atirar para remover obstáculos, coletar item de cura devem continuar iguais no código).',
    mission:
      'Escreva um “Patch Note de Higienização”. Proponha mudanças no feedback (visual, som e narrativa) nos eixos Violência e Drogas, usando atenuantes, para tentar chegar a Livre (L) ou no máximo 10 anos — sem alterar o Core Loop. Justifique cada mudança com a Aula 05.',
    prompt:
      'Seu papel: Conselheiro de Design Saudável e ClassInd.\n\n' +
      'Cenário: A equipe apresenta um protótipo de sobrevivência urbana: você é um justiceiro que elimina membros de cartéis em becos hiper-realistas com armas de fogo e coleta cápsulas químicas dos corpos para recuperar energia. O contrato pede público jovem, mas no estado atual o jogo tende a cair em 16 ou 18 anos no ClassInd. O Diretor Criativo não aceita mudar o Core Loop (andar, atirar para remover obstáculos, coletar item de cura devem continuar iguais no código).\n\n' +
      'Missão: Escreva um “Patch Note de Higienização”. Proponha mudanças no feedback (visual, som e narrativa) nos eixos Violência e Drogas, usando atenuantes, para tentar chegar a Livre (L) ou no máximo 10 anos — sem alterar o Core Loop. Justifique cada mudança com a Aula 05.',
  }),
  Object.freeze({
    id: 'q15',
    index: 14,
    type: 'discursive',
    points: 1,
    title: 'Questão 15: Física vs controle do Player',
    prompt:
      'Na Aula 01, usamos RigidBody2D e alteramos massa, gravidade, fricção e elasticidade no Inspector sem código. Na Aula 02, passamos para CharacterBody2D com Input Map e move_and_slide().\n\n' +
      'Explique, com suas palavras, a diferença de comportamento e de controle entre os dois. Por que, na prática, o desenvolvedor usa quase sempre CharacterBody2D para o Player, e não deixa o RigidBody2D (física pura) mandar no personagem principal?',
  }),
  Object.freeze({
    id: 'q16',
    index: 15,
    type: 'discursive',
    points: 1,
    title: 'Questão 16: O Sprite e a máscara cultural',
    prompt:
      'Em Homo Ludens (1938), Johan Huizinga afirma que “a cultura humana surge e se desenvolve como jogo”. Na Aula 03, ao preparar um Sprite na Godot, você foi convidado a dar identidade local ao personagem (folclore, fauna, cidade, etc.).\n\n' +
      'Em um texto curto, explique por que vestir o Player com uma “máscara cultural” local não é só decoração. Como essa escolha de design coloca a ideia de Huizinga em prática nos jogos de hoje?',
  }),
  Object.freeze({
    id: 'q17',
    index: 16,
    type: 'discursive',
    points: 1,
    title: 'Questão 17: Core Loop e Grokking',
    prompt:
      'No glossário do desenvolvedor, dois termos centrais são Core Loop e Grokking.\n\n' +
      'Compare os dois e explique a relação de causa e efeito entre eles: o que o Core Loop precisa ter (e como deve ser o feedback) para o jogador chegar ao Grokking — aquele momento em que as mãos “já sabem” o que fazer, sem pensar nas teclas?',
  }),
  Object.freeze({
    id: 'q18',
    index: 17,
    type: 'discursive',
    points: 1,
    title: 'Questão 18: Como o Player se move na tela',
    prompt:
      'Na Godot 4, uma cena é como uma “receita de bolo” feita de nós.\n\n' +
      'Descreva, em ordem, como se conversam: o Input Map (Project Settings), o script que lê as teclas/ações, e a cena com CharacterBody2D (raiz), Sprite2D (filho) e CollisionShape2D (filho). Como esses pedaços juntos viram o movimento visível do personagem na tela?',
  }),
  Object.freeze({
    id: 'q19',
    index: 18,
    type: 'discursive',
    points: 1,
    title: 'Questão 19: Nearest e Integer Scale',
    prompt:
      'Nas Aulas 03 e 04, duas configurações protegem a pixel art: filtro Nearest e Stretch Mode com escala Integer.\n\n' +
      'Explique a diferença: o que o Nearest protege no asset (imagem/sprite), e o que o Integer Scale protege na janela/tela quando o jogador redimensiona o jogo.',
  }),
  Object.freeze({
    id: 'q20',
    index: 19,
    type: 'discursive',
    points: 1,
    title: 'Questão 20: Síntese de lançamento',
    prompt:
      'Sua equipe terminou o Módulo 1 e quer lançar o jogo de graça nas lojas digitais. O título usa folclore nordestino: o herói enfrenta criaturas mágicas do sertão, atira bolhas de “energia condensada” com estilingue e pula em plataformas retrô.\n\n' +
      'Escreva um relatório curto, com base na Aula 05, respondendo:\n' +
      '1. Como o IARC ajuda a distribuir o jogo no mundo de forma mais simples e barata;\n' +
      '2. Como o ClassInd leria o feedback das bolhas de energia mágica contra inimigos não humanos, comparado a um jogo com sangue real — e qual faixa etária (Livre ou 10 anos, etc.) faz mais sentido, com justificativa.',
  }),
]);

/**
 * Gabarito MC da variante TCG01 (letras diferentes do banco canônico TCG02).
 * @type {Readonly<Record<string, 'A'|'B'|'C'|'D'|'E'>>}
 */
export const MC_ANSWER_KEY_TCG01 = Object.freeze({
  q01: 'D',
  q02: 'B',
  q03: 'A',
  q04: 'C',
  q05: 'D',
  q06: 'E',
  q07: 'A',
  q08: 'C',
  q09: 'D',
  q10: 'B',
  q11: 'C',
  q12: 'C',
});
