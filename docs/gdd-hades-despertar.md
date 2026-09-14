# Documento de Design de Jogo (GDD) & Arquitetura de Software: Hades - O Despertar do Submundo

---

## 1. Visão Geral e Pitch

### 1.1 Resumo do Jogo
**"Hades: O Despertar do Submundo"** é um jogo incremental e *clicker* ativo para navegadores web, ambientado nas profundezas da mitologia grega. O jogador assume o papel do próprio Imperador Ctoniano, gerenciando a colheita, o processamento e a administração das almas mortais que chegam ao reino dos mortos. Inspirado em clássicos do gênero como *Cookie Clicker* e *Antimatter Dimensions*, o jogo combina ação mecânica inicial (cliques para colher almas no Rio Acheron) com automação progressiva, gerenciamento de recursos em camadas e rituais de ascensão espiritual.

### 1.2 Mantra de Design
> *"Da primeira alma colhida às margens do Acheron à soberania absoluta sobre os rios do Inferno: acelerando a máquina do submundo através do trabalho eterno."*

### 1.3 Pilares de Design
* **Progressão Ininterrupção e Visceral:** Todo clique e cada contratação de servo ou construção ctoniana contribuem diretamente para o crescimento exponencial e visível da economia do submundo.
* **Descoberta Temática Narrativa:** A expansão da interface desvela progressivamente os rios do inferno (Styx, Cocytus, Phlegethon, Lethe) e os salões de julgamento, transformando abstrações numéricas em conquistas mitológicas.
* **Fidelidade Arquitetural Web:** Construído sob restrições técnicas rigorosas para servir de módulo interativo de aprendizagem na plataforma *"Fundamentos de Jogos Digitais"*, exemplificando padrões modernos de Game Loops, ES-Modules e segurança *server-authoritative*.

---

## 2. Tema e UI/UX

### 2.1 Atmosfera e Integração Mitológica
A experiência visual e narrativa é enraizada na topografia da escatologia grega. O fluxo de jogo é geograficamente mapeado através dos rios infernais e dos salões ctonianos:
* **Acheron (Rio do Pesar):** O ponto de partida onde as almas recém-chegadas são colhidas manualmente ou por servos de baixo escalão.
* **Styx (Rio dos Juramentos):** Zona de upgrades e multiplicadores sustentados por juramentos invioláveis.
* **Cocytus (Rio das Lamentações):** Geradores automatizados alimentados pelo lamento das almas.
* **Phlegethon (Rio de Fogo):** Estruturas de alta escala e automatizadores industriais de energia ctoniana.
* **Lethe (Rio do Esquecimento) & Lago de Mnemosyne:** O altar do ritual de **Ascensão/Prestígio**. O jogador apaga o progresso temporal no Lethe para obter a *Essência de Mnemosyne* e *Óbolos de Caronte*, retendo a memória de seu poder divino.

### 2.2 Direção de UI/UX e Paleta de Cores
O jogo adota um design *Dark Mode* solene e sofisticado, utilizando variáveis CSS3 puras para fácil manutenção e integração com a plataforma educacional.

