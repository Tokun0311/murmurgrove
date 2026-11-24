/** Phase 4 · Author-directed withdrawal overlay.
 * A tombstone is a prohibition on continued display/projection, NOT a deletion
 * claim. Immutable private files, repositories, clones and hosting require
 * separately authorized erasure. No events are auto-withdrawn.
 */
import {canonicalJSON} from './version-chronicle.mjs';
export const WITHDRAWAL_SCHEMA='murmurgrove.withdrawal-ledger.v1';
const HASH=/^[0-9a-f]{64}$/;
const EVENT=/^evt:[a-z0-9_-]+$/;
const atOk=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&s.endsWith('Z');
function check(ok,msg){if(!ok)throw Error(msg);}
export function withdrawalSet(index){return new Set(index.entries.map(e=>e.eventId));}
export function filterWithdrawnEvidence(evidence,index){
 const ids=withdrawalSet(index);
 return evidence.filter(x=>!ids.has(x.event.eventId));
}
export function lifeCaptureIncludesWithdrawal(sourceHead,lived,withdrawals,excludedEventIds=[]){
 const target=lived.entries.findIndex(x=>x.entryHash===sourceHead);
 if(target===-1)return true; // Unknown provenance must never be displayed
 const ids=withdrawalSet(withdrawals);
 const excluded=new Set(excludedEventIds);
 return lived.entries.slice(0,target+1).some(x=>ids.has(x.eventId)&&!excluded.has(x.eventId));
}
export async function verifyWithdrawalIndex(index,sha,{livedIndex}={}){
 check(index?.schema===WITHDRAWAL_SCHEMA&&Array.isArray(index.entries)&&HASH.test(index.indexHash),'Invalid withdrawal index');
 check(await sha(canonicalJSON({schema:index.schema,entries:index.entries}))===index.indexHash,'Withdrawal index hash mismatch');
 const known=new Map(livedIndex?.entries?.map(e=>[e.eventId,e])??[]),seen=new Set();
 let last=null;
 for(let i=0;i<index.entries.length;i++){
  const e=index.entries[i];
  check(Object.keys(e).sort().join(',')==='entryHash,eventId,eventRawSha256,previousEntryHash,seq,withdrawnAt','Unexpected withdrawal fields');
  check(e.seq===i+1&&EVENT.test(e.eventId)&&!seen.has(e.eventId),'Duplicate or out-of-order withdrawal');seen.add(e.eventId);
  check(atOk(e.withdrawnAt)&&HASH.test(e.entryHash)&&HASH.test(e.eventRawSha256),'Malformed withdrawal');
  check(e.previousEntryHash===last,'Broken withdrawal chain');
  const {entryHash,...body}=e;
  check(await sha(canonicalJSON(body))===entryHash,'Withdrawal entry hash mismatch');
  if(livedIndex){
   const original=known.get(e.eventId);
   check(original&&original.rawSha256===e.eventRawSha256,'Withdrawal does not match sealed original');
   check(Date.parse(e.withdrawnAt)>=Date.parse(original.recordedAt),'Withdrawal predates event');
  }
  last=e.entryHash;
 }
 return {valid:true,count:index.entries.length};
}
export async function appendWithdrawal(index,{eventId,eventRawSha256,withdrawnAt},sha){
 check(EVENT.test(eventId)&&HASH.test(eventRawSha256)&&atOk(withdrawnAt),'Invalid withdrawal request');
 check(!withdrawalSet(index).has(eventId),'Already withdrawn');
 const e={seq:index.entries.length+1,eventId,eventRawSha256,withdrawnAt,previousEntryHash:index.entries.at(-1)?.entryHash??null};
 e.entryHash=await sha(canonicalJSON(e));
 const next={schema:WITHDRAWAL_SCHEMA,entries:[...index.entries,e]};
 next.indexHash=await sha(canonicalJSON(next));
 return next;
}
