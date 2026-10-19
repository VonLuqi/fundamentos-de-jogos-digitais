extends AnimatableBody2D
## Aula 08 — obstáculo móvel (script-espelho · trilha Ação)
## Preferir construir por etapas na Oficina (bloco Copiar código).
## Hierarquia: Obstaculo (AnimatableBody2D) → Sprite2D + CollisionShape2D
## Ajuste distance e speed no Inspector.

@export var distance: float = 120.0
@export var speed: float = 80.0

var _origin: Vector2
var _dir: float = 1.0


func _ready() -> void:
	_origin = global_position


func _physics_process(delta: float) -> void:
	global_position.x += _dir * speed * delta
	if absf(global_position.x - _origin.x) >= distance:
		_dir *= -1.0
		global_position.x = _origin.x + _dir * distance
