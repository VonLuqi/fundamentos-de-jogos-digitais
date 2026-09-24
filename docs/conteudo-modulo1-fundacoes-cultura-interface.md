# Módulo 1 — Fundações, Cultura e Interface

**Curso:** Fundamentos de Jogos Digitais  
**Aulas:** 01 a 05 · ~10h  
**Papel do módulo:** porta de entrada do curso — jogo como sistema de regras, Círculo Mágico, leitura da engine, glossário operacional, identidade cultural, restrição de hardware e classificação indicativa.

Este arquivo reúne o **conteúdo pedagógico** das cinco primeiras aulas (fundamentos + oficina resumida), alinhado às páginas `pages/aula1.html` … `aula5.html` e aos planos de implementação em `docs/plano-aula*.md`.

---

## Visão do módulo


| Aula | Título | Tópico da ementa | Prática |
| :---: | --- | --- | --- |
| **01** | O Círculo Mágico e a Interface Amigável da Engine | Conceitos de jogos | Godot 4 · Inspector (bola física) |
| **02** | O Glossário do Desenvolvedor e o Player na Tela | Termos específicos da área | Godot 4 · cena do Player + Input Map |
| **03** | Homo Ludens, Identidade e Expressão Cultural | O jogo como elemento da cultura | Godot 4 · pixel art + Nearest |
| **04** | A Linha do Tempo das Plataformas e as Restrições Técnicas | Histórico dos jogos e hardware | Godot 4 · viewport retrô + stretch |
| **05** | ClassInd, IARC e Design Saudável | Sistemas de classificação indicativa | Sem Godot · ClassInd-dle + higienização |

**Contrato de experiência (Aulas 01–05):** abas *I. Fundamentos · II. Oficina · III. Slides*; envio server-authoritative; XP via Altar; 1 conquista pública + secretas por aula.

### Avaliação do módulo — Provação do Círculo Mágico

Após as cinco aulas, a avaliação formal é a **Provação do Círculo Mágico** (20 pontos · 90 min · online).

| Papel | Onde |
| --- | --- |
| **Aluno** | **Aulas** → Módulo 1 → **Provação do Círculo Mágico** → [`pages/prova.html`](../pages/prova.html) |
| **Mestre (gate + correção)** | Ferramentas do Mestre / [`pages/prova-admin.html`](../pages/prova-admin.html) |
| **Enunciados + gabarito (doc)** | [`avaliacao-modulo1-provacao-circulo-magico.md`](./avaliacao-modulo1-provacao-circulo-magico.md) |
| **Liberar no dia** | [`playbook-liberar-prova-modulo1.md`](./playbook-liberar-prova-modulo1.md) |
| **Plano técnico** | [`plano-prova-modulo1-online.md`](./plano-prova-modulo1-online.md) |

Regras da v1: prova nasce **fechada**; o Mestre libera **uma turma por vez**; cada aluno faz **uma vez**.

---

## Aula 01 — O Círculo Mágico e a Interface Amigável da Engine

### Objetivo

Mostrar que um jogo cria um espaço com regras próprias e que a engine é o laboratório onde essas regras se observam, alteram e testam — **sem exigir código**.

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **Círculo Mágico** | O jogo delimita um mundo temporário onde regras específicas passam a valer (Huizinga). |
| **Interface da engine** | Scene, FileSystem, Inspector e Viewport 2D tornam a regra visível e editável. |
| **Regra emergente** | Alterar massa, gravidade, fricção ou elasticidade muda o comportamento do sistema. |

### Fundamento teórico

Um jogo não é só um conjunto de ações: cria um espaço temporário com regras próprias. Nesta aula o aluno entende o jogo como **sistema** antes de abrir qualquer script.

Ao apertar **Play**, o jogador entra em um contrato de regras temporário. O cotidiano fica do lado de fora; o sistema organiza o que pode acontecer dentro da experiência.

> “Dentro do círculo mágico, as leis e costumes da vida ordinária não contam.”

