# Plano de Implementação — Aula 05

> **Título curricular:** Aula 05: Classificação Indicativa (ClassInd), IARC e Design Saudável  
> **Tópico da ementa:** Sistemas de classificação indicativa e adequação de público  
> **Módulo:** Módulo 1 — Fundações, Cultura e Interface (Aulas 1 a 5 · ~10h)  
> **Predecessora:** Aula 04 (plataformas + viewport retrô) · [`plano-aula4-plataformas-restricoes.md`](./plano-aula4-plataformas-restricoes.md)  
> **Estado no repo:** **Task 0–11 ✅** — Aula 05 completa no repo; pendente: deploy migration + QA manual do playbook §6.  
> **Duração prevista:** ~120 min (Fundamento teórico ~20 min · Prática gamificada ~100 min)  
> **Diferença-chave:** **sem Godot**. A oficina é **ClassInd-dle** (votação live Higher/Lower) + **Adequação Reversa / simulação IARC** no próprio site.

Este documento é o **mapa de implementação** da Aula 05: conteúdo pedagógico, página da aula, módulo live ClassInd-dle, formulário IARC de mesa, backend, schema, conquistas e critérios de aceite.

> **Nota de ponte:** em [`plano-aula4-plataformas-restricoes.md`](./plano-aula4-plataformas-restricoes.md), a seção *Ponte — Aula 05* **já aponta** para este plano (ClassInd/IARC). Câmera/`AnimatedSprite` ficam para **Módulo 2+** (Task 11).

---

## Objetivo pedagógico

Fazer o aluno **operacionalizar** o sistema brasileiro ClassInd (violência, sexo, drogas + atenuantes/agravantes), entender o papel do **IARC** nas lojas digitais, e sentir na prática como **pequenos detalhes de feedback visual/narrativo/mecânico** mudam drasticamente a faixa etária — inclusive “higienizando” um pitch 16+/18+ até Livre/10+ sem perder a mecânica-core.

### O que o aluno aprende

- Explicar o funcionamento do ClassInd e os três eixos clássicos de análise (violência, sexo, drogas), com atenuantes/agravantes.
- Relacionar ClassInd ↔ IARC: selos de idade gratuitos/globais via formulário, e como isso se integra no Brasil.
- Discriminar, com exemplos, por que “violência fantasiosa / não-humano / sem sangue” costuma ser mais branda que “violência contra humanos + cadáveres / gore”.
- Aplicar **design saudável**: reescrever feedbacks para baixar a faixa etária sem esvaziar o loop principal.

### O que o aluno faz

- Lê/assiste o fundamento teórico (~20 min) na aba Fundamentos.
- Entra no **ClassInd-dle** via CTA na aula: vota Higher/Lower em tempo real; vê placar de votos ao vivo; só após revelação do Mestre vê a resposta correta + descritores (“porque”).
- Em grupos (Parte 2): preenche o **Formulário IARC de Mesa** / reescreve um pitch 16+/18+ até Livre ou 10+; gera o artefato **Patch Note de Higienização**.
- Registra síntese em `lesson_paragraphs` (como nas aulas 1–4). Resgata código no Altar.

### Artefato gerado

- **Participação ClassInd-dle** (votos + acertos persistidos por sessão/sala).
- **Documento de Adequação Etária (“Patch Note de Higienização”)**: design original → design higienizado → argumentos ClassInd/IARC provando Livre ou ≤10.
- Entrega escrita na plataforma + visão no Grimório (`activity:aula5`).

---

## Diagnóstico do estado atual (repo)


| Área | Situação hoje | Alvo Aula 05 |
| --- | --- | --- |
| Página / JS | Sem `aula5` | `pages/aula5.html` + `js/aula5.js` (Fundamentos · Oficina · Slides) |
| Catálogo Trilha | Para em `aula4` | `aula5` em `MODULES` / `LESSONS` |
| Backend aulas | Sem `aula5` | `LESSON_CATALOG` + gate `false` + prereq `aula4` + redeem |
| Quiz / votação live | **Não existe** | Módulo ClassInd-dle (sala + rodadas + votos) |
| Push tempo real | **Não existe** (sem Realtime no app) | **v1 = Supabase Realtime** (`postgres_changes` no snapshot público) + fallback poll |
| API dedicada | Padrão Despertar (`api/despertar.js`) | `api/classind.js` (não inchar `progress.js`) |
| Cliente Supabase no browser | Só service-role no server | Anon key pública + RLS só-leitura no snapshot live |
| Papel professor | Só `admin` (Mestre) | Controles de sala = **admin**; alunos = `student` |
| Formulário IARC | Ausente | Wizard / formulário na Oficina (Parte 2) + persistência do patch note |
| Conquistas | Famílias `aula1`–`aula4` | 1 pública + 3 secretas `aula5` |
| Material / slides | — | README + tabela ClassInd simplificada + slides |

