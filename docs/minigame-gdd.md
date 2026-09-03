# Game Design Document – Arcane Survivors

## 1. Visão geral
Arcane Survivors é um minigame top-down de sobrevivência inspirado em Vampire Survivors, pensado para ser jogado em poucos minutos e integrado ao ecossistema educacional da plataforma. O jogador escolhe um personagem, sobrevive a hordas de inimigos, coleta XP, desbloqueia armas e melhora atributos em tempo real, até morrer ou alcançar a condição de vitória.

O objetivo principal é manter a jogabilidade simples, rápida e compulsiva, com um loop de progressão forte: sobreviver, evoluir o personagem, desbloquear poder e manter o senso de progresso contínuo.

### Premissa do jogo
A arena é um espaço circular ou retangular com uma visão de cima. O herói se move livremente, dispara automaticamente e toma decisões sobre quais upgrades priorizar. Cada run equivale a uma “sessão” de sobrevivência, e a experiência acumulada na run pode ser convertida em XP real do perfil do aluno.

---

## 2. Objetivo principal
- Sobreviver o maior tempo possível.
- Derrotar inimigos para gerar XP e gemas.
- Escolher upgrades estratégicos para aumentar dano, velocidade, área e resistência.
- Acumular XP da run para repassar ao perfil do usuário.
- Fazer o jogador sentir a progressão dos seus personagens e a sensação de “mais poder” em cada partida.

---

## 3. Core loop
O fluxo base do jogo segue a fórmula clássica de Vampire Survivors:

1. O jogador inicia a partida.
2. Escolhe um dos 3 personagens jogáveis.
3. A partida começa com um personagem inicial e uma arma base.
4. Inimigos entram em ondas e avançam em direção ao player.
5. O player se move com WASD e dispara automaticamente.
6. Inimigos derrotados deixam gemas de XP.
7. O player coleta XP e sobe de nível.
8. Ao subir de nível, abre-se uma janela de upgrades aleatórios.
9. O jogador escolhe melhorias entre armas e status.
10. O ciclo repete até a morte ou a condição de vitória.
11. Ao fim da run, a XP total é enviada ao backend e registrada no perfil.

---

## 4. Estilo de jogo
### 4.1. Identidade visual
- Tema sombrio e místico.
- Paleta em roxo, dourado, cinza etéreo e azul neón.
- Ambiente detalhado de baixa complexidade, com pouca clutter visual.
- Personagens com silhueta clara e contraste forte.
- Efeitos de partículas e luz para deixar a arena viva sem exagerar.

### 4.2. Sensação de jogo
- Jogo de sobrevivência arcade, com ritmo constante.
- Recompensa imediata por coleta e eliminacão.
- Decisões rápidas em cada nível.
- Poder crescente em progressão linear, mas com variação por escolhas.

---

## 5. Personagens jogáveis
O jogo terá 3 personagens jogáveis, cada um com uma identidade distinta e uma arma inicial diferente.

### 5.1. Soulblade
- Estilo: rápido, agressivo e técnico.
- Arma inicial: Lâmina Arcana.
- Estatísticas base:
  - velocidade: alta
  - dano: médio
  - vida: média
  - ataque: ataque em área curta, rápido e constante
- Objetivo de playstyle: pressionar o combate sem quebrar o posicionamento.

### 5.2. Graveguard
- Estilo: robusto, lento e pesado.
- Arma inicial: Lança de Ossos.
- Estatísticas base:
  - velocidade: média-baixa
  - dano: alto
  - vida: alta
  - ataque: projéteis mais fortes, com melhor impacto
- Objetivo de playstyle: resistir mais e dominar o centro da arena.

### 5.3. Warden of Echoes
- Estilo: equilibrado, controlável e versátil.
- Arma inicial: Orbe de Fogo.
- Estatísticas base:
  - velocidade: média
  - dano: médio-alto
  - vida: média-alta
  - ataque: projéteis com boa área e boa consistência
- Objetivo de playstyle: construir combos de dano e manter pressão constante.

### 5.4. Regras de personagens
- Cada personagem começa com uma arma única.
- Cada personagem pode evoluir para qualquer outra arma por meio de power-ups.
- A identidade de cada personagem define o estilo inicial, não limita o conjunto final de builds.

---

## 6. Sistema de armas e slots
O sistema de armas segue o padrão de Vampire Survivors, porém adaptado ao contexto da plataforma:

