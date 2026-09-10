# Plano de Implementação — Aula 02 (versão verdadeira)

> **Título curricular:** Aula 02: O Glossário do Desenvolvedor e o Player na Tela  
> **Tópico da ementa:** Termos específicos da área de jogos  
> **Módulo:** Módulo 1 — Fundações, Cultura e Interface (Aulas 1 a 5 · ~10h)  
> **Predecessora:** Aula 01 (Círculo Mágico + Inspector) · `docs/plano-aula1-modulo1.md`  
> **Estado no repo:** **implementado** (Tasks 0–10). Conteúdo antigo “Loops e Ritmo / Tambor” arquivado em `assets/docs/aulas/aula02-legado-tambor/` (sem rota). Gate `published` ainda **false** até o Mestre liberar — ver [`playbook-liberar-aula2.md`](./playbook-liberar-aula2.md).

Este documento é o **mapa de implementação** da Aula 02 verdadeira: conteúdo pedagógico, página, backend de progresso, conquistas e critérios de aceite.

---

## Objetivo pedagógico

Conectar o glossário operacional do desenvolvedor (**Core Loop**, **Grokking**, **Assets**) à primeira montagem de um **Jogador** na Godot 4: cena com nós, sprite, colisão, Input Map e um `player.gd` mínimo com `move_and_slide` (artefato = cena estruturada **e** personagem que se move).

### O que o aluno aprende

- Definir Core Loop, Grokking e Assets de forma operacional (não só “definição de dicionário”).
- Entender que na Godot **tudo é nó** e que **cenas são receitas** reutilizáveis.
- Montar do zero a hierarquia mínima do Player: `CharacterBody2D` → `Sprite2D` + `CollisionShape2D`.
- Mapear teclas (WASD / setas) para ações `ir_cima`, `ir_baixo`, `ir_esquerda`, `ir_direita`.
- Ligar o Input Map a um script mínimo (`move_and_slide`) para sentir o Grokking na prática.

### O que o aluno faz

- Lê a teoria visual (~20 min).
- Segue a prática guiada na Godot (~100 min).
- Registra descobertas (glossário + estrutura da cena + Input Map) na página da aula.
- Envia o registro; eventualmente resgata o código da aula no Altar.

### Artefato gerado

- A **primeira cena do Jogador** no projeto Godot do aluno (hierarquia + Input Map + script mínimo de movimento).
- Registro escrito na plataforma (anotações + síntese) amarrando glossário ↔ cena.

---

## Diagnóstico do estado atual (repo) — pós-implementação


| Área              | Situação (antes)                                                              | Situação (agora)                                                                                             |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Página / JS       | “Loops e Ritmo” + Tambor                                                      | Glossário + Oficina Player + slides; discovery compartilhado                                                 |
| Catálogo Trilha   | Título antigo                                                                 | Título/subtitle curriculares; `rewardXp: 30`                                                                 |
| Backend           | Título antigo; gate `false`                                                   | Título novo; gate `false` (admin); regra `aula2_concluida`                                                   |
| Conquistas        | Sem família `aula2`                                                           | 1 pública + 3 secretas + stubs de arte                                                                       |
| Secretas          | Só `aula1`                                                                    | Bloco `aula2` + smokes                                                                                       |
| Material download | —                                                                             | `aula02-player/README.md`                                                                                    |
| Slides            | Aula1 only                                                                    | `aula02_glossario_player_slides.{pptx,pdf}`                                                                  |
| Legado Tambor     | Na rota pública                                                               | Arquivado sem rota + [`nota-aula02-legado-tambor.md`](./nota-aula02-legado-tambor.md)                         |


---

## Padrão reutilizado da Aula 01 (não reinventar)

Manter o mesmo “contrato” de experiência:

