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


## --- Desafio opcional (não obrigatório no dia 1) ---
## Substituir as três compras por algo como:
##
## func _tentar_comprar(nome: String, preco: int, flag: String, botao: Button) -> void:
##     if bool(get(flag)):
##         label_status.text = "Você já possui: %s." % nome
##         return
##     if moedas < preco:
##         label_status.text = "Moedas insuficientes para %s. Colete mais na fase." % nome
##         return
##     moedas -= preco
##     set(flag, true)
##     botao.disabled = true
##     botao.text = "Adquirido"
##     label_status.text = "%s adquirido. Cosmético — sem vantagem injusta." % nome
##     _atualizar_hud()
