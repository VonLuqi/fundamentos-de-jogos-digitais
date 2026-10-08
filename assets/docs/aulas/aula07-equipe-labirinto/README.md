# Aula 07 — Individual ou dupla + coleta (Godot 4)

> **Página da aula:** `pages/aula7.html`  
> **Script-espelho:** [`moeda-exemplo.gd`](./moeda-exemplo.gd) (referência — preferir construir por etapas na sala)  
> **Quadro imprimível:** [`quadro-atribuicao.md`](./quadro-atribuicao.md)  
> **Árvore canônica:** [`estrutura-pastas.txt`](./estrutura-pastas.txt)  
> **Plano:** `docs/plano-aula7-papeis-workflow-versionamento.md`

Passo a passo para trabalhar **sozinho** (os dois ofícios) ou em **dupla** (arte da moeda × programação da coleta) no projeto integrador **“O Labirinto de Moedas 2D”**:

- **Encontro 1** — teoria + sprite no **LibreSprite**
- **Encontro 2** — Godot **local** (sem pasta sync) + coleta + diário

O **movimento do Player já existe** (Aula 02 / `player.gd` com `move_and_slide`). Nesta aula você **reusa** esse script e só **acrescenta** a coleta. Cenário rico, áudio polido e loja da Aula 06 **não** entram.

---

## Fora do escopo (obrigatório lembrar)

| Permitido nos 2 encontros | Proibido |
| :--- | :--- |
| Solo (arte + programação) ou dupla (1 ofício cada) | Trios oficiais / papéis itinerantes |
| E1: sprite no LibreSprite (PNG) | Cenário tilemap completo / boss |
| E2: `moeda.tscn` + coleta no Player existente | Reescrever o movimento do Player do zero |
| Projeto Godot **local** (sem pasta sync) | Integrar a loja cosmética da Aula 06 |
| Lista “fora do escopo” (≥3 itens) no diário | Combate, NPCs, multiplayer · pasta sync no Godot |
| Teaser verbal de que **existe** Git | Git obrigatório / aula de CLI |

**Scope Creep clássico:** “vamos pôr inimigos e loja agora”. Resposta: **não** — fica no cercado “fora”.

---

## Checklist do artefato

Ao final dos 2 encontros:

- [ ] Solo **ou** dupla com ofícios definidos na Oficina
- [ ] Sprite LibreSprite (E1) + `cenas/moeda.tscn` (E2)
- [ ] Player (movimento já pronto) + coleta jogável (some a moeda / conta 1)
- [ ] ≥3 itens **fora do escopo** no diário
- [ ] Projeto Godot **local** com nomes canônicos (sem pasta sync)
- [ ] Diário finalizado na página `aula7` — **cada aluno**, individualmente

**Projeto canônico (local):** `LabirintoDeMoedas`  
**Sem pasta sync** no Godot.

---

## Pré-requisitos

- Godot **4.x** instalada e abrindo
- LibreSprite + Godot 4.x na máquina local
- `player.gd` da **Aula 02** (movimento básico com Input Map `ir_*`) — copie a cena/script para o Labirinto
- Página da Aula 07 aberta na aba **Oficina** (convite + diário)
- Quadro: [`quadro-atribuicao.md`](./quadro-atribuicao.md)

### O que NÃO fazer nesta aula

| Evitar | Por quê |
| :--- | :--- |
| Apagar / reescrever o `player.gd` de movimento | Já está pronto no Módulo 1 — só acrescente coleta |
| Integrar a loja da Aula 06 | Fora do escopo (Scope Creep) |
| Copiar o script da moeda sem conectar o sinal | Sem `body_entered` conectado, nada dispara |
| Usar `StaticBody2D` / `RigidBody2D` na moeda | Moeda é **detecção** → raiz `Area2D` |

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
| Setup + arte moeda | ~20 min | Pastas · PNG · `moeda.tscn` | Sprite na cena |
| Player + coleta | ~35 min | Trazer Player · trechos no `player.gd` · `moeda.gd` | Conta 1 |
| Integração + Play | ~15 min | `cenario.tscn` · F5 | MVP jogável |
| Diário + finalize | 15–20 min | Seções 3–4 · cada um finaliza | Envio individual |
| Demo + Altar | 5–10 min | 1 solo/dupla no telão | Lembrete Altar |

