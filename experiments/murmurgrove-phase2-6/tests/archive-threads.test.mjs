import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const load=n=>JSON.parse(readFileSync(new URL('../public/data/'+n+'.json',import.meta.url),'utf8'));
const src=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
const snapshot=load('T0'),baseline=load('known-data-baseline.v1'),nav=load('navigation'),manifest=load('manifest');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const sha=x=>createHash('sha256').update(x).digest('hex');
function comps(){const ids=new Set(snapshot.nodes.map(n=>n.id)),adj=new Map([...ids].map(id=>[id,new Set()]));
 const links=nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to));for(const l of links){adj.get(l.from).add(l.to);adj.get(l.to).add(l.from);}
 const seen=new Set(),sizes=[];for(const id of ids){if(seen.has(id))continue;const stack=[id];let size=0;seen.add(id);
 while(stack.length){size++;for(const b of adj.get(stack.pop()))if(!seen.has(b)){seen.add(b);stack.push(b);}}
 sizes.push(size);}
 return sizes.sort((a,b)=>b-a);
}
test('baseline exact 181/7, zero authored life, no thresholds',()=>{
 assert.equal(baseline.counts.includedRecords,181);assert.equal(baseline.counts.quarantinedRecords,7);
 assert.equal(baseline.counts.approvedLifeEvents,0);assert.equal(baseline.counts.activeFibers,0);
 assert.equal(baseline.counts.thresholdEligibleWork,0);
});
test('verify exact pinned baseline SHA-256 in original insertion order',()=>{
 const {baselineProjectionHash,...body}=baseline;
 assert.equal(sha(JSON.stringify(body)),baselineProjectionHash);
 assert.equal(baselineProjectionHash,'62372e469ead425dd43fc16e737ea40cd48ce5a0188a87b868d1bee62c8ba9d3');
});
test('frozen nav and T0 hashes verified against pinned manifest',()=>{
 const {navigationHash,...navBody}=nav;assert.equal(sha(JSON.stringify(canonical(navBody))),navigationHash);
 const {snapshotHash,...snapBody}=snapshot;assert.equal(sha(JSON.stringify(canonical(snapBody))),snapshotHash);
 assert.equal(snapshotHash,manifest.snapshots.find(x=>x.phase==='T0').snapshotHash);
});
test('only 158 actual evidence edges, 20 isolated, 123 main component',()=>{
 const ids=new Set(snapshot.nodes.map(n=>n.id));assert.equal(ids.size,174);
 const edges=nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to));assert.equal(edges.length,158);
 assert.ok(edges.every(l=>l.status==='METADATA_ONLY'&&!l.activated));
 const sizes=comps();assert.equal(sizes[0],123);assert.equal(sizes.filter(x=>x===1).length,20);
});
test('no synthetic T1/T2, no invented Writing or active fibers in viewer',()=>{
 assert.equal(snapshot.fibers.length,0);assert.equal(snapshot.propulsionCores.length,0);
 assert.equal(snapshot.pulseChambers.length,0);
 const s=src('viewer.mjs');assert.match(s,/158 true, unactivated metadata relations/);
 assert.doesNotMatch(s,/SIMULATED_SANDBOX: NO AUTHOR APPROVAL/);
 assert.match(s,/metadataLinks/);
});
test('exhibition optical observation kernel 13 days, not life event',()=>{
 assert.match(src('viewer.mjs'),/const TAU=13/);
 assert.match(src('viewer.mjs'),/Math\.exp\(-days\/TAU\)/);
 assert.match(src('viewer.mjs'),/Never threshold-eligible/);
});
test('all three views, card-link, memory, locator, zoom and responsive controls exist',()=>{
 const html=src('index.html'),js=src('viewer.mjs');
 for(const term of ['Whole','Growth','Movement','History','zoomLabel','cardLink','locator','recordSelect'])assert.match(html,new RegExp(term));
 assert.match(js,/sessionStorage\.setItem/);assert.match(js,/pagehide/);assert.match(js,/pageshow/);
 assert.match(js,/zoom>=2/);assert.match(js,/saveMemory\(\)/);
});
test('source snapshots are not mutated by viewer and script is local read-only',()=>{
 const fs=src('viewer.mjs');assert.doesNotMatch(fs,/fetch\([^\n]*method\s*:\s*['"]POST/);
 const serving=readFileSync(new URL('../scripts/serve.mjs',import.meta.url),'utf8');
 assert.match(serving,/req\.method!=='GET'/);
});