- O jogador possui 5 espaços de arma.
- Cada espaço pode receber uma arma ativa.
- A arma inicial conta como o primeiro slot ocupado.
- Cada arma pode evoluir por múltiplos power-ups da categoria de arma.
- O jogador pode acumular até 5 armas simultâneas.
- Armas podem se complementar, mas não devem gerar um efeito impossível de controlar.

### 6.1. Armas base disponíveis
1. Lâmina Arcana
2. Lança de Ossos
3. Orbe de Fogo
4. Vento Cortante
5. Relâmpago Sagrado

Essas armas funcionam como famílias principais; cada uma pode receber melhorias e evoluções diferentes.

### 6.2. Slots de arma
- Slot de arma 1: arma base principal
- Slot de arma 2: arma secundária de apoio
- Slot de arma 3: armamenta de área
- Slot de arma 4: arma especial de dano
- Slot de arma 5: arma final de reforço

O sistema permite compor até 5 armas ao mesmo tempo. Em cada run, o jogador pode acumular e combinar armas conforme a ordem dos power-ups.

---

## 7. Sistema de upgrades de status
Além das armas, o jogador também possui 5 slots de upgrade de status.

Esses slots representam melhorias permanentes para a build durante a run, e não substituem as armas. Eles melhoram diretamente a sobrevivência e a eficácia do personagem.

### 7.1. Status disponíveis
- velocidade de movimento
- dano por golpe
- taxa de ataque
- vida máxima
- coleta de itens / raio de pickup
- resistência / redução de dano
- critério de chance de crítico
- velocidade de projéteis
- área de ataque
- regeneração de vida

### 7.2. Regras dos status
- O jogador pode ter até 5 upgrades de status ativos ao mesmo tempo.
- Cada upgrade de status pode ter múltiplos níveis dentro do slot.
- O efeito deve ser cumulativo e legível no HUD.
- O sistema favorece builds distintas, sem transformar o jogo em um “tudo igual”.

---

## 8. Power-ups (40 no total)
O jogo possui 40 power-ups no total, divididos em duas grandes categorias:

- 20 power-ups de arma
- 20 power-ups de status

### 8.1. Power-ups de arma (20)
Esses power-ups melhoram diretamente a arma escolhida e ajudam a compor a build.

| ID | Nome | Tipo | Efeito |
|---|---|---|---|
| WA1 | Lâmina Arcana +1 | Arma | +10% de dano da arma base |
| WA2 | Lâmina Arcana +2 | Arma | +15% de velocidade de ataque |
| WA3 | Lâmina Arcana +3 | Arma | +20% de área de corte |
| WA4 | Lâmina Arcana Final | Arma | Converte em corte em espiral |
| WB1 | Lança de Ossos +1 | Arma | +12% de dano por projétil |
| WB2 | Lança de Ossos +2 | Arma | +20% de velocidade de projétil |
| WB3 | Lança de Ossos +3 | Arma | +1 projétil por disparo |
| WB4 | Lança de Ossos Final | Arma | Projéteis perfuram e causam dano em cadeia |
| WC1 | Orbe de Fogo +1 | Arma | +15% de dano por explosão |
| WC2 | Orbe de Fogo +2 | Arma | +10% de área de explosão |
| WC3 | Orbe de Fogo +3 | Arma | +1 ricochete por orbe |
| WC4 | Orbe de Fogo Final | Arma | Gera efeito de fogo em área contínua |
| WD1 | Vento Cortante +1 | Arma | +12% de velocidade de movimento quando atacar |
| WD2 | Vento Cortante +2 | Arma | +20% de dano crítico |
| WD3 | Vento Cortante +3 | Arma | +1 golpe adicional por ciclo |
| WD4 | Vento Cortante Final | Arma | Cria tempestade de lâminas ao redor do player |
| WE1 | Relâmpago Sagrado +1 | Arma | +10% de dano elétrico |
| WE2 | Relâmpago Sagrado +2 | Arma | +15% de alcance |
| WE3 | Relâmpago Sagrado +3 | Arma | +1 alvo adicional por descarga |
| WE4 | Relâmpago Sagrado Final | Arma | Cria cadeia de raios entre inimigos |
| WA5 | Arsenal Arcano | Arma | Aumenta o número de armas ativas em 1 |

