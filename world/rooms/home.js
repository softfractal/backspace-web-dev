/* backspace — the home room (world/rooms/home.js)
 *
 * Locked-camera room over a projection bake. The shell is unlit: the
 * Cycles beauty (R,G,B = fog phase 0°,120°,240°) is looked up PER FRAGMENT
 * by projecting the world position through the padded bake camera
 * (`padProj`), and mixed by three weights that sum to 1. TEXCOORD_0
 * (uv_proj) is exact at the vertices only, so it is kept as a fallback
 * (`mix.uv_mode: "attribute"`) and as the dev-time check of the projection.
 * The camera never translates (nodal point law); the look controller only
 * rotates it inside the bake's padding. The panel mixes the baked OFF
 * panel (same projection) with its content on one mood scalar:
 * off → power_on → content:<key>. Motes are GPU points on the Geometry
 * Nodes formula, gated by the beauty's own luminance; their home
 * positions come from the GLB's bs_home_motes point cloud when present.
 *
 * Seam api: boot · set · show · stage · grab · orbit · hit · view · state ·
 * frame · snap — a locked room answers grab/orbit/hit with false.
 */

const DEG = Math.PI / 180;

// ── shaders ──────────────────────────────────────────────────────────────
// Shared: world position → padded-camera clip → beauty uv. The beauty is a
// top-left-origin texture (KTX2 orientation rd, PNG with flipY=false), so
// v = 0.5 − 0.5·y/w. Outside the frustum (w ≤ 0) `inside` is 0 → black.
const PROJ_CHUNK = /* glsl */`
uniform sampler2D mapRest;      // the at-rest half of the pack (display camera, full width)
uniform vec4 restRect;          // the at-rest rectangle in padded uv (top-left origin): x0, y0, x1, y1
uniform float hasRest;          // 1 when mapRest is real
uniform float restFeather;      // blend width inside the rectangle edge, in rest-uv units
vec2 projUV(vec4 p, out float inside) {
  inside = step(1e-6, p.w);
  vec2 ndc = p.xy / max(p.w, 1e-6);
  return clamp(vec2(0.5 + 0.5 * ndc.x, 0.5 - 0.5 * ndc.y), 0.0, 1.0);
}
// Film grain (Eric, Sept 16: the un-denoised Cycles preview reads as richer
// texture and fog; the bake is denoised, so the grain is put back LIVE, on the
// rAF clock, in linear light). grainAmount = peak relative deviation; a cell
// is grainSize device pixels; grainSeed changes per frame (static under
// reduced motion). Zero cost: same pass, one hash per fragment.
uniform float grainAmount;
uniform float grainSize;
uniform float grainSeed;
float grainHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
// Contrast (Eric, Sept 16: "10 % more, both rooms"). Applied in display
// space around a pivot (image-editor semantics: 1.0 = the render as baked),
// then returned to linear for the output encode. A runtime grade, so it can
// be judged without a rebake; if it stays, it belongs in the bake's look.
uniform float contrast;
uniform float contrastPivot;
float applyContrast(float y) {
  if (abs(contrast - 1.0) < 1e-4) return y;
  float v = pow(max(y, 0.0), 1.0 / 2.2);
  v = clamp(contrastPivot + (v - contrastPivot) * contrast, 0.0, 1.0);
  return pow(v, 2.2);
}
float grain(float y) {
  if (grainAmount <= 0.0) return y;
  vec2 cell = floor(gl_FragCoord.xy / max(grainSize, 1.0)) + vec2(grainSeed * 0.618, grainSeed * 0.382);
  float h = grainHash(cell) - 0.5;
  // multiplicative, but damped in the deep shadows and near white like film
  float k = grainAmount * (1.0 - smoothstep(0.6, 1.0, y));
  return max(y * (1.0 + 2.0 * k * h), 0.0);
}
// Two-texture pack: inside the at-rest rectangle the display-camera render
// (2.11x the texels per degree) replaces the padded beauty, feathered over
// restFeather so the seam never shows; both hold the same three fog phases.
vec3 beautyRGB(sampler2D padded, vec2 uv) {
  vec3 p = texture2D(padded, uv).rgb;
  vec2 rr = (uv - restRect.xy) / max(restRect.zw - restRect.xy, vec2(1e-6));
  vec2 e = min(rr, 1.0 - rr);
  float w = hasRest * smoothstep(0.0, restFeather, min(e.x, e.y));
  vec3 r = texture2D(mapRest, clamp(rr, 0.0, 1.0)).rgb;
  return mix(p, r, w);
}`;

