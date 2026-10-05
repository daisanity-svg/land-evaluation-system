import ExcelJS from 'exceljs';
import { LAND_EVALUATION_EXCEL_TEMPLATE_BASE64 } from './landEvaluationExcelTemplate.js';

function normalize(text) {
  let value = String(text || '').trim();
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') value = parsed.report_text || parsed.reportText || parsed.text || parsed.report || value;
  } catch {}
  return String(value)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    const escaped = String(label).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    // Newer reports sometimes use a more descriptive field name, e.g.「屋齡／進度」.
    const m = source.match(new RegExp(`(?:^|\\n)\\s*${escaped}(?:[／/][^\\n：:]*)?\\s*[：:]\\s*([^\\n]+)`));
    if (m?.[1]) return strip(m[1]);
  }
  return '';
}

function extractPercent(text, label) {
  const escaped = String(label).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
  const m = compact(text).match(new RegExp(`${escaped}\\s*(?:[：:]|為|約|約為)?\\s*(\\d+(?:\\.\\d+)?\\s*%)`));
  return m?.[1] ? m[1].replace(/\\s+/g, '') : '';
}
function firstParagraph(text) {
  const paragraph = normalize(text).split(/\n\s*\n/).find((item) => compact(item));
  return paragraph ? compact(paragraph) : '';
}
function sentenceContaining(text, pattern) {
  const sentences = normalize(text).split(/(?<=[。！？\n])/).map((item) => compact(item)).filter(Boolean);
  return sentences.find((item) => pattern.test(item)) || '';
}

function extractAfterHeading(text, heading) {
  const source = normalize(text);
  const m = source.match(new RegExp(`${heading}\\s*[：:]?\\s*\\n?([^\\n]+)`));
  return m?.[1] ? strip(m[1]) : '';
}

