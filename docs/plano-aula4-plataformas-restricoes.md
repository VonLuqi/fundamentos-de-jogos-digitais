# Plano de Implementação — Aula 04

> **Título curricular:** Aula 04: A Linha do Tempo das Plataformas e as Restrições Técnicas  
> **Tópico da ementa:** Histórico dos jogos e suas plataformas de hardware  
> **Módulo:** Módulo 1 — Fundações, Cultura e Interface (Aulas 1 a 5 · ~10h)  
> **Predecessora:** Aula 03 (Homo Ludens + pixel art / Nearest) · [`plano-aula3-homo-ludens.md`](./plano-aula3-homo-ludens.md)  
> **Estado no repo:** **Tasks 0–10 ✅** — Aula 04 implementada. Gate `published: false` até o Mestre liberar — ver [`playbook-liberar-aula4.md`](./playbook-liberar-aula4.md).  
> **Duração prevista:** ~120 min (Fundamento teórico ~20 min · Prática Godot ~100 min)

Este documento é o **mapa de implementação** da Aula 04: conteúdo pedagógico, página, material de apoio, backend de progresso, conquistas e critérios de aceite.

> **Nota de numeração:** o briefing do professor rotula a sessão como “Aula 04” na ementa. No repositório, a Aula 03 (*Homo Ludens*) já está implementada; esta é a **próxima trilha** do Módulo 1 (`aula4`).

---

## Objetivo pedagógico

Conectar a **história das plataformas** (consoles de mesa e portáteis) à prática de **design sob restrição**: o aluno entende como paletas, resoluções e limites de hardware forçaram soluções criativas — e configura o projeto Godot 4 para **emular uma resolução nativa clássica** (viewport baixo + stretch proporcional nítido), exatamente como nos jogos de 8/16 bits.

### O que o aluno aprende

- Situar a evolução tecnológica dos consoles (anos 70/80 → hoje) em uma linha do tempo operacional: resolução, paleta, sprites por scanline, memória.
- Explicar, com as próprias palavras, por que **limitação de hardware** não é só “empecilho”: é motor de criatividade visual e mecânica.
- Distinguir **resolução de design** (viewport nativo) de **tamanho da janela** (escala na tela do aluno).
- Configurar na Godot 4: Viewport Width/Height, Stretch Mode = `viewport`, Stretch Aspect = `keep` (e, como reforço pixel-perfect, Stretch Scale Mode = `integer`).
- Relacionar o filtro **Nearest** da Aula 03 com o stretch da Aula 04: juntos, formam a “estética retrô do zero”.

### O que o aluno faz

- Lê a teoria visual (~20 min): linha do tempo + restrição → criatividade.
- Segue a oficina na Godot (~100 min): escolhe uma resolução clássica (ex.: `320×180` ou `480×270`), configura Project Settings, testa Play com janela maior e documenta o resultado.
- Registra nas anotações: plataforma(s) citadas · restrição que mais impressionou · resolução escolhida · caminhos dos settings · observação do pixel ao redimensionar.
- Finaliza o envio em `lesson_paragraphs` (professor / Almas / secretas). No Grimório Pessoal, a entrega aparece como **nota de atividade** virtual (`activity:aula4`).
- Eventualmente resgata o código da aula no Altar.

### Artefato gerado

- **Projeto Godot configurado com formato e resolução clássica retrô:** viewport nativo baixo + stretch `viewport`/`keep` (pixels aumentam de forma proporcional e nítida, sem esticar o aspecto).
- Registro escrito na plataforma amarrando história das plataformas ↔ configuração técnica.
- Visão da atividade no grimório (derivada de `lesson_paragraphs`, `lessonId: aula4`).

---

## Diagnóstico do estado atual (repo) — pós-implementação


| Área              | Situação (antes)                                                               | Situação (agora)                                                                |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Página / JS       | Ausente                                                                        | Fundamentos + Oficina + Slides; envio + discovery                               |
| Catálogo Trilha   | Parava em `aula3`                                                              | `aula4` com título/subtitle; `rewardXp: 30`                                     |
| Backend           | Sem catálogo/gate/regra                                                        | Catálogo + gate `false` + `aula4_concluida` + prereq `aula3` + mock `PLATAFORMA2026` |
| Conquistas        | Famílias `aula1`–`aula3`                                                       | 1 pública + 3 secretas + stubs WebP                                             |
| Secretas          | Blocos `aula1`–`aula3`                                                         | Bloco `aula4` + smokes                                                          |
| Material download | —                                                                              | `aula04-retro-viewport/README.md`                                               |
| Slides            | —                                                                              | `aula04_plataformas_restricoes_slides.{pptx,pdf}`                               |
| Ponte Aula 03     | Câmera / AnimatedSprite                                                        | **Corrigida** → plataformas + viewport retrô                                    |


### Correção da ponte da Aula 03

