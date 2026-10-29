<?php
declare(strict_types=1);

namespace App\Services\Prova\Exams;

use App\Services\Prova\ExamDefinition;

/**
 * Provação do Módulo 2 — 10 questões de múltipla escolha (A–E), 2 pontos cada (total 20), 45 min, 1 tentativa.
 * Fonte: `docs/avaliacao-modulo2-provacao.md` (gabarito: B, D, A, E, C, A, D, B, E, C).
 * Server-only: o gabarito nunca é enviado ao cliente antes de `status = 'graded'`.
 */
final class Modulo2Exam
{
    public const ID = 'modulo2-prova';
    public const TITLE = 'Provação do Módulo 2: O Balcão e o Labirinto do Submundo';

    public const MC_ANSWER_KEY = [
        'q01' => 'B',
        'q02' => 'D',
        'q03' => 'A',
        'q04' => 'E',
        'q05' => 'C',
        'q06' => 'A',
        'q07' => 'D',
        'q08' => 'B',
        'q09' => 'E',
        'q10' => 'C',
    ];

    public const MC_JUSTIFICATIONS = [
        'q01' => 'A aula apresenta tanto criação autoral com propriedade intelectual quanto serviços sob contrato como caminhos do mercado.',
        'q02' => 'A oficina usa cosméticos, preços transparentes e moedas de jogo, sem compra aleatória ou dinheiro real.',
        'q03' => 'O sinal pressed avisa que o botão foi acionado e executa a função conectada.',
        'q04' => 'A coleta soma 5 ao saldo inicial de 10, resultando em 15 moedas.',
        'q05' => 'A oficina divide arte da moeda e programação da coleta e usa um diário compartilhado; no solo, o aluno assume ambos.',
        'q06' => 'Escopo pequeno, organização, responsabilidade por cena e backups identificados ajudam a integrar e testar o projeto.',
        'q07' => 'queue_free() agenda a remoção do nó da moeda, fazendo o objeto coletado desaparecer.',
        'q08' => 'O modelo organiza motivações de jogadores e ajuda a ligar um perfil-alvo às mecânicas do nível.',
        'q09' => 'A trilha Conquista conecta o perfil a segredo e moeda especial; o design planeja a experiência e a programação a torna jogável.',
        'q10' => 'A Camera2D filha acompanha a posição do Player e permite explorar o nível além da tela inicial.',
    ];

