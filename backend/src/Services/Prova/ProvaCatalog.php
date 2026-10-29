<?php
declare(strict_types=1);

namespace App\Services\Prova;

use App\Services\Prova\Exams\Modulo2Exam;
use App\Services\Prova\Exams\TrabalhoFinalExam;

/**
 * Questões, gabarito oficial e rubricas da Prova Módulo 1 (`api/_lib/prova/questions-modulo1.js` + `answer-key-modulo1.js`).
 * Server-only: o gabarito nunca é enviado ao cliente antes de `status = 'graded'`.
 */
final class ProvaCatalog
{
    public const EXAM_ID = 'modulo1-provacao';
    public const EXAM_TITLE = 'Avaliação Imersiva: A Provação do Círculo Mágico e a Forja do Desenvolvedor';
    public const QUESTION_COUNT = 20;
    public const MC_QUESTION_COUNT = 12;
    public const DISCURSIVE_QUESTION_COUNT = 8;
    public const MC_POINTS_EACH = 1;
    public const DISCURSIVE_POINTS_EACH = 1;
    public const TOTAL_POINTS = 20;

    public const MC_ANSWER_KEY = [
        'q01' => 'B',
        'q02' => 'C',
        'q03' => 'D',
        'q04' => 'D',
        'q05' => 'B',
        'q06' => 'C',
        'q07' => 'B',
        'q08' => 'B',
        'q09' => 'B',
        'q10' => 'C',
        'q11' => 'A',
        'q12' => 'D',
    ];

    public const MC_JUSTIFICATIONS = [
        'q01' => 'Círculo Mágico = contrato de regras temporário ao apertar Play. As outras misturam código, interface ou hardware.',
        'q02' => 'Inspector edita física; Viewport 2D mostra o efeito na hora — sem precisar de código.',
        'q03' => 'Core Loop = ciclo repetitivo de ações do jogador. Não é Grokking, asset, .tscn nem física.',
        'q04' => 'Receita da Aula 02: raiz CharacterBody2D + Sprite2D + CollisionShape2D.',
        'q05' => 'Homo Ludens: cultura e jogo andam juntos; folclore vira sistema jogável, não só enfeite.',
        'q06' => 'Filter → Nearest evita o embaçado da suavização padrão.',
        'q07' => 'viewport + keep + integer = proporção e pixels quadrados.',
        'q08' => 'NES: resolução baixa, poucas cores, flicker, reuso de tiles.',
        'q09' => 'ClassInd = aviso para famílias, não censura prévia.',
        'q10' => 'Mesmo loop; o que muda a faixa é o feedback (fantasia vs sangue/gore).',
        'q11' => 'Atenuante típico: inimigos irreais/cômicos em vez de humanos.',
        'q12' => 'Sem passo 4, a janela distorce a pixel art ao redimensionar.',
    ];

