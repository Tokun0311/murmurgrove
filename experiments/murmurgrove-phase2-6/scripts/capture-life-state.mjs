/** Capture the current rule-derived state of the already-author-attested ledger.
 * No new life events; an empty ledger creates no state. Called automatically
 * AFTER an approved lived-action import by IMPORT-LIVED-ACT.cmd.
 */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {verifyLivedIndex,validateSealedLivedEvidence} from '../public/lived-events.mjs';
import {verifyWithdrawalIndex,withdrawalSet} from '../public/withdrawals.mjs';
import {deriveInteriorQuietPositions} from '../public/quiet-particles.mjs';
import {deriveLifeMorphology} from '../public/life-morphology.mjs';
import {LIFE_CAPTURE_SCHEMA,LIFE_CAPTURE_INDEX,LIFE_CAPTURE_CLAIM,verifyLifeStateIndex,verifyLifeCapture} from '../public/life-checkpoints.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const sha=v=>createHash('sha256').update(v).digest('hex');
const txt=async path=>readFile(join(root,path),'utf8');
const parse=async path=>JSON.parse(await txt(path));
const ledger=await parse('data/lived-events/index.json');
await verifyLivedIndex(ledger,async s=>sha(s));
const withdrawnLedger=await parse('data/withdrawals/index.json');
await verifyWithdrawalIndex(withdrawnLedger,async s=>sha(s),{livedIndex:ledger});
const withdrawn=withdrawalSet(withdrawnLedger);
const excludedEventIds=ledger.entries.filter(e=>withdrawn.has(e.eventId)).map(e=>e.eventId);
if(!ledger.entries.length){console.log('No authored life events; nothing to capture. No empty synthetic history created.');process.exit(0);}
const chron=await parse('data/chronicle/index.json'),base=chron.entries[0];
for(const k of ['baseline','navigation']){
 const buf=await readFile(join(root,base.sourceFiles[k]));
 if(sha(buf)!==base.sourceSha256[k])throw Error('Pinned archive source changed: '+k);
}
const rawT0=await readFile(join(root,'data/T0.json'));
if(sha(rawT0)!==base.opticalGeometry.sha256)throw Error('T0 geometry changed');
const nav=await parse('data/navigation.json'),T0=JSON.parse(rawT0.toString('utf8'));
const visible=new Map(nav.records.filter(r=>!r.quarantined).map(r=>[r.id,r]));
const sourceLinks=nav.metadataLinks.filter(x=>visible.has(x.from)&&visible.has(x.to)&&!x.activated);
if(visible.size!==174||sourceLinks.length!==158||T0.nodes.length!==174)throw Error('Unexpected source archive structure');
const evidence=[];
for(const e of ledger.entries){
 const raw=await txt(e.file);if(sha(raw)!==e.rawSha256)throw Error('Attested event raw checksum mismatch');
 const data=JSON.parse(raw);validateSealedLivedEvidence(data,{record:visible.get(e.recordId),checkpoint:base,seq:e.seq});
 if(data.event.eventId!==e.eventId||data.event.recordedAt!==e.recordedAt)throw Error('Attested event/index disagreement');
 if(!withdrawn.has(data.event.eventId))evidence.push(data);
}
if(!evidence.length){console.log('All authored events are withdrawn; no derived state is recorded.');process.exit(0);}
const checkpointPath='data/life-states/index.json',index=await parse(checkpointPath);
await verifyLifeStateIndex(index,async s=>sha(s));
for(const e of index.entries){const raw=await txt(e.file);if(sha(raw)!==e.rawSha256)throw Error('Existing rule state was modified');await verifyLifeCapture(JSON.parse(raw),async s=>sha(s),{entry:e,knownEventHeads:new Set(ledger.entries.map(x=>x.entryHash))});}
const head=ledger.entries.at(-1).entryHash;
if(index.entries.some(e=>e.sourceEventHead===head && e.withdrawalIndexHash===(excludedEventIds.length?withdrawnLedger.indexHash:undefined))){
 console.log('Rule-state checkpoint already captured for this sealed event head. No duplicate created.');process.exit(0);
}
const adj=new Map(T0.nodes.map(n=>[n.id,new Set()]));
for(const e of sourceLinks){adj.get(e.from).add(e.to);adj.get(e.to).add(e.from);}
const isolated=new Set([...adj.entries()].filter(([,neighbors])=>neighbors.size===0).map(([id])=>id));
const seen=new Set(),groups=[];
for(const id of adj.keys())if(!seen.has(id)){
 const group=[],stack=[id];seen.add(id);
 while(stack.length){const a=stack.pop();group.push(a);for(const n of adj.get(a))if(!seen.has(n)){seen.add(n);stack.push(n);}}
 groups.push(group.sort());
}
groups.sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]));
const mainIds=new Set(groups[0]);
if(isolated.size!==20||mainIds.size!==123)throw Error('Unexpected baseline components');
const placed=deriveInteriorQuietPositions(T0.nodes,mainIds,isolated);
const nodes=T0.nodes.map(n=>({id:n.id,position:placed.get(n.id)||n.displayPosition}));
const capturedAt=new Date().toISOString();
const model=deriveLifeMorphology({nodes,links:sourceLinks,evidence,asOf:capturedAt});
if(model.authoredEventsUsed!==evidence.length)throw Error('Future event timestamp; refuse an inauthentic time capture');
const capture={schema:LIFE_CAPTURE_SCHEMA,claim:LIFE_CAPTURE_CLAIM,capturedAt,sourceEventHead:head,authoredEvents:evidence.length,
 archiveSourceEntryHash:base.entryHash,baselineGeometrySha256:sha(rawT0),
 engineSha256:sha(await readFile(new URL('../public/life-morphology.mjs',import.meta.url))),
 lifeLedgerIndexHash:ledger.indexHash,lifeRuleVersion:model.schema,state:model};
