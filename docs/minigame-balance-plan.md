# Plano de rebalanceamento do minigame

## Objetivo
Ajustar o sistema de armas, projéteis, inimigos e progressão para ficar mais próximo de um roguelite de ação do tipo Vampire Survivors, sem manter comportamentos inconsistentes como:

- relâmpago saindo como bolinha lenta e sem impacto visual;
- arma de vento cortante agindo como projétil em vez de corte lateral;
- evoluções do tipo +3 que não existem no design;
- projétil preso no cenário;
- dificuldade abaixo do esperado;
- build que torna o jogo fácil demais e sem sensação de pressão.

---

## Diagnóstico atual

### 1) Relâmpago Sagrado
Problema identificado:
- o efeito atual é visualmente um projétil redondo, lento e pouco impactante;
- não parece uma descarga direta em inimigo;
- o design não está cumprindo a ideia de ataque de raio/eletricidade.

Meta:
- o relâmpago deve funcionar como ataque de dano direto/rápido focado em inimigos próximos;
- deve ser claramente um raio, não uma esfera.
- não deve existir nível +3 como efeito extra; a progressão deve ser lógica, com 3 estágios válidos no máximo e evolução final somente quando a arma evolui de forma correta.

### 2) Vento Cortante
Problema identificado:
- o efeito final está sendo tratado como projétil, o que muda a identidade da arma;
- o comportamento atual não combina com o conceito de cortes laterais que percorrem a tela.

Meta:
- o vento cortante deve ser uma arma de área/cleave lateral, saindo para os lados e atravessando o mapa;
- a evolução final deve reforçar o corte horizontal/vertical em uma faixa maior, não um disparo de projétil.

### 3) Orbe de Fogo
Problema identificado:
- o efeito de +2 não está respondendo como deveria;
- a lógica de explosão/área parece inconsistência entre itens e evolução.

Meta:
- o orbe de fogo deve continuar como arma de dano em área, mas com comportamento previsível e forte;
- a evolução final deve reforçar o dano em área, sem quebrar a leitura visual.

### 4) Dificuldade e inimigos
Problema identificado:
- o jogo está muito fácil;
- inimigos parecem ter dano/quantidade insuficiente para pressionar o jogador;
- a progressão de wave/dificuldade precisa ter curva mais clara.

Meta:
- ajustar HP, dano, velocidade e quantidade de inimigos por wave;
- criar picos de pressão em intervalos curtos;
- garantir que o jogador precise escolher build e se mover bem.

### 5) Projéteis presos no cenário
Problema identificado:
- há casos em que projétil fica preso no cenário;
- isso destrói a sensação de tempo real e empurra a dificuldade para o lado errado.

Meta:
- garantir que todos os projéteis tenham vida útil, limitação de alcance e limpeza automática ao colidir ou sair do mapa.

---

## Regras de balanceamento do design

### 1) Estrutura de armas
Cada arma deve seguir uma identidade clara:
- Lâmina Arcana: dano corpo a corpo/curto alcance, corte rápido.
- Lança de Ossos: projéteis mais previsíveis e estáveis.
- Orbe de Fogo: dano em área e explosões.
- Vento Cortante: cortes laterais/área de alcance grande.
- Relâmpago Sagrado: raio/impacto preciso e rápido em alvo próximo.

### 2) Evoluções
- a evolução final é uma evolução de identidade, não um +3 inventado;
- cada arma terá no máximo 3 upgrades normais e 1 evolução final;
- todas as etapas devem ser claras e sem "número extra" em item de upgrade.

### 3) Representação visual
- relâmpago: aparência linear/rápida, com brilho elétrico;
- vento cortante: cortes, lâminas ou faixas laterais, saindo pela borda;
- orbe: área circular visível;
- projétil não deve ficar agarrado em paredes ou mapa.

### 4) Dificuldade roguelite
- a dificuldade deve subir em curva; não linear em picos aleatórios;
- inimigos devem aparecer em padrões que empurrem a movimentação do player;
- o número de inimigos por minuto deve crescer no decorrer da partida;
- armas e status devem sentir impacto real, mas sem quebrar a legibilidade.

---

## Fases de execução

### Fase 1 — Regras de ataque por arma
Tarefas:
1. Revisar a identidade de cada arma em `PowerupSystem.js`.
2. Remover os casos inconsistentes de +3 e evolução final improvisada.
3. Definir a lógica real de:
   - relâmpago sagrado;
   - vento cortante;
   - orbe de fogo;
   - lâmina arcana;
   - lança de ossos.
4. Ajustar a criação de weapon slots para manter o padrão visual correto sem itens pré-carregados.

Entregável:
- cada arma deve ter comportamento próprio e consistente;
- as evoluções devem respeitar as regras de nivelamento;
- cada arma deve ter nome, dano, faixa e efeito visual claros.

### Fase 2 — Projeteis e limpeza de cenário
Tarefas:
1. Revisar `Projectile.js` e `GameEngine.js` para limpar projéteis fora do mapa ou presos.
2. Definir vida útil e alcance máximo por arma.
3. Garantir que o sistema destrua projéteis ao:
   - atingir inimigo;
   - sair da arena;
   - atingir borda do mapa;
   - exceder tempo máximo.
4. Validar que o relâmpago não vira uma "bolinha lenta".

Entregável:
- nenhum projétil fica preso no cenário;
- todos os disparos têm regra clara de vida útil.

### Fase 3 — Balanceamento de inimigos e curva de dificuldade
Tarefas:
1. Revisar `Enemy.js` e os parâmetros de spawn em `GameEngine.js`.
2. Ajustar:
   - vida;
   - dano;
   - velocidade;
   - intervalo de spawn;
   - pressão por wave.
3. Criar progressão mais agressiva entre 3 e 20 minutos.
4. Garantir que o jogador precise decidir build e se mover.

Entregável:
- dificuldade crescente e previsível;
- ameaças em número e velocidade suficientes para parecer roguelite.

### Fase 4 — Rebalance de status e build progression
Tarefas:
1. Validar que itens de status continuem em 5 slots máximos.
2. Confirmar que o jogador ainda começa sem status preenchidos.
3. Ajustar efeitos de status para não tornarem o jogo trivial.
4. Garantir que armas e status tenham impacto emocional em build finals.

Entregável:
- build progressiva e legível;
- sem status “invisíveis” e sem itens de arma que aparecem já preenchidos.

### Fase 5 — Validar gameplay e polish
Tarefas:
1. Fazer teste de gameplay em navegador.
2. Confirmar que ataques têm contraste visual claro.
3. Verificar tempo de morte, dano e sensação de pressão.
4. Ajustar pequenos detalhes de feedback visual.

Entregável:
- versão jogável com aparência e sensação mais próximas do estilo esperado.

---

## Ordem de execução sugerida
1. Corrigir identidade da arma e do efeito visual.
2. Rebalancear projéteis e limpeza do cenário.
3. Ajustar dificuldade e spawn de inimigos.
4. Revisar status/build progression.
5. Validar no navegador e ajustar polish final.

---

## Critérios de aceite
- Relâmpago não é uma bolinha lenta e sem presença visual.
- Vento Cortante sai como corte lateral e não como projétil padrão.
- Não há +3 estranho em armas.
- O jogo está mais desafiador e com ritmo melhor.
- Nenhum projétil fica preso ao cenário.
- O build fica mais parecido com um roguelite autêntico de Vampire Survivors.

---

## Observação importante
Essa fase é de rebalanceamento, não de correção visual superficial. O objetivo principal é corrigir a identidade dos ataques e dos inimigos antes de qualquer refinamento final do HUD ou da apresentação.
