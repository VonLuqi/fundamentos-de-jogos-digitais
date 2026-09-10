# Plano — Esqueci a Palavra de Passagem (confirmação por e-mail)

## Contexto

O **Pacto de Sangue** (`pages/auth.html` → `js/auth.js` → `POST /api/auth`) autentica alunos com **username + senha**. A senha vive em `users.password_hash` (scrypt `salt:hex`, com fallback bcrypt e plaintext legado). A sessão é um token opaco em `sessions`.

**Não existe “esqueci minha senha”.** Também **não existe e-mail** no cadastro nem na tabela `users`. Sem um endereço confirmado, o servidor não tem canal para provar que quem pede a troca é o dono da alma.

Este plano cobre um fluxo funcional de recuperação **só para alunos**, com **confirmação no e-mail**: o aluno pede a renovação, recebe um link, prova posse da caixa de entrada e define uma nova Palavra de Passagem.

Documento predecessor de auth: [`docs/vercel-dev-troubleshoot.md`](./vercel-dev-troubleshoot.md). Stack a manter: HTML/JS + Supabase + `api/auth.js` (auth customizada — **não** migrar para Supabase Auth neste ciclo).

Direção visual obrigatória: Design System Hades-like (`--hades-*`, Cinzel / Crimson Text, `btn-pact`, linguagem do Domínio). Não introduzir tela genérica de “Forgot password” de SaaS.

---

## Objetivos

1. Aluno que esqueceu a senha **recupera a conta sozinho**, sem o professor inventar senha nova na sala.
2. A prova de identidade é **clicar um link enviado ao e-mail cadastrado e confirmado**.
3. Alunos **novos** cadastram e-mail no Firmar Pacto e o confirmam.
4. Alunos **já existentes** (sem e-mail) conseguem **vincular e confirmar** o e-mail enquanto ainda estão logados — senão o “esqueci” nunca funciona para a turma atual.
5. A API **não vaza** se um username/e-mail existe; tokens de reset são de uso único e expiram.

Fora do MVP: 2FA, troca de senha logado (pode entrar como QoL na mesma fatia se sobrar tempo), reset pelo admin.

---

## Diagnóstico rápido (estado atual)

| Peça | Onde | Situação |
| --- | --- | --- |
| Login / cadastro | `pages/auth.html` + `js/auth.js` | Dois modos (Entrar / Firmar Pacto). Sem link de recuperação |
| API auth | `api/auth.js` | Actions: `register`, `login`, `logout` + GET sessão. Sem reset |
| Cliente | `js/api.js` → `login()`, `register()` | Sem helpers de reset |
| Schema `users` | `db/setup.sql` | `full_name`, `turma`, `username`, `password_hash` — **sem `email`** |
| Envio de e-mail | — | **Não existe** (nenhum Resend/SendGrid/SMTP no `package.json`) |
| Alunos já na base | produção Supabase | Contas sem e-mail → **não podem** usar reset até vincular |
| Rate limit | `api/auth.js` | Ausente (já listado como risco em `docs/contexto.md`) |
| Sessões | tabela `sessions` | Não expiram sozinhas; reset **precisa** invalidá-las |

Contrato atual de cadastro (`action: 'register'`): `fullName`, `turma`, `username`, `password`. Senha mínima: **4 caracteres**. Login identifica por `username` (`ilike`), nunca por e-mail.

---

## Linguagem de produto

| Conceito comum | Nome no Domínio | Uso |
| --- | --- | --- |
| Esqueci minha senha | **A Palavra se perdeu** | Link no login |
| Pedir reset | **Chamar o Mensageiro** | CTA do formulário de pedido |
| E-mail | **E-mail** (literal) | Campo; aluno precisa reconhecer o endereço real da faculdade/pessoal |
| Confirmar e-mail | **Confirmar o selo** | Clique no link de verificação |
| Nova senha | **Nova Palavra de Passagem** | Formulário do link |
| E-mail não confirmado | “O selo ainda não foi reconhecido.” | Estado no perfil |
| Sem e-mail | “Sem selo de mensageiro — vincule um e-mail para recuperar a Palavra.” | Empty / aviso |

