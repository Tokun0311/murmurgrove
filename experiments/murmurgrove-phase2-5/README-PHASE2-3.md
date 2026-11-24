# Murmurgrove Phase 2.3 | Local optical refinement (Phase 2.2 follow-up)

**Scope:** independent SIMULATED_SANDBOX only. Does **not** modify the live TOW ARCHIVE website, its `src/data` Markdown, History, synthetic snapshot JSON, archive navigation JSON, author logs, or Phase 1B physiological parameters.

## Changed (render-only)

1. **Extracellular veil:** `mainDeclaredComponent()` resolves exactly **123** source-backed metadata members in the pinned Phase 2.2 projection. `deriveExtracellularVeil()` creates overlapping, low-opacity Gaussian shadow and cold-green matrix sprites **only at locally supported positions within that component**. This does not assert new connections or fill spatial gaps. Outside it, the isolated materials remain visible but have no invented bridge.
2. **T1 volume pulses:** seven unchanged T1 pulse entries each gain two soft radial optics layers. Their opacity uses the *snapshot's already-decayed amplitude*, not a second invented encounter timestamp or additional 13-day decay.
3. **Close-up spline/tubes:** five original `fiber.points` control positions remain untouched. The existing Catmull–Rom geometry sampler now uses 64 samples per fiber; the view layer builds continuous seven-sided swept tubes with parallel-transport normals and a consistent outward winding. Fragment shading discards the far shell, attenuates silhouettes through Fresnel, and avoids strip-joint overlap.
4. **Inactive material:** the 174 T0 dormant materials each acquire a small radial-Gaussian optical deposit, with translucent edges instead of polygon cutouts. Non-semantic backdrop material remains separate from life activity.
5. **Focus + Context:** selected material scales to 1.35× source opacity, nonselected to **28% of source opacity**. This is a relative opacity multiplier, not a promise of precisely 28% apparent luminance after alpha compositing. Background remains visible.
6. **Locator:** removed the hardcoded dashed oval, replaced it with a camera-relative node-density projection (pure display); `AZ` reads within [0, 360). Selection green / camera target blue remain separate, and clicking the locator still resets the camera.
7. **UI:** rounded visible fiber tension to two decimals; timeline explicitly reads `T₀ — T₁ — T₂`; opened detail panel makes the FPS floating panel move aside.

## Frozen evidence / tests

The source `public/data/T0.json`, `T1.json`, `T2.json`, `manifest.json`, `navigation.json` files are **not packaged or changed**. These remain the same SIMULATED_SANDBOX examples and must never be represented as actual autobiographical life events.

Verified in a reconstructed, combined Phase 1B + Phase 2.0 + 2.1 + 2.2 project:

- **57 / 57 node tests pass**, including **17 new optical tests**.
- `node --check` passes on the modified JS files.
- Render triangles under variant C: T0 ~18,406; T1 ~41,404; T2 ~46,848; approx. 12 / 57 / 59 draw batches, respectively. These are CPU geometry estimates, **not GPU FPS**.
- **No successful actual WebGL browser visual pass in this execution environment.** The local headless Chromium EGL/ANGLE initialization failed. User browser acceptance of 1×/10×, optical darkness, alpha sorting, and sustained FPS is still needed.

## Installation (into real repo, not the outer folder)

Unzip, then merge the enclosed `experiments/` folder **into**:

`C:\Users\deng\Desktop\tow-archive\tow-archive\`

Overwrite **only the matching Phase 2 rendering files included in this patch** when Windows asks. Never overwrite `src/data`, `public/murmurgrove`, `History`, or the Phase 1B engine. The ZIP is already shaped correctly; do **not** create another `experiments/experiments` nesting.

The original `OPEN-PHASE2.cmd` still launches the same standalone sandbox. To rerun tests, double-click `experiments/murmurgrove-phase2/VERIFY-PHASE2-3.cmd`, or run this command inside that directory:

`node --test tests/phase2-sandbox.test.mjs tests/phase2-navigation.test.mjs tests/phase2-coherence.test.mjs tests/phase2-optical-refinement.test.mjs`

Keep the previously verified Phase 2.2 installation as your rollback point (Git change/commit or a local copy). Do not commit/push until testing the 1× and 10× views in a real GPU browser.

## Known visual limitations

- Not physically simulated volumetric AO: the veil is a bounded screen-space soft optical deposit, and alpha sorting still approximates depth by slabs/objects.
- Small tubes can become subpixel at 1×; the extracellular veil and local pulse haze are responsible for distant material volume.
- All 123 nodes participate in the **component definition**. Some distant nodes intentionally receive *no* veil if fewer than two close neighbours support a real local density sample; this avoids creating misleading visual bridges.
- T0/T1/T2 remain simulated stages. A genuine cross-device synchronized production organism is not yet implemented.
