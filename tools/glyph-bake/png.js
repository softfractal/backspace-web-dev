// png.js — minimal PNG decoder for Chrome screenshots (8-bit RGB/RGBA, non-interlaced).
// Zero dependencies: node:zlib only. Returns {width, height, channels, data: Uint8Array}.
const zlib = require('node:zlib');

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('bit depth ' + bitDepth + ' unsupported');
  if (interlace) throw new Error('interlaced PNG unsupported');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error('color type ' + colorType + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = channels, stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      switch (f) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); break; }
        default: throw new Error('bad filter ' + f);
      }
      cur[i] = v & 255;
    }
    out.set(cur, y * stride);
    prev = cur;
  }
  return { width, height, channels, data: out };
}

// Rec.709 luma of pixel (x,y) in 0..255
function luma(img, x, y) {
  const i = (y * img.width + x) * img.channels;
  const d = img.data;
  if (img.channels < 3) return d[i];
  return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
}

module.exports = { decodePNG, luma };

if (require.main === module) {
  const fs = require('node:fs');
  const img = decodePNG(fs.readFileSync(process.argv[2]));
  let sum = 0, max = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) { const l = luma(img, x, y); sum += l; if (l > max) max = l; }
  console.log(JSON.stringify({ width: img.width, height: img.height, channels: img.channels, meanLuma: +(sum / (img.width * img.height)).toFixed(3), maxLuma: +max.toFixed(1), bgPixel: [img.data[0], img.data[1], img.data[2]] }));
}
