extends Camera2D
## Aula 08 — câmera segue o Player (script-espelho · Encontro 1)
## Preferir: Camera2D filha do Player + Enabled no Inspector.
## Use este script só se a câmera não ficar ativa sozinha.

func _ready() -> void:
	make_current()
