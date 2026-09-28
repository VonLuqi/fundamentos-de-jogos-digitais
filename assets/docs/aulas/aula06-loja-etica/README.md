# Aula 06 — Oficina de Interface de Loja (Godot 4)

> **Página da aula:** `pages/aula6.html`  
> **Script-espelho:** [`loja-exemplo.gd`](./loja-exemplo.gd) (referência — preferir construir por etapas na sala)  
> **Plano:** `docs/plano-aula6-mercado-loja-etica.md`

Passo a passo para montar uma **loja cosmética interna** com `PanelContainer`, `Button` e `Label`, usando **moedas ganhas jogando** (simuladas).

Continue o projeto das **Aulas 02–04** (Player + Nearest + viewport retrô). Você **adiciona** a cena `ui/loja.tscn` — não apague o que já existe.

---

## Regras éticas (obrigatórias)

| Permitido | Proibido |
| :--- | :--- |
| Cosméticos com **preço fixo** | Loot box / `randi()` / chance na compra |
| Moedas **ganhas jogando** (botão “Coletar moeda da fase”) | Dinheiro real / IAP / Steam Wallet |
| Bloquear compra sem saldo ou item já possuído | Dark pattern de recompra forçada |

No Brasil, mecânicas que **simulam jogo de azar** (loot boxes) tendem a elevar a classificação ClassInd — frequentemente **18+** (eco Aula 05). Esta oficina é o **balcão sem azar**.

---

## Checklist do artefato

Ao final, você deve ter:

- [ ] Cena `ui/loja.tscn` com raiz `Control` nomeada `Loja`
- [ ] Pelo menos um `PanelContainer` e três `Button` de compra + um de coletar moeda
- [ ] Script `ui/loja.gd` anexado à raiz
- [ ] Sinal `pressed` conectado (editor — Forma A — ou código)
- [ ] Saldo atualiza no `LabelMoedas`
- [ ] Compra respeita preço fixo e bloqueia sem moedas / item repetido
- [ ] Nenhum uso de sorte (`randi` / loot) na compra
- [ ] Play (**F6**) demonstra o fluxo completo
- [ ] Anotações + síntese enviadas na página da aula

**Economia canônica:** saldo inicial **10** · coletar **+5** · Chapéu **5** · Capa **12** · Aura **20**.

---

## Pré-requisitos

- Godot **4.x** instalada e abrindo
- Projeto das Aulas 02–04 (ou projeto novo vazio só para a loja, se o antigo estiver quebrado)
- Página da Aula 06 aberta na aba **Oficina** (anotações)
- Não é necessário saber GDScript avançado — o script é o primeiro contato de UI do Módulo 2

### O que NÃO fazer nesta aula

| Evitar | Por quê |
| :--- | :--- |
| Integrar a loja na cena do Player | Mistura movimento 2D com UI; fica para Aula 07+ |
| Loot box / `randi()` na compra | Fere a ementa ética + ClassInd |
| Preço em dinheiro real / IAP | Fora do escopo |
| Copiar o script inteiro sem entender o sinal | Quebra o objetivo “GDScript do zero” |
| Usar `Node2D` como raiz da loja | Loja é UI → raiz `Control` |

### Vocabulário mínimo

| Termo | Significado operacional |
| :--- | :--- |
| `Control` | Nós de interface (âncoras/retângulos, não metros do mundo) |
| `PanelContainer` | Painel que embrulha filhos |
| `Button` | Botão; emite o sinal `pressed` |
| `Label` | Texto na tela (saldo, status, nome do item) |
| Sinal | Aviso que o nó dispara; ligamos a uma função no script |
| `@onready` | Referência ao nó depois que a cena carrega |
| Moeda in-game | Recurso ganho jogando — **não** é cartão de crédito |

### Cronograma sugerido (~100 min)

