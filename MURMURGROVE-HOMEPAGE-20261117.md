# Murmurgrove homepage: self-generating archive morphology

## What changed

- `src/pages/index.astro`: new homepage, organic Canvas visualization, three observation modes, four section entrances, active record links, and recent exhibitions.
- `src/lib/murmurgrove.ts`: deterministic homepage model, derived automatically from the four existing Astro content collections.
- No edits to desktop Concepts, Institutions, Exhibitions, navigation, global styles, or content files.

## Zero-maintenance behavior

Edit or add content in `src/data/exhibitions`, `src/data/people`, `src/data/institutions`, or `src/data/concepts` as usual. On the next Cloudflare Pages / Astro build, the homepage automatically recomputes collection counts, mentions, related records, and its visual morphology. No homepage record list or model weights need to be manually updated.

- All collection records contribute to the morphology, including newly added but as-yet unlinked entities.
- Exhibition links to `artists`, `institution`, `relatedInstitutions` and `concepts` influence relationship weights and growth.
- Position seeds are stable per collection/id, rather than randomized anew on each page visit.
- "Recent growth" currently measures proximity to the most recent **exhibition visit date** within 110 days, not the Git edit or publication timestamp. A true change-history view would require adding a reliable per-record updatedAt field or building Git history into the build pipeline.
- Four section entrances link to section indexes, with automatic featured record links derived from existing relationships.
- Browser movement and hover/touch response are visual effects; the underlying content-dependent structure changes only on a site rebuild.

## Verification completed

- 2026-11-17 fixture from actual current content: 64 exhibition records, 60 institution records, 37 people records, 19 concepts. 183 direct exhibition-to-entity relations.
- Adding a new related exhibition changed the generated morphology fingerprint and relation count.
- Adding an otherwise unlinked concept changed the generated morphology fingerprint and rendered mark count.
- `tsc --noEmit` passed for both the pure model and extracted Canvas TypeScript.
- Tested standalone HTML/Canvas sample using Chromium at 1280px and 390px; no browser script errors, Canvas positive dimensions, mode switching and tap behavior verified.
- Full Astro production build was not run: the complete project dependencies were unavailable in the current environment (npm offline install failed on an uncached package). The actual deployed page should be validated on Cloudflare Pages after upload.

## Preserved

The prior audited baseline `tow-archive-regression-audited-20261117.zip` remains the source for all other files. No global or preexisting page code was rewritten.
