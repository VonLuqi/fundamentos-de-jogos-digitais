# Plano de Implementação — Aula 07 (Módulo 2)

> **Título curricular:** Aula 07: Papéis na Indústria, Workflow e Versionamento Visual  
> **Tópico da ementa:** Papéis no desenvolvimento de jogos e Workflow de desenvolvimento  
> **Módulo:** Módulo 2 — Introdução ao GDScript “Do Zero” (Aulas 6 a 10 · ~10h)  
> **Predecessora:** Aula 06 (mercado + loja ética) · [`plano-aula6-mercado-loja-etica.md`](./plano-aula6-mercado-loja-etica.md)  
> **Estado no repo:** **Task 0–8 ✅** (2026-09-28) — Aula 07 completa no repo (página, material, catálogo, conquistas, slides, playbook, smokes, pontes); pendente: liberar gate na turma + QA manual do playbook.  
> **Duração prevista:** ~120 min (Fundamento teórico ~20 min · Prática Godot / equipe ~100 min)  
> **Diferença-chave:** **aula de processo + kickoff do projeto integrador** — papéis de estúdio, anti–Scope Creep, divisão oficial em **equipes de 3**, quadro de tarefas e **versionamento visual** (pastas/cenas Godot na pasta compartilhada). GDScript avançado / Labirinto jogável completo **não** são o MVP desta aula.

Este documento é o **mapa de implementação** da Aula 07: conteúdo pedagógico, oficina de equipe + Godot (organização), página da aula, material baixável (quadro + guia de pastas), backend de progresso, conquistas e critérios de aceite.

---

## Objetivo pedagógico

Fazer o aluno **enxergar o estúdio como sistema de papéis** (Programação, Arte, Áudio, Game Design, Produção), entender por que **workflow em etapas** evita o acúmulo descontrolado de ideias (**Scope Creep**), e **congelar** a formação das equipes do projeto integrador **“O Labirinto de Moedas 2D”** com um quadro simples de quem faz o quê — mais um hábito seguro de **salvar e organizar** cenas/arquivos Godot na pasta compartilhada.

### O que o aluno aprende

- Nomear e explicar, com as próprias palavras, os **cinco papéis fundamentais** de um estúdio: Programação, Arte, Áudio, Game Design e Produção.
- Relacionar cada papel a **entregáveis concretos** (código, sprites, SFX/música, GDD/regras, cronograma/escopo).
- Definir **Scope Creep**: crescer o escopo sem cortar ou priorizar — e por que isso mata projetos de sala / indie.
- Descrever um **workflow mínimo** em etapas (ideia → escopo fechado → produção por papel → integração → playtest).
- Na Godot 4: organizar o projeto em **pastas e nomes canônicos**, salvar cenas com responsabilidade, e sincronizar com a **pasta compartilhada da equipe** sem sobrescrever o trabalho do colega (“versionamento visual”).

### O que o aluno faz

- Lê/assiste o fundamento teórico (~20 min) na aba Fundamentos (ou slides).
- Entra na oficina (~100 min): forma **equipe de 3**; preenche o **Quadro de Atribuição** (arte do cenário · moedas · movimentação básica do jogador); monta a **estrutura de pastas** do Labirinto no projeto Godot; copia/organiza na pasta compartilhada; registra papéis + cronograma curto nas anotações.
- Finaliza o envio em `lesson_paragraphs`. No Grimório, a entrega aparece como nota de atividade (`activity:aula7`).
- Eventualmente resgata o código da aula no Altar.

### Artefato gerado

- **Quadro físico ou digital** de atribuição de papéis + **cronograma de tarefas** da equipe (template baixável + cópia nas anotações / foto ou link opcional).
- Estrutura inicial do projeto **Labirinto de Moedas 2D** no FileSystem Godot (pastas + cenas-esqueleto acordadas).
- Registro escrito na plataforma amarrando papéis ↔ escopo fechado ↔ como a equipe versiona arquivos.

---

## Visão do Módulo 2 (contexto)


| Aula | Título (ementa) | Foco GDScript / prática |
| :---: | --- | --- |
| **06** | Mercado, PI e Monetização Ética | UI Control + loja cosmética com moedas in-game |
| **07** | Papéis, Workflow e Versionamento Visual | Equipes · quadro de papéis · pastas/cenas Godot · anti–Scope Creep *(esta aula)* |
| **08** | *(a definir)* | Continuação Labirinto / GDScript |
| **09** | *(a definir)* | … |
| **10** | *(a definir)* | … |

**Contrato de experiência (espelho Módulo 1 / Aula 06):** abas *I. Fundamentos · II. Oficina · III. Slides*; envio server-authoritative; XP via Altar; 1 conquista pública + secretas por aula; gate `published: false` até o Mestre liberar.

> **Ponte Aula 06:** a loja ética da Aula 06 **não** precisa ser integrada ao Labirinto nesta aula. Integração loja↔fase / cosmético no Player fica para **08+** quando a ementa pedir. Aqui o foco é **equipe + escopo + pastas**.

---

## Diagnóstico do estado atual (repo)