    public const DISCURSIVE_RUBRICS = [
        'q13' => [
            'focus' => 'Limite técnico gera criatividade (Aula 04).',
            'excellent' => 'Cita Project Settings → Display → Window com viewport + keep + integer. Explica que a restrição de resolução força criatividade (tiles, abstração). Tom de memorando.',
            'proficient' => 'Acerta os settings (pequenos erros de nome ok), mas explica pouco a “restrição que ajuda”.',
            'developing' => 'Config errada (disabled, só importação) ou trata o limite só como problema ruim.',
            'synthesis' => '(a) viewport nativa + stretch viewport + aspect keep + scale integer. (b) limite inventa o estilo do design.',
        ],
        'q14' => [
            'focus' => 'ClassInd não corta o Core Loop; muda a “roupa” visual (Aula 05).',
            'excellent' => 'Formato Patch Note. Não muda o loop. Violência → fantasia/não-humano/cômico. Drogas → poção/item mágico sem glamour. Usa atenuantes/agravantes. Mira L ou 10.',
            'proficient' => 'Muda feedback certo e preserva o loop, mas esquece os termos atenuante/agravante.',
            'developing' => 'Quer remover tiro/combate ou mudar o Core Loop.',
            'synthesis' => 'Muda apresentação; mecânica (mover → atirar → curar) fica.',
        ],
        'q15' => [
            'focus' => 'Física emergente vs controle por input (Aulas 01→02).',
            'excellent' => 'RigidBody = física que “acontece sozinha”. CharacterBody = controle pelo teclado/Input Map + move_and_slide(). Player precisa de resposta previsível.',
            'proficient' => 'Entende a diferença básica, mas esquece move_and_slide().',
            'developing' => 'Troca os nós ou acha que RigidBody é o ideal para o Player.',
            'synthesis' => 'Player = controle firme; física pura demais = caos no avatar.',
        ],
        'q16' => [
            'focus' => 'Homo Ludens na práxis do sprite cultural (Aula 03).',
            'excellent' => 'Cultura não é só skin: vira jogo (sistemas, identificação). Liga a Huizinga e ao Círculo Mágico.',
            'proficient' => 'Liga identidade visual a Huizinga, mas fica superficial.',
            'developing' => 'Diz que é só enfeite / “patriotismo na arte”.',
            'synthesis' => 'Máscara cultural = cultura jogável, não decoração.',
        ],
        'q17' => [
            'focus' => 'Estrutura mecânica → fenômeno neuromotor (Aula 02).',
            'excellent' => 'Core Loop = ciclo de ações. Grokking = teclas na memória muscular. Loop claro + feedback bom → deixa de “pensar as teclas”.',
            'proficient' => 'Define os dois, mas liga mal a causa e o efeito.',
            'developing' => 'Confunde Core Loop com assets; acha que Grokking é função da Godot.',
            'synthesis' => 'Sem loop bem feito e feedback claro, não há Grokking.',
        ],
        'q18' => [
            'focus' => 'Fluxo Input Map → script → nós (Aula 02).',
            'excellent' => 'Input Map nomeia ações → script no CharacterBody lê e move com move_and_slide() → Sprite desenha → CollisionShape colide.',
            'proficient' => 'Entende o conjunto, mas esquece move_and_slide() ou o papel dos filhos.',
            'developing' => 'Dá colisão ao Sprite, ou Input Map no FileSystem, etc.',
            'synthesis' => 'Input abstrato + script + visual + colisão = movimento na tela.',
        ],
        'q19' => [
            'focus' => 'Duas travas em níveis diferentes do pipeline (Aulas 03–04).',
            'excellent' => 'Nearest = nitidez do sprite/textura (não embara). Integer = escala da janela só em 2×, 3×, 4×… (não estica pixel torto).',
            'proficient' => 'Sabe que as duas evitam distorção, mas não separa “imagem” e “tela”.',
            'developing' => 'Trata as duas como a mesma coisa; mistura com física ou ClassInd.',
            'synthesis' => 'Nearest salva o pixel do asset; Integer salva o quadro ao redimensionar.',
        ],
        'q20' => [
            'focus' => 'IARC + ClassInd + atenuantes no fechamento do módulo (Aula 05).',
            'excellent' => 'IARC: um formulário gera classificação em várias regiões, barato e rápido para indie. ClassInd: energia mágica + inimigos folclóricos = atenuante; sangue real = agravante. Faixa provável: Livre ou 10 anos.',
            'proficient' => 'Acerta IARC e L/10, mas esquece “atenuante” ou o não-humano.',
            'developing' => 'Fala em censura genérica; não explica IARC nem atenuantes.',
            'synthesis' => 'IARC = alcance global; feedback mágico = faixa baixa.',
        ],
    ];

