# Murmurgrove: long-term archive growth, snapshots and exploration

## What changes automatically

The homepage reads the existing Astro `exhibitions`, `institutions`, `people` and `concepts` content collections whenever Cloudflare Pages builds. Its morphology depends on the **full** collection, including actual recorded cross-collection relationships. No homepage item selection or edits are needed. `src/lib/murmurgrove.ts` retains **all** marks; the canvas uses distant-view sampling and zoomed viewport culling to keep a growing archive performant. Root and tissue complexity scale gradually, without infinitely expanding beyond the screen.

The big view remains an organic organism, not a Concepts-style labeled network. The small moving flock particles are decoration at overview scale only. **After zooming to 125% or above, they disappear, and each remaining visible dot represents one actual record** and has its section's canonical URL. Desktop: hover for its title, click to open. Touch: tap for a link popup, then tap the link. Zoom using `+`/`−` buttons or Ctrl/Alt + mouse wheel; drag to pan; on supported touch browsers, pinch to zoom. Reset `↺` restores 100%.

The control bar is no longer layered on the organism; it sits below the canvas with a clear vertical gap on mobile and desktop. The shared global navigation divider and selection styling are unchanged. The original Whole, Growth and Movement modes remain.

## Historical states, not invented timelines

A genuine **snapshot of the current source records** is stored in `src/data/murmurgrove-history/`. The build reads the saved JSON states automatically. Open `History` and choose the saved state using the slider; `Current` returns to the live content. A snapshot stores titles, URLs, coordinates, strengths, recent emphasis, counts and relation density. It is not a fabricated reconstruction from visitedOn dates, and it is not a full Git backup of essays. URLs of records removed from the current archive may eventually be unavailable.

The workflow `.github/workflows/murmurgrove-snapshot.yml` runs on pushes to `main` or `master` which modify source content, or via manual dispatch. It saves a new JSON file when content genuinely changes and commits it back to the GitHub repository. Requires GitHub Actions enabled and the repository workflow's `contents: write` permission; branch protections / third-party deploy setups can prevent this workflow from pushing. If those are unavailable, run `python -m pip install PyYAML` and `python scripts/record-murmurgrove-snapshot.py`, then commit the generated file with normal content updates. This is *not* an external database service, and no independent history is automatically preserved by Cloudflare alone. GitHub's workflow-generated commits should deploy through the existing Cloudflare Pages Git connection.

Snapshots are immutable once created. If nothing changed, no duplicate is written. Two different content states on one day produce separate timestamped snapshots. Historical states become increasingly valuable as new data accumulates.

## Future scale

Root counts increase gradually but remain bounded for visual legibility; all data remains retained even at ten-year scale. Underlying relationships also affect density. Because historical states contain complete mark data, the site can replay saved states even when the current content set changes. If the archive reaches many thousands of records, consider Web Workers or tiled spatial indexing for additional performance; neither is presently required for the archive's current scale.

## Verification scope

Validated the standalone browser script using Chromium at 1280px and 390px, with zoom, modes, history and hover-to-link. The complete Astro production build was not possible in the current environment without installing its dependencies. Real mobile Safari should be tested after deployment.