```css
:root {
  /* Cores Base do Submundo */
  --bg-primary: #0a0a0f;       /* Preto Obsidiana */
  --bg-secondary: #12121a;     /* Cinza Ctoniano Profundo */
  --bg-card: #1a1a26;          /* Painéis da UI */
  
  /* Cores de Acento Mitológico */
  --accent-gold: #d4af37;      /* Dourado Mortuário (Óbolos/Hades) */
  --accent-styx: #00a896;      /* Verde Espectral / Estígio */
  --accent-fire: #d90429;      /* Vermelho Phlegethon */
  --accent-purple: #7209b7;    /* Roxo Imperial do Tártaro */
  
  /* Tipografia e Texto */
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --font-header: 'Cinzel', 'Georgia', serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### 2.3 Layout Funcional da Interface (Três Colunas)
1. **Coluna Esquerda (Santuário de Colheita Active):** Exibe a representação gráfica do Altar do Acheron, o botão de clique principal (Foice de Hades / Portal), estatísticas dinâmicas de Almas por Segundo ($SPS$), taxa de clique e o indicador de partículas ativas.
2. **Coluna Central (Mercado dos Rios / Geradores):** Lista vertical contendo os geradores passivos encadeados por nível, mostrando quantidade possuída, produção individual e botões de compra dinâmicos com máscaras visuais cinzas quando o saldo for insuficiente.
3. **Coluna Direita (Upgrades, Rituais & Estatísticas):** Abas alternáveis para Upgrades de Tecnologia, Panteão de Prestígio (Rio Lethe), Painel de Salvamento e Logs da Plataforma Educacional.

---

## 3. Mecânicas Principais

### 3.1 Loop de Jogabilidade Ativo e Passivo
O fluxo fundamental do jogo segue a estrutura clássica de sustentação psicológica:

```
+-----------------------------------------------------------------------+
|                         LOOP DE JOGABILIDADE                          |
+-----------------------------------------------------------------------+
|                                                                       |
|   +------------------+     +------------------+     +-------------+   |
|   |  Clique Manual / | --> | Accumulação de   | --> |  Saldo de   |   |
|   |  Geração Passiva |     | Almas no Acheron |     |  Carteira   |   |
|   +------------------+     +------------------+     +-------------+   |
|            ^                                               |          |
|            |                                               v          |
|   +------------------+                             +---------------+  |
|   |  Reset Lethe /   | <-------------------------- |  Aquisição de |  |
|   |  Prestígio       |                             |  Geradores    |  |
|   +------------------+                             +---------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

### 3.2 Unidades e Moedas
* **Almas (Souls):** Recurso primário contínuo gerado por cliques e geradores passivos.
* **Óbolos de Caronte (Obols):** Moeda de prestígio de Primeira Ordem obtida ao realizar a Ascensão no Rio Lethe.
* **Essência de Mnemosyne:** Moeda de prestígio de Segunda Ordem para destravamento de artefatos divinos na árvore de talentos.

### 3.3 Fórmulas Matemáticas de Escalonamento
Seguindo o padrão consolidado da indústria e a base da engine Aldo111, os custos evoluem de forma exponencial rigorosa para evitar o estouramento precoce e impor desafios de planejamento ao jogador:

#### Curva de Custo de Geradores
$$Price = BaseCost \times Multiplier^{Level}$$

Onde $Multiplier$ é configurado de forma adaptativa em $1.15$ para balanceamento de ritmo casual-analítico.

#### Produção Total por Segundo ($SPS$)
$$SPS = \left( \sum_{i=1}^{n} (Quantity_i \times BaseRate_i \times UpgradeMult_i) \right) \times PrestigeBonus$$

---

## 4. Economia e Prestígio

### 4.1 Tabela Macroequilibrada de Geradores Econômicos

| Tier | Nome do Gerador | Custo Base ($BaseCost$) | Rendimento Base ($SPS$) | Multiplicador ($Multiplier$) | Tempo de Amortização Inicial ($T_{amort}$) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | **Sombra Vagante** | $15$ almas | $0.1$ almas/s | $1.15$ | $150.0\text{ s}$ |
| **2** | **Servos de Caronte** | $100$ almas | $0.8$ almas/s | $1.15$ | $125.0\text{ s}$ |
| **3** | **Cão Cerberiano** | $1.100$ almas | $8.0$ almas/s | $1.15$ | $137.5\text{ s}$ |
| **4** | **Juiz do Tártaro** | $12.000$ almas | $47.0$ almas/s | $1.15$ | $255.3\text{ s}$ |
| **5** | **Forja de Phlegethon** | $130.000$ almas | $260.0$ almas/s | $1.15$ | $500.0\text{ s}$ |
| **6** | **Trono de Obsidiana** | $1.400.000$ almas | $1.400.0$ almas/s | $1.15$ | $1000.0\text{ s}$ |

### 4.2 Mecânica de Prestígio (A Catábase no Rio Lethe)
Nas fases avançadas, a curva de custo exponencial cria uma barreira (a "parede de progressão"). O jogador pode acionar o **Ritual do Lethe**, que reseta todas as Almas e Geradores acumulados na corrida atual, convertendo-os em **Óbolos de Caronte**.

#### Fórmulas de Conversão de Óbolos
A conversão utiliza uma função de potência fracionária (raiz cúbica) inspirada nas mecânicas de *Cookie Clicker* e *Antimatter Dimensions* para conter a inflação desenfreada:

