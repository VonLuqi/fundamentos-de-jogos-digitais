# Plano — Grimório: visão, edição, tags, clone e recusa

## Contexto

O card da inscrição abria direto o formulário em [`pages/grimorio-nota.html`](../pages/grimorio-nota.html). Reveladas usavam o mesmo form desabilitado, sem clonar/recusar. Marcas eram texto com vírgula. Não havia atalho para a aula ligada.

## Task 0 — Decisões (fechada)

| # | Tema | Decisão |
| --- | --- | --- |
| 1 | Visualizar vs Editar | **B — duas rotas**: visualização ≠ edição |
| 2 | Clonar / Recusar revelada | **C — clonar** cria cópia com origem `@autor` e some das Reveladas; **recusar** remove o share **e avisa o dono** (notificação mínima via `user_note_events`) |

### Ideias acolhidas

| Ideia | Camada |
| --- | --- |
| Chips de marcas (Enter / vírgula / Backspace / X na edição; só leitura na view) | MVP |
| Atalho na view → aula + **Voltar à inscrição** na aula (`?fromNote=`) | MVP |
| Ações no card revelada (Clonar / Recusar) | MVP |
| Estado visível ao dono (“velada por @x” / “copiada por @x”) | MVP |
| Copiar link da inscrição | MVP |
| “Espelhar na trilha” | Fase seguinte |

## Rotas

| Rota | Arquivo | Papel |
| --- | --- | --- |
| Lista | `pages/grimorio.html` | Próprias + reveladas |
| Visão | `pages/grimorio-nota.html?id=` | Leitura (owner / recipient / admin) |
| Edição | `pages/grimorio-editar.html` / `?id=` | Só owner; create sem id |

`ROUTES.grimorioNota(id)` → visão · `ROUTES.grimorioEditar(id?)` → edição.

Após Guardar/criar → `location.replace` para a visão.

## Clone / recusa

- **Clonar:** copia título/corpo/tags/`lesson_id` (gate de aula); `pinned=false`; `cloned_from_note_id`; remove share; evento `cloned_by`.
- **Recusar:** remove share; evento `veiled_by_recipient`; nota do dono intacta.

## Schema

Ver `db/migrate-2026-09-08-note-clone-events.sql` e `db/setup.sql`.

## Fases

0. Task 0 + este doc  
1. Rotas visão/edição  
2. Chips de marcas  
3. Atalho aula ↔ fromNote  
4. Clone / refuse / events  
5. Card actions + copiar link  
6. Smoke  

## Critérios de aceite

- Card → visão (não form)  
- Guardar → visão  
- Editar só owner na rota de edição  
- Enter nas marcas → chip  
- View com aula → atalho; aula com `fromNote` → volta  
- Clonar / recusar conforme Task 0–2C  
- Recipient não edita nem revela
