# Murmurgrove — Pulse v1 (2026-11-17)

This is **live synthesis**, not a recording, music loop, imitation heartbeat, or one note per archive record.

## Activation and experience

- The icon **♪** next to the zoom/reset controls is OFF by default. Click or tap to listen, then again to fade out.
- The sound fades in to a quiet background level rather than playing immediately at full volume. Start at a modest device volume.
- Whole, Growth, Movement, zoom, rotation and History continue to work. A changed archive state updates the sonic ecology as well as the image.
- Rotation modifies **stereo perspective only**, not the organism's underlying harmonic state.
- The browser suspends audio when the page becomes hidden. On some phones a further tap may be required to restart an interrupted audio context.
- No user microphone, uploaded audio assets, extra hosting service, tracking, or external audio dependency is used.

## Actual mapping

All inputs come from the same in-browser relational-ecology-v2 state as the 3D canvas; samples are bounded for mobile efficiency.

| Metric | Computed from | Audible influence |
| --- | --- | --- |
| Coherence | Vector agreement in sampled real record movement | interval stability, resonance and texture |
| Tension | Mean 3D distance / strain across *real* relationship roots | interval spread, filter color |
| Transformation | Change in sampled record motion vectors over time | modulation rate and air texture |
| Persistence | Strong and repeated relationships in actual roots | harmonic foundation and sustained voice |

The instrument has three voices, filtered deterministic noise, one slow gain modulator and a soft limiter. It uses Web Audio API nodes and parameter smoothing; there is **no fixed BPM**. At the time of this release there is no AudioWorklet and no sound attached to individual dots.

## Future / historical fidelity

Current content collections and relationship roots drive the current sound after each site build. Historical archive snapshots can drive Pulse v1 if their relationship data is present. The `sonicVersion` metadata marks the **current** sound mapping. Historical sounds have not been recorded and should **not** be described as authentic archived audio; changing synthesis algorithms will change the result of re-rendering old snapshots.

For archival fidelity across ten years, store algorithm versions and optionally export periodic audio renders together with snapshots. Keep synthesis separate from the archived content itself.

## Mobile performance

- Only a handful of constant-running Web Audio nodes are used.
- Four metrics update around four times per second, based on at most ~90 record velocities and ~110 roots.
- The audio engine does not render or traverse the network at audio sample rate, and does not add Canvas redraws.
- Full iPhone Safari testing and formal Astro production build have **not** been completed in this environment.
