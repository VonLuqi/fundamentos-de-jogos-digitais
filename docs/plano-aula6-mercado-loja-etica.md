# Plano de Implementação — Aula 06 (Módulo 2)

> **Título curricular:** Aula 06: Mercado de Jogos, Propriedade Intelectual e Monetização Ética  
> **Tópico da ementa:** Mercado brasileiro e internacional de jogos  
> **Módulo:** Módulo 2 — Introdução ao GDScript “Do Zero” (Aulas 6 a 10 · ~10h)  
> **Predecessora:** Provação do Círculo Mágico (fim do Módulo 1) · [`avaliacao-modulo1-provacao-circulo-magico.md`](./avaliacao-modulo1-provacao-circulo-magico.md)  
> **Estado no repo:** **Task 0–8 ✅** (2026-09-28) — Aula 06 completa no repo (página, material, catálogo, conquistas, slides, playbook, smokes, pontes); pendente: liberar gate na turma + QA manual do playbook.  
> **Duração prevista:** ~120 min (Fundamento teórico ~20 min · Prática Godot ~100 min)  
> **Diferença-chave:** **volta à Godot** + **primeiro GDScript “do zero” da trilha Módulo 2** — nós de UI (`Button`, `PanelContainer`, `Label`) + sinal `pressed` + economia interna só com moedas ganhas jogando (sem dinheiro real, sem loot box).

Este documento é o **mapa de implementação** da Aula 06: conteúdo pedagógico, oficina Godot detalhada (para ninguém ficar perdido), página da aula, material baixável, backend de progresso, conquistas e critérios de aceite.

---

## Objetivo pedagógico

Conectar o **mercado de jogos** (BR + internacional) e a **monetização ética** à prática de construir uma **loja interna** na Godot 4: o aluno vê como estúdios ganham dinheiro de forma sustentável, distingue IP autoral de prestação de serviço, entende por que mecânicas de aposta (loot boxes) elevam a classificação no Brasil — e **implementa** uma interface de compra cosmética que respeita o tempo do jogador.

### O que o aluno aprende

- Situar o mercado brasileiro e internacional: quem joga, quem publica, como o dinheiro circula.
- Explicar, com as próprias palavras, como estúdios geram receita de forma **sustentável e ética**.
- Distinguir **Original IP** (jogo autoral) de **prestação de serviços** (art outsourcing, gamificação, work-for-hire).
- Discriminar microtransações aceitáveis (cosméticos, conveniência transparente) de mecânicas abusivas baseadas em **sorte** (Loot Boxes) — e o impacto ClassInd/IARC (18+ por simular jogo de azar no Brasil).
- Na Godot 4: montar árvore de nós `Control`, usar `PanelContainer` + `Button` + `Label`, conectar o sinal `pressed` e escrever o primeiro script de loja em GDScript.

### O que o aluno faz

- Lê/assiste o fundamento teórico (~20 min) na aba Fundamentos (ou slides).
- Segue a oficina na Godot (~100 min): cria a cena `loja.tscn`, programa botões que “compram” itens estéticos com **moedas coletadas na fase** (simuladas nesta aula), atualiza o HUD de saldo e bloqueia compra sem saldo / item já possuído.
- Registra nas anotações: mercado · IP vs serviço · ética da loja · hierarquia de nós · trechos do script · observação do Play.
- Finaliza o envio em `lesson_paragraphs`. No Grimório, a entrega aparece como nota de atividade (`activity:aula6`).
- Eventualmente resgata o código da aula no Altar.

### Artefato gerado

- **Interface operacional de loja interna** baseada inteiramente em moedas ganhas jogando (sem IAP real, sem RNG de recompensa paga).
- Registro escrito na plataforma amarrando mercado/ética ↔ decisões de design da loja.
- Visão da atividade no grimório (derivada de `lesson_paragraphs`, `lessonId: aula6`).

---

## Visão do Módulo 2 (contexto)

| Aula | Título (ementa) | Foco GDScript / prática |
| :---: | --- | --- |
| **06** | Mercado, PI e Monetização Ética | UI Control + loja cosmética com moedas in-game *(esta aula)* |
| **07** | Papéis, Workflow e Versionamento Visual | Equipes · quadro · LabirintoDeMoedas · pasta compartilhada |
| **08** | *(a definir)* | Continuação Labirinto / GDScript |
| **09** | *(a definir)* | … |
| **10** | *(a definir)* | … |

**Contrato de experiência (espelho Módulo 1):** abas *I. Fundamentos · II. Oficina · III. Slides*; envio server-authoritative; XP via Altar; 1 conquista pública + secretas por aula; gate `published: false` até o Mestre liberar.

> **Nota de ponte Módulo 1:** em [`conteudo-modulo1-fundacoes-cultura-interface.md`](./conteudo-modulo1-fundacoes-cultura-interface.md) e [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md), a ponte aponta para **esta Aula 06** (mercado + loja ética). Câmera/`AnimatedSprite` ficam para aulas **posteriores** do Módulo 2 (quando a ementa as listar).

---

## Diagnóstico do estado atual (repo)


| Área | Situação hoje | Alvo Aula 06 |
| --- | --- | --- |
| Página / JS | `pages/aula6.html` + `js/aula6.js` ✅ | Material Godot + catálogo/gate (Tasks 2–3) |
| Catálogo Trilha | `modulo2` + `aula6` em `MODULES` ✅ | Gate false até liberar; conquistas/arte (Task 4) |
| Backend aulas | `LESSON_CATALOG` + gate + prereq `aula5` + mock `LOJAETICA2026` ✅ | Conquistas no álbum (Task 4) |
| Godot material | `assets/docs/aulas/aula06-loja-etica/` ✅ | Catálogo/gate + conquistas (Tasks 3–4) |
| Conquistas | 1 pública + 3 secretas `aula6` ✅ | Slides + playbook (Tasks 5–6) |
| Slides | `aula06_mercado_loja_etica_slides.{pptx,pdf}` ✅ | Playbook liberar (Task 6) |
| Conteúdo Módulo 2 | [`conteudo-modulo2-gdscript-do-zero.md`](./conteudo-modulo2-gdscript-do-zero.md) ✅ | Aulas 08–10 TBD |

---

## Padrão reutilizado das Aulas 01–05 (não reinventar)

