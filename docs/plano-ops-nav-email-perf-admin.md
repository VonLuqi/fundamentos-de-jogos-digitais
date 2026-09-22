# Plano — Nav Despertar, e-mail obrigatório, performance/segurança, migrates e relatório admin

> **Estado:** Task 0–7 feitas (2026-09-22) — ciclo ops fechado: nav/e-mail/perf/migrates/Almas + Espelho da Alma.  
> **Fase:** lapidação (pós-MVP) — preferir endurecimento completo a atalhos.  
> **Predecessores:** [`plano-hades-despertar.md`](./plano-hades-despertar.md) · [`plano-esqueci-senha-email.md`](./plano-esqueci-senha-email.md) · [`plano-relatorio-admin-atividades-filtros.md`](./plano-relatorio-admin-atividades-filtros.md) · [`plano-aula5-classind-iarc.md`](./plano-aula5-classind-iarc.md)  
> **Stack a manter:** HTML/CSS/JS ES-Modules · `api/*` serverless · sessão opaca · Supabase service role · design Hades (`--hades-*`, Cinzel / Crimson Text).  
> **Fora deste ciclo:** migrar para Supabase Auth · partial HTML compartilhado do shell · 2FA · leaderboard PvP de **SPS/Almas** do Despertar.  
> **Placar do Domínio** (XP · conquistas · streak do Juízo) e o minigame **Juízo do Tartarus** estão no [`plano-hades-despertar.md`](./plano-hades-despertar.md) **Fase 7** — não neste ciclo de ops.

> **Emenda 2026-09-22 (e-mail / recuperação):** as decisões **B1–B4 / B6** (hard-gate) e o papel central de **C** (Caronte + forçar e-mail) foram **superseded** por [`plano-email-opcional-recuperacao-admin.md`](./plano-email-opcional-recuperacao-admin.md). Contrato vigente: e-mail **opcional**, hard-gate **off**, recuperação preferida = **Código de Recuperação da Alma** no Espelho. B5 (entrega SMTP/Resend) e C legado (Caronte) permanecem como canal/atalho, não como gate. O histórico abaixo não foi reescrito.

Este documento é o **mapa operacional** das frentes de lapidação. Cada Task é executável sozinha, na ordem.

---

## Objetivos

1. **Nav coerente + Despertar sob chave do Mestre:** um único slot de jogo no shell; alunos veem **O Despertar · em breve** até o admin liberar; URL e API bloqueadas enquanto fechado.
2. **Performance + segurança:** batch de gates, rate limit de auth, TTL de sessões, prerequisites no redeem.
3. **E-mail:** ~~hard-gate~~ → **opcional** + soft-nudge (emenda 2026-09-22 — plano-email).
4. **Recuperação:** ~~só Caronte+e-mail~~ → **Código de Recuperação da Alma** preferido; Caronte legado.
5. **Migrates automáticos:** `npm run db:migrate` sem SQL Editor.
6. **Relatório Almas lapidado:** filtros práticos, todas as aulas, busca na Vigília, CSV, app-shell, **espelho editável** da conta do aluno.

---

## Diagnóstico rápido (estado atual)

| Peça | Onde | Situação | Alvo |
| --- | --- | --- | --- |
| Nav Aula 05 | `pages/aula5.html` | Despertar vivo **e** Minigame travado | Um slot: Despertar travado até gate admin |
| Nav ClassInd-dle | `pages/classind-dle.html` | Despertar vivo | Mesmo slot + gate |
| Nav demais | shell pages | Minigame travado | Substituir por Despertar (travado/liberado) |
| Gate Despertar | `api/despertar.js` | Qualquer sessão | Gate `published` controlado pelo admin |
| Publish map | `fetchLessonsPublishMap` | N+1 POSTs | Action batch |
| Auth abuse | `api/auth.js` | Sem rate limit login/register | Rate limit + TTL sessions |
| E-mail legado | Selo no Painel | Soft / ignorável | Hard até `email_verified_at` |
| Reset sem e-mail | `requestPasswordReset` | Fora do self-service | Código do Mestre + bind + reset |
| Migrates | SQL Editor manual | Frágil | Script + `_schema_migrations` |
| Relatório | `souls.html` | Filtros densos / sem espelho editável | UX + dossier + CSV + shell |

