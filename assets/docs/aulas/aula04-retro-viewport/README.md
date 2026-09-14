# Aula 04 — Estética Retrô do Zero (Godot 4)

> **Página da aula:** `pages/aula4.html`  
> **Slides:** [`aula04_plataformas_restricoes_slides.pptx`](../aula04_plataformas_restricoes_slides.pptx) · [`aula04_plataformas_restricoes_slides.pdf`](../aula04_plataformas_restricoes_slides.pdf)

Passo a passo para configurar a **resolução nativa** (viewport) e o **stretch clássico** (`viewport` + `keep` + `integer`), emulando o contrato de tela dos consoles de 8/16 bits.

Continue o projeto das **Aulas 02–03** (Player que anda + sprite Nearest). Não é necessário criar projeto novo.

---

## Checklist do artefato

Ao final, você deve ter:

- [ ] Projeto das Aulas 02–03 aberto
- [ ] **Viewport Width × Height** = `320×180` **ou** `480×270` (ou resolução histórica justificada)
- [ ] **Stretch Mode** = `viewport`
- [ ] **Stretch Aspect** = `keep`
- [ ] **Stretch Scale Mode** = `integer`
- [ ] **Window Override** definido (janela inicial confortável, ex.: `1280×720`)
- [ ] **Play:** pixels nítidos e proporção mantida ao redimensionar a janela
- [ ] **Nearest** ainda ativo no herói (eco Aula 03)
- [ ] Anotações + síntese enviadas na página da aula

---

## 0. Pré-requisitos

- Projeto Godot 4 com:
  - Player da Aula 02 (`CharacterBody2D` + Input Map + `player.gd`)
  - Sprite da Aula 03 com filtro **Nearest** (recomendado)
- Menu **Project → Project Settings** acessível

---

## 1. Nomenclatura (importante)

O briefing às vezes fala em “Window Width/Height”. Na **Godot 4**:

| Conceito | Onde fica | O que controla |
| :--- | :--- | :--- |
| **Viewport Width / Height** | Display → Window → Size | Resolução de **design** (quadro nativo do jogo) |
| **Window Width/Height Override** | Display → Window → Size | Tamanho **inicial da janela** na sua tela |
| **Stretch Mode / Aspect / Scale Mode** | Display → Window → Stretch | Como o quadro é **escalado** para a janela |

Regra prática: o jogo “pensa” em poucos pixels (viewport); a janela só mostra isso maior e limpo.

### Mapa rápido do Project Settings

```text
Project → Project Settings
└── Display
    └── Window
        ├── Size
        │   ├── Viewport Width / Height     ← resolução nativa
        │   └── Window Width/Height Override ← janela inicial
        └── Stretch
            ├── Mode        → viewport
            ├── Aspect      → keep
            └── Scale Mode  → integer
```

---

## 2. Escolher o contrato de tela

Escolha **uma** resolução nativa (ambas 16:9):

| Resolução | Quando preferir |
| :--- | :--- |
| **320×180** | Pixels bem grandes; sensação forte de 8/16-bit moderno |
| **480×270** | Mesmo aspect, um pouco mais de detalhe (ainda retrô) |

### Referência histórica (opcional — não obrigatório)

Valores didáticos (ordem de grandeza):

| Plataforma | Resolução típica | Nota para o designer |
| :--- | :--- | :--- |
| Atari 2600 | ~160×192 | Pouquíssimos objetos por linha |
| NES | 256×240 (~224 úteis) | 8 sprites/scanline · paleta curta |
| Game Boy | **160×144** | 4 tons · silhueta > detalhe |
| SNES | **256×224** | Mais cores/camadas |
| GBA | **240×160** | Portátil com mais cor |
| Retrô 16:9 hoje | **320×180** / **480×270** | Contrato clássico em monitor widescreen |

Se usar uma resolução histórica (`256×224`, `160×144`…), **justifique** nas anotações.

---

## 3. Definir o Viewport nativo

1. **Project → Project Settings**.
2. Ative **Advanced Settings** se a UI estiver reduzida.
3. Vá em **Display → Window**.
4. Em **Viewport Width** e **Viewport Height**, digite a resolução escolhida (ex.: `320` e `180`).
5. Observe o **retângulo azul** no editor 2D: a área útil muda. O herói pode parecer “grande” demais no quadro — isso é **esperado** (conversa de restrição).

---

## 4. Stretch clássico (comportamento de console)

Ainda em **Display → Window → Stretch**:

1. **Mode** → `viewport`  
   A cena renderiza no tamanho base e **depois** é escalada para a janela.
2. **Aspect** → `keep`  
   Mantém a proporção; barras pretas (letterbox/pillarbox) se a janela não for 16:9.
3. **Scale Mode** → `integer`  
   Escala em múltiplos inteiros — evita pixels “quebrados” / meios-pixels.

### Window Override (janela grande, viewport pequeno)

1. Em **Size**, localize **Window Width Override** / **Window Height Override**.
2. Sugestão de turma:
   - Viewport `320×180` → Override `1280×720` (×4) ou `960×540` (×3)
   - Viewport `480×270` → Override `960×540` (×2) ou `1440×810` (×3)
3. Assim você *vê* pixels grandes e nítidos, sem trabalhar numa janelinha minúscula.

---

## 5. Experimento de observação (eco Aula 01)

Pressione **Play**, redimensione a janela e compare. Depois **volte** ao trio canônico (`viewport` + `keep` + `integer`).

| Teste | O que observar |
| :--- | :--- |
| Stretch Mode = `disabled` | 1 unidade ≈ 1 pixel da tela; o “mundo” muda de tamanho |
| Mode = `viewport`, Aspect = `ignore` | Estica e **deforma** o quadro |
| Mode = `viewport`, Aspect = `keep` | Proporção preservada; barras pretas possíveis |
| Scale Mode `integer` vs `fractional` | Pixels uniformes vs “meios-pixels” estranhos |

Registre nas anotações da página (alimenta as pistas do altar).

---

## 6. Eco da Aula 03 (Nearest)

Sem **Nearest**, o stretch amplifica o blur. Confirme:

1. `Sprite2D` → CanvasItem → Texture → Filter → **Nearest**, **ou**
2. Project Settings → Rendering → Textures → Default Texture Filter → **Nearest**

Compare Linear vs Nearest por ~30 segundos e anote.

---

## 7. O que enviar na plataforma

Nas anotações da oficina, deixe claro:

1. Plataforma(s) da linha do tempo que mais te marcaram  
2. Uma restrição técnica e por que importa  
3. Como a restrição força criatividade (exemplo)  
4. Resolução nativa escolhida e por quê  
5. Onde configurou Viewport Width/Height  
6. Valores finais de Stretch Mode / Aspect / Scale Mode  
7. O que mudou no Play ao redimensionar  

Na síntese (5–8 linhas): amarre **história das plataformas → restrição → viewport baixo com stretch `viewport`/`keep`**.

---

## Fora do escopo desta aula

- `Camera2D` follow  
- Cena de teste com chão / tilemap  
- `AnimatedSprite2D`  
- Shaders CRT / paletas NES obrigatórias  

Isso fica para a **próxima trilha** do módulo.