| Área | Situação hoje | Alvo Aula 07 |
| --- | --- | --- |
| Página / JS | `pages/aula7.html` + `js/aula7.js` ✅ | Playbook (Task 6) |
| Catálogo Trilha | `modulo2` com `aula6` + `aula7` ✅ | Gate false até liberar |
| Backend aulas | `LESSON_CATALOG` + gate + prereq `aula6` + mock `EQUIPE2026` ✅ | Playbook |
| Godot material | `aula07-equipe-labirinto/` ✅ | Playbook |
| Conquistas | 1 pública + 3 secretas `aula7` ✅ | Playbook (Task 6) |
| Slides | `aula07_papeis_workflow_slides.{pptx,pdf}` ✅ | Smokes + pontes (Tasks 7–8) |
| Conteúdo Módulo 2 | [`conteudo-modulo2-gdscript-do-zero.md`](./conteudo-modulo2-gdscript-do-zero.md) ✅ | Aulas 08–10 TBD |
| Ponte Aula 06 | Link oficial para este plano ✅ | — |
| Playbook | [`playbook-liberar-aula7.md`](./playbook-liberar-aula7.md) ✅ | Liberar gate na turma |


---

## Padrão reutilizado das Aulas 01–06 (não reinventar)

1. **Shell + abas:** `I. Fundamentos` · `II. Oficina` · `III. Slides`.
2. **Tom Hades:** tokens, `hades-frame`, `triplet-grid`, `lesson-cta`, discovery overlay em `css/aula.css`.
3. **Envio server-authoritative:** anotações + síntese → API avalia secretas; XP/conclusão via redeem no Altar.
4. **Grimório lê atividades:** `listMyLessonParagraphs` + notas virtuais (`activity:aula7`); sem `createNote` no finalize.
5. **Conquistas:** 1 pública (`aula7_concluida`) + 3 secretas `hidden` + `meta.family: "aula7"` + `volatile: true`.
6. **Pistas sem spoiler:** bloco curto na Oficina sem listar ids/nomes das secretas.
7. **Discovery:** reutilizar `js/lesson-discovery.js`.
8. **Gate admin:** `published: false` no merge; liberar só na turma (playbook espelho da aula6).

---

## Task 0 — Perguntas e decisões — ✅ FECHADA

Decisões abaixo estão **congeladas** (2026-09-28). Implementação das Tasks 1+ pode seguir.

### Produto / pedagogia

1. **Escopo Godot nesta aula** → **(A) Pastas + cenas-esqueleto**  
   - [x] **(A)** Só **estrutura de pastas + cenas-esqueleto vazias** (`cenas/player.tscn`, `cenas/moeda.tscn`, `cenas/cenario.tscn`) + README de nomes — **sem** exigir movimento/coleta jogável hoje  
   - ( ) (B) Player com movimento mínimo — **adiado** (Aula 08+)  
   - ( ) (C) Zero Godot — rejeitado (fere a ementa prática)

2. **Base do projeto do aluno** → **(A) Projeto novo do Labirinto**  
   - [x] **(A)** **Projeto novo** `LabirintoDeMoedas/` — limpo para o integrador; loja da Aula 06 permanece no projeto antigo  
   - ( ) (B) Continuar projeto Aulas 02–06 — plano B só se a turma insistir em um único `.godot`  
   - ( ) (C) ZIP stub do curso — fora do MVP (material = README + árvore)

3. **Formação de equipes** → **(A) Lista oficial do Mestre**  
   - [x] **(A)** Mestre sorteia / lista oficial no início da oficina; **3 alunos fixos**; ímpar → dupla + “produtor itinerante” **ou** grupo de 4 com 2 na arte  
   - ( ) (B) Escolha livre · ( ) (C) Sem equipe — rejeitados

4. **Mapeamento papéis estúdio → trio de sala** → **tabela aceita**

   | Papel de estúdio (teoria) | No trio de sala (prática) | Entrega desta aula |
   | :--- | :--- | :--- |
   | Arte | Aluno A — **Artista de cenário** | Pastas `sprites/` / `cenas/cenario.tscn` (placeholder ok; raiz `Node2D`) |
   | Programação | Aluno B — **Programador do Player** | `cenas/player.tscn` (raiz `CharacterBody2D`, **sem** script de movimento obrigatório) |
   | Game Design + “props” | Aluno C — **Designer de moedas / regras** | `cenas/moeda.tscn` (raiz `Area2D` ou `Node2D`) + anotar regra: quantas moedas / vitória |
   | Áudio | *(compartilhado / stub)* | Pasta `audio/` vazia + 1 linha no quadro: “SFX depois” |
   | Produção | **Rotativo do dia** (um dos três) | Dono do quadro + pasta compartilhada + cronograma |

   - [x] Tabela aceita (raízes de cena congeladas acima)

5. **Formato do quadro (artefato)** → **(A) Template Markdown imprimível**  
   - [x] **(A)** `assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md` (+ PDF opcional na Task 2 se couber) + alunos colam resumo nas anotações  
   - ( ) (B) Planilha Google/Canva · ( ) (C) Só texto livre — fora do MVP

