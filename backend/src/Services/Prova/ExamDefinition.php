<?php
declare(strict_types=1);

namespace App\Services\Prova;

/**
 * Definição imutável de um exame (questões, gabarito, rubricas e regras).
 * Servidor-only: o gabarito nunca vai ao cliente antes de `status = 'graded'`.
 *
 * kind:
 *  - 'quiz'    → questões mc/discursive, timer e integridade (M1, M2).
 *  - 'project' → entrega de arquivo (.zip), sem timer, sem questões.
 */
final class ExamDefinition
{
    public const KIND_QUIZ = 'quiz';
    public const KIND_PROJECT = 'project';

    public string $id;
    public string $kind;
    public string $title;
    public int $durationMinutes;
    public float $totalPoints;
    public int $mcPointsEach;
    public int $discursivePointsEach;
    public bool $placeholder;
    /** @var array<int, array<string, mixed>> */
    public array $questions;
    /** @var array<string, string> */
    public array $mcAnswerKey;
    /** @var array<string, string> */
    public array $mcJustifications;
    /** @var array<string, array<string, string>> */
    public array $discursiveRubrics;
    /** @var array<string, mixed> */
    public array $project;

    /**
     * @param array<string, mixed> $cfg
     */
    public function __construct(array $cfg)
    {
        $this->id = (string) $cfg['id'];
        $this->kind = (string) ($cfg['kind'] ?? self::KIND_QUIZ);
        $this->title = (string) $cfg['title'];
        $this->durationMinutes = (int) ($cfg['durationMinutes'] ?? 90);
        $this->totalPoints = (float) ($cfg['totalPoints'] ?? 20);
        $this->mcPointsEach = (int) ($cfg['mcPointsEach'] ?? 1);
        $this->discursivePointsEach = (int) ($cfg['discursivePointsEach'] ?? 1);
        $this->placeholder = !empty($cfg['placeholder']);
        $this->questions = $cfg['questions'] ?? [];
        $this->mcAnswerKey = $cfg['mcAnswerKey'] ?? [];
        $this->mcJustifications = $cfg['mcJustifications'] ?? [];
        $this->discursiveRubrics = $cfg['discursiveRubrics'] ?? [];
        $this->project = $cfg['project'] ?? [];
    }

    public function isProject(): bool
    {
        return $this->kind === self::KIND_PROJECT;
    }

    /** Provas com timer e anti-cola (blur/leave). */
    public function hasTimer(): bool
    {
        return !$this->isProject();
    }

    public function questionCount(): int
    {
        return count($this->questions);
    }

    public function mcQuestionCount(): int
    {
        return count($this->listMcQuestionIds());
    }

    public function discursiveQuestionCount(): int
    {
        return count($this->listDiscursiveQuestionIds());
    }

    public function mcMax(): float
    {
        return (float) ($this->mcQuestionCount() * $this->mcPointsEach);
    }

    public function discursiveMax(): float
    {
        return (float) ($this->discursiveQuestionCount() * $this->discursivePointsEach);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getQuestionById(string $questionId): ?array
    {
        foreach ($this->questions as $q) {
            if ($q['id'] === $questionId) {
                return $q;
            }
        }
        return null;
    }

    /**
     * @return array<int, string>
     */
    public function listMcQuestionIds(): array
    {
        return $this->idsOfType('mc');
    }

    /**
     * @return array<int, string>
     */
    public function listDiscursiveQuestionIds(): array
    {
        return $this->idsOfType('discursive');
    }

    public function isMcQuestionId(string $questionId): bool
    {
        $q = $this->getQuestionById($questionId);
        return $q !== null && $q['type'] === 'mc';
    }

    public function isDiscursiveQuestionId(string $questionId): bool
    {
        $q = $this->getQuestionById($questionId);
        return $q !== null && $q['type'] === 'discursive';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function sanitizeQuestionsForClient(): array
    {
        $out = [];
        foreach ($this->questions as $q) {
            $base = [
                'id' => $q['id'],
                'index' => $q['index'],
                'type' => $q['type'],
                'points' => $q['points'],
                'title' => $q['title'] ?? null,
                'prompt' => $q['prompt'],
            ];
            if ($q['type'] === 'mc') {
                $base['choices'] = $q['choices'];
            } else {
                $base['role'] = $q['role'] ?? null;
                $base['scenario'] = $q['scenario'] ?? null;
                $base['mission'] = $q['mission'] ?? null;
            }
            $out[] = $base;
        }
        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function questionsForAdmin(): array
    {
        $out = [];
        foreach ($this->sanitizeQuestionsForClient() as $client) {
            $id = $client['id'];
            if ($client['type'] === 'mc') {
                $client['correctChoice'] = $this->mcAnswerKey[$id] ?? null;
                $client['justification'] = $this->mcJustifications[$id] ?? null;
            } else {
                $client['rubric'] = $this->discursiveRubrics[$id] ?? null;
            }
            $out[] = $client;
        }
        return $out;
    }

    public function normalizeDiscursivePoints(mixed $value): ?float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }
        $n = (float) $value;
        if (!is_finite($n) || $n < 0.0 || $n > $this->discursivePointsEach) {
            return null;
        }
        return round($n * 100.0) / 100.0;
    }

    /**
     * Metadados do exame project (enunciado, link do guia, limites) — seguros para o cliente.
     *
     * @return array<string, mixed>
     */
    public function projectPublic(): array
    {
        return $this->project;
    }

    /**
     * @return array<int, string>
     */
    private function idsOfType(string $type): array
    {
        $out = [];
        foreach ($this->questions as $q) {
            if ($q['type'] === $type) {
                $out[] = $q['id'];
            }
        }
        return $out;
    }
}