    public const QUESTIONS = [
        [
            'id' => 'q01',
            'index' => 0,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 01',
            'prompt' => "O “Círculo Mágico” é a base para entender a experiência do jogador. Leia o trecho:\n\n“Dentro do círculo mágico, as leis e costumes da vida ordinária não contam.”\n\nCom base nesse texto e na Aula 01, o que acontece, em conceito, no momento em que se aperta Play na engine?",
            'choices' => [
                'A' => 'O jogador vai direto para um ambiente de código difícil e é obrigado a escrever scripts em GDScript.',
                'B' => 'O jogo cria um contrato de regras temporário e um espaço próprio: a vida cotidiana “pausa” e o sistema organiza o que pode acontecer dentro da experiência.',
                'C' => 'A interface da engine (Scene, FileSystem, Inspector) some, e ninguém consegue mais mudar as regras físicas.',
                'D' => 'O jogo força o jogador a agir como na vida real, usando só costumes do cotidiano.',
                'E' => 'As regras do jogo são desligadas para sempre, para proteger o jogador das limitações do hardware.',
            ],
        ],
        [
            'id' => 'q02',
            'index' => 1,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 02',
            'prompt' => 'Na prática da Godot 4 (Aula 01), certos painéis deixam as regras invisíveis do jogo visíveis e editáveis. Qual é a função principal da combinação Inspector + Viewport 2D ao mexer em um RigidBody2D?',
            'choices' => [
                'A' => 'O Inspector organiza a hierarquia das cenas; a Viewport 2D lista áudio e imagens em pastas.',
                'B' => 'Os dois servem só para escrever e compilar scripts do Input Map e do Core Loop.',
                'C' => 'Permitem ver e mudar propriedades físicas (massa, gravidade, fricção, elasticidade) e ver na hora o efeito dessas mudanças.',
                'D' => 'Servem principalmente para importar pixel art e aplicar filtros culturais no sprite.',
                'E' => 'Servem para imitar resoluções antigas (Atari 2600, NES) redimensionando a tela.',
            ],
        ],
        [
            'id' => 'q03',
            'index' => 2,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 03',
            'prompt' => "Para passar da observação à interação, o desenvolvedor precisa do vocabulário da equipe. Leia o trecho da Aula 02:\n\n“Glossário nomeia o ofício; a cena do Player é o primeiro lugar onde esses termos viram estrutura.”\n\nSegundo esse trecho e o material estudado, o que é Core Loop na prática?",
            'choices' => [
                'A' => 'O momento em que os controles saem da cabeça e vão para a memória muscular (sem pensar nas teclas).',
                'B' => 'O conjunto de imagens, sons e arquivos do FileSystem usados várias vezes no projeto.',
                'C' => 'A “receita” reutilizável de um nó (arquivo .tscn) para clonar inimigos e cenários.',
                'D' => 'O ciclo básico e repetitivo de ações do jogador (exemplo: andar → coletar → avançar).',
                'E' => 'O sistema de física da Godot 4 que calcula fricção e elasticidade de um StaticBody2D o tempo todo.',
            ],
        ],
        [
            'id' => 'q04',
            'index' => 3,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 04',
            'prompt' => 'Na Godot 4, “tudo é um nó” e uma cena é uma “receita de bolo” reutilizável. Para montar um personagem que responde a comandos e colide com o cenário de forma controlada, qual hierarquia a Aula 02 ensinou?',
            'choices' => [
                'A' => 'Raiz RigidBody2D (Player), com filhos Sprite2D e Input Map.',
                'B' => 'Raiz StaticBody2D (Player), com filhos CharacterBody2D e a função move_and_slide.',
                'C' => 'Raiz Node2D (Player), com filhos Viewport 2D e CollisionShape2D.',
                'D' => 'Raiz CharacterBody2D (Player), com filhos Sprite2D e CollisionShape2D.',
                'E' => 'Raiz CollisionShape2D (Player), com filhos CharacterBody2D e Sprite2D.',
            ],
        ],
        [
            'id' => 'q05',
            'index' => 4,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 05',
            'prompt' => "A Aula 03 traz as ideias de Johan Huizinga: o jogo não é só software de regras — também é parte da cultura. Leia:\n\n“A cultura joga — e o sprite é uma das máscaras com que esse jogo se mostra.”\n\nCom base nisso e no conceito de Homo Ludens, assinale a melhor descrição da relação entre jogos digitais e identidade cultural:",
            'choices' => [
                'A' => 'O jogo é só uma pausa das coisas sérias; serve apenas para decorar o cenário com folclore.',
                'B' => 'A cultura humana nasce e cresce também pelo jogo; por isso lendas, folclore e paisagens locais não são só enfeite — devem virar sistemas jogáveis.',
                'C' => 'Usar sprite com marca cultural é obrigação do Ministério da Justiça para conseguir o selo IARC.',
                'D' => 'Identidade cultural de verdade só vale com física hiper-realista; sprites 2D artísticos não contam.',
                'E' => 'Homo Ludens manda separar cultura intelectual da diversão, deixando o Círculo Mágico sem referências do mundo real.',
            ],
        ],
        [
            'id' => 'q06',
            'index' => 5,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 06',
            'prompt' => 'Ao importar pixel art (ex.: pacote Tiny Hero), a Godot 4 pode suavizar a imagem por padrão e deixá-la embaçada. Qual configuração no Inspector garante nitidez no Sprite2D?',
            'choices' => [
                'A' => 'Mudar Texture para Smooth, para suavizar os pixels.',
                'B' => 'Mudar Window Override para o modo Stretch.',
                'C' => 'Mudar Filter para Nearest, para manter a aresta do pixel nítida.',
                'D' => 'Ativar colisão do tipo Nearest no CollisionShape2D.',
                'E' => 'Ajustar Scale Mode para Viewport no painel FileSystem.',
            ],
        ],
        [
            'id' => 'q07',
            'index' => 6,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 07',
            'prompt' => 'Muitas vezes o bom design nasce da restrição técnica. Para manter estética retrô (ex.: 320×180) e evitar pixels “esmagados” ao redimensionar a janela, qual combinação em Project Settings → Display → Window está correta?',
            'choices' => [
                'A' => 'Stretch Mode: disabled, Aspect: ignore, Scale Mode: fractional.',
                'B' => 'Stretch Mode: viewport, Aspect: keep, Scale Mode: integer.',
                'C' => 'Stretch Mode: canvas_items, Aspect: expand, Scale Mode: nearest.',
                'D' => 'Stretch Mode: viewport, Aspect: keep, Scale Mode: fractional.',
                'E' => 'Stretch Mode: canvas_items, Aspect: keep, Scale Mode: integer.',
            ],
        ],
        [
            'id' => 'q08',
            'index' => 7,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 08',
            'prompt' => 'Na Aula 04, a “restrição técnica” mostra como o limite do hardware cria o design de uma geração. O NES (console 8-bit de mesa) tinha limites fortes. Qual alternativa descreve melhor esses limites e as soluções criativas da época?',
            'choices' => [
                'A' => 'O NES rodava em 720p com cores quase ilimitadas, então não precisava reutilizar tiles.',
                'B' => 'Com resolução cerca de 256×240 e poucas cores (~52), a pouca RAM e o limite de sprites por linha da tela geravam flicker; os designers reaproveitavam tiles e criavam mecânicas que escondiam os limites do hardware.',
                'C' => 'A principal restrição do NES era ser obrigado a usar o IARC, que censurava os temas dos jogos 8-bit.',
                'D' => 'Consoles 8-bit dependiam só do filtro Nearest com Mode 7, deixando personagens só como silhuetas.',
                'E' => 'O hardware dos anos 70–80 tinha GPU ilimitada; a baixa resolução era escolha só por motivos folclóricos e culturais.',
            ],
        ],
        [
            'id' => 'q09',
            'index' => 8,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 09',
            'prompt' => 'Antes de lançar um jogo, é preciso entender o público e como a sociedade o avalia. No Brasil usamos o ClassInd. Qual é a função principal desse sistema?',
            'choices' => [
                'A' => 'Censurar e proibir desenvolver/exibir jogos com qualquer menção a drogas ou violência.',
                'B' => 'Servir principalmente como aviso de conteúdo e informação para famílias e responsáveis, olhando três eixos (Violência, Sexo e Drogas) com atenuantes e agravantes — sem ser censura prévia.',
                'C' => 'Cobrar impostos altos de desenvolvedores independentes em troca de selos nas lojas.',
                'D' => 'Certificar qualidade lúdica e obrigar todos os jogos a serem “Livre”, punindo estética fotorrealista.',
                'E' => 'Avaliar se o código, o Core Loop e as colisões estão sem bugs antes de dar o selo de “design saudável”.',
            ],
        ],
        [
            'id' => 'q10',
            'index' => 9,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 10',
            'prompt' => 'Dois jogos têm o mesmo Core Loop: “andar furtivo → mirar → atirar um projétil no inimigo → coletar item de cura”. O Jogo A fica “10 anos” e o Jogo B fica “18 anos”. Pelo Design Saudável da Aula 05, por quê?',
            'choices' => [
                'A' => 'Porque o IARC prejudica jogos gratuitos e favorece só estúdios AAA, sem olhar o conteúdo.',
                'B' => 'Por causa do Grokking: o Jogo B tem comandos mais difíceis, então sobe a faixa etária.',
                'C' => 'Por causa do feedback visual e temático: o Jogo A usa violência leve, irreal e fantasiosa, sem sangue; o Jogo B usa realismo agressivo, sangue e gore (agravantes).',
                'D' => 'Porque o Jogo A usou filtro Nearest na pixel art, e isso “esconde” conteúdo sensível automaticamente.',
                'E' => 'Porque o Jogo B usou RigidBody2D, e a física imprevisível aumenta sozinha a classificação de violência.',
            ],
        ],
        [
            'id' => 'q11',
            'index' => 10,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 11',
            'prompt' => 'Para alcançar mais público (ou baixar a faixa etária no IARC), a equipe pode fazer um “Patch Note de Higienização”. Qual exemplo melhor mostra um atenuante aceito pela classificação?',
            'choices' => [
                'A' => 'Trocar oponentes humanos armados por alienígenas irreais, fantasiosos e cômicos.',
                'B' => 'Aumentar o detalhe do cadáver no chão para educar moralmente o jogador.',
                'C' => 'Trocar poções mágicas de cura por injeções realistas de drogas glamorizadas.',
                'D' => 'Colocar diálogos pesados e com conotação sexual para “mascarar” a violência.',
                'E' => 'Subir a resolução de 320×180 para 4K, esperando que a violência pareça menos pesada.',
            ],
        ],
        [
            'id' => 'q12',
            'index' => 11,
            'type' => 'mc',
            'points' => 1,
            'title' => 'Questão 12',
            'prompt' => "O Módulo 1 segue esta ordem:\n1. Jogo como regras (Círculo Mágico).\n2. Movimento inicial (Player e Glossário).\n3. Identidade visual (Homo Ludens e Sprite com Nearest).\n4. Restrição de hardware / resolução nativa (Viewport Settings).\n5. Classificação e ética de lançamento (ClassInd/IARC).\n\nSe o aluno pular o passo 4, qual problema aparece ao rodar o jogo 2D pixelizado em monitor HD?",
            'choices' => [
                'A' => 'O Core Loop atrasa o input e o jogador nunca chega ao Grokking.',
                'B' => 'O jogo é banido das lojas por não mostrar o formulário IARC na tela.',
                'C' => 'A física do Inspector conflita com o CharacterBody2D e gera velocidade infinita.',
                'D' => 'A tela distorce: ao redimensionar a janela, a arte deixa de respeitar proporções nítidas e a estética clássica da etapa 3 se estraga.',
                'E' => 'Massa, fricção e elasticidade somem de dentro do Círculo Mágico.',
            ],
        ],
        [
            'id' => 'q13',
            'index' => 12,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 13: O Dilema do Arquivista Retro',
            'role' => 'Arquiteto sênior de conversão / portabilidade.',
            'scenario' => 'Seu estúdio indie vai fazer um demake (versão intencionalmente retrô) de um jogo AAA famoso, no estilo de portáteis 16-bit (ex.: Game Boy Advance). A arte em pixel art chegou bonita, mas o programador júnior colocou tudo na engine e deu errado: ao maximizar a janela no Windows, os pixels viram retângulos tortos (shimmering) e barras pretas estranhas aparecem.',
            'mission' => "Escreva um memorando técnico curto para o Diretor de Arte e o júnior. Nele:\n(a) Liste os passos e configurações na Godot 4 para corrigir o redimensionamento da janela (Aula 04);\n(b) Explique, com o conceito de “restrição técnica”, por que limitar a resolução nativa ajuda a criatividade do estúdio, em vez de só atrapalhar.",
            'prompt' => "Seu papel: Arquiteto sênior de conversão / portabilidade.\n\nCenário: Seu estúdio indie vai fazer um demake (versão intencionalmente retrô) de um jogo AAA famoso, no estilo de portáteis 16-bit (ex.: Game Boy Advance). A arte em pixel art chegou bonita, mas o programador júnior colocou tudo na engine e deu errado: ao maximizar a janela no Windows, os pixels viram retângulos tortos (shimmering) e barras pretas estranhas aparecem.\n\nMissão: Escreva um memorando técnico curto para o Diretor de Arte e o júnior. Nele:\n(a) Liste os passos e configurações na Godot 4 para corrigir o redimensionamento da janela (Aula 04);\n(b) Explique, com o conceito de “restrição técnica”, por que limitar a resolução nativa ajuda a criatividade do estúdio, em vez de só atrapalhar.",
        ],
        [
            'id' => 'q14',
            'index' => 13,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 14: O Tribunal da Classificação Indicativa',
            'role' => 'Conselheiro de Design Saudável e ClassInd.',
            'scenario' => 'A equipe mostra um protótipo de sobrevivência: você é um justiceiro que mata membros de gangues em becos hiper-realistas com armas de fogo e pega pílulas químicas dos corpos para recuperar energia. O contrato pede público jovem, mas no estado atual o jogo tende a cair em 16 ou 18 anos no ClassInd. O Diretor Criativo não aceita mudar o Core Loop (andar, atirar para remover obstáculos, coletar item de cura devem continuar iguais no código).',
            'mission' => 'Escreva um “Patch Note de Higienização”. Proponha mudanças no feedback (visual, som e narrativa) nos eixos Violência e Drogas, usando atenuantes, para tentar chegar a Livre (L) ou no máximo 10 anos — sem alterar o Core Loop. Justifique cada mudança com a Aula 05.',
            'prompt' => "Seu papel: Conselheiro de Design Saudável e ClassInd.\n\nCenário: A equipe mostra um protótipo de sobrevivência: você é um justiceiro que mata membros de gangues em becos hiper-realistas com armas de fogo e pega pílulas químicas dos corpos para recuperar energia. O contrato pede público jovem, mas no estado atual o jogo tende a cair em 16 ou 18 anos no ClassInd. O Diretor Criativo não aceita mudar o Core Loop (andar, atirar para remover obstáculos, coletar item de cura devem continuar iguais no código).\n\nMissão: Escreva um “Patch Note de Higienização”. Proponha mudanças no feedback (visual, som e narrativa) nos eixos Violência e Drogas, usando atenuantes, para tentar chegar a Livre (L) ou no máximo 10 anos — sem alterar o Core Loop. Justifique cada mudança com a Aula 05.",
        ],
        [
            'id' => 'q15',
            'index' => 14,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 15: Física vs controle do Player',
            'prompt' => "Na Aula 01, usamos RigidBody2D e mudamos massa, gravidade, fricção e elasticidade no Inspector sem código. Na Aula 02, passamos para CharacterBody2D com Input Map e move_and_slide().\n\nExplique, com suas palavras, a diferença de comportamento e de controle entre os dois. Por que, na prática, o desenvolvedor usa quase sempre CharacterBody2D para o Player, e não deixa o RigidBody2D (física pura) mandar no personagem principal?",
        ],
        [
            'id' => 'q16',
            'index' => 15,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 16: O Sprite e a máscara cultural',
            'prompt' => "Em Homo Ludens (1938), Johan Huizinga diz que “a cultura humana surge e se desenvolve como jogo”. Na Aula 03, ao preparar um Sprite na Godot, você foi convidado a dar identidade local ao personagem (folclore, fauna, cidade, etc.).\n\nEm um texto curto, explique por que vestir o Player com uma “máscara cultural” local não é só decoração. Como essa escolha de design coloca a ideia de Huizinga em prática nos jogos de hoje?",
        ],
        [
            'id' => 'q17',
            'index' => 16,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 17: Core Loop e Grokking',
            'prompt' => "No glossário do desenvolvedor, dois termos importantes são Core Loop e Grokking.\n\nCompare os dois e explique a relação de causa e efeito entre eles: o que o Core Loop precisa ter (e como deve ser o feedback) para o jogador chegar ao Grokking — aquele momento em que as mãos “já sabem” o que fazer, sem pensar nas teclas?",
        ],
        [
            'id' => 'q18',
            'index' => 17,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 18: Como o Player se move na tela',
            'prompt' => "Na Godot 4, uma cena é como uma “receita de bolo” feita de nós.\n\nDescreva, em ordem, como se conversam: o Input Map (Project Settings), o script que lê as teclas/ações, e a cena com CharacterBody2D (raiz), Sprite2D (filho) e CollisionShape2D (filho). Como esses pedaços juntos viram o movimento visível do personagem na tela?",
        ],
        [
            'id' => 'q19',
            'index' => 18,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 19: Nearest e Integer Scale',
            'prompt' => "Nas Aulas 03 e 04, duas configurações protegem a pixel art: filtro Nearest e Stretch Mode com escala Integer.\n\nExplique a diferença: o que o Nearest protege no asset (imagem/sprite), e o que o Integer Scale protege na janela/tela quando o jogador redimensiona o jogo.",
        ],
        [
            'id' => 'q20',
            'index' => 19,
            'type' => 'discursive',
            'points' => 1,
            'title' => 'Questão 20: Síntese de lançamento',
            'prompt' => "Sua equipe terminou o Módulo 1 e quer lançar o jogo de graça nas lojas digitais. O título usa folclore amazônico: o herói enfrenta criaturas mágicas da floresta, atira bolhas de “energia condensada” com zarabatana e pula em plataformas retrô.\n\nEscreva um relatório curto, com base na Aula 05, respondendo:\n1. Como o IARC ajuda a distribuir o jogo no mundo de forma mais simples e barata;\n2. Como o ClassInd leria o feedback das zarabatanas de energia mágica contra inimigos não humanos, comparado a um jogo com sangue real — e qual faixa etária (Livre ou 10 anos, etc.) faz mais sentido, com justificativa.",
        ],
    ];

