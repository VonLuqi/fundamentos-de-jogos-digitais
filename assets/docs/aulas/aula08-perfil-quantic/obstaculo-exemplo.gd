extends AnimatableBody2D
## Aula 08 — obstáculo móvel (script-espelho · trilha Ação)
## Preferir construir por etapas na Oficina (bloco Copiar código).
## Hierarquia: Obstaculo (AnimatableBody2D) → Sprite2D + CollisionShape2D
## Ajuste distance e speed no Inspector.
## Dica: deixe o obstáculo no ar (não encravado no chão StaticBody2D).

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