**Foco:** ler o editor da Godot 4 como laboratório de regras — observar, comparar e explicar o que mudou no comportamento da bola.

O aluno deve:

- Entender jogo como sistema de regras.
- Reconhecer a Godot 4 como interface de experimentação.
- Identificar como variáveis físicas viram comportamento jogável.

### Oficina (resumo)

Painéis: **Scene** (hierarquia), **FileSystem** (recursos), **Inspector + Viewport 2D** (propriedades e visualização).

Passos: cena com `RigidBody2D` + `StaticBody2D` → alterar **uma** propriedade por vez no Inspector → Play → registrar efeito. Sem código nesta etapa.

Variáveis típicas: Força de Movimento, Impulso de Pulo, Massa, Gravidade da Cena, Fricção, Elasticidade.

**Artefato:** anotações dos testes + síntese (“Neste mundo, a bola…”).

**Material:** `assets/docs/aulas/aula01-pratica/` · slides da aula 01.

---

## Aula 02 — O Glossário do Desenvolvedor e o Player na Tela

### Objetivo

Conectar o glossário operacional (**Core Loop**, **Grokking**, **Assets**) à primeira montagem de um **Jogador** na Godot 4: nós, sprite, colisão, Input Map e `move_and_slide` mínimo.

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **Core Loop** | Ciclo básico que o jogador repete (ex.: andar → coletar → avançar). |
| **Grokking** | Controles saem da cabeça e entram na memória muscular — o jogador para de “pensar as teclas”. |
| **Assets** | Imagens, sons e recursos; na Godot vivem no FileSystem e são referenciados por nós. |

### Fundamento teórico

Depois de ler a engine como laboratório de regras, o próximo passo é falar a língua do ofício. Sem nomes compartilhados, o time discute “a parte que o personagem anda” em vez de “o Core Loop”. Glossário bom encurta conversa e deixa a prática consciente.

> Glossário nomeia o ofício; a cena do Player é o primeiro lugar onde esses termos viram estrutura.

**Foco:** montar do zero a primeira cena do Jogador — hierarquia, Input Map e script mínimo — sem câmera follow nem polish avançado.

O aluno deve:

- Definir Core Loop, Grokking e Assets de forma operacional.
- Entender cenas e nós como “receita de bolo” reutilizável.
- Estruturar o Player e mapear as ações `ir_*` até o movimento na tela.

### Oficina (resumo)

Na Godot, **tudo é um nó**. Uma **cena** (`.tscn`) é a receita reutilizável.

1. Cena raiz `CharacterBody2D` (`Player`) → filhos `Sprite2D` + `CollisionShape2D`.
2. **Project → Input Map:** `ir_cima`, `ir_baixo`, `ir_esquerda`, `ir_direita` (WASD ou setas).
3. Script `player.gd` com leitura das ações + `move_and_slide()` → Play.

**Artefato:** cena do Player andando + síntese amarrando glossário ↔ estrutura.

**Material:** `assets/docs/aulas/aula02-player/` · slides `aula02_glossario_player_slides`.

---

## Aula 03 — Homo Ludens, Identidade e Expressão Cultural

### Objetivo

Conectar a tese de Johan Huizinga — a cultura humana surge e se desenvolve **como jogo** — à prática de expressão cultural na engine: importar pixel art, personalizar o Sprite do Player com recorte brasileiro e filtro **Nearest**.

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **Homo Ludens** | O humano é também “o que joga”: cultura surge no jogo e pelo jogo (rito, linguagem, arte, competição). |
| **Jogo como cultura** | Não é “pausa do sério”: é modo de a sociedade criar significado compartilhado. |
| **Identidade jogável** | Lendas, folclore, fauna e paisagens locais viram elementos interativos — o sprite diz de onde falamos. |

### Fundamento teórico

Se o jogo cria um mundo com regras, **de onde vêm as imagens e as histórias** desse mundo? Em *Homo Ludens* (1938), Huizinga defende que a cultura surge e se desenvolve como jogo. O Círculo Mágico (Aula 01) descreve o recorte com regras; aqui o herói também carrega **identidade** — folclore, fauna ou urbano brasileiro em pixel.