    /**
     * @return array<string, mixed>|null
     */
    public static function getQuestionById(string $questionId): ?array
    {
        foreach (self::QUESTIONS as $q) {
            if ($q['id'] === $questionId) {
                return $q;
            }
        }
        return null;
    }

    /**
     * @return array<int, string>
     */
    public static function listMcQuestionIds(): array
    {
        $out = [];
        foreach (self::QUESTIONS as $q) {
            if ($q['type'] === 'mc') {
                $out[] = $q['id'];
            }
        }
        return $out;
    }

    /**
     * @return array<int, string>
     */
    public static function listDiscursiveQuestionIds(): array
    {
        $out = [];
        foreach (self::QUESTIONS as $q) {
            if ($q['type'] === 'discursive') {
                $out[] = $q['id'];
            }
        }
        return $out;
    }

    public static function isMcQuestionId(string $questionId): bool
    {
        $q = self::getQuestionById($questionId);
        return $q !== null && $q['type'] === 'mc';
    }

    public static function isDiscursiveQuestionId(string $questionId): bool
    {
        $q = self::getQuestionById($questionId);
        return $q !== null && $q['type'] === 'discursive';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function sanitizeQuestionsForClient(): array
    {
        $out = [];
        foreach (self::QUESTIONS as $q) {
            $base = [
                'id' => $q['id'],
                'index' => $q['index'],
                'type' => $q['type'],
                'points' => $q['points'],
                'title' => $q['title'] ?? null,
                'prompt' => $q['prompt'],
            ];
            if ($q['type'] === 'mc') {
                $base['choices'] = $q['choices'];
            } else {
                $base['role'] = $q['role'] ?? null;
                $base['scenario'] = $q['scenario'] ?? null;
                $base['mission'] = $q['mission'] ?? null;
            }
            $out[] = $base;
        }
        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function questionsForAdmin(): array
    {
        $clientList = self::sanitizeQuestionsForClient();
        $out = [];
        foreach ($clientList as $client) {
            $id = $client['id'];
            if ($client['type'] === 'mc') {
                $client['correctChoice'] = self::MC_ANSWER_KEY[$id] ?? null;
                $client['justification'] = self::MC_JUSTIFICATIONS[$id] ?? null;
            } else {
                $client['rubric'] = self::DISCURSIVE_RUBRICS[$id] ?? null;
            }
            $out[] = $client;
        }
        return $out;
    }

    public static function normalizeMcChoice(mixed $choice): ?string
    {
        if ($choice === null || $choice === '') {
            return null;
        }
        $raw = strtoupper(trim((string) $choice));
        return in_array($raw, ['A', 'B', 'C', 'D', 'E'], true) ? $raw : null;
    }

    public static function normalizeDiscursivePoints(mixed $value): ?float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }
        $n = (float) $value;
        if (!is_finite($n) || $n < 0.0 || $n > self::DISCURSIVE_POINTS_EACH) {
            return null;
        }
        return round($n * 100.0) / 100.0;
    }

