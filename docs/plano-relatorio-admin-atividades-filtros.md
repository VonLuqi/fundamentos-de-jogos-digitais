# Plano — Relatório do Mestre: overflows, Atividades por aluno e filtros

> **Status:** feito em 2026-09-14 (Tasks 0–6). Overflow zero, Atividades por aluno, filtros + Única. Rotas da API inalteradas.

Corrigir o relatório admin **Almas Registradas** (`pages/souls.html`) para o Mestre conseguir **ler** o que a turma entregou, **achar** quem fez o quê e **filtrar** a lista de almas com várias opções ao mesmo tempo.

Prints de origem (2026-09-14):

1. Aba **Atividades** — cards planos “GDD - INTEGRACAO DOCUMENTAL”, parágrafo cru com `=== ANOTACOES_DE_CONFIGURACAO ===`, texto longo sem quebra.
2. Página do Grimório aberta a partir da Vigília — corpo em uma linha só, scroll horizontal.
3. Aba **Grimórios sob Vigília** — títulos/tags `LIMITELIMITE…` / `EEEE…` estouram o painel.

Documento de contexto da área admin: [`docs/plano-area-social-turma-anotacoes.md`](./plano-area-social-turma-anotacoes.md) (Vigília). Stack a manter: HTML/JS + `api/progress.js` (`listUsers`, `notesListAdmin`) + `css/souls.css`. Direção visual: Hades (`Cinzel` / `Crimson Text`, ouro/sangue). Não virar planilha SaaS.

---

## Objetivos

1. **Zero overflow horizontal** no relatório (Alunos, Atividades, Vigília) e no Grimório aberto a partir da Vigília.
2. Aba **Atividades** no mesmo padrão da Vigília: **lista de perfis** → clique → **atividades daquele aluno, por aula**, legíveis.
3. **Relatório-resumo** no detalhe: quais aulas aquele aluno já enviou atividade.
4. **Filtrar nomes** na aba Atividades pelas aulas em que há entrega.
5. **Filtros múltiplos** na aba Alunos (Almas cadastradas): turma, aulas concluídas, aulas com atividade, busca, **relíquia Única**, etc.

---

## Diagnóstico rápido (estado atual)

| Peça | Onde | Situação |
| --- | --- | --- |
| Overflow Atividades | `.activity-card__paragraph` | `white-space: pre-wrap` mas **sem** `overflow-wrap` / `word-break`; strings sem espaço (`LIMITELIMITE`, hashtags coladas) empurram a página |
| Overflow Vigília | `.vigilia-note__title`, `__meta` | Sem wrap; título/tags longos saem do card |
| Overflow Grimório | `css/grimorio.css` leitura | Corpo da inscrição não quebra palavras gigantes (print 2, `?id=62`) |
| Página souls | `css/souls.css` `body` | Sem `overflow-x: clip` (o shell usa isso; souls **não** usa app-shell) |
| Lista Atividades | `js/souls.js` | Perfis + detalhe + mapa da Trilha (Task 4); título vem de `LESSONS` |
| Payload | `listUsers` | `activities[]` tem `lessonId`, parágrafo, nome, turma, `userId`, `avatarIndex` (Task 3) |
| Parágrafo | `js/aulaN.js` `composeLessonRecord` | Síntese + bloco `=== ANOTACOES_DE_CONFIGURACAO ===` num único campo; o relatório mostra o pacote cru |
| Perfis | aba Alunos | Cards com avatar; aba Atividades **não** reutiliza esse cartão |
| Filtro | — | **Não existe** busca nem facetas nas três abas |
| Relíquia Única | `users.achievements` + `getAchievementRarity` | `listUsers` já manda `conquistas`; hoje só `soberano_do_submundo` é `unique` |
| Catálogo de aulas | `LESSONS` em `js/api.js` | aula1–aula4 com título real — o relatório não usa |

A aba **Grimórios sob Vigília** já é o modelo certo (lista à esquerda, detalhe à direita). Atividades deve **clonar esse gesto**, não a lista infinita de parágrafos.

---

## Status da Fase 0