1. **Shell + abas:** `I. Fundamentos` · `II. Oficina` · `III. Slides`.
2. **Tom Hades:** tokens, `hades-frame`, `triplet-grid`, `lesson-cta`, discovery overlay já em `css/aula.css`.
3. **Envio server-authoritative:** anotações + síntese → API avalia secretas; XP/conclusão via redeem no Altar (não confiar no cliente).
4. **Conquistas:** 1 pública de conclusão (`aulaN_concluida`) + N secretas `hidden` + `meta.family: "aula2"` + `volatile: true`.
5. **Pistas sem spoiler:** bloco curto na Oficina (“o altar reconhece…”) sem listar ids/nomes das secretas.
6. **Popup de descoberta:** reutilizar o fluxo já estabilizado na aula1 (CSS pulse; sem VFX externo).

---

## Task 0 — Perguntas e decisões — ✅ FECHADA

Decisões abaixo estão **congeladas**. Implementação das Tasks 1+ pode seguir.

### Produto / pedagogia

1. **Destino do “Tambor do Estige” (aula2 antiga)** → **(B) Arquivar**  
   - [x] (B) Arquivar em `docs/` + `assets/docs/aulas/aula02-legado-tambor/` sem rota pública  
   - ( ) (A) Apagar sem arquivo · ( ) (C) Remanejar para outra aula

2. **Escopo da prática Godot nesta aula** → **(B) Com script mínimo**  
   - [x] (B) Incluir `player.gd` mínimo com `move_and_slide` já nesta aula  
   - ( ) (A) Só cena + Input Map, sem script

3. **Material baixável** → **(A) Só README + checklist**  
   - [x] (A) Aluno cria tudo do zero na Godot; material = README + checklist em `assets/docs/aulas/aula02-player/`  
   - ( ) (B) ZIP com sprite · ( ) (C) Projeto Godot mínimo

4. **Slides** → **Obrigatório**  
   - [x] Criar deck com base no template da Aula 01; exportar PPTX + PDF em `assets/docs/aulas/`  
   - Arquivos: `aula02_glossario_player_slides.pptx` · `aula02_glossario_player_slides.pdf`  
   - Aba III wired como em `js/aula1.js`

5. **Campo de entrega na página** → **(A) Espelho aula1**  
   - [x] (A) `config-notes` + `gdd-text` (síntese) + botão finalizar, com placeholders guiando seções  
   - ( ) (B) Um textarea · ( ) (C) Formulário multi-campo

6. **Libertação na Trilha** → **Gate admin**  
   - [x] Default `aula2: published false` até o Mestre liberar; **não** publicar no merge

### Conquistas

7. **Pacote** → **(A) 1 pública + 3 secretas**

8. **Conquista pública** → congelada  
   - Id: `aula2_concluida`  
   - Nome: **Primeiro Passo do Herói**  
   - Rarity: `stone` · xp card: `0` (XP vem do redeem da aula = **30**)  
   - Trailhead: **sim** (calibrar índices na Task 4 sem quebrar anagrama)

9. **Secretas** → **tríade aceita**

| Id | Nome | Evidência no texto | Rarity / XP |
| :--- | :--- | :--- | :--- |
| `segredo_lexico_do_desenvolvedor` | Léxico do Desenvolvedor | Core Loop + Grokking + Assets | silver / 15 |
| `segredo_arquiteto_de_cenas` | Arquiteto de Cenas | Hierarquia Player + cena-como-receita | gold / 15 |
| `segredo_cartografo_do_input` | Cartógrafo do Input | Ações `ir_*` + WASD/setas ou Input Map | rainbow / 25 |

10. **XP redeem da aula** → **30** (igual aula1)

11. **Atividade bônus tipo `aula1_gdd`?** → **Não** (só redeem + secretas no envio)

### Técnico

12. **Regras secretas** → estender `api/_lib/lesson-secret-achievements.js` com bloco `aula2`

13. **Discovery UI** → **extrair** `js/lesson-discovery.js` compartilhado; `aula1.js` e `aula2.js` consomem

14. **Testes** → smoke `aula2-secretas-volateis` + atualizar smokes que fixam “Loops e Ritmo”

15. **Códigos / Altar** → modelo atual (`redeem_codes` + TTL; multi-aluno)

---

## Conteúdo canônico (texto-fonte para a página)

