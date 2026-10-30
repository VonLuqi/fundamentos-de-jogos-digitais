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
const FULL_ART_TARGET_SIZE = 1024;

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

/** Piso de luminância para ícones ctonianos não sumirem no UI escuro. */
const LUM_FLOOR = 48;

/**
 * Remapeia RGB escuro para um piso ~48–70 preservando matiz/saturação.
 * Pretos puros ganham um violeta-acinzentado legível (não vira cinza chapado).
 */
export function liftLuminanceRgb(r, g, b, floor = LUM_FLOOR) {
  const lum = luminance(r, g, b);
  if (lum >= floor) return [r, g, b];
  const t = lum / floor;
  const target = floor + (1 - t) * 18;
  if (lum < 1.5) {
    return [
      Math.min(255, Math.round(target * 0.55)),
      Math.min(255, Math.round(target * 0.58)),
      Math.min(255, Math.round(target * 0.72)),
    ];
  }
  const scale = target / lum;
  return [
    Math.min(255, Math.round(r * scale)),
    Math.min(255, Math.round(g * scale)),
    Math.min(255, Math.round(b * scale)),
  ];
}

/**
 * Reforça alpha do sujeito e sobe luminância de miolos escuros in-place (RGBA).
 * @returns {{ alphaLifted: number, lumLifted: number }}
 */
export function liftSubjectVisibility(rgba, { alphaFloor = 235, lumFloor = LUM_FLOOR } = {}) {
  let alphaLifted = 0;
  let lumLifted = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    let a = rgba[i + 3];
    if (a < 8) continue;
    if (a < alphaFloor) {
      // Conteúdo mid/soft → quase opaco; residual de fundo fica.
      const lum = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
      const sat = saturation(rgba[i], rgba[i + 1], rgba[i + 2]);
      if (lum > 14 || sat > 0.18 || a >= 40) {
        rgba[i + 3] = 255;
        a = 255;
        alphaLifted += 1;
      } else if (a >= 16) {
        rgba[i + 3] = Math.min(255, Math.max(alphaFloor, Math.round(a * 2.1 + 48)));
        a = rgba[i + 3];
        alphaLifted += 1;
      }
    }
    if (a < 200) continue;
    const before = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
    if (before >= lumFloor) continue;
    const [nr, ng, nb] = liftLuminanceRgb(rgba[i], rgba[i + 1], rgba[i + 2], lumFloor);
    rgba[i] = nr;
    rgba[i + 1] = ng;
    rgba[i + 2] = nb;
    lumLifted += 1;
  }
  return { alphaLifted, lumLifted };
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
 * Remove só o fundo ligado às bordas. Ícones ctonianos são quase pretos sobre preto:
 * o filete (ouro/teal/brasa) fecha o contorno e o miolo fica opaco — sem flood
 * que “come” sombra interna nem feather largo que deixa o ícone fantasma.
 */
export function removeBackgroundBuffer(rawBuffer, width, height) {
  const data = new Uint8Array(rawBuffer);
  const totalPixels = width * height;
  const [bgR, bgG, bgB] = estimateBorderBackgroundColor(data, width, height);

  const ink = new Uint8Array(totalPixels);
  for (let p = 0; p < totalPixels; p += 1) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 16) continue;
    const dist = colorDist(r, g, b, bgR, bgG, bgB);
    const lum = luminance(r, g, b);
    const sat = saturation(r, g, b);
    // Traço / volume do objeto (não o campo de fundo).
    if (dist > 24 || lum > 28 || (sat > 0.32 && lum > 22)) ink[p] = 1;
  }

  // Dilata o filete para fechar microfrestas e proteger o miolo escuro.
  const barrier = new Uint8Array(ink);
  const bridge = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!ink[y * width + x]) continue;
      for (let dy = -bridge; dy <= bridge; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -bridge; dx <= bridge; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          barrier[ny * width + nx] = 1;
        }
      }
    }
  }

  const exterior = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;
  function push(p) {
    if (exterior[p] || barrier[p]) return;
    exterior[p] = 1;
    queue[tail++] = p;
  }
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    push(y * width);
    push(y * width + (width - 1));
  }
  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const neighbors = [curr - 1, curr + 1, curr - width, curr + width];
    for (let n = 0; n < 4; n += 1) {
      const next = neighbors[n];
      if (next < 0 || next >= totalPixels || exterior[next] || barrier[next]) continue;
      const nx = next % width;
      if (Math.abs(nx - cx) > 1) continue;
      exterior[next] = 1;
      queue[tail++] = next;
    }
  }

  // Feather mínimo (1px) só na borda verdadeira do objeto × fundo.
  const feather = new Float32Array(totalPixels);
  feather.fill(1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (exterior[idx]) {
        feather[idx] = 0;
        continue;
      }
      let touchesExterior = false;
      for (let dy = -1; dy <= 1 && !touchesExterior; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (exterior[ny * width + nx]) {
            touchesExterior = true;
            break;
          }
        }
      }
      if (!touchesExterior) continue;
      const i = idx * 4;
      const dist = colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB);
      // Quase opaco: só suaviza o filete extremo do fundo.
      feather[idx] = Math.max(0.72, Math.min(1, dist / 36));
    }
  }

  for (let p = 0; p < totalPixels; p += 1) {
    const i = p * 4;
    if (exterior[p]) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }
    const factor = feather[p];
    // Interior 100% opaco; filete mínimo ≥ ~217 (0.85) para não lavar no UI escuro.
    if (factor >= 0.999) {
      data[i + 3] = 255;
    } else {
      data[i + 3] = Math.max(217, Math.round(255 * Math.max(0.85, factor)));
    }
  }

  liftSubjectVisibility(data, { alphaFloor: 235, lumFloor: LUM_FLOOR });

  return Buffer.from(data.buffer);
}

