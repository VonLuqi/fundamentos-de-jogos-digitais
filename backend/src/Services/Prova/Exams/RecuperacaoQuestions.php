<?php
declare(strict_types=1);

namespace App\Services\Prova\Exams;

/**
 * STUB — conteúdo real vem da branch feat/rec-content (substitui este arquivo no merge).
 * Contrato: QUESTIONS (q01-q20 mc 3 pts, q21-q30 discursive 4 pts), MC_ANSWER_KEY, MC_JUSTIFICATIONS, DISCURSIVE_RUBRICS.
 */
final class RecuperacaoQuestions
{
    public const MC_ANSWER_KEY = [
        'q01' => 'A',
    ];

    public const MC_JUSTIFICATIONS = [
        'q01' => 'STUB: justificativa de exemplo.',
    ];

    public const DISCURSIVE_RUBRICS = [
        'q21' => [
            'focus' => 'STUB: foco de exemplo.',
            'excellent' => 'STUB',
            'proficient' => 'STUB',
            'developing' => 'STUB',
            'synthesis' => 'STUB',
            'expected' => ['STUB: ponto esperado 1', 'STUB: ponto esperado 2'],
            'maxPoints' => 4,
        ],
    ];

    public const QUESTIONS = [
        [
            'id' => 'q01',
            'index' => 0,
            'type' => 'mc',
            'points' => 3,
            'title' => 'Questão 01',
            'prompt' => 'STUB: pergunta de múltipla escolha de exemplo.',
            'choices' => ['A' => 'Correta (stub)', 'B' => 'Errada', 'C' => 'Errada', 'D' => 'Errada', 'E' => 'Errada'],
        ],
        [
            'id' => 'q21',
            'index' => 1,
            'type' => 'discursive',
            'points' => 4,
            'title' => 'Questão 21',
            'role' => 'STUB: papel.',
            'scenario' => 'STUB: cenário.',
            'mission' => 'STUB: missão.',
            'prompt' => 'STUB: enunciado discursivo de exemplo.',
        ],
    ];
}
