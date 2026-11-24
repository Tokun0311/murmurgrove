# Murmurgrove · Phase 3.3 / Attested Life & Rule-State Chronicle

**Development status:** Stable, tested **local research sandbox**. **Not a public deployment** and not a validated historical physiological model. Bundled as a cumulative release so older patches are unnecessary.

## Windows · launch

Copy the `experiments` folder into the inner Git checkout:

`C:\Users\deng\Desktop\tow-archive\tow-archive\`

Merge and overwrite existing files under `experiments/murmurgrove-phase2-6/`. Do **not** replace the TOW ARCHIVE site's own `src`, `dist`, or root configuration. Then double-click `experiments/murmurgrove-phase2-6/OPEN-THREADS.cmd` and open `http://127.0.0.1:4186/`.

The cumulative package includes previous Phase 2.6–3.1 work (65%–2400% cursor zoom, emerald fine filaments, Movement 6×, Visit traces, Archive versions, Source Structure reading, Optical frames, Lived acts) plus Phase 3.2/3.3 in this release. Existing T₀, baseline, navigation and manifest are byte-for-byte unchanged from the original freeze.

## New: Life states

`History → Life states` shows derived present activity and dated rule-based event reconstructions **only from manually attested, sealed author actions**. Without them the true count is zero. No linked metadata item is secretly promoted to a new semantic edge. No Writing fiber or mature propulsion core can activate with the current two allowed event types.

**Interpretive parameters, not measured cognitive quantities:** encounter weight 0.34, half-life 21 days; reinterpretation weight 0.52, half-life 60 days; reinterpretation adds 0.12 capped sediment (max 0.6); one-hop optical neighbor resonance is strictly restricted to original 158 edges and capped at 0.23; visual shift is bounded to 0.025 baseline world units. Different nodes react independently; an isolated node cannot receive neighbor resonance. These are versioned hypotheses for the appearance of the organism, not facts about the author.

The Life states panel distinguishes:

- **Model replay at an event date:** a later deterministic reconstruction using the available attested events and pinned source geometry. It is *not* an image actually witnessed on that date.
- **Sealed rule state, ◇:** captured at the real time an approved event is imported, with copied derived positions, code SHA-256, T₀ SHA-256, source event head, and hash-chained index. Historical recalculation rules cannot silently overwrite its stored numerical record. It is still a *computed model*, not a historical photograph.
- **Observed optical frame:** a separate explicitly captured *canvas image*, indexed in Optical frames. This is a genuine screenshot of the present at capture time; it is not a history of verified biological shape.

## Verified act → automatically captured state

1. History → Lived acts: select existing source record, write a concrete note about a **real action you personally performed**, check the attestation box, export draft.
2. Double-click `IMPORT-LIVED-ACT.cmd`, select your exported JSON, and explicitly approve the recorded action.
3. The command now seals the evidence **and automatically runs** `scripts/capture-life-state.mjs`. No second manual action is required for the computed checkpoint. If automatic capture fails, `CAPTURE-LIFE-STATE.cmd` can safely retry. Repeated runs against the same sealed event head do not add a duplicate.
4. Reload the viewer; History → Life states shows the captured state, archived rule version and author event. The model only counts events after its recorded timestamp. It never backdates them to an exhibition's `occurredOn`.

**You cannot delegate step 2 to software or an assistant.** It is attestation of personal conduct, not technical verification. Don't record imaginary research acts to make the body look more active.

## Privacy, consent, revocation

The project currently serves files from `public/data` **locally**. If someone uploads the experiment to Git or publicly deploys it, manually sealed action notes and capture contents might become public. The author must review third-party references, private notes, dates, screenshots, and permissions. Run `PRE-PUBLISH-AUDIT.cmd` first; it *blocks* non-empty authored evidence or optical capture ledgers until explicit author review. Hash checks detect accidental modification, **not** identity, consent or tamper-resistant signatures. Deletion from the working tree does not remove prior versions from Git clones; full withdrawal/purge requires separate repository and hosting-history remediation. **Do not publish non-empty private evidence yet.**

## Integrity / reproduction

`VERIFY-THREADS.cmd` runs original and new Node.js 22 standard-library tests. All important data files are pinned against the Phase 2.6 original. The test suite includes independent synthetic event fixtures created only in disposable directories; no fictional event is shipped as real research evidence.

`node --test tests/*.test.mjs`

Browser observations for this build: Playwright Chromium injected trusted local fixtures because the execution environment blocks ordinary localhost navigation. Desktop 1160×760 and mobile 390×844 passed no-JavaScript-error checks for empty evidence, and both also passed the full simulated event → stored-state → display path using a disposable test-only copy. **This is not an actual local-server or physical phone performance test.**

## Remaining release boundaries

This completes a working **Phase 3 life-state prototype**, not the entire public Murmurgrove project. Still required before claiming the long-term public project is final: source-repository change ingestion beyond current frozen baseline, explicit and verifiable `life.writing`/relation confirmation protocols, author-controlled withdrawal and public/private split, production performance/accessible UX review, and consent to publish. None may be faked or silently approved by the assistant.