    // -------------------------------------------------------------------------
    // Registro multi-exame
    // -------------------------------------------------------------------------

    /** @var array<string, ExamDefinition> */
    private static array $registry = [];

    /**
     * @return array<int, string>
     */
    public static function examIds(): array
    {
        return [self::EXAM_ID, Modulo2Exam::ID, TrabalhoFinalExam::ID];
    }

    public static function exists(string $examId): bool
    {
        return in_array($examId, self::examIds(), true);
    }

    /**
     * Definição do exame, ou null se o id não existir.
     */
    public static function forExam(string $examId): ?ExamDefinition
    {
        if (!self::exists($examId)) {
            return null;
        }
        if (!isset(self::$registry[$examId])) {
            self::$registry[$examId] = match ($examId) {
                self::EXAM_ID => self::modulo1Definition(),
                Modulo2Exam::ID => Modulo2Exam::definition(),
                TrabalhoFinalExam::ID => TrabalhoFinalExam::definition(),
            };
        }
        return self::$registry[$examId];
    }

    private static function modulo1Definition(): ExamDefinition
    {
        return new ExamDefinition([
            'id' => self::EXAM_ID,
            'kind' => ExamDefinition::KIND_QUIZ,
            'title' => self::EXAM_TITLE,
            'durationMinutes' => 90,
            'totalPoints' => self::TOTAL_POINTS,
            'mcPointsEach' => self::MC_POINTS_EACH,
            'discursivePointsEach' => self::DISCURSIVE_POINTS_EACH,
            'questions' => self::QUESTIONS,
            'mcAnswerKey' => self::MC_ANSWER_KEY,
            'mcJustifications' => self::MC_JUSTIFICATIONS,
            'discursiveRubrics' => self::DISCURSIVE_RUBRICS,
        ]);
    }
}
