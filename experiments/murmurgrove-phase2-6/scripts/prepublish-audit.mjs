/** Conservative publication gate for locally authored evidence.
 * No deployment, deletion, permission change, or Git operation occurs here.
 * A SHA digest is an integrity check, not an identity signature.
 */
import {readFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyLivedIndex,validateSealedLivedEvidence} from '../public/lived-events.mjs';
import {verifyOpticalFrameIndex,verifyFrameEvidence} from '../public/optical-frames.mjs';
import {verifyLifeStateIndex,verifyLifeCapture} from '../public/life-checkpoints.mjs';
import {verifyWithdrawalIndex} from '../public/withdrawals.mjs';
import {verifyClaimReviewIndex} from '../public/claim-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=async file=>readFile(join(root,file),'utf8');
const json=async file=>JSON.parse(await read(file));
const [lived,optical,derived,chronicle,nav,withdrawals,reviews]=await Promise.all([
 json('data/lived-events/index.json'),json('data/optical-frames/index.json'),json('data/life-states/index.json'),
 json('data/chronicle/index.json'),json('data/navigation.json'),json('data/withdrawals/index.json'),json('data/source-reviews/index.json')
]);
await verifyLivedIndex(lived,async x=>sha(x));
await verifyWithdrawalIndex(withdrawals,async x=>sha(x),{livedIndex:lived});
await verifyClaimReviewIndex(reviews,async x=>sha(x));
for(const e of reviews.entries){
 const raw=await read(e.file);
 if(sha(raw)!==e.reviewSha256)throw Error('Private author source review was modified: '+e.id);
 const record=JSON.parse(raw);
 if(record.schema!=='murmurgrove.source-review.v1'||record.sourceCheckpointHash!==e.sourceCheckpointHash||record.kind!==e.kind)throw Error('Author source review/index mismatch: '+e.id);
}
await verifyOpticalFrameIndex(optical,async x=>sha(x));
await verifyLifeStateIndex(derived,async x=>sha(x));
const checkpoint=chronicle.entries[0],heads=new Set(lived.entries.map(e=>e.entryHash));
for(const e of lived.entries){
 const raw=await read(e.file);if(sha(raw)!==e.rawSha256)throw Error('Authored event evidence changed: '+e.eventId);
 validateSealedLivedEvidence(JSON.parse(raw),{checkpoint,record:nav.records.find(r=>r.id===e.recordId),seq:e.seq});
}
for(const e of derived.entries){
 const raw=await read(e.file);if(sha(raw)!==e.rawSha256)throw Error('Derived state evidence changed: '+e.id);
 await verifyLifeCapture(JSON.parse(raw),async x=>sha(x),{entry:e,knownEventHeads:heads});
}
for(const e of optical.entries){
 const raw=await read(e.file);if(sha(raw)!==e.rawSha256)throw Error('Optical capture evidence changed: '+e.id);
 await verifyFrameEvidence(JSON.parse(raw),async x=>sha(x),async buf=>sha(buf),b64=>Buffer.from(b64,'base64'));
}
console.log('MURMURGROVE / Publication evidence audit');
console.log('Verified records: 174; visible source relations: 158');
console.log('Author-attested actions:',lived.entries.length);
console.log('Rule-derived state captures:',derived.entries.length);
console.log('Observed optical captures:',optical.entries.length);
console.log('Withdrawn event tombstones:',withdrawals.entries.length);
console.log('Source claim reviews:',reviews.entries.length);
console.log('This command does not publish or delete anything.');
if((lived.entries.length||optical.entries.length||derived.entries.length||withdrawals.entries.length||reviews.entries.length)&&!process.argv.includes('--author-reviewed-for-publication')){
 console.error('\nPUBLICATION BLOCKED: authored research notes / optical captures require the author to review privacy, consent, and withdrawal implications before public upload.');
 console.error('Review source files and Git history. A later deletion from the working tree will not erase existing public Git history.');
 process.exitCode=2;
}else if(process.argv.includes('--author-reviewed-for-publication')){
 console.log('Explicit publication-review flag supplied. This checks integrity but does NOT guarantee third-party consent, privacy, or erasure.');
}else console.log('No authored notes or optical captures in this release. Static sandbox evidence passes conservative publication gate.');