1. **Shell + abas:** `I. Fundamentos` · `II. Oficina` · `III. Slides`.
2. **Tom Hades:** tokens, `hades-frame`, `triplet-grid`, `lesson-cta`, discovery overlay em `css/aula.css`.
3. **Envio server-authoritative:** anotações + síntese → API avalia secretas; XP/conclusão via redeem no Altar.
4. **Grimório lê atividades:** `listMyLessonParagraphs` + notas virtuais (`activity:aula6`); sem `createNote` no finalize.
5. **Conquistas:** 1 pública (`aula6_concluida`) + 3 secretas `hidden` + `meta.family: "aula6"` + `volatile: true`.
6. **Pistas sem spoiler:** bloco curto na Oficina sem listar ids/nomes das secretas.
7. **Discovery:** reutilizar `js/lesson-discovery.js`.
8. **Gate admin:** `published: false` no merge; liberar só na turma (playbook espelho da aula5).

---

## Task 0 — Perguntas e decisões — ✅ FECHADA

Decisões abaixo estão **congeladas** (2026-09-28). Implementação das Tasks 1+ pode seguir.

### Produto / pedagogia

1. **Escopo Godot nesta aula** → **(B) Loja UI completa (cena Control + script)**  
   - [x] **(B)** Cena `ui/loja.tscn` com `PanelContainer` / `Button` / `Label` + `ui/loja.gd` (saldo, comprar, feedback)  
   - ( ) (A) Só montar a árvore de nós, sem script — rejeitado (incompleto vs ementa)  
   - ( ) (C) Integrar a loja na cena do Player / fase — **fora do MVP** (Aula 07+)

2. **Base do projeto do aluno** → **(A) Continuar o projeto das Aulas 02–04**  
   - [x] **(A)** Abrir o mesmo projeto (Player + Nearest + viewport retrô); **adicionar** cena `ui/loja.tscn` (não apagar o que já existe)  
   - ( ) (B) Projeto novo só para UI — **plano B de sala** se o projeto antigo estiver quebrado  
   - ( ) (C) ZIP de projeto mínimo do curso com a loja já esboçada — fora do MVP

3. **Como o aluno “ganha moedas” nesta aula** → **(C) Botão “Coletar moeda da fase” + saldo inicial**  
   - [x] **(C)** `BtnGanharMoeda` adiciona **`+5`** (`GANHO_FASE`); saldo inicial **`10`** — simula coleta sem montar pickup/`Area2D`  
   - ( ) (A) Só saldo inicial fixo, sem ganhar durante a oficina  
   - ( ) (B) Exigir `Area2D` de moeda na fase do Player — **adiado** (Aula 07+)

4. **Itens da loja (cosméticos)** → **(A) 3 itens fixos com preço**  
   - [x] **(A)** Catálogo canônico (nomes Submundo):  
     | Item | Preço | Flag |
     | :--- | ---: | :--- |
     | Chapéu espectral | 5 | `tem_chapeu` |
     | Capa de névoa | 12 | `tem_capa` |
     | Aura de carvão | 20 | `tem_aura` |
   - ( ) (B) Aluno inventa N itens livres · ( ) (C) Um único item

5. **Feedback visual de compra** → **(B) Label de status + desabilitar botão**  
   - [x] **(B)** `LabelStatus` (“adquirido”, “moedas insuficientes”, “já possui”) + `disabled = true` / texto `Adquirido` no botão  
   - ( ) (A) Só `print()` no Output  
   - ( ) (C) Trocar sprite do Player — **fora do MVP**

6. **Nível de GDScript** → **(A) Sinais + variáveis + if**  
   - [x] **(A)** `extends Control`, `@onready`, `var moedas`, `func _on_*_pressed()`, `if`, `Label.text`, preços em `const` — **sem** `Array`/`Dictionary` obrigatórios na v1  
   - ( ) (B) Também `Dictionary` de catálogo — opcional só no apêndice / desafio  
   - ( ) (C) Só conectar sinais sem escrever funções — rejeitado

7. **Propriedade intelectual na prática** → **(A) Teoria + pergunta nas anotações**  
   - [x] **(A)** Fundamentos cobrem Original IP vs serviços; anotações pedem a diferença em uma frase (sem exercício formal de licença)  
   - ( ) (B) Exercício Creative Commons · ( ) (C) Pular PI

8. **Material baixável** → **(A) README passo a passo + script-espelho**  
   - [x] **(A)** `assets/docs/aulas/aula06-loja-etica/README.md` + `loja-exemplo.gd` (referência, não cola obrigatória)  
   - ( ) (B) Também ZIP do projeto · ( ) (C) Só link à doc Godot

9. **Slides** → **Obrigatório**  
   - [x] Template aula1–aula5 → `aula06_mercado_loja_etica_slides.pptx` + `.pdf`  
   - [x] Script: `scripts/build-aula06-slides.py`

10. **Campo de entrega** → **(A) Espelho aula1–aula5**  
    - [x] **(A)** `config-notes` + `gdd-text` + finalizar  
    - ( ) (B) Um textarea · ( ) (C) Formulário multi-campo

11. **Pré-requisito de liberação** → **(B) `aula5` concluída (redeem)**  
    - [x] **(B)** `LESSON_PREREQUISITES.aula6 → aula5`  
    - Prova do Módulo 1 **não** bloqueia a trilha automaticamente na v1  
    - ( ) (A) Sem prereq · ( ) (C) Exigir também `prova_modulo1` aprovada

12. **Libertação na Trilha** → **Gate admin**  
    - [x] Default `aula6: published false` até o Mestre liberar; **não** publicar no merge

### Conquistas

13. **Pacote** → **(A) 1 pública + 3 secretas** (`meta.family: "aula6"`, secretas `volatile: true`)

14. **Conquista pública** → congelada  
    - Id: `aula6_concluida`  
    - Nome: **Guardião da Loja Ética**  
    - Rarity: `stone` · xp card: `0` (XP do redeem = **30**)  
    - Trailhead: **não** (sem novos índices cipher na v1)

15. **Secretas** → **tríade aceita**

| Id | Nome | Evidência no texto | Rarity / XP |
| :--- | :--- | :--- | :--- |
| `segredo_mercador_do_styx` | Mercador do Styx | Mercado BR/internacional **ou** Original IP vs serviços | silver / 15 |
| `segredo_balcao_sem_azar` | Balcão sem Azar | Loja + preço fixo / cosmético / moedas da fase / Button·Panel / sem loot | gold / 15 |
| `segredo_tempo_respeitado` | Tempo Respeitado | Monetização ética / tempo do jogador / ClassInd 18+ em azar | rainbow / 25 |

