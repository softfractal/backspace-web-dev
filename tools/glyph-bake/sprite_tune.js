// THE SPRITES' HOTNESS: each sprite measured in the page against the house number (OFF = the live glyph lifted through --bloom-core, no halo; ON = the lifted glyph over its halo sprite), then the bake scale per glyph.
const fs = require('node:fs'); const { openHarness, stats } = require('./harness_lib'); const { decodePNG } = require('./png'); const T = 50.56; const zz = ms => new Promise(r => setTimeout(r, ms));
const GL = [['corner-back', '.site-round-button', 'svg', `window.BSChrome.rail.focus(0)`], ['corner-fwd', '.site-primary-nav__forward-button', 'svg', `window.BSChrome.rail.focus(1)`], ['bs-sound', '#bs-sound', 'img:not(.bs-lit)', `window.BSChrome.rail.focus(3)`], ['bs-cart', '#bs-cart', 'img:not(.bs-lit)', `window.BSChrome.rail.focus(4)`], ['bs-account', '#bs-account', 'img:not(.bs-lit)', `window.BSChrome.rail.focus(5)`], ['acct-signin', '#bs-acct-signin', 'img:not(.bs-lit)', `window.BSChrome.rail.focus(5); window.BSChrome.rail.lock(5)`], ['acct-details', '#bs-acct-details', 'img:not(.bs-lit)', ``], ['acct-orders', '#bs-acct-orders', 'img:not(.bs-lit)', ``]];
(async () => {
  const h = await openHarness({ base: 'http://127.0.0.1:8480', page: 'support.html?dev', port: 9944 });
  await h.eval(`(() => { const st = document.createElement('style'); st.textContent = '* { transition: none !important; } #bs-cursor { visibility: hidden !important; }'; document.head.appendChild(st); window.BSChrome.wake(); })()`); await zz(500);
  const out = {};
  for (const [id, host, glyphSel, prep] of GL) {
    if (prep) { await h.eval(prep + '; void 0'); await zz(800); }
    const box = await h.eval(`(() => { const g = document.querySelector(${JSON.stringify(host + ' ' + glyphSel)}); const b = g.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
    const clip = { x: Math.floor(box.x - 30), y: Math.floor(box.y - 30), width: Math.ceil(box.w + 60), height: Math.ceil(box.h + 60) };
    const set = async (css) => { await h.eval(`(() => { let st = document.getElementById('__sp'); if (!st) { st = document.createElement('style'); st.id = '__sp'; document.head.appendChild(st); } st.textContent = ${JSON.stringify(css)}; })()`); await zz(120); };
    await set(`${host} ${glyphSel} { opacity: 1 !important; filter: var(--bloom-core) !important; } ${host} img.bs-lit { opacity: 0 !important; }`); const off = decodePNG(await h.p.screenshot(clip, 2));
    await set(`${host} ${glyphSel} { opacity: 1 !important; filter: var(--bloom-core) !important; } ${host} img.bs-lit { opacity: 1 !important; }`); const on = decodePNG(await h.p.screenshot(clip, 2));   // THE HALO IS A SPRITE: ON = the lifted live glyph OVER its halo
    await set(''); const r = stats(off, on, { x: box.x - clip.x, y: box.y - clip.y, w: box.w, h: box.h }, { dpr: 2, inkFrom: 'luma', inkT: 60 });
    out[id] = +(r.bands['0-3'] / T).toFixed(3); console.log(`${id.padEnd(13)} sprite 0-3 band ${r.bands['0-3'].toFixed(1)} → ratio ${out[id]}  (3-8 ${r.bands['3-8'].toFixed(1)}, 8-16 ${r.bands['8-16'].toFixed(1)})`);
  }
  fs.writeFileSync('sprite_ratios.json', JSON.stringify(out)); h.close();
})().catch(e => { console.error('FAIL', String(e).slice(0, 300)); process.exit(1); });
