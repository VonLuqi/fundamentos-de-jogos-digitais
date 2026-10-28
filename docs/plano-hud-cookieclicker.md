# HUD no jeito do Cookie Clicker

Referência visual: a tela clássica em três colunas (biscoito | mundo vazio com listras | loja). O tema continua o Submundo. O que se copia é a hierarquia, o vazio e a densidade da loja, não a cor azul nem a madeira.

Estado de hoje: as três colunas já existem (`pages/despertar.html`: Acheron, Domínio, Mercado). A leitura ainda é de painel de app: foice cercada de números e botões, prateleiras em cards, loja com cards grandes. No Cookie Clicker o número e o clique dominam a esquerda, o centro é um campo contínuo, e a direita é uma lista curta.

---

## O que muda no layout

### Esquerda — a Foice no lugar do biscoito

O Cookie Clicker mostra, de cima para baixo: nome pequeno, número enorme, “por segundo” colado nele, e o biscoito no centro do espaço que sobra, com um clarão atrás. Não há segunda tabela de stats nem botão de modo de jogo nessa coluna.

No Despertar:

- O número de almas e o “por segundo” ficam no topo, na mesma escala relativa (o número é o maior texto da tela).
- A Foice fica centrada no resto da coluna, sem o rótulo “Ceifar” permanente. O nome do altar fica pequeno, como o nome da confeitaria.
- O clarão atrás do clique é um halo (CSS), não outra ilustração.
- Almas/clique, bônus, dica e o botão do Juízo saem desta coluna. Almas/clique e bônus vão para Stats. O Juízo fica num canto ou na Bancada, fora da face do altar.
- A órbita das sombras continua em volta da Foice. Ela é o equivalente das partículas do biscoito, não um segundo painel.

### Centro — um campo, não uma pilha de cards

No Cookie Clicker a ordem é: abas (Opções, Estatísticas, Informações), uma linha de notícia, e o resto da coluna é o fundo listrado. Os prédios são faixas nesse fundo. No começo o centro fica quase vazio.

No Despertar:

- As abas passam para o topo da coluna, e o letreiro fica numa faixa fina logo abaixo. Hoje o letreiro vem antes das abas.
- O painel Mundo perde o parágrafo de instrução como bloco. O campo vazio já comunica isso.
- Cada habitat deixa de ser um card com borda dourada. Vira uma faixa de ponta a ponta: rótulo discreto, chão em tile, personagens por cima. O fundo da coluna, nas áreas sem faixa, é uma cortina única.
- A faixa só entra quando o primeiro daquele produtor é contratado. A Sombra Vagante segue só na órbita.

### Direita — loja densa, com a prévia dos próximos

No Cookie Clicker o título “Loja” é pequeno. Na mesma linha: Comprar/Vender à esquerda e 1 / 10 / 100 como botões quadrados à direita. Os juramentos (upgrades) entram numa grade de ícones entre esses controles e a lista. Cada produto é uma linha baixa: ícone, nome, preço embaixo do nome, quantidade à direita.

A regra de aparição que a referência usa:

- Liberado: ícone colorido, nome, preço, quantidade.
- Os próximos dois ainda fechados: a mesma linha, ícone em silhueta escura, nome `???`, preço visível.
- O resto do catálogo não aparece.

No Mercado: liberados mostram nome/ícone; os dois seguintes aparecem como `???` com silhueta; o resto some. Hover (também nos desabilitados) abre tip Cookie — comprado: frase + SPS unitário/linha/lifetime; qty 0: só frase; `???`: mistério.

Os juramentos continuam ocultos até o requisito daquele upgrade e a abertura do Estige. Comprado, sai da grade e vai para Juramentos selados, em Stats.

### Moldura

As três colunas ficam dentro de uma moldura 9-slice (`hud_moldura`: obsidiana + filete ouro), com trilhos verticais entre altar, mundo e loja e trilhos horizontais sob as abas e o título do Mercado — o mesmo peso da madeira do Cookie Clicker, no tema do Submundo.

