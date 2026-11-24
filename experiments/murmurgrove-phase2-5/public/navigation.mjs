/** Read-only navigation. Screen-space invisible hit proxies; no geometry mutation. */
import {sha256Canonical} from './adapter.mjs';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export function projectPoint(pos,camera,width,height){
 const c=camera,dist=3.5/c.zoom,ce=Math.cos(c.elevation),se=Math.sin(c.elevation),ca=Math.cos(c.azimuth),sa=Math.sin(c.azimuth);
 const eye=[c.target[0]+sa*ce*dist,c.target[1]+se*dist,c.target[2]+ca*ce*dist];
 const forward=sub(c.target,eye),fn=Math.hypot(...forward),f=forward.map(v=>v/fn);
 const right=[ca,0,-sa],up=[-sa*se,ce,-ca*se];const d=sub(pos,eye),depth=dot(d,f);
 if(depth<=.01)return null;
 const scale=Math.tan(Math.PI/6)*depth;
 return {x:(dot(d,right)/(scale*width/height)+1)*width/2,y:(1-dot(d,up)/scale)*height/2,depth};
}
export function pickProxy(scene,nav,camera,width,height,x,y){
 const options=[];const add=(id,pos,kind,radius)=>{const p=projectPoint(pos,camera,width,height);if(!p)return;const d=Math.hypot(x-p.x,y-p.y);if(d<=radius)options.push({id,kind,d,depth:p.depth,score:d/radius+p.depth*.025});};
 for(const n of scene.nodes)add(n.id,n.displayPosition,'record',n.kind==='concept'?24:17);
 scene.pulseChambers.forEach((p,i)=>add(`pulse:${i}`,p.position,'pulse',24));
 scene.propulsionCores.forEach((p,i)=>add(`core:${i}`,p.position,'core',27));
 // Latent links are pickable even when no mechanical fiber exists.
 const nodeById=new Map(scene.nodes.map(n=>[n.id,n]));
 for(const l of nav.metadataLinks){const a=nodeById.get(l.from)?.displayPosition,b=nodeById.get(l.to)?.displayPosition;if(!a||!b)continue;
  const pa=projectPoint(a,camera,width,height),pb=projectPoint(b,camera,width,height);if(!pa||!pb)continue;
  const vx=pb.x-pa.x,vy=pb.y-pa.y,den=vx*vx+vy*vy;if(den<1e-4)continue;
  const t=Math.max(.08,Math.min(.92,((x-pa.x)*vx+(y-pa.y)*vy)/den));
  const d=Math.hypot(x-(pa.x+vx*t),y-(pa.y+vy*t));if(d<=9)options.push({id:`metadata:${l.from}|${l.to}`,kind:'metadata',d,depth:(pa.depth+pb.depth)/2,score:d/9+.15});
 }
 for(const f of scene.fibers){for(let i=0;i<f.points.length-1;i++){
  const a=projectPoint(f.points[i],camera,width,height),b=projectPoint(f.points[i+1],camera,width,height);if(!a||!b)continue;
  const vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;if(den<1e-4)continue;
  const t=Math.max(0,Math.min(1,((x-a.x)*vx+(y-a.y)*vy)/den));const d=Math.hypot(x-a.x-vx*t,y-a.y-vy*t);
  if(d<=11)options.push({id:f.id,kind:'fiber',d,depth:(a.depth+b.depth)/2,score:d/11+.08});
 }}
 options.sort((a,b)=>a.score-b.score||a.depth-b.depth);return options[0]||null;
}
export async function verifyNavigation(nav,manifest){
 if(nav.schema!=='murmurgrove.navigation.2.1.v1'||nav.mode!=='SIMULATED_SANDBOX'||nav.baselineProjectionHash!==manifest.baselineProjectionHash)throw Error('Navigation provenance mismatch');
 const {navigationHash,...body}=nav;if(await sha256Canonical(body)!==navigationHash)throw Error('Navigation hash mismatch');
 if(nav.records.length!==181||new Set(nav.records.map(r=>r.id)).size!==181)throw Error('Navigation record count mismatch');
 if(nav.metadataLinks.length!==172)throw Error('Navigation metadata count mismatch');
 const ids=new Set(nav.records.map(r=>r.id));for(const l of nav.metadataLinks)if(!ids.has(l.from)||!ids.has(l.to)||l.activated)throw Error('Untrusted metadata relation');
 return true;
}
export function relatedRecords(nav,id){return nav.metadataLinks.filter(l=>l.from===id||l.to===id).map(l=>({...l,other:l.from===id?l.to:l.from}));}
export const MEMORY_KEY='murmurgrove.phase2.navigation.v1';
export function restoreMemory(raw){try{const v=JSON.parse(raw);if(v.schema!==MEMORY_KEY||!['A','B','C'].includes(v.variant)||![0,1,2].includes(v.phase)||!Array.isArray(v.camera?.target)||v.camera.target.length!==3)return null;
 const c=v.camera;if(![c.azimuth,c.elevation,c.zoom,...c.target].every(Number.isFinite)||c.zoom<1||c.zoom>10)return null;return v;}catch{return null;}}
