# Avaliação Imersiva: A Provação do Círculo Mágico e a Forja do Desenvolvedor

**Curso:** Fundamentos de Jogos Digitais  
**Módulo:** 1 — Fundações, Cultura e Interface (Aulas 01–05)  
**Instrumento:** 12 questões de múltipla escolha + 8 provas discursivas  
**Valor:** **20 pontos** (Seção 1: 12 pts · Seção 2: 8 pts)  
**Uso:** prova do aluno (Seções 1 e 2) · gabarito e rubricas (Área do Mestre)

**Online (plataforma):** aluno em [`pages/prova.html`](../pages/prova.html) · Mestre libera/correge via Painel + [`pages/prova-admin.html`](../pages/prova-admin.html) · playbook [`playbook-liberar-prova-modulo1.md`](playbook-liberar-prova-modulo1.md).

Referência: [`conteudo-modulo1-fundacoes-cultura-interface.md`](conteudo-modulo1-fundacoes-cultura-interface.md).

---

## Bem-vindo, Iniciante, ao Altar do Desenvolvimento

O mundo de fora — com a rotina do dia a dia — ficou do outro lado. Ao se preparar para apertar o botão **Play**, você aceita um contrato invisível: daqui pra frente, as regras do jogo é que mandam. Gravidade, luz, matéria e cultura passam a ser moldadas por quem cria o jogo. Você deixa de ser só quem joga e começa a ser quem **faz** mundos.

Esta prova testa se você entendeu o básico do Módulo 1: o jogo como sistema de regras, o vocabulário do desenvolvedor, identidade cultural nos pixels, limites do hardware clássico e classificação indicativa ética.

### As Regras do Desafio

São **20 questões**. Elas medem memória, raciocínio e criatividade no Módulo 1 (Fundações, Cultura e Interface).

| Bloco | Questões | O que pedir |
| --- | :---: | --- |
| **Múltipla escolha** | 1–12 | Leia com cuidado. Só **uma** alternativa está certa. |
| **Discursivas** | 13–20 | Explique com as suas palavras. Use o que aprendeu nas aulas e resolva os cenários. |

Do laboratório até a publicação nas lojas digitais, a jornada começa agora. Prepare os Assets, ajuste o Input Map, vista a máscara cultural e entre no Círculo Mágico. **Boa sorte.**

---

# Seção 1: Múltipla Escolha *(12 pontos — 1 ponto cada)*

Leia com atenção e marque a alternativa que melhor responde à pergunta.

---

### Questão 01

O **“Círculo Mágico”** é a base para entender a experiência do jogador. Leia o trecho:

> “Dentro do círculo mágico, as leis e costumes da vida ordinária não contam.”

Com base nesse texto e na **Aula 01**, o que acontece, em conceito, no momento em que se aperta **Play** na engine?

**A)** O jogador vai direto para um ambiente de código difícil e é obrigado a escrever scripts em GDScript.

**B)** O jogo cria um contrato de regras temporário e um espaço próprio: a vida cotidiana “pausa” e o sistema organiza o que pode acontecer dentro da experiência.

**C)** A interface da engine (Scene, FileSystem, Inspector) some, e ninguém consegue mais mudar as regras físicas.

**D)** O jogo força o jogador a agir como na vida real, usando só costumes do cotidiano.

**E)** As regras do jogo são desligadas para sempre, para proteger o jogador das limitações do hardware.

---

### Questão 02

Na prática da Godot 4 (**Aula 01**), certos painéis deixam as regras invisíveis do jogo visíveis e editáveis. Qual é a função principal da combinação **Inspector** + **Viewport 2D** ao mexer em um `RigidBody2D`?

**A)** O Inspector organiza a hierarquia das cenas; a Viewport 2D lista áudio e imagens em pastas.

**B)** Os dois servem só para escrever e compilar scripts do Input Map e do Core Loop.

**C)** Permitem ver e mudar propriedades físicas (massa, gravidade, fricção, elasticidade) e ver na hora o efeito dessas mudanças.

**D)** Servem principalmente para importar pixel art e aplicar filtros culturais no sprite.

**E)** Servem para imitar resoluções antigas (Atari 2600, NES) redimensionando a tela.

---

### Questão 03

Para passar da observação à interação, o desenvolvedor precisa do vocabulário da equipe. Leia o trecho da **Aula 02**:

> “Glossário nomeia o ofício; a cena do Player é o primeiro lugar onde esses termos viram estrutura.”

