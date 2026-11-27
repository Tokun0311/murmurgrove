// Remove accidental invisible separators at name boundaries, not script-shaping joiners.
export function cleanPersonBoundary(value){
  return typeof value==='string'?value.replace(/^[\s\u200B\uFEFF]+|[\s\u200B\uFEFF]+$/gu,''):value;
}
export function peopleOrderKey(value){
  return cleanPersonBoundary(String(value??'')).normalize('NFKD').replace(/[\u200B\uFEFF\p{M}]/gu,'').trim();
}
export function peopleLetter(value){
  return peopleOrderKey(value).match(/^[a-z]/i)?.[0].toUpperCase()||'';
}
const collator=new Intl.Collator('en',{sensitivity:'base',numeric:true});
export function comparePeople(a,b){
  const aa=peopleOrderKey(a),bb=peopleOrderKey(b);
  // Numeric names first, then A–Z, then names without a Latin initial.
  const group=s=>/^\d/u.test(s)?0:peopleLetter(s)?1:2;
  return group(aa)-group(bb)||collator.compare(aa,bb);
}
