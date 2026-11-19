<?php
declare(strict_types=1);

namespace App\Services\Prova\Exams;

use App\Services\Prova\ExamDefinition;

/**
 * Prova de Recuperação — 30 questões (20 mc × 3 pts + 10 discursivas × 4 pts = 100), 120 min, 1 tentativa.
 * Só para alunos com nota final da turma < 55. Discursivas corrigidas por IA no envio.
 * Conteúdo em `RecuperacaoQuestions` (server-only: gabarito nunca vai ao cliente antes de `graded`).
 */
final class RecuperacaoExam
{
    public const ID = 'recuperacao-prova';
    public const TITLE = 'Prova de Recuperação: Fundamentos de Jogos Digitais';

    public static function definition(): ExamDefinition
    {
        return new ExamDefinition([
            'id' => self::ID,
            'kind' => ExamDefinition::KIND_QUIZ,
            'title' => self::TITLE,
            'durationMinutes' => 120,
            'totalPoints' => 100,
            'mcPointsEach' => 3,
            'discursivePointsEach' => 4,
            'placeholder' => false,
            'aiGradesDiscursive' => true,
            'recoveryOnly' => true,
            'questions' => RecuperacaoQuestions::QUESTIONS,
            'mcAnswerKey' => RecuperacaoQuestions::MC_ANSWER_KEY,
            'mcJustifications' => RecuperacaoQuestions::MC_JUSTIFICATIONS,
            'discursiveRubrics' => RecuperacaoQuestions::DISCURSIVE_RUBRICS,
        ]);
    }
}
