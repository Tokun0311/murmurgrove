function validAssociationProof(edge,proof){
  if(proof.method!=='frontmatter'||![edge.source,edge.target].includes(proof.source))return false;
  const other=proof.source===edge.source?edge.target:edge.source;
  const allowed={linkedInstitutions:'institutions',linkedPeople:'people',linkedExhibitions:'exhibitions',linkedConcepts:'concepts',linkedWriting:'writing',curators:'people'};
  const sourceType=proof.source.split(':')[0];
  const targetType=Object.hasOwn(allowed,proof.field)?allowed[proof.field]:null;
  return ['people','institutions','exhibitions','concepts','writing'].includes(sourceType)&&!!targetType&&other.startsWith(targetType+':')&&(proof.field!=='curators'||sourceType==='exhibitions');
}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { currentGraph } from './current-research.mjs';

// Only public projection data is read at build time. Reachability follows the
// same source evidence and anchor membership as the current viewer; no new
// positions, historic nodes or relationships are invented here.
export function buildArchiveNavigation(graph, nav, snapshot) {
  const kinds={exhibitions:'exhibition',people:'person',institutions:'institution',concepts:'concept',writing:'writing'};
  const records=new Map(), keys=new Map(), aliases=new Map(), locations=new Map();
  if(graph?.schema!=='murmurgrove.current-research.1'||graph.provenance!=='DERIVED_FROM_PUBLISHED_ARCHIVE_NOT_A_LIVED_BODY'||!Array.isArray(graph.records)||!Array.isArray(graph.relations))return {aliases,locations};
  const quarantined=new Set((nav?.records||[]).filter(r=>r.quarantined).map(r=>r.id));
  for(const row of graph.records){
    const kind=Object.hasOwn(kinds,row.type)&&kinds[row.type];
    if(!kind||typeof row.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)||row.key!==row.type+':'+row.id||row.path!=='/'+row.type+'/'+row.id+'/'||typeof row.title!=='string'||!row.title.trim()||!/^[a-f0-9]{64}$/.test(row.contentHash))return {aliases:new Map(),locations:new Map()};
    const id=kind+':'+row.id;
    if(row.engagement==='planned')continue;
    if(records.has(id))return {aliases:new Map(),locations:new Map()};
    records.set(id,row);keys.set(row.key,id);
    aliases.set(row.path,Array.isArray(row.aliases)?row.aliases.filter(a=>typeof a==='string'):[]);
  }
  const anchors=new Set((snapshot?.nodes||[]).filter(n=>!n.quarantined&&!quarantined.has(n.id)).map(n=>n.id));
  const reached=new Set(anchors);
  const edges=[];
  for(const edge of graph.relations){
    const from=keys.get(edge.source),to=keys.get(edge.target);
    const primary=edge.kind==='recorded-link'&&edge.source?.startsWith('exhibitions:');
    const association=edge.kind==='archive-association';
    const evidenced=Array.isArray(edge.provenance)&&edge.provenance.some(proof=>primary?proof.method==='frontmatter'&&keys.has(proof.source):association?validAssociationProof(edge,proof):proof.method==='reviewed-claim'&&proof.claimId&&proof.evidence&&proof.reason);
    if(from&&to&&from!==to&&evidenced&&!quarantined.has(from)&&!quarantined.has(to))edges.push([from,to]);
  }
  let changed=true;
  while(changed){
    changed=false;
    for(const [a,b] of edges){
      if(reached.has(a)&&!reached.has(b)){reached.add(b);changed=true;}
      if(reached.has(b)&&!reached.has(a)){reached.add(a);changed=true;}
    }
  }
  for(const [id,row] of records)if(reached.has(id)&&!quarantined.has(id))locations.set(row.path,id);
  return {aliases,locations};
}

let navigation={aliases:new Map(),locations:new Map()};
try{
  const read=path=>JSON.parse(readFileSync(resolve(process.cwd(),'public/murmurgrove',path),'utf8'));
  navigation=buildArchiveNavigation(currentGraph,read('organism/data/navigation.json'),read('organism/data/T0.json'));
}catch(error){
  // Fail closed: ordinary archive pages remain readable, without a false
  // location or fabricated alias, if the optional projection is unavailable.
  console.warn('Archive navigation projection unavailable:',error.message);
}
export function aliasesForPath(path){return navigation.aliases.get(path)||[];}
export function organismLocation(path){return navigation.locations.get(path)||null;}
