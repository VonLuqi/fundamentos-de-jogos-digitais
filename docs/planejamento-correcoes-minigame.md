# Planejamento detalhado das mudanças de progressão do minigame

## Objetivo
Corrigir a progressão do arsenal e dos status do jogo para que o sistema siga a regra de progression design:

- quando o jogador ainda não tem a arma ou o livro de status, ele recebe o item em estado novo, com base estável e identidade clara;
- depois disso, os upgrades aparecem como melhorias progressivas;
- cada item pode receber upgrades em 10 níveis antes de entrar na fase final;
- upgrades têm raridade visível e o efeito do item escala com a raridade;
- a versão final do item aparece apenas ao final da cadeia e encerra as evoluções;
- o sistema deve respeitar o padrão visual e mecânico do projeto em Three.js e usar as skills da pasta de skills do Three.js do repositório.

---

## Regras de design que devem ficar fixas

### 1) Estado inicial = item novo
Quando o jogador ainda não possui uma arma ou um livro de status:
- o item aparece como "Novo";
- ela entra com status base pré-definidos e consistentes;
- o item não inicia em estado de upgrade inflado;
- todos os itens devem seguir a mesma estrutura de base: id, nome, raridade, nível, nível de progresso, valor base, multiplicador e estado final.

### 2) Evolução pós-pickup
Depois que o item é adquirido:
- o jogo passa a gerar upgrades para aquele item específico;
- os upgrades podem aparecer em raridades diferentes;
- os dados do item devem continuar partindo da base inicial e evoluir apenas com esse sistema de melhoria;
- o sistema não pode repetir valores de upgrade “+1 | +2 | +3” como se fossem itens independentes sem contexto de base e raridade.

### 3) Raridades
Os upgrades devem seguir a escala:
- Comum
- Incomum
- Raro
- Épico
- Lendário

Regra:
- raridade mais alta = melhor bonus por nível;
- raridade também deve influenciar a chance de escolha e a estética da carta;
- todas as cartas e livros devem exibir claramente a raridade em texto e cor.

### 4) Evolução até o final
Cada arma e cada livro de status entra em uma progressão de até 10 upgrades antes da forma final.
- o nível de progressão deve ir de 1 até 10;
- a partir do nível 10, o item entra em versão final;
- ao entrar na fase final, ele para de receber upgrades e recebe o estado de auge; 
- a tag "Final" aparece somente quando o nível de progressão atingir o limite; nunca antes.

### 5) Acesso ao Three.js
O sistema de visual, feedback e UI deve seguir as skills disponíveis no repositório:
- `threejs-fundamentals`
- `threejs-geometry`
- `threejs-materials`
- `threejs-lighting`
- `threejs-animation`
- `threejs-loaders`
- `threejs-textures`
- `threejs-shaders`
- `threejs-interaction`
- `threejs-postprocessing`

Essas skills devem ser usadas sempre que houver criação de VFX, meshes, brilho, material visual, animação de upgrade, feedback de raridade, ou cenário/efeitos de ataque.

---

## Abordagem geral da implementação

A implementação deve ser feita em 3 camadas:

1. Modelagem de dados
   - catálogo de armas
   - catálogo de status
   - raridades
   - regra de 10 upgrades e final

2. Lógica de progressão
   - quando item novo
   - quando item já existe
   - quando item atinge nível máximo
   - geração de upgrades e raridades

3. Feedback visual e gameplay
   - cards de upgrade
   - destaque de raridade
   - tag "Novo"
   - tag "Final"
   - efeitos Three.js para glow, brilho, ícones, VFX e interação visual

---

## Correção urgente — relâmpago sem visual

### Problema atual
O relâmpago não está mais exibindo o efeito visual no campo de batalha. O pequeno raio em cima do personagem também desapareceu, então o ataque está sem feedback visual e o jogador não percebe quando ele é acionado.

