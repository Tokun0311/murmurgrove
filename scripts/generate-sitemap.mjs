import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasNoindex, inspect, manifestPath, origin, publicUrl } from './indexnow-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const base = new URL(process.env.SITE_URL?.trim() || origin).origin;
const pages = new Map();
const escapeRegex = value => value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
const normalizePath = value => value.replace(/\/$/, '');

function matchesPath(rule, pathname) {
  const pattern = normalizePath(rule).split('/').map(segment =>
    segment.startsWith(':') ? '[^/]+' : segment.split('*').map(escapeRegex).join('.*')
  ).join('/');
  return new RegExp('^' + pattern + '$').test(normalizePath(pathname));
}

const redirects = (await readFile(path.join(dist, '_redirects'), 'utf8')).split(/\r?\n/)
  .map(line => line.trim().split(/\s+/))
  .filter(([from, to, status = '302']) => from.startsWith('/') && to && /^3\d\d$/.test(status))
  .map(([from]) => from);
const excluded = [];
let headerPath;
for (const line of (await readFile(path.join(dist, '_headers'), 'utf8')).split(/\r?\n/)) {
  if (line.startsWith('/')) headerPath = line.trim();
  const robots = /^\s+X-Robots-Tag:\s*(.*)$/i.exec(line);
  if (headerPath && robots && hasNoindex(robots[1])) excluded.push(headerPath);
}
const routeExclusions = /^\/(?:tests?|experiments?|private|drafts?|internal|murmurgrove\/history)(?:\/|$)/i;

async function crawl(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const absolute = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      await crawl(absolute);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const relative = path.relative(dist, absolute).split(path.sep).join('/');
      if (relative === '404.html' || relative.startsWith('404/')) continue;
      // Astro's static pages are /index.html or /section/page/index.html.
      let pathname = relative === 'index.html' ? '/' : '/' + relative;
      if (pathname.endsWith('/index.html')) pathname = pathname.slice(0, -'index.html'.length);
      // Exclude HTML verification files and other non-site pages.
      if (!pathname.endsWith('/')) continue;
      if (routeExclusions.test(pathname) || [...redirects, ...excluded].some(rule => matchesPath(rule, pathname))) continue;
      const page = inspect(await readFile(absolute, 'utf8'));
      // A self-canonical tag opts in a public HTML page. Drafts are excluded
      // by Astro's route generation, and noindex pages are excluded here.
      if (page.noindex || page.canonical.length !== 1) continue;
      const url = publicUrl(base + pathname, base);
      if (page.canonical[0] !== url) continue;
      pages.set(url, page.fingerprint);
    }
  }
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

await crawl(dist);
if (!pages.has(base + '/')) throw new Error('Missing built homepage; sitemap not generated.');
const sorted = [...pages.keys()].sort();
const urlset = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sorted.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n') +
  '\n</urlset>\n';
const index = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  `  <sitemap><loc>${base}/sitemap-0.xml</loc></sitemap>\n` +
  '</sitemapindex>\n';
await writeFile(path.join(dist, 'sitemap-0.xml'), urlset, 'utf8');
await writeFile(path.join(dist, 'sitemap-index.xml'), index, 'utf8');
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap-index.xml\n`, 'utf8');
if (base === origin) {
  const manifest = {
    version: 1,
    commit: process.env.CF_PAGES_COMMIT_SHA || null,
    pages: Object.fromEntries(sorted.map(url => [url, pages.get(url)]))
  };
  await writeFile(path.join(dist, manifestPath.slice(1)), JSON.stringify(manifest) + '\n');
}
console.log(`Sitemap generated: ${sorted.length} public pages`);
