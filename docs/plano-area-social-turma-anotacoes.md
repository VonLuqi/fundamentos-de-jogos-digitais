# Plano — Área Social (Turma), Separação Admin e Anotações

## Contexto

Hoje o **Painel do Herói** (`pages/dashboard.html` → `#profile-panel`) concentra em um único card vertical:

1. identidade do herói (avatar, rank, XP);
2. **Companheiros de Jornada** (oferecer vínculo, convites, ao seu lado);
3. **Ferramentas do Mestre** (gerar códigos, liberar aulas, ver almas) — só para admin, mas visualmente na mesma coluna.

Isso deixa o painel longo, mistura social com administração e não oferece uma visão clara da **turma** como espaço social. Também não existe um lugar estável para o aluno guardar **anotações** próprias (título + descrição).

Documento predecessor: [`docs/plano-sistema-amigos.md`](./plano-sistema-amigos.md) (vínculos, Espelho, limite 25, escopo de busca por turma).

Direção visual obrigatória: preservar o Design System Hades-like (`--hades-*`, Cinzel / Crimson Text, `btn-gold`, linguagem narrativa do Domínio). Não introduzir UI genérica de “rede social” ou “bloco de notas”.

> **Task 11 feita:** tokens Hades centralizados em `css/hades-tokens.css` e ligados nas páginas shell (Salão/Grimório inclusive).

---

## Objetivos

1. Dar aos alunos uma **área da turma** (área social) para ver colegas e adicionar companheiros dali.
2. Garantir que **não-admins não vejam** “Ver Almas Registradas”, “Gerar códigos” nem “Liberar aulas”.
3. **Separar** funcionalidades do print em seções/páginas próprias — perfil ≠ social ≠ grimório ≠ admin.
4. Melhorar QoL do painel social para ficar mais útil no dia a dia.
5. Permitir que o aluno crie **anotações** no **Grimório Pessoal** (título, descrição, metadados) com compartilhamento entre companheiros e leitura admin.

---

## Diagnóstico rápido (estado atual)

| Peça | Onde | Situação |
| --- | --- | --- |
| Card lotado | `#profile-panel` em `dashboard.html` | Perfil + companheiros + admin empilhados |
| Companheiros | `#companions-panel` + `js/friends-ui.js` | Funcional; convite por username |
| Admin tools | `#admin-tools` + `dashboard.js` | Já some se `role !== 'admin'`, mas ocupa o mesmo card |
| Almas | `pages/souls.html` + nav `data-admin-only` | Página admin; reforçar que aluno nunca vê CTA |
| Turma | `users.turma` (`TCG01` / `TCG02`) | Campo no user; **sem** listagem “minha turma” para aluno |
| Busca de amigos | `friendSearch` em `api/progress.js` | Autocomplete na mesma turma; exact global |
| Anotações livres | — | **Não existe** (só parágrafo de aula / config notes) |
| Stack | HTML/JS + Supabase + `api/progress.js` | Manter padrão de actions no progress |

---

## Status da Fase 0

**Fase 0 fechada** — respostas do autor + lacunas técnicas completadas por coerência com o restante das escolhas (marcadas como *completado na Fase 0* abaixo).

---

## Task 0 — Respostas (fechada)

### Produto / UX

