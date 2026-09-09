/**
 * Gera assets/submundo/asfodelos_echo.wav com "PERSEPHONE_PASS"
 * desenhado no domínio da frequência (espectrograma).
 *
 * Uso: node scripts/generate-asfodelos-wav.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'assets', 'submundo', 'asfodelos_echo.wav');

/** Fonte 5x7 mínima (maiúsculas + _ ) */
const GLYPHS = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
};

const TEXT = 'PERSEPHONE_PASS';
const SAMPLE_RATE = 44100;
const COL_MS = 45;
const FREQ_LOW = 1800;
const FREQ_HIGH = 4200;
const ROW_COUNT = 7;
const NOISE = 0.035;

function textToColumns(text) {
  const cols = [];
  for (const ch of text) {
    const glyph = GLYPHS[ch] || GLYPHS._;
    for (let x = 0; x < 5; x += 1) {
      const column = [];
      for (let y = 0; y < ROW_COUNT; y += 1) {
        column.push(glyph[y][x] === '1' ? 1 : 0);
      }
      cols.push(column);
    }
    cols.push(Array(ROW_COUNT).fill(0));
  }
  return cols;
}

function writeWav(filePath, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((clipped * 32767) | 0, 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

const columns = textToColumns(TEXT);
const samplesPerCol = Math.floor((SAMPLE_RATE * COL_MS) / 1000);
const samples = new Float64Array(columns.length * samplesPerCol);

for (let c = 0; c < columns.length; c += 1) {
  const column = columns[c];
  const start = c * samplesPerCol;
  for (let i = 0; i < samplesPerCol; i += 1) {
    const t = (start + i) / SAMPLE_RATE;
    let sample = (Math.random() * 2 - 1) * NOISE;
    for (let row = 0; row < ROW_COUNT; row += 1) {
      if (!column[row]) continue;
      const freq = FREQ_HIGH - ((FREQ_HIGH - FREQ_LOW) * row) / (ROW_COUNT - 1);
      const envelope = Math.sin((Math.PI * i) / samplesPerCol);
      sample += Math.sin(2 * Math.PI * freq * t) * 0.12 * envelope;
    }
    samples[start + i] = sample;
  }
}

writeWav(outPath, samples);
console.log(`WAV gerado: ${outPath} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