### Técnico (plataforma)

16. **Id da aula / módulo** → `aula6` / `modulo2`  
17. **Código mock de redeem** → `LOJAETICA2026`  
18. **rewardXp** → **30** (espelho aula4/aula5)  
19. **Regras secretas** → estender `api/_lib/lesson-secret-achievements.js` com bloco `aula6`  
20. **Discovery UI** → reutilizar `js/lesson-discovery.js`  
21. **Testes** → smoke `aula6-secretas-volateis` + `aula6-qa-smoke`; incluir em `npm run check`  
22. **Códigos / Altar** → modelo atual (`redeem_codes` + TTL; multi-aluno)  
23. **Playbook** → `docs/playbook-liberar-aula6.md` (Task 6)  
24. **Sinais na oficina** → **Forma A (Editor)** como padrão de sala; Forma B (código) documentada como alternativa  
25. **Funções de compra na sala** → **três funções explícitas** (`_on_btn_comprar_*`); refactor `get`/`set` fica só no apêndice como desafio opcional

**Checklist Task 0**

- [x] Todas as decisões 1–25 marcadas / congeladas  
- [x] Escopo Godot **(B)** e moedas **(C)** confirmados  
- [x] Documento atualizado com “congelado em 2026-09-28”

---

## I. Fundamento teórico (~20 min)

### Roteiro de fala (professor / página)

#### 1. Onde o dinheiro mora (mercado BR + internacional) — ~5 min

- Jogos são **indústria criativa + software + entretenimento**: console, PC, mobile, itch.io, Steam, consolidados e indies.
- No Brasil: mercado mobile forte, studios de service + autorais, eventos (SBGames, Brasil Game Show), políticas de fomento e desafios de câmbio/publicação.
- Internacional: AAA, mid-core, indie; plataformas de distribuição ditam corte de receita e regras (incl. IAP e idade).

#### 2. Duas formas de “viver de jogo” — ~5 min

| Caminho | O que é | Exemplo pedagógico |
| :--- | :--- | :--- |
| **Original IP** | Você cria e detém a propriedade intelectual do jogo/personagens/mundo | Seu jogo autoral; merch; sequências; licenciamento |
| **Prestação de serviços** | Você vende **capacidade** (arte, código, gamificação) para terceiros | Art outsourcing, serious games, apps gamificados sob contrato |

Mensagem: nenhum caminho é “menor” — mas **ética e contrato** mudam (quem é dono do IP? o que pode reusar no portfólio?).

#### 3. Monetização sustentável e ética — ~5 min

Como estúdios geram receita **sem** explorar o jogador:

- Preço único justo (premium).
- Expansões / DLC de conteúdo claro.
- Cosméticos / battle pass **transparentes** (o jogador sabe o que compra).
- Assinatura com valor contínuo explícito.
- **Moeda ganha jogando** para recompensar tempo e habilidade (foco desta aula).

#### 4. Microtransações vs. mecânicas de azar — ~5 min

| Aceitável (nesta trilha) | Abusivo / risco alto |
| :--- | :--- |
| Comprar skin com moedas da fase | Loot box paga com chance oculta |
| Preço fixo visível | Pay-to-win que quebra o fair play |
| Recompensa por jogar | Pressão em crianças / dark patterns |

**Elo ClassInd (eco Aula 05):** no Brasil, mecânicas que **simulam jogo de azar** (loot boxes com recompensa aleatória) tendem a elevar a classificação — frequentemente **18+**. A oficina de hoje **proíbe** RNG de compra: cada botão tem **preço fixo** e efeito **determinístico**.

#### Frase de fechamento teórico

> *Respeitar o tempo do jogador é também um modelo de negócio: a loja do Submundo só aceita moedas que você conquistou na fase — nunca a sorte embalada de um baú pago.*

#### Referências rápidas (professor / slides — não sobrecarregar o aluno)

- Ementa: mercado BR/internacional; receita ética; Original IP vs serviços; IAP vs loot boxes / ClassInd 18+.
- Eco Aula 05: ClassInd · design saudável · faixa etária.
- Godot 4 — UI: nós `Control`, sinal `BaseButton.pressed`.
- Continuum: Provação M1 → **Aula 06 (mercado + loja GDScript)** → Aula 07+.

---

## II. Prática na Godot (~100 min) — detalhe operacional

> Esta seção é o **roteiro canônico** da oficina. A página `aula6` e o README baixável devem espelhar estes passos (mesma numeração, mesmos nomes de nós). Quem se perder volta ao **checklist do artefato** no final do bloco.

### Atividade: “Oficina de Interface de Loja”

Os alunos criam uma **tela simples de interface lúdica** com `Button` e `PanelContainer`, e programam compras de **itens estéticos** usando **moedas coletadas na fase** (simuladas), **sem** dinheiro real e **sem** elementos de aposta.

### Pré-requisitos (conferir antes do minuto 0 da oficina)

- [ ] Godot **4.x** instalada e abrindo.
- [ ] Projeto das **Aulas 02–04** disponível (Player + preferencialmente Nearest + viewport retrô). Se alguém não tiver, usar **projeto novo vazio** só para a loja (Task 0 opção B de emergência).
- [ ] Aluno logado na plataforma · aba **Oficina** da Aula 06 aberta (anotações).
- [ ] Material `aula06-loja-etica/README.md` baixado ou aberto em segunda tela.
- [ ] **Não** é necessário saber GDScript avançado — vamos escrever o primeiro script de UI juntos.

### O que NÃO fazer nesta aula (anti-confusão)

| Evitar | Por quê |
| :--- | :--- |
| Integrar a loja na cena do Player agora | Mistura movimento 2D com UI; vira duas aulas |
| Loot box / `randi()` na compra | Fere a ementa ética + ClassInd |
| Preço em “dinheiro real” / Steam IAP | Fora do escopo e da mensagem pedagógica |
| Copiar script inteiro sem entender o sinal | Quebra o objetivo “GDScript do zero” |
| Usar `Node2D` como raiz da loja | Loja é tela de UI → raiz deve ser `Control` (ou `CanvasLayer` + `Control`) |

### Vocabulário mínimo (quadro / slide 30s)