| # | Tema | Decisão |
| --- | --- | --- |
| 1 | Onde vive a turma | **(C)** Híbrido: preview no dashboard + página completa **Salão Espiritual** |
| 2 | Companheiros vs turma | **(B)** Turma = descoberta; Companheiros = vínculos aceitos — **duas subseções na mesma área** |
| 3 | Nome da área social | **Salão Espiritual** |
| 4 | Dados na lista | Avatar + @username + nome + **rank/nível** + **indicador de vínculo** + CTA formar **ou** romper vínculo |
| 5 | Privacidade | Todo aluno da mesma `turma` vê os outros alunos; **admins excluídos** da lista |
| 6 | Adicionar amigo | **Ambos**: botão rápido na linha + ir ao Espelho |
| 7 | Form username | **Permanece** na área social (convite exato / outra turma) |
| 8 | Separação do card | Quatro áreas lógicas no dashboard: **Perfil \| Social (preview) \| Grimório (preview) \| Admin**; admin como **mini-barra no topo** (ver #10). Nota: superfície de códigos do admin = **Gerar códigos** (não confundir com resgate de aluno) |
| 9 | Almas / tools student | Esconder **Almas**, **Gerar códigos** e **Liberar aulas** de qualquer superfície `student`. Aluno **nunca** vê botão nem item de menu. Atalhos hoje: `#admin-tools`, nav `data-admin-only` → `souls.html`; auditar deep links |
| 10 | Destino visual admin | **Mini-barra admin no topo do dashboard** (Gerar códigos / Liberar aulas / Ver Almas) |

### Anotações

| # | Tema | Decisão |
| --- | --- | --- |
| 11 | Onde ficam | **Ambos**: lista resumida (dashboard + índice) que leva à **página da anotação** + página do Grimório |
| 12 | Nome | **Grimório Pessoal** |
| 13 | Campos | **Todos**: título + descrição + datas criação/edição + **tags** + **vínculo opcional a aula** + **pin/favorito** |
| 14 | Limites | Sem limite rígido de quantidade (**soft warning**). *Completado na Fase 0:* tetos sanitários de caracteres (**título 120** / **corpo 8000**) para evitar abuse |
| 15 | Escopo | Privado por padrão; **compartilhar com companheiro(s)** no MVP. **Admin pode ler**: seção admin listando alunos com anotações e abrindo o grimório do aluno |
| 16 | Edição / exclusão | Criar + editar; **apagar só com confirmação** (= CRUD com confirmação destrutiva) |

### QoL do painel social

MVP inclui **todas**:

- Contador turma `X alunos` + companheiros `Y / 25`
- Filtro/busca local (username/nome)
- Ordenação: alfabética / vinculados primeiro / pendentes primeiro
- Empty states narrativos
- Badge de estado (convidar / pendente / ao seu lado / espelho)
- **Espelho Completo** só se companheiro; da turma, **não-companheiro** vê **Espelho da Turma** (sem conquistas)
- Convites recebidos no topo
- Skeleton / loading
- Erros amigáveis (limite 25, já enviado, etc.)

### Mobile

| # | Tema | Decisão |
| --- | --- | --- |
| 18 | Mobile | **Páginas separadas** (shell drawer) — alinha com híbrido Salão + Grimório |

### Técnico (*completado na Fase 0* onde não marcado)

| # | Tema | Decisão | Origem |
| --- | --- | --- | --- |
| 19 | API turma | Action **`classmatesList`** em `api/progress.js` (DTO mínimo, mesma turma, exclui self e admins, inclui `bondStatus`) | Completado — padrão do projeto |
| 20 | Persistência notas | Tabela **`user_notes`** + tabela **`user_note_shares`** (compartilhamento com companheiros). Campos: `title`, `body`, `pinned`, `tags[]` (ou tabela de tags), `lesson_id` nullable, timestamps | Completado — exige share + admin read + pin/tags |
| 21 | Shell | Itens novos: **Salão Espiritual** + **Grimório Pessoal**. Almas continua admin-only. Teto ~6 destinos primários (Início, Painel, Aulas, Conquistas, Salão, Grimório) | Completado — páginas + mobile |
| 22 | Fora de escopo | **Fora:** chat, feed da turma, troca de turma pelo aluno, grupos menores. **Dentro (exceção):** share de notas com companheiro; leitura admin do grimório | Completado a partir das respostas 15 |

---

## Linguagem de produto (congelada)

| Conceito | Nome no Domínio | Uso |
| --- | --- | --- |
| Área social / turma | **Salão Espiritual** | Página + preview no Painel |
| Subseção descoberta | **Turma** / **Colegas da Jornada** | Lista da mesma `turma` |
| Subseção vínculos | **Companheiros de Jornada** / **Ao seu lado** | Aceitos + gestão |
| Oferecer amizade | **Oferecer vínculo** / **Convidar** | CTA |
| Romper | **Romper vínculo** | CTA destrutivo (confirmação) |
| Perfil leve (não-amigo) | **Espelho da Turma** | Sem álbum de conquistas |
| Perfil completo (amigo) | **Espelho do Companheiro** | Com álbum (regras secretas existentes) |
| Anotações | **Grimório Pessoal** | Página + preview |
| Uma anotação | **Página do Grimório** / entrada | Título + inscrição + metadados |
| Share | **Revelar ao Companheiro** | Compartilhar nota com vínculo aceito |
| Admin tools | **Ferramentas do Mestre** | Mini-barra no topo do dashboard |
| Admin — notas dos alunos | **Grimórios sob Vigília** (ou seção em Almas / tools) | Lista quem tem notas + abrir grimório |

Evitar o rótulo **“Almas da Turma”** na UI do aluno — colide com **Almas Registradas**.

---

## Arquitetura alvo (congelada)

```
Dashboard (Painel do Herói)
├── [Admin] Mini-barra Ferramentas do Mestre     ← só role=admin (topo)
│     ├── Gerar códigos
│     ├── Liberar aulas → aulas.html
│     └── Ver Almas → souls.html
├── [A] Identidade do Herói                      ← card compacto
├── [B] Preview Salão Espiritual                 ← contadores + atalho → salão
│     └── (opcional) 2–3 convites urgentes / colegas
└── [C] Preview Grimório Pessoal                 ← últimas notas / pins → grimório

pages/salao-espiritual.html  (Salão Espiritual)
├── Oferecer vínculo (form username)
├── Convites recebidos (topo)
├── Convites enviados
├── Turma (lista colegas + busca + ordenação + CTAs vínculo)
├── Companheiros / Ao seu lado
└── → Espelho da Turma | Espelho do Companheiro

pages/companheiro.html?u=<username>
├── bond accepted → Espelho Completo (álbum)
└── mesma turma + sem bond → Espelho da Turma (sem conquistas)
    (fora da turma + sem bond → 403 / “vínculo necessário”)

pages/grimorio.html  (Grimório Pessoal — índice)
├── lista (pins primeiro), busca, nova entrada
└── → pages/grimorio-nota.html?id=… (leitura/edição)

Admin
├── Mini-barra + souls.html
└── Seção Grimórios sob Vigília: alunos com notesCount > 0 → grimório read-only do aluno

api/progress.js
├── classmatesList
├── friends* (existente)
├── notesList | noteGet | noteCreate | noteUpdate | noteDelete
├── noteShare | noteUnshare
├── notesListAdmin | notesListForUser (admin)
└── friendProfile / espelho: flag includeAchievements conforme bond
```

---

## Decisões congeladas (Fase 0 fechada)

| Tema | Decisão |
| --- | --- |
| Nome social | **Salão Espiritual** |
| Nome notas | **Grimório Pessoal** |
| Âncora UX | Híbrido: **previews no dashboard** + páginas `salao-espiritual.html` e `grimorio.html` |
| Companheiros vs turma | Duas subseções no Salão: **Turma** (descoberta) + **Companheiros** (aceitos) |
| Lista turma | Avatar, nome, @username, rank/nível, `bondStatus`, CTA oferecer/romper, atalho espelho |
| Privacidade turma | Todos os `student` da mesma `turma`; admins fora da lista |
| Espelhos | Completo só com bond aceito; **Espelho da Turma** (sem conquistas) para colega sem bond |
| Form username | Mantido no Salão |
| Admin UI | Mini-barra no **topo** do dashboard; zero tools admin para student |
| Almas / códigos / liberar | Somente admin (UI + API) |
| Campos nota | title, body, created_at, updated_at, pinned, tags, lesson_id opcional |
| Limites nota | Soft warning de quantidade; hard **120 / 8000** chars |
| Share / admin | Share com companheiros aceitos; admin lista e lê grimórios |
| Delete nota | Com confirmação narrativa |
| API turma | `classmatesList` em `progress.js` |
| Persistência | `user_notes` + `user_note_shares` |
| Shell | + **Salão Espiritual** + **Grimório Pessoal**; Almas `data-admin-only` |
| QoL MVP | Contadores, busca, ordenação, badges, empty states, convites no topo, skeletons, erros, espelhos diferenciados |
| Mobile | Páginas no drawer (não accordion monolítico no profile-panel) |
| Fora de escopo | Chat, feed, troca de turma, subgrupos |

### Contratos de DTO (Fase 0)

**ClassmateCard**

```text
id, username, fullName, avatarIndex, turma, rank, level,
bondStatus: 'none' | 'outgoing' | 'incoming' | 'accepted'
```

**CompanionCard** — manter normalização atual de `friends-ui` / `api.js`.

**NoteSummary**

```text
id, title, pinned, tags[], lessonId | null,
createdAt, updatedAt, sharedWithCount | sharedWithUsernames[]
```

**NoteDetail** — Summary + `body` + `sharedWith: [{ userId, username, fullName }]`.

**Espelho da Turma** (sem bond): `id, username, fullName, turma, avatarIndex, rank, level` — **sem** `achievements`, **sem** XP detalhado se quiser paridade mínima (rank/level ok).

**Espelho do Companheiro** — DTO público já congelado em `plano-sistema-amigos.md`.

### Authz rápida

| Ação | student | admin |
| --- | --- | --- |
| `classmatesList` | própria turma | opcional: turma filtro ou 403 — *default: admin não aparece na lista de alunos; se admin abrir Salão, pode ver turma escolhida ou empty* |
| friends* | dono | dono |
| notes CRUD | dono | — |
| notes share | dono ↔ companion aceito | — |
| notes read shared | destinatário companheiro | — |
| notesListAdmin / notes de outro user | 403 | sim |
| listUsers / souls / generateCode / setLessonGate | 403 | sim |
| Espelho completo | bond aceito | (regras atuais) |
| Espelho da Turma | mesma turma | — |

---

## Microcopy congelada (Task 1)

Lista curta para implementação. Tom: Domínio / Hades-like; sem jargão de rede social.

### Títulos e navegação

| Superfície | Copy |
| --- | --- |
| Página social | Salão Espiritual |
| Preview no Painel | Salão Espiritual |
| CTA preview → página | Entrar no Salão |
| Subseção descoberta | Turma |
| Subseção vínculos aceitos | Ao seu lado |
| Subseção / bloco convites in | Convites recebidos |
| Subseção convites out | Convites enviados |
| Form de convite | Oferecer vínculo |
| Placeholder do form | Username do aluno |
| Botão enviar convite | Convidar |
| Página de notas | Grimório Pessoal |
| Preview notas | Grimório Pessoal |
| CTA preview → página | Abrir o Grimório |
| Nova nota | Nova inscrição |
| Label título | Título |
| Label corpo | Inscrição |
| Pin ativo / ação | Fixar no Grimório / Desafixar |
| Tags | Marcas |
| Vínculo a aula | Ligar à Trilha (opcional) |
| Share | Revelar ao Companheiro |
| Unshare | Velar novamente |
| Admin mini-barra | Ferramentas do Mestre |
| Admin notas | Grimórios sob Vigília |
| Espelho leve | Espelho da Turma |
| Espelho completo | Espelho do Companheiro |

### Contadores e badges

| Uso | Copy |
| --- | --- |
| Contador turma | `{n} alunos` / `1 aluno` |
| Contador companheiros | `{n} / 25` |
| Soft warning notas (ex. ≥ 50) | O Grimório engrossa… ({n} inscrições). |
| Badge `none` | — (só CTA) |
| Badge `outgoing` | Convite enviado |
| Badge `incoming` | Convite recebido |
| Badge `accepted` | Ao seu lado |
| CTA `none` | Oferecer vínculo |
| CTA `accepted` | Romper vínculo |
| Atalho espelho (qualquer modo permitido) | Espelho |
| Atalho só com bond | Espelho completo |

### Empty states

| Onde | Copy |
| --- | --- |
| Turma sem colegas | A turma ainda não despertou neste Salão. |
| Turma filtro sem resultado | Nenhum colega corresponde à busca. |
| Sem convites recebidos | Nenhum convite aguarda sua resposta. |
| Sem convites enviados | Nenhum convite em viagem. |
| Sem companheiros aceitos | Nenhum companheiro ao seu lado… ainda. |
| Grimório vazio (dono) | O Grimório espera a primeira inscrição. |
| Grimório compartilhado vazio (viewer) | Nada foi revelado a você… ainda. |
| Vigília admin sem notas | Nenhum grimório sob vigília. |
| Lista admin filtrada vazia | Nenhuma alma com inscrições neste filtro. |

### Confirmações destrutivas

| Ação | Título | Corpo | Confirmar | Cancelar |
| --- | --- | --- | --- | --- |
| Romper vínculo | Romper vínculo | Deseja romper o vínculo com este companheiro? | Romper | Manter vínculo |
| Apagar nota | Rasgar inscrição | Esta página do Grimório será perdida. Confirma? | Rasgar | Guardar |
| Velar share | Velar novamente | O companheiro deixará de ver esta inscrição. | Velar | Manter revelada |

### Erros e bloqueios (amigáveis)

| Caso | Copy |
| --- | --- |
| Limite 25 companheiros | Sua companhia já está completa (25). Rompa um vínculo para oferecer outro. |
| Convite já enviado | Este convite já está em viagem. |
| Já são companheiros | Este vínculo já foi selado. |
| User não encontrado | Nenhuma alma com esse username. |
| Convite a si mesmo | Não se oferece vínculo a si mesmo. |
| Sem permissão Espelho completo | É preciso um vínculo para contemplar este espelho. |
| Fora da turma / sem bond | Este espelho não se abre a estranhos da jornada. |
| Título vazio | Toda inscrição precisa de um título. |
| Título > 120 | O título ultrapassou o limite do pergaminho (120). |
| Corpo > 8000 | A inscrição é longa demais para este Grimório (8000). |
| Share com não-companheiro | Só é possível revelar a quem está ao seu lado. |
| Falha de rede genérica (Salão) | Os laços estão inacessíveis no momento. |
| Falha de rede (Grimório) | O Grimório não responde… tente de novo. |
| Student tenta rota admin | (UI oculta; se deep link) Esta senda é só do Mestre. |

### Ordenação / filtros (labels UI)

| Controle | Opções de copy |
| --- | --- |
| Busca turma | Buscar na turma… |
| Ordenar | A–Z · Vinculados primeiro · Pendentes primeiro |
| Busca grimório | Buscar no Grimório… |

### Espelhos — chrome

| Elemento | Turma | Companheiro |
| --- | --- | --- |
| Heading | Espelho da Turma | Espelho do Companheiro |
| Sub | Visão parcial do colega | Reflexo completo do companheiro |
| Bloco álbum | oculto | Álbum de Relíquias (read-only) |
| Voltar | Voltar ao Salão | Voltar ao Salão |

---

## Tasks de implementação (pós Fase 0)

### Task 1 — Contratos e docs satélite

- [x] Apontar em `plano-sistema-amigos.md` que a âncora UX migra para o **Salão Espiritual** (preview no Painel + página).
- [x] Documentar diferença Espelho da Turma vs Espelho do Companheiro no plano de amigos / este doc.
- [x] Congelar empty states e microcopy numa lista curta (implementação).

### Task 2 — Separar o card lotado + mini-barra admin

- [x] Remover empilhamento monolítico: profile-panel = identidade + previews.
- [x] Mini-barra **Ferramentas do Mestre** no topo do dashboard (`role === 'admin'`).
- [x] Preview Salão (contadores + CTA) e preview Grimório (pins / recentes + CTA).
- [x] Garantir zero CTAs admin para `student`.

### Task 3 — Reforço admin-only

- [x] Auditar `#btn-list-souls`, nav `data-admin-only`, deep links, `souls.html` boot.
- [x] 403 em `listUsers`, `generateCode`, `listCodes`, `setLessonGate` (notes admin → Task 8, mesmo helper).
- [x] Smoke checklist student: zero Almas / Gerar / Liberar na UI.

#### Auditoria (Task 3)

| Superfície | Resultado |
| --- | --- |
| `#master-tools` + botões | `hidden` + `data-admin-only`; listeners só se `role === 'admin'` |
| Nav `data-admin-only` (páginas shell) | `app-shell` esconde + `aria-hidden` para student |
| Deep link `souls.html` | `requireAdmin()`; `#souls-app` só revela após gate; 403 em `listUsers` redireciona |
| `aulas.html` toggles Liberar | Só renderizam se admin; API `setLessonGate` 403 |
| API admin actions | `rejectUnlessAdmin` → `403` + “Esta senda é só do Mestre.” |
| `gamefeel.bindAdmin` | Legado, **não** importado no dashboard |
| HTML `souls.html` | Corrigido (lixo pré-DOCTYPE removido) |
| Notes admin | Ainda não existem (Task 6/8); usar `rejectUnlessAdmin` |

### Task 4 — Backend: lista da turma + espelhos

- [x] Action `classmatesList` + client `api.js` (progress é Supabase-only; sem fallback em `store.js`).
- [x] Ajustar `friendProfile` para modo **turma** (sem conquistas) vs modo **companheiro** completo.
- [x] Authz: mesma turma para espelho leve; bond aceito para completo; 403 com microcopy fora disso.

### Task 5 — UI Salão Espiritual

- [x] `pages/salao-espiritual.html` + `js/salao-espiritual.js` + CSS (`companheiros.css` / `salao.css`).
- [x] Subseções: form vínculo, convites (recebidos topo), turma (busca/ordenação/CTAs), companheiros.
- [x] QoL: contadores, badges, skeletons, empty states, erros amigáveis.
- [x] `turma-ui.js` + `friends-ui.js` com `onChange` cruzado; `confirmBreakBond` exportado.

### Task 6 — Backend + UI Grimório

- [x] Migrations `user_notes` + `user_note_shares` (+ tags JSON) e `setup.sql`.
- [x] Actions notes CRUD, share/unshare, get; limites 120/8000; soft warning ≥50; admin list APIs preparadas.
- [x] `pages/grimorio.html` + `pages/grimorio-nota.html`.
- [x] Preview no dashboard; pin; tags; `lesson_id` opcional.
- [x] Apagar com confirmação (“Rasgar inscrição”).
- [x] Share UI: “Revelar ao Companheiro” / “Velar novamente”.

### Task 7 — Shell / navegação

- [x] Rotas + itens **Salão Espiritual** e **Grimório Pessoal** no markup do shell (todas as páginas logadas).
- [x] Active state via `app-shell.js` (`salao`, `grimorio`, `companheiro`→salao, `grimorio-nota`→grimorio).
- [x] Almas continua `data-admin-only` (7º item condicional).

### Task 8 — Admin: Grimórios sob Vigília

- [x] UI admin (em `souls.html` ou seção da mini-barra/tools) listando alunos com `notesCount > 0`.
- [x] Abrir grimório do aluno em modo read-only (admin).
- [x] API `notesListAdmin` / `notesListForUser`.

### Task 9 — Polimento QoL e copy

- [x] Empty states narrativos (turma, convites, grimório vazio, share vazio).
- [x] Feedback limite 25 companheiros; soft warning volume de notas.
- [x] Loading/erro/sucesso consistentes; a11y básica em ações destrutivas.

### Task 10 — Validação

- [x] Aluno: Salão, convites da turma, espelhos diferenciados, grimório CRUD + share; **sem** tools admin.
- [x] Companheiro vê nota compartilhada; não vê privada.
- [x] Admin: mini-barra, Almas, Vigília de grimórios; não polui lista da turma como “aluno”.
- [x] Regressão: Espelho completo, códigos, liberar aulas, friendships.
- [x] Mobile drawer + desktop.

#### Auditoria estática (Task 10)

Validação por código (PASS). Smoke E2E com contas reais permanece recomendado após `vercel dev` / migrate de notas no Supabase.

| Item | Resultado |
| --- | --- |
| Salão + turma + mirrors + grimório; student sem admin | PASS |
| Share authz (`noteGet` / bond) | PASS |
| Mini-barra + Almas + Vigília; admin fora da turma | PASS |
| Códigos / liberar aulas / friendships | PASS (wired) |
| Shell drawer mobile + desktop | PASS |
| FOUC álbum Espelho da Turma | Corrigido (`hidden` até modo companheiro) |

---

## Arquivos provavelmente envolvidos

| Arquivo | Ação |
| --- | --- |
| `pages/dashboard.html` | Perfil + previews + mini-barra admin |
| `js/dashboard.js` | Boot previews; admin mini-barra |
| `pages/salao-espiritual.html` | Nova página Salão |
| `js/salao-espiritual.js` | Boot Salão |
| `js/friends-ui.js` | Reuso / extração |
| `js/turma-ui.js` (opcional) | Lista turma + QoL |
| `pages/grimorio.html` / `grimorio-nota.html` | Índice + detalhe |
| `js/grimorio.js` / `notes-ui.js` | UI notas |
| `css/dashboard.css`, `companheiros.css`, `salao.css`, `grimorio.css` | Layout |
| `css/hades-tokens.css` (novo, Task 11) | Tokens + chrome Hades compartilhados pelo shell |
| `js/api.js` | Client actions |
| `api/progress.js` | classmates + notes + authz espelho |
| `api/_lib/store.js` | Fallback |
| `db/migrate-…-user-notes.sql` | Schema notas + shares |
| `db/setup.sql` | Incluir tabelas |
| `js/app-shell.js` | Rotas/menu |
| `pages/companheiro.html` + `js/companheiro.js` | Modo Turma vs Completo |
| `pages/souls.html` / `js/souls.js` | Vigília + auditoria admin-only |
| `docs/plano-sistema-amigos.md` | Âncora UX atualizada |

---

## Critérios de aceite

- [x] Aluno vê colegas da mesma turma no **Salão Espiritual** (página + preview).
- [x] Aluno oferece / rompe vínculo **na linha da turma**.
- [x] Não-companheiro da turma abre **Espelho da Turma** (sem conquistas); companheiro abre **Espelho completo**.
- [x] Aluno **não** vê Almas / Gerar códigos / Liberar aulas.
- [x] Dashboard **não** é mais o card monolítico do print; admin está na mini-barra.
- [x] QoL listadas na Fase 0 entregues no Salão.
- [x] Grimório: título, descrição, datas, tags, aula opcional, pin; CRUD com confirmação ao apagar.
- [x] Share com companheiro funciona; admin lê via Vigília.
- [x] Shell tem Salão + Grimório; visual Hades-like.

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| Colisão “Almas” na copy | Usar **Colegas da Jornada** / **Turma**; nunca “Almas da Turma” |
| Shell com 6+ itens | Salão + Grimório no teto; Almas só admin; Encerrar fora da lista primária |
| Espelho leve vazar conquistas | Authz server-side em `friendProfile` / flag `includeAchievements` |
| Share de notas complexo | MVP: share só com `accepted` friendships; lista explícita por nota |
| Admin ler notas sensível pedagogicamente | Deixar claro na UI (“sob vigília”); só admin |
| Dashboard ainda longo | Previews curtos; detalhe nas páginas |
| Volume de notas sem hard cap | Soft warning + hard chars 120/8000 |
| Escopo expandiu (share + admin read + tags + pin) | Task 6 e 8 são o caminho crítico após Salão |

---

## Ordem recomendada

1. ~~Task 0 — respostas~~ **feita**
2. ~~Task 1 — docs satélite / microcopy~~ **feita**
3. ~~Task 2 — split dashboard + mini-barra~~ **feita**
4. ~~Task 3 — blindagem admin~~ **feita**
5. ~~Task 4~~ **feita** · ~~Task 5 — UI Salão~~ **feita**
6. ~~Task 6 — Grimório aluno~~ **feita**
7. ~~Task 7 — shell~~ **feita**
8. ~~Task 8 — Vigília admin~~ **feita**
9. ~~Task 9~~ **feita** · ~~Task 10~~ **feita**
10. ~~Task 11 — Alinhar novas páginas ao Design System Hades~~ **feita**
11. ~~Task 12 — Grimório: só ligar a aulas liberadas~~ **feita**
12. ~~Task 13 — Admin: todas as turmas no Salão~~ **feita**
13. ~~Task 14 — Mobile centrado + a11y~~ **feita**

---

## Status

- [x] Task 0 — perguntas / decisões (**fechada**)
- [x] Task 1 — contratos / docs satélite / microcopy (**fechada**)
- [x] Task 2 — split do card + mini-barra (**fechada**)
- [x] Task 3 — admin-only (**fechada**)
- [x] Task 4 — API turma + espelhos (**fechada**)
- [x] Task 5 — UI Salão Espiritual (**fechada**)
- [x] Task 6 — Grimório (**fechada**)
- [x] Task 7 — shell (**fechada**)
- [x] Task 8 — Vigília admin (**fechada**)
- [x] Task 9 — QoL/copy (**fechada**)
- [x] Task 10 — validação (**fechada**; smoke E2E recomendado)
- [x] Task 11 — Design System nas novas páginas (**fechada**)
- [x] Task 12 — Ligar inscrição só a aulas liberadas (**fechada**)
- [x] Task 13 — Admin vê todas as turmas no Salão (**fechada**)
- [x] Task 14 — Layout mobile centrado + a11y (**fechada**)

---

## Correção — Design System nas novas páginas (Task 11)

### Diagnóstico (prints + código)

As páginas **Salão Espiritual**, **Grimório Pessoal** e **Inscrição do Grimório** estão funcionalmente no shell, mas **não herdam o Design System Hades** usado no Painel / Aulas / Conquistas.

Evidência visual (mobile/desktop no shell):

| Sintoma | Salão | Grimório |
| --- | --- | --- |
| Área de conteúdo **branca / clara** em vez do fundo `#0d0a10` + radiais | sim | sim |
| Intro / títulos dourados com **contraste baixo** (pergaminho sobre fundo claro) | sim | sim |
| Inputs “cinza solto” / placeholder ilegível | sim | sim |
| Vignette / atmosfera do Domínio ausente na coluna de conteúdo | sim | sim |
| Painéis dourados “flutuando” sobre branco (parece outro produto) | sim | parcial |

**Causa raiz:** tokens e chrome de página vivem em CSS de feature (`dashboard.css`, `aulas.css`, `conquistas.css`), **não** em `app-shell.css`.

| Página | CSS carregados | Tem `:root` `--hades-*` + `body` escuro + `.vignette`? |
| --- | --- | --- |
| `dashboard.html` | `app-shell` + `dashboard.css` (+ companheiros) | sim (`dashboard.css`) |
| `aulas.html` | `app-shell` + `aulas.css` | sim (`aulas.css`) |
| `conquistas.html` | `app-shell` + `conquistas.css` | sim (`conquistas.css`) |
| `salao-espiritual.html` | `app-shell` + `companheiros.css` + `salao.css` | **não** |
| `grimorio.html` / `grimorio-nota.html` | `app-shell` + `grimorio.css` | **não** |
| `companheiro.html` | `app-shell` + `conquistas.css` + `companheiros.css` | sim (via `conquistas.css`) — OK por acidente |

`salao.css` / `grimorio.css` / `companheiros.css` usam `var(--hades-*)` e `var(--font-*)`, mas **sem tokens no `:root` da página** o browser cai em fallbacks incompletos ou no default claro do UA → fundo branco + texto claro = ilegível.

`app-shell.css` também consome `--hades-*` **sem** definir tokens nem estilizar `body` / `.vignette`.

### Fonte da verdade (não reinventar)

Reusar o contrato já congelado no plano e no Painel:

- Tokens: `--hades-bg`, `--hades-panel`, `--hades-gold*`, `--hades-blood*`, `--hades-text*`, `--font-title` (Cinzel), `--font-body` (Crimson Text), `--shadow-panel`
- Chrome: `color-scheme: dark`, fundo radial sangue/ouro sobre `--hades-bg`, `.vignette`, `.accent`, `btn-gold` / `btn-gold--ghost`
- Shell: sidebar + header + ornate-divider já corretos **quando** os tokens existem
- Linguagem: painéis com borda ouro + outline, sem cards genéricos brancos / inputs flat cinza

Referência de implementação boa: bloco `:root` + `body.app-shell-page` + `.vignette` em `css/aulas.css` (ou equivalente em `dashboard.css`).

### Decisão de arquitetura (recomendada)

**Extrair tokens + chrome base para um CSS compartilhado do shell**, em vez de copiar `:root` de novo em cada página.

| Opção | Prós | Contras | Escolha |
| --- | --- | --- | --- |
| A. Duplicar `:root`/body em `salao.css` e `grimorio.css` | Rápido | Drift entre 4+ cópias | só se urgência extrema |
| B. **`css/hades-tokens.css`** (ou bloco no topo de `app-shell.css`) com tokens + body shell + vignette + utilitários `.accent` / `.btn-gold` | Uma fonte; todas as páginas shell alinhadas | Touca arquivos existentes (aulas/dashboard passam a importar) | **preferida** |
| C. Fazer Salão/Grimório linkarem `dashboard.css` inteiro | Funciona | Puxa 2k linhas de CSS do painel sem necessidade | evitar |

Recomendação: **Opção B** — `hades-tokens.css` incluído **antes** de `app-shell.css` em todas as páginas logadas; depois remover duplicatas de `:root`/body de `aulas.css` / `conquistas.css` / `dashboard.css` (pode ser subtarefa, sem bloquear o fix visual).

### Escopo da correção

**Páginas (obrigatório)**

1. `pages/salao-espiritual.html`
2. `pages/grimorio.html`
3. `pages/grimorio-nota.html`
4. (Opcional na mesma task) unificar includes de `companheiro.html`, `aulas.html`, `conquistas.html`, `dashboard.html` para o mesmo `hades-tokens.css`

**CSS**

1. Criar `css/hades-tokens.css` (tokens + `html`/`body.app-shell-page` + `.vignette` + `.accent` + botões ouro canônicos se ainda não estiverem no shell).
2. Garantir `salao.css` / `grimorio.css` / `companheiros.css` **só** estilizem layout de feature (sem redeclarar tema incompleto).
3. Revisar contraste:
   - intro do Salão → `var(--hades-text)` / `--hades-text-dim` sobre fundo escuro
   - placeholders de input → `--hades-text-muted` sobre `rgba(0,0,0,.35)` + borda ouro
   - empty states → mesma família tipográfica do Painel (não cinza genérico sobre branco)
4. Alinhar inputs/search/select do Grimório ao padrão de campos do Domínio (borda ouro, fundo painel, não bloco cinza flat).
5. Confirmar que `btn-gold` do Grimório não diverge do Painel (gradiente ouro + ghost).

**Fora de escopo**

- Mudar microcopy / flows (já fechados nas Tasks 0–10)
- Redesign de layout estrutural (two-column Salão ok; só o tema)
- Trocar tipografia ou palette

### Tasks de implementação

### Task 11 — Design System Hades nas páginas novas

- [x] Extrair/centralizar tokens + chrome (`hades-tokens.css` **ou** bloco em `app-shell.css`).
- [x] Incluir o CSS base em Salão + Grimório + Grimório-nota (e preferencialmente nas demais shell pages).
- [x] Remover dependência acidental / drift: `salao.css` e `grimorio.css` sem fundo branco efetivo.
- [x] Smoke visual: Salão, Grimório índice, Grimório nota — desktop + drawer mobile — lado a lado com Painel/Aulas.
- [x] Checklist contraste: intro, empty states, placeholders, títulos de seção, botões.

#### Entrega (Task 11)

| Peça | Resultado |
| --- | --- |
| `css/hades-tokens.css` | Tokens `--hades-*`, body shell, vignette, `.accent`, ornate, `btn-gold`, api-warning |
| Páginas shell | Link `hades-tokens.css` antes de `app-shell.css` (Salão, Grimório×2, Painel, Aulas, Conquistas, Companheiro, aulas 1–3) |
| Dedup | `:root`/chrome removidos de `aulas.css` e `conquistas.css`; tokens do `dashboard.css` centralizados |
| Polimento | Intro Salão + empty/inputs Grimório alinhados ao Domínio |

### Critérios de aceite (Task 11)

- [x] Fundo da coluna de conteúdo é o Hades escuro (não branco).
- [x] Texto de intro/empty states legível (contraste adequado sobre o fundo).
- [x] Inputs e `btn-gold` visualmente equivalentes ao Painel / Aulas.
- [x] Vignette e radiais presentes como nas outras páginas shell.
- [x] Espelho do Companheiro continua OK (não regressão).
- [x] Nenhuma mudança de comportamento JS/API.

### Ordem sugerida de execução

1. Criar `hades-tokens.css` a partir de `aulas.css`/`dashboard.css`.
2. Linkar nas 3 páginas quebradas; validar prints.
3. Propagar o include às outras shell pages e deduplicar `:root` (cleanup).
4. Polir `salao.css` / `grimorio.css` se ainda houver componentes “órfãos” (empty dashed box, search flat).
5. Smoke mobile drawer + desktop.

---

## Backlog pós-MVP (Tasks 12–14)

Correções pedidas após o fechamento da Task 11. Ordem sugerida: **12 → 13 → 14** (12 é localizado; 13 toca API/UI do Salão; 14 é transversal e beneficia as duas).

---

### Task 12 — Grimório: não linkar aulas não liberadas

#### Problema

Em **Nova inscrição** / editar (`grimorio-nota.html`), o select **Ligar à Trilha** (`#note-lesson`) é preenchido com **todas** as entradas de `LESSONS` (`fillLessonSelect` em `js/grimorio-nota.js`), sem consultar `lessonGates` / `isLessonPublished`. O aluno (e qualquer dono da nota) pode amarrar uma inscrição a uma aula ainda **não liberada** pelo Mestre.

#### Decisões (congelar na implementação)

| # | Decisão |
| --- | --- |
| 1 | Opções do select = só aulas com gate `published` liberado (**mesma regra da Trilha**: `isLessonPublished` / default `aula1`). |
| 2 | Sempre manter opção **— Nenhuma —** (`lessonId` vazio). |
| 3 | **Aluno:** não vê aulas não liberadas no select. |
| 4 | **Admin** escrevendo nota própria: mesma regra de liberação (não listar o que a turma ainda não tem) — evita spoiler acidental no próprio grimório; prévia de aula continua só na Trilha. |
| 5 | **Nota já existente** com `lesson_id` de aula depois **re-trancada**: manter valor selecionado (read-only no option ou option desabilitada “não liberada”) para não apagar o vínculo ao guardar; UI mostra aviso curto. |
| 6 | **API** `noteCreate` / `noteUpdate`: rejeitar `lessonId` não liberado (exceto se já era o valor atual da nota no update) — defesa server-side; microcopy: *“Esta aula ainda não foi liberada na Trilha.”* |
| 7 | Viewer read-only (share / vigília): só exibe o rótulo da aula se houver; sem select editável. |

#### Implementação

| Camada | Trabalho |
| --- | --- |
| Client | `grimorio-nota.js`: carregar publish map (`lessonGates` / helper já usado em `aulas.js` / `lessons-ui.js`); filtrar `fillLessonSelect`. |
| API | Em `noteCreate`/`noteUpdate`, validar `lesson_id` contra gates liberados (reusar leitura de gates). |
| Copy | Empty do select inalterado; erro amigável se API rejeitar. |

#### Checklist

- [x] Select só lista aulas liberadas (+ “Nenhuma”).
- [x] Create/update com aula trancada → 400 + microcopy.
- [x] Nota antiga com aula re-trancada: não perde vínculo ao editar outros campos.
- [x] Share/admin read-only sem regressão.

#### Aceite

- [x] Aluno não consegue escolher aula não liberada na UI nem via request manipulado.
- [x] Aulas liberadas continuam linkáveis normalmente.

---

### Task 13 — Admin: ver todas as turmas no Salão Espiritual

#### Problema

`classmatesList` hoje exige `user.turma` do solicitante e filtra `.eq('turma', turma)`. Admin tipicamente **não** tem turma de aluno (ou tem valor atípico) → Salão do Mestre fica vazio / “0 alunos”, embora o plano já previsse: *“se admin abrir Salão, pode ver turma escolhida ou empty”* (ainda não entregue).

#### Decisões

| # | Decisão |
| --- | --- |
| 1 | **Aluno:** inalterado — só a própria turma; admin nunca aparece na lista. |
| 2 | **Admin:** pode listar colegas de **qualquer** turma (TCG01, TCG02, …). |
| 3 | UI admin no Salão: controle **Turma** (select) acima da lista — opções = turmas distintas existentes com ≥1 aluno, mais rótulo “Todas as turmas”. |
| 4 | Default admin: **Todas as turmas** (visão ampla) ou última turma escolhida em `sessionStorage` (`salaoAdminTurma`). |
| 5 | Em “Todas”, cada linha mostra badge/meta da turma do colega; contador = total filtrado. |
| 6 | API: `classmatesList` aceita `turma` opcional se `role === 'admin'`; sem `turma` → todas; aluno que enviar `turma` diferente da própria → ignorar ou 403 (preferir **ignorar e forçar própria**). |
| 7 | Espelho da Turma / convites: regras atuais de bond e authz **não** mudam; admin continua fora da lista como “aluno”. |
| 8 | Preview do dashboard (admin): pode mostrar “Todas · N alunos” ou turma selecionada — mínimo: não mentir “0 alunos” se houver alunos no Domínio. |

#### Implementação

| Camada | Trabalho |
| --- | --- |
| API | `classmatesList`: branch admin; query sem `.eq('turma')` ou com filtro; devolver `turmasDisponiveis: string[]` para popular o select. |
| Client | `api.js`: `listClassmates(token, { turma? })`. |
| UI | `salao-espiritual.html` + `turma-ui.js`: select `#turma-admin-filter` `data-admin-only` / só se `role === 'admin'`; `onChange` → refresh. |
| CSS | Filtro alinhado à toolbar existente (busca/ordenar). |

#### Checklist

- [x] Admin vê alunos de todas as turmas (e filtro por uma).
- [x] Aluno continua só na própria; sem controle de filtro admin.
- [x] Contadores / empty states coerentes (“A turma ainda não despertou…” vs “Nenhum aluno nesta turma.”).
- [x] Regressão: convites, espelhos, bonds.

#### Aceite

- [x] Mestre no Salão consegue inspecionar a vida social de **cada** turma sem ir às Almas.
- [x] Student UX do Salão inalterada.

---

### Task 14 — Layout mobile centrado + acessibilidade

#### Problema

Nas páginas novas (Salão / Grimório / nota), no viewport estreito o conteúdo pode parecer **desalinhado / colado à esquerda**, com hierarquia frágil no drawer. A Task 10 validou shell drawer, mas não fechou **centralização** nem passe de **a11y** dedicado às superfícies sociais/grimório.

#### Decisões / princípios

| # | Decisão |
| --- | --- |
| 1 | Em `max-width: 980px` (e especialmente ≤640px), a coluna de conteúdo (`app-shell__content` + `.salao-page` / `.grimorio-page`) fica **centradas** no eixo horizontal (`margin-inline: auto`, `width: min(100%, …)`, padding simétrico com `safe-area-inset`). |
| 2 | Painéis full-bleed na largura útil do content (sem “card flutuando torto”); stacks verticais com gap consistente. |
| 3 | Touch targets ≥ ~44px nas ações destrutivas / CTAs principais (Romper, Rasgar, Convidar, tabs). |
| 4 | Contraste: texto dim/gold sobre fundo Hades (pós-Task 11); placeholders e empty states auditados. |
| 5 | Foco visível (`:focus-visible`) em inputs, botões, links de lista, options do select. |
| 6 | Manter `aria-*` já existentes (dialogs, live regions); completar onde faltar (`aria-label` no filtro de turma admin, status do select de aula). |
| 7 | Não quebrar desktop (≥981px): grid Salão / toolbars Grimório permanecem. |
| 8 | Escopo: Salão, Grimório, Grimório-nota, Espelho (companheiro); shell compartilhado se o padding for a causa raiz. |

#### Implementação

| Camada | Trabalho |
| --- | --- |
| `app-shell.css` | Revisar padding-inline mobile; garantir content centrado. |
| `salao.css` / `grimorio.css` / `companheiros.css` | `max-width` + `margin-inline: auto`; toolbars em coluna centrada; listas sem overflow horizontal. |
| HTML | Landmarks/`aria` pontuais; labels explícitos. |
| QA | Chrome/Safari mobile ou DevTools 390×844: Salão, Grimório, nota, drawer. |

#### Checklist a11y (mínimo)

- [x] Ordem de foco lógica no Salão (filtro → convite → listas) e no formulário da nota.
- [x] Dialogs Romper / Rasgar / Velar: Escape, foco inicial, retorno de foco (já em parte — revalidar no mobile).
- [x] Contraste AA aproximado em intro, empty, badges.
- [x] `prefers-reduced-motion`: respeitar se houver pulse/animações locais (btn pulse admin fora do Salão).

#### Aceite

- [x] No celular, Salão e Grimório leem como composição **centrada**, legível, sem corte horizontal.
- [x] Ações principais usáveis com polegar; leitores de tela anunciam estados vazios e erros.

#### Entrega (Task 14)

| Peça | Resultado |
| --- | --- |
| `app-shell.css` | Content centrado ≤980px; safe-area; títulos balanceados; focus-visible nav |
| `salao.css` / `grimorio.css` | `margin-inline: auto`; toolbars empilhadas; empty/inputs contraste |
| `companheiros.css` | Touch targets ≥2.75rem; ações em wrap no mobile |
| `hades-tokens.css` | `prefers-reduced-motion` em `btn-gold` / pulse |

---

### Ordem e arquivos (12–14)

| Task | Arquivos principais |
| --- | --- |
| 12 | `js/grimorio-nota.js`, `js/lessons-ui.js` (reuse), `api/progress.js` (`noteCreate`/`noteUpdate`), microcopy no plano |
| 13 | `api/progress.js` (`classmatesList`), `js/api.js`, `js/turma-ui.js`, `pages/salao-espiritual.html`, `css/salao.css`, opcional `dashboard.js` preview |
| 14 | `css/app-shell.css`, `css/salao.css`, `css/grimorio.css`, `css/companheiros.css`, HTML a11y pontual |

**Não fazer nesta leva:** mudar regras de bond, Vigília, ou redesign visual Hades (já Task 11).