### Fundamento teórico (~20 min)

Apresentar de forma **visual e intuitiva** (triplet-cards + uma frase operacional cada):


| Termo         | Definição operacional (para a página)                                                                                                                                    | Gancho visual sugerido                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **Core Loop** | O ciclo básico que o jogador repete: **andar → coletar → avançar** (ou o loop equivalente do jogo). Se o loop não for claro, o jogo “não ensina o que fazer em seguida”. | Diagrama circular de 3 setas          |
| **Grokking**  | O momento em que os controles saem da cabeça e entram na **memória muscular** — o jogador para de “pensar as teclas” e só joga.                                          | Ícone de mãos / teclado “automático”  |
| **Assets**    | As **imagens, sons e demais recursos** que o jogo consome (sprites, áudios, fontes). Na Godot, vivem no FileSystem e são referenciados por nós.                          | Stack de arquivo imagem + onda de som |


Fechamento teórico → ponte para a prática:  
*“Glossário nomeia o ofício; a cena do Player é o primeiro lugar onde esses termos viram estrutura.”*

### Prática na Godot (~100 min)

1. **Cenas e Nós** — tudo é nó; cena = receita de bolo com esses nós.
2. **Cena do Jogador do zero**
  - Raiz: `CharacterBody2D`  
  - Filho: `Sprite2D` (textura placeholder — aluno pode usar ícone/cor sólida da Godot)  
  - Filho: `CollisionShape2D` (shape adequado, ex. `RectangleShape2D` / `CapsuleShape2D`)
3. **Input Map** — Project → Project Settings → Input Map
  - Ações: `ir_cima`, `ir_baixo`, `ir_esquerda`, `ir_direita`  
  - Teclas: W/A/S/D **ou** setas
4. **Script mínimo** — anexar `player.gd` ao `CharacterBody2D` lendo as ações `ir_*` e chamando `move_and_slide` (sem câmera follow, sem jump avançado).

### Artefato

Checklist visível na Oficina: cena salva (ex. `player.tscn`), hierarquia correta, Input Map com as 4 ações, script mínimo rodando no Play.

---

## Pacote de conquistas (proposta detalhada)

> Fonte editável: `data/game-catalog.json`. Regras secretas: `api/_lib/lesson-secret-achievements.js` (não publicar aliases no JSON).

### Pública


| Id                | Nome                    | Desc (álbum)                                                       | hidden | rarity | xp card | Gatilho                                     |
| ----------------- | ----------------------- | ------------------------------------------------------------------ | ------ | ------ | ------- | ------------------------------------------- |
| `aula2_concluida` | Primeiro Passo do Herói | Estruturou o Jogador na engine e aportou o rito da segunda trilha. | false  | stone  | 0       | `completed_lessons` inclui `aula2` (redeem) |


### Secretas (voláteis · família `aula2`)


| Id                                | Nome                    | Desc                                                           | rarity  | xp  | Ideia do matcher                                                                                         |
| --------------------------------- | ----------------------- | -------------------------------------------------------------- | ------- | --- | -------------------------------------------------------------------------------------------------------- |
| `segredo_lexico_do_desenvolvedor` | Léxico do Desenvolvedor | Nomeou o ofício: ciclo, domínio do controle e matéria do jogo. | silver  | 15  | ≥3/3 conceitos (Core Loop / Grokking / Assets) via aliases                                               |
| `segredo_arquiteto_de_cenas`      | Arquiteto de Cenas      | Descreveu a receita do Player — corpo, imagem e colisão.       | gold    | 15  | Menções a CharacterBody2D + Sprite2D + CollisionShape2D (ou aliases PT) **e** sinal de “cena/nó/receita” |
| `segredo_cartografo_do_input`     | Cartógrafo do Input     | Cartografou o mapa de ações `ir_*` até as teclas.              | rainbow | 25  | As 4 ações `ir_*` **ou** cobertura 4 direções + “input map” / WASD / setas                               |


