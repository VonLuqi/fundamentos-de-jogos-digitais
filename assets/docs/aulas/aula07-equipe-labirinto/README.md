# Aula 07 — Individual ou dupla + coleta (Godot 4)

> **Página da aula:** `pages/aula7.html`  
> **Scripts-espelho:** [`moeda-exemplo.gd`](./moeda-exemplo.gd) · [`player-exemplo.gd`](./player-exemplo.gd)  
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
- Lembrar o movimento da **Aula 02** (`CharacterBody2D` + Input Map `ir_*`)

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
| `Area2D` | Zona que **detecta** overlap (a moeda não é parede) |
| `body_entered` | Sinal: um corpo (`CharacterBody2D`) entrou na área |

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
| Godot local | 70–80 min | Pastas · import · moeda · Player · coleta | MVP jogável |
| Diário + finalize | 15–20 min | Seções 3–4 · cada um finaliza | Envio individual |
| Demo + Altar | 5–10 min | 1 solo/dupla no telão | Lembrete Altar |

---

## Nomes de pastas e cenas são contrato

Use **exatamente** os nomes abaixo.

| Cena / script | Tipo raiz | Dono típico |
| :--- | :--- | :--- |
| `cenas/player.tscn` | `CharacterBody2D` | Programação (ou solo) |
| `cenas/moeda.tscn` | `Area2D` | Arte da moeda (ou solo) |
| `cenas/cenario.tscn` | `Node2D` | Integração (instâncias Player + Moeda) |
| `scripts/player.gd` | — | Programação |
| `scripts/moeda.gd` | — | Programação (arte monta a cena) |
| `sprites/moeda.png` | PNG | Arte (export LibreSprite) |

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

1. Abrir o LibreSprite e desenhar o sprite da moeda (tamanho pequeno, legível em 2D — ex.: **32×32** ou **16×16**).
2. Exportar **PNG** com nome claro: `moeda.png`.
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
│   └── cenario.tscn        ← cena de Play (integração)
├── sprites/
│   └── moeda.png           ← PNG do LibreSprite
├── audio/
├── scripts/
│   ├── player.gd
│   └── moeda.gd
└── ui/
```

Scripts-espelho (referência — preferir digitar por etapas):

- [`player-exemplo.gd`](./player-exemplo.gd) → copiar lógica para `scripts/player.gd`
- [`moeda-exemplo.gd`](./moeda-exemplo.gd) → copiar lógica para `scripts/moeda.gd`

---

### Bloco E2.0 — Projeto e pastas (~8 min)

1. Godot → **New Project** → nome/pasta **`LabirintoDeMoedas`** em disco **local** (nunca Drive/OneDrive).
2. No **FileSystem**, botão direito na raiz → **New Folder** → criar: `cenas`, `sprites`, `audio`, `scripts`, `ui`.
3. Copiar o PNG do LibreSprite para a pasta `sprites/` do projeto (pelo Explorer/Finder **ou** arrastando para o FileSystem).
4. Confirme no FileSystem: `sprites/moeda.png` aparece (a Godot importa sozinha).

**Checkpoint:** pastas canônicas + PNG visível no FileSystem.

---

### Bloco E2.1 — Arte: cena `moeda.tscn` (~15–20 min)

Hierarquia **exata**:

```text
Moeda (Area2D)
├── Sprite2D
└── CollisionShape2D
```

Passos:

1. **Scene → New Scene** → **Other Node** → busque **`Area2D`** → Create.
2. Renomeie a raiz para `Moeda`.
3. Com `Moeda` selecionada: **Add Child Node** → `Sprite2D`.
4. No Inspector do `Sprite2D`: **Texture** → arraste `sprites/moeda.png` (ou Load).
5. Com `Moeda` selecionada: **Add Child Node** → `CollisionShape2D`.
6. No Inspector do `CollisionShape2D`: **Shape** → **New CircleShape2D** (ou RectangleShape2D).
7. Ajuste o círculo/retângulo para **cobrir** o sprite (viewport 2D — alças azuis).
8. **Salve** como `cenas/moeda.tscn` (Ctrl+S).

Ainda **sem** script — a arte entrega a cena montada com o PNG.

**Checkpoint arte:** F6 na `moeda.tscn` mostra o sprite; shape cobrindo a moeda.

---

### Bloco E2.2 — Programação: cena `player.tscn` + movimento M1 (~20 min)

Hierarquia **exata** (eco Aula 02):

```text
Player (CharacterBody2D)
├── Sprite2D
└── CollisionShape2D
```

#### Input Map (se o projeto for novo)

1. **Project → Project Settings → Input Map**.
2. Crie as ações (iguais à Aula 02):
   - `ir_cima` · `ir_baixo` · `ir_esquerda` · `ir_direita`
3. Associe WASD e/ou setas.

#### Cena

1. **Scene → New Scene** → **CharacterBody2D** como raiz → renomeie para `Player`.
2. Filhos: `Sprite2D` + `CollisionShape2D` (shape que cubra o personagem).
3. Textura do Player: placeholder da Godot **ou** sprite antigo do Módulo 1 — o foco da aula é a **moeda**.
4. **Salve** como `cenas/player.tscn`.

#### Script `scripts/player.gd`

1. Selecione a raiz `Player` → **Attach Script** → caminho `scripts/player.gd`.
2. Substitua o conteúdo por algo equivalente a [`player-exemplo.gd`](./player-exemplo.gd):

```gdscript
extends CharacterBody2D