| Bloco | Tempo | Atividade | Resultado visível |
| :--- | :--- | :--- | :--- |
| 0. Setup | 8 min | Pasta `ui/` · cena `Control` | `ui/loja.tscn` |
| 1. Árvore | 20 min | Painéis · labels · botões | Hierarquia = diagrama |
| 2. Layout | 12 min | Âncoras · tamanhos | Loja legível no F6 |
| 3. Script + sinal | 25 min | `loja.gd` · coletar moeda | HUD sobe de 5 em 5 |
| 4. Regras éticas | 20 min | Bloqueios de compra | Compra justa, sem RNG |
| 5. Play + registro | 15 min | Fluxo · anotações · finalizar | Artefato + envio |

---

## Nomes de nós são contrato

Use **exatamente** os nomes abaixo. Maiúsculas importam: `LabelMoedas` ≠ `labelMoedas`.

---

## Bloco 0 — Setup (8 min)

1. Abra o projeto do curso (Aulas 02–04).
2. No **FileSystem**, botão direito na pasta raiz → **New Folder** → `ui`.
3. **Scene → New Scene**.
4. Clique em **Other Node** (não escolha `Node2D` / `CharacterBody2D`).
5. Busque e selecione **`Control`** → Create.
6. Renomeie a raiz para `Loja`.
7. **Salve** como `ui/loja.tscn` (Ctrl+S).
8. Com `Loja` selecionada: Inspector → **Layout → Anchors Preset** → **Full Rect**.

**Checkpoint 0:** existe `ui/loja.tscn`; raiz `Loja` é do tipo `Control`.

---

## Bloco 1 — Árvore de nós (20 min)

Monte a hierarquia **exatamente** assim (Add Child Node a cada linha):

```text
Loja (Control)                          ← já existe
└── PainelFundo (PanelContainer)
    └── Margem (MarginContainer)        ← recomendado
        └── VBoxPrincipal (VBoxContainer)
            ├── Titulo (Label)
            ├── LabelMoedas (Label)
            ├── SeparadorItens (HSeparator)   ← opcional
            ├── PainelItemChapeu (PanelContainer)
            │   └── HBoxChapeu (HBoxContainer)
            │       ├── LabelChapeu (Label)
            │       └── BtnComprarChapeu (Button)
            ├── PainelItemCapa (PanelContainer)
            │   └── HBoxCapa (HBoxContainer)
            │       ├── LabelCapa (Label)
            │       └── BtnComprarCapa (Button)
            ├── PainelItemAura (PanelContainer)
            │   └── HBoxAura (HBoxContainer)
            │       ├── LabelAura (Label)
            │       └── BtnComprarAura (Button)
            ├── BtnGanharMoeda (Button)
            └── LabelStatus (Label)
```

**Como adicionar cada nó:**

1. Botão direito no nó pai → **Add Child Node**.
2. Digite o tipo (`PanelContainer`, `VBoxContainer`, `Label`, `Button`, …).
3. Create → **renomeie imediatamente**.

### Textos iniciais (Inspector → Text / Text)

| Nó | Texto sugerido |
| :--- | :--- |
| `Titulo` | `Loja do Submundo` |
| `LabelMoedas` | `Moedas: 10` |
| `LabelChapeu` | `Chapéu espectral — 5 moedas` |
| `LabelCapa` | `Capa de névoa — 12 moedas` |
| `LabelAura` | `Aura de carvão — 20 moedas` |
| `BtnComprarChapeu` | `Comprar` |
| `BtnComprarCapa` | `Comprar` |
| `BtnComprarAura` | `Comprar` |
| `BtnGanharMoeda` | `Coletar moeda da fase (+5)` |
| `LabelStatus` | `Bem-vindo. Só moedas ganhas jogando.` |

**Se usar `MarginContainer`:** selecione `Margem` → Theme Overrides → Constants / Margin → `10`–`16` em todos os lados.

**Checkpoint 1:** a árvore na aba Scene bate com o diagrama. Nome errado agora = script quebrado depois.

---

## Bloco 2 — Layout legível (12 min)

