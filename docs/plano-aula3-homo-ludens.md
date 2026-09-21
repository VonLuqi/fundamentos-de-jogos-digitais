# Plano de Implementação — Aula 03

> **Título curricular:** Aula 03: Homo Ludens, Identidade e Expressão Cultural  
> **Tópico da ementa:** O jogo como elemento da cultura (*Homo Ludens*)  
> **Módulo:** Módulo 1 — Fundações, Cultura e Interface (Aulas 1 a 5 · ~10h)  
> **Predecessora:** Aula 02 (Glossário + Player na tela) · [`plano-aula2-glossario-player.md`](./plano-aula2-glossario-player.md)  
> **Estado no repo:** **Tasks 0–10 ✅** — Aula 03 implementada. Gate `published: false` até o Mestre liberar — ver [`playbook-liberar-aula3.md`](./playbook-liberar-aula3.md).  
> **Duração prevista:** ~120 min (Fundamento teórico ~20 min · Prática Godot ~100 min)

Este documento é o **mapa de implementação** da Aula 03: conteúdo pedagógico, página, material baixável (sprites CraftPix), backend de progresso, conquistas e critérios de aceite.

---

## Objetivo pedagógico

Conectar a tese de Johan Huizinga — a cultura humana surge e se desenvolve **como jogo** — à prática de **expressão cultural** na engine: o aluno importa pixel art, personaliza o Sprite do Player com um recorte brasileiro (folclore, fauna ou urbano local) e configura filtro **Nearest** para renderizar gráfico pixelado sem borrão.

### O que o aluno aprende

- Explicar *Homo Ludens* de forma operacional: jogo não é “só lazer”; é matriz da cultura (rito, linguagem, competição, arte).
- Relacionar **Círculo Mágico** (Aula 01) com a ideia maior de Huizinga: o espaço do jogo é também espaço de **identidade**.
- Reconhecer que assets visuais comunicam **quem somos** e **de onde falamos** — regionalidade vira lúdico interativo.
- Importar imagens no FileSystem da Godot 4 (arrastar e soltar).
- Configurar `Sprite2D` / filtro de textura **Nearest** (pixel art nítida).
- Personalizar (ou reinterpretar) um sprite base para carregar um aspecto cultural brasileiro.

### O que o aluno faz

- Lê a teoria visual (~20 min).
- Baixa o pacote de sprites Tiny Hero (CraftPix) e segue a oficina (~100 min).
- Escolhe um herói base, importa no projeto da Aula 02, aplica Nearest e personaliza/reinterpreta culturalmente.
- Registra nas anotações: tese de Huizinga · referência cultural escolhida · passos de importação · ajuste Nearest · observação do resultado no Play.
- Finaliza o envio em `lesson_paragraphs` (professor / Almas / secretas). No Grimório Pessoal, a entrega aparece como **nota de atividade** virtual (`activity:aula3`).
- Eventualmente resgata o código da aula no Altar.

### Artefato gerado

- **Personagem culturalmente personalizado** na Godot: `Sprite2D` do Player com textura importada, filtro Nearest e identidade visual amarrada a um recorte brasileiro (mesmo que a edição seja pequena: recolor, acessório, silhueta, ou escolha consciente + justificativa escrita).
- Registro escrito na plataforma amarrando *Homo Ludens* ↔ sprite cultural.
- Visão da atividade no grimório (derivada de `lesson_paragraphs`, `lessonId: aula3`).

---

## Diagnóstico do estado atual (repo) — pós-implementação


| Área              | Situação (antes)                                                               | Situação (agora)                                                            |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Página / JS       | Stub “Conteúdo oculto / Em breve”                                              | Fundamentos + Oficina + Slides; envio + discovery                           |
| Catálogo Trilha   | `Conteúdo em preparação`                                                       | Título/subtitle curriculares; `rewardXp: 30`                                |
| Backend           | “Em preparação”; sem `aula3_concluida`                                         | Título novo; regra pública; gate `false` (admin)                            |
| Conquistas        | Sem família `aula3`                                                            | 1 pública + 3 secretas + stubs de arte                                      |
| Secretas          | Só `aula1` / `aula2`                                                           | Bloco `aula3` + smokes                                                      |
| Material download | —                                                                              | `aula03-pixel-hero/` (ZIP + README + `LICENCA.md`)                          |
| Slides            | —                                                                              | `aula03_homo_ludens_slides.{pptx,pdf}`                                      |
| Ponte Aula 02     | Sugeria câmera / cena de teste / polish                                        | Corrigida → cultura + pixel art                                             |


### Correção da ponte da Aula 02

