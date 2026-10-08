# Playbook — Liberar Aula 07 + aula ao vivo

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

> **Aula:** Papéis, Workflow e Versionamento Visual · Módulo 2 · Godot 4 (Labirinto de Moedas 2D — individual ou dupla + coleta)  
> **Plano:** [`plano-aula7-papeis-workflow-versionamento.md`](./plano-aula7-papeis-workflow-versionamento.md)  
> **Ritmo:** **2 encontros** (~240 min parede · ~200 min prática) — espelho da Aula 06

---

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. No **Módulo 2**, na Aula 07, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula7.published = false` em `api/_lib/progress/shared.js`.

Pré-requisito curricular: aluno com `aula6` concluída (`LESSON_PREREQUISITES.aula7 → aula6`).

O gate permanece aberto nos **dois** encontros (mesmo `aula7` — não há `aula7b`).

---

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula7`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula7`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula7` → conquista `aula7_concluida` (**Cartógrafo da Dupla**).

Mock local (só store): `EQUIPE2026` — não substitui o código gerado em produção.

Finalize + Altar no **fim do Encontro 2** (o diário pode rascunhar no E1 via autosave).

---

## 3. Roteiro — 2 encontros

### Encontro 1 (~120 min)

| Min | Bloco | Ação do Mestre |
| ---: | :--- | :--- |
| **0–40** | Fundamentos | Telão em `pages/aula7.html` (aba Fundamentos) **ou** slides. Cobrir cinco ofícios (entregável + falha), workflow entra/sai, Scope Creep no Labirinto, versionamento visual, mapa estúdio→sala (dupla ou solo). |
| **40–55** | Convite / solo | Oficina: default **solo**; quem quiser convida colega da turma (polling). Ofícios: Arte da moeda × Programação da coleta. Sem equipes de 3. |
| **55–120** | Arte LibreSprite | Sprite da moeda + export PNG. **Sem Godot sync / Drive.** Diário: seções 1–2 (autosave). |

### Encontro 2 (~120 min)

| Min | Bloco | Ação do Mestre |
| ---: | :--- | :--- |
| **0–10** | Checkpoint | Scope Creep no telão — reforçar cercado (loja Aula 06 fora). |
| **10–100** | Godot local | Pastas · importar PNG · `moeda.tscn` · Player + coleta (~80–90 min). Sem pasta sync. |
| **100–115** | Diário + finalize | Seções 3–4 · cada aluno **Finalizar aula (meu envio)**. |
| **115–120** | Demo + Altar | 1 solo/dupla no telão · lembrar código do Altar. |

**Buffer:** se a teoria atrasar, proteger pastas + coleta; encurtar demo.

---

## 4. Dicas de sala

| Problema | O que dizer / fazer |
| :--- | :--- |
| “Vamos pôr a loja / boss / online” | Scope Creep — diário, seção cercado |
| Querem formar trio | Formato = **1 ou 2**; terceiro faz solo ou outra dupla |
| Os dois clicaram o mesmo ofício | Pedir o outro chapéu; último save de papel vale |
| Dois na mesma `.tscn` no Drive | Parar; um dono por cena; ZIP se corrompeu |
| Conflito em `.godot/` | Apagar `.godot` local e reabrir |
| Projeto no Drive / pasta sync | **Proibido nesta aula** — só projeto local no Godot |
| Diário “sumiu” / conflito | LWW: aviso “parceiro atualizou — recarregamos” |
| Alguém exige Git | Teaser: “existe Git; hoje é pasta local + nomes” |
| Coleta não dispara | `Area2D`, layers, sinal `body_entered` |

**Projeto canônico (local):** `LabirintoDeMoedas`  
**Cenas:** `cenas/player.tscn` · `cenas/moeda.tscn` · `cenas/cenario.tscn` (stub)  
**Arte E1:** LibreSprite → PNG em `sprites/` no E2

---

## 5. Material de apoio

- README oficina: [`assets/docs/aulas/aula07-equipe-labirinto/README.md`](../assets/docs/aulas/aula07-equipe-labirinto/README.md) (código no passo a passo · reusa `player.gd` da Aula 02)
- Script-espelho (opcional): [`moeda-exemplo.gd`](../assets/docs/aulas/aula07-equipe-labirinto/moeda-exemplo.gd)
- Quadro: [`quadro-atribuicao.md`](../assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md)
- Árvore: [`estrutura-pastas.txt`](../assets/docs/aulas/aula07-equipe-labirinto/estrutura-pastas.txt)
- Slides: `aula07_papeis_workflow_slides.{pptx,pdf}` (`python scripts/build-aula07-slides.py`)
- Página: [`pages/aula7.html`](../pages/aula7.html) — Fundamentos · Oficina · Slides
- Migration: `db/migrate-2026-10-05-lesson-duos.sql` (`lesson_duos` + `lesson_journals`)

---

## 6. QA pós-liberação (manual)

### Página / entrega

- [ ] Aluno abre `pages/aula7.html` e vê Fundamentos + Oficina + Slides.
- [ ] Solo default; convite da turma ecoa em ~5–8 s (dois browsers).
- [ ] Diário compartilhado ecoa; autosave; LWW com aviso.
- [ ] Solo finaliza sem parceiro; cada um da dupla finaliza o próprio envio.
- [ ] Secretas disparam no texto do diário + discovery.
- [ ] Admin vê `#gdd-example`; aluno não.
- [ ] Atividade no Grimório Pessoal (privada).

### Godot (amostra)

- [ ] Sprite + `moeda.tscn` + Player + coleta mínima.
- [ ] ≥3 itens fora do escopo no diário.
- [ ] Nomes canônicos + pasta/ZIP.

### Redeem / Trilha

- [ ] Gate `published: true` nos dois encontros.
- [ ] Redeem: XP 30 + `aula7_concluida` (**Cartógrafo da Dupla**).
- [ ] Aluno sem `aula6` não resgata.

---

## 7. Smoke automatizado (pré-turma)

```bash
node tests/aula7-qa-smoke.mjs
node tests/aula7-duo-smoke.mjs
node tests/aula7-secretas-volateis-smoke.mjs
```

Ou o pacote completo: `npm run check`.