### 8.2. Power-ups de status (20)
Esses power-ups reforçam o desempenho geral do personagem e aumentam sua estabilidade na sobrevivência.

| ID | Nome | Tipo | Efeito |
|---|---|---|---|
| SA1 | Passos de Véu | Status | +5% de velocidade de movimento |
| SA2 | Passos Mágicos | Status | +10% de velocidade de movimento |
| SA3 | Veloz do Submundo | Status | +15% de velocidade de movimento |
| SB1 | Força da Alma | Status | +8% de dano |
| SB2 | Coragem do Tártaro | Status | +12% de dano |
| SB3 | Ignis Interno | Status | +18% de dano |
| SC1 | Mão do Arcanista | Status | +10% de taxa de ataque |
| SC2 | Ritmo da Batalha | Status | +15% de taxa de ataque |
| SC3 | Cadência Infernal | Status | +20% de taxa de ataque |
| SD1 | Carapaça de Cobre | Status | +10% de vida máxima |
| SD2 | Pele de Pedra | Status | +15% de vida máxima |
| SD3 | Manto de Ferro | Status | +20% de vida máxima |
| SE1 | Sucção de Vidas | Status | +5% de regeneração de vida |
| SE2 | Sangue de Estige | Status | +10% de regeneração de vida |
| SE3 | Vínculo de Sombra | Status | +15% de regeneração de vida |
| SF1 | Magnetismo Arcano | Status | +15% de raio de coleta |
| SF2 | Campo de Prata | Status | +25% de raio de coleta |
| SF3 | Atrator de Essência | Status | +35% de raio de coleta |
| SG1 | Resiliência do Guardião | Status | -10% de dano recebido |
| SG2 | Escudo Etéreo | Status | -15% de dano recebido |

### 8.3. Regra de aquisição
- Ao alcancar nível, o jogador recebe 3 upgrades aleatórios entre os 40 power-ups.
- Cada run usa uma pool de upgrades aleatórios para evitar repetição predeterminada.
- O jogador pode repetir upgrades com efeito cumulativo, representando crescimento contínuo da build.
- A ordem dos power-ups escolhe a direção da build.

---

## 9. Progressão de nível
A progressão segue o formato clássico de sobrevivência: quanto mais tempo o jogador sobrevive, mais XP ganha.

### 9.1. Sistema de XP
- Inimigos derrotados concedem XP.
- Gemas coletadas concedem XP adicional.
- Base de XP crescente por nível.
- O nível é ganho quando o total de XP acumulado atinge o limite do nível atual.

### 9.2. Regras de level-up
- Cada level-up pausa a ação por um curto tempo e abre a janela de upgrades.
- A janela oferece 3 escolhas aleatórias.
- O jogador pode selecionar um, nenhum ou todos, desde que exista opção disponível.
- O melhor build é aquela que combina armas, controle e sustento.

### 9.3. Condição de vitória
A vitória ocorre exclusivamente por sobrevivência.

- O jogador deve sobreviver por 20 minutos ininterruptos.
- A dificuldade aumenta progressivamente com o tempo.
- A taxa de spawn, a velocidade e o dano dos inimigos sobem conforme a partida avança.
- O jogo não termina por XP alvo; ele termina por resistência e adaptação.

Essa regra mantém o loop mais parecido com Vampire Survivors e reforça a ideia de "survive until the timer hits 20 minutes".

### 9.4. Curva de dificuldade
- 0–5 min: fase inicial, spawn leve, inimigos lentos e poucos.
- 5–10 min: aumento moderado, inimigos mais rápidos e mais numerosos.
- 10–15 min: pressão maior, mais inimigos simultâneos.
- 15–20 min: fase final, dificuldade extrema, massa de inimigos e dano mais alto.

A curva deve ser contínua e suave, para que o jogador sinta a escalada sem quebrar a leitura do jogo.

---

## 10. Sistema de combate
### 10.1. Controles
- WASD ou setas: movimento
- mouse ou direção automática do ataque: foco do disparo
- auto-ataque sempre ativo
- movimentação top-down em visão de cima

### 10.2. Inimigos
- Os inimigos surgem em ondas.
- O número e a velocidade aumentam conforme o tempo.
- Alguns inimigos possuem valor de dano maior, outros mais mobilidade.
- O jogador tem uma vida e pode sofrer dano por contato com o inimigo ou por efeitos de área.

