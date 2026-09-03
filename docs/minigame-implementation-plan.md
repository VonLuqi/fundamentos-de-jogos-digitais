# Plano de implementação do minigame Arcane Survivors

## Visão geral

Este plano reestrutura o desenvolvimento em tarefas pequenas, verificáveis e alinhadas ao GDD final do jogo. Ele marca o que já foi concluído e o que ainda precisa ser entregue para a versão jogável do minigame.

O foco agora é o gameplay de sobrevivência em estilo Vampire Survivors:
- 3 personagens jogáveis;
- 40 power-ups no total;
- 5 slots de arma;
- 5 slots de status;
- sobrevivência por 20 minutos;
- dificuldade crescente;
- loop de luta, XP e progression.

---

## Status geral do projeto

### ✅ Concluído
- cena Three.js carregando corretamente;
- player controlado por teclado;
- arena funcional com limites e visão top-down;
- ambiente simples e legível;
- inimigos básicos funcionando;
- sistema de combate por contato/projétil funcionado;
- coleta de XP com pickups;
- sistema de derrota e vitória básico no motor do jogo;
- envio de XP da run ao backend de progresso;
- documentação de GDD atualizada com o conceito final.

### ⏳ Ainda pendente
- completar a estrutura de personagens com 3 personagens jogáveis definitivos;
- implementar as 5 slots de arma e 5 slots de status;
- criar a tabela central de 40 power-ups e seus efeitos;
- implementar sistema de level-up com janela de upgrades;
- balancear dificuldade para sobrevivência de 20 minutos;
- criar HUD completo de vida, XP, nível, tempo e upgrades;
- validar a run completa em navegador com fluxo real de jogo;
- ajustar sincronização de XP no perfil do aluno após a partida.

---

## Estrutura de tarefas

### Tarefa 1 — Base do jogo e renderização
Status: ✅ Concluída

Objetivo:
- garantir que o minigame abra sem erro e renderize a cena.

Itens realizados:
- criar cena Three.js com renderer, câmera ortográfica e canvas;
- adicionar iluminação básica com ambient + directional light;
- criar chão da arena e ambiente simples;
- ajustar camera follow no player;
- validar que a cena aparece corretamente.

Critério de aceite:
- o jogo abre e a cena é visualmente estável sem erros no console.

---

### Tarefa 2 — Movimento do player e arena
Status: ✅ Concluída

Objetivo:
- tornar o controle do player estável e sem sair do mapa.

Itens realizados:
- mapear input WASD / setas;
- normalizar direção do movimento;
- ajustar velocidade e resposta do player;
- corrigir limites da arena;
- retirar obstáculos desnecessários e manter o espaço limpo;
- ajustar a câmera para seguir o jogador.

Critério de aceite:
- o player não sai da arena;
- o movimento é responsivo e previsível;
- o espaço da arena fica claro para o combate.

---

### Tarefa 3 — Entidades básicas do combate
Status: ✅ Concluída

Objetivo:
- introduzir ameaça e ação principal da partida.

Itens realizados:
- criar `Player` com vida e movimentação;
- criar `Enemy` com perseguição ao player;
- criar `Projectile` para disparo;
- criar `Pickup` para XP;
- controlar dano por contato;
- remover inimigos derrotados;
- remover projéteis quando saem da vida útil;
- remover itens coletados.

Critério de aceite:
- inimigos perseguem e atacam o player;
- disparos causam dano;
- pickups de XP conferem progresso.

---

### Tarefa 4 — Loop de sobrevivência e condição de vitória/derrota
Status: ✅ Concluída parcialmente

Objetivo:
- definir a regra de fim da partida.

Itens realizados:
- detectar quando a vida do jogador chega a zero;
- encerrar a run em derrota;
- entregar overlay de resultado;
- detectar condição de vitória por sobrevivência;
- preparar a integração da XP da run para o backend.

