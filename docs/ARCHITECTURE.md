# Architecture

`src/data/` contains editorial Markdown and research/history inputs; `src/pages/` and `src/components/` render the Astro site. `public/murmurgrove/organism/` contains the standalone Canvas viewer, current overlay and its historical data. `murmurgrove-editor/` contains the local editor and graph functions. `scripts/` handles export and sitemap/IndexNow. `.github/workflows/` handles automation. `services/` is retained for optional shared state.

Current build order (unchanged): export history → Astro build → export current research into dist → sitemap. The editor also maintains the public current projection. The source and public history formats serve different purposes: do not deduplicate them by filename or size.

Future work: measure actual load and frame cost first; unify layout/rendering only after behavior tests exist; make versioned history on-demand and test withdrawal semantics before migration.
