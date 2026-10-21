<?php
declare(strict_types=1);

namespace App\Services\Despertar;

use App\Core\Database;
use App\Core\GameCatalog;
use PDO;

/**
 * Serviços de validação autoritativa, persistência transacional, Juízo, Pausa e Sandbox
 * de O Despertar (`api/_lib/despertar-*.js`).
 */
final class DespertarService
{
    public const DESPERTAR_SEALED_ERROR = 'despertar_sealed';
    public const DESPERTAR_SEALED_MESSAGE = 'O Acheron ainda está selado.';
    public const DESPERTAR_PAUSED_ERROR = 'despertar_paused';
    public const DESPERTAR_PAUSED_MESSAGE = 'O Acheron guarda silêncio.';
    public const DESPERTAR_PAUSE_MAX_MS = 14400000; // 4h
    public const DESPERTAR_PAUSE_REASON_MAX = 120;

    public const PAUSE_REASON_PRESETS = [
        'aula' => 'Aula em andamento',
        'explicacao' => 'O Mestre está explicando — o Acheron aguarda.',
        'intervalo' => 'Intervalo — o Submundo faz silêncio.',
    ];

    public const DEBUG_GRANT_PRESETS = [
        'souls_1k' => ['label' => '+1K almas', 'souls' => '1000'],
        'souls_10k' => ['label' => '+10K almas', 'souls' => '10000'],
        'souls_100k' => ['label' => '+100K almas', 'souls' => '100000'],
        'souls_1m' => ['label' => '+1M almas', 'souls' => '1000000'],
        'souls_1b' => ['label' => '+1B almas', 'souls' => '1000000000'],
        'obols_1' => ['label' => '+1 óbolo', 'obols' => '1'],
        'obols_10' => ['label' => '+10 óbolos', 'obols' => '10'],
        'obols_25' => ['label' => '+25 óbolos', 'obols' => '25'],
        'mnemosyne_1' => ['label' => '+1 essência', 'mnemosyne' => '1'],
        'mnemosyne_10' => ['label' => '+10 essência', 'mnemosyne' => '10'],
        'mnemosyne_50' => ['label' => '+50 essência', 'mnemosyne' => '50'],
        'verdicts_1' => ['label' => '+1 veredito', 'verdicts' => 1],
        'verdicts_5' => ['label' => '+5 vereditos', 'verdicts' => 5],
        'verdicts_40' => ['label' => '+40 vereditos', 'verdicts' => 40],
    ];

    // -------------------------------------------------------------------------
    // Helpers de Normalização e DTO
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public static function asObject(mixed $val): array
    {
        if (is_string($val)) {
            $val = Database::decodeJson($val, []);
        }
        if (!is_array($val)) {
            return [];
        }
        return $val;
    }

    /**
     * @return array<int, string>
     */
    public static function asStringArray(mixed $val): array
    {
        if (is_string($val)) {
            $val = Database::decodeJsonArray($val);
        }
        if (!is_array($val)) {
            return [];
        }
        return array_values(array_map('strval', $val));
    }

    public static function asNonNegInt(mixed $val, int $fallback = 0): int
    {
        if (!is_numeric($val)) {
            return $fallback;
        }
        $n = (int) floor((float) $val);
        return $n >= 0 ? $n : $fallback;
    }

    /**
     * @return array<string, int>
     */
    public static function normalizeGenerators(mixed $raw): array
    {
        $src = self::asObject($raw);
        $out = [];
        foreach (DespertarCatalog::GENERATORS as $def) {
            $id = $def['id'];
            $n = isset($src[$id]) && is_numeric($src[$id]) ? (int) $src[$id] : 0;
            $out[$id] = $n > 0 ? $n : 0;
        }
        return $out;
    }

    /**
     * @param array<string, int> $generators
     * @param array<string, int> $peerCounts
     * @return array{ok: bool, counts?: array<string, int>, error?: string}
     */
    private static function normalizeRarityCounts(mixed $raw, array $generators, array $peerCounts = [], bool $soft = false, string $error = 'rarity_bounds'): array
    {
        $src = self::asObject($raw);
        $genById = DespertarCatalog::generatorsById();
        $out = [];
        foreach ($src as $id => $val) {
            $idStr = (string) $id;
            if (!isset($genById[$idStr])) {
                continue;
            }
            $qty = max(0, (int) ($generators[$idStr] ?? 0));
            $peerN = max(0, (int) ($peerCounts[$idStr] ?? 0));
            $room = max(0, $qty - $peerN);
            if (!is_numeric($val) || (int) $val < 0) {
                if ($soft) {
                    continue;
                }
                return ['ok' => false, 'error' => $error];
            }
            $n = (int) $val;
            if ($n > $room) {
                if ($soft) {
                    $n = $room;
                } else {
                    return ['ok' => false, 'error' => $error];
                }
            }
            if ($n > 0) {
                $out[$idStr] = $n;
            }
        }
        return ['ok' => true, 'counts' => $out];
    }

    /**
     * @param array<string, int> $generators
     * @return array{ok: bool, goldCounts?: array<string, int>, error?: string}
     */
    public static function normalizeGoldCounts(mixed $raw, array $generators, bool $soft = false): array
    {
        $res = self::normalizeRarityCounts($raw, $generators, [], $soft, 'rarity_bounds');
        if (!$res['ok']) {
            return $res;
        }
        return ['ok' => true, 'goldCounts' => $res['counts'] ?? []];
    }

    /**
     * @param array<string, int> $generators
     * @param array<string, int> $peerGold
     * @return array{ok: bool, shinyCounts?: array<string, int>, error?: string}
     */
    public static function normalizeShinyCounts(mixed $raw, array $generators, array $peerGold = [], bool $soft = false): array
    {
        $res = self::normalizeRarityCounts($raw, $generators, $peerGold, $soft, 'shiny_bounds');
        if (!$res['ok']) {
            return $res;
        }
        return ['ok' => true, 'shinyCounts' => $res['counts'] ?? []];
    }

    /**
     * @return array{clicks: int, maxBuyBiggest: int, juizoTieWins: int}
     */
    public static function normalizeDespertarStats(mixed $raw): array
    {
        $obj = self::asObject($raw);
        return [
            'clicks' => self::asNonNegInt($obj['clicks'] ?? $obj['clickCount'] ?? 0),
            'maxBuyBiggest' => self::asNonNegInt($obj['maxBuyBiggest'] ?? $obj['max_buy_biggest'] ?? $obj['maxBuy'] ?? 0),
            'juizoTieWins' => self::asNonNegInt($obj['juizoTieWins'] ?? $obj['juizo_tie_wins'] ?? $obj['tieWins'] ?? 0),
        ];
    }

