// Display-only compatibility for records predating the explicit language fields.
// Keys and original names must both match; an editor-supplied en: name takes precedence.
const legacyInstitutions = {
 'tokyo-photographic-art-museum':['東京都写真美術館','Tokyo Photographic Art Museum'],
 mot:['東京都現代美術館 (MOT)','Museum of Contemporary Art Tokyo (MOT)'],
 'waseda-library':['早稲田大学','Waseda University'],
 'hinodecho-waikiki-studio':['日ノ出町ワイキキSTUDIO','Hinodecho Waikiki Studio'],
 'national-art-center-tokyo':['国立新美術館','The National Art Center, Tokyo'],
 'culture-station-seoul-284':['文化駅ソウル284','Culture Station Seoul 284'],
 'tokyo-opera-city':['東京オペラシティ アートギャラリー','Tokyo Opera City Art Gallery'],
 'echigo-tsumari':['奴奈川キャンパス','NUNAGAWA Campus'],
 'kitakyushu-international-biennial':['北九州国際ビエンナーレ','Kitakyushu International Biennial'],
 'setagaya-art-museum':['世田谷美術館','Setagaya Art Museum'],
 'tokyo-metropolitan-theatre':['東京芸術劇場','Tokyo Metropolitan Theatre'],
 'shibuya-hikarie':['渋谷ヒカリエ','Shibuya Hikarie'],
 'tokyo-bunka-kaikan':['東京文化会館','Tokyo Bunka Kaikan'],
 'fukuoka-asian-art-museum':['福岡アジア美術館','Fukuoka Asian Art Museum'],
 'yokohama-museum':['横浜美術館','Yokohama Museum of Art'],
 'meet-your-art':['寺田倉庫','Warehouse TERRADA'],
 'tokyo-gendai':['パシフィコ横浜','PACIFICO Yokohama'],
 'hiroshima-moca':['広島市現代美術館','Hiroshima City Museum of Contemporary Art'],
 'art-fair-tokyo':['東京国際フォーラム','Tokyo International Forum'],
};
const clean=v=>typeof v==='string'?v.trim():'';
const norm=v=>clean(v).normalize('NFKC').toLocaleLowerCase();
const unique=values=>{const seen=new Set();return values.map(clean).filter(v=>v&&!seen.has(norm(v))&&seen.add(norm(v)));};
const latin=v=>/\p{Script=Latin}/u.test(v)&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}]/u.test(v);
const tag=v=>clean(v).match(/^(en|zh|ja)\s*[:：]\s*(.+)$/i);
function parts(name){
  const raw=clean(name);const chunks=raw.split(/\s+[\/／]\s+|\s*／\s*/u).map(clean).filter(Boolean);
  if(chunks.length===1){const m=raw.match(/^(.+?)\s*[（(]([^()（）]+)[）)]$/u);if(m&&!latin(m[1])&&latin(m[2])&&m[2].length>4&&/\s/.test(m[2]))return [clean(m[1]),clean(m[2])];}
  return chunks;
}
export function recordNames(data={},type='',id=''){
  const raw=clean(data.name), fragments=parts(raw), tagged={}, other=[];
  for(const alias of Array.isArray(data.alternativeNames)?data.alternativeNames:[]){const m=tag(alias);if(m)tagged[m[1].toLowerCase()]=clean(m[2]);else other.push(clean(alias));}
  const fallback=type==='institutions'&&legacyInstitutions[id]?.[0]===raw?legacyInstitutions[id][1]:'';
  const primary=tagged.en||fragments.find(latin)||fallback||raw;
  const saka=type==='people'&&id==='ryuichi-sakamoto'&&norm(raw)==='ryuichi sakamoto'?'坂本龍一':'';
  const native=unique([data.nativeName,...fragments.filter(v=>!latin(v)),tagged.ja,tagged.zh,saka]).find(v=>norm(v)!==norm(primary))||'';
  const aliases=unique([raw,...fragments,data.nativeName,tagged.en,tagged.zh,tagged.ja,...other,saka,fallback]).filter(v=>norm(v)!==norm(primary)&&norm(v)!==norm(native)&&!(fragments.length>1&&norm(v)===norm(raw)));
  return {primary,native,aliases,terms:unique([primary,native,...aliases,raw,data.sortName,data.reading,id])};
}
export function institutionListNames(data,id){
  const names=recordNames(data,'institutions',id);
  const venue=parts(data.venueName).find(latin)||clean(data.venueName);
  const notes=[];
  if(venue&&norm(venue)!==norm(names.primary))notes.push(`${data.venueStatus==='reference'?'Reference venue':'Associated venue'}: ${venue}`);
  const programme=clean(data.associatedProject);
  if(programme&&norm(programme)!==norm(names.primary)&&norm(programme)!==norm(venue))notes.push(`Related programme: ${programme}`);
  return {...names,display:names.primary,related:notes.join(' · ')};
}
