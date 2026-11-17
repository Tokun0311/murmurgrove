# Institutions layout rework (2026-11-17)

- The existing fixed/competing CSS map layouts were replaced by a single stable full-bleed canvas plane.
- The map background extends to the browser's top and horizontal edges, behind the masthead, but ends at the institution directory. It does not create a second page or move the heading/index.
- The default globe is anchored to the left. Focus changes animate camera rotation/zoom without resizing the canvas every frame. Longer country-to-country transitions pull back slightly before zooming in.
- City-level dots only; there are no on-map city labels. The popup retains city names and linked venues. Venue-level coordinates were not newly inferred or added.
- The directory is organized as country | city | three-column institution names on desktop, without rectangular cards; it switches to two columns at narrower widths.
- Prior venue-name/address edits and other pages were kept intact.

Validation: client script TypeScript transpilation succeeded with zero syntax diagnostics; scoped CSS parsed successfully. Browser rendering and the complete Astro build have not been verified in this runtime.
