# Murmurgrove: motion and morphology history (19 November 2026)

## Current motion

- Whole: 3× the original motion timebase
- Growth: 3× the original motion timebase
- Movement: 10× the original motion timebase

The movement clock accumulates elapsed animation time using the active mode's multiplier. Changing modes no longer causes an instantaneous phase jump. The speed affects the organic tissue and record trajectories, not camera drag sensitivity or scrolling zoom.

## Historical versions

Murmurgrove History now preserves both the archive relationships and the visual/motion revision that shaped their rendering. `src/data/murmurgrove-model.json` defines the named morphology version, release note and motion speeds. Each `src/data/murmurgrove-history/*.json` snapshot saves its version, three speeds, render-code signature and relevant archive structure.

The GitHub Actions workflow runs the snapshot generator when exhibition, people, institution or concept data changes **or** when the morphology renderer, global CSS, motion model or snapshot generator changes. Snapshots with unchanged content *and* design signature are deduplicated. Updates to the generated snapshot folder do not recursively trigger the workflow. Enable GitHub Actions and grant the workflow `contents: write` permission in the repository.

The earliest 17 November snapshot predates design/motion metadata. Its historical movement baseline is reconstructed from archived source as Whole 1×, Growth 1×, Movement approximately 1.65×. New snapshots preserve explicit values.

When a historical state is selected, the stored records, roots and motion speeds are restored. **Historical visuals are reinterpreted by the current rendering algorithm**; historical render signatures preserve provenance but do not automatically load prior JavaScript versions. For pixel-perfect recreation of past releases, retain source-code tags and reproducible deployment artifacts.

Continuous frame-by-frame animation, pointer drags, zoom changes and every visitor's personal actions are **not** permanently logged: recording each frame would be unbounded, expensive and intrusive. History records archive and deployed design/motion revisions, not all transient visual frames.

For long-term maintenance, replace eager injection of every history snapshot with a small manifest and on-demand snapshot fetching once the archive grows; the present implementation still bundles history in the homepage.
