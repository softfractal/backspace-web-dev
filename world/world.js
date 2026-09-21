/* backspace — world runtime boot (world/world.js)
 *
 * The boot ladder for every room:
 *   registry → room module → ONE load gate (GLB + beauty) → R-G warm-up →
 *   first frame → poster fades out from under the canvas.
 * Plus the governor basics shared by all rooms: DPR cap, pause on blur AND
 * on visibilitychange (never document.hidden alone), ambient tick after
 * idle, prefers-reduced-motion, resize, and a VISIBLE failure notice.
 *
 * Contract and keys: world/README.md. Loops run on the rAF timestamp in
 * seconds; nothing here accumulates dt.
 */

import * as THREE from 'three';
import { GLTFLoader } from '../assets/3d/three/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from '../assets/3d/three/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from '../assets/3d/three/jsm/libs/meshopt_decoder.module.js';

const ROOT = new URL('../', import.meta.url);            // World/ — every registry path resolves against this
const REGISTRY_URL = new URL('registry.json', import.meta.url);
const ROOM_KEY = (typeof window !== 'undefined' && window.__bsWorldRoom) || 'home';   // set by boot.js from <script data-room>
const DEV = /(^|[?&])dev(=|&|$)/.test(location.search);
const BUILD = '2026-09-21 01:05';
// ?dpr=N (dev): cap the device pixel ratio for GPU-load tests (e.g. ?dev&dpr=1 halves the pixels on a Retina screen)
const DPR_OVERRIDE = (() => { const m = /(^|[?&])dpr=([0-9.]+)/.exec(location.search); return m ? Math.max(0.25, Math.min(4, +m[2])) : null; })();       // bumped on every runtime edit; shown in the ?dev HUD so a stale copy is visible at a glance
// ?variant=<key> loads registry rooms.home.variants[key] merged over the base
// entry (Eric's A/B: the panel-ON bake lives in its own folder).
const VARIANT = (() => { const m = /(^|[?&])variant=([^&]*)/.exec(location.search); return m ? decodeURIComponent(m[2]) : null; })();
const BG = 0x040402;                                      // the page's --bg

const canvas = document.getElementById('bs-world');
const poster = document.getElementById('bs-world-poster');

// ── fail VISIBLY ─────────────────────────────────────────────────────────
// A dark title screen and a broken one look identical. Pattern from
// shared/bs-stage3d.js notice(): a fixed role=status line, never a silent
// black canvas. world/boot.js (classic script) owns the pre-module cases
// (file://, no WebGL2, import failure) and exports the same notice on
// window.__bsWorldNotice; this copy covers everything after the import.
let noticed = false;
function notice(e) {
  if (typeof window.__bsWorldNotice === 'function') return window.__bsWorldNotice(e);
  const raw = (e && e.message) ? e.message : String(e);
  console.warn('[world] room unavailable —', raw);
  if (noticed) return;
  noticed = true;
  let msg = 'the world did not load — ' + raw;
  if (location.protocol === 'file:') {
    let dir = '', name = 'home.html';
    try {
      const parts = decodeURIComponent(location.pathname).split('/');
      name = parts.pop() || name;
      dir = parts.join('/');
    } catch (err) { /* keep defaults */ }
    msg = 'the world needs a server. file:// blocks the module import and\n' +
          'the asset fetch, so the room stays on its poster.\n\n' +
          'python3 "' + dir + '/tools/dev-server.py" 8481\n\n' +
          'then open  http://localhost:8481/' + name;
  }
  try {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.id = 'bs-world-notice';
    el.style.cssText = 'position:fixed;left:50%;top:52%;transform:translate(-50%,-50%);z-index:3;' +
      'max-width:52ch;text-align:center;font:400 12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'letter-spacing:.06em;color:rgba(255,255,255,.42);pointer-events:none;text-wrap:balance;white-space:pre-line;';
    el.textContent = msg;
    ((canvas && canvas.parentNode) || document.body).appendChild(el);
  } catch (err) { /* nothing left to do */ }
}

function abs(p, base) { return new URL(p, base || ROOT).href; }

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error('fetch ' + r.status + ' ' + url);
  return r.json();
}

