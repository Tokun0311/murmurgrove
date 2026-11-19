# Murmurgrove V6 · Directional Growth (19 November 2026)

This is an **actual TOW ARCHIVE project update**, built against the latest full source package available during this session (`tow-archive-cloudflare-build-fix-history-20261119(1).zip`). It is not an isolated mockup or a future-year simulation. Keep a backup of any newer GitHub changes before replacement.

## Apply

1. Back up the current GitHub project first. If the repository has changed since the package above, merge the changed files only rather than replacing newer content.
2. Upload the contents of `tow-archive/` to your existing Astro GitHub repository at the same paths (do **not** create a new nested `tow-archive/tow-archive` directory).
3. Keep the current Cloudflare Pages build command (`npm run build`) and output (`dist`). Your deployment pipeline installs dependencies from `package-lock.json` before building.
4. The pre-existing optional Cloudflare Worker shared-state service is retained, but it is not activated automatically. Its deployment and secrets are separate.

## Homepage

Only navigation, the body of Murmurgrove, three observation modes, History, and compact zoom/reset controls remain. No leaves, translucent membranes, explanatory cards, public scoreboards, or fabricated trajectories.

- Mouse: drag to rotate below 200%. Scroll to zoom around the cursor, up to **1000%**.
- When zoom >= 200%: drag to **pan**; hold **Alt** while dragging to rotate at any zoom.
- Hold **Shift** and drag to pan at any zoom.
- Touch: one-finger drag rotates below 200% or pans above 200%; pinch zooms.
- At 360% and above, sparse record labels appear; select a live record point to open its real archive page. Historical morphology is observation-only.
- The ⟳ icon resets zoom, orientation, and pan.

## How a research direction changes the form

Every public Exhibition contributes to a direction when its frontmatter explicitly references a concept. Public Writing and Photography may also contribute using explicit `concepts`, matching `tags`, or optional `directions` weight fields. Draft entries never appear in the body.

Example for a new or revised Exhibition Note:

```yaml
concepts:
  - site-specificity
  - institutional-studies
directions:
  site-specificity: 1.1
  institutional-studies: 0.7
```

Example for future Writing:

```yaml
concepts: [curatorial-practices, site-specificity]
directions:
  curatorial-practices: 1.3
  site-specificity: 0.8
```

These fields are **optional**. If absent, the record remains in the body without an invented topic assignment. When multiple records repeatedly connect to a concept, the corresponding area gains mass and range. When a topic receives no further linked work, its existing area stays in the body but does not keep expanding. The long-term history is changed only by archive revisions, not by pretend future events or periodic visual growth.

## Historical states and continued growth

The snapshot script now runs the **same TypeScript morphology function** as the live Astro homepage. The GitHub Action uses Node 22.19+ and Python/PyYAML to maintain content hashes and publish versioned snapshots. The export script strips old archived content links and loads snapshot files on demand. It preserves previous V3 and V4 shapes; it does not retroactively rewrite their history.

V6 supports additional published Writing / Photography records without a fixed point cap; renderer work is O(records + local neighbors + relationship edges) per layout pass, plus bounded visible drawing. 1,000+ exhibitions is a **scale design target**, not a verified decade-long production benchmark. Continue testing on real desktop and mobile devices as the archive grows.

## Test and verification limits

Verified here: source model loads in Node, snapshot generation/export, full metadata counts and real record references, type-stripped page script syntax, ZIP structure, and scripted stress test for large inputs. **Not verified here: full `astro build`, full browser QA, or Cloudflare deployment** because npm dependencies were unavailable from the execution environment. If Cloudflare reports a build failure, use the error output to diagnose before overwriting the live site.
