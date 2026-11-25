/** Dependency-free, bounded DOCX body extraction. Original bytes are stored separately. */
import zlib from 'node:zlib';

function decodeEntities(s){return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,v)=>{
 if(v[0]==='#'){const n=v[1]?.toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1));return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[v]||'';
});}
export function extractDocx(bytes){
 const buf=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 if(buf.length>8*1024*1024)throw Error('Word file exceeds 8 MB');
 if(buf.length<80||buf.readUInt32LE(0)!==0x04034b50)throw Error('Only .docx ZIP files are supported (not .doc)');
 // Read ZIP central directory, rather than blindly scanning for local headers.
 let eocd=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw Error('Invalid DOCX ZIP directory');
 const count=buf.readUInt16LE(eocd+10),dirSize=buf.readUInt32LE(eocd+12),dirOffset=buf.readUInt32LE(eocd+16);
 if(count>3000||dirOffset+dirSize>buf.length)throw Error('Invalid DOCX ZIP boundaries');
 let ptr=dirOffset,xml=null;
 for(let i=0;i<count;i++){
  if(ptr+46>buf.length||buf.readUInt32LE(ptr)!==0x02014b50)throw Error('Damaged DOCX central directory');
  const method=buf.readUInt16LE(ptr+10),compressed=buf.readUInt32LE(ptr+20),uncompressed=buf.readUInt32LE(ptr+24),nameLen=buf.readUInt16LE(ptr+28),extra=buf.readUInt16LE(ptr+30),comment=buf.readUInt16LE(ptr+32),localOffset=buf.readUInt32LE(ptr+42);
  if(ptr+46+nameLen+extra+comment>buf.length)throw Error('Invalid DOCX entry bounds');
  const name=buf.subarray(ptr+46,ptr+46+nameLen).toString('utf8');ptr+=46+nameLen+extra+comment;
  if(name!=='word/document.xml')continue;
  if(uncompressed>6*1024*1024||compressed>8*1024*1024)throw Error('DOCX XML too large');
  if(localOffset+30>buf.length||buf.readUInt32LE(localOffset)!==0x04034b50)throw Error('Invalid DOCX local header');
  const start=localOffset+30+buf.readUInt16LE(localOffset+26)+buf.readUInt16LE(localOffset+28);
  if(start+compressed>buf.length)throw Error('DOCX data out of range');
  const zipped=buf.subarray(start,start+compressed);
  const expanded=method===8?zlib.inflateRawSync(zipped,{maxOutputLength:6*1024*1024}):method===0?zipped:null;
  if(!expanded||expanded.length!==uncompressed)throw Error('Unsupported or invalid DOCX compression');
  xml=expanded.toString('utf8');break;
 }
 if(!xml)throw Error('Cannot find Word document text');
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsupported XML external declarations');
 // Whitespace and Word structural tags. Text nodes are extracted only from w:t and w:instrText excluded.
 const para=[];for(const p of xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)||[]){
  const parts=[];const tokens=p.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\b[^>]*\/?\s*>|<w:br\b[^>]*\/?\s*>/g)||[];
  for(const t of tokens){if(t.startsWith('<w:tab'))parts.push('\t');else if(t.startsWith('<w:br'))parts.push('\n');else parts.push(decodeEntities(t.replace(/^<w:t(?:\s[^>]*)?>/,'').replace(/<\/w:t>$/,'')));}
  para.push(parts.join(''));
 }
 const body=para.join('\n').replace(/\n{4,}/g,'\n\n\n').trim();
 if(!body)throw Error('This DOCX does not contain readable text (scanned images are not OCRed)');
 if(body.length>350000)throw Error('Extracted text exceeds 350,000 characters');
 return body;
}
