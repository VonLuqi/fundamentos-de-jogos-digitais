extends Area2D
## Aula 08 — moeda brilhante (script-espelho · trilha Conquista)
## Preferir construir por etapas na Oficina (bloco Copiar código).
## Hierarquia: Moeda (Area2D) → Sprite2D + CollisionShape2D
## Conectar body_entered → _on_body_entered

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
	if body.has_method("coletar_moeda"):
		body.coletar_moeda()
	queue_free()