Em [`plano-aula2-glossario-player.md`](./plano-aula2-glossario-player.md), a seção *Ponte — Aula 03* sugeria câmera follow / cena de teste / polish de movimento. A **ementa oficial** desta aula é *Homo Ludens* + expressão cultural + oficina de pixel art. **Ponte já corrigida** na Task 0 (2026-09-13). Câmera e polish ficam para **Aula 04+**.

---

## Padrão reutilizado das Aulas 01 e 02 (não reinventar)

Manter o mesmo “contrato” de experiência:

1. **Shell + abas:** `I. Fundamentos` · `II. Oficina` · `III. Slides`.
2. **Tom Hades:** tokens, `hades-frame`, `triplet-grid`, `lesson-cta`, discovery overlay em `css/aula.css`.
3. **Envio server-authoritative:** anotações + síntese → API avalia secretas; XP/conclusão via redeem no Altar.
4. **Grimório lê atividades:** `listMyLessonParagraphs` + notas virtuais (`activity:aula3`); sem `createNote` no finalize.
5. **Conquistas:** 1 pública (`aula3_concluida`) + 3 secretas `hidden` + `meta.family: "aula3"` + `volatile: true`.
6. **Pistas sem spoiler:** bloco curto na Oficina sem listar ids/nomes das secretas.
7. **Discovery:** reutilizar `js/lesson-discovery.js` (já compartilhado entre aula1 e aula2).
8. **Gate admin:** `published: false` no merge; liberar só na turma (playbook espelho da aula2).

---

## Task 0 — Perguntas e decisões — ✅ FECHADA

Decisões abaixo estão **congeladas** (2026-09-13). Implementação das Tasks 1+ pode seguir.

### Produto / pedagogia

1. **Escopo Godot nesta aula** → **(B) Arte do Sprite + Nearest**  
   - [x] (B) Importar + configurar Nearest + personalizar/reinterpretar com justificativa cultural  
   - ( ) (A) Só importar PNG · ( ) (C) Também animar sprite sheet — **fora do MVP**

2. **Base do projeto do aluno** → **(A) Continuar o projeto da Aula 02**  
   - [x] (A) Aluno abre o projeto onde o Player já anda; troca/personaliza a textura do `Sprite2D`  
   - ( ) (B) Projeto novo · ( ) (C) ZIP de projeto mínimo do curso

3. **Material baixável** → **(B) ZIP CraftPix + README**  
   - [x] (B) Hospedar em `assets/docs/aulas/aula03-pixel-hero/` (ZIP + README + checklist + nota de licença)  
   - ( ) (A) Só README · ( ) (C) Link externo apenas  
   - Arquivo canônico: `craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip` (CraftPix · Free Pixel Art Tiny Hero Sprites · ~675 KB · 3 heróis)  
   - Licença: apontar `license.txt` do pacote + https://craftpix.net/file-licenses/ (atribuir origem nas anotações / material)

4. **Nível de “personalização” aceito** → **(C) Escada de três níveis**  
   - [x] **Nível 1 (mínimo):** herói base + recolor (1–2 cores) **ou** crop + nome cultural + justificativa escrita  
   - [x] **Nível 2 (esperado):** editar PNG (acessório / silhueta / paleta) com âncora folclore / fauna / urbano  
   - [x] **Nível 3 (bônus):** sheet Idle/Walk com a mesma identidade — **sem** exigir `AnimatedSprite2D` no MVP

5. **Ferramenta de edição de pixel** → **livre**  
   - [x] Sugerir (não impor): LibreSprite, Piskel, Aseprite, Photopea, GIMP — Godot só importa o resultado

6. **Slides** → **Obrigatório**  
   - [x] Template aula1/aula2 → `aula03_homo_ludens_slides.pptx` + `.pdf` em `assets/docs/aulas/`

7. **Campo de entrega** → **(A) Espelho aula1/aula2**  
   - [x] (A) `config-notes` + `gdd-text` + finalizar  
   - ( ) (B) Um textarea · ( ) (C) Formulário multi-campo

8. **Libertação na Trilha** → **Gate admin**  
   - [x] Default `aula3: published false` até o Mestre liberar; **não** publicar no merge

### Conquistas

9. **Pacote** → **(A) 1 pública + 3 secretas**

10. **Conquista pública** → congelada  
    - Id: `aula3_concluida`  
    - Nome: **Máscara do Homo Ludens**  
    - Rarity: `stone` · xp card: `0` (XP do redeem = **30**)  
    - Trailhead: **não** (sem novos índices cipher)

11. **Secretas** → **tríade aceita**

| Id | Nome | Evidência no texto | Rarity / XP |
| :--- | :--- | :--- | :--- |
| `segredo_homo_ludens` | Voz do Homo Ludens | Huizinga / cultura-surge-como-jogo / *Homo Ludens* | silver / 15 |
| `segredo_artesao_do_pixel` | Artesão do Pixel | Import FileSystem + Sprite2D + **Nearest** (ou “sem blur / pixel nítido”) | gold / 15 |
| `segredo_identidade_ludica` | Identidade Lúdica | Referência cultural BR (folclore **ou** fauna **ou** urbano) + personalização/justificativa | rainbow / 25 |

