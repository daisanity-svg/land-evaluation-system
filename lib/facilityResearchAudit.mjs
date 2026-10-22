export const FACILITY_CATEGORIES = {
 daily_shopping:['日常採買','生活機能'],dining:['餐飲','生活機能'],shopping_leisure:['購物休閒','生活機能'],
 public_transport:['大眾運輸','交通通勤'],external_roads:['對外道路','交通通勤'],
 public_existing:['既有公共建設','公共建設'],public_planned:['未來建設','公共建設']
};
const clean=v=>String(v||'').normalize('NFKC').replace(/\s/g,'');
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const safeUrl=v=>{try{return new URL(v).protocol==='https:'}catch{return false}};
// These checks establish coverage and links to verified claims, not semantic truth.
export function auditFacilityResearch(record,section,claims=[],researchDate='') {
 if(!date(researchDate)||researchDate<'2026-10-22')return [];
 const missing=[];
 if(record?.version!==1||!Array.isArray(record.categories))return ['生活圈七類調研紀錄尚未齊全'];
 for(const [key,[label]]of Object.entries(FACILITY_CATEGORIES)) {
  const rows=record.categories.filter(r=>r?.category===key);
  if(rows.length!==1){missing.push(label+'盤點紀錄缺漏或重複');continue;}
  const row=rows[0],checks=Array.isArray(row.checks)?row.checks:[];
  const validChecks=checks.filter(c=>c&&safeUrl(c.url)&&String(c.publisher||'').trim()&&date(c.checked_at)&&c.checked_at<=researchDate&&String(c.result||'').trim().length>=8);
  const refs=Array.isArray(row.claim_fields)?row.claim_fields:[];
  const supported=refs.length>0&&refs.every(f=>claims.some(c=>c.field===f&&c.status==='已核實'));
  if(!['found','none_found','blocked'].includes(row.status)||row.status==='blocked'){missing.push(label+'調研仍受阻或狀態未確認');continue;}
  if(!supported||!validChecks.length||clean(row.text).length<12||!clean(section).includes(clean(row.text))||clean(row.impact).length<8)missing.push(label+'須有正文、購屋影響與核實依據');
  if(row.status==='none_found'&&new Set(validChecks.map(c=>c.url)).size<2)missing.push(label+'未找到結果須保留兩條查詢路徑');
 }
 return missing;
}