    /**
     * @param array<string, mixed> $stats
     * @return array{clicks: int, max_buy_biggest: int, juizo_tie_wins: int}
     */
    public static function statsToRowJson(array $stats): array
    {
        $s = self::normalizeDespertarStats($stats);
        return [
            'clicks' => $s['clicks'],
            'max_buy_biggest' => $s['maxBuyBiggest'],
            'juizo_tie_wins' => $s['juizoTieWins'],
        ];
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    public static function rowToCanonical(?array $row): array
    {
        $r = $row ?? [];
        $generators = self::normalizeGenerators($r['generators_state'] ?? $r['generators'] ?? []);
        $goldRaw = $r['gold_counts'] ?? $r['goldCounts'] ?? null;
        $shinyRaw = $r['shiny_counts'] ?? $r['shinyCounts'] ?? null;

        $goldParsed = $goldRaw !== null ? self::normalizeGoldCounts($goldRaw, $generators, true) : ['ok' => true, 'goldCounts' => []];
        $goldCounts = $goldParsed['goldCounts'] ?? [];
        $shinyParsed = $shinyRaw !== null ? self::normalizeShinyCounts($shinyRaw, $generators, $goldCounts, true) : ['ok' => true, 'shinyCounts' => []];
        $shinyCounts = $shinyParsed['shinyCounts'] ?? [];

        $upById = DespertarCatalog::upgradesById();
        $upgrades = array_values(array_filter(
            self::asStringArray($r['upgrades_state'] ?? $r['upgrades'] ?? []),
            static fn(string $id): bool => isset($upById[$id])
        ));

        $talents = array_values(array_filter(
            self::asStringArray($r['talents_state'] ?? $r['talents'] ?? []),
            static fn(string $id): bool => isset(DespertarCatalog::TALENTS[$id])
        ));

        $eduLogSet = array_flip(DespertarCatalog::EDU_LOG_IDS);
        $eduLogsSeen = array_values(array_filter(
            self::asStringArray($r['edu_logs_seen'] ?? $r['eduLogsSeen'] ?? []),
            static fn(string $id): bool => isset($eduLogSet[$id])
        ));

        $verdictPurchases = array_values(array_filter(
            self::asStringArray($r['verdict_purchases'] ?? $r['verdictPurchases'] ?? []),
            static fn(string $id): bool => isset(DespertarCatalog::VERDICT_SHOP[$id])
        ));

        $juizoRun = $r['juizo_run'] ?? $r['juizoRun'] ?? null;
        if (is_string($juizoRun)) {
            $juizoRun = Database::decodeJson($juizoRun, null);
        }

        $lastSyncRaw = $r['last_sync_at'] ?? $r['lastSyncAt'] ?? null;
        $lastSyncAt = $lastSyncRaw ? Database::sqlToIso((string) $lastSyncRaw) : null;

        return [
            'souls' => DespertarDecimal::money(DespertarDecimal::decimalString($r['souls'] ?? '0.00')),
            'obols' => DespertarDecimal::money(DespertarDecimal::decimalString($r['obols'] ?? '0.00')),
            'mnemosyne' => DespertarDecimal::money(DespertarDecimal::decimalString($r['mnemosyne'] ?? '0.00')),
            'lifetimeSouls' => DespertarDecimal::money(DespertarDecimal::decimalString($r['lifetime_souls'] ?? $r['lifetimeSouls'] ?? '0.00')),
            'runSouls' => DespertarDecimal::money(DespertarDecimal::decimalString($r['run_souls'] ?? $r['runSouls'] ?? '0.00')),
            'prestigeCount' => self::asNonNegInt($r['prestige_count'] ?? $r['prestigeCount'] ?? 0),
            'generators' => $generators,
            'goldCounts' => $goldCounts,
            'shinyCounts' => $shinyCounts,
            'upgrades' => $upgrades,
            'talents' => $talents,
            'eduLogsSeen' => $eduLogsSeen,
            'milestones' => self::asObject($r['milestones'] ?? []),
            'stats' => self::normalizeDespertarStats($r['stats'] ?? []),
            'verdicts' => self::asNonNegInt($r['verdicts'] ?? 0),
            'juizoBestStreak' => self::asNonNegInt($r['juizo_best_streak'] ?? $r['juizoBestStreak'] ?? 0),
            'juizoCurrentStreak' => self::asNonNegInt($r['juizo_current_streak'] ?? $r['juizoCurrentStreak'] ?? 0),
            'juizoMilestonesClaimed' => self::asStringArray($r['juizo_milestones_claimed'] ?? $r['juizoMilestonesClaimed'] ?? []),
            'verdictPurchases' => $verdictPurchases,
            'juizoRun' => is_array($juizoRun) ? $juizoRun : null,
            'lastSyncAt' => $lastSyncAt,
        ];
    }

    /**
     * @param array<string, mixed> $rowOrCanonical
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public static function buildStateDto(array $rowOrCanonical, array $options = []): array
    {
        $state = self::rowToCanonical($rowOrCanonical);
        $goldNorm = self::normalizeGoldCounts($state['goldCounts'], $state['generators'], true);
        $goldCounts = $goldNorm['goldCounts'] ?? [];
        $shinyNorm = self::normalizeShinyCounts($state['shinyCounts'], $state['generators'], $goldCounts, true);
        $shinyCounts = $shinyNorm['shinyCounts'] ?? [];

        $sps = DespertarDecimal::money(DespertarFormulas::calculateTotalSPS([
            'generators' => $state['generators'],
            'upgrades' => $state['upgrades'],
            'talents' => $state['talents'],
            'obols' => $state['obols'],
            'verdictPurchases' => $state['verdictPurchases'],
            'shinyCounts' => $shinyCounts,
            'goldCounts' => $goldCounts,
        ]));
        $preview = DespertarFormulas::prestigePreview($state['runSouls'], $state['prestigeCount'], $state['talents']);

        $dto = [
            'souls' => DespertarDecimal::decimalString($state['souls']),
            'obols' => DespertarDecimal::decimalString($state['obols']),
            'mnemosyne' => DespertarDecimal::decimalString($state['mnemosyne']),
            'lifetimeSouls' => DespertarDecimal::decimalString($state['lifetimeSouls']),
            'runSouls' => DespertarDecimal::decimalString($state['runSouls']),
            'prestigeCount' => $state['prestigeCount'],
            'generators' => $state['generators'],
            'shinyCounts' => (object) $shinyCounts,
            'goldCounts' => (object) $goldCounts,
            'upgrades' => $state['upgrades'],
            'talents' => $state['talents'],
            'eduLogsSeen' => $state['eduLogsSeen'],
            'milestones' => (object) $state['milestones'],
            'stats' => $state['stats'],
            'lastSyncAt' => $state['lastSyncAt'] ?? Database::nowIso(),
            'sps' => DespertarDecimal::decimalString($sps),
            'prestigePreview' => [
                'obolsGain' => (string) $preview['obolsGain'],
                'mnemosyneGain' => (string) $preview['mnemosyneGain'],
                'unlocked' => (bool) $preview['unlocked'],
            ],
            'verdicts' => $state['verdicts'],
            'juizoBestStreak' => $state['juizoBestStreak'],
            'juizoCurrentStreak' => $state['juizoCurrentStreak'],
            'juizoMilestonesClaimed' => $state['juizoMilestonesClaimed'],
            'verdictPurchases' => $state['verdictPurchases'],
        ];

        if (isset($options['echoEpoch']) && is_int($options['echoEpoch']) && $options['echoEpoch'] >= 0) {
            $dto['echoEpoch'] = $options['echoEpoch'];
        }

        return $dto;
    }

    public static function parseClientEpoch(mixed $clientState): ?int
    {
        if (!is_array($clientState)) {
            return null;
        }
        $raw = $clientState['clientEpoch'] ?? $clientState['syncEpoch'] ?? null;
        if ($raw === null || $raw === '' || !is_numeric($raw)) {
            return null;
        }
        $n = (int) floor((float) $raw);
        return $n >= 0 ? $n : null;
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public static function canonicalToRowPatch(array $state, string $nowIso): array
    {
        return [
            'souls' => DespertarDecimal::decimalString($state['souls']),
            'obols' => DespertarDecimal::decimalString($state['obols']),
            'mnemosyne' => DespertarDecimal::decimalString($state['mnemosyne']),
            'lifetime_souls' => DespertarDecimal::decimalString($state['lifetimeSouls']),
            'run_souls' => DespertarDecimal::decimalString($state['runSouls']),
            'prestige_count' => (int) $state['prestigeCount'],
            'generators_state' => $state['generators'],
            'shiny_counts' => $state['shinyCounts'] ?? [],
            'gold_counts' => $state['goldCounts'] ?? [],
            'upgrades_state' => $state['upgrades'],
            'talents_state' => $state['talents'],
            'edu_logs_seen' => $state['eduLogsSeen'],
            'milestones' => $state['milestones'],
            'stats' => self::statsToRowJson($state['stats']),
            'last_sync_at' => $nowIso,
            'updated_at' => $nowIso,
        ];
    }

    // -------------------------------------------------------------------------
    // Validação Autoritativa (validateSync, applyPrestige, applyTalentBuy, applyVerdictBuy)
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $db
     * @param array<string, mixed> $client
     * @return array{ok: bool, spent?: string, biggestBuy?: int, error?: string}
     */
    private static function computeSpend(array $db, array $client): array
    {
        $effects = DespertarFormulas::economyEffects($db['talents'], $db['verdictPurchases']);
        $costMult = (string) $effects['generatorCostMult'];
        $totalOwned = array_sum(array_map('intval', $db['generators']));
        if ($totalOwned === 0 && DespertarDecimal::cmp($effects['firstGeneratorCostMult'], '1') !== 0) {
            $costMult = DespertarDecimal::mul($costMult, (string) $effects['firstGeneratorCostMult']);
        }

        $spent = '0';
        $biggestBuy = 0;

        foreach (DespertarCatalog::GENERATORS as $def) {
            $id = $def['id'];
            $from = (int) ($db['generators'][$id] ?? 0);
            $to = (int) ($client['generators'][$id] ?? 0);
            if ($to < $from) {
                return ['ok' => false, 'error' => 'Quantidade de gerador não pode cair no sync.'];
            }
            $delta = $to - $from;
            if ($delta > 0) {
                if ($delta > $biggestBuy) {
                    $biggestBuy = $delta;
                }
                $spent = DespertarDecimal::add(
                    $spent,
                    DespertarFormulas::generatorBatchCost($def['baseCost'], $from, $delta, $costMult)
                );
            }
        }

        $dbUpgradesSet = array_flip($db['upgrades']);
        $upById = DespertarCatalog::upgradesById();
        foreach ($client['upgrades'] as $id) {
            if (isset($dbUpgradesSet[$id])) {
                continue;
            }
            $upgrade = $upById[$id] ?? null;
            if (!$upgrade) {
                return ['ok' => false, 'error' => "Juramento desconhecido: {$id}"];
            }
            if (!DespertarFormulas::meetsUpgradeRequirement($upgrade, [
                'souls' => $client['souls'],
                'generators' => $client['generators'],
                'upgrades' => $client['upgrades'],
            ])) {
                return ['ok' => false, 'error' => "Juramento sem requisito: {$id}"];
            }
            $spent = DespertarDecimal::add($spent, $upgrade['cost']);
        }

        $clientUpgradesSet = array_flip($client['upgrades']);
        foreach ($db['upgrades'] as $id) {
            if (!isset($clientUpgradesSet[$id])) {
                return ['ok' => false, 'error' => 'Juramento não pode ser removido no sync.'];
            }
        }

        return ['ok' => true, 'spent' => DespertarDecimal::money($spent), 'biggestBuy' => $biggestBuy];
    }

    /**
     * @param array<string, mixed> $dbRow
     * @return array<string, mixed>
     */
    public static function validateSync(array $dbRow, mixed $clientState, ?int $nowMs = null): array
    {
        $db = self::rowToCanonical($dbRow);
        $nowMs = $nowMs ?? (int) round(microtime(true) * 1000);
        $nowIso = Database::nowIso($nowMs);
        $echoEpoch = self::parseClientEpoch($clientState);
        $echoOpts = $echoEpoch !== null ? ['echoEpoch' => $echoEpoch] : [];

        $withEcho = static function (array $res) use ($echoEpoch): array {
            if ($echoEpoch !== null) {
                $res['echoEpoch'] = $echoEpoch;
            }
            return $res;
        };

        if (!is_array($clientState)) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
            ]);
        }

        $clientLast = $clientState['lastSyncAt'] ?? $clientState['last_sync_at'] ?? null;
        if ($clientLast && !empty($db['lastSyncAt'])) {
            $clientMs = Database::parseMs((string) $clientLast);
            $dbMs = Database::parseMs((string) $db['lastSyncAt']);
            if ($clientMs !== null && $dbMs !== null && $clientMs < $dbMs - 1000) {
                return $withEcho([
                    'ok' => false,
                    'status' => 409,
                    'error' => 'A Estela do servidor é mais recente. Estado restaurado.',
                    'state' => self::buildStateDto($db, $echoOpts),
                ]);
            }
        }

        $rawGens = self::asObject($clientState['generators'] ?? $clientState['generators_state'] ?? []);
        $rawUps = self::asStringArray($clientState['upgrades'] ?? $clientState['upgrades_state'] ?? []);
        $rawTals = self::asStringArray($clientState['talents'] ?? $clientState['talents_state'] ?? []);
        $unknown = DespertarFormulas::unknownCatalogIds($rawGens, $rawUps, $rawTals);
        if ($unknown !== []) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
                'unknown' => $unknown,
            ]);
        }

        $upById = DespertarCatalog::upgradesById();
        $client = [
            'souls' => DespertarDecimal::money(DespertarDecimal::decimalString($clientState['souls'] ?? null, $db['souls'])),
            'generators' => self::normalizeGenerators($rawGens),
            'upgrades' => array_values(array_filter($rawUps, static fn(string $id): bool => isset($upById[$id]))),
            'runSouls' => DespertarDecimal::money(DespertarDecimal::decimalString($clientState['runSouls'] ?? $clientState['run_souls'] ?? null, $db['runSouls'])),
            'lifetimeSouls' => DespertarDecimal::money(DespertarDecimal::decimalString($clientState['lifetimeSouls'] ?? $clientState['lifetime_souls'] ?? null, $db['lifetimeSouls'])),
            'eduLogsSeen' => self::asStringArray($clientState['eduLogsSeen'] ?? $clientState['edu_logs_seen'] ?? []),
            'milestones' => self::asObject($clientState['milestones'] ?? []),
        ];

        $goldRes = self::normalizeGoldCounts($clientState['goldCounts'] ?? $clientState['gold_counts'] ?? [], $client['generators'], false);
        if (!$goldRes['ok']) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
                'detail' => $goldRes['error'],
            ]);
        }
        $client['goldCounts'] = $goldRes['goldCounts'] ?? [];

        $shinyRes = self::normalizeShinyCounts($clientState['shinyCounts'] ?? $clientState['shiny_counts'] ?? [], $client['generators'], $client['goldCounts'], false);
        if (!$shinyRes['ok']) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
                'detail' => $shinyRes['error'],
            ]);
        }
        $client['shinyCounts'] = $shinyRes['shinyCounts'] ?? [];

        if (DespertarDecimal::cmp($client['souls'], '0') < 0) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
            ]);
        }

        if (DespertarDecimal::cmp($client['runSouls'], $db['runSouls']) < 0
            || DespertarDecimal::cmp($client['lifetimeSouls'], $db['lifetimeSouls']) < 0) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
            ]);
        }

        $spend = self::computeSpend($db, $client);
        if (!$spend['ok']) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
                'detail' => $spend['error'],
            ]);
        }

        $lastMs = !empty($db['lastSyncAt']) ? Database::parseMs((string) $db['lastSyncAt']) : $nowMs;
        $rawDt = max(0.0, ($nowMs - ($lastMs ?? $nowMs)) / 1000.0);
        $econ = DespertarFormulas::economyEffects($db['talents'], $db['verdictPurchases']);
        $ceiling = ((float) ($econ['offlineHours'] ?? DespertarCatalog::OFFLINE_MAX_HOURS_BASE)) * 3600.0 + DespertarCatalog::SYNC_OFFLINE_JITTER_SECONDS;
        $dt = min($rawDt, $ceiling);

        $sps = DespertarFormulas::calculateTotalSPS([
            'generators' => $client['generators'],
            'upgrades' => $client['upgrades'],
            'talents' => $db['talents'],
            'obols' => $db['obols'],
            'verdictPurchases' => $db['verdictPurchases'],
            'shinyCounts' => $client['shinyCounts'],
            'goldCounts' => $client['goldCounts'],
        ]);
        $power = DespertarFormulas::clickPower([
            'generators' => $client['generators'],
            'upgrades' => $client['upgrades'],
            'talents' => $db['talents'],
            'obols' => $db['obols'],
            'sps' => $sps,
            'verdictPurchases' => $db['verdictPurchases'],
            'shinyCounts' => $client['shinyCounts'],
            'goldCounts' => $client['goldCounts'],
        ]);
        $maxGain = DespertarFormulas::theoreticalMaxGain($sps, $power, $dt);

        $walletDelta = DespertarDecimal::sub($client['souls'], $db['souls']);
        $claimedGain = DespertarDecimal::add($walletDelta, $spend['spent'] ?? '0');

        if (DespertarDecimal::cmp($claimedGain, '0') < 0) {
            $available = DespertarDecimal::add($db['souls'], $maxGain);
            if (DespertarDecimal::cmp($spend['spent'] ?? '0', $available) > 0) {
                return $withEcho([
                    'ok' => false,
                    'status' => 400,
                    'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                    'state' => self::buildStateDto($db, $echoOpts),
                ]);
            }
        }

        $excess = DespertarDecimal::sub($claimedGain, $maxGain);
        if (DespertarDecimal::cmp($claimedGain, $maxGain) > 0
            && DespertarDecimal::cmp($excess, DespertarCatalog::SYNC_ABSURD_GAIN_FLOOR) > 0) {
            return $withEcho([
                'ok' => false,
                'status' => 400,
                'error' => DespertarCatalog::JUDGES_REFUSED_MESSAGE,
                'state' => self::buildStateDto($db, $echoOpts),
                'maxGain' => DespertarDecimal::decimalString($maxGain),
                'claimedGain' => DespertarDecimal::decimalString($claimedGain),
            ]);
        }

        $eduSet = array_flip(DespertarCatalog::EDU_LOG_IDS);
        $seenLogs = array_flip(array_filter($db['eduLogsSeen'], static fn(string $id): bool => isset($eduSet[$id])));
        foreach ($client['eduLogsSeen'] as $id) {
            if (isset($eduSet[$id])) {
                $seenLogs[$id] = true;
            }
        }
        $mergedLogs = [];
        foreach (DespertarCatalog::EDU_LOG_IDS as $id) {
            if (isset($seenLogs[$id])) {
                $mergedLogs[] = $id;
            }
        }

        $mergedMilestones = $db['milestones'];
        foreach ($client['milestones'] as $k => $v) {
            if ($v) {
                $mergedMilestones[(string) $k] = true;
            }
        }

        $stats = $db['stats'];
        $biggestBuy = (int) ($spend['biggestBuy'] ?? 0);
        if ($biggestBuy > 0) {
            $stats['maxBuyBiggest'] = max((int) ($stats['maxBuyBiggest'] ?? 0), $biggestBuy);
        }

        $next = array_merge($db, [
            'souls' => $client['souls'],
            'generators' => $client['generators'],
            'shinyCounts' => $client['shinyCounts'],
            'goldCounts' => $client['goldCounts'],
            'upgrades' => $client['upgrades'],
            'runSouls' => $client['runSouls'],
            'lifetimeSouls' => $client['lifetimeSouls'],
            'eduLogsSeen' => $mergedLogs,
            'milestones' => $mergedMilestones,
            'stats' => $stats,
            'lastSyncAt' => $nowIso,
        ]);

        // Sanitize edu logs
        $sanitizedLogs = DespertarFormulas::sanitizeEduLogsSeen($next['eduLogsSeen'], $next, true);
        $next['eduLogsSeen'] = $sanitizedLogs;

        return $withEcho([
            'ok' => true,
            'status' => 200,
            'state' => self::buildStateDto($next, $echoOpts),
            'patch' => self::canonicalToRowPatch($next, $nowIso),
            'next' => $next,
        ]);
    }

    /**
     * @param array<string, mixed> $dbRow
     * @return array<string, mixed>
     */
    public static function applyPrestige(array $dbRow, ?int $nowMs = null): array
    {
        $db = self::rowToCanonical($dbRow);
        $nowIso = Database::nowIso($nowMs);
        if (!DespertarFormulas::canPrestige($db['runSouls'], $db['prestigeCount'])) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'O Lethe ainda não rende Óbolos.',
                'state' => self::buildStateDto($db),
            ];
        }

        $preview = DespertarFormulas::prestigePreview($db['runSouls'], $db['prestigeCount'], $db['talents']);
        $effects = DespertarFormulas::talentEffects($db['talents']);
        $nextGenerators = self::normalizeGenerators([]);
        $genById = DespertarCatalog::generatorsById();
        foreach (($effects['startingGenerators'] ?? []) as $id => $qty) {
            if (isset($genById[$id])) {
                $nextGenerators[$id] = (int) $qty;
            }
        }

        $startingSouls = DespertarDecimal::money($effects['startingSouls'] ?? '0');
        $nextUpgrades = [];
        $ecoCount = (int) ($effects['softPrestigeStyxCount'] ?? 0);
        if ($ecoCount > 0) {
            $nextUpgrades = DespertarFormulas::pickEcoDoStyxUpgrades($ecoCount, [
                'souls' => $startingSouls,
                'generators' => $nextGenerators,
                'upgrades' => [],
            ]);
        }

        $next = array_merge($db, [
            'obols' => DespertarDecimal::money(DespertarDecimal::add($db['obols'], $preview['obolsGain'])),
            'mnemosyne' => DespertarDecimal::money(DespertarDecimal::add($db['mnemosyne'], $preview['mnemosyneGain'])),
            'prestigeCount' => $db['prestigeCount'] + 1,
            'upgrades' => $nextUpgrades,
            'generators' => $nextGenerators,
            'shinyCounts' => [],
            'goldCounts' => [],
            'souls' => $startingSouls,
            'runSouls' => $startingSouls,
            'lastSyncAt' => $nowIso,
        ]);

        return [
            'ok' => true,
            'status' => 200,
            'state' => self::buildStateDto($next),
            'patch' => self::canonicalToRowPatch($next, $nowIso),
            'next' => $next,
            'preview' => $preview,
        ];
    }

    /**
     * @param array<string, mixed> $dbRow
     * @return array<string, mixed>
     */
    public static function applyTalentBuy(array $dbRow, mixed $talentId, ?int $nowMs = null): array
    {
        $db = self::rowToCanonical($dbRow);
        $nowIso = Database::nowIso($nowMs);
        $tid = is_string($talentId) ? trim($talentId) : '';
        $talent = DespertarCatalog::TALENTS[$tid] ?? null;

        if (!$talent) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'Talento desconhecido.',
                'state' => self::buildStateDto($db),
            ];
        }
        if (in_array($tid, $db['talents'], true)) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'Talento já está na memória.',
                'state' => self::buildStateDto($db),
            ];
        }
        if (DespertarDecimal::cmp($db['mnemosyne'], $talent['cost']) < 0) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'Essência insuficiente.',
                'state' => self::buildStateDto($db),
            ];
        }

        $next = array_merge($db, [
            'mnemosyne' => DespertarDecimal::money(DespertarDecimal::sub($db['mnemosyne'], $talent['cost'])),
            'talents' => array_merge($db['talents'], [$tid]),
            'lastSyncAt' => $nowIso,
        ]);

        return [
            'ok' => true,
            'status' => 200,
            'state' => self::buildStateDto($next),
            'patch' => self::canonicalToRowPatch($next, $nowIso),
            'next' => $next,
        ];
    }

    /**
     * @param array<string, mixed> $dbRow
     * @return array<string, mixed>
     */
    public static function applyVerdictBuy(array $dbRow, mixed $purchaseId, ?int $nowMs = null): array
    {
        $db = self::rowToCanonical($dbRow);
        $nowIso = Database::nowIso($nowMs);
        $pid = is_string($purchaseId) ? trim($purchaseId) : '';
        $item = DespertarCatalog::VERDICT_SHOP[$pid] ?? null;

        if (!$item) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'Item da Bancada desconhecido.',
                'state' => self::buildStateDto($db),
            ];
        }
        if (in_array($pid, $db['verdictPurchases'], true)) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'Item já está na Bancada.',
                'state' => self::buildStateDto($db),
            ];
        }
        $cost = max(0, (int) ($item['cost'] ?? 0));
        if ($db['verdicts'] < $cost) {
            return [
                'ok' => false,
                'status' => 400,
                'error' => 'Vereditos insuficientes.',
                'state' => self::buildStateDto($db),
            ];
        }

        $next = array_merge($db, [
            'verdicts' => $db['verdicts'] - $cost,
            'verdictPurchases' => array_merge($db['verdictPurchases'], [$pid]),
            'lastSyncAt' => $nowIso,
        ]);

        $patch = self::canonicalToRowPatch($next, $nowIso);
        $patch['verdicts'] = $next['verdicts'];
        $patch['verdict_purchases'] = $next['verdictPurchases'];

        return [
            'ok' => true,
            'status' => 200,
            'state' => self::buildStateDto($next),
            'patch' => $patch,
            'next' => $next,
        ];
    }

    // -------------------------------------------------------------------------
    // Juízo do Tartarus (`api/_lib/despertar-juizo.js`)
    // -------------------------------------------------------------------------

    public static function normalizeJuizoChoice(mixed $choice): ?string
    {
        $raw = (string) ($choice ?? '');
        $map = [
            'higher' => 'B',
            'lower' => 'A',
            'tie' => 'tie',
            'A' => 'A',
            'B' => 'B',
        ];
        if (isset($map[$raw])) {
            return $map[$raw];
        }
        $lower = strtolower($raw);
        return $map[$lower] ?? null;
    }

    public static function isCorrectJuizoGuess(string $ratingA, string $ratingB, mixed $choice): bool
    {
        $order = array_flip(DespertarCatalog::JUIZO_RATING_ORDER);
        if (!isset($order[$ratingA]) || !isset($order[$ratingB])) {
            return false;
        }
        $a = $order[$ratingA];
        $b = $order[$ratingB];
        $pick = self::normalizeJuizoChoice($choice);
        if ($pick === 'tie') {
            return $a === $b;
        }
        if ($pick === 'A') {
            return $a > $b;
        }
        if ($pick === 'B') {
            return $b > $a;
        }
        return false;
    }

    /**
     * @param array<int, array<string, mixed>> $pool
     * @param array<int, string> $exclude
     * @return array<int, array<string, mixed>>|null
     */
    private static function pickDistinctFromPool(array $pool, int $count, array $exclude = []): ?array
    {
        $banned = array_flip($exclude);
        $candidates = [];
        foreach ($pool as $g) {
            if (!isset($banned[$g['id']])) {
                $candidates[] = $g;
            }
        }
        if (count($candidates) < $count) {
            return null;
        }
        shuffle($candidates);
        return array_slice($candidates, 0, $count);
    }

    /**
     * @param array<string, mixed> $run
     * @param array<string, array<string, mixed>> $poolById
     * @return array<string, mixed>|null
     */
    private static function publicPairFromRun(array $run, array $poolById): ?array
    {
        $a = $poolById[$run['championId'] ?? ''] ?? null;
        $b = $poolById[$run['challengerId'] ?? ''] ?? null;
        if (!$a || !$b) {
            return null;
        }
        $cardA = DespertarCatalog::toPublicJuizoCard($a);
        if ($cardA) {
            $cardA['rating'] = (string) $a['rating'];
        }
        return [
            'cardA' => $cardA,
            'cardB' => DespertarCatalog::toPublicJuizoCard($b),
        ];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, int>
     */
    public static function juizoHud(array $state): array
    {
        return [
            'streak' => self::asNonNegInt($state['juizoCurrentStreak'] ?? 0),
            'best' => self::asNonNegInt($state['juizoBestStreak'] ?? 0),
            'verdicts' => self::asNonNegInt($state['verdicts'] ?? 0),
        ];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public static function juizoStart(array $state): array
    {
        $pool = DespertarCatalog::getJuizoReadyPool();
        if (count($pool) < 30) {
            return ['ok' => false, 'status' => 503, 'error' => 'O Juízo ainda cataloga as almas.'];
        }
        $pair = self::pickDistinctFromPool($pool, 2, []);
        if (!$pair) {
            return ['ok' => false, 'status' => 503, 'error' => 'O Juízo ainda cataloga as almas.'];
        }
        [$champion, $challenger] = $pair;
        $run = [
            'championId' => $champion['id'],
            'challengerId' => $challenger['id'],
            'ratingA' => (string) $champion['rating'],
            'ratingB' => (string) $challenger['rating'],
            'recentIds' => [],
            'mercyUsed' => false,
        ];
        $next = array_merge($state, [
            'juizoCurrentStreak' => 0,
            'juizoRun' => $run,
        ]);
        $poolById = [];
        foreach ($pool as $g) {
            $poolById[$g['id']] = $g;
        }
        return [
            'ok' => true,
            'next' => $next,
            'pair' => self::publicPairFromRun($run, $poolById),
            'hud' => self::juizoHud($next),
            'ended' => false,
        ];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public static function juizoGuess(array $state, mixed $choice): array
    {
        $run = $state['juizoRun'] ?? null;
        if (!is_array($run) || empty($run['championId']) || empty($run['challengerId'])) {
            return ['ok' => false, 'status' => 400, 'error' => 'Não há julgamento em curso.'];
        }
        $pick = self::normalizeJuizoChoice($choice);
        if (!$pick) {
            return ['ok' => false, 'status' => 400, 'error' => 'Escolha inválida.'];
        }

        $ratingA = (string) ($run['ratingA'] ?? '');
        $ratingB = (string) ($run['ratingB'] ?? '');
        $correct = self::isCorrectJuizoGuess($ratingA, $ratingB, $pick);
        $brokenStreak = self::asNonNegInt($state['juizoCurrentStreak'] ?? 0);

        $pool = DespertarCatalog::getJuizoReadyPool();
        $poolById = [];
        foreach ($pool as $g) {
            $poolById[$g['id']] = $g;
        }

        $purchases = self::asStringArray($state['verdictPurchases'] ?? []);
        $hasCatalogoVivo = in_array('catalogo_vivo', $purchases, true);
        $hasEcoVeredito = in_array('eco_do_veredito', $purchases, true);

        if (!$correct) {
            if ($hasCatalogoVivo && empty($run['mercyUsed'])) {
                $champion = $poolById[$run['championId']] ?? null;
                if (!$champion) {
                    return ['ok' => false, 'status' => 500, 'error' => 'Campeão ausente do pool.'];
                }
                $recent = array_slice(
                    array_values(array_filter(array_merge(self::asStringArray($run['recentIds'] ?? []), [(string) $run['challengerId']]))),
                    -8
                );
                $nextPick = self::pickDistinctFromPool($pool, 1, array_merge([(string) $run['championId']], $recent))
                    ?? self::pickDistinctFromPool($pool, 1, [(string) $run['championId']]);
                if (!$nextPick) {
                    return ['ok' => false, 'status' => 503, 'error' => 'O Juízo ainda cataloga as almas.'];
                }
                $nextRun = [
                    'championId' => $champion['id'],
                    'challengerId' => $nextPick[0]['id'],
                    'ratingA' => (string) $champion['rating'],
                    'ratingB' => (string) $nextPick[0]['rating'],
                    'recentIds' => $recent,
                    'mercyUsed' => true,
                ];
                $next = array_merge($state, ['juizoRun' => $nextRun]);
                return [
                    'ok' => true,
                    'next' => $next,
                    'ended' => false,
                    'mercy' => true,
                    'ratingA' => $ratingA,
                    'ratingB' => $ratingB,
                    'deltaLabel' => "{$ratingA} → {$ratingB}",
                    'brokenStreak' => $brokenStreak,
                    'pair' => self::publicPairFromRun($nextRun, $poolById),
                    'hud' => self::juizoHud($next),
                    'milestones' => ['newly' => [], 'verdictGain' => 0, 'ecoBonus' => 0],
                ];
            }

            $next = array_merge($state, [
                'juizoCurrentStreak' => 0,
                'juizoRun' => null,
            ]);
            return [
                'ok' => true,
                'next' => $next,
                'ended' => true,
                'ratingA' => $ratingA,
                'ratingB' => $ratingB,
                'deltaLabel' => "{$ratingA} → {$ratingB}",
                'brokenStreak' => $brokenStreak,
                'hud' => self::juizoHud($next),
                'milestones' => ['newly' => [], 'verdictGain' => 0, 'ecoBonus' => 0],
            ];
        }

        $current = $brokenStreak + 1;
        $bestBefore = self::asNonNegInt($state['juizoBestStreak'] ?? 0);
        $bestAfter = max($bestBefore, $current);

        $haveClaimed = array_flip(self::asStringArray($state['juizoMilestonesClaimed'] ?? []));
        $newly = [];
        $verdictGain = 0;
        foreach (DespertarCatalog::JUIZO_STREAK_MILESTONES as $m) {
            $mid = $m['id'];
            if (isset($haveClaimed[$mid])) {
                continue;
            }
            if ($bestAfter >= $m['streak']) {
                $newly[] = $mid;
                $verdictGain += (int) $m['verdicts'];
                $haveClaimed[$mid] = true;
            }
        }
        $claimedList = [];
        foreach (DespertarCatalog::JUIZO_STREAK_MILESTONES as $m) {
            if (isset($haveClaimed[$m['id']])) {
                $claimedList[] = $m['id'];
            }
        }

        $ecoBonus = ($hasEcoVeredito && $newly !== []) ? count($newly) : 0;
        $totalVerdictGain = $verdictGain + $ecoBonus;

        $championId = (string) $run['challengerId'];
        $champion = $poolById[$championId] ?? null;
        if (!$champion) {
            return ['ok' => false, 'status' => 500, 'error' => 'Campeão ausente do pool.'];
        }

        $recent = array_slice(
            array_values(array_filter(array_merge(
                self::asStringArray($run['recentIds'] ?? []),
                [(string) $run['championId'], $championId]
            ))),
            -8
        );
        $nextPick = self::pickDistinctFromPool($pool, 1, array_merge([$championId], $recent))
            ?? self::pickDistinctFromPool($pool, 1, [$championId]);
        if (!$nextPick) {
            return ['ok' => false, 'status' => 503, 'error' => 'O Juízo ainda cataloga as almas.'];
        }
        $challenger = $nextPick[0];
        $nextRun = [
            'championId' => $champion['id'],
            'challengerId' => $challenger['id'],
            'ratingA' => (string) $champion['rating'],
            'ratingB' => (string) $challenger['rating'],
            'recentIds' => $recent,
            'mercyUsed' => !empty($run['mercyUsed']),
        ];

        $stats = $state['stats'];
        if ($pick === 'tie') {
            $stats['juizoTieWins'] = ((int) ($stats['juizoTieWins'] ?? 0)) + 1;
        }

        $next = array_merge($state, [
            'juizoCurrentStreak' => $current,
            'juizoBestStreak' => $bestAfter,
            'juizoMilestonesClaimed' => $claimedList,
            'verdicts' => self::asNonNegInt($state['verdicts'] ?? 0) + $totalVerdictGain,
            'juizoRun' => $nextRun,
            'stats' => $stats,
        ]);

        return [
            'ok' => true,
            'next' => $next,
            'ended' => false,
            'ratingA' => $ratingA,
            'ratingB' => $ratingB,
            'pair' => self::publicPairFromRun($nextRun, $poolById),
            'hud' => self::juizoHud($next),
            'milestones' => [
                'newly' => $newly,
                'verdictGain' => $totalVerdictGain,
                'ecoBonus' => $ecoBonus,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public static function juizoAbandon(array $state): array
    {
        $next = array_merge($state, [
            'juizoCurrentStreak' => 0,
            'juizoRun' => null,
        ]);
        return [
            'ok' => true,
            'next' => $next,
            'ended' => true,
            'abandoned' => true,
            'hud' => self::juizoHud($next),
        ];
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public static function juizoPatchFromState(array $state, string $nowIso): array
    {
        return [
            'verdicts' => self::asNonNegInt($state['verdicts'] ?? 0),
            'juizo_best_streak' => self::asNonNegInt($state['juizoBestStreak'] ?? 0),
            'juizo_current_streak' => self::asNonNegInt($state['juizoCurrentStreak'] ?? 0),
            'juizo_milestones_claimed' => self::asStringArray($state['juizoMilestonesClaimed'] ?? []),
            'verdict_purchases' => self::asStringArray($state['verdictPurchases'] ?? []),
            'juizo_run' => $state['juizoRun'] ?? null,
            'stats' => self::statsToRowJson($state['stats'] ?? []),
            'milestones' => self::asObject($state['milestones'] ?? []),
            'updated_at' => $nowIso,
        ];
    }

    // -------------------------------------------------------------------------
    // Gate e Pausa de Sala (`lesson_gates` lesson_id='despertar')
    // -------------------------------------------------------------------------

    public static function isDespertarPublished(): bool
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `released` FROM `lesson_gates`
             WHERE `lesson_id` = \'despertar\' AND `gate_key` = \'published\' LIMIT 1'
        );
        $stmt->execute();
        $val = $stmt->fetchColumn();
        return $val !== false && (bool) $val;
    }

    /**
     * @return array{released: bool, pauseUntil: string|null, reason: string|null, pauseStartedAt: string|null}
     */
    public static function getDespertarPauseState(): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT `released`, `meta` FROM `lesson_gates`
             WHERE `lesson_id` = \'despertar\' AND `gate_key` = \'classroom_pause\' LIMIT 1'
        );
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['released' => false, 'pauseUntil' => null, 'reason' => null, 'pauseStartedAt' => null];
        }
        $meta = self::asObject($row['meta'] ?? []);
        return [
            'released' => (bool) $row['released'],
            'pauseUntil' => isset($meta['pause_until']) ? (string) $meta['pause_until'] : null,
            'reason' => isset($meta['reason']) ? (string) $meta['reason'] : null,
            'pauseStartedAt' => isset($meta['pause_started_at']) ? (string) $meta['pause_started_at'] : null,
        ];
    }

    /**
     * @param array<string, mixed>|null $pause
     */
    public static function isDespertarPauseActive(?array $pause, ?int $nowMs = null): bool
    {
        if (!$pause || empty($pause['released']) || empty($pause['pauseUntil'])) {
            return false;
        }
        $now = $nowMs ?? (int) round(microtime(true) * 1000);
        $untilMs = Database::parseMs((string) $pause['pauseUntil']);
        return $untilMs !== null && $untilMs > $now;
    }

    /**
     * @param array<string, mixed>|null $pause
     * @return array<string, mixed>|null
     */
    public static function pausePublicDto(?array $pause, ?int $nowMs = null): ?array
    {
        if (!self::isDespertarPauseActive($pause, $nowMs)) {
            return null;
        }
        return [
            'active' => true,
            'pauseUntil' => $pause['pauseUntil'],
            'reason' => !empty($pause['reason']) ? $pause['reason'] : self::PAUSE_REASON_PRESETS['aula'],
            'pauseStartedAt' => $pause['pauseStartedAt'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed>|null $pause
     * @return array<string, mixed>|null
     */
    public static function pauseWindowDto(?array $pause, ?int $nowMs = null): ?array
    {
        if (!$pause || empty($pause['pauseUntil'])) {
            return null;
        }
        return [
            'active' => self::isDespertarPauseActive($pause, $nowMs),
            'pauseUntil' => $pause['pauseUntil'],
            'pauseStartedAt' => $pause['pauseStartedAt'] ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array{ok: bool, pause?: array<string, mixed>, serverNow?: string, error?: string}
     */
    public static function setClassroomPause(int $userId, array $input): array
    {
        $nowMs = (int) round(microtime(true) * 1000);
        $untilMs = null;

        if (!empty($input['pauseUntil']) && trim((string) $input['pauseUntil']) !== '') {
            $untilMs = Database::parseMs((string) $input['pauseUntil']);
            if ($untilMs === null) {
                return ['ok' => false, 'error' => 'Horário de reabertura inválido.'];
            }
        } else {
            $mins = isset($input['minutes']) && is_numeric($input['minutes']) ? (float) $input['minutes'] : 0.0;
            if ($mins <= 0) {
                return ['ok' => false, 'error' => 'Duração inválida.'];
            }
            $untilMs = $nowMs + (int) round($mins * 60000);
        }

        if ($untilMs <= $nowMs) {
            return ['ok' => false, 'error' => 'A reabertura precisa ser no futuro.'];
        }
        if ($untilMs > $nowMs + self::DESPERTAR_PAUSE_MAX_MS) {
            return ['ok' => false, 'error' => 'Pausa máxima: 4 horas.'];
        }

        $preset = trim((string) ($input['reasonPreset'] ?? 'aula')) ?: 'aula';
        if ($preset !== 'custom' && isset(self::PAUSE_REASON_PRESETS[$preset])) {
            $reason = self::PAUSE_REASON_PRESETS[$preset];
        } else {
            $reason = trim((string) ($input['reason'] ?? ''));
            $len = mb_strlen($reason, 'UTF-8');
            if ($len < 1 || $len > self::DESPERTAR_PAUSE_REASON_MAX) {
                return ['ok' => false, 'error' => 'Motivo inválido (1–' . self::DESPERTAR_PAUSE_REASON_MAX . ' caracteres).'];
            }
        }

        $nowSql = Database::nowSql($nowMs);
        $nowIso = Database::nowIso($nowMs);
        $untilIso = Database::nowIso($untilMs);

        $meta = [
            'pause_until' => $untilIso,
            'reason' => $reason,
            'pause_started_at' => $nowIso,
        ];

        $pdo = Database::pdo();
        $ups = $pdo->prepare(
            'INSERT INTO `lesson_gates` (`lesson_id`, `gate_key`, `released`, `released_by`, `released_at`, `updated_at`, `meta`)
             VALUES (\'despertar\', \'classroom_pause\', 1, :by, :ra, :ua, :meta)
             ON DUPLICATE KEY UPDATE
               `released` = 1,
               `released_by` = VALUES(`released_by`),
               `released_at` = VALUES(`released_at`),
               `updated_at` = VALUES(`updated_at`),
               `meta` = VALUES(`meta`)'
        );
        $ups->execute([
            ':by' => $userId,
            ':ra' => $nowSql,
            ':ua' => $nowSql,
            ':meta' => Database::encodeJson($meta),
        ]);

        return [
            'ok' => true,
            'pause' => [
                'released' => true,
                'pauseUntil' => $untilIso,
                'reason' => $reason,
                'pauseStartedAt' => $nowIso,
            ],
            'serverNow' => $nowIso,
        ];
    }

    /**
     * @return array{ok: bool, serverNow: string}
     */
    public static function clearClassroomPause(int $userId): array
    {
        $nowMs = (int) round(microtime(true) * 1000);
        $nowSql = Database::nowSql($nowMs);
        $nowIso = Database::nowIso($nowMs);

        $pdo = Database::pdo();
        $ups = $pdo->prepare(
            'INSERT INTO `lesson_gates` (`lesson_id`, `gate_key`, `released`, `released_by`, `released_at`, `updated_at`, `meta`)
             VALUES (\'despertar\', \'classroom_pause\', 0, :by, NULL, :ua, \'{}\')
             ON DUPLICATE KEY UPDATE
               `released` = 0,
               `released_by` = VALUES(`released_by`),
               `released_at` = NULL,
               `updated_at` = VALUES(`updated_at`),
               `meta` = \'{}\''
        );
        $ups->execute([':by' => $userId, ':ua' => $nowSql]);

        return ['ok' => true, 'serverNow' => $nowIso];
    }

    // -------------------------------------------------------------------------
    // Debug / Sandbox do Mestre (`api/_lib/despertar-debug.js`)
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public static function debugZeroPatch(string $nowIso): array
    {
        return [
            'souls' => '0.00',
            'obols' => '0.00',
            'mnemosyne' => '0.00',
            'lifetime_souls' => '0.00',
            'run_souls' => '0.00',
            'prestige_count' => 0,
            'generators_state' => [],
            'shiny_counts' => [],
            'gold_counts' => [],
            'upgrades_state' => [],
            'talents_state' => [],
            'edu_logs_seen' => [],
            'milestones' => [],
            'verdicts' => 0,
            'juizo_best_streak' => 0,
            'juizo_current_streak' => 0,
            'juizo_milestones_claimed' => [],
            'verdict_purchases' => [],
            'juizo_run' => null,
            'last_sync_at' => $nowIso,
            'updated_at' => $nowIso,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function debugSandboxPatch(string $nowIso): array
    {
        return array_merge(self::debugZeroPatch($nowIso), [
            'souls' => '500000.00',
            'obols' => '25.00',
            'mnemosyne' => '100.00',
            'lifetime_souls' => '500000.00',
            'run_souls' => '1000000000.00',
            'verdicts' => 40,
        ]);
    }

    /**
     * @param array<string, mixed> $row
     * @return array{ok: bool, patch?: array<string, mixed>, label?: string, grantId?: string, error?: string}
     */
    public static function buildDebugGrantPatch(array $row, mixed $grantId): array
    {
        $id = trim((string) ($grantId ?? ''));
        $preset = self::DEBUG_GRANT_PRESETS[$id] ?? null;
        if (!$preset) {
            return ['ok' => false, 'error' => 'Concessão desconhecida.'];
        }

        $patch = [];
        if (isset($preset['souls'])) {
            $gain = (string) $preset['souls'];
            $patch['souls'] = DespertarDecimal::money(DespertarDecimal::add($row['souls'] ?? '0', $gain));
            $patch['lifetime_souls'] = DespertarDecimal::money(DespertarDecimal::add($row['lifetime_souls'] ?? '0', $gain));
            $patch['run_souls'] = DespertarDecimal::money(DespertarDecimal::add($row['run_souls'] ?? '0', $gain));
        }
        if (isset($preset['obols'])) {
            $patch['obols'] = DespertarDecimal::money(DespertarDecimal::add($row['obols'] ?? '0', (string) $preset['obols']));
        }
        if (isset($preset['mnemosyne'])) {
            $patch['mnemosyne'] = DespertarDecimal::money(DespertarDecimal::add($row['mnemosyne'] ?? '0', (string) $preset['mnemosyne']));
        }
        if (isset($preset['verdicts'])) {
            $patch['verdicts'] = max(0, (int) ($row['verdicts'] ?? 0)) + max(0, (int) $preset['verdicts']);
        }

        return ['ok' => true, 'patch' => $patch, 'label' => $preset['label'], 'grantId' => $id];
    }

    private static function parseAbsoluteMoney(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        $s = str_replace('_', '', trim((string) $raw));
        if (preg_match('/^(-?)(\d+)(?:\.(\d+))?e\+?(\d+)$/i', $s, $m)) {
            $sign = $m[1];
            $intPart = $m[2];
            $fracPart = $m[3] ?? '';
            $exp = (int) $m[4];
            if ($exp < 0 || $exp > 38) {
                return null;
            }
            $digits = $intPart . $fracPart;
            $shift = $exp - strlen($fracPart);
            if ($shift >= 0) {
                $s = $sign . $digits . str_repeat('0', $shift);
            } else {
                $cut = strlen($digits) + $shift;
                $s = $cut <= 0
                    ? $sign . '0.' . str_repeat('0', -$cut) . $digits
                    : $sign . substr($digits, 0, $cut) . '.' . substr($digits, $cut);
            }
        }
        try {
            $val = DespertarDecimal::money($s);
            return str_starts_with($val, '-') ? DespertarDecimal::money('0') : $val;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param array<string, mixed> $setInput
     * @return array{ok: bool, patch?: array<string, mixed>, label?: string, error?: string}
     */
    public static function buildDebugSetPatch(array $setInput): array
    {
        $patch = [];
        $parts = [];

        if (array_key_exists('souls', $setInput)) {
            $v = self::parseAbsoluteMoney($setInput['souls']);
            if ($v === null) {
                return ['ok' => false, 'error' => 'Valor de almas inválido.'];
            }
            $patch['souls'] = $v;
            $parts[] = "almas={$v}";
            if (!array_key_exists('run_souls', $setInput) && !array_key_exists('runSouls', $setInput)) {
                $patch['run_souls'] = $v;
            }
            if (!array_key_exists('lifetime_souls', $setInput) && !array_key_exists('lifetimeSouls', $setInput)) {
                $patch['lifetime_souls'] = $v;
            }
        }
        if (array_key_exists('run_souls', $setInput) || array_key_exists('runSouls', $setInput)) {
            $v = self::parseAbsoluteMoney($setInput['run_souls'] ?? $setInput['runSouls']);
            if ($v === null) {
                return ['ok' => false, 'error' => 'Valor de run_souls inválido.'];
            }
            $patch['run_souls'] = $v;
            $parts[] = "run={$v}";
        }
        if (array_key_exists('lifetime_souls', $setInput) || array_key_exists('lifetimeSouls', $setInput)) {
            $v = self::parseAbsoluteMoney($setInput['lifetime_souls'] ?? $setInput['lifetimeSouls']);
            if ($v === null) {
                return ['ok' => false, 'error' => 'Valor de lifetime_souls inválido.'];
            }
            $patch['lifetime_souls'] = $v;
            $parts[] = "lifetime={$v}";
        }
        if (array_key_exists('obols', $setInput)) {
            $v = self::parseAbsoluteMoney($setInput['obols']);
            if ($v === null) {
                return ['ok' => false, 'error' => 'Valor de óbolos inválido.'];
            }
            $patch['obols'] = $v;
            $parts[] = "óbolos={$v}";
        }
        if (array_key_exists('mnemosyne', $setInput)) {
            $v = self::parseAbsoluteMoney($setInput['mnemosyne']);
            if ($v === null) {
                return ['ok' => false, 'error' => 'Valor de essência inválido.'];
            }
            $patch['mnemosyne'] = $v;
            $parts[] = "essência={$v}";
        }
        if (array_key_exists('verdicts', $setInput)) {
            if (!is_numeric($setInput['verdicts']) || (int) $setInput['verdicts'] < 0) {
                return ['ok' => false, 'error' => 'Valor de vereditos inválido.'];
            }
            $patch['verdicts'] = (int) floor((float) $setInput['verdicts']);
            $parts[] = "vereditos={$patch['verdicts']}";
        }

        if ($patch === []) {
            return ['ok' => false, 'error' => 'Nenhum campo para definir.'];
        }

        return ['ok' => true, 'patch' => $patch, 'label' => 'Definido: ' . implode(', ', $parts)];
    }

    // -------------------------------------------------------------------------
    // Persistência Transacional PDO (substitui `public.despertar_persist_and_award`)
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    public static function getOrCreateStateRow(int $userId): array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT * FROM `despertar_states` WHERE `user_id` = :uid LIMIT 1');
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return self::hydrateStateRow($row);
        }

        $nowSql = Database::nowSql();
        $ins = $pdo->prepare(
            'INSERT IGNORE INTO `despertar_states`
             (`user_id`, `souls`, `obols`, `mnemosyne`, `lifetime_souls`, `run_souls`, `prestige_count`,
              `generators_state`, `shiny_counts`, `gold_counts`, `upgrades_state`, `talents_state`,
              `edu_logs_seen`, `milestones`, `stats`, `verdicts`, `juizo_best_streak`, `juizo_current_streak`,
              `juizo_milestones_claimed`, `verdict_purchases`, `juizo_run`, `last_sync_at`, `created_at`, `updated_at`)
             VALUES (:uid, 0.00, 0.00, 0.00, 0.00, 0.00, 0,
                     \'{}\', \'{}\', \'{}\', \'[]\', \'[]\',
                     \'[]\', \'{}\', \'{"clicks":0,"max_buy_biggest":0,"juizo_tie_wins":0}\', 0, 0, 0,
                     \'[]\', \'[]\', NULL, :ls, :ca, :ua)'
        );
        $ins->execute([':uid' => $userId, ':ls' => $nowSql, ':ca' => $nowSql, ':ua' => $nowSql]);

        $stmt->execute([':uid' => $userId]);
        $created = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['user_id' => $userId];
        return self::hydrateStateRow($created);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function hydrateStateRow(array $row): array
    {
        $jsonObjCols = ['generators_state', 'shiny_counts', 'gold_counts', 'milestones', 'stats'];
        foreach ($jsonObjCols as $col) {
            if (array_key_exists($col, $row)) {
                $row[$col] = self::asObject($row[$col]);
            }
        }
        $jsonArrCols = ['upgrades_state', 'talents_state', 'edu_logs_seen', 'juizo_milestones_claimed', 'verdict_purchases'];
        foreach ($jsonArrCols as $col) {
            if (array_key_exists($col, $row)) {
                $row[$col] = self::asStringArray($row[$col]);
            }
        }
        if (array_key_exists('juizo_run', $row) && is_string($row['juizo_run'])) {
            $row['juizo_run'] = Database::decodeJson($row['juizo_run'], null);
        }
        foreach (['last_sync_at', 'created_at', 'updated_at'] as $dtCol) {
            if (!empty($row[$dtCol])) {
                $row[$dtCol] = Database::sqlToIso((string) $row[$dtCol]);
            }
        }
        return $row;
    }

    /**
     * @param array<string, mixed> $patch
     * @return array<string, mixed>
     */
    public static function persistPatch(int $userId, array $patch): array
    {
        $pdo = Database::pdo();
        $sets = [];
        $params = [':uid' => $userId];

        $jsonObjCols = ['generators_state', 'shiny_counts', 'gold_counts', 'milestones', 'stats'];
        $jsonArrCols = ['upgrades_state', 'talents_state', 'edu_logs_seen', 'juizo_milestones_claimed', 'verdict_purchases'];
        $dtCols = ['last_sync_at', 'updated_at'];

        foreach ($patch as $col => $val) {
            $paramKey = ':p_' . $col;
            if (in_array($col, $jsonObjCols, true)) {
                $sets[] = "`{$col}` = {$paramKey}";
                $params[$paramKey] = json_encode((object) (is_array($val) ? $val : []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } elseif (in_array($col, $jsonArrCols, true)) {
                $sets[] = "`{$col}` = {$paramKey}";
                $params[$paramKey] = Database::encodeJsonArray(is_array($val) ? $val : []);
            } elseif ($col === 'juizo_run') {
                $sets[] = "`{$col}` = {$paramKey}";
                $params[$paramKey] = $val === null ? null : Database::encodeJson($val);
            } elseif (in_array($col, $dtCols, true)) {
                $sets[] = "`{$col}` = {$paramKey}";
                $params[$paramKey] = Database::isoToSql((string) $val) ?? Database::nowSql();
            } else {
                $sets[] = "`{$col}` = {$paramKey}";
                $params[$paramKey] = $val;
            }
        }

        if ($sets !== []) {
            $sql = 'UPDATE `despertar_states` SET ' . implode(', ', $sets) . ' WHERE `user_id` = :uid';
            $upd = $pdo->prepare($sql);
            $upd->execute($params);
        }

        return self::getOrCreateStateRow($userId);
    }

    /**
     * Executa persistência da Estela + concessão de conquistas/XP em transação atômica MySQL
     * (equivalente a `public.despertar_persist_and_award`).
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $patch
     * @param array<string, mixed> $canonicalState
     * @return array{row: array<string, mixed>, awarded: array<string, mixed>}
     */
    public static function persistPatchAndAward(array $user, array $patch, array $canonicalState, bool $award = true): array
    {
        $userId = (int) $user['id'];
        $existing = is_array($user['conquistas'] ?? null) ? array_values($user['conquistas']) : [];

        $fresh = [];
        $xpGain = 0;
        if ($award) {
            $earned = DespertarFormulas::evaluateDespertarAchievementIds($canonicalState, $existing, true);
            foreach ($earned as $id) {
                if (!in_array($id, $existing, true)) {
                    $fresh[] = $id;
                    $xpGain += GameCatalog::getAchievementXp($id);
                }
            }
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $savedRow = self::persistPatch($userId, $patch);

            $awardedPayload = ['xp' => 0, 'achievements' => [], 'achievementDetails' => []];
            if ($fresh !== []) {
                $uStmt = $pdo->prepare('SELECT `xp`, `conquistas` FROM `users` WHERE `id` = :uid FOR UPDATE');
                $uStmt->execute([':uid' => $userId]);
                $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($uRow) {
                    $prevXp = (int) ($uRow['xp'] ?? 0);
                    $curConq = Database::decodeJsonArray($uRow['conquistas'] ?? null);
                    $trulyFresh = [];
                    $realXpGain = 0;
                    foreach ($fresh as $fid) {
                        if (!in_array($fid, $curConq, true)) {
                            $trulyFresh[] = $fid;
                            $realXpGain += GameCatalog::getAchievementXp($fid);
                        }
                    }
                    if ($trulyFresh !== []) {
                        $nextXp = $prevXp + $realXpGain;
                        $nextConq = array_values(array_merge($curConq, $trulyFresh));
                        $uUpd = $pdo->prepare('UPDATE `users` SET `xp` = :xp, `conquistas` = :conq WHERE `id` = :uid');
                        $uUpd->execute([
                            ':xp' => $nextXp,
                            ':conq' => Database::encodeJsonArray($nextConq),
                            ':uid' => $userId,
                        ]);
                        $awardedPayload = [
                            'xp' => $realXpGain,
                            'achievements' => $trulyFresh,
                            'achievementDetails' => GameCatalog::mapAchievementDetails($trulyFresh),
                            'leveledUp' => GameCatalog::levelForXp($nextXp) > GameCatalog::levelForXp($prevXp),
                        ];
                    }
                }
            }

            $pdo->commit();
            return ['row' => $savedRow, 'awarded' => $awardedPayload];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