Em [`plano-aula3-homo-ludens.md`](./plano-aula3-homo-ludens.md), a seção *Ponte — Aula 04* sugeria `Camera2D`, cena de teste e `AnimatedSprite2D`. A **ementa oficial** desta aula é *histórico das plataformas* + oficina de **viewport retrô**. **Ponte já corrigida na Task 0 (2026-09-13).** Câmera, cena de teste e animação ficam para **Módulo 2+** (quando houver ementa).

---

## Padrão reutilizado das Aulas 01–03 (não reinventar)

Manter o mesmo “contrato” de experiência:

1. **Shell + abas:** `I. Fundamentos` · `II. Oficina` · `III. Slides`.
2. **Tom Hades:** tokens, `hades-frame`, `triplet-grid`, `lesson-cta`, discovery overlay em `css/aula.css`.
3. **Envio server-authoritative:** anotações + síntese → API avalia secretas; XP/conclusão via redeem no Altar.
4. **Grimório lê atividades:** `listMyLessonParagraphs` + notas virtuais (`activity:aula4`); sem `createNote` no finalize.
5. **Conquistas:** 1 pública (`aula4_concluida`) + 3 secretas `hidden` + `meta.family: "aula4"` + `volatile: true`.
6. **Pistas sem spoiler:** bloco curto na Oficina sem listar ids/nomes das secretas.
7. **Discovery:** reutilizar `js/lesson-discovery.js`.
8. **Gate admin:** `published: false` no merge; liberar só na turma (playbook espelho da aula3).

---

## Task 0 — Perguntas e decisões — ✅ FECHADA

Decisões abaixo estão **congeladas** (2026-09-13). Implementação das Tasks 1+ pode seguir.

### Produto / pedagogia

1. **Escopo Godot nesta aula** → **(B) Só Project Settings de resolução/stretch**  
   - [x] **(B)** Viewport Width/Height + Stretch Mode `viewport` + Aspect `keep` (+ Scale Mode `integer` obrigatório)  
   - ( ) (A) Só mudar tamanho da janela, sem stretch  
   - ( ) (C) Também `Camera2D` / cena de teste / AnimatedSprite — **fora do MVP**

2. **Base do projeto do aluno** → **(A) Continuar o projeto das Aulas 02–03**  
   - [x] **(A)** Abrir o mesmo projeto (Player + sprite Nearest); só alterar Display → Window  
   - ( ) (B) Projeto novo só para testar viewport  
   - ( ) (C) ZIP de projeto mínimo do curso

3. **Resolução-alvo canônica** → **(C) Escolha guiada entre duas**  
   - [x] **(C)** Aluno escolhe **uma**: `320×180` **ou** `480×270` (ambas 16:9; clássicas para pixel art moderno)  
   - ( ) (A) Só `320×180` · ( ) (B) Só `480×270`  
   - Opcional (menção, não exigir): `256×224` (SNES-like 4:3), `160×144` (Game Boy) — para quem quiser “histórico puro”

4. **Window override (janela inicial)** → **sim**  
   - [x] Definir **Window Width/Height Override** (sugestão de turma: `1280×720` ou `960×540`) para o Play abrir grande enquanto o **viewport de design** permanece baixo — espelha a doc oficial Godot 4 (*Multiple resolutions*)

5. **Stretch Scale Mode `integer`** → **obrigatório no checklist**  
   - [x] Briefing cita Mode `viewport` + Aspect `keep`. Incluir `integer` como passo **obrigatório** da oficina (pixel art sem escala fracionária), com observação no Play ao redimensionar.

6. **Material baixável** → **(A) README + checklist**  
   - [x] **(A)** `assets/docs/aulas/aula04-retro-viewport/README.md` (passo a passo + tabela de resoluções históricas)  
   - ( ) (B) Também ZIP de projeto · ( ) (C) Só link externo à doc Godot

7. **Slides** → **Obrigatório**  
   - [x] Template aula1–aula3 → `aula04_plataformas_restricoes_slides.pptx` + `.pdf`  
   - Script: `scripts/build-aula04-slides.py`

8. **Campo de entrega** → **(A) Espelho aula1–aula3**  
   - [x] **(A)** `config-notes` + `gdd-text` + finalizar  
   - ( ) (B) Um textarea · ( ) (C) Formulário multi-campo

9. **Libertação na Trilha** → **Gate admin**  
   - [x] Default `aula4: published false` até o Mestre liberar; **não** publicar no merge

### Conquistas

10. **Pacote** → **(A) 1 pública + 3 secretas**

11. **Conquista pública** → congelada  
    - Id: `aula4_concluida`  
    - Nome: **Guardião da Resolução**  
    - Rarity: `stone` · xp card: `0` (XP do redeem = **30**)  
    - Trailhead: **não** (sem novos índices cipher)

12. **Secretas** → **tríade aceita**

