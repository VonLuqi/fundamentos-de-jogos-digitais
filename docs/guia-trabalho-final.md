# Trabalho de Conclusão — A Última Forja do Labirinto

## Objetivo

Reconstrua, com autonomia e ajuda apenas dos colegas, algo parecido com o que fizemos nas Aulas 02–08. O objetivo é demonstrar que você consegue montar, entender e testar um pequeno projeto Godot 4: personagem, identidade visual, tela retrô, decisões de design saudável, loja cosmética e labirinto com coleta orientado a um perfil de jogador.

Não precisa reproduzir a arte pixel por pixel. Faça um projeto pequeno que funcione e cujas decisões você consiga explicar. Consulte este guia e os materiais das aulas; teste uma etapa antes de avançar.

## O que entregar

Envie **um arquivo .zip com o projeto Godot inteiro**, incluindo **project.godot**, cenas, scripts, imagens e demais recursos utilizados, **SEM a pasta .godot/**. Envie pelo site, na área **Trabalho Final**, **até o último dia de aula**. Um executável, vídeo ou print sozinho não substitui o projeto editável.

Inclua na raiz um `LEIA-ME.txt` com seu nome, colegas que ajudaram, versão da Godot, controles, cenas de demonstração, perfil escolhido, decisões de design saudável e um pequeno diário de testes. Este texto permite ao avaliador encontrar cada parte.

Para reunir as sete aulas em uma entrega, este guia usa um projeto chamado `TrabalhoFinal`, com a loja em cena independente e o labirinto como cena principal. **Essa organização é uma versão de referência para a entrega**: em sala, a Aula 07 iniciou um projeto novo. Não é necessário integrar o saldo da loja à coleta do labirinto; a Aula 06 usa uma simulação própria.

## Checklist de avaliação — 30 pontos

O **Trabalho Final vale 30 pontos**. A avaliação considera as evidências abaixo; os pesos somam **2 + 4 + 4 + 2 + 6 + 6 + 6 = 30 pontos**.

- [ ] **2 pontos — Entrega:** o ZIP abre como projeto na Godot 4, contém `project.godot` e os recursos e não contém `.godot/`.
- [ ] **4 pontos — Aula 02:** Player com sprite, colisão, quatro ações no Input Map e movimento.
- [ ] **4 pontos — Aulas 03–04:** identidade visual explicada, pixel art nítida e viewport retrô proporcional.
- [ ] **2 pontos — Aula 05:** explicação de uma decisão de design saudável e de como preservar o loop do jogo.
- [ ] **6 pontos — Aula 06:** loja com três cosméticos, preços fixos, saldo visível, coleta simulada e bloqueios de compra.
- [ ] **6 pontos — Aula 07:** moeda desenhada/importada, coleta que remove a moeda e conta pontos, pastas organizadas e diário.
- [ ] **6 pontos — Aula 08:** câmera acompanhando o Player e **uma** trilha implementada — Conquista ou Ação — com justificativa do perfil e playtest.

## Aula 02 — O Player e o vocabulário do desenvolvedor

**O que construir:** personagem controlável em quatro direções. O core loop futuro será andar → coletar → explorar.

### Comece aqui — criar o projeto

1. Abra a Godot 4 → **New Project / Novo Projeto** → nome `TrabalhoFinal`; escolha uma pasta local fora de OneDrive/Drive. Use o renderizador **Compatibility** para este projeto 2D simples.
2. Em **FileSystem**, botão direito na raiz → **New Folder**. Crie `cenas`, `scripts`, `sprites`, `ui` e `audio`.
3. Para criar uma cena: **Scene → New Scene → Other Node**, escolha o tipo e renomeie a raiz. Para adicionar filhos: selecione o pai e use **Add Child Node**. Salve com Ctrl+S.
4. **F6** executa a cena aberta; **F5** executa a cena principal; **F8** para. Salve antes de testar. Nomes e maiúsculas dos nós precisam corresponder aos scripts.
5. Nos códigos abaixo, cada bloco com caminho de arquivo representa o **arquivo completo** daquela etapa. Substitua o conteúdo do arquivo indicado; não cole um segundo `extends` ou duas funções `_ready()` no mesmo script.

### Monte o Player e a cena principal

1. Crie `Player` (`CharacterBody2D`) e salve em `cenas/player.tscn`. Filhos: `Sprite2D` e `CollisionShape2D`.
2. No Inspector do Sprite2D, arraste `icon.svg` (criado pela Godot na raiz do projeto) para **Texture** e ajuste **Transform → Scale** para `(0.25, 0.25)`. Esse ícone é provisório; você o trocará pela sua arte na Aula 03. Na colisão: **New RectangleShape2D**, Size `(16, 20)`, centralizado no personagem.
3. Em **Project → Project Settings → Input Map**, crie `ir_esquerda`, `ir_direita`, `ir_cima` e `ir_baixo`. Em cada ação, use **+ → Key** e associe, respectivamente, A/seta esquerda, D/seta direita, W/seta cima e S/seta baixo.
4. No Inspector do Player → **Motion Mode**, use **Floating** para esta movimentação vista de cima. Em **Collision**, deixe Layer `1` e Mask `1` ligados.
5. Anexe `scripts/player.gd` à raiz. Copie o código ensinado na Aula 02.
6. Crie `Cenario` (`Node2D`), salve em `cenas/cenario.tscn` e arraste `player.tscn` do FileSystem para a árvore. Posicione a instância em `(80, 100)`.
7. Em **Project Settings → Application → Run → Main Scene**, selecione `cenas/cenario.tscn`; também pode pressionar F5 e escolher essa cena quando solicitado.

### scripts/player.gd — movimento da Aula 02

```gdscript
extends CharacterBody2D

@export var speed: float = 200.0

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ir_esquerda", "ir_direita", "ir_cima", "ir_baixo")
	velocity = direction * speed
	move_and_slide()
```

**Teste de passagem:** F5, clique na janela do jogo e mova em todas as direções. Neste movimento não há gravidade nem pulo; `ir_cima` move o personagem para cima. Essa escolha será preservada no labirinto.

## Aula 03 — A máscara cultural e o pixel nítido

**O que construir:** identidade visual própria para o personagem, inspirada em folclore, fauna, paisagem ou cotidiano brasileiro.

1. No LibreSprite, crie ou personalize uma pequena imagem (por exemplo, 16×16 ou 32×32). Exporte um **PNG** com transparência para `sprites/hero.png`. Se usar um asset do material da aula, registre sua origem e respeite a licença fornecida.
2. Abra `cenas/player.tscn`, selecione `Sprite2D` e arraste o PNG para **Texture**. Se antes usou o ícone reduzido, restaure o Scale do Sprite para `(1, 1)`.
3. No Inspector do Sprite: **CanvasItem → Texture → Filter → Nearest**. Isso evita suavizar os pixels.
4. Ajuste o tamanho da **Shape** da `CollisionShape2D` para cobrir o corpo; não deixe a colisão enorme por causa da textura anterior.
5. Salve e teste o Player em `cenario.tscn`. Explique no LEIA-ME qual referência cultural aparece na arte e que papel tem no jogo.

**Código nesta aula:** mantenha integralmente `scripts/player.gd` da Aula 02. O mínimo funcional desta etapa é a configuração do Sprite pelo Inspector; não há um script novo na oficina.

**Teste de passagem:** personagem visível, pixels nítidos e colisão alinhada. Animações não são necessárias.

## Aula 04 — O contrato da tela retrô

**O que construir:** uma tela de baixa resolução que cresce sem deformar os pixels.

1. Abra **Project → Project Settings → Display → Window**. Ative **Advanced Settings** se uma opção estiver oculta.
2. Em **Size**, defina **Viewport Width = 480** e **Viewport Height = 270** (uma das resoluções propostas na aula).
3. Defina **Window Width Override = 960** e **Window Height Override = 540** para abrir uma janela confortável.
4. Em **Stretch**, escolha **Mode = viewport**, **Aspect = keep** e **Scale Mode = integer**. Se sua versão não exibir Scale Mode, use a versão Godot 4 adotada na turma que oferece essa opção.
5. Confirme o filtro Nearest nos sprites. Rode F5 e redimensione a janela: barras nas bordas são aceitáveis; deformação do personagem não.
6. Registre a resolução e uma relação com as restrições dos consoles clássicos: poucos pixels exigem silhuetas e informação visual claras.

**Código nesta aula:** preserve o script do Player. As configurações ficam salvas em `project.godot`; não é preciso editar esse arquivo à mão nem adicionar código.

**Teste de passagem:** personagem mantém a proporção e os pixels ao mudar o tamanho da janela.

## Aula 05 — Design saudável

**O que construir:** uma decisão documentada de adequação do conteúdo. Esta aula foi **sem Godot e sem script novo**: ClassInd-dle e Patch Note de Higienização.

1. Descreva o loop do seu projeto: explorar, desviar e coletar.
2. Escreva no LEIA-ME um pequeno **antes → depois** de feedback. Versão de referência: “Antes: a recompensa usava imagens de ferimentos; depois: a coleta mostra um brilho e uma contagem. O objetivo de alcançar a recompensa permanece”. Se esse conteúdo nunca existiu no seu jogo, identifique-o como uma proposta hipotética de redesign.
3. Explique qual conteúdo foi suavizado e por que isso preserva a mecânica. Registre uma faixa pretendida como exercício pedagógico, sem apresentar o texto como classificação oficial.
4. Na Godot, confira as texturas do `Sprite2D`, os textos dos `Label` e os sons que realmente utiliza. Substitua o recurso no Inspector se ele não combinar com sua decisão.

**Código nesta aula:** o jogo continua usando o movimento completo da Aula 02. Uma mudança visual/documental não exige um script artificial.

**Teste de passagem:** o texto descreve o que o avaliador encontra no jogo e distingue proposta de mudança de mudança realmente aplicada.

## Aula 06 — O balcão sem azar

**O que construir:** cena separada de loja, com saldo inicial 10, coleta simulada de +5 e três cosméticos de preços 5, 12 e 20. Compras não usam dinheiro real nem sorte e não precisam trocar o sprite do personagem.

1. Crie a raiz `Loja` (`Control`), salve em `ui/loja.tscn` e selecione **Layout → Anchors Preset → Full Rect**.
2. Adicione os nós abaixo, respeitando nomes, maiúsculas e hierarquia. O tipo aparece entre parênteses. Use **Add Child Node** no pai correto.

```text
Loja (Control)
└── PainelFundo (PanelContainer)
    └── Margem (MarginContainer)
        └── VBoxPrincipal (VBoxContainer)
            ├── Titulo (Label)
            ├── LabelMoedas (Label)
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

3. Selecione `PainelFundo`, use **Full Rect** e offsets zero. Em `Margem → Theme Overrides → Constants`, configure as quatro margens como `8`. Os Containers organizam os filhos automaticamente.
4. Para caber em 480×270, selecione `Loja → Theme → New Theme`; expanda o recurso e use **Default Font Size = 12**. Em `VBoxPrincipal → Theme Overrides → Constants → Separation`, use `4`. Essa compactação é uma **versão de referência de layout** para reunir as aulas.
5. Em **Text**, preencha: Titulo = “Loja do Submundo”; LabelMoedas = “Moedas: 10”; LabelChapeu = “Chapéu espectral — 5 moedas”; LabelCapa = “Capa de névoa — 12 moedas”; LabelAura = “Aura de carvão — 20 moedas”. Botões de compra = “Comprar”; BtnGanharMoeda = “Coletar moeda da fase (+5)”.
6. Nos três Labels de produto, marque **Layout → Container Sizing → Horizontal → Expand + Fill**, para o botão ficar ao lado. Em `LabelStatus`, escolha **Autowrap Mode → Word Smart** e tamanho mínimo vertical `34`; isso acomoda as mensagens em duas linhas.
7. Anexe `ui/loja.gd` à raiz e copie o código completo abaixo, do material da Aula 06 (sem o apêndice opcional).
8. Selecione cada Button → **Node → Signals → pressed → Connect**; receptor `Loja`. Informe os métodos: BtnGanharMoeda → `_on_btn_ganhar_moeda_pressed`; BtnComprarChapeu → `_on_btn_comprar_chapeu_pressed`; BtnComprarCapa → `_on_btn_comprar_capa_pressed`; BtnComprarAura → `_on_btn_comprar_aura_pressed`. As funções já existem; não crie duplicatas.
9. Execute a loja com **F6**. Ela é uma demonstração independente e reinicia o saldo quando aberta novamente. F5 continua abrindo o labirinto.

### ui/loja.gd — código do material da Aula 06

```gdscript
extends Control
## Aula 06 — Loja ética (script-espelho)
## Preferir construir por etapas na sala (Blocos 3–4 do README).
## Hierarquia esperada: Loja → PainelFundo → Margem → VBoxPrincipal → …
## Sem loot box / randi() / IAP real — só moedas ganhas jogando + preço fixo.

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


func _on_btn_ganhar_moeda_pressed() -> void:
	moedas += GANHO_FASE
	label_status.text = "Você coletou +%d moedas na fase." % GANHO_FASE
	_atualizar_hud()


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


func _on_btn_comprar_capa_pressed() -> void:
	if tem_capa:
		label_status.text = "Você já possui a Capa. Sem recompra forçada."
		return
	if moedas < PRECO_CAPA:
		label_status.text = "Moedas insuficientes. Volte à fase e colete mais."
		return
	moedas -= PRECO_CAPA
	tem_capa = true
	btn_capa.disabled = true
	btn_capa.text = "Adquirido"
	label_status.text = "Capa de névoa adquirida. Cosmético — sem vantagem injusta."
	_atualizar_hud()


func _on_btn_comprar_aura_pressed() -> void:
	if tem_aura:
		label_status.text = "Você já possui a Aura. Sem recompra forçada."
		return
	if moedas < PRECO_AURA:
		label_status.text = "Moedas insuficientes. Volte à fase e colete mais."
		return
	moedas -= PRECO_AURA
	tem_aura = true
	btn_aura.disabled = true
	btn_aura.text = "Adquirido"
	label_status.text = "Aura de carvão adquirida. Cosmético — sem vantagem injusta."
	_atualizar_hud()
```

**Teste de passagem:** com 10 moedas, tente a Capa (nega por falta de saldo); compre o Chapéu (saldo 5 e botão Adquirido); colete duas vezes (saldo 15); compre a Capa (saldo 3). Aura só libera quando você juntar 20. Nenhuma compra deixa saldo negativo ou permite recompra.

## Aula 07 — Arte, coleta e trabalho organizado

**O que construir:** a moeda e sua coleta no labirinto. Em sala, os ofícios eram Arte da moeda × Programação da coleta. Aqui você refaz ambos, podendo trocar ajuda com colegas.

1. No diário, liste os ofícios, o que foi feito e pelo menos três itens fora do escopo, por exemplo combate, multiplayer e NPCs. Use etapas pequenas: ideia → MVP → produção → integração → playtest.
2. Desenhe a moeda no LibreSprite e exporte `sprites/moeda.png` (16×16 ou 32×32). O projeto permanece no disco local. Registre versões com data e combine quem edita cada cena; o diário compartilhado do site não sincroniza os arquivos Godot.
3. Crie `Moeda` (`Area2D`) em `cenas/moeda.tscn`, com filhos `Sprite2D` (Texture = moeda.png, Filter = Nearest) e `CollisionShape2D` (Shape = New CircleShape2D cobrindo a moeda).
4. Na raiz Moeda → **Monitoring = On**; em Collision, Mask `1`. O Player deve ter Collision Layer `1`. A Area2D detecta o corpo e não funciona como parede.
5. Substitua `scripts/player.gd` pelo arquivo completo abaixo: é o movimento da Aula 02 acrescido do grupo e contador da Aula 07. Não altere as ações do Input Map.

### scripts/player.gd — movimento e coleta do material da Aula 07

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

6. Anexe `scripts/moeda.gd` à raiz `Moeda` e copie o script abaixo, presente na aula.
7. Selecione `Moeda` → **Node → Signals → body_entered → Connect** → receptor Moeda, método `_on_body_entered`. Salve. Faça a conexão **uma vez**, pelo editor.

### scripts/moeda.gd — código do material da Aula 07

```gdscript
extends Area2D
## Aula 07 — Moeda (script-espelho)
## Preferir construir por etapas na sala (Bloco E2.3 do README).
## Hierarquia esperada:
##   Moeda (Area2D)
##   ├── Sprite2D          ← textura = sprites/moeda.png (arte do LibreSprite)
##   └── CollisionShape2D  ← CircleShape2D cobrindo o sprite
##
## Conectar no editor (Node → Signals):
##   body_entered → Moeda → _on_body_entered
##
## O Player já tem movimento (Aula 02). Só precisa de:
##   add_to_group("player") + func coletar_moeda()

func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("coletar_moeda"):
		body.coletar_moeda()
	queue_free()
```

8. Abra `cenas/cenario.tscn`, que já contém o Player. Arraste `moeda.tscn` três vezes e coloque as instâncias em `(140, 100)`, `(210, 100)` e `(280, 140)`, sem sobrepor o Player.
9. Execute F5 e acompanhe o painel **Output** do editor: tocar cada moeda deve removê-la e mostrar `Moedas: 1`, depois `2` e `3`.
10. Registre quem fez a arte, quem ajudou na programação, o teste e a correção realizada. Na atividade original, cada aluno finalizava o diário na Oficina; para este trabalho, inclua o resumo no LEIA-ME do ZIP.

**Teste de passagem:** todas as moedas somem ao contato e contam uma vez. Ao reiniciar, os contadores voltam a zero; salvar progresso não faz parte deste exercício.

## Aula 08 — O labirinto feito para alguém

**O que construir:** nível com câmera e uma trilha ligada às motivações do jogador: **Conquista** (segredo e moeda especial) ou **Ação** (obstáculo móvel e timing). Escolha apenas uma. Design do perfil decide a experiência; programação implementa a mecânica.

### Primeiro: desenhe e monte o mapa

1. Antes da Godot, desenhe um mapa pequeno: entrada, caminho principal, moedas comuns e uma passagem lateral secreta ou corredor com obstáculo móvel. Escreva o perfil escolhido e por que essa mecânica o atende. A folha Fase 1 da aula é uma referência.
2. **Adaptação de referência:** o script de movimento ensinado é visto de cima, sem pulo. Neste guia, os blocos do mapa funcionam como paredes/corredores, e a plataforma móvel como obstáculo. Você pode recriar o desenho da aula de modo parecido, mantendo as áreas acessíveis com as quatro direções. Não adicione saltos que este código não implementa.
3. Em `cenas/cenario.tscn`, adicione paredes `StaticBody2D`, cada uma com `CollisionShape2D → RectangleShape2D` e um `Polygon2D` colorido cobrindo a mesma região. Mantenha Collision Layer `1`. Dimensione o recurso Shape, sem esticar o corpo físico.
4. Uma montagem inicial funcional: parede superior com centro `(480, -10)` e Size `(960, 20)`; inferior `(480, 280)` e Size `(960, 20)`; esquerda `(-10, 135)` e Size `(20, 270)`; direita `(970, 135)` e Size `(20, 270)`. Deixe o Player em `(80, 100)`.
5. Para criar o corredor e uma passagem lateral, adicione uma parede interior em `(400, 110)`, Size `(20, 220)`. Ela deixa uma passagem por baixo, entre y=220 e y=270. Coloque moedas à direita, por exemplo em `(520, 100)` e `(700, 160)`. O Player de 16×20 cabe no vão de 50 pixels.
6. Se duplicar paredes e editar o tamanho da Shape, escolha **Make Unique** no recurso antes de alterar: duplicatas podem compartilhar a mesma forma. Deixe visuais alinhados às colisões.

### A câmera acompanha o herói

1. Abra `cenas/player.tscn`, adicione `Camera2D` como **filha direta** de Player. Position `(0, 0)`, **Enabled = On**, Zoom `(1, 1)`. Deixe Position Smoothing desligado neste primeiro teste.
2. Salve e execute F5: o personagem fica acompanhado, inclusive ao passar de x=480. A câmera do editor 2D não é a câmera do jogo.
3. O Inspector já basta. Se precisar tornar essa câmera atual explicitamente, anexe **somente à Camera2D** `scripts/camera-player.gd`, com o código fornecido na aula:

### scripts/camera-player.gd — código opcional do material da Aula 08

```gdscript
extends Camera2D
## Aula 08 — câmera segue o Player (script-espelho · Encontro 1)
## Preferir: Camera2D filha do Player + Enabled no Inspector.
## Use este script só se a câmera não ficar ativa sozinha.

func _ready() -> void:
	make_current()
```

### Trilha Conquista — segredo e moeda brilhante

1. Posicione a moeda especial depois da passagem lateral, por exemplo `(700, 80)`, de modo que o caminho exija explorar. Teste se há passagem real; “difícil” não significa bloqueado por colisão.
2. Crie uma nova cena `MoedaBrilhante` (`Area2D`) em `cenas/moeda-brilhante.tscn`. Filhos `Sprite2D` e `CollisionShape2D`, configurados como a moeda comum. Não precisa herdar a cena nem manter o script antigo.
3. Anexe `scripts/moeda-brilhante.gd` à raiz. Conecte **body_entered → _on_body_entered** no editor, uma vez. Coloque uma instância na posição planejada.
4. Substitua `scripts/player.gd` pela versão completa abaixo. Ela reúne o movimento e os dois contadores ensinados nas aulas; a coleta especial é separada da comum.

### scripts/player.gd — versão consolidada de referência das Aulas 02, 07 e 08

```gdscript
extends CharacterBody2D

@export var speed: float = 200.0

var moedas: int = 0
var moedas_secretas: int = 0

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ir_esquerda", "ir_direita", "ir_cima", "ir_baixo")
	velocity = direction * speed
	move_and_slide()

func coletar_moeda() -> void:
	moedas += 1
	print("Moedas: %d" % moedas)

func coletar_moeda_secreta() -> void:
	moedas_secretas += 1
	print("Moedas secretas: %d" % moedas_secretas)
```

### scripts/moeda-brilhante.gd — código do material da Aula 08

```gdscript
extends Area2D
## Aula 08 — moeda brilhante (script-espelho · trilha Conquista)
## Preferir construir por etapas na Oficina (bloco Copiar código).
## Hierarquia: Moeda (Area2D) → Sprite2D + CollisionShape2D
## Conectar body_entered → _on_body_entered
##
## No player.gd (além da coleta da Aula 07):
##   var moedas_secretas: int = 0
##   func coletar_moeda_secreta() -> void:
##       moedas_secretas += 1
##       print("Moedas secretas: %d" % moedas_secretas)

@export var pulse_speed: float = 4.0
@export var pulse_amount: float = 0.15

var _base_scale: Vector2 = Vector2.ONE


func _ready() -> void:
	_base_scale = scale


func _process(_delta: float) -> void:
	var t := sin(Time.get_ticks_msec() * 0.001 * pulse_speed)
	var s := 1.0 + t * pulse_amount
	scale = _base_scale * s
	modulate = Color(1.0, 1.0, 0.7 + t * 0.3, 1.0)


func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("coletar_moeda_secreta"):
		body.coletar_moeda_secreta()
	queue_free()
```

**Teste Conquista:** moeda pulsa, pode ser alcançada pelo caminho, desaparece ao toque e mostra `Moedas secretas: 1` no Output. As moedas comuns continuam usando `scripts/moeda.gd` e o contador `Moedas`.

### Trilha Ação — obstáculo que vai e volta

Escolha esta seção **em vez da trilha Conquista** se seu perfil enfatiza ação e desafio. Pode manter `player.gd` da Aula 07; não é necessário contador secreto.

1. Crie `Plataforma` (`AnimatableBody2D`) em `cenas/plataforma.tscn`. Filhos `Sprite2D` com uma textura visível e `CollisionShape2D` com RectangleShape2D de `(32, 16)`. Ajuste a imagem para cobrir a colisão.
2. Mantenha **Sync to Physics = On** e Collision Layer `1`. Anexe `scripts/plataforma.gd`, abaixo.
3. Instancie em `cenario.tscn` em `(530, 135)`, numa área livre. O Inspector expõe **Distance = 120** e **Speed = 80**. Use distância positiva. O obstáculo percorrerá x=530 até x=650 e retornará.
4. Deixe espaço para o jogador desviar e moedas depois do trajeto. Não coloque o corpo dentro de paredes estáticas, do Player ou de outras plataformas. No movimento visto de cima, ele bloqueia o caminho; não causa dano nem exige pulo.

### scripts/plataforma.gd — código do material da Aula 08

```gdscript
extends AnimatableBody2D
## Aula 08 — plataforma móvel (script-espelho · trilha Ação)
## Preferir construir por etapas na Oficina (bloco Copiar código).
## Hierarquia: Plataforma (AnimatableBody2D) → Sprite2D + CollisionShape2D
## Ajuste distance e speed no Inspector.
## Dica: deixe a plataforma no ar (não encravada no chão StaticBody2D).

@export var distance: float = 120.0
@export var speed: float = 80.0

var _origin: Vector2
var _traveled: float = 0.0


func _ready() -> void:
	_origin = global_position


func _physics_process(delta: float) -> void:
	_traveled += speed * delta
	# 0 → distance → 0 → … sem inverter direção (evita teleporte/pisca).
	global_position.x = _origin.x + pingpong(_traveled, distance)
```

**Teste Ação:** obstáculo vai e volta suavemente; Player colide e consegue passar escolhendo o momento. Ajuste a velocidade no Inspector até o desafio ficar possível para um iniciante.

### Playtest e diário final

Peça a um colega para experimentar sem você explicar cada movimento. Registre: perfil-alvo, mecânica escolhida, o que o colega fez/sentiu e um ajuste que você realizou após observar. Explique como a motivação virou uma decisão concreta de mapa. Não é necessário implementar as duas trilhas ou acrescentar combate, chefe e loja dentro do labirinto.

## Conferência antes de enviar

1. Feche e reabra o projeto pelo `project.godot`.
2. F5 deve abrir `cenas/cenario.tscn`, com Player, moedas, câmera e trilha escolhida.
3. Abra `ui/loja.tscn` e use F6 para testar os quatro botões.
4. Confira o painel Debugger: resolva erros de script, recurso ausente e caminho de nó antes de compactar.
5. Finalize `LEIA-ME.txt`: autor; colegas; Godot 4.x usada; WASD/setas; F5 labirinto; F6 loja; identidade cultural; tela; design saudável; perfil; diário e teste.

## Como zipar o projeto — Windows

1. Salve todas as cenas e feche a Godot.
2. Abra o **Explorador de Arquivos** na pasta que contém `project.godot`. Em **Exibir → Mostrar → Itens ocultos**, habilite a visualização para identificar `.godot`.
3. Selecione `project.godot`, `cenas`, `scripts`, `sprites`, `ui`, `audio`, `LEIA-ME.txt` e os demais recursos usados (inclusive `icon.svg`, se alguma cena o referencia). Inclua arquivos `.uid` e `.import` existentes ao lado de scripts/imagens. **Não selecione a pasta `.godot/`**, que é cache gerado pela engine. Não confunda arquivos `.import` ao lado das imagens com a pasta de cache.
4. Com a seleção feita, botão direito → **Compactar para arquivo ZIP**. No Windows 10: **Enviar para → Pasta compactada**. Nome sugerido: `TrabalhoFinal_SeuNome.zip`. Não coloque o próprio ZIP dentro de um segundo ZIP.
5. Abra o ZIP e confira que `project.godot` e suas pastas estão presentes, sem `.godot/`. O projeto deve estar na raiz do ZIP ou dentro de uma única pasta claramente identificada.
6. **Teste de verdade:** extraia o ZIP para uma pasta local diferente. Na Godot Project Manager → **Import → Browse**, selecione o `project.godot` extraído, abra e aguarde a importação. Execute F5 no labirinto e F6 na loja. A Godot recriará `.godot/` na pasta extraída; isso é normal.
7. No site, abra **Trabalho Final**, escolha o ZIP conferido e conclua o envio **até o último dia de aula**. Aguarde a confirmação do site; selecionar o arquivo sem enviar não conclui a entrega.

## Problemas comuns

- **Player não anda:** confirme os quatro nomes `ir_*` no Input Map, as teclas e o foco na janela do jogo. O script precisa estar no CharacterBody2D.
- **Player desaparece ou não pula:** esta referência usa movimento em quatro direções, sem gravidade/pulo. Faça corredores acessíveis e confirme a câmera Enabled no Player.
- **Colisão não funciona:** cada corpo/área precisa de CollisionShape2D com Shape definida e não desabilitada. Para detectar o Player, a Mask da moeda deve incluir a Layer do Player (`1`). Use Debug → Visible Collision Shapes durante o teste.
- **Moeda não some:** verifique Monitoring, conexão `body_entered`, grupo `player` adicionado em `_ready()` e script anexado à raiz Area2D.
- **Moeda some, contador não cresce:** comum chama `coletar_moeda`; brilhante chama `coletar_moeda_secreta`. Confira a versão completa do Player e veja o Output.
- **Function already defined / extends inesperado:** você colou versões inteiras juntas. Use um único arquivo completo para a etapa atual, sem duplicar funções.
- **Node not found / acesso a null na loja:** confira cada nome e pai da árvore. Os caminhos `$PainelFundo/Margem/VBoxPrincipal/...` devem existir exatamente.
- **Botão não responde:** confira o sinal pressed conectado ao método certo da raiz Loja. Não conecte o mesmo sinal pelo editor e pelo script simultaneamente.
- **Loja cortada:** confirme fonte 12 no Theme da raiz, painel Full Rect, margens 8, separação 4 e quebra de linha no LabelStatus. Não aumente o tamanho mínimo dos filhos além do viewport 480×270.
- **Sprite borrado ou esticado:** Nearest no Sprite; viewport/keep/integer no Project Settings; verifique se não deformou o Scale do Sprite.
- **Todas as paredes mudam juntas:** Shape compartilhada; faça Make Unique antes de redimensionar uma duplicata.
- **Recurso ausente depois de extrair:** inclua todos os PNGs, SVGs, sons, cenas e scripts referenciados. Caminhos devem apontar para dentro do projeto (`res://`). Refaça o ZIP e o teste de extração.

## Materiais de origem

Este roteiro segue as páginas e os materiais das Aulas 02–08. As adaptações para reunir tudo num projeto, os exemplos de mapa e a consolidação do Player foram identificados como versões de referência.

- [Aula 02 — Player e Input Map](../pages/aula2.html) · [material](../assets/docs/aulas/aula02-player/README.md)
- [Aula 03 — pixel art e cultura](../pages/aula3.html)
- [Aula 04 — viewport retrô](../pages/aula4.html)
- [Aula 05 — design saudável](../pages/aula5.html)
- [Aula 06 — loja ética](../pages/aula6.html) · [material](../assets/docs/aulas/aula06-loja-etica/README.md)
- [Aula 07 — organização e coleta](../pages/aula7.html) · [material](../assets/docs/aulas/aula07-equipe-labirinto/README.md)
- [Aula 08 — perfis e mecânicas](../pages/aula8.html)