/**
 * Recorta a bounding-box não transparente e centraliza em um canvas quadrado com margem uniforme.
 */
export async function trimAndCenterIcon(rgbaBuffer, width, height, targetSize = TARGET_SIZE) {
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
      .resize(FULL_ART_TARGET_SIZE, FULL_ART_TARGET_SIZE, {
        fit: 'cover',
        position: 'center',
        kernel: sharp.kernel.lanczos3,
      })
      .removeAlpha()
      .median(1)
      .sharpen({ sigma: 0.75, m1: 0.8, m2: 1.5 })
      .webp({ quality: 97, smartSubsample: true })
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

async function findRawSource(dir, id) {
  for (const ext of ['.png', '.webp', '.jpg', '.jpeg']) {
    const candidate = path.join(dir, `${id}${ext}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * Recuperação sem bruto: reforça alpha mid/soft + lift de luminância
 * (ícones já processados demais pelo flood antigo, ou full-art escura).
 */
export async function repairAchievementAlpha(achievementId) {
  const filePath = path.join(ACHIEVEMENTS_DIR, `${achievementId}.webp`);
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const { alphaLifted, lumLifted } = liftSubjectVisibility(out, {
    alphaFloor: 235,
    lumFloor: LUM_FLOOR,
  });

  // Full-art (soberano): sem trim transparente — grava cover opaco.
  if (achievementId === 'soberano_do_submundo') {
    const webp = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .removeAlpha()
      .webp({ quality: 97, smartSubsample: true })
      .toBuffer();
    await fs.writeFile(filePath, webp);
    return {
      outPath: filePath,
      mode: 'repair-full-art-lum',
      lifted: alphaLifted + lumLifted,
      alphaLifted,
      lumLifted,
    };
  }

  const webp = await trimAndCenterIcon(out, info.width, info.height, TARGET_SIZE);
  await fs.writeFile(filePath, webp);
  return {
    outPath: filePath,
    mode: 'repair-alpha',
    lifted: alphaLifted + lumLifted,
    alphaLifted,
    lumLifted,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const exportRefsIdx = args.indexOf('--export-refs');
  if (exportRefsIdx !== -1) {
    const dir = path.resolve(ROOT, args[exportRefsIdx + 1] || '.tmp-ach-refs');
    await exportAula1ReferencePngs(dir);
    return;
  }

  const repairIdx = args.indexOf('--repair-ids');
  if (repairIdx !== -1) {
    const ids = String(args[repairIdx + 1] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const id of ids) {
      const res = await repairAchievementAlpha(id);
      console.log(`[REPAIR] ${id} lifted=${res.lifted} -> ${path.relative(ROOT, res.outPath)}`);
    }
    return;
  }

  const batchIdx = args.indexOf('--batch-dir');
  if (batchIdx !== -1) {
    const dir = path.resolve(ROOT, args[batchIdx + 1]);
    const catalogRaw = JSON.parse(await fs.readFile(path.join(ACHIEVEMENTS_DIR, 'catalog.json'), 'utf8'));
    const validIds = new Set(
      (Array.isArray(catalogRaw) ? catalogRaw : []).map((entry) => path.parse(entry.file).name)
    );
    const onlyIdx = args.indexOf('--ids');
    const onlyIds = onlyIdx === -1
      ? null
      : new Set(
        String(args[onlyIdx + 1] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    const preservedAula1 = new Set([
      'aula1_concluida',
      'gdd_integracao_documental',
      // segredos da aula 1 só são preservados no batch completo; --ids força reprocesso
    ]);
    const entries = await fs.readdir(dir);
    for (const file of entries) {
      if (!/\.(png|webp|jpg|jpeg)$/i.test(file)) continue;
      const id = path.parse(file).name;
      if (!validIds.has(id)) continue;
      if (onlyIds && !onlyIds.has(id)) continue;
      if (!onlyIds && preservedAula1.has(id)) continue;
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
