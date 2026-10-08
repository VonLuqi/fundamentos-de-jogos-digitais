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
