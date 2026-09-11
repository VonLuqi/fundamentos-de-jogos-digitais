# 🏛️ Enigma Supremo do Submundo: Planejamento Arquitetural de ARG e Web Puzzles (Versão Expandida - 8 Fases)

Este documento apresenta o planejamento arquitetural e de engenharia expandido para a implementação do **"Enigma Supremo do Submundo"**, um puzzle web multi-telas de 8 fases, profundas, gamificadas e educativas, projetado para testar conhecimentos práticos de desenvolvimento web, inspeção de protocolo, esteganografia avançada, geolocalização ARG, manipulação de Canvas e criptografia [4, 15, 17, 20, 25, 26, 35, 40].

---

## 1. Visão Geral da Jornada & Filosofia de Design ARG

O enigma é concebido sob o conceito fundamental de Alternate Reality Games (ARG) conhecido como **TINAG** (*This Is Not A Game* - "Isto Não É Um Jogo"), no qual as mecânicas de jogo se camuflam diretamente nas ferramentas reais do navegador, no ecossistema web e em elementos do mundo real [3, 6, 7, 10, 40]. A experiência inspira-se esteticamente no submundo da mitologia grega (com ambientação do jogo *Hades*) e pedagogicamente nos grandes marcos dos enigmas digitais da internet, como *Notpron* [4] e a *Cicada 3301* [10, 34, 40, 50, 51].

### Metodologia Educativa
O objetivo do enigma é transformar o navegador em um laboratório interativo de apuração técnica. A jornada expandida possui 8 fases sequenciais onde o aluno passa de um mero consumidor de interface gráfica para um investigador de segurança e engenheiro web. A progressão exige a utilização de:
- **Ferramentas de Desenvolvedor (DevTools):** Inspecionar HTML, modificar variáveis CSS e depurar o DOM.
- **Esteganografia de Mídia (Áudio e Imagem):** Análise espectrográfica em Audacity e extração de metadados EXIF e bits menos significativos (LSB) [12, 14, 25, 27, 30, 35, 38].
- **Inspeção de Protocolo & API:** Análise de pacotes na aba Network e decodificação Base64 [20, 31, 49].
- **Gestão de Armazenamento Web:** Manipulação ativa de Cookies, `localStorage` e `sessionStorage` na aba Application.
- **OSINT & Geotecnologia ARG:** Pesquisa de coordenadas geográficas reais ligadas à mitologia grega (Cabo Matapan/Tênaro) [6, 7, 22, 50].
- **Processamento Gráfico em Canvas:** Manipulação de pixels (`ImageData`), inversão de matriz de cores e filtros via código JavaScript.
- **Primitivas Criptográficas Nativas:** Execução da Web Crypto API (`crypto.subtle.digest`) para geração de hashes SHA-256 no Console [3, 29, 33, 44, 45].

---

## 2. O Gatilho (*The Rabbit Hole / Trailhead*)

O ponto de partida da experiência (a "Toca do Coelho") encontra-se camuflado na própria plataforma pública do curso, inserido na seção de conquistas da turma [11].

* **Ocultação:** Determinadas letras maiúsculas ao longo dos títulos e descrições das conquistas públicas possuem uma estilização sutil em itálico ou atributo de dados no HTML.
* **O Anagrama:**
  $$\text{"T A R T A R O  --  O C U L T O"}$$
* **A Descoberta:** Ao reunir as letras destacadas e resolver o anagrama, o aluno obtém a rota de acesso secreta no domínio da aplicação.
* **URL Secreta Inicial:** `/submundo/tartaro-oculto`

---

## 3. Detalhamento Completo das Salas (Fases 1 a 8)

---

