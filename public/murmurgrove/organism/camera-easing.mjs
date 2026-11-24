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
 if(shift||button===2)return 'rotate';
 return zoom>1?'pan':'rotate';
}
export function pinchState(points){
 if(points.length<2)return null;
 const [a,b]=points;return {mid:[(a[0]+b[0])/2,(a[1]+b[1])/2],distance:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1]))};
}
export function boundedVelocity(delta,dtMs,max=1.25){return clamp(delta/Math.max(dtMs,8),-max,max);}
