// Public NLSC administrative/section lists, not a cadastral geometry API.
const ROOT = 'https://api.nlsc.gov.tw/other/';
export class ParcelError extends Error { constructor(code, message) { super(message); this.code = code; } }
const norm = value => String(value || '').normalize('NFKC').replace(/台/g, '臺').replace(/\s+/g, '').replace(/[－–—]/g, '-');
const decode = value => value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
function records(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(match => Object.fromEntries([...match[1].matchAll(/<([a-zA-Z0-9]+)>([^<]*)<\/\1>/g)].map(m => [m[1],decode(m[2].trim())])));
}
async function list(path, tag, fetcher) {
  let response;
  try { response = await fetcher(ROOT + path, { signal: AbortSignal.timeout(10000), next: { revalidate: 86400 } }); }
  catch { throw new ParcelError('official_service_unavailable', '官方地段清單暫時無法讀取，未採用推測位置。'); }
  if (!response.ok) throw new ParcelError('official_service_unavailable', '官方地段清單暫時無法讀取。');
  const rows = records(await response.text(), tag);
  if (!rows.length) throw new ParcelError('official_service_unavailable', '官方地段清單內容無效。');
  return rows;
}
function prefix(rows, key, text) {
  const matches = rows.filter(row => text.startsWith(norm(row[key]))).sort((a,b) => norm(b[key]).length - norm(a[key]).length);
  if (!matches.length) return null;
  const longest = matches.filter(row => norm(row[key]).length === norm(matches[0][key]).length);
  if (longest.length !== 1) throw new ParcelError('ambiguous_identity', '地段身分不唯一，請提供完整地段及小段。');
  return longest[0];
}
export async function resolveLandParcels(input, fetcher = fetch) {
  if (typeof input !== 'string' || input.length > 2000 || !input.trim()) throw new ParcelError('invalid_input', '請提供縣市、鄉鎮市區、地段／小段及地號。');
  let rest = norm(input); const original = input.trim();
  const counties = await list('ListCounty', 'countyItem', fetcher);
  const county = prefix(counties, 'countyname', rest);
  if (!county || !/^[A-Z]$/.test(county.countycode)) throw new ParcelError('county_required','請提供完整縣市名稱。');
  rest = rest.slice(norm(county.countyname).length);
  const towns = await list(`ListTown/${county.countycode}`, 'townItem', fetcher);
  const town = prefix(towns, 'townname', rest);
  if (!town || !/^[A-Z]\d{2}$/.test(town.towncode)) throw new ParcelError('town_required','請提供完整鄉鎮市區名稱。');
  rest = rest.slice(norm(town.townname).length);
  const sections = await list(`ListLandSection/${county.countycode}/${town.towncode}`, 'sectItem', fetcher);
  const parcels = []; let section = null;
  while (rest) {
    rest = rest.replace(/^[、,，;；。]+/, ''); if (!rest) break;
    const next = prefix(sections, 'sectstr', rest);
    if (next) { section = next; rest = rest.slice(norm(next.sectstr).length); }
    if (!section || !/^\d{4}$/.test(section.sectcode)) throw new ParcelError('section_not_found','官方清單找不到指定地段／小段，請檢查完整名稱；未使用附近地段代替。');
    const number = rest.match(/^(\d{1,4})(?:-(\d{1,4}))?(?:地號|號)?(?=$|[、,，;；。]|[^\d-])/);
    if (!number || Number(number[1]) === 0) throw new ParcelError('invalid_parcel','無法辨識完整地號；不接受地號範圍、缺漏小段或推測位置。');
    const mother = number[1].padStart(4,'0'), child = (number[2] || '0').padStart(4,'0');
    const parcelCode = section.sectcode + mother + child;
    if (parcels.some(p => p.parcel_code === parcelCode)) throw new ParcelError('duplicate_parcel','輸入包含重複地號，請移除重複項目。');
    parcels.push({ county:county.countyname, county_code:county.countycode, town:town.townname, town_code:town.towncode, section:section.sectstr, section_code:section.sectcode, land_number:`${Number(mother)}${Number(child) ? '-' + Number(child) : ''}`, parcel_code:parcelCode });
    if (parcels.length > 30) throw new ParcelError('too_many_parcels','單次最多查詢30筆地號。');
    rest = rest.slice(number[0].length);
  }
  if (!parcels.length) throw new ParcelError('invalid_parcel','請提供地號。');
  const path = `https://maps.nlsc.gov.tw/goland/${county.countycode}/${parcels.map(p=>p.parcel_code).join(',')}`;
  return { input:original, status:'official_codes_resolved', identity_verified:true, parcel_existence_verified:false, geometry_verified:false, parcels, official_map_url:path + '/EMAP_B/DMAPS', official_imagery_url:path + '/PHOTO2_B/DMAPS', sources:[ROOT+'ListCounty', ROOT+`ListTown/${county.countycode}`, ROOT+`ListLandSection/${county.countycode}/${town.towncode}`], checked_at:new Date().toISOString(), note:'已核對官方行政與地段代碼；須讀取官方圖臺實際宗地後才可確認存在、位置與範圍。不得以地段中心或門牌代替宗地。' };
}
