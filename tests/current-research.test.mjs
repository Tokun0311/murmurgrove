import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { currentProjection, placeCurrentResearch, readCurrentResearch } from '../public/murmurgrove/organism/research-current-overlay.mjs';
import { buildGraph } from '../murmurgrove-editor/research-core.mjs';

const read = async path => JSON.parse(await readFile(new URL('../public/murmurgrove/' + path, import.meta.url)));
const graph = await read('research/current.json');
const nav = await read('organism/data/navigation.json');
const t0 = await read('organism/data/T0.json');
const anchors = new Map(t0.nodes.map(node => [node.id, node.displayPosition]));
const exhibition = 'exhibition:2026-11-26-nam-june-paik-the-20th-anniversary-of-his-passing';
const person = 'person:nam-june-paik';
const institution = 'institution:watari-um-the-watari-museum-of-contemporary-art';

test('published Paik, WATARI-UM and exhibition extend the baseline only through recorded evidence', () => {
  const original = structuredClone([...anchors]);
  const research = readCurrentResearch(graph);
  const layer = placeCurrentResearch(research, anchors, nav.metadataLinks);
  assert.equal(layer.additions.get(exhibition).wave, 0);
  assert.equal(layer.additions.get(person).wave, 1);
  assert.equal(layer.additions.get(institution).wave, 1);
  for (const id of [person, institution]) {
    assert(layer.edges.some(edge => edge.from === exhibition && edge.to === id));
    assert.notDeepEqual(layer.additions.get(id).rest, layer.additions.get(exhibition).rest);
  }
  assert.deepEqual([...anchors], original);
  assert.equal(currentProjection(layer, point => point, 0, false).get(person).growth, 1);
  assert.equal(currentProjection(layer, point => point, 0, false, {animate: true}).get(person).growth, 0);
  assert.equal(currentProjection(layer, point => point, 5000, false, {animate: true}).get(person).growth, 1);
});

test('a public record with a source but no evidenced path stays searchable and unpositioned', () => {
  const sources = structuredClone(graph);
  for (const relation of sources.relations) if (relation.target === 'people:nam-june-paik') relation.provenance = [];
  const research = readCurrentResearch(sources);
  const layer = placeCurrentResearch(research, anchors, nav.metadataLinks);
  assert.equal(research.records.get(person).path, '/people/nam-june-paik/');
  assert(!layer.additions.has(person));
  assert(!layer.edges.some(edge => edge.from === person || edge.to === person));
});

test('public projection carries already registered readings without modifying archive hashes', async () => {
  const generated = await buildGraph(fileURLToPath(new URL('..', import.meta.url)));
  const key = 'people:yamashiro-chikako';
  assert(graph.records.find(record => record.key === key).aliases.includes('やましろちかこ'));
  assert.deepEqual(generated.records.find(record => record.key === key).aliases, graph.records.find(record => record.key === key).aliases);
  assert.equal(generated.graphHash, graph.graphHash);
});