**Task 0 feita em 2026-09-14.** Decisões da tabela abaixo + [lacunas fechadas nesta task](#lacunas-fechadas-na-task-0). Implementação começa na Task 1.

---

## Task 0 — Decisões congeladas

**Checklist (fechado)**

- [x] UX 1–12 batidas com os prints e com a Vigília.
- [x] Técnico 13–19 batido no código (`listUsers`, `aula1–4`, `normalizeUser`, souls fora do shell).
- [x] Seletor real do corpo do Grimório (não o placeholder).
- [x] IDs HTML / query string / posição da barra de filtros congelados.
- [x] Marcadores `=== ANOTACOES… ===` idênticos em `aula1.js`–`aula4.js`.
- [x] Busca na Vigília **fora** desta fatia.
- [x] Fora de escopo inalterado (exceto **#20 Relíquia Única**, pedido do Mestre em 2026-09-14).
- [x] **#20** Relíquia Única: toggle nas abas Alunos e Atividades; match por raridade `unique`, não por id.

### UX

| # | Tema | Decisão |
| --- | --- | --- |
| 1 | Overflow | Quebrar **qualquer** sequência longa (`overflow-wrap: anywhere`). Página souls: `overflow-x: clip` no `html`/`body`. Sem barra horizontal. |
| 2 | Grimório no fluxo admin | Incluir wrap no **corpo da inscrição** (`grimorio.css`) — o Mestre abre a nota a partir da Vigília. |
| 3 | Layout Atividades | **Híbrido igual à Vigília:** coluna de perfis + painel de detalhe. Desktop 2 colunas; `<900px` empilha (perfil → detalhe). |
| 4 | Quem aparece na lista | Alunos (`role !== admin`) com **pelo menos uma** atividade em `lesson_paragraphs`. Empty: “Nenhuma atividade enviada ainda.” |
| 5 | Clique no perfil | Abre o detalhe daquele aluno; marca `is-active`; deep link `?tab=activities&u=username`. |
| 6 | Relatório acima | No topo do detalhe: **chips da Trilha** (todas as aulas do catálogo `LESSONS`). Fez → chip ouro “enviou”; não fez → chip mudo “ausente”. Contador `N de M aulas com atividade`. |
| 7 | Corpo por aula | Uma seção por aula **com entrega**, título real (`01 — O Círculo Mágico…`), data, **Síntese** e **Anotações da prática** separados (parse do bloco `=== ANOTACOES… ===`). Sem dump do marcador. |
| 8 | Aula sem entrega | Não inventar seção vazia no corpo; o chip “ausente” no relatório já mostra o buraco. |
| 9 | Filtro Atividades | Busca nome/@ + **multi-aula** “enviou atividade em…” + turma + **Relíquia Única**. Grupos combinam com **E**; opções dentro do grupo com **OU**. Toggle **Todas as aulas marcadas** (E dentro das aulas). |
| 10 | Filtro Alunos | Barra própria na aba Alunos: busca + turma + aulas **concluídas** + aulas **com atividade** + aulas **vistas** + **Relíquia Única** (mesma regra E entre grupos / OU dentro). Atalho **Sem atividade** (ninguém com `lesson_paragraphs`). |
| 11 | Resumo do topo | Os 4 cards (Total / Vistas / Concluídas / Conquistas) continuam sobre **todos** os alunos, **sem** aplicar filtro — o Mestre não perde o censo da turma ao filtrar. |
| 12 | Persistência de filtro | Query string opcional (`turma`, `aula`, `q`, `unica`) para recarregar. Sem localStorage. |
| 20 | Relíquia Única | Toggle **Única**: passa quem tem **algum** id em `achievements` com raridade `unique` (`getAchievementRarity`). Hoje = Soberano (`soberano_do_submundo`). **Não** hardcodar só esse id. Sem toggle inverso neste ciclo. Abas **Alunos** e **Atividades**. Pílula `Única` no card quando o filtro pode aplicar (scan visual). |

### Técnico

| # | Tema | Decisão | Origem |
| --- | --- | --- | --- |
| 13 | Parse do parágrafo | Extrair `splitLessonRecord` / constantes do bloco para `js/lesson-paragraph.js` (aulas passam a importar; souls também) | DRY — hoje copiado em aula1–4 |
| 14 | DTO `activities` | Acrescentar `userId`, `avatarIndex`, `completedLessons` não. Avatar vem do `users` já em `listUsers` | Card de perfil |
| 15 | Agrupamento | **Cliente:** `Map(userId → { user, activities[] })` a partir de `users` + `activities`. Sem action nova | `listUsers` já traz os dois |
| 16 | Filtro | 100% cliente sobre o payload já carregado (59 almas cabem) | Sem endpoint de busca |
| 17 | Título hardcoded | Apagar “GDD - Integracao documental”. Usar `LESSONS` | Print 1 |
| 18 | Admin na lista | Continua **fora** (já filtrado em `loadSouls`) | Relatório é da turma |
| 19 | CSS | Tokens locais de `souls.css` permanecem (a página não entra no app-shell neste ciclo) | Fora de escopo: migrar souls para shell |

### Fora de escopo

- Editar/apagar atividade do aluno pelo admin.
- Export CSV / PDF.
- Filtro por conquista **exceto** raridade Única (#20); XP range; data de cadastro.
- Mudar o formato gravado em `lesson_paragraphs`.
- App-shell em `souls.html`.
- Clicker O Despertar.
- Busca/filtro na aba **Grimórios sob Vigília** (só overflow nesta fatia).

---

## Lacunas fechadas na Task 0

Auditado no repo em 2026-09-14. Isto **substitui** qualquer “seletor real TBD”.

### Código confirmado

| Peça | Fato |
| --- | --- |
| Marcadores | `=== ANOTACOES_DE_CONFIGURACAO ===` / `=== FIM_ANOTACOES_DE_CONFIGURACAO ===` iguais em `js/aula1.js`–`aula4.js` |
| Parse hoje | `js/lesson-paragraph.js` (Task 2 feita) — aulas importam; relatório reutiliza o split |
| `listUsers` users | `id`, `avatar_index`, `completed_lessons`, `conquistas`; `normalizeUser` → `avatarIndex`, `completedLessons`, `achievements` |
| Relíquia Única | Catálogo: um `rarity: "unique"` (`soberano_do_submundo`). `getAchievementRarity` já existe em `js/game-catalog.js` / `js/api.js`. Sem campo extra na API. |
| `listUsers` activities | Tem `lessonId`, `paragraph`, `updatedAt`, `fullName`, `username`, `turma`, **`userId`**, **`avatarIndex`** (Task 3) |
| Admin | Já excluído das activities no server (`role === 'admin'` → null) e da aba Alunos no client |
| Corpo Grimório | `#note-view-body` com classes `.note-view__body.note-canvas__body`. CSS atual: `white-space: pre-wrap` **sem** wrap de palavra longa (print 2) |
| souls | `body.souls-page`; **não** usa `app-shell` nem `hades-tokens.css` |

### Barra de filtros (posição)

**Abaixo das tabs, acima do painel ativo** — não entre o summary e as tabs.

O summary continua censo. As tabs continuam navegação. Os filtros mudam com a aba (`hidden` nos grupos que não aplicam).

```
Summary (4 cards)
Tabs: Alunos | Atividades | Grimórios
#report-filters     ← contexto da aba
Painel ativo
```

### IDs HTML (Tasks 4–5 não inventam outros)

| Id | Papel |
| --- | --- |
| `#report-filters` | Barra única |
| `#filter-q` | Busca |
| `#filter-turma` | Chips TCG01 / TCG02 |
| `#filter-completed` | Chips Concluiu (só aba Alunos) |
| `#filter-viewed` | Chips Viu (só aba Alunos) |
| `#filter-activity` | Chips Enviou em |
| `#filter-need-all` | Exigir todas as marcadas |
| `#filter-no-activity` | Sem oferenda (só aba Alunos) |
| `#filter-unique` | Relíquia Única (Alunos + Atividades) |
| `#filter-clear` | Limpar véu |
| `#filter-count` | `{n} almas neste véu` |
| `#activity-owners` | Coluna de perfis |
| `#activity-detail` | Painel direito |
| `#activity-detail-title` | Oferendas da Trilha / @username |
| `#activity-detail-close` | Fechar |
| `#activity-trail-map` | Mapa da Trilha (chips) |
| `#activity-lessons` | Seções por aula |

`#activities-list` some na Task 4 (substituído pelo layout acima). `#souls-grid` permanece.

### Query string

| Param | Exemplo | Papel |
| --- | --- | --- |
| `tab` | `activities` \| `grimorios` | Já existe (`users` = ausente) |
| `u` | `gabatuum` | Username do detalhe (Atividades) |
| `q` | texto | Busca |
| `turma` | `TCG01,TCG02` | CSV |
| `aula` | `aula1,aula3` | Faceta **Enviou em** |
| `concluiu` | `aula1,aula2` | Só aba Alunos |
| `viu` | `aula1` | Só aba Alunos |
| `need` | `all` | Exigir todas as marcadas |
| `sem` | `1` | Sem oferenda |
| `unica` | `1` | Relíquia Única |

Ler/escrever na Task 5. `tab` + `u` já na Task 4.

### “Exigir todas as marcadas”

**Um** checkbox. Aplica-se a **cada** faceta de aula que estiver ativa na aba (`completed` / `viewed` / `activity`): se `need=all`, a alma precisa ter **todas** as aulas marcadas naquela faceta (⊆), não a união. Facetas entre si continuam **E**.

### Seletor de overflow no Grimório (Task 1)

```css
.note-view__body,
.note-canvas__body {
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
}
```

Também `#note-view-title` e `#note-view-tags` (títulos `LIMITELIMITE…` no chrome da inscrição).

### Classes novas (Atividades / filtros)

| Classe | Uso |
| --- | --- |
| `.report-filters` | Barra |
| `.filter-facet` | Grupo (label + chips) |
| `.filter-chip` / `.is-on` | Chip multi-select |
| `.activity-layout` | Grid 2 colunas (igual `.vigilia-layout`) |
| `.activity-owner` | Botão-perfil (espelha `.vigilia-owner` + avatar) |
| `.trail-chip` / `.is-sent` / `.is-missing` | Mapa da Trilha |
| `.activity-lesson` | Seção de uma aula |
| `.activity-block` / `.activity-block__text` | Síntese ou prática |

Breakpoint do empilhamento: **900px**, igual à Vigília.

---

## Linguagem de produto (congelada)

| Conceito | Nome no Domínio | Uso |
| --- | --- | --- |
| Aba | **Atividades** | Tab (já existe) |
| Lista | **Almas com oferenda** | Coluna esquerda |
| Detalhe | **Oferendas da Trilha** | Painel direito |
| Resumo de aulas | **Mapa da Trilha** | Chips no topo do detalhe |
| Chip com entrega | **Enviou** | Estado positivo |
| Chip sem entrega | **Ausente** | Estado vazio |
| Bloco síntese | **Síntese** | Texto do `gdd-text` |
| Bloco prática | **Anotações da prática** | Texto do `config-notes` |
| Filtro aulas (atividades) | **Enviou em** | Multi-select |
| Filtro AND aulas | **Exigir todas as marcadas** | Checkbox |
| Filtro alunos / concluídas | **Concluiu** | Multi-select |
| Filtro alunos / vistas | **Viu** | Multi-select |
| Atalho | **Sem oferenda** | Só quem não enviou atividade |
| Relíquia | **Única** | Toggle; tooltip: *Soberano do Submundo* (e qualquer Única futura) |
| Busca | **Buscar alma…** | Nome ou @username |
| Empty lista filtrada | **Nenhuma alma neste véu.** | Filtro sem match |
| Empty detalhe | **Esta alma ainda não deixou oferenda na Trilha.** | Não deve ocorrer se a lista só tem quem enviou; útil com deep link |

Copy dos chips: `Aula 01` (número) + tooltip com título completo.

---

## Arquitetura alvo (congelada)

```
pages/souls.html
├── Summary (4 cards — sempre censo completo)
├── Tabs: Alunos | Atividades | Grimórios
├── #report-filters  [contexto = aba ativa]
│     Alunos:      busca · turma · concluiu · viu · enviou · única · sem oferenda · exigir todas
│     Atividades:  busca · turma · enviou em · única · exigir todas
│     Vigília:     barra oculta (sem filtro nesta fatia)
├── Tab Alunos        → #souls-grid (cards filtrados)
├── Tab Atividades
│     ├── #activity-owners   perfis (avatar + nome + @ + N/M aulas)
│     └── #activity-detail
│           ├── Mapa da Trilha (#activity-trail-map)
│           └── seções por aula (#activity-lessons)
└── Tab Grimórios     → Vigília (já existe) + wrap
```

```
listUsers
  users[]          + viewedLessons, completedLessons, avatarIndex, turma
  activities[]     + userId, avatarIndex, lessonId, paragraph, updatedAt
        │
        ▼
  groupActivitiesByUser(users, activities)
        │
        ▼
  applySoulFilters() / applyActivityFilters()  → render
```

### Parse da oferenda

Reusar o contrato das aulas:

```
[síntese GDD]

=== ANOTACOES_DE_CONFIGURACAO ===
anotações da prática
=== FIM_ANOTACOES_DE_CONFIGURACAO ===
```

UI do detalhe **nunca** mostra as linhas `===`. Se só houver um dos lados, oculta o bloco vazio.

---

## Filtros (contrato)

Conjuntos (facetas). Uma alma passa se satisfaz **todas** as facetas ativas. Faceta inativa = “qualquer”.

### Aba Alunos

| Faceta | Controle | Match |
| --- | --- | --- |
| `q` | texto | `fullName` ou `username` contém (sem acento, case-insensitive) |
| `turma` | chips `TCG01` `TCG02` | `user.turma` ∈ selecionadas; vazio = todas |
| `completed` | chips por `LESSONS.id` | `completedLessons` ∩ seleção ≠ ∅ (ou ⊆ se “exigir todas”) |
| `viewed` | chips | `viewedLessons[].lessonId` ∩ seleção ≠ ∅ (idem) |
| `activity` | chips | tem parágrafo na aula ∈ seleção (idem) |
| `noActivity` | checkbox **Sem oferenda** | `activities` do user vazias; **ignora** a faceta `activity` se os dois conflitarem — `noActivity` vence |
| `unique` | toggle **Única** | `user.achievements` tem algum id com `getAchievementRarity(id) === 'unique'` |

### Aba Atividades

Mesmas `q` + `turma` + `activity` (rótulo **Enviou em**) + **`unique`**. Sem `noActivity` (a lista já é só quem enviou). Checkbox **Exigir todas as marcadas** aplica-se só à faceta de aulas. `unique` combina com **E** (ex.: enviou Aula 01 **e** tem Única).

Contador da lista: `{n} almas neste véu` (após filtro).

---

## Overflow — regras CSS (congeladas)

Aplicar em `css/souls.css` e no corpo do Grimório:

```css
.souls-page {
  overflow-x: clip;
}

.activity-detail__body,
.activity-block__text,
.activity-card__paragraph,
.vigilia-note__title,
.vigilia-note__meta,
.soul-card__name,
.soul-card__username {
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
}

.vigilia-detail,
.activity-detail,
.soul-card {
  min-width: 0;
  max-width: 100%;
}
```

No Grimório de leitura (fluxo admin) — seletores reais:

```css
.note-view__body,
.note-canvas__body,
#note-view-title,
#note-view-tags {
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
}
```

Grids: `minmax(0, 1fr)` no detalhe da Vigília/Atividades para o filho não estourar a coluna.

---

## DTO (acréscimo mínimo)

`listUsers` → cada item de `activities`:

```text
userId, lessonId, paragraph, updatedAt,
fullName, username, turma, avatarIndex
```

`users[]` permanece. Cliente não precisa de action nova.

---

## Fases e tasks

### Task 1 — Overflow (CSS + smoke)

**Status:** feita (2026-09-14)

**Faz**

- [x] `overflow-x: clip` em `.souls-page` / `html` da página.
- [x] `overflow-wrap: anywhere` + `min-width: 0` nos textos e colunas citados.
- [x] Wrap do corpo da inscrição no Grimório: `.note-view__body`, `.note-canvas__body`, `#note-view-title`, `#note-view-tags`.
- [x] Smoke estático: `tests/souls-report-overflow-smoke.mjs` exige as regras no CSS.

**Pronto quando:** strings `LIMITELIMITE…` e `EEEE…` quebram dentro do card; página sem scroll-x; print 2/3 deixam de vazar.

### Task 2 — Parser compartilhado

**Status:** feita (2026-09-14)

**Arquivo:** `js/lesson-paragraph.js`

- [x] Exportar `CONFIG_NOTES_START`, `CONFIG_NOTES_END`, `splitLessonRecord`, `composeLessonRecord`.
- [x] `aula1.js`–`aula4.js` passam a importar (comportamento idêntico).
- [x] Teste: `tests/lesson-paragraph-smoke.mjs` — split com os dois blocos, só síntese, só notas, marcador ausente.
- [x] `npm run check` inclui `js/lesson-paragraph.js` e o smoke.

**Pronto quando:** `npm run check` verde; aulas ainda salvam o mesmo formato.

### Task 3 — API DTO + agrupamento

**Status:** feita (2026-09-14)

- [x] `api/progress.js` `listUsers`: incluir `userId` e `avatarIndex` em cada activity.
- [x] `js/souls-report.js` + `js/souls.js`: `groupActivitiesByUser(users, activities)` (ignora admin; ordena donos por `updatedAt` mais recente).
- [x] Smoke `tests/souls-activities-filters-smoke.mjs`: mapper com `userId` / `avatarIndex`; agrupamento com teste puro.

**Pronto quando:** smoke estático acha `userId` / `avatarIndex` no mapper; agrupamento coberto por teste puro (exportar helper ou smoke que parseia a função).

### Task 4 — Aba Atividades (perfis + detalhe + mapa)

**Status:** feita (2026-09-14)

**HTML:** `#activity-owners` + `#activity-detail` (+ título, fechar, mapa, seções — IDs da Task 0). Remover `#activities-list`.

**JS:**

- [x] Card de perfil: avatar (`loadAvatarImage`), nome, `@`, turma, `N/M` aulas com oferenda.
- [x] Clique → `openOwnerActivities(owner)` + `?tab=activities&u=`.
- [x] Mapa da Trilha: um chip por `LESSONS`.
- [x] Seção por aula entregue: título do catálogo, data, Síntese, Anotações da prática.
- [x] Fechar detalhe (botão, como Vigília).

**Pronto quando:** clicar um aluno mostra só as aulas dele; chips batem com as seções; marcadores `===` não aparecem.

### Task 5 — Filtros

**Status:** feita (2026-09-14)

- [x] Componente único em `js/souls.js` (barra `#report-filters`; match em `js/souls-report.js`).
- [x] Alunos: facetas congeladas; re-render do grid.
- [x] Atividades: filtra a coluna de perfis; se o aluno ativo sair do filtro, fecha o detalhe.
- [x] Empty states.
- [x] Query congelada na Task 0: `q`, `turma`, `aula`, `concluiu`, `viu`, `need=all`, `sem=1`, `unica=1` (+ `tab`/`u`).
- [x] Relíquia Única: `getAchievementRarity` no cliente; pílula `Única` no soul-card / activity-owner quando o aluno tem alguma.

**Pronto quando:** marcar TCG02 + Aula 01 reduz as duas listas; busca `@username` acha um; “Sem oferenda” na aba Alunos esconde quem tem parágrafo; **Única** deixa só quem tem raridade unique (hoje Soberano).

### Task 6 — Check e docs

**Status:** feita (2026-09-14)

- [x] `npm run check` + smokes novos (`souls-report-overflow`, `lesson-paragraph`, `souls-activities-filters`).
- [x] README: uma linha na área admin (tabela de rotas não muda).
- [x] Marcar este plano.

**Pronto quando:** check verde; README aponta o relatório; aceite abaixo todo marcado.

---

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `pages/souls.html` | Barra de filtros + layout 2 colunas Atividades |
| `css/souls.css` | Overflow, layout detalhe, chips, filtros |
| `css/grimorio.css` | Wrap do corpo (fluxo Vigília → inscrição) |
| `js/souls.js` | Grupo, detalhe, filtros, deep link |
| `js/souls-report.js` | `groupActivitiesByUser` (teste puro) |
| `js/lesson-paragraph.js` | Parse/compose do pacote da aula |
| `js/aula1.js` … `aula4.js` | Importar o parser |
| `api/progress.js` | `userId` + `avatarIndex` nas activities |
| `tests/souls-report-overflow-smoke.mjs` | CSS + markup |
| `tests/lesson-paragraph-smoke.mjs` | Split/compose |
| `tests/souls-activities-filters-smoke.mjs` | Markup filtros, DTO, agrupamento, LESSONS no título |
| `package.json` | `check` |
| `docs/plano-relatorio-admin-atividades-filtros.md` | Este arquivo |

---

## Microcopy congelada (filtros e empty)

| Superfície | Copy |
| --- | --- |
| Placeholder busca | Buscar alma… |
| Label turma | Turma |
| Label concluídas | Concluiu |
| Label vistas | Viu |
| Label atividade | Enviou em |
| Checkbox AND | Exigir todas as marcadas |
| Checkbox vazio | Sem oferenda |
| Toggle única | Única |
| Tooltip única | Relíquia de raridade Única |
| Limpar | Limpar véu |
| Contador | `{n} almas neste véu` |
| Chip enviou | Enviou |
| Chip ausente | Ausente |
| Empty filtro | Nenhuma alma neste véu. |
| Empty atividades | Nenhuma oferenda na Trilha ainda. |
| Mapa vazio (aluno) | Esta alma ainda não deixou oferenda na Trilha. |
| Bloco síntese vazio | (ocultar o bloco) |
| Bloco prática vazio | (ocultar o bloco) |
| Só marcador, sem texto | *Oferenda vazia.* |

---

## Checklist de aceite

Overflow

- [x] Aba Atividades: parágrafo longo / `LIMITELIMITE` / hashtags **não** geram scroll-x.
- [x] Vigília: título e tags longos quebram no card e no detalhe.
- [x] Inscrição do Grimório aberta da Vigília quebra o corpo.
- [x] `html` da página souls não rola na horizontal em 1280px nem em 390px.

Atividades

- [x] Lista é de **perfis** (avatar, nome, @, turma, N/M), não de parágrafos soltos.
- [x] Clique abre só as aulas daquele aluno.
- [x] Mapa da Trilha no topo: uma aula do catálogo = um chip Enviou/Ausente.
- [x] Cada aula com entrega: título real da `LESSONS`, data, Síntese ≠ Anotações da prática.
- [x] Marcadores `=== ANOTACOES_DE_CONFIGURACAO ===` **não** aparecem.
- [x] Título hardcoded “GDD - Integracao documental” **sumiu**.
- [x] Deep link `?tab=activities&u=username` abre o detalhe.

Filtros

- [x] Atividades: filtrar por uma ou várias aulas com entrega; busca por nome/@; turma multi; **Única**.
- [x] “Exigir todas as marcadas” exige as aulas selecionadas simultaneamente.
- [x] Alunos: multi turma + concluiu + viu + enviou + Única + Sem oferenda + busca.
- [x] Toggle **Única**: só almas com alguma conquista `rarity === unique` (não filtrar pelo id `soberano_do_submundo` no código).
- [x] Facetas combinam com E; opções de uma faceta com OU (salvo o toggle).
- [x] Cards do topo (59 almas, etc.) **não** mudam com o filtro.
- [x] Empty “Nenhuma alma neste véu.”

Regressão

- [x] Vigília continua abrindo notas em nova aba.
- [x] Alunos (aba) ainda mostram XP / vistas / turma.
- [x] Aulas 1–4 ainda salvam e leem o mesmo pacote de parágrafo.
- [x] `npm run check` verde.
- [x] Admin nunca entra na lista da turma.

---

## Ordem de PRs

1. Task 1 (overflow) — alívio imediato dos prints.
2. Task 2 (parser) — desbloqueia o detalhe limpo.
3. Tasks 3–4 (DTO + UI Atividades).
4. Task 5 (filtros nas duas abas).
5. Task 6 (check) — **feita**.

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| 59 cards × filtros lentos | Filtro em memória; 59 é barato |
| Aula nova no catálogo | Chips leem `LESSONS`; não hardcodar aula1–4 na UI |
| Parágrafo legado sem marcador | `splitLessonRecord` devolve tudo como Síntese |
| Conflito Sem oferenda × Enviou em | `noActivity` vence (congelado #10) |
| Deep link de username inexistente | Empty no detalhe + lista intacta |
| `word-break: break-word` feio em português | `overflow-wrap: anywhere` primeiro; break só como reforço em títulos |
| souls fora do shell | Não puxar `hades-tokens` neste ciclo; overflow local basta |
