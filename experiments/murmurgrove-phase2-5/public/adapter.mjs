/** Render-only geometry. No inferred links, no new simulation coordinates. */
export const VARIANTS=Object.freeze(['A','B','C']);
export function stableHash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s);
const len=a=>Math.hypot(...a),norm=a=>mul(a,1/Math.max(len(a),1e-8));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function validateRenderSnapshot(s){
 if(s.schema!=='murmurgrove.render-snapshot.2.0.v1'||s.mode!=='SIMULATED_SANDBOX')throw Error('Untrusted render snapshot');
 if(!Array.isArray(s.nodes)||!Array.isArray(s.fibers)||!Array.isArray(s.pulseChambers)||!Array.isArray(s.propulsionCores))throw Error('Incomplete render snapshot');
 const ids=new Set(s.nodes.map(n=>n.id));if(ids.size!==s.nodes.length)throw Error('Duplicate nodes');
 for(const n of s.nodes){if(n.quarantined||n.position?.length!==3||n.displayPosition?.length!==3)throw Error('Invalid material');}
 for(const f of s.fibers){if(!ids.has(f.from)||!ids.has(f.to)||f.points?.length!==5||f.points.some(p=>p.length!==3))throw Error('Invented or malformed fiber');}
 return true;
}
/** Centripetal Catmull–Rom. Passes through all five frozen controls; resists
 * overshoot at tight bends better than the uniform parameterization.
 */
export function curve(points,t){
 const segment=Math.min(points.length-2,Math.floor(clamp(t,0,1)*(points.length-1)));
 const u=clamp(t*(points.length-1)-segment,0,1);
 const p1=points[segment],p2=points[segment+1];
 const p0=segment===0?sub(mul(p1,2),p2):points[segment-1];
 const p3=segment+2===points.length?sub(mul(p2,2),p1):points[segment+2];
 const delta=(a,b)=>Math.max(1e-4,Math.sqrt(len(sub(a,b))));
 const k0=0,k1=delta(p0,p1),k2=k1+delta(p1,p2),k3=k2+delta(p2,p3);
 const tt=k1+(k2-k1)*u;
 const lerp=(a,b,t0,t1)=>a.map((x,i)=>x*(t1-tt)/(t1-t0)+b[i]*(tt-t0)/(t1-t0));
 const a1=lerp(p0,p1,k0,k1),a2=lerp(p1,p2,k1,k2),a3=lerp(p2,p3,k2,k3);
 const b1=lerp(a1,a2,k0,k2),b2=lerp(a2,a3,k1,k3);
 return lerp(b1,b2,k1,k2);
}
function strand(points,role,variant,id,{age=0,activity=0,tension=0,alpha=1}={}){
 const samples=role==='sediment'?20:role==='pulse'?48:role==='core'?92:112;
 const h=stableHash(id),phase=(h%997)/997*Math.PI*2;
 const strandCount=role==='fiber'?(variant==='B'?2:1):role==='sediment'?(variant==='C'?2:1):1;
 const output=[];
 for(let strandIndex=0;strandIndex<strandCount;strandIndex++){
  const positions=[];
  const offset=(strandIndex-(strandCount-1)/2)*.007;
  for(let i=0;i<samples;i++){
   const t=i/(samples-1),p=curve(points,t);
   const direction=norm(sub(curve(points,Math.min(1,t+.002)),curve(points,Math.max(0,t-.002))));
   const axis=norm(cross(direction,[.12,1,.31])),lateral=norm(cross(direction,axis));
   const envelope=Math.sin(Math.PI*t);
   const spin=phase+t*(variant==='A'?7.2:variant==='B'?9.0:8.1)+strandIndex*2.2;
   const sway=role==='fiber'?.010:role==='core'?.012:role==='pulse'?.010:role==='sediment'?.0045:.005;
   // No endpoint displacement: the real source controls anchor the tissue ends.
   const bow=envelope*Math.sin(spin),counter=envelope*Math.sin(t*2*Math.PI+phase*.7);
   positions.push(add(p,add(mul(axis,envelope*offset+sway*.72*bow),mul(lateral,sway*.42*counter))));
  }
  const tangents=positions.map((p,i)=>norm(sub(positions[Math.min(samples-1,i+2)],positions[Math.max(0,i-2)])));
  output.push({id:`${id}:${strandIndex}`,sourceId:id,role,positions,tangents,age,activity,tension,alpha,
   phase,shape:role==='fiber'||role==='fossil'||role==='core'?'tube':'ribbon',width:role==='sediment'?.0058:role==='fiber'?.0074:role==='pulse'?.017:role==='core'?.014:.012});
 }
 return output;
}
function rawMaterial(n,variant){
 const p=n.displayPosition,h=stableHash(n.id),ang=(h%360)*Math.PI/180;
 const length=.041+(h%11)*.0034,axis=[Math.cos(ang),Math.sin(ang)*.68,Math.sin(ang)*.34];
 const v=[Math.sin(ang)*.016,Math.cos(ang)*.018,.013];
 const points=[add(p,mul(axis,-length)),add(p,add(mul(axis,-length*.52),v)),p,
  add(p,add(mul(axis,length*.54),mul(v,-.65))),add(p,mul(axis,length*1.05))];
 return strand(points,'sediment',variant,n.id,{age:Math.max(0,n.archivalAgeDays??0)/365,
  activity:n.activity,alpha:n.activeEver?.52:.22});
}
/** Exhibition chambers are pure Gaussian optical fields, never ribbon polygons.
 * The two existing halos remain as the primary diffuse body.
 */
