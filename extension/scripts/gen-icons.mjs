#!/usr/bin/env node
// Generate flat extension icons (no deps): an indigo rounded tile with a white
// dot. Placeholder-quality but crisp at each size — replace with real art later.
//   node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "icons");
const INDIGO = [79, 70, 229];

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function pngFor(size) {
  const r = size * 0.22; // corner radius
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const dotR = size * 0.26;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      // rounded-rect signed-distance test
      const dx = Math.max(r - x, 0, x - (size - 1 - r));
      const dy = Math.max(r - y, 0, y - (size - 1 - r));
      const inTile = dx * dx + dy * dy <= r * r;
      const inDot = (x - cx) ** 2 + (y - cy) ** 2 <= dotR * dotR;
      if (!inTile) {
        raw[p++] = 0; raw[p++] = 0; raw[p++] = 0; raw[p++] = 0;
      } else if (inDot) {
        raw[p++] = 255; raw[p++] = 255; raw[p++] = 255; raw[p++] = 255;
      } else {
        raw[p++] = INDIGO[0]; raw[p++] = INDIGO[1]; raw[p++] = INDIGO[2]; raw[p++] = 255;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  writeFileSync(path.join(outDir, `icon${size}.png`), pngFor(size));
  console.log(`wrote icon${size}.png`);
}
