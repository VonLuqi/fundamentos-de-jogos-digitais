extends Area2D
## Aula 07 — Moeda (script-espelho)
## Preferir construir por etapas na sala (Bloco Godot do README).
## Hierarquia esperada:
##   Moeda (Area2D)
##   ├── Sprite2D          ← textura = sprites/moeda.png (arte do LibreSprite)
##   └── CollisionShape2D  ← CircleShape2D (ou RectangleShape2D) cobrindo o sprite
##
## Conectar no editor (Node → Signals):
##   body_entered → Moeda → _on_body_entered
##
## MVP: some a moeda e pede +1 ao Player (grupo "player").

func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("coletar_moeda"):
		body.coletar_moeda()
	queue_free()
