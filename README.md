# Murmurgrove · Phase 1B — Morphology Dynamics Engine

**Status:** Independently runnable numerical prototype (MVO), **not** a website patch.  
**Date:** 2026-11-19  
**Environment:** Node.js 22 or later, standard library only. **No WebGL, browser, external packages or randomness.**

> We design the conditions of life, not the appearance of its outcome.

## Run

From this unzipped folder:

```sh
node --test tests/*.test.mjs
node scripts/dynamics-demo.mjs
```

On Windows CMD, the glob may not expand: run `node --test` (auto-discovers test files) or `node --test tests/dynamics.test.mjs tests/protocol.test.mjs`.

The fixture (`fixtures/synthetic-events.json`) is **synthetic**. No user archive was read, modified, or migrated. No actual website file is changed.

## Files

| Path | Purpose |
| --- | --- |
| `src/protocol.mjs` | **Unmodified copy** of Phase 1A validator/replay engine. |
| `src/dynamics.mjs` | Pure deterministic state evolution, fields, springs, fossils, microcycles, measurable observables. |
| `fixtures/synthetic-events.json` | Same Phase 1A synthetic 2027→2037 sequence. |
| `tests/protocol.test.mjs` | Phase 1A tests preserved. |
| `tests/dynamics.test.mjs` | Phase 1B numerical, determinism and event semantics tests. |
| `scripts/dynamics-demo.mjs` | Prints observed coordinates, activity, lignification, branches, and state hashes. |
| `SPEC.md` | Model equations, contract, assumptions, test outcomes and open engineering issues. |

## Contract

```js
import {simulateMorphology, metrics, seedPoint, directionField, microSignal}
  from './src/dynamics.mjs';

const snapshot = simulateMorphology(events, {asOf:'2036-07-21T00:00:00Z'});
console.log(snapshot.morphologyHash, metrics(snapshot));
```

**Phase 1A `archive.*` events are not automatically promoted to `life.*`.** An explicit link assertion only becomes an active fiber after a life event names that link in `payload.linkRefs`. This is intentional.

`simulateMorphology` returns a JSON-serializable, deterministic model state, including coordinate anchors and 5-point fiber centerlines. **These are computational data, not a prescribed particle-and-line rendering aesthetic**; the future renderer must respect the morphological ontology in the charter. `microSignal` computes a reversible clock-linked local oscillator without mutating the model.

### Key safety boundary

This package has **no delete-from-Git, backup purge, or public History update**. Removing a record in the test protocol affects the current projection, but is **not an ethical erasure mechanism**. See `SPEC.md`.

### Mathematical status

The constants (half-life, spring stiffness, field strengths, activation amplitudes, etc.) are **hypotheses used to validate causal behavior**, not learned or calibrated parameters. Do not present these numerical curves as a faithful quantification of the user's real intellectual work.