function chamber(p,variant,i){
 const amplitude=clamp(p.amplitude,0,1);
 return [disc(p.position,'pulse',`pulse:${i}:inner-breath`,{
  width:.060+.035*amplitude,alpha:.33*amplitude,activity:amplitude})];
}
function organ(p,variant,i){
 const c=p.position,r=.106;const points=[];
 for(let j=0;j<12;j++){
  const t=j/11,a=t*Math.PI*2.65;
  points.push([c[0]+r*Math.cos(a)*(1-t*.18),c[1]+r*Math.sin(a)*(1-t*.22),c[2]+(t-.5)*.16]);
 }
 return strand(points,'core',variant,`core:${i}`,{activity:1,alpha:.88});
}
export function deriveDensityMatrix(snapshot,variant='A',sigma=.56){
 const nodes=snapshot.nodes, output=[];
 for(const n of nodes){
  const near=nodes.filter(m=>m.id!==n.id&&Math.hypot(...n.displayPosition.map((v,i)=>v-m.displayPosition[i]))<sigma*.7);
  if(near.length<3)continue;
  const density=near.reduce((sum,m)=>{const d2=n.displayPosition.reduce((sum,v,i)=>sum+(v-m.displayPosition[i])**2,0);return sum+Math.exp(-d2/(2*sigma*sigma));},0);
  const h=stableHash(n.id),r=.06+Math.min(.098,density*.0086),c=n.displayPosition;
  const pts=Array.from({length:5},(_,i)=>{const t=i/4,a=(h%300)*.01+t*2.25;return [c[0]+r*Math.cos(a),c[1]+r*.72*Math.sin(a),c[2]+r*.28*Math.sin(a*1.5)];});
  output.push(...strand(pts,'sediment',variant,`matrix:${n.id}`,{age:0,alpha:Math.min(.18,.035+density*.0075)}));
 }
 return output;
}
export function mainDeclaredComponent(snapshot,navigation){
 const ids=new Set(snapshot.nodes.map(n=>n.id));
 if(!navigation?.metadataLinks||!ids.size)return [];
 const neighbors=new Map([...ids].map(id=>[id,new Set()]));
 for(const l of navigation.metadataLinks){
  if(!ids.has(l.from)||!ids.has(l.to)||l.from===l.to)continue;
  neighbors.get(l.from).add(l.to);neighbors.get(l.to).add(l.from);
 }
 const visited=new Set(),components=[];
 for(const id of ids){
  if(visited.has(id))continue;
  const group=[],stack=[id];visited.add(id);
  while(stack.length){const a=stack.pop();group.push(a);for(const b of neighbors.get(a))if(!visited.has(b)){visited.add(b);stack.push(b);}}
  components.push(group.sort());
 }
 return components.sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]))[0]||[];
}
function disc(position,role,id,{width=.10,alpha=.1,age=0,activity=0}={}){
 return {id,sourceId:id,role,shape:'softDisc',positions:[[...position]],tangents:[[1,0,0]],width,alpha,age,activity,phase:(stableHash(id)%997)/997*Math.PI*2};
}
export function deriveExtracellularVeil(snapshot,navigation,{sigma=.56}={}){
 const main=new Set(mainDeclaredComponent(snapshot,navigation));
 if(main.size<10)return [];
 const positions=snapshot.nodes.filter(n=>main.has(n.id));
 const result=[];
 for(const n of positions){
  let density=0,neighbors=0;
  for(const m of positions){if(m.id===n.id)continue;
   const d2=n.displayPosition.reduce((sum,v,i)=>sum+(v-m.displayPosition[i])**2,0);
   if(d2<(.35*.35))neighbors++;
   if(d2<(sigma*.95)**2)density+=Math.exp(-d2/(2*(sigma*.48)**2));
  }
  if(neighbors<2)continue;
  const d=clamp(density/9,0,1),c=n.displayPosition;
  const radius=.114+.06*Math.sqrt(d),a=.105/Math.sqrt(Math.max(1,density/4));
  result.push(disc(c,'veil',`veil:${n.id}:shadow`,{width:radius*1.52,alpha:a*.58,age:.12}));
  result.push(disc(c,'veil',`veil:${n.id}:membrane`,{width:radius,alpha:a*.94,age:.76}));
 }
 return result;
}
export function deriveSedimentSoftFalloff(snapshot){
 return snapshot.nodes.filter(n=>!n.activeEver).map(n=>disc(n.displayPosition,'sediment',`deposit:${n.id}` ,{
  width:.036+(stableHash(n.id)%13)*.002,alpha:.11,age:Math.max(0,n.archivalAgeDays??0)/365}));
}
function derivePulseHalos(snapshot){
 const out=[];
 for(let i=0;i<snapshot.pulseChambers.length;i++){
  const p=snapshot.pulseChambers[i],a=clamp(p.amplitude,0,1),id=`pulse:${i}`;
  out.push(disc(p.position,'pulse',`${id}:haze`,{width:.20+a*.08,alpha:.20*a,activity:a}));
  out.push(disc(p.position,'pulse',`${id}:heart`,{width:.095+a*.03,alpha:.42*a,activity:a}));
 }
 return out;
}
export function deriveGeometry(snapshot,variant='A',navigation=null){
 validateRenderSnapshot(snapshot);if(!VARIANTS.includes(variant))throw Error('Unknown variant');
 const strands=[];
 for(const n of snapshot.nodes)strands.push(...rawMaterial(n,variant));
 strands.push(...deriveSedimentSoftFalloff(snapshot));
 strands.push(...deriveDensityMatrix(snapshot,variant));
 strands.push(...deriveExtracellularVeil(snapshot,navigation));
 for(const f of snapshot.fibers)strands.push(...strand(f.points,'fiber',variant,f.id,{age:f.lignification,activity:f.activity,tension:f.tension,alpha:.82}));
 for(const b of snapshot.branches)strands.push(...strand(b.points,'fiber',variant,b.id,{age:b.sedimentOf,alpha:.54}));
 for(const f of snapshot.fibers)for(let i=0;i<f.fossilLayers.length;i++)strands.push(...strand(f.fossilLayers[i].points,'fossil',variant,`${f.id}:fossil:${i}`,{age:1,alpha:.29}));
 strands.push(...derivePulseHalos(snapshot));
 for(let i=0;i<snapshot.pulseChambers.length;i++)strands.push(...chamber(snapshot.pulseChambers[i],variant,i));
 for(let i=0;i<snapshot.propulsionCores.length;i++)strands.push(...organ(snapshot.propulsionCores[i],variant,i));
 return {mode:'SIMULATED_SANDBOX',snapshotHash:snapshot.snapshotHash,variant,strands,
  sourceCounts:{nodes:snapshot.nodes.length,fibers:snapshot.fibers.length,
   pulseChambers:snapshot.pulseChambers.length,propulsionCores:snapshot.propulsionCores.length}};
}
export async function sha256Canonical(value){
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
 const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function verifyScene(scene,manifest){
 const pin=manifest.snapshots.find(s=>s.phase===scene.phase);
 if(!pin||pin.snapshotHash!==scene.snapshotHash||scene.provenance.baselineProjectionHash!==manifest.baselineProjectionHash)throw Error('Scene pin mismatch');
 const {snapshotHash,...body}=scene;
 if(await sha256Canonical(body)!==snapshotHash)throw Error('Snapshot SHA-256 verification failed');
 return true;
}
