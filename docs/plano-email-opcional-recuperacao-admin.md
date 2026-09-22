# Plano — Mensageiro confiável, e-mail opcional e recuperação pelo Mestre

> **Estado:** Tasks 1–4 feitas (2026-09-22) — ciclo e-mail opcional + recuperação pelo Mestre fechado no código; ops Vercel/`db:migrate` a cargo do Mestre.  
> **Fase:** correção de sala + reversão parcial do hard-gate de e-mail.  
> **Predecessores:** `[plano-esqueci-senha-email.md](./plano-esqueci-senha-email.md)` · `[plano-ops-nav-email-perf-admin.md](./plano-ops-nav-email-perf-admin.md)` (Tasks 3–4 e 7) · README § auth/e-mail.  
> **Stack a manter:** HTML/CSS/JS · `api/auth.js` + `api/_lib/mailer.js` · sessão opaca · Supabase · design Hades.  
> **Fora deste ciclo:** migrar para Supabase Auth · 2FA · domínio custom além do necessário para entrega · reescrever o Pacto inteiro.

---



## Problema (sala)

1. **Alunos não recebem e-mail.** A UI diz que o **Mensageiro não partiu** (`mailSent === false`) ou, no “esqueci”, promete que partiu mesmo quando o provedor falhou / não está configurado.
2. **E-mail obrigatório + hard-gate** (`email_verified_at`) trava a turma: quem não quer (ou não consegue) selar o Mensageiro fica preso no Painel (`?selo=1`) e nas mutações (`403 messenger_seal_required`).
3. **Recuperação sem e-mail** hoje é confusa: Senha do Caronte (global, só alma *sem* e-mail) + Palavra temporária no Espelho (já existe, pouco visível). Falta um fluxo claro: **Mestre gera código → aluno redefine a Palavra na sala**.

Este plano corrige a entrega para quem **opta** por e-mail, **libera** quem não quer e-mail, e deixa o Mestre com um **código de recuperação por aluno**.

---



## Objetivos

1. Mensageiro **configurado e auditável** (Resend com domínio real **ou** SMTP Gmail) — quem tem e-mail confirmado recebe selo / reset de verdade.
2. E-mail **opcional** no Firmar Pacto e no Painel; sem e-mail = aluno usa o Domínio normalmente.
3. Hard-gate do Selo **desligado** (ou reduzido a soft-nudge): nunca mais bloquear progresso por falta de Mensageiro.
4. Admin gera **Código de Recuperação da Alma** (por aluno, uso único / TTL curto) no Espelho; aluno troca a senha no Pacto sem depender de e-mail.
5. Manter o fluxo por e-mail (**A Palavra se perdeu?**) como caminho **preferencial** quando há selo confirmado — sem mentir na UI sobre envio.

---



## Diagnóstico — por que o Mensageiro não parte


| Causa                                   | Sintoma                                                                                                   | Onde                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `beth.t@example.com` (domínio de teste) | Resend só entrega na caixa da **conta Resend**; e-mails da turma são rejeitados (`resend_testing_domain`) | `api/_lib/mailer.js`                  |
| Sem `RESEND_API_KEY` **e** sem SMTP     | `{ skipped: true, reason: 'no_provider' }` → `mailSent: false`                                            | env Vercel / `.env.local`             |
| SMTP incompleto / senha de app errada   | Timeout 8s ou auth fail                                                                                   | `SMTP_*`                              |
| `APP_BASE_URL` ausente (Preview)        | Token gravado, e-mail não sai (`no_base_url`)                                                             | env Preview                           |
| Hard-gate + e-mail obrigatório          | Aluno sem selo não joga; “não partiu” parece bug de jogo, mas é ops + produto                             | `messenger-seal.js`, register         |
| Copy anti-enumeração no “esqueci”       | Sempre “Mensageiro já partiu” mesmo sem envio                                                             | `js/auth.js` / `requestPasswordReset` |


**Hipótese principal em produção:** Resend com remetente de onboarding **ou** provedor ausente/mal configurado. O hard-gate amplifica a dor: falha de e-mail = aluno bloqueado.

---



## Decisões congeladas (Task 0)

Confirmar antes de codar. Defaults abaixo = “melhor para a sala agora”.

### A. Entrega de e-mail (ops)


