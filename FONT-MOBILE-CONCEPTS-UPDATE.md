# Font and mobile Concepts update

- Uses Noto Sans SC for Chinese text across the website. Noto Sans JP is available for elements explicitly marked `lang="ja"`; includes installed system-font fallback.
- Defaults the document language to `zh-CN` for Chinese glyph rendering and accessibility.
- Converts the Concepts graph to a vertical, mobile-only SVG arrangement (390 viewBox units), retaining the desktop graph unchanged.
- Mobile shows all concepts in a two-column, ten-row map without horizontal scrolling. The most meaningful co-occurrence edges (2 or more shared exhibitions) are drawn to reduce visual noise.
- Concept names remain links, with keyboard and hover highlighting, and reduced-motion support.
- No changes to institution, exhibition, writing, or calendar data.
