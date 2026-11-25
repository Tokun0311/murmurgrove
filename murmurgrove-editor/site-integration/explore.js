const q=document.getElementById('research-query'),out=document.getElementById('research-records'),count=document.getElementById('research-total');
const create=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
let data=null;
try{const res=await fetch('/murmurgrove/research/current.json',{cache:'no-store'});if(!res.ok)throw Error('No source index published yet');data=await res.json();}catch(e){count.textContent='Research index not available: '+e.message;}
function draw(){if(!data)return;const query=q.value.normalize('NFKC').toLowerCase().trim();const parts=query.split(/\s+/).filter(Boolean);
 const match=r=>parts.every(t=>(r.title+' '+r.summary+' '+r.type).normalize('NFKC').toLowerCase().includes(t));
 const records=data.records.filter(match).slice(0,80);out.replaceChildren();count.textContent=`${records.length} visible of ${data.records.length} published records · ${data.relations.length} source-backed relationships`;
 for(const r of records){const section=create('section','');section.style.cssText='padding:18px 0;border-bottom:1px solid #d9e7dc';const a=create('a',r.title);a.href=r.path;a.style.cssText='font-size:16px;color:#16704b;text-decoration:none';section.append(a);const meta=create('p',r.type+' · '+r.key+(r.conceptStage?' · '+r.conceptStage:''));meta.style.cssText='font-size:11px;color:#819e8b';section.append(meta);
  const summary=create('p',r.summary||'No public body text.');summary.style.cssText='font-size:12px;color:#627e6b;line-height:1.7;max-width:75ch';section.append(summary);
  const related=data.relations.filter(e=>e.source===r.key||e.target===r.key).slice(0,9);if(related.length){const line=create('p','Related records:');line.style.cssText='font-size:11px;color:#7d9888';section.append(line);
   for(const e of related){const other=e.source===r.key?e.target:e.source,rec=data.records.find(x=>x.key===other);if(!rec)continue;const link=create('a',rec.title+' · '+e.kind);link.href=rec.path;link.style.cssText='display:inline-block;margin:0 14px 9px 0;font-size:11px;color:#27845e;text-decoration:underline;text-decoration-color:#b4d4c0';section.append(link);}
  }out.append(section);
 }
}q?.addEventListener('input',draw);draw();
