import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasNoindex, inspect, origin, publicUrl } from '../scripts/indexnow-content.mjs';

const document = (text, { build = 'one', visual = 'green', description = 'Archive notes', link = '/people/' } = {}) =>
  '<!doctype html><title>Exhibition</title><meta name="description" content="' + description +
  '"><link rel="canonical" href="' + origin + '/exhibitions/item/">' +
  '<link rel="stylesheet" href="/_astro/' + build + '.css"><script>window.frame = "' + visual + '"</script>' +
  '<body><main class="' + build + '"><p>' + text + '</p><a href="' + link + '">People</a>' +
  '<canvas data-frame="' + visual + '"></canvas><span data-indexnow-ignore>' + visual + '</span></main></body>';

test('hashes editorial content and metadata while ignoring build and visual state', () => {
  const first = inspect(document('A research record.'));
  assert.equal(first.fingerprint, inspect(document('  A research   record. ', { build: 'two', visual: 'blue' })).fingerprint);
  assert.notEqual(first.fingerprint, inspect(document('An updated research record.')).fingerprint);
  assert.notEqual(first.fingerprint, inspect(document('A research record.', { description: 'Revised notes' })).fingerprint);
  assert.notEqual(first.fingerprint, inspect(document('A research record.', { link: '/concepts/' })).fingerprint);
});

test('recognizes indexing exclusions and rejects nonproduction submission URLs', () => {
  assert.equal(inspect('<meta name="Bingbot" content="noindex, follow"><p>Hidden</p>').noindex, true);
  assert.equal(hasNoindex('bingbot: none'), true);
  assert.equal(hasNoindex('index, follow'), false);
  assert.equal(publicUrl('/people/'), origin + '/people/');
  for (const url of [origin + '/?', origin + '/#', origin + '/?utm_source=test',
    'http://localhost:3000/', 'https://preview.murmurgrove.pages.dev/', 'https://tow-archive.pages.dev/']) {
    assert.throws(() => publicUrl(url), /Invalid canonical URL/);
  }
});

test('generated catalogue reordering preserves the hash but row edits change it', () => {
  const a = '<li><time>2026-11-08</time><a href="/exhibitions/a/">A</a></li>';
  const b = '<li><time>2026-11-08</time><a href="/exhibitions/b/">B</a></li>';
  const catalogue = rows => inspect('<ol class="archive-list">' + rows + '</ol>').fingerprint;
  assert.equal(catalogue(a + b), catalogue(b + a));
  assert.notEqual(catalogue(a + b), catalogue(a + b.replace('2026-11-08', '2026-11-09')));
});
