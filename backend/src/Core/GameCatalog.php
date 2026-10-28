<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Catálogo de conquistas, níveis, patentes e aulas — espelho de `js/game-catalog.js`
 * e `api/_lib/progress/shared.js`.
 */
final class GameCatalog
{
    public const DIFFICULTY_TO_RARITY = [
        'trivial' => 'stone',
        'easy' => 'copper',
        'medium' => 'silver',
        'hard' => 'gold',
        'mythic' => 'rainbow',
        'legendary' => 'unique',
    ];

    public const RARITY_LABELS = [
        'stone' => 'Pedra',
        'copper' => 'Cobre',
        'silver' => 'Prata',
        'gold' => 'Ouro',
        'rainbow' => 'Arco-íris',
        'unique' => 'Única',
    ];

    public const LESSON_CATALOG = [
        'aula1' => [
            'lessonId' => 'aula1',
            'lessonTitle' => 'Aula 01 — O Círculo Mágico do Roguelite',
            'xp' => 30,
        ],
        'aula2' => [
            'lessonId' => 'aula2',
            'lessonTitle' => 'Aula 02 — O Glossário do Desenvolvedor e o Player na Tela',
            'xp' => 30,
        ],
        'aula3' => [
            'lessonId' => 'aula3',
            'lessonTitle' => 'Aula 03 — Homo Ludens, Identidade e Expressão Cultural',
            'xp' => 30,
        ],
        'aula4' => [
            'lessonId' => 'aula4',
            'lessonTitle' => 'Aula 04 — A Linha do Tempo das Plataformas e as Restrições Técnicas',
            'xp' => 30,
        ],
        'aula5' => [
            'lessonId' => 'aula5',
            'lessonTitle' => 'Aula 05 — Classificação Indicativa (ClassInd), IARC e Design Saudável',
            'xp' => 30,
        ],
        'aula6' => [
            'lessonId' => 'aula6',
            'lessonTitle' => 'Aula 06 — Mercado de Jogos, Propriedade Intelectual e Monetização Ética',
            'xp' => 30,
        ],
        'aula7' => [
            'lessonId' => 'aula7',
            'lessonTitle' => 'Aula 07 — Papéis na Indústria, Workflow e Versionamento Visual',
            'xp' => 30,
        ],
        'aula8' => [
            'lessonId' => 'aula8',
            'lessonTitle' => 'Aula 08 — Perfis de Jogadores e o Modelo Quantic Foundry',
            'xp' => 30,
        ],
    ];

    public const LESSON_GATES = [
        'aula1' => ['published' => true],
        'aula2' => ['published' => false],
        'aula3' => ['published' => false],
        'aula4' => ['published' => false],
        'aula5' => ['published' => false],
        'aula6' => ['published' => false],
        'aula7' => ['published' => false],
        'aula8' => ['published' => false],
        'despertar' => [
            'published' => false,
            'classroom_pause' => false,
            // Dia 1: Liberar no véu marca true e abre o Acheron sem redeploy do hold JS.
            'season_liberated' => false,
        ],
    ];

    public const ACTIVITY_CATALOG = [
        'aula1_gdd' => [
            'lessonId' => 'aula1',
            'xp' => 20,
            'achievementId' => 'gdd_integracao_documental',
        ],
    ];

    public const LESSON_SECRET_IDS = [
        'segredo_cartografo_do_inspector',
        'segredo_alquimista_da_fisica',
        'segredo_juramento_do_circulo',
        'segredo_lexico_do_desenvolvedor',
        'segredo_arquiteto_de_cenas',
        'segredo_cartografo_do_input',
        'segredo_homo_ludens',
        'segredo_artesao_do_pixel',
        'segredo_identidade_ludica',
        'segredo_arqueologo_de_hardware',
        'segredo_artesao_da_viewport',
        'segredo_criatividade_sob_limite',
        'segredo_oraculo_do_classind',
        'segredo_selo_do_livre',
        'segredo_balanca_da_faixa',
        'segredo_mercador_do_styx',
        'segredo_balcao_sem_azar',
        'segredo_tempo_respeitado',
        'segredo_cinco_oficios',
        'segredo_cercado_do_escopo',
        'segredo_pasta_sagrada',
        'segredo_modelo_quantic',
        'segredo_perfil_mecanica',
        'segredo_trilha_labirinto',
    ];

    /** @var array<string, mixed>|null */
    private static ?array $rawCatalog = null;
    /** @var array<string, array<string, mixed>>|null */
    private static ?array $achievementsById = null;

