import { createHash } from 'node:crypto';
import { parse } from 'parse5';

export const origin = 'https://murmurgrove.pages.dev';
export const key = '235c3bb6c43746e58bc9bd49ddca7f78';
export const keyLocation = origin + '/' + key + '.txt';
export const manifestPath = '/indexnow-manifest.json';

export function publicUrl(value, base = origin) {
  const url = new URL(value, base);
  if (url.origin !== base || url.username || url.password || url.search || url.hash ||
      /[?#]/.test(value) || !url.pathname.endsWith('/')) {
    throw new Error('Invalid canonical URL: ' + value);
  }
  return url.href;
}

const attr = (node, name) => node.attrs?.find(attribute => attribute.name === name)?.value;
const clean = value => (value ?? '').replace(/\s+/gu, ' ').trim();
const skipped = new Set(['script', 'style', 'template', 'canvas', 'iframe']);

export function hasNoindex(value) {
  return /\b(?:noindex|none)\b/i.test(value ?? '');
}

export function inspect(html) {
  const dom = parse(html);
  const document = dom.childNodes.find(node => node.tagName === 'html');
  const head = document.childNodes.find(node => node.tagName === 'head');
  const body = document.childNodes.find(node => node.tagName === 'body');
  const meta = name => head.childNodes.find(node => node.tagName === 'meta' &&
    [attr(node, 'name'), attr(node, 'property')].some(value => value?.toLowerCase() === name));
  const tags = ['description', 'og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:image', 'og:image:alt'];
  const metadata = Object.fromEntries(tags.map(name => [name, clean(attr(meta(name) ?? {}, 'content'))]));
  const canonical = head.childNodes.filter(node => node.tagName === 'link' &&
    attr(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical')).map(node => attr(node, 'href'));
  const title = clean(head.childNodes.find(node => node.tagName === 'title')?.childNodes[0]?.value);
  const noindex = head.childNodes.some(node => node.tagName === 'meta' &&
    ['robots', 'bingbot'].includes(attr(node, 'name')?.toLowerCase()) && hasNoindex(attr(node, 'content')));
  const links = [];
  const content = [];
  const headings = [];
  const visibleText = [];
  function visit(node, tokens) {
    if (skipped.has(node.tagName) || attr(node, 'data-indexnow-ignore') !== undefined) return;
    if (node.nodeName === '#text') {
      const text = clean(node.value);
      if (text) {
        tokens.push(text);
        visibleText.push(text);
      }
    }
    if (node.tagName === 'a' && attr(node, 'href') !== undefined) {
      const href = attr(node, 'href');
      if (href && !href.startsWith('#')) links.push(href);
      tokens.push(['link', href]);
    }
    if (node.tagName === 'img') tokens.push(['image', attr(node, 'src'), attr(node, 'alt')]);
    if (node.tagName === 'time') tokens.push(['date', attr(node, 'datetime')]);
    if (/^h[1-6]$/.test(node.tagName ?? '')) headings.push(node.tagName);
    const children = node.childNodes ?? [];
    const classes = attr(node, 'class')?.split(/\s+/) ?? [];
    // Astro collections can yield tied records in different orders across
    // builds. Hash complete rows independently of their display order.
    if (node.tagName === 'ol' &&
        (classes.includes('archive-list') || classes.includes('exhibition-preview-list'))) {
      const rows = [];
      for (const child of children) {
        const row = [];
        visit(child, row);
        if (row.length) rows.push(JSON.stringify(row));
      }
      tokens.push(['catalogue', rows.sort()]);
      return;
    }
    for (const child of children) visit(child, tokens);
  }
  visit(body, content);
  const fingerprint = createHash('sha256').update(JSON.stringify([title, metadata, content])).digest('hex');
  return { canonical, title, metadata, noindex, fingerprint, links, headings, text: visibleText.join(' ') };
}
