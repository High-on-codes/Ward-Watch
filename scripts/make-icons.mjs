// Generates simple teal PNG icons with a white pin (no dependencies).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2, cy = size * 0.42, r = size * 0.22, hole = size * 0.09;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      // pin = circle + triangle tapering to a point below
      const tipY = size * 0.8;
      const inTri = y > cy && y < tipY && Math.abs(dx) < r * (1 - (y - cy) / (tipY - cy));
      let white = (d < r || inTri) && d >= hole;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const [R, G, B] = white ? [255, 255, 255] : [15, 118, 110];
      raw[o] = R; raw[o + 1] = G; raw[o + 2] = B; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}
writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
console.log("icons written");
