# Phase 2.1 Living Archive Navigation

**Additive navigation patch for Phase 2.0 + the Motion/Click Focus patch.** Merge the `experiments` folder into the actual inner `tow-archive` repository. Only `public/app.mjs` and `public/index.html` are replaced; all other files are new. Do not replace any author event logs, baseline or main site code.

Open with the existing `OPEN-PHASE2.cmd`. Single click selects an invisible record/fiber/metadata/organ proxy; double click focuses the camera; drag rotates; wheel zooms. Search/select any of 181 records, then open its source page using the side panel. Navigation goes to `https://tow-archive.pages.dev/<collection>/<slug>/` in the same tab. Browser Back returns to the sandbox; camera, material variant, time and selection are restored from `sessionStorage` (same sandbox origin). Hover displays the record title in a native browser tooltip, with no persistent scene labels. BLIND hides the archive UI.

All 181 records and 172 declared metadata links are derived from frozen Known Data Baseline v1, not authored life events. 7 needs-review records are selectable, but public-page navigation is disabled until verified. Unactivated metadata is pickable but not rendered as a life fiber; it is labeled metadata-only. Synthetic pulse/core locations can be selected; nearest archive records are displayed as **spatial neighbors only**, not asserted relationships. A synthetic Writing in T2 has no real archive URL.

Route contract: source files and Astro dynamic route definitions in the user-provided Nov 19 project copy were checked for all 181 records. The checker `node experiments/murmurgrove-phase2/scripts/verify-navigation.mjs` verifies paths against the user's **current local repository**, read-only. This is NOT a deployed HTTP/404 verification; published pages and draft filters may differ. No browser GPU or navigation UX test has been completed in this environment.

Security/integrity: the `navigation.json` SHA-256 is checked at startup, tied to the Phase 2.0 manifest's baseline projection hash. It does not change or write any `life-events.ndjson`. No `src/` production file is included.