6. **“Versionamento visual” — profundidade** → **(A) Pasta compartilhada + convenções**  
   - [x] **(A)** Pasta compartilhada (Drive / OneDrive / rede) + convenção de pastas + **não editar a mesma `.tscn` ao mesmo tempo** + ZIP datado de backup + checklist o que versionar / ignorar (`.godot/`)  
   - ( ) (B) Git intro — **só teaser verbal** no slide/README (“existe Git; não é obrigatório hoje”)  
   - ( ) (C) Só discurso — rejeitado

7. **Contrato de escopo do Labirinto (anti–Scope Creep)** → **MVP aceito**

   | No escopo (MVP Labirinto) | Fora do escopo (até o Mestre liberar) |
   | :--- | :--- |
   | Player move em 4 direções (**Aula 08+**) | Combate, NPCs, diálogos |
   | Moedas coletáveis + contador (**Aula 08+**) | Loja da Aula 06 integrada |
   | Cenário tilemap ou sprites estáticos (**08+**) | Multiplayer, save cloud |
   | 1 tela / 1 fase curta | Campanha, bosses, cutscenes |
   | **Papéis + pastas + quadro + stubs** (**hoje**) | Áudio polido, particles, shaders |

   - [x] MVP aceito como contrato citado na página/slides

8. **Material baixável** → **(A) README + quadro + árvore**  
   - [x] **(A)** `aula07-equipe-labirinto/` com `README.md` + `quadro-atribuicao.md` + `estrutura-pastas.txt`  
   - ( ) (B) ZIP stub Godot — fora do MVP  
   - ( ) (C) Só quadro — rejeitado

9. **Slides** → **Obrigatório**  
   - [x] Template → `aula07_papeis_workflow_slides.pptx` + `.pdf`  
   - [x] Script: `scripts/build-aula07-slides.py`

10. **Campo de entrega** → **(A) Espelho aula1–aula6**  
    - [x] **(A)** `config-notes` + `gdd-text` + finalizar  
    - ( ) (B) Um textarea · ( ) (C) Upload de arquivo — fora do MVP (link/foto do quadro opcional **dentro** do texto)

11. **Pré-requisito de liberação** → **(B) `aula6` concluída**  
    - [x] **(B)** `LESSON_PREREQUISITES.aula7 → aula6`  
    - Provação do Módulo 1 **não** bloqueia a trilha automaticamente na v1  
    - ( ) (A) Sem prereq · ( ) (C) Exigir também Provação M1

12. **Libertação na Trilha** → **Gate admin**  
    - [x] Default `aula7: published false` até o Mestre liberar; **não** publicar no merge

### Conquistas

13. **Pacote** → **(A) 1 pública + 3 secretas** (`meta.family: "aula7"`, secretas `volatile: true`)

14. **Conquista pública** → congelada  

    | Campo | Valor |
    | :--- | :--- |
    | Id | `aula7_concluida` |
    | Nome | **Cartógrafo da Equipe** |
    | Rarity | `stone` · xp card `0` (XP do redeem = **30**) |
    | Trailhead | **não** |

15. **Secretas** → **tríade aceita**

| Id | Nome | Evidência no texto | Rarity / XP |
| :--- | :--- | :--- | :--- |
| `segredo_cinco_oficios` | Cinco Ofícios | Cita ≥2 papéis de estúdio (prog/arte/áudio/design/produção) com função | silver / 15 |
| `segredo_cercado_do_escopo` | Cercado do Escopo | Menciona Scope Creep **ou** corta explicitamente algo fora do MVP | gold / 15 |
| `segredo_pasta_sagrada` | Pasta Sagrada | Descreve pastas Godot / cena salva / pasta compartilhada / regra anti-sobrescrita | rainbow / 25 |

### Técnico (plataforma)

16. **Id da aula / módulo** → `aula7` / `modulo2`  
17. **Código mock de redeem** → `EQUIPE2026`  
18. **rewardXp** → **30** (espelho aula4–aula6)  
19. **Regras secretas** → estender `api/_lib/lesson-secret-achievements.js` com bloco `aula7`  
20. **Discovery UI** → reutilizar `js/lesson-discovery.js`  
21. **Testes** → smoke `aula7-secretas-volateis` + `aula7-qa-smoke`; incluir em `npm run check`  
22. **Códigos / Altar** → modelo atual (`redeem_codes` + TTL; multi-aluno)  
23. **Playbook** → `docs/playbook-liberar-aula7.md` (Task 6)  
24. **Persistência de equipe na plataforma** → **(A) Sem backend de times**  
    - [x] **(A)** Quadro + anotações bastam na v1  
    - ( ) (B) API de times — adiado  
25. **Nome canônico do projeto Godot** → **`LabirintoDeMoedas`**  
    - [x] Pasta/projeto: `LabirintoDeMoedas`  
    - Pasta compartilhada sugerida: `LabirintoDeMoedas_<NomeEquipe>`

**Raízes de cena (contrato de sala)**

| Cena | Tipo raiz |
| :--- | :--- |
| `cenas/player.tscn` | `CharacterBody2D` |
| `cenas/moeda.tscn` | `Area2D` *(preferencial)* ou `Node2D` |
| `cenas/cenario.tscn` | `Node2D` |

**Checklist Task 0**

