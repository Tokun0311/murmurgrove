import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {install} from './install.mjs';
const target=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
  const [server,editor,html]=await Promise.all(['server.mjs','assets/editor.js','index.html'].map(f=>fs.readFile(path.join(target,f),'utf8')));
  const flags=[server.includes('MURMURGROVE_EXHIBITION_FIRST_V12'),editor.includes('MURMURGROVE_EXHIBITION_FIRST_V12'),html.includes('editor v1.2 (local)')];
  const bundle=await fs.access(path.join(target,'bundle.mjs')).then(()=>true,()=>false);
  if(flags.every(Boolean)&&bundle){ console.log('Editor v1.2 is ready.'); }
  else if(flags.some(Boolean)||bundle){ throw Error('Mixed editor versions. No program files changed. Restore the v1.1 backup or ask for help.'); }
  else { await install(target,{apply:true}); }
} catch(e){ console.error('Upgrade stopped: '+e.message+'\nKeep the original folder and .private. Do not delete them.'); process.exitCode=1; }