12. **XP redeem da aula** → **30** (igual aula1/aula2)

13. **Activity bônus tipo `aula1_gdd`?** → **Não**

### Técnico

14. **Regras secretas** → estender `api/_lib/lesson-secret-achievements.js` com bloco `aula3`
15. **Discovery UI** → reutilizar `js/lesson-discovery.js` (sem nova extração)
16. **Testes** → smoke `aula3-secretas-volateis` + QA smoke; incluir em `npm run check`
17. **Códigos / Altar** → modelo atual (`redeem_codes` + TTL; multi-aluno)
18. **Playbook** → `docs/playbook-liberar-aula3.md` (Task 9)

---

## Conteúdo canônico (texto-fonte para a página)

### I. Fundamento teórico (~20 min)

Apresentar de forma **visual e intuitiva** (triplet-cards + uma frase operacional cada). Tomar cuidado para **não** repetir só o Círculo Mágico da Aula 01: aqui o foco é o jogo como **matriz cultural** e como **expressão de identidade**.

#### Triplet — conceitos-chave


| Termo | Definição operacional (para a página) | Gancho visual sugerido |
| :--- | :--- | :--- |
| ***Homo Ludens*** | Huizinga propõe que o humano é também “o que joga”: a cultura surge **no jogo e pelo jogo** — rito, linguagem, arte e competição carregam forma lúdica. | Figura humana + círculo lúdico / máscara |
| **Jogo como cultura** | Não é “pausa do sério”: é modo de a sociedade interpretar o mundo, ensaiar regras e criar significado compartilhado. | Ícone de festividade / arena / narrativa |
| **Identidade jogável** | Criadores transformam lendas, folclore, fauna e paisagens locais em **elementos interativos** — o sprite, o cenário e o loop “dizem de onde falamos”. | Mapa do Brasil estilizado + sprite |


#### Narrativa teórica (roteiro do professor · ~20 min)

1. **Abertura (3 min)** — Da Aula 01 para cá: o aluno já entrou no Círculo Mágico e fez o Player andar. Pergunta: *se o jogo cria um mundo com regras próprias, de onde vêm as imagens e as histórias desse mundo?*
2. **Huizinga em uma frase (5 min)** — Em *Homo Ludens* (1938), Johan Huizinga defende que a cultura humana surge e se desenvolve como jogo. O jogo é anterior à cultura “formal”: é atividade livre, com limites de tempo/espaço, regras aceitas, tensão e consciência de estar “fora” do cotidiano — e, ao mesmo tempo, é o solo onde nascem formas culturais (linguagem, mito, competição, arte).
3. **Do conceito ao estúdio (5 min)** — Criadores não “decoram” o jogo com cultura: eles **traduzem** cultura em sistemas jogáveis. Exemplos brasileiros (mostrar 1–2 slides, sem spoilar a prática):
   - indies com **folclore** (Saci, Curupira, Cuca, Boitatá);
   - ambientações **regionais** (sertão, Amazônia, urbano contemporâneo);
   - fauna e símbolos locais como identidade visual do herói.
4. **Ponte para a oficina (2 min)** — *“Hoje o seu Player deixa de ser um placeholder genérico: ele veste uma máscara cultural. Importar pixel art e deixar nítida (Nearest) é o ofício; escolher o que o herói representa é o gesto de Homo Ludens.”*

#### Frase de fechamento teórico (para a página)

> *A cultura joga — e o sprite é uma das máscaras com que esse jogo se mostra. Personalizar o herói é exercitar identidade dentro do Círculo Mágico.*

#### Referências rápidas (professor / slides — não sobrecarregar o aluno)

- Huizinga, J. *Homo Ludens: o jogo como elemento da cultura* (1938). Tese-chave: a cultura surge sob forma de jogo.
- Eco Aula 01: Círculo Mágico = recorte espacial/temporal com regras; Aula 03 amplia para **identidade cultural** dentro desse recorte.
- Exemplos de expressão cultural em jogos BR (mencionáveis): *Saci — O Vento do Encantado*; *Ibiporã*; *Gruta da Cuca*; *Cauê — Uma Aventura Amazônica*; *Língua* (sertão/nordeste). Usar como **inspiração**, não como obrigação de jogar.

---

### II. Prática na Godot (~100 min)

#### Pré-requisitos