**Pista pública (Oficina, sem spoiler):**  
*“Pistas secretas do Submundo: defina o glossário com as próprias palavras, descreva a hierarquia do Player como quem ensina a receita, e registre as ações do Input Map. O altar reconhece quem documenta com precisão.”*

**Arte:** placeholders em `assets/achievements/` (`aula2_concluida.webp` + 3 secretas); até a arte existir, UI tipográfica + `icon` emoji (padrão atual).

**Trailhead:** calibrar `nameIndexes` / `descIndexes` na Task 4 **sem** quebrar o anagrama já publicado das conquistas públicas existentes.

---

## Tasks de implementação

Legenda: `[ ]` pendente · `[~]` parcial · `[x]` feito

### Task 0 — Decisões

- [x] Responder perguntas e marcar decisões.
- [x] Congelar nomes/ids das conquistas e escopo Godot (com `player.gd` mínimo).
- [x] Bloco **Decisões congeladas** preenchido no final deste doc.

### Task 1 — Catálogo e Trilha (front)

- [x] Atualizar em `js/api.js` → `MODULES` entrada `aula2`:  
  - title: `O Glossário do Desenvolvedor e o Player na Tela`  
  - subtitle: `Core Loop, Grokking, Assets · Cenas, Nós, Input Map e movimento mínimo`  
  - `rewardXp: 30`
- [x] Garantir card na `pages/aulas.html` / `js/lessons-ui.js` reflete o novo copy quando `published` (consome `MODULES`/`LESSONS` — sem hardcode).
- [x] Atualizar smoke: `tests/phase5-pages-smoke.mjs` passa a assertar o título/subtitle novos e rejeitar “Loops e Ritmo”.

### Task 2 — Backend de lição

- [x] `api/progress.js` → `LESSON_CATALOG.aula2.lessonTitle` alinhado ao título novo.
- [x] Manter `LESSON_GATES.aula2.published = false` (até admin liberar).
- [x] Adicionar regra `ACHIEVEMENT_RULES` para `aula2_concluida` (espelho `aula1_concluida`).
- [x] Confirmar redeem: `action: 'redeem'` já é genérico — valida `LESSON_CATALOG[lesson_id]`, faz push em `completed_lessons` e chama `recalculateAchievements()`; com a nova regra, código de `aula2` dispara `aula2_concluida` (+ XP 30 da linha do código). Entrada no Álbum/`game-catalog.json` fica na Task 4.

### Task 3 — Página e conteúdo (`pages/aula2.html`)

- [x] Reescrever meta/title/header: Módulo 1 + título curricular novo.
- [x] Aba **I. Fundamentos:** Core Loop, Grokking, Assets (triplet + texto curto + ponte para prática).
- [x] Aba **II. Oficina:** Cenas/Nós → montagem Player → Input Map → `player.gd` mínimo → checklist do artefato → link README → anotações + síntese + CTA enviar.
- [x] Aba **III. Slides:** markup espelho aula1 (download PPTX/PDF, viewer Office, fallback PDF, painel local).
- [x] Remover DOM do Tambor (`#game-canvas` e copy de loops/ritmo).
- [x] Incluir markup do discovery overlay (igual aula1).
- [x] Footer: `Módulo 1 · Aula 02`.
- [x] Smoke `phase5-pages-smoke` reforçado (sem Tambor; com discovery + anotações + slides).

### Task 3b — Slides (criar + exportar)

> Dependência: conteúdo canônico da aula (glossário + prática) já fechado na Task 0 / rascunho da Task 3.  
> Referência visual: deck da Aula 01 (`aula01_godot_slides.pptx`) — **reusar layout, cores, tipografia e densidade**; trocar só o conteúdo.

