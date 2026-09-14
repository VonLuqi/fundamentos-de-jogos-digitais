# Playbook — Liberar Aula 04 (Task 9)

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. Na Aula 04, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula4.published = false` em `api/progress.js`.

Pré-requisito curricular: aluno com `aula3` concluída (`LESSON_PREREQUISITES.aula4 → aula3`).

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula4`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula4`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula4` → conquista `aula4_concluida` (**Guardião da Resolução**).

## 3. Material da oficina (antes / durante a aula)

- Confirme o README em `assets/docs/aulas/aula04-retro-viewport/README.md`.
- CTA na Oficina: abrir guia da estética retrô.
- Lembre a turma: continuar o projeto das Aulas 02–03; Viewport Width/Height ≠ Window Override; trio canônico `viewport` + `keep` + `integer`.

## 4. QA pós-liberação (manual rápido)

- [ ] Aluno abre `pages/aula4.html` e vê plataformas/restrições + Oficina Retrô (sem stub).
- [ ] Link do README da oficina funciona.
- [ ] Slides: download PPTX/PDF; em localhost use o painel de fallback.
- [ ] Envio de anotações dispara secretas (Arqueólogo de Hardware / Artesão da Viewport / Criatividade sob Limite) + toast.
- [ ] Redeem no Altar concede XP 30 + `aula4_concluida`.
- [ ] Álbum: pública aparece; secretas só após unlock (`?` antes).
- [ ] Admin vê `#gdd-example`; aluno não.
- [ ] Atividade aparece no Grimório Pessoal como nota de atividade (privada).

## 5. Smoke automatizado (pré-turma)

```bash
node tests/aula4-qa-smoke.mjs
node tests/aula4-secretas-volateis-smoke.mjs
```

Ou o pacote completo: `npm run check`.
