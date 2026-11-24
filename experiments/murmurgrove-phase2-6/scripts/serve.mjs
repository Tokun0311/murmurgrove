/** Local, read-only Canvas2D sandbox. Does not serve or write external archive files. */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),process.argv.includes('--public-preview')?'../dist-public':'../public');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const port=Number(process.env.PORT||4186);
if(!Number.isInteger(port)||port<1025||port>65535)throw Error('Invalid port');
createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const path=decodeURIComponent(url.pathname);
  const file=resolve(ROOT,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(ROOT+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const body=readFileSync(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});
  if(req.method==='GET')res.end(body);else res.end();
 }catch(e){res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Murmurgrove real-baseline filament sandbox: http://127.0.0.1:'+port+'/'));
