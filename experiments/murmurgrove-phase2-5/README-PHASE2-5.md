# Murmurgrove Phase 2.5 | Organism Skin + Breathing (standalone experimental sandbox)

## Open safely on Windows

1. Unzip the package. Copy `experiments/murmurgrove-phase2-5` to the **inner Git project**:
   `C:\Users\deng\Desktop\tow-archive\tow-archive\experiments\murmurgrove-phase2-5`
2. Open that folder, double-click `OPEN-PHASE2-5.cmd`.
3. The browser opens at `http://127.0.0.1:4185/?renderer=native`. It uses its own port so Phase 2.4 can run in parallel at `4178`.
4. Use the small gear icon to reveal the A/B/C and T0/T1/T2 experiment controls. At 10.00x, inspect the bending epidermis; at 1.00x, inspect the whole-body tide.
5. Optionally double-click `VERIFY-PHASE2-5.cmd` to run the standalone verification suite.

No production deployment or Git push is needed. The `murmurgrove-phase2` folder is not touched.

## Changes from Phase 2.4

- **Sealed organic skin:** 5 frozen controls sampled with centripetal Catmull–Rom (112 samples for fibers); parallel-transport skin uses twelve angular segments, curvature-aware radius reduction, exact zero-radius sealed tips, and soft alpha taper. No hard ring openings.
- **Reliable skin visibility:** native WebGL2 draws optical layers first and the skin with ordinary depth testing, without the previous fragile exact-depth prepass. Three.js draws solid skin once with standard depth testing and double-sided shading. This prevents strict-depth and reversed-winding disappearance, but does **not** guarantee perfect front-only translucent occlusion for complex overlapping tissues.
- **Warm volume shading:** high-opacity diffuse material, restrained Fresnel edge translucence; not transparent plastic tubing.
- **Pure Gaussian exhibition pulse:** seven T1 pulses represented entirely by radial Gaussian sprites (no angled pulse strips). No viewer-quad corner deformation.
- **Biological tide:** spatially staggered global breathing and along-fiber traveling micro-waves, without introducing any new archive event, link, or changed source coordinate. UTC-derived time phase uses device clock, not page-load time; this is not a synchronized authoritative live server.
- **Everyday minimal UI** and reading card retained from Phase 2.4; Phase 2.5 runs in an independent sibling sandbox.

## Immutable sources / semantics

- Frozen snapshot files `public/data/T0.json`, `T1.json`, `T2.json`, `manifest.json`, `navigation.json` are byte-identical to Phase 2.4.
- Never edits `src/data`, `public/murmurgrove/history-index.json`, `current-graph.json`, or Phase 1B event logs.
- T0/T1/T2 represent a *simulated demonstration*, not real author-verified retrospective life events. The 7 quarantined records are not activated.
- A/B/C remain lab variants, hidden in daily mode. Default A is one continuous tissue per real simulated fiber, to avoid decorative tube doubling.

## Validation

- Standalone Node.js test suite: 71 tests, 67 pass and 4 explicitly skipped without the separate Phase 1b source directory. The skipped tests concern original baseline regeneration and source-event immutability; bundled frozen snapshot hashes and visual geometry tests run normally.
- Geometry benchmark T2/A: about 100k submitted triangles **without a duplicate depth pass**, draw count varies with scene, around 11.5 MB vertex data on test machine. Not a GPU FPS measurement.
- Actual WebGL browser acceptance: **NOT VERIFIED** here. The contained Chromium instance blocked local URL navigation and WebGL2 contexts; test the new optical feel and FPS in your browser.
- Check 1.00x, 10.00x, T0/T1/T2, all A/B/C variants, and whether shader compilation and transparency behave as intended. If a browser reports compile errors, preserve the screenshot/console and do not deploy.

## 2026-11-20 repair notes

- Fixed an **extra closing brace** in the native WebGL2 vertex shader, matching the previously reported `ERROR: 0:66: '}' : syntax error`.
- Updated stale Phase 2.4 title, badge, canvas label and fatal error message to Phase 2.5.
- Removed the hard import of absent Phase 1b code from the default verification path. Four provenance-only tests now explicitly SKIP when their original Phase 1b directory is unavailable; they will run if the complete original source is present. These tests are NOT claimed to pass without those materials.
- Bundled T0/T1/T2 snapshots were left unchanged. The source-regeneration script still requires the original Phase 1b project and is not a standalone generator.
- Local browser navigation was blocked by the test environment; WebGL compilation and visual rendering still require a real browser check on your Windows computer.

## 2026-11-20 visibility repair (follow-up)

- The user reported a **uniformly pale blank canvas** after the shader syntax fix: startup success is not visual success.
- Removed native strict `EQUAL` depth-shading pass and the face-orientation discard; render optical layers then solid epidermis with conventional `LEQUAL` depth testing. Three.js now uses the same conservative single solid-surface path.
- Added static regression assertions preventing the exact-depth dependency from returning. All frozen data and archive navigation remain unchanged.
- **Important:** a real-browser render check remains outstanding in this execution environment (local Chromium URLs blocked). This package is a conservative rendering fix, not a visually verified release.
