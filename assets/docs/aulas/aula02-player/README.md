# Aula 02 — Material do Player (Godot 4)

> **Download para alunos:** [`Material-Player-Aula02.docx`](./Material-Player-Aula02.docx)  
> Regenerar o Word: `python scripts/build-aula02-player-docx.py`

Passo a passo para montar a **primeira cena do Jogador**: hierarquia de nós, Input Map e script mínimo com `move_and_slide`.

Não há ZIP de sprite nesta aula — use um ícone/placeholder da própria Godot no `Sprite2D`.

---

## Checklist do artefato

Ao final, você deve ter:

- [ ] Cena salva (ex.: `player.tscn`)
- [ ] Raiz `CharacterBody2D` (renomeada para `Player`)
- [ ] Filho `Sprite2D` com alguma textura
- [ ] Filho `CollisionShape2D` com shape alinhado ao sprite
- [ ] Input Map com `ir_cima`, `ir_baixo`, `ir_esquerda`, `ir_direita`
- [ ] Teclas WASD **ou** setas ligadas às ações
- [ ] Script `player.gd` anexado à raiz e movimento funcionando no **Play**

Registre tudo nas anotações da página da aula (glossário + hierarquia + Input Map + observações).

---

## 1. Cenas e nós

Na Godot, **tudo é um nó**. Uma **cena** (`.tscn`) é a “receita de bolo” que guarda essa hierarquia para reutilizar.

Painéis úteis:

| Painel | Função |
| :--- | :--- |
| Scene | Hierarquia dos nós |
| FileSystem | Assets (imagens, sons, scripts, cenas) |
| Inspector | Propriedades do nó selecionado |
| Viewport 2D | Visualização da cena |

---

## 2. Criar a cena do Player

1. **Scene → New Scene** → escolha **CharacterBody2D** como raiz.
2. Renomeie a raiz para `Player`.
3. Clique com o botão direito na raiz → **Add Child Node**:
   - `Sprite2D`
   - `CollisionShape2D`
4. No `Sprite2D`, em **Texture**, use um placeholder (ex.: ícone embutido da Godot ou uma imagem simples do projeto).
5. No `CollisionShape2D`, em **Shape**, crie um `RectangleShape2D` ou `CapsuleShape2D` e ajuste ao tamanho do sprite.
6. **Salve** a cena como `player.tscn` (ou nome combinado com a turma).

Hierarquia esperada:

```text
Player (CharacterBody2D)
├── Sprite2D
└── CollisionShape2D
```

---

## 3. Input Map

1. **Project → Project Settings → Input Map**.
2. Crie as ações (digite o nome e clique **Add**):
   - `ir_cima`
   - `ir_baixo`
   - `ir_esquerda`
   - `ir_direita`
3. Em cada ação, clique **+** e associe:
   - **WASD**: W / S / A / D  
   - **ou setas**: ↑ / ↓ / ← / →

Use nomes internos (`ir_*`) no código — assim trocar teclas depois não quebra o script.

---

## 4. Script mínimo (`player.gd`)

1. Selecione o `CharacterBody2D` (`Player`).
2. Clique em **Attach Script** e salve como `player.gd`.
3. Substitua o conteúdo por algo equivalente a:

```gdscript
extends CharacterBody2D

@export var speed: float = 200.0

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ir_esquerda", "ir_direita", "ir_cima", "ir_baixo")
	velocity = direction * speed
	move_and_slide()
```

4. Pressione **Play** (F5). Se a Godot pedir uma cena principal, escolha `player.tscn` (ou uma cena de teste que instancia o Player).
5. Confirme movimento nas quatro direções — esse é o começo do **Grokking**.

### Fora de escopo nesta aula

- Câmera follow
- Pulo avançado / gravidade de plataforma
- Animações de sprite

---

## 5. Ligação com o glossário

| Termo | Onde aparece na prática |
| :--- | :--- |
| **Core Loop** | Andar na tela é o primeiro passo do ciclo (depois virão coletar / avançar). |
| **Grokking** | Quando `ir_*` deixa de ser “pensar a tecla” e vira reflexo no Play. |
| **Assets** | A textura do `Sprite2D` (e futuros sons) no FileSystem. |

---

## Dúvidas comuns

**O personagem não se move**  
Confira os nomes das ações no Input Map (iguais ao script) e se o script está anexado à raiz `CharacterBody2D`.

**Não colide com nada**  
Nesta aula o foco é estrutura + input. Sem chão/`StaticBody2D`, o Player ainda deve deslizar no vazio do Viewport.

**Posso usar outro shape?**  
Sim — o importante é existir um `CollisionShape2D` com shape definido.