### Correções obrigatórias
- restaurar a linha/raio visual do relâmpago no ponto da origem do ataque;
- garantir que o efeito reapareça em cima do personagem e no alvo do ataque quando o disparo ocorrer;
- revisar a lógica de criação/remoção da mesh visual do relâmpago para evitar que o efeito seja destruído antes de renderizar;
- garantir que o material, luz e partículas do relâmpago fiquem visíveis sem depender de colisão invisível;
- replicar o mesmo padrão de feedback visual para o impacto final, com clareza na tela e sem desaparecer instantaneamente.

### Critérios de aceitação
- o relâmpago deve ser visível em todos os momentos em que o ataque dispara;
- o raio em cima do personagem precisa reaparecer quando o efeito for disparado;
- o impacto visual do ataque precisa ser claramente percebido em gameplay.

### Skills Three.js envolvidas
- `threejs-fundamentals`
- `threejs-lighting`
- `threejs-animation`
- `threejs-materials`

---

## Task 1 — Modelar o sistema de progressão de armas e status

### Objetivo
Definir a estrutura de dados das armas e dos livros de status com base estável e progressão clara.

### Tarefas
- criar base de dados para todas as armas do jogo;
- criar base de dados para todos os livros de status;
- definir campos mínimos:
  - id
  - nome
  - categoria (arma ou status)
  - tipo de efeito
  - raridade base
  - nível atual
  - nível de progressão
  - valor base
  - valor escalado
  - estado final
  - tag novo / final
- definir o catálogo das 5 armas principais e dos livros de status;
- confirmar que armas e status compartilham o mesmo modelo de progressão.

### Critérios de aceitação
- todo item tem modelo estável;
- nenhum item novo começa em estado de upgrade pré-aplicado;
- todo item sabe em que fase da progressão está.

### Skills Three.js envolvidas
- `threejs-fundamentals`
- `threejs-geometry`

---

## Task 2 — Definir os valores-base dos itens antes do primeiro pickup

### Objetivo
Garante que itens novos entrem com valores corretos e previsíveis.

### Tarefas
- criar tabela de valores-base para cada arma;
- criar tabela de valores-base para cada tipo de status;
- garantir os valores iniciais de:
  - dano
  - velocidade
  - alcance
  - cadence / ataque
  - resistência
  - regeneração
  - raio de coleta
- separar valor base de valor pós-upgrade;
- manter todas as base values em um único ponto de controle.

### Critérios de aceitação
- um item novo nunca inicia com valor de upgrade inflado;
- todas as bases seguem regra com modelação estável;
- a primeira vez que o jogador pega o item, ele recebe a versão “novo” e não “+1”.

### Skills Three.js envolvidas
- `threejs-materials`
- `threejs-lighting`

---

## Task 3 — Implementar o sistema de raridade e visual de cartas

### Objetivo
Dar identidade visual para upgrades com raridade diferente.

### Tarefas
- definir raridades como enum ou coleção;
- mapear pesos de chance por raridade:
  - Comum: mais frequente
  - Incomum: frequente
  - Raro: intermediária
  - Épico: rara
  - Lendário: muito rara
- atribuir cores e estilos para cada raridade;
- criar visual de card com label de raridade;
- criar marcação de "Novo" no item recém-adquirido;
- criar marcação de "Final" quando atingir nível 10.

### Critérios de aceitação
- as cartas mostram claramente a raridade;
- raridade mais alta oferece maior impacto;
- o texto/visual do item deixa claro se ele está em estado novo, evoluído ou final.

### Skills Three.js envolvidas
- `threejs-materials`
- `threejs-shaders`
- `threejs-postprocessing`

---

## Task 4 — Implementar a regra de 10 upgrades e nível final

### Objetivo
Garantir que cada arma e livro de status evolua em etapas bem definidas até o auge.

### Tarefas
- criar contador de progressão por item;
- definir a regra: item novo -> upgrades sequenciais -> nível 10 => final;
- bloquear novos upgrades quando o item já estiver em estado final;
- garantir que a versão final só apareça no nível 10;
- garantir que a mensagem "Final" nunca apareça antes do nível 10.

### Critérios de aceitação
- nenhum item recebe upgrade além da base final;
- nível final está bem definido;
- o item para de receber upgrades após o nível 10.

