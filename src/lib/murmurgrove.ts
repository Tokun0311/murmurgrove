/** Murmurgrove V6: real-record directional morphology.
 * Explicit archive associations determine growth; missing associations stay neutral.
 * No invented tags, fixed particle quotas, or simulated future entries.
 */
export type CollectionItem = {id:string;data:Record<string,any>};
export type GroveInput = {exhibitions:CollectionItem[]; people:CollectionItem[]; institutions:CollectionItem[]; concepts:CollectionItem[]; writing?:CollectionItem[]; photography?:CollectionItem[]};
export type GroveSection='exhibitions'|'institutions'|'people'|'concepts'|'writing'|'photography';
export type GroveRoot={from:string;to:string;weight:number;kind:'direct'|'shared'};
export type GroveMark={key:string;section:GroveSection;title:string;url:string;strength:number;recency:number;related:number;x:number;y:number;seed:number;directionStrength:number;focus:string;activity:number;growth:number};
export const hashUnit=(value:string):number=>{
  let h=2166136261; for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967295;
};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const toDate=(d:unknown)=>{const n=new Date(d as string|Date|number).getTime();return Number.isFinite(n)?n:0};
const DAY=86400000;
const normalize=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[\s_\-]+/g,'').replace(/[^\p{L}\p{N}]/gu,'');
const dateActivity=(when:number,reference:number)=>when&&reference?Math.exp(-Math.max(0,reference-when)/(DAY*365*2)):0;
export function createMurmurgrove(input:GroveInput){
 const exhibitions=input.exhibitions.filter(e=>e.data?.verification!=='draft');
 const people=input.people,institutions=input.institutions,concepts=input.concepts;
 const writing=(input.writing||[]).filter(e=>!e.data?.draft);
 const photography=(input.photography||[]).filter(e=>!e.data?.draft);
 const all=[...exhibitions,...writing,...photography];
 const reference=Math.max(...exhibitions.map(e=>toDate(e.data.visitedOn)),...writing.map(e=>toDate(e.data.date)),...photography.map(e=>toDate(e.data.date)),0);
 const conceptKeys=new Set(concepts.map(c=>c.id));
 const conceptsByAlias=new Map<string,string>();
 concepts.forEach(c=>{conceptsByAlias.set(normalize(c.id),c.id);conceptsByAlias.set(normalize(String(c.data.title||'')),c.id)});
 const lookup=(raw:unknown):string|undefined=>typeof raw==='string'?conceptsByAlias.get(normalize(raw)):undefined;
 const weightsFor=(item:CollectionItem,section:GroveSection)=>{
  const result=new Map<string,number>();
  const add=(id:unknown,w:number)=>{const c=lookup(id);if(c&&w>0)result.set(c,Math.max(result.get(c)||0,clamp(w,0,1.6)))};
  // Concepts explicitly linked by the author, not guessed from writing content.
  for(const id of (item.data.concepts||[]))add(id,1);
  // Writing / photography tags are considered only if they match an existing concept title/slug.
  if(section==='writing'||section==='photography')for(const tag of (item.data.tags||[]))add(tag,.85);
  // Optional individual emphasis: directions: { site-specificity: 0.9, ecology: 0.2 }.
  const directions=item.data.directions;
  if(directions&&typeof directions==='object'&&!Array.isArray(directions))for(const [id,w] of Object.entries(directions))if(typeof w==='number')add(id,w);
  return result;
 };
 const indexed={institutions:new Set(institutions.map(x=>x.id)),people:new Set(people.map(x=>x.id)),concepts:conceptKeys};
 const links=new Map<string,GroveRoot>();
 const cooccurrence=new Map<string,number>();
 const associations=new Map<string,Map<string,number>>();
 const mentions=new Map<string,number>();
 const lastActivity=new Map<string,number>();
 const push=(from:string,to:string,weight:number)=>{
   const key=`${from}|${to}`;links.set(key,{from,to,weight,kind:'direct'});
   mentions.set(to,(mentions.get(to)||0)+weight);
 };
 const recordData:{id:string;section:GroveSection;item:CollectionItem;directions:Map<string,number>;date:number}[]=[];
 for(const [section,items] of [['exhibitions',exhibitions],['writing',writing],['photography',photography]] as const){
  for(const item of items){
   const id=`${section}:${item.id}`,d=item.data;
   const directions=weightsFor(item,section);
   associations.set(id,directions);
   const date=toDate(section==='exhibitions'?d.visitedOn:d.date);
   recordData.push({id,section,item,directions,date});
   const connected:string[]=[];
   for(const [concept,w] of directions){const to=`concepts:${concept}`;push(id,to,section==='writing'?w*1.35:w);connected.push(to);lastActivity.set(to,Math.max(lastActivity.get(to)||0,date))}
   if(section==='exhibitions'){
    const sections:[string,unknown[]][]=[['institutions',[d.institution,...(d.relatedInstitutions||[])]],['people',d.artists||[]]];
    for(const [type,values] of sections)for(const k of new Set(values.filter(v=>typeof v==='string'&&indexed[type as 'institutions'|'people'].has(v as string)))){
     const to=`${type}:${k}`;push(id,to,1);connected.push(to);lastActivity.set(to,Math.max(lastActivity.get(to)||0,date));
    }
   }
   for(let i=0;i<connected.length;i++)for(let j=i+1;j<connected.length;j++){
    if(connected[i].split(':')[0]===connected[j].split(':')[0])continue;
    const key=[connected[i],connected[j]].sort().join('|');cooccurrence.set(key,(cooccurrence.get(key)||0)+1);
   }
  }
 }
 const totals=new Map<string,{lifetime:number;recent:number;latest:number}>();
 concepts.forEach(c=>totals.set(c.id,{lifetime:0,recent:0,latest:0}));
 for(const r of recordData)for(const [c,w] of r.directions){const t=totals.get(c)!;t.lifetime+=w;t.recent+=w*dateActivity(r.date,reference);t.latest=Math.max(t.latest,r.date)}
 // Relative conceptual growth forms directions. A concept with no recent contribution
 // is retained, but it cannot expand merely because the clock keeps running.
 const field=new Map<string,{x:number;y:number;z:number;reach:number;activity:number}>();
 for(const c of concepts){
  const t=totals.get(c.id)!;
  const angle=hashUnit('direction:'+c.id)*Math.PI*2;
  const spread=(hashUnit('height:'+c.id)-.5)*.6;
  const life=Math.log1p(t.lifetime);
  const reach=.46+Math.min(.70,life*.15)+Math.min(.30,t.recent*.038);
  field.set(c.id,{x:Math.cos(angle),y:Math.sin(angle)*.78,z:spread,reach,activity:t.latest?dateActivity(t.latest,reference):0});
 }
 const centers=new Map<string,[number,number,number]>();
 const focusOf=(directions:Map<string,number>)=>[...directions].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
 const positionRecord=(id:string,directions:Map<string,number>,section:GroveSection):[number,number,number]=>{
  const seed=hashUnit(id),a=hashUnit('angle:'+id)*Math.PI*2;
  const radius=.10+.16*Math.sqrt(hashUnit('radius:'+id));
  let x=Math.cos(a)*radius,y=Math.sin(a)*radius*.83,z=(hashUnit('z:'+id)-.5)*.28;
  let sx=0,sy=0,sz=0,total=0;
  for(const [key,w] of directions){const f=field.get(key);if(!f)continue;const m=w*f.reach;sx+=f.x*m;sy+=f.y*m;sz+=f.z*m;total+=w}
  if(total>0){
   // Directional concentration moves records towards one another, while each
   // retains its individual position. No concept owns a hard geographic sector.
   const depth=Math.min(1.42,total*.82);
   x=x*.56+sx/total*depth;y=y*.56+sy/total*depth;z=z*.54+sz/total*depth;
  }
  // Interstitial writing acts as a bridge between concept regions.
  if(section==='writing'){x*=.84;y*=.84;z*=.9}
  return [clamp(x,-1.55,1.55),clamp(y,-1.13,1.13),clamp(z,-.80,.80)];
 };
 for(const r of recordData)centers.set(r.id,positionRecord(r.id,r.directions,r.section));
 // Institutions and people inherit geography from the records they actually
 // connect to; unreferenced entries remain neutral rather than acquiring guesses.
 const nodeRefs=new Map<string,{x:number;y:number;z:number;count:number}>();
 for(const edge of links.values()){
  const p=centers.get(edge.from);if(!p||edge.to.startsWith('concepts:'))continue;
  const s=nodeRefs.get(edge.to)||{x:0,y:0,z:0,count:0};s.x+=p[0];s.y+=p[1];s.z+=p[2];s.count++;nodeRefs.set(edge.to,s);
 }
 const marks:GroveMark[]=[];
 const add=(item:CollectionItem,section:GroveSection,position:[number,number,number],recency:number,related:number,focus:string,activity:number)=>{
   const key=item.id,id=`${section}:${key}`,seed=hashUnit(id);
   const logRelated=Math.log1p(related);
   const structural=section==='concepts'||section==='institutions'||section==='people';
   const growth=clamp(
    structural
      ? (section==='concepts'?logRelated*.44+activity*.48:section==='institutions'?logRelated*.36+activity*.28:logRelated*.34+activity*.26)
      : (section==='writing'?logRelated*.18+activity*.18:section==='photography'?logRelated*.14+activity*.12:logRelated*.15+activity*.15),
    0,1.65);
   const strength=clamp(
    (section==='concepts'?0.34:section==='institutions'?0.32:section==='people'?0.30:0.24)
     +(structural?Math.min(.98,logRelated*(section==='concepts'?.23:section==='institutions'?.20:.18)):Math.min(.64,logRelated*.14))
     +(structural?growth*.12:0),
    .18,1.75);
   const directionStrength=clamp(structural?Math.min(1.35,logRelated*.28+activity*.18):Math.min(1,logRelated*.16+activity*.12),0,1.35);
   marks.push({key,section,title:String(item.data.title||item.data.name||key),url:`/${section}/${encodeURIComponent(key)}/`,strength,related,recency:clamp(recency,0,1),x:clamp(.5+position[0]/3.36,.03,.97),y:clamp(.5+position[1]/2.52,.03,.97),seed,directionStrength,focus,activity:clamp(activity,0,1),growth});
 };
 for(const r of recordData){
  const activity=dateActivity(r.date,reference);const recency=reference&&r.date?Math.exp(-Math.max(0,reference-r.date)/(DAY*120)):0;
  add(r.item,r.section,centers.get(r.id)!,recency,(links.size? [...r.directions.values()].reduce((s,v)=>s+v,0):0)+(r.section==='exhibitions'?(r.item.data.artists?.length||0)+(r.item.data.institution?1:0):0),focusOf(r.directions),activity);
 }
 for(const [section,items] of [['institutions',institutions],['people',people],['concepts',concepts]] as const){
  for(const item of items){
   const id=`${section}:${item.id}`;const count=mentions.get(id)||0;
   let p:[number,number,number];let focus='';let activity=dateActivity(lastActivity.get(id)||0,reference);
   if(section==='concepts'){
    const f=field.get(item.id)!;p=[f.x*f.reach*.77,f.y*f.reach*.77,f.z*f.reach*.77];focus=item.id;activity=f.activity;
   }else{
    const s=nodeRefs.get(id);const theta=hashUnit('neutral:'+id)*Math.PI*2;
    p=s?[s.x/s.count*.78+Math.cos(theta)*.11,s.y/s.count*.78+Math.sin(theta)*.11,s.z/s.count*.78]:[Math.cos(theta)*.22,Math.sin(theta)*.18,(hashUnit('depth:'+id)-.5)*.35];
   }
   add(item,section,p,activity,count,focus,activity);
  }
 }
 const roots=[...links.values()];
 for(const [key,w] of cooccurrence){if(w<2)continue;const [from,to]=key.split('|');if(from&&to)roots.push({from,to,weight:w,kind:'shared'})}
 roots.sort((a,b)=>b.weight-a.weight||(a.from+a.to).localeCompare(b.from+b.to));
 marks.sort((a,b)=>a.section.localeCompare(b.section)||a.key.localeCompare(b.key));
 const counts={exhibitions:exhibitions.length,institutions:institutions.length,people:people.length,concepts:concepts.length,writing:writing.length,photography:photography.length};
 const fingerprint=marks.reduce((s,m)=>s+Math.round(m.strength*7+m.related*2+m.seed*23),0);
 const directionStates=[...totals].map(([id,t])=>({id,count:t.lifetime,recent:t.recent,active:t.latest?dateActivity(t.latest,reference):0})).sort((a,b)=>b.recent-a.recent);
 return {counts,relationCount:roots.length,relationDensity:roots.length/Math.max(1,exhibitions.length),marks,roots,fingerprint,directionStates};
}
