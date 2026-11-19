# Murmurgrove Phase 1B.1 — Emergence & Thresholds (Headless Contract)

**Status:** tested numerical research prototype; NOT a browser renderer or a production-life model. 2026-11-19. No WebGL, no site changes, no live archive access. All stress histories are fabricated.

> We design the conditions of life, not the appearance of its outcome.

## Mathematical modules

### 1. Emergent propulsion cores

For candidate location `x`, a Gaussian observation kernel samples the existing Phase 1B morphology:

```
G_sigma(d) = exp(-d² / (2*sigma²))
D_concept(x) = Σ_{activated concepts c} A_c * G_sigma(||x-P_c||)
D_fiber(x)   = Σ_{active fibers f} T_f * material(f) * G_sigma(||x-M_f||)
C(x)         = sqrt(D_concept(x) * D_fiber(x))
```

`material(f)` is 1.50 when a Writing endpoint participates, 0.34 otherwise. There is **no preassigned core** and no enforced number of cores: a quiet organism may have zero, multiple strong regions may create several. Candidates are real activated concept and fiber-control-point positions; local maxima are filtered by geometric distance. The core's axial vector comes from tension-weighted local fiber tangents.

**IMPORTANT:** a node's SHA-256 seed is only a stable initial condition. It does **not** represent a measured relationship or a discipline affinity. `material(f)`, sigma and core cutoff are experimental hypotheses, not scientifically inferred parameters. A core is a field maximum, not a rendered dot.

### 2. Work reception, digestion, and physiological cohorts

Only `life.*` events referencing Phase 1A **explicit links** contribute *new mechanical work*; `archive.link.assert` alone never grows a fiber. Work uses explicit strength, whether the fiber was activated before, and local *geometric* distance (not semantic field distance).

`life.encounter` contributes low-level nutritional energy but **zero threshold-eligible work**. `life.writing`, `life.connection`, and `life.reinterpretation` can contribute threshold work. Thus 500 retroactive exhibition encounters cannot masquerade as 500 research breakthroughs, even if a small writing event lands in the same batch.

Time-adjacent inputs (default 24-hour ingestion window) form one physiological cohort; the original timestamps of every source event are untouched. Both nutrition and critical work saturate independently:

```
E_j = cap * (1 - exp(-W_j / cap))
D_j(t) = E_j * (1 - exp(-max(0, t-t_j) / tau))
```

`cap=2.6`, digestion timescale `tau=13 days`. `W_j` is positive, explicit-relation-driven *work*; the cap is metabolic capacity, not a hidden invented record. `D_j(t)` is evaluated analytically, not stepped through arbitrary archive maintenance dates.

### 3. Critical transition and refractory history

At each observation time, unconsumed eligible cohorts contribute accumulating structural charge. A threshold transition occurs at the earliest analytically solved time when charge exceeds the *current* inertia threshold:

```
Q(t) = Σ_{unconsumed eligible cohorts} D_j(t)
Theta = theta0 * (1 + inertiaGrowth * log(1 + previouslyConsumedRawWork))
```

Defaults: `theta0=1.5`, `inertiaGrowth=0.33`. After a transition, consumed cohorts cannot be reused to fire repeated transitions; the next major transition may not occur before a **45-day refractory period**. This is a stateful history derived *deterministically* from the event log, not from the number of frames shown or any computer's FPS. Every transition retains its causing original `life.*` event IDs.

`derived.threshold-transformation` is **not a new LifeEvent**. It does not invent Writing, exhibitions, people, links, or reinterpretation dates.

### 4. Observable structural reconfiguration

Each threshold has a direction computed from its real activated relation endpoints. The engine emits a `reconfiguration` layer with turn history and spatial displacement for the **existing** nodes and fibers, using a bounded strain rate resisted by finite lignification stiffness (`1+24L^4`). The original Phase 1B coordinates and fossil control points remain unchanged and inspectable. This extends the mechanical geometry rather than claiming a completed artistic rendering.

Connected components are built **only** from fibers activated by actual life events. An unrelated new Concept with no accepted links is represented as an independent `region`; the deterministic exterior placement yields a negative-space gap (default at least `0.55` simulation units), but **never adds a fake connection**. The placement is a representational geometric choice that will require aesthetic and technical validation in Phase 2.

### 5. Numeric audit measurements

The projections expose `geometryAudit.activityCentroid`, `densityVariance`, `maxLocalDensity`, `regionCount`, `isolatedRegionCount`, `coreCount`, and `globalDirection`. These are observations, *not* feedback criteria that force the organism to be symmetric or visually pleasing.

## Synthetic extremal scenarios (reproducible)

- **Extreme concentration:** 1 foundational Writing in 2027; 18 Writing events mostly directed to a different Concept in 2030–2032. Expect dominant core migration, density inequality, increasing structural inertia, and no per-event compulsory major jump.
- **Silence:** no LifeEvent after 2027. Expect activity decay and lignification, eventual zero detected active core, no newly fabricated branch, nonzero deterministic microSignal.
- **Rupture:** a new detached Concept appears in 2038 without an asserted link. Expect at least one independent region with a positive spatial gap, and no new link or critical jump.
- **500 late exhibition encounters:** recorded in 2030 but occurred in 2027. These enter a bounded nutrition cohort and cause zero critical leaps.
- **500 genuine Writing events on one date:** one digestion cohort, at most one threshold transition, zero repeated delayed triggers in later years.
- **Maintenance insertion:** a later title/date-only correction cannot affect the morphology or emergent-event hash at a common observation instant.

## Example read-only API

```js
import { simulateEmergence } from './src/emergence.mjs';
const state = simulateEmergence(events, {asOf:'2038-03-12T00:00:00Z'});
console.log(state.emergenceHash, state.cores, state.thresholds.transitions);
```

No real website files are written. No background loop is started.

## Hard limitations / honest scope

1. **Not a semantic model of disciplines.** Phase 1A currently lacks explicit typed cross-field relationships, so spatial distance and connectivity are **only** structural proxies; do not claim measured intellectual distance or actual academic interdisciplinarity.
2. **Not a validated 3D organism yet.** These are stable anchor/control-point state variables and derived reconfiguration coordinates, *not* an acceptable final graphical organism. No shader, light scattering, tissue generation, LOD or WebGL.
3. **Not fitted to real research.** Work multipliers, digestion constants and inertial rates are hypothetical. The example experiments are synthetic.
4. **Not a server-synchronized live simulation.** Identical events and observation instants produce identical states; true multi-viewer real-time delivery, physics interpolation and clock synchronization remain separate engineering tasks.
5. **Not an ethical purge.** Deleting an archive record does not automatically eradicate it from git history, backups, logs, CDNs or all derived traces. Do not consider this module GDPR/consent-delete compliant without a separate audited purge workflow.
6. **Scalability:** current Phase 1B relaxation recalculates 32 iterations per activation and full spatial density is O((N+F)^2). A ten-year, thousands-record benchmark with real events and bounded processing is still required. Only the headless digestion pass has been stress-tested with 500 life events.
7. **Revision policy:** data interpretations must be explicit LifeEvents; bare edits to archive metadata must not be promoted to physiological events.

## Tests

From `experiments/murmurgrove-phase1b/` run:

```sh
node --test tests/protocol.test.mjs tests/dynamics.test.mjs tests/emergence.test.mjs
node scripts/emergence-demo.mjs
```

The Phase 1A and 1B baseline files are not modified; Phase 1B.1 files are additive.
