<?php
declare(strict_types=1);

namespace App\Services\Despertar;

/**
 * Uma escrita admitida numa época foi interrompida porque o reinício da temporada fez COMMIT
 * antes dela (relida sob lock dentro da transação de persistência). O controller responde 409.
 */
final class StaleSeasonEpochException extends \RuntimeException
{
    public function __construct(public readonly int $currentEpoch)
    {
        parent::__construct('despertar_stale_epoch');
    }
}
