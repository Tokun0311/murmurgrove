# Institutions geographic index update (2026-11-17)

- The globe is a light wireframe with geographic city markers. No country boundaries.
- Region list acts as the single filter; duplicate filter row was removed.
- Clicking a country animates the globe toward its cities, without forcing an immediate page scroll.
- Marker clusters form dynamically based on projected screen distance. Clicking a cluster lists its cities.
- Globe now takes less space beside the region list.
- `cityMarkers` is built from institution records and the shared `cityMeta` registry, not a second manual globe list.
- For a **new city**, add a country and longitude/latitude to `cityMeta` in `src/pages/institutions/index.astro`; alternatively, add numeric `longitude` and `latitude` in one institution Markdown file (but a new city still requires `cityMeta` to define its country). All other institutions in that city automatically appear on the globe.
- For an **existing city**, adding an institution needs no map maintenance.
- Animated transitions honor reduced-motion preferences.

Note: Browser runtime/production Astro build should be checked before deployment.
