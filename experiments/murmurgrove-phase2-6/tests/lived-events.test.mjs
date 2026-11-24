import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {LIVED_INDEX_SCHEMA,LIVED_KINDS,LIVED_DRAFT_SCHEMA,makeLivedDraft,validateLivedDraft,eventIdForDraft,
 makeSealedLivedEvidence,validateSealedLivedEvidence,verifyLivedIndex,referencedLivedTraces} from '../public/lived-events.mjs';
const p=resolve(dirname(fileURLToPath(import.meta.url)),'..'),src=join(p,'public');
const hash=s=>createHash('sha256').update(s).digest('hex');
const nav=JSON.parse(await readFile(join(src,'data/navigation.json'),'utf8'));
const chron=JSON.parse(await readFile(join(src,'data/chronicle/index.json'),'utf8'));
const first=chron.entries[0],record=nav.records.find(x=>!x.quarantined&&x.path);
const time=new Date().toISOString();
function draft(kind='life.encounter',recordedAt=time){return makeLivedDraft({kind,recordId:record.id,note:'I reviewed this record and wrote down a specific new research question.',
 evidenceUrl:'',recordedAt,nonce:'a'.repeat(32),baselineProjectionHash:first.baselineProjectionHash,archiveSourceEntryHash:first.entryHash});}
function shaIndex(entries){const x={schema:LIVED_INDEX_SCHEMA,entries};return {...x,indexHash:hash(canonicalJSON(x))};}
function mkentry(sealed){const entry={seq:sealed.event.seq,eventId:sealed.event.eventId,kind:sealed.event.kind,recordId:sealed.event.payload.recordRefs[0],
 recordedAt:sealed.event.recordedAt,file:`data/lived-events/events/${sealed.event.eventId.slice(4)}.json`,
 rawSha256:hash(JSON.stringify(sealed,null,2)+'\n'),archiveSourceEntryHash:first.entryHash,previousEntryHash:null};
 return {...entry,entryHash:hash(canonicalJSON(entry))};}