Segundo esse trecho e o material estudado, o que é **Core Loop** na prática?

**A)** O momento em que os controles saem da cabeça e vão para a memória muscular (sem pensar nas teclas).

**B)** O conjunto de imagens, sons e arquivos do FileSystem usados várias vezes no projeto.

**C)** A “receita” reutilizável de um nó (arquivo `.tscn`) para clonar inimigos e cenários.

**D)** O ciclo básico e repetitivo de ações do jogador (exemplo: andar → coletar → avançar).

**E)** O sistema de física da Godot 4 que calcula fricção e elasticidade de um `StaticBody2D` o tempo todo.

---

### Questão 04

Na Godot 4, **“tudo é um nó”** e uma cena é uma **“receita de bolo”** reutilizável. Para montar um personagem que responde a comandos e colide com o cenário de forma controlada, qual hierarquia a **Aula 02** ensinou?

**A)** Raiz `RigidBody2D` (Player), com filhos `Sprite2D` e Input Map.

**B)** Raiz `StaticBody2D` (Player), com filhos `CharacterBody2D` e a função `move_and_slide`.

**C)** Raiz `Node2D` (Player), com filhos Viewport 2D e `CollisionShape2D`.

**D)** Raiz `CharacterBody2D` (Player), com filhos `Sprite2D` e `CollisionShape2D`.

**E)** Raiz `CollisionShape2D` (Player), com filhos `CharacterBody2D` e `Sprite2D`.

---

### Questão 05

A **Aula 03** traz as ideias de Johan Huizinga: o jogo não é só software de regras — também é parte da cultura. Leia:

> “A cultura joga — e o sprite é uma das máscaras com que esse jogo se mostra.”

Com base nisso e no conceito de **Homo Ludens**, assinale a melhor descrição da relação entre jogos digitais e identidade cultural:

**A)** O jogo é só uma pausa das coisas sérias; serve apenas para decorar o cenário com folclore.

**B)** A cultura humana nasce e cresce também pelo jogo; por isso lendas, folclore e paisagens locais não são só enfeite — devem virar sistemas jogáveis.

**C)** Usar sprite com marca cultural é obrigação do Ministério da Justiça para conseguir o selo IARC.

**D)** Identidade cultural de verdade só vale com física hiper-realista; sprites 2D artísticos não contam.

**E)** Homo Ludens manda separar cultura intelectual da diversão, deixando o Círculo Mágico sem referências do mundo real.

---

### Questão 06

Ao importar pixel art (ex.: pacote Tiny Hero), a Godot 4 pode suavizar a imagem por padrão e deixá-la embaçada. Qual configuração no **Inspector** garante nitidez no `Sprite2D`?

**A)** Mudar Texture para Smooth, para suavizar os pixels.

**B)** Mudar Window Override para o modo Stretch.

**C)** Mudar **Filter** para **Nearest**, para manter a aresta do pixel nítida.

**D)** Ativar colisão do tipo Nearest no `CollisionShape2D`.

**E)** Ajustar Scale Mode para Viewport no painel FileSystem.

---

### Questão 07

Muitas vezes o bom design nasce da **restrição técnica**. Para manter estética retrô (ex.: **320×180**) e evitar pixels “esmagados” ao redimensionar a janela, qual combinação em **Project Settings → Display → Window** está correta?

**A)** Stretch Mode: `disabled`, Aspect: `ignore`, Scale Mode: `fractional`.

**B)** Stretch Mode: `viewport`, Aspect: `keep`, Scale Mode: `integer`.

**C)** Stretch Mode: `canvas_items`, Aspect: `expand`, Scale Mode: `nearest`.

**D)** Stretch Mode: `viewport`, Aspect: `keep`, Scale Mode: `fractional`.

**E)** Stretch Mode: `canvas_items`, Aspect: `keep`, Scale Mode: `integer`.

---

### Questão 08

Na **Aula 04**, a **“restrição técnica”** mostra como o limite do hardware cria o design de uma geração. O NES (console 8-bit de mesa) tinha limites fortes. Qual alternativa descreve melhor esses limites e as soluções criativas da época?

**A)** O NES rodava em 720p com cores quase ilimitadas, então não precisava reutilizar tiles.

**B)** Com resolução cerca de **256×240** e poucas cores (~52), a pouca RAM e o limite de sprites por linha da tela geravam **flicker**; os designers reaproveitavam tiles e criavam mecânicas que escondiam os limites do hardware.