- [x] Todas as decisões 1–25 marcadas / congeladas  
- [x] Escopo Godot **(A)** e quadro **(A)** confirmados  
- [x] Documento atualizado com “congelado em 2026-09-28”

**Aceite Task 0:** decisões congeladas; Tasks 1+ desbloqueadas.

---

## I. Fundamento teórico (~20 min)

### Roteiro de fala (professor / página)

#### 1. Quem faz o quê num estúdio — ~8 min

| Papel | Pergunta que responde | Entregável típico |
| :--- | :--- | :--- |
| **Game Design** | O que é divertido e quais as regras? | GDD curto, loops, balanço |
| **Programação** | Como o jogo *funciona* na engine? | Scripts, cenas jogáveis, bugs |
| **Arte** | O que se vê (e a identidade visual)? | Sprites, tiles, UI, animações |
| **Áudio** | O que se ouve e sente? | SFX, música, feedback sonoro |
| **Produção** | Quando, com quem, até onde? | Cronograma, escopo, rituais de sync |

Mensagem: em indie / sala de aula, **a mesma pessoa veste vários chapéus** — mas o quadro ainda nomeia **dona(o) de cada entrega**, senão ninguém é dono.

#### 2. Workflow em etapas (evitar caos) — ~5 min

```text
Ideia → Escopo fechado (MVP) → Produção por papel → Integração → Playtest → Corte ou próximo incremento
```

- Sem **escopo fechado**, cada ideia nova empurra o prazo.  
- Integração cedo > “cada um no seu ZIP até a véspera”.  
- Playtest curto revela se a meta (coletar moedas no labirinto) está clara.

#### 3. Scope Creep — o monstro amigável — ~5 min

- **Scope Creep:** o projeto cresce em ideias **sem** cortar tempo, pessoas ou features.  
- Sintomas: “só mais um inimigo”, “e se tiver loja?”, “e se for online?”.  
- Antídoto: **lista do que está fora**; produção como **guarda do cercado**; dizer não com carinho.

#### Frase de fechamento teórico

> *Um labirinto pequeno e terminado ensina mais que um mundo aberto abandonado. Hoje vocês escolhem papéis, fecham o cercado do escopo e aprendem a não apagar o trabalho do colega na pasta compartilhada.*

#### Referências rápidas (professor / slides)

- Ementa: papéis · workflow · Scope Creep [124][205] · versionamento organizado [84].  
- Eco Aula 06: loja ética existe, mas **não** entra no MVP do Labirinto hoje.  
- Continuum: Aula 06 → **Aula 07 (equipe + escopo)** → Aula 08+ (construir o Labirinto).

---

## II. Prática — “Minha Equipe, Meu Escopo” (~100 min)

> Roteiro canônico da oficina. Página `aula7` e README baixável devem espelhar estes passos.

### Atividade

1. Divisão oficial em **equipes de 3** para o projeto integrador **“O Labirinto de Moedas 2D”**.  
2. Preencher o **Quadro de Atribuição** (quem: cenário · moedas · movimentação).  
3. Introduzir **versionamento visual**: pastas Godot + pasta compartilhada da equipe.  
4. Criar estrutura de pastas / cenas-esqueleto no projeto `LabirintoDeMoedas` (Task 0 = A).

### Pré-requisitos (minuto 0)

- [ ] Godot **4.x** instalada.  
- [ ] Conta/pasta compartilhada da equipe definida (Drive, OneDrive, rede, etc.).  
- [ ] Aluno logado · aba **Oficina** da Aula 07.  
- [ ] Material `aula07-equipe-labirinto/` aberto.  
- [ ] Lista de equipes do Mestre (ou regra de formação) pronta.

### O que NÃO fazer nesta aula

| Evitar | Por quê |
| :--- | :--- |
| Implementar o Labirinto jogável completo | É o integrador das próximas aulas |
| Integrar a loja da Aula 06 | Scope Creep clássico |
| Dois alunos editando a mesma `.tscn` ao vivo na pasta sync | Conflito / arquivo corrompido |
| Adicionar combate, NPCs, multiplayer | Fora do MVP |
| Prometer Git obrigatório se a turma não tem CLI | Desvia os 100 min |

### Vocabulário mínimo (quadro / slide 30s)

| Termo | Significado operacional |
| :--- | :--- |
| Papel | Responsabilidade nomeada sobre um entregável |
| Workflow | Sequência de etapas do trabalho |
| Scope Creep | Crescimento do escopo sem corte/prioridade |
| MVP | Menor versão que ainda cumpre a meta do jogo |
| Pasta compartilhada | Local único da equipe (sync) para o projeto |
| Versionamento visual | Organização + backups + regras de quem edita o quê |
| `.tscn` | Cena Godot (não editar em paralelo sem acordo) |
| `.godot/` | Cache local — **não** precisa ir para o Drive “no grito” |

### Cronograma sugerido da oficina