---

## Arte

### Já serve neste layout

Não refazer.

| Peça | Onde está | Uso na HUD |
| --- | --- | --- |
| Ícones da loja T1–T20 | `sprites/generators/*.webp` | Linha do produto. Pintados, ~128². |
| Personagens dos habitats | `sprites/habitats/*.webp` | Faixa do mundo. Pixel. A Sombra é o cursor da órbita (16×20). |
| Variações de corpo | `sprites/habitats/variants/*.webp` | Troca o personagem inteiro (chapéu, esteira, corrente, três olhos, balança, fiapo). |
| Chão das faixas | `sprites/habitats/backgrounds/*.webp` | Tile 64². Servos de Caronte = água do Estige. |
| Ícones de juramento, véu, néctar, estações, dragão, catábase | `sprites/upgrades/`, `veil/`, `minigames/`, `seasons/`, `catabase/`, `shimmers/` | Grade da loja e telas internas. Vários lotes ainda estão `open` em `art-requests.json` porque a arte de produção não fechou, mesmo com WebP no disco. |

### Arte nova, só da HUD

| ID | Peça | Tamanho | Notas |
| --- | --- | --- | --- |
| `hud_foice_idle` | Foice em repouso | 512², WebP RGBA | `sprites/foice/foice-idle.webp`. No altar, no lugar do `Foice.png`. |
| `hud_foice_pressed` | Foice no clique | 512², WebP RGBA | Arquivo existe, o altar não usa. O clique mantém a mesma foice. |
| `hud_cortina` | Fundo da HUD | 128×512 | `sprites/hud/cortina.webp` no campo do jogo. A loja fica por cima, como painel. |
| `hud_moldura` | Cantos e aresta da coluna | 48², fatia 16px | `moldura.webp` no contorno; trilhos `moldura-rail-v` (16×1) e `moldura-rail-h` (1×16). |
| `hud_bulk` | Controles da loja | cursores 16² + texto | Comprar/Vender são os cursores. 1, 10, 100 e Máx são texto. A linha do gerador é o botão de compra. |

Não desenhar de novo: silhueta trancada da loja, chão por habitat, ícone de loja, personagem de prateleira.

### Lotes de jogo ainda abertos

Continuam em `assets/despertar/art-requests.json`. Não fazem parte da moldura, mas a grade de juramentos da loja fica vazia de ícone final enquanto estiverem abertos.

| Pedido | O que é |
| --- | --- |
| `art_upgrades` | 112 ícones F1 (T1–T6, foice, mil foices, sinergias). |
| `art_f3_upgrades` | 98 ícones T7–T12. |
| `art_f7_upgrades_late` | Tiers, sinergias e servos T13–T20. |
| `art_f4_veil_kittens` | 5 véus e 7 filhotes. |
| `art_f5_minigames` | Néctar e 4 minigames. |
| `art_f6_catabase_wrinklers` | Sanguessugas, estágios da Catábase, juramentos. |
| `art_shimmers` | Ecos dourado e colérico. |
| `art_cosmetics` | Overlays de foice e acessórios que ainda não viraram sprite de corpo. |
| `art_f8_seasons_dragon_fortunes` | Dragão, auras, estações, fortunas. |
| `art_juizo_chrome` / `art_juizo_covers` | Moldura e capas do Juízo. Ficam fora da HUD principal. |

---

## Ordem sugerida

1. Cortina do Domínio e hierarquia da coluna esquerda (número, foice, halo). Sem arte além da cortina e, se couber, a foice.
2. Faixas sem card e abas acima do letreiro.
3. Linha da loja (controles + produto baixo) e a prévia dos dois próximos como silhueta do ícone que já existe.
4. Foice no altar. Feito: só `foice-idle.webp`, sem troca no clique e sem `mix-blend-mode: screen`.
5. Ícones de juramento dos lotes `open`, na ordem F1 → F3 → F7, porque são os que ocupam a grade da loja.