| Termo | Significado operacional |
| :--- | :--- |
| `Control` | Família de nós de interface (posição em âncoras/retângulos, não em metros do mundo) |
| `PanelContainer` | Painel que **embrulha** filhos e aplica margem/estilo de painel |
| `Button` | Botão clicável; emite o sinal `pressed` |
| `Label` | Texto na tela (saldo, status, nome do item) |
| Sinal | “Aviso” que o nó dispara; ligamos a uma função no script |
| `@onready` | Guarda referência ao nó **depois** que a cena carrega |
| Moeda in-game | Recurso ganho jogando; **não** é cartão de crédito |

### Cronograma sugerido da oficina


| Bloco | Tempo | Atividade | Resultado visível |
| :--- | :--- | :--- | :--- |
| 0. Setup | 8 min | Abrir projeto · criar pasta `ui/` · nova cena | FileSystem com `ui/` |
| 1. Árvore da loja | 20 min | Montar nós `Control` → painéis → labels → botões | Hierarquia igual ao diagrama |
| 2. Layout rápido | 12 min | Âncoras / tamanho mínimo / textos dos botões | Loja legível no Viewport |
| 3. Script + sinal | 25 min | `loja.gd` · saldo · `_on_btn_*` · atualizar labels | Clique altera número de moedas |
| 4. Regras éticas | 20 min | Bloquear sem saldo · item já comprado · status | Compra justa, sem RNG |
| 5. Play + registro | 15 min | Testar fluxo · anotações · síntese · finalizar | Artefato + envio |

**Buffer do professor:** se a turma atrasar no Bloco 1, encurtar Bloco 2 (layout “bom o suficiente”) e proteger Blocos 3–4 (são o coração GDScript + ética).

---

### Passo a passo canônico (Godot 4)

> **Nomes de nós são contrato.** Use exatamente os nomes abaixo (ou a turma perde o fio do script espelho). Maiúsculas importam: `LabelMoedas` ≠ `labelMoedas`.

#### Bloco 0 — Setup (8 min)

1. Abra o projeto do curso (Aulas 02–04).
2. No **FileSystem**, clique com o botão direito na pasta raiz do projeto → **New Folder** → nome: `ui`.
3. **Scene → New Scene**.
4. Clique em **Other Node** (não escolha `Node2D` / `CharacterBody2D`).
5. Busque e selecione **`Control`** → Create.
6. Renomeie a raiz para `Loja` (duplo clique no nome na aba Scene).
7. **Salve** a cena: `ui/loja.tscn` (Ctrl+S).
8. Com a raiz `Loja` selecionada, no Inspector → **Layout → Anchors Preset** → **Full Rect** (atalho comum: âncoras cobrindo a tela inteira). Assim a loja usa a janela toda.

**Checkpoint 0:** no FileSystem existe `ui/loja.tscn`; na Scene a raiz chama-se `Loja` e é do tipo `Control`.

---

#### Bloco 1 — Árvore de nós (20 min)

Monte a hierarquia **exatamente** assim (Add Child Node a cada linha):

```text
Loja (Control)                          ← já existe
└── PainelFundo (PanelContainer)
    └── Margem (MarginContainer)        ← opcional mas recomendado
        └── VBoxPrincipal (VBoxContainer)
            ├── Titulo (Label)
            ├── LabelMoedas (Label)
            ├── SeparadorItens (HSeparator)   ← opcional
            ├── PainelItemChapeu (PanelContainer)
            │   └── HBoxChapeu (HBoxContainer)
            │       ├── LabelChapeu (Label)
            │       └── BtnComprarChapeu (Button)
            ├── PainelItemCapa (PanelContainer)
            │   └── HBoxCapa (HBoxContainer)
            │       ├── LabelCapa (Label)
            │       └── BtnComprarCapa (Button)
            ├── PainelItemAura (PanelContainer)
            │   └── HBoxAura (HBoxContainer)
            │       ├── LabelAura (Label)
            │       └── BtnComprarAura (Button)
            ├── BtnGanharMoeda (Button)
            └── LabelStatus (Label)
```

**Como adicionar cada nó (repetir o gesto):**

1. Botão direito no nó pai → **Add Child Node**.
2. Digite o tipo (`PanelContainer`, `VBoxContainer`, `Label`, `Button`, …).
3. Create → **renomeie imediatamente** para o nome da tabela.

**Textos iniciais (Inspector → Text / Text):**

| Nó | Texto sugerido |
| :--- | :--- |
| `Titulo` | `Loja do Submundo` |
| `LabelMoedas` | `Moedas: 10` |
| `LabelChapeu` | `Chapéu espectral — 5 moedas` |
| `LabelCapa` | `Capa de névoa — 12 moedas` |
| `LabelAura` | `Aura de carvão — 20 moedas` |
| `BtnComprarChapeu` | `Comprar` |
| `BtnComprarCapa` | `Comprar` |
| `BtnComprarAura` | `Comprar` |
| `BtnGanharMoeda` | `Coletar moeda da fase (+5)` |
| `LabelStatus` | `Bem-vindo. Só moedas ganhas jogando.` |

**Se usar `MarginContainer`:** selecione `Margem` → Inspector → Theme Overrides → Constants (ou *Margin*) → `10`–`16` em todos os lados.

**Checkpoint 1:** a árvore na aba Scene bate com o diagrama (nomes iguais). Se um nome estiver errado, **corrija agora** — depois o script quebra.

---

#### Bloco 2 — Layout legível (12 min)

Objetivo: conseguir ler tudo no Play sem pixel hunt.

1. Selecione `PainelFundo` → Anchors Preset → **Center** ou **Full Rect** com margens; se Full Rect, use o `Margem` para não colar nas bordas.
2. Em cada `Button`, confira **Custom Minimum Size** (ex.: largura `120`, altura `32`) se o botão estiver minúsculo.
3. Em `LabelMoedas` e `Titulo`, aumente um pouco o font size (Theme Overrides → Font Sizes) se a turma estiver em viewport retrô baixo (eco Aula 04: texto pode ficar apertado — isso é didático).
4. **Não** perca tempo com tema custom completo nesta aula.

**Checkpoint 2:** ao pressionar **F6** (Play This Scene) na `loja.tscn`, títulos e botões estão visíveis e clicáveis (ainda sem lógica — ok).

> **Atenção:** use **Play This Scene (F6)** na loja, não só F5 no projeto inteiro, se a cena principal ainda for o Player. Alternativa: **Project → Project Settings → Application → Run → Main Scene** temporariamente = `ui/loja.tscn` (reverter depois se quiser).

