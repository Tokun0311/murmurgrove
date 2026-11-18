/**
 * Sonic topology v1. Counts are intentionally not a sonic control.
 * A finite, deterministic graph descriptor, computed only when archive state changes.
 * It does not claim to infer the meaning of a visitor's research.
 */
export type SonicRoot = {from:string;to:string;weight:number;kind:'direct'|'shared'};
export type SonicGraph = {
  connectivity:number; // relative abundance of surplus paths, not raw edge count
  integration:number;  // fraction of *linked* nodes in the largest connected component
  crossing:number;     // relationships between distinct archive sections
  reinforcement:number;// repeated co-occurrence weight per edge
  heterogeneity:number;// variety of cross-section relationship types
  signature:string;    // deterministic and independent of input order
  edges:number;
  linkedNodes:number;
};
const cap=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const section=(key:string)=>key.split(':',1)[0];
export function sonicGraph(roots:readonly SonicRoot[]):SonicGraph{
  const unique=new Map<string,SonicRoot>();
  for(const edge of roots){
    if(!edge?.from||!edge?.to||edge.from===edge.to)continue;
    const [a,b]=[edge.from,edge.to].sort();
    const k=`${a}\u0001${b}`;
    const w=Math.max(0,Number.isFinite(edge.weight)?edge.weight:0);
    const prev=unique.get(k);
    if(!prev||w>prev.weight)unique.set(k,{from:a,to:b,weight:w,kind:edge.kind});
  }
  const edges=[...unique.values()].sort((a,b)=>(a.from+a.to).localeCompare(b.from+b.to));
  const parent=new Map<string,string>();
  const find=(x:string):string=>{if(!parent.has(x))parent.set(x,x);const p=parent.get(x)!;if(p===x)return x;const root=find(p);parent.set(x,root);return root;};
  let cycles=0,between=0,reinforcement=0;
  const typePairs=new Set<string>();
  for(const e of edges){
    const a=find(e.from),b=find(e.to);
    if(a===b)cycles++;else parent.set(a,b);
    if(section(e.from)!==section(e.to))between++;
    typePairs.add([section(e.from),section(e.to)].sort().join('|'));
    reinforcement+=Math.max(0,Math.min(4,e.weight-1));
  }
  const sizes=new Map<string,number>();
  for(const k of parent.keys()){const root=find(k);sizes.set(root,(sizes.get(root)||0)+1);}
  const n=parent.size;
  const signature=edges.map(e=>`${e.from}>${e.to}:${e.weight}:${e.kind}`).join('\n');
  // Stable FNV-1a digest for compact diagnostics, never used as a pitch seed.
  let h=2166136261;
  for(let i=0;i<signature.length;i++){h^=signature.charCodeAt(i);h=Math.imul(h,16777619);}
  return {
    connectivity:cap(cycles/Math.max(1,edges.length)),
    integration:n?Math.max(...sizes.values())/n:0,
    crossing:edges.length?between/edges.length:0,
    reinforcement:edges.length?cap(reinforcement/edges.length/2):0,
    heterogeneity:cap(typePairs.size/6),
    signature:(h>>>0).toString(16).padStart(8,'0'),
    edges:edges.length,
    linkedNodes:n,
  };
}
/** Structural transitions are only asserted when TWO actual archive versions exist. */
export function compareSonicGraphs(before:readonly SonicRoot[],after:readonly SonicRoot[]){
  const keyed=(roots:readonly SonicRoot[])=>new Map(roots.map(e=>[[e.from,e.to].sort().join('|'),e]));
  const a=keyed(before),b=keyed(after);
  let retained=0,reweighted=0;
  for(const [k,e] of a){const next=b.get(k);if(!next)continue;retained++;
    if(next.weight!==e.weight||next.kind!==e.kind)reweighted++;
  }
  const added=b.size-retained,removed=a.size-retained;
  return {added,removed,retained,reweighted,changed:added>0||removed>0||reweighted>0};
}