$$\text{Óbolos Ganhos} = \left\lfloor \sqrt{\frac{\text{Almas Totais da Corrida}}{10^{9}}} \right\rfloor$$

#### Multiplicador de Prestígio Aplicado
$$\text{PrestigeBonus} = 1 + (\text{Óbolos Totais} \times 0.05) \times \text{MultiplicadorMnemosyne}$$

---

## 5. Diretrizes de Engenharia e Arquitetura de Software

### 5.1 Evolução da Engine Base (Aldo111 $\to$ Modern ES-Modules)
O repositório clássico `Aldo111/incremental-game-engine-js` oferecia uma abstração síncrona baseada em jQuery e estado global mutável. Modernizamos essa arquitetura para **Vanilla JavaScript (ES-Modules)**, separando estritamente a simulação matemática da camada de renderização DOM e adicionando persistência assíncrona.

#### Estrutura de Diretórios do Projeto Client-Side
```text
/src
  ├── index.js                # Bootstrap e inicialização
  ├── config/
  │   └── constants.js        # Custos base, taxas e multiplicadores
  ├── core/
  │   ├── GameLoop.js         # Loop de tempo preciso baseado em RAF
  │   ├── GameState.js        # Estado reativo e lógica da carteira
  │   ├── Entity.js           # Classe base (Evolução de Aldo111 Entity)
  │   └── EntitySet.js        # Coleções de geradores (Evolução Aldo111)
  ├── services/
  │   ├── StorageService.js   # Encapsulamento de IndexedDB / Base64 Local
  │   └── ApiService.js       # Sincronização assíncrona com Supabase API
  └── ui/
      ├── UIRenderer.js       # Atualizações cirúrgicas do DOM
      └── NumberFormatter.js  # Formatador numérico para sufixos (1.2M, 4.7B)
```

### 5.2 Implementação do Game Loop Cliente (Delta Time & RAF)
O Game Loop abandona temporizadores síncronos como `setInterval` (sujeitos a paralisações do navegador e oscilações de FPS) e adota `requestAnimationFrame` acoplado ao tempo decorrido (*Delta Time*) e acumulador de *lag* para garantir atualizações determinísticas e suaves a 60 Ticks/s.

```javascript
// src/core/GameLoop.js

export class GameLoop {
  constructor(updateCallback, renderCallback, fps = 60) {
    this.update = updateCallback;
    this.render = renderCallback;
    this.step = 1000 / fps; // ~16.66ms por tick
    this.lastTime = null;
    this.accumulatedLag = 0;
    this.animationFrameId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulatedLag += deltaTime;

    let updateCount = 0;
    // Prevenção de "Spiral of Death" se a guia perder o foco
    while (this.accumulatedLag >= this.step) {
      this.update(this.step / 1000.0); // Repassa delta em segundos
      this.accumulatedLag -= this.step;
      
      if (++updateCount >= 300) { // Trava de segurança panic()
        this.accumulatedLag = 0;
        break;
      }
    }

    // Renderização interpolada
    const alpha = this.accumulatedLag / this.step;
    this.render(alpha);

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
```

### 5.3 Arquitetura de Persistência e Segurança Server-Authoritative

Para evitar que o jogador altere diretamente o saldo via *DevTools* do navegador, a aplicação utiliza um modelo **Server-Authoritative Flexível**:

1. **Execução Fluida Local:** O cliente calcula os ganhos a 60 FPS usando a classe `GameState`.
2. **Sincronização Periódica Assíncrona:** A cada 30 segundos (or em ações críticas como compras e prestígio), o `ApiService` envia uma requisição `POST` para a rota Serverless Node.js `/api/sync`.
3. **Validação no Servidor Node.js:** O servidor recupera o último estado registrado no Supabase (PostgreSQL), calcula a produção *máxima teoricamente possível* entre `last_sync_at` e o momento atual ($SPS_{max} \times \Delta t$), valida se a solicitação do cliente está dentro de uma margem de tolerância aceitável ($\pm 5\%$) e autoriza a gravação.

