'use client';
export default function ReportPreview({data}) {
  const lots = (data.basic_info.land_lots||[]).map((l)=>`${l.city}${l.district}${l.section}${l.subsection||''}${l.lot_number}地號`).join('、');
  const comps = data.comparables.cases||[];
  const row = (l,v)=><tr><th className='table-border' style={{background:'#e2e8f0',padding:4,textAlign:'left',width:190}}>{l}</th><td className='table-border' style={{padding:4,whiteSpace:'pre-wrap'}}>{v||'待複核'}</td></tr>;
  return <div id='report-preview' style={{background:'#fff',padding:16,fontSize:12}}>
    <h1 style={{textAlign:'center',fontSize:20,fontWeight:'bold',marginBottom:8}}>海悅廣告　土地評估分析表</h1>
    <table style={{width:'100%',borderCollapse:'collapse'}}><tbody>
      {row('配合業主／調研時間',`${data.basic_info.client}／${data.basic_info.research_date}`)}
      {row('標的位置／標的地號',`${data.basic_info.site_location}／${lots}`)}
      {row('土地分區／基地面積',`${data.legal_volume.zoning}／${data.legal_volume.total_area_sqm}㎡(${data.legal_volume.total_area_ping}坪)`)}
      {row('法定建蔽率／法定容積率',`${data.legal_volume.coverage_ratio}／${data.legal_volume.floor_area_ratio}`)}
      {row('臨路條件／土地售價',`${data.legal_volume.road_access_description}／${data.basic_info.land_price}`)}
      {row('學區／里別',`${data.school_and_village.elementary_school}、${data.school_and_village.junior_high_school}／${data.school_and_village.village}`)}
      {row('基地現況四向',(data.site_conditions.directions||[]).map((d)=>`${d.direction}:${d.description}`).join('\n'))}
      {row('交通動線',data.environment.traffic)}
      {row('生活機能',data.environment.living_functions)}
      {row('公共建設',data.environment.public_facilities)}
      {row('區域銷況',`${data.pricing_forecast.new_project_price_band}；${data.pricing_forecast.resale_price_band}`)}
      {row('建議產品',`2房:${data.product_recommendation.two_bedroom} / 3房:${data.product_recommendation.three_bedroom} / 4房:${data.product_recommendation.four_bedroom}`)}
      {row('個案參考表', comps.map((c)=>`${c.case_name}(${c.case_type}) ${c.average_price_per_ping}`).join('\n'))}
      {row('價格預判',`${data.pricing_forecast.suggested_list_price}；${data.pricing_forecast.target_transaction_price}`)}
      {row('綜合評估',`優勢:${(data.summary_evaluation.strengths||[]).join('、')}\n劣勢:${(data.summary_evaluation.weaknesses||[]).join('、')}\n結論:${data.summary_evaluation.initial_conclusion}`)}
      {row('區域圖','MVP 先以文字/後續可上傳圖片')}
      {row('資料來源／待複核事項',`${(data.sources_and_verification.sources||[]).join('、')}\n待複核:${(data.sources_and_verification.items_to_verify||[]).join('、')}`)}
    </tbody></table></div>
}
