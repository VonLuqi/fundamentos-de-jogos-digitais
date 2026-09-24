# Playbook — Liberar Prova Módulo 1 (Provação do Círculo Mágico)

Operação do **Mestre** no dia da avaliação online. A prova **não** abre sozinha no deploy.

**Pré-requisitos (uma vez por ambiente):**

- Migration [`db/migrate-2026-09-24-prova-modulo1.sql`](../db/migrate-2026-09-24-prova-modulo1.sql) aplicada
- Migration de contestação [`db/migrate-2026-09-24-prova-contestacao.sql`](../db/migrate-2026-09-24-prova-contestacao.sql) aplicada
- Seed do exame `modulo1-provacao` (incluído na migration): `is_open=false`, `duration_minutes=90`
- Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (API usa service role)

**Docs:** plano [`plano-prova-modulo1-online.md`](./plano-prova-modulo1-online.md) · QA [`checklist-prova-qa-manual.md`](./checklist-prova-qa-manual.md) · conteúdo [`avaliacao-modulo1-provacao-circulo-magico.md`](./avaliacao-modulo1-provacao-circulo-magico.md)

---

## Fluxo em uma linha

```text
fechada → liberar TCG01 (ou TCG02) → alunos fazem (1×) → fechar / abrir a outra
  → corrigir discursivas no hub → Fechar nota → (opcional) fechar gate
```

---

## 1. Antes da aula

- [ ] Confirmar gate **fechado** no Painel (Ferramentas do Mestre → Prova Módulo 1) ou hub `pages/prova-admin.html`
- [ ] `duration_minutes = 90` (só use `2` em staging — ver checklist)
- [ ] Alunos com conta + turma correta (`TCG01` / `TCG02`)
- [ ] Telão / slide: lembrar **não sair da página**; tempo **não pausa**; **1 tentativa**

---

## 2. Liberar a primeira turma

1. Login **admin** → **Painel do Herói**.
2. Ferramentas do Mestre → **Prova Módulo 1** (modal do gate) **ou** hub admin.
3. Escolher **Liberar TCG01** (ou TCG02) — **só uma** por vez.
4. Alunos da turma liberada veem a **Provação** em **Aulas → Módulo 1** → [`pages/prova.html`](../pages/prova.html).
5. A outra turma continua **bloqueada**.

---

## 3. Durante a prova (90 min)

| Papel | O quê |
| --- | --- |
| Aluno | 1 questão por tela · autosave · **Enviar prova** no fim |
| Mestre | Hub: quem está `in_progress` / blur / saídas · **não** precisa notar ainda |

Se o aluno sair e voltar ao site, o sistema **manda de volta à prova** (mesma questão; timer segue).

---

## 4. Fechar turma / abrir a outra

1. No gate: **Fechar prova** (ninguém inicia tentativa nova).
2. Liberar a **outra** turma (`TCG02` se a primeira foi TCG01).
3. Tentativas já enviadas **não** são apagadas ao fechar o gate.

---

## 5. Corrigir e fechar notas

1. Abrir **Prova Módulo 1** no menu admin (`pages/prova-admin.html`).
2. Filtrar por turma / “Aguardando nota”.
3. Abrir tentativa → MC já tem gabarito (só admin) → notar discursivas (0–1) → **Salvar** → **Fechar nota**.
4. Aluno passa a ver **X/20**, gabarito MC e comentários; pode **contestar** se discordar.
5. Se houver contestação (badge **contesta** na lista): **Responder** (mantém a nota) ou **Reabrir correção** → ajustar pontos → **Fechar nota** de novo.
6. **Resetar prova** (no detalhe): apaga a tentativa por completo — o aluno pode fazer de novo (gate precisa estar aberto para a turma).

---

## 6. Encerrar

- [ ] Gate **fechado** de novo
- [ ] Todas as tentativas relevantes com status `graded` (ou combinado com a turma)
- [ ] Se usou `duration_minutes = 2` em staging: voltar para **90**

---

## Atalhos

| Onde | URL / ação |
| --- | --- |
| Aluno | **Aulas → Módulo 1 → Provação** → `pages/prova.html` |
| Gate | Painel → Ferramentas do Mestre → Prova Módulo 1 |
| Correção | `pages/prova-admin.html` |
| Smoke vivo | `npm run smoke:prova` (credenciais `PROVA_SMOKE_*`) |

---

## Regras que não mudam (v1)

- **1 turma** liberada por vez
- **1 tentativa** por aluno (`exam_id` + `user_id`)
- Discursivas **manuais**; nota final só após **Fechar nota**
- Após fechar, aluno pode **contestar**; Mestre responde ou reabre
- Cronômetro **não pausa** ao sair da aba