**C)** A principal restrição do NES era ser obrigado a usar o IARC, que censurava os temas dos jogos 8-bit.

**D)** Consoles 8-bit dependiam só do filtro Nearest com Mode 7, deixando personagens só como silhuetas.

**E)** O hardware dos anos 70–80 tinha GPU ilimitada; a baixa resolução era escolha só por motivos folclóricos e culturais.

---

### Questão 09

Antes de lançar um jogo, é preciso entender o público e como a sociedade o avalia. No Brasil usamos o **ClassInd**. Qual é a função principal desse sistema?

**A)** Censurar e proibir desenvolver/exibir jogos com qualquer menção a drogas ou violência.

**B)** Servir principalmente como **aviso de conteúdo** e informação para famílias e responsáveis, olhando três eixos (Violência, Sexo e Drogas) com atenuantes e agravantes — **sem** ser censura prévia.

**C)** Cobrar impostos altos de desenvolvedores independentes em troca de selos nas lojas.

**D)** Certificar qualidade lúdica e obrigar todos os jogos a serem “Livre”, punindo estética fotorrealista.

**E)** Avaliar se o código, o Core Loop e as colisões estão sem bugs antes de dar o selo de “design saudável”.

---

### Questão 10

Dois jogos têm o **mesmo** Core Loop: *“andar furtivo → mirar → atirar um projétil no inimigo → coletar item de cura”*. O Jogo A fica **“10 anos”** e o Jogo B fica **“18 anos”**. Pelo **Design Saudável** da **Aula 05**, por quê?

**A)** Porque o IARC prejudica jogos gratuitos e favorece só estúdios AAA, sem olhar o conteúdo.

**B)** Por causa do Grokking: o Jogo B tem comandos mais difíceis, então sobe a faixa etária.

**C)** Por causa do **feedback visual e temático**: o Jogo A usa violência leve, irreal e fantasiosa, sem sangue; o Jogo B usa realismo agressivo, sangue e gore (agravantes).

**D)** Porque o Jogo A usou filtro Nearest na pixel art, e isso “esconde” conteúdo sensível automaticamente.

**E)** Porque o Jogo B usou `RigidBody2D`, e a física imprevisível aumenta sozinha a classificação de violência.

---

### Questão 11

Para alcançar mais público (ou baixar a faixa etária no IARC), a equipe pode fazer um **“Patch Note de Higienização”**. Qual exemplo melhor mostra um **atenuante** aceito pela classificação?

**A)** Trocar oponentes humanos armados por alienígenas irreais, fantasiosos e cômicos.

**B)** Aumentar o detalhe do cadáver no chão para educar moralmente o jogador.

**C)** Trocar poções mágicas de cura por injeções realistas de drogas glamorizadas.

**D)** Colocar diálogos pesados e com conotação sexual para “mascarar” a violência.

**E)** Subir a resolução de 320×180 para 4K, esperando que a violência pareça menos pesada.

---

### Questão 12

O Módulo 1 segue esta ordem:

1. Jogo como regras (Círculo Mágico).
2. Movimento inicial (Player e Glossário).
3. Identidade visual (Homo Ludens e Sprite com Nearest).
4. Restrição de hardware / resolução nativa (Viewport Settings).
5. Classificação e ética de lançamento (ClassInd/IARC).

Se o aluno **pular o passo 4**, qual problema aparece ao rodar o jogo 2D pixelizado em monitor HD?

**A)** O Core Loop atrasa o input e o jogador nunca chega ao Grokking.

**B)** O jogo é banido das lojas por não mostrar o formulário IARC na tela.

**C)** A física do Inspector conflita com o `CharacterBody2D` e gera velocidade infinita.

**D)** A tela distorce: ao redimensionar a janela, a arte deixa de respeitar proporções nítidas e a estética clássica da etapa 3 se estraga.

**E)** Massa, fricção e elasticidade somem de dentro do Círculo Mágico.

---

# Seção 2: Provas Discursivas *(8 pontos — 1 ponto cada)*

Aqui não basta marcar alternativa: explique com clareza, use os termos das aulas e justifique suas escolhas.

---

### Questão 13: O Dilema do Arquivista Retro *(Roleplay)*

**Seu papel:** Arquiteto sênior de conversão / portabilidade.

