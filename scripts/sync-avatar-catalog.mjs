#!/usr/bin/env node

import path from 'node:path';
import { promises as fs } from 'node:fs';

const DEFAULTS = {
  avatarsDir: 'assets/avatars',
  apiFile: 'js/api.js',
  readmeFile: 'assets/avatars/README.md',
  stubFile: '',
  overwriteStub: false,
  cleanLegacy: false,
};

function printHelp() {
  console.log(`
Uso:
  node scripts/sync-avatar-catalog.mjs [opcoes]

Opcoes:
  --avatars-dir <pasta>  Pasta de avatares (padrao: assets/avatars)
  --api-file <arquivo>   Arquivo legado com const AVATAR_FILES (opcional)
  --readme-file <arquivo> README da pasta de avatares (padrao: assets/avatars/README.md)
  --stub-file <arquivo>  Gera/atualiza stub JSON de metadata (label/searchTerms)
  --overwrite-stub       Sobrescreve o stub inteiro com confirmacao explicita
  --clean-legacy         Remove arquivos legado de avatar (nao .webp)
  --help                 Exibe esta ajuda

Exemplos:
  node scripts/sync-avatar-catalog.mjs
  node scripts/sync-avatar-catalog.mjs --stub-file assets/avatars/catalog.stub.json
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

    if (arg === '--stub-file') {
      out.stubFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--overwrite-stub') {
      out.overwriteStub = true;
      continue;
    }

    throw new Error(`Argumento desconhecido: ${arg}`);
  }

  return out;
}

function toPosixPath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

function naturalCompare(a, b) {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function isLegacyAvatarImage(fileName) {
  return /\.(jpg|jpeg|png|gif|jfif|bmp|tif|tiff|avif)$/i.test(fileName);
}

function parseAvatarFilesFromApi(source) {
  const match = source.match(/const AVATAR_FILES = \[([\s\S]*?)\];/);
  if (!match) return [];

  const quoted = match[1].match(/'([^']+)'/g) || [];
  return quoted
    .map((entry) => entry.slice(1, -1).trim())
    .filter((entry) => entry.toLowerCase().endsWith('.webp'));
}

function orderAvatarFiles(webpFiles, apiCatalogFiles) {
  const available = new Set(webpFiles);
  const ordered = [];

  for (const file of apiCatalogFiles) {
    if (available.has(file)) {
      ordered.push(file);
      available.delete(file);
    }
  }

  const extras = Array.from(available).sort(naturalCompare);
  ordered.push(...extras);
  return ordered;
}

function buildAvatarArrayBlock(files) {
  const lines = files.map((file) => `  '${file}',`);
  return `const AVATAR_FILES = [\n${lines.join('\n')}\n];`;
}

function labelFromFileName(file) {
  const base = file.replace(/\.webp$/i, '');
  return base
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildMetadataStub(files) {
  return files.map((file) => ({
    file,
    label: labelFromFileName(file),
    searchTerms: [],
  }));
}

async function upsertMetadataStub(stubFilePath, files, overwriteStub) {
  const generated = buildMetadataStub(files);
  const stubStat = await fs.stat(stubFilePath).catch(() => null);

  if (!stubStat || overwriteStub) {
    await fs.mkdir(path.dirname(stubFilePath), { recursive: true });
    await fs.writeFile(stubFilePath, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
    return {
      created: !stubStat,
      overwritten: Boolean(stubStat && overwriteStub),
      merged: false,
      inserted: generated.length,
    };
  }

  const raw = await fs.readFile(stubFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  const existing = Array.isArray(parsed) ? parsed : [];
  const byFile = new Map(existing.map((item) => [String(item?.file || '').toLowerCase(), item]));

  let inserted = 0;
  for (const item of generated) {
    const key = item.file.toLowerCase();
    if (byFile.has(key)) continue;
    byFile.set(key, item);
    inserted += 1;
  }

  await fs.writeFile(stubFilePath, `${JSON.stringify(Array.from(byFile.values()), null, 2)}\n`, 'utf8');
  return { created: false, overwritten: false, merged: true, inserted };
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
  manter catalog.stub.json e este README sincronizados.
`;
}

async function getAvatarFiles(avatarsDir) {
  const entries = await fs.readdir(avatarsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const webpAvatarFiles = files
    .filter((name) => /\.webp$/i.test(name))
    .sort(naturalCompare);

  const legacyAvatarFiles = files
    .filter((name) => isLegacyAvatarImage(name))
    .sort(naturalCompare);

  return { webpAvatarFiles, legacyAvatarFiles };
}

async function updateApiCatalog(apiFilePath, webpAvatarFiles) {
  const source = await fs.readFile(apiFilePath, 'utf8');
  const replacement = buildAvatarArrayBlock(webpAvatarFiles);
  const avatarBlockPattern = /const AVATAR_FILES = \[[\s\S]*?\];/;

  if (!avatarBlockPattern.test(source)) {
    return { updated: false, reason: 'bloco const AVATAR_FILES nao encontrado' };
  }

  const updated = source.replace(
    avatarBlockPattern,
    replacement
  );

  await fs.writeFile(apiFilePath, updated, 'utf8');
  return { updated: true };
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
    const stubFilePath = options.stubFile ? path.resolve(rootDir, options.stubFile) : '';

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
      throw new Error('Nenhum arquivo .webp encontrado para sincronizar.');
    }

    const apiSource = await fs.readFile(apiFilePath, 'utf8');
    const apiCatalogFiles = parseAvatarFilesFromApi(apiSource);
    const orderedAvatarFiles = orderAvatarFiles(webpAvatarFiles, apiCatalogFiles);

    const apiResult = await updateApiCatalog(apiFilePath, orderedAvatarFiles);

    const readmeContent = buildReadme(orderedAvatarFiles);
    await fs.writeFile(readmeFilePath, readmeContent, 'utf8');

    let stubResult = null;
    if (stubFilePath) {
      stubResult = await upsertMetadataStub(stubFilePath, orderedAvatarFiles, options.overwriteStub);
    }

    console.log('Sincronizacao de avatares concluida.');
    console.log(`Pasta: ${toPosixPath(avatarsDir)}`);
    console.log(`Total webp ativos: ${webpAvatarFiles.length}`);
    console.log(`Legados restantes nao-webp: ${legacyAvatarFiles.length}`);
    if (apiResult.updated) {
      console.log(`Catalogo legado atualizado: ${toPosixPath(apiFilePath)}`);
    } else {
      console.log(`Catalogo legado nao atualizado (${apiResult.reason}).`);
    }
    console.log(`README atualizado: ${toPosixPath(readmeFilePath)}`);
    if (stubResult) {
      if (stubResult.created) {
        console.log(`Stub criado: ${toPosixPath(stubFilePath)} (${stubResult.inserted} itens)`);
      } else if (stubResult.overwritten) {
        console.log(`Stub sobrescrito com confirmacao: ${toPosixPath(stubFilePath)} (${stubResult.inserted} itens)`);
      } else {
        console.log(`Stub mesclado sem sobrescrever metadados manuais: ${toPosixPath(stubFilePath)} (+${stubResult.inserted} itens novos)`);
      }
    }
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
