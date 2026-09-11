# 🏛️ Enigma Supremo do Submundo: Planejamento Arquitetural de ARG e Web Puzzles

Este documento apresenta o planejamento arquitetural e de engenharia para a implementação do **"Enigma Supremo do Submundo"**, um puzzle web multi-telas profundo, gamificado e educativo, projetado para testar conhecimentos práticos de desenvolvimento web, inspeção de protocolo, análise forense de mídias e criptografia [4, 15, 17].

> **Integração ao produto:** engenharia, tasks, adaptação ao stack do curso (`api/progress.js`, `users.conquistas`, páginas estáticas, raridade Única) e Task 0 estão em [`plano-grimorio-conquistas-enigma.md`](./plano-grimorio-conquistas-enigma.md). Este arquivo permanece a fonte de design do ARG (salas, pistas, chaves, recompensa). Trechos Next.js Edge / RPC / `auth.users` abaixo são referência conceitual — a implementação segue a §Adaptação do plano.

---

## 1. Visão Geral da Jornada & Filosofia de Design ARG

O enigma é concebido sob o conceito fundamental de Alternate Reality Games (ARG) conhecido como **TINAG** (*This Is Not A Game* - "Isto Não É Um Jogo"), no qual as mecânicas de jogo se camuflam diretamente nas ferramentas reais do navegador e nos ecossistemas web [7, 10, 40]. A experiência inspira-se esteticamente no submundo da mitologia grega (com ambientação do jogo *Hades*) e pedagogicamente nos grandes marcos dos enigmas digitais da internet, como *Notpron* [4] e a *Cicada 3301* [10, 40].

### Metodologia Educativa
O objetivo do enigma é transformar o navegador em um ambiente interativo de apuração técnica. Cada fase exige que o aluno deixe de ser um mero consumidor de interface gráfica e passe a atuar como um investigador e engenheiro web, utilizando as ferramentas do desenvolvedor (DevTools), análise de estilos CSS, esteganografia em mídias digitais, inspeção de requisições HTTP e primitivas criptográficas nativas da linguagem JavaScript [4, 6, 15, 20].

---

## 2. O Gatilho (*The Rabbit Hole / Trailhead*)

O ponto de partida da experiência (a "Toca do Coelho") encontra-se camuflado na própria plataforma pública do curso, inserido na seção de conquistas da turma [11].

* **Ocultação:** Determinadas letras maiúsculas ao longo dos títulos e descrições das conquistas públicas possuem uma estilização sutil em itálico ou atributo de dados no HTML.
* **O Anagrama:**
  $$\text{"T A R T A R O  --  O C U L T O"}$$
* **A Descoberta:** Ao reunir as letras destacadas e resolver o anagrama, o aluno obtém a rota de acesso secreta no domínio da aplicação.
* **URL Secreta Inicial:** `/submundo/tartaro-oculto`
* **Portão do Salão (paralelo):** no hub *Salão dos Heróis*, um glifo corrupto quase invisível (`░`, canto inferior) abre o modal de palavra-passe. A resposta é o mesmo anagrama (`TARTARO OCULTO`); sucesso redireciona para `/submundo/tartaro-oculto`. O trailhead das runas permanece.

---

## 3. Detalhamento Completo das Salas (Fases 1 a 4)

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
  O áudio fornecido (`asfodelos_echo.wav`) contém uma imagem/texto sintetizada no domínio da frequência [7, 20]. Quando reproduzido acusticamente, o ouvido ouve apenas estática não inteligível [19, 21].
  O aluno deve baixar o arquivo WAV e abri-lo em um software de análise forense como o **Audacity** ou em um analisador espectral web [20, 28].
  1. No Audacity, o aluno clica no menu suspenso da faixa de áudio e altera a visualização de *Waveform* (Forma de Onda) para **Spectrogram** (Espectrograma) [20, 22].
  2. Ajusta as configurações de espectrograma (*Window size* para 1024/2048 e escala de frequência para a faixa de 2000 Hz a 4000 Hz) para aumentar a nitidez [20].
