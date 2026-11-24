# Murmurgrove Phase 3.1 · Lived Acts / Explicit Authorship

**Patch dependency:** Phase 3.0 (Present Optical Frames) installed. The zip includes only changed or newly introduced files.

## Why this exists

Phase 3.0 stores observable pixels. Phase 2.8/2.9 store independently verified **archive source structure**. Neither is evidence that an author performed research at the time of an old exhibition or that actual morphology existed then.

Phase 3.1 starts a **third evidence stream**: one author-confirmed research action, manually attested and explicitly sealed. No such events are bundled with this patch. The official ledger begins **with zero entries**.

### What is enabled

- `life.encounter`: the author confirms actually engaging with an existing, verified record NOW; this is an observation / research encounter, not verified Writing or automatic filament activation.
- `life.reinterpretation`: the author confirms actually reinterpreting an existing, verified record NOW, with their own 12–500 character account. The `interpretedOn` field records the day of the current author confirmation, not a reconstructed old exhibition date.

`life.writing`, `life.connection`, archival link assertion and corresponding threshold physiology remain DISABLED until real supporting Writing records and author-asserted links can be matched to an updated checked archive source. No synthetic links, no invented historical acts.

Every sealed record preserves the Phase 1A compatible event envelope (`murmurgrove.event.v1`), equal `recordedAt` / `effectiveAt`, a real current archive record ID and route, the pinned archive checkpoint hash, the author's declaration, optional public HTTPS evidence URL, and an independently computed SHA-256 checksum chain. **Attestation confirms what the author declares; a checksum does not independently prove that the action occurred.**

## New interface

Open `OPEN-THREADS.cmd` > `History` > `Lived acts`.

1. Choose `Encounter` or `Reinterpretation`.
2. Choose ONE record from the verified archive, and describe something you **actually did**, not a plan, in 12–500 characters. Optional HTTPS reference.
3. Check the explicit first-person confirmation. Click `↓ 导出待封存事件`. The browser downloads a JSON draft; this alone does not change the living body or ledger.
4. Double-click `IMPORT-LIVED-ACT.cmd` in the phase experiment folder. Paste the full path of the downloaded JSON and type `Y` to confirm **again**. The script checks source bytes, schema, recorded time, chronological order, absence of duplicates and file hashes, then saves the event and updates `public/data/lived-events/index.json`.
5. Refresh the experiment page. A sealed event appears in History; clicking the row focuses its verified particle. The particle gains a very subtle green ring labeled as an optical **evidence trace**, not as biological tissue.

**Important:** The import refuses a draft older than seven days (or >60 seconds in the future) and rejects reordering behind previously sealed records. To record a later action, start a new draft at that time. Neither old `occurredOn` values nor archive capture timestamps are recycled as research-event timestamps.

## Data ethics / publication

- Notes and URLs are plain-text inside an event JSON. **Treat the `public/data/lived-events/` directory as PUBLIC if committed/deployed.** Never put personal secrets or others' private information there. This is an experimental local workflow; review thoroughly before choosing to publish anything.
- Withdrawal and erasure take priority over retaining a perfect chain. This version does not yet provide a safe one-click withdrawal workflow, and deleting a file in the working directory DOES NOT remove it from Git history, remote repos, cached deployments or backups. Do not treat this as a publication-ready ethical history system.
- A hash chain detects accidental modifications. It is not a cryptographic signature, identity authentication, proof of occurrence, or immutable guarantee.
- This version's authoritative T₀ remains unchanged: 181 records; 174 drawn records; 158 verified visible metadata edges; 20 unrelated records; **zero authored activation fibers and zero mature Writing cores**. Sealed encounter/reinterpretation events are separate from structural growth.
- No automatic events are captured from mouse movements, page views, selection, observation dates, archive updates or screenshot captures.
- The organism's baseline Optical Movement 6×, emerald palette, curves, zoom, History tabs and source reading remain unchanged.

## Installation and verification

Copy the ZIP's `experiments` folder into the **inner** Git root:

`C:\Users\deng\Desktop\tow-archive\tow-archive\`

Merge/overwrite the indicated files. Retain the existing phase experiment folder, T₀ and previous source snapshots. Then run `OPEN-THREADS.cmd`. Run `VERIFY-THREADS.cmd` for all tests.

The patch adds/changes ONLY:

- `public/index.html`, `public/viewer.mjs`
- `public/lived-events.mjs`, `public/data/lived-events/index.json`
- `scripts/import-lived-event.mjs`, `IMPORT-LIVED-ACT.cmd`
- `tests/lived-events.test.mjs`, `tests/movement-pacing.test.mjs` (assertion updated to allow author-attested events without fabricating Writing), and this README.

It does **not** touch original archive baseline/geometry/navigation, pre-existing approved source checkpoints, old optical frames, Movement pacing, nor previous scripts.

## Verification in sandbox

- `node --test tests/*.test.mjs`: **89 / 89 passed** (all previous suites plus Phase 3.1 tests).
- CLI integration in a **disposable copy**: author draft → manual seal → index hash verification → duplicate rejection → pinned-source modification rejection.
- Chromium browser simulation in `1200×850` desktop and `390×844` mobile viewports: loaded 174 real nodes, verified zero published live events, entered new History tab, refused unchecked confirmation, exported a correctly structured JSON after checking, no script errors.
- Browser synthetic fixture in **disposable memory only**: one sealed event loads and displays in History, with event count 1. **No artificial event is included in the official patch.**
- Real hardware/frame rate and actual Windows `.cmd` interaction are not established by Linux/browser simulation; test locally.

## Next step: Phase 3.2

Make saved, author-attested events update a **deterministic derived physiological state** using the original Phase 1B rules, while preserving the source geometry, clearly distinguishing a current event from a previously captured optical frame. In particular, do not activate a Writing fiber or invent a link without its requisite verified author evidence. Design first-class revocation/redaction before public publishing.
