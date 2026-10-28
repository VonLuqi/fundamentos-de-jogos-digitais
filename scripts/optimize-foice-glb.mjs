#!/usr/bin/env node
/**
 * Otimiza o modelo 3D da Foice para a web: reduz e recomprime as texturas embutidas
 * (o modelo do Tripo vem com ~7 MB de texturas; na tela a Foice tem ~300 px).
 * Geometria e material ficam intactos. Também atualiza a versão de cache da pasta.
 *
 * Fonte:  assets/despertar/sprites/foice/foice_3d.glb   (fora do git — reprocessar daqui)
 * Saída:  assets/despertar/sprites/foice/foice-3d.glb   (o que o jogo carrega)
 *
 * Uso: npm run despertar:foice3d [-- --size 1024]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { writeArtVersions } from './update-art-versions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'foice');
const SRC = path.join(DIR, 'foice_3d.glb');
const OUT = path.join(DIR, 'foice-3d.glb');
const sizeArg = process.argv.indexOf('--size');
const SIZE = sizeArg > -1 ? Number(process.argv[sizeArg + 1]) : 1024;
/** Normal e metal/rugosidade: detalhe fino que some em ~300 px de tela — metade da cor basta. */
const DATA_SIZE = Math.max(256, Math.round(SIZE / 2));

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function readGlb(buf) {
  if (buf.readUInt32LE(0) !== GLB_MAGIC) throw new Error('não é GLB');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === CHUNK_JSON) json = JSON.parse(data.toString('utf8'));
    else if (type === CHUNK_BIN) bin = data;
    offset += 8 + len;
  }
  return { json, bin };
}

const pad4 = (n) => (4 - (n % 4)) % 4;

function writeGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPadded = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length), 0x20)]);
  const binPadded = Buffer.concat([bin, Buffer.alloc(pad4(bin.length), 0)]);
  const total = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const chunk = (type, data) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, data]);
  };
  return Buffer.concat([header, chunk(CHUNK_JSON, jsonPadded), chunk(CHUNK_BIN, binPadded)]);
}

/** Qual mapa cada imagem é (pelos materiais), para escolher a compressão. */
function imageRoles(json) {
  const roles = {};
  const mark = (texInfo, role) => {
    if (texInfo == null) return;
    const src = json.textures?.[texInfo.index]?.source;
    if (src != null) roles[src] = role;
  };
  for (const m of json.materials || []) {
    mark(m.pbrMetallicRoughness?.baseColorTexture, 'color');
    mark(m.pbrMetallicRoughness?.metallicRoughnessTexture, 'data');
    mark(m.normalTexture, 'normal');
    mark(m.emissiveTexture, 'color');
    mark(m.occlusionTexture, 'data');
  }
  return roles;
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Fonte ausente: ${path.relative(ROOT, SRC)}`);
  const srcBuf = fs.readFileSync(SRC);
  const { json, bin } = readGlb(srcBuf);
  const roles = imageRoles(json);
  const imageViews = new Map((json.images || []).map((im, i) => [im.bufferView, i]));

  // Reconstrói o BIN: imagens recomprimidas, o resto copiado como está.
  const parts = [];
  let cursor = 0;
  const views = json.bufferViews.map((bv, viewIndex) => {
    let data = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    return { bv, viewIndex, data };
  });
  for (const v of views) {
    const imgIndex = imageViews.get(v.viewIndex);
    if (imgIndex != null) {
      const role = roles[imgIndex] || 'color';
      // Normal e metal/rugosidade são dados: JPEG de alta qualidade, sem chroma subsampling.
      const quality = role === 'color' ? 82 : 90;
      v.data = await sharp(v.data)
        .resize(role === 'color' ? SIZE : DATA_SIZE, role === 'color' ? SIZE : DATA_SIZE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: role === 'color' ? '4:2:0' : '4:4:4' })
        .toBuffer();
      json.images[imgIndex].mimeType = 'image/jpeg';
    }
    const padding = pad4(cursor);
    if (padding) {
      parts.push(Buffer.alloc(padding));
      cursor += padding;
    }
    v.bv.byteOffset = cursor;
    v.bv.byteLength = v.data.length;
    parts.push(v.data);
    cursor += v.data.length;
  }
  const newBin = Buffer.concat(parts);
  json.buffers = [{ byteLength: newBin.length }];
  json.asset = { ...json.asset, extras: { ...(json.asset?.extras || {}), optimizedBy: 'scripts/optimize-foice-glb.mjs', textureSize: SIZE } };

  const out = writeGlb(json, newBin);
  fs.writeFileSync(OUT, out);
  // Confere que o resultado relê e que as texturas decodificam.
  const check = readGlb(out);
  for (const im of check.json.images || []) {
    const bv = check.json.bufferViews[im.bufferView];
    const meta = await sharp(check.bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength)).metadata();
    console.log(`  textura ${meta.width}×${meta.height} ${meta.format} ${(bv.byteLength / 1024).toFixed(0)} KB`);
  }
  console.log(`foice-3d.glb: ${(srcBuf.length / 1e6).toFixed(2)} MB → ${(out.length / 1e6).toFixed(2)} MB`);
  writeArtVersions();
}

await main();
