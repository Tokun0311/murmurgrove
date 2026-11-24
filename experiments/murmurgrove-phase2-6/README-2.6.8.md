# Murmurgrove Phase 2.6.8 — Directional Flow, Not Tremor

Small additive rendering hotfix over **Phase 2.6.7**. It keeps the real archive topology, emerald palette, ultra-thin Bézier filaments, isolated independent records, and zoom/focus interactions.

## Confirmed reason for the previous trembling

In Phase 2.6.7 `drawRelationFlow` handed a 10× scaled time to `flowSamplesForRelation`, which then multiplied velocity by 10× again. The resulting light completed a curve in about **0.105 seconds** instead of the specified **1.05 seconds**. Meanwhile, node displacement was driven by fast sin/cos oscillation and the very small moving lights lacked a readable direction at 65% overview.

## Fixed

1. **Single 10× application**: `flowSamplesForRelation` now receives raw seconds, and multiplies its internal optical velocity by 10 only once. On a verified real relation, a glint travels the full curve in about 1.05 seconds.
2. **Short directional wake**: a small, semi-transparent emerald trail follows each optical glint along exactly the same verified cubic Bézier as the existing metadata link. Every wake point comes from that single source link; no new edges, nodes, or author-verified activation are created.
3. **Coherent spatial phase**: a gentle traveling optical phase uses the archive-derived local direction field, instead of speeding up independent high-frequency node shaking.
4. **Slower shape sway**: Bézier controls and micro-displacements follow the more gradual 4.5× breathing clock. Glint transport remains 10×, Whole and Growth keep their quiet pacing.

### No changes to source history

- 158 declared, non-quarantined metadata links, 174 displayable material nodes, 20 independent records.
- No author-confirmed life events, mature Writing fibers, synthetic connections, or rewritten snapshot dates.
- Original archive source, T0 snapshot, navigation manifest, metadata, and all SHA-256 hashes untouched.
- Exhibition observation brightness continues to use the 13-day *real calendar* decay, not optical playback time.
- Mouse cursor zoom and focus behavior unchanged.

## Install

Extract ZIP. Merge its `experiments` folder into the **inner** TOW ARCHIVE repo:
`C:\Users\deng\Desktop\tow-archive\tow-archive\`

The ZIP updates only:
- `experiments/murmurgrove-phase2-6/public/viewer.mjs`
- `experiments/murmurgrove-phase2-6/public/relation-flow.mjs`
- Two existing test files, one new test file, and this README.

Keep your existing files in `public/data/` as they are. Run `VERIFY-THREADS.cmd`, then `OPEN-THREADS.cmd` and select the third quiet lens at 65% zoom.

## Validation

- Automated Node tests: **50/50 pass**.
- Desktop Chromium emulating a 390×844 mobile viewport: no page errors, 158 verified links, mode switch works; FPS sampled at ~60, **not a real mobile performance guarantee**.
- Browser frame comparison across 650 ms: Movement changes substantially more pixels than Whole.
