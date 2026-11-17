# Geographic Index: location accuracy

- The globe deliberately has no political borders. The land mask is a land/sea silhouette only.
- Global view: one aggregated glow/dot per country, intensity scaled to the number of recorded institutions.
- Focus view: city markers display at their approximate city-center coordinates and can be clicked to see the institutions listed for that city.
- A city marker is **not** an institution's precise location. The imported records currently contain city names but generally lack venue coordinates.
- For a **verified, fixed** institution position, add `longitude` and `latitude` to the corresponding `src/data/institutions/*.md` frontmatter. An additional labeled location dot then appears in focused view.
- For a truly **non-fixed** site/project, add `locationType: variable` and leave precise coordinates absent. It remains discoverable in the city/country list, but will not be assigned a fictitious exact address.
- The optional `locationType: site | city | variable` metadata is supported. Never fill in street-level coordinates from an approximate city center.
- The index background is fully transparent. Country selection still rotates and magnifies the globe.