### 🛑 Fase 1: Os Portões do Tártaro
* **Nome e Tema:** *Os Portões do Tártaro* (O Abismo das Sombras).
* **Aparência Visual:** Interface minimalista em *dark-mode* com textura de ferro fundido, inscrições estilizadas em grego antigo e um campo solitário para digitação da palavra de passagem.
* **A Pista / Riddle:**
  > *"A luz nas sombras não reside no que os olhos veem, mas nas variáveis invisíveis que moldam o Caos."*
* **A Mecânica:** **Manipulação de CSS Variables via DevTools.**
  A chave de transição é renderizada no HTML dentro de um elemento com a classe `.hidden-rune`. No entanto, a cor do texto utiliza uma variável CSS configurada com a mesma tonalidade do fundo da página:
  ```css
  :root {
    --shadow-color: #0d0d11; /* Tonalidade idêntica ao background */
  }
  
  .hidden-rune {
    color: var(--shadow-color);
    font-family: monospace;
    user-select: none;
  }
  ```
  O aluno precisa abrir as **Ferramentas do Desenvolvedor (F12)**, inspecionar a aba *Elements/Styles* e alterar dinamicamente a variável `--shadow-color` para uma cor visível (ex: `#ffffff` ou `#gold`).
* **A Solução:** A alteração do estilo revela a palavra secreta: `CERBERUS-UNBOUND`. 
* **Próxima URL:** `/submundo/asfodelos-sussurros`

---

### 🌫️ Fase 2: Os Campos de Asfódelos
* **Nome e Tema:** *Os Campos de Asfódelos* (O Nevoeiro dos Ecos).
* **Aparência Visual:** Animação de névoa densa e um player de áudio HTML5 minimalista transmitindo ruído e chiado estático de fundo.
* **A Pista / Riddle:**
  > *"Nem todo som é feito para ser ouvido; algumas verdades só se revelam quando você decide olhar para a frequência do invisível."*
* **A Mecânica:** **Esteganografia de Áudio e Análise Espectrográfica.**
  O áudio fornecido (`asfodelos_echo.wav`) contém uma imagem/texto sintetizada no domínio da frequência [7, 20]. Quando reproduzido acusticamente, o ouvido ouve apenas estática não inteligível [12, 18, 27, 30, 38, 42].
  O aluno deve baixar o arquivo WAV e abri-lo em um software de análise forense como o **Audacity** ou em um analisador espectral web [12, 27, 30].
  1. No Audacity, o aluno clica no menu suspenso da faixa de áudio e altera a visualização de *Waveform* (Forma de Onda) para **Spectrogram** (Espectrograma) [12, 27].
  2. Ajusta as configurações de espectrograma (*Window size* para 1024/2048 e escala de frequência para a faixa de 2000 Hz a 4000 Hz) para aumentar a nitidez [12].
* **A Solução:** O espectrograma exibe a chave em letras de bloco: `PERSEPHONE_PASS`.
* **Próxima URL:** `/submundo/hecate-encruzilhada`

---

### 🔮 Fase 3: A Encruzilhada de Hécate
* **Nome e Tema:** *A Encruzilhada de Hécate* (O Segredo da Relíquia Oculta).
* **Aparência Visual:** Uma ilustração detalhada e misteriosa da deusa Hécate em uma encruzilhada sob névoa com um botão *"Baixar Relíquia da Deusa (hecate_relic.png)"* e uma caixa de validação de código.
* **A Pista / Riddle (UI):**
  > *"As aparências enganam a vista superficial. Examine as entranhas digitais da imagem: primeiro o que a criação gravou nas margens, depois as camadas que a tocha esconde no pigmento mais fraco."*
* **A Mecânica:** **Esteganografia em Imagem PNG (metadados tEXt + LSB — Least Significant Bit) [14, 25, 26, 35].**
  O aluno faz o download do arquivo `hecate_relic.png` (`npm run submundo:hecate` regenera o asset) e utiliza técnicas forenses de imagem:
  1. **Inspeção de metadados:** No chunk PNG `tEXt` / campo Comment, o aviso enigmático: `A tocha acende no vermelho mais fraco.` — a UI **não** nomeia canal nem bit.
  2. **Extração LSB:** Com StegOnline, CacheSleuth LSB ou script Pillow, extrair bit 0 do canal vermelho.
