# Murmurgrove Phase 2.7 · Visit Traces / Read-only Observation History

This is a **small drop-in patch over Phase 2.6.9**, not a separate/full website and not deployed to TOW ARCHIVE.

## What changes

The previously text-only **History** button now opens a compact, source-backed temporal index of recorded exhibitions. It is intentionally *NOT a playback of past morphological states*.

- **57 non-quarantined exhibitions** with source `occurredOn` dates, from **January through November 2026** in 11 populated months. The 7 quarantined exhibition records do not appear in this temporal view.
- Month bars are calculated from those real record dates, not generated activity.
- Selecting a month highlights its real exhibition nodes and only those **present-day / pinned-baseline** metadata relationships that are already declared. Other thin threads remain present but optically quieter. **No graph edge is added, deleted, backdated, or activated.**
- Clicking a dated record closes History and focuses its particle, displaying the familiar anchored card. The external record opens **only when its card title is clicked**, not when clicking the History list entry.
- The panel supports multiple years if later verified observations arrive, via discreet year arrows (hidden for the present single-year baseline).
- The previously chosen observation month is kept in `sessionStorage`, alongside the existing camera state. Opening History while an exhibition is selected defaults to that exhibition's month.
- Reduced-motion preferences and keyboard-usable native controls remain available.

## Important historical boundary

An exhibition's `occurredOn` is the date stored in that record. It is **not** proof of original archive ingestion, author-verified encounter, structural rewiring, or a contemporaneous physiological organism. The present data contains **no historical archive/version checkpoints**, therefore this index cannot reconstruct an `as-of` organism. Morphological history must await real versioned source events and trusted reproducible checkpoints. These statements are explicit in the interface.

## Install

Copy/merge the `experiments` directory from the ZIP into your actual **inner** Git project directory:

`C:\Users\deng\Desktop\tow-archive\tow-archive\`

Overwrite **two** runtime files:

- `experiments/murmurgrove-phase2-6/public/index.html`
- `experiments/murmurgrove-phase2-6/public/viewer.mjs`

Add **one** runtime module:

- `experiments/murmurgrove-phase2-6/public/observation-history.mjs`

One new test file and this README are also included. All other files, including `movement-pacing.mjs` (6× directional flow), the frozen `public/data/*.json`, and launch scripts, remain unchanged.

Double-click existing `OPEN-THREADS.cmd`, then click **History** in the bottom-left corner. Use `VERIFY-THREADS.cmd` if desired.

## Verification

- `node --test tests/*.test.mjs` **58/58 passed** (50 existing + 8 new).
- Automated byte pin checks for T0, navigation, baseline, and manifest passed.
- Playwright desktop 1280×800 and mobile-sized 390×844 Chromium simulations: source verification, History open, default latest month 3 entries, October 12 entries, month button state, record selection, camera focus at 165%, link destination and no JS page errors. Passed.
- The sandbox's browsers run with a local fixture replacement because browser navigation is blocked in the test container; they are **not physical-device benchmarks**. 60FPS on real mobile devices, public-site routes, and true multi-year re-ingestion have not been tested.

**Scope boundary:** archive records, real links (158), 20 unlinked independently drifting records, color, Whole/Growth/Movement visuals, cursor zoom, pointer pan, and Movement pacing are unchanged.
