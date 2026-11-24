/** Phase 2.6.4: display-only locations and motion for truly unlinked archive records.
 * Nothing in this module writes to snapshot data, creates a relationship or
 * interprets movement as an author-verified life event. The source position is
 * retained in the frozen T0 file and remains separately inspectable.
 */
export function hashId(id){let h=2166136261;for(const ch of id){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const frac=x=>x-Math.floor(x);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

/** Place independent records in open niches inside the main component's visible
 * 3D bounds instead of assigning all of them to an arbitrary outer shell.
 * A low-discrepancy, ID-seeded search finds locally empty volume and keeps each
 * independent specimen apart. No topology or archival position is changed.
 */
export function deriveInteriorQuietPositions(nodes,mainIds,isolatedIds){
 const main=nodes.filter(n=>mainIds.has(n.id)).map(n=>n.displayPosition);
 const result=new Map();if(main.length<3)return result;
 const min=[0,1,2].map(k=>Math.min(...main.map(p=>p[k])));
 const max=[0,1,2].map(k=>Math.max(...main.map(p=>p[k])));
 const c=min.map((v,k)=>(v+max[k])/2);
 const radii=min.map((v,k)=>Math.max(.02,(max[k]-v)*.43));
 const placed=[];
 for(const id of [...isolatedIds].sort()){
  const h=hashId(id),seed=(h+.5)/4294967296;
  let best=null,bestScore=-Infinity;
  for(let j=0;j<144;j++){
   const t=frac(seed+j*.618033988749895),v=frac(seed*.618033988749895+j*.754877666246693),w=frac(seed*.414213562373095+j*.569840290998);
   const polar=Math.PI*2*t,r=Math.sqrt(.11+.78*v);
   // Vertical lacunae remain inside the organism rather than the previous shell.
   const candidate=[c[0]+Math.cos(polar)*r*radii[0],
    c[1]+Math.sin(polar)*r*radii[1],c[2]+(w*2-1)*radii[2]*.93];
   const minMain=Math.min(...main.map(p=>dist(p,candidate)));
   const minOther=placed.length?Math.min(...placed.map(p=>dist(p,candidate))):10;
   // Prefer room to breathe, but not a remote void with no nearby anatomy.
   const supportPenalty=Math.max(0,minMain-.48)*.7;
   const score=Math.min(minMain,.34)*.77+Math.min(minOther,.28)*.95-supportPenalty;
   if(score>bestScore){bestScore=score;best=candidate;}
  }
  result.set(id,best);placed.push(best);
 }
 return result;
}

/** A small, bounded, deterministic optical drift for isolated particles.
 * There is no neighbor coupling, propagating pulse, or simulated life activation.
 */
export function quietParticlePosition(id,rest,time){
 const h=hashId(id),a=(h%997)*.00630225,b=((h>>>10)%991)*.00634025;
 const k=.0022+((h>>>20)%11)*.00023;
 return [rest[0]+k*Math.sin(time*.32+a)+k*.26*Math.sin(time*.61+b),
  rest[1]+k*.8*Math.cos(time*.28+b)+k*.22*Math.sin(time*.46+a),
  rest[2]+k*.42*Math.sin(time*.36+a+b)];
}