* **A Solução:** Payload LSB = `HECATE_TORCH_KEY_777`.
* **Próxima URL:** `/submundo/elisios-julgamento`

---

### ⚖️ Fase 4: O Palácio dos Elísios
* **Nome e Tema:** *O Palácio dos Elísios* (O Julgamento da Rede).
* **Aparência Visual:** Representação de um tribunal imponente com três estátuas de pedra (os juízes Minos, Radamanto e Éaco) e um botão de ação marcado como *"Solicitar Julgamento dos Juízes"*.
* **A Pista / Riddle:**
  > *"O oráculo não profetiza na interface dos mortais. Examine as correntes de dados que trafegam nos bastidores da rede antes que o payload se desfaça."*
* **A Mecânica:** **Análise de Payload na Network Tab & Decodificação Base64.**
  Requer sessão autenticada. Ao clicar em *"Solicitar Julgamento dos Juízes"*, a UI mostra só `"Acesso Negado pelos Juízes"`. Em **Network**, inspecionar `POST /api/progress` com `action: "underworldJudgment"`:
  ```json
  {
    "ok": true,
    "status": "denied",
    "message": "Acesso Negado pelos Juízes",
    "oracle_token": "a2V5X2VsZXN0aWFsX2hhZGVz",
    "echo": "O oráculo murmura em língua que os mortais não leem à vista."
  }
  ```
  Decodificar o token (Base64) no Console (`atob(...)`) ou CyberChef — a API **não** envia `encoding` nem `hint`.
* **A Solução:** `key_elestial_hades` (grafia **elestial** intencional).
* **Próxima URL:** `/submundo/persefone-jardim`

---

### 🌺 Fase 5: O Jardim de Perséfone
* **Nome e Tema:** *O Jardim de Perséfone* (As Sementes da Romã).
* **Aparência Visual:** Um cenário de jardim místico com romãs cristalizadas flutuando sobre uma fonte escura e um aviso: *"Para provar da fruta proibida, você deve possuir a autoridade real dos mortos e ter consumido as sementes sagradas."*
* **A Pista / Riddle (UI):**
  > *"Para provar da fruta proibida, você deve possuir a autoridade real dos mortos e ter consumido as sementes sagradas. Os segredos do reino não ficam à vista — habitam a memória persistente do seu próprio navegador. Reivindique a posição de soberano."*
* **A Mecânica:** **Manipulação de Storage no Navegador (Cookies & LocalStorage).**
  Ao carregar a página, o cliente **reinicia** o estado mortal:
  - `Cookie: underworld_role=mortal`
  - `localStorage.pomegranate_seeds = "0"`
  Resolução (DevTools → Application — a UI não nomeia a aba):
  1. Cookie `underworld_role` → `queen_consort`.
  2. Local Storage `pomegranate_seeds` → `6` (mito das 6 sementes).
  3. Clicar *"Consumir Romã & Reivindicar Trono"* (sem recarregar a página).
* **A Solução:** Selo revelado `POMEGRANATE_6_SEEDS` → formulário avança.
* **Próxima URL:** `/submundo/observatorio-sombras`

---

### 🧭 Fase 6: O Observatório das Sombras
* **Nome e Tema:** *O Observatório das Sombras* (O Portão de Hélio e as Coordenadas Terrestres).
* **Aparência Visual:** Um mapa estelar antigo e um astrolábio interativo girando lentamente sobre projeções cartográficas do Mediterrâneo Antigo.
* **A Pista / Riddle (UI):**
  > *"Hades aprisionou o portal de acesso físico em um ponto específico do mundo real. Descubra a localização da caverna mitológica conhecida na Antiguidade como a Entrada do Submundo no Peloponeso. Marque o ponto no mapa ou inscreva as coordenadas — ou o nome ritual do portão."*
