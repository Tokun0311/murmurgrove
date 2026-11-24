/** Static local-only server, never modifies TOW ARCHIVE, no uploads or data writes. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const port=Number(process.env.PORT||4178);
const server=createServer((req,res)=>{
 const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const file=resolve(ROOT,'.'+(path==='/'?'/index.html':path));
 if(!file.startsWith(ROOT+sep)){res.writeHead(403);res.end('Forbidden');return;}
 try{const data=readFileSync(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store',
  'cross-origin-opener-policy':'same-origin'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Phase 2.5 organism sandbox: http://127.0.0.1:${port}/ (local only)`));
