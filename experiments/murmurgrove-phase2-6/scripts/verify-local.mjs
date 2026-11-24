/** Private-safe integrity check for both pristine and authored installations.
 * Does not require an empty lived-event ledger, unlike frozen fixture tests.
 * Does not delete, publish, alter, or attest content.
 */
import {readFile,realpath} from 'node:fs/promises';
import {join,resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyChronicle} from '../public/version-chronicle.mjs';
import {verifyLivedIndex,validateSealedLivedEvidence} from '../public/lived-events.mjs';
import {verifyWithdrawalIndex,lifeCaptureIncludesWithdrawal} from '../public/withdrawals.mjs';
import {verifyLifeStateIndex,verifyLifeCapture} from '../public/life-checkpoints.mjs';
import {verifyOpticalFrameIndex,verifyFrameEvidence} from '../public/optical-frames.mjs';
import {verifyClaimReviewIndex,validateClaimReview} from '../public/claim-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const site=resolve(root,'../../..');
const sha=v=>createHash('sha256').update(v).digest('hex');
const text=async p=>readFile(join(root,p),'utf8'),json=async p=>JSON.parse(await text(p));
const [chron,lived,withdrawn,life,frames,reviews]=await Promise.all([
 'data/chronicle/index.json','data/lived-events/index.json','data/withdrawals/index.json',
 'data/life-states/index.json','data/optical-frames/index.json','data/source-reviews/index.json'].map(json));
await verifyChronicle(chron,async t=>sha(t));
await verifyLivedIndex(lived,async t=>sha(t));
await verifyWithdrawalIndex(withdrawn,async t=>sha(t),{livedIndex:lived});
await verifyLifeStateIndex(life,async t=>sha(t));
await verifyOpticalFrameIndex(frames,async t=>sha(t));
await verifyClaimReviewIndex(reviews,async t=>sha(t));
const revisions=new Map();
for(const e of chron.entries){
 for(const k of ['baseline','navigation'])if(sha(await readFile(join(root,e.sourceFiles[k])))!==e.sourceSha256[k])throw Error('Source bytes modified: '+e.id+' '+k);
 revisions.set(e.entryHash,JSON.parse(await text(e.sourceFiles.navigation)));
}
const eventHeads=new Set(lived.entries.map(e=>e.entryHash));
for(const e of lived.entries){
 const raw=await text(e.file);if(sha(raw)!==e.rawSha256)throw Error('Event bytes changed: '+e.eventId);
 const x=JSON.parse(raw),checkpoint=chron.entries.find(v=>v.entryHash===e.archiveSourceEntryHash);
 if(!checkpoint)throw Error('Unknown source checkpoint for event: '+e.eventId);
 validateSealedLivedEvidence(x,{seq:e.seq,checkpoint,record:revisions.get(checkpoint.entryHash).records.find(r=>r.id===e.recordId)});
}
let hidden=0;
for(const e of life.entries){
 const raw=await text(e.file);if(sha(raw)!==e.rawSha256)throw Error('Derived state bytes changed: '+e.id);
 await verifyLifeCapture(JSON.parse(raw),async t=>sha(t),{entry:e,knownEventHeads:eventHeads});
 if(lifeCaptureIncludesWithdrawal(e.sourceEventHead,lived,withdrawn,e.excludedEventIds))hidden++;
}
for(const e of frames.entries){
 const raw=await text(e.file);if(sha(raw)!==e.rawSha256)throw Error('Optical frame bytes changed: '+e.id);
 await verifyFrameEvidence(JSON.parse(raw),async t=>sha(t),async b=>sha(b),x=>Buffer.from(x,'base64'));
}
for(const e of reviews.entries){
 const raw=await text(e.file);if(sha(raw)!==e.reviewSha256)throw Error('Source review bytes changed: '+e.id);
 const review=JSON.parse(raw),nav=revisions.get(e.sourceCheckpointHash),checkpoint=chron.entries.find(x=>x.entryHash===e.sourceCheckpointHash);
 if(!nav||!checkpoint)throw Error('Source review refers to absent archive revision');
 let rawSourceHash=review.sourceSha256;
 if(review.kind==='existing-relation')rawSourceHash=sha(await readFile(join(root,checkpoint.sourceFiles.navigation)));
 else{
  const siteRoot=await realpath(site),path=await realpath(join(site,review.sourcePath));
  if(!path.startsWith(siteRoot+sep))throw Error('Writing source path escapes local archive');
  rawSourceHash=sha(await readFile(path));
 }
 validateClaimReview(review,{navigation:nav,rawSourceHash,sourceCheckpointHash:e.sourceCheckpointHash});
}
console.log('MURMURGROVE — local source and privacy integrity PASS');
console.log('Archive versions:',chron.entries.length,'| sealed author actions:',lived.entries.length,'| withdrawn:',withdrawn.entries.length);
console.log('Rule states:',life.entries.length,'| suppressed as tainted:',hidden,'| optical captures:',frames.entries.length,'| source reviews:',reviews.entries.length);
console.log('This check is NOT permission to publish, proof of authorship, or irreversible erasure.');
