<?php
declare(strict_types=1);

namespace App\Services\Prova\Exams;

use App\Services\Prova\ExamDefinition;

/**
 * Trabalho Final — entrega de um .zip (último envio vale), nota 0–30 + feedback (Aulas 02–08) do Mestre.
 * Sem timer, sem questões, sem integridade antiforça.
 */
final class TrabalhoFinalExam
{
    public const ID = 'trabalho-final';
    public const TITLE = 'Trabalho Final do Módulo 2';
    public const MAX_BYTES = 50 * 1024 * 1024;
    public const GUIDE_URL = '/pages/guia-trabalho-final.html';

    public static function definition(): ExamDefinition
    {
        return new ExamDefinition([
            'id' => self::ID,
            'kind' => ExamDefinition::KIND_PROJECT,
            'title' => self::TITLE,
            'durationMinutes' => 0,
            'totalPoints' => 30,
            'mcPointsEach' => 0,
            'discursivePointsEach' => 0,
            'questions' => [],
            'project' => [
                'statement' => 'Desenvolva o projeto descrito no guia do Trabalho Final e envie o resultado em um único arquivo .zip. '
                    . 'Você pode reenviar quantas vezes quiser até o prazo ou até o Mestre encerrar as entregas; o último envio é o que vale.',
                'guideUrl' => self::GUIDE_URL,
                'maxBytes' => self::MAX_BYTES,
                'maxMb' => (int) (self::MAX_BYTES / 1024 / 1024),
                'accept' => '.zip',
                'scoreMax' => 30,
            ],
        ]);
    }
}