- [x] Abrir o PPTX da Aula 01 como template (tema/master preservados via `scripts/build-aula02-slides.py`).
- [x] Montar o roteiro de 15 slides (capa → glossário → Godot/Player → Input Map → script → checklist → fechamento).
- [x] Revisar tom/copy alinhado à página (sem spoilar secretas).
- [x] **Exportar PDF** via PowerPoint COM: `aula02_glossario_player_slides.pdf`.
- [x] Salvar **ambos** em `assets/docs/aulas/`.
- [x] Regenerável: `py scripts/build-aula02-slides.py`.
- [x] Constantes `PPTX_FILE` / `PDF_FILE` em `js/aula2.js` (viewer completo na Task 6).
- [x] Smoke `phase5` verifica existência PPTX/PDF + constante no JS.

### Task 4 — Conquistas no catálogo

- [x] Inserir as 4 entradas em `data/game-catalog.json` (pública + 3 secretas).
- [x] Preencher `meta: { family: "aula2", kind: "content", volatile: true }` nas secretas.
- [x] Calibrar trailhead: **sem** índices em `aula2_concluida` — o anagrama `TARTARO OCULTO` já está completo em `aula1_concluida` + `gdd_integracao_documental`; novos cipher quebrariam o smoke/ARG.
- [x] Stubs WebP em `assets/achievements/` + entradas em `catalog.json` + README.
- [x] Álbum: secretas `hidden` entram como slots `?` via `getAlbumSlotModel` (sem mudança de UI).

### Task 5 — Motor de secretas

- [x] Em `api/_lib/lesson-secret-achievements.js`, criar:
  - alias groups: CORE_LOOP, GROKKING, ASSETS;
  - alias groups: nós do Player + “cena/receita/nó”;
  - matcher Input Map (`ir_*` + direções + input map / wasd / setas);
  - `AULA2_SECRET_THRESHOLDS`;
  - entradas em `LESSON_SECRET_RULES.aula2`.
- [x] Garantir `allLessonSecretIds()` passa a incluir os novos ids.
- [x] Smoke: `tests/aula2-secretas-volateis-smoke.mjs` (positivos + negativos + normalização acento).
- [x] Incluir smoke no script `npm run check`.

### Task 6 — JS da aula + discovery compartilhado

- [x] Criar `js/lesson-discovery.js` extraindo popup/fila/pulse da aula1.
- [x] Refatorar `js/aula1.js` para consumir o helper (sem regressão visual).
- [x] Reescrever `js/aula2.js`: remover Tambor; tabs + boot shell/sessão.
- [x] Wire `initSlidesViewer` com `PPTX_FILE` / `PDF_FILE` da aula2.
- [x] Wire envio de anotações/síntese + discovery via helper, `lessonId: 'aula2'`.
- [x] Template de anotações: Glossário · Hierarquia · Input Map · Script/movimento · Observações.
- [x] Placeholder da síntese pedindo amarração glossário ↔ Player (já no HTML; JS não sobrescreve).
- [x] Exemplo pronto só para admin (`gdd-example` hidden), padrão aula1.
- [x] `getLessonCode` não existe na UX da aula1 — omitido (redeem só no Altar).
- [x] Smokes/art + `node --check` para `aula2.js` / `lesson-discovery.js`.

### Task 7 — Material de apoio

- [x] Criar `assets/docs/aulas/aula02-player/README.md` + checklist do artefato (passo a passo Godot 4, **sem** ZIP de sprite).
- [x] Incluir no README o snippet mínimo sugerido de `player.gd` (para o aluno digitar/adaptar).
- [x] Link “Material da atividade” na Oficina apontando para a pasta/README (já em `pages/aula2.html`).
- [x] Arquivar legado Tambor em `assets/docs/aulas/aula02-legado-tambor/` + nota `docs/nota-aula02-legado-tambor.md` (sem rota pública).

### Task 8 — Estilo e polimento

- [x] Reusar `css/aula.css`; **sem** CSS one-off de diagrama — Core Loop/Player usam `triplet-grid` existente.
- [x] Mobile: abas com `min-height` tocável; textareas com `font-size: 16px` (anti-zoom iOS), `min-height`, `max-width: 100%`, `resize: vertical`.
- [x] `prefers-reduced-motion` no discovery (media query) + espelho via `body.is-reduced-motion` do `lesson-discovery.js`.

### Task 9 — Liberação e QA

