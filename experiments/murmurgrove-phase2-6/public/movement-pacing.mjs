/** Phase 2.6.9 · 6× display-only Movement transport, preserving 4.5× breathing.
 * Accelerates optical time, NOT the event log, occurrence dates, physiological age,
 * relation topology, or the 13-day observation kernel.  Stable review presets.
 */
export const MOVEMENT_RATE=6;
export const BREATH_RATE=4.5;
export const opticalTime=(seconds,mode)=>mode==='Movement'?seconds*MOVEMENT_RATE:seconds;
export const breathingTime=(seconds,mode)=>mode==='Movement'?seconds*BREATH_RATE:seconds;
/** At 65–100% zoom, 3D microscopic drift often projects to less than a pixel.
 * Boost ONLY its display-space displacement relative to the original reference
 * point, capped at 2.4 CSS pixels to avoid false-looking jumps. Pure function.
 */
export function visibleOverviewMotion(rest,moving,zoom,mode){
 if(mode!=='Movement'||zoom>1)return [...moving];
 const dx=moving[0]-rest[0],dy=moving[1]-rest[1],distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||distance<1e-9)return [...moving];
 const gain=Math.min(1.9+(1-Math.max(.65,zoom))*.8,2.4/distance);
 return [rest[0]+dx*gain,rest[1]+dy*gain,moving[2]];
}
