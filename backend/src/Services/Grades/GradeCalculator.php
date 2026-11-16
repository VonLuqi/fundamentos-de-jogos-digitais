<?php
declare(strict_types=1);

namespace App\Services\Grades;

/**
 * Nota da turma (100 pts) — cálculo puro, sem banco.
 * Códigos 10 (1,25/aula) + Entregas 20 (2,5/aula) + M1 20 + M2 20 + Trabalho Final 30.
 */
final class GradeCalculator
{
    public const LESSONS = ['aula1', 'aula2', 'aula3', 'aula4', 'aula5', 'aula6', 'aula7', 'aula8'];
    public const CODE_POINTS_PER_LESSON = 1.25;
    public const ENTREGA_POINTS_PER_LESSON = 2.5;
    public const M1_MAX = 20.0;
    public const M2_MAX = 20.0;
    public const TF_MAX = 30.0;

    /**
     * @param list<string> $redeemedLessonIds aulas com código resgatado
     * @param list<string> $deliveredLessonIds aulas com entrega (paragraph ou journal)
     * @param array{m1?: ?float, m2?: ?float, tf?: ?float} $scores final_score das provas; null = sem nota fechada
     * @return array{codes: float, entregas: float, m1: float, m2: float, tf: float, total: float, pending: list<string>, details: array<string, mixed>}
     */
    public static function compute(array $redeemedLessonIds, array $deliveredLessonIds, array $scores): array
    {
        $codeFlags = [];
        $entregaFlags = [];
        foreach (self::LESSONS as $lesson) {
            $codeFlags[$lesson] = in_array($lesson, $redeemedLessonIds, true);
            $entregaFlags[$lesson] = in_array($lesson, $deliveredLessonIds, true);
        }
        $codes = count(array_filter($codeFlags)) * self::CODE_POINTS_PER_LESSON;
        $entregas = count(array_filter($entregaFlags)) * self::ENTREGA_POINTS_PER_LESSON;

        $pending = [];
        $exams = [];
        $values = [];
        foreach (['m1' => self::M1_MAX, 'm2' => self::M2_MAX, 'tf' => self::TF_MAX] as $key => $max) {
            $raw = $scores[$key] ?? null;
            if ($raw === null) {
                $pending[] = $key;
                $values[$key] = 0.0;
                $exams[$key] = ['score' => 0.0, 'max' => $max, 'graded' => false];
                continue;
            }
            $score = round(max(0.0, min($max, (float) $raw)), 2);
            $values[$key] = $score;
            $exams[$key] = ['score' => $score, 'max' => $max, 'graded' => true];
        }

        $total = round($codes + $entregas + $values['m1'] + $values['m2'] + $values['tf'], 2);

        return [
            'codes' => round($codes, 2),
            'entregas' => round($entregas, 2),
            'm1' => $values['m1'],
            'm2' => $values['m2'],
            'tf' => $values['tf'],
            'total' => $total,
            'pending' => $pending,
            'details' => ['codes' => $codeFlags, 'entregas' => $entregaFlags, 'exams' => $exams],
        ];
    }
}