| #   | Tema                | Decisão                                                                                                                                                                                                                                         |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Provedor de go-live | **SMTP Gmail (App Password)** como caminho rápido **ou** Resend com **domínio verificado** + `MAIL_FROM` / `RESEND_MAIL_FROM` reais. Um dos dois tem de estar verde em Production.                                                              |
| A2  | Remetente de teste  | Proibido anunciar à turma enquanto `MAIL_FROM` for `resend.dev` / `beth.t@example.com`.                                                                                                                                                         |
| A3  | Observabilidade     | Log estruturado já existe; expor no admin (opcional Task 1.3) um **status do Mensageiro** (provider configurado? último erro?). Mínimo: checklist no README + botão “testar envio” só admin → e-mail do Mestre.                                 |
| A4  | Honestidade na UI   | Onde o cliente recebe `mailSent`, **não** fingir sucesso. No “esqueci” (anti-enumeração), manter copy genérica **pública**, mas logar falha no servidor; no Painel (bind/reenvio autenticado), continuar mostrando “não partiu” com ação clara. |




### B. E-mail opcional (produto)


| #   | Tema                                  | Decisão                                                                                                                                                                                                                  |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Cadastro                              | Campo e-mail **opcional**. Vazio → `email = null`, `email_verified_at = null`. Se preenchido → validar formato + unicidade (como hoje).                                                                                  |
| B2  | Hard-gate                             | **Remover** o hard-block de páginas e o `403 messenger_seal_required` para students. Admin continua isento (código morto pode sair).                                                                                     |
| B3  | Soft-nudge                            | Painel do Herói: banner opcional “Vincule um e-mail para recuperar a Palavra sozinho” — **dismissível**, nunca trava navegação.                                                                                          |
| B4  | Reset por e-mail                      | Continua só se `email_verified_at` preenchido + username/e-mail batem. Sem selo → UI aponta para **recuperação com o Mestre**.                                                                                           |
| B5  | Fluxo legado Caronte + e-mail forçado | **Depreciar gradualmente.** Quem não tem e-mail recupera pelo **código por aluno** (Task 3), não precisa selar Mensageiro para voltar a jogar. Senha do Caronte global pode permanecer como fallback legado por 1 ciclo. |
| B6  | Contas já com e-mail pending          | Podem limpar o selo (já existe `adminClearEmailSeal`) **ou** o próprio aluno remove o endereço no Painel (nova action opcional Task 2.3). Sem obrigação de confirmar.                                                    |




### C. Código de recuperação pelo Mestre


| #   | Tema                                 | Decisão                                                                                                                                                                                                              |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Forma                                | **Código por aluno**, gerado no **Espelho da Alma**. Plaintext mostrado **uma vez** ao Mestre; no banco só hash + expiração.                                                                                         |
| C2  | Relação com `adminForceTempPassword` | Manter a Palavra temporária como atalho “abre a conta já”. O **código de recuperação** é o fluxo preferido: aluno escolhe a própria Nova Palavra no Pacto (não recebe senha ditada na sala se preferir privacidade). |
| C3  | Consumo                              | Em `auth.html`: painel **Recuperar com o Mestre** → username + código → formulário Nova Palavra (mesmo contrato de senha ≥ 4). Uso **único**; TTL **24 h** (ajustável).                                              |
| C4  | Efeito                               | Atualiza `password_hash`, zera `password` legado, **apaga todas as sessions** do aluno, marca código como usado. **Não** exige nem grava e-mail.                                                                     |
| C5  | Segurança                            | Só `role = admin` gera. Rate limit: 10 gerações / admin / hora; 5 tentativas inválidas / IP / 15 min no consumo. Audit em `admin_audit` (`issueRecoveryCode` / `consumeRecoveryCode`).                               |
| C6  | Charset                              | Reutilizar charset da Senha do Caronte (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), comprimento **10**.                                                                                                                      |
| C7  | Caronte global                       | Mantém-se para o fluxo legado “sem e-mail + quero vincular e-mail” até Task 4 (limpeza). Não misturar na UI com o código por aluno.                                                                                  |




### D. Linguagem do Domínio


| Conceito               | Nome no Domínio                                                             |
| ---------------------- | --------------------------------------------------------------------------- |
| E-mail opcional        | **Selo do Mensageiro (opcional)**                                           |
| Soft aviso             | “O Mensageiro é opcional — sem ele, peça ao Mestre se a Palavra se perder.” |
| Código admin           | **Código de Recuperação da Alma**                                           |
| Painel auth            | **O Mestre me deu um código**                                               |
| Gerar no Espelho       | **Emitir Código de Recuperação**                                            |
| Senha temp (já existe) | **Palavra temporária** (manter label atual se já estiver)                   |


---



## Arquitetura (visão)

```text
[Task 1] Ops Mensageiro          ──► env Production + teste real + copy honesta
[Task 2] E-mail opcional         ──► register + UI + REMOVER hard-gate
[Task 3] Código por aluno        ──► migrate + auth actions + Espelho + auth.html
[Task 4] Limpeza / docs / smokes ──► Caronte legado, README, testes
```

