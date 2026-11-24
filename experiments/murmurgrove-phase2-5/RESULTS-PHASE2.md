# Phase 2.0 | Shared Morphology Rendering Sandbox | Engineering report

Date: 2026-11-19. Status: **code complete for first sandbox review; GPU/browser visual acceptance pending.**

## Frozen source

| Evidence | SHA-256 |
|---|---|
| Pinned audit projection | `2b88073d4333e42ce100a85b31bebfc1e1a8108e2df5ba6217d61182adb26fbb` |
| Pinned known-data projection | `62372e469ead425dd43fc16e737ea40cd48ce5a0188a87b868d1bee62c8ba9d3` |
| Simulated event stream | `18b6faa3b7c18ea4406bca09103eeaf411d438ebc6ece3e065ce42091465391a` |
| T0 snapshot | `2e7e806197f069d21e768208ee73f51e207afc1f5e4a8f6aa6167d7c6beba40f` |
| T1 snapshot | `3cbcb6783412a73566e093b2d6da6e15d40914bdf8c6c07639157b154d1c1626` |
| T2 snapshot | `94e013ea5dadb93b07c680d804795816c38d1f44b51ce50ef158eba21f192c3e` |
| Manifest | `8e5ee138209642b0324423d59796e268a87e935fed88003be759cd50e7cb6c10` |

These are deterministic SHA-256 pins of the JSON contract, not of raw archive Markdown or the whole Git repository.

## T0 → T1 → T2 (same event stream)

| Phase | Synthetic clock | Ordinary materials | Simulated Writing material | Activated fibers | Pulse chambers | Mature cores |
|---|---|---:|---:|---:|---:|---:|
| T0 | 2026-11-20T00:00:00Z | 174 | 0 | 0 | 0 | 0 |
| T1 | 2026-12-28T00:00:00Z | 174 | 0 | 12 | 7 | 0 |
| T2 | 2027-01-12T01:00:00Z | 174 | 1 | 15 | 5 | 2 |

The seven quarantined records are preserved in the frozen baseline but excluded from physical display and synthetic event activation. T1 retains 2026-03 real visit date **intervals**, mapped onto a fictional post-baseline clock. T2 is T1 + synthetic Writing, not a different independently chosen research history. All three scene files are labeled `SIMULATED_SANDBOX`.

## Automated tests

- **150 / 150 tests passed** on Node.js 22.16.0 in an extracted combined Phase 1B.4 + Phase 2.0 test fixture.
- **19 new Phase 2.0 tests**: byte-pinned source, same event stream, three physiological states, browser-compatible canonical hash verification, corrupted input rejection, topology integrity, zero mutation, deterministic geometry, no GL_LINES, finite triangle buffers, 12 optical slabs, output-path confinement, and protected logs unchanged.
- `node --check` passed for all new JavaScript modules.
- Local static server returned HTTP 200 for T2 JSON.

## CPU geometry construction, not GPU FPS

Measured in Node 22.16.0. These are mean CPU geometry-generation times over five runs in this container; **not** GPU render times and **not** browser frame rates.

| State | A (ms) | B (ms) | C (ms) |
|---|---:|---:|---:|
| T0 | 17.37 | 11.55 | 15.48 |
| T1 | 20.42 | 15.87 | 16.88 |
| T2 | 14.37 | 15.04 | 20.59 |

GPU submission estimates after optical batching (ordered translucent slabs + individual active tissue):

| State | A draws / triangles | B draws / triangles | C draws / triangles |
|---|---|---|---|
| T0 | 12 / 4,872 | 12 / 4,872 | 12 / 7,308 |
| T1 | 79 / 8,490 | 55 / 7,194 | 67 / 10,278 |
| T2 | 94 / 9,356 | 64 / 7,736 | 79 / 10,996 |

## Browser and optical limits (explicitly unverified)

- Headless Chromium in this execution environment blocked navigation to `localhost` and `file://` with `ERR_BLOCKED_BY_ADMINISTRATOR`; it also denied WebGL2 contexts even on an injected blank page. **No actual browser frame-rate, transparency artifact or 1000% close-up claim is made.**
- Three.js 0.180 integration is present and preferred by the viewer, but Three.js was not available locally and the CDN was unreachable in this execution environment. Its GPU path is **not yet runtime verified**. A self-contained native WebGL2 fallback uses the same source adapter and shader logic.
- The transparency algorithm is 12 coarse sediment layers plus object-level back-to-front ordering. This is an **approximation** of ordered transparent passes, not exact depth peeling or order-independent transparency. Intersecting translucent fibers may still exhibit artifacts.
- The Fresnel rim and AO are cheap illustrative approximations, not physically calibrated material models.
- Browser visual inspection, performance on a normal desktop GPU, and actual blind-test interpretation remain the next acceptance gate. **Do not publish to the TOW ARCHIVE homepage yet.**

## Protected boundaries

Only files under `experiments/murmurgrove-phase2/` are added. No existing archive data, locked numerical parameters, author event logs, production Astro components, package dependencies or Git history are modified. The snapshot generator's write destination is constrained to its own `public/data/` directory.
