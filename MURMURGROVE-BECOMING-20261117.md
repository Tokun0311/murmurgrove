# Murmurgrove · Becoming (sound prototype)

## Creative principle

The mangrove propagule sound shared by the archive's author is a **reference for transition and continuation**, **not a sample, imitation, or impact sound effect**. A separation inaugurates a trajectory and later encounters; it does not mark an ending.

The new opt-in Web Audio prototype replaces Pulse v1's continuous pitched ambient tone with a **sparse, evolving, non-tonal material texture**. There are no borrowed recordings, fixed melodies, per-record sound effects, or beat clocks.

## Mechanism

- **Gestation**: coherence, tension, transformation and persistence of the existing relational ecology contribute to a slowly accumulating internal state. No direct record-count-to-volume mapping.
- **Separation**: crossing a state-dependent threshold changes the stored `lineage`, `openness` and threshold, and unfolds a short, non-percussive spectral transition.
- **Encounter**: the first transition opens a later secondary response, with a different envelope and frequency trajectory.
- **Continuation**: the altered internal parameters shape future events during the current visit. Audible events are not independent samples.
- **Silence**: meaningful gaps between transitions remain. The page does not play background music while waiting.

The visual renderer's established measurements are used as the living input at about four updates per second. Web Audio scheduling runs separately at low frequency, so audio does not trigger Canvas re-renders. Rotating the view alters sound perspective rather than the archive relationship metrics. Switching to a saved historical state changes the generative conditions, but **does not reconstruct a historically recorded sound**.

## Implementation files

- `src/lib/murmurgrove-audio.ts`: new Becoming generator and state transitions.
- `src/pages/index.astro`: sonic version label, information text, notification of historical state changes.

## Boundaries

- This is a **conceptual audio prototype**, not a psychoacoustically validated model of biological life.
- Its aperiodic audio buffer is synthesized in-browser; it does not include or reuse the author's Vietnam field recording.
- In-session lineage is carried forward; permanent, year-by-year **sonic lineage snapshots are not yet implemented**.
- A separate offline MP3 preview demonstrates a similar gestation/encounter approach with **simulated** changes. It is **not** a recording of the live site or measured movement.
- Automated checks: TypeScript compilation of the audio module, Chromium opt-in audio start/mute and forced transition tests at two viewport widths, ZIP consistency. Full Astro production build and real iPhone Safari audio testing remain outstanding.

## Preservation

All other archive pages, the 3D organism, zoom, History UI, translucent controls, and archive-generated relationships are unchanged from Pulse v1. Only the sound behavior and its homepage integration were modified.
