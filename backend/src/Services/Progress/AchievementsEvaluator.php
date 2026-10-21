<?php
declare(strict_types=1);

namespace App\Services\Progress;

use App\Core\GameCatalog;

/**
 * Motor de avaliação de conquistas secretas por aula (`lesson-secret-achievements.js`)
 * e conquistas do Grimório (`grimoire-achievements.js`).
 */
final class AchievementsEvaluator
{
    public static function normalizeText(string $text): string
    {
        $lower = mb_strtolower($text, 'UTF-8');
        // Remove acentos comuns do português (equivalente a NFD + strip [\u0300-\u036f])
        $map = [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c', 'ñ' => 'n',
        ];
        $stripped = strtr($lower, $map);
        $collapsed = preg_replace('/\s+/u', ' ', $stripped) ?? $stripped;
        return trim($collapsed);
    }

    /**
     * @param array<int, string> $aliases
     */
    private static function conceptMatched(string $normalizedText, array $aliases): bool
    {
        foreach ($aliases as $alias) {
            $needle = self::normalizeText($alias);
            if ($needle !== '' && str_contains($normalizedText, $needle)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<int, array<int, string>> $conceptGroups
     */
    private static function countConceptHits(string $normalizedText, array $conceptGroups): int
    {
        $hits = 0;
        foreach ($conceptGroups as $aliases) {
            if (self::conceptMatched($normalizedText, $aliases)) {
                $hits++;
            }
        }
        return $hits;
    }

    /**
     * @param array<int, array<int, string>> $conceptGroups
     */
    private static function coverageAtLeast(string $normalizedText, array $conceptGroups, int $minHits): bool
    {
        if ($minHits <= 0) {
            return true;
        }
        return self::countConceptHits($normalizedText, $conceptGroups) >= $minHits;
    }

    /**
     * @param array<int, string> $signals
     */
    private static function hasAnySignal(string $normalizedText, array $signals): bool
    {
        foreach ($signals as $signal) {
            $needle = self::normalizeText($signal);
            if ($needle !== '' && str_contains($normalizedText, $needle)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Avalia conquistas secretas de uma aula com base no texto do parágrafo/diário.
     * @param array<int, string> $alreadyUnlocked
     * @return array<int, array{id: string, xp: int}>
     */
    public static function evaluateLessonSecrets(string $lessonId, string $paragraphText, array $alreadyUnlocked = []): array
    {
        $unlocked = array_flip(array_map('strval', $alreadyUnlocked));
        $norm = self::normalizeText($paragraphText);
        if ($norm === '') {
            return [];
        }

        $candidates = [];

        switch ($lessonId) {
            case 'aula1': {
                if (preg_match_all('/(?:teste|test|experimento|exp)\s*(?:[:.#\-]|n[ºo°.]?)?\s*(\d{1,3})/u', $norm, $m)) {
                    if (count(array_unique($m[1])) >= 3) {
                        $candidates[] = 'segredo_cartografo_do_inspector';
                    }
                }
                $physicsCore = [
                    ['massa', 'mass', 'peso', 'weight'],
                    ['gravidade', 'gravity', 'gravidade da cena'],
                    ['friccao', 'friction', 'atrito'],
                    ['elasticidade', 'elasticity', 'bounciness', 'restituicao'],
                ];
                $physicsMotion = [
                    ['inercia', 'inertia'],
                    ['queda', 'cair', 'fall', 'falling'],
                    ['quique', 'bounce', 'ricochete'],
                    ['desliza', 'deslizamento', 'slide', 'sliding'],
                    ['velocidade', 'velocity', 'movimento', 'motion'],
                ];
                if (self::coverageAtLeast($norm, $physicsCore, 3) && self::coverageAtLeast($norm, $physicsMotion, 1)) {
                    $candidates[] = 'segredo_alquimista_da_fisica';
                }
                $circleAxes = [
                    ['forca de movimento', 'forca do movimento', 'forca horizontal', 'force', 'aceleracao'],
                    ['impulso de pulo', 'impulso do pulo', 'jump force', 'pulo', 'salto', 'jump'],
                    ['massa', 'mass', 'peso'],
                    ['gravidade da cena', 'gravidade', 'gravity'],
                    ['friccao', 'friction', 'atrito'],
                    ['elasticidade', 'elasticity', 'bounciness', 'quique'],
                ];
                $closing = [
                    'neste mundo, a bola', 'neste mundo a bola', 'a bola responde',
                    'em resumo', 'em sintese', 'portanto', 'concluo', 'conclusao',
                    'no inspector', 'pelo inspector',
                ];
                $axes = self::countConceptHits($norm, $circleAxes);
                if ($axes >= 5 || ($axes >= 4 && self::hasAnySignal($norm, $closing))) {
                    $candidates[] = 'segredo_juramento_do_circulo';
                }
                break;
            }

            case 'aula2': {
                $glossary = [
                    ['core loop', 'coreloop', 'ciclo basico', 'andar coletar avancar'],
                    ['grokking', 'grok', 'memoria muscular', 'dominio do controle', 'parar de pensar as teclas'],
                    ['assets', 'asset', 'sprites', 'imagens e sons', 'recursos do jogo', 'filesystem'],
                ];
                if (self::coverageAtLeast($norm, $glossary, 3)) {
                    $candidates[] = 'segredo_lexico_do_desenvolvedor';
                }
                $nodes = [
                    ['characterbody2d', 'character body 2d', 'characterbody', 'corpo do jogador', 'corpo controlavel'],
                    ['sprite2d', 'sprite 2d', 'sprite'],
                    ['collisionshape2d', 'collision shape 2d', 'collisionshape', 'forma de colisao', 'shape de colisao'],
                ];
                $recipeSignals = ['cena', 'cenas', 'node', 'nodes', 'receita', 'receita de bolo', 'hierarquia', 'tscn', 'player.tscn'];
                $hasRecipe = self::hasAnySignal($norm, $recipeSignals) || (bool) preg_match('/(?:^|\s)nos?(?:\s|$)/u', $norm);
                if (self::coverageAtLeast($norm, $nodes, 3) && $hasRecipe) {
                    $candidates[] = 'segredo_arquiteto_de_cenas';
                }
                $inputActions = [['ir_cima', 'ir cima'], ['ir_baixo', 'ir baixo'], ['ir_esquerda', 'ir esquerda'], ['ir_direita', 'ir direita']];
                $inputDirs = [['cima', 'up', 'norte'], ['baixo', 'down', 'sul'], ['esquerda', 'left', 'oeste'], ['direita', 'right', 'leste']];
                $mapSignals = ['input map', 'inputmap', 'mapeamento de teclas', 'project settings', 'wasd', 'setas', 'seta', 'teclado'];
                if (
                    self::countConceptHits($norm, $inputActions) >= 4
                    || (self::countConceptHits($norm, $inputDirs) >= 4 && self::hasAnySignal($norm, $mapSignals))
                ) {
                    $candidates[] = 'segredo_cartografo_do_input';
                }
                break;
            }

            case 'aula3': {
                $homoLudens = [
                    ['homo ludens', 'homoludens'],
                    ['huizinga', 'johan huizinga'],
                    ['cultura surge como jogo', 'cultura se desenvolve como jogo', 'cultura surge e se desenvolve como jogo', 'jogo como elemento da cultura', 'cultura como jogo', 'no jogo e pelo jogo', 'matriz da cultura', 'cultura joga'],
                ];
                if (self::coverageAtLeast($norm, $homoLudens, 2)) {
                    $candidates[] = 'segredo_homo_ludens';
                }
                $importSig = [
                    ['import', 'importei', 'importar', 'importacao', 'importado'],
                    ['filesystem', 'file system', 'arrastar', 'arrastei', 'drag and drop', 'arrastar e soltar', 'res://', 'sprites/hero', 'sprites'],
                ];
                $nearestSig = [['nearest', 'filtro nearest', 'texture filter', 'filtro de textura', 'sem blur', 'sem borrao', 'pixel nitido', 'pixel duro', 'nao borrar', 'nao borrou']];
                $spriteSig = [['sprite2d', 'sprite 2d', 'sprite', 'textura']];
                if (self::coverageAtLeast($norm, $importSig, 1) && self::coverageAtLeast($norm, $nearestSig, 1) && self::coverageAtLeast($norm, $spriteSig, 1)) {
                    $candidates[] = 'segredo_artesao_do_pixel';
                }
                $cultureGroups = [
                    ['folclore', 'saci', 'curupira', 'iara', 'boitata', 'cuca', 'mula sem cabeca', 'boto', 'lobisomem'],
                    ['fauna', 'onca', 'tucano', 'mico', 'mico-leao', 'jabuti', 'capivara', 'arara', 'tamandua'],
                    ['urbano', 'regional', 'cidade', 'cordel', 'frevo', 'sertao', 'amazonia', 'nordeste', 'favela', 'centro historico', 'brasileiro', 'brasilidade', 'cultura brasileira'],
                ];
                $persSignals = ['personalizei', 'personalizar', 'personalizacao', 'recolor', 'recolorei', 'recolorir', 'recolore', 'editei', 'editar', 'edicao', 'alterei', 'alterar', 'modifiquei', 'modificar', 'identidade', 'mascara cultural', 'ancora cultural', 'referencia cultural', 'inspirado', 'inspirada', 'inspiracao'];
                if (self::coverageAtLeast($norm, $cultureGroups, 1) && self::hasAnySignal($norm, $persSignals)) {
                    $candidates[] = 'segredo_identidade_ludica';
                }
                break;
            }

            case 'aula4': {
                $platCore = [
                    ['plataforma', 'plataformas', 'console', 'consoles', 'hardware', 'linha do tempo', 'historico'],
                    ['atari', 'nes', 'famicom', 'snes', 'mega drive', 'genesis', 'game boy', 'gameboy', 'gba', 'game boy advance', '8-bit', '8 bit', '16-bit', '16 bit', 'portatil'],
                    ['resolucao', 'paleta', 'sprites por scanline', 'scanline', 'restricao tecnica', 'limitacao de hardware'],
                ];
                if (self::coverageAtLeast($norm, $platCore, 2)) {
                    $candidates[] = 'segredo_arqueologo_de_hardware';
                }
                $vpSize = [['viewport width', 'viewport height', 'viewport width/height', 'viewport nativo', 'resolucao nativa', '320x180', '320×180', '480x270', '480×270', '160x144', '160×144', '256x224', '256×224']];
                $vpStretch = [['stretch mode viewport', 'mode viewport', 'modo viewport', 'stretch viewport', 'stretch mode = viewport', 'stretch mode: viewport']];
                $vpAspect = [['aspect keep', 'keep aspect', 'aspect = keep', 'aspect: keep', 'stretch aspect keep', 'manter proporcao', 'proporcao preservada']];
                if (self::coverageAtLeast($norm, $vpSize, 1) && self::coverageAtLeast($norm, $vpStretch, 1) && self::coverageAtLeast($norm, $vpAspect, 1)) {
                    $candidates[] = 'segredo_artesao_da_viewport';
                }
                $rest = [['restricao', 'limitacao', 'limite', 'limites', 'hardware', 'sob restricao', 'sob limite']];
                $sol = [['criatividade', 'criativo', 'criativa', 'solucao', 'truque', 'truques', 'design', 'mecanica', 'visual', 'forca criatividade', 'inventa', 'inventar']];
                if (self::coverageAtLeast($norm, $rest, 1) && self::coverageAtLeast($norm, $sol, 1)) {
                    $candidates[] = 'segredo_criatividade_sob_limite';
                }
                break;
            }

            case 'aula5': {
                if (self::hasAnySignal($norm, ['classind', 'classificacao indicativa']) && self::hasAnySignal($norm, ['iarc', 'international age rating', 'consorcio', 'lojas digitais'])) {
                    $candidates[] = 'segredo_oraculo_do_classind';
                }
                if (
                    preg_match('/\bfaixa(?:[\s\-]?alvo)?[\s\S]{0,32}?\b(livre|l|10)\b/u', $norm)
                    || preg_match('/\balvo[^a-z0-9]{0,12}(livre|l|10)\b/u', $norm)
                    || preg_match('/\brating[^a-z0-9]{0,12}(livre|l|10)\b/u', $norm)
                ) {
                    $candidates[] = 'segredo_selo_do_livre';
                }
                $atten = self::hasAnySignal($norm, ['atenuante', 'atenua', 'atenuar', 'atenuacao']);
                $aggrav = self::hasAnySignal($norm, ['agravante', 'agrava', 'agravar', 'agravacao']);
                $fantasy = self::hasAnySignal($norm, ['fantasia', 'fantastico', 'nao-humano', 'nao humano', 'comicidade']);
                $realism = self::hasAnySignal($norm, ['realismo', 'realista']);
                if (($atten && $aggrav) || ($fantasy && $realism)) {
                    $candidates[] = 'segredo_balanca_da_faixa';
                }
                break;
            }

            case 'aula6': {
                $mercadoCore = [['mercado', 'industria de jogos', 'industria dos jogos', 'industria']];
                $mercadoGeo = [
                    ['brasil', 'brasileiro', 'nacional', 'bgs', 'sbgames'],
                    ['internacional', 'global', 'exterior', 'mundo', 'steam', 'mobile'],
                    ['indie', 'aaa', 'mid-core', 'midcore'],
                ];
                $ipAuth = [['original ip', 'ip proprio', 'propriedade intelectual', 'autoral', 'dono do ip'], ['ip']];
                $ipServ = [['prestacao de servicos', 'outsourcing', 'gamificacao'], ['servico', 'servicos', 'work-for-hire', 'work for hire']];
                if (
                    (self::coverageAtLeast($norm, $mercadoCore, 1) && self::coverageAtLeast($norm, $mercadoGeo, 1))
                    || self::coverageAtLeast($norm, $mercadoGeo, 2)
                    || (self::coverageAtLeast($norm, $ipAuth, 1) && self::coverageAtLeast($norm, $ipServ, 1))
                ) {
                    $candidates[] = 'segredo_mercador_do_styx';
                }
                $lojaGroups = [
                    [['loja', 'balcao', 'interface de loja']],
                    [['preco fixo', 'preco', 'deterministico']],
                    [['cosmetico', 'chapeu', 'capa', 'aura', 'skin']],
                    [['moeda', 'moedas', 'saldo', 'coletar moeda', 'moedas da fase', 'ganhas jogando']],
                    [['button', 'botao', 'panelcontainer', 'panel', 'pressed', 'sinal', 'gdscript', 'control']],
                    [['sem loot', 'sem sorte', 'sem randi', 'sem aposta', 'sem azar', 'nao loot'], ['loot box', 'lootbox']],
                ];
                $lojaHits = 0;
                foreach ($lojaGroups as $grp) {
                    if (self::coverageAtLeast($norm, $grp, 1)) {
                        $lojaHits++;
                    }
                }
                if ($lojaHits >= 3) {
                    $candidates[] = 'segredo_balcao_sem_azar';
                }
                $ethicsOk = (bool) preg_match('/\betica\b|\betico\b/u', $norm)
                    || self::coverageAtLeast($norm, [
                        ['monetizacao etica', 'design etico', 'receita etica'],
                        ['sustentavel', 'respeitar o jogador', 'respeita o jogador'],
                    ], 1);
                $timeOrClassind = self::coverageAtLeast($norm, [['tempo do jogador', 'respeitar o tempo', 'respeita o tempo', 'respeito ao tempo']], 1)
                    || self::coverageAtLeast($norm, [['classind', '18+', '18 +', 'jogo de azar', 'jogos de azar', 'microtransacao'], ['loot box', 'lootbox', 'mecanica abusiva']], 1);
                if ($ethicsOk && $timeOrClassind) {
                    $candidates[] = 'segredo_tempo_respeitado';
                }
                break;
            }

            case 'aula7': {
                $oficios = [
                    [['programacao', 'programador', 'codigo', 'script', 'gdscript', 'programacao da coleta', 'body_entered', 'coleta']],
                    [['artista', 'sprites', 'sprite', 'pixel art', 'arte do cenario', 'arte da moeda', 'papel de arte', 'oficio de arte']],
                    [['audio', 'sfx', 'musica', 'efeito sonoro', 'papel de audio']],
                    [['game design', 'gamedesign', 'designer', 'gdd', 'regras do jogo', 'core loop']],
                    [['producao', 'produtor', 'cronograma', 'produtor do dia']],
                ];
                $oficioHits = 0;
                foreach ($oficios as $grp) {
                    if (self::coverageAtLeast($norm, $grp, 1)) {
                        $oficioHits++;
                    }
                }
                if ($oficioHits >= 2) {
                    $candidates[] = 'segredo_cinco_oficios';
                }
                $scopeSignals = [
                    ['scope creep', 'scopecreep', 'estouro de escopo', 'escopo creep'],
                    ['fora do escopo', 'fora do mvp', 'cortamos', 'cortar', 'cercado'],
                    ['mvp', 'nao faremos', 'fica de fora', 'deixamos de fora'],
                ];
                if (self::coverageAtLeast($norm, $scopeSignals, 1)) {
                    $candidates[] = 'segredo_cercado_do_escopo';
                }
                $pastaGroups = [
                    [['pasta', 'pastas', 'filesystem', 'file system'], ['cenas/', 'sprites/', 'audio/', 'scripts/', 'labirintodemoedas', 'labirinto de moedas']],
                    [['.tscn', 'tscn', 'player.tscn', 'moeda.tscn', 'cenario.tscn'], ['cena-esqueleto', 'cena esqueleto', 'cenas-esqueleto', 'stub']],
                    [['pasta compartilhada', 'pasta sync', 'pasta da dupla', 'pasta da equipe', 'drive', 'onedrive', 'google drive', 'projeto local', 'godot local', 'sem pasta sync', 'libresprite'], ['versionamento', 'backup', 'zip', 'nao sobrescrever', 'anti-sobrescrita', 'nomes canonicos']],
                ];
                $pastaHits = 0;
                foreach ($pastaGroups as $grp) {
                    if (self::coverageAtLeast($norm, $grp, 1)) {
                        $pastaHits++;
                    }
                }
                if ($pastaHits >= 2) {
                    $candidates[] = 'segredo_pasta_sagrada';
                }
                break;
            }

            case 'aula8': {
                $quantic = [
                    ['quantic foundry', 'quanticfoundry', 'modelo quantic', 'motivacao', 'motivacoes', 'perfil psicometrico', 'cluster', 'clusters'],
                    ['destruicao', 'desafio', 'descoberta', 'completion', 'excitement', 'achievement', 'immersion', 'imersao', 'mastery'],
                ];
                if (self::coverageAtLeast($norm, $quantic, 1)) {
                    $candidates[] = 'segredo_modelo_quantic';
                }
                $perfil = [['perfil', 'publico-alvo', 'jogador alvo', 'atrair']];
                $mec = [['mecanica', 'mecanicas', 'area secreta', 'obstaculo', 'moeda brilhante', 'level design', 'design de nivel']];
                if (self::coverageAtLeast($norm, $perfil, 1) && self::coverageAtLeast($norm, $mec, 1)) {
                    $candidates[] = 'segredo_perfil_mecanica';
                }
                $trilhas = [
                    ['conquista', 'area secreta', 'moeda brilhante', 'moeda dificil', 'segredo no mapa'],
                    ['acao', 'obstaculo movel', 'obstaculo', 'vai-e-volta', 'timing'],
                ];
                if (self::coverageAtLeast($norm, $trilhas, 1)) {
                    $candidates[] = 'segredo_trilha_labirinto';
                }
                break;
            }
        }

        $out = [];
        foreach ($candidates as $id) {
            if (!isset($unlocked[$id])) {
                $out[] = [
                    'id' => $id,
                    'xp' => GameCatalog::getAchievementXp($id),
                ];
            }
        }
        return $out;
    }

    /**
     * Avalia conquistas do Grimório (`evaluateGrimoireAchievementIds`).
     * @param array<string, mixed> $snapshot
     * @return array<int, string>
     */
    public static function evaluateGrimoireIds(array $snapshot): array
    {
        $unlocked = array_flip(array_map('strval', is_array($snapshot['unlocked'] ?? null) ? $snapshot['unlocked'] : []));
        $event = (string) ($snapshot['event'] ?? '');
        $originalNoteCount = max(0, (int) ($snapshot['originalNoteCount'] ?? 0));
        $isCloneNote = (bool) ($snapshot['isCloneNote'] ?? false);
        $note = is_array($snapshot['note'] ?? null) ? $snapshot['note'] : [];
        $lessonId = (string) ($note['lessonId'] ?? '');
        $shareCount = max(0, (int) ($note['shareCount'] ?? 0));
        $pinned = (bool) ($note['pinned'] ?? false);
        $body = (string) ($note['body'] ?? '');
        $tags = is_array($note['tags'] ?? null) ? $note['tags'] : [];

        $candidates = [];
        $consider = static function (string $id, bool $passes) use (&$candidates, $unlocked): void {
            if (!$passes || isset($unlocked[$id]) || in_array($id, $candidates, true)) {
                return;
            }
            $candidates[] = $id;
        };

        if ($event === 'create' && !$isCloneNote) {
            $consider('grimorio_primeira_inscricao', $originalNoteCount >= 1);
            $consider('grimorio_dez_inscricoes', $originalNoteCount >= 10);
        }

        if (($event === 'create' || $event === 'update') && !$isCloneNote) {
            $consider('grimorio_elo_da_trilha', $lessonId !== '');
            $consider('grimorio_fixador', $pinned);
            $consider('grimorio_escriba_ritual', self::matchesEscribaRitual($body));
            $consider('grimorio_cartografo_pessoal', self::matchesCartografoPessoal($tags));
        }

        if ($event === 'update' && !$isCloneNote) {
            $consider('grimorio_dez_inscricoes', $originalNoteCount >= 10);
        }

        if ($event === 'share') {
            $consider('grimorio_revelacao', true);
            $consider('grimorio_vinculo_oculto', $lessonId !== '');
        }

        if (($event === 'create' || $event === 'update') && !$isCloneNote) {
            $consider('grimorio_vinculo_oculto', $lessonId !== '' && $shareCount >= 1);
        }

        if ($event === 'clone') {
            $consider('grimorio_eco_clonado', true);
            $consider('grimorio_eco_invertido', true);
        }

        return $candidates;
    }

    private static function matchesEscribaRitual(string $body): bool
    {
        $norm = self::normalizeText($body);
        if ($norm === '') {
            return false;
        }
        $words = count(array_filter(explode(' ', $norm), static fn(string $w): bool => $w !== ''));
        if ($words < 80) {
            return false;
        }
        $conceptAliases = [
            ['jogo', 'game', 'ludico'],
            ['aula', 'trilha', 'licao', 'modulo'],
            ['mecanica', 'fisica', 'gravidade', 'massa'],
            ['heroi', 'companheiro', 'dominio', 'hades'],
            ['gdd', 'documento', 'design', 'prototipo'],
        ];
        return self::countConceptHits($norm, $conceptAliases) >= 2;
    }

    /**
     * @param array<int, mixed> $tags
     */
    private static function matchesCartografoPessoal(array $tags): bool
    {
        $unique = [];
        foreach ($tags as $t) {
            $clean = mb_strtolower(trim((string) $t), 'UTF-8');
            if ($clean !== '') {
                $unique[$clean] = true;
            }
        }
        return count($unique) >= 4;
    }
}