| Id | Nome | Evidência no texto | Rarity / XP |
| :--- | :--- | :--- | :--- |
| `segredo_arqueologo_de_hardware` | Arqueólogo de Hardware | Linha do tempo / consoles / restrição (paleta, resolução, sprites) | silver / 15 |
| `segredo_artesao_da_viewport` | Artesão da Viewport | Viewport Width/Height **e** Stretch Mode `viewport` **e** Aspect `keep` (aliases PT/EN) | gold / 15 |
| `segredo_criatividade_sob_limite` | Criatividade sob Limite | Restrição força criatividade / solução visual ou mecânica (tese do briefing) | rainbow / 25 |

13. **XP redeem da aula** → **30** (igual aula1–aula3)

14. **Activity bônus tipo `aula1_gdd`?** → **Não**

### Técnico

15. **Regras secretas** → estender `api/_lib/lesson-secret-achievements.js` com bloco `aula4`
16. **Discovery UI** → reutilizar `js/lesson-discovery.js`
17. **Testes** → smoke `aula4-secretas-volateis` + QA smoke; incluir em `npm run check`
18. **Códigos / Altar** → modelo atual (`redeem_codes` + TTL; multi-aluno)
19. **Playbook** → `docs/playbook-liberar-aula4.md` (Task 9)
20. **Pré-requisito na Trilha** → `aula4` exige `aula3` concluída (espelho do encadeamento atual)

---

## Conteúdo canônico (texto-fonte para a página)

### I. Fundamento teórico (~20 min)

Apresentar de forma **visual e intuitiva** (triplet-cards + uma frase operacional cada). Não repetir *Homo Ludens* nem Nearest: aqui o foco é **plataforma / restrição / criatividade**.

#### Triplet — conceitos-chave


| Termo | Definição operacional (para a página) | Gancho visual sugerido |
| :--- | :--- | :--- |
| **Plataforma** | O hardware (e seu “contrato” com o software) onde o jogo roda: CPU, memória, vídeo, entrada. Cada geração redefine o que é “possível”. | Ícone de console de mesa + portátil |
| **Restrição técnica** | Limites reais: resolução baixa, poucas cores, poucos sprites por linha, pouca RAM. O designer *projeta dentro* desses limites. | Grade de pixels / paleta curta |
| **Criatividade sob limite** | A restrição empurra soluções elegantes: tiles reutilizados, parallax por scanline, paletas compartilhadas, mecânicas que “escondem” o hardware. | Seta “limite → ideia” |


#### Linha do tempo operacional (para slides + página)

Valores são **aproximações didáticas** (resoluções “de design” / modos comuns), não specs de engenharia completas. Fonte de apoio: tabelas históricas de resolução de consoles e a prática moderna de pixel art em 16:9.


| Era | Exemplos | Resolução / vídeo (ordem de grandeza) | Restrição típica que importa para o designer |
| :--- | :--- | :--- | :--- |
| **70s — nascença** | Atari 2600 | ~160×192 (não é “framebuffer” moderno) | Pouquíssimos objetos por linha; arte e timing viram truque |
| **8-bit (mesa)** | NES / Famicom | 256×240 (área útil ~224) | ~52 cores no sistema; 3–4 cores por tile/sprite; **8 sprites por scanline** (flicker) |
| **8-bit (portátil)** | Game Boy | **160×144**, 4 tons | Contraste e silhueta > detalhe; UI minúscula |
| **16-bit (mesa)** | SNES / Mega Drive | SNES comum **256×224**; modos maiores existem | Mais cores/camadas, ainda tilemap + limites de sprites por linha |
| **16-bit (portátil)** | Game Boy Advance | **240×160** | Mais cor que o GB, tela ainda “perto do rosto” |
| **HD / multiplataforma** | Consoles atuais + PC | 720p → 4K, aspect ratios variados | O “limite” muda: orçamento de GPU, acessibilidade, densidade de UI — mas a **disciplina de resolução base** continua útil |
| **Estética retrô hoje** | Indies / pixel art | Alvos comuns **320×180**, **480×270**, **640×360** (16:9) | Emular o *contrato* clássico (poucos pixels) em monitores widescreen |


**Exemplos de criatividade nascida da restrição** (1–2 slides; não virar aula de história pura):

- **Sprites por scanline (NES):** jogos reordenam/flickeram sprites; chefes grandes = vários sprites costurados.
- **Paleta curta (Game Boy):** silhueta e animação carregam a leitura; “detalhe” vira ruído.
- **Mode 7 / efeitos por scanline (SNES):** perspectiva falsa e ondas sem “3D de verdade”.
- **Tiles reutilizados:** o mesmo bloco monta biomas inteiros — memória vira linguagem visual.

#### Narrativa teórica (roteiro do professor · ~20 min)

