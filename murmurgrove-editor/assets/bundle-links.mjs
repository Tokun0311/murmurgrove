// Shared by the local editor UI and publication validator. Only explicit links count.
export const ROOT_GROUPS={artists:'people',curators:'people',institution:'institutions',relatedInstitutions:'institutions',concepts:'concepts'};
export const ASSOCIATIONS={linkedPeople:'people',linkedInstitutions:'institutions',linkedExhibitions:'exhibitions',linkedConcepts:'concepts',linkedWriting:'writing'};
export const STAGE_TYPES=['people','institutions','concepts'];
export const PROFILE_KEYS={people:['reading','sortName','birthYear','deathYear','birthplace','basedIn','practiceFields','website','roles','sources'],institutions:['nativeName','alternativeNames','foundedYear','closedYear','institutionTypes','country','address','website','sources','longitude','latitude','locationType','addressStatus','addressSource','venueName','venueAddress','venueStatus','associatedProject'],concepts:['nativeName','alternativeNames','theoreticalSource','sources']};
export const refKey=({type,slug})=>type+':'+slug;
export function recordRefs(type,fields={}){
 const groups=type==='exhibitions'?{...ROOT_GROUPS,...ASSOCIATIONS}:ASSOCIATIONS;
 return Object.entries(groups).flatMap(([field,target])=>(Array.isArray(fields[field])?fields[field]:fields[field]?[fields[field]]:[]).map(slug=>({type:target,slug,field})));
}
// Directed traversal from the actual edited record; disconnected cycles are not valid.
export function reachableBundle(type,fields,nodes){
 const byKey=new Map(nodes.map(n=>[refKey(n),n])),seen=new Set(),queue=recordRefs(type,fields);
 for(let i=0;i<queue.length;i++){const key=refKey(queue[i]);if(seen.has(key))continue;seen.add(key);const node=byKey.get(key);if(node)queue.push(...recordRefs(node.type,node));}
 return seen;
}
export function externalBundleRefs(type,slug,fields,nodes){
 const internal=new Set([refKey({type,slug}),...nodes.map(refKey)]);
 return [...new Map([...recordRefs(type,fields),...nodes.flatMap(n=>recordRefs(n.type,n))].filter(r=>!internal.has(refKey(r))).map(r=>[refKey(r),r])).values()];
}
