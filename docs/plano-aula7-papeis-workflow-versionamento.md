# Plano de Implementação — Aula 07 (Módulo 2)

> **Título curricular:** Aula 07: Papéis na Indústria, Workflow e Versionamento Visual  
> **Tópico da ementa:** Papéis no desenvolvimento de jogos e Workflow de desenvolvimento  
> **Módulo:** Módulo 2 — Introdução ao GDScript “Do Zero” (Aulas 6 a 10 · ~10h)  
> **Predecessora:** Aula 06 (mercado + loja ética) · [`plano-aula6-mercado-loja-etica.md`](./plano-aula6-mercado-loja-etica.md)  
> **Estado no repo:** **Reforma individual/dupla + diário (2026-10-05)** — Task 0 reaberta e realinhada; página/API/slides/material/smokes atualizados; pendente: liberar gate na turma + QA manual do playbook.  
> **Duração prevista:** **2 encontros** (~240 min parede · Fundamento ~30–40 min no E1 · Prática ~**200 min**)  
> **Diferença-chave:** papéis de estúdio, anti–Scope Creep, **individual ou dupla** (arte da moeda × programação da coleta), **diário compartilhado**, versionamento visual e **loop mínimo de coleta** na Godot. Sem equipes de 3.

Este documento é o **mapa de implementação** da Aula 07: conteúdo pedagógico, oficina solo/dupla + Godot (coleta), página da aula, material baixável, backend de dupla/diário, conquistas e critérios de aceite.

---

## Objetivo pedagógico

Fazer o aluno **enxergar o estúdio como sistema de papéis** (Programação, Arte, Áudio, Game Design, Produção), entender por que **workflow em etapas** evita o **Scope Creep**, e kickoff do integrador **“O Labirinto de Moedas 2D”** em **solo ou dupla** com ofícios concretos (arte da moeda × coleta), diário compartilhado e hábito de **não sobrescrever** cenas na pasta compartilhada.

### O que o aluno aprende

- Nomear e explicar, com as próprias palavras, os **cinco papéis fundamentais** de um estúdio: Programação, Arte, Áudio, Game Design e Produção.
- Relacionar cada papel a **entregáveis concretos** (código, sprites, SFX/música, GDD/regras, cronograma/escopo).
- Definir **Scope Creep**: crescer o escopo sem cortar ou priorizar — e por que isso mata projetos de sala / indie.
- Descrever um **workflow mínimo** em etapas (ideia → escopo fechado → produção por papel → integração → playtest).
- Na Godot 4: pastas canônicas, sprite da moeda, Player com movimento (M1) + coleta (`Area2D` / `body_entered`), e sync na pasta compartilhada sem sobrescrever (“versionamento visual”).

### O que o aluno faz

- Lê o fundamento (~30–40 min no Encontro 1) na aba Fundamentos (ou slides densos).
- Oficina (~200 min / 2 encontros): **solo** (os dois ofícios) ou **dupla** via convite na Oficina; quadro de ofícios; projeto `LabirintoDeMoedas`; MVP sprite + coleta; diário compartilhado.
- Cada aluno finaliza o diário → snapshot em `lesson_paragraphs` (`activity:aula7`).
- Resgata o código no Altar (fim do Encontro 2).

### Artefato gerado

- Quadro de ofícios (solo/dupla) + lista fora do escopo.
- MVP jogável: sprite + `moeda.tscn` + Player + coleta.
- Diário de desenvolvimento (texto avaliado) amarrando ofícios ↔ cercado ↔ versionamento.

---

## Visão do Módulo 2 (contexto)


| Aula | Título (ementa) | Foco GDScript / prática |
| :---: | --- | --- |
| **06** | Mercado, PI e Monetização Ética | UI Control + loja cosmética com moedas in-game |
| **07** | Papéis, Workflow e Versionamento Visual | Solo/dupla · coleta · diário · pastas Godot · anti–Scope Creep *(esta aula)* |
| **08** | *(a definir)* | Continuação Labirinto / GDScript |
| **09** | *(a definir)* | … |
| **10** | *(a definir)* | … |

**Contrato de experiência (espelho Módulo 1 / Aula 06):** abas *I. Fundamentos · II. Oficina · III. Slides*; envio server-authoritative; XP via Altar; 1 conquista pública + secretas por aula; gate `published: false` até o Mestre liberar.

> **Ponte Aula 06:** a loja ética da Aula 06 **não** precisa ser integrada ao Labirinto nesta aula. Integração loja↔fase / cosmético no Player fica para **08+**. Aqui o foco é **ofícios + escopo + coleta mínima + pastas**.

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
3. **Envio server-authoritative:** diário (solo ou compartilhado) → finalize per-user → API avalia secretas; XP/conclusão via redeem no Altar.
4. **Grimório lê atividades:** `listMyLessonParagraphs` + notas virtuais (`activity:aula7`); sem `createNote` no finalize.
5. **Conquistas:** 1 pública (`aula7_concluida`) + 3 secretas `hidden` + `meta.family: "aula7"` + `volatile: true`.
6. **Pistas sem spoiler:** bloco curto na Oficina sem listar ids/nomes das secretas.
7. **Discovery:** reutilizar `js/lesson-discovery.js`.
8. **Gate admin:** `published: false` no merge; liberar só na turma (playbook espelho da aula6).

---

## Task 0 — Perguntas e decisões — ✅ REABERTA E REFECHADA (2026-10-05)

Decisões abaixo **substituem** o congelamento de 2026-09-28 (equipes de 3 / stubs sem coleta / anotações+síntese).

### Produto / pedagogia