| Bloco | Tempo | Atividade | Resultado visível |
| :--- | :--- | :--- | :--- |
| 0. Formação | 10 min | Equipes de 3 · nomes no quadro | Trio + produtor do dia |
| 1. Quadro de papéis | 20 min | Preencher atribuições + “fora do escopo” | Quadro completo |
| 2. Cronograma curto | 15 min | 3–5 tarefas com dono e “até quando” (próximas aulas) | Cronograma no artefato |
| 3. Pastas Godot | 25 min | Criar projeto/pastas canônicas · cenas-esqueleto | FileSystem alinhado |
| 4. Pasta compartilhada | 15 min | Copiar projeto · regras de sync · backup ZIP | Pasta da equipe ok |
| 5. Registro + envio | 15 min | Anotações · síntese · finalizar | Entrega na plataforma |

**Buffer:** se a formação atrasar, encurtar Bloco 2 (cronograma “3 linhas”) e proteger Blocos 1 + 3–4.

---

### Passo a passo canônico

#### Bloco 0 — Formação de equipes (10 min)

1. Mestre anuncia a lista oficial de equipes (Task 0 = A).  
2. Cada trio escolhe um **Produtor do dia** (dono do quadro e da pasta).  
3. Registrar no quadro: nome da equipe (ex.: *Três Moedas*, *Styx Runners*).

**Checkpoint 0:** três nomes + produtor do dia preenchidos.

---

#### Bloco 1 — Quadro de atribuição (20 min)

Preencher o template (campos canônicos):

```text
Equipe: ____________________    Data: __________
Produtor do dia: ____________________

| Entrega              | Aluno responsável | Papel de estúdio (chapéu) | Feito nesta aula? |
| Arte do cenário      |                   | Arte                      | pastas / cena stub |
| Moedas (props+regra) |                   | Game Design (+ arte prop) | pastas / cena stub |
| Movimentação Player  |                   | Programação               | pastas / cena stub |
| Áudio (depois)       | (a definir)       | Áudio                     | só pasta vazia     |

FORA DO ESCOPO (cercado) — listar ≥3 itens que NÃO faremos agora:
1) …
2) …
3) …
```

**Checkpoint 1:** três entregas com dono + lista “fora do escopo” com ≥3 itens.

---

#### Bloco 2 — Cronograma de tarefas (15 min)

No mesmo artefato, 3–5 linhas no formato:

| Tarefa | Dono | Alvo (aula / data) | Status |
| :--- | :--- | :--- | :--- |
| Stub `player.tscn` | … | Aula 07 | |
| Stub `moeda.tscn` | … | Aula 07 | |
| Stub cenário | … | Aula 07 | |
| Movimento 4 dirs | … | Aula 08+ | |
| Coleta + HUD moedas | … | Aula 08+ | |

Mensagem: o cronograma **protege** o cercado — se algo novo aparecer, ou entra no fim da fila, ou **sai** outra coisa.

**Checkpoint 2:** pelo menos 3 tarefas com dono.

---

#### Bloco 3 — Estrutura Godot (25 min)

> Nomes de pastas = contrato. Projeto canônico: **`LabirintoDeMoedas`**.

Árvore canônica:

```text
LabirintoDeMoedas/
├── project.godot
├── cenas/
│   ├── player.tscn         ← dono: Programação · raiz CharacterBody2D
│   ├── moeda.tscn          ← dono: Moedas / Design · raiz Area2D (ou Node2D)
│   └── cenario.tscn        ← dono: Arte · raiz Node2D
├── sprites/                ← arte (placeholders ok)
├── audio/                  ← vazia por enquanto
├── scripts/                ← .gd futuros (Aula 08+)
└── ui/                     ← HUD depois (não obrigatório hoje)
```

Passos:

1. Godot → **New Project** → nome/pasta `LabirintoDeMoedas` no caminho local da máquina.  
2. Criar pastas no FileSystem (`cenas`, `sprites`, `audio`, `scripts`, `ui`).  
3. Cada aluno cria **sua** cena-esqueleto com a raiz congelada na Task 0.  
4. **Salvar** com os nomes canônicos.  
5. **Não** implementar movimento/coleta nesta aula (Task 0 = A).

**Checkpoint 3:** as três `.tscn` existem; pastas `sprites/`, `audio/`, `scripts/` visíveis.

---

#### Bloco 4 — Pasta compartilhada e versionamento visual (15 min)

Regras de sala (escrever no quadro / slide):

1. **Uma** pasta da equipe no Drive/rede; nome: `LabirintoDeMoedas_<NomeEquipe>`.  
2. Antes de editar uma `.tscn`, **avise no grupo** (“estou na player.tscn”).  
3. Preferir: cada um edita **só a cena do seu papel** nesta fase.  
4. Ao fim da aula: **ZIP datado** `backup_AAAA-MM-DD_HHMM.zip` na pasta (rede de segurança).  
5. Não sincronizar obsessivamente a pasta `.godot/` — se der conflito de cache, apagar `.godot` e reabrir o projeto.  
6. Nunca “salvar por cima” o ZIP do colega sem renomear.

**Checkpoint 4:** pasta compartilhada tem o projeto (ou o ZIP) + quadro digital/foto.

---

#### Bloco 5 — Registro na plataforma (15 min)

1. Cada aluno preenche anotações (template abaixo) — **individual**, mesmo em equipe.  
2. Síntese amarra papéis + Scope Creep + como versionam.  
3. **Finalizar aula**.  
4. Lembrar Altar / código quando o Mestre liberar.

