// THE LIT GLYPH IS A SPRITE — the bake (Eric, Sept 7). Run from Pages/tools/glyph-bake with the dev server on 8480:
//   node bake_glyphs.js            (bakes every glyph at the g in sprite_scale.json, else its BLOOM.glyph value)
//   node sprite_tune.js            (measures each mounted sprite against the house hotness; feed the ratios back into sprite_scale.json)
// Zero dependencies: Node ≥ 22 and Google Chrome (cdp.js launches it headless).
// BAKE THE LIT GLYPHS (the shipped tool): each corner / tray glyph rendered through its own filter chain at the intensity in
// sprite_scale.json (else its BLOOM value) on a transparent ground, 2x, with a halo margin → assets/ui/glyph-lit/ + manifest.json.
const fs = require('node:fs'); const path = require('node:path'); const { withBrowser, sleep } = require('./cdp');
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
    await p.eval(`(() => { let st = document.getElementById('__bake'); if (!st) { st = document.createElement('style'); st.id = '__bake'; document.head.appendChild(st); }
      st.textContent = 'html, body { background: transparent !important; } body * { visibility: hidden !important; transition: none !important; } ' + ${JSON.stringify(g.sel)} + ' { visibility: visible !important; filter: var(--bloom-icon) !important; opacity: 1 !important; } ' + ${JSON.stringify(vis)} + ' { visibility: visible !important; } img.bs-lit { visibility: hidden !important; }';
      document.querySelector(${JSON.stringify(g.sel)}).style.setProperty('--bloom-g', ${gUsed}); })()`); await sleep(250);
    const clip = { x: info.x - M, y: info.y - M, width: info.w + 2 * M, height: info.h + 2 * M };
    const png = await p.screenshot(clip, 2); fs.writeFileSync(path.join(OUT, g.id + '-lit.png'), png);
    manifest[g.id] = { sel: g.sel.replace(':not(.bs-lit)', ''), w: +info.w.toFixed(2), h: +info.h.toFixed(2), margin: M, g: gUsed, file: 'assets/ui/glyph-lit/' + g.id + '-lit.png', bytes: png.length };
    console.log(`${g.id.padEnd(13)} ${info.tag} ${info.w.toFixed(1)}x${info.h.toFixed(1)} g=${gUsed} (table ${info.g}) → ${g.id}-lit.png (${(png.length / 1024).toFixed(1)}kB)`);
    await p.eval(`(() => { document.getElementById('__bake').textContent = ''; document.querySelector(${JSON.stringify(g.sel)}).style.removeProperty('--bloom-g'); })()`); await sleep(100);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1)); console.log('manifest written');
}, { port: 9999 }).catch(e => { console.error('FAIL', String(e).slice(0, 400)); process.exit(1); });