* **A Mecânica:** **Investigação Geográfica ARG & OSINT [6, 7, 22].**
  Local lendário: **Cabo Matapan / Cabo Tênaro** (Peloponeso).
  1. Coordenadas de referência: **36.4005 N, 22.4858 E** (tolerância ~`0.02°` no cliente).
  2. Alternativa: token `CAPE_MATAPAN_GATE`.
  3. Mapa Leaflet (clique) ou formulário — literais de lat/lng ofuscados no JS (`atob`), sem coords no HTML.
* **A Solução:** `36.4005, 22.4858` (ou equivalente dentro da margem) / `CAPE_MATAPAN_GATE`.
* **Próxima URL:** `/submundo/cocito-espelho`

---

### 🪞 Fase 7: O Espelho do Rio Cócito
* **Nome e Tema:** *O Espelho do Rio Cócito* (O Altar das Frequências de Luz).
* **Aparência Visual:** Uma piscina reflexiva de águas escuras estilizada em HTML5 Canvas. A superfície reflete um padrão escuro completamente opaco e ilegível ao olho humano.
* **A Pista / Riddle:**
  > *"O espelho do lamentoso Cócito reflete o oposto da verdade. Inverta a matriz de cores dos pixels e ajuste a frequência alfa no Canvas para revelar a runa submersa nas profundezas."*
* **A Mecânica:** **Manipulação de Canvas API & Pixel Data via Console JS.**
  A página possui um elemento `<canvas id="cocito-mirror">`. A runa é desenhada, depois o buffer é invertido e os pixels da inscrição ficam com **alfa 0** (água opaca negra). Só invert+forçar alfa no Console revela o texto — `filter: invert()` sozinho **não** basta (alfa zero).
  1. **Inversão de Pixels via JS no Console:**
     ```javascript
     const canvas = document.getElementById('cocito-mirror');
     const ctx = canvas.getContext('2d');
     const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     const d = imgData.data;
     
     // Inverter canais RGB e forçar Alpha máximo
     for (let i = 0; i < d.length; i += 4) {
       d[i]     = 255 - d[i];     // Red
       d[i + 1] = 255 - d[i + 1]; // Green
       d[i + 2] = 255 - d[i + 2]; // Blue
       d[i + 3] = 255;           // Alpha
     }
     ctx.putImageData(imgData, 0, 0);
     ```
* **A Solução:** O Canvas processado exibe a inscrição alfanumérica: `COCYTUS_REFLECTION_404`.
* **Próxima URL:** `/submundo/estige-obolo`

---

### 🌊 Fase 8: As Águas Cegas do Rio Estige (O Clímax Final)
* **Nome e Tema:** *As Águas Cegas do Rio Estige* (O Juramento Sagrado).
* **Aparência Visual:** A barca de Caronte flutuando sobre águas escuras e brilhantes. No centro da tela, um altar com um pedestal solicitando o *"Óbolo de Ouro"* (o hash criptográfico do juramento final).
* **A Pista / Riddle (UI):**
  > *"Para cruzar o rio sem retorno, o barqueiro não aceita moedas comuns. O tributo nasce no terminal — um óbolo que não se conta, se reduz."*
* **A Mecânica:** **Console JS + Web Crypto API (SHA-256) [3, 29, 33, 44, 45].**
  Ao carregar, o Console imprime (sem citar `crypto.subtle` na mensagem):
  > `⚡ [CHARON_SYSTEM]: A string sagrada é "ESTIGE_OBOLO_2026". O óbolo não se conta — se reduz. Traga o selo em hex.`

  O aluno calcula o hash (descoberta própria da API). Exemplo:
  ```javascript
  async function calcularObolo(mensagem) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(mensagem);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dados);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  calcularObolo("ESTIGE_OBOLO_2026").then(console.log);
  ```
  Submissão via `POST /api/progress` com `action: "underworldRedeem"` (sessão obrigatória). Soft fail: *"Tributo insuficiente."*
