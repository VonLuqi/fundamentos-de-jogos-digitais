# Playbook — Liberar Aula 02 (Task 9)

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. Na Aula 02, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula2.published = false` em `api/progress.js`.

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula2`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula2`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula2` → conquista `aula2_concluida`.

## 3. QA pós-liberação (manual rápido)

- [ ] Aluno abre `pages/aula2.html` e vê glossário + oficina (sem Tambor).
- [ ] Slides: download PPTX/PDF; em localhost use o painel de fallback.
- [ ] Envio de anotações dispara secretas (Léxico / Arquiteto / Cartógrafo) + toast.
- [ ] Redeem no Altar concede XP 30 + `aula2_concluida`.
- [ ] Álbum: pública aparece; secretas só após unlock (`?` antes).
- [ ] Admin vê `#gdd-example`; aluno não.