**Ordem:** `1 → 2 → 3 → 4`.  
Task 1 desbloqueia a turma que **quer** e-mail. Task 2 desbloqueia quem **não quer**. Task 3 cobre perda de senha sem Mensageiro.

---



## Task 1 — Consertar o Mensageiro (ops + honestidade)

> **Estado código:** feito (2026-09-22) — `getMailerStatus`, `adminMailerStatus`, `adminProbeMailer`, UI Painel + checklist README.  
> **Estado ops:** pendente no painel Vercel (SMTP ou Resend com domínio) — o Mestre valida com **Testar o Mensageiro**.

**Depende de:** A.  
**Arquivos:** Vercel env · `.env.example` · `api/_lib/mailer.js` · `api/auth.js` · `js/api.js` · `js/dashboard.js` · `pages/dashboard.html` · `css/dashboard.css` · README · `tests/ops-task1-mailer-probe-smoke.mjs`.

### 1.1 Checklist operacional (autor / Mestre — 15–30 min)

Escolher **um** caminho:

**Opção SMTP (rápida para turma):**

1. Conta Gmail do projeto → Senha de app.
2. Na Vercel (Production + Preview):
  `SMTP_HOST=smtp.gmail.com` · `SMTP_PORT=465` · `SMTP_USER=...` · `SMTP_PASS=...` · `MAIL_FROM=Fundamentos de Jogos Digitais <mesmo@gmail.com>` · `APP_BASE_URL=https://fundamentos-de-jogos-digitais.vercel.app`
3. Redeploy.

**Opção Resend (melhor longo prazo):**

1. Verificar domínio em resend.com (SPF/DKIM).
2. `RESEND_API_KEY` + `RESEND_MAIL_FROM` / `MAIL_FROM` no domínio real (nunca só `beth.t@example.com` para a turma).
3. SMTP pode ficar como fallback.

### 1.2 Teste de fumaça de entrega

1. Conta admin no Painel → **Testar o Mensageiro** (`adminProbeMailer`) com e-mail **real** do Mestre.
2. Bind / reenvio no Painel (aluno de teste) → deve aparecer `mailSent: true` e mensagem na caixa (e spam).
3. Se falhar: ler status sob Ferramentas do Mestre + logs Vercel `[mailer]` (`reason`) e corrigir env.

### 1.3 UI honesta (código)

1. [x] Painel: “Mensageiro não partiu” + hint “canal de e-mail” quando `mailSent === false`; catch de reenvio **não** finge sucesso.
2. [x] `adminProbeMailer` + `adminMailerStatus` (admin only).
3. [x] README / `.env.example` com checklist SMTP **ou** Resend + risco `resend.dev`.

### Aceite Task 1

- [ ] Em Production, sonda / reenvio autenticado para um e-mail controlado chega em < 2 min (ou cai em spam, mas **enviado**). ← **ops do Mestre**
- [x] `mailSent: false` só quando o provedor realmente falhou / está ausente (Painel honesto).
- [x] README descreve SMTP **ou** Resend com domínio, e o risco do `resend.dev`.
- [x] Smoke `ops-task1-mailer-probe-smoke.mjs` verde.

---



## Task 2 — E-mail opcional + derrubar hard-gate

> **Estado:** feito (2026-09-22) — register opcional, reject no-op, soft-nudge no Painel, smokes atualizados.

**Depende de:** B. Task 1 recomendada em paralelo (ops).  
**Arquivos:** `api/auth.js` · `api/_lib/messenger-seal.js` · `api/progress.js` / `despertar.js` / `classind.js` (guards) · `pages/auth.html` · `js/auth.js` · `js/api.js` · `js/dashboard.js` · `pages/dashboard.html` · testes `ops-task3-messenger-seal-smoke.mjs`.

### 2.1 API register

1. [x] Se `email` ausente / string vazia → gravar `null`, **não** chamar `dispatchEmailVerification`.
2. [x] Se presente → validar + unicidade + dispatch (como hoje); resposta inclui `mailSent`.
3. [x] Resposta 201 sempre libera sessão (já libera); sem pendência de selo para navegar.

### 2.2 Remover hard-gate

1. [x] `requireSession` **não** redireciona `?selo=1`; soft-nudge no Painel.
2. [x] `rejectUnlessMessengerSeal` = no-op; classind sem 403 de selo.
3. [x] Smoke Task 3 ops invertido (aluno sem selo **pode** mutar; banner soft).

### 2.3 UI cadastro / Painel

1. [x] `auth.html`: e-mail **opcional** + hint do Mestre.
2. [x] Painel: Selo soft; Domínio liberado sem selo.
3. [x] Forgot: hint “Peça ao Mestre” (+ Caronte legado). Painel **O Mestre me deu um código** fica na Task 3.

### Aceite Task 2

