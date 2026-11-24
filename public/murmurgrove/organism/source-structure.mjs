/** Phase 2.9 · Source structure reading on the one existing T0 reference geometry.
 * This is an explicitly NON-HISTORICAL, static evidence projection:
 * - link must be declared in the checksum-verified selected navigation source
 * - only nodes with real, pinned T0 display coordinates can be drawn
 * - out-of-geometry records are counted and listed, never guessed into space
 * - metadata links are NOT life-event fibers, growth, or past anatomy
 */
export const SOURCE_READING_MODE='SOURCE_GRAPH_ON_REFERENCE_GEOMETRY_NOT_HISTORICAL_MORPHOLOGY';
const linkKey=e=>JSON.stringify([e.from,e.to,e.sourceField]);
function sourceGraph(nav){
 if(nav?.schema!=='murmurgrove.navigation.2.1.v1'||!Array.isArray(nav.records)||!Array.isArray(nav.metadataLinks))throw Error('Invalid archive source graph');
 const all=new Map();for(const r of nav.records){
  if(typeof r.id!=='string'||!r.id||all.has(r.id))throw Error('Duplicate or invalid source record');
  if(r.quarantined!==(r.verification==='needs-review'))throw Error('Quarantine evidence mismatch: '+r.id);
  all.set(r.id,r);
 }
 const visible=new Map([...all].filter(([,r])=>!r.quarantined));
 const edges=[],keys=new Set();
 for(const e of nav.metadataLinks){
  if(!all.has(e.from)||!all.has(e.to)||e.status!=='METADATA_ONLY'||e.activated!==false)throw Error('Invalid or activated source link');
  const key=linkKey(e);if(keys.has(key))throw Error('Duplicate source link');keys.add(key);
  if(visible.has(e.from)&&visible.has(e.to))edges.push({...e,key});
 }
 return {visible,edges,links:new Set(edges.map(e=>e.key))};
}
export function sourceStructure(nav,referenceGeometryIds,previousNav=null){
 const geom=new Set(referenceGeometryIds);if(geom.size!==referenceGeometryIds.length)throw Error('Duplicate reference geometry id');
 const current=sourceGraph(nav),previous=previousNav?sourceGraph(previousNav):null;
 const projectedIds=new Set([...current.visible.keys()].filter(id=>geom.has(id)));
 const unplaced=[...current.visible.values()].filter(r=>!geom.has(r.id)).map(r=>({id:r.id,title:r.title,kind:r.kind})).sort((a,b)=>a.id.localeCompare(b.id));
 const projectedEdges=current.edges.filter(e=>projectedIds.has(e.from)&&projectedIds.has(e.to));
 const omittedEdges=current.edges.length-projectedEdges.length;
 const addedIds=new Set(previous?[...current.visible.keys()].filter(id=>!previous.visible.has(id)):[]);
 const removedIds=new Set(previous?[...previous.visible.keys()].filter(id=>!current.visible.has(id)):[]);
 const addedLinks=new Set(previous?current.edges.filter(e=>!previous.links.has(e.key)).map(e=>e.key):[]);
 const removedLinks=new Set(previous?previous.edges.filter(e=>!current.links.has(e.key)).map(e=>e.key):[]);
 const incident=new Map([...projectedIds].map(id=>[id,0]));
 for(const e of projectedEdges){incident.set(e.from,incident.get(e.from)+1);incident.set(e.to,incident.get(e.to)+1);}
 return {
  mode:SOURCE_READING_MODE, projectedIds, projectedEdges, unplaced, omittedEdges,
  sourceRecords:current.visible, addedIds,removedIds,addedLinks,removedLinks,
  visibleSourceCount:current.visible.size, visibleSourceEdges:current.edges.length,
  drawableCount:projectedIds.size,drawableEdges:projectedEdges.length,
  independentDrawable:[...incident.values()].filter(n=>n===0).length,
  geometryWasReused:true,simulatedHistoricalMorphologies:0,activatedFibers:0
 };
}
export function validateStructureCounts(structure,entry){
 if(!entry?.counts||structure.visibleSourceCount!==entry.counts.displayed||structure.visibleSourceEdges!==entry.counts.verifiedVisibleReferences)throw Error('Source evidence counts do not match the sealed checkpoint');
 return true;
}