---

### Checklist do artefato (aceite de sala)

- [ ] Equipe de 3 nomeada + produtor do dia  
- [ ] Quadro: cenário · moedas · player com responsáveis  
- [ ] ≥3 itens **fora do escopo**  
- [ ] Cronograma com ≥3 tarefas e donos  
- [ ] Pastas/cenas canônicas no Godot (`LabirintoDeMoedas` + 3 stubs)  
- [ ] Pasta compartilhada ou ZIP de backup criado  
- [ ] Envio na plataforma (`aula7`)

---

## Conquistas (detalhe)

### Pública

| Id | Nome | Desc (álbum) | hidden | rarity | Gatilho |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `aula7_concluida` | Cartógrafo da Equipe | Mapeou papéis, cercou o escopo e honrou a sétima trilha. | false | stone | `completed_lessons` inclui `aula7` |

### Secretas (voláteis · família `aula7`)

| Id | Nome | Desc | rarity | xp | Ideia do matcher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `segredo_cinco_oficios` | Cinco Ofícios | Nomeou ofícios do estúdio e o que cada um entrega. | silver | 15 | programação, arte, áudio, game design, produção, papel, estúdio |
| `segredo_cercado_do_escopo` | Cercado do Escopo | Falou de Scope Creep ou listou o que ficou de fora. | gold | 15 | scope creep, escopo, MVP, fora do escopo, cortar, feature |
| `segredo_pasta_sagrada` | Pasta Sagrada | Descreveu pastas, cenas `.tscn` ou regra da pasta compartilhada. | rainbow | 25 | pasta, compartilhada, versionamento, .tscn, FileSystem, backup, ZIP, Drive |

**Pista pública (Oficina, sem spoiler):**  
*“Pistas secretas do Submundo: nomeie ofícios de um estúdio; diga o que vocês cortaram para não estourar o escopo; e descreva como a equipe guarda as cenas sem um apagar o outro. O altar reconhece quem cartografa o trabalho.”*

---

## Template de anotações (Oficina)

Placeholder sugerido para `config-notes`:

```text
1) Nome da minha equipe e dos 3 integrantes:
2) Meu papel nesta aula (cenário / moedas / player) e o chapéu de estúdio equivalente:
3) Em uma frase: o que faz Produção (e quem é o produtor do dia):
4) Scope Creep — um exemplo que quase entraríamos e por que cortamos:
5) Três itens que estão FORA do escopo do Labirinto por enquanto:
6) Árvore de pastas / cenas que criamos (nomes):
7) Onde está a pasta compartilhada e a regra para não sobrescrever .tscn:
8) Próxima tarefa minha no cronograma (e até quando):
9) Observações / dúvidas:
```

Placeholder da síntese (`gdd-text`):

> Em 5–8 linhas, amarre: papéis do estúdio → como o trio evita Scope Creep → como organizam pastas/cenas na Godot e na pasta compartilhada para o Labirinto de Moedas 2D.

---

## Roteiro de slides (15 slides · espelho aula1–aula6)

| # | Slide | Conteúdo |
| ---: | :--- | :--- |
| 1 | Capa | Aula 07 · Papéis, Workflow e Versionamento · Módulo 2 |
| 2 | Onde estamos | Aula 06 (loja) → kickoff Labirinto |
| 3 | Ementa | Papéis + workflow |
| 4 | Cinco ofícios | Prog · Arte · Áudio · Design · Produção |
| 5 | Indie = muitos chapéus | Mesmo assim: dono por entrega |
| 6 | Workflow em etapas | Ideia → MVP → produção → integração → playtest |
| 7 | Scope Creep | Definição + sintomas |
| 8 | Cercado do Labirinto | O que entra / o que fica fora |
| 9 | Ponte prática | “Minha Equipe, Meu Escopo” |
| 10 | Trio de sala | Cenário · Moedas · Player |
| 11 | Quadro + cronograma | Artefato do dia |
| 12 | Pastas Godot | Árvore canônica |
| 13 | Pasta compartilhada | Regras anti-sobrescrita |
| 14 | Checklist do artefato | Lista curta |
| 15 | Fechamento + Altar | Envio · redeem · teaser Aula 08 |

Arquivos-alvo:

- `assets/docs/aulas/aula07_papeis_workflow_slides.pptx`
- `assets/docs/aulas/aula07_papeis_workflow_slides.pdf`
- Regenerável: `scripts/build-aula07-slides.py`

---

## Tasks de implementação

Legenda: `[ ]` pendente · `[~]` parcial · `[x]` feito

### Task 0 — Decisões — ✅

- [x] Validar e congelar as decisões da seção Task 0 (escopo Godot, quadro, versionamento, conquistas, mock code).  
- [x] Registrar data de congelamento no topo deste doc (**2026-09-28**).

**Aceite:** decisões congeladas; implementação das Tasks 1+ desbloqueada.

---

### Task 1 — Página `aula7` (shell + abas) — ✅

**Arquivos (espelho aula6):**

- `pages/aula7.html`
- `js/aula7.js`
- Estilos: reutilizar `css/aula.css` (evitar CSS novo salvo se o quadro precisar de tabela legível)

**Checklist**