---

## Arquitetura proposta (duas superfícies, um módulo)

Aula 05 **não** é só uma página estática: precisa de sincronização multi-jogador em sala. Separar pedagogia e runtime live (mesmo padrão Despertar vs. aulas):

```
pages/aula5.html              → teoria + CTA "Entrar no ClassInd-dle" + Parte 2 (IARC / patch note)
pages/classind-dle.html       → tela full de votação (aluno) + painel Mestre (admin)
api/classind.js               → createRoom, join, vote, reveal, nextRound, getState (autoritativo)
db/migrate-…-classind.sql     → rooms, rounds, votes, members, live_snapshots (+ RLS + publication Realtime)
js/classind-dle/**            → Realtime subscribe + UI A/B + placar + reveal
js/classind-dle/supabase-browser.js → createClient(anon) só para canal Realtime
```

**Contrato de sync (v1):**

| Caminho | Responsabilidade |
| --- | --- |
| `POST /api/classind` | Única fonte de mutação (voto, reveal, next). Service-role. Valida sessão opaca. |
| Tabela `classind_live_snapshots` | Espelho **público-seguro** do estado da sala (tallies, phase, cards, stateVersion; secrets só pós-reveal). |
| Supabase Realtime `postgres_changes` | Push instantâneo para todos os clientes filtrados por `room_id`. |
| `getState` (HTTP) | Join inicial, reconexão, roster admin, e **fallback** se o canal cair. |
| `myVote` / acerto | Cliente guarda o voto na resposta de `castVote`; no reveal compara localmente com `correctSide` do snapshot. |

**Fluxo em aula:**

1. Mestre abre `classind-dle` → **Cria sala** (código curto, ex. `STYX`) → sala fica em `lobby`.
2. Alunos na `aula5` clicam CTA → `classind-dle` → **Entram com o código** (ou `?room=STYX`) → `joinRoom` + subscribe Realtime.
3. Mestre **abre rodada N** (par A vs B). Snapshot atualiza → todos recebem push.
4. Alunos votam **uma vez** via API → tallies no snapshot sobem → placar anima **ao vivo** para todos — **sem** dizer qual é maior.
5. Mestre clica **Revelar** (sempre disponível; UI mostra X/Y). Snapshot passa a incluir ratings + rationale.
6. UI mostra acerto/erro + **porque**.
7. Mestre **Próxima comparação** → nova rodada / snapshot limpo de votos.

Parte 2 permanece em `aula5` (Oficina), sem sala live.

---

## Desafios técnicos (congelados com a Task 0)

### 1. Tempo real na v1 — Supabase Realtime (não polling como caminho principal)

O repo é **HTML estático + Vercel serverless + Supabase**. Mutações continuam serverless; o **push** vem do Realtime do próprio Supabase (já dependência `@supabase/supabase-js`).

| Opção | Prós | Contras | Decisão v1 |
| --- | --- | --- | --- |
| A) Só polling | Simples | Latência ~1 s; sensação “não-live” | Só **fallback** |
| **B) Supabase Realtime + snapshot público** | Push verdadeiro; cabe no serverless; sem host Socket.io | Exige anon key + RLS + publication; auth do app ≠ Supabase Auth | **Congelado** |
| C) Socket.io / Node long-lived | Kahoot clássico | Quebra deploy Vercel; infra extra | Fora |

**Padrão congelado (B):**

1. API muta tabelas autoritativas (`rooms` / `rounds` / `votes`) com service-role.
2. Na mesma request, **upsert** em `classind_live_snapshots` com payload sanitizado + `state_version++`.
3. Browser: após `joinRoom`, abre `supabase.channel` / `postgres_changes` em `classind_live_snapshots` com filter `room_id=eq.<uuid>`.
4. Anon key é pública por design; **RLS** garante: `SELECT` liberado só nessa tabela de snapshot; `INSERT/UPDATE/DELETE` negados ao anon (só service-role).
5. Secrets (`payload_secret`) **nunca** entram no snapshot antes de `phase=revealed`.
6. Se Realtime desconectar: fallback poll `getState` a cada **3–5 s** + toast “reconectando”; ao voltar o canal, cancela o poll agressivo.
7. Env nova no front: `SUPABASE_URL` + `SUPABASE_ANON_KEY` (via `action: getRealtimeConfig` autenticado no join **ou** injeção build-time/`meta` — preferir **devolver no join** para não espalhar key em HTML estático sem gate). Decisão fina na Task 3: **`joinRoom` / `createRoom` devolve `{ realtime: { url, anonKey, roomId } }`**.

