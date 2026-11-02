<?php
declare(strict_types=1);

namespace App\Services\Despertar;

use App\Core\Database;
use PDO;

/**
 * Detecção de bot/script no Juízo do Despertar. O servidor decide; o cliente só informa.
 *
 * Cada TIPO de sinal vale o seu peso uma única vez (a última ocorrência), com decaimento exponencial
 * (meia-vida de 1 h). Assim um sinal médio repetido NÃO se acumula e um navegador antigo sem
 * Sec-Fetch-* nunca chega sozinho ao limiar. Ban (6 h, só no Juízo) quando a pontuação passa de THRESHOLD.
 *
 * Limiares conservadores: falso positivo em aluno humano rápido é o pior resultado.
 */
final class JuizoGuard
{
    public const BAN_SECONDS = 21600;
    public const THRESHOLD = 12.0;
    public const HALF_LIFE_SEC = 3600;
    /** Abaixo disto o humano não vê duas capas, decide e clica (mesmo com rede ótima). */
    public const FAST_LATENCY_MS = 350;
    /** Janela e coeficiente de variação (desvio/média) abaixo do qual o ritmo é de máquina. */
    public const RHYTHM_WINDOW = 25;
    public const RHYTHM_MAX_CV = 0.10;
    /** Pausa que um humano faz: acertos seguidos sem nenhuma > 20 s. */
    public const PAUSE_MS = 20000;
    public const NO_PAUSE_GUESSES = 60;
    public const SESSION_GAP_MS = 600000;
    public const LONG_SESSION_MS = 14400000;

    /** peso (a pontuação cheia de um sinal forte já bane), teto de ocorrências, rótulo p/ o admin. */
    public const KINDS = [
        'webdriver' => ['w' => 12.0, 'cap' => 1, 'label' => 'navigator.webdriver=true (navegador automatizado)'],
        'ua_automation' => ['w' => 12.0, 'cap' => 1, 'label' => 'User-Agent de script/automação'],
        'regular_rhythm' => ['w' => 12.0, 'cap' => 1, 'label' => 'ritmo regular demais por 25 palpites'],
        'fast_latency' => ['w' => 6.0, 'cap' => 2, 'label' => 'palpite mais rápido que o humanamente possível'],
        'untrusted_input' => ['w' => 4.0, 'cap' => 1, 'label' => 'palpite sem clique/tecla real (evento não confiável)'],
        'no_browser_headers' => ['w' => 3.0, 'cap' => 1, 'label' => 'sem cabeçalhos Sec-Fetch/Origin de navegador'],
        'ua_empty' => ['w' => 3.0, 'cap' => 1, 'label' => 'sem User-Agent'],
        'no_pause' => ['w' => 3.0, 'cap' => 1, 'label' => 'mais de 60 palpites sem pausa de 20 s'],
        'long_session' => ['w' => 2.0, 'cap' => 1, 'label' => 'sessão contínua de mais de 4 h'],
    ];

    private const UA_AUTOMATION = '~python-requests|python-httpx|python-urllib|httpx|aiohttp|urllib|libwww|curl/|wget|go-http-client|'
        . 'java/|apache-httpclient|node-fetch|undici|axios/|scrapy|postmanruntime|insomnia|httpie|'
        . 'headlesschrome|phantomjs|selenium|playwright|puppeteer|webdriver~i';

    private static bool $tableEnsured = false;

