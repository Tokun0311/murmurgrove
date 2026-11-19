/** Synthetic-only extreme histories; never derived from a person's archive. */
const schema='murmurgrove.event.v1';
function builder(){
  const events=[];
  function push(kind,at,payload){
    const seq=events.length+1;
    const ev={schema,seq,eventId:`evt:stress-${String(seq).padStart(5,'0')}`,kind,
      recordedAt:at,...(kind.startsWith('life.')?{effectiveAt:at}:{}),payload};
    events.push(ev);return ev;
  }
  function record(kind,slug,at,occurredOn=null){
    const id=`${kind}:${slug}`;
    push('archive.record.upsert',at,{reason:'ingest',record:{id,kind,title:`Synthetic ${slug}`,
      occurredOn,occurredOnBasis:occurredOn?(kind==='writing'?'authorship':'visit'):'unknown',visibility:'public'}});
    return id;
  }
  function link(slug,from,to,at,strength=1.4){
    const id=`link:${slug}`;
    push('archive.link.assert',at,{link:{id,from,to,strength,basis:'explicit'}});return id;
  }
  function life(kind,at,recordRefs,linkRefs=[]){
    const payload={recordRefs,linkRefs};
    if(kind==='life.reinterpretation')payload.interpretedOn=at.slice(0,10);
    push(kind,at,payload);
  }
  return {events,push,record,link,life};
}
function atYear(year,month,day=10){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T10:00:00Z`;}
/** Existing old structure, radically concentrated new work after 2030. */
export function concentrationHistory(){
  const b=builder(),t=atYear(2027,1);
  const old=b.record('concept','memory-and-place',t),focus=b.record('concept','institutional-studies',t);
  const first=b.record('writing','old-foundation',atYear(2027,2),'2027-02-10');
  const f=b.link('old-foundation',first,old,atYear(2027,3));
  b.life('life.writing',atYear(2027,4),[first,old],[f]);
  // Additional writings become increasingly focused on one concept only.
  for(let i=0;i<18;i++){
    const year=2030+Math.floor(i/6),month=1+i%6*2,t=atYear(year,month);
    const w=b.record('writing',`focus-${String(i).padStart(2,'0')}`,t,t.slice(0,10));
    const l=b.link(`focus-${String(i).padStart(2,'0')}`,w,focus,t);
    b.life('life.writing',t,[w,focus],[l]);
  }
  return b.events;
}
/** No new life events after 2027. */
export function silentHistory(){
  const b=builder(),at=atYear(2027,1);
  const concept=b.record('concept','dormant-research',at);
  const writing=b.record('writing','initial-writing',at,'2027-01-10');
  const l=b.link('initial-relation',writing,concept,at);
  b.life('life.writing',at,[writing,concept],[l]);
  return b.events;
}
/** Concept is explicitly encountered but makes no claim of linkage. */
export function ruptureHistory(){
  const b=concentrationHistory(),next=b.length+1;
  const time='2038-03-11T13:00:00Z';
  const recordId='concept:unconnected-new-field';
  b.push({schema,seq:next,eventId:`evt:stress-${String(next).padStart(5,'0')}`,
    kind:'archive.record.upsert',recordedAt:time,payload:{reason:'ingest',record:{
      id:recordId,kind:'concept',title:'Synthetic new isolated research direction',occurredOn:null,
      occurredOnBasis:'unknown',visibility:'public'}}});
  b.push({schema,seq:next+1,eventId:`evt:stress-${String(next+1).padStart(5,'0')}`,
    kind:'life.encounter',recordedAt:time,effectiveAt:time,
    payload:{recordRefs:[recordId],linkRefs:[]}});
  return b;
}
/** 500 backfilled old exhibition encounters on one date; not 500 2030 exhibitions. */
export function bulkImportHistory(count=500){
  const b=builder(),init='2027-01-01T00:00:00Z',t='2030-05-05T12:00:00Z';
  const c=b.record('concept','historical-field',init);
  for(let i=0;i<count;i++){
    const slug=`retro-${String(i).padStart(4,'0')}`;
    const e=b.record('exhibition',slug,t,'2027-02-10');
    const l=b.link(slug,e,c,t,1.2);
    b.life('life.encounter',t,[e,c],[l]);
  }
  return b.events;
}

/** 500 *genuine* synthetic new Writing life events in one import window. */
export function massWritingHistory(count=500){
  const b=builder(),t='2030-05-05T12:00:00Z';
  const concept=b.record('concept','high-strain-focus','2027-01-01T00:00:00Z');
  for(let i=0;i<count;i++){
    const slug=`writing-burst-${String(i).padStart(4,'0')}`;
    const writing=b.record('writing',slug,t,'2030-05-05');
    const l=b.link(slug,writing,concept,t,1.2);
    b.life('life.writing',t,[writing,concept],[l]);
  }
  return b.events;
}
