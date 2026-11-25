/** Verified current source-layer optic. NOT a lived historical morphology, NOT a T0 edit.
 * Draws ONLY evidence-derived links between already positioned historical baseline nodes,
 * and bounded optical response on old positioned nodes influenced by newly published sources.
 * Newly added records without certified T0 positions remain in the research index, not invented coordinates.
 */
const main=document.getElementById('stage');
if(main){
 const canvas=document.createElement('canvas');canvas.id='research-current-optics';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});
 document.body.append(canvas);const ctx=canvas.getContext('2d');let source=null,lastWidth=0,lastHeight=0;
 async function refresh(){try{const res=await fetch('./data/research-current.json',{cache:'no-store'});if(!res.ok)return;const json=await res.json();
  if(json.schema!=='murmurgrove.read-only-research-optics.1'||json.mode!=='DERIVED_CURRENT_SOURCE_READING'||!Array.isArray(json.links)||!json.activity)return;
  source=json;}catch{source=null}}
 refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 function draw(){requestAnimationFrame(draw);const real=window.__MURMUR_REAL__;if(!source||!real||real.sourceReading||document.hidden){ctx.clearRect(0,0,canvas.width,canvas.height);return}
  const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
  if(w!==lastWidth||h!==lastHeight){lastWidth=w;lastHeight=h;canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const toBaselineKey=k=>k.replace(/^exhibitions:/,'exhibition:').replace(/^people:/,'person:').replace(/^institutions:/,'institution:').replace(/^concepts:/,'concept:');
  const p=new Map((real.screenNodes||[]).map(n=>[n[0],[n[1],n[2]]]));if(!p.size)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phase=reduced?0:performance.now()/11000;
  // This is a modest interpretive *reading lens*, not an extra historical fiber.
  for(const edge of source.links.slice(0,450)){
   if(edge.kind==='recorded-link')continue;const a=p.get(toBaselineKey(edge.source)),b=p.get(toBaselineKey(edge.target));if(!a||!b)continue;
   ctx.beginPath();ctx.moveTo(a[0],a[1]);const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
   ctx.quadraticCurveTo(mx+9*Math.sin(phase),my-9*Math.cos(phase),b[0],b[1]);
   ctx.lineWidth=.43;ctx.strokeStyle='rgba(20,113,73,.12)';ctx.stroke();
  }
  for(const [id,count] of Object.entries(source.activity).slice(0,1400)){
   const pt=p.get(toBaselineKey(id));if(!pt||count<1)continue;const size=Math.min(17,4+Math.log1p(count)*3.1);
   const alpha=.014+Math.min(.042,count*.004)*(reduced?1:(.9+.1*Math.sin(phase+pt[0]*.001)));
   const grad=ctx.createRadialGradient(pt[0],pt[1],0,pt[0],pt[1],size*2.2);grad.addColorStop(0,`rgba(0,136,78,${alpha})`);grad.addColorStop(1,'rgba(0,136,78,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(pt[0],pt[1],size*2.2,0,Math.PI*2);ctx.fill();
  }
 }
 requestAnimationFrame(draw);
}
