/**
 * Smoke test da portabilidade HostGator (PHP 8 + MySQL/MariaDB).
 * Verifica:
 *  - Existência e integridade do schema MySQL (`db/mysql/schema.sql`) com todas as 28 tabelas
 *  - Existência e sintaxe de `.htaccess`, `.env.hostgator.example` e `docs/DEPLOY-HOSTGATOR.md`
 *  - Existência e cobertura de todos os módulos PHP (`backend/index.php`, `Core/*`, `Controllers/*`, `Services/*`)
 *  - Paridade das actions entre os endpoints Node (`api/*.js`) e os controllers PHP (`backend/src/Controllers/*.php`)
 *  - Validação de sintaxe PHP (`php -l`) caso o binário `php` esteja disponível no PATH
 *
 * Execute: `node tests/hostgator-php-port-smoke.mjs`
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readText(relPath) {
    const abs = join(root, relPath);
    assert.ok(existsSync(abs), `Arquivo obrigatório ausente: ${relPath}`);
    return readFileSync(abs, 'utf8');
}

// 1. Verificar schema MySQL e tabelas obrigatórias
const schemaSql = readText('db/mysql/schema.sql');
const expectedTables = [
    'users',
    'sessions',
    'auth_rate_events',
    'redeem_codes',
    'lesson_gates',
    'lesson_paragraphs',
    'lesson_views',
    'friendships',
    'lesson_duos',
    'lesson_journals',
    'user_notes',
    'user_note_shares',
    'user_note_events',
    'auth_email_tokens',
    'admin_audit_events',
    'site_settings',
    'soul_recovery_codes',
    'despertar_states',
    'classind_rooms',
    'classind_rounds',
    'classind_votes',
    'classind_members',
    'classind_live_snapshots',
    'prova_exams',
    'prova_attempts',
    'prova_answers',
    'prova_integrity_events',
    'rate_limit_buckets',
];

for (const table of expectedTables) {
    assert.match(
        schemaSql,
        new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+\`${table}\``, 'i'),
        `Tabela ${table} ausente em db/mysql/schema.sql`
    );
}

// 2. Verificar Apache .htaccess, .env.hostgator.example, docs e exporter
const htaccess = readText('.htaccess');
assert.match(htaccess, /RewriteRule\s+\^api\/\(\.\*\)\$\s+backend\/index\.php\?_route=\$1/i);
assert.match(htaccess, /submundo\/tartaro-oculto/i);

const envExample = readText('.env.hostgator.example');
assert.match(envExample, /DB_HOST=/);
assert.match(envExample, /DB_NAME=/);
assert.match(envExample, /DB_USER=/);
assert.match(envExample, /DB_PASS=/);

readText('docs/DEPLOY-HOSTGATOR.md');
const ghWorkflow = readText('.github/workflows/deploy-hostgator.yml');
assert.match(ghWorkflow, /SamKirkland\/FTP-Deploy-Action/i);
assert.match(ghWorkflow, /FTP_SERVER/);
assert.match(ghWorkflow, /FTP_USERNAME/);
assert.match(ghWorkflow, /FTP_PASSWORD/);
readText('scripts/export-supabase-to-mysql.mjs');
if (existsSync(join(root, 'db/mysql/hostgator-full-import.sql'))) {
    const dumpSql = readText('db/mysql/hostgator-full-import.sql');
    assert.match(dumpSql, /CREATE TABLE IF NOT EXISTS `users`/i);
}

// 3. Verificar todos os arquivos PHP do backend
const phpFiles = [
    'backend/bootstrap.php',
    'backend/index.php',
    'backend/cron-purge.php',
    'backend/src/Core/Env.php',
    'backend/src/Core/Database.php',
    'backend/src/Core/Http.php',
    'backend/src/Core/Password.php',
    'backend/src/Core/RateLimiter.php',
    'backend/src/Core/Mailer.php',
    'backend/src/Core/GameCatalog.php',
    'backend/src/Core/AdminAudit.php',
    'backend/src/Services/SessionService.php',
    'backend/src/Services/AuthEmailService.php',
    'backend/src/Services/Progress/AchievementsEvaluator.php',
    'backend/src/Services/Progress/ProgressShared.php',
    'backend/src/Services/Progress/RedeemLessonsService.php',
    'backend/src/Services/Progress/LessonDuosService.php',
    'backend/src/Services/Progress/FriendsNotesService.php',
    'backend/src/Services/Progress/LeaderboardAdminService.php',
    'backend/src/Services/Despertar/DespertarDecimal.php',
    'backend/src/Services/Despertar/DespertarCatalog.php',
    'backend/src/Services/Despertar/DespertarFormulas.php',
    'backend/src/Services/Despertar/DespertarService.php',
    'backend/src/Services/Prova/ProvaCatalog.php',
    'backend/src/Services/Prova/ProvaService.php',
    'backend/src/Controllers/AuthController.php',
    'backend/src/Controllers/SessionBootstrapController.php',
    'backend/src/Controllers/ProgressController.php',
    'backend/src/Controllers/DespertarController.php',
    'backend/src/Controllers/ProvaController.php',
    'backend/src/Controllers/ClassindController.php',
    'backend/src/Controllers/CronController.php',
];

for (const file of phpFiles) {
    const content = readText(file);
    assert.ok(content.startsWith('<?php'), `${file} deve iniciar com <?php`);
}

// 4. Verificar paridade de actions em Auth, Progress, Despertar, Prova e ClassInd
const authPhp = readText('backend/src/Controllers/AuthController.php');
for (const action of [
    'register',
    'login',
    'logout',
    'requestEmailVerification',
    'bindEmail',
    'confirmEmail',
    'requestPasswordReset',
    'requestLegacyEmailBind',
    'rotateRecoveryCode',
    'adminMailerStatus',
    'adminProbeMailer',
    'adminForceTempPassword',
    'adminIssueSoulRecoveryCode',
    'consumeSoulRecoveryCode',
    'confirmPasswordReset',
]) {
    assert.ok(authPhp.includes(`'${action}'`), `AuthController.php deve suportar action '${action}'`);
}

const progressPhp =
    readText('backend/src/Controllers/ProgressController.php') +
    readText('backend/src/Services/Progress/RedeemLessonsService.php') +
    readText('backend/src/Services/Progress/LessonDuosService.php') +
    readText('backend/src/Services/Progress/FriendsNotesService.php') +
    readText('backend/src/Services/Progress/LeaderboardAdminService.php');

for (const action of [
    'profileGet',
    'avatar',
    'redeem',
    'generateCode',
    'lessonCode',
    'listCodes',
    'lessonGates',
    'lessonGatesBatch',
    'setLessonGate',
    'getLessonParagraph',
    'listMyLessonParagraphs',
    'saveLessonParagraph',
    'lessonView',
    'lessonEventsBatch',
    'lessonDuoList',
    'lessonDuoRequest',
    'lessonDuoRespond',
    'lessonDuoLeave',
    'lessonDuoSetRole',
    'lessonJournalGet',
    'lessonJournalSave',
    'lessonJournalFinalize',
    'friendsList',
    'classmatesList',
    'friendSearch',
    'friendRequest',
    'friendRespond',
    'friendRemove',
    'friendProfile',
    'notesList',
    'noteGet',
    'noteCreate',
    'noteUpdate',
    'noteDelete',
    'noteShare',
    'noteUnshare',
    'noteClone',
    'noteRefuseShare',
    'noteEventsAck',
    'notesListAdmin',
    'notesListForUser',
    'leaderboardGet',
    'underworldJudgment',
    'underworldRedeem',
    'listUsers',
    'adminUpdateProfile',
    'adminAdjustXp',
    'adminSetLessonCompleted',
    'adminGrantAchievement',
    'adminRevokeAchievement',
    'adminClearEmailSeal',
    'adminInvalidateSessions',
]) {
    assert.ok(progressPhp.includes(`'${action}'`), `Módulo Progress PHP deve suportar action '${action}'`);
}

const despertarPhp =
    readText('backend/src/Controllers/DespertarController.php') +
    readText('backend/src/Services/Despertar/DespertarService.php');

for (const action of [
    'stateGet',
    'stateSync',
    'prestige',
    'talentBuy',
    'verdictBuy',
    'juizoStart',
    'juizoGuess',
    'juizoAbandon',
    'pauseSet',
    'pauseClear',
    'stateResetStudents',
    'debugSandbox',
    'debugReset',
    'debugGrant',
]) {
    assert.ok(despertarPhp.includes(`'${action}'`), `Módulo Despertar PHP deve suportar action '${action}'`);
}

const provaPhp = readText('backend/src/Controllers/ProvaController.php');
for (const action of [
    'getExamStatus',
    'startAttempt',
    'getAttempt',
    'saveAnswer',
    'setCurrentQuestion',
    'reportIntegrityEvent',
    'submitAttempt',
    'adminListAttempts',
    'adminGetProvaOverview',
    'adminSetExamOpen',
    'adminGetAttempt',
    'adminScoreDiscursive',
    'adminFinalizeGrade',
    'contestGrade',
    'adminRespondContest',
    'adminResetAttempt',
    'adminResetAllAttempts',
]) {
    assert.ok(provaPhp.includes(`'${action}'`), `ProvaController.php deve suportar action '${action}'`);
}

const classindPhp = readText('backend/src/Controllers/ClassindController.php');
for (const action of [
    'createRoom',
    'joinRoom',
    'ping',
    'getState',
    'startRound',
    'castVote',
    'reveal',
    'nextRound',
    'showRanking',
    'closeRoom',
    'listRoomRoster',
]) {
    assert.ok(classindPhp.includes(`'${action}'`), `ClassindController.php deve suportar action '${action}'`);
}

// 4.1 Verificar suporte a subdiretório (`projects.vonluqi.com/fundamentos-de-jogos-digitais`) no frontend
const { siteBasePath, rootPath } = await import('../js/api.js');
const prevWindow = globalThis.window;
try {
    globalThis.window = { location: { pathname: '/pages/dashboard.html' } };
    assert.equal(siteBasePath(), '');
    assert.equal(rootPath(), '..');

    globalThis.window = { location: { pathname: '/fundamentos-de-jogos-digitais/pages/dashboard.html' } };
    assert.equal(siteBasePath(), '/fundamentos-de-jogos-digitais');
    assert.equal(rootPath(), '..');

    globalThis.window = { location: { pathname: '/fundamentos-de-jogos-digitais/index.html' } };
    assert.equal(siteBasePath(), '/fundamentos-de-jogos-digitais');
    assert.equal(rootPath(), '.');

    globalThis.window = { location: { pathname: '/fundamentos-de-jogos-digitais/submundo/estige-obolo/' } };
    assert.equal(siteBasePath(), '/fundamentos-de-jogos-digitais');
    assert.equal(rootPath(), '../..');
} finally {
    globalThis.window = prevWindow;
}

// 5. Se o binário `php` estiver disponível no sistema, rodar `php -l` em todos os arquivos + testes unitários em runtime PHP
const phpCheck = spawnSync('php', ['-v'], { encoding: 'utf8' });
if (phpCheck.status === 0) {
    for (const file of phpFiles) {
        const res = spawnSync('php', ['-l', join(root, file)], { encoding: 'utf8' });
        assert.equal(res.status, 0, `Erro de sintaxe PHP em ${file}:\n${res.stdout}\n${res.stderr}`);
    }

    // Teste em runtime PHP: Password (scrypt do Node + bcrypt), GameCatalog, DespertarFormulas, ProvaCatalog e ClassindController
    const { randomBytes, scryptSync } = await import('node:crypto');
    const saltHex = randomBytes(16).toString('hex');
    const derivedHex = scryptSync('SenhaSecretaCaronte42!', saltHex, 64).toString('hex');
    const nodeScryptHash = `${saltHex}:${derivedHex}`;

    const phpInline = `
        require ${JSON.stringify(join(root, 'backend/bootstrap.php'))};
        use App\\Core\\Password;
        use App\\Core\\Env;
        use App\\Core\\Http;
        use App\\Core\\GameCatalog;
        use App\\Services\\Despertar\\DespertarDecimal;
        use App\\Services\\Despertar\\DespertarFormulas;
        use App\\Services\\Prova\\ProvaCatalog;
        use App\\Services\\Prova\\ProvaService;
        use App\\Controllers\\ClassindController;

        $hash = ${JSON.stringify(nodeScryptHash)};
        if (!Password::verify('SenhaSecretaCaronte42!', $hash)) {
            fwrite(STDERR, "Falha ao verificar hash scrypt do Node no PHP\\n");
            exit(1);
        }
        if (Password::verify('SenhaErrada', $hash)) {
            fwrite(STDERR, "Hash scrypt aceitou senha incorreta\\n");
            exit(1);
        }

        $newHash = Password::hash('NovaSenha123');
        if (!Password::verify('NovaSenha123', $newHash)) {
            fwrite(STDERR, "Falha no hash/verify PHP\\n");
            exit(1);
        }

        $ach = GameCatalog::allAchievementIds();
        $level = GameCatalog::levelForXp(500);
        $rank = GameCatalog::rankForXp(500);
        if (empty($ach) || $level < 1 || empty($rank)) {
            fwrite(STDERR, "GameCatalog vazio\\n");
            exit(1);
        }

        $cost = DespertarFormulas::generatorBatchCost('15', 0, 1);
        if (DespertarDecimal::cmp($cost, '0') <= 0) {
            fwrite(STDERR, "DespertarFormulas::generatorBatchCost invalido\\n");
            exit(1);
        }

        $clientQuestions = ProvaCatalog::sanitizeQuestionsForClient();
        if (count($clientQuestions) !== 20 || isset($clientQuestions[0]['correctChoice'])) {
            fwrite(STDERR, "Sanitizacao das questoes da Prova falhou\\n");
            exit(1);
        }

        $mcRes = ProvaService::buildMcGradeUpdates([
            ['question_id' => 'q01', 'choice' => 'B'],
            ['question_id' => 'q02', 'choice' => 'A'],
        ]);
        if ((int) $mcRes['mcScore'] !== 1) {
            fwrite(STDERR, "Correcao MC da Prova falhou\\n");
            exit(1);
        }

        if (ClassindController::deckLength() !== 10) {
            fwrite(STDERR, "ClassindController::deckLength deve ter 10 rodadas\\n");
            exit(1);
        }
        $split = ClassindController::splitRoundPayload(ClassindController::ROUNDS[0]);
        $snapVoting = ClassindController::buildPublicSnapshotPayload([
            'room' => ['phase' => 'voting', 'current_round_index' => 0, 'state_version' => 1, 'code' => 'ABCDE'],
            'roundRow' => ['payload_public' => $split['public'], 'payload_secret' => $split['secret'], 'phase' => 'voting'],
        ]);
        if (!ClassindController::assertNoSecrets($snapVoting)) {
            fwrite(STDERR, "Snapshot voting do ClassindController vazou segredo\\n");
            exit(1);
        }

        Env::set('APP_BASE_URL', '');
        $_SERVER['HTTP_HOST'] = 'projects.vonluqi.com';
        $_SERVER['HTTPS'] = 'on';
        $_SERVER['SCRIPT_NAME'] = '/fundamentos-de-jogos-digitais/backend/index.php';
        $detectedUrl = Http::appBaseUrl();
        if ($detectedUrl !== 'https://projects.vonluqi.com/fundamentos-de-jogos-digitais') {
            fwrite(STDERR, "Http::appBaseUrl falhou ao detectar subdiretorio: {$detectedUrl}\\n");
            exit(1);
        }

        echo "RUNTIME_PHP_OK";
    `;
    const runRes = spawnSync('php', ['-r', phpInline], { encoding: 'utf8' });
    assert.equal(runRes.status, 0, `Falha no runtime PHP:\n${runRes.stdout}\n${runRes.stderr}`);
    assert.match(runRes.stdout, /RUNTIME_PHP_OK/);

    console.log(`hostgator-php-port-smoke: OK (${phpFiles.length} arquivos PHP validados com php -l + runtime scrypt/formulas/prova/catalogo + 28 tabelas MySQL)`);
} else {
    console.log(`hostgator-php-port-smoke: OK (${phpFiles.length} arquivos PHP e 28 tabelas MySQL verificados)`);
}
