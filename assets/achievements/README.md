# Álbum de Relíquias — artes WebP

Coloque aqui as artes finais das figurinhas.

## Convenção

- Arquivo: `{achievementId}.webp`
- Exemplo: `segredo_alquimista_da_fisica.webp`
- Tamanho alvo: ~512×512, fundo transparente quando possível

## Catálogo (fonte de verdade)

Lista em `catalog.json` (mesmo espírito de `assets/avatars/catalog.stub.json`).

Ao adicionar uma arte:

1. Coloque o `.webp` nesta pasta
2. Inclua uma entrada no `catalog.json`:

```json
{ "file": "segredo_cartografo_do_inspector.webp" }
```

O `id` é o nome do arquivo sem `.webp`. Se precisar de id diferente:

```json
{ "id": "outro_id", "file": "arte-custom.webp" }
```

Sem entrada no catálogo, a UI continua com emoji (sem 404).

Presentes hoje: ver `catalog.json`.

## IDs das conquistas

Fonte de verdade do *conteúdo* (nome, raridade, etc.): `RAW_ACHIEVEMENTS` em `js/api.js`.

| ID | Nome | Secreta |
| --- | --- | --- |
| `aula1_concluida` | Primeira Travessia | não |
| `gdd_integracao_documental` | Escriba do Submundo | não |
| `segredo_cartografo_do_inspector` | Cartógrafo do Inspector | sim |
| `segredo_alquimista_da_fisica` | Alquimista da Física | sim |
| `segredo_juramento_do_circulo` | Juramento do Círculo | sim |

Arquivos esperados:

```text
aula1_concluida.webp
gdd_integracao_documental.webp
segredo_cartografo_do_inspector.webp
segredo_alquimista_da_fisica.webp
segredo_juramento_do_circulo.webp
```
