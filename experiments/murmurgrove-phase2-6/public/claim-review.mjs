/** Phase 4.1 · Audited source-claim review, NOT a life activation.
 * An approved Writing/relationship review never creates an archive node,
 * semantic relation, author life event, propagating fiber or mature core.
 * Only the archive source can authorize actual topology or author work.
 */
import {canonicalJSON} from './version-chronicle.mjs';
export const REVIEW_SCHEMA='murmurgrove.source-review.v1';
export const REVIEW_INDEX_SCHEMA='murmurgrove.source-review-index.v1';
export const REVIEW_ATTEST='AUTHOR_REVIEWED_THE_DECLARED_SOURCE_EVIDENCE';
const hash=/^[0-9a-f]{64}$/;
const id=/^(concept|writing|exhibition|person|institution):[a-z0-9][a-z0-9_-]*$/;
const check=(ok,s)=>{if(!ok)throw Error(s);};
export function validateClaimReview(r,{navigation,rawSourceHash,sourceCheckpointHash}={}){
 check(r?.schema===REVIEW_SCHEMA&&r.attestation===REVIEW_ATTEST&&['writing-source','existing-relation'].includes(r.kind),'Invalid claim review type');
 check(typeof r.note==='string'&&r.note.trim().length>=16&&r.note.length<=1000,'A concrete author review note (16–1000 chars) is required');
 check(hash.test(r.sourceSha256)&&hash.test(r.sourceCheckpointHash)&&r.sourceCheckpointHash===sourceCheckpointHash,'Invalid source provenance');
 check(typeof r.approvedAt==='string'&&Number.isFinite(Date.parse(r.approvedAt))&&r.approvedAt.endsWith('Z'),'Invalid author confirmation time');
 check(Array.isArray(r.recordIds)&&r.recordIds.every(x=>id.test(x)),'Invalid record identifiers');
 const visible=new Map((navigation?.records||[]).filter(x=>!x.quarantined).map(x=>[x.id,x]));
 if(r.kind==='writing-source'){
  check(r.recordIds.length===1&&r.recordIds[0].startsWith('writing:'),'Writing claim requires one real Writing archive record');
  const record=visible.get(r.recordIds[0]);
  check(record?.kind==='writing'&&record.source?.startsWith('src/data/')&&(/^\/writings?\//.test(record.path||'')),'No verified Writing source in the chosen archive version');
  check(r.sourcePath===record.source&&r.sourceSha256===rawSourceHash,'Writing bytes differ from declared raw Markdown');
 }else{
  check(r.recordIds.length===2&&r.recordIds[0]!==r.recordIds[1]&&r.recordIds.every(x=>visible.has(x)),'Relation review requires two verified nonquarantined endpoints');
  const relation=(navigation.metadataLinks||[]).find(e=>(e.from===r.recordIds[0]&&e.to===r.recordIds[1])||(e.from===r.recordIds[1]&&e.to===r.recordIds[0]));
  check(relation&&relation.status==='METADATA_ONLY'&&!relation.activated,'Relation is not part of verified source metadata');
  check(r.sourcePath===null&&r.sourceSha256===rawSourceHash,'Relation review must refer to exact navigation source bytes');
 }
 return true;
}
export async function verifyClaimReviewIndex(index,sha){
 check(index?.schema===REVIEW_INDEX_SCHEMA&&Array.isArray(index.entries)&&hash.test(index.indexHash),'Invalid review index');
 check(await sha(canonicalJSON({schema:index.schema,entries:index.entries}))===index.indexHash,'Review index tampered');
 let prev=null;const keys=new Set();
 for(let i=0;i<index.entries.length;i++){
  const e=index.entries[i];
  check(e.seq===i+1&&['writing-source','existing-relation'].includes(e.kind)&&hash.test(e.reviewSha256)&&hash.test(e.entryHash)&&hash.test(e.sourceCheckpointHash),'Malformed review entry');
  check(typeof e.id==='string'&&/^review-[a-z0-9-]+$/.test(e.id)&&!keys.has(e.id),'Duplicate review identity');keys.add(e.id);
  check(e.file===`data/source-reviews/records/${e.id}.json`,'Unsafe source review path');
  check(e.previousEntryHash===prev,'Broken source review chain');
  const {entryHash,...body}=e;check(await sha(canonicalJSON(body))===entryHash,'Review chain modified');prev=e.entryHash;
 }
 return {valid:true,count:index.entries.length};
}
