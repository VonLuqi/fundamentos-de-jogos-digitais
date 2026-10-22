<?php
declare(strict_types=1);

namespace App\Services\Despertar;

/**
 * Fórmulas econômicas e avaliação de conquistas/códice de O Despertar
 * (`js/hades-despertar/core/formulas.js` + `api/_lib/despertar-achievements.js`).
 */
final class DespertarFormulas
{
    public static function generatorPriceAt(string $baseCost, int $owned, string $costMult = DespertarCatalog::GENERATOR_COST_MULT_BASE): string
    {
        return DespertarDecimal::money(DespertarDecimal::mulPow115($baseCost, $owned, $costMult));
    }

    public static function generatorBatchCost(string $baseCost, int $owned, int $count, string $costMult = DespertarCatalog::GENERATOR_COST_MULT_BASE): string
    {
        $safeCount = max(0, $count);
        if ($safeCount <= 0) {
            return DespertarDecimal::money('0');
        }
        return DespertarDecimal::money(DespertarDecimal::geometricSum115($baseCost, $owned, $safeCount, $costMult));
    }

    /**
     * @param array<int, string> $talentIds
     * @return array<string, mixed>
     */
    public static function talentEffects(array $talentIds = []): array
    {
        $owned = [];
        foreach ($talentIds as $id) {
            $k = (string) $id;
            if (isset(DespertarCatalog::TALENTS[$k])) {
                $owned[$k] = true;
            }
        }

        $mnemosyneMult = DespertarCatalog::MNEMOSYNE_MULT_BASE;
        if (isset($owned['juramento_eterno'])) {
            $mnemosyneMult = DespertarDecimal::mul($mnemosyneMult, DespertarCatalog::TALENT_JURAMENTO_ETERNO_MULT);
        }
        if (isset($owned['mnemosyne_profunda'])) {
            $mnemosyneMult = DespertarDecimal::mul($mnemosyneMult, DespertarCatalog::TALENT_MNEMOSYNE_PROFUNDA_MULT);
        }
        if (isset($owned['mnemosyne_tripla'])) {
            $mnemosyneMult = DespertarDecimal::mul($mnemosyneMult, DespertarCatalog::TALENT_MNEMOSYNE_TRIPLA_MULT);
        }

        $startingSouls = '0';
        if (isset($owned['memoria_das_sombras'])) {
            $startingSouls = DespertarDecimal::add($startingSouls, DespertarCatalog::STARTING_SOULS_MEMORY);
        }
        if (isset($owned['margem_generosa'])) {
            $startingSouls = DespertarDecimal::add($startingSouls, DespertarCatalog::STARTING_SOULS_MARGIN);
        }

        $shadeQty = 0;
        if (isset($owned['segundo_folego'])) {
            $shadeQty = max($shadeQty, DespertarCatalog::STARTING_SHADE_FOLEGO);
        }
        if (isset($owned['rebanho_despertado'])) {
            $shadeQty = max($shadeQty, DespertarCatalog::STARTING_SHADE_REBANHO);
        }

        $startingGenerators = [];
        if ($shadeQty > 0) {
            $startingGenerators['wandering_shade'] = $shadeQty;
        }
        if (isset($owned['matilha_cerberiana'])) {
            $startingGenerators['cerberian_hound'] = max(
                (int) ($startingGenerators['cerberian_hound'] ?? 0),
                DespertarCatalog::STARTING_HOUND_MATILHA
            );
        }
        if (isset($owned['forja_despertada'])) {
            $startingGenerators['phlegethon_forge'] = max(
                (int) ($startingGenerators['phlegethon_forge'] ?? 0),
                DespertarCatalog::STARTING_FORGE_DESPERTADA
            );
        }

        $offlineHours = isset($owned['noite_prolongada'])
            ? DespertarCatalog::OFFLINE_MAX_HOURS_TALENT
            : DespertarCatalog::OFFLINE_MAX_HOURS_BASE;
        if (isset($owned['pacto_do_silencio'])) {
            $offlineHours += DespertarCatalog::OFFLINE_EXTRA_HOURS_SILENCIO;
        }

        $softPrestigeStyxCount = 0;
        if (isset($owned['eco_do_styx'])) {
            $softPrestigeStyxCount = max($softPrestigeStyxCount, 1);
        }
        if (isset($owned['eco_ressonante'])) {
            $softPrestigeStyxCount = max($softPrestigeStyxCount, DespertarCatalog::ECO_STYX_RESSONANTE_COUNT);
        }

        return [
            'startingSouls' => $startingSouls,
            'mnemosyneMult' => $mnemosyneMult,
            'offlineHours' => $offlineHours,
            'offlineEfficiency' => isset($owned['veu_eficiente'])
                ? DespertarCatalog::OFFLINE_EFFICIENCY_TALENT
                : DespertarCatalog::OFFLINE_EFFICIENCY_BASE,
            'kSps' => isset($owned['foice_ancestral'])
                ? DespertarCatalog::CLICK_K_SPS_ANCESTRAL
                : DespertarCatalog::CLICK_K_SPS_BASE,
            'generatorCostMult' => isset($owned['favor_de_caronte'])
                ? DespertarCatalog::GENERATOR_COST_MULT_CHARON
                : DespertarCatalog::GENERATOR_COST_MULT_BASE,
            'startingGenerators' => $startingGenerators,
            'richAmort' => isset($owned['olho_da_curva']),
            'softPrestigeStyx' => $softPrestigeStyxCount > 0,
            'softPrestigeStyxCount' => $softPrestigeStyxCount,
            'mnemosyneGainBoost' => isset($owned['calice_da_memoria']),
        ];
    }