- [x] Playbook admin: [`docs/playbook-liberar-aula2.md`](./playbook-liberar-aula2.md) — gerar código redeem + `setLessonGate(aula2, published, true)` **na hora da turma** (gate default permanece `false` no merge).
- [x] QA automatizada (`tests/aula2-qa-smoke.mjs`):
  - [x] Página renderiza conteúdo novo; Tambor só no arquivo legado.
  - [x] Aba Slides + constantes PPTX/PDF + arquivos em `assets/docs/aulas/`.
  - [x] README oficina (cena + Input Map + `player.gd`).
  - [x] Discovery compartilhado (aula1 + aula2 → `lesson-discovery.js`).
  - [x] Envio sem keywords → 0; glossário → Léxico; hierarquia → Arquiteto; Input → Cartógrafo.
  - [x] Contrato redeem: `aula2_concluida` + XP 30 + gate `published:false` default.
  - [x] Álbum: 3 secretas `hidden` + arte stub da pública.
  - [x] Exemplo admin no DOM (`#gdd-example` hidden).
- [x] Smokes rodados: `aula2-qa`, `aula2-secretas-volateis`, `game-catalog`, `phase5-pages`.
- [ ] QA ao vivo pós-liberação (toast no browser / redeem real) — checklist no playbook, quando o Mestre ligar o gate.

### Task 10 — Fechamento documental

- [x] Atualizar `docs/plano-aula1-modulo1.md` com ponte explícita para Aula 02 (e playbook de liberação).
- [x] Alinhar títulos legados em `api/_lib/store.js` (mock) ao currículo novo; legado Tambor permanece só em `aula02-legado-tambor/` + notas.
- [x] Decisões congeladas e status das tasks marcados neste arquivo.
- [x] Nota de ponte para Aula 03 (abaixo).

---

## Ponte — Aula 03 (próxima do Módulo 1)

A Aula 02 deixa o Player **andando** com Input Map + `move_and_slide`. A sequência natural:

| Tema sugerido | Por quê |
| :--- | :--- |
| **Câmera follow** (`Camera2D` no Player ou cena de teste) | O Viewport deixa de “perder” o herói |
| **Cena de teste** (chão / `StaticBody2D` + instancia do `player.tscn`) | Colisão e sensação de mundo mínimo |
| **Polish de movimento** (aceleração, freio, ou export no Inspector) | Amarra de novo Inspector ↔ feel (eco da Aula 01) |

Fora do MVP da Aula 03 (a menos que o currículo diga o contrário): jump completo, animações, tilemaps grandes.

Quando houver ementa oficial da Aula 03, abrir `docs/plano-aula3-*.md` no mesmo formato (Task 0 → conquistas → página).

---

## Ordem recomendada de execução

```
Task 0–10 ✅  (implementação da Aula 02 verdadeira concluída)
Liberação na turma → docs/playbook-liberar-aula2.md
Próximo currículo → Aula 03 (câmera / cena de teste / polish)
```

---

## Arquivos-alvo (checklist de toque)


| Arquivo                                                 | Ação                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `pages/aula2.html`                                      | Reescrever conteúdo / abas / remover Tambor                |
| `js/lesson-discovery.js`                                | **Criar** — popup/fila/pulse compartilhado                 |
| `js/aula1.js`                                           | Consumir `lesson-discovery.js` (sem regressão)             |
| `js/aula2.js`                                           | Reescrever; wire envio + discovery + slides                |
| `js/api.js`                                             | Título/subtitle aula2 no `MODULES`                         |
| `api/progress.js`                                       | `LESSON_CATALOG` + regra `aula2_concluida`                 |
| `api/_lib/lesson-secret-achievements.js`                | Regras `aula2`                                             |
| `data/game-catalog.json`                                | 4 conquistas                                               |
| `assets/achievements/*aula2*`                           | Arte / stubs                                               |
| `assets/docs/aulas/aula01_godot_slides.pptx`            | **Fonte/template** visual (não alterar o arquivo da aula1) |
| `assets/docs/aulas/aula02_glossario_player_slides.pptx` | **Criar** deck aula2                                       |
| `assets/docs/aulas/aula02_glossario_player_slides.pdf`  | **Exportar** a partir do PPTX                              |
| `assets/docs/aulas/aula02-player/README.md`             | Material prático (README + checklist + snippet `player.gd`) |
| `assets/docs/aulas/aula02-legado-tambor/**`             | Arquivo do Tambor (sem rota)                               |
| `css/aula.css`                                          | Só se faltar peça visual compartilhada                     |
| `tests/aula2-secretas-volateis-smoke.mjs`               | Criar                                                      |
| `tests/*aula*` / `tests/game-catalog-smoke.mjs`         | Ajustar asserts antigos                                    |
| `docs/plano-aula2-glossario-player.md`                  | Este plano (status)                                        |


