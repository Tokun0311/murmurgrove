# Data integrity

Keep all `src/data/`, `public/murmurgrove/` and `murmurgrove-editor/.private/` intact. The latter includes originals, drafts, recovery and backups, not disposable cache. Keep stable record IDs, aliases, provenanced relations and original Markdown. Do not manually edit generated snapshots to remove duplicates.

`public/murmurgrove/research/current.json` is an editor-maintained projection; production `dist/murmurgrove/research/current.json` is regenerated at build time. T0 is a historical baseline, not the current record count. Historical data are not interchangeable with the current projection.

Back up the local private directory outside Git and keep it private. `node scripts/check-project.mjs` runs the existing tests and checks the current graph against the source via the existing regression test.