**Cenário:** Seu estúdio indie vai fazer um *demake* (versão intencionalmente retrô) de um jogo AAA famoso, no estilo de portáteis 16-bit (ex.: Game Boy Advance). A arte em pixel art chegou bonita, mas o programador júnior colocou tudo na engine e deu errado: ao maximizar a janela no Windows, os pixels viram retângulos tortos (*shimmering*) e barras pretas estranhas aparecem.

**Missão:** Escreva um **memorando técnico** curto para o Diretor de Arte e o júnior. Nele:

**(a)** Liste os passos e configurações na Godot 4 para corrigir o redimensionamento da janela (**Aula 04**);

**(b)** Explique, com o conceito de **“restrição técnica”**, por que limitar a resolução nativa **ajuda** a criatividade do estúdio, em vez de só atrapalhar.

---

### Questão 14: O Tribunal da Classificação Indicativa *(Roleplay)*

**Seu papel:** Conselheiro de Design Saudável e ClassInd.

**Cenário:** A equipe mostra um protótipo de sobrevivência: você é um justiceiro que mata membros de gangues em becos hiper-realistas com armas de fogo e pega pílulas químicas dos corpos para recuperar energia. O contrato pede público jovem, mas no estado atual o jogo tende a cair em **16 ou 18 anos** no ClassInd. O Diretor Criativo **não aceita mudar o Core Loop** (andar, atirar para remover obstáculos, coletar item de cura devem continuar iguais no código).

**Missão:** Escreva um **“Patch Note de Higienização”**. Proponha mudanças no **feedback** (visual, som e narrativa) nos eixos **Violência** e **Drogas**, usando atenuantes, para tentar chegar a **Livre (L)** ou no máximo **10 anos** — **sem** alterar o Core Loop. Justifique cada mudança com a Aula 05.

---

### Questão 15: Física vs controle do Player

Na **Aula 01**, usamos `RigidBody2D` e mudamos massa, gravidade, fricção e elasticidade no Inspector **sem código**. Na **Aula 02**, passamos para `CharacterBody2D` com Input Map e `move_and_slide()`.

Explique, com suas palavras, a diferença de comportamento e de controle entre os dois. Por que, na prática, o desenvolvedor usa quase sempre `CharacterBody2D` para o Player, e não deixa o `RigidBody2D` (física pura) mandar no personagem principal?

---

### Questão 16: O Sprite e a máscara cultural

Em *Homo Ludens* (1938), Johan Huizinga diz que **“a cultura humana surge e se desenvolve como jogo”**. Na **Aula 03**, ao preparar um Sprite na Godot, você foi convidado a dar identidade local ao personagem (folclore, fauna, cidade, etc.).

Em um texto curto, explique por que vestir o Player com uma **“máscara cultural”** local **não** é só decoração. Como essa escolha de design coloca a ideia de Huizinga em prática nos jogos de hoje?

---

### Questão 17: Core Loop e Grokking

No glossário do desenvolvedor, dois termos importantes são **Core Loop** e **Grokking**.

Compare os dois e explique a relação de causa e efeito entre eles: o que o Core Loop precisa ter (e como deve ser o *feedback*) para o jogador chegar ao Grokking — aquele momento em que as mãos “já sabem” o que fazer, sem pensar nas teclas?

---

### Questão 18: Como o Player se move na tela

Na Godot 4, uma cena é como uma **“receita de bolo”** feita de nós.

Descreva, **em ordem**, como se conversam: o **Input Map** (Project Settings), o **script** que lê as teclas/ações, e a cena com `CharacterBody2D` (raiz), `Sprite2D` (filho) e `CollisionShape2D` (filho). Como esses pedaços juntos viram o movimento visível do personagem na tela?

---

### Questão 19: Nearest e Integer Scale

Nas **Aulas 03 e 04**, duas configurações protegem a pixel art: filtro **Nearest** e Stretch Mode com escala **Integer**.

Explique a diferença: o que o **Nearest** protege **no asset** (imagem/sprite), e o que o **Integer Scale** protege **na janela/tela** quando o jogador redimensiona o jogo.

---

### Questão 20: Síntese de lançamento *(desafio final)*

Sua equipe terminou o Módulo 1 e quer lançar o jogo de graça nas lojas digitais. O título usa folclore amazônico: o herói enfrenta criaturas mágicas da floresta, atira bolhas de **“energia condensada”** com zarabatana e pula em plataformas retrô.

Escreva um relatório curto, com base na **Aula 05**, respondendo:

1. Como o **IARC** ajuda a distribuir o jogo no mundo de forma mais simples e barata;
2. Como o **ClassInd** leria o feedback das zarabatanas de energia mágica contra inimigos **não humanos**, comparado a um jogo com sangue real — e qual faixa etária (**Livre** ou **10 anos**, etc.) faz mais sentido, com justificativa.

---

# Área do Mestre (Gabarito)

> **Restrito** — só para professores / moderação. Não entregar aos alunos.

Objetivo: corrigir com clareza o que o aluno precisa ter entendido — não só a letra certa, mas o porquê.

---

## I. Gabarito — Múltipla escolha

| Q | Resposta | Por quê (versão curta) |
| :---: | :---: | --- |
| **01** | **B** | Círculo Mágico = contrato de regras temporário ao apertar Play. As outras misturam código, interface ou hardware. |
| **02** | **C** | Inspector edita física; Viewport 2D mostra o efeito na hora — sem precisar de código. |
| **03** | **D** | Core Loop = ciclo repetitivo de ações do jogador. Não é Grokking, asset, `.tscn` nem física. |
| **04** | **D** | Receita da Aula 02: raiz `CharacterBody2D` + `Sprite2D` + `CollisionShape2D`. |
| **05** | **B** | Homo Ludens: cultura e jogo andam juntos; folclore vira sistema jogável, não só enfeite. |
| **06** | **C** | Filter → **Nearest** evita o embaçado da suavização padrão. |
| **07** | **B** | `viewport` + `keep` + `integer` = proporção e pixels quadrados. |
| **08** | **B** | NES: resolução baixa, poucas cores, flicker, reuso de tiles. |
| **09** | **B** | ClassInd = aviso para famílias, não censura prévia. |
| **10** | **C** | Mesmo loop; o que muda a faixa é o **feedback** (fantasia vs sangue/gore). |
| **11** | **A** | Atenuante típico: inimigos irreais/cômicos em vez de humanos. |
| **12** | **D** | Sem passo 4, a janela distorce a pixel art ao redimensionar. |

### Chave rápida

```
01-B  02-C  03-D  04-D  05-B  06-C  07-B  08-B  09-B  10-C  11-A  12-D
```

**Pontuação (Seção 1):** 12 × **1,0** = **12 pontos**.

---

## II. Rubricas — Discursivas

**Pontuação (Seção 2):** 8 × **1,0** = **8 pontos**.  
**Total:** **20 pontos**. Nas discursivas, use: Excelente 90–100% · Proficiente 70–89% · Em desenvolvimento &lt;70% para fracionar o ponto.

---

### Questão 13 — Arquivista Retro

**Foco da aula:** limite técnico gera criatividade (Aula 04).

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | Cita **Project Settings → Display → Window** com **viewport + keep + integer**. Explica que a restrição de resolução força criatividade (tiles, abstração). Tom de memorando. |
| **Proficiente (70–89%)** | Acerta os settings (pequenos erros de nome ok), mas explica pouco a “restrição que ajuda”. |
| **Em desenvolvimento (&lt;70%)** | Config errada (`disabled`, só importação) ou trata o limite só como problema ruim. |

**Síntese:** (a) viewport nativa + stretch `viewport` + aspect `keep` + scale `integer`. (b) limite inventa o estilo do design.

---

### Questão 14 — ClassInd / Higienização

**Foco da aula:** ClassInd não corta o Core Loop; muda a “roupa” visual (Aula 05).

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | Formato Patch Note. **Não muda** o loop. Violência → fantasia/não-humano/cômico. Drogas → poção/item mágico sem glamour. Usa **atenuantes/agravantes**. Mira L ou 10. |
| **Proficiente (70–89%)** | Muda feedback certo e preserva o loop, mas esquece os termos atenuante/agravante. |
| **Em desenvolvimento (&lt;70%)** | Quer remover tiro/combate ou mudar o Core Loop. |

**Síntese:** muda apresentação; mecânica (mover → atirar → curar) fica.

---

### Questão 15 — RigidBody vs CharacterBody

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | RigidBody = física que “acontece sozinha”. CharacterBody = controle pelo teclado/Input Map + `move_and_slide()`. Player precisa de resposta previsível. |
| **Proficiente (70–89%)** | Entende a diferença básica, mas esquece `move_and_slide()`. |
| **Em desenvolvimento (&lt;70%)** | Troca os nós ou acha que RigidBody é o ideal para o Player. |