const SHELL_VERT = /* glsl */`
uniform mat4 padProj;
varying vec2 vUv;
varying vec4 vProj;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vProj = padProj * wp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// texture2D on an sRGB texture returns LINEAR light; the dot with the
// normalized weights stays in linear; colorspace_fragment encodes it with the
// renderer's outputColorSpace (SRGB). No tone mapping anywhere on the shell:
// the beauty already carries AgX. uvAttr = 1 selects the TEXCOORD_0 fallback
// (a uniform, not a define, so both paths live in ONE program).
const SHELL_FRAG = /* glsl */`
uniform sampler2D map;
uniform vec3 weights;
uniform float lift;
uniform float gain;
// mix.exposure: a flat multiply on the baked luminance BEFORE the contrast op — the post-bake dimmer.
// (contrast's pivot can also darken, but pivot is clamped to [0,1] so its reach shrinks as contrast -> 1.)
uniform float exposure;
uniform float uvAttr;
// Water ripple (registry key water, software): while the water mesh draws (waterMode 1) the projected
// lookup is displaced by the gradient of two drifting value-noise fields in world metres, scaled by
// 1/depth so a ripple keeps its physical size — the baked reflections and glitter slide like water.
uniform float waterMode;
uniform float time;
uniform float rippleAmp;      // padded-uv units at rippleRef metres
uniform float rippleScale;    // features per metre
uniform float rippleRef;      // reference depth (m) for the amplitude
uniform vec2 rippleVel;       // metres per second, layer 1 (layer 2 drifts at 1.3× across)
uniform float rippleGlint;    // luminance modulation by the ripple slope (moving shading on the sheet; 'displace' mode)
uniform float waterReflect;   // 1 = 'reflect' mode: mirror the room off a drifting ripple normal (Blender's animated bump, live)
uniform float waterBump;      // ripple normal strength (slope multiplier)
uniform float waterF0;        // Fresnel at normal incidence ((ior-1)/(ior+1))^2
uniform float waterBase;      // the dark water body (linear), what shows where the reflection is weak
uniform vec3 roomMin;         // the room interior box (world, three.js Y-up) the reflected ray is intersected with
uniform vec3 roomMax;
uniform mat4 padProj;         // the padded camera's projection·view (also used by the vertex stage), for the reflected point
uniform float waterLod;       // mip level the reflection samples at: the glossy roughness of the render (0.04) as a blur
varying vec2 vUv;
varying vec4 vProj;
varying vec3 vWorld;
// sine-free lattice hash (Hoskins): the classic fract(sin(x)*43758.5) loses precision at large x on Apple GPUs
// through Chrome's Metal backend and the noise freezes or steps; the lattice is wrapped at 1024 cells so the
// inputs stay small however long the page runs.
float hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise2(vec2 p) {
  vec2 i = mod(floor(p), 1024.0), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec2 rippleSlope(vec2 xz, float t) {
  vec2 p1 = xz * rippleScale + rippleVel * t;
  vec2 p2 = xz * rippleScale * 1.9 - rippleVel.yx * t * 1.3 + vec2(17.3, 5.1);
  float e = 0.12;
  vec2 g1 = vec2(vnoise2(p1 + vec2(e, 0.0)) - vnoise2(p1 - vec2(e, 0.0)), vnoise2(p1 + vec2(0.0, e)) - vnoise2(p1 - vec2(0.0, e)));
  vec2 g2 = vec2(vnoise2(p2 + vec2(e, 0.0)) - vnoise2(p2 - vec2(e, 0.0)), vnoise2(p2 + vec2(0.0, e)) - vnoise2(p2 - vec2(0.0, e)));
  return g1 + 0.5 * g2;
}
// Water, mode 'material': LIVE port of M_bs_software_water (Software.blend 2026-09-17T23:06:02, the
// baked file). Needs WebGL2 / #version 300 es with 'precision highp int' (32-bit uint) -- three.js
// r180 emits both for a highp ShaderMaterial. Three.js world = Blender (x, z, -y). The sheet is the
// plane three y = 0.21 = Blender object z = 0. Sept 18: the height field is 'layers4d' by default (registry
// water.field; its Blender twin is 3Ds/Scenes/Software/_work/Software_water_variation.blend, built by
// 3Ds/scripts/make_water_tree.py; _ab.blend = the FIELD-switch form); 'fbm3d' = the Sept 17 tree.
uniform float skyWhite;        // 1 while the sky carrier draws with registry sky.override 'white': the opening is painted pure white
uniform float waterMaterial;   // 1 = this branch; waterReflect ('reflect') and 'displace' stay as fallbacks
uniform float loopU;           // chain A: loop phase in [0,1) = (((t % loop_s) + loop_s) % loop_s) / loop_s, CPU double; 0 under reduced motion
uniform float waterScale;      // Noise Texture Scale 6 (lattice cells per metre)
uniform float waterDetail;     // Noise Detail 2 -> octaves i = 0..int(detail) (3); a fraction blends one more
uniform float waterRough;      // Noise Roughness 0.6 (kernel clamps >= 0 only)
uniform float waterLacun;      // Noise Lacunarity 2
uniform float waterTravel;     // chain B: 0.6 m of lookup offset per loop along Blender +Y (= three -Z)
uniform float bumpStrength;    // Bump Strength 0.16
uniform float bumpDistance;    // Bump Distance 0.08 (metres per unit Fac: D*h is the physical height, 6 mm std)
uniform float bumpInvert;      // Bump Invert off = 0 (1 negates Distance)
uniform float waterIor;        // Principled IOR 1.8 (Specular IOR Level 0.5 -> exact dielectric Fresnel, F0 0.0816)
uniform float waterGloss;      // Principled Roughness 0.06 -> GGX alpha = r^2 = 0.0036, lobe 2*alpha = 0.0072 rad
uniform float waterAlpha;      // Principled Alpha 0.5: the camera ray continues straight to the floor with weight 0.5
uniform float waterBody;       // Principled Base Color 0.00077 (linear); the diffuse body, ~0
uniform vec4  stripRect;       // the 5 cm slit the camera sees: x plane -4.78, y centre 2.0, half height 0.025, half width (z) 2.5
uniform vec4  stripCore;       // bs_software_light_env (camera-invisible, glossy-visible): x plane -4.75, y 2.0, half h 0.005, half w 2.25
uniform vec2  stripL;          // look-space radiance of slit and lamp core in bake-white units (3, 60); NOT physics (2.8 / 424 W/sr/m2)
uniform float stripSpread;     // footprint multiplier of the box AA (2 = the render's 1.5 px Blackman-Harris + OIDN spread); radiance x spread keeps the arc energy
uniform float reflectGain;     // fog transmittance on the reflected path (0.8); retune while plateCap < 1 (the plate still holds the static wall reflection)
uniform float reflectLodBias;  // added to the per-fragment glossy lod (0)
uniform float restLodBias;     // log2(rest texels / padded texels) = log2(7680 / 3636) = 1.08
uniform float plateCap;        // stopgap: per-channel cap on the baked water pixel (0.09 linear ~ 0.33 sRGB) until the Is-Camera-Ray plate bake; 1.0 = off
// -- field 'layers4d' (Sept 18; Eric: "it just looks like a png flowing from right to left"): three single-octave 4D
//    Noise layers, each sampled on a circle in (z, W) (in-place morph, closes exactly on the loop) and drifted by a
//    per-layer cos/sin crossfade of two copies D_k cells apart (variance-preserving). Every value below is a pure
//    function of loopU, computed on the CPU in double (updateLayers4d). waterFieldMode 0 keeps the Sept 17 fbm3d field.
uniform float waterFieldMode;  // 0 = fbm3d (chains B-D, the Sept 17 field), 1 = layers4d
uniform float wScale[3];       // s_k: lattice cells per metre (6, 12, 24)
uniform float wAmp[3];         // G * a_k / sum(a): weight of (Fac_k - 0.5) in h; 0 skips the layer (its 32 hashes)
uniform vec2  wOffA[3];        // copy A lattice offset D_k u_k e_k          (D_k = travel_m_k * s_k, e_k = Blender +Y rotated by spread_k)
uniform vec2  wOffB[3];        // copy B lattice offset D_k (u_k - 1) e_k
uniform vec2  wFade[3];        // (cos(pi u_k / 2), sin(pi u_k / 2)): variance-preserving crossfade weights
uniform vec4  wZW[3];          // (floor z_k, floor w_k, fract z_k, fract w_k): the (z, W) circle point of layer k
uniform vec4  wWt[3];          // quad_mix weights over the (Z, W) corners: ((1-t)(1-s), t(1-s), (1-t)s, ts), t = fade(fz), s = fade(fw)

// -- Cycles 5.2 Perlin (util/hash.h hash_uint3 = Jenkins lookup3 'final', kernel/svm/noise.h perlin_3d)
//    reduced to the z = 0 lattice slice: on the sheet the Object z is exactly 0, fade(0) = 0 kills the
//    Z+1 corners and the z part of grad3, so four hashes reproduce the 3D node bit-for-bit.
uint bl_rotl(uint x, uint k) { return (x << k) | (x >> (32u - k)); }
uint bl_u(int i) { return (i < 0) ? (0u - uint(-i)) : uint(i); }     // (uint)int two's-complement wrap, driver-independent
uint bl_hash3(uint kx, uint ky, uint kz) {
  uint a = 0xdeadbf08u, b = 0xdeadbf08u, c = 0xdeadbf08u;               // 0xdeadbeef + (3 << 2) + 13
  c += kz; b += ky; a += kx;
  c ^= b; c -= bl_rotl(b, 14u);
  a ^= c; a -= bl_rotl(c, 11u);
  b ^= a; b -= bl_rotl(a, 25u);
  c ^= b; c -= bl_rotl(b, 16u);
  a ^= c; a -= bl_rotl(c, 4u);
  b ^= a; b -= bl_rotl(a, 14u);
  c ^= b; c -= bl_rotl(b, 24u);
  return c;
}
// grad3(hash & 15): u = h<8 ? x : y ; v = h<4 ? y : (h==12||h==14 ? x : z) ; +-u +-v by bits 0/1. z-part = 0 on the slice.
vec2 bl_grad3xy(uint hash) {
  uint h = hash & 15u;
  vec2 gu = (h < 8u) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 gv = (h < 4u) ? vec2(0.0, 1.0) : ((h == 12u || h == 14u) ? vec2(1.0, 0.0) : vec2(0.0));
  return (((h & 1u) != 0u) ? -gu : gu) + (((h & 2u) != 0u) ? -gv : gv);
}
// perlin_3d(p.x, p.y, 0) before the 0.9820 scale: .x value, .yz analytic d/dp (p in lattice units)
vec3 bl_perlin2(vec2 p) {
  vec2 pf = floor(p), f = p - pf;
  int X = int(pf.x), Y = int(pf.y);
  vec2 g00 = bl_grad3xy(bl_hash3(bl_u(X),     bl_u(Y),     0u));
  vec2 g10 = bl_grad3xy(bl_hash3(bl_u(X + 1), bl_u(Y),     0u));
  vec2 g01 = bl_grad3xy(bl_hash3(bl_u(X),     bl_u(Y + 1), 0u));
  vec2 g11 = bl_grad3xy(bl_hash3(bl_u(X + 1), bl_u(Y + 1), 0u));
  float a = dot(g00, f), b = dot(g10, f - vec2(1.0, 0.0)), c = dot(g01, f - vec2(0.0, 1.0)), d = dot(g11, f - 1.0);
  vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);              // fade 6t^5 - 15t^4 + 10t^3
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);                    // fade' = 30t^2(t - 1)^2
  float k0 = b - a, k1 = c - a, k2 = a - b - c + d;
  float n = a + u.x * k0 + u.y * k1 + u.x * u.y * k2;                // tri_mix at w = 0
  vec2 dg = g00 + u.x * (g10 - g00) + u.y * (g01 - g00) + u.x * u.y * (g00 - g10 - g01 + g11);
  vec2 dn = dg + vec2(du.x * (k0 + u.y * k2), du.y * (k1 + u.x * k2));
  return vec3(n, dn);
}
// Noise Texture node (3D, fBM, Normalize on, Distortion 0), Fac output, on the slice: .x Fac in [0,1],
// .yz dFac/dVector per METRE (Vector = Object coords). kernel/svm/fractal_noise.h noise_fbm +
// noisetex.h clamps: detail [0,15], roughness >= 0 (no upper clamp -- V1/V2 correction).
vec3 bl_noise2(vec2 vector, float scale, float detail, float roughness, float lacunarity) {
  detail = clamp(detail, 0.0, 15.0); roughness = max(roughness, 0.0);
  vec2 p = vector * scale;
  float fscale = 1.0, amp = 1.0, maxamp = 0.0; vec3 sum = vec3(0.0);
  int n = int(detail);                                               // float_to_int: truncation
  for (int i = 0; i < 16; i++) {
    if (i > n) break;
    vec3 t = bl_perlin2(fscale * p) * 0.9820;                        // snoise_3d = noise_scale3 * perlin_3d
    t.yz *= fscale;
    sum += t * amp; maxamp += amp; amp *= roughness; fscale *= lacunarity;
  }
  vec3 fac = vec3(0.5 * sum.x / maxamp + 0.5, 0.5 * sum.yz / maxamp);
  float rmd = detail - floor(detail);
  if (rmd > 0.0) {                                                   // fractional detail blends ONE extra octave
    vec3 t = bl_perlin2(fscale * p) * 0.9820; t.yz *= fscale;
    vec3 sum2 = sum + t * amp; float ma2 = maxamp + amp;
    fac = mix(fac, vec3(0.5 * sum2.x / ma2 + 0.5, 0.5 * sum2.yz / ma2), rmd);
  }
  fac.yz *= scale;                                                   // d/dp -> d/dmetre
  return fac;
}
// -- Cycles 5.2 4D Perlin for the layers4d field. util/hash.h hash_uint4 (lookup3 mix + final):
//    a = b = c = 0xdeadbeef + (4 << 2) + 13; a += kx; b += ky; c += kz; mix(a, b, c); a += kw; final(a, b, c); return c.
uint bl_hash4(uint kx, uint ky, uint kz, uint kw) {
  uint a = 0xdeadbf0cu, b = 0xdeadbf0cu, c = 0xdeadbf0cu;
  a += kx; b += ky; c += kz;
  a -= c; a ^= bl_rotl(c, 4u);  c += b;                 // mix(a, b, c)
  b -= a; b ^= bl_rotl(a, 6u);  a += c;
  c -= b; c ^= bl_rotl(b, 8u);  b += a;
  a -= c; a ^= bl_rotl(c, 16u); c += b;
  b -= a; b ^= bl_rotl(a, 19u); a += c;
  c -= b; c ^= bl_rotl(b, 4u);  b += a;
  a += kw;
  c ^= b; c -= bl_rotl(b, 14u);                         // final(a, b, c)
  a ^= c; a -= bl_rotl(c, 11u);
  b ^= a; b -= bl_rotl(a, 25u);
  c ^= b; c -= bl_rotl(b, 16u);
  a ^= c; a -= bl_rotl(c, 4u);
  b ^= a; b -= bl_rotl(a, 14u);
  c ^= b; c -= bl_rotl(b, 24u);
  return c;
}
// kernel/svm/noise.h grad4: h = hash & 31; u = h < 24 ? x : y; v = h < 16 ? y : z; s = h < 8 ? z : w;
// negate_if(u, h & 1) + negate_if(v, h & 2) + negate_if(s, h & 4). Linear in (x, y, z, w): returned as
// (coefficient of x, coefficient of y, the z/w part at this corner's offsets dz, dw).
vec3 bl_grad4s(uint hash, float dz, float dw) {
  uint h = hash & 31u;
  float s0 = ((h & 1u) != 0u) ? -1.0 : 1.0;
  float s1 = ((h & 2u) != 0u) ? -1.0 : 1.0;
  float s2 = ((h & 4u) != 0u) ? -1.0 : 1.0;
  vec4 g = vec4(0.0);
  if (h < 24u) g.x += s0; else g.y += s0;
  if (h < 16u) g.y += s1; else g.z += s1;
  if (h < 8u)  g.z += s2; else g.w += s2;
  return vec3(g.x, g.y, g.z * dz + g.w * dw);
}
// One (X, Y) lattice column of layer k, pre-mixed over its four (Z, W) corners with the per-frame quad_mix weights.
// Exact: grad4 is linear in its offsets and quad_mix is multilinear, so the 16-corner perlin_4d collapses to a
// 4-corner bilinear form (coef x, coef y, constant) whose x/y derivative is the bl_perlin2 algebra.
vec3 bl_corner4(int X, int Y, int k) {
  uint x = bl_u(X), y = bl_u(Y), z = bl_u(int(wZW[k].x)), w = bl_u(int(wZW[k].y));
  float fz = wZW[k].z, fw = wZW[k].w;
  vec4 W = wWt[k];
  return W.x * bl_grad4s(bl_hash4(x, y, z,      w),      fz,       fw)
       + W.y * bl_grad4s(bl_hash4(x, y, z + 1u, w),      fz - 1.0, fw)
       + W.z * bl_grad4s(bl_hash4(x, y, z,      w + 1u), fz,       fw - 1.0)
       + W.w * bl_grad4s(bl_hash4(x, y, z + 1u, w + 1u), fz - 1.0, fw - 1.0);
}
// perlin_4d(p.x, p.y, z_k, w_k) before the 0.8344 scale: .x value, .yz analytic d/dp (lattice units).
vec3 bl_perlin4s(vec2 p, int k) {
  vec2 pf = floor(p), f = p - pf;
  int X = int(pf.x), Y = int(pf.y);
  vec3 c00 = bl_corner4(X, Y, k), c10 = bl_corner4(X + 1, Y, k), c01 = bl_corner4(X, Y + 1, k), c11 = bl_corner4(X + 1, Y + 1, k);
  float a = dot(c00.xy, f) + c00.z;
  float b = dot(c10.xy, f - vec2(1.0, 0.0)) + c10.z;
  float c = dot(c01.xy, f - vec2(0.0, 1.0)) + c01.z;
  float d = dot(c11.xy, f - 1.0) + c11.z;
  vec2 u  = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);          // fade
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);                // fade'
  float k0 = b - a, k1 = c - a, k2 = a - b - c + d;
  float n = a + u.x * k0 + u.y * k1 + u.x * u.y * k2;            // bi_mix
  vec2 dg = c00.xy + u.x * (c10.xy - c00.xy) + u.y * (c01.xy - c00.xy) + u.x * u.y * (c00.xy - c10.xy - c01.xy + c11.xy);
  vec2 dn = dg + vec2(du.x * (k0 + u.y * k2), du.y * (k1 + u.x * k2));
  return vec3(n, dn);
}
// layers4d: h = 0.5 + sum_k wAmp[k] * (cos(pi u_k/2) (FacA_k - 0.5) + sin(pi u_k/2) (FacB_k - 0.5)),
// Fac = 0.5 * 0.8344 * perlin_4d + 0.5 (Noise Texture 4D, Scale 1, Detail 0, Normalize on). Returns (h, dh/dxb, dh/dyb) per metre.
vec3 waterFieldLayers(vec2 Pb) {
  vec3 h = vec3(0.5, 0.0, 0.0);
  for (int k = 0; k < 3; k++) {
    if (wAmp[k] == 0.0) continue;
    vec2 p = Pb * wScale[k];                                       // Vector Math Scale(P, s_k), then ...
    vec3 A = bl_perlin4s(p + wOffA[k], k);                         // ... Add(Combine XYZ(offA e, z_k)); Noise 4D Scale 1, W = w_k
    vec3 B = bl_perlin4s(p + wOffB[k], k);
    vec3 L = (wFade[k].x * A + wFade[k].y * B) * (0.5 * 0.8344);   // (Fac - 0.5) and d/dp
    L.yz *= wScale[k];                                             // d/dp -> d/dmetre
    h += wAmp[k] * L;
  }
  return h;
}
// Field 'fbm3d' = chains B + D of the Sept 17 tree (kept live for A/B). Pb = Blender object (x, y) = (three.x, -three.z).
// h = Mix(Float, factor u clamped)(Fac(Pb + 0.6u*Y), Fac(Pb + 0.6(u-1)*Y)); h(u=0) == h(u=1): a seamless loop.
vec3 waterFieldFbm3d(vec2 Pb, float u) {
  u = clamp(u, 0.0, 1.0);
  vec3 a = bl_noise2(Pb + vec2(0.0, waterTravel * u),         waterScale, waterDetail, waterRough, waterLacun);
  vec3 b = bl_noise2(Pb + vec2(0.0, waterTravel * (u - 1.0)), waterScale, waterDetail, waterRough, waterLacun);
  return mix(a, b, u);
}
// The height field the bump reads: registry water.field selects layers4d (default since Sept 18) or fbm3d.
// Returns (h, dh/dxb, dh/dyb) per metre in either case.
vec3 waterField(vec2 Pb, float u) {
  if (waterFieldMode > 0.5) return waterFieldLayers(Pb);
  return waterFieldFbm3d(Pb, u);
}
// Cycles Bump (kernel/svm/displace.h svm_node_set_bump) on a flat sheet: N' = normalize(N - Distance*grad h),
// then N'' = normalize(Strength*N' + (1 - Strength)*N); Invert negates Distance; Filter Width cancels
// (the forward-difference gradient over 0.1 px is the analytic gradient to < 1 % on the sheet).
vec3 cyclesBump(vec3 N, vec3 gradH, float dist, float strength, float invert) {
  float D = mix(dist, -dist, step(0.5, invert));
  float S = max(strength, 0.0);
  vec3 nb = normalize(N - D * gradH);
  return normalize(S * nb + (1.0 - S) * N);
}
// ensure_valid_specular_reflection (bump_map_correction on in the file), reduced: lift R above the sheet
// to Cycles' threshold min(0.9*cos(theta), 0.01) instead of rotating N.
vec3 validReflect(vec3 v, vec3 n, vec3 Ng) {
  vec3 r = reflect(v, n);
  float thr = min(0.9 * dot(-v, Ng), 0.01);
  float rz = dot(r, Ng);
  if (rz < thr) r = normalize(r - Ng * rz + Ng * thr);
  return r;
}
// Exact unpolarised dielectric Fresnel (Cycles fresnel_dielectric_cos), eta = IOR from air.
float fresnelDielectric(float cosI, float eta) {
  cosI = clamp(cosI, 0.0, 1.0);
  float sinT2 = (1.0 - cosI * cosI) / (eta * eta);
  float cosT = sqrt(max(1.0 - sinT2, 0.0));
  float rs = (cosI - eta * cosT) / (cosI + eta * cosT);
  float rp = (eta * cosI - cosT) / (eta * cosI + cosT);
  return 0.5 * (rs * rs + rp * rp);
}
// Energy-preserving box coverage of a slit of half-height hh over a footprint fw centred at distance dy
// (V5/V6 correction of the dilating smoothstep): -> step when fw -> 0, -> 2hh/fw when fw >> hh.
float boxCov(float hh, float dy, float fw) {
  float lo = max(-hh, dy - 0.5 * fw), hi = min(hh, dy + 0.5 * fw);
  return max(hi - lo, 0.0) / max(fw, 1e-5);
}
${PROJ_CHUNK}
// beautyRGB with an explicit mip on both layers (the rest layer carries 2.11x the texels -> its lod is biased).
vec3 beautyLod(vec2 uv, float lod) {
  vec3 p = textureLod(map, uv, lod).rgb;
  vec2 rr = (uv - restRect.xy) / max(restRect.zw - restRect.xy, vec2(1e-6));
  vec2 e = min(rr, 1.0 - rr);
  float w = hasRest * smoothstep(0.0, restFeather, min(e.x, e.y));
  vec3 r = textureLod(mapRest, clamp(rr, 0.0, 1.0), lod + restLodBias).rgb;
  return mix(p, r, w);
}