---

## Arquitetura das frentes (visão)

```text
[Task 1] Nav + gate Despertar (admin) ──► HTMLs + lesson_gates('despertar') + API 403
[Task 5] Script migrates               ──► npm run db:migrate  (antes das migrations novas)
[Task 3] E-mail hard-gate              ──► client redirect + API reject
[Task 4] Reset legado + código Mestre ──► auth.html + actions + admin rotaciona código
[Task 2] Perf / segurança             ──► batch gates + rate limit + TTL + prereqs
[Task 6] Relatório layout/filtros/CSV ──► souls + app-shell + export
[Task 7] Espelho da alma (CRUD admin) ──► dossier + mutações seguras
```

**Ordem congelada:** `1 → 5 → 3 → 4 → 2 → 6 → 7`.

---

## Task 0 — Decisões congeladas

**Checklist (fechado)**

- [x] A1–A4 (nav / Despertar)
- [x] B1–B5 (e-mail)
- [x] C1–C5 (recuperação legada + código do Mestre)
- [x] D1–D4 (perf / segurança)
- [x] E1–E4 (migrates)
- [x] F1–F5 (relatório + espelho + CSV + shell)
- [x] Ordem de execução congelada

### A. Nav / O Despertar

| # | Tema | Decisão |
| --- | --- | --- |
| A1 | Destino do item | Em **todas** as páginas do shell: **um** slot de jogo = **O Despertar**. Remover “Minigame em breve”. Enquanto o gate estiver fechado, o link aparece **travado** (`is-locked`, copy **O Despertar · em breve**). Aluno **não** joga por nav nem por URL. |
| A2 | Quem joga quando aberto | Qualquer aluno **logado**, **depois** da liberação do admin (não exige concluir aula N). |
| A3 | Teto do shell | **Um** slot só. `aula5.html` perde o Minigame duplicado. |
| A4 | Deep link / API | **Bloquear página + API** enquanto fechado. Admin sempre passa. |
| A5 | Mecânica do gate | Reutilizar `lesson_gates` com `lesson_id = 'despertar'` e `gate_key = 'published'`. Default **fechado** (`released = false` / ausência = fechado). Admin liga/desliga via action já existente `setLessonGate` (+ toggle no Painel/Almas ou playbook). Cliente consulta no boot do shell / `despertar.html`. `api/despertar.js` rejeita `403` se fechado. |
| A6 | Copy nav | Fechado: `O Despertar · em breve`. Aberto: `O Despertar`. |

> Isso **amenda** o `plano-hades-despertar.md` #4 (“sem lesson_gates”) para a lapidação: o módulo continua transversal (sem prereq de aula), mas passa a ter **chave do Mestre**.

### B. E-mail obrigatório

> **Superseded** — ver emenda no topo e [`plano-email-opcional-recuperacao-admin.md`](./plano-email-opcional-recuperacao-admin.md) (Tasks 1–2). Hard-gate removido; e-mail opcional.

| # | Tema | Decisão |
| --- | --- | --- |
| B1 | Dureza | ~~**Hard-block**~~ → **soft-nudge** (emenda 2026-09-22). |
| B2 | Pending | ~~bloqueia~~ → **não bloqueia** navegação (emenda). |
| B3 | Admin | **Isento.** |
| B4 | Após vincular | Confirmar selo habilita reset por e-mail; Domínio já liberado sem selo. |
| B5 | Entrega de e-mail | **Resend com domínio verificado** ou **SMTP**. Checklist + sonda admin no README / Task 1 do plano-email. |
| B6 | Server | ~~`403 messenger_seal_required`~~ → `rejectUnlessMessengerSeal` **no-op** (emenda). |

