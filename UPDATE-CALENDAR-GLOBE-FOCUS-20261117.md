# Tow Archive — Calendar and globe focus update (2026-11-17)

## Exhibitions
- Replaced the operating-system-native visible month/year selects with compact, styled popover menus.
- Kept month/year choices accessible through buttons, listbox roles and Escape / outside-click dismissal.
- Rebalanced date explorer widths, alignment, whitespace and article list dividers.
- Kept date selection, month arrows, Latest and regional exhibition filters.

## Institutions
- Removed manual +/− zoom buttons and wheel-based zoom. Globe still supports drag rotation.
- Country selection in the geographic index now animates rotation **and** enlargement; 'All institutions' and Global view restore the globe.
- On close-up, city locations and names for the chosen country appear; in global view there is one density glow per country.
- Changed the globe's land and graticule to a muted, cooler tone, without internal national borders.
- Globe renders as a large background spatial layer with a translucent white text-side gradient. On smaller screens the layers stack for legibility.

## Validation
- TypeScript in the two changed pages' client scripts transpiled without syntax diagnostics.
- Offline Astro build could not run: the local npm cache lacks dependencies. Run `npm ci` and `npm run build` in an online development environment before publishing.