**Síntese:** Player = controle firme; física pura demais = caos no avatar.

---

### Questão 16 — Máscara cultural

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | Cultura não é só skin: vira jogo (sistemas, identificação). Liga a Huizinga e ao Círculo Mágico. |
| **Proficiente (70–89%)** | Liga identidade visual a Huizinga, mas fica superficial. |
| **Em desenvolvimento (&lt;70%)** | Diz que é só enfeite / “patriotismo na arte”. |

**Síntese:** máscara cultural = cultura jogável, não decoração.

---

### Questão 17 — Core Loop e Grokking

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | Core Loop = ciclo de ações. Grokking = teclas na memória muscular. Loop claro + feedback bom → deixa de “pensar as teclas”. |
| **Proficiente (70–89%)** | Define os dois, mas liga mal a causa e o efeito. |
| **Em desenvolvimento (&lt;70%)** | Confunde Core Loop com assets; acha que Grokking é função da Godot. |

**Síntese:** sem loop bem feito e feedback claro, não há Grokking.

---

### Questão 18 — Anatomia do movimento

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | Input Map nomeia ações → script no CharacterBody lê e move com `move_and_slide()` → Sprite desenha → CollisionShape colide. |
| **Proficiente (70–89%)** | Entende o conjunto, mas esquece `move_and_slide()` ou o papel dos filhos. |
| **Em desenvolvimento (&lt;70%)** | Dá colisão ao Sprite, ou Input Map no FileSystem, etc. |

**Síntese:** input abstrato + script + visual + colisão = movimento na tela.

---

### Questão 19 — Nearest vs Integer

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | **Nearest** = nitidez do sprite/textura (não embara). **Integer** = escala da janela só em 2×, 3×, 4×… (não estica pixel torto). |
| **Proficiente (70–89%)** | Sabe que as duas evitam distorção, mas não separa “imagem” e “tela”. |
| **Em desenvolvimento (&lt;70%)** | Trata as duas como a mesma coisa; mistura com física ou ClassInd. |

**Síntese:** Nearest salva o pixel do asset; Integer salva o quadro ao redimensionar.

---

### Questão 20 — Lançamento

| Nível | O que esperar |
| --- | --- |
| **Excelente (90–100%)** | **IARC:** um formulário gera classificação em várias regiões, barato e rápido para indie. **ClassInd:** energia mágica + inimigos folclóricos = **atenuante**; sangue real = agravante. Faixa provável: **Livre** ou **10 anos**. |
| **Proficiente (70–89%)** | Acerta IARC e L/10, mas esquece “atenuante” ou o não-humano. |
| **Em desenvolvimento (&lt;70%)** | Fala em censura genérica; não explica IARC nem atenuantes. |

**Síntese:** IARC = alcance global; feedback mágico = faixa baixa.

---

## III. Checklist rápido do corretor

| # | Tipo | Chave / foco mínimo |
| :---: | --- | --- |
| 01 | ME | **B** — contrato / Círculo Mágico no Play |
| 02 | ME | **C** — Inspector + Viewport = regra visível |
| 03 | ME | **D** — Core Loop = ciclo de ações |
| 04 | ME | **D** — CharacterBody2D + Sprite2D + CollisionShape2D |
| 05 | ME | **B** — cultura jogável (Homo Ludens) |
| 06 | ME | **C** — Filter Nearest |
| 07 | ME | **B** — viewport + keep + integer |
| 08 | ME | **B** — NES, flicker, tiles |
| 09 | ME | **B** — ClassInd = aviso, não censura |
| 10 | ME | **C** — feedback muda a faixa |
| 11 | ME | **A** — atenuante (não-humano/cômico) |
| 12 | ME | **D** — sem passo 4 → distorção visual |
| 13 | Disc. | Settings Window + restrição como ajuda criativa |
| 14 | Disc. | Higienização sem mudar o Core Loop |
| 15 | Disc. | Rigid “sozinho” vs Character + `move_and_slide` |
| 16 | Disc. | Máscara cultural ≠ decoração |
| 17 | Disc. | Core Loop → Grokking |
| 18 | Disc. | Input Map → script → nós → tela |
| 19 | Disc. | Nearest (asset) ≠ Integer (janela) |
| 20 | Disc. | IARC global + ClassInd L/10 com atenuantes |

---

*Prova do Módulo 1 — Fundações, Cultura e Interface. Área do Mestre: não distribuir aos alunos.*
