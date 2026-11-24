/** Phase 2.6.5: display-only camera gesture helpers.
 * No archive node positions, topology, relationships or physiological states are modified.
 */
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/** At microscopic zoom, dragging the canvas moves the image, not the globe.
 * Shift + drag explicitly opts into rotation. At overview scale, drag rotates.
 */
export function viewDrag(start,position,{zoom,shift=false,rightButton=false}={}){
 const dx=position[0]-start.position[0],dy=position[1]-start.position[1];
 if(zoom>1&&!shift&&!rightButton){
  return {kind:'pan',pan:[start.pan[0]+dx,start.pan[1]+dy],angle:start.angle,elevation:start.elevation};
 }
 return {kind:'rotate',pan:[...start.pan],angle:start.angle+dx*.0042,
  elevation:clamp(start.elevation+dy*.0030,-1.2,1.2)};
}

/** Display-only soft limit of screen-space optical drift. At very high magnification,
 * the same small world displacement must not fling particles tens of screen pixels.
 * The motion direction, identity, original rest coordinate and time dependence remain intact.
 */
export function calmMagnifiedMotion(rest,moving,zoom){
 if(zoom<=2)return [...moving];
 const dx=moving[0]-rest[0],dy=moving[1]-rest[1],distance=Math.hypot(dx,dy);
 if(distance<1e-8)return [...moving];
 const maxPx=Math.max(9,22-(zoom-2)*.6);
 const gain=(maxPx*Math.tanh(distance/maxPx))/distance;
 return [rest[0]+dx*gain,rest[1]+dy*gain,moving[2]];
}