// ── poster: LQIP first, then the poster, both UNDER the canvas ───────────
// home.html ships the base LQIP as a static src (first paint, before any
// script); this only upgrades it — to the variant's LQIP if it differs, then
// to the full poster once it has decoded.
function mountPoster(entry) {
  if (!poster) return;
  const dir = new URL(entry.dir, ROOT);
  const lqip = abs(entry.lqip, dir), full = abs(entry.poster, dir);
  const cur = poster.getAttribute('src') ? poster.src : '';
  if (cur !== lqip && cur !== full) poster.src = lqip;      // no static src, or a variant's own LQIP
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { if (poster.src !== full) poster.src = full; };
  img.src = full;
}

// ── governor ─────────────────────────────────────────────────────────────
function createGovernor(gov, onWake) {
  const idleMs = (gov.idle_s ?? 10) * 1000;
  const idleFps = gov.idle_fps ?? 30;
  // governor.blur: 'pause' = the seed's rule (blur → rAF stops); 'idle' = an
  // unfocused-but-visible window keeps ticking at idle_fps and only a hidden
  // document pauses. The house ships 'idle' (Sept 15): on a desktop the page
  // is often visible while another app has focus, and a frozen room reads as
  // broken. Proposed as an amendment to seed §3 Phase 3.4; Eric may revert.
  const blurMode = gov.blur === 'pause' ? 'pause' : 'idle';
  const state = {
    blurred: false, hidden: false, lastInput: performance.now(),
    lastRender: -1e9, reduced: false, idle: false, dprCap: gov.dpr_cap ?? 2,
  };
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  state.reduced = !!(mq && mq.matches);
  if (mq) (mq.addEventListener ? mq.addEventListener('change', e => { state.reduced = e.matches; onWake(); })
                               : mq.addListener(e => { state.reduced = e.matches; onWake(); }));
  const stamp = () => { state.lastInput = performance.now(); if (state.idle) { state.idle = false; onWake(); } };
  // Governor-only listeners: passive, never preventDefault — the chrome owns wheel and touch.
  window.addEventListener('pointermove', stamp, { passive: true });
  window.addEventListener('pointerdown', stamp, { passive: true });
  window.addEventListener('keydown', stamp, { passive: true });
  window.addEventListener('wheel', stamp, { passive: true });
  window.addEventListener('blur', () => { state.blurred = true; });
  window.addEventListener('focus', () => { state.blurred = false; onWake(); });
  document.addEventListener('visibilitychange', () => {
    state.hidden = document.visibilityState === 'hidden';
    if (!state.hidden) onWake();
  });
  return {
    state,
    dpr() { return Math.min(window.devicePixelRatio || 1, DPR_OVERRIDE != null ? DPR_OVERRIDE : state.dprCap); },
    paused() { return state.hidden || (blurMode === 'pause' && state.blurred); },
    blurMode,
    // Ambient tick: after idle_s with no input (or while blurred, in 'idle'
    // blur mode), render at idle_fps by skipping rAF callbacks on their own
    // timestamps (no timers, no accumulated dt).
    shouldRender(ts) {
      state.idle = state.blurred || (performance.now() - state.lastInput) > idleMs;
      if (!state.idle) return true;
      return (ts - state.lastRender) >= (1000 / idleFps) - 0.5;
    },
    rendered(ts) { state.lastRender = ts; },
  };
}