    /**
     * @param array<int, string> $verdictPurchases
     * @return array<string, mixed>
     */
    public static function verdictEffects(array $verdictPurchases = []): array
    {
        $seen = [];
        $clickMult = '1';
        $spsMult = '1';
        $offlineExtraHours = 0.0;
        $firstGeneratorCostMult = '1';

        foreach ($verdictPurchases as $rawId) {
            $id = (string) $rawId;
            if (isset($seen[$id]) || !isset(DespertarCatalog::VERDICT_SHOP[$id])) {
                continue;
            }
            $seen[$id] = true;
            $effects = DespertarCatalog::VERDICT_SHOP[$id]['effects'] ?? [];
            if (!empty($effects['clickMult'])) {
                $clickMult = DespertarDecimal::mul($clickMult, (string) $effects['clickMult']);
            }
            if (!empty($effects['spsMult'])) {
                $spsMult = DespertarDecimal::mul($spsMult, (string) $effects['spsMult']);
            }
            if (!empty($effects['offlineExtraHours'])) {
                $offlineExtraHours += (float) $effects['offlineExtraHours'];
            }
            if (!empty($effects['firstGeneratorCostMult'])) {
                $firstGeneratorCostMult = DespertarDecimal::mul($firstGeneratorCostMult, (string) $effects['firstGeneratorCostMult']);
            }
        }

        return [
            'clickMult' => $clickMult,
            'spsMult' => $spsMult,
            'offlineExtraHours' => $offlineExtraHours,
            'firstGeneratorCostMult' => $firstGeneratorCostMult,
        ];
    }

    /**
     * @param array<int, string> $talents
     * @param array<int, string> $verdictPurchases
     * @return array<string, mixed>
     */
    public static function economyEffects(array $talents = [], array $verdictPurchases = []): array
    {
        $t = self::talentEffects($talents);
        $v = self::verdictEffects($verdictPurchases);
        $t['offlineHours'] = (float) $t['offlineHours'] + (float) $v['offlineExtraHours'];
        $t['clickVerdictMult'] = $v['clickMult'];
        $t['spsVerdictMult'] = $v['spsMult'];
        $t['firstGeneratorCostMult'] = $v['firstGeneratorCostMult'];
        return $t;
    }

    /**
     * @param array<string, mixed>|string $upgradeOrId
     * @param array<string, mixed> $ctx
     */
    public static function meetsUpgradeRequirement(array|string $upgradeOrId, array $ctx = []): bool
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $upgrade = is_string($upgradeOrId) ? ($upgradesById[$upgradeOrId] ?? null) : $upgradeOrId;
        if (!$upgrade) {
            return false;
        }
        $req = $upgrade['requires'] ?? [];
        $owned = [];
        foreach (($ctx['upgrades'] ?? []) as $u) {
            $owned[(string) $u] = true;
        }
        if (!empty($req['upgradeId']) && !isset($owned[(string) $req['upgradeId']])) {
            return false;
        }
        if (!empty($req['allUpgradeIds']) && is_array($req['allUpgradeIds'])) {
            foreach ($req['allUpgradeIds'] as $uid) {
                if (!isset($owned[(string) $uid])) {
                    return false;
                }
            }
        }
        if (!empty($req['generatorId'])) {
            $genId = (string) $req['generatorId'];
            $haveQty = (int) (($ctx['generators'][$genId] ?? 0));
            if ($haveQty < (int) ($req['quantity'] ?? 0)) {
                return false;
            }
        }
        if (isset($req['minSouls'])) {
            if (DespertarDecimal::cmp($ctx['souls'] ?? '0', $req['minSouls']) < 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $ctx
     * @return array<int, string>
     */
    public static function pickEcoDoStyxUpgrades(int $count, array $ctx = []): array
    {
        $n = max(0, $count);
        $picked = [];
        $upgrades = is_array($ctx['upgrades'] ?? null) ? array_values($ctx['upgrades']) : [];
        $souls = (string) ($ctx['souls'] ?? '0');
        $generators = is_array($ctx['generators'] ?? null) ? $ctx['generators'] : [];

        for ($i = 0; $i < $n; $i++) {
            $owned = array_flip(array_map('strval', $upgrades));
            $best = null;
            foreach (DespertarCatalog::UPGRADES as $upgrade) {
                $uid = $upgrade['id'];
                if (isset($owned[$uid])) {
                    continue;
                }
                if (!self::meetsUpgradeRequirement($upgrade, [
                    'souls' => $souls,
                    'generators' => $generators,
                    'upgrades' => $upgrades,
                ])) {
                    continue;
                }
                if ($best === null) {
                    $best = $upgrade;
                    continue;
                }
                $costCmp = DespertarDecimal::cmp($upgrade['cost'], $best['cost']);
                if ($costCmp < 0 || ($costCmp === 0 && strcmp($uid, $best['id']) < 0)) {
                    $best = $upgrade;
                }
            }
            if (!$best) {
                break;
            }
            $picked[] = $best['id'];
            $upgrades[] = $best['id'];
        }
        return $picked;
    }

    /**
     * @param array<int, string> $upgradeIds
     */
    public static function generatorUpgradeMult(string $generatorId, array $upgradeIds = []): string
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $mult = '1';
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if (!$u) {
                continue;
            }
            if ($u['kind'] === 'generatorMult' && ($u['generatorId'] ?? '') === $generatorId) {
                $mult = DespertarDecimal::mul($mult, $u['factor']);
            } elseif ($u['kind'] === 'allGeneratorsMult') {
                $mult = DespertarDecimal::mul($mult, $u['factor']);
            }
        }
        return $mult;
    }

