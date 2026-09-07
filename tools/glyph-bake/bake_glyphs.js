// THE HALO IS A SPRITE — the bake (Eric, Sept 7). Run from Pages/tools/glyph-bake with the dev server on 8480:
//   node bake_glyphs.js            (bakes every glyph's HALO at the g in sprite_scale.json, else its BLOOM.glyph value)
//   node sprite_tune.js            (measures each mounted halo under its lifted glyph against the house hotness; feed the ratios back into sprite_scale.json)
// Zero dependencies: Node ≥ 22 and Google Chrome (cdp.js launches it headless).
//
// Each glyph is captured twice on a transparent ground, 2×, on an INTEGER clip with a halo margin (captureScreenshot floors a
// fractional clip): LIT — its whole filter chain at g — and CORE — the chain's first op alone (--bloom-core: the lifted glyph, no
// shadows). Source-over is associative, so LIT = CORE over HALO, and the halo's alpha comes back per pixel:
//     aH = 1 − (1 − aL) / (1 − aC)        wherever the core is not solid (aC < .9);
// under solid ink it is filled from its neighbours (the live glyph covers it anyway). The bitmap is the HALO ONLY, white. At
// runtime it fades in UNDER the live glyph, which lifts through --bloom-core — the glyph never changes shape, so the light reads
// pixel-true at every width (a bitmap that carried the core resampled at every width but the frame's and read as growth).
// → assets/ui/glyph-lit/ + manifest.json (selector / box / clip / the glyph's offset in it / g).
const fs = require('node:fs'); const path = require('node:path'); const { withBrowser, sleep } = require('./cdp'); const { decodePNG } = require('./png'); const { encodePNG } = require('./png_encode');
const OUT = process.env.BS_OUT || path.join(__dirname, '..', '..', 'assets', 'ui', 'glyph-lit') + '/'; const M = 22;
const SCALE = fs.existsSync('sprite_scale.json') ? JSON.parse(fs.readFileSync('sprite_scale.json', 'utf8')) : {};
const GLYPHS = [
  { id: 'corner-back', sel: '.site-round-button svg', prep: `window.BSChrome.rail.focus(0)` },
  { id: 'corner-fwd', sel: '.site-primary-nav__forward-button svg', prep: `window.BSChrome.rail.focus(1)` },
  { id: 'bs-sound', sel: '#bs-sound img:not(.bs-lit)', prep: `window.BSChrome.rail.focus(3)` },
  { id: 'bs-cart', sel: '#bs-cart img:not(.bs-lit)', prep: `window.BSChrome.rail.focus(4)` },
  { id: 'bs-account', sel: '#bs-account img:not(.bs-lit)', prep: `window.BSChrome.rail.focus(5)` },
  { id: 'acct-signin', sel: '#bs-acct-signin img:not(.bs-lit)', prep: `window.BSChrome.rail.focus(5); window.BSChrome.rail.lock(5)` },
  { id: 'acct-details', sel: '#bs-acct-details img:not(.bs-lit)', prep: `` },
  { id: 'acct-orders', sel: '#bs-acct-orders img:not(.bs-lit)', prep: `` },
];
// The halo alone from the two captures (RGBA, straight alpha).
function haloOnly(L, C) {
  if (L.channels !== 4 || C.channels !== 4) throw new Error('captures must be RGBA (transparent ground)');
  if (L.width !== C.width || L.height !== C.height) throw new Error('capture sizes differ');
  const W = L.width, H = L.height, N = W * H; const a = new Float32Array(N); const known = new Uint8Array(N); let unknown = 0;
  for (let i = 0; i < N; i++) { const aL = L.data[i * 4 + 3] / 255, aC = C.data[i * 4 + 3] / 255; if (aC < 0.9) { a[i] = Math.min(1, Math.max(0, 1 - (1 - aL) / (1 - aC))); known[i] = 1; } else unknown++;   /* near-solid edges (aC ≥ .9) amplify capture noise ×10 and are covered by the glyph — filled instead */ }
  const solid = unknown;
  while (unknown > 0) {   // fill under solid ink from the nearest known halo: an iterative dilation
    let progress = 0; const next = new Uint8Array(known);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (known[i]) continue; let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (known[j]) { s += a[j]; n++; } }
      if (n) { a[i] = s / n; next[i] = 1; progress++; } }
    known.set(next); unknown -= progress; if (!progress) break;
  }
  const out = new Uint8Array(N * 4); let max = 0, litSum = 0, haloSum = 0;
  for (let i = 0; i < N; i++) { const v = Math.round(a[i] * 255); out[i * 4] = 255; out[i * 4 + 1] = 255; out[i * 4 + 2] = 255; out[i * 4 + 3] = v; if (v > max) max = v; litSum += L.data[i * 4 + 3]; haloSum += v; }
  return { img: { width: W, height: H, channels: 4, data: out }, solidPx: solid, maxAlpha: max / 255, haloShare: haloSum / Math.max(1, litSum) };
}
withBrowser(async ({ newPage }) => {
  const p = await newPage(); await p.viewport(1728, 1117, 1); await p.goto((process.env.BS_BASE || 'http://127.0.0.1:8480') + '/support.html?dev'); await sleep(900);
  await p.eval(`window.BSChrome.wake(); void 0`); await sleep(300);
  await p.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  const manifest = {};
  for (const g of GLYPHS) {
    if (g.prep) { await p.eval(g.prep + '; void 0'); await sleep(900); }
    const info = await p.eval(`(() => { const el = document.querySelector(${JSON.stringify(g.sel)}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, g: getComputedStyle(el).getPropertyValue('--bloom-g').trim(), tag: el.tagName }; })()`);
    if (!info) { console.log('missing', g.id); continue; }
    const gUsed = SCALE[g.id] !== undefined ? +(+SCALE[g.id]).toFixed(3) : +info.g;
    const vis = g.sel.split(', ').map(x => x + ' *').join(', ');
    const setChain = async (chain) => { await p.eval(`(() => { let st = document.getElementById('__bake'); if (!st) { st = document.createElement('style'); st.id = '__bake'; document.head.appendChild(st); }
      st.textContent = 'html, body { background: transparent !important; } body * { visibility: hidden !important; transition: none !important; } ' + ${JSON.stringify(g.sel)} + ' { visibility: visible !important; filter: ' + ${JSON.stringify(chain)} + ' !important; opacity: 1 !important; } ' + ${JSON.stringify(vis)} + ' { visibility: visible !important; } img.bs-lit { visibility: hidden !important; } .bs-pill, .bs-tray, .site-primary-nav, #bs-corner, #bs-icons { overflow: visible !important; }';   /* the asset is the whole halo; the pill clips it at runtime */
      document.querySelector(${JSON.stringify(g.sel)}).style.setProperty('--bloom-g', ${gUsed}); })()`); await sleep(250); };
    const clip = { x: Math.floor(info.x - M), y: Math.floor(info.y - M) }; clip.width = Math.ceil(info.x + info.w + M) - clip.x; clip.height = Math.ceil(info.y + info.h + M) - clip.y;
    await setChain('var(--bloom-icon)'); const lit = decodePNG(await p.screenshot(clip, 2));
    await setChain('var(--bloom-core)'); const core = decodePNG(await p.screenshot(clip, 2));
    if (lit.width !== clip.width * 2 || lit.height !== clip.height * 2) throw new Error(`${g.id}: capture ${lit.width}×${lit.height} is not the clip ×2 (${clip.width * 2}×${clip.height * 2})`);
    const halo = haloOnly(lit, core); const png = encodePNG(halo.img); fs.writeFileSync(path.join(OUT, g.id + '-lit.png'), png);
    manifest[g.id] = { sel: g.sel.replace(':not(.bs-lit)', ''), w: +info.w.toFixed(2), h: +info.h.toFixed(2), margin: M, ox: +(info.x - clip.x).toFixed(3), oy: +(info.y - clip.y).toFixed(3), cw: clip.width, ch: clip.height, g: gUsed, halo: true, file: 'assets/ui/glyph-lit/' + g.id + '-lit.png', bytes: png.length };
    console.log(`${g.id.padEnd(13)} ${info.tag} ${info.w.toFixed(1)}x${info.h.toFixed(1)} g=${gUsed} (table ${info.g}) → ${g.id}-lit.png ${lit.width}×${lit.height} clip ${clip.width}×${clip.height} @+${(info.x - clip.x).toFixed(2)},+${(info.y - clip.y).toFixed(2)} · halo only: peak α ${halo.maxAlpha.toFixed(2)}, ${halo.solidPx} solid px filled, ${(halo.haloShare * 100).toFixed(0)}% of the lit alpha (${(png.length / 1024).toFixed(1)}kB)`);
    await p.eval(`(() => { document.getElementById('__bake').textContent = ''; document.querySelector(${JSON.stringify(g.sel)}).style.removeProperty('--bloom-g'); })()`); await sleep(100);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1)); console.log('manifest written');
}, { port: 9999 }).catch(e => { console.error('FAIL', String(e).slice(0, 400)); process.exit(1); });
