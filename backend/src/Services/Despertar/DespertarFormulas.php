<?php
declare(strict_types=1);

namespace App\Services\Despertar;

use App\Core\GameCatalog;

if (!class_exists(GameCatalog::class)) {
    require_once dirname(__DIR__, 2) . '/Core/GameCatalog.php';
}

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
     * Fase F8 — Reembolso exato ao vender `count` unidades quando se possui `owned` unidades:
     * Referência = custo das unidades `owned - count` até `owned - 1`, multiplicado por `refundRate`
     * (`0.25` base, ou `0.50` com a aura `abalo_do_tartaro`).
     */
    public static function generatorSellRefund(
        string $baseCost,
        int $owned,
        int $count,
        string $costMult = DespertarCatalog::GENERATOR_COST_MULT_BASE,
        string $refundRate = DespertarCatalog::GENERATOR_SELL_REFUND_BASE
    ): string {
        $currentOwned = max(0, $owned);
        $safeCount = min($currentOwned, max(0, $count));
        if ($safeCount <= 0 || $currentOwned <= 0) {
            return DespertarDecimal::money('0');
        }
        $startOwned = $currentOwned - $safeCount;
        $refBatch = self::generatorBatchCost($baseCost, $startOwned, $safeCount, $costMult);
        return DespertarDecimal::money(DespertarDecimal::mul($refBatch, $refundRate !== '' ? $refundRate : DespertarCatalog::GENERATOR_SELL_REFUND_BASE));
    }

    /**
     * Fase F8 — Multiplicador de custo específico de um gerador considerando `fortune_100` (−1%),
     * `fortune_gen_{id}` (−7%), Rei Saturno (−1%/lv) e `contrato_de_hermes` (−2%).
     *
     * @param array<int, string> $upgrades
     * @param array<string, mixed> $seasons
     */
    public static function generatorCostMultForId(?string $generatorId = null, string $baseCostMult = DespertarCatalog::GENERATOR_COST_MULT_BASE, array $upgrades = [], array $seasons = []): string
    {
        $owned = array_flip(array_map('strval', $upgrades));
        $mult = $baseCostMult !== '' ? $baseCostMult : DespertarCatalog::GENERATOR_COST_MULT_BASE;
        if (isset($owned['fortune_100'])) {
            $mult = DespertarDecimal::mul($mult, DespertarCatalog::FORTUNE_100_COST_MULT);
        }
        if ($generatorId !== null && $generatorId !== '') {
            $lineId = 'fortune_gen_' . $generatorId;
            if (isset($owned[$lineId])) {
                $mult = DespertarDecimal::mul($mult, DespertarCatalog::FORTUNE_LINE_COST_MULT);
            }
        }
        $saturnLv = max(0, min(DespertarCatalog::SATURN_KING_MAX_LEVEL, (int) ($seasons['saturnKingLevel'] ?? 0)));
        if ($saturnLv > 0) {
            $saturnDisc = DespertarDecimal::sub('1', DespertarDecimal::mul(DespertarCatalog::SATURN_KING_DISCOUNT_PER_LEVEL, (string) $saturnLv));
            $mult = DespertarDecimal::mul($mult, $saturnDisc);
        }
        if (isset($owned['contrato_de_hermes'])) {
            $mult = DespertarDecimal::mul($mult, DespertarCatalog::HERMES_CONTRACT_COST_MULT);
        }
        return $mult;
    }

    /**
     * Fase F8 — Custo efetivo de um juramento do Styx após descontos de `fortune_101` (−7%)
     * e Rei Saturno (−1% por nível).
     *
     * @param array<int, string> $upgrades
     * @param array<string, mixed> $seasons
     */
    /**
     * @param array<int, string> $upgrades
     * @param array<string, mixed> $seasons
     * @param array<int, string> $talents
     * @param array<string, mixed>|null $upgradeDef
     */
    public static function upgradeEffectiveCost(
        string $baseCost,
        array $upgrades = [],
        array $seasons = [],
        array $talents = [],
        ?array $upgradeDef = null
    ): string {
        $owned = array_flip(array_map('strval', $upgrades));
        $mult = '1';
        if (isset($owned['fortune_101'])) {
            $mult = DespertarDecimal::mul($mult, DespertarCatalog::FORTUNE_101_UPGRADE_COST_MULT);
        }
        $saturnLv = max(0, min(DespertarCatalog::SATURN_KING_MAX_LEVEL, (int) ($seasons['saturnKingLevel'] ?? 0)));
        if ($saturnLv > 0) {
            $saturnDisc = DespertarDecimal::sub('1', DespertarDecimal::mul(DespertarCatalog::SATURN_KING_DISCOUNT_PER_LEVEL, (string) $saturnLv));
            $mult = DespertarDecimal::mul($mult, $saturnDisc);
        }
        $tFx = self::talentEffects($talents);
        if (isset($tFx['upgradeCostMult']) && DespertarDecimal::cmp((string) $tFx['upgradeCostMult'], '1') !== 0) {
            $mult = DespertarDecimal::mul($mult, (string) $tFx['upgradeCostMult']);
        }
        $kind = (string) ($upgradeDef['kind'] ?? '');
        if (!empty($tFx['kittenUpgradeDiscount']) && ($kind === 'veilMult' || $kind === 'kittenMult')) {
            $mult = DespertarDecimal::mul($mult, '0.9');
        }
        if (DespertarDecimal::cmp($mult, '1') === 0) {
            return DespertarDecimal::money($baseCost);
        }
        return DespertarDecimal::money(DespertarDecimal::mul($baseCost, $mult));
    }

    /**
     * @param array<int, string> $talentIds
     * @return array<string, mixed>
     */
    /**
     * Aplica `effects` do catálogo (data-driven).
     * Regras: startingSouls soma; mnemosyneMult produto; kSps/offlineEfficiency max;
     * generatorCostMult min; offlineHours max + offlineExtraHours soma;
     * startingGeneratorId/qty max-rule; startingGeneratorBonus soma; flags OR;
     * softPrestigeStyxCount max; mnemosyneGainMult produto.
     *
     * @param array<int, string> $talentIds
     * @return array<string, mixed>
     */
    public static function talentEffects(array $talentIds = []): array
    {
        $mnemosyneMult = DespertarCatalog::MNEMOSYNE_MULT_BASE;
        $startingSouls = '0';
        $offlineHours = DespertarCatalog::OFFLINE_MAX_HOURS_BASE;
        $offlineExtra = 0;
        $offlineEfficiency = DespertarCatalog::OFFLINE_EFFICIENCY_BASE;
        $offlineRate = '0';
        $kSps = DespertarCatalog::CLICK_K_SPS_BASE;
        $generatorCostMult = DespertarCatalog::GENERATOR_COST_MULT_BASE;
        $upgradeCostMult = '1';
        $softPrestigeStyxCount = 0;
        $mnemosyneGainMult = '1';
        $permanentSlot = 0;
        $synergyVolUnlock = 0;
        $shimmerLuckMult = '1';
        $prestigeEffectMult = '1';
        $clickTalentMult = '1';
        $allGeneratorsMult = '1';
        $unshackleFingers = false;
        $unshackledGenerators = [];
        $startingGenerators = [];
        $generatorBonus = [];
        $cosmetics = [];
        $richAmort = false;
        $nectarReserveBonus = false;
        $nectarFrenzyUnlock = false;
        $dragonUnlock = false;
        $seasonSwitcherUnlock = false;
        $goldenSwitchUnlock = false;
        $buyAllUnlock = false;
        $vaultUnlock = false;
        $labelPrinter = false;
        $kittenVeilFactor = '0';
        $kittenUpgradeDiscount = false;
        $catLadies = false;
        $milkhelpServants = false;
        $leechSpawnMult = '1';
        $leechCapBonus = 0;
        $leechPayoutMult = '1';
        $researchDurationMult = '1';
        $leechDigestVisible = false;

        foreach ($talentIds as $rawId) {
            $k = (string) $rawId;
            $talent = DespertarCatalog::TALENTS[$k] ?? null;
            if ($talent === null) {
                continue;
            }
            $fx = is_array($talent['effects'] ?? null) ? $talent['effects'] : [];

            if (isset($fx['startingSouls'])) {
                $startingSouls = DespertarDecimal::add($startingSouls, (string) $fx['startingSouls']);
            }
            if (isset($fx['mnemosyneMult'])) {
                $mnemosyneMult = DespertarDecimal::mul($mnemosyneMult, (string) $fx['mnemosyneMult']);
            }
            if (isset($fx['mnemosyneGainMult'])) {
                $mnemosyneGainMult = DespertarDecimal::mul($mnemosyneGainMult, (string) $fx['mnemosyneGainMult']);
            }
            if (isset($fx['kSps']) && DespertarDecimal::cmp((string) $fx['kSps'], $kSps) > 0) {
                $kSps = (string) $fx['kSps'];
            }
            if (isset($fx['generatorCostMult'])
                && DespertarDecimal::cmp((string) $fx['generatorCostMult'], $generatorCostMult) < 0) {
                $generatorCostMult = (string) $fx['generatorCostMult'];
            }
            if (isset($fx['upgradeCostMult'])) {
                $upgradeCostMult = DespertarDecimal::mul($upgradeCostMult, (string) $fx['upgradeCostMult']);
            }
            if (isset($fx['offlineEfficiency'])
                && DespertarDecimal::cmp((string) $fx['offlineEfficiency'], $offlineEfficiency) > 0) {
                $offlineEfficiency = (string) $fx['offlineEfficiency'];
            }
            if (isset($fx['offlineHours'])) {
                $offlineHours = max($offlineHours, (int) $fx['offlineHours']);
            }
            if (isset($fx['offlineExtraHours'])) {
                $offlineExtra += (int) $fx['offlineExtraHours'];
            }
            if (isset($fx['offlineRate'])) {
                $offlineRate = DespertarDecimal::add($offlineRate, (string) $fx['offlineRate']);
            }
            if (!empty($fx['startingGeneratorId']) && isset($fx['startingGeneratorQty'])) {
                $gid = (string) $fx['startingGeneratorId'];
                $qty = max(0, (int) $fx['startingGeneratorQty']);
                $startingGenerators[$gid] = max((int) ($startingGenerators[$gid] ?? 0), $qty);
            }
            if (!empty($fx['startingGeneratorBonus']) && is_array($fx['startingGeneratorBonus'])) {
                foreach ($fx['startingGeneratorBonus'] as $gid => $raw) {
                    $generatorBonus[(string) $gid] = ((int) ($generatorBonus[(string) $gid] ?? 0)) + (int) $raw;
                }
            }
            if (!empty($fx['softPrestigeStyx'])) {
                $softPrestigeStyxCount = max($softPrestigeStyxCount, 1);
            }
            if (isset($fx['softPrestigeStyxCount'])) {
                $softPrestigeStyxCount = max($softPrestigeStyxCount, (int) $fx['softPrestigeStyxCount']);
            }
            if (isset($fx['permanentSlot'])) {
                $permanentSlot = max($permanentSlot, (int) $fx['permanentSlot']);
            }
            if (isset($fx['synergyVolUnlock'])) {
                $synergyVolUnlock = max($synergyVolUnlock, (int) $fx['synergyVolUnlock']);
            }
            if (isset($fx['shimmerLuckMult'])) {
                $shimmerLuckMult = DespertarDecimal::mul($shimmerLuckMult, (string) $fx['shimmerLuckMult']);
            }
            if (isset($fx['prestigeEffectMult'])) {
                $prestigeEffectMult = DespertarDecimal::mul($prestigeEffectMult, (string) $fx['prestigeEffectMult']);
            }
            if (isset($fx['clickTalentMult'])) {
                $clickTalentMult = DespertarDecimal::mul($clickTalentMult, (string) $fx['clickTalentMult']);
            }
            if (isset($fx['allGeneratorsMult'])) {
                $allGeneratorsMult = DespertarDecimal::mul($allGeneratorsMult, (string) $fx['allGeneratorsMult']);
            }
            if (!empty($fx['unshackleFingers'])) {
                $unshackleFingers = true;
            }
            if (!empty($fx['unshackleGeneratorId'])) {
                $ugid = (string) $fx['unshackleGeneratorId'];
                $unshackledGenerators[$ugid] = isset($fx['unshackleBonus'])
                    ? $fx['unshackleBonus']
                    : true;
            }
            if (!empty($fx['cosmeticId'])) {
                $cosmetics[] = (string) $fx['cosmeticId'];
            }
            if (!empty($fx['richAmort'])) {
                $richAmort = true;
            }
            if (!empty($fx['nectarReserveBonus'])) {
                $nectarReserveBonus = true;
            }
            if (!empty($fx['nectarFrenzyUnlock'])) {
                $nectarFrenzyUnlock = true;
            }
            if (!empty($fx['dragonUnlock'])) {
                $dragonUnlock = true;
            }
            if (!empty($fx['seasonSwitcherUnlock'])) {
                $seasonSwitcherUnlock = true;
            }
            if (!empty($fx['goldenSwitchUnlock'])) {
                $goldenSwitchUnlock = true;
            }
            if (!empty($fx['buyAllUnlock'])) {
                $buyAllUnlock = true;
            }
            if (!empty($fx['vaultUnlock'])) {
                $vaultUnlock = true;
            }
            if (!empty($fx['labelPrinter'])) {
                $labelPrinter = true;
            }
            if (isset($fx['kittenVeilFactor'])) {
                $kittenVeilFactor = DespertarDecimal::add($kittenVeilFactor, (string) $fx['kittenVeilFactor']);
            }
            if (!empty($fx['kittenUpgradeDiscount'])) {
                $kittenUpgradeDiscount = true;
            }
            if (!empty($fx['catLadies'])) {
                $catLadies = true;
            }
            if (!empty($fx['milkhelpServants'])) {
                $milkhelpServants = true;
            }
            if (isset($fx['leechSpawnMult'])) {
                $leechSpawnMult = DespertarDecimal::mul($leechSpawnMult, (string) $fx['leechSpawnMult']);
            }
            if (isset($fx['leechCapBonus'])) {
                $leechCapBonus += max(0, (int) floor((float) $fx['leechCapBonus']));
            }
            if (isset($fx['leechPayoutMult'])) {
                $leechPayoutMult = DespertarDecimal::mul($leechPayoutMult, (string) $fx['leechPayoutMult']);
            }
            if (isset($fx['researchDurationMult'])) {
                $researchDurationMult = DespertarDecimal::mul($researchDurationMult, (string) $fx['researchDurationMult']);
            }
            if (!empty($fx['leechDigestVisible'])) {
                $leechDigestVisible = true;
            }
        }

        foreach ($generatorBonus as $gid => $bonus) {
            $startingGenerators[$gid] = ((int) ($startingGenerators[$gid] ?? 0)) + (int) $bonus;
        }

        return [
            'startingSouls' => $startingSouls,
            'mnemosyneMult' => $mnemosyneMult,
            'offlineHours' => $offlineHours + $offlineExtra,
            'offlineEfficiency' => $offlineEfficiency,
            'offlineRate' => $offlineRate,
            'kSps' => $kSps,
            'generatorCostMult' => $generatorCostMult,
            'upgradeCostMult' => $upgradeCostMult,
            'startingGenerators' => $startingGenerators,
            'richAmort' => $richAmort,
            'softPrestigeStyx' => $softPrestigeStyxCount > 0,
            'softPrestigeStyxCount' => $softPrestigeStyxCount,
            'permanentSlot' => $permanentSlot,
            'synergyVolUnlock' => $synergyVolUnlock,
            'mnemosyneGainBoost' => DespertarDecimal::cmp($mnemosyneGainMult, '1') > 0,
            'mnemosyneGainMult' => $mnemosyneGainMult,
            'nectarReserveBonus' => $nectarReserveBonus,
            'nectarFrenzyUnlock' => $nectarFrenzyUnlock,
            'dragonUnlock' => $dragonUnlock,
            'seasonSwitcherUnlock' => $seasonSwitcherUnlock,
            'shimmerLuckMult' => $shimmerLuckMult,
            'prestigeEffectMult' => $prestigeEffectMult,
            'clickTalentMult' => $clickTalentMult,
            'allGeneratorsMult' => $allGeneratorsMult,
            'unshackleFingers' => $unshackleFingers,
            'unshackledGenerators' => $unshackledGenerators,
            'cosmetics' => $cosmetics,
            'goldenSwitchUnlock' => $goldenSwitchUnlock,
            'buyAllUnlock' => $buyAllUnlock,
            'vaultUnlock' => $vaultUnlock,
            'labelPrinter' => $labelPrinter,
            'kittenVeilFactor' => $kittenVeilFactor,
            'kittenUpgradeDiscount' => $kittenUpgradeDiscount,
            'catLadies' => $catLadies,
            'milkhelpServants' => $milkhelpServants,
            'leechSpawnMult' => $leechSpawnMult,
            'leechCapBonus' => $leechCapBonus,
            'leechPayoutMult' => $leechPayoutMult,
            'researchDurationMult' => $researchDurationMult,
            'leechDigestVisible' => $leechDigestVisible,
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
        $ownedTalents = [];
        foreach (($ctx['talents'] ?? []) as $t) {
            $ownedTalents[(string) $t] = true;
        }
        if (!empty($req['talentId']) && !isset($ownedTalents[(string) $req['talentId']])) {
            return false;
        }
        if (!empty($req['allTalentIds']) && is_array($req['allTalentIds'])) {
            foreach ($req['allTalentIds'] as $tid) {
                if (!isset($ownedTalents[(string) $tid])) {
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
        if (!empty($req['minGenerators']) && is_array($req['minGenerators'])) {
            foreach ($req['minGenerators'] as $genId => $minQty) {
                $haveQty = (int) (($ctx['generators'][(string) $genId] ?? 0));
                if ($haveQty < (int) $minQty) {
                    return false;
                }
            }
        }
        if (isset($req['minVeilPercent']) && (int) $req['minVeilPercent'] > 0) {
            $veilPct = isset($ctx['veilPercent']) && is_numeric($ctx['veilPercent'])
                ? (int) floor((float) $ctx['veilPercent'])
                : self::veilPercent(
                    $ctx['achievements'] ?? $ctx['unlockedAchievements'] ?? [],
                    isset($ctx['normalAchievementsCount']) && is_numeric($ctx['normalAchievementsCount'])
                        ? (int) $ctx['normalAchievementsCount']
                        : null
                );
            if ($veilPct < (int) $req['minVeilPercent']) {
                return false;
            }
        }
        if (isset($req['minSouls'])) {
            if (DespertarDecimal::cmp($ctx['souls'] ?? '0', $req['minSouls']) < 0) {
                return false;
            }
        }
        if (isset($req['dragonStage']) && (int) $req['dragonStage'] > 0 && is_array($ctx['dragon'] ?? null)) {
            $stg = (int) ($ctx['dragon']['stage'] ?? 0);
            $scaleDropped = !empty($ctx['dragon']['scaleDropped']);
            if ($stg < (int) $req['dragonStage'] && !$scaleDropped && !isset($owned[(string) $upgrade['id']])) {
                return false;
            }
        }
        if (!empty($req['seasonalDropId']) && is_array($ctx['seasons']['unlockedDrops'] ?? null)) {
            $dropSet = array_flip(array_map('strval', $ctx['seasons']['unlockedDrops']));
            if (!isset($dropSet[(string) $req['seasonalDropId']]) && !isset($owned[(string) $req['seasonalDropId']])) {
                return false;
            }
        }
        if (!empty($req['fortuneId']) && is_array($ctx['fortunes']['claimedIds'] ?? null)) {
            $claimSet = array_flip(array_map('strval', $ctx['fortunes']['claimedIds']));
            if (!isset($claimSet[(string) $req['fortuneId']]) && !isset($owned[(string) $req['fortuneId']])) {
                return false;
            }
        }
        if (!empty($req['researchId'])) {
            $resList = null;
            if (is_array($ctx['unlockedResearchIds'] ?? null)) {
                $resList = $ctx['unlockedResearchIds'];
            } elseif (is_array($ctx['catabase']['unlockedResearchIds'] ?? null)) {
                $resList = $ctx['catabase']['unlockedResearchIds'];
            }
            if ($resList !== null) {
                $resSet = array_flip(array_map('strval', $resList));
                $rid = (string) $req['researchId'];
                if (!isset($resSet[$rid]) && !isset($owned[$rid])) {
                    return false;
                }
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
                    'talents' => is_array($ctx['talents'] ?? null) ? $ctx['talents'] : [],
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
     * @param array<string, mixed> $generators
     */
    public static function nonShadeGeneratorsCount(array $generators = []): int
    {
        $count = 0;
        foreach (DespertarCatalog::GENERATORS as $def) {
            if ($def['id'] === 'wandering_shade') {
                continue;
            }
            $qty = max(0, (int) ($generators[$def['id']] ?? 0));
            $count += $qty;
        }
        return $count;
    }

    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     */
    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     * @param array<int, string> $talentIds
     */
    public static function thousandBladesBonusPerUnit(
        array $upgradeIds = [],
        array $generators = [],
        array $talentIds = []
    ): string {
        $upgradesById = DespertarCatalog::upgradesById();
        $basePerBuilding = '0';
        $mult = '1';
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if (!$u) {
                continue;
            }
            if ($u['kind'] === 'thousandBlades') {
                $basePerBuilding = DespertarDecimal::add($basePerBuilding, (string) $u['factor']);
            } elseif ($u['kind'] === 'thousandBladesMult') {
                $mult = DespertarDecimal::mul($mult, (string) $u['factor']);
            }
        }
        if (DespertarDecimal::cmp($basePerBuilding, '0') <= 0) {
            return '0';
        }
        $fx = self::talentEffects($talentIds);
        if (!empty($fx['unshackleFingers'])) {
            $mult = DespertarDecimal::mul($mult, '25');
        }
        $nonShadeQty = self::nonShadeGeneratorsCount($generators);
        if ($nonShadeQty <= 0) {
            return '0';
        }
        $perBuilding = DespertarDecimal::mul($basePerBuilding, $mult);
        return DespertarDecimal::mul($perBuilding, (string) $nonShadeQty);
    }

    /**
     * Fração do bônus de prestígio desbloqueada na corrida (escada heavenlyPower).
     * Saves com milestone heavenlyPowerLegacy usam 1.0.
     *
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $opts
     */
    public static function heavenlyPowerFromUpgrades(array $upgradeIds = [], array $opts = []): string
    {
        if (isset($opts['heavenlyPower'])) {
            return (string) $opts['heavenlyPower'];
        }
        $ms = is_array($opts['milestones'] ?? null) ? $opts['milestones'] : [];
        if (!empty($ms['heavenlyPowerLegacy']) || !empty($opts['legacyFullPower'])) {
            return '1';
        }
        $upgradesById = DespertarCatalog::upgradesById();
        $power = '0';
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if (!$u || ($u['kind'] ?? '') !== 'heavenlyPower') {
                continue;
            }
            if (isset($u['factor'])) {
                $power = DespertarDecimal::add($power, (string) $u['factor']);
            }
        }
        if (DespertarDecimal::cmp($power, '1') > 0) {
            return '1';
        }
        return $power;
    }

    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     */
    public static function nonShadeBonus(array $upgradeIds = [], array $generators = []): string
    {
        return self::thousandBladesBonusPerUnit($upgradeIds, $generators);
    }

    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     */
    public static function synergyUpgradeMult(string $generatorId, array $upgradeIds = [], array $generators = []): string
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $mult = '1';
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if (!$u || ($u['kind'] ?? '') !== 'synergyMult') {
                continue;
            }
            if (($u['boostedGeneratorId'] ?? '') === $generatorId) {
                $baseId = (string) ($u['baseGeneratorId'] ?? '');
                $baseQty = max(0, (int) ($generators[$baseId] ?? 0));
                $bonus = DespertarDecimal::mul((string) ($u['boostedBonusPerBase'] ?? '0.05'), (string) $baseQty);
                $mult = DespertarDecimal::mul($mult, DespertarDecimal::add('1', $bonus));
            } elseif (($u['baseGeneratorId'] ?? '') === $generatorId) {
                $boostedId = (string) ($u['boostedGeneratorId'] ?? '');
                $boostedQty = max(0, (int) ($generators[$boostedId] ?? 0));
                $bonus = DespertarDecimal::mul((string) ($u['baseBonusPerBoosted'] ?? '0.001'), (string) $boostedQty);
                $mult = DespertarDecimal::mul($mult, DespertarDecimal::add('1', $bonus));
            }
        }
        return $mult;
    }

    /**
     * @param array<string, mixed> $generators
     */
    public static function nonServantGeneratorsCount(array $generators = []): int
    {
        $count = 0;
        foreach (DespertarCatalog::GENERATORS as $def) {
            if ($def['id'] === 'charon_servants') {
                continue;
            }
            $qty = max(0, (int) ($generators[$def['id']] ?? 0));
            $count += $qty;
        }
        return $count;
    }

    /**
     * Fase F6 — Bônus base aditivo por unidade em `charon_servants` quando `pacto_primordial` (Elder Pact) está ativo:
     * `+0.05` por cada unidade de gerador não-Servo.
     *
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     */
    public static function elderPactServantFlatBonusPerUnit(array $upgradeIds = [], array $generators = []): string
    {
        $owned = array_flip(array_map('strval', $upgradeIds));
        if (!isset($owned['pacto_primordial'])) {
            return '0';
        }
        $nonServantQty = self::nonServantGeneratorsCount($generators);
        if ($nonServantQty <= 0) {
            return '0';
        }
        return DespertarDecimal::mul(
            DespertarCatalog::CATABASE_STAGE3_ELDER_PACT_PER_NON_SERVANT,
            (string) $nonServantQty
        );
    }

    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     */
    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     * @param array<int, string> $talentIds
     */
    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $generators
     * @param array<int, string> $talentIds
     * @param mixed $achievementsOrCount
     */
    public static function generatorUpgradeMult(
        string $generatorId,
        array $upgradeIds = [],
        array $generators = [],
        array $talentIds = [],
        mixed $achievementsOrCount = [],
        ?int $normalAchievementsCount = null
    ): string {
        $upgradesById = DespertarCatalog::upgradesById();
        $mult = '1';
        foreach ($upgradeIds as $rawId) {
            $u = $upgradesById[(string) $rawId] ?? null;
            if (!$u) {
                continue;
            }
            if ($u['kind'] === 'generatorMult' && ($u['generatorId'] ?? '') === $generatorId) {
                $mult = DespertarDecimal::mul($mult, $u['factor']);
            } elseif ($u['kind'] === 'fortuneLine' && ($u['generatorId'] ?? '') === $generatorId) {
                $mult = DespertarDecimal::mul($mult, $u['factor']);
            } elseif ($u['kind'] === 'catabaseResearch' && ($u['generatorId'] ?? '') === $generatorId && !empty($u['generatorFactor'])) {
                $mult = DespertarDecimal::mul($mult, (string) $u['generatorFactor']);
            } elseif ($u['kind'] === 'allGeneratorsMult') {
                $mult = DespertarDecimal::mul($mult, $u['factor']);
            }
        }
        $fx = self::talentEffects($talentIds);
        if (!empty($fx['unshackledGenerators'][$generatorId])) {
            $mult = DespertarDecimal::mul($mult, '25');
        }
        if (isset($fx['allGeneratorsMult']) && DespertarDecimal::cmp((string) $fx['allGeneratorsMult'], '1') !== 0) {
            $mult = DespertarDecimal::mul($mult, (string) $fx['allGeneratorsMult']);
        }
        if ($generatorId === 'charon_servants') {
            $mult = DespertarDecimal::mul(
                $mult,
                self::servantTalentMult($upgradeIds, $talentIds, $achievementsOrCount, $normalAchievementsCount)
            );
        }
        return DespertarDecimal::mul($mult, self::synergyUpgradeMult($generatorId, $upgradeIds, $generators));
    }

    /**
     * Fase F8 — Produtório composto das Relíquias Sazonais (`seasonalCompound`).
     *
     * @param array<int, string> $upgradeIds
     */
    public static function seasonalCompoundMult(array $upgradeIds = []): string
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $mult = '1';
        $seen = [];
        foreach ($upgradeIds as $rawId) {
            $id = (string) $rawId;
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $u = $upgradesById[$id] ?? null;
            if ($u && ($u['kind'] ?? '') === 'seasonalCompound' && !empty($u['factor'])) {
                $seen[$id] = true;
                $mult = DespertarDecimal::mul($mult, DespertarDecimal::add('1', (string) $u['factor']));
            }
        }
        return $mult;
    }

    /**
     * Fase F8 — Multiplicador global de Saturnália (Rei Saturno níveis 1..5 + `bencao_do_rei_saturno`).
     *
     * @param array<string, mixed> $seasons
     * @param array<int, string> $upgradeIds
     */
    public static function saturnaliaSpsMult(array $seasons = [], array $upgradeIds = []): string
    {
        $lv = max(0, min(DespertarCatalog::SATURN_KING_MAX_LEVEL, (int) ($seasons['saturnKingLevel'] ?? 0)));
        $saturnSps = $lv > 0
            ? DespertarDecimal::add('1', DespertarDecimal::mul(DespertarCatalog::SATURN_KING_SPS_PER_LEVEL, (string) $lv))
            : '1';
        $owned = array_flip(array_map('strval', $upgradeIds));
        $upMult = isset($owned['bencao_do_rei_saturno']) ? '1.15' : '1';
        return DespertarDecimal::mul($saturnSps, $upMult);
    }

    /**
     * Fase F8 — Multiplicador global das Fortunas #100 (+1%) e #101 (+7%).
     *
     * @param array<int, string> $upgradeIds
     */
    public static function fortuneGlobalSpsMult(array $upgradeIds = []): string
    {
        $owned = array_flip(array_map('strval', $upgradeIds));
        $mult = '1';
        if (isset($owned['fortune_100'])) {
            $mult = DespertarDecimal::mul($mult, DespertarCatalog::FORTUNE_100_SPS_MULT);
        }
        if (isset($owned['fortune_101'])) {
            $mult = DespertarDecimal::mul($mult, DespertarCatalog::FORTUNE_101_SPS_MULT);
        }
        return $mult;
    }

    /**
     * Fase F8 — Multiplicador da Escama de Ladão (`escama_de_ladao`: +3% SPS global).
     *
     * @param array<int, string> $upgradeIds
     */
    public static function dragonScaleSpsMult(array $upgradeIds = []): string
    {
        $owned = array_flip(array_map('strval', $upgradeIds));
        return isset($owned['escama_de_ladao']) ? DespertarCatalog::DRAGON_SCALE_SPS_MULT : '1';
    }

    /**
     * Fase F8 — Modificadores ativos das Auras do Dragão Ctoniano.
     *
     * @param array<string, mixed> $dragon
     * @return array{spsMult: string, clickMult: string, veilPupBoost: string, sellRefundRate: string, dragonflightActive: bool}
     */
    public static function dragonModifiers(array $dragon = []): array
    {
        $stage = max(0, min(DespertarCatalog::DRAGON_MAX_STAGE, (int) ($dragon['stage'] ?? 0)));
        $maxSlots = $stage >= 4 ? 2 : ($stage >= 1 ? 1 : 0);
        $activeAuras = [];

        $s1 = isset($dragon['auraSlot1']) ? (string) $dragon['auraSlot1'] : '';
        $s2 = isset($dragon['auraSlot2']) ? (string) $dragon['auraSlot2'] : '';

        if ($maxSlots >= 1 && isset(DespertarCatalog::DRAGON_AURAS[$s1]) && $stage >= DespertarCatalog::DRAGON_AURAS[$s1]['minStage']) {
            $activeAuras[$s1] = true;
        }
        if ($maxSlots >= 2 && $s2 !== '' && $s2 !== $s1 && isset(DespertarCatalog::DRAGON_AURAS[$s2]) && $stage >= DespertarCatalog::DRAGON_AURAS[$s2]['minStage']) {
            $activeAuras[$s2] = true;
        }

        $spsMult = isset($activeAuras['apetite_radiante']) ? DespertarCatalog::DRAGON_RADIANT_APPETITE_MULT : '1';
        $clickMult = isset($activeAuras['cursor_ancestral']) ? DespertarCatalog::DRAGON_CURSOR_CLICK_MULT : '1';
        $veilPupBoost = isset($activeAuras['sopro_de_flegeton']) ? DespertarCatalog::DRAGON_BREATH_OF_MILK_BOOST : '1';
        $sellRefundRate = isset($activeAuras['abalo_do_tartaro'])
            ? DespertarCatalog::GENERATOR_SELL_REFUND_EARTH_SHATTERER
            : DespertarCatalog::GENERATOR_SELL_REFUND_BASE;
        $dragonflightActive = isset($activeAuras['voo_draconico']);

        return [
            'spsMult' => $spsMult,
            'clickMult' => $clickMult,
            'veilPupBoost' => $veilPupBoost,
            'sellRefundRate' => $sellRefundRate,
            'dragonflightActive' => $dragonflightActive,
        ];
    }

    /**
     * @param array<string, mixed> $dragon
     */
    public static function dragonAuraSpsMult(array $dragon = []): string
    {
        return self::dragonModifiers($dragon)['spsMult'];
    }

    /**
     * @param array<string, mixed> $dragon
     */
    public static function dragonAuraClickMult(array $dragon = []): string
    {
        return self::dragonModifiers($dragon)['clickMult'];
    }

    /**
     * Fase F6 — Produtório dos upgrades de pesquisa da Catábase (+1% a +5% SPS global independentes).
     *
     * @param array<int, string> $upgradeIds
     */
    public static function catabaseResearchSpsMult(array $upgradeIds = []): string
    {
        $upgradesById = DespertarCatalog::upgradesById();
        $mult = '1';
        $seen = [];
        foreach ($upgradeIds as $rawId) {
            $id = (string) $rawId;
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $u = $upgradesById[$id] ?? null;
            if ($u && ($u['kind'] ?? '') === 'catabaseResearch' && !empty($u['factor'])) {
                $seen[$id] = true;
                $mult = DespertarDecimal::mul($mult, (string) $u['factor']);
            }
        }
        return $mult;
    }

    public static function elderCovenantMult(bool $covenantActive = false): string
    {
        return $covenantActive ? DespertarCatalog::CATABASE_COVENANT_SPS_MULT : '1';
    }

    public static function leechApparentMult(mixed $leechesOrCount = 0): string
    {
        $count = is_array($leechesOrCount) ? count($leechesOrCount) : max(0, (int) $leechesOrCount);
        $clamped = min(DespertarCatalog::LEECH_MAX_CAP, $count);
        if ($clamped <= 0) {
            return '1';
        }
        $drain = DespertarDecimal::mul((string) $clamped, DespertarCatalog::LEECH_DRAIN_PER_UNIT);
        return DespertarDecimal::cmp($drain, '1') >= 0 ? '0' : DespertarDecimal::sub('1', $drain);
    }

    /**
     * Cap de Sanguessugas: 10 +2 (Ninho) + leechCapBonus (Elder Spice) ≤ 14.
     *
     * @param array<int, string> $upgrades
     * @param array<int, string> $talents
     */
    public static function maxLeechCapacity(array $upgrades = [], array $talents = []): int
    {
        $owned = array_flip(array_map('strval', $upgrades));
        $cap = DespertarCatalog::LEECH_BASE_CAP;
        if (isset($owned['ninho_do_acheron'])) {
            $cap += 2;
        }
        $fx = self::talentEffects($talents);
        $cap += max(0, (int) ($fx['leechCapBonus'] ?? 0));
        return max(0, min(DespertarCatalog::LEECH_MAX_CAP, $cap));
    }

    /**
     * @param array<int, string> $upgrades
     * @param array<int, string> $talents
     */
    public static function leechPayoutMultiplier(bool $shiny = false, array $upgrades = [], array $talents = []): string
    {
        $owned = array_flip(array_map('strval', $upgrades));
        $mult = isset($owned['visceras_sacras'])
            ? DespertarCatalog::LEECH_PAYOUT_MULT_SACRA
            : DespertarCatalog::LEECH_PAYOUT_MULT_BASE;
        $fx = self::talentEffects($talents);
        $talentMult = (string) ($fx['leechPayoutMult'] ?? '1');
        if (DespertarDecimal::cmp($talentMult, '1') !== 0) {
            $mult = DespertarDecimal::mul($mult, $talentMult);
        }
        if ($shiny) {
            $mult = DespertarDecimal::mul($mult, '3');
        }
        return $mult;
    }

    /**
     * @param array<int, string> $upgrades
     * @param array<int, string> $talents
     */
    public static function calculateLeechPayout(string $digested, bool $shiny = false, array $upgrades = [], array $talents = []): string
    {
        $safeDigested = DespertarDecimal::cmp($digested, '0') > 0 ? $digested : '0';
        $mult = self::leechPayoutMultiplier($shiny, $upgrades, $talents);
        return DespertarDecimal::money(DespertarDecimal::mul($safeDigested, $mult));
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
    /**
     * Bônus SPS por óbolos: linear até PRESTIGE_SOFTCAP_START, depois log10.
     * raw = óbolos × OBOL_BONUS_PER × mnemosyneMult × heavenlyPower × prestigeEffectMult
     *
     * @param array<int, string> $talentIds
     * @param array<string, mixed> $opts
     */
    public static function prestigeBonus(string $obols, array $talentIds = [], array $opts = []): string
    {
        $eff = self::talentEffects($talentIds);
        $power = self::heavenlyPowerFromUpgrades(
            is_array($opts['upgrades'] ?? null) ? $opts['upgrades'] : ($opts['upgradeIds'] ?? []),
            $opts
        );
        $raw = DespertarDecimal::mul(
            DespertarDecimal::mul(
                DespertarDecimal::mul(
                    DespertarDecimal::mul($obols !== '' ? $obols : '0', DespertarCatalog::OBOL_BONUS_PER),
                    $eff['mnemosyneMult']
                ),
                $power
            ),
            (string) ($eff['prestigeEffectMult'] ?? '1')
        );
        if (DespertarDecimal::cmp($raw, DespertarCatalog::PRESTIGE_SOFTCAP_START) <= 0) {
            return DespertarDecimal::add('1', $raw);
        }
        $ratio = (float) DespertarDecimal::div($raw, DespertarCatalog::PRESTIGE_SOFTCAP_START);
        if ($ratio < 1.0) {
            $ratio = 1.0;
        }
        $logPart = (float) DespertarCatalog::PRESTIGE_SOFTCAP_LOG_COEFF * log10($ratio);
        return DespertarDecimal::add(
            DespertarDecimal::add('1', DespertarCatalog::PRESTIGE_SOFTCAP_START),
            (string) $logPart
        );
    }

    public static function generatorLevelMult(int $level = 0): string
    {
        $lv = max(0, $level);
        if ($lv <= 0) {
            return '1';
        }
        return DespertarDecimal::add('1', DespertarDecimal::mul(DespertarCatalog::NECTAR_LEVEL_BONUS_PER, (string) $lv));
    }

    /**
     * @param array<int, string> $talents
     */
    public static function nectarReserveMult(int $nectar = 0, array $talents = [], ?bool $nectarReserveActive = null): string
    {
        $hasTalent = $nectarReserveActive !== null
            ? $nectarReserveActive
            : !empty(self::talentEffects($talents)['nectarReserveBonus']);
        if (!$hasTalent) {
            return '1';
        }
        $capped = min(DespertarCatalog::NECTAR_RESERVE_CAP, max(0, $nectar));
        if ($capped <= 0) {
            return '1';
        }
        return DespertarDecimal::add('1', DespertarDecimal::mul(DespertarCatalog::NECTAR_RESERVE_BONUS_PER, (string) $capped));
    }

    /**
     * @param array<string, mixed> $generatorLevels
     * @param array<string, mixed> $minigames
     * @return array{spsMult: string, clickMult: string}
     */
    public static function minigameEffects(array $generatorLevels = [], array $minigames = []): array
    {
        $lvTemple = max(0, (int) ($generatorLevels['mnemosyne_temple'] ?? 0));
        $lvHound = max(0, (int) ($generatorLevels['cerberian_hound'] ?? 0));

        $pantheonSps = '1';
        $pantheonClick = '1';
        if ($lvTemple >= 1 && is_array($minigames['pantheon'] ?? null)) {
            $slots = is_array($minigames['pantheon']['slots'] ?? null) ? $minigames['pantheon']['slots'] : [];
            $seen = [];
            foreach (DespertarCatalog::PANTHEON_SLOTS as $slotDef) {
                $sid = isset($slots[$slotDef['id']]) ? (string) $slots[$slotDef['id']] : '';
                if ($sid === '' || isset($seen[$sid])) {
                    continue;
                }
                $spirit = DespertarCatalog::PANTHEON_SPIRITS[$sid] ?? null;
                if (!$spirit) {
                    continue;
                }
                $seen[$sid] = true;
                $idx = (int) $slotDef['multIndex'];
                $sMult = (string) ($spirit['spsMultBySlot'][$idx] ?? '1');
                $cMult = (string) ($spirit['clickMultBySlot'][$idx] ?? '1');
                $pantheonSps = DespertarDecimal::mul($pantheonSps, $sMult);
                $pantheonClick = DespertarDecimal::mul($pantheonClick, $cMult);
            }
        }

        $gardenSps = '1';
        $gardenClick = '1';
        if ($lvHound >= 1 && is_array($minigames['garden'] ?? null)) {
            $garden = $minigames['garden'];
            $soilId = (string) ($garden['soilId'] ?? 'barro_acheron');
            $soil = DespertarCatalog::GARDEN_SOILS[$soilId] ?? DespertarCatalog::GARDEN_SOILS['barro_acheron'];
            $soilMult = (string) ($soil['passiveEffMult'] ?? '1');
            $plots = is_array($garden['plots'] ?? null) ? $garden['plots'] : [];
            $spsBonusSum = '0';
            $clickBonusSum = '0';
            foreach ($plots as $cell) {
                if (!is_array($cell)) {
                    continue;
                }
                $seedId = (string) ($cell['seedId'] ?? '');
                $seed = DespertarCatalog::GARDEN_SEEDS[$seedId] ?? null;
                if (!$seed) {
                    continue;
                }
                $age = (int) ($cell['ageTicks'] ?? 0);
                $mature = !empty($cell['mature']) || $age >= (int) $seed['matureTicks'];
                if (!$mature || $age >= (int) $seed['lifespanTicks']) {
                    continue;
                }
                if (DespertarDecimal::cmp($seed['spsBonusPerPlot'] ?? '0', '0') > 0) {
                    $spsBonusSum = DespertarDecimal::add(
                        $spsBonusSum,
                        DespertarDecimal::mul((string) $seed['spsBonusPerPlot'], $soilMult)
                    );
                }
                if (DespertarDecimal::cmp($seed['clickBonusPerPlot'] ?? '0', '0') > 0) {
                    $clickBonusSum = DespertarDecimal::add(
                        $clickBonusSum,
                        DespertarDecimal::mul((string) $seed['clickBonusPerPlot'], $soilMult)
                    );
                }
            }
            $gardenSps = DespertarDecimal::add('1', $spsBonusSum);
            $gardenClick = DespertarDecimal::add('1', $clickBonusSum);
        }

        return [
            'spsMult' => DespertarDecimal::mul($pantheonSps, $gardenSps),
            'clickMult' => DespertarDecimal::mul($pantheonClick, $gardenClick),
        ];
    }

    public static function lineSPS(int $qty, int $shiny, int $gold, string $baseRate, string $upgradeMult, string $flatUnitBonus = '0', int $level = 0): string
    {
        $n = max(0, $qty);
        if ($n <= 0) {
            return '0';
        }
        $goldN = max(0, min($n, $gold));
        $shinyN = max(0, min($n - $goldN, $shiny));
        $normal = $n - $shinyN - $goldN;

        $unit = DespertarDecimal::add(
            DespertarDecimal::mul($baseRate, $upgradeMult),
            $flatUnitBonus !== '' ? $flatUnitBonus : '0'
        );
        $partNormal = DespertarDecimal::mul((string) $normal, $unit);
        $partShiny = DespertarDecimal::mul(DespertarDecimal::mul((string) $shinyN, $unit), DespertarCatalog::NEGATIVO_MULT);
        $partGold = DespertarDecimal::mul(DespertarDecimal::mul((string) $goldN, $unit), DespertarCatalog::GOLD_MULT);

        $rawLine = DespertarDecimal::add(DespertarDecimal::add($partNormal, $partShiny), $partGold);
        return DespertarDecimal::mul($rawLine, self::generatorLevelMult($level));
    }

    /**
     * @param mixed $activeBuffs
     * @return array<int, array<string, mixed>>
     */
    private static function iterActiveBuffEntries(mixed $activeBuffs): array
    {
        if (!is_array($activeBuffs)) {
            return [];
        }
        $entries = [];
        foreach ($activeBuffs as $key => $val) {
            if (!is_array($val)) {
                continue;
            }
            if (empty($val['id']) && is_string($key)) {
                $val['id'] = $key;
            }
            $entries[] = $val;
        }
        return $entries;
    }

    /**
     * @param array<string, mixed> $buff
     */
    private static function isBuffActiveAt(array $buff, ?int $nowMs = null): bool
    {
        if ($nowMs === null) {
            return true;
        }
        if (!isset($buff['expiresAt']) || !is_numeric($buff['expiresAt'])) {
            return false;
        }
        return (int) floor((float) $buff['expiresAt']) > $nowMs;
    }

    public static function buildingSpecialMultFromQty(int $qty = 0): string
    {
        $n = max(0, $qty);
        if ($n <= 0) {
            return '1';
        }
        $raw = DespertarDecimal::add(DespertarDecimal::div((string) $n, '10'), '1');
        if (DespertarDecimal::cmp($raw, DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT) > 0) {
            return DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT;
        }
        return $raw;
    }

    /**
     * Produto dos buffs de SPS ativos no topo do stack (`mare_acheron`, `clot_acheron`,
     * `elder_frenzy_acheron`, `selo_juizo`). Deduplica por `id`.
     */
    public static function activeSpsBuffMult(mixed $activeBuffs = [], ?int $nowMs = null): string
    {
        $shimmersById = DespertarCatalog::shimmersById();
        $mult = '1';
        $seen = [];
        foreach (self::iterActiveBuffEntries($activeBuffs) as $buff) {
            $id = (string) ($buff['id'] ?? '');
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $def = $shimmersById[$id] ?? null;
            if (!$def || !self::isBuffActiveAt($buff, $nowMs)) {
                continue;
            }
            $kind = (string) ($def['kind'] ?? '');
            if ($kind === 'spsBuff') {
                $seen[$id] = true;
                $mult = DespertarDecimal::mul($mult, (string) $def['factor']);
            } elseif ($kind === 'buildingSpecial') {
                $seen[$id] = true;
                $rawMult = isset($buff['mult']) ? (string) $buff['mult'] : '1';
                $clamped = DespertarDecimal::cmp($rawMult, '1') >= 0 ? $rawMult : '1';
                if (DespertarDecimal::cmp($clamped, DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT) > 0) {
                    $clamped = DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT;
                }
                $mult = DespertarDecimal::mul($mult, $clamped);
            }
        }
        return $mult;
    }

    /**
     * Produto dos buffs de clique ativos (`furia_foice`). Deduplica por `id`.
     */
    public static function activeClickBuffMult(mixed $activeBuffs = [], ?int $nowMs = null): string
    {
        $shimmersById = DespertarCatalog::shimmersById();
        $mult = '1';
        $seen = [];
        foreach (self::iterActiveBuffEntries($activeBuffs) as $buff) {
            $id = (string) ($buff['id'] ?? '');
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $def = $shimmersById[$id] ?? null;
            if (!$def || ($def['kind'] ?? '') !== 'clickBuff' || !self::isBuffActiveAt($buff, $nowMs)) {
                continue;
            }
            $seen[$id] = true;
            $mult = DespertarDecimal::mul($mult, (string) $def['factor']);
        }
        return $mult;
    }

    /**
     * Recompensa instantânea da *Colheita do Acheron* (paridade *Lucky*):
     * `min(15% da carteira atual, 15 min de SPS atual) + 13`.
     */
    public static function calculateLuckyReward(string $souls = '0', string $sps = '0'): string
    {
        $walletCap = DespertarDecimal::mul($souls !== '' ? $souls : '0', DespertarCatalog::SHIMMER_LUCKY_WALLET_FRACTION);
        $spsCap = DespertarDecimal::mul($sps !== '' ? $sps : '0', DespertarCatalog::SHIMMER_LUCKY_SPS_SECONDS);
        $core = DespertarDecimal::cmp($walletCap, $spsCap) <= 0 ? $walletCap : $spsCap;
        $safeCore = DespertarDecimal::cmp($core, '0') > 0 ? $core : '0';
        return DespertarDecimal::money(
            DespertarDecimal::add($safeCore, DespertarCatalog::SHIMMER_LUCKY_FLAT_BONUS)
        );
    }

    /**
     * Sanitiza `activeBuffs` no servidor sem nunca derrubar o sync: entradas inválidas
     * (ID desconhecido/instantâneo, Colérico sem Catábase, expiresAt ausente ou já vencido
     * — ex.: buff que acabou durante o RTT) são descartadas e listadas em `dropped`.
     * Aplica cap de sobreposição (`SHIMMER_MAX_ACTIVE_BUFFS`).
     *
     * @return array{ok: true, activeBuffs: array<string, array<string, mixed>>, dropped: array<int, string>}
     */
    public static function validateActiveBuffs(mixed $rawBuffs, int $nowMs, bool $catabaseActive = false): array
    {
        if ($rawBuffs === null || $rawBuffs === [] || $rawBuffs === '' || !is_array($rawBuffs)) {
            return ['ok' => true, 'activeBuffs' => [], 'dropped' => []];
        }

        $shimmersById = DespertarCatalog::shimmersById();
        $valid = [];
        $seen = [];
        $dropped = [];

        foreach ($rawBuffs as $key => $val) {
            if (!is_array($val)) {
                $dropped[] = (string) $key;
                continue;
            }
            $id = (string) ($val['id'] ?? (is_string($key) ? $key : ''));
            $def = $shimmersById[$id] ?? null;
            $kind = (string) ($def['kind'] ?? '');
            $isBuff = $kind === 'spsBuff' || $kind === 'clickBuff' || $kind === 'buildingSpecial';
            if (
                $def === null
                || !$isBuff
                || (!empty($def['requiresCatabase']) && !$catabaseActive)
                || !isset($val['expiresAt'])
                || !is_numeric($val['expiresAt'])
                || (int) floor((float) $val['expiresAt']) <= $nowMs
            ) {
                $dropped[] = $id;
                continue;
            }
            $expiresAt = (int) floor((float) $val['expiresAt']);

            $durationSec = (int) ($def['durationSec'] ?? 0);
            $maxDurationMs = ($durationSec * 1000) + DespertarCatalog::SHIMMER_SYNC_TOLERANCE_MS;
            if ($expiresAt > $nowMs + $maxDurationMs) {
                $expiresAt = $nowMs + $maxDurationMs;
            }
            $startedAt = isset($val['startedAt']) && is_numeric($val['startedAt'])
                ? (int) floor((float) $val['startedAt'])
                : ($expiresAt - ($durationSec * 1000));

            $mult = (string) ($def['factor'] ?? '1');
            if ($kind === 'buildingSpecial') {
                $rawMult = isset($val['mult']) ? (string) $val['mult'] : '2';
                $mult = DespertarDecimal::cmp($rawMult, '1') >= 0 ? $rawMult : '1';
                if (DespertarDecimal::cmp($mult, DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT) > 0) {
                    $mult = DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT;
                }
            }

            // Se já viu o mesmo id no payload, renova pelo maior expiresAt (sem empilhar cópias).
            if (isset($seen[$id])) {
                if ($expiresAt > $valid[$seen[$id]]['expiresAt']) {
                    $valid[$seen[$id]]['expiresAt'] = $expiresAt;
                }
                continue;
            }

            $seen[$id] = count($valid);
            $valid[] = [
                'id' => $id,
                'name' => $def['name'],
                'kind' => $kind,
                'variant' => $def['variant'],
                'mult' => $mult,
                'startedAt' => $startedAt,
                'expiresAt' => $expiresAt,
                'durationSec' => $durationSec,
            ];
        }

        usort($valid, static fn(array $a, array $b): int => $b['expiresAt'] <=> $a['expiresAt']);
        $capped = array_slice($valid, 0, DespertarCatalog::SHIMMER_MAX_ACTIVE_BUFFS);
        $out = [];
        foreach ($capped as $b) {
            $out[$b['id']] = $b;
        }

        return ['ok' => true, 'activeBuffs' => $out, 'dropped' => $dropped];
    }

    /**
     * Valida e sanitiza o estado de Néctar, níveis de geradores e minigames no servidor,
     * impedindo manipulação de relógio (anti-clock-skew) para gerar Néctares infinitos.
     *
     * @param array<string, mixed> $dbCanonical
     * @param array<string, mixed> $clientState
     * @return array{ok: bool, error?: string, nectar?: int, totalNectarHarvested?: int, nectarCycleStartedAt?: int|null, nectarCurrentVariant?: string, nectarFrenzyUsedThisRun?: bool, generatorLevels?: array<string, int>, minigames?: array<string, mixed>}
     */
    public static function validateNectarAndMinigames(array $dbCanonical, array $clientState, int $nowMs): array
    {
        $genById = DespertarCatalog::generatorsById();
        $dbMilestones = is_array($dbCanonical['milestones'] ?? null) ? $dbCanonical['milestones'] : [];
        $dbNectarMeta = is_array($dbMilestones['f5Nectar'] ?? null) ? $dbMilestones['f5Nectar'] : [];

        $rawClientMeta = is_array($clientState['nectarMeta'] ?? null)
            ? $clientState['nectarMeta']
            : (is_array($clientState['milestones']['f5Nectar'] ?? null) ? $clientState['milestones']['f5Nectar'] : []);

        $rawLevels = $clientState['generatorLevels'] ?? $clientState['generator_levels'] ?? $rawClientMeta['generatorLevels'] ?? [];
        if (!is_array($rawLevels)) {
            return ['ok' => false, 'error' => 'Formato de generatorLevels inválido.'];
        }
        $levels = [];
        $spentNectar = 0;
        foreach ($rawLevels as $gid => $lvRaw) {
            $idStr = (string) $gid;
            if (!isset($genById[$idStr])) {
                return ['ok' => false, 'error' => "Gerador desconhecido em generatorLevels: {$idStr}"];
            }
            if (!is_numeric($lvRaw) || (int) $lvRaw < 0 || (int) $lvRaw > DespertarCatalog::NECTAR_MAX_GENERATOR_LEVEL) {
                return ['ok' => false, 'error' => "Nível inválido para {$idStr}"];
            }
            $lv = (int) floor((float) $lvRaw);
            if ($lv > 0) {
                $levels[$idStr] = $lv;
                $spentNectar += (int) (($lv * ($lv + 1)) / 2);
            }
        }

        $clientCycleStart = $clientState['nectarCycleStartedAt'] ?? $rawClientMeta['nectarCycleStartedAt'] ?? null;
        if ($clientCycleStart !== null && $clientCycleStart !== '') {
            if (!is_numeric($clientCycleStart)) {
                return ['ok' => false, 'error' => 'nectarCycleStartedAt inválido.'];
            }
            $cs = (int) floor((float) $clientCycleStart);
            if ($cs > $nowMs + DespertarCatalog::NECTAR_SYNC_SKEW_TOLERANCE_MS) {
                return ['ok' => false, 'error' => 'Relógio de Néctar no futuro (clock-skew rejeitado).'];
            }
            $clientCycleStart = $cs;
        } else {
            $clientCycleStart = null;
        }

        // Anti-clock-skew sobre o ganho de Néctares desde o último sync no banco
        $dbCycleStart = isset($dbNectarMeta['nectarCycleStartedAt']) && is_numeric($dbNectarMeta['nectarCycleStartedAt'])
            ? (int) $dbNectarMeta['nectarCycleStartedAt']
            : null;
        $dbTotalHarvested = isset($dbNectarMeta['totalNectarHarvested']) && is_numeric($dbNectarMeta['totalNectarHarvested'])
            ? max(0, (int) $dbNectarMeta['totalNectarHarvested'])
            : 0;

        $clientNectar = (int) floor((float) ($clientState['nectar'] ?? $rawClientMeta['nectar'] ?? 0));
        $clientTotalHarvested = (int) floor((float) ($clientState['totalNectarHarvested'] ?? $rawClientMeta['totalNectarHarvested'] ?? $clientNectar));
        if ($clientNectar < 0 || $clientTotalHarvested < 0) {
            return ['ok' => false, 'error' => 'Saldo de Néctar negativo inválido.'];
        }

        if ($dbCycleStart !== null && $dbCycleStart > 0 && $clientTotalHarvested > $dbTotalHarvested) {
            $elapsedServerMs = max(0, $nowMs - $dbCycleStart + DespertarCatalog::NECTAR_SYNC_SKEW_TOLERANCE_MS);
            // Cada ciclo permite no máximo ~1 colheita manual em >=20h + ciclos completos de 24h (com teto de variante dourada +7 por ciclo)
            $maxPossibleCycles = (int) floor($elapsedServerMs / DespertarCatalog::NECTAR_MATURE_MS);
            $maxAllowedGain = $maxPossibleCycles * 7;
            $claimedGain = $clientTotalHarvested - $dbTotalHarvested;
            if ($claimedGain > $maxAllowedGain) {
                return ['ok' => false, 'error' => 'Colheita de Néctar incompatível com o tempo do servidor (clock-skew rejeitado).'];
            }
        }

        $rawMg = is_array($clientState['minigames'] ?? null)
            ? $clientState['minigames']
            : (is_array($clientState['milestones']['f5Minigames'] ?? null) ? $clientState['milestones']['f5Minigames'] : []);

        return [
            'ok' => true,
            'nectar' => $clientNectar,
            'totalNectarHarvested' => max($clientTotalHarvested, $clientNectar + $spentNectar),
            'nectarCycleStartedAt' => $clientCycleStart,
            'nectarCurrentVariant' => (string) ($clientState['nectarCurrentVariant'] ?? $rawClientMeta['nectarCurrentVariant'] ?? 'nectar_normal'),
            'nectarFrenzyUsedThisRun' => !empty($clientState['nectarFrenzyUsedThisRun'] ?? $rawClientMeta['nectarFrenzyUsedThisRun'] ?? false),
            'generatorLevels' => $levels,
            'minigames' => $rawMg,
        ];
    }

    /**
     * Fase F4 — Verifica se o ID pertence a uma conquista Shadow (que não concede Véu).
     */
    public static function isShadowAchievementId(string $id): bool
    {
        $entry = GameCatalog::getAchievementById($id);
        if (!$entry) {
            return false;
        }
        return !empty($entry['shadow']) || !empty($entry['meta']['shadow']);
    }

    /**
     * Fase F4 — Conquista elegível para o Véu (+4% Milk): existe no catálogo e NÃO é Shadow.
     */
    public static function isNormalAchievementId(string $id): bool
    {
        $entry = GameCatalog::getAchievementById($id);
        if (!$entry) {
            return false;
        }
        return empty($entry['shadow']) && empty($entry['meta']['shadow']);
    }

    /**
     * Fase F4 — Conta quantas conquistas normais (`!shadow`) estão desbloqueadas.
     */
    public static function countNormalAchievements(mixed $achievementsOrCount = [], ?int $normalAchievementsCount = null): int
    {
        if ($normalAchievementsCount !== null) {
            return max(0, $normalAchievementsCount);
        }
        if (is_int($achievementsOrCount) || is_float($achievementsOrCount)) {
            return max(0, (int) floor((float) $achievementsOrCount));
        }
        if (is_array($achievementsOrCount) && !array_is_list($achievementsOrCount)) {
            if (isset($achievementsOrCount['normalAchievementsCount']) && is_numeric($achievementsOrCount['normalAchievementsCount'])) {
                return max(0, (int) floor((float) $achievementsOrCount['normalAchievementsCount']));
            }
            $list = $achievementsOrCount['achievements'] ?? $achievementsOrCount['unlockedAchievements'] ?? [];
            return self::countNormalAchievements(is_array($list) ? array_values($list) : [], null);
        }
        if (!is_array($achievementsOrCount)) {
            return 0;
        }
        $seen = [];
        foreach ($achievementsOrCount as $rawId) {
            $id = (string) $rawId;
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            if (self::isNormalAchievementId($id)) {
                $seen[$id] = true;
            }
        }
        return count($seen);
    }

    /**
     * Fase F4 — Fração canónica de Véu (+0.04 por conquista normal; Shadow = +0).
     */
    public static function veilFraction(mixed $achievementsOrCount = [], ?int $normalAchievementsCount = null): string
    {
        $count = self::countNormalAchievements($achievementsOrCount, $normalAchievementsCount);
        if ($count <= 0) {
            return '0';
        }
        return DespertarDecimal::mul((string) $count, DespertarCatalog::VEIL_PER_ACHIEVEMENT);
    }

    /**
     * Fase F4 — Percentagem económica de Véu (+4% por conquista normal; Shadow = +0%).
     */
    public static function veilPercent(mixed $achievementsOrCount = [], ?int $normalAchievementsCount = null): int
    {
        $count = self::countNormalAchievements($achievementsOrCount, $normalAchievementsCount);
        return $count * DespertarCatalog::VEIL_PERCENT_PER_ACHIEVEMENT;
    }

    /**
     * Fase F4 — Retorna o Tier Visual (Sabor do Acheron) correspondente a `veilPercent`.
     *
     * @return array<string, mixed>
     */
    public static function veilTier(mixed $achievementsOrCount = [], ?int $normalAchievementsCount = null): array
    {
        $pct = self::veilPercent($achievementsOrCount, $normalAchievementsCount);
        $active = DespertarCatalog::VEIL_TIERS[0];
        foreach (DespertarCatalog::VEIL_TIERS as $tier) {
            if ($pct >= (int) $tier['minVeilPercent']) {
                $active = $tier;
            }
        }
        return $active;
    }

    /**
     * Fase F4 + F8 — Produtório composto da linhagem *Filhotes do Cérbero* (Paridade *Kitten Upgrades*):
     * `∏ (1 + veilFraction × factor_i × dragonMilkBoost)` sobre todos os upgrades `veilMult` / `kittenMult` comprados.
     *
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $dragon
     */
    /**
     * @param array<int, string> $upgradeIds
     * @param array<string, mixed> $dragon
     * @param array<int, string> $talentIds
     */
    public static function cerberusPupMult(
        array $upgradeIds = [],
        mixed $achievementsOrCount = [],
        ?int $normalAchievementsCount = null,
        array $dragon = [],
        array $talentIds = []
    ): string {
        $owned = array_flip(array_map('strval', $upgradeIds));
        $vFrac = self::veilFraction($achievementsOrCount, $normalAchievementsCount);
        if (DespertarDecimal::cmp($vFrac, '0') <= 0) {
            return '1';
        }
        $veilPupBoost = self::dragonModifiers($dragon)['veilPupBoost'];
        $tFx = self::talentEffects($talentIds);
        $kittenVeilFactor = (string) ($tFx['kittenVeilFactor'] ?? '0');

        $mult = '1';
        $any = false;
        foreach (DespertarCatalog::UPGRADES as $def) {
            $id = (string) $def['id'];
            if (!isset($owned[$id])) {
                continue;
            }
            $kind = (string) ($def['kind'] ?? '');
            if ($kind !== 'veilMult' && $kind !== 'kittenMult') {
                continue;
            }
            $any = true;
            $effFactor = DespertarDecimal::cmp($veilPupBoost, '1') === 0
                ? (string) $def['factor']
                : DespertarDecimal::mul((string) $def['factor'], $veilPupBoost);
            $term = DespertarDecimal::add('1', DespertarDecimal::mul($vFrac, $effFactor));
            $mult = DespertarDecimal::mul($mult, $term);
        }
        if (DespertarDecimal::cmp($kittenVeilFactor, '0') > 0) {
            $any = true;
            $effFactor = DespertarDecimal::cmp($veilPupBoost, '1') === 0
                ? $kittenVeilFactor
                : DespertarDecimal::mul($kittenVeilFactor, $veilPupBoost);
            $mult = DespertarDecimal::mul(
                $mult,
                DespertarDecimal::add('1', DespertarDecimal::mul($vFrac, $effFactor))
            );
        }
        return $any ? $mult : '1';
    }

    /**
     * Cat Ladies ×1.29 por Filhote/angels; Milkhelp +5% por rank de Véu (100%).
     *
     * @param array<int, string> $upgradeIds
     * @param array<int, string> $talentIds
     */
    public static function servantTalentMult(
        array $upgradeIds = [],
        array $talentIds = [],
        mixed $achievementsOrCount = [],
        ?int $normalAchievementsCount = null
    ): string {
        $fx = self::talentEffects($talentIds);
        $mult = '1';
        if (!empty($fx['catLadies'])) {
            $n = 0;
            $byId = DespertarCatalog::upgradesById();
            foreach ($upgradeIds as $rawId) {
                $def = $byId[(string) $rawId] ?? null;
                $kind = (string) ($def['kind'] ?? '');
                if ($kind === 'veilMult' || $kind === 'kittenMult') {
                    $n += 1;
                }
            }
            if (DespertarDecimal::cmp((string) ($fx['kittenVeilFactor'] ?? '0'), '0') > 0) {
                $n += 1;
            }
            for ($i = 0; $i < $n; $i += 1) {
                $mult = DespertarDecimal::mul($mult, '1.29');
            }
        }
        if (!empty($fx['milkhelpServants'])) {
            $ranks = (int) floor(self::veilPercent($achievementsOrCount, $normalAchievementsCount) / 100);
            if ($ranks > 0) {
                $mult = DespertarDecimal::mul(
                    $mult,
                    DespertarDecimal::add('1', DespertarDecimal::mul('0.05', (string) $ranks))
                );
            }
        }
        return $mult;
    }

    /**
     * @param array<int, string> $upgradeIds
     */
    public static function kittenMult(array $upgradeIds = [], mixed $achievementsOrCount = [], ?int $normalAchievementsCount = null): string
    {
        return self::cerberusPupMult($upgradeIds, $achievementsOrCount, $normalAchievementsCount);
    }

    /**
     * Fase F4 — Valida autoritativamente conquistas e requisitos de Véu dos upgrades `veilMult` no sync.
     * Impede injeção de conquistas falsas/não elegíveis ou compra de Filhotes do Cérbero sem o Véu necessário.
     *
     * @param array<string, mixed> $dbCanonical
     * @param array<string, mixed> $clientState
     * @param array<string, mixed> $nextCanonical
     * @param array<int, string> $serverUnlockedAchievements
     * @return array{ok: bool, error?: string, achievements?: array<int, string>, veilPercent?: int, veilFraction?: string}
     */
    public static function validateVeilAndKittens(
        array $dbCanonical,
        array $clientState,
        array $nextCanonical,
        array $serverUnlockedAchievements = []
    ): array {
        $knownMap = GameCatalog::achievementsById();
        $despertarSet = array_flip(DespertarCatalog::DESPERTAR_ACHIEVEMENT_IDS);

        $baseUnlocked = array_values(array_unique(array_filter(
            array_map('strval', $serverUnlockedAchievements),
            static fn(string $id): bool => isset($knownMap[$id])
        )));
        $baseSet = array_flip($baseUnlocked);

        // Conquistas do Despertar legitimamente ganhas pelo estado atual no servidor
        $earnedNow = self::evaluateDespertarAchievementIds($nextCanonical, $baseUnlocked, true);
        $earnedSet = array_flip($earnedNow);

        $authoritative = array_values(array_unique(array_merge($baseUnlocked, $earnedNow)));
        $authSet = array_flip($authoritative);

        // A lista do cliente nunca entra: o resultado é $authoritative (perfil ∪ ganho agora).
        // Desconhecidas, não autorizadas ou órfãs (ZERAR / sync atrasado) são só ignoradas.
        $rawClientAch = $clientState['achievements'] ?? $clientState['unlockedAchievements'] ?? null;
        $ignoredAchievements = [];
        if (is_array($rawClientAch)) {
            foreach ($rawClientAch as $rawId) {
                $cid = (string) $rawId;
                if (!isset($authSet[$cid])) {
                    $ignoredAchievements[] = $cid;
                }
            }
        }

        $veilPct = self::veilPercent($authoritative);
        $veilFrac = self::veilFraction($authoritative);

        // Filhote do Cérbero (`veilMult` / `kittenMult`) novo sem o Véu exigido: listado em
        // blockedUpgrades para o sync retirar só ele (sem derrubar o resto).
        $blockedUpgrades = [];
        $dbUpgradesSet = array_flip(array_map('strval', is_array($dbCanonical['upgrades'] ?? null) ? $dbCanonical['upgrades'] : []));
        $upById = DespertarCatalog::upgradesById();
        foreach (($nextCanonical['upgrades'] ?? []) as $uidRaw) {
            $uid = (string) $uidRaw;
            if (isset($dbUpgradesSet[$uid])) {
                continue;
            }
            $def = $upById[$uid] ?? null;
            if (!$def) {
                continue;
            }
            $kind = (string) ($def['kind'] ?? '');
            if ($kind !== 'veilMult' && $kind !== 'kittenMult') {
                continue;
            }
            $minVeil = (int) ($def['requires']['minVeilPercent'] ?? 0);
            if ($veilPct < $minVeil) {
                $blockedUpgrades[] = $uid;
            }
        }

        return [
            'ok' => true,
            'achievements' => $authoritative,
            'veilPercent' => $veilPct,
            'veilFraction' => $veilFrac,
            'blockedUpgrades' => $blockedUpgrades,
            'ignoredAchievements' => $ignoredAchievements,
        ];
    }

    /**
     * Fase F6 — Valida o estado da Catábase das Avós, capacidade de Sanguessugas (≤10 base / ≤14 com Ninho do Acheron)
     * e teto matemático de digestão em relação ao `rawSPS × elapsed`.
     *
     * @param array<string, mixed> $dbCanonical
     * @param array<string, mixed> $clientState
     * @param array<string, mixed> $nextCanonical
     * @return array{ok: bool, error?: string, catabase?: array<string, mixed>, catabaseActive?: bool, leechesPopped?: int, shinyLeechesPopped?: int}
     */
    public static function validateCatabaseAndLeeches(array $dbCanonical, array $clientState, array $nextCanonical, int $nowMs): array
    {
        $upgrades = is_array($nextCanonical['upgrades'] ?? null) ? array_values($nextCanonical['upgrades']) : [];
        $owned = array_flip(array_map('strval', $upgrades));

        $rawCat = is_array($clientState['catabase'] ?? null)
            ? $clientState['catabase']
            : (is_array($clientState['milestones']['f6Catabase'] ?? null) ? $clientState['milestones']['f6Catabase'] : []);

        $structuralStage = isset($owned['pacto_primordial'])
            ? 3
            : (isset($owned['comunhao_abissal']) ? 2 : (isset($owned['despertar_ctoniano']) ? 1 : 0));
        $manualStage = isset($rawCat['stage']) && is_numeric($rawCat['stage'])
            ? max(0, min(3, (int) floor((float) $rawCat['stage'])))
            : 0;
        if (!empty($clientState['catabaseActive']) && $structuralStage < 1 && $manualStage < 1) {
            $manualStage = 1;
        }
        $stage = max($structuralStage, $manualStage);

        $covenantActive = !empty($rawCat['covenantActive']);
        $pledgeExpiresAt = isset($rawCat['pledgeExpiresAt']) && is_numeric($rawCat['pledgeExpiresAt']) && (int) $rawCat['pledgeExpiresAt'] > $nowMs
            ? (int) floor((float) $rawCat['pledgeExpiresAt'])
            : null;
        $pledgesCount = isset($rawCat['pledgesCount']) && is_numeric($rawCat['pledgesCount'])
            ? max(0, (int) floor((float) $rawCat['pledgesCount']))
            : 0;
        $dbCat = is_array($dbCanonical['catabase'] ?? null)
            ? $dbCanonical['catabase']
            : (is_array($dbCanonical['milestones']['f6Catabase'] ?? null) ? $dbCanonical['milestones']['f6Catabase'] : []);
        $covenantActivations = max(
            isset($rawCat['covenantActivations']) && is_numeric($rawCat['covenantActivations'])
                ? max(0, (int) floor((float) $rawCat['covenantActivations']))
                : 0,
            isset($dbCat['covenantActivations']) && is_numeric($dbCat['covenantActivations'])
                ? max(0, (int) floor((float) $dbCat['covenantActivations']))
                : 0,
            $covenantActive ? 1 : 0
        );

        $talents = is_array($nextCanonical['talents'] ?? null) ? array_values($nextCanonical['talents']) : [];
        $maxCap = self::maxLeechCapacity($upgrades, $talents);

        $rawLeeches = $rawCat['leeches'] ?? [];
        if (!is_array($rawLeeches)) {
            return ['ok' => false, 'error' => 'Formato de leeches inválido.'];
        }
        if (count($rawLeeches) > $maxCap) {
            return [
                'ok' => false,
                'error' => 'Quantidade de Sanguessugas (' . count($rawLeeches) . ") excede a capacidade máxima permitida ({$maxCap}).",
            ];
        }

        // Calcula o teto matemático de digestão caso o cliente envie digested
        $rawSps = self::calculateRawSPS([
            'generators' => $nextCanonical['generators'] ?? [],
            'upgrades' => $upgrades,
            'talents' => $nextCanonical['talents'] ?? [],
            'obols' => (string) ($nextCanonical['obols'] ?? '0'),
            'verdictPurchases' => $nextCanonical['verdictPurchases'] ?? [],
            'shinyCounts' => $nextCanonical['shinyCounts'] ?? [],
            'goldCounts' => $nextCanonical['goldCounts'] ?? [],
            'activeBuffs' => $nextCanonical['activeBuffs'] ?? [],
            'nowMs' => $nowMs,
            'generatorLevels' => $nextCanonical['generatorLevels'] ?? [],
            'nectar' => (int) ($nextCanonical['nectar'] ?? 0),
            'minigames' => $nextCanonical['minigames'] ?? [],
            'achievements' => $nextCanonical['achievements'] ?? [],
            'covenantActive' => $covenantActive,
            'dragon' => is_array($nextCanonical['dragon'] ?? null) ? $nextCanonical['dragon'] : [],
            'seasons' => is_array($nextCanonical['seasons'] ?? null) ? $nextCanonical['seasons'] : [],
        ]);

        $leeches = [];
        foreach ($rawLeeches as $idx => $lRaw) {
            if (!is_array($lRaw)) {
                return ['ok' => false, 'error' => 'Entrada de Sanguessuga inválida.'];
            }
            $digested = DespertarDecimal::decimalString($lRaw['digested'] ?? '0', '0');
            if (DespertarDecimal::cmp($digested, '0') < 0) {
                return ['ok' => false, 'error' => 'Sanguessuga com digested negativo inválido.'];
            }
            $spawnedAt = isset($lRaw['spawnedAt']) && is_numeric($lRaw['spawnedAt']) && (int) $lRaw['spawnedAt'] > 0
                ? (int) floor((float) $lRaw['spawnedAt'])
                : 0;
            if ($spawnedAt > 0 && $nowMs > $spawnedAt && DespertarDecimal::cmp($digested, '0') > 0) {
                $elapsedSec = max(1.0, (($nowMs - $spawnedAt) / 1000.0) + 60.0);
                // Dreno máximo possível por segundo = rawSPS * (14 * 0.05 = 0.70) * tolerância de Frenzy/buffs (×10)
                $maxRatePerSec = DespertarDecimal::mul($rawSps, '7');
                $maxPossibleDigested = DespertarDecimal::add(
                    DespertarDecimal::mul($maxRatePerSec, number_format($elapsedSec, 2, '.', '')),
                    '1000'
                );
                if (DespertarDecimal::cmp($digested, $maxPossibleDigested) > 0) {
                    return [
                        'ok' => false,
                        'error' => "Montante digerido pela Sanguessuga ({$digested}) excede o limite matemático de rawSPS × tempo.",
                    ];
                }
            }
            $slot = isset($lRaw['slot']) && is_numeric($lRaw['slot'])
                ? max(0, min($maxCap - 1, (int) floor((float) $lRaw['slot'])))
                : min($maxCap - 1, (int) $idx);
            $leeches[] = [
                'id' => (string) ($lRaw['id'] ?? "leech_{$slot}_{$spawnedAt}"),
                'slot' => $slot,
                'shiny' => !empty($lRaw['shiny']),
                'digested' => DespertarDecimal::money($digested),
                'clicks' => max(0, (int) ($lRaw['clicks'] ?? 0)),
                'spawnedAt' => $spawnedAt,
            ];
        }

        $suppressed = $covenantActive || ($pledgeExpiresAt !== null && $pledgeExpiresAt > $nowMs);
        if ($suppressed) {
            $leeches = [];
        }

        $effectiveStage = $suppressed ? 0 : $stage;
        $catabaseActive = $effectiveStage >= 1;

        $dbStats = is_array($dbCanonical['stats'] ?? null) ? $dbCanonical['stats'] : [];
        $clientStats = is_array($clientState['stats'] ?? null) ? $clientState['stats'] : [];
        $leechesPopped = max(
            (int) ($dbStats['leechesPopped'] ?? $dbStats['leeches_popped'] ?? 0),
            (int) ($clientState['leechesPopped'] ?? $rawCat['leechesPopped'] ?? $clientStats['leechesPopped'] ?? 0)
        );
        $shinyLeechesPopped = max(
            (int) ($dbStats['shinyLeechesPopped'] ?? $dbStats['shiny_leeches_popped'] ?? 0),
            (int) ($clientState['shinyLeechesPopped'] ?? $rawCat['shinyLeechesPopped'] ?? $clientStats['shinyLeechesPopped'] ?? 0)
        );

        $canonicalResearchIds = [
            'soro_estigio',
            'despertar_ctoniano',
            'sinapse_espectral',
            'comunhao_abissal',
            'pacto_primordial',
        ];
        $canonicalSet = array_flip($canonicalResearchIds);
        $unlockedResearchIds = [];
        if (is_array($rawCat['unlockedResearchIds'] ?? null)) {
            foreach ($rawCat['unlockedResearchIds'] as $rid) {
                $sid = (string) $rid;
                if (isset($canonicalSet[$sid])) {
                    $unlockedResearchIds[] = $sid;
                }
            }
        }
        foreach ($canonicalResearchIds as $rid) {
            if (isset($owned[$rid]) && !in_array($rid, $unlockedResearchIds, true)) {
                $unlockedResearchIds[] = $rid;
            }
        }

        $researchTargetId = isset($rawCat['researchTargetId']) ? (string) $rawCat['researchTargetId'] : null;
        if ($researchTargetId !== null && $researchTargetId !== '' && !isset($canonicalSet[$researchTargetId])) {
            $researchTargetId = null;
        }
        $researchRemainingSec = isset($rawCat['researchRemainingSec']) && is_numeric($rawCat['researchRemainingSec'])
            ? max(0, (int) floor((float) $rawCat['researchRemainingSec']))
            : 0;

        return [
            'ok' => true,
            'catabaseActive' => $catabaseActive,
            'leechesPopped' => $leechesPopped,
            'shinyLeechesPopped' => $shinyLeechesPopped,
            'catabase' => [
                'stage' => $stage,
                'covenantActive' => $covenantActive,
                'pledgeExpiresAt' => $pledgeExpiresAt,
                'pledgesCount' => $pledgesCount,
                'covenantActivations' => $covenantActivations,
                'leeches' => $leeches,
                'leechesPopped' => $leechesPopped,
                'shinyLeechesPopped' => $shinyLeechesPopped,
                'unlockedResearchIds' => array_values(array_unique($unlockedResearchIds)),
                'researchTargetId' => $researchTargetId,
                'researchRemainingSec' => $researchRemainingSec,
            ],
        ];
    }

    /**
     * Fase F8 — Valida e sanitiza o estado de Dragão Ctoniano, 4 Estações e Fortunas de Hermes no servidor.
     *
     * @param array<string, mixed> $dbCanonical
     * @param array<string, mixed> $clientState
     * @param array<string, mixed> $nextCanonical
     * @return array{ok: bool, error?: string, dragon?: array<string, mixed>, seasons?: array<string, mixed>, fortunes?: array<string, mixed>, generatorsSold?: int}
     */
    public static function validateDragonSeasonsFortunes(array $dbCanonical, array $clientState, array $nextCanonical, int $nowMs): array
    {
        $upgrades = is_array($nextCanonical['upgrades'] ?? null) ? array_values($nextCanonical['upgrades']) : [];
        $ownedUp = array_flip(array_map('strval', $upgrades));

        // 1. Dragão Ctoniano
        $rawDragon = is_array($clientState['dragon'] ?? null)
            ? $clientState['dragon']
            : (is_array($clientState['milestones']['f8Dragon'] ?? null) ? $clientState['milestones']['f8Dragon'] : []);
        $dStage = isset($rawDragon['stage']) && is_numeric($rawDragon['stage'])
            ? max(0, min(DespertarCatalog::DRAGON_MAX_STAGE, (int) floor((float) $rawDragon['stage'])))
            : 0;
        $maxSlots = $dStage >= 4 ? 2 : ($dStage >= 1 ? 1 : 0);

        $aura1 = isset($rawDragon['auraSlot1']) && $rawDragon['auraSlot1'] !== '' ? (string) $rawDragon['auraSlot1'] : null;
        $aura2 = isset($rawDragon['auraSlot2']) && $rawDragon['auraSlot2'] !== '' ? (string) $rawDragon['auraSlot2'] : null;

        if ($aura1 !== null) {
            if (!isset(DespertarCatalog::DRAGON_AURAS[$aura1])) {
                return ['ok' => false, 'error' => "Aura do Dragão desconhecida: {$aura1}"];
            }
            if ($maxSlots < 1 || $dStage < DespertarCatalog::DRAGON_AURAS[$aura1]['minStage']) {
                return ['ok' => false, 'error' => "Aura {$aura1} exige estágio superior do Dragão."];
            }
        }
        if ($aura2 !== null) {
            if (!isset(DespertarCatalog::DRAGON_AURAS[$aura2])) {
                return ['ok' => false, 'error' => "Aura do Dragão desconhecida: {$aura2}"];
            }
            if ($maxSlots < 2 || $dStage < DespertarCatalog::DRAGON_AURAS[$aura2]['minStage'] || $aura2 === $aura1) {
                return ['ok' => false, 'error' => "Slot 2 de Aura inválido ou bloqueado para {$aura2}."];
            }
        }

        $dragon = [
            'stage' => $dStage,
            'auraSlot1' => $aura1,
            'auraSlot2' => $aura2,
            'scaleDropped' => !empty($rawDragon['scaleDropped']) || $dStage >= 1 || isset($ownedUp['escama_de_ladao']),
        ];

        // 2. 4 Estações do Submundo
        $rawSeasons = is_array($clientState['seasons'] ?? null)
            ? $clientState['seasons']
            : (is_array($clientState['milestones']['f8Seasons'] ?? null) ? $clientState['milestones']['f8Seasons'] : []);
        $activeSeason = isset($rawSeasons['activeSeason']) && $rawSeasons['activeSeason'] !== ''
            ? (string) $rawSeasons['activeSeason']
            : null;
        if ($activeSeason !== null && !isset(DespertarCatalog::SEASONS[$activeSeason])) {
            return ['ok' => false, 'error' => "Estação desconhecida: {$activeSeason}"];
        }
        $sExpiresAt = isset($rawSeasons['expiresAt']) && is_numeric($rawSeasons['expiresAt']) && (int) $rawSeasons['expiresAt'] > $nowMs
            ? (int) floor((float) $rawSeasons['expiresAt'])
            : null;
        if ($activeSeason !== null && $sExpiresAt === null && isset($rawSeasons['expiresAt'])) {
            $activeSeason = null;
        }
        $saturnLv = isset($rawSeasons['saturnKingLevel']) && is_numeric($rawSeasons['saturnKingLevel'])
            ? max(0, min(DespertarCatalog::SATURN_KING_MAX_LEVEL, (int) floor((float) $rawSeasons['saturnKingLevel'])))
            : 0;
        $knownDropsSet = array_flip(DespertarCatalog::ALL_SEASONAL_DROP_UPGRADE_IDS);
        $unlockedDrops = [];
        if (is_array($rawSeasons['unlockedDrops'] ?? null)) {
            foreach ($rawSeasons['unlockedDrops'] as $did) {
                $dStr = (string) $did;
                if (isset($knownDropsSet[$dStr])) {
                    $unlockedDrops[$dStr] = true;
                }
            }
        }
        foreach ($upgrades as $uid) {
            if (isset($knownDropsSet[(string) $uid])) {
                $unlockedDrops[(string) $uid] = true;
            }
        }

        $seasons = [
            'activeSeason' => $activeSeason,
            'expiresAt' => $sExpiresAt,
            'switchesCount' => isset($rawSeasons['switchesCount']) && is_numeric($rawSeasons['switchesCount'])
                ? max(0, (int) floor((float) $rawSeasons['switchesCount']))
                : 0,
            'saturnKingLevel' => $saturnLv,
            'deerCaught' => isset($rawSeasons['deerCaught']) && is_numeric($rawSeasons['deerCaught'])
                ? max(0, (int) floor((float) $rawSeasons['deerCaught']))
                : 0,
            'unlockedDrops' => array_keys($unlockedDrops),
        ];

        // 3. Fortunas de Hermes
        $rawFortunes = is_array($clientState['fortunes'] ?? null)
            ? $clientState['fortunes']
            : (is_array($clientState['milestones']['f8Fortunes'] ?? null) ? $clientState['milestones']['f8Fortunes'] : []);
        $knownFortunes = array_flip(DespertarCatalog::FORTUNE_IDS);
        $claimedSet = [];
        if (is_array($rawFortunes['claimedIds'] ?? null)) {
            foreach ($rawFortunes['claimedIds'] as $fid) {
                $fStr = (string) $fid;
                if (isset($knownFortunes[$fStr])) {
                    $claimedSet[$fStr] = true;
                }
            }
        }
        foreach ($upgrades as $uid) {
            if (isset($knownFortunes[(string) $uid])) {
                $claimedSet[(string) $uid] = true;
            }
        }
        $lifetimeSet = $claimedSet;
        if (is_array($rawFortunes['lifetimeClaimedIds'] ?? null)) {
            foreach ($rawFortunes['lifetimeClaimedIds'] as $fid) {
                $fStr = (string) $fid;
                if (isset($knownFortunes[$fStr])) {
                    $lifetimeSet[$fStr] = true;
                }
            }
        }
        $activeFortuneId = isset($rawFortunes['activeFortuneId']) && $rawFortunes['activeFortuneId'] !== ''
            ? (string) $rawFortunes['activeFortuneId']
            : null;
        if ($activeFortuneId !== null && (!isset($knownFortunes[$activeFortuneId]) || isset($claimedSet[$activeFortuneId]))) {
            $activeFortuneId = null;
        }

        $fortunes = [
            'activeFortuneId' => $activeFortuneId,
            'claimedIds' => array_keys($claimedSet),
            'lifetimeClaimedIds' => array_keys($lifetimeSet),
        ];

        $dbStats = is_array($dbCanonical['stats'] ?? null) ? $dbCanonical['stats'] : [];
        $clientStats = is_array($clientState['stats'] ?? null) ? $clientState['stats'] : [];
        $generatorsSold = max(
            (int) ($dbStats['generatorsSold'] ?? $dbStats['generators_sold'] ?? 0),
            (int) ($clientState['generatorsSold'] ?? $clientStats['generatorsSold'] ?? 0)
        );

        return [
            'ok' => true,
            'dragon' => $dragon,
            'seasons' => $seasons,
            'fortunes' => $fortunes,
            'generatorsSold' => $generatorsSold,
        ];
    }

    /**
     * Fase F8 — Auditoria completa do Stack SPS (Ordem Canónica da Wiki § 4.1).
     *
     * @param array<string, mixed> $opts
     * @return array<string, string>
     */
    public static function calculateSpsBreakdown(array $opts = []): array
    {
        $generators = is_array($opts['generators'] ?? null) ? $opts['generators'] : [];
        $upgrades = is_array($opts['upgrades'] ?? null) ? $opts['upgrades'] : [];
        $talents = is_array($opts['talents'] ?? null) ? $opts['talents'] : [];
        $obols = (string) ($opts['obols'] ?? '0');
        $verdictPurchases = is_array($opts['verdictPurchases'] ?? null) ? $opts['verdictPurchases'] : [];
        $shinyCounts = is_array($opts['shinyCounts'] ?? null) ? $opts['shinyCounts'] : [];
        $goldCounts = is_array($opts['goldCounts'] ?? null) ? $opts['goldCounts'] : [];
        $activeBuffs = $opts['activeBuffs'] ?? [];
        $nowMs = isset($opts['nowMs']) && is_numeric($opts['nowMs']) ? (int) $opts['nowMs'] : null;
        $generatorLevels = is_array($opts['generatorLevels'] ?? null) ? $opts['generatorLevels'] : [];
        $nectar = (int) ($opts['nectar'] ?? 0);
        $nectarReserveActive = isset($opts['nectarReserveActive']) && is_bool($opts['nectarReserveActive'])
            ? $opts['nectarReserveActive']
            : null;
        $minigames = is_array($opts['minigames'] ?? null) ? $opts['minigames'] : [];
        $achievements = $opts['achievements'] ?? $opts['unlockedAchievements'] ?? [];
        $normalAchievementsCount = isset($opts['normalAchievementsCount']) && is_numeric($opts['normalAchievementsCount'])
            ? (int) floor((float) $opts['normalAchievementsCount'])
            : null;
        $catabase = is_array($opts['catabase'] ?? null) ? $opts['catabase'] : [];
        $covenantActive = isset($opts['covenantActive']) && is_bool($opts['covenantActive'])
            ? $opts['covenantActive']
            : !empty($catabase['covenantActive']);
        $dragon = is_array($opts['dragon'] ?? null) ? $opts['dragon'] : [];
        $seasons = is_array($opts['seasons'] ?? null) ? $opts['seasons'] : [];

        $baseLinesSps = '0';
        $shadeFlatBonus = self::thousandBladesBonusPerUnit($upgrades, $generators, $talents);
        $servantFlatBonus = self::elderPactServantFlatBonusPerUnit($upgrades, $generators);
        foreach (DespertarCatalog::GENERATORS as $def) {
            $id = $def['id'];
            $qty = (int) ($generators[$id] ?? 0);
            if ($qty <= 0) {
                continue;
            }
            $upMult = self::generatorUpgradeMult(
                $id,
                $upgrades,
                $generators,
                $talents,
                $achievements,
                $normalAchievementsCount
            );
            $shiny = (int) ($shinyCounts[$id] ?? 0);
            $gold = (int) ($goldCounts[$id] ?? 0);
            $level = (int) ($generatorLevels[$id] ?? 0);
            $flatBonus = '0';
            if ($id === 'wandering_shade') {
                $flatBonus = $shadeFlatBonus;
            } elseif ($id === 'charon_servants') {
                $flatBonus = $servantFlatBonus;
            }
            $line = self::lineSPS($qty, $shiny, $gold, $def['baseRate'], $upMult, $flatBonus, $level);
            $baseLinesSps = DespertarDecimal::add($baseLinesSps, $line);
        }

        $milestones = is_array($opts['milestones'] ?? null) ? $opts['milestones'] : [];
        $prestigeMult = self::prestigeBonus($obols, $talents, [
            'upgrades' => $upgrades,
            'milestones' => $milestones,
        ]);
        $econ = self::economyEffects($talents, $verdictPurchases);
        $verdictMult = (string) $econ['spsVerdictMult'];
        $mg = self::minigameEffects($generatorLevels, $minigames);
        $minigamesMult = $mg['spsMult'];
        $seasonalMult = self::seasonalCompoundMult($upgrades);
        $researchMult = self::catabaseResearchSpsMult($upgrades);
        $saturnMult = self::saturnaliaSpsMult($seasons, $upgrades);
        $fortuneMult = self::fortuneGlobalSpsMult($upgrades);
        $scaleMult = self::dragonScaleSpsMult($upgrades);
        $pupMult = self::cerberusPupMult($upgrades, $achievements, $normalAchievementsCount, $dragon, $talents);
        $reserveMult = self::nectarReserveMult($nectar, $talents, $nectarReserveActive);
        $auraMult = self::dragonAuraSpsMult($dragon);
        $covenantMult = self::elderCovenantMult($covenantActive);
        $buffsMult = self::activeSpsBuffMult($activeBuffs, $nowMs);

        $layers = [
            $prestigeMult,
            $verdictMult,
            $minigamesMult,
            $seasonalMult,
            $researchMult,
            $saturnMult,
            $fortuneMult,
            $scaleMult,
            $pupMult,
            $reserveMult,
            $auraMult,
            $covenantMult,
            $buffsMult,
        ];

        $rawMultiplier = '1';
        $running = $baseLinesSps;
        foreach ($layers as $m) {
            $rawMultiplier = DespertarDecimal::mul($rawMultiplier, $m);
            $running = DespertarDecimal::mul($running, $m);
        }
        $rawSps = $running;
        $leechesSource = $opts['leeches'] ?? $catabase['leeches'] ?? $opts['leechesCount'] ?? 0;
        $leechMult = self::leechApparentMult($leechesSource);
        $effectiveSps = DespertarDecimal::mul($rawSps, $leechMult);

        return [
            'baseLinesSps' => $baseLinesSps,
            'prestigeMult' => $prestigeMult,
            'verdictMult' => $verdictMult,
            'minigamesMult' => $minigamesMult,
            'seasonalCompoundMult' => $seasonalMult,
            'catabaseResearchMult' => $researchMult,
            'saturnaliaMult' => $saturnMult,
            'fortuneGlobalMult' => $fortuneMult,
            'dragonScaleMult' => $scaleMult,
            'cerberusPupMult' => $pupMult,
            'nectarReserveMult' => $reserveMult,
            'dragonAuraMult' => $auraMult,
            'elderCovenantMult' => $covenantMult,
            'activeBuffsMult' => $buffsMult,
            'rawMultiplier' => $rawMultiplier,
            'rawSps' => $rawSps,
            'leechApparentMult' => $leechMult,
            'effectiveSps' => $effectiveSps,
        ];
    }

    /**
     * @param array<string, mixed> $opts
     */
    public static function calculateRawSPS(array $opts = []): string
    {
        return self::calculateSpsBreakdown($opts)['rawSps'];
    }

    /**
     * @param array<string, mixed> $opts
     */
    public static function calculateTotalSPS(array $opts = []): string
    {
        return self::calculateRawSPS($opts);
    }

    /**
     * @param array<string, mixed> $opts
     */
    public static function calculateEffectiveSPS(array $opts = []): string
    {
        $raw = isset($opts['rawSps']) && $opts['rawSps'] !== null
            ? (string) $opts['rawSps']
            : self::calculateRawSPS($opts);
        $catabase = is_array($opts['catabase'] ?? null) ? $opts['catabase'] : [];
        $leechesSource = $opts['leeches'] ?? $catabase['leeches'] ?? $opts['leechesCount'] ?? 0;
        return DespertarDecimal::mul($raw, self::leechApparentMult($leechesSource));
    }

    /**
     * @param array<string, mixed> $opts
     */
    public static function clickPower(array $opts = []): string
    {
        $sps = isset($opts['sps']) && $opts['sps'] !== null
            ? (string) $opts['sps']
            : self::calculateTotalSPS($opts);
        $generators = is_array($opts['generators'] ?? null) ? $opts['generators'] : [];
        $upgrades = is_array($opts['upgrades'] ?? null) ? $opts['upgrades'] : [];
        $talents = is_array($opts['talents'] ?? null) ? $opts['talents'] : [];
        $verdictPurchases = is_array($opts['verdictPurchases'] ?? null) ? $opts['verdictPurchases'] : [];
        $activeBuffs = $opts['activeBuffs'] ?? [];
        $nowMs = isset($opts['nowMs']) && is_numeric($opts['nowMs']) ? (int) $opts['nowMs'] : null;
        $generatorLevels = is_array($opts['generatorLevels'] ?? null) ? $opts['generatorLevels'] : [];
        $minigames = is_array($opts['minigames'] ?? null) ? $opts['minigames'] : [];
        $dragon = is_array($opts['dragon'] ?? null) ? $opts['dragon'] : [];

        $econ = self::economyEffects($talents, $verdictPurchases);
        $mg = self::minigameEffects($generatorLevels, $minigames);
        $dClickMult = self::dragonAuraClickMult($dragon);
        $clickMult = DespertarDecimal::mul(
            DespertarDecimal::mul(
                DespertarDecimal::mul(self::clickMultiplier($upgrades), (string) $econ['clickVerdictMult']),
                $mg['clickMult']
            ),
            $dClickMult
        );
        $kSps = DespertarDecimal::add((string) $econ['kSps'], self::styxClickKSps($upgrades));

        $flatPart = DespertarDecimal::mul(
            DespertarDecimal::add(DespertarCatalog::CLICK_BASE, DespertarCatalog::CLICK_FLAT_BASE),
            $clickMult
        );
        $bladesPart = self::thousandBladesBonusPerUnit($upgrades, $generators);
        $spsPart = DespertarDecimal::mul($kSps, $sps);
        $basePower = DespertarDecimal::add(DespertarDecimal::add($flatPart, $bladesPart), $spsPart);
        return DespertarDecimal::mul($basePower, self::activeClickBuffMult($activeBuffs, $nowMs));
    }

    /**
     * @param array<int, string> $upgrades
     */
    public static function obolsFromRunSouls(string $runSouls, int $prestigeCount = 0, array $upgrades = []): string
    {
        $p = DespertarDecimal::toScaled($runSouls !== '' ? $runSouls : '0');
        $q = DespertarDecimal::toScaled(DespertarCatalog::PRESTIGE_RUN_DIVISOR);
        if (DespertarDecimal::intCmp($p, '0') <= 0 || DespertarDecimal::intCmp($q, '0') <= 0) {
            return '0';
        }
        $raw = DespertarDecimal::floorSqrtRatio($p, $q);
        $denom = (string) (1 + max(0, $prestigeCount));
        $gain = DespertarDecimal::intDiv($raw, $denom);
        // 1ª Catábase: piso de 1 óbolo a partir de FIRST_CATABASE_RUN_SOULS (só com 0 Catábases).
        if (DespertarDecimal::intCmp($gain, '0') <= 0 && $prestigeCount <= 0
            && DespertarDecimal::intCmp($p, DespertarDecimal::toScaled(DespertarCatalog::FIRST_CATABASE_RUN_SOULS)) >= 0) {
            $gain = '1';
        }
        if (DespertarDecimal::intCmp($gain, '0') <= 0) {
            return '0';
        }
        $owned = array_flip(array_map('strval', $upgrades));
        if (isset($owned['fortune_102'])) {
            $boosted = DespertarDecimal::intDiv(DespertarDecimal::intMul($gain, '101'), '100');
            $gain = DespertarDecimal::intCmp($boosted, $gain) > 0
                ? $boosted
                : DespertarDecimal::intAdd($gain, '1');
        }
        return $gain;
    }

    /**
     * Fase F8 — Referência canónica de prestígio cúbico (Cookie Clicker § 8.1): `floor(cbrt(lifetimeSouls / 1e12))`.
     */
    public static function obolsFromLifetimeCubic(string $lifetimeSouls = '0'): string
    {
        $p = DespertarDecimal::toScaled($lifetimeSouls !== '' ? $lifetimeSouls : '0');
        $q = DespertarDecimal::toScaled(DespertarCatalog::PRESTIGE_CUBIC_DIVISOR);
        if (DespertarDecimal::intCmp($p, '0') <= 0 || DespertarDecimal::intCmp($q, '0') <= 0) {
            return '0';
        }
        return DespertarDecimal::floorCbrtRatio($p, $q);
    }

    /**
     * @param array<int, string> $rawTalents
     * @return array{talents: array<int, string>, mnemosyne: string, refunded: string}
     */
    public static function migrateTalentSave(array $rawTalents = [], string $mnemosyne = '0'): array
    {
        $refund = '0';
        $next = [];
        $seen = [];
        foreach ($rawTalents as $raw) {
            $id = (string) $raw;
            $hasMap = array_key_exists($id, DespertarCatalog::LEGACY_TALENT_MAP);
            $mapped = $hasMap ? DespertarCatalog::LEGACY_TALENT_MAP[$id] : $id;
            if ($mapped !== null && isset(DespertarCatalog::TALENTS[$mapped])) {
                if (!isset($seen[$mapped])) {
                    $seen[$mapped] = true;
                    $next[] = $mapped;
                }
                continue;
            }
            if (!$hasMap && isset(DespertarCatalog::TALENTS[$id])) {
                if (!isset($seen[$id])) {
                    $seen[$id] = true;
                    $next[] = $id;
                }
                continue;
            }
            $cost = DespertarCatalog::LEGACY_TALENT_COSTS[$id] ?? '0';
            if (DespertarDecimal::cmp($cost, '0') > 0) {
                $refund = DespertarDecimal::add($refund, $cost);
            }
        }
        return [
            'talents' => $next,
            'mnemosyne' => DespertarDecimal::money(DespertarDecimal::add($mnemosyne !== '' ? $mnemosyne : '0', $refund)),
            'refunded' => DespertarDecimal::money($refund),
        ];
    }

    /**
     * Remove sinergias temáticas órfãs (pré-malha wiki) e reembolsa o custo em almas.
     *
     * @param array<int, string> $rawUpgrades
     * @return array{upgrades: array<int, string>, souls: string, refunded: string}
     */
    public static function migrateUpgradeSave(array $rawUpgrades = [], string $souls = '0'): array
    {
        $refund = '0';
        $next = [];
        $seen = [];
        $upById = DespertarCatalog::upgradesById();
        foreach ($rawUpgrades as $raw) {
            $id = (string) $raw;
            if (isset($upById[$id])) {
                if (!isset($seen[$id])) {
                    $seen[$id] = true;
                    $next[] = $id;
                }
                continue;
            }
            $cost = DespertarCatalog::LEGACY_SYNERGY_COSTS[$id] ?? '0';
            if (DespertarDecimal::cmp($cost, '0') > 0) {
                $refund = DespertarDecimal::add($refund, $cost);
            }
        }
        return [
            'upgrades' => $next,
            'souls' => DespertarDecimal::money(DespertarDecimal::add($souls !== '' ? $souls : '0', $refund)),
            'refunded' => DespertarDecimal::money($refund),
        ];
    }

    /**
     * Fase F8 — Migração segura (*Save Heal*) de saves legados (F0–F7) para F8.
     *
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public static function healLegacySave(array $state): array
    {
        $milestones = is_array($state['milestones'] ?? null) ? $state['milestones'] : [];
        $currentObols = DespertarDecimal::toBigIntFloor($state['obols'] ?? '0');
        $currentMnemosyne = DespertarDecimal::toBigIntFloor($state['mnemosyne'] ?? '0');
        $prestigeCount = max(0, (int) ($state['prestigeCount'] ?? $state['prestige_count'] ?? 0));
        $lifetimeSouls = (string) ($state['lifetimeSouls'] ?? $state['lifetime_souls'] ?? '0');

        $healedObols = DespertarDecimal::intCmp($currentObols, '0') > 0 ? $currentObols : '0';
        $healedMnemosyne = DespertarDecimal::intCmp($currentMnemosyne, '0') > 0 ? $currentMnemosyne : '0';

        if ($prestigeCount > 0) {
            $cubicFloor = self::obolsFromLifetimeCubic($lifetimeSouls);
            if (DespertarDecimal::intCmp($cubicFloor, $currentObols) > 0) {
                $healedObols = $cubicFloor;
            }
        }

        $migrated = self::migrateTalentSave(
            is_array($state['talents'] ?? null) ? $state['talents'] : [],
            DespertarDecimal::money($healedMnemosyne)
        );
        $healedMnemosyne = $migrated['mnemosyne'];

        if (!array_key_exists('heavenlyPowerLegacy', $milestones)) {
            if (
                $prestigeCount > 0
                || DespertarDecimal::cmp(DespertarDecimal::money($healedObols), '0') > 0
                || count($migrated['talents']) > 0
            ) {
                $milestones['heavenlyPowerLegacy'] = true;
            }
        }
        if (empty($milestones['heavenlyPowerSeen']) && empty($milestones['heavenlyPowerLegacy'])) {
            $milestones['heavenlyPowerSeen'] = true;
        }

        $milestones['f8SaveHealed'] = true;
        if (!array_key_exists('ascensionOpen', $milestones)) {
            $milestones['ascensionOpen'] = false;
        }
        $state['obols'] = DespertarDecimal::money($healedObols);
        $state['mnemosyne'] = DespertarDecimal::money($healedMnemosyne);
        $state['talents'] = $migrated['talents'];
        $state['ascensionOpen'] = (bool) ($state['ascensionOpen'] ?? $milestones['ascensionOpen']);
        $milestones['ascensionOpen'] = $state['ascensionOpen'];
        $state['milestones'] = $milestones;
        return $state;
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
        $eff = self::talentEffects($talents);
        $gainMult = (string) ($eff['mnemosyneGainMult'] ?? '1');
        if (DespertarDecimal::intCmp($gain, '0') > 0 && DespertarDecimal::cmp($gainMult, '1') > 0) {
            $gain = DespertarDecimal::toBigIntFloor(DespertarDecimal::mul($gain, $gainMult));
        }
        return $gain;
    }

    /**
     * @param array<int, string> $upgrades
     */
    public static function canPrestige(string $runSouls, int $prestigeCount = 0, array $upgrades = []): bool
    {
        return DespertarDecimal::cmp(self::obolsFromRunSouls($runSouls, $prestigeCount, $upgrades), '0') > 0;
    }

    /**
     * @param array<int, string> $talents
     * @param array<int, string> $upgrades
     * @return array{obolsGain: string, mnemosyneGain: string, unlocked: bool}
     */
    public static function prestigePreview(string $runSouls, int $prestigeCount = 0, array $talents = [], array $upgrades = []): array
    {
        $obolsGain = self::obolsFromRunSouls($runSouls, $prestigeCount, $upgrades);
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

        // V2: ignora skip só-V1 — saves com letheRebalanceV1 ainda passam pelo heal.
        if (!$force && !empty($milestones[DespertarCatalog::LETHE_REBALANCE_V2_MILESTONE])) {
            return array_merge($base, ['skipped' => true, 'reason' => 'already_rebalanced_v2']);
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

    /**
     * Aplica heal Lethe V2 no estado canónico (só reduz carteiras; grava milestone V2).
     *
     * @param array<string, mixed> $state
     * @return array{state: array<string, mixed>, applied: bool, plan: array<string, mixed>}
     */
    public static function applyLetheRebalanceV2ToState(array $state, bool $force = false): array
    {
        $plan = self::planLetheWalletRebalance($state, $force);
        if (!$force && !empty($plan['skipped']) && ($plan['reason'] ?? '') === 'already_rebalanced_v2') {
            return ['state' => $state, 'applied' => false, 'plan' => $plan];
        }

        $milestones = is_array($state['milestones'] ?? null) ? $state['milestones'] : [];
        $milestones[DespertarCatalog::LETHE_REBALANCE_V2_MILESTONE] = true;
        $milestones[DespertarCatalog::LETHE_REBALANCE_MILESTONE] = true;

        $next = $state;
        $next['milestones'] = $milestones;

        if (empty($plan['skipped']) || $force) {
            $next['obols'] = $plan['obolsAfter'];
            $next['mnemosyne'] = $plan['mnemosyneAfter'];
        }

        return ['state' => $next, 'applied' => true, 'plan' => $plan];
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
     * Segundos de SPS que um eco creditado pode render (melhor efeito possível, com combos).
     */
    public static function syncShimmerBonusSec(bool $catabaseActive): float
    {
        return max(
            (float) DespertarCatalog::SYNC_WINDFALL_SPS_SEC,
            ((float) DespertarCatalog::SHIMMER_FRENZY_MULT - 1) * DespertarCatalog::SHIMMER_FRENZY_DURATION_SEC,
            ((float) DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT - 1)
                * DespertarCatalog::SHIMMER_BUILDING_SPECIAL_DURATION_SEC
                * (float) DespertarCatalog::SHIMMER_FRENZY_MULT,
            $catabaseActive
                ? ((float) DespertarCatalog::SHIMMER_ELDER_FRENZY_MULT - 1)
                    * DespertarCatalog::SHIMMER_ELDER_FRENZY_DURATION_SEC
                    * (float) DespertarCatalog::SHIMMER_FRENZY_MULT
                    * (float) DespertarCatalog::SHIMMER_BUILDING_SPECIAL_MAX_MULT
                : 0.0
        );
    }

    /** Segundos de clique a 20/s que um eco creditado pode render (Fúria da Foice + Voo Dracónico). */
    public static function syncClickBonusSec(): float
    {
        return ((float) DespertarCatalog::SHIMMER_CLICK_FRENZY_MULT - 1) * DespertarCatalog::SHIMMER_CLICK_FRENZY_DURATION_SEC
            + ((float) DespertarCatalog::DRAGONFLIGHT_CLICK_MULT - 1) * DespertarCatalog::DRAGONFLIGHT_DURATION_SEC;
    }

    /**
     * Fichas e balde de bônus do teto do sync (estado em milestones.antiCheat).
     * Fichas limitam quantos ecos/feitiços novos contam (1 a cada 60 s, até 3);
     * cada um creditado enche o balde, que atravessa janelas (buff clicado no fim de
     * uma janela ainda rende na próxima). Recarga lenta cobre Fortuna e Corça.
     *
     * @param array<string, mixed> $prev milestones.antiCheat anterior
     * @return array{shimmerTokens: float, spellTokens: float, shimmersCredited: int, spellsCredited: int, bonusSpsSec: float, bonusClickSec: float}
     */
    public static function syncBonusBucket(array $prev, float $dtSec, int $shimmersClaimed, int $spellsClaimed, bool $catabaseActive): array
    {
        $dt = is_finite($dtSec) && $dtSec > 0 ? $dtSec : 0.0;
        $shimmerMax = (float) DespertarCatalog::SYNC_SHIMMER_TOKEN_MAX;
        $spellMax = (float) DespertarCatalog::SYNC_SPELL_TOKEN_MAX;
        $shimmerTokens = min($shimmerMax, (float) ($prev['shimmerTokens'] ?? $shimmerMax) + $dt / DespertarCatalog::SYNC_SHIMMER_TOKEN_SEC);
        $spellTokens = min($spellMax, (float) ($prev['spellTokens'] ?? $spellMax) + $dt / DespertarCatalog::SYNC_SPELL_TOKEN_SEC);

        $shimmersCredited = min(max(0, $shimmersClaimed), (int) floor($shimmerTokens));
        $spellsCredited = min(max(0, $spellsClaimed), (int) floor($spellTokens));
        $shimmerTokens -= $shimmersCredited;
        $spellTokens -= $spellsCredited;

        $perShimmer = self::syncShimmerBonusSec($catabaseActive);
        $spsCap = $perShimmer * DespertarCatalog::SYNC_BONUS_BUCKET_SHIMMERS
            + (float) DespertarCatalog::SYNC_WINDFALL_SPS_SEC * DespertarCatalog::SYNC_SPELL_TOKEN_MAX;
        $clickCap = self::syncClickBonusSec() * DespertarCatalog::SYNC_BONUS_BUCKET_SHIMMERS;
        // Sem estado anterior (primeiro sync / pós-reset) o balde começa cheio: nunca pune o 1º sync.
        $bonusSps = isset($prev['bonusSpsSec']) ? (float) $prev['bonusSpsSec'] : $spsCap;
        $bonusClick = isset($prev['bonusClickSec']) ? (float) $prev['bonusClickSec'] : $clickCap;
        $bonusSps += $dt * (float) DespertarCatalog::SYNC_BONUS_REFILL_PER_SEC
            + $shimmersCredited * $perShimmer
            + $spellsCredited * (float) DespertarCatalog::SYNC_WINDFALL_SPS_SEC;
        $bonusClick += $shimmersCredited * self::syncClickBonusSec();

        return [
            'shimmerTokens' => $shimmerTokens,
            'spellTokens' => $spellTokens,
            'shimmersCredited' => $shimmersCredited,
            'spellsCredited' => $spellsCredited,
            'bonusSpsSec' => min($spsCap, $bonusSps),
            'bonusClickSec' => min($clickCap, $bonusClick),
        ];
    }

    /**
     * Ganho plausível de uma janela de sync, separado em base da janela e no valor (em almas)
     * de cada segundo do balde de bônus. Base: SPS × tempo com Frenesi de Néctar (×3) e buffs
     * ativos, cliques a 20/s, sanguessugas (já digerido + digestão possível), estoque do Mercado.
     *
     * @param array{
     *   sps: string, clickPower: string, dtSec: float,
     *   carriedSpsMult?: string, carriedClickMult?: string, catabaseActive?: bool,
     *   leechDigested?: string, marketSpsSeconds?: string
     * } $ctx
     * @return array{base: string, spsUnit: string, clickUnit: string}
     */
    public static function syncWindowAllowance(array $ctx): array
    {
        $sps = DespertarDecimal::decimalString($ctx['sps'] ?? '0', '0');
        $click = DespertarDecimal::decimalString($ctx['clickPower'] ?? '0', '0');
        $dtRaw = (float) ($ctx['dtSec'] ?? 0);
        $dt = is_finite($dtRaw) && $dtRaw > 0 ? number_format($dtRaw, 3, '.', '') : '0';
        $carriedSps = DespertarDecimal::decimalString($ctx['carriedSpsMult'] ?? '1', '1');
        $carriedClick = DespertarDecimal::decimalString($ctx['carriedClickMult'] ?? '1', '1');

        $spsUnit = DespertarDecimal::mul(DespertarDecimal::mul($sps, DespertarCatalog::NECTAR_FRENZY_MULT), $carriedSps);
        $clickUnit = DespertarDecimal::mul(DespertarDecimal::mul($click, (string) DespertarCatalog::CLICK_CAP_PER_SECOND), $carriedClick);

        $base = DespertarDecimal::add(DespertarCatalog::SYNC_CEILING_FLOOR, DespertarDecimal::mul($spsUnit, $dt));
        $base = DespertarDecimal::add($base, DespertarDecimal::mul($clickUnit, $dt));

        $leechDigested = DespertarDecimal::decimalString($ctx['leechDigested'] ?? '0', '0');
        $base = DespertarDecimal::add($base, DespertarDecimal::mul($leechDigested, DespertarCatalog::SYNC_LEECH_PAYOUT_MAX));
        if (!empty($ctx['catabaseActive'])) {
            // n² do CC: cada sanguessuga acumula o dreno total (até 14 × 5%).
            $maxDrain = DespertarDecimal::mul(DespertarCatalog::LEECH_DRAIN_PER_UNIT, (string) DespertarCatalog::LEECH_MAX_CAP);
            $digestRate = DespertarDecimal::mul(DespertarDecimal::mul($sps, $maxDrain), (string) DespertarCatalog::LEECH_MAX_CAP);
            $base = DespertarDecimal::add(
                $base,
                DespertarDecimal::mul(DespertarDecimal::mul($digestRate, $dt), DespertarCatalog::SYNC_LEECH_PAYOUT_MAX)
            );
        }

        $marketSec = DespertarDecimal::decimalString($ctx['marketSpsSeconds'] ?? '0', '0');
        $base = DespertarDecimal::add($base, DespertarDecimal::mul($spsUnit, $marketSec));

        return [
            'base' => DespertarDecimal::money($base),
            'spsUnit' => $spsUnit,
            'clickUnit' => $clickUnit,
        ];
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
        $upById = DespertarCatalog::upgradesById();
        $hasF1Upgrade = false;
        foreach ($upgrades as $uid) {
            $k = $upById[(string) $uid]['kind'] ?? '';
            if ($k === 'synergyMult' || $k === 'thousandBlades' || $k === 'thousandBladesMult') {
                $hasF1Upgrade = true;
                break;
            }
        }
        $pairs15Count = 0;
        foreach ($generators as $qty) {
            if ((int) $qty >= 15) {
                $pairs15Count++;
            }
        }
        if ($hasF1Upgrade || $pairs15Count >= 2 || ($ownedFive && count($upgrades) >= 1)) {
            $eligible['log_synergy_blades'] = true;
        }
        $stats = is_array($state['stats'] ?? null) ? $state['stats'] : [];
        $shimmersClicked = (int) ($state['shimmersClicked'] ?? $stats['shimmersClicked'] ?? $stats['shimmers_clicked'] ?? 0);
        $activeBuffs = is_array($state['activeBuffs'] ?? null) ? $state['activeBuffs'] : [];
        if (
            $shimmersClicked >= 1
            || !empty($milestones['shimmerClicked'])
            || count($activeBuffs) > 0
            || ($ownedFive && count($upgrades) >= 1 && $prestigeCount >= 1)
        ) {
            $eligible['log_shimmer_echo'] = true;
        }
        $hasT7Plus = false;
        foreach (['mnemosyne_temple', 'styx_tower', 'star_barge', 'tartarus_lab', 'erebus_portal', 'chronos_loom'] as $gid) {
            if (((int) ($generators[$gid] ?? 0)) >= 1) {
                $hasT7Plus = true;
                break;
            }
        }
        if (
            $hasT7Plus
            || !empty($milestones['temple'])
            || DespertarDecimal::cmp($lifetime, '5000000') >= 0
            || ($ownedFive && count($upgrades) >= 1 && $prestigeCount >= 1)
        ) {
            $eligible['log_midgame_payoff'] = true;
        }
        $generatorLevels = is_array($state['generatorLevels'] ?? null)
            ? $state['generatorLevels']
            : (is_array($milestones['f5Nectar']['generatorLevels'] ?? null) ? $milestones['f5Nectar']['generatorLevels'] : []);
        $hasAnyLevel = false;
        foreach ($generatorLevels as $lv) {
            if ((int) $lv >= 1) {
                $hasAnyLevel = true;
                break;
            }
        }
        $totalNectar = (int) ($state['totalNectarHarvested'] ?? $milestones['f5Nectar']['totalNectarHarvested'] ?? 0);
        if (
            $hasAnyLevel
            || $totalNectar >= 1
            || !empty($milestones['nectarUnlocked'])
            || DespertarDecimal::cmp($lifetime, DespertarCatalog::NECTAR_UNLOCK_LIFETIME_SOULS) >= 0
            || ($ownedFive && count($upgrades) >= 1 && $prestigeCount >= 1)
        ) {
            $eligible['log_nectar_minigames'] = true;
        }
        $hasPupUpgrade = false;
        foreach ($upgrades as $uid) {
            $k = $upById[(string) $uid]['kind'] ?? '';
            if ($k === 'veilMult' || $k === 'kittenMult') {
                $hasPupUpgrade = true;
                break;
            }
        }
        $achList = is_array($state['achievements'] ?? null) ? $state['achievements'] : [];
        if (
            $hasPupUpgrade
            || self::veilPercent($achList) >= 12
            || DespertarDecimal::cmp($lifetime, '100') >= 0
            || ($ownedFive && count($upgrades) >= 1)
        ) {
            $eligible['log_veil_kittens'] = true;
        }
        $f6Cat = is_array($state['catabase'] ?? null)
            ? $state['catabase']
            : (is_array($milestones['f6Catabase'] ?? null) ? $milestones['f6Catabase'] : []);
        $leechesPoppedLog = (int) ($state['leechesPopped'] ?? $f6Cat['leechesPopped'] ?? $stats['leechesPopped'] ?? $stats['leeches_popped'] ?? 0);
        if (
            ((int) ($f6Cat['stage'] ?? 0)) >= 1
            || count(is_array($f6Cat['leeches'] ?? null) ? $f6Cat['leeches'] : []) >= 1
            || $leechesPoppedLog >= 1
            || in_array('concilio_das_moiras', $upgrades, true)
            || (((int) ($generators['charon_servants'] ?? 0)) >= 7 && count($upgrades) >= 1)
        ) {
            $eligible['log_catabase_wrinklers'] = true;
        }
        $hasT13Plus = false;
        foreach (['void_condenser', 'moirai_prism', 'fate_forge', 'fractal_engine', 'oracle_console', 'chthonic_idleverse', 'cortex_baker', 'the_emperor'] as $gid) {
            if (((int) ($generators[$gid] ?? 0)) >= 1) {
                $hasT13Plus = true;
                break;
            }
        }
        if (
            $hasT13Plus
            || DespertarDecimal::cmp($lifetime, '100000000000000') >= 0
            || ($ownedFive && count($upgrades) >= 1 && $prestigeCount >= 1)
        ) {
            $eligible['log_late_bignum_payoff'] = true;
        }
        $f8Dragon = is_array($state['dragon'] ?? null)
            ? $state['dragon']
            : (is_array($milestones['f8Dragon'] ?? null) ? $milestones['f8Dragon'] : []);
        $f8Seasons = is_array($state['seasons'] ?? null)
            ? $state['seasons']
            : (is_array($milestones['f8Seasons'] ?? null) ? $milestones['f8Seasons'] : []);
        $f8Fortunes = is_array($state['fortunes'] ?? null)
            ? $state['fortunes']
            : (is_array($milestones['f8Fortunes'] ?? null) ? $milestones['f8Fortunes'] : []);
        $talents = is_array($state['talents'] ?? null) ? $state['talents'] : [];
        if (
            ((int) ($f8Dragon['stage'] ?? 0)) >= 1
            || !empty($f8Seasons['activeSeason'])
            || count(is_array($f8Fortunes['claimedIds'] ?? null) ? $f8Fortunes['claimedIds'] : []) >= 1
            || !empty($milestones['generatorSold'])
            || ((int) ($state['generatorsSold'] ?? $stats['generatorsSold'] ?? 0)) >= 1
            || in_array('ovo_primordial', $talents, true)
            || in_array('rodizio_das_estacoes', $talents, true)
            || ($ownedFive && count($upgrades) >= 1 && $prestigeCount >= 1)
        ) {
            $eligible['log_incremental_architecture_f8'] = true;
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
            'achievements' => $unlocked,
            'dragon' => is_array($state['dragon'] ?? null) ? $state['dragon'] : (is_array($milestones['f8Dragon'] ?? null) ? $milestones['f8Dragon'] : []),
            'seasons' => is_array($state['seasons'] ?? null) ? $state['seasons'] : (is_array($milestones['f8Seasons'] ?? null) ? $milestones['f8Seasons'] : []),
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

        $allGensT1T6 = true;
        $allGensT1T20 = true;
        foreach (DespertarCatalog::GENERATORS as $def) {
            if (((int) ($generators[$def['id']] ?? 0)) < 1) {
                $allGensT1T20 = false;
                if ((int) ($def['tier'] ?? 0) <= 6) {
                    $allGensT1T6 = false;
                }
            }
        }
        $take('despertar_soberania', $allGensT1T6);
        $take('despertar_vinte_rios', $allGensT1T20);

        foreach (DespertarCatalog::DESPERTAR_GENERATOR_MILESTONE_ACHIEVEMENTS as $genId => $thresholds) {
            $haveQty = (int) ($generators[$genId] ?? 0);
            foreach ($thresholds as $minQty => $achId) {
                $take($achId, $haveQty >= (int) $minQty);
            }
        }

        // --- Fase F5: Conquistas de Néctar, Níveis de Gerador e Minigames ---
        $f5Nectar = is_array($milestones['f5Nectar'] ?? null) ? $milestones['f5Nectar'] : [];
        $generatorLevels = is_array($state['generatorLevels'] ?? null)
            ? $state['generatorLevels']
            : (is_array($f5Nectar['generatorLevels'] ?? null) ? $f5Nectar['generatorLevels'] : []);
        $totalNectarHarvested = (int) ($state['totalNectarHarvested'] ?? $f5Nectar['totalNectarHarvested'] ?? 0);
        $maxGenLevel = 0;
        foreach ($generatorLevels as $lv) {
            if ((int) $lv > $maxGenLevel) {
                $maxGenLevel = (int) $lv;
            }
        }
        $take('despertar_nectar_primeiro', $totalNectarHarvested >= 1 || !empty($milestones['nectarHarvested']));
        $take('despertar_nivel_1', $maxGenLevel >= 1);
        $take('despertar_nivel_10', $maxGenLevel >= 10);
        $take('despertar_minigame_panteao', ((int) ($generatorLevels['mnemosyne_temple'] ?? 0)) >= 1);
        $take('despertar_minigame_grimorio', ((int) ($generatorLevels['styx_tower'] ?? 0)) >= 1);
        $take('despertar_minigame_jardim', ((int) ($generatorLevels['cerberian_hound'] ?? 0)) >= 1);
        $take('despertar_minigame_mercado', ((int) ($generatorLevels['obsidian_throne'] ?? 0)) >= 1);

        $juizoBest = (int) ($state['juizoBestStreak'] ?? 0);
        foreach (DespertarCatalog::DESPERTAR_JUIZO_STREAK_THRESHOLDS as $id => $threshold) {
            $take($id, $juizoBest >= $threshold);
        }
        $take('despertar_veredito', count($verdictPurchases) >= 1);

        $take('despertar_cem_almas', DespertarDecimal::cmp($lifetime, '100') >= 0);
        $take('despertar_mil_almas', DespertarDecimal::cmp($lifetime, '1000') >= 0);
        $take('despertar_milhao', DespertarDecimal::cmp($lifetime, '1000000') >= 0);
        $take('despertar_bilhao', DespertarDecimal::cmp($lifetime, '1000000000') >= 0);
        $take('despertar_trilhao', DespertarDecimal::cmp($lifetime, '1000000000000') >= 0);
        $take('despertar_almas_1e21', DespertarDecimal::cmp($lifetime, '1000000000000000000000') >= 0);
        $take('despertar_almas_1e30', DespertarDecimal::cmp($lifetime, '1000000000000000000000000000000') >= 0);

        $take('despertar_sps_100', DespertarDecimal::cmp($sps, '100') >= 0);
        $take('despertar_sps_10k', DespertarDecimal::cmp($sps, '10000') >= 0);
        $take('despertar_sps_1m', DespertarDecimal::cmp($sps, '1000000') >= 0);
        $take('despertar_sps_1b', DespertarDecimal::cmp($sps, '1000000000') >= 0);
        $take('despertar_sps_1e15', DespertarDecimal::cmp($sps, '1000000000000000') >= 0);
        $take('despertar_sps_1e21', DespertarDecimal::cmp($sps, '1000000000000000000000') >= 0);

        $stats = is_array($state['stats'] ?? null) ? $state['stats'] : [];
        $clicks = (int) ($state['clickCount'] ?? $stats['clicks'] ?? 0);
        $shimmersClicked = (int) ($state['shimmersClicked'] ?? $stats['shimmersClicked'] ?? $stats['shimmers_clicked'] ?? 0);
        $wrathClicked = (int) ($state['wrathClicked'] ?? $stats['wrathClicked'] ?? $stats['wrath_clicked'] ?? 0);

        $take('despertar_cliques_100', $clicks >= 100);
        $take('despertar_cliques_1000', $clicks >= 1000);
        $take('despertar_eco_1', $shimmersClicked >= 1 || !empty($milestones['shimmerClicked']));
        $take('despertar_eco_7', $shimmersClicked >= 7);
        $take('despertar_eco_27', $shimmersClicked >= 27);
        $take('despertar_eco_colerico', $wrathClicked >= 1);

        $take('despertar_styx_primeiro', count($upgrades) >= 1);
        $take('despertar_styx_cinco', count($upgrades) >= 5);

        $shinySum = array_sum(array_map('intval', $shinyCounts));
        $goldSum = array_sum(array_map('intval', $goldCounts));
        $take('despertar_shiny', $shinySum >= 1);
        $take('despertar_gold', $goldSum >= 1);
        $take('despertar_catabase_3', $prestigeCount >= 3);
        $take('despertar_catabase_5', $prestigeCount >= 5);

        $upById = DespertarCatalog::upgradesById();
        $hasPupUpgrade = false;
        foreach ($upgrades as $uid) {
            $k = $upById[(string) $uid]['kind'] ?? '';
            if ($k === 'veilMult' || $k === 'kittenMult') {
                $hasPupUpgrade = true;
                break;
            }
        }
        $take('despertar_filhote_primeiro', $hasPupUpgrade);

        // --- Fase F6: Catábase das Avós & Sanguessugas do Acheron ---
        $f6Cat = is_array($state['catabase'] ?? null)
            ? $state['catabase']
            : (is_array($milestones['f6Catabase'] ?? null) ? $milestones['f6Catabase'] : []);
        $ownedUpSet = array_flip(array_map('strval', $upgrades));
        $structStage = isset($ownedUpSet['pacto_primordial'])
            ? 3
            : (isset($ownedUpSet['comunhao_abissal']) ? 2 : (isset($ownedUpSet['despertar_ctoniano']) ? 1 : 0));
        $catStage = max((int) ($f6Cat['stage'] ?? 0), $structStage);
        $leechesPopped = max(
            0,
            (int) ($state['leechesPopped'] ?? $f6Cat['leechesPopped'] ?? $stats['leechesPopped'] ?? $stats['leeches_popped'] ?? 0)
        );
        $shinyLeechesPopped = max(
            0,
            (int) ($state['shinyLeechesPopped'] ?? $f6Cat['shinyLeechesPopped'] ?? $stats['shinyLeechesPopped'] ?? $stats['shiny_leeches_popped'] ?? 0)
        );
        $pledgesCount = (int) ($f6Cat['pledgesCount'] ?? 0);
        $covenantActive = !empty($f6Cat['covenantActive']);
        $covenantActivations = max(
            (int) ($f6Cat['covenantActivations'] ?? 0),
            $covenantActive ? 1 : 0
        );

        $take('despertar_catabase_avos_1', $catStage >= 1);
        $take('despertar_catabase_avos_2', $catStage >= 2);
        $take('despertar_catabase_avos_3', $catStage >= 3);
        $take('despertar_sanguessuga_1', $leechesPopped >= 1);
        $take('despertar_sanguessuga_50', $leechesPopped >= 50);
        $take('despertar_sanguessuga_200', $leechesPopped >= 200);
        $take('despertar_sanguessuga_shiny', $shinyLeechesPopped >= 1);
        $take('despertar_tregua_estigia', $pledgesCount >= 1);
        $take('despertar_alianca_eterna', $covenantActivations >= 1);

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

        // --- Fase F8: Dragão Ctoniano, 4 Estações, Fortunas de Hermes e Venda ---
        $f8Dragon = is_array($state['dragon'] ?? null)
            ? $state['dragon']
            : (is_array($milestones['f8Dragon'] ?? null) ? $milestones['f8Dragon'] : []);
        $dragonStage = max(0, (int) ($f8Dragon['stage'] ?? 0));
        $take('despertar_dragao_filhote', $dragonStage >= 1);
        $take('despertar_dragao_ladao', $dragonStage >= 4);

        $f8Seasons = is_array($state['seasons'] ?? null)
            ? $state['seasons']
            : (is_array($milestones['f8Seasons'] ?? null) ? $milestones['f8Seasons'] : []);
        $seasonSwitches = max(0, (int) ($f8Seasons['switchesCount'] ?? 0));
        $saturnLv = max(0, (int) ($f8Seasons['saturnKingLevel'] ?? 0));
        $allSeasonalDropsOwned = true;
        foreach (DespertarCatalog::ALL_SEASONAL_DROP_UPGRADE_IDS as $did) {
            if (!isset($ownedUpSet[$did])) {
                $allSeasonalDropsOwned = false;
                break;
            }
        }
        $take('despertar_estacoes_4', $seasonSwitches >= 4);
        $take('despertar_reliquias_sazonais', $allSeasonalDropsOwned);
        $take('despertar_rei_saturno_5', $saturnLv >= 5);

        $f8Fortunes = is_array($state['fortunes'] ?? null)
            ? $state['fortunes']
            : (is_array($milestones['f8Fortunes'] ?? null) ? $milestones['f8Fortunes'] : []);
        $claimedFortunes = is_array($f8Fortunes['claimedIds'] ?? null) ? $f8Fortunes['claimedIds'] : [];
        $lifetimeFortunes = is_array($f8Fortunes['lifetimeClaimedIds'] ?? null) ? $f8Fortunes['lifetimeClaimedIds'] : $claimedFortunes;
        $ownedFortuneCount = 0;
        foreach (DespertarCatalog::FORTUNE_IDS as $fid) {
            if (isset($ownedUpSet[$fid])) {
                $ownedFortuneCount++;
            }
        }
        $totalFortunes = max(count($claimedFortunes), count($lifetimeFortunes), $ownedFortuneCount);
        $take('despertar_fortuna_1', $totalFortunes >= 1);
        $take('despertar_o_fortuna', $totalFortunes >= count(DespertarCatalog::FORTUNE_IDS));
        $take(
            'despertar_mercador_acheron',
            !empty($milestones['generatorSold']) || ((int) ($state['generatorsSold'] ?? $stats['generatorsSold'] ?? 0)) >= 1
        );

        $eligible = self::computeEligibleEduLogs($state, $syncOk);
        $seen = self::sanitizeEduLogsSeen($state['eduLogsSeen'] ?? [], $state, $syncOk);
        $totalLogs = count(DespertarCatalog::EDU_LOG_IDS);
        $take('despertar_arquiteto_do_loop', count($eligible) === $totalLogs && count($seen) === $totalLogs);

        // --- Véu volume (gen-despertar-veil-achievements.mjs) ---
        $pupSet = array_flip(DespertarCatalog::CERBERUS_PUP_UPGRADE_IDS);
        $pupOwned = 0;
        foreach ($upgrades as $uid) {
            if (isset($pupSet[(string) $uid])) {
                $pupOwned++;
            }
        }
        $offlineHours = max(0, (int) ($state['offlineSecondsAccumulated'] ?? $stats['offline_seconds'] ?? $stats['offlineSeconds'] ?? 0)) / 3600;
        $totalNectarVol = max((int) ($state['totalNectarHarvested'] ?? $f5Nectar['totalNectarHarvested'] ?? 0), 0);
        $take('despertar_prestigio_10', $prestigeCount >= 10);
        $take('despertar_prestigio_25', $prestigeCount >= 25);
        $take('despertar_prestigio_50', $prestigeCount >= 50);
        $take('despertar_prestigio_100', $prestigeCount >= 100);
        $take('despertar_filhotes_3', $pupOwned >= 3);
        $take('despertar_filhotes_5', $pupOwned >= 5);
        $take('despertar_filhotes_8', $pupOwned >= 8);
        $take('despertar_filhotes_10', $pupOwned >= 10);
        $take('despertar_filhotes_15', $pupOwned >= 15);
        $take('despertar_ausencia_10h', $offlineHours >= 10);
        $take('despertar_ausencia_24h', $offlineHours >= 24);
        $take('despertar_ausencia_72h', $offlineHours >= 72);
        $take('despertar_cliques_10k', $clicks >= 10000);
        $take('despertar_cliques_100k', $clicks >= 100000);
        $take('despertar_talentos_25', count($talents) >= 25);
        $take('despertar_talentos_50', count($talents) >= 50);
        $take('despertar_talentos_100', count($talents) >= 100);
        $take('despertar_melhorias_50', count($upgrades) >= 50);
        $take('despertar_melhorias_100', count($upgrades) >= 100);
        $take('despertar_melhorias_150', count($upgrades) >= 150);
        $take('despertar_juizo_50', $juizoBest >= 50);
        $take('despertar_juizo_100', $juizoBest >= 100);
        $take('despertar_almas_1e39', DespertarDecimal::cmp($lifetime, '1000000000000000000000000000000000000000') >= 0);
        $take('despertar_sps_1e27', DespertarDecimal::cmp($sps, '1000000000000000000000000000') >= 0);
        $take('despertar_sps_1e33', DespertarDecimal::cmp($sps, '1000000000000000000000000000000000') >= 0);
        $take('despertar_ecos_777', $shimmersClicked >= 777);
        $take('despertar_nectar_100', $totalNectarVol >= 100);
        $take('despertar_nectar_1000', $totalNectarVol >= 1000);
        $take('despertar_sanguessuga_500', $leechesPopped >= 500);
        $take('despertar_sanguessuga_1000', $leechesPopped >= 1000);
        $take('despertar_prestigio_200', $prestigeCount >= 200);
        $take('despertar_cliques_1m', $clicks >= 1000000);
        $take('despertar_ausencia_168h', $offlineHours >= 168);

        return $earned;
    }
}