### Skills Three.js envolvidas
- `threejs-animation`
- `threejs-interaction`

---

## Task 5 — Implementar a geração de upgrades por item

### Objetivo
Aplicar melhorias reais ao item único que o jogador já possui.

### Tarefas
- ao coletar um item já existente, gerar upgrade compatível com esse item;
- remover a ideia de "+1 | +2 | +3" como item genérico sem vínculo;
- criar sistema de roll por raridade e por tipo de efeito;
- separar upgrade de arma e upgrade de status em pools independentes;
- as escolhas devem respeitar o item atual e seu nível de progresso.

### Critérios de aceitação
- um item novo não sai com buff de início;
- upgrades aparecem somente para o item correspondente;
- os upgrades têm efeito proporcional à raridade e ao nível do item.

### Skills Three.js envolvidas
- `threejs-fundamentals`
- `threejs-interaction`

---

## Task 6 — Definir a lógica do painel de upgrade / escolha de itens

### Objetivo
A interface deve deixar claro o item atual, a raridade, o estado e o impacto do upgrade.

### Tarefas
- criar painel de level up com 3 opções de escolha;
- exibir nome, categoria, raridade, descrição e impacto estimado;
- incluir tag "Novo" para itens recém-adquiridos;
- incluir tag "Final" para itens no auge;
- separar visuais entre arma, status e rarity;
- usar cores e brilho por raridade.

### Critérios de aceitação
- o player consegue identificar facilmente o que é novo, o que é upgrade e o que é final;
- os cards não parecem versões infladas de uma arma base;
- a interface comunica a raridade e o valor do impacto.

### Skills Three.js envolvidas
- `threejs-materials`
- `threejs-lighting`
- `threejs-shaders`

---

## Task 7 — Integrar o sistema ao gameplay da run

### Objetivo
Conectar progressão, escolha e efeitos ao minigame em tempo real.

### Tarefas
- ao derrotar inimigos, gerar XP e drops compatíveis;
- ao coletar um item novo, criar o item em estado base;
- ao coletar um item existente, resolver upgrade e aplicar efeitos;
- atualizar HUD para mostrar:
  - item novo
  - rarity atual
  - nível de evolução
  - estado final
- reforçar a identidade de cada arma e status no HUD.

### Critérios de aceitação
- o jogador vê claramente o estado do item adquirido;
- o item já adquirido evolui sem redefinir a base do item;
- o jogo sustenta milhares de combinações sem quebrar a lógica.

### Skills Three.js envolvidas
- `threejs-animation`
- `threejs-interaction`

---

## Task 8 — Feedback visual do upgrade e do item final

### Objetivo
Dar feedback visual para que o upgrade pareça importante e bem definido.

### Tarefas
- animação de entrada para item novo;
- brilho de raridade por item;
- pulse do item final;
- VFX em upgrade de arma e status;
- particles ou glow para raridade lendária;
- garantir que o efeito não afete gameplay, apenas feedback visual.

### Critérios de aceitação
- os upgrades e itens finais têm presença visual clara;
- raridade é reconhecível sem ler texto;
- efeitos são agradáveis e não poluem a tela.

### Skills Three.js envolvidas
- `threejs-lighting`
- `threejs-animation`
- `threejs-postprocessing`
- `threejs-shaders`

---

## Task 9 — Preparar regras de validação e testes

### Objetivo
Garantir que o sistema continue funcionando em todas as combinações possíveis.

### Tarefas
- criar testes para:
  - item novo sem buff inicial;
  - item existente com upgrade válido;
  - itens finalizados sem novos upgrades;
  - raridade com peso esperado;
  - progressão até 10 níveis;
  - lógica de item final não repetindo upgrade;
  - valor base preservado e escalado por raridade.
- testar junto com os cenários atuais do minigame;
- validar que nenhuma arma entra “bufada” nas primeiras jogadas.

### Critérios de aceitação
- regressão coberta para os principais casos da progressão;
- regras finalizadas ficam explícitas no código;
- o sistema mantém consistência em todas as possibilidades de evolução.

