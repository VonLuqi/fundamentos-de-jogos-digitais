# Plano de correção do minigame

## Objetivo
Corrigir os problemas reportados no gameplay e no HUD sem mexer de forma improvisada no restante do projeto.

## Problemas a corrigir

1. O personagem fica travado após upar de nível.
2. Os status devem funcionar como upgrades de status no estilo Vampire Survivors, com 5 slots, assim como as armas.
3. As armas devem aparecer no canto esquerdo e os itens de status no canto inferior direito, seguindo o padrão visual do Hades.

---

## 1) Travamento ao upar de nível

### Causa provável
O jogo entra no estado de pausa para abrir o menu de upgrade, mas a engine pode não estar restaurando corretamente o estado de execução após a escolha, deixando o loop em estado inconsistente.

### Diagnóstico a fazer
- revisar o fluxo de `state` em `GameEngine`
- validar o comportamento de `triggerLevelUp()` e `chooseUpgrade()`
- confirmar se `this.running` e `this.state` são restaurados ao voltar a partida
- verificar se o overlay de upgrade continua bloqueando a atualização mesmo depois da escolha

### Correção planejada
- separar claramente os estados:
  - `playing`
  - `paused-upgrade`
  - `victory`
  - `defeat`
- ao selecionar uma opção:
  - esconder o overlay
  - restaurar `state = "playing"`
  - reinicializar `this.lastTime`
  - reativar o loop
- garantir que o level-up não dispara mais de uma vez por frame

### Arquivos envolvidos
- `js/minigame/engine/GameEngine.js`

---

## 2) Sistema de status com 5 slots

### Requisito
Os upgrades de status devem funcionar como itens cumulativos de status, e não como status genéricos aleatórios sem slot definido.

### Modelo desejado
Cada item de status deve possuir:
- tipo do status
- nome do item
- nível acumulado
- efeito percentual ou multiplicativo
- slot associado

Os tipos esperados incluem:
- velocidade
- dano
- cooldown / ataque
- vida máxima
- alcance de coleta
- resistência
- regeneração
- velocidade de projétil

### Regra de slots
- 5 slots de status
- cada slot representa uma categoria principal
- se o item for do tipo já existente, ele aumenta o nível daquele tipo
- se o tipo for novo, ele ocupa um slot livre
- caso os 5 slots preencham, o próximo item do mesmo tipo continua aumentando o nível daquele slot

### Implementação planejada
- ajustar `StatusSystem.js` para modelar status como upgrades empilháveis
- remover a lógica atual que trata status mais como estado genérico do que um sistema de itens de build
- manter a lógica de aplicação cumulativa ao jogador
- expor facilmente o nome, o nível e o efeito para HUD

### Arquivos envolvidos
- `js/minigame/systems/StatusSystem.js`
- `js/minigame/systems/PowerupSystem.js`
- `js/minigame/engine/GameEngine.js`

---

## 3) Layout visual do HUD

### Requisito
A organização visual deve seguir o estilo de Hades / Vampire Survivors:
- armas no canto esquerdo
- status no canto inferior direito
- vida e nível no canto esquerdo mais próximo da área principal

### Estrutura sugerida

#### Lado esquerdo
- painel de vida
- nível do jogador
- barra de HP
- barra de XP
- mini stats rápidas
- lista de armas ativas

#### Canto inferior direito
- bloco de upgrades de status
- itens em fila ou grid compacto
- cada status com nome e nível

### Ajustes visuais previstos
- manter contraste alto e bordas douradas para comunicar o estilo do jogo
- reduzir ruído visual para não atrapalhar a arena
- usar chips ou mini cards para armas e status

### Arquivos envolvidos
- `pages/minigame.html`
- `js/minigame/engine/GameEngine.js`

---

## 4) Ordem de execução

1. Corrigir o travamento no level-up
2. Redefinir o sistema de status em slots
3. Ajustar a HUD para a nova organização visual
4. Validar sintaxe do JavaScript
5. Testar no navegador

---

## 5) Critérios de aceite

- ao upar de nível, o jogo não trava e continua normalmente
- o jogador pode acumular status em 5 slots visíveis
- itens de status aumentam o valor do tipo correspondente
- armas aparecem no canto esquerdo
- upgrades de status aparecem no canto inferior direito
- HUD continua legível e sem interferir na arena

---

## 6) Observação importante
A correção deve seguir uma ordem disciplinada: primeiro a lógica de travamento, depois o sistema de status, depois o HUD visual. Isso evita que a interface esconda o problema real de estado do jogo.