- Projeto da **Aula 02** com `Player` (`CharacterBody2D` + `Sprite2D` + `CollisionShape2D` + Input Map + `player.gd`).
- Pacote **Tiny Hero Sprites** baixado (CTA na Oficina).
- Editor de pixel opcional instalado/aberto (Piskel / LibreSprite / etc.).

#### Cronograma sugerido da oficina


| Bloco | Tempo | Atividade |
| :--- | :--- | :--- |
| 0. Setup | 10 min | Baixar ZIP · extrair · abrir projeto Aula 02 · criar pasta `res://sprites/hero/` |
| 1. Importação | 15 min | Arrastar PNG para FileSystem · entender o que a Godot gera (`.import`) |
| 2. Nearest | 15 min | Ajustar filtro (projeto **e/ou** nó) · comparar Linear vs Nearest no Viewport |
| 3. Ligar ao Player | 15 min | Atribuir textura ao `Sprite2D` · ajustar CollisionShape · Play |
| 4. Personalização cultural | 35 min | Escolher referência BR · editar PNG · reimportar · documentar escolha |
| 5. Registro + envio | 10 min | Anotações · síntese · finalizar na plataforma |

#### Passo a passo canônico (Godot 4)

**1. Baixar e conhecer o pacote**

Pacote: **Free Pixel Art Tiny Hero Sprites** (CraftPix · id `622999`).

Estrutura relevante do ZIP:

```text
1 Pink_Monster/     → Pink_Monster.png + sheets (Idle, Walk, Run, Jump, Attack…)
2 Owlet_Monster/    → Owlet_Monster.png + sheets
3 Dude_Monster/     → Dude_Monster.png + sheets
Font/               → fonte inclusa (opcional)
PSD/                → listas de animação (referência; não obrigatório)
license.txt         → ler e respeitar a licença do asset
```

Orientação ao aluno:

- Para o **MVP da aula**, use o PNG base (`Pink_Monster.png`, `Owlet_Monster.png` ou `Dude_Monster.png`) — um frame único no `Sprite2D`.
- Sheets (`*_Idle_4.png`, `*_Walk_6.png`, etc.) ficam como **material de exploração**; animação completa é bônus / Aula futura.
- Manter `license.txt` junto do material no projeto (ou citar a origem nas anotações).

**2. Importar no FileSystem**

1. No FileSystem, criar pasta `sprites` (ou `sprites/hero`).
2. **Arrastar e soltar** o PNG escolhido para a pasta (ou *Import* / copiar para a pasta do projeto no Explorer e voltar à Godot para ela detectar).
3. Confirmar que o arquivo aparece sob `res://…` e que a Godot gerou metadados de importação.

**3. Configurar pixel art nítida (Nearest)**

Na Godot 4, o filtro **não** vive só no arquivo importado: ele é definido no **uso** (CanvasItem) e/ou no **default do projeto**.

Caminho A — **recomendado para a turma (rápido e visível):**

1. Selecionar o nó `Sprite2D`.
2. No Inspector: **CanvasItem → Texture → Filter** → `Nearest`  
   (em algumas builds aparece como `texture_filter` = Nearest).

Caminho B — **default do projeto (bom hábito em jogo pixel):**

1. **Project → Project Settings**.
2. Ativar **Advanced Settings** se necessário.
3. **Rendering → Textures → Default Texture Filter** → `Nearest`.

Atividade de observação (eco Aula 01):

- Deixar em Linear → Play → notar o **blur**.
- Mudar para Nearest → Play → notar o **pixel duro**.
- Registrar a diferença nas anotações (alimenta a secreta do Artesão).

Opcional (mencionar, não exigir): Compress Mode **Lossless** no dock Import para pixel art.

**4. Ligar a textura ao Player**

1. Abrir `player.tscn`.
2. Selecionar `Sprite2D` → **Texture** → apontar para o PNG importado.
3. Ajustar escala se o sprite for muito pequeno/grande.
4. Realinhar `CollisionShape2D` à nova silhueta.
5. **Play** e confirmar que o herói ainda se move (script da Aula 02 intacto).

**5. Oficina de personalização cultural**

Prompt ao aluno (escolha **uma** âncora):

| Âncora | Exemplos de direção criativa |
| :--- | :--- |
| **Folclore** | Saci (gorro/monopé sugerido), Curupira (cabelo vermelho / pés), Iara, Boitatá (traço de fogo), Cuca |
| **Fauna BR** | onça, tucano, mico-leão, jabuti, capivara — como *motivo visual* no herói |
| **Urbano / regional** | estampa de time, paisagem de favela/sertão/centro histórico, símbolo da cidade do aluno, cordel, frevo |

Regras da oficina:

- Não precisa ser “arte profissional”: o valor está na **intenção cultural** + resultado visível no engine.
- Evitar estereótipo ofensivo; tratar lendas e povos com respeito (o professor media se surgir dúvida).
- Fluxo técnico sugerido: exportar PNG editado → substituir o arquivo em `res://sprites/…` → Godot reimporta → Play.

