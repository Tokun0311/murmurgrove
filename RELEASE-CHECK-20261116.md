# TOW ARCHIVE release check

Release: `cjk-concepts-country-v2-20261116`

## Changes in this package
- Global body text uses Noto Sans SC with Microsoft YaHei / PingFang SC fallback.
- `Concepts` on mobile <= 650px uses one-column flexible vertical entries, no fixed SVG viewBox, no clipping.
- Institutions keeps the current country-region map, not the older numbered city dot + Japan/World toolbar map.
- Includes all existing exhibition, people, institution, and concept data from the preceding full archive.

## How to confirm deployed version
After deployment, open View Page Source on any page, search for `tow-archive-release`.
It must read `cjk-concepts-country-v2-20261116`.
If absent, the old build is still being served (wrong repository, branch, upload, or cache).

For browser caching, try a private window or hard reload. On Cloudflare Pages, also verify latest deployment and associated commit in the Pages dashboard.
