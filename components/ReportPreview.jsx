'use client';

const safe = (value) => {
  if (Array.isArray(value)) return value.join('\n');
  if (value === undefined || value === null || value === '') return '待複核';
  return String(value);
};

const landLots = (lots = []) => lots.map((l) => `${safe(l.city)}${safe(l.district)}${safe(l.section)}${l.subsection || ''} ${safe(l.lot_number)}地號`).join('\n');

export default function ReportPreview({ report }) {
  const b = report.basic_info;
  const lv = report.legal_volume;
  const env = report.environment;
  const school = report.school_and_village;
  const price = report.pricing_forecast;
  const product = report.product_recommendation;
  const summary = report.summary_evaluation;
  const sources = report.sources_and_verification;

  return (
    <div className="panel">
      <div className="panel-header"><h2>報告預覽</h2><p className="muted">列印或下載 PDF：使用瀏覽器列印，目的地選「儲存為 PDF」。</p></div>
      <div className="report-wrap">
        <div className="report">
          <div className="report-title">{report.project_meta.report_title || '海悅廣告　土地評估分析表'}</div>
          <table className="report-table"><tbody>
            <tr><th>配合業主</th><td>{safe(b.client)}</td><th>調研時間</th><td>{safe(b.research_date)}</td></tr>
            <tr><th>標的位置</th><td>{safe(b.site_location)}</td><th>標的地號</th><td>{landLots(b.land_lots)}</td></tr>
            <tr><th>土地分區</th><td>{safe(lv.zoning)}\n{safe(lv.zoning_basis)}</td><th>基地面積</th><td>{safe(lv.total_area_ping)} 坪\n{safe(lv.total_area_sqm)} ㎡</td></tr>
            <tr><th>法定建蔽率</th><td>{safe(lv.coverage_ratio)}</td><th>法定容積率</th><td>{safe(lv.floor_area_ratio)}</td></tr>
            <tr><th>臨路條件</th><td>{safe(lv.road_access_type)}\n{safe(lv.road_access_description)}</td><th>土地售價</th><td>{safe(b.land_price)}</td></tr>
            <tr><th>學區</th><td>國小：{safe(school.elementary_school)}\n國中：{safe(school.junior_high_school)}\n{safe(school.school_note)}</td><th>里別</th><td>{safe(school.village)}\n{safe(school.verification_note)}</td></tr>
            <tr><th className="wide-heading" colSpan="4">基地現況四向</th></tr>
            {report.site_conditions.directions.map((d, i) => <tr key={i}><th>{safe(d.direction)}</th><td colSpan="3">類型：{safe(d.condition_type)}｜路名：{safe(d.road_name)}｜路寬：{safe(d.road_width)}\n臨房：{safe(d.adjacent_building_type)}／{safe(d.adjacent_floors)}\n{safe(d.description)}\n銷售影響：{safe(d.sales_impact)}</td></tr>)}
            <tr><th>交通動線</th><td colSpan="3">{safe(env.traffic)}</td></tr>
            <tr><th>生活機能</th><td colSpan="3">{safe(env.living_functions)}</td></tr>
            <tr><th>公共建設</th><td colSpan="3">{safe(env.public_facilities)}</td></tr>
            <tr><th>區域銷況</th><td colSpan="3">新案成交帶：{safe(price.new_project_price_band)}\n中古成交帶：{safe(price.resale_price_band)}\n順銷安全帶：{safe(price.safe_sales_band)}\n{safe(price.pricing_rationale)}</td></tr>
            <tr><th>建議產品</th><td colSpan="3">兩房：{safe(product.two_bedroom)}\n三房：{safe(product.three_bedroom)}\n四房：{safe(product.four_bedroom)}\n不建議：{safe(product.not_recommended_products)}\n{safe(product.planning_rationale)}</td></tr>
            <tr><th className="wide-heading" colSpan="4">個案參考表</th></tr>
            <tr><td colSpan="4"><table className="compare-table"><thead><tr><th>案名</th><th>類型</th><th>距離</th><th>產品規劃</th><th>成交均價</th><th>參考價值</th></tr></thead><tbody>{report.comparables.cases.map((c, i) => <tr key={i}><td>{safe(c.case_name)}</td><td>{safe(c.case_type)}</td><td>{safe(c.distance)}</td><td>{safe(c.product_plan)}</td><td>{safe(c.average_price_per_ping)}</td><td>{safe(c.reference_value)}</td></tr>)}</tbody></table></td></tr>
            <tr><th>價格預判</th><td colSpan="3">建議表價：{safe(price.suggested_list_price)}\n目標成交均價：{safe(price.target_transaction_price)}\n首波成交帶：{safe(price.first_wave_transaction_band)}\n車位價格建議：{safe(price.parking_price_suggestion)}</td></tr>
            <tr><th>綜合評估</th><td colSpan="3">優勢：\n{safe(summary.strengths)}\n\n劣勢：\n{safe(summary.weaknesses)}\n\n初步結論：{safe(summary.initial_conclusion)}</td></tr>
            <tr><th>資料來源／待複核</th><td colSpan="3">資料來源：\n{safe(sources.sources)}\n\n待複核事項：\n{safe(sources.items_to_verify)}\n\n風險提醒：\n{safe(sources.risk_notes)}</td></tr>
          </tbody></table>
        </div>
        <p className="print-note">PDF 輸出：按「列印 / PDF」或瀏覽器快捷鍵 Command+P，選「儲存為 PDF」。</p>
      </div>
    </div>
  );
}
