# Murmurgrove Phase 2.6.5 · Calm Deep-Zoom Gestures

This patch is limited to **render-only camera input and optical screen-space drift** on top of Phase 2.6.4. It intentionally does not touch any archive JSON, topology, source links, physiological model, colors, Bézier strand generation, history, or production TOW ARCHIVE files.

## Why it was needed

In Phase 2.6.4, a selected particle could remain in automatic center-follow while the user zoomed toward the cursor, and an ordinary mouse drag rotated the entire 3D projection even at high zoom. These camera behaviors interfered with free close-up exploration. Deep zoom also magnified tiny optical drift into a disproportionately large pixel displacement.

## Updated interaction

- Moving the mouse without buttons: never moves the camera.
- Click / tap a particle: opens its local card and smoothly brings its resting position into focus; the particle still moves independently.
- At **100% or lower**: ordinary drag rotates the overview, as before.
- At **above 100%**: ordinary left-button drag pans the image in screen pixels; the viewpoint no longer suddenly orbits.
- At any zoom: **Shift + drag** explicitly rotates the body, including in deep views.
- Wheel, double-click, two-finger pinch and manual drag **cancel ongoing automatic follow**. To follow again, select a particle again.
- Wheel zoom remains anchored at the actual cursor position; plus/minus buttons zoom around the selected particle (if any) or the viewport center, not a stale mouse position.
- Below or at 100%, the camera gradually re-centers on the whole organism as before.
- Zoom max is still 2400%.
- Deep-zoom optical displacement is gently screen-space-limited without changing particle identity, deterministic animation or source rest positions.

## Installation

1. Unzip and merge the included `experiments` folder into the INNER project root:
   `C:\Users\deng\Desktop\tow-archive\tow-archive\`
2. Overwrite only the updated **Phase 2.6** `public/viewer.mjs`. The other files are new: `public/camera-gestures.mjs`, `tests/deep-zoom-gestures.test.mjs`, and this README.
3. Double click `experiments\murmurgrove-phase2-6\VERIFY-THREADS.cmd`, then `OPEN-THREADS.cmd`.
4. Test: click a particle, left-drag at 165%, wheel zoom, Shift+drag to rotate, then zoom back toward 100%.

## Verification

- `node --test tests/*.test.mjs`: 41/41 passed; baseline hashes identical.
- Desktop Chromium interaction test (locally injected sources due to blocked navigation): normal hover no camera move, 160px/50px drag pans the same amount with 0 angle change, follow properly disengages, cursor wheel zoom works, Shift+drag rotates deliberately; no JS errors.
- This is not a physical-device FPS guarantee.