1. `PainelFundo` → Anchors Preset → **Center** ou **Full Rect** (com `Margem` nas bordas).
2. Em cada `Button`, **Custom Minimum Size** ~ `120` × `32` se estiver minúsculo.
3. Em `LabelMoedas` e `Titulo`, aumente o font size se o viewport retrô (Aula 04) deixar o texto apertado.
4. **Não** perca tempo com tema custom completo nesta aula.

**Checkpoint 2:** **F6** (Play This Scene) — títulos e botões visíveis e clicáveis (ainda sem lógica — ok).

> Use **F6** nesta cena, não só F5, se a Main Scene ainda for o Player.  
> Alternativa: Project Settings → Application → Run → Main Scene = `ui/loja.tscn` (reverter depois se quiser).

---

## Bloco 3 — Script `loja.gd` + sinais (25 min)

### 3.1 Criar e anexar o script

1. Selecione a raiz `Loja`.
2. Inspector → **Attach Script**.
3. Language: **GDScript** · Path: `ui/loja.gd` · Template: Empty / default.
4. Create.

### 3.2 Código inicial (por etapas)

```gdscript
extends Control

## Saldo inicial — moedas "já coletadas" na fase (simulação pedagógica).
var moedas: int = 10

## Itens possuídos (false = ainda não comprou).
var tem_chapeu: bool = false
var tem_capa: bool = false
var tem_aura: bool = false

## Preços fixos — determinísticos (sem sorte).
const PRECO_CHAPEU: int = 5
const PRECO_CAPA: int = 12
const PRECO_AURA: int = 20
const GANHO_FASE: int = 5

@onready var label_moedas: Label = $PainelFundo/Margem/VBoxPrincipal/LabelMoedas
@onready var label_status: Label = $PainelFundo/Margem/VBoxPrincipal/LabelStatus
@onready var btn_chapeu: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemChapeu/HBoxChapeu/BtnComprarChapeu
@onready var btn_capa: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemCapa/HBoxCapa/BtnComprarCapa
@onready var btn_aura: Button = $PainelFundo/Margem/VBoxPrincipal/PainelItemAura/HBoxAura/BtnComprarAura


func _ready() -> void:
	_atualizar_hud()
	label_status.text = "Bem-vindo. Só moedas ganhas jogando."


func _atualizar_hud() -> void:
	label_moedas.text = "Moedas: %d" % moedas
```

> **Se você não usou `Margem`:** ajuste os caminhos para `$PainelFundo/VBoxPrincipal/...`.  
> Caminho errado = erro no Output ao dar Play. Dica: botão direito no nó → **Copy Node Path**.

### 3.3 Conectar sinais

**Forma A — Editor (padrão de sala):**

1. Selecione `BtnGanharMoeda`.
2. Aba **Node** → sinal **`pressed()`** → duplo clique.
3. Receptor: nó `Loja` · método `_on_btn_ganhar_moeda_pressed` → Connect.
4. Repita para os botões de compra:
   - `_on_btn_comprar_chapeu_pressed`
   - `_on_btn_comprar_capa_pressed`
   - `_on_btn_comprar_aura_pressed`

**Forma B — código (alternativa):**

```gdscript
func _ready() -> void:
	$PainelFundo/Margem/VBoxPrincipal/BtnGanharMoeda.pressed.connect(_on_btn_ganhar_moeda_pressed)
	btn_chapeu.pressed.connect(_on_btn_comprar_chapeu_pressed)
	btn_capa.pressed.connect(_on_btn_comprar_capa_pressed)
	btn_aura.pressed.connect(_on_btn_comprar_aura_pressed)
	_atualizar_hud()
	label_status.text = "Bem-vindo. Só moedas ganhas jogando."
```

### 3.4 Função de ganhar moeda (simula a fase)

```gdscript
func _on_btn_ganhar_moeda_pressed() -> void:
	moedas += GANHO_FASE
	label_status.text = "Você coletou +%d moedas na fase." % GANHO_FASE
	_atualizar_hud()
```

**Checkpoint 3:** F6 → **Coletar moeda** → `LabelMoedas` sobe de 5 em 5.  
Se não subir: sinal não conectado ou caminho `@onready` quebrado (veja o Output).

---

