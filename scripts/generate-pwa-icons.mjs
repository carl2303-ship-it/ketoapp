#!/usr/bin/env node
/**
 * Writes PWA icons to public/ (no native deps).
 * Solid emerald square + white "K" is enough for installability.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(pub, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Minimal RGB PNG: emerald bg, optional white K glyph via simple bitmap. */
function makePng(size, { maskable = false } = {}) {
  const bg = [5, 150, 105]; // #059669
  const fg = [236, 253, 245]; // #ecfdf5
  const rows = [];
  const margin = maskable ? Math.floor(size * 0.18) : Math.floor(size * 0.12);
  // Rough 5x7 "K" in the lower-center area
  const kScale = Math.max(1, Math.floor(size / 16));
  const kW = 5 * kScale;
  const kH = 7 * kScale;
  const kX0 = Math.floor((size - kW) / 2);
  const kY0 = Math.floor(size * 0.58);
  const glyph = [
    "10001",
    "10010",
    "10100",
    "11000",
    "10100",
    "10010",
    "10001",
  ];

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      let [r, g, b] = bg;
      // rounded-ish soft edge for non-maskable: leave as square (OS masks)
      const gy = Math.floor((y - kY0) / kScale);
      const gx = Math.floor((x - kX0) / kScale);
      if (gy >= 0 && gy < 7 && gx >= 0 && gx < 5 && glyph[gy][gx] === "1") {
        [r, g, b] = fg;
      }
      // ring accent
      const cx = size / 2;
      const cy = size * 0.38;
      const dist = Math.hypot(x - cx, y - cy);
      const ringR = size * 0.16;
      if (Math.abs(dist - ringR) < size * 0.03 && y < size * 0.55) {
        [r, g, b] = fg;
      }
      if (maskable && (x < margin || y < margin || x >= size - margin || y >= size - margin)) {
        // keep solid for safe zone
      }
      const i = 1 + x * 3;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outs = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-512-maskable.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];

for (const [name, size, opts] of outs) {
  writeFileSync(join(pub, name), makePng(size, opts));
  console.log("wrote", name);
}
console.log("PWA icons ready");