1. **Escopo Godot nesta aula** → **Pastas + MVP de coleta**
   - [x] Sprite + `cenas/moeda.tscn` (`Area2D`) + Player (movimento M1) + coleta (`body_entered`, some / conta 1)
   - Cenário rico / loja Aula 06 / SFX ficam **fora**

2. **Base do projeto** → projeto novo `LabirintoDeMoedas/`

3. **Formação** → **individual ou dupla** (convite na Oficina; default solo)
   - [x] Sem equipes de 3, sem lista oficial do Mestre, sem produtor itinerante

4. **Mapeamento papéis estúdio → sala**

   | Papel de estúdio | Na sala | Entrega (2 encontros) |
   | :--- | :--- | :--- |
   | Arte | Arte da moeda (ou solo) | Sprite + `moeda.tscn` |
   | Programação | Programação da coleta (ou solo) | Player + coleta |
   | Design / Produção | Teoria + cercado no diário | Fora do escopo + sync |
   | Áudio | Stub | `audio/` vazia |

5. **Quadro** → `quadro-atribuicao.md` + resumo no diário

6. **Versionamento visual** → pasta compartilhada + ZIP datado (+ teaser Git)

7. **Contrato de escopo** → MVP = sprite + coleta; loja/combate/multiplayer fora

8. **Material** → `aula07-equipe-labirinto/` (nome histórico da pasta)

9. **Slides** → teoria densa + dupla/solo (`build-aula07-slides.py`)

10. **Entrega** → diário único (`lesson_journals`) + finalize per-user → `lesson_paragraphs`

11. **Pré-requisito** → `aula6` concluída

12. **Gate** → `published: false` até liberar; aberto nos **dois** encontros (sem `aula7b`)

### Conquistas

13. 1 pública + 3 secretas (`meta.family: "aula7"`, volatile)
14. Pública: `aula7_concluida` · **Cartógrafo da Dupla** · stone · redeem XP **30**
15. Secretas: Cinco Ofícios · Cercado do Escopo · Pasta Sagrada (texto do **diário**)

### Técnico (plataforma)

16. Id: `aula7` / `modulo2`
17. Mock redeem: `EQUIPE2026`
18. rewardXp: **30**
19. Secretas em `lesson-secret-achievements.js` (aliases arte da moeda / coleta)
20. Discovery: `lesson-discovery.js`
21. Testes: `aula7-qa-smoke` + `aula7-duo-smoke` + `aula7-secretas-volateis`
22. Altar: modelo atual
23. Playbook: roteiro **2 × ~120 min**
24. Persistência: **`lesson_duos` + `lesson_journals`** (não `friendships`)
25. Projeto: `LabirintoDeMoedas` · pasta sync `LabirintoDeMoedas_<Nome>`


## I. Fundamento teórico (~30–40 min no Encontro 1)

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

## II. Prática — individual ou dupla + coleta (~200 min / 2 encontros)

> Roteiro canônico da oficina. Página `aula7` e README baixável devem espelhar estes passos.

### Atividade

1. Formação **solo ou dupla** para o projeto integrador **“O Labirinto de Moedas 2D”**.  
2. Preencher o **Quadro de Atribuição** (quem: cenário · moedas · movimentação).  
3. Introduzir **versionamento visual**: pastas Godot + pasta compartilhada da equipe.  
4. Criar estrutura de pastas / cenas-esqueleto no projeto `LabirintoDeMoedas` (Task 0 = A).

### Pré-requisitos (minuto 0)

- [ ] Godot **4.x** instalada.  
- [ ] Conta/pasta compartilhada da equipe definida (Drive, OneDrive, rede, etc.).  
- [ ] Aluno logado · aba **Oficina** da Aula 07.  
- [ ] Material `aula07-equipe-labirinto/` aberto.  
- [ ] Lista de equipes do Mestre (ou regra de formação) pronta.

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
| 0. Formação | 15 min | Solo default ou convite + ofícios | Modo + chapéus |
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
| `aula7_concluida` | Cartógrafo da Dupla | Escolheu ofícios, cercou o escopo e honrou a sétima trilha — solo ou em dupla. | false | stone | `completed_lessons` inclui `aula7` |

### Secretas (voláteis · família `aula7`)

| Id | Nome | Desc | rarity | xp | Ideia do matcher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `segredo_cinco_oficios` | Cinco Ofícios | Nomeou ofícios do estúdio e o que cada um entrega. | silver | 15 | programação, arte, áudio, game design, produção, papel, estúdio |
| `segredo_cercado_do_escopo` | Cercado do Escopo | Falou de Scope Creep ou listou o que ficou de fora. | gold | 15 | scope creep, escopo, MVP, fora do escopo, cortar, feature |
| `segredo_pasta_sagrada` | Pasta Sagrada | Descreveu pastas, cenas `.tscn` ou regra da pasta compartilhada. | rainbow | 25 | pasta, compartilhada, versionamento, .tscn, FileSystem, backup, ZIP, Drive |

**Pista pública (Oficina, sem spoiler):**  
*“Pistas secretas do Submundo: nomeie ofícios de um estúdio; diga o que vocês cortaram para não estourar o escopo; e descreva como a equipe guarda as cenas sem um apagar o outro. O altar reconhece quem cartografa o trabalho.”*

---

## Template do diário (Oficina)

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
| 9 | Ponte prática | Individual ou dupla + coleta |
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
- [x] Envio diário (`lesson_journals`) + finalize per-user → `lesson_paragraphs`  

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

- [x] Regra pública `aula7_concluida` (**Cartógrafo da Dupla**) + arte stub WebP  
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

#### Dia da aula (roteiro 2 × ~120 min)

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

**Aceite:** Mestre conduz os 2 encontros só com o playbook.

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
| Turma ímpar / falta aluno | Solo ou dupla na Oficina — sem trios |
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
