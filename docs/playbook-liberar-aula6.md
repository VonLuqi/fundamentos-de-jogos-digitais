# Playbook — Liberar Aula 06 + aula ao vivo (Task 6)

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

> **Aula:** Mercado, PI e Monetização Ética · Módulo 2 · Godot 4 (loja cosmética ética)  
> **Plano:** [`plano-aula6-mercado-loja-etica.md`](./plano-aula6-mercado-loja-etica.md)

---

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. No **Módulo 2**, na Aula 06, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível (não só “em breve”).

Default no código: `LESSON_GATES.aula6.published = false` em `api/_lib/progress/shared.js`.

Pré-requisito curricular: aluno com `aula5` concluída (`LESSON_PREREQUISITES.aula6 → aula5`).

A Provação do Módulo 1 **não** bloqueia a Trilha automaticamente na v1.

---

## 2. Gerar código de oferenda

1. No **Painel do Herói** (ferramentas admin), gere código para `aula6`.
2. TTL: **20 minutos**, multi-aluno (cada aluno resgata uma vez).
3. XP da linha: **30** (`LESSON_CATALOG.aula6`).
4. Ao resgatar no Altar: `completed_lessons` inclui `aula6` → conquista `aula6_concluida` (**Guardião da Loja Ética**).

Mock local (só store): `LOJAETICA2026` — não substitui o código gerado em produção.

---

## 3. Roteiro do dia (120 min)

| Min | Bloco | Ação do Mestre |
| ---: | :--- | :--- |
| **0–20** | Fundamentos | Telão em `pages/aula6.html` (aba Fundamentos) **ou** slides PPTX/PDF. Cobrir mercado BR/internacional, Original IP vs serviços, monetização ética, loot box ↔ ClassInd 18+. |
| **20–28** | Setup Godot | Abrir projeto Aulas 02–04 · pasta `ui/` · New Scene → **Control** → raiz `Loja` · salvar `ui/loja.tscn` · Full Rect. Checkpoint 0. |
| **28–48** | Árvore + layout | Montar hierarquia canônica (PanelContainer / Labels / Buttons). Textos dos itens. Âncoras / min size. Checkpoint 1–2 com **F6**. |
| **48–73** | Script + sinais | Attach `ui/loja.gd` · vars/const/@onready · **Forma A** (aba Node → `pressed`) · coletar moeda (+5). Checkpoint 3: HUD sobe. |
| **73–93** | Regras éticas | Compra chapéu (depois capa/aura) · bloqueio sem saldo · já possui · **proibir** `randi()` / loot. Checkpoint 4. |
| **93–115** | Play + anotações | Fluxo feliz · template de anotações · síntese mercado↔ética↔loja · **Finalizar aula**. |
| **115–120** | Fechamento | 1 aluno demonstra a loja no telão; lembrar **Altar** com o código. |

**Buffer:** se a turma atrasar na árvore, encurtar layout e proteger script + regras éticas.

---

## 4. Dicas de sala (Godot)

| Problema | O que dizer / fazer |
| :--- | :--- |
| F5 abre o Player, não a loja | Usar **F6** (Play This Scene) em `loja.tscn` |
| Erro de caminho `$…` / nó null | Conferir nomes (maiúsculas); botão direito → **Copy Node Path**; sem `Margem` → tirar `/Margem` do caminho |
| Clique não faz nada | Aba **Node** → `pressed` → Connect no nó `Loja` |
| Raiz é `Node2D` | Nova cena `Control`; loja é UI, não mundo 2D |
| Texto minúsculo (viewport Aula 04) | Aumentar font size nos Labels — ok pedagogicamente |
| Quer fazer loot box “de brincadeira” | Redirecionar: preço fixo determinístico — ementa + ClassInd |
| Projeto antigo quebrado | Plano B: projeto novo vazio só com `ui/loja.tscn` |

**Nomes canônicos (contrato):** `Loja`, `PainelFundo`, `Margem`, `VBoxPrincipal`, `LabelMoedas`, `BtnComprarChapeu` / `Capa` / `Aura`, `BtnGanharMoeda`, `LabelStatus`.

**Economia:** saldo inicial **10** · coletar **+5** · Chapéu **5** · Capa **12** · Aura **20**.

---

## 5. Material de apoio

- README oficina: [`assets/docs/aulas/aula06-loja-etica/README.md`](../assets/docs/aulas/aula06-loja-etica/README.md)
- Script-espelho: [`loja-exemplo.gd`](../assets/docs/aulas/aula06-loja-etica/loja-exemplo.gd) (rede de segurança — preferir construir por etapas)
- Slides: `aula06_mercado_loja_etica_slides.{pptx,pdf}` (aba Slides; regenerar com `python scripts/build-aula06-slides.py`)
- Página: [`pages/aula6.html`](../pages/aula6.html) — Fundamentos · Oficina · Slides

Lembre a turma: cosmético com moedas ganhas jogando; **sem** dinheiro real; **sem** sorte na compra.

---

## 6. QA pós-liberação (manual)

### Página / entrega

- [ ] Aluno abre `pages/aula6.html` e vê Fundamentos + Oficina da Loja + Slides (sem stub).
- [ ] CTA do README + download `loja-exemplo.gd` funcionam.
- [ ] Slides: download PPTX/PDF; em localhost use o painel de fallback.
- [ ] Anotações + síntese obrigatórias; **Finalizar aula** grava via `saveLessonParagraph`.
- [ ] Envio dispara secretas (Mercador do Styx / Balcão sem Azar / Tempo Respeitado) + discovery.
- [ ] Admin vê `#gdd-example`; aluno não.
- [ ] Atividade aparece no Grimório Pessoal (privada).

### Godot (amostra de 1–2 alunos)

- [ ] Checkpoint 0–4 ok (ou próximo: árvore + coleta + 1 compra).
- [ ] Sem `randi()` / loot na compra.
- [ ] F6 demonstra saldo e status.

### Redeem / Trilha

- [ ] Gate `published: true` na turma.
- [ ] Redeem no Altar concede XP 30 + `aula6_concluida` (**Guardião da Loja Ética**).
- [ ] Álbum: pública após redeem; secretas só após unlock (`?` antes).
- [ ] Aluno sem `aula5` concluída não resgata (pré-requisito).

---

## 7. Smoke automatizado (pré-turma)

```bash
node tests/aula6-qa-smoke.mjs
node tests/aula6-secretas-volateis-smoke.mjs
```

Ou o pacote completo: `npm run check`.
