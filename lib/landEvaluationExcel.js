import ExcelJS from 'exceljs';

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
    const m = source.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[：:]\\s*([^\\n]+)`));
    if (m?.[1]) return strip(m[1]);
  }
  return '';
}

function extractAfterHeading(text, heading) {
  const source = normalize(text);
  const m = source.match(new RegExp(`${heading}\\s*[：:]?\\s*\\n?([^\\n]+)`));
  return m?.[1] ? strip(m[1]) : '';
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
  const m = cleanPriceValue(value).match(/(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  return m ? m[1].replace(/[~\-－到至]/g, '～').replace(/\s+/g, '') : '';
}
function priceWithUnit(value, unit) {
  const n = priceNumberOnly(value);
  return n ? `${n} ${unit}` : '';
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
  const period = extractLine(body, ['成交期間']);
  const count = extractLine(body, ['成交筆數']);
  const explicitBuilder = extractLine(body, ['建設公司', '建商']);
  const planningLead = compact(planning).split(/[，,；;]/)[0];
  const builder = firstNonEmpty(explicitBuilder, /(?:建設|建築|開發|營造)$/.test(planningLead) ? planningLead : '');
  const parking = body.match(/(?:坡道平面)?車位(?:價格|參考成交)?(?:約)?\s*(\d+(?:\.\d+)?\s*[～~\-－到至]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s*萬(?:元)?(?:\s*[／/]\s*位)?/);
  const opening = age.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*開案/);
  const openingNote = opening ? `${Number(opening[1]) - 1911}.${String(opening[2]).padStart(2, '0')}開案` : '';
  const transactionNote = count ? `${period || '近一年'}成交${count}` : '';
  const inferredSource = count || priceNumberOnly(price) ? '實價登錄' : '';
  return {
    builder: firstNonEmpty(builder, '待複核'),
    name: block.name,
    status: firstNonEmpty(age.replace(/，?\s*\d{4}\s*年\s*\d{1,2}\s*月\s*開案/g, '').replace(/^約/, '').trim(), '待複核'),
    layout: firstNonEmpty(normalizeLayout(planning), normalizeLayout(body), '待複核'),
    size: firstNonEmpty(normalizeSize(planning), normalizeSize(body), '待複核'),
    price: priceNumberOnly(price) ? `${priceNumberOnly(price)}萬/坪` : firstNonEmpty(price, '待複核'),
    parking: parking?.[1] ? `${parking[1].replace(/[~\-－到至]/g, '～')}萬/位` : '待複核',
    source: firstNonEmpty(extractLine(body, ['資訊來源', '資料來源']), inferredSource, '待複核'),
    note: firstNonEmpty([openingNote, transactionNote].filter(Boolean).join('；'), extractLine(body, ['競案等級']), extractLine(body, ['參考價值']).slice(0, 28), '待複核'),
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
  return (next >= 0 ? rest.slice(0, next) : rest)
    .split('\n')
    .map((line) => strip(line).replace(/^\d+[.、．]\s*/, '').replace(/^[一二三四五六七八九十]+[.、．]\s*/, ''))
    .filter(Boolean)
    .slice(0, 3);
}

function parseReportText(reportText, report = {}) {
  const s = splitSections(reportText);
  const s01 = s['01'] || reportText;
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
    cases: splitCaseBlocks(s08).map(parseCase).filter((item) => item.name && item.name !== '待複核').slice(0, 4),
    residentialPrice: extractPrice(s09, s01, 'residential'),
    shopPrice: extractPrice(s09, s01, 'shop'),
    parkingPrice: extractPrice(s09, s01, 'parking'),
    advantages: extractListItems(s11, '銷售優勢：'),
    weaknesses: extractListItems(s11, '銷售抗性：'),
  };
}

const BORDER = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
const CENTER = { horizontal:'center', vertical:'middle', wrapText:true };
const LEFT = { horizontal:'left', vertical:'middle', wrapText:true };
function setCell(sheet, address, value, align = LEFT) {
  const cell = sheet.getCell(address);
  cell.value = value || '';
  cell.alignment = align;
}
function styleRange(sheet, startRow, endRow, startCol = 1, endCol = 12) {
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = startCol; c <= endCol; c += 1) {
      const cell = sheet.getCell(r, c);
      cell.border = BORDER;
      cell.font = { name:'標楷體', size: 11 };
      cell.alignment = CENTER;
    }
  }
}
function merge(sheet, range) { try { sheet.mergeCells(range); } catch {} }

function createTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('工作表1', { views: [{ showGridLines: false }] });
  [10.83203125,13.1640625,15.5,9.83203125,10.83203125,17.1640625,13.83203125,13.83203125,12.83203125,12.83203125,2,2].forEach((width, i) => { sheet.getColumn(i + 1).width = width; });
  for (let r = 1; r <= 46; r += 1) {
    if (r <= 12) sheet.getRow(r).height = 30;
    else if (r <= 17) sheet.getRow(r).height = 50;
    else if (r === 18) sheet.getRow(r).height = 20;
    else if (r <= 22) sheet.getRow(r).height = 70;
    else if (r <= 24) sheet.getRow(r).height = 40;
    else if (r <= 32) sheet.getRow(r).height = 30;
    else if (r === 33) sheet.getRow(r).height = 20;
    else if (r <= 41) sheet.getRow(r).height = 26.75;
    else sheet.getRow(r).height = 29.25;
  }
  sheet.getColumn(11).hidden = true; sheet.getColumn(12).hidden = true;
  styleRange(sheet, 1, 46);

  merge(sheet,'A1:J1'); setCell(sheet,'A1','海悅廣告　土地評估分析表', CENTER); sheet.getCell('A1').font = { name:'標楷體', size:18, bold:true };
  [
    ['A2','配合業主'],['B2:D2',''],['E2','調研時間'],['F2:J2',''],
    ['A3','標的位置'],['B3:D3',''],['E3','標的地號'],['F3:J3',''],
    ['A4','土地分區'],['B4:D4',''],['E4','基地面積'],['F4:J4',''],
    ['A5','法定建蔽率'],['B5:D5',''],['E5','法定容積率'],['F5:J5',''],
    ['A6','臨路條件'],['B6:D6',''],['E6','土地售價'],['F6:J6',''],
    ['A7','學區'],['B7:D7',''],['E7','里別'],['F7:J7',''],
  ].forEach(([range, value]) => { if (range.includes(':')) merge(sheet, range); if (value) setCell(sheet, range.split(':')[0], value, CENTER); });

  merge(sheet,'A8:A12'); setCell(sheet,'A8','基地現況', CENTER);
  merge(sheet,'B8:J8'); setCell(sheet,'B8','本基地周遭現況為：', LEFT);
  [['B9','北向'],['C9:J9',''],['B10','西向'],['C10:J10',''],['B11','南向'],['C11:J11',''],['B12','東向'],['C12:J12','']]
    .forEach(([range, value]) => { if (range.includes(':')) merge(sheet, range); if (value) setCell(sheet, range.split(':')[0], value, CENTER); });

  [['A13','交通動線'],['B13:J13',''],['A14','生活機能'],['B14:J14',''],['A15','公共建設'],['B15:J15',''],['A16','區域銷況'],['B16:J16',''],['A17','建議產品'],['B17:J17','']]
    .forEach(([range, value]) => { if (range.includes(':')) merge(sheet, range); if (value) setCell(sheet, range.split(':')[0], value, CENTER); });

  merge(sheet,'A18:A22'); setCell(sheet,'A18','個案參考', CENTER);
  ['建設公司','案名','狀態','房型','坪數','價格','車位價格','資訊來源','備註'].forEach((h, i) => setCell(sheet, `${String.fromCharCode(66 + i)}18`, h, CENTER));

  merge(sheet,'A23:A24'); setCell(sheet,'A23','價格預判', CENTER);
  merge(sheet,'B23:C23'); setCell(sheet,'B23','二樓以上住宅', CENTER); merge(sheet,'D23:E23');
  merge(sheet,'F23:G23'); setCell(sheet,'F23','店面', CENTER); merge(sheet,'H23:J23');
  merge(sheet,'B24:C24'); setCell(sheet,'B24','1F住家', CENTER); merge(sheet,'D24:E24'); setCell(sheet,'D24','—', CENTER);
  merge(sheet,'F24:G24'); setCell(sheet,'F24','坡道平面車位', CENTER); merge(sheet,'H24:J24');

  merge(sheet,'A25:A32'); setCell(sheet,'A25','綜合評估', CENTER);
  merge(sheet,'B25:J25'); setCell(sheet,'B25','優勢：', LEFT);
  [26,27,28].forEach((r,i)=>{ merge(sheet,`B${r}:J${r}`); setCell(sheet,`B${r}`,`${i+1}`, LEFT); });
  merge(sheet,'B29:J29'); setCell(sheet,'B29','劣勢：', LEFT);
  [30,31,32].forEach((r,i)=>{ merge(sheet,`B${r}:J${r}`); setCell(sheet,`B${r}`,`${i+1}`, LEFT); });

  merge(sheet,'A33:J33'); setCell(sheet,'A33','區域圖', CENTER);
  merge(sheet,'A34:J45'); setCell(sheet,'A34','', CENTER);
  sheet.pageSetup = { paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:1, printArea:'A1:L46', horizontalCentered:true, verticalCentered:false, margins:{ left:0.25, right:0.25, top:0.25, bottom:0.25, header:0.1, footer:0.1 } };
  return { workbook, sheet };
}

export async function buildLandEvaluationExcelBuffer(report) {
  const { workbook, sheet } = createTemplateWorkbook();
  const data = parseReportText(report.report_text || '', report);
  [['B2',data.client],['B3',data.location],['F3',data.landNumber],['B4',data.zoning],['F4',data.area],['B5',data.coverage],['F5',data.far],['B6',data.road],['F6',data.landPrice],['B7',data.school],['F7',data.village],['C9',data.north],['C10',data.west],['C11',data.south],['C12',data.east],['B13',data.traffic],['B14',data.living],['B15',data.publicFacility],['B16',data.market],['B17',data.product]].forEach(([addr,val])=>setCell(sheet,addr,val));
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
