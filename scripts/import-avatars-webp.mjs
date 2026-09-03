#!/usr/bin/env node

import path from 'node:path';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

const SUPPORTED_INPUT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.jfif',
  '.bmp',
  '.tif',
  '.tiff',
  '.avif',
]);

const DEFAULTS = {
  mode: 'append',
  quality: 82,
  size: 256,
  fit: 'cover',
  recursive: false,
  output: 'assets/avatars',
};

function printHelp() {
  console.log(`
Uso:
  node scripts/import-avatars-webp.mjs --input <pasta> [opcoes]

Opcoes:
  --input <pasta>        Pasta de origem com as imagens (obrigatorio)
  --output <pasta>       Pasta de destino (padrao: assets/avatars)
  --mode <append|replace> Modo de escrita (padrao: append)
  --size <numero>        Lado da imagem final quadrada em px (padrao: 256)
  --fit <cover|contain>  Estrategia de resize (padrao: cover)
  --quality <1-100>      Qualidade WebP (padrao: 82)
  --recursive            Le subpastas da origem
  --help                 Exibe esta ajuda

Exemplos:
  node scripts/import-avatars-webp.mjs --input "D:/imagens/novos-avatares"
  node scripts/import-avatars-webp.mjs --input ./entrada --mode replace --size 320 --fit contain
`);
}

function parseArgs(argv) {
  const out = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }

    if (arg === '--recursive') {
      out.recursive = true;
      continue;
    }

    if (arg === '--input' || arg === '-i') {
      out.input = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      out.output = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--mode' || arg === '-m') {
      out.mode = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--size' || arg === '-s') {
      out.size = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--fit') {
      out.fit = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--quality' || arg === '-q') {
      out.quality = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    throw new Error(`Argumento desconhecido: ${arg}`);
  }

  return out;
}

function validateOptions(options) {
  if (options.help) return;

  if (!options.input) {
    throw new Error('Parametro obrigatorio ausente: --input <pasta>.');
  }

  if (!['append', 'replace'].includes(options.mode)) {
    throw new Error('Modo invalido. Use --mode append ou --mode replace.');
  }

  if (!['cover', 'contain'].includes(options.fit)) {
    throw new Error('Valor invalido para --fit. Use cover ou contain.');
  }

  if (!Number.isInteger(options.size) || options.size <= 0) {
    throw new Error('Valor invalido para --size. Use um inteiro positivo.');
  }

  if (!Number.isFinite(options.quality) || options.quality < 1 || options.quality > 100) {
    throw new Error('Valor invalido para --quality. Use um numero entre 1 e 100.');
  }
}

async function listFilesDeep(dir, recursive) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        const nested = await listFilesDeep(abs, true);
        files.push(...nested);
      }
      continue;
    }

    files.push(abs);
  }

  return files;
}

function naturalPathCompare(a, b) {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function isSupportedImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_INPUT_EXTENSIONS.has(ext);
}

function toPosixPath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function getExistingAvatarIndexes(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const indexes = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = /^avatar(\d+)\.webp$/i.exec(entry.name);
    if (!match) continue;
    indexes.push(Number(match[1]));
  }

  return indexes;
}

async function removeExistingWebpAvatars(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/^avatar\d+\.webp$/i.test(entry.name)) continue;
    await fs.unlink(path.join(outputDir, entry.name));
    removed += 1;
  }

  return removed;
}

function buildTargetPath(outputDir, index) {
  return path.join(outputDir, `avatar${index}.webp`);
}

async function convertToWebp(sourcePath, targetPath, options) {
  const resizeBase = {
    width: options.size,
    height: options.size,
    fit: options.fit,
    position: 'attention',
    withoutEnlargement: false,
  };

  const pipeline = sharp(sourcePath).rotate();

  if (options.fit === 'contain') {
    pipeline
      .resize({
        ...resizeBase,
        background: { r: 13, g: 10, b: 16, alpha: 1 },
      })
      .webp({ quality: options.quality })
      .toFile(targetPath);
    return;
  }

  pipeline
    .resize(resizeBase)
    .webp({ quality: options.quality })
    .toFile(targetPath);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    validateOptions(options);

    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const rootDir = process.cwd();
    const inputDir = path.resolve(rootDir, options.input);
    const outputDir = path.resolve(rootDir, options.output);

    const inputStat = await fs.stat(inputDir).catch(() => null);
    if (!inputStat || !inputStat.isDirectory()) {
      throw new Error(`Pasta de entrada invalida: ${toPosixPath(inputDir)}`);
    }

    await ensureDirectory(outputDir);

    const allSourceFiles = await listFilesDeep(inputDir, options.recursive);
    const sortedSourceFiles = allSourceFiles
      .sort(naturalPathCompare);

    const validSourceFiles = sortedSourceFiles.filter(isSupportedImage);
    const ignoredFiles = sortedSourceFiles.length - validSourceFiles.length;

    if (validSourceFiles.length === 0) {
      console.log('Nenhuma imagem valida encontrada na pasta de entrada.');
      console.log(`Arquivos lidos: ${sortedSourceFiles.length}`);
      console.log(`Arquivos ignorados: ${ignoredFiles}`);
      process.exit(0);
    }

    let removedExisting = 0;
    let startIndex = 1;

    if (options.mode === 'replace') {
      removedExisting = await removeExistingWebpAvatars(outputDir);
    } else {
      const existingIndexes = await getExistingAvatarIndexes(outputDir);
      startIndex = existingIndexes.length > 0 ? Math.max(...existingIndexes) + 1 : 1;
    }

    const failures = [];
    const converted = [];

    for (let i = 0; i < validSourceFiles.length; i += 1) {
      const sourcePath = validSourceFiles[i];
      const targetIndex = startIndex + i;
      const targetPath = buildTargetPath(outputDir, targetIndex);

      try {
        await convertToWebp(sourcePath, targetPath, options);
        converted.push({ sourcePath, targetPath, targetIndex });
      } catch (error) {
        failures.push({ sourcePath, message: error?.message || 'Erro desconhecido' });
      }
    }

    const successCount = converted.length;
    const failCount = failures.length;
    const endIndex = successCount > 0 ? converted[converted.length - 1].targetIndex : (startIndex - 1);

    console.log('Importacao de avatares concluida.');
    console.log(`Modo: ${options.mode}`);
    console.log(`Entrada: ${toPosixPath(inputDir)}`);
    console.log(`Saida: ${toPosixPath(outputDir)}`);
    console.log(`Arquivos lidos: ${sortedSourceFiles.length}`);
    console.log(`Arquivos validos: ${validSourceFiles.length}`);
    console.log(`Arquivos ignorados: ${ignoredFiles}`);
    if (options.mode === 'replace') {
      console.log(`Avatares webp removidos no replace: ${removedExisting}`);
    }
    console.log(`Convertidos com sucesso: ${successCount}`);
    console.log(`Falhas na conversao: ${failCount}`);
    console.log(`Indice inicial: ${startIndex}`);
    console.log(`Indice final: ${endIndex}`);

    if (failCount > 0) {
      console.log('Falhas:');
      for (const failure of failures) {
        console.log(`- ${toPosixPath(failure.sourcePath)} -> ${failure.message}`);
      }
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Erro: ${error?.message || 'Falha inesperada.'}`);
    console.error('Use --help para ver os parametros aceitos.');
    process.exit(1);
  }
}

main();