Itens pendentes:
- transformar a vitória em regra final de 20 minutos, com dificuldade escalando com o tempo;
- ajustar o HUD para mostrar cronômetro real de sobrevivência;
- garantir que a partida só finalize quando a regra de sobrevivência for alcançada.

Critério de aceite:
- player perde ao zerar HP;
- partida conclui corretamente em vitória ou derrota;
- a regra final da partida segue a meta de 20 minutos.

---

### Tarefa 5 — Sistema de XP da run e integração com o backend
Status: ✅ Concluída parcialmente

Objetivo:
- enviar a XP acumulada da partida para o perfil do usuário.

Itens realizados:
- criar função de envio `submitMinigameRun` no cliente;
- adicionar ação `addRunXP` em `api/progress.js`;
- validar token da sessão e somar XP ao usuário;
- enviar o dado ao backend em runtime.

Itens pendentes:
- validar fluxo completo em um ambiente com sessão real ativa;
- confirmar que o perfil do aluno atualiza corretamente após a run;
- melhorar feedback visual ao usuário quando o envio falha ou supera as regras do backend.

Critério de aceite:
- XP da run é persistida no perfil do aluno;
- a sessão é validada pelo servidor;
- servidor responde corretamente a ação `addRunXP`.

---

### Tarefa 6 — Sistema de personagens jogáveis
Status: ⏳ Pendente

Objetivo:
- implementar os 3 personagens do GDD e suas armas iniciais.

Personagens previstos:
- Soulblade — arma inicial: Lâmina Arcana
- Graveguard — arma inicial: Lança de Ossos
- Warden of Echoes — arma inicial: Orbe de Fogo

Itens necessários:
- criar estrutura de seleção de personagem antes do início da partida;
- definir estatísticas base por personagem;
- aplicar arma inicial conforme o personagem escolhido;
- manter a identidade do personagem sem bloquear as evoluções futuras.

Critério de aceite:
- o jogador pode escolher entre 3 personagens;
- cada personagem começa com uma arma diferente;
- a escolha altera o comportamento inicial do run.

---

### Tarefa 7 — Sistema de armas e slots (5 slots)
Status: ⏳ Pendente

Objetivo:
- implementar o sistema de armas seguindo o GDD.

Itens necessários:
- definir estrutura de armas do jogo;
- criar 5 slots de arma;
- iniciar com um slot preenchido pela arma inicial;
- permitir evolução de armas por power-ups;
- garantir que o sistema escale com mais armas sem quebrar o gameplay.

Armas base previstas:
- Lâmina Arcana
- Lança de Ossos
- Orbe de Fogo
- Vento Cortante
- Relâmpago Sagrado

Critério de aceite:
- o jogador pode acumular até 5 armas ao mesmo tempo;
- a arma inicial aparece e evolui conforme os power-ups;
- a build se torna escalável sem mudar a regra principal do jogo.

---

### Tarefa 8 — Sistema de status e slots (5 slots)
Status: ⏳ Pendente

Objetivo:
- implementar upgrades de status da build.

Itens necessários:
- criar tabela de status com efeitos cumulativos;
- criar 5 slots de status;
- definir regras de multiplicação ou cumulativo por nível;
- criar HUD para mostrar status ativos;
- garantir que builds diferentes tenham impacto percebível.

Status esperados:
- velocidade
- dano
- taxa de ataque
- vida máxima
- coleta/raio de pickup
- resistência
- regeneração
- critério / área / velocidade de projétil

Critério de aceite:
- o jogador pode melhorar build de forma clara;
- status ativos estão visíveis e impactam o jogo;
- a run mantém variedade de estratégias.

---

### Tarefa 9 — Power-ups (40 itens)
Status: ⏳ Pendente

Objetivo:
- implementar a base de dados dos power-ups e o sistema de escolha.

Itens necessários:
- criar a tabela central de 40 power-ups;
- separar 20 power-ups de arma e 20 de status;
- criar lógica de aleatoriedade e escolha durante level-up;
- permitir que upgrades se repitam com efeito cumulativo;
- definir o comportamento de cada item no sistema do jogo.

