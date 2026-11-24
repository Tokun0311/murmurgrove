/** Phase 2.4: render-only organic geometry. Source control points and snapshot bytes are immutable.
 * Fiber/fossil paths use continuous parallel-transport swept tubes with end tapering.
 * Optical deposits use camera-facing quads with an analytic radial Gaussian fragment mask.
 * No GL_LINES and no physical/semantic links are inferred by these triangles.
 */
export const ROLE=Object.freeze({sediment:0,fiber:1,fossil:2,pulse:3,core:4,veil:5});
export const SHAPE=Object.freeze({ribbon:0,tube:1,softDisc:2});
// position3 tangent3 normal3 side width alpha age activity role arc phase shape
export const STRIDE_FLOATS=18;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return l>1e-12?a.map(x=>x/l):[1,0,0];};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a||1)));return t*t*(3-2*t);};
function tubeFrames(strand){
 const ts=strand.tangents.map(norm),frames=[];
 let ref=Math.abs(dot(ts[0],[0,1,0]))<.90?[0,1,0]:[1,0,0];
 let n=norm(sub(ref,scale(ts[0],dot(ref,ts[0]))));
 for(const t of ts){
  const p=sub(n,scale(t,dot(n,t)));n=Math.hypot(...p)>1e-7?norm(p):norm(cross(t,[0,0,1]));
  const b=norm(cross(t,n));frames.push({n,b});
 }
 return frames;
}
function emit(out,p,t,n,side,s,arc,shape){
 out.push(...p,...t,...n,side,s.width??.006,s.alpha??1,s.age??0,s.activity??0,
  ROLE[s.role]??0,arc,s.phase??0,shape);
}
function taperAt(t){
 const enter=smoothstep(0,.16,t),leave=1-smoothstep(.80,1,t);
 return Math.max(.02,Math.pow(enter*leave,.72));
}
/** Builds one organic tube surface from an entire sampled spline.
 * Adjacent rings share identical 3D positions and taper toward both ends.
 */
export function sweptTubeVertices(strand,{radialSegments=8}={}){
 const out=[],m=strand.positions.length;if(m<2)return new Float32Array(0);
 const frames=tubeFrames(strand),baseRadius=Math.max(.00035,(strand.width??.006)*.62);
 const ring=(i,j)=>{
  const along=i/(m-1),taper=taperAt(along),angle=2*Math.PI*(j%radialSegments)/radialSegments,fr=frames[i];
  const normal=add(scale(fr.n,Math.cos(angle)),scale(fr.b,Math.sin(angle)));
  const radius=baseRadius*(.14+.86*taper);
  const alpha=(strand.alpha??1)*(.36+.64*taper);
  emit(out,add(strand.positions[i],scale(normal,radius)),strand.tangents[i],normal,Math.cos(angle),{...strand,width:(strand.width??.006)*(.22+.78*taper),alpha},along,SHAPE.tube);
 };
 for(let i=0;i<m-1;i++)for(let j=0;j<radialSegments;j++){
  ring(i,j);ring(i,j+1);ring(i+1,j);
  ring(i,j+1);ring(i+1,j+1);ring(i+1,j);
 }
 return Float32Array.from(out);
}
function softDiscVertices(strand){
 const out=[],p=strand.positions[0],tan=[1,0,0],n=[0,0,1];
 for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])emit(out,p,tan,n,x,strand,y,SHAPE.softDisc);
 return Float32Array.from(out);
}
function stripVertices(strand){
 const out=[],m=strand.positions.length;
 const vertex=(i,side)=>{const t=i/(m-1),fade=.24+.76*taperAt(t);emit(out,strand.positions[i],strand.tangents[i],[0,0,1],side,{...strand,alpha:(strand.alpha??1)*fade,width:(strand.width??.006)*(.28+.72*fade)},t,SHAPE.ribbon);};
 for(let i=0;i<m-1;i++){
  vertex(i,-1);vertex(i,1);vertex(i+1,-1);
  vertex(i+1,-1);vertex(i,1);vertex(i+1,1);
 }
 return Float32Array.from(out);
}
export function ribbonVertices(strand){
 if(strand.shape==='softDisc')return softDiscVertices(strand);
 if(strand.shape==='tube'||strand.role==='fiber'||strand.role==='fossil')return sweptTubeVertices(strand);
 return stripVertices(strand);
}
export function renderBatches(geometry,{sedimentSlabs=12}={}){
 const sediment=geometry.strands.filter(s=>s.role==='sediment'||s.role==='veil');
 const active=geometry.strands.filter(s=>s.role!=='sediment'&&s.role!=='veil');
 const mid=s=>s.positions[Math.floor(s.positions.length/2)];
 const sorted=[...sediment].sort((a,b)=>mid(a)[2]-mid(b)[2]);
 const batches=[];
 for(let i=0;i<sedimentSlabs;i++){
  const group=sorted.slice(Math.floor(i*sorted.length/sedimentSlabs),Math.floor((i+1)*sorted.length/sedimentSlabs));
  if(group.length)batches.push({role:'optical-slab',strands:group});
 }
 for(const strand of active)batches.push({role:strand.role,strands:[strand]});
 return batches.map(batch=>{
  const chunks=batch.strands.map(ribbonVertices),size=chunks.reduce((n,a)=>n+a.length,0),vertices=new Float32Array(size);
  let offset=0;for(const chunk of chunks){vertices.set(chunk,offset);offset+=chunk.length;}
  const centers=batch.strands.map(mid),center=[0,1,2].map(k=>centers.reduce((sum,c)=>sum+c[k],0)/centers.length);
  return {...batch,center,vertices};
 });
}
