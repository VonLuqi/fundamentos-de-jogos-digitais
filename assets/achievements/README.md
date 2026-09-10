# Álbum de Relíquias — artes WebP

Coloque aqui as artes finais das figurinhas. Enquanto a arte final não existir, use um **placeholder** `.webp` 512×512 (já há stubs para todas as conquistas do catálogo).

## Convenção

- Arquivo: `{achievementId}.webp`
- Exemplo: `segredo_alquimista_da_fisica.webp`
- Tamanho alvo: ~512×512, fundo transparente quando possível

## Catálogo (fonte de verdade das artes)

Lista em `catalog.json` (mesmo espírito de `assets/avatars/catalog.stub.json`).

Ao adicionar ou trocar uma arte:

1. Coloque o `.webp` nesta pasta
2. Inclua/atualize a entrada no `catalog.json`:

```json
{ "file": "segredo_cartografo_do_inspector.webp" }
```

O `id` é o nome do arquivo sem `.webp`. Se precisar de id diferente:

```json
{ "id": "outro_id", "file": "arte-custom.webp" }
```

Sem entrada no catálogo, a UI continua com emoji (sem 404).

## Molduras

As molduras são **CSS** (borda material por raridade). Pedra usa `clip-path` irregular — não há `frames/*.webp` no momento.

**Única** é **full art**: a WebP cobre o card inteiro (`object-fit: cover`); nome e badge ficam por cima. Demais raridades usam a arte só na área útil entre título e selo (`contain`).

## IDs das conquistas

Fonte de verdade do *conteúdo* (nome, raridade, etc.): `data/game-catalog.json`.

| ID | Nome | Secreta |
| --- | --- | --- |
| `aula1_concluida` | Primeira Travessia | não |
| `gdd_integracao_documental` | O Escriba do Submundo | não |
| `segredo_cartografo_do_inspector` | Cartógrafo do Inspector | sim |
| `segredo_alquimista_da_fisica` | Alquimista da Física | sim |
| `segredo_juramento_do_circulo` | Juramento do Círculo | sim |
| `aula2_concluida` | Primeiro Passo do Herói | não |
| `segredo_lexico_do_desenvolvedor` | Léxico do Desenvolvedor | sim |
| `segredo_arquiteto_de_cenas` | Arquiteto de Cenas | sim |
| `segredo_cartografo_do_input` | Cartógrafo do Input | sim |
| `soberano_do_submundo` | Soberano do Submundo | sim |
| `grimorio_primeira_inscricao` | Primeira Inscrição | não |
| `grimorio_elo_da_trilha` | Elo da Trilha | não |
| `grimorio_dez_inscricoes` | Arquivo do Submundo | não |
| `grimorio_revelacao` | Véu Erguido | não |
| `grimorio_vinculo_oculto` | Vínculo Oculto | sim |
| `grimorio_eco_invertido` | Eco Invertido | sim |
| `grimorio_escriba_ritual` | Escriba Ritual | sim |
| `grimorio_cartografo_pessoal` | Cartógrafo Pessoal | sim |
| `grimorio_fixador` | Fixador do Véu | não |
| `grimorio_eco_clonado` | Eco Clonado | não |

Arquivos esperados (um por conquista):

```text
aula1_concluida.webp
gdd_integracao_documental.webp
segredo_cartografo_do_inspector.webp
segredo_alquimista_da_fisica.webp
segredo_juramento_do_circulo.webp
aula2_concluida.webp
segredo_lexico_do_desenvolvedor.webp
segredo_arquiteto_de_cenas.webp
segredo_cartografo_do_input.webp
soberano_do_submundo.webp
grimorio_primeira_inscricao.webp
grimorio_elo_da_trilha.webp
grimorio_dez_inscricoes.webp
grimorio_revelacao.webp
grimorio_vinculo_oculto.webp
grimorio_eco_invertido.webp
grimorio_escriba_ritual.webp
grimorio_cartografo_pessoal.webp
grimorio_fixador.webp
grimorio_eco_clonado.webp
```
