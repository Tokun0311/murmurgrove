// Record names, not slugs, are the source of display labels.
// Explicit language prefixes in alternativeNames resolve ambiguous Han-only names.
const known = [
  {zh:'后殖民主义',en:'Postcolonialism',ja:'ポストコロニアリズム'},
  {zh:'档案实践',en:'Archival Practices',ja:'アーカイブ実践'},
  {zh:'酷儿',en:'Queer',ja:'クィア'},
  {zh:'可持续性',en:'Sustainability',ja:'持続可能性'},
];
const norm = s => String(s??'').trim().normalize('NFKC').toLowerCase();
const clean = s => typeof s==='string' ? s.trim() : '';
const languageOf = s => /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s) ? 'ja' : /\p{Script=Han}/u.test(s) ? 'zh' : /\p{Script=Latin}/u.test(s) ? 'en' : '';
export function conceptLabels(data, legacy) {
  const title=clean(data.title);
  const raw=[title, clean(data.nativeName), ...(Array.isArray(data.alternativeNames)?data.alternativeNames:[])];
  const candidates=raw.flatMap(s=>clean(s).split(/\s+[\/／]\s+|\s*／\s*/u)).map(clean).filter(Boolean);
  const match=known.find(entry=>candidates.some(s=>Object.values(entry).some(v=>norm(v)===norm(s))));
  const labels={zh:'',en:'',ja:''};
  // Untagged Han-only aliases follow the archive's existing Chinese convention.
  // Use a ja: prefix for Japanese names written entirely in kanji.
  for(const candidate of candidates){
    if(/^(zh|en|ja)\s*[:：]/i.test(candidate))continue;
    const lang=languageOf(candidate);
    if(lang&&!labels[lang])labels[lang]=candidate;
  }
  if(legacy)Object.assign(labels,{zh:title,en:legacy.en,ja:legacy.ja});
  if(match)for(const lang of ['zh','en','ja'])if(!labels[lang])labels[lang]=match[lang];
  for(const candidate of candidates){
    const m=candidate.match(/^(zh|en|ja)\s*[:：]\s*(.+)$/i);
    if(m)labels[m[1].toLowerCase()]=m[2].trim();
  }
  return labels;
}