- [x] Abas Fundamentos · Oficina · Slides  
- [x] Tom Hades / tokens existentes  
- [x] Fundamentos: cinco papéis · workflow · Scope Creep · ponte Labirinto  
- [x] Oficina: formação · quadro · cronograma · pastas Godot · pasta compartilhada · checklist · template de anotações · pistas sem spoiler  
- [x] CTA de download do material (`aula07-equipe-labirinto/` — conteúdo na Task 2)  
- [x] Envio `config-notes` + `gdd-text` + finalize (`saveLessonParagraph('aula7', …)`)  
- [x] Discovery overlay via `js/lesson-discovery.js`

**Aceite:** página carrega autenticada; três abas; finalize chama `saveLessonParagraph('aula7', …)`. Persistência no backend / gate na Trilha = Task 3.

---

### Task 2 — Material baixável (quadro + Godot) — ✅

**Arquivos**

- `assets/docs/aulas/aula07-equipe-labirinto/README.md` — passos **idênticos** à seção II (mesma árvore de pastas)  
- `assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md` — template imprimível  
- `assets/docs/aulas/aula07-equipe-labirinto/estrutura-pastas.txt` — árvore canônica  
- ZIP stub Godot **não** (Task 0 = A material)

**Checklist**

- [x] README com Blocos 0–5 + regras de pasta compartilhada  
- [x] Quadro com campos canônicos + “fora do escopo”  
- [x] Nota explícita: Labirinto completo / loja integrada = **fora** desta aula  
- [x] Links na Oficina da `aula7` (já na Task 1)

**Aceite:** equipe consegue fechar o artefato só com o material se a página cair.

---

### Task 3 — Catálogo Trilha, gates, redeem, prereq — ✅

**Checklist**

- [x] `js/api.js` → `MODULES.modulo2.lessons` inclui `aula7` (título/subtitle/`rewardXp: 30`)  
- [x] `api/_lib/progress/shared.js` → `LESSON_CATALOG.aula7` + `LESSON_GATES.aula7.published = false` + regra `aula7_concluida`  
- [x] `LESSON_PREREQUISITES.aula7 → aula6` (`api/_lib/store.js`)  
- [x] Mock code `EQUIPE2026` + `ACHIEVEMENT_RULES` no store  
- [x] Admin fallback list inclui `aula7`  
- [x] Smokes genéricos (`phase5-pages`, `lesson-paragraph`, `menu-arcoiris`, `ops-task2`, `souls-activities`) + `node --check js/aula7.js`

**Aceite:** gate false → “Em breve”; admin preview ok; redeem/admin usam `LESSON_CATALOG.aula7`. Arte/nome público no Álbum = Task 4.

---

### Task 4 — Conquistas e secretas — ✅

**Checklist**

- [x] Regra pública `aula7_concluida` (**Cartógrafo da Equipe**) + arte stub WebP  
- [x] 3 secretas `hidden`, `meta.family: "aula7"`, `volatile: true`  
- [x] Matchers em `lesson-secret-achievements.js` (ofícios · Scope Creep · pasta/sync)  
- [x] Entradas em `assets/achievements/catalog.json` + `data/game-catalog.json`  
- [x] Pistas curtas na Oficina sem spoiler de ids (já na Task 1)  
- [x] Smoke `tests/aula7-secretas-volateis-smoke.mjs` no `npm run check`

**Aceite:** pública só após redeem; secretas disparam por keywords nas anotações.

---

### Task 5 — Slides — ✅

**Checklist**

- [x] `scripts/build-aula07-slides.py`  
- [x] `aula07_papeis_workflow_slides.{pptx,pdf}`  
- [x] 15 slides teoria + ponte da prática  
- [x] Links na aba Slides da `aula7` (já wired em `js/aula7.js` desde Task 1)

**Aceite:** PDF abre; usável no telão nos primeiros 20 min.

---

### Task 6 — Playbook do Mestre + roteiro ao vivo — ✅

Criar [`docs/playbook-liberar-aula7.md`](./playbook-liberar-aula7.md) com:

#### Dia da aula (roteiro 120 min)

| Min | Bloco | Ação |
| ---: | :--- | :--- |
| 0–20 | Fundamentos | Telão `aula7` ou slides (papéis · workflow · Scope Creep) |
| 20–30 | Formação | Equipes de 3 · produtor do dia |
| 30–50 | Quadro | Atribuições + fora do escopo |
| 50–65 | Cronograma | 3–5 tarefas |
| 65–90 | Godot pastas | Árvore canônica · cenas-esqueleto |
| 90–105 | Pasta sync | Regras · ZIP backup |
| 105–120 | Envio + fechamento | Anotações · 1 equipe mostra o quadro · lembrar Altar |

**Checklist playbook**

- [x] Gate `published: true` na turma (instruções)  
- [x] Gerar código `aula7`  
- [x] QA pós-liberação  
- [x] Dicas: conflito Drive, `.godot/`, ímpar na turma, Scope Creep na hora (“loja agora? não”)

**Aceite:** Mestre conduz os 120 min só com o playbook.

---

### Task 7 — Testes e critérios finais — ✅

**Smokes**

