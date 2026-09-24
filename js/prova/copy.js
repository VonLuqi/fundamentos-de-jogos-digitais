/**
 * Copy da prova — português simples (público adolescente). Task C3.
 */

'use strict';

export const PROVA_COPY = Object.freeze({
  warnBanner:
    'Não saia desta página. Se sair ou fechar a aba, o tempo continua passando.',

  loading: 'Preparando a prova…',

  introLead:
    '20 questões · 12 de marcar · 8 para escrever · vale 20 pontos.',

  introRules: Object.freeze([
    'Você tem 1 hora e 30 minutos. O tempo começa quando apertar Iniciar prova.',
    'Aparece 1 questão por vez. Use Anterior e Próxima para navegar.',
    'Não saia desta página. Se sair, o tempo não pausa.',
    'As respostas salvam sozinhas. No fim, aperte Enviar prova.',
    'Depois do envio, o Mestre corrige as questões escritas.',
  ]),

  introReady:
    'Leia as regras. Ao apertar Iniciar prova, o cronômetro de 1h30 começa.',
  introClosed: 'A prova ainda não foi aberta pelo Mestre.',
  introCantStart: 'Você não pode iniciar a prova neste momento.',
  introStarting: 'Iniciando…',

  integrityTitle: 'Ei — você saiu da prova',
  integrityBody:
    'O Mestre pode ver se você muda de aba ou fecha a janela. O tempo continua passando. Volte e termine as questões.',
  integrityOk: 'Entendi, continuar',

  submitTitle: 'Enviar a prova?',
  submitBody:
    'Depois de enviar, você não pode mudar as respostas. O Mestre corrige as questões escritas.',
  submitCancel: 'Revisar mais',
  submitConfirm: 'Confirmar envio',
  submitConfirmFallback: 'Enviar a prova? Você não poderá alterar depois.',
  submitAllAnswered: 'Todas as 20 questões têm resposta. Pode enviar.',

  expiredTitle: 'Tempo esgotado',
  expiredSending: 'Os 90 minutos acabaram. Estamos enviando sua prova…',
  expiredSent: 'Tempo esgotado. Sua prova foi enviada. Agora é só esperar a correção do Mestre.',
  expiredRetryFail:
    'Não deu para enviar agora. Suas respostas ficaram salvas quando deu. Volte mais tarde ou avise o Mestre — o tempo já acabou.',
  expiredOk: 'Ver resultado',
  expiredWait: 'Aguarde…',

  doneHeading: 'Aguardando correção',
  doneWaiting:
    'Sua prova foi enviada. O Mestre ainda vai corrigir as questões escritas. A nota só aparece quando ele fechar.',
  doneTimedOut:
    'O tempo acabou e a prova foi enviada. O Mestre ainda vai corrigir. A nota só aparece quando ele fechar.',
  doneGradedHeading: 'Nota liberada',
  doneGradedMessage: 'O Mestre fechou a sua nota. Confira o resultado e o gabarito abaixo.',
  doneBreakdownMc: 'Múltipla escolha (automático)',
  doneBreakdownDisc: 'Questões escritas (Mestre)',
  doneBreakdownTotal: 'Total',
  doneRefresh: 'Atualizar status',
  doneSubmittedAt: 'Enviada em',
  doneReviewTitle: 'Gabarito e comentários',
  doneReviewGeneral: 'Comentário geral do Mestre',
  doneReviewYourChoice: 'Sua resposta',
  doneReviewCorrect: 'Gabarito',
  doneReviewBlank: '(em branco)',
  doneReviewComment: 'Comentário',
  doneReviewOk: 'Acertou',
  doneReviewMiss: 'Errou',
  doneReviewPoints: 'Pontos',

  contestTitle: 'Contestar a nota',
  contestLead:
    'Se achar que a correção errou em alguma questão, explique aqui. O Mestre responde ou revisa a nota.',
  contestPlaceholder: 'Ex.: na questão 15 dei o exemplo do círculo mágico e acho que valia 1 ponto…',
  contestSubmit: 'Enviar contestação',
  contestSending: 'Enviando…',
  contestOpenTitle: 'Contestação enviada',
  contestOpenBody: 'O Mestre ainda vai responder ou revisar sua nota.',
  contestAnsweredTitle: 'Resposta do Mestre',
  contestRevisedTitle: 'Nota revisada',
  contestRevisedBody: 'O Mestre revisou a correção depois da sua contestação.',
  contestYourMessage: 'Sua mensagem',
  contestAdminReply: 'Resposta do Mestre',
  contestAgain: 'Contestar de novo',
  contestFail: 'Não deu para enviar a contestação.',
  contestEmpty: 'Escreva o que você acha que está errado.',

  saveSaving: 'Salvando…',
  saveSaved: 'Salvo.',
  saveSending: 'Enviando…',
  examStarted: 'Prova iniciada. Boa sorte!',
  examResumed: 'Continuando de onde você parou.',

  blockedUnavailable: 'A prova não está aberta no momento.',
  blockedLoad: 'Não foi possível carregar a prova.',
  blockedResume: 'Não foi possível retomar a prova.',
  startFail: 'Não foi possível iniciar.',
  submitFail: 'Falha ao enviar.',
});

/**
 * Resumo do confirm de envio (Task E2).
 * @param {number} unansweredCount
 */
export function formatSubmitUnansweredSummary(unansweredCount) {
  const n = Math.max(0, Number(unansweredCount) || 0);
  if (n <= 0) return PROVA_COPY.submitAllAnswered;
  if (n === 1) {
    return 'Atenção: 1 questão ainda está em branco. Em branco vale 0. Enviar mesmo assim?';
  }
  return `Atenção: ${n} questões ainda estão em branco. Em branco vale 0. Enviar mesmo assim?`;
}