---

#### Bloco 3 — Script `loja.gd` + sinais (25 min)

##### 3.1 Criar e anexar o script

1. Selecione a raiz `Loja`.
2. No Inspector, clique em **Attach Script** (ícone de pergaminho / “+ Script”).
3. Language: **GDScript** · Path: `ui/loja.gd` · Template: Empty / Node default.
4. Create.

##### 3.2 Código inicial (escrever junto com a turma)

Cole / digite **por etapas** (não despeje 80 linhas de uma vez):

```gdscript
extends Control

## Saldo inicial — moedas "já coletadas" na fase (simulação pedagógica).
var moedas: int = 10

## Itens possuídos (false = ainda não comprou).
var tem_chapeu: bool = false
var tem_capa: bool = false
var tem_aura: bool = false

## Preços fixos — determinísticos (sem sorte).
const PRECO_CHAPEU: int = 5
const PRECO_CAPA: int = 12
const PRECO_AURA: int = 20
const GANHO_FASE: int = 5

@onready var label_moedas: Label = $PainelFundo/Margem/VBoxPrincipal/LabelMoedas
@onready var label_status: Label = $PainelFundo/Margem/VBoxPrincipal/LabelStatus
@onready var btn_chapeu: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemChapeu/HBoxChapeu/BtnComprarChapeu
@onready var btn_capa: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemCapa/HBoxCapa/BtnComprarCapa
@onready var btn_aura: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemAura/HBoxAura/BtnComprarAura


func _ready() -> void:
	_atualizar_hud()
	label_status.text = "Bem-vindo. Só moedas ganhas jogando."


func _atualizar_hud() -> void:
	label_moedas.text = "Moedas: %d" % moedas
```

> **Se você não usou `Margem`:** ajuste os caminhos `$PainelFundo/VBoxPrincipal/...` (sem `/Margem`). Caminho errado = erro no Output ao dar Play.

##### 3.3 Conectar sinais (duas formas — escolha uma e padronize na turma)

**Forma A — pelo Editor (recomendada para o primeiro contato):**

1. Selecione `BtnGanharMoeda`.
2. Aba **Node** (ao lado do Inspector) → sinal **`pressed()`** → dê duplo clique.
3. Receptor: nó `Loja` · método: `_on_btn_ganhar_moeda_pressed` → Connect.
4. Repita para `BtnComprarChapeu`, `BtnComprarCapa`, `BtnComprarAura` com métodos:
   - `_on_btn_comprar_chapeu_pressed`
   - `_on_btn_comprar_capa_pressed`
   - `_on_btn_comprar_aura_pressed`

**Forma B — pelo código (alternativa):**

```gdscript
func _ready() -> void:
	$PainelFundo/Margem/VBoxPrincipal/BtnGanharMoeda.pressed.connect(_on_btn_ganhar_moeda_pressed)
	btn_chapeu.pressed.connect(_on_btn_comprar_chapeu_pressed)
	btn_capa.pressed.connect(_on_btn_comprar_capa_pressed)
	btn_aura.pressed.connect(_on_btn_comprar_aura_pressed)
	_atualizar_hud()
```

##### 3.4 Função de ganhar moeda (simula a fase)

```gdscript
func _on_btn_ganhar_moeda_pressed() -> void:
	moedas += GANHO_FASE
	label_status.text = "Você coletou +%d moedas na fase." % GANHO_FASE
	_atualizar_hud()
```

**Checkpoint 3a:** F6 → clicar **Coletar moeda** → `LabelMoedas` sobe de 5 em 5. Se não subir: sinal não conectado ou caminho `@onready` quebrado (ver Output).

---

#### Bloco 4 — Regras de compra ética (20 min)

Implemente **uma** compra completa; depois copie o padrão para as outras.

```gdscript
func _on_btn_comprar_chapeu_pressed() -> void:
	if tem_chapeu:
		label_status.text = "Você já possui o Chapéu. Sem recompra forçada."
		return
	if moedas < PRECO_CHAPEU:
		label_status.text = "Moedas insuficientes. Volte à fase e colete mais."
		return
	moedas -= PRECO_CHAPEU
	tem_chapeu = true
	btn_chapeu.disabled = true
	btn_chapeu.text = "Adquirido"
	label_status.text = "Chapéu espectral adquirido. Cosmético — sem vantagem injusta."
	_atualizar_hud()
```

Repita o padrão para capa e aura (`PRECO_CAPA` / `PRECO_AURA`, `tem_capa` / `tem_aura`, `btn_capa` / `btn_aura`).

**Regras pedagógicas que o código deve deixar óbvias:**

1. Preço **fixo** (constante) — jogador sabe o custo.  
2. Sem `randi()`, sem “chance de item raro”.  
3. Sem saldo → mensagem para **voltar a jogar**, não para “comprar moedas com cartão”.  
4. Item já possuído → botão desabilitado (sem dark pattern de recompra enganosa).

**Checkpoint 4:**

| Teste | Esperado |
| :--- | :--- |
| Comprar chapéu com 10 moedas | Saldo 5; botão “Adquirido”; status ok |
| Comprar aura com 5 moedas | Status “insuficientes”; saldo inalterado |
| Clicar chapéu de novo | Status “já possui”; saldo inalterado |
| Coletar moedas até aura | Compra da aura funciona |

---

#### Bloco 5 — Registro na plataforma (15 min)

1. Rodar o fluxo feliz completo uma vez (coletar → comprar 2 itens).
2. Preencher anotações (template abaixo).
3. Escrever síntese (5–8 linhas) amarrando **mercado/ética ↔ loja**.
4. Finalizar envio na Oficina.
5. (Quando liberado) resgatar código no Altar.

### Checklist do artefato (visível na Oficina)

- [ ] Cena `ui/loja.tscn` com raiz `Control` nomeada `Loja`
- [ ] Pelo menos um `PanelContainer` e três `Button` de compra + um de coletar moeda
- [ ] Script `ui/loja.gd` anexado à raiz
- [ ] Sinal `pressed` conectado (editor ou código)
- [ ] Saldo atualiza no `LabelMoedas`
- [ ] Compra respeita preço fixo e bloqueia sem moedas / item repetido
- [ ] Nenhum uso de sorte (`randi` / loot) na compra
- [ ] Play (F6) demonstra o fluxo completo
- [ ] Anotações + síntese enviadas na plataforma

