import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {replay, validateEvent, fingerprint, planEthicalPurge} from '../src/protocol.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/synthetic-events.json', import.meta.url), 'utf8'));
const asOf = s => replay(fixture, {asOf:s});

test('all fixture events conform to protocol', () => { fixture.forEach(e => assert.equal(validateEvent(e), true)); });
test('2027 lived state has no knowledge of 2030 late import', () => {
 const old = asOf('2027-12-31T23:59:59Z');
 assert.equal(old.records.length,1); assert.equal(old.lifeEvents.length,0);
 assert.ok(!old.records.find(r=>r.id==='exhibition:sample-2027'));
});
test('old exhibition retains true occurrence year without backdated life', () => {
 const p = asOf('2030-01-11T00:00:00Z');
 const e = p.records.find(r=>r.kind==='exhibition');
 assert.equal(e.occurredOn,'2027-06-10');
 assert.equal(p.lifeEvents[0].effectiveAt,'2030-01-10T10:02:00Z');
});
test('reinterpretation has an independent historical interpretation date', () => {
 const p = asOf('2036-07-21T00:00:00Z');
 const e = p.lifeEvents.find(e=>e.kind==='life.reinterpretation');
 assert.equal(e.payload.interpretedOn,'2036-07-18');
 assert.equal(e.recordedAt,'2036-07-20T11:02:00Z');
});
test('maintenance correction changes current fact but emits no life event', () => {
 const before = asOf('2036-12-01T00:00:00Z');
 const after = replay(fixture);
 assert.equal(before.records.find(r=>r.kind==='exhibition').occurredOn,'2027-06-10');
 assert.equal(after.records.find(r=>r.kind==='exhibition').occurredOn,'2027-06-11');
 assert.deepEqual(before.lifeEvents,after.lifeEvents);
});
test('historical snapshot remains unchanged after later correction', () => {
 const earlier = asOf('2030-02-01T00:00:00Z');
 const current = replay(fixture);
 assert.notEqual(earlier.hash,current.hash);
 assert.equal(earlier.records.find(r=>r.kind==='exhibition').occurredOn,'2027-06-10');
});
test('canonical ordering, replay and exact duplicate delivery deterministic', () => {
 const base = replay(fixture);
 assert.equal(base.hash, replay([...fixture].reverse()).hash);
 assert.equal(base.hash, replay([...fixture,structuredClone(fixture[0])]).hash);
 assert.equal(base.hash, fingerprint({schema:base.schema, asOf:base.asOf, records:base.records, links:base.links, lifeEvents:base.lifeEvents}));
});
test('duplicate event id with altered content is rejected', () => {
 const wrong = structuredClone(fixture[0]);wrong.payload.record.title = 'Tampered';
 assert.throws(()=>replay([...fixture,wrong]),/Conflicting duplicate eventId/);
});
test('backdating life events is rejected', () => {
 const wrong = structuredClone(fixture[6]);wrong.effectiveAt='2027-01-10T10:00:00Z';
 assert.throws(()=>validateEvent(wrong),/effectiveAt must equal recordedAt/);
});
test('no implicit relation or life event from archive-only upload', () => {
 const p = replay(fixture.slice(0,2));
 assert.equal(p.records.length,2);assert.equal(p.links.length,0);assert.equal(p.lifeEvents.length,0);
});
test('ethical purge returns auditable removal plan, not a false success', () => {
 const p = planEthicalPurge(fixture,'exhibition:sample-2027');
 assert.equal(p.status,'PLAN_ONLY_NOT_PURGED');
 assert.ok(p.affectedEventIds.includes('evt:reinterpretation-2036'));
 assert.ok(p.affectedLinkIds.includes('link:exhibition-site'));
 assert.equal(p.requiresHistoryRewrite,true);
});

test('UTC comparison handles millisecond and whole-second forms correctly', () => {
 const p=asOf('2030-01-10T10:00:00.000Z');
 assert.equal(p.records.length,2);
 assert.equal(p.lifeEvents.length,0);
});
test('invalid calendar dates are rejected', () => {
 const wrong=structuredClone(fixture[1]); wrong.payload.record.occurredOn='2027-02-30';
 assert.throws(()=>validateEvent(wrong),/occurredOn/);
});
test('unknown link targets cannot generate inferred relationships', () => {
 const wrong=structuredClone(fixture[2]); wrong.payload.link.to='concept:not-in-archive';
 assert.throws(()=>replay([...fixture.slice(0,2),wrong]),/unavailable record/);
});
test('reinterpretation requires authored interpretation date', () => {
 const wrong=structuredClone(fixture[6]); delete wrong.payload.interpretedOn;
 assert.throws(()=>validateEvent(wrong),/interpretedOn/);
});
test('archive maintenance cannot carry an effective biological timestamp', () => {
 const wrong=structuredClone(fixture[7]); wrong.effectiveAt=wrong.recordedAt;
 assert.throws(()=>validateEvent(wrong),/cannot have effectiveAt/);
});
