# Murmurgrove — Phase 1B.1 incremental experiment

**Do not extract this ZIP over your website's `src/`, `scripts/`, `tests/`, root README or `public/`.**

The archive is intentionally nested under `experiments/murmurgrove-phase1b/`.
Copy **only the included `experiments/` folder** into your existing `tow-archive` project. Choose to merge folders and copy the *new* files listed here. Existing 1A and 1B files do not need replacing.

New files:

- `src/emergence.mjs` — deterministic joint field maxima, assimilation episodes, threshold resolution, observable skeleton deformations, independent islands.
- `fixtures/stress-scenarios.mjs` — synthetic histories for concentration, silence, rupture, 500 late encounters and 500 current writings.
- `tests/emergence.test.mjs` — additional automated tests.
- `scripts/emergence-demo.mjs` — prints numerical results; does not modify your archive.
- `SPEC-1B1.md` — explicit equations and limitations.
- `README-1B1.md` — this installation guide.
- `MANIFEST-1B1.sha256` — checksums for new files.

## Run on Windows (CMD or PowerShell)

From your `tow-archive` folder:

```powershell
cd experiments\murmurgrove-phase1b
node --test tests/protocol.test.mjs tests/dynamics.test.mjs tests/emergence.test.mjs
node scripts/emergence-demo.mjs
```

This package is headless. It adds no visual screen, no browser libraries and no changed Murmurgrove homepage. After confirming the tests, only commit the **new** files under `experiments/murmurgrove-phase1b/` in GitHub Desktop. No need to edit or regenerate History.

The experiment's numerical results are based on intentionally synthetic records and provisional parameters. A successful test does **not** establish that the final organic visual form is aesthetically or biologically adequate.
