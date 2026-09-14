# Playbook — Liberar Aula 03 (Task 9)

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. Na Aula 03, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula3.published = false` em `api/progress.js`.

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula3`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula3`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula3` → conquista `aula3_concluida` (**Máscara do Homo Ludens**).

## 3. Material da oficina (antes / durante a aula)

- Confirme que o ZIP e o README estão em `assets/docs/aulas/aula03-pixel-hero/`.
- CTAs na Oficina: baixar Tiny Hero + abrir guia.
- Lembre a turma: continuar o projeto da Aula 02; respeitar `LICENCA.md` / `license.txt` da CraftPix.

## 4. QA pós-liberação (manual rápido)

- [ ] Aluno abre `pages/aula3.html` e vê Homo Ludens + Oficina do Pixel (sem stub “Forja em andamento”).
- [ ] Download do ZIP Tiny Hero e README funcionam.
- [ ] Slides: download PPTX/PDF; em localhost use o painel de fallback.
- [ ] Envio de anotações dispara secretas (Voz do Homo Ludens / Artesão do Pixel / Identidade Lúdica) + toast.
- [ ] Redeem no Altar concede XP 30 + `aula3_concluida`.
- [ ] Álbum: pública aparece; secretas só após unlock (`?` antes).
- [ ] Admin vê `#gdd-example`; aluno não.
- [ ] Atividade aparece no Grimório Pessoal como nota de atividade (privada).

## 5. Smoke automatizado (pré-turma)

```bash
node tests/aula3-qa-smoke.mjs
node tests/aula3-secretas-volateis-smoke.mjs
```

Ou o pacote completo: `npm run check`.
