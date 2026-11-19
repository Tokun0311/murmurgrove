/**
 * Murmurgrove shared state service (separate deployment).
 * One Durable Object per archive, not per visitor. No archived article data.
 * This is a bounded, fixed-step simulation: long hibernation intervals are
 * advanced with an approximate macro relaxation, not a fictitious full replay.
 */
const keyFor = (m) => `${m.section}:${m.key}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=(s)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967295};
function initialPosition(m){
  const depth=hash('depth:'+m.section+':'+m.key)*2-1;
  const radial=.65+.35*hash('radial:'+m.key);
  return [(m.x-.5)*3*radial,(m.y-.5)*1.85*radial,depth*.90];
}
function makeOrgan(m,old){
  return {id:keyFor(m),type:m.section,p:old?.p||initialPosition(m),v:old?.v||[0,0,0],
    anchor:initialPosition(m),activity:old?.activity??.15};
}
function simulate(state,steps=1,dt=.08){
  if(!state.organs.length)return;
  const organs=state.organs,lookup=new Map(organs.map((o,i)=>[o.id,i]));
  const e=state.roots;
  const inertia={institutions:.26,exhibitions:.66,people:.78,concepts:.48};
  const gridSize=.29;
  for(let tick=0;tick<steps;tick++){
    const forces=organs.map(()=>[0,0,0]);
    // Elastic connections only when the current content graph contains a link.
    for(const root of e){
      const a=lookup.get(root.from),b=lookup.get(root.to);
      if(a===undefined||b===undefined||a===b)continue;
      const one=organs[a],two=organs[b];
      const dx=two.p[0]-one.p[0],dy=two.p[1]-one.p[1],dz=two.p[2]-one.p[2];
      const dist=Math.max(.001,Math.hypot(dx,dy,dz));
      const desired=root.kind==='shared'?.40:.53;
      const pull=clamp((dist-desired)*(.18+.035*Math.log1p(root.weight||1)),-.24,.24);
      for(let d=0;d<3;d++){
        const delta=[dx,dy,dz][d]/dist*pull;
        forces[a][d]+=delta;forces[b][d]-=delta;
      }
    }
    // Local separation via spatial hash; does not use O(N²) all-pairs search.
    const buckets=new Map();
    const cells=organs.map(o=>o.p.map(x=>Math.floor(x/gridSize)));
    cells.forEach((c,i)=>{const k=c.join('/');const arr=buckets.get(k)||[];arr.push(i);buckets.set(k,arr)});
    for(let i=0;i<organs.length;i++){
      const c=cells[i];
      for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
        for(const j of buckets.get(`${c[0]+x}/${c[1]+y}/${c[2]+z}`)||[]){
          if(j<=i)continue;
          const dx=organs[i].p[0]-organs[j].p[0],dy=organs[i].p[1]-organs[j].p[1],dz=organs[i].p[2]-organs[j].p[2];
          const ds=dx*dx+dy*dy+dz*dz+.0002;
          if(ds>.09)continue;
          const mag=clamp(.018/ds,0,.32);
          for(let d=0;d<3;d++){let f=[dx,dy,dz][d]*mag;forces[i][d]+=f;forces[j][d]-=f}
        }
      }
    }
    for(let i=0;i<organs.length;i++){
      const o=organs[i],response=inertia[o.type]??.5;
      for(let d=0;d<3;d++){
        const restoring=(o.anchor[d]-o.p[d])*(o.type==='institutions'?.085:.016);
        o.v[d]=clamp(o.v[d]*.981+(forces[i][d]+restoring)*dt*response,-.22,.22);
        o.p[d]=clamp(o.p[d]+o.v[d]*dt,d===0?-1.5:d===1?-.99:-1.2,d===0?1.5:d===1?.99:1.2);
      }
      o.activity=o.activity*.985+Math.hypot(...o.v)*.015;
    }
    state.tick++;
  }
}
function json(value,status=200,origin='*'){
  return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
}
export class MurmurgroveState {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async fetch(req){
    const path=new URL(req.url).pathname;
    if(path==='/state'){
      let state=await this.ctx.storage.get('body');
      if(!state)return json({ready:false,serverTime:Date.now()},200,this.env.ALLOWED_ORIGIN);
      const now=Date.now(),elapsed=Math.max(0,now-state.updatedAt);
      // Bounded catch-up limits CPU work after long sleep. The skipped interval
      // is recorded: approximate restoration is NEVER called exact frame replay.
      const steps=Math.min(48,Math.floor(elapsed/80));
      if(steps){simulate(state,steps,.08);state.updatedAt=now;await this.ctx.storage.put('body',state);}
      return json({ready:true,version:state.version,tick:state.tick,serverTime:now,
        approximateCatchup:elapsed>3840,
        organs:state.organs.map(o=>({id:o.id,p:o.p,v:o.v,activity:o.activity}))},200,this.env.ALLOWED_ORIGIN);
    }
    if(path==='/ingest'&&req.method==='POST'){
      const payload=await req.json().catch(()=>null);
      if(!payload||!Array.isArray(payload.marks)||!Array.isArray(payload.roots)||payload.marks.length>20000||payload.roots.length>160000)
        return json({error:'Invalid graph'},400,this.env.ALLOWED_ORIGIN);
      const now=Date.now(),old=await this.ctx.storage.get('body');
      if(old?.version===payload.version)return json({changed:false,version:old.version},200,this.env.ALLOWED_ORIGIN);
      const oldOrgans=new Map((old?.organs||[]).map(o=>[o.id,o]));
      const valid=new Set(['exhibitions','institutions','people','concepts']);
      const marks=payload.marks.filter(m=>valid.has(m.section)&&typeof m.key==='string'&&Number.isFinite(m.x)&&Number.isFinite(m.y));
      const organs=marks.map(m=>makeOrgan(m,oldOrgans.get(keyFor(m))));
      const ids=new Set(organs.map(o=>o.id));
      const roots=payload.roots.filter(r=>ids.has(r.from)&&ids.has(r.to)&&r.from!==r.to).map(r=>({from:r.from,to:r.to,weight:clamp(Number(r.weight)||1,.1,10),kind:r.kind==='shared'?'shared':'direct'}));
      const state={version:String(payload.version||'unversioned').slice(0,96),organs,roots,tick:old?.tick||0,updatedAt:now};
      await this.ctx.storage.put('body',state);
      return json({changed:true,version:state.version,organs:organs.length,roots:roots.length},200,this.env.ALLOWED_ORIGIN);
    }
    return json({error:'Not found'},404,this.env.ALLOWED_ORIGIN);
  }
}
export default {
  async fetch(req,env){
    const url=new URL(req.url),origin=req.headers.get('Origin');
    const allowed=env.ALLOWED_ORIGIN||'https://tow-archive.pages.dev';
    if(req.method==='OPTIONS')return new Response(null,{headers:{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'}});
    if(origin&&origin!==allowed)return json({error:'Origin not allowed'},403,allowed);
    if(url.pathname==='/health')return json({ok:true},200,allowed);
    if(url.pathname==='/ingest'&&(!env.INGEST_SECRET||req.headers.get('Authorization')!==`Bearer ${env.INGEST_SECRET}`))
      return json({error:'Unauthorized'},401,allowed);
    if(!['/state','/ingest'].includes(url.pathname))return json({error:'Not found'},404,allowed);
    const id=env.GROVE.idFromName('tow-archive-murmurgrove-one-body');
    const stub=env.GROVE.get(id);
    return stub.fetch(req);
  }
};
