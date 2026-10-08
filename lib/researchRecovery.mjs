// County-neutral recovery routes. A route is a next action, never evidence of success.
const routes={
 location:['國土測繪宗地圖與地籍識別碼','地方地政GIS／都市計畫GIS','重劃分配圖或核定計畫圖'],
 area:['宗地登記公開資料或業主謄本','當年度逐筆資料：先檢查面積欄與完整地號','重劃土地分配成果表：核對新舊地號與基準日'],
 zoning:['地方政府現行都市計畫GIS與土地使用分區證明','核定計畫書、圖與歷次變更：核對基地所在範圍','非都市土地另查使用分區及使用地類別'],
 coverage:['先核對本宗地分區，再查適用管制要點','歷次變更、附帶條件、都市設計及個別限制'],
 far:['先核對本宗地分區，再查適用管制要點','非都市土地核對使用地類別；法定容積與獎勵分開'],
 road:['宗地合併外框對照計畫道路與地籍道路用地','核定道路表／道路命名圖：核對相鄰路段','工程公告與近期影像核對開闢狀態；建築線另查'],
 village:['宗地幾何對照官方里界','地方戶政門牌及鄰別資料：鄰門牌只能輔助'],
 elementary_school:['適用學年度教育主管機關學區公告','學校官方公告交叉核對里、鄰及門牌範圍','自由學區完整列出；最近學校不能代替法定學區'],
 junior_school:['適用學年度教育主管機關學區公告','學校官方公告交叉核對里、鄰及門牌範圍','行政區／學年度不同必須重新查詢'],
 residential_price:['近半年同案有效住宅完整逐筆明細','官方實價公開批次、591、樂居對照同期間同案','確定零成交才延長至近一年；開價不得補實價；本案初估另列']
};
export function buildRecoveryPlan(missingFields=[],checks=[]){
 const pending=checks.filter(c=>!c.verified).map(c=>({reason:c.reason,key:c.key}));
 return {scope:'依本案縣市及土地屬性選擇來源，不套用其他區資料',items:missingFields.map(field=>({field,required_before_formal:true,routes:routes[field]||['查對應官方資料及獨立來源'],completion:'實際讀取、匹配本案、記錄版本與單位；路徑清單不算查閱成功'})),blocked_sources:pending,limits:['資料欄位不存在即換來源，不能用公告地價當面積','掃描圖／PDF須有實際讀圖或抽取紀錄，不能自稱伺服器已核實','未公開、授權或法定證明資料不足保持待核實，不編造補滿']};
}