### 10.3. Mecanismo de dano
- O impacto dos inimigos reduz a vida do jogador.
- Dano de projéteis e dano por contato são somados ao hp do player.
- O jogador perde ao zerar a vida.
- A run termina em derrota.

### 10.4. O que o jogador precisa fazer
- manter distância quando a onda aperta;
- formar caminhos de coleta e movimentação constante;
- priorizar upgrades com sinergia de build;
- controlar o espaço da arena para não se encurralar.

---

## 11. Arena e ambiente
A arena é um espaço amplo, com pouca física e muita legibilidade.

### 11.1. Layout
- arena principal em plano top-down
- limites de mapa bem definidos
- pouco texto e poucos elementos visuais distraindo o foco
- inimigos surgem fora do centro para aumentar pressão

### 11.2. Ambientes dinâmicos
O ambiente pode variar de acordo com a fase, mas o funcionamento do combat loop permanece igual. A identidade visual do jogo é coberta por camadas visuais discretas, substância e poucos detalhes desnecessários.

---

## 12. Recompensa e integração com a plataforma
Ao final da run, o jogo registra o valor de XP ganho e envia para o perfil do usuário.

### 12.1. Regras de XP real
- O XP da run é somado ao XP geral do usuário no backend.
- O sistema usa o token da sessão atual para validar o usuário.
- O valor pode ser convertido em progressão de nível da plataforma.
- A mecânica reforça a ligação entre o jogo e a jornada de aprendizagem.

### 12.2. Objetivo pedagógico
- O aluno aprende sobre survival game loop.
- Entende o valor do equilíbrio entre escala, tempo e dano.
- Observa que escolhas de build alteram diretamente o desempenho.
- Conecta a ação de jogo com progressão do curso.

---

## 13. Arquitetura técnica sugerida
```text
js/
├─ minigame/
│  ├─ main.js
│  ├─ engine/
│  │  ├─ GameEngine.js
│  │  ├─ InputHandler.js
│  │  └─ StateManager.js
│  ├─ entities/
│  │  ├─ Player.js
│  │  ├─ Enemy.js
│  │  ├─ Projectile.js
│  │  └─ Pickup.js
│  ├─ systems/
│  │  ├─ RenderSystem.js
│  │  ├─ PhysicsSystem.js
│  │  └─ UISystem.js
│  └─ data/
│     └─ powerups.js
├─ api.js
└─ dashboard.js
```

### 13.1. Principais módulos
- `GameEngine`: loop principal e lógica da partida
- `InputHandler`: captura de teclas e direção
- `RenderSystem`: câmera, luzes e cena Three.js
- `UISystem`: HUD de vida, XP, level e power-ups
- `powerups.js`: arquivo central com os 40 power-ups
- `api.js`: integração com /api/progress para salvar XP

---

## 14. Diretrizes de design
### 14.1. O que o jogo deve ser
- curto
- legível
- rápido
- satisfatório
- reforçador da sensação de crescimento

### 14.2. O que o jogo não deve ser
- não deve exigir micro-gerenciamento pesado
- não deve focar em complexidade visual
- não deve monopolizar o tempo do aluno fora do contexto da aula
- não deve reforçar uma apresentação confusa ou piscante

---

## 15. Resumo executivo
Arcane Survivors é um minigame de sobrevivência de alta tensão, rápido de aprender e fácil de repetir, com foco em progressão por escolhas de build. Ele conta com 3 personagens jogáveis, cada um com uma arma inicial distinta; 40 power-ups no total; 5 slots de arma e 5 slots de status; e um loop de luta que combina sobrevivência, coleta, dano e evolução.

A proposta atende ao estilo de Vampire Survivors, mantendo a simplicidade de um loop de ação sem entrar em excesso de complexidade. Para a plataforma educacional, o sistema funciona como uma ferramenta de retenção, recompensa e senso de progresso, conectando o gameplay com a evolução real do usuário.

---

## 16. Próximos passos
1. Validar a lista final de 40 power-ups com a equipe de design.
2. Definir as 3 armas base e suas sinergias.
3. Implementar os 5 slots de arma e 5 slots de status no sistema de upgrade.
4. Construir a lógica de level-up e a janela de power-ups.
5. Integrar a coleta de XP da run com o backend de progresso.

*Documento reescrito e alinhado ao estilo de Vampire Survivors.*