test('empty published lived journal is real zero and checksum verified',async()=>{
 const x=JSON.parse(await readFile(join(src,'data/lived-events/index.json'),'utf8'));
 assert.equal(x.entries.length,0);await verifyLivedIndex(x,async v=>hash(v));
 assert.equal(x.indexHash,hash(canonicalJSON({schema:x.schema,entries:x.entries})));
});
test('draft requires explicit attestation, verified archive anchor, and nontrivial note',()=>{
 const d=draft();assert.equal(d.schema,LIVED_DRAFT_SCHEMA);assert.equal(validateLivedDraft(d),true);
 assert.throws(()=>validateLivedDraft({...d,authorAttestation:'auto'}),/attestation/i);
 assert.throws(()=>validateLivedDraft({...d,note:'clicked'}),/concrete/i);
 assert.throws(()=>validateLivedDraft({...d,recordId:'bogus'}),/record/i);
 assert.throws(()=>validateLivedDraft({...d,evidenceUrl:'javascript:alert(1)'}),/HTTPS/i);
});
test('only explicitly enabled event kinds are allowed; no inferred writing or asserted connections',()=>{
 for(const kind of ['life.connection','life.writing','archive.link.assert','life.drive'])
  assert.throws(()=>draft(kind),/not enabled/i);
 assert.deepEqual(Object.keys(LIVED_KINDS),['life.encounter','life.reinterpretation']);
});
test('Phase1A shape preserves effectiveAt=recordedAt with no historical backdating',()=>{
 const d=draft('life.reinterpretation');const x=makeSealedLivedEvidence(d,{seq:1,recordPath:record.path,archiveCheckpointId:first.id,sealedAt:new Date(Date.now()+1000).toISOString()});
 assert.equal(x.event.schema,'murmurgrove.event.v1');
 assert.equal(x.event.effectiveAt,x.event.recordedAt);
 assert.equal(x.event.payload.interpretedOn,d.recordedAt.slice(0,10));
 assert.equal(x.event.payload.linkRefs.length,0);
 assert.equal(validateSealedLivedEvidence(x,{record,checkpoint:first,seq:1}),true);
 assert.throws(()=>validateSealedLivedEvidence({...x,event:{...x.event,effectiveAt:'2021-01-01T00:00:00Z'}}),/chronology/i);
});
test('quarantine, mismatched sources, and forged connections are refused',()=>{
 const d=draft();const x=makeSealedLivedEvidence(d,{seq:1,recordPath:record.path,archiveCheckpointId:first.id,sealedAt:new Date(Date.now()+1000).toISOString()});
 assert.throws(()=>validateSealedLivedEvidence(x,{record:{...record,quarantined:true},checkpoint:first}),/match/i);
 assert.throws(()=>validateSealedLivedEvidence(x,{record,checkpoint:{...first,entryHash:'b'.repeat(64)}}),/checkpoint/i);
 assert.throws(()=>validateSealedLivedEvidence({...x,event:{...x.event,payload:{...x.event.payload,linkRefs:['link:invented']}}}),/cannot be implied/i);
});
test('reference-based optical markers never make implied relationships',()=>{
 const d=draft('life.reinterpretation'),x=makeSealedLivedEvidence(d,{seq:1,recordPath:record.path,archiveCheckpointId:first.id,sealedAt:new Date(Date.now()+1000).toISOString()});
 const marks=referencedLivedTraces([x]);assert.equal(marks.size,1);assert.equal(marks.get(record.id).reinterpretation,1);assert.equal(marks.get(record.id).encounter,0);
});
test('journal index rejects tamper, duplicate, unsafe path, and broken chain',async()=>{
 const x=makeSealedLivedEvidence(draft(),{seq:1,recordPath:record.path,archiveCheckpointId:first.id,sealedAt:new Date(Date.now()+1000).toISOString()});
 const e=mkentry(x),index=shaIndex([e]);assert.equal((await verifyLivedIndex(index,async v=>hash(v))).count,1);
 await assert.rejects(verifyLivedIndex({...index,indexHash:'b'.repeat(64)},async v=>hash(v)),/digest/i);
 await assert.rejects(verifyLivedIndex(shaIndex([e,e]),async v=>hash(v)),/duplicate|order/i);
 const bad={...e,file:'../../secret.json'};bad.entryHash=hash(canonicalJSON(Object.fromEntries(Object.entries(bad).filter(([key])=>key!=='entryHash'))));
 await assert.rejects(verifyLivedIndex(shaIndex([bad]),async v=>hash(v)),/Unsafe/i);
});
test('UI exposes explicit draft + two-stage local seal, and never automates authoring',async()=>{
 const html=await readFile(join(src,'index.html'),'utf8'),viewer=await readFile(join(src,'viewer.mjs'),'utf8');
 assert.match(html,/id="historyActsTab"/);assert.match(html,/id="livedConfirm"/);assert.match(html,/id="livedNote"/);
 assert.match(viewer,/function exportLivedDraft\(/);assert.match(viewer,/await verifyLoadedLivedEvidence\(/);
 assert.match(viewer,/drawLivedEvidenceMarks\(/);assert.match(viewer,/activatedWritingFibers:0,matureCores:0/);
 assert.doesNotMatch(viewer,/addEventListener\('pointerup',[^\n]*exportLivedDraft/);
});
test('CLI end-to-end seals a fixture ONLY in disposable copy, rejects replay and stale source',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'murmurgrove-lived-test-'));
 const files=['public/lived-events.mjs','public/version-chronicle.mjs','public/data/navigation.json','public/data/known-data-baseline.v1.json',
 'public/data/chronicle/index.json','public/data/lived-events/index.json','scripts/import-lived-event.mjs'];
 for(const file of files){await mkdir(dirname(join(tmp,file)),{recursive:true});await copyFile(join(p,file),join(tmp,file));}
 const inFile=join(tmp,'draft.json');await writeFile(inFile,JSON.stringify(draft(),null,2));
 const run=()=>execFileSync(process.execPath,[join(tmp,'scripts/import-lived-event.mjs'),'--file',inFile,'--author-approved'],{encoding:'utf8',timeout:15000});
 const stdout=run();assert.match(stdout,/Sealed manually attested event/);
 const stored=JSON.parse(await readFile(join(tmp,'public/data/lived-events/index.json'),'utf8'));
 assert.equal(stored.entries.length,1);await verifyLivedIndex(stored,async v=>hash(v));
 const body=JSON.parse(await readFile(join(tmp,'public',stored.entries[0].file),'utf8'));
 assert.equal(body.event.eventId,eventIdForDraft(draft()));
 assert.equal(body.source.evidenceUrl,null);
 assert.throws(run,/already sealed/i);
 const second=draft('life.encounter',new Date(Date.now()+1000).toISOString());second.nonce='b'.repeat(32);
 await writeFile(inFile,JSON.stringify(second,null,2));
 const sourceFile=join(tmp,'public/data/navigation.json');await writeFile(sourceFile,(await readFile(sourceFile,'utf8'))+' ');
 assert.throws(run,/Source bytes no longer match/i);
});
