/**
 * Generates PWA PNG icons (teal background + white "N" + amber bar)
 * without any external dependencies. Run: node scripts/generate-icons.mjs
 */
import { deflateSync, crc32 } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const TEAL = [0x0f, 0x76, 0x6e, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];
const AMBER = [0xf5, 0x9e, 0x0b, 0xff];

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE((crc32(Buffer.concat([typeBuf, data])) >>> 0), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function pixelColor(nx, ny) {
  // Amber underline bar
  if (nx >= 0.24 && nx <= 0.76 && ny >= 0.82 && ny <= 0.88) return AMBER;
  // N ke left / right vertical bars
  const inVertical =
    ny >= 0.2 && ny <= 0.76 &&
    ((nx >= 0.24 && nx <= 0.36) || (nx >= 0.64 && nx <= 0.76));
  if (inVertical) return WHITE;
  // N ki diagonal stroke
  const t = (ny - 0.2) / 0.56;
  const lineCenter = 0.24 + t * 0.52;
  if (ny >= 0.2 && ny <= 0.76 && Math.abs(nx - lineCenter) <= 0.065) {
    return WHITE;
  }
  return TEAL;
}

function generateIcon(size, fileName) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelColor((x + 0.5) / size, (y + 0.5) / size);
      const offset = (y * size + x) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }
  const outPath = join(PUBLIC_DIR, fileName);
  writeFileSync(outPath, encodePng(size, size, rgba));
  console.log(`✓ ${fileName} (${size}x${size})`);
}

mkdirSync(PUBLIC_DIR, { recursive: true });
generateIcon(192, "icon-192.png");
generateIcon(512, "icon-512.png");
generateIcon(180, "icon-180.png");
