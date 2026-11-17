# Vector map correction (2026-11-17)

- The Institutions map now zooms and pans by updating the SVG `viewBox`, rather than applying CSS `transform: scale()` to a map layer. Vector lines are re-rendered on zoom to avoid blurred rasterized layers.
- Removed French Guiana from the interactive France highlight because the archive currently links to an institution in Arles, mainland France. France still includes its geographic overseas territory in the neutral basemap.
- Retained the existing country hover / keyboard interaction, city-group institution links and full institution list.
- Preserved the most recent homepage with no Calendar heading, and the repaired mobile Concepts page.
