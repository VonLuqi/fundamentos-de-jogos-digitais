# Baseline pós-Fase B / mix turma-30

Comparação operacional após B (RPC sync, bootstrap, leaderboard SQL) + C no código.

| Campo | Valor |
| --- | --- |
| **Status** | `measured` |
| **Data** | 2026-09-22 |
| **Commit** | `8b67ad6` |
| **Alvo** | `http://localhost:3000` |
| **Artefato** | [`TURMA-30.md`](./TURMA-30.md) · `raw/turma-30-summary.json` |
| **Vs pós-A** | Mesmo lab; sync p95 **1,29 s** ≤ 1,5 s; boot p95 **793 ms** |

| Rota | p95 | Limiar |
| --- | --- | --- |
| `session_bootstrap` | 793 ms | &lt; 1200 ms lab |
| `leaderboard_get` | 1106 ms | &lt; 1500 ms |
| `despertar_sync` | 1289 ms | &lt; 1500 ms |

**Leitura:** com ~30 alunos virtuais no path quente, lab local segura. Próximo passo ops: repetir C1/C3 em **preview Vercel** para cold start e conexões pooler.
