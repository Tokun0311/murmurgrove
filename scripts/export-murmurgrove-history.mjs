/** Export small, observation-only history files without a Python build dependency. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'src/data/murmurgrove-history');
const target=path.join(root,'public/murmurgrove/history');
fs.mkdirSync(target,{recursive:true});
const whitelist=(record,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(record,k)).map(k=>[k,record[k]]));
const list=[];const valid=new Set();let latest=null;
for(const file of fs.readdirSync(source).filter(f=>f.endsWith('.json')).sort()){
  const original=JSON.parse(fs.readFileSync(path.join(source,file),'utf8'));
  latest=original;valid.add(file);
  const marks=(original.marks||[]).map(m=>whitelist(m,['key','section','strength','recency','related','x','y','seed','directionStrength','focus','activity']));
  const roots=(original.roots||[]).map(r=>whitelist(r,['from','to','weight','kind']));
  const output={schema:1,capturedAt:original.capturedAt||original.capturedOn||'',morphologyVersion:original.morphologyVersion||original.modelVersion||'legacy',motionSpeed:original.motionSpeed||null,relationDensity:original.relationDensity||0,marks,roots};
  fs.writeFileSync(path.join(target,file),JSON.stringify(output)+'\n');
  const changes=original.changes||{};
  list.push({id:file.slice(0,-5),url:'/murmurgrove/history/'+file,capturedAt:output.capturedAt,count:marks.length,morphologyVersion:output.morphologyVersion,motionSpeed:output.motionSpeed,changeCounts:Object.fromEntries(['new','edited','deleted'].map(k=>[k,(changes[k]||[]).length]))});
}
for(const file of fs.readdirSync(target))if(file.endsWith('.json')&&!valid.has(file))fs.rmSync(path.join(target,file));
const dirname=path.join(root,'public/murmurgrove');
fs.writeFileSync(path.join(dirname,'history-index.json'),JSON.stringify({schema:1,snapshots:list})+'\n');
if(latest){
  const marks=latest.marks.map(m=>whitelist(m,['key','section','x','y','seed','strength','related','directionStrength','focus','activity']));
  const roots=latest.roots||[];
  const fingerprint=marks.reduce((a,m)=>a+Math.round(m.strength*7+m.related*2+m.seed*23),0);
  fs.writeFileSync(path.join(dirname,'current-graph.json'),JSON.stringify({version:`${marks.length}:${roots.length}:${fingerprint}`,marks,roots})+'\n');
}
console.log(`Exported ${list.length} morphology-only history snapshots`);
