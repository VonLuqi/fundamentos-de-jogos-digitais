<?php
/**
 * Anti-bot do Juízo — simulação de humanos e bots no núcleo puro (JuizoGuard::observe/score), sem banco.
 * Humano NUNCA pode ser banido; bot tem que ser. Rodado por tests/despertar-juizo-guard-smoke.mjs.
 */
declare(strict_types=1);

require dirname(__DIR__) . '/backend/bootstrap.php';

use App\Services\Despertar\JuizoGuard as G;

mt_srand(20261102);
$fail = 0;
$ok = static function (string $label, bool $cond, string $detail = '') use (&$fail): void {
    echo ($cond ? '[PASS] ' : '[FAIL] ') . $label . ($detail !== '' ? " — {$detail}" : '') . PHP_EOL;
    $fail += $cond ? 0 : 1;
};

$T0 = 1_793_000_000_000; // ms, instante arbitrário

const UAS_HUMAN = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
];

/** Latência humana: log-normal entre ~1,5 s e ~8 s, com cauda ocasional (distração). */
$humanLatency = static function (float $medianMs = 3200.0, float $sigma = 0.45): int {
    $u1 = max(1e-9, mt_rand() / mt_getrandmax());
    $u2 = mt_rand() / mt_getrandmax();
    $z = sqrt(-2 * log($u1)) * cos(2 * M_PI * $u2);
    $v = $medianMs * exp($sigma * $z);
    if (mt_rand(0, 99) < 4) {
        $v += mt_rand(15000, 90000); // olhou o celular
    }
    return (int) max(900, min(120000, $v));
};

/**
 * Simula uma sequência de $n palpites. $profile ajusta cada contexto.
 * @return array{banned: bool, bannedAt: ?int, maxScore: float, state: array}
 */
$simulate = static function (int $n, callable $ctxFor, int $startMs) use ($T0): array {
    $state = G::emptyState();
    $now = $startMs;
    $max = 0.0;
    // início da corrida
    [$state, , $score] = G::observe($state, $ctxFor(0, $now, false, null));
    $max = max($max, $score);
    if ($score >= G::THRESHOLD) {
        return ['banned' => true, 'bannedAt' => 0, 'maxScore' => $max, 'state' => $state];
    }
    for ($i = 1; $i <= $n; $i++) {
        [$now, $lat] = $ctxFor(-$i, $now, true, null); // pede o próximo (now, latência)
        [$state, , $score] = G::observe($state, $ctxFor($i, $now, true, $lat));
        $max = max($max, $score);
        if ($score >= G::THRESHOLD) {
            return ['banned' => true, 'bannedAt' => $i, 'maxScore' => $max, 'state' => $state];
        }
    }
    return ['banned' => false, 'bannedAt' => null, 'maxScore' => $max, 'state' => $state];
};

/** Contexto de navegador real. $mode: 'full' (Sec-Fetch + Origin), 'oldsafari' (só Origin), 'stripped' (nenhum). */
$browserCtx = static function (string $ua, string $mode, bool $withClientFlags, callable $latGen, callable $gapGen) {
    return static function (int $i, int $now, bool $isGuess, ?int $lat) use ($ua, $mode, $withClientFlags, $latGen, $gapGen): array {
        if ($i < 0) { // pedido de "quando e quanto": devolve [agoraNovo, latência]
            $lat = $latGen();
            return [$now + $gapGen($lat), $lat];
        }
        return [
            'nowMs' => $now,
            'isGuess' => $isGuess,
            'userAgent' => $ua,
            'secFetchSite' => $mode === 'full' ? 'same-origin' : null,
            'origin' => $mode === 'stripped' ? null : 'https://fundamentos.example',
            'latencyMs' => $isGuess ? $lat : null,
            'client' => $withClientFlags ? ['webdriver' => false, 'trusted' => true] : [],
        ];
    };
};

// ─── HUMANOS: nunca banidos ─────────────────────────────────────────────────
$humanBans = 0;
$humanMax = 0.0;
$runs = 0;
foreach (UAS_HUMAN as $ui => $ua) {
    foreach (['full', 'oldsafari', 'stripped'] as $mode) {
        foreach ([true, false] as $flags) { // false = JS antigo em cache (não manda flags)
            foreach ([['median' => 3200.0, 'sigma' => 0.45, 'gap' => 0], ['median' => 1800.0, 'sigma' => 0.35, 'gap' => 0], ['median' => 6500.0, 'sigma' => 0.5, 'gap' => 0]] as $p) {
                $ctx = $browserCtx($ua, $mode, $flags,
                    static fn() => $humanLatency($p['median'], $p['sigma']),
                    static fn(int $lat) => $lat + mt_rand(150, 700)); // tempo de render/rede entre palpites
                $r = $simulate(500, $ctx, $T0 + $ui * 1000);
                $runs++;
                $humanBans += $r['banned'] ? 1 : 0;
                $humanMax = max($humanMax, $r['maxScore']);
            }
        }
    }
}
$ok("Humanos ({$runs} sessões de 500 palpites: Chrome/Safari/Firefox/Edge/Samsung, desktop e mobile, com e sem Sec-Fetch, JS antigo): ninguém banido",
    $humanBans === 0, "banidos={$humanBans} maiorPontuação=" . round($humanMax, 2) . " limiar=" . G::THRESHOLD);

