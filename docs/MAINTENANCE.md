# Maintenance

1. Close editor and dev server before housekeeping. Keep a separate backup of the repository and private editor data.
2. Daily editing: use START-EDITOR.bat; no new workflow required. Review changed files in GitHub Desktop.
3. Before push: `node scripts/check-project.mjs` then `npm run build`. Check opening animation, return camera, mobile gestures and panel, selected relation navigation, history, public/private boundary. Do not deploy if errors appear.
4. `node_modules/`, `dist/`, `.astro/` and Python bytecode are reproducible. Exclude them from portable backups. Leave installed dependencies on the working machine; when needed restore with `npm ci`. Never delete `.git/` to clean the working repository.
5. Keep `package-lock.json`. Do not upgrade dependencies just for tidiness. Keep private backups, `.env` and local credentials out of public repositories and shared ZIPs.
6. Preserve the external consolidation archive and original ZIP; rollback uses the consolidation tool. No automatic commits, pushes or deployments.

References: [IndexNow](INDEXNOW.md), [Writing](WRITING.md).
