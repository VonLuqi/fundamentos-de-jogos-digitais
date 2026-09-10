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
- ✅ Cadastro com e-mail obrigatório e recuperação **A Palavra se perdeu** (selo no e-mail)
- ✅ Cadastro com nome completo real (`full_name`) + username de login
- ✅ Proteção de rotas (páginas protegidas redirecionam sem sessão válida)
- ✅ Dashboard do aluno ("Salão dos Heróis") como hub: altar, perfil, prévias e CTAs
- ✅ Trilha do Herói (`pages/aulas.html`) com liberação por admin (`lesson_gates`)
- ✅ Álbum de Relíquias (`pages/conquistas.html`) com slots, modal e deep link
- ✅ Companheiros de Jornada no Painel do Herói (convites, vínculos, limite 25)
- ✅ Espelho do Companheiro (`pages/companheiro.html?u=…`) com perfil e álbum read-only
- ✅ Sistema de XP e resgate de código ("Oferenda ao Estige")
- ✅ Painel administrativo (geração de códigos e visão de alunos) para `role: admin`
- ✅ Página administrativa dedicada de alunos (`/pages/souls.html`) com avatar e métricas
- ✅ Troca de avatar persistida no backend via `/api/progress`
- ✅ Tracking de visualização de aula por aluno (`lesson_views`) para relatórios
- ✅ Migração automática de senhas legadas (texto plano → hash `scrypt`) no login
- ✅ Módulo 01 — "A Regra do Jogo" (teoria MDA + simulação interativa em canvas)
- ✅ Servidor local de desenvolvimento (`local-server.mjs`) que expõe as rotas `/api` sem depender do Vercel CLI

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
│   ├── supabaseClient.js          # Cliente Supabase singleton
│   └── _lib/
│       └── store.js               # Regras de usuário, conquistas e códigos de resgate
├── assets/
│   ├── images/
│   ├── icons/
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
│   └── souls.css                  # Página admin de almas/alunos
├── db/
│   ├── setup.sql                  # Schema de referência completo
│   ├── migrate-2026-09-01-fullname-lesson-views.sql
│   └── migrate-2026-09-08-friendships.sql # Vínculos entre alunos
├── docs/
│   ├── plano-sistema-amigos.md    # Plano Companheiros / Espelho
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
│   └── souls.js                   # Listagem visual de alunos (admin)
├── pages/
│   ├── auth.html
│   ├── dashboard.html
│   ├── aulas.html
│   ├── conquistas.html
│   ├── companheiro.html           # Espelho do Companheiro (?u=username)
│   ├── aula1.html
│   ├── aula2.html
│   ├── aula3.html
│   └── souls.html
├── tests/
│   ├── login-check.mjs
│   ├── friends-phase1-smoke.mjs
│   ├── friends-phase4-smoke.mjs
│   └── mirror-secret-axes-smoke.mjs
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
   RESEND_API_KEY=re_sua_chave
   MAIL_FROM=Fundamentos de Jogos Digitais <beth.t@example.com>
   APP_BASE_URL=http://localhost:3000
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=seu.email@gmail.com
   SMTP_PASS=senha-de-app
   ```

   Em produção (Vercel), `APP_BASE_URL` deve ser `https://fundamentos-de-jogos-digitais.vercel.app` (o servidor também usa esse host se a var faltar só em Production).

   **Por que o e-mail não chega:** o remetente `beth.t@example.com` **só entrega para o e-mail da conta Resend**. Pedido de reset / selo responde 200 mesmo assim — a UI diz que o Mensageiro partiu, mas o Resend recusa destinatários da turma. Caminhos que realmente entregam:

   1. Verificar um domínio em [resend.com/domains](https://resend.com/domains) e trocar `MAIL_FROM` para `Fundamentos de Jogos Digitais <noreply@SEU_DOMINIO>`; ou
   2. SMTP (Gmail: senha de app em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)) com `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`. Se o Resend falhar no modo teste, o servidor tenta o SMTP.

   Coloque as vars na Vercel (Production + Preview) e em `.env.local`. Não versionar a API key nem a senha SMTP.

3. Execute o script [db/setup.sql](db/setup.sql) no SQL Editor do Supabase para criar as tabelas (`users`, `sessions`, `redeem_codes`, `lesson_gates`, `lesson_paragraphs`, `lesson_views`, `friendships`) e semear o usuário administrador.

4. Se seu banco já existia antes dessas mudanças, execute também:
   - [db/migrate-2026-09-01-fullname-lesson-views.sql](db/migrate-2026-09-01-fullname-lesson-views.sql) para `full_name` e `lesson_views`;
   - [db/migrate-2026-09-08-friendships.sql](db/migrate-2026-09-08-friendships.sql) para **Companheiros de Jornada**;
   - [db/migrate-2026-09-10-password-reset-email.sql](db/migrate-2026-09-10-password-reset-email.sql) para e-mail do aluno e tokens de reset / verificação.

   > ⚠️ A coluna `id` de `users` deve ser do mesmo tipo referenciado em `sessions.user_id` (veja [docs/vercel-dev-troubleshoot.md](docs/vercel-dev-troubleshoot.md) para o troubleshooting completo desse ponto).

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

Executa `node --check` em todos os módulos de front-end e das rotas de API.

## Rotas da API

| Método | Rota                     | Ação                                  |
| ------ | ------------------------ | -------------------------------------- |
| POST   | `/api/auth`              | `login`, `register`, `logout`, `requestEmailVerification`, `confirmEmail`, `bindEmail`, `requestPasswordReset`, `confirmPasswordReset` |
| GET    | `/api/auth?token=...`    | Valida sessão ativa (token de **sessão**, não o selo de e-mail) |
| GET    | `/api/progress?token=...`| Retorna o perfil do usuário autenticado|
| POST   | `/api/progress`          | `redeem`, `avatar`, `lessonCode`, `lessonGates`, `setLessonGate` (admin), `getLessonParagraph`, `saveLessonParagraph`, `lessonView`, `generateCode` (admin), `listCodes` (admin), `listUsers` (admin), `friendsList`, `friendSearch`, `friendRequest`, `friendRespond`, `friendRemove`, `friendProfile` |

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

O login continua por `username` (nunca por e-mail). As respostas da API priorizam o nome real do aluno. O e-mail entra **pendente** até o aluno clicar **Confirmar o selo**; o reset só envia mensagem se o selo estiver confirmado.

### A Palavra se perdeu (recuperação por e-mail)

No Pacto de Sangue, o link **A Palavra se perdeu?** pede username + e-mail e chama o Mensageiro. A API **sempre** responde 200 com a mesma copy — não revela se a conta existe.

**Alunos já cadastrados sem e-mail** precisam, enquanto ainda estão logados, vincular e-mail no **Painel do Herói** (bloco **Selo do Mensageiro**) e confirmar o selo. Sem e-mail confirmado, o “esqueci” não tem para quem mandar. Quem perdeu a senha **e** nunca vinculou e-mail trata a recuperação na sala (fora do self-service).

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