// Aluno MUITO bom e rápido: 0,7–1,4 s por palpite, 800 palpites sem pausa (≈ 15 min), depois 5 h contínuas.
$fast = $browserCtx(UAS_HUMAN[0], 'full', true, static fn() => mt_rand(700, 1400), static fn(int $lat) => $lat + mt_rand(100, 300));
$r = $simulate(800, $fast, $T0);
$ok('Aluno bom e rápido (0,7–1,4 s, 800 acertos sem pausa): não é banido', !$r['banned'], 'maxScore=' . round($r['maxScore'], 2));
$long = $browserCtx(UAS_HUMAN[1], 'oldsafari', false, static fn() => mt_rand(900, 2500), static fn(int $lat) => $lat + mt_rand(100, 4000));
$r = $simulate(9000, $long, $T0); // ~ 5 h de jogo contínuo, Safari antigo, JS antigo: pior caso de sinais médios
$ok('Pior caso humano (Safari antigo + JS antigo + 5 h sem parar + sem pausa): só sinais médios, não é banido',
    !$r['banned'], 'maxScore=' . round($r['maxScore'], 2) . ' kinds=' . implode(',', array_keys($r['state']['kinds'])));

// Um único palpite impossível de rápido (duplo toque/lag) não bane sozinho.
$st = G::emptyState();
[$st, $fired, $sc] = G::observe($st, ['nowMs' => $T0, 'isGuess' => true, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => 'same-origin', 'origin' => 'x', 'latencyMs' => 120, 'client' => ['webdriver' => false, 'trusted' => true]]);
$ok('Um palpite < 350 ms isolado marca o sinal mas NÃO bane', in_array('fast_latency', $fired, true) && $sc < G::THRESHOLD, "score={$sc}");

