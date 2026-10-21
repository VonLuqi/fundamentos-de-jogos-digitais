<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Http;
use App\Services\SessionService;
use PDO;
use Throwable;

/**
 * Controller de `/api/classind` (`api/classind.js` + `js/classind-dle/config/rounds.js`).
 * Na HostGator (MySQL), `realtime` retorna `null` para que o cliente (`js/classind-dle/index.js`)
 * utilize nativamente seu fallback de polling HTTP (`startPolling(false)`).
 */
final class ClassindController
{
    public const DECK_ID = 'aula5-v1';
    public const COVER_BASE = '/assets/classind-dle/covers';
    public const ROOM_TTL_MS = 21600000; // 6h
    public const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public const ADMIN_ACTIONS = [
        'createRoom',
        'startRound',
        'reveal',
        'nextRound',
        'showRanking',
        'closeRoom',
        'listRoomRoster',
    ];

    public const ROUNDS = [
        [
            'id' => 'r1-mk11-sf6',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Mortal Kombat 11',
                'blurb' => 'Luta com fatalidades, gore explícito e desmembramento.',
                'cover' => 'mortal-kombat-11.webp',
                'rating' => '18',
                'descriptors' => ['violência extrema', 'gore'],
            ],
            'sideB' => [
                'title' => 'Street Fighter 6',
                'blurb' => 'Luta competitiva com impacto, sem desmembramento pedagógico.',
                'cover' => 'street-fighter-6.webp',
                'rating' => '12',
                'descriptors' => ['violência'],
            ],
            'correctSide' => 'A',
            'rationale' => 'MK11 sobe a 18 por violência extrema/gore. SF6 fica em 12 por violência de luta sem o mesmo nível de gore.',
        ],
        [
            'id' => 'r2-sims-hk',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'The Sims 4',
                'blurb' => 'Simulação de vida com temas sexuais, nudez censurada e relacionamentos adultos.',
                'cover' => 'the-sims-4.webp',
                'rating' => '12',
                'descriptors' => ['temas sexuais', 'nudez'],
            ],
            'sideB' => [
                'title' => 'Hollow Knight',
                'blurb' => 'Metroidvania com combate fantasioso, criaturas e clima de medo.',
                'cover' => 'hollow-knight.webp',
                'rating' => '10',
                'descriptors' => ['violência fantasiosa', 'medo'],
            ],
            'correctSide' => 'A',
            'rationale' => 'Pegadinha: Sims 4 (12) supera Hollow Knight (10) por temas sexuais/nudez — não por “mais ação”.',
        ],
        [
            'id' => 'r3-undertale-hotline',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Undertale',
                'blurb' => 'RPG com combate fantasioso contra monstros e humor; violência estilizada.',
                'cover' => 'undertale.webp',
                'rating' => '10',
                'descriptors' => ['violência fantasiosa', 'não-humanos'],
            ],
            'sideB' => [
                'title' => 'Hotline Miami',
                'blurb' => 'Ação top-down com violência gráfica explícita contra humanos e sangue.',
                'cover' => 'hotline-miami.webp',
                'rating' => '18',
                'descriptors' => ['violência extrema', 'gore', 'humanos'],
            ],
            'correctSide' => 'B',
            'rationale' => 'Hotline Miami sobe a 18 por violência gráfica contra humanos. Undertale fica em 10 com combate fantasioso contra não-humanos.',
        ],
        [
            'id' => 'r4-cuphead-blasphemous',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Cuphead',
                'blurb' => 'Run-and-gun cartunesco com violência estilizada e humor clássico.',
                'cover' => 'cuphead.webp',
                'rating' => '10',
                'descriptors' => ['violência fantasiosa', 'comicidade'],
            ],
            'sideB' => [
                'title' => 'Blasphemous',
                'blurb' => 'Metroidvania penitent com gore religioso, execução e horror corporal.',
                'cover' => 'blasphemous.webp',
                'rating' => '18',
                'descriptors' => ['violência extrema', 'gore', 'temas adultos'],
            ],
            'correctSide' => 'B',
            'rationale' => 'Blasphemous (18) pelo gore e temas adultos; Cuphead permanece em violência cartunesca (10).',
        ],
        [
            'id' => 'r5-supermarket-gta',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Supermarket Simulator',
                'blurb' => 'Simulação de loja: empilhar prateleiras, caixa e rotina sem violência.',
                'cover' => 'supermarket-simulator.webp',
                'rating' => 'L',
                'descriptors' => ['conteúdo livre'],
            ],
            'sideB' => [
                'title' => 'Grand Theft Auto: San Andreas',
                'blurb' => 'Mundo aberto com violência, drogas, crimes e temas adultos explícitos.',
                'cover' => 'gta-san-andreas.webp',
                'rating' => '18',
                'descriptors' => ['violência', 'drogas', 'temas adultos'],
            ],
            'correctSide' => 'B',
            'rationale' => 'Contraste máximo: simulação Livre vs GTA 18 nos três eixos clássicos.',
        ],
        [
            'id' => 'r6-vampire-doom',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Vampire Survivors',
                'blurb' => 'Horda survival com sprites e violência fantasiosa arcade.',
                'cover' => 'vampire-survivors.webp',
                'rating' => '10',
                'descriptors' => ['violência fantasiosa'],
            ],
            'sideB' => [
                'title' => 'Doom Eternal',
                'blurb' => 'FPS com violência intensa e gore demoníaco.',
                'cover' => 'doom-eternal.webp',
                'rating' => '16',
                'descriptors' => ['violência intensa', 'gore'],
            ],
            'correctSide' => 'B',
            'rationale' => 'Doom Eternal (16) pela violência/gore; Vampire Survivors fica na violência fantasiosa (10).',
        ],
        [
            'id' => 'r7-simpsons-silenthill',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'The Simpsons: Hit & Run',
                'blurb' => 'Ação/aventura humorística com violência cartoon.',
                'cover' => 'the-simpsons-hit-and-run.webp',
                'rating' => '10',
                'descriptors' => ['violência fantasiosa', 'comicidade'],
            ],
            'sideB' => [
                'title' => 'Silent Hill 2 (2024)',
                'blurb' => 'Terror psicológico com violência, horror corporal e temas adultos.',
                'cover' => 'silent-hill-2-2024.webp',
                'rating' => '18',
                'descriptors' => ['medo intenso', 'violência', 'temas adultos'],
            ],
            'correctSide' => 'B',
            'rationale' => 'Silent Hill 2 (18) pelo terror/violência maduros; Hit & Run permanece cartoon (10).',
        ],
        [
            'id' => 'r8-fnaf-gow',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => "Five Nights at Freddy's",
                'blurb' => 'Terror de jumpscare com animatrônicos; medo forte, violência pouco gráfica.',
                'cover' => 'five-nights-at-freddys.webp',
                'rating' => '12',
                'descriptors' => ['medo'],
            ],
            'sideB' => [
                'title' => 'God of War Ragnarök',
                'blurb' => 'Ação mitológica com combate visceral, sangue e temas maduros.',
                'cover' => 'god-of-war-ragnarok.webp',
                'rating' => '18',
                'descriptors' => ['violência', 'sangue', 'temas adultos'],
            ],
            'correctSide' => 'B',
            'rationale' => 'GoW Ragnarök (18) pela violência intensa; FNAF pesa mais no medo (12) do que no gore.',
        ],
        [
            'id' => 'r9-rivals-re',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Marvel Rivals',
                'blurb' => 'Hero shooter com combate estilizado entre heróis.',
                'cover' => 'marvel-rivals.webp',
                'rating' => '12',
                'descriptors' => ['violência'],
            ],
            'sideB' => [
                'title' => 'Resident Evil Village',
                'blurb' => 'Survival horror com violência gráfica, gore e terror.',
                'cover' => 'resident-evil-village.webp',
                'rating' => '18',
                'descriptors' => ['violência extrema', 'gore', 'medo'],
            ],
            'correctSide' => 'B',
            'rationale' => 'RE Village (18) pelo horror/gore; Marvel Rivals fica em violência de combate (12).',
        ],
        [
            'id' => 'r10-cod-crimson',
            'question' => 'Qual exige a idade mais alta?',
            'sideA' => [
                'title' => 'Call of Duty: Black Ops',
                'blurb' => 'FPS militar com violência realista de combate contemporâneo.',
                'cover' => 'call-of-duty-black-ops.webp',
                'rating' => '18',
                'descriptors' => ['violência', 'sangue'],
            ],
            'sideB' => [
                'title' => 'Crimson Desert',
                'blurb' => 'Ação/aventura com combate; referência pedagógica de violência intensa em mundo aberto.',
                'cover' => 'crimson-desert.webp',
                'rating' => '16',
                'descriptors' => ['violência'],
            ],
            'correctSide' => 'A',
            'rationale' => 'Black Ops (18) pela violência militar realista/sangue; Crimson Desert na referência da aula fica em 16.',
        ],
    ];

    public static function deckLength(): int
    {
        return count(self::ROUNDS);
    }

    /**
     * @return array<int, int>
     */
    public static function shuffleDeckOrder(): array
    {
        $order = range(0, self::deckLength() - 1);
        for ($i = count($order) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            $tmp = $order[$i];
            $order[$i] = $order[$j];
            $order[$j] = $tmp;
        }
        return $order;
    }

    /**
     * @param array<int, mixed>|null $deckOrder
     * @return array<string, mixed>|null
     */
    public static function getRoundByIndex(int $index, ?array $deckOrder = null): ?array
    {
        if ($index < 0 || $index >= self::deckLength()) {
            return null;
        }
        if (is_array($deckOrder) && count($deckOrder) === self::deckLength()) {
            $source = (int) ($deckOrder[$index] ?? -1);
            if ($source < 0 || $source >= self::deckLength()) {
                return null;
            }
            return self::ROUNDS[$source] ?? null;
        }
        return self::ROUNDS[$index] ?? null;
    }

    /**
     * @param array<string, mixed> $round
     * @return array{public: array<string, mixed>, secret: array<string, mixed>}
     */
    public static function splitRoundPayload(array $round): array
    {
        $sideA = $round['sideA'];
        $sideB = $round['sideB'];
        return [
            'public' => [
                'question' => $round['question'],
                'sideA' => [
                    'title' => $sideA['title'],
                    'blurb' => $sideA['blurb'],
                    'imageUrl' => !empty($sideA['cover']) ? self::COVER_BASE . '/' . $sideA['cover'] : null,
                ],
                'sideB' => [
                    'title' => $sideB['title'],
                    'blurb' => $sideB['blurb'],
                    'imageUrl' => !empty($sideB['cover']) ? self::COVER_BASE . '/' . $sideB['cover'] : null,
                ],
                'roundId' => $round['id'],
            ],
            'secret' => [
                'correctSide' => $round['correctSide'],
                'ratingA' => $sideA['rating'],
                'ratingB' => $sideB['rating'],
                'descriptors' => [
                    'A' => array_values($sideA['descriptors']),
                    'B' => array_values($sideB['descriptors']),
                ],
                'rationale' => $round['rationale'],
            ],
        ];
    }

    /**
     * @param array{room: array<string, mixed>|null, roundRow?: array<string, mixed>|null, tallies?: array{A?: int, B?: int}, votersCount?: int, membersCount?: int, deckFinished?: bool} $args
     * @return array<string, mixed>
     */
    public static function buildPublicSnapshotPayload(array $args): array
    {
        $room = $args['room'] ?? [];
        $roundRow = $args['roundRow'] ?? null;
        $tallies = $args['tallies'] ?? ['A' => 0, 'B' => 0];
        $votersCount = (int) ($args['votersCount'] ?? 0);
        $membersCount = (int) ($args['membersCount'] ?? 0);
        $deckFinished = !empty($args['deckFinished']);

        $phase = (string) ($room['phase'] ?? 'lobby');
        $roundIndex = (int) ($room['current_round_index'] ?? 0);
        $publicPayload = self::asAssoc($roundRow['payload_public'] ?? null);
        $secret = self::asAssoc($roundRow['payload_secret'] ?? null);
        $revealed = $phase === 'revealed' || (($roundRow['phase'] ?? '') === 'revealed');
        $settings = self::asAssoc($room['settings'] ?? null);

        $base = [
            'phase' => $phase,
            'roundIndex' => $roundIndex,
            'deckId' => $room['deck_id'] ?? self::DECK_ID,
            'deckLength' => self::deckLength(),
            'deckFinished' => $deckFinished,
            'question' => $publicPayload['question'] ?? 'Qual exige a idade mais alta?',
            'sideA' => $publicPayload['sideA'] ?? null,
            'sideB' => $publicPayload['sideB'] ?? null,
            'tallies' => [
                'A' => (int) ($tallies['A'] ?? 0),
                'B' => (int) ($tallies['B'] ?? 0),
            ],
            'votersCount' => $votersCount,
            'membersCount' => $membersCount,
            'stateVersion' => (int) ($room['state_version'] ?? 0),
            'code' => $room['code'] ?? null,
            'requireAllVotes' => !empty($settings['requireAllVotes']),
        ];

        if (!$revealed) {
            return $base;
        }

        return array_merge($base, [
            'correctSide' => $secret['correctSide'] ?? null,
            'ratingA' => $secret['ratingA'] ?? null,
            'ratingB' => $secret['ratingB'] ?? null,
            'descriptors' => $secret['descriptors'] ?? null,
            'rationale' => $secret['rationale'] ?? null,
        ]);
    }

    /**
     * @param array<string, mixed>|null $payload
     */
    public static function assertNoSecrets(?array $payload): bool
    {
        if (!is_array($payload)) {
            return true;
        }
        foreach (['correctSide', 'ratingA', 'ratingB', 'descriptors', 'rationale', 'payload_secret'] as $k) {
            if (($payload[$k] ?? null) !== null) {
                return false;
            }
        }
        return true;
    }

    public static function handle(): void
    {
        Http::cors(['POST', 'OPTIONS']);
        if (Http::method() !== 'POST') {
            header('Allow: POST');
            Http::json(405, ['ok' => false, 'error' => 'Método não permitido.']);
        }

        $body = Http::jsonBody();
        $action = trim((string) ($body['action'] ?? ''));
        $token = $body['token'] ?? Http::bearerToken();

        $session = SessionService::resolveSession(is_string($token) ? $token : null);
        if (!$session || empty($session['user'])) {
            Http::json(401, ['ok' => false, 'error' => 'Sessão inválida.']);
        }

        $user = $session['user'];
        $userId = (int) $user['id'];
        $isAdmin = SessionService::isAdmin($user);

        if (in_array($action, self::ADMIN_ACTIONS, true) && !$isAdmin) {
            Http::json(403, ['ok' => false, 'error' => 'Apenas o Mestre controla a sala.']);
        }

        try {
            // -----------------------------------------------------------------
            // createRoom
            // -----------------------------------------------------------------
            if ($action === 'createRoom') {
                $turmaRaw = $body['turma'] ?? null;
                $turma = in_array($turmaRaw, ['TCG01', 'TCG02'], true) ? $turmaRaw : null;
                $room = self::createRoomWithCode($userId, $turma, self::asAssoc($body['settings'] ?? null));
                if (!$room) {
                    Http::json(500, ['ok' => false, 'error' => 'Falha ao criar sala.']);
                }

                self::ensureMember((string) $room['id'], $userId);
                self::refreshSnapshotForRoom($room);
                $state = self::buildClientState($user, $room, true);

                Http::json(200, [
                    'ok' => true,
                    'roomId' => $room['id'],
                    'code' => $room['code'],
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            // -----------------------------------------------------------------
            // joinRoom
            // -----------------------------------------------------------------
            if ($action === 'joinRoom') {
                $code = self::normalizeCode($body['code'] ?? '');
                if (!preg_match('/^[A-Z0-9]{4,6}$/', $code)) {
                    Http::json(400, ['ok' => false, 'error' => 'Código de sala inválido.']);
                }

                $room = self::loadRoomByCode($code);
                if (!$room) {
                    Http::json(404, ['ok' => false, 'error' => 'Sala não encontrada.']);
                }
                if (($room['phase'] ?? '') === 'closed' || self::roomExpired($room)) {
                    Http::json(410, ['ok' => false, 'error' => 'Esta sala foi encerrada ou expirou.']);
                }
                if (!empty($room['turma']) && !$isAdmin && !empty($user['turma']) && $room['turma'] !== $user['turma']) {
                    Http::json(403, ['ok' => false, 'error' => 'Esta sala é de outra turma.']);
                }

                self::ensureMember((string) $room['id'], $userId);
                $updated = self::bumpRoom((string) $room['id'], []);
                $active = $updated ?? $room;
                self::refreshSnapshotForRoom($active);
                $state = self::buildClientState($user, $active, true);

                Http::json(200, [
                    'ok' => true,
                    'roomId' => $active['id'],
                    'code' => $active['code'],
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            $resolveRoom = static function () use ($body, $userId, $isAdmin): array {
                $room = null;
                if (!empty($body['roomId'])) {
                    $room = self::loadRoomById((string) $body['roomId']);
                } elseif (!empty($body['code'])) {
                    $room = self::loadRoomByCode(self::normalizeCode($body['code']));
                }
                if (!$room) {
                    Http::json(404, ['ok' => false, 'error' => 'Sala não encontrada.']);
                }
                if (($room['phase'] ?? '') === 'closed' || self::roomExpired($room)) {
                    Http::json(410, ['ok' => false, 'error' => 'Esta sala foi encerrada ou expirou.']);
                }
                $member = self::getMember((string) $room['id'], $userId);
                if (!$member && !$isAdmin) {
                    Http::json(403, ['ok' => false, 'error' => 'Entre na sala antes de continuar.']);
                }
                if (!$member && $isAdmin) {
                    self::ensureMember((string) $room['id'], $userId);
                }
                return $room;
            };

            if ($action === 'ping') {
                $room = $resolveRoom();
                self::ensureMember((string) $room['id'], $userId);
                Http::json(200, ['ok' => true]);
            }

            if ($action === 'getState') {
                $room = $resolveRoom();
                $state = self::buildClientState($user, $room, true);
                Http::json(200, [
                    'ok' => true,
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            if ($action === 'startRound') {
                $room = $resolveRoom();
                if (!in_array((string) ($room['phase'] ?? ''), ['lobby', 'revealed'], true)) {
                    Http::json(400, ['ok' => false, 'error' => 'Não é possível abrir rodada neste estado. Revelar ou avançar primeiro.']);
                }
                if (self::isDeckFinishedPhase($room)) {
                    Http::json(400, ['ok' => false, 'error' => 'O deck desta sessão já terminou. Veja o desempenho ou encerre a sala.']);
                }

                $index = array_key_exists('roundIndex', $body) && is_int($body['roundIndex'])
                    ? $body['roundIndex']
                    : (int) ($room['current_round_index'] ?? 0);

                $opened = self::openRoundAtIndex($room, $index);
                if (isset($opened['errorStatus'])) {
                    Http::json((int) $opened['errorStatus'], ['ok' => false, 'error' => $opened['error']]);
                }

                $state = self::buildClientState($user, $opened['room'], true);
                Http::json(200, [
                    'ok' => true,
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            if ($action === 'castVote') {
                $room = $resolveRoom();
                if ($isAdmin || $userId === (int) ($room['host_user_id'] ?? 0)) {
                    Http::json(403, ['ok' => false, 'error' => 'O Mestre não vota — apenas conduz a sala.']);
                }

                $choice = strtoupper(trim((string) ($body['choice'] ?? '')));
                if ($choice !== 'A' && $choice !== 'B') {
                    Http::json(400, ['ok' => false, 'error' => 'Escolha inválida. Use A ou B.']);
                }
                if (($room['phase'] ?? '') !== 'voting') {
                    Http::json(400, ['ok' => false, 'error' => 'A votação não está aberta.']);
                }

                $round = self::loadCurrentRound($room);
                if (!$round || ($round['phase'] ?? '') !== 'voting') {
                    Http::json(400, ['ok' => false, 'error' => 'Rodada inválida para voto.']);
                }

                $pdo = Database::get();
                $chkVote = $pdo->prepare('SELECT id FROM classind_votes WHERE round_id = :rid AND user_id = :uid LIMIT 1');
                $chkVote->execute([':rid' => $round['id'], ':uid' => $userId]);
                if ($chkVote->fetch()) {
                    Http::json(409, ['ok' => false, 'error' => 'Você já votou nesta rodada.']);
                }

                $insVote = $pdo->prepare(
                    'INSERT INTO classind_votes (id, round_id, user_id, choice, created_at)
                     VALUES (:id, :rid, :uid, :ch, :now)'
                );
                $insVote->execute([
                    ':id' => Database::uuidV4(),
                    ':rid' => $round['id'],
                    ':uid' => $userId,
                    ':ch' => $choice,
                    ':now' => Database::nowSql(),
                ]);

                self::ensureMember((string) $room['id'], $userId);
                $nextVersion = ((int) ($room['state_version'] ?? 0)) + 1;
                $updated = self::bumpRoom((string) $room['id'], [
                    'state_version' => $nextVersion,
                    'phase' => 'voting',
                ]) ?? $room;

                $snap = self::refreshSnapshotForRoom($updated);
                if (!self::assertNoSecrets($snap)) {
                    Http::json(500, ['ok' => false, 'error' => 'Snapshot inválido (segredo vazou).']);
                }

                $state = self::buildClientState($user, $updated, true);
                Http::json(200, [
                    'ok' => true,
                    'myVote' => $choice,
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            if ($action === 'reveal') {
                $room = $resolveRoom();
                if (($room['phase'] ?? '') !== 'voting') {
                    Http::json(400, ['ok' => false, 'error' => 'Só é possível revelar durante a votação.']);
                }
                $round = self::loadCurrentRound($room);
                if (!$round) {
                    Http::json(400, ['ok' => false, 'error' => 'Nenhuma rodada ativa.']);
                }

                $settings = self::asAssoc($room['settings'] ?? null);
                if (!empty($settings['requireAllVotes'])) {
                    $eligible = self::countEligibleVoters((string) $room['id']);
                    $votes = self::countVotes((string) $round['id']);
                    $need = max(0, $eligible['count']);
                    if ($votes['votersCount'] < $need) {
                        Http::json(400, ['ok' => false, 'error' => "Ainda faltam votos ({$votes['votersCount']}/{$need})."]);
                    }
                }

                $pdo = Database::get();
                $pdo->prepare(
                    'UPDATE classind_rounds SET phase = \'revealed\', revealed_at = :now WHERE id = :id AND phase = \'voting\''
                )->execute([':now' => Database::nowSql(), ':id' => $round['id']]);

                $nextVersion = ((int) ($room['state_version'] ?? 0)) + 1;
                $updated = self::bumpRoom((string) $room['id'], [
                    'phase' => 'revealed',
                    'state_version' => $nextVersion,
                ]) ?? $room;

                self::refreshSnapshotForRoom($updated);
                $state = self::buildClientState($user, $updated, true);
                Http::json(200, [
                    'ok' => true,
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            if ($action === 'nextRound') {
                $room = $resolveRoom();
                if (!in_array((string) ($room['phase'] ?? ''), ['revealed', 'lobby'], true)) {
                    Http::json(400, ['ok' => false, 'error' => 'Revele a rodada atual antes de avançar.']);
                }

                $nextIndex = ((int) ($room['current_round_index'] ?? 0)) + 1;
                if ($nextIndex >= self::deckLength()) {
                    $nextVersion = ((int) ($room['state_version'] ?? 0)) + 1;
                    $updated = self::bumpRoom((string) $room['id'], [
                        'phase' => 'results',
                        'current_round_index' => $nextIndex,
                        'state_version' => $nextVersion,
                    ]) ?? $room;
                    self::refreshSnapshotForRoom($updated, true);
                    $state = self::buildClientState($user, $updated, true);
                    Http::json(200, [
                        'ok' => true,
                        'deckFinished' => true,
                        'state' => $state,
                        'realtime' => null,
                    ]);
                }

                $opened = self::openRoundAtIndex($room, $nextIndex);
                if (isset($opened['errorStatus'])) {
                    Http::json((int) $opened['errorStatus'], ['ok' => false, 'error' => $opened['error']]);
                }
                $state = self::buildClientState($user, $opened['room'], true);
                Http::json(200, [
                    'ok' => true,
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            if ($action === 'showRanking') {
                $room = $resolveRoom();
                if (!$isAdmin && $userId !== (int) ($room['host_user_id'] ?? 0)) {
                    Http::json(403, ['ok' => false, 'error' => 'Apenas o Mestre controla a sala.']);
                }
                if (($room['phase'] ?? '') !== 'results') {
                    Http::json(400, ['ok' => false, 'error' => 'O ranking só abre após o desempenho final.']);
                }

                $nextVersion = ((int) ($room['state_version'] ?? 0)) + 1;
                $updated = self::bumpRoom((string) $room['id'], [
                    'phase' => 'ranking',
                    'state_version' => $nextVersion,
                ]) ?? $room;
                self::refreshSnapshotForRoom($updated, true);
                $state = self::buildClientState($user, $updated, true);
                Http::json(200, [
                    'ok' => true,
                    'state' => $state,
                    'realtime' => null,
                ]);
            }

            if ($action === 'closeRoom') {
                $room = $resolveRoom();
                $nextVersion = ((int) ($room['state_version'] ?? 0)) + 1;
                $updated = self::bumpRoom((string) $room['id'], [
                    'phase' => 'closed',
                    'state_version' => $nextVersion,
                ]) ?? $room;
                self::refreshSnapshotForRoom($updated);
                Http::json(200, [
                    'ok' => true,
                    'state' => [
                        'phase' => 'closed',
                        'roomId' => $updated['id'],
                        'stateVersion' => (int) $updated['state_version'],
                    ],
                    'realtime' => null,
                ]);
            }

            if ($action === 'listRoomRoster') {
                $room = $resolveRoom();
                $round = self::loadCurrentRound($room);
                $roster = self::buildRoster($room, $round);
                Http::json(200, [
                    'ok' => true,
                    'roster' => $roster['roster'],
                    'pendingVoters' => $roster['pendingVoters'],
                ]);
            }

            Http::json(400, ['ok' => false, 'error' => 'Ação desconhecida.']);
        } catch (Throwable $e) {
            error_log('[api/classind] ' . $e->getMessage());
            Http::json(500, ['ok' => false, 'error' => 'Erro interno do ClassInd-dle.']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private static function asAssoc(mixed $val): array
    {
        if (is_string($val)) {
            $val = Database::decodeJson($val, []);
        }
        return is_array($val) && !array_is_list($val) ? $val : [];
    }

    private static function normalizeCode(mixed $raw): string
    {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim((string) ($raw ?? '')))) ?? '';
    }

    private static function generateRoomCode(int $length = 5): string
    {
        $bytes = random_bytes($length);
        $alpha = self::CODE_ALPHABET;
        $max = strlen($alpha);
        $out = '';
        for ($i = 0; $i < $length; $i++) {
            $out .= $alpha[ord($bytes[$i]) % $max];
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $room
     */
    private static function roomExpired(array $room): bool
    {
        if (empty($room['updated_at'])) {
            return false;
        }
        $updatedMs = Database::parseMs((string) $room['updated_at']);
        if ($updatedMs === null) {
            return false;
        }
        $nowMs = (int) round(microtime(true) * 1000);
        return ($nowMs - $updatedMs) > self::ROOM_TTL_MS;
    }

    /**
     * @param array<string, mixed> $room
     */
    private static function isDeckFinishedPhase(array $room): bool
    {
        $phase = (string) ($room['phase'] ?? '');
        if ($phase === 'results' || $phase === 'ranking') {
            return true;
        }
        return $phase === 'lobby'
            && (int) ($room['current_round_index'] ?? 0) >= self::deckLength()
            && self::deckLength() > 0;
    }

    /**
     * @param array<string, mixed> $settings
     * @return array<string, mixed>|null
     */
    private static function createRoomWithCode(int $hostUserId, ?string $turma, array $settings): ?array
    {
        $pdo = Database::get();
        $deckOrder = (isset($settings['deckOrder']) && is_array($settings['deckOrder']) && count($settings['deckOrder']) === self::deckLength())
            ? array_values(array_map('intval', $settings['deckOrder']))
            : self::shuffleDeckOrder();

        $settingsObj = [
            'requireAllVotes' => !empty($settings['requireAllVotes']),
            'deckOrder' => $deckOrder,
        ];

        for ($attempt = 0; $attempt < 8; $attempt++) {
            $code = self::generateRoomCode(5);
            $chk = $pdo->prepare('SELECT id FROM classind_rooms WHERE code = :c LIMIT 1');
            $chk->execute([':c' => $code]);
            if ($chk->fetch()) {
                continue;
            }

            $id = Database::uuidV4();
            $nowSql = Database::nowSql();
            $ins = $pdo->prepare(
                'INSERT INTO classind_rooms
                 (id, code, host_user_id, turma, phase, current_round_index, deck_id, state_version, settings, created_at, updated_at)
                 VALUES (:id, :c, :h, :t, \'lobby\', 0, :d, 1, :s, :now, :now)'
            );
            $ins->execute([
                ':id' => $id,
                ':c' => $code,
                ':h' => $hostUserId,
                ':t' => $turma,
                ':d' => self::DECK_ID,
                ':s' => json_encode($settingsObj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':now' => $nowSql,
            ]);
            return self::loadRoomById($id);
        }
        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function loadRoomById(string $roomId): ?array
    {
        $stmt = Database::get()->prepare('SELECT * FROM classind_rooms WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $roomId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['settings'] = self::asAssoc($row['settings'] ?? null);
        return $row;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function loadRoomByCode(string $code): ?array
    {
        $stmt = Database::get()->prepare('SELECT * FROM classind_rooms WHERE code = :c LIMIT 1');
        $stmt->execute([':c' => $code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['settings'] = self::asAssoc($row['settings'] ?? null);
        return $row;
    }

    /**
     * @param array<string, mixed> $room
     * @return array<string, mixed>|null
     */
    private static function loadCurrentRound(array $room): ?array
    {
        $stmt = Database::get()->prepare(
            'SELECT * FROM classind_rounds WHERE room_id = :rid AND round_index = :ri LIMIT 1'
        );
        $stmt->execute([
            ':rid' => $room['id'],
            ':ri' => (int) ($room['current_round_index'] ?? 0),
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['payload_public'] = self::asAssoc($row['payload_public'] ?? null);
        $row['payload_secret'] = self::asAssoc($row['payload_secret'] ?? null);
        return $row;
    }

    /**
     * @param array<string, mixed> $patch
     * @return array<string, mixed>|null
     */
    private static function bumpRoom(string $roomId, array $patch): ?array
    {
        $sets = ['`updated_at` = :now'];
        $params = [
            ':now' => Database::nowSql(),
            ':id' => $roomId,
        ];
        foreach ($patch as $col => $val) {
            $sets[] = "`{$col}` = :p_{$col}";
            $params[":p_{$col}"] = is_array($val)
                ? json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : $val;
        }
        $sql = 'UPDATE classind_rooms SET ' . implode(', ', $sets) . ' WHERE id = :id';
        Database::get()->prepare($sql)->execute($params);
        return self::loadRoomById($roomId);
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function getMember(string $roomId, int $userId): ?array
    {
        $stmt = Database::get()->prepare(
            'SELECT room_id, user_id, joined_at, last_seen_at FROM classind_members WHERE room_id = :rid AND user_id = :uid LIMIT 1'
        );
        $stmt->execute([':rid' => $roomId, ':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private static function ensureMember(string $roomId, int $userId): void
    {
        $nowSql = Database::nowSql();
        $stmt = Database::get()->prepare(
            'INSERT INTO classind_members (room_id, user_id, joined_at, last_seen_at)
             VALUES (:rid, :uid, :now, :now)
             ON DUPLICATE KEY UPDATE last_seen_at = VALUES(last_seen_at)'
        );
        $stmt->execute([':rid' => $roomId, ':uid' => $userId, ':now' => $nowSql]);
    }

    private static function countMembers(string $roomId): int
    {
        $stmt = Database::get()->prepare('SELECT COUNT(*) FROM classind_members WHERE room_id = :rid');
        $stmt->execute([':rid' => $roomId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * @return array{count: int, studentIds: array<int, int>}
     */
    private static function countEligibleVoters(string $roomId): array
    {
        $stmt = Database::get()->prepare(
            'SELECT u.id, u.role
             FROM classind_members m
             INNER JOIN users u ON u.id = m.user_id
             WHERE m.room_id = :rid'
        );
        $stmt->execute([':rid' => $roomId]);
        $studentIds = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
            if (($u['role'] ?? '') !== 'admin') {
                $studentIds[] = (int) $u['id'];
            }
        }
        return ['count' => count($studentIds), 'studentIds' => $studentIds];
    }

    /**
     * @return array{tallies: array{A: int, B: int}, votersCount: int}
     */
    private static function countVotes(string $roundId): array
    {
        $stmt = Database::get()->prepare('SELECT choice FROM classind_votes WHERE round_id = :rid');
        $stmt->execute([':rid' => $roundId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $tallies = ['A' => 0, 'B' => 0];
        foreach ($rows as $r) {
            if (($r['choice'] ?? '') === 'A') {
                $tallies['A'] += 1;
            } elseif (($r['choice'] ?? '') === 'B') {
                $tallies['B'] += 1;
            }
        }
        return ['tallies' => $tallies, 'votersCount' => count($rows)];
    }

    /**
     * @param array<string, mixed> $room
     * @return array<string, mixed>
     */
    private static function openRoundAtIndex(array $room, int $index): array
    {
        $settings = self::asAssoc($room['settings'] ?? null);
        $deckOrder = isset($settings['deckOrder']) && is_array($settings['deckOrder']) ? $settings['deckOrder'] : null;
        $deckRound = self::getRoundByIndex($index, $deckOrder);
        if (!$deckRound) {
            return ['errorStatus' => 400, 'error' => 'Não há mais rodadas neste deck.'];
        }

        $split = self::splitRoundPayload($deckRound);
        $pdo = Database::get();

        $chk = $pdo->prepare('SELECT id FROM classind_rounds WHERE room_id = :rid AND round_index = :ri LIMIT 1');
        $chk->execute([':rid' => $room['id'], ':ri' => $index]);
        $existing = $chk->fetch(PDO::FETCH_ASSOC);

        $nowSql = Database::nowSql();
        $pubJson = json_encode($split['public'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $secJson = json_encode($split['secret'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($existing) {
            $roundId = (string) $existing['id'];
            $pdo->prepare(
                'UPDATE classind_rounds
                 SET payload_public = :pub, payload_secret = :sec, phase = \'voting\', revealed_at = NULL
                 WHERE id = :id'
            )->execute([':pub' => $pubJson, ':sec' => $secJson, ':id' => $roundId]);
        } else {
            $roundId = Database::uuidV4();
            $pdo->prepare(
                'INSERT INTO classind_rounds (id, room_id, round_index, payload_public, payload_secret, phase, revealed_at, created_at)
                 VALUES (:id, :rid, :ri, :pub, :sec, \'voting\', NULL, :now)'
            )->execute([
                ':id' => $roundId,
                ':rid' => $room['id'],
                ':ri' => $index,
                ':pub' => $pubJson,
                ':sec' => $secJson,
                ':now' => $nowSql,
            ]);
        }

        $pdo->prepare('DELETE FROM classind_votes WHERE round_id = :rid')->execute([':rid' => $roundId]);

        $nextVersion = ((int) ($room['state_version'] ?? 0)) + 1;
        $updated = self::bumpRoom((string) $room['id'], [
            'phase' => 'voting',
            'current_round_index' => $index,
            'state_version' => $nextVersion,
        ]) ?? $room;

        self::refreshSnapshotForRoom($updated);
        $roundRow = self::loadCurrentRound($updated);
        return ['room' => $updated, 'round' => $roundRow];
    }

    /**
     * @param array<string, mixed> $room
     * @return array<string, mixed>
     */
    private static function refreshSnapshotForRoom(array $room, bool $deckFinished = false): array
    {
        $round = self::loadCurrentRound($room);
        $tallies = ['A' => 0, 'B' => 0];
        $votersCount = 0;
        if ($round && !empty($round['id'])) {
            $votes = self::countVotes((string) $round['id']);
            $tallies = $votes['tallies'];
            $votersCount = $votes['votersCount'];
        }
        $membersCount = self::countMembers((string) $room['id']);

        $payload = self::buildPublicSnapshotPayload([
            'room' => $room,
            'roundRow' => $round,
            'tallies' => $tallies,
            'votersCount' => $votersCount,
            'membersCount' => $membersCount,
            'deckFinished' => $deckFinished,
        ]);

        $up = Database::get()->prepare(
            'INSERT INTO classind_live_snapshots (room_id, state_version, payload, updated_at)
             VALUES (:rid, :sv, :p, :now)
             ON DUPLICATE KEY UPDATE
               state_version = VALUES(state_version),
               payload = VALUES(payload),
               updated_at = VALUES(updated_at)'
        );
        $up->execute([
            ':rid' => $room['id'],
            ':sv' => (int) ($room['state_version'] ?? 0),
            ':p' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':now' => Database::nowSql(),
        ]);
        return $payload;
    }

    /**
     * @return array{scoreCorrect: int, scoreAnswered: int, scoreTotal: int, rounds: array<int, array<string, mixed>>}
     */
    private static function computeUserScore(string $roomId, int $userId): array
    {
        $pdo = Database::get();
        $stmt = $pdo->prepare(
            'SELECT id, round_index, phase, payload_public, payload_secret
             FROM classind_rounds
             WHERE room_id = :rid AND phase = \'revealed\'
             ORDER BY round_index ASC'
        );
        $stmt->execute([':rid' => $roomId]);
        $rounds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $voteStmt = $pdo->prepare('SELECT choice FROM classind_votes WHERE round_id = :rid AND user_id = :uid LIMIT 1');

        $scoreAnswered = 0;
        $scoreCorrect = 0;
        $breakdown = [];
        foreach ($rounds as $r) {
            $voteStmt->execute([':rid' => $r['id'], ':uid' => $userId]);
            $vote = $voteStmt->fetch(PDO::FETCH_ASSOC);
            $secret = self::asAssoc($r['payload_secret'] ?? null);
            $pub = self::asAssoc($r['payload_public'] ?? null);
            $choice = $vote['choice'] ?? null;
            $correctSide = $secret['correctSide'] ?? null;
            $outcome = 'skipped';
            if ($choice) {
                $scoreAnswered += 1;
                if ($correctSide && $choice === $correctSide) {
                    $scoreCorrect += 1;
                    $outcome = 'correct';
                } else {
                    $outcome = 'wrong';
                }
            }
            $breakdown[] = [
                'roundIndex' => (int) ($r['round_index'] ?? 0),
                'titleA' => $pub['sideA']['title'] ?? 'A',
                'titleB' => $pub['sideB']['title'] ?? 'B',
                'choice' => $choice,
                'correctSide' => $correctSide,
                'outcome' => $outcome,
            ];
        }
        return [
            'scoreCorrect' => $scoreCorrect,
            'scoreAnswered' => $scoreAnswered,
            'scoreTotal' => count($breakdown),
            'rounds' => $breakdown,
        ];
    }

    /**
     * @param array<string, mixed> $room
     * @param array<string, mixed>|null $round
     * @return array{roster: array<int, array<string, mixed>>, pendingVoters: array<int, array<string, mixed>>}
     */
    private static function buildRoster(array $room, ?array $round): array
    {
        $pdo = Database::get();
        $stmt = $pdo->prepare(
            'SELECT m.user_id, m.joined_at, m.last_seen_at, u.username, u.full_name, u.role
             FROM classind_members m
             LEFT JOIN users u ON u.id = m.user_id
             WHERE m.room_id = :rid
             ORDER BY m.joined_at ASC'
        );
        $stmt->execute([':rid' => $room['id']]);
        $memberRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $votedIds = [];
        if ($round && !empty($round['id'])) {
            $vStmt = $pdo->prepare('SELECT user_id FROM classind_votes WHERE round_id = :rid');
            $vStmt->execute([':rid' => $round['id']]);
            foreach ($vStmt->fetchAll(PDO::FETCH_ASSOC) as $v) {
                $votedIds[(int) $v['user_id']] = true;
            }
        }

        $roster = [];
        foreach ($memberRows as $m) {
            $uid = (int) $m['user_id'];
            $isHost = $uid === (int) ($room['host_user_id'] ?? 0);
            $role = ($isHost || ($m['role'] ?? '') === 'admin') ? 'admin' : ($m['role'] ?? null);
            $roster[] = [
                'userId' => $uid,
                'username' => $m['username'] ?? null,
                'fullName' => $m['full_name'] ?? null,
                'role' => $role,
                'hasVoted' => isset($votedIds[$uid]),
                'lastSeenAt' => Database::sqlToIso($m['last_seen_at'] ?? null),
            ];
        }

        $pendingVoters = [];
        foreach ($roster as $r) {
            if (!$r['hasVoted'] && ($room['phase'] ?? '') === 'voting' && $r['role'] !== 'admin') {
                $pendingVoters[] = [
                    'userId' => $r['userId'],
                    'username' => $r['username'],
                    'fullName' => $r['fullName'],
                ];
            }
        }

        return ['roster' => $roster, 'pendingVoters' => $pendingVoters];
    }

    /**
     * @param array<string, mixed> $room
     * @return array{performances: array<int, array<string, mixed>>, ranking: array<int, array<string, mixed>>}
     */
    private static function buildSessionScores(array $room): array
    {
        $round = self::loadCurrentRound($room);
        $rosterResult = self::buildRoster($room, $round);
        $students = array_values(array_filter(
            $rosterResult['roster'],
            static fn(array $row): bool => ($row['role'] ?? '') !== 'admin'
        ));

        $performances = [];
        foreach ($students as $student) {
            $score = self::computeUserScore((string) $room['id'], (int) $student['userId']);
            $performances[] = [
                'userId' => $student['userId'],
                'username' => $student['username'] ?: ($student['fullName'] ?: ('user ' . $student['userId'])),
                'scoreCorrect' => $score['scoreCorrect'],
                'scoreAnswered' => $score['scoreAnswered'],
                'scoreTotal' => $score['scoreTotal'],
            ];
        }

        usort($performances, static function (array $a, array $b): int {
            if ($b['scoreCorrect'] !== $a['scoreCorrect']) {
                return $b['scoreCorrect'] <=> $a['scoreCorrect'];
            }
            if ($b['scoreAnswered'] !== $a['scoreAnswered']) {
                return $b['scoreAnswered'] <=> $a['scoreAnswered'];
            }
            return strcasecmp((string) $a['username'], (string) $b['username']);
        });

        $ranking = [];
        foreach ($performances as $idx => $row) {
            $ranking[] = [
                'rank' => $idx + 1,
                'userId' => $row['userId'],
                'username' => $row['username'],
                'scoreCorrect' => $row['scoreCorrect'],
                'scoreAnswered' => $row['scoreTotal'],
                'scoreTotal' => $row['scoreTotal'],
            ];
        }

        return ['performances' => $performances, 'ranking' => $ranking];
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $room
     * @return array<string, mixed>
     */
    private static function buildClientState(array $user, array $room, bool $includeRoster = false): array
    {
        $userId = (int) $user['id'];
        $round = self::loadCurrentRound($room);
        $tallies = ['A' => 0, 'B' => 0];
        $votersCount = 0;
        $myVote = null;

        if ($round && !empty($round['id'])) {
            $votes = self::countVotes((string) $round['id']);
            $tallies = $votes['tallies'];
            $votersCount = $votes['votersCount'];

            $mStmt = Database::get()->prepare('SELECT choice FROM classind_votes WHERE round_id = :rid AND user_id = :uid LIMIT 1');
            $mStmt->execute([':rid' => $round['id'], ':uid' => $userId]);
            $mine = $mStmt->fetch(PDO::FETCH_ASSOC);
            $myVote = $mine['choice'] ?? null;
        }

        $membersCount = self::countMembers((string) $room['id']);
        $eligible = self::countEligibleVoters((string) $room['id']);
        $deckFinished = self::isDeckFinishedPhase($room);
        $phase = (string) ($room['phase'] ?? 'lobby');

        $snapshot = self::buildPublicSnapshotPayload([
            'room' => $room,
            'roundRow' => ($phase === 'results' || $phase === 'ranking') ? null : $round,
            'tallies' => $tallies,
            'votersCount' => $votersCount,
            'membersCount' => $membersCount,
            'deckFinished' => $deckFinished,
        ]);

        $scoreCorrect = 0;
        $scoreAnswered = 0;
        $isHost = $userId === (int) ($room['host_user_id'] ?? 0);
        $isAdmin = SessionService::isAdmin($user) || $isHost;
        $myPerformance = null;
        $performances = null;
        $ranking = null;

        if (!$isAdmin) {
            $score = self::computeUserScore((string) $room['id'], $userId);
            $scoreCorrect = $score['scoreCorrect'];
            $scoreAnswered = $score['scoreAnswered'];
            if ($phase === 'results' || $phase === 'ranking') {
                $myPerformance = [
                    'scoreCorrect' => $score['scoreCorrect'],
                    'scoreAnswered' => $score['scoreAnswered'],
                    'scoreTotal' => $score['scoreTotal'],
                    'rounds' => $score['rounds'],
                ];
            }
        }

        if ($phase === 'results' || $phase === 'ranking') {
            $sessionScores = self::buildSessionScores($room);
            if ($isAdmin) {
                $performances = $sessionScores['performances'];
            }
            if ($phase === 'ranking') {
                $ranking = $sessionScores['ranking'];
            }
        }

        $state = array_merge($snapshot, [
            'myVote' => $myVote,
            'roomId' => $room['id'],
            'hostUserId' => (int) ($room['host_user_id'] ?? 0) ?: null,
            'youWereCorrect' => null,
            'eligibleVotersCount' => $eligible['count'],
            'canVote' => !$isAdmin && $phase === 'voting',
            'scoreCorrect' => $scoreCorrect,
            'scoreAnswered' => $scoreAnswered,
            'myPerformance' => $myPerformance,
            'performances' => $performances,
            'ranking' => $ranking,
        ]);

        if (!empty($snapshot['correctSide']) && $myVote) {
            $state['youWereCorrect'] = $myVote === $snapshot['correctSide'];
        }

        if ($includeRoster) {
            $roster = self::buildRoster($room, $round);
            $state['roster'] = $roster['roster'];
            $state['pendingVoters'] = $roster['pendingVoters'];
        }

        return $state;
    }
}
