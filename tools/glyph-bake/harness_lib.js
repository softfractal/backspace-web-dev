// harness_lib.js — the glow harness as a library: one Chrome, one page, many measurements.
// measure() captures an element (or a synthetic probe) with its glow OFF and ON and returns the metrics:
//   inkPx · edgePx (4-neighbour boundary of the lamp mask) · addedLight (Σ max(0, on−off) luma, whole clip)
//   perEdge = addedLight/edgePx · perInk · bands (mean added luma over non-ink px at chamfer distance 0-3/3-8/8-16/16-32/32-64 from the lamp)
//   peak (max added luma outside ink). All in CSS px (device px / dpr; areas / dpr²).
const { withBrowser, sleep } = require('./cdp');
const { decodePNG, luma } = require('./png');

function stats(off, on, rect, { dpr = 1, inkT = 60, inkFrom = 'luma' } = {}) {
  const W = off.width, H = off.height;
  const inkAll = new Uint8Array(W * H), inkEl = new Uint8Array(W * H);
  let inkN = 0;
  const rx0 = rect.x - 1, ry0 = rect.y - 1, rx1 = rect.x + rect.w + 1, ry1 = rect.y + rect.h + 1;
  const ccx = rect.x + rect.w / 2, ccy = rect.y + rect.h / 2, cr = Math.min(rect.w, rect.h) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const cx = (x + 0.5) / dpr, cy = (y + 0.5) / dpr;
    const lit = luma(off, x, y) > inkT;
    if (lit) inkAll[i] = 1;
    let el = false;
    if (inkFrom === 'luma') el = lit && cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1;
    else if (inkFrom === 'rect') el = cx >= rect.x && cx < rect.x + rect.w && cy >= rect.y && cy < rect.y + rect.h;
    else if (inkFrom === 'circle') el = (cx - ccx) ** 2 + (cy - ccy) ** 2 <= cr * cr;
    if (el) { inkEl[i] = 1; inkAll[i] = 1; inkN++; }
  }
  let edgeN = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!inkEl[i]) continue;
    const n = (x > 0 ? inkEl[i - 1] : 0) + (x < W - 1 ? inkEl[i + 1] : 0) + (y > 0 ? inkEl[i - W] : 0) + (y < H - 1 ? inkEl[i + W] : 0);
    if (n < 4) edgeN++;
  }
  const INF = 1e9; const dist = new Float32Array(W * H).fill(INF);
  for (let i = 0; i < W * H; i++) if (inkEl[i]) dist[i] = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 3); if (y > 0) { dist[i] = Math.min(dist[i], dist[i - W] + 3); if (x > 0) dist[i] = Math.min(dist[i], dist[i - W - 1] + 4); if (x < W - 1) dist[i] = Math.min(dist[i], dist[i - W + 1] + 4); } }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 3); if (y < H - 1) { dist[i] = Math.min(dist[i], dist[i + W] + 3); if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + W + 1] + 4); if (x > 0) dist[i] = Math.min(dist[i], dist[i + W - 1] + 4); } }
  const bands = [[0, 3], [3, 8], [8, 16], [16, 32], [32, 64]].map(b => ({ b, sum: 0, n: 0 }));
  let added = 0, peak = 0, addedHalo = 0, otherInk = 0, sat = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const lo = luma(on, x, y); const a = Math.max(0, lo - luma(off, x, y));
    added += a;
    if (inkAll[i]) { if (!inkEl[i]) otherInk++; continue; }
    if (lo >= 254) sat++;
    addedHalo += a; if (a > peak) peak = a;
    const d = dist[i] / 3 / dpr;
    for (const bb of bands) if (d > bb.b[0] && d <= bb.b[1]) { bb.sum += a; bb.n++; break; }
  }
  const px = dpr * dpr;
  return {
    inkPx: +(inkN / px).toFixed(1), edgePx: +(edgeN / dpr).toFixed(1), otherInkPx: +(otherInk / px).toFixed(0),
    addedLight: +(added / px).toFixed(0), addedHalo: +(addedHalo / px).toFixed(0), saturatedHaloPx: +(sat / px).toFixed(1),
    perInk: +(added / inkN).toFixed(1), perEdge: +(added / (dpr * edgeN)).toFixed(1),
    bands: Object.fromEntries(bands.map(bb => [`${bb.b[0]}-${bb.b[1]}`, bb.n ? +(bb.sum / bb.n).toFixed(2) : 0])),
    peak: +peak.toFixed(1),
  };
}

// rings: [[blurPx, spreadPx, alpha], ...]; hue: [r,g,b]; ui: the --ui-scale multiplier applied to blur/spread when uiScaled
function recipe(rings, hue, { ui = 1, uiScaled = true } = {}) {
  return rings.map(([blur, spread, a]) => {
    const b = uiScaled ? blur * ui : blur, s = uiScaled ? spread * ui : spread;
    return `0 0 ${+b.toFixed(3)}px${s ? ' ' + (+s.toFixed(3)) + 'px' : ''} rgba(${hue[0]},${hue[1]},${hue[2]},${+Math.min(1, a).toFixed(4)})`;
  }).join(', ');
}

