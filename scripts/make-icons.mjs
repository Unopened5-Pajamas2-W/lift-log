/**
 * Generate solid-color PNG app icons using only Node built-ins (no deps).
 * Usage: node scripts/make-icons.mjs
 * Writes public/icons/icon-180.png, icon-192.png, icon-512.png + maskable.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const OUT = new URL("../public/icons/", import.meta.url);

const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Solid bg with a simple white barbell glyph drawn in the pixel buffer. */
function makePng(size) {
  const bg = [17, 24, 39]; // slate-900
  const fg = [245, 245, 245];
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  const barY0 = Math.floor(size * 0.44);
  const barY1 = Math.floor(size * 0.56);
  const plateX = [0.18, 0.3, 0.7, 0.82];
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      let c = bg;
      const fx = x / size;
      const inBar = y >= barY0 && y < barY1 && fx > 0.12 && fx < 0.88;
      const inPlate =
        fx > 0.1 &&
        fx < 0.9 &&
        ((fx > plateX[0] && fx < plateX[0] + 0.06) ||
          (fx > plateX[1] && fx < plateX[1] + 0.045) ||
          (fx > plateX[2] && fx < plateX[2] + 0.045) ||
          (fx > plateX[3] && fx < plateX[3] + 0.06)) &&
        y > size * 0.28 &&
        y < size * 0.72;
      if (inBar || inPlate) c = fg;
      raw[o++] = c[0];
      raw[o++] = c[1];
      raw[o++] = c[2];
      raw[o++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

mkdirSync(OUT, { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, OUT), makePng(size));
  console.log(`wrote icon-${size}.png`);
}
