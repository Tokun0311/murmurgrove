# MURMURGROVE — Sonic Topology v1

## Why this exists

The early Becoming sound tests could produce evolving noise without making the *relationships in this specific archive* audibly consequential. A changing texture is not enough. This iteration introduces a reproducible, relation-specific structure descriptor.

## Input, source and mapping

The homepage obtains verified relations from `createMurmurgrove()` in `src/lib/murmurgrove.ts`: direct Exhibition ↔ Institution/People/Concepts and reinforced cross-section shared occurrences. `sonicGraph()` reads their actual endpoints, weight and kind. It is calculated on initial page load and when selecting a saved History state. No sound is assigned per entry, and record count is not a direct volume, tempo or pitch control.

`sonicGraph()` derives:

- **Integration**: share of *linked* nodes in the largest connected component.
- **Connectivity**: fraction of graph edges creating redundant paths (cycles).
- **Crossing**: share of edges crossing section categories.
- **Reinforcement**: normalized repetition strength beyond the first link.
- **Heterogeneity**: variety of the section-pair relationship types.
- **Signature**: order-independent digest of the true edge identities and weights; used for diagnostics, not pitch.

These shape the *possible* overlap, filtering and spectral distribution of the three existing non-tonal sound strands. The existing real-time movement metrics continue to govern their moment-to-moment development. No natural recordings or preset melodies are used.

## Verification criteria

1. **Traceable:** the sonic state is determined by identifiable archive relations, not only the sum of records.
2. **Consequential:** two graph structures with the same number of edges can yield different sonic states. A reinforcement change can alter the state without adding records.
3. **Stable:** changing root input order or reversing endpoint orientation does not change its descriptor.
4. **Honest history:** only compare known saved graph states. The implementation does not infer historical transitions from `visitedOn` or pretend to reproduce archival sound recordings.
5. **Visitor experience:** sound remains off until activated; its artistic character has **not** been validated by a human-listening study. Passing structural tests does NOT establish that it sounds organic or compelling.

Run `npm run test:sonic` on Node 22+ (uses experimental TS type stripping), and check `tsc --noEmit --lib dom,es2022 --target es2022 --module esnext src/lib/murmurgrove-sonic-structure.ts src/lib/murmurgrove-audio.ts` where the TypeScript CLI is available.

## Known limits

- The descriptors summarize graph structure, but do not prove the artistic meaning of a relationship.
- Graph changes are recognized after content rebuild and deployment; they are not live writes to Cloudflare Pages.
- Sonic lineage still largely persists for a browser session, **not** as a portable, reproducible ten-year performance history.
- Historic versions missing a `roots` field correctly have no topology evidence rather than invented connections.
- Sound remains synthesised. This change is a **mechanistic proof**, not a finished sound artwork.
- The sound engine uses legacy Becoming II noise material; a future sound-design stage can change timbre without losing this tested data interface.
- Formal Astro build, real iPhone Safari playback and perceptual A/B testing remain pending.