## Bloco 4 — Regras de compra ética (20 min)

Implemente **uma** compra completa; depois copie o padrão.

```gdscript
func _on_btn_comprar_chapeu_pressed() -> void:
	if tem_chapeu:
		label_status.text = "Você já possui o Chapéu. Sem recompra forçada."
		return
	if moedas < PRECO_CHAPEU:
		label_status.text = "Moedas insuficientes. Volte à fase e colete mais."
		return
	moedas -= PRECO_CHAPEU
	tem_chapeu = true
	btn_chapeu.disabled = true
	btn_chapeu.text = "Adquirido"
	label_status.text = "Chapéu espectral adquirido. Cosmético — sem vantagem injusta."
	_atualizar_hud()
```

Repita para capa e aura (`PRECO_CAPA` / `PRECO_AURA`, `tem_capa` / `tem_aura`, `btn_capa` / `btn_aura`).

O arquivo [`loja-exemplo.gd`](./loja-exemplo.gd) traz as **três funções explícitas** completas — use só se travar; o objetivo é entender o `if` e o sinal.

### O código deve deixar óbvio

1. Preço **fixo** (`const`) — o jogador sabe o custo.  
2. Sem `randi()`, sem “chance de item raro”.  
3. Sem saldo → mensagem para **voltar a jogar**, não para comprar moedas com cartão.  
4. Item já possuído → botão desabilitado.

### Checkpoint 4

| Teste | Esperado |
| :--- | :--- |
| Comprar chapéu com 10 moedas | Saldo 5; botão “Adquirido”; status ok |
| Comprar aura com 5 moedas | Status “insuficientes”; saldo inalterado |
| Clicar chapéu de novo | Status “já possui”; saldo inalterado |
| Coletar moedas até aura | Compra da aura funciona |

---

## Bloco 5 — Registro na plataforma (15 min)

1. Rodar o fluxo feliz (coletar → comprar pelo menos 2 itens).
2. Preencher anotações na página da Aula 06.
3. Escrever síntese (5–8 linhas): mercado / IP → monetização ética → loja com moedas da fase e preço fixo.
4. **Finalizar aula e enviar anotações**.
5. (Quando liberado) resgatar o código no Altar.

### Template de anotações

```text
1) Uma ideia do mercado brasileiro OU internacional que me marcou:
2) Original IP vs prestação de serviços — em uma frase, a diferença:
3) Exemplo de monetização ética vs. mecânica abusiva (loot box / azar):
4) Por que loot box pode subir a classificação (eco ClassInd):
5) Hierarquia da minha loja (raiz + 3 nós importantes):
6) Como conectei o sinal pressed (editor ou código):
7) Preços dos itens e saldo inicial / ganho por coleta:
8) O que acontece se faltar moeda OU se o item já foi comprado:
9) Observações / dúvidas:
```

---

## Artefato

**Interface operacional de loja interna** — cosméticos com preços fixos, abastecida só por moedas “ganhas na fase”, sem aposta e sem gasto financeiro real, documentada nas anotações da plataforma.

---

## Troubleshooting

| Sintoma | Causa comum | Correção |
| :--- | :--- | :--- |
| Erro `Invalid get index '…'` / nó null | Caminho `$…` não bate com a árvore | Conferir nomes; **Copy Node Path** |
| Clique não faz nada | Sinal não conectado | Aba Node → `pressed` → Connect no `Loja` |
| F5 abre o Player, não a loja | Main Scene antiga | **F6** nesta cena |
| Texto ilegível / minúsculo | Viewport retrô Aula 04 | Aumentar font size nos Labels |
| Raiz é `Node2D` | Confusão mundo × UI | Nova cena `Control`; refazer ou mover filhos |
| Quer fazer loot box “só de brincadeira” | Fora da ementa | Preço fixo determinístico — sem sorte |

---

## Desafio opcional (depois do artefato)

Quem terminar cedo pode refatorar as três compras em uma função auxiliar (ver comentários no final de `loja-exemplo.gd`). **Não é obrigatório** no dia 1 de GDScript.