@export var speed: float = 200.0
var moedas: int = 0

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ir_esquerda", "ir_direita", "ir_cima", "ir_baixo")
	velocity = direction * speed
	move_and_slide()

func coletar_moeda() -> void:
	moedas += 1
	print("Moedas: %d" % moedas)
```

3. (Opcional) No Inspector: **Node → Groups** → confirme o grupo `player` (o `_ready` também adiciona).

**Checkpoint programação (movimento):** F6 em `player.tscn` — anda nas 4 direções.

---

### Bloco E2.3 — Script da moeda + sinal `body_entered` (~15 min)

1. Abra `cenas/moeda.tscn`.
2. Selecione a raiz `Moeda` → **Attach Script** → caminho `scripts/moeda.gd`.
3. Conteúdo equivalente a [`moeda-exemplo.gd`](./moeda-exemplo.gd):

```gdscript
extends Area2D

func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("coletar_moeda"):
		body.coletar_moeda()
	queue_free()
```

4. Com `Moeda` selecionada, aba **Node** (ao lado do Inspector) → **Signals**.
5. Clique duas vezes em **`body_entered`** → Connect → receptor = nó `Moeda` → método `_on_body_entered` → **Connect**.
6. Salve a cena.

Ícone de “sinal” / wifi deve aparecer ao lado de `Moeda` na árvore.

**Checkpoint:** script anexado + sinal conectado (sem Play ainda).

---

### Bloco E2.4 — Integração: `cenario.tscn` + Play (~15–20 min)

1. **Scene → New Scene** → **Other Node** → `Node2D` → renomeie para `Cenario`.
2. **Salve** como `cenas/cenario.tscn`.
3. Arraste `cenas/player.tscn` do FileSystem para a cena (vira instância).
4. Arraste `cenas/moeda.tscn` **duas ou três vezes** (várias moedas) e posicione longe do Player.
5. **Project → Project Settings → Application → Run → Main Scene** → `cenas/cenario.tscn`.
6. **Play** (F5).

O que deve acontecer:

- Player anda (WASD / setas).
- Ao tocar uma moeda → ela **some** (`queue_free`).
- No painel **Output**: `Moedas: 1`, depois `2`, …

**Checkpoint E2:** sprite visível + Player coleta pelo menos 1 moeda + contador no Output.

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
| Coleta não dispara | `Area2D` + `CollisionShape2D` com shape · Monitoring ligado · sinal `body_entered` conectado |
| Moeda some com qualquer coisa | Confira `is_in_group("player")` no script e o grupo no Player |
| Player não anda | Input Map `ir_*` · script na raiz `CharacterBody2D` · F5 na cena de integração |
| Contador não sobe | `coletar_moeda` no Player · Output aberto (Editor → Output) |
| PNG “sumiu” / pixel borrado | Import → Filter **Off** (Nearest), eco Aula 03 |

---

## Contrato de escopo

| No escopo (MVP desta aula) | Fora |
| :--- | :--- |
| LibreSprite (E1) + `moeda.tscn` + Player + coleta (E2) | Combate, NPCs, diálogos |
| Pastas locais + diário | Loja Aula 06 · multiplayer · bosses · pasta sync |
| Stub/`cenario.tscn` com instâncias | Cenário rico / tilemap completo |
| Contador no Output (`print`) | HUD polido / loja / SFX |

---

## Arquivos deste pacote

| Arquivo | Uso |
| :--- | :--- |
| [`README.md`](./README.md) | Este guia (passo a passo) |
| [`moeda-exemplo.gd`](./moeda-exemplo.gd) | Script-espelho da coleta |
| [`player-exemplo.gd`](./player-exemplo.gd) | Script-espelho do movimento + contador |
| [`quadro-atribuicao.md`](./quadro-atribuicao.md) | Template imprimível |
| [`estrutura-pastas.txt`](./estrutura-pastas.txt) | Árvore canônica |

---

*Material da Aula 07 · Módulo 2 · Labirinto de Moedas 2D — individual ou dupla + coleta (2026-10-05).*
