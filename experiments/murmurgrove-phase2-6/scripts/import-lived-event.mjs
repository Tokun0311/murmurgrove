/** Phase 3.1. Manual import of an explicitly attested present research action.
 * No automatic recording from browsing, no retroactive life event, no writing
 * or connection activation without separately verified prerequisites.
 * Usage: node scripts/import-lived-event.mjs --file <browser-draft.json> --author-approved
 */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {validateLivedDraft,makeSealedLivedEvidence,validateSealedLivedEvidence,verifyLivedIndex,eventIdForDraft} from '../public/lived-events.mjs';
const sha=t=>createHash('sha256').update(t).digest('hex');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const indexPath=join(root,'data','lived-events','index.json');
const args=process.argv.slice(2);
if(args.length!==3||args[0]!=='--file'||args[2]!=='--author-approved')throw Error('Usage: node scripts/import-lived-event.mjs --file <draft.json> --author-approved');
const inputBytes=await readFile(resolve(args[1]));
if(inputBytes.byteLength>8_000)throw Error('Research action draft too large');
const draft=JSON.parse(inputBytes.toString('utf8'));
validateLivedDraft(draft);
const now=Date.now(),draftTime=Date.parse(draft.recordedAt);
if(draftTime>now+60_000||now-draftTime>7*24*3600_000)throw Error('Draft must be confirmed during the past seven days; no historical backdating. Re-export from the webpage.');
const chronicle=JSON.parse(await readFile(join(root,'data','chronicle','index.json'),'utf8'));
const checkpoint=chronicle.entries.find(x=>x.entryHash===draft.archiveSourceEntryHash);
if(!checkpoint||checkpoint.seq!==0)throw Error('This viewer only accepts actions anchored to its verified baseline, not an unrelated archive revision');
if(draft.baselineProjectionHash!==checkpoint.baselineProjectionHash)throw Error('Unrecognized archive projection');
// Verify exact bytes of the pinned reference, not only plausible JSON values.
for(const type of ['baseline','navigation']){
 const file=checkpoint.sourceFiles[type];
 const bytes=await readFile(join(root,file));
 if(sha(bytes)!==checkpoint.sourceSha256[type])throw Error('Source bytes no longer match pinned archive: '+type);
}
const navigation=JSON.parse(await readFile(join(root,checkpoint.sourceFiles.navigation),'utf8'));
const record=navigation.records.find(r=>r.id===draft.recordId&&!r.quarantined);
if(!record)throw Error('The selected record is absent or quarantined');
const index=JSON.parse(await readFile(indexPath,'utf8'));
await verifyLivedIndex(index,async value=>sha(value));
for(const entry of index.entries){
 const bytes=await readFile(join(root,entry.file));
 if(sha(bytes)!==entry.rawSha256)throw Error('Previously sealed lived action was modified: '+entry.eventId);
}
const eventId=eventIdForDraft(draft);
if(index.entries.some(e=>e.eventId===eventId))throw Error('This exact author action was already sealed');
const last=index.entries.at(-1);
if(last&&Date.parse(draft.recordedAt)<Date.parse(last.recordedAt))throw Error('Event time is earlier than the last sealed event; do not retroactively insert into life history');
const sealedAt=new Date().toISOString();
const sealed=makeSealedLivedEvidence(draft,{seq:index.entries.length+1,recordPath:record.path,archiveCheckpointId:checkpoint.id,sealedAt});
validateSealedLivedEvidence(sealed,{record,checkpoint,seq:index.entries.length+1});
const file=`data/lived-events/events/${eventId.slice(4)}.json`;
const stored=JSON.stringify(sealed,null,2)+'\n';
const entry={seq:index.entries.length+1,eventId,kind:sealed.event.kind,recordId:draft.recordId,recordedAt:draft.recordedAt,file,
 rawSha256:sha(stored),archiveSourceEntryHash:checkpoint.entryHash,previousEntryHash:last?.entryHash??null};
entry.entryHash=sha(canonicalJSON(entry));
const updated={schema:index.schema,entries:[...index.entries,entry]};
updated.indexHash=sha(canonicalJSON(updated));
await verifyLivedIndex(updated,async value=>sha(value));
await mkdir(join(root,'data','lived-events','events'),{recursive:true});
await writeFile(join(root,file),stored,{flag:'wx'});
const temp=indexPath+'.pending';
await writeFile(temp,JSON.stringify(updated,null,2)+'\n',{flag:'wx'});
await rename(temp,indexPath);
console.log('Sealed manually attested event:',eventId);
console.log('Record:',record.title);
console.log('Author attested:',draft.recordedAt,'/ Sealed:',sealedAt);
console.log('Source matched:',checkpoint.id);
console.log('NOTE: attestation is not independent verification or morphological activation.');
console.log('Restart the viewer to see the sealed event. Review privacy and withdrawal policy BEFORE any public commit.');
