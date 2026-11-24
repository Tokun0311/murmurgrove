# Murmurgrove Phase 3.0 · Present Optical Frames

**Incremental patch on Phase 2.9. An author-reviewed visual evidence workflow, not a historical physiological engine.**

## What Phase 3.0 actually records

A genuine *present observation* from the currently running browser, on demand:

- The **exact rendered Canvas2D image** in PNG data, excluding the UI panels that sit above the canvas.
- The **174 actual archive node IDs with observed screen-space (x, y) coordinates** from that same completed frame; the 158 existing metadata relationships remain referenced from verified immutable archive files, not invented inside a screenshot.
- Camera azimuth, elevation, zoom, screen pan, three viewing presets, any selected archive ID, CSS and backing-pixel sizes, precise UTC capture and frame-render times.
- The real byte-level SHA-256 of the loaded `viewer.mjs` renderer, actual PNG bytes and initial archive/geometry checkpoint identities, plus a canonical SHA-256 of the exported document.
- **0 approved life events, 0 activated Writing fibers and 0 verified historical physiological morphologies.**

The export is a *picture plus structured position observations*. It is NOT a historical growth reconstruction, author-verified physiological shape, time-series motion recording, or an archive update. Capturing a moving optical body does not authorize new biological events. Hashes detect byte changes but do not provide a cryptographic proof of the author's identity or truthfulness.

## How to use on Windows

1. **Prerequisite:** keep the Phase 2.9 standalone experiment already installed in `C:\Users\deng\Desktop\tow-archive\tow-archive\experiments\murmurgrove-phase2-6\`.
2. Extract the Phase 3.0 ZIP and merge its `experiments` folder into the **inner repository root**, allowing overwrite of only `public/index.html` and `public/viewer.mjs` within this experiment. Everything else is new, including an initially **empty** optical-frame index. **If you have begun saving actual optical frames, NEVER overwrite your existing `public/data/optical-frames/index.json` with the empty file in a fresh patch.**
3. Double-click the existing `OPEN-THREADS.cmd`.
4. Change the angle/mode/zoom until the organism is framed as you wish. Open **History → Optical frames → ＋ 记录此刻画面**. The browser downloads **one self-contained JSON**, including the screenshot. Save it in a safe place.
5. To persist that exported frame inside the project, double-click the new **`IMPORT-OPTICAL-FRAME.cmd`** in this experiment. Paste the **full path to the downloaded JSON**, then deliberately confirm `Y`. The tool checks source bytes, currently installed renderer version, screenshot integrity, actual node identities, timestamp, and prior snapshot hash chain before **appending without overwriting**. It rejects duplicates and forged life-event activations.
6. Reload the browser page and open **History → Optical frames**. Click the record to inspect its *verified image*, and click the image to view it larger. Archive Versions and Visit Traces remain independent.
7. Review and commit the new `public/data/optical-frames/` files in GitHub Desktop if you intend to retain them across devices or deployments. They are **only in the local standalone experiment** until you choose to commit. `IMPORT` does not deploy or modify `src/data` or the public TOW ARCHIVE site.

The import script intentionally demands that the actual `viewer.mjs` bytes still match those that created the screenshot; import exported frames *before changing the renderer version*. Never delete a prior `states/*.json` after sealing it, or the reader will report a broken evidence chain.

## Safeguards

- In the frozen source, there are **181 archive records**, **174 currently displayed**, **7 quarantined**, **158 displayable verified metadata references**, and **20 current isolated records**. The new export does not add edges.
- No historical frame is bundled: initial optical-frame count is exactly **0**. All user captures are explicit, never fabricated from earlier exhibition dates.
- Source Structure Reading and older archive versions remain static source projections, never made into life-history footage.
- Future genuine morphological / life-event history will require a separate author-confirmed event and physiology pipeline. The optical-frame chain supplies audited visual snapshots and node coordinates, not that missing engine.

## Scope of files

Overwrites (exactly 2):

- `public/viewer.mjs`
- `public/index.html`

Adds (exactly 6):

- `public/optical-frames.mjs`
- `public/data/optical-frames/index.json` (initially empty)
- `scripts/import-optical-frame.mjs`
- `IMPORT-OPTICAL-FRAME.cmd`
- `tests/optical-frames.test.mjs`
- `README-3.0.md` (this instruction file)

None of the source baseline, T0 coordinates, chronicle index, metadata relations, moving optical code, mouse gestures or `OPEN-THREADS.cmd` are replaced.

## Verification in this build

- `node --test tests/*.test.mjs` = **80 / 80 passed** (75 existing + 5 newly added tests).
- A full browser smoke test, using the true sandbox renderer and actual baseline data, validated desktop 1100×800, mobile 390×844, initial empty history, one-click export, self-contained exported PNG and 174 screen positions, **manual import**, replay of an archived frame including verified image, duplicate import refusal, and full-screen preview. No page JavaScript exceptions.
- The browser test runs against `about:blank` with faithful locally injected source and SHA-256 helpers because this execution environment blocks browsing local network URLs. This is not a real phone benchmark.
- All user-facing media and ZIPs are stored in the testing sandbox; **the synthetic smoke-test capture is NOT included in the downloadable patch**. The first real capture belongs to the user.
