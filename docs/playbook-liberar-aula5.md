# Playbook — Liberar Aula 05 + aula ao vivo (Task 9)

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

Pré-requisitos de infra (uma vez por ambiente):

- Migration [`db/migrate-2026-09-21-classind-dle.sql`](../db/migrate-2026-09-21-classind-dle.sql) rodada no Supabase.
- Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (ver [`nota-deploy-classind-dle.md`](./nota-deploy-classind-dle.md)).

---

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. Na Aula 05, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula5.published = false` em `api/progress.js`.

Pré-requisito curricular: aluno com `aula4` concluída (`LESSON_PREREQUISITES.aula5 → aula4`).

---

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula5`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula5`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula5` → conquista `aula5_concluida` (**Guardião da Faixa**).

Mock local (só store): `CLASSIND2026` — não substitui o código gerado em produção.

---

## 3. Roteiro do dia (120 min)

| Min | Bloco | Ação do Mestre |
| --- | --- | --- |
| **0–20** | Fundamentos | Telão em `pages/aula5.html` (aba Fundamentos) **ou** slides PPTX/PDF. Cobrir ClassInd, faixas, eixos + atenuantes/agravantes, IARC. |
| **20–25** | Setup dle | Abrir `pages/classind-dle.html` → **criar sala** → código gigante no telão. Alunos entram pelo CTA da Oficina. |
| **25–65** | Higher/Lower | ≥6 rodadas: start → voto (só alunos) → placar → **revelar** → discutir descritores → next. Pedir 1 insight no wizard. |
| **65–115** | Adequação reversa | Grupos + wizard IARC (desafio procedural ou preset); mirar **Livre** ou **10**; **Finalizar aula** grava o Patch Note. |
| **115–120** | Fechamento | 1 grupo apresenta Patch Note; lembrar **Altar** com o código. |

Sem Godot nesta aula — a oficina é o site. **Não há** textareas de anotações/síntese nem bloco “Material da atividade” na página.

---

## 4. Operação ClassInd-dle (checklist de sala)

### Antes

- [ ] Login admin no Chrome/telão; aluno de teste no celular (ou 2º browser).
- [ ] Confirmar Realtime: após `createRoom` / `joinRoom`, placar atualiza sem F5 (&lt; ~1 s). Se canal cair, poll ~4 s é fallback.
- [ ] Deck `aula5-v1` carregado (capas em `assets/classind-dle/covers/` · inventário em `INVENTARIO.md`).

### Durante

- [ ] Só **admin** revela, avança rodada e **encerra sala** (confirm no botão perigo).
- [ ] **Admin não vota** — quorum conta só alunos (`eligibleVoters`).
- [ ] Snapshot pré-reveal **sem** faixas/secrets.
- [ ] Dois alunos votando lados opostos → tallies A/B coerentes.
- [ ] **Próxima comparação** limpa votos; aluno consegue votar de novo na 2ª+ rodada.
- [ ] Aluno vê chip **Acertos: X/Y** após reveals.
- [ ] Roster admin mostra presença; aluno vê contagens + “você já votou”.

### Fim do deck (desempenho → ranking → fechar)

- [ ] Após a última “Próxima comparação”, phase `results` (não lobby “aguarde comparação”).
- [ ] Aluno vê **Seu desempenho** (acertos + lista certo/errado).
- [ ] Mestre vê **Desempenho da turma** (todos os alunos) → **Ver ranking**.
- [ ] Ranking ordenado por acertos para todos.
- [ ] Mestre **Encerrar sala** após o ranking (alunos voltam / trocam de sala).
- [ ] Migration `db/migrate-2026-09-21-classind-dle-results-ranking.sql` aplicada no Supabase (phases `results`/`ranking`).
- [ ] **QA 2 browsers (Realtime live):** mestre + aluno — placar do aluno bate com o ranking do mestre (mesmo X/Y); ranking do aluno não fica vazio; ao Encerrar, aluno volta ao gate (sem “Quem está na sala”).

### Se algo falhar

