export default function ReportSkeleton(){
 const rows=['配合業主','標的位置','標的地號','土地分區','基地面積','建蔽率／容積率','臨路條件','學區','基地現況四向','交通動線','生活機能','公共建設','區域銷況','建議產品','個案參考表','價格預判','綜合評估（優勢／劣勢）','區域圖'];
 return <section className="report-skeleton" aria-label="業主版報告版型預覽"><h3>土地評估分析表</h3><p>版型預覽｜報告回傳後會填入本案資料。</p><dl>{rows.map((label,i)=><div key={label} className={i>=8?'wide':''}><dt>{label}</dt><dd aria-hidden="true">{Array.from({length:i===8?4:i>=14?3:1},(_,n)=><i key={n}/>)}</dd></div>)}</dl></section>;
}