**6. Checklist do artefato (visível na Oficina)**

- [ ] ZIP Tiny Hero baixado e pasta no projeto
- [ ] PNG importado via FileSystem
- [ ] `Sprite2D` do Player usando a textura importada
- [ ] Filtro **Nearest** aplicado (nó e/ou projeto) — pixel nítido no Play
- [ ] Personalização cultural **visível** **ou** recolor + justificativa escrita clara (Nível 1+)
- [ ] `CollisionShape2D` ajustado
- [ ] Movimento da Aula 02 ainda funciona
- [ ] Anotações + síntese enviadas na plataforma

---

### Artefato

**Personagem culturalmente personalizado dentro da engine** — o Player da Aula 02 com sprite importado, nítido (Nearest) e identidade brasileira explícita (visual e/ou textual nas anotações).

---

## Pacote de conquistas (proposta detalhada)

> Fonte editável: `data/game-catalog.json`. Regras secretas: `api/_lib/lesson-secret-achievements.js` (não publicar aliases no JSON).

### Pública


| Id | Nome | Desc (álbum) | hidden | rarity | xp card | Gatilho |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aula3_concluida` | Máscara do Homo Ludens | Vestiu o herói com cultura e aportou o rito da terceira trilha. | false | stone | 0 | `completed_lessons` inclui `aula3` (redeem) |


### Secretas (voláteis · família `aula3`)


| Id | Nome | Desc | rarity | xp | Ideia do matcher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `segredo_homo_ludens` | Voz do Homo Ludens | Nomeou o jogo como matriz da cultura. | silver | 15 | Aliases: huizinga, homo ludens, cultura surge / se desenvolve como jogo, jogo como elemento da cultura |
| `segredo_artesao_do_pixel` | Artesão do Pixel | Importou a imagem e deixou o pixel nítido. | gold | 15 | Import/FileSystem/arrastar **e** (Nearest **ou** “sem blur” / pixel nítido / filtro) **e** Sprite2D (ou sprite) |
| `segredo_identidade_ludica` | Identidade Lúdica | Amarrou o herói a um recorte cultural brasileiro. | rainbow | 25 | Folclore **ou** fauna **ou** urbano/regional (aliases: saci, curupira, iara, boitatá, cuca, onça, tucano, cordel, sertão, amazônia, cidade, etc.) **e** sinal de personalização / recolor / edição / identidade |


**Pista pública (Oficina, sem spoiler):**  
*“Pistas secretas do Submundo: diga com as próprias palavras por que a cultura joga; descreva como importou o sprite e deixou o pixel nítido; e registre qual máscara brasileira o seu herói passou a carregar. O altar reconhece quem documenta com precisão.”*

**Arte:** stubs em `assets/achievements/` (`aula3_concluida.webp` + 3 secretas) + entradas em `catalog.json` / README.

**Trailhead:** sem novos `nameIndexes` / `descIndexes` na pública (protege anagrama existente).

---

## Template de anotações (Oficina)

Placeholder sugerido para `config-notes`:

```text
1) Homo Ludens (com as minhas palavras):
2) Relação com o Círculo Mágico (Aula 01):
3) Referência cultural do meu herói (folclore / fauna / urbano):
4) O que eu alterei no sprite (e por quê):
5) Importação (pasta FileSystem + arquivo):
6) Nearest: onde configurei e o que mudou no Play (Linear vs Nearest):
7) Observações / dúvidas:
```

Placeholder da síntese (`gdd-text`):

> Em 5–8 linhas, amarre: tese de Huizinga → por que o asset visual é cultura jogável → o que o seu Player agora expressa.

---

## Roteiro de slides (15 slides · espelho aula1/aula2)

| # | Slide | Conteúdo |
| ---: | :--- | :--- |
| 1 | Capa | Aula 03 · Homo Ludens, Identidade e Expressão Cultural · Módulo 1 |
| 2 | Onde estamos | Ponte Aula 01 (círculo) → Aula 02 (Player anda) → Aula 03 (máscara cultural) |
| 3 | Ementa | O jogo como elemento da cultura |
| 4 | Huizinga | Frase-tese + *Homo Ludens* |
| 5 | O que é jogar (definição operacional) | Livre · limites · regras · tensão · “fora do cotidiano” |
| 6 | Cultura jogada | Rito, linguagem, arte, competição |
| 7 | Identidade nos jogos | Criadores traduzem regionalidade em sistemas |
| 8 | Exemplos BR (inspiração) | 2–3 caps / nomes de jogos — sem spoiler da prática |
| 9 | Ponte prática | “Hoje o sprite vira máscara” |
| 10 | Pacote Tiny Hero | 3 heróis · PNG base vs sheets |
| 11 | Importar no FileSystem | Arrastar e soltar |
| 12 | Nearest | Linear borra · Nearest preserva pixel |
| 13 | Personalização cultural | Folclore / fauna / urbano |
| 14 | Checklist do artefato | Lista curta |
| 15 | Fechamento + Altar | Envio · redeem · “próxima trilha” |

Arquivos-alvo:

- `assets/docs/aulas/aula03_homo_ludens_slides.pptx`
- `assets/docs/aulas/aula03_homo_ludens_slides.pdf`
- Regenerável: `scripts/build-aula03-slides.py` (mesmo padrão do script da aula2)

---

## Tasks de implementação

Legenda: `[ ]` pendente · `[~]` parcial · `[x]` feito

### Task 0 — Decisões

- [x] Validar e congelar as decisões da seção Task 0.
- [x] Congelar nomes/ids das conquistas e escopo Godot (Nearest + personalização; sem AnimatedSprite no MVP).
- [x] Congelar destino do ZIP CraftPix no repo (`aula03-pixel-hero/`).
- [x] Preencher bloco **Decisões congeladas** no final deste doc.

### Task 1 — Catálogo e Trilha (front)

- [x] Atualizar em `js/api.js` → `MODULES` entrada `aula3`:
  - title: `Homo Ludens, Identidade e Expressão Cultural`
  - subtitle: `Cultura como jogo · Pixel art, importação e herói brasileiro`
  - `rewardXp: 30`
- [x] Garantir card na Trilha consome `MODULES` (sem hardcode) — `js/lessons-ui.js` já usa `MODULES`/`LESSONS`.
- [x] Atualizar smoke de páginas para o título novo (rejeitar “Em preparação” / subtitle stub em `MODULES`).

### Task 2 — Backend de lição

- [x] `api/progress.js` → `LESSON_CATALOG.aula3.lessonTitle` alinhado.
- [x] Manter `LESSON_GATES.aula3.published = false`.
- [x] Adicionar regra `ACHIEVEMENT_RULES` para `aula3_concluida`.
- [x] Confirmar redeem genérico dispara a pública + XP 30 (`action: 'redeem'` já usa `LESSON_CATALOG` + `recalculateAchievements`; entrada no Álbum/`game-catalog.json` fica na Task 4).

### Task 3 — Página e conteúdo (`pages/aula3.html`)

- [x] Reescrever meta/title/header: Módulo 1 + título curricular.
- [x] Aba **I. Fundamentos:** triplet Homo Ludens / Jogo como cultura / Identidade jogável + ponte.
- [x] Aba **II. Oficina:** download ZIP · importação · Nearest · personalização · checklist · anotações + síntese + CTA.
- [x] Aba **III. Slides:** markup espelho aula1/aula2.
- [x] Discovery overlay + footer `Módulo 1 · Aula 03`.
- [x] Remover copy de stub “Forja em andamento”.
- [x] `js/aula3.js` mínimo: shell + abas (+ grimorio-from-note); envio/slides/discovery completos na Task 6.

### Task 3b — Slides

- [x] Script `scripts/build-aula03-slides.py` a partir do template aula1/aula2.
- [x] Roteiro de 15 slides (tabela acima).
- [x] Exportar PPTX + PDF em `assets/docs/aulas/`.
- [x] Constantes `PPTX_FILE` / `PDF_FILE` em `js/aula3.js` (viewer completo na Task 6).

### Task 4 — Conquistas no catálogo

- [x] Inserir 4 entradas em `data/game-catalog.json`.
- [x] `meta: { family: "aula3", kind: "content", volatile: true }` nas secretas.
- [x] Sem trailhead cipher novo na pública.
- [x] Stubs WebP + `assets/achievements/catalog.json` + README.

### Task 5 — Motor de secretas

- [x] Bloco `aula3` em `api/_lib/lesson-secret-achievements.js` (aliases Huizinga / Nearest / cultura BR).
- [x] Smoke `tests/aula3-secretas-volateis-smoke.mjs`.
- [x] Incluir no `npm run check`.

### Task 6 — JS da aula

- [x] Reescrever `js/aula3.js`: tabs + shell + slides + envio `lessonId: 'aula3'` + `lesson-discovery.js`.
- [x] Template de anotações (Homo Ludens · cultura · import · Nearest · identidade).
- [x] Exemplo admin (`#gdd-example` hidden), padrão aula1/aula2.