if(excludedEventIds.length){capture.withdrawalIndexHash=withdrawnLedger.indexHash;capture.excludedEventIds=excludedEventIds;}
capture.payloadHash=sha(canonicalJSON(capture));
await verifyLifeCapture(capture,async s=>sha(s),{knownEventHeads:new Set(ledger.entries.map(x=>x.entryHash))});
const id='life-'+head.slice(0,20)+(excludedEventIds.length?'-'+withdrawnLedger.indexHash.slice(0,12):''),file=`data/life-states/states/${id}.json`;
const stored=JSON.stringify(capture,null,2)+'\n';
const last=index.entries.at(-1);
const entry={seq:index.entries.length+1,id,kind:'rule-derived-at-seal',sourceEventHead:head,authoredEvents:evidence.length,
 capturedAt,file,payloadHash:capture.payloadHash,rawSha256:sha(stored),engineSha256:capture.engineSha256,archiveSourceEntryHash:base.entryHash,
 previousEntryHash:last?.entryHash||null};
if(excludedEventIds.length){entry.withdrawalIndexHash=withdrawnLedger.indexHash;entry.excludedEventIds=excludedEventIds;}
entry.entryHash=sha(canonicalJSON(entry));
const next={schema:LIFE_CAPTURE_INDEX,entries:[...index.entries,entry]};next.indexHash=sha(canonicalJSON(next));
await verifyLifeStateIndex(next,async s=>sha(s));
await mkdir(join(root,'data/life-states/states'),{recursive:true});
await writeFile(join(root,file),stored,{flag:'wx'});
const pending=join(root,checkpointPath+'.pending');await writeFile(pending,JSON.stringify(next,null,2)+'\n',{flag:'wx'});await rename(pending,join(root,checkpointPath));
console.log('Captured deterministic life rule state:',id,'at',capturedAt);
console.log('Author-attested source events:',model.authoredEventsUsed,'; original links:',model.sourceLinkCount);
console.log('Captured rule output is NOT a witnessed past body. No Writing fiber was activated.');
