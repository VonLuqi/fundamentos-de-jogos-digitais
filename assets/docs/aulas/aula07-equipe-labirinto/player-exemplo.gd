extends CharacterBody2D
## Aula 07 — Player + contador de moedas (script-espelho)
## Preferir construir por etapas na sala (Bloco Godot do README).
## Hierarquia esperada:
##   Player (CharacterBody2D)  ← grupo "player" (Inspector → Node → Groups)
##   ├── Sprite2D
##   └── CollisionShape2D
##
## Input Map (Project → Project Settings → Input Map), iguais à Aula 02:
##   ir_cima · ir_baixo · ir_esquerda · ir_direita
##
## Movimento = Módulo 1. Coleta = método chamado pela Moeda (Area2D).

@export var speed: float = 200.0

## Contador mínimo da aula — "conta 1" (ou mais, se houver várias moedas).
var moedas: int = 0


func _ready() -> void:
	add_to_group("player")


func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ir_esquerda", "ir_direita", "ir_cima", "ir_baixo")
	velocity = direction * speed
	move_and_slide()


## Chamado por moeda.gd quando o Player entra na Area2D.
func coletar_moeda() -> void:
	moedas += 1
	print("Moedas: %d" % moedas)
