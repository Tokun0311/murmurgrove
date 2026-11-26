// MURMURGROVE_EDITOR_V16
const indexedCities=['Tokyo','Takamatsu','Yokohama','Fukuoka','Kitakyushu','Kyoto','Hiroshima','Gero','Tokamachi','Seoul','Gwangju','Busan','Hong Kong','Singapore','East Java','Phuket','Berlin','Copenhagen','London','Arles'];
const cityKey=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
const cityAliases={'東京':'Tokyo','东京':'Tokyo','京都':'Kyoto','横浜':'Yokohama','横滨':'Yokohama','福岡':'Fukuoka','福冈':'Fukuoka','高松':'Takamatsu','ソウル':'Seoul','首尔':'Seoul','서울':'Seoul','釜山':'Busan','부산':'Busan','光州':'Gwangju','광주':'Gwangju','香港':'Hong Kong'};
function canonicalCity(s){const t=String(s||'').trim();return indexedCities.find(c=>cityKey(c)===cityKey(t))||(Object.hasOwn(cityAliases,t)?cityAliases[t]:t);}
function institutionCityField(value='',suggest=false,onChange=()=>{}){
 const wrap=el('div','v16-city');const label=el('label','micro-copy','City / 机构所在城市');const input=el('input','bundle-input');input.type='text';input.value=value;input.maxLength=120;input.placeholder='Tokyo / Seoul / …';input.setAttribute('aria-label','Institution city');
 const choices=el('datalist');choices.id='v16-cities-'+(++institutionCityField.sequence);for(const city of indexedCities){const option=el('option');option.value=city;choices.append(option);}input.setAttribute('list',choices.id);label.append(input);wrap.append(label,choices);
 const hint=el('p','micro-copy');wrap.append(hint);const refresh=()=>{const city=canonicalCity(input.value);hint.textContent=!city?'未填写：公开后会归入 Location not yet specified。':indexedCities.includes(city)?'地理索引 / Geographic index: '+city:'此城市尚不在当前网站地理索引中；记录仍可保存，但会归入未分类。';hint.dataset.status=indexedCities.includes(city)?'ready':'attention';};
 const changed=()=>{refresh();onChange(canonicalCity(input.value));};input.addEventListener('input',changed);input.addEventListener('change',()=>{input.value=canonicalCity(input.value);changed();});
 if(suggest){const use=el('button','action-link','使用本次展览的 Region / Use exhibition city');use.type='button';use.onclick=()=>{const region=canonicalCity(state.fields.region);if(!region){warn('请先填写展览 Region。',true);return;}input.value=region;changed();};wrap.append(use);}
 refresh();return {wrap,input};
}
institutionCityField.sequence=0;