* **A Solução:** O espectrograma exibe a chave em letras de bloco: `PERSEPHONE_PASS`.
* **Próxima URL:** `/submundo/elisios-julgamento`

---

### ⚖️ Fase 3: O Palácio dos Elísios
* **Nome e Tema:** *O Palácio dos Elísios* (O Julgamento da Rede).
* **Aparência Visual:** Representação de um tribunal imponente com três estátuas de pedra (os juízes Minos, Radamanto e Éaco) e um botão de ação marcado como *"Solicitar Julgamento dos Juízes"*.
* **A Pista / Riddle:**
  > *"O oráculo não profetiza na interface dos mortais. Examine as correntes de dados que trafegam nos bastidores da rede antes que o payload se desfaça."*
* **A Mecânica:** **Análise de Payload na Network Tab & Decodificação Base64.**
  Ao clicar no botão de julgamento, a interface exibe apenas a mensagem genérica `"Acesso Negado pelos Juízes"`. No entanto, ao monitorar a aba **Network (Rede)** do DevTools e inspecionar a resposta da requisição `POST /api/v1/underworld/julgamento`, o aluno encontrará o payload JSON completo:
  ```json
  {
    "status": "denied",
    "oracle_token": "a2V5X2VsZXN0aWFsX2hhZGVz",
    "encoding": "Base64",
    "hint": "Use atob() no Console ou CyberChef para revelar o segredo."
  }
  ```
  O aluno deve pegar o valor do token Base64 e decodificá-lo no Console do navegador através de `atob('a2V5X2VsZXN0aWFsX2hhZGVz')` ou utilizando utilitários como o **CyberChef** [6, 49].
* **A Solução:** A string decodificada resulta na chave: `key_elestial_hades`.
* **Próxima URL:** `/submundo/estige-obolo`

---

### 🌊 Fase 4: As Águas Cegas do Rio Estige (O Clímax)
* **Nome e Tema:** *As Águas Cegas do Rio Estige* (O Juramento Sagrado).
* **Aparência Visual:** A barca de Caronte flutuando sobre águas escuras e brilhantes. No centro da tela, um altar com um pedestal solicitando o *"Óbolo de Ouro"* (o hash criptográfico do juramento).
* **A Pista / Riddle:**
  > *"Para cruzar o rio sem retorno, o barqueiro não aceita moedas comuns. Pague o tributo gerando o hash SHA-256 exato da mensagem sagrada no terminal do seu navegador."*
* **A Mecânica:** **Execução de Código JS via Console & Web Crypto API.**
  Um script executa automaticamente ao carregar a página e imprime uma mensagem formatada com estilos CSS no **Console JS** (`console.log`):
  > `⚡ [CHARON_SYSTEM]: Calcule o hash SHA-256 em hexadecimal da string "ESTIGE_OBOLO_2026" utilizando crypto.subtle.digest().`

  Para evitar que o hash final fique visível no código-fonte cliente, a validação exige que o aluno execute a primitiva nativa da **Web Crypto API** [15, 16, 178, 183]:
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
* **A Solução:** O cálculo via Web Crypto API resulta no hash hexadecimal SHA-256 exato:
  `18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c`.

---

## 4. O Clímax e Recompensa

Ao colar o hash correto no altar da Fase 4, a travessia do Rio Estige é concluída. Uma animação festiva em estilo *game-feel* é disparada na tela, acompanhada do desbloqueio da conquista secreta.

* **Nome da Conquista Secreta:** 👑 **Soberano do Submundo** (*Lord of the Underworld*)
* **Descrição:** *"Superou as sombras do Tártaro, decifrou os ecos de Asfódelos, interceptou o julgamento dos Elísios e pagou o tributo sagrado no Rio Estige. Mestre absoluto da inspeção web, esteganografia e criptografia."*
* **Recompensa Gamificada:**
  * **XP:** `+1500 XP`
  * **Badge Exclusivo:** *Cetro Criptográfico de Hades* (Ícone animado com aura dourada e roxa no perfil do aluno).