1. Pedir F5 / reentrar com o código.  
2. Verificar `SUPABASE_ANON_KEY` no deploy.  
3. Confirmar publication `classind_live_snapshots` no Supabase.  
4. **Encerrar sala** (`closeRoom`) e criar outra se estado corromper.  
5. Se `nextRound` falhar no fim do deck com erro de CHECK em `phase`, rode a migration de results/ranking.

---

## 5. Material de apoio (Mestre — fora da página)

A Oficina não linka mais README/faixas/capas. Use estes arquivos no telão ou antes da turma:

- README: [`assets/docs/aulas/aula05-classind/README.md`](../assets/docs/aulas/aula05-classind/README.md)
- Tabela de faixas: [`faixas-classind.md`](../assets/docs/aulas/aula05-classind/faixas-classind.md)
- Slides: `aula05_classind_iarc_slides.{pptx,pdf}` (aba Slides; regenerar com `python scripts/build-aula05-slides.py` — precisa Pillow para capas WebP)
- Capas / gaps: [`assets/classind-dle/covers/INVENTARIO.md`](../assets/classind-dle/covers/INVENTARIO.md)
- Pitches: **Novo desafio** (procedural) ou presets Necrópole Viral · Sombra do Contrato · App de Destinos · Porão das Horas

Lembre a turma: higienizar é mudar **feedback** (visual/narrativa/cura/inimigos), não apagar o loop-core. Entrega = **Finalizar aula** no wizard (sem anotações manuais).

---

## 6. QA pós-liberação (manual — pós-correções UX)

### Página / entrega

- [ ] Aluno abre `pages/aula5.html` e vê Fundamentos + Oficina + Slides (sem stub).
- [ ] **Sem** bloco “Material da atividade” e **sem** textareas de anotações/síntese.
- [ ] Slides: download PPTX/PDF; em localhost use o painel de fallback; capas do dle nas slides de prática.
- [ ] Wizard: **Novo desafio** gera pitch procedural; presets opcionais; gera Patch Note.
- [ ] **Finalizar aula** grava markdown via `saveLessonParagraph` (secretas de conteúdo no mesmo save).
- [ ] Envio dispara secretas de conteúdo (Oráculo do ClassInd / Selo da Faixa-Alvo / Balança da Faixa) + discovery.
- [ ] ClassInd-dle até o desempenho (aluno votou ≥1 vez) concede **Júri do Telão**; Encerrar sala também cobre quem já saiu.
- [ ] Admin vê `#gdd-example`; aluno não.
- [ ] Atividade aparece no Grimório Pessoal (privada).

### Live (dois dispositivos)

- [ ] Chrome (Mestre / telão) + celular (aluno).
- [ ] Create → join → vote → reveal → next → **Encerrar sala** (confirm).
- [ ] Admin **não** consegue votar (403 / UI sem botões de voto).
- [ ] 2 alunos votando lados opostos; tallies A/B corretos; quorum ignora admin.
- [ ] Reveal só admin; snapshot pré-reveal sem faixas/secrets.
- [ ] Next round limpa votos; **2ª comparação** permite novo voto.
- [ ] Placar pessoal **Acertos: X/Y** atualiza após reveal.
- [ ] **Realtime:** voto em um client atualiza placar nos outros sem F5 (&lt; ~1 s).
- [ ] Fallback: com canal derrubado (DevTools / offline curto), poll recupera estado.
- [ ] Lab cheio (~20+): push sem queda perceptível (se travar, fechar sala e recriar).

### Redeem / Trilha

- [ ] Gate `published: true` na turma.
- [ ] Redeem no Altar concede XP 30 + `aula5_concluida` (**Guardião da Faixa**).
- [ ] Álbum: pública após redeem; secretas só após unlock (`?` antes).

---

## 7. Smoke automatizado (pré-turma)

```bash
node tests/aula5-qa-smoke.mjs
node tests/aula5-iarc-smoke.mjs
node tests/aula5-secretas-volateis-smoke.mjs
node tests/classind-api-smoke.mjs
node tests/classind-dle-pages-smoke.mjs
node tests/classind-schema-smoke.mjs
```

Ou o pacote completo: `npm run check`.
