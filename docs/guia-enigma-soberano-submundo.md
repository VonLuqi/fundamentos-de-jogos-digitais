# Guia passo a passo — Enigma do Soberano do Submundo

> **Atenção: este documento é um spoiler completo.**  
> Serve para o Mestre, QA e alunos que pediram a solução. O design sem spoilers está em [`enigma-supremo-submundo.md`](./enigma-supremo-submundo.md).

Conquista final: **Soberano do Submundo** (`soberano_do_submundo`) — raridade **Única**, **+1500 XP**.

---

## O que você precisa

| Item | Detalhe |
| --- | --- |
| Conta no Domínio | **Obrigatória** nas fases 3 e 4 (julgamento e óbolo). Fases 0–2 abrem sem login. |
| Navegador desktop | Chrome, Edge ou Firefox com **DevTools (F12)** |
| Audacity (ou equivalente) | Fase 2 — visão **Spectrogram** (~2–4 kHz); a sala só dá a riddle, sem tutorial |
| Sessão no mesmo site | Login no domínio do curso **antes** de Elísios/Estige (token em `localStorage`) |

Mapa das URLs limpas (rewrites em `vercel.json` / `local-server.mjs`):

| Fase | URL |
| --- | --- |
| 1 | `/submundo/tartaro-oculto` |
| 2 | `/submundo/asfodelos-sussurros` |
| 3 | `/submundo/elisios-julgamento` |
| 4 | `/submundo/estige-obolo` |

Progresso entre salas = **conhecer a URL** (estilo Notpron). Não há conquista intermediária por sala.

---

## Visão rápida da jornada

```
Álbum (runas = portão) ──┐
                         ├─→ anagrama TARTARO OCULTO
Salão (eco glitch)     ──┘         ↓
                    /submundo/tartaro-oculto  → CERBERUS-UNBOUND
                              ↓
                    /submundo/asfodelos-sussurros → PERSEPHONE_PASS
                              ↓
                    /submundo/elisios-julgamento  → key_elestial_hades
                              ↓
                    /submundo/estige-obolo        → SHA-256 → redeem
                              ↓
                    Soberano do Submundo (+1500 XP)
```

Atalho no hub: glifo glitch discreto (canto inferior, fora do fluxo) → modal → passe `TARTARO OCULTO` (aceita hífen/acentos) → Tártaro. Trailhead das runas permanece.

---

## Fase 0 — Trailhead (encontrar a porta)

### Objetivo

1. Soletrar o **portão** com as runas cipher → anagrama `TARTARO OCULTO` → slug `tartaro-oculto`  
   **ou** usar o eco glitch do Salão dos Heróis com a mesma palavra-passe.
2. Descobrir a **pasta** do abismo (`/submundo`) por **pistas espalhadas** — ela **não** é soletrada como o anagrama (o portão do Salão já redireciona com a pasta correta).

### Parte A — O portão (runas)

1. Abra **Conquistas** (ou o álbum no dashboard / Espelho).
2. Foque nas conquistas **públicas** (as secretas **não** carregam o anagrama).
3. Procure letras com a classe `trailhead-rune`: **itálico**, um pouco mais firmes — quase imperceptíveis.

| Conquista | Campo | Letras cipher (em ordem dos índices) |
| --- | --- | --- |
| **Primeira Travessia** | título + descrição | `T` + `A R T A R O` → **TARTARO** |
| **O Escriba do Submundo** | título + descrição | `O` + `C U L T O` → **OCULTO** |

Anagrama: **`TARTARO OCULTO`** → path segment **`tartaro-oculto`**.

### Parte B — A pasta `/submundo` (rede de dicas)

Não há cipher `S-U-B-M-U-N-D-O`. A ideia é caçar em camadas (TINAG / Notpron):

| Onde | O que encontrar |
| --- | --- |
| **Elements** nas runas | `data-path-prefix="/submundo"` em cada `.trailhead-rune` |
| **`/robots.txt`** | `Disallow: /submundo/` (+ comentário sobre portões) |
| **View Source** do álbum / painel | Comentário HTML apontando a pasta do abismo |
| **CSS** (`conquistas.css` / `dashboard.css`) | Comentário acima de `.trailhead-rune` |
| **Copy do álbum** | “o caminho nem sempre começa na raiz” |
| **Lore** | Título **O Escriba do Submundo** (palavra à vista, sem rune) |

### Como montar a URL

```
/submundo/tartaro-oculto
```

Cole no mesmo domínio do curso (ex.: produção ou `localhost`).

### Checklist

- [ ] Vi as runas itálicas e montei `TARTARO OCULTO`
- [ ] Achei pelo menos uma pista da pasta `/submundo` (Elements, robots, source…)
- [ ] Cheguei em “Os Portões do Tártaro”

---

## Fase 1 — Os Portões do Tártaro (CSS invisível)

### Objetivo

Revelar a palavra de passagem escondida na mesma cor do fundo.

