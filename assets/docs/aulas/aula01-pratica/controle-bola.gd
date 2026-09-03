extends RigidBody2D

var _massa: float = 1.0
var _gravidade_da_cena: float = 1.0
var _friccao: float = 0.5
var _elasticidade: float = 0.2

@export_range(100.0, 5000.0, 50.0) var forca_de_movimento: float = 1600.0
@export_range(100.0, 5000.0, 50.0) var impulso_de_pulo: float = 420.0

@export_range(0.1, 50.0, 0.1) var massa: float = 1.0:
	set(value):
		_massa = maxf(value, 0.1)
		if is_inside_tree():
			mass = _massa
	get:
		return _massa

@export_range(0.0, 10.0, 0.1) var gravidade_da_cena: float = 1.0:
	set(value):
		_gravidade_da_cena = maxf(value, 0.0)
		if is_inside_tree():
			gravity_scale = _gravidade_da_cena
	get:
		return _gravidade_da_cena

@export_range(0.0, 2.0, 0.01) var friccao: float = 0.5:
	set(value):
		_friccao = clampf(value, 0.0, 2.0)
		_update_physics_material()
	get:
		return _friccao

@export_range(0.0, 2.0, 0.01) var elasticidade: float = 0.2:
	set(value):
		_elasticidade = clampf(value, 0.0, 2.0)
		_update_physics_material()
	get:
		return _elasticidade

func _ready() -> void:
	physics_material_override = PhysicsMaterial.new()
	_update_from_exports()
	can_sleep = false
	contact_monitor = true
	max_contacts_reported = 8
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

func _physics_process(_delta: float) -> void:
	var direction := Input.get_axis("ui_left", "ui_right")
	if direction != 0.0:
		apply_central_force(Vector2(direction * forca_de_movimento, 0.0))

	if (Input.is_action_just_pressed("ui_accept") or Input.is_action_just_pressed("ui_up")) and _is_grounded():
		apply_central_impulse(Vector2.UP * impulso_de_pulo)

func _is_grounded() -> bool:
	return ground_contacts > 0

func _on_body_entered(_body: Node) -> void:
	ground_contacts += 1

func _on_body_exited(_body: Node) -> void:
	ground_contacts = maxi(ground_contacts - 1, 0)

var ground_contacts: int = 0

func _update_from_exports() -> void:
	mass = _massa
	gravity_scale = _gravidade_da_cena
	_update_physics_material()

func _update_physics_material() -> void:
	if physics_material_override == null:
		physics_material_override = PhysicsMaterial.new()
	physics_material_override.friction = _friccao
	physics_material_override.bounce = _elasticidade