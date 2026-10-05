# Aula 07 — Individual ou dupla + coleta (Godot 4)

> **Página da aula:** `pages/aula7.html`  
> **Quadro imprimível:** [`quadro-atribuicao.md`](./quadro-atribuicao.md)  
> **Árvore canônica:** [`estrutura-pastas.txt`](./estrutura-pastas.txt)  
> **Plano:** `docs/plano-aula7-papeis-workflow-versionamento.md`

Passo a passo para trabalhar **sozinho** (os dois ofícios) ou em **dupla** (arte da moeda × programação da coleta) no projeto integrador **“O Labirinto de Moedas 2D”**:

- **Encontro 1** — teoria + sprite no **LibreSprite**
- **Encontro 2** — Godot **local** (sem pasta sync) + coleta + diário

Cenário rico, áudio polido e loja da Aula 06 **não** entram.

---

## Fora do escopo (obrigatório lembrar)

| Permitido nos 2 encontros | Proibido |
| :--- | :--- |
| Solo (arte + programação) ou dupla (1 ofício cada) | Trios oficiais / papéis itinerantes |
| E1: sprite no LibreSprite (PNG) | Cenário tilemap completo / boss |
| E2: `moeda.tscn` + Player + coleta | Integrar a loja cosmética da Aula 06 |
| Projeto Godot **local** (sem pasta sync) | Abrir o projeto em Drive/OneDrive |
| Lista “fora do escopo” (≥3 itens) no diário | Combate, NPCs, multiplayer |
| Teaser verbal de que **existe** Git | Git obrigatório / aula de CLI |

**Scope Creep clássico:** “vamos pôr inimigos e loja agora”. Resposta: **não** — fica no cercado “fora”.

---

## Checklist do artefato

Ao final dos 2 encontros:

- [ ] Solo **ou** dupla com ofícios definidos na Oficina
- [ ] Sprite LibreSprite (E1) + `cenas/moeda.tscn` (E2)
- [ ] Player + coleta jogável (some a moeda / conta 1)
- [ ] ≥3 itens **fora do escopo** no diário
- [ ] Projeto Godot **local** com nomes canônicos (sem pasta sync)
- [ ] Diário finalizado na página `aula7` — **cada aluno**, individualmente

**Projeto canônico (local):** `LabirintoDeMoedas`  
**Sem pasta sync** no Godot.

---

## Pré-requisitos

- Godot **4.x** instalada e abrindo
- LibreSprite + Godot 4.x na máquina local
- Página da Aula 07 aberta na aba **Oficina** (convite + diário)
- Quadro: [`quadro-atribuicao.md`](./quadro-atribuicao.md)

### Vocabulário mínimo

| Termo | Significado operacional |
| :--- | :--- |
| Ofício | Arte da moeda **ou** programação da coleta (solo = os dois) |
| Workflow | Sequência de etapas do trabalho |
| Scope Creep | Crescimento do escopo sem corte/prioridade |
| MVP | Sprite LibreSprite + Player anda + coleta |
| Projeto local | Godot na máquina — **sem** pasta sync |
| Diário | Texto único (compartilhado na dupla) enviado no finalize |
| `.tscn` | Cena Godot com nome canônico |

### Cronograma sugerido (2 × ~120 min)

**Encontro 1**

| Bloco | Tempo | Atividade | Resultado |
| :--- | :--- | :--- | :--- |
| Teoria | 30–40 min | Slides densos | Ofícios · workflow · Scope Creep |
| Convite / solo | ~15 min | Oficina: solo ou convite + ofícios | Modo definido |
| Arte LibreSprite | 55–65 min | Sprite da moeda + export PNG | PNG pronto |
| Diário | resto | Seções 1–2 | Autosave |

**Encontro 2**

| Bloco | Tempo | Atividade | Resultado |
| :--- | :--- | :--- | :--- |
| Checkpoint | ~10 min | Scope Creep no telão | Cercado fresco |
| Godot local | 70–80 min | Pastas · import · moeda.tscn · coleta | MVP jogável |
| Diário + finalize | 15–20 min | Seções 3–4 · cada um finaliza | Envio individual |
| Demo + Altar | 5–10 min | 1 solo/dupla no telão | Lembrete Altar |

---

## Nomes de pastas e cenas são contrato

Use **exatamente** os nomes abaixo.