**Local:** Realtime do projeto Supabase cloud funciona apontando o `local-server` + mesmas envs; não precisa emular WebSocket no Node.

### 2. Autoridade do servidor

- Voto só conta se rodada está `voting` e usuário ainda não votou.
- **Reveal** e **nextRound** só `admin`.
- Classificação correta e descritores **nunca** no snapshot nem em `getState` do aluno antes do reveal.
- Após reveal, snapshot (e `getState`) incluem `correctSide`, `ratings`, `descriptors`, `rationale`. Cliente calcula `youWereCorrect` com o `myVote` local.

### 3. “Só revelar depois que todos votaram”

- Snapshot público: `votersCount` / `membersCount` (X/Y).
- Admin `getState` / `listRoomRoster`: nomes de quem falta.
- Botão **Revelar** sempre habilitado para o Mestre.
- Toggle opcional `requireAllVotes` (default **off**).

### 4. Escala e race conditions

- 20–40 alunos: N subscriptions Realtime (leve) + 1 write por voto (API) — sem tempestade de poll.
- Voto: `INSERT … ON CONFLICT DO NOTHING` (unique `(round_id, user_id)`).
- Reveal: `UPDATE … WHERE phase='voting'`; depois rewrite do snapshot.

### 5. Dupla aba / multi-device

- Um voto por `user_id` por rodada.
- Segunda aba: Realtime igual; segundo `castVote` → 409/ignored; `myVote` reidratável via `getState.myVote`.

### 6. Conteúdo das rodadas

- Ratings = **valores de referência pedagógica** documentados no deck (podem divergir de selos de loja ao longo do tempo).
- Imagens: placeholders tipográficos / assets do curso; sem hotlink frágil.
- Cenários hipotéticos: só texto.

### 7. Contrato aulas 1–4

Manter shell, abas, `lesson_paragraphs`, discovery, gate `false`, redeem, Grimório `activity:aula5`. Sem Godot. Sem `/submundo/*`.

### 8. Parte 2 — persistência

- **Congelado (A):** wizard gera Patch Note → cola em `gdd-text` / notes + download `.md` local. Sem tabela `classind_patches` na v1.

---

## Padrão reutilizado (não reinventar)

1. **Shell + abas na `aula5`:** `I. Fundamentos` · `II. Oficina` · `III. Slides`.
2. **Tom Hades:** tokens, `hades-frame`, `triplet-grid`, discovery.
3. **Envio server-authoritative** de anotações + síntese → secretas; XP via Altar.
4. **API dedicada** no estilo Despertar (`api/classind.js`), não monólito `progress.js` para votos.
5. **Admin = Mestre** (`data-admin-only` / `requireSession` + role check).
6. **Gate** `published: false` até playbook de liberação.
7. **Smokes** Node espelhando `tests/aula4-*-smoke.mjs` + smokes específicos do dle.

---

## Task 0 — Decisões congeladas — ✅ FECHADA (2026-09-21)

Decisões abaixo estão **congeladas**. Implementação das Tasks 1+ pode seguir.  
Fonte: recomendações do plano + requisito explícito de **real-time desde a v1**.

### Produto / pedagogia

| # | Tema | Decisão congelada |
| --- | --- | --- |
| 1 | Escopo Godot | **(D) Nenhum** — só site (ClassInd-dle + IARC) |
| 2 | Superfícies | **(A)** `aula5.html` + `classind-dle.html` dedicada |
| 3 | Controle da sala | **(A)** Só `admin` (Mestre): create / startRound / reveal / next / close |
| 4 | Escopo de sala | **(B)** Código 4–6 chars + `turma` opcional no create |
| 5 | Tempo real | **(B) Supabase Realtime na v1** — ver § Desafios técnicos; polling só fallback |
| 6 | Reveal gating | **(C)** Sempre liberado + quorum visual X/Y; `requireAllVotes` default **off** |
| 7 | Deck | **(B)** `js/classind-dle/config/rounds.js` versionado no repo (`deckId: aula5-v1`) |
| 8 | Rodadas mínimas | ≥ **6** (3 do briefing + ≥3 extras) — ratings na tabela abaixo |
| 9 | Parte 2 IARC | **(A)** Wizard na Oficina da `aula5` |
| 10 | Pitches Parte 2 | **(B)** 4 pitches em `js/aula5/config/pitches.js` |
| 11 | Entrega | **(A)** Espelho aulas 1–4: `config-notes` + `gdd-text` (patch note) + finalize |
| 12 | Conquistas | 1 pública `aula5_concluida` + 3 secretas `hidden` / `family: aula5` / `volatile` |
| 13 | Slides + material | Obrigatório — `assets/docs/aulas/aula05-classind/` + slides |
| 14 | Libertação | Gate `published: false` no merge; playbook na Task 9 |
| 15 | XP | **30** (alinhar módulo 1) |

