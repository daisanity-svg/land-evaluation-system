import ExcelJS from 'exceljs';
import { LAND_EVALUATION_EXCEL_TEMPLATE_BASE64 } from './landEvaluationExcelTemplate.js';

function normalize(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function compact(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function strip(text) {
  return String(text || '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function splitSections(reportText) {
  const source = normalize(reportText);
  const headingRegex = /^\s*(\d{1,2})\s*[｜|]\s*([^\n]+?)\s*$/gm;
  const matches = Array.from(source.matchAll(headingRegex));
  const sections = {};
  if (!matches.length) {
    sections['00'] = source;
    return sections;
  }
  matches.forEach((match, index) => {
    const id = String(match[1]).padStart(2, '0');
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    sections[id] = source.slice(start, end).trim();
  });
  return sections;
}

function extractLine(text, labels) {
  const source = normalize(text);
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[：:]\\s*([^\\n]+)`);
    const match = source.match(re);
    if (match?.[1]) return strip(match[1]);
  }
  return '';
}

function extractAfterHeading(text, heading) {
  const source = normalize(text);
  const re = new RegExp(`${heading}\\s*[：:]?\\s*\\n?([^\\n]+)`);
  const match = source.match(re);
  return match?.[1] ? strip(match[1]) : '';
}

function firstNonEmpty(...values) {
  return values.find((value) => compact(value)) || '';
}

function cleanPriceValue(value) {
  return compact(value)
    .replace(/建議成交價格[：:]?/g, '')
    .replace(/建議價格[：:]?/g, '')
    .replace(/萬元/g, '萬')
    .replace(/／/g, '/')
    .replace(/每坪/g, '/坪')
    .trim();
}

function priceNumberOnly(value) {
  const text = cleanPriceValue(value);
  const match = text.match(/(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  return match ? match[1].replace(/[~\-－到至]/g, '～').replace(/\s+/g, '') : '';
}

function priceWithUnit(value, unit) {
  const n = priceNumberOnly(value);
  return n ? `${n} ${unit}` : '';
}

function extractPrice(section09, summaryText, kind) {
  const source = normalize(section09);
  const labelMap = {
    residential: ['二樓以上住宅', '住宅'],
    shop: ['店面'],
    parking: ['坡道平面車位', '車位'],
  };
  for (const label of labelMap[kind] || []) {
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
  const match = compact(text).match(/(\d+)\s*[～~\-－到至]\s*(\d+)\s*房/);
  if (match) return `${match[1]}-${match[2]}房`;
  const zh = compact(text).match(/([一二三四五六七八九十]+)房\s*[～~\-－到至]\s*([一二三四五六七八九十]+)房/);
  if (zh) return `${zh[1]}房到${zh[2]}房`;
  return '';
}

function normalizeSize(text) {
  const match = compact(text).match(/(?:約)?(\d+(?:\.\d+)?)\s*[～~\-－到至]\s*(\d+(?:\.\d+)?)\s*坪/);
  if (match) return `${match[1]}-${match[2]}坪`;
  return '';
}

function splitCaseBlocks(section08) {
  const source = normalize(section08);
  const caseRegex = /^\s*競案[一二三四五六七八九十0-9]+\s*[｜|]\s*([^\n]+)\s*$/gm;
  const matches = Array.from(source.matchAll(caseRegex));
  if (!matches.length) return [];
  return matches.slice(0, 4).map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    return { name: strip(match[1]), body: source.slice(start, end).trim() };
  });
}

function parseCase(block) {
  const body = normalize(block.body);
  const planning = extractLine(body, ['案子規劃']);
  const price = extractLine(body, ['成交價格']);
  const parkingMatch = body.match(/車位(?:價格)?(?:約)?\s*([\d\.]+\s*[～~\-－到至]\s*[\d\.]+|\d+(?:\.\d+)?)\s*萬\s*[／/]\s*位/);
  return {
    builder: '',
    name: block.name,
    status: firstNonEmpty(extractLine(body, ['屋齡']).replace(/^約/, ''), '待複核'),
    layout: firstNonEmpty(normalizeLayout(planning), normalizeLayout(body), '待複核'),
    size: firstNonEmpty(normalizeSize(planning), normalizeSize(body), '待複核'),
    price: priceNumberOnly(price) ? `${priceNumberOnly(price)}萬/坪` : firstNonEmpty(price, '待複核'),
    parking: parkingMatch?.[1] ? `${parkingMatch[1].replace(/[~\-－到至]/g, '～')}萬/位` : '待複核',
    source: firstNonEmpty(extractLine(body, ['成交筆數']), '待複核'),
    note: firstNonEmpty(extractLine(body, ['競案等級']), extractLine(body, ['參考價值']).slice(0, 28), '待複核'),
  };
}

function extractDirection(section04, direction) {
  const source = normalize(section04);
  const row = source.match(new RegExp(`${direction}向\\s*[｜|]\\s*([^｜|\\n]+)(?:[｜|]([^\\n]+))?`));
  if (row) return strip(row[1]);
  return extractLine(source, [`${direction}向`]);
}

function extractListItems(section11, title) {
  const source = normalize(section11);
  const start = source.indexOf(title);
  if (start < 0) return [];
  const rest = source.slice(start + title.length);
  const next = rest.search(/\n\s*(銷售優勢|銷售抗性|劣勢|優勢)\s*[：:]/);
  const part = next >= 0 ? rest.slice(0, next) : rest;
  return part
    .split('\n')
    .map((line) => strip(line).replace(/^\d+[.、]\s*/, ''))
    .filter((line) => line && !/^[：:]$/.test(line))
    .slice(0, 3);
}

function parseReportText(reportText, report = {}) {
  const sections = splitSections(reportText);
  const s01 = sections['01'] || reportText;
  const s04 = sections['04'] || '';
  const s05 = sections['05'] || '';
  const s06 = sections['06'] || '';
  const s08 = sections['08'] || '';
  const s09 = sections['09'] || '';
  const s10 = sections['10'] || '';
  const s11 = sections['11'] || '';
  const cases = splitCaseBlocks(s08).map(parseCase).slice(0, 4);
  const advantages = extractListItems(s11, '銷售優勢：');
  const weaknesses = extractListItems(s11, '銷售抗性：');
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
    product: firstNonEmpty(extractLine(s01, ['建議產品']), `${extractAfterHeading(s10, '兩房產品')}\n${extractAfterHeading(s10, '三房產品')}`.trim(), '待複核'),
    cases,
    residentialPrice: extractPrice(s09, s01, 'residential'),
    shopPrice: extractPrice(s09, s01, 'shop'),
    parkingPrice: extractPrice(s09, s01, 'parking'),
    advantages,
    weaknesses,
  };
}

function setCell(sheet, address, value) {
  const cell = sheet.getCell(address);
  cell.value = value || '';
  cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
}

export async function buildLandEvaluationExcelBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  const templateBuffer = Buffer.from(LAND_EVALUATION_EXCEL_TEMPLATE_BASE64, 'base64');
  await workbook.xlsx.load(templateBuffer);
  const sheet = workbook.worksheets[0];
  const data = parseReportText(report.report_text || '', report);

  setCell(sheet, 'B2', data.client);
  setCell(sheet, 'F2', data.researchDate);
  setCell(sheet, 'B3', data.location);
  setCell(sheet, 'F3', data.landNumber);
  setCell(sheet, 'B4', data.zoning);
  setCell(sheet, 'F4', data.area);
  setCell(sheet, 'B5', data.coverage);
  setCell(sheet, 'F5', data.far);
  setCell(sheet, 'B6', data.road);
  setCell(sheet, 'F6', data.landPrice);
  setCell(sheet, 'B7', data.school);
  setCell(sheet, 'F7', data.village);

  setCell(sheet, 'C9', data.north);
  setCell(sheet, 'C10', data.west);
  setCell(sheet, 'C11', data.south);
  setCell(sheet, 'C12', data.east);

  setCell(sheet, 'B13', data.traffic);
  setCell(sheet, 'B14', data.living);
  setCell(sheet, 'B15', data.publicFacility);
  setCell(sheet, 'B16', data.market);
  setCell(sheet, 'B17', data.product);

  data.cases.forEach((item, index) => {
    const row = 19 + index;
    setCell(sheet, `B${row}`, item.builder);
    setCell(sheet, `C${row}`, item.name);
    setCell(sheet, `D${row}`, item.status);
    setCell(sheet, `E${row}`, item.layout);
    setCell(sheet, `F${row}`, item.size);
    setCell(sheet, `G${row}`, item.price);
    setCell(sheet, `H${row}`, item.parking);
    setCell(sheet, `I${row}`, item.source);
    setCell(sheet, `J${row}`, item.note);
  });

  setCell(sheet, 'D23', priceWithUnit(data.residentialPrice, '萬/坪'));
  setCell(sheet, 'H23', priceWithUnit(data.shopPrice, '萬/坪'));
  setCell(sheet, 'H24', priceWithUnit(data.parkingPrice, '萬/位'));

  data.advantages.slice(0, 3).forEach((item, index) => setCell(sheet, `B${26 + index}`, item));
  data.weaknesses.slice(0, 3).forEach((item, index) => setCell(sheet, `B${30 + index}`, item));

  sheet.pageSetup = {
    ...(sheet.pageSetup || {}),
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    printArea: 'A1:L46',
    horizontalCentered: true,
    verticalCentered: false,
  };

  return workbook.xlsx.writeBuffer();
}
