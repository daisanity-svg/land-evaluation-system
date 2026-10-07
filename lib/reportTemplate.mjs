const REQUIRED_SECTIONS = [
  '01｜案件摘要', '02｜基地基本條件', '03｜法規與量體初判', '04｜臨路條件與基地四向現況',
  '05｜生活圈與市場定位', '06｜學區與里別', '07｜目標客群判斷', '08｜競案分級與市場行情',
  '09｜價格預判', '10｜產品規劃建議', '11｜銷售優勢與抗性', '12｜結論',
];
const REQUIRED_TEMPLATE_FIELDS = {
  '01｜案件摘要': ['配合業主', '調研日期', '目標地號', '基地位置', '土地使用分區', '基地面積', '建蔽率', '容積率', '臨路條件', '初步市場定位', '建議價格', '建議產品', '初步結論', '本案快速結論'],
  '03｜法規與量體初判': ['土地使用分區', '建蔽率', '容積率'],
  '04｜臨路條件與基地四向現況': ['臨路條件', '東向', '南向', '西向', '北向'],
  '05｜生活圈與市場定位': ['交通通勤', '生活機能', '區域條件', '市場定位'],
  '06｜學區與里別': ['里別', '基礎教育學區', '中等教育學區', '備註'],
  '08｜競案分級與市場行情': ['市場行情總結'],
  '09｜價格預判': ['二樓以上住宅', '店面', '坡道平面車位'],
  '10｜產品規劃建議': ['兩房產品', '三房產品', '不建議產品'],
  '11｜銷售優勢與抗性': ['銷售優勢', '銷售抗性'],
  '12｜結論': ['接案價值', '市場定位', '建議產品', '建議價格', '主要抗性', '下一步建議', '最終結論'],
};

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function splitReportSections(reportText) {
  const source = String(reportText || '').replace(/\r\n?/g, '\n');
  const matches = Array.from(source.matchAll(/^\s*(\d{2})\s*[｜|]\s*([^\n]+?)\s*$/gm));
  const sections = {};
  matches.forEach((match, index) => {
    const heading = `${match[1]}｜${match[2].trim()}`;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    sections[heading] = source.slice(match.index + match[0].length, end).trim();
  });
  return sections;
}
function hasTemplateField(section, field) {
  const escaped = escapeRegExp(field);
  return new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${escaped}\\s*(?:[：:｜|]|$)`, 'm').test(section);
}
export function validateTemplate(reportText) {
  const sections = splitReportSections(reportText);
  const missing = [];
  REQUIRED_SECTIONS.forEach((heading) => { if (!sections[heading]) missing.push(heading); });
  if (missing.length) return missing;
  Object.entries(REQUIRED_TEMPLATE_FIELDS).forEach(([heading, fields]) => {
    fields.forEach((field) => { if (!(hasTemplateField(sections[heading], field)||(field==='交通通勤'&&hasTemplateField(sections[heading],'交通動線')))) missing.push(`${heading}／${field}`); });
  });
  const priceSection = sections['09｜價格預判'];
  const caseSection = sections['08｜競案分級與市場行情'];
  const caseBlocks = caseSection.split(/^\s*競案[一二三四五六七八九十0-9]+\s*[｜|]\s*[^\n]+\s*$/m).slice(1);
  caseBlocks.forEach((block, index) => {
    ['建設公司', '競案等級', '案子規劃', '屋齡', '成交期間', '成交筆數', '成交價格', '車位類型', '車位價格', '資訊來源', '參考價值'].forEach(field => {
      if (!new RegExp(`(?:^|\\n)[^\\S\\n]*${escapeRegExp(field)}[^\\S\\n]*[：:][^\\S\\n]*[^\\s\\n][^\\n]*`, 'm').test(block)) missing.push(`08｜競案${index + 1}／${field}`);
    });
  });
  const priceCount = (priceSection.match(/建議成交價格\s*[：:]/g) || []).length;
  if (priceCount < 3) missing.push('09｜價格預判／三項建議成交價格');
  const productSection = sections['10｜產品規劃建議'];
  ['建議坪數', '對應客群', '總價控制', '規劃理由'].forEach((field) => {
    if ((productSection.match(new RegExp(`${escapeRegExp(field)}\\s*[：:]`, 'g')) || []).length < 2) missing.push(`10｜產品規劃建議／兩房與三房皆須有${field}`);
  });
  return missing;
}