function extractProductBlock(text, heading, nextHeadings = []) {
  const source = normalize(text);
  const start = source.match(new RegExp(`(?:^|\\n)\\s*${heading}\\s*[：:]?\\s*(?:\\n|$)`, 'm'));
  if (!start || start.index === undefined) return '';
  const from = start.index + start[0].length;
  const tail = source.slice(from);
  const boundary = nextHeadings
    .map((next) => tail.search(new RegExp(`(?:^|\\n)\\s*${next}\\s*[：:]?`, 'm')))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return tail.slice(0, boundary === undefined ? tail.length : boundary)
    .split('\n')
    .map(strip)
    .filter(Boolean)
    .join('；');
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
  if (/待|未確認|未核|不足|不可|不能|不適用|無成交/.test(String(value || ''))) return '';
  const m = cleanPriceValue(value).match(/(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  return m ? m[1].replace(/[~\-－到至]/g, '～').replace(/\s+/g, '') : '';
}
function priceWithUnit(value, unit) {
  const n = priceNumberOnly(value);
  return n ? `${n} ${unit}` : /不適用/.test(String(value)) ? '不適用' : '待複核';
}

function parseIsoDate(value) {
  const match = compact(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function extractPrice(section09, summaryText, kind) {
  const source = normalize(section09);
  const labels = kind === 'residential' ? ['二樓以上住宅', '住宅'] : kind === 'shop' ? ['店面'] : ['坡道平面車位', '車位'];
  for (const label of labels) {
    const block = source.match(new RegExp(`${label}[：:]?\\s*\\n(?:[^\\n]*\\n){0,2}?\\s*建議成交價格\\s*[：:]\\s*([^\\n]+)`));
    if (block?.[1]) return block[1];
    const line = source.match(new RegExp(`${label}[^\\n：:]*[：:]\\s*([^\\n]+)`));
    if (line?.[1]) return line[1];
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
  if (zh) return `${zh[1]}房到${zh[2]}房`;
  return '';
}
function normalizeSize(text) {
  const m = compact(text).match(/(?:約)?(\d+(?:\.\d+)?)\s*[～~\-－到至]\s*(\d+(?:\.\d+)?)\s*坪/);
  return m ? `${m[1]}-${m[2]}坪` : '';
}

function splitCaseBlocks(section08) {
  const source = normalize(section08);
  const re = /^\s*競案[一二三四五六七八九十0-9]+\s*[｜|]\s*([^\n]+)\s*$/gm;
  const matches = Array.from(source.matchAll(re));
  return matches.map((m, i) => ({
    name: strip(m[1]),
    body: source.slice(m.index + m[0].length, i + 1 < matches.length ? matches[i + 1].index : source.length).trim(),
  }));
}
function parseCase(block) {
  const body = normalize(block.body);
  const planning = extractLine(body, ['案子規劃']);
  const price = extractLine(body, ['成交價格']);
  const age = extractLine(body, ['屋齡']);
  const transaction = firstNonEmpty(extractLine(body, ['成交期間']), extractLine(body, ['近半年成交', '近一年成交']));
  const period = firstNonEmpty(extractLine(body, ['成交期間']), transaction.match(/近[半年一二三四五六七八九十]+/)?.[0]);
  const count = firstNonEmpty(extractLine(body, ['成交筆數']), transaction.match(/(?:共|約|至少)?\s*(\d+)\s*筆/)?.[1] ? `${transaction.match(/(?:共|約|至少)?\s*(\d+)\s*筆/)?.[1]}筆` : '');
  const explicitBuilder = extractLine(body, ['建設公司', '建商']);
  const planningLead = compact(planning).split(/[，,；;]/)[0];
  const builder = firstNonEmpty(explicitBuilder, /(?:建設|建築|開發|營造)$/.test(planningLead) ? planningLead : '');
  const parking = body.match(/(?:坡道平面)?車位(?:價格|參考成交)?(?:約)?\s*(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s*萬(?:元)?(?:\s*[／/]\s*位)?/);
  const opening = age.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*開案/);
  const openingNote = opening ? `${Number(opening[1]) - 1911}.${String(opening[2]).padStart(2, '0')}開案` : '';
  const transactionNote = count ? `${period || '近一年'}成交${count}` : transaction;
  const source = extractLine(body, ['資訊來源', '資料來源']);
  const statistics = ['全案有效成交筆數', '近半年有效成交筆數', '銷售率', '月均成交量']
    .map(label => { const value = extractLine(body, [label]); return value ? `${label}：${value}` : ''; }).filter(Boolean);
  const explicitParking = extractLine(body, ['車位價格']);
  const openingTime = extractLine(body, ['開案時間']);
  return {
    builder: firstNonEmpty(builder, '待複核'),
    name: block.name,
    status: firstNonEmpty(
      age
        .replace(/，?\s*\d{4}\s*年\s*\d{1,2}\s*月\s*開案/g, '')
        .replace(/^約/, '')
        .replace(/^[，,、；;：:\s]+/, '')
        .trim(),
      '待複核',
    ),
    layout: firstNonEmpty(extractLine(body, ['房型']), normalizeLayout(planning), normalizeLayout(body), '待複核'),
    size: firstNonEmpty(extractLine(body, ['坪數']), normalizeSize(planning), normalizeSize(body), '待複核'),
    price: priceNumberOnly(price) ? `${priceNumberOnly(price)}萬/坪` : firstNonEmpty(price, '待複核'),
    parking: explicitParking || (parking?.[1] && !/待複核|未確認/.test(price) ? `${parking[1].replace(/[~\-－到至]/g, '～')}萬/位` : '待複核'),
    source: [source || '待複核', ...statistics].join('\n'),
    note: firstNonEmpty([openingTime || openingNote, transactionNote].filter(Boolean).join('；'), extractLine(body, ['競案等級']), extractLine(body, ['參考價值']).slice(0, 28), '待複核'),
  };
}
function extractDirection(section04, direction) {
  const row = normalize(section04).match(new RegExp(`${direction}向\\s*[｜|]\\s*([^｜|\\n]+)(?:[｜|]([^\\n]+))?`));
  if (row) return strip(row[1]);
  const labelled = extractLine(section04, [`${direction}向`, `${direction}側`, `${direction}面`]);
  if (labelled) return labelled;
  const sentence = sentenceContaining(section04, new RegExp(`${direction}(?:側|向|面)`));
  return sentence ? strip(sentence) : '';
}
function extractListItems(section11, title) {
  const source = normalize(section11);
  const start = source.indexOf(title);
  if (start < 0) return [];
  const rest = source.slice(start + title.length);
  const next = rest.search(/\n\s*(銷售優勢|銷售抗性|劣勢|優勢)\s*[：:]/);
  return (next >= 0 ? rest.slice(0, next) : rest)
    .split('\n')
    .map((line) => strip(line).replace(/^\d+[.、．]\s*/, '').replace(/^[一二三四五六七八九十]+[.、．]\s*/, ''))
    .filter(Boolean)
    .slice(0, 3);
}

function parseReportText(reportText, report = {}) {
  const s = splitSections(reportText);
  const s01 = s['01'] || reportText;
  const s03 = s['03'] || '';
  const s04 = s['04'] || '';
  const s05 = s['05'] || '';
  const s06 = s['06'] || '';
  const s08 = s['08'] || '';
  const s09 = s['09'] || '';
  const s10 = s['10'] || '';
  const s11 = s['11'] || '';
  return {
    client: firstNonEmpty(report.client, extractLine(s01, ['配合業主'])),
    researchDate: firstNonEmpty(report.research_date, extractLine(s01, ['調研日期'])),
    location: firstNonEmpty(extractLine(s01, ['基地位置', '標的位置']), report.summary?.location),
    landNumber: firstNonEmpty(report.land_number, extractLine(s01, ['目標地號', '標的地號'])),
    zoning: firstNonEmpty(extractLine(s01, ['土地使用分區', '土地分區']), report.summary?.zoning),
    area: firstNonEmpty(extractLine(s01, ['基地面積']), report.summary?.area),
    coverage: firstNonEmpty(extractLine(s01, ['建蔽率']), extractLine(s03, ['建蔽率']), extractPercent(`${s01}\n${s03}\n${report.summary?.zoning || ''}`, '建蔽率'), '待複核'),
    far: firstNonEmpty(extractLine(s01, ['容積率']), extractLine(s03, ['容積率']), extractPercent(`${s01}\n${s03}\n${report.summary?.zoning || ''}`, '容積率'), '待複核'),
    road: firstNonEmpty(extractLine(s01, ['臨路條件']), report.summary?.road),
    landPrice: '待複核',
    school: [extractLine(s06, ['基礎教育學區']), extractLine(s06, ['中等教育學區'])].filter(Boolean).join('\n') || '待複核',
    village: firstNonEmpty(extractLine(s06, ['里別']), '待複核'),
    north: firstNonEmpty(extractDirection(s04, '北'), '待複核'),
    west: firstNonEmpty(extractDirection(s04, '西'), '待複核'),
    south: firstNonEmpty(extractDirection(s04, '南'), '待複核'),
    east: firstNonEmpty(extractDirection(s04, '東'), '待複核'),
    traffic: firstNonEmpty(extractLine(s05, ['交通通勤', '交通動線']), sentenceContaining(s05, /(交通|通勤|聯外|道路|車站)/), sentenceContaining(s04, /(道路|路寬|臨路|[路街道])/), '待複核'),
    living: firstNonEmpty(extractLine(s05, ['生活機能']), firstParagraph(s05), '待複核'),
    publicFacility: firstNonEmpty(extractLine(s05, ['區域條件', '公共建設']), sentenceContaining(s05, /(市場|學校|公園|行政|醫療|公共)/), '待複核'),
    market: firstNonEmpty(extractLine(s08, ['市場行情總結']), s08.split('市場行情總結：')[1]?.trim(), [...normalize(s08).split('\n').filter((item) => compact(item))].reverse().find((item) => /(?:市場|行情|成交|價格)/.test(item)), '待複核'),
    product: firstNonEmpty(extractLine(s01, ['建議產品']), [
      extractProductBlock(s10, '兩房產品', ['三房產品', '不建議產品']),
      extractProductBlock(s10, '三房產品', ['不建議產品']),
    ].filter(Boolean).join('\n'), `${extractAfterHeading(s10, '兩房產品')}\n${extractAfterHeading(s10, '三房產品')}`.trim(), normalize(s10).split('\n').filter((item) => /^\s*(?:2|3|兩|三)房\s*[：:]/.test(item)).map(strip).join('\n'), '待複核'),
    cases: splitCaseBlocks(s08).map(parseCase).filter((item) => item.name && item.name !== '待複核').slice(0, 4),
    residentialPrice: extractPrice(s09, s01, 'residential'),
    shopPrice: extractPrice(s09, s01, 'shop'),
    parkingPrice: extractPrice(s09, s01, 'parking'),
    advantages: extractListItems(s11, '銷售優勢：'),
    weaknesses: extractListItems(s11, '銷售抗性：'),
  };
}

const CENTER = { horizontal:'center', vertical:'middle', wrapText:true };
const LEFT = { horizontal:'left', vertical:'middle', wrapText:true };
function setCell(sheet, address, value, align = LEFT) {
  const cell = sheet.getCell(address);
  cell.value = value || '';
  cell.alignment = align;
}
export async function buildLandEvaluationExcelBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(LAND_EVALUATION_EXCEL_TEMPLATE_BASE64, 'base64'));
  const sheet = workbook.worksheets[0];
  const data = parseReportText(report.report_text || '', report);
  [['B2',data.client],['B3',data.location],['F3',data.landNumber],['B4',data.zoning],['F4',data.area],['B5',data.coverage],['F5',data.far],['B6',data.road],['F6',data.landPrice],['B7',data.school],['F7',data.village],['C9',data.north],['C10',data.west],['C11',data.south],['C12',data.east],['B13',data.traffic],['B14',data.living],['B15',data.publicFacility],['B16',data.market],['B17',data.product]].forEach(([addr,val])=>setCell(sheet,addr,val));
  const directionSection = splitSections(report.report_text || '')['04'] || '';
  const directions = Array.from(directionSection.matchAll(/^\s*((?:東北|東南|西北|西南|東|南|西|北)向)\s*[｜|]\s*([^｜|\n]+)/gm));
  if (directions.length === 4 && new Set(directions.map(x => x[1])).size === 4) {
    directions.forEach((item, i) => { setCell(sheet, `B${9+i}`, item[1], CENTER); setCell(sheet, `C${9+i}`, strip(item[2])); });
  }
  const researchDate = parseIsoDate(data.researchDate);
  setCell(sheet, 'F2', researchDate || data.researchDate);
  if (researchDate) sheet.getCell('F2').numFmt = 'yyyy-mm-dd';
  data.cases.forEach((item, index) => {
    const row = 19 + index;
    [['B',item.builder],['C',item.name],['D',item.status],['E',item.layout],['F',item.size],['G',item.price],['H',item.parking],['I',item.source],['J',item.note]].forEach(([col,val])=>setCell(sheet,`${col}${row}`,val));
  });
  setCell(sheet, 'D23', priceWithUnit(data.residentialPrice, '萬/坪'), CENTER);
  setCell(sheet, 'H23', priceWithUnit(data.shopPrice, '萬/坪'), CENTER);
  setCell(sheet, 'H24', priceWithUnit(data.parkingPrice, '萬/位'), CENTER);
  data.advantages.slice(0, 3).forEach((item, index) => setCell(sheet, `B${26 + index}`, `${index + 1}. ${item}`));
  data.weaknesses.slice(0, 3).forEach((item, index) => setCell(sheet, `B${30 + index}`, `${index + 1}. ${item}`));
  return workbook.xlsx.writeBuffer();
}