1. **Abertura (3 min)** — Da Aula 03: o herói já está nítido (Nearest) e culturalmente marcado. Pergunta: *em que “tela imaginária” esse herói deveria viver? Um monitor 1080p moderno não era o contrato dos clássicos.*
2. **Linha do tempo em 7 min** — Percorrer a tabela (mesa × portátil). Enfatizar: cada geração muda o **orçamento visual**, não só “fica mais bonito”.
3. **Tese central (5 min)** — Limitação força criatividade: o designer inventa linguagem dentro do possível. Citar 1–2 truques (flicker, tiles, Mode 7) sem aprofundar engenharia.
4. **Ponte para a oficina (5 min)** — *“Hoje você não vai ‘simular um chip’: vai configurar o contrato de tela do seu projeto. Viewport baixo + stretch `viewport`/`keep` = pixels que crescem limpos, como no CRT/escala integer dos clássicos. O Nearest da Aula 03 protege o asset; o stretch da Aula 04 protege o quadro.”*

#### Frase de fechamento teórico (para a página)

> *Toda plataforma escreve um contrato invisível com o jogador: quantos pixels, quantas cores, quanto cabe na memória. Projetar dentro desse contrato — e às vezes fingir que ele ainda existe — é o ofício do designer retrô.*

#### Referências rápidas (professor / slides — não sobrecarregar o aluno)

- Ementa: histórico dos jogos e plataformas de hardware; restrição → criatividade.
- Godot 4 — *Multiple resolutions*: [docs.godotengine.org — Multiple resolutions](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html)  
  - Stretch Mode **viewport** · Aspect **keep** · Scale Mode **integer** (pixel art).  
  - Base size = Viewport Width/Height; Window Override = tamanho inicial da janela.
- Continuum do módulo: Aula 01 (regras do mundo) → Aula 02 (Player) → Aula 03 (pixel nítido + identidade) → **Aula 04 (quadro / resolução / plataforma)**.

---

### II. Prática na Godot (~100 min)

#### Atividade: “Estética Retrô do Zero”

Os alunos configuram a **resolução nativa** do projeto para emular consoles/estética clássica: poucos pixels no viewport, escala proporcional e nítida na janela.

#### Pré-requisitos

- Projeto das **Aulas 02–03** com Player + sprite (Nearest preferencialmente já aplicado).
- Godot 4 aberta; Project Settings acessível.
- README da oficina baixável (quando existir o material).

#### Cronograma sugerido da oficina


| Bloco | Tempo | Atividade |
| :--- | :--- | :--- |
| 0. Setup | 10 min | Abrir projeto · anotar resolução atual · ativar Advanced Settings se preciso |
| 1. Escolher o contrato | 15 min | Comparar `320×180` vs `480×270` (e opcional histórico) · decidir uma |
| 2. Viewport nativo | 20 min | Display → Window → Viewport Width/Height · observar o retângulo azul no editor 2D |
| 3. Stretch clássico | 25 min | Mode `viewport` · Aspect `keep` · Scale Mode `integer` · Override da janela |
| 4. Experimento | 20 min | Play · redimensionar janela · comparar com Mode `disabled` / Aspect `ignore` (desfazer depois) |
| 5. Registro + envio | 10 min | Anotações · síntese · finalizar na plataforma |

#### Passo a passo canônico (Godot 4)

> **Atenção de nomenclatura:** o briefing fala em “Window Width/Height”. Na Godot 4, a **resolução de design** está em **Viewport Width / Viewport Height**. “Window Width/Height Override” controla o tamanho inicial da janela na tela. Na página da aula, usar os nomes oficiais da Godot 4 e mapear o briefing para evitar confusão.

**1. Abrir Project Settings**

1. Menu **Project → Project Settings**.
2. Se a UI estiver reduzida, ativar **Advanced Settings**.
3. Ir em **Display → Window**.

**2. Definir a resolução nativa (viewport)**

1. **Viewport Width** / **Viewport Height** → escolher **uma**:
   - `320` × `180` — contrato bem “8/16-bit moderno” em 16:9; pixels grandes e legíveis.
   - `480` × `270` — mesmo aspect, um pouco mais de detalhe (ainda retrô).
2. Observar no editor 2D: a área útil (retângulo de design) muda. O herói pode parecer “grande” demais no quadro — isso é **esperado** e alimenta a conversa de restrição.

**3. Configurar o stretch (comportamento de console clássico)**

1. **Stretch → Mode** → `viewport`  
   - A cena renderiza no tamanho base e **depois** é escalada para a janela.
2. **Stretch → Aspect** → `keep`  
   - Mantém a proporção; barras pretas (letterbox/pillarbox) se a janela não for 16:9 — como um console “fixando” o aspect.
3. **Stretch → Scale Mode** → `integer` *(reforço pixel-perfect; incluir no checklist)*  
   - Evita escala fracionária que “quebra” a grade de pixels.

**4. Janela grande, viewport pequeno (override)**

1. Em **Size**, localizar **Window Width Override** / **Window Height Override** (nomes podem variar levemente por build; conceito = tamanho inicial da janela).
2. Sugestão de turma: `1280×720` ou `960×540` (múltiplos inteiros de `320×180`).
3. Assim o aluno *vê* pixels grandes e nítidos, sem trabalhar com uma janelinha minúscula.

**5. Experimento de observação (eco Aula 01)**

Registrar nas anotações (alimenta secretas):

