#!/usr/bin/env node
/**
 * Processa imagens brutas geradas por IA (PNG/WebP) para `assets/achievements/{id}.webp`:
 * - Para conquistas comuns a míticas (`stone`, `copper`, `silver`, `gold`, `rainbow`):
 *   Remove o fundo preto/escuro via Flood-Fill a partir das bordas + rampa suave de alpha
 *   (soft feathering) + descontaminação de halo escuro, preservando sombras e áreas
 *   escuras internas do ícone. Redimensiona para 512x512 RGBA WebP.
 * - Para a conquista `unique` (`soberano_do_submundo`):
 *   Mantém 100% Full Art opaca (sem transparência), redimensionando para 512x512 cover WebP.
 *
 * Uso:
 *   node scripts/process-achievement-art.mjs --in <caminho-imagem> --id <achievementId> [--full-art]
 *   node scripts/process-achievement-art.mjs --batch-dir <pasta>
 *   node scripts/process-achievement-art.mjs --export-refs <pasta>
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ACHIEVEMENTS_DIR = path.join(ROOT, 'assets', 'achievements');
const TARGET_SIZE = 512;

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Estima a cor predominante do fundo amostrando os pixels das 4 bordas externas.
 */
function estimateBorderBackgroundColor(data, width, height) {
  const samples = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));

  for (let x = 0; x < width; x += step) {
    for (const y of [0, 1, height - 2, height - 1]) {
      const idx = (y * width + x) * 4;
      samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, 1, width - 2, width - 1]) {
      const idx = (y * width + x) * 4;
      samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  samples.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]));
  const median = samples[Math.floor(samples.length * 0.35)] || [0, 0, 0];
  return median;
}

/**
 * Remove o fundo conectado às bordas da imagem com flood-fill + rampa suave de alpha
 * e descontaminação das bordas para evitar halo escuro.
 */
function removeBackgroundBuffer(rawBuffer, width, height) {
  const data = new Uint8Array(rawBuffer);
  const totalPixels = width * height;
  const [bgR, bgG, bgB] = estimateBorderBackgroundColor(data, width, height);

  // Mascaramento Flood-Fill 8-conectado a partir das bordas externas
  const visited = new Uint8Array(totalPixels);
  const bgMask = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const hardBgThreshold = 34; // Distância máxima ao fundo para inundar livremente
  const maxStepDiff = 18; // Diferença máxima entre vizinhos durante o flood-fill

  function canSeed(pIdx) {
    const i = pIdx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 16) return true;
    const dist = colorDist(r, g, b, bgR, bgG, bgB);
    const lum = luminance(r, g, b);
    return dist <= hardBgThreshold + 10 || lum <= 22;
  }

  for (let x = 0; x < width; x += 1) {
    const top = x;
    const bot = (height - 1) * width + x;
    if (!visited[top] && canSeed(top)) {
      visited[top] = 1;
      bgMask[top] = 1;
      queue[tail++] = top;
    }
    if (!visited[bot] && canSeed(bot)) {
      visited[bot] = 1;
      bgMask[bot] = 1;
      queue[tail++] = bot;
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!visited[left] && canSeed(left)) {
      visited[left] = 1;
      bgMask[left] = 1;
      queue[tail++] = left;
    }
    if (!visited[right] && canSeed(right)) {
      visited[right] = 1;
      bgMask[right] = 1;
      queue[tail++] = right;
    }
  }

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = (curr - cx) / width;
    const ci = curr * 4;
    const cr = data[ci];
    const cg = data[ci + 1];
    const cb = data[ci + 2];

    for (let d = 0; d < dirs.length; d += 1) {
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const next = ny * width + nx;
      if (visited[next]) continue;

      const ni = next * 4;
      const nr = data[ni];
      const ng = data[ni + 1];
      const nb = data[ni + 2];
      const na = data[ni + 3];

      if (na < 16) {
        visited[next] = 1;
        bgMask[next] = 1;
        queue[tail++] = next;
        continue;
      }

      const distToBg = colorDist(nr, ng, nb, bgR, bgG, bgB);
      const stepDist = colorDist(nr, ng, nb, cr, cg, cb);
      const sat = saturation(nr, ng, nb);
      const lum = luminance(nr, ng, nb);

      // Só avança se o pixel continuar escuro/próximo da cor de fundo e sem salto brusco de borda
      if (
        (distToBg <= hardBgThreshold && stepDist <= maxStepDiff) ||
        (lum <= 14 && sat < 0.25)
      ) {
        visited[next] = 1;
        bgMask[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  // Calcula distância de cada pixel de objeto até o fundo (para rampa suave nas bordas de 1-2px)
  const boundaryFeather = new Float32Array(totalPixels);
  boundaryFeather.fill(1.0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (bgMask[idx]) {
        boundaryFeather[idx] = 0.0;
        continue;
      }

      // Verifica se é vizinho imediato (raio 1 ou 2) de um pixel de fundo
      let touchesBgRadius1 = false;
      let touchesBgRadius2 = false;

      for (let dy = -2; dy <= 2; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          if (bgMask[ny * width + nx]) {
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
              touchesBgRadius1 = true;
            } else {
              touchesBgRadius2 = true;
            }
          }
        }
      }

      if (touchesBgRadius1 || touchesBgRadius2) {
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = colorDist(r, g, b, bgR, bgG, bgB);

        // Rampa suave de alpha na borda externa do objeto
        const low = touchesBgRadius1 ? 16 : 12;
        const high = touchesBgRadius1 ? 68 : 48;
        const ramp = Math.max(0, Math.min(1, (dist - low) / (high - low)));
        boundaryFeather[idx] = ramp;
      }
    }
  }

  // Aplica o canal alpha e descontamina cores da borda semi-transparente
  for (let idx = 0; idx < totalPixels; idx += 1) {
    const i = idx * 4;
    if (bgMask[idx]) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }

    const alphaFactor = boundaryFeather[idx];
    const newAlpha = Math.round(data[i + 3] * alphaFactor);
    data[i + 3] = newAlpha;

    if (newAlpha > 0 && alphaFactor < 0.96) {
      // Descontaminação: remove a contribuição do fundo escuro nos pixels de transição
      const safeAlpha = Math.max(0.22, alphaFactor);
      data[i] = Math.min(255, Math.max(0, Math.round((data[i] - bgR * (1 - safeAlpha)) / safeAlpha)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round((data[i + 1] - bgG * (1 - safeAlpha)) / safeAlpha)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round((data[i + 2] - bgB * (1 - safeAlpha)) / safeAlpha)));
    }
  }

  return Buffer.from(data.buffer);
}