// The three phases differ only where the fog differs (RMS ≈ 0.009 at 1920/128),
// so a plain mix breathes by about one 8-bit step. gain scales the mix's
// departure from the phases' static MEAN: the walls (identical in all three)
// stay put, the haze breathes gain× harder, and the time-average stays the
// Cycles mean. gain = 1 is the plain R-A mix.
float mixY(vec3 p, vec3 w, float g) {
  float m = dot(p, vec3(1.0 / 3.0));
  return max(m + g * (dot(p, w) - m), 0.0);
}
void main() {
  if (skyWhite > 0.5) { gl_FragColor = vec4(1.0); return; }
  float inside;
  vec2 uvP = projUV(vProj, inside);
  vec2 uv = mix(uvP, vUv, uvAttr);
  inside = mix(inside, 1.0, uvAttr);
  float y;
  if (waterMode > 0.5 && waterMaterial > 0.5) {
    // -- (1) height field + Cycles bump, in Blender object coords: three (x, y, z) -> Blender (x, -z, y - 0.21); z_obj = 0 on the sheet
    vec2 Pb = vec2(vWorld.x, -vWorld.z);
    vec3 hf = waterField(Pb, loopU);                                  // hf.x = h (Fac), hf.yz = grad h per metre (Blender xb, yb)
    vec3 N  = vec3(0.0, 1.0, 0.0);
    vec3 n  = cyclesBump(N, vec3(hf.y, 0.0, -hf.z), bumpDistance, bumpStrength, bumpInvert);   // d/dz_three = -d/dy_blender
    vec3 v  = normalize(vWorld - cameraPosition);
    vec3 r  = validReflect(v, n, N);

    // -- (2) the light strip as an analytic emitter, OUTSIDE any branch (fwidth needs uniform control flow)
    float toward = step(r.x, -1e-5);                                  // the ray heads to the back wall
    float rx = min(r.x, -1e-4);                                       // finite divisor
    float lobeW = 2.0 * waterGloss * waterGloss;                      // GGX 2*alpha = 0.0072 rad (roughness 0.06)
    float tS = min((stripRect.x - vWorld.x) / rx, 100.0);             // slit plane x = -4.78
    float tC = min((stripCore.x - vWorld.x) / rx, 100.0);             // lamp plane x = -4.75 (1 cm proud of the slabs)
    vec3 H  = vWorld + r * tS;
    vec3 Hc = vWorld + r * tC;
    float fwS = stripSpread * fwidth(H.y)  + lobeW * tS;              // fragment footprint on the wall + the lobe
    float fwC = stripSpread * fwidth(Hc.y) + lobeW * tC;
    float slit = boxCov(stripRect.z, abs(H.y  - stripRect.y), fwS) * step(abs(H.z),  stripRect.w);
    float core = boxCov(stripCore.z, abs(Hc.y - stripCore.y), fwC) * step(abs(Hc.z), stripCore.w);
    float Lstrip = stripSpread * (slit * stripL.x + core * stripL.y) * toward;

    // -- (3) the room off the ray-box, glossy: per-fragment lod from the 2*alpha footprint projected through padProj,
    //        three mip boxes (widths 1.6, 6, 30 x 2*alpha; weights 0.508/0.431/0.061) fitted to the GGX 1D marginal
    vec3 tA = (roomMin - vWorld) / r, tB = (roomMax - vWorld) / r;
    vec3 tFar = max(tA, tB);
    float tHit = max(min(min(tFar.x, tFar.y), tFar.z), 0.0);
    vec3 Q = vWorld + r * tHit;
    float insQ;
    vec2 uvQ = projUV(padProj * vec4(Q, 1.0), insQ);
    vec3 e1 = cross(r, N); e1 = (dot(e1, e1) > 1e-8) ? normalize(e1) : vec3(1.0, 0.0, 0.0);
    vec3 e2 = cross(e1, r);                                           // in the incidence plane
    float insD;
    vec2 uvV = projUV(padProj * vec4(vWorld + normalize(r + e2 * lobeW) * tHit, 1.0), insD);
    vec2 uvH = projUV(padProj * vec4(vWorld + normalize(r + e1 * lobeW * clamp(dot(-v, N), 0.0, 1.0)) * tHit, 1.0), insD);
    vec2 texPx = vec2(textureSize(map, 0));
    float refPx = max(length((uvV - uvQ) * texPx), length((uvH - uvQ) * texPx));
    float lod0 = log2(max(refPx, 1e-3)) + reflectLodBias;
    float yr = (0.508 * mixY(beautyLod(uvQ, lod0 + 0.678), weights, gain)
              + 0.431 * mixY(beautyLod(uvQ, lod0 + 2.585), weights, gain)
              + 0.061 * mixY(beautyLod(uvQ, lod0 + 4.907), weights, gain)) * insQ;

    // -- (4) Fresnel (exact dielectric, IOR 1.8) and the Principled alpha 0.5 split
    float F = fresnelDielectric(dot(-v, n), waterIor);
    float live = waterAlpha * (F * reflectGain * (yr + Lstrip) + (1.0 - F) * waterBody);

    // -- (5) the plate: the sheet's OWN baked pixel -- fog in front of the sheet, the 50 % floor-through and the black
    //        body, breathing with the room's phases (gain override 1 while plateCap < 1). plateCap clips the baked
    //        static glitter per channel before the phase mix until the Is-Camera-Ray plate bake lands.
    vec3 p3 = min(beautyRGB(map, uv), vec3(plateCap));
    float base = mixY(p3, weights, gain);

    // -- (6) composite: exact at live = 0, monotone, saturates smoothly to white like the render's AgX arcs
    float yw = 1.0 - (1.0 - base) * exp(-live);
    y = grain(applyContrast(yw * (1.0 + lift) * exposure)) * inside;
  } else if (waterMode > 0.5 && waterReflect > 0.5) {

    // Live planar reflection: the view ray mirrored off the rippled normal, intersected with the room
    // box, and the baked room sampled there (with the live fog phases). Fresnel weights it against the
    // dark water body — far water reflects strongly, near water shows its darkness, as in the render.
    vec2 slope = rippleSlope(vWorld.xz, time);
    vec3 n = normalize(vec3(-slope.x * waterBump, 1.0, -slope.y * waterBump));
    vec3 v = normalize(vWorld - cameraPosition);
    vec3 r = reflect(v, n);
    r.y = max(r.y, 0.03);                                     // never back into the floor
    vec3 tA = (roomMin - vWorld) / r, tB = (roomMax - vWorld) / r;
    vec3 tFar = max(tA, tB);
    float tHit = max(min(min(tFar.x, tFar.y), tFar.z), 0.0);
    vec3 Q = vWorld + r * tHit;
    float insQ;
    vec2 uvQ = projUV(padProj * vec4(Q, 1.0), insQ);
    // a glossy (not mirror) reflection: the padded beauty at a coarser mip spreads the strip into the soft band
    // the render shows, always present and rolling with the ripples, instead of sparse mirror-angle glints
    float yr = mixY(textureLod(map, uvQ, waterLod).rgb, weights, gain) * insQ;
    float c = clamp(dot(-v, n), 0.0, 1.0);
    float F = waterF0 + (1.0 - waterF0) * pow(1.0 - c, 5.0);
    y = grain(applyContrast((F * yr + (1.0 - F) * waterBase) * (1.0 + lift) * exposure)) * inside;
  } else {
    float glintMul = 1.0;
    if (waterMode > 0.5) {
      vec2 slope = rippleSlope(vWorld.xz, time);
      uv += slope * rippleAmp * (rippleRef / max(vProj.w, 0.5));
      glintMul = 1.0 + rippleGlint * clamp((slope.x + slope.y) * 2.5, -1.0, 1.0);
    }
    vec3 p = mix(beautyRGB(map, uv), texture2D(map, uv).rgb, uvAttr);   // the attribute fallback stays single-texture
    y = grain(applyContrast(mixY(p, weights, gain) * (1.0 + lift) * exposure)) * inside * glintMul;
  }
  gl_FragColor = vec4(vec3(y), 1.0);
  #include <colorspace_fragment>
}`;

// Panel: the baked OFF panel (projected beauty, same weights + lift, so it is
// continuous with the shell around it) crossfaded in LINEAR light with the
// content quad (its own TEXCOORD_0) by moodMask = mood × hasContent. At mood 0
// the panel is exactly the bake; at mood 1 with content bound it is exactly
// content × tint.
const PANEL_VERT = SHELL_VERT;
const PANEL_FRAG = /* glsl */`
uniform sampler2D map;
uniform sampler2D content;
uniform vec3 weights;
uniform float lift;
uniform float gain;
// mix.exposure: a flat multiply on the baked luminance BEFORE the contrast op — the post-bake dimmer.
// (contrast's pivot can also darken, but pivot is clamped to [0,1] so its reach shrinks as contrast -> 1.)
uniform float exposure;
uniform vec3 moodColor;
uniform float moodMask;
varying vec2 vUv;
varying vec4 vProj;
${PROJ_CHUNK}
float mixY(vec3 p, vec3 w, float g) {
  float m = dot(p, vec3(1.0 / 3.0));
  return max(m + g * (dot(p, w) - m), 0.0);
}
void main() {
  float inside;
  vec2 uvP = projUV(vProj, inside);
  float y = applyContrast(mixY(beautyRGB(map, uvP), weights, gain) * (1.0 + lift) * exposure) * inside;
  vec3 c = texture2D(content, vUv).rgb * moodColor;
  vec3 col = mix(vec3(y), c, moodMask);
  col *= grain(0.5) * 2.0;      // the same cell noise over content and bake alike: grain(0.5)/0.5 = 1 + 2·amount·h (a mid-tone factor)
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// Motes. Positions are kept in BLENDER space (Z-up) so the authored formula
// reads verbatim; the Y-up conversion (x, z, -y) happens after displacement,
// matching the glTF exporter's convention that placed the camera node. When
// the homes come from the GLB (already Y-up) they are converted back once on
// the CPU, so this shader has one path whatever the source.
// ── floor fog (runtime, post-bake) ───────────────────────────────────────
// A thin VOLUME above the floor, raymarched in the fragment shader: the box
// mesh only provides the pixels, the march is analytic inside the slab's world
// box, so it is world-locked under the drag-look for free and there are no
// sheets to collapse into streaks when seen edge-on from the 1 m camera. The
// fog is LIT BY THE BAKE: every march sample reads the beauty through the
// padded projection (the motes' beauty gate) and only lit fog contributes, so
// it glows in the pool and vanishes in the dark corners — what welds it to the
// render. Density = 2-octave drifting value-noise × exp(-h / height_m).
const FOG_VERT = /* glsl */`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FOG_FRAG = /* glsl */`
precision highp float;
varying vec3 vWorld;
uniform vec3 slabMin;        // world box of the slab (floor top .. floor top + spread_m, room extent)
uniform vec3 slabMax;
uniform float time;
uniform float density;       // extinction per metre at the floor, inside a wisp
uniform float heightM;       // exp falloff scale height (m)
uniform float scaleM;        // metres per noise cell
uniform float speed;         // drift, m/s
uniform float threshold;     // carves GAPS between billows: below it the field is empty
uniform float soften;        // width of the threshold ramp (small = hard-edged puffs)
uniform float backBias;      // 0 = even across the room, 1 = fog only against the back wall
uniform float nearFade;      // metres of clear floor in front of the camera
uniform float litGain;       // 0 = ignore the bake, 1 = fully gated by it
uniform vec2  gate;          // smoothstep(lo, hi) on the baked luminance
uniform vec3  fogColor;
uniform mat4 padProj;
uniform sampler2D map;
uniform vec3 weights;
float hash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
                 mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                 mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Turbulence (fBm of |signed noise|): creases at the bottom, ROUNDED lobes on top —
// the shape of a billowing cloud. Plain value-noise fBm gives a smooth haze instead.
float billow(vec3 p) {
  float a = 0.5, f = 1.0, sum = 0.0, norm = 0.0;
  for (int i = 0; i < 4; i++) {
    sum += a * abs(2.0 * vnoise(p * f) - 1.0);
    norm += a; f *= 2.07; a *= 0.55;
  }
  return 1.0 - sum / norm;                       // ~1 in the puff cores, ~0 in the creases
}
float fogAt(vec3 p, float t) {
  float h = (p.y - slabMin.y);
  float top = (slabMax.y - slabMin.y);
  float prof = exp(-h / max(heightM, 0.01)) * (1.0 - smoothstep(0.55 * top, top, h));
  // Against the back wall, clear in front of the camera: the reference pools the
  // fog at the wall base and leaves the near floor readable.
  float backness = clamp((slabMax.x - p.x) / max(slabMax.x - slabMin.x, 1e-3), 0.0, 1.0);
  prof *= mix(1.0, smoothstep(0.15, 0.85, backness), clamp(backBias, 0.0, 1.0));
  prof *= smoothstep(0.0, max(nearFade, 1e-3), distance(p.xz, cameraPosition.xz));
  vec3 q = p / max(scaleM, 0.01);
  float b = billow(q + vec3(t, 0.13 * t, 0.37 * t));
  // The threshold is what separates billows: without it the field is a continuous haze.
  float n = smoothstep(threshold, threshold + max(soften, 0.01), b);
  return density * n * prof;
}
float litAt(vec3 p) {
  vec4 clip = padProj * vec4(p, 1.0);
  vec2 ndc = clip.xy / max(clip.w, 1e-4);
  vec2 uvB = vec2(0.5 + 0.5 * ndc.x, 0.5 - 0.5 * ndc.y);
  float inside = step(0.0, uvB.x) * step(uvB.x, 1.0) * step(0.0, uvB.y) * step(uvB.y, 1.0) * step(0.0, clip.w);
  float luma = dot(textureLod(map, clamp(uvB, 0.0, 1.0), 2.0).rgb, weights);
  return mix(1.0, smoothstep(gate.x, gate.y, luma), clamp(litGain, 0.0, 1.0)) * inside;
}
void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - ro);
  // ray / slab box (the camera may sit inside the box: tEnter clamps to 0)
  vec3 inv = 1.0 / rd;
  vec3 t0 = (slabMin - ro) * inv, t1 = (slabMax - ro) * inv;
  vec3 tmn = min(t0, t1), tmx = max(t0, t1);
  float tEnter = max(max(max(tmn.x, tmn.y), tmn.z), 0.0);
  float tExit = min(min(tmx.x, tmx.y), tmx.z);
  if (tExit <= tEnter) discard;
  float dt = (tExit - tEnter) / float(STEPS);
  float t = time * speed / max(scaleM, 0.01);
  float T = 1.0;
  float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);   // per-pixel offset hides the step planes
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * (tEnter + (float(i) + jitter) * dt);
    float d = fogAt(p, t) * litAt(p) * dt;
    T *= exp(-d);
  }
  float a = clamp(1.0 - T, 0.0, 1.0);
  if (a <= 0.002) discard;
  gl_FragColor = vec4(fogColor, a);
  #include <colorspace_fragment>
}`;

const MOTE_VERT = /* glsl */`
attribute vec3 home;
attribute float jitter;
uniform float time;
uniform float period;
uniform float amplitude;
uniform float noiseScale;
uniform float circleRadius;
uniform float sizePx;
uniform float dpr;
uniform float attenRef;
uniform float maxScale;      // cap: a mote is never larger than maxScale × its nominal size (near-camera blow-up)
uniform vec2 gate;           // beauty-gate luminance thresholds (smoothstep lo→hi)
uniform mat4 padProj;
uniform sampler2D map;
uniform vec3 weights;
uniform float alpha;
varying float vAlpha;