### Pista na tela

> *A luz nas sombras não reside no que os olhos veem, mas nas variáveis invisíveis que moldam o Caos.*

### Passo a passo

1. Abra **F12 → Elements / Inspecionar**.
2. Selecione o elemento com a classe **`.hidden-rune`** (texto monoespaçado na página; `aria-hidden`, propositalmente “invisível”).
3. No painel **Styles**, localize a variável em `:root`:
   ```css
   --shadow-color: #0d0d11; /* igual ao fundo */
   ```
4. Altere para uma cor contrastante, por exemplo:
   ```css
   --shadow-color: #ffffff;
   ```
   ou `#cfa759`, `#ffd700`, etc.
5. O texto revelado é a chave: **`CERBERUS-UNBOUND`**.
6. Digite essa string no campo **Palavra de passagem** (maiúsculas/minúsculas são normalizadas para maiúsculas).
7. Clique **Atravesar os Portões**.

### Solução

| Campo | Valor |
| --- | --- |
| Chave | `CERBERUS-UNBOUND` |
| Próxima URL | `/submundo/asfodelos-sussurros` |

### Se travar

- Confira se editou a **variável** `--shadow-color`, não só a propriedade `color` de outro elemento.
- Inspecione o HTML: a rune já está no DOM; só a cor a oculta.
- Alternativa rápida: no Console, `document.querySelector('.hidden-rune').textContent`.

---

## Fase 2 — Os Campos de Asfódelos (espectrograma)

### Objetivo

Ler o texto pintado no domínio da frequência do WAV.

### Pista na tela

> *Nem todo som é feito para ser ouvido; algumas verdades só se revelam quando você decide olhar para a frequência do invisível.*

(A sala **não** explica Audacity nem linka analisador — a riddle + o WAV são o suficiente.)

### Passo a passo (Audacity)

1. No player da página, **baixe** `assets/submundo/asfodelos_echo.wav` (botão direito no áudio → “Salvar áudio como…” / baixar o arquivo).
2. Abra o WAV no **Audacity**.
3. No menu da faixa (setinha ao lado do nome), troque **Waveform** → **Spectrogram**.
4. Em preferências de espectrograma (se necessário):
   - Window size ~ **1024** ou **2048**
   - Foque a faixa ~ **2000–4000 Hz**
5. Leia as letras em bloco no espectrograma: **`PERSEPHONE_PASS`**.
6. Cole no campo **Chave do espectro** e envie (**Seguir o eco**).  
   Espaços viram `_` e o valor é comparado em maiúsculas.

### Passo a passo (analisador web)

1. Use qualquer visualizador de espectrograma online (ex.: spectrogram.sciencemusic.org).
2. Carregue o mesmo WAV.
3. Ajuste zoom/escala até ler `PERSEPHONE_PASS`.

### Solução

| Campo | Valor |
| --- | --- |
| Chave | `PERSEPHONE_PASS` |
| Próxima URL | `/submundo/elisios-julgamento` |

### Se travar

- Ouvir o áudio **não** entrega a chave — só o espectro.
- Confirme o underscore: `PERSEPHONE_PASS`, não espaço.
- Se o texto estiver borrado, aumente o window size / contraste do espectrograma.

---

## Fase 3 — O Palácio dos Elísios (Network + Base64)

### Objetivo

Interceptar o payload do “julgamento” e decodificar o token.

### Pré-requisito

**Estar logado** no Domínio no mesmo navegador. Sem sessão, a UI diz que os juízes só ouvem heróis sob pacto.

### Pista na tela

> *O oráculo não profetiza na interface dos mortais. Examine as correntes de dados que trafegam nos bastidores da rede antes que o payload se desfaça.*

### Passo a passo

1. Faça login no curso (Pacto / auth) e volte a `/submundo/elisios-julgamento`.
2. Abra **F12 → Network (Rede)**. Marque Preserve log se quiser.
3. Clique **Solicitar Julgamento dos Juízes**.
4. Na tela aparece algo como **“Acesso Negado pelos Juízes”** — isso é esperado.
5. Na aba Network, encontre o **POST** para `/api/progress` (corpo com `action: "underworldJudgment"`).
6. Abra a **Response**. O JSON inclui campos neste espírito:
   ```json
   {
     "ok": true,
     "status": "denied",
     "message": "Acesso Negado pelos Juízes",
     "oracle_token": "a2V5X2VsZXN0aWFsX2hhZGVz",
     "encoding": "Base64",
     "hint": "Use atob() no Console ou CyberChef para revelar o segredo."
   }
   ```
7. Decodifique o `oracle_token`. No Console:
   ```js
   atob('a2V5X2VsZXN0aWFsX2hhZGVz')
   ```
8. Resultado: **`key_elestial_hades`**  
   (grafia **elestial** é intencional — não “corrija” para “celestial”).
9. Quando o formulário **Chave do oráculo** aparecer, cole a string **exatamente** (case-sensitive) e envie.

