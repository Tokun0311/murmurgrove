/** Phase 2.6.1: pure screen-space render and camera helpers.
 * Bézier curves are only generated for source-backed links in the caller.
 * No node positions, archive records, or semantic relationships are created here.
 */
const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
const norm2=(a,b,fallback)=>{const magnitude=Math.hypot(a,b);return magnitude>1e-6?[a/magnitude,b/magnitude]:fallback;};

/** Optical cubic derived from two real endpoints and their local direction fields.
 * It retains exact endpoints, creates a modest downward catenary-like droop,
 * and gently braids the three optical passes of the SAME relation.
 */
export function mangroveControls(a,b,fieldA,fieldB,pass=1,mode='Whole',time=0){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 if(length<.001)return [[...a],[...b]];
 const e=[dx/length,dy/length],n=[-e[1],e[0]];
 const align=v=>{
  let [x,y]=norm2(v?.[0]??0,v?.[1]??0,e);
  if(x*e[0]+y*e[1]<0){x=-x;y=-y;}
  // Geometry has a forward component even when a local field is orthogonal.
  return norm2(e[0]*.47+x*.53,e[1]*.47+y*.53,e);
 };
 const ta=align(fieldA),tb=align(fieldB);
 // Downward sag is only optical; length-scaled so short links never loop.
 const droop=Math.min(54,length*.205)*(.34+.66*Math.abs(e[0]));
 const fieldShear=clamp((ta[0]*tb[1]-ta[1]*tb[0])*length*.09,-24,24);
 const braid=(pass-1)*Math.min(3.4,length*.032);
 const motion=mode==='Movement'?Math.sin(time*.44+length*.029)*Math.min(1.15,length*.012):0;
 const sideways=fieldShear+braid+motion;
 const reach=length*.31;
 const c1=[a[0]+ta[0]*reach+n[0]*sideways*.74,
           a[1]+ta[1]*reach+droop+n[1]*sideways*.74];
 const c2=[b[0]-tb[0]*reach+n[0]*sideways*.84,
           b[1]-tb[1]*reach+droop+n[1]*sideways*.84];
 return [c1,c2];
}

/** The point currently under the cursor remains stationary after zoom.
 * Screen coordinates are C + pan + scaled(projected - bodyCenter).
 * Valid even when the caller clamps the requested zoom.
 */
export function panForCursorZoom(pan,oldZoom,newZoom,cursor,viewportCenter){
 if(!(oldZoom>0&&newZoom>0))throw Error('Zoom levels must be positive');
 const r=newZoom/oldZoom;
 return [0,1].map(i=>r*pan[i]+(1-r)*(cursor[i]-viewportCenter[i]));
}

/** Time-based easing toward a centered full-body view; independent of FPS. */
export function easePanHome(pan,dtMs,settleMs=240){
 const multiplier=Math.exp(-Math.max(0,dtMs)/settleMs);
 return pan.map(v=>Math.abs(v*multiplier)<.04?0:v*multiplier);
}