    public static function ensureTable(): void
    {
        if (self::$tableEnsured) {
            return;
        }
        // DDL fora de transação (CREATE TABLE faz commit implícito). Idempotente: não depende da migração.
        Database::pdo()->exec(
            'CREATE TABLE IF NOT EXISTS `despertar_juizo_guard` (
              `user_id` INT NOT NULL,
              `score` DOUBLE NOT NULL DEFAULT 0,
              `score_at` DATETIME(3) NULL DEFAULT NULL,
              `banned_at` DATETIME(3) NULL DEFAULT NULL,
              `banned_until` DATETIME(3) NULL DEFAULT NULL,
              `ban_reason` VARCHAR(500) NULL DEFAULT NULL,
              `ban_count` INT NOT NULL DEFAULT 0,
              `state` JSON NULL,
              `unbanned_by` INT NULL DEFAULT NULL,
              `unbanned_at` DATETIME(3) NULL DEFAULT NULL,
              `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
              PRIMARY KEY (`user_id`),
              KEY `despertar_juizo_guard_banned_idx` (`banned_until`),
              CONSTRAINT `despertar_juizo_guard_user_fk`
                FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        self::$tableEnsured = true;
    }

    // ─── Núcleo puro (testável sem banco) ────────────────────────────────────

    /** @return array<string, mixed> */
    public static function emptyState(): array
    {
        return ['kinds' => [], 'lat' => [], 'noPause' => 0, 'lastGuessMs' => 0, 'sessionStartMs' => 0, 'log' => []];
    }

    /** Pontuação atual (decaída) a partir dos tipos de sinal guardados. */
    public static function score(array $state, int $nowMs): float
    {
        $total = 0.0;
        foreach ((array) ($state['kinds'] ?? []) as $kind => $info) {
            $def = self::KINDS[$kind] ?? null;
            if ($def === null || !is_array($info)) {
                continue;
            }
            $ageSec = max(0.0, ($nowMs - (int) ($info['last'] ?? 0)) / 1000.0);
            $total += $def['w'] * min((int) ($info['n'] ?? 1), $def['cap']) * (0.5 ** ($ageSec / self::HALF_LIFE_SEC));
        }
        return round($total, 3);
    }

    /**
     * Aplica um palpite/início ao estado e devolve [novoEstado, tiposDisparadosAgora, pontuação].
     *
     * @param array<string, mixed> $state estado anterior (emptyState() se novo)
     * @param array{
     *   nowMs: int, isGuess: bool, userAgent?: ?string, secFetchSite?: ?string, origin?: ?string,
     *   latencyMs?: ?int, client?: array<string, mixed>
     * } $ctx
     * @return array{0: array<string, mixed>, 1: array<int, string>, 2: float}
     */
    public static function observe(array $state, array $ctx): array
    {
        $now = (int) $ctx['nowMs'];
        $state = array_merge(self::emptyState(), $state);
        $fired = [];

        // — Cliente fora do navegador —
        $ua = trim((string) ($ctx['userAgent'] ?? ''));
        if ($ua === '') {
            $fired[] = 'ua_empty';
        } elseif (preg_match(self::UA_AUTOMATION, $ua) === 1) {
            $fired[] = 'ua_automation';
        }
        // Todo navegador moderno manda Sec-Fetch-Site; todo navegador manda Origin em POST. Faltar os DOIS
        // é sinal médio (Safari antigo sem Sec-Fetch ainda manda Origin: não conta).
        if (trim((string) ($ctx['secFetchSite'] ?? '')) === '' && trim((string) ($ctx['origin'] ?? '')) === '') {
            $fired[] = 'no_browser_headers';
        }

        // — Flags do cliente: só contam quando PRESENTES (JS antigo em cache não manda e não é penalizado) —
        $client = is_array($ctx['client'] ?? null) ? $ctx['client'] : [];
        if (($client['webdriver'] ?? null) === true) {
            $fired[] = 'webdriver';
        }
        if ($ctx['isGuess'] && ($client['trusted'] ?? null) === false) {
            $fired[] = 'untrusted_input';
        }

        // — Ritmo (só palpites) —
        if ($ctx['isGuess']) {
            $lat = $ctx['latencyMs'] ?? null;
            if ($lat !== null) {
                $lat = (int) $lat;
                if ($lat >= 0 && $lat < self::FAST_LATENCY_MS) {
                    $fired[] = 'fast_latency';
                }
                $window = array_map('intval', (array) $state['lat']);
                $window[] = $lat;
                $window = array_slice($window, -(self::RHYTHM_WINDOW * 2));
                if (count($window) >= self::RHYTHM_WINDOW) {
                    $last = array_slice($window, -self::RHYTHM_WINDOW);
                    $mean = array_sum($last) / count($last);
                    $var = 0.0;
                    foreach ($last as $v) {
                        $var += ($v - $mean) ** 2;
                    }
                    $cv = $mean > 0 ? sqrt($var / count($last)) / $mean : 0.0;
                    if ($mean > 0 && $cv < self::RHYTHM_MAX_CV) {
                        $fired[] = 'regular_rhythm';
                    }
                    $window = []; // a próxima avaliação pede 25 palpites novos
                }
                $state['lat'] = $window;
            }

            $lastGuess = (int) $state['lastGuessMs'];
            $gap = $lastGuess > 0 ? $now - $lastGuess : 0;
            if ($lastGuess > 0 && $gap <= self::PAUSE_MS) {
                $state['noPause'] = (int) $state['noPause'] + 1;
            } else {
                $state['noPause'] = 0;
            }
            if ((int) $state['sessionStartMs'] <= 0 || ($lastGuess > 0 && $gap > self::SESSION_GAP_MS)) {
                $state['sessionStartMs'] = $now;
            }
            if ((int) $state['noPause'] > self::NO_PAUSE_GUESSES) {
                $fired[] = 'no_pause';
            }
            if ($now - (int) $state['sessionStartMs'] > self::LONG_SESSION_MS) {
                $fired[] = 'long_session';
            }
            $state['lastGuessMs'] = $now;
        }

        foreach (array_unique($fired) as $kind) {
            $prev = $state['kinds'][$kind] ?? null;
            $recent = is_array($prev) && ($now - (int) ($prev['last'] ?? 0)) < 1800000;
            $state['kinds'][$kind] = ['last' => $now, 'n' => $recent ? ((int) ($prev['n'] ?? 0) + 1) : 1];
            // log para o admin: fortes sempre; médios no máx. 1 a cada 10 min
            $strong = self::KINDS[$kind]['w'] >= self::THRESHOLD || $kind === 'fast_latency';
            if ($strong || !is_array($prev) || ($now - (int) ($prev['last'] ?? 0)) > 600000) {
                $entry = ['t' => $now, 'kind' => $kind];
                if ($kind === 'fast_latency') {
                    $entry['latencyMs'] = (int) ($ctx['latencyMs'] ?? 0);
                }
                if ($kind === 'ua_automation' || $kind === 'ua_empty') {
                    $entry['ua'] = mb_substr($ua, 0, 80);
                }
                $state['log'][] = $entry;
            }
        }
        $state['log'] = array_slice($state['log'], -40);

        return [$state, array_values(array_unique($fired)), self::score($state, $now)];
    }

    /** Texto curto com o que mais pesou, para o admin. */
    public static function reasonFrom(array $state, int $nowMs): string
    {
        $parts = [];
        foreach ((array) ($state['kinds'] ?? []) as $kind => $info) {
            $def = self::KINDS[$kind] ?? null;
            if ($def === null) {
                continue;
            }
            $ageSec = max(0.0, ($nowMs - (int) ($info['last'] ?? 0)) / 1000.0);
            $c = $def['w'] * min((int) ($info['n'] ?? 1), $def['cap']) * (0.5 ** ($ageSec / self::HALF_LIFE_SEC));
            if ($c >= 0.5) {
                $parts[(string) $kind] = $c;
            }
        }
        arsort($parts);
        $labels = array_map(static fn(string $k): string => self::KINDS[$k]['label'], array_keys($parts));
        return mb_substr(implode('; ', $labels), 0, 480);
    }

    public static function banMessage(string $bannedUntilIso): string
    {
        try {
            $until = (new \DateTimeImmutable($bannedUntilIso))->setTimezone(new \DateTimeZone('America/Sao_Paulo'));
            $when = $until->format('d/m') . ' às ' . $until->format('H:i');
        } catch (\Throwable) {
            $when = 'o fim do prazo';
        }
        return "O Juízo está suspenso para você até {$when} (horário de Brasília). Detectamos um padrão de jogo automatizado "
            . 'e seu recorde do Juízo foi zerado. O resto do Despertar segue normal. '
            . 'Se você joga à mão e acha que foi engano, fale com o Mestre.';
    }

    // ─── Persistência ────────────────────────────────────────────────────────

    /** @return array{until: string, message: string}|null */
    public static function activeBan(int $userId): ?array
    {
        self::ensureTable();
        $stmt = Database::pdo()->prepare(
            'SELECT `banned_until` FROM `despertar_juizo_guard`
             WHERE `user_id` = :uid AND `banned_until` IS NOT NULL AND `banned_until` > :now LIMIT 1'
        );
        $stmt->execute([':uid' => $userId, ':now' => Database::nowSql()]);
        $raw = $stmt->fetchColumn();
        if ($raw === false || $raw === null) {
            return null;
        }
        $iso = Database::sqlToIso((string) $raw);
        return ['until' => $iso, 'message' => self::banMessage($iso)];
    }

    /**
     * Registra os sinais deste palpite/início e bane se passar do limiar.
     * @param array<string, mixed> $ctx ver observe()
     * @return array{banned: bool, until: ?string, message: ?string, score: float, fired: array<int, string>}
     */
    public static function record(int $userId, array $ctx): array
    {
        self::ensureTable();
        $pdo = Database::pdo();
        $now = (int) $ctx['nowMs'];
        $pdo->prepare('INSERT IGNORE INTO `despertar_juizo_guard` (`user_id`, `state`) VALUES (:uid, :st)')
            ->execute([':uid' => $userId, ':st' => json_encode(self::emptyState())]);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT `state`, `ban_count` FROM `despertar_juizo_guard` WHERE `user_id` = :uid FOR UPDATE');
            $stmt->execute([':uid' => $userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $prev = Database::decodeJson($row['state'] ?? null, []);
            [$state, $fired, $score] = self::observe(is_array($prev) ? $prev : [], $ctx);
            $banned = $score >= self::THRESHOLD;

            $sets = ['`state` = :st', '`score` = :sc', '`score_at` = :sat'];
            $params = [':uid' => $userId, ':st' => json_encode($state, JSON_UNESCAPED_UNICODE), ':sc' => $score, ':sat' => Database::nowSql($now)];
            $until = null;
            if ($banned) {
                $untilMs = $now + self::BAN_SECONDS * 1000;
                $until = Database::nowIso($untilMs);
                $sets[] = '`banned_at` = :bat';
                $sets[] = '`banned_until` = :bu';
                $sets[] = '`ban_reason` = :br';
                $sets[] = '`ban_count` = `ban_count` + 1';
                $sets[] = '`unbanned_by` = NULL';
                $sets[] = '`unbanned_at` = NULL';
                $params[':bat'] = Database::nowSql($now);
                $params[':bu'] = Database::nowSql($untilMs);
                $params[':br'] = self::reasonFrom($state, $now);
                // zera os sinais depois do ban: o próximo ciclo (6 h depois) começa limpo
                $params[':st'] = json_encode(array_merge(self::emptyState(), ['log' => $state['log']]), JSON_UNESCAPED_UNICODE);
                $params[':sc'] = 0;
            }
            $pdo->prepare('UPDATE `despertar_juizo_guard` SET ' . implode(', ', $sets) . ' WHERE `user_id` = :uid')->execute($params);
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        return [
            'banned' => $banned,
            'until' => $until,
            'message' => $until !== null ? self::banMessage($until) : null,
            'score' => $score,
            'fired' => $fired,
        ];
    }

    /**
     * Suspeitos e bans para o painel do Mestre (ban ativo primeiro; depois recentes).
     * @return array<int, array<string, mixed>>
     */
    public static function listForAdmin(int $limit = 100): array
    {
        self::ensureTable();
        $pdo = Database::pdo();
        $rows = $pdo->query(
            'SELECT g.*, u.username, u.full_name, u.display_name, u.turma
             FROM `despertar_juizo_guard` g JOIN `users` u ON u.id = g.user_id
             ORDER BY g.updated_at DESC LIMIT 400'
        )->fetchAll(PDO::FETCH_ASSOC);
        $nowMs = (int) round(microtime(true) * 1000);
        $out = [];
        foreach ($rows as $r) {
            $state = Database::decodeJson($r['state'] ?? null, []);
            $state = is_array($state) ? $state : [];
            $score = self::score($state, $nowMs);
            $bannedUntilMs = !empty($r['banned_until']) ? Database::parseMs($r['banned_until']) : null;
            $active = $bannedUntilMs !== null && $bannedUntilMs > $nowMs;
            $bannedAtMs = !empty($r['banned_at']) ? Database::parseMs($r['banned_at']) : null;
            $recentBan = $bannedAtMs !== null && ($nowMs - $bannedAtMs) < 14 * 86400000;
            if (!$active && !$recentBan && $score < 3.0) {
                continue;
            }
            $out[] = [
                'userId' => (int) $r['user_id'],
                'name' => (string) ($r['display_name'] ?: $r['full_name'] ?: $r['username']),
                'username' => (string) $r['username'],
                'turma' => (string) $r['turma'],
                'active' => $active,
                'score' => $score,
                'bannedAt' => Database::sqlToIso($r['banned_at'] ?? null),
                'bannedUntil' => Database::sqlToIso($r['banned_until'] ?? null),
                'reason' => $r['ban_reason'] !== null ? (string) $r['ban_reason'] : self::reasonFrom($state, $nowMs),
                'banCount' => (int) $r['ban_count'],
                'unbannedAt' => Database::sqlToIso($r['unbanned_at'] ?? null),
                'unbannedBy' => $r['unbanned_by'] !== null ? (int) $r['unbanned_by'] : null,
                'signals' => array_map(static fn(array $e): array => $e + ['label' => self::KINDS[$e['kind'] ?? '']['label'] ?? (string) ($e['kind'] ?? '')], array_slice(array_values(array_filter((array) ($state['log'] ?? []), 'is_array')), -15)),
            ];
        }
        usort($out, static fn(array $a, array $b): int => [$b['active'], $b['score']] <=> [$a['active'], $a['score']]);
        return array_slice($out, 0, $limit);
    }

    /** Desbane: libera já, zera a pontuação e os sinais. @return bool havia ban/suspeita para limpar */
    public static function unban(int $userId, int $adminId): bool
    {
        self::ensureTable();
        $stmt = Database::pdo()->prepare(
            'UPDATE `despertar_juizo_guard`
             SET `banned_until` = NULL, `score` = 0, `state` = :st, `unbanned_by` = :by, `unbanned_at` = :now
             WHERE `user_id` = :uid'
        );
        $stmt->execute([
            ':st' => json_encode(self::emptyState()),
            ':by' => $adminId,
            ':now' => Database::nowSql(),
            ':uid' => $userId,
        ]);
        return $stmt->rowCount() > 0;
    }
}
