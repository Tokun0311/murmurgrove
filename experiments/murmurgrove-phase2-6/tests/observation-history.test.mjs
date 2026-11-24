import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validSourceDate,datedExhibitionLedger,observationMonthGroups,monthObservationContext} from '../public/observation-history.mjs';
const src=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
const nav=JSON.parse(src('data/navigation.json'));
const scene=JSON.parse(src('data/T0.json'));
const approved=new Set(scene.nodes.map(n=>n.id));
const actual=nav.metadataLinks.filter(l=>approved.has(l.from)&&approved.has(l.to)&&!l.activated);
const ledger=datedExhibitionLedger(nav.records);
const groups=observationMonthGroups(ledger);
const hash=n=>createHash('sha256').update(src('data/'+n+'.json')).digest('hex');
test('date validation rejects impossible days and untyped inputs',()=>{
 for(const v of [null,1234,'2026-02-29','2026-02-30','2026-00-01','2026-13-01','2026-11-1','2026/11/01', ''])assert.equal(validSourceDate(v),false);
 for(const v of ['2024-02-29','2026-11-20','2000-01-01'])assert.equal(validSourceDate(v),true);
});
test('only 57 non-quarantined, dated exhibition source records are shown',()=>{
 const all=nav.records.filter(r=>r.kind==='exhibition'&&r.occurredOn);
 assert.equal(all.length,64);assert.equal(all.filter(r=>r.quarantined).length,7);
 assert.equal(ledger.length,57);assert.equal(new Set(ledger.map(x=>x.id)).size,ledger.length);
 assert.ok(ledger.every(e=>approved.has(e.id)&&validSourceDate(e.occurredOn)&&typeof e.title==='string'));
 assert.ok(ledger.every((e,i)=>i===0||ledger[i-1].occurredOn>=e.occurredOn));
 assert.equal(ledger[0].occurredOn,'2026-11-08');assert.equal(ledger.at(-1).occurredOn,'2026-01-02');
});
test('history month bars represent observed event dates, not inferred archive creation dates',()=>{
 assert.equal(groups.length,11);
 assert.equal(groups.reduce((n,g)=>n+g.entries.length,0),57);
 assert.equal(groups[0].key,'2026-11');assert.equal(groups.at(-1).key,'2026-01');
 assert.equal(groups.find(g=>g.key==='2026-03').entries.length,12);
 assert.equal(groups.find(g=>g.key==='2026-10').entries.length,12);
 assert.deepEqual(groups.flatMap(g=>g.entries.map(r=>r.id)).sort(),ledger.map(r=>r.id).sort());
});
test('month context only highlights existing metadata links adjacent to a dated exhibition',()=>{
 for(const g of groups){
  const {exhibitions,linkIndices,neighbors}=monthObservationContext(g.key,groups,actual);
  assert.equal(exhibitions.size,g.entries.length);
  assert.equal(exhibitions.size,new Set(g.entries.map(e=>e.id)).size);
  assert.ok([...exhibitions].every(id=>approved.has(id)));
  for(const i of linkIndices){
   assert.ok(i>=0&&i<actual.length);
   const l=actual[i];assert.equal(l.status,'METADATA_ONLY');assert.equal(l.activated,false);
   assert.ok(exhibitions.has(l.from)||exhibitions.has(l.to));
   assert.ok(neighbors.has(exhibitions.has(l.from)?l.to:l.from));
  }
 }
 assert.equal(monthObservationContext('2040-01',groups,actual).exhibitions.size,0);
});
test('malformed, activated or non-metadata references never enter the historical spotlight',()=>{
 const ex=ledger[0].id;
 const fake=[{from:ex,to:'person:made-up',status:'ACTIVATED',activated:true},
  {from:ex,to:'person:made-up',status:'METADATA_ONLY',activated:true},
  {from:ex,to:'person:made-up',status:'INFERRED',activated:false}];
 assert.equal(monthObservationContext(ledger[0].occurredOn.slice(0,7),groups,fake).linkIndices.size,0);
});
test('UI month selection highlights current evidence only, never rewinds a fictional past body',()=>{
 const js=src('viewer.mjs'),html=src('index.html');
 assert.match(js,/observationLedger=datedExhibitionLedger\(records\)/);
 assert.match(js,/activeHistoryContext=historyOpen\?monthObservationContext/);
 assert.match(js,/activeHistoryContext\.linkIndices\.has\(index\)/);
 assert.match(js,/activeHistoryContext\.exhibitions\.has\(n\.id\)/);
 assert.match(js,/b\.addEventListener\('click',\(\)=>\{setHistoryOpen\(false\);selectAndFollow\(r\.id\);\}\)/);
 assert.match(js,/title\.textContent=r\.title/); // no untrusted text injected as raw HTML
 assert.match(html,/非当月的历史身体形态、入库日期或作者确认的生命事件/);
 assert.match(html,/id="historyEntries"/);assert.match(html,/id="historyMonths"/);
 assert.match(html,/aria-controls="historyPanel" aria-expanded="false"/);
 assert.doesNotMatch(js,/window\.location\s*=/); // clicking the list does NOT navigate
});
test('current link truth, physiology and data snapshots are byte-identical',()=>{
 assert.equal(actual.length,158);assert.equal(scene.fibers.length,0);
 assert.equal(hash('T0'),'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a');
 assert.equal(hash('navigation'),'4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f');
 assert.equal(hash('known-data-baseline.v1'),'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651');
 assert.equal(hash('manifest'),'ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6');
});
test('future multiyear ledger can be grouped without adding synthetic missing months',()=>{
 const example=[{id:'e2',kind:'exhibition',title:'Future',occurredOn:'2027-01-02',quarantined:false},
 {id:'e1',kind:'exhibition',title:'Past',occurredOn:'2026-11-20',quarantined:false},
 {id:'non-exhibition',kind:'person',title:'Person',occurredOn:'2027-01-05',quarantined:false}];
 assert.deepEqual(observationMonthGroups(datedExhibitionLedger(example)).map(x=>x.key),['2027-01','2026-11']);
});