// ─── BOTS: banidos ──────────────────────────────────────────────────────────
$pyHeaders = static function (string $ua, int|callable $latFn, int $gap): callable {
    return static function (int $i, int $now, bool $isGuess, ?int $lat) use ($ua, $latFn, $gap): array {
        if ($i < 0) {
            $l = is_callable($latFn) ? $latFn() : $latFn;
            return [$now + $gap, $l];
        }
        return ['nowMs' => $now, 'isGuess' => $isGuess, 'userAgent' => $ua, 'secFetchSite' => null, 'origin' => null, 'latencyMs' => $isGuess ? $lat : null, 'client' => []];
    };
};
$r = $simulate(200, $pyHeaders('python-requests/2.31.0', 1200, 1300), $T0);
$ok('Bot requests (UA python-requests, sem Sec-Fetch, latência fixa): banido já no início', $r['banned'] && $r['bannedAt'] === 0);
foreach (['python-httpx/0.27.0', 'aiohttp/3.9.5', 'Python-urllib/3.12', 'curl/8.5.0', 'Go-http-client/2.0', 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/130.0.0.0 Safari/537.36', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)', 'axios/1.7.2'] as $botUa) {
    $r = $simulate(5, $pyHeaders($botUa, 1500, 1600), $T0);
    $ok("Bot com UA {$botUa}: banido", $r['banned']);
}
// UA de Chrome falsificado, sem Sec-Fetch/Origin, latência ~fixa (script que imita o navegador): cai no ritmo regular (25 palpites).
$spoof = $pyHeaders(UAS_HUMAN[0], static fn() => 2000 + mt_rand(-20, 20), 2100);
$r = $simulate(200, $spoof, $T0);
$ok('Bot com UA de Chrome falsificado, sem Sec-Fetch e latência quase fixa: banido no 25º palpite (ritmo regular)', $r['banned'] && $r['bannedAt'] === 25, 'bannedAt=' . var_export($r['bannedAt'], true));
// Navegador automatizado (Selenium/Playwright padrão): webdriver=true.
$wd = static function (int $i, int $now, bool $isGuess, ?int $lat): array {
    if ($i < 0) { return [$now + mt_rand(2500, 4200), mt_rand(2000, 3600)]; }
    return ['nowMs' => $now, 'isGuess' => $isGuess, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => 'same-origin', 'origin' => 'x', 'latencyMs' => $isGuess ? $lat : null, 'client' => ['webdriver' => true, 'trusted' => true]];
};
$r = $simulate(50, $wd, $T0);
$ok('Navegador automatizado com navigator.webdriver=true (latência humana): banido no 1º sinal', $r['banned'] && $r['bannedAt'] === 0);
// Bot com latência impossível (< 350 ms), tudo o mais perfeito: precisa de 2 palpites.
$fastBot = static function (int $i, int $now, bool $isGuess, ?int $lat): array {
    if ($i < 0) { return [$now + 600, mt_rand(60, 300)]; }
    return ['nowMs' => $now, 'isGuess' => $isGuess, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => 'same-origin', 'origin' => 'x', 'latencyMs' => $isGuess ? $lat : null, 'client' => ['webdriver' => false, 'trusted' => true]];
};
$r = $simulate(50, $fastBot, $T0);
$ok('Bot com latência < 350 ms: banido no 2º palpite rápido (um só não bane)', $r['banned'] && $r['bannedAt'] === 2, 'bannedAt=' . var_export($r['bannedAt'], true));
// Cliente com eventos sintéticos (isTrusted=false) + sem cabeçalhos + 60 palpites sem pausa: sinais médios SOMADOS.
$synth = static function (int $i, int $now, bool $isGuess, ?int $lat): array {
    if ($i < 0) { return [$now + mt_rand(2800, 9000), mt_rand(2500, 8500)]; }
    return ['nowMs' => $now, 'isGuess' => $isGuess, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => null, 'origin' => null, 'latencyMs' => $isGuess ? $lat : null, 'client' => ['webdriver' => false, 'trusted' => false]];
};
$r = $simulate(400, $synth, $T0);
$ok('Cliente sem cabeçalhos + cliques sintéticos + 60 palpites sem pausa (3 médios = 10): AINDA não bane (conservador)',
    !$r['banned'] && $r['maxScore'] >= 9.9 && $r['maxScore'] < G::THRESHOLD, 'maxScore=' . round($r['maxScore'], 2));
$r = $simulate(6000, $synth, $T0);
$ok('O mesmo cliente, quando a sessão contínua passa de 4 h (4º médio), soma 12 e é banido',
    $r['banned'] && $r['bannedAt'] !== null && $r['bannedAt'] > 1500, 'bannedAt=' . var_export($r['bannedAt'], true));

// ─── Regras de agregação ─────────────────────────────────────────────────────
$st = G::emptyState();
[$st, , $sc] = G::observe($st, ['nowMs' => $T0, 'isGuess' => true, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => null, 'origin' => null, 'latencyMs' => 3000, 'client' => ['trusted' => false]]);
$ok('Sinais médios isolados (sem cabeçalhos + evento não confiável = 7) NÃO banem', $sc > 0 && $sc < G::THRESHOLD, "score={$sc}");
$strong = G::observe(G::emptyState(), ['nowMs' => $T0, 'isGuess' => false, 'userAgent' => 'python-requests/2.31', 'client' => []]);
$later = G::score($strong[0], $T0 + 3600 * 1000);
$ok('A pontuação decai com o tempo (meia-vida de 1 h)', abs($later - $strong[2] / 2) < 0.01, "agora={$strong[2]} 1h depois={$later}");
$a = G::observe(G::emptyState(), ['nowMs' => $T0, 'isGuess' => true, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => 'same-origin', 'origin' => 'x', 'latencyMs' => 100, 'client' => []]);
$b = G::observe($a[0], ['nowMs' => $T0 + 3 * 3600 * 1000, 'isGuess' => true, 'userAgent' => UAS_HUMAN[0], 'secFetchSite' => 'same-origin', 'origin' => 'x', 'latencyMs' => 100, 'client' => []]);
$ok('Dois palpites rápidos com 3 h de intervalo não bastam (decaiu)', $b[2] < G::THRESHOLD, "score={$b[2]}");
$msg = G::banMessage('2026-11-03T05:15:00.000Z');
$ok('Mensagem do ban mostra a hora de liberação em horário de Brasília', str_contains($msg, '03/11 às 02:15') && str_contains($msg, 'horário de Brasília'), $msg);

echo PHP_EOL . 'juizo-guard-unit: ' . ($fail === 0 ? 'ok' : "{$fail} falha(s)") . PHP_EOL;
exit($fail > 0 ? 1 : 0);