### Task 7 — Material de apoio

- [x] Criar `assets/docs/aulas/aula03-pixel-hero/`:
  - `README.md` (passo a passo Godot 4 + Nearest + personalização)
  - `craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip` (espelho do pacote do aluno)
  - nota curta de licença / atribuição (`LICENCA.md` + `license.txt` do pacote)
- [x] CTA de download na Oficina (já em `pages/aula3.html` desde a Task 3).
- [x] DOCX opcional: **adiado** (README + ZIP bastam; Word só se a turma pedir, espelho Aula 02).

### Task 8 — Estilo e polimento

- [x] Reusar `css/aula.css`; **sem** CSS one-off (`pages/aula3.html` → `aula.css`; sem `css/aula3.css`).
- [x] Mobile: abas com `min-height` tocável; textareas `font-size: 16px` (anti-zoom iOS) — herdado do CSS compartilhado.
- [x] `prefers-reduced-motion` no discovery (media query em `aula.css` + `body.is-reduced-motion` via `lesson-discovery.js`).
- [x] Polimento compartilhado: CTAs do `lesson-download-box` empilham em 100% no mobile (ZIP + README da Aula 03).

### Task 9 — Liberação e QA

- [x] Playbook `docs/playbook-liberar-aula3.md`.
- [x] QA smoke `tests/aula3-qa-smoke.mjs` (página, slides, README, secretas, redeem, álbum).
- [x] Incluir smoke no `npm run check`.
- [ ] QA ao vivo pós-liberação (toast no browser / redeem real) — checklist no playbook, quando o Mestre ligar o gate.

