# ▲ FUNDAMENTOS DE JOGOS DIGITAIS

> Plataforma gamificada de ensino de design e desenvolvimento de jogos digitais.

![Status](https://img.shields.io/badge/status-funcional-22c55e?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.4.0-a855f7?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-HTML5%20%7C%20CSS3%20%7C%20JS%20%7C%20Node.js%20%7C%20Supabase-22d3ee?style=for-the-badge)

## Sobre o Projeto

**Fundamentos de Jogos Digitais** é uma plataforma web educacional com progressão gamificada. O aluno avança por módulos de conteúdo, completa aulas e acumula **XP** para subir de nível — como em um RPG de design de jogos.

A interface segue uma estética **cinematográfica (Hades-like)**: dark mode profundo, tipografia clássica (Cinzel/Crimson Text) e efeitos de "game feel" (flash de tela, level up, screen shake). O estado de progresso (XP, conquistas, aulas concluídas) é **server-authoritative** — o navegador nunca decide recompensas, apenas exibe o que o backend confirma.

## Status Atual

O projeto está em fase **funcional**, com os seguintes fluxos já implementados e validados:

- ✅ Autenticação (login/cadastro) com sessão via token opaco
- ✅ Cadastro com e-mail **opcional** e recuperação **A Palavra se perdeu** (selo no e-mail, se houver)
- ✅ Cadastro com nome completo real (`full_name`) + username de login
- ✅ Proteção de rotas (páginas protegidas redirecionam sem sessão válida)
- ✅ Dashboard do aluno ("Salão dos Heróis") como hub: altar, perfil, prévias e CTAs
- ✅ Trilha do Herói (`pages/aulas.html`) com liberação por admin (`lesson_gates`)
- ✅ Álbum de Relíquias (`pages/conquistas.html`) com slots, modal e deep link
- ✅ Companheiros de Jornada no Painel do Herói (convites, vínculos, limite 25)
- ✅ Espelho do Companheiro (`pages/companheiro.html?u=…`) com perfil e álbum read-only
- ✅ Sistema de XP e resgate de código ("Oferenda ao Estige")
- ✅ Painel administrativo (geração de códigos e visão de alunos) para `role: admin`
- ✅ Almas Registradas (`/pages/souls.html`): app-shell, Véu (filtros + relíquia Única + **Extrair o Véu** CSV), busca na Vigília, aula5 nos chips, **Espelho da Alma** (`?tab=users&u=`) com edições auditadas
- ✅ Troca de avatar persistida no backend via `/api/progress`
- ✅ Tracking de visualização de aula por aluno (`lesson_views`) para relatórios
- ✅ Migração automática de senhas legadas (texto plano → hash `scrypt`) no login
- ✅ Módulo 01 — "A Regra do Jogo" (teoria MDA + simulação interativa em canvas)
- ✅ Servidor local de desenvolvimento (`local-server.mjs`) que expõe as rotas `/api` sem depender do Vercel CLI
- ✅ **Hades: O Despertar do Submundo** (`pages/despertar.html`): clicker server-authoritative (`/api/despertar`), layout Cookie (Altar · Mundo · Store), WorldView/AltarOrbit, sync + prestígio + talentos, **Bancada do Juiz** (Vereditos), Códice do Loop, conquistas no Álbum (gate do Mestre). Planos: [docs/plano-hades-despertar.md](docs/plano-hades-despertar.md) · [docs/plano-despertar-ui-cookieclicker.md](docs/plano-despertar-ui-cookieclicker.md).
- ✅ **Juízo do Tartarus** (modal Higher/Lower no Despertar) + pool stub ≥200 em [data/despertar-juizo-pool.stub.json](data/despertar-juizo-pool.stub.json). Click no card / Empate (`A` \| `B` \| `tie`; aliases `higher`/`lower`). No acerto o desafiante sempre assume o trono. O Mestre completa cada entrada com `rating` (L|10|12|14|16|18), `blurb` e `cover` (filename sob `assets/classind-dle/covers/` ou `assets/despertar-juizo/covers/`); só entradas com `rating` entram no sorteio; o CTA exige ≥30 ready. GDD: [docs/gdd-juizo-v2.md](docs/gdd-juizo-v2.md).
- ✅ **Placar do Domínio** (`pages/ranking.html`, CTA **Ver o Placar** no Painel): turma/global · XP · #relíquias · juizoBest — sem almas/SPS.

### O Despertar — preview e arte

![Sombra Vagante — placeholder do gerador T1](assets/despertar/sprites/generators/wandering_shade.webp)

Layout jogável em `pages/despertar.html` (desktop: três colunas; mobile empilhado). Sprites atuais são **placeholders** WebP/SVG gerados no pipeline p5/silhueta — a Foice herói (`assets/despertar/sprites/Foice.png` + slash no Ceifar), prateleiras em matriz 10×4 (contain, sem stretch), chrome do Juízo e capas faltantes do pool estão abertos para o Mestre em [assets/despertar/PEDIDOS-MESTRE.md](assets/despertar/PEDIDOS-MESTRE.md) (`art-requests.json`). Substituir o arquivo no mesmo path basta; o jogo já faz fallback de silhueta.

## Roadmap

- [x] Estrutura base e infraestrutura (front-end estático)
- [x] Design System com variáveis CSS
- [x] Módulo 01 — A Regra do Jogo (Unplugged)
- [x] Sistema de login / autenticação de jogadores
- [x] Sistema de XP e progressão de nível por leitura de aulas
- [x] Conquistas (badges) e HUD de progresso
- [x] Persistência de progresso via Supabase (PostgreSQL)
- [x] Painel administrativo e troca de avatar persistida
- [x] Companheiros de Jornada + Espelho do Companheiro
- [x] Hades: O Despertar do Submundo (clicker Cookie UI + Juízo HL + sync + Códice)
- [ ] Módulo 02 e 03 — Próximas aulas do curso
- [ ] Cobertura de testes automatizados ampliada (dashboard, XP, resgate)
- [ ] Expiração de sessão e rate limiting no login

## Estrutura de Diretórios

```text
fundamentos-de-jogos-digitais/
├── index.html                   # Introdução / landing da plataforma
├── local-server.mjs              # Servidor local de desenvolvimento (Node http)
├── migrate-passwords.js          # Script utilitário de migração de senhas legadas
├── package.json
├── api/
│   ├── auth.js                   # Login, cadastro, sessão e logout
│   ├── progress.js                # XP, conquistas, resgate de código, avatar, admin
│   ├── despertar.js               # Estado autoritativo do clicker (sync / prestige / talentos)
│   ├── supabaseClient.js          # Cliente Supabase singleton
│   └── _lib/
│       ├── store.js               # Regras de usuário, conquistas e códigos de resgate
│       ├── despertar-validate.js  # validateSync + prestige + talentBuy
│       ├── despertar-achievements.js # Elegibilidade do Códice + grant de relíquias
│       └── despertar-gate.js      # Gate published / selado
├── assets/
│   ├── images/
│   ├── icons/
│   ├── achievements/              # WebP das relíquias (incl. despertar_*)
│   ├── despertar/                 # Sprites placeholders + PEDIDOS-MESTRE.md
│   └── docs/
│       └── aulas/                 # PDFs das aulas
├── css/
│   ├── style.css                  # Introdução / Home
│   ├── auth.css                   # Tela de login/cadastro
│   ├── app-shell.css              # Shell de navegação interna
│   ├── dashboard.css              # Salão dos Heróis (hub)
│   ├── aulas.css                  # Trilha do Herói
│   ├── conquistas.css             # Álbum de Relíquias
│   ├── companheiros.css           # Companheiros + Espelho
│   ├── aula.css                   # Páginas de aula
│   ├── despertar.css              # UI do clicker O Despertar
│   └── souls.css                  # Página admin de almas/alunos
├── db/
│   ├── setup.sql                  # Schema de referência completo
│   ├── migrate-2026-09-01-fix-lesson-views.sql
│   ├── migrate-2026-09-08-friendships.sql # Vínculos entre alunos
│   └── migrate-2026-09-11-hades-despertar.sql # Tabela despertar_states
├── docs/
│   ├── plano-sistema-amigos.md    # Plano Companheiros / Espelho
│   ├── plano-hades-despertar.md   # Plano Fases 0–8 do Despertar
│   ├── plano-despertar-ui-cookieclicker.md # Fase 8 — UI Cookie + Juízo dle
│   ├── gdd-hades-despertar.md     # GDD do clicker
│   ├── gdd-juizo-v2.md            # GDD curto do Juízo Higher/Lower
│   └── vercel-dev-troubleshoot.md
├── js/
│   ├── main.js                    # CTA de entrada da introdução (auth ou dashboard)
│   ├── api.js                     # Cliente HTTP + gerenciamento de sessão
│   ├── auth.js                    # Lógica do formulário de login/cadastro
│   ├── app-shell.js               # Navegação lateral / drawer
│   ├── dashboard.js               # Hub do painel do aluno
│   ├── friends-ui.js              # Seção Companheiros no perfil
│   ├── companheiro.js             # Espelho do Companheiro
│   ├── aulas.js                   # Trilha do Herói
│   ├── conquistas.js              # Álbum de Relíquias
│   ├── lessons-ui.js              # Render compartilhado de aulas
│   ├── achievements-ui.js         # Render compartilhado de conquistas
│   ├── gamefeel.js                # Efeitos visuais (flash, shake, level up)
│   ├── aula1.js                   # Simulação interativa da Aula 1
│   ├── souls.js                   # Listagem visual de alunos (admin)
│   └── hades-despertar/           # Clicker: GameLoop, formulas, sync, UI, Códice
├── pages/
│   ├── auth.html
│   ├── dashboard.html
│   ├── aulas.html
│   ├── conquistas.html
│   ├── companheiro.html           # Espelho do Companheiro (?u=username)
│   ├── despertar.html             # Hades: O Despertar do Submundo
│   ├── aula1.html
│   ├── aula2.html
│   ├── aula3.html
│   └── souls.html
├── tests/
│   ├── login-check.mjs
│   ├── friends-phase1-smoke.mjs
│   ├── friends-phase4-smoke.mjs
│   ├── mirror-secret-axes-smoke.mjs
│   └── despertar-*-smoke.mjs      # Smokes do Despertar (sync, Códice, conquistas, …)
├── .gitignore
└── README.md
```

## Tecnologias

| Camada       | Tecnologia                                  |
| ------------ | -------------------------------------------- |
| Estrutura    | HTML5 semântico                              |
| Estilização  | CSS3 (Design Tokens / `:root`)               |
| Lógica       | JavaScript (ES Modules)                      |
| Runtime      | Node.js >= 18                                |
| Backend/API  | Rotas serverless em `/api` (compatíveis com Vercel) |
| Banco        | Supabase (PostgreSQL)                        |
| Senhas       | `scrypt` (com migração automática de legado) |
| Fontes       | Cinzel, Crimson Text                         |

## Pré-requisitos

- Node.js 18 ou superior
- Uma conta e projeto no [Supabase](https://supabase.com/)
- Tabelas `users` e `sessions` criadas no banco (ver [db/setup.sql](db/setup.sql))

## Configuração do Ambiente

1. Clone o repositório e instale as dependências:

   ```bash
   git clone https://github.com/VonLuqi/fundamentos-de-jogos-digitais.git
   cd fundamentos-de-jogos-digitais
   npm install
   ```

2. Crie um arquivo `.env` (ou `.env.local`) na raiz com as credenciais do Supabase:

   ```bash
   SUPABASE_URL=https://SEU_PROJETO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   DATABASE_URL=postgresql://postgres.[REF]:[SENHA]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   APP_BASE_URL=http://localhost:3000
   # Mensageiro — escolha SMTP (rápido) OU Resend com domínio verificado:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=seu.email@gmail.com
   SMTP_PASS=senha-de-app
   MAIL_FROM=Fundamentos de Jogos Digitais <seu.email@gmail.com>
   # RESEND_API_KEY=re_sua_chave
   # RESEND_MAIL_FROM=Fundamentos de Jogos Digitais <noreply@SEU_DOMINIO>
   KV_REST_API_URL=
   KV_REST_API_TOKEN=
   ```

   Há um template versionado em [`.env.example`](.env.example) (copie para `.env.local`).

   `DATABASE_URL` é a **connection string** do Postgres para **migrate** (`npm run db:migrate`). Pode ser Direct ou Pooler; **nunca** versionar. A API em produção continua com service role (PostgREST), salvo path C5.

   **pg pool runtime (Fase C / C5 — último recurso):** `DATABASE_URL_RUNTIME` = URI **Transaction** (porta **6543**). Flag `DESPERTAR_PG_POOL=1` (default **off**) faz o hotspot `stateSync` chamar `despertar_persist_and_award` via `pg` Pool (max 1–3 / isolate, `PG_POOL_MAX`). Falha → fallback PostgREST + log `pg_pool_fallback=1`. **Proibido** Session/Direct (5432) em serverless. Só ligar com evidência D5 (conexões approaching max / p95). Ver [`api/_lib/pg-pool.js`](api/_lib/pg-pool.js).

   **Vercel KV (Fase A — performance):** `KV_REST_API_URL` + `KV_REST_API_TOKEN` (ou o par Upstash `UPSTASH_REDIS_REST_*`). Usado para rate limit de jogo (Despertar sync / Juízo / underworld) e cache de `lesson_gates`. Sem KV no `.env.local`, a API **degrada** para limite em memória do isolate (ok em dev; em Production/Preview configure o Storage KV na Vercel). Detalhes: [`docs/otimizacoes/01-tasks-fase-a-contencao.md`](docs/otimizacoes/01-tasks-fase-a-contencao.md).

   **Edge Middleware (Fase C / C1 — teto por IP):** [`middleware.js`](middleware.js) na raiz (Vercel Routing Middleware) limita `/api/auth` (30/min/IP), `/api/despertar` (60/min/IP) e `/api/progress` (90/min/IP) **antes** do isolate Node, com o mesmo KV REST. Sem KV no Edge: fail-open com teto in-memory + `edge_rate_degraded=1`. `/api/cron/*` fica fora do matcher. O `local-server` (`npm run dev`) **não** roda este Middleware — só Preview/Production na Vercel. Detalhes: [`docs/otimizacoes/03-tasks-fase-c-escala-obs.md`](docs/otimizacoes/03-tasks-fase-c-escala-obs.md).

   **Leaderboard KV cache (Fase C / C4 — opcional):** `LEADERBOARD_KV_CACHE=1` ativa snapshot compartilhado do Placar (`fjd:lb:…`, TTL 30–60 s via `LEADERBOARD_CACHE_TTL_SEC`, partida 45). Default **off** até k6 C4 `measured` mostrar p95 `leaderboardGet` acima do limiar. Invalidação best-effort após awards / redeem / admin XP. Ver [`api/_lib/leaderboard-cache.js`](api/_lib/leaderboard-cache.js).

   **Cache de assets (Fase C / C6):** em [`vercel.json`](vercel.json), `/assets/**` recebe `Cache-Control` longo (7d + SWR) e `/data/**` TTL curto (60s) porque JSON (`game-catalog.json`, pool Juízo) muda **sem** hash no filename. `/api/**` permanece `no-store` (inclui `session-bootstrap`). **Cache bust:** ao substituir um asset no mesmo path, mude o nome do arquivo **ou** aguarde o TTL / faça hard refresh; para catálogos versionáveis, prefira novo filename com hash (ex. `game-catalog.<hash>.json`) se precisar invalidação imediata em CDN.
   **Cron sessions-purge (Fase A / A5):** defina `CRON_SECRET` na Vercel (Production + Preview). O job diário `0 5 * * *` chama [`/api/cron/sessions-purge`](api/cron/sessions-purge.js) com `Authorization: Bearer $CRON_SECRET` e remove linhas de `sessions` com `expires_at` vencido — **fora** do login. Local: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sessions-purge`.

   **Cron warmup (Fase C / C7):** `45 11 * * 1-5` (≈ **08:45 BRT**, dias úteis) chama [`/api/cron/warmup`](api/cron/warmup.js) com o mesmo `CRON_SECRET`. Aquece isolates de auth/progress/bootstrap via GET (sem scrypt; 401 esperado). Janela recomendada: **15–30 min antes** da abertura da turma — ajuste o schedule no [`vercel.json`](vercel.json) se a aula for noutro horário. Manual: `curl -H "Authorization: Bearer $CRON_SECRET" "$APP_BASE_URL/api/cron/warmup"`. Detalhes: [`docs/load-results/WARMUP-C7.md`](docs/load-results/WARMUP-C7.md).

   Em produção (Vercel), `APP_BASE_URL` deve ser `https://fundamentos-de-jogos-digitais.vercel.app` (o servidor também usa esse host se a var faltar só em Production).

   ### Checklist do Mensageiro (entrega real)

   **Por que o e-mail não chega:** o remetente `beth.t@example.com` **só entrega para o e-mail da conta Resend**. Pedido de reset / selo responde 200 mesmo assim no fluxo “esqueci” (anti-enumeração). No **Painel** (vínculo/reenvio autenticado), a UI mostra **Mensageiro não partiu** quando `mailSent === false`.

   Caminhos que realmente entregam à turma (escolha **um** go-live):

   1. **SMTP Gmail (rápido):** senha de app em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) + `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` com o mesmo Gmail. Coloque na Vercel (Production + Preview) e faça redeploy.
   2. **Resend com domínio verificado:** [resend.com/domains](https://resend.com/domains) (SPF/DKIM) + `RESEND_API_KEY` + `MAIL_FROM` / `RESEND_MAIL_FROM` no domínio real. **Não** anunciar à turma enquanto o from for `resend.dev`.
   3. Se Resend **e** SMTP estiverem setados: o servidor tenta Resend e cai no SMTP se o Resend recusar (modo teste).

   **Sonda do Mestre:** no Painel do Herói (admin) → **Testar o Mensageiro** (`adminProbeMailer`). Informe um e-mail que você controle; o status do canal aparece sob as Ferramentas do Mestre. Logs Vercel: `[mailer]` com `reason` (`no_provider`, `resend_testing_domain`, `smtp_exception`, …).

   Plano: [`docs/plano-email-opcional-recuperacao-admin.md`](docs/plano-email-opcional-recuperacao-admin.md) Task 1.

   Coloque as vars na Vercel (Production + Preview) e em `.env.local`. Não versionar a API key nem a senha SMTP.

3. **Schema do banco**

   **Banco novo (vazio):**

   ```bash
   npm run db:migrate -- --bootstrap
   ```

   Aplica [db/setup.sql](db/setup.sql) e depois os `db/migrate-*.sql` pendentes (ledger `_schema_migrations`).

   **Banco que já foi migrado no SQL Editor:** faça backup, depois baseline sem reexecutar o histórico (evita reaplicar deletes como o reset das Estelas):

   ```bash
   npm run db:migrate -- --mark-applied
   ```

   **Dia a dia** (só pendentes):

   ```bash
   npm run db:migrate -- --dry-run   # lista APPLY/SKIP sem escrever
   npm run db:migrate
   ```

   Cada arquivo roda em uma transação; logs `APPLY` / `SKIP` / `FAIL`. Exit ≠ 0 se falhar. O script **não** imprime a connection string.

   > ⚠️ Em produção: backup antes; não use `--bootstrap` com dados. A coluna `id` de `users` deve ser do mesmo tipo referenciado em `sessions.user_id` (veja [docs/vercel-dev-troubleshoot.md](docs/vercel-dev-troubleshoot.md)).

4. Se preferir o SQL Editor manual (legado), execute [db/setup.sql](db/setup.sql) e, em bancos antigos, os arquivos `db/migrate-*.sql` na ordem do nome — ou migre de uma vez com o script acima.

## Como Executar Localmente

### Opção 1 — Servidor local dedicado (recomendado, sem Vercel CLI)

```bash
node local-server.mjs
```

Acesse em `http://localhost:3000`.

### Opção 2 — Vercel CLI

```bash
npx vercel dev
```

### Verificação de sintaxe

```bash
npm run check
```

Executa `node --check` nos módulos de front-end e API e roda os smokes (incl. Despertar: sync, Códice, conquistas).

## Rotas da API

| Método | Rota                     | Ação                                  |
| ------ | ------------------------ | -------------------------------------- |
| POST   | `/api/auth`              | `login`, `register`, `logout`, `requestEmailVerification`, `confirmEmail`, `bindEmail`, `requestPasswordReset`, `confirmPasswordReset` |
| GET    | `/api/auth?token=...`    | Valida sessão ativa (token de **sessão**, não o selo de e-mail) |
| GET    | `/api/progress?token=...`| Retorna o perfil do usuário autenticado|
| POST   | `/api/progress`          | `redeem`, `avatar`, `lessonCode`, `lessonGates`, `lessonGatesBatch`, `setLessonGate` (admin), `getLessonParagraph`, `saveLessonParagraph`, `lessonView`, `generateCode` (admin), `listCodes` (admin), `listUsers` (admin), `friendsList`, `friendSearch`, `friendRequest`, `friendRespond`, `friendRemove`, `friendProfile`, `classmatesList`, `leaderboardGet` (Placar: turma/global · xp/achievements/juizoBest) |
| POST   | `/api/despertar`         | `stateGet`, `stateSync`, `prestige`, `talentBuy`, `verdictBuy` (Bancada), `juizoStart` / `juizoGuess` / `juizoAbandon` (Juízo); `stateResetStudents` (admin). Gate published + Selo |

### Companheiros de Jornada

No **Painel do Herói**, a seção do perfil permite:

- convidar por username (autocomplete na mesma turma; match **exato** global);
- aceitar / recusar / cancelar convites;
- abrir o **Espelho do Companheiro** (`/pages/companheiro.html?u=<username>`).

O Espelho mostra perfil público + Álbum de Relíquias **somente leitura**. Conquistas secretas (`hidden`) usam **dois eixos independentes**:

| Eixo | Quem controla | Se sim | Se não |
| --- | --- | --- | --- |
| **Texto** | Observador (quem olha) | Nome + ícone (e descrição no modal) | `?` / `???` |
| **Estilo** | Espelhado | Chrome de raridade (prata / ouro / arco-íris) + badge | Visual bloqueado |

O placar `X / Y relíquias neste Espelho` conta **tudo** que o espelhado desbloqueou, inclusive secretas. O álbum **próprio** (página Conquistas) não muda. Limite soft: **25** vínculos aceitos.

Plano geral: [docs/plano-sistema-amigos.md](docs/plano-sistema-amigos.md). Correção da matriz: [docs/plano-correcao-espelho-conquistas-secretas.md](docs/plano-correcao-espelho-conquistas-secretas.md).

### Payload de cadastro (atual)

`POST /api/auth` com `action: register`:

```json
{
  "action": "register",
  "fullName": "Nome Completo do Aluno",
  "turma": "TCG01",
  "username": "username_login",
  "email": "aluno@exemplo.com",
  "password": "senha"
}
```

`email` é **opcional** — omita ou envie `""` para gravar `null` (sem Mensageiro).

O login continua por `username` (nunca por e-mail). As respostas da API priorizam o nome real do aluno. Se o e-mail for informado, fica **pendente** até o aluno clicar **Confirmar o selo**; o reset por Mensageiro só envia se o selo estiver confirmado.

### Playbook de sala (Mestre)

1. **Sem e-mail ok** — o aluno firma o Pacto e usa o Domínio; o Mensageiro é opcional.
2. **Perdeu a senha** — no Espelho da Alma → **Emitir Código de Recuperação** → aluno usa **O Mestre me deu um código** no Pacto (ou **Palavra temporária** se preferir).
3. **Mensageiro** — só se o aluno quiser self-service; canal precisa estar configurado (SMTP ou Resend — ver checklist acima). Caronte = atalho **legado**.

Plano: [`docs/plano-email-opcional-recuperacao-admin.md`](docs/plano-email-opcional-recuperacao-admin.md).

### A Palavra se perdeu (recuperação)

No Pacto de Sangue, o link **A Palavra se perdeu?** pede username + e-mail e chama o Mensageiro. A API **sempre** responde 200 com a mesma copy — não revela se a conta existe.

**Sem e-mail / Mensageiro fora:** **Código de Recuperação da Alma** (caminho preferido) ou **Palavra temporária** no Espelho. No Pacto: **O Mestre me deu um código**.

**Com e-mail selado:** self-service pelo Mensageiro. Soft-nudge no Painel; **sem** hard-gate.

**Alma antiga (legado):** **Alma antiga (Senha do Caronte)** — força e-mail novo + link que confirma o selo. Deprecated em favor do código por aluno; mantenha `db/migrate-2026-09-22-caronte-recovery.sql` só se ainda usar.

Aplique `npm run db:migrate` (inclui `soul_recovery_codes`) antes de emitir códigos em produção.

O e-mail do aluno **não** aparece no DTO de companheiros, turma ou Almas. No próprio perfil ele fica mascarado.

## Testes

```bash
node tests/login-check.mjs
node tests/integration-check.mjs
node tests/friends-phase1-smoke.mjs
node tests/friends-phase4-smoke.mjs
node tests/mirror-secret-axes-smoke.mjs
node tests/password-reset-smoke.mjs
```

- [tests/login-check.mjs](tests/login-check.mjs): valida login com credenciais corretas e incorretas.
- [tests/integration-check.mjs](tests/integration-check.mjs): valida sessão inválida, cálculo de XP/nível e resgate de código válido vs. inválido.
- [tests/friends-phase1-smoke.mjs](tests/friends-phase1-smoke.mjs): actions de amigos rejeitam sessão inválida.
- [tests/friends-phase4-smoke.mjs](tests/friends-phase4-smoke.mjs): arquivos, a11y do diálogo e documentação do Espelho.
- [tests/mirror-secret-axes-smoke.mjs](tests/mirror-secret-axes-smoke.mjs): matriz texto/estilo das secretas no Espelho + contador Q3-B.
- [tests/password-reset-smoke.mjs](tests/password-reset-smoke.mjs): pacto (esqueci / reset / e-mail), actions de auth, DTO de amigos sem e-mail, helpers de token — **não** chama Resend/SMTP.
- [tests/ops-task1-mailer-probe-smoke.mjs](tests/ops-task1-mailer-probe-smoke.mjs): status do Mensageiro + `adminProbeMailer` / UI honesta (Task 1).
- [tests/ops-task3-messenger-seal-smoke.mjs](tests/ops-task3-messenger-seal-smoke.mjs): Selo soft (e-mail opcional, reject no-op, sem redirect/403).
- [tests/ops-task3-soul-recovery-smoke.mjs](tests/ops-task3-soul-recovery-smoke.mjs): Código de Recuperação da Alma (schema, issue/consume, Espelho + Pacto).
- [tests/ops-task4-caronte-recovery-smoke.mjs](tests/ops-task4-caronte-recovery-smoke.mjs): Senha do Caronte + recuperação legada (schema, actions, UI).
- [tests/ops-task5-db-migrate-smoke.mjs](tests/ops-task5-db-migrate-smoke.mjs): script `db:migrate` (ledger, flags, README `DATABASE_URL`).
- [tests/ops-task7-espelho-alma-smoke.mjs](tests/ops-task7-espelho-alma-smoke.mjs): Espelho da Alma (actions admin, audit, UI `?tab=users&u=`).

Checklist manual (e-mail real, com `RESEND_API_KEY` **ou** SMTP): cadastro + selo; pedido certo envia e derruba sessões; username certo + e-mail errado ou conta admin não enviam; token expirado/usado recusa; aluno antigo vincula no painel; e-mail duplicado → 409; viewport estreito nos três painéis do pacto.

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas alterações: `git commit -m "feat: minha feature"`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

`<SYS>` **Desenvolvido por [VonLuqi](https://github.com/VonLuqi)** `</SYS>`