Criadores não “decoram” o jogo com cultura: **traduzem** cultura em sistemas jogáveis (Saci, Curupira, Cuca, sertão, Amazônia… como inspiração, não obrigação).

> A cultura joga — e o sprite é uma das máscaras com que esse jogo se mostra.

**Foco:** importar pixel art, Nearest nítido, personalizar o Player da Aula 02 — sem animação obrigatória.

O aluno deve:

- Explicar *Homo Ludens* de forma operacional.
- Importar imagens e configurar `Sprite2D` com filtro Nearest.
- Vestir o Player com uma máscara cultural (folclore, fauna ou urbano).

### Oficina (resumo)

Continuar o projeto da Aula 02. Pacote Tiny Hero (CraftPix) → pasta `sprites/hero` → Texture no `Sprite2D` → **Filter = Nearest** → personalizar (recolor / acessório / silhueta) com âncora BR → realinhar colisão → Play.

**Artefato:** personagem culturalmente personalizado + síntese Huizinga ↔ sprite.

**Material:** `assets/docs/aulas/aula03-pixel-hero/` · slides `aula03_homo_ludens_slides`.

---

## Aula 04 — A Linha do Tempo das Plataformas e as Restrições Técnicas

### Objetivo

Conectar a **história das plataformas** à prática de **design sob restrição**: emular resolução nativa clássica na Godot 4 (viewport baixo + stretch proporcional nítido).

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **Plataforma** | Hardware (+ contrato com o software): CPU, memória, vídeo, entrada. |
| **Restrição técnica** | Resolução baixa, poucas cores, sprites por scanline, pouca RAM — o designer projeta *dentro* disso. |
| **Criatividade sob limite** | Tiles reutilizados, parallax, paletas compartilhadas, mecânicas que “escondem” o hardware. |

### Fundamento teórico

O herói já está nítido (Nearest) e culturalmente marcado. Em que **“tela imaginária”** ele deveria viver? Um monitor 1080p não era o contrato dos clássicos.

**Linha do tempo operacional** (ordem de grandeza didática):

- **70s — Atari 2600:** ~160×192 · poucos objetos por linha.
- **8-bit mesa — NES:** 256×240 · ~52 cores · 8 sprites/scanline (flicker).
- **8-bit portátil — Game Boy:** 160×144, 4 tons · silhueta > detalhe.
- **16-bit mesa — SNES / Mega Drive:** SNES comum 256×224 · mais camadas, ainda limitado.
- **16-bit portátil — GBA:** 240×160.
- **HD / multiplataforma:** 720p → 4K · o limite vira orçamento de GPU/UI.
- **Estética retrô hoje:** alvos comuns 320×180, 480×270, 640×360 (16:9).

Quando o limite inventa a linguagem: flicker NES, paleta GB, Mode 7 SNES, tiles reutilizados.

> Toda plataforma escreve um contrato invisível: quantos pixels, quantas cores, quanto cabe na memória.

**Foco:** Viewport Width/Height + stretch `viewport` + `keep` + `integer`. Nearest (Aula 03) protege o asset; stretch protege o quadro.

### Oficina (resumo)

Project Settings → Display → Window: escolher `320×180` ou `480×270` → Stretch Mode `viewport`, Aspect `keep`, Scale Mode `integer` → Window Override confortável → Play e redimensionar → confirmar Nearest.

**Artefato:** projeto com contrato de tela clássico + anotações história ↔ settings.

**Material:** `assets/docs/aulas/aula04-retro-viewport/` · slides `aula04_plataformas_restricoes_slides`.

---

## Aula 05 — Classificação Indicativa (ClassInd), IARC e Design Saudável

### Objetivo

Operacionalizar o ClassInd (violência, sexo, drogas + atenuantes/agravantes), entender o IARC nas lojas digitais e praticar **design saudável**: reescrever feedbacks para baixar a faixa sem esvaziar o loop-core. **Sem Godot.**

