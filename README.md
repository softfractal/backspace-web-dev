# backspace — web dev build · **3d-worlds branch**

**This branch is not `main`.** It is the same five pages with a baked 3D room behind each one,
published separately so the demo site and the regular site never share a URL.

| | `main` | `3d-worlds` (here) |
|---|---|---|
| Behind the interface | black stage | a baked 3D room per page |
| Weight | ~8 MB | ~230 MB |
| Runs from `file://` | yes | **no — needs a server** |

Everything in front of the stage — navigation, input, glow, cursor, i18n, routing — is unchanged
from `main`. Only the backdrop is new.

## Run it

A static server is **required** on this branch. The pages load ES modules and fetch the room
manifest, and both are blocked on `file://`.

```
python3 -m http.server 8080
```

Then open <http://localhost:8080/> (redirects to `home.html`). Any static server works.

## The five rooms

| Page | Room |
|---|---|
| `home.html` | home |
| `hardware.html` | hardware |
| `software.html` | software — the water is live, not baked |
| `community.html` | community |
| `support.html` | support |

Each room was rendered once in Blender at 1024 samples from a fixed camera, then displayed on a
handful of flat surfaces, so the browser never lights or shades anything. Drag the backdrop to look
around; the view eases back on release. Fog drifts continuously — three renders of the room at
different fog states are packed into one image and cross-faded live.

Each room ships two layers: a padded one the drag-look reads from, and a 32:9 layer that fills
ultrawide screens without stretching.

## What to look at

The rooms only. Lighting, fog, materials and the framing of each space are the deliverable here.
Everything else on these pages is the same interface as `main` and was signed off separately.

## Layout (what this branch adds)

| path | role |
|---|---|
| `world/world.js` · `world/boot.js` | the runtime: loads a room, drives the look and the fog |
| `world/registry.json` | per-room settings — which pack, brightness, contrast, fog tempo |
| `world/rooms/home.js` | the shader the rooms are drawn with |
| `world/rooms/<room>/` | one baked room each: geometry, textures, poster |
| `assets/3d/` | vendored three.js, its KTX2 transcoder, and the product-stage bake |
| `shared/bs-stage3d.js` · `hardware-3d.html` | the separate product stage, linked from home and hardware |

`world/README.md` documents every registry key.

## Notes

- Support's pack is named `support_v4` — the fourth and final bake of that room. The name is what
  the registry points at; it is not a draft.
- A room can be re-graded for brightness and contrast without re-rendering, in `world/registry.json`.
- First load of a page fetches 20–25 MB of room textures. They cache after that.
