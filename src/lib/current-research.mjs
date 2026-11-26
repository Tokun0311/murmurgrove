import {buildGraph} from '../../murmurgrove-editor/research-core.mjs';
// Same source validation as Editor. No writes and no synthetic history at build time.
export const currentGraph=await buildGraph(process.cwd());
const byKey=new Map(currentGraph.records.map(r=>[r.key,r]));
export function currentRelationships(key){return currentGraph.relations.filter(e=>e.kind!=='recorded-link'&&(e.source===key||e.target===key)).flatMap(e=>{const other=byKey.get(e.source===key?e.target:e.source);return other?[{...e,other}]:[]});}
export function currentConcept(id){return currentGraph.concepts[id]||null;}
export function canonicalConceptId(id){const seen=new Set();while(currentGraph.concepts[id]?.mergedInto){if(seen.has(id))return null;seen.add(id);id=currentGraph.concepts[id].mergedInto;}return id;}
export function currentExhibitionIds(key){return new Set(currentGraph.relations.filter(e=>e.kind==='recorded-link'&&e.target===key&&e.source.startsWith('exhibitions:')).map(e=>e.source.slice('exhibitions:'.length)));}
export function currentConceptIds(id){return currentGraph.relations.filter(e=>e.kind==='recorded-link'&&e.source==='exhibitions:'+id&&e.target.startsWith('concepts:')).map(e=>e.target.slice('concepts:'.length));}