- [x] `tests/aula7-qa-smoke.mjs` — página, catálogo, marcadores (papéis, Scope Creep, Labirinto, pasta), material, playbook, slides  
- [x] Inclusão de `aula7` nas listagens genéricas (`phase5-pages`, `lesson-paragraph`, `menu-arcoiris`, `ops-task2`, `souls-activities`)  
- [x] `package.json` `check` agrega `aula7-qa-smoke` + `aula7-secretas-volateis-smoke` + `node --check js/aula7.js`

**Critérios de aceite globais**

- [x] Ementa coberta: papéis + workflow + Scope Creep + prática equipe/quadro + versionamento visual  
- [x] Artefato = quadro + cronograma (+ pastas Godot)  
- [x] Gate/redeem/conquista pública  
- [x] Pontes docs → **Task 8 ✅**

**Aceite Task 7:** smokes verdes; ponte documental verificada na Task 8.

---

### Task 8 — Pontes documentais — ✅

**Checklist**

- [x] Atualizar [`conteudo-modulo2-gdscript-do-zero.md`](./conteudo-modulo2-gdscript-do-zero.md) — Aula 07 preenchida na tabela e seção própria  
- [x] Em [`plano-aula6-mercado-loja-etica.md`](./plano-aula6-mercado-loja-etica.md), *Ponte — Aula 07* com link para este arquivo  
- [x] Eco em [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md) + [`conteudo-modulo1-fundacoes-cultura-interface.md`](./conteudo-modulo1-fundacoes-cultura-interface.md): câmera ≠ Aula 07  
- [x] Teaser Aula 08 como placeholder (sem inventar ementa)

**Aceite:** docs ativos apontam Aula 07 = papéis / workflow / versionamento / kickoff Labirinto.

---

## Ordem de implementação sugerida

```
Task 0  decisões (Mestre) ✅ 2026-09-28
   ↓
Task 1  página aula7 ✅
   ↓
Task 2  material (quadro + pastas) ✅
   ↓
Task 3  catálogo / gate / redeem ✅
   ↓
Task 4  conquistas + secretas ✅
   ↓
Task 5  slides ✅
   ↓
Task 6  playbook liberar ✅
   ↓
Task 7  smokes / QA ✅
   ↓
Task 8  pontes docs M2 ✅
```

---

## Riscos e mitigação


| Risco | Mitigação |
| :--- | :--- |
| Turma ímpar / falta aluno | Dupla + produtor itinerante; ou grupo de 4 com 2 na arte |
| Equipe perde tempo escolhendo tema | Nome do jogo já é **Labirinto de Moedas 2D** — não reinventar |
| Scope Creep na hora (“vamos pôr a loja”) | Slide do cercado + lista FORA no quadro + fala do produtor |
| Conflito na pasta Drive | Uma cena por aluno; ZIP datado; avisar no grupo antes de editar |
| Alguém quer Git obrigatório | Task 0 = (A): Git só teaser verbal; prática = pasta + convenções |
| Godot vira aula de movimento 2D | Task 0 = (A): stubs bastam; movimento fica 08+ |
| Quadro só no papel e some | Foto + colar resumo nas anotações (entrega individual) |

---

## Ponte — Aula 08 (placeholder)

> Quando a ementa da Aula 08 estiver disponível, substituir este bloco.

Sugestões compatíveis com o que a Aula 07 deixa pronto (não oficiais):

- Movimentação 4 direções do Player no projeto Labirinto.  
- `Area2D` de moeda + contador no HUD.  
- Primeiro tilemap / cenário jogável.  
- Ou o tópico oficial da ementa (prioridade absoluta).

---

## Apêndice A — Quadro canônico (cópia rápida)

```text
═══════════════════════════════════════════════
  LABIRINTO DE MOEDAS 2D — QUADRO DE ATRIBUIÇÃO
═══════════════════════════════════════════════
Equipe: _______________________  Data: ________
Produtor do dia: _______________________________

Integrantes:
1) ___________________________  papel: Cenário (Arte)
2) ___________________________  papel: Moedas (Design)
3) ___________________________  papel: Player (Programação)

FORA DO ESCOPO (≥3):
• _____________________________________________
• _____________________________________________
• _____________________________________________

CRONOGRAMA (mín. 3 linhas):
Tarefa                    | Dono      | Até
--------------------------+-----------+--------
                          |           |
                          |           |
                          |           |

PASTA COMPARTILHADA (URL ou caminho):
_______________________________________________
Regra de edição: um dono por .tscn · avisar no grupo · ZIP backup no fim
═══════════════════════════════════════════════
```

---

## Apêndice B — Estrutura de pastas (referência)

```text
LabirintoDeMoedas/
├── project.godot
├── cenas/
│   ├── player.tscn      # CharacterBody2D
│   ├── moeda.tscn       # Area2D (ou Node2D)
│   └── cenario.tscn     # Node2D
├── sprites/
├── audio/
├── scripts/
└── ui/
```

---

*Documento de planejamento — Aula 07 / Módulo 2. Tasks 0–8 ✅ (2026-09-28). Aula completa no repo; liberar gate na turma via [`playbook-liberar-aula7.md`](./playbook-liberar-aula7.md).*
