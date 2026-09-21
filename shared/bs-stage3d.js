/* ══════════════════════════════════════════════════════════════════════════
   backspace — THE PRODUCT STAGE (3D), v2.  Sept 11 2026.

   THE SPHERE IS GONE. This module stands exactly where BSBall stood, wears
   the same api, and is bound at the same line — the STAGE-BINDING SEAM the
   /hardware page has carried a comment about since Aug 28:

       "the eventual desk GLB replaces the ball BEHIND the seam; the
        interaction layer never changes."

   So it does. `boot · set · show · stage · grab · orbit · hit · view ·
   state · frame · snap` all answer, and the page above is untouched except
   for the line that names the module and the line that opens the showcase.

   ── v2: THE SCENE IS A CYCLES RENDER YOU CAN TURN ────────────────────────
   v1 lit the room live and approximated the blend's volume with distance
   fog. That was the honest limit of a real-time stage and it was not good
   enough — the fog is most of what the render is, and FogExp2 cannot be a
   cloud. v2 stops approximating and BAKES, in two halves, because the room
   has two kinds of light in it:

     SURFACES    3Ds/scripts/bake_product_surfaces.py cooks Cycles' full
                 lighting into each mesh's own texture — direct, bounce, the
                 soft shadow under the desk, and the fog's ATTENUATION of the
                 light that reached each surface. The browser draws these
                 UNLIT: no lamps, no shadow maps, no rig to calibrate.
     THE VOLUME  ...is not on a surface, so no lightmap can hold it.
                 3Ds/scripts/bake_product_volume.py renders the medium in
                 slabs and writes a 3D GRID of the room — per voxel, how much
                 light scatters out of that point and how much the medium
                 absorbs there. The viewer raymarches it, which is what a
                 real-time engine does with its froxels.

   The two compose the way the physics does, and neither is a guess:

       pixel = baked_surface · transmittance(camera→surface) + in-scatter

   Which means the camera is FREE again — any yaw, any pitch, anywhere in
   the room — and it still looks like the render from all of them. There is
   no lighting rig left in this file to tune, because there is no lighting
   left to do: it is measured, not modelled.

   THE THREE PHASES (Eric, Sept 11) — the machine above all of that:

     DARK    nothing is drawn. The canvas clears to transparent and the
             page's own black is what you see. This is where the page sits
             from boot until the showcase is entered. No rAF work, no cost.
     FLIGHT  the reveal, as a CYCLES FILM — the blend's CameraAction, eight
             seconds, played once. A fixed camera path does not need to be
             real-time, so it isn't. Input is refused; the shot is the shot.
     LOCKED  the film ends and its last frame STAYS on screen until a hand
             arrives. Nothing moves the camera on its own — not a plate, not
             a panel, not a berth solve — so the product stays presentable
             underneath every other function on the page. Take hold of it
             and the baked scene crossfades in and turns; let go and it
             settles back onto the film's own frame.

   Weight: three.js is vendored under assets/3d/three — no CDN, the house
   law holds. It is pulled by dynamic import at boot() and the stage is
   black until it lands, so the load is invisible by construction.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var BASE   = 'assets/3d/';
var THREEP = BASE + 'three/three.module.js';
var LOADER = BASE + 'three/jsm/loaders/GLTFLoader.js';
var BAKED  = BASE + 'baked/';

window.BSStage3D = function(canvas, opts){
  opts = opts || {};
  var T = null, renderer = null, scene = null, camera = null;
  var flight = null, product = null, deskBox = null;
  var running = false, visible = true, booted = false, failed = false;

  // ── The phases ──────────────────────────────────────────────────────────
  var DARK = 0, FLIGHT = 1, LOCKED = 2;
  var phase = DARK;
  var tFlight = 0;                 // seconds into the blend's own timeline
  // THE FLIGHT RUNS ON THE CLOCK, NOT ON FRAMES, and the clock is the rAF
  // TIMESTAMP — never performance.now() read inside the callback, which is
  // the moment the callback happened to start and drifts by however long the
  // previous frame's work took. That drift is camera shake. -1 until the
  // first frame is actually drawn, so the reveal never opens mid-move.
  var tStart = -1;
  var pendingPlay = false;         // play() called before the assets landed

  // ── The viewing hand — an orbit ON TOP of the film's last pose ──────────
  // Zero offset reproduces that frame: the hand adds to a yaw/pitch derived
  // from it, and the orientation is rebuilt as (baked aim correction) ×
  // (look-at the product), so letting go of every control returns the exact
  // shot the film ends on.
  var oYaw = 0, oPitch = 0, oYawT = 0, oPitchT = 0, oSnap = false, grabbed = false;
  var oR = 0, oRT = 0;             // 0 = the film's distance; a named angle may shorten it
  var ORBIT_EASE = 5.5;
  var PITCH_MIN = -0.45, PITCH_MAX = 1.15;
  var base = null;                 // {C, r, yaw0, pitch0, qFix, room}

  // THE BERTH. The page's resting berth is cx 0.47 · cy 0.55 and a 3D camera
  // can honour it as a lens shift. It is OFF (0.5 · 0.5) because the scene
  // has to land on the film's last frame exactly, and the film is rendered on
  // the blend's own camera with no shift. A berth the film cannot match is a
  // visible jump at the crossfade.
  var BERTH_X = 0.50, BERTH_Y = 0.50;

  // THE SEAM IS LEFT UNBOUND, DELIBERATELY. set() still answers so the page
  // above needs no edit, but the desk keeps the surface the blend gave it —
  // and in v2 that is no longer a matter of taste: the lighting is BAKED INTO
  // the texture, so tinting it would tint the shadows and the bounce with it.
  // Re-colouring a baked product means re-baking, not multiplying.
  var BIND_MATERIAL = false;
  var lastSet = null, lastStage = null;
  var dirty = true, _ray = null, _v2 = null;

  // ── THE NAMED ANGLES — the OVERVIEW's I · II · III ──────────────────────
  // Offsets from the film's pose, never absolute cameras. The room is a
  // closed box: the film ends 43 units out, which is fine down its long axis
  // and straight through the ceiling or a wall anywhere else, so II and III
  // carry their own shorter radius and every pose is finally clamped by the
  // enclosure's own interior, exported with the geometry.
  var VIEWS = {
    front: { yaw: 0,      pitch: 0.00, r: 0    },   // r 0 = the film's distance
    side:  { yaw: -1.320, pitch: 0.12, r: 22   },
    top:   { yaw: -0.350, pitch: 0.78, r: 23   }
  };
  var viewName = 'front';
  var WALL_GAP = 3.5;              // the camera never presses its nose to the concrete
  var R_MIN = 11;

  // ══ THE FILM ═══════════════════════════════════════════════════════════
  //   FLIGHT ................... the film. Cycles, volumetrics and all.
  //   LOCKED, standing still ... the film's LAST FRAME, held. Still Cycles.
  //   LOCKED, being turned ..... the baked scene, because only a scene turns.
  var FILM_SRC = BASE + 'product_flight.mp4';
  var film = null, filmOK = false, filmMode = false, live = false;
  var FADE = 420;                  // ms — the crossfade between film and scene
  var _endT = null;

  // ══ THE VOLUME ═════════════════════════════════════════════════════════
  // Marched at HALF resolution into its own target: the medium is soft and
  // the step count is the whole cost, so marching it at full resolution would
  // spend the frame budget on detail the fog does not have. The surfaces stay
  // full resolution — the desk's edge is what wants the pixels.
  var VOL_STEPS = 40, VOL_SCALE = 0.5;
  var vol = null, volTex = null;
  var rtScene = null, rtVol = null, quad = null, volMat = null, mixMat = null, fsCam = null;
  // THE ONLY TWO TRIMS LEFT, now that the lighting is measured rather than
  // modelled: how much of the medium stands, and the exposure at the grade.
  // 0.78 is not a taste: three's AgX is a fitted approximation of the curve
  // Blender runs, and at 1.0 the whole frame read uniformly hot against the
  // render. Solved, not guessed — sweeping exposure against five patches of
  // the Cycles reference (back wall · left wall · near floor · desk top ·
  // upper haze) bottoms out here at an RMS error of 0.022 sRGB, about six
  // levels out of 255.
  var K = { fog: 1.0, exposure: 0.78 };

  function log(){ if (opts.debug) console.log.apply(console, ['[stage3d]'].concat([].slice.call(arguments))); }

  // ══ BOOT ═══════════════════════════════════════════════════════════════
  function boot(){
    if (booted) return true;
    booted = true;
    buildFilm();
    Promise.all([
      import(new URL(THREEP, document.baseURI).href),
      import(new URL(LOADER, document.baseURI).href),
      fetch(BASE + 'product_stage.json').then(function(r){ return r.json(); }),
      fetch(BAKED + 'baked.json').then(function(r){ return r.json(); }),
      fetch(BASE + 'volume.json').then(function(r){ return r.json(); }),
      fetch(BASE + 'volume.bin').then(function(r){ return r.arrayBuffer(); })
    ]).then(function(r){
      T = r[0];
      return build(r[1].GLTFLoader, r[2], r[3], r[4], r[5]);
    }).catch(function(e){
      failed = true;
      notice(e);
    });
    return true;   // the page's boot() contract: "the stage is mine now"
  }

  // A BLACK STAGE AND A BROKEN STAGE LOOK IDENTICAL. That is the whole
  // problem: DARK is a designed state, so a module that fails silently is
  // invisible until someone opens the showcase and nothing happens.
  function notice(e){
    var raw = (e && e.message) ? e.message : String(e);
    console.warn('[stage3d] stage unavailable —', raw);
    var msg = 'the 3D stage did not load — ' + raw;
    if (location.protocol === 'file:'){
      var dir = '', name = 'hardware-3d.html';
      try {
        var parts = decodeURIComponent(location.pathname).split('/');
        name = parts.pop() || name;
        dir = parts.join('/');
      } catch (err) {}
      msg = 'the 3D stage needs a server. file:// blocks the module import and\n' +
            'the asset fetch, so the stage stays black and the gateway does nothing.\n\n' +
            'python3 "' + dir + '/tools/dev-server.py" 8480\n\n' +
            'then open  http://localhost:8480/' + name;
    }
    try {
      var el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;top:52%;transform:translate(-50%,-50%);z-index:3;' +
        'max-width:52ch;text-align:center;font:400 12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'letter-spacing:.06em;color:rgba(255,255,255,.42);pointer-events:none;text-wrap:balance;white-space:pre-line;';
      el.textContent = msg;
      (canvas.parentNode || document.body).appendChild(el);
    } catch (err) {}
  }

  function buildFilm(){
    try { film = document.createElement('video'); } catch (e){ return; }
    if (!film.canPlayType || !film.canPlayType('video/mp4')) { film = null; return; }
    film.src = FILM_SRC;
    film.muted = true; film.defaultMuted = true; film.playsInline = true;
    film.setAttribute('playsinline', ''); film.setAttribute('aria-hidden', 'true');
    film.preload = 'auto';
    film.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;' +
      'z-index:1;pointer-events:none;opacity:0;background:#000;' +
      'transition:opacity ' + FADE + 'ms linear;';
    film.addEventListener('canplaythrough', function(){ filmOK = true; log('film ready'); }, { once: true });
    film.addEventListener('error', function(){ filmOK = false; film = null; log('no film — the scene carries the reveal'); });
    film.addEventListener('ended', filmLanded);
    // `ended` is the clean signal and usually arrives; `timeupdate` is the
    // backup where it does not; the watchdog in play() is the backstop for a
    // paused or stalled video, which a background tab produces as policy.
    film.addEventListener('timeupdate', function(){
      if (phase === FLIGHT && film.duration && film.currentTime >= film.duration - 0.06) filmLanded();
    });
    // The canvas sits at z-index 1; a later sibling at the same index paints
    // over it, which is the whole of the crossfade's plumbing.
    if (canvas.parentNode) canvas.parentNode.insertBefore(film, canvas.nextSibling);
    film.load();
  }
  function filmLanded(){
    clearTimeout(_endT); _endT = null;
    if (phase !== FLIGHT) return;
    phase = LOCKED;
    tFlight = flight ? (flight.end - flight.start) / flight.fps : 8;
    dirty = true;
    onLocked();
  }
  // Cross to the scene — one frame drawn at the pose the film ends on, THEN
  // the fade, so the hand never crosses onto an empty canvas.
  function goLive(){
    if (live || !running) return;
    live = true; dirty = true;
    drawFrame(0, performance.now());
    if (film) film.style.opacity = '0';
    log('scene');
  }
  // …and back, the moment the product is standing on its baked mark again.
  function goFilm(){
    if (!live || !filmMode || !film) return;
    live = false;
    film.style.opacity = '1';
    log('film');
  }
  function atRest(){
    return Math.abs(oYawT) < 1e-3 && Math.abs(oPitchT) < 1e-3 &&
           Math.abs(oYaw) < 2e-3 && Math.abs(oPitch) < 2e-3 &&
           Math.abs((oRT || base.r) - base.r) < 1e-3;
  }

  // ══ THE SCENE ══════════════════════════════════════════════════════════
  function build(GLTFLoader, meta, baked, vmeta, vbuf){
    flight = meta; vol = vmeta;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e){ throw new Error('this browser gave no WebGL context — the 3D stage cannot draw'); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    // The blend grades through AgX and three has carried the same transform
    // since r167, so both ends land on the same contrast. It is applied ONCE,
    // in the composite: three turns tone mapping off automatically while a
    // render target is bound, so the scene pass stays linear and the desk's
    // top — which bakes to 5.7 — survives to be graded rather than clipped.
    renderer.toneMapping = T.AgXToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;        // the shadows are in the textures

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(flight.frames[0].fy, 1, 0.25, 400);
    scene.add(camera);
    // No lights. No environment. No fog. Every one of them is already inside
    // either the textures or the grid, and a second copy of any of them would
    // be lighting the room twice.

    volTex = new T.Data3DTexture(new Uint16Array(vbuf), vol.nx, vol.ny, vol.nz);
    volTex.format = T.RGBAFormat;
    volTex.type = T.HalfFloatType;
    volTex.minFilter = volTex.magFilter = T.LinearFilter;
    volTex.wrapS = volTex.wrapT = volTex.wrapR = T.ClampToEdgeWrapping;
    volTex.unpackAlignment = 1;
    volTex.needsUpdate = true;
    log('volume', vol.nx + '×' + vol.ny + '×' + vol.nz, (vbuf.byteLength / 1048576).toFixed(2) + ' MB');

    buildPasses();

    var tl = new T.TextureLoader();
    return new Promise(function(resolve, reject){
      new GLTFLoader().load(BAKED + baked.glb, function(gltf){
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse(function(o){
          if (!o.isMesh) return;
          var rec = baked.objects[o.name];
          if (!rec){ o.visible = false; return; }
          var tex = tl.load(BAKED + rec.tex);
          tex.colorSpace = T.SRGBColorSpace;
          tex.flipY = false;                   // glTF UV origin
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          // UNLIT, and scaled back up. Each bake was normalised to its own
          // maximum so 8 bits are spent where that surface actually lives —
          // the walls peak at 0.19 and the desk at 5.7 — and the scale puts
          // the radiance back before the tone curve ever sees it.
          o.material = new T.MeshBasicMaterial({ map: tex });
          o.material.color.setScalar(rec.scale);
          if (o.name === 'product_desk'){
            product = o;
            o.geometry.computeBoundingBox();
            deskBox = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
          }
        });
        scene.add(gltf.scene);
        solveBase();
        resize();
        running = true;
        log('baked scene loaded');
        if (pendingPlay){ pendingPlay = false; play(); }
        requestAnimationFrame(tick);
        resolve();
      }, undefined, reject);
    });
  }

  // ── The three passes ──────────────────────────────────────────────────
  //   1. the baked room  -> rtScene (linear, with a depth texture)
  //   2. the medium      -> rtVol   (half res: rgb in-scatter, a transmittance)
  //   3. composite       -> screen  (scene·T + in-scatter, then AgX, once)
  function buildPasses(){
    rtScene = new T.WebGLRenderTarget(2, 2, { type: T.HalfFloatType, depthBuffer: true });
    rtScene.depthTexture = new T.DepthTexture(2, 2);
    rtScene.depthTexture.type = T.UnsignedIntType;
    rtVol = new T.WebGLRenderTarget(2, 2, { type: T.HalfFloatType, depthBuffer: false });

    fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new T.Mesh(new T.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;

    volMat = new T.ShaderMaterial({
      // GLSL3 is not a preference here: sampler3D does not exist in GLSL ES
      // 1.00, so a 3D texture cannot be read at all without it.
      glslVersion: T.GLSL3,
      defines: { STEPS: VOL_STEPS },
      uniforms: {
        tDepth: { value: rtScene.depthTexture }, tVol: { value: volTex },
        uVolMin: { value: new T.Vector3().fromArray(vol.min) },
        uVolMax: { value: new T.Vector3().fromArray(vol.max) },
        uInvProj: { value: new T.Matrix4() }, uCamWorld: { value: new T.Matrix4() },
        uNear: { value: 0.25 }, uFar: { value: 400 }, uFog: { value: 1 }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'precision highp sampler3D;',
        // GLSL3 has no gl_FragColor; the shader declares its own output. (three
        // defines `varying` and `texture2D` for a GLSL3 ShaderMaterial, but not
        // the fragment output — that is the author's to name.)
        'layout(location = 0) out vec4 bsOut;',
        'varying vec2 vUv;',
        'uniform sampler2D tDepth;',
        'uniform sampler3D tVol;',
        'uniform vec3 uVolMin, uVolMax;',
        'uniform mat4 uInvProj, uCamWorld;',
        'uniform float uNear, uFar, uFog;',
        'float viewZ(float d){ return (uNear * uFar) / ((uFar - uNear) * d - uFar); }',
        // A per-pixel offset on the first step. Without it, 40 steps through a
        // smooth medium lay down 40 visible shells; with it the error becomes
        // noise, and the half-resolution upsample smooths that away.
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
        'void main(){',
        '  vec4 nd = uInvProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0);',
        '  vec3 vd = normalize(nd.xyz / nd.w);',              // the ray, in view space
        '  vec3 ro = uCamWorld[3].xyz;',
        '  vec3 rd = normalize((uCamWorld * vec4(vd, 0.0)).xyz);',
        '  float d = texture2D(tDepth, vUv).x;',
        // Background pixels carry depth 1.0 and no surface: march to the far
        // plane and let the box test stop the ray at the room's own wall.
        '  float tSurf = (d >= 0.999999) ? uFar : (viewZ(d) / vd.z);',
        '  vec3 inv = 1.0 / rd;',
        '  vec3 a = (uVolMin - ro) * inv, b = (uVolMax - ro) * inv;',
        '  vec3 lo = min(a, b), hi = max(a, b);',
        '  float t0 = max(max(lo.x, lo.y), max(lo.z, 0.0));',
        '  float t1 = min(min(hi.x, hi.y), min(hi.z, tSurf));',
        '  vec3 acc = vec3(0.0); float Tr = 1.0;',
        '  if (t1 > t0){',
        '    float dt = (t1 - t0) / float(STEPS);',
        '    float t = t0 + dt * hash(gl_FragCoord.xy);',
        '    vec3 span = uVolMax - uVolMin;',
        '    for (int i = 0; i < STEPS; i++){',
        '      vec3 p = ro + rd * t;',
        '      vec4 s = texture(tVol, (p - uVolMin) / span);',
        '      acc += Tr * s.rgb * uFog * dt;',               // in-scatter over this step
        '      Tr *= exp(-s.a * dt);',                        // and what it costs to see past it
        '      t += dt;',
        '    }',
        '  }',
        '  bsOut = vec4(acc, Tr);',
        '}'
      ].join('\n')
    });
    volMat.depthTest = volMat.depthWrite = false;

    mixMat = new T.ShaderMaterial({
      uniforms: { tScene: { value: rtScene.texture }, tVol: { value: rtVol.texture } },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'varying vec2 vUv;',
        'uniform sampler2D tScene, tVol;',
        'void main(){',
        '  vec4 v = texture2D(tVol, vUv);',
        '  vec3 c = texture2D(tScene, vUv).rgb * v.a + v.rgb;',
        '  gl_FragColor = vec4(c, 1.0);',
        // The one place the film curve is applied. three prepends the tone
        // mapping function and the output transform for any ShaderMaterial,
        // so these two chunks are the whole grade.
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n')
    });
    mixMat.depthTest = mixMat.depthWrite = false;
  }

  // The film's pose, decomposed once: where the blend's camera ends up, how
  // far that is from the product, and the fixed correction between "looking
  // at the product" and the shot the blend actually framed.
  function solveBase(){
    var f = flight.frames[flight.frames.length - 1];
    var C = new T.Vector3().fromArray(flight.product.center);
    var P = new T.Vector3().fromArray(f.p);
    var d = new T.Vector3().subVectors(P, C);
    var r = d.length();
    var pitch0 = Math.asin(T.MathUtils.clamp(d.y / r, -1, 1));
    var yaw0   = Math.atan2(d.x, d.z);
    var qBaked = new T.Quaternion().fromArray(f.q);
    var qLook0 = lookQuat(P, C);
    base = { C: C, r: r, yaw0: yaw0, pitch0: pitch0,
             qFix: qBaked.clone().multiply(qLook0.clone().invert()),
             room: new T.Box3(new T.Vector3().fromArray(flight.room.min),
                              new T.Vector3().fromArray(flight.room.max)) };
    log('base r=%s yaw=%s pitch=%s', r.toFixed(2), yaw0.toFixed(3), pitch0.toFixed(3));
  }
  var _m = null, _up = null;
  function lookQuat(from, at){
    if (!_m){ _m = new T.Matrix4(); _up = new T.Vector3(0, 1, 0); }
    _m.lookAt(from, at, _up);
    return new T.Quaternion().setFromRotationMatrix(_m);
  }

  // ══ THE FRAME ══════════════════════════════════════════════════════════
  var _p = null, _q = null, _dir = null;
  function poseFlight(){
    var fr = flight.frames, n = fr.length;
    var x = T.MathUtils.clamp(tFlight * flight.fps, 0, n - 1);
    var i = Math.floor(x), j = Math.min(i + 1, n - 1), u = x - i;
    var a = fr[i], b = fr[j];
    if (!_p){ _p = new T.Vector3(); _q = new T.Quaternion(); }
    _p.set(a.p[0] + (b.p[0] - a.p[0]) * u, a.p[1] + (b.p[1] - a.p[1]) * u, a.p[2] + (b.p[2] - a.p[2]) * u);
    _q.fromArray(a.q).slerp(new T.Quaternion().fromArray(b.q), u);
    camera.position.copy(_p);
    camera.quaternion.copy(_q);
    return { fy: a.fy, fx: a.fx };
  }
  // How far the camera may stand from the product along `dir` before it is
  // inside the concrete: the ray/box slab test against the exported interior.
  function roomLimit(dir){
    var t = Infinity, lo = base.room.min, hi = base.room.max;
    for (var a = 0; a < 3; a++){
      var d = dir.getComponent(a);
      if (Math.abs(d) < 1e-6) continue;
      var c = base.C.getComponent(a);
      t = Math.min(t, ((d > 0 ? hi.getComponent(a) : lo.getComponent(a)) - c) / d);
    }
    return t;
  }
  function poseLocked(){
    var yaw = base.yaw0 + oYaw;
    var pitch = T.MathUtils.clamp(base.pitch0 + oPitch, PITCH_MIN, PITCH_MAX);
    var cp = Math.cos(pitch);
    if (!_dir) _dir = new T.Vector3();
    _dir.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    var want = oR > 0 ? oR : base.r;
    var r = Math.max(R_MIN, Math.min(want, roomLimit(_dir) - WALL_GAP));
    _p = _p || new T.Vector3();
    _p.copy(base.C).addScaledVector(_dir, r);
    camera.position.copy(_p);
    camera.quaternion.copy(base.qFix).multiply(lookQuat(_p, base.C));
    var f = flight.frames[flight.frames.length - 1];
    return { fy: f.fy, fx: f.fx };
  }

  // POSE WITHOUT DRAWING. hit() has to answer "is the pointer on the product"
  // before anything has been rendered — while the FILM is on screen the
  // renderer is asleep by design, so the camera sits at the origin and every
  // press misses the desk, which reads to a hand as "the scene will not turn".
  // In v1 the renderer drew the flight itself and hit() got a posed camera for
  // free; the film took that away, and this puts it back explicitly rather
  // than by side effect.
  function poseNow(){
    if (!running || !base || phase === DARK) return;
    project(phase === FLIGHT ? poseFlight() : poseLocked());
    camera.updateMatrixWorld();
  }

  function project(e){
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    var aspect = w / h;
    camera.aspect = aspect;
    // THE SCENE CROPS THE WAY THE FILM CROPS. The film is a 16:9 render shown
    // with `object-fit: cover`, so on a wider window it loses top and bottom
    // and on a narrower one it loses the sides. The camera does the same, or
    // the crossfade between them is a jump in focal length.
    camera.fov = (aspect >= flight.refAspect)
      ? 2 * T.MathUtils.radToDeg(Math.atan(Math.tan(T.MathUtils.degToRad(e.fx) / 2) / aspect))
      : e.fy;
    camera.updateProjectionMatrix();
    if (BERTH_X !== 0.5 || BERTH_Y !== 0.5){
      camera.projectionMatrix.elements[8] += (2 * BERTH_X - 1);
      camera.projectionMatrix.elements[9] += (1 - 2 * BERTH_Y);
    }
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function drawFrame(dt, now){
    if (phase === DARK){
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      return;
    }
    if (phase === FLIGHT){
      var dur = (flight.end - flight.start) / flight.fps;
      if (tStart < 0) tStart = now;              // the clock starts on the first drawn frame
      tFlight = (now - tStart) / 1000;
      if (tFlight >= dur){ tFlight = dur; phase = LOCKED; onLocked(); }
    }
    if (oSnap){ oYaw = oYawT; oPitch = oPitchT; oR = oRT; oSnap = false; }
    else if (!grabbed){
      var k = 1 - Math.exp(-dt * ORBIT_EASE);
      oYaw += (oYawT - oYaw) * k; oPitch += (oPitchT - oPitch) * k;
      oR = (oR || base.r) + ((oRT || base.r) - (oR || base.r)) * k;
    }
    var e = (phase === FLIGHT) ? poseFlight() : poseLocked();
    project(e);
    camera.updateMatrixWorld();

    // 1. the baked room, unlit, into a linear target
    renderer.setRenderTarget(rtScene);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. the medium, at half resolution
    volMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
    volMat.uniforms.uCamWorld.value.copy(camera.matrixWorld);
    volMat.uniforms.uNear.value = camera.near;
    volMat.uniforms.uFar.value = camera.far;
    volMat.uniforms.uFog.value = K.fog;
    quad.material = volMat;
    renderer.setRenderTarget(rtVol);
    renderer.render(quad, fsCam);

    // 3. compose, and grade once
    renderer.toneMappingExposure = K.exposure;
    quad.material = mixMat;
    renderer.setRenderTarget(null);
    renderer.render(quad, fsCam);
  }

  var lastT = 0;
  function tick(t){
    if (!running) return;
    requestAnimationFrame(tick);
    // Shown off (an unreal class is on stage): draw nothing. The flight's
    // clock is never stalled, and document.hidden is deliberately not
    // consulted — an embedding host can report `hidden` while the page is
    // plainly on screen (a desktop app's preview pane does exactly that), and
    // a reveal that waits forever on a visibility flag is indistinguishable
    // from one that is broken.
    if (!visible){ lastT = t; return; }
    var dt = Math.min((t - lastT) / 1000, 0.1); lastT = t;
    if (phase === DARK) return;
    // The film is on screen: the renderer has nothing to add and everything
    // to cost. It sleeps until a hand asks for the one thing film cannot do.
    if (filmMode && !live){ if (phase === LOCKED && !atRest()) goLive(); return; }
    // Standing back on the baked mark with a film to return to: hand it back.
    if (filmMode && live && phase === LOCKED && !grabbed && atRest()
        && Math.abs(oYawT - oYaw) < 1e-3 && Math.abs(oPitchT - oPitch) < 1e-3){ goFilm(); return; }
    // LOCKED and still: nothing to redraw. The stage costs one comparison a
    // frame once it has settled — the ball's own perf law, kept.
    if (phase === LOCKED && !grabbed && !dirty
        && Math.abs(oYawT - oYaw) < 1e-4 && Math.abs(oPitchT - oPitch) < 1e-4
        && Math.abs((oRT || base.r) - (oR || base.r)) < 1e-3) return;
    dirty = false;
    drawFrame(dt, t);
  }
  function poke(){ dirty = true; }

  function onLocked(){
    poseNow();                 // the film is holding the screen; the camera still has to be somewhere
    log('locked');
    if (typeof opts.onLocked === 'function') opts.onLocked();
    if (canvas.dispatchEvent) canvas.dispatchEvent(new CustomEvent('bs-stage-locked', { bubbles: true }));
  }

  function play(){
    if (!running && !filmOK){ pendingPlay = true; return false; }
    if (phase !== DARK) return false;      // within one entry, the shot plays once
    tFlight = 0; tStart = -1; phase = FLIGHT; dirty = true;
    oYaw = oYawT = oPitch = oPitchT = 0; oR = oRT = 0;
    live = false;
    filmMode = !!(filmOK && film);
    if (filmMode){
      film.style.opacity = '1';
      try { film.currentTime = 0; } catch (e) {}
      var pr = film.play();
      if (pr && pr.catch) pr.catch(function(){ filmMode = false; film.style.opacity = '0'; log('film refused to play — live reveal'); });
      clearTimeout(_endT);
      // The FILM's own length, not the flight data's — they are meant to match
      // and a mismatch must not strand the page in FLIGHT.
      var dur = (film.duration && isFinite(film.duration)) ? film.duration
              : (flight ? (flight.end - flight.start) / flight.fps : 8);
      _endT = setTimeout(filmLanded, (dur + 2.5) * 1000);
    }
    return true;
  }
  // ENTERING THE SHOWCASE: the gateway is a door, and a door can be walked
  // through twice. replay() puts the room back in the dark and runs the
  // reveal from the top — which LOCKED never does on its own, so nothing the
  // rest of the page does can trigger this.
  function replay(){
    if (!running && !filmOK){ pendingPlay = true; return false; }
    phase = DARK; tFlight = 0;
    if (film) film.style.opacity = '0';
    live = false;
    return play();
  }

  function resize(){
    if (!renderer) return;
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(w, h, false);
    var pw = Math.max(2, Math.round(w * dpr)), ph = Math.max(2, Math.round(h * dpr));
    rtScene.setSize(pw, ph);
    rtVol.setSize(Math.max(2, Math.round(pw * VOL_SCALE)), Math.max(2, Math.round(ph * VOL_SCALE)));
    dirty = true;
  }
  window.addEventListener('resize', resize);

  // ══ THE SEAM — BSBall's api, answered ══════════════════════════════════
  return {
    boot: boot,

    // The material bind. Recorded, not applied — see BIND_MATERIAL above.
    set: function(o){ lastSet = o; },

    show: function(on){
      visible = !!on;
      canvas.classList.toggle('is-off', !on);
      if (film) film.style.visibility = on ? '' : 'hidden';
      poke();
    },

    // The berth solve. LOCKED means locked: once the flight has landed, no
    // plate, panel or resize re-frames the product. Held for the record so
    // the page's own calls stay honest and a later ruling can consume them.
    stage: function(o){ lastStage = o; },

    grab: function(on){
      grabbed = !!on && phase === LOCKED;
      if (grabbed) goLive();                 // the film cannot be turned; the scene can
      poke();
    },

    // THE VIEWING HAND, free again in v2 — any yaw, any pitch. A baked scene
    // is a render from every angle, not only from the one the film was shot
    // on, which is the whole reason for baking rather than filming the turn.
    orbit: function(dYaw, dPitch){
      if (phase !== LOCKED) return;
      oYawT += dYaw; oYaw += dYaw;
      oPitchT = T.MathUtils.clamp(oPitchT + dPitch, PITCH_MIN - base.pitch0, PITCH_MAX - base.pitch0);
      oPitch  = T.MathUtils.clamp(oPitch  + dPitch, PITCH_MIN - base.pitch0, PITCH_MAX - base.pitch0);
      oRT = oR = (oR || base.r);            // the hand keeps whatever distance it was handed
      viewName = null; poke();
    },

    // The OVERVIEW's I · II · III, as offsets from the film's pose.
    view: function(name, instant){
      var v = VIEWS[name]; if (!v || !base) return viewName;
      if (phase !== LOCKED){ viewName = name; return name; }
      var d = v.yaw - oYawT; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      oYawT += d; oPitchT = v.pitch; oRT = v.r || base.r;
      if (instant) oSnap = true;
      if (!(v.yaw === 0 && v.pitch === 0 && !v.r)) goLive();   // I is the film's own frame; II and III are not
      viewName = name; poke(); return name;
    },
    views: function(){ return Object.keys(VIEWS); },

    // THE PRODUCT'S OWN SILHOUETTE decides a grab, exactly as the ball's disc
    // did: the canvas is pointer-transparent and the page asks first, so
    // every other stage press keeps its old meaning.
    hit: function(x, y){
      if (!deskBox || !visible || phase !== LOCKED) return false;
      var r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      // Cheap, and it also covers a resize that happened while the film stood:
      // the aspect would otherwise be stale and the test quietly wrong.
      if (!live) poseNow();
      if (!_ray){ _ray = new T.Raycaster(); _v2 = new T.Vector2(); }
      _v2.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      _ray.setFromCamera(_v2, camera);
      return _ray.ray.intersectsBox(deskBox);
    },

    // ?dev instrumentation — the ball's own witness hooks, kept.
    // frame()        — draw one, now.
    // frame(seconds) — SCRUB the flight to that second and draw it. A capture
    //                  never sees eight seconds of rAF, so the only way to
    //                  witness the reveal is to name the moment.
    frame: function(at){
      if (!renderer) return;
      var now = performance.now();
      if (typeof at === 'number' && phase !== DARK){
        if (phase === LOCKED){ phase = FLIGHT; }
        tStart = now - at * 1000;
        dirty = true; drawFrame(0, now);
        return tFlight;
      }
      dirty = true; drawFrame(0.05, now);
    },
    state: function(){
      return { kind: '3d', phase: ['dark', 'flight', 'locked'][phase], t: +tFlight.toFixed(3),
               surface: (filmMode && !live) ? 'film' : 'scene',
               filmOK: filmOK, ready: !!running, failed: failed, view: viewName,
               oYaw: +oYaw.toFixed(4), oPitch: +oPitch.toFixed(4),
               r: base ? +(oR || base.r).toFixed(2) : null, grabbed: grabbed,
               cam: camera ? camera.position.toArray().map(function(v){ return +v.toFixed(2); }) : null,
               set: lastSet, stage: lastStage };
    },
    snap: function(){ return null; },   // the cart's product photos stay on the offstage ball

    // ── The two verbs the page calls: the flight, and the door. ───────────
    play: play,
    replay: replay,
    phase: function(){ return ['dark', 'flight', 'locked'][phase]; },
    skip: function(){ if (phase === FLIGHT){ tFlight = (flight.end - flight.start) / flight.fps; phase = LOCKED; dirty = true; onLocked(); } },
    // What is left to trim, now that the lighting is measured rather than
    // modelled: how much of the medium stands, and the exposure at the grade.
    tune: function(o){ if (o){ Object.keys(o).forEach(function(k){ if (k in K) K[k] = o[k]; }); poke(); } return Object.assign({}, K); },
    rig: function(){ return opts.debug ? { T: T, renderer: renderer, scene: scene, camera: camera, volMat: volMat, mixMat: mixMat, volTex: volTex, product: product, poke: poke } : null; }
  };
};
})();