### Skills Three.js envolvidas
- `threejs-fundamentals`
- `threejs-animation`

---

## Task 10 — Integrar o Three Nebula para reformular os efeitos visuais

### Objetivo
Usar o pacote `three-nebula` para transformar os efeitos visuais do jogo em partículas mais densas, mais claras e mais encantadoras, sem comprometer performance nem causar poluição visual excessiva.

### Contexto técnico
O jogo já usa Three.js com meshes e materiais simples para armas, ataques e pickups. O `three-nebula` deve funcionar como camada de VFX complementar para efeitos que exigem partículas, brilho, emissões, trails e feedback de impactação. A integração deve ser feita de forma modular e controlada em um sistema de efeitos separado.

### Tarefas
- criar um módulo de efeitos visuais (`VfxSystem` ou equivalente) para encapsular o `three-nebula`;
- configurar o sistema para inicializar com a mesma cena Three.js do minigame;
- definir emitters por tipo de efeito:
  - relâmpago
  - vento cortante
  - orbe de fogo
  - impacto de inimigo
  - coleta de XP
  - pickup de arma / status
  - level up / evolução de item
  - item final / rare glow
- definir paletas de cor por arma e raridade:
  - relâmpago = amarelo/laranja elétrico
  - vento = azul/ciano
  - fogo = laranja/vermelho
  - XP = azul claro
  - rare / epic / legendary = violet, magenta, gold
- criar emitters com duração curta, baixo custo e limpeza automática ao final do efeito;
- separar emissões de impacto em duas camadas:
  - efeito de origem (na arma/jogador)
  - efeito de destino (na área ou inimigo atingido)
- aplicar partículas em eventos reais do gameplay, não apenas em animações aleatórias;
- garantir que o `three-nebula` não gere efeitos infinitos durante o jogo;
- remover emitter quando o efeito terminar ou quando o objeto for destruído;
- criar uma camada de VFX para o painel de upgrades e para os itens raros, respeitando o mesmo sistema visual;
- padronizar a intensificação visual por raridade usando emissões mais densas e brilho maior para épico/lendário.

### Critérios de aceitação
- todos os ataques principais têm feedback visual claro e impressionante;
- o relâmpago e o vento não parecem “sem efeito”;
- partículas aparecem na origem e no impacto do ataque;
- o sistema de VFX fica separado da lógica de gameplay;
- o efeito raro é distinguível visualmente sem precisar ler texto;
- o jogo mantém performance aceitável mesmo com vários inimigos e eventos simultâneos.

### Skills Three.js envolvidas
- `threejs-fundamentals`
- `threejs-lighting`
- `threejs-animation`
- `threejs-materials`
- `threejs-shaders`
- `threejs-postprocessing`

---

## Task 11 — Implementar os emitters específicos por tipo de ataque

### Objetivo
Definir quais efeitos visuais serão usados em cada arma/ação do jogo.

### Tarefas
- relâmpago:
  - spark arc
  - emissões amarelas/laranja
  - mini pulse na origem do jogador
  - burst no alvo impactado
- vento cortante:
  - trail linear
  - partículas em formato de lâmina
  - corte com movimento leve e azul-ciano
- orbe de fogo:
  - partículas quentes em formato de esfera
  - brilho em torno do projétil
  - explosão ao atingir inimigo
- inimigos derrotados:
  - burst de poeira/energy
  - spark de morte
- pickups de XP:
  - partículas de coleta em direção ao player
  - orb de energia ao redor do pickup
- level up / item final:
  - ring de aura
  - partículas de raridade com escala maior

### Critérios de aceitação
- cada ataque tem identidade visual clara;
- os VFX são consistentes com a arma;
- feedback de impactação está presente em todos os ataques relevantes;
- o sistema visual não causar confusão em cenas movimentadas.

### Skills Three.js envolvidas
- `threejs-animation`
- `threejs-interaction`
- `threejs-postprocessing`

---

## Task 12 — Definir a arquitetura do VFX manager e lifecycle

### Objetivo
Organizar as partículas para manter o código limpo e previsível.