    /**
     * @param array<int, string> $upgradeIds
     */
    public static function clickMultiplier(array $upgradeIds = []): string
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $mult = DespertarCatalog::CLICK_MULT_BASE;
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if ($u && $u['kind'] === 'clickMult') {
                $mult = DespertarDecimal::mul($mult, $u['factor']);
            }
        }
        return $mult;
    }

    /**
     * @param array<int, string> $upgradeIds
     */
    public static function styxClickKSps(array $upgradeIds = []): string
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $k = '0';
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if ($u && $u['kind'] === 'clickKSps') {
                $k = DespertarDecimal::add($k, $u['factor']);
            }
        }
        return $k;
    }

    /**
     * @param array<int, string> $talentIds
     */
    public static function prestigeBonus(string $obols, array $talentIds = []): string
    {
        $eff = self::talentEffects($talentIds);
        $bonus = DespertarDecimal::mul(
            DespertarDecimal::mul($obols !== '' ? $obols : '0', DespertarCatalog::OBOL_BONUS_PER),
            $eff['mnemosyneMult']
        );
        return DespertarDecimal::add('1', $bonus);
    }

    public static function lineSPS(int $qty, int $shiny, int $gold, string $baseRate, string $upgradeMult): string
    {
        $n = max(0, $qty);
        if ($n <= 0) {
            return '0';
        }
        $goldN = max(0, min($n, $gold));
        $shinyN = max(0, min($n - $goldN, $shiny));
        $normal = $n - $shinyN - $goldN;

        $unit = DespertarDecimal::mul($baseRate, $upgradeMult);
        $partNormal = DespertarDecimal::mul((string) $normal, $unit);
        $partShiny = DespertarDecimal::mul(DespertarDecimal::mul((string) $shinyN, $unit), DespertarCatalog::NEGATIVO_MULT);
        $partGold = DespertarDecimal::mul(DespertarDecimal::mul((string) $goldN, $unit), DespertarCatalog::GOLD_MULT);

        return DespertarDecimal::add(DespertarDecimal::add($partNormal, $partShiny), $partGold);
    }

    /**
     * @param array<string, mixed> $opts
     */
    public static function calculateTotalSPS(array $opts = []): string
    {
        $generators = is_array($opts['generators'] ?? null) ? $opts['generators'] : [];
        $upgrades = is_array($opts['upgrades'] ?? null) ? $opts['upgrades'] : [];
        $talents = is_array($opts['talents'] ?? null) ? $opts['talents'] : [];
        $obols = (string) ($opts['obols'] ?? '0');
        $verdictPurchases = is_array($opts['verdictPurchases'] ?? null) ? $opts['verdictPurchases'] : [];
        $shinyCounts = is_array($opts['shinyCounts'] ?? null) ? $opts['shinyCounts'] : [];
        $goldCounts = is_array($opts['goldCounts'] ?? null) ? $opts['goldCounts'] : [];

        $sum = '0';
        foreach (DespertarCatalog::GENERATORS as $def) {
            $id = $def['id'];
            $qty = (int) ($generators[$id] ?? 0);
            if ($qty <= 0) {
                continue;
            }
            $upMult = self::generatorUpgradeMult($id, $upgrades);
            $shiny = (int) ($shinyCounts[$id] ?? 0);
            $gold = (int) ($goldCounts[$id] ?? 0);
            $line = self::lineSPS($qty, $shiny, $gold, $def['baseRate'], $upMult);
            $sum = DespertarDecimal::add($sum, $line);
        }

        $withPrestige = DespertarDecimal::mul($sum, self::prestigeBonus($obols, $talents));
        $econ = self::economyEffects($talents, $verdictPurchases);
        return DespertarDecimal::mul($withPrestige, (string) $econ['spsVerdictMult']);
    }

    /**
     * @param array<string, mixed> $opts
     */
    public static function clickPower(array $opts = []): string
    {
        $sps = isset($opts['sps']) && $opts['sps'] !== null
            ? (string) $opts['sps']
            : self::calculateTotalSPS($opts);
        $upgrades = is_array($opts['upgrades'] ?? null) ? $opts['upgrades'] : [];
        $talents = is_array($opts['talents'] ?? null) ? $opts['talents'] : [];
        $verdictPurchases = is_array($opts['verdictPurchases'] ?? null) ? $opts['verdictPurchases'] : [];

        $econ = self::economyEffects($talents, $verdictPurchases);
        $clickMult = DespertarDecimal::mul(self::clickMultiplier($upgrades), (string) $econ['clickVerdictMult']);
        $kSps = DespertarDecimal::add((string) $econ['kSps'], self::styxClickKSps($upgrades));

        $flatPart = DespertarDecimal::mul(
            DespertarDecimal::add(DespertarCatalog::CLICK_BASE, DespertarCatalog::CLICK_FLAT_BASE),
            $clickMult
        );
        $spsPart = DespertarDecimal::mul($kSps, $sps);
        return DespertarDecimal::add($flatPart, $spsPart);
    }

    public static function obolsFromRunSouls(string $runSouls, int $prestigeCount = 0): string
    {
        $p = DespertarDecimal::toScaled($runSouls !== '' ? $runSouls : '0');
        $q = DespertarDecimal::toScaled(DespertarCatalog::PRESTIGE_RUN_DIVISOR);
        if (DespertarDecimal::intCmp($p, '0') <= 0 || DespertarDecimal::intCmp($q, '0') <= 0) {
            return '0';
        }
        $raw = DespertarDecimal::floorSqrtRatio($p, $q);
        if (DespertarDecimal::intCmp($raw, '0') <= 0) {
            return '0';
        }
        $denom = (string) (1 + max(0, $prestigeCount));
        return DespertarDecimal::intDiv($raw, $denom);
    }

    /**
     * @param array<int, string> $talents
     */
    public static function mnemosyneFromObolsGain(string $obolsGain, array $talents = []): string
    {
        $baseObols = DespertarDecimal::toBigIntFloor($obolsGain !== '' ? $obolsGain : '0');
        if (DespertarDecimal::intCmp($baseObols, '0') <= 0) {
            return '0';
        }
        $gain = DespertarDecimal::intDiv($baseObols, '2');
        $owned = array_flip(array_map('strval', $talents));
        if (isset($owned['calice_da_memoria']) && DespertarDecimal::intCmp($gain, '0') > 0) {
            $gain = DespertarDecimal::intDiv(
                DespertarDecimal::intMul($gain, DespertarCatalog::TALENT_CALICE_MNEMOSYNE_NUM),
                DespertarCatalog::TALENT_CALICE_MNEMOSYNE_DEN
            );
        }
        return $gain;
    }

    public static function canPrestige(string $runSouls, int $prestigeCount = 0): bool
    {
        return DespertarDecimal::cmp(self::obolsFromRunSouls($runSouls, $prestigeCount), '0') > 0;
    }

    /**
     * @param array<int, string> $talents
     * @return array{obolsGain: string, mnemosyneGain: string, unlocked: bool}
     */
    public static function prestigePreview(string $runSouls, int $prestigeCount = 0, array $talents = []): array
    {
        $obolsGain = self::obolsFromRunSouls($runSouls, $prestigeCount);
        $unlocked = DespertarDecimal::cmp($obolsGain, '0') > 0;
        return [
            'obolsGain' => $obolsGain,
            'mnemosyneGain' => $unlocked ? self::mnemosyneFromObolsGain($obolsGain, $talents) : '0',
            'unlocked' => $unlocked,
        ];
    }

    /**
     * Soma dos custos de talentos do Panteão já comprados.
     *
     * @param array<int, string> $talents
     */
    public static function talentSpend(array $talents): string
    {
        $spent = '0';
        foreach ($talents as $tid) {
            $cost = DespertarCatalog::TALENTS[(string) $tid]['cost'] ?? null;
            if ($cost === null) {
                continue;
            }
            $spent = DespertarDecimal::intAdd($spent, DespertarDecimal::toBigIntFloor((string) $cost));
        }
        return $spent;
    }

    /**
     * Reconstrói óbolos/essência sob as fórmulas atuais a partir de Catábases + almas de vida.
     * Só reduz carteiras (nunca aumenta) — heal do rebalance Lethe (divisor 4e9 + /(1+k) + essência 2:1).
     *
     * @param array<string, mixed> $state canonical rowToCanonical
     * @return array{
     *   changed: bool,
     *   skipped: bool,
     *   reason: string,
     *   prestigeCount: int,
     *   avgRunSouls: string,
     *   obolsBefore: string,
     *   obolsAfter: string,
     *   mnemosyneBefore: string,
     *   mnemosyneAfter: string,
     *   prestigeBonusBefore: string,
     *   prestigeBonusAfter: string,
     *   talentSpend: string,
     *   earnedEssenceTarget: string
     * }
     */
    public static function planLetheWalletRebalance(array $state, bool $force = false): array
    {
        $milestones = is_array($state['milestones'] ?? null) ? $state['milestones'] : [];
        $obolsBefore = DespertarDecimal::money(DespertarDecimal::decimalString($state['obols'] ?? '0'));
        $mnemosyneBefore = DespertarDecimal::money(DespertarDecimal::decimalString($state['mnemosyne'] ?? '0'));
        $talents = is_array($state['talents'] ?? null) ? array_values(array_map('strval', $state['talents'])) : [];
        $prestigeCount = max(0, (int) ($state['prestigeCount'] ?? 0));
        $bonusBefore = self::prestigeBonus($obolsBefore, $talents);
        $spend = self::talentSpend($talents);

        $base = [
            'changed' => false,
            'skipped' => false,
            'reason' => '',
            'prestigeCount' => $prestigeCount,
            'avgRunSouls' => '0.00',
            'obolsBefore' => $obolsBefore,
            'obolsAfter' => $obolsBefore,
            'mnemosyneBefore' => $mnemosyneBefore,
            'mnemosyneAfter' => $mnemosyneBefore,
            'prestigeBonusBefore' => $bonusBefore,
            'prestigeBonusAfter' => $bonusBefore,
            'talentSpend' => $spend,
            'earnedEssenceTarget' => '0',
        ];

        if (!$force && !empty($milestones[DespertarCatalog::LETHE_REBALANCE_MILESTONE])) {
            return array_merge($base, ['skipped' => true, 'reason' => 'already_rebalanced']);
        }

        if ($prestigeCount <= 0 && DespertarDecimal::cmp($obolsBefore, '0') <= 0) {
            return array_merge($base, ['skipped' => true, 'reason' => 'no_lethe_progress']);
        }

        $lifetime = DespertarDecimal::money(DespertarDecimal::decimalString($state['lifetimeSouls'] ?? '0'));
        $runSouls = DespertarDecimal::money(DespertarDecimal::decimalString($state['runSouls'] ?? '0'));
        $completedLifetime = DespertarDecimal::cmp($lifetime, $runSouls) > 0
            ? DespertarDecimal::sub($lifetime, $runSouls)
            : '0.00';

        $avgRun = '0.00';
        $targetObolsInt = '0';
        $earnedEssence = '0';

        if ($prestigeCount > 0) {
            if (DespertarDecimal::cmp($completedLifetime, '0') > 0) {
                $avgRun = DespertarDecimal::money(
                    DespertarDecimal::div($completedLifetime, (string) $prestigeCount)
                );
            } else {
                // Fallback: inverte óbolos legados (divisor antigo, sem /(1+k)).
                $obolsInt = DespertarDecimal::toBigIntFloor($obolsBefore);
                $rawLegacy = DespertarDecimal::intDiv($obolsInt, (string) $prestigeCount);
                // sqrt(1e9/4e9) = 1/2 → raw novo ≈ raw legado / 2
                $rawNew = DespertarDecimal::intDiv($rawLegacy, '2');
                // Equivalente a runSouls tal que floor(sqrt(run/4e9)) ≈ rawNew
                // run ≈ rawNew² × 4e9 — útil só para report; óbolos usam soma direta.
                for ($k = 0; $k < $prestigeCount; $k++) {
                    $gain = DespertarDecimal::intDiv($rawNew, (string) (1 + $k));
                    $targetObolsInt = DespertarDecimal::intAdd($targetObolsInt, $gain);
                    $earnedEssence = DespertarDecimal::intAdd(
                        $earnedEssence,
                        DespertarDecimal::intDiv($gain, '2')
                    );
                }
                $avgRun = '0.00';
            }

            if (DespertarDecimal::cmp($avgRun, '0') > 0) {
                $targetObolsInt = '0';
                $earnedEssence = '0';
                for ($k = 0; $k < $prestigeCount; $k++) {
                    $gain = DespertarDecimal::toBigIntFloor(self::obolsFromRunSouls($avgRun, $k));
                    $targetObolsInt = DespertarDecimal::intAdd($targetObolsInt, $gain);
                    // Essência histórica na taxa 2:1 (sem Cálice — evita inflar quem comprou tarde).
                    $earnedEssence = DespertarDecimal::intAdd(
                        $earnedEssence,
                        DespertarDecimal::intDiv($gain, '2')
                    );
                }
            }
        } elseif (DespertarDecimal::cmp($obolsBefore, '0') > 0) {
            // Óbolos sem Catábase (concessão/debug): metade para espelhar divisor ×4.
            $targetObolsInt = DespertarDecimal::intDiv(DespertarDecimal::toBigIntFloor($obolsBefore), '2');
            $earnedEssence = DespertarDecimal::intDiv($targetObolsInt, '2');
        }

        $targetObols = DespertarDecimal::money($targetObolsInt . '.00');
        // Nunca aumentar óbolos no heal.
        if (DespertarDecimal::cmp($targetObols, $obolsBefore) > 0) {
            $targetObols = $obolsBefore;
        }

        $currentEarnedEst = DespertarDecimal::intAdd(
            DespertarDecimal::toBigIntFloor($mnemosyneBefore),
            $spend
        );
        $targetEarned = $earnedEssence;
        if (DespertarDecimal::intCmp($targetEarned, $currentEarnedEst) > 0) {
            $targetEarned = $currentEarnedEst;
        }
        $walletInt = DespertarDecimal::intCmp($targetEarned, $spend) > 0
            ? DespertarDecimal::intSub($targetEarned, $spend)
            : '0';
        $targetMnemosyne = DespertarDecimal::money($walletInt . '.00');

        $bonusAfter = self::prestigeBonus($targetObols, $talents);
        $changed = DespertarDecimal::cmp($targetObols, $obolsBefore) !== 0
            || DespertarDecimal::cmp($targetMnemosyne, $mnemosyneBefore) !== 0;

        return [
            'changed' => $changed,
            'skipped' => false,
            'reason' => $changed ? 'rebalanced' : 'already_aligned',
            'prestigeCount' => $prestigeCount,
            'avgRunSouls' => $avgRun,
            'obolsBefore' => $obolsBefore,
            'obolsAfter' => $targetObols,
            'mnemosyneBefore' => $mnemosyneBefore,
            'mnemosyneAfter' => $targetMnemosyne,
            'prestigeBonusBefore' => $bonusBefore,
            'prestigeBonusAfter' => $bonusAfter,
            'talentSpend' => $spend,
            'earnedEssenceTarget' => $targetEarned,
        ];
    }

    public static function theoreticalMaxGain(string $sps, string $clickPower, float $deltaSeconds): string
    {
        $safeDt = is_finite($deltaSeconds) && $deltaSeconds > 0
            ? number_format($deltaSeconds, 6, '.', '')
            : '0';
        $maxClicks = DespertarDecimal::mul((string) DespertarCatalog::CLICK_CAP_PER_SECOND, $safeDt);
        $fromSps = DespertarDecimal::mul($sps, $safeDt);
        $fromClicks = DespertarDecimal::mul($clickPower, $maxClicks);
        return DespertarDecimal::mul(
            DespertarDecimal::add($fromSps, $fromClicks),
            DespertarCatalog::SYNC_GAIN_TOLERANCE
        );
    }

    /**
     * @param array<string, mixed> $generators
     * @param array<int, string> $upgrades
     * @param array<int, string> $talents
     * @return array<int, string>
     */
    public static function unknownCatalogIds(array $generators = [], array $upgrades = [], array $talents = []): array
    {
        $unknown = [];
        $genById = DespertarCatalog::generatorsById();
        $upById = DespertarCatalog::upgradesById();

        foreach (array_keys($generators) as $id) {
            if (!isset($genById[(string) $id])) {
                $unknown[] = (string) $id;
            }
        }
        foreach ($upgrades as $id) {
            if (!isset($upById[(string) $id])) {
                $unknown[] = (string) $id;
            }
        }
        foreach ($talents as $id) {
            if (!isset(DespertarCatalog::TALENTS[(string) $id])) {
                $unknown[] = (string) $id;
            }
        }
        return $unknown;
    }

    // -------------------------------------------------------------------------
    // Códice e Conquistas de O Despertar (`api/_lib/despertar-achievements.js`)
    // -------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $state
     * @return array<int, string>
     */
    public static function computeEligibleEduLogs(array $state, bool $syncOk = false): array
    {
        $generators = is_array($state['generators'] ?? null) ? $state['generators'] : [];
        $upgrades = is_array($state['upgrades'] ?? null) ? $state['upgrades'] : [];
        $milestones = is_array($state['milestones'] ?? null) ? $state['milestones'] : [];

        $ownedAny = false;
        $ownedFive = false;
        foreach ($generators as $qty) {
            $n = (int) $qty;
            if ($n >= 1) {
                $ownedAny = true;
            }
            if ($n >= 5) {
                $ownedFive = true;
            }
        }

        $lifetime = (string) ($state['lifetimeSouls'] ?? '0');
        $souls = (string) ($state['souls'] ?? '0');
        $runSouls = (string) ($state['runSouls'] ?? '0');
        $prestigeCount = (int) ($state['prestigeCount'] ?? 0);
        $obols = (string) ($state['obols'] ?? '0');
        $mnemosyne = (string) ($state['mnemosyne'] ?? '0');
        $verdictPurchases = is_array($state['verdictPurchases'] ?? null) ? $state['verdictPurchases'] : [];
        $verdicts = (int) ($state['verdicts'] ?? 0);
        $clickCount = (int) ($state['clickCount'] ?? 0);

        $ritualReady = self::canPrestige($runSouls, $prestigeCount);
        $letheOpen = $prestigeCount >= 1
            || DespertarDecimal::cmp($obols, '0') > 0
            || DespertarDecimal::cmp($mnemosyne, '0') > 0
            || $ritualReady
            || DespertarDecimal::cmp($runSouls, DespertarCatalog::LETHE_PREVIEW_RUN_SOULS) >= 0;

        $eligible = [];
        if (DespertarDecimal::cmp($lifetime, '1') >= 0) {
            $eligible['log_input'] = true;
        }
        if (DespertarDecimal::cmp($lifetime, '10') >= 0 || DespertarDecimal::cmp($souls, '10') >= 0) {
            $eligible['log_state'] = true;
        }
        if ($ownedAny || DespertarDecimal::cmp($lifetime, '1') >= 0) {
            $eligible['log_loop'] = true;
        }
        if ($prestigeCount >= 1 || !empty($milestones['delta'])) {
            $eligible['log_delta'] = true;
        }
        if ($ownedAny) {
            $eligible['log_generator'] = true;
        }
        if ($ownedFive) {
            $eligible['log_curve'] = true;
        }
        if (((int) ($generators['cerberian_hound'] ?? 0)) >= 1 || !empty($milestones['amort'])) {
            $eligible['log_amort'] = true;
        }
        if (count($upgrades) >= 1) {
            $eligible['log_upgrade'] = true;
        }
        if (DespertarDecimal::cmp($runSouls, DespertarCatalog::LETHE_PREVIEW_RUN_SOULS) >= 0 || $prestigeCount >= 1) {
            $eligible['log_wall'] = true;
        }
        if ($letheOpen) {
            $eligible['log_lethe_unlock'] = true;
        }
        if ($ritualReady || $prestigeCount >= 1) {
            $eligible['log_lethe_ritual'] = true;
        }
        if ($ownedAny || DespertarDecimal::cmp($souls, DespertarCatalog::STYX_UNLOCK_SOULS) >= 0) {
            $eligible['log_styx_open'] = true;
        }
        if ($prestigeCount >= 1) {
            $eligible['log_prestige'] = true;
        }
        if ($syncOk) {
            $eligible['log_authority'] = true;
        }
        if (!empty($milestones['offline']) || DespertarDecimal::cmp($lifetime, '1000') >= 0) {
            $eligible['log_offline'] = true;
        }
        if (count($verdictPurchases) >= 1) {
            $eligible['log_juizo'] = true;
        }
        if ($clickCount >= 25 || !empty($milestones['reap'])) {
            $eligible['log_reap_power'] = true;
        }
        if ($ownedAny || !empty($milestones['buyModes'])) {
            $eligible['log_buy_modes'] = true;
        }
        if (count($upgrades) >= 1 || $ownedAny || DespertarDecimal::cmp($souls, DespertarCatalog::STYX_UNLOCK_SOULS) >= 0) {
            $eligible['log_sealed_juramentos'] = true;
        }
        if ($verdicts >= 1 || count($verdictPurchases) >= 1) {
            $eligible['log_verdicts_milestone'] = true;
        }
        if ($prestigeCount >= 1 || DespertarDecimal::cmp($obols, '0') > 0) {
            $eligible['log_obols_bonus'] = true;
        }

        $out = [];
        foreach (DespertarCatalog::EDU_LOG_IDS as $id) {
            if (isset($eligible[$id])) {
                $out[] = $id;
            }
        }
        return $out;
    }

    /**
     * @param array<int, string> $claimed
     * @param array<string, mixed> $state
     * @return array<int, string>
     */
    public static function sanitizeEduLogsSeen(array $claimed, array $state, bool $syncOk = false): array
    {
        $eligibleSet = array_flip(self::computeEligibleEduLogs($state, $syncOk));
        $claimedSet = array_flip(array_map('strval', $claimed));
        $out = [];
        foreach (DespertarCatalog::EDU_LOG_IDS as $id) {
            if (isset($claimedSet[$id]) && isset($eligibleSet[$id])) {
                $out[] = $id;
            }
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $state
     * @param array<int, string> $unlocked
     * @return array<int, string>
     */
    public static function evaluateDespertarAchievementIds(array $state, array $unlocked = [], bool $syncOk = true): array
    {
        $unlockedSet = array_flip(array_map('strval', $unlocked));
        $generators = is_array($state['generators'] ?? null) ? $state['generators'] : [];
        $upgrades = is_array($state['upgrades'] ?? null) ? $state['upgrades'] : [];
        $talents = is_array($state['talents'] ?? null) ? $state['talents'] : [];
        $milestones = is_array($state['milestones'] ?? null) ? $state['milestones'] : [];
        $prestigeCount = (int) ($state['prestigeCount'] ?? 0);
        $shinyCounts = is_array($state['shinyCounts'] ?? null) ? $state['shinyCounts'] : [];
        $goldCounts = is_array($state['goldCounts'] ?? null) ? $state['goldCounts'] : [];
        $verdictPurchases = is_array($state['verdictPurchases'] ?? null) ? $state['verdictPurchases'] : [];

        $sps = self::calculateTotalSPS([
            'generators' => $generators,
            'upgrades' => $upgrades,
            'talents' => $talents,
            'obols' => (string) ($state['obols'] ?? '0'),
            'verdictPurchases' => $verdictPurchases,
            'shinyCounts' => $shinyCounts,
            'goldCounts' => $goldCounts,
        ]);

        $earned = [];
        $take = static function (string $id, bool $cond) use (&$earned, $unlockedSet): void {
            if (!isset($unlockedSet[$id]) && $cond) {
                $earned[] = $id;
            }
        };

        $lifetime = (string) ($state['lifetimeSouls'] ?? '0');
        $take('despertar_primeira_alma', DespertarDecimal::cmp($lifetime, '1') >= 0);
        $take('despertar_primeira_sombra', ((int) ($generators['wandering_shade'] ?? 0)) >= 1 || !empty($milestones['shade']));
        $take('despertar_automacao', DespertarDecimal::cmp($sps, '1') >= 0);
        $take('despertar_forja', ((int) ($generators['phlegethon_forge'] ?? 0)) >= 1 || !empty($milestones['forge']));
        $take('despertar_trono', ((int) ($generators['obsidian_throne'] ?? 0)) >= 1 || !empty($milestones['throne']));
        $take('despertar_catabase', $prestigeCount >= 1);
        $take('despertar_mnemosyne', count($talents) >= 1);

        $allGens = true;
        foreach (DespertarCatalog::GENERATORS as $def) {
            if (((int) ($generators[$def['id']] ?? 0)) < 1) {
                $allGens = false;
                break;
            }
        }
        $take('despertar_soberania', $allGens);

        $juizoBest = (int) ($state['juizoBestStreak'] ?? 0);
        foreach (DespertarCatalog::DESPERTAR_JUIZO_STREAK_THRESHOLDS as $id => $threshold) {
            $take($id, $juizoBest >= $threshold);
        }
        $take('despertar_veredito', count($verdictPurchases) >= 1);

        $take('despertar_cem_almas', DespertarDecimal::cmp($lifetime, '100') >= 0);
        $take('despertar_mil_almas', DespertarDecimal::cmp($lifetime, '1000') >= 0);
        $take('despertar_milhao', DespertarDecimal::cmp($lifetime, '1000000') >= 0);
        $take('despertar_styx_primeiro', count($upgrades) >= 1);
        $take('despertar_styx_cinco', count($upgrades) >= 5);

        $shinySum = array_sum(array_map('intval', $shinyCounts));
        $goldSum = array_sum(array_map('intval', $goldCounts));
        $take('despertar_shiny', $shinySum >= 1);
        $take('despertar_gold', $goldSum >= 1);
        $take('despertar_catabase_3', $prestigeCount >= 3);

        $ownedVerdictSet = array_flip(array_map('strval', $verdictPurchases));
        $fullBench = true;
        foreach (array_keys(DespertarCatalog::VERDICT_SHOP) as $vid) {
            if (!isset($ownedVerdictSet[$vid])) {
                $fullBench = false;
                break;
            }
        }
        $take('despertar_bancada_cheia', $fullBench);
        $take('despertar_paciencia', !empty($milestones['offline']));

        $eligible = self::computeEligibleEduLogs($state, $syncOk);
        $seen = self::sanitizeEduLogsSeen($state['eduLogsSeen'] ?? [], $state, $syncOk);
        $totalLogs = count(DespertarCatalog::EDU_LOG_IDS);
        $take('despertar_arquiteto_do_loop', count($eligible) === $totalLogs && count($seen) === $totalLogs);

        return $earned;
    }
}