Critério de aceite:
- o jogador recebe 3 opções aleatórias ao upar de nível;
- os power-ups estão funcionando corretamente de acordo com o tipo escolhido;
- a build evolui de forma consistente.

---

### Tarefa 10 — Level-up e upgrades na partida
Status: ⏳ Pendente

Objetivo:
- transformar a coleta de XP em progressão de build.

Itens necessários:
- criar sistema de XP por inimigos e pickups;
- definir curva de nível;
- pausar a partida ao subir de nível;
- abrir menu de 3 upgrades aleatórios;
- aplicar efeitos imediatos na build do jogador;
- continuar a partida após a escolha.

Critério de aceite:
- o jogador sobe de nível de forma clara;
- o menu de upgrades aparece e funciona;
- a escolha impacta o desempenho da próxima fase da partida.

---

### Tarefa 11 — Dificuldade escalonada de 20 minutos
Status: ⏳ Pendente

Objetivo:
- alinhar o jogo ao GDD e à regra final de sobrevivência.

Itens necessários:
- definir curva de dificuldade por tempo;
- aumentar spawn de inimigos conforme o tempo;
- aumentar velocidade e dano dos inimigos em fases do jogo;
- manter a partida desafiadora sem quebrar a legibilidade;
- ajustar a condição de vitória para 20 minutos.

Fases esperadas:
- 0–5 min: leve
- 5–10 min: moderada
- 10–15 min: alta
- 15–20 min: extrema

Critério de aceite:
- a dificuldade aumenta progressivamente;
- o jogo exige adaptação e build adequada;
- a partida pode ser vencida por resistência até 20 minutos.

---

### Tarefa 12 — HUD completo do minigame
Status: ⏳ Pendente

Objetivo:
- mostrar informações cruciais para a partida.

Itens necessários:
- vida do player;
- XP atual e nível;
- tempo de sobrevivência;
- lista de armas ativas;
- lista de status ativos;
- indicador de result do jogo.

Critério de aceite:
- o jogador entende a própria situação na partida;
- HUD é claro e não interfere na leitura da arena;
- os upgrade choices ficam compreensíveis.

---

### Tarefa 13 — Balanceamento e polimento final
Status: ⏳ Pendente

Objetivo:
- garantir que o jogo seja jogável e envolvente.

Itens necessários:
- balancear dano, HP, spawn e XP;
- ajustar arena para manter movimentação confortável;
- retirar qualquer código ou artefato desnecessário;
- validar que a run flui sem bugs de UI ou lógica;
- testar o ciclo completo: escolha > jogo > level-up > build > sobrevivência > vitória/derrota.

Critério de aceite:
- a experiência completa funciona;
- o jogo é estável, equilibrado e legível;
- a visão do jogo se encaixa ao padrão de Vampire Survivors.

---

## Ordem recomendada de execução

1. Tarefa 6 — personagens
2. Tarefa 7 — armas e slots
3. Tarefa 8 — status e slots
4. Tarefa 9 — power-ups
5. Tarefa 10 — level-up e upgrades
6. Tarefa 11 — dificuldade de 20 minutos
7. Tarefa 12 — HUD
8. Tarefa 13 — balanceamento final

As tarefas já concluidas servem como base estável para as próximas. O próximo grande passo é transformar o gameplay atual em um sistema completo de personagem, build, power-ups e sobrevivência por 20 minutos.

---

## Resumo executivo

O minigame já cumpriu a base funcional: cena, player, inimigos, combate, coleta de XP, flow de derrota/vitória e integração inicial com backend. O que agora permanece é a construção do sistema de design do jogo conforme o GDD final: personagens jogáveis, 5 slots de arma, 5 slots de status, 40 power-ups, level-up e sobrevivência até 20 minutos com dificuldade crescente.
