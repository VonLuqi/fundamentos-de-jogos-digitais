# Cold start — Task C3 (`api/progress.js` split)

| Item | Status / nota |
| --- | --- |
| Structural split | **done** — fachada fina em `api/progress.js` + domínios em `api/_lib/progress/*` |
| Imports | **eager** (estáticos) por desenho até medição em staging |
| Cold start p95 (`progress`) | **`pending_staging_measure`** — medir em staging (Vercel `cold=1` / A6) no mesmo path (`profileGet`, `redeem`) antes/depois |
| Aceite Task C3 | Justificativa aceitável: split estrutural completo; limiar “já &lt; limiar / justificado” até corrida staging |

Não fatiar `despertar.js` nesta task.