### Artefato

**Interface operacional de loja interna** — cosméticos com preços fixos, abastecida só por moedas “ganhas na fase”, documentada nas anotações da plataforma.

### Troubleshooting rápido (sala)


| Sintoma | Causa comum | Correção |
| :--- | :--- | :--- |
| Erro `Invalid get index '…'` / nó null | Caminho `$…` não bate com a árvore | Conferir nomes; copiar caminho pelo editor (botão direito no nó → Copy Node Path) |
| Clique não faz nada | Sinal não conectado | Aba Node → `pressed` → Connect no `Loja` |
| F5 abre o Player, não a loja | Main Scene antiga | F6 nesta cena ou trocar Main Scene temporariamente |
| Texto ilegível / minúsculo | Viewport retrô Aula 04 | Aumentar font size nos Labels; ok pedagogicamente |
| Aluno usou `Node2D` na raiz | Confusão mundo × UI | Nova cena `Control`; mover filhos ou refazer árvore |
| Quer fazer loot box “só de brincadeira” | Fora da ementa | Redirecionar: preço fixo determinístico |

---

## Pacote de conquistas (proposta)

> Fonte editável: `data/game-catalog.json`. Regras secretas: `api/_lib/lesson-secret-achievements.js`.

### Pública

| Id | Nome | Desc (álbum) | hidden | rarity | Gatilho |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `aula6_concluida` | Guardião da Loja Ética | Abriu o balcão do Submundo e honrou a sexta trilha. | false | stone | `completed_lessons` inclui `aula6` (redeem) |

### Secretas (voláteis · família `aula6`)

| Id | Nome | Desc | rarity | xp | Ideia do matcher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `segredo_mercador_do_styx` | Mercador do Styx | Situou o mercado (BR ou internacional) ou citou Original IP vs serviços. | silver | 15 | Aliases: mercado, Brasil, internacional, indie, AAA, IP, autoral, outsourcing, gamificação, serviço |
| `segredo_balcao_sem_azar` | Balcão sem Azar | Descreveu a loja com preço fixo / sem loot box / cosmético / moedas da fase. | gold | 15 | loja, PanelContainer, Button, moeda, cosmético, preço fixo, loot box (negação), sinal pressed, GDScript |
| `segredo_tempo_respeitado` | Tempo Respeitado | Explicitou monetização ética / respeito ao tempo do jogador / ClassInd 18+ em azar. | rainbow | 25 | ética, sustentável, tempo do jogador, microtransação, loot box, 18+, jogo de azar, ClassInd |

**Pista pública (Oficina, sem spoiler):**  
*“Pistas secretas do Submundo: fale do mercado ou do IP; descreva sua loja com botões e moedas ganhas na fase; e diga por que preço fixo respeita o jogador melhor que um baú da sorte. O altar reconhece quem documenta o balcão ético.”*

---

## Template de anotações (Oficina)

Placeholder sugerido para `config-notes`:

```text
1) Uma ideia do mercado brasileiro OU internacional que me marcou:
2) Original IP vs prestação de serviços — em uma frase, a diferença:
3) Exemplo de monetização ética vs. mecânica abusiva (loot box / azar):
4) Por que loot box pode subir a classificação (eco ClassInd):
5) Hierarquia da minha loja (raiz + 3 nós importantes):
6) Como conectei o sinal pressed (editor ou código):
7) Preços dos itens e saldo inicial / ganho por coleta:
8) O que acontece se faltar moeda OU se o item já foi comprado:
9) Observações / dúvidas:
```

Placeholder da síntese (`gdd-text`):

> Em 5–8 linhas, amarre: mercado / IP → monetização ética → por que sua loja na Godot só vende cosméticos com moedas ganhas jogando e preço fixo (sem aposta).

---

## Roteiro de slides (18 slides · espelho aula1–aula5 + oficina)

| # | Slide | Conteúdo |
| ---: | :--- | :--- |
| 1 | Capa | Aula 06 · Mercado, PI e Monetização Ética · Módulo 2 |
| 2 | Onde estamos | Provação M1 → GDScript do zero → loja ética |
| 3 | Ementa | Mercado BR e internacional |
| 4 | Como o dinheiro circula | Premium · DLC · cosméticos · serviços |
| 5 | Original IP | Autoral · dono do ativo |
| 6 | Prestação de serviços | Outsourcing · gamificação · contrato |
| 7 | Monetização ética | Sustentável · transparente · tempo do jogador |
| 8 | Microtx aceitável vs abusiva | Tabela rápida |
| 9 | Loot boxes + ClassInd | Elo 18+ / simulação de azar |
| 10 | Ponte prática | “Hoje montamos o balcão sem azar” |
| 11 | Nós Control | PanelContainer · Button · Label |
| 12 | Árvore Scene | Foto Godot + tipos (Aura/Chapeu/Capa = PanelContainer) |
| 13 | Sinais | `pressed` → `_on_btn_ganhar_moedas_pressed` / compras |
| 14 | Economia in-game | Moedas da fase · preço fixo 5·12·20 |
| 15 | Script Bloco 3 | Vars · `@onready` · coletar moeda |
| 16 | Script Bloco 4 | Compra ética (if / return / disabled) |
| 17 | Checklist do artefato | Lista curta |
| 18 | Fechamento + Altar | Envio · redeem · Aula 07 teaser |

Arquivos-alvo:

- `assets/docs/aulas/aula06_mercado_loja_etica_slides.pptx`
- `assets/docs/aulas/aula06_mercado_loja_etica_slides.pdf`
- Regenerável: `scripts/build-aula06-slides.py`

---

## Tasks de implementação

Legenda: `[ ]` pendente · `[~]` parcial · `[x]` feito

### Task 0 — Decisões — ✅

- [x] Validar e congelar as decisões da seção Task 0 (escopo Godot, moedas, itens, prereq, conquistas).
- [x] Registrar data de congelamento no topo deste doc (**2026-09-28**).

**Aceite:** decisões congeladas; implementação das Tasks 1+ desbloqueada.

---

### Task 1 — Página `aula6` (shell + abas) — ✅

**Arquivos (espelho aula4/aula5):**

- `pages/aula6.html`
- `js/aula6.js`
- Estilos: `css/aula.css` (+ `.lesson-pre` para o diagrama da árvore)

**Checklist**

