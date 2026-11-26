# Production IndexNow

Cloudflare Pages still builds and publishes the Astro static site using the existing Git integration. The build derives both XML sitemaps and the production-only IndexNow manifest from the same set of self-canonical HTML pages.

GitHub Actions checks production when Cloudflare reports a successful check on the default branch and at minute 23 each hour. The Cloudflare check also reports a per-deployment preview URL. The workflow validates the release on https://murmurgrove.pages.dev/ and, for a check event, requires the production manifest to match the check's commit. A scheduled run catches publication delays and missed check events.

## First release

1. After Cloudflare publishes the default branch, run **Notify IndexNow after production publishes** with **dry_run** enabled. It verifies the production key, 404, sitemap and content hashes and lists the URLs it would submit.
2. Disable **dry_run** and enable **bootstrap** for the first actual run. This submits the full eligible set only if there is no previous state.
3. Read the IndexNow HTTP result in the workflow run. HTTP 200 acknowledges receipt. HTTP 202 means key validation is pending. Search indexing is tracked separately in Bing Webmaster Tools.

Subsequent runs compare the deployed manifest with the latest acknowledged manifest in the workflow's Actions artifact. The state is refreshed on successful runs, including releases with zero URL changes. If state expires after 30 days without a successful run or is deleted, review the dry-run and explicitly allow bootstrap again. A dry-run does not submit or change state.

## Content and troubleshooting

The fingerprint covers static editorial text, link targets, image sources and alt text, publication dates rendered in HTML, and search metadata. It ignores scripts, styles, iframes, canvas state, build-generated attributes and elements marked with `data-indexnow-ignore`. Apply that attribute only to ephemeral UI text. The archived observation dates remain part of the fingerprint. Generated catalogue rows are hashed independently of their display order, so ties in a collection sort do not trigger notifications.

Use `<Base noindex ...>` for Astro pages intentionally excluded from search or a robots meta tag for standalone HTML. Use Cloudflare's `_headers` for static data. The build excludes reserved private, draft, test, history and internal paths as well as redirects. Access control for private records belongs at publication time.

Deleted canonical URLs must return 404 or 410. A permanent redirect is also reported as a change at the old URL. When a page stays public and switches to noindex, the workflow drops it from the tracking state and leaves it out of the POST. An unexpected HTTP 200 for a removed route stops submission and keeps the previous state.

Requests use batches of 500 URLs. Network failures, HTTP 429 and server errors have bounded retries. A failed run leaves the previous artifact available, so the next run can retry. Cloudflare publishing continues independently.

For a CLI check, set `INDEXNOW_STATE` to the path of the downloaded state file and run:

```sh
npm ci
node scripts/submit-indexnow.mjs --dry-run
```