### Task 10 — Fechamento documental

- [x] Atualizar ponte em `docs/plano-aula2-glossario-player.md` → este plano (cultura + pixel, não câmera).
- [x] Atualizar `docs/plano-aula1-modulo1.md` com continuidade Aula 03.
- [x] Alinhar títulos em mocks (`api/_lib/store.js`: código `CULTURA2026` + regra `aula3_concluida`; pré-requisito `aula3 → aula2` já existia).
- [x] Decisões congeladas + status das tasks neste arquivo (Task 0–10).
- [x] Nota de ponte para Aula 04 (abaixo).

---

## Ordem recomendada de execução

```text
Task 0–10 ✅  (implementação da Aula 03 concluída)
Liberação na turma → docs/playbook-liberar-aula3.md
Próximo currículo → Aula 04 (plataformas + viewport retrô — ver Ponte / [`plano-aula4-plataformas-restricoes.md`](./plano-aula4-plataformas-restricoes.md))
```

---

## Arquivos-alvo (checklist de toque)


| Arquivo | Ação |
| :--- | :--- |
| `pages/aula3.html` | Reescrever conteúdo / abas / stub |
| `js/aula3.js` | Reescrever; wire envio + discovery + slides |
| `js/api.js` | Título/subtitle aula3 no `MODULES` |
| `js/lesson-discovery.js` | Reusar (sem mudança obrigatória) |
| `api/progress.js` | `LESSON_CATALOG` + regra `aula3_concluida` |
| `api/_lib/lesson-secret-achievements.js` | Regras `aula3` |
| `data/game-catalog.json` | 4 conquistas |
| `assets/achievements/*aula3*` | Arte / stubs + catalog/README |
| `assets/docs/aulas/aula03_homo_ludens_slides.pptx` | Criar deck |
| `assets/docs/aulas/aula03_homo_ludens_slides.pdf` | Exportar |
| `assets/docs/aulas/aula03-pixel-hero/**` | ZIP + README + licença |
| `scripts/build-aula03-slides.py` | Criar (espelho aula2) |
| `css/aula.css` | Só se faltar peça compartilhada |
| `tests/aula3-secretas-volateis-smoke.mjs` | Criar |
| `tests/aula3-qa-smoke.mjs` | Criar |
| `docs/playbook-liberar-aula3.md` | Criar |
| `docs/plano-aula2-glossario-player.md` | Corrigir ponte Aula 03 |
| `docs/plano-aula3-homo-ludens.md` | Este plano (status) |


**Fora de escopo desta leva (MVP)**

- `AnimatedSprite2D` / ciclo Idle–Walk obrigatório.
- Câmera follow, tilemaps, jump avançado (ficam na ponte Aula 04).
- Activity bônus tipo `aula1_gdd`.
- Novas salas do Submundo / ARG além do pacote de conquistas da aula.
- Exigir Aseprite pago.

---

## Critérios de aceite (Done da Aula 03)

1. Aluno autenticado abre `pages/aula3.html` (com gate published) e vê Fundamentos (*Homo Ludens*) + Oficina de pixel + Slides — **zero** stub “em preparação”.
2. Consegue baixar o pacote Tiny Hero, importar um PNG no FileSystem, atribuir ao `Sprite2D`, aplicar **Nearest** e ver pixel nítido no Play.
3. Personaliza (Nível 1+) com âncora cultural brasileira e registra a escolha nas anotações.
4. Aba Slides serve PPTX + PDF em `assets/docs/aulas/`, visual alinhado às aulas anteriores.
5. Envio avalia secretas no servidor; discovery via `lesson-discovery.js`.
6. Finalize grava em `lesson_paragraphs`; Grimório lista como nota de atividade `aula3`.
7. Redeem marca aula concluída, concede XP 30 e `aula3_concluida`.
8. Álbum lista as novas relíquias; secretas permanecem `?` até unlock.
9. Smokes de secretas e QA passam.

