# Playbook — Liberar Aula 08 + aula ao vivo

Operação do **Mestre** na hora da turma. O merge **não** publica a aula.

> **Aula:** Perfis de Jogadores e o Modelo Quantic Foundry · Módulo 2 · Godot 4 (Labirinto direcionado — solo/dupla)  
> **Plano:** [`plano-aula8-perfis-quantic-foundry.md`](./plano-aula8-perfis-quantic-foundry.md)  
> **Ritmo:** **2 encontros** (~240 min parede · ~200 min prática)

---

## 1. Liberar na Trilha

1. Entre como admin.
2. Abra **Aulas** (`pages/aulas.html`).
3. No **Módulo 2**, na Aula 08, use o toggle **Liberar** (`setLessonGate` → `published: true`).
4. Alunos passam a ver a aula como disponível.

Default no código: `LESSON_GATES.aula8.published = false` em `api/_lib/progress/shared.js`.

Pré-requisito curricular: `aula7` concluída (documentado; redeem não bloqueia por prereq no código atual).

O gate permanece aberto nos **dois** encontros (mesmo `aula8` — não há `aula8b`).

---

## 2. Gerar código de oferenda

1. No **Painel do Herói**, gere código para `aula8`.
2. TTL: **20 minutos**, multi-aluno.
3. XP: **30** (`LESSON_CATALOG.aula8`).
4. Redeem → `aula8_concluida` (**Cartógrafo do Perfil**).

Mock local: `PERFIL2026`.

Finalize + Altar no **fim do Encontro 2**.

---

## 3. Roteiro — 2 encontros

### Encontro 1 (~120 min)

| Min | Bloco | Ação do Mestre |
| ---: | :--- | :--- |
| **0–25** | Fundamentos | Telão `pages/aula8.html` ou slides — Quantic Foundry, Destruição/Desafio × Descoberta |
| **25–40** | Convite / ofícios | Solo default; Design × Programação; escolher **uma** trilha |
| **40–65** | Design direcionado | Entregar **folha Fase 1** (1× aluno) · plataformas + moedas no papel |
| **65–115** | Godot | **Camera2D** no Player · montar o esboço (Conquista **ou** Ação) |
| **115–120** | Checkpoint | Folha ok · câmera segue · esqueleto |

### Encontro 2 (~120 min)

| Min | Bloco | Ação do Mestre |
| ---: | :--- | :--- |
| **0–10** | Checkpoint | Uma trilha só · cercado |
| **10–90** | Implementação | Scripts · playtest |
| **90–110** | Diário + finalize | Cada aluno finaliza |
| **110–120** | Demo + Altar | 1 solo/dupla · código |

---

## 4. Dicas de sala

| Problema | O que dizer |
| :--- | :--- |
| Querem as duas trilhas | Scope Creep — uma só |
| Querem loja / boss | Fora do escopo |
| Trio | Formato = 1 ou 2 |
| Coleta Aula 07 quebrou | Restaurar `moeda.gd` / grupo player antes da trilha nova |
| Plataforma móvel não anda | `AnimatableBody2D` + script · `_physics_process` · `pingpong` |
| Moeda sem brilho | Script de pulse · `_process` |
| Câmera não segue | `Camera2D` filha do Player · Enabled/Current · ou `make_current()` |

**Projeto:** continuar `LabirintoDeMoedas` (local).

---

## 5. Material

- README: [`assets/docs/aulas/aula08-perfil-quantic/README.md`](../assets/docs/aulas/aula08-perfil-quantic/README.md)
- Folha Fase 1 (imprimir): [`folha-fase1.pdf`](../assets/docs/aulas/aula08-perfil-quantic/folha-fase1.pdf) · `python scripts/build-aula08-folha-fase1-pdf.py`
- Scripts: `camera-player-exemplo.gd` · `moeda-brilhante-exemplo.gd` · `plataforma-exemplo.gd`
- Slides: `aula08_quantic_foundry_slides.{pptx,pdf}` (`python scripts/build-aula08-slides.py`)
- Página: [`pages/aula8.html`](../pages/aula8.html)

---

## 6. QA pós-liberação

- [ ] Oficina: duo + diário + blocos Copiar código (Conquista + Ação)
- [ ] Finalize individual; secretas no texto
- [ ] Redeem XP 30 + `aula8_concluida`
- [ ] Gate `published: true` só na turma

---

## 7. Smoke

```bash
node tests/aula8-qa-smoke.mjs
node tests/aula8-duo-smoke.mjs
node tests/aula8-secretas-volateis-smoke.mjs
```
