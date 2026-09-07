// png_encode.js — minimal PNG encoder (8-bit RGB or RGBA, filter 0) + a montage helper. Zero dependencies (node:zlib).
const zlib = require('node:zlib');

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }

// img: {width, height, channels?: 3|4, data: Uint8Array RGB or RGBA (straight alpha)}
function encodePNG(img) {
  const { width, height, data } = img; const ch = img.channels === 4 ? 4 : 3;
  const raw = Buffer.alloc((width * ch + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * ch + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * width * ch, width * ch).copy(raw, y * (width * ch + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// tiles: [{img (decoded, channels 3|4), label?}] laid out in a grid of `cols`; gap px; bg color; returns an RGB image
function montage(tiles, { cols = 2, gap = 12, bg = [4, 4, 2] } = {}) {
  const tw = Math.max(...tiles.map(t => t.img.width)), th = Math.max(...tiles.map(t => t.img.height));
  const rows = Math.ceil(tiles.length / cols);
  const width = cols * tw + (cols + 1) * gap, height = rows * th + (rows + 1) * gap;
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) { data[i * 3] = bg[0]; data[i * 3 + 1] = bg[1]; data[i * 3 + 2] = bg[2]; }
  tiles.forEach((t, k) => {
    const cx = gap + (k % cols) * (tw + gap), cy = gap + Math.floor(k / cols) * (th + gap);
    const im = t.img, ch = im.channels;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      const si = (y * im.width + x) * ch, di = ((cy + y) * width + (cx + x)) * 3;
      data[di] = im.data[si]; data[di + 1] = im.data[si + 1]; data[di + 2] = im.data[si + 2];
    }
  });
  return { width, height, data };
}

module.exports = { encodePNG, montage };
