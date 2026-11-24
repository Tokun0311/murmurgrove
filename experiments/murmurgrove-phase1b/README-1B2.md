# Phase 1B.2: Read-only real archive audit

This patch adds only `scripts/real-archive-audit.mjs` and this README under the existing isolated experiment. It reads the website's actual `src/data` Markdown files, never modifies any file, and prints a JSON report to stdout.

From the repository root (Windows CMD):

```cmd
node experiments\murmurgrove-phase1b\scripts\real-archive-audit.mjs > phase1b2-audit.json
```

**Important:** The redirected output `phase1b2-audit.json` is a generated local report and should be kept out of Git/publication until reviewed. The script itself is read-only, but shell redirection writes the report to the chosen path. For zero writes, run the same command without `> phase1b2-audit.json`.

## Conservative interpretation
- `visitedOn` is a visit date, not the ingestion timestamp. File creation and modification times are never substituted for `t_ingested`.
- Markdown frontmatter links are metadata references, not `archive.link.assert` and not `life.*` events.
- Draft/demo Writing is explicitly excluded from biological activation.
- Missing or invalid dates are null, never silently set to today or a guessed day.
- `verification: needs-review` remains flagged.
- No historical lived state or threshold transitions are synthesized from current Markdown content.
- The adapter is a deliberately restricted frontmatter reader (simple scalar and list fields), not a complete YAML parser. Review warnings and raw files for more complex metadata before building a canonical protocol adapter.
- The report may contain titles and paths; review before sharing publicly.

## Next gate
To construct genuine historical Life Events, supply a reliable provenance/event log with ingestion timestamps and explicitly authored life connections. A current snapshot of Markdown files alone cannot reconstruct what the organism actually knew in earlier years.
