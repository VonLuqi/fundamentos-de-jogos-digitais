# Planejamento de atualização da Aula 01

## Objetivo
Reestruturar a Aula 01 para seguir o padrão curricular do projeto, introduzindo a organização por **Módulos** para conjuntos de aulas e alinhando o conteúdo da primeira aula ao recorte pedagógico enviado pelo professor.

A prioridade desta mudança é manter a identidade já construída no projeto, mas ajustar a aula para que ela fique mais direta, mais didática e mais consistente com a sequência do curso.

---

## Estrutura proposta do curso

### Módulo 1: Fundações, Cultura e Interface
- **Aulas 1 a 5**
- **Carga total estimada:** 10h
- **Foco geral:** introdução aos fundamentos dos jogos, leitura de interface, experimentação guiada e observação de regras emergentes.

### Papel do módulo
Este módulo deve funcionar como a porta de entrada do curso. Ele precisa:
- apresentar o que é jogo como sistema de regras;
- introduzir o conceito de Círculo Mágico;
- ensinar a ler a interface da engine antes de programar;
- incentivar experimentação, hipótese e observação;
- preparar o aluno para as aulas seguintes do mesmo conjunto.

---

## Aula 01: O Círculo Mágico e a Interface Amigável da Engine

### Tópico da ementa
Conceitos de jogos.

### Objetivo pedagógico da aula
Mostrar que um jogo cria um espaço com regras próprias e que a engine é o ambiente onde essas regras podem ser observadas, alteradas e testadas. A aula deve conectar teoria e prática sem exigir código.

### Estrutura de conteúdo

#### 1. Fundamento teórico
- explicar o que torna um jogo diferente de outras mídias;
- apresentar o conceito de **Círculo Mágico** de Johan Huizinga;
- reforçar a ideia de que, ao entrar no jogo, o jogador aceita um conjunto de regras temporárias;
- destacar que o jogo cria uma realidade operacional própria, na qual ações e consequências são definidas pelo sistema.

#### 2. Prática na Godot Engine
- apresentar a interface da Godot 4 como ambiente de experimentação;
- mostrar os painéis principais:
  - Scene;
  - FileSystem;
  - Inspector;
  - Viewport 2D.
- explicar que cada painel cumpre uma função no processo de criar e testar regras do jogo;
- posicionar o editor como uma ferramenta de leitura rápida entre intenção, alteração e resultado.

#### 3. Atividade prática guiada
- usar uma cena pré-configurada com uma bola física (`RigidBody2D`) e plataformas sólidas (`StaticBody2D`);
- pedir que o aluno altere apenas uma variável por vez no Inspector;
- testar massa, gravidade da cena, fricção e elasticidade;
- apertar Play após cada mudança para observar o efeito;
- registrar a diferença entre o valor alterado e o comportamento observado.

### Artefato gerado
- rascunho mental das regras criadas ao alterar as variáveis;
- leitura inicial de como o mundo do jogo responde a parâmetros de design.

---

## Novidades a adicionar nesta atualização

### 1. Organização por módulos
Cada conjunto de aulas deve nascer dentro de uma seção chamada **Módulo**.
Isso precisa aparecer de forma explícita na documentação da aula, para que o aluno entenda que a Aula 01 faz parte de uma progressão maior.

### 2. Linguagem mais direta e mais limpa
A Aula 01 deve manter o tom conceitual, mas com menos excesso de termos e menos poluição visual no texto.
O foco é deixar claro:
- o que o aluno aprende;
- o que o aluno faz;
- o que o aluno entrega.

### 3. Mais ênfase em observação experimental
A atividade precisa reforçar o método:
- alterar;
- executar;
- observar;
- explicar;
- registrar.

### 4. Melhor amarração entre teoria e prática
A parte do Círculo Mágico precisa conversar diretamente com a prática no Inspector.
A ideia é que o aluno perceba que alterar propriedades na engine equivale a reescrever regras do mundo jogável.

### 5. Artefato final mais claro
O resultado da aula deve ser apresentado como um pequeno registro de descoberta, não apenas como anotação solta.
Isso ajuda a criar continuidade entre as aulas do módulo.

---

## Diretrizes de conteúdo para a versão final da aula

### O que manter
- o conceito de Círculo Mágico;
- a leitura da Godot como interface de experimentação;
- a atividade de “Brincando no Inspector”;
- o uso da bola física e das plataformas;
- a observação de massa, gravidade, fricção e elasticidade.

### O que ajustar
- o título da aula deve ficar mais alinhado ao material novo;
- a introdução deve deixar mais claro que se trata do primeiro passo de um módulo;
- a atividade deve ter instruções mais objetivas;
- o artefato final precisa estar melhor descrito;
- a aula deve explicitar que o aluno não vai escrever código nesta etapa.

### O que acrescentar
- uma seção inicial de módulo;
- uma frase de síntese da aula;
- um fechamento que conecte a descoberta da aula com a próxima aula do módulo;
- uma leitura mais explícita da interface como ferramenta de design.

---

## Critérios de aceite do planejamento
- a estrutura em módulos fica visível no documento;
- a Aula 01 passa a seguir o padrão curricular pedido;
- a aula continua prática e sem código;
- a teoria e a atividade do Inspector ficam conectadas;
- o texto final deixa claro o que o aluno aprende e o que ele produz.

---

## Próximo passo sugerido
Depois deste planejamento, o próximo passo é transformar essa proposta na estrutura final da Aula 01, já com texto pronto para o arquivo da aula e, se necessário, ajuste dos slides e do material de apoio.