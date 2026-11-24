import {mainDeclaredComponent} from './adapter.mjs';
export const CATEGORY_ROLE=Object.freeze({exhibition:'Pulse tissue / 展览脉冲组织',concept:'Direction field / 概念方向基质',person:'Relational node / 人物传导节点',institution:'Resonance node / 机构共振节点',writing:'Tensile tissue / 写作张力组织'});
export function contextFor(item,nav,scene){
 if(!item)return null;
 if(item.kind==='record'){
  const r=nav.records.find(x=>x.id===item.id);if(!r)return null;
  return {category:r.kind,role:CATEGORY_ROLE[r.kind]||'Archive material / 档案材料',status:r.quarantined?'待核实记录':'档案记录（不代表已激活生命事件）',sourceId:r.id};
 }
 if(item.kind==='metadata')return {category:'metadata relation',role:'Latent trace / 潜伏关联',status:'未激活元数据关联',sourceId:item.id};
 if(item.kind==='fiber')return {category:'life fiber',role:'Tensile tissue / 张力组织',status:'已激活生命纤维 · SIMULATED_SANDBOX',sourceId:item.id};
 return {category:item.kind,role:item.kind==='pulse'?'Transient pulse chamber / 瞬时脉冲腔体':'Sustained propulsion core / 持续推进核',status:'SIMULATED_SANDBOX',sourceId:item.id};
}
export function selectionSourceIds(item,scene){if(!item)return [];
 if(item.kind==='record')return [item.id];
 if(item.kind==='fiber')return [item.id];
 if(item.kind==='metadata'){const ids=item.id.replace(/^metadata:/,'').split('|');return ids;}
 if(item.kind==='pulse'||item.kind==='core')return [item.id];return [];
}
export function normalizeAzimuthDegrees(radians){return ((radians*180/Math.PI)%360+360)%360;}
export function locatorData(scene,camera,item,nav){
 const nodes=scene.nodes.filter(n=>!n.quarantined),pts=nodes.map(n=>({id:n.id,p:n.displayPosition}));
 const min=pts.reduce((a,n)=>a.map((v,i)=>Math.min(v,n.p[i])),[Infinity,Infinity,Infinity]);
 const max=pts.reduce((a,n)=>a.map((v,i)=>Math.max(v,n.p[i])),[-Infinity,-Infinity,-Infinity]);
 const c=min.map((v,i)=>(v+max[i])/2),extent=Math.max(...max.map((v,i)=>v-min[i]),.01);
 const ca=Math.cos(camera.azimuth),sa=Math.sin(camera.azimuth),ce=Math.cos(camera.elevation),se=Math.sin(camera.elevation);
 const project=p=>{const d=p.map((v,i)=>v-c[i]);const x=d[0]*ca-d[2]*sa;const z=d[0]*sa+d[2]*ca;const y=d[1]*ce-z*se;return [110+x/extent*155,69-y/extent*105];};
 const main=new Set(mainDeclaredComponent(scene,nav));
 const projected=pts.map(n=>({id:n.id,xy:project(n.p),main:main.has(n.id)}));
 let pos=null;
 if(item?.kind==='record')pos=pts.find(n=>n.id===item.id)?.p;
 else if(item?.kind==='fiber')pos=scene.fibers.find(f=>f.id===item.id)?.points?.[2];
 else if(item?.kind==='metadata'){const [a,b]=item.id.replace(/^metadata:/,'').split('|');const p1=pts.find(n=>n.id===a)?.p,p2=pts.find(n=>n.id===b)?.p;if(p1&&p2)pos=p1.map((v,i)=>(v+p2[i])/2);}
 else if(item?.kind==='pulse')pos=scene.pulseChambers[Number(item.id.split(':')[1])]?.position;
 else if(item?.kind==='core')pos=scene.propulsionCores[Number(item.id.split(':')[1])]?.position;
 const selected=pos?project(pos):null;
 const target=project(camera.target);
 return {points:projected,selected,target,zoom:camera.zoom,azimuth:camera.azimuth,azimuthDegrees:normalizeAzimuthDegrees(camera.azimuth),elevation:camera.elevation};
}
/** Density projection, not a decorative bounding ellipse. Camera rotation changes
 * the projected body and its local Gaussian density without changing any IDs. */
export function locatorSVG(data){
 const esc=n=>Number(n).toFixed(2),main=data.points.filter(n=>n.main);
 const density=main.map(p=>{
  const support=main.reduce((sum,q)=>{const d2=(p.xy[0]-q.xy[0])**2+(p.xy[1]-q.xy[1])**2;return sum+Math.exp(-d2/(2*12*12));},0);
  return `<circle cx="${esc(p.xy[0])}" cy="${esc(p.xy[1])}" r="${esc(7+Math.min(9,support*.67))}" fill="url(#locatorDensity)" opacity="${esc(Math.min(.6,.18+support*.024))}"/>`;
 }).join('');
 const dots=data.points.map(n=>`<circle cx="${esc(n.xy[0])}" cy="${esc(n.xy[1])}" r="${n.main?'1.25':'1.5'}" fill="${n.main?'#678a7e':'#a1a59d'}" opacity="${n.main?'.35':'.27'}"/>`).join('');
 const selected=data.selected?`<circle cx="${esc(data.selected[0])}" cy="${esc(data.selected[1])}" r="7" fill="none" stroke="#4e7d6e" stroke-width="1.5"/><circle cx="${esc(data.selected[0])}" cy="${esc(data.selected[1])}" r="2.5" fill="#4e7d6e"/>`:'';
 const az=((Math.round(data.azimuthDegrees??normalizeAzimuthDegrees(data.azimuth))%360)+360)%360;
 return `<svg id="locator" role="button" aria-label="整体身体定位图，点击返回100%全景" tabindex="0" viewBox="0 0 220 138" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="locatorDensity"><stop offset="0" stop-color="#7f9a8b" stop-opacity=".56"/><stop offset=".5" stop-color="#b7c3bb" stop-opacity=".18"/><stop offset="1" stop-color="#d8ddd7" stop-opacity="0"/></radialGradient></defs><g class="locator-density">${density}</g>${dots}${selected}<circle cx="${esc(data.target[0])}" cy="${esc(data.target[1])}" r="5" fill="none" stroke="#7a86a5" stroke-width="1.5"/><path d="M${esc(data.target[0]-4)} ${esc(data.target[1])}h8 M${esc(data.target[0])} ${esc(data.target[1]-4)}v8" stroke="#7a86a5" stroke-width=".8"/><text x="10" y="130" font-size="8" fill="#64776f">CAMERA ${Math.round(data.zoom*100)}% · AZ ${az}°</text></svg>`;
}
