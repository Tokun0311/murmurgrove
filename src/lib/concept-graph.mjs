// Overview is a display projection, not a change to the underlying relationships.
export const edgeKey = e => JSON.stringify([e.a,e.b].sort());
export function overviewEdges(edges, limit=2, minShared=2){
 const degree=new Map(), chosen=new Set();
 for(const e of [...edges].sort((a,b)=>b.count-a.count || edgeKey(a).localeCompare(edgeKey(b)))){
  if(e.count<minShared||(degree.get(e.a)||0)>=limit||(degree.get(e.b)||0)>=limit)continue;
  chosen.add(edgeKey(e)); for(const id of [e.a,e.b])degree.set(id,(degree.get(id)||0)+1);
 }
 return chosen;
}
export function mobileConceptLayout(nodes, fixed){
 const extra=nodes.filter(n=>!fixed[n.id]);
 const height=1180+Math.ceil(extra.length/2)*155;
 let next=0;
 return {height,nodes:nodes.map((n,i)=>{
  const p=fixed[n.id];
  if(p)return {...n,mx:Math.max(24,Math.min(76,p[0])),my:Math.min(91,p[1])*1180/height,ampX:p[2],ampY:p[3],drift:i%7};
  const k=next++;return {...n,mx:k%2?73:27,my:100*(1180+77.5+Math.floor(k/2)*155)/height,ampX:13,ampY:10,drift:i%7,extra:true};
 })};
}