| Teste | O que observar |
| :--- | :--- |
| Stretch Mode = `disabled` | 1 unidade ≈ 1 pixel da tela; o “mundo” muda de tamanho ao redimensionar |
| Mode = `viewport`, Aspect = `ignore` | Estica e deforma o quadro |
| Mode = `viewport`, Aspect = `keep` | Proporção preservada; barras pretas possíveis |
| Scale Mode `integer` vs `fractional` | Pixels uniformes vs “meios-pixels” estranhos |

Voltar ao trio canônico (`viewport` + `keep` + `integer`) antes de finalizar.

**6. Eco da Aula 03 (Nearest)**

Se o sprite ainda estiver com filtro Linear:

1. `Sprite2D` → CanvasItem → Texture → Filter → **Nearest**, **ou**
2. Project Settings → Rendering → Textures → Default Texture Filter → **Nearest**.

Sem Nearest, o stretch amplifica o blur — bom contraste pedagógico de 30 segundos.

**7. Checklist do artefato (visível na Oficina)**

- [ ] Projeto das Aulas 02–03 aberto
- [ ] Viewport Width × Height = `320×180` **ou** `480×270` (ou resolução histórica justificada)
- [ ] Stretch Mode = `viewport`
- [ ] Stretch Aspect = `keep`
- [ ] Stretch Scale Mode = `integer`
- [ ] Window Override definido (janela inicial confortável)
- [ ] Play: pixels nítidos e proporção mantida ao redimensionar
- [ ] Nearest ainda ativo no herói (eco Aula 03)
- [ ] Anotações + síntese enviadas na plataforma

---

### Artefato

**Projeto configurado com formato e resolução clássica retrô** — viewport nativo baixo + stretch de console (`viewport` / `keep` / `integer`) documentado nas anotações da plataforma.

---

## Pacote de conquistas (proposta detalhada)

> Fonte editável: `data/game-catalog.json`. Regras secretas: `api/_lib/lesson-secret-achievements.js` (não publicar aliases no JSON).

### Pública