---

## Ponte — Aula 04 (próxima do Módulo 1)

> **Ementa oficial (2026-09-13):** Aula 04 = *Linha do Tempo das Plataformas e as Restrições Técnicas* + oficina **Estética Retrô do Zero** (viewport + stretch). Plano: [`plano-aula4-plataformas-restricoes.md`](./plano-aula4-plataformas-restricoes.md).  
> A sugestão anterior (câmera / cena de teste / AnimatedSprite) fica para **Módulo 2+** (a Aula 05 oficial é ClassInd/IARC — ver [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md)).

Com o herói **visível, nítido e culturalmente marcado**, a sequência curricular oficial:

| Tema | Por quê |
| :--- | :--- |
| **Histórico de plataformas** | Consoles de mesa e portáteis · restrições de paleta/resolução |
| **Criatividade sob limite** | Hardware força soluções visuais e mecânicas |
| **Viewport retrô + stretch** | `320×180` / `480×270` · Mode `viewport` · Aspect `keep` (+ `integer`) |

Fora do MVP da Aula 04: `Camera2D`, cena de teste com chão, `AnimatedSprite2D`, tilemaps grandes, combate, UI completa.

---

## Decisões congeladas

> Task 0 fechada em **2026-09-13** · implementação Tasks 1–10 concluída na mesma data.


| Tema | Decisão |
| :--- | :--- |
| Escopo Godot | Importar PNG + **Nearest** + personalização cultural; **sem** `AnimatedSprite2D` no MVP |
| Base do projeto | Continuar o projeto da **Aula 02** (Player que já anda) |
| Material baixável | ZIP CraftPix + README + checklist em `assets/docs/aulas/aula03-pixel-hero/` |
| Arquivo do pacote | `craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip` (Pink / Owlet / Dude) |
| Licença do asset | Respeitar `license.txt` + https://craftpix.net/file-licenses/; citar origem no material |
| Personalização | Escada Nível 1 (mínimo) · 2 (esperado) · 3 (bônus sheets, sem animação obrigatória) |
| Editor de pixel | Livre (LibreSprite / Piskel / Aseprite / Photopea / GIMP) |
| Slides | Obrigatório: `aula03_homo_ludens_slides.pptx` + `.pdf` |
| Entrega na página | Espelho aula1/aula2: `config-notes` + `gdd-text`; grimório via `lesson_paragraphs` |
| Pacote conquistas | 1 pública + 3 secretas (Homo Ludens / Artesão / Identidade) |
| Ids finais | `aula3_concluida`, `segredo_homo_ludens`, `segredo_artesao_do_pixel`, `segredo_identidade_ludica` |
| Nome da pública | **Máscara do Homo Ludens** (`stone`, xp card 0) |
| Trailhead | Público sem novos índices cipher |
| XP redeem | **30** |
| Activity bônus | Não |
| Discovery | Reusar `js/lesson-discovery.js` |
| Gate no merge | **Não** — `published: false` até admin liberar |
| Códigos | Modelo atual multi-aluno + TTL |
| Ponte Aula 02 | Ementa oficial **sobrescreve** câmera/polish — Aula 03 = cultura + pixel art |


---

## Status

- Estado atual: **Tasks 0–10 ✅ — Aula 03 implementada.**
- Liberação na turma: [`playbook-liberar-aula3.md`](./playbook-liberar-aula3.md) (gate + código). QA ao vivo só após o Mestre ligar o gate.
- Página: `pages/aula3.html` · JS: `js/aula3.js` · slides: `aula03_homo_ludens_slides.{pptx,pdf}`.
- Material: `assets/docs/aulas/aula03-pixel-hero/` (ZIP + README + `LICENCA.md`).
- Conquistas: `aula3_concluida` (**Máscara do Homo Ludens**) + 3 secretas · motor + smokes no `npm run check`.
- Backend: catálogo curricular · gate `published: false` · regra `aula3_concluida` · mock `CULTURA2026` em `store.js`.
- Próximo currículo: **Aula 04** (plataformas + estética retrô / viewport) — [`plano-aula4-plataformas-restricoes.md`](./plano-aula4-plataformas-restricoes.md).
- Predecessora: [`plano-aula2-glossario-player.md`](./plano-aula2-glossario-player.md).
