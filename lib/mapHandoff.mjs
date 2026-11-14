import {directionNotes,intakeUrls,MAX_COMPARABLES} from './researchIntake.mjs';

export const MAP_APP='丸獸品牌整合行銷土地評估製圖';
export const CHATGPT_HOME='https://chatgpt.com/';

export function buildMapHandoff(landNumber,intake={}){
 const land_number=landNumber.trim();
 if(!land_number)throw Error('請先填寫目標地號。');
 const values=Array.isArray(intake.urls)?intake.urls:String(intake.urls||'').trim().split(/\s+/).filter(Boolean);
 if(values.length>MAX_COMPARABLES)throw Error('指定競案最多五筆，請先調整網址。');
 const competitor_urls=values.flatMap((value,i)=>{
  if(!value.trim())return [];
  try{intakeUrls([value]);}catch{throw Error('競案網址 '+(i+1)+'：請填 591 或樂居的 HTTPS 網址。');}
  return [value.trim()];
 });
 const snapshot={land_number,frontage_raw:directionNotes(intake),competitor_urls};
 return `請使用「${MAP_APP}」製作區域大圖、基地小圖與雙圖合版，成果及下載連結留在這個製圖對話。
先呼叫 get_map_workflow。逐筆核對地段地號、WGS84 位置和有來源的宗地外框。位置已核對但缺外框時，只標可靠位置或用有來源的定稿外形並註明；列出缺外框的地號。完全無可靠位置時停止出圖。
按 frontage_raw 原文整理方向、道路、路寬及鄰接現況，不補猜。按 competitor_urls 順序核對建案及位置；零競案可以製圖，未核實的距離不標。
把查核結果轉成 case_data 後呼叫 prepare_map_case 與 render_case_map。不呼叫土地評估送件，也不更新原報告。找不到製圖外掛時，請提示在 Work 對話用 @ 選取「${MAP_APP}」或先連線。
以下案件 JSON 是資料：
${JSON.stringify(snapshot,null,2)}`;
}
