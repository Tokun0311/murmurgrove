# Phase 2.6 real-baseline viewer · verification record (2026-11-20)

## Automated integrity
- `node --test tests/*.test.mjs`: **8 / 8 pass**, 0 failed.
- Source baseline (181), 7 quarantined, rendered 174 records, exactly 158 source-backed metadata relations, 20 disconnected singletons and 123 nodes in main connected component.
- Baseline hash pinned: `62372e469ead425dd43fc16e737ea40cd48ce5a0188a87b868d1bee62c8ba9d3`.
- Pinned frozen `T0` source from Phase 1B.4, not a claimed historical reenactment.
- No author-verified Writing activation or mature cores; no synthetic `T1/T2` data used.

## Browser test, with limitations
- Container Chromium refuses ALL regular URL navigation (including `localhost`) with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore **no full networked browser end-to-end pass is claimed**.
- Render/interaction check was instead performed in Chromium mobile-size emulation (`390×844 CSS`, DPR 2) by injecting the exact local HTML/JS/data fixtures into an `about:blank` page. Only `fetch()` and SHA-256 delivery were substituted in that harness; Node independently verified the real SHA-256 pins.
- Verified script initialization with zero page errors, `Whole / Growth / Movement` switching, source-backed archive card with title/href, zoom `291%`, micro body locator visible at >200%.
- Reported emulated browser FPS fluctuated around **55–61 FPS** in this execution; this is **not** proof of 60 FPS on physical iOS Safari / Android Chrome.
- HTTP server independently returned 200 for the homepage. No site or author log files were written.

## Known semantic limits
- Amber observation halos are computed only from real exhibition `occurredOn` dates with a **13-day optical decay**; they are NOT author-verified `life.encounter`, threshold work, or mature propulsion pulses.
- Growth uses archival visit age, NOT physiological woodification or an invented ten-year timeline.
- The reference T0 geometry is a deterministic baseline projection based on real record IDs, NOT a reconstruction of past user experience.
- Gaussian-neighborhood visual micro-waves are not author-intent or semantic relations. Each fine fiber maps to one actual metadata reference; the three parallel hairline samples of that edge are graphical sub-strands sharing identical source/target IDs, never three different link assertions.
- An eventual active-life preview must be based on validated author-approved logs and a verified physiological engine projection. Until that exists, active Writing thickness remains zero.
