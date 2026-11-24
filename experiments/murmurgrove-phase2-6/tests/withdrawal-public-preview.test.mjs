import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,mkdtemp,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {makeLivedDraft} from '../public/lived-events.mjs';
import {verifyWithdrawalIndex,appendWithdrawal,filterWithdrawnEvidence,lifeCaptureIncludesWithdrawal} from '../public/withdrawals.mjs';
import {verifyLifeStateIndex,verifyLifeCapture} from '../public/life-checkpoints.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const run=(folder,script,...args)=>spawnSync(process.execPath,[join(folder,script),...args],{encoding:'utf8',timeout:20_000});
const load=async(dir,where)=>JSON.parse(await readFile(join(dir,'public',where),'utf8'));
const createTemp=async()=>{
 const dir=await mkdtemp(join(tmpdir(),'murmurgrove-v4-'));
 const paths=['scripts/import-lived-event.mjs','scripts/capture-life-state.mjs','scripts/withdraw-lived-act.mjs',
  'scripts/build-public-preview.mjs','public/claim-review.mjs','public/lived-events.mjs','public/withdrawals.mjs','public/version-chronicle.mjs',
  'public/quiet-particles.mjs','public/life-morphology.mjs','public/life-checkpoints.mjs',
  'public/optical-frames.mjs','public/organic-interaction.mjs',
  ...['data/lived-events/index.json','data/withdrawals/index.json','data/life-states/index.json','data/optical-frames/index.json',
   'data/chronicle/index.json','data/known-data-baseline.v1.json','data/navigation.json','data/T0.json','data/manifest.json','data/source-reviews/index.json','index.html'].map(p=>'public/'+p)];
 // Build script copies every public .mjs; test copy those too.
 for(const name of await readdir(join(root,'public')))if(name.endsWith('.mjs'))paths.push('public/'+name);
 for(const p of new Set(paths)){await mkdir(dirname(join(dir,p)),{recursive:true});await copyFile(join(root,p),join(dir,p));}
 return dir;
};
const add=async(dir,nonce,when)=>{
 const base=(await load(dir,'data/chronicle/index.json')).entries[0];
 const nav=await load(dir,'data/navigation.json');
 const r=nav.records.find(x=>!x.quarantined&&x.path);
 const d=makeLivedDraft({recordId:r.id,kind:'life.encounter',note:'Synthetic test ONLY: I reviewed the referenced institution and reread the details.',
  recordedAt:when,nonce,baselineProjectionHash:base.baselineProjectionHash,archiveSourceEntryHash:base.entryHash});
 const file=join(dir,'candidate-'+nonce.slice(0,4)+'.json');await writeFile(file,JSON.stringify(d));
 const result=run(dir,'scripts/import-lived-event.mjs','--file',file,'--author-approved');
 assert.equal(result.status,0,result.stderr);
 return (await load(dir,'data/lived-events/index.json')).entries.at(-1).eventId;
};
test('empty withdrawal evidence is valid, no silent omission',async()=>{
 const withdrawal=await load(root,'data/withdrawals/index.json'),lived=await load(root,'data/lived-events/index.json');
 assert.equal((await verifyWithdrawalIndex(withdrawal,async t=>sha(t),{livedIndex:lived})).count,0);
 assert.equal(filterWithdrawnEvidence([],withdrawal).length,0);
});
test('author-only withdrawal: no event, missing approval, duplicate and tampered index are refused',async()=>{
 const dir=await createTemp();
 assert.notEqual(run(dir,'scripts/withdraw-lived-act.mjs','--event-id','evt:does_not_exist','--author-approved').status,0);
 const eventId=await add(dir,'a'.repeat(32),new Date(Date.now()-4000).toISOString());
 assert.notEqual(run(dir,'scripts/withdraw-lived-act.mjs','--event-id',eventId).status,0);
 const result=run(dir,'scripts/withdraw-lived-act.mjs','--event-id',eventId,'--author-approved');
 assert.equal(result.status,0,result.stderr);
 const idx=await load(dir,'data/withdrawals/index.json'),ledger=await load(dir,'data/lived-events/index.json');
 assert.equal(idx.entries.length,1);
 await verifyWithdrawalIndex(idx,async t=>sha(t),{livedIndex:ledger});
 assert.equal(filterWithdrawnEvidence([{event:{eventId}}],idx).length,0);
 assert.equal(lifeCaptureIncludesWithdrawal(ledger.entries[0].entryHash,ledger,idx),true);
 assert.equal(lifeCaptureIncludesWithdrawal(ledger.entries[0].entryHash,ledger,idx,[eventId]),false);
 assert.notEqual(run(dir,'scripts/withdraw-lived-act.mjs','--event-id',eventId,'--author-approved').status,0);
 const forged={...idx,indexHash:'a'.repeat(64)};
 await assert.rejects(verifyWithdrawalIndex(forged,async t=>sha(t),{livedIndex:ledger}),/hash mismatch/);
 const capture=run(dir,'scripts/capture-life-state.mjs');assert.equal(capture.status,0,capture.stderr);
 assert.match(capture.stdout,/All authored events are withdrawn/);
 assert.equal((await load(dir,'data/life-states/index.json')).entries.length,0);
});
test('new author action after a withdrawal can still seal a non-tainted versioned state',async()=>{
 const dir=await createTemp();
 const earlier=await add(dir,'b'.repeat(32),new Date(Date.now()-5000).toISOString());
 let result=run(dir,'scripts/capture-life-state.mjs');assert.equal(result.status,0,result.stderr);
 const old=(await load(dir,'data/life-states/index.json')).entries[0];
 result=run(dir,'scripts/withdraw-lived-act.mjs','--event-id',earlier,'--author-approved');assert.equal(result.status,0,result.stderr);
 const newer=await add(dir,'c'.repeat(32),new Date().toISOString());assert.notEqual(earlier,newer);
 result=run(dir,'scripts/capture-life-state.mjs');assert.equal(result.status,0,result.stderr);
 const states=await load(dir,'data/life-states/index.json'),ledger=await load(dir,'data/lived-events/index.json'),withdrawals=await load(dir,'data/withdrawals/index.json');
 assert.equal(states.entries.length,2);
 await verifyLifeStateIndex(states,async t=>sha(t));
 assert.equal(lifeCaptureIncludesWithdrawal(old.sourceEventHead,ledger,withdrawals,old.excludedEventIds),true);
 const latest=states.entries[1];
 assert.equal(latest.authoredEvents,1);
 assert.deepEqual(latest.excludedEventIds,[earlier]);
 assert.equal(lifeCaptureIncludesWithdrawal(latest.sourceEventHead,ledger,withdrawals,latest.excludedEventIds),false);
 const payload=await load(dir,latest.file);await verifyLifeCapture(payload,async t=>sha(t),{entry:latest,knownEventHeads:new Set(ledger.entries.map(x=>x.entryHash))});
 assert.equal(payload.state.authoredEventsUsed,1);
 // The public copy must not include ANY draft, private ledger, tombstone,
 // archived event, historical derived state or optical capture even when present.
 result=run(dir,'scripts/build-public-preview.mjs');assert.equal(result.status,0,result.stderr);
 const publicDir=join(dir,'dist-public');
 const publicLedger=JSON.parse(await readFile(join(publicDir,'data/lived-events/index.json'),'utf8'));
 const publicWithdrawals=JSON.parse(await readFile(join(publicDir,'data/withdrawals/index.json'),'utf8'));
 const publicStates=JSON.parse(await readFile(join(publicDir,'data/life-states/index.json'),'utf8'));
 assert.deepEqual(publicLedger.entries,[]);assert.deepEqual(publicWithdrawals.entries,[]);assert.deepEqual(publicStates.entries,[]);
 assert.equal((await readdir(join(publicDir,'data/lived-events'))).includes('events'),false);
 assert.equal((await readdir(join(publicDir,'data/life-states'))).includes('states'),false);
 const all=await readdir(publicDir);assert.equal(all.some(x=>x.startsWith('candidate')),false);
 assert.deepEqual((await load(dir,'data/withdrawals/index.json')).entries,withdrawals.entries); // original untouched
});
test('public preview is evidence-free and static source bytes are identical',async()=>{
 const result=run(root,'scripts/build-public-preview.mjs');assert.equal(result.status,0,result.stderr);
 const destination=join(root,'dist-public');
 for(const p of ['data/T0.json','data/known-data-baseline.v1.json','data/navigation.json']){
  assert.equal(sha(await readFile(join(root,'public',p))),sha(await readFile(join(destination,p))));
 }
 const chron=JSON.parse(await readFile(join(destination,'data/chronicle/index.json'),'utf8'));
 assert.equal(chron.entries.length,1);
});