### Solução

| Campo | Valor |
| --- | --- |
| Token Base64 | `a2V5X2VsZXN0aWFsX2hhZGVz` |
| Chave | `key_elestial_hades` |
| Próxima URL | `/submundo/estige-obolo` |

### Se travar

- Sem login → mensagem de pacto; faça auth e tente de novo.
- Não use a mensagem da UI como chave; a chave está no **JSON da resposta**.
- Não altere `elestial` → `celestial`.

---

## Fase 4 — Rio Estige (SHA-256 + redeem)

### Objetivo

Calcular o óbolo (hash) no Console e pagar no altar — o servidor valida e concede a conquista.

### Pré-requisito

Sessão ativa no Domínio. Rate limit: ~12 tentativas / minuto por usuário.

### Pista na tela + Console

Ao carregar a página, o Console imprime (estilo dourado):

> `⚡ [CHARON_SYSTEM]: Calcule o hash SHA-256 em hexadecimal da string "ESTIGE_OBOLO_2026" utilizando crypto.subtle.digest().`

### Passo a passo

1. Abra `/submundo/estige-obolo` com F12 → **Console**.
2. Confirme a mensagem do `CHARON_SYSTEM`.
3. Execute (copie e cole):

```javascript
async function calcularObolo(mensagem) {
  const encoder = new TextEncoder();
  const dados = encoder.encode(mensagem);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dados);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

calcularObolo('ESTIGE_OBOLO_2026').then(console.log);
```

4. O hash hexadecimal esperado é:

```
18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c
```

5. Cole esse hash no campo **Óbolo de Ouro (hash hex)** e clique **Pagar o tributo**.
6. Se estiver autenticado e o hash correto:
   - Status: **Travessia selada.** (ou “Você já cruzou estas águas.” se já tinha a conquista)
   - Overlay de celebração **Soberano do Submundo**
   - XP **+1500** na primeira concessão (idempotente depois)
7. **Retornar ao Domínio** leva ao álbum de conquistas.

### Solução

| Campo | Valor |
| --- | --- |
| Mensagem | `ESTIGE_OBOLO_2026` |
| Algoritmo | SHA-256 → hex minúsculo |
| Óbolo | `18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c` |
| Action API | `underworldRedeem` em `POST /api/progress` |

### Se travar

- Sem sessão → Caronte recusa; faça login no mesmo origin.
- Hash errado → “Óbolo rejeitado” (ou mensagem da API); recalcule sem espaços extras.
- Muitas tentativas → aguarde ~1 minuto (429).
- Não procure o hash “certo” no HTML da sala: a validação é **só no servidor**.

---

## Recompensa

| Campo | Valor |
| --- | --- |
| ID | `soberano_do_submundo` |
| Nome | Soberano do Submundo |
| Raridade | Única |
| XP | +1500 (uma vez) |
| Onde ver | Álbum de conquistas / perfil após o redeem |

Descrição de flavor:

> *Superou as sombras do Tártaro, decifrou os ecos de Asfódelos, interceptou o julgamento dos Elísios e pagou o tributo sagrado no Rio Estige. Mestre absoluto da inspeção web, esteganografia e criptografia.*

---

## Folha de gabarito (só chaves)

| Elo | Entrada | Mecânica | Saída |
| --- | --- | --- | --- |
| 0 | Álbum (runas + pistas da pasta) | Anagrama + `/submundo` | `/submundo/tartaro-oculto` |
| 1 | Tártaro | CSS `--shadow-color` | `CERBERUS-UNBOUND` |
| 2 | Asfódelos | Espectrograma WAV | `PERSEPHONE_PASS` |
| 3 | Elísios | Network + `atob` | `key_elestial_hades` |
| 4 | Estige | SHA-256 de `ESTIGE_OBOLO_2026` | hash acima → **Soberano** |

---

## Habilidades que o enigma treina

1. Observação de UI / tipografia sutil (trailhead)
2. DevTools → CSS variables
3. Forense de áudio (espectrograma)
4. Network tab + Base64
5. Web Crypto API no Console + confiança no servidor

---

## Referências no repo

| Arquivo | Papel |
| --- | --- |
| [`enigma-supremo-submundo.md`](./enigma-supremo-submundo.md) | Design ARG / filosofia |
| [`plano-grimorio-conquistas-enigma.md`](./plano-grimorio-conquistas-enigma.md) | Adaptação ao stack do curso |
| `data/game-catalog.json` | Copy + índices `trailhead` + XP do Soberano |
| `pages/submundo/*` + `js/submundo/*` | Salas |
| `api/progress.js` | `underworldJudgment` / `underworldRedeem` |
| `assets/submundo/asfodelos_echo.wav` | Eco da fase 2 |
| `tests/submundo-enigma-smoke.mjs` | Smoke de regressão |

---

*Guia alinhado à implementação atual do Domínio (rewrites `/submundo/*`, auth nas fases 3–4, award idempotente).*
