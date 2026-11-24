# Phase 2.2 Body Coherence & Situated Reading

Additive experimental patch only. Depends on Phase 2.0 + 2.1 installed.

- Same immutable snapshots and event logs; no source coordinates, links or tension values are rewritten.
- Density-derived **short local wisps**, not a watertight envelope or cross-record connections. The first version does **not** guarantee a fully cohesive global silhouette; inspect visually before accepting.
- Selecting a record or relation attenuates other rendering strands but preserves their context.
- Camera-relative locator is projected from current snapshot positions. Green indicates selected item; blue indicates camera target and displays azimuth and zoom. Click to return to 100% overview.
- Reading panel explicitly separates source record category, biological interpretation, and evidence state.
- T0/T1/T2, A/B/C and navigation retain existing state and restoration.

## Installation
Merge the `experiments` directory into the inner actual `tow-archive` repository, allowing overwrite only of Phase 2 sandbox `public/app.mjs`, `public/adapter.mjs`, and `public/index.html`. The new `public/situated-reading.mjs` and test file are additive. Run existing `OPEN-PHASE2.cmd`.

## Limitations
No real browser WebGL FPS or blind visual inspection was executed here. Density wisps are a conservative local optical continuity experiment; global body coherence is a subjective acceptance gate and remains open. The locator projects the snapshot's non-quarantined visible nodes, and needs-review records remain accessible via search but have no simulated physiological position in the T0/T1/T2 snapshot. Locator blue cross represents camera **target**, not camera eye position. It does not claim full six-degree camera pose visualization. No fake active link or historical event is added.