* **A Solução (óbolo hex):**
  `18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c`.

---

## 4. Folha de resolução (gabarito vivo)

| Elo | Sala | Mecânica | Resolução / chave | Próximo |
| --- | --- | --- | --- | --- |
| 0 | Trailhead | Runas + pistas `/submundo` | Anagrama `TARTARO OCULTO` | `/submundo/tartaro-oculto` |
| 1 | Tártaro | CSS `--shadow-color` | `CERBERUS-UNBOUND` | Asfódelos |
| 2 | Asfódelos | Espectrograma WAV | `PERSEPHONE_PASS` | Hécate |
| 3 | Hécate | tEXt Comment + LSB R bit0 | `HECATE_TORCH_KEY_777` | Elísios |
| 4 | Elísios | Network + Base64 | `key_elestial_hades` | Perséfone |
| 5 | Perséfone | Cookie + localStorage | `queen_consort` + `6` → `POMEGRANATE_6_SEEDS` | Observatório |
| 6 | Observatório | OSINT / mapa | `36.4005, 22.4858` (±0,02°) ou `CAPE_MATAPAN_GATE` | Cócito |
| 7 | Cócito | Canvas invert + alfa | `COCYTUS_REFLECTION_404` | Estige |
| 8 | Estige | SHA-256 de `ESTIGE_OBOLO_2026` | hash acima → redeem | Soberano |

Walkthrough passo a passo (spoiler interno): [`guia-enigma-soberano-submundo.md`](./guia-enigma-soberano-submundo.md).

---

## 5. O Clímax e Recompensa (implementação atual)

Ao submeter o óbolo correto na Fase 8, dispara a celebração e o award server-side (idempotente).

* **ID:** `soberano_do_submundo`
* **Nome:** 👑 **Soberano do Submundo** (raridade **Única**)
* **Descrição (catálogo):** *"Superou as 8 provações lendárias do submundo: decifrou o Tártaro, escutou Asfódelos, revelou os segredos de Hécate, interceptou os Elísios, dominou o Jardim de Perséfone, localizou o portal no Observatório, inverteu o espelho de Cócito e selou o pacto no Rio Estige. Mestre absoluto da investigação web, ARG e engenharia de software."*
* **XP:** `+1500` (uma vez; calibração níveis 1–99)
* **Arte:** `assets/achievements/soberano_do_submundo.webp`

---

## 6. Arquitetura implementada (stack do Domínio)

**Não** há tabela `underworld_progress` nem RPC Next.js. Progresso = estilo **Notpron** (conhecer a URL). Award só no Estige.

```
Salas 1–7 (cliente)     URL conhecida = entrada
        │
        ▼
Fase 4 Elísios ──POST /api/progress──► underworldJudgment → oracle_token
Fase 8 Estige  ──POST /api/progress──► underworldRedeem (hash) → users.xp + users.conquistas
```

| Peça | Onde |
| --- | --- |
| Páginas / JS | `pages/submundo/*`, `js/submundo/*` |
| CSS | `css/submundo.css` |
| Rewrites | `vercel.json`, `local-server.mjs` |
| Judgment / Redeem | `api/progress.js` (`underworldJudgment`, `underworldRedeem`) |
| Catálogo / XP | `data/game-catalog.json` |
| WAV / PNG | `assets/submundo/asfodelos_echo.wav`, `hecate_relic.png` |
| Geradores | `npm run submundo:wav`, `npm run submundo:hecate` |
| Smoke | `tests/submundo-enigma-smoke.mjs` |

Auth: salas **visíveis sem login**; `underworldJudgment` e `underworldRedeem` **exigem sessão**.

---

*Documentação alinhada à implementação viva das 8 fases (resolução, recompensa +1500 XP, API `/api/progress`).*
