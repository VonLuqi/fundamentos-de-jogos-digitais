# Plano de Reformulacao Juicy - Conquistas da Aula 1

## Contexto
Reformular o feedback visual de desbloqueio de conquista na Aula 1 para um popup dourado, rapido e impactante, sem revelar que a conquista era secreta.

## Objetivo
- Substituir a comunicacao de "segredo descoberto" por "conquista descoberta".
- Exibir popup curto, elegante e nao bloqueante.
- Aplicar efeitos especiais com VFX-JS, com fallback para CSS quando necessario.

## Escopo Tecnico
- `pages/aula1.html`
- `css/aula.css`
- `js/aula1.js`
- `package.json` (somente validacao de dependencia)

## Tarefas (Checklist)

### Fase 1 - UI do popup
- [x] Reduzir o popup para layout compacto e dourado.
- [x] Alterar titulo para "Conquista Descoberta".
- [x] Mostrar apenas icone + nome da conquista no popup.
- [x] Remover termos que revelem segredo (ex.: "segredo revelado", "segredo").

### Fase 2 - Comportamento e timing
- [x] Garantir exibicao automatica ao receber conquistas no retorno do envio.
- [x] Definir duracao curta (entre 1200ms e 1800ms).
- [x] Implementar fila para multiplas conquistas (uma por vez).
- [x] Garantir que o popup nao bloqueia abas, campos e botoes da aula.

### Fase 3 - Integracao VFX-JS
- [x] Inicializar VFX-JS no boot da Aula 1.
- [x] Disparar burst visual dourado no momento de unlock.
- [x] Aplicar distorcao/brilho suave sem poluir leitura do conteudo.
- [x] Implementar fallback automatico para animacao CSS se VFX falhar.

### Fase 4 - Polimento visual juicy
- [x] Melhorar contraste e acabamento metalico do card.
- [x] Ajustar entrada/saida (pop + fade curto).
- [x] Aplicar stagger em multiplos unlocks.
- [x] Garantir legibilidade em mobile.

### Fase 5 - Acessibilidade e robustez
- [x] Respeitar `prefers-reduced-motion`.
- [x] Evitar foco preso no popup.
- [x] Garantir que o popup desaparece sozinho.
- [x] Validar que nao intercepta clique quando oculto.

### Fase 6 - Validacao funcional
- [ ] Validar envio de anotacoes com 1 conquista liberada.
- [ ] Validar envio com multiplas conquistas liberadas.
- [ ] Validar comportamento para usuario normal e admin.
- [ ] Validar ausencia de erro no console.

## Criterios de Aceite
- Popup dourado aparece ao desbloquear conquista e some rapidamente.
- Nenhum texto do popup denuncia "segredo" para o aluno.
- Efeito VFX-JS roda quando disponivel; fallback CSS funciona quando nao estiver.
- Fluxo de envio da aula segue funcional e sem travamentos.
- Experiencia visual fica mais impactante sem prejudicar usabilidade.

## Riscos e Mitigacoes
- Risco: efeito exagerado atrapalhar leitura.
  - Mitigacao: limitar intensidade, duracao e area do efeito.
- Risco: VFX nao carregar em alguns ambientes.
  - Mitigacao: fallback CSS ja pronto e testado.
- Risco: overlay bloquear interacao.
  - Mitigacao: garantir hidden com `display: none !important` e timeout de cleanup.

## Ordem de Implementacao Recomendada
1. UI base do popup (Fase 1).
2. Comportamento e fila (Fase 2).
3. Integracao VFX (Fase 3).
4. Polimento visual (Fase 4).
5. Acessibilidade (Fase 5).
6. Testes finais (Fase 6).

## Status
- Estado atual: Fase 1, Fase 2, Fase 3, Fase 4 e Fase 5 concluidas.
- Proximo passo: iniciar Fase 6 (validacao funcional completa).
