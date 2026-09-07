/* ══════════════════════════════════════════════════════════════════════════
   backspace — THE STAGE BALL (shared module), v1.
   FACTORED Aug 28 2026 at its second consumer (Eric's sixth word): the
   /hardware stage and the /cart preview render the same material ball.
   Dependency-free WebGL PBR sphere behind the STAGE-BINDING SEAM — pages
   bind selection state to {color, metal, rough, scale} and place the
   berth with stage({cx, cy, rad}, viewport fractions); the eventual desk
   GLB (color ramp + procedural texture nodes) replaces this module
   BEHIND the same api, and no page's interaction layer changes.
   Perf: one small draw per rAF, paused when hidden or shown-off; the
   ?dev forced-frame hook serves headless witnesses (LOGGING-build
   precedent). No dependency, no CDN — the weight law holds.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
window.BSBall = function(canvas){
  var gl = null, prog = null, nTri = 0;
  var U = {};
  var cur = { color: [0.1, 0.1, 0.1], metal: 1, rough: 0.4, scale: 1, cx: 0.47, cy: 0.55, rad: 0.21 };
  var tgt = { color: [0.1, 0.1, 0.1], metal: 1, rough: 0.4, scale: 1, cx: 0.47, cy: 0.55, rad: 0.21 };
  var running = false, visible = true, rot = 0, lastT = 0;
  // THE VIEWING HAND (Eric, Aug 31): rotX is the drag pitch; grabbed
  // pauses the presentation turn while the hand holds the model.
  var rotX = 0, grabbed = false;
  // THE STUDIO CAMERA (Eric, Sept 8): the lights belong to the ROOM, not to
  // the viewer. Until now every light vector lived in view space and the
  // vertex shader turned the model — and because a featureless sphere's
  // normal field is rotation-invariant (vN = the rotated position, and a
  // fragment's normal is a pure function of its screen position), the drag
  // was mathematically incapable of changing one pixel. So the hand now
  // orbits the CAMERA through a fixed studio: uCam carries the camera's
  // orientation into the shader, the key and fill stay put in the room, and
  // turning the model sweeps the highlight across it. `rot` keeps its own
  // presentation turn for the model — invisible on a sphere, and the turn
  // the desk GLB will inherit unchanged.
  var camYaw = 0, camPitch = 0, camYawT = 0, camPitchT = 0, camSnap = false;
  var VIEWS = {                                  // the baked camera positions
    front: { yaw: 0,               pitch: 0 },
    side:  { yaw: Math.PI * 0.5,   pitch: 0 },
    top:   { yaw: 0,               pitch: Math.PI * 0.5 }
  };
  var viewName = 'front';

  function buildSphere(rows, cols){
    var pos = [], idx = [];
    for (var r = 0; r <= rows; r++){
      var phi = Math.PI * r / rows;
      for (var c2 = 0; c2 <= cols; c2++){
        var th = 2 * Math.PI * c2 / cols;
        var x = Math.sin(phi) * Math.cos(th), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(th);
        pos.push(x, y, z);
      }
    }
    for (var r2 = 0; r2 < rows; r2++){
      for (var c3 = 0; c3 < cols; c3++){
        var a = r2 * (cols + 1) + c3, b2 = a + cols + 1;
        idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
      }
    }
    return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
  }

  var VS = [
    'attribute vec3 aPos;',
    'uniform vec2 uRes; uniform vec2 uCenter; uniform float uRadius; uniform float uRot; uniform float uRotX;',
    'varying vec3 vN; varying vec3 vP;',
    'void main(){',
    '  float cr = cos(uRot), sr = sin(uRot);',
    '  vec3 p = vec3(aPos.x*cr + aPos.z*sr, aPos.y, -aPos.x*sr + aPos.z*cr);',
    '  float cx2 = cos(uRotX), sx2 = sin(uRotX);',       // the drag pitch
    '  p = vec3(p.x, p.y*cx2 - p.z*sx2, p.y*sx2 + p.z*cx2);',
    '  vN = p; vP = p;',
    '  vec2 px = uCenter + p.xy * uRadius * vec2(1.0, -1.0);',
    '  vec2 ndc = (px / uRes) * 2.0 - 1.0;',
    '  gl_Position = vec4(ndc.x, -ndc.y, -p.z * 0.001, 1.0);',   // front hemisphere depth-wins
    '}'
  ].join('\n');
  var FS = [
    // A studio read for the material ball: key + fill, a vertical
    // gradient environment with an overhead softbox sampled along the
    // view reflection, fresnel-weighted — metals reflect the room in
    // their own tint, dielectrics carry lit albedo + white spec. The
    // GLB phase brings real IBL; this is the placeholder's honest lie.
    'precision mediump float;',
    'varying vec3 vN; varying vec3 vP;',
    'uniform vec3 uColor; uniform float uMetal; uniform float uRough;',
    'uniform mat3 uCam;',      // camera -> room. Identity = the resting look, unchanged.
    'void main(){',
    '  vec3 Nc = normalize(vN);',
    '  vec3 Vc = vec3(0.0, 0.0, 1.0);',
    // Lighting happens in the ROOM's frame: carry the surface and the eye
    // there, leave the lamps and the ceiling where they stand.
    '  vec3 N = uCam * Nc;',
    '  vec3 V = uCam * Vc;',
    '  vec3 R = reflect(-V, N);',
    '  float NdV = max(dot(N, V), 0.0);',
    '  vec3 albedo = uColor;',
    '  vec3 L1 = normalize(vec3(0.55, 0.70, 0.50));',
    '  vec3 L2 = normalize(vec3(-0.65, 0.10, 0.40));',
    '  float d1 = max(dot(N, L1), 0.0);',
    '  float d2 = max(dot(N, L2), 0.0);',
    '  vec3 diff = mix(albedo, vec3(0.0), uMetal) * (d1 * 1.0 + d2 * 0.25 + 0.10);',
    '  float gloss = exp2(11.0 * (1.0 - uRough));',
    '  vec3 H1 = normalize(L1 + V);',
    '  vec3 H2 = normalize(L2 + V);',
    '  float s1 = pow(max(dot(N, H1), 0.0), gloss);',
    '  float s2 = pow(max(dot(N, H2), 0.0), gloss * 0.5);',
    '  float sNorm = min((gloss + 2.0) * 0.02, 3.0);',
    '  vec3 F0 = mix(vec3(0.04), albedo, uMetal);',
    '  vec3 F = F0 + (vec3(1.0) - F0) * pow(1.0 - NdV, 4.0);',
    '  float ry = R.y * 0.5 + 0.5;',
    '  vec3 env = mix(vec3(0.05, 0.05, 0.058), vec3(0.34, 0.34, 0.38), smoothstep(0.15, 0.85, ry))',
    '           + vec3(0.32) * pow(max(R.y, 0.0), 3.0);',
    '  vec3 spec = F * (s1 * 1.1 + s2 * 0.35) * sNorm * (1.0 - uRough * 0.4);',
    '  vec3 refl = env * F * (1.0 - uRough * 0.72);',
    '  vec3 col = diff + spec + refl;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function boot(){
    gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) return false;                       // no WebGL: the stage stays blank black
    function sh(type, src){
      var h = gl.createShader(type);
      gl.shaderSource(h, src); gl.compileShader(h);
      return h;
    }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var mesh = buildSphere(40, 56);
    nTri = mesh.idx.length;
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    ['uRes', 'uCenter', 'uRadius', 'uRot', 'uRotX', 'uColor', 'uMetal', 'uRough', 'uCam'].forEach(function(n){
      U[n] = gl.getUniformLocation(prog, n);
    });
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    resize();
    running = true;
    requestAnimationFrame(tick);
    return true;
  }
  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(canvas.clientWidth  * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function drawFrame(dt){
    if (!grabbed) rot += dt * 0.25;              // the slow presentation turn — pauses in the grip
    // Targets ease in — material changes read as a settle, not a snap
    // (content snaps, SURFACES fade; a material is surface).
    var k = 1 - Math.exp(-dt * 7);
    for (var i = 0; i < 3; i++) cur.color[i] += (tgt.color[i] - cur.color[i]) * k;
    cur.metal += (tgt.metal - cur.metal) * k;
    cur.rough += (tgt.rough - cur.rough) * k;
    cur.scale += (tgt.scale - cur.scale) * k;
    cur.cx += (tgt.cx - cur.cx) * k;
    cur.cy += (tgt.cy - cur.cy) * k;
    cur.rad += (tgt.rad - cur.rad) * k;
    // The camera travels on the same settle as a material — a view change
    // reads as a move through the room, not a cut.
    if (camSnap){ camYaw = camYawT; camPitch = camPitchT; camSnap = false; }
    else { var kc = 1 - Math.exp(-dt * 5.5); camYaw += (camYawT - camYaw) * kc; camPitch += (camPitchT - camPitch) * kc; }
    var w = canvas.width, h = canvas.height;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(U.uRes, w, h);
    // The stage berth eases between modes: the midfield at rest, and
    // pushed down + further away while the introduction plates stand
    // (Eric, Aug 28 fourth word, p1 — the B-1-1 recomposition).
    gl.uniform2f(U.uCenter, w * cur.cx, h * cur.cy);
    gl.uniform1f(U.uRadius, Math.min(w, h) * cur.rad * cur.scale);
    gl.uniform1f(U.uRot, rot);
    gl.uniform1f(U.uRotX, rotX);
    gl.uniform3f(U.uColor, cur.color[0], cur.color[1], cur.color[2]);
    gl.uniform1f(U.uMetal, cur.metal);
    gl.uniform1f(U.uRough, cur.rough);
    // camera -> room, R = Ry(yaw) . Rx(pitch), column-major
    var ca = Math.cos(camYaw), sa = Math.sin(camYaw), cb = Math.cos(camPitch), sb = Math.sin(camPitch);
    gl.uniformMatrix3fv(U.uCam, false, new Float32Array([
      ca,        0,   -sa,
      sa * sb,   cb,   ca * sb,
      sa * cb,  -sb,   ca * cb
    ]));
    gl.drawElements(gl.TRIANGLES, nTri, gl.UNSIGNED_SHORT, 0);
  }
  function tick(t){
    if (!running) return;
    requestAnimationFrame(tick);
    if (document.hidden || !visible) { lastT = t; return; }
    var dt = Math.min((t - lastT) / 1000, 0.1); lastT = t;
    drawFrame(dt);
  }
  window.addEventListener('resize', resize);
  return {
    boot: boot,
    set: function(o){
      if (o.color)  tgt.color = o.color.slice();
      if (o.metal  != null) tgt.metal = o.metal;
      if (o.rough  != null) tgt.rough = o.rough;
      if (o.scale  != null) tgt.scale = o.scale;
    },
    show: function(on){ visible = on; canvas.classList.toggle('is-off', !on); },
    // The stage berth — fractions of the viewport; eased like materials.
    stage: function(o){
      if (o.cx  != null) tgt.cx  = o.cx;
      if (o.cy  != null) tgt.cy  = o.cy;
      if (o.rad != null) tgt.rad = o.rad;
    },
    // THE VIEWING HAND (Eric, Aug 31): press-drag orbits the model.
    // grab(true) pauses the presentation turn while the hand holds it
    // (it resumes from wherever the hand leaves the model); orbit takes
    // radian deltas — the page owns the px→rad rate; pitch clamps so
    // the poles stay honest. hit() answers whether a viewport point is
    // on the ball's disc — the canvas is pointer-transparent, so the
    // page asks before treating a stage press as a grab.
    grab: function(on){ grabbed = !!on; },
    // The hand orbits the CAMERA (Sept 8). Yaw runs free; pitch clamps so
    // the room never turns past its poles. Any drag leaves the named views.
    orbit: function(dYaw, dPitch){
      camYawT += dYaw; camYaw += dYaw;
      camPitchT = Math.max(-1.1, Math.min(1.1, camPitchT + dPitch));
      camPitch = Math.max(-1.1, Math.min(1.1, camPitch + dPitch));
      viewName = null;
    },
    // THE BAKED VIEWS: front / side / top. The camera travels to the named
    // position on the material settle; instant:true places it in one frame
    // (the witness path). Returns the name it took.
    view: function(name, instant){
      var v = VIEWS[name]; if (!v) return viewName;
      // travel the short way round from wherever the hand left the camera
      var d = v.yaw - camYawT; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      camYawT += d; camPitchT = v.pitch;
      if (instant) camSnap = true;
      viewName = name; return name;
    },
    views: function(){ return Object.keys(VIEWS); },
    hit: function(x, y){
      var r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      var px = (x - r.left) * (canvas.width / r.width);
      var py = (y - r.top) * (canvas.height / r.height);
      var dx2 = px - canvas.width * cur.cx;
      var dy2 = py - canvas.height * cur.cy;
      var rad = Math.min(canvas.width, canvas.height) * cur.rad * cur.scale;
      return visible && (dx2 * dx2 + dy2 * dy2) <= rad * rad;
    },
    // ?dev instrumentation: force one frame (headless/hidden captures
    // never see rAF — the softfractal LOGGING-build precedent), and
    // the orbit state for the witness.
    frame: function(){ if (gl){ for (var i = 0; i < 40; i++) drawFrame(0.05); } },
    state: function(){ return { rot: rot, rotX: rotX, grabbed: grabbed, view: viewName, camYaw: camYaw, camPitch: camPitch, camYawT: camYawT, camPitchT: camPitchT }; },
    // SNAPSHOT (thirteenth word, Aug 29; alpha since the same day's
    // grey-plate ruling): render a configuration instantly and hand
    // back a PNG data URL WITH TRANSPARENCY — the product floats, so
    // the slot's translucent grey plate reads through underneath and
    // the box never blends into the stage. Same-task readback keeps
    // the buffer valid without preserveDrawingBuffer. Returns null
    // where WebGL is absent.
    snap: function(o){
      if (!gl) return null;
      if (o.color){ cur.color = o.color.slice(); tgt.color = o.color.slice(); }
      if (o.metal  != null){ cur.metal = tgt.metal = o.metal; }
      if (o.rough  != null){ cur.rough = tgt.rough = o.rough; }
      if (o.scale  != null){ cur.scale = tgt.scale = o.scale; }
      rot = 0.6; rotX = 0;                       // one consistent presentation angle
      camYaw = camYawT = 0; camPitch = camPitchT = 0;   // and one consistent camera, so every product photo matches
      drawFrame(0);
      try { return canvas.toDataURL('image/png'); } catch (e) { return null; }
    }
  };
};
})();
