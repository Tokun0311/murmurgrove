import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mdParts} from '../murmurgrove-editor/research-core.mjs';
import {metadataSuggestions} from '../murmurgrove-editor/profile-metadata.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apply=process.argv.includes('--apply');
const backup=path.join(root,'murmurgrove-editor','.private','profile-migration-'+Date.now());
let count=0,fields=0;
for(const type of ['people','institutions','concepts','exhibitions','writing']){const dir=path.join(root,'src/data',type);for(const file of await fs.readdir(dir)){if(!file.endsWith('.md'))continue;const full=path.join(dir,file),raw=await fs.readFile(full,'utf8');const parts=mdParts(raw);if(parts.fields.draft===true)continue;const extra=metadataSuggestions(type,parts.fields,parts.body);if(!Object.keys(extra).length)continue;count++;fields+=Object.keys(extra).length;console.log(type+'/'+file,JSON.stringify(extra));if(apply){const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/);if(!match)throw Error('Missing frontmatter');const newline=raw.includes('\r\n')?'\r\n':'\n';const updated=raw.slice(0,match[0].lastIndexOf('---'))+Object.entries(extra).map(([k,v])=>k+': '+JSON.stringify(v)+newline).join('')+raw.slice(match[0].lastIndexOf('---'));if(await fs.readFile(full,'utf8')!==raw)throw Error('Changed during migration: '+file);const target=path.join(backup,type,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,raw,{flag:'wx'});const temp=full+'.profile-tmp';await fs.writeFile(temp,updated,{flag:'wx'});await fs.rename(temp,full);}}}
console.log(`${apply?'Applied':'Preview'}: ${count} records, ${fields} fields. ${apply?'Backups: '+backup:'Use --apply to persist only the listed additions.'}`);
