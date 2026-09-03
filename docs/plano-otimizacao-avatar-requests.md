# Plano de otimização das requisições de avatar

## Objetivo
Reduzir drasticamente as requisições HTTP geradas para localizar e renderizar avatares, eliminando a sequência de 404s observada no boot do menu principal, do dashboard e do Salão dos Heróis.

A meta é preservar a compatibilidade com os avatares já existentes, mas trocar o mecanismo atual de descoberta por um fluxo previsível, com no máximo 1 requisição por avatar exibido no caminho feliz.

---

## Diagnóstico atual

O problema aparece porque o frontend faz duas coisas ao mesmo tempo:

- varre a pasta `assets/avatars/` para descobrir quantos avatares existem;
- testa várias extensões por arquivo até encontrar a imagem correta.

Isso está concentrado principalmente em [js/api.js](js/api.js) e é consumido por:

- [js/main.js](js/main.js)
- [js/dashboard.js](js/dashboard.js)
- [js/souls.js](js/souls.js)

O efeito prático é que, quando o avatar real está em uma extensão diferente da primeira tentada, o navegador dispara uma fila de 404s antes de resolver a imagem correta.

---

## Causa raiz

A raiz do problema não é o `<img>` em si. É a estratégia de descoberta por tentativa e erro.

Hoje o sistema depende de:

- lista longa de extensões candidatas;
- detecção sequencial de `avatar1`, `avatar2`, `avatar3`...;
- fallback que tenta várias URLs por índice;
- cache só depois que a imagem correta já foi encontrada.

Isso é funcional, mas caro demais em número de requisições e ruído no console.

---

## Estratégia recomendada

### 1. Trocar a descoberta por um índice explícito
Criar uma fonte única de verdade para os avatares disponíveis.

Opções viáveis:
- um manifesto estático gerado no build;
- um JSON mantido junto com os assets;
- um mapeamento produzido pelo backend e consumido pelo frontend.

Recomendação prática:
- usar um manifesto simples com `id`, `filename` e `src`.
- deixar o frontend parar de adivinhar a extensão.

### 2. Padronizar o formato dos arquivos
Escolher um formato preferencial para os avatares, como PNG ou WebP.

Recomendação prática:
- adotar um único formato canônico por avatar;
- manter fallback legado apenas para arquivos antigos, por um período de transição.

### 3. Carregar apenas o avatar necessário
A tela não deve ficar testando dezenas de URLs para descobrir o que já deveria saber.

Recomendação prática:
- substituir `avatarCandidates()` por lookup direto;
- manter cache de URL resolvida, mas só como segunda camada;
- evitar qualquer varredura global no boot se o total já estiver definido.

### 4. Separar contagem de resolução de imagem
Contar quantos avatares existem e resolver a imagem do usuário são problemas diferentes.

Recomendação prática:
- a contagem deve vir do manifesto, não de probing por imagem;
- a resolução do avatar deve usar o caminho exato do arquivo já conhecido.

### 5. Reduzir chamadas redundantes nas telas
Como [js/main.js](js/main.js), [js/dashboard.js](js/dashboard.js) e [js/souls.js](js/souls.js) chamam o mesmo helper, a melhoria precisa valer para todos os pontos de renderização.

Recomendação prática:
- centralizar a lógica de avatar em [js/api.js](js/api.js);
- evitar que cada página tente descobrir os mesmos dados de novo.

---

## Plano de execução

### Fase 1 — Inventário técnico
- identificar quantos avatares existem de fato;
- verificar quais extensões estão sendo usadas hoje;
- listar onde o helper de avatar é chamado;
- confirmar se há avatares com nomes fora do padrão.

### Fase 2 — Novo contrato de dados
- definir o formato do manifesto ou índice de avatar;
- decidir se o índice será mantido no frontend ou vindo do backend;
- determinar se a aplicação precisa aceitar múltiplas extensões ou se pode fixar uma.

### Fase 3 — Refactor da resolução
- remover a varredura sequencial por extensões no caminho principal;
- trocar a montagem de URLs por lookup direto;
- preservar fallback único para avatar inválido;
- manter cache, mas apenas para evitar recarga repetida do mesmo arquivo.

### Fase 4 — Ajuste das telas consumidoras
- revisar menu principal;
- revisar dashboard;
- revisar Salão dos Heróis;
- validar que nenhum ponto continua disparando detecção redundante.

### Fase 5 — Validação
- confirmar no DevTools que o boot não gera fila de 404s;
- confirmar que o avatar certo aparece com uma única requisição;
- testar troca de avatar no dashboard e no salão;
- validar comportamento com avatar ausente ou índice inválido.

---

## Critérios de aceite
- o carregamento inicial não deve mais exibir uma cascata de 404s;
- cada avatar deve ser resolvido com o menor número possível de requisições;
- o mesmo helper deve funcionar em todas as páginas que exibem avatar;
- o fallback precisa continuar existindo, mas não como mecanismo principal;
- o console deve ficar limpo no cenário normal.

---

## Riscos e trade-offs
- se os arquivos atuais estiverem em extensões misturadas, a padronização pode exigir um passo de migração;
- se o manifesto for manual, ele pode ficar desatualizado sem disciplina de manutenção;
- se o backend passar a servir o índice, pode ser necessário ajustar a API de progresso ou o payload do usuário.

---

## Próximo passo sugerido
Após aprovar este plano, o próximo passo é implementar o manifesto ou o mapeamento direto e então remover a tentativa sequencial por extensões em [js/api.js](js/api.js).