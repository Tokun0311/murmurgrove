# Murmurgrove Phase 2.0 | Shared Morphology Rendering Sandbox

**Status: additive visual prototype, not a production-ready renderer.**

## Open without CMD (Windows)

1. Unzip the patch and merge its `experiments` directory into the INNER project repository, normally:
   `C:\Users\deng\Desktop\tow-archive\tow-archive\`
2. Double-click `experiments\murmurgrove-phase2\OPEN-PHASE2.cmd`.
3. A browser opens at a local-only address. Leave the separate Node.js server window open while viewing; close it to stop.

Node.js 22+ is already required by the previous numerical tests. No changes to `package.json`, Astro, Git, Cloudflare or the public website.

## Controls

- A/B/C: three material interpretations of **the same** snapshot.
- Time slider / keys 1,2,3: T0 silent, T1 encounter pulses, T2 matured Writing.
- Drag to orbit, wheel to zoom between 1x and 10x, R reset.
- H toggles blind mode: all UI hidden, no always-visible labels in 3D.
- FPS button shows a runtime FPS counter, draw calls and triangle counts on **your browser**.
- Add `?renderer=native` to the local URL to force the dependency-free native WebGL2 renderer. Default tries Three.js 0.180 from an external CDN, then falls back to native WebGL2 after an error or three-second timeout. Both use the same geometry adapter and shader design. Offline usage works through the fallback. The Three.js route requires internet.

## Data provenance

- 181 original archive records: 174 ordinary, seven quarantined and never physically rendered.
- 158 metadata evidence references, none automatically activated.
- T0: 174 material wisps, 0 active fibers, 0 pulses, 0 cores.
- T1: 12 simulated encounters from real March 2026 visit intervals, 12 simulated asserted fibers, 7 transient pulse chambers, 0 mature cores.
- T2: T1 plus one **fictional** Writing after T1, and 13 days of persistence: 175 nodes, 15 fibers, 5 remaining pulses, 2 mature cores.
- T0/T1/T2 are **one continuous counterfactual timeline**. They do not represent actual authorial life events, backdated ingestion or reconstructed historical bodily states.
- `public/data/manifest.json` pins SHA-256 of each full render snapshot. The browser verifies hashes before constructing the scene and refuses to render if altered.
- Geometry adapter is read-only. Its deterministic wisps, collagen strands, optical veils and shells are *render geometry*, not research links or modified Phase 1B.4 positions. For 20 metadata singleton records, the previously validated Phase 1B.3 `DISPLAY_ONLY_NO_FORCE_OR_NEW_LINK` layout is used in the display layer only.

## Rendering caveats

- No point-link graph, no `GL_LINES`, no always-visible labels.
- BufferGeometry triangle strips with shader-enforced minimum 1.25 screen pixels, for near-view anti-dropout.
- 12 coarse depth slabs batch dormant sediment; active objects are ordered back-to-front each frame. This is **ordered transparency, not true per-fragment depth peeling**, and it does **not guarantee** freedom from intersecting transparent surface artifacts. Depth writes are disabled for translucent material.
- Rim contrast and local age/activity shading are low-cost optical approximations, **not** physically accurate Fresnel or true volumetric ambient occlusion.
- 1000% zoom is an experimental camera limit; real GPU and browser frame-rate testing is still required.
- The default Three.js path loads from a CDN. The offline fallback is native WebGL2, not Three.js. This must be made fully local before production deployment.

## Internal tests

For developers only (not required to open the viewer):

```
node --test experiments/murmurgrove-phase1b/tests/*.test.mjs experiments/murmurgrove-phase2/tests/*.test.mjs
```

150 tests passed in the assistant's Node 22.16.0 fixture, including 19 new Phase 2.0 tests. This validates deterministic snapshot production, provenance, read-only geometry, quarantines and generated triangle buffers, **not** browser GPU FPS. The assistant's browser runner blocked local/file navigation and WebGL2 contexts, so no honest browser FPS or visual-quality assertion can yet be reported. The viewer includes an FPS counter for the first real desktop-browser evaluation.