---

## Nomes de pastas e cenas são contrato

Use **exatamente** os nomes abaixo.

| Cena / script | Tipo raiz | Dono típico |
| :--- | :--- | :--- |
| `cenas/player.tscn` | `CharacterBody2D` | Programação (ou solo) — reusa Aula 02 |
| `cenas/moeda.tscn` | `Area2D` | Arte da moeda (ou solo) |
| `cenas/cenario.tscn` | `Node2D` | Integração (instâncias Player + Moeda) |
| `scripts/player.gd` | — | Já existe (movimento) — só acrescentar coleta |
| `scripts/moeda.gd` | — | Novo nesta aula |
| `sprites/moeda.png` | PNG | Arte (export LibreSprite) |

---

## Ofícios da sala

| Ofício | Chapéu | Entrega |
| :--- | :--- | :--- |
| Arte da moeda | Arte | **E1** LibreSprite (PNG) · **E2** `cenas/moeda.tscn` |
| Programação da coleta | Programação | **E2** Player (já anda) + `body_entered` · some / conta 1 |
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
│   ├── player.tscn         ← trazida da Aula 02 (já anda)
│   ├── moeda.tscn
│   └── cenario.tscn
├── sprites/
│   └── moeda.png
├── audio/
├── scripts/
│   ├── player.gd           ← movimento já pronto · acrescente coleta
│   └── moeda.gd            ← novo
└── ui/
```

---

### Bloco E2.0 — Projeto e pastas (~8 min)

1. Godot → **New Project** → nome/pasta **`LabirintoDeMoedas`** em disco **local** (nunca Drive/OneDrive).
2. No **FileSystem**, botão direito na raiz → **New Folder** → criar: `cenas`, `sprites`, `audio`, `scripts`, `ui`.
3. Copiar o PNG do LibreSprite para `sprites/` (Explorer/Finder **ou** arrastar no FileSystem).
4. Copiar do projeto antigo (Aulas 02–04):
   - cena do Player → `cenas/player.tscn`
   - script → `scripts/player.gd` (ou o caminho que você já usava — ajuste o Attach Script se precisar)
5. Confirme: `sprites/moeda.png` + Player andando com F6.

**Checkpoint:** pastas canônicas + PNG + Player já se move (não mexa no `move_and_slide` agora).

---

### Bloco E2.1 — Arte: cena `moeda.tscn` (~15–20 min)

Hierarquia **exata**:

```text
Moeda (Area2D)
├── Sprite2D
└── CollisionShape2D
```

1. **Scene → New Scene** → **Other Node** → busque **`Area2D`** → Create.
2. Renomeie a raiz para `Moeda`.
3. Com `Moeda` selecionada: **Add Child Node** → `Sprite2D`.
4. No Inspector do `Sprite2D`: **Texture** → arraste `sprites/moeda.png` (ou Load).
5. Com `Moeda` selecionada: **Add Child Node** → `CollisionShape2D`.
6. No Inspector do `CollisionShape2D`: **Shape** → **New CircleShape2D** (ou RectangleShape2D).
7. Ajuste o shape para **cobrir** o sprite (alças azuis no viewport).
8. **Salve** como `cenas/moeda.tscn` (Ctrl+S).

Ainda **sem** script — a arte entrega a cena com o PNG.

**Checkpoint arte:** F6 na `moeda.tscn` mostra o sprite; shape cobrindo a moeda.

---

### Bloco E2.2 — Acrescentar coleta no `player.gd` (~10 min)

Abra o **`player.gd` que você já tem** (movimento da Aula 02). **Não apague** o `_physics_process` / `move_and_slide`.

#### 2.1 Contador

Logo abaixo das variáveis que já existem (ex.: `speed`), acrescente:

```gdscript
## Contador da Aula 07 — coleta mínima.
var moedas: int = 0
```

#### 2.2 Grupo `player`

Se já existir `func _ready()`, acrescente **só** esta linha dentro dela:

```gdscript
	add_to_group("player")
```

Se **não** existir `_ready()`, cole o bloco inteiro:

```gdscript
func _ready() -> void:
	add_to_group("player")
