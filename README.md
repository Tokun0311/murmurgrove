# murmurgrove

A living, multilingual contemporary-art research archive. Astro static site, local Node.js editor, native Canvas viewer.

## Everyday use
- Windows: double-click `murmurgrove-editor/START-EDITOR.bat`. The local editor is at http://127.0.0.1:4317.
- Edit and publish through the editor as before. Keep `murmurgrove-editor/.private/` local and backed up separately.
- For website preview: `npm run dev`. After dependency installation on a new machine, use `npm ci` with Node 22.19+ (or a compatible newer LTS).
- Before publishing: `node scripts/check-project.mjs`, then `npm run build`, then review GitHub Desktop changes and push. Do not publish from an old `dist/` directory.

## Maintenance
See [Design](docs/DESIGN.md), [Architecture](docs/ARCHITECTURE.md), [Data](docs/DATA.md), [Maintenance](docs/MAINTENANCE.md), [Changelog](docs/CHANGELOG.md). Historical developer materials are archived outside the repository by the consolidation tool.
