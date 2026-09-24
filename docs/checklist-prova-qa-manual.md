# Checklist QA manual — Prova Módulo 1

Task E3 · [`plano-prova-modulo1-online.md`](./plano-prova-modulo1-online.md) · playbook [`playbook-liberar-prova-modulo1.md`](./playbook-liberar-prova-modulo1.md)

Use em **staging** (ou local com DB real). Marque cada item após validar.

Smoke automatizado (opcional, precisa servidor + credenciais):

```bash
npm run smoke:prova
# ou
node scripts/smoke-prova.mjs --reset --turma TCG01
# expiração rápida (staging):
node scripts/smoke-prova.mjs --reset --duration 2 --turma TCG01
```

Credenciais: `PROVA_SMOKE_ADMIN_*` + `PROVA_SMOKE_STUDENT_*` (ver cabeçalho do script).  
`--reset` / `--duration` exigem `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

---

## Preparação

- [ ] Migration `db/migrate-2026-09-24-prova-modulo1.sql` aplicada
- [ ] Migration `db/migrate-2026-09-24-prova-contestacao.sql` aplicada
- [ ] Prova nasce **fechada** (`is_open=false`, `open_turmas={}`)
- [ ] Conta **admin** + 1 aluno **TCG01** + 1 aluno **TCG02** (sem tentativa prévia, ou use `--reset`)
- [ ] Em staging, se for testar timer: `duration_minutes = 2` no exame `modulo1-provacao` (SQL ou `--duration 2`)

```sql
-- só staging / QA
UPDATE prova_exams
SET duration_minutes = 2, updated_at = now()
WHERE id = 'modulo1-provacao';
-- depois do teste, voltar para 90
```

---

## A) Duas turmas (gate 1×)

- [ ] Painel: liberar **só TCG01** → aluno TCG01 inicia; aluno TCG02 **não** inicia
- [ ] Fechar / liberar **só TCG02** → TCG02 inicia; TCG01 com tentativa já feita vê done/bloqueio (1 tentativa)
- [ ] Com gate fechado, ninguém inicia prova nova

## B) Fluxo feliz (aluno + mestre)

- [ ] Intro → **Iniciar prova** → timer aparece e conta
- [ ] Responder MC (rádio) + discursiva (textarea) no celular ou janela estreita
- [ ] Autosave: mudar de questão e voltar — resposta ainda lá
- [ ] **Enviar prova** → confirm lista questões em branco → enviado → “Aguardando correção”
- [ ] Hub admin: abrir tentativa → notar discursivas → **Fechar nota**
- [ ] Aluno: nota X/20 + breakdown MC/escritas + gabarito/comentários
- [ ] Aluno: **Contestar** com texto → status “aguardando resposta”
- [ ] Admin: badge **contesta** → **Responder** (aluno vê a resposta) **ou** **Reabrir** → ajustar → fechar de novo
- [ ] Admin: **Resetar prova** → confirma → aluno some da lista e consegue **Iniciar prova** de novo

## C) Blur / saída (integridade)

- [ ] Durante a prova, mudar de aba 1× → dialog “você saiu” + banner
- [ ] Hub admin: timeline mostra `tab_blur` (e contagem de blur)
- [ ] Fechar a aba / ir ao Painel por outra via e reabrir `/pages/prova.html` → retoma a mesma questão
- [ ] Tempo **não pausa** ao sair (comparar timer antes/depois de ~30s fora)

## D) F5 / refresh

- [ ] No meio da prova, F5 → continua `in_progress`, mesma questão, respostas salvas
- [ ] Timer permanece coerente com `ends_at` (não “reinicia” 90 min)

## E) Expiração forçada (2 min em staging)

- [ ] `duration_minutes = 2`, iniciar prova, **não** enviar
- [ ] Esperar esgotar → dialog “Tempo esgotado” → status `timed_out` / aguardando correção
- [ ] Admin consegue notar e **Fechar nota** mesmo com timed_out
- [ ] Restaurar `duration_minutes = 90` após o teste

## F) Regressões rápidas

- [ ] Gabarito **não** aparece no HTML/JS do aluno (DevTools → Network `/api/prova`)
- [ ] Segunda tentativa do mesmo aluno → 409 / mensagem clara
- [ ] Mobile: radios e textarea usáveis; timer legível; pinch-zoom funciona

---

## Depois do QA

- [ ] Gate **fechado**
- [ ] `duration_minutes` de volta a **90** em staging
- [ ] Anotar bugs / print no issue ou no plano (Fase E4)