| Id | Nome | Desc (álbum) | hidden | rarity | xp card | Gatilho |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aula4_concluida` | Guardião da Resolução | Fixou o contrato de tela do Submundo e honrou a quarta trilha. | false | stone | 0 | `completed_lessons` inclui `aula4` (redeem) |


### Secretas (voláteis · família `aula4`)


| Id | Nome | Desc | rarity | xp | Ideia do matcher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `segredo_arqueologo_de_hardware` | Arqueólogo de Hardware | Nomeou a linha do tempo das plataformas. | silver | 15 | Aliases: console, plataforma, NES, SNES, Game Boy, Atari, 8-bit, 16-bit, portátil, resolução histórica, paleta |
| `segredo_artesao_da_viewport` | Artesão da Viewport | Configurou o quadro nativo e o stretch clássico. | gold | 15 | Viewport Width/Height **ou** 320×180 / 480×270 **e** (viewport stretch / mode viewport) **e** (aspect keep / keep aspect) — aliases PT/EN |
| `segredo_criatividade_sob_limite` | Criatividade sob Limite | Explicou como a restrição gera solução criativa. | rainbow | 25 | restrição/limitação/hardware **e** (criatividade / solução / truque / design / mecânica / visual) |


**Pista pública (Oficina, sem spoiler):**  
*“Pistas secretas do Submundo: situie uma plataforma na linha do tempo; descreva Viewport + Stretch (`viewport` / `keep`) com as próprias palavras; e diga que restrição antiga ainda te ensina a inventar. O altar reconhece quem documenta o contrato de tela.”*

**Arte:** stubs em `assets/achievements/` (`aula4_concluida.webp` + 3 secretas) + entradas em `catalog.json` / README.

**Trailhead:** sem novos `nameIndexes` / `descIndexes` na pública (protege anagrama existente), salvo calibração explícita.

---

## Template de anotações (Oficina)

Placeholder sugerido para `config-notes`:

```text
1) Plataforma(s) que mais me marcaram na linha do tempo:
2) Uma restrição técnica (resolução / paleta / sprites) e por que ela importa:
3) Como a restrição força criatividade (exemplo meu ou de um jogo clássico):
4) Resolução nativa que escolhi (ex.: 320×180) e por quê:
5) Onde configurei Viewport Width/Height:
6) Stretch Mode / Aspect / Scale Mode (valores finais):
7) O que mudou no Play ao redimensionar a janela:
8) Observações / dúvidas:
```

Placeholder da síntese (`gdd-text`):

> Em 5–8 linhas, amarre: história das plataformas → restrição técnica → por que configurei um viewport baixo com stretch `viewport`/`keep` no seu projeto.

---

## Roteiro de slides (15 slides · espelho aula1–aula3)

| # | Slide | Conteúdo |
| ---: | :--- | :--- |
| 1 | Capa | Aula 04 · Linha do Tempo das Plataformas e as Restrições Técnicas · Módulo 1 |
| 2 | Onde estamos | Aula 02 (Player) → Aula 03 (Nearest + cultura) → Aula 04 (quadro / plataforma) |
| 3 | Ementa | Histórico dos jogos e plataformas de hardware |
| 4 | O que é plataforma | Hardware + contrato com o software |
| 5 | Linha do tempo (mesa) | Atari → NES → SNES → HD |
| 6 | Linha do tempo (portátil) | Game Boy → GBA → DS / modernos |
| 7 | Restrições que moldam o design | Resolução · paleta · sprites/scanline · memória |
| 8 | Criatividade sob limite | 2 exemplos (flicker / tiles / Mode 7) |
| 9 | Retrô hoje | 320×180 e 480×270 como contratos 16:9 |
| 10 | Ponte prática | “Hoje configuramos o contrato de tela” |
| 11 | Viewport vs janela | Design size ≠ tamanho do monitor |
| 12 | Stretch Mode `viewport` | Renderiza baixo, escala depois |
| 13 | Aspect `keep` + Scale `integer` | Proporção + pixels inteiros |
| 14 | Checklist do artefato | Lista curta |
| 15 | Fechamento + Altar | Envio · redeem · “próxima trilha” |

Arquivos-alvo:

- `assets/docs/aulas/aula04_plataformas_restricoes_slides.pptx`
- `assets/docs/aulas/aula04_plataformas_restricoes_slides.pdf`
- Regenerável: `scripts/build-aula04-slides.py`

---

## Tasks de implementação

Legenda: `[ ]` pendente · `[~]` parcial · `[x]` feito

### Task 0 — Decisões

- [x] Validar e congelar as decisões da seção Task 0 (escopo Godot, resoluções, conquistas).
- [x] Congelar nomes/ids das conquistas e checklist técnico (`viewport` / `keep` / `integer`).
- [x] Corrigir ponte da Aula 03 → este plano (plataformas, não câmera).
- [x] Preencher bloco **Decisões congeladas** no final deste doc.

### Task 1 — Catálogo e Trilha (front)

- [x] Atualizar em `js/api.js` → `MODULES` entrada `aula4`:
  - title: `A Linha do Tempo das Plataformas e as Restrições Técnicas`
  - subtitle: `Histórico de hardware · Viewport retrô e stretch clássico`
  - `rewardXp: 30`
- [x] Garantir card na Trilha consome `MODULES` (sem hardcode).
- [x] Atualizar smoke de páginas para o título novo (rejeitar stub “em preparação”, se houver).

### Task 2 — Backend de lição

- [x] `api/progress.js` → `LESSON_CATALOG.aula4.lessonTitle` alinhado.
- [x] `LESSON_GATES.aula4.published = false`.
- [x] Pré-requisito `aula4 → aula3` (espelho do encadeamento).
- [x] Adicionar regra `ACHIEVEMENT_RULES` para `aula4_concluida`.
- [x] Confirmar redeem genérico dispara a pública + XP 30.

### Task 3 — Página e conteúdo (`pages/aula4.html`)

- [x] Criar página no shell das aulas anteriores.
- [x] Aba **I. Fundamentos:** triplet Plataforma / Restrição / Criatividade + linha do tempo resumida.
- [x] Aba **II. Oficina:** passo a passo viewport/stretch · checklist · anotações + síntese + CTA.
- [x] Aba **III. Slides:** markup espelho aula1–aula3.
- [x] Discovery overlay + footer `Módulo 1 · Aula 04`.
- [x] `js/aula4.js` mínimo: shell + abas; envio/slides/discovery completos na Task 6.

### Task 3b — Slides

- [x] Script `scripts/build-aula04-slides.py` a partir do template.
- [x] Roteiro de 15 slides (tabela acima).
- [x] Exportar PPTX + PDF em `assets/docs/aulas/`.
- [x] Constantes `PPTX_FILE` / `PDF_FILE` em `js/aula4.js`.

### Task 4 — Conquistas no catálogo

- [x] Inserir 4 entradas em `data/game-catalog.json`.
- [x] `meta: { family: "aula4", kind: "content", volatile: true }` nas secretas.
- [x] Sem trailhead cipher novo na pública (salvo decisão).
- [x] Stubs WebP + `assets/achievements/catalog.json` + README.

### Task 5 — Motor de secretas

- [x] Bloco `aula4` em `api/_lib/lesson-secret-achievements.js`.
- [x] Smoke `tests/aula4-secretas-volateis-smoke.mjs`.
- [x] Incluir no `npm run check`.

### Task 6 — JS da aula

- [x] `js/aula4.js`: tabs + shell + slides + envio `lessonId: 'aula4'` + `lesson-discovery.js`.
- [x] Template de anotações (plataformas · restrição · viewport · stretch).
- [x] Exemplo admin (`#gdd-example` hidden), padrão anterior.

### Task 7 — Material de apoio

- [x] Criar `assets/docs/aulas/aula04-retro-viewport/`:
  - `README.md` (passo a passo Godot 4 + tabela de resoluções + checklist)
  - opcional: captura/esquema ASCII do Display → Window
