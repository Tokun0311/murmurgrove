/**
 * Emergency morphology-history redaction, e.g. after accidental publication.
 * This edits the working tree only. It does NOT erase prior Git commits,
 * external backups, caches, or already deployed CDN objects.
 */
import fs from 'node:fs';
import path from 'node:path';
const arg=process.argv.find(a=>a.startsWith('--record='));
const record=arg?.slice('--record='.length);
if(!record||!['exhibitions','institutions','people','concepts'].some(s=>record.startsWith(s+':'))||!process.argv.includes('--confirm')){
 console.error('Usage: node scripts/redact-murmurgrove-history.mjs --record=people:stable-id --confirm');
 process.exit(2);
}
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'src/data/murmurgrove-history');
let changed=0;
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){
 const p=path.join(dir,file),data=JSON.parse(fs.readFileSync(p,'utf8'));
 const before=data.marks?.length||0;
 data.marks=(data.marks||[]).filter(m=>`${m.section}:${m.key}`!==record);
 data.roots=(data.roots||[]).filter(r=>r.from!==record&&r.to!==record);
 if(data.contentRevisions)delete data.contentRevisions[record];
 if(data.changes){for(const key of ['new','edited','deleted'])if(Array.isArray(data.changes[key]))data.changes[key]=data.changes[key].filter(k=>k!==record)}
 if(data.marks.length!==before){
  changed++;data.redacted=true;
  fs.writeFileSync(p,JSON.stringify(data)+'\n');
 }
}
console.log(`Redacted ${record} in ${changed} local historical snapshots.`);
console.log('NEXT: run npm build; redeploy; invalidate CDN; review and purge Git history/backups separately if legally required.');
