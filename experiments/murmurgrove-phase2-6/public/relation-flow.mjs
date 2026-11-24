/** Phase 2.6.8: legible, directional read-only optical transport on verified links.
 * No random free-standing nodes, no topology mutation and no life activation.
 */
import {MOVEMENT_RATE} from './movement-pacing.mjs';
const frac=n=>((n%1)+1)%1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function cubicBezierAt(a,c1,c2,b,t){
 if(!Number.isFinite(t)||t<0||t>1)throw Error('Bezier parameter outside [0,1]');
 const s=1-t;
 return [0,1].map(k=>s*s*s*a[k]+3*s*s*t*c1[k]+3*s*t*t*c2[k]+t*t*t*b[k]);
}
export function flowSamplesForRelation(index,time,mode,recent=0){
 if(!Number.isInteger(index)||index<0||!Number.isFinite(time))throw Error('Invalid source relation or time');
 if(!['Whole','Growth','Movement'].includes(mode))throw Error('Unsupported viewing angle');
 const pulse=clamp(recent,0,1),count=mode==='Movement'?2:1;
 // Raw time enters this function; apply 10× exactly ONCE here.
 // ~1.05 s per verified curve, not the accidental 0.105 s of v2.6.7.
 const speed=mode==='Movement'?.095*MOVEMENT_RATE:mode==='Growth'?.014:.029;
 return Array.from({length:count},(_,j)=>{
  const t=frac(index*.61803398875+j*.5+time*speed);
  const soft=Math.pow(Math.sin(Math.PI*t),.8);
  const active=(mode==='Movement'&&pulse>.02);
  return {t,alpha:Number((soft*(active?.27+.15*pulse:mode==='Movement'?.31:mode==='Growth'?.085:.115)).toFixed(4)),
   radius:active?.88:mode==='Movement'?.75:.36,tail:mode==='Movement'?.105:0,pulse:active};
 });
}