### Deck v1 — ratings de referência pedagógica

> Valores para a aula (ClassInd BR de referência). Podem divergir de lojas ao longo do tempo; o copy da UI diz **“referência para a aula”**.

| # | Lado A | Faixa A | Lado B | Faixa B | Maior | Descritores-chave (porque) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Fácil | Mortal Kombat 11 | **18** | Street Fighter 6 | **12** | A | MK: violência extrema / gore; SF: violência (luta sem desmembramento pedagógico) |
| 2 Pegadinha | The Sims 4 | **12** | Hollow Knight | **10** | A | Sims: temas sexuais / nudez; HK: violência fantasiosa / medo |
| 3 Cenário | Jogo A: tiros em alienígenas → gosma verde (sem sangue humano) | **10** (ou L se tom cartunesco) | Jogo B: espada em humanos, sem sangue, **corpos no chão** | **12** | B | Agravante: violência contra humanos + cadáveres presentes vs não-humanos sem sangue |
| 4 Extra | Celeste | **10** | Hotline Miami | **18** | B | Plataforma/medo leve vs violência gráfica intensa |
| 5 Extra | Animal Crossing: New Horizons | **L** | Grand Theft Auto V | **18** | B | Conteúdo livre vs violência / drogas / temas adultos |
| 6 Extra | Undertale | **12** | Doom Eternal | **16** (ou 18 se enfatizar gore) | B | Violência fantasiosa / humor negro vs violência intensa / gore |

Rodadas 4–6 podem ter copy ajustado na Task 4, mas **faixas e “quem é maior”** ficam como na tabela salvo erro factual grave.

### Pitches Parte 2 (congelados — títulos)

1. **Necrópole Viral** — zumbis com desmembramento + “seringas/drogas” que curam.  
2. **Sombra do Contrato** — stealth com execução sangrenta em close-up.  
3. **App de Destinos** — dating sim com nudez / opções sexuais explícitas.  
4. **Porão das Horas** — terror com uso realista de substâncias para “aguentar o medo”.

Missão: higienizar até **Livre** ou no máximo **10**, preservando o loop-core.

### Conquistas secretas (diretrizes, sem spoiler na UI da Oficina)

| Diretriz | Gatilho (server) |
| --- | --- |
| Pública | Redeem `aula5` → `aula5_concluida` |
| Secreta 1 | Keywords no parágrafo: `classind` / `iarc` / `classificação indicativa` (normalizado) |
| Secreta 2 | Patch note / texto indica faixa-alvo **Livre** ou `L` após higienização |
| Secreta 3 | Menciona **atenuante** ou **agravante** (ou par fantasia vs realismo) no texto de entrega |

Nomes display / arte: Task 7 (tom Hades, alinhar aula1–4).

### Técnico (congelado)

| # | Tema | Decisão |
| --- | --- | --- |
| 16 | Persistência live | Tabelas `classind_rooms`, `classind_rounds`, `classind_votes`, `classind_members`, `classind_live_snapshots` |
| 17 | TTL sala | Auto-expire **6 h** sem update **ou** `closeRoom` manual |
| 18 | Placar aluno | Só contagens A/B + “você já votou”; nomes só no painel admin |
| 19 | A11y | Teclado A/B, `aria-live` no placar/reveal, `prefers-reduced-motion` |
| 20 | Mobile | Aluno no celular; Mestre no telão (cards empilham &lt;980px) |
| 21 | Realtime | **Obrigatório na v1:** publication + RLS SELECT no snapshot; anon via resposta de join/create |
| 22 | Fallback | Poll `getState` 3–5 s **somente** com canal down / hidden→visible resync |
| 23 | Anti-spoiler | Secrets só em `classind_rounds.payload_secret`; snapshot pré-reveal sem ratings |
| 24 | Presença | `classind_members` no `joinRoom` (para X/Y e roster); heartbeat opcional via `ping` a cada 60 s |

### Checklist de fechamento da Task 0

- [x] Itens 1–15 decididos (recomendações + real-time v1)  
- [x] Deck mínimo (6 rodadas) com faixas e “maior” definidos  
- [x] 4 pitches Parte 2 nomeados  
- [x] Realtime = Supabase Realtime (não polling-only; não Socket.io)  
- [x] Entrega / conquistas / XP / gate alinhados ao contrato do Módulo 1  