// ── boot ─────────────────────────────────────────────────────────────────
async function boot() {
  if (!canvas) throw new Error('#bs-world canvas missing');
  if (location.protocol === 'file:') throw new Error('file:// protocol');

  const registry = await fetchJSON(REGISTRY_URL);
  const base = registry.rooms && registry.rooms[ROOM_KEY];
  if (!base) throw new Error('registry has no room "' + ROOM_KEY + '"');
  let entry = base;
  if (VARIANT) {
    const v = base.variants && base.variants[VARIANT];
    if (!v) throw new Error('registry room "' + ROOM_KEY + '" has no variant "' + VARIANT + '"');
    entry = Object.assign({}, base, v);          // a variant overrides dir (and any asset key it names)
    if (DEV) console.log('[world] variant "%s" → dir %s', VARIANT, entry.dir);
  }
  mountPoster(entry);

  const dir = new URL(entry.dir, ROOT);
  // wake() may fire from the governor's visibility/focus listeners while the assets are still
  // loading (before the loop's `let running` below runs) — that threw a TDZ ReferenceError
  // (seen Sept 19 when the browser pane was hidden/shown mid-boot). Nothing to start until the
  // loop exists, so wake() is a no-op until loopReady.
  let loopReady = false;
  const gov = createGovernor(entry.governor || {}, wake);

  // Renderer first: KTX2Loader.detectSupport needs it, and a missing WebGL2
  // context must fail here, visibly, before any asset streams.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { throw new Error('WebGL unavailable: ' + (e && e.message ? e.message : e)); }
  renderer.setPixelRatio(gov.dpr());
  renderer.setSize(canvas.clientWidth || 1, canvas.clientHeight || 1, false);
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = true;

  // Room module + freeze record in parallel with nothing else heavy.
  const [mod, bake] = await Promise.all([
    import(abs(entry.module)),
    fetchJSON(abs(entry.bake, dir)),
  ]);
  if (typeof mod.createHomeRoom !== 'function') throw new Error('room module exports no createHomeRoom');

  // ONE load gate over GLB + beauty. Every loader shares one LoadingManager
  // (progress + error reporting); the gate itself is the settled promise of
  // both loads, so a KTX2 → PNG fallback still counts as one item.
  const manager = new THREE.LoadingManager();
  manager.onError = url => console.warn('[world] load error', url);
  const gltfLoader = new GLTFLoader(manager);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const ktx2 = new KTX2Loader(manager)
    .setTranscoderPath(abs('assets/3d/three/jsm/libs/basis/'))
    .detectSupport(renderer);
  const texLoader = new THREE.TextureLoader(manager);

  const beautyKtx2 = entry.beauty && entry.beauty.ktx2 ? abs(entry.beauty.ktx2, dir) : null;
  const beautyPng = entry.beauty && entry.beauty.png ? abs(entry.beauty.png, dir) : null;
  const beautyInfo = { source: null };

  const loadBeauty = async () => {
    if (beautyKtx2) {
      try {
        const t = await ktx2.loadAsync(beautyKtx2);
        beautyInfo.source = 'ktx2';
        return t;
      } catch (e) {
        console.warn('[world] KTX2 beauty failed, falling back to PNG —', e && e.message ? e.message : e);
      }
    }
    if (!beautyPng) throw new Error('no beauty texture available');
    const t = await texLoader.loadAsync(beautyPng);
    beautyInfo.source = 'png';
    // glTF UVs have a top-left origin and GLTFLoader uploads its own textures
    // with flipY=false; the PNG must match or the projection is upside down.
    t.flipY = false;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };

  // The AT-REST half of the two-texture pack (Eric, Sept 16): the display
  // camera rendered at full width, sampled inside the at-rest rectangle. A
  // soft dependency — a room without it (or a failed fetch) runs on the padded
  // beauty alone, with a console line, never a notice.
  const restKtx2 = entry.beauty && entry.beauty.rest_ktx2 ? abs(entry.beauty.rest_ktx2, dir) : null;
  const restPng = entry.beauty && entry.beauty.rest_png ? abs(entry.beauty.rest_png, dir) : null;
  const restInfo = { source: null };
  const loadRest = async () => {
    if (!restKtx2 && !restPng) return null;
    if (restKtx2) {
      try { const t = await ktx2.loadAsync(restKtx2); restInfo.source = 'ktx2'; return t; }
      catch (e) { if (DEV) console.log('[world] at-rest KTX2 not available (%s) — trying PNG', e && e.message ? e.message : e); }
    }
    if (restPng) {
      try { const t = await texLoader.loadAsync(restPng); restInfo.source = 'png'; t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
      catch (e) { if (DEV) console.log('[world] at-rest PNG not available (%s)', e && e.message ? e.message : e); }
    }
    return null;
  };

  const gateT0 = performance.now();
  const [gltf, beauty, rest] = await Promise.all([gltfLoader.loadAsync(abs(entry.glb, dir)), loadBeauty(), loadRest()]);
  for (const t of [beauty, rest]) {
    if (!t) continue;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
  }
  const gateMs = performance.now() - gateT0;
  if (DEV) console.log('[world] beauty via %s; at-rest texture via %s', beautyInfo.source, restInfo.source || 'none (padded beauty only)');

  const room = mod.createHomeRoom({
    THREE, renderer, registryEntry: entry, bake, gltf,
    textures: { beauty, beautySource: beautyInfo.source, rest, restSource: restInfo.source },
    root: ROOT, reducedMotion: () => gov.state.reduced, texLoader, dev: DEV, variant: VARIANT, roomKey: ROOM_KEY,
  });

  // Size before the warm-up so the compiled program matches the real viewport.
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(gov.dpr());
    renderer.setSize(w, h, false);
    room.resize(w, h, gov.dpr());
  }
  resize();
  window.addEventListener('resize', resize);

  // R-G warm-up: compile every program for the CANVAS (sRGB output) here; the
  // first frame below draws them once while the canvas is still at opacity 0,
  // under the poster. (A 1×1 render target would compile the linear-output
  // variants instead — programs the canvas never uses — so none is used.)
  const warmT0 = performance.now();
  room.frame(0);
  renderer.compile(room.scene, room.camera);
  const warmMs = performance.now() - warmT0;

  // ── loop ───────────────────────────────────────────────────────────────
  let rafId = 0, running = false, scrubbed = false, firstFrameDone = false;
  loopReady = true;
  const resolveS = (entry.governor && entry.governor.resolve_s) || 0.6;

  // ?dev HUD: build, frames per second (rendered frames over the last second), frame count, clock, governor state.
  let hud = null, hudFrames = 0, hudT0 = performance.now(), hudFps = 0, hudTotal = 0;
  // water-motion probe (dev): a 256×24 strip low in the frame, read back once a second, mean |Δ| vs the previous second
  let probePrev = null, probeMotion = null;
  function probeWater() {
    try {
      const gl = renderer.getContext(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const pw = Math.min(256, W), ph = Math.min(24, H), px = Math.floor((W - pw) / 2), py = Math.floor(H * 0.06);
      const buf = new Uint8Array(pw * ph * 4); gl.readPixels(px, py, pw, ph, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      if (probePrev) { let d = 0, m = 0; for (let k = 0; k < buf.length; k += 4) { d += Math.abs(buf[k] - probePrev[k]); m += buf[k]; } probeMotion = m > 0 ? (100 * d / m) : 0; }
      probePrev = buf;
    } catch (e) { probeMotion = null; }
  }
  if (DEV) {
    hud = document.createElement('div'); hud.id = 'bs-world-hud';
    hud.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:200;font:11px/1.4 ui-monospace,Menlo,monospace;color:#9f9;background:rgba(0,0,0,.55);padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre';
    document.body.appendChild(hud);
  }
  function draw(tSeconds) {
    room.frame(tSeconds);
    renderer.render(room.scene, room.camera);
    if (hud) {
      hudFrames++; hudTotal++;
      const now = performance.now();
      if (now - hudT0 >= 1000) {
        hudFps = Math.round(hudFrames * 1000 / (now - hudT0)); hudFrames = 0; hudT0 = now;
        probeWater();
        const st = room.state();
        hud.textContent = 'build ' + BUILD + ' · ' + ROOM_KEY + (VARIANT ? ' (' + VARIANT + ')' : '') + '\n'
          + 'fps ' + hudFps + ' · frames ' + hudTotal + ' · t ' + tSeconds.toFixed(1) + 's · dpr ' + gov.dpr() + ' · ' + canvas.width + '×' + canvas.height + '\n'
          + (gov.state.idle ? 'idle' : 'active') + (gov.state.blurred ? ' · blurred' : '') + (gov.state.hidden ? ' · hidden' : '') + (gov.state.reduced ? ' · REDUCED MOTION' : '')
          + ' · rest ' + (st.restAspect || '-') + (st.water ? ' · water ' + st.water.mode + (st.water.mode === 'material' && st.water.material ? ' loop ' + st.water.material.loop_s + 's u ' + st.water.material.loop_u + ' cap ' + st.water.material.plate_cap + ' spread ' + st.water.material.strip.spread + ' gain ' + st.water.material.reflect_gain : ' bump ' + st.water.bump + ' lod ' + st.water.lod) : '')
          + '\nwater motion ' + (probeMotion == null ? '-' : probeMotion.toFixed(1) + ' %/s') + ' (bottom strip, vs the previous second)';
      }
    }
  }
  function tick(ts) {
    rafId = 0;
    if (!running || scrubbed) return;
    if (gov.paused()) { running = false; return; }
    if (gov.shouldRender(ts)) {
      draw(ts / 1000);
      gov.rendered(ts);
      if (!firstFrameDone) { firstFrameDone = true; resolvePoster(); }
    }
    rafId = requestAnimationFrame(tick);
  }
  function start() {
    if (running || scrubbed) return;
    running = true;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }
  function wake() { if (loopReady && !gov.paused()) start(); }

  // B3: only the canvas fades, over the OPAQUE poster (a simultaneous poster
  // fade-out dips the stack toward the page background mid-fade). The poster
  // is hidden once the canvas's own transition has ended.
  function resolvePoster() {
    canvas.style.transition = 'opacity ' + resolveS + 's linear';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      canvas.removeEventListener('transitionend', finish);
      if (poster) poster.hidden = true;
    };
    canvas.addEventListener('transitionend', finish);
    canvas.style.opacity = '1';
    setTimeout(finish, resolveS * 1000 + 250);   // transitionend is not guaranteed on a hidden tab
  }

  // First frame at the current clock, then hand over to the loop.
  draw(performance.now() / 1000);
  firstFrameDone = true;
  resolvePoster();
  start();

  // Panel content: never load mid-experience, so preload all four right after
  // the first frame, at idle priority.
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1200));
  idle(() => { try { room.preload(); } catch (e) { console.warn('[world] preload', e); } });

  // ── dev hooks ──────────────────────────────────────────────────────────
  if (DEV) {
    const estimateTextureBytes = tex => {
      if (!tex || !tex.image) return 0;
      const img = tex.image;
      if (Array.isArray(tex.mipmaps) && tex.mipmaps.length && tex.mipmaps[0].data) {
        return tex.mipmaps.reduce((s, m) => s + (m.data ? m.data.byteLength : 0), 0);
      }
      const w = img.width || 0, h = img.height || 0;
      return Math.round(w * h * 4 * (tex.generateMipmaps ? 4 / 3 : 1));
    };
    window.__bsWorld = {
      room, renderer, scene: room.scene, camera: room.camera, registry: entry, bake,
      state: () => Object.assign(room.state(), {
        paused: gov.paused(), idle: gov.state.idle, reduced: gov.state.reduced,
        dpr: gov.dpr(), running, scrubbed, beautySource: beautyInfo.source, variant: VARIANT,
        canvasOpacity: canvas.style.opacity, posterHidden: !!(poster && poster.hidden), posterSrc: poster ? poster.src.replace(ROOT.href, '') : null,
      }),
      programs: () => renderer.info.programs ? renderer.info.programs.length : undefined,
      frame: t => { scrubbed = true; running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } draw(t); return room.state(); },
      play: () => { scrubbed = false; start(); },
      set: o => room.set(o),
      view: name => room.view(name),
      stats: () => {
        const res = performance.getEntriesByType('resource')
          .filter(r => /\/world\//.test(r.name))
          .map(r => ({ name: r.name.replace(ROOT.href, ''), transfer: r.transferSize, encoded: r.encodedBodySize, decoded: r.decodedBodySize, ms: Math.round(r.duration) }));
        const wire = res.reduce((s, r) => s + (r.encoded || 0), 0);
        return {
          info: { render: Object.assign({}, renderer.info.render), memory: Object.assign({}, renderer.info.memory), programs: renderer.info.programs ? renderer.info.programs.length : undefined },
          textureBytes: { beauty: estimateTextureBytes(beauty), rest: rest ? estimateTextureBytes(rest) : 0, panel: room.panelTextureBytes(estimateTextureBytes) },
          resources: res, wireBytesWorld: wire,
          timings: { gateMs: Math.round(gateMs), warmMs: Math.round(warmMs) },
          canvas: { w: canvas.width, h: canvas.height, dpr: gov.dpr() },
          budget: entry.budget,
        };
      },
    };
    console.log('[world] dev hooks on window.__bsWorld; gate %d ms, warm-up %d ms, beauty via %s, programs after warm-up %d, motes via %s', Math.round(gateMs), Math.round(warmMs), beautyInfo.source, renderer.info.programs ? renderer.info.programs.length : -1, room.state().motes.source);
  }
}

boot().catch(notice);
