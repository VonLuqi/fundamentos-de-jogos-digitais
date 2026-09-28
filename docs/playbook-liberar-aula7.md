# Playbook — Liberar Aula 07 + aula ao vivo (Task 6)

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

> **Aula:** Papéis, Workflow e Versionamento Visual · Módulo 2 · Godot 4 (kickoff Labirinto de Moedas 2D)  
> **Plano:** [`plano-aula7-papeis-workflow-versionamento.md`](./plano-aula7-papeis-workflow-versionamento.md)

---

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. No **Módulo 2**, na Aula 07, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula7.published = false` em `api/_lib/progress/shared.js`.

Pré-requisito curricular: aluno com `aula6` concluída (`LESSON_PREREQUISITES.aula7 → aula6`).

A Provação do Módulo 1 **não** bloqueia a Trilha automaticamente na v1.

---

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula7`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula7`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula7` → conquista `aula7_concluida` (**Cartógrafo da Equipe**).

Mock local (só store): `EQUIPE2026` — não substitui o código gerado em produção.

---

## 3. Roteiro do dia (120 min)

| Min | Bloco | Ação do Mestre |
| ---: | :--- | :--- |
| **0–20** | Fundamentos | Telão em `pages/aula7.html` (aba Fundamentos) **ou** slides PPTX/PDF. Cobrir cinco ofícios, workflow em etapas, Scope Creep, cercado do Labirinto (loja Aula 06 **fora**). |
| **20–30** | Formação | Anunciar **lista oficial** de equipes (3 fixos). Ímpar: dupla + produtor itinerante **ou** grupo de 4 com 2 na arte. Cada trio escolhe **produtor do dia** + nome da equipe. Checkpoint 0. |
| **30–50** | Quadro | Abrir [`quadro-atribuicao.md`](../assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md). Preencher cenário · moedas · player + ≥3 itens **fora do escopo**. Checkpoint 1. |
| **50–65** | Cronograma | 3–5 tarefas com dono (stubs = Aula 07; movimento/coleta = 08+). Checkpoint 2. |
| **65–90** | Pastas Godot | **New Project** `LabirintoDeMoedas` · pastas canônicas · cada um cria **só** a cena do seu papel (raízes: `CharacterBody2D` / `Area2D` / `Node2D`). **Sem** movimento/coleta. Checkpoint 3. |
| **90–105** | Pasta sync | Pasta `LabirintoDeMoedas_<NomeEquipe>` · regras anti-sobrescrita · ZIP datado. Checkpoint 4. |
| **105–120** | Envio + fechamento | Anotações individuais · síntese · **Finalizar aula**. 1 equipe mostra o quadro no telão; lembrar **Altar**. |

**Buffer:** se a formação atrasar, encurtar cronograma (3 linhas) e proteger quadro + pastas + sync.

---

## 4. Dicas de sala

| Problema | O que dizer / fazer |
| :--- | :--- |
| “Vamos pôr a loja da Aula 06 agora” | Scope Creep — anotar em **FORA DO ESCOPO**; loja fica no projeto antigo |
| Quer programar movimento “só um pouco” | Stubs bastam hoje; movimento = Aula 08+ |
| Dois alunos na mesma `.tscn` no Drive | Parar; um dono por cena; restaurar do ZIP se corrompeu |
| Conflito / lixo em `.godot/` | Apagar `.godot` local e reabrir o projeto |
| Projeto criado direto no Drive e trava | Trabalhar **local** → copiar pasta ou ZIP para o sync |
| Turma ímpar / falta aluno | Dupla + produtor itinerante; ou 4 com 2 na arte |
| Alguém exige Git | Teaser só: “existe Git; hoje a prática é pasta + convenções” |
| Cena salva na raiz com nome errado | Mover/renomear para `cenas/player.tscn` (etc.) — nomes são contrato |
| Continuar o projeto das Aulas 02–06 | Preferir projeto **novo** `LabirintoDeMoedas` (Task 0) |

**Projeto canônico:** `LabirintoDeMoedas`  
**Cenas:** `cenas/player.tscn` · `cenas/moeda.tscn` · `cenas/cenario.tscn`  
**Pasta sync:** `LabirintoDeMoedas_<NomeEquipe>`  
**Backup:** `backup_AAAA-MM-DD_HHMM.zip`

---

## 5. Material de apoio

- README oficina: [`assets/docs/aulas/aula07-equipe-labirinto/README.md`](../assets/docs/aulas/aula07-equipe-labirinto/README.md)
- Quadro: [`quadro-atribuicao.md`](../assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md)
- Árvore: [`estrutura-pastas.txt`](../assets/docs/aulas/aula07-equipe-labirinto/estrutura-pastas.txt)
- Slides: `aula07_papeis_workflow_slides.{pptx,pdf}` (aba Slides; regenerar com `python scripts/build-aula07-slides.py`)
- Página: [`pages/aula7.html`](../pages/aula7.html) — Fundamentos · Oficina da Equipe · Slides

Lembre a turma: **Labirinto jogável completo** e **loja integrada** ficam fora desta aula.

---

## 6. QA pós-liberação (manual)

### Página / entrega

- [ ] Aluno abre `pages/aula7.html` e vê Fundamentos + Oficina da Equipe + Slides (sem stub).
- [ ] CTAs do README + quadro + `estrutura-pastas.txt` funcionam.
- [ ] Slides: download PPTX/PDF; em localhost use o painel de fallback.
- [ ] Anotações + síntese obrigatórias; **Finalizar aula** grava via `saveLessonParagraph`.
- [ ] Envio dispara secretas (Cinco Ofícios / Cercado do Escopo / Pasta Sagrada) + discovery.
- [ ] Admin vê `#gdd-example`; aluno não.
- [ ] Atividade aparece no Grimório Pessoal (privada).

### Equipe / Godot (amostra de 1–2 trios)

- [ ] Checkpoint 0–4 ok (ou próximo: quadro completo + 3 stubs + pasta/ZIP).
- [ ] Lista “fora do escopo” com ≥3 itens (loja **não** no MVP).
- [ ] Nomes de pastas/cenas canônicos.

### Redeem / Trilha

- [ ] Gate `published: true` na turma.
- [ ] Redeem no Altar concede XP 30 + `aula7_concluida` (**Cartógrafo da Equipe**).
- [ ] Álbum: pública após redeem; secretas só após unlock (`?` antes).
- [ ] Aluno sem `aula6` concluída não resgata (pré-requisito).

---

## 7. Smoke automatizado (pré-turma)

```bash
node tests/aula7-qa-smoke.mjs
node tests/aula7-secretas-volateis-smoke.mjs
```

Ou o pacote completo: `npm run check`.