float hash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash3(i), n100 = hash3(i + vec3(1,0,0));
  float n010 = hash3(i + vec3(0,1,0)), n110 = hash3(i + vec3(1,1,0));
  float n001 = hash3(i + vec3(0,0,1)), n101 = hash3(i + vec3(1,0,1));
  float n011 = hash3(i + vec3(0,1,1)), n111 = hash3(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
// 2-octave value-noise FBM, three decorrelated channels (Blender's Noise
// Texture vector output evaluates the same field at three offsets).
float fbm(vec3 p) { return (vnoise(p) + 0.5 * vnoise(p * 2.0 + 17.3)) / 1.5; }
vec3 noise3(vec3 p) {
  return vec3(fbm(p), fbm(p + vec3(31.7, 11.1, 5.3)), fbm(p + vec3(-7.9, 23.5, 41.2)));
}

void main() {
  float theta = 6.28318530718 * mod(time, period) / period;
  vec3 c = circleRadius * vec3(cos(theta), sin(theta), 0.0);
  vec3 pB = home + amplitude * (noise3((home + c) * noiseScale) - 0.5);
  vec3 pos = vec3(pB.x, pB.z, -pB.y);               // Blender Z-up → three Y-up
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  // Beauty gate: project through the PADDED camera (the beauty's frame) and
  // read the mixed luminance there. Motes glow only where the room is lit.
  vec4 clip = padProj * world;
  vec2 ndc = clip.xy / max(clip.w, 1e-4);
  vec2 uv = vec2(0.5 + 0.5 * ndc.x, 0.5 - 0.5 * ndc.y);   // top-left origin texture
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0) * step(0.0, clip.w);
  float luma = dot(textureLod(map, clamp(uv, 0.0, 1.0), 3.0).rgb, weights);
  float g = smoothstep(gate.x, gate.y, luma) * inside;
  #ifdef NO_GATE
    g = inside;
  #endif
  vAlpha = alpha * g;

  float nominal = sizePx * jitter * dpr;
  float px = min(nominal * (attenRef / max(-mv.z, 0.05)), nominal * maxScale);
  gl_PointSize = max(1.0, px);
}`;

const MOTE_FRAG = /* glsl */`
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.55, 1.0, d)) * vAlpha;
  if (a <= 0.0005) discard;
  gl_FragColor = vec4(vec3(a), a);
  #include <colorspace_fragment>
}`;

// ── helpers ──────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function easeInOutQuart(x) { return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }

// Case study §2.6, verbatim, then normalized to sum to 1 (R-A). Two tempo
// knobs (Eric, Sept 16: the fog should be calmer): `scale` stretches time —
// 1 is the case study's tempo, 0.3 makes every cycle 3.3× longer — and
// `wobble` scales the inner sinusoids (the 1.4–4.3 rad/s tremor riding on
// the slow cycles; 0 removes it, leaving the three slow cycles alone).
export function mixWeights(t, out, scale, wobble) {
  const u = t * (scale == null ? 1 : scale), wb = wobble == null ? 1 : wobble;
  const rR = 0.2 + Math.abs(Math.sin(u * 0.456 + 3.222 + Math.sin(u * 4.331 + 1.234) * 0.1 * wb)) * 0.8;
  const rG = 0.2 + Math.abs(Math.sin(u * 0.138 + 2.456 + Math.cos(u * 1.447 + 2.564) * 0.2 * wb)) * 0.8;
  const rB = 0.2 + Math.abs(Math.sin(u * 0.265 + 1.325 + Math.sin(u * 2.524 + 3.663) * 0.3 * wb)) * 0.8;
  const s = rR + rG + rB;
  out[0] = rR / s; out[1] = rG / s; out[2] = rB / s;
  return out;
}

// ── the 'layers4d' water field (registry water.field / water.layers4d) ───
// Sept 18 (Eric: "could the ripples get some variations? right now it just
// looks like a png flowing from right to left"): the Sept 17 field translated
// every octave together at one velocity, so the shapes slid rigidly. layers4d
// = three single-octave Blender 4D Noise layers (Scale 1 after a Vector Math
// pre-scale `scale` cells/m, Detail 0, Normalize on), each sampled on a circle
// of radius `morph_r` cells around `circle_centre` in (z, W) (in-place morph
// that closes exactly on the loop; `morph_phase` de-phases the circles) and
// drifted `travel_m` m per loop along Blender +Y rotated by `spread_deg`
// through a cos/sin crossfade of two copies (variance-preserving while the
// copies are ≥ 2 cells apart; `stagger` offsets each layer's fade). h = 0.5 +
// gain·Σ amp_k(Fac_k − 0.5)/Σ amp. Every uniform is a pure function of the
// loop phase u, so the 10 s loop is exact by construction. The same tree is
// applied in 3Ds/Scenes/Software/_work/Software_water_variation.blend (3Ds/scripts/make_water_tree.py;
// the _ab.blend copy keeps fbm3d behind a FIELD switch; Software_layers4d.blend is the superseded synth draft).
// Exported for offline checks (scratchpad check_layers4d.mjs vs layers4d_ref.py).
const LAYERS4D_DEFAULT = {
  gain: 0.97, circle_centre: [0.5, 0.5],
  layers: [
    { scale: 6,  amp: 1.0,  travel_m: 0.35, morph_r: 0.30, stagger: 0,     morph_phase: 0,      spread_deg: -8 },
    { scale: 12, amp: 0.6,  travel_m: 0.45, morph_r: 0.35, stagger: 1 / 3, morph_phase: 1 / 12, spread_deg: 0 },
    { scale: 24, amp: 0.36, travel_m: 0.55, morph_r: 0.40, stagger: 2 / 3, morph_phase: 1 / 6,  spread_deg: 8 },
  ],
};
// set({ripple:{<knob>:[…]}}) name → layer field
const LAYER_KNOBS = [['layerScale', 'scale'], ['layerAmp', 'amp'], ['layerTravel', 'travel_m'], ['layerMorph', 'morph_r'],
  ['layerStagger', 'stagger'], ['layerMorphPhase', 'morph_phase'], ['layerSpread', 'spread_deg']];
// Registry block → always three layer records (an absent layer keeps the default parameters with amp 0 = off,
// so a later set({ripple:{layerAmp}}) can switch it on).
export function normLayers4d(src) {
  const s = (src && typeof src === 'object') ? src : {};
  const num = (v, d) => { const n = +v; return Number.isFinite(n) ? n : d; };
  const cc = (Array.isArray(s.circle_centre) && s.circle_centre.length === 2) ? s.circle_centre : LAYERS4D_DEFAULT.circle_centre;
  const out = { gain: Math.max(0, num(s.gain, LAYERS4D_DEFAULT.gain)), circle_centre: [num(cc[0], 0.5), num(cc[1], 0.5)], layers: [] };
  const srcLayers = Array.isArray(s.layers) ? s.layers : LAYERS4D_DEFAULT.layers;
  for (let k = 0; k < 3; k++) {
    const D = LAYERS4D_DEFAULT.layers[k], L = srcLayers[k];
    if (!L || typeof L !== 'object') { out.layers.push(Object.assign({}, D, { amp: 0 })); continue; }
    out.layers.push({ scale: Math.max(1e-3, num(L.scale, D.scale)), amp: Math.max(0, num(L.amp, D.amp)), travel_m: num(L.travel_m, D.travel_m),
      morph_r: Math.max(0, num(L.morph_r, D.morph_r)), stagger: num(L.stagger, D.stagger), morph_phase: num(L.morph_phase, D.morph_phase), spread_deg: num(L.spread_deg, D.spread_deg) });
  }
  return out;
}
// Per frame, right after loopU: U = shellMat.uniforms, cfg = normLayers4d(...), u = loopU (double; 0 under reduced
// motion gives a valid static frame). Mirrors the Blender tree node for node: u_k = FRACT(u + stagger), θ = 2π(u +
// morph_phase), (z, w) = centre + R(cos θ, sin θ), offsets D·u_k·e and D·(u_k − 1)·e, fades (cos, sin)(π u_k / 2).
export function updateLayers4d(U, cfg, u) {
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  let asum = 0;
  for (let i = 0; i < cfg.layers.length; i++) asum += cfg.layers[i].amp;
  if (!(asum > 0)) asum = 1;
  for (let k = 0; k < 3; k++) {
    const L = cfg.layers[k];
    if (!L) { U.wAmp.value[k] = 0; continue; }
    const uk = ((u + L.stagger) % 1 + 1) % 1;                                  // fract(u + stagger_k), ONE form everywhere
    const th = 2 * Math.PI * (u + L.morph_phase);                              // θ_k
    const z = cfg.circle_centre[0] + L.morph_r * Math.cos(th), w = cfg.circle_centre[1] + L.morph_r * Math.sin(th);
    const D = L.travel_m * L.scale, phi = L.spread_deg * DEG, ex = -Math.sin(phi), ey = Math.cos(phi);   // e_k = +Y rotated by spread
    U.wScale.value[k] = L.scale; U.wAmp.value[k] = cfg.gain * L.amp / asum;
    U.wOffA.value[k].set(D * uk * ex, D * uk * ey);
    U.wOffB.value[k].set(D * (uk - 1) * ex, D * (uk - 1) * ey);
    U.wFade.value[k].set(Math.cos(0.5 * Math.PI * uk), Math.sin(0.5 * Math.PI * uk));
    const Z = Math.floor(z), Wf = Math.floor(w), fz = z - Z, fw = w - Wf, t = fade(fz), s = fade(fw);
    U.wZW.value[k].set(Z, Wf, fz, fw);
    U.wWt.value[k].set((1 - t) * (1 - s), t * (1 - s), (1 - t) * s, t * s);
  }
}

// ── the room ─────────────────────────────────────────────────────────────
export function createHomeRoom({ THREE, renderer, registryEntry: reg, bake, gltf, textures, root, reducedMotion, texLoader, dev, variant, roomKey }) {
  const room = roomKey || 'home';            // registry key: bs_<room>_* names in the GLB
  const beauty = textures.beauty;
  // The at-rest texture (two-texture pack). restRect converts bake.at_rest_uv
  // (Blender's bottom-up v) to the top-left-origin uv the shaders use:
  // v_tl = 1 − v_blender, so [v0, v1] → [1 − v1, 1 − v0].
  const restTex = textures.rest || beauty;                 // a valid sampler even when absent (hasRest gates it)
  const hasRest = textures.rest ? 1 : 0;
  // A wide at-rest layer (rest.aspect 32:9 etc., vfov held) carries its own
  // rect in bake.rest.uv_rect; the 16:9 layer's rect is bake.at_rest_uv.
  const aru = (bake && bake.rest && bake.rest.uv_rect) || (bake && bake.at_rest_uv) || { u0: 0.2633, v0: 0.2633, u1: 0.7367, v1: 0.7367 };
  const restRect = new THREE.Vector4(aru.u0, 1 - aru.v1, aru.u1, 1 - aru.v0);
  const restAspect = (bake && bake.rest && bake.rest.aspect) || '16:9';
  const restFeather = (reg.mix && reg.mix.rest_feather) ?? 0.012;
  // film grain (registry grain.amount / grain.size_px; 0 disables)
  const grainCfg = reg.grain || {};
  let grainAmount = Math.max(0, +(grainCfg.amount ?? 0) || 0);
  const grainSize = Math.max(1, +(grainCfg.size_px ?? 1.5) || 1.5);
  function applyGrain(a) { shellMat.uniforms.grainAmount.value = a; panelMat.uniforms.grainAmount.value = a; }
  // `|| fallback` treated an explicit 0 as missing (0 is falsy), so contrast_pivot: 0 silently became 0.5 —
  // and pivot 0 with contrast < 1 is exactly the runtime dimmer (a pure multiply in gamma space). Guard NaN only.
  const num = (v, dflt) => (Number.isFinite(v) ? v : dflt);
  const exposureVal = Math.max(0, num(+((reg.mix || {}).exposure ?? 1), 1));
  let contrastVal = Math.max(0, num(+((reg.mix || {}).contrast ?? 1), 1));
  const contrastPivot = Math.min(1, Math.max(0, num(+((reg.mix || {}).contrast_pivot ?? 0.5), 0.5)));
  function applyContrast(c) { shellMat.uniforms.contrast.value = c; panelMat.uniforms.contrast.value = c; }
  const reduced = typeof reducedMotion === 'function' ? reducedMotion : () => false;
  const lookCfg = reg.look || {};
  const lookOn = lookCfg.enabled !== false;
  const bcam = (bake && bake.camera) || {};
  const bbeauty = (bake && bake.beauty) || {};
  const warn = (...a) => console.warn('[home]', ...a);
  const dlog = dev ? (...a) => console.log('[home]', ...a) : () => {};

  // ── camera: pose + fov from the GLB, aspect + clamps owned here (R-D) ──
  gltf.scene.updateMatrixWorld(true);
  const camIdx = (reg.camera && reg.camera.index) || 0;
  const gltfCam = gltf.cameras && gltf.cameras[camIdx];
  if (!gltfCam) throw new Error('GLB carries no camera (expected bs_' + room + '_cam)');
  const restPos = new THREE.Vector3(), restQuat = new THREE.Quaternion(), tmpScale = new THREE.Vector3();
  gltfCam.matrixWorld.decompose(restPos, restQuat, tmpScale);

  const sensor = bcam.sensor_mm || 36, lensD = bcam.lens_display_mm || 36;
  const hfovD = bcam.hfov_display_deg || (2 * Math.atan(sensor / (2 * lensD)) / DEG);
  // The display frame is 16:9 under HORIZONTAL sensor fit, so its vertical
  // fov is 2·atan(tan(hfov/2)·9/16) = 31.42° for the 36 mm lens — that is the
  // yfov the exporter writes (R-D: the GLB is the authority on FOV). The 36×24
  // sensor's own 36.87° is NOT the frame's; a freeze record carrying it is
  // flagged, not followed.
  const vfovFrame = 2 * Math.atan(Math.tan(hfovD * DEG / 2) * 9 / 16) / DEG;
  const vfovD = (gltfCam.isPerspectiveCamera && gltfCam.fov) ? gltfCam.fov : vfovFrame;
  if (dev && bcam.vfov_display_deg && Math.abs(bcam.vfov_display_deg - vfovD) > 0.5) {
    warn('bake.camera.vfov_display_deg %s disagrees with the GLB yfov %s° — using the GLB', bcam.vfov_display_deg, vfovD.toFixed(3));
  }
  if (dev && bake && bake.at_rest_uv) {
    const r = bake.at_rest_uv;
    if (Math.abs((r.v1 - r.v0) - (r.u1 - r.u0)) > 1e-3) {
      warn('bake.at_rest_uv is not square in tan-space: v1−v0 = %s vs u1−u0 = %s (expected equal at 16:9 under HORIZONTAL fit; the poster crop is off)', (r.v1 - r.v0).toFixed(4), (r.u1 - r.u0).toFixed(4));
    }
  }
  const padYaw = bcam.pad_yaw_deg ?? 20, padPitch = bcam.pad_pitch_deg ?? 10;
  let clampYaw = Math.min(lookCfg.clamp_yaw_deg ?? padYaw, padYaw) * DEG;
  let clampPitch = Math.min(lookCfg.clamp_pitch_deg ?? padPitch, padPitch) * DEG;
  const near = (reg.camera && reg.camera.near) || 0.1, far = (reg.camera && reg.camera.far) || 100;

  const camera = new THREE.PerspectiveCamera(vfovD, 16 / 9, near, far);
  camera.name = gltfCam.name || ('bs_' + room + '_cam');
  camera.position.copy(restPos);
  camera.quaternion.copy(restQuat);
  camera.updateMatrixWorld();

  // Padded camera (the beauty's frame): same pose, the padded vertical fov,
  // the beauty's own aspect. padProj = P_pad · V_rest is the ONE projection
  // the shell, the panel and the mote gate all sample the beauty through.
  const beautyW = bbeauty.width || (beauty.image && beauty.image.width) || 1920;
  const beautyH = bbeauty.height || (beauty.image && beauty.image.height) || 1080;
  const vfovP = bcam.vfov_padded_deg || (2 * Math.atan(Math.tan((hfovD / 2 + padYaw) * DEG) * beautyH / beautyW) / DEG);
  const padCam = new THREE.PerspectiveCamera(vfovP, beautyW / beautyH, near, far);
  padCam.position.copy(restPos);
  padCam.quaternion.copy(restQuat);
  padCam.updateMatrixWorld();
  padCam.updateProjectionMatrix();
  const padProj = new THREE.Matrix4().multiplyMatrices(padCam.projectionMatrix, padCam.matrixWorldInverse);

  // Fit (registry camera.fit). 'height' (default — Eric, Sept 16): the
  // vertical field of view IS the composition and never changes; the width
  // follows the screen, so a 21:9 monitor simply sees more wall. Past the
  // padded beauty's width (aspect > tan(hfovP/2)/tan(vfovD/2) ≈ 3.75) the
  // padded width is kept instead, so no screen ever shows the texture's edge.
  // 'cover' is the stage's old project() rule: wider keeps hfov and loses
  // top/bottom (the "zoomed in" Eric rejected). Never letterbox, never translate.
  const REF = 16 / 9;
  const fitMode = (reg.camera && reg.camera.fit) === 'cover' ? 'cover' : 'height';
  let viewW = 1, viewH = 1, dpr = 1;
  function resize(w, h, pixelRatio) {
    viewW = w || 1; viewH = h || 1; dpr = pixelRatio || 1;
    const a = viewW / viewH;
    camera.aspect = a;
    if (fitMode === 'cover') camera.fov = a >= REF ? 2 * Math.atan(Math.tan(hfovD * DEG / 2) / a) / DEG : vfovD;
    else camera.fov = (tvD * a > tanHP) ? 2 * Math.atan(tanHP / a) / DEG : vfovD;
    camera.updateProjectionMatrix();
    thCur = Math.tan(camera.fov * DEG / 2) * a; tvCur = Math.tan(camera.fov * DEG / 2);
    computeClamps();
    if (motes) motes.material.uniforms.dpr.value = dpr;
  }

  // ── V6: the reachable look maximum and the corner overshoot ─────────────
  // The clamps are a box in (yaw, pitch); the padded frame is a rectangle in
  // tan-space, so a box corner can leave the texture. The display corner
  // direction (±th, ±tv, −1), rotated by q_yaw·q_pitch, projected through the
  // padded camera at rest: ratio = max(|x|/tan(hfovP/2), |y|/tan(vfovP/2)).
  // Under fit 'height' the frame widens with the screen, so the clamps are
  // recomputed from the CURRENT frame on every resize (computeClamps).
  const tanHP = Math.tan(padCam.fov * DEG / 2) * padCam.aspect, tanVP = Math.tan(padCam.fov * DEG / 2);
  const thD = Math.tan(hfovD * DEG / 2), tvD = Math.tan(vfovD * DEG / 2);
  let thCur = thD, tvCur = tvD;            // the current frame's tan half-extents (resize updates them)
  function cornerRatio(yaw, pitch) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch));
    let worst = 0;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const d = new THREE.Vector3(sx * thCur, sy * tvCur, -1).applyQuaternion(q);
      if (d.z >= -1e-6) return Infinity;
      const x = -d.x / d.z, y = -d.y / d.z;
      worst = Math.max(worst, Math.abs(x) / tanHP, Math.abs(y) / tanVP);
    }
    return worst;
  }
  const amp0 = lookCfg.amplitude_rad ?? 0.1;
  const parYaw0 = (lookCfg.parallax_yaw_deg ?? 10) * DEG, parPitch0 = (lookCfg.parallax_pitch_deg ?? 5) * DEG;
  // Eric, Sept 15: the camera is STATIC at rest and turns only while DRAGGED
  // (mode 'drag', the default). The Cursed Library's pointer parallax + idle
  // drift survives as mode 'pointer' in the registry, not as house behaviour.
  const lookMode = lookCfg.mode === 'pointer' ? 'pointer' : 'drag';
  // Reachable maximum: in drag mode a hand can take the target to the clamp
  // itself; in pointer mode drift yaw = A·½(sin + cos) ≤ A, pitch ≤ A/2.
  const clampYaw0 = clampYaw, clampPitch0 = clampPitch;   // the registry box; computeClamps() shrinks from here
  let lookMax = {};
  function computeClamps() {
    clampYaw = clampYaw0; clampPitch = clampPitch0;
    const reachYaw0 = lookMode === 'drag' ? clampYaw : parYaw0 + amp0;
    const reachPitch0 = lookMode === 'drag' ? clampPitch : parPitch0 + amp0 * 0.5;
    lookMax = { frame: [2 * Math.atan(thCur) / DEG, 2 * Math.atan(tvCur) / DEG],
      registryClamp: [clampYaw / DEG, clampPitch / DEG], ratioAtClamp: cornerRatio(clampYaw, clampPitch) };
    lookMax.reachable = [Math.min(reachYaw0, clampYaw) / DEG, Math.min(reachPitch0, clampPitch) / DEG];
    lookMax.ratioAtReachable = cornerRatio(Math.min(reachYaw0, clampYaw), Math.min(reachPitch0, clampPitch));
    if (lookMax.ratioAtReachable > 1.0) {
      // Shrink the box uniformly (bisection on one scale) until the reachable
      // corner stays inside the beauty.
      let lo = 0, hi = 1;
      for (let i = 0; i < 40; i++) {
        const s = (lo + hi) / 2;
        cornerRatio(s * clampYaw, s * clampPitch) <= 1.0 ? lo = s : hi = s;
      }
      clampYaw *= lo; clampPitch *= lo;
      lookMax.reachable = [Math.min(reachYaw0, clampYaw) / DEG, Math.min(reachPitch0, clampPitch) / DEG];
      lookMax.ratioAtReachable = cornerRatio(Math.min(reachYaw0, clampYaw), Math.min(reachPitch0, clampPitch));
      lookMax.shrunk = true;
    } else lookMax.shrunk = false;
    lookMax.effectiveClamp = [clampYaw / DEG, clampPitch / DEG];
    lookMax.ratioAtEffectiveClamp = cornerRatio(clampYaw, clampPitch);
    dlog('look @ frame %s° × %s°: registry clamp %s° / %s° (corner ratio %s); reachable max %s° / %s° (corner ratio %s); effective clamp %s° / %s°%s',
      lookMax.frame[0].toFixed(2), lookMax.frame[1].toFixed(2),
      lookMax.registryClamp[0].toFixed(2), lookMax.registryClamp[1].toFixed(2), lookMax.ratioAtClamp.toFixed(3),
      lookMax.reachable[0].toFixed(2), lookMax.reachable[1].toFixed(2), lookMax.ratioAtReachable.toFixed(3),
      lookMax.effectiveClamp[0].toFixed(2), lookMax.effectiveClamp[1].toFixed(2), lookMax.shrunk ? ' (SHRUNK to keep the reachable corner inside the beauty)' : '');
  }
  computeClamps();

  // ── scene + shell material ──────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = null;
  const weights = new THREE.Vector3(1, 0, 0);
  const mixCfg = reg.mix || {};
  const waterCfg = (reg.water && typeof reg.water === 'object') ? reg.water : null;   // runtime ripple for a water shell
  const waterRole = waterCfg ? String(waterCfg.mesh || 'water') : null;
  let waterMesh = null;
  // water.phase: 0 | 1 | 2 draws the sheet from ONE baked phase at gain 1 (crisp glitter that the ripple then moves);
  // 'mean' draws the static mean of the three (gain 0). Default 0.
  const waterPhase = waterCfg && waterCfg.phase !== 'mean' ? Math.min(2, Math.max(0, (+waterCfg.phase || 0) | 0)) : null;
  const waterWeights = waterCfg ? (waterPhase == null ? new THREE.Vector3(1 / 3, 1 / 3, 1 / 3) : new THREE.Vector3(waterPhase === 0 ? 1 : 0, waterPhase === 1 ? 1 : 0, waterPhase === 2 ? 1 : 0)) : null;
  // per-mesh fog-breathing gain (see the traversal below); declared here because the traversal runs first
  const gainOverrides = (mixCfg.gain_overrides && typeof mixCfg.gain_overrides === 'object') ? mixCfg.gain_overrides : {};
  // Per-mesh EXPOSURE (registry mix.exposure_overrides, keyed by the role suffix): a
  // uniform dim cannot fix a room whose floor is bright RELATIVE to its walls; this can.
  const exposureOverrides = (mixCfg.exposure_overrides && typeof mixCfg.exposure_overrides === 'object') ? mixCfg.exposure_overrides : {};
  // registry sky: { override: 'white' } paints the bake's sky carrier (bs_<room>_sky) pure white — the design team's
  // bright-sky opening (hardware, Sept 19) — without a rebake; the room's baked sky-lighting and fog are untouched.
  const skyCfg = (reg.sky && typeof reg.sky === 'object') ? reg.sky : null;
  const skyWhite = !!(skyCfg && (skyCfg.override === 'white' || skyCfg.white === true));
  const wNoise = (waterCfg && waterCfg.noise && typeof waterCfg.noise === 'object') ? waterCfg.noise : {};
  const wBump = (waterCfg && waterCfg.bump && typeof waterCfg.bump === 'object') ? waterCfg.bump : {};   // legacy 'reflect' keeps a scalar bump
  const wStrip = (waterCfg && waterCfg.strip && typeof waterCfg.strip === 'object') ? waterCfg.strip : {};
  const wCore = (wStrip.core && typeof wStrip.core === 'object') ? wStrip.core : {};
  let waterLoopS = Math.max(0.001, +((waterCfg || {}).loop_s ?? 10) || 10);
  // the height field (registry water.field: 'layers4d' | 'fbm3d') and the layers4d block (see LAYERS4D_DEFAULT)
  const layersCfg = normLayers4d(waterCfg && waterCfg.layers4d);
  let waterFieldName = (waterCfg && waterCfg.field === 'layers4d') ? 'layers4d' : 'fbm3d';
  const overriddenMeshes = [];      // [name, gain] for state()
  let gainNow = 1, gainReducedNow = false;
  // per-mesh fog TEMPO (registry mix.tempo_overrides: {role: multiplier of mix.time_scale}) — the software water's
  // sparkle crossfade at the fog's slowed tempo reads as a still image; ×4 gives it a visible twinkle.
  const tempoOverrides = (mixCfg.tempo_overrides && typeof mixCfg.tempo_overrides === 'object') ? mixCfg.tempo_overrides : {};
  const tempoMeshes = [];           // [name, multiplier, THREE.Vector3 weights] — weights updated in frame()
  const wTmp = [1, 0, 0];
  let uvMode = mixCfg.uv_mode === 'attribute' ? 'attribute' : 'projective';
  const shellMat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: beauty }, weights: { value: weights }, lift: { value: 0 }, gain: { value: 1 }, mapRest: { value: restTex }, restRect: { value: restRect }, hasRest: { value: hasRest }, restFeather: { value: restFeather }, grainAmount: { value: grainAmount }, grainSize: { value: grainSize }, grainSeed: { value: 0 }, contrast: { value: contrastVal }, contrastPivot: { value: contrastPivot }, exposure: { value: exposureVal },
      padProj: { value: padProj }, uvAttr: { value: uvMode === 'attribute' ? 1 : 0 },
      skyWhite: { value: 0 },
      waterMode: { value: 0 }, time: { value: 0 }, rippleAmp: { value: +((waterCfg || {}).ripple_amp ?? 0.002) || 0 }, rippleScale: { value: +((waterCfg || {}).ripple_scale ?? 3) || 3 },
      rippleRef: { value: +((waterCfg || {}).atten_ref_m ?? 6) || 6 },
      rippleVel: { value: (() => {
        const sp = +((waterCfg || {}).ripple_speed ?? 0.15) || 0;
        const d = Array.isArray((waterCfg || {}).ripple_dir) && waterCfg.ripple_dir.length === 2 ? new THREE.Vector2(+waterCfg.ripple_dir[0] || 0, +waterCfg.ripple_dir[1] || 0) : new THREE.Vector2(1, 0.6);
        if (d.lengthSq() < 1e-9) d.set(1, 0);
        return d.normalize().multiplyScalar(sp);
      })() },
      rippleGlint: { value: Math.max(0, +((waterCfg || {}).glint ?? 0.3) || 0) },
      waterReflect: { value: (waterCfg && waterCfg.mode !== 'displace') ? 1 : 0 },
      waterBump: { value: Math.max(0, +(typeof (waterCfg || {}).bump === 'object' ? 0.2 : ((waterCfg || {}).bump ?? 0.6)) || 0) },
      waterF0: { value: (() => { const ior = +((waterCfg || {}).ior ?? 1.8) || 1.8; return Math.pow((ior - 1) / (ior + 1), 2); })() },
      waterBase: { value: Math.max(0, +((waterCfg || {}).base ?? 0.006) || 0) },
      waterLod: { value: Math.max(0, +((waterCfg || {}).reflect_lod ?? 2.5) || 0) },
      // 'material' mode: the exact port of M_bs_software_water (Cycles Perlin fBm -> Bump -> Principled, 10 s loop)
      waterMaterial: { value: (waterCfg && waterCfg.mode === 'material') ? 1 : 0 },
      loopU: { value: 0 },
      waterScale: { value: +(wNoise.scale ?? 6) || 6 }, waterDetail: { value: Math.max(0, +(wNoise.detail ?? 2) || 0) },
      waterRough: { value: Math.max(0, +(wNoise.roughness ?? 0.6) || 0) }, waterLacun: { value: +(wNoise.lacunarity ?? 2) || 2 },
      waterTravel: { value: +((waterCfg || {}).travel_m ?? 0.6) || 0 },
      bumpStrength: { value: Math.max(0, +(wBump.strength ?? 0.16) || 0) }, bumpDistance: { value: +(wBump.distance ?? 0.08) || 0 }, bumpInvert: { value: wBump.invert ? 1 : 0 },
      waterIor: { value: Math.max(1.0001, +((waterCfg || {}).ior ?? 1.8) || 1.8) },
      waterGloss: { value: Math.max(0.001, +((waterCfg || {}).roughness ?? 0.06) || 0.06) },
      waterAlpha: { value: Math.min(1, Math.max(0, +((waterCfg || {}).alpha ?? 0.5) || 0)) },
      waterBody: { value: Math.max(0, +((waterCfg || {}).base ?? 0.00077) || 0) },
      stripRect: { value: new THREE.Vector4(+(wStrip.x ?? -4.78), +(wStrip.y ?? 2.0), +(wStrip.half_h ?? 0.025), +(wStrip.half_w ?? 2.5)) },
      stripCore: { value: new THREE.Vector4(+(wCore.x ?? -4.75), +(wCore.y ?? 2.0), +(wCore.half_h ?? 0.005), +(wCore.half_w ?? 2.25)) },
      stripL: { value: new THREE.Vector2(Math.max(0, +(wStrip.radiance ?? 3)), Math.max(0, +(wCore.radiance ?? 60))) },
      stripSpread: { value: Math.max(1, +(wStrip.spread ?? 2) || 1) },
      reflectGain: { value: Math.max(0, +((waterCfg || {}).reflect_gain ?? 0.8) || 0) },
      reflectLodBias: { value: +((waterCfg || {}).reflect_lod_bias ?? 0) || 0 },
      restLodBias: { value: +((waterCfg || {}).rest_lod_bias ?? 1.08) || 0 },
      plateCap: { value: Math.min(1, Math.max(0, +((waterCfg || {}).plate_cap ?? 1) || 0)) },
      roomMin: { value: new THREE.Vector3(-1e3, -1e3, -1e3) }, roomMax: { value: new THREE.Vector3(1e3, 1e3, 1e3) },
      // field 'layers4d' (Sept 18): three single-octave 4D Noise layers; every value is refreshed by updateLayers4d(u) per frame
      waterFieldMode: { value: waterFieldName === 'layers4d' ? 1 : 0 },
      wScale: { value: [6, 12, 24] }, wAmp: { value: [0, 0, 0] },
      wOffA: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] },
      wOffB: { value: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()] },
      wFade: { value: [new THREE.Vector2(1, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 0)] },
      wZW: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      wWt: { value: [new THREE.Vector4(1, 0, 0, 0), new THREE.Vector4(1, 0, 0, 0), new THREE.Vector4(1, 0, 0, 0)] },
    },
    vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG,
    toneMapped: false, depthTest: true, depthWrite: true, side: THREE.FrontSide,
  });
  shellMat.name = 'bs_' + room + '_shell';
  if (waterCfg) updateLayers4d(shellMat.uniforms, layersCfg, 0);   // a valid static frame before the first frame()

  const panelName = (reg.panel && reg.panel.node) || ('bs_' + room + '_panel');
  const motesRe = new RegExp('^bs_' + room + '_motes$', 'i');
  const frontRe = new RegExp('front[ _-]?wall|bs_' + room + '_front');
  const hidden = new Set((reg.hidden_nodes || []).map(s => s.toLowerCase()));
  let panelMesh = null, shellTris = 0, motesNode = null;
  const shellMeshes = [];
  gltf.scene.traverse(o => {
    if (o.isPoints && motesRe.test(o.name || '')) { motesNode = o; return; }
    if (!o.isMesh) return;
    const n = (o.name || '').toLowerCase();
    if (hidden.has(n) || frontRe.test(n)) {
      // The door wall must leave SHIP (Sept 15 ruling); hide it if it arrives, but say so.
      if (dev) warn('FRONT WALL "%s" arrived in the GLB — it must not be in SHIP (hidden at runtime, but the bake is wrong)', o.name);
      o.visible = false; return;
    }
    if (o.name === panelName) { panelMesh = o; return; }
    o.material = shellMat;
    o.renderOrder = 0;
    o.frustumCulled = true;
    shellMeshes.push(o);
    // Per-mesh fog-breathing gain (registry mix.gain_overrides, keyed by the
    // role suffix after bs_<room>_): the software water's three phases differ
    // by 35 % where the walls differ by 3 %, so the ×3 gain would blow its
    // sparkle out — the water crossfades at gain 1 while the fog keeps 3.
    // Same ShaderMaterial; the uniform is swapped around this mesh's draw.
    const suffix = n.startsWith('bs_' + room + '_') ? n.slice(room.length + 4) : n;
    const gOv = gainOverrides[suffix] != null ? Math.max(0, +gainOverrides[suffix] || 0) : null;
    const tOv = tempoOverrides[suffix] != null ? Math.max(0, +tempoOverrides[suffix] || 0) : null;
    const eOv = exposureOverrides[suffix] != null ? Math.max(0, +exposureOverrides[suffix] || 0) : null;
    const isWater = waterRole != null && suffix === waterRole && (waterCfg.enabled !== false);
    const isSky = skyWhite && suffix === 'sky';
    if (gOv != null || tOv != null || eOv != null || isWater || isSky) {
      const wv = tOv != null ? new THREE.Vector3(1, 0, 0) : null;
      if (wv) tempoMeshes.push([o.name, tOv, wv]);
      if (gOv != null) overriddenMeshes.push([o.name, gOv]);
      if (isWater) waterMesh = o;
      // shellMat is shared by every shell mesh: three.js uploads a shared material's uniforms once per
      // frame (first object) and skips the rest unless uniformsNeedUpdate is raised, so the per-mesh
      // swap below MUST flag it on the way in and on the way out (else the water/gain/tempo swaps
      // never reach the GPU and the water draws the plain baked pixel).
      o.onBeforeRender = () => {
        shellMat.uniformsNeedUpdate = true;
        if (isSky) shellMat.uniforms.skyWhite.value = 1;
        if (gOv != null) shellMat.uniforms.gain.value = gainReducedNow ? 1 : gOv;
        if (eOv != null) shellMat.uniforms.exposure.value = eOv;
        if (wv) shellMat.uniforms.weights.value = wv;
        if (isWater) {
          shellMat.uniforms.waterMode.value = reduced() ? 0 : 1;
          if (shellMat.uniforms.waterReflect.value < 0.5) {                     // 'displace' mode only
            shellMat.uniforms.weights.value = waterWeights;                     // one phase (or the mean)
            shellMat.uniforms.gain.value = waterPhase == null ? 0 : 1;          // exact phase / exact mean
          }
        }
      };
      o.onAfterRender = () => { shellMat.uniforms.exposure.value = exposureVal; shellMat.uniforms.gain.value = gainNow; shellMat.uniforms.weights.value = weights; shellMat.uniforms.waterMode.value = 0; shellMat.uniforms.skyWhite.value = 0; shellMat.uniformsNeedUpdate = true; };
    }
    const g = o.geometry;
    shellTris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  });
  scene.add(gltf.scene);
  // The room interior box for the water reflection: the union of the wall/floor/ceiling shells
  // (the sky carrier and the water itself excluded), in world space.
  if (waterCfg) {
    const box = new THREE.Box3();
    let floorTop = null, ceilBot = null;
    for (const m of shellMeshes) {
      const nm = (m.name || '').toLowerCase(); if (/sky|water/.test(nm)) continue;
      const b = new THREE.Box3().setFromObject(m); box.union(b);
      // The walls may overshoot the slabs (the 3 m rebuild shifted 4 m walls down through the floor and up
      // through the ceiling), so the vertical extent of the interior comes from the floor's top and the
      // ceiling's underside when those shells exist, not from the union.
      if (/(^|_)floor$/.test(nm)) floorTop = floorTop == null ? b.max.y : Math.max(floorTop, b.max.y);
      if (/(^|_)ceiling$/.test(nm)) ceilBot = ceilBot == null ? b.min.y : Math.min(ceilBot, b.min.y);
    }
    if (floorTop != null && ceilBot != null && ceilBot > floorTop) { box.min.y = floorTop; box.max.y = ceilBot; }
    if (!box.isEmpty()) {
      shellMat.uniforms.roomMin.value.copy(box.min); shellMat.uniforms.roomMax.value.copy(box.max);
      dlog('water: room box for the reflection %s → %s', box.min.toArray().map(v => v.toFixed(2)).join(','), box.max.toArray().map(v => v.toFixed(2)).join(','));
    }
  }

  // Dev check of the projection: uv_proj is exact AT THE VERTICES, so the
  // per-vertex difference between TEXCOORD_0 and padProj(position) measures
  // both the matrix and the v orientation. Expect ~1e-4 (float32 uv).
  function uvCheck() {
    const out = {};
    const v4 = new THREE.Vector4();
    for (const m of shellMeshes) {
      const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
      if (!pos || !uv) { out[m.name] = 'no uv'; continue; }
      let worst = 0, worstFlipped = 0;
      for (let i = 0; i < pos.count; i++) {
        v4.set(pos.getX(i), pos.getY(i), pos.getZ(i), 1).applyMatrix4(m.matrixWorld).applyMatrix4(padProj);
        const u = 0.5 + 0.5 * v4.x / v4.w, v = 0.5 - 0.5 * v4.y / v4.w;
        worst = Math.max(worst, Math.abs(u - uv.getX(i)), Math.abs(v - uv.getY(i)));
        worstFlipped = Math.max(worstFlipped, Math.abs(u - uv.getX(i)), Math.abs((1 - v) - uv.getY(i)));
      }
      out[m.name] = { verts: pos.count, maxAbsDiff: +worst.toExponential(3), maxAbsDiffIfVFlipped: +worstFlipped.toExponential(3) };
    }
    return out;
  }
  if (dev) dlog('projective-uv check vs TEXCOORD_0 (per vertex):', uvCheck());

  // ── panel machine: off → power_on → content:<key> (R-E mood scalar) ────
  const panelCfg = reg.panel || {};
  const contentUrls = panelCfg.content || {};
  const contentTex = new Map();      // key → Texture | Promise
  const loader = texLoader || new THREE.TextureLoader();
  // V4: a 1×1 black texture is bound to the content sampler from construction,
  // so the ONE panel program (sampler always present) is what the warm-up compiles.
  const blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  blackTex.colorSpace = THREE.SRGBColorSpace;
  blackTex.needsUpdate = true;
  const tint = new THREE.Color(panelCfg.tint || '#ffffff');
  const panelMat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: beauty }, content: { value: blackTex }, weights: { value: weights }, lift: { value: 0 }, gain: { value: 1 }, mapRest: { value: restTex }, restRect: { value: restRect }, hasRest: { value: hasRest }, restFeather: { value: restFeather }, grainAmount: { value: grainAmount }, grainSize: { value: grainSize }, grainSeed: { value: 0 }, contrast: { value: contrastVal }, contrastPivot: { value: contrastPivot }, exposure: { value: exposureVal },
      padProj: { value: padProj }, moodColor: { value: tint }, moodMask: { value: 0 },
    },
    vertexShader: PANEL_VERT, fragmentShader: PANEL_FRAG,
    toneMapped: false, depthTest: true, depthWrite: true, side: THREE.FrontSide,
  });
  panelMat.name = 'bs_' + room + '_panel';
  if (panelMesh) { panelMesh.material = panelMat; panelMesh.renderOrder = 1; }
  else warn('GLB carries no panel mesh named', panelName);
  let panelState = panelCfg.default === 'off' || !panelCfg.default ? 'off' : panelCfg.default;
  let panelKey = null, pendingKey = null, hasContent = 0;
  let mood = 0;
  const moodGain = mixCfg.mood_gain || 0;
  // Fog-breathing gain (registry mix.gain, default 1 = the plain R-A mix; the
  // house ships 3 so the haze visibly breathes — Eric, Sept 15). Reduced motion
  // shows the static mean instead (weights ⅓ each, gain 1).
  let mixGain = Math.max(0, +(mixCfg.gain ?? 1) || 1);
  gainNow = mixGain;
  // fog tempo (registry mix.time_scale / mix.wobble; 1/1 = the case study)
  let mixTimeScale = Math.max(0, +(mixCfg.time_scale ?? 1) || 0);
  let mixWobble = Math.max(0, +(mixCfg.wobble ?? 1) || 0);
  function applyGain(g, isReduced) { gainNow = g; gainReducedNow = !!isReduced; shellMat.uniforms.gain.value = g; panelMat.uniforms.gain.value = g; }
  applyGain(mixGain);
  let tween = null;                  // { from, to, t0, dur, onDone }
  let lastT = null;

  function setMood(v) {
    mood = clamp(v, 0, 1);
    panelMat.uniforms.moodMask.value = mood * hasContent;
    shellMat.uniforms.lift.value = mood * moodGain;
    panelMat.uniforms.lift.value = mood * moodGain;
  }
  function tweenMood(to, dur, onDone) {
    tween = { from: mood, to, t0: lastT == null ? null : lastT, dur: Math.max(0.001, dur), onDone: onDone || null };
  }
  function loadContent(key) {
    const url = contentUrls[key];
    if (!url) return Promise.reject(new Error('no panel content "' + key + '"'));
    if (contentTex.has(key)) {
      const v = contentTex.get(key);
      return v.then ? v : Promise.resolve(v);
    }
    const p = loader.loadAsync(new URL(url, root).href).then(t => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false;                 // panel UV is a glTF UV: top-left origin
      t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      // Upload (and build mips) NOW, at preload time — never at first bind in
      // front of the visitor (guide §8 "never load mid-experience").
      if (renderer.initTexture) renderer.initTexture(t);
      contentTex.set(key, t);
      return t;
    }).catch(e => { contentTex.delete(key); throw e; });
    contentTex.set(key, p);
    return p;
  }
  function bindContent(key, tex) {
    panelMat.uniforms.content.value = tex || blackTex;
    hasContent = tex ? 1 : 0;
    panelKey = tex ? key : null;
    setMood(mood);
  }
  function panelOn(key) {
    if (!contentUrls[key]) { warn('unknown panel content', key); return false; }
    pendingKey = key;
    panelState = 'power_on';
    loadContent(key).then(tex => {
      if (pendingKey !== key) return;
      bindContent(key, tex);
      if (tween == null) panelState = 'content:' + key;
    }).catch(e => {
      // B1: no content → no white quad; power back down to the baked OFF panel.
      warn('panel content failed — powering off:', e && e.message ? e.message : e);
      if (pendingKey === key) panelOff();
    });
    tweenMood(1, panelCfg.power_on_s ?? 2.5, () => {
      if (pendingKey === key) panelState = hasContent ? 'content:' + key : 'power_on';
    });
    return true;
  }
  function panelOff() {
    pendingKey = null;
    if (panelState === 'off' && mood === 0) return true;
    panelState = 'power_off';
    tweenMood(0, (panelCfg.power_on_s ?? 2.5) * 0.6, () => {
      bindContent(null, null); panelState = 'off';
    });
    return true;
  }
  // B5: a direct mood set (dev hook) must leave the machine's report true.
  function resolvePanelState() {
    if (mood <= 0) { pendingKey = null; bindContent(null, null); panelState = 'off'; }
    else if (mood >= 1 && hasContent && panelKey) panelState = 'content:' + panelKey;
    else panelState = 'power_on';
  }
  applyGrain(grainAmount);
  setMood(0);
  if (panelState !== 'off') { const k = panelState; panelState = 'off'; panelOn(k); }

  function preload() {
    Object.keys(contentUrls).forEach(k => loadContent(k).catch(() => {}));
  }
  function panelTextureBytes(estimate) {
    let s = 0;
    contentTex.forEach(v => { if (v && v.isTexture) s += estimate(v); });
    return s;
  }

  // ── motes ───────────────────────────────────────────────────────────────
  const mcfg = Object.assign({}, (bake && bake.motes) || {}, reg.motes || {});
  let motes = null, motesSource = 'none', motesCount = 0;
  // Homes from the GLB when it carries the bs_home_motes point cloud (Eric's
  // ruling): GLTFLoader turns a POINTS primitive into THREE.Points and a
  // custom `_JITTER` attribute into geometry.attributes['_jitter'] (it
  // lower-cases unknown names) — both spellings are accepted here.
  function homesFromGlb(node) {
    const g = node.geometry, pos = g && g.attributes && g.attributes.position;
    if (!pos) return null;
    const N = pos.count;
    const keys = Object.keys(g.attributes);
    const jKey = keys.find(k => /^_?jitter$/i.test(k)) || null;
    const jAttr = jKey ? g.attributes[jKey] : null;
    const identity = new THREE.Matrix4();
    const useMatrix = !node.matrixWorld.equals(identity);
    const home = new Float32Array(N * 3), jitter = new Float32Array(N);
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (useMatrix) v.applyMatrix4(node.matrixWorld);
      // three Y-up → Blender Z-up (x, −z, y): the formula's own frame.
      home[i * 3 + 0] = v.x; home[i * 3 + 1] = -v.z; home[i * 3 + 2] = v.y;
      jitter[i] = jAttr ? jAttr.getX(i) : 1;
    }
    if (!jAttr) {
      const rj = mcfg.radius_jitter || [0.5, 1.5], rnd = mulberry32(mcfg.seed ?? 1337);
      for (let i = 0; i < N; i++) jitter[i] = rj[0] + (rj[1] - rj[0]) * rnd();
    }
    return { home, jitter, N, jitterKey: jKey, transformed: useMatrix, attrKeys: keys };
  }
  function homesSeeded() {
    const N = mcfg.count | 0;
    const bounds = mcfg.bounds_world || [[-4.8, -2.8, 0.2], [4.8, 2.8, 3.8]];
    const rj = mcfg.radius_jitter || [0.5, 1.5];
    const rnd = mulberry32(mcfg.seed ?? 1337);
    const home = new Float32Array(N * 3), jitter = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      home[i * 3 + 0] = bounds[0][0] + (bounds[1][0] - bounds[0][0]) * rnd();
      home[i * 3 + 1] = bounds[0][1] + (bounds[1][1] - bounds[0][1]) * rnd();
      home[i * 3 + 2] = bounds[0][2] + (bounds[1][2] - bounds[0][2]) * rnd();
      jitter[i] = rj[0] + (rj[1] - rj[0]) * rnd();
    }
    return { home, jitter, N };
  }
  if (motesNode) {
    // Always remove the loader's Points (it would draw with a default PointsMaterial).
    if (motesNode.parent) motesNode.parent.remove(motesNode);
  }
  if (mcfg.enabled !== false) {
    let src = motesNode ? homesFromGlb(motesNode) : null;
    if (src && src.N > 0) {
      motesSource = 'glb';
      dlog('motes from the GLB: %d points, attributes %s, jitter attribute %s, node transform applied: %s', src.N, JSON.stringify(src.attrKeys), src.jitterKey || 'NONE (seeded jitter)', src.transformed);
    } else {
      if (motesNode) warn('bs_' + room + '_motes in the GLB has no positions — using the seeded generator');
      src = (mcfg.count | 0) > 0 ? homesSeeded() : null;
      if (src) { motesSource = 'seeded'; dlog('motes from the seeded generator: %d points (no bs_' + room + '_motes in the GLB)', src.N); }
    }
    if (src && src.N > 0) {
      const N = src.N;
      motesCount = N;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); // unused; 'home' drives
      geo.setAttribute('home', new THREE.BufferAttribute(src.home, 3));
      geo.setAttribute('jitter', new THREE.BufferAttribute(src.jitter, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 }, period: { value: mcfg.period_s || 10 },
          amplitude: { value: mcfg.amplitude_m ?? 0.05 }, noiseScale: { value: mcfg.noise_scale ?? 0.5 },
          circleRadius: { value: mcfg.circle_radius ?? 0.8 },
          sizePx: { value: mcfg.size_px ?? 1.5 }, dpr: { value: 1 }, attenRef: { value: mcfg.atten_ref_m ?? 6 },
          maxScale: { value: Math.max(1, +(mcfg.max_scale ?? 2) || 2) },
          gate: { value: new THREE.Vector2(+(mcfg.gate_lo ?? 0.02) || 0, +(mcfg.gate_hi ?? 0.25) || 0.25) },
          padProj: { value: padProj }, map: { value: beauty }, weights: { value: weights },
          alpha: { value: mcfg.alpha ?? 0.12 },
        },
        defines: mcfg.beauty_gate === false ? { NO_GATE: 1 } : {},
        vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false,
      });
      mat.name = 'bs_' + room + '_motes';
      motes = new THREE.Points(geo, mat);
      motes.name = 'bs_' + room + '_motes';
      motes.renderOrder = 2;
      motes.frustumCulled = false;     // the displaced cloud is never culled (no bounding sphere is kept)
      scene.add(motes);
    }
  }

  // ── floor fog (registry floor_fog; absent/disabled = nothing is created) ──
  let floorFog = null;
  {
    const fcfg = reg.floor_fog || null;
    if (fcfg && fcfg.enabled !== false) {
      const fbox = new THREE.Box3();
      let fTop = null;
      for (const m of shellMeshes) {
        const nm = (m.name || '').toLowerCase(); if (/sky/.test(nm)) continue;
        const b = new THREE.Box3().setFromObject(m); fbox.union(b);
        if (/(^|_)floor$/.test(nm)) fTop = fTop == null ? b.max.y : Math.max(fTop, b.max.y);
      }
      if (!fbox.isEmpty()) {
        const y0 = (fTop != null ? fTop : fbox.min.y) + 0.005;
        const y1 = y0 + (+fcfg.spread_m || 0.7);
        const slabMin = new THREE.Vector3(fbox.min.x, y0, fbox.min.z);
        const slabMax = new THREE.Vector3(fbox.max.x, y1, fbox.max.z);
        const steps = Math.max(4, Math.min(32, Math.round(+(fcfg.steps ?? 12))));
        // The mesh is the slab box itself; its BACK faces are drawn with the depth test off, so the
        // slab's silhouette covers the screen from any camera position (inside included) and the
        // march decides what is fog. Shell geometry cannot occlude it — the slab ends at the walls.
        const geo = new THREE.BoxGeometry(slabMax.x - slabMin.x, y1 - y0, slabMax.z - slabMin.z);
        const mat = new THREE.ShaderMaterial({
          defines: { STEPS: steps },
          uniforms: {
            time: { value: 0 }, padProj: { value: padProj }, map: { value: beauty }, weights: { value: weights },
            slabMin: { value: slabMin }, slabMax: { value: slabMax },
            density: { value: +(fcfg.density ?? 1.5) }, heightM: { value: +(fcfg.height_m ?? 0.3) },
            scaleM: { value: +(fcfg.scale_m ?? 3) }, speed: { value: +(fcfg.speed ?? 0.05) },
            litGain: { value: +(fcfg.lit_gain ?? 1) },
            threshold: { value: +(fcfg.threshold ?? 0.45) }, soften: { value: +(fcfg.soften ?? 0.25) },
            backBias: { value: +(fcfg.back_bias ?? 0) }, nearFade: { value: +(fcfg.near_fade_m ?? 0) },
            gate: { value: new THREE.Vector2(+(fcfg.gate?.[0] ?? 0.05), +(fcfg.gate?.[1] ?? 0.35)) },
            fogColor: { value: new THREE.Color(fcfg.color || '#ffffff') },
          },
          vertexShader: FOG_VERT, fragmentShader: FOG_FRAG,
          transparent: true, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.BackSide,
        });
        mat.name = 'bs_' + room + '_floorfog';
        floorFog = new THREE.Mesh(geo, mat);
        floorFog.name = 'bs_' + room + '_floorfog';
        floorFog.position.set((slabMin.x + slabMax.x) / 2, (y0 + y1) / 2, (slabMin.z + slabMax.z) / 2);
        floorFog.renderOrder = 3;
        floorFog.frustumCulled = false;
        scene.add(floorFog);
        dlog('floor fog: raymarched slab %.1f x %.1f m, y %.3f..%.3f, %d steps, density %s/m, height %s m, scale %s m, speed %s m/s, lit_gain %s',
          slabMax.x - slabMin.x, slabMax.z - slabMin.z, y0, y1, steps, mat.uniforms.density.value, mat.uniforms.heightM.value, mat.uniforms.scaleM.value, mat.uniforms.speed.value, mat.uniforms.litGain.value);
      }
    }
  }

  // ── the look controller ─────────────────────────────────────────────────
  // mode 'drag' (default, Eric Sept 15): static at rest; while a hand is down
  // on the backdrop the ROOM follows the hand (drag right → the camera yaws
  // left), clamped to the bake's padding; on release the view eases back to
  // rest ('release':'return') or stays ('hold'). No parallax, no idle drift.
  // mode 'pointer': the Cursed Library's parallax + drift, kept selectable.
  const amp = amp0, speed = lookCfg.speed ?? 1.5;
  const fq = lookCfg.freq || [0.26, 0.27, 0.23];
  const parYaw = parYaw0, parPitch = parPitch0;
  const dragYawPerW = (lookCfg.drag_yaw_deg_per_width ?? 40) * DEG;    // a full-width drag turns 40°
  const dragPitchPerH = (lookCfg.drag_pitch_deg_per_height ?? 20) * DEG;
  const dragSpeed = lookCfg.drag_speed ?? 14;                          // chase rate while grabbed
  const releaseMode = lookCfg.release === 'hold' ? 'hold' : 'return';
  let px = 0, py = 0;                 // pointer, −1..1, y down positive (pointer mode only)
  let curYaw = 0, curPitch = 0, tgtYaw = 0, tgtPitch = 0, first = true;
  let grabbed = false, gx = 0, gy = 0, gYaw = 0, gPitch = 0, activePointer = null, grabTouch = false;
  function dragStart(x, y, touch) { grabbed = true; grabTouch = !!touch; gx = x; gy = y; gYaw = tgtYaw; gPitch = tgtPitch; }
  function dragMove(x, y) {
    if (!grabbed) return;
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    // The room follows the hand: +dx (right) → yaw +about +Y (camera turns
    // left); +dy (down) → pitch +about +X (camera looks up).
    tgtYaw = clamp(gYaw + ((x - gx) / w) * dragYawPerW, -clampYaw, clampYaw);
    // On touch the chrome's drum owns vertical finger travel (it steps the
    // menu), so a finger only yaws; pitch stays where it was.
    if (!grabTouch) tgtPitch = clamp(gPitch + ((y - gy) / h) * dragPitchPerH, -clampPitch, clampPitch);
  }
  function dragEnd() {
    grabbed = false; activePointer = null;
    if (releaseMode === 'return') { tgtYaw = 0; tgtPitch = 0; }
  }
  const isBackdrop = el => !!el && (el === document.body || el === document.documentElement ||
    el.id === 'bs-stage' || el.id === 'bs-world' || el.id === 'bs-world-poster');
  if (lookOn && typeof window !== 'undefined') {
    if (lookMode === 'drag') {
      // Window-level, passive, never preventDefault: the chrome keeps every
      // gesture it owns; we only act when the press began on the backdrop.
      window.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!isBackdrop(e.target)) return;
        activePointer = e.pointerId; dragStart(e.clientX, e.clientY, e.pointerType === 'touch');
      }, { passive: true });
      window.addEventListener('pointermove', e => {
        if (grabbed && e.pointerId === activePointer) dragMove(e.clientX, e.clientY);
      }, { passive: true });
      const end = e => { if (grabbed && (activePointer == null || e.pointerId === activePointer)) dragEnd(); };
      window.addEventListener('pointerup', end, { passive: true });
      window.addEventListener('pointercancel', end, { passive: true });
      window.addEventListener('blur', () => { if (grabbed) dragEnd(); });
    } else {
      window.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;     // no gyro this pass: drift only on touch
        const w = window.innerWidth || 1, h = window.innerHeight || 1;
        px = clamp((e.clientX / w) * 2 - 1, -1, 1);
        py = clamp((e.clientY / h) * 2 - 1, -1, 1);
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => { px = 0; py = 0; });
    }
  }
  const qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0), RIGHT = new THREE.Vector3(1, 0, 0);
  function look(t, dt) {
    if (lookMode === 'pointer') {
      // B2: look.enabled only disables parallax + drift; reduced motion stills them too.
      const still = reduced() || !lookOn;
      if (still) { tgtYaw = 0; tgtPitch = 0; }
      else {
        const dYaw = amp * 0.5 * (Math.sin(fq[0] * t) + Math.cos(fq[2] * t));
        const dPitch = amp * 0.5 * Math.cos(fq[1] * t);
        // Look toward the pointer: pointer right → yaw right (negative about +Y),
        // pointer up (py < 0) → pitch up (positive about +X).
        tgtYaw = clamp(-px * parYaw + dYaw, -clampYaw, clampYaw);
        tgtPitch = clamp(-py * parPitch + dPitch, -clampPitch, clampPitch);
      }
    }
    // drag mode: the targets are the hand's; nothing moves them on their own.
    if (first) { curYaw = tgtYaw; curPitch = tgtPitch; first = false; }
    else {
      const k = 1 - Math.exp(-(grabbed ? dragSpeed : speed) * dt);
      curYaw += (tgtYaw - curYaw) * k;
      curPitch += (tgtPitch - curPitch) * k;
    }
    qYaw.setFromAxisAngle(UP, curYaw);
    qPitch.setFromAxisAngle(RIGHT, curPitch);
    camera.quaternion.copy(restQuat).multiply(qYaw).multiply(qPitch);
    camera.position.copy(restPos);                // the nodal point never moves
    camera.updateMatrixWorld();
  }

  // ── frame(t): everything derives from t seconds ─────────────────────────
  const w3 = [1, 0, 0];
  let phaseDeg = 0;
  function frame(t) {
    const dt = lastT == null ? 0 : clamp(t - lastT, 0, 0.1);
    lastT = t;
    // B2: the RGB mix is stilled by reduced motion ONLY — never by look.enabled.
    if (reduced()) { weights.set(1 / 3, 1 / 3, 1 / 3); applyGain(1, true); }
    else { mixWeights(t, w3, mixTimeScale, mixWobble); weights.set(w3[0], w3[1], w3[2]); applyGain(mixGain); }
    for (const [, mul, wv] of tempoMeshes) {
      if (reduced()) wv.set(1 / 3, 1 / 3, 1 / 3);
      else { mixWeights(t, wTmp, mixTimeScale * mul, mixWobble); wv.set(wTmp[0], wTmp[1], wTmp[2]); }
    }
    // grain: a new seed every frame (film), frozen under reduced motion; the
    // uniform is set on both materials (they share the value object? no — set both)
    const seed = reduced() ? 1 : (Math.floor(t * 60) % 4096) + 1;
    shellMat.uniforms.grainSeed.value = seed; panelMat.uniforms.grainSeed.value = seed;
    shellMat.uniforms.grainSize.value = grainSize * dpr; panelMat.uniforms.grainSize.value = grainSize * dpr;
    if (tween) {
      if (tween.t0 == null) tween.t0 = t;
      const u = clamp((t - tween.t0) / tween.dur, 0, 1);
      setMood(tween.from + (tween.to - tween.from) * easeInOutQuart(u));
      if (u >= 1) { const done = tween.onDone; tween = null; if (done) done(); }
    }
    if (motes) motes.material.uniforms.time.value = reduced() ? 0 : t;
    if (floorFog) floorFog.material.uniforms.time.value = reduced() ? 0 : t;
    shellMat.uniforms.time.value = reduced() ? 0 : t;
    const lu = reduced() ? 0 : (((t % waterLoopS) + waterLoopS) % waterLoopS) / waterLoopS;   // chain A (double)
    shellMat.uniforms.loopU.value = lu;
    if (waterCfg) updateLayers4d(shellMat.uniforms, layersCfg, lu);                           // layers4d: pure functions of u
    look(t, dt);
    const period = motes ? motes.material.uniforms.period.value : (mcfg.period_s || 10);
    phaseDeg = (((t % period) + period) % period) / period * 360;
  }

  function setUvMode(m) {
    uvMode = m === 'attribute' ? 'attribute' : 'projective';
    shellMat.uniforms.uvAttr.value = uvMode === 'attribute' ? 1 : 0;
  }

  // ── the seam ────────────────────────────────────────────────────────────
  const api = {
    scene, camera, padCam, padProj, shellMaterial: shellMat, panelMaterial: panelMat, motes, resize, preload, panelTextureBytes, uvCheck, cornerRatio,
    boot() { return true; },
    set(o) {
      if (!o) return api;
      if ('panel' in o) { o.panel === 'off' || o.panel == null ? panelOff() : panelOn(String(o.panel)); }
      if ('mood' in o && typeof o.mood === 'number') { tween = null; setMood(o.mood); resolvePanelState(); }
      if ('pointer' in o && o.pointer) { px = clamp(+o.pointer[0] || 0, -1, 1); py = clamp(+o.pointer[1] || 0, -1, 1); }
      if ('motes' in o && motes) motes.visible = !!o.motes;
      if ('uvMode' in o) setUvMode(o.uvMode);
      if ('gain' in o) { mixGain = Math.max(0, +o.gain || 0); applyGain(reduced() ? 1 : mixGain, reduced()); }
      if ('grain' in o) { grainAmount = Math.max(0, +o.grain || 0); applyGrain(grainAmount); }
      if ('contrast' in o) { contrastVal = Math.max(0, +o.contrast || 0); applyContrast(contrastVal); }
      if ('timeScale' in o) mixTimeScale = Math.max(0, +o.timeScale || 0);
      if ('ripple' in o && o.ripple && typeof o.ripple === 'object') {
        const rp = o.ripple, u = shellMat.uniforms;
        if ('amp' in rp) u.rippleAmp.value = Math.max(0, +rp.amp || 0);
        if ('scale' in rp) u.rippleScale.value = Math.max(0.01, +rp.scale || 3);
        if ('speed' in rp) { const d = u.rippleVel.value.clone(); if (d.lengthSq() < 1e-9) d.set(1, 0); u.rippleVel.value.copy(d.normalize().multiplyScalar(+rp.speed || 0)); }
        if ('dir' in rp && rp.dir && rp.dir.length === 2) { const sp = u.rippleVel.value.length(); u.rippleVel.value.set(+rp.dir[0] || 0, +rp.dir[1] || 0).normalize().multiplyScalar(sp); }
        if ('glint' in rp) u.rippleGlint.value = Math.max(0, +rp.glint || 0);
        if ('bump' in rp) u.waterBump.value = Math.max(0, +rp.bump || 0);
        if ('base' in rp) u.waterBase.value = Math.max(0, +rp.base || 0);
        if ('mode' in rp) { u.waterReflect.value = rp.mode === 'displace' ? 0 : 1; u.waterMaterial.value = rp.mode === 'material' ? 1 : 0; }
        if ('lod' in rp) u.waterLod.value = Math.max(0, +rp.lod || 0);
        // 'material' mode knobs (registry water.* names)
        if ('loop' in rp) waterLoopS = Math.max(0.001, +rp.loop || 10);
        if ('noiseScale' in rp) u.waterScale.value = +rp.noiseScale || 6;
        if ('detail' in rp) u.waterDetail.value = Math.max(0, +rp.detail || 0);
        if ('rough' in rp) u.waterRough.value = Math.max(0, +rp.rough || 0);
        if ('lacunarity' in rp) u.waterLacun.value = +rp.lacunarity || 2;
        if ('travel' in rp) u.waterTravel.value = +rp.travel || 0;
        if ('bumpStrength' in rp) u.bumpStrength.value = Math.max(0, +rp.bumpStrength || 0);
        if ('bumpDistance' in rp) u.bumpDistance.value = +rp.bumpDistance || 0;
        if ('bumpInvert' in rp) u.bumpInvert.value = rp.bumpInvert ? 1 : 0;
        if ('ior' in rp) { const ior = Math.max(1.0001, +rp.ior || 1.8); u.waterIor.value = ior; u.waterF0.value = Math.pow((ior - 1) / (ior + 1), 2); }
        if ('roughness' in rp) u.waterGloss.value = Math.max(0.001, +rp.roughness || 0.06);
        if ('alpha' in rp) u.waterAlpha.value = Math.min(1, Math.max(0, +rp.alpha || 0));
        if ('body' in rp) u.waterBody.value = Math.max(0, +rp.body || 0);
        if ('stripL' in rp && rp.stripL && rp.stripL.length === 2) u.stripL.value.set(Math.max(0, +rp.stripL[0] || 0), Math.max(0, +rp.stripL[1] || 0));
        if ('spread' in rp) u.stripSpread.value = Math.max(1, +rp.spread || 1);
        if ('reflectGain' in rp) u.reflectGain.value = Math.max(0, +rp.reflectGain || 0);
        if ('lodBias' in rp) u.reflectLodBias.value = +rp.lodBias || 0;
        if ('restLodBias' in rp) u.restLodBias.value = +rp.restLodBias || 0;
        if ('plateCap' in rp) u.plateCap.value = Math.min(1, Math.max(0, +rp.plateCap || 0));
        // field 'layers4d' knobs (registry water.field / water.layers4d): per-layer arrays of ≤ 3; shorter arrays leave
        // the rest, except layerAmp, whose length is the live layer count (entries past it are switched off).
        let layersTouched = false;
        if ('field' in rp) { waterFieldName = rp.field === 'layers4d' ? 'layers4d' : 'fbm3d'; u.waterFieldMode.value = waterFieldName === 'layers4d' ? 1 : 0; }
        if ('fieldGain' in rp) { layersCfg.gain = Math.max(0, +rp.fieldGain || 0); layersTouched = true; }
        if ('circleCentre' in rp && rp.circleCentre && rp.circleCentre.length === 2) { layersCfg.circle_centre = [+rp.circleCentre[0] || 0, +rp.circleCentre[1] || 0]; layersTouched = true; }
        for (const [key, f] of LAYER_KNOBS) {
          if (!(key in rp) || !Array.isArray(rp[key])) continue;
          const arr = rp[key];
          for (let k = 0; k < Math.min(3, arr.length); k++) {
            const n = +arr[k]; if (!Number.isFinite(n)) continue;
            layersCfg.layers[k][f] = f === 'scale' ? Math.max(1e-3, n) : (f === 'amp' || f === 'morph_r') ? Math.max(0, n) : n;
          }
          if (key === 'layerAmp') for (let k = arr.length; k < 3; k++) layersCfg.layers[k].amp = 0;
          layersTouched = true;
        }
        if (layersTouched) updateLayers4d(u, layersCfg, u.loopU.value);
      }
      if ('wobble' in o) mixWobble = Math.max(0, +o.wobble || 0);
      if ('moteSize' in o && motes) motes.material.uniforms.sizePx.value = Math.max(0, +o.moteSize || 0);
      if ('moteAlpha' in o && motes) motes.material.uniforms.alpha.value = Math.max(0, +o.moteAlpha || 0);
      if ('moteMaxScale' in o && motes) motes.material.uniforms.maxScale.value = Math.max(1, +o.moteMaxScale || 1);
      if ('moteGate' in o && motes && o.moteGate && o.moteGate.length === 2) motes.material.uniforms.gate.value.set(+o.moteGate[0] || 0, +o.moteGate[1] || 0.25);
      return api;
    },
    show() { return true; },
    stage() { return room; },
    // grab/orbit: the seam's hand, for pages and headless drivers. orbit(dx, dy)
    // takes fractions of the viewport (a full-width drag is dx = 1).
    grab(on) {
      if (lookMode !== 'drag' || !lookOn) return false;
      if (on === false) { dragEnd(); return true; }
      grabbed = true; grabTouch = false; gx = 0; gy = 0; gYaw = tgtYaw; gPitch = tgtPitch; activePointer = null;
      return true;
    },
    orbit(dx, dy) {
      if (!grabbed) return false;
      tgtYaw = clamp(gYaw + (+dx || 0) * dragYawPerW, -clampYaw, clampYaw);
      tgtPitch = clamp(gPitch + (+dy || 0) * dragPitchPerH, -clampPitch, clampPitch);
      return true;
    },
    hit() { return false; },
    view(name) { return name === 'off' || name == null ? panelOff() : panelOn(String(name)); },
    state() {
      return {
        room, regime: 'locked', variant: variant || null, phase: phaseDeg, t: lastT,
        lookMode, grabbed, release: releaseMode,
        yaw: curYaw / DEG, pitch: curPitch / DEG, targetYaw: tgtYaw / DEG, targetPitch: tgtPitch / DEG,
        weights: [weights.x, weights.y, weights.z], gain: shellMat.uniforms.gain.value, grain: grainAmount, contrast: contrastVal, rest: textures.restSource || null, mood, panel: panelState, panelKey, hasContent: !!hasContent,
        fov: camera.fov, aspect: camera.aspect, view: [viewW, viewH, dpr], fit: fitMode, frame: lookMax.frame, restAspect, restRect: [restRect.x, restRect.y, restRect.z, restRect.w],
        clamp: [clampYaw / DEG, clampPitch / DEG], lookMax, uvMode, shellTris,
        motes: { count: motesCount, source: motesSource, visible: !!(motes && motes.visible),
          size_px: motes ? motes.material.uniforms.sizePx.value : null, alpha: motes ? motes.material.uniforms.alpha.value : null,
          max_scale: motes ? motes.material.uniforms.maxScale.value : null, gate: motes ? [motes.material.uniforms.gate.value.x, motes.material.uniforms.gate.value.y] : null },
        fog: { time_scale: mixTimeScale, wobble: mixWobble, gain_overrides: overriddenMeshes, tempo_overrides: tempoMeshes.map(([n, m]) => [n, m]) },
        water: waterMesh ? { mesh: waterMesh.name, mode: shellMat.uniforms.waterMaterial.value > 0.5 ? 'material' : (shellMat.uniforms.waterReflect.value > 0.5 ? 'reflect' : 'displace'),
          material: { loop_s: waterLoopS, loop_u: +shellMat.uniforms.loopU.value.toFixed(4), noise: { scale: shellMat.uniforms.waterScale.value, detail: shellMat.uniforms.waterDetail.value, roughness: shellMat.uniforms.waterRough.value, lacunarity: shellMat.uniforms.waterLacun.value }, travel_m: shellMat.uniforms.waterTravel.value, bump: { strength: shellMat.uniforms.bumpStrength.value, distance: shellMat.uniforms.bumpDistance.value, invert: shellMat.uniforms.bumpInvert.value > 0.5 }, ior: shellMat.uniforms.waterIor.value, roughness: shellMat.uniforms.waterGloss.value, alpha: shellMat.uniforms.waterAlpha.value, body: shellMat.uniforms.waterBody.value, strip: { rect: shellMat.uniforms.stripRect.value.toArray(), core: shellMat.uniforms.stripCore.value.toArray(), radiance: shellMat.uniforms.stripL.value.toArray(), spread: shellMat.uniforms.stripSpread.value }, reflect_gain: shellMat.uniforms.reflectGain.value, reflect_lod_bias: shellMat.uniforms.reflectLodBias.value, rest_lod_bias: shellMat.uniforms.restLodBias.value, plate_cap: shellMat.uniforms.plateCap.value,
            field: waterFieldName, layers4d: { gain: layersCfg.gain, circle_centre: layersCfg.circle_centre.slice(), live: layersCfg.layers.filter(L => L.amp > 0).length, layers: layersCfg.layers.map(L => Object.assign({}, L)) } },
          bump: shellMat.uniforms.waterBump.value, lod: shellMat.uniforms.waterLod.value, f0: +shellMat.uniforms.waterF0.value.toFixed(4), base: shellMat.uniforms.waterBase.value, room: [shellMat.uniforms.roomMin.value.toArray(), shellMat.uniforms.roomMax.value.toArray()], phase: waterPhase == null ? 'mean' : waterPhase, amp: shellMat.uniforms.rippleAmp.value, scale: shellMat.uniforms.rippleScale.value, speed: +shellMat.uniforms.rippleVel.value.length().toFixed(4), dir: [+shellMat.uniforms.rippleVel.value.clone().normalize().x.toFixed(2), +shellMat.uniforms.rippleVel.value.clone().normalize().y.toFixed(2)], glint: shellMat.uniforms.rippleGlint.value, ref_m: shellMat.uniforms.rippleRef.value } : null,
        sky: skyWhite ? 'white' : 'baked',
        placeholder: !!(bake && bake.placeholder), beautySource: textures.beautySource || null,
      };
    },
    frame,
    snap() { return null; },
  };
  return api;
}