---

## 5. Guia de Implementação Rápida (Backend Serverless & Supabase)

A arquitetura de validação foi estruturada de forma leve e segura, permitindo hospedagem estática em plataformas como Vercel/Netlify integrada ao banco de dados Supabase [15].

```
┌─────────────────────────┐       1. Submete Hash       ┌──────────────────────────────┐
│  Frontend (Navegador)   │ ─────────────────────────>  │  Serverless Edge Function    │
└─────────────────────────┘                             └──────────────┬───────────────┘
             ▲                                                         │
             │                                              2. Valida  │ e Invoca RPC
             │                                                         ▼
┌────────────┴────────────┐                             ┌──────────────────────────────┐
│  Atualização de Perfil  │ <─────────────────────────  │  Supabase (PostgreSQL + RLS) │
│   (+1500 XP / Badge)    │       3. Confirmação        └──────────────────────────────┘
└─────────────────────────┘
```

### A. Tabela do Banco de Dados no Supabase
```sql
-- Tabela para rastreamento de progresso no desafio
CREATE TABLE public.underworld_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_room INT DEFAULT 1,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.underworld_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio progresso"
ON public.underworld_progress FOR SELECT
USING (auth.uid() = user_id);
```

### B. Função RPC de Concessão de Conquista
A atribuição do prêmio é realizada via uma Stored Procedure de banco de dados (`SECURITY DEFINER`) para evitar que alunos alterem o próprio XP arbitrariamente no lado cliente [15]:

```sql
CREATE OR REPLACE FUNCTION unlock_underworld_achievement(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Atualizar ou inserir progresso concluído
    INSERT INTO public.underworld_progress (user_id, current_room, is_completed, updated_at)
    VALUES (p_user_id, 5, TRUE, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET is_completed = TRUE, current_room = 5, updated_at = now();

    -- 2. Conceder a pontuação de XP
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 1500
    WHERE id = p_user_id;

    -- 3. Registrar o Badge exclusivo na tabela de conquistas
    INSERT INTO public.user_achievements (user_id, achievement_slug, unlocked_at)
    VALUES (p_user_id, 'soberano-do-submundo', now())
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### C. Rota Serverless de Validação (Next.js / Vercel Edge API)
```typescript
import { createClient } from '@supabase/supabase-js';

const EXPECTED_HASH = "18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c";

export async function POST(req: Request) {
  const { userId, submittedHash } = await req.json();

  if (submittedHash?.toLowerCase() === EXPECTED_HASH) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Invocar a RPC atômica no banco de dados
    const { error } = await supabase.rpc('unlock_underworld_achievement', {
      p_user_id: userId
    });

    if (error) return Response.json({ success: false, message: "Erro ao registrar conquista." }, { status: 500 });

    return Response.json({ 
      success: true, 
      message: "Travessia concluída com sucesso! Conquista e XP concedidos." 
    });
  }

  return Response.json({ success: false, message: "Óbolo rejeitado. Hash incorreto." }, { status: 400 });
}
```

---

## A11y e exceções ARG (produto)

Salas do Submundo priorizam **TINAG / DevTools** sobre WCAG completo. Exceções documentadas:

| Superfície | Contrato |
| --- | --- |
| Modal **Revelar** (Grimório) | `role="dialog"`, Escape, foco inicial, **focus trap** (Tab), `aria-expanded` no gatilho |
| Confirms do Grimório | Escape + trap + retorno de foco |
| Salas `/submundo/*` | `noindex`; pistas em CSS/Network/áudio/console são **intencionais**; `.hidden-rune` pode ser `aria-hidden` |
| Asfódelos (WAV) | Conteúdo no espectrograma — alternativa textual mínima na pista da sala; não duplicar a chave em HTML |
| Estige (hash) | Validação só no servidor; console do aluno é parte do puzzle |

`prefers-reduced-motion` aplica-se às animações de UI do produto (modal, toast, barras); salas ARG podem manter atmosfera visual estática.

---

*Documentação arquitetural concluída e pronta para implantação.*