---

## Task 1 — Conteúdo pedagógico da `aula5` (Fundamentos) — ✅

**Objetivo:** página de aula no contrato visual das anteriores, sem ainda o live completo (CTA navega a stub até Task 4).

### Conteúdo Fundamentos (~20 min, scrollável)

1. O que é ClassInd e para que serve (consumidor, lojas, responsabilidade do dev).  
2. Faixas: L, 10, 12, 14, 16, 18 — leitura operacional (não decorar lei).  
3. Três eixos: **violência / sexo / drogas** + atenuantes (fantasia, não-humano, comicidade) vs agravantes (gore, realismo, cadáveres, glamourização).  
4. IARC: formulário único → selos multi-região; relação com ClassInd no Brasil / lojas digitais.  
5. Ponte para a prática: “o selo não é só marketing — é consequência de feedbacks de design.”

### Checklist

- [x] Criar `pages/aula5.html` (shell + 3 abas + discovery overlay).  
- [x] Criar `js/aula5.js` (tabs, notes, finalize, discovery — contrato aula4).  
- [x] Copy Fundamentos completo (triplet-grid / hades-frame).  
- [x] CTA Oficina: **Abrir ClassInd-dle** → `pages/classind-dle.html` (`ROUTES.classindDle`).  
- [x] Bloco Parte 2 na Oficina (wizard completo fica na Task 5).  
- [x] Aba Slides com links placeholders (arquivos na Task 8).  
- [x] Pasta de capas: `assets/classind-dle/covers/` (+ README de naming).  
- [x] Stub `classind-dle.html` navegável (runtime nas Tasks 2–4).  
- [x] Wiring mínimo: `MODULES`/`LESSON_CATALOG`/`LESSON_GATES.aula5` (published false) para Trilha + `saveLessonParagraph`.  
- [x] Estender `css/aula.css` só se necessário — **não** (reusou classes).

### Aceite

- [x] Aluno/admin abre `pages/aula5.html` e lê Fundamentos sem stub “Em breve”.  
- [x] CTA dle presente e navegável (stub da sala).

---

## Task 2 — Schema e migração ClassInd-dle — ✅

**Arquivos:** [`db/migrate-2026-09-21-classind-dle.sql`](../db/migrate-2026-09-21-classind-dle.sql) · espelho em [`db/setup.sql`](../db/setup.sql) · deploy [`docs/nota-deploy-classind-dle.md`](./nota-deploy-classind-dle.md) · smoke `tests/classind-schema-smoke.mjs`.

### Tabelas

**`classind_rooms`** — `id` uuid · `code` unique 4–6 · `host_user_id` · `turma` · `phase` · `current_round_index` · `deck_id` · `state_version` · `settings` · timestamps  

**`classind_rounds`** — `payload_public` / `payload_secret` · `phase` voting|revealed · unique `(room_id, round_index)`  

**`classind_votes`** — UNIQUE `(round_id, user_id)` · `choice` A|B  

**`classind_members`** — PK `(room_id, user_id)` · `joined_at` / `last_seen_at`  

**`classind_live_snapshots`** — PK `room_id` · `state_version` · `payload` · `REPLICA IDENTITY FULL`

### Realtime + RLS (obrigatório v1)

- [x] Publication `supabase_realtime` + `classind_live_snapshots` (bloco idempotente na migration).  
- [x] RLS ON + policy `SELECT` para `anon`/`authenticated` no snapshot.  
- [x] Sem policies de write para anon — writes só service-role.  
- [x] RLS nas demais tabelas ClassInd sem policies (default deny ao browser).  
- [ ] Confirmar no dashboard após rodar o SQL no projeto Supabase (ação humana — ver nota de deploy).

### Checklist

- [x] Migration SQL revisada.  
- [x] Índices: `rooms.code`, `votes(round_id)`, `rounds(room_id, round_index)`, `members(room_id)`.  
- [x] Nota de deploy: [`docs/nota-deploy-classind-dle.md`](./nota-deploy-classind-dle.md).  
- [x] Smoke estático: `node tests/classind-schema-smoke.mjs`.

### Aceite

- [x] Schema no repo + setup espelhado.  
- [ ] Staging: rodar migration no Supabase (humano) — depois anon SELECT snapshot / sem acesso a `payload_secret`.

---

## Task 3 — API `api/classind.js` — ✅

