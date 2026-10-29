# Provação do Módulo 2 — O Balcão e o Labirinto do Submundo

Cruze o balcão dos mercadores e entre no labirinto. Esta provação retoma o que construímos nas Aulas 06, 07 e 08: uma loja justa, trabalho organizado e mecânicas pensadas para quem joga. São 10 questões; marque apenas uma alternativa em cada uma.

Documento de autoria para cadastro no backend. `answer` contém a letra correta; `why` é a justificativa. Não publicar o gabarito junto da prova em andamento.

## Aula 06 — Mercado, PI e loja ética

```text
id: q01
prompt: No mercado brasileiro e internacional de jogos, qual alternativa distingue Original IP de prestação de serviços?
A: Original IP é prestar serviços de arte para qualquer cliente, sem criar um jogo próprio.
B: Original IP é criar e deter o jogo ou universo; prestação de serviços é fornecer trabalho, como arte ou programação, para terceiros.
C: Prestação de serviços significa sempre ser dono dos personagens do cliente.
D: Original IP só existe em jogos internacionais de grandes estúdios.
E: Um estúdio brasileiro só pode ganhar receita vendendo jogos autorais.
answer: B
why: A aula apresenta tanto criação autoral com propriedade intelectual quanto serviços sob contrato como caminhos do mercado.
```

```text
id: q02
prompt: Qual opção segue a proposta da loja ética construída na Aula 06?
A: Cobrar dinheiro real para sortear um item de chance oculta.
B: Esconder o preço até depois da compra.
C: Vender vantagens obrigatórias para conseguir terminar a fase.
D: Oferecer cosméticos com preço fixo usando moedas ganhas jogando.
E: Obrigar o jogador a comprar um pacote para poder coletar moedas.
answer: D
why: A oficina usa cosméticos, preços transparentes e moedas de jogo, sem compra aleatória ou dinheiro real.
```

```text
id: q03
prompt: Na Godot, qual sinal do Button é conectado à função que executa a compra na loja?
A: pressed
B: body_entered
C: mouse_exited
D: tree_exited
E: visibility_changed
answer: A
why: O sinal pressed avisa que o botão foi acionado e executa a função conectada.
```

```text
id: q04
prompt: Na loja da aula, var moedas começa em 10 e o botão de coleta acrescenta GANHO_FASE, que vale 5. Qual será o saldo após clicar uma vez, sem comprar nada?
A: 5 moedas.
B: 10 moedas.
C: 50 moedas.
D: 0 moedas.
E: 15 moedas.
answer: E
why: A coleta soma 5 ao saldo inicial de 10, resultando em 15 moedas.
```

## Aula 07 — Papéis, workflow e coleta

```text
id: q05
prompt: Na dupla da Aula 07, como se dividem os dois ofícios da prática do Labirinto de Moedas?
A: Os dois fazem apenas a arte, sem programar a coleta.
B: Um cria a loja de dinheiro real e o outro publica o jogo.
C: Um faz a arte da moeda e o outro programa a coleta; o diário registra o trabalho.
D: Um escreve a história completa e o outro cria o multiplayer obrigatório.
E: Um joga e o outro faz todo o trabalho, sem registrar as tarefas.
answer: C
why: A oficina divide arte da moeda e programação da coleta e usa um diário compartilhado; no solo, o aluno assume ambos.
```

```text
id: q06
prompt: Qual prática combina com o workflow e o versionamento visual ensinados na Aula 07?
A: Fechar um MVP, organizar as pastas, definir quem edita cada cena e guardar versões em ZIP datado.
B: Acrescentar toda ideia nova sem rever o prazo ou o escopo.
C: Pedir que todos sobrescrevam o mesmo arquivo de cena ao mesmo tempo.
D: Deixar a integração para depois da entrega e dispensar o playtest.
E: Usar nomes aleatórios para não precisar organizar as cenas.
answer: A
why: Escopo pequeno, organização, responsabilidade por cena e backups identificados ajudam a integrar e testar o projeto.
```

```text
id: q07
prompt: No script da moeda, depois que o Player entra na Area2D e a coleta é chamada, para que serve queue_free()?
A: Aumentar automaticamente a velocidade do Player.
B: Salvar o projeto em um arquivo ZIP.
C: Criar outra moeda no mesmo lugar.
D: Remover a moeda coletada da cena.
E: Mudar a textura de todos os personagens.
answer: D
why: queue_free() agenda a remoção do nó da moeda, fazendo o objeto coletado desaparecer.
```

## Aula 08 — Perfis e labirinto direcionado

```text
id: q08
prompt: Para que usamos o modelo Quantic Foundry na Aula 08?
A: Para escolher automaticamente a linguagem de programação do jogo.
B: Para compreender motivações de jogadores e orientar decisões de design.
C: Para calcular o preço obrigatório de todo jogo.
D: Para substituir o playtest por uma classificação indicativa.
E: Para determinar a resolução máxima permitida na Godot.
answer: B
why: O modelo organiza motivações de jogadores e ajuda a ligar um perfil-alvo às mecânicas do nível.
```

```text
id: q09
prompt: Na divisão Design do perfil × Programação das mecânicas, qual decisão corresponde à trilha Conquista do labirinto?
A: Criar uma loja com sorteio pago de equipamentos.
B: Trocar o objetivo da fase por um sistema de multiplayer obrigatório.
C: Remover todas as moedas para não haver nada a conquistar.
D: Implementar somente um obstáculo móvel, que é a mecânica mínima da trilha Ação.
E: Planejar uma área secreta com uma moeda brilhante difícil de alcançar e implementar sua coleta.
answer: E
why: A trilha Conquista conecta o perfil a segredo e moeda especial; o design planeja a experiência e a programação a torna jogável.
```

```text
id: q10
prompt: Na prática da Aula 08, por que adicionamos uma Camera2D como filha do Player?
A: Para substituir a CollisionShape2D e detectar as moedas.
B: Para transformar o Player em um botão de interface.
C: Para que a vista acompanhe o Player durante a exploração da fase.
D: Para aumentar o saldo da loja a cada quadro.
E: Para exportar automaticamente o projeto para Windows.
answer: C
why: A Camera2D filha acompanha a posição do Player e permite explorar o nível além da tela inicial.
```

## Rastreabilidade para revisão

- q01–q04: `docs/plano-aula6-mercado-loja-etica.md`, Fundamento teórico e decisões 3–6; `docs/conteudo-modulo2-gdscript-do-zero.md`, Aula 06; `pages/aula6.html`.
- q05–q07: `pages/aula7.html`, ofícios, workflow, versionamento e script moeda.gd; `js/aula7.js`, JOURNAL_TEMPLATE; `assets/docs/aulas/aula07-equipe-labirinto/moeda-exemplo.gd`.
- q08–q10: `docs/plano-aula8-perfis-quantic-foundry.md`, decisões e trilhas; `pages/aula8.html`, modelo, divisão de ofícios, câmera e Conquista.
- Questões práticas/código: q03, q04, q07, q09 e q10.
- Gabarito: B, D, A, E, C, A, D, B, E, C. Cada letra aparece duas vezes.
