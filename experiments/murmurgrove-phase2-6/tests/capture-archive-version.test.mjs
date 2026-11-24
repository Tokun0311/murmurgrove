import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {canonicalJSON,verifyChronicle} from '../public/version-chronicle.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const current=fileURLToPath(new URL('../',import.meta.url));
const files=[
 ['scripts/capture-archive-version.mjs','scripts/capture-archive-version.mjs'],
 ['public/version-chronicle.mjs','public/version-chronicle.mjs'],
 ['public/data/chronicle/index.json','public/data/chronicle/index.json'],
 ['public/data/known-data-baseline.v1.json','public/data/known-data-baseline.v1.json'],
 ['public/data/navigation.json','public/data/navigation.json']
];
const capture=(folder,input,approval=true)=>spawnSync(process.execPath,[join(folder,'scripts/capture-archive-version.mjs'),'--input',input,'--note','Confirmed revision of one concept title','--source-ref','verified-test-export',...(approval?['--author-approved']:[])],{encoding:'utf8',timeout:10000});
test('manual source checkpoint is appended with timestamp, real diff, frozen originals; cannot duplicate or omit attestation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'mur-history-test-'));
 try{
  for(const [from,to] of files){await mkdir(join(root,to,'..'),{recursive:true});await copyFile(join(current,from),join(root,to));}
  const input=join(root,'input');await mkdir(input);
  const baseline=JSON.parse(await readFile(join(root,'public/data/known-data-baseline.v1.json')));
  const nav=JSON.parse(await readFile(join(root,'public/data/navigation.json')));
  const oldBaseline=baseline.baselineProjectionHash;
  baseline.records[0].title+=' (confirmed)';
  nav.records[0].title+=' (confirmed)';
  // Audit fingerprint is a separate read-only provenance contract in real life.
  baseline.baselineProjectionHash=digest(JSON.stringify(Object.fromEntries(Object.entries(baseline).filter(([k])=>k!=='baselineProjectionHash'))));
  nav.baselineProjectionHash=baseline.baselineProjectionHash;
  nav.navigationHash=digest(canonicalJSON(Object.fromEntries(Object.entries(nav).filter(([k])=>k!=='navigationHash'))));
  await writeFile(join(input,'known-data-baseline.v1.json'),JSON.stringify(baseline));
  await writeFile(join(input,'navigation.json'),JSON.stringify(nav));
  const before=JSON.parse(await readFile(join(root,'public/data/chronicle/index.json')));
  const blocked=capture(root,input,false);
  assert.notEqual(blocked.status,0);
  const successful=capture(root,input,true);
  assert.equal(successful.status,0,successful.stderr||successful.stdout);
  const after=JSON.parse(await readFile(join(root,'public/data/chronicle/index.json')));
  await verifyChronicle(after,async value=>digest(value));
  assert.equal(after.entries.length,2);
  assert.deepEqual(after.entries[0],before.entries[0]);
  const newEntry=after.entries[1];
  assert.equal(newEntry.previousEntryHash,before.entries[0].entryHash);
  assert.equal(newEntry.counts.approvedLifeEvents,0);
  assert.equal(newEntry.changes.recordsEdited,1);
  assert.equal(newEntry.changes.recordsAdded,0);
  assert.equal(newEntry.authorApproval,'manual-user-attestation');
  assert.equal(newEntry.opticalGeometry,null);
  assert.match(newEntry.capturedAt,/Z$/);
  assert.notEqual(newEntry.baselineProjectionHash,oldBaseline);
  assert.equal(digest(await readFile(join(root,'public',newEntry.sourceFiles.baseline))),newEntry.sourceSha256.baseline);
  assert.equal(digest(await readFile(join(root,'public',newEntry.sourceFiles.navigation))),newEntry.sourceSha256.navigation);
  assert.equal(JSON.parse(await readFile(join(root,'public/data/known-data-baseline.v1.json'))).baselineProjectionHash,oldBaseline);
  const duplicate=capture(root,input,true);
  assert.notEqual(duplicate.status,0);
  assert.match(duplicate.stderr,/No new source revision/);
  const final=JSON.parse(await readFile(join(root,'public/data/chronicle/index.json')));
  assert.deepEqual(final,after);
 }finally{await rm(root,{recursive:true,force:true});}
});