### Tarefas
- criar uma classe `VfxManager` responsável por:
  - registrar emitters
  - criar/limpar emitters por efeito
  - atualizar o loop de partículas
  - remover emitters expirados
- separar emissões por categoria:
  - combat
  - pickups
  - upgrades
  - ambiente
- expor métodos públicos como:
  - spawnLightningImpact(position, color)
  - spawnWindCleave(position, direction, color)
  - spawnFireExplosion(position, color)
  - spawnPickupBurst(position, color)
  - spawnLevelUpBurst(position, rarity)
  - spawnItemFinalAura(position)
- garantir que todos os emitters usem a scene do minigame e sejam adicionados/ removidos corretamente.

### Critérios de aceitação
- a lógica de VFX fica completamente separada da lógica de dano e progressão;
- o código de ataque não precisa manipular partículas diretamente;
- o ciclo de vida dos emitters fica previsível e fácil de depurar.

### Skills Three.js envolvidas
- `threejs-fundamentals`
- `threejs-interaction`
- `threejs-geometry`

---

## Task 13 — Aplicar as partículas no loop real de gameplay

### Objetivo
Integrar os efeitos ao fluxo atual do minigame sem quebrar o funcionamento existente.

### Tarefas
- acionar partículas ao disparar cada arma;
- acionar partículas no impacto do inimigo e na morte do inimigo;
- acionar partículas ao coletar XP;
- acionar partículas ao receber item de upgrade e ao chegar na etapa final;
- lembrar que o relâmpago precisa ter origem no player e impacto no alvo;
- ajustar densidade e duração dos emitters para manter legibilidade e performance.

### Critérios de aceitação
- o jogo continua fluido com vários ataques em curso;
- cada efeito permanece visível tempo suficiente para ser percebido;
- os efeitos ajudam o jogador a entender o que aconteceu sem atrapalhar a leitura do campo de batalha.

### Skills Three.js envolvidas
- `threejs-animation`
- `threejs-lighting`
- `threejs-postprocessing`

---

## Task 14 — Testes e validação visual do sistema de partículas

### Objetivo
Validar que os VFX melhoram a sensação do jogo e não geram regressões.

### Tarefas
- testar em cena com múltiplos inimigos simultâneos;
- validar o tempo de vida dos emitters;
- validar a limpeza dos efeitos após a destruição do alvo;
- validar que o relâmpago ainda aparece na origem e no impacto;
- validar que partículas não ficam “presas” no mapa;
- validar que a UI de upgrade continua legível com partículas da raridade
- medir se o FPS se mantém estável em loops de ação intensa.

### Critérios de aceitação
- o sistema visual não gera vazamentos de memória nem objetos órfãos;
- a performance é adequada para o jogo em browser;
- o feedback visual ficou mais claro sem sobrecarregar a tela.

### Skills Three.js envolvidas
- `threejs-animation`
- `threejs-postprocessing`
- `threejs-fundamentals`

---

## Task 15 — Checklist final de implementação

### Objetivo
Fechar a integração do `three-nebula` com o jogo pronto para validação final.

### Tarefas
- confirmar que todos os ataques usam VFX consistentes;
- confirmar que o relâmpago tem origem + alvo visíveis;
- confirmar que o sistema de raridade ganhou VFX com destaque visual;
- confirmar que o pickup de XP e os itens de progressão têm resposta visual clara;
- confirmar que o `three-nebula` está sendo usado em módulos organizados e reaproveitáveis;
- confirmar que o jogo continua estável em sessões longas de combate;
- confirmar que o HUD e os cards não ficam obscurecidos por partículas excessivas.

### Critérios de aceitação
- o jogo possui feedback visual de qualidade premium;
- o uso do `three-nebula` melhora a identidade do projeto sem prejudicar a performance;
- o sistema de VFX está integrado ao fluxo real do jogo e não como um efeito isolado.

---

## Regras de execução da equipe / implementação

