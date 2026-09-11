/**
 * Gera assets/submundo/hecate_relic.png
 * - tEXt Comment enigmático (metadados)
 * - LSB do canal vermelho (bit 0) = HECATE_TORCH_KEY_777
 *
 * Uso: node scripts/generate-hecate-relic.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'assets', 'submundo', 'hecate_relic.png');

const SECRET = 'HECATE_TORCH_KEY_777';
const COMMENT = 'A tocha acende no vermelho mais fraco.';
const WIDTH = 256;
const HEIGHT = 256;

/** CRC-32 ISO (PNG) */
function pngCrc(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c ^= data[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(pngCrc(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodeLsbRgba(width, height, message) {
  const bits = [];
  for (let i = 0; i < message.length; i += 1) {
    const code = message.charCodeAt(i);
    for (let b = 7; b >= 0; b -= 1) bits.push((code >> b) & 1);
  }
  for (let b = 7; b >= 0; b -= 1) bits.push(0);

  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(height * rowBytes);
  let bitIdx = 0;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const px = rowStart + 1 + x * 4;
      const n = (Math.sin(x * 0.07 + y * 0.05) + 1) * 0.5;
      let r = Math.floor(28 + n * 40 + ((x ^ y) & 15));
      const g = Math.floor(18 + n * 22);
      const b = Math.floor(42 + n * 55);

      if (bitIdx < bits.length) {
        r = (r & 0xfe) | bits[bitIdx];
        bitIdx += 1;
      } else {
        r &= 0xfe;
      }

      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = 255;
    }
  }
  return raw;
}

function buildPng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const textData = Buffer.concat([
    Buffer.from('Comment\0', 'latin1'),
    Buffer.from(COMMENT, 'utf8'),
  ]);

  const compressed = zlib.deflateSync(encodeLsbRgba(WIDTH, HEIGHT, SECRET), { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('tEXt', textData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const png = buildPng();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, png);
console.log(`OK — ${outPath} (${png.length} bytes)`);
