/** Stable, content-derived homepage morphology. No homepage editorial data to maintain. */
export type CollectionItem = {id:string; data:Record<string, any>};
export type GroveInput = {exhibitions:CollectionItem[]; people:CollectionItem[]; institutions:CollectionItem[]; concepts:CollectionItem[]};
export type GroveMark = {key:string;section:'exhibitions'|'institutions'|'people'|'concepts';title:string;url:string;strength:number;recency:number;related:number;x:number;y:number;seed:number};

export const hashUnit = (value:string):number=>{
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0)/4294967295;
};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const toDate=(d:unknown)=>new Date(d as string|number|Date).getTime()||0;

export function createMurmurgrove(input:GroveInput){
  const {exhibitions,people,institutions,concepts}=input;
  const records=exhibitions.filter(item=>item.data && item.data.verification!=='draft');
  const sorted=[...records].sort((a,b)=>toDate(b.data.visitedOn)-toDate(a.data.visitedOn));
  const latestDate=sorted.length?toDate(sorted[0].data.visitedOn):0;
  const indexes={
    people:new Set(people.map(p=>p.id)),
    institutions:new Set(institutions.map(p=>p.id)),
    concepts:new Set(concepts.map(p=>p.id)),
  };
  const mentions={people:new Map<string,number>(),institutions:new Map<string,number>(),concepts:new Map<string,number>()};
  const links=new Map<string,number>();
  const recent=new Map<string,number>();
  let totalRelations=0;
  for(const e of records){
    const d=e.data;
    const found:Record<'institutions'|'people'|'concepts',string[]>={
      institutions:([d.institution,...(d.relatedInstitutions||[])] as unknown[]).filter((id):id is string=>typeof id==='string'&&indexes.institutions.has(id)),
      people:(d.artists||[]).filter((id:string)=>indexes.people.has(id)),
      concepts:(d.concepts||[]).filter((id:string)=>indexes.concepts.has(id)),
    };
    const recentWeight=latestDate && toDate(d.visitedOn) >= latestDate-1000*60*60*24*75 ? 1 : 0;
    for(const kind of ['institutions','people','concepts'] as const){
      for(const id of new Set(found[kind])){
        mentions[kind].set(id,(mentions[kind].get(id)||0)+1);
        if(recentWeight)recent.set(`${kind}:${id}`,(recent.get(`${kind}:${id}`)||0)+1);
        const k=`exhibitions:${e.id}|${kind}:${id}`;
        links.set(k,1);
        totalRelations++;
      }
    }
    // Cross-section co-occurrence is implied by shared exhibition records.
    const all=[...new Set(found.institutions)].map(id=>`institutions:${id}`)
      .concat([...new Set(found.people)].map(id=>`people:${id}`),[...new Set(found.concepts)].map(id=>`concepts:${id}`));
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      if(all[i].split(':')[0]===all[j].split(':')[0])continue;
      const key=[all[i],all[j]].sort().join('|');
      links.set(key,(links.get(key)||0)+1);
    }
  }
  const counts={exhibitions:records.length,institutions:institutions.length,people:people.length,concepts:concepts.length};
  const marks:GroveMark[]=[];
  const add=(key:string,section:GroveMark['section'],title:string,strength:number,related:number,recency:number)=>{
    // Independent stable position seeded by permanent record ID, not array order.
    const seed=hashUnit(`${section}:${key}`);
    const a=hashUnit(`angle:${section}:${key}`)*Math.PI*2;
    const radius=Math.sqrt(hashUnit(`radius:${section}:${key}`));
    // One organism. Types affect material behaviour, not four disconnected territories.
    const x=.5 + Math.cos(a)*(.06+.37*radius);
    const y=.5 + Math.sin(a)*(.05+.34*radius);
    marks.push({key,section,title,url:`/${section}/${encodeURIComponent(key)}/`,strength,related,recency,x:clamp(x,.08,.92),y:clamp(y,.1,.9),seed});
  };
  for(const e of records){
    const days=latestDate?(latestDate-toDate(e.data.visitedOn))/86400000:999;
    const recency=clamp(1-days/110,0,1);
    const n=(e.data.artists?.length||0)+(e.data.concepts?.length||0)+(e.data.relatedInstitutions?.length||0)+(e.data.institution?1:0);
    add(e.id,'exhibitions',String(e.data.title||e.id),.36+Math.min(1,n/7)*.64,n,recency);
  }
  for(const [section,collection] of [['institutions',institutions],['people',people],['concepts',concepts]] as const){
    for(const item of collection){
      const count=mentions[section].get(item.id)||0;
      add(item.id,section,String(item.data.title||item.data.name||item.id),.2+Math.min(1,Math.log1p(count)/2.6)*.8,count,Math.min(1,(recent.get(`${section}:${item.id}`)||0)/2));
    }
  }
  // Keep the full archive in data. Rendering uses detail levels and viewport culling,
  // rather than discarding records once a fixed cap has been reached.
  const displayed=marks.sort((a,b)=>a.key.localeCompare(b.key));
  const active=(section:'institutions'|'people'|'concepts',collection:CollectionItem[])=>collection
    .map(item=>({id:item.id,name:section==='concepts'?item.data.title:item.data.name,score:(mentions[section].get(item.id)||0)+(recent.get(`${section}:${item.id}`)||0)*.65}))
    .filter(item=>item.score>0)
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))
    .slice(0,2)
    .map(item=>({title:item.name,url:`/${section}/${item.id}/`,section}));
  const entrances={
    exhibitions:sorted.slice(0,3).map(item=>({title:item.data.title,url:`/exhibitions/${item.id}/`,section:'exhibitions'})),
    institutions:active('institutions',institutions),
    people:active('people',people),
    concepts:active('concepts',concepts),
  };
  const relationDensity=totalRelations/Math.max(1,records.length);
  const fingerprint=[...marks].sort((a,b)=>a.key.localeCompare(b.key)).reduce((s,m)=>s+Math.round(m.strength*7+m.related*2+m.seed*23),0);
  return {counts,relationCount:totalRelations,relationDensity,marks:displayed,entrances,fingerprint,
    latest:sorted.slice(0,4).map(item=>({id:item.id,title:item.data.title,visitedOn:toDate(item.data.visitedOn),dateLabel:item.data.dateLabel,region:item.data.region})),
    summary:{records:records.length,linked:marks.filter(m=>m.related>0).length,relations:links.size}};
}