Copy do pedido (sempre a mesma, exista ou não a conta):

> Se houver uma alma com esse nome e um e-mail confirmado, o Mensageiro já partiu. Olhe a caixa de entrada — e o reino das promoções.

---

## Status da Fase 0

**Fase 0 fechada** em 2026-09-10. Task 0 congelada; `APP_BASE_URL` de produção confirmado (GET 200 no host Vercel); remetente Resend provisório decidido para teste interno. A conta Resend e o DNS de domínio **não** foram criados nesta sessão (exigem login no painel) — isso **não** bloqueia a Fase 1 (migration). O primeiro e-mail real (Fase 2) precisa da API key no `.env.local` / Vercel.

### Ambiente congelado

| Var | Valor Fase 0 | Quando usa |
| --- | --- | --- |
| `APP_BASE_URL` (prod) | `https://fundamentos-de-jogos-digitais.vercel.app` | Links nos e-mails em produção. Host confirmado vivo (home 200). Sem domínio custom no repo |
| `APP_BASE_URL` (local) | `http://localhost:3000` | `local-server.mjs` (porta 3000) |
| `MAIL_FROM` (teste interno) | `Fundamentos de Jogos Digitais <beth.t@example.com>` | Só entrega para o **e-mail da conta Resend**. `to` deve ser o endereço nu, sem display name |
| `MAIL_FROM` (turma / go-live) | `Fundamentos de Jogos Digitais <noreply@SEU_DOMINIO>` | Só depois de verificar o domínio em [resend.com/domains](https://resend.com/domains) |
| `RESEND_API_KEY` | *não versionar* | Colar no `.env.local` e nas env vars da Vercel quando a conta existir |

Não confiar no header `Host` do request para montar o link: um preview `*.vercel.app` geraria selo apontando para o deploy errado.

### Conta Resend (autor — 5 minutos, antes da Fase 2)

1. Abrir [resend.com/signup](https://resend.com/signup) com o e-mail que vai **receber** os testes (`beth.t@example.com` só fala com esse endereço).
2. API Keys → **Create API key** (permissão Sending) → colar em `.env.local` como `RESEND_API_KEY=re_...` (o `.gitignore` já ignora `.env*`).
3. Na Vercel do projeto: Settings → Environment Variables → as três vars (`RESEND_API_KEY`, `MAIL_FROM`, `APP_BASE_URL` de prod). Production + Preview.
4. **Não** anunciar à turma enquanto `MAIL_FROM` for `resend.dev`.
5. Go-live: adicionar domínio (preferir subdomínio `mail.` ou `noreply.`) → copiar SPF/DKIM exatamente do painel → trocar `MAIL_FROM`.

---

## Task 0 — Respostas (fechada)

Decisões congeladas. Não reabrir no meio da implementação; senha mínima permanece 4 (item 18) para não divergir do cadastro atual.

### Produto / UX

| # | Tema | Decisão |
| --- | --- | --- |
| 1 | Quem pode resetar | **Só `role = student`**. Admin continua com senha conhecida / recuperação manual fora deste fluxo |
| 2 | Onde pede o reset | Terceiro painel no **mesmo** `auth.html` (não página nova). Link abaixo do form de login |
| 3 | Onde define a senha nova | **Mesmo** `auth.html?reset=<token>` — o token abre o painel “Nova Palavra”. Evita página órfã fora do Pacto |
| 4 | Identificador do pedido | **Username + e-mail**, os dois. Têm de bater no mesmo registro. Reduz enumeração e chute só com um dos dois |
| 5 | Cadastro novo | E-mail **obrigatório**, único, normalizado (`trim` + `lower`) |
| 6 | Login imediato no cadastro | **Permanece**. O aluno entra no Domínio na hora; e-mail fica `pending` até clicar o selo. Reset só funciona com e-mail **confirmado** |
| 7 | Alunos já cadastrados | Enquanto logados: **vincular e-mail no Painel do Herói** + e-mail de confirmação. Sem e-mail confirmado, o “Palavra se perdeu” não tem para quem mandar |
| 8 | Fallback se perdeu senha **e** não tem e-mail | Fora do self-service. Professor / admin trata na sala (não é este MVP). Documentar no README |
| 9 | Troca de e-mail | Só logado, no perfil: pede o endereço novo → confirma no e-mail **novo**. O antigo deixa de valer depois da confirmação |
| 10 | Copy do e-mail | Tom do Domínio no assunto/corpo, mas o **link e o botão** em linguagem clara (“Redefinir Palavra de Passagem”) para não parecer phishing |

### Segurança / técnico

| # | Tema | Decisão |
| --- | --- | --- |
| 11 | Provedor de e-mail | **Resend** (`resend` SDK). Cabe em Vercel serverless, free tier cobre turma. Variáveis: `RESEND_API_KEY`, `MAIL_FROM`, `APP_BASE_URL` |
| 12 | Não usar Supabase Auth | Auth atual é custom (`users` + `sessions`). Reescrever o login inteiro é fora de escopo. Só usamos o Postgres do Supabase |
| 13 | Token | `crypto.randomBytes(32).toString('hex')` no link; no banco só o **SHA-256** do token. TTL **60 minutos**, **uso único** |
| 14 | Resposta da API de pedido | Sempre **200** com a mesma mensagem. Não distinguir “usuário não existe” / “e-mail não bate” / “não confirmado” |
| 15 | Rate limit | Máx. **3 pedidos / e-mail / hora** e **5 / IP / hora**, persistidos na própria tabela de tokens (serverless não tem memória estável) |
| 16 | Após reset bem-sucedido | Atualiza `password_hash`, zera `password` legado se existir, **apaga todas as `sessions`** daquele `user_id`, apaga tokens de reset pendentes |
| 17 | `sanitizeUser` | Pode devolver `email` e `email_verified_at` **só para o próprio usuário**. Nunca no DTO público de companheiros / turma / almas (almas podem mostrar “tem e-mail?” só para admin, se útil) |
| 18 | Senha nova | **4 caracteres** no cadastro **e** no reset (mesmo contrato de `api/auth.js` hoje). Subir para 8 é ciclo futuro, os dois lados juntos |

---

## Arquitetura

```text
[auth.html]
  Entrar | Firmar Pacto | A Palavra se perdeu
        |                      |
        |                      v
        |              POST /api/auth  action: requestPasswordReset
        |                      |
        |              { username, email }  → 200 genérico
        |                      |
        |              se aluno + email confirmado + rate ok
        |                      |
        |              grava hash(token) em password_reset_tokens
        |                      |
        |              Resend → link APP_BASE_URL/pages/auth.html?reset=TOKEN
        |
        v
[auth.html?reset=TOKEN]
  Nova Palavra + confirmar
        |
        v
POST /api/auth  action: confirmPasswordReset
  { token, password }
        |
        valida hash + expiry + unused
        atualiza password_hash
        invalida sessions + tokens
        200 → mensagem → painel Entrar
```

Confirmação de e-mail (cadastro ou vínculo no perfil):

```text
POST /api/auth  action: requestEmailVerification   (sessão OU pós-register)
        → e-mail com APP_BASE_URL/pages/auth.html?verify=TOKEN

GET/POST /api/auth  action: confirmEmail
  { token }
        → users.email_verified_at = now()
```

Não criar rota `/api` nova: o padrão do projeto é **actions no mesmo handler** (`api/auth.js`). `local-server.mjs` já encaminha `/api/auth`.

---

## Schema (aditivo)

Arquivo: `db/migrate-2026-09-10-password-reset-email.sql`

### Colunas em `users`

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;

-- único quando preenchido; case-insensitive via índice em lower(email)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx
  ON users (lower(email))
  WHERE email IS NOT NULL;
```

`email` é **nullable**: contas antigas e admin não quebram. Cadastro novo passa a preencher sempre.

### Tabela `auth_email_tokens`

Uma tabela cobre reset **e** verificação de e-mail (menos superfície).

```text
auth_email_tokens
  id              integer generated always as identity PK
  user_id         integer NOT NULL REFERENCES users(id) ON DELETE CASCADE
  purpose         text NOT NULL CHECK (purpose IN ('reset_password', 'verify_email'))
  token_hash      text NOT NULL UNIQUE
  email           text NOT NULL          -- endereço alvo no momento do envio
  requested_ip    text NULL
  expires_at      timestamptz NOT NULL
  used_at         timestamptz NULL
  created_at      timestamptz NOT NULL DEFAULT now()
```

Índices: `(user_id, purpose, created_at DESC)`, `(expires_at)` para limpeza.

Job de limpeza: opcional. Tokens expirados podem ficar; a validação ignora `used_at IS NOT NULL` ou `expires_at < now()`. Se o volume incomodar, um `DELETE` manual no SQL Editor basta (turma pequena).

---

## API (`api/auth.js`)

Novas `action`s no `POST`. Nenhuma delas devolve `password_hash` nem o token em claro depois do envio.

| Action | Auth | Body | Sucesso |
| --- | --- | --- | --- |
| `register` (estender) | pública | + `email` obrigatório | Cria user, sessão, dispara `verify_email` |
| `requestPasswordReset` | pública | `username`, `email` | `{ ok: true }` genérico |
| `confirmPasswordReset` | pública | `token`, `password` | `{ ok: true }` — senha trocada |
| `requestEmailVerification` | sessão **ou** recém-registro | — | `{ ok: true }` genérico (rate limit) |
| `confirmEmail` | pública | `token` | `{ ok: true, email }` |
| `bindEmail` | sessão aluno | `email` | grava e-mail **não** verificado, dispara verify. Recusa se e-mail já é de outra alma |

Regras de `requestPasswordReset` (todas silenciosas — mesmo 200):

1. Normalizar username (`trim` + lower) e e-mail (`trim` + lower).
2. Validar formato de e-mail; se inválido, ainda assim 200 genérico (não ensinar o formato certo vs. conta inexistente? *Exceção:* 400 só para body malformado / senha curta demais no confirm).
3. Buscar user `ilike username` **e** `lower(email)` iguais **e** `role = 'student'` **e** `email_verified_at IS NOT NULL`.
4. Se não achar: return 200 genérico (não envia e-mail).
5. Rate limit: se estourou, **ainda** 200 genérico (não avisar “tente mais tarde” de forma que permita sonda — o e-mail pode mencionar o limite só se de fato enviarmos? Preferência: silêncio total no HTTP; log no servidor).
6. Invalidar tokens `reset_password` anteriores daquele `user_id` (`used_at = now()`).
7. Inserir novo token; enviar Resend.

`confirmPasswordReset`:

1. Hash do token recebido; lookup `purpose = 'reset_password'`, `used_at IS NULL`, `expires_at > now()`.
2. Senha ≥ 4. Hash scrypt (mesma `hashPassword` de `api/auth.js`).
3. Update user; `used_at = now()`; delete `sessions` onde `user_id`.
4. Token inválido/expirado → **400** “Este selo expirou ou já foi usado. Chame o Mensageiro de novo.” (aqui já tem o token; enumeração de contas não se aplica)

Envio: extrair `api/_lib/mailer.js` com `sendMail({ to, subject, html, text })`. Se `RESEND_API_KEY` ausente, logar erro e **não** falhar o 200 do pedido (o aluno vê a mensagem genérica; o professor vê o log). Em `confirm*`, a falha de persistência sim retorna 500.

---

## Front-end

### `pages/auth.html` + `css/auth.css` + `js/auth.js`

- Link no form de login: **A Palavra se perdeu?**
- Painel `form-forgot`: campos Username + E-mail, CTA **Chamar o Mensageiro**, volta para Entrar.
- Painel `form-reset`: só visível com `?reset=`; dois campos de senha; CTA **Selar nova Palavra**.
- Painel `form-verify-result`: `?verify=` confirma o e-mail e mostra sucesso / selo expirado.
- `initModeToggle` ganha um terceiro modo (ou troca de `hidden` nos forms). Subtitle muda por modo.
- Game feel: manter screen-shake + `setBusy` nos erros reais (confirm/reset). No pedido de reset, **sucesso sempre** — sem shake.

Deep links:

| Query | Painel |
| --- | --- |
| (nenhum) | Entrar |
| `#register` ou modo cadastro | Firmar Pacto (já existe via botão) |
| `?reset=` | Nova Palavra |
| `?verify=` | Resultado do selo |

### Perfil (alunos existentes) — `pages/dashboard.html` + `js/dashboard.js`

Bloco curto no card de identidade, **só student**:

- Sem e-mail: form “Vincular e-mail” + CTA.
- E-mail pendente: mostra mascarado (`m***@gmail.com`) + “Confirmar o selo” (reenviar) + “trocar endereço”.
- E-mail confirmado: mascarado + “trocou de e-mail?”.

Sem isso, a turma **já matriculada** nunca usa o esqueci-senha. É tão obrigatório quanto o link no login.

Máscara: primeiros 1–2 caracteres + domínio. Nunca o endereço inteiro em screenshot de Salão / Espelho.

### `js/api.js`

Helpers novos: `requestPasswordReset`, `confirmPasswordReset`, `confirmEmail`, `bindEmail`, `requestEmailVerification`. `register(...)` passa a receber `email`.

---

## E-mail (Resend)

### Variáveis de ambiente (Vercel + `.env.local`)

| Var | Função |
| --- | --- |
| `RESEND_API_KEY` | chave do painel Resend |
| `MAIL_FROM` | `Domínio <noreply@dominio-verificado>` — precisa domínio verificado no Resend; no free, `beth.t@example.com` só chega ao dono da conta (inútil para alunos) |
| `APP_BASE_URL` | origem absoluta congelada na Fase 0: prod `https://fundamentos-de-jogos-digitais.vercel.app` / local `http://localhost:3000`. **Nunca** derivar só do `Host` do request |

**Bloqueio de go-live (não da Fase 1):** sem domínio verificado no Resend, o e-mail não chega na caixa dos alunos. Teste interno usa `beth.t@example.com` → só o dono da conta. A API key é pré-requisito da Fase 2, não da migration.

### Conteúdo mínimo do e-mail de reset

- Assunto: `Fundamentos de Jogos Digitais — redefinir Palavra de Passagem`
- Corpo texto + HTML simples (sem depender de CSS externo — clientes de e-mail).
- Nome da alma (`full_name` / username).
- Botão/link absoluto com o token.
- Aviso: “Se você não pediu isso, ignore. A Palavra antiga continua válida.”
- Validade: 60 minutos.

E-mail de verificação: análogo, CTA **Confirmar o selo**.

---

## Fases e tasks

### Fase 0 — Conta e decisões

- [x] Remetente provisório: `Fundamentos de Jogos Digitais <beth.t@example.com>` (teste interno). Domínio próprio fica para o go-live da turma.
- [x] `APP_BASE_URL` de produção: `https://fundamentos-de-jogos-digitais.vercel.app` (host vivo). Local: `http://localhost:3000`.
- [x] Task 0 congelada, inclusive #18 (mínimo **4** no cadastro e no reset).

### Fase 1 — Banco

- [x] T1. Migration `users.email` + `email_verified_at` + índice único `lower(email)` (`db/migrate-2026-09-10-password-reset-email.sql`; espelhado em `db/setup.sql`).
- [x] T2. Tabela `auth_email_tokens` + índices (purpose, expiry, e-mail, IP).
- [x] T3. Aplicada no Postgres de produção em 2026-09-10. Colunas `email` / `email_verified_at` nullable; índice `users_email_lower_uidx`; tabela e constraints conferidos. Sem secrets no git.

### Fase 2 — Mailer + actions de verificação

- [x] T4. `api/_lib/mailer.js` (Resend; no-op seguro sem API key, com log).
- [x] T5. Dependência `resend` no `package.json` (^6.27.0). `node_modules` local no Drive pode falhar o extract; o lockfile está atualizado para o deploy Vercel.
- [x] T6. Helpers em `api/_lib/auth-email.js`: normalizar e-mail, SHA-256, TTL 60 min, rate limit 3/e-mail e 5/IP por hora.
- [x] T7. `confirmEmail` + `requestEmailVerification` + `bindEmail`. Link `?verify=` no Pacto consome o selo (senão o e-mail de cadastro seria morto até a Fase 4).
- [x] T8. `register` exige e-mail único; 409 “Este e-mail já firma outro pacto.”; dispara verify. Campo no Firmar Pacto para não quebrar o cadastro.

### Fase 3 — Reset

- [x] T9. `requestPasswordReset`: sempre 200; envia só se username + e-mail batem, `student`, e-mail confirmado, rate limit ok.
- [x] T10. `confirmPasswordReset`: senha ≥ 4, troca hash, zera `password` legado, apaga `sessions` do `user_id`, token uso único.
- [x] T11. E-mail só no self (`api/auth` sanitizeUser). Progresso / companheiros / almas omitem `email` e `email_verified_at`.

### Fase 4 — UI Pacto de Sangue

- [x] T12. Link **A Palavra se perdeu?** + `form-forgot` (username + e-mail, CTA Mensageiro, voltar a Entrar).
- [x] T13. `form-reset` em `?reset=`; `#verify-result` consome `?verify=` e também anuncia senha nova selada.
- [x] T14. `js/auth.js` modos login/register/forgot/reset; helpers já em `js/api.js`. Campo e-mail no Firmar Pacto (Fase 2).
- [x] T15. `autocomplete="email"` / `new-password`; `aria-live` nos status; pedido de reset sem shake.

### Fase 5 — UI perfil (turma atual)

- [x] T16. Vincular / reenviar / trocar e-mail no Painel do Herói (`#messenger-seal`, só `student`).
- [x] T17. Estados vazio / pendente / confirmado; e-mail mascarado; admin não vê o bloco.

### Fase 6 — Qualidade

- [x] T18. Smoke `tests/password-reset-smoke.mjs`: parse HTML (link esqueci, campos cadastro), parse `api/auth.js` (actions presentes), **não** chamar Resend de verdade.
- [x] T19. Incluir no `npm run check`.
- [x] T20. Manual: checklist da seção Teste publicada no README. O smoke cobre o estático; o fluxo de e-mail real (itens 1–8) exige `RESEND_API_KEY` e caixa de entrada — QA do autor.
- [x] T21. README: env vars, “alunos antigos precisam vincular e-mail no painel”.

---

## Ordem de implementação (não pular)

1. Fase 0 — **feita**.
2. Fase 1 — **feita** (schema em produção).
3. Fase 2 — **feita**.
4. Fase 3 — **feita**.
5. Fase 4 — **feita**.
6. Fase 5 — **feita**.
7. Fase 6 — **feita** (smoke + `npm run check` + README). E-mail real com Resend = QA do autor.

---

## Segurança (checklist de implementação)

- Token em claro **só** no e-mail e na query do link; banco guarda hash.
- TTL 60 min; uso único; novos pedidos invalidam o token anterior daquele purpose.
- Reset **não** autentica o usuário (não cria `sessions`). Ele volta ao Entrar.
- Trocar senha **derruba** sessões ativas (celular da sala, PC de casa, etc.).
- `bindEmail` recusa e-mail já usado por outro `user_id`.
- Não logar o token nem o e-mail completo em `console.log` de produção (username + `user_id` bastam).
- Página `auth.html?reset=` não deve pré-preencher a senha; `autocomplete="new-password"`.
- Admin não entra neste fluxo (evita sequestro da conta mestre por e-mail não controlado).

---

## Arquivos previstos

| Arquivo | Papel |
| --- | --- |
| `db/migrate-2026-09-10-password-reset-email.sql` | schema |
| `api/_lib/mailer.js` | Resend |
| `api/auth.js` | actions |
| `js/api.js` | cliente |
| `js/auth.js` | UI pacto |
| `pages/auth.html` | forms |
| `css/auth.css` | terceiro painel |
| `pages/dashboard.html` + `js/dashboard.js` | vincular e-mail |
| `package.json` | `resend` + smoke no `check` |
| `tests/password-reset-smoke.mjs` | smoke estático |
| `README.md` | env + onboarding de e-mail |

`local-server.mjs` e `vercel.json` **não** precisam de rota nova se tudo permanecer em `/api/auth`.

---

## Teste

### Automatizado (smoke)

- `auth.html` contém o link e os ids `form-forgot`, `form-reset`.
- Cadastro tem `name="email"`.
- `api/auth.js` menciona as actions novas.
- `sanitize` / DTO de amigos **não** inclui `email` (grep no smoke do DTO público, se já existir; senão assert no parser de `progress.js`).

### Manual (obrigatório antes de chamar de “funcional”)

1. **Cadastro novo** com e-mail real → entra no dashboard → caixa recebe “Confirmar o selo” → clica → perfil mostra confirmado.
2. Logout → **A Palavra se perdeu** com username + e-mail certos →  mensagem genérica → e-mail chega → link abre nova senha → entra com a senha nova → sessão antiga (outro browser) cai.
3. Pedido com username certo e e-mail **errado** → mesma mensagem, **nenhum** e-mail.
4. Pedido com conta **admin** → 200 genérico, nenhum e-mail.
5. Link expirado / já usado → erro claro, sem trocar senha.
6. Aluno antigo sem e-mail: logado → vincula → confirma → aí o passo 2 funciona.
7. Cadastro com e-mail já usado → 409.
8. Mobile (viewport estreito): os três painéis do pacto continuam usáveis (o form de cadastro já é longo; o de forgot é curto).

Sem ferramenta de browser nesta sessão de planejamento: a verificação visual fica para a implementação.

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| Turma atual sem e-mail | Fase 5 obrigatória; professor avisa “vincule o e-mail **antes** de esquecer a senha” |
| E-mail cai em spam | Assunto claro + domínio verificado (SPF/DKIM no Resend); avisar para olhar spam |
| Aluno usa e-mail que não acessa mais | Troca logada (Fase 5) ou atendimento na sala |
| `MAIL_FROM` no `onresend.com` | Só entrega para o dono da conta Resend — **não** serve para alunos |
| Serverless + rate limit em memória | Contar linhas em `auth_email_tokens`, não em `Map` global |
| Phishing visual | Nome da disciplina no assunto; URL absoluta do nosso host visível no e-mail texto |
| Aluno não confirma o selo e depois esquece a senha | Reset recusa silencioso; perfil mostra “selo pendente” com reenvio |

---

## Fora deste plano

- Reset iniciado pelo admin (botão em Almas).
- Login por e-mail no lugar do username.
- Magic link de login (entrar sem senha).
- Troca de senha logado (útil; encaixa depois em `bindEmail` / perfil).
- Migrar o Pacto para Supabase Auth.

---

## Critério de pronto

Um aluno `student` com e-mail **confirmado** consegue, sozinho, pedir a renovação no Pacto, clicar o link no e-mail e entrar com a senha nova. Aluno antigo consegue chegar nesse estado vinculando o e-mail no Painel do Herói. Contas admin e endereços não confirmados não recebem o Mensageiro.
