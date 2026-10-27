export async function checkedArtifact(response,kind) {
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||`檔案產生失敗（${response.status}）`);}
 const blob=await response.blob(),bytes=new Uint8Array(await blob.slice(0,5).arrayBuffer());
 const valid=kind==='pdf'?String.fromCharCode(...bytes)==='%PDF-':bytes[0]===80&&bytes[1]===75;
 if(blob.size<100||!valid)throw Error('伺服器未回傳有效檔案，請重試；未視為下載成功。');
 return blob;
}