- [x] Firmar Pacto **sem** e-mail cria aluno e entra no Domínio (contrato API + UI).
- [x] Firmar Pacto **com** e-mail válido segue pending; sem bloqueio de navegação.
- [x] Nenhum `403 messenger_seal_required` efetivo (reject no-op).
- [x] Smokes atualizados verdes.

---



## Task 3 — Código de Recuperação da Alma (admin → aluno)

> **Estado:** feito (2026-09-22) — migrate `soul_recovery_codes`, issue/consume, Espelho + Pacto, smoke.  
> **Ops:** rodar `npm run db:migrate` em Production antes de emitir códigos reais.

**Depende de:** C · Task 2 (UI do Pacto).  
**Arquivos:** `db/migrate-2026-09-22-soul-recovery-codes.sql` · `api/_lib/soul-recovery-code.js` · `api/auth.js` · `api/_lib/auth-rate.js` · `api/_lib/admin-audit.js` · `js/api.js` · `js/souls.js` · `pages/auth.html` · `js/auth.js` · `tests/ops-task3-soul-recovery-smoke.mjs`.

### 3.1 Schema

Tabela `soul_recovery_codes` — [x] migration aplicada via `db:migrate`.

### 3.2 Actions

| Action | Status |
| --- | --- |
| `adminIssueSoulRecoveryCode` | [x] |
| `consumeSoulRecoveryCode` | [x] |

### 3.3 Espelho da Alma (`souls.js`)

1. [x] **Emitir Código de Recuperação**
2. [x] **Palavra temporária** mantida
3. [x] Copy de sala

### 3.4 Pacto (`auth.html`)

1. [x] **O Mestre me deu um código**
2. [x] username · código · Nova Palavra · confirmar
3. [x] flash “Palavra renovada — entre no Domínio.”

### Aceite Task 3

- [x] Admin emite código no Espelho; plaintext visível uma vez.
- [x] Aluno consome no Pacto → nova senha; código uso único (contrato).
- [x] Código expirado / errado → erro genérico.
- [x] Audit registra emissão (sem plaintext).
- [x] Smoke `ops-task3-soul-recovery-smoke.mjs` verde.

---



## Task 4 — Limpeza, docs e regressão

> **Estado:** feito (2026-09-22).

**Depende de:** Tasks 1–3.

1. [x] README: e-mail opcional, playbook de sala, dois caminhos de recuperação, Caronte legado.
2. [x] Emenda em [`plano-ops-nav-email-perf-admin.md`](./plano-ops-nav-email-perf-admin.md) (B/C superseded).
3. [x] Caronte escondido atrás de **Alma antiga (Senha do Caronte)** / botão Painel legado.
4. [x] Smokes de regressão verdes.
5. [x] Playbook de sala (3 linhas) no README.

### Aceite Task 4

- [x] Docs alinhados ao comportamento real.
- [x] Nenhum teste exige hard-gate ou e-mail obrigatório no register.
- [x] Mestre recupera aluno sem e-mail via Código no Espelho (&lt; 1 min na sala).

---



## Riscos e mitigação


| Risco                              | Mitigação                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| SMTP Gmail rejeita / marca spam    | Remetente estável; pedir alunos olharem spam; médio prazo: domínio + Resend         |
| Aluno compartilha código do Mestre | TTL 24h + uso único + rate limit                                                    |
| Admin esquece de copiar o código   | Modal bloqueante + botão copiar; não há “reexibir” — só emitir de novo              |
| Regressão: turma já selada         | Fluxo por e-mail permanece; Task 2 não apaga selos existentes                       |
| Preview Vercel sem `APP_BASE_URL`  | Documentar; Production tem fallback hardcoded — não testar Mensageiro só em Preview |


---



## Fora de escopo (explícito)

- Obrigar e-mail de novo.
- Notificações em massa (avisos de aula por e-mail).
- Magic link de login.
- Recuperação por SMS / WhatsApp.
- Self-service de código sem o Mestre.

---



## Critério de pronto (ciclo inteiro)

1. [x] Aluno **sem** e-mail firma o Pacto e usa o Domínio.
2. [x] Aluno **com** e-mail: Painel honesto se o Mensageiro falhar; checklist ops no README.
3. [x] Aluno perde a senha → Mestre emite **Código de Recuperação da Alma** → Nova Palavra **sem** e-mail.
4. [x] Hard-gate do Mensageiro desligado.
5. [x] Docs + smokes refletem o contrato novo.

---

## Ordem de execução (histórico)

1. Task 0 decisões.
2. Task 1 Mensageiro (código + checklist ops).
3. Task 2 e-mail opcional + hard-gate off.
4. Task 3 código por aluno.
5. Task 4 docs / Caronte legado / regressão. **← atual**