- [x] CTA de download/link na Oficina.
- [x] DOCX: **não** no MVP (README basta).

### Task 8 — Estilo e polimento

- [x] Reusar `css/aula.css`; **sem** CSS one-off (`pages/aula4.html` → `aula.css`; sem `css/aula4.css`).
- [x] Mobile: abas com `min-height` tocável; textareas `font-size: 16px` (anti-zoom iOS) — herdado do CSS compartilhado.
- [x] `prefers-reduced-motion` no discovery (media query em `aula.css` + `body.is-reduced-motion` via `lesson-discovery.js`).
- [x] CTA do `lesson-download-box` (README) empilha em 100% no mobile — regra compartilhada já em `aula.css`.

### Task 9 — Liberação e QA

- [x] Playbook `docs/playbook-liberar-aula4.md`.
- [x] QA smoke `tests/aula4-qa-smoke.mjs` (página, slides, README, secretas, redeem, álbum).
- [x] Incluir smoke no `npm run check`.
- [ ] QA ao vivo pós-liberação — checklist no playbook.

### Task 10 — Fechamento documental

- [x] Atualizar ponte em `docs/plano-aula3-homo-ludens.md` → este plano. *(feito na Task 0)*
- [x] Atualizar continuidade em `docs/plano-aula1-modulo1.md` (+ playbook de liberação).
- [x] Alinhar mocks (`api/_lib/store.js`: código `PLATAFORMA2026` + regra `aula4_concluida`; prereq `aula4 → aula3`).
- [x] Decisões congeladas + status das tasks neste arquivo (Task 0–10).
- [x] Nota de ponte para Aula 05 (abaixo).

---

## Ordem recomendada de execução

```text
Task 0–10 ✅  (implementação da Aula 04 concluída)
Liberação na turma → docs/playbook-liberar-aula4.md
Próximo currículo → Aula 05 (ClassInd / IARC / Design Saudável — ver Ponte)
```

---

## Arquivos-alvo (checklist de toque)


| Arquivo | Ação |
| :--- | :--- |
| `pages/aula4.html` | ✅ Conteúdo / abas |
| `js/aula4.js` | ✅ Envio + discovery + slides |
| `js/api.js` | ✅ Entrada `aula4` no `MODULES` |
| `js/lesson-discovery.js` | ✅ Reusado |
| `api/progress.js` | ✅ Catálogo + gate + regra + prereq path |
| `api/_lib/lesson-secret-achievements.js` | ✅ Regras `aula4` |
| `api/_lib/store.js` | ✅ Mock `PLATAFORMA2026` + prereq + regra |
| `data/game-catalog.json` | ✅ 4 conquistas |
| `assets/achievements/*aula4*` | ✅ Stubs + catalog/README |
| `assets/docs/aulas/aula04_plataformas_restricoes_slides.pptx` | ✅ |
| `assets/docs/aulas/aula04_plataformas_restricoes_slides.pdf` | ✅ |
| `assets/docs/aulas/aula04-retro-viewport/**` | ✅ README |
| `scripts/build-aula04-slides.py` | ✅ |
| `css/aula.css` | ✅ Compartilhado (sem one-off) |
| `tests/aula4-secretas-volateis-smoke.mjs` | ✅ |
| `tests/aula4-qa-smoke.mjs` | ✅ |
| `docs/playbook-liberar-aula4.md` | ✅ |
| `docs/plano-aula3-homo-ludens.md` | ✅ Ponte corrigida |
| `docs/plano-aula4-plataformas-restricoes.md` | ✅ Este plano (status) |


**Fora de escopo desta leva (MVP)**

- `Camera2D` follow, cena de teste com chão, `AnimatedSprite2D` (ficam para **Módulo 2+**, não para a Aula 05 oficial).
- Emulação fiel de PPU/VDP, shaders CRT, paletas NES/SNES obrigatórias.
- Tilemaps grandes, combate, UI completa.
- Activity bônus tipo `aula1_gdd`.
- Novas salas do Submundo / ARG além do pacote de conquistas da aula.
- Exigir hardware/console físico ou emulador na oficina.

---

## Critérios de aceite (Done da Aula 04)

1. Aluno autenticado abre `pages/aula4.html` (com gate published) e vê Fundamentos (plataformas/restrições) + Oficina de viewport/stretch + Slides — **zero** stub “em preparação”.
2. Consegue definir Viewport Width/Height (`320×180` ou `480×270`), Stretch Mode `viewport`, Aspect `keep` (e Scale Mode `integer`) e ver pixels nítidos/proporcionais no Play.
3. Documenta nas anotações: linha do tempo · restrição → criatividade · caminhos dos settings · observação ao redimensionar.
4. Aba Slides serve PPTX + PDF em `assets/docs/aulas/`, visual alinhado às aulas anteriores.
5. Envio avalia secretas no servidor; discovery via `lesson-discovery.js`.
6. Finalize grava em `lesson_paragraphs`; Grimório lista como nota de atividade `aula4`.
7. Redeem marca aula concluída, concede XP 30 e `aula4_concluida`.
8. Álbum lista as novas relíquias; secretas permanecem `?` até unlock.
9. Smokes de secretas e QA passam.

