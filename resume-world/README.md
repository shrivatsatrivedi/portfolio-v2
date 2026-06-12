# Résumé World

A cinematic, interactive 3D portfolio experience. Shrivatsa's résumé is a
city-block-sized sheet of paper; a stylised character walks around it,
introduces every section, and survives two chaos modes (rain that washes
the ink away, and a flood you can swim through).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move (Shift to run) |
| Space | Jump (dive while swimming) |
| E | Sit on a heading block |
| Click | Walk to that point |
| Double-click | Run to a section and hear about it |
| T | Toggle top-down / third-person camera |
| Pinch (ctrl+scroll) | Blend the camera tilt, Apple Maps style |
| Scroll | Pan around the page |
| R | Rain mode — storm + ink dissolve |
| F | Flood mode — rising water + breath bar |

On touch devices a joystick appears bottom-left and a jump button
bottom-right; tap = click, double-tap = double-click.

## Implementation notes

- **Pure Three.js + vanilla JS** (no UI framework), bundled with Vite.
- **Physics is a custom kinematic controller** (`src/character/CharacterController.js`):
  gravity, jump impulses, and AABB collision against the heading blocks.
  The world is one flat plane plus six boxes, so a full physics engine
  (Rapier) would add WASM weight without changing the feel — swap it in
  there if you later need stacked/dynamic bodies.
- **Raycasting** is a single ray-vs-ground-plane intersection plus a 2D
  rect lookup (`sectionAt`), so no BVH is needed.
- **The character is procedural** (capsules + toon materials + glowing
  eyes) with a code-driven animation state machine: idle, walk, run, jump,
  sit, cry, three swim states, and celebrate. To use a Mixamo GLB instead,
  drop `character.glb` into `public/character/` and replace the rig build
  in `src/character/Character.js` with a GLTFLoader + AnimationMixer.
- **The résumé texture is painted at runtime** onto a 2048px canvas
  (`src/world/ResumeGround.js`) from the same world-space layout constants
  that drive the clickable sections, so paper and hit-boxes never drift.
- **Ink dissolve** is injected into the ground's `MeshStandardMaterial`
  via `onBeforeCompile` (procedural fbm noise, no noise texture), keeping
  full PBR lighting during the effect.
- All résumé content lives in `src/interaction/ResumeContent.js`.
