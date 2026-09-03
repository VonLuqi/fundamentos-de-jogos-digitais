# Plano de Correção — Conquistas da Aula 01 e Código de Aula Compartilhado

Data: 2026-09-03
Escopo: `js/aula1.js`, `css/aula.css`, `pages/aula1.html`, `api/progress.js`, `db/`

---

## 1. Diagnóstico

### 1.1 Bug A — "explosão de luz" travada na tela

Fluxo atual: ao salvar o registro da aula, `enqueueDiscovery()` dispara
`showSecretBurst()` / `showDiscoveryOverlay()`, e ambos chamam
`triggerDiscoveryVfxPulse()`, que integra a biblioteca externa
`@vfx-js/core` (carregada por CDN em `VFX_MODULE_CANDIDATES`).

Causas-raiz identificadas:

| # | Causa | Efeito observado |
|---|-------|------------------|
| A1 | `discoveryVfx.add(target, opts)` é chamado, mas **nunca** existe um `discoveryVfx.remove(target)`. O elemento fica preso ao render loop da lib para sempre. | O shader continua desenhando depois que o toast some. |
| A2 | O alvo `#discovery-flash` é `position: fixed; inset: 0` (tela inteira) com shader `rgbShift` + `overflow: true` + `overlay: true`. | A textura capturada pela lib é um retângulo luminoso de tela cheia — a "explosão de luz". |
| A3 | A lib captura o DOM de forma assíncrona (snapshot). Se a captura acontece no pico da animação `discoveryFlash` (opacidade 0.95), essa textura fica **congelada** no canvas. | A luz não escurece nunca, porque o CSS já voltou a `opacity: 0` mas o canvas guarda o frame antigo. |
| A4 | O canvas criado pela lib é injetado em `<body>` sem controle de `z-index`/`pointer-events` do nosso lado. | O canvas fica acima de todo o conteúdo e pode até bloquear interação. |
| A5 | `discoveryVfxBoundElements` é um `WeakSet` só de escrita — não há caminho de limpeza em `clearDiscoveryTimersAndEffects()`. | Nem trocar de aba nem sair da página derruba o efeito. |

**Decisão:** remover a integração com `@vfx-js/core` do fluxo de conquistas.
O caminho de fallback CSS (`is-discovery-css-pulse`) já existe, é determinístico,
não depende de CDN externa e não deixa resíduo em canvas. Isso elimina A1–A5 de uma vez.

### 1.2 Bug B — textos "Conquista desbloqueada" / "Conquista secreta desbloqueada" não aparecem

| # | Causa | Local |
|---|-------|-------|
| B1 | `.discovery-card__title { display: none; }` — o `<h2 id="discovery-title">` nunca é renderizado. | `css/aula.css` |
| B2 | `.discovery-card__item-kicker { display: none; }` — o texto "Conquista liberada" nunca é renderizado. | `css/aula.css` |
| B3 | O título é sempre `"Conquista Descoberta"`, sem diferenciar conquista normal de secreta. | `js/aula1.js` → `showDiscoveryOverlay()` |
| B4 | O banner `#discovery-secret-burst` ("Conquista secreta desbloqueada") tem `z-index: 55`, abaixo do canvas da lib de VFX. | `css/aula.css` + Bug A |
| B5 | `SECRET_BURST_DURATION_MS = 5000` bloqueia o início da fila de toasts por 5 s. Com o banner invisível (B4), a sensação é de que "nada aconteceu". | `js/aula1.js` |

### 1.3 Bug C — código da aula queima no primeiro resgate

`api/progress.js`, ação `redeem`:

```js
if (rewardRow.redeemed_at) return res.status(409).json({ ok: false, error: 'Código já usado.' });
...
await supabase.from(CODES_TABLE).update({ redeemed_at: ..., redeemed_by: userId }).eq('code', raw).is('redeemed_at', null);
```

O primeiro aluno que resgata marca `redeemed_at` e **invalida o código para a turma inteira**.
Efeitos colaterais no mesmo modelo:

- `action: 'lessonCode'` filtra `.is('redeemed_at', null)` → depois do 1º resgate o código
  some da aula e o restante da turma recebe "Nenhum código ativo para esta aula".
- `db/setup.sql`: índice parcial `redeem_codes_active_idx ... WHERE redeemed_at IS NULL`
  reflete a mesma premissa errada de uso único.
- `normalizeCodes()` expõe `used: true` e o dashboard rotula "USADO", escondendo que o código
  ainda está válido por tempo.

**Regra desejada:** o código vale para **todos os alunos** enquanto não expirar (TTL de 20 min).
A única restrição é: **cada aluno só pode resgatar o mesmo código uma vez** (evita XP duplicado).

---

## 2. Plano de correção

### Etapa 1 — Remover o VFX externo do fluxo de conquistas (`js/aula1.js`)

- Excluir `VFX_MODULE_CANDIDATES`, `discoveryVfx`, `discoveryVfxReady`,
  `discoveryVfxBoundElements`, `loadDiscoveryVfxModule()`, `initDiscoveryVfx()`,
  `ensureDiscoveryVfxBinding()` e `markDiscoveryFallbackMode()`.
