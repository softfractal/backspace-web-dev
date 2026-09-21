# world/ — the backspace world runtime

The three.js world that renders **behind** the DOM chrome. `home.html` carries an
importmap (`three` → `assets/3d/three/three.module.js`), an `<img id="bs-world-poster">`
with a **static** `src` (the base LQIP, so the poster is there at first paint before any
script) under a `<canvas id="bs-world">` (z 0 / z 1, both `pointer-events:none`; the chrome
sits at z 10+), and `<script src="world/boot.js">` — a **classic** script. No CDN, no bundler.

## File layout (one room = one folder)

```
world/registry.json              one entry per room (this file's keys, below)
world/boot.js                    CLASSIC bootstrap: file:// / no-WebGL2 / import failure → visible notice,
                                 then import('./world.js') (resolves 'three' through the page importmap)
world/world.js                   boot ladder + governor (all rooms)
world/rooms/home.js              the home room module
world/rooms/home/home.glb        SHIP meshes, Y-up, meshopt, no materials, TEXCOORD_0 = uv_proj,
                                 camera node bs_home_cam (display lens), panel mesh bs_home_panel (0-1 UV),
                                 optional bs_home_motes POINTS primitive (POSITION + _JITTER)
world/rooms/home/home_beauty_rgb.ktx2   beauty, UASTC sRGB + mips + zstd; R,G,B = fog phase 0/120/240°
world/rooms/home/home_beauty_rgb.png    the same, 8-bit dithered — fallback when KTX2 fails
world/rooms/home/home_poster.jpg        at-rest crop of the phase-0 channel, 1910 px
world/rooms/home/home_lqip.jpg          the same, 64 px
world/rooms/home/home_bake.json         the freeze record (camera, padding, at-rest uv, sizes, motes …)
world/rooms/home_paneloff/               the seed's original OFF-state bake at 1920, kept as a record (?variant=paneloff)
world/rooms/home_1920/                   the first lit bake at 1920 wide (?variant=w1920) — home/ is the 3840 master
world/rooms/home_256/                    the 256-spp pack the 1024 final replaced (?variant=s256)
world/rooms/home_v1/                     the Sept 15 home final (old Painter maps, fog ×1, 16:9 at-rest layer; ?variant=v1)
                                         — home/ is now the Sept 17 pack: re-unwrapped atlas + Eric's new Painter maps,
                                         fog ×2 / 0.6, camera fit Vertical, 32:9 at-rest layer 7680×2160, 25.4 MB wire
                                         (?variant=v2 aliases it)
world/rooms/community/                   the community room (Sept 19 07:38, CANONICAL): Eric's 02:36 file at 24 mm / x 7 / z 2.0 level
                                         (the design team's composition: glowing wall, two beams per side), Community Painter set,
                                         fog x2 / 0.6, padded 3840 / 1024 + 32:9 at-rest 7680x2160 / 1024, 23.7 MB wire; ?variant=v2
                                         aliases it; ?variant=v1 = the 36 mm padded-only first pack (rooms/community_v1)
world/rooms/support_v4/                  the support room (Sept 21 08:20, CANONICAL = V4): Eric's own build -- 5 m tall, lights 150 / 150 / 50 W,
                                         the floor-ish fog IN THE BAKE; padded 3840/1024 (13.5 MB wire) + the 32:9 rest layer (14.8 MB); 41 MB on disk
                                         ?variant=v4 aliases it; v3 = the 4 m room at 50 % light, v2 = the L12 look, v1 = the first bake
world/rooms/support_v3/                  the support room (Sept 21 00:10, CANONICAL = V3): Eric's own directive build -- one uniform clumpy fog
                                         (0.02 + wisps x0.2, aniso 0.6), two stacked top lights + a tilted roof wash + a floor skim light, all four at 50 %
                                         (1000 / 800 / 400 / 50 W); padded 3840/1024 (14.9 MB wire) + the 32:9 rest layer (15.4 MB); 44 MB on disk; contrast 1.0
                                         ?variant=v3 aliases it; ?variant=v2 = the L12 reference-matched look; ?variant=v1 = the first bake
world/rooms/support/                     the support room -- Sept 20 12:20: Eric asked for v1 back: registry dir = rooms/support_v1 (padded ONLY); this folder holds V2 / L12
                                         (reference-matched: exp height fog with glowing wisps, soft 2.4 m / 36 deg beam, feathered cone, wet floor) = ?variant=v2;
                                         padded 3840/1024 + 32:9 rest (done Sept 20 10:22, 39 MB on disk); contrast 1.0; report §16
world/rooms/support_v1/                  v1 (Sept 20 02:03; one room-filling fog 0.08, 600 W; PADDED ONLY -- bake the 32:9 rest if it ships) = the canonical dir since 12:20
world/rooms/support_preview/             LOW-QUALITY composition preview (Sept 19 16:58; 1920 / 32 spp, padded only, ?variant=preview) of Eric's 16:33 Support.blend +
                                         fix_support_fog_wetfloor.py (roles renamed, fog base density 0.02, M_bs_support_floor water-film coat) -- NOT for shipping
world/rooms/software/                    the software room, v5 (Sept 19 13:23, CANONICAL): Eric's 02:36 file at 24 mm / x 7 / z 2.0 level,
                                         slit 10 cm at z 1.2, two beams per side, Software Painter set, plate copy (camera rays skip the
                                         water's reflection: the live 'material' water carries it, core radiance 25 / reflect_gain 1.0 /
                                         IOR 4), fog x2 / 0.6, padded 3840 / 1024 + 32:9 at-rest 7680x2160 / 1024, 22 MB wire;
                                         ?variant=v5 aliases it
world/rooms/software_v3/                 the 36 mm / 4 m-room v3 plate pack (Sept 18 12:05; ?variant=v3 -- its water strip was at z 2.0,
                                         set strip/core y 2.0 and core radiance 60 live to compare)
world/rooms/software_v2/                 the v2 pack (Sept 18 04:21, the full water baked into the plate; ?variant=v2 — needs water.plate_cap
                                         0.09 + mix.gain_overrides {"water": 1} to look right, set them live)
world/rooms/software_v1/                 the first software pack (camera x 5, padded half only; ?variant=v1)
world/rooms/hardware/                    the hardware room (Sept 20 00:10, CANONICAL = V5): Eric's Sept 19 14:50 file, camera (7, 0, 1.0) tilted 5 deg
                                         up, 36 mm, HDRI ramp 0.195->0.30; padded 3840/1024 + the 32:9 at-rest layer (7680x2160/1024); 41 MB on disk,
                                         wire 13.3 MB padded + 14.5 MB rest; the sky opening is painted white at runtime; ?variant=v5 aliases it
world/rooms/hardware_v4w/                the previous canonical (Sept 17: camera x 6, padded + 32:9 rest, 38 MB; ?variant=w32) -- v4 look, kept
                                         [the row below is the old description of that pack]
                                         the hardware room, same file set with the bs_hardware_ prefix — the 1024-spp FINAL
                                         with the 32:9 AT-REST LAYER (Sept 17: rest 7680×2160, vfov held, rest.uv_rect
                                         u 0.027–0.973; padded half from the Sept 16 19:48 file: Painter maps of 12:30,
                                         normal strength 0.25, fog ×2 / 0.6, sky carrier; 22.0 MB wire); ?variant=w32 aliases it
world/rooms/hardware_preview/            LOW-QUALITY composition preview (Sept 19 14:45; 1920 / 32 spp, padded only, ?variant=preview) of Eric's 14:34 file
                                         (camera (7,0,1.0) 5 deg up, brightened HDRI ramp); approved for composition 15:05 -- NOT for shipping; the real v5 bake is HELD
world/rooms/hardware_v4/                 the same padded half with the 16:9 at-rest layer (14.9 MB; ?variant=v4)
world/rooms/hardware_v3/                 the 1024 final before the fog change (fog ×1 / 0.3; ?variant=v3)
world/rooms/hardware_v2/                 the 256-spp look pass of the same maps at normal strength 0.50 (?variant=v2)
world/rooms/hardware_v1/                 the old-texture 1024 pack (?variant=v1) — its specular "bumps" were the old maps
world/rooms/hardware_256/                the old-texture 256 pack (?variant=s256)
```
`home_bake.json.placeholder: true` marks synthetic stand-ins; the room reports it in `state()`.