1. Sempre planejar o efeito antes de escrever o emitter.
2. Cada efeito deve ter uma função específica e clara.
3. O `three-nebula` deve complementar a geometria Three.js, não substituí-la por completo.
4. A performance deve ser prioridade em cenas com muitos inimigos.
5. O relâmpago, o vento e o fogo devem ter feedback visual de origem e impacto.
6. A raridade deve ser reconhecível visualmente, não apenas por texto.
7. Sempre que o trabalho envolver partículas, glow, explosão, trail ou VFX de combate, usar o módulo de efeitos do projeto e manter a scene limpa.

---

## Resumo executivo da integração do Three Nebula
O pacote `three-nebula` será usado para elevar a identidade visual do minigame, principalmente nos ataques, pickups e upgrades. O objetivo é transformar o jogo de um feedback visual funcional em um feedback visual marcante, mantendo clareza, performance e consistência com a estética do projeto. A implementação será feita em camadas: sistema de VFX, emitters específicos por tipo de efeito e integração com o loop de gameplay, sempre com foco em origem, impacto, raridade e manutenção da legibilidade do combate.

---

## Task 16 — Checklist final do projeto completo

### Objetivo
Fechar o ciclo de correções e reforçar que o minigame sai com efeito visual restaurado, progressão coerente e VFX aprimorados.

### Tarefas
- confirmar que o relâmpago está visível;
- confirmar que a progressão de armas e status segue o modelo novo / upgrade / final;
- confirmar que os upgrades possuem raridade e identidade;
- confirmar que o Three Nebula está integrado nos efeitos principais;
- confirmar que o HUD e cada item refletem visualmente o estado atual;
- confirmar que o jogo continua com gameplay estável e legível.

### Critérios de aceitação
- o minigame está funcional, visualmente forte e com progressão coerente;
- o player entende a ação do ataque, a raridade do item e o estágio da evolução;
- o projeto fica mais fiel ao conceito de um jogo de sobrevivência de qualidade visual superior.

---

## Regras de execução da equipe / implementação

1. Sempre começar pela modelagem dos dados antes de mexer no gameplay.
2. Respeitar a regra do item novo como estado base.
3. Aplicar melhorias somente após o primeiro pickup visível.
4. Usar raridade e visual como feedback de valor, não só texto.
5. Nunca aplicar upgrade de forma genérica sem item/slot/estado correspondente.
6. Sempre que o trabalho envolver efeito visual, glow, mesh, efeito de choque, partículas ou interação 3D, usar a skill Three.js correspondente do repositório.

---

## Resumo executivo
A correção principal aqui é a mudança de postura do sistema de progressão:
- o jogador não recebe uma arma “bufada” ao pegá-la pela primeira vez;
- ele recebe um item base e novo;
- depois disso, o item melhora em etapas e raridades até entrar na forma final;
- a progressão tem 10 passos de upgrade e termina em "Final";
- raridade e estado ficam explicitados em texto e visual para o jogador entender o poder do item.

Esse modelo mantém a sensação de Vampire Survivors, mas com identidade mais clara, menos injustiça e melhor legibilidade para o jogador.
1. Sempre começar pela modelagem dos dados antes de mexer no gameplay.
2. Respeitar a regra do item novo como estado base.
3. Aplicar melhorias somente após o primeiro pickup visível.
4. Usar raridade e visual como feedback de valor, não só texto.
5. Nunca aplicar upgrade de forma genérica sem item/slot/estado correspondente.
6. Sempre que o trabalho envolver efeito visual, glow, mesh, efeito de choque, partículas ou interação 3D, usar a skill Three.js correspondente do repositório.

---

## Resumo executivo
A correção principal aqui é a mudança de postura do sistema de progressão:
- o jogador não recebe uma arma “bufada” ao pegá-la pela primeira vez;
- ele recebe um item base e novo;
- depois disso, o item melhora em etapas e raridades até entrar na forma final;
- a progressão tem 10 passos de upgrade e termina em "Final";
- raridade e estado ficam explicitados em texto e visual para o jogador entender o poder do item.

Esse modelo mantém a sensação de Vampire Survivors, mas com identidade mais clara, menos injustiça e melhor legibilidade para o jogador.