### C. Recuperação legada

> **Parcialmente superseded** — recuperação preferida = Código de Recuperação da Alma (Task 3 do plano-email). Caronte permanece como atalho **legado** (“Alma antiga”).

| # | Tema | Décisão |
| --- | --- | --- |
| C1 | Fluxo | Preferido: Espelho → emitir código → Pacto **O Mestre me deu um código**. Legado: Caronte + e-mail. |
| C2 | Prova de posse | Código **por aluno** (hash em `soul_recovery_codes`) ou Caronte global (legado). |
| C2b | Forma do código | Charset compartilhado; Caronte em `site_settings`; códigos de alma em `soul_recovery_codes` (TTL 24h). |
| C3 | E-mails | Legado Caronte ainda confirma selo no link; código de alma **não** exige e-mail. |
| C4 | Contas novas | Firmar Pacto (e-mail opcional). |
| C5 | Já tem selo | Reset por e-mail intacto. |

### D. Performance / segurança

| # | Tema | Decisão |
| --- | --- | --- |
| D1 | Prioridade perf | **Batch `lessonGates`** (#1). Em seguida endurecimento de auth (D2/D3) na mesma Task 2. |
| D2 | Rate limit login/register | **Sim, obrigatório.** 10 login / IP / 15 min; 5 register / IP / hora; 10 login / username / 15 min. 429 genérico. Persistido em tabela (`auth_rate_events`) — serverless não tem memória estável. |
| D3 | TTL de sessions | **Neste ciclo.** `sessions.expires_at` com TTL **14 dias**, renovação deslizante em `validateSession` (estende se restam &lt; 7 dias). Limpeza oportunista de expiradas. Reset de senha continua apagando todas as sessions do user. |
| D4 | Prerequisites no redeem | **Sim.** Enforce `LESSON_PREREQUISITES` no path Supabase de `progress.js` `redeem` (alinhar docs ↔ código). |

### E. Script de migrates

| # | Tema | Decisão |
| --- | --- | --- |
| E1 | Auth | **`DATABASE_URL` + `pg`.** Connection string do Supabase (Direct ou Pooler). Nunca versionar. |
| E2 | Ledger | **Sim** — tabela `_schema_migrations` (`id text PK`, `applied_at timestamptz`). |
| E3 | Escopo | Default: só `db/migrate-*.sql` em ordem. Flag `--bootstrap` opcional aplica `setup.sql` em banco zero **antes** dos migrates (cuidado: não usar em prod com dados). |
| E4 | Dry-run | **Sim** — `--dry-run` lista o que seria aplicado sem executar. |

### F. Relatório admin

| # | Tema | Decisão |
| --- | --- | --- |
| F1 | Dor | Filtros inconsistentes + cards pouco práticos. Alvo: consulta rápida + **espelho completo** da alma com edição sem SQL Editor. |
| F2 | Aulas nos chips | **Todas** as aulas do catálogo `LESSONS` (inclui aula5). |
| F3 | Busca Vigília | **Sim** — título / tag / @dono. |
| F4 | Export CSV | **Sim** — export da lista filtrada (Alunos) + opcional Atividades; UTF-8 BOM para Excel. |
| F5 | App-shell | **Sim** — `souls.html` entra no app-shell (nav admin coerente, logout, tokens). |
| F6 | Espelho | Task 7 dedicada: painel dossier (perfil, XP, conquistas, aulas, atividades, e-mail/selo, turma) + mutações admin auditáveis (ver Task 7). |

### Lacunas fechadas na Task 0 (critério “melhor para o sistema”)

| Tema | Por que esta escolha |
| --- | --- |
| Despertar travado + gate admin | Jogo pronto demais para vazar na Aula 05; Mestre controla o momento pedagógico sem esconder o destino na nav. |
| Hard e-mail + pending | Recuperação e comunicação dependem do selo; soft-block falhou com a turma. |
| Código do Mestre no reset legado | Username é semi-público na sala; código rotativo evita takeover. |
| Reset confirma selo (1 e-mail) | Menos atrito; um clique resolve selo + Palavra. |
| Resend + domínio | `resend.dev` não entrega à turma; SMTP fica fallback. |
| Batch + rate limit + TTL + prereqs | Lapidação fecha os riscos já listados em `contexto.md`. |
| `pg` + ledger | Idempotência real; zero SQL Editor no dia a dia. |
| CSV + shell + dossier | Relatório vira ferramenta de sala, não só listagem. |

---

## Linguagem de produto (Domínio)

| Conceito | Nome no Domínio | Onde |
| --- | --- | --- |
| Minigame | **O Despertar** / **O Despertar · em breve** | Nav |
| Liberar jogo | **Abrir o Acheron** / **Selar o Acheron** | Toggle admin |
| E-mail | **E-mail** / **Selo do Mensageiro** | Painel + gate |
| Confirmar e-mail | **Confirmar o selo** | Link `?verify=` / reset legado |
| Esqueci senha | **A Palavra se perdeu** | `auth.html` |
| Código de recuperação | **Código de Recuperação da Alma** (preferido) · **Senha do Caronte** (legado) | Espelho + Pacto |
| Bind na recuperação | **Selar o Mensageiro para recuperar** | Painel reset legado |
| Relatório | **Almas Registradas** | `souls.html` |
| Dossier | **Espelho da Alma** | Detalhe admin |
| Filtros | **Véu** (“Limpar véu”) | Barra de filtros |
| Export | **Extrair o Véu** (CSV) | Toolbar admin |

---

## Task 1 — Nav + gate do Despertar

**Depende de:** Task 0 A\* (fechada).  
**Arquivos:** todos `pages/*.html` com shell nav; `js/app-shell.js`; `api/despertar.js`; `api/progress.js` (defaults/`setLessonGate` para `despertar`); `js/api.js`; toggle admin (dashboard ou souls); `tests/menu-arcoiris-almas-smoke.mjs`; `tests/despertar-*-smoke.mjs`; playbook curto.

### 1.1 Nav

1. Remover `data-nav-item="minigame"` de **todas** as páginas.
2. Inserir um único `data-nav-item="despertar"`:
   - HTML inicial pode ser o link real; o shell aplica `is-locked` + copy **em breve** se gate fechado (ou HTML já locked e JS destrava).
3. `aula5` / `classind-dle`: eliminar duplicata Minigame.
4. Smoke: exigir Despertar; proibir Minigame legado.

### 1.2 Gate server

1. Default: `despertar.published = false` (ausência em `lesson_gates` = fechado).
2. `api/despertar.js`: após validar sessão, se student e gate fechado → `403 { error: 'despertar_sealed' }`.
3. `pages/despertar.html` + `js/hades-despertar/index.js`: se 403 / gate fechado → redirect Trilha ou empty state “O Acheron ainda está selado.”
4. Admin: sempre acessa; toggle **Abrir/Selar o Acheron** chama `setLessonGate(token, 'despertar', 'published', bool)`.

### Aceite Task 1

- [x] Um único item de jogo em todas as navs.
- [x] Aluno não abre Despertar por URL com gate fechado (página + API).
- [x] Admin libera → nav ativa + jogo funciona; sela de novo → trava.
- [x] `npm run check` (smoke de menu + despertar) verde.

### 1.3 Reset de progresso antecipado (pós-vazamento)

Quem abriu O Despertar pela nav da Aula 05 antes do gate precisa voltar ao zero.

| Peça | O quê |
| --- | --- |
| Servidor | Action admin `stateResetStudents` em `api/despertar.js` — apaga `despertar_states` de `role ≠ admin` |
| UI | Painel → **Limpar Estelas antecipadas** (confirmação) |
| Cache local | `STORAGE_DB_NAME = despertar-db-v2` (+ prefix session) — IndexedDB antigo é ignorado |
| SQL | `db/migrate-2026-09-21-despertar-reset-early-access.sql` (opcional se o botão já rodou) |

- [x] Botão admin limpa Estelas de alunos
- [x] IndexedDB epoch v2
- [x] Migration SQL versionada

---

## Task 2 — Performance e segurança

**Depende de:** Task 0 D\*; preferível após Task 5 (migration de `sessions.expires_at` + `auth_rate_events`).  
**Arquivos:** `api/progress.js`, `js/api.js`, `api/auth.js`, `api/_lib/*`, `db/migrate-…-sessions-ttl-rate.sql`, smokes.

### 2.1 Batch `lessonGates`

- Action `lessonGatesBatch` → uma query `.in('lesson_id', ids)` + merge defaults (inclui `despertar` se no mapa).
- `fetchLessonsPublishMap` usa batch.

### 2.2 Rate limit login/register

- Tabela `auth_rate_events` (ip_hash, username_hash nullable, action, created_at).
- Limites D2; resposta 429 com copy do Domínio.

### 2.3 TTL sessions

- Migration `expires_at timestamptz`.
- Create session: `now + 14d`.
- `validateSession`: rejeita expirada; renova se `expires_at - now < 7d`.
- GC oportunista (delete where expired) em login/validate.

### 2.4 Prerequisites no redeem

- Importar/enforce `LESSON_PREREQUISITES` no redeem live.

### Aceite Task 2

- [x] Publish map em 1 round-trip.
- [x] Brute-force login limitado.
- [x] Sessions expiram / renovam.
- [x] Redeem respeita prereq.
- [x] `npm run check` verde.

---

## Task 3 — E-mail hard-gate

**Depende de:** B\*; **ops:** domínio Resend verificado (B5) antes do hard em produção.  
**Arquivos:** `js/api.js`, `js/app-shell.js`, `js/dashboard.js`, `pages/dashboard.html`, `api/auth.js`, `api/progress.js`, `api/despertar.js`, `api/classind.js`, CSS do selo, smokes.

### 3.1 Regra

| Estado | Gate |
| --- | --- |
| student `empty` / `pending` | Bloqueado |
| student `confirmed` | Livre |
| admin | Livre |

### 3.2 Client

- `needsMessengerSeal(user)` central.
- `initAppShell` / `requireSession`: redirect `dashboard.html?selo=1` se precisa.
- Selo não dismissível; só form + reenvio.
- Exceções: `auth.html`, confirm `?verify=`.

### 3.3 Server

- Helper `rejectUnlessMessengerSeal(user)` nas mutações (lista na implementação).
- Nunca bloquear: sessão GET, logout, bindEmail, requestEmailVerification, confirmEmail, confirmPasswordReset.

### Aceite Task 3

- [x] Student sem selo não usa Trilha/aulas/Despertar/ClassInd.
- [x] Confirma → livre.
- [x] Admin isento.
- [x] API 403 coerente.
- [x] Smoke cobre o helper.

---

## Task 4 — Recuperação legada + Senha do Caronte

**Depende de:** C\* + Task 3 + Task 5 (migration settings/código).  
**Arquivos:** `pages/auth.html`, `js/auth.js`, `api/auth.js`, `api/_lib/auth-email.js`, UI admin em souls/dashboard, migration, smokes.

### 4.1 Fluxo

```text
[A Palavra se perdeu]
  · Tem selo? → username + e-mail (fluxo atual)
  · Sem e-mail (legado)?
       → username + Senha do Caronte + e-mail novo
       → se código ok: grava email, dispara Mensageiro (token único)
       → link: confirma selo + abre Nova Palavra
       → confirmPasswordReset (invalida sessions)
```

### 4.2 Admin

- Em Almas (ou Painel): **Gerar / rotacionar Senha do Caronte**.
- Mostra plaintext **uma vez**; guarda só hash.
- Playbook: falar o código na sala quando alguém precisar recuperar.

### 4.3 API

| Action | Notas |
| --- | --- |
| `rotateRecoveryCode` | admin; devolve plaintext uma vez |
| `requestLegacyEmailBind` | pública; username + code + email; sempre 200 genérico |
| `confirmPasswordReset` (estendido) | se token `legacy_reset`: set `email_verified_at` + nova senha |

### Aceite Task 4

- [x] Legado recupera com código + e-mail.
- [x] Código errado / rate limit não grava e-mail.
- [x] Conta nova não usa atalho.
- [x] Selo confirmado no mesmo clique do reset.
- [x] Smoke + teste com Resend/SMTP.

---

## Task 5 — Script `db:migrate`

**Depende de:** E\* (fechada).  
**Arquivos:** `scripts/apply-migrations.mjs`, `package.json` (`db:migrate`), dependency `pg`, README, migration inicial do ledger se necessário (bootstrap cria `_schema_migrations`).

### Comportamento

```bash
npm run db:migrate
npm run db:migrate -- --dry-run
npm run db:migrate -- --bootstrap      # só banco zero
npm run db:migrate -- --mark-applied   # baseline: banco já migrado no SQL Editor
```

1. Lê `DATABASE_URL` de `.env.local`.
2. Garante `_schema_migrations`.
3. Aplica `migrate-*.sql` pendentes em ordem, 1 transação/arquivo.
4. Log `APPLY` / `SKIP` / `FAIL`; exit ≠ 0 se falha.
5. Nunca logar a connection string.
6. `--mark-applied` registra o histórico sem reexecutar (evita deletes one-shot).

### Aceite Task 5

- [x] Aplica pendentes sem SQL Editor.
- [x] Segunda run é no-op.
- [x] Dry-run lista sem escrever.
- [x] README documenta `DATABASE_URL`.

---

## Task 6 — Relatório: layout, filtros, CSV, app-shell

**Depende de:** F1–F5 (espelho editável fica na Task 7).  
**Arquivos:** `pages/souls.html`, `css/souls.css`, `js/souls.js`, `js/souls-report.js`, `js/app-shell.js`, smokes.

### 6.1 Layout

1. Entrar no **app-shell** (nav + logout + tokens).
2. Toolbar 2 linhas (desktop); `<details>` no mobile.
3. Chips a partir de **todo** `LESSONS` (aula5+).
4. Facetas contextuais por aba óbvias.
5. Busca na Vigília (título / tag / @dono).
6. Empty states do Domínio.
7. Corrigir filtros que não combinam certo hoje (revisitar `matchesSoulFilters` + testes).

### 6.2 CSV

- Botão **Extrair o Véu**: exporta a lista **já filtrada** da aba Alunos (e segundo botão/opção para Atividades).
- Colunas: nome, username, turma, XP, e-mail?, selo?, aulas concluídas, vistas, #atividades, #conquistas, tem Única.
- UTF-8 BOM; e-mail **só** no CSV admin (já é superfície admin).

### Aceite Task 6

- [x] Shell ok; filtros práticos; aula5 nos chips.
- [x] Busca Vigília.
- [x] CSV da lista filtrada.
- [x] Overflow smoke verde.
- [x] `npm run check` verde.

---

## Task 7 — Espelho da Alma (dossier + edição admin)

**Depende de:** Task 6.  
**Arquivos:** `pages/souls.html` / CSS / JS; actions admin em `api/progress.js` (e/ou `api/auth.js` para reset forçado); smokes; audit log leve.

### 7.1 Espelho (read)

Painel ao clicar no aluno (deep link `?tab=users&u=`):

- Identidade: nome, @, turma, avatar, role
- Selo: e-mail mascarado, verified_at / pending / empty
- Progresso: XP, level, completed, viewed, conquistas (com raridade)
- Atividades: resumo por aula (chips) + atalho para aba Atividades
- Grimório: contagem sob Vigília + atalho
- Despertar: se há row em `despertar_states` (sim/não; sem expor economia inteira no MVP do espelho)

### 7.2 Mutações (write) — sem SQL Editor

Todas exigem `rejectUnlessAdmin` + confirmação na UI:

| Ação | Escopo |
| --- | --- |
| Editar `full_name`, `turma`, `avatar_index` | perfil |
| Ajustar XP (± ou set com razão) | progresso |
| Marcar/desmarcar aula concluída | progresso |
| Conceder/revogar conquista | conquistas |
| Limpar e-mail / forçar re-selo (zera verified) | emergência |
| Invalidar sessions do aluno | segurança |
| Reset de senha **temporária** gerada (mostra uma vez) | sala |

**Fora (ainda):** editar parágrafo cru da atividade; apagar conta; impersonar sessão.

### 7.3 Audit

- Tabela `admin_audit_events` (`actor_id`, `target_user_id`, `action`, `payload jsonb`, `created_at`) **ou** append em log estruturado.
- Obrigatório para mutações de XP/senha/conquistas.

### Aceite Task 7

- [x] Dossier mostra o que o Mestre precisa em uma tela.
- [x] Edições listadas funcionam sem abrir Supabase.
- [x] Aluno comum não chama as actions (403).
- [x] Audit registra mudanças sensíveis.
- [x] Smoke das actions críticas (`tests/ops-task7-espelho-alma-smoke.mjs`).

---

## Ordem de execução (congelada)

| Ordem | Task | Por quê |
| --- | --- | --- |
| 0 | Task 0 | Fechada |
| 1 | Task 1 | Bug nav Aula 05 + vaz vazamento do jogo |
| 2 | Task 5 | Migrates antes de schema novo (TTL, rate, settings, audit) |
| 3 | Task 3 | Hard e-mail (ops Resend primeiro) |
| 4 | Task 4 | Recuperação legada + Senha do Caronte |
| 5 | Task 2 | Perf/segurança |
| 6 | Task 6 | Relatório UX + CSV + shell |
| 7 | Task 7 | Espelho editável |

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| Hard e-mail sem DNS Resend | Checklist B5; não anunciar hard em prod até entrega real |
| Senha do Caronte vazada na turma | Rotação fácil no admin; rate limit; hash no banco |
| Gate Despertar esquecido aberto | Default fechado; playbook “Selar o Acheron” |
| CSV com e-mail | Só admin; não logar conteúdo |
| Mutação admin errada | Confirmação UI + audit + sem delete de conta |
| Migrate em prod sem backup | Dry-run + README aviso |

---

## Fora de escopo (congelado)

- Supabase Auth / RLS de escrita no browser.
- Partial HTML único para dedupe de nav (continuamos editando HTMLs).
- 2FA; troca de senha logado (exceto reset admin na Task 7).
- Leaderboard / PvP Despertar.
- Impersonação de sessão / apagar conta pelo painel.
- Editar texto da atividade do aluno no relatório.

---

## Referências rápidas de código

| Tema | Caminho |
| --- | --- |
| Nav Aula 05 | `pages/aula5.html` |
| Shell | `js/app-shell.js` |
| Gates | `api/progress.js` → `lesson_gates`, `setLessonGate` |
| Despertar API | `api/despertar.js` |
| Publish N+1 | `js/api.js` → `fetchLessonsPublishMap` |
| Auth e-mail | `api/auth.js`, `api/_lib/auth-email.js` |
| Selo Painel | `js/dashboard.js` → `renderMessengerSeal` |
| Reset UI | `pages/auth.html`, `js/auth.js` |
| SQL | `db/setup.sql`, `db/migrate-*.sql` |
| Relatório | `pages/souls.html`, `js/souls.js`, `js/souls-report.js`, `css/souls.css` |

---

## Próximo passo

1. Ciclo Tasks 0–7 **fechado** — não reabrir no meio de outra frente.
2. Garantir ops de e-mail (domínio Resend) em produção se ainda pendente.
3. Aplicar `npm run db:migrate` em cada ambiente (inclui `admin_audit_events`).
4. Fora deste plano: Fase 7 do Despertar / Juízo (`plano-hades-despertar.md`).
