# Murmurgrove Phase 2.6.1 · Mangrove Curves & Zoom-to-Cursor

This is a **small, additive overlay** for the existing Phase 2.6 real-archive Canvas 2D sandbox. It is **not a full standalone site** and is not a change to the production TOW ARCHIVE website.

## What changed

1. **Mangrove-like root curves.** The existing three extremely fine optical passes of each real metadata relationship now use a more expressive cubic Bézier shape. The control points come from the two real source-node positions, their local direction-field tangents, the projected gravity-like sag, and a strictly bounded display-only micro-braid. Both source endpoints remain untouched. The sub-strands are still optical samples of exactly one pre-existing link, not new edges. The line width, alpha and functional colors remain unchanged.

2. **Zoom-to-cursor.** The mouse-wheel zoom and double-click keep the content underneath the pointer fixed in place during scaling. The zoom +/− controls use the last pointer location within the canvas (or the body-view center if none is known); touch pinch uses the two-finger midpoint. The pointer-space offset is persisted as viewport-normalized coordinates for returning from the archive article and for responsive resizing.

3. **Automatic camera home.** At **100% or below**, the pan offset eases toward zero at approximately a 240 ms time constant, returning the body to the viewport center without snapping. Orbit angle, elevation and the underlying node coordinates are not rewritten.

## Install on Windows

1. Make sure Phase 2.6 has already been installed in the **inner** project folder `C:\Users\deng\Desktop\tow-archive\tow-archive\experiments\murmurgrove-phase2-6\`.
2. Extract this patch and copy its `experiments` folder into `C:\Users\deng\Desktop\tow-archive\tow-archive\`, choosing to merge folders. Only `public/viewer.mjs` is replaced; the other three patch files are new.
3. Open `experiments\murmurgrove-phase2-6\VERIFY-THREADS.cmd` to run the tests (expected **16/16**).
4. Double-click the existing `OPEN-THREADS.cmd` to open the current sandbox at `http://127.0.0.1:4186/`.

## Verification and boundaries

- Existing tests: **8/8**. New tests: **8/8**. Total **16/16** PASS in this build environment.
- The pinned baseline, navigation, manifest and silent T0 JSON files are **bit-for-bit unchanged** versus the original Phase 2.6 ZIP.
- Browser interactions were checked in a 390px mobile-sized Chromium harness with fixture injection because direct URL navigation is blocked in this environment: cursor wheel zoom >200%, auto-home at 65%, Whole/Growth/Movement, and archive card selection. Actual in-browser module fetching, real-device performance and physical-mobile FPS are **not** verified.
- No inferred semantic links, fabricated author-verified life events, or invented Writing tensions are introduced.
