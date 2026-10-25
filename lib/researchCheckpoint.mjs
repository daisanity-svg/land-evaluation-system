import {checkpointKey} from './researchProgress.mjs';
const identity=x=>String(x||'').normalize('NFKC').replace(/\s/g,'');
export function checkpointPayload(form,reportId) {
 return {report_id:reportId,client:form.client||'',land_number:form.landNumber||form.land_number||'',research_date:form.researchDate||form.research_date||'',report_text:form.reportText||form.report_text||'',summary:form.summary||null,parcel_lookup:form.parcelLookup||form.parcel_lookup||null,research_evidence:form.researchEvidence||form.research_evidence||form.summary?._research_evidence||{version:1,land_number:form.landNumber||form.land_number,research_date:form.researchDate||form.research_date,claims:[]}};
}
export function saveCheckpoint(storage,payload) {
 const clean=JSON.parse(JSON.stringify(payload));delete clean.return_token;delete clean.returnToken;
 storage.setItem(checkpointKey(clean),JSON.stringify({saved_at:new Date().toISOString(),payload:clean}));return clean;
}
export function loadCheckpoint(storage,id,landNumber) {
 if(!id||!landNumber)return null;
 const item=JSON.parse(storage.getItem(checkpointKey({report_id:id,land_number:landNumber}))||'null');
 if(!item||item.payload?.report_id!==id||identity(item.payload.land_number)!==identity(landNumber))return null;
 return item;
}
