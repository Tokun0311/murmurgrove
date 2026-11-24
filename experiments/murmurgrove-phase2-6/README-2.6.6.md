# Phase 2.6.6 — Perceptible Movement, Emerald Filaments

Incremental update from Phase 2.6.5. **Only Movement visual playback is accelerated.**
The archived materials, metadata topology, original geometry/projection, node IDs,
13-day exhibition decay, event logs, zoom/drag camera behavior, other lenses,
color palette, and click-through reading behavior are unchanged.

## What is different?

- **Movement optical clock: ×3.0.** The same verified-relation glints now complete a
  full path in about 3.51 seconds instead of 10.53 seconds.
- **More legible overview motion:** only in the Movement lens at 65–100% zoom,
  tiny optical displacement is boosted but capped at **2.4 CSS px** to avoid
  sudden jumps. It does not shift the rest position.
- **Slightly clearer moving glints** along existing declared metadata references:
  still 2 per source link; no standalone free-floating decorative particles.
- **Local directional waves** play faster, but each remains constrained to the
  actual neighbor/relationship field; isolated archive records retain their own
  independent quiet motion and have no invented connections.

This is **visual playback acceleration**, not three times faster biological aging.
The dated exhibition light follows `exp(-ageDays / 13)` without change; real
Writing events and matured cores are still **zero** in the pinned baseline.

## Installation (one merge)

1. Unzip and merge `experiments` into the **inner** repo:
   `C:\Users\deng\Desktop\tow-archive\tow-archive\`
2. Overwrite only `experiments\murmurgrove-phase2-6\public\viewer.mjs` and
   `experiments\murmurgrove-phase2-6\public\relation-flow.mjs`.
   New files: `public\movement-pacing.mjs`, `tests\movement-pacing.test.mjs`,
   `README-2.6.6.md`. The existing `tests\lens-and-flow.test.mjs` has an updated
   assertion for the accelerated *render-only* curve clock.
3. Double-click the existing `VERIFY-THREADS.cmd`, then `OPEN-THREADS.cmd`.
4. In the quiet three-lens control, select the **third lens (Movement)**, zoom
   back to 65%, and watch the group for several seconds. Whole and Growth keep
   their earlier restrained pacing.

## Verification

- All source JSON hashes remain byte-identical to 2.6.5.
- `node --check public/viewer.mjs` and all Node tests: **46/46 passing**.
- Desktop Chromium injected-page functional test at 390×844 viewport:
  65% overview and Movement 3× confirmed, 158 verified links, no JS errors;
  observed ~60 FPS during this desktop emulation (not a physical phone benchmark).
- Movement vs Whole 650-ms screenshot comparison showed larger actual pixel change
  in the Movement lens. This is a visual signal check, not a perceptual guarantee.
