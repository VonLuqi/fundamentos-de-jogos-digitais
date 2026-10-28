<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\GameCatalog;
use App\Core\Http;
use App\Services\Progress\FriendsNotesService;
use App\Services\Progress\LeaderboardAdminService;
use App\Services\Progress\LessonDuosService;
use App\Services\Progress\ProfileService;
use App\Services\Progress\RedeemLessonsService;
use App\Services\SessionService;

/**
 * Controller de `/api/progress` (`api/progress.js`).
 */
final class ProgressController
{
    public static function handle(): never
    {
        $method = Http::method();
        if (!in_array($method, ['GET', 'POST'], true)) {
            Http::error(405, 'Método não permitido');
        }

        $token = SessionService::extractRequestToken() ?? '';
        $user = SessionService::loadUserBySessionToken($token);

        if ($method === 'POST') {
            $body = Http::body();
            $action = (string) ($body['action'] ?? '');
            if ($action === 'underworldStep') {
                RedeemLessonsService::underworldStep($user, $body);
            }
        }

        if (!$user) {
            Http::error(401, 'Sessão inválida.');
        }

        $userId = (int) $user['id'];

        if ($method === 'GET') {
            $action = (string) (Http::query('action') ?? '');
            if ($action === 'leaderboard' || $action === 'leaderboardGet') {
                LeaderboardAdminService::leaderboardGet($user, $userId, Http::allQuery());
            }
            if ($action === 'underworldJudgment') {
                RedeemLessonsService::underworldJudgment();
            }
            if ($action === '' || $action === 'profile' || $action === 'profileGet') {
                Http::json(200, [
                    'ok' => true,
                    'user' => GameCatalog::sanitizeUser($user, owner: true),
                ]);
            }
            Http::json(200, [
                'ok' => true,
                'user' => GameCatalog::sanitizeUser($user, owner: true),
            ]);
        }

        $body = Http::body();
        $action = (string) ($body['action'] ?? '');

        switch ($action) {
            case 'avatar':
                RedeemLessonsService::avatar($userId, $body);
            case 'profileUpdate':
                ProfileService::profileUpdate($user, $userId, $body);
            case 'profilePhotoUpload':
                ProfileService::profilePhotoUpload($user, $userId, $body);
            case 'profilePhotoRemove':
                ProfileService::profilePhotoRemove($user, $userId);
            case 'profileNameUpdate':
                ProfileService::profileNameUpdate($user, $userId, $body);
            case 'passwordChange':
                ProfileService::passwordChange($user, $userId, $body);
            case 'adminPhotoQueue':
                ProfileService::adminPhotoQueue($user);
            case 'adminPhotoReview':
                ProfileService::adminPhotoReview($user, $userId, $body);
            case 'adminPhotoRemove':
                ProfileService::adminPhotoRemove($user, $userId, $body);
            case 'redeem':
                RedeemLessonsService::redeem($user, $userId, $body);
            case 'generateCode':
                RedeemLessonsService::generateCode($user, $userId, $body);
            case 'lessonCode':
                RedeemLessonsService::lessonCode($body);
            case 'listCodes':
                RedeemLessonsService::listCodes($user);
            case 'lessonGates':
                RedeemLessonsService::lessonGates($body);
            case 'lessonGatesBatch':
                RedeemLessonsService::lessonGatesBatch($body);
            case 'setLessonGate':
                RedeemLessonsService::setLessonGate($user, $userId, $body);
            case 'getLessonParagraph':
                RedeemLessonsService::getLessonParagraph($userId, $body);
            case 'listMyLessonParagraphs':
                RedeemLessonsService::listMyLessonParagraphs($userId);
            case 'saveLessonParagraph':
                RedeemLessonsService::saveLessonParagraph($user, $userId, $body);
            case 'lessonView':
                RedeemLessonsService::lessonView($userId, $body);
            case 'lessonEventsBatch':
                RedeemLessonsService::lessonEventsBatch($user, $userId, $body);
            case 'lessonDuoList':
                LessonDuosService::lessonDuoList($userId, $body);
            case 'lessonDuoRequest':
                LessonDuosService::lessonDuoRequest($userId, $body);
            case 'lessonDuoRespond':
                LessonDuosService::lessonDuoRespond($userId, $body);
            case 'lessonDuoLeave':
                LessonDuosService::lessonDuoLeave($userId, $body);
            case 'lessonDuoSetRole':
                LessonDuosService::lessonDuoSetRole($userId, $body);
            case 'lessonJournalGet':
                LessonDuosService::lessonJournalGet($userId, $body);
            case 'lessonJournalSave':
                LessonDuosService::lessonJournalSave($user, $userId, $body);
            case 'lessonJournalFinalize':
                LessonDuosService::lessonJournalFinalize($user, $userId, $body);
            case 'friendsList':
                FriendsNotesService::friendsList($userId);
            case 'classmatesList':
                FriendsNotesService::classmatesList($user, $userId, $body);
            case 'friendSearch':
                FriendsNotesService::friendSearch($userId, $body);
            case 'friendRequest':
                FriendsNotesService::friendRequest($userId, $body);
            case 'friendRespond':
                FriendsNotesService::friendRespond($userId, $body);
            case 'friendRemove':
                FriendsNotesService::friendRemove($userId, $body);
            case 'friendProfile':
                FriendsNotesService::friendProfile($user, $userId, $body);
            case 'notesList':
                FriendsNotesService::notesList($user, $userId, $body);
            case 'noteGet':
                FriendsNotesService::noteGet($user, $userId, $body);
            case 'noteCreate':
                FriendsNotesService::noteCreate($user, $userId, $body);
            case 'noteUpdate':
                FriendsNotesService::noteUpdate($user, $userId, $body);
            case 'noteDelete':
                FriendsNotesService::noteDelete($userId, $body);
            case 'noteShare':
                FriendsNotesService::noteShare($user, $userId, $body);
            case 'noteUnshare':
                FriendsNotesService::noteUnshare($userId, $body);
            case 'noteClone':
                FriendsNotesService::noteClone($user, $userId, $body);
            case 'noteRefuseShare':
                FriendsNotesService::noteRefuseShare($userId, $body);
            case 'noteEventsAck':
                FriendsNotesService::noteEventsAck($userId, $body);
            case 'notesListAdmin':
                FriendsNotesService::notesListAdmin($user, $body);
            case 'notesListForUser':
                FriendsNotesService::notesListForUser($user, $body);
            case 'leaderboard':
            case 'leaderboardGet':
                LeaderboardAdminService::leaderboardGet($user, $userId, $body);
            case 'underworldJudgment':
                RedeemLessonsService::underworldJudgment();
            case 'underworldRedeem':
                RedeemLessonsService::underworldRedeem($user, $userId, $body);
            case 'listUsers':
                LeaderboardAdminService::listUsers($user);
            case 'adminOverview':
                LeaderboardAdminService::adminOverview($user, $body);
            case 'adminAuditLog':
                LeaderboardAdminService::adminAuditLog($user, $body);
            case 'adminUpdateProfile':
                LeaderboardAdminService::adminUpdateProfile($user, $body, $userId);
            case 'adminAdjustXp':
                LeaderboardAdminService::adminAdjustXp($user, $body, $userId);
            case 'adminSetLessonCompleted':
                LeaderboardAdminService::adminSetLessonCompleted($user, $body, $userId);
            case 'adminGrantAchievement':
                LeaderboardAdminService::adminGrantAchievement($user, $body, $userId);
            case 'adminRevokeAchievement':
                LeaderboardAdminService::adminRevokeAchievement($user, $body, $userId);
            case 'adminClearEmailSeal':
                LeaderboardAdminService::adminClearEmailSeal($user, $body, $userId);
            case 'adminInvalidateSessions':
                LeaderboardAdminService::adminInvalidateSessions($user, $body, $userId);
            default:
                Http::error(400, 'Ação desconhecida.');
        }
    }
}