    /**
     * @return array<string, mixed>
     */
    public static function catalog(): array
    {
        if (self::$rawCatalog !== null) {
            return self::$rawCatalog;
        }
        $root = defined('FJD_ROOT') ? FJD_ROOT : dirname(__DIR__, 3);
        $path = $root . '/data/game-catalog.json';
        if (!is_file($path)) {
            self::$rawCatalog = ['levels' => [], 'achievements' => []];
            return self::$rawCatalog;
        }
        $decoded = json_decode((string) file_get_contents($path), true);
        self::$rawCatalog = is_array($decoded) ? $decoded : ['levels' => [], 'achievements' => []];
        return self::$rawCatalog;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function achievementsById(): array
    {
        if (self::$achievementsById !== null) {
            return self::$achievementsById;
        }
        self::$achievementsById = [];
        $cat = self::catalog();
        $list = is_array($cat['achievements'] ?? null) ? $cat['achievements'] : [];
        foreach ($list as $raw) {
            if (!is_array($raw) || empty($raw['id'])) {
                continue;
            }
            $id = (string) $raw['id'];
            $difficulty = (string) ($raw['difficulty'] ?? 'trivial');
            $rarity = (string) ($raw['rarity'] ?? '');
            if (!isset(self::RARITY_LABELS[$rarity])) {
                $rarity = self::DIFFICULTY_TO_RARITY[$difficulty] ?? 'stone';
            }
            self::$achievementsById[$id] = array_merge($raw, [
                'id' => $id,
                'xp' => (int) ($raw['xp'] ?? 0),
                'hidden' => (bool) ($raw['hidden'] ?? false),
                'shadow' => (bool) (($raw['shadow'] ?? false) || ($raw['meta']['shadow'] ?? false)),
                'difficulty' => $difficulty,
                'rarity' => $rarity,
            ]);
        }
        return self::$achievementsById;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function getAchievementById(string $id): ?array
    {
        $map = self::achievementsById();
        return $map[$id] ?? null;
    }

    public static function getAchievementXp(string $id): int
    {
        $entry = self::getAchievementById($id);
        return $entry ? (int) ($entry['xp'] ?? 0) : 0;
    }

    public static function getAchievementDifficulty(string $id): string
    {
        $entry = self::getAchievementById($id);
        return $entry ? (string) ($entry['difficulty'] ?? 'trivial') : 'trivial';
    }

    public static function getAchievementRarity(string $id): string
    {
        $entry = self::getAchievementById($id);
        if ($entry && !empty($entry['rarity'])) {
            return (string) $entry['rarity'];
        }
        $diff = self::getAchievementDifficulty($id);
        return self::DIFFICULTY_TO_RARITY[$diff] ?? 'stone';
    }

    /**
     * @param array<int, string> $ids
     * @return array<int, array{id: string, difficulty: string, rarity: string}>
     */
    public static function mapAchievementDetails(array $ids): array
    {
        $out = [];
        foreach ($ids as $id) {
            $strId = (string) $id;
            $out[] = [
                'id' => $strId,
                'difficulty' => self::getAchievementDifficulty($strId),
                'rarity' => self::getAchievementRarity($strId),
            ];
        }
        return $out;
    }

    /**
     * @return array<int, string>
     */
    public static function allAchievementIds(): array
    {
        $ids = array_keys(self::achievementsById());
        for ($i = 1; $i <= 8; $i++) {
            $ids[] = "aula{$i}_concluida";
        }
        foreach (self::ACTIVITY_CATALOG as $act) {
            $ids[] = $act['achievementId'];
        }
        foreach (self::LESSON_SECRET_IDS as $sec) {
            $ids[] = $sec;
        }
        return array_values(array_unique($ids));
    }

    public static function maxLevel(): int
    {
        $cat = self::catalog();
        $max = (int) ($cat['levels']['maxLevel'] ?? 99);
        return max(1, $max);
    }

    public static function xpRequiredForLevel(int $level): int
    {
        $maxLevel = self::maxLevel();
        $lvl = max(1, min($maxLevel, $level));
        $cat = self::catalog();
        $bands = is_array($cat['levels']['bands'] ?? null) ? $cat['levels']['bands'] : [];
        $base = (int) ($bands[0]['xpPerLevel'] ?? 100) ?: 100;

        if ($lvl >= $maxLevel && $bands !== []) {
            $last = $bands[count($bands) - 1];
            return (int) ($last['xpPerLevel'] ?? $base) ?: $base;
        }
        foreach ($bands as $band) {
            $from = (int) ($band['fromLevel'] ?? 1);
            $to = (int) ($band['toLevel'] ?? $from);
            if ($lvl >= $from && $lvl <= $to) {
                return max(1, (int) ($band['xpPerLevel'] ?? $base));
            }
        }
        return $base;
    }

    public static function levelForXp(int $xp): int
    {
        $maxLevel = self::maxLevel();
        $remaining = max(0, $xp);
        for ($level = 1; $level < $maxLevel; $level++) {
            $need = self::xpRequiredForLevel($level);
            if ($remaining < $need) {
                return $level;
            }
            $remaining -= $need;
        }
        return $maxLevel;
    }

    public static function rankForLevel(int $level): string
    {
        $lvl = max(1, $level);
        $cat = self::catalog();
        $ranks = is_array($cat['levels']['ranks'] ?? null) ? $cat['levels']['ranks'] : [];
        $title = (string) ($ranks[0]['title'] ?? 'Alma Novata');
        foreach ($ranks as $rank) {
            $minLevel = (int) ($rank['minLevel'] ?? 1);
            if ($lvl >= $minLevel && !empty($rank['title'])) {
                $title = (string) $rank['title'];
            }
        }
        return $title;
    }

    public static function rankForXp(int $xp): string
    {
        return self::rankForLevel(self::levelForXp($xp));
    }

    /**
     * Sanitiza uma linha de usuário hidratada para resposta JSON ao cliente (`sanitizeUser`).
     * @param array<string, mixed>|null $u
     * @return array<string, mixed>|null
     */
    public static function sanitizeUser(?array $u, bool $owner = false): ?array
    {
        if (!$u) {
            return null;
        }
        $safe = $u;
        unset($safe['password_hash'], $safe['password'], $safe['conquistas']);
        // Colunas cruas de perfil não vazam; os campos camelCase entram via ProfileService::ownerFields.
        unset(
            $safe['display_name'], $safe['bio'], $safe['avatar_mode'], $safe['photo_path'],
            $safe['photo_pending_path'], $safe['photo_status'], $safe['photo_updated_at'],
            $safe['photo_reject_reason']
        );

        $conquistas = is_array($u['conquistas'] ?? null)
            ? array_values($u['conquistas'])
            : Database::decodeJsonArray($u['conquistas'] ?? null);

        $completedLessons = is_array($u['completed_lessons'] ?? null)
            ? array_values($u['completed_lessons'])
            : Database::decodeJsonArray($u['completed_lessons'] ?? null);

        $redeemedCodes = is_array($u['redeemed_codes'] ?? null)
            ? array_values($u['redeemed_codes'])
            : Database::decodeJsonArray($u['redeemed_codes'] ?? null);

        $displayName = $safe['full_name'] ?? $safe['name'] ?? $safe['username'] ?? '';
        $role = (string) ($safe['role'] ?? 'student');

        $safe['id'] = (int) ($safe['id'] ?? 0);
        $safe['xp'] = (int) ($safe['xp'] ?? 0);
        $safe['avatar_index'] = (int) ($safe['avatar_index'] ?? 0);
        $safe['completed_lessons'] = $completedLessons;
        $safe['redeemed_codes'] = $redeemedCodes;
        $safe['name'] = $displayName;
        $safe['fullName'] = $displayName;
        $safe['username'] = $safe['username'] ?? $displayName;
        $safe['email'] = $safe['email'] ?? null;
        $safe['emailVerifiedAt'] = $safe['email_verified_at'] ?? null;
        $safe['achievements'] = $role === 'admin' ? self::allAchievementIds() : $conquistas;

        // `$owner = false` serializa TERCEIROS (ex.: Mestre listando alunos): só campos públicos,
        // sem foto pendente nem motivo de rejeição.
        $profile = $owner
            ? \App\Services\Progress\ProfileService::ownerFields($u)
            : \App\Services\Progress\ProfileService::publicFields($u);

        return array_merge($safe, $profile);
    }

    /**
     * Recalcula conquistas automáticas de aulas concluídas (`recalculateAchievements`).
     * @param array<string, mixed> $userState
     * @return array<int, string>
     */
    public static function recalculateAchievements(array $userState): array
    {
        $completed = is_array($userState['completed_lessons'] ?? null) ? $userState['completed_lessons'] : [];
        $conquistas = is_array($userState['conquistas'] ?? null) ? array_values($userState['conquistas']) : [];

        for ($i = 1; $i <= 8; $i++) {
            $lessonId = "aula{$i}";
            $achId = "aula{$i}_concluida";
            if (in_array($lessonId, $completed, true) && !in_array($achId, $conquistas, true)) {
                $conquistas[] = $achId;
            }
        }
        return $conquistas;
    }
}
