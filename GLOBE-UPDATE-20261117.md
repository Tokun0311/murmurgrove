# Institutions: interactive globe (2026-11-17)

- Replaces the flat world-map SVG viewport in `/institutions/` with a spherical, orthographic-style canvas globe.
- Uses the **existing** `src/data/world-country-paths.json` geometries for the globe surface and clickable country highlighting. All archive content, geographic country chips, city groups, and institution links are preserved.
- Drag with mouse/touch to rotate; scroll or use +/− to zoom; Reset restores the original angle and zoom. Arrow keys rotate when the map has focus; +/− keys zoom. Click or hover highlighted areas to explore grouped institution links.
- No third-party globe services, additional npm dependencies, or external map tiles.
- The original SVG coordinates were approximated as latitude/longitude for the globe texture; this is a **visual archive navigation globe**, not a survey-accurate geographic GIS layer.
- Verification: inline TypeScript static check passed. Complete Astro build could not run in this container due to missing installed dependencies. Run `npm install` and `npm run build` locally before deployment.