```
+------------------+         30s Sync Payload         +-------------------+
|                  | -------------------------------> |                   |
|  Cliente Browser |                                  |  Node.js Server   |
|  (60 FPS Loop)   | <------------------------------- |  (/api/sync)      |
+------------------+       Validação & Estado DB      +-------------------+
         |                                                      |
         v                                                      v
  [IndexedDB Save]                                     [Supabase PostgreSQL]
```

### 5.4 Modelo do Banco de Dados Supabase (SQL Schema)

```sql
-- Tabela de Estados dos Jogadores no Supabase (PostgreSQL)

CREATE TABLE public.player_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    souls NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    obols NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    lifetime_souls NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    generators_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    upgrades_state JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Políticas de Segurança no Nível de Linha (RLS)
ALTER TABLE public.player_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários só podem ler seu próprio estado" 
    ON public.player_states FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Apenas funções do servidor podem atualizar estados" 
    ON public.player_states FOR UPDATE 
    USING (auth.uid() = user_id);
```

### 5.5 Simulação de Progresso Offline (Offline Catch-Up Engine)
Ao inicializar a aplicação, o motor lê os dados persisitidos localmente e recupera o registro `last_sync_at`. Se o delta de ausência for positivo, calcula a recompensa passiva offline respeitando o teto configurado de ausência:

```javascript
// src/services/OfflineEngine.js

export function calculateOfflineProgress(savedState, maxOfflineHours = 8) {
  const now = Date.now();
  const lastSync = new Date(savedState.last_sync_at).getTime();
  const elapsedSeconds = Math.max(0, (now - lastSync) / 1000);

  if (elapsedSeconds < 10) return { offlineSouls: 0, timeApplied: 0 };

  const maxAllowedSeconds = maxOfflineHours * 3600;
  const effectiveSeconds = Math.min(elapsedSeconds, maxAllowedSeconds);

  // Calcula SPS total baseado na fórmula de geradores do estado salvo
  const currentSPS = calculateTotalSPS(savedState.generators_state, savedState.upgrades_state);
  
  // Taxa de eficiência offline (ex: 80% do rendimento normal)
  const offlineEfficiency = 0.80;
  const offlineSouls = effectiveSeconds * currentSPS * offlineEfficiency;

  return {
    offlineSouls,
    effectiveSeconds,
    cappedOut: elapsedSeconds > maxAllowedSeconds
  };
}
```

### 5.6 Exemplo de Rota Serverless Node.js (`/api/sync.js`)

```javascript
// api/sync.js (Node.js Serverless Route)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, clientState } = req.body;

  // 1. Busca estado autêntico atual no banco de dados
  const { data: dbState, error } = await supabase
    .from('player_states')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !dbState) return res.status(404).json({ error: 'Jogador não encontrado' });

  // 2. Validação matemática de tempo e taxa de ganho teórica
  const now = new Date();
  const lastSync = new Date(dbState.last_sync_at);
  const deltaSeconds = (now - lastSync) / 1000;

  const serverSPS = re-calculateSPS(dbState.generators_state, dbState.upgrades_state);
  const maxPossibleGain = (serverSPS * deltaSeconds) * 1.05; // 5% de tolerância
  const claimedGain = clientState.souls - dbState.souls;

  // 3. Checagem Anti-Cheat
  if (claimedGain > maxPossibleGain && claimedGain > 100) {
    return res.status(400).json({ 
      error: 'Inconsistência de estado detectada.', 
      validatedSouls: dbState.souls 
    });
  }

  // 4. Atualização Autorizada
  const { data: updated, error: updateError } = await supabase
    .from('player_states')
    .update({
      souls: clientState.souls,
      generators_state: clientState.generators_state,
      upgrades_state: clientState.upgrades_state,
      last_sync_at: now.toISOString()
    })
    .eq('user_id', userId)
    .select();

  return res.status(200).json({ success: true, state: updated });
}
```

---

## 6. Considerações Finais e Cronograma do Módulo Educacional

Este GDD fornece as diretrizes completas para a implementação do módulo prático da plataforma **"Fundamentos de Jogos Digitais"**. A arquitetura apresentada conecta de forma direta os pilares teóricos da literatura técnica (curvas exponenciais, escalonamento, amortização e atratividade psicológica) com práticas modernas de engenharia de software na web (ES-Modules puras, Game Loops com Delta Time, IndexedDB e microsserviços serverless seguros).