/**
 * Recorta a bounding-box não transparente e centraliza em um canvas quadrado com margem uniforme.
 */
async function trimAndCenterIcon(rgbaBuffer, width, height, targetSize = TARGET_SIZE) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = rgbaBuffer[(y * width + x) * 4 + 3];
      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
      .resize(targetSize, targetSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 95 })
      .toBuffer();
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const innerMax = Math.round(targetSize * 0.88); // 6% de margem em cada lado

  const cropped = await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .resize(innerMax, innerMax, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: targetSize,
      height: targetSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, gravity: 'center' }])
    .webp({ quality: 90, alphaQuality: 95 })
    .toBuffer();
}

export async function processAchievementImage({ inputPath, achievementId, fullArt = false }) {
  const outPath = path.join(ACHIEVEMENTS_DIR, `${achievementId}.webp`);

  if (fullArt || achievementId === 'soberano_do_submundo') {
    await sharp(inputPath)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'cover', position: 'center' })
      .removeAlpha()
      .webp({ quality: 92 })
      .toFile(outPath);
    return { outPath, mode: 'full-art' };
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleanedRaw = removeBackgroundBuffer(data, info.width, info.height);
  const webpBuffer = await trimAndCenterIcon(cleanedRaw, info.width, info.height, TARGET_SIZE);
  await fs.writeFile(outPath, webpBuffer);
  return { outPath, mode: 'transparent-icon' };
}

async function exportAula1ReferencePngs(destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const refs = [
    'aula1_concluida',
    'gdd_integracao_documental',
    'segredo_cartografo_do_inspector',
    'segredo_alquimista_da_fisica',
    'segredo_juramento_do_circulo',
  ];
  for (const id of refs) {
    const src = path.join(ACHIEVEMENTS_DIR, `${id}.webp`);
    const dst = path.join(destDir, `${id}.png`);
    await sharp(src).png().toFile(dst);
  }
  console.log(`Referências PNG exportadas em: ${destDir}`);
}

async function main() {
  const args = process.argv.slice(2);
  const exportRefsIdx = args.indexOf('--export-refs');
  if (exportRefsIdx !== -1) {
    const dir = path.resolve(ROOT, args[exportRefsIdx + 1] || '.tmp-ach-refs');
    await exportAula1ReferencePngs(dir);
    return;
  }

  const batchIdx = args.indexOf('--batch-dir');
  if (batchIdx !== -1) {
    const dir = path.resolve(ROOT, args[batchIdx + 1]);
    const catalogRaw = JSON.parse(await fs.readFile(path.join(ACHIEVEMENTS_DIR, 'catalog.json'), 'utf8'));
    const validIds = new Set(
      (Array.isArray(catalogRaw) ? catalogRaw : []).map((entry) => path.parse(entry.file).name)
    );
    const preservedAula1 = new Set([
      'aula1_concluida',
      'gdd_integracao_documental',
      'segredo_cartografo_do_inspector',
      'segredo_alquimista_da_fisica',
      'segredo_juramento_do_circulo',
    ]);
    const entries = await fs.readdir(dir);
    for (const file of entries) {
      if (!/\.(png|webp|jpg|jpeg)$/i.test(file)) continue;
      const id = path.parse(file).name;
      if (!validIds.has(id) || preservedAula1.has(id)) continue;
      const fullArt = id === 'soberano_do_submundo';
      const res = await processAchievementImage({
        inputPath: path.join(dir, file),
        achievementId: id,
        fullArt,
      });
      console.log(`[OK] ${id} (${res.mode}) -> ${path.relative(ROOT, res.outPath)}`);
    }
    return;
  }

  const inIdx = args.indexOf('--in');
  const idIdx = args.indexOf('--id');
  const fullArt = args.includes('--full-art');
  if (inIdx === -1 || idIdx === -1) {
    console.error('Uso: node scripts/process-achievement-art.mjs --in <file> --id <achievementId> [--full-art]');
    process.exit(1);
  }

  const inputPath = path.resolve(ROOT, args[inIdx + 1]);
  const achievementId = args[idIdx + 1];
  const res = await processAchievementImage({ inputPath, achievementId, fullArt });
  console.log(`[OK] ${achievementId} (${res.mode}) -> ${path.relative(ROOT, res.outPath)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
