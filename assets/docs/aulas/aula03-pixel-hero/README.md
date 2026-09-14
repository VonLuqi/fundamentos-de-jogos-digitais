# Aula 03 — Material Tiny Hero (Godot 4)

> **Download do pacote:** [`craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip`](./craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip)  
> **Licença / atribuição:** [`LICENCA.md`](./LICENCA.md)

Passo a passo para **importar pixel art**, configurar filtro **Nearest** e **personalizar** o Sprite do Player com um recorte cultural brasileiro.

Continue o projeto da **Aula 02** (Player que já anda). Não é necessário criar cena nova do zero.

---

## Checklist do artefato

Ao final, você deve ter:

- [ ] ZIP Tiny Hero baixado e extraído
- [ ] PNG importado em `res://sprites/hero/` (ou pasta equivalente)
- [ ] `Sprite2D` do Player usando a textura importada
- [ ] Filtro **Nearest** aplicado (nó e/ou projeto) — pixel nítido no Play
- [ ] Personalização cultural **Nível 1+** (visual e/ou justificativa escrita)
- [ ] `CollisionShape2D` ajustado à nova silhueta
- [ ] Movimento da Aula 02 ainda funcionando no **Play**
- [ ] Anotações + síntese enviadas na página da aula

---

## 0. Pré-requisitos

- Projeto Godot 4 da Aula 02 com:
  - `Player` (`CharacterBody2D` → `Sprite2D` + `CollisionShape2D`)
  - Input Map `ir_*`
  - `player.gd` com `move_and_slide`
- Editor de pixel **opcional** (LibreSprite, Piskel, Photopea, GIMP, Aseprite…) — a Godot só importa o resultado

---

## 1. Baixar e conhecer o pacote

1. Baixe [`craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip`](./craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip).
2. Extraia. Estrutura principal:

```text
1 Pink_Monster/   → Pink_Monster.png + sheets (Idle, Walk, Run…)
2 Owlet_Monster/  → Owlet_Monster.png + sheets
3 Dude_Monster/   → Dude_Monster.png + sheets
license.txt       → leia e respeite
```

3. Para o **MVP desta aula**, use o PNG base de um herói (ex.: `Owlet_Monster.png`) — um frame no `Sprite2D`.
4. Sheets (`*_Idle_*`, `*_Walk_*`…) são exploração; animação completa é bônus / aula futura.

---

## 2. Importar no FileSystem

1. Abra o projeto da Aula 02 na Godot 4.
2. No painel **FileSystem**, crie a pasta `sprites/hero` (botão direito → New Folder).
3. **Arraste e solte** o PNG escolhido para essa pasta (ou copie o arquivo na pasta do projeto no Explorer e volte à Godot).
4. Confirme que o arquivo aparece sob `res://sprites/hero/...` e que a Godot gerou metadados de importação.

Painéis úteis:

| Painel | Função |
| :--- | :--- |
| FileSystem | Onde os assets vivem (`res://`) |
| Scene | Hierarquia do Player |
| Inspector | Texture, Filter, Shape |
| Viewport 2D | Visualização + Play |

---

## 3. Pixel nítido (Nearest)

Na Godot 4, o filtro é definido no **uso** (CanvasItem) e/ou no **default do projeto**. Linear (padrão) **borra** pixel art; **Nearest** preserva o pixel duro.

### Caminho A — no nó (recomendado na turma)

1. Abra `player.tscn` e selecione o `Sprite2D`.
2. No Inspector: **CanvasItem → Texture → Filter** → `Nearest`  
   (em algumas builds: propriedade `texture_filter`).

### Caminho B — default do projeto (bom hábito)

1. **Project → Project Settings**.
2. Ative **Advanced Settings** se necessário.
3. **Rendering → Textures → Default Texture Filter** → `Nearest`.

### Observação (eco Aula 01)

1. Deixe em Linear → **Play** → note o blur.
2. Mude para Nearest → **Play** → note o pixel nítido.
3. Registre a diferença nas anotações da aula.

Opcional: no dock **Import** do PNG, Compress Mode **Lossless** para pixel art.

---

## 4. Ligar a textura ao Player

1. Com `player.tscn` aberto, selecione `Sprite2D`.
2. Em **Texture**, aponte para o PNG importado.
3. Ajuste a escala se o sprite estiver muito pequeno/grande.
4. Selecione `CollisionShape2D` e realinhe o shape à nova silhueta.
5. Pressione **Play** e confirme que o movimento da Aula 02 ainda funciona.

---

## 5. Personalização cultural

Escolha **uma** âncora e edite o PNG fora da Godot; depois substitua o arquivo em `res://sprites/hero/` para a engine reimportar.

| Âncora | Exemplos |
| :--- | :--- |
| **Folclore** | Saci, Curupira, Iara, Boitatá, Cuca… |
| **Fauna BR** | onça, tucano, mico-leão, jabuti, capivara… |
| **Urbano / regional** | símbolo da sua cidade, cordel, frevo, sertão… |

### Níveis de personalização

- **Nível 1 (mínimo):** recolor 1–2 cores **ou** crop + nome cultural + justificativa escrita clara.
- **Nível 2 (esperado):** acessório, silhueta ou paleta com a âncora visível.
- **Nível 3 (bônus):** sheet Idle/Walk com a mesma identidade — **sem** exigir `AnimatedSprite2D` nesta aula.

Trate lendas e povos com respeito. O valor está na **intenção cultural** + resultado no engine.

---

## 6. Ligação com a teoria

| Ideia | Onde aparece na prática |
| :--- | :--- |
| ***Homo Ludens*** | Cultura surge no jogo e pelo jogo — o herói vira máscara cultural. |
| **Círculo Mágico** | Dentro do mundo com regras, a identidade do sprite também comunica. |
| **Nearest** | Ofício técnico: deixar o pixel legível. |
| **Personalização** | Gesto de identidade: folclore / fauna / urbano BR. |

---

## Dúvidas comuns

**O sprite fica borrado**  
Confira Filter = **Nearest** no `Sprite2D` (e/ou default do projeto). Linear é o culpado mais comum.

**A Godot não vê o PNG**  
O arquivo precisa estar dentro da pasta do projeto (`res://`). Arraste de novo ou reinicie a Godot.

**O personagem não anda mais**  
Não altere o script nem o Input Map nesta aula — só a textura do `Sprite2D` e o shape de colisão.

**Preciso animar?**  
Não. Animação dos sheets fica para a próxima trilha.

**Posso usar outro sprite?**  
O pacote Tiny Hero é o material oficial da turma. Outros assets só com acordo do professor e licença clara.

---

## Fora de escopo nesta aula

- `AnimatedSprite2D` / ciclo Idle–Walk obrigatório
- Câmera follow
- Tilemaps e cena de teste completa
