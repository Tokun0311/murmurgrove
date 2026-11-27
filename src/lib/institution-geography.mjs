// Build-time geographic navigation. Region classification only; preserve the archive's country labels.
// Unknown country labels remain visible under Other regions; never drop an entry.
const regionCodes = {
  'Asia': 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  'Europe': 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  'North America': 'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TT US VC',
  'South America': 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE',
  'Africa': 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  'Oceania': 'AS AU CC CK CX FJ FM GU HM KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS',
  'Antarctica': 'AQ BV GS TF',
 };
const regionOrder = [...Object.keys(regionCodes), 'Other regions'];
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();
const display = new Intl.DisplayNames(['en'], {type:'region'});
const lookup = new Map();
for (const [region,codes] of Object.entries(regionCodes)) {
  for (const code of codes.split(' ')) {
    lookup.set(normalize(code), region);
    lookup.set(normalize(display.of(code)), region);
  }
}
// Common archive labels that may differ from ICU's English names.
for (const [region,names] of Object.entries({
  Asia:['South Korea','North Korea','Hong Kong','Macau','Taiwan','Vietnam','Türkiye','Turkey','Palestine','East Timor','Mainland China'],
  Europe:['Russia','Czech Republic','Macedonia','Vatican City','Kosovo','UK','Great Britain','England','Scotland','Wales','Northern Ireland'],
  'North America':['USA','US','United States of America'],
  Africa:['Ivory Coast','Cape Verde','Swaziland','Democratic Republic of the Congo','Republic of the Congo'],
})) for (const name of names) lookup.set(normalize(name),region);
export const regionForCountry = country => lookup.get(normalize(country)) ?? 'Other regions';
export function groupCountries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const region = regionForCountry(entry.country);
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region).push(entry);
  }
  return regionOrder.filter(region => groups.has(region)).map(region => ({region, entries:groups.get(region)}));
}