- [x] Abas Fundamentos · Oficina · Slides  
- [x] Tom Hades / tokens existentes  
- [x] Fundamentos: mercado, IP vs serviços, monetização ética, loot box ↔ ClassInd  
- [x] Oficina: cronograma + passo a passo resumido + checklist do artefato + template de anotações + pistas sem spoiler  
- [x] CTA de download do material (`aula06-loja-etica/README.md` — conteúdo na Task 2)  
- [x] Envio `config-notes` + `gdd-text` + finalize (mesmo contrato)  
- [x] Discovery overlay via `js/lesson-discovery.js`

**Aceite:** página carrega autenticada; três abas; finalize chama `saveLessonParagraph('aula6', …)`. Persistência no backend / gate na Trilha = Task 3.

---

### Task 2 — Material baixável Godot — ✅

**Arquivos**

- `assets/docs/aulas/aula06-loja-etica/README.md` — passo a passo **idêntico** à seção II deste plano (mesma árvore de nós, mesmos nomes)
- `assets/docs/aulas/aula06-loja-etica/loja-exemplo.gd` — script completo com **três funções explícitas** (padrão Task 0); desafio `get`/`set` só em comentário
- Diagrama ASCII + troubleshooting no README

**Checklist**

- [x] README com Blocos 0–5 e checklist  
- [x] Script-exemplo alinhado aos nomes canônicos  
- [x] Nota explícita: sem loot box / sem IAP real  
- [x] Link na Oficina da `aula6` (README + download do `.gd`)

**Aceite:** aluno consegue montar a loja só com o README se a página cair.

---

### Task 3 — Catálogo Trilha, módulo 2, gates, redeem, prereq — ✅

**Checklist**

- [x] `js/api.js` → `MODULES`: **`modulo2`** com lesson `aula6` (título/subtitle/`rewardXp: 30`)  
- [x] `api/_lib/progress/shared.js` → `LESSON_CATALOG.aula6` + `LESSON_GATES.aula6.published = false` + regra `aula6_concluida`  
- [x] `LESSON_PREREQUISITES.aula6 → aula5` (`api/_lib/store.js`)  
- [x] Mock code `LOJAETICA2026` + `ACHIEVEMENT_RULES` no store  
- [x] Card na Trilha consome catálogo (`MODULES` / `LESSONS`)  
- [x] Smokes: `phase5-pages`, `lesson-paragraph`, `menu-arcoiris`, `ops-task2`, `souls-activities` + `package.json` `node --check js/aula6.js`  
- [x] Admin fallback list inclui `aula6`

**Aceite:** com gate false, aluno vê “Em breve”; admin preview ok; redeem/admin generate usam `LESSON_CATALOG.aula6`. Arte/nome público no Álbum = Task 4.

---

### Task 4 — Conquistas e secretas — ✅

**Checklist**

- [x] Regra pública `aula6_concluida` (**Guardião da Loja Ética**) no catálogo + arte stub  
- [x] 3 secretas `hidden`, `meta.family: "aula6"`, `volatile: true`  
- [x] Matchers em `lesson-secret-achievements.js` (mercado/IP · loja sem azar · tempo/ética/ClassInd)  
- [x] Stubs WebP no Álbum + `assets/achievements/catalog.json`  
- [x] Pistas curtas na Oficina **sem** spoiler de ids (já na Task 1; smoke verifica)  
- [x] Smoke `tests/aula6-secretas-volateis-smoke.mjs` + `tests/aula6-qa-smoke.mjs` no `npm run check`

**Aceite:** pública só após redeem; secretas disparam por keywords nas anotações.

---

### Task 5 — Slides — ✅

**Checklist**

- [x] `scripts/build-aula06-slides.py`  
- [x] `aula06_mercado_loja_etica_slides.{pptx,pdf}`  
- [x] 18 slides: teoria + árvore Godot (foto) + códigos Bloco 3/4 + checklist  
- [x] Links na aba Slides da `aula6` (já wired em `js/aula6.js` desde Task 1)

**Aceite:** PDF abre; slides usáveis no telão nos primeiros 20 min.

---

### Task 6 — Playbook do Mestre + roteiro ao vivo — ✅

Criar [`docs/playbook-liberar-aula6.md`](./playbook-liberar-aula6.md) com:

#### Dia da aula (roteiro 120 min)

| Min | Bloco | Ação |
| ---: | :--- | :--- |
| 0–20 | Fundamentos | Telão na `aula6` ou slides (mercado · IP · ética · loot box) |
| 20–28 | Setup Godot | Abrir projeto · pasta `ui/` · cena `Control` |
| 28–48 | Árvore + layout | PanelContainer / Buttons / Labels (Checkpoint 1–2) |
| 48–73 | Script + sinais | `loja.gd` · coletar moeda · HUD |
| 73–93 | Regras éticas | Compra · bloqueios · anti-RNG |
| 93–115 | Play + anotações | Fluxo completo · síntese |
| 115–120 | Fechamento | 1 aluno demonstra; lembrar Altar |

**Checklist playbook**

- [x] Gate `published: true` na turma (instruções)  
- [x] Gerar código `aula6`  
- [x] QA pós-liberação (página, material, redeem)  
- [x] Dicas de sala (F6 vs F5, caminhos `$`, viewport retrô)

**Aceite:** Mestre consegue liberar e conduzir os 120 min só com o playbook.

---

### Task 7 — Testes e critérios finais — ✅

**Smokes**

- [x] `tests/aula6-qa-smoke.mjs` — página, catálogo, marcadores, loot tratado como **proibido** (não feature), nomes canônicos, playbook, slides  
- [x] Inclusão de `aula6` em listagens genéricas (`phase5-pages-smoke`, `lesson-paragraph-smoke`, `menu-arcoiris`, `ops-task2`, `souls-activities`)  
- [x] `package.json` `check` agrega `aula6-qa-smoke` + `aula6-secretas-volateis-smoke` + `node --check js/aula6.js`

**Critérios de aceite globais**

- [x] Ementa coberta: mercado + IP/serviços + monetização ética + prática de loja  
- [x] Prática detalhada na página + README (nomes de nós canônicos)  
- [x] Artefato = loja com moedas in-game, preço fixo, sem azar  
- [x] Gate/redeem/conquista pública  
- [x] Ponte Módulo 1 / Aula 05 atualizada → **Task 8 ✅**

**Aceite Task 7:** smokes verdes; ponte documental verificada na Task 8.