**Arquivos:** [`api/classind.js`](../api/classind.js) · deck [`js/classind-dle/config/rounds.js`](../js/classind-dle/config/rounds.js) · helpers em [`js/api.js`](../js/api.js) · wiring [`local-server.mjs`](../local-server.mjs) · smoke `tests/classind-api-smoke.mjs` · env em [`docs/nota-deploy-classind-dle.md`](./nota-deploy-classind-dle.md).

**Padrão:** `POST` com `{ action, ... }` + sessão opaca.

### Actions

| Action | Quem | Efeito |
| --- | --- | --- |
| `createRoom` | admin | cria sala + code + snapshot; `realtime: { url, anonKey, roomId }` |
| `joinRoom` | student/admin | valida code; member; state + realtime |
| `ping` | membro | `last_seen_at` |
| `getState` | membro | view sanitizada (+ roster se admin) |
| `startRound` | admin | phase→voting; snapshot público |
| `castVote` | aluno | A/B; tallies no snapshot (**sem** secret) |
| `reveal` | admin | phase→revealed; ratings/rationale no snapshot |
| `nextRound` | admin | próxima rodada ou `deckFinished` |
| `closeRoom` | admin | phase→closed |
| `listRoomRoster` | admin | roster / pending |

### Env

- [x] `SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) documentada; devolvida só no campo `realtime` (nunca service-role).

### Checklist

- [x] `api/classind.js` + wiring `local-server.mjs` (Vercel: `api/*.js` automático).  
- [x] Erros: 403 / 409 / 404 / 400 / 410 / 503.  
- [x] Teste explícito: snapshot pré-reveal sem secret (`assertNoSecrets` + smoke).  
- [x] Smoke: `tests/classind-api-smoke.mjs`.  
- [x] Deck `aula5-v1` com 6 rodadas da Task 0.

### Aceite

- [x] Fluxo unitário/anti-spoiler + 401/405 via smoke.  
- [ ] Integração create→reveal no Supabase: rode a migration Task 2 + `CLASSIND_SMOKE_ADMIN_TOKEN` (opcional).

---

## Task 4 — Frontend ClassInd-dle (live UX + Realtime) — ✅

**Arquivos:** `pages/classind-dle.html` · `css/classind-dle.css` · `js/classind-dle/**` · smoke `tests/classind-dle-pages-smoke.mjs`.

### Realtime client

- [x] Após `createRoom` / `joinRoom`, `realtime.js` com `{ url, anonKey, roomId }`.  
- [x] Subscribe `postgres_changes` em `classind_live_snapshots`.  
- [x] Aplica payload se `stateVersion` ≥ local.  
- [x] Fallback poll 4 s em erro/ausência de anon key.  
- [x] Resync em `SUBSCRIBED` e `visibilitychange`.  
- [x] `castVote` otimista em `myVote`; tallies pelo push/API.

### Checklist

- [x] Página no app-shell (CTA aula5).  
- [x] `ROUTES.classindDle`.  
- [x] Layout telão (≥800px) vs mobile.  
- [x] Deck `rounds.js` (Task 3).  
- [x] Smoke pages.  
- [x] Teclado A/B · toast · código gigante · host controls + roster.

### Aceite

- [x] UI + sync implementados no repo.  
- [ ] QA manual 2 browsers após migration + `SUPABASE_ANON_KEY` (humano).

---
## Task 5 — Parte 2: Formulário IARC de Mesa + Patch Note — ✅

**Arquivos:** `js/aula5/config/pitches.js` · `js/aula5/iarc-wizard.js` · `css/aula5-iarc.css` · mount em `pages/aula5.html` · smoke `tests/aula5-iarc-smoke.mjs`.  
**Capas:** `assets/classind-dle/covers/*.webp` (600×800) via `npm run classind:covers` / `scripts/normalize-classind-covers.mjs`.

### Fluxo

1. Grupo escolhe ou sorteia pitch 16+/18+.  
2. Consulta tabela ClassInd + vê eixos do original.  
3. Reescreve visual / narrativa / cura / inimigos.  
4. Gera Patch Note → aplicar em anotações+síntese, copiar ou baixar `.md`.

### Checklist

- [x] Wizard IARC na Oficina.  
- [x] 4 pitches (Necrópole Viral, Sombra do Contrato, App de Destinos, Porão das Horas).  
- [x] Tabela ClassInd simplificada.  
- [x] Validação de campos obrigatórios.  
- [x] Integração com `config-notes` + `gdd-text`.  
- [x] Capas padronizadas (slug WebP) + deck atualizado com variedade.

### Aceite

- [x] Patch Note gerável no site sem sair da aula.  
- [x] Texto aplica na entrega (`lesson_paragraphs` via finalize existente).

---

## Task 6 — Catálogo Trilha, gates, redeem, prereq — ✅

### Checklist

- [x] `js/api.js` → `MODULES` / `LESSONS`: entrada `aula5` (título/subtitle/rewardXp 30).  
- [x] `api/progress.js` → `LESSON_CATALOG.aula5`, `LESSON_GATES.aula5.published = false`; `LESSON_PREREQUISITES.aula5 → aula4` em `api/_lib/store.js`.  
- [x] Mock code `CLASSIND2026` + geração admin via `LESSON_CATALOG.aula5`.  
- [x] Card na Trilha consome catálogo (sem hardcode).  
- [x] Atualizar smokes de páginas/catálogo que listam só até aula4 (`phase5`, `lesson-paragraph`, `souls-activities`, `menu-arcoiris` + `aula5-qa-smoke`).

### Aceite

- [x] Com gate false, aluno vê “Em breve”; admin preview ok.  
- [x] Redeem concede XP + marca `completed_lessons` (regra `aula5_concluida` no servidor; arte/nome público na Task 7).

---

## Task 7 — Conquistas e secretas — ✅

### Checklist

- [x] Regra pública `aula5_concluida` (**Guardião da Faixa**).  
- [x] 3 secretas `hidden`, `meta.family: "aula5"`, `volatile: true` (`oraculo_do_classind`, `selo_do_livre`, `balanca_da_faixa`).  
- [x] Avaliação server-side no save de parágrafo (motor volátil).  
- [x] Stubs de arte WebP no padrão do Álbum.  
- [x] Pistas curtas na Oficina **sem** spoiler de ids.  
- [x] Smokes `tests/aula5-secretas-volateis-smoke.mjs` (+ checks em `aula5-qa-smoke`).

### Aceite

- [x] Pública só após redeem (`ACHIEVEMENT_RULES` + `completed_lessons`).  
- [x] Secretas disparam pelas diretrizes da Task 0 (keywords ClassInd/IARC; faixa Livre; atenuante/agravante).

---

## Task 8 — Material baixável + slides — ✅

### Checklist

- [x] `assets/docs/aulas/aula05-classind/README.md` — ClassInd resumido, IARC, checklist Patch Note, como entrar no dle.  
- [x] Tabela de faixas / exemplos (`faixas-classind.md`).  
- [x] Slides `aula05_classind_iarc_slides.{pptx,pdf}` + `scripts/build-aula05-slides.py`.  
- [x] Links na aba Slides da `aula5` + downloads na Oficina (README / faixas).

### Aceite

- [x] Download abre; slides cobrem teoria + instruções das 2 práticas (14 slides).

---

## Task 9 — Playbook do Mestre + roteiro de aula ao vivo — ✅

Criar [`docs/playbook-liberar-aula5.md`](./playbook-liberar-aula5.md) **e** checklist operacional de sala:

### Dia da aula (roteiro 120 min)

| Min | Bloco | Ação |
| --- | --- | --- |
| 0–20 | Fundamentos | Telão na `aula5` ou slides |
| 20–25 | Setup dle | Mestre cria sala; alunos entram pelo CTA |
| 25–65 | Higher/Lower | 6+ rodadas; revelar; discutir descritores |
| 65–115 | Adequação reversa | Grupos + wizard; circular entre mesas |
| 115–120 | Fechamento | 1 grupo apresenta patch note; lembrar Altar |

### Playbook liberar

- [x] Gate `published: true` na turma (instruções no playbook).  
- [x] Gerar código `aula5`.  
- [x] Checklist QA pós-liberação (abrir página, dle, wizard, redeem).

### Aceite

- [x] Playbook cobre liberação + roteiro 120 min + operação dle + smokes pré-turma.
---

## Task 10 — Testes, QA de sala e critérios finais — ✅

### Smokes automatizados

- [x] `tests/aula5-qa-smoke.mjs` — página, catálogo, marcadores, aceite estático.  
- [x] `tests/classind-api-smoke.mjs` — ciclo de sala + anti-spoiler.  
- [x] `tests/classind-dle-pages-smoke.mjs` — assets + Realtime/poll.  
- [x] `package.json` `check` agrega smokes aula5/classind.  
- [x] Listagens genéricas (`lesson-paragraph-smoke`, `phase5-pages-smoke`) incluem `aula5`.

### QA manual (dois dispositivos)

Checklist operacional em [`docs/playbook-liberar-aula5.md`](./playbook-liberar-aula5.md) §6 (humano — exige staging + migration):

- [ ] Chrome (Mestre) + celular (aluno).  
- [ ] 2 alunos votando lados opostos; tallies corretos.  
- [ ] Reveal só admin.  
- [ ] Next round limpa votos.  
- [ ] Parte 2 gera patch note e salva parágrafo.  
- [ ] Gate/redeem/conquista pública.

### Critérios de aceite globais

- [x] Ementa coberta: ClassInd + IARC + prática dle + higienização (smoke + página).  
- [x] Sem Godot nesta aula (smoke).  
- [x] Sem spoiler pré-reveal (`classind-api-smoke` + `assertNoSecrets`).  
- [x] **Realtime** wired (`postgres_changes` + playbook QA live).  
- [x] Fallback poll wired no client + playbook.  
- [ ] 20+ alunos em lab — validação humana no dia (playbook §6).  
- [x] Ponte Aula 04 atualizada (Task 11).

---

## Task 11 — Correção da ponte Aula 04 → 05 — ✅

### Checklist

- [x] Em `docs/plano-aula4-plataformas-restricoes.md`, seção *Ponte — Aula 05*: ClassInd/IARC + link para este arquivo.  
- [x] Menções “próximo currículo” / README aula04 / slides aula04 sem prometer câmera como Aula 05.  
- [x] Eco em `plano-aula3-homo-ludens.md` (ponte): câmera → **Módulo 2+**.

### Aceite

- [x] Nenhum doc ativo promete Godot-câmera como Aula 05 oficial.
---

## Ordem de implementação sugerida

```
Task 0 ✅
  → Task 2 (schema + RLS + publication Realtime) + Task 3 (API + snapshot upsert)
  → Task 4 (UI dle + realtime.js)
  → Task 1 (página aula5 + CTA)        ⟵ copy pode paralelizar cedo
  → Task 5 (wizard IARC)
  → Task 6 (catálogo/gates)
  → Task 7 (conquistas)
  → Task 8 (slides/material)
  → Task 9 (playbook)
  → Task 10 (QA incl. push live)
  → Task 11 (ponte docs)
```

**Caminho crítico:** Task 2 → 3 → 4 (Realtime de ponta a ponta). Sem publication/RLS, a UI não é “live de verdade”.

---

## Fora de escopo (v1)

- Socket.io / servidor WebSocket próprio.  
- App Kahoot nativo / XP por acerto no Altar (backlog).  
- CRUD admin visual para editar rodadas (JSON no repo basta).  
- Integração automática com API oficial IARC (só simulação pedagógica).  
- Godot, Camera2D, AnimatedSprite.  
- Modo espectador sem login.  
- Tabela `classind_patches` (entrega via `lesson_paragraphs`).  
- Histórico analítico multi-dia / export CSV (pós-MVP).

---

## Pós-MVP (backlog consciente)

1. Leaderboard de acertos por turma na tela do Mestre.  
2. Export CSV da sessão.  
3. Modo “treino solo” (flashcards Higher/Lower sem sala).  
4. Conquista por streak de acertos no dle.  
5. Presença com presence API do Realtime (avatares online) além de `classind_members`.

---

## Mapa de arquivos (previsto)


| Arquivo | Função |
| --- | --- |
| `docs/plano-aula5-classind-iarc.md` | Este plano |
| `docs/playbook-liberar-aula5.md` | Liberação + roteiro live |
| `pages/aula5.html` / `js/aula5.js` | Aula pedagógica + Parte 2 |
| `pages/classind-dle.html` | Runtime Higher/Lower |
| `css/classind-dle.css` | Layout telão/mobile |
| `js/classind-dle/**` | Client live + Realtime |
| `js/aula5/config/pitches.js` | Pitches higienização |
| `api/classind.js` | Actions + upsert snapshot |
| `db/migrate-*-classind-dle.sql` | Schema + RLS + publication |
| `assets/docs/aulas/aula05-classind/**` | Material |
| `tests/aula5-*.mjs` / `tests/classind-*.mjs` | Smokes |
| `js/api.js` / `api/progress.js` | Catálogo, gates, conquistas |

---

## Resumo executivo

A Aula 05 quebra o padrão Godot: a oficina **é o site**. O pedaço difícil é o **ClassInd-dle multi-jogador autoritativo com push real**. A v1 usa **Supabase Realtime** (`classind_live_snapshots` + RLS anon read) enquanto mutações passam só por `api/classind.js` (sessão opaca + service-role). Polling fica como **fallback**, não como caminho principal. Mestre = `admin` com revelar livre + quorum visual; secrets só pós-reveal; Parte 2 = wizard IARC + Patch Note no contrato de entrega das aulas 1–4.

**Tasks 0–11 fechadas no repo.** Pendente operacional: deploy da migration ClassInd-dle no Supabase + QA manual do [`playbook-liberar-aula5.md`](./playbook-liberar-aula5.md) §6.