**Fora de escopo desta leva**

- Câmera follow, jump avançado, animações de sprite.
- Remanejar Tambor para outra aula numerada (fica só arquivado).
- ZIP de sprite / projeto Godot completo.
- Activity bônus tipo `aula1_gdd`.
- Novas salas do Submundo / ARG além do trailhead calibrado.

---

## Critérios de aceite (Done da Aula 02)

1. Aluno autenticado abre `pages/aula2.html` (com gate published) e vê o glossário + oficina Godot do Player — **zero** menção a Tambor/Loops como conteúdo principal.
2. Consegue seguir o README e montar a cena `CharacterBody2D` + `Sprite2D` + `CollisionShape2D` + Input Map `ir_*` + `player.gd` com `move_and_slide`.
3. Aba Slides serve o deck novo: PPTX + PDF em `assets/docs/aulas/`, visual alinhado aos slides da Aula 01, com download e viewer/fallback.
4. Envio de anotações avalia secretas no servidor; popup de descoberta (via `lesson-discovery.js`) funciona em aula1 e aula2.
5. Redeem do código marca aula concluída, concede XP 30 e `aula2_concluida`.
6. Álbum lista as novas relíquias; secretas permanecem `?` até unlock.
7. Smokes de secretas e catálogo passam.

---

## Decisões congeladas

> Task 0 fechada em 2026-09-10 · implementação Tasks 1–10 concluída na mesma data.


| Tema | Decisão |
| :--- | :--- |
| Destino Tambor | **Arquivar** em `assets/docs/aulas/aula02-legado-tambor/` + nota em `docs/` (sem rota) |
| Escopo Godot | Cena Player + Input Map + **`player.gd` mínimo com `move_and_slide`** |
| Material baixável | **Só README + checklist** em `aula02-player/` (sem ZIP de sprite) |
| Slides | Template aula1 → `aula02_glossario_player_slides.pptx` + `.pdf` em `assets/docs/aulas/` |
| Entrega na página | Espelho aula1: `config-notes` + `gdd-text` + placeholders de seção |
| Pacote conquistas | 1 pública + 3 secretas (tríade Léxico / Arquiteto / Cartógrafo) |
| Ids finais | `aula2_concluida`, `segredo_lexico_do_desenvolvedor`, `segredo_arquiteto_de_cenas`, `segredo_cartografo_do_input` |
| Trailhead | Público sem novos índices cipher (anagrama permanece só em aula1 + GDD) |
| XP redeem | **30** |
| Activity bônus | Não |
| Discovery | Extrair `js/lesson-discovery.js` (aula1 + aula2) |
| Gate no merge | **Não** — `published: false` até admin liberar |
| Códigos | Modelo atual multi-aluno + TTL |


---

## Status

- Estado atual: **Tasks 0–10 ✅ — Aula 02 verdadeira implementada.**
- Liberação na turma: [`playbook-liberar-aula2.md`](./playbook-liberar-aula2.md) (gate + código).
- Próximo currículo: **Aula 03** (câmera follow / cena de teste / polish de movimento) — ver seção *Ponte* acima.
- Legado Tambor: [`nota-aula02-legado-tambor.md`](./nota-aula02-legado-tambor.md).

