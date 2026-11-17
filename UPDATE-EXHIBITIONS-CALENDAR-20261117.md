# Tow Archive: Exhibitions calendar relocation (2026-11-17)

- Moved the calendar browsing interface off the homepage and into the top of `/exhibitions/`.
- Made the monthly calendar compact (610px maximum width, 35px day cells).
- Clicking a highlighted day filters the exhibition list to the selected date; clicking it again or choosing Clear date resets it.
- Region buttons and Newest/Oldest sort continue to function, and combine with the date filter.
- The exhibition list retains its original date / title / region rows.
- Homepage now provides a simple archive index and six recent exhibition records, without a calendar.
- Preserved the SVG `viewBox` map, complete France geography, country/city institution index and mobile Concepts fixes from the previous consolidated version.

Checks: source frontmatter fences validated; TypeScript syntax of modified scripts validated. A full Astro production build could not run here because dependencies were unavailable in the local npm cache. Validate on Cloudflare Pages before treating deployment as complete.
