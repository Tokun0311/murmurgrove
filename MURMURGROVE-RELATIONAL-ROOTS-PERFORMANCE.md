# Murmurgrove: relational roots and mobile responsiveness (2026-11-17)

Murmurgrove continues to render one full-viewport 3D-projected Canvas organism. Its dots correspond to real archive records and remain actionable when magnified.

## Root semantics

The root layer is no longer a random radial ornament. The homepage generator derives direct pathways from exhibition references to valid institution, artist/person and concept IDs. Stronger shared pathways form when two entities of different sections co-occur in at least two exhibitions. All displayed root paths have record-backed endpoints. They bend through intermediate control points, so the homepage remains a living tissue instead of a literal graph UI. Dots and roots have separate roles, and the detailed relationship indexes stay in their own sections.

The page includes root data in its current build. Future saved history snapshots include the root relationships as well. Older snapshots were created without root data and intentionally do not fabricate a historical relationship map. The existing 2026-11-17 snapshot is preserved unaltered.

## Mobile interaction performance

- Rotation and pinch request a browser animation-frame paint instead of repainting for every pointer event.
- Mobile Canvas pixel ratio is capped at 1.25; desktop at 1.75.
- During interaction, the renderer uses simpler tissue contours and fewer path samples and omits expensive per-record radial glows.
- On coarse pointers, the idle update target is 24 Hz and the interaction target is 30 Hz, contingent on device performance. No device-independent FPS promise is made.
- Full rendering details resume when the interaction ends.
- Hit testing, record links, three modes, the history panel, and translucent toolbars remain available.

## Verification scope

Tested independently in Chromium with 1280 x 820 and 390 x 844 viewports. Drag/zoom/mode checks generated no page JavaScript exceptions. The archive generator produced 180 records with 183 direct and 5 repeated cross-section root links. The Python history-capture script successfully produced the same root counts in a test run; that newly generated test snapshot was deleted and the original observed snapshot retained. A formal Astro build and real iPhone Safari testing have not been performed here.
