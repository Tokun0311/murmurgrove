# Phase 2.6.9 · Movement 6× (Directional Flow, Not Tremor)

Small drop-in patch over **Phase 2.6.8**. Reduces display-only Movement playback from 10× to 6× original speed. It is not a return to high-frequency in-place trembling.

- **Directional glint transport:** original baseline = 0.095 curves/second; Movement = `0.095 × 6 = 0.57` verified-relationship curves/second, i.e. ~1.75 seconds per curve.
- **Gaussian local direction-wave phase:** optical clock is 6×, not 10×.
- **Overall breathing:** remains 4.5× as in Phase 2.6.8; Whole/Growth and independently drifting unlinked records retain their original pace.
- No edits to `viewer.mjs`, `relation-flow.mjs`, any frozen `public/data`, archive topology, actual calendar ages, physiology, links, zoom/pan/card behavior, or production site.
- The optical-time acceleration is applied exactly once by `flowSamplesForRelation` through its imported `MOVEMENT_RATE`.

## Install

Merge the `experiments` folder into the INNER project root:

`C:\Users\deng\Desktop\tow-archive\tow-archive\`

Only one runtime file changes:

`experiments/murmurgrove-phase2-6/public/movement-pacing.mjs`

Two test files are updated and this readme is added. Existing Phase 2.6.8 code should already be installed. Launch the original `OPEN-THREADS.cmd`.

## Verification

- `node --test tests/*.test.mjs` from `experiments/murmurgrove-phase2-6`: **50/50 passed**.
- Frozen T0, navigation, baseline, and manifest byte-pins are verified by the unchanged automated tests.
- GPU, phone FPS, and browser visual acceptance were not rerun for this parameter-only update.
