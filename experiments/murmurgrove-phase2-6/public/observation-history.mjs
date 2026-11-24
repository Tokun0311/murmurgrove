/** Phase 2.7 · Read-only observations by supplied occurredOn date.
 * Source data is a CURRENT archive projection; this is NEVER a historic
 * morphological checkpoint, author ingest timestamp, or life activation.
 */
export function validSourceDate(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const utc=new Date(s+'T00:00:00Z');
 return Number.isFinite(utc.getTime())&&utc.toISOString().slice(0,10)===s;
}
export function datedExhibitionLedger(records){
 if(!Array.isArray(records))throw new TypeError('Archive records must be an array');
 return records.filter(r=>r&&r.kind==='exhibition'&&!r.quarantined&&validSourceDate(r.occurredOn)
  &&typeof r.id==='string'&&typeof r.title==='string')
  .map(r=>({id:r.id,title:r.title,occurredOn:r.occurredOn,path:r.path||null}))
  .sort((a,b)=>b.occurredOn.localeCompare(a.occurredOn)||a.id.localeCompare(b.id));
}
export function observationMonthGroups(ledger){
 const grouped=new Map();
 for(const record of ledger){
  if(!validSourceDate(record.occurredOn))continue;
  const key=record.occurredOn.slice(0,7);
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(record);
 }
 return [...grouped].sort(([a],[b])=>b.localeCompare(a))
  .map(([key,entries])=>({key,year:Number(key.slice(0,4)),month:Number(key.slice(5,7)),entries}));
}
/** A month can highlight existing current metadata relationships only.
 * These edges DID NOT necessarily exist in the selected historical month.
 * Indices are in the already verified, visible `links` array.
 */
export function monthObservationContext(month,groups,links){
 const group=groups.find(g=>g.key===month);
 const exhibitions=new Set((group?.entries||[]).map(e=>e.id));
 const linkIndices=new Set(),neighbors=new Set();
 links.forEach((link,i)=>{
  if(!link||link.activated||link.status!=='METADATA_ONLY')return;
  const a=exhibitions.has(link.from),b=exhibitions.has(link.to);
  if(!a&&!b)return;
  linkIndices.add(i);neighbors.add(a?link.to:link.from);
 });
 return {month,exhibitions,linkIndices,neighbors};
}