- Renomear `triggerDiscoveryVfxPulse()` → `triggerDiscoveryPulse()`, com corpo CSS puro:
  aplica `is-discovery-pulse` no `<body>` e remove por timer (respeitando
  `prefers-reduced-motion`).
- Remover a chamada `initDiscoveryVfx()` do bootstrap da página.
- `clearDiscoveryTimersAndEffects()` passa a limpar `is-discovery-pulse` e o `is-active`
  do `#discovery-flash`, garantindo tela limpa ao trocar de aba/sair.

### Etapa 2 — Ajustar o CSS dos efeitos (`css/aula.css`)

- Trocar os seletores `body.is-discovery-vfx-*` / `is-discovery-css-pulse` por
  `body.is-discovery-pulse`.
- `.discovery-card__title`: passar de `display: none` para visível (estilo de kicker dourado).
- `.discovery-card__item-kicker`: passar de `display: none` para visível.
- `.discovery-secret-burst`: subir `z-index` para `60` (acima de overlay `50` e flash `45`)
  e aumentar levemente a legibilidade (padding/tamanho de fonte).
- Manter os overrides de `prefers-reduced-motion`.

### Etapa 3 — Corrigir os textos (`js/aula1.js`)

- `showDiscoveryOverlay(achievement)`:
  - título → `achievement.hidden ? 'Conquista Secreta Desbloqueada' : 'Conquista Desbloqueada'`;
  - kicker → mesmo texto, em caixa alta via CSS.
- `SECRET_BURST_DURATION_MS`: `5000` → `2400` ms, para o toast entrar logo em seguida.
- `showSecretBurst()` deixa de depender do VFX; usa só a animação `secretBurstIn`
  (duração alinhada à constante).

### Etapa 4 — Código de aula expira só por tempo (`api/progress.js`)

- `redeem`:
  - remover o bloqueio global `if (rewardRow.redeemed_at) → 409`;
  - manter `isCodeExpired(rewardRow)` como **única** trava de invalidação (410);
  - adicionar trava por aluno: se `user.redeemed_codes` já contém o código → 409
    ("Você já resgatou este código.");
  - o `update` de `redeemed_at`/`redeemed_by` passa a registrar apenas o **primeiro** resgate
    (telemetria), sem efeito de invalidação; erro nesse passo não derruba o resgate.
- `lessonCode`: remover `.is('redeemed_at', null)`; selecionar o código mais recente
  que ainda não expirou.
- `normalizeCodes()`: `expired` vira o único critério de invalidez;
  `used` continua sinalizando "já teve pelo menos um resgate" (informativo).
- `js/dashboard.js`: rótulo do histórico passa a ser `EXPIRADO` / `ATIVO`
  (com marcação informativa de "já resgatado" quando aplicável).

### Etapa 5 — Banco (`db/`)

Novo arquivo `db/migrate-2026-09-03-shared-lesson-codes.sql`:

- `DROP INDEX IF EXISTS redeem_codes_active_idx;`
- recriar como índice **não parcial** em `(lesson_id, expires_at DESC)`.
- Atualizar `db/setup.sql` com o mesmo índice e comentário explicando a semântica
  compartilhada do código.

---

## 3. Critérios de aceite

| # | Cenário | Resultado esperado |
|---|---------|--------------------|
| 1 | Salvar o registro da Aula 01 e ganhar uma conquista normal | Flash rápido + toast com título "Conquista Desbloqueada"; tudo some em ~1,5 s sem resíduo luminoso. |
| 2 | Salvar registro que dispara conquista secreta | Banner central "Conquista secreta desbloqueada" visível por ~2,4 s, depois os toasts. |
| 3 | Trocar de aba / navegar durante a animação | Nenhum overlay, canvas ou brilho permanece na tela. |
| 4 | `prefers-reduced-motion: reduce` | Textos aparecem sem animação; nada trava. |
| 5 | Aluno A resgata o código da aula | 200, XP creditado. |
| 6 | Aluno B resgata o **mesmo** código, dentro dos 20 min | 200, XP creditado. |
| 7 | Aluno A resgata o mesmo código de novo | 409 "Você já resgatou este código." |
| 8 | Qualquer aluno resgata após 20 min | 410 "Código expirado (validade de 20 minutos)." |
| 9 | Aula 01 pede o código depois de vários resgates | `lessonCode` continua devolvendo o código ativo. |

---

## 4. Riscos e mitigação

- **Perda do efeito shader:** o visual fica exclusivamente CSS. Mitigação: o fallback CSS
  já era o caminho padrão em qualquer navegador sem WebGL ou com CDN bloqueada.
- **Dependência órfã:** `@vfx-js/core` permanece em `package.json` mas deixa de ser importada.
  Pode ser removida em uma limpeza posterior sem impacto funcional.
- **Ambiente legado sem `expires_at`:** `codeExpiresAt()` já faz fallback para
  `created_at + 20 min`; o comportamento novo continua correto.
- **Compartilhamento indevido do código fora da sala:** já mitigado pelo TTL de 20 min,
  que passa a ser a única trava — reforçar orientação ao professor de gerar o código no início da aula.