## Registry keys (`rooms.home`)

Every path is relative to `World/` (the folder of `home.html`), except `bake`, `glb`,
`beauty.*`, `poster`, `lqip`, which are relative to `dir`.

| key | meaning |
|---|---|
| `regime` | `locked` — the camera rotates in place, never translates |
| `module`, `dir` | room module; asset folder |
| `camera` | `source: gltf, index` — pose + fov come from `gltf.cameras[index]`; `near`, `far` |
| `hidden_nodes` | mesh names the runtime hides. The door wall must NOT be in the GLB (Sept 15 ruling); if a `front wall` / `bs_home_front` mesh arrives it is hidden and `?dev` warns loudly |
| `look` | `mode` `drag` (default) or `pointer`; drag: `drag_yaw_deg_per_width` (40), `drag_pitch_deg_per_height` (20), `drag_speed` (14), `release` `return`/`hold`, `speed` (return rate, 1.5); pointer (R-B): `amplitude_rad`, `freq[3]`, `parallax_yaw/pitch_deg`; both: `clamp_yaw/pitch_deg` (clamped to ≤ the bake's padding, then to the corner rule below); `enabled:false` disables the hand / parallax + drift ONLY |
| `mix` | R-A weights (`normalize`), `gain` = fog-breathing contrast around the three phases' static mean (1 = plain mix; shipped 3 — the phases differ by ≈ 1 code value, so the plain mix is invisible), `time_scale` = fog tempo (1 = the case study's §2.6 clock; shipped 0.3, every cycle 3.3× longer — Eric, Sept 16: calmer), `wobble` = the inner 1.4–4.3 rad/s tremor of §2.6 (1 = verbatim, 0 = off; shipped 0.3), `contrast` / `contrast_pivot` = display-space grade (per room: hardware 1.10, home 1.20, software 1.20; pivot 0.5), `gain_overrides` = `{role: gain}` per-mesh fog-breathing gain keyed by the name suffix after `bs_<room>_` (software: `{"water": 1}` — the water's phases differ 10× more than the walls', so it crossfades at 1 while the fog keeps 3; applied by swapping the shared material's gain uniform around that mesh's draw), `tempo_overrides` = `{role: multiplier}` of `time_scale` per mesh (software water ×4: its own weight set, swapped the same way), `mood_gain` = how much the mood scalar lifts the shell (×(1+mood_gain·mood)), `uv_mode`: `projective` (default) or `attribute` (TEXCOORD_0 fallback) |
| `panel` | `node`, `default` state, `power_on_s`, `content{key: url}`, optional `tint` (content multiplier, default white) |
| `sky` | `{ "override": "white" }` paints the bake's sky carrier (`bs_<room>_sky`, the quad above the ceiling opening) pure white at runtime — the design team's bright-sky opening (hardware, Sept 19) — with no rebake; the room's baked sky-lighting and fog stay as baked. Absent = the baked sky. `state().sky` |
| `water` | (software) live water on one shell (`mesh` role suffix, default `water`; `enabled`). `mode` `material` (default since Sept 18): the exact GLSL port of `M_bs_software_water` — Blender's perlin/fBm noise (`noise.scale/detail/roughness/lacunarity`, real lookup3 hash, analytic gradient), the 10 s loop (`loop_s`; chain A's clock `loopU = (t mod loop_s)/loop_s`, 0 under reduced motion), the two `travel_m` offsets along Blender +Y crossfaded on u (seamless) — that is `field` `fbm3d`, kept live for A/B; `field` `layers4d` (default since Sept 18 — Eric: the fbm3d shapes slid rigidly, "a png flowing from right to left") replaces the fBm by `layers4d.layers[]`: three single-octave 4D Noise layers (`scale` cells/m; `amp` weight — each layer's share of h − 0.5 is `gain`·amp/Σamp, gain 0.97 restores the Fac std 0.075), each sampled on a circle of radius `morph_r` cells around `circle_centre` in (z, W) (in-place morph that closes exactly on the loop; `morph_phase` de-phases the layers' circles) and drifted `travel_m` m per loop along Blender +Y rotated by `spread_deg` through a cos/sin crossfade of two copies (`stagger` offsets each layer's fade: one layer mid-fade at a time); rules: travel_m·scale·cos(spread_deg) ≥ 2 cells (flat variance, no mid-loop dip), morph_r ≤ 0.5 (one (z, W) cell); an absent layer or `amp` 0 is skipped (32 hashes each; 96 hash4 per fragment for three); `fallback_drop_middle` is the two-layer retune if frame time drops; the same node tree is applied in `3Ds/Scenes/Software/_work/Software_water_variation.blend` by `3Ds/scripts/make_water_tree.py` (`_ab.blend` = the copy that keeps fbm3d behind a FIELD switch; frame f = loop phase f/240; `3Ds/scripts/eval_water_field.py` renders the field to EXR for a pixel check), Cycles' Bump (`bump.strength/distance/invert`), exact dielectric Fresnel (`ior`), GGX (`roughness`) as a glossy mip of the room off the ray-box, `alpha` (Principled alpha: the straight-through share), `base` (body, linear), the light slit and strip lamp as analytic emitters (`strip.{x,y,half_h,half_w,radiance,spread}`, `strip.core.{…}` in bake-white look units), `reflect_gain` (fog transmittance of the reflected path), `reflect_lod_bias`, `rest_lod_bias` (log2 of rest/padded texel density), `plate_cap` (per-channel cap on the sheet's own baked pixel — 0.09 while the plate still carries the static reflection; 1 = off once the v3 plate bake is canonical). Needs `mix.gain_overrides {"water": 1}` while `plate_cap` < 1. `mode` `reflect` / `displace` are the earlier runtime models and stay selectable (`set({ripple:{mode}})`; their keys `bump`, `reflect_lod`, `ripple_*`, `glint`, `atten_ref_m`, `phase` are kept under `legacy` and at the top level). Live: `set({ripple:{loop, noiseScale, detail, rough, lacunarity, travel, bumpStrength, bumpDistance, bumpInvert, ior, roughness, alpha, body, stripL:[slit,core], spread, reflectGain, lodBias, restLodBias, plateCap, mode, field:'layers4d' or 'fbm3d', fieldGain, circleCentre:[z,w], layerScale/layerAmp/layerTravel/layerMorph/layerStagger/layerMorphPhase/layerSpread:[…≤3]}})` (per-layer arrays: shorter arrays leave the rest, except `layerAmp`, whose length is the live layer count), `state().water.material` (`.field`, `.layers4d {gain, circle_centre, live, layers[]}`). NOTE (Sept 18): the shell material is shared by every shell mesh, so every per-mesh uniform swap (water mode, `gain_overrides`, `tempo_overrides`) raises `uniformsNeedUpdate` around that mesh's draw — without it three.js uploads a shared material's uniforms only for the first mesh and the swaps never reach the GPU (the reason no earlier water pass ever drew). |
| `motes` | `enabled`, `count` (seeded generator only), `size_px` (CSS px at `atten_ref_m`, scaled by the device pixel ratio; shipped 2.5), `alpha` (additive peak, before the beauty gate; shipped 0.4), `beauty_gate` + `gate_lo`/`gate_hi` (the beauty luminance the gate opens across; shipped 0.01–0.12 so the dark hardware room shows its motes), `atten_ref_m` (distance at which a mote is exactly size_px), `max_scale` (a mote is never larger than this × size_px — the near-camera blow-up; shipped 1.5), `seed`; the physical formula constants come from `home_bake.json.motes`. Live: `set({moteSize, moteAlpha, moteGate:[lo,hi], moteMaxScale, timeScale, wobble})` |
| `governor` | `dpr_cap`, `idle_s`, `idle_fps`, `resolve_s` (canvas fade-in over the poster), `blur`: `idle` (shipped — an unfocused but visible window ticks at idle_fps; only a hidden document pauses) or `pause` (the seed's rule) |
| `budget` | `wire_bytes`, `vram_bytes`, `tris` — reported by `stats()`, not enforced yet |
| `variants` | `{key: {dir, …}}` — `?variant=<key>` merges that object over the room entry (a variant normally only changes `dir`, so its folder carries its own bake/glb/beauty/poster/lqip) |

## Boot ladder (`boot.js` → `world.js`)

`boot.js` (classic, runs from `file://` too): `location.protocol === 'file:'` → notice with the
`python3 tools/dev-server.py 8481` hint; no WebGL2 context → notice; else `import('./world.js')`
with `.catch(notice)`. It exports the notice as `window.__bsWorldNotice`; `world.js` delegates
its own failures to it, so there is one notice element either way. Failing to a black screen is
against the law (seed §4).

`world.js`: registry (+ variant merge) → poster upgrade (static LQIP → variant LQIP if different →
full poster once decoded) → `WebGLRenderer` (fails visibly if WebGL is missing) → `import(module)` +
`home_bake.json` → **one gate**: `Promise.all([GLB, beauty])` through one `LoadingManager`; beauty =
KTX2 (`KTX2Loader`, transcoder at `assets/3d/three/jsm/libs/basis/`) falling back to the PNG with
`flipY=false` → `createHomeRoom(...)` → resize → **R-G warm-up** (`renderer.compile` + one render into
a 1×1 target; the panel's content sampler is already bound to a 1×1 black `DataTexture`, so the
program set is complete here — `programs()` under `?dev` must not grow on the first power-on) →
first frame → **only the canvas fades in** over the opaque poster (`resolve_s`), the poster is hidden
on the canvas's `transitionend` → idle-time preload of the four panel textures → rAF loop.

Governor: DPR = `min(devicePixelRatio, dpr_cap)`; pause on window `blur` **and** on
`visibilitychange` hidden, resume on `focus` **and** visible (never `document.hidden` alone);
after `idle_s` without pointer/key/wheel input the loop skips rAF callbacks to hold `idle_fps`;
`prefers-reduced-motion` → weights (1,0,0), drift, parallax and motes stilled (`look.enabled:false`
stills only drift + parallax; the RGB mix keeps breathing). All listeners are passive; the module
never calls `preventDefault` and never owns wheel/touch.

## Shader math (`rooms/home.js`)

- **Projective UV (the one projection).** `padProj = P_pad · V_rest`, the padded camera = display
  pose from the GLB, `fov_y = bake.camera.vfov_padded_deg`, aspect = beauty w/h. Vertex:
  `vProj = padProj · modelMatrix · position`. Fragment: `uv = (0.5 + 0.5·x/w, 0.5 − 0.5·y/w)`
  clamped to [0,1]; `w ≤ 0` → black. The beauty is a top-left-origin texture (KTX2 orientation
  `rd`, PNG `flipY=false`), hence the `−` on v — verified: at every shell vertex the projected uv
  equals TEXCOORD_0 to ≤ 1.3e-3 (meshopt quantization; the placeholder GLB gave 1.1e-6) (`room.uvCheck()`, logged under `?dev`); the flipped hypothesis is
  off by 0.36–3.2. Per-vertex `uv_proj` is exact only at vertices (affine interpolation of a
  projective map is wrong across any triangle spanning depth: 0.39 frame widths at the left wall's
  midpoint), so `mix.uv_mode: "attribute"` exists as a fallback/diagnostic, selected by a uniform
  (one program either way).
- Shell: `y = dot(texture2D(map, uv).rgb, weights) · (1 + lift) · inside`; `gl_FragColor = vec4(vec3(y),1)`
  then `#include <colorspace_fragment>`. The sRGB texture decodes to linear on sample, the mix is
  linear, the renderer's `outputColorSpace = SRGB` re-encodes. `toneMapped:false`, `NoToneMapping`
  — the beauty already carries AgX.
- **Panel** (`ShaderMaterial`, `toneMapped:false`): `off = beauty projected as above (same weights,
  same lift)`, `c = texture2D(content, TEXCOORD_0).rgb · tint`, `color = mix(off, c, moodMask)` with
  `moodMask = mood × hasContent`, mixed in linear light. At mood 0 the panel is exactly the baked
  OFF panel (with the room's bounce and fog in front of it); at mood 1 with content bound it is
  exactly the content. The content sampler always holds a texture (1×1 black until a key binds).
- Weights (case study §2.6, then normalized):
  `rR = 0.2+|sin(0.456t+3.222+0.1·sin(4.331t+1.234))|·0.8`,
  `rG = 0.2+|sin(0.138t+2.456+0.2·cos(1.447t+2.564))|·0.8`,
  `rB = 0.2+|sin(0.265t+1.325+0.3·sin(2.524t+3.663))|·0.8`, `w = (rR,rG,rB)/(rR+rG+rB)`.
- Camera: pose = `gltf.cameras[0].matrixWorld`; `hfov_d` from `home_bake.json.camera`; `vfov_d` is the
  GLB camera's yfov (the exporter writes the 16:9 frame's vertical fov under HORIZONTAL fit:
  2·atan(tan(hfov/2)·9/16) = 31.417° for 36 mm — the 36×24 sensor's 36.87° is not the frame's; a freeze
  record that disagrees by > 0.5° is warned about under `?dev` and the GLB wins; an `at_rest_uv` whose
  v-extent ≠ u-extent is warned about too). Cover-crop: aspect ≥ 16/9 → `fov_y = 2·atan(tan(hfov_d/2)/aspect)`,
  else `fov_y = vfov_d` (the stage's `project()` precedent). Position is copied back every frame.
- Look — **mode `drag` (default; Eric, Sept 15: the camera is static at rest and turns only while
  dragged).** A press that begins on the backdrop (`body`, `#bs-stage`, the canvas or the poster — never
  on a chrome control) grabs the room: while the hand is down the target is
  `yaw = yaw₀ + (dx / viewportWidth) · drag_yaw_deg_per_width` (a full-width drag turns 40°) and
  `pitch = pitch₀ + (dy / viewportHeight) · drag_pitch_deg_per_height`, so the room follows the hand
  (drag right → the camera yaws left), clamped to the effective clamp; touch fingers only yaw, because
  the chrome's drum owns vertical finger travel. Chase rate `drag_speed` (14) while grabbed; on release
  the target returns to rest (`release: "return"`) at `speed` (1.5), or stays (`"hold"`). Nothing moves
  the camera on its own: no parallax, no idle drift. Listeners are window-level and passive; nothing is
  preventDefault-ed. The seam mirrors it: `grab(true)` … `orbit(dx, dy)` (viewport fractions) … `grab(false)`.
  Mode `pointer` (R-B as the case study had it) stays selectable: target = pointer parallax
  (`−px·parallax_yaw`, `−py·parallax_pitch`) + drift `A·½(sin .26t + cos .23t)` yaw, `A·½ cos .27t` pitch.
  Both modes: `cur += (tgt−cur)·(1−e^(−k·dt))`, dt from the rAF clock clamped to 0.1 s, applied as
  `q = q_rest · q_yaw(local +Y) · q_pitch(local +X)`; the nodal point never moves.
- **Clamps and the corner rule.** The clamps are a box in (yaw, pitch) but the padded frame is a
  rectangle in tan-space, so a box corner can leave the beauty. On every resize the room computes,
  for the CURRENT frame (fit `height`: the display vfov at the screen's aspect — a 21:9 frame is wider than 16:9, so its clamps come out smaller), the corner overshoot ratio
  `max(|x|/tan(hfov_p/2), |y|/tan(vfov_p/2))` of the four display corners rotated by `q_yaw·q_pitch`,
  at (a) the registry clamp and (b) the **reachable maximum** — in drag mode the clamp itself (a hand
  can take the target to the clamp); in pointer mode `parallax + drift max` (drift yaw ≤ A, pitch ≤ A/2;
  10°+5.73° = 15.73°, 5°+2.86° = 7.86°). If the ratio at the reachable max exceeds 1.0 the clamp box is
  shrunk uniformly (bisection) until it does not; the effective clamp is what `state().clamp` reports
  and `?dev` logs both ratios (`state().lookMax`). Shipped, drag mode: ratio 1.071 at the 20°/10° box →
  shrunk to ≈ 18.7° / 9.3° so the corners of a fully dragged view stay inside the beauty.
- Mood (R-E): one scalar 0..1; setter → panel `moodMask` and shell/panel `lift = mood·mood_gain`.
  Power-on tween `easeInOutQuart` over `power_on_s`, interruptible (a new tween starts from the
  current value). States: `off → power_on → content:<key>`; off again via `power_off`. A content
  load failure powers the panel off again (never a white quad). A direct `set({mood})` resolves the
  state consistently: `off` at 0 (content unbound), `content:<key>` at 1 with a key bound, else `power_on`.
- Motes: home positions **from the GLB** when it carries a `bs_home_motes` POINTS primitive
  (GLTFLoader → `THREE.Points`; its `_JITTER` attribute arrives as `geometry.attributes._jitter` —
  both spellings are read; the node's matrixWorld is applied if not identity; the loader's Points
  object is removed and a Points with the mote material is rebuilt on the same buffers), else the
  seeded generator (uniform in `bake.motes.bounds_world`, mulberry32 `seed`, jitter u∈radius_jitter).
  The `home` attribute is always **Blender Z-up** (GLB positions are converted (x, −z, y) once on
  the CPU) so the authored formula reads verbatim in the vertex shader:
  `θ = 2π·(t mod period)/period`, `p = home + amplitude·(noise3((home + circle_radius·(cos θ, sin θ, 0))·noise_scale) − 0.5)`,
  noise3 = 2-octave value-noise FBM ×3 offsets; then `(x, z, −y)` to Y-up. Point size
  `size_px·jitter·DPR·atten_ref/−z_view`, min 1 px; additive, `depthWrite:false`, never frustum-culled.
  Alpha = `alpha · smoothstep(.02,.25, luma)` where luma is the mixed beauty sampled at the point's
  projection through the same `padProj`. `state().motes = {count, source: 'glb'|'seeded'|'none', visible}`.
- Draw order: shell (0) → panel (1) → motes (2).

## Seam api (`createHomeRoom` returns it)

`boot · set({panel, mood, pointer, motes, uvMode}) · show · stage · grab(false) · orbit(false) · hit(false) ·
view(key|'off') · state() · frame(tSeconds) · snap(null)`, plus `scene`, `camera`, `padCam`, `padProj`,
`resize(w,h,dpr)`, `preload()`, `uvCheck()`, `cornerRatio(yaw, pitch)`. `state()` → `{room, regime, variant,
phase, t, yaw, pitch, targetYaw, targetPitch, weights, mood, panel, panelKey, hasContent, fov, aspect, view,
clamp, lookMax, uvMode, shellTris, motes{count, source, visible}, placeholder, beautySource}`.

## Variants — `home.html?variant=paneloff`

`registry.rooms.home.variants.paneloff = {"dir": "world/rooms/home_paneloff/"}`. The same module loads
that folder's `home_bake.json`, `home.glb`, beauty, poster and LQIP (the static LQIP in the HTML is the
base room's; `world.js` swaps it for the variant's before upgrading to the poster). `state().variant`
names the active one; an unknown key fails visibly.

## Dev hooks — `home.html?dev`

`window.__bsWorld = { state(), frame(t) (scrubs the clock and pauses the loop), play(), set(o),
view(k), programs() (renderer.info.programs.length — compare before/after view('desk')), stats()
(renderer.info, estimated texture bytes, `performance` resource sizes for world/ files, gate/warm-up ms,
canvas size, budget), room, renderer, scene, camera, registry, bake }`. `?dev` also logs the
projective-uv check, the look clamp / reachable / ratio line, the motes source, and warns on a front
wall in the GLB or a disagreeing freeze record.
