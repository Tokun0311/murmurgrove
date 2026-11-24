# Murmurgrove · Phase 2.8
## Archive Versions: beginning a truthful version chronology

**Incremental ZIP patch over Phase 2.7** (which itself follows 2.6.9). It is not the published TOW ARCHIVE site, and it does not deploy anything.

### What you can do now

Open **History → Archive versions**, alongside the earlier **Visit traces** tab.

- The first, **only available historical source checkpoint** comes from the existing known-data baseline with `baselineCalendarDate=2026-11-19`. **Its recordedAt is unknown; there is no invented time of day.**
- It describes **181 archived records, 174 non-quarantined visible records, 7 quarantined records, 172 metadata references, 158 visible metadata references, 20 independent displayed records, and 0 approved life events**. Original T0 optical geometry is referenced by SHA-256, but explicitly marked a **simulation-seeded, silent display projection**, **not a historical organism observed on 19 November**.
- The index uses a SHA-256 checksum chain of entries. Choosing a version separately checks the **exact two source-file byte hashes**, not merely its title or numerical counts. Hashes detect accidental edits but **do not establish a cryptographic author identity**.
- **Visit traces** still groups 57 real recorded exhibition dates. It never rewinds the organism or mistakes those dates for source ingestion, publication, or physiological events.
- **Archive versions** is an audit reader. It does not replay body shape, extrapolate growth, edit archive data, create history for the seven quarantined entries, or make the simulated T1/T2 phases real.
- The green palette, 6× directional Movement, 4.5× breathing, camera/pan/zoom, and 158 links are not changed.

### Future workflow: explicitly capture new verified archive revisions

Only when you have a **genuinely updated and author-reviewed export** of both `known-data-baseline.v1.json` and `navigation.json`, click `CAPTURE-ARCHIVE-VERSION.cmd` within the existing sandbox directory. It will ask for the export folder path, what changed, and a Git commit or verification reference, then require explicit author/reviewer confirmation. Do not use the old, unchanged files: the tool rejects a duplicated checkpoint.

Or use the CLI:

```cmd
node scripts\capture-archive-version.mjs --input "C:\path\to\verified-export" --note "Updated confirmed relationships" --source-ref "Git commit or reviewed export ID" --author-approved
```

The tool:
1. checks canonical source fingerprints, archive identity sets and metadata-only constraints, and verifies all earlier stored checkpoint byte hashes;
2. rejects a no-change duplicate and non-substantive formatting-only changes;
3. records current **capture time** separately from source dates, calculates added/removed/edited records and metadata references;
4. writes **new, never-overwritten** source copies into `public/data/chronicle/states/<checkpoint-id>/` and updates the hash-chained `index.json`;
5. does **not** modify `src/data`, original `public/data/T0.json`, the live archive website, or any physiological state; review and commit the new chronicle files yourself in GitHub Desktop.

This tool currently accepts **source-only verified exports that still have no approved life events**. If you later have genuine author-verified life events or a changed geometry/physiology engine, a dedicated, validated import and a renderer upgrade will be needed. No fake visual playback is substituted for that work.

### Install

Extract the ZIP and copy/merge its `experiments` folder into the **inner** project root:

`C:\Users\deng\Desktop\tow-archive\tow-archive\`

Overwrite **only**:

- `experiments/murmurgrove-phase2-6/public/index.html`
- `experiments/murmurgrove-phase2-6/public/viewer.mjs`

New, additive files:

- `public/version-chronicle.mjs`
- `public/data/chronicle/index.json`
- `scripts/capture-archive-version.mjs`
- `CAPTURE-ARCHIVE-VERSION.cmd`
- `tests/version-chronicle.test.mjs`
- `tests/capture-archive-version.test.mjs`
- `README-2.8.md`

Other files remain byte-for-byte unchanged; do not replace the old `data/*.json` files with a simulated future.

Double-click the existing **`OPEN-THREADS.cmd`** and then **History → Archive versions**. The existing `VERIFY-THREADS.cmd` runs all tests, including append-only capture tests performed safely inside a throwaway directory.

### Verification boundaries

- **66/66 Node tests passed** (58 earlier, 8 new). All original pinned baseline SHA-256 checks passed. The capture integration test verified creation, source diffs, hash chain, persistence, refusal without human attestation, and refusal to duplicate a snapshot.
- Chromium DOM-based smoke tests of **1280×800 desktop** and **390×844 mobile** passed: loaded the real renderer and local source fixtures, switched between Visit traces and Archive versions, verified selected source byte digests, and reported no page-level JavaScript errors.
- Browser navigation to localhost/file URLs is disabled in the sandbox, so this uses an explicit injection test fixture. This is not a physical-device performance benchmark or a complete test of a future real-source export.

**Conceptual boundary:** What is preserved now is a verifiable *record of what archive data existed at a particular source checkpoint*. It is the groundwork for a future **morphological history**, not proof that the current body's historical shape can already be reconstructed.
