/** Camera input geometry only. Never modifies archive records or real relations. */
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
/** Input steps are bounded for mouse wheels, trackpads and pinch-to-zoom devices. */
export function wheelFactor(deltaY,deltaMode=0,ctrlKey=false){
  const pixels=clamp(deltaY*(deltaMode===1?16:deltaMode===2?640:1),-220,220);
  return Math.exp(-pixels*(ctrlKey?.00165:.0017));
}
export function easeAmount(dtMs,tau=110){return 1-Math.exp(-clamp(dtMs,0,60)/tau);}
export function momentumStep(value,velocity,dtMs,tau=175){
 const dt=clamp(dtMs,0,64),decay=Math.exp(-dt/tau);
 const next=value+velocity*tau*(1-decay);
 return {value:next,velocity:velocity*decay};
}
export function gestureKind(zoom,{shift=false,button=0,pointerType='mouse'}={}){
 if(pointerType==='touch')return 'pan';
 if(shift||button===2)return 'rotate';
 return zoom>1?'pan':'rotate';
}
export function pinchState(points){
 if(points.length<2)return null;
 const [a,b]=points;return {mid:[(a[0]+b[0])/2,(a[1]+b[1])/2],distance:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1]))};
}
export function boundedVelocity(delta,dtMs,max=1.25){return clamp(delta/Math.max(dtMs,8),-max,max);}

/** Disambiguate literal two-touch intentions rather than treating every two-finger
 * gesture as pinch. start/current are stable pointer-ID ordered pairs.
 * - BOTH fingers moving in opposite radial directions => scale.
 * - ONE held nearly still and its partner moving => orbit.
 * - BOTH moving together => translate the focus.
 * A short undecided window avoids misclassifying the first half of a pinch
 * while the other finger's corresponding event has not yet arrived.
 */
export function classifyTouchPair(start,current,{elapsedMs=0,lock=null}={}) {
 if(lock && lock!=='undecided') return lock;
 if(!Array.isArray(start)||!Array.isArray(current)||start.length!==2||current.length!==2)return 'undecided';
 const dx0=current[0][0]-start[0][0],dy0=current[0][1]-start[0][1];
 const dx1=current[1][0]-start[1][0],dy1=current[1][1]-start[1][1];
 const d0=Math.hypot(dx0,dy0),d1=Math.hypot(dx1,dy1);
 const midpoint=[(start[0][0]+start[1][0])/2,(start[0][1]+start[1][1])/2];
 const radial=(i,dx,dy)=>{
  const rx=start[i][0]-midpoint[0],ry=start[i][1]-midpoint[1];
  return (dx*rx+dy*ry)/Math.max(1,Math.hypot(rx,ry));
 };
 const ra=radial(0,dx0,dy0),rb=radial(1,dx1,dy1);
 const initialDist=Math.hypot(start[0][0]-start[1][0],start[0][1]-start[1][1]);
 const currentDist=Math.hypot(current[0][0]-current[1][0],current[0][1]-current[1][1]);
 const distanceChange=currentDist-initialDist;
 if(d0>=3.2&&d1>=3.2&&Math.abs(distanceChange)>=6&&
    ((ra>=2.5&&rb>=2.5&&distanceChange>0)||(ra<=-2.5&&rb<=-2.5&&distanceChange<0)))return 'pinch';
 if(elapsedMs>=65&&Math.max(d0,d1)>=9&&Math.min(d0,d1)<=3.2)return 'orbit';
 // Parallel paired motion is translated without zooming or rotating.
 const dot=dx0*dx1+dy0*dy1;
 if(d0>=5&&d1>=5&&dot/(d0*d1)>.75)return 'pan';
 return 'undecided';
}