### Conceitos-chave

| Conceito | Leitura operacional |
| --- | --- |
| **ClassInd** | Sistema brasileiro de classificação indicativa — aviso de conteúdo, não censura de criação. |
| **IARC** | Formulário internacional → selos de idade em várias lojas/regiões (gratuito). |
| **Design saudável** | Feedbacks que preservam a mecânica sem inflar violência, sexo ou drogas sem necessidade. |

### Fundamento teórico

Até aqui: *como* o jogo se sente e se vê. Agora: **para quem** pode ser publicado — e o que no design empurra a faixa para cima ou para baixo.

**Faixas (leitura operacional):**

| Faixa | Leitura |
| :---: | --- |
| **L** | Adequado a todas as idades; violência inexistente ou muito fantasiosa/cômica |
| **10** | Violência leve/fantasiosa; medo leve; linguagem ocasional sem carga sexual |
| **12** | Violência mais presente; temas sexuais insinuados; linguagem mais pesada |
| **14** | Violência mais intensa; sexualidade mais explícita em tom; drogas em menção |
| **16** | Violência forte; sexo/drogas com destaque; horror mais visceral |
| **18** | Gore / sexo explícito / drogas com glamourização ou uso detalhado |

**Três eixos:** Violência · Sexo · Drogas.  
**Atenuantes:** fantasia, não-humano, comicidade, sem sangue.  
**Agravantes:** realismo, gore, cadáveres, nudez, glamourização de substâncias.

Dois jogos podem ter o mesmo loop (atirar, curar) e faixas diferentes — o **feedback** (gosma vs. sangue arterial; bateria mágica vs. droga realista) é o que a classificação lê.

**IARC:** declarar o conteúdo com honestidade; o design deve bater com a declaração.

### Oficina (resumo)

1. **ClassInd-dle** (~40 min): Higher/Lower ao vivo — qual opção exige idade mais alta? Vote e veja o *porque*.
2. **Adequação reversa / IARC de mesa** (~60 min): reescrever pitch 16+/18+ até Livre ou 10+, preservando o loop-core → **Patch Note de Higienização**.

**Artefato:** participação no ClassInd-dle + Patch Note de Higienização + síntese na plataforma.

**Material:** `assets/docs/aulas/aula05-classind/` · [`faixas-classind.md`](../assets/docs/aulas/aula05-classind/faixas-classind.md) · slides `aula05_classind_iarc_slides`.

---

## Progressão e ponte para o Módulo 2+

```
Círculo Mágico + Inspector
        ↓
Glossário + Player andando
        ↓
Homo Ludens + sprite cultural (Nearest)
        ↓
Plataformas + viewport retrô
        ↓
ClassInd / IARC / design saudável
        ↓
Provação do Círculo Mágico (avaliação online)
        ↓
Módulo 2+ (câmera, AnimatedSprite, polish — quando houver ementa)
```

---

## Referências rápidas


| Artefato | Caminho |
| --- | --- |
| Páginas das aulas | `pages/aula1.html` … `pages/aula5.html` |
| **Prova online (aluno)** | `pages/prova.html` · entrada em **Aulas → Módulo 1** |
| **Hub correção (Mestre)** | `pages/prova-admin.html` |
| Catálogo do módulo | `js/api.js` → `MODULES` (`modulo1`) |
| Planos de implementação | `docs/plano-aula1-modulo1.md` … `docs/plano-aula5-classind-iarc.md` |
| Plano da prova | `docs/plano-prova-modulo1-online.md` |
| Playbook liberar prova | `docs/playbook-liberar-prova-modulo1.md` |
| Playbooks de liberação (aulas) | `docs/playbook-liberar-aula2.md` … `aula5` |
| Materiais baixáveis | `assets/docs/aulas/aula0N-*/` |

---

*Documento de conteúdo do Módulo 1 — reunido a partir das páginas de aula e planos pedagógicos (2026-09-24).*