```

#### 2.3 Função chamada pela moeda

No **final** do arquivo (depois do movimento), cole:

```gdscript
func coletar_moeda() -> void:
	moedas += 1
	print("Moedas: %d" % moedas)
```

**Checkpoint:** o Player ainda anda igual. Você só adicionou `moedas`, grupo e `coletar_moeda`.

> Exemplo: se o seu `player.gd` da Aula 02 era só movimento, ele fica assim no fim:

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

---

### Bloco E2.3 — Script da moeda + sinal (por etapas) (~15 min)

#### 3.1 Anexar script

1. Abra `cenas/moeda.tscn`.
2. Selecione a raiz `Moeda`.
3. Inspector → **Attach Script**.
4. Language: **GDScript** · Path: `scripts/moeda.gd` · Template: Empty / default.
5. Create.

#### 3.2 Código da moeda (copie)

```gdscript
extends Area2D

func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("coletar_moeda"):
		body.coletar_moeda()
	queue_free()
```

#### 3.3 Conectar o sinal (Forma A — editor, padrão de sala)

1. Selecione a raiz `Moeda`.
2. Aba **Node** (ao lado do Inspector) → **Signals**.
3. Duplo clique em **`body_entered`**.
4. Receptor: nó `Moeda` · método `_on_body_entered` → **Connect**.
5. Salve a cena.

Ícone de sinal / wifi deve aparecer ao lado de `Moeda` na árvore.

**Forma B — código (alternativa):** se preferir conectar no script:

```gdscript
extends Area2D

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("coletar_moeda"):
		body.coletar_moeda()
	queue_free()
```

O arquivo [`moeda-exemplo.gd`](./moeda-exemplo.gd) traz o script completo — use **só se travar**; o objetivo é entender o sinal e o `queue_free`.

**Checkpoint:** script anexado + sinal conectado (ainda sem Play da fase).

---

### Bloco E2.4 — Integração: `cenario.tscn` + Play (~15 min)

1. **Scene → New Scene** → **Other Node** → `Node2D` → renomeie para `Cenario`.
2. **Salve** como `cenas/cenario.tscn`.
3. Arraste `cenas/player.tscn` do FileSystem para a cena (instância).
4. Arraste `cenas/moeda.tscn` **duas ou três vezes** e posicione longe do Player.
5. **Project → Project Settings → Application → Run → Main Scene** → `cenas/cenario.tscn`.
6. **Play** (F5).

| Teste | Esperado |
| :--- | :--- |
| Andar (WASD / setas) | Player se move como na Aula 02 |
| Tocar uma moeda | Moeda some |
| Painel **Output** | `Moedas: 1`, depois `2`, … |

**Checkpoint E2:** sprite da arte + Player coleta pelo menos 1 moeda + contador no Output.

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
| Coleta não dispara | Shape na moeda · Monitoring ligado · sinal `body_entered` conectado |
| Moeda some com qualquer coisa | `is_in_group("player")` + `add_to_group("player")` no Player |
| Player parou de andar | Você apagou o `_physics_process`? Restaure o movimento da Aula 02 |
| Contador não sobe | `coletar_moeda` no Player · Output aberto (Editor → Output) |
| PNG borrado | Import → Filter **Off** (Nearest), eco Aula 03 |

---

## Contrato de escopo

| No escopo (MVP desta aula) | Fora |
| :--- | :--- |
| LibreSprite (E1) + `moeda.tscn` + coleta no Player existente (E2) | Reescrever movimento · combate · NPCs |
| Pastas locais + diário | Loja Aula 06 · multiplayer · bosses · pasta sync |
| `cenario.tscn` com instâncias | Cenário rico / tilemap completo |
| Contador no Output (`print`) | HUD polido / SFX |

---

## Arquivos deste pacote

| Arquivo | Uso |
| :--- | :--- |
| [`README.md`](./README.md) | Este guia (código no passo a passo) |
| [`moeda-exemplo.gd`](./moeda-exemplo.gd) | Espelho opcional se travar |
| [`quadro-atribuicao.md`](./quadro-atribuicao.md) | Template imprimível |
| [`estrutura-pastas.txt`](./estrutura-pastas.txt) | Árvore canônica |

---

*Material da Aula 07 · Módulo 2 · Labirinto de Moedas 2D — individual ou dupla + coleta (2026-10-05).*
