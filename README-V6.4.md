# TOW ARCHIVE / Murmurgrove V6.4

Apply the single file `src/pages/index.astro` over the same file in your local GitHub repository. Commit, push, and refresh after the Cloudflare Pages build finishes.

## Scope
- Restores the original three-position footer layout (History / Whole / zoom controls). The Whole indicator is informational, not an inert button; Growth and Movement modes remain removed.
- Restores the shared light, minimal .grove-tiny styles accidentally deleted in V6.3.
- Redesigns Whole away from long, uniform web edges and tiny arbitrary glyphs: local real relations become short woven fibres; record loci produce directional micro-traces of varying density/extent informed by linked records and activity. These traces are visual texture, not additional data or fake records.
- Retains mouse wheel to-pointer zoom, 100%-1000% limits, reset-to-centre, rotation, hover/tap information, History, all archive records, and other pages.

## Safety
- No content files, History JSON, snapshot scripts, global CSS, or map files are changed.
- No need to run snapshot export.
- Standalone extracted TypeScript script passes `tsc --noEmit` and transpiled JS passes `node --check`; full Astro/Cloudflare build and true live-browser visual verification were unavailable in this environment. Artistic results remain subject to review on your actual site.

If you prefer to restore only controls and preserve the existing V6.3 visuals, use the separate V6.3 Panel Restore package instead.