| Cena | Tipo raiz | Dono típico |
| :--- | :--- | :--- |
| `cenas/player.tscn` | `CharacterBody2D` | Programação (ou solo) |
| `cenas/moeda.tscn` | `Area2D` | Arte da moeda (ou solo) |
| `cenas/cenario.tscn` | `Node2D` | Stub opcional (fora do MVP visual) |

---

## Ofícios da sala

| Ofício | Chapéu | Entrega |
| :--- | :--- | :--- |
| Arte da moeda | Arte | **E1** LibreSprite (PNG) · **E2** `cenas/moeda.tscn` |
| Programação da coleta | Programação | **E2** Player (M1) + `body_entered` · some / conta 1 |
| Solo | Os dois | As duas entregas (arte no E1; Godot no E2) |

Convite e escolha de ofício ficam na **Oficina** da página (não no Salão de Companheiros).

---

## Bloco — Quadro de atribuição

Abram [`quadro-atribuicao.md`](./quadro-atribuicao.md) e preencham ofícios + ≥3 itens fora do escopo. O resumo vai para o **diário**.

**Checkpoint:** ofícios claros + cercado com ≥3 itens.

---

## Bloco — Encontro 1 (LibreSprite)

1. Abrir o LibreSprite e desenhar o sprite da moeda (tamanho pequeno, legível em 2D).
2. Exportar **PNG** (nome claro, ex.: `moeda.png`).
3. Guardar o arquivo na máquina local — **não** montar pasta sync no Godot ainda (Godot é Encontro 2).
4. Rascunhar no diário: ofícios + o que foi feito na arte.

**Checkpoint E1:** PNG da moeda pronto + ofícios definidos na Oficina.

---

## Bloco — Encontro 2 (Godot local + coleta)

Árvore canônica (também em [`estrutura-pastas.txt`](./estrutura-pastas.txt)):

```text
LabirintoDeMoedas/          ← só na máquina local
├── project.godot
├── cenas/
│   ├── player.tscn
│   ├── moeda.tscn
│   └── cenario.tscn        ← stub opcional
├── sprites/                ← PNG do LibreSprite
├── audio/
├── scripts/
└── ui/
```

### Passos

1. Godot → **New Project** → **`LabirintoDeMoedas`** em pasta **local** (nunca Drive/OneDrive).
2. Pastas: `cenas`, `sprites`, `audio`, `scripts`, `ui`.
3. Copiar o PNG do LibreSprite para `sprites/`.
4. **Arte:** cena `Area2D` raiz `Moeda` → sprite → salve `cenas/moeda.tscn`.
5. **Programação:** `CharacterBody2D` raiz `Player` → movimento M1 → `body_entered` → some a moeda / conta 1.
6. Solo: faça os dois ofícios. Dupla: combinem a integração sem pasta sync.

**Checkpoint E2:** sprite visível + Player coleta pelo menos 1 moeda + diário finalizado.

---

## Bloco — Diário na plataforma

1. Preencham o **Diário de desenvolvimento** na Oficina (seções guiadas).
2. Em dupla: o mesmo texto sincroniza (autosave + polling).
3. Cada aluno clica **Finalizar aula (meu envio)** no Encontro 2.
4. Lembrar o **Altar** quando o Mestre liberar.

---

## Troubleshooting

| Problema | O que fazer |
| :--- | :--- |
| Projeto lento / arquivos “fantasma” | Saiu de pasta sync? Mova o projeto para disco local |
| Conflito em `.godot/` | Apagar `.godot` local e reabrir |
| Os dois escolheram o mesmo ofício | UI pede o outro chapéu — último save de papel vale |
| Quer loja / boss / online | Scope Creep — diário, seção cercado |
| Coleta não dispara | Conferir `Area2D`, collision layers e `body_entered` |

---

## Contrato de escopo

| No escopo (MVP desta aula) | Fora |
| :--- | :--- |
| LibreSprite (E1) + `moeda.tscn` + Player + coleta (E2) | Combate, NPCs, diálogos |
| Pastas locais + diário | Loja Aula 06 · multiplayer · bosses · pasta sync |
| Stub `cenario.tscn` ok | Cenário rico / tilemap completo |

---

## Arquivos deste pacote

| Arquivo | Uso |
| :--- | :--- |
| [`README.md`](./README.md) | Este guia |
| [`quadro-atribuicao.md`](./quadro-atribuicao.md) | Template imprimível |
| [`estrutura-pastas.txt`](./estrutura-pastas.txt) | Árvore canônica |

---

*Material da Aula 07 · Módulo 2 · Labirinto de Moedas 2D — individual ou dupla + coleta (2026-10-05).*