    public const QUESTIONS = [
        [
            'id' => 'q01',
            'index' => 0,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 01',
            'prompt' => 'No mercado brasileiro e internacional de jogos, qual alternativa distingue Original IP de prestação de serviços?',
            'choices' => [
                'A' => 'Original IP é prestar serviços de arte para qualquer cliente, sem criar um jogo próprio.',
                'B' => 'Original IP é criar e deter o jogo ou universo; prestação de serviços é fornecer trabalho, como arte ou programação, para terceiros.',
                'C' => 'Prestação de serviços significa sempre ser dono dos personagens do cliente.',
                'D' => 'Original IP só existe em jogos internacionais de grandes estúdios.',
                'E' => 'Um estúdio brasileiro só pode ganhar receita vendendo jogos autorais.',
            ],
        ],
        [
            'id' => 'q02',
            'index' => 1,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 02',
            'prompt' => 'Qual opção segue a proposta da loja ética construída na Aula 06?',
            'choices' => [
                'A' => 'Cobrar dinheiro real para sortear um item de chance oculta.',
                'B' => 'Esconder o preço até depois da compra.',
                'C' => 'Vender vantagens obrigatórias para conseguir terminar a fase.',
                'D' => 'Oferecer cosméticos com preço fixo usando moedas ganhas jogando.',
                'E' => 'Obrigar o jogador a comprar um pacote para poder coletar moedas.',
            ],
        ],
        [
            'id' => 'q03',
            'index' => 2,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 03',
            'prompt' => 'Na Godot, qual sinal do Button é conectado à função que executa a compra na loja?',
            'choices' => [
                'A' => 'pressed',
                'B' => 'body_entered',
                'C' => 'mouse_exited',
                'D' => 'tree_exited',
                'E' => 'visibility_changed',
            ],
        ],
        [
            'id' => 'q04',
            'index' => 3,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 04',
            'prompt' => 'Na loja da aula, var moedas começa em 10 e o botão de coleta acrescenta GANHO_FASE, que vale 5. Qual será o saldo após clicar uma vez, sem comprar nada?',
            'choices' => [
                'A' => '5 moedas.',
                'B' => '10 moedas.',
                'C' => '50 moedas.',
                'D' => '0 moedas.',
                'E' => '15 moedas.',
            ],
        ],
        [
            'id' => 'q05',
            'index' => 4,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 05',
            'prompt' => 'Na dupla da Aula 07, como se dividem os dois ofícios da prática do Labirinto de Moedas?',
            'choices' => [
                'A' => 'Os dois fazem apenas a arte, sem programar a coleta.',
                'B' => 'Um cria a loja de dinheiro real e o outro publica o jogo.',
                'C' => 'Um faz a arte da moeda e o outro programa a coleta; o diário registra o trabalho.',
                'D' => 'Um escreve a história completa e o outro cria o multiplayer obrigatório.',
                'E' => 'Um joga e o outro faz todo o trabalho, sem registrar as tarefas.',
            ],
        ],
        [
            'id' => 'q06',
            'index' => 5,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 06',
            'prompt' => 'Qual prática combina com o workflow e o versionamento visual ensinados na Aula 07?',
            'choices' => [
                'A' => 'Fechar um MVP, organizar as pastas, definir quem edita cada cena e guardar versões em ZIP datado.',
                'B' => 'Acrescentar toda ideia nova sem rever o prazo ou o escopo.',
                'C' => 'Pedir que todos sobrescrevam o mesmo arquivo de cena ao mesmo tempo.',
                'D' => 'Deixar a integração para depois da entrega e dispensar o playtest.',
                'E' => 'Usar nomes aleatórios para não precisar organizar as cenas.',
            ],
        ],
        [
            'id' => 'q07',
            'index' => 6,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 07',
            'prompt' => 'No script da moeda, depois que o Player entra na Area2D e a coleta é chamada, para que serve queue_free()?',
            'choices' => [
                'A' => 'Aumentar automaticamente a velocidade do Player.',
                'B' => 'Salvar o projeto em um arquivo ZIP.',
                'C' => 'Criar outra moeda no mesmo lugar.',
                'D' => 'Remover a moeda coletada da cena.',
                'E' => 'Mudar a textura de todos os personagens.',
            ],
        ],
        [
            'id' => 'q08',
            'index' => 7,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 08',
            'prompt' => 'Para que usamos o modelo Quantic Foundry na Aula 08?',
            'choices' => [
                'A' => 'Para escolher automaticamente a linguagem de programação do jogo.',
                'B' => 'Para compreender motivações de jogadores e orientar decisões de design.',
                'C' => 'Para calcular o preço obrigatório de todo jogo.',
                'D' => 'Para substituir o playtest por uma classificação indicativa.',
                'E' => 'Para determinar a resolução máxima permitida na Godot.',
            ],
        ],
        [
            'id' => 'q09',
            'index' => 8,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 09',
            'prompt' => 'Na divisão Design do perfil × Programação das mecânicas, qual decisão corresponde à trilha Conquista do labirinto?',
            'choices' => [
                'A' => 'Criar uma loja com sorteio pago de equipamentos.',
                'B' => 'Trocar o objetivo da fase por um sistema de multiplayer obrigatório.',
                'C' => 'Remover todas as moedas para não haver nada a conquistar.',
                'D' => 'Implementar somente um obstáculo móvel, que é a mecânica mínima da trilha Ação.',
                'E' => 'Planejar uma área secreta com uma moeda brilhante difícil de alcançar e implementar sua coleta.',
            ],
        ],
        [
            'id' => 'q10',
            'index' => 9,
            'type' => 'mc',
            'points' => 2,
            'title' => 'Questão 10',
            'prompt' => 'Na prática da Aula 08, por que adicionamos uma Camera2D como filha do Player?',
            'choices' => [
                'A' => 'Para substituir a CollisionShape2D e detectar as moedas.',
                'B' => 'Para transformar o Player em um botão de interface.',
                'C' => 'Para que a vista acompanhe o Player durante a exploração da fase.',
                'D' => 'Para aumentar o saldo da loja a cada quadro.',
                'E' => 'Para exportar automaticamente o projeto para Windows.',
            ],
        ],
    ];

    public static function definition(): ExamDefinition
    {
        return new ExamDefinition([
            'id' => self::ID,
            'kind' => ExamDefinition::KIND_QUIZ,
            'title' => self::TITLE,
            'durationMinutes' => 45,
            'totalPoints' => 20,
            'mcPointsEach' => 2,
            'discursivePointsEach' => 0,
            'placeholder' => false,
            'questions' => self::QUESTIONS,
            'mcAnswerKey' => self::MC_ANSWER_KEY,
            'mcJustifications' => self::MC_JUSTIFICATIONS,
            'discursiveRubrics' => [],
        ]);
    }
}