async function openHarness({ base, page, port = 9333, width = 1728, height = 1117, settle = 700 }) {
  let resolveClose; const closed = new Promise(r => { resolveClose = r; });
  let api;
  const ready = new Promise((resolveReady, rejectReady) => {
    withBrowser(async ({ newPage }) => {
      const p = await newPage();
      await p.goto(`${base}/${page}`);
      await sleep(settle);
      api = {
        p,
        eval: e => p.eval(e),
        goto: async (pg) => { await p.goto(`${base}/${pg}`); await sleep(settle); },
        uiScale: async () => parseFloat(await p.eval(`getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')`)),
        token: async name => p.eval(`getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`),
        async measure({ selector, probe, pseudo, box = true, prop: propIn, offValue, recipe: rec, dpr = 1, margin = 64, inkT = 60, inkFrom = 'luma', hide, state, force = '', save = null, settleMs = 120, inkRect = 'box' }) {
          if (state) { await p.eval(state); await sleep(settle); }
          if (hide) { await p.eval(`document.querySelectorAll(${JSON.stringify(hide)}).forEach(e => { e.style.visibility = 'hidden'; }); void 0`); await sleep(200); }
          let sel = selector;
          if (probe) {
            sel = '#__bs_probe';
            await p.eval(`(() => { let d = document.getElementById('__bs_probe'); if (!d) { d = document.createElement('div'); d.id = '__bs_probe'; document.body.appendChild(d); } d.style.cssText = 'position:fixed;left:50%;top:50%;z-index:99999;' + ${JSON.stringify(probe)}; })()`);
            await sleep(120);
          }
          const prop = propIn || (box ? 'box-shadow' : 'text-shadow');
          const OFF = offValue || 'none';
          const info = await p.eval(`(() => {
            const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return { error: 'no element ' + ${JSON.stringify(sel)} };
            const cs = getComputedStyle(el, ${JSON.stringify(pseudo || null)}); const r0 = el.getBoundingClientRect(); let r = r0;
            if (${JSON.stringify(pseudo || null)}) { const w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0; let x = r0.x, y = r0.y;
              if (cs.left !== 'auto') x = r0.x + parseFloat(cs.left); else if (cs.right !== 'auto') x = r0.right - parseFloat(cs.right) - w;
              if (cs.top !== 'auto') y = r0.y + parseFloat(cs.top); else if (cs.bottom !== 'auto') y = r0.bottom - parseFloat(cs.bottom) - h;
              const m = (cs.transform || '').match(/matrix\\(([^)]+)\\)/); if (m) { const a = m[1].split(',').map(Number); x += a[4]; y += a[5]; }
              r = { x, y, width: w, height: h }; }
            let ink = { x: r.x, y: r.y, w: r.width, h: r.height };
            if (${JSON.stringify(inkRect)} === 'text' && !${JSON.stringify(pseudo || null)}) { const rg = document.createRange(); rg.selectNodeContents(el); const tr = rg.getBoundingClientRect(); if (tr.width > 0) ink = { x: tr.x, y: tr.y, w: tr.width, h: tr.height }; }
            return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, ink, current: cs.getPropertyValue(${JSON.stringify(prop)}), fontSize: cs.fontSize, fontWeight: cs.fontWeight, opacity: cs.opacity };
          })()`);
          if (info.error) throw new Error(info.error);
          const clip = { x: Math.max(0, Math.floor(info.rect.x - margin)), y: Math.max(0, Math.floor(info.rect.y - margin)), width: Math.ceil(info.rect.w + 2 * margin), height: Math.ceil(info.rect.h + 2 * margin) };
          const ir = info.ink || info.rect; const rectInClip = { x: ir.x - clip.x, y: ir.y - clip.y, w: ir.w, h: ir.h };
          const set = async v => {
            await p.eval(`(() => { let st = document.getElementById('__bs_harness'); if (!st) { st = document.createElement('style'); st.id = '__bs_harness'; document.head.appendChild(st); }
              st.textContent = ${JSON.stringify(sel + (pseudo || ''))} + '{' + ${JSON.stringify(prop)} + ':' + ${JSON.stringify(v)} + ' !important; transition: none !important;' + ${JSON.stringify(force)} + '}'; })()`);
            await sleep(120);
          };
          const onValue = rec || info.current;
          await set(OFF); await sleep(settleMs);
          const offBuf = await p.screenshot(clip, dpr); const off = decodePNG(offBuf);
          await set(onValue); await sleep(settleMs);
          const onBuf = await p.screenshot(clip, dpr); const on = decodePNG(onBuf);
          if (save) { require('node:fs').writeFileSync(save + '.off.png', offBuf); require('node:fs').writeFileSync(save + '.on.png', onBuf); }
          await set(OFF);
          return Object.assign({ selector: sel, recipe: onValue, rect: info.rect, dpr }, stats(off, on, rectInClip, { dpr, inkT, inkFrom }));
        },
        close: () => { resolveClose(); },
      };
      resolveReady(api);
      await closed;
    }, { port, width, height }).catch(rejectReady);
  });
  return ready;
}

module.exports = { openHarness, stats, recipe };
