#!/usr/bin/env node

import path from 'node:path';
import { promises as fs } from 'node:fs';

const DEFAULTS = {
  avatarsDir: 'assets/avatars',
  apiFile: 'js/api.js',
  readmeFile: 'assets/avatars/README.md',
  cleanLegacy: false,
};

function printHelp() {
  console.log(`
Uso:
  node scripts/sync-avatar-catalog.mjs [opcoes]

Opcoes:
  --avatars-dir <pasta>  Pasta de avatares (padrao: assets/avatars)
  --api-file <arquivo>   Arquivo do catalogo frontend (padrao: js/api.js)
  --readme-file <arquivo> README da pasta de avatares (padrao: assets/avatars/README.md)
  --clean-legacy         Remove arquivos legado de avatar (nao .webp)
  --help                 Exibe esta ajuda

Exemplos:
  node scripts/sync-avatar-catalog.mjs
  node scripts/sync-avatar-catalog.mjs --clean-legacy
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

    if (arg === '--clean-legacy') {
      out.cleanLegacy = true;
      continue;
    }

    if (arg === '--avatars-dir') {
      out.avatarsDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--api-file') {
      out.apiFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--readme-file') {
      out.readmeFile = argv[i + 1];
      i += 1;
      continue;
    }

    throw new Error(`Argumento desconhecido: ${arg}`);
  }

  return out;
}

function toPosixPath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

function avatarFileIndex(fileName) {
  const match = /^avatar(\d+)\.webp$/i.exec(fileName);
  if (!match) return null;
  return Number(match[1]);
}

function sortByAvatarIndex(a, b) {
  return avatarFileIndex(a) - avatarFileIndex(b);
}

function buildAvatarArrayBlock(files) {
  const lines = files.map((file) => `  '${file}',`);
  return `const AVATAR_FILES = [\n${lines.join('\n')}\n];`;
}

function buildReadme(files) {
  const list = files.map((file) => `assets/avatars/${file}`).join('\n');

  return `# Pasta de Avatares

Esta pasta guarda a galeria fixa de avatares do projeto. O frontend
carrega cada imagem por caminho exato, sem testar extensoes em serie.
A galeria foi padronizada para WebP para reduzir peso e simplificar a
resolucao. O indice salvo no banco (avatar_index) continua sendo
0-based e corresponde a ordem abaixo.

Total de avatares ativos: ${files.length}

Galeria atual:

\`\`\`
${list}
\`\`\`

Recomendacoes:
- manter nomes e ordem estaveis para nao alterar o avatar de usuarios
  que ja escolheram um indice;
- usar imagens quadradas, de preferencia 256x256px;
- manter WebP como formato padrao para os avatares;
- ao importar novos avatares, usar o script scripts/import-avatars-webp.mjs;
- apos importar/limpar, executar scripts/sync-avatar-catalog.mjs para
  manter js/api.js e este README sincronizados.
`;
}

async function getAvatarFiles(avatarsDir) {
  const entries = await fs.readdir(avatarsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const webpAvatarFiles = files
    .filter((name) => /^avatar\d+\.webp$/i.test(name))
    .sort(sortByAvatarIndex);

  const legacyAvatarFiles = files
    .filter((name) => /^avatar\d+\./i.test(name) && !/\.webp$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));

  return { webpAvatarFiles, legacyAvatarFiles };
}

function validateContiguousIndexes(webpAvatarFiles) {
  const indexes = webpAvatarFiles.map(avatarFileIndex);
  const gaps = [];

  for (let i = 0; i < indexes.length; i += 1) {
    const expected = i + 1;
    if (indexes[i] !== expected) {
      gaps.push({ expected, found: indexes[i] });
    }
  }

  return gaps;
}

async function updateApiCatalog(apiFilePath, webpAvatarFiles) {
  const source = await fs.readFile(apiFilePath, 'utf8');
  const replacement = buildAvatarArrayBlock(webpAvatarFiles);
  const avatarBlockPattern = /const AVATAR_FILES = \[[\s\S]*?\];/;

  if (!avatarBlockPattern.test(source)) {
    throw new Error('Nao foi possivel localizar o bloco const AVATAR_FILES em js/api.js.');
  }

  const updated = source.replace(
    avatarBlockPattern,
    replacement
  );

  await fs.writeFile(apiFilePath, updated, 'utf8');
}

async function removeLegacyFiles(avatarsDir, legacyAvatarFiles) {
  let removed = 0;

  for (const fileName of legacyAvatarFiles) {
    await fs.unlink(path.join(avatarsDir, fileName));
    removed += 1;
  }

  return removed;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const rootDir = process.cwd();
    const avatarsDir = path.resolve(rootDir, options.avatarsDir);
    const apiFilePath = path.resolve(rootDir, options.apiFile);
    const readmeFilePath = path.resolve(rootDir, options.readmeFile);

    const avatarsStat = await fs.stat(avatarsDir).catch(() => null);
    if (!avatarsStat || !avatarsStat.isDirectory()) {
      throw new Error(`Pasta de avatares invalida: ${toPosixPath(avatarsDir)}`);
    }

    let { webpAvatarFiles, legacyAvatarFiles } = await getAvatarFiles(avatarsDir);

    if (options.cleanLegacy && legacyAvatarFiles.length > 0) {
      await removeLegacyFiles(avatarsDir, legacyAvatarFiles);
      ({ webpAvatarFiles, legacyAvatarFiles } = await getAvatarFiles(avatarsDir));
    }

    if (webpAvatarFiles.length === 0) {
      throw new Error('Nenhum arquivo avatarN.webp encontrado para sincronizar.');
    }

    const gaps = validateContiguousIndexes(webpAvatarFiles);
    if (gaps.length > 0) {
      const firstGap = gaps[0];
      throw new Error(
        `Sequencia de avatares invalida. Esperado avatar${firstGap.expected}.webp, encontrado avatar${firstGap.found}.webp.`
      );
    }

    await updateApiCatalog(apiFilePath, webpAvatarFiles);

    const readmeContent = buildReadme(webpAvatarFiles);
    await fs.writeFile(readmeFilePath, readmeContent, 'utf8');

    console.log('Sincronizacao de avatares concluida.');
    console.log(`Pasta: ${toPosixPath(avatarsDir)}`);
    console.log(`Total webp ativos: ${webpAvatarFiles.length}`);
    console.log(`Legados restantes nao-webp: ${legacyAvatarFiles.length}`);
    console.log(`Catalogo atualizado: ${toPosixPath(apiFilePath)}`);
    console.log(`README atualizado: ${toPosixPath(readmeFilePath)}`);
    if (options.cleanLegacy) {
      console.log('Modo limpeza de legados: aplicado.');
    }
  } catch (error) {
    console.error(`Erro: ${error?.message || 'Falha inesperada.'}`);
    console.error('Use --help para consultar as opcoes.');
    process.exit(1);
  }
}

main();