---

## Ponte — Aula 05 (próxima do Módulo 1)

> **Ementa oficial (2026-09-21):** Aula 05 = *Classificação Indicativa (ClassInd), IARC e Design Saudável* + práticas **ClassInd-dle** (Higher/Lower ao vivo) e **Adequação Reversa / Patch Note** no site (**sem Godot**). Plano: [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md).  
> A sugestão anterior (câmera / cena de teste / AnimatedSprite) fica para **Módulo 2+**.

Com o **contrato de tela** definido (viewport retrô + stretch clássico), a sequência curricular oficial:

| Tema | Por quê |
| :--- | :--- |
| **ClassInd + faixas** | Para quem o jogo pode ser publicado — aviso de conteúdo, não censura |
| **IARC + design saudável** | Formulário/selos nas lojas; feedbacks que baixam a faixa sem matar o loop |
| **Práticas no site** | ClassInd-dle (votação live) + wizard IARC / Patch Note de higienização |

Fora do MVP da Aula 05: Godot, `Camera2D`, cena de teste, `AnimatedSprite2D`, tilemaps, combate, UI completa.
---

## Decisões congeladas

> Task 0 fechada em **2026-09-13**. Implementação das Tasks 1+ pode seguir.


| Tema | Decisão |
| :--- | :--- |
| Escopo Godot | Viewport + Stretch `viewport` / `keep` / `integer`; **sem** Camera / AnimatedSprite no MVP |
| Base do projeto | Continuar projeto das **Aulas 02–03** (Player + Nearest) |
| Resoluções canônicas | Escolha guiada: `320×180` **ou** `480×270` (histórico `256×224` / `160×144` só menção) |
| Window Override | **Sim** — sugestão `1280×720` ou `960×540` |
| Scale Mode `integer` | **Obrigatório** no checklist da oficina |
| Material baixável | README + checklist em `assets/docs/aulas/aula04-retro-viewport/` |
| Slides | Obrigatório: `aula04_plataformas_restricoes_slides.pptx` + `.pdf` |
| Entrega na página | Espelho aula1–aula3: `config-notes` + `gdd-text`; grimório via `lesson_paragraphs` |
| Pacote conquistas | 1 pública + 3 secretas (Arqueólogo / Artesão da Viewport / Criatividade sob Limite) |
| Ids finais | `aula4_concluida`, `segredo_arqueologo_de_hardware`, `segredo_artesao_da_viewport`, `segredo_criatividade_sob_limite` |
| Nome da pública | **Guardião da Resolução** (`stone`, xp card 0) |
| Trailhead | Público sem novos índices cipher |
| XP redeem | **30** |
| Activity bônus | Não |
| Discovery | Reusar `js/lesson-discovery.js` |
| Pré-requisito | `aula4` exige `aula3` concluída |
| Gate no merge | **Não** — `published: false` até admin liberar |
| Códigos | Modelo atual multi-aluno + TTL; mock local `PLATAFORMA2026` |
| Ponte Aula 03 | Ementa oficial **sobrescreve** câmera/animação — Aula 04 = plataformas + viewport retrô |
| Ponte Aula 05 | Ementa oficial **sobrescreve** câmera/animação — Aula 05 = ClassInd / IARC / Design Saudável (sem Godot) |


---

## Status

- Estado atual: **Tasks 0–10 ✅ — Aula 04 implementada.**
- Liberação na turma: [`playbook-liberar-aula4.md`](./playbook-liberar-aula4.md) (gate + código). QA ao vivo só após o Mestre ligar o gate.
- Página: `pages/aula4.html` · JS: `js/aula4.js` · CSS: `css/aula.css` (sem one-off).
- Material: `assets/docs/aulas/aula04-retro-viewport/README.md`.
- Slides: `aula04_plataformas_restricoes_slides.{pptx,pdf}` · script `scripts/build-aula04-slides.py`.
- Conquistas: `aula4_concluida` (**Guardião da Resolução**) + 3 secretas · motor + smokes no `npm run check`.
- Backend: catálogo curricular · gate `published: false` · regra `aula4_concluida` · mock `PLATAFORMA2026` em `store.js`.
- Próximo currículo: **Aula 05** (ClassInd / IARC / Design Saudável · ClassInd-dle + Patch Note) — [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md).
- Predecessora: [`plano-aula3-homo-ludens.md`](./plano-aula3-homo-ludens.md).
- Fontes técnicas usadas no plano:
  - Briefing do professor (teoria 20 min + oficina Estética Retrô).
  - Godot 4 docs — *Multiple resolutions* (Stretch Mode / Aspect / Scale Mode).
  - Tabelas históricas de resolução (Atari / NES / SNES / GB / GBA) para a linha do tempo didática.
