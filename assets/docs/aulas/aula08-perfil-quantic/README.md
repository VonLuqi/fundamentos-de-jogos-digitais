# Aula 08 — Perfis Quantic Foundry + Labirinto direcionado (Godot 4)

> **Página da aula:** `pages/aula8.html`  
> **Scripts-espelho:** [`camera-player-exemplo.gd`](./camera-player-exemplo.gd) · [`moeda-brilhante-exemplo.gd`](./moeda-brilhante-exemplo.gd) · [`plataforma-exemplo.gd`](./plataforma-exemplo.gd)  
> **Folha Fase 1 (imprimir 1× aluno):** [`folha-fase1.pdf`](./folha-fase1.pdf) · fonte [`folha-fase1.md`](./folha-fase1.md)  
> **Quadro ofícios:** [`quadro-atribuicao.md`](./quadro-atribuicao.md)  
> **Árvore:** [`estrutura-pastas.txt`](./estrutura-pastas.txt)  
> **Plano:** `docs/plano-aula8-perfis-quantic-foundry.md`

**2 encontros** · individual ou **dupla** (Design do perfil × Programação das mecânicas).  
Continuar **`LabirintoDeMoedas`**. **E1:** `Camera2D` no Player. Escolher **uma** trilha: Conquista **ou** Ação.

O código completo para copiar está na **Oficina** da plataforma (botão Copiar código).

---

## Fora do escopo

| Permitido | Proibido |
| :--- | :--- |
| `Camera2D` follow + uma trilha (Conquista **ou** Ação) | As duas trilhas no mesmo MVP |
| Continuar Labirinto local | Pasta sync / Drive no Godot |
| Solo ou dupla | Trios · loja Aula 06 · combate/HP · multiplayer |

---

## Checklist

- [ ] Folha Fase 1 preenchida (plataformas + moedas + trilha)
- [ ] `Camera2D` filha do Player (vista segue ao andar)
- [ ] Perfil Quantic Foundry escrito no diário
- [ ] Uma trilha jogável (segredo+moeda brilhante **ou** plataforma móvel)
- [ ] ≥3 itens fora do escopo
- [ ] Diário finalizado (cada aluno)

---

## Encontro 1 — Design direcionado (folha)

1. Mestre imprime [`folha-fase1.pdf`](./folha-fase1.pdf) — **uma por aluno** (regenerar: `python scripts/build-aula08-folha-fase1-pdf.py`).
2. Preencher perfil QF, trilha, mapa (plataformas `P`, moedas `M`/`★`), peça da trilha, fora do escopo.
3. Só depois: Godot (câmera + montar o esboço).

---

## Encontro 1 — Câmera

1. Em `player.tscn`: Add Child → `Camera2D` sob o `Player`.
2. Inspector: **Enabled** (e **Current** se aparecer).
3. Opcional: Position Smoothing · ou script [`camera-player-exemplo.gd`](./camera-player-exemplo.gd).
4. F5: a vista acompanha o personagem — pronto para level design.

## Trilha Conquista

1. Desvio / gap / altura no `cenario.tscn`.
2. No `player.gd`: `moedas_secretas` + `coletar_moeda_secreta` (bloco da Oficina).
3. Moeda especial com brilho (script-espelho ou bloco da Oficina) — chama `coletar_moeda_secreta`.
4. Conectar `body_entered` → coleta secreta + `queue_free`.

## Trilha Ação

1. Nó `Plataforma` (`AnimatableBody2D`) + shape.
2. Script ping-pong (`plataforma-exemplo.gd`).
3. Playtest: timing para cruzar / subir.

---

*Material da Aula 08 · Módulo 2 · Quantic Foundry + Labirinto.*
