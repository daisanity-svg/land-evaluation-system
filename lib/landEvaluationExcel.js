import ExcelJS from 'exceljs';
import { LAND_EVALUATION_EXCEL_TEMPLATE_BASE64 } from './landEvaluationExcelTemplate.js';

function normalize(text) {
  let value = String(text || '').trim();
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') value = parsed.report_text || parsed.reportText || parsed.text || parsed.report || value;
  } catch {}
  return String(value).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function compact(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
function strip(text) { return String(text || '').replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim(); }
function firstNonEmpty(...values) { return values.find((v) => compact(v)) || ''; }
function splitSections(reportText) {
  const source = normalize(reportText);
  const re = /^\s*(\d{1,2})\s*[｜|]\s*([^\n]+?)\s*$/gm;
  const matches = Array.from(source.matchAll(re));
  const sections = {};
  if (!matches.length) { sections['00'] = source; return sections; }
  matches.forEach((m, i) => {
    const id = String(m[1]).padStart(2, '0');
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : source.length;
    sections[id] = source.slice(start, end).trim();
  });
  return sections;
}
function extractLine(text, labels) {
  const source = normalize(text);
  for (const label of labels) {
    const m = source.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[：:]\\s*([^\\n]+)`));
    if (m?.[1]) return strip(m[1]);
  }
  return '';
}
function cleanPriceValue(value) { return compact(value).replace(/建議成交價格[：:]?/g, '').replace(/建議價格[：:]?/g, '').replace(/萬元/g, '萬').replace(/／/g, '/').replace(/每坪/g, '/坪').trim(); }
function priceNumberOnly(value) {
  const m = cleanPriceValue(value).match(/(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  return m ? m[1].replace(/[~\-－到至]/g, '～').replace(/\s+/g, '') : '';
}
function priceWithUnit(value, unit) { const n = priceNumberOnly(value); return n ? `${n} ${unit}` : ''; }
function extractPrice(section09, summaryText, kind) {
  const source = normalize(section09);
  const labels = kind === 'residential' ? ['二樓以上住宅', '住宅'] : kind === 'shop' ? ['店面'] : ['坡道平面車位', '車位'];
  for (const label of labels) {
    const block = source.match(new RegExp(`${label}[：:]?\\s*\\n(?:[^\\n]*\\n){0,2}?\\s*建議成交價格\\s*[：:]\\s*([^\\n]+)`));
    if (block?.[1]) return block[1];
    const line = source.match(new RegExp(`${label}[^\\n：:]*[：:]\\s*([^\\n]+)`));
    if (line?.[1] && /\d/.test(line[1])) return line[1];
  }
  const all = normalize(summaryText || '');
  if (kind === 'residential') return (all.match(/二樓以上住宅\s*([\d\.]+\s*[～~\-－到至]\s*[\d\.]+)\s*萬?\s*[／/]\s*坪/) || [])[1] || '';
  if (kind === 'shop') return (all.match(/店面\s*([\d\.]+\s*[～~\-－到至]\s*[\d\.]+)\s*萬?\s*[／/]\s*坪/) || [])[1] || '';
  return (all.match(/(?:坡道平面車位|車位)\s*([\d\.]+\s*[～~\-－到至]\s*[\d\.]+)\s*萬?\s*[／/]\s*位/) || [])[1] || '';
}
function normalizeLayout(text) {
  const s = compact(text);
  const m = s.match(/(\d+)\s*[～~\-－到至]\s*(\d+)\s*房/);
  if (m) return `${m[1]}-${m[2]}房`;
  const zh = s.match(/([一二三四五六七八九十]+)房\s*[～~\-－到至]\s*([一二三四五六七八九十]+)房/);
  return zh ? `${zh[1]}房到${zh[2]}房` : '';
}
function normalizeSize(text) { const m = compact(text).match(/(?:約)?(\d+(?:\.\d+)?)\s*[～~\-－到至]\s*(\d+(?:\.\d+)?)\s*坪/); return m ? `${m[1]}-${m[2]}坪` : ''; }
function splitCaseBlocks(section08) {
  const source = normalize(section08);
  const re = /^\s*競案[一二三四五六七八九十0-9]+\s*[｜|]\s*([^\n]+)\s*$/gm;
  const matches = Array.from(source.matchAll(re));
  return matches.slice(0, 4).map((m, i) => ({ name: strip(m[1]), body: source.slice(m.index + m[0].length, i + 1 < matches.length ? matches[i + 1].index : source.length).trim() }));
}
function parseCase(block) {
  const body = normalize(block.body);
  const planning = extractLine(body, ['案子規劃']);
  const price = extractLine(body, ['成交價格']);
  const parking = body.match(/車位(?:價格)?(?:約)?\s*(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s*萬\s*[／/]\s*位/);
  return {
    builder: '',
    name: block.name,
    status: firstNonEmpty(extractLine(body, ['屋齡']).replace(/^約/, ''), '待複核'),
    layout: firstNonEmpty(normalizeLayout(planning), normalizeLayout(body), '待複核'),
    size: firstNonEmpty(normalizeSize(planning), normalizeSize(body), '待複核'),
    price: priceNumberOnly(price) ? `${priceNumberOnly(price)}萬/坪` : firstNonEmpty(price, '待複核'),
    parking: parking?.[1] ? `${parking[1].replace(/[~\-－到至]/g, '～')}萬/位` : '待複核',
    source: firstNonEmpty(extractLine(body, ['成交筆數']), '待複核'),
    note: firstNonEmpty(extractLine(body, ['競案等級']), extractLine(body, ['參考價值']).slice(0, 28), '待複核'),
  };
}
function extractDirection(section04, direction) {
  const row = normalize(section04).match(new RegExp(`${direction}向\\s*[｜|]\\s*([^｜|\\n]+)(?:[｜|]([^\\n]+))?`));
  if (row) return strip(row[1]);
  return extractLine(section04, [`${direction}向`]);
}
function extractListItems(section11, title) {
  const source = normalize(section11);
  const start = source.indexOf(title);
  if (start < 0) return [];
  const rest = source.slice(start + title.length);
  const next = rest.search(/\n\s*(銷售優勢|銷售抗性|劣勢|優勢)\s*[：:]/);
  return (next >= 0 ? rest.slice(0, next) : rest).split('\n').map((line) => strip(line).replace(/^\d+[.、]\s*/, '')).filter(Boolean).slice(0, 3);
}
function parseReportText(reportText, report = {}) {
  const s = splitSections(reportText);
  const s01 = s['01'] || reportText, s04 = s['04'] || '', s05 = s['05'] || '', s06 = s['06'] || '', s08 = s['08'] || '', s09 = s['09'] || '', s10 = s['10'] || '', s11 = s['11'] || '';
  return {
    client: firstNonEmpty(report.client, extractLine(s01, ['配合業主'])),
    researchDate: firstNonEmpty(report.research_date, extractLine(s01, ['調研日期'])),
    location: firstNonEmpty(extractLine(s01, ['基地位置', '標的位置']), report.summary?.location),
    landNumber: firstNonEmpty(report.land_number, extractLine(s01, ['目標地號', '標的地號'])),
    zoning: firstNonEmpty(extractLine(s01, ['土地使用分區', '土地分區']), report.summary?.zoning),
    area: firstNonEmpty(extractLine(s01, ['基地面積']), report.summary?.area),
    coverage: firstNonEmpty(extractLine(s01, ['建蔽率']), '待複核'),
    far: firstNonEmpty(extractLine(s01, ['容積率']), '待複核'),
    road: firstNonEmpty(extractLine(s01, ['臨路條件']), report.summary?.road),
    landPrice: '待複核',
    school: [extractLine(s06, ['基礎教育學區']), extractLine(s06, ['中等教育學區'])].filter(Boolean).join('\n') || '待複核',
    village: firstNonEmpty(extractLine(s06, ['里別']), '待複核'),
    north: firstNonEmpty(extractDirection(s04, '北'), '待複核'),
    west: firstNonEmpty(extractDirection(s04, '西'), '待複核'),
    south: firstNonEmpty(extractDirection(s04, '南'), '待複核'),
    east: firstNonEmpty(extractDirection(s04, '東'), '待複核'),
    traffic: firstNonEmpty(extractLine(s05, ['交通通勤', '交通動線']), '待複核'),
    living: firstNonEmpty(extractLine(s05, ['生活機能']), '待複核'),
    publicFacility: firstNonEmpty(extractLine(s05, ['區域條件', '公共建設']), '待複核'),
    market: firstNonEmpty(extractLine(s08, ['市場行情總結']), s08.split('市場行情總結：')[1]?.trim(), '待複核'),
    product: firstNonEmpty(extractLine(s01, ['建議產品']), `${extractLine(s10, ['兩房產品'])}\n${extractLine(s10, ['三房產品'])}`.trim(), '待複核'),
    cases: splitCaseBlocks(s08).map(parseCase).slice(0, 4),
    residentialPrice: extractPrice(s09, s01, 'residential'),
    shopPrice: extractPrice(s09, s01, 'shop'),
    parkingPrice: extractPrice(s09, s01, 'parking'),
    advantages: extractListItems(s11, '銷售優勢：'),
    weaknesses: extractListItems(s11, '銷售抗性：'),
  };
}

function set(sheet, address, value) { sheet.getCell(address).value = value || ''; }
function clear(sheet, addresses) { addresses.forEach((a) => set(sheet, a, '')); }

export async function buildLandEvaluationExcelBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(LAND_EVALUATION_EXCEL_TEMPLATE_BASE64, 'base64'));
  const sheet = workbook.getWorksheet('工作表1') || workbook.worksheets[0];
  const data = parseReportText(report.report_text || '', report);

  clear(sheet, ['B2','F2','B3','F3','B4','F4','B5','F5','B6','F6','B7','F7','C9','C10','C11','C12','B13','B14','B15','B16','B17','C23','D23','G23','H23','G24','H24','B26','B27','B28','B30','B31','B32']);
  [['B2',data.client],['F2',data.researchDate],['B3',data.location],['F3',data.landNumber],['B4',data.zoning],['F4',data.area],['B5',data.coverage],['F5',data.far],['B6',data.road],['F6',data.landPrice],['B7',data.school],['F7',data.village],['C9',data.north],['C10',data.west],['C11',data.south],['C12',data.east],['B13',data.traffic],['B14',data.living],['B15',data.publicFacility],['B16',data.market],['B17',data.product]].forEach(([addr, val]) => set(sheet, addr, val));

  for (let row = 19; row <= 22; row += 1) clear(sheet, [`B${row}`,`C${row}`,`D${row}`,`E${row}`,`F${row}`,`G${row}`,`H${row}`,`I${row}`,`J${row}`]);
  data.cases.forEach((item, index) => {
    const row = 19 + index;
    [['B',item.builder],['C',item.name],['D',item.status],['E',item.layout],['F',item.size],['G',item.price],['H',item.parking],['I',item.source],['J',item.note]].forEach(([col, val]) => set(sheet, `${col}${row}`, val));
  });

  const rp = priceNumberOnly(data.residentialPrice), sp = priceNumberOnly(data.shopPrice), pp = priceNumberOnly(data.parkingPrice);
  set(sheet, 'C23', rp); set(sheet, 'D23', rp ? `${rp} 萬/坪` : '');
  set(sheet, 'G23', sp); set(sheet, 'H23', sp ? `${sp} 萬/坪` : '');
  set(sheet, 'G24', pp); set(sheet, 'H24', pp ? `${pp} 萬/位` : '');
  data.advantages.slice(0, 3).forEach((item, index) => set(sheet, `B${26 + index}`, `${index + 1}. ${item}`));
  data.weaknesses.slice(0, 3).forEach((item, index) => set(sheet, `B${30 + index}`, `${index + 1}. ${item}`));

  return workbook.xlsx.writeBuffer();
}