---

### Task 8 — Pontes documentais — ✅

**Checklist**

- [x] Atualizar [`conteudo-modulo1-fundacoes-cultura-interface.md`](./conteudo-modulo1-fundacoes-cultura-interface.md) — ponte Módulo 2 → **Aula 06 (mercado + loja ética)**  
- [x] Em [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md), seção *Ponte — Aula 06 / Módulo 2* + link para este arquivo  
- [x] Esboço [`conteudo-modulo2-gdscript-do-zero.md`](./conteudo-modulo2-gdscript-do-zero.md) (Aula 06 preenchida; 07–10 TBD)  
- [x] Eco em planos aula3/aula4: câmera ≠ Aula 06

**Aceite:** nenhum doc ativo promete câmera como conteúdo oficial da Aula 06.

---

## Ordem de implementação sugerida

```
Task 0  decisões (Mestre) ✅ 2026-09-28
   ↓
Task 1  página aula6 ✅
   ↓
Task 2  material Godot (README + exemplo) ✅
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
Task 8  pontes docs M1 → M2 ✅
```

---

## Riscos e mitigação


| Risco | Mitigação |
| :--- | :--- |
| Turma heterogênea em GDScript | Blocos 3–4 no telão; script-exemplo só como rede de segurança |
| Confusão Control vs Node2D | Checkpoint 0 obrigatório; troubleshooting na Oficina |
| Viewport retrô deixa UI minúscula | Aviso no Bloco 2; aumentar font; F6 ok |
| Alguém implementa loot “por diversão” | Regra de sala + aceite do artefato + secreta `balcao_sem_azar` |
| Projeto antigo quebrado | Plano B: projeto novo só com `ui/loja.tscn` |
| Integração loja↔Labirinto cedo demais | Aula 07 = papéis/pastas; loja integrada fica **fora** do MVP do Labirinto |

---

## Ponte — Aula 07 / Módulo 2

> **Ementa oficial (2026-09-28):** Aula 07 = *Papéis na Indústria, Workflow e Versionamento Visual* + oficina **Minha Equipe, Meu Escopo** (equipes de 3 · quadro · projeto `LabirintoDeMoedas` · pasta compartilhada).  
> Plano: [`plano-aula7-papeis-workflow-versionamento.md`](./plano-aula7-papeis-workflow-versionamento.md) · Playbook: [`playbook-liberar-aula7.md`](./playbook-liberar-aula7.md) · Página: `pages/aula7.html`.

A loja ética desta Aula 06 **não** precisa ser integrada ao Labirinto na Aula 07. Integração loja↔fase / cosmético no Player / movimento jogável ficam para **08+** quando a ementa pedir.

**Fora da Aula 07:** Labirinto jogável completo · loja integrada · `Camera2D` / `AnimatedSprite2D` (ainda sem ementa oficial).

---

## Apêndice A — Script de referência completo (`loja-exemplo.gd`)

> Para o material baixável. Na sala, preferir construir por etapas (Blocos 3–4).

```gdscript
extends Control

var moedas: int = 10
var tem_chapeu: bool = false
var tem_capa: bool = false
var tem_aura: bool = false

const PRECO_CHAPEU: int = 5
const PRECO_CAPA: int = 12
const PRECO_AURA: int = 20
const GANHO_FASE: int = 5

@onready var label_moedas: Label = $PainelFundo/Margem/VBoxPrincipal/LabelMoedas
@onready var label_status: Label = $PainelFundo/Margem/VBoxPrincipal/LabelStatus
@onready var btn_chapeu: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemChapeu/HBoxChapeu/BtnComprarChapeu
@onready var btn_capa: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemCapa/HBoxCapa/BtnComprarCapa
@onready var btn_aura: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemAura/HBoxAura/BtnComprarAura


func _ready() -> void:
	_atualizar_hud()
	label_status.text = "Bem-vindo. Só moedas ganhas jogando."


func _atualizar_hud() -> void:
	label_moedas.text = "Moedas: %d" % moedas


func _on_btn_ganhar_moeda_pressed() -> void:
	moedas += GANHO_FASE
	label_status.text = "Você coletou +%d moedas na fase." % GANHO_FASE
	_atualizar_hud()


func _on_btn_comprar_chapeu_pressed() -> void:
	_tentar_comprar("Chapéu espectral", PRECO_CHAPEU, "tem_chapeu", btn_chapeu)


func _on_btn_comprar_capa_pressed() -> void:
	_tentar_comprar("Capa de névoa", PRECO_CAPA, "tem_capa", btn_capa)


func _on_btn_comprar_aura_pressed() -> void:
	_tentar_comprar("Aura de carvão", PRECO_AURA, "tem_aura", btn_aura)


func _tentar_comprar(nome: String, preco: int, flag: String, botao: Button) -> void:
	if bool(get(flag)):
		label_status.text = "Você já possui: %s." % nome
		return
	if moedas < preco:
		label_status.text = "Moedas insuficientes para %s. Colete mais na fase." % nome
		return
	moedas -= preco
	set(flag, true)
	botao.disabled = true
	botao.text = "Adquirido"
	label_status.text = "%s adquirido. Cosmético — sem vantagem injusta." % nome
	_atualizar_hud()
```

> **Nota didática:** o apêndice usa `get`/`set` com nome da flag para não repetir três blocos idênticos. Na sala, o Mestre pode manter as três funções explícitas (mais legível para quem está no dia 1 de GDScript) e deixar este refactor como “desafio opcional”.

---

## Apêndice B — Critérios de correção rápida (Mestre / monitor)

| Critério | Peso sugerido | Evidência |
| :--- | :--- | :--- |
| Árvore Control + Panel + Buttons | obrigatório | Screenshot / descrição nas anotações |
| Script com sinal e HUD de moedas | obrigatório | Relato do Play + nomes de funções |
| Compra com preço fixo e bloqueios | obrigatório | Casos “sem moeda” e “já possui” |
| Sem mecânica de azar | obrigatório | Código / relato sem `randi` na compra |
| Síntese mercado ↔ ética ↔ loja | alto | `gdd-text` |
| Vocabulário IP / mercado | médio | anotações (secretas) |

---

*Documento de planejamento — Aula 06 / Módulo 2. Tasks 0–8 ✅ (2026-09-28). Aula completa no repo; liberar gate na turma via [`playbook-liberar-aula6.md`](./playbook-liberar-aula6.md).*
