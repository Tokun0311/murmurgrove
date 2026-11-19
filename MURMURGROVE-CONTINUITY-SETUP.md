# Murmurgrove: continuous body and morphology-only history

## What this update changes

**Current** is a living archive with clickable linked records. **History** is a read-only observation of saved morphology; zoom and rotation work, record links do not. The homepage initially loads only current content, not all snapshots. On opening History it fetches `/murmurgrove/history-index.json`; selecting a snapshot fetches only that JSON. The browser keeps a maximum of three downloaded snapshots in memory. Historical public snapshots contain geometry/relationship IDs, not article titles, bodies or URLs.

Four section identities become visible only at zoom >185%: anchored institution envelopes, branching exhibition structures, flowing person traces and concept fields. All remain one organic body at a distance.

## Shared body deployment (NOT enabled by merely uploading this ZIP)

The shared-state Worker is **optional infrastructure**, isolated from the static Astro site in `services/murmurgrove-state/`. It is a single SQLite-backed Cloudflare Durable Object, identified by a fixed name, containing the current anonymous graph geometry, organ position, velocity and simulation tick. It does not keep copies of article text. The browser polls every five seconds, interpolates toward the shared positions, and retains independent camera angle, zoom and mode. If the service is unavailable, the existing local animation continues. That fallback is **not a genuine shared living state**.

1. Deploy `services/murmurgrove-state` to your Cloudflare account, after reviewing service billing and domain settings. Use `npm install` and `npm run deploy` in that folder. The included Wrangler config is a legacy-migration format, which may require updating for newer Wrangler releases. The code has **not** been tested against a real Cloudflare account.
2. Create a strong secret using `npx wrangler secret put INGEST_SECRET`. Restrict the `ALLOWED_ORIGIN` Wrangler variable to your actual public website origin (default is `https://tow-archive.pages.dev`).
3. Configure the static Astro build's **PUBLIC_MURMURGROVE_STATE_URL** environment variable to the full deployed Worker origin, for example `https://your-worker.your-subdomain.workers.dev`. Do not put the ingestion secret in any `PUBLIC_` variable.
4. In the GitHub repository's Actions secrets set **GROVE_STATE_ENDPOINT** to the Worker origin and **GROVE_INGEST_SECRET** to the same ingestion secret. The `murmurgrove-snapshot.yml` workflow will publish the new current graph after recording a snapshot.
5. Trigger the workflow once manually after the Worker has been deployed, then redeploy your Astro static site. Inspect `/health` and `/state` on the Worker. `/state` should report `ready:true` and the matching `version`; the matching graph fingerprint is required before clients use shared positions.
6. Test two independent browsers in different networks simultaneously. They should see the same organ coordinates at the same server state, not necessarily the same pixels since each viewer controls the camera. Validate mobile performance, out-of-order responses, sleep/wake recovery, billing, and repository-to-Worker propagation before calling the service production-ready.

### Honest limitations

- State polling is near-real-time (about 5 seconds), **not an exact live video stream**. The Worker maintains one authoritative body, but the browser interpolates between received states.
- The Worker uses bounded fixed-step dynamics while active. If it has slept for hours or months, it performs bounded approximate catch-up when woken; it does **not** claim to have simulated every unseen second or perfectly re-create the unobserved micro-trajectory. `approximateCatchup` makes this explicit.
- The current history snapshots are **archive-build morphology snapshots**, not snapshots of live Durable Object positions. True movement history and full deterministic rewind would require a separate opt-in server checkpoint process, durable storage and algorithm-version migrations.
- The visual modes are local *ways of viewing*. With the shared Worker online they cannot accelerate physical time independently (Movement=10× changes local fallback movement only). In future Movement could highlight trajectory trails instead of speeding up the organism itself.
- No WebSocket yet: intentionally use bounded polling to reduce implementation complexity and reduce risk. Consider WebSocket with hibernation if five-second updates become insufficient. No per-frame server writes or permanent high-frequency alarms.
- The project has not yet passed a full clean Astro production build or real iOS Safari/WebKit test in this environment.

## Long-term edit and deletion

- The GitHub action creates a new private archive snapshot when content or design code changes. Snapshots created by the revised recorder contain content digests and, from the **next** fully tracked revision onward, `new`, `edited`, and `deleted` record-ID lists. Earlier 2026 snapshots lack content digests, so their precise content changes cannot reliably be reconstructed.
- Routine record deletion removes the organ from **Current** on the next signed ingest. Previously published morphology snapshots remain observable but non-clickable.
- If a historical entity must be removed from **all** visible history for privacy, use `node scripts/redact-murmurgrove-history.mjs --record=people:stable-id --confirm`, rebuild, redeploy and invalidate caches. This only changes the working tree. It **does not** purge old Git commits, external backups, public CDN caches or previous deployments; those must be handled separately when required.
- Archive records use stable IDs. Renaming an ID looks like a deletion and an addition; keep IDs stable when editing titles.

## Ten-year strategy

- Treat source content and meaningful change events as long-term records; store daily/weekly morphology snapshots according to use; keep transient high-frequency checkpoints separately from the public morphological history. Never store every animation frame.
- Keep the snapshot schema and simulation algorithm versioned, and include migration tests when changing the engine. Avoid treating a state reconstructed by a new renderer as a pixel-perfect capture of an older renderer.
- Periodically export encrypted/off-site backups of content, snapshots, and server state; perform restoration exercises, not only backup creation. Review cloud pricing and service changes annually.
- Run `node scripts/export-murmurgrove-history.mjs` to regenerate public observation files. The Astro build also executes this automatically. The history index is small; historical states are fetched on demand.

## Validation included

`node services/murmurgrove-state/test-worker.mjs` covers persistent state between requests, motion, ingestion, record addition/deletion and rejection of unauthenticated writes. Independent browser viewport tests cover History, Current, zoom and mode switches. Real Cloudflare deployment and real iPhone Safari testing remain pending.
